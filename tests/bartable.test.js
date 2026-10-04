'use strict';

// The table at the bar: which things you can do with a stranger depends on the person, and what happens is not the same each time.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

const helpers = () => {
  window.setup = () => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester' }); while (G.dialog) finishEvent();
    const st = G.state; st.story.next = 1e9; st.day += 30; st.credits = 2000;
    fillBar(currentPlanet());
    return st;
  };
  window.take = (e, re) => { G.dialog = { event: e, choices: e.choices }; return chooseEvent(e.choices.findIndex(c => re.test(c.label))); };
};

test('a stranger offers two of three extra things to do, the same two every time, and not the same two to everyone', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    setup();
    const pats = G.patrons.filter(x => !x.cast && !x.known), menus = new Set(), same = [];
    for (let i = 0; i < 80; i++) { const p = makePerson('earth'); const e = talkEvent({ p, known: false }); const m = e.choices.filter(c => /about their work|say nothing|about this place/.test(c.label)).map(c => c.label.replace(p.first, 'N')).join('|'); menus.add(m); same.push(e.choices.filter(c => /about their work|say nothing|about this place/.test(c.label)).length); }
    const p = makePerson('earth'), a = talkEvent({ p, known: false }).choices.map(c => c.label).join('|'), b = talkEvent({ p, known: false }).choices.map(c => c.label).join('|');
    return { menus: menus.size, counts: [...new Set(same)], stable: a === b };
  });
  assert.deepEqual(r.counts, [2]); assert.ok(r.menus >= 3, `${r.menus} different menus`); assert.ok(r.stable, 'the same person offers the same things');
  await done();
});

test('the extra things each say something, once, and a quiet word helps the shy', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    setup();
    const out = {};
    let p, e, pat;  // someone who is offered a quiet word: it depends on the person, so draw until it is so
    for (let i = 0; i < 200 && !(e && e.choices.some(c => /say nothing/.test(c.label))); i++) { p = makePerson('earth'); p.traits = ['nervous', 'kind']; p.job = 'dockworker'; registerPerson(p); pat = { p, known: false }; e = talkEvent(pat); }
    const work = barSays(BAR_WORK[workGroup(p.job)][0], p), before = p.opinion;
    out.group = workGroup('dockworker') + '/' + workGroup('engineer') + '/' + workGroup('navy veteran') + '/' + workGroup('accountant');
    out.work = !work.includes('{') && work.includes('hands');
    G.dialog = { event: e, choices: e.choices }; chooseEvent(e.choices.findIndex(c => /say nothing/.test(c.label)));
    out.liked = p.opinion - before; out.again = e.choices.find(c => /say nothing/.test(c.label)).can();
    return out;
  });
  assert.equal(r.group, 'hands/tech/service/other'); assert.ok(r.work);
  assert.equal(r.liked, 1); assert.equal(r.again, false);
  await done();
});

test('cards, a drink and a goodbye do not always end the same way', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const st = setup(), cards = new Set(), drinks = new Set(), leaves = new Set(), out = {};
    for (let i = 0; i < 120; i++) {
      st.credits = 2000;
      const p = makePerson('earth'), pat = { p, known: false }, e = talkEvent(pat), norm = t => t.replace(new RegExp(p.first, 'g'), 'N').replace(new RegExp(p.home, 'g'), 'H');
      cards.add(norm(take(e, /cards/)).split('.')[0]);
      leaves.add(norm(take(e, /Leave/)));
    }
    out.cards = cards.size; out.leaves = leaves.size;
    out.clean = ![...cards, ...leaves].some(t => /\{|undefined|NaN/.test(t));
    return out;
  });
  assert.ok(r.cards >= 6, `${r.cards} openings at cards`); assert.ok(r.leaves >= 3, `${r.leaves} goodbyes`); assert.ok(r.clean);
  await done();
});

test('what someone says at the table is theirs: their traits, their goal, and how they feel about you', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const st = setup(), real = Math.random, out = {};
    const person2 = (traits, goal) => { const p = makePerson('earth'); p.traits = traits; p.goal = goal; p.secret = null; return p; };
    const greedy = person2(['greedy', 'kind'], 'medical'), pious = person2(['pious', 'kind'], 'pilgrim'), friend = person2(['kind', 'brave'], 'home');
    friend.opinion = OPINION.FRIEND;
    try {
      Math.random = () => 0.01;  // the person's own line, a win at cards, the first of anything picked
      st.credits = 2000;
      out.greedy = take(talkEvent({ p: greedy, known: false }), /cards/);
      out.pious = take(talkEvent({ p: pious, known: false }), /Leave/);
      out.medical = take(talkEvent({ p: greedy, known: false }), /heard/);
      out.pilgrim = take(talkEvent({ p: pious, known: false }), /heard/);
      out.friend = take(talkEvent({ p: friend, known: true }), /Leave/);
      out.stranger = take(talkEvent({ p: friend, known: false }), /Leave/);
      Math.random = () => 0.99;  // the shared pool instead
      out.shared = take(talkEvent({ p: greedy, known: false }), /Leave/);
    } finally { Math.random = real; }
    return out;
  });
  assert.match(r.greedy, /counts the pot twice/); assert.match(r.pious, /Fair winds/);
  assert.match(r.medical, /medic/); assert.match(r.pilgrim, /holy/);
  assert.match(r.friend, /Same again, next port/); assert.doesNotMatch(r.stranger, /Same again/);
  assert.doesNotMatch(r.shared, /bigger purse/, 'a shared goodbye some of the time');
  await done();
});
