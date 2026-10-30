'use strict';

// The living ship: the burn's phase weights and the g reading (js/burnpanel.js), and the phases of a run (js/shiplife.js), in plain Node.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./nodecontext');

const { phaseWeights: weights, gReading } = load(['js/burnpanel.js'], { G: {} }, ['phaseWeights', 'gReading']);
const phaseWeights = pr => JSON.parse(JSON.stringify(weights(pr)));  // out of the vm context, so plain objects
const G = {};
const { phase, posture, POSTURES, LADDER, drawPerson, camStep, viewOf, outlineLayout, outlineRoomAt, floorY, hullLength, ROOMS, drawOutline } = load(['js/data.js', 'js/util.js', 'js/figures.js', 'js/camera.js', 'js/shiplife.js'], { G, Mods: { filter: (n, v) => v, emit() {}, register() {} } }, ['phase', 'posture', 'POSTURES', 'LADDER', 'drawPerson', 'camStep', 'viewOf', 'outlineLayout', 'outlineRoomAt', 'floorY', 'hullLength', 'ROOMS', 'drawOutline']);

const fakeCtx = () => { const calls = [], fonts = []; let depth = 0; const c = new Proxy({}, { get: (o, k) => k in o ? o[k] : k === 'calls' ? calls : k === 'depth' ? depth : k === 'save' ? () => { depth++; calls.push(k); } : k === 'restore' ? () => { depth--; calls.push(k); } : k === 'fonts' ? fonts : k === 'measureText' ? s => ({ width: String(s).length * 6 }) : /Gradient|createPattern/.test(k) ? () => ({ addColorStop() {} }) : (...a) => { calls.push(k); }, set: (o, k, v) => { if (k === 'font') fonts.push(v); o[k] = v; return true; } }); return c; };
test('every posture draws, faced either way, with or without a face, and gives a point to tap', () => {
  for (const name of Object.keys(POSTURES)) for (const face of [1, -1]) for (const img of [null, { width: 12 }]) for (const frame of [0, POSTURES[name].frames - 1]) {
    const c = fakeCtx(), at = drawPerson(c, { name, x: 0.5, deck: 0, face, frame }, 400, 100, { color: '#ffb347', face: img });
    assert.ok(c.calls.length > 0, `${name} drew`); assert.equal(c.depth, 0, `${name}: every save is restored`); assert.ok(at.y < 100 && at.y > 100 - 80, `${name}: a tap point on the body`);
    if (img && !name.startsWith('cat')) assert.ok(c.calls.includes('drawImage'), `${name}: the face is the head`);
  }
});
test('a sleeper lies with the head to the left whichever way they last faced', () => {
  for (const face of [1, -1]) {
    const at = drawPerson(fakeCtx(), { name: 'bunk', x: 0.5, deck: 0, face, frame: 0 }, 400, 100, { color: '#ffb347', face: null });
    assert.ok(at.x < 400, `face ${face}: the body (and so the head) is left of the hip`);
  }
});
test('a person facing left is drawn mirrored', () => {
  const at = f => drawPerson(fakeCtx(), { name: 'tether', x: 0.5, deck: 0, face: f, frame: 0 }, 400, 100, { color: '#ffb347', face: null });
  assert.ok(at(1).x > 400 && at(-1).x < 400, 'the tap point follows the way they face');
});
test('the phase weights: all burn at the ends, all cruise between, all flip at the middle, and they always sum to one', () => {
  assert.deepEqual(phaseWeights(0.02), { burn: 1, cruise: 0, flip: 0 });
  assert.deepEqual(phaseWeights(0.25), { burn: 0, cruise: 1, flip: 0 });
  assert.deepEqual(phaseWeights(0.5), { burn: 0, cruise: 0, flip: 1 });
  assert.deepEqual(phaseWeights(0.98), { burn: 1, cruise: 0, flip: 0 });
  for (let p = 0; p <= 1; p += 0.001) { const w = phaseWeights(p); assert.ok(Math.abs(w.burn + w.cruise + w.flip - 1) < 1e-9 && Math.min(w.burn, w.cruise, w.flip) >= 0); }
});
test('the g reading: three times the thrust in the hard burn, the thrust in cruise, nothing at the flip, and no jumps', () => {
  assert.equal(gReading(0.02, 0.9), 2.7); assert.equal(gReading(0.3, 0.9), 0.9); assert.equal(gReading(0.5, 0.9), 0); assert.equal(gReading(0.97, 0.9), 2.7);
  for (let p = 0; p < 1; p += 0.001) assert.ok(Math.abs(gReading(p + 0.001, 0.9) - gReading(p, 0.9)) < 0.1, `a jump at ${p.toFixed(3)}`);
});
test('the phases of a run, with the crew securing either side of the flip', () => {
  const at = pr => { G.transit = { total: 100, left: 100 * (1 - pr) }; return phase(); };
  assert.deepEqual([0.03, 0.2, 0.45, 0.5, 0.55, 0.8, 0.97].map(at), ['couch', 'move', 'secure', 'float', 'secure', 'move', 'couch']);
});

test('a posture for everyone in every phase, from the list the sprites are drawn to', () => {
  const p = (o) => ({ role: 'gunner', room: 'galley', x: 0.5, dk: 0, tdk: 0, tx: null, ...o });
  assert.equal(posture(p(), 'couch', 0, false).name, 'couch');
  assert.equal(posture(p(), 'secure', 0, false).name, 'strap');
  assert.equal(posture(p(), 'float', 0, false).name, 'strap');
  assert.equal(posture(p({ role: 'engineer' }), 'float', 0, false).name, 'tether');
  assert.equal(posture(p({ role: 'engineer' }), 'secure', 0, false).name, 'strap');
  assert.equal(posture(p({ tx: 0.6 }), 'move', 0, false).name, 'walk');
  assert.equal(posture(p({ x: LADDER, dk: 0.5, tdk: 1 }), 'move', 0, false).name, 'climb');
  assert.equal(posture(p(), 'move', 0, false).name, 'sit');
  assert.equal(posture(p({ room: 'hold' }), 'move', 0, false).name, 'stand');
  assert.equal(posture(p({ room: 'berths' }), 'move', 0, true).name, 'bunk');
  assert.deepEqual(['float', 'couch', 'move'].map(ph => posture(p({ role: 'cat' }), ph, 0, false).name), ['cat-float', 'cat-sleep', 'cat-sit']);
  assert.equal(posture(p({ role: 'cat', tx: 0.3 }), 'move', 0, false).name, 'cat-walk');
  for (const ph of ['couch', 'secure', 'float', 'move']) { const q = posture(p(), ph, 7.3, false); assert.ok(POSTURES[q.name] && q.frame >= 0 && q.frame < POSTURES[q.name].frames); }
  assert.equal(posture(p({ face: -1 }), 'move', 0, false).face, -1);
});
test('the camera snaps first, then eases, and stays inside the hull', () => {
  assert.equal(camStep(null, 800, 0.1, 600, 1600), 800);
  const x = camStep(800, 1000, 0.1, 600, 1600); assert.ok(x > 800 && x < 1000);
  assert.equal(camStep(800, 0, 1, 600, 1600), 300); assert.equal(camStep(800, 5000, 1, 600, 1600), 1632 - 300);
});
test('a hull shorter than the view sits in the middle and does not jitter', () => {
  const a = camStep(null, 100, 0.1, 1200, 960), b = camStep(a, 900, 0.1, 1200, 960); assert.equal(a, 960 * 0.51); assert.equal(b, a);
});
test('the zoom fits both decks in the box; the outline finds every room, and nothing outside it', () => {
  const v = viewOf({ x: 0, y: 0, w: 864, h: 311 }); assert.ok(Math.abs(v.zoom - 1.244) < 0.01); assert.ok(Math.abs(v.span - 864 / v.zoom) < 1e-9);
  const o = outlineLayout({ x: 100, y: 50, w: 864, h: 311 }, 1600);
  for (const r of o.rooms) assert.equal(outlineRoomAt(o, r.x + r.w / 2, r.y + r.h / 2), r.id);
  assert.equal(o.rooms.length, ROOMS.length); assert.equal(outlineRoomAt(o, o.x - 4, o.y - 4), null);
  assert.equal(floorY(0), 100); assert.equal(floorY(1), 212); assert.equal(hullLength(18), 1600); assert.equal(hullLength(10), 960); assert.equal(hullLength(20), 1600);
});
test('the outline draws balanced, squeezed by the turn, with no text', () => {
  const o = outlineLayout({ x: 0, y: 0, w: 864, h: 311 }, 1600);
  for (const turn of [1, -1, 0.3]) { const c = fakeCtx(); drawOutline(c, o, [{ x: 800, deck: 0, color: '#ffb347' }], 800, 694, 1600, turn); assert.equal(c.depth, 0); assert.ok(c.calls.length > 0); assert.ok(!c.calls.includes('fillText')); }
});
