"""Synthetic layout, startup and privacy regressions for the Pattern C shell."""
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

OUT = Path('mf-assets/test-results')
OUT.mkdir(parents=True, exist_ok=True)
checks = []
errors = []


def assert_screen(page, view, title):
    expect(page.locator('#breadcrumb')).to_have_text(title)
    expect(page.locator(f'#nav [data-view="{view}"]')).to_have_attribute('aria-current', 'page')
    expect(page.locator('#main > .loading')).to_have_count(0)
    expect(page.locator('#main .callout.error')).to_have_count(0)
    assert not errors, errors


def assert_owner_values(page):
    # Compare every copied amount with the original owner table, including zero.
    source = page.locator('.dashboard-source-table tbody tr')
    source.first.wait_for(state='attached')
    rows = page.locator('.owner-visual-row')
    expect(rows).to_have_count(source.count())
    assert rows.count() > 0
    for index in range(rows.count()):
        cells = source.nth(index).locator('td')
        row = rows.nth(index)
        expect(row.locator('.owner-visual-top strong')).to_have_text(cells.nth(0).locator('strong').inner_text())
        expect(row.locator('.owner-visual-top > span')).to_have_text(cells.nth(1).text_content().strip())
        expect(row.locator('.owner-visual-meta > span').nth(0)).to_have_text('配当実績 ' + cells.nth(2).text_content().strip())
        expect(row.locator('.owner-visual-meta > span').nth(1)).to_have_text('年間予測 ' + cells.nth(3).text_content().strip())


def assert_amount_privacy(locator, hidden):
    # Inspect the effective CSS on numeric text, so a missing wrapper or a
    # wrapper with no masking style both fail. Labels and owner names are excluded.
    amounts = locator.evaluate_all(r"""roots => roots.flatMap(root => {
        const values = [];
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        let node;
        while ((node = walker.nextNode())) {
            if (!/\d/.test(node.textContent)) continue;
            let blurred = false;
            for (let el = node.parentElement; el; el = el.parentElement) {
                const blur = getComputedStyle(el).filter.match(/blur\(([\d.]+)px\)/);
                if (blur && Number(blur[1]) > 0) blurred = true;
            }
            values.push({text: node.textContent.trim(), blurred});
        }
        return values;
    })""")
    assert amounts, 'No numeric amounts were checked'
    assert all(item['blurred'] == hidden for item in amounts), amounts


with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH'))
    ctx = browser.new_context(viewport={'width': 1440, 'height': 1000})
    page = ctx.new_page()
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.on('console', lambda msg: errors.append(msg.text) if msg.type == 'error' else None)
    try:
        page.goto('http://127.0.0.1:8080/mf-assets/')
        expect(page.locator('#breadcrumb')).to_have_count(1)
        page.get_by_role('button', name='サンプルで体験する →').wait_for()
        assert_screen(page, 'dashboard', 'ダッシュボード')
        page.locator('[data-view="import"]').click()
        assert_screen(page, 'import', 'データを取り込む')
        expect(page.locator('#import-files')).to_be_visible()
        page.locator('[data-view="dashboard"]').click()
        assert_screen(page, 'dashboard', 'ダッシュボード')
        checks.append('cold startup and empty-state navigation preserve the breadcrumb render target')

        page.get_by_role('button', name='サンプルで体験する →').click()
        page.locator('.dashboard-v3').wait_for()
        assert_screen(page, 'dashboard', 'ダッシュボード')
        expect(page.get_by_role('heading', name='資産の全体像')).to_be_visible()
        expect(page.locator('.dashboard-v3-metrics .metric')).to_have_count(4)
        expect(page.locator('.dashboard-v3-main > .panel')).to_have_count(2)
        expect(page.locator('.dashboard-v3-secondary > .panel')).to_have_count(2)
        expect(page.locator('.dashboard-v3-bottom > .panel')).to_have_count(3)
        assert 'おかえりなさい' not in page.locator('main').inner_text()
        expect(page.locator('.sidebar-bottom small')).to_have_text('非公式補助アプリ · v1.1.0')
        assert_owner_values(page)
        visual_amounts = page.locator('.owner-visual-top > span, .owner-visual-meta')
        assert_amount_privacy(visual_amounts, False)
        checks.append('desktop dashboard retains its layout and exact owner asset/dividend values')
        page.screenshot(path=str(OUT / 'layout-v110-desktop.png'), full_page=True)

        page.get_by_role('button', name='金額を隠す', exact=True).click()
        expect(page.locator('#privacy-toggle')).to_have_attribute('aria-label', '金額を表示')
        assert_amount_privacy(visual_amounts, True)
        assert_owner_values(page)
        page.screenshot(path=str(OUT / 'layout-private-desktop.png'), full_page=True)
        page.get_by_role('button', name='金額を表示', exact=True).click()
        assert_amount_privacy(visual_amounts, False)
        assert_owner_values(page)
        checks.append('privacy toggle masks and restores all copied owner amounts without changing values')

        page.get_by_role('button', name='金額を隠す', exact=True).click()
        page.locator('#owner-filter').select_option('妻')
        assert_owner_values(page)
        assert_amount_privacy(visual_amounts, True)
        previous_year = page.locator('#year-filter option').last.get_attribute('value')
        page.locator('#year-filter').select_option(previous_year)
        assert_owner_values(page)
        assert_amount_privacy(visual_amounts, True)
        checks.append('owner and year filter rerenders keep copied dividend amounts private')

        for view, title in [
            ('holdings', 'ポートフォリオ'),
            ('dividends', '配当・入金'),
            ('forecast', '将来シミュレーション'),
            ('import', 'データを取り込む'),
            ('consult', 'ChatGPTに相談'),
            ('settings', '名義・保存設定'),
            ('dashboard', 'ダッシュボード'),
        ]:
            page.locator(f'[data-view="{view}"]').click()
            assert_screen(page, view, title)
        assert_owner_values(page)
        assert_amount_privacy(visual_amounts, True)
        page.locator('#owner-filter').select_option('all')
        assert_owner_values(page)
        assert_amount_privacy(visual_amounts, True)
        checks.append('all seven views navigate without errors and returning to dashboard preserves privacy')

        page.set_viewport_size({'width': 390, 'height': 844})
        expect(page.locator('.owner-visual-v3')).to_be_hidden()
        expect(page.locator('.dashboard-source-table')).to_be_visible()
        table_amounts = page.locator('.dashboard-source-table td:nth-child(2), .dashboard-source-table td:nth-child(3), .dashboard-source-table td:nth-child(4)')
        assert_amount_privacy(table_amounts, True)
        widths = page.evaluate('({inner:innerWidth,total:document.documentElement.scrollWidth})')
        assert widths['total'] <= widths['inner'] + 1, widths
        expect(page.locator('.dashboard-v3-main > .panel')).to_have_count(2)
        page.screenshot(path=str(OUT / 'layout-private-mobile.png'), full_page=True)
        page.get_by_role('button', name='金額を表示', exact=True).click()
        assert_amount_privacy(table_amounts, False)
        page.screenshot(path=str(OUT / 'layout-v110-mobile.png'), full_page=True)
        page.set_viewport_size({'width': 1440, 'height': 1000})
        assert_owner_values(page)
        assert_amount_privacy(visual_amounts, False)
        checks.append('mobile owner table and desktop cards share privacy state without horizontal overflow')
        assert not errors, errors
    finally:
        (OUT / 'layout-browser-report.json').write_text(json.dumps({'checks': checks, 'errors': errors}, ensure_ascii=False, indent=2), encoding='utf-8')
        browser.close()
print(json.dumps(checks, ensure_ascii=False, indent=2))
