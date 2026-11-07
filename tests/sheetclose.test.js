'use strict';

// Player reports from play (2026-11-07): #912, an order you give yourself at your post says the experience it taught; #913, a sheet of the burn view
// (a station's console, the interior, a person's card) closes with its own close button and with Escape, which opens the pause menu only when no sheet is open.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

const helpers = () => {
  window.onBurn = () => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester' }); while (G.dialog) finishEvent();
    const st = G.state; st.story.next = 1e9; st.tutorial = null;
    uatBurn('Earth', 'mars'); G.transit.times = []; G.transit.event = null; G.dialog = null;
    return st;
  };
};

test('#912: an order given at your own post says the experience it taught you', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    onBurn(); postState('gunner').manual = true; postState('gunner').busy = false;
    const o = postOrders('gunner').find(x => !x.can || x.can()), x0 = skillXp('gunner');
    const note = giveOrder('gunner', o.id);
    return { note, gained: skillXp('gunner') - x0 };
  });
  await done();
  assert.equal(r.gained, 1);
  assert.match(r.note, /\(\+1 experience at the gunner post\.\)$/);
});

test('#913: a burn sheet closes with its close button and with Escape; Escape with no sheet open opens the pause menu', async () => {
  const { page, ev, done } = await open();
  await ev(helpers);
  await ev(() => { onBurn(); G.bridgeOpen = 'interior'; syncBridge(true); });
  await page.click('#bsheet [data-bclose]');
  const afterX = await ev(() => ({ open: G.bridgeOpen, hidden: document.getElementById('bsheet').hidden }));
  await ev(() => { G.bridgeOpen = 'eng'; syncBridge(true); });
  await page.keyboard.press('Escape');
  const afterEsc = await ev(() => ({ open: G.bridgeOpen, paused: !!G.paused }));
  await page.keyboard.press('Escape');
  const then = await ev(() => ({ paused: !!G.paused }));
  await done();
  assert.deepEqual(afterX, { open: null, hidden: true });
  assert.deepEqual(afterEsc, { open: null, paused: false }, 'Escape closes the sheet, not the game');
  assert.equal(then.paused, true, 'with nothing open, Escape pauses as before');
});
