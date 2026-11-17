'use strict';

// A journey (tests/journey.js, #1329): a new hired hand signs on from the title screen, sails with the captain and arrives where her contract says,
// all through the interface. The planted bug `sail-does-nothing` (tools/mutants.json) must fail it.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser } = require('./helpers');
const { screen, waitText, button, answerScenes, runBurn } = require('./journey');

after(closeBrowser);

test('journey: sign on, sail with the captain, arrive', async () => {
  const { page, errors, done } = await open({ title: true, seed: 1 });
  await button(page, 'New game');
  await button(page, /^Start$/);
  await waitText(page, /Signing On/);
  await answerScenes(page);
  await waitText(page, /Sail with the captain/);
  const port = await screen(page), to = (port.match(/CONTRACT .*? to ([^,\n]+), due/i) || [])[1];
  assert.ok(to, `the port screen names where the contract goes: ${port.slice(0, 400)}`);
  assert.match(port, /DOCKED · EARTH/i, 'signed on at Earth');
  await button(page, 'Sail with the captain');
  await page.getByRole('button', { name: 'Run ahead (4)' }).waitFor({ state: 'visible', timeout: 20000 });  // the burn view is up: its speeds, with the run ahead a port's clock does not have
  await runBurn(page, new RegExp(`DOCKED · (?!EARTH)[\\s\\S]*${to}`, 'i'));
  const there = await screen(page);
  assert.match(there, new RegExp(`DOCKED · `, 'i'));
  assert.ok(there.includes(to), `arrived at ${to}`);
  assert.deepEqual(errors, []);
  await done();
});
