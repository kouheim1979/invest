/* Asset Compass 1.0.1: asset-income accounting view, separate from household flags.
 * Original CSV fields and manual overrides are never rewritten.
 * CommonJS and the browser install the same adapter on AssetCore.
 */
(function(root){
'use strict';
const C=typeof module!=='undefined'&&module.exports?require('./core.js'):root.AssetCore;
if(C.incomeAccounting){if(typeof module!=='undefined'&&module.exports)module.exports=C;return;}
const original={active:C.active,summary:C.summary,consultation:C.consultation,normalize:C.normalize};
const categories=new Set(['配当所得','配当','配当金','株式配当金','受取配当金','分配金','普通分配金','配当・分配金'].map(C.norm));
function explicitDividend(t){return C.kindOf(t)==='配当・分配金'&&Number.isFinite(t.amountJPY)&&t.amountJPY>0&&[t.category,t.subcategory].some(v=>categories.has(C.norm(v)));}
function decision(t,asOf=C.today()){
 if(!C.date(t.date)||t.date>asOf)return {included:false,basis:'未来日・無効日付',automatic:false};
 if(t.includeOverride===false)return {included:false,basis:'手動除外',automatic:false};
 if(t.includeOverride===true)return {included:true,basis:'手動で含める',automatic:false};
 if(explicitDividend(t))return {included:true,basis:'CSVの配当カテゴリを優先',automatic:!!t.transfer||!t.counted};
 return {included:!!original.active(t,asOf),basis:t.transfer?'振替のため除外':!t.counted?'家計簿の計算対象外':'通常の計算対象',automatic:false};
}
function accountingView(s,asOf){
 return {...s,transactions:s.transactions.map(t=>decision(t,asOf).automatic?{...t,includeOverride:true}:t)};
}
function report(rows,asOf=C.today()){
 const dates=rows.map(t=>t.date).filter(d=>C.date(d)).sort(),years=new Map(),accounts=new Map();
 for(const t of rows){
  const yr=Number(t.date.slice(0,4));if(!Number.isFinite(yr))continue;
  if(!years.has(yr))years.set(yr,{year:yr,rows:0,recognized:0,included:0,amountJPY:0,automatic:0,automaticJPY:0,excluded:0,excludedJPY:0});
  const y=years.get(yr);y.rows++;
  if(C.kindOf(t)!=='配当・分配金')continue;
  y.recognized++;const d=decision(t,asOf);
  if(!d.included){y.excluded++;y.excludedJPY+=t.amountJPY;continue;}
  y.included++;y.amountJPY+=t.amountJPY;
  if(d.automatic){y.automatic++;y.automaticJPY+=t.amountJPY;}
  const key=JSON.stringify([yr,t.account]);
  if(!accounts.has(key))accounts.set(key,{year:yr,account:t.account,count:0,amountJPY:0});
  const a=accounts.get(key);a.count++;a.amountJPY+=t.amountJPY;
 }
 return {from:dates[0]||null,to:dates.at(-1)||null,rows:rows.length,years:[...years.values()].sort((a,b)=>a.year-b.year),accounts:[...accounts.values()].sort((a,b)=>a.year-b.year||a.account.localeCompare(b.account))};
}
const api={version:'1.0.1',explicitDividend,decision,report,lastSummary:null,lastImport:null};
C.active=(t,asOf=C.today())=>decision(t,asOf).included;
C.summary=function(s,owner='all',year=Number(C.today().slice(0,4)),asOf=C.today()){
 const out=original.summary(accountingView(s,asOf),owner,year,asOf);
 // Return original rows for viewing/editing; projection-only overrides never escape.
 const selected=C.selected(s.transactions,s,owner),ids=new Set(out.dividends.map(t=>t.id));
 out.transactions=selected;out.dividends=selected.filter(t=>ids.has(t.id));
 out.incomeAccounting=report(selected,asOf);
 api.lastSummary={owner,year,report:out.incomeAccounting};return out;
};
C.normalize=function(...args){const out=original.normalize(...args);api.lastImport=out.type==='transactions'?report(out.records):null;return out;};
C.consultation=function(s,options={}){
 const out=original.consultation(accountingView(s,C.today()),options);
 const rows=C.selected(s.transactions,s,options.owner||'all');
 out.incomeAccounting={rule:'explicit-dividend-category/v1',description:'正の受取額で、配当カテゴリが明示された行は家計簿の計算対象外・振替でも配当集計に含む。手動除外と未来日除外を優先。',years:report(rows).years};
 const investmentRows=rows.filter(t=>C.kindOf(t)!=='その他');
 out.investmentTransactions=out.investmentTransactions.map((t,i)=>({...t,inclusionBasis:decision(investmentRows[i]).basis}));
 out.caveats.push('配当カテゴリが明示された正の入金は、家計簿上の振替・計算対象外でも配当集計に含める。CSV分類に基づく集計であり、証券会社の配当計算書による確認済み額ではない。','年はファイル名ではなく明細の日付で区分する。各年のデータ収録期間を確認する。');
 return out;
};
C.incomeAccounting=api;
if(typeof module!=='undefined'&&module.exports)module.exports=C;
})(globalThis);
