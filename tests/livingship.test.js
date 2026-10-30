'use strict';

// The living ship: the burn's phase weights and the g reading (js/burnpanel.js), and the phases of a run (js/shiplife.js), in plain Node.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./nodecontext');

const { phaseWeights: weights, gReading } = load(['js/burnpanel.js'], { G: {} }, ['phaseWeights', 'gReading']);
const phaseWeights = pr => JSON.parse(JSON.stringify(weights(pr)));  // out of the vm context, so plain objects
const G = {};
const { phase, posture, POSTURES, LADDER } = load(['js/data.js', 'js/util.js', 'js/figures.js', 'js/shiplife.js'], { G, Mods: { filter: (n, v) => v, emit() {}, register() {} } }, ['phase', 'posture', 'POSTURES', 'LADDER']);

test('the phase weights: all burn at the ends, all cruise between, all flip at the middle, and they always sum to one', () => {
  assert.deepEqual(phaseWeights(0.02), { burn: 1, cruise: 0, flip: 0 });
  assert.deepEqual(phaseWeights(0.25), { burn: 0, cruise: 1, flip: 0 });
  assert.deepEqual(phaseWeights(0.5), { burn: 0, cruise: 0, flip: 1 });
  assert.deepEqual(phaseWeights(0.98), { burn: 1, cruise: 0, flip: 0 });
  for (let p = 0; p <= 1; p += 0.001) { const w = phaseWeights(p); assert.ok(Math.abs(w.burn + w.cruise + w.flip - 1) < 1e-9 && Math.min(w.burn, w.cruise, w.flip) >= 0); }
});
test('the g reading: three times the thrust in the hard burn, the thrust in cruise, nothing at the flip, and no jumps', () => {
  assert.equal(gReading(0.02, 0.9), 2.7); assert.equal(gReading(0.3, 0.9), 0.9); assert.equal(gReading(0.5, 0.9), 0); assert.equal(gReading(0.97, 0.9), 2.7);
  for (let p = 0; p < 1; p += 0.001) assert.ok(Math.abs(gReading(p + 0.001, 0.9) - gReading(p, 0.9)) < 0.1, `a jump at ${p.toFixed(3)}`);
});
test('the phases of a run, with the crew securing either side of the flip', () => {
  const at = pr => { G.transit = { total: 100, left: 100 * (1 - pr) }; return phase(); };
  assert.deepEqual([0.03, 0.2, 0.45, 0.5, 0.55, 0.8, 0.97].map(at), ['couch', 'move', 'secure', 'float', 'secure', 'move', 'couch']);
});

test('a posture for everyone in every phase, from the list the sprites are drawn to', () => {
  const p = (o) => ({ role: 'gunner', room: 'galley', x: 0.5, dk: 0, tdk: 0, tx: null, ...o });
  assert.equal(posture(p(), 'couch', 0, false).name, 'couch');
  assert.equal(posture(p(), 'secure', 0, false).name, 'strap');
  assert.equal(posture(p(), 'float', 0, false).name, 'strap');
  assert.equal(posture(p({ role: 'engineer' }), 'float', 0, false).name, 'tether');
  assert.equal(posture(p({ role: 'engineer' }), 'secure', 0, false).name, 'strap');
  assert.equal(posture(p({ tx: 0.6 }), 'move', 0, false).name, 'walk');
  assert.equal(posture(p({ x: LADDER, dk: 0.5, tdk: 1 }), 'move', 0, false).name, 'climb');
  assert.equal(posture(p(), 'move', 0, false).name, 'sit');
  assert.equal(posture(p({ room: 'hold' }), 'move', 0, false).name, 'stand');
  assert.equal(posture(p({ room: 'berths' }), 'move', 0, true).name, 'bunk');
  assert.deepEqual(['float', 'couch', 'move'].map(ph => posture(p({ role: 'cat' }), ph, 0, false).name), ['cat-float', 'cat-sleep', 'cat-sit']);
  assert.equal(posture(p({ role: 'cat', tx: 0.3 }), 'move', 0, false).name, 'cat-walk');
  for (const ph of ['couch', 'secure', 'float', 'move']) { const q = posture(p(), ph, 7.3, false); assert.ok(POSTURES[q.name] && q.frame >= 0 && q.frame < POSTURES[q.name].frames); }
  assert.equal(posture(p({ face: -1 }), 'move', 0, false).face, -1);
});
