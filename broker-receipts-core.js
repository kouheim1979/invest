/* Brokerage cash receipts are an independent source. Never add bank sweeps or estimates. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.BrokerReceipts=api;})(globalThis,()=>{
'use strict';
const KEY='asset_compass_broker_receipts_v1';
const labels={dividend:'配当金',substitute:'貸株配当金相当額',interest:'貸株金利'};
const fail=message=>{throw Error(message);};
const str=(v,max=500)=>typeof v==='string'&&v.length<=max?v:fail('文字列の形式を確認してください。');
const nonempty=v=>str(v).trim()||fail('識別子・名前がありません。');
const date=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v?v:fail('日付の形式を確認してください。');
const array=(v,max)=>Array.isArray(v)&&v.length<=max?v:fail('明細の形式・件数を確認してください。');
const whole=v=>Number.isSafeInteger(v)&&v>=0?v:fail('円の受取金額は0以上の整数で指定してください。');
const numberOrNull=v=>v===null?null:Number.isSafeInteger(v)&&v>0?v:fail('数量・出典位置を確認してください。');
const categories=d=>d.categories||Object.keys(labels);
function accounts(p){return [...new Set([...(p.accounts||[]),...p.documents.map(d=>d.account)])];}
function validate(raw){
 if(!raw||raw.schema!=='asset-compass-broker-receipts'||raw.version!==1)fail('証券実績のバックアップ形式ではありません。');
 const documents=array(raw.documents,1000).map(d=>({id:nonempty(d.id),name:nonempty(d.name),kind:['pdf','csv'].includes(d.kind)?d.kind:fail('資料形式が不明です。'),account:nonempty(d.account),from:date(d.from),to:date(d.to),coverageFrom:date(d.coverageFrom),coverageTo:date(d.coverageTo),note:str(d.note),...(d.categories?{categories:array(d.categories,3).map(c=>Object.hasOwn(labels,c)?c:fail('資料の受取区分が不明です。'))}:{})}));
 const byId=new Map();for(const d of documents){if(byId.has(d.id))fail('資料IDが重複しています。');if(d.from>d.to||d.coverageFrom>d.from||d.coverageTo<d.to)fail('資料の対象期間が不正です。');byId.set(d.id,d);}
 const ids=new Set(),positions=new Set();
 const receipts=array(raw.receipts,20000).map(r=>{
  const row={id:nonempty(r.id),account:nonempty(r.account),date:date(r.date),category:Object.hasOwn(labels,r.category)?r.category:fail('受取区分が不明です。'),instrument:str(r.instrument),quantity:numberOrNull(r.quantity),amount:whole(r.amount),currency:r.currency==='JPY'?'JPY':fail('この画面は円建て受取専用です。'),note:str(r.note),sources:array(r.sources,20).map(s=>({documentId:nonempty(s.documentId),page:numberOrNull(s.page),line:numberOrNull(s.line)}))};
  if(ids.has(row.id))fail('明細IDが重複しています。');ids.add(row.id);
  if(!row.sources.length)fail('出典のない明細は取り込めません。');
  for(const s of row.sources){const d=byId.get(s.documentId);if(!d||!categories(d).includes(row.category)||d.account!==row.account||row.date<d.from||row.date>d.to)fail('明細と出典の口座・期間が一致しません。');if(s.page===null&&s.line===null)fail('資料内の位置がありません。');const pos=JSON.stringify(s);if(positions.has(pos))fail('同じ資料位置が重複しています。');positions.add(pos);}
  return row;
 });
 return{schema:raw.schema,version:1,...(raw.accounts?{accounts:[...new Set(array(raw.accounts,100).map(nonempty))]}:{}),preparedAt:date(raw.preparedAt),scopeNote:str(raw.scopeNote,4000),documents:documents.sort((a,b)=>a.from.localeCompare(b.from)||a.id.localeCompare(b.id)),receipts:receipts.sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id))};
}
function merge(old,incoming){
 const p=validate(incoming);if(!old)return p;const a=validate(old),docs=new Map(a.documents.map(d=>[d.id,d])),rows=new Map(a.receipts.map(r=>[r.id,r]));
 for(const d of p.documents){if(docs.has(d.id)&&JSON.stringify(docs.get(d.id))!==JSON.stringify(d))fail('既存資料と内容が違います。保存は変更していません。');docs.set(d.id,d);}
 for(const r of p.receipts){const prior=rows.get(r.id);if(prior){const {sources:oldSources,...oldBody}=prior,{sources:newSources,...newBody}=r;if(JSON.stringify(oldBody)!==JSON.stringify(newBody))fail('既存明細と金額・内容が違います。保存は変更していません。');r.sources=[...new Map([...oldSources,...newSources].map(s=>[JSON.stringify(s),s])).values()];}rows.set(r.id,r);}
 const notes=[...new Set([a.scopeNote,p.scopeNote].flatMap(n=>n.split('\n')).filter(Boolean))].join('\n');
 return validate({...p,preparedAt:a.preparedAt>p.preparedAt?a.preparedAt:p.preparedAt,scopeNote:notes,...(a.accounts||p.accounts?{accounts:[...new Set([...accounts(a),...accounts(p)])]}:{}),documents:[...docs.values()],receipts:[...rows.values()]});
}
function total(rows){const out={dividend:0,substitute:0,interest:0,count:rows.length,total:0};for(const r of rows){out[r.category]+=r.amount;out.total+=r.amount;if(!Number.isSafeInteger(out.total))fail('集計額が大きすぎます。');}return out;}
function ranges(p,account='',category=''){const spans=p.documents.filter(d=>(!account||d.account===account)&&(!category||categories(d).includes(category))).map(d=>({from:d.coverageFrom,to:d.coverageTo})).sort((a,b)=>a.from.localeCompare(b.from));const out=[];for(const s of spans){const last=out.at(-1);if(last&&Date.parse(s.from)<=Date.parse(last.to)+86400000){if(s.to>last.to)last.to=s.to;}else out.push({...s});}return out;}
function coverage(p,from,to,account='',category=''){
 const selected=account?[account]:accounts(p),cs=category?[category]:Object.keys(labels);
 const states=selected.flatMap(a=>cs.map(c=>{const spans=ranges(p,a,c);return spans.some(s=>s.from<=from&&s.to>=to)?'full':spans.some(s=>s.from<=to&&s.to>=from)?'partial':'unknown';}));
 return !states.length||states.every(s=>s==='unknown')?'unknown':states.every(s=>s==='full')?'full':'partial';
}
function coverageByCategory(p,from,to,account=''){return Object.fromEntries(Object.keys(labels).map(c=>[c,coverage(p,from,to,account,c)]));}
function years(p,account=''){const ds=p.documents;if(!ds.length)return[];const start=Math.min(...ds.map(d=>+d.coverageFrom.slice(0,4))),end=Math.max(...ds.map(d=>+d.coverageTo.slice(0,4)));const out=[];for(let y=start;y<=end;y++){const rows=p.receipts.filter(r=>(!account||r.account===account)&&r.date.startsWith(y+'-'));out.push({year:y,...total(rows),coverage:coverage(p,y+'-01-01',y+'-12-31',account),coverageByCategory:coverageByCategory(p,y+'-01-01',y+'-12-31',account)});}return out;}
function months(p,year,account=''){return Array.from({length:12},(_,i)=>{const from=year+'-'+String(i+1).padStart(2,'0')+'-01',to=new Date(Date.UTC(+year,i+1,0)).toISOString().slice(0,10);return{month:i+1,...total(p.receipts.filter(r=>(!account||r.account===account)&&r.date.startsWith(from.slice(0,7)))),coverage:coverage(p,from,to,account),coverageByCategory:coverageByCategory(p,from,to,account)};});}
function read(storage){const raw=storage.getItem(KEY);if(raw===null)return{version:1,current:null,previous:null};const e=JSON.parse(raw);if(e.version!==1)fail('保存形式を読み込めません。');return{version:1,current:e.current?validate(e.current):null,previous:e.previous?validate(e.previous):null};}
function save(storage,packet){const old=read(storage),current=merge(old.current,packet);if(JSON.stringify(old.current)===JSON.stringify(current))return{...old,changed:false};storage.setItem(KEY,JSON.stringify({version:1,current,previous:old.current}));return{version:1,current,previous:old.current,changed:true};}
function undo(storage){const old=read(storage);if(!old.previous)fail('戻せる取り込みはありません。');const next={version:1,current:old.previous,previous:old.current};storage.setItem(KEY,JSON.stringify(next));return next;}
return{KEY,labels,accounts,validate,merge,total,ranges,coverage,years,months,read,save,undo};
});
