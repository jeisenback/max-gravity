'use strict';

// Traits (js/traits.js, docs/superpowers/specs/2026-11-10-traits-design.md): the hand's record of counts, the eight traits a run of counts earns, and the
// words of the record. Plain Node through tests/nodecontext.js; the hand is built by hand.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./nodecontext');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

const { HAND_TRAITS, RECORD_KEYS, recordAdd, handTraits, hasTrait, recordWords } = load(['js/traits.js'], {}, ['HAND_TRAITS', 'RECORD_KEYS', 'recordAdd', 'handTraits', 'hasTrait', 'recordWords']);
const IDS = ['cool-head', 'salvager', 'marked', 'reliable', 'scarred', 'hard-case', 'runner', 'jonah'];
const hand = record => ({ record });

test('the table has the eight traits in order, each with a name, a speaker and a rule; the record has twenty-two keys (the last three for salvage, #965)', () => {
  assert.deepEqual([...HAND_TRAITS.map(t => t.id)], IDS);
  for (const t of HAND_TRAITS) { assert.ok(t.name, t.id); assert.ok(['captain', 'engineer', 'shipper', null].includes(t.by), `${t.id}: ${t.by}`); assert.equal(typeof t.earned, 'function'); }
  assert.equal(RECORD_KEYS.length, 22);
});

test('recordAdd counts, makes the record where there is none, and returns the traits earned by that add and not before', () => {
  const h = {};
  assert.deepEqual([...recordAdd(h, 'repelsHeld')], []); assert.equal(h.record.repelsHeld, 1);
  assert.deepEqual([...recordAdd(h, 'repelsHeld')], ['cool-head']); assert.equal(h.record.repelsHeld, 2);
  assert.deepEqual([...recordAdd(h, 'repelsHeld')], [], 'earned once');
  assert.deepEqual([...recordAdd(h, 'rocksFound', 3)], ['salvager'], 'n at a time');
});

test('each rule holds at its threshold and not one below', () => {
  const at = (record, id) => { assert.ok(handTraits(hand(record)).includes(id), `${id} at ${JSON.stringify(record)}`); };
  const not = (record, id) => { assert.ok(!handTraits(hand(record)).includes(id), `${id} not at ${JSON.stringify(record)}`); };
  at({ repelsHeld: 2 }, 'cool-head'); not({ repelsHeld: 1 }, 'cool-head');
  at({ haulsClean: 2 }, 'salvager'); not({ haulsClean: 1 }, 'salvager'); at({ rocksFound: 3 }, 'salvager'); not({ rocksFound: 2 }, 'salvager');
  at({ fines: 2 }, 'marked'); not({ fines: 1 }, 'marked'); at({ ranFromNavy: 1 }, 'marked'); not({ ranFromNavy: 0 }, 'marked');
  at({ onTime: 5 }, 'reliable'); not({ onTime: 4 }, 'reliable');
  at({ hurts: 2 }, 'scarred'); not({ hurts: 1 }, 'scarred');
  at({ boardingsWon: 2 }, 'hard-case'); not({ boardingsWon: 1 }, 'hard-case');
  at({ fightsRan: 2, fled: 1 }, 'runner'); not({ fightsRan: 1, fled: 1 }, 'runner');
  at({ matesLost: 2 }, 'jonah'); not({ matesLost: 1 }, 'jonah');
});

test('a late delivery resets the on-time count, so Reliable needs five since the last late one', () => {
  const h = { record: { onTime: 4 } };
  assert.deepEqual([...recordAdd(h, 'late')], []); assert.deepEqual([h.record.onTime, h.record.late], [0, 1]);
  for (let i = 0; i < 4; i++) assert.deepEqual([...recordAdd(h, 'onTime')], []);
  assert.deepEqual([...recordAdd(h, 'onTime')], ['reliable']);
});

test('no record, no hand: nothing earned and nothing thrown', () => {
  assert.deepEqual([...handTraits({})], []); assert.deepEqual([...handTraits(null)], []);
  assert.equal(hasTrait(null, 'jonah'), false); assert.equal(hasTrait({ record: { matesLost: 2 } }, 'jonah'), true);
});

test('the record in words: the counts above zero, in the table\'s order', () => {
  assert.equal(recordWords({ haulsClean: 2, repelsHeld: 1, hurts: 1 }), 'Two hauls clean. One boarding held. Hurt once.');
  assert.equal(recordWords({}), ''); assert.equal(recordWords({ haulsBad: 0, late: 12 }), 'Twelve deliveries late.');
});

// ---------- the writers and the moment (hired.js recordHand, traitNote), in a page ----------

const helpers = () => {
  window.setup = (post = 'gunner') => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post, captainKey: 'hester' }); while (G.dialog) finishEvent();
    const st = G.state; st.story.next = 1e9; st.tutorial = null; st.day += 30; hired().raidTold = true; hired().deckTold = true;
    return st;
  };
  window.burn = () => { uatBurn('Ceres Station', 'pallas'); G.transit.times = []; G.transit.event = null; G.dialog = null; G.messages = []; };
  window.said = () => G.messages.map(m => m.text);
};

test('recordHand counts and says a trait\'s moment once: by the captain at a port and in a burn, by the captain when the speaker is hurt, by nobody for Jonah', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const st = setup(), h = hired(), out = {}, cap = person(h.captain);
    G.mode = 'landed'; UI.notes.length = 0;
    recordHand('repelsHeld'); out.one = { count: h.record.repelsHeld, told: [...h.traitsTold], notes: UI.notes.length };
    recordHand('repelsHeld'); out.two = { count: h.record.repelsHeld, told: [...h.traitsTold], note: UI.notes[0] || '' };
    recordHand('repelsHeld'); out.three = UI.notes.filter(n => /rattle/.test(n));
    burn(); recordHand('hurts', 2); out.burn = { told: [...h.traitsTold], comms: said().filter(c => /still here/i.test(c)).length, engineer: postHolder('engineer').first };
    st.injured = { [postHolder('engineer').id]: true }; recordHand('haulsClean', 2); out.hurtSpeaker = said().slice(-1)[0]; st.injured = {};
    G.messages = []; recordHand('matesLost', 2); out.jonah = { told: h.traitsTold.includes('jonah'), comms: G.messages.length };
    delete h.record; recordHand('fines'); out.fresh = h.record.fines;
    h.record = { onTime: 4 }; recordHand('late'); out.late = { onTime: h.record.onTime, late: h.record.late };
    return { ...out, captain: cap.first };
  });
  assert.deepEqual(r.one, { count: 1, told: [], notes: 0 });
  assert.deepEqual([r.two.count, r.two.told], [2, ['cool-head']]); assert.match(r.two.note, new RegExp(r.captain)); assert.match(r.two.note, /rattle/);
  assert.equal(r.three.length, 1, `said once: ${JSON.stringify(r.three)}`);
  assert.deepEqual([r.burn.told, r.burn.comms], [['cool-head', 'scarred'], 1], `the engineer's line in the comms of a burn: ${r.burn.engineer}`);
  assert.match(r.hurtSpeaker, new RegExp(r.captain)); assert.doesNotMatch(r.hurtSpeaker, new RegExp(r.burn.engineer));
  assert.deepEqual(r.jonah, { told: true, comms: 0 });
  assert.equal(r.fresh, 1, 'a save with no record counts from one');
  assert.deepEqual(r.late, { onTime: 0, late: 1 });
  await done();
});

test('a moment over a fight panel goes to the comms and leaves the panel; an owner\'s game writes nothing', async () => {
  const { ev, done } = await open({ scope: 'full' });
  await ev(helpers);
  const r = await ev(() => {
    const st = setup(), h = hired(), out = {};
    burn(); startDuel({ kind: 'pirate' }, false); const e = G.nextEvent; G.nextEvent = null; openEvent(e);
    const title = G.dialog.event.title; h.record = { boardingsWon: 1 }; recordHand('boardingsWon');
    out.panel = { same: G.dialog.event.title === title, fight: !!G.dialog.event.fight, told: [...h.traitsTold], comms: said().some(c => /carried/i.test(c)) };
    startGame({ slot: 1, background: 'earth', captain: 'Ines' }); while (G.dialog) finishEvent();
    let threw = null; try { recordHand('fines'); recordHand('late'); } catch (x) { threw = String(x); }
    out.owner = { threw, hired: hired() };
    return out;
  });
  assert.deepEqual(r.panel, { same: true, fight: true, told: ['hard-case'], comms: true });
  assert.deepEqual(r.owner, { threw: null, hired: null });
  await done();
});

test('each site writes its count: the repel, the assault, the fight\'s end, the run, the ice home, the delivery, the inspection, the citation, the rock, the hand hurt, a casualty', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const st = setup(), h = hired(), out = {}, rec = () => ({ ...h.record }), foe = () => ({ foe: makeEnemy({ kind: 'pirate', shipId: 'raider' }), foeHp: 0, init: 'foe' });
    burn();
    let s = repelStart(foe(), 'half'); s.won = true; s.state.turn = 3; repelSettle(s); out.held = rec().repelsHeld;
    s = repelStart(foe(), 'half'); s.won = false; repelSettle(s); out.lost = rec().repelsLost;
    s = assaultStart(makeEnemy({ kind: 'pirate', shipId: 'raider' })); assaultSettle(s, true, ''); out.carried = rec().boardingsWon;
    startDuel({ kind: 'pirate' }, false); let f = G.nextEvent.fight; G.nextEvent = null; shipFightEnd(f, 'broke'); out.won = rec().fightsWon;
    startDuel({ kind: 'pirate' }, false); f = G.nextEvent.fight; G.nextEvent = null; shipFightEnd(f, 'ran'); out.ran = rec().fightsRan; G.nextEvent = null; G.dialog = null;
    const real = Math.random; startShipFight({ kind: 'patrol', gov: 'Arcology Pact' }, true); out.fled = [rec().fled, rec().ranFromNavy]; G.nextEvent = null; G.dialog = null;  // counted before the roll, got away or not
    h.run = { ice: { edge: 3 }, tons: 20 }; iceHome(3); iceHome(-2); out.hauls = [rec().haulsClean, rec().haulsBad];
    const here = currentPlanet(), run = due => ({ contract: true, shipper: 'the Arcology Pact Freight Office', good: 'water', tons: 10, from: 'X', planet: here.name, sid: st.systemId, pay: 30000, day: st.day - 6, days: 6, due, cost: 0, profit: 30000 });
    st.cargo.water = 10; h.run = run(st.day + 5); settleRun(here); st.cargo.water = 10; h.run = run(st.day - 1); settleRun(here); out.delivered = [rec().onTime, rec().late];  // the delivery, on the day and late (hired.js settleRun)
    const inspect = inspectionScene(inspectionCause({ water: 50 }, 'Dome Pact', 0, false), currentPlanet()); inspect.choices[inspect.choices.length - 1].run(); out.heave = rec().fines;  // keeping out of it (inspection.js)
    citation(); out.cited = rec().fines;
    hurtHand({ hurt: new Set() }); out.hurt = rec().hurts;
    const c = repelStart(foe(), 'half'); c.covered = true; c.hurt = new Set(); c.dead = []; c.marked = []; Math.random = () => 0.99; repelCasualty(c, st.crew[0]); Math.random = real; out.mate = rec().matesHurt;
    return out;
  });
  assert.deepEqual([r.held, r.lost, r.carried, r.won, r.ran], [1, 1, 1, 1, 1]);
  assert.deepEqual(r.fled, [1, 1]); assert.deepEqual(r.hauls, [1, 1]); assert.deepEqual(r.delivered, [0, 1], 'one on the day, then one late, which resets the run of days'); assert.equal(r.heave, 1); assert.equal(r.cited, 2); assert.equal(r.hurt, 1); assert.equal(r.mate, 1);
  await done();
});

// ---------- the doors (engage.js, icerun.js, bartopics.js): a marked choice only the trait opens ----------

const doorHelpers = () => {
  window.fixEnemy = () => { if (!window.realMakeEnemy) window.realMakeEnemy = makeEnemy; const spare = window.realMakeEnemy({ kind: 'pirate', shipId: 'raider' }); window.makeEnemy = () => spare; };  // a constant random hangs the generators
  window.labels = ev => ev.choices.map(c => c.label);
  window.oddsOf = label => Number((label.match(/(\d+)%/) || [])[1]);
};

test('Cool Head and Runner open marked choices at a pirate contact: a word that sends her off or costs the first volley, and a run with better odds', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers); await ev(doorHelpers);
  const r = await ev(() => {
    const st = setup(), h = hired(), out = {}; burn(); fixEnemy();
    out.plain = labels(contactEvent({ kind: 'pirate' })).filter(l => /\[Cool Head\]|\[Runner\]/.test(l));
    h.record = { repelsHeld: 2, fightsRan: 3 };
    const ev1 = contactEvent({ kind: 'pirate' }), cool = ev1.choices.find(c => /^\[Cool Head\]/.test(c.label)), runner = ev1.choices.find(c => /^\[Runner\]/.test(c.label)), run = ev1.choices.find(c => /^Burn hard to outrun/.test(c.label));
    out.doors = [!!cool, !!runner]; out.odds = { runner: oddsOf(runner.label), run: oddsOf(run.label) };
    const real = Math.random; Math.random = () => 0; G.nextEvent = null; out.won = { text: cool.run(), fight: !!(G.nextEvent && G.nextEvent.fight) };
    Math.random = () => 0.99; G.nextEvent = null; out.lost = { text: cool.run(), fight: !!(G.nextEvent && G.nextEvent.fight), edge: G.nextEvent && G.nextEvent.fight ? G.nextEvent.fight.edge : null };
    G.nextEvent = null; const fled0 = h.record.fled || 0; out.runner = { text: runner.run(), fight: !!(G.nextEvent && G.nextEvent.fight), fled: (h.record.fled || 0) - fled0 }; Math.random = real;
    return out;
  });
  assert.deepEqual(r.plain, [], 'no door without the trait');
  assert.deepEqual(r.doors, [true, true]); assert.equal(r.odds.runner, r.odds.run + 15, `the run's ${r.odds.run}, Runner's ${r.odds.runner}`);
  assert.equal(r.won.fight, false); assert.ok(r.won.text.length > 0, 'the word landed: she breaks off');
  assert.deepEqual([r.lost.fight, r.lost.edge], [true, -1], 'the word failed: she fires first');
  assert.deepEqual([r.runner.fight, r.runner.fled], [true, 1], 'the run failed on 0.99: the fight, and the run counted');
  await done();
});

test('Salvager reads the seam on the rock, and Scarred ends a bar fight with no roll and no bill; an owner has no door', async () => {
  const { ev, done } = await open({ scope: 'full' });
  await ev(helpers); await ev(doorHelpers);
  const r = await ev(() => {
    const st = setup('pilot'), h = hired(), out = {}; burn(); fixEnemy();
    h.run = { ice: { edge: 0 }, tons: 20 }; out.rockPlain = labels(iceStageScene(0)).filter(l => /Salvager/.test(l));
    h.record = { haulsClean: 2 }; const rock = iceStageScene(0), seam = rock.choices.find(c => /^\[Salvager\]/.test(c.label)); st.armor = ship().armor;
    out.seam = { label: seam.label, text: seam.run(), edge: h.run.ice.edge, armor: st.armor === ship().armor };
    const p = makePerson('earth'); registerPerson(p); p.traits = ['rude']; const topic = id => BAR_TOPICS.find(t => t.id === id);
    out.barPlain = topic('fight').make(p, { p, known: false }, { st, bar: 'Bar' }).label;
    h.record = { hurts: 2 }; const door = topic('fight').make(p, { p, known: false }, { st, bar: 'Bar' }), cr = st.credits, real = Math.random; Math.random = () => 0.99;
    const pat = { p, known: false }; out.bar = { label: door.label, text: door.run(), credits: st.credits === cr, opinion: p.opinion }; Math.random = real;
    startGame({ slot: 1, background: 'earth', captain: 'Ines' }); while (G.dialog) finishEvent(); uatBurn('Ceres Station', 'pallas'); G.transit.times = []; G.dialog = null; fixEnemy();
    G.state.career = { post: 'gunner', moves: [], picks: [], skill: { gunner: 200 }, record: { repelsHeld: 5, fightsRan: 5 } };
    out.owner = labels(contactEvent({ kind: 'pirate' })).filter(l => /\[Cool Head\]|\[Runner\]/.test(l));
    return out;
  });
  assert.deepEqual(r.rockPlain, []); assert.match(r.seam.label, /^\[Salvager\]/); assert.equal(r.seam.edge, 2); assert.equal(r.seam.armor, true); assert.ok(r.seam.text.length > 0);
  assert.doesNotMatch(r.barPlain, /Scarred/); assert.match(r.bar.label, /^\[Scarred\]/); assert.equal(r.bar.credits, true, 'no bill'); assert.equal(r.bar.opinion, -2, 'the memory as a won fight\'s'); assert.ok(r.bar.text.length > 0);
  assert.deepEqual(r.owner, []);
  await done();
});

// ---------- the readings (one line at a knob that exists) ----------

test('Marked halves a pirate\'s pay-off and raises the search\'s fine; Runner meets a raider ten km nearer', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers); await ev(doorHelpers);
  const r = await ev(() => {
    const st = setup(), h = hired(), out = {}; burn(); fixEnemy();
    const pay = () => { const c = contactEvent({ kind: 'pirate' }).choices.find(x => /pay|Pay/.test(x.label) && x.cost); const cr = st.credits; c.run(); return cr - st.credits; };
    st.credits = 200000; const plainPay = pay(); st.credits = 200000; const plainFine = heaveToFine();
    h.record = { fines: 2 }; st.credits = 200000; out.pay = [plainPay, pay()]; st.credits = 200000; out.fine = [plainFine, heaveToFine()];
    const band = () => { startDuel({ kind: 'pirate' }, false); const f = G.nextEvent.fight; G.nextEvent = null; return RANGE_BANDS[f.state.band]; };
    h.record = {}; const plainBand = band(); h.record = { fightsRan: 3 }; out.band = [plainBand, band()];
    const navyBand = () => { startDuel({ kind: 'patrol', gov: 'Arcology Pact', shipId: 'cutter' }, false); const f = G.nextEvent.fight; G.nextEvent = null; return RANGE_BANDS[f.state.band]; };
    h.record = {}; const plainNavy = navyBand(); h.record = { fightsRan: 3 }; out.navy = [plainNavy, navyBand()];
    const payGate = () => !contactEvent({ kind: 'pirate' }).choices.find(x => /pay|Pay/.test(x.label) && x.cost).can();
    st.credits = 3000; h.record = {}; out.gate = [payGate()]; h.record = { fines: 2 }; out.gate.push(payGate());
    return out;
  });
  assert.ok(r.pay[0] > 0 && r.pay[1] === Math.round(r.pay[0] / 2), `the pay-off ${r.pay}`);
  assert.equal(r.fine[1], Math.round(r.fine[0] * 1.2), `the fine ${r.fine}`);
  assert.deepEqual(r.band, ['long', 'mid'], 'a raider at 40 km, 30 with Runner');
  assert.equal(r.navy[1], r.navy[0], 'Runner: pirates close faster, a patrol does not (#1010)');
  assert.deepEqual(r.gate.map(Boolean), [true, false], 'with 3,000 cr: the pay-off of 5,000 is closed, and Marked\'s 2,500 is open (#1010)');
  await done();
});

test('Jonah is named in the captain\'s goodbye, and a crew member made for the ship starts at opinion minus one', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const st = setup(), h = hired(), out = {}, g = captainEntry().goodbye;
    out.line = typeof g.jonah; out.plain = { goodbye: captainGoodbye().text.includes(g.jonah), opinion: makeCrewCandidate(st.systemId).opinion };
    h.record = { matesLost: 2 }; out.jonah = { goodbye: captainGoodbye().text.includes(g.jonah), opinion: makeCrewCandidate(st.systemId).opinion };
    return out;
  });
  assert.equal(r.line, 'string', 'the captain has a line for it');
  assert.deepEqual(r.plain, { goodbye: false, opinion: 0 }); assert.deepEqual(r.jonah, { goodbye: true, opinion: -1 });
  await done();
});

// ---------- the review's fix pass ----------

test('a hurt that kills the hand says no moment, the search\'s fine is on the record, and a rock is counted at the arrival, not in the plan', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers); await ev(doorHelpers);
  const r = await ev(() => {
    const st = setup(), h = hired(), out = {}; burn(); fixEnemy();
    const s = repelStart({ foe: window.realMakeEnemy({ kind: 'pirate', shipId: 'raider' }), foeHp: 0, init: 'foe' }, 'half');
    shipSearched(s); out.searched = h.record.fines || 0;
    st.fuel = 1000; const real = window.price; window.price = (pl, g) => (g === 'water' && pl.name === 'Mars' ? 1200 : 500);
    const o = iceOption(st.systemId, 40); iceOption(st.systemId, 40); window.price = real;
    out.planned = { option: !!o, rocks: h.record.rocksFound || 0 };
    h.run = { ice: { edge: 0 }, tons: 20, site: o && o.site }; h.stay = null; G.mode = 'landed'; G.dialog = null; siteArrival(st); out.arrived = h.record.rocksFound || 0; G.dialog = null;
    h.record = { ...h.record, hurts: 1 }; h.traitsTold = [];
    const f = { hurt: new Set(), dead: [], marked: [], ashore: false, d: { foe: window.realMakeEnemy({ kind: 'pirate', shipId: 'raider' }), foeHp: 0 }, state: { kind: 'ship' }, spec: { kind: 'pirate' } };  // made before the stub: the foe's maker draws
    const rnd = Math.random; let first = true; Math.random = () => { if (first) { first = false; return 0; } return rnd(); };  // the death roll lands; a constant random would hang the ending's generators
    hurtHand(f); Math.random = rnd; out.death = { told: [...h.traitsTold], died: !!h.died };
    return out;
  });
  assert.equal(r.searched, 1, 'the search charges the fine, and it counts');
  assert.deepEqual(r.planned, { option: true, rocks: 0 }, 'planning twice on one day counts nothing');
  assert.equal(r.arrived, 1, 'the arrival counts the rock');
  assert.deepEqual(r.death, { told: [], died: true }, 'a dead hand gets no moment');
  await done();
});
