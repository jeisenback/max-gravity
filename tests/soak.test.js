'use strict';

// The soak tool (tools/soak.js): sails the captain's runs and reports them.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { closeBrowser } = require('./helpers');
const { soak } = require('../tools/soak');

test('the soak sails the captain\'s runs and reports them', async () => {
  const r = await soak({ seed: 1, legs: 6 });
  assert.equal(r.runs, 6);
  assert.deepEqual(r.bad, []);
  assert.deepEqual(r.errors, []);
  assert.ok(Number.isFinite(r.avgPayPerRun) && r.avgPayPerRun > 0);
  assert.ok(Number.isFinite(r.avgDaysPerRun));
  assert.ok(Object.keys(r.scenes).length > 0);
});

after(closeBrowser);
