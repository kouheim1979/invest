(()=>{
const LOTS_KEY='kouheim_portfolio_lots_v1';
let LOTS=[],ownerFilter='all',brokerFilter='all',taxFilter='all';
const OWNER_LABEL={OTS:'本人',OKS:'妻',MIK:'MIK',RIN:'RIN'};
const TAX_LABEL={specific:'特定',nisa:'NISA',oldNisa:'旧NISA',juniorNisa:'ジュニアNISA',general:'一般',unknown:'区分未判定'};
const ownerLabel=x=>OWNER_LABEL[x]||x||'—';
const brokerLabel=x=>x==='eSmart'?'eスマート':x==='SBI'?'SBI':x||'—';
const taxLabel=x=>TAX_LABEL[x]||x||'区分未判定';
const isNisa=x=>['nisa','oldNisa','juniorNisa'].includes(x);

function normalizeTax(v){
  const s=String(v??'').trim();
  const low=s.toLowerCase();
  if(!s)return'unknown';
  if(['specific','tokutei','特定','特定口座'].includes(low)||s==='特定')return'specific';
  if(['nisa','growthnisa','growth_nisa','成長nisa','成長投資枠'].includes(low)||s==='NISA'||s==='NISA（成長投資枠）')return'nisa';
  if(['oldnisa','old_nisa','旧nisa'].includes(low)||s==='旧NISA')return'oldNisa';
  if(['juniornisa','junior_nisa','ジュニアnisa'].includes(low)||s==='ジュニアNISA')return'juniorNisa';
  if(['general','一般','一般口座'].includes(low)||s==='一般')return'general';
  return'unknown';
}
const normLot=x=>{
  const shares=Number(x.shares??0),cost=Number(x.cost??0),a=x.amount==null||x.amount===''?NaN:Number(x.amount);
  return{
    symbol:String(x.symbol||x.code||'').trim().toUpperCase(),
    name:String(x.name||'').trim(),
    owner:String(x.owner||'').trim().toUpperCase(),
    broker:String(x.broker||x.account||'').trim(),
    tax:normalizeTax(x.tax??x.taxType??x.taxClass),
    shares,cost,
    amount:Number.isFinite(a)?a:shares*cost
  }
};
const validLot=x=>x.symbol&&x.owner&&x.broker&&Number.isFinite(x.shares)&&x.shares>=0&&Number.isFinite(x.cost)&&x.cost>=0&&Number.isFinite(x.amount);

function loadLots(){
  try{LOTS=(JSON.parse(localStorage.getItem(LOTS_KEY)||'[]')).map(normLot).filter(validLot)}
  catch{LOTS=[]}
}
function saveLots(){LOTS.length?localStorage.setItem(LOTS_KEY,JSON.stringify(LOTS)):localStorage.removeItem(LOTS_KEY)}
function invalidateLots(symbol){const n=LOTS.length;LOTS=LOTS.filter(x=>x.symbol!==symbol);if(LOTS.length!==n)saveLots()}
function taxMatches(x){
  if(taxFilter==='all')return true;
  if(taxFilter==='nisa')return x.tax==='nisa';
  if(taxFilter==='specific')return x.tax==='specific';
  if(taxFilter==='unknown')return x.tax==='unknown';
  return x.tax===taxFilter;
}
function lotMatches(x){
  return(ownerFilter==='all'||x.owner===ownerFilter)&&
    (brokerFilter==='all'||x.broker===brokerFilter)&&taxMatches(x)
}
function activeLots(){return LOTS.filter(lotMatches)}
function aggregate(ls){
  const z={};
  for(const l of ls){
    const x=z[l.symbol]||(z[l.symbol]={symbol:l.symbol,name:l.name||H.find(h=>h.symbol===l.symbol)?.name||'',shares:0,amount:0});
    x.shares+=l.shares;x.amount+=l.amount
  }
  return Object.values(z).filter(x=>x.shares>0).map(x=>({
    symbol:x.symbol,name:x.name,shares:x.shares,cost:x.amount/x.shares,amount:x.amount,
    _i:H.findIndex(h=>h.symbol===x.symbol)
  }))
}
function anyFilter(){return ownerFilter!=='all'||brokerFilter!=='all'||taxFilter!=='all'}
function activeHoldings(){return!anyFilter()?H.map((h,i)=>({...h,_i:i})):aggregate(activeLots())}
function ownerSummary(symbol){
  if(!LOTS.length)return'';
  const a={};
  for(const l of LOTS.filter(x=>x.symbol===symbol))a[l.owner]=(a[l.owner]||0)+l.shares;
  return Object.entries(a).map(([o,n])=>`${ownerLabel(o)} ${nf(n,3)}株`).join(' · ')
}
function taxSummary(symbol){
  if(!LOTS.length)return'';
  const a={nisa:0,oldNisa:0,juniorNisa:0,specific:0,unknown:0,other:0};
  for(const l of LOTS.filter(x=>x.symbol===symbol)){
    if(l.tax==='nisa')a.nisa+=l.shares;
    else if(l.tax==='oldNisa')a.oldNisa+=l.shares;
    else if(l.tax==='juniorNisa')a.juniorNisa+=l.shares;
    else if(l.tax==='specific')a.specific+=l.shares;
    else if(l.tax==='unknown')a.unknown+=l.shares;
    else a.other+=l.shares
  }
  const out=[];
  if(a.nisa)out.push(`NISA ${nf(a.nisa,3)}株`);
  if(a.oldNisa)out.push(`旧NISA ${nf(a.oldNisa,3)}株`);
  if(a.juniorNisa)out.push(`ジュニアNISA ${nf(a.juniorNisa,3)}株`);
  if(a.specific)out.push(`特定 ${nf(a.specific,3)}株`);
  if(a.other)out.push(`一般 ${nf(a.other,3)}株`);
  if(a.unknown)out.push(`区分未判定 ${nf(a.unknown,3)}株`);
  return out.join(' · ')
}

function inject(){
  if(!document.getElementById('accountFilterStyle')){
    const st=document.createElement('style');st.id='accountFilterStyle';st.textContent=`
.account-filters{background:#fff;border:1px solid var(--line);border-radius:12px;padding:10px;margin-bottom:9px}
.filter-row{display:flex;align-items:center;gap:7px;flex-wrap:wrap}.filter-row+.filter-row{margin-top:8px}
.filter-label{font-size:12px;font-weight:850;color:var(--muted);min-width:56px}
.fchip{border:1px solid #d4d9df;background:#f8f9fa;color:#42464b;border-radius:999px;padding:7px 11px;font-size:13px;font-weight:800}
.fchip.on{background:#202124;color:#fff;border-color:#202124}.lot-status{margin-left:auto;font-size:11px;color:var(--muted)}
.ownerline,.taxline{font-size:11px;color:var(--muted);margin-top:3px}.taxline{font-weight:750}
.cost-total{padding:12px;background:#eef4ff;border-radius:10px;font-size:16px}.cost-total b{display:block;font-size:24px;margin-top:4px}.apple-look .cost-total{background:#29292d}.lotbtn{border:0;background:transparent;color:inherit;font:inherit;font-weight:800;padding:0;text-align:right}.lotbtn small{display:block;font-size:10px;color:#174ea6;margin-top:2px}
.lot-table{display:grid;gap:8px;margin-top:12px}.lot-row{display:grid;grid-template-columns:.9fr 1.05fr 1.05fr .65fr .85fr .95fr;gap:7px;align-items:center;border:1px solid var(--line);border-radius:11px;padding:10px}
.lot-row.head{border:0;padding:0 10px;color:var(--muted);font-size:10px}.lot-cell{font-size:12px;font-weight:750}.lot-cell.num{text-align:right;font-variant-numeric:tabular-nums}.lot-owner{font-weight:900}
.taxbadge{display:inline-flex;align-items:center;border-radius:999px;padding:3px 7px;font-size:10px;font-weight:850;background:#eef4ff;color:#174ea6}
.taxbadge.specific{background:#f0f1f2;color:#45484d}.taxbadge.unknown{background:#fff4e5;color:#8a4b00}.taxbadge.oldNisa,.taxbadge.juniorNisa{background:#eaf7ed;color:#137333}
.lot-note{font-size:11px;color:var(--muted);line-height:1.5;margin-top:10px}.junior-account-note{font-size:11px;color:var(--muted);line-height:1.5;margin-top:9px;padding-top:8px;border-top:1px solid var(--line)}
.apple-look .account-filters{background:#111113;border-color:#29292d}.apple-look .fchip{background:#1c1c1e;border-color:#34343a;color:#ddd}.apple-look .fchip.on{background:#f5f5f7;color:#111;border-color:#f5f5f7}.apple-look .lotbtn small{color:#64a8ff}.apple-look .lot-row{border-color:#34343a}.apple-look .modal{background:#1c1c1e;color:#f5f5f7}.apple-look .lot-note{color:#98989f}
@media(max-width:800px){
.account-filters{padding:9px}.filter-label{width:100%;min-width:0}.lot-status{width:100%;margin-left:0}.fchip{font-size:12px;padding:7px 10px}
.lot-row{grid-template-columns:1fr 1fr;gap:7px 9px}.lot-row.head{display:none}.lot-cell.num{text-align:left}
.lot-cell:before{display:block;font-size:9px;color:var(--muted);font-weight:600}
.lot-row .lot-cell:nth-child(1):before{content:'名義'}.lot-row .lot-cell:nth-child(2):before{content:'証券会社'}.lot-row .lot-cell:nth-child(3):before{content:'口座区分'}.lot-row .lot-cell:nth-child(4):before{content:'株数'}.lot-row .lot-cell:nth-child(5):before{content:'取得単価'}.lot-row .lot-cell:nth-child(6):before{content:'取得額'}
}`;document.head.appendChild(st)
  }
  if(!document.getElementById('accountFilters')){
    document.querySelector('.summary')?.insertAdjacentHTML('beforebegin',`
<section class="account-filters" id="accountFilters">
 <div class="filter-row"><div class="filter-label">名義</div>
  <button class="fchip" data-owner="all">全員</button><button class="fchip" data-owner="OTS">本人</button><button class="fchip" data-owner="OKS">妻</button><button class="fchip" data-owner="MIK">MIK</button><button class="fchip" data-owner="RIN">RIN</button>
 </div>
 <div class="filter-row"><div class="filter-label">証券</div>
  <button class="fchip" data-broker="all">全口座</button><button class="fchip" data-broker="SBI">SBI</button><button class="fchip" data-broker="eSmart">eスマート</button>
 </div>
 <div class="filter-row"><div class="filter-label">口座区分</div>
  <button class="fchip" data-tax="all">すべて</button><button class="fchip" data-tax="nisa">NISA</button><button class="fchip" data-tax="oldNisa">旧NISA</button><button class="fchip" data-tax="juniorNisa">ジュニアNISA</button><button class="fchip" data-tax="specific">特定</button><button class="fchip" data-tax="unknown">区分未判定</button>
  <div class="lot-status" id="lotStatus"></div>
 </div>
 <div class="junior-account-note"><b>ジュニアNISA口座：</b> MIK・RIN はSBI証券に口座あり。銘柄ごとの所属が資料で確認できないものは「区分未判定」と表示します。</div>
</section>`)
  }
  if(!document.getElementById('lotBack')){
    document.getElementById('toast')?.insertAdjacentHTML('beforebegin',`
<div class="back" id="lotBack"><div class="modal">
 <h2 id="lotTitle">保有内訳</h2><div class="desc" id="lotDesc"></div><div class="lot-table" id="lotTable"></div>
 <div class="lot-note">NISA・旧NISA・ジュニアNISA・特定を個別に絞り込めます。「区分未判定」は、保有名義や証券会社は分かるものの、銘柄単位の税区分を資料から確定できていない明細です。</div>
 <div class="actions"><button class="save" id="lotClose">閉じる</button></div>
</div></div>`)
  }
  document.querySelectorAll('[data-owner]').forEach(b=>b.onclick=()=>{if(!LOTS.length&&b.dataset.owner!=='all')return toast('口座内訳入りのファイルを読み込んでください');ownerFilter=b.dataset.owner;render()});
  document.querySelectorAll('[data-broker]').forEach(b=>b.onclick=()=>{if(!LOTS.length&&b.dataset.broker!=='all')return toast('口座内訳入りのファイルを読み込んでください');brokerFilter=b.dataset.broker;render()});
  document.querySelectorAll('[data-tax]').forEach(b=>b.onclick=()=>{if(!LOTS.length&&b.dataset.tax!=='all')return toast('NISA/特定入りのファイルを読み込んでください');taxFilter=b.dataset.tax;render()});
  $('#lotClose').onclick=()=>$('#lotBack').classList.remove('on');
  $('#lotBack').onclick=e=>{if(e.target===$('#lotBack'))$('#lotBack').classList.remove('on')}
}
function filterState(){
  document.querySelectorAll('[data-owner]').forEach(b=>b.classList.toggle('on',b.dataset.owner===ownerFilter));
  document.querySelectorAll('[data-broker]').forEach(b=>b.classList.toggle('on',b.dataset.broker===brokerFilter));
  document.querySelectorAll('[data-tax]').forEach(b=>b.classList.toggle('on',b.dataset.tax===taxFilter));
  const st=$('#lotStatus');
  if(st){
    if(!LOTS.length)st.textContent='口座内訳なし（「読込」で追加）';
    else{
      const known=LOTS.filter(x=>x.tax!=='unknown').length;
      st.textContent=`${LOTS.length}明細 · 区分確認済み ${known}/${LOTS.length}`
    }
  }
}
function openLots(symbol){
  let ls=LOTS.filter(x=>x.symbol===symbol&&lotMatches(x));
  if(!ls.length&&anyFilter())ls=LOTS.filter(x=>x.symbol===symbol);
  if(!ls.length){
    const h=activeHoldings().find(x=>x.symbol===symbol);if(!h)return;
    $('#lotTitle').textContent=`${h.name||symbol} の取得額`;
    $('#lotDesc').textContent=`${symbol} · ${nf(h.shares,3)}株`;
    $('#lotTable').innerHTML=`<div class="cost-total">取得額 <b>${yen(m(h).acq)}</b></div><div>取得単価 ${yen(h.cost,2)} × ${nf(h.shares,3)}株</div><div class="lot-note">この端末には名義・口座別の内訳が登録されていません。</div>`;
    $('#lotBack').classList.add('on');return
  }
  const h=H.find(x=>x.symbol===symbol)||ls[0],shares=ls.reduce((s,x)=>s+x.shares,0),amount=ls.reduce((s,x)=>s+x.amount,0);
  $('#lotTitle').textContent=`${h.name||symbol} の保有内訳`;
  $('#lotDesc').textContent=`${symbol} · ${anyFilter()?'表示条件内 ':'全体 '}合計 ${nf(shares,3)}株 · 取得額 ${yen(amount)}`;
  $('#lotTable').innerHTML=`<div class="lot-row head"><div>名義</div><div>証券会社</div><div>口座区分</div><div style="text-align:right">株数</div><div style="text-align:right">取得単価</div><div style="text-align:right">取得額</div></div>`+
    ls.map(l=>`<div class="lot-row"><div class="lot-cell lot-owner">${esc(ownerLabel(l.owner))}</div><div class="lot-cell">${esc(brokerLabel(l.broker))}</div><div class="lot-cell"><span class="taxbadge ${esc(l.tax)}">${esc(taxLabel(l.tax))}</span></div><div class="lot-cell num">${nf(l.shares,3)}株</div><div class="lot-cell num">${yen(l.cost,2)}</div><div class="lot-cell num">${yen(l.amount)}</div></div>`).join('');
  $('#lotBack').classList.add('on')
}
window.openLots=openLots;

getRows=function(){
  let V=activeHoldings(),r=V.map(h=>({h,i:Number.isInteger(h._i)?h._i:H.findIndex(x=>x.symbol===h.symbol),m:m(h)})),q=$('#search').value.trim().toLowerCase();
  if(q)r=r.filter(x=>x.h.symbol.toLowerCase().includes(q)||x.h.name.toLowerCase().includes(q));
  if(mode==='up')r=r.filter(x=>(x.m.d??0)>0);
  if(mode==='down')r=r.filter(x=>(x.m.d??0)<0);
  let s=$('#sort').value;
  r.sort((a,b)=>s==='code'?a.h.symbol.localeCompare(b.h.symbol,'ja',{numeric:true}):s==='name'?a.h.name.localeCompare(b.h.name,'ja'):s==='gain'?(b.m.g??-Infinity)-(a.m.g??-Infinity):s==='day'?(b.m.dp??-Infinity)-(a.m.dp??-Infinity):(b.m.val??-Infinity)-(a.m.val??-Infinity));
  return r
};
summary=function(){
  let V=activeHoldings(),a=V.map(m),cost=a.reduce((s,x)=>s+x.acq,0),k=a.filter(x=>Number.isFinite(x.val)),val=k.reduce((s,x)=>s+x.val,0),g=k.reduce((s,x)=>s+x.g,0),kc=k.reduce((s,x)=>s+x.acq,0),dk=k.filter(x=>Number.isFinite(x.dv)),day=dk.reduce((s,x)=>s+x.dv,0),prev=dk.reduce((s,x)=>s+x.val-x.dv,0);
  $('#sCost').textContent=yen(cost);
  $('#sCount').textContent=`${V.length}銘柄 · ${nf(V.reduce((s,h)=>s+h.shares,0),3)}株${anyFilter()?' · 絞込中':''}`;
  $('#sValue').textContent=k.length?yen(val):'—';$('#sValueSub').textContent=`${k.length}/${V.length}銘柄の株価取得済`;
  $('#sGain').textContent=k.length?ys(g):'—';$('#sGain').className='big '+cl(g);$('#sGainPct').textContent=k.length&&kc?sg(g/kc*100,2,'%'):'—';$('#sGainPct').className='sub '+cl(g);
  $('#sDay').textContent=dk.length?ys(day):'—';$('#sDay').className='big '+cl(day);$('#sDayPct').textContent=dk.length&&prev?sg(day/prev*100,2,'%'):'—';$('#sDayPct').className='sub '+cl(day)
};
render=function(){
  filterState();let r=getRows(),V=activeHoldings();$('#empty').hidden=V.length>0;
  $('#body').innerHTML=r.map(({h,i,m})=>{let os=ownerSummary(h.symbol),ts=taxSummary(h.symbol);return`<tr>
<td><a class="code" target="_blank" rel="noopener" href="https://finance.yahoo.co.jp/quote/${encodeURIComponent(h.symbol)}">${esc(h.symbol)}</a></td>
<td><div class="name"><a target="_blank" rel="noopener" href="https://finance.yahoo.co.jp/quote/${encodeURIComponent(h.symbol)}">${esc(h.name||'—')}</a></div><div class="sub">${m.q?esc(m.q.time||'取得済'):'株価未取得'}</div>${os?`<div class="ownerline">${esc(os)}</div>`:''}${ts?`<div class="taxline">${esc(ts)}</div>`:''}</td>
<td class="price">${m.q?yen(m.q.price,m.q.price<100?2:0):'取得不可'}</td>
<td class="${cl(m.d)}">${sg(m.d,m.q?.price<100?2:0)}<div class="sub ${cl(m.dp)}">${sg(m.dp,2,'%')}</div></td>
<td><button class="lotbtn" onclick="openLots('${esc(h.symbol)}')">${nf(h.shares,3)}株<small>取得額・口座内訳 ›</small></button></td>
<td>${yen(h.cost,2)}</td><td class="acquisition">${yen(m.acq)}</td><td>${yen(m.val)}</td><td class="gain ${cl(m.g)}">${ys(m.g)}<div class="sub ${cl(m.gp)}">${sg(m.gp,2,'%')}</div></td>
<td>${i>=0?`<button class="edit" onclick="openEdit(${i})">編集</button>`:''}</td></tr>`}).join('');
  $('#mobile').innerHTML=r.map(({h,i,m})=>{let os=ownerSummary(h.symbol),ts=taxSummary(h.symbol);return`<div class="mc">
<div class="mtop"><div class="mn"><a target="_blank" rel="noopener" href="https://finance.yahoo.co.jp/quote/${encodeURIComponent(h.symbol)}">${esc(h.name||h.symbol)}</a><div class="mcode">${esc(h.symbol)} · ${m.q?esc(m.q.time||'取得済'):'株価未取得'}</div>${os?`<div class="ownerline">${esc(os)}</div>`:''}${ts?`<div class="taxline">${esc(ts)}</div>`:''}</div><div><div class="mp">${m.q?yen(m.q.price,m.q.price<100?2:0):'—'}</div><div class="mchg ${cl(m.d)}">${sg(m.d,m.q?.price<100?2:0)} (${sg(m.dp,2,'%')})</div></div></div>
<div class="grid"><div><div class="k">保有数</div><button class="lotbtn v" onclick="openLots('${esc(h.symbol)}')">${nf(h.shares,3)}株<small>取得額・口座内訳 ›</small></button></div><div><div class="k">取得単価</div><div class="v">${yen(h.cost,2)}</div></div><div><div class="k">評価額</div><div class="v">${yen(m.val)}</div></div><div><div class="k">取得額</div><div class="v acquisition">${yen(m.acq)}</div></div><div><div class="k">評価損益</div><div class="v ${cl(m.g)}">${ys(m.g)}</div></div><div><div class="k">損益率</div><div class="v ${cl(m.gp)}">${sg(m.gp,2,'%')}</div></div></div>
<div style="text-align:right;margin-top:8px">${i>=0?`<button class="edit" onclick="openEdit(${i})">編集</button>`:''}</div></div>`}).join('');
  summary()
};

const oldImport=doImport;
doImport=function(){
  try{
    const raw=$('#importJson').value.trim(),p=JSON.parse(raw);
    if(!Array.isArray(p)&&Array.isArray(p.lots)){
      const arr=p.holdings;if(!Array.isArray(arr))throw Error('holdings配列がありません');
      const x=arr.map(norm).filter(valid);if(!x.length)throw Error('有効な銘柄がありません');
      if(H.length&&!confirm(`現在の${H.length}銘柄を、読み込んだ${x.length}銘柄で置き換えますか？`))return;
      H=x;const f=H.find(v=>v.symbol==='8267.T');if(f&&f.shares===1680&&Math.abs(f.cost-771.8214285714286)<0.02)f.cost=1296657/1680;
      localStorage.setItem(KEY,JSON.stringify(H));
      LOTS=p.lots.map(normLot).filter(validLot);saveLots();
      ownerFilter=brokerFilter=taxFilter='all';closeImport();render();
      const known=LOTS.filter(x=>x.tax!=='unknown').length;
      toast(`${H.length}銘柄・${LOTS.length}明細を読込（区分確認済み${known}）`);refresh();return
    }
  }catch(e){
    if($('#importJson').value.trim().startsWith('{'))return toast(`JSONを読み込めません: ${e.message||'形式を確認してください'}`)
  }
  if(oldImport()===true){LOTS=[];saveLots();ownerFilter=brokerFilter=taxFilter='all';render()}
};
const baseSave=doSave;
doSave=function(){const old=editing>=0?H[editing]?.symbol:null,sym=String($('#fSymbol').value||'').trim().toUpperCase();if(baseSave()===false)return;if(old)invalidateLots(old);if(sym)invalidateLots(sym);render()};
const baseDel=doDel;
doDel=function(){const sym=editing>=0?H[editing]?.symbol:null;if(baseDel()===false)return;if(sym)invalidateLots(sym);render()};

loadLots();inject();filterState();
$('#importDo').onclick=doImport;$('#save').onclick=doSave;$('#del').onclick=doDel;$('#search').oninput=render;$('#sort').onchange=render;
render();
})();
