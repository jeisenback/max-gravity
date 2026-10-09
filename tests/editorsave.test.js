'use strict';

// Keeping, exporting, importing and reverting the editor's edits (#340). The editor keeps them in this browser, hands over js/overrides.js as a
// download, reads a file back without running it, and never writes to the repo or the game's saves.

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { chromium } = require('playwright');
const { open, watch, closeBrowser } = require('./helpers');

const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.join(ROOT, 'editor.html');
const SHIPPED = fs.readFileSync(path.join(ROOT, 'js', 'overrides.js'), 'utf8');
let browser, page, errors, tmp;

before(async () => {
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  const ctx = await browser.newContext({ viewport: { width: 1700, height: 1000 }, acceptDownloads: true });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, route => route.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  page = await ctx.newPage();
  errors = [];
  watch(page, errors);
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'editor-save-'));
  await page.goto(URL);
  await page.waitForFunction(() => SceneIndex.rows, null, { timeout: 30000 });
});
after(async () => {
  try { assert.deepEqual(errors, [], 'page errors'); } finally { await browser.close(); await closeBrowser(); fs.rmSync(tmp, { recursive: true, force: true }); }
});

const wait = () => page.waitForFunction(() => SceneIndex.rows, null, { timeout: 30000 });
async function fresh() { await page.goto(URL); await page.evaluate(() => localStorage.clear()); await page.reload(); await wait(); }
async function reload() { await page.reload(); await wait(); }
const select = async id => { await page.fill('#q', id); await page.click(`button[data-id="${id}"]`); };
const rule = (p, key) => `[data-rpath="${p}"][data-rkey="${key}"]`;
const fileOf = async () => { const t = await page.textContent('#changes'); return { overrides: JSON.parse(t.match(/^const SCENE_OVERRIDES = ([\s\S]*?);\nconst NEW_SCENES/)[1]), scenes: JSON.parse(t.match(/\nconst NEW_SCENES = ([\s\S]*);$/)[1]) }; };
async function exported() { const [d] = await Promise.all([page.waitForEvent('download'), page.click('[data-action="export"]')]); return { name: d.suggestedFilename(), text: fs.readFileSync(await d.path(), 'utf8') }; }
async function importText(text, name = 'in.js') { const f = path.join(tmp, name); fs.writeFileSync(f, text); await page.setInputFiles('#import-file', f); await page.waitForSelector('#notice .notice'); }
const notice = () => page.textContent('#notice');

test('edits survive a reload of the page, scene by scene, new scenes included', async () => {
  await fresh();
  await select('port-mars-sky');
  await page.fill('#f-title', 'Kept Title');
  await page.fill(rule('when', 'chance').replace('"when"', '"when"'), '0.5').catch(() => {});
  await select('land-customs');
  await page.fill('[data-rnext="c0.next"]', 'port-mars-sky');
  await page.click('[data-action="new-scene"]');
  await page.fill('#n-id', 'kept-new'); await page.fill('#n-title', 'Kept New'); await page.fill('#n-text', 'Kept text.'); await page.fill('#n-l0', 'Go');
  await page.selectOption('[data-add="c0.effects"]', 'credits'); await page.fill(rule('c0.effects', 'credits'), '9');
  const before = await fileOf();
  assert.equal(before.overrides['port-mars-sky'].title, 'Kept Title');
  await reload();
  assert.match(await notice(), /Your edits from earlier are back/);
  await select('port-mars-sky');
  assert.equal(await page.inputValue('#f-title'), 'Kept Title');
  assert.deepEqual(await fileOf(), before, 'the whole state is back');
  await page.fill('#q', 'kept-new');
  await page.click('#list button[data-id^="new:"]');
  assert.equal(await page.inputValue('#n-title'), 'Kept New');
  assert.equal(await page.inputValue(rule('c0.effects', 'credits')), '9');
  // A new scene made after a reload does not take the key of one that is back.
  await page.click('[data-action="new-scene"]');
  await page.fill('#n-id', 'another');
  assert.equal(await page.evaluate(() => new Set(SceneIndex.newRows.map(r => r.id)).size), 2);
});

test('the editor keeps its edits under its own key, and touches nothing of the game\'s', async () => {
  await fresh();
  await page.evaluate(() => { localStorage.setItem('maxGravity.save.1', 'my real save'); localStorage.setItem('maxGravity.slot', '1'); });
  await select('port-mars-sky');
  await page.fill('#f-title', 'Something');
  await page.click('[data-action="export"]');
  assert.deepEqual(await page.evaluate(() => Object.keys(localStorage).sort()), ['maxGravity.editor.v1', 'maxGravity.save.1', 'maxGravity.slot']);
  assert.equal(await page.evaluate(() => localStorage.getItem('maxGravity.save.1')), 'my real save');
  await page.evaluate(() => localStorage.clear());
});

test('discarding the restored edits starts again from js/overrides.js', async () => {
  await fresh();
  await select('port-mars-sky'); await page.fill('#f-title', 'Gone Soon');
  await reload();
  await page.click('[data-action="discard-saved"]');
  assert.equal(await notice(), '');
  assert.equal(await page.textContent('#changes').catch(() => ''), '');
  await select('port-mars-sky');
  assert.equal(await page.inputValue('#f-title'), 'What Color the Sky Will Be');
  await reload();
  assert.ok(!/earlier are back/.test(await notice()), 'nothing is left to restore');
});

test('an export with no changes is js/overrides.js exactly, and one with changes is a file the game takes', async () => {
  await fresh();
  const none = await exported();
  assert.equal(none.name, 'overrides.js');
  assert.equal(none.text, SHIPPED);
  await select('port-mars-sky');
  await page.fill('#f-title', 'Exported Title');
  await page.fill('#f-c1\\.label', 'Side with the sums');
  await page.selectOption('[data-add="c0.effects"]', 'credits'); await page.fill(rule('c0.effects', 'credits'), '75');
  await page.click('[data-action="new-scene"]');
  await page.fill('#n-id', 'exported-new'); await page.fill('#n-title', 'Exported New'); await page.fill('#n-text', 'Words.'); await page.fill('#n-l0', 'Fine');
  const out = await exported();
  assert.ok(out.text.startsWith(SHIPPED.slice(0, SHIPPED.indexOf('const SCENE_OVERRIDES'))), 'the file\'s own comments come first');
  assert.match(await notice(), /1 changed scene and 1 new scene/);
  const g = await open({ scope: 'full' });
  const r = await g.ev(src => {
    const warnings = [], errors = [], w = console.warn, e = console.error; console.warn = m => warnings.push(m); console.error = m => errors.push(m);
    const file = Function(`'use strict'; ${src}; return { SCENE_OVERRIDES, NEW_SCENES };`)();
    useNewScenes(file.NEW_SCENES); const clean = useOverrides(file.SCENE_OVERRIDES);
    console.warn = w; console.error = e;
    const s = STORYLETS.find(x => x.id === 'port-mars-sky'), ev = storyletEvent(s);
    return { warnings, errors, title: ev.title, label: ev.choices[1].label, added: STORYLETS.some(x => x.id === 'exported-new'), keys: Object.keys(clean) };
  }, out.text);
  await g.done();
  assert.deepEqual(r, { warnings: [], errors: [], title: 'Exported Title', label: 'Side with the sums', added: true, keys: ['port-mars-sky'] });
});

test('a problem scene is left out of the export, and the notice says so', async () => {
  await fresh();
  await page.click('[data-action="new-scene"]');
  await page.fill('#n-id', 'unfinished');
  const out = await exported();
  assert.equal(out.text, SHIPPED);
  assert.match(await notice(), /1 with a problem was left out/);
});

test('an exported file imports back to the same changes, only after it is confirmed', async () => {
  await fresh();
  await select('port-mars-sky'); await page.fill('#f-title', 'Round Trip'); await page.fill('#f-c0\\.result', 'A line.');
  await select('land-customs'); await page.selectOption('[data-add="when"]', 'before'); await page.fill(rule('when', 'before'), '20');
  await page.click('[data-action="new-scene"]');
  await page.fill('#n-id', 'rt-new'); await page.fill('#n-title', 'RT'); await page.fill('#n-text', 'T.'); await page.fill('#n-l0', 'Go');
  await page.selectOption('[data-add="c0.effects"]', 'rep'); await page.fill(rule('c0.effects', 'rep'), 'Dome Concord=2');
  const want = await fileOf();
  const out = await exported();
  await fresh();
  assert.deepEqual((await (async () => { await select('port-mars-sky'); return fileOf(); })()).overrides, {});
  await importText(out.text);
  assert.match(await notice(), /What importing this file would do/);
  assert.match(await notice(), /port-mars-sky: title, choice 1 result/);
  assert.match(await notice(), /land-customs: conditions/);
  assert.match(await notice(), /new scene rt-new/);
  assert.deepEqual((await fileOf()).overrides, {}, 'nothing is applied before it is confirmed');
  await page.click('[data-action="import-apply"]');
  assert.match(await notice(), /3 changes applied/);
  assert.deepEqual(await fileOf(), want);
  assert.equal(await page.inputValue('#f-title'), 'Round Trip');
  await reload();
  assert.deepEqual((await (async () => { await select('port-mars-sky'); return fileOf(); })()), want, 'and kept, like any edit');
});

test('cancelling an import changes nothing', async () => {
  await fresh();
  await select('port-mars-sky');
  await importText('const SCENE_OVERRIDES = { "port-mars-sky": { "title": "Not Applied" } };\nconst NEW_SCENES = [];\n');
  await page.click('[data-action="cancel-notice"]');
  assert.equal(await notice(), '');
  assert.equal(await page.inputValue('#f-title'), 'What Color the Sky Will Be');
});

test('a file with bad items is reported item by item, and the rest still imports', async () => {
  await fresh();
  const file = `const SCENE_OVERRIDES = {
    "no-such-scene": { "title": "x" },
    "port-mars-front": "not an object",
    "port-mars-sky": { "title": 42, "text": "Kept words.", "choices": { "9": { "label": "x" }, "1": { "label": "Kept label", "effects": { "nonsense": 1 }, "next": "nowhere" } }, "weight": 3, "when": { "day": "soon" } },
    "land-customs": { "when": { "day": 6 } }
  };
  // a comment between the two
  const NEW_SCENES = [
    { "id": "good-one", "where": "port", "title": "Good", "text": "Fine.", "priority": 3, "choices": [{ "label": "Go" }] },
    { "id": "port-mars-sky", "where": "port", "title": "Clash", "text": "x", "choices": [{ "label": "x" }] },
    { "id": "bad-cond", "where": "port", "title": "Bad", "text": "x", "when": { "nonsense": 1 }, "choices": [{ "label": "x" }] },
    "not a scene"
  ];
`;
  await importText(file);
  const text = await notice();
  for (const part of ['no-such-scene: not a scene in the game', 'port-mars-front: is not an object', 'port-mars-sky title: needs some text', 'no choice 9', 'choice 2 effects: has nonsense, which the game does not have',
    'choice 2 next: leads to a scene that is not there', 'port-mars-sky weight: is not something the editor changes', 'port-mars-sky when: day needs a number', 'new scene port-mars-sky: the id port-mars-sky is already a scene',
    'new scene bad-cond: ', 'a new scene that is not an object', 'port-mars-sky: text, choice 2 label', 'land-customs: conditions', 'new scene good-one']) assert.ok(text.includes(part), `${part} in: ${text}`);
  await page.click('[data-action="import-apply"]');
  await select('land-customs');
  const got = await fileOf();
  assert.deepEqual(got.overrides, { 'port-mars-sky': { text: 'Kept words.', choices: { 1: { label: 'Kept label' } } }, 'land-customs': { when: { day: 6 } } });
  assert.deepEqual(got.scenes, [{ id: 'good-one', where: 'port', title: 'Good', text: 'Fine.', priority: 3, choices: [{ label: 'Go' }] }], 'a field the form does not edit is kept');
});

test('an imported file is data: it is never run, and what it says is escaped', async () => {
  await fresh();
  await page.evaluate(() => { window.__ran = 0; });
  await importText('const SCENE_OVERRIDES = (function () { window.__ran = 1; return {}; })();\nconst NEW_SCENES = [];\n');
  assert.match(await notice(), /not plain data the editor can read/);
  assert.equal(await page.evaluate(() => window.__ran), 0);
  await importText('alert(1)');
  assert.match(await notice(), /not a file the editor wrote/);
  await importText(JSON.stringify({ overrides: { '<img src=x onerror="window.__ran=2">': { title: 'x' }, 'port-mars-sky': { title: '<img src=y onerror="window.__ran=3">' } }, newScenes: [] }), 'in.json');
  assert.equal(await page.evaluate(() => document.querySelectorAll('#notice img').length), 0);
  assert.match(await notice(), /&lt;img|<img src=x/, 'shown as text');
  await page.click('[data-action="import-apply"]');
  await select('port-mars-sky');
  assert.equal(await page.evaluate(() => document.querySelectorAll('#detail img').length), 0);
  assert.equal(await page.evaluate(() => window.__ran), 0);
  await importText('x'.repeat(10), 'tiny.js');
  assert.match(await notice(), /not a file the editor wrote/);
});

test('revert shows the shipped version first, and goes back to it only when confirmed', async () => {
  await fresh();
  await select('port-mars-sky'); await page.fill('#f-title', 'My Title'); await page.fill('#f-text', 'My words.');
  await page.click('[data-action="revert-scene"]');
  const n = await notice();
  assert.match(n, /Revert port-mars-sky to the shipped version/);
  assert.match(n, /What Color the Sky Will Be/);
  assert.match(n, /At the Red Line two people have been arguing/);
  assert.equal(await page.inputValue('#f-title'), 'My Title', 'nothing has gone yet');
  await page.click('[data-action="cancel-notice"]');
  assert.equal(await page.inputValue('#f-title'), 'My Title');
  await page.click('[data-action="revert-scene"]');
  await page.click('[data-action="confirm-revert"]');
  assert.equal(await page.inputValue('#f-title'), 'What Color the Sky Will Be');
  assert.deepEqual((await fileOf()).overrides, {});
});

test('revert everything lists what goes, and takes the new scenes too', async () => {
  await fresh();
  await page.click('[data-action="revert-all"]');
  assert.match(await notice(), /Nothing to revert/);
  await page.click('[data-action="cancel-notice"]');
  await select('port-mars-sky'); await page.fill('#f-title', 'A');
  await select('land-customs'); await page.fill('[data-rnext="c0.next"]', 'port-mars-sky');
  await page.click('[data-action="new-scene"]'); await page.fill('#n-id', 'doomed');
  await page.click('[data-action="revert-all"]');
  assert.match(await notice(), /2 edited scenes and 1 new scene go/);
  assert.match(await notice(), /What Color the Sky Will Be/);
  await page.click('[data-action="confirm-revert"][data-scope="all"]');
  assert.equal(await page.evaluate(() => SceneIndex.newRows.length), 0);
  assert.equal(await page.evaluate(() => Object.keys(SceneIndex.values).length + Object.keys(SceneIndex.struct).length), 0);
  await reload();
  assert.ok(!/earlier are back/.test(await notice()), 'and it stays reverted');
});

test('what the file template holds, and what a snapshot of the page lets back in', async () => {
  const r = await page.evaluate(() => ({
    head: SceneIndex.FILE_HEAD,
    junk: ['', 'x', '{}', '{"v":1}', '{"v":2,"values":{},"struct":{},"newRows":[]}', '{"v":1,"values":{},"struct":{},"newRows":"no"}'].map(s => SceneIndex.readSnapshot(s)),
    good: (() => { const s = SceneIndex.readSnapshot(JSON.stringify({ v: 1, base: 'b', newKey: 4, values: { a: { 'c0.label': 'x', bad: 5 } }, struct: { a: { when: [['day', '3']], 'c0.next': 'id', 'c1.next': 4, x: 'oops' } }, newRows: [{ id: 'new:3', isNew: true, choices: [{ label: 'L' }] }, { id: 'x', choices: [] }] })); return { values: { ...s.values.a }, struct: { ...s.struct.a }, rows: s.newRows.map(r => r.id), choice: s.newRows[0].choices[0].extra, key: s.newKey }; })(),
  }));
  assert.ok(SHIPPED.startsWith(r.head));
  assert.deepEqual(r.junk, [null, null, null, null, null, null]);
  assert.deepEqual(r.good, { values: { 'c0.label': 'x' }, struct: { when: [['day', '3']], 'c0.next': 'id' }, rows: ['new:3'], choice: {}, key: 4 });
});
