/* Loaded after income-policy and before app.js. Same-origin, read-only summary bridge. */
(()=>{
'use strict';
if(window.parent===window||!new URLSearchParams(location.search).has('suite'))return;
try{if(parent.location.origin!==location.origin)return;}catch{return;}
const C=window.AssetCore,S=window.SuiteCore;if(!C||!S)return;
const original=C.summary;let pending=null,queued=false;
C.summary=function(state,...args){
 const result=original.call(this,state,...args);
 try{
 const asOf=S.day(),all=original.call(this,state,'all',+asOf.slice(0,4),asOf);
 pending=S.assetsSnapshot(all,state,C,asOf);
 if(!queued){queued=true;queueMicrotask(()=>{queued=false;const banner=document.getElementById('demo-banner');parent.postMessage({type:'portfolio-suite:assets',version:1,payload:{...pending,demo:!!banner&&!banner.hidden}},location.origin);});}
 }catch(error){console.warn('Unified summary unavailable',error);}
 return result;
};
})();
