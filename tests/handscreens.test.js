'use strict';

// What a hired hand's screens show: no owner tabs, a Suggest button shut with its reason, and no empty mission headings.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

const helpers = () => {
  window.startHand = () => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'dov' }); while (G.dialog) finishEvent();
    const st = G.state; st.story.next = 1e9; st.tutorial = null; G.mode = 'landed';
    return st;
  };
  window.subTabs = () => { const d = document.createElement('div'); d.innerHTML = bridgeKeys(currentPlanet(), 'port'); return [...d.querySelectorAll('.tabs.sub button')].map(b => b.textContent); };
};

test('a hired hand has no Exchange or Company sub-tab, and an owner keeps them', async () => {
  const hand = await open({ scope: 'earth-hired' });
  await hand.ev(helpers);
  const h = await hand.ev(() => { startHand(); return subTabs(); });
  assert.deepEqual(h, ['Port', 'Missions', 'Bar']);
  await hand.done();
  const owner = await open({ scope: 'full' });
  await owner.ev(helpers);
  const o = await owner.ev(() => { G.state = newState(); G.mode = 'landed'; return subTabs(); });
  assert.ok(o.includes('Exchange') && o.includes('Company'));
  await owner.done();
});

test('Suggest is shut with a visible reason until the captain listens', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const st = startHand(), h = hired(), base = { good: 'water', tons: 5, cost: 100, planet: 'Mars', ballast: false, sid: 'mars', profit: 400 };
    h.plan = { day: st.day, at: st.planet, cargo: JSON.stringify(st.cargo), run: { ...base, profit: 1000 }, alts: [base] };
    const html = () => { const d = document.createElement('div'); d.innerHTML = swayHtml(); return { disabled: d.querySelector('button').disabled, text: d.textContent }; };
    const cap = person(h.captain), out = {};
    cap.opinion = captainHears() - 1; out.shut = html();
    cap.opinion = captainHears(); out.open = html();
    return out;
  });
  assert.ok(r.shut.disabled); assert.match(r.shut.text, /does not take suggestions from a hand they do not know yet/);
  assert.ok(!r.open.disabled); assert.doesNotMatch(r.open.text, /do not know yet/);
  await done();
});

test('the Missions tab shows no empty headings for a hand, and shows them once there is content', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    startHand(); G.offers = [];
    const text = () => { const d = document.createElement('div'); d.innerHTML = UI.views.missions.call(UI); return d.textContent; };
    const out = { empty: text() };
    G.state.missions = [{ type: 'delivery', tons: 1, destSystem: G.state.systemId, reward: 100, title: 'Test', id: 1 }];
    out.filled = text();
    return out;
  });
  assert.doesNotMatch(r.empty, /Available work|Active missions|None/);
  assert.match(r.filled, /Active missions/); assert.doesNotMatch(r.filled, /Available work/);
  await done();
});
