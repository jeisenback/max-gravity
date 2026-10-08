'use strict';

// tools/prose-lint.js: the prose report (docs/superpowers/specs/2026-10-08-prose-and-world-design.md). It counts tic phrases, sentence
// shape and reported speech in the text of the narrative files. These are pure functions, so there is no browser here.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { extractProse, countTics, shape, speech, lint, report, compare, narrativeFiles, main } = require('../tools/prose-lint');

const tmp = files => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'prose-'));
  for (const [f, src] of Object.entries(files)) { fs.mkdirSync(path.dirname(path.join(root, f)), { recursive: true }); fs.writeFileSync(path.join(root, f), src); }
  return root;
};

test('extractProse keeps prose strings and skips comments and short ids', () => {
  const src = [
    "// a comment with several words in it",
    "const a = 'short';",
    "const b = \"She said \\\"no\\\" to the offer today.\";",
    "const c = `Day ${n} at the port with the crew.`;",
    "/* a block comment with \"quoted words inside it\" */",
  ].join('\n');
  assert.deepEqual(extractProse(src), ['She said "no" to the offer today.', 'Day X at the port with the crew.']);
});

test('extractProse is not fooled by // in a string, an apostrophe in a comment, or a nested template', () => {
  const src = [
    "// don't stop here",
    "const u = 'See http://example.org for the long list of ports.';",
    "const t = `Docked at ${port ? `the ${port}` : 'Ceres'} with the ice aboard.`;",
  ].join('\n');
  assert.deepEqual(extractProse(src), ['See http://example.org for the long list of ports.', 'Docked at X with the ice aboard.']);
});

test('countTics counts each pattern once per occurrence and reports zeros', () => {
  const text = 'He nods. She nods, and then, a little later, as if nothing had happened, it was somehow fine. For a while they sat. For a long moment nobody spoke, as though waiting.';
  assert.deepEqual(countTics(text), { hedge: 1, nods: 2, andThen: 1, asIf: 2, forAWhile: 1, longMoment: 1, adverb: 1, aside: 0 });
  assert.equal(countTics('It is, which is worse, a kind of mercy, in a way that nobody likes.').aside, 3);
});

test('shape measures sentence length, spread and runs of short sentences', () => {
  const r = shape(['One two three. Four five six seven eight nine ten eleven twelve.', 'A b. C d. E f. G h. I j k l m n o p.']);
  assert.deepEqual(r, { count: 7, mean: 4, sd: 2.88, shortShare: 0.71, shortRuns: 1 });
});

test('shape splits after a closing quote, and gives zeros for no text', () => {
  assert.equal(shape(['"Hold it," she says. "Hold it until she is inside two thousand."']).count, 2);
  assert.deepEqual(shape([]), { count: 0, mean: 0, sd: 0, shortShare: 0, shortRuns: 0 });
});

test('speech counts quoted spans and reported speech', () => {
  const r = speech(['"I said something," Mara says. She says that she did.', 'Ines asks if it is on. He told her that it was.']);
  assert.deepEqual(r, { quoted: 1, reported: 3 });
});

test('lint totals the tics, strings and shape across files', () => {
  const r = lint({ 'a.js': "const x = 'He nods and sits down at the table.';", 'b.js': 'const y = "She nods and leaves the galley now.";' });
  assert.equal(r.total.tics.nods, 2);
  assert.equal(r.files['a.js'].strings, 1);
  assert.equal(r.total.shape.count, 2);
  for (const p of ['a.js', 'b.js', 'total']) assert.ok(report(r).includes(p));
});

test('compare names each difference, and says no change when there is none', () => {
  const base = lint({ 'a.js': "const x = 'He nods and she nods at the door.';" });
  const now = lint({ 'a.js': "const x = 'He nods and she waits at the door.';" });
  assert.ok(compare(base, now).includes('nods: 2 -> 1 (-1)'));
  assert.equal(compare(base, base), 'no change');
});

test('narrativeFiles lists the real narrative files and nothing from tests', () => {
  const root = path.resolve(__dirname, '..');
  const files = narrativeFiles(root);
  for (const f of ['js/cast.js', 'js/captains/hester.js', 'js/stories/aftermath.js']) assert.ok(files.includes(f), f);
  assert.ok(files.every(f => fs.existsSync(path.join(root, f)) && !f.startsWith('tests/')));
  assert.deepEqual(narrativeFiles(tmp({})), []);
});

test('main writes a baseline, compares to it, and explains when there is none', () => {
  const root = tmp({ 'js/cast.js': "const a = 'He nods and sits down at the table.';" });
  const lines = []; const out = s => lines.push(s);
  assert.equal(main(['--compare'], { root, out }), 1);
  assert.ok(lines.join('\n').includes('no baseline') && lines.join('\n').includes('--write'));
  assert.equal(main(['--write'], { root, out }), 0);
  assert.equal(JSON.parse(fs.readFileSync(path.join(root, 'docs/prose-baseline.json'), 'utf8')).total.strings, 1);
  lines.length = 0;
  assert.equal(main(['--compare'], { root, out }), 0);
  assert.equal(lines.join('\n'), 'no change');
  assert.equal(main([], { root: tmp({}), out }), 0);
});

test('extractProse reads string literals joined with + as one passage', () => {
  const src = [
    "const t = 'Cato finds you at the end of the watch. \"I ' +",
    "  'do the watch bill,\" he says. He holds out a mug.';",
    "const n = 1 + 2; const s = 'a separate string with four words';",
  ].join('\n');
  assert.deepEqual(extractProse(src), ['Cato finds you at the end of the watch. "I do the watch bill," he says. He holds out a mug.', 'a separate string with four words']);
});

test('extractProse skips a regex literal that holds a quote mark', () => {
  const src = "const r = /it's/; const s = 'the real string with four words';";
  assert.deepEqual(extractProse(src), ['the real string with four words']);
});

test('extractProse survives a regex with a quote inside a template expression, and still reads a division', () => {
  const src = [
    "const t = `Hello ${x.replace(/'/g, '')} there and welcome aboard.`;",
    "const h = total / 2; const s = 'another string with four words';",
  ].join('\n');
  assert.deepEqual(extractProse(src), ['Hello X there and welcome aboard.', 'another string with four words']);
});
