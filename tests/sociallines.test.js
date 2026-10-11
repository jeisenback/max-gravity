'use strict';

// The text layer for the relationship scenes of js/social.js (#457): each line of PEOPLE_LINES under `social:` can be given other words through the override layer, the scenes play
// them and nothing else changes, and nothing is left in the scenes as a title or a line written in code. The pin (socialpin.test.js) shows that the shipped words are as they were.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { open, closeBrowser } = require('./helpers');
const { playSocial } = require('./socialplay');

after(closeBrowser);

test('every relationship scene has an id and lines, and every line is read: an override shows in what the scene plays, and nothing else changes', async () => {
  const g = await open({ scope: 'full' });
  const r = await g.ev(src => {
    const play = () => { __seed(1); return (0, eval)(`(${src})`)(true); };  // the same dice for each run
    const ids = Object.keys(SOCIAL_SCENES).map(id => `social:${id}`), have = Object.keys(PEOPLE_LINES).filter(id => id.startsWith('social:'));
    const mark = (id, key) => `@@${id}|${key}@@${(PEOPLE_LINES[id][key].match(/\{\w+\}/g) || []).join('')}`;  // a line keeps the {words} it has
    const overrides = Object.fromEntries(ids.map(id => [id, { parts: Object.fromEntries(Object.keys(PEOPLE_LINES[id]).map(k => [k, mark(id, k)])) }]));
    const base = play(), warned = []; const warn = console.warn; console.warn = m => warned.push(m);
    useOverrides(overrides);
    console.warn = warn;
    const changed = play();
    return { base, changed, ids, have, warned, registry: peopleEventRegistry().map(e => e.id).filter(id => id.startsWith('social:')), keys: Object.fromEntries(ids.map(id => [id, Object.keys(PEOPLE_LINES[id])])) };
  }, playSocial.toString());
  await g.done();
  assert.equal(r.ids.length, 13);
  assert.deepEqual(r.have, r.ids, 'lines for every scene, and for nothing else');
  assert.deepEqual(r.registry, r.ids, 'the registry lists them');
  assert.deepEqual(r.warned, [], 'the game keeps every line');
  const all = JSON.stringify(r.changed), missing = [];
  for (const [id, keys] of Object.entries(r.keys)) for (const k of keys) if (!all.includes(`@@${id}|${k}@@`)) missing.push(`${id} ${k}`);
  assert.deepEqual(missing, [], 'a line the scenes never read');
  assert.equal(r.changed.length, r.base.length);
  const effects = rec => (rec.plays || []).map(p => p.d);
  for (let n = 0; n < r.base.length; n++) assert.deepEqual(effects(r.changed[n]), effects(r.base[n]), `${r.base[n].id} ${r.base[n].seed}: what the choices change is the same`);
});

test('the scenes of js/social.js have no title or label written in code: a new scene must take its words from the lines', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'social.js'), 'utf8');
  // the builders of the relationship scenes are the functions up to relationshipScene; the rest of the file is the feeds, which are not scenes
  const scenes = src.slice(src.indexOf('function feudHandover'), src.indexOf('function relationshipScene'));
  assert.deepEqual([...scenes.matchAll(/\b(?:title|label): ['"`]/g)].map(m => scenes.slice(m.index, m.index + 40)), [], 'a title or a label in code');
  assert.ok(src.includes('SOCIAL_SCENES'), 'the scenes are listed by id');
});
