'use strict';

// The soak tool (tools/soak.js): sails the captain's runs and reports them.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { closeBrowser } = require('./helpers');
const { soak, report, framesReport } = require('../tools/soak');

test('the soak sails the captain\'s runs and reports them', async () => {
  const r = await soak({ seed: 1, legs: 6 });
  assert.equal(r.runs, 6);
  assert.deepEqual(r.bad, []);
  assert.deepEqual(r.errors, []);
  assert.ok(Number.isFinite(r.avgPayPerRun) && r.avgPayPerRun > 0);
  assert.ok(Number.isFinite(r.avgDaysPerRun));
  assert.ok(Object.keys(r.scenes).length > 0);
});

test('for every captain the trouble, then the secret, then the used-ship offer', async () => {
  for (const captainKey of ['hester', 'dov', 'imre', 'zoya']) {
    const r = await soak({ seed: 1, legs: 40, captainKey });
    const [trouble, secret] = r.beatDays;
    assert.ok(trouble !== undefined && secret !== undefined, `${captainKey}: both scenes play before the chapter ends`);
    assert.ok(trouble < secret, `${captainKey}: trouble ${trouble} before secret ${secret}`);
    assert.ok(r.burns.length === 2 && r.burns.every(b => b <= 3), `${captainKey}: each scene plays within 3 burns of being due: ${r.burns}`);
    assert.ok(r.offerDay > secret, `${captainKey}: the offer (day ${r.offerDay}) comes after the secret (day ${secret})`);
  }
});

test('the soak reports who was lost or left, when and why, and the totals', async () => {
  const runs = [];
  for (const seed of [4, 7]) runs.push(await soak({ seed, legs: 40 }));
  const all = runs.flatMap(r => r.losses);
  assert.ok(all.length > 0, 'these seeds lose or lose someone');
  for (const l of all) { assert.ok(Number.isFinite(l.day)); assert.match(l.what, /^(died|left|marked)$/); assert.ok(l.who && l.why); }
  const lines = [], log = console.log; console.log = x => lines.push(x);
  try { report(runs); } finally { console.log = log; }
  assert.equal(lines.length, 3, 'a line per chapter and the totals');
  assert.match(lines[2], /^2 chapters, chapters with: /);
});

test('with --frames the soak plays the burn, and an order for the drive costs reaction mass and shortens it (#292)', async () => {
  const base = await soak({ seed: 1, legs: 6, post: 'engineer', frames: true });
  const fast = await soak({ seed: 1, legs: 6, post: 'engineer', frames: true, engineer: 'favor-drive' });
  for (const r of [base, fast]) { assert.deepEqual(r.bad, []); assert.deepEqual(r.errors, []); assert.equal(r.runs, 6); for (const k of ['raids', 'scrams', 'hull', 'fuel', 'planned', 'seen']) assert.ok(Number.isFinite(r.frames[k]), k); }
  assert.ok(fast.frames.fuel > base.frames.fuel, 'a hotter drive burns more reaction mass');
  assert.ok(fast.days / fast.runs < base.days / base.runs, 'and the burns are shorter');
  const lines = [], log = console.log; console.log = x => lines.push(x);
  try { framesReport([base, fast], 'x: '); } finally { console.log = log; }
  assert.match(lines[0], /^x: 2 chapters, /);
});

after(closeBrowser);
