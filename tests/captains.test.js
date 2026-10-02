'use strict';

// The authored captains (js/captains.js, js/captains/) and the first officers who are CAST entries (marked xo and fragile):
// how a hired game picks a pair, builds their people, and puts the first officer aboard.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

const helpers = () => {
  window.start = (o = {}) => { startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', ...o }); while (G.dialog) finishEvent(); const st = G.state; st.story.next = 1e9; return st; };
};
const run = async (fn, o, arg) => { const t = await open(o); await t.ev(helpers); const r = await t.ev(fn, arg); await t.done(); return r; };

test('every captain and first officer entry is complete and plain text', async () => {
  const r = await run(() => {
    const need = ['first', 'last', 'pronouns', 'culture', 'home', 'age', 'traits', 'bio', 'wants', 'fears', 'captain', 'wage', 'share', 'hears', 'bonus', 'talk'];
    const out = { captains: Object.keys(CAPTAINS).sort(), bad: [] };
    for (const [key, d] of Object.entries(CAPTAINS)) {
      for (const f of need) if (d[f] === undefined || d[f] === null || d[f] === '') bad(out, key, f);
      if (!d.xo || !CAST[d.xo] || !CAST[d.xo].xo || !CAST[d.xo].fragile) out.bad.push(`${key}: its first officer`);
      for (const k of ['trade', 'nerve', 'thrift']) if (!(d.captain[k] >= 1 && d.captain[k] <= 5)) out.bad.push(`${key}: ${k}`);
      if (d.traits.length !== 2 || !d.traits.every(t => TRAITS[t])) out.bad.push(`${key}: traits`);
      if (/[\u{1F300}-\u{1FAFF}☀-➿]/u.test(JSON.stringify(d))) out.bad.push(`${key}: emoji`);
    }
    function bad(o, key, f) { o.bad.push(`${key}: ${f}`); }
    return out;
  });
  assert.deepEqual(r.captains, ['hester']); assert.deepEqual(r.bad, []);
});

test('a hired game is run by an authored captain with their first officer aboard', async () => {
  const r = await run(() => {
    const st = start(), key = st.hired.captainKey, d = CAPTAINS[key], cap = hiredCaptain();
    const xo = person(`c:${d.xo}`);
    return { key, known: !!d, first: cap.first === d.first && cap.last === d.last, age: cap.age === d.age, traits: cap.traits.join() === d.traits.join(), stats: JSON.stringify(cap.captain) === JSON.stringify(d.captain),
      role: cap.role, captainKey: cap.captainKey, crewed: st.crew.includes(xo.id), xoRole: xo.role, cast: xo.cast, since: typeof st.cast[d.xo].since,
      generated: st.crew.map(person).filter(c => c.role === 'xo' && !c.cast).length, roster: crewMembers().map(c => c.role).sort() };
  });
  assert.equal(r.known, true); assert.equal(r.first, true); assert.equal(r.age, true); assert.equal(r.traits, true); assert.equal(r.stats, true);
  assert.equal(r.role, 'captain'); assert.equal(r.captainKey, r.key);
  assert.equal(r.crewed, true); assert.equal(r.xoRole, 'xo'); assert.equal(r.cast, 'cato'); assert.equal(r.since, 'number');
  assert.equal(r.generated, 0, 'the authored first officer takes the generated one\'s place');
  assert.deepEqual(r.roster, ['cook', 'engineer', 'icehand', 'icehand', 'medic', 'pilot', 'quartermaster', 'slicer', 'xo']);
});

test('the same seed picks the same captain', async () => {
  const a = await run(() => start().hired.captainKey), b = await run(() => start().hired.captainKey);
  assert.equal(a, b);
});

test('a hired save with no captain key keeps its generated captain and plays on', async () => {
  const r = await run(() => {
    const st = start(); delete st.hired.captainKey; const cap = hiredCaptain(); delete cap.captainKey;
    const entry = captainEntry();
    underwayLike();
    return { entry, name: !!cap.first };
    function underwayLike() { for (let i = 0; i < 10; i++) { const e = hiredEvent('captain'); if (e) { openEvent(e); while (G.dialog) { const d = G.dialog, ok = d.choices.map((c, i) => i).filter(i => !d.choices[i].can || d.choices[i].can()); if (ok.length) chooseEvent(ok[0]); finishEvent(); } } } }
  });
  assert.equal(r.entry, null); assert.equal(r.name, true);
});

// ---------- how the style drives the run ----------

const withStyle = fn => async arg => run(fn, {}, arg);

test('wage and share come from the entry, and "for the money" adds two points to the share', async () => {
  const r = await run(() => {
    const st = start(), d = captainEntry(), h = st.hired, before = { wage: h.wage, share: h.share };
    while (G.dialog) finishEvent();
    const ev = signOnEvent(); const money = ev.choices[0]; money.run();
    return { d: { wage: d.wage, share: d.share }, before, after: h.share };
  });
  assert.deepEqual(r.before, r.d); assert.equal(r.after, +(r.d.share + 0.02).toFixed(3));
});

test('trade sets how close to the best run the captain plans', async () => {
  const r = await run(() => {
    const st = start(), out = {};
    const plans = new Set();
    for (const trade of [5, 1]) {
      captainEntry().captain.trade = trade; plans.clear();
      for (let i = 0; i < 80; i++) { st.hired.plan = null; const p = planRun(); plans.add(`${p.planet}/${p.good}`); }
      out[trade] = plans.size;
    }
    return out;
  });
  assert.equal(r[5], 1, 'at 5 always the best run'); assert.ok(r[1] >= 2 && r[1] <= 4, `at 1 one of the top four (${r[1]})`);
});

test('nerve sets how much a dangerous lane costs a run, and how often the captain fights', async () => {
  const r = await run(() => {
    const st = start(), out = {}, d = captainEntry();
    const ev = { choices: [{ label: 'Pay them off' }, { label: 'Battle stations' }, { label: 'Run for it' }] };
    for (const nerve of [1, 5]) {
      d.captain.nerve = nerve; let fights = 0;
      for (let i = 0; i < 400; i++) if (captainPick(ev.choices).label === 'Battle stations') fights++;
      out[nerve] = { fights, risk: laneRisk('hygiea') };
    }
    return out;
  });
  assert.ok(r[5].fights > r[1].fights * 2, `a bold captain fights more (${r[5].fights} against ${r[1].fights})`);
  assert.ok(r[5].risk > r[1].risk, 'a cautious captain marks a pirate lane down more');
  assert.equal(r[5].risk, 1, 'a bold captain marks nothing down');
});

test('thrift sets the fund level below which costly choices are avoided', async () => {
  const r = await run(() => {
    const st = start(), d = captainEntry(), out = {};
    const choices = [{ label: 'Pay the fine' }, { label: 'Run for it' }];
    for (const thrift of [1, 5]) {
      d.captain.thrift = thrift; st.hired.fund = 3000; let pays = 0;
      for (let i = 0; i < 400; i++) if (captainPick(choices).label === 'Pay the fine') pays++;
      out[thrift] = pays;
    }
    return out;
  });
  assert.ok(r[1] > r[5] * 2, `at a fund of 3,000 a spendthrift pays (${r[1]}), a thrifty captain hangs on to it (${r[5]})`);
});

test('hears and bonus are the opinions a captain needs before listening or paying a bonus', async () => {
  const r = await run(() => {
    const st = start(), d = captainEntry(), cap = hiredCaptain(), out = {};
    const find = id => HAND_EVENTS.find(e => e.id === id).make({ cap, mate: null });
    const delta = (id, choice) => { const before = cap.opinion, credits = st.credits; find(id).choices[choice].run(); return [cap.opinion - before, st.credits - credits]; };
    cap.opinion = 2;
    d.hears = 1; out.heard = delta('cap-order', 1)[0]; cap.opinion = 2;
    d.hears = 3; out.notHeard = delta('cap-order', 1)[0]; cap.opinion = 2;
    d.bonus = 2; out.paid = delta('cap-praise', 1)[1]; cap.opinion = 2;
    d.bonus = 4; out.unpaid = delta('cap-praise', 1)[1];
    return out;
  });
  assert.ok(r.heard > 0 && r.notHeard < 0, `heard ${r.heard}, not heard ${r.notHeard}`);
  assert.ok(r.paid > 0 && r.unpaid === 0, `paid ${r.paid}, unpaid ${r.unpaid}`);
});

test('talk weights how often the captain turns up', async () => {
  const r = await run(() => {
    const st = start(), d = captainEntry();
    const weight = () => HIRED_GROUPS.map(g => [g, captainWeight(g)]).filter(([g]) => g === 'captain')[0][1];
    d.talk = 1.5; const loud = weight(); d.talk = 0.7; const quiet = weight();
    return { loud, quiet, other: captainWeight('crew') };
  });
  assert.ok(r.loud > r.quiet); assert.equal(r.other, 1);
});

// ---------- the first officer is the daily boss ----------

test('the first officer decides a post swap, and the captain does when there is none', async () => {
  const r = await run(() => {
    const st = start(), cap = hiredCaptain(), xo = person('c:cato'), out = {};
    const other = ['pilot', 'gunner', 'engineer', 'comms'].find(p => p !== st.hired.post);
    cap.opinion = -4; xo.opinion = 5; out.xoLiked = swapOdds(other);
    cap.opinion = 5; xo.opinion = -4; out.xoDisliked = swapOdds(other);
    out.boss = bossFor('swap') === xo; out.ship = bossFor('ship') === cap;
    UI.notes.length = 0; Math.random = () => 0; G.mode = 'landed'; st.hired.asked = 0; cap.opinion = 0; xo.opinion = 5; askSwap(other);
    out.note = UI.notes.join(' ');
    st.crew = st.crew.filter(id => id !== xo.id);  // no first officer aboard
    out.noXo = bossFor('swap') === cap;
    return out;
  });
  assert.ok(r.xoLiked > r.xoDisliked, `odds follow the first officer (${r.xoLiked} against ${r.xoDisliked})`);
  assert.equal(r.boss, true); assert.equal(r.ship, true); assert.equal(r.noXo, true);
  assert.match(r.note, /Cato/);
});

test('a call that is the crew\'s goes to the first officer, and a ship matter to the captain', async () => {
  const r = await run(() => {
    const st = start(), out = {};
    const post = ['pilot', 'gunner', 'engineer', 'comms'].find(p => p !== st.hired.post);
    G.transit = { days: 3 };
    const ev = o => ({ title: 'T', text: 'Something.', choices: [{ label: 'Run for it', run: () => 'It goes.' }], ...o });
    out.crew = hiredCall(ev({ via: 'crew', owner: post })).text;
    out.ship = hiredCall(ev({ via: 'ship' })).text;
    out.captain = hiredCall(ev({ via: 'crew', owner: 'captain' })).text;
    out.yours = hiredCall(ev({ via: 'crew', owner: st.hired.post })).text;
    G.transit = null;
    return out;
  });
  assert.match(r.crew, /Cato takes the call/); assert.match(r.ship, /Captain Vance takes the call/); assert.match(r.captain, /Captain Vance takes the call/);
  assert.equal(r.yours, 'Something.');
});
