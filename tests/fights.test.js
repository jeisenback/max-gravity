'use strict';

// tools/fights.js: the fights over seeded trials. One tiny run, to check the tool still drives each fight to its end and
// reports a table of the right shape (the numbers themselves are in COMBAT.md, and are for tuning, not for a test).

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { closeBrowser } = require('./helpers');
const { fights } = require('../tools/fights');

after(closeBrowser);
const DECK_N = 200, DECK_SEEDS = [1, 2];  // deck fights a cell in the spread test, on each of two seeds played side by side: boarding her at grade 1 wins 57 in a hundred over
// five seeds against the lock fight's 62, so one seed of 200 can fall just past the ten points (seed 1 at 0.515 after R42's casualty roll moved the draws); two seeds hold it

test('the fights tool plays the ship fight, the repel fight and the assault fight to their ends', async () => {
  const r = await fights({ seed: 1, n: 3 });
  assert.deepEqual(r.errors, []);
  assert.deepEqual(Object.keys(r.raid), ['random', 'focus', 'drive', 'lock', 'answer'], 'the guns\' policies');
  const closed = t => t.crippled + t.broke + t.ran + t.away + t.boarded + t.lost + t.escaped + t.died;
  for (const t of Object.values(r.raid)) { assert.equal(t.n, 3); assert.equal(closed(t), 3, 'every fight ends one way, or with the hand killed'); assert.ok(t.rounds >= 3 - t.died && t.rounds <= 3 * 8, 'one to eight turns a fight'); assert.equal(t.capped, 0, 'and the scene after it is played to its end'); }
  for (const kind of [r.repel, r.assault]) {
    assert.ok(Object.keys(kind).length >= 10);
    for (const t of Object.values(kind)) { assert.equal(t.n, 3); assert.ok(t.rounds >= 3, 'a fight lasts more than a round'); assert.ok(t.won <= 3); }
  }
});

// The ship fight's targets (docs/superpowers/specs/2026-10-21-ship-fight-rework-design.md, "How we know it worked"; #808 Task 7), read from the tool's table by
// the type she is (a raider, a corsair, a navy cutter, a raider pair), on two seeds of 200 played side by side (about 130 to 200 fights a policy and type):
// - no fixed aim (random, focus, drive, lock) has more than 70% good ends (crippled, broken off, escaped) against every type, and the best fixed aim is not the
//   same against every type (random against a lone raider, a corsair and a cutter, her lock against a pair, at five seeds of 100: COMBAT.md);
// - the policy that reads her shown move (answer) has the best good ends against every type, by ten points or more (at five seeds its lead is 16 points or more);
// - random play loses ('ran' or 'lost') a quarter of its fights or more over every type (39% at five seeds);
// - a fight lasts five to eight turns on the mean over every policy and type (6.3), and every fight ends one of the named ways: there is no standoff.
// The lock fights started directly are left out (lock: false). The hand is killed in at most 3 random fights in a hundred.
const SHIP_N = 200, SHIP_SEEDS = [1, 2];
test('no fixed aim wins against every type of ship and the best one differs by type, reading her move beats them all, random play loses a quarter of its fights, and a fight lasts five to eight turns', async () => {
  const runs = await Promise.all(SHIP_SEEDS.map(seed => fights({ seed, n: SHIP_N, lock: false })));
  for (const x of runs) assert.deepEqual(x.errors, []);
  const m = {};  // the seeds' rows by policy and type, summed
  for (const x of runs) for (const [k, t] of Object.entries(x.match)) { const acc = m[k] = m[k] || {}; for (const [f, v] of Object.entries(t)) acc[f] = (acc[f] || 0) + v; }
  const TYPES = ['raider', 'corsair', 'cutter', 'raider pair'], FIXED = ['random', 'focus', 'drive', 'lock'], ENDS = ['crippled', 'broke', 'escaped', 'away', 'boarded', 'ran', 'lost'];
  const row = (p, type) => m[`${p}|${type}`], good = t => t.good / t.n;
  for (const type of TYPES) for (const p of [...FIXED, 'answer']) {
    const t = row(p, type);
    assert.ok(t && t.n >= 80, `${p} against a ${type}: ${t ? t.n : 0} fights`);
    assert.equal(ENDS.reduce((n, e) => n + (t[e] || 0), 0) + t.died, t.n, `${p} against a ${type}: every fight ends one of the named ways (no standoff)`);
  }
  for (const p of FIXED) assert.ok(TYPES.some(type => good(row(p, type)) <= 0.7), `${p} has more than 70% good ends against every type: ${TYPES.map(type => good(row(p, type)).toFixed(2)).join(', ')}`);
  const best = TYPES.map(type => FIXED.slice().sort((a, b) => good(row(b, type)) - good(row(a, type)))[0]);
  assert.ok(new Set(best).size >= 2, `the best fixed aim is ${best[0]} against every type`);
  TYPES.forEach((type, i) => assert.ok(good(row('answer', type)) >= good(row(best[i], type)) + 0.1, `against a ${type}: answer ${good(row('answer', type)).toFixed(2)}, ${best[i]} ${good(row(best[i], type)).toFixed(2)}`));
  const over = p => { const all = {}; for (const type of TYPES) for (const [f, v] of Object.entries(row(p, type))) all[f] = (all[f] || 0) + v; return all; };
  const rnd = over('random');
  assert.ok(rnd.lostFight / rnd.n >= 0.25, `random play loses ${(rnd.lostFight / rnd.n).toFixed(2)} of its fights`);
  assert.ok(rnd.died / rnd.n <= 0.03, `the hand is killed in ${(rnd.died / rnd.n).toFixed(3)} of random fights`);
  const every = [...FIXED, 'answer'].map(over), turns = every.reduce((n, t) => n + t.rounds, 0) / every.reduce((n, t) => n + t.n, 0);
  assert.ok(turns >= 5 && turns <= 8, `a fight lasts ${turns.toFixed(2)} turns on the mean`);
});

// The deck fight both ways (Task 7, R36). With five crew, random play wins about as often by her grade as the lock fight before it did (within ten points of
// 83, 59 and 40 in a hundred repelling, and 82, 62 and 34 boarding her), and costs about as many dead (within 0.15 a fight of 0.28, 0.43 and 0.57
// repelling, and 0.29, 0.41 and 0.56 boarding her: R42, a head lost is downed and only sometimes a casualty, DECK.CASUALTY); and the best of the hand's plans wins five points or more over random play,
// so that where the hand stands and what it does there count: repelling with two crew or five, and boarding her with two. Boarding her with five, the best
// plan is seven points up over five seeds but from -5 to 7 on one seed, so it is not checked here (task-7-report.md). The ship fights are left out
// (raid: false), and only the groups asked are played.
test('the deck fight is won by grade about as often as the lock fight was, kills about as many of the crew, and the hand\'s plan beats random play', async () => {
  const runs = await Promise.all(DECK_SEEDS.map(seed => fights({ seed, n: DECK_N, raid: false, groups: ['policy', 'small crew', 'grade'] })));
  for (const x of runs) assert.deepEqual(x.errors, []);
  const r = {};  // the seeds' tallies summed, cell by cell
  for (const kind of ['repel', 'assault']) { r[kind] = {}; for (const x of runs) for (const [cell, t] of Object.entries(x[kind])) { const acc = r[kind][cell] = r[kind][cell] || {}; for (const [k, v] of Object.entries(t)) acc[k] = (acc[k] || 0) + v; } }
  const won = t => t.won / t.n, BASE = { repel: [0.83, 0.59, 0.4], assault: [0.82, 0.62, 0.34] };
  const dead = t => t.dead / t.n, DEAD = { repel: [0.28, 0.43, 0.57], assault: [0.29, 0.41, 0.56] };  // the lock fight's dead a fight (R42)
  for (const kind of ['repel', 'assault']) {
    const k = r[kind];
    BASE[kind].forEach((was, grade) => {
      const now = won(k[`grade|crew 5 level 2 random grade ${grade}`]);
      assert.ok(Math.abs(now - was) <= 0.1, `${kind} at grade ${grade}: ${now.toFixed(2)} won against the lock fight's ${was}`);
      const died = dead(k[`grade|crew 5 level 2 random grade ${grade}`]);
      assert.ok(Math.abs(died - DEAD[kind][grade]) <= 0.15, `${kind} at grade ${grade}: ${died.toFixed(2)} dead a fight against the lock fight's ${DEAD[kind][grade]}`);
    });
    for (const [group, crew] of kind === 'repel' ? [['policy', 5], ['small crew', 2]] : [['small crew', 2]]) {
      const rnd = won(k[`${group}|crew ${crew} level 2 random grade 0`]);
      const [plan, best] = ['shoot', 'cover', 'order'].map(p => [p, won(k[`${group}|crew ${crew} level 2 ${p} grade 0`])]).sort((a, b) => b[1] - a[1])[0];
      assert.ok(best >= rnd + 0.05, `${kind} with ${crew} crew: ${plan} ${best.toFixed(2)} against random ${rnd.toFixed(2)}`);
    }
  }
});
