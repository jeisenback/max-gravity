'use strict';

// The hired chapter's scenes in the editor (#342): the ones turned into data have their effects in forms, every cast and captain scene has its words
// editable, and each plays in the preview with the people it is about aboard.

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

test('the converted scenes are data rows of the registry, and the rest are code rows with a text layer', async () => {
  const r = await page.evaluate(() => {
    const row = id => SceneIndex.rows.find(x => x.id === id);
    return { ansel: ['kind', 'registry'].map(k => row('cast:ansel:intro')[k]), closed: ['kind', 'registry'].map(k => row('cast:cato:late:closed')[k]), ilsa: ['kind', 'registry'].map(k => row('cast:ruben:mid1')[k]),
      effects: row('cast:ansel:intro').choices[0].effects, edit: row('cast:ines:pivot').edit.choices.map(c => c.effects), goodbye: row('captain:hester:goodbye').registry, signon: row('scene:sign-on').registry,
      storylets: SceneIndex.rows.filter(x => x.kind === 'data' && !x.registry).length, dataRegistry: SceneIndex.rows.filter(x => x.kind === 'data' && x.registry && !/^(lines|people):/.test(x.id)).length };  // the hired chapter's scenes; the line tables and the passenger events are counted in their own tests (#457)
  });
  assert.deepEqual(r.ansel, ['data', true]);
  assert.deepEqual(r.closed, ['data', true]);
  assert.deepEqual(r.ilsa, ['code', true]);
  assert.equal(r.effects.castLike.who, 'ansel');
  assert.ok(r.edit.length > 0 && r.edit.every(e => e === false), 'code choices keep their effects in code');
  assert.ok(r.goodbye && r.signon, 'the goodbye and the sign-on are rows of the registry');
  assert.equal(r.dataRegistry, 118);
});

test('a converted scene\'s effects are in forms, checked as typed, and changing one is a change to the file', async () => {
  await reload(); await select('cast:ansel:intro');
  const shown = JSON.parse(await page.inputValue(rule('c0.effects', 'castLike')));
  assert.deepEqual(Object.keys(shown), ['who', 'n', 'memory']);
  assert.equal(await page.locator('#detail [data-add="when"]').count(), 0, 'no conditions on a hired scene');
  await page.fill(rule('c0.effects', 'castLike'), JSON.stringify({ ...shown, n: 5 }));
  assert.deepEqual((await changes())['cast:ansel:intro'], { choices: { 0: { effects: { castLike: { ...shown, n: 5 } } } } });
  await page.fill(rule('c0.effects', 'castLike'), JSON.stringify({ ...shown, who: 'nobody' }));
  assert.match(await page.textContent('[data-rerr="c0.effects|castLike"]'), /nobody is not a main character or first officer/);
  assert.deepEqual(await changes(), {}, 'a field with a problem is left out');
  await page.fill(rule('c0.effects', 'castLike'), JSON.stringify(shown));
  assert.deepEqual(await changes(), {}, 'the shipped value is no change');
  // A flag the scene does not set can be added from the list the game's table gives.
  await page.selectOption('[data-add="c0.effects"]', 'castFlag');
  await page.fill(rule('c0.effects', 'castFlag'), '{"who":"ansel","flag":"heard"}');
  assert.equal((await changes())['cast:ansel:intro'].choices[0].effects.castFlag.flag, 'heard');
});

test('the scene plays in the preview with its own captain and first officer aboard, and the edited effect plays', async () => {
  await reload(); await select('cast:ansel:intro');
  const shown = JSON.parse(await page.inputValue(rule('c0.effects', 'castLike')));
  await page.fill('#f-title', 'An Edited Title');
  await page.fill(rule('c0.effects', 'castLike'), JSON.stringify({ ...shown, n: 4 }));
  const f = await play();
  const r = await f.evaluate(() => ({ title: G.dialog.event.title, captain: hired().captainKey, aboard: castAboard().map(c => c.cast).sort(), mode: G.mode }));
  assert.equal(r.title, 'An Edited Title');
  assert.equal(r.captain, 'zoya', 'the captain whose first officer is Ansel');
  assert.ok(r.aboard.includes('ansel'));
  assert.match(await page.textContent('#pv-report'), /plays by its days/);
  await f.click('[data-action="choose"][data-arg="0"]');
  await page.waitForFunction(() => document.querySelector('#pv-effects').textContent.length > 0);
  assert.match(await page.textContent('#pv-effects'), /opinion of you: 0 to 4 \(\+4\)/);
});

test('a hired event written as data has its effects in forms and plays in the preview with a shipmate aboard (#473)', async () => {
  await reload(); await select('hired:crew-cover');
  const row = await page.evaluate(() => { const r = SceneIndex.rows.find(x => x.id === 'hired:crew-cover'); return { kind: r.kind, registry: r.registry, title: r.title, effects: Object.keys(r.choices[0].effects) }; });
  assert.deepEqual(row, { kind: 'data', registry: true, title: 'Cover for a Shipmate', effects: ['remember', 'later', 'log', 'mateLike', 'learn'] });
  // {mate} is a word the game replaces, so the text shows no flag; the new effects have forms that check as typed.
  assert.doesNotMatch(await page.textContent('#detail'), /Not a placeholder the game replaces/);
  const like = JSON.parse(await page.inputValue(rule('c0.effects', 'mateLike')));
  await page.fill(rule('c0.effects', 'mateLike'), JSON.stringify({ ...like, n: 3 }));
  await page.fill(rule('c0.effects', 'remember'), '""');
  assert.match(await page.textContent('#detail'), /needs a name/);
  await page.fill(rule('c0.effects', 'remember'), JSON.stringify('cover'));
  await page.fill('#f-c0\\.result', '{mate} was grateful.');
  assert.deepEqual((await changes())['hired:crew-cover'], { choices: { 0: { result: '{mate} was grateful.', effects: { remember: 'cover', later: { 'h-cover-back': 10 }, log: "Covered an hour of {thread:cover}'s watch.", mateLike: { ...like, n: 3 }, learn: 1 } } } });
  const f = await play();
  const first = await f.evaluate(() => { const m = handContext().mate; return m && m.first; });
  assert.ok(await f.evaluate(() => G.dialog.event.text.length > 0));
  await f.click('[data-action="choose"][data-arg="0"]');
  await page.waitForFunction(() => document.querySelector('#pv-effects').textContent.length > 0);
  assert.match(await page.textContent('#pv-effects'), /(\+3)/);
  assert.ok(first, 'a shipmate was aboard');
});

test('a work event and an ice scene have their words in the form, the lines for a win and a lose among them, and play in the preview (#462)', async () => {
  await reload(); await select('hired:pilot-drift');
  const ids = await page.locator('#detail [data-path]').evaluateAll(els => els.map(e => e.dataset.path));
  assert.deepEqual(ids, ['title', 'text', 'c0.label', 'c0.result', 'c1.label', 'c1.win', 'c1.lose']);
  assert.match(await page.textContent('#detail'), /played by one template from a table/);
  assert.equal(await page.locator('#detail [data-add]').count(), 0, 'no conditions or effects to edit: the odds are in code');
  await page.fill('#f-title', 'Drift, edited');
  await page.fill('#f-c0\\.result', 'You fix the drift, the editor\'s way.');
  await page.fill('#f-c1\\.win', 'Won, the editor\'s way.');
  assert.deepEqual(await changes(), { 'hired:pilot-drift': { title: 'Drift, edited', choices: { 0: { result: 'You fix the drift, the editor\'s way.' }, 1: { win: 'Won, the editor\'s way.' } } } });
  const f = await play();
  assert.equal(await f.evaluate(() => [G.dialog.event.title, hired().post].join()), 'Drift, edited,pilot', 'played at its own post');
  await f.click('[data-action="choose"][data-arg="0"]');
  await page.waitForFunction(() => document.querySelector('#pv-effects').textContent.length > 0);
  assert.match((await f.textContent('#event-result')).trim(), /^You fix the drift, the editor's way\. \(\+3 experience at the pilot post\.\)$/);
  // An ice scene: two openings, the general choices, and a post's own.
  await reload(); await select('ice:1');
  const ice = await page.locator('#detail [data-path]').evaluateAll(els => els.map(e => e.dataset.path));
  assert.deepEqual(ice.slice(0, 3), ['title', 'text', 'text2']);
  assert.ok(ice.includes('c3.win') && ice.includes('c3.lose') && ice.includes('c6.lose'), ice.join());
  assert.match(await page.textContent('#detail'), /pilot's own/);
  await page.fill('#f-text2', 'A second opening, edited.');
  await page.fill('#f-c0\\.lose', 'The slow way loses, edited.');
  assert.deepEqual(await changes(), { 'ice:1': { text2: 'A second opening, edited.', choices: { 0: { lose: 'The slow way loses, edited.' } } } });
  const g = await play();
  assert.equal(await g.evaluate(() => G.dialog.event.title), 'The Rock');
  assert.equal(await g.evaluate(() => G.dialog.choices.length), 4);
});

test('an imported file may give a table scene its words and its lines, and a line it does not have is refused item by item (#462)', async () => {
  await reload();
  const tmp = path.join(require('node:os').tmpdir(), `table-import-${process.pid}.js`);
  require('node:fs').writeFileSync(tmp, `const SCENE_OVERRIDES = {"hired:pilot-drift":{"title":"Imported","text2":"No","choices":{"0":{"win":"No such line"},"1":{"win":"Kept win"}}},"ice:2":{"text2":"Kept opening","choices":{"1":{"lose":"Kept lose"}}}};\nconst NEW_SCENES = [];\n`);
  await page.setInputFiles('#import-file', tmp);
  await page.waitForSelector('#notice .notice');
  const n = await page.textContent('#notice');
  for (const part of ['hired:pilot-drift text2: this scene has no second opening', 'hired:pilot-drift choice 1 win: is not something this choice has']) assert.ok(n.includes(part), `${part} in: ${n}`);
  await page.click('[data-action="import-apply"]');
  await select('hired:pilot-drift');
  assert.deepEqual(await changes(), { 'hired:pilot-drift': { title: 'Imported', choices: { 1: { win: 'Kept win' } } }, 'ice:2': { text2: 'Kept opening', choices: { 1: { lose: 'Kept lose' } } } });
  require('node:fs').rmSync(tmp, { force: true });
});

test('a hired data choice has its conditions in forms, checked as typed, and changing one is a change to the file (#460)', async () => {
  await reload();
  const at = await page.evaluate(() => { for (const r of SceneIndex.rows) { const i = r.choices.findIndex(c => c.label === 'Lend him 200 cr'); if (i >= 0) return { id: r.id, i }; } });
  await select(at.id);
  assert.equal(await page.inputValue(rule(`c${at.i}.when`, 'credits')), '200');
  await page.fill(rule(`c${at.i}.when`, 'credits'), '500');
  assert.deepEqual((await changes())[at.id], { choices: { [at.i]: { when: { credits: 500 } } } });
  // A regard is a condition with a form: { who, min }, and a person who is not there is refused as typed.
  const w = await page.evaluate(() => { for (const r of SceneIndex.rows) { const i = r.choices.findIndex(c => c.when && c.when.opinion); if (i >= 0) return { id: r.id, i, opinion: r.choices[i].when.opinion }; } });
  await select(w.id);
  assert.deepEqual(JSON.parse(await page.inputValue(rule(`c${w.i}.when`, 'opinion'))), w.opinion);
  await page.fill(rule(`c${w.i}.when`, 'opinion'), JSON.stringify({ who: 'nobody', min: 3 }));
  assert.match(await page.textContent('#detail'), /nobody is not the captain, the first officer or a main character/);
  await page.fill(rule(`c${w.i}.when`, 'opinion'), JSON.stringify({ who: 'captain', min: 3 }));
  assert.deepEqual((await changes())[w.id], { choices: { [w.i]: { when: { opinion: { who: 'captain', min: 3 } } } } });
  // A choice that runs code has no conditions form: its conditions are written in code.
  await select('cast:ruben:mid1');
  assert.equal(await page.locator('#detail [data-add="c0.when"]').count(), 0);
  assert.equal(await page.locator('#detail [data-add="c1.when"]').count(), 1, 'its data choice has one');
});

test('a captain\'s goodbye has a field for each part of its text and its choices as data, and plays in the preview (#476)', async () => {
  await reload(); await select('captain:hester:goodbye');
  const ids = await page.locator('#detail [data-path]').evaluateAll(els => els.map(e => e.dataset.path));
  assert.deepEqual(ids.slice(0, 10), ['title', 'part.cold', 'part.neutral', 'part.warm', 'part.crew', 'part.secret', 'part.repaid', 'part.xoDead', 'part.xo', 'part.parting']);
  assert.ok(ids.includes('c1.result'));
  assert.doesNotMatch(await page.textContent('#detail'), /Not a placeholder the game replaces/, '{names} is a word the game replaces');
  assert.equal(await page.inputValue(rule('c1.when', 'captainFlag')), 'secretKnown');
  await page.fill('#f-part\\.parting', 'A parting, edited.');
  await page.fill('#f-title', 'The Ramp, edited');
  assert.deepEqual(await changes(), { 'captain:hester:goodbye': { title: 'The Ramp, edited', parts: { parting: 'A parting, edited.' } } });
  const f = await play();
  const r = await f.evaluate(() => ({ title: G.dialog.event.title, text: G.dialog.event.text, labels: G.dialog.choices.map(c => c.label) }));
  assert.equal(r.title, 'The Ramp, edited');
  assert.match(r.text, /A parting, edited\.$/);
  assert.equal(r.labels.length, 3, 'with the secret learned, every choice shows');
  // An imported file may give parts, and refuses one the scene does not have.
  const tmp = path.join(require('node:os').tmpdir(), `goodbye-import-${process.pid}.js`);
  require('node:fs').writeFileSync(tmp, 'const SCENE_OVERRIDES = {"captain:hester:goodbye":{"parts":{"warm":"Kept warm.","nonsense":"x"}},"cast:ines:pivot":{"parts":{"cold":"x"}}};\nconst NEW_SCENES = [];\n');
  await page.setInputFiles('#import-file', tmp);
  await page.waitForSelector('#notice .notice');
  const n = await page.textContent('#notice');
  for (const part of ['captain:hester:goodbye parts nonsense: this scene has no such part', 'cast:ines:pivot parts: this scene is not built from parts']) assert.ok(n.includes(part), `${part} in: ${n}`);
  require('node:fs').rmSync(tmp, { force: true });
});

test('a meeting scene is data: its choices have a berth condition and a join effect, and it plays at a port with the person not yet aboard (#461)', async () => {
  await reload(); await select('cast:ines:meet');
  const row = await page.evaluate(() => { const r = SceneIndex.rows.find(x => x.id === 'cast:ines:meet'); return { kind: r.kind, when: r.choices.map(c => c.when), effects: r.choices.map(c => c.effects) }; });
  assert.deepEqual(row, { kind: 'data', when: [{ berths: 1 }, {}], effects: [{ castJoin: 'ines' }, { castLater: 'ines' }] });
  assert.equal(await page.inputValue(rule('c0.when', 'berths')), '1');
  assert.equal(JSON.parse(await page.inputValue(rule('c0.effects', 'castJoin'))), 'ines');
  await page.fill(rule('c0.effects', 'castJoin'), JSON.stringify('nobody'));
  assert.match(await page.textContent('#detail'), /needs the key of a main character/);
  await page.fill(rule('c0.effects', 'castJoin'), JSON.stringify('ines'));
  const f = await play();
  const r = await f.evaluate(() => ({ mode: G.state.mode || (hired() ? 'hired' : 'owner'), aboard: G.state.crew.includes('c:ines'), choices: G.dialog.choices.map(c => [c.label, c.can ? c.can() : true]) }));
  assert.equal(r.mode, 'owner');
  assert.equal(r.aboard, false);
  assert.deepEqual(r.choices.map(c => c[1]), [true, true]);
  await f.click('[data-action="choose"][data-arg="0"]');
  await page.waitForFunction(() => document.querySelector('#pv-effects').textContent.length > 0);
  assert.equal(await f.evaluate(() => G.state.crew.includes('c:ines')), true, 'she joined');
});

test('the words of a code scene can be edited, and a result written replaces the line the code returns', async () => {
  await reload(); await select('cast:ruben:mid1');
  await page.fill('#f-title', 'Ruben, Edited');
  await page.fill('#f-c0\\.result', 'Ruben says nothing at all.');
  assert.deepEqual(await changes(), { 'cast:ruben:mid1': { title: 'Ruben, Edited', choices: { 0: { result: 'Ruben says nothing at all.' } } } });
  const f = await play();
  assert.equal(await f.evaluate(() => G.dialog.event.title), 'Ruben, Edited');
  await f.click('[data-action="choose"][data-arg="0"]');
  await page.waitForFunction(() => document.querySelector('#pv-effects').textContent.length > 0);
  assert.equal((await f.textContent('#event-result')).trim(), 'Ruben says nothing at all.');
  assert.match(await page.textContent('#pv-effects'), /opinion of you/, 'what the code does is unchanged');
});

test('the closed and the open reading of a scene are two rows, and the preview plays the one asked for', async () => {
  await reload(); await select('cast:cato:late:closed');
  await page.fill('#f-title', 'The Shut Door');
  let f = await play();
  assert.equal(await f.evaluate(() => G.dialog.event.title), 'The Shut Door');
  await select('cast:cato:late');
  f = await play();
  assert.equal(await f.evaluate(() => G.dialog.event.title), 'What Cato Knows', 'the open reading is as shipped');
});

test('a captain\'s scene plays in the preview, in the reading its regard picks', async () => {
  await reload(); await select('captain:hester:secret:found');
  await page.fill('#f-title', 'Found Out');
  let f = await play();
  assert.deepEqual(await f.evaluate(() => [G.dialog.event.title, hired().captainKey]), ['Found Out', 'hester']);
  await select('captain:hester:secret:confide');
  f = await play();
  assert.notEqual(await f.evaluate(() => G.dialog.event.title), 'Found Out');
});

test('what the editor writes for a hired scene is a file the game takes, and a bad one is refused item by item', async () => {
  await reload(); await select('cast:pilar:mid1');
  const shown = JSON.parse(await page.inputValue(rule('c0.effects', 'castLike')));
  await page.fill('#f-title', 'Exported'); await page.fill(rule('c0.effects', 'castLike'), JSON.stringify({ ...shown, n: 2 }));
  const [d] = await Promise.all([page.waitForEvent('download'), page.click('[data-action="export"]')]);
  const text = require('node:fs').readFileSync(await d.path(), 'utf8');
  const g = await open({ scope: 'full' });
  const r = await g.ev(src => {
    const warnings = [], w = console.warn; console.warn = m => warnings.push(m);
    const file = Function(`'use strict'; ${src}; return { SCENE_OVERRIDES };`)();
    useOverrides(file.SCENE_OVERRIDES); console.warn = w;
    startGame({ mode: 'hired', background: 'earth', post: 'gunner', captainKey: 'imre', credits: 5000 }); G.dialog = null;
    return { warnings, title: castScene('pilar', CAST.pilar.scenes.mid1).title };
  }, text);
  await g.done();
  assert.deepEqual(r, { warnings: [], title: 'Exported' });
  const tmp = require('node:path').join(require('node:os').tmpdir(), `hired-import-${process.pid}.js`);
  require('node:fs').writeFileSync(tmp, 'const SCENE_OVERRIDES = {"cast:cato:intro":{"title":"Imported","when":{"day":3},"choices":{"0":{"next":"port-mars-sky","effects":{"castLike":{"who":"nobody","n":1,"memory":"m"}}}}},"cast:ines:pivot":{"choices":{"0":{"effects":{"credits":1}}}}};\nconst NEW_SCENES = [];\n');
  await reload();
  await page.setInputFiles('#import-file', tmp);
  await page.waitForSelector('#notice .notice');
  const n = await page.textContent('#notice');
  for (const part of ['cast:cato:intro: title', 'cast:cato:intro when: a hired scene plays by its days', 'choice 1 next: a hired scene plays by its days', 'choice 1 effects: castLike nobody is not a main character', 'cast:ines:pivot choice 1 effects: this choice runs code']) assert.ok(n.includes(part), `${part} in: ${n}`);
  require('node:fs').rmSync(tmp, { force: true });
});

test('the editor\'s checks of the hired effects are the game\'s', async () => {
  const samples = [{ who: 'ilsa', n: 1, memory: 'm' }, { who: 'nobody', n: 1, memory: 'm' }, { who: 'ilsa', n: 'x', memory: 'm' }, { who: 'ilsa', n: 1, memory: ' ' }, 'oops', null,
    { who: 'ilsa', flag: 'f' }, { who: 'ilsa', flag: '' }, { who: 'ilsa', role: 'engineer', n: 2 }, { who: 'ilsa', role: '', n: 2 }, { n: 2, memory: 'm' }, { n: 'x' }, 'a', ['a', 'b'], [1], '', 'ilsa', 'ines',
    { post: 'engineer', n: 3 }, { post: 'nobody', n: 3 }, { post: 'gunner', n: 'x' }, { who: 'captain', min: 3 }, { who: 'xo', min: 1 }, { who: 'ilsa', min: 2 }, { who: 'nobody', min: 1 }, { who: 'captain', min: 'x' }];
  const names = ['castLike', 'castFlag', 'castXp', 'captainLike', 'captainFlag', 'mateLike', 'remember', 'gainSkill', 'castJoin', 'castLater', 'opinion'];
  const here = await page.evaluate(([s, names]) => names.map(k => s.map(v => { const kind = SceneIndex.kindOf(`shape:${k}`); return !kind.parse(JSON.stringify(v === undefined ? null : v)).error; })), [samples, names]);
  const g = await open({ scope: 'full' });
  const there = await g.ev(([s, names]) => names.map(k => s.map(v => !(EFFECT_SHAPES[k] || CONDITION_SHAPES[k])(v))), [samples, names]);
  await g.done();
  assert.deepEqual(here, there);
});

test('the chain view leaves the hired scenes out: they are played by their days, not led to', async () => {
  await reload();
  await page.selectOption('#view', 'chain');
  const groups = await page.locator('#group option').allTextContents();
  assert.ok(groups.length > 5);
  assert.ok(!groups.some(g => /first officer|captain\)|main character/.test(g)), groups.join(', '));
});

test('the raid, ambush and boarding beats are edited line by line, the lines go to and from the file, and each plays in the preview (#478)', async () => {
  await reload(); await select('beats:raid');
  const r = await page.evaluate(() => {
    const row = id => SceneIndex.rows.find(x => x.id === id), raid = row('beats:raid'), values = { [raid.id]: { 'part.open.gun.0': 'A new opening.', 'part.close.standoff': raid.parts['close.standoff'] } };
    const out = SceneIndex.overridesFrom(SceneIndex.rows, values);
    return {
      kinds: ['beats:raid', 'beats:ambush', 'beats:repel', 'beats:assault'].map(id => [row(id).kind, row(id).noTitle, Object.keys(row(id).parts).length > 10]), dead: row('beats:dead-in-space').kind,
      out: out[raid.id], back: SceneIndex.valuesFrom(out)[raid.id],
      plan: SceneIndex.planImport({ overrides: { 'beats:raid': { title: 'No', parts: { 'open.gun.1': 'Ok.', nope: 'x' } } } }, SceneIndex.rows).items.map(i => i[0] === undefined ? i.ok : i.ok),
    };
  });
  assert.deepEqual(r.kinds, [['data', true, true], ['data', true, true], ['data', true, true], ['data', true, true]]);
  assert.equal(r.dead, 'code', 'the dead-in-space scene has no table to read');
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
  assert.equal(r.tables.length, 13);
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
  assert.equal(await page.locator('#detail textarea[data-path^="part."]').count(), 6, 'a field for every line');
  for (const id of ['people:pax:debt', 'people:pax:contraband', 'people:pax:ill', 'people:pax:curious', 'people:crew:greedy', 'people:crew:brave']) {
    await select(id);
    await page.fill('textarea[data-path="part.text"]', `Typed ${id}.`);
    const f = await play();
    const seen = await f.evaluate(() => JSON.stringify([G.dialog.event.title, G.dialog.event.text, G.dialog.choices.map(c => c.label)]));
    assert.ok(seen.includes(`Typed ${id}.`), `${id} plays the typed line: ${seen.slice(0, 200)}`);
  }
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
  assert.equal(r.title, 'An Order You Do Not Like');
  assert.deepEqual(r.out, { parts: { text: 'A new warning.' } }, 'only what differs');
  assert.deepEqual(r.back, { 'part.text': 'A new warning.' });
  assert.deepEqual(r.bad, [['{nobody}'], ['{last}']], 'a {word} the line has is kept as typed; one it has not is flagged');
  for (const [id, line] of [['scene:sign-on', 'title'], ['scene:warning', 'text'], ['scene:put-ashore', 'text'], ['scene:hand-death', 'text.hurt'], ['scene:captain-lost', 'text'], ['scene:split', 'text'],
    ['scene:walk-off', 'title'], ['scene:used-ship-offer', 'tomas.title'], ['scene:yard-office', 'title'], ['hired:cap-order', 'text'], ['hired:road-scope', 'text']]) {
    await select(id);
    await page.fill(`textarea[data-path="part.${line}"]`, `Typed ${id}.`);
    const f = await play();
    const seen = await f.evaluate(() => JSON.stringify([G.dialog.event.title, G.dialog.event.text, G.dialog.choices.map(c => c.label)]));
    assert.ok(seen.includes(`Typed ${id}.`), `${id} plays the typed line: ${seen.slice(0, 200)}`);
  }
});
