'use strict';

// The coverage floor (tools/floor.js, tools/coverage-floor.json, `npm run coverage -- --check`): it names the files that fell and by how many lines,
// and the command exits non-zero. No browser here: the check is handed rows, and a fixture of page coverage.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { checkFloor, describe, globToRegExp } = require('../tools/floor');

const root = path.resolve(__dirname, '..');
const row = (file, code, hit) => ({ file, code, hit, pct: (100 * hit) / code, missed: Array.from({ length: code - hit }, (_, i) => i + 1) });
const floor = { default: 90, globs: ['js/hired*.js', 'js/captains/*.js', 'js/ui.js'], files: { 'js/hired.js': 96, 'js/ui.js': 90 } };
const one = { default: 90, globs: ['js/hired.js'], files: { 'js/hired.js': 96 } };

test('a glob matches inside one folder', () => {
  assert.ok(globToRegExp('js/hired*.js').test('js/hiredevents.js'));
  assert.ok(globToRegExp('js/hired*.js').test('js/hired.js'));
  assert.ok(!globToRegExp('js/hired*.js').test('js/captains/hired.js'));
  assert.ok(!globToRegExp('js/captains/*.js').test('js/captains.js'));
  assert.ok(!globToRegExp('js/ui.js').test('js/uixjs'));
});

test('a file under its floor fails, with how many lines would bring it back', () => {
  const r = checkFloor([row('js/hired.js', 400, 372), row('js/ui.js', 400, 372), row('js/game.js', 100, 10)], floor);
  assert.deepEqual(r.failures.map(f => f.file), ['js/hired.js']);  // 93 percent against 96; ui.js is over its 90; game.js is not listed
  assert.equal(r.failures[0].short, 12, '384 lines of 400 reach 96 percent');
  assert.equal(r.failures[0].missed.length, 28);
  const text = describe(r);
  assert.match(text, /js\/hired\.js/); assert.match(text, /12 more lines/); assert.doesNotMatch(text, /game\.js/);
});

test('a file at its floor passes, and one more line short does not', () => {
  assert.deepEqual(checkFloor([row('js/hired.js', 400, 384)], one).failures, []);
  assert.equal(checkFloor([row('js/hired.js', 400, 383)], one).failures.length, 1);
});

test('a new file in a glob starts at the default, and a listed file no test loads is a failure', () => {
  const r = checkFloor([row('js/captains/new.js', 100, 85), row('js/captains/ok.js', 100, 95)], floor, ['js/captains/new.js', 'js/captains/ok.js', 'js/captains/unloaded.js', 'js/hiredevents.js']);
  const by = Object.fromEntries(r.failures.map(f => [f.file, f]));
  assert.deepEqual(Object.keys(by).sort(), ['js/captains/new.js', 'js/captains/unloaded.js', 'js/hired.js', 'js/hiredevents.js', 'js/ui.js']);
  assert.equal(by['js/captains/new.js'].min, 90); assert.ok(by['js/captains/unloaded.js'].missing);
  assert.match(describe(r), /no coverage data/);
});

test('the real floor names real files, and every number is a percentage', () => {
  const real = JSON.parse(fs.readFileSync(path.join(root, 'tools/coverage-floor.json'), 'utf8')), res = real.globs.map(globToRegExp);
  assert.ok(real.default > 0 && real.default <= 100);
  for (const [file, min] of Object.entries(real.files)) {
    assert.ok(fs.existsSync(path.join(root, file)), `${file} exists`);
    assert.ok(res.some(re => re.test(file)), `${file} is in a glob`);
    assert.ok(min > 0 && min <= 100, `${file}: ${min}`);
  }
  for (const g of real.globs) assert.ok(fs.readdirSync(path.join(root, path.dirname(g))).some(f => globToRegExp(g).test(`${path.dirname(g)}/${f}`)), `${g} matches a file`);
});

test('the command exits non-zero and names the file when page coverage is under the floor', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'floor-'));
  try {
    const source = fs.readFileSync(path.join(root, 'js/hired.js'), 'utf8');
    // One page that loaded js/hired.js and ran none of it.
    fs.writeFileSync(path.join(dir, 'page-0.json'), JSON.stringify([{ url: `file://${path.join(root, 'js/hired.js')}`, length: source.length, functions: [{ functionName: '', ranges: [{ startOffset: 0, endOffset: source.length, count: 0 }] }] }]));
    const r = spawnSync(process.execPath, [path.join(root, 'tools/coverage.js'), '--from', dir, '--check'], { cwd: root, encoding: 'utf8' });
    assert.equal(r.status, 1, r.stderr);
    assert.match(r.stdout, /Coverage floor: \d+ of \d+ files under\./);
    assert.match(r.stdout, /js\/hired\.js: 0\.0 percent, floor 97; about \d+ more lines to test/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
