'use strict';

// Pins what every choice of every main character's, first officer's and captain's scene, and of every hired event but the post work problems, does (#342, #473). Each choice is run in a seeded hired game, with the
// scene's own captain and first officer and the main characters it needs aboard, and what it returns and every change it makes to the game's state are
// recorded in tests/fixtures/hired-scene-pin.json. Turning a scene's code into data must leave this fixture as it is. After a change to what a scene does on
// purpose, write it again with `PIN_WRITE=1 node --test tests/hiredpin.test.js` and read the diff.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

const FIXTURE = path.join(__dirname, 'fixtures', 'hired-scene-pin.json');

// Runs in the page. Returns [{ id, i, label, result, changes, next, error }].
const pinAll = () => {
  const flat = (v, p, out) => {
    if (v && typeof v === 'object') { for (const k of Object.keys(v)) flat(v[k], `${p}.${k}`, out); if (!Object.keys(v).length) out[p] = Array.isArray(v) ? '[]' : '{}'; }
    else if (typeof v !== 'function' && v !== undefined) out[p] = v;
    return out;
  };
  const diff = (a, b) => Object.keys({ ...a, ...b }).filter(k => a[k] !== b[k]).sort().map(k => `${k}: ${String(a[k]).slice(0, 160)} -> ${String(b[k]).slice(0, 160)}`);
  const out = [];
  const real = drawCastPair;
  for (const e of hiredSceneRegistry().filter(x => x.kind === 'cast' || x.kind === 'captain')) {
    const choices = e.scene.choices || [];
    choices.forEach((c, i) => {
      const rec = { id: e.id, i, label: typeof c.label === 'string' ? c.label : '(built)' };
      try {
        const xoOf = key => Object.keys(CAPTAINS).find(k => CAPTAINS[k].xo === key);
        const captainKey = e.kind === 'captain' ? e.key : CAST[e.key].xo ? xoOf(e.key) : 'hester';
        const pair = CAST_PAIRS[Object.keys(CAST_PAIRS).find(b => CAST_PAIRS[b].includes(e.key))] || CAST_PAIRS.earth;
        window.__seed(11);
        window.drawCastPair = () => [...pair];
        startGame({ mode: 'hired', background: 'earth', post: 'gunner', captainKey, credits: 5000 });
        window.drawCastPair = real;
        G.dialog = null; G.nextEvent = null;
        const before = flat(G.state, 's', {});
        const played = dataChoice(c);  // a choice written as data is played as the game plays it
        const text = played.run();
        rec.result = typeof text === 'string' ? text : String(text);
        rec.changes = diff(before, flat(G.state, 's', {}));
        rec.next = G.nextEvent ? G.nextEvent.title : null;
      } catch (err) { rec.error = String(err && err.message || err); } finally { window.drawCastPair = real; }
      out.push(rec);
    });
  }
  // The hired events that are not a post's work problem (#473): built for the captain and a shipmate who are about, and each choice run in a fresh game.
  for (const d of HAND_EVENTS.filter(x => x.group !== 'work')) {
    for (let i = 0; ; i++) {
      const rec = { id: `hired:${d.id}`, i, label: '' };
      try {
        const key = (/^crew-(\w+)$/.exec(d.id) || [])[1];
        const pair = CAST_PAIRS[Object.keys(CAST_PAIRS).find(b => CAST_PAIRS[b].includes(key))] || CAST_PAIRS.earth;
        window.__seed(11);
        window.drawCastPair = () => [...pair];
        startGame({ mode: 'hired', background: 'earth', post: 'gunner', captainKey: 'hester', credits: 5000 });
        window.drawCastPair = real;
        G.dialog = null; G.nextEvent = null;
        const mate = makeCrewCandidate(G.state.systemId); registerPerson(mate); G.state.crew.push(mate.id);
        const ev = d.make(handContext());
        if (i >= ev.choices.length) break;
        const c = ev.choices[i];
        rec.label = typeof c.label === 'string' ? c.label : '(built)';
        const before = flat(G.state, 's', {});
        const text = dataChoice(c).run();
        rec.result = typeof text === 'string' ? text : String(text);
        rec.changes = diff(before, flat(G.state, 's', {}));
        rec.next = G.nextEvent ? G.nextEvent.title : null;
      } catch (err) { rec.error = String(err && err.message || err); } finally { window.drawCastPair = real; }
      out.push(rec);
      if (rec.error) break;
    }
  }
  return out;
};

test('every choice of every cast and captain scene and every hired event does what it did', async () => {
  const g = await open({ scope: 'full' });
  const got = await g.ev(pinAll);
  await g.done();
  assert.ok(got.length > 200, `${got.length} choices`);
  assert.deepEqual(got.filter(r => r.error), [], 'no choice throws in its own scene\'s state');
  if (process.env.PIN_WRITE) fs.writeFileSync(FIXTURE, JSON.stringify(got, null, 1) + '\n');
  const want = JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));
  assert.equal(got.length, want.length);
  // Compared one by one, so a failure names the choice.
  for (let n = 0; n < want.length; n++) assert.deepEqual(got[n], want[n], `${want[n].id} choice ${want[n].i}`);
});

test('the pin is repeatable: running it twice gives the same record', async () => {
  const g = await open({ scope: 'full' });
  const a = await g.ev(pinAll), b = await g.ev(pinAll);
  await g.done();
  assert.deepEqual(a, b);
});
