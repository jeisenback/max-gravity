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
    const sc = sitBeat(p, true); out.low = /their sister is ill/.test(sc.text); out.lowLabels = sc.choices.map(c => c.label);
    const until = p.mood.until, op = p.opinion; take(sc, /Let them talk/); out.lowLiked = p.opinion - op; out.lifted = until - p.mood.until;
    p.mood = null; p.memories = []; (st.injured = st.injured || {})[p.id] = true;
    const hurt = sitBeat(p, true); out.hurt = hurt.choices[0].label === 'Ask how it is';
    const op2 = p.opinion; take(hurt, /Ask how it is/); out.hurtLiked = p.opinion - op2;
    return out;
  });
  assert.ok(r.low); assert.deepEqual(r.lowLabels, ['Let them talk', 'Offer to take a watch off them', '"It\'ll pass."']); assert.equal(r.lowLiked, 1); assert.equal(r.lifted, 3);
  assert.ok(r.hurt); assert.equal(r.hurtLiked, 1);
  await done();
});

test('a war, a grudge, a close friend, or something you did last time each give their own talk', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const { st, p } = setup(), out = {}, f = x => ({ id: x.id, p: x }), other = person(st.crew.find(id => id !== p.id));
    // a grudge, then a close friend
    addBond(f(p), f(other), -3); out.grudge = talkTopics(p).some(t => t.choices[0].label === 'Ask what happened');
    st.bonds = {}; addBond(f(p), f(other), 7); out.close = talkTopics(p).some(t => t.choices[1].label === 'Say you can tell');
    st.bonds = {};
    // a war between the two states, for someone of one of them
    let q = null; for (let i = 0; i < 400 && !(q && tiesOf(q).aff === 'Arcology Compact'); i++) { q = makePerson('earth'); q.memories = []; }
    registerPerson(q); st.crew.push(q.id);
    out.noWar = talkTopics(q).some(t => t.choices[2] && t.choices[2].label === 'Change the subject');
    factionState().war = { a: 'Arcology Compact', b: 'Dome Concord', start: st.day, until: st.day + 40, score: { 'Arcology Compact': 0, 'Dome Concord': 0 } };
    out.war = talkTopics(q).some(t => t.choices[2] && t.choices[2].label === 'Change the subject');
    // what you did last time
    p.memories.push('Day 3: You bought me a drink.');
    const topics = talkTopics(p), mem = topics.find(t => t.choices[0].label === 'Bring it up'); out.mem = !!mem && /You bought me a drink/.test(mem.open);
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
    const first = sitBeat(p, true); out.first = /their brother lost the flat/.test(first.text); out.beat1 = s.beat;
    const second = sitBeat(p, true); out.second = second.choices[1].label === 'Tell them about where you came from';  // the arc, not the same talk again
    out.keyed = p.pressed;
    p.mood = { kind: 'low', until: st.day + 30, text: 'their mother is ill' };  // a new letter, a new talk
    out.again = /their mother is ill/.test(sitBeat(p, true).text);
    p.mood = null; p.pressed = 'x'; sitBeat(p, true); out.cleared = p.pressed === null;
    // an injury, likewise
    p.memories = []; s.beat = 1; (st.injured = st.injured || {})[p.id] = true;
    out.hurtFirst = sitBeat(p, true).choices[0].label === 'Ask how it is';
    out.hurtThen = sitBeat(p, true).choices[0].label === '"Tell me about them."';  // beat 1, the photograph
    return out;
  });
  assert.ok(r.first); assert.equal(r.beat1, 0, 'the story did not move'); assert.ok(r.second); assert.equal(r.keyed, 'mood:their brother lost the flat');
  assert.ok(r.again); assert.ok(r.cleared); assert.ok(r.hurtFirst); assert.ok(r.hurtThen);
  await done();
});

test('after the first exchange the talk goes on to a second subject, never the same one twice running, and the favor ends a sitting on its own', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const { st, p } = setup(), out = {}, subjects = new Set();
    p.traits = ['kind'];
    for (let i = 0; i < 12; i++) {
      G.nextEvent = null; const prev = p.turn; take(sitBeat(p, true), /Stay a while/);
      const on = G.nextEvent; if (!on || !on.title.startsWith('With ') || on.choices.length !== 2 || on.text.length < 80) { out.bad = on && [on.title, on.text]; break; }
      if (p.turn === prev) out.repeated = true;
      subjects.add(p.turn);
      const op = p.opinion; G.nextEvent = null; const res = take(on, new RegExp(`^${on.choices[1].label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`)); out.plain = out.plain || res.length > 80; out.unmoved = p.opinion === op && !G.nextEvent;  // the second choice is talk, not regard, and ends the sitting
    }
    out.subjects = [...subjects].sort();
    // the favor at the end of a story ends the sitting on its own
    const s = storyOf(p); s.beat = 3; s.favor = 'debt'; s.debt = 100; p.opinion = 5; st.credits = 10000;
    G.nextEvent = null; take(sitBeat(p, true), /./); out.favorEnds = G.nextEvent === null;
    return out;
  });
  assert.equal(r.bad, undefined, `each sitting leads on to a second beat (${JSON.stringify(r.bad)})`);
  assert.equal(r.repeated, undefined, 'not the same subject twice running');
  assert.deepEqual(r.subjects, ['captain', 'last', 'port', 'ship', 'work'], 'the next port, the captain, the ship, their post and their last ship');
  assert.ok(r.plain && r.unmoved); assert.ok(r.favorEnds);
  await done();
});

test('from the downtime menu, Sit with someone opens the picker at once, and picking a person opens the sitting at once', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const { p } = setup(), out = {};
    uatBurn('Ceres Station', 'pallas'); G.transit.times = []; G.transit.event = null; G.dialog = null;
    openEvent(downtimeEvent(true));
    const i = G.dialog.choices.findIndex(c => c.label === 'Sit with someone');
    UI.act('choose', i);
    out.picker = G.dialog && G.dialog.event.title; out.pickerButtons = [...UI.el.querySelectorAll('.choices button')].map(b => b.textContent);
    const j = G.dialog.choices.findIndex(c => c.label.startsWith(p.first));
    UI.act('choose', j);
    out.sitting = G.dialog && G.dialog.event.title === `With ${p.first}`; out.sittingButtons = [...UI.el.querySelectorAll('.choices button')].map(b => b.textContent);
    out.used = !!(G.transit.lifeUsed || {}).before;
    return out;
  });
  assert.equal(r.picker, 'Sit With Someone'); assert.ok(!r.pickerButtons.includes('Continue'), `the picker, not a screen before it (${r.pickerButtons})`);
  assert.ok(r.sitting, 'the sitting is with them'); assert.ok(!r.sittingButtons.includes('Continue'), `the sitting, not a screen before it (${r.sittingButtons})`);
  assert.ok(r.used);
  await done();
});

test('the first choice of the second beat costs a watch or the captain\'s regard, and is remembered; the second costs nothing', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const { st, p } = setup(), out = {}, cap = hiredCaptain(), take0 = e => take(e, new RegExp(`^${e.choices[0].label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`));
    uatBurn('Ceres Station', 'pallas'); G.transit.times = []; G.transit.event = null; G.dialog = null;
    // before the flip: the downtime after it is spent, two points and a memory
    let e = goesOn(p, 'ship'); out.label = e.choices[0].label; const op = p.opinion; take0(e);
    out.after = !!G.transit.lifeUsed.after; out.before = !!G.transit.lifeUsed.before; out.liked = p.opinion - op; out.mem = p.memories.slice(-1)[0];
    out.comesBack = talkTopics(p).some(t => t.choices[0].label === 'Bring it up' && /galley light/.test(t.open));
    // after the flip: the watch is owed, and stood when the next burn begins
    G.transit.flipped = true; G.transit.lifeUsed = {}; e = goesOn(p, 'work'); out.owedLabel = e.choices[0].label; take0(e);
    out.owed = st.watchOwed && st.watchOwed.n === p.first; out.notSpentNow = !G.transit.lifeUsed.after;
    const t2 = { lifeUsed: {} }; out.stood = standOwedWatch(st, t2); out.stoodUsed = !!t2.lifeUsed.before; out.cleared = st.watchOwed === null; out.again = standOwedWatch(st, t2);
    // the captain: a point of the captain's regard
    const capOp = cap.opinion; e = goesOn(p, 'captain'); take0(e); out.capLiked = cap.opinion - capOp; out.capLabel = e.choices[0].label;
    // the second choice: talk, and nothing kept
    const op2 = p.opinion, n = p.memories.length; e = goesOn(p, 'port'); take(e, /Ask about the dock/); out.free = p.opinion === op2 && p.memories.length === n && !st.watchOwed;
    return out;
  });
  assert.match(r.label, /galley light.*\(your downtime after the flip\)$/); assert.ok(r.after && !r.before, 'the downtime after the flip is spent'); assert.equal(r.liked, 2); assert.match(r.mem, /You fixed the galley light with me\.$/); assert.ok(r.comesBack, 'a later sitting brings it up');
  assert.match(r.owedLabel, /\(your first downtime next burn\)$/); assert.ok(r.owed && r.notSpentNow); assert.match(r.stood, new RegExp(`^You stand .*'s watch before the flip, as you said\\.$`)); assert.ok(r.stoodUsed && r.cleared); assert.equal(r.again, null);
  assert.equal(r.capLiked, -1); assert.match(r.capLabel, /\(a point with the captain\)$/);
  assert.ok(r.free);
  await done();
});
