/* Initial suggestions for ME holdings. Goals are provisional; manual choices win. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.MeClassification=api;})(globalThis,()=>{
  'use strict';
  const definitions={
    retirement:{name:'老後資金',horizon:'長期',color:'#69be79'},
    children:{name:'子ども名義資金',horizon:'用途は未指定',color:'#f4cb49'},
    investment:{name:'資産形成',horizon:'運用中',color:'#9d99f2'},
    reserve:{name:'預金・待機資金',horizon:'使途は未指定',color:'#4da9ed'},
    spending:{name:'日常支払い',horizon:'電子マネー等',color:'#62d8cd'},
    miles:{name:'旅行ポイント',horizon:'マイル等',color:'#ec7775'},
    other:{name:'その他資産',horizon:'用途を確認',color:'#aaaebf'}
  };
  const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
  const tag=account=>String(account||'').normalize('NFKC').toUpperCase().match(/(?:^|[^A-Z0-9])(OTS|OKS|MIK|RIN)(?=$|[^A-Z0-9])/)?.[1]||'';
  function validate(value){
    if(value===undefined)return {version:1,seenKeys:[],suggestedKeys:[]};
    if(!value||value.version!==1||!['seenKeys','suggestedKeys'].every(k=>Array.isArray(value[k])&&value[k].length<=100000&&value[k].every(x=>typeof x==='string'&&x.length>0&&x.length<=20000)&&new Set(value[k]).size===value[k].length))throw Error('MEの仮分類設定が不正です。');
    const seen=new Set(value.seenKeys);if(value.suggestedKeys.some(k=>!seen.has(k)))throw Error('MEの仮分類設定が不正です。');
    return {version:1,seenKeys:[...value.seenKeys],suggestedKeys:[...value.suggestedKeys]};
  }
  function purpose(h,s){
    const category=h.meCategory||'',code=tag(h.account);
    // Resolve user-entered ownership before using the code in an account name.
    const owner=h.owner||(own(s.settings.accountOwners,h.account)?s.settings.accountOwners[h.account]:'');
    if(['MIK','RIN','子ども1','子ども2'].includes(owner)||(!owner&&['MIK','RIN'].includes(code)))return 'children';
    if(h.assetClass==='年金'||category==='確定拠出年金')return 'retirement';
    if(h.assetClass==='ポイント')return /マイル|マイレージ/.test(h.name+' '+h.account)?'miles':'spending';
    if(category==='電子マネー')return 'spending';
    if(['国内株式','外国株式','投資信託','債券','暗号資産'].includes(h.assetClass)||/保証金|証拠金/.test(category))return 'investment';
    if(h.assetClass==='預金・現金')return 'reserve';
    return 'other';
  }
  function apply(state,P){
    const rows=state.holdings.filter(h=>h.key.startsWith('me:'));
    if(!state.moneyForwardME||!rows.length)return {state,changed:false,assigned:0,owners:0};
    const tracking=validate(state.meClassification),seen=new Set(tracking.seenKeys),suggested=new Set(tracking.suggestedKeys);
    const pending=rows.filter(h=>!seen.has(h.key));
    if(!pending.length)return {state,changed:false,assigned:0,owners:0};
    const next=JSON.parse(JSON.stringify(state)),config=P.config(next),assignments=new Map(config.assignments.map(a=>[a.key,a.purposeId]));
    let assigned=0,owners=0;
    const labels={OTS:next.settings.members.includes('本人')?'本人':'夫',OKS:'妻',MIK:'MIK',RIN:'RIN'};
    function group(kind){
      const def=definitions[kind],existing=config.groups.find(g=>g.name===def.name);
      if(existing)return existing.id;
      if(config.groups.length>=24)return null;
      let id='me-'+kind;for(let n=2;config.groups.some(g=>g.id===id);n++)id='me-'+kind+'-'+n;
      config.groups.push({id,...def});return id;
    }
    for(const h of pending){
      const code=tag(h.account);
      // Codes use the existing stock app's verified household labels. Unknown
      // bank names never imply a person; explicit mapping (including blank) wins.
      if(code&&!h.owner&&!own(next.settings.accountOwners,h.account)){
        const label=labels[code];
        if(!next.settings.members.includes(label))next.settings.members.push(label);
        Object.defineProperty(next.settings.accountOwners,h.account,{value:label,enumerable:true,writable:true,configurable:true});owners++;
      }
      if(!assignments.has(h.key)){
        const target=group(purpose(h,next));
        if(target){assignments.set(h.key,target);suggested.add(h.key);assigned++;}
      }
      seen.add(h.key);
    }
    config.assignments=[...assignments].map(([key,purposeId])=>({key,purposeId}));
    next.purposePortfolio=P.validate(config);
    next.meClassification=validate({version:1,seenKeys:[...seen],suggestedKeys:[...suggested]});
    return {state:next,changed:true,assigned,owners};
  }
  return {apply,validate,tag,purpose};
});
