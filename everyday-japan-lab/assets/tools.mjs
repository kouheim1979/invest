import {heatPump,stockpile,backup,lockers,readiness} from './models.mjs';
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
