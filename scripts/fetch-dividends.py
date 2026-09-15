"""Read public fiscal-year dividends. Never convert missing data to zero.

Only the source's explicitly split-adjusted annual column is used for comparison.
Forecasts and incomplete current-period results never enter the actual history.
Personal holdings and receipts are not read by this script.
"""
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
import json, math, os, re, time, urllib.request

OUT = Path('dividends-data.json')

class Tables(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.tables = []
        self.table = self.row = self.cell = None
        self.depth = 0
        self.title = ''
        self.in_title = False
    def handle_starttag(self, tag, attrs):
        if tag == 'title': self.in_title = True
        if tag == 'table':
            if self.depth == 0: self.table = []
            self.depth += 1
        if self.depth == 1:
            if tag == 'tr': self.row = []
            if tag in ('td', 'th'): self.cell = []
    def handle_data(self, data):
        if self.in_title: self.title += data
        if self.cell is not None: self.cell.append(data)
    def handle_endtag(self, tag):
        if tag == 'title': self.in_title = False
        if self.depth == 1:
            if tag in ('td', 'th') and self.cell is not None:
                if self.row is not None: self.row.append(''.join(self.cell).strip())
                self.cell = None
            if tag == 'tr' and self.row is not None:
                self.table.append(self.row)
                self.row = None
        if tag == 'table':
            self.depth = max(0, self.depth - 1)
            if self.depth == 0 and self.table is not None:
                self.tables.append(self.table)
                self.table = self.row = self.cell = None

def number(raw):
    s = re.sub(r'[\s,]', '', str(raw))
    if s in ('', '-', '--', '---', '―', '—', 'ー'): return None
    if not re.fullmatch(r'\d+(?:\.\d+)?', s):
        raise ValueError('Unexpected dividend cell: ' + s[:80])
    value = float(s)
    if not math.isfinite(value): raise ValueError('Nonfinite dividend')
    return value

def parse(page, symbol, checked_at):
    parser = Tables(); parser.feed(page)
    actual, forecasts = {}, []
    for table in parser.tables:
        header = re.sub(r'\s+', '', ''.join(''.join(r) for r in table[:3]))
        if '年間配当' not in header or '調整後' not in header: continue
        for row in table:
            if not row: continue
            match = re.fullmatch(r'(\d{4})年(\d{1,2})月期', re.sub(r'\s+', '', row[0]))
            if not match: continue
            year, month = map(int, match.groups())
            if not 1 <= month <= 12: raise ValueError('Invalid fiscal month')
            period = f'{year:04}-{month:02}'
            is_forecast = len(row) >= 8 and row[1].strip() == '予想'
            # A row with an explicit result/forecast label belongs to the
            # unfinished current-period table, not the completed annual table.
            if not is_forecast and len(row) != 7: continue
            cells = row[2:] if is_forecast else row[1:]
            if len(cells) != 6: continue
            record = {'period': period, 'annual': number(cells[0]),
                      'unadjustedAnnual': number(cells[-1]),
                      'quartersUnadjusted': [number(v) for v in cells[1:5]]}
            if is_forecast:
                forecasts.append(record)
            else:
                if period in actual and actual[period] != record:
                    raise ValueError('Conflicting duplicate fiscal rows')
                actual[period] = record
    if not actual: raise ValueError('No recognized completed annual dividend table')
    rows = [actual[p] for p in sorted(actual)][-10:]
    name = re.split(r'[【〖]', parser.title)[0].strip() or symbol
    return {'symbol': symbol, 'name': name, 'currency': 'JPY',
            'periodBasis': 'fiscal', 'adjustment': 'source-split-adjusted',
            'source': 'Yahoo!ファイナンス',
            'sourceUrl': f'https://finance.yahoo.co.jp/quote/{symbol}/dividend',
            'checkedAt': checked_at, 'years': rows,
            'forecast': max(forecasts, key=lambda r:r['period']) if forecasts else None}

def fetch(symbol):
    url = f'https://finance.yahoo.co.jp/quote/{symbol}/dividend'
    error = ''
    for attempt in range(2):
        try:
            req = urllib.request.Request(url, headers={'User-Agent':'Mozilla/5.0', 'Accept-Language':'ja'})
            with urllib.request.urlopen(req, timeout=20) as response:
                page = response.read(4_000_000).decode('utf-8')
            record = parse(page, symbol, datetime.now(timezone.utc).isoformat())
            return symbol, record, None
        except Exception as exc:
            error = f'{type(exc).__name__}: {str(exc)[:180]}'
            if not attempt: time.sleep(1)
    return symbol, None, error

def main():
    try: old = json.loads(OUT.read_text(encoding='utf-8'))
    except (OSError, ValueError): old = {}
    series = old.get('series', {})
    if not isinstance(series, dict): series = {}
    symbols = sorted(s for s in json.loads(Path('quotes.json').read_text()).get('quotes', {})
                     if re.fullmatch(r'[0-9A-Z]{4,6}\.[TS]', s))
    now = datetime.now(timezone.utc)
    def due(s):
        if os.environ.get('FORCE_DIVIDENDS') == '1': return True
        try: return (now - datetime.fromisoformat(series[s]['checkedAt'])).total_seconds() >= 86400
        except (KeyError, TypeError, ValueError): return True
    wanted = [s for s in symbols if due(s)]
    if not wanted: print('Dividend history is less than 24 hours old'); return
    failures = dict(old.get('failures', {}))
    succeeded = 0
    with ThreadPoolExecutor(max_workers=2) as pool:
        for symbol, data, error in pool.map(fetch, wanted):
            if data:
                series[symbol] = data; failures.pop(symbol, None); succeeded += 1
                print(symbol, len(data['years']), 'completed fiscal periods', 'latest', data['years'][-1])
            else:
                failures[symbol] = {'checkedAt':now.isoformat(), 'error':error}
                print(symbol, 'unavailable; last successful values/timestamp retained:', error)
    data = {'schemaVersion':1, 'updatedAt':now.isoformat(), 'series':series, 'failures':failures,
            'coverage':'Published annual history only. Not personal dividend receipts. Missing values are null.'}
    OUT.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'Dividends: {succeeded}/{len(wanted)} refreshed; {len(series)}/{len(symbols)} available')

if __name__ == '__main__': main()
