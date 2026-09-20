/* Only <id>.json is publishable. link.json must remain private and outside this repo. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),zlib=require('node:zlib'),C=require('../broker-receipts-core.js');
function create(packet){
 const p=C.validate(packet),id=crypto.randomBytes(16).toString('hex'),key=crypto.randomBytes(32),iv=crypto.randomBytes(12);
 const cipher=crypto.createCipheriv('aes-256-gcm',key,iv);cipher.setAAD(Buffer.from('asset-compass/broker-receipts/v2/'+id));
 const ciphertext=Buffer.concat([cipher.update(zlib.gzipSync(JSON.stringify(p),{level:9})),cipher.final(),cipher.getAuthTag()]);
 const envelope={version:2,algorithm:'AES-GCM',iv:iv.toString('base64url'),ciphertext:ciphertext.toString('base64url')};
 const fragment='#br2='+id+'.'+key.toString('base64url');
 return{id,envelope,fragment,url:'https://kouheim1979.github.io/invest/broker-receipts.html?v=20260920-2'+fragment};
}
if(require.main===module){
 const output=path.resolve(process.argv[2]||''),repo=path.resolve(__dirname,'..');
 if(!process.argv[2]||output===repo||output.startsWith(repo+path.sep))throw Error('Keep handoff keys outside the public repository.');
 const result=create(JSON.parse(fs.readFileSync(0,'utf8')));fs.mkdirSync(output,{recursive:true});
 fs.writeFileSync(path.join(output,result.id+'.json'),JSON.stringify(result.envelope));
 fs.writeFileSync(path.join(output,'link.json'),JSON.stringify({id:result.id,url:result.url},null,2),{mode:0o600});
 console.log(JSON.stringify({id:result.id,ciphertextPath:path.join(output,result.id+'.json'),privateLinkPath:path.join(output,'link.json'),urlLength:result.url.length}));
}
module.exports={create};
