/* Read a private ME packet from stdin; write the handoff OUTSIDE the public repo.
 * node scripts/create-me-handoff.cjs /absolute/private/path/me-handoff.html < packet.json
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib');
const M=require('../mf-assets/me-core.js');
const output=path.resolve(process.argv[2]||''),repo=path.resolve(__dirname,'..');
if(!process.argv[2]||output===repo||output.startsWith(repo+path.sep))throw Error('Write private handoff files outside this public repository.');
const p=M.validate(JSON.parse(fs.readFileSync(0,'utf8'))),strings=[],index=s=>{let i=strings.indexOf(s);if(i<0){i=strings.length;strings.push(s);}return i;};
const packed={v:1,d:p.asOf,t:p.retrievedAt,s:strings,h:p.holdings.map(h=>[...['institution_name','account_name','asset_category','name'].map(k=>index(h[k])),h.current_value]),c:p.categories.map(([name,value])=>[index(name),value])};
const token=zlib.gzipSync(JSON.stringify(packed),{level:9}).toString('base64url');
const url='https://kouheim1979.github.io/invest/me-import.html#me1='+token;
const t=M.totals(p),yen=n=>Math.round(n).toLocaleString('ja-JP')+'円';
const html=`<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><title>資産コンパスへ反映 · ${p.asOf}</title><style>html{font:16px/1.7 system-ui,sans-serif;background:#071521;color:#edf7fa}body{max-width:640px;margin:0 auto;padding:28px 20px}h1{font-size:1.8rem}a{display:block;background:#85e2d4;color:#09252c;padding:17px;border-radius:12px;text-align:center;text-decoration:none;font-weight:700;margin:28px 0}dt{color:#a9c9d8}dd{font-size:1.4rem;margin:0 0 18px;font-weight:700}p{color:#bdd0dc}</style><h1>資産コンパスへ反映</h1><p>マネーフォワード ME · ${p.asOf}の保存データ<br>${t.sourceCount}明細を取得・照合済み</p><dl><dt>資産総額</dt><dd>${yen(t.assets)}</dd><dt>負債残高</dt><dd>${yen(t.liabilities)}</dd><dt>純資産</dt><dd>${yen(t.net)}</dd></dl><a href="${url}" target="_blank" rel="noopener noreferrer">資産コンパスにデータを渡す</a><p>開いた画面で「この端末へ反映する」を押してください。普段使っている資産コンパスと同じブラウザで開くと、その保存先に反映されます。MEからのCSV書き出しは不要です。</p><p>今回取得した残高を反映します。常時自動同期ではありません。</p><p>このファイルと反映リンクには金融データが含まれます。ご本人用として保管してください。</p></html>`;
fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,html);
console.log(JSON.stringify({output,sourceCount:t.sourceCount,assets:t.assets,liabilities:t.liabilities,net:t.net,urlLength:url.length}));
