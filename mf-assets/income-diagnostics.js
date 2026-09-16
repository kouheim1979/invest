/* Visible diagnostics for imports, calendar-year totals, and accounting exclusions. */
(function(){
'use strict';
const C=AssetCore,A=C.incomeAccounting;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const yen=v=>'<span class="money">'+Math.round(v).toLocaleString('ja-JP')+'円</span>';
const table=(heads,rows)=>'<div class="table-wrap"><table><thead><tr>'+heads.map(h=>'<th>'+h+'</th>').join('')+'</tr></thead><tbody>'+rows.map(r=>'<tr>'+r.map(c=>'<td>'+c+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';
function panel(id,title,report,selectedYear,importing=false){
 const node=document.createElement('section');node.id=id;node.className='panel';
 const automatic=report.years.reduce((n,y)=>n+y.automatic,0),recognized=report.years.reduce((n,y)=>n+y.recognized,0);
 const notice=automatic?'家計簿では対象外・振替の配当 '+automatic+'件も、配当カテゴリの指定を優先して集計しています。':'明細の日付で年別に集計しています。ファイル名の年とは一致しない場合があります。';
 node.innerHTML='<div class="panel-head"><div><h2>'+title+'</h2><p>v1.0.1 · 配当認識 '+recognized+'件 / 収録 '+esc(report.from)+'〜'+esc(report.to)+'</p></div></div>'+
 '<div class="callout'+(automatic?' warning':'')+'">'+notice+'<p>対象は「配当所得」などのカテゴリが明示された正の受取額です。一般の資金振替は追加しません。手動除外・未来日の除外は優先します。</p></div>'+
 table(['明細の日付の年','配当集計件数','受取額（CSV分類）','うち家計簿対象外等','除外配当',''],report.years.map(y=>[y.year+'年',y.included+'件',yen(y.amountJPY),y.automatic+'件',y.excluded+'件',importing?'':y.year===selectedYear?'<span class="badge">表示中</span>':'<button class="button compact" data-income-year="'+y.year+'">この年を表示</button>']))+
 '<p class="section-note">CSVの配当分類に基づく金額です。銀行と証券会社に別IDで記録された同一入金は、自動で同じ配当と確定できません。二重計上は明細から手動除外してください。未収録期間を0円とは判断しません。</p>';
 if(!importing){const rows=report.accounts.filter(a=>a.year===selectedYear);if(rows.length)node.insertAdjacentHTML('beforeend','<hr class="divider"><h3>'+selectedYear+'年の口座別配当（現在の名義フィルター内）</h3>'+table(['CSVの口座名','集計件数','受取額'],rows.map(a=>[esc(a.account),a.count+'件',yen(a.amountJPY)]))+'<p class="section-note">口座名はそのまま表示しています。誰の口座かは推測しません。「名義・保存設定」で家族に割り当ててください。</p>');}
 return node;
}
function refresh(){
 const main=document.querySelector('#main');
 const current=document.querySelector('#nav button.active')?.dataset.view;
 if(['dashboard','dividends'].includes(current)&&A.lastSummary?.report.rows&&!main.querySelector('#income-diagnostic')){
  const ctx=A.lastSummary;main.querySelector('.page-head')?.insertAdjacentElement('afterend',panel('income-diagnostic','配当が表示されるまでの確認',ctx.report,ctx.year));
 }
 if(current==='import'&&main.querySelector('.preview')&&A.lastImport&&!main.querySelector('#income-import-diagnostic')){
  main.querySelector('.preview').insertAdjacentElement('afterend',panel('income-import-diagnostic','このファイルから認識した配当',A.lastImport,null,true));
 }
 // Old household-accounting labels are misleading under the asset-income view.
 if(current==='dividends'){
  for(const p of main.querySelectorAll('.panel-head p'))if(p.textContent.startsWith('自動分類は修正できます。'))p.textContent='配当カテゴリのある受取は家計簿の対象外・振替でも集計。一般振替・税・元本払戻は自動加算しません。';
 }
 const auto=document.querySelector('#t-include option[value="auto"]');if(auto)auto.textContent='自動判定（明示された配当受取を優先）';
}
let pending=false;function schedule(){if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;refresh();});}
new MutationObserver(schedule).observe(document.querySelector('#main'),{childList:true});
new MutationObserver(schedule).observe(document.querySelector('#modal-content'),{childList:true});
document.addEventListener('click',e=>{const b=e.target.closest('[data-income-year]');if(!b)return;const filter=document.querySelector('#year-filter');if(filter){filter.value=b.dataset.incomeYear;filter.dispatchEvent(new Event('change',{bubbles:true}));}});
const version=document.querySelector('.sidebar-bottom small');if(version)version.textContent='非公式補助アプリ · v1.0.1';
schedule();
})();
