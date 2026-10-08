'use strict';

// Sitting with someone once there is no arc left to move on (family.js): the talk is about what is on their mind now.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

const helpers = () => {
  window.setup = () => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester' }); while (G.dialog) finishEvent();
    const st = G.state; st.story.next = 1e9; st.day += 30; st.bonds = {};
    const p = makePerson('earth'); p.role = 'cook'; p.skill = 1; p.memories = []; p.opinion = 0; p.mood = null; registerPerson(p); st.crew.push(p.id);
    storyOf(p).beat = 4;  // the arc is done
    return { st, p };
  };
  window.take = (sc, re) => { G.dialog = { event: sc, choices: sc.choices }; return chooseEvent(sc.choices.findIndex(c => re.test(c.label))); };
};

test('with nothing on their mind, the talk is about who they are, and never the same paragraph for everyone', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const { st, p } = setup(), texts = new Set();
    for (const t of ['pious', 'greedy', 'curious']) { p.traits = [t]; texts.add(sitBeat(p, true).text); }
    p.traits = ['pious'];
    const sc = sitBeat(p, true);
    const before = p.opinion, res = take(sc, /Stay a while/);
    return { distinct: texts.size, pious: /cord at their wrist/.test(sc.text), title: sc.title, labels: sc.choices.map(c => c.label), liked: p.opinion - before, res: res.length > 20 };
  });
  assert.equal(r.distinct, 3); assert.ok(r.pious); assert.equal(r.title.startsWith('With '), true); assert.ok(r.labels.includes('Stay a while')); assert.equal(r.liked, 1); assert.ok(r.res);
  await done();
});

test('someone who had a letter that hurt, or is hurt, is talked to about that', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const { st, p } = setup(), out = {};
    p.mood = { kind: 'low', until: st.day + 20, text: 'their sister is ill' };
    const sc = sitBeat(p, true); out.low = /the news: their sister is ill/.test(sc.text); out.lowLabels = sc.choices.map(c => c.label);
    const until = p.mood.until, op = p.opinion; take(sc, /Let them talk/); out.lowLiked = p.opinion - op; out.lifted = until - p.mood.until;
    p.mood = null; p.memories = []; (st.injured = st.injured || {})[p.id] = true;
    const hurt = sitBeat(p, true); out.hurt = /favoring one side/.test(hurt.text);
    const op2 = p.opinion; take(hurt, /Ask how it is/); out.hurtLiked = p.opinion - op2;
    return out;
  });
  assert.ok(r.low); assert.deepEqual(r.lowLabels, ['Let them talk', 'Offer to take a watch off them', '"It will pass."']); assert.equal(r.lowLiked, 1); assert.equal(r.lifted, 3);
  assert.ok(r.hurt); assert.equal(r.hurtLiked, 1);
  await done();
});

test('a war, a grudge, a close friend, or something you did last time each give their own talk', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const { st, p } = setup(), out = {}, f = x => ({ id: x.id, p: x }), other = person(st.crew.find(id => id !== p.id));
    // a grudge, then a close friend
    addBond(f(p), f(other), -3); out.grudge = talkTopics(p).some(t => /short with/.test(t.open));
    st.bonds = {}; addBond(f(p), f(other), 7); out.close = talkTopics(p).some(t => /been through a lot/.test(t.open));
    st.bonds = {};
    // a war between the two states, for someone of one of them
    let q = null; for (let i = 0; i < 400 && !(q && tiesOf(q).aff === 'Arcology Compact'); i++) { q = makePerson('earth'); q.memories = []; }
    registerPerson(q); st.crew.push(q.id);
    out.noWar = talkTopics(q).some(t => /war on the galley screen/.test(t.open));
    factionState().war = { a: 'Arcology Compact', b: 'Dome Concord', start: st.day, until: st.day + 40, score: { 'Arcology Compact': 0, 'Dome Concord': 0 } };
    out.war = talkTopics(q).some(t => /war on the galley screen/.test(t.open));
    // what you did last time
    p.memories.push('Day 3: You bought me a drink.');
    const topics = talkTopics(p), mem = topics.find(t => /been thinking about something/.test(t.open)); out.mem = !!mem && /You bought me a drink/.test(mem.open);
    const op = p.opinion; G.dialog = { event: { choices: mem.choices }, choices: mem.choices }; chooseEvent(0); out.memLiked = p.opinion - op;
    return out;
  });
  assert.ok(r.grudge && r.close); assert.equal(r.noWar, false); assert.ok(r.war); assert.ok(r.mem); assert.equal(r.memLiked, 1);
  await done();
});

test('someone in a bad way is talked to about it first, once, and then their story goes on where it was', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const { st, p } = setup(), out = {}, s = storyOf(p);
    s.beat = 0;  // the first stage of the story is due
    p.mood = { kind: 'low', until: st.day + 30, text: 'their brother lost the flat' };
    const first = sitBeat(p, true); out.first = /the news: their brother lost the flat/.test(first.text); out.beat1 = s.beat;
    const second = sitBeat(p, true); out.second = /tells you about/.test(second.text);  // the arc, not the same talk again
    out.keyed = p.pressed;
    p.mood = { kind: 'low', until: st.day + 30, text: 'their mother is ill' };  // a new letter, a new talk
    out.again = /their mother is ill/.test(sitBeat(p, true).text);
    p.mood = null; p.pressed = 'x'; sitBeat(p, true); out.cleared = p.pressed === null;
    // an injury, likewise
    p.memories = []; s.beat = 1; (st.injured = st.injured || {})[p.id] = true;
    out.hurtFirst = /favoring one side/.test(sitBeat(p, true).text);
    out.hurtThen = /small worn picture/.test(sitBeat(p, true).text);  // beat 1, the photograph
    return out;
  });
  assert.ok(r.first); assert.equal(r.beat1, 0, 'the story did not move'); assert.ok(r.second); assert.equal(r.keyed, 'mood:their brother lost the flat');
  assert.ok(r.again); assert.ok(r.cleared); assert.ok(r.hurtFirst); assert.ok(r.hurtThen);
  await done();
});
