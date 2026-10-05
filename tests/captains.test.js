'use strict';

// The authored captains (js/captains.js, js/captains/) and the first officers who are CAST entries (marked xo and fragile):
// how a hired game picks a pair, builds their people, and puts the first officer aboard.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

const helpers = () => {
  window.underway = () => { if (!sail()) throw new Error('no plan'); for (let k = 0; k < 8 && G.dialog; k++) { const d = G.dialog, ok = d.choices.map((c, i) => i).filter(i => !d.choices[i].can || d.choices[i].can()); if (ok.length) chooseEvent(ok[0]); finishEvent(); } while (G.dialog) finishEvent(); tryBurn(); enterTransit(); G.transit.times = []; };
  window.start = (o = {}) => { startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester', ...o }); while (G.dialog) finishEvent(); const st = G.state; st.story.next = 1e9; return st; };
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
  assert.deepEqual(r.captains, ['dov', 'hester', 'imre', 'zoya']); assert.deepEqual(r.bad, []);
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

// ---------- Hester and Cato's own words ----------

test('the sign-on paragraph is the captain\'s own introduction, with the pay in it', async () => {
  const r = await run(() => {
    const st = start(); const text = signOnEvent().text, h = st.hired;
    return { text, wage: h.wage, share: Math.round(h.share * 100), generic: /whom the crew describe/.test(text) };
  });
  assert.match(r.text, /Captain Hester Vance reads your papers twice/);
  assert.ok(r.text.includes(`${r.wage} a day and ${r.share} percent`), 'the figures are the captain\'s own');
  assert.equal(r.generic, false);
});

test('a captain\'s wording for a shared event is used, and anything missing falls back to the generic text', async () => {
  const r = await run(() => {
    const st = start(), cap = hiredCaptain(), out = {};
    const make = id => HAND_EVENTS.find(e => e.id === id).make({ cap, mate: null });
    for (const id of ['cap-order', 'cap-praise', 'cap-dressing', 'cap-favour']) out[id] = make(id).text;
    out.own = captainEntry().events['cap-order'].text;
    const heard = (cap.opinion = 3, make('cap-order').choices[1].run());
    out.heard = heard;
    const entry = captainEntry(), saved = entry.events; entry.events = {};
    out.fallback = make('cap-order').text; out.fallbackHeard = (cap.opinion = 3, make('cap-order').choices[1].run());
    entry.events = saved;
    out.praise = captainEntry().events['cap-praise'].text.replace('{post}', POSTS[st.hired.post].name.toLowerCase());
    return out;
  });
  assert.equal(r['cap-order'], r.own); assert.match(r['cap-dressing'], /pencil across the gap/); assert.match(r['cap-favour'], /I will owe you the hours/);
  assert.equal(r['cap-praise'], r.praise, 'the {post} is filled in');
  assert.match(r.heard, /Nine percent/);
  assert.match(r.fallback, /wants the drive run hotter than you would, to make a berth window/); assert.match(r.fallbackHeard, /Run it at ninety/);
  assert.doesNotMatch(r.fallbackHeard, /\b(they|their|them)\b/i, 'the generic text says "the captain"');
});

test('her two scenes come once each, in order, when the days are up', async () => {
  const r = await run(() => {
    const st = start(), h = st.hired, cap = hiredCaptain(), out = {};
    underway();
    const at = d => { st.day = h.since + d; return captainBeat(); };
    const T = CAPTAIN_BEAT_DAYS.trouble, S = CAPTAIN_BEAT_DAYS.secret; out.early = at(T - 1); out.trouble = at(T);
    out.beats0 = h.beats || 0;
    for (const e of Mods.filter('happenings', [], 'transit')) if (e.make().title === 'The First of the Month') break;  // the main characters' scenes come through the same filter
    out.beats1 = h.beats;
    out.beforeSecret = at(S - 1); out.secret = at(S);
    cap.opinion = 3; out.confide = captainScene('secret').title; cap.opinion = 1; out.found = captainScene('secret').title;
    h.beats = 2; out.done = at(200);
    return out;
  });
  assert.equal(r.early, null); assert.equal(r.trouble, 'trouble'); assert.equal(r.beats1, 1);
  assert.equal(r.beforeSecret, null); assert.equal(r.secret, 'secret');
  assert.equal(r.confide, 'What the Notebook Is For'); assert.equal(r.found, 'Under the Sugar'); assert.equal(r.done, null, 'once each');
});

test('the trouble scene can cost four hundred, and the secret changes with trust and sets the flags', async () => {
  const r = await run(() => {
    const st = start(), h = st.hired, cap = hiredCaptain(), out = {};
    const sc = captainScene('trouble'), lend = sc.choices[0];
    st.credits = 300; out.poor = lend.can();
    st.credits = 1000; out.rich = lend.can(); cap.opinion = 0; lend.run(); out.after = { credits: st.credits, opinion: cap.opinion, lent: !!h.flags.lent };
    cap.opinion = 3; captainScene('secret').choices[0].run(); out.kept = { secret: !!h.flags.secretKnown, angry: !!h.flags.secretAngry };
    delete h.flags.secretKnown; cap.opinion = 0; captainScene('secret').choices[1].run(); out.found = { secret: !!h.flags.secretKnown, angry: !!h.flags.secretAngry, opinion: cap.opinion };
    return out;
  });
  assert.equal(r.poor, false); assert.equal(r.rich, true); assert.deepEqual(r.after, { credits: 600, opinion: 3, lent: true });
  assert.deepEqual(r.kept, { secret: true, angry: false }); assert.deepEqual(r.found, { secret: true, angry: true, opinion: 0 });
});

test('the goodbye has an opening by warmth and a line for each thing that happened', async () => {
  const r = await run(() => {
    const st = start(), h = st.hired, cap = hiredCaptain(), out = {};
    const bye = () => captainGoodbye().text;
    cap.opinion = 5; out.warm = bye(); cap.opinion = 1; out.neutral = bye(); cap.opinion = -2; out.cold = bye();
    cap.opinion = 1; for (const c of st.crew.map(person)) c.opinion = 0; out.alone = bye();
    person('c:ines').opinion = 3; out.crew = bye();
    out.noSecret = /bank/.test(bye()); h.flags = { secretKnown: true }; out.secret = bye();
    h.flags = { lent: true }; out.lent = bye();
    h.flags = {}; out.xo = bye();
    castFate('cato', 'die', 'x', 'x'); out.xoDead = bye();
    return out;
  });
  assert.match(r.warm, /waiting at the foot of the ramp/); assert.match(r.neutral, /counts your last pay twice/); assert.match(r.cold, /does not offer her hand/);
  assert.doesNotMatch(r.alone, /will go with you/); assert.match(r.crew, /Ines Ferreira will go with you/);
  assert.equal(r.noSecret, false); assert.match(r.secret, /The first of the month/); assert.match(r.lent, /four hundred and ten/);
  assert.match(r.xo, /Cato is at the hatch/); assert.match(r.xoDead, /taken Cato out of the book/); assert.doesNotMatch(r.xoDead, /Cato is at the hatch/);
  for (const k of ['warm', 'neutral', 'cold']) assert.match(r[k], /Fair winds/);
});

test('a loan is repaid when you leave, and the choices set the captain\'s last opinion', async () => {
  const r = await run(() => {
    const st = start(), h = st.hired, cap = hiredCaptain(), out = {}, opinion0 = cap.opinion;
    h.flags = { lent: true, secretKnown: true };
    const bye = captainGoodbye(); out.labels = bye.choices.map(c => c.label);
    st.credits = 1000; cap.opinion = 0; bye.choices[1].run(); out.repaid = st.credits; out.opinion = cap.opinion;
    h.flags = {}; out.labelsNoSecret = captainGoodbye().choices.map(c => c.label);
    return out;
  });
  assert.deepEqual(r.labels, ['Thank her for the work', 'Wish her the ship', 'Take the papers and go']);
  assert.equal(r.repaid, 1410); assert.equal(r.opinion, 2);
  assert.deepEqual(r.labelsNoSecret, ['Thank her for the work', 'Take the papers and go']);
});

test('Cato\'s scenes come in order as the days pass', async () => {
  const r = await run(() => {
    const st = start(), rec = castRec('cato'), out = {};
    const next = d => { st.day = rec.since + d; const n = castNext('cato'); return n && n.name; };
    out.day0 = next(0); rec.arc = 1; out.day24 = next(24); out.day25 = next(25);
    rec.arc = 2; out.day39 = next(39); out.day40 = next(40);
    rec.arc = 3; out.day54 = next(54); out.day55 = next(55);
    rec.arc = 4; out.day69 = next(69); out.day70 = next(70);
    return out;
  });
  assert.deepEqual(r, { day0: 'intro', day24: null, day25: 'mid1', day39: null, day40: 'mid2', day54: null, day55: 'late', day69: null, day70: 'pivot' });
});

test('Two Orders moves the captain\'s and Cato\'s opinion opposite ways', async () => {
  const r = await run(() => {
    const st = start(), cap = hiredCaptain(), cato = person('c:cato'), sc = CAST.cato.scenes.mid2, out = {};
    const run = i => { cap.opinion = 0; cato.opinion = 0; sc.choices[i].run(); return [cap.opinion, cato.opinion]; };
    out.hold = run(0); out.stand = run(1);
    return out;
  });
  assert.ok(r.hold[0] > 0 && r.hold[1] < 0, `hold the deck: ${r.hold}`); assert.ok(r.stand[0] < 0 && r.stand[1] > 0, `stand down: ${r.stand}`);
});

test('the ice hold follows the state: he lives, is marked or dies, and the captain feels it', async () => {
  const r = await run(() => {
    const run = ({ medic = true, hull = 'good', hands = 2, backup = false }) => {
      const st = start(), cap = hiredCaptain(); cap.opinion = 2;
      st.crew = st.crew.filter(id => { const c = person(id); return (c.role !== 'medic' || medic) && (c.role !== 'icehand' || hands-- > 0); });
      st.armor = hull === 'good' ? ship().armor : Math.floor(ship().armor * 0.5);
      const text = CAST.cato.scenes.pivot.choices[backup ? 1 : 0].run(), m = (st.memorial || [])[0];
      return { text: typeof text === 'string' && text.length > 40, dead: castDead('cato'), marks: (castRec('cato').marks || []).length, mood: moodLow(cap), opinion: cap.opinion, cause: m ? m.cause : null, crewed: st.crew.includes('c:cato') };
    };
    return { four: run({ backup: true }), three: run({}), two: run({ hull: 'low' }), one: run({ medic: false, hull: 'low' }), noHands: run({ hands: 0, hull: 'low' }) };
  });
  for (const k of ['four', 'three']) assert.deepEqual([r[k].dead, r[k].marks, r[k].mood], [false, 0, false], `${k} points: he lives`);
  assert.deepEqual([r.two.dead, r.two.marks, r.two.mood], [false, 1, true], 'two points: marked, and the captain is low');
  for (const k of ['one', 'noHands']) {
    assert.deepEqual([r[k].dead, r[k].mood, r[k].crewed], [true, true, false], `${k}: one point, he dies`);
    assert.match(r[k].cause, /^Lost in the ice hold near /); assert.equal(r[k].opinion, 1, 'the captain takes it hard');
  }
});

// ---------- Dov and Ilsa ----------

test('every captain\'s two scenes come once each, in order, and the goodbye plays for each', async () => {
  for (const key of ['hester', 'dov', 'imre', 'zoya']) {
    const r = await run(k => {
      const st = start({ captainKey: k }), h = st.hired, cap = hiredCaptain(), d = captainEntry(), out = {};
      const at = n => { st.day = h.since + n; return captainBeat(); };
      const T = CAPTAIN_BEAT_DAYS.trouble, S = CAPTAIN_BEAT_DAYS.secret; out.early = at(T - 1); out.trouble = at(T); h.beats = 1; out.secret = at(S); cap.opinion = 3; out.confide = captainScene('secret').title; cap.opinion = 1; out.found = captainScene('secret').title;
      h.beats = 2; out.done = at(300);
      cap.opinion = 5; out.warm = captainGoodbye().text; cap.opinion = -1; out.cold = captainGoodbye().text;
      out.xo = d.goodbye.xo.split(' ')[0]; out.xoLine = captainGoodbye().text.includes(d.goodbye.xo);
      castFate(d.xo, 'die', 'x', 'x'); out.xoDead = captainGoodbye().text.includes(d.goodbye.xoDead); out.xoGone = bossFor('swap') === cap;
      return out;
    }, { key }, key);
    assert.equal(r.early, null, key); assert.equal(r.trouble, 'trouble', key); assert.equal(r.secret, 'secret', key); assert.equal(r.done, null, key);
    assert.notEqual(r.confide, r.found, `${key}: the secret reads by trust`);
    assert.notEqual(r.warm, r.cold, `${key}: the opening follows how they feel`);
    assert.equal(r.xoLine, true, key); assert.equal(r.xoDead, true, key); assert.equal(r.xoGone, true, `${key}: no first officer, the captain decides`);
  }
});

test('Dov: his introduction, his wording, and his trouble and secret', async () => {
  const r = await run(() => {
    const st = start({ captainKey: 'dov' }), h = st.hired, cap = hiredCaptain(), out = {};
    out.intro = signOnEvent().text; out.wage = h.wage; out.share = Math.round(h.share * 100);
    const make = id => HAND_EVENTS.find(e => e.id === id).make({ cap, mate: null });
    out.order = make('cap-order').text;
    cap.opinion = -1; out.heardAtMinusOne = make('cap-order').choices[1].run();  // hears is -1: he listens to nearly anyone
    cap.opinion = -2; out.notHeard = make('cap-order').choices[1].run();
    cap.opinion = 0; const bonus = st.credits; make('cap-praise').choices[1].run(); out.bonus = st.credits - bonus;  // bonus is 0: he gives it at once
    const sc = captainScene('trouble'); st.credits = 200; out.poor = sc.choices[1].can(); st.credits = 1000; sc.choices[1].run(); out.after = { credits: st.credits, lent: !!h.flags.lent };
    cap.opinion = 3; captainScene('secret').choices[0].run(); out.flag = !!h.flags.secretKnown;
    h.flags = { lent: true }; st.credits = 100; captainGoodbye().choices[0].run(); out.repaid = st.credits;
    return out;
  });
  assert.match(r.intro, /Captain Dov Adair is shaking your hand/); assert.ok(r.intro.includes(`${r.wage} a day and ${r.share} percent`));
  assert.match(r.order, /woman at the last port/); assert.match(r.heardAtMinusOne, /Ninety/); assert.match(r.notHeard, /I did not ask/);
  assert.ok(r.bonus > 0, 'a bonus at once'); assert.equal(r.poor, false); assert.deepEqual(r.after, { credits: 700, lent: true }); assert.equal(r.flag, true); assert.equal(r.repaid, 430);
});

test('Ilsa\'s scenes come in order, and Two Orders moves the captain\'s and her opinion opposite ways', async () => {
  const r = await run(() => {
    const st = start({ captainKey: 'dov' }), rec = castRec('ilsa'), cap = hiredCaptain(), ilsa = person('c:ilsa'), out = {};
    const next = d => { st.day = rec.since + d; const n = castNext('ilsa'); return n && n.name; };
    out.order = [next(0), (rec.arc = 1, next(24)), next(25), (rec.arc = 2, next(39)), next(40), (rec.arc = 3, next(54)), next(55), (rec.arc = 4, next(69)), next(70)];
    const sc = CAST.ilsa.scenes.mid2, run = i => { cap.opinion = 0; ilsa.opinion = 0; sc.choices[i].run(); return [cap.opinion, ilsa.opinion]; };
    out.family = run(0); out.shut = run(1);
    return out;
  });
  assert.deepEqual(r.order, ['intro', null, 'mid1', null, 'mid2', null, 'late', null, 'pivot']);
  assert.ok(r.family[0] > 0 && r.family[1] < 0, `family in: ${r.family}`); assert.ok(r.shut[0] < 0 && r.shut[1] > 0, `cabin shut: ${r.shut}`);
});

test('the reactor follows the state: she lives, is marked or dies, and the captain feels it', async () => {
  const r = await run(() => {
    const run = ({ medic = true, drive = 100, engineer = true, backup = false }) => {
      const st = start({ captainKey: 'dov' }), cap = hiredCaptain(); cap.opinion = 2;
      st.crew = st.crew.filter(id => { const c = person(id); return (c.role !== 'medic' || medic) && (c.role !== 'engineer' || engineer); });
      condition().drive = drive;
      const text = CAST.ilsa.scenes.pivot.choices[backup ? 1 : 0].run(), m = (st.memorial || [])[0];
      return { text: typeof text === 'string' && text.length > 40, dead: castDead('ilsa'), marks: (castRec('ilsa').marks || []).length, mood: moodLow(cap), opinion: cap.opinion, cause: m ? m.cause : null };
    };
    return { four: run({ backup: true }), three: run({}), two: run({ drive: 30 }), one: run({ medic: false, drive: 30 }), none: run({ medic: false, drive: 30, engineer: false }) };
  });
  for (const k of ['four', 'three']) assert.deepEqual([r[k].dead, r[k].marks, r[k].mood], [false, 0, false], `${k} points: she lives`);
  assert.deepEqual([r.two.dead, r.two.marks, r.two.mood], [false, 1, true], 'two points: marked, and the captain is low');
  for (const k of ['one', 'none']) { assert.deepEqual([r[k].dead, r[k].mood], [true, true], `${k}: she dies`); assert.match(r[k].cause, /^Lost at the reactor near /); assert.equal(r[k].opinion, 1); }
});

// ---------- Imre and Pilar ----------

test('Imre: their introduction, their wording, and their trouble and secret', async () => {
  const r = await run(() => {
    const st = start({ captainKey: 'imre' }), h = st.hired, cap = hiredCaptain(), pilar = person('c:pilar'), out = {};
    out.intro = signOnEvent().text; out.wage = h.wage; out.share = Math.round(h.share * 100);
    const make = id => HAND_EVENTS.find(e => e.id === id).make({ cap, mate: null });
    out.order = make('cap-order').text;
    cap.opinion = 1; out.notHeard = make('cap-order').choices[1].run();  // hears is 2
    cap.opinion = 2; out.heard = make('cap-order').choices[1].run();
    cap.opinion = 2; let credits = st.credits; make('cap-praise').choices[1].run(); out.noBonus = st.credits - credits;  // bonus is 3
    cap.opinion = 3; credits = st.credits; make('cap-praise').choices[1].run(); out.bonus = st.credits - credits;
    const sc = captainScene('trouble'); cap.opinion = 0; pilar.opinion = 0; sc.choices[0].run(); out.cover = [cap.opinion, pilar.opinion, !!h.flags.covered];
    cap.opinion = 0; pilar.opinion = 0; sc.choices[1].run(); out.answer = [cap.opinion, pilar.opinion];
    cap.opinion = 3; captainScene('secret').choices[1].run(); out.flag = !!h.flags.secretKnown;
    return out;
  });
  assert.match(r.intro, /Captain Imre Sato reads your papers once/); assert.ok(r.intro.includes(`${r.wage} a day and ${r.share} percent`));
  assert.match(r.order, /standing order eleven/i); assert.match(r.notHeard, /closing a file/); assert.match(r.heard, /Ninety/);
  assert.equal(r.noBonus, 0); assert.ok(r.bonus > 0);
  assert.ok(r.cover[0] < 0 && r.cover[1] > 0 && r.cover[2], `taking the blame: ${r.cover}`); assert.ok(r.answer[0] > 0 && r.answer[1] < 0, `letting the captain answer: ${r.answer}`);
  assert.equal(r.flag, true);
});

test('Pilar\'s scenes come in order, and Two Orders moves the captain\'s and her opinion opposite ways', async () => {
  const r = await run(() => {
    const st = start({ captainKey: 'imre' }), rec = castRec('pilar'), cap = hiredCaptain(), pilar = person('c:pilar'), out = {};
    const next = d => { st.day = rec.since + d; const n = castNext('pilar'); return n && n.name; };
    out.order = [next(0), (rec.arc = 1, next(24)), next(25), (rec.arc = 2, next(39)), next(40), (rec.arc = 3, next(54)), next(55), (rec.arc = 4, next(69)), next(70)];
    const sc = CAST.pilar.scenes.mid2, run = i => { cap.opinion = 0; pilar.opinion = 0; sc.choices[i].run(); return [cap.opinion, pilar.opinion]; };
    out.posted = run(0); out.window = run(1);
    return out;
  });
  assert.deepEqual(r.order, ['intro', null, 'mid1', null, 'mid2', null, 'late', null, 'pivot']);
  assert.ok(r.posted[0] > 0 && r.posted[1] < 0, `posted rate: ${r.posted}`); assert.ok(r.window[0] < 0 && r.window[1] > 0, `window: ${r.window}`);
});

test('the docking emergency follows the state: she lives, is marked or dies, and the captain feels it', async () => {
  const r = await run(() => {
    const run = ({ medic = true, hull = 'good', drive = 100, backup = false }) => {
      const st = start({ captainKey: 'imre' }), cap = hiredCaptain(); cap.opinion = 2;
      st.crew = st.crew.filter(id => person(id).role !== 'medic' || medic);
      st.armor = hull === 'good' ? ship().armor : Math.floor(ship().armor * 0.5); condition().drive = drive;
      const text = CAST.pilar.scenes.pivot.choices[backup ? 1 : 0].run(), m = (st.memorial || [])[0];
      return { text: typeof text === 'string' && text.length > 40, dead: castDead('pilar'), marks: (castRec('pilar').marks || []).length, mood: moodLow(cap), opinion: cap.opinion, cause: m ? m.cause : null };
    };
    return { four: run({ backup: true }), three: run({}), two: run({ hull: 'low' }), one: run({ hull: 'low', drive: 30 }), none: run({ medic: false, hull: 'low', drive: 30 }) };
  });
  for (const k of ['four', 'three']) assert.deepEqual([r[k].dead, r[k].marks, r[k].mood], [false, 0, false], `${k} points: she lives`);
  assert.deepEqual([r.two.dead, r.two.marks, r.two.mood], [false, 1, true], 'two points: marked, and the captain is low');
  for (const k of ['one', 'none']) { assert.deepEqual([r[k].dead, r[k].mood], [true, true], `${k}: she dies`); assert.match(r[k].cause, /^Lost at the helm near /); assert.equal(r[k].opinion, 1); }
});

// ---------- Zoya and Ansel ----------

test('Zoya: her introduction, her wording, and her trouble and secret', async () => {
  const r = await run(() => {
    const st = start({ captainKey: 'zoya' }), h = st.hired, cap = hiredCaptain(), out = {};
    out.intro = signOnEvent().text; out.wage = h.wage; out.share = Math.round(h.share * 100);
    const make = id => HAND_EVENTS.find(e => e.id === id).make({ cap, mate: null });
    out.order = make('cap-order').text;
    cap.opinion = -1; out.notHeard = make('cap-order').choices[1].run();  // hears is 0
    cap.opinion = 0; out.heard = make('cap-order').choices[1].run();
    cap.opinion = 1; let credits = st.credits; make('cap-praise').choices[1].run(); out.noBonus = st.credits - credits;  // bonus is 2
    cap.opinion = 2; credits = st.credits; make('cap-praise').choices[1].run(); out.bonus = st.credits - credits;
    const sc = captainScene('trouble'); st.credits = 50; out.poor = sc.choices[1].can(); st.credits = 1000; sc.choices[1].run(); out.after = { credits: st.credits, lent: !!h.flags.lent };
    cap.opinion = 3; captainScene('secret').choices[1].run(); out.flag = !!h.flags.secretKnown;
    h.flags = { lent: true }; st.credits = 100; captainGoodbye().choices[0].run(); out.repaid = st.credits;
    out.style = captainEntry().captain;
    return out;
  });
  assert.match(r.intro, /Captain Zoya Pell signs your papers/); assert.ok(r.intro.includes(`${r.wage} a day and ${r.share} percent`));
  assert.match(r.order, /worth more if it arrives a day early/); assert.match(r.notHeard, /I did not ask/); assert.match(r.heard, /Ninety/);
  assert.equal(r.noBonus, 0); assert.ok(r.bonus > 0); assert.equal(r.poor, false); assert.deepEqual(r.after, { credits: 900, lent: true }); assert.equal(r.flag, true); assert.equal(r.repaid, 225);
  assert.deepEqual(r.style, { trade: 4, nerve: 5, thrift: 1 });
});

test('Ansel\'s scenes come in order, and Two Orders moves the captain\'s and his opinion opposite ways', async () => {
  const r = await run(() => {
    const st = start({ captainKey: 'zoya' }), rec = castRec('ansel'), cap = hiredCaptain(), ansel = person('c:ansel'), out = {};
    const next = d => { st.day = rec.since + d; const n = castNext('ansel'); return n && n.name; };
    out.order = [next(0), (rec.arc = 1, next(24)), next(25), (rec.arc = 2, next(39)), next(40), (rec.arc = 3, next(54)), next(55), (rec.arc = 4, next(69)), next(70)];
    const sc = CAST.ansel.scenes.mid2, run = i => { cap.opinion = 0; ansel.opinion = 0; sc.choices[i].run(); return [cap.opinion, ansel.opinion]; };
    out.take = run(0); out.refuse = run(1);
    return out;
  });
  assert.deepEqual(r.order, ['intro', null, 'mid1', null, 'mid2', null, 'late', null, 'pivot']);
  assert.ok(r.take[0] > 0 && r.take[1] < 0, `take it: ${r.take}`); assert.ok(r.refuse[0] < 0 && r.refuse[1] > 0, `refuse: ${r.refuse}`);
});

test('the boarding lock follows the state: he lives, is marked or dies, and the captain feels it', async () => {
  const r = await run(() => {
    const run = ({ medic = true, hull = 'good', gunner = true, backup = false }) => {
      const st = start({ captainKey: 'zoya', post: 'pilot' }), cap = hiredCaptain(); cap.opinion = 2;  // a pilot's game has a gunner aboard
      st.crew = st.crew.filter(id => { const c = person(id); return (c.role !== 'medic' || medic) && (c.role !== 'gunner' || gunner); });
      st.armor = hull === 'good' ? ship().armor : Math.floor(ship().armor * 0.5);
      const text = CAST.ansel.scenes.pivot.choices[backup ? 1 : 0].run(), m = (st.memorial || [])[0];
      return { text: typeof text === 'string' && text.length > 40, dead: castDead('ansel'), marks: (castRec('ansel').marks || []).length, mood: moodLow(cap), opinion: cap.opinion, cause: m ? m.cause : null };
    };
    return { four: run({ backup: true }), three: run({}), two: run({ hull: 'low' }), one: run({ hull: 'low', gunner: false }), none: run({ medic: false, hull: 'low', gunner: false }) };
  });
  for (const k of ['four', 'three']) assert.deepEqual([r[k].dead, r[k].marks, r[k].mood], [false, 0, false], `${k} points: he lives`);
  assert.deepEqual([r.two.dead, r.two.marks, r.two.mood], [false, 1, true], 'two points: marked, and the captain is low');
  for (const k of ['one', 'none']) { assert.deepEqual([r[k].dead, r[k].mood], [true, true], `${k}: he dies`); assert.match(r[k].cause, /^Lost at the boarding lock near /); assert.equal(r[k].opinion, 1); }
});

test('the used-ship offer waits for both of the captain\'s scenes and a run sailed after the secret', async () => {
  const r = await run(() => {
    const st = start({ captainKey: 'hester' }), h = st.hired, out = {};
    const yard = system().planets.find(p => p.services.includes('shipyard'));
    st.credits = USED_OFFER_AT + 1000;
    out.fresh = captainBeatsDone(h);
    h.beats = 1; out.oneScene = captainBeatsDone(h);
    h.beats = 2; h.runsDone = 5; h.beatRun = 5; out.sameRun = captainBeatsDone(h);
    h.runsDone = 6; out.nextLanding = captainBeatsDone(h);
    h.beats = 1; G.dialog = null; dealCheck(yard); out.earlyOffer = !!h.deal || !!G.dialog;
    h.beats = 2; h.runsDone = 7; out.sailed = captainBeatsDone(h);
    dealCheck(yard); out.offer = !!h.deal && !!G.dialog;
    h.captainKey = null; out.noCaptain = captainBeatsDone(h);
    return out;
  });
  assert.deepEqual([r.fresh, r.oneScene, r.sameRun, r.nextLanding], [false, false, false, false]);
  assert.equal(r.earlyOffer, false, 'no offer at a yard before the secret has played');
  assert.equal(r.sailed, true); assert.equal(r.offer, true, 'a run after the secret, the offer comes');
  assert.equal(r.noCaptain, true, 'a hand with no captain entry is not held up');
});

test('a due captain scene gains weight for each draw it misses, and starts again once it plays', async () => {
  const r = await run(() => {
    const st = start({ captainKey: 'hester' }), h = st.hired, out = {};
    underway();
    const beat = () => Mods.filter('happenings', [], 'transit').find(c => String(c.make).includes('captainScene'));
    st.day = h.since + CAPTAIN_BEAT_DAYS.trouble - 1; out.notDue = beat() === undefined;
    st.day = h.since + CAPTAIN_BEAT_DAYS.trouble;
    out.weights = [beat().weight, beat().weight, beat().weight];
    out.tier = beat().tier;
    const c = beat(); c.make(); out.afterPlay = [h.beats, h.beatWait];
    st.day = h.since + CAPTAIN_BEAT_DAYS.secret; out.secretStarts = beat().weight;
    return out;
  });
  assert.equal(r.notDue, true);
  assert.deepEqual(r.weights, [2, 5, 8], 'a miss adds BEAT_RAMP to the weight');
  assert.equal(r.tier, 1);
  assert.deepEqual(r.afterPlay, [1, 0]);
  assert.equal(r.secretStarts, 2, 'the next scene starts at the ordinary weight');
});

// ---------- Cato's walk-through ----------

test('the first burn begins with Cato walking you round the ship, once, naming the whole crew', async () => {
  const r = await run(() => {
    const st = start(), h = st.hired, out = {};
    out.opening = signOnEvent().text; underway();
    const crewNames = st.crew.map(person).filter(c => c.role !== 'xo').map(c => c.first);
    out.crew = crewNames.length;
    const first = pickHappening('transit');
    out.title = first && first.title; out.walked = h.walked;
    out.walk = first ? first.choices[0].run() : '';
    out.missing = crewNames.filter(n => !out.walk.includes(n));
    out.again = pickHappening('transit') ? pickHappening('transit').title : null;
    return out;
  });
  assert.equal(r.title, 'The Round'); assert.equal(r.walked, true);
  assert.equal(r.crew, 8, 'eight crew besides Cato; the hand is the ninth'); assert.deepEqual(r.missing, [], 'every one of them is named');
  assert.match(r.walk, /You have the middle watch/); assert.match(r.walk, /these are yours/);
  assert.doesNotMatch(r.opening, /Working beside you/, 'the opening leaves the introductions to him');
  assert.notEqual(r.again, 'The Round', 'and it does not play twice');
});

test('the walk-through is not offered after the first run, or to a save that has already sailed', async () => {
  const r = await run(() => {
    const st = start(), h = st.hired;
    underway(); h.runsDone = 1;
    const a = pickHappening('transit');
    return { title: a && a.title, walked: h.walked };
  });
  assert.notEqual(r.title, 'The Round'); assert.ok(!r.walked);
});

test('"Another time" closes the walk-through at once', async () => {
  const r = await run(() => {
    start(); underway();
    const ev = pickHappening('transit');
    return { text: ev.choices[1].run(), label: ev.choices[1].label };
  });
  assert.equal(r.label, 'Another time'); assert.match(r.text, /watch bill is on the galley wall/);
});

test('the first burn has a happening more for the walk-through, and later burns do not', async () => {
  const r = await run(() => {
    start();
    const burn = () => { sail(); while (G.dialog) finishEvent(); tryBurn(); enterTransit(); const n = G.transit.times.length, total = G.transit.total; G.transit.times = []; return n - (1 + Math.floor(total / 40)); };
    const first = burn();
    hired().walked = true; G.transit = null; G.state.dest = null; G.mode = 'landed';
    return { first, spare: walkPending() };
  });
  assert.equal(r.first, 1); assert.equal(r.spare, false);
});
