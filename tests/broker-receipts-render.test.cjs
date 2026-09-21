'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {readFileSync}=require('node:fs'),{join}=require('node:path'),{runInNewContext}=require('node:vm');
const C=require('../broker-receipts-core.js');
const source=readFileSync(join(__dirname,'../broker-receipts.js'),'utf8');
const doc={id:'empty',name:'fictional.csv',kind:'csv',account:'未確認口座',from:'2024-01-01',to:'2024-12-31',coverageFrom:'2024-01-01',coverageTo:'2024-12-31',note:'',categories:[]};
const packet=documents=>({schema:'asset-compass-broker-receipts',version:1,preparedAt:'2025-01-01',scopeNote:'架空データ',documents,receipts:[]});
function render(p){
 const nodes=new Map();
 const get=id=>{
  if(!nodes.has(id))nodes.set(id,{value:id==='year'?'2024':'',textContent:'',innerHTML:'',classList:{toggle(){}},querySelectorAll(){return[];}});
  return nodes.get(id);
 };
 const saved=JSON.stringify({version:1,current:C.validate(p),previous:null});
 runInNewContext(source,{
  window:{BrokerReceipts:C,addEventListener(){}},document:{getElementById:get},
  localStorage:{getItem(){return saved;}},location:{hash:''}
 });
 return get;
}
test('category-less documents render unknown headline, annual and monthly amounts',()=>{
 const get=render(packet([{...doc}]));
 for(const id of ['received-total','dividend-total','substitute-total','interest-total'])assert.equal(get(id).textContent,'—');
 for(const id of ['annual','monthly']){assert.match(get(id).innerHTML,/未確認/);assert.doesNotMatch(get(id).innerHTML,/¥0/);}
 assert.match(get('detail-count').textContent,/受取額未確認/);
});
test('checked zero stays zero for legacy and dividend-only documents',()=>{
 for(const categories of [undefined,['dividend']]){
  const checked={...doc,categories},get=render(packet([checked]));
  assert.equal(get('received-total').textContent,'¥0');
  assert.equal(get('dividend-total').textContent,'¥0');
  assert.equal(get('interest-total').textContent,categories?'—':'¥0');
 }
});
test('account filter does not borrow known coverage from another account',()=>{
 const p=packet([{...doc},{...doc,id:'checked',account:'確認口座',categories:['dividend']}]),get=render(p);
 assert.equal(get('received-total').textContent,'¥0');
 get('account').value='未確認口座';get('account').onchange();
 assert.equal(get('received-total').textContent,'—');
 get('account').value='確認口座';get('account').onchange();
 assert.equal(get('received-total').textContent,'¥0');
});
