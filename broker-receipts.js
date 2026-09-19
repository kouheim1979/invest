/* No network requests. Imported financial data stays in this browser's storage. */
(()=>{
'use strict';
const C=window.BrokerReceipts,$=id=>document.getElementById(id),yen=v=>'¥'+v.toLocaleString('ja-JP');
let envelope={current:null,previous:null},pending=null,storageError=false;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function status(message,error=false){$('status').textContent=message;$('status').classList.toggle('error',error);}
const coverageLabel={full:'確認済み',partial:'一部確認',unknown:'未確認'};
const value=(r,key)=>r.coverage==='unknown'?'—':yen(r[key]);
function render(){
 const p=envelope.current;$('empty').hidden=!!p;$('report').hidden=!p;$('export').disabled=!p;$('undo').disabled=!envelope.previous||storageError;
 if(!p){$('transfer').open=true;return;}
 const accounts=[...new Set(p.documents.map(d=>d.account))],selected=$('account').value;
 $('account').innerHTML='<option value="">登録済み口座すべて</option>'+accounts.map(a=>'<option>'+esc(a)+'</option>').join('');if(accounts.includes(selected))$('account').value=selected;
 const account=$('account').value,years=C.years(p,account),oldYear=$('year').value;
 $('year').innerHTML=years.slice().reverse().map(r=>'<option>'+r.year+'</option>').join('');if(years.some(r=>String(r.year)===oldYear))$('year').value=oldYear;
 const rows=p.receipts.filter(r=>!account||r.account===account),totals=C.total(rows),docs=p.documents.filter(d=>!account||d.account===account),spans=C.ranges(p,account);
 $('scope-title').textContent=spans.map(s=>s.from+' 〜 '+s.to).join(' / ')+' · '+rows.length+'件・'+docs.length+'資料';$('scope-note').textContent=p.scopeNote;
 $('received-total').textContent=yen(totals.total);$('dividend-total').textContent=yen(totals.dividend);$('substitute-total').textContent=yen(totals.substitute);$('interest-total').textContent=yen(totals.interest);
 $('annual').innerHTML=years.map(r=>'<tr><td><button class="year-select" data-year="'+r.year+'">'+r.year+'年</button></td><td class="'+r.coverage+'">'+coverageLabel[r.coverage]+'</td>'+['total','dividend','substitute','interest'].map(k=>'<td class="money">'+value(r,k)+'</td>').join('')+'<td>'+r.count+'</td></tr>').join('');
 const max=Math.max(...years.map(r=>r.total),1);$('annual-chart').innerHTML=years.map(r=>'<div class="bar-row"><span>'+r.year+'年'+(r.coverage==='partial'?'*':'')+'</span><div class="bar-track" aria-hidden="true"><div class="bar-fill"></div></div><span class="bar-value">'+value(r,'total')+'</span></div>').join('');
 // CSP forbids inline styling, so set the bar widths through the CSSOM.
 $('annual-chart').querySelectorAll('.bar-fill').forEach((node,i)=>node.style.width=100*years[i].total/max+'%');
 $('documents').innerHTML=docs.map(d=>'<div class="document"><strong>'+esc(d.name)+'</strong><p>'+esc(d.account)+' · '+d.from+' 〜 '+d.to+'</p><p>'+esc(d.note)+'</p></div>').join('');
 renderYear();
}
function renderYear(){
 const p=envelope.current;if(!p)return;const year=$('year').value,account=$('account').value,rows=p.receipts.filter(r=>r.date.startsWith(year+'-')&&(!account||r.account===account));
 $('monthly-title').textContent=year+'年 月別の受取合計と内訳';$('stocks-title').textContent=year+'年 銘柄別の配当金';
 $('monthly').innerHTML=C.months(p,year,account).map(r=>'<tr><td>'+r.month+'月</td><td class="'+r.coverage+'">'+coverageLabel[r.coverage]+'</td>'+['total','dividend','substitute','interest'].map(k=>'<td class="money">'+value(r,k)+'</td>').join('')+'</tr>').join('');
 const stocks=new Map();for(const r of rows.filter(r=>r.category==='dividend')){const s=stocks.get(r.instrument)||{amount:0,count:0};s.amount+=r.amount;s.count++;stocks.set(r.instrument,s);}
 $('stocks').innerHTML=stocks.size?'<div class="table-wrap"><table><thead><tr><th>銘柄（原資料の表記）</th><th>件数</th><th class="money">配当金</th></tr></thead><tbody>'+[...stocks].sort((a,b)=>b[1].amount-a[1].amount).map(([name,s])=>'<tr><td>'+esc(name)+'</td><td>'+s.count+'</td><td class="money">'+yen(s.amount)+'</td></tr>').join('')+'</tbody></table></div>':'<p>選択した年の配当明細はありません。確認範囲は月別表をご覧ください。</p>';
 const category=$('category').value,filtered=rows.filter(r=>!category||r.category===category).slice().reverse(),byId=new Map(p.documents.map(d=>[d.id,d]));
 $('detail-count').textContent=year+'年 · '+filtered.length+'件 · '+yen(C.total(filtered).total);
 $('details').innerHTML=filtered.map(r=>'<article class="receipt"><div class="receipt-head"><span>'+r.date+' · '+C.labels[r.category]+'</span><strong>'+yen(r.amount)+'</strong></div><h3>'+esc(r.instrument||C.labels[r.category])+'</h3><p>'+esc(r.account)+(r.quantity===null?'':' · '+r.quantity.toLocaleString('ja-JP')+'株')+(r.note?' · '+esc(r.note):'')+'</p><details><summary>出典 '+r.sources.length+'件</summary><ul>'+r.sources.map(s=>'<li>'+esc(byId.get(s.documentId).name)+(s.page===null?'':' · '+s.page+'ページ')+(s.line===null?'':' · '+s.line+'行')+'</li>').join('')+'</ul></details></article>').join('')||'<p>該当する受取明細はありません。</p>';
}
function preview(raw){
 if(storageError)throw Error('保存済みデータを読み込めないため、上書きを停止しています。');
 pending=C.validate(raw);const merged=C.merge(envelope.current,pending),added=merged.receipts.length-(envelope.current?.receipts.length||0),total=C.total(pending.receipts);
 $('pending-summary').textContent=pending.documents.length+'資料・'+pending.receipts.length+'件 / 受取合計 '+yen(total.total)+'（貸株関連を含む）。新規 '+added+'件。'+pending.scopeNote;
 $('pending').hidden=false;$('apply').disabled=false;status('取込内容を確認してください。');$('pending').scrollIntoView({block:'start'});
}
async function decodeFragment(fragment){
 const token=fragment.slice(5);if(!/^[A-Za-z0-9_-]+$/.test(token)||token.length>300000)throw Error('反映リンクが不正です。');
 if(typeof DecompressionStream==='undefined')throw Error('このブラウザでは反映リンクを開けません。反映ファイル内のバックアップJSONをご利用ください。');
 const bytes=Uint8Array.from(atob(token.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
 const reader=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip')).getReader();const chunks=[];let length=0;
 while(true){const r=await reader.read();if(r.done)break;length+=r.value.length;if(length>2000000){await reader.cancel();throw Error('反映データが大きすぎます。');}chunks.push(r.value);}
 const output=new Uint8Array(length);let offset=0;for(const chunk of chunks){output.set(chunk,offset);offset+=chunk.length;}return JSON.parse(new TextDecoder().decode(output));
}
const fragment=location.hash;if(fragment.startsWith('#br1='))history.replaceState(null,'',location.pathname+location.search);
try{envelope=C.read(localStorage);}catch{storageError=true;status('保存済みの証券実績を読み込めません。元データは変更していません。',true);}
render();
$('account').onchange=render;$('year').onchange=$('category').onchange=renderYear;
$('annual').onclick=e=>{const b=e.target.closest('[data-year]');if(b){$('year').value=b.dataset.year;renderYear();$('monthly-title').scrollIntoView({block:'start'});}};
$('apply').onclick=()=>{try{const r=C.save(localStorage,pending);envelope=r;pending=null;$('pending').hidden=true;$('json-input').value='';render();status(r.changed?'証券実績をこの端末へ反映しました。貸株関連を含む受取合計を表示しています。':'同じデータは反映済みです。重複は追加していません。');}catch(error){status('反映できませんでした。'+error.message,true);}};
$('cancel').onclick=()=>{pending=null;$('pending').hidden=true;status('取り込みを取り消しました。');};
$('preview').onclick=()=>{try{const value=$('json-input').value;if(value.length>2000000)throw Error('データが大きすぎます。');preview(JSON.parse(value));}catch(error){pending=null;$('pending').hidden=true;status(error.message,true);}};
$('file').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>2000000)throw Error('ファイルが大きすぎます。');preview(JSON.parse(await file.text()));}catch(error){pending=null;$('pending').hidden=true;status(error.message,true);}finally{e.target.value='';}};
$('export').onclick=()=>{if(!envelope.current)return;const blob=new Blob([JSON.stringify(envelope.current,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='資産コンパス_証券実績_'+envelope.current.preparedAt+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);status('証券実績のバックアップを書き出しました。');};
$('undo').onclick=()=>{try{envelope=C.undo(localStorage);render();status('前の取り込みへ戻しました。');}catch(error){status(error.message,true);}};
window.addEventListener('storage',e=>{if(e.key===C.KEY){try{envelope=C.read(localStorage);render();}catch{storageError=true;status('別の画面で変更されたデータを読み込めません。',true);}}});
if(fragment.startsWith('#br1='))decodeFragment(fragment).then(preview).catch(e=>status(e.message,true));
})();
