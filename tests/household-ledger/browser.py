"""Browser regressions. Default: local HTTP/real IndexedDB. --offline: no network, storage tests skipped.
Synthetic data only. Optional --private-csv is never committed as a fixture.
"""
from pathlib import Path
import argparse,csv,io,json,os,threading,time,http.server
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[2]
parser=argparse.ArgumentParser();parser.add_argument('--offline',action='store_true');parser.add_argument('--private-csv');args=parser.parse_args()
H=['計算対象','日付','内容','金額（円）','保有金融機関','大項目','中項目','メモ','振替','ID']
rows=[
[1,'2019/01/18','給与',300000,'銀行A','収入','給与','',0,'salary-old'],
[1,'2019/12/05','給与',500000,'銀行A','収入','給与','',0,'bonus-old'],
[1,'2026/07/20','食料品',-1000,'銀行A','食費','食料品','',0,'july'],
[1,'2026/08/25','給与',400000,'銀行A','収入','給与','',0,'salary'],
[1,'2026/08/10','賞与',600000,'銀行A','収入','賞与','',0,'bonus'],
[1,'2026/08/22','びっくりドンキー北店',-3600,'カードA','食費','外食','',0,'food-1'],
[1,'2026/08/22','びっくりドンキー南店',-1200,'カードA','食費','外食','',0,'food-2'],
[1,'2026/08/23','パルシステム宅配利用代',-15000,'カードA','食費','夜ご飯','',0,'groceries'],
[1,'2026/08/11','ガスト',-3000,'カードA','食費','外食','',0,'holiday'],
[1,'2026/08/12','会社懇親会',-10000,'カードA','交際費','飲み会','',0,'party'],
[1,'2026/08/13','WAONチャージ',-20000,'カードA','食費','外食','',0,'charge'],
[1,'2026/08/14','学習塾',-50000,'銀行A','教養・教育','塾','',0,'school'],
[0,'2026/08/14','集計対象外',-999,'銀行A','日用品','日用品','',0,'exclude'],
[1,'2026/08/15','資金移動',-100000,'銀行A','その他','その他','',1,'transfer'],
[1,'2026/08/25','給与',400000,'銀行B','収入','給与','',0,'salary-b'],
[1,'2026/08/26','返金',300,'カードA','食費','食料品','',0,'refund'],
]
s=io.StringIO();w=csv.writer(s);w.writerow(H);w.writerows(rows);fixture=s.getvalue().encode('utf-8-sig')
checks=[]
def check(name,condition):
 assert condition,name
 checks.append(name);print('PASS',name,flush=True)
if not args.offline:
 handler=lambda *a,**kw:http.server.SimpleHTTPRequestHandler(*a,directory=str(ROOT),**kw)
 server=http.server.ThreadingHTTPServer(('127.0.0.1',0),handler)
 threading.Thread(target=server.serve_forever,daemon=True).start()
 url=f'http://127.0.0.1:{server.server_port}/household-ledger/'
html=(ROOT/'household-ledger/index.html').read_text().replace('<link rel="stylesheet" href="style.css?v=04">','<style>'+(ROOT/'household-ledger/style.css').read_text()+'</style>').replace('<script defer src="core.js?v=04"></script>','').replace('<script defer src="app.js?v=04"></script>','')
html=html.replace('</body>','<script>'+(ROOT/'household-ledger/core.js').read_text()+'</script><script>'+(ROOT/'household-ledger/app.js').read_text()+'</script></body>')
with sync_playwright() as p:
 exe=os.environ.get('CHROMIUM_PATH') or ('/usr/bin/chromium' if args.offline else None)
 b=p.chromium.launch(executable_path=exe,headless=True,args=['--no-sandbox'])
 ctx=b.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,locale='ja-JP',accept_downloads=True)
 page=ctx.new_page();errors=[];requests=[]
 page.on('pageerror',lambda e:errors.append(str(e)));ctx.on('request',lambda r:requests.append(r.url))
 if args.offline:page.set_content(html)
 else:page.goto(url)
 page.wait_for_timeout(250)
 check('Empty state and restore available',page.locator('#firstRestore').is_visible())
 page.locator('#firstFile').set_input_files({'name':'synthetic.csv','mimeType':'text/csv','buffer':fixture});page.wait_for_timeout(400)
 check('Imported synthetic CSV', '16件' in page.locator('#status').inner_text())
 check('Latest month selected','2026-08'==page.locator('#dateJump').input_value())
 check('Phone has no horizontal page overflow',page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
 check('Only three period panels',page.locator('.period-page').count()==3)
 check('Summary and detail record count agree', '11件' in page.locator('#detailCount').inner_text())
 page.locator('#recordFilter').select_option('all')
 check('All records filter includes original excluded and transfer','13件' in page.locator('#detailCount').inner_text())
 page.locator('#recordFilter').select_option('active')
 page.locator('#prev').click();page.wait_for_timeout(350)
 check('Previous month updates details','2026-07'==page.locator('#dateJump').input_value() and '1件'==page.locator('#detailCount').inner_text())
 page.locator('#next').click();page.wait_for_timeout(350)
 cdp=ctx.new_cdp_session(page)
 def swipe(direction):
  box=page.locator('#periodPager').bounding_box();y=min(630,box['y']+155)
  start=box['x']+box['width']*(.8 if direction=='left' else .2)
  end=box['x']+box['width']*(.2 if direction=='left' else .8)
  cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':start,'y':y}]})
  for i in range(1,9):
   cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':start+(end-start)*i/8,'y':y}]})
   page.wait_for_timeout(20)
  cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});page.wait_for_timeout(700)
 swipe('left')
 check('Native touch swipe updates month','2026-09'==page.locator('#dateJump').input_value())
 check('Missing month uses no-records not fake zero','記録なし' in page.locator('.period-page').nth(1).inner_text() and '—' in page.locator('.period-page').nth(1).inner_text())
 for _ in range(4):swipe('left')
 check('Continuous swipes cross year without adding panels','2027-01'==page.locator('#dateJump').input_value() and page.locator('.period-page').count()==3)
 swipe('right');check('Reverse swipe works','2026-12'==page.locator('#dateJump').input_value())
 page.locator('#dateJump').fill('2026-08');page.locator('#dateJump').dispatch_event('change');page.wait_for_timeout(250)
 page.locator('button[data-page="analysis"]').click();page.wait_for_timeout(200)
 check('Salary includes both bank deposits without false dedup','3件' in page.locator('#detailCount').inner_text())
 page.locator('[data-section="food"]').click();page.wait_for_timeout(200)
 check('Food excludes parties and recharge, includes refund','5件' in page.locator('#detailCount').inner_text() and '¥22,500' in page.locator('#detailTotals').inner_text())
 page.locator('#insights [data-group="食料品"]').click();page.wait_for_timeout(150)
 check('Category tap filters lower details','2件' in page.locator('#detailCount').inner_text() and '食料品' in page.locator('#scopeLabel').inner_text())
 page.locator('#clearDrill').click();page.locator('[data-section="education"]').click()
 check('Education view','1件' in page.locator('#detailCount').inner_text() and '学習塾' in page.locator('#detailList').inner_text())
 page.locator('[data-section="merchants"]').click();page.wait_for_timeout(250)
 page.locator('#insights [data-merchant="びっくりドンキー"]').first.click();page.wait_for_timeout(200)
 check('Merchant alias groups branches, lower rows match','2件' in page.locator('#detailCount').inner_text())
 check('Yearly merchant counts use days and records', '1日' in page.locator('#insights').inner_text() and '2件' in page.locator('#insights').inner_text())
 page.locator('[data-section="weekends"]').click();page.wait_for_timeout(200)
 check('Weekend and holiday exclusive buckets','土曜日（祝日以外）' in page.locator('#insights').inner_text() and '祝日・振替休日' in page.locator('#insights').inner_text())
 page.locator('button[data-page="home"]').click();page.locator('[data-section="calendar"]').click();page.locator('[data-day="2026-08-22"]').click()
 check('Calendar tap filters lower detail list','2件' in page.locator('#detailCount').inner_text())
 page.locator('button[data-page="analysis"]').click();page.wait_for_timeout(200)
 page.locator('.transaction').first.click();page.locator('#salaryOverride').select_option('bonus');page.locator('#editSave').click()
 check('Per-transaction salary override works','賞与（指定・記録）' in page.locator('.transaction').first.inner_text())
 page.locator('button[data-page="settings"]').click();page.locator('#legacyDay').fill('21');page.locator('#applySettings').click()
 with page.expect_download() as info:page.locator('#backup').click()
 backup_path=info.value.path();backup=json.loads(Path(backup_path).read_text())
 check('JSON backup contains settings and originals',backup['options']['legacyDay']==21 and len(backup['tx'])==16 and any(t['include']==0 for t in backup['tx']))
 with page.expect_download() as info:page.locator('#export').click()
 out=Path(info.value.path()).read_text(encoding='utf-8-sig');check('CSV export preserves all 16 records',len(list(csv.DictReader(io.StringIO(out))))==16)
 # Restore the original override so a repeated file is an exact replay.
 page.locator('button[data-page="analysis"]').click();page.wait_for_timeout(200);page.locator('.transaction').first.click();page.locator('#salaryOverride').select_option('');page.locator('#editSave').click()
 page.locator('button[data-page="settings"]').click();page.locator('#files').set_input_files({'name':'synthetic.csv','mimeType':'text/csv','buffer':fixture});page.wait_for_timeout(300)
 check('Repeated import does not increase record count','現在16件' in page.locator('#status').inner_text())
 old=page.locator('#detailCount').inner_text();page.locator('button[data-page="settings"]').click()
 bad=(H[0]+',not-csv\n1,wrong').encode()
 page.locator('#files').set_input_files({'name':'bad.csv','mimeType':'text/csv','buffer':bad});page.wait_for_timeout(150)
 check('Invalid import is rejected atomically','取込を中止' in page.locator('#status').inner_text())
 if not args.offline:
  page.locator('#save').click();page.wait_for_timeout(350)
  check('IndexedDB save transaction completes','端末に保存しました' in page.locator('#status').inner_text())
  page.reload();page.wait_for_timeout(550)
  check('Automatic restore works before any import','16件を端末から復元' in page.locator('#status').inner_text())
  page.locator('button[data-page="settings"]').click()
  check('Settings survived browser reload','21'==page.locator('#legacyDay').input_value())
 else:print('SKIP real IndexedDB persistence: opaque offline origin',flush=True)
 page.locator('button[data-page="assets"]').click();check('Existing asset routes preserved',page.locator('#assetLinks a').count()==3)
 page.locator('button[data-page="home"]').click();page.locator('#dateJump').fill('2019-12');page.locator('#dateJump').dispatch_event('change');page.locator('#yearMode').click();page.wait_for_timeout(300)
 check('Annual mode includes all year records','2件' in page.locator('#detailCount').inner_text() and page.locator('#dateJump').input_value()=='2019')
 page.locator('#next').click();page.wait_for_timeout(300);check('Annual next does not jump over missing years',page.locator('#dateJump').input_value()=='2020' and '記録なし' in page.locator('.period-page').nth(1).inner_text())
 page.locator('#monthMode').click();page.locator('#dateJump').fill('2026-08');page.locator('#dateJump').dispatch_event('change');page.wait_for_timeout(350)
 page.screenshot(path=str(ROOT/'preview-mobile.png'))
 page.set_viewport_size({'width':1280,'height':920});page.wait_for_timeout(350)
 check('Desktop has no page overflow',page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
 page.screenshot(path=str(ROOT/'preview-desktop.png'))
 # Unlimited detail paging beyond the former 1,000-row cap.
 ss=io.StringIO();ww=csv.writer(ss);ww.writerow(H)
 for i in range(1205):ww.writerow([1,'2026/06/15','テスト明細'+str(i),-1,'銀行A','日用品','日用品','',0,'long-'+str(i)])
 page.locator('button[data-page="settings"]').click();page.locator('#files').set_input_files({'name':'many.csv','mimeType':'text/csv','buffer':ss.getvalue().encode()});page.wait_for_timeout(350)
 page.locator('#dateJump').fill('2026-06');page.locator('#dateJump').dispatch_event('change');page.wait_for_timeout(250)
 loops=0
 while page.locator('#more').is_visible() and loops<20:
  page.locator('#more').click(force=True);page.wait_for_timeout(50);loops+=1
 check('More than 1,000 details can all be viewed',page.locator('.transaction').count()==1205)
 check('No runtime JavaScript errors',not errors)
 check('No external data requests',not any(not u.startswith('http://127.0.0.1:') for u in requests))
 if args.private_csv:
  c= b.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,locale='ja-JP');pg=c.new_page()
  if args.offline:pg.set_content(html)
  else:pg.goto(url)
  pg.wait_for_timeout(200);pg.locator('#firstFile').set_input_files(args.private_csv);pg.wait_for_timeout(600)
  count=sum(1 for _ in csv.DictReader(open(args.private_csv,encoding='utf-8-sig')))
  check('Private full-size CSV imports without truncation',f'{count:,}件' in pg.locator('#status').inner_text())
  pg.locator('#prev').click();pg.wait_for_timeout(250)
  check('Private full-size CSV can navigate and render details',int(pg.locator('#detailCount').inner_text().replace(',','').replace('件',''))>0)
  c.close()
 b.close()
print(json.dumps({'passed':len(checks),'offline':args.offline,'checks':checks},ensure_ascii=False))
