'use strict';

// Distribution check: the hired chapter's pacing and pay (npm run soak). Not part of `npm test`: it depends on a spread over many
// random games, so it moves whenever any new random draw shifts the stream, and the bands below have been widened for that more
// than once. It guards against a captain who pays far more or less than the rest, or a chapter that does not reach its target.
//
// Sample:    4 captains x 5 seeds = 20 games of up to 40 runs each (tools/soak.js), a captain's five seeds at a time.
// Tolerance: every game reaches the target in 6 to 40 runs and on day 30 to 260, never with the planner stuck, no page errors
//            and no broken text; per captain, the median of the five seeds is 10 to 30 runs and day 60 to 190, and the mean pay
//            per run is 2,500 to 8,000 cr; across captains the pay per day, as a share of each captain's day rate less the kit,
//            differs by at most 1.25 times. A rating is paid a day rate that differs by captain on purpose (#879: Dov 700, Zoya 450), so
//            the raw pay per day differs by about that much; measured against the rate it sat at 0.95 to 1.01 (20 seeds, 2026-11-06).
// The pins that belong in `npm test` (the order of a captain's scenes, the offer after the secret) are in tests/soak.test.js.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { closeBrowser, open } = require('../helpers');

after(closeBrowser);

// Seeds differ in luck (the answers are random), so each captain's runs are checked seed by seed, and the pay as a mean per day.
// The tuning aim is about 15 percent between captains; the test only guards against a captain who pays far more or less.
// The day bound is wide because an unlucky seed can run to the 170s (the random stream shifts with whatever draws before it).
test('about twenty runs reach the target with every captain, and the planner is never stuck', async () => {
  const { soaks } = require('../../tools/soak');
  const perDay = {};
  for (const captainKey of ['hester', 'dov', 'imre', 'zoya']) {
    const all = await soaks([1, 2, 3, 4, 5], { legs: 40, captainKey }, 5);
    for (const r of all) { assert.equal(r.stuck, 0, `${captainKey} seed ${r.seed}: the captain had no plan`); assert.deepEqual(r.bad, []); assert.deepEqual(r.errors, []); }
    // A seed can end the chapter early (a hand who dies, js/boarders.js: stakes.test.js and stakes-fights.test.js hold how often) or be ruined by one bad pick of the random answers (4,000 cr of a small fund
    // paid at a patrol stop), so most seeds must reach the target and the pace is read from those that do.
    const rs = all.filter(r => !r.ending && r.reached);
    assert.ok(rs.length >= 3, `${captainKey}: ${rs.length} of 5 seeds reached the target (${all.map(r => r.ending ? 'ended' : r.reached ? 'ok' : `no, ${r.runs} runs`).join(', ')})`);
    for (const r of rs) assert.ok(r.reached.runs >= 6 && r.reached.runs <= 40 && r.reached.day >= 30 && r.reached.day <= 260, `${captainKey} seed ${r.seed}: ${r.reached.runs} runs, day ${r.reached.day}`);  // no single seed is far out: the tight band is on the median, below
    const med = a => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)], mr = med(rs.map(r => r.reached.runs)), md = med(rs.map(r => r.reached.day));
    assert.ok(mr >= 10 && mr <= 30 && md >= 60 && md <= 190, `${captainKey}: median ${mr} runs, day ${md}`);  // about twenty runs, with a little room: any one seed moves when the random numbers shift
    const pay = rs.reduce((t, r) => t + r.avgPayPerRun, 0) / rs.length, days = rs.reduce((t, r) => t + r.avgDaysPerRun, 0) / rs.length;
    // (an ice run, js/icerun.js, is long and pays about 28,000, so the mean a run is up; what the economy keeps is the pay a day)
    assert.ok(pay >= 2500 && pay <= 8000, `${captainKey}: mean pay per run ${Math.round(pay)}`);  // a rating's day rate less the kit, and no share (#879): measured 3,166 to 5,408 over the four captains; 8,000 to 20,000 with the share
    perDay[captainKey] = pay / days;
  }
  const { ev, done } = await open({ scope: 'full' }), rate = await ev(() => Object.fromEntries(Object.entries(CAPTAINS).map(([k, c]) => [k, c.wage - KIT_DEDUCTION]))); await done();  // the day rate a rating is paid (hired.js)
  const rates = Object.entries(perDay).map(([k, v]) => v / rate[k]), spread = Math.max(...rates) / Math.min(...rates);
  // Measured against each captain's day rate less the kit: 0.95 to 1.01 over 20 seeds (2026-11-06); five seeds swing more, so this
  // guards against something other than the rate skewing a captain's pay, not against the rates themselves (the owner sets those).
  assert.ok(spread <= 1.25, `pay per day against each captain's day rate: ${JSON.stringify(Object.fromEntries(Object.entries(perDay).map(([k, v]) => [k, `${Math.round(v)} of ${rate[k]}`])))}`);
});

// Chapter two (#891): the co-op's Ore Runner on the board's contracts for 60 days (tools/soaktwo.js), the pay a day into the co-op's fund.
// Sample: 6 seeds. Measured 2026-11-07 over 8 seeds: 4 to 5 runs, 5,121 to 10,823 cr a day (mean about 8,600), every master drawn. The band was accepted
// by the owner as measured (2026-11-07, #891); it guards that the co-op earns, and is never stuck.
test('chapter two: the co-op earns on the board, and is never stuck', async () => {
  const { soaksTwo } = require('../../tools/soaktwo');
  const rs = await soaksTwo([1, 2, 3, 4, 5, 6], { days: 60 }, 3);
  for (const r of rs) { assert.deepEqual(r.bad, [], `seed ${r.seed}`); assert.deepEqual(r.errors, [], `seed ${r.seed}`); assert.ok(r.runs >= 2, `seed ${r.seed}: ${r.runs} runs`); }
  for (const r of rs.filter(r => !r.ending)) assert.ok(r.perDay > 0 && r.perDay <= 20000, `seed ${r.seed}: ${r.perDay} cr a day`);  // accepted by the owner (#891)
  console.log(`chapter two pacing: ${rs.map(r => `${r.seed}:${r.runs} runs ${r.perDay}/day`).join(', ')}`);
});
