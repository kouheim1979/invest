"""Dashboard UI regression using fictional holdings only."""
from contextlib import contextmanager
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from threading import Thread
import os, shutil
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parent.parent
RESULTS=ROOT/'test-results'; RESULTS.mkdir(exist_ok=True)
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self,*_): pass
@contextmanager
def server():
    http=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT)))
    Thread(target=http.serve_forever,daemon=True).start()
    try: yield f'http://127.0.0.1:{http.server_port}'
    finally: http.shutdown()

with server() as base, sync_playwright() as pw:
    engines=[('chromium',pw.chromium,{'executable_path':shutil.which('google-chrome') or shutil.which('chromium')})]
    if os.environ.get('DIVIDEND_WEBKIT')=='1': engines.append(('webkit',pw.webkit,{}))
    for name,engine,launch in engines:
        browser=engine.launch(headless=True,**{k:v for k,v in launch.items() if v})
        ctx=browser.new_context(viewport={'width':390,'height':844},locale='ja-JP',timezone_id='Asia/Tokyo')
        page=ctx.new_page(); errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        ctx.route('**/*',lambda route: route.continue_() if route.request.url.startswith(base) else route.abort())
        page.goto(base+'/app-v3.html')
        page.evaluate("""()=>{localStorage.setItem('kouheim_portfolio_v2',JSON.stringify([{symbol:'8306.T',name:'検証銀行',shares:30,cost:100},{symbol:'2811.T',name:'検証食品',shares:20,cost:100}]));localStorage.setItem('kouheim_portfolio_lots_v1',JSON.stringify([{symbol:'8306.T',owner:'OTS',broker:'SBI',tax:'nisa',shares:10,cost:100,amount:1000},{symbol:'8306.T',owner:'OKS',broker:'SBI',tax:'specific',shares:20,cost:100,amount:2000},{symbol:'2811.T',owner:'OTS',broker:'SBI',tax:'specific',shares:20,cost:100,amount:2000}]))}""")
        page.reload(); page.wait_for_selector('#dividendNav'); page.locator('#dividendNav').click()
        page.wait_for_selector('#sheetBody tr'); page.wait_for_function("!document.getElementById('sheetReload').disabled")
        assert 'dividends-dashboard.html' in page.url
        assert page.locator('h1').inner_text()=='配当ダッシュボード'
        assert page.locator('#overallMetrics .sheet-metric').count()==4
        assert page.locator('#sheetBody tr').count()==2
        assert page.locator('.sheet-row-check:checked').count()==2
        page.locator('#sheetYears').select_option('5')
        assert page.locator('#sheetPeriodLabel').inner_text()=='直近5期'
        assert page.locator('#overallChart .sheet-bar').count()==5
        page.locator('[data-filter="owner"][data-value="OTS"]').click()
        assert '10株' in page.locator('#sheetBody').inner_text()
        page.locator('[data-filter="owner"][data-value="all"]').click()
        page.locator('.sheet-row-check[data-symbol="2811.T"]').uncheck()
        assert '1銘柄' in page.locator('#overallMetrics').inner_text()
        page.locator('#viewIndividual').click()
        assert page.locator('#individualPanel').is_visible()
        assert page.locator('#focusStock').input_value() in ['8306.T','2811.T']
        assert page.locator('#individualBody tr').count()==5
        assert page.locator('.dashboard-alt-link').get_attribute('href')=='./dividends-sheet.html'
        assert page.locator('.sheet-receipts-link').get_attribute('href')=='./dividends.html?mode=receipts'
        for width in (320,390,768,1280):
            page.set_viewport_size({'width':width,'height':844})
            page.evaluate('()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))')
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),(name,width)
        page.set_viewport_size({'width':390,'height':844})
        page.screenshot(path=str(RESULTS/f'{name}-dividend-dashboard.png'),full_page=True)
        page.locator('#theme').click(); assert page.locator('body').evaluate("e=>e.classList.contains('apple-look')")
        assert not errors,errors
        print(name,'dividend dashboard: PASS')
        ctx.close(); browser.close()
