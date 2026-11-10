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

test('the table has the eight traits in order, each with a name, a speaker and a rule; the record has nineteen keys', () => {
  assert.deepEqual([...HAND_TRAITS.map(t => t.id)], IDS);
  for (const t of HAND_TRAITS) { assert.ok(t.name, t.id); assert.ok(['captain', 'engineer', 'shipper', null].includes(t.by), `${t.id}: ${t.by}`); assert.equal(typeof t.earned, 'function'); }
  assert.equal(RECORD_KEYS.length, 19);
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

test('each site writes its count: the repel, the assault, the fight\'s end, the run, the ice home, the delivery, the heave-to, the citation, the rock, the hand hurt, a casualty', async () => {
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
    const real = Math.random; startShipFight({ kind: 'patrol', gov: 'Arcology Compact' }, true); out.fled = [rec().fled, rec().ranFromNavy]; G.nextEvent = null; G.dialog = null;  // counted before the roll, got away or not
    h.run = { ice: { edge: 3 }, tons: 20 }; iceHome(3); iceHome(-2); out.hauls = [rec().haulsClean, rec().haulsBad];
    const stop = contactEvent({ kind: 'patrol', gov: 'Arcology Compact' }); stop.choices.find(c => /heave|Cut your drive/i.test(c.label)).run(); out.heave = rec().fines;
    citation(); out.cited = rec().fines;
    hurtHand({ hurt: new Set() }); out.hurt = rec().hurts;
    const c = repelStart(foe(), 'half'); c.covered = true; c.hurt = new Set(); c.dead = []; c.marked = []; Math.random = () => 0.99; repelCasualty(c, st.crew[0]); Math.random = real; out.mate = rec().matesHurt;
    return out;
  });
  assert.deepEqual([r.held, r.lost, r.carried, r.won, r.ran], [1, 1, 1, 1, 1]);
  assert.deepEqual(r.fled, [1, 1]); assert.deepEqual(r.hauls, [1, 1]); assert.equal(r.heave, 1); assert.equal(r.cited, 2); assert.equal(r.hurt, 1); assert.equal(r.mate, 1);
  await done();
});
