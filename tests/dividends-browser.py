"""UI regression uses fictional holdings/receipts only. Never read real private data."""
from contextlib import contextmanager
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from threading import Thread
import json, os, shutil
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
RESULTS = ROOT/'test-results'; RESULTS.mkdir(exist_ok=True)
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *_): pass

@contextmanager
def server():
    http = ThreadingHTTPServer(('127.0.0.1', 0), partial(Quiet, directory=str(ROOT)))
    Thread(target=http.serve_forever, daemon=True).start()
    try: yield f'http://127.0.0.1:{http.server_port}'
    finally: http.shutdown()

with server() as base, sync_playwright() as pw:
    engines = [('chromium', pw.chromium, {'executable_path':shutil.which('google-chrome') or shutil.which('chromium')})]
    if os.environ.get('DIVIDEND_WEBKIT') == '1': engines.append(('webkit', pw.webkit, {}) )
    for engine_name, engine, launch in engines:
        launch = {k:v for k,v in launch.items() if v}
        browser = engine.launch(headless=True, **launch)
        ctx = browser.new_context(viewport={'width':390, 'height':844}, locale='ja-JP', timezone_id='Asia/Tokyo', device_scale_factor=1)
        page = ctx.new_page(); errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        ctx.route('**/*', lambda route: route.continue_() if route.request.url.startswith(base) else route.abort())
        page.on('dialog',lambda dialog:dialog.accept())
        # Legacy/detail page remains valid for direct links and receipt handling.
        page.goto(base+'/dividends.html?symbol=8306.T')
        page.wait_for_function("!document.getElementById('reloadHistory').disabled")
        assert page.locator('#historyTable tr').count() == 10
        assert page.locator('#historyChart .bar-item').count() == 10
        assert '受取額とは別' in page.locator('#historyPanel').inner_text()
        assert not page.locator('#receiptsPanel').is_visible()
        assert '予想' not in page.locator('#historyTable').inner_text()
        series = json.loads((ROOT/'dividends-data.json').read_text())['series']['8306.T']
        assert series['years'][-1]['annual'] > 0
        for width in (320,390,768,1280):
            page.set_viewport_size({'width':width,'height':844})
            page.evaluate('()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))')
            fits = page.evaluate('document.documentElement.scrollWidth<=innerWidth')
            if not fits:
                diagnostics = page.evaluate("""()=>({viewport:innerWidth,document:document.documentElement.scrollWidth,elements:[...document.querySelectorAll('body *')].filter(e=>{const r=e.getBoundingClientRect();return r.width&&r.right>innerWidth}).map(e=>({tag:e.tagName,id:e.id,cls:e.className,width:e.getBoundingClientRect().width,right:e.getBoundingClientRect().right,display:getComputedStyle(e).display,text:e.textContent.slice(0,80)}))})""")
                print('LAYOUT',engine_name,width,json.dumps(diagnostics,ensure_ascii=False),flush=True)
                page.screenshot(path=str(RESULTS/f'{engine_name}-overflow-{width}.png'),full_page=True)
            assert fits, ('overflow',engine_name,width)
        page.set_viewport_size({'width':390,'height':844})
        page.screenshot(path=str(RESULTS/f'{engine_name}-dividends-iphone.png'),full_page=True)
        page.locator('#theme').click()
        assert page.locator('body').evaluate("e=>e.classList.contains('apple-look')")
        page.screenshot(path=str(RESULTS/f'{engine_name}-dividends-dark.png'),full_page=True)
        page.locator('#tabReceipts').click()
        assert page.locator('#receiptTable tr').count()==10
        assert '未登録' in page.locator('#receiptTable').inner_text()
        assert '¥0' not in page.locator('#receiptMetrics').inner_text()
        page.locator('#addPanel summary').click()
        form=page.locator('#receiptForm')
        form.locator('[name=date]').fill('2025-06-20')
        form.locator('[name=symbol]').fill('8306.T')
        form.locator('[name=name]').fill('検証用銘柄（架空の入金）')
        form.locator('[name=owner]').select_option('OTS')
        form.locator('[name=broker]').fill('SBI')
        form.locator('[name=accountType]').select_option('specific')
        form.locator('[name=gross]').fill('1000')
        form.locator('[name=tax]').fill('200')
        form.locator('[name=note]').fill('<img src=x onerror=alert(1)>')
        form.locator('[type=submit]').click()
        saved=page.evaluate("JSON.parse(localStorage.getItem('kouheim_portfolio_dividends_v1'))")
        assert saved['receipts'][0]['net']==800
        assert page.locator('#receiptDetails img').count()==0
        assert page.evaluate("localStorage.getItem('kouheim_portfolio_v2')") is None
        page.locator('#importPanel summary').click()
        sample={'receipts':[
            {'id':'test-net-24','date':'2024-01-05','symbol':'1234.T','owner':'OKS','broker':'SBI','accountType':'nisa','currency':'JPY','net':500},
            {'id':'test-usd-25','date':'2025-01-05','symbol':'ABCD','owner':'OTS','broker':'SBI','accountType':'specific','currency':'USD','net':20},
            {'id':'test-unknown-25','date':'2025-01-05','symbol':'1234.T','owner':'OTS','broker':'SBI','accountType':'oldNisa','currency':'JPY','gross':100}
        ]}
        page.locator('#receiptText').fill(json.dumps(sample))
        page.locator('#previewImport').click()
        assert '追加 3件' in page.locator('#importPreview').inner_text()
        page.locator('#confirmImport').click()
        page.locator('#owner').select_option('OTS')
        assert '¥800' in page.locator('#receiptMetrics').inner_text()
        assert '金額不明 1件' in page.locator('#receiptMetrics').inner_text()
        page.locator('#currency').select_option('USD')
        assert '20 USD' in page.locator('#receiptMetrics').inner_text()
        page.locator('#currency').select_option('JPY')
        page.locator('#owner').select_option('all')
        page.locator('#receiptText').fill(json.dumps(sample));page.locator('#previewImport').click()
        assert '重複 3件' in page.locator('#importPreview').inner_text()
        assert not page.locator('#confirmImport').is_visible()
        page.locator('#receiptChart [data-year="2025"]').click()
        assert '2025年' in page.locator('#detailTitle').inner_text()
        page.screenshot(path=str(RESULTS/f'{engine_name}-receipts-fictional.png'),full_page=True)
        with page.expect_download() as download: page.locator('#exportReceipts').click()
        assert download.value.suggested_filename.endswith('.json')
        # Account-aware dividend sheet: use fictional shares only.
        page.evaluate("""()=>{localStorage.setItem('kouheim_portfolio_v2',JSON.stringify([{symbol:'8306.T',name:'検証銘柄',shares:30,cost:100},{symbol:'2811.T',name:'検証食品',shares:20,cost:100}]));localStorage.setItem('kouheim_portfolio_lots_v1',JSON.stringify([{symbol:'8306.T',owner:'OTS',broker:'SBI',tax:'nisa',shares:10,cost:100,amount:1000},{symbol:'8306.T',owner:'OKS',broker:'SBI',tax:'specific',shares:20,cost:100,amount:2000},{symbol:'2811.T',owner:'OTS',broker:'SBI',tax:'specific',shares:20,cost:100,amount:2000}]))}""")
        page.goto(base+'/app-v3.html')
        page.wait_for_selector('#dividendNav')
        page.wait_for_selector('#mobile .dividend-link')
        assert page.locator('#mobile .dividend-link').count()==2
        # Per-stock link opens the new sheet focused on that stock.
        page.locator('#mobile .dividend-link').first.click()
        page.wait_for_selector('#sheetBody tr')
        page.wait_for_function("!document.getElementById('sheetReload').disabled")
        assert 'dividends-sheet.html' in page.url
        assert page.locator('#viewIndividual').get_attribute('aria-selected')=='true'
        assert page.locator('#focusStock').input_value()=='8306.T'
        assert '30株' in page.locator('#sheetBody').inner_text()
        assert page.locator('.sheet-row-check:checked').count()==1
        # Owner/tax filters change current shares without changing source history.
        page.locator('[data-filter="owner"][data-value="OTS"]').click()
        assert '10株' in page.locator('#sheetBody').inner_text()
        page.locator('[data-filter="tax"][data-value="nisa"]').click()
        assert '10株' in page.locator('#sheetBody').inner_text()
        page.locator('[data-filter="owner"][data-value="all"]').click()
        page.locator('[data-filter="tax"][data-value="all"]').click()
        # Any 1-10 year window is selectable; total and individual use the same period.
        page.locator('#sheetYears').select_option('5')
        assert page.locator('#sheetPeriodLabel').inner_text()=='直近5期'
        assert page.locator('#individualBody tr').count()==5
        page.locator('#viewOverall').click()
        assert page.locator('#viewOverall').get_attribute('aria-selected')=='true'
        assert '1銘柄' in page.locator('#overallMetrics').inner_text()
        # Add second holding by checkbox; overall changes to two selected holdings.
        page.locator('.sheet-row-check[data-symbol="2811.T"]').check()
        assert '2銘柄' in page.locator('#overallMetrics').inner_text()
        assert page.locator('#overallChart .sheet-bar').count()==5
        # Search only narrows displayed sheet rows; selected totals remain explicit.
        page.locator('#sheetSearch').fill('2811')
        assert page.locator('#sheetBody tr').count()==1
        assert '選択 2銘柄' in page.locator('#selectionCount').inner_text()
        page.locator('#sheetSearch').fill('')
        # Whole page must not horizontally overflow; tables/charts scroll inside cards.
        for width in (320,390,768,1280):
            page.set_viewport_size({'width':width,'height':844})
            page.evaluate('()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))')
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'), ('sheet overflow',engine_name,width)
        page.set_viewport_size({'width':390,'height':844})
        page.screenshot(path=str(RESULTS/f'{engine_name}-dividend-sheet.png'),full_page=True)
        # Legacy detailed conversion remains available directly for compatibility.
        page.goto(base+'/dividends.html?symbol=8306.T')
        page.wait_for_function("!document.getElementById('reloadHistory').disabled")
        page.locator('#referencePanel summary').click()
        page.locator('#refOwner').select_option('OTS')
        assert '10株' in page.locator('#referenceTotal').inner_text()
        expected=series['years'][-1]['annual']*10
        assert page.locator('#referenceTable tr').first.locator('td').nth(1).inner_text().replace(',','')=='¥'+str(int(expected))
        page.goto(base+'/dividends.html?mode=receipts')
        assert page.locator('#receiptsPanel').is_visible()
        assert len(page.evaluate("JSON.parse(localStorage.getItem('kouheim_portfolio_dividends_v1')).receipts"))==4
        assert not errors, errors
        print(engine_name, 'dividend history / sheet filters / year windows / total-individual / receipts / privacy / mobile: PASS')
        ctx.close();browser.close()
