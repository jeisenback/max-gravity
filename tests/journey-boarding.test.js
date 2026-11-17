'use strict';

// A journey (tests/journey.js, #1329): boarders through the lock, set up with ev() and then fought only through the deck panel's choices, the hand's
// act (the choice after where they stand) and an order to the crew each turn, then Fight, to the fight's close. Whether they are repelled rides on the
// page's dice, which the frames drawn between the clicks share: a plain player repels a full party about two times in three, so the test asks that the
// fight is fought turn by turn on the panel to its close, whichever close it is, and not that it is won.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser } = require('./helpers');
const { screen, choose } = require('./journey');

after(closeBrowser);

// An ordinary hired game on a burn, and a full boarding party at the lock (as tests/boarders.test.js opens one), past the first officer's briefing.
const boarded = () => {
  startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester' }); while (G.dialog) finishEvent();
  const st = G.state; st.tutorial = null; st.story.next = 1e9; st.day += 30; hired().deckTold = true;
  uatBurn('Ceres Station', 'pallas'); G.transit.times = []; G.transit.event = null; G.dialog = null;
  startDuel({ kind: 'hunter', person: { first: 'Ana', last: 'Voss' } }, false); G.nextEvent = null;
  openEvent(repelEvent({ foe: G.duel.foe, foeHp: 0, init: 'foe' }, 'full'));
};
// Theirs in every section the panel shows: "THE LOCK 1 3" is one of ours and three of theirs.
const theirs = text => [...text.matchAll(/\bTHE (?:LOCK|CORRIDOR|BRIDGE|CARGO BAY|ENGINE ROOM|GALLEY|BERTHS)\s+(\d+)\s+(\d+)/gi)].reduce((n, m) => n + Number(m[2]), 0);
const fighting = text => /ORDERS TO THE CREW/.test(text);

test('journey: a boarding fought through the deck panel to its close', async () => {
  const { page, ev, errors, done } = await open({ seed: 1 });
  await ev(boarded);
  const first = await screen(page);
  assert.ok(fighting(first), `the deck panel is up: ${first.slice(0, 300)}`);
  assert.ok(theirs(first) > 0, 'boarders on the panel');
  assert.match(first, /Turn 1 of \d+/);
  let turns = 0;
  for (; turns < 12 && fighting(await screen(page)); turns++) {
    await page.locator('#panel').getByRole('button', { name: /^Stand:/ }).locator('xpath=following::button[1]').click();  // the hand's act, the choice after where they stand (a shot, or what the order makes of it)
    await choose(page, /^Order:/);  // an order to the crew
    await choose(page, /^Fight$/);
    if (turns === 0) assert.match(await screen(page), /Turn 1: /, 'the first turn is written in the panel\'s log');
  }
  const end = await screen(page);
  assert.ok(!fighting(end), `the fight closed within ${turns} turns`);
  assert.ok(turns >= 2, `fought over ${turns} turns`);
  assert.match(end, /Stand down/, 'the close, and the crew stand down');
  assert.deepEqual(errors, []);
  await done();
});
