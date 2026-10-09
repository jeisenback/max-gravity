'use strict';

// tools/changed-tests.js: which test files a change can affect (#401). A pure function, so no browser here.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { select } = require('../tools/changed-tests');

const tests = {
  'tests/sound.test.js': 'test("sfx", () => { Sfx.toggle(); })',
  'tests/ui.test.js': 'test("ui", () => { UI.render(); })',
  'tests/layout.test.js': 'test("layout", () => {})',
  'tests/shell.test.js': 'test("shell", () => { railHtml(); })',
  'tests/globals.test.js': 'test("globals", () => {})',
  'tests/other.test.js': 'test("other", () => { market(); })',
};
const sources = { 'js/audio.js': 'const Sfx = {\n};\nfunction playIt() {}', 'js/shell.js': 'function railHtml() {}', 'js/lonely.js': 'const nobodyUsesThis = 1;' };
const pick = changed => select(changed, { tests, sources });

test('a changed test file runs itself', () => {
  assert.deepEqual(pick(['tests/ui.test.js']).files, ['tests/ui.test.js']);
});

test('a changed script runs the tests that use its names, and the globals check', () => {
  const r = pick(['js/audio.js']);
  assert.deepEqual(r.files, ['tests/globals.test.js', 'tests/sound.test.js']);
  assert.ok(r.why.some(w => /Sfx/.test(w)), 'says which name matched');
});

test('the shell, the stylesheet and the page run the layout, shell and ui tests', () => {
  for (const f of ['style.css', 'index.html', 'js/shell.js']) {
    const r = pick([f]);
    for (const t of ['tests/layout.test.js', 'tests/shell.test.js', 'tests/ui.test.js']) assert.ok(r.files.includes(t), `${f} runs ${t}`);
    assert.ok(!r.files.includes('tests/other.test.js'), `${f} does not run unrelated tests`);
  }
});

test('the script runs its own test', () => {
  assert.deepEqual(select(['tools/changed-tests.js'], { tests: { ...tests, 'tests/changed-tests.test.js': '' }, sources }).files, ['tests/changed-tests.test.js']);
});

test('the scene index runs its own test, and so does a change to the script list it copies', () => {
  const withEditor = { ...tests, 'tests/editor.test.js': '' };
  assert.deepEqual(select(['editor.js'], { tests: withEditor, sources }).files, ['tests/editor.test.js']);
  assert.deepEqual(select(['editor.html'], { tests: withEditor, sources }).files, ['tests/editor.test.js']);
  assert.ok(select(['index.html'], { tests: withEditor, sources }).files.includes('tests/editor.test.js'));
});

test('the prose report runs its own test', () => {
  assert.deepEqual(select(['tools/prose-lint.js'], { tests: { ...tests, 'tests/prose-lint.test.js': '' }, sources }).files, ['tests/prose-lint.test.js']);
});

test('a generated json under docs needs no tests', () => {
  const r = pick(['docs/prose-baseline.json']);
  assert.deepEqual(r.files, []); assert.equal(r.full, false);
});

test('markdown alone needs no tests', () => {
  const r = pick(['README.md', 'docs/superpowers/plans/x.md']);
  assert.deepEqual(r.files, []); assert.equal(r.full, false);
});

test('anything it cannot map falls back to the full suite', () => {
  for (const changed of [['package.json'], ['tests/helpers.js'], ['js/lonely.js'], ['js/unknown.js'], ['audio.wav']]) {
    assert.equal(pick(changed).full, true, `${changed} runs everything`);
  }
});

test('one unmappable file among mapped ones still runs everything', () => {
  assert.equal(pick(['js/audio.js', 'package.json']).full, true);
});

test('no change runs nothing', () => {
  const r = pick([]);
  assert.deepEqual(r.files, []); assert.equal(r.full, false);
});
