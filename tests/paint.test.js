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
  assert.ok(r.keys.includes('Earth@60') && r.keys.includes('Earth@95'), `one sprite per size: ${r.keys}`);  // the viewscreen caches its own, larger Earth too
  await done();
});

test('the panel is glass, lit from the sun\'s side', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  const r = await ev(() => { UI.render(); const cs = getComputedStyle(document.getElementById('panel')); return { bg: cs.backgroundColor, light: cs.getPropertyValue('--light-x').trim() }; });
  assert.match(r.bg, /rgba\(11, 17, 27, 0\.86\)/);
  assert.match(r.light, /^\d{1,3}%$/);
  await done();
});

// A 1x1 red PNG, for the image slot.
const RED = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';

test('the vista paints every port in the full build: sky above, the body below', async () => {
  const { ev, done } = await open({ scope: 'full' });
  const bad = await ev(() => {
    const out = [], c = document.getElementById('vs'), g = c.getContext('2d');
    for (const [sid, sys] of Object.entries(SYSTEMS)) for (const pl of sys.planets) {
      G.state.systemId = sid; G.state.planet = pl.name; drawViewscreen(0);
      const px = (x, y) => g.getImageData(Math.round(x * c.width), Math.round(y * c.height), 1, 1).data;
      const station = (BODY_ART[pl.name] || {}).type === 'station';
      // A station hangs in the middle; a world rises as a limb along the bottom. A painted body varies along the limb
      // (clouds, craters, shading); a flat disc would not.
      const [tr, tg, tb] = px(0.02, 0.05), limb = (station ? [[0.31, 0.5], [0.32, 0.5], [0.33, 0.5]] : [[0.1, 0.97], [0.2, 0.97], [0.3, 0.97], [0.4, 0.97], [0.5, 0.97]]).map(([x, y]) => [...px(x, y)].slice(0, 3));
      const lit = limb.filter(p => p[0] + p[1] + p[2] >= 30).length, distinct = new Set(limb.map(p => p.join(','))).size;
      if (tr + tg + tb > 90 || lit < limb.length || distinct < 3) out.push(`${pl.name}: top ${tr + tg + tb}, limb ${limb.map(p => p.join('/')).join(' ')}`);
    }
    return out;
  });
  assert.deepEqual(bad, []);
  await done();
});

test('the vista paints at device pixel ratio 3, and holds still with reduce motion', async () => {
  const { ev, done } = await open({ scope: 'earth-hired', viewport: { width: 390, height: 844 }, mobile: true, init: () => Object.defineProperty(window, 'devicePixelRatio', { get: () => 3 }) });
  const r = await ev(() => {
    Settings.reduceMotion = true; drawViewscreen(0); const c = document.getElementById('vs');
    const a = c.toDataURL(); drawViewscreen(5000); return { same: a === c.toDataURL(), ratio: c.height / c.clientHeight };
  });
  assert.ok(r.same); assert.equal(r.ratio, 2, 'the canvas is capped at ratio 2');
  await done();
});

test('a port with an image shows it; an image that fails to load falls back to the painted scene', async () => {
  const { ev, page, done } = await open({ scope: 'earth-hired' });
  await ev(([red]) => { VISTA_IMAGES.Earth = red; drawViewscreen(0); }, [RED]);
  await page.waitForFunction(() => VISTA_IMAGE_CACHE.Earth && VISTA_IMAGE_CACHE.Earth.complete);
  const mid = await ev(() => { drawViewscreen(0); const c = document.getElementById('vs'); return [...c.getContext('2d').getImageData(c.width >> 1, c.height >> 1, 1, 1).data]; });
  assert.deepEqual(mid.slice(0, 3), [255, 0, 0]);
  await ev(() => { VISTA_IMAGES.Earth = 'data:image/png;base64,AAAA'; delete VISTA_IMAGE_CACHE.Earth; drawViewscreen(0); });  // fails to decode: no network, no console error
  await page.waitForTimeout(300);
  const fallback = await ev(() => { drawViewscreen(0); const c = document.getElementById('vs'); const [r, g, b] = c.getContext('2d').getImageData(Math.round(c.width * 0.3), c.height - 2, 1, 1).data; delete VISTA_IMAGES.Earth; return r + g + b; });
  assert.ok(fallback >= 30, 'the painted body is back');
  await done();  // asserts no page errors from the failed load
});

test('a port with no art entry of its own (a founded outpost) paints from its colour', async () => {
  const { ev, done } = await open({ scope: 'full' });
  const r = await ev(() => {
    system().planets.push({ name: 'Nowhere Outpost', x: 0, y: 0, r: 30, color: '#884422', services: [], prices: {} });
    G.state.planet = 'Nowhere Outpost'; drawViewscreen(0);
    const c = document.getElementById('vs'), [pr, pg, pb] = c.getContext('2d').getImageData(Math.round(c.width * 0.3), c.height - 2, 1, 1).data;
    system().planets.pop(); G.state.planet = 'Earth';
    return pr + pg + pb;
  });
  assert.ok(r >= 30, 'the limb is painted');
  await done();
});
