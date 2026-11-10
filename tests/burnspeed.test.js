'use strict';

// The burn at its own pace (#992, docs/superpowers/specs/2026-11-10-burn-speed-design.md): the stages in ship time, the burn's rate, the clock's
// real time left and today's pacing figures (js/burnspeed.js), in plain Node.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./nodecontext');

const B = load(['js/burnspeed.js'], { SHIP_DAY: 80, lifeSlotCount: d => Math.max(2, Math.min(5, Math.round(d / 2))) },
  ['BURN_SPEEDS', 'FLIP_REAL', 'burnStages', 'stageAt', 'burnRate', 'realLeft', 'oldBurnSeconds', 'burnSceneCount']);
const near = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-9, `${msg}: ${a} against ${b}`);
const burnAt = (days, pr) => { const total = days * 80; return { days, total, left: total * (1 - pr) }; };

test('the stages are spans of ship time: six hours of couches, twenty minutes strapping each side of six weightless', () => {
  const s = B.burnStages(11);
  near(s.couch, 6 / (24 * 11), 'couch'); near(s.float, 3 / (1440 * 11), 'float'); near(s.secure, 23 / (1440 * 11), 'secure');
  assert.deepEqual(B.burnStages(0.05), { couch: 0.06, secure: 0.06, float: 0.03 }, 'clamped to the shares of today on a burn too short for them');
  assert.deepEqual(B.BURN_SPEEDS, [0, 1, 4, 16]);
});

test('stageAt reads the stage at a share of the burn', () => {
  assert.equal(B.stageAt(11, 0.01), 'couch'); assert.equal(B.stageAt(11, 0.99), 'couch');
  assert.equal(B.stageAt(11, 0.3), 'move'); assert.equal(B.stageAt(11, 0.7), 'move');
  assert.equal(B.stageAt(11, 0.5 - 15 / (1440 * 11)), 'secure'); assert.equal(B.stageAt(11, 0.5), 'float');
});

test('the burn runs at the chosen speed, stands still paused, and plays the flip at its own slow rate whatever the speed', () => {
  assert.equal(B.burnRate(burnAt(11, 0.3), 0, 1), 0);
  for (const s of [1, 4, 16]) assert.equal(B.burnRate(burnAt(11, 0.3), s, 1), s);
  const flip = [1, 4, 16].map(s => B.burnRate(burnAt(11, 0.5), s, 1));
  assert.ok(flip[0] > 0 && flip.every(r => r === flip[0]), `the same at every speed: ${flip}`);
  assert.equal(B.burnRate(burnAt(11, 0.5), 0, 1), 0, 'paused in the flip too');
});

test('the flip lasts FLIP_REAL real seconds on any trip and with any drive', () => {
  for (const days of [5, 37]) for (const drive of [0.8, 1, 1.25]) {
    const t = burnAt(days, 0.5), w = 2 * B.burnStages(days).secure * t.total;
    near(w / (B.burnRate(t, 16, drive) * drive), B.FLIP_REAL, `${days} days, drive ${drive}`);
  }
});

test('the clock counts the real time left at the chosen speed, the flip ahead at its slow rate', () => {
  const t = burnAt(11, 0), w = 2 * B.burnStages(11).secure * t.total;
  near(B.realLeft(t, 1, 1), t.total - w + 25, 'at 1x');
  near(B.realLeft(t, 4, 1), (t.total - w) / 4 + 25, 'at 4x');
  near(B.realLeft(t, 0, 1), B.realLeft(t, 1, 1), 'paused, the time at 1x');
  const late = burnAt(11, 0.7); near(B.realLeft(late, 1, 1), late.left, 'the flip behind it');
});

test('a burn keeps today\'s number of scenes', () => {
  assert.equal(B.oldBurnSeconds(5), 90); assert.equal(B.oldBurnSeconds(11), 150);
  assert.deepEqual([5, 11, 37].map(B.burnSceneCount), [3, 4, 4]);
});
