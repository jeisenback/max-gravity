'use strict';

// The galley's screen (#1035): on an arm under the left wall cupboard, over the mess table's end, on through supper and the handover when the feeds
// are watched, its cool light on the table under it (docs/bible/look.md, rules 4, 5 and 10); off, dark glass.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

test('the screen is on through supper and the handover, off on a shift, at a meal and at night', async () => {
  const { ev, done } = await open();
  const r = await ev(() => Object.fromEntries(['breakfast', 'shift', 'meal', 'supper', 'handover', 'night', 'wake'].map(b => [b, galleyScreenOn(b)])));
  await done();
  assert.deepEqual(r, { breakfast: false, shift: false, meal: false, supper: true, handover: true, night: false, wake: false });
});

test('the galley draws its screen, on at supper and off on a shift, under the left cupboard and clear of the room\'s name and the thrust sign', async () => {
  const { ev, done } = await open();
  const r = await ev(() => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester' }); while (G.dialog) finishEvent();
    G.state.story.next = 1e9; G.state.tutorial = null; uatBurn('Earth', 'mars'); const t = G.transit; t.left = t.total * 0.7;
    t.lifeOffered = { before: true, m1: true, m2: true, m3: true, after: true }; setBurnSpeed(0);
    const you = shipPeople().find(q => q.role === 'you'), g = roomAt('galley'); Object.assign(you, { room: 'galley', dk: g.deck, tdk: g.deck, x: g.mid, tx: null });
    const calls = [], real = window.roomGalleyScreen;
    window.roomGalleyScreen = (ctx, x, y, on, ...a) => { const m = ctx.getTransform(), p = m.transformPoint(new DOMPoint(x, y)); calls.push({ on, sx: p.x, sy: p.y }); return real(ctx, x, y, on, ...a); };
    try {
      const at = block => { let d = 0; t.elapsed = 0; while (shipDay(t.elapsed).block !== block && d++ < 400) t.elapsed += 0.5; calls.length = 0; render(); return calls.slice(); };
      const supper = at('supper'), shift = at('shift'), box = G.cutRooms.find(x => x.id === 'galley');
      return { supper, shift, box };
    } finally { window.roomGalleyScreen = real; }
  });
  await done();
  assert.equal(r.supper.length, 1, 'drawn once'); assert.equal(r.supper[0].on, true, 'on at supper');
  assert.equal(r.shift.length, 1); assert.equal(r.shift[0].on, false, 'off on a shift');
  const s = r.supper[0], b = r.box;
  assert.ok(s.sx > b.x + b.w * 0.2 && s.sx < b.x + b.w * 0.45, `in the left half of the galley, under the cupboard (${s.sx} in ${b.x}..${b.x + b.w})`);
  assert.ok(s.sy > b.y + b.h * 0.25 && s.sy < b.y + b.h * 0.75, `at the wall's middle height, clear of the name above (${s.sy} in ${b.y}..${b.y + b.h})`);
});
