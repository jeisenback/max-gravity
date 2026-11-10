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

function roomPorthole(ctx, x, y, rad, spin) {
  ctx.fillStyle = '#2a405a'; ctx.beginPath(); ctx.arc(x, y, rad + 4, 0, Math.PI * 2); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2); ctx.clip(); roomBox(ctx, x - rad, y - rad, rad * 2, rad * 2, '#01040a');
  const cs = Math.cos(spin), sn = Math.sin(spin);
  for (const [a, b, sz] of roomStars) { const sx = (a - 0.5) * rad * 2.4, sy = (b - 0.5) * rad * 2.4; roomDot(ctx, x + sx * cs - sy * sn, y + sx * sn + sy * cs, sz, '#cfe3ff'); }
  roomBox(ctx, x - rad, y - rad, rad, rad * 2, 'rgba(160,200,255,0.08)'); ctx.restore();
  for (let k = 0; k < 8; k++) roomDot(ctx, x + Math.cos(k * Math.PI / 4) * (rad + 2), y + Math.sin(k * Math.PI / 4) * (rad + 2), 1.1, '#4a6a8a');
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
// The galley's bench (#925): one long seat from x0 to x1 in front of the mess table, on legs, where the table's places are (SEATS, shiplife.js).
function roomBench(ctx, x0, x1, F) {
  roomBox(ctx, x0, F - 19, x1 - x0, 5, '#2a4664'); roomBox(ctx, x0 + 2, F - 14, x1 - x0 - 4, 2, '#1c3249');
  const legs = Math.max(2, Math.round((x1 - x0) / 60) + 1);
  for (let k = 0; k < legs; k++) roomBox(ctx, x0 + 4 + (x1 - x0 - 12) * (k / (legs - 1)), F - 14, 4, 14, '#1c3249');
}
function roomStool(ctx, x, F, back) {  // back: a chair's back on the left (1) or the right (-1) of the seat, for a station's chair (#933); none on a stool
  if (back) { const bx = back > 0 ? x - 12 : x + 7; roomBox(ctx, bx, F - 50, 6, 34, '#2a4664'); roomFlat(ctx, bx + 1, F - 46, 4, 12, '#203a55'); }
  roomBox(ctx, x - 10, F - 19, 20, 6, '#2a4664'); roomFlat(ctx, x - 2, F - 13, 4, 13, '#1c3249'); roomFlat(ctx, x - 8, F - 3, 16, 3, '#1c3249');
}
// A mug in a holder ring on the table: free in cruise (it steams), clipped in at the flip (no steam), in the ring in the burn.
function roomMug(ctx, x, y, w, time) {
  const free = w.cruise, lift = 3 * free;
  ctx.strokeStyle = '#7a8a9a'; ctx.lineWidth = 1.5; ctx.strokeRect(x - 6, y - 4, 12, 4);
  roomBox(ctx, x - 4, y - 9 - lift, 8, 9, '#cfe3ff'); ctx.strokeStyle = '#cfe3ff'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(x + 5, y - 5 - lift, 2.5, -Math.PI / 2, Math.PI / 2); ctx.stroke();
  if (w.flip > 0.5) roomBox(ctx, x - 6, y - 7, 12, 2, '#7a8a9a');
  if (free > 0.05) { ctx.strokeStyle = `rgba(220,230,240,${0.35 * free})`; ctx.lineWidth = 1; for (let k = 0; k < 2; k++) { const y0 = y - 12 - lift, ph = time * 2 + k * 2; ctx.beginPath(); ctx.moveTo(x - 2 + k * 4, y0); ctx.quadraticCurveTo(x + Math.sin(ph) * 3, y0 - 6, x - 1 + k * 3 + Math.sin(ph + 1) * 3, y0 - 12); ctx.stroke(); } }
}
function roomPlant(ctx, x, y, w, time, still) {
  roomBox(ctx, x - 6, y, 12, 10, '#8a5a3a'); const droop = w.burn * 0.9 - w.flip * 0.5; ctx.strokeStyle = '#5fae5a'; ctx.lineWidth = 1.8;
  for (const [a, l, sd] of [[-0.9, 11, 0], [-0.3, 14, 1], [0.35, 13, 2], [0.95, 10, 3]]) {
    const ang = a * (1 - w.burn * 0.3) + (still ? 0 : Math.sin(time * 1.1 + sd) * 0.25 * w.flip);
    ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + Math.sin(ang) * l * 0.4, y - l * 0.7, x + Math.sin(ang) * l, y - Math.cos(ang) * l * (1 - droop * 0.7) + droop * 6); ctx.stroke();
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

// Bunk k of n in the berths room r, in two tiers, a person long (BUNK, #972): its left end x, its length w, and y the bottom of its frame (the
// mattress lies on it, 5 deep). The columns stand either side of the ladder well (well: its band in world x, the room's middle by default), the
// left ones from the room's left wall and the right ones from its right wall. The berths draw their bunks here, and the cutaway lays its sleepers
// on them (shiplife.js). The bottom tier fills from the left and the top one from the right, so the top bunk at the left, under the room's
// name plate, is the last one taken.
const BUNK = 90;
function berthBunk(r, n, k, well = { x0: (r.x0 + r.x1) / 2, x1: (r.x0 + r.x1) / 2 }) {
  const cols = Math.max(1, Math.ceil(n / 2)), left = Math.ceil(cols / 2), m = (r.x1 - r.x0) * 0.02;
  const w = Math.min(BUNK, (well.x0 - r.x0 - m) / left), col = k % 2 ? Math.floor(n / 2) - 1 - Math.floor(k / 2) : Math.floor(k / 2);
  return { x: col < left ? r.x0 + m + col * w : r.x1 - m - (cols - col) * w, w, y: k % 2 ? r.floor - 56 : r.floor - 8 };
}
// Where the cutaway lays a sleeper on bunk b (berthBunk): the hip, the head on the pillow at its left end, and the mattress under them.
const berthSleeper = b => ({ x: b.x + b.w / 2, y: b.y - 5 });

function roomBerths(ctx, r, s, X, W) {
  const { w, time } = s, F = r.floor, n = Math.min(12, s.berths), { w: cw } = berthBunk(r, n, 0, s.well);
  for (let k = 0; k < n; k += 2) { const { x } = berthBunk(r, n, k, s.well); for (const px of [x, x + cw]) roomBox(ctx, px - 2, F - 96, 4, 96, '#2a4664'); }  // the posts at each column's ends
  for (let k = 0; k < n; k++) {
    const { x: bx, y } = berthBunk(r, n, k, s.well);
    roomBox(ctx, bx, y, cw, 8, '#1f3a56'); roomBox(ctx, bx + 2, y - 5, cw - 4, 5, '#3a4a5e'); roomBox(ctx, bx + 3, y - 9, 12, 4, '#d8d2c4');
    if (k < s.asleep) roomBox(ctx, bx + 16, y - 9, cw - 20, 5, '#334560');
  }
  if (W >= 220 && n >= 3) {
    const bx = berthBunk(r, n, 2, s.well).x; roomBox(ctx, bx + 3, F - 50, cw - 6, 42, '#4a3a5a'); for (const sx of [bx + 10, bx + cw - 12]) roomBox(ctx, sx, F - 50, 3, 42, '#1a1a1a');
    if (s.asleep > 0 && w.cruise > 0.5) worldText(ctx, s.zoom, Math.floor(time) % 2 ? 'z z' : 'z', bx + cw - 18, F - 54, 12, '#9fb4c9');
  }
  const lx = X(0.58);
  if (W >= 300) {
    roomBox(ctx, lx - 20, F - 54, 40, 3, '#2a4664'); for (const [dx, c] of [[-16, '#d8d2c4'], [-2, '#6f9ec8'], [10, '#d9c8a0']]) roomBox(ctx, lx + dx, F - 64, 10, 10, c);
    if (w.cruise > 0.05) { const g = ctx.createRadialGradient(lx + 20, F - 54, 1, lx + 20, F - 54, 50); g.addColorStop(0, `rgba(255,220,160,${0.35 * w.cruise})`); g.addColorStop(1, 'rgba(255,220,160,0)'); ctx.fillStyle = g; ctx.fillRect(lx - 30, F - 100, 100, 100); }
  }
  if (W >= 240) {
    const gx = X(0.74); ctx.fillStyle = '#9a6a3a'; ctx.beginPath(); ctx.ellipse(gx, F - 36, 9, 11, 0, 0, Math.PI * 2); ctx.ellipse(gx, F - 54, 7, 8, 0, 0, Math.PI * 2); ctx.fill();
    roomBox(ctx, gx - 2, F - 88, 4, 34, '#5a3a20'); roomDot(ctx, gx, F - 42, 2.5, '#2a1a10');
  }
  if (W >= 260) {
    const [sx, sy] = hangEnd(X(0.66), F - 60, 10, 1.3, w, time, s.still); ctx.strokeStyle = '#ddd'; ctx.lineWidth = 1; roomSeg(ctx, [[X(0.66), F - 60], [sx, sy]]); roomBox(ctx, sx - 3, sy, 6, 9, '#c84a3a');
  }
}

// The galley's mess table (#925), the length of its bench, at seated height: drawn after the people (shiplife.js), so those sitting at it
// facing you are behind it, their laps under the top (#978). The plates and the mug on it; the lashings under it in the hard burn.
function roomMessTable(ctx, r, s) {
  const W = r.x1 - r.x0, X = sh => r.x0 + W * sh, F = r.floor, { w } = s, time = s.still ? 0 : s.time;
  if (W < 200) return;
  const tx = X(0.25), tw = X(0.73) - tx;
  roomBox(ctx, tx, F - 31, tw, 5, '#2c4c6e'); roomBox(ctx, tx + 8, F - 26, 4, 26, '#20384f'); roomBox(ctx, tx + tw - 12, F - 26, 4, 26, '#20384f');
  roomBox(ctx, tx + tw * 0.3, F - 34, 8, 3, '#ddd6c8'); roomBox(ctx, tx + tw * 0.45, F - 34, 8, 3, '#ddd6c8'); roomBox(ctx, tx + tw * 0.45 + 2, F - 34, 3, 3, '#b8483a');
  roomMug(ctx, tx + tw * 0.75, F - 34, w, time);
  if (w.burn > 0.5) { ctx.strokeStyle = 'rgba(140,170,200,0.5)'; ctx.lineWidth = 0.8; for (let x = tx + 22; x < tx + tw - 22; x += 6) roomSeg(ctx, [[x, F - 14], [x + 6, F]]); }
}

function roomGalley(ctx, r, s, X, W) {
  const { w, time } = s, F = r.floor, lw = Math.min(130, W * 0.3);
  roomBox(ctx, X(0.02), F - 98, lw, 22, '#1c3249'); for (const dx of [4, lw / 2 + 2]) roomBox(ctx, X(0.02) + dx, F - 95, lw / 2 - 8, 16, '#16293d');
  worldText(ctx, s.zoom, 'MUGS', X(0.02) + 8, F - 83, 9, '#c7b48a');
  roomPorthole(ctx, X(0.34), F - 66, 13, s.spin);
  if (W >= 240) {
    // The stove (#933): two burners on its top (the kettle on one, the ring lit while it steams in cruise), the oven door with its window and
    // knobs, a cupboard beside it, and a hood over the burners with its duct to the ceiling; the pans hang on a rail past the hood.
    const cx = X(0.74), cw = Math.min(100, W * 0.24), sw = cw * 0.55;
    roomBox(ctx, cx, F - 40, cw, 6, '#24405e'); roomBox(ctx, cx + 4, F - 34, cw - 8, 34, '#18304a');
    roomBox(ctx, cx + 8, F - 30, sw - 12, 26, '#132538'); roomFlat(ctx, cx + 12, F - 24, sw - 20, 12, '#2a1a10'); roomFlat(ctx, cx + 12, F - 28, sw - 20, 2, '#9aa8b6');
    for (let k = 0; k < 3; k++) roomDot(ctx, cx + 14 + k * (sw - 20) / 2, F - 37, 1.4, '#9aa8b6');
    roomBox(ctx, cx + sw + 2, F - 30, cw - sw - 10, 26, '#132538');
    for (const bx of [cx + 6, cx + sw / 2 + 4]) { roomFlat(ctx, bx, F - 42, sw / 2 - 6, 2, '#0b1520'); if (bx === cx + 6 && w.cruise > 0.05) roomFlat(ctx, bx + 2, F - 42, sw / 2 - 10, 1, `rgba(255,122,58,${0.8 * w.cruise})`); }
    roomBox(ctx, cx + 10, F - 58, 16, 16, '#9aa8b6'); roomBox(ctx, cx + 26, F - 54, 6, 4, '#9aa8b6'); roomFlat(ctx, cx + 12, F - 61, 12, 3, '#5a6672');
    if (W >= 290) roomPlant(ctx, cx + cw - 6, F - 50, w, time, s.still);
    {  // the hood, low enough to clear the thrust sign over the galley's forward end (shiplife.js)
      ctx.fillStyle = '#56708c'; ctx.beginPath(); ctx.moveTo(cx - 2, F - 64); ctx.lineTo(cx + sw + 2, F - 64); ctx.lineTo(cx + sw - 6, F - 75); ctx.lineTo(cx + 6, F - 75); ctx.closePath(); ctx.fill();
      roomFlat(ctx, cx - 2, F - 64, sw + 4, 2, '#3d5a7a'); roomBox(ctx, cx + sw / 2 - 8, r.top, 16, F - 75 - r.top, '#2c4c6e');
      for (let k = 0; k < 4; k++) roomFlat(ctx, cx + 10 + k * (sw - 16) / 4, F - 71, (sw - 16) / 4 - 3, 1.5, '#2c4c6e');  // the vent slots
    }
    if (W >= 320) {
      roomBox(ctx, cx + sw + 6, F - 96, cw - sw - 6, 3, '#3d5a7a');
      [[0.3, 12, 7], [0.75, 17, 8]].forEach(([f, l, rad], k) => {
        const ax = cx + sw + 6 + (cw - sw - 6) * f, [ex, ey] = hangEnd(ax, F - 93, l, k * 1.7, w, time, s.still);
        ctx.strokeStyle = '#7a8a9a'; ctx.lineWidth = 1.2; roomSeg(ctx, [[ax, F - 93], [ex, ey]]); roomDot(ctx, ex, ey + rad * 0.6, rad, '#4a5662'); roomDot(ctx, ex, ey + rad * 0.6, rad - 2, '#2e3842');
      });
    }
  }
  if (W >= 340) { const kx = X(0.1); roomBox(ctx, kx, F - 72, 26, 30, '#d8d2c4'); roomBox(ctx, kx, F - 72, 26, 7, '#b8483a'); ctx.strokeStyle = '#7a2a22'; ctx.lineWidth = 1; for (let k = 0; k < 8; k++) roomSeg(ctx, [[kx + 3 + (k % 4) * 5, F - 62 + Math.floor(k / 4) * 8], [kx + 7 + (k % 4) * 5, F - 56 + Math.floor(k / 4) * 8]]); }
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

// The comms rack at the back of the bridge (#919): the room's own box r (layoutBox), the rack's box in the same world units. A tap on it opens
// Comms (game.js), as a tap on a room opens its console; the cutaway records where it was drawn (G.cutRack, shiplife.js).
const commsRackBox = r => ({ x: r.x0 + 8, y: r.floor - 46, w: 30, h: 46 });  // against the aft bulkhead, under the certificate, clear of the couches
function roomCommsRack(ctx, r, s) {
  const b = commsRackBox(r);
  roomBox(ctx, b.x, b.y, b.w, b.h, '#1b2f45'); roomBox(ctx, b.x + 3, b.y + 14, b.w - 6, b.h - 17, '#0c1826');
  for (let row = 0; row < 4; row++) for (let col = 0; col < 3; col++) {  // the status lights, blinking on the clock (still under reduced motion: s.time is 0)
    const on = Math.sin(s.time * (1.3 + row * 0.7) + col * 2.1 + row) > -0.2;
    roomDot(ctx, b.x + 9 + col * 6, b.y + 20 + row * 6, 1.4, on ? (row === 0 ? '#ffcf7f' : '#6fd08f') : '#24384c');
  }
  ctx.font = `600 12px ${roomFont}`;  // the label at 12px on a dark plate, as the rooms' names are; it may be wider than the rack
  const lw = ctx.measureText('COMMS').width / s.zoom, fs = 12 / s.zoom, pad = 3 / s.zoom, cx = b.x + b.w / 2;
  ctx.fillStyle = 'rgba(6,13,22,0.85)'; ctx.fillRect(cx - lw / 2 - pad, b.y + 1, lw + pad * 2, fs * 1.25);
  worldText(ctx, s.zoom, 'COMMS', cx, b.y + 1 + fs, fs, '#9fb4c9', 'center');
}

function roomBridge(ctx, r, s, X, W) {
  const { w, time, spin } = s, F = r.floor, wl = X(0.55), wr = X(0.97);
  const pane = () => { ctx.beginPath(); ctx.moveTo(wl, F - 92); ctx.lineTo(wr - 6, F - 92); ctx.lineTo(wr, F - 54); ctx.lineTo(wl, F - 54); ctx.closePath(); };
  ctx.save(); pane(); ctx.clip(); roomBox(ctx, wl - 10, F - 100, wr - wl + 20, 60, '#01040a');
  const cs = Math.cos(spin), sn = Math.sin(spin), mx = (wl + wr) / 2;
  for (const [a, b, sz] of roomStars) { const sx = (a - 0.5) * (wr - wl) * 1.4, sy = (b - 0.5) * 100; roomDot(ctx, mx + sx * cs - sy * sn, F - 73 + sx * sn + sy * cs, sz, '#cfe3ff'); }
  const px = wr - 14 + Math.sin(spin) * 40, pg = ctx.createRadialGradient(px, F - 66, 2, px, F - 66, 24); pg.addColorStop(0, '#c98a5a'); pg.addColorStop(1, 'rgba(120,70,40,0)'); ctx.fillStyle = pg; ctx.fillRect(wl, F - 100, wr - wl, 60);
  ctx.restore(); ctx.strokeStyle = '#3d5a7a'; ctx.lineWidth = 3; pane(); ctx.stroke(); roomSeg(ctx, [[mx, F - 92], [mx + 2, F - 54]]);
  if (W >= 150) {
    // The pilot's station (#933): a desk with a sloped top, the course plot and the ship's status on it, rows of keys, the throttle, and a
    // panel overhead.
    const cx = X(0.52), cw = Math.min(140, W * 0.46), top = F - 44;
    roomBox(ctx, cx + 6, F - 34, cw - 12, 34, '#1f3a56');
    ctx.fillStyle = figShade('#2c4c6e', 1.18); ctx.beginPath(); ctx.moveTo(cx, F - 34); ctx.lineTo(cx + 12, top); ctx.lineTo(cx + cw, top); ctx.lineTo(cx + cw, F - 34); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = figShade('#2c4c6e', 1.7); ctx.lineWidth = 1.5; roomSeg(ctx, [[cx + 12, top], [cx + cw, top]]);
    roomScreen(ctx, cx + 18, top - 22, 36, 19, 'plot', time); roomScreen(ctx, cx + 62, top - 22, 30, 19, 'status', time);
    for (let k = 0; k < 7; k++) roomDot(ctx, cx + 18 + k * 7, F - 38, 1.3, (Math.floor(time * 2 + k * 2.3) % 4) ? '#2f5577' : '#ffb347');
    const tx = cx + cw - 16, lean = -0.3 + 0.4 * w.burn; ctx.strokeStyle = '#9aa8b6'; ctx.lineWidth = 2; roomSeg(ctx, [[tx, top], [tx + Math.sin(lean) * 16, top - Math.cos(lean) * 16]]); roomDot(ctx, tx + Math.sin(lean) * 16, top - Math.cos(lean) * 16, 2.6, '#ff8a6a');  // the throttle, forward in the burn
    roomBox(ctx, cx + 24, r.top + 4, Math.max(20, cw - 48), 9, '#1d3550'); for (let k = 0; k < 4; k++) roomDot(ctx, cx + 30 + k * 8, r.top + 8.5, 1.1, k % 2 ? '#5fd35f' : '#2f5577');
  }
  if (W >= 180) { const bob = Math.sin(time * 6) * (2 * w.cruise + 4 * w.flip) - 1.5 * w.burn, bx = X(0.5); roomBox(ctx, bx, F - 46, 6, 6, '#ffb347'); roomDot(ctx, bx + 3, F - 50 + bob, 4, '#e0b48e'); }
  if (W >= 200) {  // the master's certificate, framed under the room's name: a seal and lines, no word (it would be wider than the frame at 12px)
    const lx = X(0.04), ly = F - 72; roomBox(ctx, lx, ly, 34, 26, '#2a2016'); roomBox(ctx, lx + 3, ly + 3, 28, 20, '#e8e0c8');
    for (const dy of [7, 11, 15]) roomBox(ctx, lx + 7, ly + dy, dy === 7 ? 20 : 14, 1.2, '#8a8070');
    roomDot(ctx, lx + 25, ly + 17, 3, '#b0322a');
  }
  roomCommsRack(ctx, r, s);
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

// The thrust sign: the phase and the g reading, centred on x with its top at y (FLIP SECURE alternates with FLIP every two seconds).
function drawThrustSign(ctx, x, y, g, w, time, zoom) {
  const ph = w.flip > 0.5 ? 'flip' : w.burn > 0.5 ? 'burn' : 'cruise';
  const txt = ph === 'flip' && Math.floor(time) % 4 < 2 ? 'FLIP SECURE' : (ph === 'burn' ? 'THRUST ' : ph === 'cruise' ? 'CRUISE ' : 'FLIP ') + g.toFixed(2) + ' G';
  const bw = 112; roomBox(ctx, x - bw / 2, y, bw, 18, '#081019'); ctx.strokeStyle = '#2a4664'; ctx.lineWidth = 1; ctx.strokeRect(x - bw / 2 + 0.5, y + 0.5, bw - 1, 17);
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
function drawRoom(ctx, id, r, s) {
  if (s.still) s = { ...s, time: 0 };  // reduced motion: the clock stops, so nothing sways, floats, scrolls or pulses
  const W = r.x1 - r.x0;
  roomWalls(ctx, r, s.w, s.time, s.still);
  ROOM_DRAW[id](ctx, r, s, sh => r.x0 + W * sh, W);
  const seats = SEATS[id] || [];  // its seats (shiplife.js), where people sit (#925): the galley's on one bench along the mess table, a stool anywhere else
  if (id === 'galley' && seats.length) roomBench(ctx, r.x0 + W * seats[0] - 14, r.x0 + W * seats[seats.length - 1] + 14, r.floor);
  else for (const f of seats) roomStool(ctx, r.x0 + W * f, r.floor, { bridge: 1, gunnery: -1 }[id] || 0);  // a station's chair faces its console (#933)
  const marked = !!(s.damage && s.damage.marks.has(id));
  if (marked) drawDamage(ctx, r, s);
  if (!(marked && s.damage.severe && Math.floor(s.time * 11) % 4 === 0)) drawPhaseLight(ctx, r, s.w, s.time, s.night, id === 'bridge' || id === 'engine');  // severe damage: the lamp flickers
}
