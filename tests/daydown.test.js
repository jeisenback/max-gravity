'use strict';

// Going down to Lagos (#1162, docs/bible/ports.md): at the Ring, in a captain's wait, the hand takes the spaceplane down for a day from their savings,
// once a day, and plays a day down: a lane's line taken in turn by the day.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

test('a day down: offered at the Ring in a captain\'s wait only, the fare from the hand\'s savings, once a day, a lane\'s line by the day, and again after the night (#1162)', async () => {
  const { ev, errors, done } = await open();
  const r = await ev(() => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester' }); while (G.dialog) finishEvent();
    const st = G.state, h = hired(), row = () => { UI.tab = 'port'; UI.render(); const b = document.querySelector('button[data-action="goDown"]'); return b && { label: b.textContent, shut: b.disabled, hint: (b.parentElement.querySelector('.hint') || {}).textContent || '' }; };
    const out = { noStay: row() };
    delete h.stay; beginStay(h, 3, 'market'); st.credits = 2000;
    out.open = row();
    Mods.act('goDown');
    out.scene = { title: G.dialog.event.title, labels: G.dialog.choices.map(c => c.label), credits: st.credits };
    UI.act('choose', 1); out.line = document.getElementById('event-result').textContent; out.want = sceneSay('scene:day-down', `market.${st.day % 3}`); finishEvent();
    out.spent = row();
    Mods.act('goDown'); out.twice = !!G.dialog;
    Mods.act('night'); while (G.dialog) finishEvent(); out.passed = st.day; if (!stayOf(h)) beginStay(h, 2, 'market'); out.morning = row();  // a shipper may have come in the night (stay.js); the wait goes on here
    st.credits = 100; out.poor = row();
    st.systemId = 'mars'; st.planet = 'Mars'; UI.planet = currentPlanet(); beginStay(h, 3, 'market'); out.mars = row();
    return out;
  });
  await done();
  assert.equal(r.noStay, null, 'no wait, no trip: the ship sails when the captain says');
  assert.deepEqual(r.open, { label: 'Go down to Lagos (900 cr)', shut: false, hint: '' });
  assert.deepEqual(r.scene, { title: 'A Day Down', labels: ['Walk the arcology\'s tiers', 'Cross the lagoon to the mainland market', 'Wait it out in the departure hall'], credits: 1100 });
  assert.equal(r.line, r.want, 'the lane\'s line of the day');
  assert.deepEqual([r.spent.shut, r.spent.hint, r.twice], [true, 'You\'ve been down today.', false], 'once a day');
  assert.deepEqual([r.morning.shut, r.morning.hint], [false, ''], 'the next day, again');
  assert.equal(r.poor.shut, true); assert.match(r.poor.hint, /this costs 900 cr/);
  assert.equal(r.mars, null, 'Lagos is under the Ring, not under Mars');
  assert.deepEqual(errors, []);
});
