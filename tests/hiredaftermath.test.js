'use strict';

// What comes of a hired hand's own events: second beats, and follow-ups that arrive days later and name the
// captain or the shipmate they were about.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

const hiredHelpers = () => {
  window.startHired = (post = 'gunner', bg = 'earth') => { startGame({ slot: 1, background: bg, captain: 'Ines Okafor', mode: 'hired', post }); while (G.dialog) finishEvent(); G.state.tutorial = null; G.state.story.next = 1e9; uatBurn('Ceres Station', 'pallas'); G.transit.times = []; };
  // Plays one choice of a hired event and returns what changed.
  window.playChoice = (id, label, ctx) => {
    const c = ctx || handContext(), d = HAND_EVENTS.find(x => x.id === id), e = d.make(c), st = G.state, h = st.hired;
    const i = e.choices.findIndex(x => x.label.startsWith(label));
    const before = { cash: st.credits, fund: h.fund, cap: c.cap.opinion, mate: c.mate ? c.mate.opinion : 0, xp: skillXp(h.post), journal: (st.journal || []).length };
    G.nextEvent = null; G.dialog = { event: e, choices: e.choices };
    const text = String(chooseEvent(i));
    return { text, cash: st.credits - before.cash, fund: h.fund - before.fund, cap: c.cap.opinion - before.cap, mate: c.mate ? c.mate.opinion - before.mate : 0, xp: skillXp(h.post) - before.xp, journal: (st.journal || []).length - before.journal, next: G.nextEvent };
  };
  // Lets the days pass and plays the follow-up that is due, taking choice i.
  window.playDue = (name, days, i = 0) => {
    const st = G.state, h = st.hired; st.day += days;
    const s = pickStorylet('transit', x => x.consumes), cap = person(h.captain);
    const picked = s && s.id;
    if (!s || s.id !== name) return { picked };
    const e = storyletEvent(s), before = { cash: st.credits, fund: h.fund, cap: cap.opinion, xp: skillXp(h.post) };
    G.dialog = { event: e, choices: e.choices };
    const text = String(chooseEvent(i));
    return { picked, text, title: e.title, body: e.text, cash: st.credits - before.cash, fund: h.fund - before.fund, cap: cap.opinion - before.cap, xp: skillXp(h.post) - before.xp };
  };
};

test('every hired follow-up plays every choice, with the captain and the shipmate named', async () => {
  const { ev, done } = await open();
  await ev(hiredHelpers);
  const r = await ev(() => {
    startHired('gunner');
    const st = G.state, mate = procedural()[0].p, bad = [], seen = [];
    for (const key of ['cover', 'needle', 'cards', 'loan']) remember(key, mate);
    for (const s of STORYLETS.filter(x => x.consumes && x.id.startsWith('h-'))) {
      const n = storyletEvent(s).choices.length;
      for (let i = 0; i < n; i++) {
        st.credits = 5000; G.player.armor = G.player.maxArmor;
        const e = storyletEvent(s), c = e.choices[i];
        if (c.can && !c.can()) continue;
        const text = String(c.run());
        if (/undefined|NaN|\[object|\{[a-z:]+\}/.test(e.title + e.text + c.label + text)) bad.push(`${s.id}#${i}: ${(e.text + text).slice(0, 80)}`);
        if (!s.when.hired) bad.push(`${s.id}: not hired-only`);
        seen.push(s.id);
        G.nextEvent = null;
      }
    }
    const cap = person(st.hired.captain), named = storyletEvent(STORYLETS.find(x => x.id === 'h-hot-good')).text.includes(`Captain ${cap.last}`);
    const mateNamed = storyletEvent(STORYLETS.find(x => x.id === 'h-cover-back')).text.includes(mate.first);
    return { bad, n: seen.length, ids: new Set(seen).size, named, mateNamed };
  });
  assert.deepEqual(r.bad, []);
  assert.equal(r.ids, 22, `all 22 follow-ups (${r.ids})`); assert.equal(r.n, 34, `every branch (${r.n})`);
  assert.ok(r.named && r.mateNamed, 'the captain and the shipmate are named');
  await done();
});

test('a choice sets a follow-up going, it arrives on its day, and the money is the hand\'s own', async () => {
  const { ev, done } = await open();
  await ev(hiredHelpers);
  const r = await ev(() => {
    startHired('engineer'); const st = G.state; st.credits = 500; st.hired.fund = 9000;
    const ctx = handContext(), out = {};
    // Stand a watch for the captain: back in nine days with a free day ashore.
    out.set = playChoice('cap-favour', 'Stand the watch', ctx);
    out.due = quality('due:h-favour-back') - st.day;
    out.early = playDue('h-favour-back', 8).picked;
    out.back = playDue('h-favour-back', 1);
    // A loan: the shipmate is remembered, and it comes back with interest or does not.
    Math.random = () => 0.1;
    st.credits = 500; const loan = playChoice('money-loan', 'Lend a hundred', { ...ctx, mate: procedural()[0].p });
    out.loan = { cash: loan.cash, due: quality('due:h-loan-repaid') - st.day, who: threadPerson('loan').first === procedural()[0].p.first };
    out.repaid = playDue('h-loan-repaid', 12);
    Math.random = () => 0.9;
    const loan2 = playChoice('money-loan', 'Lend a hundred', { ...ctx, mate: procedural()[0].p });
    out.default = quality('due:h-loan-default') - st.day;
    return out;
  });
  assert.equal(r.set.journal, 1, 'the Journal keeps the thread'); assert.equal(r.due, 9);
  assert.notEqual(r.early, 'h-favour-back'); assert.equal(r.back.picked, 'h-favour-back');
  assert.deepEqual([r.back.cash, r.back.fund, r.back.cap], [80, 0, 1], 'a free day, in savings and not the ship\'s purse');
  assert.deepEqual([r.loan.cash, r.loan.due, r.loan.who], [-100, 12, true]);
  assert.deepEqual([r.repaid.cash, r.repaid.fund], [110, 0]);
  assert.equal(r.default, 12);
  await done();
});

test('three events lead straight into a second beat', async () => {
  const { ev, done } = await open();
  await ev(hiredHelpers);
  const r = await ev(() => {
    startHired('pilot'); const st = G.state, ctx = handContext(), out = {};
    const beat = (id, label) => { const x = playChoice(id, label, ctx); const e = x.next; return e && { title: e.title, labels: e.choices.map(c => c.label), run: i => { G.dialog = { event: e, choices: e.choices }; G.nextEvent = null; return String(chooseEvent(i)); } }; };
    const t = beat('cap-dressing', 'Blame the old terminal'); out.terminal = [t.title, t.labels];
    Math.random = () => 0.9; const caught0 = ctx.cap.opinion; t.run(0); out.caught = ctx.cap.opinion - caught0;
    Math.random = () => 0.1; const c1 = ctx.cap.opinion; const t2 = beat('cap-dressing', 'Blame the old terminal'); t2.run(0); out.proved = ctx.cap.opinion - c1;
    st.credits = 300; const k = beat('money-side', 'Take the work'); out.crates = [k.title, k.labels];
    const c2 = st.credits; k.run(1); out.double = st.credits - c2; out.trouble = quality('due:h-side-trouble') - st.day;
    const l = beat('road-scope', 'Tell the captain at once'); out.lane = [l.title, l.labels];
    l.run(0); out.laneSet = quality('due:h-lane-again') - st.day;
    return out;
  });
  assert.deepEqual(r.terminal, ['The Terminal', ['Show how it drops entries', 'Admit it was you']]);
  assert.equal(r.caught, -2, 'a terminal that is fine is the captain\'s answer'); assert.equal(r.proved, 1, 'one that really drops entries clears you');
  assert.equal(r.crates[0], 'The Crates'); assert.ok(r.double >= 160 && r.double <= 320 && r.double % 20 === 0, `double pay (${r.double})`); assert.equal(r.trouble, 9);
  assert.equal(r.lane[0], 'What Did You See?'); assert.equal(r.laneSet, 9);
  await done();
});

test('follow-ups stop when a hand buys a ship, and an owner never gets one', async () => {
  const { ev, done } = await open();
  await ev(hiredHelpers);
  const r = await ev(() => {
    startHired('gunner'); const st = G.state;
    applyEffects({ later: { 'h-hot-good': 1 } }); st.day += 1;
    const asHand = meets({ due: 'h-hot-good', hired: true });
    st.hired = null;  // bought a ship of their own
    const asOwner = meets({ due: 'h-hot-good', hired: true }), picked = pickStorylet('transit', x => x.id === 'h-hot-good');
    return { asHand, asOwner, picked: !!picked };
  });
  assert.equal(r.asHand, true); assert.equal(r.asOwner, false); assert.equal(r.picked, false);
  await done();
});
