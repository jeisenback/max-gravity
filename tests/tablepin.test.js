'use strict';

// Pins the words the table-driven hired scenes play (#462): the 20 work events (WORK_EVENTS, played by workEvent) and the 3 ice run scenes (ICE_STAGES, played by
// iceStageScene), with each choice's win and lose line, in tests/fixtures/table-scenes-pin.json. Putting the override layer in front of the tables must leave
// this fixture as it is. After a change to the words on purpose, write it again with `PIN_WRITE=1 node --test tests/tablepin.test.js` and read the diff.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

const FIXTURE = path.join(__dirname, 'fixtures', 'table-scenes-pin.json');

// Runs in the page. Plays every choice of every scene with the dice set to win and then to lose, in a fresh hired game each time.
const pinAll = () => {
  const real = Math.random, out = [];
  const game = post => { window.__seed(11); startGame({ mode: 'hired', background: 'earth', post, captainKey: 'hester', credits: 5000 }); G.dialog = null; G.nextEvent = null; };
  const play = (post, make, i, roll) => {
    game(post);
    const ev = make();
    Math.random = () => roll;
    try { const before = (hired().skill || {})[post] || 0, text = ev.choices[i].run(); return { text: String(text), xp: ((hired().skill || {})[post] || 0) - before }; } finally { Math.random = real; }
  };
  for (const d of WORK_EVENTS) {
    game(d.post);
    const ev = workEvent(d), rec = { id: `hired:${d.id}`, title: ev.title, text: ev.text, labels: ev.choices.map(c => c.label), plays: [] };
    for (const [i, roll] of [[0, 0], [1, 0], [1, 0.999]]) rec.plays.push(play(d.post, () => workEvent(d), i, roll));
    out.push(rec);
  }
  ICE_STAGES.forEach((stage, n) => {
    for (const post of Object.keys(stage.post)) {
      const make = round => () => { hired().run = { tons: 40, ice: { edge: 0, round } }; return iceStageScene(n); };
      game(post);
      const first = make(0)(), second = make(1)();
      const rec = { id: `ice:${n + 1}`, post, title: first.title, text: [first.text, second.text], labels: first.choices.map(c => c.label), plays: [] };
      const which = post === Object.keys(stage.post)[0] ? first.choices.map((c, i) => i) : [first.choices.length - 1];  // the general choices once, a post's own for each post
      for (const i of which) for (const roll of [0, 0.999]) rec.plays.push({ i, roll, ...play(post, make(0), i, roll) });
      out.push(rec);
    }
  });
  return out;
};

test('the work events and the ice run scenes play the words they always did', async () => {
  const g = await open({ scope: 'full' });
  const got = await g.ev(pinAll);
  await g.done();
  assert.equal(got.filter(r => r.id.startsWith('hired:')).length, 20);
  assert.ok(got.filter(r => r.id.startsWith('ice:')).length >= 10, 'every post of every ice scene');
  if (process.env.PIN_WRITE) fs.writeFileSync(FIXTURE, JSON.stringify(got, null, 1) + '\n');
  const want = JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));
  assert.equal(got.length, want.length);
  for (let n = 0; n < want.length; n++) assert.deepEqual(got[n], want[n], `${want[n].id}${want[n].post ? ` (${want[n].post})` : ''}`);
});

test('the pin is repeatable: playing the tables twice gives the same record', async () => {
  const g = await open({ scope: 'full' });
  const a = await g.ev(pinAll), b = await g.ev(pinAll);
  await g.done();
  assert.deepEqual(a, b);
});
