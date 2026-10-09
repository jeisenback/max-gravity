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
  try { assert.deepEqual(errors, [], 'page errors'); } finally { await browser.close(); await closeBrowser(); }
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
  const data = rows.filter(r => r.kind === 'data' && !r.registry);  // the storylets; the hired scenes of the registry are data or code by how they are written
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
  assert.match(late.codeNote, /choices run code/);
  assert.ok(late.choices.length > 0 && late.choices.every(c => c.label) && late.choices.some(c => c.result === ''), 'a choice that runs code has no result of its own');
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
  const castData = await filter({ kind: 'data', file: 'js/cast.js' });
  assert.ok(castData.includes('cast:ines:intro') && !castData.includes('cast:ines:meet') && castData.every(id => row(id).kind === 'data' && row(id).file === 'js/cast.js'), 'filters combine');
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

test('a code-written scene has no form, and a data scene\'s form edits only its words', async () => {
  const inputs = await page.locator('.controls input, .controls select').evaluateAll(list => list.map(e => e.id));
  assert.deepEqual(inputs, ['q', 'where', 'file', 'kind', 'view', 'group', 'import-file'], 'the controls above the list filter, choose a view and import a file');
  await page.fill('#q', 'scene:warning');
  await page.click('button[data-id="scene:warning"]');
  assert.equal(await page.locator('#detail textarea').count(), 0);
  assert.match(await page.textContent('#detail'), /cannot be edited here until its text has an id/);
  await page.fill('#q', 'port-mars-sky');
  await page.click('button[data-id="port-mars-sky"]');
  // Title, text, and a label and a result for each of three choices; the shipped words are beside each.
  assert.deepEqual(await page.locator('#detail textarea').evaluateAll(l => l.map(e => e.dataset.path)),
    ['title', 'text', 'c0.label', 'c0.result', 'c1.label', 'c1.result', 'c2.label', 'c2.result']);
  assert.equal(await page.locator('#detail .shipped').count(), 8);
  assert.match(await page.textContent('#detail .shipped'), /What Color the Sky Will Be/);
  assert.equal(await page.inputValue('#f-title'), 'What Color the Sky Will Be', 'the box starts with the shipped words');
  await page.fill('#q', '');
});

test('typing changes a field, and the changes hold only what differs from the shipped words', async () => {
  await page.fill('#q', 'port-mars-sky');
  await page.click('button[data-id="port-mars-sky"]');
  assert.equal(await page.textContent('#changes'), 'const SCENE_OVERRIDES = {};\nconst NEW_SCENES = [];');
  await page.fill('#f-title', 'A New Title');
  await page.fill('#f-c1\\.label', 'Side with the numbers');
  await page.fill('#f-c2\\.result', 'They stop. "Butterscotch," says the veteran.');
  const overrides = JSON.parse((await page.textContent('#changes')).match(/^const SCENE_OVERRIDES = ([\s\S]*?);\nconst NEW_SCENES/)[1]);
  assert.deepEqual(overrides, { 'port-mars-sky': { title: 'A New Title', choices: { 1: { label: 'Side with the numbers' }, 2: { result: 'They stop. "Butterscotch," says the veteran.' } } } });
  // Putting the shipped words back, or emptying the box, is no change.
  await page.fill('#f-title', 'What Color the Sky Will Be');
  await page.fill('#f-c1\\.label', '');
  assert.match(await page.textContent('[data-warn="c1.label"]'), /Empty: the shipped words are used/);
  await page.fill('#f-c2\\.result', await page.evaluate(() => SceneIndex.rows.find(r => r.id === 'port-mars-sky').choices[2].result));
  assert.equal(await page.textContent('#changes'), 'const SCENE_OVERRIDES = {};\nconst NEW_SCENES = [];');
  // The list marks a scene with changes in it.
  await page.fill('#f-text', 'Different words.');
  await page.fill('#q', 'mars-sky');
  assert.match(await page.textContent('#list'), /edited/);
  await page.fill('#f-text', await page.evaluate(() => SceneIndex.rows.find(r => r.id === 'port-mars-sky').text));
});

test('a placeholder the game does not replace is flagged in the form, and the real ones are not', async () => {
  await page.fill('#q', 'port-mars-sky');
  await page.click('button[data-id="port-mars-sky"]');
  const warn = () => page.textContent('[data-warn="text"]');
  await page.fill('#f-text', 'Captain {captian} waits at {planet} with {crew:pilot}, {crew}, {system}, {captain} and {thread:loan}.');
  assert.match(await warn(), /\{captian\}/);
  assert.ok(!/planet|crew|system|\{captain\}|thread/.test(await warn()), await warn());
  await page.fill('#f-text', 'Ask {crew:pilott} about {nope}.');
  assert.match(await warn(), /\{crew:pilott\} \{nope\}/);
  await page.fill('#f-text', 'All good: {planet}.');
  assert.equal(await warn(), '');
  // The page's check and the game's give the same answer.
  const samples = ['{planet}', '{planet }', '{crew:pilot}', '{crew:pilott}', '{crew}', '{thread:loan}', '{thread:}', '{who}', '{}', 'plain', '{system} {captian}'];
  const here = await page.evaluate(s => s.map(t => SceneIndex.badPlaceholders(t)), samples);
  const g = await open({ scope: 'full' });
  const there = await g.ev(s => s.map(t => unknownPlaceholders(t)), samples);
  await g.done();
  assert.deepEqual(here, there);
  await page.fill('#f-text', await page.evaluate(() => SceneIndex.rows.find(r => r.id === 'port-mars-sky').text));
});

test('a text of conditional parts is shown but not edited as one string', async () => {
  const parted = rows.find(r => r.kind === 'data' && !r.edit.text);
  assert.ok(parted, 'some storylet has a text of parts');
  await page.fill('#q', parted.id);
  await page.click(`button[data-id="${parted.id}"]`);
  assert.equal(await page.locator('#f-text').count(), 0);
  assert.match(await page.textContent('#detail'), /depend on conditions/);
  assert.ok(await page.locator('#f-title').count() === 1, 'its title can still be edited');
  await page.fill('#q', '');
});

test('what the form writes is what the game reads: the changes, pasted into the file, change the scene and nothing else', async () => {
  await page.fill('#q', 'port-mars-sky');
  await page.click('button[data-id="port-mars-sky"]');
  await page.fill('#f-title', 'Round Trip');
  await page.fill('#f-c0\\.result', 'A line from the editor, for {planet}.');
  const file = await page.textContent('#changes');
  await page.fill('#f-title', 'What Color the Sky Will Be');
  await page.fill('#f-c0\\.result', await page.evaluate(() => SceneIndex.rows.find(r => r.id === 'port-mars-sky').choices[0].result));
  const g = await open({ scope: 'full' });
  const r = await g.ev(src => {
    const warned = []; const real = console.warn; console.warn = m => warned.push(m);
    Function(`${src.replace('const SCENE_OVERRIDES', 'var SCENE_OVERRIDES_FROM_EDITOR').replace('const NEW_SCENES', 'var NEW_FROM_EDITOR')}; window.fromEditor = SCENE_OVERRIDES_FROM_EDITOR;`)();
    useOverrides(window.fromEditor); console.warn = real;
    const ev = storyletEvent(STORYLETS.find(x => x.id === 'port-mars-sky'));
    return { warned, title: ev.title, result: ev.choices[0].run(), other: ev.choices[1].label };
  }, file);
  await g.done();
  assert.deepEqual(r.warned, []);
  assert.equal(r.title, 'Round Trip');
  assert.match(r.result, /^A line from the editor, for \S/);
  assert.equal(r.other, 'Side with the modeler');
});

test('the changes a file already holds are the form\'s starting values, and come back out unchanged', async () => {
  const file = { 'port-mars-sky': { title: 'T', text: 'X', choices: { 0: { label: 'L', result: 'R' }, 2: { result: 'R2' } } }, 'land-customs': { choices: { 1: { label: 'Pay' } } } };
  const out = await page.evaluate(f => SceneIndex.overridesFrom(SceneIndex.rows, SceneIndex.valuesFrom(f)), file);
  assert.deepEqual(out, file);
  assert.deepEqual(await page.evaluate(() => SceneIndex.valuesFrom({ 'port-mars-sky': { choices: { 1: { label: 'L' } } } })), { 'port-mars-sky': { 'c1.label': 'L' } });
});

test('every field is escaped on the page', async () => {
  const html = await page.evaluate(() => {
    const evil = { id: 'x"><img src=x onerror=1>', title: '<script>1</script>', where: '<b>', file: '<i>', belongs: '<u>', kind: '<s>', off: true, codeNote: '<em>note</em>', text: '<img src=x>\n<p>', choices: [{ label: '<a href=x>', result: '<svg onload=1>' }] };
    return SceneIndex.tableHtml([evil], evil.id) + SceneIndex.detailHtml(evil);
  });
  assert.ok(!/<(?:img|script|svg|a |b>|i>|u>|s>|em>)/i.test(html), html);
  assert.match(html, /&lt;script&gt;1&lt;\/script&gt;/);
  // A data scene's form, and the file text, with hostile words typed into it.
  const form = await page.evaluate(() => {
    const evil = { id: 'x"><img src=x>', title: '<script>1</script>', where: 'port', file: 'f', belongs: 'b', kind: 'data', text: '<img src=x>', choices: [{ label: '<a href=x>', result: '<svg onload=1>' }],
      edit: { text: true, choices: [{ label: true, result: true }] } };
    const values = { [evil.id]: { title: '"><img src=y>', 'c0.result': '<b>r</b>' } };
    return SceneIndex.detailHtml(evil, values, [evil]);
  });
  assert.ok(!/<(?:img|script|svg|a |b>)/i.test(form), form);
  assert.match(form, /&lt;b&gt;r&lt;\/b&gt;/);
});

test('words typed into the form are not run as markup', async () => {
  await page.fill('#q', 'port-mars-sky');
  await page.click('button[data-id="port-mars-sky"]');
  await page.fill('#f-text', '<img src=x onerror=1> and {planet}');
  assert.equal(await page.locator('#detail img, #detail svg, #changes img').count(), 0);
  assert.match(await page.textContent('#changes'), /<img src=x onerror=1>/, 'shown as text');
  await page.fill('#f-text', await page.evaluate(() => SceneIndex.rows.find(r => r.id === 'port-mars-sky').text));
});
