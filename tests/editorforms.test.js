'use strict';

// The conditions, effects and links forms (#338): built from the game's own CONDITIONS and EFFECTS tables, checked as you type, and never
// offering a change that addStorylet would refuse. These open the editor and use the forms.

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

const select = async id => { await page.fill('#q', id); await page.click(`button[data-id="${id}"]`); };
const rule = (p, key) => `[data-rpath="${p}"][data-rkey="${key}"]`;
const changes = async () => JSON.parse((await page.textContent('#changes')).match(/^const SCENE_OVERRIDES = ([\s\S]*?);\nconst NEW_SCENES/)[1]);
const warn = (p, key) => page.textContent(`[data-rerr="${key === undefined ? p : `${p}|${key}`}"]`);
// A fresh page of the same editor, so a test's edits do not leak into the next.
async function reload() {  // the editor keeps edits in the browser (#340), so each test starts with none
  await page.goto(URL); await page.evaluate(() => localStorage.clear()); await page.reload();
  await page.waitForFunction(() => SceneIndex.rows, null, { timeout: 30000 });
}

test('the forms offer exactly the conditions and effects the game has, read from its tables', async () => {
  await select('port-mars-sky');
  const offered = async (p) => [...new Set([...(await page.locator(`[data-add="${p}"] option`).evaluateAll(o => o.map(x => x.value).filter(Boolean))), ...(await page.locator(`[data-rpath="${p}"]`).evaluateAll(e => e.map(x => x.dataset.rkey)))])].sort();
  const g = await open({ scope: 'full' });
  const game = await g.ev(() => ({ conditions: Object.keys(CONDITIONS).sort(), effects: Object.keys(EFFECTS).sort() }));
  await g.done();
  assert.deepEqual(await offered('when'), game.conditions);
  assert.deepEqual(await offered('c0.when'), game.conditions);
  assert.deepEqual(await offered('c0.effects'), game.effects);
  // A key is chosen from a list, never typed, so an unknown one cannot be written.
  assert.equal(await page.locator('[data-add="when"]').evaluate(e => e.tagName), 'SELECT');
  assert.equal(await page.locator('input[data-rkey]').filter({ hasNot: page.locator('x') }).count() > 0, true);
  const specs = await page.evaluate(() => ({ c: Object.keys(SceneIndex.CONDITION_SPEC), e: Object.keys(SceneIndex.EFFECT_SPEC) }));
  assert.deepEqual(specs.c.filter(k => !game.conditions.includes(k)), [], 'no kind for a condition the game no longer has');
  assert.deepEqual(specs.e.filter(k => !game.effects.includes(k)), []);
});

test('a key the editor has no kind for gets a box for JSON, so a new condition has a form at once', async () => {
  const r = await page.evaluate(() => {
    const k = SceneIndex.kindOf(undefined);
    return { fallback: k.fallback, ok: k.parse('{"a":1}'), bad: k.parse('{a'), def: k.def, nested: k.parse('{"onDone":{"nonsense":1}}') };
  });
  assert.equal(r.fallback, true);
  assert.deepEqual(r.ok, { value: { a: 1 } });
  assert.match(r.bad.error, /valid JSON/);
  assert.match(r.nested.error, /unknown effect "nonsense" in onDone/);
});

test('every condition, effect and link of every shipped scene reads into the forms and back the same', async () => {
  assert.deepEqual(await page.evaluate(() => SceneIndex.roundTrips(SceneIndex.rows)), []);
});

test('untouched forms change nothing, and touching a field without changing it changes nothing', async () => {
  await reload(); await select('land-customs');
  assert.equal(await page.textContent('#changes'), 'const SCENE_OVERRIDES = {};\nconst NEW_SCENES = [];');
  await page.fill(rule('when', 'day'), '4');
  assert.equal((await changes())['land-customs'].when.day, 4);
  await page.fill(rule('when', 'day'), '3');
  assert.equal(await page.textContent('#changes'), 'const SCENE_OVERRIDES = {};\nconst NEW_SCENES = [];');
});

test('adding, changing and removing a condition changes the scene\'s conditions, and the game takes the result', async () => {
  await reload(); await select('land-customs');
  await page.selectOption('[data-add="when"]', 'before');
  await page.fill(rule('when', 'before'), '12');
  await page.fill(rule('when', 'chance'), '0.5');
  await page.click('button[data-drop="when"][data-dkey="cargo"]');
  const o = (await changes())['land-customs'];
  assert.deepEqual(o.when, { day: 3, gov: ['Arcology Compact', 'Dome Concord'], chance: 0.5, before: 12 });
  const g = await open({ scope: 'full' });
  const r = await g.ev(file => {
    const warnings = [], real = console.warn; console.warn = m => warnings.push(m);
    useOverrides(file); console.warn = real;
    const s = STORYLETS.find(x => x.id === 'land-customs');
    return { warnings, when: sceneView(s).when, problems: storyletProblems(sceneView(s), { duplicate: false }) };
  }, { 'land-customs': o });
  await g.done();
  assert.deepEqual(r.warnings, []);
  assert.deepEqual(r.when, o.when);
  assert.deepEqual(r.problems, []);
  // Taking every condition away leaves a scene with none, which is a change like any other.
  for (const k of ['day', 'gov', 'chance', 'before']) await page.click(`button[data-drop="when"][data-dkey="${k}"]`);
  assert.deepEqual((await changes())['land-customs'].when, {});
});

test('a value that does not fit is flagged beside its field and left out until it does', async () => {
  await reload(); await select('land-customs');
  await page.selectOption('[data-add="c1.effects"]', 'rep');
  assert.match(await warn('c1.effects', 'rep'), /needs at least one name=number/);
  await page.fill(rule('c1.effects', 'rep'), 'Dome Concord=2, Nobody=1');
  assert.match(await warn('c1.effects', 'rep'), /Nobody is not a government or faction/);
  assert.match(await page.textContent('#problems'), /Left out of the changes until fixed: c1\.effects: rep Nobody is not a government or faction/);
  assert.equal(JSON.stringify(await changes()), '{}', 'a bad field is not in the changes');
  await page.fill(rule('c1.effects', 'rep'), 'Dome Concord=2');
  assert.equal(await warn('c1.effects', 'rep'), '');
  assert.equal(await page.textContent('#problems'), '');
  assert.deepEqual((await changes())['land-customs'].choices[1].effects, { credits: -300, rep: { 'Dome Concord': 2 } });
  // The kinds check what they should.
  const k = await page.evaluate(() => {
    const p = (spec, d) => SceneIndex.kindOf(spec).parse(d);
    return { num: p('number', 'x'), chance: p('chance', '2'), flag: p('flag', 'maybe'), at: p('list:systems', 'mars, nowhere'), atOk: p('list:systems', 'mars'), atTwo: p('list:systems', 'mars, earth'), war: p('flagOr:factions', 'true'),
      like: p('map:like', 'captain=1, thread:loan=2'), likeBad: p('map:like', 'stranger=1'), action: p('action', 'nonsense'), actionOk: p('action', 'tracerAttempt'), actionList: p('action', '["gamble",1]'),
      mapNum: p('map', 'a=1, b=x') };
  });
  assert.match(k.num.error, /number/); assert.match(k.chance.error, /0 to 1/); assert.match(k.flag.error, /true or false/);
  assert.match(k.at.error, /nowhere is not a system/);
  assert.deepEqual(k.atOk, { value: 'mars' }); assert.deepEqual(k.atTwo, { value: ['mars', 'earth'] }); assert.deepEqual(k.war, { value: true });
  assert.deepEqual({ ...k.like.value }, { captain: 1, 'thread:loan': 2 }); assert.match(k.likeBad.error, /captain, crew or thread/);
  assert.match(k.action.error, /nonsense is not an action/); assert.deepEqual(k.actionOk, { value: 'tracerAttempt' }); assert.deepEqual(k.actionList, { value: ['gamble', 1] });
  assert.match(k.mapNum.error, /b=x/);
});

test('a choice can be linked to a scene, and a link to nothing is flagged', async () => {
  await reload(); await select('port-mars-sky');
  await page.fill('[data-rnext="c0.next"]', 'no-such-scene');
  assert.match(await warn('c0.next'), /no-such-scene is not a scene/);
  assert.equal(JSON.stringify(await changes()), '{}');
  await page.fill('[data-rnext="c0.next"]', 'port-mars-front');
  assert.equal(await warn('c0.next'), '');
  assert.equal((await changes())['port-mars-sky'].choices[0].next, 'port-mars-front');
  await page.fill('[data-rnext="c0.next"]', '');
  assert.equal(JSON.stringify(await changes()), '{}', 'no link, as shipped');
});

test('what the forms write never produces a scene the game would refuse, whatever is typed', async () => {
  await reload(); await select('land-customs');
  await page.selectOption('[data-add="when"]', 'story');
  await page.fill(rule('when', 'story'), '{"stage": 0}');
  await page.selectOption('[data-add="c0.effects"]', 'mission');
  await page.fill(rule('c0.effects', 'mission'), '{"to":"Mars","onDone":{"nonsense":1}}');
  await page.selectOption('[data-add="c0.effects"]', 'credits');
  await page.fill(rule('c0.effects', 'credits'), '250');
  const o = await changes();
  assert.deepEqual(o['land-customs'].when.story, { stage: 0 });
  assert.equal(o['land-customs'].choices, undefined, 'the choice\'s effects have a problem, so none of them go in');
  await page.fill(rule('c0.effects', 'mission'), '{"to":"Mars","tons":2,"good":"x","pay":9,"days":9,"title":"t"}');
  const fixed = (await changes())['land-customs'];
  const g = await open({ scope: 'full' });
  const r = await g.ev(file => {
    const warnings = [], real = console.warn; console.warn = m => warnings.push(m);
    const clean = cleanOverrides(file); console.warn = real;
    const s = STORYLETS.find(x => x.id === 'land-customs');
    return { warnings, kept: JSON.stringify(clean) === JSON.stringify(file), problems: storyletProblems({ ...s, when: clean['land-customs'].when, choices: s.choices.map((c, i) => ({ ...c, ...((clean['land-customs'].choices || {})[i] || {}) })) }, { duplicate: false }) };
  }, { 'land-customs': fixed });
  await g.done();
  assert.deepEqual(r.warnings, [], 'the game keeps all of it');
  assert.ok(r.kept && r.problems.length === 0);
});

test('a code-written scene shows when it plays as read-only text, with no form', async () => {
  await reload(); await select('cast:ilsa:late');
  assert.match(await page.textContent('#detail'), /days after they join/);
  assert.match(await page.textContent('#detail'), /written in code, and are read only until story 8/);
  assert.equal(await page.locator('#detail [data-add], #detail [data-rpath]').count(), 0);
  await select('captain:hester:secret:confide');
  assert.match(await page.textContent('#detail'), /40 days after you sign on, when their opinion of you is 2 or more/);
});

test('the preview plays the scene with its changed conditions, and says which fail', async () => {
  await reload(); await select('port-mars-sky');
  await page.selectOption('[data-add="when"]', 'credits');
  await page.fill(rule('when', 'credits'), '99999999');
  await page.fill('[data-pv=day]', '10');
  await page.click('[data-action="play"]');
  await page.waitForFunction(() => document.querySelector('#pv-report').textContent.length > 0, null, { timeout: 30000 });
  assert.match(await page.textContent('#pv-report'), /credits: 99999999/);
  const f = page.frames().find(x => /editor-preview/.test(x.url()));
  await f.waitForFunction(() => G.dialog, null, { timeout: 30000 });
  assert.equal(await f.evaluate(() => G.dialog.event.title), 'What Color the Sky Will Be');
});

test('typed conditions and effects are not run as markup', async () => {
  const r = await page.evaluate(() => {
    const evil = { id: 'x', title: 't', where: 'port', file: 'f', belongs: 'b', kind: 'data', text: 't', when: { '<img src=x>': 1 }, edit: { text: true, choices: [{ label: true, result: true }] },
      choices: [{ label: '<svg onload=1>', result: '', when: {}, effects: { credits: 1 }, next: '"><img src=y>' }] };
    const struct = Object.create(null);
    struct.x = Object.create(null);
    struct.x['c0.effects'] = [['<b>k</b>', '"><img src=z>']];
    const box = document.createElement('div');
    box.innerHTML = SceneIndex.detailHtml(evil, {}, [evil], struct);
    return { bad: box.querySelectorAll('img, svg, b').length, value: box.querySelector('[data-rpath="c0.effects"]').value, next: box.querySelector('[data-rnext]').value };
  });
  assert.equal(r.bad, 0);
  assert.equal(r.value, '"><img src=z>');
  assert.equal(r.next, '"><img src=y>');
});
