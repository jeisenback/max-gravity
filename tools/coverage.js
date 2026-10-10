'use strict';

// Line and function coverage of the game's scripts (js/**) over the whole test suite, from the browser's own V8 coverage
// (Playwright's page.coverage), since the game is classic scripts in one page and Node coverage tools do not see it.
//   node tools/coverage.js [--files tests/shell.test.js,tests/ui.test.js] [--shard 1/4] [--into DIR] [--top 40] [--keep] [--from DIR] [--all] [--check]
//   --check fails (exit 1) when a file in tools/coverage-floor.json is under its minimum, and says which and by how many lines (tools/floor.js).
//   --keep leaves the per-page coverage in a temp directory, and --from DIR merges one again without re-running the tests.
//   --shard N/M runs one part of the suite (node --test --test-shard) and --into DIR keeps its coverage in DIR, so CI can run the parts on separate runners and merge their
//   directories (all the files in one) with --from.
//   npm run coverage
// Runs the tests with COVERAGE_DIR set (tests/helpers.js writes each page's coverage there), merges every page by script, and
// prints: coverage per file, the functions never called, and the totals. A line counts as covered when any code on it ran.
// Block coverage: a branch that never ran leaves its lines uncovered. Not part of `npm test`.

const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const arg = n => { const i = process.argv.indexOf('--' + n); return i > 0 ? process.argv[i + 1] : null; };
const root = path.resolve(__dirname, '..');

// One page's coverage of one script as a per-character flag: ranges apply outermost first, so an inner range (a branch that did not run
// inside a function that did) overrides the one around it.
function covered(length, functions) {
  const ranges = functions.flatMap(f => f.ranges);
  ranges.sort((a, b) => a.startOffset - b.startOffset || b.endOffset - a.endOffset);
  const flags = new Uint8Array(length);
  for (const r of ranges) flags.fill(r.count > 0 ? 1 : 0, r.startOffset, Math.min(r.endOffset, length));
  return flags;
}

function merge(dir) {
  const byUrl = new Map(), calls = new Map();
  for (const f of fs.readdirSync(dir)) {
    for (const e of JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))) {
      const flags = covered(e.length, e.functions), acc = byUrl.get(e.url) || new Uint8Array(e.length);
      for (let i = 0; i < flags.length; i++) acc[i] |= flags[i];
      byUrl.set(e.url, acc);
      const fns = calls.get(e.url) || new Map();
      for (const fn of e.functions) { const k = `${fn.ranges[0].startOffset}:${fn.functionName}`; fns.set(k, (fns.get(k) || 0) + (fn.ranges[0].count > 0 ? 1 : 0)); }
      calls.set(e.url, fns);
    }
  }
  return { byUrl, calls };
}

function report({ byUrl, calls }, top) {
  const rows = [], never = [];
  let totalCode = 0, totalCovered = 0, totalPartial = 0;
  for (const [url, flags] of byUrl) {
    const file = path.relative(root, url.replace(/^file:\/\//, ''));
    if (!fs.existsSync(path.join(root, file))) continue;
    const source = fs.readFileSync(path.join(root, file), 'utf8'), lines = source.split('\n');
    let offset = 0, code = 0, hit = 0, partial = 0;
    const missed = [], gaps = [];
    lines.forEach((line, n) => {
      const start = offset; offset += line.length + 1;
      const text = line.trim();
      if (!text || text.startsWith('//') || text.startsWith('/*') || text.startsWith('*') || text === '}' || text === '};' || text === '});') return;  // not code
      let ran = false, skipped = false;
      for (let i = start; i < start + line.length; i++) if (source[i].trim()) { if (flags[i]) ran = true; else skipped = true; }
      code++; if (ran) hit++; else missed.push(n + 1);
      if (ran && skipped) { partial++; gaps.push(n + 1); }  // something on the line ran and something did not: a branch not taken
    });
    totalCode += code; totalCovered += hit; totalPartial += partial;
    rows.push({ file, code, hit, partial, pct: code ? (100 * hit) / code : 100, missed, gaps });
    for (const [k, n] of calls.get(url) || []) {
      const [off, name] = [Number(k.split(':')[0]), k.slice(k.indexOf(':') + 1)];
      if (!n && name && !flags[off]) never.push({ file, name, line: source.slice(0, off).split('\n').length });
    }
  }
  rows.sort((a, b) => a.pct - b.pct);
  console.log(`Coverage of js/** over the suite: ${totalCovered} of ${totalCode} code lines (${(100 * totalCovered / totalCode).toFixed(1)} percent), ${rows.length} files; ${totalPartial} of the covered lines have a branch that did not run`);
  console.log('\nBy file, lowest first (code lines, covered, percent, uncovered, lines with a branch not taken):');
  for (const r of rows.slice(0, top)) console.log(`  ${r.file.padEnd(28)} ${String(r.code).padStart(5)} ${String(r.hit).padStart(5)} ${r.pct.toFixed(1).padStart(5)}%  ${String(r.missed.length).padStart(4)} ${String(r.partial).padStart(4)}`);
  console.log(`\nFunctions never called (${never.length}), by file:`);
  const by = {};
  for (const f of never) (by[f.file] = by[f.file] || []).push(`${f.name}:${f.line}`);
  for (const [file, list] of Object.entries(by).sort((a, b) => b[1].length - a[1].length).slice(0, top)) console.log(`  ${file}  ${list.length}: ${(process.argv.includes('--all') ? list : list.slice(0, 8)).join(', ')}${list.length > 8 && !process.argv.includes('--all') ? ', ...' : ''}`);
  fs.writeFileSync(path.join(os.tmpdir(), 'uncovered-lines.json'), JSON.stringify(rows.map(r => ({ file: r.file, code: r.code, hit: r.hit, missed: r.missed, gaps: r.gaps })), null, 1));
  console.log(`\nThe uncovered line numbers per file are in ${path.join(os.tmpdir(), 'uncovered-lines.json')}.`);
  return rows;
}

const from = arg('from');
const into = arg('into'), dir = from || (into ? fs.mkdirSync(into, { recursive: true }) || into : fs.mkdtempSync(path.join(os.tmpdir(), 'coverage-')));
const files = (arg('files') || '').split(',').filter(Boolean);
const run = from ? { stdout: '' } : spawnSync(process.execPath, ['--test', '--test-concurrency=4', ...(arg('shard') ? [`--test-shard=${arg('shard')}`] : []), ...(files.length ? files : [path.join(root, 'tests') + '/*.test.js'])].flatMap(a => (a.includes('*') ? fs.readdirSync(path.dirname(a)).filter(x => x.endsWith('.test.js')).map(x => path.join(path.dirname(a), x)) : [a])), { cwd: root, env: { ...process.env, COVERAGE_DIR: dir }, stdio: ['ignore', 'pipe', 'inherit'], encoding: 'utf8', maxBuffer: 1 << 28 });
const tap = run.stdout || '';
console.log(`tests: ${(tap.match(/^# pass (\d+)/m) || [])[1] || '?'} passed, ${(tap.match(/^# fail (\d+)/m) || [])[1] || '?'} failed`);
const rows = report(merge(dir), Number(arg('top') || 40));
if (!from && !into && !process.argv.includes('--keep')) fs.rmSync(dir, { recursive: true, force: true });
if (process.argv.includes('--check')) {  // the floor (tools/coverage-floor.json): exit non-zero when a listed file has fallen under it
  const { checkFloor, describe } = require('./floor');
  const onDisk = [...fs.readdirSync(path.join(root, 'js')).filter(f => f.endsWith('.js')).map(f => `js/${f}`), ...fs.readdirSync(path.join(root, 'js/captains')).filter(f => f.endsWith('.js')).map(f => `js/captains/${f}`)];
  const result = checkFloor(rows, JSON.parse(fs.readFileSync(path.join(__dirname, 'coverage-floor.json'), 'utf8')), onDisk);
  console.log(`\n${describe(result)}`);
  process.exitCode = result.failures.length ? 1 : 0;
}
