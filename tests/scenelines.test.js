'use strict';

// The text layer for the hired chapter's function-built scenes and the hired events written in code (#463): each line they are built from can be given other words through
// the override layer, the scene plays them with its {words} filled, and an override the game would not take is left out with one warning. The pin (scenepin.test.js) shows
// that the shipped words are as they were.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser } = require('./helpers');
const { playScenes } = require('./sceneplay');

after(closeBrowser);

test('every line of every scene is read: an override for it shows in what the scene plays, and the scenes play as many choices as before', async () => {
  const g = await open({ scope: 'full' });
  const r = await g.ev(arg => {
    const play = (0, eval)(`(${arg.src})`);
    const ids = Object.keys(SCENE_LINES);
    const lines = Object.fromEntries(ids.map(id => [id, linesOf(id)]));
    const base = play();
    // each line becomes its marker followed by the {words} it had, so the lines it is filled with (a fault, a debt, a price) are read too
    const overrides = Object.fromEntries(ids.map(id => [id, { parts: Object.fromEntries(Object.keys(lines[id]).map(k => [k, `@@${id}|${k}@@ ${(lines[id][k].match(/\{\w+\}/g) || []).join(' ')}`.trim()])) }]));
    const warned = []; const warn = console.warn; console.warn = m => warned.push(m);
    useOverrides(overrides);
    console.warn = warn;
    const changed = play();
    return { base: base.map(x => [x.id, x.plays.length, x.error || '']), changed: changed.map(x => [x.id, x.plays.length, x.error || '']), text: JSON.stringify(changed), lines, warned };
  }, { src: playScenes.toString() });
  await g.done();
  assert.deepEqual(r.warned, [], 'the game keeps every line');
  assert.deepEqual(r.changed.filter(x => x[2]), [], 'every case still plays');
  assert.deepEqual(r.changed, r.base, 'the same scenes, with as many choices to play');
  const missing = [];
  for (const [id, lines] of Object.entries(r.lines)) for (const key of Object.keys(lines)) if (!r.text.includes(`@@${id}|${key}@@`)) missing.push(`${id} ${key}`);
  assert.deepEqual(missing, [], 'a line the scenes never read');
});

test('an override fills the {words} its line has, is escaped in a text and plain in a label, and a bad one is left out with one warning', async () => {
  const g = await open({ scope: 'full' });
  const r = await g.ev(() => {
    __seed(1);
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester', credits: 5000 }); while (G.dialog) finishEvent();
    const last = person(hired().captain).last;
    const warned = []; const warn = console.warn; console.warn = m => warned.push(m);
    const clean = cleanOverrides({
      'scene:warning': { parts: { text: 'A <b>word</b> from {last} & {nobody}.', 'c0.label': 'Do <i>better</i>', nope: 'x', 'c1.result': '' }, title: 'No' },
      'hired:cap-order': { parts: { text: 'Captain {last} says <b>no</b>.' } },
      'scene:sign-on': { parts: { 'week.pay': 'You are paid {wage} a day.' } },
    });
    console.warn = warn;
    useOverrides({ 'scene:warning': { parts: { text: 'A <b>word</b> from {last} & more.', 'c0.label': 'Do <i>better</i>' } }, 'hired:cap-order': { parts: { text: 'Captain {last} says <b>no</b>.' } } });
    const w = warningScene(), order = HAND_EVENTS.find(x => x.id === 'cap-order').make({ cap: person(hired().captain), mate: null });
    return { clean, warned, last, text: w.text, label: w.choices[0].label, title: w.title, other: w.choices[1].label, order: order.text };
  });
  await g.done();
  assert.deepEqual(r.clean, {
    'scene:warning': { parts: { 'c0.label': 'Do <i>better</i>' } },  // the text has {nobody}, which the line does not take; the rest of the bad ones are left out too
    'hired:cap-order': { parts: { text: 'Captain {last} says <b>no</b>.' } },
    'scene:sign-on': { parts: { 'week.pay': 'You are paid {wage} a day.' } },
  });
  assert.equal(r.warned.length, 1);
  for (const bit of ['{nobody}', 'nope', 'c1.result', 'no "title"']) assert.ok(r.warned[0].includes(bit), bit);
  assert.equal(r.text, `A &lt;b&gt;word&lt;/b&gt; from ${r.last} &amp; more.`);
  assert.equal(r.label, 'Do <i>better</i>');
  assert.equal(r.title, 'The Captain\'s Terms');
  assert.equal(r.other, 'Apologize for the worst of it');
  assert.equal(r.order, `Captain ${r.last} says &lt;b&gt;no&lt;/b&gt;.`);
});
