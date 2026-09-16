"""Focused regression for explicit empty dividend-sheet selections."""
from contextlib import contextmanager
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from threading import Thread
import shutil
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent


class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass


@contextmanager
def server():
    http = ThreadingHTTPServer(('127.0.0.1', 0), partial(Quiet, directory=str(ROOT)))
    Thread(target=http.serve_forever, daemon=True).start()
    try:
        yield f'http://127.0.0.1:{http.server_port}'
    finally:
        http.shutdown()


with server() as base, sync_playwright() as pw:
    launch = {'headless': True}
    chrome = shutil.which('google-chrome') or shutil.which('chromium')
    if chrome:
        launch['executable_path'] = chrome
    browser = pw.chromium.launch(**launch)
    ctx = browser.new_context(locale='ja-JP', timezone_id='Asia/Tokyo')
    page = ctx.new_page()
    page.goto(base + '/dividends-sheet.html')
    page.evaluate("""()=>{
      localStorage.clear();
      localStorage.setItem('kouheim_portfolio_v2',JSON.stringify([
        {symbol:'8306.T',name:'検証銀行',shares:30},
        {symbol:'2811.T',name:'検証食品',shares:20}
      ]));
      localStorage.setItem('kouheim_portfolio_lots_v1',JSON.stringify([
        {symbol:'8306.T',owner:'OTS',broker:'SBI',tax:'nisa',shares:30},
        {symbol:'2811.T',owner:'OTS',broker:'SBI',tax:'specific',shares:20}
      ]));
    }""")
    page.reload()
    page.wait_for_function("!document.getElementById('sheetReload').disabled")

    # First setup still defaults to all eligible holdings and keeps the 10-year view.
    assert page.locator('.sheet-row-check:checked').count() == 2
    assert page.locator('#overallChart .sheet-bar').count() == 10

    # Header clear must be allowed to reach and persist a true zero-selection state.
    page.locator('#sheetCheckAll').uncheck()
    assert page.locator('.sheet-row-check:checked').count() == 0
    assert '0銘柄' in page.locator('#overallMetrics').inner_text()
    assert page.evaluate("JSON.parse(localStorage.getItem('kouheim_dividend_sheet_v1')).selected") == []

    # The explicit clear button must also remain empty after render().
    page.locator('#selectVisible').click()
    assert page.locator('.sheet-row-check:checked').count() == 2
    page.locator('#clearVisible').click()
    assert page.locator('.sheet-row-check:checked').count() == 0

    # Unchecking the final remaining row must not repopulate every holding.
    page.locator('#selectVisible').click()
    page.locator('.sheet-row-check[data-symbol="8306.T"]').uncheck()
    page.locator('.sheet-row-check[data-symbol="2811.T"]').uncheck()
    assert page.locator('.sheet-row-check:checked').count() == 0

    # Explicit empty selection survives a page reload.
    page.reload()
    page.wait_for_function("!document.getElementById('sheetReload').disabled")
    assert page.locator('.sheet-row-check:checked').count() == 0
    assert '選択 0銘柄' in page.locator('#selectionCount').inner_text()
    assert '0銘柄' in page.locator('#overallMetrics').inner_text()

    browser.close()
