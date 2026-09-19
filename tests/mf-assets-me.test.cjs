'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const C=require('../mf-assets/core.js'),M=require('../mf-assets/me-core.js'),P=require('../mf-assets/purpose-core.js');
const id='a'.repeat(64),id2='b'.repeat(64);
const row=(category,name,value,account='検証口座')=>({institution_name:'検証金融機関',account_name:account,asset_category:category,name,current_value:value});
function packet(){return {format:M.FORMAT,currency:'JPY',asOf:'2026-09-19',retrievedAt:'2026-09-19T15:00:00Z',holdings:[row('普通預金','預金',100000),row('国内株','検証株',20000),row('国内株','検証株',30000),row('ポイント・マイル','ポイント',-5),row('クレジットカード利用残高','利用残高',-1000),row('住宅ローン','ローン',-60000)],categories:[['普通預金',100000],['国内株',50000],['ポイント・マイル',-5],['クレジットカード利用残高',-1000],['住宅ローン',-60000]]};}
test('assets, debts and net reconcile without double counting history or negative points',()=>{
  const result=M.prepare(C.empty(),packet(),C,id),s=result.state;
  assert.equal(result.assets,149995);assert.equal(result.liabilities,61000);assert.equal(result.net,88995);
  assert.equal(s.holdings.length,3);assert.equal(s.holdings[1].valueJPY,50000);assert.equal(s.holdings[1].meSourceCount,2);
  assert.equal(C.summary(s).total,149995);assert.equal(P.summarize(s).total,149995);assert.equal(s.history[0].total,149995);
  assert.deepEqual(C.validateBackup(JSON.parse(JSON.stringify(s))),s);
});
test('no inferred quantities, cost, ownership, tax lots or dividend forecasts',()=>{
  const s=M.prepare(C.empty(),packet(),C,id).state;
  for(const h of s.holdings){assert.equal(h.owner,'');assert.equal(h.quantity,null);assert.equal(h.costJPY,null);assert.equal(h.taxType,C.UNKNOWN);assert.equal(h.annualDps,null);}
  assert.equal(C.summary(s).forecastNet,null);assert.equal(C.summary(s).costKnown,0);
});
test('same packet does not reset subsequent edits or add duplicate records',()=>{
  const s=M.prepare(C.empty(),packet(),C,id).state;s.holdings[0].valueJPY=110000;
  const again=M.prepare(s,packet(),C,id);
  assert.equal(again.unchanged,true);assert.equal(again.state,s);assert.equal(again.state.imports.length,1);
});
test('fresh source snapshot replaces sold holdings and retains purpose, ownership and unrelated records',()=>{
  let s=M.prepare(C.empty(),packet(),C,id).state;
  s=P.assign(s,[s.holdings[0].key],'emergency');s.holdings[0].owner='夫';s.settings.accountOwners={'検証口座':'妻'};
  const parsed=C.parseCSV('日付,内容,金額,口座\n2026-09-01,配当,500,検証口座');
  s=C.applyImport(s,C.normalize(parsed,'transactions',C.mapping(parsed.headers,'transactions')),'merge','検証').state;
  const transactions=JSON.stringify(s.transactions),before=JSON.stringify(s);
  const p=packet();p.retrievedAt='2026-09-19T16:00:00Z';p.holdings=p.holdings.filter(h=>h.asset_category!=='国内株');p.categories=p.categories.filter(c=>c[0]!=='国内株');
  const n=M.prepare(s,p,C,id2).state;
  assert.equal(JSON.stringify(s),before);assert.equal(n.holdings.length,2);assert.equal(n.holdings[0].owner,'夫');
  assert.deepEqual(n.settings.accountOwners,s.settings.accountOwners);assert.equal(JSON.stringify(n.transactions),transactions);
  assert.equal(P.summarize(n).groups.find(g=>g.id==='emergency').value,100000);assert.equal(n.history.length,1);
});
test('single matching CSV asset retains classification but stale trading fields are cleared',()=>{
  const parsed=C.parseCSV('名義,口座,銘柄名,評価額,資産区分,数量,取得金額,税区分\n夫,検証口座,預金,90000,預金・現金,10,80000,NISA');
  let s=C.applyImport(C.empty(),C.normalize(parsed,'holdings',C.mapping(parsed.headers,'holdings')),'merge','CSV').state;
  s=P.assign(s,[s.holdings[0].key],'education');const n=M.prepare(s,packet(),C,id).state;
  assert.equal(n.holdings[0].owner,'夫');assert.equal(n.holdings[0].quantity,null);assert.equal(n.holdings[0].costJPY,null);
  assert.equal(P.summarize(n).groups.find(g=>g.id==='education').value,100000);
});
test('ambiguous source lots do not inherit a single old owner or purpose',()=>{
  const parsed=C.parseCSV('名義,口座,銘柄名,評価額,資産区分\n夫,検証口座,検証株,50000,国内株式');
  let s=C.applyImport(C.empty(),C.normalize(parsed,'holdings',C.mapping(parsed.headers,'holdings')),'merge','CSV').state;
  s=P.assign(s,[s.holdings[0].key],'retirement');const n=M.prepare(s,packet(),C,id).state;
  assert.equal(n.holdings[1].owner,'');assert.equal(P.summarize(n).groups.find(g=>g.id==='retirement').value,0);
});
test('mismatches, missing categories, invalid dates and unsupported signs reject atomically',()=>{
  const s=C.empty(),before=JSON.stringify(s);
  for(const change of [p=>p.categories[0][1]++,p=>p.categories.pop(),p=>p.categories.push(p.categories[0]),p=>p.holdings[0].current_value=NaN,p=>p.asOf='2026-02-30',p=>p.currency='USD',p=>{p.holdings[0].current_value=-100000;p.categories[0][1]=-100000;}]){
    const p=packet();change(p);assert.throws(()=>M.prepare(s,p,C,id));assert.equal(JSON.stringify(s),before);
  }
});
test('older imports cannot overwrite a newer source snapshot',()=>{
  const p=packet(),s=M.prepare(C.empty(),p,C,id).state;p.retrievedAt='2026-09-19T14:00:00Z';
  assert.throws(()=>M.prepare(s,p,C,id2),/新しい/);
});
test('dictionary transport round-trips and rejects truncated row references',()=>{
  const p=packet(),s=[],index=x=>{if(!s.includes(x))s.push(x);return s.indexOf(x);};
  const encoded={v:1,d:p.asOf,t:p.retrievedAt,s,h:p.holdings.map(h=>[...['institution_name','account_name','asset_category','name'].map(k=>index(h[k])),h.current_value]),c:p.categories.map(([name,value])=>[index(name),value])};
  assert.deepEqual(M.unpack(encoded),p);encoded.h[0][0]=99999;assert.throws(()=>M.unpack(encoded));
});
test('negative points survive CSV export and reimport; negative stocks remain invalid',()=>{
  const parsed=C.parseCSV('口座,銘柄名,評価額,資産区分\n検証口座,調整ポイント,-5,ポイント\n検証口座,検証株,-5,国内株式');
  const rows=C.normalize(parsed,'holdings',C.mapping(parsed.headers,'holdings'));
  assert.equal(rows.records.length,1);assert.equal(rows.records[0].valueJPY,-5);assert.equal(rows.skipped,1);
  assert.equal(C.validateBackup(C.applyImport(C.empty(),rows,'merge','検証').state).holdings[0].valueJPY,-5);
});
