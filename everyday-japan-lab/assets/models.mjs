// Pure, deterministic planning models. No network calls or storage.
export function number(value, name, min, max, integer=false) {
  if (value === '' || (typeof value === 'string' && !value.trim()) || value === null || value === undefined || typeof value === 'boolean') throw new Error(`${name}: enter a number.`);
  const n = Number(value);
  if (!Number.isFinite(n) || n < min || n > max || (integer && !Number.isInteger(n))) throw new Error(`${name}: enter ${integer?'a whole number':'a number'} from ${min} to ${max}.`);
  return n;
}
export function heatPump(x) {
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
export function stockpile(x) {
  const people=number(x.people,'People',1,1000,true), days=number(x.days,'Days',1,90,true);
  const waterRate=number(x.waterRate,'Water per person per day',0.1,50), mealRate=number(x.mealRate,'Meals per person per day',1,10,true);
  const toiletRate=number(x.toiletRate,'Toilet uses per person per day',1,30,true), bottle=number(x.bottle,'Container capacity',0.1,1000);
  const waterOwned=number(x.waterOwned,'Water already stored',0,1000000), mealsOwned=number(x.mealsOwned,'Meals already stored',0,1000000,true), toiletsOwned=number(x.toiletsOwned,'Toilet uses already supplied',0,1000000,true);
  const water=people*days*waterRate, meals=people*days*mealRate, toilets=people*days*toiletRate;
  const waterBuy=Math.max(0,water-waterOwned), mealsBuy=Math.max(0,meals-mealsOwned), toiletsBuy=Math.max(0,toilets-toiletsOwned);
  return {water,meals,toilets,waterBuy,mealsBuy,toiletsBuy,containers:Math.ceil(waterBuy/bottle)};
}
export function backup(x) {
  const capacity=number(x.capacity,'Usable battery capacity',0.1,1000), start=number(x.start,'Starting charge',0,100), reserve=number(x.reserve,'Reserve charge',0,100);
  if(reserve>start) throw new Error('Reserve charge cannot exceed starting charge.');
  const efficiency=number(x.efficiency,'Conversion efficiency',1,100)/100, load=number(x.load,'Average AC load',1,100000), standby=number(x.standby,'AC-equivalent standby load',0,10000);
  const energy=capacity*(start-reserve)/100*efficiency;
  return {energy,hours:energy/((load+standby)/1000)};
}
export function lockers(x) {
  const homes=number(x.homes,'Homes',1,100000,true), rate=number(x.rate,'Parcels per home per week',0,1000), hours=number(x.hours,'Mean collection delay',0,720);
  const peak=number(x.peak,'Peak multiplier',1,20), utilisation=number(x.utilisation,'Target occupancy',1,100)/100;
  const daily=homes*rate/7, mean=daily*hours/24, capacity=Math.ceil(mean*peak/utilisation);
  return {daily,mean,capacity};
}
export function readiness(x) {
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
