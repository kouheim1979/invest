"""Synthetic end-to-end checks. No personal data or external runtime services."""
from pathlib import Path
import json
from playwright.sync_api import sync_playwright

OUT=Path('mf-assets/test-results')
OUT.mkdir(parents=True, exist_ok=True)
errors=[]
requests=[]
checks=[]

def record(name):
    checks.append(name)
    print('PASS:',name,flush=True)

with sync_playwright() as p:
    browser=p.chromium.launch()
    ctx=browser.new_context(viewport={'width':1440,'height':1040}, accept_downloads=True)
    page=ctx.new_page()
    page.on('pageerror',lambda error:errors.append(str(error)))
    page.on('request',lambda req:requests.append(req.url))
    page.on('dialog',lambda dialog:dialog.accept())
    try:
        page.goto('http://127.0.0.1:8080/mf-assets/')
        page.get_by_role('button',name='サンプルで体験する →').wait_for()
        page.screenshot(path=str(OUT/'01-welcome-desktop.png'),full_page=True)
        page.get_by_role('button',name='サンプルで体験する →').click()
        page.get_by_role('heading',name='資産の全体像').wait_for()
        assert '13,200,000' in page.locator('main').inner_text()
        record('demo portfolio sum 13,200,000 JPY')
        page.screenshot(path=str(OUT/'02-dashboard-desktop.png'),full_page=True)
        page.locator('#owner-filter').select_option('妻')
        assert '3,600,000' in page.locator('main').inner_text()
        record('owner-specific assets 3,600,000 JPY')
        page.locator('#owner-filter').select_option('all')
        for view in ['holdings','dividends','forecast','import','consult','settings']:
            page.locator('[data-view="'+view+'"]').click()
            assert '表示できませんでした' not in page.locator('main').inner_text()
            page.screenshot(path=str(OUT/('03-'+view+'-desktop.png')),full_page=True)
        record('all seven screens render without application error')
        page.locator('[data-view="consult"]').click()
        md=page.locator('#consult-output').input_value()
        assert 'サンプル証券' not in md
        assert '名義A' in md and '2026' in md
        with page.expect_download() as event:
            page.locator('[data-action="export-markdown"]').click()
        event.value.save_as(str(OUT/'synthetic-consultation.md'))
        record('anonymized Markdown generated and downloaded')
        page.set_viewport_size({'width':390,'height':844})
        for view in ['dashboard','holdings','dividends','import','consult']:
            page.locator('[data-view="'+view+'"]').click()
            width=page.evaluate('({view:innerWidth,doc:document.documentElement.scrollWidth})')
            assert width['doc']<=width['view']+1, (view,width)
            page.screenshot(path=str(OUT/('04-'+view+'-mobile.png')),full_page=True)
        record('mobile screens have no page-level horizontal overflow')
        page.locator('#exit-demo').click()
        page.set_viewport_size({'width':1440,'height':1040})
        page.locator('[data-view="import"]').click()
        csv='計算対象,日付,内容,金額（円）,保有金融機関,大項目,中項目,メモ,振替,ID\n1,2025/6/1,合成テスト配当,10000,合成テスト口座,収入,配当,,0,T1\n1,2025/6/1,配当の振替,50000,合成テスト口座,収入,配当,,1,T2\n0,2025/6/1,対象外配当,20000,合成テスト口座,収入,配当,,0,T3\n1,2025/6/1,給与,300000,合成テスト口座,収入,給与,,0,T4'
        page.locator('#import-files').set_input_files({'name':'synthetic-mf.csv','mimeType':'text/csv','buffer':csv.encode('utf-8')})
        page.locator('[data-action="commit-import"]').wait_for()
        page.locator('[data-action="commit-import"]').click()
        page.locator('[data-view="dividends"]').click()
        page.locator('#year-filter').select_option('2025')
        assert '10,000' in page.locator('.metric-number').first.inner_text()
        record('real import excludes transfers and uncounted rows')
        page.locator('[data-view="import"]').click()
        page.locator('#import-files').set_input_files({'name':'synthetic-mf.csv','mimeType':'text/csv','buffer':csv.encode('utf-8')})
        page.locator('[data-action="commit-import"]').click()
        page.locator('[data-view="dividends"]').click()
        assert '10,000' in page.locator('.metric-number').first.inner_text()
        record('second import does not double-count identical IDs')
        page.locator('[data-view="settings"]').click()
        page.locator('[data-account="合成テスト口座"]').select_option('妻')
        page.locator('[data-view="dividends"]').click()
        page.locator('#owner-filter').select_option('妻')
        assert '10,000' in page.locator('.metric-number').first.inner_text()
        record('account-owner assignment updates dividend totals')
        page.locator('[data-view="holdings"]').click()
        page.locator('[data-action="add-holding"]').click()
        page.locator('#h-name').fill('合成テスト株')
        page.locator('#h-account').fill('合成テスト口座')
        page.locator('#h-value').fill('100000')
        page.locator('#h-quantity').fill('100')
        page.locator('#h-dps').fill('30')
        page.locator('#h-tax').select_option('NISA')
        page.locator('#h-months').fill('6,12')
        page.locator('[data-save-h]').click()
        assert '3,000' in page.locator('main').inner_text()
        record('manual holdings create expected NISA dividend forecast')
        page.locator('[data-view="settings"]').click()
        page.locator('#persist-toggle').check()
        page.wait_for_function("document.querySelector('#storage-status').textContent==='端末に保存済み'")
        page.reload()
        page.get_by_role('heading',name='資産の全体像').wait_for()
        assert '100,000' in page.locator('main').inner_text()
        record('IndexedDB opt-in restores financial workspace after reload')
        page.locator('[data-view="settings"]').click()
        page.locator('[data-action="backup"]').click()
        page.locator('#backup-password').fill('synthetic-test-password-2026')
        with page.expect_download() as event:
            page.locator('[data-action="backup-encrypted"]').click()
        target=OUT/'synthetic-encrypted.json'
        event.value.save_as(str(target))
        enc=json.loads(target.read_text())
        assert enc['format']=='asset-compass-encrypted/v1'
        assert '合成テスト' not in target.read_text()
        record('encrypted backup contains no cleartext financial data')
        page.locator('#restore-file').set_input_files(str(target))
        page.locator('#restore-password').fill('synthetic-test-password-2026')
        page.locator('[data-action="decrypt-restore"]').click()
        page.get_by_role('heading',name='資産の全体像').wait_for()
        assert '100,000' in page.locator('main').inner_text()
        record('encrypted backup restores successfully')
        page.locator('[data-view="settings"]').click()
        page.locator('#persist-toggle').uncheck()
        page.wait_for_function("document.querySelector('#storage-status').textContent==='今回のみ'")
        page.reload()
        page.get_by_role('button',name='サンプルで体験する →').wait_for()
        record('opting out deletes persisted workspace')
        assert not errors, errors
        external=[u for u in requests if not u.startswith('http://127.0.0.1:8080/') and not u.startswith('data:') and not u.startswith('blob:')]
        assert not external, external
        record('no JavaScript errors or external runtime HTTP requests')
    except Exception as exc:
        page.screenshot(path=str(OUT/'FAILURE.png'),full_page=True)
        (OUT/'failure.txt').write_text(str(exc),encoding='utf-8')
        raise
    finally:
        (OUT/'browser-report.json').write_text(json.dumps({'checks':checks,'errors':errors,'requests':requests},ensure_ascii=False,indent=2),encoding='utf-8')
        browser.close()
