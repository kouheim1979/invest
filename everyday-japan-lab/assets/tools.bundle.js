(()=>{
// Pure, deterministic planning models. No network calls or storage.
function number(value, name, min, max, integer=false) {
  if (value === '' || (typeof value === 'string' && !value.trim()) || value === null || value === undefined || typeof value === 'boolean') throw new Error(`${name}: enter a number.`);
  const n = Number(value);
  if (!Number.isFinite(n) || n < min || n > max || (integer && !Number.isInteger(n))) throw new Error(`${name}: enter ${integer?'a whole number':'a number'} from ${min} to ${max}.`);
  return n;
}
function heatPump(x) {
  const litres=number(x.litres,'Daily delivered water',0,10000), days=number(x.days,'Days per year',1,366,true);
  const cold=number(x.cold,'Cold inlet temperature',0,40), hot=number(x.hot,'Delivered water temperature',1,80);
  if(hot<=cold) throw new Error('Delivered water temperature must be above the cold inlet temperature.');
  const cop=number(x.cop,'Seasonal heat-pump COP',1,8), loss=number(x.loss,'Heat-loss allowance',0,100)/100;
  const auxiliary=number(x.auxiliary,'Resistance heat share',0,100)/100;
  const rate=number(x.rate,'Electricity price',0,10000), baselineRate=number(x.baselineRate,'Baseline energy price',0,10000);
  const baselineEfficiency=number(x.baselineEfficiency,'Baseline efficiency',1,100)/100;
  const extra=number(x.extra,'Additional upfront cost',0,1000000);
  const drawHeat=litres*4.186*(hot-cold)/3600*days, heat=drawHeat*(1+loss);
  const electricity=heat*((1-auxiliary)/cop+auxiliary), baselineEnergy=heat/baselineEfficiency;
  const cost=electricity*rate, baselineCost=baselineEnergy*baselineRate, saving=baselineCost-cost;
  return {drawHeat,heat,electricity,baselineEnergy,cost,baselineCost,saving,payback:extra>0&&saving>0?extra/saving:null,
    scenarios:[2,3,4].map(c=>({cop:c,kwh:heat*((1-auxiliary)/c+auxiliary),cost:heat*((1-auxiliary)/c+auxiliary)*rate}))};
}
function stockpile(x) {
  const people=number(x.people,'People',1,1000,true), days=number(x.days,'Days',1,90,true);
  const waterRate=number(x.waterRate,'Water per person per day',0.1,50), mealRate=number(x.mealRate,'Meals per person per day',1,10,true);
  const toiletRate=number(x.toiletRate,'Toilet uses per person per day',1,30,true), bottle=number(x.bottle,'Container capacity',0.1,1000);
  const waterOwned=number(x.waterOwned,'Water already stored',0,1000000), mealsOwned=number(x.mealsOwned,'Meals already stored',0,1000000,true), toiletsOwned=number(x.toiletsOwned,'Toilet uses already supplied',0,1000000,true);
  const water=people*days*waterRate, meals=people*days*mealRate, toilets=people*days*toiletRate;
  const waterBuy=Math.max(0,water-waterOwned), mealsBuy=Math.max(0,meals-mealsOwned), toiletsBuy=Math.max(0,toilets-toiletsOwned);
  return {water,meals,toilets,waterBuy,mealsBuy,toiletsBuy,containers:Math.ceil(waterBuy/bottle)};
}
function backup(x) {
  const capacity=number(x.capacity,'Usable battery capacity',0.1,1000), start=number(x.start,'Starting charge',0,100), reserve=number(x.reserve,'Reserve charge',0,100);
  if(reserve>start) throw new Error('Reserve charge cannot exceed starting charge.');
  const efficiency=number(x.efficiency,'Conversion efficiency',1,100)/100, load=number(x.load,'Average AC load',1,100000), standby=number(x.standby,'AC-equivalent standby load',0,10000);
  const energy=capacity*(start-reserve)/100*efficiency;
  return {energy,hours:energy/((load+standby)/1000)};
}
function lockers(x) {
  const homes=number(x.homes,'Homes',1,100000,true), rate=number(x.rate,'Parcels per home per week',0,1000), hours=number(x.hours,'Mean collection delay',0,720);
  const peak=number(x.peak,'Peak multiplier',1,20), utilisation=number(x.utilisation,'Target occupancy',1,100)/100;
  const daily=homes*rate/7, mean=daily*hours/24, capacity=Math.ceil(mean*peak/utilisation);
  return {daily,mean,capacity};
}
function readiness(x) {
  const unit=x.unit==='in'?25.4:1;
  const length=number(x.length,'Bolt centre to bowl front',1,1000/unit)*unit;
  const bolts=number(x.bolts,'Bolt spacing',1,1000/unit)*unit;
  const clearance=number(x.clearance,'Rear clearance',0,1000/unit)*unit;
  const tasks=['Compare all three dimensions and the tank/bowl contour with the exact product drawing.','Confirm mounting access, hose routing, water pressure and local backflow requirements with the product instructions.'];
  if(x.shape==='unknown') tasks.push('Identify the toilet bowl shape and model. A round/elongated label alone does not prove fit.');
  if(x.voltage==='unknown'||x.productVoltage==='unknown') tasks.push('Confirm both local supply and the exact product voltage AND frequency rating.');
  else if(x.voltage!==x.productVoltage) tasks.push('Voltage mismatch recorded. Choose a locally approved model with matching supply; do not treat a plug adapter as a solution.');
  else tasks.push('Voltage labels match; frequency, certification, circuit capacity and manufacturer instructions still need verification.');
  if(x.outlet!=='yes') tasks.push('Have a qualified local installer verify the protected, grounded outlet location and wet-area requirements.');
  if(x.valve!=='yes') tasks.push('Have the water shut-off valve and connection arrangement checked before purchase.');
  return {length,bolts,clearance,tasks};
}

const fmt=(n,d=1)=>new Intl.NumberFormat('en',{maximumFractionDigits:d}).format(n);
const money=(n,c)=>new Intl.NumberFormat('en',{style:'currency',currency:c,maximumFractionDigits:0}).format(n);
const metric=(value,label)=>`<div class="metric"><strong>${value}</strong><span>${label}</span></div>`;
const functions={heatPump,stockpile,backup,lockers,readiness};
for(const form of document.querySelectorAll('form[data-tool]')){
  const result=form.querySelector('.result'), error=form.querySelector('.error');
  const clear=()=>{result.hidden=true;result.replaceChildren();error.hidden=true;error.textContent='';};
  form.addEventListener('input',clear);
  form.addEventListener('change',clear);
  let measurementUnit='mm';
  form.addEventListener('reset',()=>{clear();measurementUnit='mm';});
  if(form.elements.unit) form.elements.unit.addEventListener('change',()=>{
    const next=form.elements.unit.value;
    if(next!==measurementUnit){
      for(const name of ['length','bolts','clearance']){
        const input=form.elements.namedItem(name);
        if(input.value!==''&&Number.isFinite(Number(input.value))) input.value=String(Number((Number(input.value)*(next==='in'?1/25.4:25.4)).toFixed(3)));
      }
      measurementUnit=next;
    }
  });
  const preset=form.elements.waterPreset;
  if(preset) preset.addEventListener('change',()=>{if(preset.value!=='custom')form.elements.waterRate.value=preset.value;});
  if(form.elements.waterRate) form.elements.waterRate.addEventListener('input',()=>{preset.value='custom';});
  form.addEventListener('submit',event=>{
    event.preventDefault();clear();
    try{
      if(!form.checkValidity()) {const invalid=form.querySelector('input:invalid,select:invalid');throw new Error(`${invalid.labels?.[0]?.textContent.trim()||'Input'}: ${invalid.validationMessage||'check this value.'}`);}
      const x=Object.fromEntries(new FormData(form)), type=form.dataset.tool, r=functions[type](x);
      let content='';
      if(type==='heatPump'){
        content=`<div class="metrics">${metric(fmt(r.electricity,0)+' kWh','Modelled annual electricity')}${metric(money(r.cost,x.currency),'Modelled annual running cost')}${metric(money(r.saving,x.currency),r.saving>=0?'Annual saving against your baseline':'Annual saving (negative = higher cost)')}</div><p>Baseline energy: ${fmt(r.baselineEnergy,0)} kWh/year; baseline cost: ${money(r.baselineCost,x.currency)}/year. Useful hot-water heat: ${fmt(r.drawHeat,0)} kWh/year.</p><p>${r.payback===null?'Simple payback not shown: enter a positive additional upfront cost and obtain a positive annual saving.':`Illustrative simple payback: ${fmt(r.payback)} years. This ignores financing, maintenance, price changes and equipment life.`}</p><h3>COP sensitivity — other inputs unchanged</h3><div class="table-scroll"><table><thead><tr><th>COP</th><th>Electricity / year</th><th>Cost / year</th></tr></thead><tbody>${r.scenarios.map(s=>`<tr><th>${s.cop}</th><td>${fmt(s.kwh,0)} kWh</td><td>${money(s.cost,x.currency)}</td></tr>`).join('')}</tbody></table></div>`;
      }else if(type==='stockpile'){
        content=`<div class="metrics">${metric(fmt(r.water)+' L','Total water target')}${metric(fmt(r.meals,0),'Total individual meal portions')}${metric(fmt(r.toilets,0),'Total toilet uses to supply')}</div><h3>Additional supplies after existing stock</h3><ul><li>${fmt(r.waterBuy)} L water: ${fmt(r.containers,0)} additional containers of ${fmt(Number(x.bottle))} L, rounded up.</li><li>${fmt(r.mealsBuy,0)} individual meal portions.</li><li>Products covering ${fmt(r.toiletsBuy,0)} toilet uses. Confirm uses per package; this is not automatically a bag count.</li></ul><p>Plan separate water and supplies for pets, extra hygiene, medical needs and local conditions. Three meal portions is a counting convention, not a nutritional prescription.</p>`;
      }else if(type==='backup'){
        content=`<div class="metrics">${metric(fmt(r.energy,2)+' kWh','Available modelled AC energy')}${metric(fmt(r.hours)+' hours','At your average load and standby input')}</div><p>This energy budget does not verify V2H compatibility, islanding, starting surges, continuous inverter power, battery condition or local approval. Do not use it to size life-critical backup.</p>`;
      }else if(type==='lockers'){
        content=`<div class="metrics">${metric(fmt(r.daily),'Expected parcels per day')}${metric(fmt(r.mean,2),'Mean occupied compartments')}${metric(fmt(r.capacity,0),'Illustrative planning compartments')}</div><p>${r.capacity===0?'Zero occupancy in the supplied scenario. Real deliveries and collection delays may still require compartments.':'One parcel per compartment is assumed.'} This is a steady-state mean with an arbitrary headroom adjustment, not a probability of availability or a service-level guarantee. Test size mix, clustered arrivals and longer collection delays separately.</p>`;
      }else{
        content=`<h3>Measurements recorded — compatibility not certified</h3><p>Bolt centre to bowl front: ${fmt(r.length)} mm · bolt spacing: ${fmt(r.bolts)} mm · rear clearance: ${fmt(r.clearance)} mm.</p><ul>${r.tasks.map(t=>`<li>${t}</li>`).join('')}</ul><p>Keep the toilet model number, chosen seat drawing and photos together for the manufacturer or installer. No universal pass/fail score is assigned.</p>`;
      }
      result.innerHTML=`<h2>Your planning result</h2>${content}<p class="small">Calculated from the current inputs. Changing any input clears this result. No input is sent to a server.</p>`;
      result.hidden=false;result.focus();
    }catch(e){error.textContent=e.message;error.hidden=false;error.focus();}
  });
}
for(const button of document.querySelectorAll('[data-print]')) button.addEventListener('click',()=>window.print());

})();
