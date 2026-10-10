'use strict';

// The text layer for the raid, ambush and boarding beats (#478): each line the tables hold can be given other words through the override layer, the beat plays them
// and nothing else changes, and an override the game would not take is left out with one warning. The pin (beatpin.test.js) shows that the shipped words are as they were.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser } = require('./helpers');
const { playBeats } = require('./beatplay');

after(closeBrowser);

const BEATS = ['beats:raid', 'beats:ambush', 'beats:repel', 'beats:assault'];

test('every line of every beat is read: an override for it shows in what the beat plays, and nothing else changes', async () => {
  const g = await open({ scope: 'full' });
  const r = await g.ev(arg => {
    const play = (0, eval)(`(${arg.src})`);
    const lines = Object.fromEntries(arg.ids.map(id => [id, BEAT_LINES[id]()]));
    const base = play();
    const overrides = Object.fromEntries(arg.ids.map(id => [id, { parts: Object.fromEntries(Object.keys(lines[id]).map(k => [k, `@@${id}|${k}@@`])) }]));
    const warned = []; const warn = console.warn; console.warn = m => warned.push(m);
    useOverrides(overrides);
    console.warn = warn;
    const changed = JSON.stringify(play());
    return { base, changed, lines, warned };
  }, { src: playBeats.toString(), ids: BEATS });
  await g.done();
  assert.deepEqual(r.warned, [], 'the game keeps every line');
  const missing = [];
  let restored = r.changed;
  for (const id of BEATS) {
    assert.ok(Object.keys(r.lines[id]).length > 10, `${id} has lines`);
    for (const [key, shipped] of Object.entries(r.lines[id])) {
      const marker = `@@${id}|${key}@@`;
      if (!r.changed.includes(marker)) missing.push(`${id} ${key}`);
      restored = restored.split(marker).join(JSON.stringify(shipped).slice(1, -1));
    }
  }
  assert.deepEqual(missing, [], 'a line the beats never read');
  assert.deepEqual(JSON.parse(restored), r.base, 'with the words put back, the beats play as they did');
});

test('an override is escaped in a text and left plain in a label and a title, and a bad one is left out with one warning', async () => {
  const g = await open({ scope: 'full' });
  const r = await g.ev(() => {
    const warned = []; const warn = console.warn; console.warn = m => warned.push(m);
    const clean = cleanOverrides({
      'beats:raid': { parts: { 'open.gun.0': 'A <b>patrol</b> & more.', 'closing.hold.label': 'Hold <i>on</i>', 'open.nope.0': 'x', 'close.standoff': '' }, title: 'No', choices: { 0: { label: 'x' } } },
      'beats:repel': { parts: { 'title.0': 'The <i>Lock</i>', tie: 'Nothing gives.' } },
      'beats:assault': { parts: { tie: 'The assault has no tie.' } },
      'beats:dead-in-space': { parts: { a: 'x' } },
    });
    console.warn = warn;
    useOverrides({ 'beats:raid': { parts: { 'open.gun.0': 'A <b>patrol</b> & more.', 'closing.hold.label': 'Hold <i>on</i>' } }, 'beats:repel': { parts: { 'title.0': 'The <i>Lock</i>' } } });
    return { clean, warned, text: lineWords('beats:raid', 'open.gun.0', 'shipped'), label: lineWords('beats:raid', 'closing.hold.label', 'shipped'), title: lineWords('beats:repel', 'title.0', 'shipped'), other: lineWords('beats:raid', 'open.gun.1', 'shipped') };
  });
  await g.done();
  assert.deepEqual(r.clean, {
    'beats:raid': { parts: { 'open.gun.0': 'A <b>patrol</b> & more.', 'closing.hold.label': 'Hold <i>on</i>' } },
    'beats:repel': { parts: { 'title.0': 'The <i>Lock</i>', tie: 'Nothing gives.' } },
  });
  assert.equal(r.warned.length, 1);
  for (const bit of ['open.nope.0', 'close.standoff', 'no "title"', 'no choice 0', 'beats:assault', 'beats:dead-in-space']) assert.ok(r.warned[0].includes(bit), bit);
  assert.equal(r.text, 'A &lt;b&gt;patrol&lt;/b&gt; &amp; more.');
  assert.equal(r.label, 'Hold <i>on</i>');
  assert.equal(r.title, 'The <i>Lock</i>');
  assert.equal(r.other, 'shipped');
});
