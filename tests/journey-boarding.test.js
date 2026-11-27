'use strict';

// A journey (tests/journey.js, #1329): boarders through the lock, set up with ev() and then fought only on the deck plan's page (#1355), the hand's
// act and an order to the crew each turn, then Fight, to the fight's close. Whether they are repelled rides on the
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
// The count under "This turn": "Turn 1 of 12. Ours 6, theirs 4, 4 still to land."
const theirs = text => Number((/\bOurs \d+, theirs (\d+)/.exec(text) || [])[1] || 0);
const fighting = text => /This turn/.test(text);

test('journey: a boarding fought on the deck plan to its close', async () => {
  const { page, ev, errors, done } = await open({ seed: 1 });
  await ev(boarded);
  const first = await screen(page);
  assert.ok(fighting(first), `the deck plan is up: ${first.slice(0, 300)}`);
  assert.ok(theirs(first) > 0, 'boarders on the decks');
  assert.match(first, /Turn 1 of \d+/);
  let turns = 0;
  for (; turns < 14 && fighting(await screen(page)); turns++) {
    await page.locator('#panel [data-action="planAct"]').first().click();  // the hand's act: the first offered (a shot at the best of them in line, or an ability)
    const orders = page.locator('#panel [data-action="planOrder"]:not([data-arg="none"])');
    if (await orders.count()) await orders.first().click();  // an order to the crew
    await page.locator('#panel [data-action="planFightGo"]').click();
    if (turns === 0 && fighting(await screen(page))) assert.match(await screen(page), /Turn 1: /, 'the first turn is written in the page\'s log');
  }
  const end = await screen(page);
  assert.ok(!fighting(end), `the fight closed within ${turns} turns`);
  assert.ok(turns >= 2, `fought over ${turns} turns`);
  assert.match(end, /Stand down/, 'the close, and the crew stand down');
  assert.deepEqual(errors, []);
  await done();
});
