'use strict';

// G in js/game.js declares every field the scripts keep on it (#573). Nothing in the game needs it: a field a script sets on G without declaring it works, and it is
// the reason nobody can say what G holds. This fails on a G.name that the literal does not declare, so the list stays whole. No browser here: it reads the scripts as text.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const scripts = () => ['js', 'js/captains', 'js/stories', 'js/mods'].flatMap(d => (fs.existsSync(path.join(ROOT, d)) ? fs.readdirSync(path.join(ROOT, d)).filter(f => f.endsWith('.js')).map(f => `${d}/${f}`) : [])).concat('editor.js');
const strip = text => text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`\\])\/\/.*$/gm, '$1');  // comments, not the // inside a string of a URL

// The names declared in `const G = { ... };` of js/game.js.
function declared(src) {
  const body = strip(src.split('const G = {')[1].split('\n};')[0]);
  return new Set([...body.matchAll(/(?:^|[,{\s])([A-Za-z_]\w*)\s*:/g)].map(m => m[1]));
}

test('every field a script reads or sets on G is declared in the literal in game.js', () => {
  const want = declared(fs.readFileSync(path.join(ROOT, 'js', 'game.js'), 'utf8'));
  assert.ok(want.has('state') && want.has('nextEvent') && want.has('paused'), `${want.size} names found`);
  const missing = {};
  for (const f of scripts()) {
    for (const m of strip(fs.readFileSync(path.join(ROOT, f), 'utf8')).matchAll(/\bG\.([A-Za-z_]\w*)/g)) if (!want.has(m[1])) (missing[m[1]] = missing[m[1]] || new Set()).add(f);
  }
  assert.deepEqual(Object.fromEntries(Object.entries(missing).map(([k, v]) => [k, [...v]])), {}, 'declare these in the literal G in js/game.js, with a comment');
});

test('the check reads the literal as it is: a name it lacks is reported', () => {
  assert.deepEqual([...declared('const G = {\n  state: null,  // saved, see x\n  keys: {}, a: 1,\n};')].sort(), ['a', 'keys', 'state']);
});
