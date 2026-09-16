"""Synthetic visual/layout verification for dashboard v1.1.0."""
import json, os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
OUT=Path('mf-assets/test-results');OUT.mkdir(parents=True,exist_ok=True)
checks=[];errors=[]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH'))
 ctx=browser.new_context(viewport={'width':1440,'height':1000})
 page=ctx.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
 try:
  page.goto('http://127.0.0.1:8080/mf-assets/')
  page.get_by_role('button',name='サンプルで体験する →').wait_for()
  page.get_by_role('button',name='サンプルで体験する →').click()
  page.locator('.dashboard-v3').wait_for()
  expect(page.get_by_role('heading',name='資産の全体像')).to_be_visible()
  assert page.locator('.dashboard-v3-metrics .metric').count()==4
  assert page.locator('.dashboard-v3-main > .panel').count()==2
  assert page.locator('.dashboard-v3-secondary > .panel').count()==2
  assert page.locator('.dashboard-v3-bottom > .panel').count()==3
  assert 'おかえりなさい' not in page.locator('main').inner_text()
  expect(page.locator('.sidebar-bottom small')).to_have_text('非公式補助アプリ · v1.1.0')
  checks.append('desktop dashboard uses the new three-row structural layout')
  page.screenshot(path=str(OUT/'layout-v110-desktop.png'),full_page=True)
  page.set_viewport_size({'width':390,'height':844})
  widths=page.evaluate('({inner:innerWidth,total:document.documentElement.scrollWidth})')
  assert widths['total']<=widths['inner']+1,widths
  assert page.locator('.dashboard-v3-main > .panel').count()==2
  checks.append('new dashboard is responsive without page-level horizontal overflow')
  page.screenshot(path=str(OUT/'layout-v110-mobile.png'),full_page=True)
  page.locator('[data-view="holdings"]').click()
  assert '表示できませんでした' not in page.locator('main').inner_text()
  page.locator('[data-view="dividends"]').click()
  assert '表示できませんでした' not in page.locator('main').inner_text()
  checks.append('non-dashboard views still render after shell redesign')
  assert not errors,errors
 finally:
  (OUT/'layout-browser-report.json').write_text(json.dumps({'checks':checks,'errors':errors},ensure_ascii=False,indent=2),encoding='utf-8')
  browser.close()
print(json.dumps(checks,ensure_ascii=False,indent=2))
