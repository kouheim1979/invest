'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const C=require('../mf-assets/core.js'),P=require('../mf-assets/purpose-core.js');
const csv='名義,保有金融機関,銘柄名,評価額,取得金額,税区分,基準日\n夫,検証証券,検証投信,120000,100000,NISA,2026-09-19\n妻,検証証券,検証投信,90000,,NISA,2026-09-19\n夫,検証銀行,普通預金,50000,,未設定,2026-09-18';
function load(state=C.empty(),text=csv,mode='merge'){
  const parsed=C.parseCSV(text),rows=C.normalize(parsed,'holdings',C.mapping(parsed.headers,'holdings'),{asOf:'2026-09-19'});
  return C.applyImport(state,rows,mode,'検証用CSV').state;
}
const group=(summary,id)=>summary.groups.find(g=>g.id===id);
test('purpose allocation reads imported holdings, includes unassigned, and never adds asset history',()=>{
  let s=load();s.history=[{id:'history',date:'2026-09-19',total:999999}];
  s=P.assign(s,[s.holdings[0].key],'retirement');
  const r=P.summarize(s);assert.equal(r.total,260000);assert.equal(group(r,'retirement').value,120000);assert.equal(group(r,'unassigned').value,140000);
  assert.equal(r.groups.reduce((sum,g)=>sum+g.value,0),C.summary(s).total);
  assert.ok(Math.abs(r.groups.reduce((sum,g)=>sum+g.percent,0)-100)<1e-10);
  assert.deepEqual(r.dates,['2026-09-18','2026-09-19']);
});
test('same holding can have one purpose; assigning changes no financial records',()=>{
  const original=load(),before=JSON.stringify(original),key=original.holdings[0].key;
  const next=P.assign(P.assign(original,[key],'retirement'),[key],'education');
  assert.equal(JSON.stringify(original),before);assert.deepEqual(next.holdings,original.holdings);
  assert.equal(group(P.summarize(next),'retirement').value,0);assert.equal(group(P.summarize(next),'education').value,120000);
  assert.equal(next.purposePortfolio.assignments.length,1);
});
test('updated MF balances retain purpose for merge, account replacement and full replacement',()=>{
  let s=load();s=P.assign(s,[s.holdings[0].key],'retirement');
  for(const mode of ['merge','accounts','all']){
    const next=load(s,csv.replace('120000','145000'),mode),r=P.summarize(next);
    assert.equal(group(r,'retirement').value,145000);assert.equal(r.total,285000);assert.equal(next.holdings.length,3);
    const again=load(next,csv.replace('120000','145000'),mode);assert.equal(P.summarize(again).total,285000);
  }
});
test('same account and name belonging to different owners are independently assigned',()=>{
  let s=load();s=P.assign(s,[s.holdings[0].key],'retirement');s=P.assign(s,[s.holdings[1].key],'education');
  const wife=P.summarize(s,C.selected(s.holdings,s,'妻'));
  assert.equal(wife.total,90000);assert.equal(group(wife,'retirement').value,0);assert.equal(group(wife,'education').value,90000);
});
test('new or renamed identity stays unassigned, deleted holdings are not counted',()=>{
  let s=load();s=P.assign(s,[s.holdings[0].key],'retirement');
  s=load(s,csv.replaceAll('検証投信','検証新投信'),'all');
  assert.equal(group(P.summarize(s),'retirement').value,0);assert.equal(group(P.summarize(s),'unassigned').value,260000);
});
test('purpose group removal safely returns assets to unassigned without changing total',()=>{
  let s=load();s=P.assign(s,[s.holdings[0].key],'retirement');
  const next=P.saveGroups(s,P.config(s).groups.filter(g=>g.id!=='retirement'));
  assert.equal(P.summarize(next).total,260000);assert.equal(group(P.summarize(next),'unassigned').value,260000);
  assert.equal(next.purposePortfolio.assignments.length,0);
});
test('zero and unknown costs are distinct and partial profit is explicitly counted',()=>{
  const s=load();assert.deepEqual(P.profit(s.holdings),{value:20000,percent:20,known:1,total:3});
  assert.deepEqual(P.profit([{valueJPY:50,costJPY:null}]),{value:null,percent:null,known:0,total:1});
  assert.deepEqual(P.profit([{valueJPY:50,costJPY:0}]),{value:50,percent:null,known:1,total:1});
  assert.equal(P.profit([{valueJPY:90,costJPY:100}]).value,-10);
});
test('history-only data and zero balances do not invent holdings or percentages',()=>{
  const s=C.empty();s.history=[{id:'h',date:'2026-09-19',total:100000}];
  assert.equal(P.summarize(s).count,0);assert.equal(P.summarize(s).total,0);assert.equal(P.profit([]).value,null);
  const zero=load(C.empty(),csv.replace(/120000|90000|50000/g,'0'));
  assert.equal(P.summarize(zero).total,0);assert.ok(P.summarize(zero).groups.every(g=>g.percent===0));
});
test('old backups get empty classification and new backups preserve assignments',()=>{
  const old=load();delete old.purposePortfolio;assert.deepEqual(C.validateBackup(old).purposePortfolio,P.defaults());
  const next=P.assign(old,[old.holdings[0].key],'travel');
  assert.deepEqual(C.validateBackup(JSON.parse(JSON.stringify(next))).purposePortfolio,next.purposePortfolio);
});
test('unsafe or inconsistent purpose backup values are rejected before restore',()=>{
  for(const mutate of [
    p=>p.groups[0].color='red; background:url(https://example.invalid)',
    p=>p.groups[0].id='unassigned',
    p=>p.groups[0].name='',
    p=>p.groups[1].name=p.groups[0].name,
    p=>p.assignments=[{key:'asset',purposeId:'missing'}],
    p=>p.assignments=[{key:'asset',purposeId:'travel'},{key:'asset',purposeId:'travel'}]
  ]){const s=load();mutate(s.purposePortfolio);assert.throws(()=>C.validateBackup(s),/目的別/);}
});
test('Money Forward deposit table name alias maps to holdings without transactions',()=>{
  const parsed=C.parseCSV('種類・名称\t残高\t保有金融機関\n普通預金\t123,456円\t検証銀行');
  assert.equal(C.detect(parsed.headers),'holdings');
  const rows=C.normalize(parsed,'holdings',C.mapping(parsed.headers,'holdings'),{asOf:'2026-09-19'});
  assert.equal(rows.records[0].name,'普通預金');assert.equal(rows.records[0].valueJPY,123456);
});
test('demo classifications are isolated and fresh real data is never auto-classified',()=>{
  const a=C.sample(),b=C.empty();assert.ok(P.summarize(a).groups.filter(g=>g.id!=='unassigned').some(g=>g.value>0));
  assert.deepEqual(b.purposePortfolio.assignments,[]);assert.equal(group(P.summarize(load(b)),'unassigned').value,260000);
});
