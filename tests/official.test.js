'use strict';

// One official at each dock who knows you (official.js, #674): the same person at a port every landing, named in the dock scenes, moved by what you do
// there, and letting a known face through.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

const helpers = () => {
  window.setup = () => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester' }); while (G.dialog) finishEvent();
    const st = G.state; st.story.next = 1e9; st.day += 30; G.dialog = null; G.nextEvent = null;
    return { st, planet: currentPlanet() };
  };
};

test('the same official every landing, titled by the government, made with no draw from the game\'s dice, and not at the bar', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const { st, planet } = setup(), out = {};
    __seed(3); const a = Math.random(); __seed(3); const p = dockOfficial(planet); const b = Math.random();
    out.noDraw = a === b; out.again = dockOfficial(planet) === p; out.registered = st.people[p.id] === p; out.title = p.title; out.job = p.job; out.gov = SYSTEMS[st.systemId].gov;
    out.name = officialName(planet); out.filled = fill('At the lock, {official} waits.');
    fillBar(planet); out.atBar = G.patrons.some(x => x.p === p);
    // the same person for the same port in another game
    startGame({ slot: 2, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester' }); while (G.dialog) finishEvent();
    out.sameFace = dockOfficial(currentPlanet()).last === p.last;
    return out;
  });
  assert.ok(r.noDraw, 'making the official draws nothing from the game\'s dice'); assert.ok(r.again && r.registered);
  assert.equal(r.title, { 'Arcology Compact': 'Officer', 'Dome Concord': 'Officer', 'Charter League': 'Dockmaster', Pirate: 'Collector' }[r.gov] || 'Dockmaster'); assert.ok(r.job.length > 3);
  assert.equal(r.filled, `At the lock, ${r.name} waits.`); assert.equal(r.atBar, false, 'the official is at the dock, not on a stool');
  assert.ok(r.sameFace, 'the same port has the same official in every game');
  await done();
});

test('the dock scenes name the official, move their regard with a memory in their words, and open a choice to a known face', async () => {
  const { ev, done } = await open({ scope: 'full' });
  await ev(helpers);
  const r = await ev(() => {
    const { st, planet } = setup(), out = {};
    st.systemId = 'ceres'; st.planet = 'Ceres Station'; landAt(currentPlanet(), []); while (G.dialog) finishEvent();  // a Charter League port, for the surcharge
    const p = dockOfficial(currentPlanet()), s = STORYLETS.find(x => x.id === 'land-surcharge');
    out.problems = storyletProblems(s, { duplicate: false });
    let e = storyletEvent(s); out.named = e.text.includes(officialName(currentPlanet()));
    out.known = e.choices.find(c => /applies to you/.test(c.label)); out.shutCold = out.known && out.known.can() === false;
    G.dialog = { event: e, choices: e.choices }; st.credits = 1000; const op = p.opinion; chooseEvent(0);
    out.paid = p.opinion - op; out.mem = p.memories.slice(-1)[0];
    p.opinion = 2; e = storyletEvent(s); out.open = e.choices.find(c => /applies to you/.test(c.label)).can() === true;
    G.dialog = { event: e, choices: e.choices }; const op2 = p.opinion, res = chooseEvent(3); out.waved = /Regulars pay on the way out/.test(res) && p.opinion - op2 >= 0;
    out.argued = (() => { const ev2 = storyletEvent(s); G.dialog = { event: ev2, choices: ev2.choices }; const o = p.opinion; chooseEvent(1); return p.opinion - o; })();
    return out;
  });
  assert.deepEqual(r.problems, []); assert.ok(r.named, 'the scene names the official'); assert.ok(r.known && r.shutCold, 'the known-face choice is shut below the regard');
  assert.equal(r.paid, 1); assert.match(r.mem, /paid the surcharge/); assert.ok(r.open && r.waved); assert.equal(r.argued, -1);
  await done();
});
