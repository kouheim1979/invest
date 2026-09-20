"""Public CI fixture only: brokerage receipt import, totals and isolated navigation."""
from contextlib import contextmanager
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from threading import Thread
import base64, gzip, json
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parent.parent
OUT=ROOT/'suite-test-results'; OUT.mkdir(exist_ok=True)
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self,*_): pass
@contextmanager
def server():
    http=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT)))
    Thread(target=http.serve_forever,daemon=True).start()
    try: yield f'http://127.0.0.1:{http.server_port}'
    finally: http.shutdown()

doc={'id':'fictional-doc','name':'fictional.csv','kind':'csv','account':'検証用口座','from':'2024-01-01','to':'2024-04-15','coverageFrom':'2024-01-01','coverageTo':'2024-04-15','note':'架空データ'}
rows=[{'id':str(i),'account':doc['account'],'date':'2024-03-12','category':kind,'instrument':'検証株式会社' if kind=='dividend' else '',
       'quantity':None,'amount':amount,'currency':'JPY','note':'','sources':[{'documentId':doc['id'],'page':None,'line':i+1}]}
      for i,(kind,amount) in enumerate([('dividend',120),('substitute',35),('interest',7)])]
packet={'schema':'asset-compass-broker-receipts','version':1,'preparedAt':'2024-04-16','scopeNote':'公開CI専用の架空明細です。','documents':[doc],'receipts':rows}
token=base64.urlsafe_b64encode(gzip.compress(json.dumps(packet,ensure_ascii=False).encode())).decode().rstrip('=')

with server() as base, sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True)
    ctx=browser.new_context(viewport={'width':390,'height':844},locale='ja-JP')
    ctx.route('**/*',lambda r:r.continue_() if r.request.url.startswith(base) else r.abort())
    page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    try:
        page.goto(base+'/broker-receipts.html#br1='+token)
        page.locator('#pending').wait_for(state='visible')
        assert '#' not in page.url
        assert page.locator('#received-total').is_hidden()
        page.locator('#apply').click()
        assert page.locator('#received-total').inner_text()=='¥162'
        assert page.locator('#dividend-total').inner_text()=='¥120'
        assert page.locator('#substitute-total').inner_text()=='¥35'
        assert page.locator('#interest-total').inner_text()=='¥7'
        assert '一部確認' in page.locator('#monthly tr').nth(3).inner_text()
        assert '未確認' in page.locator('#monthly tr').nth(4).inner_text()
        assert '—' in page.locator('#monthly tr').nth(4).inner_text()
        assert '¥0' in page.locator('#monthly tr').nth(0).inner_text()
        assert page.locator('.bar-fill').bounding_box()['width']>1
        page.reload();assert page.locator('#received-total').inner_text()=='¥162'
        page.goto(base+'/broker-receipts.html#br1='+token);page.locator('#pending').wait_for(state='visible');page.locator('#apply').click()
        assert '反映済み' in page.locator('#status').inner_text()
        assert page.locator('#details .receipt').count()==3
        page.locator('#category').select_option('interest');assert page.locator('#details .receipt').count()==1
        page.locator('#details summary').click();assert 'fictional.csv' in page.locator('#details').inner_text()
        with page.expect_download() as dl:
            page.locator('#transfer').evaluate('(e)=>e.open=true');page.locator('#export').click()
        saved=json.loads(Path(dl.value.path()).read_text());assert len(saved['receipts'])==3
        page.goto(base+'/unified.html#dividends/broker');page.locator('#frame-broker').wait_for(state='visible')
        frame=page.locator('#frame-broker').element_handle().content_frame()
        assert frame.locator('#received-total').inner_text()=='¥162'
        for width in [320,390,768,1440]:
            page.set_viewport_size({'width':width,'height':900})
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
            assert frame.evaluate('document.documentElement.scrollWidth<=innerWidth')
            page.screenshot(path=str(OUT/f'broker-{width}.png'))
        page.locator('#privacy').click();assert page.locator('#privacy-guard').is_visible();assert page.locator('#frame-broker').get_attribute('aria-hidden')=='true'
        page.locator('#guard-show').click();assert page.locator('#frame-broker').is_visible()
        page.get_by_role('button',name='受取記録',exact=True).click();page.locator('#frame-receipts').wait_for(state='visible')
        assert page.evaluate("localStorage.getItem('kouheim_portfolio_dividends_v1')") is None
        assert not errors,errors
        print('Brokerage UI verified: loan totals, unknown periods, idempotency, export, suite privacy and responsive layout.')
    except Exception:
        page.screenshot(path=str(OUT/'broker-failure.png'))
        raise
    finally:
        browser.close()
