'use strict';

// The burn screen's layout: where each block sits, from the window alone (no G). One bar on top, the ship cutaway as the centre, a
// Comms ticker under it, a row of life (or the button rows on a phone), the bridge keys at the bottom, and a scene dialog docked
// beside or over them. Wide is a HUD sidebar (hudW > 0); narrow is the HUD strip on top, which covers phones and tablets.

// The box the cutaway is drawn in, its height over its width: on a wide screen and on a phone.
const CUTAWAY_ASPECT = { wide: 0.36, narrow: 0.6 };

const BURN_GUTTER = 12, BURN_KEYS_H = 52, BURN_HUD_STRIP = 84;
const BURN_WIDE = { bar: 64, barNoDates: 48, ticker: 78, ticker1: 40, life: 44, shipShare: 0.58, shipWant: 0.55, dockMax: 560, dockShare: 0.45 };
const BURN_NARROW = { bar: 72, barNoDates: 48, ticker: 120, ticker1: 40, life: 92, shipMin: 1.0, shipMax: 1.2, shipWant: 0.9, gap: 8 };

// Today's ship box, as drawTransit computes it (js/transit.js): the floor the new ship is never smaller than.
function legacyShipBox(W, H, hudW, narrow) {
  const viewW = W - hudW, cx = viewW / 2, cy = H / 2;
  const L = Math.min(viewW - 60, 640), shipY = cy + (narrow ? 56 : 70), aspect = CUTAWAY_ASPECT[narrow ? 'narrow' : 'wide'];
  const k = narrow ? Math.max(1, Math.min(1.35, (viewW - 24) / L)) : Math.max(1, Math.min(1.35, (viewW - 120) / L, (H / 2 - 282) / (L * aspect / 2)));
  return { x: cx + (narrow ? 0 : 40) - L * k / 2, y: shipY - L * k * aspect / 2, w: L * k, h: L * k * aspect };
}

// Every block's box {x, y, w, h} in screen px, in the view beside the HUD. dialog is null or { h }, the height of the dialog's content.
// A short window gives up height in this order: the ticker to one line, the bar's dates line, then the ship shrinks.
function burnLayout(W, H, hudW, narrow, dialog) {
  const viewW = W - hudW, G = BURN_GUTTER, x0 = G, w0 = viewW - 2 * G, old = legacyShipBox(W, H, hudW, narrow);
  const P = narrow ? BURN_NARROW : BURN_WIDE, gap = narrow ? P.gap : G;
  const top = narrow ? BURN_HUD_STRIP + P.gap : G;
  // The height left for the ship once the other blocks are laid out; shed until it is wanted or nothing is left to shed.
  const room = (barH, tickH) => H - top - barH - gap - (gap + tickH + gap + P.life + 6 + BURN_KEYS_H);
  const want = narrow ? Math.max(P.shipWant * viewW, old.h) : Math.max(P.shipWant * H, old.h);
  let tickerLines = 2, datesLine = true;
  if (room(P.bar, P.ticker) < want) tickerLines = 1;
  if (tickerLines === 1 && room(P.bar, P.ticker1) < want) datesLine = false;
  const barH = datesLine ? P.bar : P.barNoDates, tickH = tickerLines === 2 ? P.ticker : P.ticker1, avail = Math.max(0, room(barH, tickH));
  const shipH = Math.min(narrow ? P.shipMax * viewW : P.shipShare * H, avail);

  const bar = { x: x0, y: top, w: w0, h: barH };
  const ship = { x: x0, y: bar.y + barH + gap, w: w0, h: shipH };
  const ticker = { x: x0, y: ship.y + shipH + gap, w: w0, h: tickH };
  const life = { x: x0, y: ticker.y + tickH + gap, w: w0, h: P.life };
  let dock = null, clear = ship;
  if (dialog && !narrow) {
    const dw = Math.min(P.dockMax, viewW * P.dockShare), dx = x0 + w0 - dw;
    dock = { x: dx, y: ship.y, w: dw, h: ticker.y + ticker.h - ship.y };
    clear = { x: ship.x, y: ship.y, w: Math.max(0, dx - G - ship.x), h: ship.h };
  } else if (dialog) {
    const bottom = life.y + life.h, h = Math.max(0, Math.min(dialog.h, bottom - (ship.y + ship.h / 2)));
    dock = { x: x0, y: bottom - h, w: w0, h };
    clear = { x: ship.x, y: ship.y, w: ship.w, h: Math.min(ship.h, dock.y - ship.y) };
  }
  return { bar, ship, ticker, tickerLines, life, tutorial: ticker, dock, clear, datesLine };
}
