'use strict';

// The rooms kept as images (#1123, rooms.js roomCached): in the burn view each room's props, couches and seats are drawn into images once and
// copied in after, what moves drawn live between them (roomLive). Every room is kept so in the burn, at the flip, on the couches and at night
// (none reads the clock outside roomLive, which would leave it drawn directly), and the picture is the one drawn directly.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

test('every room is kept as images in the burn, at the flip, on the couches and at night, and looks as it does drawn directly', async () => {
  const { ev, done } = await open();
  const r = await ev(() => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester' }); while (G.dialog) finishEvent();
    G.state.story.next = 1e9; G.state.tutorial = null; uatBurn('Earth', 'mars'); const t = G.transit;
    t.lifeOffered = { before: true, m1: true, m2: true, m3: true, after: true };
    const c = document.querySelector('canvas'), g = c.getContext('2d'), lay = LAYOUTS.freighter, real = roomCached, out = { kept: [], off: [] };
    for (const [view, f, night] of [['burn', 0.3], ['flip', 0.5], ['couches', 0.05], ['night', 0.3, true]]) {
      t.left = t.total * (1 - f); if (night) t.elapsed = SHIP_DAY * 0.75 - 6;
      for (let i = 0; i < 30; i++) update(1 / 60);
      const T = G.time;
      for (const id of ROOMS.map(x => x.id)) {
        const frame = () => { for (let k = 0; k < 3; k++) { G.time = T; G.cam = { y: layoutBox(lay, id).floor - HULL.deck / 2, t: G.time }; drawTransit(innerWidth, innerHeight); } return g.getImageData(0, 0, Math.min(c.width, 980), c.height).data; };
        const A = frame(), e = ROOM_CACHE.get(id);
        if (!e || !e.segs) out.kept.push(`${view}: ${id} ${!e ? 'not drawn' : e.timed ? `reads the clock: ${e.timed}` : 'not kept'}`);
        window.roomCached = (ctx, id, r, s, draw) => draw(ctx, s);
        let B; try { B = frame(); } finally { window.roomCached = real; }
        let n = 0; for (let i = 0; i < A.length; i += 4) if (Math.max(Math.abs(A[i] - B[i]), Math.abs(A[i + 1] - B[i + 1]), Math.abs(A[i + 2] - B[i + 2])) > 24) n++;
        if (n / (A.length / 4) > 0.005) out.off.push(`${view}: ${id} ${(n / (A.length / 4) * 100).toFixed(2)}% of pixels off`);
      }
    }
    return out;
  });
  await done();
  assert.deepEqual(r.kept, [], 'every room kept as images');
  assert.deepEqual(r.off, [], 'and the same picture as drawn directly');
});
