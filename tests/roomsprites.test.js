'use strict';

// The rooms' part sprites (#1117): in the burn view each prop part (rooms.js roomPart) is drawn once onto a sprite and copied in after, so a
// frame makes far fewer canvas calls, and the picture is the one drawn part by part.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

test('a burn frame copies its rooms\' parts as sprites: far fewer canvas calls, and the same picture as drawn part by part', async () => {
  const { ev, done } = await open();
  const r = await ev(() => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester' }); while (G.dialog) finishEvent();
    G.state.story.next = 1e9; G.state.tutorial = null; uatBurn('Earth', 'mars'); const t = G.transit; t.left = t.total * 0.7;
    t.lifeOffered = { before: true, m1: true, m2: true, m3: true, after: true };
    const c = document.querySelector('canvas'), T = G.time, P = CanvasRenderingContext2D.prototype, names = ['fill', 'stroke', 'fillRect', 'save', 'clip', 'drawImage'];
    const frame = () => { G.time = T; G.cam = null; render(); };
    const counted = () => { const real = {}; let n = 0; for (const k of names) { real[k] = P[k]; P[k] = function (...a) { if (this.canvas === c) n++; return real[k].apply(this, a); }; } try { frame(); } finally { Object.assign(P, real); } return n; };
    const pixels = () => { frame(); return c.getContext('2d').getImageData(0, 0, c.width, c.height).data; };
    frame(); const sprites = counted(), A = pixels(), real = roomSprite;
    window.roomSprite = () => false;
    let direct, B; try { direct = counted(); B = pixels(); } finally { window.roomSprite = real; }
    let off = 0; for (let i = 0; i < A.length; i += 4) if (Math.max(Math.abs(A[i] - B[i]), Math.abs(A[i + 1] - B[i + 1]), Math.abs(A[i + 2] - B[i + 2])) > 24) off++;
    return { sprites, direct, off: off / (A.length / 4), cached: ROOM_SPRITE_CACHE.size };
  });
  await done();
  assert.ok(r.cached > 100, `the parts are kept as sprites (${r.cached})`);
  assert.ok(r.sprites < r.direct * 0.6, `far fewer calls with the sprites (${r.sprites} against ${r.direct})`);
  assert.ok(r.off < 0.005, `the same picture: ${(r.off * 100).toFixed(2)}% of pixels off by more than a tenth`);
});
