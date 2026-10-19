'use strict';

// The voice review (#646): a bundle for a rater. After a prose pass, this finds the quoted speech in the narrative files that changed, numbers it with the
// scene text around it, and prints it with the voice cards and the rubric (docs/voices/review.md) for a Claude session or subagent to read. The code cannot say who
// speaks (the speaker is the scene's, not the string's), so the rater does. Nothing is scored here, nothing fails a build, and no model is called.
//   node tools/voices.js [file ...] [--diff REF]
// With files it reads those; otherwise the narrative files that differ from REF (default origin/main), and of those only the passages REF did not have. After the lines
// it prints those passages whole, with the other versions of the same moment, for the narration and for repeats across versions (#773).

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { QUOTED, scanSource, wordCount, narrativeFiles } = require('./prose-lint');

const CONTEXT = 300;  // characters of scene text kept either side of a line
const CARDS = ['hester', 'cato', 'ines', 'tomas', 'gunner', 'patrol-officers'];

// The quoted lines in a script's source that are not in `known` (a set of passage texts), as { line, quote, before, after }: the passage is a whole string or a run of
// strings joined by `+`, and the line is where it starts in the file.
function quotedSpans(src, known = new Set()) {
  const out = [];
  for (const lit of scanSource(src).lits) {
    if (known.has(lit.text) || wordCount(lit.text) < 4) continue;
    const line = 1 + (src.slice(0, lit.start).match(/\n/g) || []).length;
    for (const m of lit.text.matchAll(QUOTED)) {
      out.push({ line, quote: m[0], before: lit.text.slice(Math.max(0, m.index - CONTEXT), m.index), after: lit.text.slice(m.index + m[0].length, m.index + m[0].length + CONTEXT) });
    }
  }
  return out;
}

// The passage texts of a script's source, for what a base version already had.
const passageSet = src => new Set(scanSource(src).lits.map(l => l.text));

// The key a passage is stored under, as a value in an object literal ('ines.result.1': '...'), or '' when it is not.
const keyOf = (src, start) => (src.slice(0, start).match(/['"]?([\w.:-]+)['"]?\s*:\s*$/) || [])[1] || '';
// A version's key without its number: 'ines.result', 'ines.result.1' and 'ines.result.2' are three versions of one moment (#771).
const moment = key => key.replace(/\.\d+$/, '');

// The passages of a script's source that are not in `known`, whole, with the other versions of the same moment, as { key, line, text } in file order: the rater reads
// the narration around the speech and compares the versions with each other (#773).
// With them comes the choice label the moment is played from ('ines.label' for 'ines.result'), since every version is what that choice says it is.
function passages(src, known) {
  const all = scanSource(src).lits.map(l => ({ key: keyOf(src, l.start), line: 1 + (src.slice(0, l.start).match(/\n/g) || []).length, text: l.text }));
  const changed = all.filter(p => wordCount(p.text) >= 4 && !known.has(p.text));
  const moments = new Set(changed.filter(p => p.key).map(p => moment(p.key)));
  const labels = new Set([...moments].map(m => `${m.split('.')[0]}.label`));
  return all.filter(p => changed.includes(p) || (p.key && wordCount(p.text) >= 4 && moments.has(moment(p.key))) || labels.has(p.key));
}

// The numbered spans of several files: [{ n, file, line, quote, before, after }]. `base[file]` is the earlier source, when only the new passages are wanted.
function collect(files, base = {}) {
  const spans = [];
  for (const [file, src] of Object.entries(files)) for (const s of quotedSpans(src, base[file] === undefined ? undefined : passageSet(base[file]))) spans.push({ ...s, file });
  return spans.map((s, i) => ({ n: i + 1, ...s }));
}

// The bundle to hand a rater: what to do, the rubric, the cards, the numbered lines, then the passages whole.
function bundle(spans, { rubric, cards }, whole = []) {
  const out = ['# Voice review', '', 'Rate each numbered line below against the rubric and the cards. Reply as the Output section of the rubric asks.', '', '## Rubric', '', rubric.trim(), '', '## Cards', ''];
  for (const [name, text] of Object.entries(cards)) out.push(`### ${name}`, '', text.trim(), '');
  out.push(`## Lines (${spans.length})`, '');
  for (const s of spans) out.push(`[${s.n}] ${s.file}:${s.line}`, `${s.before.replace(/\s+/g, ' ')}>>>${s.quote}<<<${s.after.replace(/\s+/g, ' ')}`, '');
  if (whole.length) out.push(`## Passages (${whole.length})`, '');
  for (const p of whole) out.push(`### ${p.file}:${p.line}${p.key ? ` ${p.key}` : ''}`, '', p.text.replace(/\s+/g, ' '), '');
  return out.join('\n');
}

const defaultGit = (root, args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });

// Returns the exit code. `out` prints a line; `git` runs git in the root (a stub in the test).
function main(args, { root, out, git = a => defaultGit(root, a) }) {
  const flag = args.indexOf('--diff'), ref = flag >= 0 ? args[flag + 1] : 'origin/main';
  const named = args.filter((a, i) => !a.startsWith('--') && !(flag >= 0 && i === flag + 1));
  const read = f => fs.readFileSync(path.join(root, f), 'utf8');
  const base = {};
  let files = named;
  if (!named.length) {
    const narrative = new Set(narrativeFiles(root));
    files = git(['diff', '--name-only', ref]).split('\n').filter(f => narrative.has(f) && fs.existsSync(path.join(root, f)));
    for (const f of files) { try { base[f] = git(['show', `${ref}:${f}`]); } catch (e) { base[f] = ''; } }  // a file the ref lacks is all new
  }
  const srcs = Object.fromEntries(files.map(f => [f, read(f)]));
  const spans = collect(srcs, base);
  // the passages whole only for a diff: for files named, every passage of the file would be too many to read
  const whole = named.length ? [] : Object.entries(srcs).flatMap(([f, src]) => passages(src, passageSet(base[f])).map(p => ({ ...p, file: f })));
  if (!spans.length && !whole.length) { out(`no passages ${named.length ? 'in the files named' : `changed since ${ref}`}`); return 0; }
  const docs = f => fs.readFileSync(path.join(root, 'docs', 'voices', f), 'utf8');
  out(bundle(spans, { rubric: docs('review.md'), cards: Object.fromEntries(CARDS.map(c => [c, docs(`${c}.md`)])) }, whole));
  return 0;
}

if (require.main === module) process.exitCode = main(process.argv.slice(2), { root: path.resolve(__dirname, '..'), out: console.log });

module.exports = { quotedSpans, passageSet, passages, collect, bundle, main };
