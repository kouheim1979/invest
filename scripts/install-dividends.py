"""Idempotent additive integration; leaves existing holdings data and logic untouched."""
from pathlib import Path

required = ['dividends.html', 'dividends.css', 'dividends-core.js', 'dividends.js', 'dividends-entry.js',
            'dividends-sheet.html', 'dividends-sheet.css', 'dividends-sheet.js',
            'dividends-dashboard.html', 'dividends-dashboard.css']
for name in required:
    if not Path(name).exists(): raise SystemExit(f'Missing dividend component: {name}')
p = Path('app-v3.html')
s = p.read_text(encoding='utf-8')
old_markers = [
    '<script src="./dividends-entry.js?v=20260916-1"></script>',
    '<script src="./dividends-entry.js?v=20260916-sheet1"></script>',
    '<script src="./dividends-entry.js?v=20260916-dashboard1"></script>'
]
marker = '<script src="./dividends-entry.js?v=20260916-dashboard1"></script>'
for old in old_markers[:-1]:
    if old in s:
        s = s.replace(old, marker)
if marker not in s:
    if s.count('</body>') != 1: raise SystemExit('Portfolio body marker is not unique')
    s = s.replace('</body>', marker+'</body>')
p.write_text(s, encoding='utf-8')
print('Dividend dashboard navigation installed; existing portfolio data and code unchanged')
