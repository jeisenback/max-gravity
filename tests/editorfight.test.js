'use strict';

// The fights in the editor's preview (#795): the ship fight and the deck fights are played from the tester panel's setups (js/uat.js UAT_FIGHTS), the one the line typed
// needs unless another is picked; the deck's shared lines are one row both deck fights read; the report says what the fight changed since Play; and a moment's versions
// say the day each plays on, and each plays when typed.

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require('playwright');
const { watch, closeBrowser } = require('./helpers');

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
async function play() {
  await page.evaluate(() => { document.querySelector('#pv-report').replaceChildren(); document.querySelector('#pv-effects').replaceChildren(); });
  await page.click('[data-action="play"]');
  await page.waitForFunction(() => document.querySelector('#pv-report').textContent.length > 0, null, { timeout: 30000 });
  const f = page.frames().find(x => /editor-preview/.test(x.url()));
  await f.waitForFunction(() => typeof G !== 'undefined' && G.dialog, null, { timeout: 30000 });
  return f;
}
// What the fight in the frame is: her ship, a consort, the deck and whose, the turret, the day and the gunner's experience.
const fightOf = f => f.evaluate(() => {
  const s = G.dialog.event.fight || {}, st = s.state || {};
  return { kind: st.kind, ship: s.foe && s.foe.shipId, patrol: !!(s.spec && s.spec.kind === 'patrol'), pack: !!s.pack, assault: !!s.assault, torps: st.me ? st.me.torps : 0, pdc: !!(st.me && st.me.pdc),
    day: G.state.day, gunner: (career().skill || {}).gunner || 0, seen: JSON.stringify([G.dialog.event.title, G.dialog.event.read || '', G.dialog.event.text, G.dialog.choices.map(c => c.label)]) };
});
// Clicks a choice in the frame and waits for the report of it.
async function choose(f, i) {
  await page.evaluate(() => document.querySelector('#pv-effects').replaceChildren());
  await f.click(`[data-action="choose"][data-arg="${i}"]`);
  await page.waitForFunction(() => document.querySelector('#pv-effects').textContent.length > 0, null, { timeout: 30000 });
  return page.textContent('#pv-effects');
}

test('a fight row has a picker of the tester panel\'s fights, early and late, and other rows do not (#795)', async () => {
  await reload(); await select('scene:fight');
  const box = page.locator('#pv-fight');
  assert.equal(await box.isVisible(), true, 'the picker shows for the ship fight');
  const options = await page.locator('[data-pv-fight] option').evaluateAll(els => els.map(e => e.value));
  const ids = ['fight-raider', 'fight-pack', 'fight-veteran', 'fight-patrol', 'deck-repel', 'deck-assault'];
  assert.deepEqual(options, ['', ...ids, ...ids.map(id => `late-${id}`)], 'from the line typed, then each setup early and late');
  for (const id of ['beats:repel', 'beats:assault', 'beats:deck']) { await select(id); assert.equal(await box.isVisible(), true, `the picker shows for ${id}`); }
  await select('port-mars-sky');
  assert.equal(await box.isVisible(), false, 'not for a scene that is no fight');
});

test('the ship fight plays the setup the line typed needs: the patrol, the veteran with torpedoes, the pair, the deck, and the opening typed (#795)', async () => {
  await reload(); await select('scene:fight');
  const cases = [
    ['open.gun.1', r => r.patrol && ['cutter', 'destroyer'].includes(r.ship), true],
    ['open.gun.0', r => r.patrol, true],
    ['end.crippled.patrol', r => r.patrol, false],
    ['memory.navy', r => r.patrol, false],
    ['end.broke.gun', r => r.patrol, false],
    ['torp.label', r => r.ship === 'corsair' && r.torps > 0, true],
    ['open.torpedo.1', r => r.ship === 'corsair', true],
    ['log.mine.consort', r => r.pack, false],
    ['open.grapple.0', r => r.ship === 'raider' && !r.pack && !r.patrol, true],
    ['part.hull', r => r.ship === 'raider' && !r.pack && !r.patrol && r.kind === 'ship', false],
    ['deck.feint', r => r.kind === 'deck' && !r.assault, false],  // a veteran's repel: shown on a push, and the first turn is a hold
    ['deck.stand', r => r.kind === 'deck' && !r.assault, true],
    ['deck.hers.0', r => r.kind === 'deck' && r.assault, false],
    ['pdc.fire', r => r.kind === 'ship' && r.pdc, true],
  ];
  for (const [line, ok, shown] of cases) {
    await page.fill(`textarea[data-path="part.${line}"]`, `Typed ${line}.`);
    const f = await play();
    const r = await fightOf(f);
    assert.ok(ok(r), `${line} plays its fight: ${JSON.stringify(r).slice(0, 300)}`);
    if (shown) assert.ok(r.seen.includes(`Typed ${line}.`), `${line} is on the panel: ${r.seen.slice(0, 300)}`);
    await page.fill(`textarea[data-path="part.${line}"]`, '');
  }
  assert.match(await page.textContent('#pv-report'), /fight/i, 'the report names the fight played');
});

test('the writer can pick another fight, early or late, over the one the line needs (#795)', async () => {
  await reload(); await select('scene:fight');
  await page.fill('textarea[data-path="part.open.gun.0"]', 'Typed.');
  await page.selectOption('[data-pv-fight]', 'late-fight-veteran');
  let r = await fightOf(await play());
  assert.equal(r.ship, 'corsair', 'the picked fight, not the patrol the line needs');
  assert.ok(r.day > 200 && r.gunner > 0, `late in the chapter: ${JSON.stringify(r).slice(0, 200)}`);
  await page.selectOption('[data-pv-fight]', 'deck-assault');
  r = await fightOf(await play());
  assert.deepEqual([r.kind, r.assault], ['deck', true], 'boarding her goes onto her deck');
  await page.selectOption('[data-pv-fight]', '');
  r = await fightOf(await play());
  assert.ok(r.patrol && r.day < 200, 'back to the line typed, early');
});

test('the deck fights play on the deck: our deck for the repel, hers for the assault, and their shared lines are one row both read (#795)', async () => {
  await reload();
  const rows = await page.evaluate(() => Object.fromEntries(['beats:repel', 'beats:assault', 'beats:deck'].map(id => { const r = SceneIndex.rows.find(x => x.id === id); return [id, r ? Object.keys(r.parts) : null]; })));
  assert.ok(rows['beats:deck'], 'a row for the lines both deck fights share');
  const shared = k => /^(ability|crew)\./.test(k);
  assert.ok(rows['beats:deck'].length > 10 && rows['beats:deck'].every(shared), 'the abilities and the orders');
  for (const id of ['beats:repel', 'beats:assault']) assert.deepEqual(rows[id].filter(shared), [], `${id} keeps only its own lines`);
  for (const id of ['beats:repel', 'beats:assault']) assert.ok(rows[id].includes('open.0.0') && rows[id].includes('end.last') && rows[id].includes('title.0'), `${id} keeps its own openings, ends and titles`);
  await select('beats:repel');
  let r = await fightOf(await play());
  assert.deepEqual([r.kind, r.assault], ['deck', false], 'the repel is on our deck');
  await select('beats:assault');
  await page.fill('textarea[data-path="part.open.2.0"]', 'Typed her lock.');
  r = await fightOf(await play());
  assert.deepEqual([r.kind, r.assault], ['deck', true], 'the assault is on her deck, at once');
  assert.ok(r.seen.includes('Typed her lock.'), r.seen.slice(0, 200));
  await select('beats:deck');
  await page.fill('textarea[data-path="part.ability.gunner.steady.label"]', 'Typed steady');
  const fr = await play();
  await choose(fr, 1);  // shoot to steady
  r = await fightOf(fr);
  assert.ok(!r.assault && r.seen.includes('Typed steady'), `the repel reads the shared line: ${r.seen.slice(0, 300)}`);
  await page.selectOption('[data-pv-fight]', 'deck-assault');
  const fa = await play();
  await choose(fa, 1);
  r = await fightOf(fa);
  assert.ok(r.assault && r.seen.includes('Typed steady'), `the assault reads the same line: ${r.seen.slice(0, 300)}`);
});

test('the report shows what the fight changed since Play, the armor, the fund, torpedoes, the crew, the hand\'s hurt and experience among it (#795)', async () => {
  await reload(); await select('scene:fight');
  await page.fill('textarea[data-path="part.open.gun.0"]', 'Typed.');
  const f = await play();
  // A navy stop costs standing as it starts; then the fight's own changes, made here so they are known.
  const names = await f.evaluate(() => {
    const st = G.state, [a, b] = st.crew.map(person).filter(p => p && !p.cast);
    st.armor -= 5; hired().fund += 100; st.torpedoes = (st.torpedoes || 0) + 2;
    (st.injured = st.injured || {})[a.id] = true; b.dead = true; st.crew = st.crew.filter(id => id !== b.id);
    career().hurtUntil = st.day + 10; gainSkill('gunner', 2);
    return { a: `${a.first} ${a.last}`, b: `${b.first} ${b.last}` };
  });
  let shown = await choose(f, 0);  // a gun's target: the panel is drawn again
  for (const want of [/standing with Arcology Compact: \S+ to \S+ \(-8\)/, /armor: \d+ to \d+ \(-5\)/, /ship's fund: \S+ to \S+ \(\+100\)/, /torpedoes: \S+ to \S+ \(\+2\)/,
    new RegExp(`${names.a}: fit to hurt`), new RegExp(`${names.b}: fit to dead`), /you: fit to hurt/, /experience at the gunner post: \S+ to \S+ \(\+2\)/]) assert.match(shown, want);
  shown = await choose(f, 0);  // another click: still everything since Play, not only what this one changed
  assert.match(shown, /standing with Arcology Compact: \S+ to \S+ \(-8\)/);
  assert.match(shown, /armor: \d+ to \d+ \(-5\)/);
  assert.match(shown, /since Play/);
});

test('a moment\'s versions say the day each plays on (#795)', async () => {
  await reload(); await select('scene:split');
  const label = p => page.locator(`label[for="f-part.${p}"]`).textContent();
  assert.match(await label('text'), /day 0, 3, 6\.\.\./);
  assert.match(await label('text.1'), /day 1, 4, 7\.\.\./);
  assert.match(await label('text.2'), /day 2, 5, 8\.\.\./);
  assert.doesNotMatch(await label('ask'), /day/, 'a line with no versions has no day');
  await select('family:errand');
  assert.match(await label('earth.text'), /day 0, 3, 6/);
  assert.match(await label('earth.2.text'), /day 2, 5, 8/);
});

test('each version of a moment plays when it is typed: the ship\'s downtime, the hand\'s downtime and the errand ashore (#795)', async () => {
  await reload();
  const pick = async (f, label) => f.evaluate(l => G.dialog.choices.findIndex(c => c.label.includes(l)), label);
  // the drills are an owner's, so the ship's versions a hand can play are the repair's: at the engineer post, with the armor down
  for (const [id, line, button] of [['scene:shiplife', 'repair.result', 'Repair'], ['scene:shiplife', 'repair.result.1', 'Repair'], ['scene:shiplife', 'repair.result.2', 'Repair'],
    ['scene:downtime', 'advice.result', 'advice'], ['scene:downtime', 'advice.result.1', 'advice'], ['scene:downtime', 'advice.result.2', 'advice'],
    ['scene:downtime', 'stories.result.2', 'stories']]) {
    await select(id);
    const shipped = await page.evaluate(([row, k]) => SceneIndex.rows.find(r => r.id === row).parts[k.replace(/result.*/, 'label')], [id, line]);

    await page.fill(`textarea[data-path="part.${line}"]`, `Typed ${line}.`);
    const f = await play();
    const i = await pick(f, shipped || button);
    assert.ok(i >= 0, `${id} offers ${shipped}`);
    await f.click(`[data-action="choose"][data-arg="${i}"]`);
    await f.waitForFunction(() => document.querySelector('#event-result') && document.querySelector('#event-result').textContent.length > 0);
    const seen = await f.textContent('#event-result');
    assert.ok(seen.includes(`Typed ${line}.`), `${id} ${line} plays: ${seen.slice(0, 160)}`);
    await page.fill(`textarea[data-path="part.${line}"]`, '');
  }
  await select('family:errand');
  for (const line of ['earth.text', 'earth.1.text', 'earth.2.text', 'mars.2.text', 'belt.1.text']) {
    await page.fill(`textarea[data-path="part.${line}"]`, `Typed ${line}.`);
    const f = await play();
    const seen = await f.evaluate(() => G.dialog.event.text);
    assert.ok(seen.includes(`Typed ${line}.`), `family:errand ${line} plays: ${seen.slice(0, 160)}`);
  }
});

test('a deck line of a post plays with the hand at that post, and a crew gunner\'s order with a gunner aboard to give it to (#795)', async () => {
  await reload(); await select('beats:deck');
  await page.fill('textarea[data-path="part.ability.engineer.steady.label"]', 'Typed engineer steady');
  let f = await play();
  assert.equal(await f.evaluate(() => hired().post), 'engineer', 'the hand is at the ability\'s post');
  await choose(f, 1);  // shoot to the post's steady ability
  assert.ok((await fightOf(f)).seen.includes('Typed engineer steady'), 'the engineer\'s ability is on the panel');
  await page.fill('textarea[data-path="part.ability.engineer.steady.label"]', '');
  await page.fill('textarea[data-path="part.crew.gunner.cover.label"]', 'typed gunner order');  // the first of the orders is the cover one, the rest the steady one
  await page.fill('textarea[data-path="part.crew.gunner.steady.label"]', 'typed gunner order');
  f = await play();
  assert.notEqual(await f.evaluate(() => hired().post), 'gunner', 'the hand is not the gunner, so a crew gunner is aboard');
  assert.ok(await f.evaluate(() => repelOrders(G.dialog.event.fight, false).some(o => o.sheet.post === 'gunner')), 'a crew gunner can be ordered');
  let seen = '';
  for (let n = 0; n < 4 && !seen.includes('typed gunner order'); n++) { await choose(f, 2); seen = (await fightOf(f)).seen; }
  assert.ok(seen.includes('typed gunner order'), `the order to the gunner is offered: ${seen.slice(0, 300)}`);
});

test('the veteran\'s torpedoes are her loadout, not a change the fight made (#795)', async () => {
  await reload(); await select('scene:fight');
  await page.fill('textarea[data-path="part.torp.label"]', 'Typed torpedo {left}: {aim}');
  const f = await play();
  assert.equal((await fightOf(f)).ship, 'corsair');
  const shown = await choose(f, 0);
  assert.doesNotMatch(shown, /torpedoes/, shown);
  assert.doesNotMatch(shown, /raided/, 'the captain remembering a raid is not reported');
});

test('lines on the consort and the first volleys get a fight that plays them, or say why not (#795)', async () => {
  await reload(); await select('scene:fight');
  await page.fill('textarea[data-path="part.log.torp.consort"]', 'Typed.');
  let r = await fightOf(await play());
  assert.ok(r.pack && r.torps > 0, `the pair, with torpedoes aboard: ${JSON.stringify(r).slice(0, 200)}`);
  await page.fill('textarea[data-path="part.log.torp.consort"]', '');
  await page.fill('textarea[data-path="part.first.hers"]', 'She fires first, typed: {hits}.');
  r = await fightOf(await play());
  assert.ok(r.pack && r.seen.includes('She fires first, typed'), `the pair starts a volley behind: ${r.seen.slice(0, 300)}`);
  await page.fill('textarea[data-path="part.first.hers"]', '');
  await page.fill('textarea[data-path="part.first.ours"]', 'Typed ours.');
  await play();
  assert.match(await page.textContent('#pv-report'), /cannot be previewed here/);
});

test('a fight picked for one row is not carried to another (#795)', async () => {
  await reload(); await select('scene:fight');
  await page.selectOption('[data-pv-fight]', 'late-fight-veteran');
  await select('beats:repel');
  assert.equal(await page.inputValue('[data-pv-fight]'), '', 'the picker is back to the line typed');
  const r = await fightOf(await play());
  assert.deepEqual([r.kind, r.assault], ['deck', false]);
});

test('words kept for the deck fights\' abilities and orders under the old rows move to the shared row, from the browser and from a file (#795)', async () => {
  await reload(); await select('beats:repel');
  await page.fill('textarea[data-path="part.title.0"]', 'The Lock, typed');
  await page.evaluate(() => {
    const k = 'maxGravity.editor.v1', s = JSON.parse(localStorage.getItem(k));
    Object.assign(s.values['beats:repel'], { 'part.ability.gunner.steady.label': 'Old repel words' });
    s.values['beats:assault'] = { 'part.ability.gunner.steady.label': 'Other assault words', 'part.crew.pilot.cover.label': 'Old assault order' };
    localStorage.setItem(k, JSON.stringify(s));
  });
  await page.reload(); await page.waitForFunction(() => SceneIndex.rows, null, { timeout: 30000 });
  const notice = await page.textContent('#notice');
  assert.match(notice, /Abilities and Orders on the Deck/);
  assert.match(notice, /ability\.gunner\.steady\.label\), the repel's were kept/);
  await page.click('[data-action="cancel-notice"]');
  await select('beats:deck');
  assert.equal(await page.inputValue('textarea[data-path="part.ability.gunner.steady.label"]'), 'Old repel words');
  assert.equal(await page.inputValue('textarea[data-path="part.crew.pilot.cover.label"]'), 'Old assault order');
  const out = JSON.parse((await page.evaluate(() => SceneIndex.exportText())).match(/const SCENE_OVERRIDES = ([\s\S]*?);\n/)[1]);
  assert.deepEqual(out, { 'beats:repel': { parts: { 'title.0': 'The Lock, typed' } }, 'beats:deck': { parts: { 'ability.gunner.steady.label': 'Old repel words', 'crew.pilot.cover.label': 'Old assault order' } } });
  const plan = await page.evaluate(() => {
    const p = SceneIndex.planImport({ overrides: { 'beats:repel': { parts: { 'ability.gunner.steady.label': 'A' } }, 'beats:assault': { parts: { 'ability.gunner.steady.label': 'B', 'open.2.0': 'C' } } } }, SceneIndex.rows);
    return { acc: JSON.parse(JSON.stringify(p.accepted.overrides)), refused: p.items.filter(i => !i.ok).map(i => i.text) };
  });
  assert.deepEqual(plan.acc, { 'beats:assault': { parts: { 'open.2.0': 'C' } }, 'beats:deck': { parts: { 'ability.gunner.steady.label': 'A' } } });
  assert.equal(plan.refused.length, 1);
  assert.match(plan.refused[0], /repel's words are kept/);
});

test('a gunner move plays in the preview by the line typed: its teacher\'s button, and the words when it is taken', async () => {
  await reload(); await select('scene:gunner-moves');
  for (const [id, who] of [['vent', 'Tomas'], ['lead', 'Ines'], ['split', 'Cato']]) {
    await page.fill(`textarea[data-path="part.${id}.text"]`, `Typed ${id}.text, {first}.`);
    const f = await play();
    const i = await f.evaluate(w => G.dialog.choices.findIndex(c => c.label.includes(w) && (!c.can || c.can())), who);
    assert.ok(i >= 0, `${id}: ${who}'s button is on the menu`);
    await f.click(`[data-action="choose"][data-arg="${i}"]`);
    await f.waitForFunction(() => document.querySelector('#event-result') && document.querySelector('#event-result').textContent.length > 0);
    assert.ok((await f.textContent('#event-result')).includes(`Typed ${id}.text, ${who}.`), `${id} plays its words`);
    assert.match(await page.textContent('#pv-report'), new RegExp(`so ${id} is offered`));
    await page.fill(`textarea[data-path="part.${id}.text"]`, '');
  }
});
