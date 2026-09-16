(()=>{
'use strict';
if(document.getElementById('dividendNav'))return;
const style=document.createElement('style');style.textContent='.tabs{overflow-x:auto;white-space:nowrap;gap:18px}.dividend-nav{color:inherit;text-decoration:none;opacity:1}.dividend-link{display:inline-block;text-decoration:none;margin-right:6px;min-height:32px}.apple-look .dividend-link{color:#64a8ff}';document.head.appendChild(style);
const tabs=document.querySelector('.tabs');if(tabs){const link=document.createElement('a');link.id='dividendNav';link.className='tab dividend-nav';link.href='./dividends-sheet.html?v=20260916-sheet1';link.textContent='配当10年';tabs.appendChild(link);}
let queued=false;
function decorate(){queued=false;document.querySelectorAll('#body .chart-btn,#mobile .chart-btn').forEach(button=>{if(button.parentElement.querySelector('.dividend-link'))return;const match=String(button.getAttribute('onclick')||'').match(/openChart\('([0-9A-Z]{4,6}\.[TS])'\)/);if(!match)return;const a=document.createElement('a');a.className='edit dividend-link';a.href='./dividends-sheet.html?symbol='+encodeURIComponent(match[1]);a.textContent='配当10年';a.setAttribute('aria-label',match[1]+'の配当シートを開く');button.insertAdjacentElement('afterend',a);});}
const observer=new MutationObserver(()=>{if(!queued){queued=true;requestAnimationFrame(decorate);}});
for(const id of ['body','mobile']){const root=document.getElementById(id);if(root)observer.observe(root,{childList:true,subtree:true});}
decorate();
})();
