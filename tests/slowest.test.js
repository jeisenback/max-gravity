'use strict';

// tools/slowest.js: the slowest tests, listed after a run (#403). The formatting is a pure function.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { slowest } = require('../tools/slowest');

const rows = [{ ms: 1200, name: 'b' }, { ms: 17040, name: 'a' }, { ms: 50, name: 'd' }, { ms: 7700, name: 'c' }];

test('lists the slowest first, to the count asked for', () => {
  const lines = slowest(rows, 3).split('\n');
  assert.equal(lines.length, 3);
  assert.match(lines[0], /17\.0 s\s+a$/);
  assert.match(lines[1], /7\.7 s\s+c$/);
  assert.match(lines[2], /1\.2 s\s+b$/);
});

test('fewer tests than the count lists them all, and none lists nothing', () => {
  assert.equal(slowest(rows, 10).split('\n').length, 4);
  assert.equal(slowest([], 10), '');
});

test('does not change the rows it is given', () => {
  const copy = rows.map(r => ({ ...r }));
  slowest(rows, 2);
  assert.deepEqual(rows, copy);
});
