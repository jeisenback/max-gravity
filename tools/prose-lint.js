'use strict';

// The prose report: counts tic phrases, sentence shape and reported speech in the text of the narrative files, so the style rules in
// docs/prose-style.md and docs/voices/ can be read as numbers (docs/superpowers/specs/2026-10-08-prose-and-world-design.md).
// It reports and never fails, and it is not part of `npm test`.
//   npm run prose                 the report
//   npm run prose -- --write      write docs/prose-baseline.json
//   npm run prose -- --compare    the difference from the baseline
// The string scan is a character walk, not a parser: a regex literal that holds a quote mark would confuse it.

const fs = require('node:fs');
const path = require('node:path');

// The tic table of docs/prose-style.md. Each pattern is counted case-insensitively.
const TICS = [
  { id: 'hedge', re: /\b(?:a little|a small|very slightly)\b/gi },
  { id: 'nods', re: /\bnods\b/gi },
  { id: 'andThen', re: /\band then,/gi },
  { id: 'asIf', re: /\bas (?:if|though)\b/gi },
  { id: 'forAWhile', re: /\bfor a while\b/gi },
  { id: 'longMoment', re: /\bfor a long moment\b/gi },
  { id: 'adverb', re: /\b(?:somehow|oddly|strangely)\b/gi },
  { id: 'aside', re: /\b(?:which is (?:worse|how)|in a way that|a kind of|very interested in|a look you would like back)\b/gi },
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

// The index after a regex literal that starts at src[i], or -1 when the slash there is a division. A slash starts a regex after an
// operator or an opening bracket (prev is the last character before it that was not whitespace), or after `return` or `typeof`.
function regexEnd(src, i, prev) {
  if (!(prev === '' || '(,=:[!&|?{;+-*%<>~^'.includes(prev) || /\b(?:return|typeof)\s*$/.test(src.slice(Math.max(0, i - 8), i)))) return -1;
  let inClass = false;
  for (let j = i + 1; j < src.length && src[j] !== '\n'; j++) {
    const ch = src[j];
    if (ch === '\\') j++;
    else if (ch === '[') inClass = true;
    else if (ch === ']') inClass = false;
    else if (ch === '/' && !inClass) { j++; while (/[a-z]/i.test(src[j] || '')) j++; return j; }
  }
  return -1;
}

// The index after the `${ ... }` expression that starts at j, which may hold braces, quoted strings, regexes and templates of its own.
function skipExpr(src, j) {
  let depth = 1, prev = '(';
  while (j < src.length && depth > 0) {
    const c = src[j], end = c === '/' ? regexEnd(src, j, prev) : -1;
    if (c === "'" || c === '"') { j = readQuoted(src, j, c)[1]; prev = c; }
    else if (c === '`') { j = readTemplate(src, j)[1]; prev = c; }
    else if (end > 0) { j = end; prev = ')'; }
    else { if (c === '{') depth++; else if (c === '}') depth--; if (!/\s/.test(c)) prev = c; j++; }
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

const JOIN = /\s*\+\s*(?=['"`])/y;

// A string or template literal starting at src[i], with any literals added to it with `+` read as the same passage: the scenes are
// built that way, a line at a time. Returns [its text, the index after it].
function readLiteral(src, i) {
  let [text, next] = src[i] === '`' ? readTemplate(src, i) : readQuoted(src, i, src[i]);
  for (;;) {
    JOIN.lastIndex = next;
    const m = JOIN.exec(src);
    if (!m) return [text, next];
    const j = next + m[0].length, [more, after] = src[j] === '`' ? readTemplate(src, j) : readQuoted(src, j, src[j]);
    text += more; next = after;
  }
}

// The strings in a script's source that have four or more words, in order. Comments and regex literals are skipped.
function extractProse(src) {
  const out = [], keep = text => { if (wordCount(text) >= 4) out.push(text); };
  let i = 0, prev = '';
  while (i < src.length) {
    const c = src[i], end = c === '/' ? regexEnd(src, i, prev) : -1;
    if (c === '/' && src[i + 1] === '/') { while (i < src.length && src[i] !== '\n') i++; }
    else if (c === '/' && src[i + 1] === '*') { const close = src.indexOf('*/', i + 2); i = close < 0 ? src.length : close + 2; }
    else if (c === "'" || c === '"' || c === '`') { const [text, next] = readLiteral(src, i); keep(text); i = next; prev = c; }
    else if (end > 0) { i = end; prev = ')'; }
    else { if (!/\s/.test(c)) prev = c; i++; }
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

// ---------- the report ----------

const lintStrings = strings => ({ strings: strings.length, tics: countTics(strings.join('\n')), shape: shape(strings), speech: speech(strings) });

// files: { path: source }. Returns each file's figures, and the total over all their strings together.
function lint(files) {
  const per = {}, all = [];
  for (const [file, src] of Object.entries(files)) { const strings = extractProse(src); per[file] = lintStrings(strings); all.push(...strings); }
  return { files: per, total: lintStrings(all) };
}

const row = (name, r) => `${name.padEnd(32)} ${String(r.strings).padStart(5)} strings  tics ${String(Object.values(r.tics).reduce((a, b) => a + b, 0)).padStart(4)}  ` +
  `mean ${r.shape.mean}  sd ${r.shape.sd}  short ${Math.round(r.shape.shortShare * 100)}%  runs ${r.shape.shortRuns}  quoted ${r.speech.quoted}  reported ${r.speech.reported}`;

function report(result) {
  const ticLine = Object.entries(result.total.tics).map(([id, n]) => `${id} ${n}`).join(', ');
  return [row('total', result.total), `  tics: ${ticLine}`, ...Object.entries(result.files).map(([file, r]) => row(file, r))].join('\n');
}

// A figure missing from an older baseline counts as zero.
const diff = (name, a = 0, b = 0) => (a === b ? null : `${name}: ${a} -> ${b} (${b > a ? '+' : ''}${round2(b - a)})`);

// What changed in the totals since the baseline, one line each, or `no change`.
function compare(base, now) {
  const a = base.total, b = now.total;
  const lines = [
    ...TICS.map(({ id }) => diff(id, a.tics[id], b.tics[id])),
    diff('mean', a.shape.mean, b.shape.mean), diff('sd', a.shape.sd, b.shape.sd), diff('shortShare', a.shape.shortShare, b.shape.shortShare), diff('shortRuns', a.shape.shortRuns, b.shape.shortRuns),
    diff('quoted', a.speech.quoted, b.speech.quoted), diff('reported', a.speech.reported, b.speech.reported),
  ].filter(Boolean);
  return lines.length ? lines.join('\n') : 'no change';
}

// ---------- the files and the command ----------

const NARRATIVE_FILES = ['js/cast.js', 'js/castbar.js', 'js/people.js', 'js/peopletext.js', 'js/familytext.js', 'js/bartopics.js', 'js/hiredeventstext.js', 'js/social.js', 'js/family.js'];
const NARRATIVE_DIRS = ['js/stories', 'js/captains'];

// Repo-relative paths of the narrative files that exist under root, sorted.
function narrativeFiles(root) {
  const files = [...NARRATIVE_FILES];
  for (const dir of NARRATIVE_DIRS) {
    const abs = path.join(root, dir);
    if (fs.existsSync(abs)) for (const f of fs.readdirSync(abs)) if (f.endsWith('.js')) files.push(`${dir}/${f}`);
  }
  return files.filter(f => fs.existsSync(path.join(root, f))).sort();
}

// Returns the exit code. `out` prints a line.
function main(args, { root, out }) {
  const result = lint(Object.fromEntries(narrativeFiles(root).map(f => [f, fs.readFileSync(path.join(root, f), 'utf8')])));
  const baseline = path.join(root, 'docs', 'prose-baseline.json');
  if (args.includes('--write')) {
    fs.mkdirSync(path.dirname(baseline), { recursive: true });
    fs.writeFileSync(baseline, JSON.stringify(result, null, 2) + '\n');
    out(`wrote ${path.relative(root, baseline)}`);
    return 0;
  }
  if (args.includes('--compare')) {
    if (!fs.existsSync(baseline)) { out('no baseline yet: run `npm run prose -- --write` first'); return 0; }  // the report never fails a script (#431)
    out(compare(JSON.parse(fs.readFileSync(baseline, 'utf8')), result));
    return 0;
  }
  out(report(result));
  return 0;
}

if (require.main === module) process.exitCode = main(process.argv.slice(2), { root: path.resolve(__dirname, '..'), out: console.log });

module.exports = { TICS, extractProse, countTics, shape, speech, lint, report, compare, narrativeFiles, main };
