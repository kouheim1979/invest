"""Fetch public daily prices; retain each symbol's original timestamp on failure."""
import json, math, urllib.request, urllib.parse
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path

FILE = Path('history.json')

def clean(result):
    closes = result.get('indicators', {}).get('quote', [{}])[0].get('close', [])
    rows = {}
    for t, p in zip(result.get('timestamp', []), closes):
        if isinstance(t, (int, float)) and isinstance(p, (int, float)) and not isinstance(p, bool) and math.isfinite(p) and p > 0:
            rows[int(t)] = round(p, 4)
    return [[t, rows[t]] for t in sorted(rows)]

def fetch(symbol):
    for host in ['query1.finance.yahoo.com', 'query2.finance.yahoo.com']:
        try:
            url = f'https://{host}/v8/finance/chart/{urllib.parse.quote(symbol)}?range=1y&interval=1d'
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=12) as res:
                data = json.load(res)
            points = clean(data['chart']['result'][0])
            if len(points) < 2:
                raise ValueError('Insufficient data')
            return symbol, {'points': points, 'updatedAt': datetime.now(timezone.utc).isoformat(), 'source': 'Yahoo Finance'}
        except Exception:
            continue
    return symbol, None

def main():
    try:
        old = json.loads(FILE.read_text())
    except (ValueError, OSError):
        old = {'series': {}}
    series = old.get('series', {})
    symbols = list(json.loads(Path('quotes.json').read_text()).get('quotes', {}))
    now = datetime.now(timezone.utc)
    def due(s):
        try:
            return (now - datetime.fromisoformat(series[s]['updatedAt'].replace('Z', '+00:00'))).total_seconds() >= 3600
        except (ValueError, KeyError, TypeError):
            return True
    changed = False
    with ThreadPoolExecutor(max_workers=4) as pool:
        for symbol, result in pool.map(fetch, [s for s in symbols if due(s)]):
            if result:
                series[symbol] = result
                changed = True
            else:
                print(f'{symbol}: history unavailable; previous data retained')
    if changed or not FILE.exists():
        FILE.write_text(json.dumps({'series': series}, ensure_ascii=False, separators=(',', ':')))
    print(f'History available: {len(series)} symbols')

if __name__ == '__main__':
    main()
