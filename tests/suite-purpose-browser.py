"""Purpose portfolio integration with fictional Money Forward-shaped holdings only."""
from contextlib import contextmanager
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from threading import Thread
import json, os
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parent.parent
OUT=ROOT/'suite-test-results'; OUT.mkdir(exist_ok=True)
CSV='名義,保有金融機関,銘柄名,評価額,取得金額,税区分,基準日\n夫,検証証券,検証投信A,120000,100000,NISA,2026-09-19\n妻,検証証券,検証投信B,90000,,NISA,2026-09-19\n夫,検証銀行,普通預金,50000,,未設定,2026-09-18'

class Quiet(SimpleHTTPRequestHandler):
    def log_message(self,*_): pass

@contextmanager
def server():
    http=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT)))
    Thread(target=http.serve_forever,daemon=True).start()
    try: yield f'http://127.0.0.1:{http.server_port}'
    finally: http.shutdown()

with server() as base, sync_playwright() as pw:
    launch={'headless':True}
    if os.environ.get('CHROMIUM_PATH'): launch['executable_path']=os.environ['CHROMIUM_PATH']
    browser=pw.chromium.launch(**launch)
    ctx=browser.new_context(viewport={'width':390,'height':844},locale='ja-JP',timezone_id='Asia/Tokyo')
    ctx.route('**/*',lambda r:r.continue_() if r.request.url.startswith(base) else r.abort())
    page=ctx.new_page(); errors=[]; checks=[]
    page.on('pageerror',lambda e:errors.append(str(e)))

    def check(name,condition):
        assert condition,name
        checks.append(name)
    def assets():
        page.wait_for_selector('#frame-assets',state='attached')
        a=page.locator('#frame-assets').element_handle().content_frame()
        a.wait_for_selector('#main:not(:has(.loading))',state='attached')
        return a
    def go(route):
        page.evaluate('(r)=>location.hash=r',route)
        page.wait_for_function("()=>document.getElementById('engine-loading').hidden")
        page.wait_for_timeout(100)
        assert page.locator('#engine-error').is_hidden(),route
        return assets()
    def purposes():
        a=go('assets/purposes');a.wait_for_selector('#purpose-page');return a
    def import_csv(text):
        a=go('settings/import')
        a.locator('#import-files').set_input_files({'name':'fictional-mf-holdings.csv','mimeType':'text/csv','buffer':text.encode('utf-8')})
        a.wait_for_selector('#imp-type')
        check('holdings file detected',a.locator('#imp-type').input_value()=='holdings')
        a.locator('[data-action="commit-import"]').click()
        a.wait_for_selector('[data-go="purposes"]')
        a.locator('[data-go="purposes"]').click()
        a.wait_for_selector('#purpose-page')
        return a
    def legend(a,id):
        return a.locator('[data-purpose-action="select"][data-purpose-id="'+id+'"]')
    try:
        page.goto(base+'/unified.html#assets/purposes')
        a=assets();a.wait_for_selector('#purpose-page')
        check('deep link renders new purpose screen',page.locator('#subnav [aria-current="page"]').inner_text()=='目的別')
        check('empty balance is not fabricated',a.locator('#purpose-total').inner_text()=='—')
        check('empty state links to holdings import',a.get_by_role('button',name='保有資産を取り込む',exact=True).is_visible())
        a=import_csv(CSV)
        check('import drives ring total',a.locator('#purpose-total').inner_text()=='¥260,000')
        check('imported rows start unassigned','¥260,000' in legend(a,'unassigned').inner_text())
        a.get_by_label('検証投信Aの目的',exact=True).select_option('retirement')
        a.get_by_label('検証投信Bの目的',exact=True).select_option('education')
        check('single asset assignment uses current balance','¥120,000' in legend(a,'retirement').inner_text())
        a.locator('[data-purpose-action="bulk"]').click()
        a.locator('#purpose-bulk-scope').select_option(label='夫 · 検証銀行（1資産）')
        a.locator('#purpose-bulk-target').select_option('emergency')
        a.locator('[data-purpose-action="save-bulk"]').click()
        check('bulk account assignment','¥50,000' in legend(a,'emergency').inner_text())
        check('all values still counted once',a.locator('#purpose-total').inner_text()=='¥260,000')
        a.locator('[data-purpose-action="edit-groups"]').click()
        a.locator('[data-purpose-group="0"] [data-purpose-field="name"]').fill('将来の生活費')
        a.locator('[data-purpose-action="save-groups"]').click()
        check('renamed purpose retains assigned amount','将来の生活費' in legend(a,'retirement').inner_text() and '¥120,000' in legend(a,'retirement').inner_text())
        a.locator('[data-purpose-action="edit-groups"]').click()
        a.locator('[data-purpose-action="remove-group"][data-purpose-index="2"]').click()
        a.locator('#modal [data-action="close-modal"]').click()
        check('cancelled deletion leaves assignments intact','¥50,000' in legend(a,'emergency').inner_text())
        legend(a,'education').click()
        check('purpose drilldown filters asset list',a.locator('.purpose-asset-row').count()==1 and a.locator('#purpose-total').inner_text()=='¥90,000')
        legend(a,'all').click()
        a.locator('#purpose-search').fill('普通預金')
        check('search finds imported bank assets',a.locator('.purpose-asset-row').count()==1)
        a.locator('#purpose-search').fill('')
        a.locator('#owner-filter').select_option('妻')
        check('owner filter keeps money separate',a.locator('#purpose-total').inner_text()=='¥90,000')
        a.locator('#owner-filter').select_option('all')
        for width in [320,390,768,1440]:
            page.set_viewport_size({'width':width,'height':900 if width>800 else 844})
            page.wait_for_timeout(100)
            check('no purpose screen overflow '+str(width),a.evaluate('document.documentElement.scrollWidth<=innerWidth') and page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
            check('ring fully inside frame '+str(width),a.locator('.purpose-ring').bounding_box()['width']<=width)
            page.screenshot(path=str(OUT/f'purpose-{width}.png'))
        page.set_viewport_size({'width':390,'height':844})
        page.locator('#privacy').click()
        check('purpose details protected by existing privacy guard',page.locator('#privacy-guard').is_visible() and not page.locator('#frame-assets').is_visible())
        page.locator('#guard-show').click()
        a=go('assets/overview')
        # The demo action is also available from the saved-data settings view.
        a=go('settings/storage');a.locator('[data-action="demo"]').click()
        a=purposes();check('demo visibly marked',a.locator('#demo-banner').is_visible())
        a.locator('#exit-demo').click();a=purposes()
        check('demo preserves real assignments','将来の生活費' in legend(a,'retirement').inner_text() and a.locator('#purpose-total').inner_text()=='¥260,000')
        a=go('settings/storage');a.locator('#persist-toggle').check()
        a.wait_for_function("document.getElementById('storage-status').textContent==='端末に保存済み'")
        purposes();page.reload();a=assets();a.wait_for_selector('#purpose-page')
        check('classification survives persistent reload','将来の生活費' in legend(a,'retirement').inner_text() and '¥120,000' in legend(a,'retirement').inner_text())
        a=import_csv(CSV.replace('120000','145000'))
        check('reimport updates balance without duplicate or lost purpose',a.locator('#purpose-total').inner_text()=='¥285,000' and '¥145,000' in legend(a,'retirement').inner_text())
        check('no JavaScript exceptions',not errors)
        print(json.dumps({'checks':checks,'errors':errors},ensure_ascii=False,indent=2))
    except Exception:
        print(json.dumps({'completed_checks':checks,'errors':errors},ensure_ascii=False,indent=2))
        print(assets().locator('#main').inner_text())
        page.screenshot(path=str(OUT/'purpose-failure.png'))
        (OUT/'purpose-failure.txt').write_text(page.locator('body').inner_text(),encoding='utf-8')
        raise
    finally:
        (OUT/'purpose-report.json').write_text(json.dumps({'checks':checks,'errors':errors},ensure_ascii=False,indent=2),encoding='utf-8')
        browser.close()
