'use strict';

// The prose report: counts tic phrases, sentence shape and reported speech in the text of the narrative files, so the style rules in
// docs/prose-style.md and docs/voices/ can be read as numbers (docs/superpowers/specs/2026-10-08-prose-and-world-design.md).
// It reports and never fails, and it is not part of `npm test`.
//   npm run prose                 the report
//   npm run prose -- --write      write docs/prose-baseline.json
//   npm run prose -- --compare    the difference from the baseline
// It also lists the choices written as data that cost something (a cost tag, credits taken, a gate on credits) and whose label shows no figure (#601, aim 1).
// The string scan is a character walk, not a parser: a regex literal that holds a quote mark would confuse it.
// It does not read js/overrides.js: words changed in the scene editor (#336) live there and not in the narrative files below, so the report does not see
// them until they are written back into those files. The file is empty in the shipped game, and its strings are mostly ids and keys, not prose.

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

// One pass over a script's source. `lits` are its string and template literals in order, each { start, end, text }, with literals joined by `+`
// read as one passage; `code` is the source with every literal, comment and regex blanked to spaces (same length), so a search of it sees
// only code. Comments and regex literals are skipped.
function scanSource(src) {
  const lits = [], blank = [];
  let i = 0, prev = '';
  while (i < src.length) {
    const c = src[i], end = c === '/' ? regexEnd(src, i, prev) : -1;
    if (c === '/' && src[i + 1] === '/') { const from = i; while (i < src.length && src[i] !== '\n') i++; blank.push([from, i]); }
    else if (c === '/' && src[i + 1] === '*') { const from = i, close = src.indexOf('*/', i + 2); i = close < 0 ? src.length : close + 2; blank.push([from, i]); }
    else if (c === "'" || c === '"' || c === '`') { const [text, next] = readLiteral(src, i); lits.push({ start: i, end: next, text }); blank.push([i, next]); i = next; prev = c; }
    else if (end > 0) { blank.push([i, end]); i = end; prev = ')'; }
    else { if (!/\s/.test(c)) prev = c; i++; }
  }
  const code = src.split('');
  for (const [from, to] of blank) for (let k = from; k < Math.min(to, code.length); k++) if (code[k] !== '\n') code[k] = ' ';
  return { lits, code: code.join('') };
}

// The strings in a script's source that have four or more words, in order.
const extractProse = src => scanSource(src).lits.map(l => l.text).filter(text => wordCount(text) >= 4);

// ---------- choices that cost something and say so ----------

// What makes a choice cost: a `cost` tag (the one the captain reads, hired.js), credits taken off in its effects, a gate on credits, or code
// that takes credits or the ship's fund. `fight` and `self` are tags too, but they stake no number the label could show, so they are not counted.
const STAKES = [
  ['tag', /\bcost\s*:\s*(?:true|[1-9])/],
  ['effect', /\b(?:credits|fund)\s*:\s*-/],
  ['gate', /\bneedCr\(|\bwhen\s*:\s*\{[^{}]*\bcredits\s*:/],
  ['code', /\b(?:credits|fund)\s*-=/],
];
const NUMBER_WORD = /\b(?:one|two|three|four|five|six|seven|eight|nine|ten|twelve|twenty|fifty|hundred|thousand|half|quarter|tenth)\b/i;

// A label shows its cost when it holds a figure (a digit or a number word), or is built from an expression that will hold one.
const showsCost = (label, raw) => /\d/.test(label) || NUMBER_WORD.test(label) || raw.includes('${');

// The choices written as data in a script (an object with a literal `label`) that cost something and whose label shows no figure, as
// { id, label, why } where id is the scene's last `id` before it. A choice built by a function is not found, and is left to a reader.
function unpricedChoices(src) {
  const { lits, code } = scanSource(src), at = new Map(lits.map(l => [l.start, l])), out = [], stack = [];
  let sceneId = '';
  for (let i = 0; i < code.length; i++) {
    const c = code[i], lit = at.get(i);
    if (lit) {
      const key = /\b(\w+)\s*:\s*$/.exec(code.slice(Math.max(0, i - 24), i));
      if (key && (key[1] === 'id' || key[1] === 'title')) sceneId = lit.text;
      else if (key && key[1] === 'label' && stack.length) stack[stack.length - 1].label = lit;
      i = lit.end - 1;
    } else if (c === '{') stack.push({ start: i, label: null });
    else if (c === '}') {
      const frame = stack.pop();
      if (!frame || !frame.label) continue;
      const slice = code.slice(frame.start, i + 1), why = STAKES.filter(([, re]) => re.test(slice)).map(([name]) => name);
      const raw = src.slice(frame.label.start, frame.label.end);
      if (why.length && !showsCost(frame.label.text, raw)) out.push({ id: sceneId, label: frame.label.text, why: why.join('+') });
    }
  }
  return out;
}

// ---------- sentence shape and speech ----------

const round2 = x => Math.round(x * 100) / 100;
const sentences = text => text.split(/(?<=[.!?]["')\]\u201D\u2019]*)\s+/).filter(s => /\S/.test(s));  // straight or curly closing quotes (#429)

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
// A quoted span that says "I do not" or "it is" in full: speech uses contractions (docs/voices/dialogue.md, rule 13). "I have" is not counted, since it is also the plain verb.
const UNCONTRACTED = /\b(?:I (?:am|will|would) [a-z]|(?:you|we|they) (?:are|will|would) [a-z]|(?:he|she|it|that|there|who) (?:will|would) [a-z]|(?:he|she|it|that|there|who|what) is [a-z]|(?:do|does|did|is|are|was|were|has|have|had|would|could|should|will) not\b|cannot\b|let us\b)/i;
function speech(strings) {
  let quoted = 0, reported = 0, uncontracted = 0;
  for (const s of strings) {
    const spans = s.match(QUOTED) || [];
    quoted += spans.length; reported += (s.match(REPORTED) || []).length; uncontracted += spans.filter(q => UNCONTRACTED.test(q)).length;
  }
  return { quoted, reported, uncontracted };
}

// ---------- the report ----------

const lintStrings = strings => ({ strings: strings.length, tics: countTics(strings.join('\n')), shape: shape(strings), speech: speech(strings) });
const choiceKey = (file, c) => `${file}  ${c.id}: ${c.label} [${c.why}]`;

// files: { path: source }. Returns each file's figures, and the total over all their strings together.
function lint(files) {
  const per = {}, all = [], unpriced = [];
  for (const [file, src] of Object.entries(files)) {
    const strings = extractProse(src), choices = unpricedChoices(src);
    per[file] = { ...lintStrings(strings), unpriced: choices };
    all.push(...strings); unpriced.push(...choices.map(c => choiceKey(file, c)));
  }
  return { files: per, total: { ...lintStrings(all), unpriced } };
}

const row = (name, r) => `${name.padEnd(32)} ${String(r.strings).padStart(5)} strings  tics ${String(Object.values(r.tics).reduce((a, b) => a + b, 0)).padStart(4)}  ` +
  `mean ${r.shape.mean}  sd ${r.shape.sd}  short ${Math.round(r.shape.shortShare * 100)}%  runs ${r.shape.shortRuns}  quoted ${r.speech.quoted}  reported ${r.speech.reported}  uncontracted ${r.speech.uncontracted}`;

function report(result) {
  const ticLine = Object.entries(result.total.tics).map(([id, n]) => `${id} ${n}`).join(', ');
  const choiceLines = Object.entries(result.files).filter(([, r]) => r.unpriced.length)
    .flatMap(([file, r]) => [`  ${file}: ${r.unpriced.length}`, ...r.unpriced.map(c => `    ${c.id}: ${c.label} [${c.why}]`)]);
  return [row('total', result.total), `  tics: ${ticLine}`, ...Object.entries(result.files).map(([file, r]) => row(file, r)),
    `choices that cost something and show no figure in the label: ${result.total.unpriced.length}`, ...choiceLines].join('\n');
}

// A figure missing from an older baseline counts as zero.
const diff = (name, a = 0, b = 0) => (a === b ? null : `${name}: ${a} -> ${b} (${b > a ? '+' : ''}${round2(b - a)})`);

// What changed in the totals since the baseline, one line each, or `no change`.
function compare(base, now) {
  const a = base.total, b = now.total;
  const lines = [
    ...TICS.map(({ id }) => diff(id, a.tics[id], b.tics[id])),
    diff('mean', a.shape.mean, b.shape.mean), diff('sd', a.shape.sd, b.shape.sd), diff('shortShare', a.shape.shortShare, b.shape.shortShare), diff('shortRuns', a.shape.shortRuns, b.shape.shortRuns),
    diff('quoted', a.speech.quoted, b.speech.quoted), diff('reported', a.speech.reported, b.speech.reported), diff('uncontracted', a.speech.uncontracted || 0, b.speech.uncontracted),
    diff('unpriced', (a.unpriced || []).length, b.unpriced.length),
  ].filter(Boolean);
  const before = new Set(a.unpriced || []), after = new Set(b.unpriced);
  for (const k of after) if (!before.has(k)) lines.push(`  new: ${k}`);
  for (const k of before) if (!after.has(k)) lines.push(`  gone: ${k}`);
  return lines.length ? lines.join('\n') : 'no change';
}

// ---------- the files and the command ----------

const NARRATIVE_FILES = ['js/cast.js', 'js/castbar.js', 'js/people.js', 'js/peopletext.js', 'js/familytext.js', 'js/bartopics.js', 'js/hiredeventstext.js', 'js/social.js', 'js/family.js',
  // the hired chapter's scenes that are not in a file above (#468): the lines of the scenes built by a function, the raid, ambush and boarding beats, the ice run, the hired events, the ship's own downtime
  'js/hiredscenes.js', 'js/engagements.js', 'js/boarders.js', 'js/icerun.js', 'js/hiredevents.js', 'js/hired.js', 'js/shiplife.js', 'js/signon.js', 'js/stakes.js', 'js/fate.js',
  // the text of the notes, news, chatter, rumors, job titles, hails and crew lines that is still written in these files (#564); js/linetables.js, js/storylets.js and the
  // rest hold ids, tables of references and machinery, not prose
  'js/world.js', 'js/transit.js', 'js/game.js', 'js/barwork.js', 'js/hail.js', 'js/crew.js', 'js/outpost.js', 'js/company.js', 'js/story.js', 'js/jobs.js', 'js/awayjobs.js'];
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

module.exports = { TICS, extractProse, unpricedChoices, countTics, shape, speech, lint, report, compare, narrativeFiles, main };
