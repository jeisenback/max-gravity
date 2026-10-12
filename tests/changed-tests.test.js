'use strict';

// tools/changed-tests.js: which test files a change can affect (#401). A pure function, so no browser here.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { select, withHarnesses } = require('../tools/changed-tests');

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

test('the scene editor runs its own tests, and so does a change to the script list it copies', () => {
  const both = ['tests/editor.test.js', 'tests/editorforms.test.js', 'tests/editorfreq.test.js', 'tests/editorhired.test.js', 'tests/editornew.test.js', 'tests/editorpreview.test.js', 'tests/editorsave.test.js'], withEditor = { ...tests, ...Object.fromEntries(both.map(f => [f, ''])) };
  for (const f of ['editor.js', 'editor.html', 'editor-preview.html']) assert.deepEqual(select([f], { tests: withEditor, sources }).files, both, f);
  const r = select(['index.html'], { tests: withEditor, sources });
  for (const t of both) assert.ok(r.files.includes(t), `index.html runs ${t}`);
  const more = { ...withEditor, 'tests/editorlines.test.js': '' };
  assert.ok(select(['editor.js'], { tests: more, sources }).files.includes('tests/editorlines.test.js'), 'a file added to the editor\'s tests is picked up without a list to edit (#583)');
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

test('a pin is selected by the scripts its harness plays, though its test file names none (#515)', () => {
  const pins = { 'tests/beatpin.test.js': "const { playBeats } = require('./beatplay');", 'tests/other.test.js': 'test("other", () => { market(); })' };
  const harnesses = { 'tests/beatplay.js': 'const playBeats = () => { startDuel(); raidScene(); };' };
  const merged = withHarnesses(pins, harnesses);
  assert.deepEqual(select(['js/duel.js'], { tests: merged, sources: { 'js/duel.js': 'function startDuel() {}' } }).files, ['tests/beatpin.test.js']);
  assert.deepEqual(select(['js/duel.js'], { tests: pins, sources: { 'js/duel.js': 'function startDuel() {}' } }).full, true, 'without the harness it is not found');
  assert.equal(merged['tests/other.test.js'], pins['tests/other.test.js'], 'a test with no harness is unchanged');
});

test('a text file runs every pin, since the pins play it through other scripts (#515)', () => {
  const pins = { 'tests/apin.test.js': '', 'tests/bpin.test.js': '', 'tests/other.test.js': 'test("other", () => { market(); })' };
  const r = select(['js/peopletext.js'], { tests: pins, sources: { 'js/peopletext.js': 'const TRAITS = {};' } });
  assert.equal(r.full, false);
  assert.deepEqual(r.files, ['tests/apin.test.js', 'tests/bpin.test.js']);
  const plain = select(['js/people.js'], { tests: pins, sources: { 'js/people.js': 'function market() {}' } });
  assert.deepEqual(plain.files, ['tests/other.test.js'], 'a script that is not a text file does not run them all');
});

test('a captain\'s or a story\'s file is mapped by its key and runs every pin, not the whole suite (#568)', () => {
  const pins = { 'tests/apin.test.js': '', 'tests/bpin.test.js': '', 'tests/cato.test.js': 'test("cato", () => { assert.ok(CAPTAINS.cato); })', 'tests/other.test.js': 'test("other", () => { market(); })' };
  const sources = { 'js/captains/cato.js': 'CAPTAINS.cato = {};', 'js/stories/ports.js': 'STORIES.ports = {};' };
  const r = select(['js/captains/cato.js'], { tests: pins, sources });
  assert.equal(r.full, false);
  assert.deepEqual(r.files, ['tests/apin.test.js', 'tests/bpin.test.js', 'tests/cato.test.js']);
  assert.deepEqual(select(['js/stories/ports.js'], { tests: pins, sources }).files, ['tests/apin.test.js', 'tests/bpin.test.js'], 'a story no test names still runs the pins');
  assert.equal(select(['js/captains/missing.js'], { tests: pins, sources }).full, true, 'a file it cannot read is still the whole suite');
  assert.equal(select(['js/captains/a/b.js'], { tests: pins, sources }).full, true, 'two levels down is not mapped');
});
