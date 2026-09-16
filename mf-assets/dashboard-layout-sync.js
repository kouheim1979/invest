/* Keeps late diagnostic insertions inside the redesigned dashboard grid. */
(function(){
'use strict';
const main=document.querySelector('#main');if(!main)return;
let queued=false;
function sync(){queued=false;if(document.querySelector('#nav button.active')?.dataset.view!=='dashboard')return;const diag=main.querySelector('#income-diagnostic');const slot=main.querySelector('.dashboard-history-card');if(!diag||diag===slot||!main.querySelector('.dashboard-v3'))return;diag.classList.add('panel','dashboard-history-card','dashboard-diagnostic-live');const h=diag.querySelector('.panel-head h2');if(h)h.textContent='最近の取込・診断結果';const p=diag.querySelector('.panel-head p');if(p)p.textContent='配当認識・年別集計・除外状況';if(slot)slot.replaceWith(diag);}
function schedule(){if(queued)return;queued=true;requestAnimationFrame(sync);}
new MutationObserver(schedule).observe(main,{childList:true,subtree:true});schedule();
})();
