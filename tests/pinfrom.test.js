'use strict';

// The tool that writes a pin again from the code at a commit (tools/pin-from.js, #457): how it compares two pins, and the whole run in a small repository of its own.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { compare, names, parse, run } = require('../tools/pin-from');

test('records are known by their key, else their id with what tells them apart, else their place; a name used twice is numbered', () => {
  assert.deepEqual(names([{ key: 'a' }, { id: 'b', seed: 2 }, { id: 'b', seed: 3 }, 7, { id: 'c' }, { id: 'c' }]), ['a', 'b:2', 'b:3', '#3', 'c', 'c (2)']);
});

test('what changed, what is new and what is gone, by name; a field the harness was extended to record can be left out', () => {
  const was = [{ key: 'a', text: 'x' }, { key: 'b', text: 'y' }, { key: 'c', text: 'z' }];
  const now = [{ key: 'a', text: 'x', mem: 'm' }, { key: 'b', text: 'Y' }, { key: 'd', text: 'w' }];
  assert.deepEqual(compare(was, now), { same: false, changed: ['a', 'b'], added: ['d'], removed: ['c'] });
  assert.deepEqual(compare(was, now, ['mem']), { same: false, changed: ['b'], added: ['d'], removed: ['c'] });
  assert.equal(compare(was, was).same, true);
  assert.equal(compare(was, [{ key: 'a', text: 'x', mem: 'm' }, ...was.slice(1)], ['mem']).same, true, 'only the added field differs');
  assert.deepEqual(compare({ a: 1 }, { a: 2 }), { same: false, changed: ['(the whole file)'], added: [], removed: [] }, 'a file that is not a list is compared whole');
});

test('the options', () => {
  assert.deepEqual(parse(['--ref', 'abc', '--ignore', 'mem,log', '--write', 'tests/x.test.js']), { ref: 'origin/main'.replace('origin/main', 'abc'), ignore: ['mem', 'log'], write: true, tests: ['tests/x.test.js'] });
  assert.throws(() => parse([]), /name the pin tests/);
  assert.throws(() => parse(['--nope', 'tests/x.test.js']), /unknown option/);
});

test('a run in a repository of its own: the pin is written from the code at the commit, what differs is reported, and --write takes it', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pin-repo-'));
  const sh = (...a) => assert.equal(spawnSync('git', a, { cwd: root, encoding: 'utf8' }).status, 0, a.join(' '));
  try {
    fs.mkdirSync(path.join(root, 'tests', 'fixtures'), { recursive: true });
    fs.writeFileSync(path.join(root, 'value.js'), "module.exports = { words: ['one', 'two'] };\n");
    fs.writeFileSync(path.join(root, 'tests', 'x.test.js'), `const { test } = require('node:test'); const fs = require('node:fs'); const path = require('node:path');
test('x', () => { const got = require('../value').words.map((w, i) => ({ key: 'w' + i, text: w, ...(global.__extra ? {} : {}) })); const f = path.join(__dirname, 'fixtures', 'x-pin.json');
  if (process.env.PIN_WRITE) fs.writeFileSync(f, JSON.stringify(got, null, 1) + '\\n'); });
`);
    fs.writeFileSync(path.join(root, 'tests', 'fixtures', 'x-pin.json'), '[]\n');
    sh('init', '-q'); sh('config', 'user.email', 't@t'); sh('config', 'user.name', 't'); sh('add', '-A'); sh('commit', '-qm', 'one');
    // the code changes after the commit (uncommitted), and the harness is extended to record more in the working tree
    fs.writeFileSync(path.join(root, 'value.js'), "module.exports = { words: ['one', 'TWO', 'three'] };\n");
    const lines = [];
    const first = run(['--ref', 'HEAD', 'tests/x.test.js'], { root, out: l => lines.push(l) });
    assert.equal(first.code, 0);
    assert.ok(lines.some(l => /x-pin\.json: 0 changed, 2 new, 0 gone/.test(l)), lines.join('\n'));
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root, 'tests', 'fixtures', 'x-pin.json'), 'utf8')), [], 'nothing is written without --write');
    const second = run(['--ref', 'HEAD', '--write', 'tests/x.test.js'], { root, out: () => {} });
    assert.equal(second.moved, 1);
    const written = JSON.parse(fs.readFileSync(path.join(root, 'tests', 'fixtures', 'x-pin.json'), 'utf8'));
    assert.deepEqual(written.map(r => r.text), ['one', 'two'], 'the words of the code at the commit, not the working tree');
    assert.equal(spawnSync('git', ['worktree', 'list'], { cwd: root, encoding: 'utf8' }).stdout.trim().split('\n').length, 1, 'the checkout is gone');
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test('a commit that cannot be checked out is said, not thrown', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pin-repo-'));
  try {
    spawnSync('git', ['init', '-q'], { cwd: root });
    const lines = [];
    assert.equal(run(['--ref', 'nope', 'tests/x.test.js'], { root, out: l => lines.push(l) }).code, 2);
    assert.match(lines[0], /could not check out nope/);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
