'use strict';

// The prose report: counts tic phrases, sentence shape and reported speech in the text of the narrative files, so the style rules in
// docs/prose-style.md and docs/voices/ can be read as numbers (docs/superpowers/specs/2026-10-08-prose-and-world-design.md).
// It reports and never fails, and it is not part of `npm test`.
//   npm run prose                 the report
//   npm run prose -- --write      write docs/prose-baseline.json
//   npm run prose -- --compare    the difference from the baseline
// The string scan is a character walk, not a parser: a regex literal that holds a quote mark would confuse it.

// The tic table of docs/prose-style.md. Each pattern is counted case-insensitively.
const TICS = [
  { id: 'hedge', re: /\b(?:a little|a small|very slightly)\b/gi },
  { id: 'nods', re: /\bnods\b/gi },
  { id: 'andThen', re: /\band then,/gi },
  { id: 'asIf', re: /\bas (?:if|though)\b/gi },
  { id: 'forAWhile', re: /\bfor a while\b/gi },
  { id: 'longMoment', re: /\bfor a long moment\b/gi },
  { id: 'adverb', re: /\b(?:somehow|oddly|strangely)\b/gi },
  { id: 'aside', re: /\b(?:which is (?:worse|how)|in a way that|a kind of)\b/gi },
];

const countTics = text => Object.fromEntries(TICS.map(({ id, re }) => [id, (text.match(re) || []).length]));

// ---------- reading the strings out of a script ----------

// A quoted string starting at src[i]. Returns [its text, the index after it].
function readQuoted(src, i, quote) {
  let j = i + 1, text = '';
  while (j < src.length && src[j] !== quote && src[j] !== '\n') {
    if (src[j] === '\\') { text += src[j + 1] === 'n' ? '\n' : src[j + 1]; j += 2; } else text += src[j++];
  }
  return [text, j + 1];
}

// The index after the `${ ... }` expression that starts at j, which may hold braces, quoted strings and templates of its own.
function skipExpr(src, j) {
  let depth = 1;
  while (j < src.length && depth > 0) {
    const c = src[j];
    if (c === "'" || c === '"') j = readQuoted(src, j, c)[1];
    else if (c === '`') j = readTemplate(src, j)[1];
    else { if (c === '{') depth++; else if (c === '}') depth--; j++; }
  }
  return j;
}

// A template literal starting at src[i], with each `${...}` replaced by X. Returns [its text, the index after it].
function readTemplate(src, i) {
  let j = i + 1, text = '';
  while (j < src.length && src[j] !== '`') {
    if (src[j] === '\\') { text += src[j + 1] === 'n' ? '\n' : src[j + 1]; j += 2; }
    else if (src[j] === '$' && src[j + 1] === '{') { j = skipExpr(src, j + 2); text += 'X'; }
    else text += src[j++];
  }
  return [text, j + 1];
}

const wordCount = s => (s.match(/\S+/g) || []).length;

// The strings in a script's source that have four or more words, in order. Comments are skipped.
function extractProse(src) {
  const out = [], keep = text => { if (wordCount(text) >= 4) out.push(text); };
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === '/' && src[i + 1] === '/') { while (i < src.length && src[i] !== '\n') i++; }
    else if (c === '/' && src[i + 1] === '*') { const end = src.indexOf('*/', i + 2); i = end < 0 ? src.length : end + 2; }
    else if (c === "'" || c === '"') { const [text, next] = readQuoted(src, i, c); keep(text); i = next; }
    else if (c === '`') { const [text, next] = readTemplate(src, i); keep(text); i = next; }
    else i++;
  }
  return out;
}

// ---------- sentence shape and speech ----------

const round2 = x => Math.round(x * 100) / 100;
const sentences = text => text.split(/(?<=[.!?]["')\]]*)\s+/).filter(s => /\S/.test(s));

// Sentence length in words over all the strings: count, mean, spread (population standard deviation), the share under six words,
// and the number of runs of four or more such short sentences in a row (counted within each string).
function shape(strings) {
  const lengths = [];
  let shortRuns = 0;
  for (const s of strings) {
    let run = 0;
    for (const sentence of sentences(s)) {
      const w = wordCount(sentence);
      lengths.push(w);
      if (w < 6) run++; else { if (run >= 4) shortRuns++; run = 0; }
    }
    if (run >= 4) shortRuns++;
  }
  if (!lengths.length) return { count: 0, mean: 0, sd: 0, shortShare: 0, shortRuns: 0 };
  const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  const sd = Math.sqrt(lengths.reduce((a, b) => a + (b - mean) ** 2, 0) / lengths.length);
  return { count: lengths.length, mean: round2(mean), sd: round2(sd), shortShare: round2(lengths.filter(w => w < 6).length / lengths.length), shortRuns };
}

const REPORTED = /\b(?:says|said|answers|answered|replies|replied|asks|asked|(?:tells|told) \w+) (?:that|if|whether)\b/gi;
const QUOTED = /"[^"]{2,}"|“[^”]{2,}”/g;

// Quoted spans against reported speech, over all the strings.
function speech(strings) {
  let quoted = 0, reported = 0;
  for (const s of strings) { quoted += (s.match(QUOTED) || []).length; reported += (s.match(REPORTED) || []).length; }
  return { quoted, reported };
}

module.exports = { TICS, extractProse, countTics, shape, speech };
