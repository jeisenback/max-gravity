'use strict';

// The scene index (#335): editor.html lists every scene, read-only. These open the page itself (it reads the game in two hidden frames of
// itself) and check the rows against the game's own registries.

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const { open, watch, closeBrowser } = require('./helpers');

const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.join(ROOT, 'editor.html');
let browser, page, errors, rows;

before(async () => {
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  page = await (await browser.newContext({ viewport: { width: 1400, height: 900 } })).newPage();
  errors = [];
  watch(page, errors);
  await page.goto(URL);
  await page.waitForFunction(() => SceneIndex.rows, null, { timeout: 30000 });
  rows = await page.evaluate(() => SceneIndex.rows);
});
after(async () => {
  assert.deepEqual(errors, [], 'page errors');
  await browser.close();
  await closeBrowser();
});

const row = id => rows.find(r => r.id === id);

test('the page loads the same scripts as the game, in the same order, and is not part of the game', () => {
  const index = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const scripts = [...index.matchAll(/<script src="(js\/[^"]+)"><\/script>/g)].map(m => m[1]).filter(s => s !== 'js/game.js');
  const listed = JSON.parse(fs.readFileSync(path.join(ROOT, 'editor.js'), 'utf8').match(/const SCRIPTS = (\[[^\]]*\])/)[1].replace(/'/g, '"').replace(/,\s*\]$/, ']'));
  assert.deepEqual(listed, scripts);
  assert.ok(!index.includes('editor'), 'index.html does not link the editor');
  assert.ok(!fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8').includes('editor'), 'the service worker does not cache it');
});

test('every storylet is listed once, as data, with its source file', async () => {
  const g = await open({ scope: 'full' });
  const ids = await g.ev(() => STORYLETS.map(s => s.id));
  await g.done();
  const data = rows.filter(r => r.kind === 'data');
  assert.deepEqual(data.map(r => r.id).sort(), [...ids].sort());
  assert.equal(new Set(rows.map(r => r.id)).size, rows.length, 'ids are unique');
  for (const r of data) assert.match(r.file, /^js\/stories\/[\w-]+\.js$/, r.id);
  assert.equal(row('port-mars-front').file, 'js/stories/ports.js');
  assert.equal(row('port-mars-front').where, 'port');
  assert.equal(row('port-mars-front').title, 'A Front Over the Valley');
  assert.ok(row('port-mars-front').choices.some(c => c.label === 'Sit it out aboard' && /two hours and a bit/.test(c.result)));
});

test('the hired chapter\'s code-written scenes are listed as code, and say where their text lives', () => {
  const late = row('cast:ilsa:late');
  assert.equal(late.kind, 'code');
  assert.equal(late.file, 'js/captains/ilsa.js');
  assert.equal(late.title, 'What Ilsa Knows');
  assert.equal(late.where, 'transit');
  assert.match(late.text, /The fund has been short every quarter/);
  assert.equal(late.belongs, "ilsa (first officer)");
  assert.match(late.codeNote, /result lines are written inside functions/);
  assert.ok(late.choices.length > 0 && late.choices.every(c => c.label && c.result === ''));
  assert.equal(row('cast:ines:meet').where, 'port');
  assert.ok(row('cast:cato:late:closed'), 'a closed reading is its own row');
  // A text that reads the hull and the medic cannot be read without a game, and says so.
  assert.equal(row('cast:ines:pivot').text, '');
  assert.match(row('cast:ines:pivot').codeNote, /built from the game state/);
  for (const id of ['captain:hester:trouble', 'captain:hester:secret:confide', 'captain:hester:secret:found', 'captain:hester:goodbye', 'hired:pilot-drift', 'ice:1']) assert.ok(row(id), id);
  assert.equal(row('captain:hester:goodbye').where, 'port');
  assert.match(row('captain:dov:trouble').file, /captains\/dov\.js/);
  // Tables of text are read in full.
  assert.match(row('hired:pilot-drift').text, /stale/);
  assert.match(row('hired:pilot-drift').choices[1].result, /If it goes well: .*\nIf it does not: /s);
  assert.match(row('ice:1').choices.at(-1).label, /^\[comms\] /);
  // An event built whole in code has an id and a group, and no text.
  const built = rows.find(r => r.id === 'hired:cap-order');
  assert.equal(built.text, '');
  assert.match(built.codeNote, /built in code/);
});

test('a scene of conditional parts reads as plain text that says which parts are conditional', async () => {
  const text = await page.evaluate(() => SceneIndex.plain(['Always.', { when: { day: 5 }, text: 'Later.', else: 'Not yet.' }, { when: { crew: 'x' }, text: 'Crew.' }]));
  assert.equal(text, 'Always. [if {"day":5}] Later. [otherwise] Not yet. [if {"crew":"x"}] Crew.');
  assert.ok(rows.filter(r => r.kind === 'data').every(r => typeof r.text === 'string' && r.text.length > 0), 'no storylet has empty text');
});

test('scenes the narrow build leaves out are listed and marked off', () => {
  assert.equal(row('strike-broadcast').off, true, 'a storyline');
  assert.equal(row('land-customs').off, false, 'a landing scene');
  assert.equal(row('cast:ines:mid1').off, false, 'a main character of the Earth start');
  assert.equal(row('cast:yelena:mid1').off, true, 'a main character of another start');
  assert.equal(row('cast:cato:intro').off, false, 'the captain\'s first officer');
  assert.equal(row('cast:ilsa:intro').off, true, 'another captain\'s first officer');
  assert.equal(row('captain:hester:trouble').off, false);
  assert.equal(row('captain:dov:trouble').off, true);
  assert.equal(row('hired:gunner-jam').off, false, 'the one post');
  assert.equal(row('hired:pilot-drift').off, true, 'another post');
  assert.equal(row('ice:2').off, false);
});

test('search finds an id, a word in the title, and a word in the text or a result', async () => {
  const find = q => page.evaluate(q => SceneIndex.filterRows(SceneIndex.rows, { q }).map(r => r.id), q);
  assert.deepEqual(await find('port-mars-front'), ['port-mars-front']);
  assert.ok((await find('valley')).includes('port-mars-front'), 'a title word');
  assert.ok((await find('siren dust')).includes('port-mars-front'), 'words in the text, in any order');
  assert.ok((await find('butterscotch')).includes('port-mars-sky'), 'a word in a result');
  assert.ok((await find('FUND BOOK')).includes('cast:ilsa:late'), 'any case, in a code-written scene');
  assert.deepEqual(await find('no such scene xyzzy'), []);
});

test('the filters narrow by where, by source and by data or code', async () => {
  const filter = f => page.evaluate(f => SceneIndex.filterRows(SceneIndex.rows, f).map(r => r.id), f);
  const port = await filter({ where: 'port' });
  assert.ok(port.length > 0 && port.every(id => row(id).where === 'port'));
  assert.ok(port.includes('port-mars-front') && !port.includes('strike-broadcast'));
  assert.deepEqual((await filter({ file: 'js/stories/ice-strike.js' })).every(id => row(id).file === 'js/stories/ice-strike.js'), true);
  const code = await filter({ kind: 'code' });
  assert.ok(code.includes('cast:ilsa:late') && !code.includes('port-mars-front'));
  assert.deepEqual(await filter({ kind: 'data', file: 'js/cast.js' }), [], 'filters combine');
});

test('the page shows the rows, opens a scene to read it, and filters as you type', async () => {
  assert.equal(await page.textContent('#count'), `${rows.length} of ${rows.length} scenes`);
  await page.fill('#q', 'butterscotch');
  assert.equal(await page.textContent('#count'), '1 of ' + rows.length + ' scenes');
  await page.click('button[data-id="port-mars-sky"]');
  const detail = await page.textContent('#detail');
  assert.match(detail, /What Color the Sky Will Be/);
  assert.match(detail, /Side with the veteran/);
  assert.match(detail, /butterscotch/i);
  await page.selectOption('#kind', 'code');
  assert.match(await page.textContent('#list'), /No scene matches/);
  await page.selectOption('#kind', '');
  await page.fill('#q', 'strike-broadcast');
  assert.match(await page.textContent('#list'), /off in the narrow build/);
  await page.fill('#q', '');
});

test('nothing on the page can change a scene', async () => {
  assert.equal(await page.locator('textarea, [contenteditable]').count(), 0);
  const inputs = await page.locator('input, select').evaluateAll(list => list.map(e => e.id));
  assert.deepEqual(inputs, ['q', 'where', 'file', 'kind'], 'the controls only filter');
});

test('every field is escaped on the page', async () => {
  const html = await page.evaluate(() => {
    const evil = { id: 'x"><img src=x onerror=1>', title: '<script>1</script>', where: '<b>', file: '<i>', belongs: '<u>', kind: '<s>', off: true, codeNote: '<em>note</em>', text: '<img src=x>\n<p>', choices: [{ label: '<a href=x>', result: '<svg onload=1>' }] };
    return SceneIndex.tableHtml([evil], evil.id) + SceneIndex.detailHtml(evil);
  });
  assert.ok(!/<(?:img|script|svg|a |b>|i>|u>|s>|em>)/.test(html), html);
  assert.match(html, /&lt;script&gt;1&lt;\/script&gt;/);
});
