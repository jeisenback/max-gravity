'use strict';

// The range a ship fight starts at (js/range.js, #710), in plain Node.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./nodecontext');

const { rangeBand, bandIndex, rangeAtContact, RANGE_BANDS } = load(['js/range.js'], {}, ['rangeBand', 'bandIndex', 'rangeAtContact', 'RANGE_BANDS']);

test('the bands: knife under 3 km, close under 10, mid under 40, long beyond', () => {
  assert.deepEqual([1.5, 3, 9.9, 10, 39, 40, 200].map(rangeBand), ['knife', 'close', 'close', 'mid', 'mid', 'long', 'long']);
  assert.deepEqual([1.5, 6, 25, 50].map(bandIndex), [0, 1, 2, 3]); assert.equal(RANGE_BANDS.length, 4);
});

test('she is met far out as a raider or a corsair, and at gun range as a patrol', () => {
  assert.deepEqual(['grapple', 'torpedo', 'gun', 'other'].map(rangeAtContact), [40, 40, 30, 40]);
  assert.deepEqual(['grapple', 'gun'].map(s => RANGE_BANDS[bandIndex(rangeAtContact(s))]), ['long', 'mid']);
});
