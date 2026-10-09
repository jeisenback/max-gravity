'use strict';

// New scenes and the chain view (#339): a scene written from scratch in the editor, held to the check addStorylet makes, shown in the index and
// the preview, and the links among scenes drawn as boxes. These open the editor and use it.

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

async function reload() { await page.goto(URL); await page.waitForFunction(() => SceneIndex.rows, null, { timeout: 30000 }); }
// The two constants the editor shows, as the file would hold them.
const file = async () => {
  const text = await page.textContent('#changes');
  return { overrides: JSON.parse(text.match(/^const SCENE_OVERRIDES = ([\s\S]*?);\nconst NEW_SCENES/)[1]), scenes: JSON.parse(text.match(/\nconst NEW_SCENES = ([\s\S]*);$/)[1]), text };
};
const rule = (p, key) => `[data-rpath="${p}"][data-rkey="${key}"]`;
// Starts a scene and fills its words; returns once the form is up.
async function newScene({ id, title = 'T', text = 'Some text.', label = 'Go on', result = '' }) {
  await page.click('[data-action="new-scene"]');
  await page.fill('#n-id', id); await page.fill('#n-title', title); await page.fill('#n-text', text);
  await page.fill('#n-l0', label);
  if (result) await page.fill('#n-r0', result);
}
const problems = () => page.textContent('#problems');

test('a new scene is a form that says what the game would refuse, until there is nothing', async () => {
  await reload();
  await page.click('[data-action="new-scene"]');
  assert.equal(await page.isDisabled('[data-action="play"]'), true);
  for (const p of [/needs an id/, /needs a title/, /needs text/, /choice 1 needs a label/]) assert.match(await problems(), p);
  assert.match(await page.textContent('#pv-scene'), /problems the game would refuse/);
  await page.fill('#n-id', 'has space');
  assert.match(await problems(), /letters, digits/);
  await page.fill('#n-id', 'port-mars-sky');
  assert.match(await problems(), /the id port-mars-sky is already a scene/);
  await page.fill('#n-id', 'my-first');
  await page.fill('#n-title', 'My First'); await page.fill('#n-text', 'Text.'); await page.fill('#n-l0', 'Go');
  assert.match(await problems(), /This scene is ready/);
  assert.equal(await page.isDisabled('[data-action="play"]'), false);
});

test('two new scenes cannot share an id', async () => {
  await reload();
  await newScene({ id: 'same-id' });
  await newScene({ id: 'same-id' });
  assert.match(await problems(), /the id same-id is already a scene/);
  await page.fill('#n-id', 'other-id');
  assert.match(await problems(), /This scene is ready/);
});

test('what is written becomes one scene in the file, as addStorylet takes it, and the game takes it from there', async () => {
  await reload();
  await newScene({ id: 'my-scene', title: 'A Quiet Dock', text: 'The dock is quiet.', label: 'Wait', result: 'You wait.' });
  await page.selectOption('[data-new="where"]', 'transit');
  await page.selectOption('[data-new="via"]', 'ship');
  await page.selectOption('[data-add="when"]', 'day');
  await page.fill(rule('when', 'day'), '5');
  await page.selectOption('[data-add="c0.effects"]', 'credits');
  await page.fill(rule('c0.effects', 'credits'), '40');
  await page.click('[data-action="add-choice"]');
  await page.fill('#n-l1', 'Leave');
  const { scenes, overrides } = await file();
  assert.deepEqual(overrides, {}, 'the shipped scenes are untouched');
  assert.deepEqual(scenes, [{
    id: 'my-scene', where: 'transit', title: 'A Quiet Dock', text: 'The dock is quiet.', via: 'ship', when: { day: 5 },
    choices: [{ label: 'Wait', result: 'You wait.', effects: { credits: 40 } }, { label: 'Leave' }],
  }]);
  const g = await open({ scope: 'full' });
  const r = await g.ev(list => {
    const errors = [], real = console.error; console.error = (...a) => errors.push(a.join(' '));
    useNewScenes(list); console.error = real;
    const s = STORYLETS.find(x => x.id === 'my-scene');
    G.state.credits = 10;
    const ev = storyletEvent(s), result = ev.choices[0].run();
    return { errors, problems: storyletProblems(s, { duplicate: false }), title: ev.title, via: ev.via, labels: ev.choices.map(c => c.label), result, credits: G.state.credits };
  }, scenes);
  await g.done();
  assert.deepEqual(r, { errors: [], problems: [], title: 'A Quiet Dock', via: 'ship', labels: ['Wait', 'Leave'], result: 'You wait.', credits: 50 });
});

test('a new scene with a problem is left out of the file and says so, and one that is fixed goes in', async () => {
  await reload();
  await newScene({ id: 'half-done' });
  await page.selectOption('[data-add="c0.effects"]', 'rep');
  await page.fill(rule('c0.effects', 'rep'), 'Nobody=1');
  assert.deepEqual((await file()).scenes, []);
  assert.match(await problems(), /choice 1 effects: rep Nobody is not a government or faction/);
  await page.fill(rule('c0.effects', 'rep'), 'Dome Concord=1');
  assert.equal((await file()).scenes.length, 1);
});

test('the new scene is in the index, can be found, and plays in the preview with a link to the next', async () => {
  await reload();
  await newScene({ id: 'first-beat', title: 'The First Beat', text: 'It begins.', label: 'Continue', result: 'On.' });
  await page.fill('[data-rnext="c0.next"]', 'second-beat');
  assert.match(await problems(), /second-beat is not a scene/);
  await page.click('[data-action="new-scene"]');
  await page.fill('#n-id', 'second-beat'); await page.fill('#n-title', 'The Second Beat'); await page.fill('#n-text', 'It goes on.'); await page.fill('#n-l0', 'End');
  await page.check('[data-new="chained"]');
  await page.fill('#q', 'beat');
  const list = await page.textContent('#list');
  assert.match(list, /first-beat/); assert.match(list, /second-beat/); assert.match(list, /The Second Beat/);
  assert.equal(await page.locator('#list .edited', { hasText: 'new' }).count(), 2);
  assert.equal(await page.evaluate(() => SceneIndex.rows.some(r => /beat/.test(r.id))), false, 'the shipped rows are the shipped scenes');
  await page.click('button[data-id="new:1"]');
  assert.match(await page.textContent('#detail'), /The First Beat/);
  await page.click('[data-action="play"]');
  await page.waitForFunction(() => document.querySelector('#pv-report').textContent.length > 0, null, { timeout: 30000 });
  const f = page.frames().find(x => /editor-preview/.test(x.url()));
  await f.waitForFunction(() => G.dialog && G.dialog.event.title === 'The First Beat', null, { timeout: 30000 });
  await f.click('[data-action="choose"][data-arg="0"]');
  await f.click('[data-action="continue"]');
  await f.waitForFunction(() => G.dialog && G.dialog.event.title === 'The Second Beat', null, { timeout: 30000 });
  assert.equal(await f.evaluate(() => STORYLETS.filter(s => s.id === 'first-beat').length), 1);
});

test('the chain view draws a storyline\'s scenes as boxes with their links, for scenes new and shipped', async () => {
  await reload();
  await newScene({ id: 'start-here', title: 'Start Here', result: 'On.' });
  await page.fill('[data-rnext="c0.next"]', 'then-this');
  await page.click('[data-action="new-scene"]');
  await page.fill('#n-id', 'then-this'); await page.fill('#n-title', 'Then This'); await page.fill('#n-text', 'x'); await page.fill('#n-l0', 'Done');
  await page.check('[data-new="chained"]');
  await page.selectOption('#view', 'chain');
  await page.selectOption('#group', 'new scene');
  const view = await page.textContent('#list');
  assert.match(view, /Chain: new scene/);
  assert.match(view, /Start Here\s*start-here\s*starts a chain/);
  assert.match(view, /Choice 1 \(Go on\) leads to Then This/);
  assert.match(view, /Then This\s*then-this/);
  assert.match(view, /Reached from start-here/);
  assert.match(view, /ends here/);
  assert.match(view, /Every link in this storyline leads to a scene/);
  // Clicking a box opens that scene in the editor.
  await page.click('#list .box button[data-id="new:2"]');
  assert.equal(await page.inputValue('#n-id'), 'then-this');
  // A shipped storyline shows its links, from what its choices set going.
  await page.selectOption('#group', 'cold-water');
  assert.match(await page.textContent('#list'), /by setting the story's stage to/);
  assert.ok(await page.locator('#list .box').count() >= 20);
  await page.selectOption('#group', 'aftermath');
  assert.match(await page.textContent('#list'), /after \d+ days/);
});

test('the chain view flags a link to a scene that is not there, and a scene nothing leads to', async () => {
  await reload();
  await newScene({ id: 'lonely', title: 'Lonely' });
  await page.check('[data-new="chained"]');
  await page.fill('[data-rnext="c0.next"]', 'nowhere-at-all');
  await page.selectOption('#view', 'chain');
  await page.selectOption('#group', 'new scene');
  const view = await page.textContent('#list');
  assert.match(view, /nothing leads here/);
  assert.match(view, /lonely only plays after another scene leads to it/);
  assert.match(view, /lonely: choice 1 leads to nowhere-at-all, which is not a scene/);
  assert.match(view, /nowhere-at-all \(not a scene\)/);
  // The shipped scenes have no link to a scene that is not there.
  const bad = await page.evaluate(() => {
    const ms = SceneIndex.rows.filter(r => r.kind === 'data').map(r => SceneIndex.modelOf(r, SceneIndex.struct));
    return [...new Set(ms.map(m => m.group))].flatMap(g => SceneIndex.chainOf(ms, g).problems).filter(p => /is not a scene/.test(p));
  });
  assert.deepEqual(bad, []);
});

test('a change to a shipped scene\'s link shows in the chain too', async () => {
  await reload();
  await page.fill('#q', 'port-mars-sky');
  await page.click('button[data-id="port-mars-sky"]');
  await page.fill('[data-rnext="c0.next"]', 'port-mars-front');
  await page.selectOption('#view', 'chain');
  await page.selectOption('#group', 'ports');
  assert.match(await page.textContent('#list'), /What Color the Sky Will Be\s*port-mars-sky[\s\S]*Choice 1 \(Side with the veteran\) leads to A Front Over the Valley/);
});

test('taking a choice out moves the later ones up, with their conditions, effects and links', async () => {
  await reload();
  await newScene({ id: 'two-choices' });
  await page.selectOption('[data-add="c0.effects"]', 'credits'); await page.fill(rule('c0.effects', 'credits'), '1');
  await page.click('[data-action="add-choice"]');
  await page.fill('#n-l1', 'Second');
  await page.selectOption('[data-add="c1.effects"]', 'credits'); await page.fill(rule('c1.effects', 'credits'), '2');
  await page.fill('[data-rnext="c1.next"]', 'port-mars-sky');
  await page.click('[data-action="drop-choice"][data-i="0"]');
  const { scenes } = await file();
  assert.deepEqual(scenes[0].choices, [{ label: 'Second', effects: { credits: 2 }, next: 'port-mars-sky' }]);
});

test('a scene can be discarded, and the scenes the file already holds are drafts to edit', async () => {
  await reload();
  await newScene({ id: 'to-discard' });
  await page.click('[data-action="discard-scene"]');
  await page.fill('#q', 'port-mars-sky'); await page.click('button[data-id="port-mars-sky"]');
  assert.deepEqual((await file()).scenes, []);
  assert.equal(await page.evaluate(() => SceneIndex.newRows.length), 0);
  const def = { id: 'from-file', where: 'transit', title: 'From the File', text: 'Text.', via: 'message', chained: true, when: { day: 3, post: ['pilot', 'gunner'] },
    choices: [{ label: 'A', result: 'R', when: { credits: 10 }, effects: { q: { x: 1 }, rep: { 'Dome Concord': 1 } }, next: 'port-mars-sky' }, { label: 'B' }] };
  const back = await page.evaluate(d => { const struct = Object.create(null), r = SceneIndex.draftFromDef(d, struct); return { def: SceneIndex.newSceneDef(r, struct), problems: SceneIndex.newProblems(r, struct, []) }; }, def);
  assert.deepEqual(back.problems, []);
  assert.deepEqual(back.def, def);
});

test('what is typed into a new scene or a chain is not run as markup', async () => {
  const r = await page.evaluate(() => {
    const struct = Object.create(null);
    const row = SceneIndex.draftFromDef({ id: '"><img src=x>', where: 'port', title: '<svg onload=1>', text: '<script>1</script>', choices: [{ label: '<b>l</b>', result: '<i>r</i>', next: '"><img src=y>' }] }, struct);
    const box = document.createElement('div');
    box.innerHTML = SceneIndex.newSceneHtml(row, struct, []);
    const models = [SceneIndex.modelOf(row, struct)];
    const chain = document.createElement('div');
    chain.innerHTML = SceneIndex.chainHtml(SceneIndex.chainOf(models, 'new scene'), models, 'new scene', '');
    return { form: box.querySelectorAll('img, svg, script, b, i').length, chain: chain.querySelectorAll('img, svg, script, b, i').length, id: box.querySelector('#n-id').value };
  });
  assert.deepEqual(r, { form: 0, chain: 0, id: '"><img src=x>' });
});
