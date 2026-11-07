'use strict';

// The lender's masters (chapter two, #891, docs/superpowers/specs/2026-11-07-chapter-two-start-design.md): four in its pool, three sent to the co-op,
// drawn with the co-op's own dice so the draw moves no other system's rolls. In plain Node.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./nodecontext');

const files = ['js/captains.js', 'js/captains/saran.js', 'js/captains/kessler.js', 'js/captains/mensah.js', 'js/captains/belanger.js'];
const { MASTERS, masterDraw, coopRand, MASTER_CAPTAINS: CAPTAINS } = load(files, { Mods: { register() {} }, OPINION: {} }, ['MASTERS', 'masterDraw', 'coopRand', 'MASTER_CAPTAINS']);
const plain = x => JSON.parse(JSON.stringify(x));  // arrays from the context have its prototypes
const seeded = seed => coopRand({ hired: { signed: seed, since: 3 } });

test('the pool is the four masters, each marked a master with a lean', () => {
  assert.deepEqual(plain(MASTERS), ['saran', 'kessler', 'mensah', 'belanger']);
  const leans = plain(MASTERS.map(k => CAPTAINS[k].leans));
  assert.deepEqual(leans, ['tycho', 'lender', 'kaur', 'ballast']);
  for (const k of MASTERS) { assert.equal(CAPTAINS[k].master, true, k); assert.equal(CAPTAINS[k].xo, undefined, `${k} has no first officer`); }
  assert.deepEqual(plain(MASTERS.map(k => CAPTAINS[k].captain)), [{ trade: 3, nerve: 3, thrift: 4 }, { trade: 4, nerve: 2, thrift: 5 }, { trade: 2, nerve: 5, thrift: 2 }, { trade: 3, nerve: 4, thrift: 2 }]);
});

test('the lender sends three different masters, the same three for the same seed', () => {
  const a = masterDraw(seeded(12)), b = masterDraw(seeded(12));
  assert.equal(a.length, 3); assert.equal(new Set(a).size, 3);
  for (const k of a) assert.ok(MASTERS.includes(k), k);
  assert.deepEqual(plain(a), plain(b));
});

test('over many runs every master is sent', () => {
  const sent = new Set();
  for (let s = 1; s <= 40; s++) for (const k of masterDraw(seeded(s))) sent.add(k);
  assert.deepEqual([...sent].sort(), [...MASTERS].sort());
});

test('the co-op\'s dice keep their place on the record', () => {
  const st = { hired: { signed: 5, since: 3 } }, r = coopRand(st), first = r();
  assert.equal(typeof st.hired.coopRng, 'number');
  const again = coopRand({ hired: { signed: 5, since: 3 } })();
  assert.equal(first, again); assert.notEqual(coopRand(st)(), first, 'the next roll moves on');
});
