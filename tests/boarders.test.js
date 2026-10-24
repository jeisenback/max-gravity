'use strict';

// Repelling boarders: when a boarding run lands in the ship duel, or a ship fight ends alongside, a hired hand fights them on the deck panel (fightui.js
// deckFightEvent, the deck fight of fight.js), with casualties; and boarding a crippled ship is the same fight on her deck.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser, frames } = require('./helpers');

after(closeBrowser);

const helpers = () => {
  window.DUEL_SPEC = { kind: 'hunter', person: { first: 'Ana', last: 'Voss' } };  // a pirate or a patrol is a ship fight (fightui.js); the card duel is for the rest
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
  // One turn of the deck fight with the hand's plan: the panel's Fight. Returns the next panel, or null at an end (the close is G.nextEvent).
  window.fightTurn = (s, plan = {}) => { const e = deckFightEvent(s, plan); return e.choices[e.choices.length - 1].run(); };
  // The state set by hand, their move a hold, so that the turn does only what the state makes it do.
  window.holdThem = (s, set) => { set(s.state); s.shown = { kind: 'hold', from: 0, to: 0, n: 0, feint: false }; return s; };
  // The engine's turn answered with these events, and the plan it was given kept in window.plan: for what the panel makes of each kind of event.
  window.stubTurn = events => { window.realTurn = window.realTurn || resolveDeckTurn; resolveDeckTurn = (st, plan) => { window.plan = plan; const state = JSON.parse(JSON.stringify(st)); state.turn++; return { state, events }; }; };
  window.unstub = () => { resolveDeckTurn = window.realTurn; };
};

test('a boarding run that lands opens the deck fight at the lock, two more of them for a full run than for a short one, and a stopped one does not', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const st = fight(), out = {}, d = G.duel;
    const before = st.armor; d.init = 'foe'; duelExchange('burn', 'board');  // an evasive burn lets boarders across: full
    out.full = [G.nextEvent.title, G.nextEvent.fight.state.began]; out.armor = st.armor === before;
    G.duel = null; startDuel(DUEL_SPEC, false); G.nextEvent = null; G.duel.init = 'foe'; duelExchange('pdc', 'board');  // a PDC screen halves it: they come without the two more
    out.half = [G.nextEvent.title, G.nextEvent.fight.state.began]; out.crew = FOE_CREW[G.duel.foe.shipId];
    G.duel = null; startDuel(DUEL_SPEC, false); G.nextEvent = null; G.duel.init = 'foe'; duelExchange('locks', 'board');  // crew at the locks stop it
    out.stopped = G.nextEvent && G.nextEvent.fight;
    return out;
  });
  assert.deepEqual(r.full, ['The Lock', r.crew + 2]); assert.deepEqual(r.half, ['The Lock', r.crew]); assert.ok(r.armor, 'no hull damage from the run itself');
  assert.ok(!r.stopped, 'a stopped run is the duel as before');
  await done();
});

test('the party comes from her ship: a corsair\'s hull, a raider\'s, and any other a raider\'s', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    fight(); const d = G.duel, was = d.foe.shipId, out = {};
    for (const id of ['corsair', 'raider', 'cutter', 'unknown-hull']) { d.foe.shipId = id; out[id] = repelStart(d, 'full').state.party; }
    d.foe.shipId = was; out.level = [repelStart(d, 'full').state.level, skillLevel(lockPost())];
    return out;
  });
  assert.deepEqual(r, { corsair: 'corsair', raider: 'raider', cutter: 'navy', 'unknown-hull': 'raider', level: r.level });
  assert.equal(r.level[0], r.level[1], 'the level worked');
  await done();
});

test('repelled, the duel goes on with the initiative yours, and the captain remembers it', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const st = fight(), d = G.duel, cap = person(hired().captain), op = cap.opinion;
    const s = holdThem(repelStart(d, 'full'), f => { f.sections.forEach(x => { x.theirs = 0; }); f.wave = null; });
    rolls([]); const ret = fightTurn(s); const close = G.nextEvent; G.nextEvent = null;
    const down = close.choices[0].run();
    return { ret, title: close.title, text: close.text, labels: close.choices.map(c => c.label), down, won: s.won, init: d.init, next: G.nextEvent && G.nextEvent.title, opinion: cap.opinion - op, hurt: s.hurt.size };
  });
  assert.equal(r.ret, null); assert.equal(r.title, 'The Lock'); assert.deepEqual(r.labels, ['Stand down']); assert.equal(r.down, null);
  assert.match(r.text, /The last of them goes down in the passage, and nobody comes through behind him\. The last of them go back through the lock/); assert.ok(r.won); assert.equal(r.init, 'me'); assert.equal(r.opinion, 1); assert.equal(r.hurt, 0);
  assert.ok(r.next && !r.next.startsWith('The '), `back to the duel (${r.next})`);
  await done();
});

test('they reach the bridge: a third of the ship\'s fund goes, and they cut loose', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const st = fight(), d = G.duel, h = hired(), cap = person(h.captain), op = cap.opinion, fund = h.fund, armor = st.armor;
    const s = holdThem(repelStart(d, 'full'), f => { f.sections.forEach(x => { x.theirs = 0; }); f.sections[2] = { mine: 0, theirs: 3, cover: 1 }; });
    rolls([]); fightTurn(s); const close = G.nextEvent; G.nextEvent = null; close.choices[0].run();
    return { taken: /They're on the bridge/.test(close.text), won: s.won, fund: h.fund / fund, opinion: cap.opinion - op, duel: G.duel, next: G.nextEvent, armor: st.armor < armor };
  });
  assert.ok(r.taken); assert.equal(r.won, false); assert.ok(Math.abs(r.fund - 0.7) < 0.02); assert.equal(r.opinion, -1); assert.equal(r.duel, null); assert.equal(r.next, null); assert.ok(r.armor);
  await done();
});

test('a head lost on our side is a named crewmate, and one hurt twice in one fight is dead, and the berth is filled at the next port', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const st = fight(), d = G.duel, crew = generated(3), first = crew[0], n = st.crew.length;
    const s = repelStart(d, 'full');
    stubTurn([{ kind: 'exchange', section: 0, mine: 1, theirs: 1 }]);
    rolls([0, 0, 0.99]); fightTurn(s); const line = s.state.log[s.state.log.length - 1];  // a casualty (DECK.CASUALTY), the first of those standing, and not killed outright
    unstub();
    const afterOne = { injured: !!(st.injured || {})[first.id], here: st.crew.includes(first.id) };
    rolls([0.99]); repelCasualty(s, first.id);
    const out = { line, name: first.first, afterOne, dead: !st.crew.includes(first.id), flagged: first.dead === true, fallen: (st.fallen || []).length, vacancy: (st.vacancies || []).length, size: st.crew.length === n - 1 };
    __seed(1); Mods.emit('landed', currentPlanet());  // a constant random hangs the generator
    out.filled = st.crew.length === n && (st.vacancies || []).length === 0; out.note = UI.notes.some(t => /signs on/.test(t));
    return out;
  });
  assert.equal(r.line, `Turn 1: 1 of them and 1 of ours down in the Lock. ${r.name} is hurt.`, 'the loss is named in the turn\'s line');
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
      rolls([0.99, 0.99]);  // not killed outright, the first time
      const first = repelCasualty(s, ines.id), second = repelCasualty(s, ines.id);
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

test('the hand hurt in a contested section works a level lower until it passes, or a medic treats them', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const st = fight(), d = G.duel, h = hired(); h.skill.gunner = 35;
    generated(0); const medic = makePerson('earth'); medic.role = 'medic'; medic.skill = 1; registerPerson(medic);  // made before the rolls: a constant random hangs makePerson
    const level = skillLevel('gunner'), s = repelStart(d, 'full');
    stubTurn([{ kind: 'hurt', hurt: true }]); rolls([0.99]); fightTurn(s); unstub();  // the hand's hurt roll came, and the death roll does not
    const text = s.state.log[s.state.log.length - 1];
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
    return { all: sum(all.state, 'mine'), held: sum(s.state, 'mine'), line: s.held, text: deckFightEvent(s).text, none: all.held.length };
  });
  assert.equal(r.all, 3); assert.equal(r.held, 2); assert.equal(r.none, 0); assert.equal(r.line.length, 1); assert.match(r.line[0], /won't fight for you/); assert.match(r.text, /won't fight for you/);
  await done();
});

test('of two crew at each other\'s throats, the one who thinks less of you will not stand in the same section', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const st = fight(), [a, b, c] = generated(3), d = { foe: makeEnemy(DUEL_SPEC), foeHp: 4, init: 'foe' }, f = x => ({ id: x.id, p: x });
    for (const x of [a, b, c]) x.opinion = 0;
    const before = sum(repelStart(d, 'full').state, 'mine');
    st.bonds = {}; addBond(f(a), f(b), -6); a.opinion = 1; b.opinion = -1;
    const s = repelStart(d, 'full'), asd = assaultStart(d.foe);
    st.bonds = {}; addBond(f(a), f(b), -3);  // not that bad
    const mild = repelStart(d, 'full');
    return { before, base: sum(s.state, 'mine'), line: s.held, assault: sum(asd.state, 'mine'), mild: sum(mild.state, 'mine'), who: b.first };
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

test('a hired hand boards a ship that resists as the deck fight on her deck, and a ship that has given up needs no fight', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const st = fight(), h = hired(), out = {}, foe = G.duel.foe;
    duelDisabledEvent(foe);  // she drifts beside you
    const e = boardingEvent(foe);
    out.labels = e.choices.map(c => c.label); out.odds = /%|odds/i.test(e.text); out.counts = /of yours against/.test(e.text);
    G.nextEvent = null; e.choices[0].run();
    out.scene = G.nextEvent && G.nextEvent.title; out.assault = G.nextEvent && G.nextEvent.fight.state.assault;
    // A win carries her bridge: her strongbox goes into the ship's fund.
    const a = assaultStart(foe); a.won = true; const fund = h.fund, rep = person(h.captain).opinion;
    out.won = repelSettle(a); out.fundUp = h.fund > fund; out.foeDead = !!foe.dead; out.liked = person(h.captain).opinion > rep;
    // A loss drives you back to your lock, and she's still drifting.
    const foe2 = { ...foe, dead: false }, b = assaultStart(foe2); b.won = false; const armor = st.armor;
    out.lost = repelSettle(b); out.armorDown = st.armor < armor; out.stillDrifting = !foe2.dead;
    // A trader that has given up: no fight, and no prize for a hand.
    const t = { ...foe, kind: 'trader', dead: false, disabled: true }, te = boardingEvent(t);
    out.trader = te.choices.map(c => c.label);
    // Nobody fit to go across: Board her is shut, with the reason (R34).
    const crew = repelCrew; repelCrew = () => ({ fight: [], held: [] });
    const ne = boardingEvent({ ...foe, dead: false, disabled: true }); repelCrew = crew;
    out.noneOpen = ne.choices[0].can(); out.noneWhy = ne.choices[0].why();
    return out;
  });
  assert.deepEqual(r.labels, ['Board her', 'Let her drift']); assert.ok(!r.odds, 'no odds in the prompt'); assert.ok(r.counts, 'the numbers are in the prompt');
  assert.equal(r.scene, 'Her Lock'); assert.equal(r.assault, true);
  assert.match(r.won, /strongbox/); assert.ok(r.fundUp && r.foeDead && r.liked);
  assert.match(r.lost, /driven back to the lock/); assert.ok(r.armorDown && r.stillDrifting);
  assert.ok(!r.trader.some(l => /prize/i.test(l)) && r.trader.some(l => /strip the cargo/.test(l)), r.trader.join('|'));
  assert.equal(r.noneOpen, false); assert.match(r.noneWhy, /Nobody aboard is fit/);
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
    h.hurtUntil = st.day + 5; rolls([0.01]); const s = repelStart(d, 'full'); s.won = false; repelSettle(s); out.bridge = { title: G.nextEvent && G.nextEvent.title, how: h.died && h.died.how };
    reset(); rolls([0.99]); const s2 = repelStart(d, 'full'); s2.won = false; repelSettle(s2); out.well = { next: G.nextEvent, died: !!h.died };
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
    const bridge = (roll, foe) => { reset(); const was = d.foe.kind; if (foe) d.foe.kind = foe; rolls([roll]); const s = repelStart(d, 'full'); s.won = false; const text = repelSettle(s); d.foe.kind = was; return { text, title: G.nextEvent && G.nextEvent.title, lost: !!h.captainLost }; };
    out.hit = bridge(0.2); out.miss = bridge(0.5); out.patrol = bridge(0.2, 'patrol');
    reset(); h.hurtUntil = st.day + 5; rolls([0.01]); const s = repelStart(d, 'full'); s.won = false; repelSettle(s);  // the hand's roll first, and one scene only
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

test('a deck fight ends on the hand\'s death, and the ending reads the record and starts a new hand with a line on the dock', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const st = fight(), h = hired(), d = G.duel, cap = person(h.captain), out = {};
    generated(0); h.hurtUntil = st.day + 5; st.credits = 777; h.skill.gunner = 60;
    const s = repelStart(d, 'full');
    stubTurn([{ kind: 'hurt', hurt: true }]); rolls([0.01]); out.ret = fightTurn(s); unstub();  // hurt again while laid up, and the roll is under one in four
    const e = G.nextEvent;
    out.title = e.title; out.fight = s.handDied; out.last = cap.last; out.text = e.text; out.choices = e.choices.map(c => c.label);
    __seed(1);  // a constant random hangs the generators, so the new hand starts from the seeded one
    e.choices[0].run();
    out.fresh = G.state !== st; out.credits = G.state.credits; out.carried = G.state.carried; out.name = captain().name;
    out.skill = hired().skill.gunner; out.since = hired().since;
    return out;
  });
  assert.equal(r.ret, null, 'the panel gives way to the ending');
  assert.equal(r.title, 'The Last Run'); assert.ok(r.fight); assert.deepEqual(r.choices, ['Begin again']);
  assert.ok(r.text.includes(`Captain ${r.last} says it from the hatch`), 'what happened'); assert.ok(r.text.includes(`Captain ${r.last} writes it in the log`));
  assert.match(r.text, /days aboard/, 'the look back follows');
  assert.ok(r.fresh && r.credits !== 777 && r.credits > 0, 'a new hand with fresh savings'); assert.equal(r.carried, `On the dock they say the hand on Captain ${r.last}'s ship didn't come back.`);
  assert.equal(r.name, 'Sam Rowe');
  await done();
});

test('the hand acts with the sidearm or the post\'s two abilities, and the cover one is gone once it is used', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const out = {}, acts = e => { const seen = []; let x = e; for (let i = 0; i < 4; i++) { seen.push(x.choices[1].label); x = x.choices[1].run(); } return seen; };
    for (const post of ['gunner', 'pilot', 'engineer', 'comms']) { fight(post); out[post] = acts(deckFightEvent(repelStart(G.duel, 'full'))); G.duel = null; }
    fight(); const s = holdThem(repelStart(G.duel, 'full'), () => {});
    rolls([0.01]); const next = fightTurn(s, { act: 'cover' });
    out.used = s.state.used.cover; out.cover = s.state.sections.map(x => x.cover); out.line = s.state.log[s.state.log.length - 1]; out.after = acts(next);
    return out;
  });
  assert.deepEqual(r.gunner, ['Shoot: 1 to 2 of them hit', 'Pick off a runner: one of them down if it works', 'Covering burst: two points of cover here, once a fight', 'Shoot: 1 to 2 of them hit']);
  assert.deepEqual([r.pilot[1], r.engineer[2], r.comms[1]], ['Cycle a hatch on them: one of them down if it works', 'Drop the pressure door: two points of cover here, once a fight', 'A false order on their band: one of them down if it works']);
  assert.equal(r.used, true); assert.deepEqual(r.cover.slice(0, 3), [3, 2, 1], 'two points where the hand stands, up to three');
  assert.match(r.line, /You lay a long burst along the wall at head height\./);
  assert.deepEqual(r.after, ['Shoot: 1 to 2 of them hit', 'Pick off a runner: one of them down if it works', 'Shoot: 1 to 2 of them hit', 'Pick off a runner: one of them down if it works'], 'once a fight');
  await done();
});

test('the hand\'s ability carries the post\'s own odds, and an order the crewmate\'s, a tenth harder for one already hurt in the fight', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers); await ev(crewHelpers);
  const r = await ev(() => {
    fight(); const [ana] = crewOf([['Ana', 'gunner', 2]]);
    const s = repelStart(G.duel, 'full'), sheet = crewSheet(ana), out = {};
    stubTurn([]);
    fightTurn(s, { act: 'steady', order: ana.id }); out.plan = window.plan;
    out.want = { steady: abilityOdds('gunner', 'steady'), cover: crewOrderOdds(sheet, 'cover', false) };
    s.hurt.add(ana.id); fightTurn(s, { act: 'cover', order: ana.id }); out.hurt = window.plan;
    out.hurtWant = { cover: abilityOdds('gunner', 'cover'), steady: crewOrderOdds(sheet, 'steady', true), plain: crewOrderOdds(sheet, 'steady', false) };
    unstub();
    return out;
  });
  assert.deepEqual(r.plan.act, { kind: 'steady', odds: r.want.steady }); assert.deepEqual(r.plan.order, { kind: 'cover', odds: r.want.cover }, 'the first crewmate is given the cover');
  assert.deepEqual(r.hurt.act, { kind: 'cover', odds: r.hurtWant.cover }); assert.deepEqual(r.hurt.order, { kind: 'steady', odds: r.hurtWant.steady }, 'with the hand making the cover, the order is the steady one');
  assert.ok(Math.abs(r.hurtWant.plain - r.hurtWant.steady - 0.1) < 1e-9, 'a tenth off for one hurt in this fight');
  assert.ok(r.want.steady > 0 && r.want.steady < 1);
  await done();
});

test('the kit\'s cover adds to the section\'s, and a long ship has the cargo bay to go round by', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    fight(); const out = { size: SHIPS[G.state.shipId].size };
    out.base = repelStart(G.duel, 'full').state.sections.map(x => x.cover);
    hired().kit = ['valve-keys']; out.keys = repelStart(G.duel, 'full').state.sections.map(x => x.cover);
    G.state.shipId = 'shuttle'; out.small = repelStart(G.duel, 'full').state.sections.map(x => x.cover);
    return out;
  });
  assert.ok(r.size >= 16); assert.deepEqual(r.base, [1, 2, 1, 1], 'the long ship has berth doors in the corridor, and a cargo bay');
  assert.deepEqual(r.keys, [1, 3, 1, 1], 'the valve keys open the service crawl, a point more in the corridor');
  assert.deepEqual(r.small, [1, 1, 1], 'a cramped ship has three sections, and the keys still help its corridor');
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

test('the deck panel offers one order to a named crewmate who has a post, best first, and the dead are not offered', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers); await ev(crewHelpers);
  const r = await ev(() => {
    fight(); const [, bo] = crewOf([['Ana', 'gunner', 1], ['Bo', 'pilot', 3], ['Cy', 'cook', 3], ['Di', 'engineer', 2], ['Ed', 'slicer', 0]]);
    const s = repelStart(G.duel, 'full'), seen = []; let e = deckFightEvent(s);
    const at = () => e.choices.findIndex(c => c.order);
    for (let i = 0; i < 5; i++) { seen.push(e.choices[at()].label); e = e.choices[at()].run(); }
    const group = e.choices[at()].group;
    s.dead.push(bo); const after = repelOrders(s, false).map(o => [o.first, o.kind]);
    return { seen, group, after };
  });
  assert.deepEqual(r.seen, ['Order: none', 'Order: Bo cuts the lights', 'Order: Di vents a coolant line', 'Order: Ana picks off a runner', 'Order: none'], 'the best pilot, given the cover; a cook has no post, and the least skilled is left out');
  assert.equal(r.group, 'Orders to the crew');
  assert.deepEqual(r.after, [['Di', 'cover'], ['Ana', 'steady'], ['Ed', 'steady']], 'the dead are not offered, and the next is');
  await done();
});

test('the orders have a heading of their own, a cue says more choices follow below the pinned block, and no button is cut short, at the three screen sizes (#737)', async () => {
  for (const [name, viewport, mobile] of [['desktop', { width: 1280, height: 800 }, false], ['tablet', { width: 768, height: 1024 }, false], ['phone', { width: 390, height: 844 }, true]]) {
    const { ev, page, done } = await open({ scope: 'earth-hired', viewport, mobile });
    await ev(helpers);
    await ev(() => { fight(); openEvent(deckFightEvent(repelStart(G.duel, 'full'))); });
    await frames(page);
    const look = () => ev(() => {
      const ch = document.querySelector('#panel.event .choices'), box = ch.getBoundingClientRect(), group = [...ch.querySelectorAll('.group')];
      return { headings: group.map(g => g.textContent), headingTop: group[0] && group[0].getBoundingClientRect().top, headingBottom: group[0] && group[0].getBoundingClientRect().bottom, boxTop: box.top, boxBottom: box.bottom, rest: ch.classList.contains('rest'),
        cut: [...ch.querySelectorAll('button')].filter(b => b.scrollHeight > b.clientHeight + 1).map(b => b.textContent.slice(0, 30)) };
    });
    const before = await look();
    assert.deepEqual(before.headings, ['Orders to the crew'], `${name}: one heading, over the order`);
    assert.deepEqual(before.cut, [], `${name}: no button is cut short`);
    assert.ok(before.headingBottom <= before.boxBottom || before.rest, `${name}: the heading is in view, or the cue says more follows`);
    await ev(() => { const ch = document.querySelector('#panel.event .choices'); ch.scrollTop = ch.scrollHeight; ch.dispatchEvent(new Event('scroll')); });
    const after = await look();
    assert.ok(after.headingTop >= after.boxTop && after.headingBottom <= after.boxBottom, `${name}: scrolled to the end, the heading is in view`);
    assert.equal(after.rest, false, `${name}: and the cue is gone`);
    await done();
  }
});

test('an order works as the crewmate\'s own ability, and a miss lands on the one sent', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers); await ev(crewHelpers);
  const r = await ev(() => {
    fight(); const [ana, bo] = crewOf([['Ana', 'gunner', 2], ['Bo', 'pilot', 3]]);
    const out = {};
    let s = holdThem(repelStart(G.duel, 'full'), () => {});
    rolls([0.01]); fightTurn(s, { order: bo.id }); out.cover = s.state.log[s.state.log.length - 1]; out.made = s.state.sections.map(x => x.cover); out.used = s.state.used.cover;
    out.next = repelOrders(s, s.state.used.cover).map(x => [x.first, x.kind]);  // the cover is made: both are steady now
    const real = repelCasualty; let target = 'unset'; repelCasualty = (t, only) => { target = only; return 'Someone is hurt.'; };
    s = repelStart(G.duel, 'full'); stubTurn([{ kind: 'steady', worked: false }, { kind: 'exchange', section: 0, mine: 1, theirs: 0 }]);
    rolls([0.01]); fightTurn(s, { order: ana.id }); out.miss = s.state.log[s.state.log.length - 1]; out.target = target === ana.id ? 'Ana' : String(target);
    unstub(); repelCasualty = real;
    return out;
  });
  assert.match(r.cover, /Bo cuts the lights in the section from the helm/); assert.deepEqual(r.made.slice(0, 3), [1, 2, 3], 'two crew are both on the bridge, where the hand starts: the cover is made there'); assert.equal(r.used, true);
  assert.deepEqual(r.next, [['Bo', 'steady'], ['Ana', 'steady']]);
  assert.equal(r.miss, 'Turn 1: 0 of them and 1 of ours down in the Lock. Ana waits for a runner and none runs. The round goes high, and they use the noise to push. Someone is hurt.');
  assert.equal(r.target, 'Ana', 'the loss was the one sent');
  await done();
});

test('an owner who kept a post fights boarders on the deck with the same moves: the bridge costs credits, the hurt lays them up and never kills, boarding a crippled ship pays credits; an owner who was never a hand keeps the card duel', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    const out = {};
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester' }); while (G.dialog) finishEvent();
    const st = G.state; st.story.next = 1e9; st.tutorial = null; st.credits = 1000000; buyIn('courier'); while (G.dialog) finishEvent();
    st.day += 30; uatBurn('Ceres Station', 'pallas'); G.transit.times = []; G.transit.event = null; G.dialog = null;
    out.owner = !hired() && lockPost() === 'gunner';
    startDuel(DUEL_SPEC, false); G.nextEvent = null; const before = st.armor; G.duel.init = 'foe'; duelExchange('burn', 'board');
    out.title = G.nextEvent.title; out.armor = st.armor === before;
    const scene = G.nextEvent; out.acts = scene.choices.slice(0, 2).map(c => c.label); G.nextEvent = null;
    const mk = won => { const s = repelStart(G.duel, 'full'); s.won = won; return s; }, real = Math.random;
    rolls([0.99, 0.99]); st.credits = 100000; const lost = repelSettle(mk(false)); Math.random = real; out.lost = lost; out.credits = st.credits; out.duelGone = G.duel === null;
    startDuel(DUEL_SPEC, false); G.nextEvent = null;  // (a foe is made before the dice are set: people are drawn until they differ)
    rolls([0.99]); out.held = repelSettle(mk(true)); Math.random = real; out.heldNext = G.duel && G.duel.init;
    const s = mk(false); Math.random = () => 0; const hurt = hurtHand(s); Math.random = real;
    out.hurt = hurt; out.hurtUntil = career().hurtUntil - st.day; out.died = !!s.handDied; out.level = handHurt();
    const foe = makeEnemy({ kind: 'pirate' }), a = assaultStart(foe), xp = skillXp('gunner'); st.credits = 10000;
    out.won = assaultSettle({ ...a, hurt: new Set(), d: { foe } }, true, ''); out.take = st.credits > 10000; out.xp = skillXp('gunner') - xp;
    G.state.career = undefined; out.never = lockPost();  // (the shipped build starts every game as a hand: take away the career the buy left, and there is no post)
    return out;
  });
  assert.ok(r.owner); assert.equal(r.title, 'The Lock'); assert.ok(r.armor); assert.deepEqual(r.acts, ['Stand: The Lock', 'Shoot: 1 to 2 of them hit'], 'the hand\'s own moves are offered');
  assert.match(r.lost, /You give them the code to the strongbox/); assert.equal(r.credits, 70000, 'a third of the player\'s credits, not a fund'); assert.ok(r.duelGone);
  assert.match(r.held, /The last of them go back through the lock/); assert.equal(r.heldNext, 'me');
  assert.match(r.hurt, /You are hurt/); assert.ok(r.hurtUntil >= 12); assert.equal(r.died, false, 'an owner is laid up and lives'); assert.equal(r.level, true);
  assert.match(r.won, /goes into your credits\. You have the cutter cast off/); assert.ok(r.take); assert.equal(r.xp, 5);
  assert.equal(r.never, null, 'an owner who never was a hand has no post to fight at');
  await done();
});

test('the last of them going down wins the fight with its line, and so few left that the rest break with theirs; in both fights', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const out = {};
    for (const assault of [false, true]) {
      const kind = assault ? 'assault' : 'repel', at = assault ? 2 : 1;  // our corridor, or her bridge (where ours would win it by holding it)
      const play = set => {  // her crew left where nobody of ours stands, so the turn trades nothing
        __seed(7); fight(); const s = holdThem(assault ? assaultStart(G.duel.foe) : repelStart(G.duel, 'full'), f => { f.began = 6; f.sections.forEach(x => { x.theirs = 0; x.mine = 1; }); f.wave = null; set(f); });
        rolls([]); fightTurn(s); const close = G.nextEvent; G.nextEvent = null; G.duel = null;
        return { won: s.won === true, ended: !!close, last: !!close && close.text.includes(FIGHT_END[kind].last), broke: !!close && close.text.includes(FIGHT_END[kind].broke) };
      };
      out[kind] = {
        last: play(() => {}),                                                          // none of them left
        broke: play(f => { f.sections[at] = { mine: 0, theirs: 1, cover: 1 }; }),      // one of six, where ours are not and ours cannot push them
        tooMany: play(f => { f.sections[at] = { mine: 0, theirs: 2, cover: 1 }; }),    // two of six still standing
      };
    }
    return out;
  });
  for (const kind of ['repel', 'assault']) {
    const x = r[kind];
    assert.deepEqual(x.last, { won: true, ended: true, last: true, broke: false }, `${kind}: the last of them down wins the fight`);
    assert.deepEqual(x.broke, { won: true, ended: true, last: false, broke: true }, `${kind}: down to three in ten, the rest break`);
    assert.deepEqual([x.tooMany.ended, x.tooMany.won], [false, false], `${kind}: too many left, the fight goes on`);
  }
  await done();
});
