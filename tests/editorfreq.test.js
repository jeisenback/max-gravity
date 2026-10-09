'use strict';

// How often a scene comes up (#341): the page shows each scene's tier, weight and cooldown, lets a color scene's weight, cooldown and on or off be changed
// through the override layer, and simulates the real pickHappening on test games. The simulator's numbers are checked here only for how they are made (their
// sample, that they repeat, that nothing is left changed); what they say about a weight is a distribution check, tests/distribution/frequency.test.js.

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
const changes = async () => JSON.parse((await page.textContent('#changes')).match(/^const SCENE_OVERRIDES = ([\s\S]*?);\nconst NEW_SCENES/)[1]);
const row = id => page.evaluate(id => SceneIndex.rows.find(r => r.id === id).pacing, id);

test('every scene shows how it is drawn, and only a color storylet\'s weight can be changed', async () => {
  const r = await page.evaluate(() => {
    const p = id => SceneIndex.rows.find(x => x.id === id).pacing;
    const story = SceneIndex.rows.find(x => x.kind === 'data' && !x.registry && x.pacing.tier === 0);
    return { color: p('port-mars-sky'), story: story.pacing, storyId: story.id, once: SceneIndex.rows.filter(x => x.pacing && x.pacing.once && x.pacing.editable).length,
      intro: p('cast:ines:intro'), mid: p('cast:ines:mid1'), meet: p('cast:ines:meet'), trouble: p('captain:hester:trouble'), work: p('hired:gunner-jam'), ice: p('ice:1'), fn: p('scene:warning'),
      none: SceneIndex.rows.filter(x => !x.pacing).map(x => x.id), editable: SceneIndex.rows.filter(x => x.pacing && x.pacing.editable).every(x => x.kind === 'data' && !x.registry && x.pacing.tier === 2) };
  });
  assert.deepEqual([r.color.tier, r.color.weight, r.color.every, r.color.once, r.color.editable], [2, 1, 25, false, true]);
  assert.deepEqual([r.story.tier, r.story.weight, r.story.editable], [0, null, false]);
  assert.match(r.story.trigger, /The story: played first, by priority/);
  assert.equal(r.intro.tier, 1); assert.equal(r.mid.tier, 2); assert.equal(r.meet.tier, 1);
  assert.match(r.intro.weight, /^2, and 3 more for each draw/);
  assert.equal(r.trouble.tier, 1);
  assert.match(r.work.weight, /^3 for the work group/); assert.equal(r.work.cooldown, '30 days');
  assert.equal(r.ice.tier, 1); assert.equal(r.fn.tier, null);
  assert.deepEqual(r.none, [], 'every scene has pacing');
  assert.ok(r.editable, 'only a color storylet is editable');
});

test('a color scene\'s weight, cooldown and off switch are in the form, and a story scene shows them read only', async () => {
  await reload(); await select('port-mars-sky');
  assert.match(await page.textContent('#detail'), /How often it comes up/);
  assert.equal(await page.inputValue('[data-rate="weight"]'), '1');
  assert.equal(await page.inputValue('[data-rate="every"]'), '25');
  assert.equal(await page.locator('[data-rate="off"]').isChecked(), false);
  const story = await page.evaluate(() => SceneIndex.rows.find(x => x.kind === 'data' && !x.registry && x.pacing.tier === 0).id);
  await select(story);
  assert.equal(await page.locator('#detail [data-rate]').count(), 0);
  assert.match(await page.textContent('#detail'), /Read only: a story scene is picked by priority, not by weight/);
  await select('cast:ines:intro');
  assert.equal(await page.locator('#detail [data-rate]').count(), 0);
  assert.match(await page.textContent('#detail'), /Tier\s*1, due now/);
  assert.match(await page.textContent('#detail'), /Due 0 days after they join/);
});

test('changing a rate is a change to the file, checked as typed, and the shipped value is no change', async () => {
  await reload(); await select('port-mars-sky');
  await page.fill('[data-rate="weight"]', '3');
  await page.fill('[data-rate="every"]', '40');
  await page.check('[data-rate="off"]');
  assert.deepEqual(await changes(), { 'port-mars-sky': { weight: 3, every: 40, off: true } });
  await page.uncheck('[data-rate="off"]');
  await page.fill('[data-rate="weight"]', '1'); await page.fill('[data-rate="every"]', '25');
  assert.deepEqual(await changes(), {}, 'the shipped values are no change');
  await page.fill('[data-rate="weight"]', '101');
  assert.match(await page.textContent('[data-rerr="rate.weight"]'), /needs a number from 0 to 100/);
  assert.match(await page.textContent('#problems'), /weight: needs a number from 0 to 100/);
  assert.deepEqual(await changes(), {}, 'a bad value is left out');
  await page.fill('[data-rate="weight"]', '0.5'); await page.fill('[data-rate="every"]', '1.5');
  assert.match(await page.textContent('[data-rerr="rate.every"]'), /whole number of days/);
  assert.deepEqual(await changes(), { 'port-mars-sky': { weight: 0.5 } });
  // A scene that plays once has no cooldown to set.
  const once = await page.evaluate(() => SceneIndex.rows.find(x => x.pacing && x.pacing.editable && x.pacing.once));
  if (once) { await select(once.id); assert.equal(await page.locator('[data-rate="every"]').count(), 0); }
});

test('what the editor writes for a rate is a file the game takes, and the rates are kept across a reload', async () => {
  await reload(); await select('port-mars-front');
  await page.fill('[data-rate="weight"]', '4'); await page.check('[data-rate="off"]');
  const want = await changes();
  await page.reload(); await page.waitForFunction(() => SceneIndex.rows);
  await select('port-mars-front');
  assert.equal(await page.inputValue('[data-rate="weight"]'), '4');
  assert.equal(await page.locator('[data-rate="off"]').isChecked(), true);
  assert.deepEqual(await changes(), want);
  const g = await open({ scope: 'full' });
  const r = await g.ev(file => {
    const warnings = [], w = console.warn; console.warn = m => warnings.push(m);
    useOverrides(file); console.warn = w;
    return { warnings, rate: sceneRate(STORYLETS.find(s => s.id === 'port-mars-front')) };
  }, want);
  await g.done();
  assert.deepEqual(r, { warnings: [], rate: { weight: 4, every: 25, off: true } });
});

test('a file that gives a story scene or a hired scene a weight is refused item by item, and a color scene\'s is read', async () => {
  await reload();
  const story = await page.evaluate(() => SceneIndex.rows.find(x => x.kind === 'data' && !x.registry && x.pacing.tier === 0).id);
  const tmp = path.join(require('node:os').tmpdir(), `freq-import-${process.pid}.js`);
  require('node:fs').writeFileSync(tmp, `const SCENE_OVERRIDES = {"${story}":{"weight":2},"cast:ines:intro":{"weight":2},"port-mars-sky":{"weight":2,"every":50,"off":true},"port-mars-front":{"weight":-1}};\nconst NEW_SCENES = [];\n`);
  await page.setInputFiles('#import-file', tmp);
  await page.waitForSelector('#notice .notice');
  const n = await page.textContent('#notice');
  for (const part of [`${story} weight: this scene is not drawn by weight`, 'cast:ines:intro weight: this scene is not drawn by weight', 'port-mars-sky: weight, every, off', 'port-mars-front weight: needs a number from 0 to 100']) assert.ok(n.includes(part), `${part} in ${n}`);
  await page.click('[data-action="import-apply"]');
  await select('port-mars-sky');
  assert.deepEqual(await changes(), { 'port-mars-sky': { weight: 2, every: 50, off: true } });
  require('node:fs').rmSync(tmp, { force: true });
});

async function simulate(seeds, burns) {
  await page.fill('[data-sim="seeds"]', String(seeds)); await page.fill('[data-sim="burns"]', String(burns));
  await page.evaluate(() => document.querySelector('#pv-sim').replaceChildren());
  await page.click('[data-action="simulate"]');
  await page.waitForFunction(() => /Sample:|did not play|not/.test(document.querySelector('#pv-sim').textContent) && !/Running/.test(document.querySelector('#pv-sim').textContent), null, { timeout: 90000 });
  return page.textContent('#pv-sim');
}

test('the simulator draws the real pickHappening on test games, says its sample, repeats, and leaves the game as it was', async () => {
  await reload(); await select('port-mars-sky');
  await page.fill('[data-pv=day]', '30');
  const a = await simulate(3, 4);
  assert.match(a, /Sample: 3 games of 4 landings, 12 landings and 12 draws in all/);
  assert.match(a, /A draw was quiet \d+\.\d percent of the time\. Events a landing: \d+\.\d\d/);
  assert.match(a, /A sample from this state, not a rule of the game\. It is not part of the tests/);
  const b = await simulate(3, 4);
  assert.equal(b, a, 'the same sample twice gives the same numbers');
  // It left the preview frame's game as it was: a scene still plays, and the functions it wrapped are the game's own.
  await page.click('[data-action="play"]');
  await page.waitForFunction(() => document.querySelector('#pv-report').textContent.length > 0, null, { timeout: 30000 });
  const f = page.frames().find(x => /editor-preview/.test(x.url()));
  await f.waitForFunction(() => G.dialog, null, { timeout: 30000 });
  assert.equal(await f.evaluate(() => [pickHappening.toString().startsWith('function pickHappening'), storyletEvent.toString().startsWith('function storyletEvent'), Math.random.toString().includes('[native code]')]).then(x => x.join()), 'true,true,true');
  // A scene in a burn is counted by the burn.
  const id = await page.evaluate(() => SceneIndex.rows.find(x => x.pacing && x.pacing.editable && x.where === 'transit').id);
  await select(id);
  assert.match(await simulate(2, 3), /Sample: 2 games of 3 burns, 6 burns and \d+ draws in all/);
});

test('the simulator is for a scene drawn by weight: a hired scene or a story scene has none', async () => {
  await reload();
  await select('cast:ines:intro');
  assert.equal(await page.isDisabled('[data-action="simulate"]'), true);
  await select('port-mars-sky');
  assert.equal(await page.isDisabled('[data-action="simulate"]'), false);
  await page.click('[data-action="new-scene"]');
  assert.equal(await page.isDisabled('[data-action="simulate"]'), true, 'a new scene with problems has nothing to simulate yet');
});

test('the numbers are shown as text, never as markup', async () => {
  const html = await page.evaluate(() => {
    const box = document.createElement('div');
    box.append(SceneIndex.simNode({ where: 'burn', sample: { seeds: 1, burns: 1, total: 1, draws: 1 }, quietShare: 0, eventsPerBurn: 1, scene: { plays: 1, perBurn: 1, burnsWith: 1, range: [0, 1] }, top: [{ title: '<img src=x onerror=1>', perBurn: 1 }] }),
      SceneIndex.simNode({ error: '<script>1</script>' }));
    return { html: box.innerHTML, elements: box.querySelectorAll('img, script').length };
  });
  assert.equal(html.elements, 0, html.html);
  assert.match(html.html, /&lt;img src=x onerror=1&gt;/);
});
