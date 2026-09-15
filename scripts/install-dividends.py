"""Idempotent additive integration; leaves all existing holdings code untouched."""
from pathlib import Path

required = ['dividends.html', 'dividends.css', 'dividends-core.js', 'dividends.js', 'dividends-entry.js']
for name in required:
    if not Path(name).exists(): raise SystemExit(f'Missing dividend component: {name}')
p = Path('app-v3.html')
s = p.read_text(encoding='utf-8')
marker = '<script src="./dividends-entry.js?v=20260916-1"></script>'
if marker not in s:
    if s.count('</body>') != 1: raise SystemExit('Portfolio body marker is not unique')
    s = s.replace('</body>', marker+'</body>')
    p.write_text(s, encoding='utf-8')
print('Dividend navigation installed; existing portfolio data and code unchanged')
