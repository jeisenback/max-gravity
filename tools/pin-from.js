'use strict';

// Writes a pin again from the code as it was at a commit, and says what differs from the pin in the working tree (#457).
//
//   node tools/pin-from.js [--ref <commit>] [--ignore a,b] [--write] tests/xxxpin.test.js [...]
//
// A pin (docs/pins.md) is a record of what some code plays, kept in tests/fixtures. To turn code into data and be sure it plays the same, the pin is first
// written from the code as it is, then the code is changed, and the pin must pass unchanged. When the harness (tests/xxxplay.js) is extended afterwards to
// record more, the new records must come from the code before the change, not after it: this makes a clean checkout of `--ref` (default origin/main), puts the
// working tree's tests/ in it, runs the named tests there with PIN_WRITE=1, and compares the fixtures that came out with the working tree's, record by record.
// `--ignore` names fields (mem,log) that the harness was extended to record: a record that differs only in them counts as the same. `--write` takes the new fixtures
// into the working tree; without it nothing is changed.

const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

// The name a record is known by: its `key`, else its `id` with whatever else tells the records of one id apart; else its place. A name used twice gets a number.
const IDENTIFYING = ['key', 'id', 'seed', 'i', 'roll', 'j', 'k'];
function names(rows) {
  const seen = {};
  return rows.map((r, n) => {
    const base = r && typeof r === 'object' ? IDENTIFYING.filter(f => r[f] !== undefined).map(f => r[f]).join(':') || `#${n}` : `#${n}`;
    seen[base] = (seen[base] || 0) + 1;
    return seen[base] > 1 ? `${base} (${seen[base]})` : base;
  });
}

// What differs between the old rows and the new: { same, changed, added, removed }, each a list of names. `ignore` is a list of fields left out of the comparison.
function compare(oldRows, newRows, ignore = []) {
  const drop = (k, v) => (ignore.includes(k) ? undefined : v);
  const text = r => JSON.stringify(r, drop);
  if (!Array.isArray(oldRows) || !Array.isArray(newRows)) {
    const same = text(oldRows) === text(newRows);
    return { same, changed: same ? [] : ['(the whole file)'], added: [], removed: [] };
  }
  const was = new Map(names(oldRows).map((k, n) => [k, text(oldRows[n])])), now = new Map(names(newRows).map((k, n) => [k, text(newRows[n])]));
  const changed = [...now].filter(([k, v]) => was.has(k) && was.get(k) !== v).map(([k]) => k);
  const added = [...now.keys()].filter(k => !was.has(k)), removed = [...was.keys()].filter(k => !now.has(k));
  return { same: !changed.length && !added.length && !removed.length, changed, added, removed };
}

function parse(argv) {
  const o = { ref: 'origin/main', ignore: [], write: false, tests: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--ref') o.ref = argv[++i];
    else if (a === '--ignore') o.ignore = String(argv[++i]).split(',').filter(Boolean);
    else if (a === '--write') o.write = true;
    else if (a.startsWith('--')) throw new Error(`unknown option ${a}`);
    else o.tests.push(a);
  }
  if (!o.tests.length) throw new Error('name the pin tests to run, e.g. tests/homepin.test.js');
  if (!o.ref) throw new Error('--ref needs a commit');
  return o;
}

const git = (root, args) => spawnSync('git', args, { cwd: root, encoding: 'utf8' });

// Runs it. Returns { code, report } with the report as lines of text; `out` gets the lines as they come.
function run(argv, { root = process.cwd(), out = line => console.log(line) } = {}) {
  const o = parse(argv), say = line => out(line);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pin-from-')), wt = path.join(tmp, 'wt');
  let added = false;
  try {
    const made = git(root, ['worktree', 'add', '--detach', wt, o.ref]);
    if (made.status !== 0) { say(`could not check out ${o.ref}: ${made.stderr.trim()}`); return { code: 2 }; }
    added = true;
    if (fs.existsSync(path.join(root, 'node_modules'))) fs.symlinkSync(path.join(root, 'node_modules'), path.join(wt, 'node_modules'));
    fs.cpSync(path.join(root, 'tests'), path.join(wt, 'tests'), { recursive: true, force: true });  // the harness and the pins as they are now, over the old code
    const env = { ...process.env, PIN_WRITE: '1' };
    delete env.NODE_TEST_CONTEXT;  // under `node --test` (the tool's own test) a nested run would think it is a child and not report
    const ran = spawnSync(process.execPath, ['--test', '--test-reporter=tap', ...o.tests], { cwd: wt, env, encoding: 'utf8' });
    const summary = (ran.stdout || '').split('\n').filter(l => /^# (pass|fail)\b/.test(l));
    say(`ran ${o.tests.join(' ')} at ${o.ref}: ${summary.join(', ') || 'no summary'}`);
    if (ran.status !== 0) { say((ran.stdout || '').split('\n').filter(l => /^not ok|error:/.test(l)).slice(0, 10).join('\n') || ran.stderr); return { code: 1 }; }
    const dir = path.join('tests', 'fixtures');
    let differs = 0, moved = 0, same = 0;
    for (const f of fs.readdirSync(path.join(wt, dir)).filter(x => x.endsWith('.json'))) {
      const fresh = fs.readFileSync(path.join(wt, dir, f), 'utf8'), here = path.join(root, dir, f);
      const had = fs.existsSync(here) ? fs.readFileSync(here, 'utf8') : null;
      if (had === fresh) { same++; continue; }
      const c = had === null ? { same: false, changed: [], added: ['(a new file)'], removed: [] } : compare(JSON.parse(had), JSON.parse(fresh), o.ignore);
      if (c.same) { say(`${f}: the same${o.ignore.length ? ` apart from ${o.ignore.join(', ')}` : ''}`); }
      else { differs++; say(`${f}: ${c.changed.length} changed, ${c.added.length} new, ${c.removed.length} gone`); for (const [what, list] of [['changed', c.changed], ['new', c.added], ['gone', c.removed]]) if (list.length) say(`  ${what}: ${list.slice(0, 12).join(', ')}${list.length > 12 ? `, and ${list.length - 12} more` : ''}`); }
      if (o.write) { fs.writeFileSync(here, fresh); moved++; }
    }
    if (same) say(`${same} fixture${same === 1 ? '' : 's'} identical`);
    say(o.write ? `wrote ${moved} fixture${moved === 1 ? '' : 's'} into the working tree` : 'nothing written (add --write to take the new fixtures)');
    return { code: 0, differs, moved };
  } finally {
    if (added) git(root, ['worktree', 'remove', '--force', wt]);
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

module.exports = { compare, names, parse, run };

if (require.main === module) {
  try { process.exitCode = run(process.argv.slice(2)).code; } catch (e) { console.error(e.message); process.exitCode = 2; }
}
