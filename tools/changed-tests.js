'use strict';

// Runs the test files a change can affect, so the full suite is the gate before a push and not the check after every edit (#401).
//   npm run test:changed            files changed against origin/main, plus untracked ones
//   node tools/changed-tests.js --list     print the choice and why, without running it
//   node tools/changed-tests.js --files js/audio.js,style.css   choose for these files instead of the git change
// A changed test file runs itself. A changed script runs the tests that use a name it declares at the top level (and the
// globals check). The shell, the stylesheet and the page run the layout, shell and ui tests. Markdown and the JSON under docs/ need none. A file it
// cannot map, or a script whose names no test uses, runs the whole suite.

const { execFileSync, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const LAYOUT = ['tests/layout.test.js', 'tests/shell.test.js', 'tests/ui.test.js'];
const GLOBALS = 'tests/globals.test.js';
const EDITOR = ['tests/editor.test.js', 'tests/editorforms.test.js', 'tests/editornew.test.js', 'tests/editorpreview.test.js'];

const declared = src => [...src.matchAll(/^(?:async\s+)?(?:const|let|var|function|class)\s+([A-Za-z_$][\w$]*)/gm)].map(m => m[1]).filter(n => n.length >= 3);
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// changed: repo-relative paths. tests: { path: source } of the test files; sources: { path: source } of js/*.js.
// Returns { files, full, why }: the test files to run, whether to run everything, and a line for each reason.
function select(changed, { tests, sources }) {
  const files = new Set(), why = [];
  const add = (list, reason) => { const hit = list.filter(t => t in tests); hit.forEach(t => files.add(t)); if (hit.length) why.push(reason); };
  const everything = reason => ({ files: Object.keys(tests).sort(), full: true, why: [reason] });

  for (const f of changed) {
    if (f.endsWith('.md') || /^docs\/[\w./-]+\.json$/.test(f)) continue;
    if (f === 'tools/changed-tests.js') { add(['tests/changed-tests.test.js'], `${f}: its own test`); continue; }
    if (f === 'editor.html' || f === 'editor.js' || f === 'editor-preview.html') { add(EDITOR, `${f}: the scene editor's own tests`); continue; }
    if (f === 'tools/prose-lint.js') { add(['tests/prose-lint.test.js'], `${f}: its own test`); continue; }
    if (/^tests\/(?:distribution\/)?[\w-]+\.test\.js$/.test(f)) { add([f], `${f}: a test file runs itself`); continue; }
    if (f === 'style.css' || f === 'index.html' || f === 'js/shell.js') {
      add(LAYOUT, `${f}: the layout, shell and ui tests`);
      if (f === 'index.html') { add([GLOBALS], `${f}: the globals check`); add(EDITOR, `${f}: the scene editor reads the same script list`); }
      if (f !== 'js/shell.js') continue;
    }
    if (/^js\/[\w-]+\.js$/.test(f)) {
      if (!sources[f]) return everything(`${f}: not found, so everything`);
      const base = path.basename(f), names = declared(sources[f]);
      const hits = new Map();
      for (const [t, src] of Object.entries(tests)) {
        const used = names.find(n => new RegExp(`\\b${esc(n)}\\b`).test(src)) || (src.includes(base) ? base : null);
        if (used) hits.set(t, used);
      }
      if (!hits.size && f !== 'js/shell.js') return everything(`${f}: no test uses its names, so everything`);
      for (const [t, name] of hits) { files.add(t); why.push(`${f}: ${name} is used by ${t}`); }
      add([GLOBALS], `${f}: the globals check`);
      continue;
    }
    return everything(`${f}: not mapped to a test, so everything`);
  }
  return { files: [...files].sort(), full: false, why };
}

function main() {
  const root = path.resolve(__dirname, '..');
  const git = (...a) => execFileSync('git', a, { cwd: root, encoding: 'utf8' }).split('\n').filter(Boolean);
  const given = process.argv.indexOf('--files');
  const changed = given > 0 ? process.argv[given + 1].split(',') : [...new Set([...git('diff', '--name-only', 'origin/main'), ...git('ls-files', '--others', '--exclude-standard')])];
  const read = (dir, suffix) => Object.fromEntries(fs.readdirSync(path.join(root, dir)).filter(f => f.endsWith(suffix))
    .map(f => [`${dir}/${f}`, fs.readFileSync(path.join(root, dir, f), 'utf8')]));
  const r = select(changed, { tests: read('tests', '.test.js'), sources: read('js', '.js') });
  console.log(`changed: ${changed.length} file(s)`);
  r.why.forEach(w => console.log(`  ${w}`));
  if (process.argv.includes('--list')) { console.log(r.full ? 'run: the full suite' : `run: ${r.files.join(' ') || 'nothing'}`); return; }
  if (!r.full && !r.files.length) { console.log('no tests to run'); return; }
  const args = r.full ? ['tests/*.test.js'] : r.files;
  console.log(r.full ? 'running the full suite' : `running ${r.files.length} test file(s)`);
  process.exit(spawnSync('node', ['--test', '--test-concurrency=4', ...args], { cwd: root, stdio: 'inherit' }).status ?? 1);  // node expands the glob itself, so no shell
}

if (require.main === module) main();
module.exports = { select };
