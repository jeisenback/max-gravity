'use strict';

// The journey tests' helper (#1329, part of #1326): a journey (tests/journey-*.test.js) plays the game the way a player does, through what is on screen.
// Setup may use ev() before the first action; after it, only clicks and keys, and assertions on the screen's text (tests/journey-rules.test.js checks this).
// Nothing here waits a fixed time: each wait is on visible text or a button that can be pressed.

// The visible text of the page: the shell, the scene dialog and whatever else is drawn as text (the burn view's canvas is not).
const screen = page => page.evaluate(() => document.body.innerText);

// Waits until the screen's text matches `re`, or fails with what the screen said instead.
async function waitText(page, re, ms = 30000) {
  try {
    await page.waitForFunction(([src, flags]) => new RegExp(src, flags).test(document.body.innerText), [re.source, re.flags], { timeout: ms, polling: 100 });
  } catch (e) {
    throw new Error(`waited ${ms} ms for ${re} on screen; it shows:\n${(await screen(page)).slice(0, 1500)}`);
  }
}

// The names of the buttons that can be pressed now, for a failure that says what was there.
const pressable = root => root.getByRole('button', { disabled: false }).filter({ visible: true }).allInnerTexts();

// Presses the button whose visible name matches `label` (a part of it, or a RegExp) and can be pressed; fails naming the label and what could be.
async function press(root, label, where) {
  const b = root.getByRole('button', { name: label, disabled: false }).filter({ visible: true });
  if (!(await b.count())) throw new Error(`no ${where} to press named ${label}; there are: ${(await pressable(root)).map(t => t.replace(/\s+/g, ' ').trim()).join(' | ')}`);
  await b.first().click();
}
const button = (page, label) => press(page, label, 'button');
// The same, among an open scene's choices (and its Continue), in the dialog.
const choose = (page, label) => press(page.locator('#panel'), label, 'choice');

// The scene dialog's buttons a player can press now (its choices, or Continue after a result).
const sceneButtons = page => page.locator('#panel').getByRole('button', { disabled: false }).filter({ visible: true });
const sceneOpen = page => page.evaluate(() => [...document.querySelectorAll('#panel [data-action=choose], #panel [data-action=continue], #panel [data-action=radarPlay], #panel [data-action=planFightGo]')].some(b => b.offsetParent && !b.disabled));

// The ship fight on the radar (js/radarui.js, #1368), as a player plays it: Play, and Play again each time it pauses itself, until the radar gives way to
// the fight's end. Its Play is not a scene's choice, so the scene helpers leave it to this. Returns the screen's text at each press, for what it showed.
const radarOpen = page => page.locator('#panel [data-action=radarPlay]').isVisible();
async function playRadar(page, ms = 90000) {
  const end = Date.now() + ms, seen = [];
  while (await radarOpen(page)) {
    if (Date.now() > end) throw new Error(`the radar fight did not end in ${ms} ms; the screen shows:\n${(await screen(page)).slice(0, 1500)}`);
    const play = page.locator('#panel [data-action=radarPlay]');
    seen.push(await screen(page));
    if ((await play.innerText()).trim() === 'Play') await play.click();
    await page.waitForFunction(() => { const b = document.querySelector('#panel [data-action=radarPlay]'); return !b || !b.offsetParent || b.textContent.trim() === 'Play'; }, null, { timeout: Math.max(1, end - Date.now()), polling: 100 }).catch(() => {});
  }
  return seen;
}

// Answers whatever scenes are open until none is: a fight on the radar played to its end (playRadar); a panel's choice that ends its turn (marked
// primary: Fire, the deck plan's Fight) when it has one, else the first choice a player can take that is not a pick within a row (a gun's target, where to stand),
// which would leave the scene as it is.
async function answerScenes(page, most = 60) {
  for (let i = 0; i < most && (await sceneOpen(page)); i++) {
    if (await radarOpen(page)) { await playRadar(page); continue; }
    const primary = page.locator('#panel button.primary:not([disabled])').filter({ visible: true });
    await ((await primary.count()) ? primary.first() : page.locator('#panel button:not([disabled]):not([aria-pressed])').filter({ visible: true }).first()).click();
  }
}

// Waits in the page until the screen matches, a scene can be answered, or (with `ahead`) the burn's run-ahead button is up. One function, written out,
// since the game's Content Security Policy has no eval.
const burnWait = (page, until, ahead, ms) => page.waitForFunction(([src, flags, ahead]) => new RegExp(src, flags).test(document.body.innerText)
  || [...document.querySelectorAll('#panel [data-action=choose], #panel [data-action=continue], #panel [data-action=radarPlay], #panel [data-action=planFightGo]')].some(b => b.offsetParent && !b.disabled)  // a fight on the radar, or on the deck plan, too
  || (ahead && !!(document.querySelector('#bspeed [title="Run ahead (4)"]') || {}).offsetParent), [until.source, until.flags, ahead], { timeout: Math.max(1, ms), polling: 100 }).catch(() => {});

// Plays a burn to its end the way a player hurries one: answers each scene, and once the burn's run-ahead button is up (the keys are live in a burn
// only; a port's clock has the other speeds but not this one) presses 4, until the screen matches `until`. A scene that opens ends a run ahead
// (burnspeed.js), so it is pressed again after each.
async function runBurn(page, until, ms = 90000) {
  const end = Date.now() + ms;
  while (!until.test(await screen(page))) {
    if (Date.now() > end) throw new Error(`the burn did not reach ${until} in ${ms} ms; the screen shows:\n${(await screen(page)).slice(0, 1500)}`);
    if (await sceneOpen(page)) { await answerScenes(page); continue; }
    if (!(await page.getByRole('button', { name: 'Run ahead (4)' }).isVisible())) { await burnWait(page, until, true, end - Date.now()); continue; }
    await page.keyboard.press('Digit4');
    await burnWait(page, until, false, end - Date.now());
  }
}

// Plays a burn the way runBurn does until `ready()` is true: answers each scene, and presses 4 to run ahead while nothing else can happen. `ready` may act
// (open a sheet) before it says; it is asked again after each step. For a step of the burn that is not its end: an order to give, a chat to sit for (#1383).
async function playUntil(page, ready, what, ms = 120000) {
  const end = Date.now() + ms;
  while (!(await ready())) {
    if (Date.now() > end) throw new Error(`the burn never offered ${what} in ${ms} ms; the screen shows:\n${(await screen(page)).slice(0, 1500)}`);
    if (await sceneOpen(page)) { await answerScenes(page, 1); continue; }
    if (await page.getByRole('button', { name: 'Run ahead (4)' }).isVisible()) await page.keyboard.press('Digit4');
    await burnWait(page, /$^/, false, Math.min(5000, end - Date.now()));
  }
}

module.exports = { screen, waitText, button, choose, answerScenes, playRadar, runBurn, playUntil };
