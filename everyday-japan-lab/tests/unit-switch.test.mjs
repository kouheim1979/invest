import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as models from '../assets/models.mjs';
test('all bidet dimensions convert even when length collides with HTMLFormControlsCollection.length',()=>{
  const controls={unit:{value:'mm',addEventListener(type,fn){this.change=fn;}},length:{value:'480'},bolts:{value:'140'},clearance:{value:'60'}};
  const result={hidden:false,replaceChildren(){}},error={hidden:false,textContent:''};
  const listeners={};
  const form={elements:{length:8,unit:controls.unit,namedItem(name){return controls[name];}},querySelector(selector){return selector==='.result'?result:error;},addEventListener(type,fn){listeners[type]=fn;}};
  const source=fs.readFileSync(new URL('../assets/tools.mjs',import.meta.url),'utf8').split('\n').slice(1).join('\n');
  vm.runInNewContext(source,{...models,Intl,Number,document:{querySelectorAll(selector){return selector==='form[data-tool]'?[form]:[];}}});
  controls.unit.value='in';controls.unit.change();
  assert.ok(Math.abs(Number(controls.length.value)-18.898)<.001);assert.ok(Math.abs(Number(controls.bolts.value)-5.512)<.001);
  controls.unit.value='mm';controls.unit.change();assert.ok(Math.abs(Number(controls.length.value)-480)<.02);
  listeners.reset();assert.equal(result.hidden,true);
});
