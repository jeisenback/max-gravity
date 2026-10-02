'use strict';

// The downtime menu shows five options at a time, mixed from the ship's own, a hand's and what is on now, and turns each time.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

const helpers = () => { window.setup = () => {
  startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'engineer' }); while (G.dialog) finishEvent();
  const st = G.state; st.story.next = 1e9; st.flags.classicCombat = true; st.day += 30;
  uatBurn('Ceres Station', 'pallas'); G.transit.times = []; G.transit.event = null; G.dialog = null;
}; };

test('five at a time, and Not now is always last', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => { setup(); const out = {}, labels = e => e.choices.map(c => c.label);
    const every = downtimeEvent(true).choices.filter(c => c.label !== 'Not now' && (!c.can || c.can())).length;
    const menu = labels(downtimeEvent());
    out.every = every; out.menu = menu; return out; });
  assert.ok(r.every > 5, `there are more than five to choose from (${r.every})`);
  assert.equal(r.menu.length, 6, 'five and Not now'); assert.equal(r.menu[5], 'Not now'); assert.equal(new Set(r.menu).size, 6);
  await done();
});

test('the same five stay open for that half of the burn, and it turns for the next', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => { setup(); const out = {}, five = () => downtimeEvent().choices.map(c => c.label).slice(0, 5);
    const a = five(), again = five();
    G.transit.flipped = true; const b = five(), bAgain = five();
    out.same = JSON.stringify(a) === JSON.stringify(again) && JSON.stringify(b) === JSON.stringify(bAgain);
    out.differs = JSON.stringify(a) !== JSON.stringify(b);
    return out; });
  assert.equal(r.same, true, 'reopening does not reroll'); assert.equal(r.differs, true, 'the second half turns the menu');
  await done();
});

test('everything comes round, and each five is a mix of the three kinds', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => { setup(); const out = {}, label = a => (typeof a.label === 'function' ? a.label() : a.label);
    const all = downtimeEvent(true).choices.filter(c => c.label !== 'Not now' && (!c.can || c.can())).map(c => c.label), seen = new Set(), kinds = [];
    const lanes = [baseActivities().filter(a => !a.can || a.can()).map(label), handDowntime().filter(a => !a.can || a.can()).map(label), onNow().filter(a => !a.can || a.can()).map(label)];
    for (let i = 0; i < 14; i++) {
      G.transit.lifeShown = {};
      const five = downtimeEvent().choices.map(c => c.label).slice(0, 5);
      five.forEach(l => seen.add(l));
      kinds.push(lanes.map(l => five.some(x => l.includes(x))));
    }
    out.missing = all.filter(l => !seen.has(l)); out.lanes = lanes.map(l => l.length); out.mixed = kinds.every(k => k.filter(Boolean).length === lanes.filter(l => l.length).length);
    return out; });
  assert.deepEqual(r.missing, [], 'every option shows up within fourteen turns');
  assert.ok(r.lanes.every(n => n > 0), `all three kinds have something (${r.lanes})`);
  assert.equal(r.mixed, true, 'each five draws on every kind');
  await done();
});

test('with five or fewer, all of them show', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => { setup(); const keep = [window.onNow, window.handDowntime];
    window.onNow = () => []; window.handDowntime = () => [];
    try { const few = baseActivities().filter(a => !a.can || a.can()).length, menu = downtimeEvent().choices.map(c => c.label); return { few, menu: menu.length }; }
    finally { [window.onNow, window.handDowntime] = keep; } });
  assert.ok(r.few <= 5, `the ship's own are ${r.few}`);
  assert.equal(r.menu, r.few + 1, 'every one, and Not now');
  await done();
});
