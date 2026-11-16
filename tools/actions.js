'use strict';

// Reads which player actions the game declares and which ones the tests press (tests/actions.test.js, #1327). Pure text
// scans: they take [{ file, text }] and run in plain Node.
//
// Declared: `M.action('name', ...)`, a local wrapper of it (`const act = (name, fn) => M.action(name, ...)`, then
// `act('name', ...)`), and `data-action="name"` in markup. A `data-action="${...}"` cannot be read, so its place is returned
// in `computed` for the check to list by hand.
//
// Pressed: a click on a selector that names `data-action=name` (`page.click`, `page.dblclick`, `locator(...).click`,
// `$(...)` then `.click()`, `querySelector(...).click()` in page code), the rail through `goTo` (tests/helpers.js clicks
// `[data-action=tab]`), and a key that does an action (KEY_ACTIONS). Naming a selector to check it is there, or not, is not
// a press.

// The keys that do what a button does (js/game.js keydown): T takes off, sails with the captain or passes the night,
// by where the hand is; M opens the map.
const KEY_ACTIONS = { KeyT: ['takeoff', 'sail', 'night'], KeyM: ['map'] };
const KEY_NAMES = { t: 'KeyT', T: 'KeyT', KeyT: 'KeyT', m: 'KeyM', M: 'KeyM', KeyM: 'KeyM' };

const NAME = '[A-Za-z][A-Za-z0-9-]*';
const lineOf = (text, index) => text.slice(0, index).split('\n').length;

// A line comment, so a data-action written in one (js/mods.js documents M.action that way) is not read as a button; the
// `//` of a URL in a string, after a colon, is not a comment. Lines are kept, so `computed` still names the right line.
const uncommented = text => text.replace(/(^|[^:'"`\\])\/\/[^\n]*/g, '$1');

function declaredActions(sources) {
  const names = new Set(), computed = [];
  for (const { file, text: raw } of sources) {
    const text = uncommented(raw);
    for (const m of text.matchAll(new RegExp(`M\\.action\\(\\s*'(${NAME})'`, 'g'))) names.add(m[1]);
    for (const w of text.matchAll(new RegExp(`const\\s+(\\w+)\\s*=\\s*\\(\\s*name\\b[^)]*\\)\\s*=>\\s*M\\.action\\(\\s*name\\b`, 'g'))) {
      for (const m of text.matchAll(new RegExp(`\\b${w[1]}\\(\\s*'(${NAME})'\\s*,`, 'g'))) names.add(m[1]);
    }
    for (const m of text.matchAll(new RegExp(`data-action="(${NAME})"`, 'g'))) names.add(m[1]);
    for (const m of text.matchAll(/data-action="\$\{/g)) computed.push({ file, line: lineOf(text, m.index) });
  }
  return { names, computed };
}

// The action names a selector string presses: every `data-action=name`, quoted or not, escaped or not.
const actionsIn = sel => [...sel.matchAll(new RegExp(`data-action=\\\\?["']?(${NAME})`, 'g'))].map(m => m[1]);

function pressedActions(sources) {
  const pressed = new Set();
  const STR = '(`[^`]*`|\'[^\']*\'|"[^"]*")';
  const PRESSES = [
    new RegExp(`\\.(?:click|dblclick|tap)\\(\\s*${STR}`, 'g'),                                        // page.click(sel)
    new RegExp(`\\.(?:locator|\\$)\\(\\s*${STR}\\s*\\)\\)?(?:\\.\\w+\\([^()]*\\))*\\.(?:click|dblclick)\\(`, 'g'),  // locator(sel).click(), (await page.$(sel)).click()
    new RegExp(`querySelector(?:All)?\\(\\s*${STR}\\s*\\)(?:\\[\\d+\\]|\\?)?\\.click\\(\\)`, 'g'),    // in page code
  ];
  for (const { text } of sources) {
    for (const re of PRESSES) for (const m of text.matchAll(re)) actionsIn(m[1]).forEach(a => pressed.add(a));
    if (/\bgoTo\(/.test(text)) pressed.add('tab');
    for (const m of text.matchAll(/KeyboardEvent\(\s*['"]keydown['"]\s*,\s*\{[^}]*code:\s*['"](\w+)['"]/g)) (KEY_ACTIONS[m[1]] || []).forEach(a => pressed.add(a));
    for (const m of text.matchAll(/keyboard\.press\(\s*['"](\w+)['"]/g)) (KEY_ACTIONS[KEY_NAMES[m[1]]] || []).forEach(a => pressed.add(a));
  }
  return pressed;
}

module.exports = { declaredActions, pressedActions, KEY_ACTIONS };
