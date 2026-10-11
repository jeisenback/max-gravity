'use strict';

// The text layer for the tables of js/familytext.js (#457): what a crew member's story is rolled from, what they say with nothing on their mind, the letters from home and the
// holidays. Each table has an id (lines:family-*), the scenes read the lines through it, and an override changes the words and nothing else.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser } = require('./helpers');
const { playFamily } = require('./familyplay');

after(closeBrowser);

const IDS = ['left', 'hopes', 'home', 'idle', 'good-news', 'bad-news', 'holidays'].map(x => `lines:family-${x}`);

test('every line of the family tables is read: an override for each shows in what the scenes play, and nothing else changes', async () => {
  const g = await open({ scope: 'full' });
  const r = await g.ev(arg => {
    const play = (0, eval)(`(${arg.src})`);
    const lines = Object.fromEntries(arg.ids.map(id => [id, lineTableRegistry().find(e => e.id === id).scene.parts]));
    const base = play();
    const overrides = Object.fromEntries(arg.ids.map(id => [id, { parts: Object.fromEntries(Object.keys(lines[id]).map(k => [k, `@@${id}|${k}@@${(lines[id][k].match(/\{\w+\}/g) || []).join('')}`])) }]));
    const warned = []; const warn = console.warn; console.warn = m => warned.push(m);
    useOverrides(overrides);
    console.warn = warn;
    const changed = play();
    return { base, changed, lines, warned, registered: lineTableRegistry().map(e => e.id).filter(id => id.startsWith('lines:family-')) };
  }, { src: playFamily.toString(), ids: IDS });
  await g.done();
  assert.deepEqual(r.registered, IDS, 'the registry holds the tables, in this order');
  assert.deepEqual(r.warned, [], 'the game keeps every line');
  const all = JSON.stringify(r.changed);
  const unread = [];
  for (const id of IDS) {
    const keys = Object.keys(r.lines[id]);
    assert.ok(keys.length >= 3, `${id} has lines`);
    for (const k of keys) if (!all.includes(`@@${id}|${k}@@`)) unread.push(`${id}|${k}`);
  }
  assert.deepEqual(unread, [], 'a line the scenes never read through its id');
  assert.equal(r.base.length, r.changed.length);
  assert.deepEqual(r.changed.filter(c => /undefined|\[object|\{(n|who|home|year)\}/.test(c.text)).map(c => c.key), [], 'every {word} is filled');
});

test('a line may use only the {words} the shipped line has, and is drawn as text', async () => {
  const g = await open({ scope: 'full' });
  const r = await g.ev(() => {
    const warned = []; const warn = console.warn; console.warn = m => warned.push(m);
    useOverrides({ 'lines:family-left': { parts: { 0: 'a <b>bad</b> {year} ending' }, }, 'lines:family-holidays': { parts: { 'year-s-end.text': '{n} <i>toasts</i> {year}' } } });
    console.warn = warn;
    const left = familyLines('left')[0], day = familyLines('holidays')['year-s-end'].text;
    useOverrides({});
    return { warned, left, day };
  });
  await g.done();
  assert.equal(r.warned.length, 1, 'the line with a word the shipped one lacks is left out');
  assert.equal(r.left, 'a mine closure that emptied half the town', 'and the shipped line stands');
  assert.equal(r.day, '{n} &lt;i&gt;toasts&lt;/i&gt; {year}', 'the words the shipped line has are kept, and the markup is text');
});

test('the family tables show in the editor, one row each, with no play', async () => {
  const g = await open({ scope: 'full' });
  const r = await g.ev(() => lineTableRegistry().filter(e => e.id.startsWith('lines:family-')).map(e => [e.id, e.kind, e.where, Object.keys(e.scene.parts).length]));
  await g.done();
  assert.equal(r.length, 7);
  assert.deepEqual(r.find(x => x[0] === 'lines:family-holidays'), ['lines:family-holidays', 'lines', 'transit', 12]);
  assert.deepEqual(r.find(x => x[0] === 'lines:family-idle').slice(3), [12]);
});
