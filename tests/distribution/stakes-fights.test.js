'use strict';

// Distribution check: the danger of the hired chapter's fights (npm run soak), with each burn's seconds and its contact played (tools/soak.js --frames), so the
// ship fights are in the chapter (fightui.js: a heavy turn can hurt the hand) and so are the deck fights after a boarding, played by the fight tool's answer
// (tools/answer.js answerDeck). Not part of `npm test`: it depends on a spread over many random games, and it moves whenever a new random draw shifts the stream.
// It guards how often the hand is hurt (FIGHT.HAND_HURT, DECK.SUIT, js/boarders.js REPEL_HURT), hurt again, and how often a chapter ends early (the first-hurt
// roll and CAPTAIN_LOST, js/boarders.js). The scene mix and the hand's death without the fights are in tests/distribution/stakes.test.js.
//
// Sample:    the narrow build's captain with a gunner, seeds 1 to 120, up to 40 runs each, four at a time, the pair the tests start from (120 chapters since the
//            deck fight rework: on 40, an early ending more or less was the whole margin).
// Tolerance: the hand is hurt between 0.1 and 0.7 times a chapter (measured 0.55, 66 of 120, with the deck fight's DECK.SUIT 0.2; on seeds 1 to 40: 0.60, 24 of 40,
//            with #814's FIGHT.POOL; 0.47 once the soak plays on to the yard and meets the ladder's set piece, #810; 0.33 before; 0.30 before the fight rework, 4ed304f;
//            1.13 with the rework's first tune, when two of her torpedoes unanswered were nearly always a heavy turn, #808); hurt again while still hurt in at most
//            a tenth of the chapters, 12 of 120 (measured 4; on 40: 4 since #814, 0 before that, 5 with the first tune); and at most 3 in 40 of the chapters
//            end early, 9 of 120 (the hand's death, the captain's loss or the hand put ashore: measured 8, 5 deaths and 3 captains lost, with CAPTAIN_LOST
//            1 / 6; 12 with 1 / 3; on 40: 0, 1 before, 4 with the first tune; a death is meant near 3 in 100 chapters, js/boarders.js).

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { closeBrowser } = require('../helpers');

after(closeBrowser);

test('with the burns and their contacts played, the ship fights hurt the hand about as often as tuned, rarely twice, and rarely end a chapter early', async () => {
  const { soaks } = require('../../tools/soak');
  const runs = await soaks(Array.from({ length: 120 }, (_, i) => i + 1), { legs: 40, frames: true });
  for (const r of runs) { assert.deepEqual(r.bad, [], `seed ${r.seed}`); assert.deepEqual(r.errors, [], `seed ${r.seed}`); }
  const hurts = runs.reduce((n, r) => n + r.hand.hurt, 0), again = runs.filter(r => r.hand.again > 0).length, early = runs.filter(r => r.ending);
  assert.ok(hurts / runs.length >= 0.1 && hurts / runs.length <= 0.7, `the hand was hurt ${(hurts / runs.length).toFixed(2)} times a chapter (${hurts} in ${runs.length})`);
  assert.ok(again <= runs.length / 10, `the hand was hurt again while still hurt in ${again} of ${runs.length} chapters`);
  assert.ok(early.length <= (3 * runs.length) / 40, `${early.length} of ${runs.length} chapters ended early: ${early.map(r => `seed ${r.seed} ${r.ending.title}`).join(', ')}`);
});
