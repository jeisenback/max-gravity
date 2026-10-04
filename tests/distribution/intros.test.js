'use strict';

// Distribution check: the main characters are introduced early (npm run soak). Not part of `npm test`: it depends on a spread over
// many random games. Their introductions are tier 1 candidates in the burn's draw (js/cast.js), so one plays in the first run or
// two without any extra weight; this guards that it stays so, whatever is added to the draw.
//
// Sample:    60 seeded games (seeds 1 to 60) of three runs each, with the two main characters drawn from the pool as in the game
//            (tools/soak.js --real-draw). Measured when this was written, over 100 seeds: the first main character in run 1 in 86
//            games and in run 2 in the other 14; the second in run 1, 2 or 3.
// Tolerance: in every game the first main character (not the first officer) is introduced by the end of run 2, and the second by
//            the end of run 3.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { closeBrowser } = require('../helpers');
const { soak } = require('../../tools/soak');

after(closeBrowser);

const SEEDS = Array.from({ length: 60 }, (_, i) => i + 1);

test('a main character is introduced by the end of the second run, and the other by the third', async () => {
  const late = [], first = {}, second = {};
  for (const seed of SEEDS) {
    const r = await soak({ seed, legs: 3, realDraw: true });
    assert.deepEqual(r.errors, [], `seed ${seed}: page errors`);
    const mains = Object.entries(r.introRun).filter(([key]) => !r.firstOfficers.includes(key)).map(([, run]) => run).sort((a, b) => a - b);
    first[mains[0]] = (first[mains[0]] || 0) + 1; second[mains[1]] = (second[mains[1]] || 0) + 1;
    if (!(mains[0] <= 2 && mains[1] <= 3)) late.push(`seed ${seed}: introduced in runs ${mains.join(', ') || 'none'}`);
  }
  assert.deepEqual(late, [], `first main character by run: ${JSON.stringify(first)}, second: ${JSON.stringify(second)}`);
});
