'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const S=require('../suite-core.js'),C=require('../dividends-core.js');
const base={symbol:'8306.T',date:'2026-06-01',owner:'OTS',currency:'JPY',net:100};
test('suite routes are allowlisted and direct links preserve subviews',()=>{
 assert.deepEqual(S.route('#assets/holdings'),{tab:'assets',sub:'holdings'});
 assert.deepEqual(S.route('#dividends/receipts'),{tab:'dividends',sub:'receipts'});
 assert.deepEqual(S.route('#settings'),{tab:'settings',sub:'menu'});
 for(const hash of ['#constructor','#toString','#<script>','#https://example.com'])assert.equal(S.route(hash).tab,'home');
 assert.equal(S.route('#assets/unknown').sub,'overview');
});
test('suite receipt adapter uses original normalizer, separates FX and excludes future dates',()=>{
 const input=[base,{...base,id:'2',net:0},{...base,id:'3',currency:'USD',net:20},{...base,id:'4',date:'2026-12-25',net:500}];
 const before=JSON.stringify(input),r=S.receipts(before,C,'2026-09-17');
 assert.deepEqual(r,{value:100,count:2,missing:0,foreign:1,error:false});assert.equal(JSON.stringify(input),before);
 assert.equal(S.receipts(JSON.stringify({receipts:[base]}),C,'2026-09-17').value,100);
});
test('unknown, corrupt and empty receipt data never invent zero income',()=>{
 assert.equal(S.receipts(null,C,'2026-09-17').value,null);
 assert.equal(S.receipts('[]',C,'2026-09-17').value,null);
 assert.equal(S.receipts('{',C,'2026-09-17').error,true);
 assert.equal(S.receipts('{"holdings":[]}',C,'2026-09-17').error,true);
 const r=S.receipts(JSON.stringify([{...base,net:null,gross:200}]),C,'2026-09-17');
 assert.equal(r.value,null);assert.equal(r.missing,1);
 assert.equal(S.receipts(JSON.stringify([{...base,net:0}]),C,'2026-09-17').value,0);
});
test('CSV and registered receipts are alternative sources, never added',()=>{
 const a={actual:500,actualCount:3},r={value:600,count:2,error:false};
 assert.equal(S.chooseActual(a,r).value,500);assert.equal(S.chooseActual(a,r,'receipts').value,600);
 assert.equal(S.chooseActual({...a,actual:0},r).value,0);
 assert.equal(S.chooseActual(null,r).value,600);assert.equal(S.chooseActual(null,r,'csv').value,null);
});
test('asset snapshot preserves original totals and never folds stock value into assets',()=>{
 const state={holdings:[{}],transactions:[],history:[{date:'2026-01-01',total:200}]};
 const original={total:100,profit:3,costKnown:1,actual:0,dividends:[],forecastNet:0,forecastNetKnown:1,dates:[],groups:{cash:100},totalBasis:'登録残高'};
 const before=JSON.stringify({state,original}),r=S.assetsSnapshot(original,state,null,'2026-09-17');
 assert.equal(r.total,100);assert.equal(r.forecast,0);assert.equal(r.year,2026);assert.equal(JSON.stringify({state,original}),before);
 assert.equal(S.assetsSnapshot({...original,forecastNetKnown:0},state,null).forecast,null);
 assert.equal(S.assetsSnapshot(original,{holdings:[],transactions:[],history:[]},null).total,null);
});
test('standalone asset engine remains untouched by suite bridge',()=>{
 const win={},summary=()=>({});win.parent=win;win.AssetCore={summary};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../suite-asset-adapter.js'),'utf8'),{window:win});
 assert.equal(win.AssetCore.summary,summary);
});
test('same-origin bridge coalesces read-only snapshots and keeps original return value',()=>{
 const messages=[],tasks=[],result={total:100,actual:0,dividends:[],dates:[],groups:{}};
 const parent={location:{origin:'https://test.example'},postMessage:(...m)=>messages.push(m)};
 const win={parent,AssetCore:{summary:()=>result},SuiteCore:S};
 const state={holdings:[{}],transactions:[],history:[]};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../suite-asset-adapter.js'),'utf8'),{window:win,parent,location:{origin:'https://test.example',search:'?suite=1'},URLSearchParams,queueMicrotask:f=>tasks.push(f),document:{getElementById:()=>({hidden:true})},console});
 assert.equal(win.AssetCore.summary(state),result);win.AssetCore.summary(state);assert.equal(tasks.length,1);tasks[0]();
 assert.equal(messages.length,1);assert.equal(messages[0][1],'https://test.example');assert.equal(messages[0][0].payload.total,100);
});
test('bridge loads after income policy and before application; original breadcrumb retained',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../mf-assets/index.html'),'utf8');
 assert.ok(html.indexOf('income-policy.js')<html.indexOf('suite-asset-adapter.js'));
 assert.ok(html.indexOf('suite-asset-adapter.js')<html.indexOf('src="app.js'));
 assert.match(html,/id="breadcrumb"/);
 assert.match(fs.readFileSync(path.join(__dirname,'../index.html'),'utf8'),/unified.html/);
 assert.match(fs.readFileSync(path.join(__dirname,'../app.html'),'utf8'),/app-v3.html/);
});
