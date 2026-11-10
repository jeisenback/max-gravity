'use strict';

// Traits (js/traits.js, docs/superpowers/specs/2026-11-10-traits-design.md): the hand's record of counts, the eight traits a run of counts earns, and the
// words of the record. Plain Node through tests/nodecontext.js; the hand is built by hand.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./nodecontext');

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
