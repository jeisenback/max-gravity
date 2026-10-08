'use strict';

// The authored captains (js/captains.js, js/captains/) and the first officers who are CAST entries (marked xo and fragile):
// how a hired game picks a pair, builds their people, and puts the first officer aboard.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

const helpers = () => {
  window.underway = () => { if (!sail()) throw new Error('no plan'); for (let k = 0; k < 8 && G.dialog; k++) { const d = G.dialog, ok = d.choices.map((c, i) => i).filter(i => !d.choices[i].can || d.choices[i].can()); if (ok.length) chooseEvent(ok[0]); finishEvent(); } while (G.dialog) finishEvent(); tryBurn(); enterTransit(); G.transit.times = []; };
  window.arriveFirst = (mutate) => {
    const st = G.state, h = hired();
    if (!sail()) throw new Error('no plan');
    while (G.dialog) finishEvent();
    const run = h.run;
    if (mutate) mutate(run);
    G.transit = null; G.mode = 'landed'; st.dest = null; st.systemId = run.sid; st.planet = run.planet; st.day += run.days;
    UI.notes.length = 0; G.dialog = null; G.nextEvent = null;
    Mods.emit('landed', currentPlanet());
    return { notes: UI.notes.join(' '), scene: G.dialog && G.dialog.event };
  };
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
    h.beats = 2; h.runsDone = 7; out.sailedUnseen = captainBeatsDone(h); h.flags = { ...(h.flags || {}), sawHull: true };  // the hull seen on an apron (the spine, #294)
    out.sailed = captainBeatsDone(h);
    dealCheck(yard); out.offer = !!h.deal && !!G.dialog;
    h.captainKey = null; out.noCaptain = captainBeatsDone(h);
    return out;
  });
  assert.deepEqual([r.fresh, r.oneScene, r.sameRun, r.nextLanding], [false, false, false, false]);
  assert.equal(r.earlyOffer, false, 'no offer at a yard before the secret has played');
  assert.equal(r.sailedUnseen, false, 'with Tomas aboard, the offer also waits for the hull to have been seen'); assert.equal(r.sailed, true); assert.equal(r.offer, true, 'a run after the secret, the offer comes');
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

// ---------- the first arrival ----------

test('the first arrival is the first officer settling up, with the figures and the ledger line, instead of the one-line note', async () => {
  const r = await run(() => {
    const st = start(), h = hired(), before = person(h.captain).opinion;
    const a = arriveFirst(), e = a.scene, f = h.first;
    const out = { notes: a.notes, title: e && e.title, text: e ? e.text : '', f, arrived: h.arrived, opinion: person(h.captain).opinion - before, credits: st.credits };
    out.ask = e ? e.choices[0].run() : ''; out.labels = e ? e.choices.map(c => c.label) : [];
    return out;
  }, undefined);
  assert.equal(r.title, 'Settling Up'); assert.doesNotMatch(r.notes, /Your pay:/, 'the one-line note is not shown as well');
  assert.ok(r.f.profit > 0 && r.f.wage > 0, 'the figures are kept');
  for (const x of [r.f.revenue, r.f.cost, r.f.profit, r.f.wage, r.f.share]) assert.ok(r.text.includes(Math.round(x).toLocaleString('en-US')), `the page shows ${x}`);
  assert.match(r.text, /Forecast, [\d,]+\./); assert.match(r.text, /there is a line in Hester's hand with your name on it/);
  assert.match(r.text, /Missions page/); assert.match(r.text, /The bar/);
  assert.doesNotMatch(r.text, /undefined|NaN/); assert.equal(r.arrived, true); assert.equal(r.opinion, 1);
  assert.deepEqual(r.labels, ['Ask how long a ship takes', 'Go ashore']); assert.match(r.ask, /A season/);
  assert.doesNotMatch(r.text + r.ask, /\b(three|four|five|six|ten|twenty) runs\b|\d+ runs/, 'no count of runs');
});

test('a run that lost money leaves the line empty, and a second arrival is the plain note', async () => {
  const r = await run(() => {
    start();
    const a = arriveFirst(run => { run.cost = 1e9; });
    const out = { text: a.scene ? a.scene.text : '' };
    G.dialog = null; G.mode = 'landed'; hired().plan = null;
    const b = arriveFirst();
    out.second = b; out.runs = runTotals(hired()).runs;
    return out;
  });
  assert.match(r.text, /Loss [\d,]+\./); assert.match(r.text, /your line is empty/);
  assert.equal(r.second.scene && r.second.scene.title === 'Settling Up', false, 'it does not play twice');
  assert.match(r.second.notes, /Your pay:/, 'later arrivals keep the one-line note');
});

test('a save with runs behind it never gets the first arrival scene', async () => {
  const r = await run(() => {
    const h = (start(), hired());
    h.runsDone = 1;
    const a = arriveFirst();
    return { first: h.first || null, scene: a.scene && a.scene.title, notes: a.notes };
  });
  assert.equal(r.first, null); assert.notEqual(r.scene, 'Settling Up'); assert.match(r.notes, /Your pay:/);
});

test('every first officer settles up in their own words', async () => {
  const r = await run(() => {
    
    const out = {};
    for (const key of ['hester', 'dov', 'imre', 'zoya']) {
      start({ captainKey: key });
      const a = arriveFirst();
      out[key] = a.scene ? { title: a.scene.title, text: a.scene.text, xo: hiredXo().first, pace: a.scene.choices[0].run() } : null;
    }
    return out;
  });
  const names = { hester: 'Cato', dov: 'Ilsa', imre: 'Pilar', zoya: 'Ansel' };
  for (const [key, xo] of Object.entries(names)) {
    assert.ok(r[key], `${key}: the scene plays`); assert.equal(r[key].title, 'Settling Up'); assert.equal(r[key].xo, xo);
    assert.ok(r[key].text.includes(xo), `${key}: ${xo} speaks`); assert.doesNotMatch(r[key].text + r[key].pace, /undefined|NaN|\{cap\}|\p{Extended_Pictographic}/u);
  }
  assert.equal(new Set(Object.values(r).map(x => x.text.split('</p><p>')[0])).size, 4, 'four different openings');
});

test('the first arrival comes before a job waiting at the port', async () => {
  const r = await run(() => {
    const st = start(), h = hired();
    const plan = currentPlan(), o = awayOffer();
    Object.assign(o, { planet: plan.planet, sid: plan.sid, until: st.day + 50 }); o.ctx.dest = plan.planet;
    h.away = [o];
    const a = arriveFirst();
    return { first: a.scene && a.scene.title, queued: G.nextEvent && G.nextEvent.title };
  });
  assert.equal(r.first, 'Settling Up'); assert.ok(r.queued, 'the job follows it');
});

// ---------- opinion notes at the cutoffs (#281) ----------

test('a result that carries the captain, the first officer or a main character across a cutoff says where they stand now', async () => {
  const r = await run(() => {
    const st = start(), cap = person(hired().captain), xo = hiredXo(), other = st.crew.map(person).find(c => c && !c.cast && c.role !== 'xo'), ines = person('c:ines');
    const line = (p, from, to) => { p.opinion = to; const box = document.createElement('div'); box.innerHTML = shiftLines([{ p, n: to - from }]); return box.textContent; };
    return {
      up: [[0, 1], [1, 2], [2, 3], [0, 3], [0, 2]].map(([a, b]) => line(cap, a, b)),
      down: [[0, -2], [-2, -3], [0, -3], [-1, -2]].map(([a, b]) => line(cap, a, b)),
      inside: [[3, 4], [-2, -1], [0, -1], [4, 5]].map(([a, b]) => line(cap, a, b)),
      xo: line(xo, 1, 2), name: xo.first, cap: cap.first,
      other: line(other, 1, 3),
      ines: [[0, -2], [-2, -3], [-3, -4]].map(([a, b]) => line(ines, a, b)), inesLoyal: (ines.loyal = true, line(ines, -2, -3)), capDown: line(cap, -2, -3),
    };
  });
  const [c1, c2, c3, c03, c02] = r.up, [d2, d3, d03, d12] = r.down;
  assert.match(c1, /thinks better of you: easy with you now\./); assert.match(c2, /: friendly now\./); assert.match(c3, /: trusts you now\./);
  assert.match(c03, /thinks much better of you: trusts you now\./, 'the highest cutoff crossed'); assert.match(c02, /: friendly now\./);
  assert.match(d2, /thinks less of you: wary of you now\./); assert.match(d3, /: holds it against you now\./); assert.match(d03, /thinks much less of you: holds it against you now\./); assert.match(d12, /: wary of you now\./);
  for (const t of r.inside) assert.doesNotMatch(t, /:/, `inside a band: ${t}`);
  assert.match(r.xo, new RegExp(`${r.name} thinks better of you: friendly now\\.`)); assert.doesNotMatch(r.other, /:/, 'other crew keep the plain line');
  assert.match(r.ines[0], /Ines thinks less of you: wary of you now\./); assert.match(r.ines[1], /: holds it against you now, and is close to leaving\./);
  assert.doesNotMatch(r.ines[2], /close to leaving/, 'at the walk-off itself the warning is past'); assert.match(r.inesLoyal, /: holds it against you now\./, 'a loyal main character does not leave');
  assert.match(r.capDown, /: holds it against you now\./); assert.doesNotMatch(r.capDown, /leaving/, 'the captain is not crew');
});

// ---------- opinion-gated choices (#282) ----------

test('a choice that needs someone\'s regard is shown shut, with what it needs, until they stand there', async () => {
  const r = await run(() => {
    const st = start(), cap = person(hired().captain), xo = hiredXo(), cast = castAboard().find(p => p.cast !== xo.cast);
    const probe = (who, p, min) => {
      p.opinion = min - 1;
      openEvent({ title: 'Probe', personal: true, text: 'x', choices: [{ label: 'Plain', run: () => 'a' }, { label: 'Gated', opinion: { who, min }, run: () => 'b' }] });
      const shut = G.dialog.choices[1], below = { can: shut.can(), label: shut.label, count: G.dialog.choices.length };
      G.dialog = null; if (G.transit) G.transit.event = null;
      p.opinion = min;
      openEvent({ title: 'Probe', personal: true, text: 'x', choices: [{ label: 'Gated', opinion: { who, min }, run: () => 'b' }] });
      const open = { can: G.dialog.choices[0].can(), label: G.dialog.choices[0].label };
      G.dialog = null;
      return { below, open };
    };
    return {
      cap: probe('captain', cap, OPINION.FRIEND), xo: probe('xo', xo, OPINION.TRUSTED), cast: probe(cast.cast, cast, OPINION.CLOSE),
      names: [cap.first, xo.first, cast.first],
    };
  });
  const [c, x, k] = r.names;
  assert.deepEqual([r.cap.below.can, r.cap.open.can], [false, true]); assert.ok(r.cap.below.label.includes(`needs ${c}'s friendship`)); assert.equal(r.cap.open.label, 'Gated', 'no reason once it is open');
  assert.deepEqual([r.xo.below.can, r.xo.open.can], [false, true]); assert.ok(r.xo.below.label.includes(`needs ${x}'s trust`));
  assert.deepEqual([r.cast.below.can, r.cast.open.can], [false, true]); assert.ok(r.cast.below.label.includes(`needs ${k} to listen`));
  assert.equal(r.cap.below.count, 2, 'shut, never hidden');
});

test('the hot-burn order has a choice that needs the captain to listen, and the pitch for work elsewhere shows its friendly argument shut', async () => {
  const r = await run(() => {
    const st = start(), cap = person(hired().captain), out = {};
    const gated = () => {
      G.dialog = null; if (G.transit) G.transit.event = null;
      openEvent(HAND_EVENTS.find(x => x.id === 'cap-order').make(handContext()));
      const c = G.dialog.choices.find(x => /Ninety/.test(x.label));
      return c && { can: c.can(), label: c.label, index: G.dialog.choices.indexOf(c) };
    };
    cap.opinion = captainHears() - 1; out.below = gated();
    cap.opinion = captainHears(); out.above = gated();
    const before = cap.opinion; out.result = chooseEvent(out.above.index); out.liked = cap.opinion - before;
    // work elsewhere
    G.dialog = null; if (G.transit) G.transit.event = null;
    const o = awayOffer(); hired().away = [o];
    cap.opinion = OPINION.FRIEND - 1; openEvent(pitchScene(o));
    const owed = () => G.dialog.choices.find(c => /Call in what the captain owes you/.test(c.label));
    out.owedShut = owed() && { can: owed().can(), label: owed().label };
    G.dialog = null; cap.opinion = OPINION.FRIEND; openEvent(pitchScene(o));
    out.owedOpen = owed() && owed().can();
    return out;
  });
  assert.ok(r.below && r.below.can === false && /needs .* to listen/.test(r.below.label), 'shut below, with the reason');
  assert.ok(r.above && r.above.can === true && !/needs/.test(r.above.label), 'open at the captain\'s own cutoff');
  assert.match(r.result, /The window is made at ninety/); assert.equal(r.liked, 2);
  assert.ok(r.owedShut && r.owedShut.can === false && /needs .*'s friendship/.test(r.owedShut.label), 'no longer hidden');
  assert.equal(r.owedOpen, true);
});

// ---------- the first officer's confidence (#283) ----------

test('Cato\'s "What Cato Knows" opens at friendly or better, and below it he keeps it to himself', async () => {
  const r = await run(() => {
    start();
    const play = opinion => { castPerson('cato').opinion = opinion; castRec('cato').flags = {}; const sc = CAST.cato.scenes.late, e = castScene('cato', sc); openEvent(e); const c = G.dialog.choices.map(x => x.label); G.dialog = null; if (G.transit) G.transit.event = null; return { text: e.text, labels: c, e }; };
    const closed = play(OPINION.FRIEND - 1), open = play(OPINION.FRIEND);
    const result = closed.e.choices[0].run();
    const out = { closed: closed.labels, open: open.labels, closedText: closed.text, openText: open.text, closedTold: !!castRec('cato').flags.told, result };
    castPerson('cato').opinion = OPINION.FRIEND; castRec('cato').flags = {};
    open.e.choices[0].run(); out.openTold = !!castRec('cato').flags.told;
    return out;
  });
  assert.deepEqual(r.closed, ['Say it can wait']); assert.match(r.closedText, /I have not known you long enough/); assert.equal(r.closedTold, false, 'the favour is not asked');
  assert.deepEqual(r.open, ['Ask him to tell you if it goes badly', 'Tell him it is not yours to carry']); assert.match(r.openText, /I have known about the bank since the spring/);
  assert.equal(r.openTold, true); assert.match(r.result, /Thank you for not asking/);
});

test('the other first officers\' scenes are not gated yet, and an opinion at friendly plays the open reading in the same slot', async () => {
  const r = await run(() => {
    start({ captainKey: 'dov' });
    castPerson('ilsa').opinion = -1;
    const sc = CAST.ilsa.scenes.late, e = castScene('ilsa', sc);
    return { same: e.title === sc.title, closed: !!sc.closed };
  });
  assert.equal(r.same, true); assert.equal(r.closed, false);
});

// ---------- what the hand lived through, for the goodbye and the look back (#275) ----------

test('the ice run, an injury and a raid each set their flag when they happen, and a bad ice run and a clean one replace each other', async () => {
  const r = await run(() => {
    start(); const h = hired(), out = { start: { ...(h.flags || {}) } };
    iceHome(0); out.mid = { ...(h.flags || {}) };
    iceHome(3); out.clean = { iceClean: !!h.flags.iceClean, iceBad: !!h.flags.iceBad };
    iceHome(-2); out.bad = { iceClean: !!h.flags.iceClean, iceBad: !!h.flags.iceBad };
    out.beforeHurt = !!h.flags.hurt; hurtHand({}); out.hurt = !!h.flags.hurt;
    out.beforeRaid = !!h.flags.raided; assaultStart({ shipId: 'raider' }); out.raided = !!h.flags.raided;
    return out;
  });
  assert.deepEqual(r.start, {}); assert.deepEqual(r.mid, {}, 'a middling ice run records nothing');
  assert.deepEqual(r.clean, { iceClean: true, iceBad: false }); assert.deepEqual(r.bad, { iceClean: false, iceBad: true });
  assert.deepEqual([r.beforeHurt, r.hurt, r.beforeRaid, r.raided], [false, true, false, true]);
});

test('a raid that is outrun is not fought, and a raid that is fought is kept', async () => {
  const r = await run(() => {
    start(); const h = hired(); hired().raidTold = true;
    const rolls = [0]; const real = Math.random; Math.random = () => rolls.length ? rolls.shift() : 0.5;
    try { startRaid({ kind: 'pirate' }, true); } finally { Math.random = real; }
    const outrun = !!(h.flags || {}).raided;
    startRaid({ kind: 'pirate' }, false);
    return { outrun, fought: !!h.flags.raided };
  });
  assert.equal(r.outrun, false); assert.equal(r.fought, true);
});

test('the goodbye shows at most two of what happened, by priority, in one paragraph, and the look back names them all', async () => {
  const r = await run(() => {
    start(); const h = hired(), out = {};
    const text = flags => { h.flags = { ...flags }; return captainGoodbye().text; };
    out.none = text({}); out.all = text({ iceBad: true, hurt: true, raided: true }); out.low = text({ hurt: true, raided: true }); out.one = text({ iceClean: true });
    h.flags = { iceBad: true, hurt: true, raided: true }; out.recap = chapterRecap().text;
    h.flags = {}; out.recapNone = chapterRecap().text;
    return out;
  });
  const bad = 'The ice run is in the book with a line struck through', hurt = 'Your name is in the medical log, with a date.', raid = 'The raid is in the plot record';
  assert.ok(!r.none.includes('ice run') && !r.none.includes('medical log') && !r.none.includes('plot record'), 'nothing true, nothing added');
  assert.ok(r.all.includes(bad) && r.all.includes(hurt) && !r.all.includes(raid), 'two of three, by priority');
  assert.ok(r.all.indexOf(bad) < r.all.indexOf(hurt) && !r.all.slice(r.all.indexOf(bad), r.all.indexOf(hurt)).includes('</p>'), 'in one paragraph');
  assert.ok(r.low.includes(hurt) && r.low.includes(raid)); assert.ok(r.one.includes('as a clean haul'));
  assert.ok(r.recap.includes('The ice run went badly.') && r.recap.includes('You were hurt on duty.') && r.recap.includes('You fought a raid.'));
  assert.doesNotMatch(r.recapNone, /ice run|hurt on duty|fought a raid/);
});

test('the first arrival shows the hall\'s cut as a ledger line, and the goodbye and the look back read a cleared bond', async () => {
  const r = await run(() => {
    start(); const h = hired();
    const a = arriveFirst(), text = a.scene.text, f = h.first;
    h.flags = { debtCleared: true };
    return { text, hall: f.hall, owed: f.owed, wage: f.wage, share: f.share, debt: h.debt, goodbye: captainGoodbye().text, recap: chapterRecap().text };
  }, { debt: true });
  assert.equal(r.hall, Math.round((r.wage + r.share) * 0.3)); assert.equal(r.owed, 3000 - r.hall); assert.equal(r.debt, r.owed);
  assert.ok(r.text.includes(`Hall bond, 30 percent of your pay: ${r.hall.toLocaleString('en-US')}. Still owed: ${r.owed.toLocaleString('en-US')}.`));
  assert.ok(r.goodbye.includes('The hall\'s bond is struck off the book, with the day it was paid.')); assert.ok(r.recap.includes('You paid off the hiring-hall bond.'));
});

// ---------- risk and reward by the captain's nerve (#274) ----------

test('a bold outcome moves the captain\'s opinion one more point by their nerve: a success for the bold, a failure for the cautious', async () => {
  const r = await run(() => {
    const out = {};
    for (const key of ['hester', 'dov', 'imre', 'zoya']) {
      start({ captainKey: key }); const cap = person(hired().captain), nerve = captainEntry().captain.nerve;
      const delta = won => { cap.opinion = 0; boldWithCaptain(won); return cap.opinion; };
      out[key] = { nerve, won: delta(true), lost: delta(false) };
    }
    return out;
  });
  for (const [key, x] of Object.entries(r)) {
    assert.equal(x.won, x.nerve >= 4 ? 1 : 0, `${key} (nerve ${x.nerve}): a bold success`);
    assert.equal(x.lost, x.nerve <= 2 ? -1 : 0, `${key} (nerve ${x.nerve}): a bold failure`);
  }
  assert.deepEqual([r.hester.won, r.hester.lost, r.zoya.won, r.zoya.lost], [0, -1, 1, 0], 'the same choice has a different best answer under each');
});

test('only the bold options carry it: the fast, big and hard ice options, the raid\'s turn and return fire, and a work event\'s quick option', async () => {
  const r = await run(() => {
    const bold = [...RAID_CLOSING, ...RAID_EXCHANGE].filter(c => c.bold).map(c => c.id);
    const ice = ICE_STAGES.map(s => s.general.map(c => !!c.bold));
    start({ captainKey: 'zoya' }); const cap = person(hired().captain);
    const play = (choice, roll) => { cap.opinion = 0; const real = Math.random; Math.random = () => roll; try { choice.run(); } finally { Math.random = real; } return cap.opinion; };
    const ev = workEvent(WORK_EVENTS.find(w => w.post === hired().post));
    return { bold, ice, quickWon: play(ev.choices[1], 0.001), careful: play(ev.choices[0], 0.001) };
  });
  assert.deepEqual(r.bold.sort(), ['fire', 'turn']); assert.deepEqual(r.ice, [[false, true, false], [false, true, false], [false, true, false]]);
  assert.equal(r.quickWon, 1, 'a bold success with a nerve 5 captain'); assert.equal(r.careful, 0, 'the careful option moves nothing');
});

// ---------- the spine: why does every owner of the Ore Runner sell her? (#294) ----------

test('the hull is seen once, painted over, from the second arrival on, and only with Tomas aboard', async () => {
  const r = await run(() => {
    start(); const h = hired(), out = {};
    const land = () => { UI.notes.length = 0; Mods.emit('landed', currentPlanet()); return UI.notes.join(' '); };
    h.runsDone = 1; out.early = land(); out.earlyFlag = !!(h.flags || {}).sawHull;
    h.runsDone = 2; out.first = land(); out.flag = !!h.flags.sawHull;
    out.again = land();
    start(); const g = hired(); g.runsDone = 2;
    G.state.crew = G.state.crew.filter(id => !(person(id) || {}).cast || person(id).cast !== 'tomas');
    out.noTomas = land(); out.noTomasFlag = !!(g.flags || {}).sawHull;
    return out;
  });
  assert.doesNotMatch(r.early, /painted over/); assert.equal(r.earlyFlag, false);
  assert.match(r.first, /Ore Runner sits on her struts with her name painted over in grey\. Tomas stops at the foot of the ramp/); assert.equal(r.flag, true);
  assert.doesNotMatch(r.again, /painted over/, 'once'); assert.doesNotMatch(r.noTomas, /painted over/); assert.equal(r.noTomasFlag, false);
});

test('the captain\'s secret tells the bank holds the Ore Runner too, in both readings, and sets the fact', async () => {
  const r = await run(() => {
    start(); const h = hired(), cap = person(h.captain), out = {};
    cap.opinion = SECRET_TRUST; const confide = captainScene('secret'); out.confide = confide.text; out.confideFlag = !!(h.flags || {}).ownersDebt;
    h.flags = {}; cap.opinion = SECRET_TRUST - 1; const found = captainScene('secret'); out.found = found.text; out.foundFlag = !!h.flags.ownersDebt;
    return out;
  });
  assert.match(r.confide, /There is an Ore Runner on the yard list at the next port with her name painted over\. Same bank\. Three owners, and each of them missed one payment\. One\./);
  assert.match(r.found, /schedule of ships the bank has taken since the spring, and the Ore Runner is the third line/);
  assert.equal(r.confideFlag, true); assert.equal(r.foundFlag, true);
});

test('Tomas gives the reason when she is offered, which waits for the hull to have been seen, and says whether the hand still owes the hall', async () => {
  const r = await run(() => {
    start(); const h = hired(), st = G.state, out = {};
    h.beats = CAPTAIN_BEATS.length; h.beatRun = 0; h.runsDone = 5; h.flags = {};
    out.waits = captainBeatsDone(h); h.flags.sawHull = true; out.opens = captainBeatsDone(h);
    h.debt = 1500; const owed = dealScene(currentPlanet()); out.owed = owed.text; out.tomasFlag = !!h.flags.tomasWaited;
    h.debt = 0; out.clear = dealScene(currentPlanet()).text;
    // no Tomas aboard: the broker's offer, with nothing to wait for
    G.state.crew = G.state.crew.filter(id => (person(id) || {}).cast !== 'tomas'); h.flags = {}; out.broker = captainBeatsDone(h);
    return out;
  }, { debt: true });
  assert.equal(r.waits, false, 'the offer waits for the hull to have been seen'); assert.equal(r.opens, true); assert.equal(r.broker, true, 'without Tomas, nothing to wait for');
  assert.match(r.owed, /Three owners, and every one of them sold her, and none for bad luck\. Each ran one payment short\./);
  assert.match(r.owed, /You owe the hall 1,500 still\. I looked at its book\. Clear it, and you will be the first owner she has had who owes nobody\./);
  assert.match(r.clear, /You owe nobody now\. I looked at the hall's book\. She has only ever had owners who owed everybody\./); assert.equal(r.tomasFlag, true);
});
