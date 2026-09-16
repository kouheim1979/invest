const {test}=require('node:test');
const assert=require('node:assert/strict');
const C=require('../dividends-core.js');

const receipt=(extra={})=>C.normalizeReceipt({
  date:'2025-06-20',
  symbol:'1234.T',
  name:'検証銘柄',
  owner:'OTS',
  broker:'SBI',
  accountType:'specific',
  currency:'JPY',
  gross:1000,
  tax:200,
  net:800,
  ...extra,
});

test('ID-less import deduplicates against an ID-bearing manual receipt',()=>{
  const manual=receipt({id:'manual-uuid'});
  const imported=receipt({id:''});
  const merged=C.merge([manual],[imported]);
  assert.equal(merged.added,0);
  assert.equal(merged.skipped,1);
  assert.equal(merged.receipts.length,1);
});

test('ID-bearing import deduplicates against an existing ID-less receipt',()=>{
  const imported=receipt({id:''});
  const explicit=receipt({id:'broker-id'});
  const merged=C.merge([imported],[explicit]);
  assert.equal(merged.added,0);
  assert.equal(merged.skipped,1);
  assert.equal(merged.receipts.length,1);
});

test('two distinct explicit IDs may represent separate otherwise-identical deposits',()=>{
  const first=receipt({id:'broker-a'});
  const second=receipt({id:'broker-b'});
  const merged=C.merge([first],[second]);
  assert.equal(merged.added,1);
  assert.equal(merged.skipped,0);
  assert.equal(merged.receipts.length,2);
});
