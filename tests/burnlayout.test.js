'use strict';

// The burn screen's layout (js/burnlayout.js): every block's box from the window alone, in plain Node.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./nodecontext');

const { burnLayout, legacyShipBox, BURN_KEYS_H, BURN_KEYS_SHORT, BURN_GUTTER } = load(['js/burnlayout.js'], {}, ['burnLayout', 'legacyShipBox', 'BURN_KEYS_H', 'BURN_KEYS_SHORT', 'BURN_GUTTER']);
const apart = (a, b) => a.x + a.w <= b.x + 0.01 || b.x + b.w <= a.x + 0.01 || a.y + a.h <= b.y + 0.01 || b.y + b.h <= a.y + 0.01;

const SIZES = [[1280, 800, 220, false], [768, 1024, 0, true], [390, 844, 0, true], [1280, 600, 220, false], [844, 390, 0, true]];
test('every block is inside the view, and none overlaps another but the dock', () => {
  for (const [W, H, hud, narrow] of SIZES) for (const dialog of [null, { h: 400 }]) {
    const L = burnLayout(W, H, hud, narrow, dialog), viewW = W - hud;
    for (const k of ['bar', 'ship', 'ticker', 'life']) { const b = L[k]; assert.ok(b.x >= 0 && b.y >= 0 && b.x + b.w <= viewW && b.y + b.h <= H, `${W}x${H} ${k}`); }
    const ks = ['bar', 'ship', 'ticker', 'life'];
    for (let i = 0; i < ks.length; i++) for (let j = i + 1; j < ks.length; j++) assert.ok(apart(L[ks[i]], L[ks[j]]), `${W}x${H} ${ks[i]}/${ks[j]}`);
    assert.ok(L.life.y + L.life.h + (narrow ? 4 : 6) + (H <= 480 ? BURN_KEYS_SHORT : BURN_KEYS_H) <= H, `${W}x${H} keys fit`);  // the key bar is shorter in a short window (style.css)
    if (dialog) assert.ok(L.dock.x >= 0 && L.dock.x + L.dock.w <= viewW && L.dock.y >= 0 && L.dock.y + L.dock.h <= H - BURN_GUTTER + 0.01, `${W}x${H} dock inside, a gutter above the window's bottom`);  // the keys and the life row hide under a scene
  }
});
test('the ship is never smaller than today where today\'s box fits the window, and on a wide screen is at least 1.8 times as tall', () => {
  for (const [W, H, hud, narrow] of SIZES) {
    const s = burnLayout(W, H, hud, narrow, null).ship, old = legacyShipBox(W, H, hud, narrow);
    // today's box already overflows the window at 844x390, so the floor cannot hold there
    if (old.h <= H) assert.ok(s.w >= old.w - 0.5 && s.h >= old.h - 0.5, `${W}x${H}`);
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
test('under a scene the keys and the life row are hidden, so the dock runs down to a gutter above the window\'s bottom', () => {
  for (const [W, H, hud, narrow] of SIZES) {
    const L = burnLayout(W, H, hud, narrow, { h: 5000 });
    assert.equal(L.dock.y + L.dock.h, H - BURN_GUTTER, `${W}x${H}: a tall scene's dock ends a gutter above the bottom`);
    if (narrow) assert.equal(L.dock.y, L.ship.y + L.ship.h / 2, `${W}x${H}: and its top is the ship's middle`);
    else assert.equal(L.dock.y, L.ship.y, `${W}x${H}: and runs from the ship's top`);
    const s = burnLayout(W, H, hud, narrow, { h: 120 });
    if (narrow) assert.deepEqual([s.dock.y, s.dock.h], [H - BURN_GUTTER - 120, 120], `${W}x${H}: a short scene rises only as far as it needs`);
  }
});
test('without a dialog there is no dock, and the whole ship is clear', () => {
  const l = burnLayout(1280, 800, 220, false, null); assert.equal(l.dock, null); assert.deepEqual(l.clear, l.ship);
});
test('a landscape phone keeps a usable ship, with every box inside the view', () => {
  const l = burnLayout(844, 390, 0, true, null);
  assert.ok(l.ship.h >= 140, `ship ${l.ship.h}`); assert.equal(l.tickerLines, 0); assert.equal(l.ticker.h, 0); assert.equal(l.tutorial, null);
  for (const k of ['bar', 'ship', 'ticker', 'life']) assert.ok(l[k].y >= 0 && l[k].y + l[k].h <= 390 && l[k].x + l[k].w <= 844, k);
});
test('a tall phone keeps the two-line ticker and the full button rows', () => {
  const l = burnLayout(390, 844, 0, true, null); assert.equal(l.tickerLines, 2); assert.equal(l.life.h, 92);
});
test('a tablet keeps its two-line ticker and full button rows, with a ship of at least 512 px', () => {
  const l = burnLayout(768, 1024, 0, true, null); assert.equal(l.tickerLines, 2); assert.equal(l.life.h, 92); assert.ok(l.ship.h >= 512, `ship ${l.ship.h}`);
});
test('the tutorial prompt takes the ticker\'s place: the box is as tall as the prompt, and the ship keeps at least today\'s box', () => {
  for (const [W, H, hud, narrow] of [[1280, 800, 220, false], [1280, 600, 220, false], [390, 844, 0, true]]) for (const th of [51, 68, 85]) {
    const L = burnLayout(W, H, hud, narrow, null, th), old = legacyShipBox(W, H, hud, narrow);
    assert.ok(L.ticker.h >= th, `${W}x${H} ${th}: ticker ${L.ticker.h}`); assert.ok(L.ship.h >= old.h - 0.5, `${W}x${H} ${th}: ship ${L.ship.h}`);
    assert.ok(L.life.y + L.life.h + (narrow ? 4 : 6) + BURN_KEYS_H <= H, `${W}x${H} ${th}: the keys fit`);
  }
  const short = burnLayout(1280, 600, 220, false, null, 68); assert.equal(short.datesLine, false, 'a short window gives up the dates line for the prompt');
});

