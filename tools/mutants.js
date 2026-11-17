'use strict';

// The planted-bug runner (#1328, part of #1326): runs the suite once clean, then once for each bug in tools/mutants.json, and checks the suite catches each.
// A bug is { name, file, find, replace, min, by }: the exact text to find once in the file, what it becomes, how many tests at least must fail (min, 1 if
// left out), and test names (by, a part of each is enough) that must be among the failures. Each file is put back with `git checkout` after its bug, so
// the runner refuses to start on uncommitted changes in js/, which that would throw away. A bug whose text has moved away fails the run by name rather
// than passing as caught. Weekly on main, one runner per bug (.github/workflows/mutants.yml); not part of `npm test`.
//   node tools/mutants.js                 the clean run, then every bug (about seven suite runs)
//   node tools/mutants.js --only <name>   the clean run, then that bug
//   node tools/mutants.js --list          the bugs' names, one a line (the workflow's matrix)
// The suite is `npm test` in the working directory, with the environment passed through (CHROMIUM_PATH included).

const { execFileSync, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const loadMutants = file => JSON.parse(fs.readFileSync(file, 'utf8')).map(m => ({ min: 1, by: [], ...m }));

// Puts the bug in its file, or throws naming it when its text is not there exactly once (the file is then left as it was).
function applyMutant(root, m) {
  const file = path.join(root, m.file), src = fs.readFileSync(file, 'utf8'), n = src.split(m.find).length - 1;
  if (n === 0) throw new Error(`${m.name}: text not found in ${m.file}`);
  if (n > 1) throw new Error(`${m.name}: text found ${n} times in ${m.file}`);
  fs.writeFileSync(file, src.replace(m.find, () => m.replace));
}

const restore = (root, file) => execFileSync('git', ['checkout', '--', file], { cwd: root });

// The names of the failing tests in the suite's TAP output, a nested test's as well as a file's top-level ones.
const failedTests = tap => [...tap.matchAll(/^\s*not ok \d+ - (.*)$/gm)].map(m => m[1].trim());

// Whether a bug's failures catch it: at least `min` of them, and for each `by` entry a failing test whose name contains it.
const caught = (m, failed) => failed.length >= m.min && m.by.every(b => failed.some(t => t.includes(b)));

const suite = root => {
  const r = spawnSync('npm', ['test'], { cwd: root, env: process.env, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
  return { ok: r.status === 0, failed: failedTests(r.stdout || '') };
};

function main() {
  const root = process.cwd(), argv = process.argv.slice(2), only = argv.includes('--only') ? argv[argv.indexOf('--only') + 1] : null;
  const all = loadMutants(path.join(__dirname, 'mutants.json'));
  if (argv.includes('--list')) { all.forEach(m => console.log(m.name)); return 0; }
  const dirty = execFileSync('git', ['status', '--porcelain', '--', 'js'], { cwd: root, encoding: 'utf8' }).trim();
  if (dirty) { console.error('js/ has uncommitted changes: commit or stash them first, since each bug is undone with git checkout'); return 2; }
  const list = only ? all.filter(m => m.name === only) : all;
  if (!list.length) { console.error(`no planted bug named ${only}`); return 1; }

  console.log('the clean run');
  const clean = suite(root);
  if (!clean.ok) { console.log(`  fails on its own (${clean.failed.length}): ${clean.failed.slice(0, 5).join(' | ')}`); return 1; }
  console.log('  passes');

  let missed = 0;
  for (const m of list) {
    let failed;
    try {
      applyMutant(root, m);
      failed = suite(root).failed;
    } catch (e) {
      console.log(`${m.name}: ${e.message}`); missed++; continue;
    } finally {
      restore(root, m.file);
    }
    const ok = caught(m, failed);
    if (!ok) missed++;
    console.log(`${m.name} (${m.file}): ${ok ? 'caught' : 'MISSED'} by ${failed.length} test(s)${m.by.length ? `, by ${m.by.join(', ')}` : ''}`);
    failed.slice(0, 5).forEach(t => console.log(`  ${t}`));
  }
  console.log(missed ? `${missed} of ${list.length} not caught` : `all ${list.length} caught`);
  return missed ? 1 : 0;
}

if (require.main === module) process.exit(main());
module.exports = { loadMutants, applyMutant, restore, failedTests, caught };
