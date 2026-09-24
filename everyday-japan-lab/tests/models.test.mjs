import test from 'node:test';
import assert from 'node:assert/strict';
import {heatPump,stockpile,backup,lockers,readiness,number} from '../assets/models.mjs';
const hp={litres:200,days:365,cold:15,hot:40,cop:3,loss:0,auxiliary:0,rate:.2,baselineRate:.2,baselineEfficiency:100,extra:1000};
test('hot-water reference: useful heat and 3:1 electricity relationship',()=>{
  const r=heatPump(hp);assert.ok(Math.abs(r.drawHeat-2122.069444)<.001);assert.ok(Math.abs(r.electricity-707.356481)<.001);assert.ok(Math.abs(r.saving-282.94259)<.001);
});
test('resistance-only scenario removes COP advantage and payback',()=>{
  const r=heatPump({...hp,auxiliary:100});assert.equal(r.saving,0);assert.equal(r.payback,null);
});
test('expensive electricity can produce negative savings',()=>{
  const r=heatPump({...hp,rate:1,baselineRate:.05});assert.ok(r.saving<0);assert.equal(r.payback,null);
});
test('zero demand yields zero energy, no invented fixed loss or payback',()=>{
  const r=heatPump({...hp,litres:0,loss:15});assert.equal(r.electricity,0);assert.equal(r.payback,null);
});
test('stock deficit subtracts existing quantities and rounds bottles up',()=>{
  const r=stockpile({people:4,days:7,waterRate:3,mealRate:3,toiletRate:5,bottle:2,waterOwned:21,mealsOwned:90,toiletsOwned:40});
  assert.deepEqual(r,{water:84,meals:84,toilets:140,waterBuy:63,mealsBuy:0,toiletsBuy:100,containers:32});
});
test('V2H default example and zero available energy',()=>{
  const x={capacity:60,start:80,reserve:20,efficiency:90,load:500,standby:0};
  const r=backup(x);assert.ok(Math.abs(r.energy-32.4)<1e-9);assert.ok(Math.abs(r.hours-64.8)<1e-9);
  assert.equal(backup({...x,start:20}).hours,0);assert.throws(()=>backup({...x,reserve:90}));
});
test('locker zero-arrival regression and observed default mean',()=>{
  const x={homes:50,rate:2,hours:12,peak:1.6,utilisation:80};
  assert.equal(lockers(x).capacity,15);assert.equal(lockers({...x,rate:0}).capacity,0);assert.equal(lockers({...x,hours:0}).capacity,0);
});
test('invalid blank, non-finite, fractional count and inverted temperatures rejected',()=>{
  for(const v of ['', ' ',NaN,Infinity,'Infinity',null,undefined])assert.throws(()=>number(v,'Test',0,100));
  assert.throws(()=>heatPump({...hp,hot:10}));assert.throws(()=>heatPump({...hp,cop:0}));assert.throws(()=>heatPump({...hp,days:2.5}));
  assert.throws(()=>lockers({homes:2,rate:1,hours:1,peak:1,utilisation:0}));
});
test('bidet worksheet converts inches without inventing a fit pass',()=>{
  const r=readiness({unit:'in',length:18.5,bolts:5.5,clearance:2,shape:'unknown',voltage:'100',productVoltage:'120',outlet:'unknown',valve:'unknown'});
  assert.ok(Math.abs(r.length-469.9)<1e-9);assert.ok(r.tasks.some(t=>t.includes('Voltage mismatch')));assert.equal(r.compatible,undefined);
});
