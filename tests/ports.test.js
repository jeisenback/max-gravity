'use strict';

// Port scenes (js/stories/ports.js): scenes that happen at one port and read like it.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

const helpers = () => {
  window.setup = (post = 'gunner') => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post, captainKey: 'hester' }); while (G.dialog) finishEvent();
    const st = G.state; st.story.next = 1e9; st.day += 30; st.tutorial = null;
    return st;
  };
  window.portScenes = () => STORYLETS.filter(s => s.id.startsWith('port-'));
};

test('Each port with scenes of its own has scenes, and they come up there and nowhere else', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const st = setup(), out = { per: {}, elsewhere: [] };
    for (const [planet, sid] of [['Mars', 'mars'], ['Ganymede', 'jupiter'], ['Hermes Foundry', 'mercury'], ['Earth', 'earth'], ['Ceres Station', 'ceres'], ['Juno Commons', 'juno']]) {
      st.planet = planet; st.systemId = sid; G.mode = 'landed';
      const seen = new Set();
      const roll = CONDITIONS.chance; CONDITIONS.chance = () => true;  // every chance comes up
      try { for (let i = 0; i < 60; i++) { st.qualities = {}; const s = pickStorylet('port', x => x.id.startsWith('port-')); if (s) seen.add(s.id); } } finally { CONDITIONS.chance = roll; }
      out.per[planet] = [...seen].sort();
    }
    out.all = portScenes().map(s => s.id).length;
    return out;
  });
  assert.equal(r.all, 15);
  assert.deepEqual(r.per.Mars, ['port-mars-front', 'port-mars-sky']);  // the recruiter needs a war
  assert.deepEqual(r.per.Ganymede, ['port-ganymede-jupiter', 'port-ganymede-market', 'port-ganymede-pump']);
  assert.deepEqual(r.per['Hermes Foundry'], ['port-hermes-coolant', 'port-hermes-glass', 'port-hermes-heat']); assert.deepEqual(r.per.Earth, ['port-earth-queue', 'port-earth-yard']);
  assert.deepEqual(r.per['Ceres Station'], ['port-ceres-dock', 'port-ceres-gym']);
  assert.deepEqual(r.per['Juno Commons'], ['port-juno-commons', 'port-juno-trade']);
  await done();
});

test('every choice in every port scene works for every post, with clean text, and a choice for another post is not shown', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const st = setup(), out = { bad: [], counts: {} };
    factionState().war = { a: 'Mars Republic', b: 'Earth Coalition', start: st.day, until: st.day + 40, score: { 'Mars Republic': 0, 'Earth Coalition': 0 } };
    for (const post of ['pilot', 'gunner', 'engineer', 'comms']) {
      for (const s of portScenes()) {
        hired().post = post; st.credits = 5000; st.planet = [].concat(s.when.planet)[0]; st.systemId = { Mars: 'mars', Ganymede: 'jupiter', 'Hermes Foundry': 'mercury', Earth: 'earth', 'Ceres Station': 'ceres', 'Juno Commons': 'juno' }[st.planet]; G.mode = 'landed';
        const e = storyletEvent(s);
        out.counts[`${s.id}:${post}`] = e.choices.length;
        for (let i = 0; i < e.choices.length; i++) {
          st.credits = 5000; const before = skillXp(post);
          const ev2 = storyletEvent(s); G.dialog = { event: ev2, choices: ev2.choices };
          const text = chooseEvent(i);
          if (!text || /undefined|NaN|\{[a-z:]+\}/.test(text) || /undefined|NaN|\{[a-z:]+\}/.test(ev2.text + ev2.choices.map(c => c.label).join(' '))) out.bad.push(`${s.id}:${post}:${i}`);
          G.nextEvent = null; G.dialog = null;
        }
      }
    }
    return out;
  });
  assert.deepEqual(r.bad, []);
  assert.equal(r.counts['port-mars-front:pilot'], 3, 'a pilot sees the pilot choice and the two general ones');
  assert.equal(r.counts['port-mars-front:gunner'], 2, 'a gunner sees only the two general ones');
  assert.equal(r.counts['port-mars-front:engineer'], 3); assert.equal(r.counts['port-ganymede-pump:gunner'], 2);
  await done();
});

test('a post\'s own choice teaches the post, pays what it says, and a kindness is remembered', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const st = setup('engineer'), s = STORYLETS.find(x => x.id === 'port-ganymede-pump'), out = {};
    const e = storyletEvent(s); G.dialog = { event: e, choices: e.choices };
    const xp = skillXp('engineer'), credits = st.credits, cap = person(hired().captain).opinion;
    chooseEvent(e.choices.findIndex(c => /Rebuild the pump/.test(c.label)));
    out.xp = skillXp('engineer') - xp; out.credits = st.credits - credits; out.cap = person(hired().captain).opinion - cap;
    return out;
  });
  assert.equal(r.xp, 4); assert.equal(r.credits, 120); assert.equal(r.cap, 1);
  await done();
});
