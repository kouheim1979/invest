"""Synthetic checks for the Money Forward category correction screen."""
from pathlib import Path
import os
from playwright.sync_api import sync_playwright

OUT=Path('mf-assets/test-results')
OUT.mkdir(parents=True,exist_ok=True)

with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH'))
    page=browser.new_page(viewport={'width':390,'height':844},accept_downloads=True)
    errors=[]; requests=[]
    page.on('pageerror',lambda e: errors.append(str(e)))
    page.on('request',lambda r: requests.append(r.url))
    page.goto('http://127.0.0.1:8080/mf-assets/category-corrector.html')
    page.get_by_role('heading',name='ME分類なおし').wait_for()
    page.locator('#workspace').wait_for(state='visible')
    assert '1,998' in page.locator('#metrics').inner_text()
    assert '横浜市営地下鉄' in page.locator('#records').inner_text()
    assert 'シミュレーション' in page.locator('#simulation').inner_text()
    page.get_by_role('button',name='ワンクリックで最適化').click()
    page.locator('[data-filter="changed"]').click()
    assert page.locator('#records tbody tr').count()==5
    page.locator('[data-filter="all"]').click()
    page.locator('[data-edit]').first.click()
    page.locator('#edit-minor').fill('地下鉄')
    page.locator('#save-edit').click()
    page.locator('[data-filter="changed"]').click()
    assert '地下鉄' in page.locator('#records').inner_text()
    with page.expect_download() as event:
        page.locator('#export-log').click()
    event.value.save_as(str(OUT/'category-corrector-log.csv'))
    width=page.evaluate('({v:innerWidth,d:document.documentElement.scrollWidth})')
    assert width['d']<=width['v']+1,width
    external=[u for u in requests if not u.startswith('http://127.0.0.1:8080/') and not u.startswith('blob:') and not u.startswith('data:')]
    assert not errors,errors
    assert not external,external
    page.screenshot(path=str(OUT/'category-corrector-mobile.png'),full_page=True)
    browser.close()
