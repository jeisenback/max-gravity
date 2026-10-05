'use strict';

// The test workflow (.github/workflows/test.yml) only checks out the code and runs the tests, so its token should read and
// nothing else. Plain Node, no browser.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('the test workflow asks for read-only access to the repository', () => {
  const yml = fs.readFileSync(path.resolve(__dirname, '..', '.github', 'workflows', 'test.yml'), 'utf8');
  assert.match(yml, /^permissions:\s*\n\s+contents: read\s*$/m, 'a top-level permissions block with contents: read');
  assert.doesNotMatch(yml, /(write|admin)\b/, 'and no write access anywhere');
});
