/* Purpose labels refer to imported holdings. No separate balances or inferred goals. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.PurposeCore=api;
})(globalThis,()=>{
  'use strict';
  const UNASSIGNED='unassigned';
  const clone=value=>JSON.parse(JSON.stringify(value));
  function defaults(){
    return {version:1,groups:[
      {id:'retirement',name:'老後資金',horizon:'長期',color:'#69be79'},
      {id:'education',name:'教育資金',horizon:'中期',color:'#f4cb49'},
      {id:'emergency',name:'生活防衛資金',horizon:'固定',color:'#4da9ed'},
      {id:'travel',name:'旅行積立金',horizon:'短期',color:'#ec7775'}
    ],assignments:[]};
  }
  function validate(value){
    if(value===undefined)return defaults();
    const fail=()=>{throw Error('目的別ポートフォリオの設定が不正です。');};
    if(!value||value.version!==1||!Array.isArray(value.groups)||!Array.isArray(value.assignments)||value.groups.length>24||value.assignments.length>100000)fail();
    const ids=new Set(),names=new Set(),keys=new Set();
    for(const g of value.groups){
      if(!g||typeof g.id!=='string'||!/^[a-zA-Z0-9_-]{1,64}$/.test(g.id)||g.id===UNASSIGNED||ids.has(g.id)||typeof g.name!=='string'||!g.name.trim()||g.name.length>40||names.has(g.name.trim())||typeof g.horizon!=='string'||g.horizon.length>20||typeof g.color!=='string'||!/^#[0-9a-f]{6}$/i.test(g.color))fail();
      ids.add(g.id);names.add(g.name.trim());
    }
    for(const a of value.assignments){
      if(!a||typeof a.key!=='string'||!a.key||a.key.length>20000||keys.has(a.key)||!ids.has(a.purposeId))fail();
      keys.add(a.key);
    }
    return {version:1,groups:value.groups.map(g=>({id:g.id,name:g.name.trim(),horizon:g.horizon.trim(),color:g.color})),assignments:value.assignments.map(a=>({key:a.key,purposeId:a.purposeId}))};
  }
  const config=state=>validate(state.purposePortfolio);
  function summarize(state,holdings=state.holdings){
    const settings=config(state),assignment=new Map(settings.assignments.map(a=>[a.key,a.purposeId]));
    const groups=[...settings.groups,{id:UNASSIGNED,name:'未分類',horizon:'目的を選択',color:'#73899e'}].map(g=>({...g,rows:[],value:0}));
    const byId=new Map(groups.map(g=>[g.id,g]));
    for(const h of holdings){
      const g=byId.get(assignment.get(h.key))||byId.get(UNASSIGNED);
      g.rows.push(h);g.value+=h.valueJPY;
    }
    const total=groups.reduce((sum,g)=>sum+g.value,0);
    for(const g of groups)g.percent=total>0?g.value/total*100:0;
    return {groups,total,count:holdings.length,assignment,dates:[...new Set(holdings.map(h=>h.asOf))].sort()};
  }
  function profit(holdings){
    const known=holdings.filter(h=>Number.isFinite(h.costJPY)),cost=known.reduce((sum,h)=>sum+h.costJPY,0);
    const value=known.length?known.reduce((sum,h)=>sum+h.valueJPY-h.costJPY,0):null;
    return {value,percent:known.length&&cost>0?value/cost*100:null,known:known.length,total:holdings.length};
  }
  function assign(state,keys,purposeId){
    const next=clone(state),settings=config(state);
    if(purposeId!==UNASSIGNED&&!settings.groups.some(g=>g.id===purposeId))throw Error('目的を選び直してください。');
    const existing=new Set(state.holdings.map(h=>h.key)),map=new Map(settings.assignments.map(a=>[a.key,a.purposeId]));
    for(const key of keys){
      if(!existing.has(key))throw Error('資産が更新されています。画面を開き直してください。');
      if(purposeId===UNASSIGNED)map.delete(key);else map.set(key,purposeId);
    }
    settings.assignments=[...map].map(([key,id])=>({key,purposeId:id}));
    next.purposePortfolio=validate(settings);
    return next;
  }
  function saveGroups(state,groups){
    const next=clone(state),settings=config(state),ids=new Set(groups.map(g=>g.id));
    next.purposePortfolio=validate({...settings,groups,assignments:settings.assignments.filter(a=>ids.has(a.purposeId))});
    return next;
  }
  return {UNASSIGNED,defaults,validate,config,summarize,profit,assign,saveGroups};
});
