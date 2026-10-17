'use strict';

// The soak tool (tools/soak.js): sails the captain's runs and reports them.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { closeBrowser } = require('./helpers');
const { soak, report, framesReport, jobsReport, barReport, freightReport } = require('../tools/soak');

test('the soak sails the captain\'s runs and reports them', async () => {
  const r = await soak({ seed: 1, legs: 6 });
  assert.equal(r.runs, 6);
  assert.deepEqual(r.bad, []);
  assert.deepEqual(r.errors, []);
  assert.ok(Number.isFinite(r.avgPayPerRun) && r.avgPayPerRun > 0);
  assert.ok(Number.isFinite(r.avgDaysPerRun));
  assert.ok(Object.keys(r.scenes).length > 0);
  // the bar: a choice at a table on most landings, counted by topic, with what the talks moved
  const b = r.bar;
  assert.ok(b.talks > 0 && b.talks <= (r.runs + r.nights + 1) * 3, `talks ${b.talks} over ${r.runs} runs and ${r.nights} nights`);
  assert.equal(Object.values(b.topics).reduce((t, c) => t + c, 0), b.talks);
  for (const k of ['credits', 'xp', 'opinion', 'rumors', 'cast']) assert.ok(Number.isFinite(b[k]), k);
  assert.match(freightReport([r]), /^freight, a chapter's mean over 1 seeds: \d+ boards drawn, \d+ empty, \d+ contracts offered, \d+ delivered, \d+ late, \d+ lost; at the end -?[\d.]+ shippers moved, best [\d.]+, worst -?[\d.]+$/);
  assert.ok(r.freight.boards > 0 && r.freight.taken > 0, JSON.stringify(r.freight));
  assert.match(barReport([r]), /^bar, a chapter's mean over 1 seeds: \d+ choices at a table and \d+ scenes with a main character; the talks moved -?\d+ cr, \d+ points at the post, -?\d+ of opinion over everyone known, \d+ rumors heard; by topic: /);
});

test('with --jobs the soak works the station jobs and puts the jobs elsewhere to the captain, and reports what they paid', async () => {
  const r = await soak({ seed: 1, legs: 10, jobs: true }), w = r.work;
  assert.deepEqual(r.bad, []); assert.deepEqual(r.errors, []);
  assert.ok(w.station > 0 && w.station <= r.runs + 1, `a station job at a landing with a board: ${w.station}`);
  assert.ok(Number.isFinite(w.pay.station) && Number.isFinite(w.pay.away) && w.pay.station !== 0, `the jobs moved the hand's credits: ${JSON.stringify(w.pay)}`);
  assert.ok(w.pitched >= w.booked && w.offered >= w.pitched / 4, `offered ${w.offered}, pitched ${w.pitched}, booked ${w.booked}`);
  assert.match(jobsReport([r]), /^jobs, a chapter's mean over 1 seeds: station \d+ worked for -?\d+ cr, elsewhere \d+ played for -?\d+ cr \(offered \d+, put to the captain \d+, agreed \d+\); job pay -?\d+ percent/);
  const plain = await soak({ seed: 1, legs: 10 });
  assert.equal(plain.work.station, 0, 'without the flag no station job is taken (a job elsewhere can still play when the captain happens to land there)');
});

test('for every captain the trouble, then the secret, then the used-ship offer', async () => {
  for (const captainKey of ['hester', 'dov', 'imre', 'zoya']) {
    const r = await soak({ seed: 1, legs: 40, captainKey });
    const [trouble, secret] = r.beatDays;
    assert.ok(trouble !== undefined && secret !== undefined, `${captainKey}: both scenes play before the chapter ends`);
    assert.ok(trouble <= secret, `${captainKey}: trouble ${trouble} before secret ${secret}`);  // a long burn can play both; the order holds
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
  assert.match(lines[2], /^2 chapters, chapters with: .*; nights in port \d+(\.\d)? a chapter$/);
});

test('with --frames the soak plays the burn, and an order for the drive costs reaction mass and shortens it (#292)', async () => {
  let base, fast;
  for (const seed of [1, 2, 3, 4]) {  // a seed whose hand dies ends the chapter early (js/boarders.js), so the first seed where neither does
    base = await soak({ seed, legs: 6, post: 'engineer', frames: true });
    fast = await soak({ seed, legs: 6, post: 'engineer', frames: true, engineer: 'favor-drive' });
    if (!base.ending && !fast.ending) break;
  }
  for (const r of [base, fast]) { assert.deepEqual(r.bad, []); assert.deepEqual(r.errors, []); assert.equal(r.runs, 6); for (const k of ['raids', 'scrams', 'hull', 'fuel', 'planned', 'seen']) assert.ok(Number.isFinite(r.frames[k]), k); }
  assert.ok(fast.frames.fuel > base.frames.fuel, 'a hotter drive burns more reaction mass');
  assert.ok(base.frames.live > 0, 'the live flight loop is played in each system with --frames');
  const sailedPerPlanned = r => r.plans.reduce((t, p) => t + (p.sailed || 0), 0) / r.plans.reduce((t, p) => t + p.days, 0);  // the routes differ once the dice diverge, so each burn against its own plan
  assert.ok(sailedPerPlanned(fast) < sailedPerPlanned(base), `and the burns are shorter: ${sailedPerPlanned(fast)} against ${sailedPerPlanned(base)} of the days planned`);
  const lines = [], log = console.log; console.log = x => lines.push(x);
  try { framesReport([base, fast], 'x: '); } finally { console.log = log; }
  assert.match(lines[0], /^x: 2 chapters, /);
});

after(closeBrowser);
