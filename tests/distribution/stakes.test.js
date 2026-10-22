'use strict';

// Distribution check: the danger and the scene mix of the hired chapter (npm run soak). Not part of `npm test`: it depends on a spread over many
// random games, and it moves whenever a new random draw shifts the stream. It guards the numbers that were measured and tuned by hand: how often
// the hand is hurt and dies (js/boarders.js, the first-hurt roll), how many scenes a landing opens (#635), and that the ship's night comes into
// the sample so the night scenes can play (tools/soak.js draws each event at its second of the burn). The exact rolls are pinned in tests/boarders.test.js.
//
// Sample:    the narrow build's captain with a gunner, seeds 11 to 40, up to 40 runs each, four at a time, the two main characters drawn from the pool.
// Tolerance: every game runs with no page errors and no broken text; the hand is hurt between 0.1 and 0.8 times a chapter (measured 0.40;
//            0.27 after the turn-based fights made a hurt rarer, #786);
//            at most 6 chapters of 30 end in the hand's death (measured 1; about 1 in 30 is the aim; a floor would fail one run in three at that rate, so there is none);
//            of the landings, 75 to 95 percent open at least one scene and 5 to 20 percent open two or more (measured 87 and 15: 64 with none, 342 with
//            one, 72 with two or more of 478; it was 56 before the crew's errands ashore, #678, fill the quiet stops, #788);
//            and the three scenes of the ship's night play at least once between them (measured 4, 4 and 4; before the soak stamped each draw with its second of the burn, none).
// The second test plays each burn's seconds and its contact (--frames), so the ship fights are in the chapter (fightui.js: a heavy turn can hurt the hand):
// Sample:    the narrow build's captain with a gunner, seeds 1 to 40, up to 40 runs each, four at a time, the pair the tests start from.
// Tolerance: the hand is hurt between 0.1 and 0.7 times a chapter (measured 0.33, 13 of 40; 0.30 before the fight rework, 4ed304f; 1.13 with the rework's
//            first tune, when two of her torpedoes unanswered were nearly always a heavy turn, #808); hurt again while still hurt in at most 3 chapters
//            (measured 0; 0 before; 5 with the first tune); and at most 3 of the 40 chapters end early (the hand's death, the captain's loss or the hand put
//            ashore: measured 0; 1 before; 4 with the first tune; a death is meant near 3 in 100 chapters, js/boarders.js).

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { closeBrowser } = require('../helpers');

after(closeBrowser);

test('the hand is hurt about as often as tuned and rarely dies, a landing opens a scene about half the time, and the ship\'s night plays its scenes', async () => {
  const { soaks } = require('../../tools/soak');
  const runs = await soaks(Array.from({ length: 30 }, (_, i) => i + 11), { legs: 40, realDraw: true });
  for (const r of runs) { assert.deepEqual(r.bad, [], `seed ${r.seed}`); assert.deepEqual(r.errors, [], `seed ${r.seed}`); }
  const hurts = runs.reduce((n, r) => n + r.hand.hurt, 0) / runs.length;
  assert.ok(hurts >= 0.1 && hurts <= 0.8, `the hand was hurt ${hurts.toFixed(2)} times a chapter`);
  const deaths = runs.filter(r => r.ending && r.ending.title === 'The Last Run').length;
  assert.ok(deaths <= 6, `${deaths} of ${runs.length} chapters ended in the hand's death`);
  const mix = [0, 0, 0];
  for (const r of runs) for (const [n, c] of Object.entries(r.landings)) mix[Math.min(2, Number(n))] += c;
  const landings = mix[0] + mix[1] + mix[2], some = 100 * (mix[1] + mix[2]) / landings, two = 100 * mix[2] / landings;
  assert.ok(some >= 75 && some <= 95, `${some.toFixed(0)} percent of ${landings} landings opened a scene (none ${mix[0]}, one ${mix[1]}, two or more ${mix[2]})`);
  assert.ok(two >= 5 && two <= 20, `${two.toFixed(0)} percent of ${landings} landings opened two scenes or more`);
  const night = ['road-night-watch', 'road-night-pump', 'road-night-bread'].reduce((n, id) => n + runs.reduce((t, r) => t + (r.byId[id] || 0), 0), 0);
  assert.ok(night >= 1, 'the ship\'s night scenes never played in 30 chapters');
});

test('with the burns and their contacts played, the ship fights hurt the hand about as often as tuned, rarely twice, and rarely end a chapter early', async () => {
  const { soaks } = require('../../tools/soak');
  const runs = await soaks(Array.from({ length: 40 }, (_, i) => i + 1), { legs: 40, frames: true });
  for (const r of runs) { assert.deepEqual(r.bad, [], `seed ${r.seed}`); assert.deepEqual(r.errors, [], `seed ${r.seed}`); }
  const hurts = runs.reduce((n, r) => n + r.hand.hurt, 0), again = runs.filter(r => r.hand.again > 0).length, early = runs.filter(r => r.ending);
  assert.ok(hurts / runs.length >= 0.1 && hurts / runs.length <= 0.7, `the hand was hurt ${(hurts / runs.length).toFixed(2)} times a chapter (${hurts} in ${runs.length})`);
  assert.ok(again <= 3, `the hand was hurt again while still hurt in ${again} of ${runs.length} chapters`);
  assert.ok(early.length <= 3, `${early.length} of ${runs.length} chapters ended early: ${early.map(r => `seed ${r.seed} ${r.ending.title}`).join(', ')}`);
});
