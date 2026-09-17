/* Read-only adapters for the unified app. Never merge balances or receipt sources. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.SuiteCore=api;})(globalThis,()=>{
'use strict';
const routes={home:[],assets:['overview','holdings','owners'],holdings:[],dividends:['history','receipts','csv','forecast'],settings:['menu','import','storage','consult']};
function route(hash){const [tab,sub]=String(hash||'').replace(/^#/,'').split('/');if(!Object.hasOwn(routes,tab))return{tab:'home',sub:''};return{tab,sub:routes[tab].includes(sub)?sub:(routes[tab][0]||'')};}
const day=()=>new Date(Date.now()+9*3600000).toISOString().slice(0,10);
function receipts(raw,C,asOf=day()){
 const empty={value:null,count:0,missing:0,foreign:0,error:false};
 try{if(raw===null)return empty;const obj=JSON.parse(raw),items=Array.isArray(obj)?obj:obj.receipts;if(!Array.isArray(items))throw Error('receipts');
 const rows=items.map(C.normalizeReceipt).filter(r=>r.date<=asOf),year=+asOf.slice(0,4);
 const current=rows.filter(r=>+r.date.slice(0,4)===year);const result=C.annualReceipts(rows,year,'net',{currency:'JPY'}).at(-1);
 return{value:result.value,count:result.count,missing:result.missing,foreign:current.filter(r=>r.currency!=='JPY').length,error:false};
 }catch{return{...empty,error:true};}
}
function chooseActual(assets,registered,preference='auto'){
 const source=preference==='csv'?'csv':preference==='receipts'?'receipts':assets?.actualCount>0?'csv':registered.count>0?'receipts':'csv';
 return source==='csv'?{source,value:assets?.actualCount>0?assets.actual:null,count:assets?.actualCount||0,missing:0,foreign:0,error:false}:{source,...registered};
}
function assetsSnapshot(s,state,C,asOf=day()){
 const num=x=>typeof x==='number'&&Number.isFinite(x)?x:null;
 return{total:state.holdings.length||state.history.length?num(s.total):null,basis:String(s.totalBasis||''),profit:s.costKnown?num(s.profit):null,actual:num(s.actual),actualCount:s.dividends?.length||0,forecast:s.forecastNetKnown>0?num(s.forecastNet):null,forecastMissing:s.forecastMissing||0,holdingsCount:state.holdings.length,transactionCount:state.transactions.length,dates:s.dates||[],history:state.history.slice(-120).map(h=>({date:String(h.date),total:num(h.total)})),groups:Object.fromEntries(Object.entries(s.groups||{}).filter(([,v])=>num(v)!==null&&v>0)),year:+asOf.slice(0,4)};
}
return{route,day,receipts,chooseActual,assetsSnapshot};
});
