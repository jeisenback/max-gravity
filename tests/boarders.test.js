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
    return { taken: /They are on the bridge/.test(text), fund: h.fund / fund, opinion: cap.opinion - op, duel: G.duel, next: G.nextEvent, armor: st.armor < armor };
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

test('a main character hurt twice is marked, not killed', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const st = fight(), d = G.duel, ines = castPerson('ines');
    st.crew = [ines.id];
    const s = repelStart(d, 'full');
    rolls([0.99, 0.01, 0, 0.99, 0.99, 0.01, 0]);
    repelStep(s, 'post'); repelStep(s, 'post');
    return { here: st.crew.includes(ines.id), dead: castDead('ines'), marks: marksOf(ines).length };
  });
  assert.ok(r.here && !r.dead); assert.equal(r.marks, 1);
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
  assert.equal(r.held, r.all - 1); assert.equal(r.none, 0); assert.equal(r.line.length, 1); assert.match(r.line[0], /will not fight for you/); assert.match(r.text, /will not fight for you/);
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
    // A loss drives you back to your lock, and she is still drifting.
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
    G.state = newState(); G.state.credits = 99999; G.mode = 'flight'; G.player = { x: 0, y: 0, vx: 0, vy: 0 };
    const foe = { name: 'Test', kind: 'pirate', shipId: 'freighter', armor: 10, maxArmor: 40, x: 0, y: 0, vx: 0, vy: 0, disabled: true, captain: 'Voss' };
    const e = boardingEvent(foe);
    return { labels: e.choices.map(c => c.label), odds: /%/.test(e.text) };
  });
  assert.ok(r.labels.some(l => /prize/i.test(l))); assert.ok(r.odds);
  await done();
});
