'use strict';

// The lender's masters (chapter two, #891, #1045): four people met in the war, none aboard, each with a lean and where chapter two puts them. In plain Node.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./nodecontext');

const files = ['js/captains.js', 'js/captains/saran.js', 'js/captains/kessler.js', 'js/captains/mensah.js', 'js/captains/belanger.js'];
const { MASTER_CAPTAINS: CAPTAINS } = load(files, { Mods: { register() {} }, OPINION: {} }, ['MASTER_CAPTAINS']);
const plain = x => JSON.parse(JSON.stringify(x));  // arrays from the context have its prototypes
const KEYS = ['saran', 'kessler', 'mensah', 'belanger'];

test('the four masters, each marked a master with a lean and a place, and no first officer', () => {
  assert.deepEqual(Object.keys(CAPTAINS), KEYS);
  assert.deepEqual(plain(KEYS.map(k => CAPTAINS[k].leans)), ['tycho', 'lender', 'kaur', 'ballast']);
  assert.deepEqual(plain(KEYS.map(k => CAPTAINS[k].at)), ['tycho-charter', 'coop-hull', 'ceres', 'ballast-convoy']);
  for (const k of KEYS) { assert.equal(CAPTAINS[k].master, true, k); assert.equal(CAPTAINS[k].xo, undefined, `${k} has no first officer`); }
  assert.deepEqual(plain(KEYS.map(k => CAPTAINS[k].captain)), [{ trade: 3, nerve: 3, thrift: 4 }, { trade: 4, nerve: 2, thrift: 5 }, { trade: 2, nerve: 5, thrift: 2 }, { trade: 3, nerve: 4, thrift: 2 }]);
});
