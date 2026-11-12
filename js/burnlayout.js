'use strict';

// The burn screen's layout: where each block sits, from the window alone (no G). One bar on top, the ship cutaway as the centre, the row
// with the Menu and System map buttons under it (`life`), the bridge keys at the bottom, and a scene dialog docked beside or over them. Comms
// lines fade over the bottom of the ship (commsShown, drawn by transit.js), with no box of their own (2026-11-12). Wide is a HUD sidebar (hudW > 0); narrow is the HUD strip on top, which covers phones and tablets.

// The box the cutaway is drawn in, its height over its width: on a wide screen and on a phone.
const CUTAWAY_ASPECT = { wide: 0.36, narrow: 0.6 };

const BURN_GUTTER = 12, BURN_KEYS_H = 53, BURN_KEYS_SHORT = 39, BURN_HUD_STRIP = 84;  // the key bar as the page draws it (#bkeys: 53 px, 39 in a window 480 or less tall, style.css), and the phone HUD strip (78 px and its line) with air
const BURN_WIDE = { bar: 64, barNoDates: 48, life: 57, shipWant: 0.55, dockMax: 560, dockShare: 0.45, keysGap: 6 };
const BURN_NARROW = { bar: 72, barNoDates: 48, life: 92, life1: 44, shipMin: 1.0, shipMax: 1.2, gap: 6, keysGap: 4 };

// Today's ship box, as drawTransit computes it (js/transit.js): the floor the new ship is never smaller than.
function legacyShipBox(W, H, hudW, narrow) {
  const viewW = W - hudW, cx = viewW / 2, cy = H / 2;
  const L = Math.min(viewW - 60, 640), shipY = cy + (narrow ? 56 : 70), aspect = CUTAWAY_ASPECT[narrow ? 'narrow' : 'wide'];
  const k = narrow ? Math.max(1, Math.min(1.35, (viewW - 24) / L)) : Math.max(1, Math.min(1.35, (viewW - 120) / L, (H / 2 - 282) / (L * aspect / 2)));
  return { x: cx + (narrow ? 0 : 40) - L * k / 2, y: shipY - L * k * aspect / 2, w: L * k, h: L * k * aspect };
}

// Every block's box {x, y, w, h} in screen px, in the view beside the HUD. dialog is null or { h }, the height of the dialog's content.
// tutorialH is the height of the tutorial's prompt while it shows (0 when not): it sits inside the ship's bottom left. A short window gives
// up the bar's dates line, then the ship shrinks.
function burnLayout(W, H, hudW, narrow, dialog, tutorialH = 0) {
  const viewW = W - hudW, G = BURN_GUTTER, x0 = G, w0 = viewW - 2 * G, old = legacyShipBox(W, H, hudW, narrow);
  const P = narrow ? BURN_NARROW : BURN_WIDE, gap = narrow ? P.gap : G;
  const top = narrow ? BURN_HUD_STRIP + P.gap : G;
  // The height left for the ship once the other blocks are laid out; shed until it is wanted or nothing is left to shed.
  const room = (barH, lifeH) => H - top - barH - gap - (gap + lifeH + P.keysGap + (H <= 480 ? BURN_KEYS_SHORT : BURN_KEYS_H));
  const wanted = narrow ? Math.min(viewW * P.shipMin, H * 0.5) : P.shipWant * H;  // blocks are shed only until the ship is this tall
  const want = old.h <= H ? Math.max(wanted, old.h) : wanted;  // never below today's box, where today's box fits the window
  let datesLine = true, lifeH = P.life;
  const fits = () => room(datesLine ? P.bar : P.barNoDates, lifeH) >= want;
  if (!fits()) datesLine = false;
  if (narrow && !fits()) lifeH = P.life1;  // the button rows fold to one
  const barH = datesLine ? P.bar : P.barNoDates, avail = Math.max(0, room(barH, lifeH));
  const shipH = narrow ? Math.min(P.shipMax * viewW, avail) : avail;  // the ship takes the height down to the button row

  const bar = { x: x0, y: top, w: w0, h: barH };
  const ship = { x: x0, y: bar.y + barH + gap, w: w0, h: shipH };
  const life = { x: x0, y: ship.y + shipH + gap, w: w0, h: lifeH };
  const tutorial = tutorialH ? { x: ship.x + 8, y: ship.y + ship.h - tutorialH - 8, w: Math.max(0, ship.w - 16), h: tutorialH } : null;
  // Under a scene the bridge keys, the life row and the Menu and map buttons are hidden, so the dock runs down to a gutter above the
  // window's bottom (the dialog's pinned choices pad themselves clear of a phone's home bar, style.css).
  let dock = null, clear = ship;
  const bottom = H - G;
  if (dialog && !narrow) {
    const dw = Math.min(P.dockMax, viewW * P.dockShare), dx = x0 + w0 - dw;
    dock = { x: dx, y: ship.y, w: dw, h: Math.max(0, bottom - ship.y) };
    clear = { x: ship.x, y: ship.y, w: Math.max(0, dx - G - ship.x), h: ship.h };
  } else if (dialog) {
    const h = Math.max(0, Math.min(dialog.h, bottom - (ship.y + ship.h / 2)));
    dock = { x: x0, y: bottom - h, w: w0, h };
    clear = { x: ship.x, y: ship.y, w: ship.w, h: Math.min(ship.h, dock.y - ship.y) };
  }
  return { bar, ship, life, tutorial, dock, clear, datesLine };
}

// The comms lines drawn over the ship (2026-11-12): of `comms` (strings or { text }), added at the real times `at` (G.time, parallel to it), the
// newest COMMS_MAX of the last COMMS_SHOW seconds at `now`, oldest first, each with how opaque it is: older lines dimmer, and each fading over its
// last second. A line with no time (a burn from an older save) is not drawn.
const COMMS_SHOW = 6, COMMS_MAX = 3;
function commsShown(comms, at, now) {
  const out = [];
  for (let i = comms.length - 1; i >= 0 && out.length < COMMS_MAX; i--) {
    const t = (at || [])[i];
    if (t == null || now - t >= COMMS_SHOW) continue;
    const c = comms[i], fade = Math.min(1, COMMS_SHOW - (now - t));
    out.unshift({ text: typeof c === 'string' ? c : c.text, alpha: fade * Math.pow(0.6, out.length) });
  }
  return out;
}
