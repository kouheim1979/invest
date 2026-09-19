/* A URL fragment is decoded locally and removed before rendering. Never fetched. */
(async()=>{
  'use strict';
  const C=AssetCore,M=MoneyForwardBridge,$=id=>document.getElementById(id),yen=v=>'¥'+Math.round(v).toLocaleString('ja-JP');
  const fragment=location.hash.slice(1);
  history.replaceState(null,'',location.pathname+location.search);
  let packet=null,packetId='',database=null;
  function status(message){$('status').textContent=message;}
  function open(){return new Promise((resolve,reject)=>{const request=indexedDB.open('asset-compass-v1',1);request.onupgradeneeded=()=>request.result.createObjectStore('workspace');request.onerror=()=>reject(request.error);request.onblocked=()=>reject(Error('ほかの資産コンパスのタブを閉じてください。'));request.onsuccess=()=>resolve(request.result);});}
  function read(key){return new Promise((resolve,reject)=>{const t=database.transaction('workspace','readonly'),r=t.objectStore('workspace').get(key);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
  async function decode(value){
    if(!value.startsWith('me1=')||value.length>300000)throw Error('反映リンクの形式が不正です。');
    if(typeof DecompressionStream==='undefined')throw Error('このブラウザでは連携データを展開できません。最新のSafariまたはChromeで開いてください。');
    const encoded=value.slice(4);if(!/^[a-zA-Z0-9_-]+$/.test(encoded))throw Error('反映リンクが途中で切れています。');
    const bytes=Uint8Array.from(atob(encoded.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
    const reader=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip')).getReader();
    const chunks=[];let length=0;
    for(;;){const {done,value:chunk}=await reader.read();if(done)break;length+=chunk.length;if(length>4000000){await reader.cancel();throw Error('連携データが大きすぎます。');}chunks.push(chunk);}
    const json=await new Blob(chunks).text(),p=M.unpack(JSON.parse(json));
    const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(p)));
    return {packet:p,id:Array.from(new Uint8Array(hash),n=>n.toString(16).padStart(2,'0')).join('')};
  }
  function apply(){return new Promise((resolve,reject)=>{
    // Read and write inside one transaction so another tab cannot race the import.
    const t=database.transaction('workspace','readwrite'),s=t.objectStore('workspace'),r=s.get('data');let output,reason;
    r.onsuccess=()=>{try{const existing=r.result?C.validateBackup(r.result):C.empty();output=M.prepare(existing,packet,C,packetId);if(!output.unchanged){s.put({state:r.result||null,appliedId:packetId},'me-previous');s.put(output.state,'data');}}catch(e){reason=e;t.abort();}};
    t.oncomplete=()=>resolve(output);t.onerror=()=>reject(reason||t.error);t.onabort=()=>reject(reason||t.error||Error('保存が中断されました。'));
  });}
  function undo(){return new Promise((resolve,reject)=>{
    const t=database.transaction('workspace','readwrite'),s=t.objectStore('workspace');let backup,current,remaining=2,reason;
    function finish(){if(--remaining)return;try{if(!backup||current?.moneyForwardME?.id!==backup.appliedId)throw Error('復元対象が変わっています。取り消しできません。');if(backup.state)s.put(C.validateBackup(backup.state),'data');else s.delete('data');s.delete('me-previous');}catch(e){reason=e;t.abort();}}
    const a=s.get('me-previous'),b=s.get('data');a.onsuccess=()=>{backup=a.result;finish();};b.onsuccess=()=>{current=b.result;finish();};
    t.oncomplete=()=>resolve();t.onerror=()=>reject(reason||t.error);t.onabort=()=>reject(reason||t.error);
  });}
  async function refreshRecovery(){const [backup,current]=await Promise.all([read('me-previous'),read('data')]);$('recovery').hidden=!backup||current?.moneyForwardME?.id!==backup.appliedId;}
  $('apply').onclick=async()=>{if(!packet)return;$('apply').disabled=true;status('この端末に保存しています…');try{const result=await apply();$('preview').hidden=true;$('done').hidden=false;$('result').textContent=(result.unchanged?'同じデータはすでに反映済みです。':result.state.holdings.length+'件の資産残高と負債の内訳を保存しました。')+' 取得した明細 '+packet.holdings.length+'件。';status('保存完了 · '+packet.asOf+'のME保存データ');await refreshRecovery();}catch(e){status('反映できませんでした：'+e.message);$('apply').disabled=false;}};
  $('undo').onclick=async()=>{if(!confirm('直前のME反映前の状態へ戻します。反映後の編集も戻ります。よろしいですか？'))return;try{await undo();location.replace('unified.html#assets/overview');}catch(e){status('取り消せません：'+e.message);}};
  try{
    database=await open();await refreshRecovery();
    if(!fragment){$('empty').hidden=false;status('ChatGPTから作成された反映用ページを開いてください。');return;}
    const decoded=await decode(fragment);packet=decoded.packet;packetId=decoded.id;
    const stored=await read('data'),state=stored?C.validateBackup(stored):C.empty(),preview=M.prepare(state,packet,C,packetId),t=M.totals(packet);
    $('assets').textContent=yen(t.assets);$('liabilities').textContent=yen(t.liabilities);$('net').textContent=yen(t.net);
    $('scope').textContent=packet.asOf+'の残高 · '+packet.holdings.length+'明細 · 取得 '+new Date(packet.retrievedAt).toLocaleString('ja-JP');
    $('existing').textContent=preview.unchanged?'このデータは反映済みです。再反映しても重複しません。':state.holdings.length?'登録済みの保有資産 '+state.holdings.length+'件を今回の残高一覧に更新します。更新前のデータは退避します。':'このブラウザには保有資産が未登録です。今回のデータを保存します。';
    $('preview').hidden=false;status('残高の合計と個別明細の一致を確認しました。');
  }catch(e){status('連携データを開けません：'+e.message);$('empty').hidden=false;}
})();
