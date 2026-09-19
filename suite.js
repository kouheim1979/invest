/* One app shell; isolated existing engines keep their storage and calculation contracts. */
(()=>{
'use strict';
const S=window.SuiteCore,C=window.DividendCore,$=id=>document.getElementById(id);
const icons={home:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',assets:'<path d="M12 3v9h9A9 9 0 1 1 12 3Z"/><path d="M16 3.8A9 9 0 0 1 20.2 8H16Z"/>',holdings:'<path d="M4 20V10h4v10m4 0V4h4v16m4 0v-7h2v7M2 20h20"/>',dividends:'<rect x="3" y="5" width="18" height="15" rx="3"/><path d="M3 9h18m-5-6v4M8 3v4m1 7 3 3 3-3m-3-3v6"/>',settings:'<path d="M12 3v3m0 12v3M3 12h3m12 0h3M5.6 5.6l2.1 2.1m8.6 8.6 2.1 2.1M5.6 18.4l2.1-2.1m8.6-8.6 2.1-2.1"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',eye:'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',hidden:'<path d="m3 3 18 18M9 5.5c1-.3 2-.5 3-.5 6 0 10 7 10 7a20 20 0 0 1-3.3 3.9M6 6.5A23 23 0 0 0 2 12s4 7 10 7a13 13 0 0 0 5-1.1"/>',chart:'<path d="M3 3v18h18M6 15l4-5 4 3 7-9"/>',import:'<path d="M12 3v12m-4-4 4 4 4-4M4 15v5a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-5"/>',people:'<circle cx="9" cy="8" r="3"/><path d="M3 21v-2a6 6 0 0 1 12 0v2m1-16a3 3 0 0 1 0 6m2 3a5 5 0 0 1 3 5v2"/>',chat:'<path d="M21 11a8 8 0 0 1-8 8H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4zM7 8h10M7 12h7"/>',lock:'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 4v3"/>'};
const svg=name=>'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(icons[name]||icons.home)+'</svg>';
const tabs={home:'ホーム',assets:'資産',holdings:'持ち株',dividends:'配当',settings:'設定'};
const subtabs={assets:{overview:'全体像',purposes:'目的別',holdings:'資産一覧',owners:'名義・口座'},dividends:{history:'10年推移',receipts:'受取記録',csv:'CSV入金',forecast:'配当予測'},settings:{menu:'設定',import:'CSV取込',storage:'保存・バックアップ',consult:'ChatGPT相談'}};
const sources={assets:'mf-assets/index.html?suite=1&v=20260920-2',holdings:'app-v3.html?suite=1',dividends:'dividends-dashboard.html?suite=1',receipts:'dividends.html?mode=receipts&suite=1'};
const states={};let assets=null,stock={value:'—',note:'持ち株未登録'},current=S.route(location.hash),sequence=0,activeKey='',commandDepth=0;
const storage={read(key,fallback){try{return localStorage.getItem(key)??fallback;}catch{return fallback;}},write(key,value){try{localStorage.setItem(key,value);return true;}catch{$('suite-status').textContent='設定を保存できません。この画面を開いている間だけ適用します。';return false;}}};
let privateMode=storage.read('kouheim_suite_privacy_v1','0')==='1',preference=storage.read('kouheim_suite_receipt_source_v1','auto');
if(!['auto','csv','receipts'].includes(preference))preference='auto';
const yen=v=>typeof v==='number'&&Number.isFinite(v)?'¥'+Math.round(v).toLocaleString('ja-JP'):'—';
const text=(id,value)=>{if($(id).textContent!==value)$(id).textContent=value;};
const privateText=(id,value)=>text(id,privateMode?'••••••':value);
let actualRoute='dividends/csv',lastTrend='';
function drawHome(){
 const year=+S.day().slice(0,4),r=S.receipts(storage.read('kouheim_portfolio_dividends_v1',null),C),validAssets=assets?.year===year?assets:null;
 const actual=S.chooseActual(validAssets,r,preference);actualRoute=actual.source==='csv'?'dividends/csv':'dividends/receipts';
 privateText('asset-total',yen(assets?.total));privateText('asset-profit',yen(assets?.profit));$('asset-profit').classList.toggle('negative',!privateMode&&assets?.profit<0);
 text('asset-basis',assets?(assets.total===null?'資産・残高データを取り込んでください':assets.basis+(assets.dates?.length?' · '+assets.dates.at(-1)+'時点':'')):'資産データを読み込んでいます');
 $('demo-label').hidden=!assets?.demo;privateText('stock-total',stock.value);text('stock-note',stock.note);
 text('actual-year',String(year));privateText('actual-total',yen(actual.value));
 text('actual-note',actual.error?'受取記録を読み込めません。元データは変更していません。':(actual.source==='csv'?(assets?.demo?'架空デモのCSV実績':'入出金CSVの受取実績'):'受取記録 · JPY・税引後判明分')+' · '+actual.count+'件'+(actual.missing?' / 金額不明 '+actual.missing+'件':'')+(actual.foreign?' / 外貨 '+actual.foreign+'件は別集計':'')+(actual.value===null?' · 当年の金額未確認':''));
 privateText('forecast-total',yen(assets?.forecast));text('forecast-note','資産管理に登録した数量・配当単価・税区分から算出。'+(assets?.forecastMissing?'単価・数量未設定 '+assets.forecastMissing+'資産。':'設定済みの資産のみ。'));
 drawTrend();
}
function drawTrend(){
 const rows=(assets?.history||[]).filter(r=>Number.isFinite(r.total)).sort((a,b)=>a.date.localeCompare(b.date));
 const signature=JSON.stringify([privateMode,rows]);if(signature===lastTrend)return;lastTrend=signature;
 const target=$('asset-trend');if(!rows.length){target.className='trend-empty';target.innerHTML=svg('chart')+'<h3>資産の変化を、ひと目で。</h3><p>資産推移CSVを取り込むとグラフを表示します。</p><button type="button" class="primary-button" data-route="settings/import">データを取り込む</button>';return;}
 if(privateMode){target.className='trend-empty';target.innerHTML=svg('lock')+'<p>グラフの金額を非表示にしています</p>';return;}
 const lo=Math.min(...rows.map(r=>r.total)),hi=Math.max(...rows.map(r=>r.total)),range=hi-lo||Math.max(hi*.1,1),pad=range*.15;
 const x=i=>18+i*624/Math.max(rows.length-1,1),y=v=>184-(v-lo+pad)/(range+pad*2)*155;
 const points=rows.map((r,i)=>x(i).toFixed(2)+','+y(r.total).toFixed(2)).join(' ');
 target.className='';target.innerHTML='<svg class="trend-svg" viewBox="0 0 660 210" role="img" aria-label="登録された資産残高の推移"><defs><linearGradient id="trend-fill" x1="0" x2="0" y1="0" y2="1"><stop stop-color="#58d6eb" stop-opacity=".2"/><stop offset="1" stop-color="#58d6eb" stop-opacity="0"/></linearGradient></defs><path d="M18 50H642M18 110H642M18 184H642" stroke="#263b4b" stroke-dasharray="4 5"/><polygon points="18,195 '+points+' '+x(rows.length-1)+',195" fill="url(#trend-fill)"/><polyline points="'+points+'" fill="none" stroke="#58d6eb" stroke-width="2.5"/>'+rows.map((r,i)=>'<circle cx="'+x(i)+'" cy="'+y(r.total)+'" r="3" fill="#80e6b8"/>').join('')+'</svg><div class="trend-labels"><span></span><span></span></div>';
 target.querySelector('.trend-labels span').textContent=rows[0].date+' · '+yen(rows[0].total);target.querySelector('.trend-labels span:last-child').textContent=rows.at(-1).date+' · '+yen(rows.at(-1).total);
}
function privacy(){
 document.body.classList.toggle('privacy-on',privateMode);$('privacy').innerHTML=svg(privateMode?'hidden':'eye');$('privacy').setAttribute('aria-label',privateMode?'金額を表示':'金額を隠す');$('privacy').setAttribute('aria-pressed',String(privateMode));
 for(const [key,s]of Object.entries(states)){const invisible=privateMode||key!==activeKey;s.frame.setAttribute('aria-hidden',String(invisible));s.frame.inert=invisible;}
 $('privacy-guard').hidden=!privateMode||!activeKey;drawHome();
}
function togglePrivacy(){privateMode=!privateMode;storage.write('kouheim_suite_privacy_v1',privateMode?'1':'0');privacy();}
function navigate(hash){if(location.hash==='#'+hash)showRoute();else location.hash=hash;}
function readStocks(doc){stock={value:doc.getElementById('sValue')?.textContent||'—',note:'表示中の絞り込み条件 · '+(doc.getElementById('sValueSub')?.textContent||'株価未取得')};drawHome();}
function intercept(key,doc){
 const style=doc.createElement('link');style.rel='stylesheet';style.href=new URL('suite-embedded.css?v=20260917-1',location.href).href;doc.head.appendChild(style);doc.body.classList.add('suite-embedded','suite-'+key);
 doc.addEventListener('click',e=>{
 if(commandDepth)return;const b=e.target.closest('button,a');if(!b)return;
 if(key==='assets'&&(b.dataset.go||b.dataset.view)){
 const view=b.dataset.go||b.dataset.view,map={dashboard:'assets/overview',purposes:'assets/purposes',holdings:'assets/holdings',settings:'assets/owners',dividends:'dividends/csv',forecast:'dividends/forecast',import:'settings/import',consult:'settings/consult'};
 if(map[view]){e.preventDefault();e.stopImmediatePropagation();navigate(map[view]);return;}
 }
 if(b.tagName!=='A'||b.hasAttribute('download')||!b.getAttribute('href')||b.getAttribute('href').startsWith('#'))return;
 const u=new URL(b.href,doc.baseURI);if(!['http:','https:'].includes(u.protocol))return;
 const file=u.pathname.split('/').pop(),map={'app-v3.html':'holdings','dividends-dashboard.html':'dividends/history','dividends-sheet.html':'dividends/history','dividends.html':'dividends/receipts','unified.html':'home'};
 if(u.origin===location.origin&&map[file]){
 if(u.searchParams.has('symbol')){b.target='_blank';b.rel='noopener noreferrer';return;}
 e.preventDefault();e.stopImmediatePropagation();navigate(map[file]);
 }else{b.target='_blank';b.rel='noopener noreferrer';}
 },true);
 if(key==='holdings'){
 let queued=false;const observer=new MutationObserver(()=>{if(!queued){queued=true;requestAnimationFrame(()=>{queued=false;readStocks(doc);});}});const root=doc.querySelector('.summary');if(root)observer.observe(root,{subtree:true,childList:true,characterData:true});readStocks(doc);
 }
}
function ensureFrame(key){
 if(states[key])return states[key].ready;
 const frame=document.createElement('iframe');frame.title=({assets:'資産管理',holdings:'持ち株一覧',dividends:'10年配当ダッシュボード',receipts:'受取配当記録'})[key];frame.id='frame-'+key;frame.hidden=true;frame.setAttribute('aria-hidden','true');frame.inert=true;
 const entry={frame,ready:null,error:false,assetView:''};states[key]=entry;
 entry.ready=new Promise((resolve,reject)=>{
 const timer=setTimeout(()=>{entry.error=true;reject(Error('読み込み時間を超えました'));},20000);
 frame.addEventListener('load',async()=>{try{
 const doc=frame.contentDocument;if(!doc||doc.location.origin!==location.origin)throw Error('画面に接続できません');
 const selector=({assets:'#main',holdings:'#sValue',dividends:'#sheetBody',receipts:'#receiptsPanel'})[key];
 if(!doc.querySelector(selector))throw Error('必要な画面を読み込めません');
 intercept(key,doc);
 if(key==='assets'){for(let i=0;i<100&&doc.querySelector('#main .loading');i++)await new Promise(r=>setTimeout(r,50));if(doc.querySelector('#main .loading'))throw Error('資産データを読み込めません');}
 clearTimeout(timer);entry.error=false;resolve(entry);
 }catch(error){clearTimeout(timer);entry.error=true;reject(error);}});
 frame.src=sources[key];$('frames').appendChild(frame);
 });entry.ready.catch(()=>{});return entry.ready;
}
async function showRoute(){
 const token=++sequence;current=S.route(location.hash);const {tab,sub}=current;
 document.title='資産コンパス | '+tabs[tab];text('screen-title',tabs[tab]);text('screen-kicker',({home:'YOUR ASSET WORKSPACE',assets:'ASSET OVERVIEW',holdings:'YOUR STOCKS',dividends:'DIVIDEND TRACKER',settings:'WORKSPACE SETTINGS'})[tab]);
 for(const b of $('bottom-nav').querySelectorAll('button')){if(b.dataset.tab===tab)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');}
 const subs=subtabs[tab];$('subnav').hidden=!subs;$('subnav').innerHTML=subs?Object.entries(subs).map(([s,l])=>'<button type="button" data-route="'+tab+'/'+s+'"'+(sub===s?' aria-current="page"':'')+'>'+l+'</button>').join(''):'';
 const native=tab==='home'||tab==='settings'&&sub==='menu';$('native-scroll').hidden=!native;$('home-screen').hidden=tab!=='home';$('settings-screen').hidden=tab!=='settings';$('engine-area').hidden=native;
 let key='',view='';if(!native){if(tab==='holdings')key='holdings';else if(tab==='dividends'&&sub==='history')key='dividends';else if(tab==='dividends'&&sub==='receipts')key='receipts';else{key='assets';view=({assets:{overview:'dashboard',purposes:'purposes',holdings:'holdings',owners:'settings'},dividends:{csv:'dividends',forecast:'forecast'},settings:{import:'import',storage:'settings',consult:'consult'}})[tab]?.[sub]||'dashboard';}}
 activeKey=key;for(const [k,s]of Object.entries(states))s.frame.hidden=k!==key;
 $('engine-error').hidden=true;$('engine-loading').hidden=native;privacy();
 if(native){drawHome();return;}
 try{
 const entry=await ensureFrame(key);if(token!==sequence)return;entry.frame.hidden=false;
 if(key==='assets'&&entry.assetView!==view){const button=entry.frame.contentDocument.querySelector('[data-view="'+view+'"]');if(!button)throw Error('画面切替を利用できません');commandDepth++;try{button.click();entry.assetView=view;}finally{commandDepth--;}}
 $('engine-loading').hidden=true;privacy();
 }catch(error){if(token!==sequence)return;$('engine-loading').hidden=true;$('engine-error').hidden=false;$('engine-direct').href=sources[key];$('suite-status').textContent=error.message;}
}
for(const node of document.querySelectorAll('[data-icon]'))node.innerHTML=svg(node.dataset.icon);
$('bottom-nav').innerHTML=Object.entries(tabs).map(([tab,label])=>'<button type="button" data-tab="'+tab+'" data-route="'+tab+'">'+svg(tab)+'<span>'+label+'</span></button>').join('');
$('bottom-nav').addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;const buttons=[...$('bottom-nav').querySelectorAll('button')],at=buttons.indexOf(document.activeElement);if(at<0)return;e.preventDefault();const next=e.key==='Home'?0:e.key==='End'?buttons.length-1:(at+(e.key==='ArrowRight'?1:-1)+buttons.length)%buttons.length;buttons[next].focus();});
$('privacy').onclick=$('settings-privacy').onclick=togglePrivacy;$('guard-show').onclick=()=>{if(privateMode)togglePrivacy();};$('actual-open').onclick=()=>navigate(actualRoute);
$('receipt-source').value=preference;$('receipt-source').onchange=e=>{preference=e.target.value;storage.write('kouheim_suite_receipt_source_v1',preference);drawHome();};
$('engine-retry').onclick=()=>{const key=activeKey;if(!key)return;states[key]?.frame.remove();delete states[key];showRoute();};
text('today',new Date().toLocaleDateString('ja-JP',{timeZone:'Asia/Tokyo',month:'long',day:'numeric',weekday:'short'}));
window.addEventListener('message',e=>{if(e.origin!==location.origin||e.source!==states.assets?.frame.contentWindow||e.data?.type!=='portfolio-suite:assets'||e.data.version!==1)return;const p=e.data.payload;if(!p||!Array.isArray(p.history)||typeof p.holdingsCount!=='number')return;assets=p;drawHome();});
window.addEventListener('hashchange',showRoute);window.addEventListener('storage',e=>{if(e.key==='kouheim_suite_privacy_v1'){privateMode=e.newValue==='1';privacy();}if(e.key==='kouheim_portfolio_dividends_v1')drawHome();});window.addEventListener('focus',drawHome);
document.addEventListener('click',async e=>{const b=e.target.closest('[data-route],[data-command]');if(!b)return;if(b.dataset.route)navigate(b.dataset.route);else if(b.dataset.command==='holdings-import'){navigate('holdings');try{const entry=await ensureFrame('holdings');entry.frame.contentDocument.getElementById('import')?.click();}catch{}}});
privacy();showRoute();
// Warm the two summary engines once; switching screens never reloads a form.
ensureFrame('assets').catch(()=>{text('asset-basis','資産画面を読み込めません。資産タブから再試行してください。');});ensureFrame('holdings').catch(()=>{stock.note='持ち株画面を読み込めません';drawHome();});
})();
