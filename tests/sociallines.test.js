'use strict';

// The text layer for the scenes, feeds and activities of js/social.js (#457): each line of PEOPLE_LINES under `social:` (and the tables of causes and critics) can be given other words through the override layer, the scenes play
// them and nothing else changes, and nothing is left in the scenes as a title or a line written in code. The pin (socialpin.test.js) shows that the shipped words are as they were.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { open, closeBrowser } = require('./helpers');
const { playSocial } = require('./socialplay');
const { playFeeds } = require('./feedplay');

after(closeBrowser);

test('every scene, feed and activity of js/social.js has an id and lines, and every line is read: an override shows in what is played, and nothing else changes', async () => {
  const g = await open({ scope: 'full' });
  const r = await g.ev(arg => {
    const social = (0, eval)(`(${arg.social})`), feeds = (0, eval)(`(${arg.feeds})`);
    const play = () => { __seed(1); const a = social(true); __seed(1); const b = feeds(); return { a, b }; };
    const ids = Object.keys(SOCIAL_SCENES).map(id => `social:${id}`), have = Object.keys(PEOPLE_LINES).filter(id => id.startsWith('social:')), tables = ['lines:social-causes', 'lines:social-critics'];
    const linesOf = id => (id.startsWith('lines:') ? flatLines(lineTable(id).table()) : PEOPLE_LINES[id]);
    const mark = (id, key) => `@@${id}|${key}@@${(linesOf(id)[key].match(/\{\w+\}/g) || []).join('')}`;  // a line keeps the {words} it has
    const all = [...ids, ...tables], overrides = Object.fromEntries(all.map(id => [id, { parts: Object.fromEntries(Object.keys(linesOf(id)).map(k => [k, mark(id, k)])) }]));
    const base = play(), warned = []; const warn = console.warn; console.warn = m => warned.push(m);
    useOverrides(overrides);
    console.warn = warn;
    const changed = play();
    return { base, changed, ids, have, warned, tables, registry: peopleEventRegistry().map(e => e.id).filter(id => id.startsWith('social:')), keys: Object.fromEntries(all.map(id => [id, Object.keys(linesOf(id))])) };
  }, { social: playSocial.toString(), feeds: playFeeds.toString() });
  await g.done();
  assert.equal(r.ids.length, 21, 'thirteen scenes, the feeds and the activities');
  assert.deepEqual([...r.have].sort(), [...r.ids].sort(), 'lines for every one, and for nothing else');
  assert.deepEqual(r.registry, r.ids, 'the registry lists them, in the order they are listed in');
  assert.deepEqual(r.warned, [], 'the game keeps every line');
  const all = JSON.stringify(r.changed), missing = [];
  for (const [id, keys] of Object.entries(r.keys)) for (const k of keys) if (!all.includes(`@@${id}|${k}@@`)) missing.push(`${id} ${k}`);
  const UNREACHABLE = ['social:card-night lose.nogossip'];  // the card night's gossip is socialLines() with " and " in it, which always has a line while anyone is aboard
  assert.deepEqual(missing.filter(m => !UNREACHABLE.includes(m)), [], 'a line that is never read');
  assert.equal(r.changed.a.length, r.base.a.length);
  assert.equal(r.changed.b.length, r.base.b.length);
  const effects = rec => (rec.plays || []).map(p => p.d);
  for (let n = 0; n < r.base.a.length; n++) assert.deepEqual(effects(r.changed.a[n]), effects(r.base.a[n]), `${r.base.a[n].id} ${r.base.a[n].seed}: what the choices change is the same`);
});

test('the scenes of js/social.js have no title or label written in code: a new scene must take its words from the lines', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'social.js'), 'utf8');
  // the builders of the relationship scenes are the functions up to relationshipScene; the rest of the file is the feeds, which are not scenes
  const scenes = src.slice(src.indexOf('function feudHandover'), src.indexOf('// The relationship scenes by id'));  // up to the list of scenes, whose preview scenes are not the game's words
  assert.deepEqual([...scenes.matchAll(/\b(?:title|label): ['"`]/g)].map(m => scenes.slice(m.index, m.index + 40)), [], 'a title or a label in code');
  assert.ok(src.includes('SOCIAL_SCENES'), 'the scenes are listed by id');
  const ids = fs.readFileSync(path.join(__dirname, '..', 'js', 'linetables.js'), 'utf8');
  for (const t of ['CAUSES', 'CRITICS']) assert.ok(ids.includes(`table: () => ${t} }`), `${t} has an id in js/linetables.js`);
});
