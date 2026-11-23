'use strict';

// A journey (tests/journey.js, #1329): a raider's fight on the radar, set up with ev() and then played only through the page: at 16x, Play and Play
// again at each pause, to its end. Which end it is rides on the dice, so the test asks that the radar gave way to the fight's end.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser } = require('./helpers');
const { screen, playRadar } = require('./journey');

after(closeBrowser);

// An ordinary hired game on a burn, and a raider's fight open (as tests/chaptertwostart.test.js opens one).
const raider = () => {
  startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester' }); while (G.dialog) finishEvent();
  const st = G.state; st.tutorial = null; st.story.next = 1e9; hired().raidTold = true;
  uatBurn('Ceres Station', 'pallas'); G.transit.times = []; G.transit.event = null; G.dialog = null;
  G.nextEvent = null; startShipFight({ kind: 'pirate', gov: 'Arcology Pact', shipId: 'raider' }, false); const e = G.nextEvent; G.nextEvent = null; openEvent(e);
};

// The situation bar shows her hull at each press.
test('journey: a ship fight on the radar played to an end', async () => {
  const { page, ev, errors, done } = await open({ seed: 1 });
  await ev(raider);
  const first = await screen(page);
  assert.match(first, /Battle Stations/); assert.match(first, /Cycle 1, 0 s/);
  const hers = text => Number((text.match(/\bhers (\d+)%/) || [])[1]);
  const seen = await playRadar(page);
  const end = await screen(page);
  assert.doesNotMatch(end, /Cycle \d+, \d+ s/, 'the radar gave way to the fight\'s end');
  assert.ok(seen.length >= 1, 'Play was pressed');
  assert.ok(seen.map(hers).every(n => n >= 0 && n <= 100), `her hull is on the situation bar at each press: ${seen.map(hers).join(', ')}`);
  assert.deepEqual(errors, []);
  await done();
});
