'use strict';

// The burn screen's layout (js/burnlayout.js): every block's box from the window alone, in plain Node.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./nodecontext');

const { burnLayout, legacyShipBox } = load(['js/burnlayout.js'], {}, ['burnLayout', 'legacyShipBox']);
const apart = (a, b) => a.x + a.w <= b.x + 0.01 || b.x + b.w <= a.x + 0.01 || a.y + a.h <= b.y + 0.01 || b.y + b.h <= a.y + 0.01;

const SIZES = [[1280, 800, 220, false], [768, 1024, 0, true], [390, 844, 0, true], [1280, 600, 220, false], [844, 390, 0, true]];
test('every block is inside the view, and none overlaps another but the dock', () => {
  for (const [W, H, hud, narrow] of SIZES) for (const dialog of [null, { h: 400 }]) {
    const L = burnLayout(W, H, hud, narrow, dialog), viewW = W - hud;
    for (const k of ['bar', 'ship', 'ticker', 'life']) { const b = L[k]; assert.ok(b.x >= 0 && b.y >= 0 && b.x + b.w <= viewW && b.y + b.h <= H, `${W}x${H} ${k}`); }
    const ks = ['bar', 'ship', 'ticker', 'life'];
    for (let i = 0; i < ks.length; i++) for (let j = i + 1; j < ks.length; j++) assert.ok(apart(L[ks[i]], L[ks[j]]), `${W}x${H} ${ks[i]}/${ks[j]}`);
    if (dialog) assert.ok(L.dock.x + L.dock.w <= viewW && L.dock.y + L.dock.h <= H, `${W}x${H} dock inside`);
  }
});
test('the ship is never smaller than today where today\'s box fits the window, and on a wide screen is at least 1.8 times as tall', () => {
  for (const [W, H, hud, narrow] of SIZES) {
    const s = burnLayout(W, H, hud, narrow, null).ship, old = legacyShipBox(W, H, hud, narrow);
    if (old.h <= H * 0.6) assert.ok(s.w >= old.w - 0.5 && s.h >= old.h - 0.5, `${W}x${H}`);  // a landscape phone (844x390): today's box is taller than the window, so the ship gets what remains
    else assert.ok(s.h > 0, `${W}x${H} keeps some ship`);
  }
  const w = burnLayout(1280, 800, 220, false, null).ship; assert.ok(w.h >= 1.8 * legacyShipBox(1280, 800, 220, false).h);
});
test('a short window gives up the ticker line and the dates before the ship', () => {
  const tall = burnLayout(1280, 800, 220, false, null), short = burnLayout(1280, 600, 220, false, null);
  assert.equal(tall.tickerLines, 2); assert.equal(short.tickerLines, 1);
  assert.equal(tall.datesLine, true);
  assert.ok(short.ship.h >= legacyShipBox(1280, 600, 220, false).h);
});
test('a dialog docks at the right of the ship on a wide screen and leaves the left clear; on a narrow one it rises no higher than the ship\'s middle', () => {
  const w = burnLayout(1280, 800, 220, false, { h: 500 });
  assert.equal(w.dock.w, Math.min(560, (1280 - 220) * 0.45)); assert.equal(w.dock.y, w.ship.y); assert.equal(w.clear.x, w.ship.x); assert.ok(Math.abs(w.clear.x + w.clear.w - w.dock.x) <= 12);
  const n = burnLayout(390, 844, 0, true, { h: 900 });
  assert.ok(n.dock.y >= n.ship.y + n.ship.h / 2); assert.equal(n.clear.h, n.dock.y - n.ship.y);
});
test('without a dialog there is no dock, and the whole ship is clear', () => {
  const l = burnLayout(1280, 800, 220, false, null); assert.equal(l.dock, null); assert.deepEqual(l.clear, l.ship);
});
