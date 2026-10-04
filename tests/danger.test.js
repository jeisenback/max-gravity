'use strict';

// More danger for a hired hand: pirates find them more often than an owner on the same lane, and a hurt hand works light duty.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

const helpers = () => {
  window.setup = () => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester' }); while (G.dialog) finishEvent();
    const st = G.state; st.story.next = 1e9; st.day += 30; st.tutorial = null; G.mode = 'landed';
    return st;
  };
};

test('on the same lane pirates find a hired hand more often than an owner', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const st = setup(), to = Object.keys(SYSTEMS).find(id => id !== st.systemId), out = {};
    G.state.world = G.state.world || {}; worldOf(st.systemId).unrest = 0.15; worldOf(to).unrest = 0.15;
    const rate = () => { let n = 0; for (let i = 0; i < 1500; i++) { G.transit = { to, total: 100, left: 100 }; G.mode = 'transit'; planIntercept(); if (G.transit.intercept && G.transit.intercept.spec.kind === 'pirate') n++; } G.transit = null; G.mode = 'landed'; return n / 1500; };
    out.hand = rate();
    const h = st.hired; st.hired = null; out.owner = rate(); st.hired = h;
    return out;
  });
  assert.ok(r.hand > r.owner * 1.4, `hand ${r.hand} against owner ${r.owner}`);
  await done();
});

test('a hurt hand is paid light duty for a run', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const st = setup(), h = hired(), out = {};
    const wageFor = hurtNow => {
      h.hurtUntil = hurtNow ? st.day + 10 : 0; h.ledger = [];
      h.run = { ballast: true, good: null, tons: 0, cost: 0, day: st.day - 5, from: st.planet, sid: st.systemId, planet: st.planet };
      const before = st.credits; settleRun(currentPlanet()); return st.credits - before;
    };
    out.well = wageFor(false); out.hurt = wageFor(true);
    return out;
  });
  assert.ok(r.well > 0); assert.equal(r.hurt, Math.round(r.well * 0.6));
  await done();
});
