import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { measureRiceBatch } from '../assets/rice-model.mjs';

test('reader-facing rice guide uses an approximate US cooking cup example', () => {
  const page = readFileSync(new URL('../content/stovetop-rice.html', import.meta.url), 'utf8');
  assert.match(page, /id="rice-cup-capacity"[^>]*value="240"/);
  assert.match(page, /240 mL is an approximate U\.S\. cooking-cup example/);
  assert.match(page, /Two rounded 240 mL U\.S\. cups would measure about 480 mL/);
  assert.match(page, /dry rice is 360 ÷ 240 = 1\.5 cups and water is 400 ÷ 240 ≈ 1\.667 cups/);
  assert.match(page, /<strong>2 rice cups<\/strong>/);
  assert.match(page, /<strong>400 mL<\/strong>/);
  assert.equal(measureRiceBatch(240).riceCups, 1.5);
  assert.ok(Math.abs(measureRiceBatch(240).waterCups - 5 / 3) < 1e-12);
});
