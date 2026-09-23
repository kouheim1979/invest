const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('../mf-assets/category-corrector-core.js');

const csv='計算対象,日付,内容,金額（円）,保有金融機関,大項目,中項目,メモ,振替,ID\n'
+'1,2026/08/27,横浜市営地下鉄/交通利用/NFC,-484,カード,交通費,タクシー,,0,A1\n'
+'1,2026/08/18,PAYPAL *QQE,-9680,カード,その他,雑費,,0,A2\n'
+'1,2026/02/27,振込2 オリツクスセイメイホケン(カ,100017,銀行,未分類,未分類,,0,A3\n'
+'1,2026/07/29,ベネツセコ-ポレ-シヨン,-5980,カード,日用品,子育て用品,,0,A4\n'
+'1,2026/09/15,SBI証券精算,463114,銀行,未分類,未分類,,0,A5\n'
+'1,2026/09/14,"入金(残高おまとめ入金)",10000,財布,収入,かぞくのおさいふ,,0,A6\n'
+'1,2026/08/28,"商品, 返品",-1000,カード,未分類,未分類,"メモ,あり",0,A7';

test('Money Forwardの引用符付きCSVを読める',()=>{
  const t=C.parseCSV(csv);
  assert.equal(t.records.length,7);
  assert.equal(t.records[6].description,'商品, 返品');
  assert.equal(t.records[6].memo,'メモ,あり');
});

test('既知の誤分類を確度高候補として検出する',()=>{
  const t=C.parseCSV(csv); C.suggest(t.records);
  assert.deepEqual(t.records.slice(0,6).map(r=>r.suggestion?.ruleId),[
    'subway-nfc','qqe-english','orix-insurance','benesse-education','sbi-settlement','family-wallet-in'
  ]);
  assert.equal(C.stats(t.records).high,6);
});

test('確度高だけ一括適用し、金額とIDを保持する',()=>{
  const t=C.parseCSV(csv); C.suggest(t.records);
  assert.equal(C.applyHigh(t.records),6);
  assert.equal(t.records[0].minor,'電車');
  assert.equal(t.records[4].counted,true);
  assert.equal(t.records[4].transfer,false);
  assert.equal(t.records[4].amount,463114);
  assert.equal(t.records[4].id,'A5');
});

test('自作ルールは標準ルールより優先される',()=>{
  const t=C.parseCSV(csv);
  C.suggest(t.records,[{id:'custom',name:'独自',confidence:'high',auto:true,match:{descriptionIncludes:'QQE'},set:{major:'教養・教育',minor:'オンライン英会話'}}]);
  assert.equal(t.records[1].suggestion.ruleId,'custom');
  assert.equal(t.records[1].suggestion.next.minor,'オンライン英会話');
});

test('補正CSVを再読込しても列・ID・引用符を保持する',()=>{
  const t=C.parseCSV(csv); C.suggest(t.records); C.applyHigh(t.records);
  const round=C.parseCSV(C.serializeCSV(t));
  assert.equal(round.headers[3],'金額（円）');
  assert.equal(round.records[0].minor,'電車');
  assert.equal(round.records[4].counted,true);
  assert.equal(round.records[4].transfer,false);
  assert.equal(round.records[6].description,'商品, 返品');
});

test('月別ME修正リストを作る',()=>{
  const t=C.parseCSV(csv); C.suggest(t.records); C.applyHigh(t.records);
  const md=C.checklist(t.records);
  assert.match(md,/2026-08/);
  assert.match(md,/横浜市営地下鉄/);
  assert.match(md,/2026-09/);
});

test('シミュレーションは分類だけを動かし金額・計算対象・振替を保持する',()=>{
  const t=C.parseCSV(csv),before=t.records.map(r=>({amount:r.amount,counted:r.counted,transfer:r.transfer}));
  const sim=C.simulate(t.records);
  assert.equal(sim.changed,6);
  assert.ok(sim.moves.some(x=>x.category==='交通費 / 電車'&&x.delta===484));
  assert.deepEqual(t.records.map(r=>({amount:r.amount,counted:r.counted,transfer:r.transfer})),before);
  assert.deepEqual(sim.records.map(r=>({amount:r.amount,counted:r.counted,transfer:r.transfer})),before);
});
