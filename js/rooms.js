'use strict';

// The burn view's rooms (#living-ship): each room of the cutaway drawn lived-in under a low ceiling, its props answering the phase of
// the burn (weights from phaseWeights in burnpanel.js). A room is r = { x0, x1, top, floor } in world units: props sit at a share of
// its width and are measured up from its floor (the ceiling is 100 above it). Pure drawing: no state read, no randomness, motion
// comes from s.time. Loaded after camera.js; the bulkheads and the hull are the caller's.

const roomFont = '"Chakra Petch", ui-sans-serif, sans-serif';
const roomStars = Array.from({ length: 14 }, (_, k) => [Math.sin(k * 12.9898) * 0.5 + 0.5, Math.sin(k * 78.233) * 0.5 + 0.5, (k % 3) * 0.4 + 0.6]);
// A prop (#933): its body a step brighter than the wall, its top edge catching the ceiling's light, its underside in shade, and a dark outline, so it
// stands off the wall behind it. A small detail (under 6 units either way) or a colour not written as #rrggbb is a plain fill.
const roomFlat = (ctx, x, y, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(x, y, w, h); };
const roomBox = (ctx, x, y, w, h, col) => {
  if (Math.abs(w) < 6 || Math.abs(h) < 6 || !/^#[0-9a-f]{6}$/i.test(col)) { roomFlat(ctx, x, y, w, h, col); return; }
  const x0 = Math.min(x, x + w), y0 = Math.min(y, y + h), W = Math.abs(w), H = Math.abs(h), e = Math.min(1.5, H / 6);
  roomFlat(ctx, x0, y0, W, H, figShade(col, 1.18));
  roomFlat(ctx, x0, y0, W, e, figShade(col, 1.6)); roomFlat(ctx, x0, y0 + H - e, W, e, figShade(col, 0.62));
  ctx.strokeStyle = 'rgba(3,7,12,0.85)'; ctx.lineWidth = 1; ctx.strokeRect(x0 + 0.5, y0 + 0.5, W - 1, H - 1);
};
// A prop's part drawn to the figures' standard (#933): a path in SVG syntax (figPath's, figures.js, so it draws without a browser) filled with
// its colour as its front, a band along its top lit by the ceiling's lamps, a band down one side (o.side units: on the right, or the left when
// negative) and along its underside (o.under) in shade, and the figures' outline round it. A colour not written as #rrggbb is filled flat.
// figPath keeps every path string it reads (and roomPart its bounds), so a path given here is fixed per layout: built from the room's box, W,
// X() and constants, never from s.time, the zoom or anything that changes frame to frame (move such a part with ctx.translate instead).
const roomBounds = {};
function roomPart(ctx, d, col, o = {}) {
  const { top = 1.5, side = 0, under = 0 } = o;
  figPath(ctx, d); ctx.fillStyle = col; ctx.fill();
  if (/^#[0-9a-f]{6}$/i.test(col) && (top || side || under)) {
    const [x0, y0, x1, y1] = roomBounds[d] || (roomBounds[d] = figTokens[d].filter(t => !/[A-Z]/.test(t)).reduce((b, t, i) => {
      const v = Number(t), k = i % 2; b[k] = Math.min(b[k], v); b[k + 2] = Math.max(b[k + 2], v); return b;
    }, [Infinity, Infinity, -Infinity, -Infinity]));
    ctx.save(); ctx.clip();
    if (top) roomFlat(ctx, x0, y0, x1 - x0, top, figShade(col, 1.4));
    if (side) roomFlat(ctx, side > 0 ? x1 - side : x0, y0, Math.abs(side), y1 - y0, figShade(col, 0.72));
    if (under) roomFlat(ctx, x0, y1 - under, x1 - x0, under, figShade(col, 0.62));
    ctx.restore();  // fillRect leaves the path as it was, so the outline follows it
  }
  ctx.lineWidth = 0.9; ctx.strokeStyle = FIG_LINE; ctx.stroke();
}
// A box with its corners rounded by rad, as a path for roomPart, its numbers rounded to hundredths (short keys, never an exponent).
const roomRound = (x, y, w, h, rad) => {
  const n = v => Math.round(v * 100) / 100, a = n(x), b = n(y), c = n(x + w), e = n(y + h), q = n(Math.min(rad, w / 2, h / 2));
  return `M ${n(a + q)} ${b} L ${n(c - q)} ${b} Q ${c} ${b} ${c} ${n(b + q)} L ${c} ${n(e - q)} Q ${c} ${e} ${n(c - q)} ${e} L ${n(a + q)} ${e} Q ${a} ${e} ${a} ${n(e - q)} L ${a} ${n(b + q)} Q ${a} ${b} ${n(a + q)} ${b} Z`;
};
// A station's screen (#933): a bezel, the glass, and what it shows. kind: 'plot' (the course, the ship moving along it), 'status' (the ship's
// readings as bars), 'scope' (a ranging circle, crosshairs and a sweep) or 'bars' (the guns' charge). hot: the hard burn's red.
function roomScreen(ctx, x, y, w, h, kind, time, hot = false) {
  roomBox(ctx, x - 3, y - 3, w + 6, h + 6, '#1b2f45'); roomFlat(ctx, x, y, w, h, '#03121c');
  const lit = hot ? '#ff7a5a' : '#6fb0ff', soft = hot ? 'rgba(255,122,90,0.45)' : 'rgba(111,176,255,0.45)', cx = x + w / 2, cy = y + h / 2;
  ctx.lineWidth = 1;
  if (kind === 'plot') {
    ctx.strokeStyle = soft; ctx.setLineDash([2, 2]); ctx.beginPath(); ctx.moveTo(x + 3, y + h - 4); ctx.quadraticCurveTo(cx, y + 2, x + w - 3, y + h - 5); ctx.stroke(); ctx.setLineDash([]);
    const t = (time * 0.08) % 1, px = (1 - t) * (1 - t) * (x + 3) + 2 * (1 - t) * t * cx + t * t * (x + w - 3), py = (1 - t) * (1 - t) * (y + h - 4) + 2 * (1 - t) * t * (y + 2) + t * t * (y + h - 5);
    roomDot(ctx, px, py, 1.6, '#ffd9a8'); roomDot(ctx, x + w - 3, y + h - 5, 1.6, '#5fd35f');
  } else if (kind === 'status') {
    for (let k = 0; k < 3; k++) { roomFlat(ctx, x + 3, y + 3 + k * (h / 3), w - 6, 2, '#0f2a3e'); roomFlat(ctx, x + 3, y + 3 + k * (h / 3), (w - 6) * (0.45 + 0.4 * Math.abs(Math.sin(time * 0.3 + k * 1.7))), 2, k === 1 ? '#ffb347' : lit); }
  } else if (kind === 'scope') {
    const rr = Math.min(w, h) / 2 - 3;
    ctx.strokeStyle = soft; ctx.beginPath(); ctx.arc(cx, cy, rr, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.arc(cx, cy, rr / 2, 0, Math.PI * 2); ctx.stroke();
    roomSeg(ctx, [[cx - rr, cy], [cx + rr, cy]]); roomSeg(ctx, [[cx, cy - rr], [cx, cy + rr]]);
    ctx.strokeStyle = hot ? 'rgba(255,150,110,0.9)' : 'rgba(111,255,176,0.85)'; roomSeg(ctx, [[cx, cy], [cx + Math.cos(time * 2) * rr, cy + Math.sin(time * 2) * rr]]);
    roomDot(ctx, cx + rr * 0.45, cy - rr * 0.4, 1.4, '#ff8a6a');
  } else {
    for (let k = 0; k < 4; k++) { const hgt = Math.max(2, (h - 6) * (0.25 + 0.7 * Math.abs(Math.sin(time * 1.5 + k)))); roomFlat(ctx, x + 3 + k * ((w - 6) / 4), y + h - 3 - hgt, (w - 6) / 4 - 1.5, hgt, lit); }
  }
}
const roomDot = (ctx, x, y, r, col) => { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); };
const roomSeg = (ctx, pts) => { ctx.beginPath(); ctx.moveTo(...pts[0]); for (const p of pts.slice(1)) ctx.lineTo(...p); ctx.stroke(); };
const roomMix = (cols, w) => { const out = [0, 0, 0]; cols.forEach((c, i) => c.forEach((v, j) => { out[j] += v * w[i]; })); return out.map(Math.round); };

// The end of something hung on a line from an anchor: sways in cruise, hangs straight under thrust, drifts up at the flip. Still: straight down.
function hangEnd(ax, ay, len, seed, w, time, still) {
  if (still) return [ax, ay + len];
  const sway = Math.sin(time * 1.2 + seed) * 0.12 * w.cruise;
  const down = [Math.sin(sway) * len, Math.cos(sway) * len], up = [Math.sin(time * 0.6 + seed) * len * 0.6, -len * 0.4 + Math.cos(time * 0.8 + seed) * len * 0.25];
  return [ax + down[0] * (1 - w.flip) + up[0] * w.flip, ay + down[1] * (1 - w.flip) + up[1] * w.flip];
}

// Text sized in world units, drawn only if it is 12px or more on the screen (the font number is the screen size). Returns whether it drew.
// The size is rounded to a hundredth of a pixel, so text asked for at 12 / zoom world px is 12px and drawn.
function worldText(ctx, zoom, text, x, y, worldPx, color, align) {
  const px = Math.round(worldPx * zoom * 100) / 100;
  if (px < 12) return false;
  ctx.save(); ctx.translate(x, y); ctx.scale(1 / zoom, 1 / zoom);
  ctx.fillStyle = color; ctx.font = `600 ${px}px ${roomFont}`; ctx.textAlign = align || 'left'; ctx.fillText(text, 0, 0);
  ctx.restore();
  return true;
}

// A porthole (#933): the glass and the stars wheeling past it, in a frame with a lit upper rim, a shaded lower one and its bolts.
function roomPorthole(ctx, x, y, rad, spin) {
  ctx.fillStyle = '#2f4a66'; ctx.beginPath(); ctx.arc(x, y, rad + 6, 0, Math.PI * 2); ctx.fill(); ctx.lineWidth = 0.9; ctx.strokeStyle = FIG_LINE; ctx.stroke();
  ctx.lineWidth = 2; ctx.strokeStyle = figShade('#2f4a66', 1.4); ctx.beginPath(); ctx.arc(x, y, rad + 4.5, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
  ctx.strokeStyle = figShade('#2f4a66', 0.65); ctx.beginPath(); ctx.arc(x, y, rad + 4.5, Math.PI * 0.1, Math.PI * 0.9); ctx.stroke();
  ctx.save(); ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2); ctx.clip(); roomFlat(ctx, x - rad, y - rad, rad * 2, rad * 2, '#01040a');
  const cs = Math.cos(spin), sn = Math.sin(spin);
  for (const [a, b, sz] of roomStars) { const sx = (a - 0.5) * rad * 2.4, sy = (b - 0.5) * rad * 2.4; roomDot(ctx, x + sx * cs - sy * sn, y + sx * sn + sy * cs, sz, '#cfe3ff'); }
  roomFlat(ctx, x - rad, y - rad, rad, rad * 2, 'rgba(160,200,255,0.08)'); ctx.restore();
  ctx.lineWidth = 1.2; ctx.strokeStyle = '#132538'; ctx.beginPath(); ctx.arc(x, y, rad + 0.6, 0, Math.PI * 2); ctx.stroke();  // the gasket
  for (let k = 0; k < 8; k++) roomDot(ctx, x + Math.cos(k * Math.PI / 4 + Math.PI / 8) * (rad + 3.2), y + Math.sin(k * Math.PI / 4 + Math.PI / 8) * (rad + 3.2), 1, '#56708c');
}

// A crash couch at x on the deck F, unfolded by d (0 to 1, #925): at 0 only its plate in the deck shows; the pad rises flat out of it, 60 long,
// its headrest at the head end on the left, where the person on it lies on their back (#972).
function roomCouchFlat(ctx, x, F, d) {
  roomBox(ctx, x - 32, F - 3, 60, 3, '#1a3048');
  if (d <= 0) return;
  roomBox(ctx, x - 32, F - 7 * d, 60, 7 * d, '#23405e');
  roomBox(ctx, x - 34, F - 11 * d, 12, 4 * d, '#2c4c6e');
}
// A jump seat at x on the deck F, for someone strapped in at the flip (#927): the rail on the wall behind them (face: the way they face), and
// the seat and its back folded down from it by d (0 to 1, the flip's weight).
function roomJumpSeat(ctx, x, F, face, d) {
  const bx = x - face * 14;
  roomBox(ctx, bx - 3, F - 60, 6, 60, '#1d3550');
  if (d <= 0) return;
  const pan = 24 * d;
  roomBox(ctx, face > 0 ? bx : bx - pan, F - 20, pan, 4, '#2a4664'); roomBox(ctx, bx - 2, F - 20 - 34 * d, 4, 34 * d, '#2a4664');
}
// The galley's bench (#925): one long seat from x0 to x1 in front of the mess table, where the table's places are (SEATS, shiplife.js): its pad at
// the seated hip (23, #933), on a frame and legs with a foot bar, and a tie-down ring at each foot.
function roomBench(ctx, x0, x1, F) {
  const legs = Math.max(2, Math.round((x1 - x0) / 60) + 1), lx = k => x0 + 4 + (x1 - x0 - 12) * (k / (legs - 1));
  roomPart(ctx, roomRound(x0 + 6, F - 7, x1 - x0 - 12, 2, 1), '#1c3249', { top: 0.6 });  // the foot bar
  for (let k = 0; k < legs; k++) {
    const x = lx(k);
    roomPart(ctx, `M ${x} ${F - 17} L ${x + 4} ${F - 17} L ${x + 3.4} ${F - 1.5} L ${x + 0.6} ${F - 1.5} Z`, '#1c3249', { top: 0, side: 1.2 });
    roomPart(ctx, roomRound(x - 2, F - 1.8, 8, 1.8, 0.8), '#20384f', { top: 0.5 });
    ctx.strokeStyle = '#4a6680'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.arc(x + 2, F - 3, 1.3, 0, Math.PI * 2); ctx.stroke();
  }
  roomPart(ctx, roomRound(x0 + 2, F - 19, x1 - x0 - 4, 2.5, 0.8), '#1c3249', { top: 0.6 });  // the frame under the pad
  roomPart(ctx, roomRound(x0, F - 23, x1 - x0, 4.5, 2), '#33506e', { top: 1, under: 1 });
}
function roomStool(ctx, x, F, back) {  // back: a chair's back on the left (1) or the right (-1) of the seat, for a station's chair (#933); none on a stool
  if (back) { const bx = back > 0 ? x - 12 : x + 7; roomBox(ctx, bx, F - 50, 6, 34, '#2a4664'); roomFlat(ctx, bx + 1, F - 46, 4, 12, '#203a55'); }
  roomBox(ctx, x - 10, F - 19, 20, 6, '#2a4664'); roomFlat(ctx, x - 2, F - 13, 4, 13, '#1c3249'); roomFlat(ctx, x - 8, F - 3, 16, 3, '#1c3249');
}
// A mug in a holder ring on the table: free in cruise (it steams), clipped in at the flip (no steam), in the ring in the burn.
function roomMug(ctx, x, y, w, time) {
  const free = w.cruise, lift = 3 * free;
  ctx.strokeStyle = '#7a8a9a'; ctx.lineWidth = 1.5; ctx.strokeRect(x - 6, y - 4, 12, 4);
  // moved, not redrawn, as it lifts (a path given to roomPart is fixed per layout)
  ctx.save(); ctx.translate(0, -lift); roomPart(ctx, roomRound(x - 4, y - 9, 8, 9, 1.2), '#a9b8c6', { top: 1, side: 2 });
  ctx.strokeStyle = '#a9b8c6'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(x + 5, y - 5, 2.5, -Math.PI / 2, Math.PI / 2); ctx.stroke(); ctx.restore();
  if (w.flip > 0.5) roomBox(ctx, x - 6, y - 7, 12, 2, '#7a8a9a');
  if (free > 0.05) { ctx.strokeStyle = `rgba(220,230,240,${0.35 * free})`; ctx.lineWidth = 1; for (let k = 0; k < 2; k++) { const y0 = y - 12 - lift, ph = time * 2 + k * 2; ctx.beginPath(); ctx.moveTo(x - 2 + k * 4, y0); ctx.quadraticCurveTo(x + Math.sin(ph) * 3, y0 - 6, x - 1 + k * 3 + Math.sin(ph + 1) * 3, y0 - 12); ctx.stroke(); } }
}
function roomPlant(ctx, x, y, w, time, still, k = 1) {  // its pot's top at y, drawn at the scale k
  roomPart(ctx, `M ${x - 6 * k} ${y} L ${x + 6 * k} ${y} L ${x + 4.5 * k} ${y + 10 * k} L ${x - 4.5 * k} ${y + 10 * k} Z`, '#5e4434', { top: 1.2, side: 2 * k }); const droop = w.burn * 0.9 - w.flip * 0.5; ctx.strokeStyle = '#5fae5a'; ctx.lineWidth = 1.8 * k;
  for (const [a, l, sd] of [[-0.9, 11 * k, 0], [-0.3, 14 * k, 1], [0.35, 13 * k, 2], [0.95, 10 * k, 3]]) {
    const ang = a * (1 - w.burn * 0.3) + (still ? 0 : Math.sin(time * 1.1 + sd) * 0.25 * w.flip);
    ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + Math.sin(ang) * l * 0.4, y - l * 0.7, x + Math.sin(ang) * l, y - Math.cos(ang) * l * (1 - droop * 0.7) + droop * 6 * k); ctx.stroke();
  }
}

// Walls, seams, the deck plate and the cable run (it sags under thrust, less in cruise, and floats at the flip).
function roomWalls(ctx, r, w, time, still) {
  const { x0, x1, top, floor: F } = r;
  roomFlat(ctx, x0, top, x1 - x0, F - top, '#0c1826');
  ctx.fillStyle = '#0e1c2c'; for (let x = x0; x < x1 - 40; x += 48) ctx.fillRect(x + 2, top + 14, 44, F - top - 34);
  for (let x = x0; x < x1; x += 48) { roomFlat(ctx, x, top, 2, F - top, '#132538'); roomDot(ctx, x + 5, top + 16, 0.9, '#21384f'); roomDot(ctx, x + 5, F - 22, 0.9, '#21384f'); }
  roomFlat(ctx, x0, F, x1 - x0, HULL.plate, '#132438'); ctx.fillStyle = '#1b3047'; for (let x = x0 + 4; x < x1 - 4; x += 10) ctx.fillRect(x, F + 2, 5, 2);
  const sag = 9 * w.burn + 4 * w.cruise + (still ? -2 : -2 + Math.sin(time * 0.9 + x0) * 3) * w.flip;
  ctx.strokeStyle = '#2b4462'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(x0 + 6, top + 6); ctx.quadraticCurveTo((x0 + x1) / 2, top + 6 + sag, x1 - 6, top + 6); ctx.stroke();
  ctx.strokeStyle = '#3a2f22'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x0 + 6, top + 10); ctx.quadraticCurveTo((x0 + x1) / 2, top + 10 + sag * 0.7, x1 - 6, top + 10); ctx.stroke();
}

// The engine room's fittings (#933). A gauge's reading, 0 to 1: up in the hard burn, low in cruise, near nothing at the flip with the drive off,
// and a tremble while the drive runs (k: which gauge).
const gaugeNeedle = (w, time, k) => Math.min(1, 0.05 * w.flip + 0.35 * w.cruise + 0.85 * w.burn + 0.03 * Math.sin(time * 5 + k * 1.9) * (1 - w.flip));
function roomGauge(ctx, x, y, rad, v) {
  roomDot(ctx, x, y, rad + 2, '#3d5a7a'); roomDot(ctx, x, y, rad, '#e6dfc9');
  ctx.strokeStyle = '#b0322a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, rad - 2, -Math.PI / 2 + 0.45 * Math.PI, -Math.PI / 2 + 0.75 * Math.PI); ctx.stroke();  // the red band at the top of the scale
  const a = -Math.PI / 2 + (v - 0.5) * Math.PI * 1.5; ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = 1.2; roomSeg(ctx, [[x, y], [x + Math.cos(a) * (rad - 2), y + Math.sin(a) * (rad - 2)]]); roomDot(ctx, x, y, 1.3, '#1a1a1a');
}
function roomValve(ctx, x, y, rad) {
  ctx.strokeStyle = '#c0392b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2); ctx.stroke();
  for (let k = 0; k < 4; k++) roomSeg(ctx, [[x, y], [x + Math.cos(k * Math.PI / 2 + 0.4) * rad, y + Math.sin(k * Math.PI / 2 + 0.4) * rad]]);
  roomDot(ctx, x, y, 2.2, '#7a2a22');
}
// A pipe from a to b, horizontal or vertical, with a joint (a flange) every step.
function roomPipe(ctx, [ax, ay], [bx, by], step) {
  ctx.strokeStyle = '#3d5a7a'; ctx.lineWidth = 6; roomSeg(ctx, [[ax, ay], [bx, by]]);
  const len = Math.hypot(bx - ax, by - ay), across = ax === bx;
  for (let d = step / 2; d < len; d += step) { const x = ax + (bx - ax) * d / len, y = ay + (by - ay) * d / len; roomFlat(ctx, across ? x - 5 : x - 1.5, across ? y - 1.5 : y - 5, across ? 10 : 3, across ? 3 : 10, '#4f6f8f'); }
}

// Each room: (ctx, r, s, X, W) with X(share) the world x at that share of the width. A prop that does not fit the width is dropped, last listed first.
function roomEngine(ctx, r, s, X, W) {
  const { w, time } = s, F = r.floor, top = r.top, rx = X(0.5);
  const hot = (s.burning ? 0.55 : 0.25) + 0.45 * w.burn + 0.1 * Math.sin(time * 4) * w.burn;
  const core = w.burn > 0.5 ? '255,140,60' : w.flip > 0.5 ? '255,176,48' : '90,150,220';
  roomBox(ctx, rx - 40, top + 6, 80, F - top - 6, '#22384e'); for (let y = top + 20; y < F; y += 40) roomBox(ctx, rx - 40, y, 80, 5, '#2c4c6e');
  const g = ctx.createRadialGradient(rx, (top + F) / 2, 4, rx, (top + F) / 2, 120); g.addColorStop(0, `rgba(${core},${0.35 * hot})`); g.addColorStop(1, `rgba(${core},0)`); ctx.fillStyle = g; ctx.fillRect(rx - 120, top + 8, 240, F - top - 8);
  roomBox(ctx, rx - 12, top + 40, 24, F - top - 80, `rgba(${core},${0.35 + 0.5 * hot})`); roomBox(ctx, rx - 16, top + 36, 32, 4, '#3d5a7a'); roomBox(ctx, rx - 16, F - 40, 32, 4, '#3d5a7a');
  ctx.strokeStyle = '#3d5a7a'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(rx + 40, top + 30); ctx.quadraticCurveTo(rx + 94, top + 30, X(0.98), top + 16); ctx.stroke();
  worldText(ctx, s.zoom, 'REACTOR', rx - 36, F - 14, 10, '#c9a227');
  const lx = X(0.07); roomPipe(ctx, [lx, top + 8], [lx, F], 40); roomValve(ctx, lx, F - 30, 8);  // the coolant riser on the wall, its valve
  if (W >= 240) {  // the feed from the reactor to the drive, low along the deck: its gauge on a stem above it and its valve
    const py = F - 10; roomPipe(ctx, [rx + 40, py], [X(0.98), py], 30);
    const sx = X(0.62); ctx.strokeStyle = '#3d5a7a'; ctx.lineWidth = 2; roomSeg(ctx, [[sx, py], [sx, py - 16]]); roomGauge(ctx, sx, py - 26, 9, gaugeNeedle(w, time, 2));
    roomValve(ctx, X(0.9), py, 9);
  }
  if (W >= 240) {
    const bx = X(0.7);
    roomBox(ctx, bx, top + 38, 70, 46, '#1a2c40'); ctx.strokeStyle = '#8aa4c0'; ctx.lineWidth = 1.5;
    [[8, 26], [20, 20], [34, 30], [48, 16], [60, 24]].forEach(([dx, l]) => roomSeg(ctx, [[bx + dx, top + 46], [bx + dx, top + 46 + l]]));
    ctx.fillStyle = '#c9a227'; ctx.beginPath(); ctx.moveTo(bx - 20, top + 64); ctx.lineTo(bx - 10, top + 46); ctx.lineTo(bx, top + 64); ctx.fill();
  }
  if (W >= 270) {
    const px = X(0.14); roomBox(ctx, px - 6, F - 64, 12, 34, '#2c4c6e');
    for (let k = 0; k < 3; k++) roomDot(ctx, px, F - 58 + k * 10, 1.6, (Math.floor(time * 2 + k) % 3) ? '#2f5577' : '#ff8a6a');
  }
}

// Bunk k of n in the berths room r, in two tiers, a person long (BUNK, #972): its left end x, its length w, and y the top of its frame (the
// mattress lies on it, 5 deep). The columns stand either side of the ladder well (well: its band in world x, the room's middle by default), the
// left ones from BERTH_NAME in from the room's left wall, which is kept clear for the room's name plate (shiplife.js, 13px down to the smallest
// window, #937), and the right ones from its right wall. The bottom tier stands on its lockers, its mattress near the seated hip, and the top
// tier under the ceiling with room for a sleeper over each (#933). The berths draw their bunks here, and the cutaway lays its sleepers on them
// (shiplife.js). The bottom tier fills from the left and the top one from the right, so the top bunk at the left is the last one taken.
const BUNK = 90, BERTH_NAME = 116;
function berthBunk(r, n, k, well = { x0: (r.x0 + r.x1) / 2, x1: (r.x0 + r.x1) / 2 }) {
  const cols = Math.max(1, Math.ceil(n / 2)), left = Math.ceil(cols / 2), m = (r.x1 - r.x0) * 0.02, lm = Math.max(m, BERTH_NAME);
  const w = Math.min(BUNK, (well.x0 - r.x0 - lm) / left), col = k % 2 ? Math.floor(n / 2) - 1 - Math.floor(k / 2) : Math.floor(k / 2);
  return { x: col < left ? r.x0 + lm + col * w : r.x1 - m - (cols - col) * w, w, y: k % 2 ? r.floor - 58 : r.floor - 22 };
}
// Where the cutaway lays a sleeper on bunk b (berthBunk): the hip, the head on the pillow at its left end, and the mattress under them.
const berthSleeper = b => ({ x: b.x + b.w / 2, y: b.y - 5 });
// The place on bunk b kept for its owner's one thing (#934): a box on the wall over the foot half of the mattress, above the sleeper and under
// the curtain rail, clear of the bunk's own fittings, so the thing is drawn there without redrawing the bunk.
const berthKeep = b => ({ x: b.x + b.w - 34, y: b.y - 27, w: 16, h: 8 });

// A bunk of the berths (#933) at b (berthBunk), the frame with screws and a grab rail on its front, the mattress, the pillow under the
// sleeper's head, the blanket (spread over a sleeper, folded at the foot of an empty bunk), the curtain rail, the curtain (drawn back to the
// foot, or across the bunk: shut), the reading lamp over the pillow and, under the bottom tier, two locker doors latched shut with a vent and
// a stencilled plate. The place for its owner's thing (berthKeep) is left clear.
function roomBunk(ctx, b, F, slept, shut, low) {
  const n = v => Math.round(v * 100) / 100, x = n(b.x), w = n(b.w), y = n(b.y), yr = n(y - 30);
  if (low) {
    roomPart(ctx, roomRound(x + 1, y + 6, w - 2, F - y - 6, 1), '#182c40', { top: 0, side: 2 }); roomFlat(ctx, x + 3, F - 2, w - 6, 2, '#0f1d2c');
    const dw = n((w - 8) / 2);
    for (const j of [0, 1]) {
      const dx = n(x + 3 + j * (dw + 2));
      roomPart(ctx, roomRound(dx, y + 7.5, dw, F - y - 10.5, 1), '#1c3349', { top: 0.8, side: 1.2 });
      roomFlat(ctx, j ? dx + 2 : dx + dw - 4, y + 11, 2, 3.5, '#8796a5'); roomDot(ctx, j ? dx + 3 : dx + dw - 3, y + 10.2, 0.5, '#56708c');  // the latch
      for (let v = 0; v < 3; v++) roomFlat(ctx, dx + dw / 2 - 5 + v * 4, F - 6, 3, 0.8, '#0f1d2c');  // the vent
      if (!j) { roomFlat(ctx, dx + 4, y + 10, 8, 3, '#4a4436'); roomFlat(ctx, dx + 5, y + 11, 2, 1, '#2a261e'); roomFlat(ctx, dx + 8, y + 11, 3, 1, '#2a261e'); }  // the stencil
    }
  }
  roomPart(ctx, roomRound(x, y, w, 6, 1), '#1f3a56', { top: 1.2, under: 1.2 });
  roomPart(ctx, roomRound(x + w / 2 - 14, y + 2.2, 28, 1.6, 0.8), '#3a5470', { top: 0.5 });  // a grab rail for zero g
  for (const sx of [x + 3, x + w - 3]) roomDot(ctx, sx, y + 3, 0.6, '#56708c');
  roomPart(ctx, roomRound(x + 2, y - 5, w - 4, 5, 2), '#3a4a5e', { top: 1, under: 0.8 });
  roomPart(ctx, roomRound(x + 4, y - 9.5, 18, 4.5, 2), '#9a968a', { top: 0.8, side: 1.5 });
  if (slept) roomPart(ctx, roomRound(x + 20, y - 6.5, w - 24, 2.5, 1), '#334560', { top: 0.6 });
  else { roomPart(ctx, roomRound(x + w - 30, y - 9, 20, 4, 1.5), '#3e4f6e', { top: 1, side: 2 }); roomFlat(ctx, x + w - 29, y - 7.2, 18, 0.6, '#2c3a52'); }
  roomFlat(ctx, x + 2.5, y - 28, 2, 4, '#2a3e54'); ctx.strokeStyle = '#56708c'; ctx.lineWidth = 1; roomSeg(ctx, [[x + 3.5, y - 27], [x + 9, y - 26]]);  // the reading lamp
  roomPart(ctx, `M ${n(x + 6)} ${n(y - 26)} L ${n(x + 12)} ${n(y - 26)} L ${n(x + 14)} ${n(y - 22)} L ${n(x + 4)} ${n(y - 22)} Z`, '#4a5a6a', { top: 0.6, side: 1 });
  roomDot(ctx, x + 9, y - 21.6, 1, '#6a6048');
  for (const bx of [x + 2, x + w - 3.5]) roomFlat(ctx, bx, yr - 1, 1.5, 3, '#2a3e54');  // the curtain rail on its brackets
  roomPart(ctx, roomRound(x + 2, yr, w - 4, 1.6, 0.8), '#3a5470', { top: 0.5 });
  ctx.strokeStyle = '#3a2d48'; ctx.lineWidth = 0.8;
  if (shut) {  // drawn across the bunk, its folds hanging to a wavy hem
    let d = `M ${n(x + 3)} ${n(yr + 1.6)} L ${n(x + w - 3)} ${n(yr + 1.6)} L ${n(x + w - 3)} ${n(y - 1)}`;
    for (let f = 6; f >= 1; f--) { const a = x + 3 + (w - 6) * f / 6, h = x + 3 + (w - 6) * (f - 0.5) / 6; d += ` Q ${n(h)} ${n(y + 1)} ${n(a - (w - 6) / 6)} ${n(y - 1)}`; }
    roomPart(ctx, d + ' Z', '#4a3a5a', { top: 0.8, side: 2 });
    for (let f = 1; f < 6; f++) { const fx = x + 3 + (w - 6) * f / 6; roomSeg(ctx, [[fx, yr + 3], [fx, y - 2]]); }
  } else {  // drawn back to the foot of the bunk
    const cx = n(x + w - 8);
    roomPart(ctx, `M ${cx} ${n(yr + 1.6)} L ${n(cx + 5)} ${n(yr + 1.6)} Q ${n(cx + 6.5)} ${n(y - 16)} ${n(cx + 5.5)} ${n(y - 6)} Q ${n(cx + 2.5)} ${n(y - 4.5)} ${n(cx - 0.5)} ${n(y - 6)} Q ${n(cx + 1)} ${n(y - 16)} ${cx} ${n(yr + 1.6)} Z`, '#4a3a5a', { top: 0, side: 1.5 });
    roomSeg(ctx, [[cx + 2.5, yr + 3], [cx + 2.5, y - 7]]);
  }
}

// The berths (#933): the bunks in their columns on posts from the deck to the ceiling, either side of the well (roomBunk), the curtain shut on the
// third one ("z z" behind it at night in cruise); beside the well a shelf with its books strapped down and a reading lamp (its glow in cruise),
// the towel swinging on its hook and the guitar lashed to the wall. The top left is kept clear for the room's name (berthBunk).
function roomBerths(ctx, r, s, X, W) {
  const { w, time } = s, F = r.floor, n = Math.min(12, s.berths), well = s.well || { x0: (r.x0 + r.x1) / 2, x1: (r.x0 + r.x1) / 2 }, { w: cw } = berthBunk(r, n, 0, well);
  const shut = W >= 220 && n >= 3 ? 2 : -1, r2 = v => Math.round(v * 100) / 100;
  for (let k = 0; k < n; k++) roomBunk(ctx, berthBunk(r, n, k, well), F, k < s.asleep, k === shut, k % 2 === 0);
  const posts = new Set();
  for (let k = 0; k < n; k += 2) { const { x } = berthBunk(r, n, k, well); posts.add(r2(x)); posts.add(r2(x + cw)); }
  for (const px of posts) {  // the posts at each column's ends, bolted to the deck and the ceiling
    roomPart(ctx, roomRound(px - 2, F - 92, 4, 92, 1), '#2a4664', { top: 0, side: 1.2 });
    roomFlat(ctx, px - 3.5, F - 2, 7, 2, '#20384f'); for (const sy of [F - 90, F - 40]) roomDot(ctx, px, sy, 0.6, '#56708c');
  }
  if (shut >= 0 && s.asleep > 0 && w.cruise > 0.5) { const b = berthBunk(r, n, shut, well); worldText(ctx, s.zoom, Math.floor(time) % 2 ? 'z z' : 'z', b.x + cw - 24, b.y - 12, 12, '#9fb4c9'); }
  const sx = r2(well.x1 + 40), lx = sx + 14;  // the shelf
  if (W >= 300) {
    roomPart(ctx, roomRound(sx - 22, F - 64, 44, 3, 1), '#284a68', { top: 0.8, under: 1 });
    for (const bx of [sx - 18, sx + 16]) roomPart(ctx, `M ${r2(bx)} ${r2(F - 61)} L ${r2(bx + 2)} ${r2(F - 61)} L ${r2(bx + 2)} ${r2(F - 55)} Z`, '#20384f', { top: 0 });  // its brackets
    [[-19, 4, 9, '#8f8a7c'], [-14.5, 5, 10, '#4f7090'], [-9, 4, 8, '#8a7c5e'], [-4.5, 5, 9.5, '#5a6e5a']].forEach(([dx, bw, bh, col]) => roomPart(ctx, roomRound(sx + dx, F - 64 - bh, bw, bh, 0.6), col, { top: 0.6, side: 1 }));
    ctx.strokeStyle = '#5a4e3a'; ctx.lineWidth = 1; roomSeg(ctx, [[sx - 20, F - 69], [sx + 1, F - 69]]);  // the strap over the books
    roomPart(ctx, roomRound(lx - 4, F - 66, 8, 2, 0.8), '#3a4a5a', { top: 0.5 }); ctx.strokeStyle = '#56708c'; roomSeg(ctx, [[lx, F - 66], [lx + 2, F - 74]]);  // the lamp
    roomPart(ctx, `M ${r2(lx - 1)} ${r2(F - 77)} L ${r2(lx + 5)} ${r2(F - 77)} L ${r2(lx + 7)} ${r2(F - 72)} L ${r2(lx - 3)} ${r2(F - 72)} Z`, '#4a5a6a', { top: 0.6, side: 1 });
    roomDot(ctx, lx + 2, F - 71.5, 1.2, w.cruise > 0.05 ? '#e0c890' : '#6a6048');
    if (w.cruise > 0.05) { const g = ctx.createRadialGradient(lx + 2, F - 70, 1, lx + 2, F - 70, 50); g.addColorStop(0, `rgba(255,220,160,${0.35 * w.cruise})`); g.addColorStop(1, 'rgba(255,220,160,0)'); ctx.fillStyle = g; ctx.fillRect(lx - 48, F - 100, 100, 100); }
  }
  if (W >= 240) {  // the guitar, hung on its hook and lashed to the wall at the neck and the body
    const gx = r2(well.x1 + 112);
    roomFlat(ctx, gx - 2, F - 94, 4, 2, '#3a4a5a');
    roomPart(ctx, roomRound(gx - 1.8, F - 86, 3.6, 26, 1), '#4a3020', { top: 0, side: 1 });
    roomPart(ctx, roomRound(gx - 2.8, F - 92, 5.6, 7, 1.2), '#4a3020', { top: 0.6, side: 1 });
    for (const py of [F - 91, F - 89, F - 87]) for (const px of [gx - 3.6, gx + 2.8]) roomFlat(ctx, px, py, 0.8, 0.8, '#8796a5');  // the pegs
    roomPart(ctx, `M ${r2(gx)} ${r2(F - 25)} Q ${r2(gx + 9.5)} ${r2(F - 25)} ${r2(gx + 9)} ${r2(F - 36)} Q ${r2(gx + 8.5)} ${r2(F - 45)} ${r2(gx + 5)} ${r2(F - 46.5)} Q ${r2(gx + 7.5)} ${r2(F - 50)} ${r2(gx + 7)} ${r2(F - 54)} Q ${r2(gx + 6.5)} ${r2(F - 62)} ${r2(gx)} ${r2(F - 62)} Q ${r2(gx - 6.5)} ${r2(F - 62)} ${r2(gx - 7)} ${r2(F - 54)} Q ${r2(gx - 7.5)} ${r2(F - 50)} ${r2(gx - 5)} ${r2(F - 46.5)} Q ${r2(gx - 8.5)} ${r2(F - 45)} ${r2(gx - 9)} ${r2(F - 36)} Q ${r2(gx - 9.5)} ${r2(F - 25)} ${r2(gx)} ${r2(F - 25)} Z`, '#8a5e36', { top: 1, side: 2.5 });
    roomDot(ctx, gx, F - 44, 2.6, '#2a1a10'); roomFlat(ctx, gx - 3.5, F - 33, 7, 1.6, '#3a2414');
    ctx.strokeStyle = 'rgba(200,190,170,0.45)'; ctx.lineWidth = 0.4; for (const dx of [-0.8, 0, 0.8]) roomSeg(ctx, [[gx + dx, F - 85], [gx + dx, F - 33]]);
    for (const [y, half] of [[F - 70, 4], [F - 31, 9.5]]) roomPart(ctx, roomRound(gx - half, y, half * 2, 1.6, 0.6), '#3a3a40', { top: 0 });  // the lashings
  }
  if (W >= 260) {  // the towel on its hook: it swings, moved, not redrawn (a path given to roomPart is fixed per layout)
    const hx = r2(well.x1 + 84), [ex, ey] = hangEnd(hx, F - 60, 10, 1.3, w, time, s.still);
    roomFlat(ctx, hx - 1.5, F - 62, 3, 3, '#3a4a5a'); ctx.strokeStyle = '#7a8a9a'; ctx.lineWidth = 1; roomSeg(ctx, [[hx, F - 60], [ex, ey]]);
    ctx.save(); ctx.translate(ex, ey); roomPart(ctx, roomRound(-3.5, 0, 7, 11, 1.2), '#8a4a40', { top: 0.6, side: 1.5 }); roomFlat(ctx, -3, 7.5, 6, 1.2, '#6a3a32'); ctx.restore();
  }
}

// The galley's mess table (#925), the length of its bench, at seated height: drawn after the people (shiplife.js), so those sitting at it
// facing you are behind it, their laps under the top (#978). Its top on two pedestal legs, a tie-down rail along its front with rings for the
// lashings (#933); the plates and the mug on it; the lashings from its rings to the deck in the hard burn.
function roomMessTable(ctx, r, s) {
  const W = r.x1 - r.x0, X = sh => r.x0 + W * sh, F = r.floor, { w } = s, time = s.still ? 0 : s.time;
  if (W < 200) return;
  const tx = X(0.25), tw = X(0.73) - tx, rings = Array.from({ length: 6 }, (_, k) => tx + 14 + (tw - 28) * k / 5);
  for (const lx of [tx + 8, tx + tw - 13]) {
    roomPart(ctx, `M ${lx} ${F - 27} L ${lx + 5} ${F - 27} L ${lx + 4.2} ${F - 2.5} L ${lx + 0.8} ${F - 2.5} Z`, '#20384f', { top: 0, side: 1.6 });
    roomPart(ctx, roomRound(lx - 3.5, F - 2.8, 12, 2.8, 1), '#24405e', { top: 0.7 }); roomDot(ctx, lx - 1.5, F - 1.4, 0.6, '#56708c'); roomDot(ctx, lx + 6.5, F - 1.4, 0.6, '#56708c');
  }
  roomPart(ctx, roomRound(tx, F - 32, tw, 5, 1.5), '#2c4c6e', { top: 1.2, under: 1.2 });
  roomPart(ctx, roomRound(tx + 6, F - 27.6, tw - 12, 2.2, 1), '#4a6680', { top: 0.6 });  // the tie-down rail
  ctx.strokeStyle = '#6a8098'; ctx.lineWidth = 0.8; for (const x of rings) { ctx.beginPath(); ctx.arc(x, F - 24.4, 1.4, 0, Math.PI * 2); ctx.stroke(); }
  for (const f of [0.3, 0.45]) roomPart(ctx, roomRound(tx + tw * f - 1, F - 34.4, 10, 2.4, 1.1), '#aaa395', { top: 0 });
  roomDot(ctx, tx + tw * 0.45 + 3.5, F - 35, 1.6, '#8e4a3c');
  roomMug(ctx, tx + tw * 0.75, F - 34, w, time);
  if (w.burn > 0.5) { ctx.strokeStyle = 'rgba(140,170,200,0.5)'; ctx.lineWidth = 0.8; for (const x of rings) roomSeg(ctx, [[x, F - 23], [x + 5, F]]); }
}

// The galley (#933): a counter at the waist with its cupboards, latched, the knife strip over it and a pot plant on it, where the cook works
// (routineSpot); a water dispenser on the wall; latched cupboards at head height either side of the framed porthole, a grab rail under them;
// the stove under its hood at the far end, the pans on a rail. The top left is kept clear for the room's name and the top right for the thrust
// sign (both shiplife.js), down to the smallest window (#937).
function roomGalley(ctx, r, s, X, W) {
  const { w, time } = s, F = r.floor, latch = (x, y) => { roomFlat(ctx, x, y, 2, 4, '#8796a5'); roomDot(ctx, x + 1, y - 1.2, 0.5, '#56708c'); };
  const cupboards = (x0, x1, top, bottom) => {  // a wall cupboard of two doors, each with its latch where they meet
    roomPart(ctx, roomRound(x0, top, x1 - x0, bottom - top, 1.5), '#22405c', { top: 1.2, side: 2.5, under: 1.5 });
    const dw = (x1 - x0 - 6) / 2;
    for (const k of [0, 1]) { const dx = x0 + 2 + k * (dw + 2); roomPart(ctx, roomRound(dx, top + 2, dw, bottom - top - 5, 1.2), '#284a68', { top: 0.8, side: 1.2 }); latch(k ? dx + 2 : dx + dw - 4, bottom - 10); }
  };
  if (W >= 300) {
    const c0 = X(0.02), c1 = X(0.205);
    roomPart(ctx, roomRound(c0, F - 37, c1 - c0, 33, 1.5), '#1f3852', { top: 0, side: 3, under: 1.5 }); roomFlat(ctx, c0 + 2, F - 4, c1 - c0 - 4, 4, '#0f1d2c');
    const dw = (c1 - c0 - 9) / 2;
    for (const k of [0, 1]) { const dx = c0 + 3 + k * (dw + 3); roomPart(ctx, roomRound(dx, F - 34, dw, 27, 1.2), '#24405e', { top: 0.8, side: 1.4 }); latch(k ? dx + 2 : dx + dw - 4, F - 27); }
    roomPart(ctx, roomRound(c0 - 1.5, F - 41, c1 - c0 + 3, 4, 1.2), '#2c4c6e', { top: 1, under: 0.8 });  // the worktop, at the waist
    const k0 = X(0.075), k1 = X(0.155);  // the knife strip, its knives hung by their blades, handles down
    [[0.12, 5.5], [0.32, 4.5], [0.55, 6], [0.78, 3.8]].forEach(([f, len]) => {
      const x = k0 + (k1 - k0) * f;
      roomPart(ctx, `M ${x} ${F - 52} L ${x + 2.2} ${F - 52} L ${x + 2.2} ${F - 50 - len} L ${x} ${F - 52 - len} Z`, '#7d8995', { top: 0 });
      roomPart(ctx, roomRound(x - 0.2, F - 52, 2.6, 5.5, 0.9), '#3a2c24', { top: 0 });
    });
    roomPart(ctx, roomRound(k0, F - 55, k1 - k0, 3, 1), '#2a3a4a', { top: 0.8 });
    roomPlant(ctx, X(0.04), F - 47, w, time, s.still, 0.6);  // small, under the room's name
    const d0 = X(0.21), d1 = X(0.245), dm = (d0 + d1) / 2;  // the water dispenser: its bottle, the tap and the drip tray
    roomPart(ctx, roomRound(d0, F - 49, d1 - d0, 6, 1.2), '#2a4664', { top: 0.8, side: 1.5 });
    roomPart(ctx, roomRound(d0 + 1.5, F - 57.5, d1 - d0 - 3, 9, 2.2), '#3d6a86', { top: 1, side: 1.8 });
    roomFlat(ctx, d0 + 2.5, F - 53, d1 - d0 - 5, 0.8, '#6a9ab4');  // the water line
    roomFlat(ctx, dm - 1, F - 43, 2, 2.5, '#8796a5'); roomPart(ctx, roomRound(d0 + 1, F - 39.5, d1 - d0 - 2, 2, 0.8), '#2a4664', { top: 0.5 });
  }
  cupboards(X(0.25), X(0.39), F - 96, F - 74);
  worldText(ctx, s.zoom, 'MUGS', X(0.25) + 8, F - 79, 9, '#a8987a');
  roomPart(ctx, roomRound(X(0.25), F - 71.5, X(0.39) - X(0.25), 2, 1), '#3a5470', { top: 0.6 });  // a grab rail for zero g
  roomPorthole(ctx, X(0.47), F - 68, 13, s.spin);
  if (W >= 340) cupboards(X(0.55), X(0.63), F - 96, F - 74);
  if (W >= 240) {
    // The stove (#933): two burners on its top (the kettle on one, the ring lit while it steams in cruise), the oven door with its window, handle
    // and knobs, a cupboard beside it, and a hood over the burners; the pans hang on a rail past the hood, under the thrust sign (shiplife.js).
    const cx = X(0.74), cw = Math.min(100, W * 0.24), sw = cw * 0.55;
    roomPart(ctx, roomRound(cx + 3, F - 36, cw - 6, 32, 1.5), '#1b3550', { top: 0, side: 3 }); roomFlat(ctx, cx + 5, F - 4, cw - 10, 4, '#0f1d2c');
    roomPart(ctx, roomRound(cx + 8, F - 31, sw - 12, 25, 1.5), '#132538', { top: 1 }); roomFlat(ctx, cx + 12, F - 24, sw - 20, 12, '#2a1a10');
    roomPart(ctx, roomRound(cx + 11, F - 29, sw - 18, 2, 1), '#7a8794', { top: 0 });
    for (let k = 0; k < 3; k++) roomDot(ctx, cx + 14 + k * (sw - 20) / 2, F - 33.5, 1.2, '#7a8794');
    roomPart(ctx, roomRound(cx + sw + 2, F - 31, cw - sw - 10, 25, 1.5), '#132538', { top: 1, side: 1.5 }); latch(cx + sw + 5, F - 22);
    roomPart(ctx, roomRound(cx - 1, F - 41, cw + 2, 5, 1.2), '#2c4c6e', { top: 1.2, under: 1 });
    for (const bx of [cx + 6, cx + sw / 2 + 4]) { roomFlat(ctx, bx, F - 43, sw / 2 - 6, 2, '#0b1520'); if (bx === cx + 6 && w.cruise > 0.05) roomFlat(ctx, bx + 2, F - 43, sw / 2 - 10, 1, `rgba(255,122,58,${0.8 * w.cruise})`); }
    roomPart(ctx, `M ${cx + 26} ${F - 51} L ${cx + 31} ${F - 54} L ${cx + 32} ${F - 52.5} L ${cx + 26} ${F - 47} Z`, '#7d8a98', { top: 0 });  // the kettle's spout
    roomPart(ctx, roomRound(cx + 10, F - 55, 16, 12, 3.5), '#7d8a98', { top: 1, side: 3 }); roomPart(ctx, roomRound(cx + 15, F - 57, 6, 2, 0.8), '#4a5662', { top: 0 });
    roomPart(ctx, `M ${cx - 2} ${F - 61} L ${cx + sw + 2} ${F - 61} L ${cx + sw - 6} ${F - 71} L ${cx + 6} ${F - 71} Z`, '#56708c', { top: 1, under: 1.5 });
    for (let k = 0; k < 4; k++) roomFlat(ctx, cx + 9 + k * (sw - 14) / 4, F - 66.5, (sw - 14) / 4 - 3, 1.5, '#2c4c6e');  // the filter's slots
    if (W >= 320) {
      const p0 = cx + sw + 6, p1 = cx + cw - 2;
      roomPart(ctx, roomRound(p0, F - 64, p1 - p0, 2.5, 1), '#3d5a7a', { top: 0.8 });
      [[0.3, 6, 6], [0.75, 9, 7]].forEach(([f, l, rad], k) => {
        const ax = p0 + (p1 - p0) * f, [ex, ey] = hangEnd(ax, F - 61.5, l, k * 1.7, w, time, s.still);
        ctx.strokeStyle = '#7a8a9a'; ctx.lineWidth = 1.2; roomSeg(ctx, [[ax, F - 61.5], [ex, ey]]); roomDot(ctx, ex, ey + rad * 0.6, rad, '#4a5662');
        ctx.lineWidth = 0.9; ctx.strokeStyle = FIG_LINE; ctx.stroke(); roomDot(ctx, ex, ey + rad * 0.6, rad - 2, '#2e3842');
      });
    }
  }
}

function roomGunnery(ctx, r, s, X, W) {
  const { w, time } = s, F = r.floor, cx = X(0.04);
  // The fire-control station (#933): a desk with a sloped front, the targeting scope and the guns' charge on a raised panel, the two gun
  // grips on the desk, and the rounds left as a row of lit pips.
  const hot = w.burn > 0.5;
  roomBox(ctx, cx + 6, F - 34, 84, 34, '#1f3a56'); roomBox(ctx, cx, F - 42, 96, 8, '#2c4c6e');
  roomBox(ctx, cx + 8, F - 98, 80, 54, '#16293d'); roomFlat(ctx, cx + 8, F - 98, 80, 3, '#2c4c6e');
  roomScreen(ctx, cx + 14, F - 92, 34, 42, 'scope', time, hot);
  if (w.flip > 0.5) { roomScreen(ctx, cx + 54, F - 92, 28, 42, 'status', time); ctx.save(); ctx.translate(cx + 68, F - 71); ctx.rotate(s.spin * 0.5); ctx.fillStyle = '#ffb030'; ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(5, 8); ctx.lineTo(-5, 8); ctx.fill(); ctx.restore(); }
  else roomScreen(ctx, cx + 54, F - 92, 28, 42, 'bars', time, hot);
  for (const gx of [cx + 30, cx + 66]) { roomFlat(ctx, gx - 1, F - 50, 3, 8, '#5a6672'); roomBox(ctx, gx - 4, F - 58, 8, 9, '#3a4450'); roomFlat(ctx, gx - 2, F - 57, 4, 2, '#c0392b'); }  // the gun grips, a red trigger on each
  for (let k = 0; k < 8; k++) roomDot(ctx, cx + 14 + k * 9, F - 38, 1.4, k < 6 ? (hot ? '#ffb347' : '#7fd8a0') : '#2f5577');  // the rounds left
  for (let k = 0; k < 6; k++) roomDot(ctx, cx + 20 + k * 11, F - 24, 1.2, (Math.floor(time * 3 + k * 1.7) % 3) ? '#2f5577' : '#7fd8a0');
  if (W >= 150) {
    const ax = X(0.8); roomBox(ctx, ax, F - 96, 30, 96, '#1a2e44');
    for (let a = 0; a < 3; a++) for (let b = 0; b < 2; b++) { const x = ax + 3 + b * 13, y = F - 90 + a * 30; roomBox(ctx, x, y + 6, 9, 18, '#b8903a'); ctx.fillStyle = '#d8b060'; ctx.beginPath(); ctx.arc(x + 4.5, y + 6, 4.5, Math.PI, 0); ctx.fill(); }
    for (let a = 0; a < 3; a++) roomBox(ctx, ax, F - 70 + a * 30, 30, 3, '#0e1a28');
  }
  if (W >= 190) {
    const ax = X(0.8) + 15, [hx, hy] = hangEnd(ax - 6, F - 98, 8, 2.3, w, time, s.still);
    ctx.strokeStyle = '#3d5a7a'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(ax, F - 96); ctx.quadraticCurveTo(ax, r.top + 3, ax - 30, r.top + 2); ctx.stroke();
    ctx.strokeStyle = '#c9a227'; ctx.lineWidth = 1; roomSeg(ctx, [[ax - 6, F - 98], [hx, hy]]); roomDot(ctx, hx, hy + 2, 2.6, '#c9a227');
  }
  if (W >= 330) {
    const px = X(0.55); ctx.save(); ctx.translate(px, F - 92); ctx.rotate(-0.03); roomBox(ctx, 0, 0, 44, 32, '#c9b98f');
    worldText(ctx, s.zoom, 'MIND THE', 4, 12, 9, '#3a3226'); worldText(ctx, s.zoom, 'RECOIL', 4, 26, 12, '#3a3226'); ctx.restore();
  }
}

// The comms station (#919, #933): the rack of radios on the console at the bridge's aft post, where the slicer sits (POST_SEAT, shiplife.js); the
// rack's box (the radios and the screen under them) in the room's own world units, r its box (layoutBox). A tap on it opens Comms (game.js), as a
// tap on a room opens its console; the cutaway records where it was drawn (G.cutRack, shiplife.js).
const commsRackBox = r => ({ x: Math.round((r.x0 + (r.x1 - r.x0) * LAYOUTS.freighter.seats.bridge[0]) * 100) / 100 + 32, y: r.floor - 80, w: 34, h: 38 });
function roomCommsRack(ctx, r, s) {
  const b = commsRackBox(r);
  roomPart(ctx, roomRound(b.x, b.y, b.w, 23, 1.5), '#1b2f45', { top: 1, side: 1.2 });  // the rack, on the console's top
  for (let row = 0; row < 3; row++) {  // three radios, each a faceplate with a tuning knob and its lights, blinking on the clock (still under reduced motion: s.time is 0)
    const y = b.y + 2.5 + row * 6.5;
    roomPart(ctx, roomRound(b.x + 2.5, y, b.w - 5, 5, 0.6), '#0c1826', { top: 0 });
    roomDot(ctx, b.x + 6.5, y + 2.5, 1.5, '#3a5470');
    for (let col = 0; col < 3; col++) { const on = Math.sin(s.time * (1.3 + row * 0.7) + col * 2.1 + row) > -0.2; roomDot(ctx, b.x + 14 + col * 5, y + 2.5, 1.1, on ? (row === 0 ? '#c8903a' : '#4f9a5f') : '#24384c'); }
    roomDot(ctx, b.x + b.w - 4, y + 2.5, 0.6, '#56708c');  // a screw
  }
  ctx.font = `600 12px ${roomFont}`;  // the label at 12px on a dark plate over the rack, under the ceiling, as the rooms' names are; it may be wider than the rack
  const lw = ctx.measureText('COMMS').width / s.zoom, fs = 12 / s.zoom, pad = 3 / s.zoom, cx = b.x + b.w / 2, ly = Math.max(r.top + 1, b.y - fs * 1.25 - 1);
  ctx.fillStyle = 'rgba(6,13,22,0.85)'; ctx.fillRect(cx - lw / 2 - pad, ly, lw + pad * 2, fs * 1.25);
  worldText(ctx, s.zoom, 'COMMS', cx, ly + fs, fs, '#9fb4c9', 'center');
}

// The bridge's forward window (#933): the glass, a clear rectangle high on the wall over the consoles' screens, where the destination can be
// shown (#936); the frame and its struts are drawn round it and over it.
const bridgeGlass = r => { const W = r.x1 - r.x0; return { x: r.x0 + W * 0.56, y: r.floor - 92, w: W * 0.41, h: 28 }; };
// A pilot's seat at a post of the bridge (#933), facing forward (SEAT_FACE): its pan at the seated hip (23) on a pedestal bolted to the deck, the
// back behind it with a headrest at the seated head, and the harness, slack on the back when no one is strapped in.
function roomBridgeSeat(ctx, x, F) {
  roomPart(ctx, roomRound(x - 9, F - 2.5, 18, 2.5, 1), '#1c3249', { top: 0.6 });
  roomDot(ctx, x - 6.5, F - 1.2, 0.6, '#56708c'); roomDot(ctx, x + 6.5, F - 1.2, 0.6, '#56708c');  // its bolts
  roomPart(ctx, `M ${x - 2} ${F - 19} L ${x + 2} ${F - 19} L ${x + 2.5} ${F - 2.5} L ${x - 2.5} ${F - 2.5} Z`, '#1c3249', { top: 0, side: 1.2 });
  roomPart(ctx, roomRound(x - 11, F - 52, 2.5, 4, 0.8), '#1c3249', { top: 0 });  // the headrest's stem
  roomPart(ctx, `M ${x - 13} ${F - 20} L ${x - 8} ${F - 20} L ${x - 6.5} ${F - 49} L ${x - 11.5} ${F - 49} Z`, '#284664', { top: 1, side: -1.5 });
  roomPart(ctx, roomRound(x - 14, F - 59, 8, 8, 2.5), '#284664', { top: 1, side: -1.5 });
  roomPart(ctx, roomRound(x - 11, F - 23, 22, 5, 2), '#2e4a68', { top: 1, under: 1 });
  ctx.strokeStyle = '#5a4e3a'; ctx.lineWidth = 1.3;  // the harness: a shoulder strap down the back to its buckle, and the lap belt
  ctx.beginPath(); ctx.moveTo(x - 7.5, F - 47); ctx.quadraticCurveTo(x - 10.5, F - 36, x - 9, F - 24); ctx.moveTo(x - 9, F - 22); ctx.lineTo(x - 3, F - 21); ctx.stroke();
  roomFlat(ctx, x - 10.5, F - 35, 2.5, 2, '#7a8794');
}
// The bridge (#933): a console at waist height in front of each post (the seats are drawn by drawRoom), a screen on each, keys on its sloped top
// and a grab handle on its front; the comms station's rack on the aft post's console (the first); the throttle at the pilot's (the second),
// forward in the burn, and the bobblehead on the pilot's screen; the overhead panel along the ceiling with its switches and lights (the thrust
// light lit in the burn), a grab rail under it, and grab bars either side of the ladder's opening; the forward window with struts in its frame;
// and the master's certificate framed between the first two posts. The top left is kept clear for the room's name (shiplife.js), down to the
// smallest window (#937).
function roomBridge(ctx, r, s, X, W) {
  const { w, time, spin } = s, F = r.floor, g = bridgeGlass(r), n = v => Math.round(v * 100) / 100;
  roomPart(ctx, roomRound(g.x - 4, g.y - 4, g.w + 8, g.h + 7, 2.5), '#2a4560', { top: 1, under: 1.5 });  // the window's frame
  ctx.save(); ctx.beginPath(); ctx.rect(g.x, g.y, g.w, g.h); ctx.clip(); roomFlat(ctx, g.x, g.y, g.w, g.h, '#01040a');
  const cs = Math.cos(spin), sn = Math.sin(spin), mx = g.x + g.w / 2, my = g.y + g.h / 2;
  for (const [a, b, sz] of roomStars) { const sx = (a - 0.5) * g.w * 1.4, sy = (b - 0.5) * g.h * 1.6; roomDot(ctx, mx + sx * cs - sy * sn, my + sx * sn + sy * cs, sz, '#cfe3ff'); }
  const px = g.x + g.w - 14 + Math.sin(spin) * 40, pg = ctx.createRadialGradient(px, my + 6, 2, px, my + 6, 24); pg.addColorStop(0, '#c98a5a'); pg.addColorStop(1, 'rgba(120,70,40,0)'); ctx.fillStyle = pg; ctx.fillRect(g.x, g.y, g.w, g.h);
  roomFlat(ctx, g.x, g.y, g.w * 0.3, g.h, 'rgba(160,200,255,0.05)'); ctx.restore();
  ctx.strokeStyle = '#132538'; ctx.lineWidth = 1; ctx.strokeRect(g.x - 0.5, g.y - 0.5, g.w + 1, g.h + 1);  // the gasket
  for (let k = 1; k < 4; k++) {  // the struts
    const sx = n(g.x + g.w * k / 4);
    roomPart(ctx, roomRound(sx - 2, g.y - 1, 4, g.h + 2, 0.8), '#2a4560', { top: 0, side: 1.2 }); roomDot(ctx, sx, g.y + 2, 0.7, '#56708c'); roomDot(ctx, sx, g.y + g.h - 2, 0.7, '#56708c');
  }
  // the overhead panel: a row of toggle switches, its lights at the end (the drive's, the thrust light in the burn, the flip's), a grab rail under it
  const o0 = n(X(0.23)), o1 = n(X(0.45)), T = r.top;
  roomPart(ctx, roomRound(o0, T + 3, o1 - o0, 10, 2), '#1d3550', { top: 0, under: 1.5 });
  for (let x = o0 + 8; x < o1 - 40; x += 9) { roomFlat(ctx, x, T + 7, 1.2, 3.5, '#8796a5'); roomDot(ctx, x + 0.6, T + 7, 0.8, '#56708c'); }
  [w.burn + w.cruise > 0.5 ? '#4f9a5f' : '#2f3f50', w.burn > 0.5 ? '#c8604a' : '#2f3f50', w.flip > 0.5 ? '#c8903a' : '#2f3f50', Math.floor(time * 1.5) % 2 ? '#4f8ab0' : '#2f3f50']
    .forEach((col, k) => roomDot(ctx, o1 - 32 + k * 7, T + 8, 1.6, col));
  for (const x of [o0 + 3, o1 - 3]) roomDot(ctx, x, T + 8, 0.7, '#56708c');
  for (let k = 0; k < 4; k++) roomFlat(ctx, o0 + 14 + k * (o1 - o0 - 30) / 3, T + 13, 1.5, 4, '#2a3e54');
  roomPart(ctx, roomRound(o0 + 10, T + 16.5, o1 - o0 - 20, 2, 1), '#3a5470', { top: 0.6 });
  for (const gx of [n(X(0.48) - 7), n(X(0.52) + 4)]) {  // grab bars either side of the ladder's opening, for coming up it in zero g
    roomFlat(ctx, gx - 1, F - 62, 5, 1.5, '#2a3e54'); roomFlat(ctx, gx - 1, F - 16.5, 5, 1.5, '#2a3e54');
    roomPart(ctx, roomRound(gx, F - 64, 3, 50, 1.5), '#3a5470', { top: 0.6, side: 1 });
  }
  const lx = n(X(0.222));  // the master's certificate: a seal and lines, no word (it would be wider than the frame at 12px)
  roomPart(ctx, roomRound(lx, F - 74, 34, 26, 1.5), '#3a2c20', { top: 1, side: 1.5 }); roomPart(ctx, roomRound(lx + 3, F - 71, 28, 20, 0.5), '#a39b84', { top: 0 });
  for (const dy of [5, 9, 13]) roomFlat(ctx, lx + 7, F - 71 + dy, dy === 5 ? 20 : 14, 1.2, '#6e6656');
  roomDot(ctx, lx + 25, F - 56, 2.6, '#8e3a32'); for (const sx of [lx + 2, lx + 32]) roomDot(ctx, sx, F - 72, 0.6, '#56708c');
  SEATS.bridge.forEach((f, i) => {  // the consoles, each in front of its post
    const x = n(X(f)), x1 = x + 70, slope = u => F - 36 - 6 * (u - x - 17) / 53;
    roomPart(ctx, `M ${x + 24} ${F - 33} L ${x1 - 2} ${F - 33} L ${x1 - 2} ${F - 1} L ${x + 30} ${F - 1} L ${x + 30} ${F - 9} L ${x + 24} ${F - 12} Z`, '#1f3a56', { top: 0, side: 3 });
    roomPart(ctx, roomRound(x + 35, F - 29, 24, 19, 1.2), '#22405c', { top: 0.8, side: 1.2 });  // its access panel, screwed shut, and a vent
    for (const [sx, sy] of [[x + 37, F - 27], [x + 57, F - 27], [x + 37, F - 12], [x + 57, F - 12]]) roomDot(ctx, sx, sy, 0.6, '#56708c');
    for (let k = 0; k < 4; k++) roomFlat(ctx, x + 40 + k * 4, F - 6, 2.5, 1, '#0f1d2c');
    for (let k = 0; k < 3; k++) { roomFlat(ctx, x + 27, F - 29 + k * 5, 3, 1.2, '#2a3e54'); roomFlat(ctx, x + 28, F - 30.5 + k * 5, 1, 2, '#8796a5'); }  // the switches
    roomPart(ctx, roomRound(x + 21, F - 30, 2, 13, 1), '#3a5470', { top: 0.5 });  // a grab handle
    roomPart(ctx, `M ${x + 17} ${F - 33} L ${x + 17} ${F - 36} L ${x1} ${F - 42} L ${x1} ${F - 33} Z`, '#2c4c6e', { top: 0, under: 1 });
    ctx.strokeStyle = figShade('#2c4c6e', 1.5); ctx.lineWidth = 1; roomSeg(ctx, [[x + 17.5, F - 35.5], [x1 - 0.5, F - 41.5]]);  // its lit edge
    for (let k = 0; k < 5; k++) { const kx = x + 34 + k * 6; roomFlat(ctx, kx, slope(kx) + 1.6, 3, 1.2, (Math.floor(time * 2 + k * 2.3 + i) % 4) ? '#2f5577' : '#c8903a'); }  // the keys
    roomScreen(ctx, x + 36, F - 56, 26, 11, i % 2 ? 'status' : 'plot', time);
    if (i === 0) roomCommsRack(ctx, r, s);
    if (i === 1) {
      const tx = x + 27, ty = n(slope(tx)), lean = -0.35 + 0.5 * w.burn;  // the throttle, forward in the burn
      roomPart(ctx, roomRound(tx - 3.5, ty - 2, 7, 2.5, 1), '#3a4a5a', { top: 0.6 });
      ctx.strokeStyle = '#7d8a98'; ctx.lineWidth = 1.8; roomSeg(ctx, [[tx, ty - 1], [tx + Math.sin(lean) * 11, ty - 1 - Math.cos(lean) * 11]]);
      roomDot(ctx, tx + Math.sin(lean) * 11, ty - 1 - Math.cos(lean) * 11, 2.2, '#a8584a'); ctx.lineWidth = 0.9; ctx.strokeStyle = FIG_LINE; ctx.stroke();
      const bx = x + 56, bob = Math.sin(time * 6) * (2 * w.cruise + 4 * w.flip) - 1.5 * w.burn;  // the bobblehead on the pilot's screen, nodding
      roomPart(ctx, roomRound(bx - 2.5, F - 63, 5, 4, 1), '#6a5a44', { top: 0.6 });
      ctx.save(); ctx.translate(0, bob); roomDot(ctx, bx, F - 66, 3, '#8a7660'); ctx.lineWidth = 0.9; ctx.strokeStyle = FIG_LINE; ctx.stroke(); ctx.restore();
    }
  });
}

function roomHold(ctx, r, s, X, W) {
  const { w, time } = s, F = r.floor, n = Math.round(12 * s.cargo), cw = Math.min(50, W * 0.14), top = F - 90;
  const cols = [['#2f4f6f', 'ICE'], ['#6a3a34', 'MED'], ['#5a5030', 'FRAG'], ['#3f5a3a', 'PARTS'], ['#4a4a5a', '']];
  for (let k = 0; k < n; k++) {
    const x = X(0.03) + Math.floor(k / 3) * (cw + 2), tier = k % 3, y = F - 30 * (tier + 1), [col, lab] = cols[(k * 7 + Math.floor(k / 3)) % cols.length];
    roomBox(ctx, x, y, cw, 30, col); ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 1; ctx.strokeRect(x + 3.5, y + 3.5, cw - 7, 23); if (lab && tier === 0) worldText(ctx, s.zoom, lab, x + 5, y + 20, 10, 'rgba(230,220,190,0.7)');
  }
  if (n > 0) {
    const a = X(0.02), b = X(0.03) + Math.ceil(n / 3) * (cw + 2) + 2, bulge = w.flip * (s.still ? 3 : 3 + Math.sin(time) * 2), nt = F - 30 * Math.min(3, n) - 4;
    ctx.strokeStyle = 'rgba(180,170,140,0.55)'; ctx.lineWidth = 1;
    for (let x = a; x <= b; x += 10) { ctx.beginPath(); ctx.moveTo(x, nt - bulge); ctx.lineTo(x + 6, F); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(a, nt - bulge); ctx.quadraticCurveTo((a + b) / 2, nt - bulge * 2, b, nt - bulge); ctx.stroke();
  }
  if (W >= 300) {
    const jx = X(0.7); roomBox(ctx, jx, F - 10, 50, 6, '#c9a227'); roomBox(ctx, jx + 44, F - 40, 4, 32, '#c9a227'); roomDot(ctx, jx + 8, F - 2, 3, '#222'); roomDot(ctx, jx + 40, F - 2, 3, '#222');
    const lx = X(0.84), [ex, ey] = hangEnd(lx, top + 6, 16, 0.7, w, time, s.still); ctx.strokeStyle = '#7a8a9a'; ctx.lineWidth = 1; roomSeg(ctx, [[lx, top + 6], [ex, ey]]); roomBox(ctx, ex - 5, ey, 10, 6, '#ffe2b8');
  }
  if (w.flip > 0.05 && !s.still) { ctx.save(); ctx.globalAlpha = w.flip; ctx.translate(X(0.6) + Math.sin(time * 0.4) * 24, F - 80 + Math.cos(time * 0.5) * 8); ctx.rotate(time * 0.6); roomBox(ctx, -5, -4, 10, 8, '#c9a227'); roomBox(ctx, -5, -8, 3, 5, '#c9a227'); ctx.restore(); }
}

function roomMedbay(ctx, r, s, X, W) {
  const { w, time } = s, F = r.floor, bx = X(0.2), bw = Math.min(112, W * 0.34);
  roomBox(ctx, bx, F - 30, bw, 6, '#3a4a5e'); roomBox(ctx, bx, F - 36, bw, 7, '#dde4ea'); roomBox(ctx, bx + 2, F - 42, 22, 7, '#eef2f6');
  for (const f of [0.38, 0.72]) roomBox(ctx, bx + bw * f, F - 37, 4, 9, '#1a1a1a');
  roomBox(ctx, bx + 8, F - 24, 4, 24, '#2a4664'); roomBox(ctx, bx + bw - 12, F - 24, 4, 24, '#2a4664');
  if (W >= 200) {
    const px = X(0.62); roomBox(ctx, px, F - 96, 3, 96, '#8aa4c0'); const [ix, iy] = hangEnd(px + 2, F - 94, 8, 3.1, w, time, s.still);
    roomBox(ctx, ix - 5, iy, 10, 14, 'rgba(200,230,255,0.75)'); ctx.strokeStyle = 'rgba(200,230,255,0.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(ix, iy + 14); ctx.quadraticCurveTo(px - 20, F - 50, bx + bw - 14, F - 38); ctx.stroke();
  }
  if (W >= 260) {
    const mx = X(0.7), mw = Math.min(64, W * 0.2); roomBox(ctx, mx, F - 92, mw, 34, '#04101a'); ctx.strokeStyle = s.patient ? '#ffb030' : '#7fd8a0'; ctx.lineWidth = 1.2; ctx.beginPath();  // amber and quicker with a patient
    for (let x = 0; x < mw - 4; x++) { const u = (x + time * (s.patient ? 60 : 30)) % 30, y = u > 12 && u < 15 ? (u < 13.5 ? -12 : 8) : 0; if (x) ctx.lineTo(mx + 2 + x, F - 75 + y); else ctx.moveTo(mx + 2, F - 75 + y); } ctx.stroke();
  }
  if (W >= 240) {  // the supply cabinet under the monitor (#933): two doors with handles, a cross on one; bottles and a kit on its top
    const cx = X(0.76), cw = X(0.97) - cx;
    roomBox(ctx, cx + 2, F - 38, cw - 4, 38, '#c9d3dc'); roomBox(ctx, cx, F - 42, cw, 4, '#dde4ea'); roomFlat(ctx, cx + cw / 2 - 0.5, F - 35, 1, 32, '#8a96a2');
    for (const hx of [cx + cw / 2 - 5, cx + cw / 2 + 3]) roomFlat(ctx, hx, F - 24, 2, 6, '#9aa8b6');
    roomFlat(ctx, cx + 9, F - 28, 6, 2, '#c03a30'); roomFlat(ctx, cx + 11, F - 30, 2, 6, '#c03a30');
    for (const bx of [cx + 5, cx + 12]) { roomBox(ctx, bx, F - 52, 5, 10, '#7fb8c8'); roomFlat(ctx, bx + 1, F - 54, 3, 2, '#dde4ea'); }
    roomBox(ctx, cx + cw - 22, F - 52, 18, 10, '#eef2f6'); roomFlat(ctx, cx + cw - 14, F - 51, 2, 8, '#c03a30'); roomFlat(ctx, cx + cw - 17, F - 48, 8, 2, '#c03a30');
  }
  if (W >= 300) { const cx = X(0.04); roomBox(ctx, cx, F - 92, 40, 40, '#d8dde4'); roomBox(ctx, cx + 17, F - 85, 7, 24, '#c03a30'); roomBox(ctx, cx + 9, F - 77, 23, 8, '#c03a30'); }
}

// The lamp: a pool of light mixing red (burn), warm (cruise) and a pulsing amber (flip), dimmed at night unless the room keeps its lights.
function drawPhaseLight(ctx, r, w, time, night, keepsLights) {
  const lamp = roomMix([[255, 90, 70], [255, 226, 184], [255, 176, 48]], [w.burn, w.cruise, w.flip]);
  const pulse = 1 - w.flip * 0.35 * (0.5 + 0.5 * Math.sin(time * 6)), dim = keepsLights ? 1 : 1 - 0.7 * night, W = r.x1 - r.x0, n = W > 380 ? 2 : 1;
  ctx.save(); ctx.beginPath(); ctx.rect(r.x0, r.top, W, r.floor - r.top); ctx.clip();
  for (let k = 0; k < n; k++) {
    const x = r.x0 + W * (k + 1) / (n + 1), g = ctx.createRadialGradient(x, r.top, 2, x, r.top, 160);
    g.addColorStop(0, `rgba(${lamp},${0.2 * pulse * dim})`); g.addColorStop(1, `rgba(${lamp},0)`); ctx.fillStyle = g; ctx.fillRect(x - 160, r.top, 320, r.floor - r.top);
    roomBox(ctx, x - 12, r.top, 24, 3, `rgba(${lamp},${0.4 + 0.6 * dim})`);
    if (w.flip > 0.05) roomDot(ctx, x, r.top + 3, 3, `rgba(255,176,48,${0.4 + 0.6 * w.flip * (0.5 + 0.5 * Math.sin(time * 6))})`);
  }
  roomBox(ctx, r.x0, r.top, W, r.floor - r.top, `rgba(${lamp},${(0.05 + w.burn * 0.05) * dim})`); ctx.restore();
}

// The thrust sign: the phase and the g reading, centred on x with its top at y (FLIP SECURE alternates with FLIP every two seconds), on a
// plate screwed to the wall (#933): a bevelled frame, lit along its top, the dark face the reading is lit on, and a screw at each corner.
function drawThrustSign(ctx, x, y, g, w, time, zoom) {
  const ph = w.flip > 0.5 ? 'flip' : w.burn > 0.5 ? 'burn' : 'cruise';
  const txt = ph === 'flip' && Math.floor(time) % 4 < 2 ? 'FLIP SECURE' : (ph === 'burn' ? 'THRUST ' : ph === 'cruise' ? 'CRUISE ' : 'FLIP ') + g.toFixed(2) + ' G';
  const bw = 112, l = x - bw / 2, rr = x + bw / 2;
  roomPart(ctx, `M ${l + 3} ${y} L ${rr - 3} ${y} L ${rr} ${y + 3} L ${rr} ${y + 15} L ${rr - 3} ${y + 18} L ${l + 3} ${y + 18} L ${l} ${y + 15} L ${l} ${y + 3} Z`, '#1f3449', { top: 1, under: 1 });
  roomPart(ctx, roomRound(l + 6, y + 2.5, bw - 12, 13, 1), '#081019', { top: 0 });
  for (const [sx, sy] of [[l + 3, y + 3.5], [rr - 3, y + 3.5], [l + 3, y + 14.5], [rr - 3, y + 14.5]]) roomDot(ctx, sx, sy, 0.9, '#56708c');
  worldText(ctx, zoom, txt, x, y + 13, 12, { burn: '#ff6a52', cruise: '#9fe0b0', flip: '#ffb030' }[ph], 'center');
}

// The hull's damage on a marked room's wall (shiplife.js shipState): a scorch, a panel hanging open with bare cable behind it, and now and then a few
// sparks, brighter in the dark. By the drawing's clock, not dice, so a frame is the same each time it is drawn.
function drawDamage(ctx, r, s) {
  const px = r.x0 + (r.x1 - r.x0) * 0.7, top = r.floor - 90, beat = Math.floor(s.time * 7);
  ctx.fillStyle = 'rgba(20,12,8,0.3)'; ctx.beginPath(); ctx.ellipse(px + 13, top + 15, 26, 18, 0, 0, Math.PI * 2); ctx.fill();
  roomBox(ctx, px, top, 26, 30, '#05080c');
  ctx.save(); ctx.translate(px, top + 2); ctx.rotate(0.5); roomBox(ctx, -3, 0, 4, 28, '#4a5a6e'); ctx.restore();  // the panel's door, hanging
  ctx.strokeStyle = '#c8a050'; ctx.lineWidth = 1.5; ctx.beginPath();
  ctx.moveTo(px + 7, top + 4); ctx.quadraticCurveTo(px + 4, top + 40, px + 12, top + 46); ctx.moveTo(px + 18, top + 4); ctx.quadraticCurveTo(px + 22, top + 36, px + 16, top + 48); ctx.stroke();
  if (beat % 5 === 0) {
    ctx.strokeStyle = s.night > 0.5 ? '#fff4c0' : '#ffd070'; ctx.lineWidth = 1.2; ctx.beginPath();
    for (let i = 0; i < 3; i++) { const a = 0.4 + i * 1.1 + (beat % 3) * 0.7; ctx.moveTo(px + 13, top + 28); ctx.lineTo(px + 13 + Math.cos(a) * 8, top + 28 + Math.sin(a) * 8); }
    ctx.stroke();
  }
}

// The tower's rooms with no fittings yet (#972; their own are step 3, #973): the walls drawRoom gives every room, and the name the cutaway puts on each.
const roomPlain = () => {};
const ROOM_DRAW = { engine: roomEngine, berths: roomBerths, galley: roomGalley, gunnery: roomGunnery, bridge: roomBridge, hold: roomHold, medbay: roomMedbay,
  head: roomPlain, workshop: roomPlain, airlock: roomPlain, lifesupport: roomPlain };
// A room, r = { x0, x1, top, floor } in world units, drawn for the state s (w, time, zoom, spin, still, berths, cargo, fuel, burning, night, asleep): walls, props, then its lamp.
// Which way someone on a room's chair faces (#985): the bridge's and the guns' toward their consoles, the chair's back behind them (#933), the
// medbay's stool toward the cot. The galley's bench is not here: at the mess table people face you.
const SEAT_FACE = { bridge: 1, gunnery: -1, medbay: -1 };
function drawRoom(ctx, id, r, s) {
  if (s.still) s = { ...s, time: 0 };  // reduced motion: the clock stops, so nothing sways, floats, scrolls or pulses
  const W = r.x1 - r.x0;
  roomWalls(ctx, r, s.w, s.time, s.still);
  ROOM_DRAW[id](ctx, r, s, sh => r.x0 + W * sh, W);
  const seats = SEATS[id] || [];  // its seats (shiplife.js), where people sit (#925): the galley's on one bench along the mess table, a pilot's seat at each post of the bridge, a stool anywhere else
  if (id === 'galley' && seats.length) roomBench(ctx, r.x0 + W * seats[0] - 14, r.x0 + W * seats[seats.length - 1] + 14, r.floor);
  else if (id === 'bridge') for (const f of seats) roomBridgeSeat(ctx, Math.round((r.x0 + W * f) * 100) / 100, r.floor);  // a pilot's seat at each post (#933)
  else for (const f of seats) roomStool(ctx, r.x0 + W * f, r.floor, id === 'medbay' ? 0 : SEAT_FACE[id] || 0);  // a station's chair faces its console (#933); the medbay's is a stool
  const marked = !!(s.damage && s.damage.marks.has(id));
  if (marked) drawDamage(ctx, r, s);
  if (!(marked && s.damage.severe && Math.floor(s.time * 11) % 4 === 0)) drawPhaseLight(ctx, r, s.w, s.time, s.night, id === 'bridge' || id === 'engine');  // severe damage: the lamp flickers
}
