'use strict';

// Burn events for a hired hand: the pool of their own, the owner's events hidden, and
// the work events at each post.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

// window.draws: what a burn throws up over many draws, with nothing remembered between them.
const hiredHelpers = () => {
  window.draws = n => {
    const titles = new Set(), work = [];
    for (let i = 0; i < n; i++) {
      G.state.eventSeen = {}; G.transit.seen = []; G.dialog = null; G.transit.event = null;
      const e = pickHappening('transit');
      if (e) { titles.add(e.title); if (e.workId) work.push(e); }
    }
    return { titles: [...titles], work };
  };
  window.startHired = (post = 'gunner') => { startGame({ slot: 1, background: 'earth', captain: 'Ines Okafor', mode: 'hired', post }); while (G.dialog) finishEvent(); G.state.flags.classicCombat = true; G.state.story.next = 1e9; };
};

test('every post has work events of its own, all in one table of weights', async () => {
  const { ev, done } = await open();
  await ev(hiredHelpers);
  const r = await ev(() => ({
    perPost: HIRED_POSTS.map(p => WORK_EVENTS.filter(d => d.post === p).length),
    ids: new Set(WORK_EVENTS.map(d => d.id)).size, total: WORK_EVENTS.length,
    stray: WORK_EVENTS.filter(d => !HIRED_POSTS.includes(d.post)).length,
    weights: Object.keys(HIRED_WEIGHTS), ownerOnly: OWNER_ONLY_EVENTS.every(t => TRANSIT_EVENTS.some(e => e.title === t)),
  }));
  assert.ok(r.perPost.every(n => n >= 3), `at least three at each post (${r.perPost})`);
  assert.equal(r.ids, r.total, 'ids are unique'); assert.equal(r.stray, 0);
  assert.deepEqual(r.weights, ['work', 'captain', 'crew', 'money', 'road', 'ship']);
  assert.ok(r.ownerOnly, 'the hidden events exist');
  await done();
});

test('a hand draws from a pool of its own, and never sees an owner-only event', async () => {
  const { ev, done } = await open();
  await ev(hiredHelpers);
  for (const post of ['pilot', 'gunner', 'engineer', 'comms']) {
    const r = await ev(post => {
      startHired(post); G.state.tutorial = null; uatBurn('Ceres Station', 'pallas'); G.transit.times = [];
      const d = draws(300);
      return { titles: d.titles, workPosts: [...new Set(d.work.map(e => e.owner))], work: d.work.length, owner: OWNER_ONLY_EVENTS };
    }, post);
    assert.ok(r.work > 20, `${post}: the work pool is used (${r.work})`);
    assert.deepEqual(r.workPosts, [post], `${post}: only their own post's problems`);
    assert.deepEqual(r.titles.filter(t => r.owner.includes(t)), [], `${post}: nothing that is an owner's business`);
    assert.ok(r.titles.some(t => ['Distress Call', 'Pirates Matching Course', 'Derelict Ship', 'Coolant Leak'].includes(t)), `${post}: the road still happens`);
  }
  // An owner is unchanged: the owner's events still come, and no work events.
  const o = await ev(() => {
    startGame({ slot: 1, background: 'earth', captain: 'Ines' }); while (G.dialog) finishEvent(); G.state.tutorial = null; G.state.story.next = 1e9;
    uatBurn('Ceres Station', 'pallas'); G.transit.times = [];
    const d = draws(400);
    return { work: d.work.length, hasOwner: d.titles.some(t => OWNER_ONLY_EVENTS.includes(t)) };
  });
  assert.equal(o.work, 0); assert.ok(o.hasOwner, 'an owner still gets the stowaway and the merchant');
  await done();
});

test('work events move your experience at the post, and the careful way teaches more', async () => {
  const { ev, done } = await open();
  await ev(hiredHelpers);
  const r = await ev(() => {
    const out = {};
    for (const post of HIRED_POSTS) {
      startHired(post); G.state.tutorial = null; uatBurn('Ceres Station', 'pallas'); G.transit.times = [];
      out[post] = WORK_EVENTS.filter(d => d.post === post).map(d => {
        const e = workEvent(d), x0 = skillXp(post), careful = e.choices[0].run(), c = skillXp(post) - x0;
        const x1 = skillXp(post), text = e.choices[1].run(), q = skillXp(post) - x1;
        return { c, q, owner: e.owner, text: careful + text };
      });
    }
    return out;
  });
  for (const [post, list] of Object.entries(r)) for (const e of list) {
    assert.equal(e.c, 3, `${post}: careful teaches 3`); assert.ok(e.q === 4 || e.q === 1, `${post}: quick teaches 4 or 1 (${e.q})`);
    assert.equal(e.owner, post); assert.doesNotMatch(e.text, /undefined|NaN|\{|\[object/);
  }
  await done();
});

test('the captain, crew, money and road: every group has events, and the pool draws them', async () => {
  const { ev, done } = await open();
  await ev(hiredHelpers);
  const r = await ev(() => {
    startHired('engineer'); G.state.tutorial = null; uatBurn('Ceres Station', 'pallas'); G.transit.times = [];
    const byGroup = {};
    for (const g of HIRED_GROUPS) {
      const titles = new Set();
      for (let i = 0; i < 200; i++) { G.state.eventSeen = {}; const e = hiredEvent(g); if (e) titles.add(e.title); }
      byGroup[g] = { defined: HAND_EVENTS.filter(d => d.group === g).length, titles: [...titles] };
    }
    return { byGroup, total: HAND_EVENTS.length, drawn: draws(600).titles };
  });
  assert.ok(r.total >= 24, `about two dozen events (${r.total})`);
  for (const [g, n] of Object.entries(r.byGroup)) {
    assert.ok(n.titles.length >= 1, `${g} has events`);
    if (g !== 'work') assert.ok(n.titles.some(t => r.drawn.includes(t)), `${g}: the burn draws them`);
  }
  assert.ok(r.byGroup.captain.defined >= 3 && r.byGroup.crew.defined >= 3 && r.byGroup.money.defined >= 3);
  await done();
});

test('every choice of every hired event lands its effects and no others, and plays clean', async () => {
  const { ev, done } = await open();
  await ev(hiredHelpers);
  const r = await ev(() => {
    const bad = [], rows = [];
    for (const post of HIRED_POSTS) {
      for (const d of HAND_EVENTS.filter(x => !x.post || x.post === post)) {
        const n = (() => { startHired(post); G.state.tutorial = null; uatBurn('Ceres Station', 'pallas'); return handContext(); })();
        const count = d.make(n).choices.length;
        for (let i = 0; i < count; i++) {
          startHired(post); const st = G.state, h = st.hired; st.tutorial = null; uatBurn('Ceres Station', 'pallas'); G.transit.times = []; st.credits = 500;
          const c = handContext();
          if (d.when && !d.when(c)) continue;
          const e = d.make(c), choice = e.choices[i];
          if (choice.can && !choice.can()) continue;
          const before = { fund: h.fund, wage: h.wage, share: h.share, run: JSON.stringify(h.run), xp: skillXp(post), cash: st.credits, cap: c.cap.opinion, mate: c.mate ? c.mate.opinion : 0, castNote: 0 };
          G.dialog = { event: e, choices: e.choices };
          const text = String(chooseEvent(i));
          if (/undefined|NaN|\[object|\{[a-z]+\}/.test(e.title + e.text + choice.label + text)) bad.push(`${d.id}#${i}: ${text.slice(0, 80)}`);
          if (h.fund !== before.fund || h.wage !== before.wage || h.share !== before.share || JSON.stringify(h.run) !== before.run) bad.push(`${d.id}#${i}: touched the run`);
          if (st.credits - before.cash < -100 || st.credits - before.cash > 200) bad.push(`${d.id}#${i}: savings moved by ${st.credits - before.cash}`);
          if (skillXp(post) - before.xp > 4) bad.push(`${d.id}#${i}: experience ${skillXp(post) - before.xp}`);
          rows.push(d.group);
        }
      }
    }
    return { bad, groups: [...new Set(rows)].sort() };
  });
  assert.deepEqual(r.bad, []);
  assert.deepEqual(r.groups, ['captain', 'crew', 'money', 'road', 'work']);
  await done();
});

test('specific effects land: opinion of the captain, a shipmate, savings and experience', async () => {
  const { ev, done } = await open();
  await ev(hiredHelpers);
  const r = await ev(() => {
    startHired('pilot'); const st = G.state, h = st.hired; st.tutorial = null; uatBurn('Ceres Station', 'pallas'); G.transit.times = [];
    const play = (id, i) => { const c = handContext(), d = HAND_EVENTS.find(x => x.id === id), e = d.make(c); G.dialog = { event: e, choices: e.choices }; const o = { cap: c.cap.opinion, mate: c.mate.opinion, cash: st.credits, xp: skillXp('pilot') }; chooseEvent(i); return { cap: c.cap.opinion - o.cap, mate: c.mate.opinion - o.mate, cash: st.credits - o.cash, xp: skillXp('pilot') - o.xp, mateWho: c.mate }; };
    st.credits = 500;
    const out = {};
    out.favour = play('cap-favour', 0); out.favourPaid = play('cap-favour', 1); out.refuse = play('cap-favour', 2);
    out.short = play('money-short', 0); out.loan = play('money-loan', 0); out.noLoan = play('money-loan', 2);
    out.cover = play('crew-cover', 0); out.wage = h.wage;
    return out;
  });
  assert.deepEqual([r.favour.cap, r.favour.xp, r.favour.cash], [2, 2, 0], 'standing the watch');
  assert.deepEqual([r.favourPaid.cap, r.favourPaid.cash], [0, 40], 'standing it for a fee');
  assert.equal(r.refuse.cap, -1);
  assert.deepEqual([r.short.cash, r.short.cap], [r.wage, 0], 'the short pay is made good');
  assert.deepEqual([r.loan.cash, r.loan.mate], [-100, 3], 'a loan costs savings and buys goodwill');
  assert.equal(r.noLoan.mate, -1);
  assert.deepEqual([r.cover.mate, r.cover.xp], [2, 1]);
  await done();
});

test('the main characters appear in a hand\'s events only when they are aboard', async () => {
  const { ev, done } = await open();
  await ev(hiredHelpers);
  const seen = async background => ev(bg => {
    startGame({ slot: 1, background: bg, captain: 'Ines Okafor', mode: 'hired', post: 'pilot' }); while (G.dialog) finishEvent();
    const st = G.state; st.tutorial = null; st.story.next = 1e9; uatBurn('Ceres Station', 'pallas'); G.transit.times = [];
    const out = { aboard: castKeys(), titles: new Set() };
    for (let i = 0; i < 300; i++) { st.eventSeen = {}; const e = hiredEvent('crew'); if (e) out.titles.add(e.title); }
    out.titles = [...out.titles]; return out;
  }, background);
  const CAST_TITLES = ['Ines Calls the Numbers', 'Tomas in the Engine Room', 'Yelena Wants a Sparring Partner', 'Ruben and the Thermos'];
  const earth = await seen('earth'), mars = await seen('mars'), belt = await seen('belt');
  assert.deepEqual(earth.aboard.sort(), ['ines', 'tomas']);
  assert.deepEqual(earth.titles.filter(t => CAST_TITLES.includes(t)).sort(), ['Ines Calls the Numbers', 'Tomas in the Engine Room']);
  assert.deepEqual(mars.aboard.sort(), ['ruben', 'yelena']);
  assert.deepEqual(mars.titles.filter(t => CAST_TITLES.includes(t)).sort(), ['Ruben and the Thermos', 'Yelena Wants a Sparring Partner']);
  assert.deepEqual(belt.aboard, []);
  assert.deepEqual(belt.titles.filter(t => CAST_TITLES.includes(t)), [], 'a start with no cast gets none of their events');
  assert.ok(belt.titles.length >= 3, 'but still has crew events');
  await done();
});

test('downtime for a hired hand: ten additions, never for an owner, with the main characters when aboard', async () => {
  const { ev, done } = await open();
  await ev(hiredHelpers);
  const r = await ev(() => {
    const out = {};
    out.defined = HAND_DOWNTIME.length;
    const menu = () => { G.transit.lifeUsed = {}; G.state.eventSeen = {}; return downtimeEvent().choices.map(c => c.label); };
    const extras = labels => labels.filter(l => HAND_DOWNTIME.some(d => d.label === l));
    startGame({ slot: 1, background: 'earth', captain: 'Ines Okafor', mode: 'hired', post: 'gunner' }); while (G.dialog) finishEvent();
    G.state.tutorial = null; uatBurn('Ceres Station', 'pallas'); G.transit.times = [];
    const days = new Set(); out.counts = [];
    for (let d = 0; d < 12; d++) { G.state.day += 1; const e = extras(menu()); out.counts.push(e.length); e.forEach(l => days.add(l)); }
    out.handSeen = [...days];
    out.earthCast = HAND_DOWNTIME.filter(d => d.cast && d.can()).map(d => d.label);
    startGame({ slot: 1, background: 'belt', captain: 'Ines Okafor', mode: 'hired', post: 'gunner' }); while (G.dialog) finishEvent();
    G.state.tutorial = null; uatBurn('Ceres Station', 'pallas'); G.transit.times = [];
    out.beltCast = HAND_DOWNTIME.filter(d => d.cast && d.can()).length;
    startGame({ slot: 1, background: 'earth', captain: 'Ines' }); while (G.dialog) finishEvent();
    G.state.tutorial = null; uatBurn('Ceres Station', 'pallas'); G.transit.times = [];
    out.owner = extras(menu()).length; out.ownerFn = handDowntime().length;
    return out;
  });
  assert.equal(r.defined, 10);
  assert.ok(r.counts.every(n => n >= 1 && n <= 4), `one to four at a time (${r.counts})`);
  assert.ok(r.handSeen.length >= 6, `they come round in turn (${r.handSeen.length})`);
  assert.deepEqual(r.earthCast.sort(), ['Fly a sim with Ines', 'Learn the loop from Tomas']);
  assert.equal(r.beltCast, 0, 'no main character, no such choice');
  assert.equal(r.owner, 0); assert.equal(r.ownerFn, 0);
  await done();
});

test('hired downtime lands its effects, in savings and not the ship\'s purse', async () => {
  const { ev, done } = await open();
  await ev(hiredHelpers);
  const r = await ev(() => {
    const out = {}, labels = HAND_DOWNTIME.map(d => d.label);
    for (const bg of ['earth', 'mars']) {
      for (const label of labels) {
        startGame({ slot: 1, background: bg, captain: 'Ines Okafor', mode: 'hired', post: 'pilot' }); while (G.dialog) finishEvent();
        const st = G.state, h = st.hired; st.tutorial = null; uatBurn('Ceres Station', 'pallas'); G.transit.times = []; st.credits = 500;
        const d = HAND_DOWNTIME.find(x => x.label === label);
        if (!d.can()) continue;
        const cap = person(h.captain), mates = crewPeople().map(f => f.p);
        const before = { fund: h.fund, cash: st.credits, cap: cap.opinion, mates: mates.map(m => m.opinion), xp: Object.assign({}, h.skill) };
        G.transit.lifeUsed = {};
        const e = downtimeEvent(), i = e.choices.findIndex(c => c.label === label);
        if (i < 0) {  // not on the menu today: run it directly
          const text = d.run(); out[`${bg}:${label}`] = { text, cash: st.credits - before.cash, fund: h.fund - before.fund };
          continue;
        }
        G.dialog = { event: e, choices: e.choices };
        const text = String(chooseEvent(i));
        out[`${bg}:${label}`] = { text, cash: st.credits - before.cash, fund: h.fund - before.fund, cap: cap.opinion - before.cap, mates: mates.map((m, j) => m.opinion - before.mates[j]), xp: Object.keys(h.skill).some(k => h.skill[k] !== (before.xp[k] || 0)) };
      }
    }
    return out;
  });
  const keys = Object.keys(r);
  assert.ok(keys.length >= 14, `ran them all (${keys.length})`);
  for (const [k, v] of Object.entries(r)) {
    assert.doesNotMatch(v.text, /undefined|NaN|\[object|\{[a-z]+\}/, k);
    assert.equal(v.fund, 0, `${k}: never the ship's purse`);
  }
  assert.ok(r['earth:Stand a spare watch for the captain'].cash === 40, 'the fee reaches your savings');
  const mend = r['earth:Mend a shipmate\'s gear for pay'];
  assert.ok(mend.cash >= 30 && mend.cash <= 60 && mend.fund === 0);
  await done();
});
