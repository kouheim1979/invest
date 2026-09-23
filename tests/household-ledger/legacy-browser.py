"""HTTP-only regressions for legacy IndexedDB and conflicting CSV replays. Synthetic data."""
from pathlib import Path
import csv,io,json,threading,http.server
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
legacy=[{'date':'2019-01-18','amt':300000,'desc':'振込','maj':'給与','sub':'未分類','acc':'銀行A','src':'Kakeibon','id':'legacy-salary','include':1,'xfer':0,'dup':'exact'}, {'date':'2019-01-19','amt':-1200,'desc':'食料品','maj':'食費','sub':'食料品','acc':'銀行A','src':'Kakeibon','id':'legacy-food','include':1,'xfer':0}]
H=['計算対象','日付','内容','金額（円）','保有金融機関','大項目','中項目','メモ','振替','ID']
a=[1,'2026/08/01','同じ支払',-1000,'カードA','食費','食料品','',0,'conflict-id']
b=[1,'2026/08/01','同じ支払',-1000,'カードA','日用品','日用品','',0,'conflict-id']
def payload(rows):
 s=io.StringIO();w=csv.writer(s);w.writerow(H);w.writerows(rows)
 return {'name':'fixture.csv','mimeType':'text/csv','buffer':s.getvalue().encode('utf-8-sig')}
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True)
 page=browser.new_page(viewport={'width':390,'height':844},locale='ja-JP')
 page.goto(url);page.wait_for_timeout(350)
 page.evaluate('''rows=>new Promise((resolve,reject)=>{const r=indexedDB.open('household-ledger',1);r.onsuccess=()=>{const d=r.result,tr=d.transaction('d','readwrite');tr.objectStore('d').put(rows,'tx');tr.objectStore('d').delete('bundle-v4');tr.oncomplete=()=>{d.close();resolve();};tr.onerror=()=>reject(tr.error);};r.onerror=()=>reject(r.error);})''',legacy)
 page.reload();page.wait_for_timeout(500)
 check('Legacy tx key restores before import','2件を端末から復元' in page.locator('#status').inner_text())
 summary=page.locator('.period-page').nth(1).inner_text()
 check('Legacy income and expense totals preserved','¥300,000' in summary and '¥1,200' in summary)
 page.locator('[data-page="analysis"]').click()
 check('Legacy salary category included in analysis','1件' in page.locator('#detailCount').inner_text() and '通常給与' in page.locator('#detailList').inner_text())
 page.locator('[data-page="settings"]').click();page.locator('#save').click();page.wait_for_timeout(300)
 stored=page.evaluate('''()=>new Promise((resolve,reject)=>{const r=indexedDB.open('household-ledger',1);r.onsuccess=()=>{let d=r.result,q=d.transaction('d').objectStore('d').get('tx');q.onsuccess=()=>{d.close();resolve(q.result);};q.onerror=()=>reject(q.error);};})''')
 check('Migration does not overwrite original salary category',stored[0]['maj']=='給与' and stored[0]['amt']==300000 and stored[0]['kind']=='income')
 page.locator('#files').set_input_files(payload([a,b]));page.wait_for_timeout(350)
 check('Conflicting versions retained for review','現在4件' in page.locator('#status').inner_text())
 page.locator('[data-page="settings"]').click();page.locator('#files').set_input_files(payload([b]));page.wait_for_timeout(350)
 check('Replay of second conflicting version skipped','現在4件' in page.locator('#status').inner_text() and '再取込1件' in page.locator('#status').inner_text())
 page.reload();page.wait_for_timeout(500)
 check('Replay-safe count survives autosave and reload','4件を端末から復元' in page.locator('#status').inner_text())
 browser.close()
print(json.dumps({'passed':len(checks),'checks':checks}))
