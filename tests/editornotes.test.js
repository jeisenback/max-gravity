'use strict';

// The one-line notes and downtime of the hired chapter in the editor (#508): faction ties, downtime, the round for the house, the log and the notes of flight, hail, crew and systems,
// and the look back at the chapter. Each has its lines in the form and plays in the preview. Split from editorhired.test.js to keep each file short (#583).

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

test('the scenes of faction ties have their lines in the form and play in the preview (#508)', async () => {
  for (const [id, keys, label] of [
    ['scene:customs', ['part.title', 'part.title.patrol', 'part.charge.wanted', 'part.text.patrol', 'part.silent.gone', 'part.hand.others.memory', 'part.signs'], 'Slip the officer a note'],
    ['scene:dock-friend', ['part.title', 'part.text', 'part.c0.memory', 'part.c1.result'], 'Let them ask'],
    ['scene:war-call', ['part.text.officer', 'part.go.liaison', 'part.refuse.memory', 'part.stay.far.memory'], 'Let them leave'],
  ]) {
    await reload(); await select(id);
    const paths = await page.locator('#detail [data-path]').evaluateAll(els => els.map(e => e.dataset.path));
    for (const k of keys) assert.ok(paths.includes(k), `${id} ${k} in ${paths.join()}`);
    await page.fill(`textarea[data-path="part.${id === 'scene:customs' ? 'pay' : id === 'scene:dock-friend' ? 'c0' : 'go'}.label"]`, label);
    const f = await play();
    const seen = await f.evaluate(() => JSON.stringify(G.dialog.choices.map(c => c.label)));
    assert.ok(seen.includes(label), `${id} ${seen.slice(0, 300)}`);
  }
});

test('the downtime a hired hand can add has its lines in the form and plays in the preview (#508)', async () => {
  await reload(); await select('scene:downtime');
  const paths = await page.locator('#detail [data-path]').evaluateAll(els => els.map(e => e.dataset.path));
  for (const k of ['part.learn', 'part.cast.memory', 'part.advice.label', 'part.mend.result', 'part.stories.memory', 'part.pax.result']) assert.ok(paths.includes(k), `${k} in ${paths.join()}`);
  await page.fill('textarea[data-path="part.advice.label"]', 'Ask for advice');
  const f = await play();
  const seen = await f.evaluate(() => JSON.stringify(G.dialog.choices.map(c => c.label)));
  assert.ok(seen.includes('Ask for advice') && seen.includes('Swap stories in the galley'), seen.slice(0, 300));
});

test('the downtime menu and the ship\'s own activities have their lines in the form and play in the preview (#508)', async () => {
  await reload(); await select('scene:shiplife');
  const paths = await page.locator('#detail [data-path]').evaluateAll(els => els.map(e => e.dataset.path));
  for (const k of ['part.title', 'part.text.hired', 'part.when.after', 'part.none.result', 'part.meal.result.1', 'part.repair.skilled', 'part.visit.memory']) assert.ok(paths.includes(k), `${k} in ${paths.join()}`);
  await page.fill('textarea[data-path="part.title"]', 'Time Off');
  await page.fill('textarea[data-path="part.none.label"]', 'Skip it');
  const f = await play();
  const seen = await f.evaluate(() => JSON.stringify([G.dialog.event.title, G.dialog.choices.map(c => c.label)]));
  assert.ok(seen.includes('Time Off') && seen.includes('Skip it'), seen.slice(0, 300));
});

test('the round for the house and a main character coming aboard have their lines in the form and play in the preview (#508)', async () => {
  await reload(); await select('scene:bar-round');
  let paths = await page.locator('#detail [data-path]').evaluateAll(els => els.map(e => e.dataset.path));
  for (const k of ['part.label', 'part.label.done', 'part.memory', 'part.note']) assert.ok(paths.includes(k), `${k} in ${paths.join()}`);
  await page.fill('textarea[data-path="part.label.done"]', 'Round bought');
  let f = await play();
  let seen = await f.evaluate(() => JSON.stringify([G.dialog.event.text, G.dialog.choices.map(c => c.label)]));
  assert.ok(seen.includes('You buy a round for the house') && seen.includes('Round bought'), seen.slice(0, 300));
  await reload(); await select('scene:cast-join');
  paths = await page.locator('#detail [data-path]').evaluateAll(els => els.map(e => e.dataset.path));
  for (const k of ['part.memory', 'part.log']) assert.ok(paths.includes(k), `${k} in ${paths.join()}`);
  await page.fill('textarea[data-path="part.log"]', '{first} signed the articles as {article} {role}.');
  f = await play();
  seen = await f.evaluate(() => G.dialog.event.text);
  assert.ok(/signed the articles as an? \w+\./.test(seen) && seen.includes('I signed on with'), seen.slice(0, 300));
});

test('the lines the ship\'s log keeps have their fields in the form and play in the preview (#508)', async () => {
  await reload(); await select('scene:ship-log');
  const paths = await page.locator('#detail [data-path]').evaluateAll(els => els.map(e => e.dataset.path));
  for (const k of ['part.killed.log', 'part.left.log', 'part.lost.log', 'part.lost.crew.log', 'part.retired.log', 'part.founded.log']) assert.ok(paths.includes(k), `${k} in ${paths.join()}`);
  await page.fill('textarea[data-path="part.founded.log"]', 'Broke ground at {site}.');
  const f = await play();
  const seen = await f.evaluate(() => G.dialog.event.text);
  assert.ok(seen.includes('Broke ground at Callisto.') && seen.includes('was killed when Ceres'), seen.slice(0, 300));
});

test('the notes of flight and the dock have their lines in the form and play in the preview (#508)', async () => {
  await reload(); await select('scene:flight-notes');
  const paths = await page.locator('#detail [data-path]').evaluateAll(els => els.map(e => e.dataset.path));
  for (const k of ['part.kill', 'part.kill.bounty', 'part.nav', 'part.denied', 'part.pax.fare', 'part.burn.go', 'part.arrive']) assert.ok(paths.includes(k), `${k} in ${paths.join()}`);
  await page.fill('textarea[data-path="part.nav"]', 'Course set for {planet}.');
  const f = await play();
  const seen = await f.evaluate(() => G.dialog.event.text);
  assert.ok(seen.includes('Course set for Luna.') && seen.includes('Harlan Voss destroyed'), seen.slice(0, 300));
});

test('the notes of a hail and of the story at sea have their lines in the form and play in the preview (#508)', async () => {
  await reload(); await select('scene:hail-notes');
  const paths = await page.locator('#detail [data-path]').evaluateAll(els => els.map(e => e.dataset.path));
  for (const k of ['part.say', 'part.demand.paid', 'part.none', 'part.escort', 'part.fight.won', 'part.blockade.holds']) assert.ok(paths.includes(k), `${k} in ${paths.join()}`);
  await page.fill('textarea[data-path="part.none"]', 'Nobody out there.');
  const f = await play();
  const seen = await f.evaluate(() => G.dialog.event.text);
  assert.ok(seen.includes('Nobody out there.') && seen.includes('Holding formation, captain.'), seen.slice(0, 300));
});

test('the notes about the crew have their lines in the form and play in the preview (#508)', async () => {
  await reload(); await select('scene:crew-notes');
  const paths = await page.locator('#detail [data-path]').evaluateAll(els => els.map(e => e.dataset.path));
  for (const k of ['part.wages', 'part.quits', 'part.disabled.key', 'part.hurt', 'part.hurt.warning', 'part.dead', 'part.accident']) assert.ok(paths.includes(k), `${k} in ${paths.join()}`);
  await page.fill('textarea[data-path="part.quits"]', '{name} walks out over the wages.');
  const f = await play();
  const seen = await f.evaluate(() => G.dialog.event.text);
  assert.ok(seen.includes('Mara Quill walks out over the wages.') && seen.includes('Crew wages for 10 days'), seen.slice(0, 300));
});

test('the notes of the ship\'s systems and the world have their lines in the form and play in the preview (#508)', async () => {
  await reload(); await select('scene:systems-notes');
  const paths = await page.locator('#detail [data-path]').evaluateAll(els => els.map(e => e.dataset.path));
  for (const k of ['part.torp.none', 'part.standing', 'part.auto.dock', 'part.escort.range', 'part.reactor.scram', 'part.war']) assert.ok(paths.includes(k), `${k} in ${paths.join()}`);
  await page.fill('textarea[data-path="part.torp.none"]', 'No launcher on this ship.');
  const f = await play();
  const seen = await f.evaluate(() => G.dialog.event.text);
  assert.ok(seen.includes('No launcher on this ship.') && seen.includes('Reactor scram.'), seen.slice(0, 300));
});

test('the look back at the chapter has its lines in the form and plays in the preview (#508)', async () => {
  await reload(); await select('scene:chapter-recap');
  const paths = await page.locator('#detail [data-path]').evaluateAll(els => els.map(e => e.dataset.path));
  for (const k of ['part.title', 'part.label', 'part.work', 'part.why.money', 'part.runs.one', 'part.near', 'part.nobody', 'part.lost', 'part.ties']) assert.ok(paths.includes(k), `${k} in ${paths.join()}`);
  await page.fill('textarea[data-path="part.nobody"]', 'You kept your own counsel.');
  const f = await play();
  const seen = await f.evaluate(() => G.dialog.event.text);
  assert.ok(seen.includes('You kept your own counsel.') && seen.includes('days aboard'), seen.slice(0, 300));
});
