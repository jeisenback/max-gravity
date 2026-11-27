'use strict';

// The fights' soak checks that are not the deck plan's own (those are tests/distribution/deckplanfights.test.js, over tools/planfights.js) nor the radar's
// (tests/distribution/radarfights.test.js): the navy party's turn cap, and chapter two's raids. Many-seed checks, so they are in the soak (npm run soak,
// nightly on main) and not in npm test (#753, the owner's choice, 2026-10-28): run them by hand when a change touches the fights, as CLAUDE.md says.
// The old deck fight's targets went with it (#1355).
//
// Profiles:  none: chapter two's soak (tools/soaktwo.js) uses no soak player (tools/soak.js SOAK_PROFILES, #1199).

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { closeBrowser } = require('../helpers');
const { load } = require('../nodecontext');

after(closeBrowser);

// The navy party's cap (an inspection party that has not held our bridge by then withdraws): on the deck plan about 8 turns, where the old deck fight's was
// the spec's 4 to 6 (#1355: the plan's turns are a spot a step, so the same inspection takes more of them).
const { PLAN } = load(['js/sheet.js', 'js/camera.js', 'js/layouts.js', 'js/shipcombat.js', 'js/fight.js', 'js/radar.js', 'js/handtohand.js', 'js/deckplan.js'], {}, ['PLAN']);
test('the navy party\'s cap sits at about 8 turns, under the raiders\' cap', () => {
  assert.ok(PLAN.NAVY_TURNS >= 7 && PLAN.NAVY_TURNS <= 9, `PLAN.NAVY_TURNS is ${PLAN.NAVY_TURNS}`);
  assert.ok(PLAN.NAVY_TURNS < PLAN.TURNS, `against PLAN.TURNS ${PLAN.TURNS}`);
});

// Chapter two (#891): the raids the co-op's Ore Runner meets on 60 days of the board's contracts (tools/soaktwo.js), what they cost the hull, and who is lost.
// Sample: 6 seeds. Measured 2026-11-07 over 8 seeds: 0 to 3 raids a seed (about 0.3 a run), 0 to 297 hull lost (the Ore Runner has 100), nobody lost and no
// hand killed. The bands were accepted by the owner as measured (2026-11-07, #891).
test('chapter two: the co-op meets raids on the board\'s runs, and they cost the hull without ending every run', async () => {
  const { soaksTwo } = require('../../tools/soaktwo');
  const rs = await soaksTwo([1, 2, 3, 4, 5, 6], { days: 60 }, 3);
  const runs = rs.reduce((t, r) => t + r.runs, 0), raids = rs.reduce((t, r) => t + r.raids, 0), ended = rs.filter(r => r.ending).length;
  for (const r of rs) { assert.deepEqual(r.bad, [], `seed ${r.seed}`); assert.deepEqual(r.errors, [], `seed ${r.seed}`); }
  assert.ok(raids / runs <= 1, `${raids} raids in ${runs} runs`);  // accepted by the owner (#891)
  assert.ok(ended <= rs.length / 2, `${ended} of ${rs.length} runs ended early`);  // accepted by the owner (#891)
  console.log(`chapter two fights: ${rs.map(r => `${r.seed}:${r.raids} raids ${r.hull} hull${r.ending ? ` ${r.ending}` : ''}`).join(', ')}`);
});
