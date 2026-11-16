'use strict';

// Every player action is pressed by a test, or exempt with a reason (#1327). A player action is a button the game declares
// (`M.action(name, ...)` or `data-action="name"` in js/), and a press is a test clicking it or sending the key that does it.
// A test that calls the game's function instead (through `ev`) does not press the button: in the review behind #1326 a
// planted bug that made "Sail with the captain" do nothing was caught by one test, by accident.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { declaredActions, pressedActions } = require('../tools/actions');

// ---------- the scanner itself ----------

test('an M.action and a data-action are both declared', () => {
  const d = declaredActions([{ file: 'js/a.js', text: "M.action('sail', f); `<button data-action=\"night\">`" }]);
  assert.deepEqual([...d.names].sort(), ['night', 'sail']);
});

test('a computed data-action is reported, not skipped', () => {
  const d = declaredActions([{ file: 'js/a.js', text: 'x\n`<button data-action="${a}">`' }]);
  assert.deepEqual(d.computed, [{ file: 'js/a.js', line: 2 }]);
  assert.equal(d.names.size, 0);
});

test('a data-action written in a comment is not declared', () => {
  const d = declaredActions([{ file: 'js/a.js', text: '//   M.action(name, fn)      handle a port-screen button with data-action="name"\nconst u = "https://x"; // see data-action="other"' }]);
  assert.equal(d.names.size, 0);
});

test('a click or a key press on a data-action selector counts; naming it alone does not', () => {
  const p = pressedActions([{ file: 't.js', text: "await page.click('[data-action=sail]'); assert.equal(await page.$('[data-action=refuel]'), null);" }]);
  assert.ok(p.has('sail'));
  assert.ok(!p.has('refuel'));
});

test('a press in page code, through a helper, or on a quoted selector with an argument counts', () => {
  const p = pressedActions([{ file: 't.js', text: [
    "await ev(() => document.querySelector('[data-action=\"vent\"]').click());",
    "await page.click(`[data-action=\"choose\"][data-arg=\"${n}\"]`);",
    "await page.locator('[data-action=map]').click();",
    "await (await page.$('[data-action=repair]')).click();",
    "await goTo(page, 'crew');",
  ].join('\n') }]);
  assert.deepEqual(['choose', 'map', 'repair', 'tab', 'vent'].filter(a => p.has(a)), ['choose', 'map', 'repair', 'tab', 'vent']);
});

test('a T key press counts for takeoff, sail and night', () => {
  for (const text of ["window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyT' }));", "await page.keyboard.press('t');"]) {
    const p = pressedActions([{ file: 't.js', text }]);
    assert.deepEqual(['night', 'sail', 'takeoff'].filter(a => p.has(a)), ['night', 'sail', 'takeoff'], text);
  }
});

// ---------- the game and the suite ----------

const fs = require('node:fs');
const path = require('node:path');
const { KEY_ACTIONS } = require('../tools/actions');
const ROOT = path.join(__dirname, '..');
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : e.name.endsWith('.js') ? [path.join(d, e.name)] : []);
const read = f => ({ file: path.relative(ROOT, f).split(path.sep).join('/'), text: fs.readFileSync(f, 'utf8') });

// A data-action written as `${...}`: each file's count of such sites, and the names they can take.
const COMPUTED = {
  'js/ui.js': { sites: 1, names: ['accept', 'abort'] },                         // missionList: the board's offers and the active missions
  'js/menu.js': { sites: 1, names: ['menuPost', 'menuBefore', 'menuKnown'] },   // papersForm: the post, and the two questions about the life before
  'js/community.js': { sites: 1, names: ['modRemove', 'modAdd'] },             // a community mod's Load or Remove
};

// Actions no test need press, each with a reason a reader can check in the code.
const BOTH_BARRED = 'barred for the hand (OWNER_ACTIONS) and for the co-op (COOP_BARRED) alike, js/role.js';
const COMPANY = 'on the company page, which neither the hand nor the co-op may open (OWNER_TABS, mayTab in js/role.js)';
const EXEMPT = {
  cbuy: BOTH_BARRED, interviewHire: BOTH_BARRED, dismiss: BOTH_BARRED,
  cescort: COMPANY, cpark: COMPANY, cpick: COMPANY, crelieve: COMPANY, croute: COMPANY, csell: COMPANY, ssell: COMPANY,
  sbuy: "the stake offer on the port page, hidden in the shipped build (scopeOff('owner'), js/ui.js stakeOffer)",
  sideWork: "the bar's side work is off in the shipped build: barWorkHtml returns nothing under scopeOff('barwork'), js/barwork.js",
};

// Actions a test should press and none does yet, with where the button is. This list only shrinks (#1327): pressing one in a
// test, and asserting what the press visibly does, takes it off.
const PENDING = {
  askCaptain: 'hired.js', awayGo: 'awayjobs.js', burnFromSite: 'salvage.js',
  chatWith: 'comms.js', combatMode: 'bridge.js', commsQuiet: 'comms.js', cutWreck: 'salvage.js', dayAshore: 'dayashore.js', goDown: 'daydown.js',
  interview: 'interview.js', interviewAsk: 'interview.js', load: 'ui.js, the death screen',
  modRemove: 'community.js', newgame: 'ui.js, the death screen', opSupply: 'outpost.js', pick: 'hired.js and picks.js, the post ladder',
  pitchJob: 'awayjobs.js', programRemove: 'programs.js', programSlot: 'programs.js',
  scenarioCancel: 'community.js', scenarioPlay: 'community.js', spareFit: 'parts.js', spareSell: 'parts.js',
  stationBuy: 'parts.js', stationFit: 'parts.js', suggestRun: 'suggest.js', swapPost: 'hired.js', takeContract: 'ownerboard.js',
  takeJob: 'jobs.js', takeSalvageJob: 'salvage.js',
};

const declared = declaredActions(walk(path.join(ROOT, 'js')).map(read));
for (const c of Object.values(COMPUTED)) c.names.forEach(n => declared.names.add(n));
const pressed = pressedActions(fs.readdirSync(__dirname).filter(f => f.endsWith('.js') && f !== 'actions.test.js').map(f => read(path.join(__dirname, f))));

test('every player action is pressed by a test, or exempt with a reason', () => {
  const missing = [...declared.names].filter(a => !pressed.has(a) && !(a in EXEMPT) && !(a in PENDING)).sort();
  assert.deepEqual(missing, [], 'press each in a test (and assert what it does), or add it to EXEMPT with a reason a reader can check');
});

test('PENDING only shrinks: an action a test now presses is taken off it', () => {
  assert.deepEqual(Object.keys(PENDING).filter(a => pressed.has(a)).sort(), []);
});

test('every EXEMPT and PENDING name is still an action the game declares', () => {
  assert.deepEqual([...Object.keys(EXEMPT), ...Object.keys(PENDING)].filter(a => !declared.names.has(a)).sort(), []);
});

test('every computed data-action site is listed with the names it can take', () => {
  const counts = {};
  for (const c of declared.computed) counts[c.file] = (counts[c.file] || 0) + 1;
  assert.deepEqual(counts, Object.fromEntries(Object.entries(COMPUTED).map(([f, c]) => [f, c.sites])),
    `a new data-action="\${...}" goes in COMPUTED with the names it can take: ${declared.computed.map(c => `${c.file}:${c.line}`).join(', ')}`);
});

test('every key the check counts as a press still does something in the game', () => {
  const game = fs.readFileSync(path.join(ROOT, 'js', 'game.js'), 'utf8');
  for (const code of Object.keys(KEY_ACTIONS)) assert.match(game, new RegExp(`e\\.code === '${code}'`), `${code} is in KEY_ACTIONS (tools/actions.js) but js/game.js no longer handles it`);
});
