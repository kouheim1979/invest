'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const C=require('../mf-assets/core.js'),M=require('../mf-assets/me-core.js'),P=require('../mf-assets/purpose-core.js'),MC=require('../mf-assets/me-classification.js');
const id='c'.repeat(64),id2='d'.repeat(64);
const row=(category,name,value,account='検証口座')=>({institution_name:'検証金融機関',account_name:account,asset_category:category,name,current_value:value});
function packet(extra=[]){
  const holdings=[row('普通預金','預金',1000,'検証銀行(OTS)'),row('国内株','検証株',2000,'検証証券(OKS)'),row('投資信託','検証投信',3000,'検証証券(MIK)'),row('普通預金','子ども預金',400,'検証銀行(RIN)'),row('確定拠出年金','年金',500),row('電子マネー','電子マネー',60),row('ポイント・マイル','通常ポイント',-5),row('ポイント・マイル','検証マイル',70),row('未対応区分','その他残高',80),row('住宅ローン','ローン',-2000),...extra];
  const sums=new Map();for(const h of holdings)sums.set(h.asset_category,(sums.get(h.asset_category)||0)+h.current_value);
  return {format:M.FORMAT,currency:'JPY',asOf:'2026-09-19',retrievedAt:'2026-09-19T15:00:00Z',holdings,categories:[...sums]};
}
function legacy(){const s=M.prepare(C.empty(),packet(),C,id).state;delete s.meClassification;s.settings.accountOwners={};s.settings.members=C.empty().settings.members;s.purposePortfolio=P.defaults();return s;}
const assigned=(s,name)=>{const h=s.holdings.find(h=>h.name===name),a=s.purposePortfolio.assignments.find(a=>a.key===h.key);return s.purposePortfolio.groups.find(g=>g.id===a?.purposeId)?.name;};
test('existing ME snapshots migrate all assets without changing balances, debts or source records',()=>{
  const s=legacy(),before=JSON.stringify(s),result=C.applyMeClassification(s),n=C.validateBackup(result.state);
  assert.equal(result.assigned,s.holdings.length);assert.equal(result.owners,4);assert.equal(JSON.stringify(s),before);
  for(const field of ['holdings','history','imports','transactions','moneyForwardME'])assert.deepEqual(n[field],s[field]);
  assert.equal(P.summarize(n).total,C.summary(s).total);assert.equal(P.summarize(n).groups.find(g=>g.id===P.UNASSIGNED).rows.length,0);
  assert.equal(assigned(n,'検証投信'),'子ども名義資金');assert.equal(assigned(n,'子ども預金'),'子ども名義資金');
  assert.equal(assigned(n,'年金'),'老後資金');assert.equal(assigned(n,'検証株'),'資産形成');assert.equal(assigned(n,'預金'),'預金・待機資金');
  assert.equal(assigned(n,'電子マネー'),'日常支払い');assert.equal(assigned(n,'通常ポイント'),'日常支払い');assert.equal(assigned(n,'検証マイル'),'旅行ポイント');assert.equal(assigned(n,'その他残高'),'その他資産');
  assert.equal(n.meClassification.suggestedKeys.length,n.holdings.length);assert.equal(C.applyMeClassification(n).state,n);
});
test('account tokens are bounded and full-width tolerant; unrelated banks never imply ownership',()=>{
  for(const [account,expected]of [['検証(ｏｔｓ)','OTS'],['検証 OKS','OKS'],['検証-MIK','MIK'],['RIN_検証','RIN'],['SPRING',''],['MIK123',''],['PLOTS','']])assert.equal(MC.tag(account),expected);
  const s=C.applyMeClassification(legacy()).state;
  assert.equal(C.ownerOf(s.holdings.find(h=>h.name==='預金'),s),'夫');assert.equal(C.ownerOf(s.holdings.find(h=>h.name==='検証株'),s),'妻');
  assert.equal(C.ownerOf(s.holdings.find(h=>h.name==='年金'),s),C.UNKNOWN);
});
test('existing row owners, blank account mappings and manual purposes are preserved',()=>{
  let s=legacy();s.settings.accountOwners['検証銀行(OTS)']='';s.settings.accountOwners['検証証券(MIK)']='妻';s.holdings.find(h=>h.name==='子ども預金').owner='夫';
  const h=s.holdings.find(h=>h.name==='預金');s=P.assign(s,[h.key],'education');
  const n=C.applyMeClassification(s).state;
  assert.equal(n.settings.accountOwners['検証銀行(OTS)'],'');assert.equal(n.settings.accountOwners['検証証券(MIK)'],'妻');assert.equal(C.ownerOf(n.holdings.find(h=>h.name==='子ども預金'),n),'夫');
  assert.equal(assigned(n,'預金'),'教育資金');assert.equal(assigned(n,'検証投信'),'資産形成');assert.equal(assigned(n,'子ども預金'),'預金・待機資金');assert.equal(n.meClassification.suggestedKeys.includes(h.key),false);
});
test('manual confirmation and unassignment survive reload and later snapshots; new holdings receive suggestions',()=>{
  let s=M.prepare(C.empty(),packet(),C,id).state;const cash=s.holdings.find(h=>h.name==='預金'),stock=s.holdings.find(h=>h.name==='検証株');
  s=P.assign(s,[cash.key],P.UNASSIGNED);s=P.assign(s,[stock.key],'retirement');
  assert.equal(s.meClassification.suggestedKeys.includes(cash.key),false);assert.equal(s.meClassification.suggestedKeys.includes(stock.key),false);
  assert.equal(C.applyMeClassification(s).state,s);assert.equal(M.prepare(s,packet(),C,id).unchanged,true);
  const p=packet([row('投資信託','新しい投信',90,'検証証券(OKS)')]);p.retrievedAt='2026-09-19T16:00:00Z';
  const n=M.prepare(s,p,C,id2).state;
  assert.equal(assigned(n,'預金'),undefined);assert.equal(assigned(n,'検証株'),'老後資金');assert.equal(assigned(n,'新しい投信'),'資産形成');
  assert.equal(n.meClassification.suggestedKeys.includes(n.holdings.find(h=>h.name==='新しい投信').key),true);
});
test('deleting a provisional group keeps its assets unassigned after reload',()=>{
  let s=M.prepare(C.empty(),packet(),C,id).state;const target=s.purposePortfolio.groups.find(g=>g.name==='日常支払い');
  const keys=s.purposePortfolio.assignments.filter(a=>a.purposeId===target.id).map(a=>a.key);
  s=P.saveGroups(s,s.purposePortfolio.groups.filter(g=>g.id!==target.id));
  assert.ok(keys.every(key=>!s.meClassification.suggestedKeys.includes(key)));assert.equal(C.applyMeClassification(s).state,s);assert.equal(assigned(s,'電子マネー'),undefined);
});
test('same-packet import repairs a legacy snapshot once without adding a history entry',()=>{
  const s=legacy(),r=M.prepare(s,packet(),C,id);
  assert.equal(r.unchanged,false);assert.equal(r.state.imports.length,s.imports.length);assert.deepEqual(r.state.history,s.history);assert.equal(M.prepare(r.state,packet(),C,id).unchanged,true);
});
test('existing purpose names and edited automatic IDs are retained without collisions',()=>{
  const s=legacy();s.purposePortfolio.groups.push({id:'custom-investment',name:'資産形成',horizon:'任意',color:'#123456'},{id:'me-reserve',name:'家の修繕',horizon:'中期',color:'#abcdef'});
  const n=C.validateBackup(C.applyMeClassification(s).state);
  assert.equal(n.purposePortfolio.assignments.find(a=>a.key===n.holdings.find(h=>h.name==='検証株').key).purposeId,'custom-investment');
  assert.equal(n.purposePortfolio.groups.find(g=>g.name==='預金・待機資金').id,'me-reserve-2');
  assert.ok(n.purposePortfolio.groups.some(g=>g.id==='me-reserve'&&g.name==='家の修繕'));
});
test('non-ME workspaces are untouched and malformed tracking is rejected before restore',()=>{
  for(const s of [C.empty(),C.sample()]){const before=JSON.stringify(s);assert.equal(C.applyMeClassification(s).state,s);assert.equal(JSON.stringify(s),before);}
  for(const tracking of [null,{version:2,seenKeys:[],suggestedKeys:[]},{version:1,seenKeys:[],suggestedKeys:['missing']},{version:1,seenKeys:['duplicate','duplicate'],suggestedKeys:[]}]){const s=legacy();s.meClassification=tracking;assert.throws(()=>C.validateBackup(s),/仮分類/);}
});
