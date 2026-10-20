'use strict';

// The news, rumors, job titles, contact notes, memories and the function-built scenes of the hired chapter in the editor (#463, #508, #547): each has its lines in the form and plays in
// the preview. Split from editorhired.test.js to keep each file short (#583).

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

test('the news of the world has its lines in the form, the pools of news are tables, and the scene plays in the preview (#547)', async () => {
  await reload(); await select('scene:world-news');
  const paths = await page.locator('#detail [data-path]').evaluateAll(els => els.map(e => e.dataset.path));
  for (const k of ['part.hauler', 'part.boom', 'part.bust', 'part.normal', 'part.war', 'part.ceasefire', 'part.settlement', 'part.short', 'part.league']) assert.ok(paths.includes(k), `${k} in ${paths.join()}`);
  await page.fill('textarea[data-path="part.war"]', 'War has come: {a} against {b}.');
  const f = await play();
  const seen = await f.evaluate(() => G.dialog.event.text);
  assert.ok(seen.includes('War has come: Arcology Compact against Charter League.') && seen.includes('never arrived'), seen.slice(0, 300));
  await select('lines:world-flares');
  const flares = await page.locator('#detail [data-path]').evaluateAll(els => els.map(e => e.dataset.path));
  assert.ok(flares.length >= 4 && flares.every(k => k.startsWith('part.')), flares.join());
});

test('the words around a market rumor have their lines in the form, and the rumors are a table with a line for each', async () => {
  await reload(); await select('scene:market-news');
  const paths = await page.locator('#detail [data-path]').evaluateAll(els => els.map(e => e.dataset.path));
  for (const k of ['part.where', 'part.comm', 'part.story.cistern']) assert.ok(paths.includes(k), `${k} in ${paths.join()}`);
  await page.fill('textarea[data-path="part.comm"]', 'Tip: {text} Ends in {days} days.');
  const f = await play();
  const seen = await f.evaluate(() => G.dialog.event.text);
  assert.ok(seen.includes('Tip: Dockworkers on Hermes Foundry have gone on strike. Ends in 21 days.'), seen.slice(0, 300));
  await select('lines:market-rumors');
  const rumors = await page.locator('#detail [data-path]').evaluateAll(els => els.map(e => e.dataset.path));
  assert.ok(rumors.includes('part.up.0') && rumors.includes('part.up.11') && rumors.includes('part.down.7'), rumors.join());
});

test('the titles of the jobs on the mission board have their lines in the form, and the errands are a table with an item and a line for each', async () => {
  await reload(); await select('scene:job-titles');
  const paths = await page.locator('#detail [data-path]').evaluateAll(els => els.map(e => e.dataset.path));
  for (const k of ['part.carry', 'part.deliver', 'part.bounty', 'part.contract', 'part.errand', 'part.errand.cut', 'part.bar.delivery', 'part.favor']) assert.ok(paths.includes(k), `${k} in ${paths.join()}`);
  await page.fill('textarea[data-path="part.deliver"]', 'Haul {tons}t of {good} to {dest}');
  const f = await play();
  const seen = await f.evaluate(() => G.dialog.event.text);
  assert.ok(seen.includes('Haul 6t of water ice to Ceres Station'), seen.slice(0, 300));
  await select('lines:errands');
  const errands = await page.locator('#detail [data-path]').evaluateAll(els => els.map(e => e.dataset.path));
  assert.ok(errands.includes('part.0.0') && errands.includes('part.4.1'), errands.join());
});

test('the notes from contacts and regulars, and the comms chatter, have their lines in the form and play in the preview (#547)', async () => {
  await reload(); await select('scene:contact-notes');
  const paths = await page.locator('#detail [data-path]').evaluateAll(els => els.map(e => e.dataset.path));
  for (const k of ['part.repaid', 'part.dinner', 'part.tip', 'part.favor', 'part.warning', 'part.lead.job', 'part.lead.bounty', 'part.lead.hiring']) assert.ok(paths.includes(k), `${k} in ${paths.join()}`);
  await page.fill('textarea[data-path="part.repaid"]', '{first} pays back {owes} cr with {back} cr to spare <b>');
  const f = await play();
  const seen = await f.evaluate(() => G.dialog.event.text);
  assert.ok(seen.includes('Mara pays back 300 cr with 600 cr to spare &lt;b&gt;'), seen.slice(0, 300));
  await select('lines:comms-chatter');
  const chatter = await page.locator('#detail [data-path]').evaluateAll(els => els.map(e => e.dataset.path));
  assert.ok(chatter.includes('part.0') && chatter.includes('part.34'), chatter.join());
  await select('lines:captain-chatter');
  const cap = await page.locator('#detail [data-path]').evaluateAll(els => els.map(e => e.dataset.path));
  assert.ok(cap.includes('part.0') && cap.includes('part.7'), cap.join());
});

test('the notes and memories at the port and the hand\'s screens have their lines in the form and play in the preview (#508)', async () => {
  await reload(); await select('scene:screens');
  const paths = await page.locator('#detail [data-path]').evaluateAll(els => els.map(e => e.dataset.path));
  for (const k of ['part.dismiss.memory', 'part.run.good.memory', 'part.swap.yes', 'part.buyin.result', 'part.practise.label', 'part.practise.comms']) assert.ok(paths.includes(k), `${k} in ${paths.join()}`);
  await page.fill('textarea[data-path="part.practise.label"]', 'Drill at your post');
  await page.fill('textarea[data-path="part.run.good.memory"]', 'A fine run.');
  const f = await play();
  const seen = await f.evaluate(() => JSON.stringify([G.dialog.event.text, G.dialog.choices.map(c => c.label)]));
  assert.ok(seen.includes('Drill at your post') && seen.includes('A fine run.') && seen.includes('You bought the Needle courier'), seen.slice(0, 400));
});

test('the memories play leaves where no scene is its own have their lines in the form and play in the preview (#508)', async () => {
  await reload(); await select('scene:memories');
  const paths = await page.locator('#detail [data-path]').evaluateAll(els => els.map(e => e.dataset.path));
  for (const k of ['part.patrol-fine.memory', 'part.landing.memory', 'part.ice.clean.memory', 'part.mourn.wrote.memory', 'part.strain.memory']) assert.ok(paths.includes(k), `${k} in ${paths.join()}`);
  await page.fill('textarea[data-path="part.landing.memory"]', 'You brought me to {planet}.');
  const f = await play();
  const seen = await f.evaluate(() => G.dialog.event.text);
  assert.ok(seen.includes('You brought me to Mars.') && seen.includes('You brought the ice in.'), seen.slice(0, 300));
});

test('a cast scene\'s code choice that leaves a memory has a field for it in the form, and the file keeps what is typed (#508)', async () => {
  await reload();
  const hit = await page.evaluate(() => { const r = SceneIndex.rows.find(x => x.choices.some(c => c.label === 'Order her to ditch')); return { id: r.id, i: r.choices.findIndex(c => c.label === 'Order her to ditch') }; });
  await select(hit.id);
  const paths = await page.locator('#detail [data-path]').evaluateAll(els => els.map(e => e.dataset.path));
  assert.ok(paths.includes(`c${hit.i}.memory`), `${hit.i} in ${paths.join()}`);
  assert.ok(!paths.includes('c0.memory'), 'a choice that leaves no memory has no field');
  await page.fill(`textarea[data-path="c${hit.i}.memory"]`, 'You made the call.');
  const out = await page.evaluate(h => SceneIndex.overridesFrom(SceneIndex.rows, { [h.id]: { [`c${h.i}.memory`]: 'You made the call.' } }), hit);
  assert.deepEqual(out[hit.id], { choices: { [hit.i]: { memory: 'You made the call.' } } });
  const back = await page.evaluate(o => SceneIndex.valuesFrom(o), out);
  assert.deepEqual(back[hit.id], { [`c${hit.i}.memory`]: 'You made the call.' });
});

test('the main characters\' talks at a port bar are rows of the editor, with a field for what each choice leaves them remembering, and play at a port (#508)', async () => {
  await reload();
  const ids = await page.evaluate(() => SceneIndex.rows.filter(x => /^cast:\w+:bar\d+$/.test(x.id)).map(x => [x.id, x.where, x.choices.every(c => typeof c.memory === 'string')]));
  assert.equal(ids.length, 12, 'two for each of the six');
  assert.ok(ids.every(x => x[1] === 'port' && x[2]), JSON.stringify(ids));
  await select('cast:ines:bar1');
  const paths = await page.locator('#detail [data-path]').evaluateAll(els => els.map(e => e.dataset.path));
  for (const k of ['title', 'text', 'c0.label', 'c0.result', 'c0.memory', 'c1.memory']) assert.ok(paths.includes(k), `${k} in ${paths.join()}`);
  await page.fill('textarea[data-path="title"]', 'A Bad Landing');
  const f = await play();
  const seen = await f.evaluate(() => JSON.stringify([G.dialog.event.title, G.dialog.choices.map(c => c.label)]));
  assert.ok(seen.includes('A Bad Landing') && seen.includes('Watch the approach with her'), seen.slice(0, 300));
});

test('the close of the hired chapter has its lines in the form, a line for one and a line for more where a verb follows, and plays in the preview (#508)', async () => {
  await reload(); await select('scene:chapter-end');
  const paths = await page.locator('#detail [data-path]').evaluateAll(els => els.map(e => e.dataset.path));
  for (const k of ['part.foot', 'part.close', 'part.keep.label', 'part.plain.aboard.one', 'part.plain.aboard.many', 'part.plain.alone']) assert.ok(paths.includes(k), `${k} in ${paths.join()}`);
  await page.fill('textarea[data-path="part.keep.label"]', 'Fly on');
  await page.fill('textarea[data-path="part.close"]', 'The chapter closes here.');
  const f = await play();
  const seen = await f.evaluate(() => JSON.stringify([G.dialog.event.title, G.dialog.event.text, G.dialog.choices.map(c => c.label)]));
  assert.ok(seen.includes('Fly on') && seen.includes('The chapter closes here.') && seen.includes('is on the apron at'), seen.slice(0, 400));
});

test('the function-built scenes and the code-written hired events are edited line by line, and each plays in the preview (#463)', async () => {
  await reload(); await select('scene:warning');
  const r = await page.evaluate(() => {
    const row = id => SceneIndex.rows.find(x => x.id === id), warning = row('scene:warning'), values = { [warning.id]: { 'part.text': 'A new warning.', 'part.c0.label': warning.parts['c0.label'] } };
    const out = SceneIndex.overridesFrom(SceneIndex.rows, values);
    return {
      rows: ['scene:sign-on', 'scene:warning', 'scene:put-ashore', 'scene:hand-death', 'scene:captain-lost', 'scene:split', 'scene:walk-off', 'scene:used-ship-offer', 'scene:yard-office', 'hired:cap-order', 'hired:road-scope'].map(id => [row(id).kind, row(id).noTitle, Object.keys(row(id).parts || {}).length >= 3]),
      title: row('hired:cap-order').title, out: out[warning.id], back: SceneIndex.valuesFrom(out)[warning.id],
      bad: [SceneIndex.badPlaceholders('Captain {last} {nobody}', warning.parts.text), SceneIndex.badPlaceholders('Captain {last}', 'No words')],
    };
  });
  assert.ok(r.rows.every(x => x[0] === 'data' && x[1] === true && x[2] === true), JSON.stringify(r.rows));
  assert.equal(r.title, "An Order You Don't Like");
  assert.deepEqual(r.out, { parts: { text: 'A new warning.' } }, 'only what differs');
  assert.deepEqual(r.back, { 'part.text': 'A new warning.' });
  assert.deepEqual(r.bad, [['{nobody}'], ['{last}']], 'a {word} the line has is kept as typed; one it has not is flagged');
  for (const [id, line] of [['scene:sign-on', 'title'], ['scene:warning', 'text'], ['scene:put-ashore', 'text'], ['scene:hand-death', 'text.hurt'], ['scene:captain-lost', 'text'], ['scene:split', 'ask'],  // the split's opening has three versions taken by the day (#780), and its ask plays in each
    ['scene:walk-off', 'title'], ['scene:used-ship-offer', 'tomas.title'], ['scene:yard-office', 'title'], ['hired:cap-order', 'text'], ['hired:road-scope', 'text']]) {
    await select(id);
    await page.fill(`textarea[data-path="part.${line}"]`, `Typed ${id}.`);
    const f = await play();
    const seen = await f.evaluate(() => JSON.stringify([G.dialog.event.title, G.dialog.event.text, G.dialog.choices.map(c => c.label)]));
    assert.ok(seen.includes(`Typed ${id}.`), `${id} plays the typed line: ${seen.slice(0, 200)}`);
  }
});

test('the preview plays the version of a moment being edited, whichever the day would take (#781)', async () => {
  await reload();
  for (const [id, line] of [['scene:split', 'text.1'], ['scene:split', 'text.2'], ['scene:split', 'text']]) {
    await select(id);
    await page.fill(`textarea[data-path="part.${line}"]`, `Typed ${line}.`);
    const f = await play();
    const seen = await f.evaluate(() => G.dialog.event.text);
    assert.ok(seen.includes(`Typed ${line}.`), `${id} ${line} plays: ${seen.slice(0, 160)}`);
  }
});
