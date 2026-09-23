(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.MFCategoryCorrector=api;
})(globalThis,()=>{
'use strict';
const REQUIRED=['計算対象','日付','内容','金額（円）','保有金融機関','大項目','中項目','メモ','振替','ID'];
const aliases={'金額':'金額（円）','金額(円)':'金額（円）','金融機関':'保有金融機関'};
const clone=x=>JSON.parse(JSON.stringify(x));
const clean=v=>String(v??'').normalize('NFKC').trim();
const headerClean=v=>String(v??'').trim();
const toNum=v=>{const n=Number(String(v??'').replace(/,/g,''));return Number.isFinite(n)?n:null;};
const dir=r=>r.amount>0?'income':r.amount<0?'expense':'zero';
function parseCSV(text){
  text=String(text??'').replace(/^\uFEFF/,'');
  const rows=[];let row=[],field='',quoted=false;
  for(let i=0;i<text.length;i++){
    const ch=text[i];
    if(quoted){
      if(ch==='"'&&text[i+1]==='"'){field+='"';i++;}
      else if(ch==='"')quoted=false;
      else field+=ch;
    }else if(ch==='"')quoted=true;
    else if(ch===','){row.push(field);field='';}
    else if(ch==='\n'){row.push(field.replace(/\r$/,''));rows.push(row);row=[];field='';}
    else field+=ch;
  }
  if(quoted)throw Error('CSVの引用符が閉じていません。');
  if(field.length||row.length){row.push(field.replace(/\r$/,''));rows.push(row);}
  while(rows.length&&rows.at(-1).every(v=>v===''))rows.pop();
  if(rows.length<2)throw Error('明細行がありません。');
  const originalHeaders=rows.shift().map(headerClean);
  const headers=originalHeaders.map(h=>{const n=clean(h);return aliases[n]||n;});
  const missing=REQUIRED.filter(h=>!headers.includes(h));
  if(missing.length)throw Error('Money Forward MEの収入・支出詳細CSVではありません。不足: '+missing.join('、'));
  const idx=Object.fromEntries(headers.map((h,i)=>[h,i]));
  const width=originalHeaders.length;
  const records=rows.filter(r=>r.some(v=>String(v).trim()!=='')).map((r,n)=>{
    const raw=[...r];while(raw.length<width)raw.push('');
    if(raw.length>width){raw[width-1]=raw.slice(width-1).join(',');raw.length=width;}
    const amount=toNum(raw[idx['金額（円）']]);
    if(amount===null)throw Error((n+2)+'行目の金額を読めません。');
    const rec={
      row:n+2,raw,index:n,source:'',counted:clean(raw[idx['計算対象']])==='1',date:clean(raw[idx['日付']]),description:clean(raw[idx['内容']]),amount,
      account:clean(raw[idx['保有金融機関']]),major:clean(raw[idx['大項目']]),minor:clean(raw[idx['中項目']]),memo:raw[idx['メモ']]??'',transfer:clean(raw[idx['振替']])==='1',id:clean(raw[idx['ID']]),
      original:null,change:null,suggestion:null
    };
    rec.original={counted:rec.counted,major:rec.major,minor:rec.minor,transfer:rec.transfer};
    return rec;
  });
  return {headers:originalHeaders,canonicalHeaders:headers,index:idx,records};
}
function csvCell(v){const s=String(v??'');return /[",\r\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;}
function serializeCSV(table,records=table.records){
  const idx=table.index,headers=table.headers;
  const lines=[headers.map(csvCell).join(',')];
  for(const rec of records){
    const raw=[...rec.raw];
    raw[idx['計算対象']]=rec.counted?'1':'0';
    raw[idx['大項目']]=rec.major;
    raw[idx['中項目']]=rec.minor;
    raw[idx['振替']]=rec.transfer?'1':'0';
    lines.push(raw.map(csvCell).join(','));
  }
  return '\uFEFF'+lines.join('\r\n');
}
function builtIns(){return [
  {id:'subway-nfc',name:'横浜市営地下鉄を電車へ',confidence:'high',auto:true,match:{descriptionIncludes:'横浜市営地下鉄/交通利用/NFC',currentMajor:'交通費',currentMinor:'タクシー'},set:{major:'交通費',minor:'電車'},reason:'地下鉄利用がタクシーに誤分類'},
  {id:'qqe-english',name:'QQEを英会話へ',confidence:'high',auto:true,match:{descriptionIncludes:'PAYPAL *QQE',direction:'expense'},set:{major:'教養・教育',minor:'英会話'},reason:'QQE名義の英会話関連支払い'},
  {id:'orix-insurance',name:'オリックス生命の入金を保険金へ',confidence:'high',auto:true,match:{descriptionIncludes:'オリツクスセイメイホケン',direction:'income'},set:{major:'収入',minor:'保険金'},reason:'保険会社からの入金'},
  {id:'benesse-education',name:'ベネッセ教材を教育費へ',confidence:'high',auto:true,match:{descriptionIncludes:'ベネツセコ-ポレ-シヨン',direction:'expense',currentMajor:'日用品'},set:{major:'教養・教育',minor:'通信教育'},reason:'教材費が日用品に分類'},
  {id:'sbi-settlement',name:'SBI証券精算を資金移動へ',confidence:'high',auto:true,match:{descriptionEquals:'SBI証券精算'},set:{major:'現金・カード',minor:'資金移動'},reason:'証券口座との資金移動'},
  {id:'family-wallet-in',name:'かぞくのおさいふ入金を振替へ',confidence:'high',auto:true,match:{descriptionEquals:'入金(残高おまとめ入金)'},set:{major:'現金・カード',minor:'資金移動'},reason:'家族ウォレット内の残高移動'},
  {id:'crypto-charge',name:'暗号資産チャージを資金移動へ',confidence:'high',auto:true,match:{descriptionIncludes:'メルペイからビットコイン',direction:'expense'},set:{major:'現金・カード',minor:'資金移動'},reason:'購入前のチャージで消費ではない'},
  {id:'generic-touch-taxi',name:'タッチ決済のタクシー分類を確認',confidence:'medium',auto:false,match:{descriptionIncludes:'タッチ決済交通利用',currentMajor:'交通費',currentMinor:'タクシー'},set:{major:'交通費',minor:'その他交通費'},reason:'鉄道・バス等の可能性があり交通手段の確認が必要'},
  {id:'card-payment-review',name:'カード引落の二重計上を確認',confidence:'medium',auto:false,match:{descriptionIncludes:'口座振替',direction:'expense',currentMinor:'カード引き落とし',counted:true},set:{major:'現金・カード',minor:'カード引き落とし'},reason:'カード利用明細が別にある場合は二重計上候補'},
  {id:'merpay-settlement-review',name:'メルペイ清算・返済を確認',confidence:'medium',auto:false,match:{descriptionIncludes:'メルペイ(清算・返済)',direction:'expense',counted:true},set:{major:'現金・カード',minor:'カード引き落とし'},reason:'決済本体が別明細なら二重計上候補'}
];}
function validRule(rule){
  if(!rule||typeof rule!=='object')return false;
  if(!clean(rule.id)||!clean(rule.name)||!rule.match||!rule.set)return false;
  const modes=['descriptionIncludes','descriptionEquals','descriptionRegex'];
  if(!modes.some(k=>clean(rule.match[k])))return false;
  if(rule.match.descriptionRegex){try{new RegExp(rule.match.descriptionRegex,'i');}catch{return false;}}
  return true;
}
function matchRule(rec,rule){
  if(!validRule(rule))return false;const m=rule.match,d=rec.description;
  if(m.descriptionIncludes&&!d.includes(clean(m.descriptionIncludes)))return false;
  if(m.descriptionEquals&&d!==clean(m.descriptionEquals))return false;
  if(m.descriptionRegex&&!new RegExp(m.descriptionRegex,'i').test(d))return false;
  if(m.direction&&m.direction!=='any'&&m.direction!==dir(rec))return false;
  if(m.currentMajor&&rec.major!==m.currentMajor)return false;
  if(m.currentMinor&&rec.minor!==m.currentMinor)return false;
  if(m.accountIncludes&&!rec.account.includes(clean(m.accountIncludes)))return false;
  if(typeof m.counted==='boolean'&&rec.counted!==m.counted)return false;
  if(typeof m.transfer==='boolean'&&rec.transfer!==m.transfer)return false;
  return true;
}
function proposal(rec,rule){
  const s=rule.set;
  return {major:clean(s.major)||rec.major,minor:clean(s.minor)||rec.minor,counted:typeof s.counted==='boolean'?s.counted:rec.counted,transfer:typeof s.transfer==='boolean'?s.transfer:rec.transfer};
}
function sameState(rec,next){return rec.major===next.major&&rec.minor===next.minor&&rec.counted===next.counted&&rec.transfer===next.transfer;}
function suggest(records,userRules=[]){
  const rules=[...userRules.filter(validRule).map(r=>({...r,confidence:r.confidence||'high',auto:r.auto!==false,user:true})),...builtIns()];
  for(const rec of records){rec.suggestion=null;for(const rule of rules){if(!matchRule(rec,rule))continue;const next=proposal(rec,rule);if(sameState(rec,next))continue;rec.suggestion={ruleId:rule.id,name:rule.name,reason:rule.reason||rule.name,confidence:rule.confidence||'medium',auto:rule.auto!==false,next};break;}}
  return records;
}
function applySuggestion(rec){if(!rec.suggestion)return false;const before={major:rec.major,minor:rec.minor,counted:rec.counted,transfer:rec.transfer};Object.assign(rec,rec.suggestion.next);rec.change={before,after:{major:rec.major,minor:rec.minor,counted:rec.counted,transfer:rec.transfer},reason:rec.suggestion.reason,ruleId:rec.suggestion.ruleId,confidence:rec.suggestion.confidence};return true;}
function applyHigh(records){let changed=0;for(const r of records)if(r.suggestion?.confidence==='high'&&r.suggestion.auto&&applySuggestion(r))changed++;return changed;}
function applyManual(rec,next,reason='手動修正'){const before={major:rec.major,minor:rec.minor,counted:rec.counted,transfer:rec.transfer};Object.assign(rec,{major:clean(next.major)||rec.major,minor:clean(next.minor)||rec.minor,counted:typeof next.counted==='boolean'?next.counted:rec.counted,transfer:typeof next.transfer==='boolean'?next.transfer:rec.transfer});if(sameState({...rec,...before},rec))return false;rec.change={before,after:{major:rec.major,minor:rec.minor,counted:rec.counted,transfer:rec.transfer},reason,ruleId:'manual',confidence:'manual'};return true;}
function reset(rec){Object.assign(rec,rec.original);rec.change=null;return rec;}
function monthKey(date){const m=clean(date).match(/^(\d{4})[\/-](\d{1,2})/);return m?m[1]+'-'+String(m[2]).padStart(2,'0'):'日付不明';}
function changeLog(records){return records.filter(r=>r.change).map(r=>({source:r.source,row:r.row,date:r.date,description:r.description,amount:r.amount,account:r.account,oldMajor:r.change.before.major,oldMinor:r.change.before.minor,newMajor:r.major,newMinor:r.minor,oldCounted:r.change.before.counted?1:0,newCounted:r.counted?1:0,oldTransfer:r.change.before.transfer?1:0,newTransfer:r.transfer?1:0,reason:r.change.reason,confidence:r.change.confidence,id:r.id}));}
function changeLogCSV(records){const h=['元ファイル','行','日付','内容','金額（円）','金融機関','変更前大項目','変更前中項目','変更後大項目','変更後中項目','変更前計算対象','変更後計算対象','変更前振替','変更後振替','理由','確度','ID'];const rows=changeLog(records).map(x=>[x.source,x.row,x.date,x.description,x.amount,x.account,x.oldMajor,x.oldMinor,x.newMajor,x.newMinor,x.oldCounted,x.newCounted,x.oldTransfer,x.newTransfer,x.reason,x.confidence,x.id]);return '\uFEFF'+[h,...rows].map(r=>r.map(csvCell).join(',')).join('\r\n');}
function checklist(records){const changed=changeLog(records),groups=new Map();for(const x of changed){const k=monthKey(x.date);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(x);}let out='# Money Forward ME 修正チェックリスト\n\n';out+='※ この一覧はME本体を自動変更しません。アプリで同じ月・内容の明細を開き、分類や振替を確認してください。\n\n';for(const [month,items]of [...groups].sort(([a],[b])=>a.localeCompare(b))){out+='## '+month+'（'+items.length+'件）\n\n';for(const x of items){out+='- [ ] '+x.date+' '+x.description+' '+Math.abs(x.amount).toLocaleString('ja-JP')+'円：'+x.oldMajor+' / '+x.oldMinor+' → '+x.newMajor+' / '+x.newMinor;if(x.oldCounted!==x.newCounted)out+='、計算対象 '+x.oldCounted+'→'+x.newCounted;if(x.oldTransfer!==x.newTransfer)out+='、振替 '+x.oldTransfer+'→'+x.newTransfer;out+='（'+x.reason+'）\n';}out+='\n';}return out;}
function stats(records){return {total:records.length,suggested:records.filter(r=>r.suggestion).length,high:records.filter(r=>r.suggestion?.confidence==='high').length,medium:records.filter(r=>r.suggestion?.confidence==='medium').length,changed:records.filter(r=>r.change).length,uncategorized:records.filter(r=>r.major==='未分類'||r.minor==='未分類').length};}
function simulate(records,userRules=[]){
  const copy=clone(records);suggest(copy,userRules);
  const before={};for(const r of copy){const k=r.major+' / '+r.minor;before[k]=(before[k]||0)+Math.abs(r.amount);}
  const changed=applyHigh(copy),after={};for(const r of copy){const k=r.major+' / '+r.minor;after[k]=(after[k]||0)+Math.abs(r.amount);}
  const moves=[];for(const k of new Set([...Object.keys(before),...Object.keys(after)])){const delta=(after[k]||0)-(before[k]||0);if(delta)moves.push({category:k,before:before[k]||0,after:after[k]||0,delta});}
  moves.sort((a,b)=>Math.abs(b.delta)-Math.abs(a.delta));
  return {changed,before,after,moves,records:copy};
}
function mergeTables(items){if(!items.length)throw Error('CSVを選択してください。');const first=items[0].table;const signature=JSON.stringify(first.headers);const records=[];for(const item of items){if(JSON.stringify(item.table.headers)!==signature)throw Error('CSVの列構成が異なります。年ごとに同じ形式で書き出してください。');for(const r of item.table.records){r.source=item.name;records.push(r);}}return {...first,records};}
return {REQUIRED,parseCSV,serializeCSV,builtIns,validRule,matchRule,suggest,applySuggestion,applyHigh,applyManual,reset,changeLog,changeLogCSV,checklist,stats,simulate,mergeTables,clone};
});
