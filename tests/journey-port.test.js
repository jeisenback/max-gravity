'use strict';

// A journey (tests/journey.js, #1329): a raider's fight on a burn, played on the radar to its end, the burn run on to port, and then the
// hull on the ship's page and the savings on the character page read from the screen; the page reloaded and the game continued from the title menu,
// and both read the same. The planted bug `never-saves` (tools/mutants.json) must fail it.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser } = require('./helpers');
const { screen, waitText, button, answerScenes, playRadar, runBurn } = require('./journey');

after(closeBrowser);

// An ordinary hired game on the captain's burn to Pallas (the route set as Sail sets it, so her pilot docks her on arrival: autopilot.js), and a
// raider's fight open on it.
const raider = () => {
  startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester' }); while (G.dialog) finishEvent();
  const st = G.state; st.tutorial = null; st.story.next = 1e9; hired().raidTold = true;
  uatBurn('Ceres Station', 'pallas'); G.transit.times = []; G.transit.event = null; G.dialog = null; st.route = { ...(st.route || {}), go: true };
  G.nextEvent = null; startShipFight({ kind: 'pirate', gov: 'Arcology Pact', shipId: 'raider' }, false); const e = G.nextEvent; G.nextEvent = null; openEvent(e);
};
const read = (text, re, what) => { const m = text.match(re); assert.ok(m, `${what} on screen: ${text.slice(0, 600)}`); return m[1]; };

// The hull on the Bridge page and the savings on the character page, as the screen shows them.
async function figures(page) {
  await button(page, /^Bridge$/);
  const hull = read(await screen(page), /\bHULL\s+(\d+%)/i, 'the hull');
  await button(page, /^Crew$/);
  await button(page, /^You$/);
  await waitText(page, /\bSavings\b/);
  const savings = read(await screen(page), /\bSavings\s+([\d,]+ cr)/, 'the savings');
  return { hull, savings };
}

test('journey: back in port, the fight\'s cost and the pay on screen, and a reload keeps them', async () => {
  const { page, ev, errors, done } = await open({ title: true, seed: 1 });
  await ev(raider);
  await playRadar(page);
  assert.doesNotMatch(await screen(page), /Cycle \d+, \d+ s/, 'the fight closed');
  await answerScenes(page);
  await runBurn(page, /DOCKED · PALLAS/i, 180000);  // the burn and the autopilot's docking in real frames, after a fight on the radar: past 90 s on a slow CI runner (#1384)
  await answerScenes(page);
  const before = await figures(page);
  await page.reload();
  await button(page, /^Continue/);
  await waitText(page, /· PALLAS/i);  // the save is the one made as she docked, so the landing's scenes may be open again over it ("ABOARD · PALLAS ...")
  await answerScenes(page);
  await waitText(page, /DOCKED · PALLAS/i);
  const after = await figures(page);
  assert.deepEqual(after, before, 'the save kept the hull and the savings');
  assert.deepEqual(errors, []);
  await done();
});
