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

test('the page carries a Content Security Policy and no inline event handlers', () => {
  const root = path.resolve(__dirname, '..');
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const csp = html.match(/http-equiv="Content-Security-Policy" content="([^"]*)"/);
  assert.ok(csp, 'index.html has the policy');
  assert.match(csp[1], /object-src 'none'/);
  assert.match(csp[1], /base-uri 'none'/);
  assert.doesNotMatch(csp[1], /script-src[^;]*'unsafe-inline'/, 'scripts never run inline');
  const files = ['index.html', ...fs.readdirSync(path.join(root, 'js')).filter(f => f.endsWith('.js')).map(f => `js/${f}`)];
  for (const f of files) {
    const bad = fs.readFileSync(path.join(root, f), 'utf8').match(/\son[a-z]+\s*=\s*"/g);
    assert.equal(bad, null, `${f}: inline handler ${bad}`);
  }
});
