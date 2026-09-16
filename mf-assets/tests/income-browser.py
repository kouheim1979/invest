"""Public CI uses synthetic data only. Never add real user CSVs here."""
import json, os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
OUT=Path('mf-assets/test-results');OUT.mkdir(parents=True,exist_ok=True)
H='計算対象,日付,内容,金額（円）,保有金融機関,大項目,中項目,メモ,振替,ID\n'
DATA=H+'0,2024/12/10,証券から振替,101,テスト銀行A,収入,配当所得,,1,A\n0,2025/01/15,証券から振替,203,テスト銀行A,収入,配当所得,,1,B\n0,2025/06/15,証券から振替,307,テスト銀行B,収入,配当所得,,1,C\n0,2025/06/15,一般の振替,9999,テスト銀行B,収入,その他入金,,1,D\n0,2025/01/15,証券から振替,-203,テスト証券A,収入,配当所得,,1,E'
NEXT=H+'0,2026/01/15,証券から振替,409,テスト銀行A,収入,配当所得,,1,F'
checks=[];errors=[];requests=[]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH'))
 ctx=browser.new_context(viewport={'width':1440,'height':1000},accept_downloads=True)
 page=ctx.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.on('request',lambda r:requests.append(r.url))
 try:
  page.goto('http://127.0.0.1:8080/mf-assets/')
  page.get_by_role('button',name='サンプルで体験する →').wait_for()
  page.locator('[data-view="import"]').click()
  for name,data in [('previous.csv',DATA),('next.csv',NEXT),('repeat.csv',DATA)]:
   page.locator('#import-files').set_input_files({'name':name,'mimeType':'text/csv','buffer':data.encode()})
   page.locator('#income-import-diagnostic').wait_for()
   page.locator('[data-action="commit-import"]').click()
  page.locator('[data-view="dividends"]').click()
  expect(page.locator('#income-diagnostic')).to_contain_text('510円')
  page.locator('[data-income-year="2025"]').click()
  expect(page.locator('.metric-number').first).to_contain_text('510')
  checks.append('explicit-category dividend income, calendar years, same-ID reimport')
  page.locator('[data-edit-t]').first.click()
  expect(page.locator('#t-include option[value="auto"]')).to_contain_text('明示された配当受取')
  page.locator('#t-include').select_option('no');page.locator('[data-save-t]').click()
  expect(page.locator('.metric-number').first).to_contain_text('203')
  page.locator('[data-edit-t]').first.click();page.locator('#t-include').select_option('auto');page.locator('[data-save-t]').click()
  expect(page.locator('.metric-number').first).to_contain_text('510')
  checks.append('manual exclusion has priority and can be reset')
  page.locator('[data-view="consult"]').click()
  assert '510円' in page.locator('#consult-output').input_value()
  assert 'テスト銀行' not in page.locator('#consult-output').input_value()
  checks.append('anonymous consultation totals agree')
  page.locator('[data-view="settings"]').click();page.locator('#persist-toggle').check()
  expect(page.locator('#storage-status')).to_have_text('端末に保存済み')
  page.reload();page.get_by_role('heading',name='資産の全体像').wait_for()
  expect(page.locator('#income-diagnostic')).to_contain_text('510円')
  page.locator('[data-income-year="2025"]').click()
  expect(page.locator('.metric-number').nth(1)).to_contain_text('510')
  checks.append('persisted original household flags re-evaluate without reimport')
  page.screenshot(path=str(OUT/'income-desktop.png'),full_page=True)
  page.set_viewport_size({'width':390,'height':844})
  page.screenshot(path=str(OUT/'income-mobile.png'),full_page=True)
  widths=page.evaluate('({inner:innerWidth,total:document.documentElement.scrollWidth})')
  assert widths['total']<=widths['inner']+1,widths
  checks.append('mobile layout has no page-level overflow')
  assert not errors,errors
  assert all(u.startswith('http://127.0.0.1:8080/') or u.startswith('data:') or u.startswith('blob:') for u in requests)
  checks.append('no JS errors or external runtime requests')
 finally:
  (OUT/'income-browser-report.json').write_text(json.dumps({'checks':checks,'errors':errors},ensure_ascii=False,indent=2))
  browser.close()
print(json.dumps(checks,ensure_ascii=False,indent=2))
