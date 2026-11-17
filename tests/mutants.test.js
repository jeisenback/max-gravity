'use strict';

// tools/mutants.js: the planted-bug runner (#1328, part of #1326). Its parts on a small git repo, so no browser here; the run itself is `node tools/mutants.js`.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { loadMutants, applyMutant, restore, failedTests, caught } = require('../tools/mutants');

const TOOL = path.join(__dirname, '..', 'tools', 'mutants.js');

// A repo with one committed script, js/a.js.
function repo(src = 'const a = 1;\nconst b = a + 1;\n') {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mutants-'));
  const git = (...a) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...a], { cwd: dir, encoding: 'utf8' });
  fs.mkdirSync(path.join(dir, 'js'));
  fs.writeFileSync(path.join(dir, 'js', 'a.js'), src);
  git('init', '-q'); git('add', '.'); git('commit', '-q', '-m', 'start');
  return dir;
}

test('a bug applies once and restores byte for byte', () => {
  const dir = repo(), file = path.join(dir, 'js', 'a.js'), before = fs.readFileSync(file);
  try {
    applyMutant(dir, { name: 'off-by-one', file: 'js/a.js', find: 'a + 1', replace: 'a + 2' });
    assert.equal(fs.readFileSync(file, 'utf8'), 'const a = 1;\nconst b = a + 2;\n');
    restore(dir, 'js/a.js');
    assert.ok(fs.readFileSync(file).equals(before), 'the file is back as it was');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('a bug whose text is gone, or is found more than once, fails the run by name', () => {
  const dir = repo('x;\nx;\n');
  try {
    assert.throws(() => applyMutant(dir, { name: 'gone', file: 'js/a.js', find: 'nope', replace: 'x' }), /gone: text not found/);
    assert.throws(() => applyMutant(dir, { name: 'twice', file: 'js/a.js', find: 'x;', replace: 'y;' }), /twice: text found 2 times/);
    assert.equal(fs.readFileSync(path.join(dir, 'js', 'a.js'), 'utf8'), 'x;\nx;\n', 'a bug that does not apply changes nothing');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('refuses to run on uncommitted changes in js/, which restoring would throw away', () => {
  const dir = repo();
  try {
    fs.writeFileSync(path.join(dir, 'js', 'a.js'), 'work in progress\n');
    const r = spawnSync('node', [TOOL], { cwd: dir, encoding: 'utf8' });
    assert.equal(r.status, 2);
    assert.match(r.stderr, /js\/ has uncommitted changes/);
    assert.equal(fs.readFileSync(path.join(dir, 'js', 'a.js'), 'utf8'), 'work in progress\n', 'the change is left alone');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('failedTests reads the names of the failing tests from TAP, nested ones too', () => {
  assert.deepEqual(failedTests('ok 1 - a\nnot ok 2 - b c\n    not ok 1 - inner one\n# fail 2'), ['b c', 'inner one']);
  assert.deepEqual(failedTests('ok 1 - a\n# fail 0'), []);
});

test('a bug is caught by at least min failing tests and by a failing test for each by entry', () => {
  const m = { name: 'm', min: 2, by: ['sail journey'] };
  assert.equal(caught(m, ['the sail journey: Sail leaves port', 'other']), true);
  assert.equal(caught(m, ['the sail journey: Sail leaves port']), false, 'fewer than min');
  assert.equal(caught(m, ['one', 'two']), false, 'none of them is the by test');
  assert.equal(caught({ name: 'n', min: 1, by: [] }, []), false, 'nothing failed');
});

test('the planted bugs are each named once, in a file that exists, with defaults for min and by', () => {
  const list = loadMutants(path.join(__dirname, '..', 'tools', 'mutants.json'));
  assert.ok(list.length >= 6);
  assert.equal(new Set(list.map(m => m.name)).size, list.length, 'names are unique');
  for (const m of list) {
    assert.ok(fs.existsSync(path.join(__dirname, '..', m.file)), `${m.name}: ${m.file} exists`);
    assert.ok(m.find && m.find !== m.replace, `${m.name}: a change`);
    assert.ok(m.min >= 1 && Array.isArray(m.by), `${m.name}: min and by`);
  }
});
