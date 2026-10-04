'use strict';

// The extra shapes of the most frequent relationship scenes (social.js): a feud over the watch log or in silence, a match argued
// after the fact, and a dish from home.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

const helpers = () => {
  window.setup = () => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester' }); while (G.dialog) finishEvent();
    const st = G.state; st.story.next = 1e9; st.day += 30; st.bonds = {};
    const [a, b] = pairs(folk().filter(f => f.crew))[0];
    return { st, a, b, A: a.p.first, B: b.p.first };
  };
  window.take = (sc, re) => { G.dialog = { event: sc, choices: sc.choices }; return chooseEvent(sc.choices.findIndex(c => re.test(c.label))); };
};

test('a feud over the watch log: ruling favors one side, splitting the watches cools it, doing it together is a gamble', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const { st, a, b, A, B } = setup(), out = {};
    let sc = feudHandover(a, b, A, B); out.title = sc.title; out.labels = sc.choices.length;
    const ra = a.p.opinion, rb = b.p.opinion; take(sc, /Read the log/); out.ruled = (a.p.opinion - ra) + (b.p.opinion - rb); out.ruledBond = bond(a, b);
    st.bonds = {}; take(feudHandover(a, b, A, B), /Split their watches/); out.split = bond(a, b);
    st.bonds = {}; Math.random = () => 0.01; take(feudHandover(a, b, A, B), /together/); out.good = bond(a, b);
    st.bonds = {}; Math.random = () => 0.99; take(feudHandover(a, b, A, B), /together/); out.bad = bond(a, b);
    return out;
  });
  assert.equal(r.title, 'The Handover'); assert.equal(r.labels, 3); assert.equal(r.ruled, 0, 'one side is liked, the other is not'); assert.equal(r.ruledBond, -0.5);
  assert.equal(r.split, -0.5); assert.equal(r.good, 2); assert.equal(r.bad, -1);
  await done();
});

test('cold shoulders: the same job is a gamble, talking to each helps a little, letting it run costs', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const { st, a, b, A, B } = setup(), out = {};
    out.title = feudShoulders(a, b, A, B).title;
    Math.random = () => 0.01; take(feudShoulders(a, b, A, B), /same job/); out.good = bond(a, b);
    st.bonds = {}; Math.random = () => 0.99; take(feudShoulders(a, b, A, B), /same job/); out.bad = bond(a, b);
    st.bonds = {}; take(feudShoulders(a, b, A, B), /each of them alone/); out.talk = bond(a, b);
    st.bonds = {}; take(feudShoulders(a, b, A, B), /Let it run/); out.run = bond(a, b);
    return out;
  });
  assert.equal(r.title, 'Cold Shoulders'); assert.equal(r.good, 2); assert.equal(r.bad, -1); assert.equal(r.talk, 0.5); assert.equal(r.run, -1);
  await done();
});

test('the replay of an old match and the recipe from home each work, and the recipe costs 150 cr', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const { st, a, b, A, B } = setup(), out = {};
    const sc = matchReplay(a, b, 'Luna Rovers', 'Ceres Miners'); out.title = sc.title;
    out.old = /\d/.test(take(matchReplay(a, b, tastes(a).team, tastes(b).team), /Play the old fixture/));
    out.mute = take(matchReplay(a, b, tastes(a).team, tastes(b).team), /Mute/).length > 0;
    st.bonds = {}; st.credits = 500;
    const rc = rootsRecipe(a, b, A, B); out.rtitle = rc.title;
    take(rc, /Pay for the missing/); out.credits = st.credits; out.bond = bond(a, b);
    st.credits = 100; out.cannot = rootsRecipe(a, b, A, B).choices[0].can();
    return out;
  });
  assert.equal(r.title, 'The Replay'); assert.ok(r.old && r.mute); assert.equal(r.rtitle, 'The Recipe'); assert.equal(r.credits, 350); assert.equal(r.bond, 3); assert.equal(r.cannot, false);
  await done();
});
