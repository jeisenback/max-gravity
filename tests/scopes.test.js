'use strict';

// tools/scopes.js: the count of the suite's page opens by build (#571). Pure text, so there is no browser here.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { countScopes } = require('../tools/scopes');

test('a call that names the full build, one that names the shipped build and one that names neither are counted apart', () => {
  const r = countScopes({
    'a.test.js': "const g = await open({ scope: 'full' });\nconst h = await open();",
    'b.test.js': "const g = await open({ scope: 'earth-hired', seed: 2 });\nconst h = await open({ viewport: { width: 390, height: 844 } });",
  });
  assert.deepEqual(r, { calls: 4, full: 1, narrow: 1, byDefault: 2 });
});

test('the suite itself opens the shipped build by default', () => {
  const fs = require('node:fs'), path = require('node:path');
  assert.match(fs.readFileSync(path.join(__dirname, 'helpers.js'), 'utf8'), /scope = 'earth-hired'/);
});
