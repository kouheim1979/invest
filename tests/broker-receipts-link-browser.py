"""Public fictional 139-row fixture: short-link import in Chromium and Safari's WebKit engine."""
from contextlib import contextmanager
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from threading import Thread
import json, subprocess
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

doc={'id':'fictional','name':'fictional.csv','kind':'csv','account':'検証用口座','from':'2024-01-01','to':'2024-04-15','coverageFrom':'2024-01-01','coverageTo':'2024-04-15','note':'架空資料'}
kinds=[('dividend',120),('substitute',35),('interest',7)]
rows=[{'id':str(i),'account':doc['account'],'date':'2024-03-12','category':kinds[i%3][0],'instrument':'検証株式会社' if i%3==0 else '',
       'quantity':None,'amount':kinds[i%3][1],'currency':'JPY','note':'','sources':[{'documentId':doc['id'],'page':None,'line':i+11}]} for i in range(139)]
packet={'schema':'asset-compass-broker-receipts','version':1,'preparedAt':'2024-04-16','scopeNote':'公開CI専用の架空明細です。','documents':[doc],'receipts':rows}
code="const fs=require('node:fs');console.log(JSON.stringify(require('./scripts/create-broker-private-link.cjs').create(JSON.parse(fs.readFileSync(0,'utf8')))));"
link=json.loads(subprocess.check_output(['node','-e',code],input=json.dumps(packet).encode(),cwd=ROOT))
totals={kind:sum(r['amount'] for r in rows if r['category']==kind) for kind,_ in kinds}
total=sum(totals.values())

with server() as base, sync_playwright() as pw:
    for engine in ['chromium','webkit']:
        browser=getattr(pw,engine).launch(headless=True)
        ctx=browser.new_context(viewport={'width':390,'height':844},locale='ja-JP')
        ctx.route('**/*',lambda r:r.continue_() if r.request.url.startswith(base) else r.abort())
        ctx.route(base+'/broker-handoffs/'+link['id']+'.json',lambda r:r.fulfill(status=200,content_type='application/json',body=json.dumps(link['envelope'])))
        page=ctx.new_page();errors=[];requests=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.on('request',lambda r:requests.append(r.url))
        try:
            page.goto(base+'/broker-receipts.html')
            assert page.locator('#empty').is_visible()
            page.goto(base+'/broker-receipts.html'+link['fragment'])
            page.locator('#pending').wait_for(state='visible')
            assert '#' not in page.url
            assert page.locator('#empty').is_hidden()
            assert '新規 139件' in page.locator('#pending-summary').inner_text()
            page.locator('#apply').click()
            assert page.locator('#received-total').inner_text()==f'¥{total:,}'
            for kind,_ in kinds:
                assert page.locator('#'+kind+'-total').inner_text()==f'¥{totals[kind]:,}'
            assert page.locator('#details .receipt').count()==139
            page.reload();assert page.locator('#received-total').inner_text()==f'¥{total:,}'
            page.goto(base+'/broker-receipts.html'+link['fragment'])
            page.locator('#pending').wait_for(state='visible');page.locator('#apply').click()
            assert '反映済み' in page.locator('#status').inner_text()
            assert page.locator('#details .receipt').count()==139
            page.goto(base+'/broker-receipts.html#br1=A')
            page.get_by_text('取り込みリンクが壊れているか、途中で切れています。新しい専用リンクから開き直してください。',exact=True).wait_for()
            assert 'invalid characters' not in page.locator('body').inner_text()
            assert page.locator('#received-total').inner_text()==f'¥{total:,}'
            assert all(link['fragment'].split('.')[1] not in url for url in requests)
            page.get_by_role('link',name='資産コンパスに戻る').click()
            page.locator('#frame-broker').wait_for(state='visible')
            frame=page.locator('#frame-broker').element_handle().content_frame()
            assert frame.locator('#received-total').inner_text()==f'¥{total:,}'
            assert frame.evaluate('document.documentElement.scrollWidth<=innerWidth')
            page.screenshot(path=str(OUT/f'broker-shortlink-{engine}.png'))
            assert not errors,errors
            print(engine+': empty browser -> 139 fictional receipts -> persisted suite totals; repeat and damaged links preserve saved data.')
        except Exception:
            page.screenshot(path=str(OUT/f'broker-shortlink-{engine}-failure.png'))
            raise
        finally:
            browser.close()
