'use strict';

// The ship's night is a condition scenes can read (`night`, storylets.js), and three road scenes use it: they play only while the lights are
// down, and only with the pilot, the engineer or the cook aboard (js/stories/on-the-road.js).

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

const helpers = () => {
  window.burn = () => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester' }); while (G.dialog) finishEvent();
    const st = G.state; st.tutorial = null;
    sail(); while (G.dialog) finishEvent(); tryBurn(); enterTransit(); G.transit.times = []; G.transit.event = null; G.dialog = null;
    return st;
  };
  window.NIGHT_IDS = ['road-night-watch', 'road-night-pump', 'road-night-bread'];
  window.scene = id => STORYLETS.find(s => s.id === id);
  // The scene's own conditions without its roll: night, the post filled, the day.
  window.holds = id => { const w = { ...sceneView(scene(id)).when }; delete w.chance; return meets(w); };
};

test('the night condition holds on a burn while the lights are down, and not by day or off a burn', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const out = {}; startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester' }); while (G.dialog) finishEvent();
    out.offBurn = [meets({ night: true }), meets({ night: false })];
    burn(); const t = G.transit;
    t.elapsed = 5; out.day = [meets({ night: true }), meets({ night: false })];
    t.elapsed = 22; out.night = [meets({ night: true }), meets({ night: false })];
    return out;
  });
  assert.deepEqual(r.offBurn, [false, false], 'with no burn there is no night to test');
  assert.deepEqual(r.day, [false, true]);
  assert.deepEqual(r.night, [true, false]);
  await done();
});

test('the night scenes play at night with their post filled, and not by day or without it', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const st = burn(), t = G.transit, out = {}; st.day = 30;
    const staff = role => { st.crew = st.crew.filter(id => person(id).role !== role); const p = makePerson('earth'); p.role = role; p.skill = 1; registerPerson(p); st.crew.push(p.id); return p; };
    t.elapsed = 22; for (const role of ['pilot', 'engineer', 'cook']) st.crew = st.crew.filter(id => person(id).role !== role);
    out.empty = NIGHT_IDS.map(holds);
    staff('pilot'); staff('engineer'); staff('cook');
    out.night = NIGHT_IDS.map(holds);
    t.elapsed = 5; out.day = NIGHT_IDS.map(holds);
    return out;
  });
  assert.deepEqual(r.empty, [false, false, false], 'a night scene needs its post filled');
  assert.deepEqual(r.night, [true, true, true]);
  assert.deepEqual(r.day, [false, false, false], 'by day none of them plays');
  await done();
});

test('every choice of the night scenes reads whole, names the person on the post, and the first two teach the hand something', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const st = burn(), out = { bad: [], names: {}, xp: {} };
    const who = {};
    for (const role of ['pilot', 'engineer', 'cook']) { st.crew = st.crew.filter(id => person(id).role !== role); const p = makePerson('earth'); p.role = role; p.skill = 1; registerPerson(p); st.crew.push(p.id); who[role] = p.first; }
    const role = { 'road-night-watch': 'pilot', 'road-night-pump': 'engineer', 'road-night-bread': 'cook' };
    for (const id of NIGHT_IDS) {
      const e = storyletEvent(scene(id));
      if (/[{}]|undefined|NaN/.test(e.text)) out.bad.push(`${id}: text ${e.text}`);
      if (!e.text.includes(who[role[id]])) out.bad.push(`${id}: the text does not name ${who[role[id]]}`);
      e.choices.forEach((c, j) => {
        G.dialog = { event: e, choices: e.choices }; G.nextEvent = null;
        const before = skillXp('gunner');
        const text = String(chooseEvent(j));
        if (/[{}]|undefined|NaN/.test(text)) out.bad.push(`${id}.${j}: ${text}`);
        out.xp[`${id}.${j}`] = skillXp('gunner') - before;
        while (G.dialog) finishEvent();
      });
    }
    return out;
  });
  assert.deepEqual(r.bad, []);
  assert.equal(r.xp['road-night-watch.0'] > 0, true); assert.equal(r.xp['road-night-pump.0'] > 0, true);
  assert.equal(r.xp['road-night-watch.1'], 0); assert.equal(r.xp['road-night-bread.0'], 0);
  await done();
});
