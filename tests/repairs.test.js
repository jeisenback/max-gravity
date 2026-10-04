'use strict';

// Repairs (js/repairs.js): a scrape is patched on landing, real damage puts the ship in the yard for days, parts and money,
// and the bill comes out of the next run's profit.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

const helpers = () => {
  window.setup = () => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester' }); while (G.dialog) finishEvent();
    const st = G.state; st.story.next = 1e9; st.day += 30; st.tutorial = null; G.mode = 'landed'; hired().fund = 50000;
    return st;
  };
  window.dock = (lost, svc) => { const st = G.state; st.armor = ship().armor - lost; const p = svc ? { ...currentPlanet(), services: svc } : currentPlanet(); G.dialog = null; G.nextEvent = null; Mods.emit('landed', p); return p; };
};

test('a scrape is patched on landing and real damage opens the yard scene', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const st = setup(), out = {}, max = ship().armor;
    dock(Math.floor(max * 0.1)); out.scrape = { armor: st.armor === max, scene: !!G.dialog && G.dialog.event.title === 'Hull Damage' };
    while (G.dialog) finishEvent();
    dock(Math.floor(max * 0.4)); out.big = { scene: !!G.dialog && G.dialog.event.title === 'Hull Damage', armor: st.armor < max, text: G.dialog && G.dialog.event.text };
    return out;
  });
  assert.deepEqual(r.scrape, { armor: true, scene: false });
  assert.equal(r.big.scene, true); assert.ok(r.big.armor, 'not mended until the work is done'); assert.doesNotMatch(r.big.text, /undefined|NaN|\{/);
  await done();
});

test('the yard takes days, spends the fund, uses the hold or the market, and the bill comes out of the next share', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const st = setup(), h = hired(), out = {}, max = ship().armor;
    dock(Math.floor(max * 0.4));
    const choose = label => { const d = G.dialog; chooseEvent(d.choices.findIndex(c => c.label.includes(label))); G.dialog = null; G.nextEvent = null; };
    const day0 = st.day, fund0 = h.fund, cred0 = st.credits;
    choose('Stand by');
    out.days = st.day - day0; out.fund = fund0 - h.fund; out.bill = h.bill; out.armor = st.armor === max; out.standby = st.credits - cred0;
    // a longer wait where there is no yard and no metals on sale: the same damage takes longer
    const withYard = repairPlan(currentPlanet()), noYard = repairPlan({ ...currentPlanet(), services: ['refuel'] });
    out.noYardSlower = noYard.days > withYard.days;
    // hold metal is used instead of bought
    st.cargo.metal = 99; st.paid.metal = 1; const held = repairPlan(currentPlanet()); out.heldFree = held.parts === 0 && held.held;
    // the bill comes out of the profit first
    h.bill = 400; h.ledger = []; h.run = { ballast: true, good: null, tons: 0, cost: 0, day: st.day - 5, from: st.planet, sid: st.systemId, planet: st.planet };
    const bill0 = h.bill, text = settleRun(currentPlanet()); out.billLeft = h.bill; out.text = text;
    return out;
  });
  assert.ok(r.days >= 1); assert.ok(r.fund > 0 && r.bill === r.fund); assert.ok(r.armor); assert.ok(r.standby > 0);
  assert.ok(r.noYardSlower); assert.ok(r.heldFree);
  assert.equal(r.billLeft, 400, 'a run with no profit leaves the bill for the next');
  await done();
});

test('the choices of the yard scene all work, and helping is faster, and rest mends the hurt', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const st = setup(), h = hired(), out = { bad: [] }, max = ship().armor;
    for (const label of ['Stand by', 'Help with', 'Work the dock', 'Rest and let']) {
      dock(Math.floor(max * 0.4)); h.hurtUntil = st.day + 12; st.injured = { x: true };
      const d = G.dialog, i = d.choices.findIndex(c => c.label.includes(label));
      if (i < 0) { out.bad.push(`missing ${label}`); continue; }
      const day0 = st.day, text = chooseEvent(i); G.dialog = null; G.nextEvent = null;
      out[label] = { days: st.day - day0, hurt: !!h.hurtUntil, text };
      if (!text || /undefined|NaN|\{[a-z]/.test(text)) out.bad.push(label);
    }
    return out;
  });
  assert.deepEqual(r.bad, []);
  assert.ok(r['Help with'].days < r['Stand by'].days || r['Stand by'].days === 1, 'helping saves a day');
  assert.equal(r['Rest and let'].hurt, false); assert.equal(r['Stand by'].hurt, true);
  await done();
});
