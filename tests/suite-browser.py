"""Unified app integration. Fictional holdings and MF's isolated demo only."""
from contextlib import contextmanager
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from threading import Thread
import json, os
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
    def go(route):
        page.evaluate('(r)=>location.hash=r',route)
        page.wait_for_function("r=>location.hash==='#'+r",arg=route)
        page.wait_for_timeout(80)
        page.wait_for_function("()=>document.getElementById('engine-area').hidden || document.getElementById('engine-loading').hidden")
        assert page.locator('#engine-error').is_hidden(),route
    def frame(key):
        return page.locator('#frame-'+key).element_handle().content_frame()
    try:
        page.goto(base+'/index.html');page.wait_for_selector('#bottom-nav button')
        check('root opens unified app','unified.html' in page.url)
        check('five labeled SVG navigation icons',page.locator('#bottom-nav button svg').count()==5)
        page.wait_for_function("()=>!document.getElementById('asset-basis').textContent.includes('読み込んでいます')")
        check('empty assets are unknown, not zero',page.locator('#asset-total').inner_text()=='—')
        page.screenshot(path=str(OUT/'mobile-empty.png'))
        # Existing local holdings and receipts stay in their original keys.
        page.evaluate("""()=>{localStorage.setItem('kouheim_portfolio_v2',JSON.stringify([{symbol:'8306.T',name:'検証銀行',shares:30,cost:100},{symbol:'2811.T',name:'検証食品',shares:20,cost:100}]));localStorage.setItem('kouheim_portfolio_dividends_v1',JSON.stringify([{symbol:'8306.T',date:new Date().getFullYear()+'-01-01',owner:'OTS',currency:'JPY',net:1234}]));}""")
        original=page.evaluate("localStorage.getItem('kouheim_portfolio_v2')")
        page.reload();page.wait_for_selector('#bottom-nav button')
        go('holdings');h=frame('holdings')
        check('existing holdings reused',h.locator('#body tr').count()==2)
        h.locator('#import').click();h.locator('#importJson').fill('draft is not saved')
        go('home');go('holdings');h=frame('holdings')
        check('draft survives screen switches',h.locator('#importJson').input_value()=='draft is not saved')
        h.locator('#importCancel').click()
        go('dividends/history');d=frame('dividends')
        d.wait_for_function("!document.getElementById('sheetReload').disabled")
        check('10-year chart preserved',d.locator('#sheetYears').input_value()=='10')
        check('shared holdings appear in dividends',d.locator('#sheetBody tr').count()==2)
        d.locator('#clearVisible').click();go('assets/overview');go('dividends/history');d=frame('dividends')
        check('intentional empty selection survives switches',d.locator('.sheet-row-check:checked').count()==0)
        d.locator('#selectVisible').click();d.locator('#viewIndividual').click()
        check('individual dividend history works',d.locator('#individualPanel').is_visible())
        page.screenshot(path=str(OUT/'mobile-dividends.png'))
        for route in ['dividends/receipts','dividends/csv','dividends/forecast','assets/holdings','assets/owners','settings/import','settings/storage','settings/consult','settings/menu']:
            go(route)
            check('route '+route+' renders',page.locator('#engine-error').is_hidden())
        go('assets/overview');a=frame('assets')
        a.locator('[data-action="demo"]').click()
        page.wait_for_function("()=>!document.getElementById('demo-label').hidden")
        go('home')
        check('home receives asset summary',page.locator('#asset-total').inner_text() not in ['—','¥0'])
        check('demo clearly marked',page.locator('#demo-label').is_visible())
        check('stock data not overwritten',page.evaluate("localStorage.getItem('kouheim_portfolio_v2')")==original)
        for width in [320,390,768,1440]:
            page.set_viewport_size({'width':width,'height':900 if width>800 else 844})
            page.wait_for_timeout(120)
            check('no shell overflow '+str(width),page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
            box=page.locator('#bottom-nav').bounding_box()
            check('bottom navigation within viewport '+str(width),box['y']>=0 and box['y']+box['height']<=page.viewport_size['height']+1)
            page.screenshot(path=str(OUT/f'home-{width}.png'))
        page.set_viewport_size({'width':390,'height':844})
        page.locator('#privacy').click()
        check('home money masked',page.locator('#asset-total').inner_text()=='••••••')
        go('assets/owners')
        check('all detailed values protected',page.locator('#privacy-guard').is_visible() and not page.locator('#frame-assets').is_visible())
        check('detail excluded from accessibility tree',page.locator('#frame-assets').get_attribute('aria-hidden')=='true')
        page.screenshot(path=str(OUT/'mobile-privacy.png'))
        page.locator('#guard-show').click()
        check('restoring visibility works',page.locator('#frame-assets').is_visible())
        go('settings/menu');page.locator('#receipt-source').select_option('receipts');go('home')
        check('selected actual receipt source not summed with CSV',page.locator('#actual-total').inner_text()=='¥1,234')
        go('assets/overview');frame('assets').locator('#exit-demo').click();go('home')
        page.wait_for_function("()=>document.getElementById('demo-label').hidden")
        check('exiting demo restores real empty assets',page.locator('#asset-total').inner_text()=='—')
        check('no JavaScript exceptions',not errors)
        print(json.dumps({'checks':checks,'errors':errors},ensure_ascii=False,indent=2))
    except Exception:
        page.screenshot(path=str(OUT/'failure.png'))
        (OUT/'failure.txt').write_text(page.locator('body').inner_text(),encoding='utf-8')
        raise
    finally:
        (OUT/'report.json').write_text(json.dumps({'checks':checks,'errors':errors},ensure_ascii=False,indent=2),encoding='utf-8')
        browser.close()
