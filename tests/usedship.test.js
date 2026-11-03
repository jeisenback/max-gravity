'use strict';

// The used Ore Runner and Tomas's deal (js/hired.js): a worn hull offered in the buy-in list once the hand's savings
// reach about 55% of her price, at a price that follows how Tomas thinks of the hand, for a few weeks.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

const helpers = () => {
  window.start = () => { startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner' }); while (G.dialog) finishEvent(); const st = G.state; st.story.next = 1e9; Object.assign(st.hired, { beats: 2, beatRun: -2, flags: { sawHull: true } }); return st; };  // the captain's two scenes are behind them and the hull has been seen: the offer waits for those (captains.js), and these are about the deal
  window.tomas = () => person('c:tomas');
  // Dock at the start port (it has a yard) with this much in savings, and say what came up.
  window.dock = credits => { G.state.credits = credits; G.mode = 'landed'; Mods.emit('landed', currentPlanet()); const scene = G.dialog ? G.dialog.event : null; if (scene) { G.nextEvent = null; while (G.dialog) finishEvent(); } return scene; };
};
const run = async (fn, o, arg) => { const t = await open(o); await t.ev(helpers); return { ...t, r: await t.ev(fn, arg) }; };

test('nothing is offered below 55% of her price, and the beat plays once above it', async () => {
  const { r, done } = await run(() => {
    const st = start(), out = {};
    out.below = dock(31000); out.none = !hired().deal;
    out.first = dock(32000); out.deal = !!hired().deal;
    out.again = dock(45000);
    return out;
  });
  assert.equal(r.below, null); assert.equal(r.none, true);
  assert.match(r.first.text, /Tomas/); assert.equal(r.deal, true);
  assert.match(r.first.text, /co-op/); assert.match(r.first.text, /150,000/, 'the full share beside the buy-in (#882)'); assert.match(r.first.text, /speak for you/);
  assert.equal(r.again, null, 'once');
  await done();
});

test('the price follows how Tomas thinks of the hand', async () => {
  const prices = {};
  for (const [name, opinion] of [['good', 3], ['middle', 0], ['bad', -2]]) {
    const { r, done } = await run(o => { start(); tomas().opinion = o; dock(32000); return hired().deal.price; }, {}, opinion);
    prices[name] = r; await done();
  }
  assert.deepEqual(prices, { good: 51000, middle: 57000, bad: 63000 });
});

test('the co-op holds the berth until you sign: months on, the share is still on the page and nothing lapses (#882)', async () => {
  const { r, done } = await run(() => {
    const st = start(), out = {};
    dock(32000); st.day += 200;
    out.open = dealOpen(); out.listed = /member's share/i.test(buyInHtml());
    const later = dock(120000); out.note = later ? later.title : null;
    st.credits = 500000; out.hopper = canBuyIn('shuttle', currentPlanet()); out.usedBuyable = canBuyIn(USED_ID, currentPlanet());
    return out;
  });
  assert.equal(r.open, true); assert.equal(r.listed, true); assert.equal(r.note, null, 'no lapse');
  assert.equal(r.usedBuyable, false, 'signed at Ceres, not here'); assert.equal(r.hopper, true, 'the Dust Skiff stays buyable');
  await done();
});
// Signing for the co-op's share, the close and the end of chapter one are in tests/coop.test.js (#882): the hand owns no ship, so none starts worn.
test('the captain heads for a yard when the used Ore Runner can be had', async () => {
  const { r, done } = await run(() => {
    const st = start(), out = {};
    st.credits = 31340; out.beforeOffer = wantsYard();
    st.credits = 31350; out.atOffer = wantsYard();
    tomas().opinion = 3; dock(32000); st.credits = 50990; out.goodBelow = wantsYard(); st.credits = 51000; out.good = wantsYard();
    return out;
  });
  assert.deepEqual(r, { beforeOffer: false, atOffer: true, goodBelow: false, good: true });
  await done();
});
