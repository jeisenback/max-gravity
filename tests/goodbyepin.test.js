'use strict';

// Pins the four captains' goodbyes as they are played (#476): captainGoodbye builds the scene from the captain's `goodbye` entry and the hand's record, so each captain is
// run in several states (the captain's regard cold, plain and warm; the secret learned; a loan repaid; two lines of what the hand lived through; a main character who
// goes along; the first officer there or dead), and the title, the text and the labels are recorded, with what each choice says and changes in the fullest state.
// tests/fixtures/goodbye-pin.json. Turning the goodbye into data must leave it as it is. After a change on purpose, write it again with
// `PIN_WRITE=1 node --test tests/goodbyepin.test.js` and read the diff.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

const FIXTURE = path.join(__dirname, 'fixtures', 'goodbye-pin.json');

// Runs in the page.
const pinAll = () => {
  const flat = (v, p, out) => {
    if (v && typeof v === 'object') { for (const k of Object.keys(v)) flat(v[k], `${p}.${k}`, out); if (!Object.keys(v).length) out[p] = Array.isArray(v) ? '[]' : '{}'; }
    else if (typeof v !== 'function' && v !== undefined) out[p] = v;
    return out;
  };
  const diff = (a, b) => Object.keys({ ...a, ...b }).filter(k => a[k] !== b[k]).sort().map(k => `${k}: ${String(a[k]).slice(0, 160)} -> ${String(b[k]).slice(0, 160)}`);
  const STATES = {
    cold: { op: -3 }, plain: { op: 0 }, warm: { op: 99 },
    secret: { op: 0, flags: ['secretKnown'] },
    full: { op: 99, flags: ['secretKnown', 'lent', 'iceClean', 'raided', 'hurt'], mate: true },
    xoDead: { op: 0, flags: ['secretKnown'], xoDead: true },
  };
  const real = drawCastPair, out = [];
  const build = (key, st) => {
    window.__seed(11);
    window.drawCastPair = () => [...CAST_PAIRS.earth];
    startGame({ mode: 'hired', background: 'earth', post: 'gunner', captainKey: key, credits: 5000 });
    window.drawCastPair = real;
    G.dialog = null; G.nextEvent = null;
    hiredCaptain().opinion = st.op;
    for (const f of st.flags || []) captainFlag(f);
    if (st.mate) { const p = castPerson(CAST_PAIRS.earth[0]); p.role = CAST[p.cast].role; G.state.crew.push(p.id); p.opinion = 99; }
    if (st.xoDead) castRec(CAPTAINS[key].xo).status = 'dead';
  };
  for (const key of Object.keys(CAPTAINS).filter(k => CAPTAINS[k].goodbye)) {
    for (const [name, st] of Object.entries(STATES)) {
      const rec = { captain: key, state: name };
      try {
        build(key, st);
        const ev = captainGoodbye();
        Object.assign(rec, { title: ev.title, text: ev.text, labels: ev.choices.map(c => c.label) });
        if (name === 'full' || name === 'secret') {
          rec.results = [];
          for (let i = 0; i < ev.choices.length; i++) {
            build(key, st);
            const e2 = captainGoodbye(), before = flat(G.state, 's', {}), text = e2.choices[i].run();
            rec.results.push({ label: e2.choices[i].label, text: String(text), changes: diff(before, flat(G.state, 's', {})) });
          }
        }
      } catch (err) { rec.error = String(err && err.message || err); } finally { window.drawCastPair = real; }
      out.push(rec);
    }
  }
  return out;
};

test('each captain\'s goodbye is the scene it always was, in every state', async () => {
  const g = await open({ scope: 'full' });
  const got = await g.ev(pinAll);
  await g.done();
  assert.equal(got.length, 24, 'four captains, six states');
  assert.deepEqual(got.filter(r => r.error), [], 'no goodbye throws');
  assert.ok(got.every(r => r.text && r.labels.length >= 2));
  if (process.env.PIN_WRITE) fs.writeFileSync(FIXTURE, JSON.stringify(got, null, 1) + '\n');
  const want = JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));
  assert.equal(got.length, want.length);
  for (let n = 0; n < want.length; n++) assert.deepEqual(got[n], want[n], `${want[n].captain} (${want[n].state})`);
});

test('the pin is repeatable: building the goodbyes twice gives the same record', async () => {
  const g = await open({ scope: 'full' });
  const a = await g.ev(pinAll), b = await g.ev(pinAll);
  await g.done();
  assert.deepEqual(a, b);
});
