'use strict';

// tools/voices.js: the bundle for the voice review (#646). Pure functions on made-up sources and a stub for git, so there is no browser here.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { quotedSpans, passageSet, collect, bundle, main } = require('../tools/voices');

const SRC = [
  "const a = 'Cato says a long thing here. \"Sit down, you are not in anyone\\'s way,\" and he waits.';",
  "const b = 'Two joined ' + 'pieces make one passage. \"Hold the end\" ' + 'and he does the rest.';",
  "const c = 'short';",
  "const d = 'No quoted speech in this passage at all.';",
  "// \"a comment with quoted words inside it\"",
].join('\n');

test('quotedSpans finds the quoted lines of each passage with the text around them and the line they start on', () => {
  const s = quotedSpans(SRC);
  assert.equal(s.length, 2, 'a comment, a short string and a string with no quote give nothing');
  assert.deepEqual([s[0].line, s[0].quote], [1, '"Sit down, you are not in anyone\'s way,"']);
  assert.equal(s[0].before, 'Cato says a long thing here. ');
  assert.equal(s[0].after, ' and he waits.');
  assert.equal(s[1].quote, '"Hold the end"', 'literals joined by + are read as one passage');
  assert.equal(s[1].line, 2);
  assert.equal(s[1].before, 'Two joined pieces make one passage. ');
});

test('with an earlier source only the passages it did not have are kept', () => {
  const base = SRC.replace('Hold the end', 'Hold the other end');
  const now = collect({ 'js/a.js': SRC }, { 'js/a.js': base });
  assert.deepEqual(now.map(s => [s.n, s.file, s.quote]), [[1, 'js/a.js', '"Hold the end"']]);
  assert.ok(passageSet(base).has('Cato says a long thing here. "Sit down, you are not in anyone\'s way," and he waits.'));
  assert.equal(collect({ 'js/a.js': SRC }, { 'js/a.js': SRC }).length, 0, 'nothing changed, nothing to rate');
  assert.equal(collect({ 'js/a.js': SRC }).length, 2, 'with no earlier source every line is kept');
});

test('the bundle holds the rubric, the cards and the numbered lines with the line marked in its text', () => {
  const spans = collect({ 'js/a.js': SRC, 'js/b.js': SRC });
  assert.deepEqual(spans.map(s => s.n), [1, 2, 3, 4]);
  const text = bundle(spans, { rubric: 'THE RUBRIC', cards: { cato: 'CATO CARD', ines: 'INES CARD' } });
  assert.match(text, /## Rubric\n\nTHE RUBRIC\n/);
  assert.match(text, /### cato\n\nCATO CARD\n/);
  assert.match(text, /## Lines \(4\)/);
  assert.match(text, /\[3\] js\/b\.js:1\nCato says a long thing here\. >>>"Sit down, you are not in anyone's way,"<<< and he waits\./);
});

test('main reads the named files, or the narrative files that differ from the ref, and says so when nothing changed', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'voices-'));
  const put = (f, src) => { fs.mkdirSync(path.dirname(path.join(root, f)), { recursive: true }); fs.writeFileSync(path.join(root, f), src); };
  put('js/cast.js', SRC); put('js/stories/x.js', SRC); put('js/other.js', SRC); put('docs/voices/review.md', 'RUBRIC');
  for (const c of ['hester', 'cato', 'ines', 'tomas', 'gunner', 'patrol-officers']) put(`docs/voices/${c}.md`, `${c} card`);
  const run = (args, git) => { const lines = []; const code = main(args, { root, out: x => lines.push(x), git }); return { code, text: lines.join('\n') }; };
  const named = run(['js/other.js'], () => { throw new Error('no git for named files'); });
  assert.equal(named.code, 0); assert.match(named.text, /## Lines \(2\)/); assert.match(named.text, /\[1\] js\/other\.js:1/);
  const calls = [];
  const git = args => { calls.push(args.join(' ')); return args[0] === 'diff' ? 'js/cast.js\njs/stories/x.js\njs/other.js\ndocs/x.md\n' : args[1] === 'main:js/cast.js' ? SRC.replace('Hold the end', 'Hold') : (() => { throw new Error('absent'); })(); };
  const diff = run(['--diff', 'main'], git);
  assert.deepEqual(calls, ['diff --name-only main', 'show main:js/cast.js', 'show main:js/stories/x.js']);
  assert.match(diff.text, /## Lines \(3\)/, 'js/cast.js has its one new line and js/stories/x.js, which main lacks, has both; js/other.js and docs/x.md are not narrative files');
  const quiet = run([], () => '');
  assert.match(quiet.text, /^no quoted lines changed since origin\/main$/);
});
