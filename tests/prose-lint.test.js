'use strict';

// tools/prose-lint.js: the prose report (docs/superpowers/specs/2026-10-08-prose-and-world-design.md). It counts tic phrases, sentence
// shape and reported speech in the text of the narrative files. These are pure functions, so there is no browser here.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { extractProse, countTics, shape, speech } = require('../tools/prose-lint');

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
