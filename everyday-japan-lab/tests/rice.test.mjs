import assert from 'node:assert/strict';
import test from 'node:test';
import { measureRiceBatch, riceClock } from '../assets/rice-model.mjs';

test('fixed batch uses the entered cup capacity without scaling the recipe', () => {
  assert.deepEqual(measureRiceBatch(250), { riceMl:360, waterMl:400, riceCups:1.44, waterCups:1.6 });
  assert.equal(measureRiceBatch(180).riceCups, 2);
  assert.equal(measureRiceBatch(200).waterCups, 2);
  assert.equal(measureRiceBatch(50).riceCups, 7.2);
  assert.equal(measureRiceBatch(500).waterCups, 0.8);
});
test('empty, non-finite, zero and out-of-range capacity cannot create a result', () => {
  for (const v of [NaN, Infinity, -Infinity, 0, -1, 49.99, 500.01, '', null, '250']) assert.throws(() => measureRiceBatch(v));
});
test('clock catches up after a background delay and records lateness', () => {
  const deadline = 1000000 + 30 * 60000;
  assert.deepEqual(riceClock(deadline, 1000000), {remaining:1800, overdue:0});
  assert.deepEqual(riceClock(deadline, deadline - 1), {remaining:1, overdue:0});
  assert.deepEqual(riceClock(deadline, deadline), {remaining:0, overdue:0});
  assert.deepEqual(riceClock(deadline, deadline + 72000), {remaining:0, overdue:72});
  assert.throws(() => riceClock(NaN, 0));
});
