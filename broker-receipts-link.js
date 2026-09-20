/* Encrypted handoffs: the decryption key lives only in the URL fragment. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.BrokerReceiptLink=api;})(globalThis,()=>{
'use strict';
const INVALID='取り込みリンクが壊れているか、途中で切れています。新しい専用リンクから開き直してください。';
const LIMIT=2000000;
function bytes(token,max=300000){
 if(typeof token!=='string'||!token.length||token.length>max||!/^[A-Za-z0-9_-]+$/.test(token)||token.length%4===1)throw Error(INVALID);
 try{return Uint8Array.from(atob(token.replace(/-/g,'+').replace(/_/g,'/').padEnd(Math.ceil(token.length/4)*4,'=')),c=>c.charCodeAt(0));}catch{throw Error(INVALID);}
}
async function collect(stream,limit=LIMIT){
 const reader=stream.getReader(),chunks=[];let size=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>limit)throw Error('取り込みデータが大きすぎます。');chunks.push(value);}}catch(e){await reader.cancel().catch(()=>{});throw e;}
 const result=new Uint8Array(size);let at=0;for(const c of chunks){result.set(c,at);at+=c.length;}return result;
}
async function inflate(data){
 if(typeof DecompressionStream==='undefined')throw Error('このブラウザではリンクを開けません。Safariで専用リンクを開いてください。');
 try{const out=await collect(new Blob([data]).stream().pipeThrough(new DecompressionStream('gzip')));return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(out));}catch{throw Error(INVALID);}
}
async function unlock(fragment,envelope,subtle=globalThis.crypto?.subtle){
 const match=/^#br2=([a-f0-9]{32})\.([A-Za-z0-9_-]{43})$/.exec(fragment);if(!match)throw Error(INVALID);
 if(!subtle)throw Error('安全な接続で開いてください。Safariから専用リンクを開き直せます。');
 if(!envelope||envelope.version!==2||envelope.algorithm!=='AES-GCM')throw Error(INVALID);
 const key=bytes(match[2],43),iv=bytes(envelope.iv,16),ciphertext=bytes(envelope.ciphertext);
 if(key.length!==32||iv.length!==12||ciphertext.length<16)throw Error(INVALID);
 let compressed;
 try{const imported=await subtle.importKey('raw',key,{name:'AES-GCM'},false,['decrypt']);compressed=await subtle.decrypt({name:'AES-GCM',iv,additionalData:new TextEncoder().encode('asset-compass/broker-receipts/v2/'+match[1]),tagLength:128},imported,ciphertext);}catch{throw Error(INVALID);}
 return inflate(new Uint8Array(compressed));
}
async function decode(fragment,{fetcher=globalThis.fetch,subtle=globalThis.crypto?.subtle}={}){
 if(fragment.startsWith('#br1='))return inflate(bytes(fragment.slice(5)));
 const match=/^#br2=([a-f0-9]{32})\.([A-Za-z0-9_-]{43})$/.exec(fragment);if(!match)throw Error(INVALID);
 const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),15000);let envelope;
 try{const response=await fetcher('broker-handoffs/'+match[1]+'.json',{method:'GET',credentials:'omit',referrerPolicy:'no-referrer',cache:'no-store',redirect:'error',signal:abort.signal});
  if(!response.ok)throw Error('明細を取得できませんでした。専用リンクからもう一度開いてください。');
  const raw=await collect(response.body,400000);envelope=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(raw));
 }catch(error){if(error.name==='AbortError')throw Error('読み込みに時間がかかっています。通信を確認して専用リンクから開き直してください。');throw Error('明細を取得できませんでした。専用リンクからもう一度開いてください。');}finally{clearTimeout(timer);}
 return unlock(fragment,envelope,subtle);
}
return{INVALID,bytes,inflate,unlock,decode};
});
