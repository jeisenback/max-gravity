'use strict';

// The text layer for the passenger events (#457): each line of PEOPLE_LINES can be given other words through the override layer, the event plays them and nothing else
// changes, and an override the game would not take is left out with one warning. The pin (peoplepin.test.js) shows that the shipped words are as they were.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser } = require('./helpers');
const { playPax } = require('./peopleplay');

after(closeBrowser);

test('every passenger event has an id and lines, and every line is read: an override shows in what the event plays, and nothing else changes', async () => {
  const g = await open({ scope: 'full' });
  const r = await g.ev(src => {
    const play = (0, eval)(`(${src})`);
    const ids = PAX_EVENTS.map(e => e.id), registry = peopleEventRegistry().map(e => e.id);
    const mark = (id, key) => `@@${id}|${key}@@${(PEOPLE_LINES[id][key].match(/\{\w+\}/g) || []).join('')}`;  // a line keeps the {words} it has, so the lines it leads to are still read
    const overrides = Object.fromEntries(Object.keys(PEOPLE_LINES).map(id => [id, { parts: Object.fromEntries(Object.keys(PEOPLE_LINES[id]).map(k => [k, mark(id, k)])) }]));
    const base = play();
    const warned = []; const warn = console.warn; console.warn = m => warned.push(m);
    useOverrides(overrides);
    console.warn = warn;
    const changed = play();
    return { base, changed, warned, ids, registry, lineIds: Object.keys(PEOPLE_LINES), keys: Object.fromEntries(Object.entries(PEOPLE_LINES).map(([id, l]) => [id, Object.keys(l)])) };
  }, playPax.toString());
  await g.done();
  assert.equal(new Set(r.ids).size, r.ids.length, 'ids are unique');
  assert.ok(r.ids.every(Boolean) && r.ids.length === 15, 'fifteen events with an id each');
  assert.deepEqual(r.registry, r.ids.map(id => `people:pax:${id}`), 'the registry lists every event');
  assert.deepEqual(r.lineIds, r.registry, 'lines for every event, and for nothing else');
  assert.deepEqual(r.warned, [], 'the game keeps every line');
  const all = JSON.stringify(r.changed), missing = [];
  for (const [id, keys] of Object.entries(r.keys)) for (const k of keys) if (!all.includes(`@@${id}|${k}@@`)) missing.push(`${id} ${k}`);
  assert.deepEqual(missing, [], 'a line the events never read');
  assert.equal(r.changed.length, r.base.length);
  for (let n = 0; n < r.base.length; n++) assert.deepEqual(r.changed[n].plays.map(p => p.d), r.base[n].plays.map(p => p.d), `${r.base[n].id}: what the choices change is the same`);
});

test('an override is escaped, a title and a label are left plain, and a bad one is left out with one warning', async () => {
  const g = await open({ scope: 'full' });
  const r = await g.ev(() => {
    const warned = []; const warn = console.warn; console.warn = m => warned.push(m);
    const clean = cleanOverrides({
      'people:pax:debt': { parts: { 'c1.result': 'They <b>go</b> & {first} waits.', 'c0.label': 'Pay <it>', 'c1.nope': 'x', 'c0.result': 'Uses {nothing}.', title: '' }, text: 'No', choices: { 0: { label: 'x' } } },
      'people:pax:nope': { parts: { title: 'x' } },
    });
    console.warn = warn;
    useOverrides({ 'people:pax:debt': { parts: { 'c1.result': 'They <b>go</b> & {first} waits.', 'c0.label': 'Pay <it>' } } });
    const p = { first: 'Sam', last: 'Vale', home: 'Mars', crime: 'x' }, say = paxSay('debt', p, { destPlanet: 'Mars' });
    return { clean, warned, result: say('c1.result'), label: say('c0.label'), other: say('c1.label') };
  });
  await g.done();
  assert.deepEqual(r.clean, { 'people:pax:debt': { parts: { 'c1.result': 'They <b>go</b> & {first} waits.', 'c0.label': 'Pay <it>' } } });
  assert.equal(r.warned.length, 1);
  for (const w of ['parts has no "c1.nope"', 'parts.c0.result has {nothing}', 'parts.title is not text', 'has no "text"', 'has no choice 0', 'unknown scene "people:pax:nope"']) assert.ok(r.warned[0].includes(w), `${w} in: ${r.warned[0]}`);
  assert.equal(r.result, 'They &lt;b&gt;go&lt;/b&gt; &amp; Sam waits.', 'a result is text, with the name filled in');
  assert.equal(r.label, 'Pay <it>', 'a label is left to the dialog to escape');
  assert.equal(r.other, 'Tell the collectors to get lost');
});
