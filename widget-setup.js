(()=>{
const source=document.getElementById('source'),state=document.getElementById('state'),input=document.getElementById('parameter');
const script=fetch('./widgets/Portfolio.js',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('load');return r.text()}).then(s=>{source.value=s;return s});
script.catch(()=>{state.textContent='コードを取得できません。ページを開き直してください。'});
async function copy(value){try{await navigator.clipboard.writeText(value);state.textContent='コピーしました。'}catch{state.textContent='自動コピーできませんでした。入力欄を長押ししてコピーしてください。'}}
document.getElementById('copyScript').onclick=async()=>{try{await copy(await script)}catch{state.textContent='コードを取得できません。ページを開き直してください。'}};
document.getElementById('copyParameter').onclick=()=>copy(input.value);
try{
 const holdings=JSON.parse(localStorage.getItem('kouheim_portfolio_v2')||'[]'),seen=new Set();
 for(const h of holdings){if(!/^[0-9A-Z]{4,6}\.[TS]$/.test(h.symbol)||seen.has(h.symbol))continue;seen.add(h.symbol);
  const label=document.createElement('label'),check=document.createElement('input');check.type='checkbox';check.value=h.symbol;check.checked=seen.size<=3;
  label.append(check,document.createTextNode(`${h.symbol} ${h.name||''}`));document.getElementById('choices').append(label);
  check.onchange=()=>{input.value=[...document.querySelectorAll('#choices input:checked')].map(x=>x.value).join(',')};
 }
 if(seen.size)input.value=[...document.querySelectorAll('#choices input:checked')].map(x=>x.value).join(',');
}catch{}
})();
