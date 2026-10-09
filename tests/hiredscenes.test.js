'use strict';

// Every scene of the hired chapter has a stable id in one registry (js/hiredscenes.js), whether it is data or code (#342). The list of ids is pinned in
// tests/fixtures/hired-scene-ids.json: an id is never reused for another scene, so a change to the list is a decision. After adding or renaming a scene,
// write the fixture again with `PIN_WRITE=1 node --test tests/hiredscenes.test.js` and read the diff.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

const FIXTURE = path.join(__dirname, 'fixtures', 'hired-scene-ids.json');

test('every hired scene has an id, the ids are unique, and the list is the one pinned', async () => {
  const g = await open({ scope: 'full' });
  const ids = await g.ev(() => hiredSceneRegistry().map(e => e.id));
  await g.done();
  assert.equal(new Set(ids).size, ids.length, 'ids are unique');
  for (const id of ids) assert.match(id, /^(cast|captain|hired|ice|scene|beats):[\w:.-]+$/, id);
  if (process.env.PIN_WRITE) fs.writeFileSync(FIXTURE, JSON.stringify(ids, null, 1) + '\n');
  assert.deepEqual(ids, JSON.parse(fs.readFileSync(FIXTURE, 'utf8')));
});

test('the registry holds every scene the game\'s own registries hold', async () => {
  const g = await open({ scope: 'full' });
  const r = await g.ev(() => {
    const ids = new Set(hiredSceneRegistry().map(e => e.id)), missing = [];
    const need = id => { if (!ids.has(id)) missing.push(id); };
    for (const [k, c] of Object.entries(CAST)) for (const [n, s] of Object.entries(c.scenes)) { need(`cast:${k}:${n}`); if (s.closed) need(`cast:${k}:${n}:closed`); }
    for (const [k, c] of Object.entries(CAPTAINS)) { need(`captain:${k}:trouble`); need(`captain:${k}:secret:confide`); need(`captain:${k}:secret:found`); need(`captain:${k}:goodbye`); }
    for (const d of WORK_EVENTS) need(`hired:${d.id}`);
    for (const d of HAND_EVENTS) need(`hired:${d.id}`);
    ICE_STAGES.forEach((s, i) => need(`ice:${i + 1}`));
    // The functions that build the rest exist, and are the ones the registry names.
    const gone = HIRED_FUNCTION_SCENES.filter(f => typeof window[f.fn] !== 'function').map(f => f.id);
    return { missing, gone, n: ids.size, functions: HIRED_FUNCTION_SCENES.length };
  });
  await g.done();
  assert.deepEqual(r.missing, []);
  assert.deepEqual(r.gone, []);
  assert.equal(r.functions, 14);
  assert.ok(r.n >= 124, `${r.n} scenes`);
});

test('the editor\'s index shows every id in the registry', async () => {
  const { chromium } = require('playwright');
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  try {
    const page = await browser.newPage();
    await page.goto('file://' + path.resolve(__dirname, '..', 'editor.html'));
    await page.waitForFunction(() => SceneIndex.rows, null, { timeout: 30000 });
    const rows = await page.evaluate(() => SceneIndex.rows.filter(r => r.kind === 'code' || /^(cast|captain|hired|ice|scene|beats):/.test(r.id)).map(r => r.id));
    const pinned = JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));
    assert.deepEqual(pinned.filter(id => !rows.includes(id)), [], 'in the registry, missing from the index');
  } finally { await browser.close(); }
});
