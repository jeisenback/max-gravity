'use strict';

// Desktop only (#937): the game is played with a mouse and keyboard on a desktop-sized window. A window narrower than the game's minimum (1000px)
// shows a notice instead of a squeezed game, and there is no touch input; the map's buttons are the mouse's.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

test('a narrow window says the game needs a larger screen, and a desktop window shows the game', async () => {
  const narrow = await open({ viewport: { width: 800, height: 700 } });
  const n = await narrow.ev(() => ({ notice: (() => { const el = document.getElementById('narrow'); return !!el && getComputedStyle(el).display !== 'none'; })(), text: (document.getElementById('narrow') || {}).textContent || '', game: getComputedStyle(document.getElementById('game')).display !== 'none' }));
  await narrow.done();
  assert.ok(n.notice, 'the notice shows'); assert.match(n.text, /larger screen/i); assert.match(n.text, /mouse and keyboard/i);
  assert.equal(n.game, false, 'and the game does not, squeezed');
  const wide = await open({ viewport: { width: 1280, height: 800 } });
  const w = await wide.ev(() => ({ notice: getComputedStyle(document.getElementById('narrow')).display !== 'none', game: getComputedStyle(document.getElementById('game')).display !== 'none' }));
  await wide.done();
  assert.deepEqual(w, { notice: false, game: true });
});

test('there is no touch input, and the map\'s buttons open, zoom and close the map with the mouse', async () => {
  const { ev, page, done } = await open({ scope: 'earth-hired' });
  const r = await ev(() => ({ touch: typeof window.Touch === 'object' && 'stick' in window.Touch, stick: !!document.getElementById('stick'), bar: !!document.getElementById('touch') }));
  assert.deepEqual(r, { touch: false, stick: false, bar: false });
  await ev(() => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester' }); while (G.dialog) finishEvent();
    const st = G.state; st.tutorial = null; sail(); while (G.dialog) finishEvent(); tryBurn(); enterTransit(); G.transit.times = []; G.transit.event = null; G.dialog = null;
  });
  await page.waitForFunction(() => !document.getElementById('tmap').hidden);
  await page.click('#tmap');
  assert.equal(await ev(() => G.mode), 'map', 'System map opens the map');
  await page.waitForFunction(() => !document.getElementById('tclose').hidden);
  const before = await ev(() => G.mapZoom);
  await page.click('#tzoomin');
  assert.notEqual(await ev(() => G.mapZoom), before, 'the + button zooms');
  await page.click('#tclose');
  assert.equal(await ev(() => G.mode), 'transit', 'Close map closes it');
  await done();
});
