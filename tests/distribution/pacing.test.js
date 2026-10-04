'use strict';

// Distribution check: the hired chapter's pacing and pay (npm run soak). Not part of `npm test`: it depends on a spread over many
// random games, so it moves whenever any new random draw shifts the stream, and the bands below have been widened for that more
// than once. It guards against a captain who pays far more or less than the rest, or a chapter that does not reach its target.
//
// Sample:    4 captains x 5 seeds = 20 games of up to 40 runs each (tools/soak.js), played one after another (about 35 s).
// Tolerance: every game reaches the target in 6 to 40 runs and on day 30 to 260, never with the planner stuck, no page errors
//            and no broken text; per captain, the median of the five seeds is 10 to 30 runs and day 60 to 190, and the mean pay
//            per run is 800 to 2,000 cr; across captains the pay per day differs by at most 1.7 times (over 20 seeds it is
//            about 1.1, but the mean of five seeds swings from 1.1 to 1.55 with nothing changed but the draws).
// The pins that belong in `npm test` (the order of a captain's scenes, the offer after the secret) are in tests/soak.test.js.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { closeBrowser } = require('../helpers');

after(closeBrowser);

// Seeds differ in luck (the answers are random), so each captain's runs are checked seed by seed, and the pay as a mean per day.
// The tuning aim is about 15 percent between captains; the test only guards against a captain who pays far more or less.
// The day bound is wide because an unlucky seed can run to the 170s (the random stream shifts with whatever draws before it).
test('about twenty runs reach the target with every captain, and the planner is never stuck', async () => {
  const { soak } = require('../../tools/soak');
  const perDay = {};
  for (const captainKey of ['hester', 'dov', 'imre', 'zoya']) {
    const rs = [];
    for (const seed of [1, 2, 3, 4, 5]) rs.push(await soak({ seed, legs: 40, captainKey }));
    for (const r of rs) {
      assert.ok(r.reached, `${captainKey} seed ${r.seed} never reached the target in ${r.runs} runs`);
      assert.ok(r.reached.runs >= 6 && r.reached.runs <= 40 && r.reached.day >= 30 && r.reached.day <= 260, `${captainKey} seed ${r.seed}: ${r.reached.runs} runs, day ${r.reached.day}`);  // no single seed is far out: the tight band is on the median, below
      assert.equal(r.stuck, 0, `${captainKey} seed ${r.seed}: the captain had no plan`);
      assert.deepEqual(r.bad, []); assert.deepEqual(r.errors, []);
    }
    const med = a => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)], mr = med(rs.map(r => r.reached.runs)), md = med(rs.map(r => r.reached.day));
    assert.ok(mr >= 10 && mr <= 30 && md >= 60 && md <= 190, `${captainKey}: median ${mr} runs, day ${md}`);  // about twenty runs, with a little room: any one seed moves when the random numbers shift
    const pay = rs.reduce((t, r) => t + r.avgPayPerRun, 0) / rs.length, days = rs.reduce((t, r) => t + r.avgDaysPerRun, 0) / rs.length;
    // (an ice run, js/icerun.js, is long and pays about 2,800, so the mean a run is up; what the economy keeps is the pay a day)
    assert.ok(pay >= 800 && pay <= 2000, `${captainKey}: mean pay per run ${Math.round(pay)}`);
    perDay[captainKey] = pay / days;
  }
  const rates = Object.values(perDay), spread = Math.max(...rates) / Math.min(...rates);
  // Measured: over 20 seeds a captain's pay per day differs by about 1.1 at most between captains, but the mean of five seeds swings
  // between 1.1 and 1.55 with nothing changed but which random numbers are drawn. So this guards against gross imbalance only.
  assert.ok(spread <= 1.7, `pay per day across captains: ${JSON.stringify(perDay)}`);
});
