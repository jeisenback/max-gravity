'use strict';

// The text layer for the "With {name}" scenes of js/family.js (#457): each line of PEOPLE_LINES under `family:` can be given other words through the override layer, the scenes play them
// and nothing else changes, and nothing is left in the scenes as a title or a line written in code. The pin (talkpin.test.js) shows that the shipped words are as they were.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { open, closeBrowser } = require('./helpers');
const { playTalk } = require('./talkplay');

after(closeBrowser);

test('every talk scene has an id and lines, and every line is read: an override shows in what is played, and nothing else changes', async () => {
  const g = await open({ scope: 'full' });
  const r = await g.ev(arg => {
    const play = (0, eval)(`(${arg.src})`);
    const ids = Object.keys(FAMILY_SCENES).map(id => `family:${id}`), have = Object.keys(PEOPLE_LINES).filter(id => id.startsWith('family:'));
    const mark = (id, key) => `@@${id}|${key}@@${(PEOPLE_LINES[id][key].match(/\{\w+\}/g) || []).join('')}`;  // a line keeps the {words} it has
    const overrides = Object.fromEntries(ids.map(id => [id, { parts: Object.fromEntries(Object.keys(PEOPLE_LINES[id]).map(k => [k, mark(id, k)])) }]));
    const base = play(), warned = []; const warn = console.warn; console.warn = m => warned.push(m);
    useOverrides(overrides);
    console.warn = warn;
    const changed = play();
    return { base, changed, ids, have, warned, registry: peopleEventRegistry().map(e => e.id).filter(id => id.startsWith('family:')), keys: Object.fromEntries(ids.map(id => [id, Object.keys(PEOPLE_LINES[id])])) };
  }, { src: playTalk.toString() });
  await g.done();
  assert.equal(r.ids.length, 14, 'twelve scenes, the idle talk and the picker');
  assert.deepEqual([...r.have].sort(), [...r.ids].sort(), 'lines for every one, and for nothing else');
  assert.deepEqual(r.registry, r.ids, 'the registry lists them, in the order they are listed in');
  assert.deepEqual(r.warned, [], 'the game keeps every line');
  const all = JSON.stringify(r.changed), missing = [];
  for (const [id, keys] of Object.entries(r.keys)) for (const k of keys) if (!all.includes(`@@${id}|${k}@@`)) missing.push(`${id} ${k}`);
  assert.deepEqual(missing, [], 'a line that is never read');
  assert.equal(r.changed.length, r.base.length);
  // what the choices change is the same: the pin's record of regard, memory, mood, the story and the missions, without the words
  const effects = rec => { const j = JSON.parse(rec.text); return Array.isArray(j) ? null : j.runs.map(x => JSON.stringify([x[0], x[1], x[3]])); };
  for (let n = 0; n < r.base.length; n++) assert.deepEqual(effects(r.changed[n]), effects(r.base[n]), `${r.base[n].key}: what the choices change is the same`);
});

test('the talk scenes have no title or label written in code: a new scene must take its words from the lines', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'family.js'), 'utf8');
  const scenes = src.slice(src.indexOf('const liftBy'), src.indexOf('// The scenes by the name of their lines'));
  const CODE = ['title: `Take ${n} home', 'label: `${f.p.first} (${f.pax'];  // the mission's name on the missions list, and the picker's button, which is who they are and how
  assert.deepEqual([...scenes.matchAll(/\b(?:title|label|text|open): ['"`]/g)].map(m => scenes.slice(m.index, m.index + 40)).filter(x => !CODE.some(c => x.startsWith(c))), [], 'a title, label or text in code');
  assert.ok(src.includes('FAMILY_SCENES'), 'the scenes are listed by id');
});
