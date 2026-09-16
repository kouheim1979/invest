/* Pure dividend calculations. No prices, tax rates, or receipts are invented. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.DividendCore=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const TAX={specific:'特定',nisa:'NISA',oldNisa:'旧NISA',juniorNisa:'ジュニアNISA',general:'一般',unknown:'区分未判定'};
const OWNER={OTS:'本人',OKS:'妻',MIK:'MIK',RIN:'RIN'};
const round=x=>Math.round((x+Number.EPSILON)*10000)/10000;
function total(values){const known=values.filter(finite);return{value:known.length?round(known.reduce((a,b)=>a+b,0)):null,known:known.length,missing:values.length-known.length};}
function change(current,previous){return finite(current)&&finite(previous)&&previous>0?(current/previous-1)*100:null;}
function periodMonths(s){const m=/^(\d{4})-(\d{2})$/.exec(String(s));return m&&+m[2]>=1&&+m[2]<=12?+m[1]*12+(+m[2]-1):null;}
function history(series){return(Array.isArray(series?.years)?series.years:[]).filter(r=>periodMonths(r.period)!==null).map(r=>({...r,annual:finite(r.annual)&&r.annual>=0?r.annual:null})).sort((a,b)=>a.period.localeCompare(b.period)).slice(-10);}
function trend(a,b){if(!finite(a?.annual)||!finite(b?.annual))return'データなし';if(periodMonths(a.period)-periodMonths(b.period)!==12)return'期の長さを確認';if(Math.abs(a.annual-b.annual)<0.0001)return'据置';if(a.annual>b.annual)return b.annual===0?'配当開始・再開':'増配';return a.annual===0?'無配へ':'減配';}
function stats(rows){const sum=total(rows.map(r=>r.annual));const first=rows[0],last=rows.at(-1);const span=first&&last?(periodMonths(last.period)-periodMonths(first.period))/12:0;const growth=span>0&&first.annual>0&&finite(last.annual)&&last.annual>0?((last.annual/first.annual)**(1/span)-1)*100:null;return{...sum,span,growth,latest:last?.annual??null};}
function normalizeTax(value){const s=String(value||'').normalize('NFKC').toLowerCase().replace(/[\s_()（）]/g,'');if(['specific','特定','特定口座'].includes(s))return'specific';if(['oldnisa','旧nisa'].includes(s))return'oldNisa';if(['juniornisa','ジュニアnisa'].includes(s))return'juniorNisa';if(['nisa','nisa成長投資枠','成長投資枠','新nisa'].includes(s))return'nisa';if(['general','一般','一般口座'].includes(s))return'general';if(['','unknown','未確認','区分未判定'].includes(s))return'unknown';throw Error('口座区分を確認してください: '+value);}
function amount(value){if(value===null||value===undefined||String(value).trim()==='')return null;if(typeof value==='boolean')throw Error('金額は数値で入力してください');const s=String(value).trim().replace(/,/g,'');if(!/^\d+(?:\.\d+)?$/.test(s))throw Error('金額は0以上の数値で入力してください');const n=Number(s);if(!Number.isFinite(n)||n>1e12)throw Error('金額の範囲を確認してください');return round(n);}
function dateValue(value){const s=String(value||'').trim().replace(/年|月/g,'-').replace(/日$/,'').replace(/\//g,'-');const m=/^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);if(!m)throw Error('受取日はYYYY-MM-DDで指定してください');const d=`${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`;const ts=Date.parse(d+'T00:00:00Z');if(!Number.isFinite(ts)||new Date(ts).toISOString().slice(0,10)!==d)throw Error('存在しない日付です');return d;}
const aliases={id:['id','明細ID'],date:['date','受取日','入金日','支払日'],symbol:['symbol','code','銘柄コード','コード'],name:['name','銘柄名'],owner:['owner','名義'],broker:['broker','証券会社'],accountType:['accountType','taxType','口座区分'],currency:['currency','通貨'],gross:['gross','税引前','税引前配当','配当金額'],tax:['tax','税額','源泉徴収税'],net:['net','税引後','受取額','税引後配当'],note:['note','備考']};
function normalizeReceipt(input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('配当明細の形式が違います');
 const r={};for(const [key,names]of Object.entries(aliases)){for(const name of names)if(Object.hasOwn(input,name)){r[key]=input[name];break;}}
 const text=v=>String(v??'').trim();
 let symbol=text(r.symbol).toUpperCase();if(/^[0-9A-Z]{4}$/.test(symbol))symbol+='.T';if(!/^[A-Z0-9][A-Z0-9.^=-]{0,19}$/.test(symbol))throw Error('銘柄コードが必要です（例: 8306.T）');
 let owner=text(r.owner)||'unknown';if(owner==='本人')owner='OTS';if(owner==='妻')owner='OKS';
 const currency=(text(r.currency)||'JPY').toUpperCase();if(!/^[A-Z]{3}$/.test(currency))throw Error('通貨はJPY・USDなど3文字で指定してください');
 let gross=amount(r.gross),tax=amount(r.tax),net=amount(r.net);
 if(gross===null&&net===null)throw Error('税引前または税引後の配当額が必要です');
 if(gross===null&&net!==null&&tax!==null)gross=round(net+tax);
 if(net===null&&gross!==null&&tax!==null)net=round(gross-tax);
 if(tax===null&&gross!==null&&net!==null)tax=round(gross-net);
 if((net!==null&&net<0)||(tax!==null&&tax<0))throw Error('税額・税引後の金額を確認してください');
 if(gross!==null&&tax!==null&&net!==null&&Math.abs(gross-tax-net)>0.0101)throw Error('税引前−税額と税引後が一致しません');
 return{id:text(r.id).slice(0,160),date:dateValue(r.date),symbol,name:text(r.name).slice(0,100),owner:owner.slice(0,60),broker:text(r.broker).slice(0,60)||'unknown',accountType:normalizeTax(r.accountType),currency,gross,tax,net,note:text(r.note).slice(0,500)};
}
function parseCSV(text){
 text=String(text).replace(/^\uFEFF/,'');const rows=[];let row=[],cell='',quoted=false,afterQuote=false;
 for(let i=0;i<text.length;i++){const c=text[i];if(quoted){if(c==='"'){if(text[i+1]==='"'){cell+='"';i++;}else{quoted=false;afterQuote=true;}}else cell+=c;continue;}
  if(c==='"'){if(cell||afterQuote)throw Error('CSVの引用符を確認してください');quoted=true;}
  else if(c===','){row.push(cell);cell='';afterQuote=false;}
  else if(c==='\n'||c==='\r'){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(v=>v.trim()))rows.push(row);row=[];cell='';afterQuote=false;}
  else{if(afterQuote&&c.trim())throw Error('CSVの引用符の後に文字があります');if(!afterQuote)cell+=c;}
 }
 if(quoted)throw Error('CSVの引用符が閉じられていません');row.push(cell);if(row.some(v=>v.trim()))rows.push(row);
 if(rows.length<2)throw Error('CSVに配当明細がありません');const headers=rows.shift().map(s=>s.trim());if(new Set(headers).size!==headers.length)throw Error('CSVの列名が重複しています');
 return rows.map((r,i)=>{if(r.length!==headers.length)throw Error(`CSV ${i+2}行目の列数が違います`);return Object.fromEntries(headers.map((h,j)=>[h,r[j]]));});
}
function parseInput(text,today){const t=String(text).trim();let data;if(t.startsWith('{')||t.startsWith('[')){const p=JSON.parse(t);data=Array.isArray(p)?p:p.receipts;}else data=parseCSV(t);if(!Array.isArray(data)||!data.length)throw Error('受取配当のreceipts配列またはCSVが必要です。保有株ファイルは別です');if(data.length>10000)throw Error('1回の読込は10,000明細までです');return data.map((r,i)=>{try{const row=normalizeReceipt(r);if(today&&row.date>today)throw Error('未来の受取日は登録できません（予想配当と分離）');return row;}catch(e){throw Error(`${i+1}明細目: ${e.message}`);}});}
function fingerprint(r){return JSON.stringify([r.date,r.symbol,r.owner,r.broker,r.accountType,r.currency,r.gross,r.tax,r.net]);}
function merge(existing,incoming){const next=existing.map(r=>({...r})),ids=new Map(),fingerprints=new Map();const remember=r=>{if(r.id)ids.set(r.id,r);const fp=fingerprint(r),same=fingerprints.get(fp)||[];same.push(r);fingerprints.set(fp,same);};for(const r of next)remember(r);let skipped=0;for(const r of incoming){const fp=fingerprint(r);if(r.id&&ids.has(r.id)){if(fingerprint(ids.get(r.id))!==fp)throw Error('同じ明細IDで内容が異なります: '+r.id);skipped++;continue;}const same=fingerprints.get(fp)||[];if((!r.id&&same.length)||(r.id&&same.some(x=>!x.id))){skipped++;continue;}next.push(r);remember(r);}return{receipts:next.sort((a,b)=>b.date.localeCompare(a.date)),added:next.length-existing.length,skipped};}
function matches(r,f={}){return['owner','broker','accountType','currency','symbol'].every(k=>!f[k]||f[k]==='all'||r[k]===f[k]);}
function annualReceipts(records,end,field,filters={}){return Array.from({length:10},(_,i)=>{const year=end-9+i,rows=records.filter(r=>+r.date.slice(0,4)===year&&matches(r,filters));return{year,count:rows.length,...total(rows.map(r=>r[field]))};});}
function csvCell(value){let s=value==null?'':String(value);if(/^[=+\-@\t\r]/.test(s))s="'"+s;return'"'+s.replace(/"/g,'""')+'"';}
function toCSV(records){const fields=['id','date','symbol','name','owner','broker','accountType','currency','gross','tax','net','note'];return'\uFEFF'+[fields,...records.map(r=>fields.map(f=>r[f]))].map(row=>row.map(csvCell).join(',')).join('\r\n');}
return{TAX,OWNER,finite,total,change,history,trend,stats,normalizeReceipt,parseCSV,parseInput,merge,matches,annualReceipts,toCSV,fingerprint};
});
