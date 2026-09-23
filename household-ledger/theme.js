
(()=>{'use strict';
const KEY='household-ledger-theme';
const modes=['system','light','dark'];
const meta=document.querySelector('meta[name="theme-color"]');
const mq=window.matchMedia('(prefers-color-scheme: dark)');
const labels={system:'端末設定',light:'ライト',dark:'ダーク'};
const icons={system:'◐',light:'☀︎',dark:'☾'};
function stored(){try{const v=localStorage.getItem(KEY);return modes.includes(v)?v:'system';}catch{return 'system';}}
function resolved(mode){return mode==='dark'||(mode==='system'&&mq.matches)?'dark':'light';}
function sync(mode){
  const r=resolved(mode);
  document.documentElement.dataset.theme=r;
  document.documentElement.dataset.themeMode=mode;
  if(meta)meta.content=r==='dark'?'#111417':'#f58220';
  const b=document.getElementById('themeToggle');
  if(b){
    b.dataset.mode=mode;
    b.title='テーマ：'+labels[mode]+'（クリックで切替）';
    b.setAttribute('aria-label','テーマ：'+labels[mode]+'。クリックで切り替える');
    const i=b.querySelector('.theme-icon'); if(i)i.textContent=icons[mode];
    const l=b.querySelector('.theme-text'); if(l)l.textContent=labels[mode];
  }
  const s=document.getElementById('themeSelect');if(s)s.value=mode;
}
function apply(mode,persist=true){
  if(!modes.includes(mode))mode='system';
  if(persist){try{localStorage.setItem(KEY,mode);}catch{}}
  sync(mode);
}
document.addEventListener('DOMContentLoaded',()=>{
  apply(stored(),false);
  document.getElementById('themeToggle')?.addEventListener('click',()=>{
    const current=stored(),next=modes[(modes.indexOf(current)+1)%modes.length];
    apply(next,true);
  });
  document.getElementById('themeSelect')?.addEventListener('change',e=>apply(e.target.value,true));
});
mq.addEventListener?.('change',()=>{if(stored()==='system')sync('system');});
window.HouseholdTheme={apply,getMode:stored,resolved:()=>resolved(stored())};
})();
