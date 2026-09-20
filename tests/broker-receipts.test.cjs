'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const C=require('../broker-receipts-core.js');
const document={id:'q1',name:'fictional.pdf',kind:'pdf',account:'検証用口座',from:'2024-01-04',to:'2024-03-29',coverageFrom:'2024-01-01',coverageTo:'2024-03-31',note:'架空の四半期報告書'};
const receipt=(id,category,amount,line)=>({id,account:document.account,date:'2024-03-12',category,instrument:category==='dividend'?'検証株式会社':'',quantity:null,amount,currency:'JPY',note:'',sources:[{documentId:'q1',page:5,line}]});
const packet=()=>({schema:'asset-compass-broker-receipts',version:1,preparedAt:'2024-04-01',scopeNote:'架空データ',documents:[{...document}],receipts:[receipt('a','dividend',120,1),receipt('b','substitute',35,2),receipt('c','interest',7,3)]});
function storage(){const data=new Map();return{getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};}
test('received total includes dividends, loan substitutes and lending interest exactly once',()=>{
 const p=C.validate(packet()),t=C.total(p.receipts);assert.deepEqual(t,{dividend:120,substitute:35,interest:7,count:3,total:162});
 assert.equal(C.years(p)[0].total,162);assert.equal(C.years(p)[0].coverage,'partial');
});
test('zero in a checked quarter differs from an unconfirmed month; partial CSV is not a full month',()=>{
 const p=C.validate(packet()),m=C.months(p,2024);assert.equal(m[0].coverage,'full');assert.equal(m[0].total,0);assert.equal(m[3].coverage,'unknown');
 p.documents.push({...document,id:'csv',kind:'csv',name:'fictional.csv',from:'2024-04-01',to:'2024-04-15',coverageFrom:'2024-04-01',coverageTo:'2024-04-15'});
 assert.equal(C.months(p,2024)[3].coverage,'partial');
});
test('reimport is idempotent, keeps prior data and joins independent corroborating sources',()=>{
 const s=storage(),p=packet();s.setItem('unrelated','preserve');assert.equal(C.save(s,p).changed,true);assert.equal(C.save(s,p).changed,false);
 const incoming=packet();incoming.documents.push({...document,id:'csv',kind:'csv',name:'fictional.csv'});incoming.receipts[0].sources.push({documentId:'csv',page:null,line:11});
 const r=C.save(s,incoming);assert.equal(r.current.receipts.length,3);assert.equal(r.current.receipts[0].sources.length,2);assert.equal(C.total(r.current.receipts).total,162);assert.equal(s.getItem('unrelated'),'preserve');
 assert.equal(C.undo(s).current.documents.length,1);
});
test('different legitimate lots on the same date are retained; duplicated source locations are rejected',()=>{
 const p=packet();p.receipts.push(receipt('a2','dividend',120,4));assert.equal(C.total(C.validate(p).receipts).dividend,240);
 p.receipts[3].sources[0].line=1;assert.throws(()=>C.validate(p),/資料位置/);
});
test('conflicting amounts, missing evidence, dates and foreign currency cannot overwrite saved data',()=>{
 const s=storage();C.save(s,packet());const before=s.getItem(C.KEY),p=packet();p.receipts[0].amount=121;assert.throws(()=>C.save(s,p),/金額・内容/);assert.equal(s.getItem(C.KEY),before);
 for(const patch of [{amount:null},{amount:-1},{amount:1.5},{currency:'USD'},{date:'2024-02-30'},{date:'2024-04-01'},{sources:[]}]){const bad=packet();Object.assign(bad.receipts[0],patch);assert.throws(()=>C.save(s,bad));assert.equal(s.getItem(C.KEY),before);}
});
test('failed storage write leaves both current and undo data intact; malformed stored data is not overwritten',()=>{
 const s=storage();C.save(s,packet());const before=s.getItem(C.KEY),next=packet();next.preparedAt='2024-04-02';s.setItem=()=>{throw Error('quota');};assert.throws(()=>C.save(s,next),/quota/);assert.equal(s.getItem(C.KEY),before);
 const broken=storage();broken.setItem(C.KEY,'{');assert.throws(()=>C.save(broken,packet()));assert.equal(broken.getItem(C.KEY),'{');
});
test('account filtering keeps unconfirmed accounts from appearing fully covered',()=>{
 const p=packet();p.documents.push({...document,id:'other',account:'別口座',coverageFrom:'2024-02-01',from:'2024-02-01'});
 assert.equal(C.months(p,2024)[0].coverage,'partial');assert.equal(C.months(p,2024,'検証用口座')[0].coverage,'full');assert.equal(C.months(p,2024,'別口座')[0].coverage,'unknown');
});
test('family accounts without evidence remain unknown and survive import, merge and undo',()=>{
 const p=packet();p.accounts=['検証用口座','子A','子B'];const v=C.validate(p);
 assert.deepEqual(C.accounts(v),p.accounts);
 assert.equal(C.years(v,'子A')[0].coverage,'unknown');assert.equal(C.months(v,2024,'子B')[0].coverage,'unknown');assert.equal(C.months(v,2024)[0].coverage,'partial');
 const s=storage();C.save(s,packet());C.save(s,p);assert.deepEqual(C.read(s).current.accounts,p.accounts);assert.equal(C.save(s,p).changed,false);C.undo(s);assert.equal(C.read(s).current.accounts,undefined);
});
test('dividend-only evidence never claims lending coverage or accepts lending receipts',()=>{
 const p=packet();p.receipts=p.receipts.filter(r=>r.category==='dividend');p.documents[0].categories=['dividend'];
 const v=C.validate(p),m=C.months(v,2024)[0];assert.equal(m.coverage,'partial');assert.equal(m.coverageByCategory.dividend,'full');assert.equal(m.coverageByCategory.interest,'unknown');
 p.receipts.push(receipt('invalid','interest',7,4));assert.throws(()=>C.validate(p),/出典/);
});
test('merging distinct scope notes repeatedly does not grow or change saved data',()=>{
 const a=packet(),b=packet();b.scopeNote='追加の確認範囲';const s=storage();C.save(s,a);C.save(s,b);assert.equal(C.save(s,b).changed,false);assert.equal(C.read(s).current.scopeNote,'架空データ\n追加の確認範囲');
});
