'use strict';

// Crew who can be lost (js/losses.js): a hit can kill, a death is recorded and grieved, and the crew answer how the ship marks it.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

const helpers = () => {
  window.setup = () => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester' }); while (G.dialog) finishEvent();
    const st = G.state; st.story.next = 1e9; st.day += 30; st.tutorial = null; G.mode = 'landed';
    for (const id of st.crew) person(id).cast = undefined;
    return st;
  };
  window.generated = () => G.state.crew.map(person).find(c => c && !c.cast && c.role !== 'medic');
};

test('the odds of death rise with a severe hit and an unhealed injury, and fall with a medic aboard', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const st = setup(), c = generated(), out = {};
    for (const id of st.crew) if (person(id).role === 'medic') st.crew = st.crew.filter(x => x !== id);
    out.mild = lossOdds(c, false); out.severe = lossOdds(c, true);
    st.injured = { [c.id]: true }; out.hurt = lossOdds(c, true); st.injured = {};
    const medic = makePerson('earth'); medic.role = 'medic'; medic.skill = 1; registerPerson(medic); st.crew.push(medic.id);
    out.medic = lossOdds(c, true);
    return out;
  });
  assert.ok(r.severe > r.mild); assert.ok(r.hurt > r.severe); assert.ok(r.medic < r.severe); assert.ok(r.hurt <= 0.6);
  await done();
});

test('a death is recorded, leaves the berth open, grieves the close, and shows in the recap', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const st = setup(), c = generated(), friend = st.crew.map(person).find(p => p && p.id !== c.id), out = {};
    addBond(c, friend, 5); addBond(c, friend, 5); addBond(c, friend, 5);
    const n0 = st.crew.length;
    out.result = loseCrew(c, 'Killed in a test near Earth.');
    out.crew = st.crew.length === n0 - 1 && !st.crew.includes(c.id);
    out.memorial = (st.memorial || []).some(m => m.name === `${c.first} ${c.last}`) && /In memory/.test(memorialHtml()) && memorialHtml().includes(c.first);
    out.vacancy = (st.vacancies || []).includes(c.role);
    out.mourn = (st.mourn || []).length;
    out.grief = !!friend.mood && friend.mood.kind === 'low';
    out.recap = /Lost on the way/.test(chapterRecap().text);
    return out;
  });
  assert.equal(r.result, 'dead'); assert.ok(r.crew); assert.ok(r.memorial); assert.ok(r.vacancy); assert.equal(r.mourn, 1); assert.ok(r.grief); assert.ok(r.recap);
  await done();
});

test('after a loss the next landing opens a scene, every choice works, and the crew take it by who they are', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const st = setup(), out = { bad: [], per: {} };
    const c = generated(); loseCrew(c, 'Killed in a test near Earth.');
    const kind = st.crew.map(person)[0], rude = st.crew.map(person)[1];
    kind.traits = ['kind', 'pious']; rude.traits = ['rude', 'greedy'];
    G.dialog = null; G.nextEvent = null; Mods.emit('landed', currentPlanet());
    out.scene = G.dialog && G.dialog.event.title; out.queue = (st.mourn || []).length;
    const labels = G.dialog.choices.map(x => x.label);
    for (let i = 0; i < labels.length; i++) {
      kind.opinion = 0; rude.opinion = 0; st.credits = 2000; const ev1 = G.dialog.event;
      const text = chooseEvent(i);
      if (!text || /undefined|NaN|\{[a-z]/.test(text)) out.bad.push(labels[i]);
      out.per[i] = { kind: kind.opinion, rude: rude.opinion };
      G.dialog = { event: ev1, choices: ev1.choices }; G.nextEvent = null;
    }
    return out;
  });
  assert.equal(r.scene, 'After the Loss'); assert.equal(r.queue, 0); assert.deepEqual(r.bad, []);
  assert.ok(r.per[0].kind > r.per[0].rude, 'the kind and pious value a service more than the rude and greedy');
  assert.ok(r.per[3].rude >= r.per[3].kind, 'and the rude do not mind being left alone with the work');
  await done();
});
