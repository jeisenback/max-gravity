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

// #945: a merge to main does not run the suite again (the pull request's run just passed on the same code); the suite runs on every pull request and by
// hand, and coverage still runs on main (#754).
test('the suite runs on a pull request and by hand, not again on main after a merge; coverage still runs on main', () => {
  const yml = fs.readFileSync(path.resolve(__dirname, '..', '.github', 'workflows', 'test.yml'), 'utf8');
  const job = name => (yml.match(new RegExp(`^  ${name}:\\n([\\s\\S]*?)(?=^  [\\w-]+:\\n|(?![\\s\\S]))`, 'm')) || [])[1] || '';
  assert.match(yml, /^\s+workflow_dispatch:/m, 'it can be run by hand');
  for (const name of ['shard', 'test']) assert.match(job(name), /^\s+if:.*github\.event_name != 'push'/m, `${name} skips a push to main`);
  for (const name of ['changes', 'coverage-shard', 'coverage']) assert.doesNotMatch(job(name), /event_name != 'push'/, `${name} still runs on main`);
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
