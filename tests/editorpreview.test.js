'use strict';

// The scene preview (#337): "Play this scene" opens a data scene in the game's own dialog, in a frame of editor-preview.html that runs the real
// game on a test game in a state chosen on the page. These open the editor and play scenes through it.

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require('playwright');
const { watch } = require('./helpers');

const URL = 'file://' + path.resolve(__dirname, '..', 'editor.html');
let browser, page, errors;

before(async () => {
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, route => route.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  page = await ctx.newPage();
  errors = [];
  watch(page, errors);
  await page.goto(URL);
  await page.waitForFunction(() => SceneIndex.rows, null, { timeout: 30000 });
});
after(async () => {
  try { assert.deepEqual(errors, [], 'page errors'); } finally { await browser.close(); }
});

const frame = () => page.frames().find(f => /editor-preview/.test(f.url()));
const select = async id => { await page.fill('#q', id); await page.click(`button[data-id="${id}"]`); };
const fresh = () => page.evaluate(() => { document.querySelector('#pv-report').innerHTML = ''; });
// Plays the scene chosen and waits for the game to report back and the dialog to be up.
async function play() {
  await fresh();
  await page.click('[data-action="play"]');
  await page.waitForFunction(() => document.querySelector('#pv-report').textContent.length > 0, null, { timeout: 30000 });
  await frame().waitForFunction(() => typeof G !== 'undefined' && G.dialog, null, { timeout: 30000 });
}
const report = () => page.textContent('#pv-report');
const reset = async () => {
  await page.evaluate(() => { for (const el of document.querySelectorAll('[data-pv], [data-pv-rep]')) { if (el.tagName === 'SELECT') el.selectedIndex = 0; else el.value = ''; el.dispatchEvent(new Event('input', { bubbles: true })); } });
  await page.selectOption('[data-pv=post]', 'gunner'); await page.selectOption('[data-pv=captain]', 'hester'); await page.selectOption('[data-pv=start]', 'earth'); await page.selectOption('[data-pv=as]', 'hired'); await page.selectOption('[data-pv=place]', '');
};

test('a code-written scene has nothing to play, and so does no scene until one is chosen', async () => {
  assert.equal(await page.isDisabled('[data-action="play"]'), true);
  await select('cast:ilsa:late');
  assert.equal(await page.isDisabled('[data-action="play"]'), true);
  await select('port-mars-sky');
  assert.equal(await page.isDisabled('[data-action="play"]'), false);
});

test('the scene opens in the game\'s own dialog, built by the game\'s own code', async () => {
  await reset(); await select('port-mars-sky');
  await play();
  const r = await frame().evaluate(() => ({
    title: G.dialog.event.title, labels: G.dialog.choices.map(c => c.label), shown: UI.el.querySelector('.event-body h1').textContent, last: G.state.qualities['last:port-mars-sky'], day: G.state.day,
    runs: G.dialog.choices.every(c => typeof c.run === 'function'), test: G.state.uat, mode: G.mode, planet: G.state.planet,
  }));
  assert.equal(r.title, 'What Color the Sky Will Be');
  assert.equal(r.shown, r.title);
  assert.deepEqual(r.labels, ['Side with the veteran', 'Side with the modeler', 'Say the sky is a good color already']);
  assert.equal(r.last, r.day, 'storyletEvent built it: it noted the day the scene played');
  assert.ok(r.runs && r.test, 'a test game');
  assert.equal(r.mode, 'landed');
  assert.equal(r.planet, 'Mars', 'the place the scene needs, from its own conditions');
});

test('the preview never touches a real save: the game writes to a memory that stays in the frame', async () => {
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('maxGravity.save.1', 'my real save'); });
  await reset(); await select('port-mars-sky');
  await play();
  await frame().click('[data-action="choose"][data-arg="0"]');
  await page.waitForFunction(() => document.querySelector('#pv-effects').textContent.length > 0);
  const inside = await frame().evaluate(() => ({ real: localStorage.getItem('maxGravity.save.1'), n: localStorage.length, wrote: Object.keys(Object.fromEntries(Array.from({ length: localStorage.length }, (_, i) => [localStorage.key(i), 1]))) }));
  assert.equal(inside.real, null, 'the frame cannot see the real storage');
  assert.ok(inside.n > 0, 'the game did write its things, to the frame\'s memory');
  const outside = await page.evaluate(() => ({ keys: Object.keys(localStorage), save: localStorage.getItem('maxGravity.save.1') }));
  assert.deepEqual(outside.keys, ['maxGravity.save.1']);
  assert.equal(outside.save, 'my real save');
  await page.evaluate(() => localStorage.clear());
});

test('the state asked for is the state the game starts in', async () => {
  await reset(); await select('port-mars-sky');
  await page.selectOption('[data-pv=post]', 'engineer'); await page.selectOption('[data-pv=captain]', 'dov'); await page.selectOption('[data-pv=start]', 'mars');
  await page.fill('[data-pv=day]', '40'); await page.fill('[data-pv=credits]', '1234');
  await page.fill('[data-pv-rep="Dome Concord"]', '5'); await page.fill('[data-pv-rep="Pirate"]', '-3');
  await page.fill('[data-pv=qualities]', 'strike-day=3\nsome-flag\nnot a number=x');
  await play();
  const r = await frame().evaluate(() => ({
    post: hired().post, key: hired().captainKey, aboard: castAboard().map(c => c.cast).sort(), day: G.state.day, credits: G.state.credits,
    dome: repOf('Dome Concord'), pirate: repOf('Pirate'), q: G.state.qualities,
  }));
  assert.equal(r.post, 'engineer');
  assert.equal(r.key, 'dov');
  assert.deepEqual(r.aboard, ['ilsa', 'ruben', 'yelena'], 'the pair chosen, and the captain\'s first officer');
  assert.equal(r.day, 40);
  assert.equal(r.credits, 1234);
  assert.equal(r.dome, 5);
  assert.equal(r.pirate, -3);
  assert.equal(r.q['strike-day'], 3);
  assert.equal(r.q['some-flag'], 1);
  assert.equal(r.q['not a number'], 1);
});

test('a scene can be played as a ship owner, and one in a burn plays in a burn', async () => {
  await reset(); await select('port-mars-sky');
  await page.selectOption('[data-pv=as]', 'owner');
  await play();
  assert.deepEqual(await frame().evaluate(() => ({ hand: !!hired(), uat: G.state.uat })), { hand: false, uat: true });
  const burn = (await page.evaluate(() => SceneIndex.rows.find(r => r.kind === 'data' && r.where === 'transit').id));
  await reset(); await select(burn);
  await play();
  assert.deepEqual(await frame().evaluate(() => ({ mode: G.mode, hasTransit: !!G.transit, open: !!G.dialog })), { mode: 'transit', hasTransit: true, open: true });
});

test('the edits not yet saved show in the preview, and the file is not changed', async () => {
  await reset(); await select('port-mars-sky');
  await page.fill('#f-title', 'A Title From The Form');
  await page.fill('#f-c1\\.label', 'Side with the sums');
  await play();
  const r = await frame().evaluate(() => ({ title: G.dialog.event.title, labels: G.dialog.choices.map(c => c.label), file: JSON.stringify(SCENE_OVERRIDES) }));
  assert.equal(r.title, 'A Title From The Form');
  assert.deepEqual(r.labels, ['Side with the veteran', 'Side with the sums', 'Say the sky is a good color already']);
  assert.equal(r.file, '{}');
  await page.fill('#f-title', 'What Color the Sky Will Be'); await page.fill('#f-c1\\.label', 'Side with the modeler');
  await play();
  assert.equal(await frame().evaluate(() => G.dialog.event.title), 'What Color the Sky Will Be', 'a later play starts again, without the edit');
});

test('a scene whose conditions do not hold is played anyway, and the report says which fail', async () => {
  await reset(); await select('port-mars-sky');
  await play();
  assert.match(await report(), /do not hold in this state/);
  assert.match(await report(), /day: 3/, 'day 1 is before the scene\'s day 3');
  assert.match(await report(), /It is played anyway/);
  assert.match(await report(), /chance of 0\.25/);
  assert.ok(await frame().evaluate(() => G.dialog.event.title === 'What Color the Sky Will Be'), 'it opened');
  await page.fill('[data-pv=day]', '10');
  await play();
  assert.match(await report(), /Every condition of the scene holds in this state/);
  assert.ok(!/day: 3/.test(await report()));
  await page.selectOption('[data-pv=place]', 'Earth');
  await play();
  assert.match(await report(), /planet: "Mars"/);
  await page.selectOption('[data-pv=place]', ''); await page.selectOption('[data-pv=as]', 'owner');
  await play();
  assert.match(await report(), /hired: true/, 'a scene for a hired hand, played as an owner');
});

test('a choice the state shuts is reported with the condition that shuts it', async () => {
  await reset(); await select('land-customs');
  await page.fill('[data-pv=credits]', '10');
  await play();
  assert.match(await report(), /Choice 2 is shut/);
  assert.match(await report(), /credits: 300/);
});

test('picking a choice shows what it changed', async () => {
  await reset(); await select('port-mars-sky');
  await page.fill('[data-pv=day]', '10'); await page.fill('[data-pv-rep="Dome Concord"]', '2');
  await play();
  await frame().click('[data-action="choose"][data-arg="0"]');
  await page.waitForFunction(() => document.querySelector('#pv-effects').textContent.length > 0);
  const effects = await page.textContent('#pv-effects');
  assert.match(effects, /You chose: Side with the veteran/);
  assert.match(effects, /standing with Dome Concord: 2 to 3 \(\+1\)/);
  assert.ok(!/seen:/.test(effects), 'the scene\'s own bookkeeping is not an effect');
  // The result is in the game's dialog, as the player sees it.
  assert.match(await frame().textContent('#event-result'), /There,/);
  // A choice that changes credits and a quality.
  await select('land-customs');
  await page.fill('[data-pv=credits]', '1000');
  await play();
  await frame().click('[data-action="choose"][data-arg="1"]');
  await page.waitForFunction(() => /You chose: Offer/.test(document.querySelector('#pv-effects').textContent));
  assert.match(await page.textContent('#pv-effects'), /credits: 1000 to 700 \(-300\)/);
});

test('what the game reports is shown as text, never as markup', async () => {
  const html = await page.evaluate(() => {
    const box = document.createElement('div');
    box.append(SceneIndex.reportNode({ failing: ['<img src=x>'], chained: true, chance: '<b>', shut: [{ n: 1, why: ['<svg onload=1>'] }] }),
      SceneIndex.reportNode({ error: '<script>1</script>' }), SceneIndex.effectsNode({ label: '<i>L</i>', lines: ['<u>x</u>'] }));
    return { html: box.innerHTML, elements: box.querySelectorAll('img, svg, script, b, i, u').length };
  });
  assert.equal(html.elements, 0, html.html);
  assert.match(html.html, /&lt;img src=x&gt;/);
  assert.match(html.html, /&lt;script&gt;1&lt;\/script&gt;/);
});
