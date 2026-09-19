/* Money Forward ME handoff. Pure data conversion; no credentials or network. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.MoneyForwardBridge=api;
})(globalThis,()=>{
  'use strict';
  const FORMAT='asset-compass-me/v1';
  const debts=new Set(['クレジットカード利用残高','住宅ローン','自動車ローン','カードローン','その他負債','奨学金','借入金','その他ローン']);
  const classes={'普通預金':'預金・現金','定期預金':'預金・現金','その他預金':'預金・現金','外貨預金':'預金・現金','預り金・MRF':'預金・現金','電子マネー':'預金・現金','現金':'預金・現金','国内株':'国内株式','外国株':'外国株式','投資信託':'投資信託','確定拠出年金':'年金','ポイント・マイル':'ポイント','債券':'債券','暗号資産':'暗号資産'};
  const clone=x=>JSON.parse(JSON.stringify(x));
  const fail=message=>{throw Error(message);};
  const str=x=>typeof x==='string'&&x.length>0&&x.length<=500;
  function validDay(x){return typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&Number.isFinite(Date.parse(x))&&new Date(x).toISOString().slice(0,10)===x;}
  const key=h=>JSON.stringify([h.institution_name,h.account_name,h.asset_category,h.name]);
  function validate(p){
    if(!p||p.format!==FORMAT||p.currency!=='JPY'||!validDay(p.asOf)||typeof p.retrievedAt!=='string'||!Number.isFinite(Date.parse(p.retrievedAt))||!Array.isArray(p.holdings)||!p.holdings.length||p.holdings.length>10000||!Array.isArray(p.categories)||!p.categories.length||p.categories.length>100)fail('ME連携データの形式を確認してください。');
    const sums=new Map(),seen=new Set();
    for(const h of p.holdings){
      if(!h||!['institution_name','account_name','asset_category','name'].every(k=>str(h[k]))||!Number.isFinite(h.current_value)||Math.abs(h.current_value)>1e15)fail('ME明細に不正な値があります。');
      if(debts.has(h.asset_category)?h.current_value>0:h.current_value<0&&h.asset_category!=='ポイント・マイル')fail('未対応の符号・資産区分です。元の残高は変更しません。');
      sums.set(h.asset_category,(sums.get(h.asset_category)||0)+h.current_value);
    }
    for(const c of p.categories){
      if(!Array.isArray(c)||c.length!==2||!str(c[0])||!Number.isFinite(c[1])||seen.has(c[0])||!sums.has(c[0])||Math.abs(sums.get(c[0])-c[1])>.01)fail('残高合計と個別明細が一致しません。ChatGPTで同じ時点のデータを取得し直してください。');
      seen.add(c[0]);
    }
    if(sums.size!==seen.size)fail('残高合計に未確認の資産区分があります。');
    return p;
  }
  function unpack(p){
    if(p?.format===FORMAT)return validate(p);
    if(!p||p.v!==1||!Array.isArray(p.s)||p.s.length>30000||!p.s.every(str)||!Array.isArray(p.h)||p.h.length>10000||!Array.isArray(p.c)||p.c.length>100)fail('未対応のME連携データです。');
    const s=i=>{if(!Number.isInteger(i)||i<0||i>=p.s.length)fail('ME連携データが途中で切れています。');return p.s[i];};
    return validate({format:FORMAT,currency:'JPY',asOf:p.d,retrievedAt:p.t,
      holdings:p.h.map(r=>{if(!Array.isArray(r)||r.length!==5)fail('ME明細の形式が不正です。');return {institution_name:s(r[0]),account_name:s(r[1]),asset_category:s(r[2]),name:s(r[3]),current_value:r[4]};}),
      categories:p.c.map(r=>{if(!Array.isArray(r)||r.length!==2)fail('ME集計の形式が不正です。');return [s(r[0]),r[1]];})});
  }
  function totals(p){
    validate(p);let assets=0,liabilities=0;
    for(const [name,value]of p.categories){if(debts.has(name))liabilities-=value;else assets+=value;}
    return {assets,liabilities,net:assets-liabilities,sourceCount:p.holdings.length};
  }
  function grouped(p){
    const rows=new Map();
    for(const h of p.holdings){const k=key(h);if(!rows.has(k))rows.set(k,{...h,current_value:0,sourceCount:0});const row=rows.get(k);row.current_value+=h.current_value;row.sourceCount++;}
    return [...rows.values()];
  }
  function prepare(state,packet,C,id){
    const p=validate(packet);
    if(p.asOf>C.today())fail('未来日の残高は取り込めません。');
    const oldMeta=state.moneyForwardME;
    if(oldMeta&&Date.parse(p.retrievedAt)<Date.parse(oldMeta.packet.retrievedAt))fail('この端末には、より新しいMEデータが反映済みです。');
    if(oldMeta?.id===id)return {state,unchanged:true,retained:0,...totals(p)};
    const next=clone(state),old=state.holdings,used=new Set(),assignments=new Map((state.purposePortfolio?.assignments||[]).map(a=>[a.key,a.purposeId]));
    let retained=0;
    next.holdings=grouped(p).filter(h=>!debts.has(h.asset_category)).map(h=>{
      const stable='me:'+key(h),assetClass=classes[h.asset_category]||'その他';
      let candidates=old.filter(o=>o.key===stable);
      if(!candidates.length)candidates=old.filter(o=>!o.key.startsWith('me:')&&o.account===h.account_name&&o.name===h.name&&o.assetClass===assetClass);
      // Without a position ID/tax lot, only an unambiguous one-to-one match can carry fields.
      const prior=candidates.length===1&&!used.has(candidates[0].id)&&(candidates[0].key===stable||h.sourceCount===1)?candidates[0]:null;
      const row={id:prior?.id||C.uid(),key:stable,name:h.name,symbol:'',valueJPY:h.current_value,costJPY:null,quantity:null,account:h.account_name,owner:'',assetClass,annualDps:null,dividendUnit:assetClass==='投資信託'?10000:1,months:[],taxType:C.UNKNOWN,asOf:p.asOf,currency:'JPY',fx:1,source:'Money Forward ME / ChatGPT',meCategory:h.asset_category,meInstitution:h.institution_name,meSourceCount:h.sourceCount};
      if(prior){
        used.add(prior.id);retained++;
        // Ownership and purpose remain meaningful when valuations change. Quantities,
        // cost and tax lots are not supplied by this connector: never present old values as fresh.
        row.owner=prior.owner;
        if(assignments.has(prior.key))assignments.set(stable,assignments.get(prior.key));
      }
      return row;
    });
    if(next.purposePortfolio)next.purposePortfolio.assignments=[...assignments].map(([key,purposeId])=>({key,purposeId}));
    const t=totals(p),history=next.history.find(h=>h.date===p.asOf);
    const point={id:history?.id||C.uid(),date:p.asOf,total:t.assets,source:'Money Forward ME / ChatGPT'};
    next.history=next.history.filter(h=>h.date!==p.asOf).concat(point).sort((a,b)=>a.date.localeCompare(b.date));
    next.moneyForwardME={id,packet:clone(p),importedAt:new Date().toISOString()};
    next.imports.push({id:C.uid(),at:next.moneyForwardME.importedAt,source:'Money Forward ME / ChatGPT',type:'holdings',added:next.holdings.length-retained,updated:retained,duplicate:0,skipped:0,issues:0});
    next.settings.persist=true;
    return {state:C.validateBackup(next),unchanged:false,retained,...t};
  }
  function validateMetadata(m){
    if(!m||typeof m.id!=='string'||!/^[a-f0-9]{64}$/.test(m.id)||typeof m.importedAt!=='string'||!Number.isFinite(Date.parse(m.importedAt)))fail('ME連携の保存情報が不正です。');
    validate(m.packet);return m;
  }
  return {FORMAT,unpack,validate,validateMetadata,totals,grouped,prepare,isLiability:name=>debts.has(name)};
});
