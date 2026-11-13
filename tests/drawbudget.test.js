'use strict';

// The burn view's budget of canvas calls a frame (#1120). The view grew choppy a prop at a time (#1117): every part drawn adds calls each frame,
// at a microsecond or more apiece. One frame is counted (every call on the game's canvas, paths included) after a warm-up frame that builds the
// caches, in the views that cost most, and each must stay under its ceiling. The ceilings come down as the performance pass lands
// (#1121, #1122, #1123); the aim is about 1,000.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

const CEILING = { move: 7950, flip: 8900, couch: 8700, night: 8200 };  // about 3% over the count when it was set (#1120)

test('a burn frame stays within its budget of canvas calls, in the burn, at the flip, on the couches and at night', async () => {
  const { ev, done } = await open();
  const r = await ev(() => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester' }); while (G.dialog) finishEvent();
    G.state.story.next = 1e9; G.state.tutorial = null; uatBurn('Earth', 'mars'); const t = G.transit;
    t.lifeOffered = { before: true, m1: true, m2: true, m3: true, after: true };
    const c = document.querySelector('canvas'), P = CanvasRenderingContext2D.prototype;
    const names = Object.getOwnPropertyNames(P).filter(k => k !== 'constructor' && typeof Object.getOwnPropertyDescriptor(P, k).value === 'function');
    const count = () => {
      const real = {}; let n = 0;
      for (const k of names) { real[k] = P[k]; P[k] = function (...a) { if (this.canvas === c) n++; return real[k].apply(this, a); }; }
      try { render(); } finally { Object.assign(P, real); }
      return n;
    };
    const at = (f, elapsed) => { t.left = t.total * (1 - f); if (elapsed !== undefined) t.elapsed = elapsed; for (let i = 0; i < 30; i++) update(1 / 60); render(); return { phase: phase(), dark: isDark(), calls: count() }; };
    return { move: at(0.3), flip: at(0.5), couch: at(0.05), night: at(0.3, SHIP_DAY * 0.75 - 6) };
  });
  await done();
  assert.equal(r.move.phase, 'move'); assert.equal(r.flip.phase, 'float'); assert.equal(r.couch.phase, 'couch'); assert.equal(r.night.dark, true);
  const counts = Object.keys(CEILING).map(k => `${k} ${r[k].calls}/${CEILING[k]}`).join(', ');
  for (const k of Object.keys(CEILING)) assert.ok(r[k].calls <= CEILING[k], `${k}: ${r[k].calls} canvas calls a frame, over its ceiling of ${CEILING[k]} (${counts})`);
});
