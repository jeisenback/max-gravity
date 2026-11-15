'use strict';

// The burn at its own pace (#992, docs/superpowers/specs/2026-11-10-burn-speed-design.md): the stages in ship time, the burn's rate, the clock's
// real time left and today's pacing figures (js/burnspeed.js), in plain Node.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./nodecontext');

const B = load(['js/burnspeed.js'], { Mods: { register() {} }, SHIP_DAY: 80, G_KMS2: 0.00981, lifeSlotCount: d => Math.max(2, Math.min(5, Math.round(d / 2))) },
  ['BURN_SPEEDS', 'FLIP_REAL', 'STREAK_HUSH', 'streakHush', 'burnStages', 'stageAt', 'burnRate', 'burnStep', 'realLeft', 'oldBurnSeconds', 'burnSceneCount', 'burnShape', 'HARD_G', 'CRUISE_KMS', 'CRUISE_MIN_G', 'COUCH_SPEED']);
const near = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-9, `${msg}: ${a} against ${b}`);
const burnAt = (days, pr) => { const total = days * 80; return { days, total, left: total * (1 - pr) }; };

test('the stages are spans of ship time: six hours of couches, twenty minutes strapping each side of six weightless', () => {
  const s = B.burnStages(11);
  near(s.couch, 6 / (24 * 11), 'couch'); near(s.float, 3 / (1440 * 11), 'float'); near(s.secure, 23 / (1440 * 11), 'secure');
  assert.deepEqual({ ...B.burnStages(0.05) }, { couch: 0.06, secure: 0.06, float: 0.03 }, 'clamped to the shares of today on a burn too short for them');
  assert.deepEqual([...B.BURN_SPEEDS], [0, 1, 2, 16, 256], 'and run ahead (#1186)');
});

test('stageAt reads the stage at a share of the burn', () => {
  assert.equal(B.stageAt(11, 0.01), 'couch'); assert.equal(B.stageAt(11, 0.99), 'couch');
  assert.equal(B.stageAt(11, 0.3), 'move'); assert.equal(B.stageAt(11, 0.7), 'move');
  assert.equal(B.stageAt(11, 0.5 - 15 / (1440 * 11)), 'secure'); assert.equal(B.stageAt(11, 0.5), 'float');
});

test('the burn runs at the chosen speed, stands still paused, and plays the flip at its own slow rate whatever the speed', () => {
  assert.equal(B.burnRate(burnAt(11, 0.3), 0, 1), 0);
  for (const s of [1, 2, 16]) assert.equal(B.burnRate(burnAt(11, 0.3), s, 1), s);
  const flip = [1, 2, 16].map(s => B.burnRate(burnAt(11, 0.5), s, 1));
  assert.ok(flip[0] > 0 && flip.every(r => r === flip[0]), `the same at every speed: ${flip}`);
  assert.equal(B.burnRate(burnAt(11, 0.5), 0, 1), 0, 'paused in the flip too');
});

test('the flip lasts FLIP_REAL real seconds on any trip and with any drive', () => {
  for (const days of [5, 37]) for (const drive of [0.8, 1, 1.25]) {
    const t = burnAt(days, 0.5), w = 2 * B.burnStages(days).secure * t.total;
    near(w / (B.burnRate(t, 16, drive) * drive), B.FLIP_REAL, `${days} days, drive ${drive}`);
  }
});

test('the clock counts the real time left at the chosen speed, the couches ahead at their own pace and the flip at its slow rate', () => {
  const t = burnAt(11, 0), w = 2 * B.burnStages(11).secure * t.total, c = B.burnStages(11).couch * t.total;
  near(B.realLeft(t, 1, 1), t.total - w - 2 * c + 2 * c / 16 + 25, 'at 1x');
  near(B.realLeft(t, 2, 1), (t.total - w - 2 * c) / 2 + 2 * c / 16 + 25, 'at 2x');
  near(B.realLeft(t, 0, 1), B.realLeft(t, 1, 1), 'paused, the time at 1x');
  const late = burnAt(11, 0.7); near(B.realLeft(late, 1, 1), late.left - c + c / 16, 'the flip behind it');
});

// ---------- the burn's shape (#1195, docs/bible/burn.md) ----------

const AU = 149.6e6, G = 0.00981;
// The distance a shape covers to the flip, in km, and its speed there: the hard burn, then the cruise.
const half = (sh, days) => { const h = days * 43200, th = sh.hard * days * 86400, tc = h - th; return sh.hardG * G * th * th / 2 + sh.vHard * tc + sh.cruiseG * G * tc * tc / 2; };

test('a burn is hard at a g to the cruise speed, then easy to the flip, and covers its distance in its days', () => {
  assert.deepEqual([B.HARD_G, B.CRUISE_KMS, B.COUCH_SPEED], [1, 210, 16]);
  for (const [au, days] of [[1, 5], [2, 7], [5, 11]]) {
    const sh = B.burnShape(au * AU, days);
    assert.ok(Math.abs(sh.vHard - 210) < 1e-6, `${au} AU: hard to 210 km/s (${sh.vHard})`);
    near(sh.hard * days * 24, 210 / G / 3600, `${au} AU: the hours it takes at a g`);
    assert.ok(sh.cruiseG > 0.03 && sh.cruiseG < sh.hardG, `${au} AU: an easy cruise (${sh.cruiseG})`);
    assert.ok(Math.abs(half(sh, days) - au * AU / 2) < 1, `${au} AU: half the way at the flip`);
    assert.ok(sh.peak > sh.vHard, 'the speed still rises in the cruise');
  }
});

test('a trip too short to reach the cruise speed has the hard burn it can, and the cruise keeps its floor', () => {
  const sh = B.burnShape(0.15 * AU, 3);
  assert.ok(sh.vHard < 210 && sh.hard > 0, `stops short (${sh.vHard} km/s)`);
  assert.ok(Math.abs(sh.cruiseG - B.CRUISE_MIN_G) < 1e-6, `the cruise at its floor (${sh.cruiseG})`);
  assert.ok(Math.abs(half(sh, 3) - 0.15 * AU / 2) < 1, 'half the way at the flip');
  assert.ok(B.burnShape(1 * AU, 1).hard <= 0.06 + 1e-12, 'no more than the old couches\' share of a one-day trip');
  assert.ok(B.burnShape(1 * AU, 5, 150).vHard < B.burnShape(1 * AU, 5).vHard, 'a hull of its own cruise speed');
});

test('the couches are the shape\'s hard burn, and the clock runs on through them at sixteen times or more by itself', () => {
  const sh = B.burnShape(1 * AU, 5), t = { ...burnAt(5, 0.01), hard: sh.hard };
  near(B.burnStages(5, sh.hard).couch, sh.hard, 'the couches');
  assert.equal(B.stageAt(5, sh.hard / 2, sh.hard), 'couch'); assert.equal(B.stageAt(5, sh.hard * 1.5, sh.hard), 'move');
  assert.deepEqual([1, 2, 16, 256].map(s => B.burnRate(t, s, 1)), [16, 16, 16, 256], 'at 16x, or faster run ahead');
  assert.equal(B.burnRate(t, 0, 1), 0, 'paused, still paused');
  assert.equal(B.burnRate({ ...burnAt(5, 1 - sh.hard / 2), hard: sh.hard }, 1, 1), 16, 'and the hard brake');
});

test('a burn keeps today\'s number of scenes', () => {
  assert.equal(B.oldBurnSeconds(5), 90); assert.equal(B.oldBurnSeconds(11), 150);
  assert.deepEqual([5, 11, 37].map(d => B.burnSceneCount(d)), [3, 4, 4]);
});

test('a fast step stops at the start of the flip, so none of it goes by at speed (#992)', () => {
  const t = burnAt(11, 0.5 - B.burnStages(11).secure - 1e-5), start = (0.5 - B.burnStages(11).secure) * t.total;
  const step = B.burnStep(t, 16, 1.25, 1 / 30);
  near(t.total - t.left + step * 1.25, start, 'it ends on the flip\'s first instant');
  assert.equal(B.burnRate({ ...t, left: t.total - start }, 16, 1.25), B.burnRate(burnAt(11, 0.5), 16, 1.25), 'which is in the flip');
  const edge = { days: 8, total: 640, left: 640 * (0.5 + B.burnStages(8).secure) };  // the flip's first instant, as a float lands on it
  assert.equal(B.burnRate(edge, 16, 1), B.burnRate(burnAt(8, 0.5), 16, 1), 'the first instant, give or take a float, is in the flip');
  const cruise = burnAt(11, 0.3); assert.equal(B.burnStep(cruise, 4, 1, 0.5), 2, 'elsewhere it is dt times the rate');
});

test('the star streaks settle at the flip: a third of their length and light while the crew are strapped and floating, easing back over as long again either side (#962)', () => {
  const days = 5, sec = B.burnStages(days).secure;
  near(B.STREAK_HUSH, 0.35, 'the hush');
  near(B.streakHush(days, 0.5), 0.35, 'the midpoint'); near(B.streakHush(days, 0.5 + sec), 0.35, 'the edge of the strapping');
  near(B.streakHush(days, 0.5 - sec * 1.5), 0.675, 'halfway back'); near(B.streakHush(days, 0.5 + sec * 2), 1, 'back to full');
  near(B.streakHush(days, 0.2), 1, 'the run of the burn'); near(B.streakHush(days, 0), 1, 'the start');
});
