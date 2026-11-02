'use strict';

// The chapter's goal as a member's share in the Ceres co-op's Ore Runner (#882, docs/superpowers/specs/2026-11-02-coop-share-design.md).

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

test('the share\'s figures: a buy-in by the vote, the full share, and the rest owed', async () => {
  const { ev, done } = await open();
  const r = await ev(() => ({ share: typeof SHARE_PRICE === 'undefined' ? null : SHARE_PRICE, buyIn: typeof BUY_IN === 'undefined' ? null : BUY_IN, target: HIRED_TARGET, debt: HIRED_DEBT,
    port: typeof COOP_PORT === 'undefined' ? null : COOP_PORT, stopgap: typeof STOPGAP_FACTOR }));
  await done();
  assert.equal(r.share, 150000);
  assert.deepEqual(r.buyIn, { good: 51000, mid: 57000, bad: 63000 });
  assert.equal(r.target, 57000); assert.equal(r.debt, 9000); assert.equal(r.port, 'Ceres Station');
  assert.equal(r.stopgap, 'undefined');
});

// A hand with the captain's two scenes behind them, the hull seen, and the co-op's offer open at the middle buy-in.
const withDeal = () => {
  window.handWithDeal = (o = {}) => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester' }); while (G.dialog) finishEvent();
    const st = G.state, h = hired(); st.story.next = 1e9; st.tutorial = null;
    Object.assign(h, { beats: 2, beatRun: -2, flags: { sawHull: true }, debt: o.debt || 0 });
    h.deal = { price: BUY_IN.mid, day: st.day, until: st.day + DEAL_DAYS, broker: false };
    st.credits = o.credits === undefined ? 60000 : o.credits;
    return st;
  };
  window.at = (sid, planet) => { const st = G.state; st.systemId = sid; st.planet = planet; G.mode = 'landed'; return currentPlanet(); };
};

test('the share is signed at Ceres only: another yard shows the notice and no button', async () => {
  const { ev, done } = await open();
  await ev(withDeal);
  const r = await ev(() => {
    handWithDeal();
    const earth = currentPlanet(), there = { html: buyInHtml(), can: canBuyIn(USED_ID, earth), yard: earth.services.includes('shipyard') };
    const ceres = at('ceres', 'Ceres Station'), here = { html: buyInHtml(), can: canBuyIn(USED_ID, ceres), coop: isCoop(ceres), other: isCoop(earth) };
    return { there, here };
  });
  await done();
  assert.equal(r.there.yard, true, 'the start port has a yard');
  assert.match(r.there.html, /signed at Ceres/); assert.doesNotMatch(r.there.html, /data-action="buyInAsk"/); assert.equal(r.there.can, false);
  assert.equal(r.here.coop, true); assert.equal(r.here.other, false); assert.equal(r.here.can, true);
  assert.match(r.here.html, /data-action="buyInAsk" data-arg="used"/); assert.match(r.here.html, />Sign on/);
  assert.match(r.here.html, /150,000/); assert.match(r.here.html, /93,000/, 'what will still be owed');
});

test('the yard\'s ships are not on the hand\'s page in the narrow build, and stay in the full build', async () => {
  const narrow = await open(); await narrow.ev(withDeal);
  const n = await narrow.ev(() => { handWithDeal(); at('ceres', 'Ceres Station'); return buyInHtml(); });
  await narrow.done();
  assert.doesNotMatch(n, /Dust Skiff/);
  const full = await open({ scope: 'full' }); await full.ev(withDeal);
  const f = await full.ev(() => { handWithDeal(); at('ceres', 'Ceres Station'); return buyInHtml(); });
  await full.done();
  assert.match(f, /Dust Skiff/); assert.match(f, />Sign on/);
});

test('an unpaid bond at Ceres shows the bond and a disabled button', async () => {
  const { ev, done } = await open();
  await ev(withDeal);
  const r = await ev(() => { handWithDeal({ debt: 3000 }); at('ceres', 'Ceres Station'); return { html: buyInHtml(), can: canBuyIn(USED_ID, currentPlanet()) }; });
  await done();
  assert.equal(r.can, false); assert.match(r.html, /hiring hall 3,000/); assert.match(r.html, /data-action="buyInAsk" data-arg="used" disabled/);
});

test('asking for the share opens no haggle', async () => {
  const { ev, done } = await open();
  await ev(withDeal);
  const r = await ev(() => { handWithDeal(); at('ceres', 'Ceres Station'); Mods.act('buyInAsk', USED_ID); return { confirm: hired().confirm, dialog: !!G.dialog }; });
  await done();
  assert.equal(r.confirm, 'used'); assert.equal(r.dialog, false);
});

test('the captain heads for Ceres with the buy-in in hand', async () => {
  const { ev, done } = await open();
  await ev(withDeal);
  const r = await ev(() => {
    handWithDeal(); at('pallas', 'Pallas Refinery'); G.state.cargo = {};
    const wants = wantsYard(), plan = planRun();
    const board = [{ pay: 9000, days: 3, sid: 'juno', planet: 'Juno Commons', tons: 10 }, { pay: 5000, days: 3, sid: 'ceres', planet: 'Ceres Station', tons: 10 }];
    const pickBest = pickContract(board, { free: 50, goal: c => c.planet === COOP_PORT, risk: () => 1, picks: 1 }).best.planet;
    return { wants, dest: plan && plan.planet, pickBest };
  });
  await done();
  assert.equal(r.wants, true); assert.equal(r.dest, 'Ceres Station'); assert.equal(r.pickBest, 'Ceres Station', 'a contract to Ceres counts four times over');
});
