'use strict';

// The generated people's scenes and line tables in the editor (#457, #478): the raid, ambush and boarding beats, the line tables, the passenger, crew, bar, relationship and talk
// scenes, and the jobs further away. Each has its words in the form and plays in the preview with the people it is about. Split from editorhired.test.js to keep each file short (#583).

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require('playwright');
const { open, watch, closeBrowser } = require('./helpers');

const URL = 'file://' + path.resolve(__dirname, '..', 'editor.html');
let browser, page, errors;

before(async () => {
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  const ctx = await browser.newContext({ viewport: { width: 1700, height: 1000 } });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, route => route.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  page = await ctx.newPage();
  errors = [];
  watch(page, errors);
  await page.goto(URL);
  await page.waitForFunction(() => SceneIndex.rows, null, { timeout: 30000 });
});
after(async () => {
  try { assert.deepEqual(errors, [], 'page errors'); } finally { await browser.close(); await closeBrowser(); }
});

async function reload() { await page.goto(URL); await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForFunction(() => SceneIndex.rows, null, { timeout: 30000 }); }
const select = async id => { await page.fill('#q', id); await page.click(`button[data-id="${id}"]`); };
const rule = (p, key) => `[data-rpath="${p}"][data-rkey="${key}"]`;
const changes = async () => JSON.parse((await page.textContent('#changes')).match(/^const SCENE_OVERRIDES = ([\s\S]*?);\nconst NEW_SCENES/)[1]);
async function play() {
  await page.evaluate(() => { document.querySelector('#pv-report').replaceChildren(); document.querySelector('#pv-effects').replaceChildren(); });
  await page.click('[data-action="play"]');
  await page.waitForFunction(() => document.querySelector('#pv-report').textContent.length > 0, null, { timeout: 30000 });
  const f = page.frames().find(x => /editor-preview/.test(x.url()));
  await f.waitForFunction(() => typeof G !== 'undefined' && G.dialog, null, { timeout: 30000 });
  return f;
}

test('the raid, ambush and boarding beats are edited line by line, the lines go to and from the file, and each plays in the preview (#478)', async () => {
  await reload(); await select('beats:raid');
  const r = await page.evaluate(() => {
    const row = id => SceneIndex.rows.find(x => x.id === id), raid = row('beats:raid'), values = { [raid.id]: { 'part.open.gun.0': 'A new opening.', 'part.close.standoff': raid.parts['close.standoff'] } };
    const out = SceneIndex.overridesFrom(SceneIndex.rows, values);
    return {
      kinds: ['beats:raid', 'beats:ambush', 'beats:repel', 'beats:assault', 'beats:dead-in-space'].map(id => [row(id).kind, row(id).noTitle, Object.keys(row(id).parts).length > 10]), dead: row('beats:dead-in-space').kind,
      out: out[raid.id], back: SceneIndex.valuesFrom(out)[raid.id],
      plan: SceneIndex.planImport({ overrides: { 'beats:raid': { title: 'No', parts: { 'open.gun.1': 'Ok.', nope: 'x' } } } }, SceneIndex.rows).items.map(i => i[0] === undefined ? i.ok : i.ok),
    };
  });
  assert.deepEqual(r.kinds.slice(0, 4), [['data', true, true], ['data', true, true], ['data', true, true], ['data', true, true]]);
  assert.deepEqual(r.kinds[4].slice(0, 2), ['data', true], 'the dead-in-space scene has fewer lines');
  assert.equal(r.dead, 'data', 'the dead-in-space scene is lines like the other beats');
  assert.deepEqual(r.out, { parts: { 'open.gun.0': 'A new opening.' } }, 'only what differs');
  assert.deepEqual(r.back, { 'part.open.gun.0': 'A new opening.' });
  assert.deepEqual(r.plan, [false, false, true], 'the title and the unknown line are refused');
  assert.equal(await page.locator('#detail #f-title').count(), 0, 'a beat has no title to change');
  assert.ok(await page.locator('#detail textarea[data-path^="part."]').count() > 60, 'a field for every line');
  assert.ok(await page.locator('#detail h4', { hasText: /^exchange$/ }).count() === 1, 'the lines are grouped');
  for (const [id, lines] of [['beats:raid', ['open.grapple.0', 'open.torpedo.0', 'open.gun.0']], ['beats:repel', ['open.1.0']], ['beats:assault', ['open.1.0']], ['beats:ambush', ['read.gunner.label']]]) {  // the raid's foe is drawn, so any style's opening
    await select(id);
    for (const line of lines) await page.fill(`textarea[data-path="part.${line}"]`, `Typed ${id}.`);
    const f = await play();
    const seen = await f.evaluate(() => JSON.stringify([G.dialog.event.title, G.dialog.event.text, G.dialog.choices.map(c => c.label)]));
    assert.ok(seen.includes(`Typed ${id}.`), `${id} plays the typed line: ${seen.slice(0, 200)}`);
  }
});

test('the line tables of the generated people are rows with a field for every line, the lines go to and from the file, and there is no scene to play (#457)', async () => {
  await reload(); await select('lines:bar-leave');
  const r = await page.evaluate(() => {
    const row = id => SceneIndex.rows.find(x => x.id === id), leave = row('lines:bar-leave'), values = { [leave.id]: { 'part.1': 'A new goodbye, {n}.', 'part.0': leave.parts['0'] } };
    const out = SceneIndex.overridesFrom(SceneIndex.rows, values);
    return {
      tables: SceneIndex.rows.filter(x => x.id.startsWith('lines:')).map(x => [x.id, x.kind, x.noTitle, x.where, x.file]),
      out: out[leave.id], back: SceneIndex.valuesFrom(out)[leave.id],
      plan: SceneIndex.planImport({ overrides: { 'lines:bar-leave': { title: 'No', parts: { 1: 'Ok.', 7: 'x' } } } }, SceneIndex.rows).items.map(i => i.ok),
    };
  });
  assert.equal(r.tables.length, 39);  // the 18 of the bar and the chatter, the two of the ship's rooms and lights, the four of the world's news, rumors and errands, the causes and the critics of js/social.js, and the 11 of js/familytext.js
  assert.ok(r.tables.every(([, kind, noTitle]) => kind === 'data' && noTitle), 'each is lines and no title');
  assert.deepEqual(r.tables.find(t => t[0] === 'lines:trait-chatter'), ['lines:trait-chatter', 'data', true, 'transit', 'js/peopletext.js']);
  assert.deepEqual(r.out, { parts: { 1: 'A new goodbye, {n}.' } }, 'only what differs');
  assert.deepEqual(r.back, { 'part.1': 'A new goodbye, {n}.' });
  assert.deepEqual(r.plan, [false, false, true], 'the title and the unknown line are refused');
  assert.equal(await page.locator('#detail #f-title').count(), 0, 'a table has no title to change');
  assert.equal(await page.locator('#detail textarea[data-path^="part."]').count(), 4, 'a field for every line');
  assert.equal(await page.isDisabled('[data-action="play"]'), true, 'a pool of lines has no scene to play');
  assert.match(await page.textContent('#pv-scene'), /no scene to play/);
  await select('lines:bar-trait');
  assert.ok(await page.locator('#detail textarea[data-path="part.talkative.win"]').count() === 1, 'a line under two keys');
});

test('the passenger and crew events are rows with a field for every line, the lines go to and from the file, and each plays in the preview with the person it is about (#457)', async () => {
  await reload(); await select('people:pax:debt');
  const r = await page.evaluate(() => {
    const row = id => SceneIndex.rows.find(x => x.id === id), debt = row('people:pax:debt'), values = { [debt.id]: { 'part.c1.result': 'They go, {first}.', 'part.title': debt.parts.title } };
    const out = SceneIndex.overridesFrom(SceneIndex.rows, values);
    return {
      events: SceneIndex.rows.filter(x => x.id.startsWith('people:pax:')).map(x => [x.id, x.kind, x.noTitle, x.where, x.file]),
      crew: SceneIndex.rows.filter(x => x.id.startsWith('people:crew:')).map(x => [x.id, x.kind, x.noTitle, x.where, x.file]),
      out: out[debt.id], back: SceneIndex.valuesFrom(out)[debt.id], ill: Object.keys(row('people:pax:ill').parts).filter(k => k.startsWith('reason')),
      plan: SceneIndex.planImport({ overrides: { 'people:pax:debt': { title: 'No', parts: { 'c1.result': 'Ok.', 'c9.result': 'x' } } } }, SceneIndex.rows).items.map(i => i.ok),
    };
  });
  assert.equal(r.events.length, 15);
  assert.equal(r.crew.length, 12);
  assert.ok(r.crew.every(([, kind, noTitle, where, file]) => kind === 'data' && noTitle && where === 'transit' && file === 'js/people.js'), 'each crew event is lines too');
  assert.ok(r.events.every(([, kind, noTitle, where, file]) => kind === 'data' && noTitle && where === 'transit' && file === 'js/people.js'), 'each is lines, in a burn, in js/people.js');
  assert.deepEqual(r.out, { parts: { 'c1.result': 'They go, {first}.' } }, 'only what differs');
  assert.deepEqual(r.back, { 'part.c1.result': 'They go, {first}.' });
  assert.deepEqual(r.ill, ['reason.ill', 'reason.medical'], 'a line the text leads to is a line of its own');
  assert.deepEqual(r.plan, [false, false, true], 'the title and the unknown line are refused');
  assert.equal(await page.locator('#detail #f-title').count(), 0, 'an event has no title to change');
  assert.equal(await page.locator('#detail textarea[data-path^="part."]').count(), 8, 'a field for every line, the memories it leaves too');
  for (const id of ['people:pax:debt', 'people:pax:contraband', 'people:pax:ill', 'people:pax:curious', 'people:crew:greedy', 'people:crew:brave']) {
    await select(id);
    await page.fill('textarea[data-path="part.text"]', `Typed ${id}.`);
    const f = await play();
    const seen = await f.evaluate(() => JSON.stringify([G.dialog.event.title, G.dialog.event.text, G.dialog.choices.map(c => c.label)]));
    assert.ok(seen.includes(`Typed ${id}.`), `${id} plays the typed line: ${seen.slice(0, 200)}`);
  }
});

test('the bar topics are rows with a field for every line, and each plays at a bar table with a person it is about (#457)', async () => {
  await reload(); await select('bar:drink');
  const r = await page.evaluate(() => {
    const rows = SceneIndex.rows.filter(x => x.id.startsWith('bar:'));
    return { ids: rows.map(x => x.id), shape: rows.every(x => x.kind === 'data' && x.noTitle && x.where === 'port'), drink: Object.keys(SceneIndex.rows.find(x => x.id === 'bar:drink').parts) };
  });
  assert.equal(r.ids.length, 15, 'thirteen topics and the two help scenes');
  assert.ok(r.shape, 'each is lines, at a port');
  assert.deepEqual(r.drink, ['label', 'gate', 'generous', 'rumor', 'memory']);
  assert.equal(await page.locator('#detail textarea[data-path^="part."]').count(), 5);
  for (const id of ['bar:drink', 'bar:cards', 'bar:bless', 'bar:fight']) {
    await select(id);
    await page.fill('textarea[data-path="part.label"]', `Typed ${id}.`);
    const f = await play();
    const seen = await f.evaluate(() => JSON.stringify(G.dialog.choices.map(c => c.label)));
    assert.ok(seen.includes(`Typed ${id}.`), `${id} plays the typed button: ${seen.slice(0, 200)}`);
  }
  for (const id of ['bar:goal-help', 'bar:secret-help']) {
    await select(id);
    await page.fill('textarea[data-path="part.close.label"]', `Typed ${id}.`);
    const f = await play();
    const seen = await f.evaluate(() => JSON.stringify(G.dialog.choices.map(c => c.label)));
    assert.ok(seen.includes(`Typed ${id}.`), `${id} plays the typed closing button: ${seen.slice(0, 200)}`);
  }
});

test('the relationship scenes are rows with a field for every line, and each plays in a burn with the people it is about (#457)', async () => {
  await reload(); await select('social:small-ship');
  const r = await page.evaluate(() => {
    const rows = SceneIndex.rows.filter(x => x.id.startsWith('social:'));
    return { ids: rows.map(x => x.id), shape: rows.every(x => x.kind === 'data' && x.noTitle && x.where === 'transit' && x.file === 'js/social.js'), word: Object.keys(SceneIndex.rows.find(x => x.id === 'social:word').parts).includes('title.hired') };
  });
  assert.equal(r.ids.length, 21, 'twelve relationship scenes, the welcome back, the feeds and the activities');
  assert.ok(r.shape, 'each is lines, in a burn, in js/social.js');
  assert.ok(r.word, 'the hired reading of a word is a line of its own');
  for (const id of r.ids.filter(x => !/feed|crew-talk|headlines|watch-|read-book|stream-match|card-night/.test(x))) {
    await select(id);
    await page.fill('textarea[data-path="part.title"]', `Typed ${id}.`);
    const f = await play();
    const seen = await f.evaluate(() => JSON.stringify([G.dialog.event.title, G.dialog.choices.map(c => c.label)]));
    assert.ok(seen.includes(`Typed ${id}.`), `${id} plays the typed title: ${seen.slice(0, 200)}`);
  }
});

test('the talk scenes are rows with a field for every line, and each plays in a burn with a shipmate it is about (#457)', async () => {
  await reload(); await select('family:mood');
  const r = await page.evaluate(() => {
    const rows = SceneIndex.rows.filter(x => x.id.startsWith('family:'));
    return { ids: rows.map(x => x.id), shape: rows.every(x => x.kind === 'data' && x.noTitle && x.where === 'transit' && x.file === 'js/family.js') };
  });
  assert.equal(r.ids.length, 21, 'the talk scenes, the picker, the birthday and holidays, the news, the traditions, the cat and the offer to stay');
  assert.ok(r.shape, 'each is lines, in a burn, in js/family.js');
  for (const id of r.ids) {
    await select(id);
    const line = id === 'family:holiday' ? 'c0.label' : 'title';  // the holidays take their titles from their names
    await page.fill(`textarea[data-path="part.${line}"]`, `Typed ${id}.`);
    const f = await play();
    const seen = await f.evaluate(() => JSON.stringify([G.dialog.event.title, G.dialog.choices.map(c => c.label)]));
    assert.ok(seen.includes(`Typed ${id}.`), `${id} plays the typed ${line}: ${seen.slice(0, 200)}`);
  }
});

test('the jobs on the station and further away are rows (the job, then each stage) with the words in the form, and each stage plays in the preview (#457)', async () => {
  await reload(); await select('job:lock:0');
  const r = await page.evaluate(() => ({ ids: SceneIndex.rows.filter(x => /^(job|away):/.test(x.id)).map(x => x.id), shape: SceneIndex.rows.filter(x => /^(job|away):/.test(x.id)).every(x => x.kind === 'data' && x.table && x.where === 'port') }));
  assert.equal(r.ids.length, 19, 'eight jobs, and their stages');
  assert.ok(r.shape, 'each is a table scene, at a port');
  assert.ok(['job:lock', 'job:lock:1', 'job:ration:0', 'away:package', 'away:package:1', 'away:witness:0'].every(id => r.ids.includes(id)), r.ids.join());
  const lock = await page.locator('#detail [data-path]').evaluateAll(els => els.map(e => e.dataset.path));
  assert.deepEqual(lock, ['title', 'text', 'c0.label', 'c0.win', 'c0.lose', 'c1.label', 'c1.win', 'c1.lose', 'c2.label', 'c2.win', 'c2.lose', 'c3.label', 'c3.win'], 'a choice that cannot be lost has no line for it');
  assert.equal(await page.locator('#detail [data-add]').count(), 0, 'no conditions or effects to edit: the odds and the pay are in code');
  await page.fill('#f-title', 'The Lock, edited');
  await page.fill('#f-c0\\.win', 'You cut the pin, the editor\'s way.');
  assert.deepEqual(await changes(), { 'job:lock:0': { title: 'The Lock, edited', choices: { 0: { win: 'You cut the pin, the editor\'s way.' } } } });
  const f = await play();
  assert.equal(await f.evaluate(() => G.dialog.event.title), 'The Lock, edited');
  assert.ok((await f.evaluate(() => G.dialog.choices.length)) >= 3);
  // the job itself: its title and blurb, as the Missions page shows them; and a job further away
  await reload(); await select('job:message');
  assert.deepEqual(await page.locator('#detail [data-path]').evaluateAll(els => els.map(e => e.dataset.path)), ['title', 'text']);
  await page.fill('#f-text', 'A new blurb for the board.');
  assert.deepEqual(await changes(), { 'job:message': { text: 'A new blurb for the board.' } });
  await reload(); await select('away:package:0');
  await page.fill('#f-title', 'Away, edited');
  const a = await play();
  assert.equal(await a.evaluate(() => G.dialog.event.title), 'Away, edited');
});

test('the pitch for work further away has its lines in the form and plays in the preview (#457)', async () => {
  await reload(); await select('scene:pitch');
  const paths = await page.locator('#detail [data-path]').evaluateAll(els => els.map(e => e.dataset.path));
  for (const k of ['part.title', 'part.text', 'part.pay.label', 'part.dare.no', 'part.win', 'part.win.weighs', 'part.lose.memory', 'part.never.result']) assert.ok(paths.includes(k), `${k} in ${paths.join()}`);
  await page.fill('textarea[data-path="part.title"]', 'Asking the Captain');
  await page.fill('textarea[data-path="part.never.label"]', 'Forget it');
  const f = await play();
  const seen = await f.evaluate(() => JSON.stringify([G.dialog.event.title, G.dialog.choices.map(c => c.label)]));
  assert.ok(seen.includes('Asking the Captain') && seen.includes('Forget it'), seen.slice(0, 300));
});
