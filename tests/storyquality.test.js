'use strict';

// A scene that waits for a story quality nothing sets never plays, and the load-time check cannot see it: `storyletProblems` checks that the condition key
// `q` exists, not the quality name inside it (#511). This reads every scene, with the editor's overrides on it (`sceneView`), and fails, naming the scene and
// the name, on a quality read by `when.q` or `when.qBelow` that no scene's `q` or `set` effect writes, and on a `due:` follow-up (`when.due`, `consumes`) that
// nothing starts. The engine writes `seen:<id>` when a scene that plays once opens and `last:<id>` when one that comes round again does, so those count as written
// when the scene exists. A follow-up can also be started from code (`applyEffects({ later: ... })` in transit.js, `setLater` in hiredevents.js), so a name that no
// scene starts must be quoted in a script outside js/stories/. No quality is read that only code sets; if one is, name it in CODE_QUALITIES with the reason.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

const ROOT = path.resolve(__dirname, '..');
const CODE_QUALITIES = {};  // quality name: why code sets it

// Scripts outside js/stories/, as one text: where code starts a follow-up.
const codeText = () => {
  const out = [];
  const walk = dir => { for (const f of fs.readdirSync(dir, { withFileTypes: true })) { const p = path.join(dir, f.name); if (f.isDirectory()) { if (f.name !== 'stories') walk(p); } else if (f.name.endsWith('.js')) out.push(fs.readFileSync(p, 'utf8')); } };
  walk(path.join(ROOT, 'js'));
  return out.join('\n');
};

// What the scenes read and write: { id, once, every, readsQ: [names], readsDue: [names], writesQ: [names], writesDue: [names] } for each.
const scan = () => STORYLETS.map(s => {
  const v = sceneView(s), r = { id: s.id, once: s.once !== false, every: !!s.every, readsQ: [], readsDue: [], writesQ: [], writesDue: [] };
  const when = w => { for (const [k, x] of Object.entries(w || {})) { if (k === 'q' || k === 'qBelow') r.readsQ.push(...Object.keys(x)); if (k === 'due') r.readsDue.push(...[].concat(x)); } };
  const effects = e => {
    for (const [k, x] of Object.entries(e || {})) {
      if (k === 'q' || k === 'set') r.writesQ.push(...Object.keys(x));
      if (k === 'later') r.writesDue.push(...Object.keys(x));
      if (x && typeof x === 'object' && (x.onDone || x.onFail)) { effects(x.onDone); effects(x.onFail); }  // a mission's effects on delivery or failure
    }
  };
  when(v.when); if (v.consumes) r.readsDue.push(v.consumes);
  for (const c of v.choices) { when(c.when); effects(c.effects); }
  return r;
});

// The problems in a list of scans, each as 'scene: name'. `code` is the scripts' text and `known` the qualities code is said to set.
const problems = (scans, code, known = {}) => {
  const written = new Set(Object.keys(known)), started = new Set(), out = [];
  for (const s of scans) {
    s.writesQ.forEach(n => written.add(n)); s.writesDue.forEach(n => started.add(n));
    if (s.once) written.add(`seen:${s.id}`);
    if (s.every) written.add(`last:${s.id}`);
  }
  for (const s of scans) {
    for (const n of s.readsQ) if (!written.has(n)) out.push(`${s.id}: quality "${n}" is read and never set`);
    for (const n of s.readsDue) if (!started.has(n) && !new RegExp(`['"]${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`).test(code)) out.push(`${s.id}: follow-up "${n}" is waited for and nothing starts it`);
  }
  return out;
};

test('every story quality a scene reads is set somewhere, and every follow-up a scene waits for is started', async () => {
  const g = await open({ scope: 'full' });
  const scans = await g.ev(scan);
  await g.done();
  assert.ok(scans.length > 100, 'the scenes were read');
  assert.ok(scans.some(s => s.readsQ.length) && scans.some(s => s.readsDue.length) && scans.some(s => s.writesDue.length), 'and some read and write both kinds');
  assert.deepEqual(problems(scans, codeText(), CODE_QUALITIES), []);
});

test('a misspelled quality or follow-up is reported with the scene and the name', () => {
  const base = { once: true, every: false, readsQ: [], readsDue: [], writesQ: [], writesDue: [] };
  const scans = [
    { ...base, id: 'a', writesQ: ['iceStrike'], writesDue: ['later-one'] },
    { ...base, id: 'b', readsQ: ['iceStrike', 'seen:a'], readsDue: ['later-one'] },
    { ...base, id: 'c', readsQ: ['iceStrik', 'seen:nothere', 'last:a'], readsDue: ['later-on', 'from-code'] },
  ];
  assert.deepEqual(problems(scans, `later: { 'from-code': 3 }`), [
    'c: quality "iceStrik" is read and never set',
    'c: quality "seen:nothere" is read and never set',
    'c: quality "last:a" is read and never set',
    'c: follow-up "later-on" is waited for and nothing starts it',
  ]);
  assert.deepEqual(problems([{ ...base, id: 'd', readsQ: ['coded'] }], '', { coded: 'set by code' }), [], 'a quality code sets is allowed by name');
});
