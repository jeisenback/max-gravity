'use strict';

// The burn screen's layout (js/burnlayout.js): every block's box from the window alone, in plain Node.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./nodecontext');

const { burnLayout, legacyShipBox, commsShown, BURN_KEYS_H, BURN_KEYS_SHORT, BURN_GUTTER } = load(['js/burnlayout.js'], {}, ['burnLayout', 'legacyShipBox', 'commsShown', 'BURN_KEYS_H', 'BURN_KEYS_SHORT', 'BURN_GUTTER']);
const apart = (a, b) => a.x + a.w <= b.x + 0.01 || b.x + b.w <= a.x + 0.01 || a.y + a.h <= b.y + 0.01 || b.y + b.h <= a.y + 0.01;

const SIZES = [[1280, 800, 220, false], [1000, 640, 220, false], [1920, 1080, 220, false], [1280, 600, 220, false]];  // desktop only (#937): every window has the HUD sidebar
test('every block is inside the view, and none overlaps another but the dock', () => {
  for (const [W, H, hud, narrow] of SIZES) for (const dialog of [null, { h: 400 }]) {
    const L = burnLayout(W, H, hud, narrow, dialog), viewW = W - hud;
    for (const k of ['bar', 'ship', 'life']) { const b = L[k]; assert.ok(b.x >= 0 && b.y >= 0 && b.x + b.w <= viewW && b.y + b.h <= H, `${W}x${H} ${k}`); }
    const ks = ['bar', 'ship', 'life'];
    for (let i = 0; i < ks.length; i++) for (let j = i + 1; j < ks.length; j++) assert.ok(apart(L[ks[i]], L[ks[j]]), `${W}x${H} ${ks[i]}/${ks[j]}`);
    assert.ok(L.life.y + L.life.h + (narrow ? 4 : 6) + (H <= 480 ? BURN_KEYS_SHORT : BURN_KEYS_H) <= H, `${W}x${H} keys fit`);  // the key bar is shorter in a short window (style.css)
    if (dialog) assert.ok(L.dock.x >= 0 && L.dock.x + L.dock.w <= viewW && L.dock.y >= 0 && L.dock.y + L.dock.h <= H - BURN_GUTTER + 0.01, `${W}x${H} dock inside, a gutter above the window's bottom`);  // the keys and the life row hide under a scene
  }
});
test('the ship is never smaller than today where today\'s box fits the window, and on a wide screen is at least 1.8 times as tall', () => {
  for (const [W, H, hud, narrow] of SIZES) {
    const s = burnLayout(W, H, hud, narrow, null).ship, old = legacyShipBox(W, H, hud, narrow);
    if (old.h <= H) assert.ok(s.w >= old.w - 0.5 && s.h >= old.h - 0.5, `${W}x${H}`);
    else assert.ok(s.h > 0, `${W}x${H} keeps some ship`);
  }
  const w = burnLayout(1280, 800, 220, false, null).ship; assert.ok(w.h >= 1.8 * legacyShipBox(1280, 800, 220, false).h);
});
test('there is no ticker: the ship runs down to the row with the Menu and System map buttons (2026-11-12)', () => {
  for (const [W, H, hud, narrow] of SIZES) {
    const L = burnLayout(W, H, hud, narrow, null);
    assert.equal(L.ticker, undefined); assert.equal(L.tickerLines, undefined);
    assert.ok(Math.abs(L.ship.y + L.ship.h + BURN_GUTTER - L.life.y) < 0.01, `${W}x${H}: the ship meets the button row`);
    assert.ok(L.ship.h >= legacyShipBox(W, H, hud, narrow).h);
  }
  assert.equal(burnLayout(1280, 800, 220, false, null).datesLine, true);
});
test('commsShown: the newest three of the last six seconds, the newest brightest, none without a time', () => {
  const at = [0, 10, 11, 12, 13], c = ['a', 'b', { text: 'c' }, 'd', 'e'];
  const texts = r => JSON.parse(JSON.stringify(r.map(x => x.text)));  // out of the sandbox's realm
  assert.deepEqual(texts(commsShown(c, at, 14)), ['c', 'd', 'e']);
  assert.deepEqual(texts(commsShown(c, at, 17.5)), ['d', 'e']);
  assert.equal(commsShown(['x'], [], 1).length, 0, 'a line from an older save has no time and is not drawn');
  assert.equal(commsShown(['x'], undefined, 1).length, 0);
  assert.equal(commsShown(['x', 'y'], [null, 0.5], 1).length, 1, 'a line kept with no time is not drawn');
  const s = commsShown(c, at, 13); assert.ok(s[2].alpha > s[1].alpha && s[1].alpha > s[0].alpha);
  assert.ok(commsShown(['x'], [0], 5.5)[0].alpha < commsShown(['x'], [0], 4)[0].alpha, 'it fades over its last second');
});
test('a dialog docks at the right of the ship and leaves the left clear', () => {
  const w = burnLayout(1280, 800, 220, false, { h: 500 });
  assert.equal(w.dock.w, Math.min(560, (1280 - 220) * 0.45)); assert.equal(w.dock.y, w.ship.y); assert.equal(w.clear.x, w.ship.x); assert.ok(Math.abs(w.clear.x + w.clear.w - w.dock.x) <= 12);
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
test('the tutorial prompt sits inside the bottom left of the ship, as tall as the prompt, and the ship keeps at least today\'s box', () => {
  for (const [W, H, hud, narrow] of [[1280, 800, 220, false], [1280, 600, 220, false], [1000, 640, 220, false]]) for (const th of [51, 68, 85]) {
    const L = burnLayout(W, H, hud, narrow, null, th), old = legacyShipBox(W, H, hud, narrow), T = L.tutorial;
    assert.equal(T.h, th); assert.ok(T.x >= L.ship.x && T.x + T.w <= L.ship.x + L.ship.w && T.y >= L.ship.y && T.y + T.h <= L.ship.y + L.ship.h, `${W}x${H} ${th}: inside the ship`);
    assert.ok(L.ship.h >= old.h - 0.5, `${W}x${H} ${th}: ship ${L.ship.h}`);
    assert.ok(L.life.y + L.life.h + (narrow ? 4 : 6) + BURN_KEYS_H <= H, `${W}x${H} ${th}: the keys fit`);
  }
  assert.equal(burnLayout(1280, 800, 220, false, null, 0).tutorial, null);
});

