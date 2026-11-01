'use strict';

// Distribution check: the danger and the scene mix of the hired chapter (npm run soak). Not part of `npm test`: it depends on a spread over many
// random games, and it moves whenever a new random draw shifts the stream. It guards the numbers that were measured and tuned by hand: how often
// the hand is hurt and dies (js/boarders.js, the first-hurt roll), how many scenes a landing opens (#635), and that the ship's night comes into
// the sample so the night scenes can play (tools/soak.js draws each event at its second of the burn). The exact rolls are pinned in tests/boarders.test.js.
//
// Sample:    the narrow build's captain with a gunner, seeds 1 to 120, up to 40 runs each, four at a time, the two main characters drawn from the pool
//            (120 chapters since the deck fight rework: 30 left a rate of a hurt in ten chapters at one hurt from its floor).
// Tolerance: every game runs with no page errors and no broken text; the hand is hurt between 0.1 and 0.8 times a chapter (measured 0.14, 17 of 120, with the
//            deck fight's DECK.SUIT 0.2; 0.10, 3 of 30, on seeds 11 to 40 before it; 0.40 earlier, and 0.27 after the turn-based fights made a hurt rarer, #786);
//            at most a fifth of the chapters end in the hand's death, 24 of 120 (measured 0; about 1 in 30 is the aim; a floor would fail one run in three at that rate, so there is none);
//            of the landings, 70 to 95 percent open at least one scene (75 before the bible's smaller crew, #879: measured 74 and 8 over 120 chapters, the owner, 2026-11-01) and 5 to 20 percent open two or more (measured 86 and 12 over 120 chapters; 87 and 15 over 30,
//            64 with none, 342 with one, 72 with two or more of 478; it was 56 before the crew's errands ashore, #678, fill the quiet stops, #788);
//            and the three scenes of the ship's night play at least once between them (measured 63 plays; before the soak stamped each draw with its second of the burn, none).
// The ship fights' share of the danger, with each burn's seconds and its contact played, is in tests/distribution/stakes-fights.test.js, on a runner of its own (.github/workflows/soak.yml).

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { closeBrowser } = require('../helpers');

after(closeBrowser);

test('the hand is hurt about as often as tuned and rarely dies, a landing opens a scene about half the time, and the ship\'s night plays its scenes', async () => {
  const { soaks } = require('../../tools/soak');
  const runs = await soaks(Array.from({ length: 120 }, (_, i) => i + 1), { legs: 40, realDraw: true });
  for (const r of runs) { assert.deepEqual(r.bad, [], `seed ${r.seed}`); assert.deepEqual(r.errors, [], `seed ${r.seed}`); }
  const hurts = runs.reduce((n, r) => n + r.hand.hurt, 0) / runs.length;
  assert.ok(hurts >= 0.1 && hurts <= 0.8, `the hand was hurt ${hurts.toFixed(2)} times a chapter`);
  const deaths = runs.filter(r => r.ending && r.ending.title === 'The Last Run').length;
  assert.ok(deaths <= runs.length / 5, `${deaths} of ${runs.length} chapters ended in the hand's death`);
  const mix = [0, 0, 0];
  for (const r of runs) for (const [n, c] of Object.entries(r.landings)) mix[Math.min(2, Number(n))] += c;
  const landings = mix[0] + mix[1] + mix[2], some = 100 * (mix[1] + mix[2]) / landings, two = 100 * mix[2] / landings;
  assert.ok(some >= 70 && some <= 95, `${some.toFixed(0)} percent of ${landings} landings opened a scene (none ${mix[0]}, one ${mix[1]}, two or more ${mix[2]})`);
  assert.ok(two >= 5 && two <= 20, `${two.toFixed(0)} percent of ${landings} landings opened two scenes or more`);
  const night = ['road-night-watch', 'road-night-pump', 'road-night-bread'].reduce((n, id) => n + runs.reduce((t, r) => t + (r.byId[id] || 0), 0), 0);
  assert.ok(night >= 1, `the ship's night scenes never played in ${runs.length} chapters`);
});
