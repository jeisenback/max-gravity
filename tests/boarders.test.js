'use strict';

// Repelling boarders: when a boarding run lands in the ship duel, a hired hand fights them at the lock, the corridor and
// the bridge, with casualties.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

const helpers = () => {
  window.DUEL_SPEC = { kind: 'hunter', person: { first: 'Ana', last: 'Voss' } };  // a pirate or a patrol is a raid in beats (engagements.js); the card duel is for the rest
  window.fight = (post = 'gunner') => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post, captainKey: 'hester' }); while (G.dialog) finishEvent();
    const st = G.state; st.story.next = 1e9; st.day += 30;
    uatBurn('Ceres Station', 'pallas'); G.transit.times = []; G.transit.event = null; G.dialog = null;
    startDuel(DUEL_SPEC, false); G.nextEvent = null;
    return st;
  };
  // Math.random answers from a list, then 0.99: 0.01 passes a chance, 0.99 fails it, and 0 picks the first of a list.
  window.rolls = list => { const l = [...list]; Math.random = () => (l.length ? l.shift() : 0.99); };
  window.generated = n => { const st = G.state; st.crew = []; for (let i = 0; i < n; i++) { const p = makePerson('earth'); p.role = ['pilot', 'engineer', 'cook'][i % 3]; p.skill = 1; registerPerson(p); st.crew.push(p.id); } return st.crew.map(person); };
};

test('a tactic says the odds it wins the exchange, the same odds the fight rolls: their lean and counter, the triangle, the ship\'s layout', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    __seed(7);
    fight(); G.duel = null;
    const make = grade => { const s = repelStart({ foe: makeEnemy({ kind: 'pirate' }), foeHp: 0, init: 'foe' }, 'full'); s.grade = grade; s.pos = 1; return s; };
    const shownOn = s => Object.fromEntries(repelScene(s).choices.slice(0, 3).map((c, i) => [['hold', 'rush', 'flank'][i], +c.label.match(/\[(\d+)%/)[1]]));
    const realCasualty = repelCasualty; repelCasualty = () => '';  // nobody is hurt in the count, so the standing holds
    const out = { size: SHIPS[G.state.shipId].size };
    for (const grade of [0, 2]) {
      const s = make(grade), played = {}, n = 2000;
      for (const k of ['hold', 'rush', 'flank']) {
        let wins = 0;
        for (let i = 0; i < n; i++) { const t = { ...s, hurt: new Set(), dead: [], marked: [], lines: [] }; repelStep(t, k); if (t.pos < s.pos) wins++; }
        played[k] = Math.round(100 * wins / n);
      }
      G.nextEvent = null;
      out[grade] = { shown: shownOn(s), played, standing: repelStanding(s), boarders: s.boarders };
    }
    const few = make(0); few.boarders = 10;  // outnumbered: the same tactic as theirs loses, so holding wins only when they go round (their lean, 0.32)
    out.outnumbered = shownOn(few).hold;
    repelCasualty = realCasualty;
    return out;
  });
  assert.ok(r.size >= 16, 'an Ice Hauler is long: going round is helped and a rush is not');
  for (const grade of [0, 2]) {
    const { shown, played } = r[grade];
    for (const k of ['hold', 'rush', 'flank']) assert.ok(Math.abs(shown[k] - played[k]) <= 4, `grade ${grade}, ${k}: shown ${shown[k]}, played ${played[k]} of 2000`);
  }
  assert.equal(new Set(Object.values(r[0].shown)).size, 3, `the three tactics say different odds: ${JSON.stringify(r[0].shown)}`);
  for (const k of ['hold', 'rush', 'flank']) assert.ok(r[2].shown[k] < r[0].shown[k], `${k}: a veteran crew counters, and the odds fall`);
  assert.equal(r.outnumbered, 32);
  await done();
});

test('a boarding run that lands starts the fight at the lock or the corridor, and a stopped one does not', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const st = fight(), out = {}, d = G.duel;
    const before = st.armor; d.init = 'foe'; duelExchange('burn', 'board');  // an evasive burn lets boarders across: full
    out.full = G.nextEvent.title; out.armor = st.armor === before;
    G.duel = null; startDuel(DUEL_SPEC, false); G.nextEvent = null; G.duel.init = 'foe'; duelExchange('pdc', 'board');  // a PDC screen halves it: they are one short
    out.half = G.nextEvent.title;
    G.duel = null; startDuel(DUEL_SPEC, false); G.nextEvent = null; G.duel.init = 'foe'; duelExchange('locks', 'board');  // crew at the locks stop it
    out.stopped = G.nextEvent && G.nextEvent.title;
    return out;
  });
  assert.equal(r.full, 'The Corridor'); assert.equal(r.half, 'The Lock'); assert.ok(r.armor, 'no hull damage from the run itself');
  assert.ok(!['The Lock', 'The Corridor', 'The Bridge'].includes(r.stopped), 'a stopped run is the duel as before');
  await done();
});

test('winning twice repels them, and the duel goes on with the initiative yours', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const st = fight(), d = G.duel, cap = person(hired().captain), op = cap.opinion;
    const s = repelStart(d, 'full');
    rolls([0.01, 0.99, 0.01, 0.99]);  // the post action works, nobody is hurt; twice
    const first = repelStep(s, 'post'), mid = G.nextEvent.title;
    const second = repelStep(s, 'post');
    return { mid, repelled: /go back through the lock/.test(second), init: d.init, next: G.nextEvent && G.nextEvent.title, opinion: cap.opinion - op, hurt: s.hurt.size };
  });
  assert.equal(r.mid, 'The Lock'); assert.ok(r.repelled); assert.equal(r.init, 'me'); assert.equal(r.opinion, 1); assert.equal(r.hurt, 0);
  assert.ok(r.next && !r.next.startsWith('The '), `back to the duel (${r.next})`);
  await done();
});

test('losing twice gives them the bridge: a third of the ship\'s fund goes, and they cut loose', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const st = fight(), d = G.duel, h = hired(), cap = person(h.captain), op = cap.opinion, fund = h.fund, armor = st.armor;
    const s = repelStart(d, 'full');
    rolls([0.99, 0.99, 0.99, 0.99]);  // the post action fails, nobody is hurt; twice
    repelStep(s, 'post'); const text = repelStep(s, 'post');
    return { taken: /They're on the bridge/.test(text), fund: h.fund / fund, opinion: cap.opinion - op, duel: G.duel, next: G.nextEvent, armor: st.armor < armor };
  });
  assert.ok(r.taken); assert.ok(Math.abs(r.fund - 0.7) < 0.02); assert.equal(r.opinion, -1); assert.equal(r.duel, null); assert.equal(r.next, null); assert.ok(r.armor);
  await done();
});

test('a crew member hurt twice in one fight is dead, and the berth is filled at the next port', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const st = fight(), d = G.duel, crew = generated(3), first = crew[0], n = st.crew.length;
    const s = repelStart(d, 'full');
    rolls([0.99, 0.01, 0, 0.99, 0.99, 0.01, 0]);  // fail, someone is hurt, the first of the pool, and not killed outright; again
    repelStep(s, 'post'); const afterOne = { injured: !!(st.injured || {})[first.id], here: st.crew.includes(first.id) };
    repelStep(s, 'post');
    const out = { afterOne, dead: !st.crew.includes(first.id), flagged: first.dead === true, fallen: (st.fallen || []).length, vacancy: (st.vacancies || []).length, size: st.crew.length === n - 1 };
    __seed(1); Mods.emit('landed', currentPlanet());  // a constant random hangs the generator
    out.filled = st.crew.length === n && (st.vacancies || []).length === 0; out.note = UI.notes.some(t => /signs on/.test(t));
    return out;
  });
  assert.deepEqual(r.afterOne, { injured: true, here: true }, 'hurt the first time');
  assert.ok(r.dead && r.flagged && r.size && r.fallen === 1 && r.vacancy === 1);
  assert.ok(r.filled && r.note, 'someone from the dock takes the berth');
  await done();
});

test('a main character hurt twice dies in the narrow build, where there is no floor, and is marked in the full build, where there is', async () => {
  const strike = scope => async () => {
    const { ev, done } = await open({ scope });
    await ev(helpers);
    const r = await ev(() => {
      const st = fight(), d = G.duel, ines = castPerson('ines');
      st.crew = [ines.id];
      const s = repelStart(d, 'full');
      rolls([0.99, 0.01, 0, 0.99, 0.99, 0.01, 0]);
      const first = repelStep(s, 'post'), second = repelStep(s, 'post');
      return { here: st.crew.includes(ines.id), dead: castDead('ines'), marks: marksOf(ines).length, first, second, floor: castFloor() };
    });
    await done();
    return r;
  };
  const narrow = await strike('earth-hired')(), full = await strike('full')();
  assert.equal(narrow.floor, 0); assert.ok(narrow.dead && !narrow.here, 'dead in the narrow build'); assert.equal(narrow.marks, 0);
  assert.ok(/Another hit like that could kill Ines\./.test(narrow.first), `the first hurt warns: ${narrow.first}`);
  assert.equal(full.floor, 2); assert.ok(full.here && !full.dead && full.marks === 1, 'marked, not killed, where the floor holds');
});

test('a named person already marked who is hit again dies, and a hurt crew member in an accident carries the warning', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const st = fight(), tomas = castPerson('tomas'), ines = castPerson('ines'), out = {};
    st.crew = [ines.id, tomas.id];
    castFate('tomas', 'mark', 'Hurt.', 'Marked once.');           // marked: the step before
    out.markedAlive = !castDead('tomas');
    G.state.crew = [tomas.id]; hurtCrew();                         // an ordinary hit on a marked person
    out.deadAfter = castDead('tomas');
    G.state.crew = [ines.id]; const msgs = []; const real = msg; window.msg = t => { msgs.push(t); }; try { hurtCrew(); } finally { window.msg = real; }
    out.warned = msgs.some(t => /Ines.* is hurt\./.test(t) && /Another hit like that could kill Ines\./.test(t));
    out.crewWarn = hurtWarning(person(st.crew[0])) !== '' && hurtWarning({ first: 'Sam' }) === '';  // a generated crew member gets none
    return out;
  });
  assert.ok(r.markedAlive); assert.ok(r.deadAfter, 'marked, then hit again: dead'); assert.ok(r.warned, 'a hurt named person is warned'); assert.ok(r.crewWarn);
  await done();
});

test('a hurt hand works a level lower until it passes, or a medic treats them', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const st = fight(), d = G.duel, h = hired(); h.skill.gunner = 35;
    generated(0); const medic = makePerson('earth'); medic.role = 'medic'; medic.skill = 1; registerPerson(medic);  // made before the rolls: a constant random hangs makePerson
    const level = skillLevel('gunner'), s = repelStart(d, 'full');
    rolls([0.99, 0.01, 0]);  // fail, someone is hurt, and with no crew that is you
    const text = repelStep(s, 'post');
    const out = { level, hurtLevel: skillLevel('gunner'), hurt: handHurt(), text: /You are hurt/.test(text), page: onTheShipCard().includes('hurt,') };
    st.day += 13; out.later = [handHurt(), skillLevel('gunner')];
    h.hurtUntil = st.day + 5; st.crew.push(medic.id);
    __seed(1); Mods.emit('landed', currentPlanet()); out.treated = !h.hurtUntil;
    return out;
  });
  assert.equal(r.hurtLevel, r.level - 1); assert.ok(r.hurt && r.text && r.page);
  assert.deepEqual(r.later, [false, r.level]); assert.ok(r.treated);
  await done();
});

test('a crew member who cannot stand you keeps to their berth, and the fight is a person shorter', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const st = fight(), [a, b, c] = generated(3), d = { foe: makeEnemy(DUEL_SPEC), foeHp: 4, init: 'foe' };
    for (const x of [a, b, c]) x.opinion = 0;
    const all = repelStart(d, 'full');
    c.opinion = OPINION.ENEMY;
    const s = repelStart(d, 'full');
    return { all: all.base, held: s.base, line: s.held, text: repelScene(s).text, none: all.held.length };
  });
  assert.equal(r.held, r.all - 1); assert.equal(r.none, 0); assert.equal(r.line.length, 1); assert.match(r.line[0], /won't fight for you/); assert.match(r.text, /won't fight for you/);
  await done();
});

test('of two crew at each other\'s throats, the one who thinks less of you will not stand in the same section', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const st = fight(), [a, b, c] = generated(3), d = { foe: makeEnemy(DUEL_SPEC), foeHp: 4, init: 'foe' }, f = x => ({ id: x.id, p: x });
    for (const x of [a, b, c]) x.opinion = 0;
    const before = repelStart(d, 'full').base;
    st.bonds = {}; addBond(f(a), f(b), -6); a.opinion = 1; b.opinion = -1;
    const s = repelStart(d, 'full'), asd = assaultStart(d.foe);
    st.bonds = {}; addBond(f(a), f(b), -3);  // not that bad
    const mild = repelStart(d, 'full');
    return { before, base: s.base, line: s.held, assault: asd.base, mild: mild.base, who: b.first };
  });
  assert.equal(r.base, r.before - 1); assert.equal(r.assault, r.before - 1); assert.equal(r.line.length, 1); assert.ok(r.line[0].startsWith(r.who), 'the one who likes you less holds back'); assert.equal(r.mild, r.before);
  await done();
});

test('a friend takes the first hit meant for you, once in a fight, and the rest fall on you', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const st = fight(), h = hired(), [a, b] = generated(2), d = { foe: makeEnemy(DUEL_SPEC), foeHp: 4, init: 'foe' };
    a.opinion = OPINION.FRIEND; b.opinion = 0; delete h.hurtUntil;
    const s = repelStart(d, 'full'), real = Math.random;
    Math.random = () => 0.999;  // the last in the list, which is you
    let first, second;
    try { first = repelCasualty(s); second = repelCasualty(s); } finally { Math.random = real; }
    return { first, second, aHurt: !!(st.injured || {})[a.id], youHurt: !!(h.hurtUntil > st.day), a: a.first };
  });
  assert.match(r.first, new RegExp(`${r.a} pulls you down behind the closer and takes it\\. ${r.a} is hurt`)); assert.ok(r.aHurt);
  assert.match(r.second, /You are hurt/); assert.ok(r.youHurt);
  await done();
});

test('a hired hand boards a ship that resists as the authored assault, and a ship that has given up needs no fight', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const st = fight(), h = hired(), out = {}, foe = G.duel.foe;
    duelDisabledEvent(foe);  // she drifts beside you
    const e = boardingEvent(foe);
    out.labels = e.choices.map(c => c.label); out.odds = /%|odds/i.test(e.text); out.counts = /of yours against/.test(e.text);
    G.nextEvent = null; e.choices[0].run();
    out.scene = G.nextEvent && G.nextEvent.title;
    // A win carries her bridge: her strongbox goes into the ship's fund.
    const a = assaultStart(foe); a.pos = -1; const fund = h.fund, rep = person(h.captain).opinion;
    out.won = repelSettle(a); out.fundUp = h.fund > fund; out.foeDead = !!foe.dead; out.liked = person(h.captain).opinion > rep;
    // A loss drives you back to your lock, and she's still drifting.
    const foe2 = { ...foe, dead: false }, b = assaultStart(foe2); b.pos = 3; const armor = st.armor;
    out.lost = repelSettle(b); out.armorDown = st.armor < armor; out.stillDrifting = !foe2.dead;
    // A trader that has given up: no fight, and no prize for a hand.
    const t = { ...foe, kind: 'trader', dead: false, disabled: true }, te = boardingEvent(t);
    out.trader = te.choices.map(c => c.label);
    return out;
  });
  assert.deepEqual(r.labels, ['Board her', 'Let her drift']); assert.ok(!r.odds, 'no odds in the prompt'); assert.ok(r.counts, 'the numbers are in the prompt');
  assert.ok(['Her Corridor'].includes(r.scene), r.scene);
  assert.match(r.won, /strongbox/); assert.ok(r.fundUp && r.foeDead && r.liked);
  assert.match(r.lost, /driven back to the lock/); assert.ok(r.armorDown && r.stillDrifting);
  assert.ok(!r.trader.some(l => /prize/i.test(l)) && r.trader.some(l => /strip the cargo/.test(l)), r.trader.join('|'));
  await done();
});

test('an owner boarding a disabled ship still rolls for it, with the odds in the prompt', async () => {
  const { ev, done } = await open({ scope: 'full' });
  const r = await ev(() => {
    G.state = newState(); G.state.credits = 99999; const was = G.player; G.player = { x: 0, y: 0, vx: 0, vy: 0 };  // the title screen goes on drawing, so nothing here puts the game into flight
    const foe = { name: 'Test', kind: 'pirate', shipId: 'freighter', armor: 10, maxArmor: 40, x: 0, y: 0, vx: 0, vy: 0, disabled: true, captain: 'Voss' };
    const e = boardingEvent(foe);
    G.player = was;
    return { labels: e.choices.map(c => c.label), odds: /%/.test(e.text) };
  });
  assert.ok(r.labels.some(l => /prize/i.test(l))); assert.ok(r.odds);
  await done();
});

// ---------- the hand can die (#357) ----------

test('the hand dies on a second hurt or a lost bridge while laid up, one in four, halved by a medic; a first hurt rolls one in twelve', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const st = fight(), h = hired(), out = {}, d = G.duel;  // a lost bridge ends the duel, so keep it
    const medic = makePerson('earth'); medic.role = 'medic'; medic.skill = 1; registerPerson(medic);  // made before the rolls: a constant random hangs makePerson
    const reset = () => { G.nextEvent = null; delete h.died; delete h.hurtUntil; };
    st.crew = st.crew.filter(id => person(id).role !== 'medic');  // the chapter's crew carries one: start without
    reset(); rolls([0.5]); const first = {}; hurtHand(first); out.first = { died: !!first.handDied, next: G.nextEvent };   // 0.5 is over one in twelve
    reset(); rolls([0.05]); const firstDies = {}; const said = hurtHand(firstDies); out.firstDies = { died: !!firstDies.handDied, title: G.nextEvent && G.nextEvent.title, how: h.died && h.died.how, said };
    reset(); st.crew.push(medic.id); rolls([0.05]); const firstMedic = {}; hurtHand(firstMedic); out.firstMedic = !firstMedic.handDied;   // 0.05 is under one in twelve, over one in twenty-four
    st.crew = st.crew.filter(id => id !== medic.id); reset(); rolls([0.5]); hurtHand({});  // hurt once, so the next is a second
    rolls([0.2]); const again = {}; hurtHand(again); out.again = { died: !!again.handDied, title: G.nextEvent && G.nextEvent.title, how: h.died && h.died.how };
    reset(); hurtHand({}); rolls([0.3]); const miss = {}; hurtHand(miss); out.miss = { died: !!miss.handDied, next: G.nextEvent };   // 0.3 is over one in four
    reset(); st.crew.push(medic.id);
    hurtHand({}); rolls([0.2]); const withMedic = {}; hurtHand(withMedic); out.medicSaves = !withMedic.handDied;   // 0.2 is under one in four, over one in eight
    reset(); hurtHand({}); rolls([0.1]); const medicDies = {}; hurtHand(medicDies); out.medicStillRolls = !!medicDies.handDied;
    st.crew = st.crew.filter(id => id !== medic.id); reset();
    // the bridge taken while laid up, and not while well
    h.hurtUntil = st.day + 5; rolls([0.01]); const s = repelStart(d, 'full'); s.pos = 3; repelSettle(s); out.bridge = { title: G.nextEvent && G.nextEvent.title, how: h.died && h.died.how };
    reset(); rolls([0.99]); const s2 = repelStart(d, 'full'); s2.pos = 3; repelSettle(s2); out.well = { next: G.nextEvent, died: !!h.died };
    return out;
  });
  assert.deepEqual([r.first.died, r.first.next], [false, null], 'a first hurt is over one in twelve');
  assert.deepEqual(r.firstDies, { died: true, title: 'The Last Run', how: 'first', said: "You're hit." }); assert.ok(r.firstMedic, 'a medic halves it');
  assert.deepEqual(r.again, { died: true, title: 'The Last Run', how: 'hurt' });
  assert.deepEqual([r.miss.died, r.miss.next], [false, null]);
  assert.ok(r.medicSaves, 'a medic halves it'); assert.ok(r.medicStillRolls);
  assert.deepEqual(r.bridge, { title: 'The Last Run', how: 'bridge' });
  assert.deepEqual([r.well.next, r.well.died], [null, false], 'a bridge taken while well does not roll');
  await done();
});

test('a pirate bridge taken can cost the captain, one in three, and the hand goes ashore keeping savings, skill and debt', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const st = fight(), h = hired(), d = G.duel, cap = person(h.captain), out = { last: cap.last };
    const reset = () => { G.nextEvent = null; delete h.captainLost; delete h.died; delete h.hurtUntil; };
    const bridge = (roll, foe) => { reset(); const was = d.foe.kind; if (foe) d.foe.kind = foe; rolls([roll]); const s = repelStart(d, 'full'); s.pos = 3; const text = repelSettle(s); d.foe.kind = was; return { text, title: G.nextEvent && G.nextEvent.title, lost: !!h.captainLost }; };
    out.hit = bridge(0.2); out.miss = bridge(0.5); out.patrol = bridge(0.2, 'patrol');
    reset(); h.hurtUntil = st.day + 5; rolls([0.01]); const s = repelStart(d, 'full'); s.pos = 3; repelSettle(s);  // the hand's roll first, and one scene only
    out.handFirst = { title: G.nextEvent && G.nextEvent.title, lost: !!h.captainLost };
    reset(); bridge(0.2);
    const e = G.nextEvent; out.text = e.text; out.choices = e.choices.map(c => c.label);
    st.credits = 777; h.debt = 1234; h.skill.gunner = 60;
    __seed(1);
    e.choices[0].run();
    out.fresh = G.state !== st; out.credits = G.state.credits; out.debt = hired().debt; out.skill = hired().skill.gunner; out.carried = G.state.carried; out.putOff = G.state.putOff || 0; out.notes = UI.notes.join(' ');
    return out;
  });
  assert.equal(r.hit.title, 'Without a Captain'); assert.ok(r.hit.lost); assert.ok(r.hit.text.includes(`Captain ${r.last} doesn't get up`));
  assert.deepEqual([r.miss.title, r.miss.lost], [null, false], 'over one in three: the captain lives');
  assert.deepEqual([r.patrol.title, r.patrol.lost], [null, false], 'a patrol surrenders the ship and kills nobody');
  assert.deepEqual(r.handFirst, { title: 'The Last Run', lost: false });
  assert.deepEqual(r.choices, ['Take the bag']); assert.ok(r.text.includes(`The articles were Captain ${r.last}'s`));
  assert.ok(r.fresh); assert.equal(r.credits, 777); assert.equal(r.debt, 1234); assert.equal(r.skill, 60);
  assert.equal(r.carried, `On the dock they say Captain ${r.last} didn't come back from the bridge.`);
  assert.equal(r.putOff, 0, 'nobody put the hand off');
  assert.match(r.notes, /didn't come back from the bridge\. You carry your savings/);
  await done();
});

test('a lock fight ends on the hand\'s death, and the ending reads the record and starts a new hand with a line on the dock', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const st = fight(), h = hired(), d = G.duel, cap = person(h.captain), out = {};
    generated(0); h.hurtUntil = st.day + 5; st.credits = 777; h.skill.gunner = 60;
    const s = repelStart(d, 'full');
    rolls([0.99, 0.01, 0, 0.01]);  // the exchange is lost, someone is hurt and with no crew it is you, and the roll is over one in four
    repelStep(s, 'post');
    const e = G.nextEvent;
    out.title = e.title; out.fight = s.handDied; out.last = cap.last; out.text = e.text; out.choices = e.choices.map(c => c.label);
    __seed(1);  // a constant random hangs the generators, so the new hand starts from the seeded one
    e.choices[0].run();
    out.fresh = G.state !== st; out.credits = G.state.credits; out.carried = G.state.carried; out.name = captain().name;
    out.skill = hired().skill.gunner; out.since = hired().since;
    return out;
  });
  assert.equal(r.title, 'The Last Run'); assert.ok(r.fight); assert.deepEqual(r.choices, ['Begin again']);
  assert.ok(r.text.includes(`Captain ${r.last} says it from the hatch`), 'what happened'); assert.ok(r.text.includes(`Captain ${r.last} writes it in the log`));
  assert.match(r.text, /days aboard/, 'the look back follows');
  assert.ok(r.fresh && r.credits !== 777 && r.credits > 0, 'a new hand with fresh savings'); assert.equal(r.carried, `On the dock they say the hand on Captain ${r.last}'s ship didn't come back.`);
  assert.equal(r.name, 'Sam Rowe');
  await done();
});

test('the lock fight offers the post\'s abilities after its own move, with the odds and what each wins on the label, and the cover ability shuts once used', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const out = {};
    for (const post of ['gunner', 'pilot', 'engineer', 'comms']) {
      fight(post); const s = repelStart(G.duel, 'full'), e = repelScene(s); out[post] = e.choices.filter(c => !c.order).slice(3).map(c => c.label); G.duel = null;
    }
    fight(); const s = repelStart(G.duel, 'full'), e = repelScene(s), foe = makeEnemy({ kind: 'pirate' });  // the foe is made before the dice are set (people are generated from them)
    out.shut0 = e.choices.filter(c => !c.order).map(c => !!c.can && !c.can()); rolls([0.01]); e.choices[5].run(); G.nextEvent = null;
    out.shut1 = repelScene(s).choices.filter(c => !c.order).map(c => !!c.can && !c.can()); out.why = repelScene(s).choices[5].why;
    out.board = e.board; out.assault = repelScene(assaultStart(foe, {})).choices.filter(c => !c.order).length;
    return out;
  });
  assert.match(r.gunner[0], /^\[Gunner\] .*\[\d+%; if it fails: a crew casualty, you may be hurt\]$/);
  assert.match(r.gunner[1], /^\[Gunner\] Pick off a runner \(one fewer of them, no ground\) \[\d+%; if it fails: a crew casualty, you may be hurt\]$/);
  assert.match(r.gunner[2], /^\[Gunner\] Covering burst \(cover here, once\) \[\d+%; if it fails: a crew casualty, you may be hurt\]$/);
  assert.deepEqual([r.pilot[1], r.engineer[2], r.comms[1]].map(l => l.replace(/ \[.*$/, '')), ['[Pilot] Cycle a hatch on them (one fewer of them, no ground)', '[Engineer] Drop the pressure door (cover here, once)', '[Comms] A false order on their band (one fewer of them, no ground)']);
  assert.ok(+r.gunner[1].match(/\[(\d+)%/)[1] < +r.gunner[2].match(/\[(\d+)%/)[1], 'the pick-off is the harder gamble: it is the one that can end the fight');
  assert.deepEqual(r.shut0, [false, false, false, false, false, false]); assert.deepEqual(r.shut1, [false, false, false, false, false, true]); assert.equal(r.why, 'Once a fight.');
  assert.match(r.board, /aria-label="The ship in three sections\. The Lock: theirs, cover 1\. The Corridor: the front, \d+ of them, cover 2\. The Bridge: yours, cover 1\./); assert.equal(r.assault, 6, 'the assault has them too');
  await done();
});

test('the steady ability thins them and holds the ground; a miss holds the ground too, but they get a shot at someone', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    fight(); const real = repelCasualty; let hits = 0; repelCasualty = () => { hits++; return 'Someone is hurt.'; };
    const s = repelStart(G.duel, 'full'); s.boarders = 4; const pos = s.pos;
    rolls([0.01]); const worked = repelStep(s, 'steady'); const w = { pos: s.pos, boarders: s.boarders, round: s.round, hits, text: worked };
    rolls([0.99, 0.01]); const missed = repelStep(s, 'steady'); const m = { pos: s.pos, boarders: s.boarders, hits, text: missed };
    repelCasualty = real; return { w, m, start: pos };
  });
  assert.equal(r.w.pos, r.start); assert.equal(r.w.boarders, 3); assert.equal(r.w.round, 1); assert.equal(r.w.hits, 0); assert.match(r.w.text, /^You wait for the one who breaks from cover/);
  assert.equal(r.m.pos, r.start, 'the ground holds'); assert.equal(r.m.boarders, 3); assert.equal(r.m.hits, 1, 'a casualty was rolled and it came'); assert.match(r.m.text, /^You wait for a runner and none runs\. .* Someone is hurt\.$/);
  await done();
});

test('the cover ability makes two points of cover where the fight is, once; a miss holds the ground and costs a shot, and the kit\'s cover adds to the section\'s', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    fight(); const real = repelCasualty; repelCasualty = () => '';
    const s = repelStart(G.duel, 'full'), out = { size: SHIPS[G.state.shipId].size };
    out.base = [...repelCover(s)]; rolls([0.01]); const text = repelStep(s, 'cover'); out.text = text; out.made = [...repelCover(s)]; out.used = s.used.cover; out.pos = s.pos; G.nextEvent = null;
    const t = repelStart(G.duel, 'full'); rolls([0.99, 0.99]); repelStep(t, 'cover'); out.missPos = t.pos; out.missUsed = t.used.cover; out.missCover = [...repelCover(t)]; G.nextEvent = null;
    hired().kit = ['valve-keys']; out.keys = [...repelCover(repelStart(G.duel, 'full'))];
    repelCasualty = real; return out;
  });
  assert.ok(r.size >= 16); assert.deepEqual(r.base, [1, 2, 1], 'the long ship has berth doors in the corridor');
  assert.deepEqual(r.made, [1, 3, 1], 'two points in the corridor, where the fight is, up to three'); assert.equal(r.used, true); assert.equal(r.pos, 1, 'the exchange stands'); assert.match(r.text, /^You lay a long burst along the wall/);
  assert.equal(r.missPos, 1, 'a miss holds the ground'); assert.equal(r.missUsed, true); assert.deepEqual(r.missCover, [1, 2, 1]);
  assert.deepEqual(r.keys, [1, 3, 1], 'the valve keys open the service crawl, a point more in the corridor');
  await done();
});

test('cover turns the chance of a casualty in the section the exchange was fought in', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    fight(); const real = repelCasualty; let hits = 0; repelCasualty = () => { hits++; return ''; };
    const out = {}, post = (pos, extra) => { const s = repelStart(G.duel, 'full'); s.pos = pos; s.grade = 0; if (extra) s.extra = extra; hits = 0; rolls([0.99, 0.40]); repelStep(s, 'post'); G.nextEvent = null; return hits; };
    out.lock = post(0); out.corridor = post(1); out.corridorKeys = (hired().kit = ['valve-keys'], post(1)); hired().kit = [];
    out.lockMade = post(0, [2, 0, 0]);
    repelCasualty = real; return out;
  });
  assert.equal(r.lock, 1, 'a lost exchange at the lock (a point of cover) is hit at 0.45, and a roll of 0.40 hits');
  assert.equal(r.corridor, 0, 'the corridor of a long ship (two points) is hit at 0.36, and the same roll misses');
  assert.equal(r.corridorKeys, 0); assert.equal(r.lockMade, 0, 'cover made at the lock turns it down too');
  await done();
});

// The crew at the lock (#711): orders to named crew, each their post's ability at their own skill.
const crewHelpers = () => {
  // a crew of named people with the roles and skills given, all on their feet and friendly, and a fight started with them
  window.crewOf = list => {
    const st = G.state; st.crew = []; st.injured = {};
    for (const [first, role, skill, traits] of list) { const p = makePerson('earth'); Object.assign(p, { first, role, skill, traits: traits || [], opinion: 30 }); registerPerson(p); st.crew.push(p.id); }
    return st.crew.map(person);
  };
};

test('the lock fight offers orders to named crew who have a post, best first, each with its odds and what it wins on the label', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers); await ev(crewHelpers);
  const r = await ev(() => {
    fight(); crewOf([['Ana', 'gunner', 1], ['Bo', 'pilot', 3], ['Cy', 'cook', 3], ['Di', 'engineer', 2], ['Ed', 'slicer', 0]]);
    const s = repelStart(G.duel, 'full'), e = repelScene(s), orders = e.choices.filter(c => c.order).map(c => c.label), base = e.choices.filter(c => !c.order).length;
    return { orders, base, total: e.choices.length };
  });
  assert.equal(r.base, 6, 'the tactics, the post\'s move and its two abilities are as they were');
  assert.equal(r.orders.length, 3, 'up to three orders');
  assert.match(r.orders[0], /^Bo cuts the lights \(cover here, once\) \[\d+%; if it fails: Bo may be hurt\]$/, 'the best pilot, given the cover');
  assert.match(r.orders[1], /^Di vents a coolant line \(one fewer of them, no ground\) \[\d+%; if it fails: Di may be hurt\]$/);
  assert.match(r.orders[2], /^Ana picks off a runner \(one fewer of them, no ground\) \[\d+%/);
  assert.ok(!r.orders.some(l => /^Cy|^Ed/.test(l)), 'a cook has no post, and the least skilled is left out');
  await done();
});

test('the orders have a heading of their own, a cue says more choices follow below the pinned block, and no button is cut short, at the three screen sizes (#737)', async () => {
  for (const [name, viewport, mobile] of [['desktop', { width: 1280, height: 800 }, false], ['tablet', { width: 768, height: 1024 }, false], ['phone', { width: 390, height: 844 }, true]]) {
    const { ev, page, done } = await open({ scope: 'earth-hired', viewport, mobile });
    await ev(helpers);
    await ev(() => { fight(); openEvent(repelScene(repelStart(G.duel, 'full'))); });
    await page.waitForTimeout(300);
    const look = () => ev(() => {
      const ch = document.querySelector('#panel.event .choices'), box = ch.getBoundingClientRect(), group = [...ch.querySelectorAll('.group')];
      return { headings: group.map(g => g.textContent), headingTop: group[0] && group[0].getBoundingClientRect().top, headingBottom: group[0] && group[0].getBoundingClientRect().bottom, boxTop: box.top, boxBottom: box.bottom, rest: ch.classList.contains('rest'),
        cut: [...ch.querySelectorAll('button')].filter(b => b.scrollHeight > b.clientHeight + 1).map(b => b.textContent.slice(0, 30)) };
    });
    const before = await look();
    assert.deepEqual(before.headings, ['Orders to the crew'], `${name}: one heading, over the orders`);
    assert.deepEqual(before.cut, [], `${name}: no button is cut short`);
    assert.ok(before.headingBottom <= before.boxBottom || before.rest, `${name}: the heading is in view, or the cue says more follows`);
    await ev(() => { const ch = document.querySelector('#panel.event .choices'); ch.scrollTop = ch.scrollHeight; ch.dispatchEvent(new Event('scroll')); });
    const after = await look();
    assert.ok(after.headingTop >= after.boxTop && after.headingBottom <= after.boxBottom, `${name}: scrolled to the end, the heading is in view`);
    assert.equal(after.rest, false, `${name}: and the cue is gone`);
    await done();
  }
});

test('an order works as the crew member\'s own ability: it thins them or makes cover, and a miss lands on the one sent', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers); await ev(crewHelpers);
  const r = await ev(() => {
    fight(); const [ana, bo] = crewOf([['Ana', 'gunner', 2], ['Bo', 'pilot', 3]]);
    const mk = () => { const s = repelStart(G.duel, 'full'); s.boarders = 4; return s; };
    const out = {};
    let s = mk(), o = repelOrders(s); out.kinds = o.map(x => [x.first, x.kind]);
    rolls([0.01]); out.cover = repelStep(s, o[0].kind, o[0]); out.made = [...repelCover(s)]; out.used = s.used.cover; out.pos = s.pos; G.nextEvent = null;
    out.next = repelOrders(s).map(x => [x.first, x.kind]);  // the cover is made: both are steady now
    const real = repelCasualty; let target = 'unset'; repelCasualty = (t, only) => { target = only; return 'Someone is hurt.'; };
    s = mk(); o = repelOrders(s).find(x => x.first === 'Ana'); rolls([0.99, 0.01]); out.miss = repelStep(s, o.kind, o); out.target = target === ana.id ? 'Ana' : String(target); out.missBoarders = s.boarders; G.nextEvent = null;
    rolls([0.01]); s = mk(); const t0 = s.boarders; repelStep(s, o.kind, o); out.thin = [t0, s.boarders]; G.nextEvent = null;
    repelCasualty = real;
    s = mk(); rolls([0.99, 0.01, 0.99]); out.real = repelStep(s, 'steady', repelOrders(s).find(x => x.first === 'Ana')); out.hurt = [...s.hurt].map(id => person(id).first); G.nextEvent = null;
    return out;
  });
  assert.deepEqual(r.kinds, [['Bo', 'cover'], ['Ana', 'steady']]);
  assert.match(r.cover, /^Bo cuts the lights in the section from the helm/); assert.deepEqual(r.made, [1, 3, 1]); assert.equal(r.used, true); assert.equal(r.pos, 1, 'the exchange stands');
  assert.deepEqual(r.next, [['Bo', 'steady'], ['Ana', 'steady']]);
  assert.match(r.miss, /^Ana waits for a runner and none runs\. .*Someone is hurt\.$/); assert.equal(r.target, 'Ana', 'the casualty was aimed at the one sent'); assert.equal(r.missBoarders, 4, 'a miss thins nobody');
  assert.deepEqual(r.thin, [4, 3]);
  assert.deepEqual(r.hurt, ['Ana'], 'with the casualty rolled for real, the one sent is the one hurt');
  await done();
});

test('an order is easier for the skilled and harder for one already hurt in the fight, and a crew member who is down is not offered', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers); await ev(crewHelpers);
  const r = await ev(() => {
    fight(); const [ana, bo, cy] = crewOf([['Ana', 'gunner', 1], ['Bo', 'gunner', 3], ['Cy', 'gunner', 1, ['brave']]]);
    const pct = (s, name) => +repelScene(s).choices.find(c => c.order && c.label.startsWith(name)).label.match(/\[(\d+)%/)[1];
    const s = repelStart(G.duel, 'full'); const out = { ana: pct(s, 'Ana'), bo: pct(s, 'Bo'), cy: pct(s, 'Cy') };
    s.hurt.add(ana.id); G.state.injured[ana.id] = true; out.anaHurt = pct(s, 'Ana');
    s.dead.push(bo); out.afterDeath = repelScene(s).choices.filter(c => c.order).map(c => c.label.split(' ')[0]);
    return out;
  });
  assert.ok(r.bo > r.cy && r.cy > r.ana, `skill, then trait: ${JSON.stringify(r)}`);
  assert.equal(r.anaHurt, r.ana - 10, 'hurt in this fight takes a tenth off');
  assert.deepEqual(r.afterDeath, ['Ana', 'Cy'], 'the dead are not offered');
  await done();
});

test('an owner who kept a post fights boarders at the lock with the same moves: the bridge costs credits, the hurt lays them up and never kills, boarding a crippled ship pays credits; an owner who was never a hand keeps the card duel', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    const out = {};
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester' }); while (G.dialog) finishEvent();
    const st = G.state; st.story.next = 1e9; st.tutorial = null; st.credits = 100000; buyIn('courier'); while (G.dialog) finishEvent();
    st.day += 30; uatBurn('Ceres Station', 'pallas'); G.transit.times = []; G.transit.event = null; G.dialog = null;
    out.owner = !hired() && lockPost() === 'gunner';
    startDuel(DUEL_SPEC, false); G.nextEvent = null; const before = st.armor; G.duel.init = 'foe'; duelExchange('burn', 'board');
    out.title = G.nextEvent.title; out.armor = st.armor === before;
    const scene = G.nextEvent; out.post = scene.choices.some(c => c.label.startsWith('[Gunner]')); G.nextEvent = null;
    const mk = pos => { const s = repelStart(G.duel, 'full'); s.pos = pos; s.hurt = new Set(); return s; }, real = Math.random;
    rolls([0.99, 0.99]); st.credits = 10000; const lost = repelStep(mk(2), 'post'); Math.random = real; out.lost = lost; out.credits = st.credits; out.duelGone = G.duel === null;
    startDuel(DUEL_SPEC, false); G.nextEvent = null;  // (a foe is made before the dice are set: people are drawn until they differ)
    const sh = mk(0); rolls([0.01, 0.99]); out.held = repelStep(sh, 'post'); Math.random = real; out.heldNext = G.duel && G.duel.init;
    const s = mk(1); Math.random = () => 0; const hurt = hurtHand(s); Math.random = real;
    out.hurt = hurt; out.hurtUntil = career().hurtUntil - st.day; out.died = !!s.handDied; out.level = handHurt();
    const foe = makeEnemy({ kind: 'pirate' }), a = assaultStart(foe), xp = skillXp('gunner'); st.credits = 1000;
    out.won = assaultSettle({ ...a, hurt: new Set(), d: { foe } }, true, ''); out.take = st.credits > 1000; out.xp = skillXp('gunner') - xp;
    G.state.career = undefined; out.never = lockPost();  // (the shipped build starts every game as a hand: take away the career the buy left, and there is no post)
    return out;
  });
  assert.ok(r.owner); assert.equal(r.title, 'The Corridor'); assert.ok(r.armor); assert.ok(r.post, 'the post\'s own move is offered');
  assert.match(r.lost, /You give them the code to the strongbox/); assert.equal(r.credits, 7000, 'a third of the player\'s credits, not a fund'); assert.ok(r.duelGone);
  assert.match(r.held, /The last of them go back through the lock/); assert.equal(r.heldNext, 'me');
  assert.match(r.hurt, /You are hurt/); assert.ok(r.hurtUntil >= 12); assert.equal(r.died, false, 'an owner is laid up and lives'); assert.equal(r.level, true);
  assert.match(r.won, /goes into your credits\. You have the cutter cast off/); assert.ok(r.take); assert.equal(r.xp, 5);
  assert.equal(r.never, null, 'an owner who never was a hand has no post to fight at');
  await done();
});

test('the last of them going down wins the fight, and so few left, pushed back to the lock, that the rest break; in both fights', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const out = {};
    for (const assault of [false, true]) {
      const kind = assault ? 'assault' : 'repel';
      const play = (pos, boarders, began, roll) => {
        __seed(7); fight(); const s = assault ? assaultStart(G.duel.foe) : repelStart(G.duel, 'full');  // (a constant random hangs the generators, so each play starts from the seeded one)
        Object.assign(s, { pos, boarders, began }); rolls([roll]);
        const text = repelStep(s, 'steady');
        G.nextEvent = null; G.duel = null;
        return { won: s.pos < 0, boarders: s.boarders, pos: s.pos, last: text.includes(FIGHT_END[kind].last), broke: text.includes(FIGHT_END[kind].broke) };
      };
      out[kind] = {
        last: play(1, 1, 4, 0.01),         // the last of four, picked off in the corridor
        broke: play(0, 2, 6, 0.01),        // two of six left, at the lock: one more down and the rest break
        notPushedBack: play(1, 2, 6, 0.01),  // as few, but still in the corridor: the fight goes on
        tooMany: play(0, 4, 6, 0.01),      // pushed back, but three of six are still standing
        missed: play(1, 1, 4, 0.99),       // a miss leaves the last of them standing
      };
    }
    return out;
  });
  for (const kind of ['repel', 'assault']) {
    const x = r[kind];
    assert.deepEqual([x.last.won, x.last.boarders, x.last.last, x.last.broke], [true, 0, true, false], `${kind}: the last of them down wins the fight`);
    assert.deepEqual([x.broke.won, x.broke.boarders, x.broke.broke, x.broke.last], [true, 1, true, false], `${kind}: pushed back and down to a third, the rest break`);
    assert.deepEqual([x.notPushedBack.won, x.notPushedBack.broke], [false, false], `${kind}: not pushed back, they hold`);
    assert.deepEqual([x.tooMany.won, x.tooMany.boarders], [false, 3], `${kind}: too many left, they hold`);
    assert.deepEqual([x.missed.won, x.missed.boarders], [false, 1], `${kind}: a miss ends nothing`);
  }
  await done();
});
