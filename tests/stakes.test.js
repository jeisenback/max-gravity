'use strict';

// What a hired hand can lose: the captain's patience (a warning, then being put ashore) and a feud that splits the crew.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

const helpers = () => {
  window.start = (post = 'gunner') => { startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post, captainKey: 'hester' }); while (G.dialog) finishEvent(); const st = G.state; st.story.next = 1e9; return st; };
  window.offered = make => Mods.filter('happenings', [], 'port', currentPlanet()).some(c => c.make === make);
};

test('a captain who has had enough warns you once, then puts you ashore, and you start again with your savings', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const st = start(), h = hired(), cap = person(h.captainKey ? h.captain : h.captain), out = {};
    st.credits = 777; h.skill.gunner = 35;
    cap.opinion = -1; out.calm = offered(warningScene) || offered(putAshoreScene);
    cap.opinion = -2; out.warns = offered(warningScene); out.notYet = offered(putAshoreScene);
    openEvent(warningScene()); chooseEvent(0); finishEvent();  // "I will do better"
    out.warned = h.warned; out.afterWarning = [offered(warningScene), offered(putAshoreScene)];
    cap.opinion = -3; out.ashore = offered(putAshoreScene);
    const was = h.captainKey;
    openEvent(putAshoreScene()); chooseEvent(0);
    const st2 = G.state, h2 = hired();
    out.fresh = st2 !== st; out.other = h2.captainKey !== was; out.credits = st2.credits; out.skill = h2.skill.gunner; out.times = st2.putOff;
    out.scene = G.dialog && G.dialog.event.title; out.warnedAgain = !!h2.warned; out.notes = UI.notes.join(' ');
    return out;
  });
  assert.equal(r.calm, false, 'nothing at -1');
  assert.ok(r.warns && !r.notYet, 'a warning at -2, and not the end yet');
  assert.equal(r.warned, true);
  assert.deepEqual(r.afterWarning, [false, false], 'a captain who has warned does not warn again, and the end waits for -3');
  assert.ok(r.ashore, 'put ashore at -3 once warned');
  assert.ok(r.fresh && r.other, 'a new game with another captain');
  assert.equal(r.credits, 777, 'with your savings'); assert.equal(r.skill, 35, 'and what you learned'); assert.equal(r.times, 1);
  assert.equal(r.scene, 'Signing On', 'and the sign-on is on screen');
  assert.equal(r.warnedAgain, false); assert.match(r.notes, /put you ashore/);
  await done();
});

test('a captain who has come round forgets the warning', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const st = start(), h = hired(), cap = person(h.captain);
    cap.opinion = -2; openEvent(warningScene()); chooseEvent(2); finishEvent();  // "unfair": -2 more
    const out = { warned: h.warned, stillAshore: (cap.opinion = -4, offered(putAshoreScene)) };
    cap.opinion = 1; offered(warningScene);  // the filter forgets it
    out.forgot = h.warned;
    return out;
  });
  assert.equal(r.warned, true); assert.ok(r.stillAshore); assert.equal(r.forgot, false);
  await done();
});

test('a feud that has been seen and not mended splits the ship, and someone from the dock takes the berth', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const st = start(), out = {};
    const crew = folk().filter(f => f.crew && !f.p.cast), [a, b] = crew;
    out.noFeud = splitScene();
    addBond(a, b, -9); st.feuds = { [bondKey(a, b)]: 1 };
    const n = st.crew.length, ra = a.p.role;
    const e = splitScene();
    out.labels = e.choices.map(c => c.label);
    out.again = splitScene();  // not twice in thirty days
    const [oa, ob] = [a.p.opinion, b.p.opinion];
    const text = chooseEvent ? (G.dialog = { event: e, choices: e.choices }, chooseEvent(0)) : '';
    out.gone = !st.crew.includes(a.id); out.size = st.crew.length === n; out.sameRole = st.crew.map(person).filter(c => c.role === ra).length >= 1;
    out.opinions = [a.p.opinion - oa, b.p.opinion - ob]; out.text = /signed on for the berth/.test(text);
    return out;
  });
  assert.equal(r.noFeud, null, 'no scene before a feud has been seen');
  assert.deepEqual(r.labels.slice(-1), ['Keep both']); assert.equal(r.labels.length, 3);
  assert.equal(r.again, null);
  assert.ok(r.gone && r.size && r.sameRole, 'one leaves and the crew is the same size');
  assert.deepEqual(r.opinions, [-3, 2], 'the one let go thinks less of you, the one kept thinks more');
  assert.ok(r.text);
  await done();
});
