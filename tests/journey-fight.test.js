'use strict';

// A journey (tests/journey.js, #1329): a raider's fight, set up with ev() and then played only through the battle panel's choices, each gun at her
// hull and Fire, to its close. Which close it is rides on the dice, so the test asks that the panel gave way to the fight's end and that her armor
// on screen fell from the first turn's.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser } = require('./helpers');
const { screen, choose } = require('./journey');

after(closeBrowser);

// An ordinary hired game on a burn, and a raider's fight open (as tests/chaptertwostart.test.js opens one).
const raider = () => {
  startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester' }); while (G.dialog) finishEvent();
  const st = G.state; st.tutorial = null; st.story.next = 1e9; hired().raidTold = true;
  uatBurn('Ceres Station', 'pallas'); G.transit.times = []; G.transit.event = null; G.dialog = null;
  G.nextEvent = null; startShipFight({ kind: 'pirate', gov: 'Arcology Pact', shipId: 'raider' }, false); const e = G.nextEvent; G.nextEvent = null; openEvent(e);
};
const herArmor = text => Number((text.match(/\bHer\s+ARMOR\s+(\d+)/i) || [])[1]);

test('journey: a ship fight played through the panel to an end', async () => {
  const { page, ev, errors, done } = await open({ seed: 1 });
  await ev(raider);
  const first = await screen(page);
  assert.match(first, /Battle Stations/); assert.match(first, /ORDERS TO THE GUNS/);
  const start = herArmor(first);
  assert.ok(start > 0, `her armor is on the panel: ${first.slice(0, 300)}`);
  let turns = 0, last = start;
  for (; turns < 30 && /ORDERS TO THE GUNS/.test(await screen(page)); turns++) {
    const hull = page.locator('#panel').getByRole('button', { name: 'Hull', exact: true, disabled: false });
    for (const i of [0, 1]) await hull.nth(i).click();  // each gun's order: her hull
    last = herArmor(await screen(page)) || last;
    await choose(page, /^Fire/);
  }
  const end = await screen(page);
  assert.doesNotMatch(end, /ORDERS TO THE GUNS/, `the fight closed within ${turns} turns`);
  assert.doesNotMatch(end, /Battle Stations/, 'the panel gave way to the fight\'s end');
  assert.ok(turns >= 1 && last < start, `her armor on screen fell from ${start} to ${last}`);
  assert.deepEqual(errors, []);
  await done();
});
