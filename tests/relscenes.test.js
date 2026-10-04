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

test('a hand can be asked for a word about a shipmate, and is not called Captain', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const { st, a, b } = setup(), out = { titles: new Set(), labels: new Set(), texts: [] };
    for (const [x, y] of pairs(folk().filter(f => f.crew))) addBond(x, y, 4);
    for (let i = 0; i < 200; i++) { st.qualities = {}; delete st.relAt; const e = relationshipScene(); if (e && e.title === 'A Word') { out.titles.add(e.title); e.choices.forEach(c => out.labels.add(c.label.replace(/[A-Z][a-z]+/g, 'N'))); out.texts.push(e.text); } }
    return { titles: [...out.titles], labels: [...out.labels], captain: out.texts.some(t => /Captain\./.test(t)), n: out.texts.length };
  });
  assert.deepEqual(r.titles, ['A Word']); assert.ok(r.n > 0); assert.ok(!r.captain, 'no "Captain." in a hand\'s talk');
  assert.ok(r.labels.some(l => /between the two of you/.test(l)) && !r.labels.some(l => /Keep your head down/.test(l)));
  await done();
});

test('a friend asks you to cover their watch: you learn their post for a night, and they owe you, and pay it in a fight', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const { st } = setup(), h = hired(), out = {};
    for (const id of st.crew) person(id).opinion = 0;  // only the new one is a friend
    const p = makePerson('earth'); p.role = 'engineer'; p.skill = 1; registerPerson(p); st.crew.push(p.id); p.opinion = OPINION.CLOSE;
    out.post = postOfRole('engineer');
    delete st.relAt; let e = null;
    for (let i = 0; i < 400 && !(e && e.title === 'Cover My Watch'); i++) { st.qualities = {}; e = relationshipScene(); }
    out.offered = !!e && e.title === 'Cover My Watch';
    const op = p.opinion, xp = skillXp(out.post);
    const t = take(e, /Take /);
    out.liked = p.opinion - op; out.xp = skillXp(out.post) - xp; out.owes = p.owes === st.day; out.text = /learn more about the engineer post/.test(t);
    out.again = (() => { for (let i = 0; i < 200; i++) { st.qualities = {}; const x = relationshipScene(); if (x && x.title === 'Cover My Watch') return true; } return false; })();  // not for twenty-five days
    // and they pay it: a hit meant for you is theirs, though they are not a friend
    p.opinion = 0; const d = { foe: makeEnemy({ kind: 'hunter', person: { first: 'Ana', last: 'Voss' } }), foeHp: 4, init: 'foe' }, s = repelStart(d, 'full'), real = Math.random;
    Math.random = () => 0.999;
    try { out.cover = repelCasualty(s); } finally { Math.random = real; }
    out.cleared = p.owes === undefined; out.name = p.first;
    return out;
  });
  assert.ok(r.offered); assert.equal(r.liked, 2); assert.equal(r.xp, 3); assert.ok(r.owes); assert.ok(r.text); assert.equal(r.again, false);
  assert.match(r.cover, new RegExp(`${r.name} pulls you down behind the closer and takes it \\("We are even,"`)); assert.ok(r.cleared, 'the debt is paid once');
  await done();
});
