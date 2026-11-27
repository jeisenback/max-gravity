'use strict';

// A journey (tests/journey.js, #1329): a new hired hand's first run played through its steps (js/tutorial.js HAND_TUTORIAL), all through the interface:
// each step names where to go as the screen shows it and marks it (the owner, #1383), the Port entry on the rail in port, the post's key and Comms on the
// burn's key bar, and the hand goes there by those clicks: the plan read and Sail, the first officer heard out, an order at the post, a chat, and the dock.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser } = require('./helpers');
const { screen, waitText, button, answerScenes, runBurn, playUntil } = require('./journey');

after(closeBrowser);

test('journey: the first run played through its steps, each pointed to on the rail or the burn\'s keys', async () => {
  const { page, errors, done } = await open({ title: true, seed: 1 });
  await button(page, 'New game');
  await button(page, /^Start$/);
  await waitText(page, /Signing On/);
  await answerScenes(page);
  await waitText(page, /Sail with the captain/);
  assert.match(await screen(page), /Port page, under Ashore on the rail/, 'the first step names where the plan is');
  const railMark = page.locator('.rail button.tut');
  assert.equal((await railMark.innerText()).trim(), 'Port', 'and the rail marks it');
  await railMark.click();
  await button(page, 'Sail with the captain');
  await page.getByRole('button', { name: 'Run ahead (4)' }).waitFor({ state: 'visible', timeout: 20000 });
  // the walk-through heard out, the gunner's key is marked: press it and give an order
  const keyMark = page.locator('#bkeys button.tut');
  await playUntil(page, async () => (await keyMark.isVisible()) && (await keyMark.getAttribute('data-bst')) === 'weapons', 'the marked Gunnery key');
  assert.equal(await keyMark.getAttribute('aria-label'), 'Gunnery');
  await keyMark.click();
  await page.locator('#bsheet [data-action="postOrder"]:not([disabled])').first().click();
  // then Comms is marked: press it and sit with someone, when a chat is free
  const chat = page.locator('#bsheet [data-action="chatWith"]:not([disabled])');
  await playUntil(page, async () => {
    if (await chat.count()) return true;
    if ((await keyMark.isVisible()) && (await keyMark.getAttribute('data-bst')) === 'comms' && !(await page.locator('#bsheet').isVisible())) await keyMark.click();
    return (await chat.count()) > 0;
  }, 'a chat on the marked Comms key');
  assert.equal(await keyMark.getAttribute('data-bst'), 'comms', 'the Comms key is the one marked');
  await chat.first().click();
  await answerScenes(page);
  await runBurn(page, /DOCKED · (?!EARTH)/i, 180000);
  await waitText(page, /That is the first run/);
  assert.match(await screen(page), /Tutorial complete/i);
  assert.equal((await page.locator('.rail button.tut').innerText()).trim(), 'Port', 'and it points back to Port, where the next plan is');
  assert.deepEqual(errors, []);
  await done();
});
