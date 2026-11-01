'use strict';

// The soak tool (tools/soak.js): sails the captain's runs and reports them.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser } = require('./helpers');
const { soak, chapter, report, framesReport, jobsReport, barReport, freightReport } = require('../tools/soak');

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

// The first of seeds 1 to 10 whose chapter has what a test needs (a seed picked by hand moved with every fight tune, #808): the soak's result, or null.
async function firstSeed(opts, has) {
  for (let seed = 1; seed <= 10; seed++) { const r = await soak({ ...opts, seed }); if (has(r)) return r; }
  return null;
}

test('with --frames every deck fight is played to its close, and a fight\'s panels count once with their scene (#786)', async () => {
  const r = await firstSeed({ legs: 20, frames: true }, x => x.deck.begun > 0);
  assert.ok(r, 'a deck fight was fought in one of seeds 1 to 10');
  assert.deepEqual(r.bad, []); assert.deepEqual(r.errors, []);
  assert.equal(r.deck.settled + r.deck.died, r.deck.begun, `seed ${r.seed}: each settled, or the hand was killed in it: ${JSON.stringify(r.deck)}`);
  assert.ok((r.scenes['Battle Stations'] || 0) <= 2 * r.frames.raids, `seed ${r.seed}: the fight's panel and its close, not a count a turn: ${r.scenes['Battle Stations']} for ${r.frames.raids} raids`);
});

test('a card duel played over its exchanges and a boarding after it is one fight, not scenes against the step cap (the Ice Hauler\'s fitting makes the duel longer)', async () => {
  // A hunter's card duel runs up to DUEL_ROUNDS exchanges (before any boarding), then the lock and the corridor; a duel cut off at the step cap would be a bad run
  // ('fight left open'). A duel is rare in a chapter (a hunter after the hand: one of seeds 1 to 40 plays one), so here every contact is a hunter's (G.revenge).
  const { ev, ctx } = await open({ scope: 'earth-hired', seed: 1, debt: true, stall: 0 });
  await ev(() => { Object.defineProperty(G, 'revenge', { configurable: true, get: () => ({ first: 'Ada', last: 'Krell' }), set() {} }); });
  const r = await ev(chapter, [20, null, false, 'gunner', true, null, false]);
  await ctx.close();
  assert.deepEqual(r.bad, []);
  assert.ok(Object.keys(r.scenes).some(t => /^Contact: exchange \d/.test(t)), `a card duel was played: ${Object.keys(r.scenes).filter(t => /Contact|Lock|Corridor/.test(t)).join(', ')}`);
  assert.ok(r.scenes['The Corridor'] > 0 || r.scenes['The Lock'] > 0, 'and a boarding fight after one');
});

test('for every captain the trouble, then the secret, then the used-ship offer', async () => {
  for (const captainKey of ['hester', 'dov', 'imre', 'zoya']) {
    const r = await soak({ seed: 4, legs: 40, captainKey });  // not every seed ends with the offer: a chapter that closes at the buy price can do so before a landing at a yard (seeds 1 and 2 each have one such captain). Seed 4, since a rating's pay (#879): every captain's offer by day 64 to 95, in 10 to 15 runs; seed 3's came at day 93 to 102 and missed it on CI's build
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
