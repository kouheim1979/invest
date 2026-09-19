/* UI adapter for the existing browser-local Asset Compass workspace. */
(function(root){
  'use strict';
  const P=root.PurposeCore;
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const yen=value=>value===null?'—':'¥'+Math.round(value).toLocaleString('ja-JP');
  const pct=value=>value===null?'—':value.toLocaleString('ja-JP',{maximumFractionDigits:1})+'%';
  const options=(groups,current)=>[{id:P.UNASSIGNED,name:'未分類'},...groups].map(g=>'<option value="'+esc(g.id)+'"'+(g.id===current?' selected':'')+'>'+esc(g.name)+'</option>').join('');
  const dot=color=>'<span class="purpose-dot" style="--purpose-color:'+color+'" aria-hidden="true"></span>';
  const dates=values=>!values.length?'残高未取込':values.length===1?values[0]+' 時点':values[0]+' 〜 '+values.at(-1)+'（基準日が混在）';
  function create(ctx){
    const {C,state,update,render,toast,showModal,closeModal}=ctx;
    let selected='all',search='',draftGroups=[],draftScope=[];
    const currentHoldings=()=>C.selected(state().holdings,state(),ctx.owner());
    function ring(summary,focus){
      let offset=0;
      const arcs=summary.groups.filter(g=>g.value>0).map(g=>{
        const length=g.percent;
        const arc='<circle cx="160" cy="160" r="124" fill="none" stroke="'+g.color+'" stroke-width="44" pathLength="100" stroke-dasharray="'+length+' '+(100-length)+'" stroke-dashoffset="'+(-offset)+'" transform="rotate(-90 160 160)"'+(selected!=='all'&&selected!==g.id?' opacity=".23"':'')+'/>';
        offset+=length;return arc;
      }).join('');
      return '<div class="purpose-ring"><svg viewBox="0 0 320 320" aria-hidden="true" class="money"><circle cx="160" cy="160" r="124" fill="none" stroke="#263b4d" stroke-width="44"/>'+arcs+'</svg><div class="purpose-ring-center"><span>'+esc(focus?focus.name:'資産合計')+'</span><strong id="purpose-total" class="money">'+yen(summary.count?(focus?focus.value:summary.total):null)+'</strong><small>'+(focus?'資産全体の <span class="money">'+pct(focus.percent)+'</span>':'保有資産の評価額')+'</small></div></div>';
    }
    function page(){
      const s=state(),holdings=currentHoldings();
      // Keep the existing read-only suite bridge current, including demo status.
      C.summary(s,ctx.owner());
      const summary=P.summarize(s,holdings),settings=P.config(s);
      if(selected!=='all'&&!summary.groups.some(g=>g.id===selected))selected='all';
      const focus=summary.groups.find(g=>g.id===selected),rows=focus?focus.rows:holdings,pl=P.profit(rows);
      const unassigned=summary.groups.find(g=>g.id===P.UNASSIGNED);
      const last=s.imports.filter(i=>i.type==='holdings').at(-1);
      const source=last?'最終取込：'+new Date(last.at).toLocaleString('ja-JP')+' · '+last.source:'CSV・表の取り込み、または資産一覧の登録データを使用';
      return '<div id="purpose-page" class="purpose-page">'+
        '<div class="page-head"><div><div class="eyebrow">YOUR MONEY, YOUR PURPOSE</div><h1>目的別ポートフォリオ</h1><p>この資産を、どんな未来に使う？</p></div>'+ctx.filters()+'</div>'+
        '<div class="purpose-source"><div><b><span class="purpose-source-dot" aria-hidden="true"></span>保有資産データと連動</b><span>'+esc(dates(summary.dates))+' · '+summary.count+'資産</span></div><button class="button compact" data-go="import">データを更新 <span aria-hidden="true">↗</span></button></div>'+
        '<section class="panel purpose-card" aria-labelledby="purpose-card-title"><div class="purpose-card-head"><div><h2 id="purpose-card-title">投資目的別ポートフォリオ</h2><p>Myポートフォリオ</p></div><button class="button compact" data-purpose-action="edit-groups">目的を編集</button></div>'+
        '<div class="purpose-composition">'+ring(summary,focus)+'<div class="purpose-legend"><button class="purpose-all" data-purpose-action="select" data-purpose-id="all" aria-pressed="'+(selected==='all')+'">すべての目的<span class="money">'+yen(summary.count?summary.total:null)+'</span></button>'+summary.groups.map(g=>'<button class="purpose-legend-row" data-purpose-action="select" data-purpose-id="'+esc(g.id)+'" aria-pressed="'+(selected===g.id)+'">'+dot(g.color)+'<span class="purpose-name"><b>'+esc(g.name)+'</b><small>'+esc(g.horizon)+' · '+g.rows.length+'資産</small></span><span class="purpose-amount money"><b>'+yen(summary.count?g.value:null)+'</b><small>'+pct(summary.count?g.percent:null)+'</small></span></button>').join('')+'</div></div>'+
        '<div class="purpose-metrics"><div><span>評価損益'+(focus?' · '+esc(focus.name):'')+'</span><strong class="money '+(pl.value<0?'purpose-negative':'purpose-positive')+'">'+(pl.value>0?'+':'')+yen(pl.value)+'</strong><small class="money">'+(pl.percent>0?'+':'')+pct(pl.percent)+'</small><p>取得額がある '+pl.known+' / '+pl.total+'資産で計算</p></div><div><span>未分類の資産</span><strong class="money">'+yen(summary.count?unassigned.value:null)+'</strong><small>'+unassigned.rows.length+'資産</small><p>分類しても資産合計は変わりません</p></div></div>'+
        '<p class="purpose-footnote">'+esc(source)+'。金額は取り込んだ残高のまま表示します。前日比・年初来比は、このデータだけでは算出しません。</p></section>'+
        (!summary.count?'<section class="panel purpose-empty"><span class="purpose-empty-symbol" aria-hidden="true">◎</span><h2>Money Forwardの資産を、目的別に。</h2><p>保有資産一覧のCSV、または見出し付きの表を取り込むと、<br>資産ごとに目的を選べます。</p><button class="button primary" data-go="import">保有資産を取り込む</button><p class="purpose-footnote">入出金や資産推移だけのデータには、分類する資産の内訳がありません。</p></section>':'<section class="panel purpose-assets"><div class="purpose-card-head"><div><h2>資産に目的をつける</h2><p>銘柄・預金ごとに、使い道をひとつ選択。</p></div><button class="button compact" data-purpose-action="bulk">口座ごとに分類</button></div><label class="purpose-search">銘柄・口座を検索<input id="purpose-search" type="search" value="'+esc(search)+'" placeholder="資産名、金融機関、名義" autocomplete="off"></label><div class="purpose-list-caption"><b>'+esc(focus?focus.name:'すべての資産')+'</b><span id="purpose-visible-count"></span></div><div id="purpose-asset-list">'+assetList(rows,settings,summary.assignment)+'</div><p class="purpose-footnote">同じ名義・口座・銘柄・税区分のデータを取り込み直すと、設定した目的を引き継ぎます。別の表記で取り込んだ資産は未分類になります。</p></section>')+
        '<details class="panel purpose-help"><summary>Money Forwardから更新するには</summary><ol><li>Money Forwardで保有資産の一覧を開き、CSVを用意するか、列名を含めて表をコピー。</li><li>「データを更新」からファイルを選ぶか、表を貼り付けて内容を確認。</li><li>種類に「保有資産」を選び、評価額・口座・名義・基準日を確認して取り込む。</li></ol><p>銀行・株式・投資信託など表が分かれている場合は、種類ごとに取り込みます。口座を更新するときは、入替範囲に注意してください。ログインして自動取得する機能はありません。</p><button class="button" data-go="import">取り込み画面を開く</button></details>'+
        '<p class="purpose-storage">目的の分類も資産データと一緒に'+(s.settings.persist?'このブラウザに保存します。':'このタブ内に保持します。')+' <button class="purpose-text-button" data-go="settings">保存・バックアップ設定</button></p></div>';
    }
    function assetList(rows,settings,assignment){
      const q=search.trim().toLocaleLowerCase('ja-JP');
      const found=rows.filter(h=>[h.name,h.symbol,h.account,C.ownerOf(h,state())].join(' ').toLocaleLowerCase('ja-JP').includes(q));
      if(!found.length)return '<p class="purpose-no-results">'+(rows.length?'該当する資産がありません。':'この目的の資産はまだありません。「すべての目的」から分類できます。')+'</p>';
      const visible=found.slice(0,150);
      return visible.map(h=>'<div class="purpose-asset-row"><div class="purpose-asset-info"><b>'+esc(h.name||h.symbol)+'</b><small>'+esc(C.ownerOf(h,state()))+' · '+esc(h.account)+'</small><small>'+esc(h.asOf)+' 時点</small></div><div class="purpose-asset-controls"><strong class="money">'+yen(h.valueJPY)+'</strong><label><span class="sr-only">'+esc(h.name||h.symbol)+'の目的</span><select data-purpose-holding="'+esc(h.id)+'">'+options(settings.groups,assignment.get(h.key)||P.UNASSIGNED)+'</select></label></div></div>').join('')+(found.length>150?'<p class="purpose-footnote">'+found.length+'件のうち先頭150件を表示しています。検索で絞り込めます。</p>':'');
    }
    function editor(){
      showModal('<div class="purpose-editor"><h2>目的を編集</h2><p>目的を削除すると、その資産は未分類に戻ります。</p><div id="purpose-group-fields">'+draftGroups.map((g,i)=>'<div class="purpose-group-field" data-purpose-group="'+i+'"><label>色<input type="color" data-purpose-field="color" value="'+g.color+'"></label><label>目的名<input data-purpose-field="name" value="'+esc(g.name)+'" maxlength="40" required></label><label>期間<input data-purpose-field="horizon" value="'+esc(g.horizon)+'" maxlength="20" placeholder="長期・中期など"></label><button class="purpose-remove" data-purpose-action="remove-group" data-purpose-index="'+i+'" aria-label="'+esc(g.name)+'を削除">×</button></div>').join('')+'</div><button class="button" data-purpose-action="add-group"'+(draftGroups.length>=24?' disabled':'')+'>＋ 目的を追加</button><p id="purpose-editor-error" role="alert"></p><div class="modal-actions"><button class="button" data-action="close-modal">キャンセル</button><button class="button primary" data-purpose-action="save-groups">保存</button></div></div>');
    }
    function readDraft(){
      document.querySelectorAll('[data-purpose-group]').forEach(el=>{const g=draftGroups[Number(el.dataset.purposeGroup)];for(const key of ['name','horizon','color'])g[key]=el.querySelector('[data-purpose-field="'+key+'"]').value.trim();});
    }
    function bulk(){
      const scopes=new Map();
      for(const h of currentHoldings()){
        const owner=C.ownerOf(h,state()),key=JSON.stringify([owner,h.account]);
        if(!scopes.has(key))scopes.set(key,{owner,account:h.account,rows:[]});
        scopes.get(key).rows.push(h);
      }
      draftScope=[...scopes.values()];
      showModal('<div class="purpose-editor"><h2>口座ごとに目的を選ぶ</h2><p>選択した名義・口座内の資産すべてを分類します。既存の目的も置き換わります。</p><label class="field">名義・口座<select id="purpose-bulk-scope">'+draftScope.map((s,i)=>'<option value="'+i+'">'+esc(s.owner+' · '+s.account+'（'+s.rows.length+'資産）')+'</option>').join('')+'</select></label><label class="field">目的<select id="purpose-bulk-target">'+options(P.config(state()).groups,P.UNASSIGNED)+'</select></label><div class="modal-actions"><button class="button" data-action="close-modal">キャンセル</button><button class="button primary" data-purpose-action="save-bulk">この口座に適用</button></div></div>');
    }
    document.addEventListener('click',event=>{
      const b=event.target.closest('[data-purpose-action]');if(!b)return;
      try{
        switch(b.dataset.purposeAction){
          case 'select':selected=b.dataset.purposeId;search='';render();break;
          case 'edit-groups':draftGroups=P.config(state()).groups;editor();break;
          case 'add-group':readDraft();if(draftGroups.length<24)draftGroups.push({id:'purpose-'+C.uid(),name:'',horizon:'',color:'#b397ef'});closeModal();editor();break;
          case 'remove-group':readDraft();draftGroups.splice(Number(b.dataset.purposeIndex),1);closeModal();editor();break;
          case 'save-groups':{
            readDraft();try{update(P.saveGroups(state(),draftGroups));closeModal();render();toast('目的を保存しました。');}catch(error){document.getElementById('purpose-editor-error').textContent='目的名は重複しない名前を入力してください。';}break;
          }
          case 'bulk':bulk();break;
          case 'save-bulk':{
            const scope=draftScope[Number(document.getElementById('purpose-bulk-scope').value)];
            update(P.assign(state(),scope.rows.map(h=>h.key),document.getElementById('purpose-bulk-target').value));closeModal();render();toast(scope.rows.length+'資産の目的を更新しました。');break;
          }
        }
      }catch(error){toast(error.message);}
    });
    document.addEventListener('change',event=>{
      const el=event.target;if(!el.matches('[data-purpose-holding]'))return;
      try{
        const h=state().holdings.find(h=>h.id===el.dataset.purposeHolding);if(!h)return;
        update(P.assign(state(),[h.key],el.value));render();toast('目的を更新しました。');
      }catch(error){toast(error.message);}
    });
    document.addEventListener('input',event=>{
      if(event.target.id!=='purpose-search')return;
      search=event.target.value;const holdings=currentHoldings(),summary=P.summarize(state(),holdings),focus=summary.groups.find(g=>g.id===selected);
      document.getElementById('purpose-asset-list').innerHTML=assetList(focus?focus.rows:holdings,P.config(state()),summary.assignment);
    });
    return {page};
  }
  root.PurposeUI={create};
})(globalThis);
