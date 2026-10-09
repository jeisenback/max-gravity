'use strict';

// The painted world (docs/superpowers/specs/2026-10-09-painted-world-design.md): the body painter draws on any canvas
// with any sun, and the panels are glass lit from the sun's side.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

test('the body painter draws on a second canvas, with its own sun, and caches by size', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  const r = await ev(() => {
    const c = document.createElement('canvas'); c.width = c.height = 200; const g = c.getContext('2d');
    drawBody({ name: 'Earth', r: 60 }, 100, 100, { g, sun: { angle: 0, strength: 1 } });
    const [cr, cg, cb, ca] = g.getImageData(100, 100, 1, 1).data;
    takeOff(); render();  // the flight view paints Earth at its own radius
    return { ca, lit: cr + cg + cb > 60, keys: Object.keys(BODY_CACHE).filter(k => k.startsWith('Earth@')).sort() };
  });
  assert.equal(r.ca, 255); assert.ok(r.lit);
  assert.deepEqual(r.keys, ['Earth@60', 'Earth@95']);
  await done();
});

test('the panel is glass, lit from the sun\'s side', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  const r = await ev(() => { UI.render(); const cs = getComputedStyle(document.getElementById('panel')); return { bg: cs.backgroundColor, light: cs.getPropertyValue('--light-x').trim() }; });
  assert.match(r.bg, /rgba\(11, 17, 27, 0\.86\)/);
  assert.match(r.light, /^\d{1,3}%$/);
  await done();
});
