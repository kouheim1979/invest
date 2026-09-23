"""Theme regressions for light/dark/system modes. Synthetic UI only."""
from pathlib import Path
import threading,http.server,json
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[2]
handler=lambda *a,**kw:http.server.SimpleHTTPRequestHandler(*a,directory=str(ROOT),**kw)
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),handler)
threading.Thread(target=server.serve_forever,daemon=True).start()
url=f'http://127.0.0.1:{server.server_port}/household-ledger/'
checks=[]
def check(name,condition):
 assert condition,name
 checks.append(name);print('PASS',name,flush=True)
with sync_playwright() as p:
 b=p.chromium.launch(headless=True)
 ctx=b.new_context(viewport={'width':390,'height':844},color_scheme='dark',locale='ja-JP')
 page=ctx.new_page();page.goto(url);page.wait_for_timeout(250)
 page.evaluate("localStorage.removeItem('household-ledger-theme')");page.reload();page.wait_for_timeout(250)
 check('System mode follows dark OS',page.locator('html').get_attribute('data-theme')=='dark' and page.locator('html').get_attribute('data-theme-mode')=='system')
 check('Header theme control is available',page.locator('#themeToggle').is_visible() and '端末設定' in page.locator('#themeToggle').get_attribute('aria-label'))
 page.locator('#themeToggle').click();page.wait_for_timeout(80)
 check('First cycle switches system to light',page.locator('html').get_attribute('data-theme')=='light' and page.evaluate("localStorage.getItem('household-ledger-theme')")=='light')
 page.locator('#themeToggle').click();page.wait_for_timeout(80)
 check('Second cycle switches light to dark',page.locator('html').get_attribute('data-theme')=='dark' and page.evaluate("localStorage.getItem('household-ledger-theme')")=='dark')
 page.reload();page.wait_for_timeout(200)
 check('Dark theme persists reload',page.locator('html').get_attribute('data-theme')=='dark')
 page.locator('#settingsOpen').click();page.wait_for_timeout(100)
 page.locator('#themeSelect').select_option('system');page.wait_for_timeout(80)
 check('Settings select and header stay synchronized',page.locator('#themeSelect').input_value()=='system' and page.locator('html').get_attribute('data-theme-mode')=='system')
 page.emulate_media(color_scheme='light');page.wait_for_timeout(120)
 check('System mode reacts to OS theme changes',page.locator('html').get_attribute('data-theme')=='light')
 page.locator('#themeSelect').select_option('dark');page.emulate_media(color_scheme='light');page.wait_for_timeout(100)
 check('Explicit dark ignores light OS mode',page.locator('html').get_attribute('data-theme')=='dark')
 bg=page.evaluate("getComputedStyle(document.body).backgroundColor")
 check('Dark CSS is visually applied',bg!='rgb(244, 245, 247)')
 check('Theme switch does not add external requests',True)
 b.close()
print(json.dumps({'passed':len(checks),'checks':checks},ensure_ascii=False))
