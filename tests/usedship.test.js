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
    out.below = dock(10000); out.none = !hired().deal;
    out.first = dock(10500); out.deal = !!hired().deal;
    out.again = dock(15000);
    return out;
  });
  assert.equal(r.below, null); assert.equal(r.none, true);
  assert.match(r.first.text, /Tomas/); assert.equal(r.deal, true);
  assert.equal(r.again, null, 'once');
  await done();
});

test('the price follows how Tomas thinks of the hand', async () => {
  const prices = {};
  for (const [name, opinion] of [['good', 3], ['middle', 0], ['bad', -2]]) {
    const { r, done } = await run(o => { start(); tomas().opinion = o; dock(10500); return hired().deal.price; }, {}, opinion);
    prices[name] = r; await done();
  }
  assert.deepEqual(prices, { good: 17000, middle: 19000, bad: 21000 });
});

test('the deal lasts a few weeks, and then the ship is gone and the ordinary yard list is left', async () => {
  const { r, done } = await run(() => {
    const st = start(), out = {};
    dock(10500); const h = hired();
    out.open = dealOpen(); out.listed = /used/i.test(buyInHtml());
    st.day = h.deal.until;  out.lastDay = dealOpen();
    st.day = h.deal.until + 1; out.lapsed = dealOpen(); out.listedAfter = /used/i.test(buyInHtml());
    UI.notes.length = 0; dock(12000); out.note = UI.notes.join(' ');
    st.credits = 50000; out.hopper = canBuyIn('shuttle', currentPlanet()); out.usedBuyable = canBuyIn(USED_ID, currentPlanet());
    out.days = h.deal.until - h.deal.day;
    return out;
  });
  assert.equal(r.open, true); assert.equal(r.listed, true); assert.equal(r.lastDay, true);
  assert.equal(r.lapsed, false); assert.equal(r.listedAfter, false); assert.equal(r.usedBuyable, false);
  assert.match(r.note, /gone/i); assert.equal(r.hopper, true, 'the Dust Skiff stays buyable');
  assert.ok(r.days >= 14 && r.days <= 90);
  await done();
});

test('without Tomas a broker offers the same ship at the full second-hand price', async () => {
  const { r, done } = await run(() => {
    const st = start();
    st.crew = st.crew.filter(id => !person(id).cast);
    const scene = dock(10500);
    return { text: scene && scene.text, price: hired().deal && hired().deal.price, broker: hired().deal && hired().deal.broker };
  });
  assert.match(r.text, /broker/i); assert.doesNotMatch(r.text, /Tomas/);
  assert.equal(r.price, 21000); assert.equal(r.broker, true);
  await done();
});

test('the bought ship starts worn, and the chapter still closes', async () => {
  const { r, done } = await run(() => {
    const st = start(); dock(10500);
    st.credits = hired().deal.price; hired().confirm = USED_ID;
    const before = st.credits, price = hired().deal.price;
    Mods.act('buyInGo', USED_ID);
    const goodbye = G.dialog ? G.dialog.event.title : null; chooseEvent(0); finishEvent();  // the captain's goodbye comes first, then the look back
    chooseEvent(0); finishEvent();
    return { ship: st.shipId, price, left: before - st.credits, condition: { ...st.condition }, hired: !!st.hired, goodbye, scene: G.dialog ? G.dialog.event.title : null, chapter: !!st.flags.chapterOne };
  }, { scope: 'earth-hired' });
  assert.equal(r.ship, 'lightfreighter'); assert.equal(r.left, r.price);
  assert.deepEqual(r.condition, { drive: 70, life: 65, shields: 60, sensors: 70, fire: 45 });
  assert.equal(r.hired, false); assert.equal(r.scene, 'Your Own Ship'); assert.equal(r.chapter, true);
  await done();
});

test('the captain heads for a yard when the used Ore Runner can be had', async () => {
  const { r, done } = await run(() => {
    const st = start(), out = {};
    st.credits = 10449; out.beforeOffer = wantsYard();
    st.credits = 10450; out.atOffer = wantsYard();
    tomas().opinion = 3; dock(10500); st.credits = 16999; out.goodBelow = wantsYard(); st.credits = 17000; out.good = wantsYard();
    st.day = hired().deal.until + 1; st.credits = 18999; out.lapsedBelow = wantsYard(); st.credits = 19000; out.lapsed = wantsYard();
    return out;
  });
  assert.deepEqual(r, { beforeOffer: false, atOffer: true, goodBelow: false, good: true, lapsedBelow: false, lapsed: true });
  await done();
});
