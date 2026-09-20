'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto'),zlib=require('node:zlib');
const L=require('../broker-receipts-link.js'),{create}=require('../scripts/create-broker-private-link.cjs');
const packet={schema:'asset-compass-broker-receipts',version:1,preparedAt:'2024-04-16',scopeNote:'公開テスト用の架空明細',documents:[{id:'fictional',name:'fictional.csv',kind:'csv',account:'検証用口座',from:'2024-01-01',to:'2024-04-15',coverageFrom:'2024-01-01',coverageTo:'2024-04-15',note:'架空資料'}],receipts:[{id:'r1',account:'検証用口座',date:'2024-03-12',category:'interest',instrument:'',quantity:null,amount:7,currency:'JPY',note:'',sources:[{documentId:'fictional',page:null,line:11}]}]};
const subtle=crypto.webcrypto.subtle;
test('short handoff authenticates and decrypts the complete Japanese packet without a public key or plaintext',async()=>{
 const a=create(packet),b=create(packet);assert.ok(a.url.length<200);assert.notEqual(a.id,b.id);assert.notEqual(a.fragment,b.fragment);
 assert.deepEqual(Object.keys(a.envelope).sort(),['algorithm','ciphertext','iv','version']);const publicText=JSON.stringify(a.envelope);
 assert.ok(!publicText.includes(packet.documents[0].account));assert.ok(!publicText.includes(a.fragment.split('.')[1]));
 assert.deepEqual(await L.unlock(a.fragment,a.envelope,subtle),packet);
});
test('fetch sends only the random file identifier, without key, credentials or referrer',async()=>{
 const a=create(packet);let calls=0;
 const restored=await L.decode(a.fragment,{subtle,fetcher:async(url,options)=>{
  calls++;assert.equal(url,'broker-handoffs/'+a.id+'.json');assert.ok(!url.includes(a.fragment.split('.')[1]));
  assert.equal(options.credentials,'omit');assert.equal(options.referrerPolicy,'no-referrer');assert.equal(options.redirect,'error');
  return new Response(JSON.stringify(a.envelope));
 }});assert.equal(calls,1);assert.deepEqual(restored,packet);
});
test('wrong keys, changed file identifiers and ciphertext tampering all fail authentication',async()=>{
 const a=create(packet),b=create(packet),raw=Buffer.from(a.envelope.ciphertext,'base64url');raw[0]^=1;
 for(const [fragment,envelope] of [[a.fragment.split('.')[0]+'.'+b.fragment.split('.')[1],a.envelope],['#br2='+b.id+'.'+a.fragment.split('.')[1],a.envelope],[a.fragment,{...a.envelope,ciphertext:raw.toString('base64url')}]]){
  await assert.rejects(L.unlock(fragment,envelope,subtle),/取り込みリンク/);
 }
});
test('legacy links remain supported; invalid base64 and truncated links have an actionable error',async()=>{
 const token=zlib.gzipSync(JSON.stringify(packet)).toString('base64url');assert.deepEqual(await L.decode('#br1='+token),packet);
 for(const fragment of ['#br1=A','#br1=not_gzip','#br1=abc!','#br2=../../x.key'])await assert.rejects(L.decode(fragment),/取り込みリンク/);
});
test('missing and malformed envelopes fail without returning any partial data',async()=>{
 const a=create(packet);
 await assert.rejects(L.decode(a.fragment,{fetcher:async()=>new Response('',{status:404})}),/取得できません/);
 await assert.rejects(L.decode(a.fragment,{fetcher:async()=>new Response('{')}),/取得できません/);
 await assert.rejects(L.decode(a.fragment,{fetcher:async()=>new Response('{}')}),/取り込みリンク/);
});
