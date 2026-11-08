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
    const later = dock(120000); out.note = later && ['The Empty Cradle', 'Gone From the Apron'].includes(later.title) ? later.title : null;  // a landing may open other scenes
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

// #954: with the money for the co-op's offer and Captain Hester's two scenes still to come, the captain does not sail for a yard, the run card
// says what the co-op waits for, a due scene is certain on the next burn, and the hand can ask the captain: her scenes play then and there, in
// order, and having asked, the offer does not wait the two runs after them.
test('with the money there and the captain\'s scenes to come: no yard, the card says why, and asking plays them and opens the offer (#954)', async () => {
  const { r, done } = await run(() => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester' }); while (G.dialog) finishEvent();
    const st = G.state, h = hired(), out = {}; st.story.next = 1e9; h.flags = { ...(h.flags || {}), sawHull: true };
    st.credits = 60000; G.mode = 'landed';
    out.yard = wantsYard();
    out.card = goalLine(st, h); out.button = /data-action="askCaptain"/.test(runHtml());
    out.certain = beatTier(st) === 0; st.credits = 1000; out.poor = beatTier(st) === 0; st.credits = 60000;
    st.day = h.since + 1;  // asking does not wait for the scenes' days (15 and 40)
    const ask = () => { Mods.act('askCaptain'); const title = G.dialog && G.dialog.event.title; G.nextEvent = null; while (G.dialog) finishEvent(); return title; };
    out.first = ask(); out.beats1 = h.beats; out.second = ask(); out.beats2 = h.beats;
    out.after = { yard: wantsYard(), button: /data-action="askCaptain"/.test(runHtml()), card: goalLine(st, h) };
    out.offer = dock(60000); out.deal = !!h.deal;
    return { ...out, offer: out.offer && out.offer.title };
  });
  assert.equal(r.yard, false, 'she does not sail for a yard while the offer cannot come');
  assert.match(r.card, /co-op won't talk to you yet.*Hester Vance has something to tell you first/, r.card);
  assert.equal(r.button, true, 'the hand can ask the captain');
  assert.deepEqual([r.certain, r.poor], [true, false], 'a due scene is certain on the next burn with the money there, and drawn as before without it');
  assert.ok(r.first && r.second && r.first !== r.second, `two scenes, one after the other: ${r.first}, ${r.second}`);
  assert.deepEqual([r.beats1, r.beats2], [1, 2]);
  assert.deepEqual({ yard: r.after.yard, button: r.after.button }, { yard: true, button: false }, 'now she heads for a yard, and there is nothing left to ask');
  assert.doesNotMatch(r.after.card, /won't talk/, r.after.card);
  assert.ok(r.offer && r.deal, `the offer at the next yard, with no runs to wait: ${r.offer}`);
  await done();
});

test('with the captain\'s scenes played and runs still to go, the card counts them', async () => {
  const { r, done } = await run(() => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester' }); while (G.dialog) finishEvent();
    const st = G.state, h = hired(); st.story.next = 1e9; st.credits = 60000;
    Object.assign(h, { beats: 2, beatRun: runTotals(h).runs, flags: { ...(h.flags || {}), sawHull: true } });
    return { card: goalLine(st, h), yard: wantsYard() };
  });
  assert.match(r.card, /co-op will offer you a berth after two more runs/, r.card);
  assert.equal(r.yard, false);
  await done();
});
