(()=>{
let dataPromise, symbol='', period=3, current=[], returnFocus;
const fmt=t=>new Date(t*1000).toLocaleDateString('ja-JP',{timeZone:'Asia/Tokyo'});
function pointsFor(raw,months){
  const unique=new Map();
  for(const row of Array.isArray(raw)?raw:[])if(Array.isArray(row)&&Number.isFinite(row[0])&&row[0]>0&&Number.isFinite(row[1])&&row[1]>0)unique.set(row[0],row[1]);
  const all=[...unique].sort((a,b)=>a[0]-b[0]);
  if(!all.length)return[];
  const cutoff=all.at(-1)[0]-months*31*86400;
  return all.filter(p=>p[0]>=cutoff);
}
function plot(points,cost){
  const prices=points.map(p=>p[1]),lo=Math.min(...prices),hi=Math.max(...prices),pad=Math.max((hi-lo)*.08,hi*.005),min=lo-pad,max=hi+pad;
  const x=i=>58+i/(points.length-1)*620,y=p=>220-(p-min)/(max-min)*190;
  const path=points.map((p,i)=>`${i?'L':'M'}${x(i).toFixed(2)},${y(p[1]).toFixed(2)}`).join(' ');
  let grid='';for(let i=0;i<4;i++){const p=min+(max-min)*i/3;grid+=`<line x1="58" x2="678" y1="${y(p)}" y2="${y(p)}" stroke="currentColor" opacity=".15"/><text x="52" y="${y(p)+4}" text-anchor="end" fill="currentColor" font-size="12">${nf(p,0)}</text>`}
  const baseline=Number.isFinite(cost)&&cost>=min&&cost<=max?`<line x1="58" x2="678" y1="${y(cost)}" y2="${y(cost)}" stroke="#b78103" stroke-dasharray="6 5"/>`:'';
  return `<svg viewBox="0 0 700 265" role="img" aria-label="日足株価チャート。下のスライダーで各日の株価を確認できます">${grid}${baseline}<path d="${path}" fill="none" stroke="#3989ee" stroke-width="3"/><text x="58" y="250" fill="currentColor" font-size="12">${fmt(points[0][0])}</text><text x="678" y="250" text-anchor="end" fill="currentColor" font-size="12">${fmt(points.at(-1)[0])}</text></svg>`;
}
window.PortfolioChart={pointsFor,plot};
document.getElementById('toast').insertAdjacentHTML('beforebegin',`
<div class="back" id="chartBack"><div class="modal chart-modal" role="dialog" aria-modal="true" aria-labelledby="chartTitle">
<h2 id="chartTitle">株価チャート</h2><div class="desc" id="chartInfo"></div>
<div class="chart-periods"><button class="pill" data-months="1">1か月</button><button class="pill" data-months="3">3か月</button><button class="pill" data-months="12">1年</button></div>
<div id="chartPlot" aria-live="polite"></div><div id="chartSelected"></div>
<label id="chartSliderLabel">日付を選択<input id="chartSlider" type="range" min="0" step="1" aria-label="チャートの日付"></label>
<p class="desc" id="chartSource"></p><a id="chartExternal" target="_blank" rel="noopener">Yahoo!ファイナンスで確認</a>
<div class="actions"><button id="chartClose">閉じる</button></div></div></div>`);
const style=document.createElement('style');style.textContent=`.chart-modal{width:min(850px,100%)}.chart-periods{display:flex;gap:8px;margin:14px 0}.chart-periods [aria-pressed=true]{background:var(--b);color:#fff}#chartPlot{min-height:100px}#chartPlot svg{display:block;width:100%;height:auto}#chartSelected{font-weight:800;min-height:28px}#chartSliderLabel[hidden]{display:none!important}#chartSliderLabel{display:block;font-size:12px;color:var(--muted)}#chartSlider{display:block;width:100%;min-height:40px;accent-color:var(--b)}.chart-modal a{color:#3989ee}.chart-btn{margin-right:6px}`;document.head.appendChild(style);
function selectPoint(){const p=current[Number($('#chartSlider').value)];if(p)$('#chartSelected').textContent=`${fmt(p[0])}　${yen(p[1],2)}`}
function draw(data){
  const series=data?.series?.[symbol];current=pointsFor(series?.points,period);
  document.querySelectorAll('[data-months]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.months)===period)));
  $('#chartSliderLabel').hidden=current.length<2;$('#chartSelected').textContent='';
  if(current.length<2){$('#chartPlot').textContent='この銘柄のチャートデータはまだ取得できていません。下のリンクから確認できます。';$('#chartSource').textContent='';return}
  const cost=H.find(h=>h.symbol===symbol)?.cost;
  $('#chartPlot').innerHTML=plot(current,cost);
  $('#chartSlider').max=String(current.length-1);$('#chartSlider').value=String(current.length-1);selectPoint();
  const stale=Date.now()-current.at(-1)[0]*1000>7*86400000;
  $('#chartSource').textContent=`Yahoo Financeの日足（配信中の当日値を含む）・最終日 ${fmt(current.at(-1)[0])}${stale?'・古いデータです':''}。${Number.isFinite(cost)?`平均取得単価 ${yen(cost,2)}（表示範囲内では破線）。`:''}一覧の現在値とは時点が異なる場合があります。`;
}
window.openChart=async function(s){
  if(!/^[0-9A-Z]{4,6}\.[TS]$/.test(s))return;
  returnFocus=document.activeElement;symbol=s;period=3;current=[];
  $('#chartTitle').textContent=`${H.find(h=>h.symbol===s)?.name||s} のチャート`;
  $('#chartInfo').textContent=s;$('#chartExternal').href=`https://finance.yahoo.co.jp/quote/${encodeURIComponent(s)}/chart`;
  $('#chartPlot').textContent='チャートを読み込んでいます…';$('#chartSelected').textContent='';$('#chartSource').textContent='';$('#chartSliderLabel').hidden=true;$('#chartBack').classList.add('on');$('#chartClose').focus();
  if(!dataPromise)dataPromise=quoteJson(`./history.json?ts=${Date.now()}`,12000).catch(e=>{dataPromise=null;throw e});
  try{const data=await dataPromise;if(symbol===s)draw(data)}catch{if(symbol===s)$('#chartPlot').textContent='チャートを取得できませんでした。一度閉じて開き直すか、下のリンクで確認してください。'}
};
function close(){symbol='';$('#chartBack').classList.remove('on');returnFocus?.focus?.()}
$('#chartClose').onclick=close;$('#chartBack').onclick=e=>{if(e.target===$('#chartBack'))close()};
$('#chartSlider').oninput=selectPoint;
document.querySelectorAll('[data-months]').forEach(b=>b.onclick=async()=>{period=Number(b.dataset.months);try{draw(await dataPromise)}catch{}});
document.addEventListener('keydown',e=>{if(e.key==='Escape')close()});
const requested=new URLSearchParams(location.hash.slice(1)).get('chart');if(requested)openChart(requested);
})();
