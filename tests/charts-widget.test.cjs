const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
test('chart keeps dates aligned, ignores missing values and handles flat prices',()=>{
 const code=read('charts.js').split("document.getElementById('toast')")[0]+'})();';
 const ctx=vm.createContext({window:{},nf:n=>String(n)});vm.runInContext(code,ctx);
 const api=ctx.window.PortfolioChart,t=Date.parse('2026-09-09')/1000;
 const p=api.pointsFor([[t,100],[t-86400,null],[t-86400,100],[t-86400*100,50],[t,101],[t+1,NaN]],1);
 assert.deepEqual(JSON.parse(JSON.stringify(p)),[[t-86400,100],[t,101]]);
 assert.doesNotMatch(api.plot([[t-86400,100],[t,100]],100),/NaN|Infinity/);
 assert.match(api.plot(p,100),/stroke-dasharray/);
});
async function widget({offline=false,parameter='8306.T',family='medium',cached}={}){
 const texts=[],urls=[],memory=new Map(cached?[['cache',JSON.stringify(cached)]]:[]);
 const packet={updatedAt:new Date().toISOString(),quotes:{'8306.T':{price:1500,prev:null,time:'09/09 15:30'}}};
 class Stack {addText(s){texts.push(s);return{}}addSpacer(){}addStack(){return new Stack()}setPadding(){}async presentMedium(){}}
 const ctx=vm.createContext({args:{widgetParameter:parameter},config:{widgetFamily:family,runsInWidget:true},
 FileManager:{local:()=>({joinPath:()=> 'cache',cacheDirectory:()=>'',writeString:(k,v)=>memory.set(k,v),readString:k=>{if(!memory.has(k))throw Error();return memory.get(k)}})},
 Request:class{constructor(url){urls.push(url);this.response={statusCode:200}}async loadJSON(){if(offline)throw Error('offline');return packet}},
 ListWidget:Stack,Color:class{static white(){return{}}},Font:{boldSystemFont(){},mediumSystemFont(){}},Script:{setWidget(w){ctx.output=w},complete(){}}});
 await vm.runInContext('(async()=>{'+read('widgets/Portfolio.js')+'})()',ctx);
 return{texts,urls,memory,output:ctx.output};
}
test('widget shows missing previous close honestly and requests no personal holdings',async()=>{
 const w=await widget();assert.ok(w.texts.includes('前日比 —'));assert.ok(w.texts.includes('¥1,500'));
 assert.equal(w.urls.length,1);assert.doesNotMatch(w.urls[0],/shares|cost|owner|8306/);
 assert.match(w.output.url,/app-v3/);
});
test('widget offline fallback retains original timestamp and flags saved data',async()=>{
 const w=await widget({offline:true,cached:{updatedAt:'2026-01-01T00:00:00Z',quotes:{'8306.T':{price:100,prev:90,time:'01/01 09:00'}}}});
 assert.ok(w.texts.includes('保存値 01/01 09:00'));assert.ok(w.texts.includes('通信失敗・前回の保存値'));assert.ok(w.texts.includes('¥100'));
});
test('widget without data does not invent prices; invalid parameter has an explanation',async()=>{
 const w=await widget({offline:true});assert.ok(w.texts.includes('未取得'));
 const bad=await widget({parameter:'../../oops'});assert.ok(bad.texts.includes('Parameterに銘柄コードを入力'));
});
