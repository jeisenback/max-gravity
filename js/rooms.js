'use strict';

// The burn view's rooms (#living-ship): each room of the cutaway drawn lived-in under a low ceiling, its props answering the phase of
// the burn (weights from phaseWeights in burnpanel.js). A room is r = { x0, x1, top, floor } in world units: props sit at a share of
// its width and are measured up from its floor (the ceiling is 100 above it). Pure drawing: no state read, no randomness, motion
// comes from s.time. Loaded after camera.js; the bulkheads and the hull are the caller's.

const roomFont = '"Chakra Petch", ui-sans-serif, sans-serif';
const roomStars = Array.from({ length: 14 }, (_, k) => [Math.sin(k * 12.9898) * 0.5 + 0.5, Math.sin(k * 78.233) * 0.5 + 0.5, (k % 3) * 0.4 + 0.6]);
// A prop (#933): its body a step brighter than the wall, its top edge catching the ceiling's light, its underside in shade, and a dark outline, so it
// stands off the wall behind it. A small detail (under 6 units either way) or a colour not written as #rrggbb is a plain fill.
const roomFlat = (ctx, x, y, w, h, col) => { ctx.fillStyle = roomTint(col); ctx.fillRect(x, y, w, h); };
const roomBox = (ctx, x, y, w, h, col) => {
  if (Math.abs(w) < 6 || Math.abs(h) < 6 || !/^#[0-9a-f]{6}$/i.test(col)) { roomFlat(ctx, x, y, w, h, col); return; }
  const x0 = Math.min(x, x + w), y0 = Math.min(y, y + h), W = Math.abs(w), H = Math.abs(h), e = Math.min(1.5, H / 6), t = roomTone;
  roomFlat(ctx, x0, y0, W, H, figShade(col, 1.18 * t));
  roomFlat(ctx, x0, y0, W, e, figShade(col, 1.6 * t)); roomFlat(ctx, x0, y0 + H - e, W, e, figShade(col, 0.62 * t));
  ctx.strokeStyle = 'rgba(3,7,12,0.85)'; ctx.lineWidth = 1; ctx.strokeRect(x0 + 0.5, y0 + 0.5, W - 1, H - 1);
};
// A prop's part drawn to the figures' standard (#933): a path in SVG syntax (figPath's, figures.js, so it draws without a browser) filled with
// its colour as its front, a band along its top lit by the ceiling's lamps, a band down one side (o.side units: on the right, or the left when
// negative) and along its underside (o.under) in shade, and the figures' outline round it. A colour not written as #rrggbb is filled flat.
// figPath keeps every path string it reads (and roomPart its bounds), so a path given here is fixed per layout: built from the room's box, W,
// X() and constants, never from s.time, the zoom or anything that changes frame to frame (move such a part with ctx.translate instead).
// o.solid (#1024): the part stands on the floor at the front and is that deep, as a share of the strip; roomSolid draws its depth behind it.
// o.slope: its top edge runs from [the left end's y, the right end's] (a console's sloped top), so its top face runs back from that edge;
// o.shadow false: it rests on another part (a mattress on its frame) and casts no shadow of its own. Drawn inside roomOnWall, every colour is
// a step darker (the wall tone).
const roomBounds = {};
function roomPart(ctx, d, col, o = {}) {
  const { top = 1.5, side = 0, under = 0, solid = 0, slope = null, shadow = true } = o, t = roomTone;
  figPath(ctx, d);
  if (/^#[0-9a-f]{6}$/i.test(col) && (top || side || under || solid)) {
    const b = roomBounds[d] || (roomBounds[d] = figTokens[d].filter(t => !/[A-Z]/.test(t)).reduce((b, t, i) => {
      const v = Number(t), k = i % 2; b[k] = Math.min(b[k], v); b[k + 2] = Math.max(b[k + 2], v); return b;
    }, [Infinity, Infinity, -Infinity, -Infinity])), [x0, y0, x1, y1] = b;
    if (solid && roomView) { roomSolid(ctx, b, col, solid, slope, shadow); figPath(ctx, d); }
    ctx.fillStyle = roomTint(col); ctx.fill();
    ctx.save(); ctx.clip();
    if (top) roomFlat(ctx, x0, y0, x1 - x0, top, figShade(col, 1.4 * t));
    if (side) roomFlat(ctx, side > 0 ? x1 - side : x0, y0, Math.abs(side), y1 - y0, figShade(col, 0.72 * t));
    if (under) roomFlat(ctx, x0, y1 - under, x1 - x0, under, figShade(col, 0.62 * t));
    ctx.restore();  // fillRect leaves the path as it was, so the outline follows it
  } else { ctx.fillStyle = roomTint(col); ctx.fill(); }
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
const roomDot = (ctx, x, y, r, col) => { ctx.fillStyle = roomTint(col); ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); };
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
  ctx.fillStyle = roomTint('#2f4a66'); ctx.beginPath(); ctx.arc(x, y, rad + 6, 0, Math.PI * 2); ctx.fill(); ctx.lineWidth = 0.9; ctx.strokeStyle = FIG_LINE; ctx.stroke();
  ctx.lineWidth = 2; ctx.strokeStyle = figShade('#2f4a66', 1.4 * roomTone); ctx.beginPath(); ctx.arc(x, y, rad + 4.5, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
  ctx.strokeStyle = figShade('#2f4a66', 0.65 * roomTone); ctx.beginPath(); ctx.arc(x, y, rad + 4.5, Math.PI * 0.1, Math.PI * 0.9); ctx.stroke();
  ctx.save(); ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2); ctx.clip(); roomFlat(ctx, x - rad, y - rad, rad * 2, rad * 2, '#01040a');
  const cs = Math.cos(spin), sn = Math.sin(spin);
  for (const [a, b, sz] of roomStars) { const sx = (a - 0.5) * rad * 2.4, sy = (b - 0.5) * rad * 2.4; roomDot(ctx, x + sx * cs - sy * sn, y + sx * sn + sy * cs, sz, '#cfe3ff'); }
  roomFlat(ctx, x - rad, y - rad, rad, rad * 2, 'rgba(160,200,255,0.08)'); ctx.restore();
  ctx.lineWidth = 1.2; ctx.strokeStyle = roomTint('#132538'); ctx.beginPath(); ctx.arc(x, y, rad + 0.6, 0, Math.PI * 2); ctx.stroke();  // the gasket
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
// the seated hip (23, #933), on a frame and legs with a foot bar, and a tie-down ring at each foot. worn: the foot bar scuffed where boots rest on
// it (the galley's, point 6).
function roomBench(ctx, x0, x1, F, worn = false) {
  const legs = Math.max(2, Math.round((x1 - x0) / 60) + 1), lx = k => x0 + 4 + (x1 - x0 - 12) * (k / (legs - 1));
  roomPart(ctx, roomRound(x0 + 6, F - 7, x1 - x0 - 12, 2, 1), '#1c3249', { top: 0.6 });  // the foot bar
  if (worn) for (const f of [0.18, 0.5, 0.82]) roomFlat(ctx, x0 + (x1 - x0) * f, F - 6.6, 4, 0.8, '#5a6670');
  for (let k = 0; k < legs; k++) {
    const x = lx(k);
    roomPart(ctx, `M ${x} ${F - 17} L ${x + 4} ${F - 17} L ${x + 3.4} ${F - 1.5} L ${x + 0.6} ${F - 1.5} Z`, '#1c3249', { top: 0, side: 1.2 });
    roomPart(ctx, roomRound(x - 2, F - 1.8, 8, 1.8, 0.8), '#20384f', { top: 0.5 });
    ctx.strokeStyle = '#4a6680'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.arc(x + 2, F - 3, 1.3, 0, Math.PI * 2); ctx.stroke();
  }
  roomPart(ctx, roomRound(x0 + 2, F - 19, x1 - x0 - 4, 2.5, 0.8), '#1c3249', { top: 0.6 });  // the frame under the pad
  roomPart(ctx, roomRound(x0, F - 23, x1 - x0, 4.5, 2), '#33506e', { top: 1, under: 1, solid: 0.25 });
}
// The stool drawRoom puts at the seats of a room without its own (the gunnery's, the medbay's): its pad at the seat's height (FIG_SEAT, where the
// figure sits) on a stem, its foot plate bolted to the deck; in the box (#1041) the pad and the foot solid, the foot's shadow on the strip. back: a
// chair's back on the left (1) or the right (-1) of the seat, behind someone facing the other way (SEAT_FACE), with the harness slack on it; none on
// a stool.
function roomStool(ctx, x, F, back) {
  const n = v => Math.round(v * 100) / 100, sx = n(x);
  roomPart(ctx, roomRound(sx - 8, F - 2.5, 16, 2.5, 1), '#1c3249', { top: 0.6, solid: 0.25 });
  for (const bx of [sx - 6, sx + 6]) roomDot(ctx, bx, F - 1.2, 0.6, '#56708c');  // its bolts
  roomPart(ctx, `M ${n(sx - 2)} ${F - 19} L ${n(sx + 2)} ${F - 19} L ${n(sx + 2.5)} ${F - 2.5} L ${n(sx - 2.5)} ${F - 2.5} Z`, '#20364e', { top: 0, side: 1.2 });
  if (back) {
    const b0 = back > 0 ? n(sx - 13) : n(sx + 8), b1 = n(b0 + 5), lean = back > 0 ? 1.5 : -1.5;
    roomPart(ctx, `M ${b0} ${F - 20} L ${b1} ${F - 20} L ${n(b1 + lean)} ${F - 49} L ${n(b0 + lean)} ${F - 49} Z`, '#2a4664', { top: 1, side: back > 0 ? -1.5 : 1.5 });
    const hx = back > 0 ? b1 : b0;  // the harness: a shoulder strap down the back's front to its buckle, and the lap belt
    ctx.strokeStyle = '#5a4e3a'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(hx + lean, F - 47); ctx.quadraticCurveTo(hx - 2 * back, F - 36, hx - back, F - 24); ctx.lineTo(hx + 6 * back, F - 22); ctx.stroke();
    roomFlat(ctx, hx - back - 1.25, F - 35, 2.5, 2, '#7a8794');
  }
  roomPart(ctx, roomRound(sx - 10, F - FIG_SEAT, 20, 4.5, 2), '#2a4664', { top: 1, under: 1, solid: 0.25 });
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
  roomPart(ctx, `M ${x - 6 * k} ${y} L ${x + 6 * k} ${y} L ${x + 4.5 * k} ${y + 10 * k} L ${x - 4.5 * k} ${y + 10 * k} Z`, '#5e4434', { top: 1.2, side: 2 * k }); const droop = w.burn * 0.9 - w.flip * 0.5; ctx.strokeStyle = roomTint('#5fae5a'); ctx.lineWidth = 1.8 * k;
  for (const [a, l, sd] of [[-0.9, 11 * k, 0], [-0.3, 14 * k, 1], [0.35, 13 * k, 2], [0.95, 10 * k, 3]]) {
    const ang = a * (1 - w.burn * 0.3) + (still ? 0 : Math.sin(time * 1.1 + sd) * 0.25 * w.flip);
    ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + Math.sin(ang) * l * 0.4, y - l * 0.7, x + Math.sin(ang) * l, y - Math.cos(ang) * l * (1 - droop * 0.7) + droop * 6 * k); ctx.stroke();
  }
}

// The room box (#1024, docs/superpowers/specs/2026-11-11-room-box-design.md): the room's box r is the cut, its front; its back wall is the
// same box scaled toward the eye by k, and between them are the ceiling's sliver, the floor's strip and the side walls, angled in to the
// eye. The eye is at a standing person's eye height over the floor; the strip is ROOM_DEPTH deep, so k = 1 - ROOM_DEPTH / ROOM_EYE.
const ROOM_EYE = 80, ROOM_DEPTH = 16;
// The bays a room is drawn as: one, or for a full-width room two, one either side of the ladder well (well: { x0, x1 }), sharing its name,
// its lamps and its tap box.
const roomBays = (r, well) => {
  const { x0, x1, top, floor } = r;
  return well && x0 < well.x0 && x1 > well.x1 ? [{ x0, x1: well.x0, top, floor }, { x0: well.x1, x1, top, floor }] : [{ x0, x1, top, floor }];
};
// A bay's eye: the vanishing point at its centre at eye height, and k, the scale of its back wall.
const roomEye = bay => ({ vx: (bay.x0 + bay.x1) / 2, vy: bay.floor - ROOM_EYE, k: 1 - ROOM_DEPTH / ROOM_EYE });
// The point (x, y) carried toward a bay's eye by d of the depth (0 at the cut, 1 on the back wall).
const roomInto = (e, x, y, d = 1) => { const q = 1 - d * (1 - e.k); return [e.vx + (x - e.vx) * q, e.vy + (y - e.vy) * q]; };
// Solid things and things on the wall (#1024, spec section 3). Each room is drawn inside roomIn, which keeps its bays and their eyes for the call
// (drawRoom, and roomMessTable for itself), so a part finds the eye of the bay it is in; outside it there is no eye and a part is drawn flat.
const WALL_TONE = 0.85, ROOM_FOOT = 4, ROOM_SHADOW = 'rgba(2,5,9,0.5)';  // a step darker on the wall; a part's foot within ROOM_FOOT of the floor (a plinth, a foot plate) is on it
let roomView = null, roomTone = 1;
const roomTint = col => (roomTone === 1 || !/^#[0-9a-f]{6}$/i.test(col) ? col : figShade(col, roomTone));
function roomIn(bays, fn) {
  const was = roomView; roomView = bays.map(b => ({ ...b, ...roomEye(b) }));
  try { return fn(); } finally { roomView = was; }
}
const roomEyeAt = x => roomView && (roomView.find(b => x >= b.x0 && x <= b.x1) || roomView[0]);
// A solid part's depth, from its bounds b, behind its front: a contact shadow on the strip if its foot is on the floor (its footprint widened 5
// each side) and it does not rest on another part, the side toward the eye a step darker (none when it straddles the eye), and its top a step
// lighter if the top is under the eye, but never brighter or more saturated than the people (#959). slope: the top edge's y at its left and
// right ends, when it is not level.
const roomFace = (ctx, pts, fill, line) => {
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (const q of pts.slice(1)) ctx.lineTo(q[0], q[1]); ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
  if (line) { ctx.lineWidth = 0.7; ctx.strokeStyle = FIG_LINE; ctx.stroke(); }
};
// A contact shadow on the strip under something standing at the front from x0 to x1, d deep (a share of the strip): its footprint widened 5
// each side. roomSolid draws one under a solid part; a thing on legs (the medbay's cot) has its own, drawn before its legs.
function roomShadow(ctx, x0, x1, d) {
  const e = roomEyeAt((x0 + x1) / 2); if (!e) return;
  const F = e.floor; roomFace(ctx, [[x0 - 5, F], [x1 + 5, F], roomInto(e, x1 + 5, F, d), roomInto(e, x0 - 5, F, d)], ROOM_SHADOW);
}
function roomSolid(ctx, [x0, y0, x1, y1], col, d, slope = null, shadow = true) {
  const e = roomEyeAt((x0 + x1) / 2), F = e.floor, t = roomTone, P = (x, y) => roomInto(e, x, y, d), [ya, yb] = slope || [y0, y0];
  if (shadow && y1 >= F - ROOM_FOOT) roomShadow(ctx, x0, x1, d);
  const sx = x1 < e.vx ? x1 : x0 > e.vx ? x0 : null, sy = sx === x0 ? ya : yb;
  if (sx !== null) roomFace(ctx, [[sx, sy], [sx, y1], P(sx, y1), P(sx, sy)], figShade(col, 0.62 * t), true);
  const v = [1, 3, 5].map(i => parseInt(col.slice(i, i + 2), 16)), mx = Math.max(...v), mn = Math.min(...v);
  if (Math.min(ya, yb) > e.vy) roomFace(ctx, [[x0, ya], [x1, yb], P(x1, yb), P(x0, ya)], figShade(col, Math.min(1.3 * t, 0xb0 / mx, 0x60 / (mx - mn || 1))), true);
}
// Something at a depth d (1: the back wall) of the bay at its anchor (ax, ay), drawn by fn at full size, moved whole so the anchor lands there:
// a small thing on a top (the plant on the worktop, the kettle on the hob). roomOnWall: on the back wall, in the wall tone.
function roomAtDepth(ctx, ax, ay, d, fn, tone = roomTone) {
  const e = roomEyeAt(ax), was = roomTone;
  ctx.save(); if (e) { const [px, py] = roomInto(e, ax, ay, d); ctx.translate(px - ax, py - ay); }
  roomTone = tone;
  try { fn(); } finally { roomTone = was; ctx.restore(); }
}
const roomOnWall = (ctx, ax, ay, fn) => roomAtDepth(ctx, ax, ay, 1, fn, WALL_TONE);
// The cut: the deck plate under x0 to x1, the nearest thing and the darkest, a near-black fill hatched as a section, its top edge the frame's line.
function roomCut(ctx, x0, x1, F) {
  const h = HULL.plate;
  roomFlat(ctx, x0, F, x1 - x0, h, '#04080d');
  ctx.save(); ctx.beginPath(); ctx.rect(x0, F, x1 - x0, h); ctx.clip();
  ctx.strokeStyle = 'rgba(52,84,118,0.55)'; ctx.lineWidth = 0.8; ctx.beginPath();
  for (let x = x0 - h; x < x1; x += 5) { ctx.moveTo(x, F + h); ctx.lineTo(x + h, F); }
  ctx.stroke(); ctx.restore();
  roomFlat(ctx, x0, F, x1 - x0, 1, '#4a6f94');
}
// One bay's shell, still (the burn view draws it once into its cache, shiplife.js): the back wall shaded as the far side of the hull's
// cylinder (#988), lightest in the middle, its seams at equal turns of the hull; the side walls, the curve turning toward you, darkest at the
// front, their seams running to the eye; the ceiling's sliver, plain; the floor's strip, its joints running to the eye and two across it;
// the box's edges a faint line; and the cut under it.
function roomShell(ctx, bay) {
  const { x0, x1, top, floor: F } = bay, e = roomEye(bay), P = (x, y, d) => roomInto(e, x, y, d), [bx0, by0] = P(x0, top), [bx1, by1] = P(x1, F), half = (bx1 - bx0) / 2;
  const face = (pts, fill) => { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (const q of pts.slice(1)) ctx.lineTo(q[0], q[1]); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); };
  const seg = (a, b) => { ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); };
  const g = ctx.createLinearGradient(bx0, 0, bx1, 0);
  g.addColorStop(0, '#070f19'); g.addColorStop(0.5, '#132438'); g.addColorStop(1, '#070f19');
  face([[bx0, by0], [bx1, by0], [bx1, by1], [bx0, by1]], g);
  ctx.strokeStyle = 'rgba(30,52,76,0.9)'; ctx.lineWidth = 0.8; ctx.beginPath();
  for (let a = -75; a <= 75; a += 15) { const sx = e.vx + half * Math.sin(a * Math.PI / 180); seg([sx, by0 + 12], [sx, by1]); }
  ctx.stroke();
  ctx.strokeStyle = 'rgba(30,52,76,0.7)'; ctx.beginPath(); for (const y of [by0 + 12, F - 46]) seg([bx0, y], [bx1, y]); ctx.stroke();
  for (const [fx, bx] of [[x0, bx0], [x1, bx1]]) {
    const sg = ctx.createLinearGradient(fx, 0, bx, 0); sg.addColorStop(0, '#04080e'); sg.addColorStop(1, '#0a1522');
    face([[fx, top], [bx, by0], [bx, by1], [fx, F]], sg);
    ctx.strokeStyle = 'rgba(30,52,76,0.6)'; ctx.lineWidth = 0.7; ctx.beginPath(); for (const y of [F - 46, top + 12]) seg([fx, y], P(fx, y)); ctx.stroke();
  }
  face([[x0, top], [x1, top], [bx1, by0], [bx0, by0]], '#091320');
  const fg = ctx.createLinearGradient(0, by1, 0, F); fg.addColorStop(0, '#0f1b29'); fg.addColorStop(1, '#1a2b3f');
  face([[x0, F], [x1, F], [bx1, by1], [bx0, by1]], fg);
  ctx.strokeStyle = 'rgba(48,74,102,0.55)'; ctx.lineWidth = 0.6; ctx.beginPath();
  for (let x = x0 + 24; x < x1; x += 24) seg([x, F], P(x, F));
  for (const d of [0.4, 0.75]) seg(P(x0, F, d), P(x1, F, d));
  ctx.stroke();
  ctx.strokeStyle = 'rgba(40,64,90,0.9)'; ctx.lineWidth = 0.8; ctx.beginPath();
  seg([x0, top], [bx0, by0]); seg([bx0, by0], [bx1, by0]); seg([bx1, by0], [x1, top]); seg([x0, F], [bx0, by1]); seg([bx0, by1], [bx1, by1]); seg([bx1, by1], [x1, F]);
  seg([bx0, by0], [bx0, by1]); seg([bx1, by0], [bx1, by1]);
  ctx.stroke();
  roomCut(ctx, x0, x1, F);
}
// A room's walls: each bay's shell (drawn by shell, the burn view's cache, or roomShell), and along the top of each back wall the cable run
// (it sags under thrust, less in cruise, and floats at the flip).
function roomWalls(ctx, r, w, time, still, well, shell = roomShell) {
  const sag = x0 => 9 * w.burn + 4 * w.cruise + (still ? -2 : -2 + Math.sin(time * 0.9 + x0) * 3) * w.flip;
  for (const bay of roomBays(r, well)) {
    shell(ctx, bay);
    const e = roomEye(bay), [bx0, by0] = roomInto(e, bay.x0, bay.top), bx1 = 2 * e.vx - bx0, s = sag(bay.x0);
    ctx.strokeStyle = '#2b4462'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(bx0 + 6, by0 + 6); ctx.quadraticCurveTo(e.vx, by0 + 6 + s, bx1 - 6, by0 + 6); ctx.stroke();
    ctx.strokeStyle = '#3a2f22'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(bx0 + 6, by0 + 10); ctx.quadraticCurveTo(e.vx, by0 + 10 + s * 0.7, bx1 - 6, by0 + 10); ctx.stroke();
  }
}

// The engine room's fittings (#933). A gauge's reading, 0 to 1: up in the hard burn, low in cruise, near nothing at the flip with the drive off,
// and a tremble while the drive runs (k: which gauge).
const gaugeNeedle = (w, time, k) => Math.min(1, 0.05 * w.flip + 0.35 * w.cruise + 0.85 * w.burn + 0.03 * Math.sin(time * 5 + k * 1.9) * (1 - w.flip));
// A dial at (x, y): its bezel and its face (face: the face's colour), the red band at the top of the scale, the needle at v (0 to 1).
function roomGauge(ctx, x, y, rad, v, face = '#a8a28e') {
  roomPart(ctx, roomRound(x - rad - 1.6, y - rad - 1.6, 2 * rad + 3.2, 2 * rad + 3.2, rad + 1.6), '#2e3e4e', { top: 0.6 });
  roomPart(ctx, roomRound(x - rad, y - rad, 2 * rad, 2 * rad, rad), face, { top: 0 });
  ctx.strokeStyle = roomTint('#7a3a32'); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(x, y, rad - 1.4, -Math.PI / 2 + 0.45 * Math.PI, -Math.PI / 2 + 0.75 * Math.PI); ctx.stroke();
  const a = -Math.PI / 2 + (v - 0.5) * Math.PI * 1.5; ctx.strokeStyle = roomTint('#1a1a1a'); ctx.lineWidth = 0.8; roomSeg(ctx, [[x, y], [x + Math.cos(a) * (rad - 1.4), y + Math.sin(a) * (rad - 1.4)]]); roomDot(ctx, x, y, 0.8, '#1a1a1a');
}
// A valve's hand wheel at (x, y): its rim, four spokes and the hub, toned down from a signal red.
const ENGINE_VALVE = '#8a3a30';
function roomValve(ctx, x, y, rad) {
  ctx.strokeStyle = roomTint(ENGINE_VALVE); ctx.lineWidth = Math.min(1.6, rad / 3); ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2); ctx.stroke();
  for (let k = 0; k < 4; k++) roomSeg(ctx, [[x, y], [x + Math.cos(k * Math.PI / 2 + 0.4) * rad, y + Math.sin(k * Math.PI / 2 + 0.4) * rad]]);
  roomDot(ctx, x, y, Math.min(1.6, rad / 3), '#5a2a24');
}
// A pipe from a to b, level or upright, th thick, drawn as a prop: lit along its top (or shaded down one side), and a flange every step.
function roomPipe(ctx, [ax, ay], [bx, by], step, th = 5) {
  const n = v => Math.round(v * 100) / 100, up = ax === bx, x0 = Math.min(ax, bx), y0 = Math.min(ay, by), len = Math.abs(up ? by - ay : bx - ax);
  roomPart(ctx, up ? roomRound(n(x0 - th / 2), y0, th, len, 1) : roomRound(x0, n(y0 - th / 2), len, th, 1), '#3d5a7a', up ? { top: 0, side: 1.2 } : { top: 1, under: 1 });
  for (let d = step / 2; d < len; d += step) roomPart(ctx, up ? roomRound(n(x0 - th / 2 - 1.5), n(y0 + d - 1.2), th + 3, 2.4, 0.6) : roomRound(n(x0 + d - 1.2), n(y0 - th / 2 - 1.5), 2.4, th + 3, 0.6), '#4f6f8f', { top: 0.5 });
}
// Each room: (ctx, r, s, X, W) with X(share) the world x at that share of the width. A prop that does not fit the width is dropped, last listed first.
// The engine room (#933), on the drive deck under the water tank, the engineer's post. In the box (#1024): on the back wall the pipe along it
// and down its right side with a valve, the wall slate (the reactor log in chalk), the level gauge reading the reaction mass in the tank over the
// ceiling (s.fuel; the tank shows the same water, shiplife.js towerTank), the gauge panel at eye height and the tool board over the bench, each
// tool in its painted outline and one outline empty (a tool is out). On the floor from the left wall in: the drive's fuel, deuterium (the torch
// burns it, docs/bible/technology.md), in two cryo bottles in their rack, the older one in service and the newer in another finish on the old
// rack with fresh bolts, each with its bands, its valve, its gauge and a warning diamond; the feed pump; from the right wall in, the bench at
// the waist, its terminal (the engineer's console), the manuals and a mug. In the middle the reactor housing, the one big thing, a little over
// a person: its bands, bolted panels (one a replacement in another shade), the injector cover and the telltales on it, the core's sight port
// lit by the drive, the maintenance hatch with its wheel and dogs, worn where it is opened, and a warning plate as a pictogram. At the front
// the reaction mass's feed down from the ceiling into the pump, its valve's handle printed and tagged temporary, tape and a cable tied along
// it; the pump's line into the housing; the coolant up from the housing into the ceiling and along it, clear of the lamp; the drive's lines
// down through the deck. No words: the stencils are marks. Nothing under the room's name. Its lamp is a fitting (LAMP_FITTED).
function roomEngine(ctx, r, s, X) {
  const { w, time } = s, F = r.floor, T = r.top, n = v => Math.round(v * 100) / 100, a = r.x0, vx = n(X(0.5)), e = roomEye(r);
  const wall = (px, py, fn) => { const ax = n(e.vx + (px - e.vx) / e.k), ay = n(e.vy + (py - e.vy) / e.k); roomOnWall(ctx, ax, ay, () => fn(ax, ay)); };  // fn draws round (ax, ay), which lands at (px, py)
  const hot = (s.burning ? 0.55 : 0.25) + 0.45 * w.burn + 0.1 * Math.sin(time * 4) * w.burn;
  const core = w.burn > 0.5 ? '255,140,60' : w.flip > 0.5 ? '255,176,48' : '90,150,220';
  // On the wall: the pipe along its top and down its right side, its valve.
  wall(199, F - 92, (x, y) => {
    roomPipe(ctx, [x - 107, y], [x + 107, y], 36, 4); roomPipe(ctx, [x + 107, y + 2], [x + 107, y + 68], 30, 4);
    roomValve(ctx, x + 107, y + 32, 5);
  });
  wall(106, F - 74, (x, y) => {  // the wall slate, the reactor log chalked on it
    roomPart(ctx, roomRound(x - 10, y - 8, 20, 16, 1), '#1e2a2c', { top: 0.6, under: 0.8 });
    for (let l = 0; l < 4; l++) roomFlat(ctx, x - 7, y - 5 + l * 3, 14 - (l % 2) * 4, 0.6, '#7a8080');
    roomDot(ctx, x - 9, y - 7, 0.6, '#56708c'); roomDot(ctx, x + 9, y - 7, 0.6, '#56708c');
  });
  wall(124, F - 58, (x, y) => {  // the level gauge: the tank's water in a glass, its marks every quarter
    roomPart(ctx, roomRound(x - 4.5, y - 23, 9, 46, 1.2), '#2a3a4c', { top: 0.6, side: 1 });
    roomPart(ctx, roomRound(x - 2.5, y - 20, 5, 40, 1.5), '#0c1620', { top: 0 });
    const f = Math.max(0, Math.min(1, s.fuel || 0)), lv = 38 * f;
    if (lv > 0) { roomFlat(ctx, x - 2, y + 19 - lv, 4, lv, 'rgba(70,140,190,0.6)'); roomFlat(ctx, x - 2, y + 19 - lv, 4, 0.8, 'rgba(160,210,240,0.7)'); }
    for (let k = 0; k <= 4; k++) roomFlat(ctx, x + 2.5, y + 19 - 9.5 * k - 0.3, 1.6, 0.6, '#6a7a8a');
    for (const dy of [-21.5, 21.5]) roomDot(ctx, x, y + dy, 0.6, '#56708c');
  });
  wall(236, F - 77, (x, y) => {  // the gauge panel at eye height: the coolant's pressure and temperature, and the drive
    roomPart(ctx, roomRound(x - 18, y - 8, 36, 16, 1.2), '#22384e', { top: 0.8, under: 1 });
    [-11, 0, 11].forEach((dx, k) => roomGauge(ctx, x + dx, y, 5, gaugeNeedle(w, time, k)));
    for (const [sx, sy] of [[x - 16.5, y - 6.5], [x + 16.5, y - 6.5], [x - 16.5, y + 6.5], [x + 16.5, y + 6.5]]) roomDot(ctx, sx, sy, 0.5, '#56708c');
  });
  wall(279, F - 70, (x, y) => {  // the tool board, each tool in its painted outline, the pliers out
    const bx = x - 20, by = y - 15;
    roomPart(ctx, roomRound(bx, by, 40, 30, 1), '#4a4234', { top: 0.8, under: 1 });
    ctx.fillStyle = roomTint('#2e2a22'); ctx.beginPath();  // its peg holes, one path
    for (let i = 0; i < 6; i++) for (let j = 0; j < 4; j++) { ctx.moveTo(bx + 3.9 + i * 6.6, by + 4 + j * 7.4); ctx.arc(bx + 3.5 + i * 6.6, by + 4 + j * 7.4, 0.4, 0, Math.PI * 2); }
    ctx.fill();
    const mark = d => roomPart(ctx, d, '#5e5646', { top: 0 });
    mark(roomRound(bx + 3.4, by + 3.4, 5.2, 23.2, 1.5));  // the spanner
    mark(`M ${bx + 8.4} ${by + 3.4} L ${bx + 18.6} ${by + 3.4} L ${bx + 18.6} ${by + 8.6} L ${bx + 15.6} ${by + 8.6} L ${bx + 15.6} ${by + 26.6} L ${bx + 11.4} ${by + 26.6} L ${bx + 11.4} ${by + 8.6} L ${bx + 8.4} ${by + 8.6} Z`);  // the hammer
    mark(roomRound(bx + 20.4, by + 3.4, 4.2, 21.2, 1.5));  // the screwdriver
    mark(`M ${bx + 27.4} ${by + 3.4} L ${bx + 33.6} ${by + 3.4} L ${bx + 32.6} ${by + 12} L ${bx + 34} ${by + 24.6} L ${bx + 31.6} ${by + 24.6} L ${bx + 30.5} ${by + 14} L ${bx + 29.4} ${by + 24.6} L ${bx + 27} ${by + 24.6} L ${bx + 28.4} ${by + 12} Z`);  // the pliers' outline, empty
    mark(roomRound(bx + 34.9, by + 3.4, 3.7, 19.2, 1.2));  // the long spanner
    roomPart(ctx, `M ${bx + 4} ${by + 4} L ${bx + 8} ${by + 4} L ${bx + 7} ${by + 8} L ${bx + 6.6} ${by + 26} L ${bx + 5.4} ${by + 26} L ${bx + 5} ${by + 8} Z`, '#6a7078', { top: 0.5, side: 0.6 });
    roomPart(ctx, roomRound(bx + 12, by + 8, 3, 18, 1), '#6a4a34', { top: 0, side: 0.8 }); roomPart(ctx, roomRound(bx + 9, by + 4, 9, 4, 0.8), '#6a7078', { top: 0.6, under: 0.6 });
    roomPart(ctx, roomRound(bx + 21, by + 4, 3, 8, 1), '#3a5a6a', { top: 0.5 }); roomPart(ctx, roomRound(bx + 22, by + 12, 1, 12, 0.4), '#6a7078', { top: 0 });
    roomPart(ctx, roomRound(bx + 35.5, by + 4, 2.5, 18, 1), '#6a7078', { top: 0.5, side: 0.6 });
  });
  // On the floor, from the left wall in: the fuel's rack and its bottles, the pump.
  for (const px of [a + 6, a + 65]) roomPart(ctx, roomRound(px, F - 50, 3, 46, 0.8), '#2e4864', { top: 0, side: 0.8 });  // the rack's frame
  roomPart(ctx, roomRound(a + 6, F - 4, 62, 4, 1), '#24384c', { top: 0.6, solid: 0.6 });
  for (const bx of [a + 8, a + 65]) roomFlat(ctx, bx, F - 2.6, 1.2, 1.2, '#8a929a');  // fresh bolts in the old rack, for the newer bottle
  for (let k = 0; k < 2; k++) {
    const x = a + 10 + 28 * k, col = k ? '#5a6470' : '#4a5a50';
    roomPart(ctx, roomRound(x, F - 52, 24, 48, 7), col, { top: 1.2, side: 3, under: 1, solid: 0.3, shadow: false });  // round, so it shows little depth
    for (const by of [F - 44, F - 15]) { roomPart(ctx, roomRound(x - 0.5, by, 25, 3, 0.8), '#2e3a36', { top: 0.5 }); roomDot(ctx, x + 22.5, by + 1.5, 0.5, '#56708c'); }
    roomPart(ctx, roomRound(x + 9, F - 55, 6, 3.5, 0.8), '#3a4440', { top: 0.5, side: 0.8 });  // its neck and valve
    roomValve(ctx, x + 12, F - 57, 2.4);
    roomPart(ctx, `M ${x + 12} ${F - 38} L ${x + 16} ${F - 34} L ${x + 12} ${F - 30} L ${x + 8} ${F - 34} Z`, '#8a7a40', { top: 0 });  // the warning diamond, its mark
    roomFlat(ctx, x + 11.4, F - 36, 1.2, 3.2, '#2a2620'); roomFlat(ctx, x + 10.4, F - 33.4, 3.2, 1, '#2a2620');
    for (let i = 0; i < 5; i++) roomFlat(ctx, x + 5 + i * 3, F - 25, 2, 2.4, k ? '#3a424c' : '#2e3a34');  // the bottle's code, stencilled as marks
    roomGauge(ctx, x + 18, F - 50, 2.6, k ? 0.92 : 0.36, '#9a9682');  // its pressure: the older in service, the newer full
  }
  roomPart(ctx, roomRound(a + 74, F - 3, 50, 3, 0.8), '#22344a', { top: 0.5, solid: 0.45 });  // the pump's plinth
  roomPart(ctx, roomRound(a + 76, F - 28, 46, 25, 2), '#3a4a56', { top: 1, side: 2, under: 1, solid: 0.45, shadow: false });
  roomPart(ctx, roomRound(a + 79, F - 24, 22, 15, 4), '#46525c', { top: 0.8, under: 1 });  // its motor, finned
  for (let k = 0; k < 4; k++) roomFlat(ctx, a + 83 + k * 4.5, F - 22, 1, 11, '#2e3a44');
  roomDot(ctx, a + 111, F - 16, 5, '#34424e'); ctx.lineWidth = 0.9; ctx.strokeStyle = FIG_LINE; ctx.stroke(); roomDot(ctx, a + 111, F - 16, 1.4, '#56708c');  // the volute
  for (const [sx, sy, sw] of [[a + 82, F - 6, 6], [a + 104, F - 7, 5]]) roomFlat(ctx, sx, sy, sw, 0.8, '#5a6670');  // scuffs, where boots go
  // From the right wall in: the bench's cabinet and its leg, its top, and what is on it.
  roomPart(ctx, roomRound(a + 288, F - 36, 40, 36, 1), '#3a4048', { top: 0, side: 1.5, solid: 0.45 });
  for (const dy of [3, 14]) { roomPart(ctx, roomRound(a + 291, F - 36 + dy, 34, 9, 0.8), '#424a52', { top: 0.6, under: 0.6 }); roomFlat(ctx, a + 304, F - 36 + dy + 4, 8, 1.4, '#8796a5'); }
  roomPart(ctx, roomRound(a + 236, F - 36, 5, 36, 1), '#3a4048', { top: 0, side: 1, solid: 0.45 });
  roomPart(ctx, roomRound(a + 241, F - 14, 47, 3, 0.8), '#343a42', { top: 0.6 });  // the shelf, the tool box on it
  roomPart(ctx, roomRound(a + 252, F - 24, 22, 10, 1), '#6a4434', { top: 0.8, side: 1.2 }); roomFlat(ctx, a + 259, F - 26, 8, 2, '#3a2a22');
  roomPart(ctx, roomRound(a + 232, F - 40, 100, 4, 1), '#4a5058', { top: 0.8, under: 0.8, solid: 0.5, shadow: false });
  for (const [x, cw] of [[a + 246, 3], [a + 280, 2.4], [a + 312, 2]]) roomFlat(ctx, x, F - 37.4, cw, 0.9, '#7e8a94');  // paint worn off its edge where hands rest
  roomAtDepth(ctx, a + 250, F - 40, 0.3, () => {  // the terminal, the engineer's console: its foot, its arm and its screen
    roomPart(ctx, roomRound(a + 243, F - 43, 14, 3, 0.8), '#2a3c50', { top: 0.5 });
    roomPart(ctx, roomRound(a + 248.5, F - 49, 3, 6, 0.6), '#2a3c50', { top: 0, side: 0.8 });
    roomScreen(ctx, a + 239, F - 63, 22, 13, w.flip > 0.5 ? 'status' : 'bars', time, w.burn > 0.5);
  });
  roomAtDepth(ctx, a + 300, F - 40, 0.35, () => {  // the manuals, stacked, and a mug of tea gone cold, its handle
    roomPart(ctx, roomRound(a + 292, F - 43, 18, 3, 0.6), '#4a3a30', { top: 0.6 }); roomPart(ctx, roomRound(a + 294, F - 46, 15, 3, 0.6), '#34485a', { top: 0.6 });
    ctx.strokeStyle = roomTint('#6a5a4a'); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(a + 323.5, F - 44, 2, -Math.PI / 2, Math.PI / 2); ctx.stroke();
    roomPart(ctx, roomRound(a + 316, F - 48, 7, 8, 1.2), '#6a5a4a', { top: 0.8, side: 1.2 });
  });
  // In the middle, the reactor housing.
  const hx0 = n(vx - 42), hx1 = n(vx + 42);
  roomPart(ctx, `M ${hx0} ${F} L ${hx0} ${F - 82} Q ${hx0} ${F - 90} ${n(hx0 + 8)} ${F - 90} L ${n(hx1 - 8)} ${F - 90} Q ${hx1} ${F - 90} ${hx1} ${F - 82} L ${hx1} ${F} Z`, '#2c4258', { top: 1.5, side: 3, solid: 0.6 });
  roomPart(ctx, roomRound(n(hx0 + 4), F - 76, 18, 58, 1.5), '#2f465c', { top: 0.6, side: 0.8 });  // its bolted panels, the right one a replacement
  roomPart(ctx, roomRound(n(hx1 - 22), F - 76, 18, 58, 1.5), '#40545e', { top: 0.6, side: 0.8 });
  for (const [px, col] of [[hx0 + 6, '#56708c'], [hx0 + 20, '#56708c'], [hx1 - 20, '#8a929a'], [hx1 - 6, '#8a929a']]) for (const py of [F - 73, F - 21]) roomDot(ctx, px, py, 0.7, col);
  roomPart(ctx, roomRound(n(hx0 + 7), F - 72, 12, 12, 1), '#7a7058', { top: 0.6 });  // the warning plate: the trefoil, as a mark
  ctx.fillStyle = roomTint('#2a2620'); ctx.beginPath();
  for (let k = 0; k < 3; k++) { const a0 = -Math.PI / 2 + k * 2 * Math.PI / 3 - 0.5; ctx.moveTo(hx0 + 13, F - 66); ctx.arc(hx0 + 13, F - 66, 4.6, a0, a0 + 1); ctx.closePath(); }
  ctx.fill(); roomDot(ctx, hx0 + 13, F - 66, 1, '#2a2620');
  for (let k = 0; k < 4; k++) roomFlat(ctx, hx0 + 7.5 + k * 3, F - 57, 1.5, 2.4, '#8a7a40');  // a hazard band under it
  roomPart(ctx, roomRound(n(vx - 16), F - 82, 32, 10, 1.5), '#33495f', { top: 0.8, under: 0.8 });  // the injector cover, its bolts, the telltales on it
  for (const px of [vx - 14, vx + 14]) for (const py of [F - 80, F - 74]) roomDot(ctx, px, py, 0.6, '#56708c');
  for (let k = 0; k < 4; k++) roomDot(ctx, vx - 6 + 4 * k, F - 77, 1, (Math.floor(time * 2 + k) % 3) ? '#2f5577' : '#c8703a');
  roomPart(ctx, roomRound(n(vx - 8), F - 69, 16, 10, 2), '#1a2c40', { top: 0.6 });  // the core's sight port, lit by the drive
  roomFlat(ctx, vx - 6, F - 67, 12, 6, `rgba(${core},${n(0.35 + 0.5 * hot)})`);
  roomPart(ctx, roomRound(n(vx - 16), F - 58, 32, 32, 16), '#26394d', { top: 0.6 });  // the maintenance hatch: its ring, its door, its dogs, its wheel
  roomPart(ctx, roomRound(n(vx - 14), F - 56, 28, 28, 14), '#30485f', { top: 1, under: 1 });
  for (const [dx, dy, dw, dh] of [[-1, -15.5, 2, 3], [-1, 12.5, 2, 3], [-15.5, -1, 3, 2], [12.5, -1, 3, 2]]) roomFlat(ctx, vx + dx, F - 42 + dy, dw, dh, '#8796a5');
  roomFlat(ctx, vx + 5, F - 36, 3, 1.4, '#5a6a78'); roomFlat(ctx, vx - 8, F - 47, 2.4, 1.2, '#5a6a78');  // worn where it is opened
  ctx.strokeStyle = '#6a7480'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(vx, F - 42, 8, 0, Math.PI * 2); ctx.stroke();
  ctx.lineWidth = 1; for (let k = 0; k < 3; k++) roomSeg(ctx, [[vx, F - 42], [vx + Math.cos(k * 2.094 + 0.3) * 8, F - 42 + Math.sin(k * 2.094 + 0.3) * 8]]);
  roomDot(ctx, vx, F - 42, 1.8, '#56708c');
  for (const by of [F - 86, F - 12]) roomPart(ctx, roomRound(n(hx0 - 1.5), by, 87, 5, 1), '#3a5268', { top: 0.8, under: 0.8 });  // its bands
  for (let k = 0; k < 9; k++) roomFlat(ctx, hx0 + 2 + k * 9, F - 10.6, 4.5, 2.2, k % 2 ? '#2a2620' : '#6a6038');  // the lower band's hazard marks
  // At the front: the feed down from the tank into the pump, its valve and the printed handle, tape, a cable tied along it; the pump's line
  // into the housing; the coolant up into the ceiling and along it; the drive's lines down through the deck.
  ctx.strokeStyle = '#3a3a40'; ctx.lineWidth = 0.9; roomSeg(ctx, [[a + 95.6, T + 6], [a + 95.6, F - 30]]);
  roomPipe(ctx, [a + 91, T], [a + 91, F - 28], 34, 6);
  roomPart(ctx, roomRound(a + 87, F - 72, 8, 4, 0.8), '#7a7462', { top: 0 });  // tape over a weep
  for (const ty of [F - 82, F - 38]) roomFlat(ctx, a + 87.5, ty, 9, 1.2, '#1e2a36');  // the cable ties
  roomValve(ctx, a + 91, F - 50, 6);
  roomPart(ctx, roomRound(a + 96, F - 54, 4.5, 4.5, 1), '#8a6a48', { top: 0.5, side: 0.6 });  // the printed handle, its layers, its tag
  for (const ly of [F - 52.8, F - 51.4]) roomFlat(ctx, a + 96.5, ly, 3.5, 0.4, '#6a5038');
  ctx.strokeStyle = '#7a7462'; ctx.lineWidth = 0.5; roomSeg(ctx, [[a + 98.2, F - 49.5], [a + 98.6, F - 47]]);
  roomPart(ctx, roomRound(a + 96.5, F - 47, 4, 5, 0.6), '#9a9050', { top: 0.5 }); roomDot(ctx, a + 98.5, F - 46, 0.5, '#4a4436');
  roomPipe(ctx, [a + 122, F - 15], [hx0, F - 15], 12, 5);
  roomPipe(ctx, [a + 91, T + 3], [n(vx - 30), T + 3], 26, 5); roomPipe(ctx, [n(vx + 24), T + 3], [a + 336, T + 3], 30, 5);
  for (const px of [n(vx - 30), n(vx + 24)]) roomPipe(ctx, [px, T], [px, F - 89], 40, 6);
  for (const px of [n(vx - 30), n(vx + 22)]) {
    roomPart(ctx, roomRound(px, F - 4, 8, 16, 1), '#34485c', { top: 0, side: 1.5 });
    roomPart(ctx, roomRound(n(px - 2), F - 1.5, 12, 3, 0.8), '#4a6078', { top: 0.6 });
  }
  if (w.flip < 1) {  // the drive's heat, a glow on the housing while it runs
    const gy = F - 50, g = ctx.createRadialGradient(vx, gy, 4, vx, gy, 70); g.addColorStop(0, `rgba(${core},${n(0.18 * hot * (1 - w.flip))})`); g.addColorStop(1, `rgba(${core},0)`);
    ctx.fillStyle = g; ctx.fillRect(vx - 70, F - 92, 140, 92);
  }
}

// Bunk k of n in the berths room r, three tiers high (look.md, rule 1, #1023), a person long (BUNK, #972): its left end x, its length w, and y
// the top of its frame (the mattress lies on it, 5 deep). The columns stand either side of the ladder well (well: its band in world x, the room's
// middle by default), the left ones from BERTH_NAME in from the room's left wall, which is kept clear for the room's name plate (shiplife.js, 13px
// down to the smallest window, #937), and the right ones from its right wall. The tiers are BERTH_TIER apart: the bottom one's frame on the deck,
// the top one under the ceiling, and over each sleeper the place for their thing (berthKeep) under the curtain rail and the bunk over it. The
// berths draw their bunks here, and the cutaway lays its sleepers on them (shiplife.js). The bottom tier fills from the left and the two over it
// from the right, so every column is full but the left one, a short column of what is left over, and its bunks are the last ones taken.
const BUNK = 90, BERTH_NAME = 116, BERTH_TIER = 29.5, BERTH_FRAME = 2.8;
function berthBunk(r, n, k, well = { x0: (r.x0 + r.x1) / 2, x1: (r.x0 + r.x1) / 2 }) {
  const cols = Math.max(1, Math.ceil(n / 3)), left = Math.ceil(cols / 2), m = (r.x1 - r.x0) * 0.02, lm = Math.max(m, BERTH_NAME);
  const w = Math.min(BUNK, (well.x0 - r.x0 - lm) / left), tier = k % 3, col = tier ? cols - 1 - Math.floor(k / 3) : Math.floor(k / 3);
  return { x: col < left ? r.x0 + lm + col * w : r.x1 - m - (cols - col) * w, w, y: r.floor - BERTH_FRAME - tier * BERTH_TIER };
}
// Where the cutaway lays a sleeper on bunk b (berthBunk): the hip, the head on the pillow at its left end, and the mattress under them.
const berthSleeper = b => ({ x: b.x + b.w / 2, y: b.y - 5 });
// The place on bunk b kept for its owner's one thing (#934): a box on the wall over the foot half of the mattress, above the sleeper and under
// the curtain rail, clear of the bunk's own fittings, so the thing is drawn there without redrawing the bunk.
const berthKeep = b => ({ x: b.x + b.w - 34, y: b.y - 25, w: 16, h: 7 });

// A bunk of the berths (#933) at b (berthBunk), the frame (BERTH_FRAME deep) with screws and a grab rail on its front, the mattress, the pillow
// under the sleeper's head, the blanket (spread over a sleeper, folded at the foot of an empty bunk), the curtain rail on its brackets under the
// bunk over it, the curtain (drawn back to the foot, or across the bunk: shut) and the reading lamp hung from the rail over the pillow. The place
// for its owner's thing (berthKeep) is left clear. In the box (#1024) the frame is solid, a bunk column deep, and the mattress on it shows its
// top running back from its front edge, where the sleeper lies. Every bunk the same plan: the grab rail worn in its middle where hands go.
const BUNK_DEPTH = 0.6;
function roomBunk(ctx, b, F, slept, shut) {
  const n = v => Math.round(v * 100) / 100, x = n(b.x), w = n(b.w), y = n(b.y), yr = n(y - 26.6);
  roomPart(ctx, roomRound(x, y, w, BERTH_FRAME, 1), '#1f3a56', { top: 0.8, under: 0.8, solid: BUNK_DEPTH });
  roomPart(ctx, roomRound(x + w / 2 - 14, y + 0.7, 28, 1.6, 0.8), '#3a5470', { top: 0.5 });  // a grab rail for zero g, worn in its middle where hands go
  roomFlat(ctx, x + w / 2 - 4, y + 1.1, 8, 0.8, '#6a747c');
  for (const sx of [x + 3, x + w - 3]) roomDot(ctx, sx, y + 1.4, 0.6, '#56708c');
  roomPart(ctx, roomRound(x + 2, y - 5, w - 4, 5, 2), '#3a4a5e', { top: 1, under: 0.8, solid: BUNK_DEPTH, shadow: false });
  roomPart(ctx, roomRound(x + 4, y - 9.5, 18, 4.5, 2), '#9a968a', { top: 0.8, side: 1.5 });
  if (slept) roomPart(ctx, roomRound(x + 20, y - 6.5, w - 24, 2.5, 1), '#334560', { top: 0.6 });
  else { roomPart(ctx, roomRound(x + w - 30, y - 9, 20, 4, 1.5), '#3e4f6e', { top: 1, side: 2 }); roomFlat(ctx, x + w - 29, y - 7.2, 18, 0.6, '#2c3a52'); }
  for (const bx of [x + 2, x + w - 3.5]) roomFlat(ctx, bx, yr - 1, 1.5, 3, '#2a3e54');  // the curtain rail on its brackets
  roomPart(ctx, roomRound(x + 2, yr, w - 4, 1.6, 0.8), '#3a5470', { top: 0.5 });
  // the reading lamp, a fitting under the rail (#1024, look.md rule 5): its clamp round the rail, a short stem, the shade and the bulb in it
  roomPart(ctx, roomRound(x + 6.5, yr - 0.4, 5, 2.4, 0.6), '#2a3e54', { top: 0 }); roomDot(ctx, x + 9, yr + 0.8, 0.5, '#56708c');
  roomFlat(ctx, x + 8.4, y - 24.6, 1.2, 1.6, '#2a3e54');
  roomPart(ctx, `M ${n(x + 6)} ${n(y - 23)} L ${n(x + 12)} ${n(y - 23)} L ${n(x + 14)} ${n(y - 19)} L ${n(x + 4)} ${n(y - 19)} Z`, '#4a5a6a', { top: 0.6, side: 1 });
  roomDot(ctx, x + 9, y - 18.6, 1, '#6a6048');
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

// The berths (#933): the bunks in their columns of three on posts from the deck to the ceiling, either side of the well (roomBunk), and the odd
// one or two in a short column at the left, its posts only as high as its bunks (#1023); the curtain shut on the third one ("z z" behind it at
// night in cruise); beside the well the crew's corner (berthCorner): the wall unit with its books, photo, plant, mug and reading lamp (its glow
// in cruise), the pinboard where it fits, the towel swinging on its hook and the guitar lashed to the wall. The top left is kept clear for the
// room's name (berthBunk). In the box (#1024): the corner's things first, each moved onto the back wall; then the columns, solid, from each side
// wall in toward the eye, each with its back posts on its side toward the eye (none when it straddles the eye); then the posts at the front.
// Old and patched (point 6), on the shared fixtures: the crew's lockers on the back wall left of the bunks, under the name, one door a replacement
// in another shade, the paint worn by their handles; the first bunk's curtain patched, held back by a printed clip tagged temporary; tape round
// the first post; the deck scuffed by the bunks; the grab rails worn (roomBunk) and the wall unit's newer lamp (roomWallUnit). No bunk's own
// place (berthKeep) is touched.
function roomBerths(ctx, r, s, X, W) {
  const { w, time } = s, F = r.floor, n = Math.min(12, s.berths), well = s.well || { x0: (r.x0 + r.x1) / 2, x1: (r.x0 + r.x1) / 2 }, { w: cw } = berthBunk(r, n, 0, well);
  const shut = W >= 220 && n >= 3 ? 2 : -1, r2 = v => Math.round(v * 100) / 100;
  if (W >= 300) roomOnWall(ctx, r.x0 + 60, F - 45, () => {  // the lockers: two doors, their vents, number plates, handles and the paint worn by them
    const lx = r.x0 + 40;
    roomPart(ctx, roomRound(lx, F - 60, 40, 30, 1.2), '#1f3a52', { top: 1, under: 1 });
    [0, 1].forEach(k => {
      const dx = lx + 2 + k * 18.5;
      roomPart(ctx, roomRound(dx, F - 58, 17.5, 26, 1), k ? '#34444e' : '#22405a', { top: 0.6, side: 1 });  // the second door a replacement
      for (let v = 0; v < 3; v++) roomFlat(ctx, dx + 4, F - 55.5 + v * 1.8, 9.5, 0.7, '#16283a');
      roomFlat(ctx, dx + 5.5, F - 48.5, 6, 3, '#6a6a5a'); roomFlat(ctx, dx + 7, F - 47.8, 1.2, 1.6, '#3a3a30'); roomFlat(ctx, dx + 9.2, F - 47.8, 1.2, 1.6, '#3a3a30');
      const hx = k ? dx + 2 : dx + 14; roomFlat(ctx, hx, F - 44, 1.6, 6, '#8796a5'); roomFlat(ctx, k ? hx + 1.8 : hx - 1.6, F - 43, 1.4, 4, '#6a747c');
    });
    for (const by of [F - 57, F - 34]) roomFlat(ctx, lx + 37.5, by, 1, 1, '#8a929a');
  });
  for (const [sx, sw] of [[well.x0 - 40, 5], [well.x0 - 24, 4], [berthCorner(r, n, well).x1 - 26, 5], [berthCorner(r, n, well).x1 - 12, 4]]) roomFlat(ctx, sx, F - 3, sw, 0.8, '#3e4c5a');  // scuffs on the deck by the bunks
  const c = berthCorner(r, n, well), open = c.x1 - c.x0;  // the crew's corner beside the well, each thing on the back wall, anchored at its middle
  if (W >= 300 && open >= 70) roomOnWall(ctx, c.x0 + 33, F - 73, () => roomWallUnit(ctx, c.x0 + 2, F, w, time, s.still));
  const pw = Math.min(84, open - 126); if (W >= 300 && pw >= 60) roomOnWall(ctx, c.x0 + 126 + pw / 2, F - 65, () => roomPinboard(ctx, c.x0 + 126, F, pw));
  if (W >= 260 && open >= 82) {  // the towel on its hook, moved with the wall unit it hangs beside: it swings, moved, not redrawn (a path given to roomPart is fixed per layout)
    const hx = c.x0 + 74, [ex, ey] = hangEnd(hx, F - 60, 10, 1.3, w, time, s.still);
    roomOnWall(ctx, c.x0 + 33, F - 73, () => {
      roomFlat(ctx, hx - 1.5, F - 62, 3, 3, '#3a4a5a'); ctx.strokeStyle = roomTint('#7a8a9a'); ctx.lineWidth = 1; roomSeg(ctx, [[hx, F - 60], [ex, ey]]);
      ctx.save(); ctx.translate(ex, ey); roomPart(ctx, roomRound(-3.5, 0, 7, 11, 1.2), '#8a4a40', { top: 0.6, side: 1.5 }); roomFlat(ctx, -3, 7.5, 6, 1.2, '#6a3a32'); ctx.restore();
    });
  }
  if (W >= 240 && open >= 118) roomOnWall(ctx, c.x0 + 104, F - 56, () => roomGuitar(ctx, c.x0 + 104, F));
  const posts = new Map(), cols = new Map();  // each column's bunks (and their numbers) by its left end; each post's x and how high it stands
  for (let k = 0; k < n; k++) { const b = berthBunk(r, n, k, well), x = r2(b.x); cols.set(x, [...(cols.get(x) || []), [b, k]]); }
  for (const [x, col] of cols) {  // a column three high stands to the ceiling; a short one only to the curtain rail of its top bunk, no empty tier
    const top = col.length === 3 ? F - 92 : r2(Math.min(...col.map(([b]) => b.y)) - 27.6);
    for (const px of [x, r2(x + cw)]) posts.set(px, Math.min(top, posts.has(px) ? posts.get(px) : Infinity));
  }
  const eyeOf = x => roomEyeAt(x + cw / 2), off = x => { const e = eyeOf(x); return e ? Math.abs(x + cw / 2 - e.vx) : 0; };
  for (const x of [...cols.keys()].sort((a, b) => off(b) - off(a))) {  // the columns farthest from their eye first, so a nearer one covers its side
    const e = eyeOf(x), px = !e ? null : x + cw < e.vx ? r2(x + cw) : x > e.vx ? x : null;
    if (px !== null) {  // its back post on the side toward the eye, the depth of a bunk back, a step darker
      // joined to the front post by a rail at its top, as the frames' sides join them at each tier: the column's end is one frame in depth
      const top = posts.get(px), [bx, by0] = roomInto(e, px, top, BUNK_DEPTH), by1 = roomInto(e, px, F, BUNK_DEPTH)[1], col = figShade('#2a4664', 0.72);
      roomPart(ctx, roomRound(r2(bx - 2), r2(by0), 4, r2(by1 - by0), 1), col);
      roomPart(ctx, `M ${r2(px)} ${r2(top)} L ${r2(bx)} ${r2(by0)} L ${r2(bx)} ${r2(by0 + 3)} L ${r2(px)} ${r2(top + 3)} Z`, col);
    }
    for (const [b, k] of cols.get(x)) roomBunk(ctx, b, F, k < s.asleep, k === shut);
  }
  if (n) {  // the first bunk's curtain, drawn back: a patch sewn on it, and the printed clip holding it back, its layers and its tag
    const b = berthBunk(r, n, 0, well), cx = r2(b.x + b.w - 8), yr = r2(b.y - 26.6);
    roomPart(ctx, roomRound(cx + 0.6, r2(b.y - 16), 4.4, 4.6, 0.6), '#5a4a5e', { top: 0 });
    for (let k = 0; k < 4; k++) roomFlat(ctx, cx + 1.2 + k * 1.1, b.y - 16.6, 0.5, 0.6, '#2a2236');
    roomPart(ctx, roomRound(cx + 0.4, r2(yr + 1.4), 4.8, 2.6, 0.6), '#8a6a48', { top: 0.4 }); roomFlat(ctx, cx + 0.8, yr + 2.6, 4, 0.4, '#6a5038');
    ctx.strokeStyle = '#7a7462'; ctx.lineWidth = 0.5; roomSeg(ctx, [[cx + 0.6, yr + 3], [cx - 2.4, yr + 4.6]]);
    roomPart(ctx, roomRound(cx - 4.6, r2(yr + 4.6), 3.6, 4.2, 0.6), '#9a9050', { top: 0 }); roomDot(ctx, cx - 2.8, yr + 5.6, 0.5, '#4a4436');
  }
  for (const [px, top] of posts) {  // the posts at each column's ends, bolted to the deck, and the ceiling where they reach it
    roomPart(ctx, roomRound(px - 2, top, 4, F - top, 1), '#2a4664', { top: 0, side: 1.2 });
    roomFlat(ctx, px - 3.5, F - 2, 7, 2, '#20384f'); for (const sy of [top + 2, F - 40]) if (sy > top && sy < F - 4) roomDot(ctx, px, sy, 0.6, '#56708c');  // only on the post
  }
  if (posts.size) { const px = Math.min(...posts.keys()); roomPart(ctx, roomRound(r2(px - 2.8), F - 22, 5.6, 3.2, 0.6), '#7a7462', { top: 0 }); }  // a wrap of tape round the first post
  if (shut >= 0 && s.asleep > 0 && w.cruise > 0.5) { const b = berthBunk(r, n, shut, well); worldText(ctx, s.zoom, Math.floor(time) % 2 ? 'z z' : 'z', b.x + cw - 24, b.y - 12, 12, '#9fb4c9'); }
}

// The crew's corner of the berths (#933): the open wall between the well and the first bunk right of it, in world x, a step clear of each.
function berthCorner(r, n, well) {
  const right = Array.from({ length: n }, (_, k) => berthBunk(r, n, k, well).x).filter(x => x >= well.x1), m = (r.x1 - r.x0) * 0.02;
  const r2 = v => Math.round(v * 100) / 100;
  return { x0: r2(well.x1 + 8), x1: r2((right.length ? Math.min(...right) : r.x1 - m) - 6) };
}
// The wall unit at x (62 wide) on the deck F: two shelves with a lip for zero g; on the lower one books of many heights strapped in and a mug
// in its holder, on the upper one a framed photo, a plant with its pot clipped down and the reading lamp (its glow in cruise), a newer one on an
// adapter plate on the old lamp's base, with fresh bolts (point 6).
function roomWallUnit(ctx, x, F, w, time, still) {
  const n = v => Math.round(v * 100) / 100;
  for (const ux of [x, x + 59]) roomPart(ctx, roomRound(ux, F - 90, 3, 36, 0.8), '#22405c', { top: 0, side: 1.2 });
  let bx = x + 4;  // the books, their spines in many colours, the last one leaning
  [[4, 10, '#8f8a7c'], [5, 12, '#4f7090'], [3.5, 9, '#7a4a44'], [4.5, 11, '#8a7c5e'], [3, 8.5, '#5a6e5a'], [5, 12.5, '#6a6a8a'], [4, 10, '#8a8070']].forEach(([bw, bh, col]) => {
    roomPart(ctx, roomRound(bx, F - 58 - bh, bw, bh, 0.6), col, { top: 0.6, side: 1 }); roomFlat(ctx, bx + 0.8, F - 58 - bh * 0.7, bw - 1.6, 0.8, figShade(col, 0.7 * roomTone)); bx += bw + 0.3;
  });
  roomPart(ctx, `M ${n(bx + 0.5)} ${F - 58} L ${n(bx + 4.5)} ${F - 58} L ${n(bx + 8.5)} ${F - 67.5} L ${n(bx + 4.5)} ${F - 67.5} Z`, '#4a5a70', { top: 0, side: 1 });
  ctx.strokeStyle = roomTint('#5a4e3a'); ctx.lineWidth = 1.2; roomSeg(ctx, [[x + 3, F - 64], [bx + 6, F - 64]]); roomFlat(ctx, x + 18, F - 65.2, 3, 2.4, '#8796a5');  // the strap and its buckle
  const mx = x + 48;  // the mug in its holder
  roomPart(ctx, roomRound(mx, F - 67, 8, 9, 1.2), '#7d8a98', { top: 1, side: 2 }); ctx.strokeStyle = roomTint('#7d8a98'); ctx.lineWidth = 1.3; ctx.beginPath(); ctx.arc(mx + 9, F - 63, 2.3, -Math.PI / 2, Math.PI / 2); ctx.stroke();
  roomPart(ctx, roomRound(mx - 1, F - 61.5, 10, 3.5, 0.8), '#3a4a5a', { top: 0.5 });
  roomPart(ctx, roomRound(x + 6, F - 93, 12, 13, 1), '#3a2c20', { top: 0.8, side: 1.2 });  // the photo in its frame: two people against a sky
  roomFlat(ctx, x + 7.5, F - 91.5, 9, 10, '#3e5a6a'); roomFlat(ctx, x + 7.5, F - 85, 9, 3.5, '#2e4450');
  for (const [px, col] of [[x + 10, '#8a7a6a'], [x + 14, '#6a5a4a']]) { roomDot(ctx, px, F - 88, 1.4, col); roomFlat(ctx, px - 1.8, F - 86.5, 3.6, 3, col); }
  roomPlant(ctx, x + 30, F - 86, w, time, still, 0.6); roomFlat(ctx, x + 26, F - 84, 8, 1.2, '#8796a5');  // the plant, its pot clipped to the shelf
  const lx = x + 50;  // the reading lamp
  roomPart(ctx, roomRound(lx - 6, F - 82, 12, 2, 0.8), '#2e4458', { top: 0.5 });  // the old lamp's base, and the newer lamp on an adapter plate on it, fresh bolts
  roomPart(ctx, roomRound(lx - 4, F - 83.4, 8, 1.4, 0.5), '#4a5058', { top: 0.4 }); for (const bx of [lx - 5.4, lx + 4.4]) roomFlat(ctx, bx, F - 81.6, 1, 1, '#8a929a');
  ctx.strokeStyle = roomTint('#56708c'); ctx.lineWidth = 1; roomSeg(ctx, [[lx - 2, F - 82], [lx, F - 88]]);
  roomPart(ctx, `M ${n(lx - 3)} ${F - 92} L ${n(lx + 3)} ${F - 92} L ${n(lx + 5)} ${F - 87.5} L ${n(lx - 5)} ${F - 87.5} Z`, '#4a5a6a', { top: 0.6, side: 1 });
  roomDot(ctx, lx, F - 87, 1.2, w.cruise > 0.05 ? '#e0c890' : '#6a6048');
  for (const sy of [F - 80, F - 58]) {  // the shelves and their lips, over the feet of what stands on them, each on two brackets screwed to the wall
    roomPart(ctx, roomRound(x, sy, 62, 3, 1), '#284a68', { top: 0.8, under: 1 }); roomPart(ctx, roomRound(x + 1, sy - 1.6, 60, 1.6, 0.6), '#2c4c6e', { top: 0.5 });
    for (const bx of [x + 10, x + 50]) {  // a bracket: its plate on the wall and the gusset up to the shelf's underside
      roomPart(ctx, `M ${n(bx)} ${n(sy + 3)} L ${n(bx + 2)} ${n(sy + 3)} L ${n(bx + 2)} ${n(sy + 8)} L ${n(bx)} ${n(sy + 8)} Z`, '#2a3e54', { top: 0 });
      roomPart(ctx, `M ${n(bx + 2)} ${n(sy + 3)} L ${n(bx + 6)} ${n(sy + 3)} L ${n(bx + 2)} ${n(sy + 7)} Z`, '#2a3e54', { top: 0 });
      roomDot(ctx, bx + 1, sy + 6.5, 0.5, '#56708c');
    }
  }
  if (w.cruise > 0.05) { const g = ctx.createRadialGradient(lx, F - 86, 1, lx, F - 86, 50); g.addColorStop(0, `rgba(255,220,160,${0.35 * w.cruise})`); g.addColorStop(1, 'rgba(255,220,160,0)'); ctx.fillStyle = g; ctx.fillRect(lx - 46, F - 100, 96, 100); }
}
// The guitar at gx (#933), a person's guitar (about 50 units, a person 89): its foot GUITAR_FOOT above the deck, the body with its lit top
// face over the darker side, the sound hole and its rosette, the pickguard and the bridge, the neck with its frets, the headstock and its
// tuners, six strings and the strap; hung on a hook and lashed to the wall at the neck and the body for the burn. Drawn from its full-size
// measures (h, the height above its foot's old place at 13) scaled by GUITAR_K.
const GUITAR_K = 0.62, GUITAR_FOOT = 30;
function roomGuitar(ctx, gx, F) {
  const k = GUITAR_K, n = v => Math.round(v * 100) / 100, X = dx => n(gx + dx * k), Y = h => n(F - GUITAR_FOOT - (h - 13) * k), body = d => {
    const p = (dx, dy) => `${n(gx + (dx + d) * k)} ${n(F - GUITAR_FOOT - (dy - 13 - d / 2.5) * k)}`;
    return `M ${p(0, 13)} Q ${p(13.5, 13)} ${p(13, 28)} Q ${p(12.5, 39)} ${p(8.5, 43)} Q ${p(10.5, 46.5)} ${p(10, 52)} Q ${p(9.5, 60)} ${p(0, 60)} Q ${p(-9.5, 60)} ${p(-10, 52)} Q ${p(-10.5, 46.5)} ${p(-8.5, 43)} Q ${p(-12.5, 39)} ${p(-13, 28)} Q ${p(-13.5, 13)} ${p(0, 13)} Z`;
  };
  roomFlat(ctx, gx - 1.5, Y(96), 3, 3, '#3a4a5a');  // the hook
  ctx.strokeStyle = roomTint('#5a4030'); ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(X(-1), Y(14)); ctx.quadraticCurveTo(X(-26), Y(36), X(-2.5), Y(62)); ctx.stroke();  // the strap
  roomPart(ctx, body(2.5), '#5a3a20', { top: 0, side: 1.5 });  // the side, in shade
  roomPart(ctx, body(0), '#9a6c40', { top: 1.2, side: 1.5 });
  ctx.strokeStyle = roomTint('#b0a078'); ctx.lineWidth = 0.8; ctx.beginPath(); ctx.arc(gx, Y(42), 5.4 * k, 0, Math.PI * 2); ctx.stroke();  // the rosette
  roomDot(ctx, gx, Y(42), 4 * k, '#1e140c');
  roomPart(ctx, `M ${X(3.5)} ${Y(37)} Q ${X(10)} ${Y(37.5)} ${X(9)} ${Y(31)} Q ${X(6.5)} ${Y(27.5)} ${X(3.5)} ${Y(31)} Z`, '#4a2e1c', { top: 0 });  // the pickguard
  roomPart(ctx, roomRound(X(-6.5), Y(26), 13 * k, 3 * k, 0.8), '#3a2414', { top: 0.6 }); roomFlat(ctx, X(-4), Y(26.6), 8 * k, 0.6, '#a89c84');  // the bridge, its saddle
  roomPart(ctx, roomRound(X(-2.8), Y(85), 5.6 * k, 26 * k, 0.8), '#4a3020', { top: 0, side: 1.2 });  // the neck and the fretboard
  roomFlat(ctx, X(-2.1), Y(85), 4.2 * k, 24 * k, '#2e1e14'); for (let h = 82; h > 62; h -= 3.6) roomFlat(ctx, X(-2.1), Y(h), 4.2 * k, 0.4, '#8a8070');
  roomPart(ctx, `M ${X(-3)} ${Y(85)} L ${X(3)} ${Y(85)} L ${X(4.2)} ${Y(93)} L ${X(-4.2)} ${Y(93)} Z`, '#3a2618', { top: 0.6, side: 1 });  // the headstock
  for (const h of [91.5, 89, 86.5]) for (const sd of [-1, 1]) { roomFlat(ctx, sd < 0 ? X(-6.6) : X(4.6), Y(h) - 0.5, 2 * k, 1, '#8796a5'); roomDot(ctx, X(sd * 2.2), Y(h), 0.5, '#a8a090'); }  // the tuners
  ctx.strokeStyle = 'rgba(214,206,190,0.75)'; ctx.lineWidth = 0.35; for (let s = 0; s < 6; s++) { const sx = X(-1.75 + s * 0.7); roomSeg(ctx, [[sx, Y(85)], [sx, Y(25)]]); }  // the strings
  for (const [h, half] of [[74, 5.5], [20, 12]]) {  // the lashings to rings in the wall
    roomPart(ctx, roomRound(X(-half), Y(h), 2 * half * k, 1.6, 0.6), '#3a3a40', { top: 0 });
    for (const sd of [-1, 1]) roomDot(ctx, X(sd * (half + 1.2)), Y(h) + 0.8, 0.9, '#56708c');
  }
}
// The pinboard at x, pw wide, on the deck F: a framed cork board with notes and photos pinned on it, a little askew; no words on them.
function roomPinboard(ctx, x, F, pw) {
  const n = v => Math.round(v * 100) / 100, cx = x + 3, cy = F - 81;
  roomPart(ctx, roomRound(x, F - 84, pw, 38, 1.5), '#3a2c20', { top: 1, side: 2, under: 1 });
  roomPart(ctx, roomRound(cx, cy, pw - 6, 32, 0.8), '#7a6446', { top: 0 });
  for (let k = 0; k < 9; k++) roomFlat(ctx, cx + 3 + ((k * 17) % (pw - 12)), cy + 3 + ((k * 11) % 26), 1, 1, '#6a563a');
  const items = [[4, 3, 14, 12, 'note', 0.8], [22, 2, 12, 14, 'photo', -0.6], [40, 5, 13, 11, 'note', -0.5], [57, 3, 12, 14, 'photo', 0.7], [8, 18, 12, 11, 'note', -0.6], [28, 18.5, 15, 11, 'photo', 0.5], [50, 19, 15, 10, 'note', -0.7]];
  for (const [dx, dy, iw, ih, kind, tilt] of items) {
    if (dx + iw > pw - 7) continue;
    const a = cx + dx, b = cy + dy;
    roomPart(ctx, `M ${n(a + tilt)} ${n(b)} L ${n(a + iw + tilt)} ${n(b + tilt * 0.6)} L ${n(a + iw - tilt)} ${n(b + ih)} L ${n(a - tilt)} ${n(b + ih - tilt * 0.6)} Z`, kind === 'note' ? (dx % 3 ? '#9a9480' : '#8a9478') : '#a09a8c', { top: 0, side: 1 });
    if (kind === 'note') for (let l = 0; l < 3; l++) roomFlat(ctx, a + 2.5, b + 3 + l * 2.6, iw - 5 - (l % 2) * 3, 0.6, '#5a5448');
    else { roomFlat(ctx, a + 1.8, b + 1.8, iw - 3.6, ih - 5, '#4a6a7a'); roomFlat(ctx, a + 1.8, b + ih - 5.5, iw - 3.6, 2.2, '#3e5244'); roomDot(ctx, a + iw / 2, b + ih / 2 - 1, 1.3, '#8a7a6a'); }
    roomDot(ctx, a + iw / 2, b + 1.4, 1, '#9a4a3e');  // its pin
  }
}

// The galley's mess table (#925), the length of its bench, at seated height: drawn after the people (shiplife.js), so those sitting at it
// facing you are behind it, their laps under the top (#978). Its top on two pedestal legs, a tie-down rail along its front with rings for the
// lashings (#933); the plates and the mug on it; the lashings from its rings to the deck in the hard burn. Its front edge worn where hands rest (point 6).
function roomMessTable(ctx, r, s) {
  if (r.x1 - r.x0 >= 200) roomIn(roomBays(r, s.well), () => roomMessTableIn(ctx, r, s));  // its top solid, in the galley's box (#1024)
}
function roomMessTableIn(ctx, r, s) {
  const W = r.x1 - r.x0, X = sh => r.x0 + W * sh, F = r.floor, { w } = s, time = s.still ? 0 : s.time;
  const tx = X(0.25), tw = X(0.73) - tx, rings = Array.from({ length: 6 }, (_, k) => tx + 14 + (tw - 28) * k / 5);
  for (const lx of [tx + 8, tx + tw - 13]) {
    roomPart(ctx, `M ${lx} ${F - 27} L ${lx + 5} ${F - 27} L ${lx + 4.2} ${F - 2.5} L ${lx + 0.8} ${F - 2.5} Z`, '#20384f', { top: 0, side: 1.6 });
    roomPart(ctx, roomRound(lx - 3.5, F - 2.8, 12, 2.8, 1), '#24405e', { top: 0.7 }); roomDot(ctx, lx - 1.5, F - 1.4, 0.6, '#56708c'); roomDot(ctx, lx + 6.5, F - 1.4, 0.6, '#56708c');
  }
  roomPart(ctx, roomRound(tx, F - 32, tw, 5, 1.5), '#2c4c6e', { top: 1.2, under: 1.2, solid: 0.4 });
  for (const f of [0.2, 0.42, 0.64, 0.86]) roomFlat(ctx, tx + tw * f, F - 28.4, 3, 0.9, '#7e8a94');  // paint worn off its edge where hands rest
  roomPart(ctx, roomRound(tx + 6, F - 27.6, tw - 12, 2.2, 1), '#4a6680', { top: 0.6 });  // the tie-down rail
  ctx.strokeStyle = '#6a8098'; ctx.lineWidth = 0.8; for (const x of rings) { ctx.beginPath(); ctx.arc(x, F - 24.4, 1.4, 0, Math.PI * 2); ctx.stroke(); }
  for (const f of [0.3, 0.45]) roomPart(ctx, roomRound(tx + tw * f - 1, F - 34.4, 10, 2.4, 1.1), '#aaa395', { top: 0 });
  roomDot(ctx, tx + tw * 0.45 + 3.5, F - 35, 1.6, '#8e4a3c');
  roomMug(ctx, tx + tw * 0.75, F - 34, w, time);
  if (w.burn > 0.5) { ctx.strokeStyle = 'rgba(140,170,200,0.5)'; ctx.lineWidth = 0.8; for (const x of rings) roomSeg(ctx, [[x, F - 23], [x + 5, F]]); }
}

// The galley (#933): a counter at the waist with its cupboards, latched, the knife strip over it and a pot plant on it, where the cook works
// (routineSpot); a water dispenser standing on the worktop; latched cupboards at head height either side of the framed porthole, a grab rail under
// them; the stove under its hood at the far end, the pans on a rail. The top left is kept clear for the room's name and the top right for the
// thrust sign (both shiplife.js), down to the smallest window (#937). In the box (#1024): what is on the wall first, moved onto the back wall;
// then what stands on the floor, solid, from each side wall in toward the eye. Old and patched (point 6): the paint worn beside every latch, one of
// the counter's doors a replacement in another shade, the dispenser's head a newer unit on the old foot with fresh bolts, its water line taped and
// tied, the stove cupboard's latch printed and tagged temporary, and scuffs low on the stove and the counter where boots go (the table's worn edge
// and the bench's foot bar are theirs: roomMessTableIn, roomBench).
function roomGalley(ctx, r, s, X, W) {
  const { w, time } = s, F = r.floor, latch = (x, y) => { roomFlat(ctx, x, y, 2, 4, '#8796a5'); roomDot(ctx, x + 1, y - 1.2, 0.5, '#56708c'); roomFlat(ctx, x - 1.4, y + 0.6, 1.2, 2.6, '#6a747c'); };  // the paint worn beside it
  const cupboards = (x0, x1, top, bottom) => {  // a wall cupboard of two doors, each with its latch where they meet
    roomPart(ctx, roomRound(x0, top, x1 - x0, bottom - top, 1.5), '#22405c', { top: 1.2, side: 2.5, under: 1.5 });
    const dw = (x1 - x0 - 6) / 2;
    for (const k of [0, 1]) { const dx = x0 + 2 + k * (dw + 2); roomPart(ctx, roomRound(dx, top + 2, dw, bottom - top - 5, 1.2), '#284a68', { top: 0.8, side: 1.2 }); latch(k ? dx + 2 : dx + dw - 4, bottom - 10); }
  };
  const cx = X(0.74), cw = Math.min(100, W * 0.24), sw = cw * 0.55;
  // On the wall.
  if (W >= 300) {
    const k0 = X(0.075), k1 = X(0.155), ky = F - 48;  // the knife strip, its knives hung by their blades, handles down; on the wall clear of the room's name
    roomOnWall(ctx, k1, ky, () => {
      [[0.12, 5.5], [0.32, 4.5], [0.55, 6], [0.78, 3.8]].forEach(([f, len]) => {
        const x = k0 + (k1 - k0) * f;
        roomPart(ctx, `M ${x} ${ky} L ${x + 2.2} ${ky} L ${x + 2.2} ${ky + 2 - len} L ${x} ${ky - len} Z`, '#7d8995', { top: 0 });
        roomPart(ctx, roomRound(x - 0.2, ky, 2.6, 5.5, 0.9), '#3a2c24', { top: 0 });
      });
      roomPart(ctx, roomRound(k0, ky - 3, k1 - k0, 3, 1), '#2a3a4a', { top: 0.8 });
    });
  }
  roomOnWall(ctx, (X(0.25) + X(0.39)) / 2, F - 85, () => {
    cupboards(X(0.25), X(0.39), F - 96, F - 74);
    worldText(ctx, s.zoom, 'MUGS', X(0.25) + 8, F - 79, 9, roomTint('#a8987a'));
    roomPart(ctx, roomRound(X(0.25), F - 71.5, X(0.39) - X(0.25), 2, 1), '#3a5470', { top: 0.6 });  // a grab rail for zero g
  });
  roomOnWall(ctx, X(0.47), F - 68, () => roomPorthole(ctx, X(0.47), F - 68, 13, s.spin));
  if (W >= 340) roomOnWall(ctx, (X(0.55) + X(0.63)) / 2, F - 85, () => cupboards(X(0.55), X(0.63), F - 96, F - 74));
  if (W >= 240) {
    // The hood on the wall centred over the burners as they lie on the hob's top (#1024), and the pans on their rail in the gap between it and the
    // cupboard (or the porthole), clear of the thrust sign (shiplife.js). wallAt: a group whose own centre is c, put on the wall at x = at.
    const e = roomEye(r), wallAt = (c, y, at, fn) => { const ax = e.vx + (at - e.vx) / e.k; roomOnWall(ctx, ax, y, () => { ctx.translate(ax - c, 0); fn(); }); };
    const hood = roomInto(e, cx + 5 + sw / 2, F - 41, 0.25)[0], hc = cx + sw / 2;
    wallAt(hc, F - 66, hood, () => {  // the hood over the burners, its filter's slots
      roomPart(ctx, `M ${cx - 2} ${F - 61} L ${cx + sw + 2} ${F - 61} L ${cx + sw - 6} ${F - 71} L ${cx + 6} ${F - 71} Z`, '#56708c', { top: 1, under: 1.5 });
      for (let k = 0; k < 4; k++) roomFlat(ctx, cx + 9 + k * (sw - 14) / 4, F - 66.5, (sw - 14) / 4 - 3, 1.5, '#2c4c6e');
    });
    if (W >= 320) {
      const p0 = cx + sw + 6, p1 = cx + cw - 2, onWallX = (x, c, y) => x + roomInto(e, c, y)[0] - c;
      const from = W >= 340 ? onWallX(X(0.63), (X(0.55) + X(0.63)) / 2, F - 85) : onWallX(X(0.47) + 19, X(0.47), F - 68);
      wallAt((p0 + p1) / 2, F - 63, (from + hood - sw / 2 - 2) / 2, () => {
        roomPart(ctx, roomRound(p0, F - 64, p1 - p0, 2.5, 1), '#3d5a7a', { top: 0.8 });
        [[0.3, 6, 6], [0.75, 9, 7]].forEach(([f, l, rad], k) => {
          const ax = p0 + (p1 - p0) * f, [ex, ey] = hangEnd(ax, F - 61.5, l, k * 1.7, w, time, s.still);
          ctx.strokeStyle = roomTint('#7a8a9a'); ctx.lineWidth = 1.2; roomSeg(ctx, [[ax, F - 61.5], [ex, ey]]); roomDot(ctx, ex, ey + rad * 0.6, rad, '#4a5662');
          ctx.lineWidth = 0.9; ctx.strokeStyle = FIG_LINE; ctx.stroke(); roomDot(ctx, ex, ey + rad * 0.6, rad - 2, '#2e3842');
        });
      });
    }
  }
  // On the floor, from the left wall in: the counter and its worktop, the plant on it, the water dispenser at its end.
  if (W >= 300) {
    const c0 = X(0.02), c1 = X(0.205);
    roomPart(ctx, roomRound(c0, F - 37, c1 - c0, 33, 1.5), '#1f3852', { top: 0, side: 3, under: 1.5, solid: 0.45 }); roomFlat(ctx, c0 + 2, F - 4, c1 - c0 - 4, 4, '#0f1d2c');
    const dw = (c1 - c0 - 9) / 2;
    for (const k of [0, 1]) { const dx = c0 + 3 + k * (dw + 3); roomPart(ctx, roomRound(dx, F - 34, dw, 27, 1.2), k ? '#2e4658' : '#24405e', { top: 0.8, side: 1.4 }); latch(k ? dx + 2 : dx + dw - 4, F - 27); }  // the second door a replacement
    for (const [sx, sw] of [[c0 + 6, 5], [c1 - 14, 4]]) roomFlat(ctx, sx, F - 6, sw, 0.8, '#5a6670');  // scuffs, where boots go
    roomPart(ctx, roomRound(c0 - 1.5, F - 41, c1 - c0 + 3, 4, 1.2), '#2c4c6e', { top: 1, under: 0.8, solid: 0.5 });  // the worktop, at the waist
    roomAtDepth(ctx, X(0.04), F - 41, 0.25, () => roomPlant(ctx, X(0.04), F - 47, w, time, s.still, 0.6));  // small, under the room's name
    // The water dispenser, standing on the worktop between the plant and the knife strip (look.md rule 5), low enough to stay clear of the room's
    // name: its foot on the top, the drip tray on it, the tap, the head and the bottle on the head.
    const d0 = X(0.08), d1 = X(0.115), dm = (d0 + d1) / 2;
    roomAtDepth(ctx, dm, F - 41, 0.25, () => {
      roomPart(ctx, roomRound(d0, F - 43, d1 - d0, 2, 0.8), '#2a4664', { top: 0.5 });  // the foot and its drip tray, the old mount, fresh bolts in it
      for (const bx of [d0 + 1, d1 - 2]) roomFlat(ctx, bx, F - 42.6, 1, 1, '#8a929a');
      roomFlat(ctx, dm - 1.5, F - 51, 3, 8, '#24405e');  // the column up to the head
      roomFlat(ctx, dm - 1, F - 47, 2, 2.5, '#8796a5');  // the tap
      roomPart(ctx, roomRound(d1 - 2.4, F - 50, 1.4, 7, 0.6), '#3a4a56', { top: 0 });  // its water line down to the foot, taped and tied
      roomPart(ctx, roomRound(d1 - 3, F - 46.8, 2.6, 1.6, 0.5), '#7a7462', { top: 0 }); roomFlat(ctx, d1 - 3, F - 44.4, 2.6, 0.8, '#1e2a36');  // under the head, where it shows
      roomPart(ctx, roomRound(d0, F - 52, d1 - d0, 5, 1.2), '#4e565e', { top: 0.8, side: 1.5 });  // the head, a newer unit in another finish
      roomPart(ctx, roomRound(d0 + 1.5, F - 59, d1 - d0 - 3, 7, 2.2), '#3d6a86', { top: 1, side: 1.8 });
      roomFlat(ctx, d0 + 2.5, F - 55, d1 - d0 - 5, 0.8, '#6a9ab4');  // the water line
    });
  }
  if (W >= 240) {
    // From the right wall in, the stove (#933): two burners as rings on its top (the kettle on one, its ring lit while it steams in cruise), the
    // oven door with its window, handle and knobs, and a cupboard beside it.
    roomPart(ctx, roomRound(cx + 3, F - 36, cw - 6, 32, 1.5), '#1b3550', { top: 0, side: 3, solid: 0.45 }); roomFlat(ctx, cx + 5, F - 4, cw - 10, 4, '#0f1d2c');
    roomPart(ctx, roomRound(cx + 8, F - 31, sw - 12, 25, 1.5), '#132538', { top: 1 }); roomFlat(ctx, cx + 12, F - 24, sw - 20, 12, '#2a1a10');
    roomPart(ctx, roomRound(cx + 11, F - 29, sw - 18, 2, 1), '#7a8794', { top: 0 });
    for (let k = 0; k < 3; k++) roomDot(ctx, cx + 14 + k * (sw - 20) / 2, F - 33.5, 1.2, '#7a8794');
    roomPart(ctx, roomRound(cx + sw + 2, F - 31, cw - sw - 10, 25, 1.5), '#132538', { top: 1, side: 1.5 });
    const lx = cx + sw + 5;  // the cupboard's latch, printed: its layers, and its tag hung under it on a thread
    roomPart(ctx, roomRound(lx - 0.5, F - 23.5, 3, 5, 0.8), '#8a6a48', { top: 0.5, side: 0.6 }); for (const ly of [F - 22, F - 20.4]) roomFlat(ctx, lx, ly, 2, 0.4, '#6a5038');
    ctx.strokeStyle = '#7a7462'; ctx.lineWidth = 0.5; roomSeg(ctx, [[lx + 1, F - 18.5], [lx + 1.4, F - 16.5]]);
    roomPart(ctx, roomRound(lx - 0.6, F - 16.5, 4, 4.5, 0.6), '#9a9050', { top: 0.5 }); roomDot(ctx, lx + 1.4, F - 15.5, 0.5, '#4a4436');
    for (const [sx, sw2] of [[cx + 12, 5], [cx + sw - 6, 4], [cx + sw + 8, 3]]) roomFlat(ctx, sx, F - 6, sw2, 0.8, '#5a6670');  // scuffs low on the stove, where the cook stands
    roomPart(ctx, roomRound(cx - 1, F - 41, cw + 2, 5, 1.2), '#2c4c6e', { top: 1.2, under: 1, solid: 0.5 });
    const e = roomEye(r), rx = sw / 4 - 3;
    for (const bx of [cx + 6, cx + sw / 2 + 4]) {
      const [ex, ey] = roomInto(e, bx + rx + 3, F - 41, 0.25), ring = (a, b, col) => { ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(ex, ey, a, b, 0, 0, Math.PI * 2); ctx.fill(); };
      ring(rx, 1.5, '#0b1520');
      if (bx === cx + 6 && w.cruise > 0.05) { ring(rx - 1, 1.1, `rgba(255,122,58,${0.8 * w.cruise})`); ring(rx - 3, 0.6, '#0b1520'); }
    }
    roomAtDepth(ctx, cx + 18, F - 41, 0.25, () => {  // the kettle on the lit ring
      roomPart(ctx, `M ${cx + 26} ${F - 49} L ${cx + 31} ${F - 52} L ${cx + 32} ${F - 50.5} L ${cx + 26} ${F - 45} Z`, '#7d8a98', { top: 0 });  // its spout
      roomPart(ctx, roomRound(cx + 10, F - 53, 16, 12, 3.5), '#7d8a98', { top: 1, side: 3 }); roomPart(ctx, roomRound(cx + 15, F - 55, 6, 2, 0.8), '#4a5662', { top: 0 });
    });
  }
}

// The gunnery (#933), on the gun deck beside the workshop. Its seats (SEATS.gunnery) face left (SEAT_FACE), each at its console: a fire-control console
// mirrored from the bridge's, at the waist, its sloped top rising away from the seat. The gun station at the first: the targeting scope on the
// console's far end at the seated gunner's eye (the room's name is over it, so nothing stands higher there), the ready lamp, and two grips with
// their triggers at the hands, the paint worn off the edge where the hands rest, one grip a replacement. At the second: the status screen (the
// flip's heading arrow on it at the flip), and the range finder with its glass on a mount printed on the ship's fabricator, tagged temporary
// (docs/bible/technology.md); the range tables taped on the wall over it. The torpedo rack holds what the ship carries (s.torpedoes, #956): six
// cradles (GUN_CRADLES), filled from the bottom, each torpedo with its fins, two clamps closed over it and a safety pin with its tag, the empty
// cradles' clamps open, the count chalked on the rack's header as marks (a line says the gunner writes it there). The ammunition locker, its lid's
// seam and latch, scuffed; the weapons locker, a newer unit bolted on an older plinth with fresh bolts. Over the ammunition locker the
// close-defense turret's mount in the ceiling, its lock pin and tag, the feed chute down to the tray, a belt of rounds in it and down into the
// locker. On the wall the cable conduit from the second console up into the ceiling, taped once, a cable tied along it; and the recoil plate, its
// warning as a pictogram (no words under 12px). In the box (#1024): the wall's things first; then the consoles from the left wall in, the lockers
// and the rack from the right; then at the front the turret's feed. Its lamp is a fitting (LAMP_FITTED). Nothing under the room's name.
const GUN_CRADLES = 6;  // the rack's cradles: the magazine's six (TORP_MAX, torpedoes.js, loaded after this file)
const GUN_RACK = 0.605;  // the rack's left end, a share of the room's width; it is 62 wide
// Cradle k of the torpedo rack, from the bottom: the box its torpedo's body fills, the nose at its left end; the tail and the fins stand past its right.
const gunRackX = r => Math.round((r.x0 + (r.x1 - r.x0) * GUN_RACK) * 100) / 100;
const gunCradle = (r, k) => ({ x: Math.round((gunRackX(r) + 6) * 100) / 100, y: r.floor - 14 - 12.5 * k, w: 46, h: 7 });
// A fire-control console in front of the seat at sx, to its left: the body with a recess for the knees, its access panel and switches, and the
// sloped top, solid (#1024). Returns the top's height at x.
function gunConsole(ctx, sx, F) {
  const n = v => Math.round(v * 100) / 100;
  roomPart(ctx, `M ${n(sx - 24)} ${F - 33} L ${n(sx - 68)} ${F - 33} L ${n(sx - 68)} ${F - 1} L ${n(sx - 30)} ${F - 1} L ${n(sx - 30)} ${F - 9} L ${n(sx - 24)} ${F - 12} Z`, '#1e3852', { top: 0, side: -3, solid: 0.45 });
  roomPart(ctx, roomRound(n(sx - 59), F - 29, 24, 19, 1.2), '#22405c', { top: 0.8, side: -1.2 });  // its access panel, screwed shut, and a vent
  for (const [x, y] of [[sx - 57, F - 27], [sx - 37, F - 27], [sx - 57, F - 12], [sx - 37, F - 12]]) roomDot(ctx, x, y, 0.6, '#56708c');
  for (let k = 0; k < 4; k++) roomFlat(ctx, sx - 54 + k * 4, F - 6, 2.5, 1, '#0f1d2c');
  for (let k = 0; k < 3; k++) { roomFlat(ctx, sx - 30, F - 29 + k * 5, 3, 1.2, '#2a3e54'); roomFlat(ctx, sx - 29, F - 30.5 + k * 5, 1, 2, '#8796a5'); }  // the switches
  roomPart(ctx, `M ${n(sx - 17)} ${F - 33} L ${n(sx - 17)} ${F - 36} L ${n(sx - 70)} ${F - 42} L ${n(sx - 70)} ${F - 33} Z`, '#2a4a6a', { top: 0, under: 1, solid: 0.5, slope: [F - 42, F - 36] });
  ctx.strokeStyle = figShade('#2a4a6a', 1.5); ctx.lineWidth = 1; roomSeg(ctx, [[sx - 17.5, F - 35.5], [sx - 69.5, F - 41.5]]);  // its lit edge
  return x => F - 36 - 6 * (sx - 17 - x) / 53;
}
// A torpedo in cradle c (gunCradle): the body, its warhead's seam, the boat tail and two fins, and the safety pin with its tag hung under it.
function gunTorpedo(ctx, c) {
  const n = v => Math.round(v * 100) / 100, { x, y, w, h } = c, e = n(x + w);
  roomPart(ctx, `M ${n(x + 6)} ${y} L ${e} ${y} L ${e} ${y + h} L ${n(x + 6)} ${y + h} Q ${x} ${y + h} ${x} ${y + h / 2} Q ${x} ${y} ${n(x + 6)} ${y} Z`, '#5a6458', { top: 1, under: 1.2 });
  roomFlat(ctx, x + 11, y + 0.6, 0.8, h - 1.2, '#3e463c');  // the warhead's seam
  roomPart(ctx, `M ${e} ${y + 0.8} L ${n(e + 6)} ${y + 2} L ${n(e + 6)} ${y + h - 2} L ${e} ${y + h - 0.8} Z`, '#454c44', { top: 0 });  // the tail
  roomPart(ctx, `M ${n(e - 3)} ${y} L ${n(e + 3)} ${y - 2.5} L ${n(e + 5)} ${y - 2.5} L ${n(e + 4)} ${y} Z`, '#454c44', { top: 0 });  // the fins
  roomPart(ctx, `M ${n(e - 3)} ${y + h} L ${n(e + 4)} ${y + h} L ${n(e + 5)} ${y + h + 2.5} L ${n(e + 3)} ${y + h + 2.5} Z`, '#454c44', { top: 0 });
  roomFlat(ctx, x + 5.4, y - 1, 1, 2.2, '#8796a5');  // the safety pin, its thread down to the tag
  ctx.strokeStyle = '#7a7462'; ctx.lineWidth = 0.5; roomSeg(ctx, [[x + 5.9, y + 1.2], [x + 5.8, y + h + 0.4]]);
  roomPart(ctx, roomRound(x + 4, y + h + 0.3, 3.5, 4.5, 0.6), '#8e3a32', { top: 0 }); roomDot(ctx, x + 5.75, y + h + 1.2, 0.5, '#4a2a26');
}
// The torpedo rack (n torpedoes): its body, a rack deep and solid, the cradles' rails and saddles, the torpedoes, the clamps (closed over a
// torpedo, open and folded down on an empty cradle's saddle), the posts at its ends, the base, and the header with the count chalked on it.
function gunRack(ctx, r, n) {
  const F = r.floor, rx = gunRackX(r);
  roomPart(ctx, roomRound(rx, F - 82, 62, 82, 1), '#16283a', { top: 0, solid: 0.6 });
  for (let k = 0; k < GUN_CRADLES; k++) {
    const c = gunCradle(r, k);
    roomFlat(ctx, rx + 3, c.y + c.h + 1.2, 56, 1.2, '#22364a');  // the rail the saddles stand on
    for (const sx of [c.x + 10, c.x + 28]) roomPart(ctx, roomRound(sx, c.y + c.h - 1, 8, 2.5, 1), '#3a5068', { top: 0.5 });
    if (k < n) gunTorpedo(ctx, c);
    for (const cx of [c.x + 13, c.x + 31]) {
      if (k < n) { roomPart(ctx, roomRound(cx, c.y - 1, 2.5, c.h + 2, 0.8), '#6a7480', { top: 0.5, side: 0.6 }); roomDot(ctx, cx + 1.25, c.y + 0.6, 0.5, '#2a3446'); }
      else roomPart(ctx, roomRound(cx - 1.75, c.y + c.h - 2.6, 6, 1.6, 0.6), '#6a7480', { top: 0.5 });  // open, folded down on its saddle
    }
  }
  roomPart(ctx, roomRound(rx - 1, F - 4, 64, 4, 1), '#2e4864', { top: 0.6 });
  for (const px of [rx, rx + 58]) roomPart(ctx, roomRound(px, F - 84, 4, 84, 1), '#2e4864', { top: 0, side: 1 });
  roomPart(ctx, roomRound(rx + 4, F - 84, 54, 6, 1), '#2a3a4c', { top: 0.6, under: 0.8 });
  for (let k = 0; k < Math.min(n, GUN_CRADLES); k++) roomFlat(ctx, rx + 9 + k * 2.4 + (k >= 5 ? 1.6 : 0), F - 82.6, 0.7, 3.4, '#a09c8e');  // the count, chalked
}
function roomGunnery(ctx, r, s, X, W) {
  const { w, time } = s, F = r.floor, T = r.top, n = v => Math.round(v * 100) / 100, hot = w.burn > 0.5, [s0, s1] = SEATS.gunnery.map(f => n(X(f)));
  if (W >= 300) {  // on the wall: the recoil plate, the range tables over the second console, the conduit
    roomOnWall(ctx, 92, F - 78, () => {
      roomPart(ctx, roomRound(81, F - 87, 22, 18, 1.2), '#7a7058', { top: 1, side: 1.2, under: 1 });
      for (let k = 0; k < 5; k++) roomFlat(ctx, 82.5 + k * 4, F - 85.5, 2, 2.6, k % 2 ? '#2a2620' : '#8a7a40');  // its hazard band
      roomFlat(ctx, 84, F - 78.5, 11, 1.8, '#2a2620'); roomFlat(ctx, 93, F - 80, 5, 4.8, '#2a2620');  // the pictogram: a gun, and the arrow of its kick
      roomFlat(ctx, 86, F - 73.4, 11, 0.9, '#2a2620'); roomFlat(ctx, 96, F - 74.6, 1.2, 3.3, '#2a2620'); roomFlat(ctx, 85, F - 74.3, 1, 2.7, '#2a2620');
      for (const [x, y] of [[82.6, F - 70.6], [101.4, F - 70.6]]) roomDot(ctx, x, y, 0.6, '#56708c');
    });
    roomOnWall(ctx, 136, F - 76, () => {  // the range tables: two printed sheets, rows of figures as lines, taped at their corners
      for (const [x, y, sw, sh] of [[120, F - 84, 15, 17], [137, F - 83, 15, 16]]) {
        roomPart(ctx, roomRound(x, y, sw, sh, 0.5), '#8a8676', { top: 0 });
        for (let l = 0; l < 5; l++) roomFlat(ctx, x + 2, y + 3 + l * 2.6, sw - 4 - (l % 3) * 2, 0.6, '#5a5448');
        roomPart(ctx, `M ${x - 1} ${y - 0.5} L ${x + 2.5} ${y - 0.5} L ${x + 2.5} ${y + 1.5} L ${x - 1} ${y + 1.5} Z`, '#7a7462', { top: 0 });
        roomPart(ctx, `M ${x + sw - 2.5} ${y - 0.5} L ${x + sw + 1} ${y - 0.5} L ${x + sw + 1} ${y + 1.5} L ${x + sw - 2.5} ${y + 1.5} Z`, '#7a7462', { top: 0 });
      }
    });
    roomOnWall(ctx, 230, F - 75, () => {  // the conduit: up from the second console, along under the cable run and up into the ceiling
      ctx.strokeStyle = roomTint('#3a3a40'); ctx.lineWidth = 0.9; roomSeg(ctx, [[189.6, F - 79], [189.6, F - 50]]);  // a cable tied along it
      roomPart(ctx, roomRound(185.5, F - 81, 3, 35, 1), '#2e4458', { top: 0, side: 0.8 });
      roomPart(ctx, roomRound(185.5, F - 84, 106, 3, 1), '#2e4458', { top: 0.6 });
      roomPart(ctx, roomRound(288.5, F - 99, 3, 16, 1), '#2e4458', { top: 0, side: 0.8 });
      for (const x of [205, 240, 275]) roomFlat(ctx, x, F - 84.6, 1.4, 4.2, '#3a4a5a');  // its clamps
      roomPart(ctx, roomRound(252, F - 84.8, 4.5, 4.6, 0.6), '#7a7462', { top: 0 });  // a wrap of tape
      for (const y of [F - 72, F - 58]) roomFlat(ctx, 184.8, y, 5.6, 1, '#1e2a36');  // the cable ties
    });
  }
  // On the floor, from the left wall in: the gun station, then the second console.
  const at0 = gunConsole(ctx, s0, F);
  roomScreen(ctx, s0 - 64, F - 57, 26, 12, 'scope', time, hot);
  roomPart(ctx, roomRound(n(s0 - 40), F - 41.5, 5, 3.5, 1), '#263a50', { top: 0.5 });  // the ready lamp, out at the flip
  roomDot(ctx, s0 - 37.5, F - 39.8, 1.1, w.flip > 0.5 ? '#24384c' : '#5fae6a');
  [[s0 - 31, '#3a4450'], [s0 - 23, '#4a4640']].forEach(([c, col]) => {  // the grips, the second a replacement in another finish, a trigger on each
    roomFlat(ctx, c - 0.6, F - 42, 1.2, n(at0(c) - (F - 42)), '#5a6672');
    roomPart(ctx, roomRound(n(c - 2), F - 50, 4, 8, 1.4), col, { top: 0.6, side: 1 });
    roomFlat(ctx, c - 3.3, F - 47, 1.3, 2.5, '#8e3a32');
  });
  for (const [x, cw] of [[s0 - 34, 2.4], [s0 - 26.5, 1.6], [s0 - 21, 2]]) roomFlat(ctx, x, F - 34.2, cw, 0.9, '#7e8a94');  // paint worn off where the hands rest
  gunConsole(ctx, s1, F);
  roomScreen(ctx, s1 - 44, F - 57, 26, 12, w.flip > 0.5 ? 'status' : 'bars', time, hot);
  if (w.flip > 0.5) {  // the heading arrow at the flip, turning
    ctx.save(); ctx.translate(s1 - 31, F - 51); ctx.rotate(s.spin * 0.5); ctx.beginPath(); ctx.moveTo(0, -5); ctx.lineTo(3, 4); ctx.lineTo(-3, 4); ctx.closePath();
    ctx.fillStyle = '#c8903a'; ctx.fill(); ctx.restore();
  }
  roomPart(ctx, roomRound(n(s1 - 64), F - 46, 6, 4.5, 0.8), '#8a6a48', { top: 0.6, side: 0.8 });  // the range finder's printed mount, its layers and its tag
  for (const ly of [F - 44.8, F - 43.4]) roomFlat(ctx, s1 - 63.5, ly, 5, 0.4, '#6a5038');
  ctx.strokeStyle = '#7a7462'; ctx.lineWidth = 0.5; roomSeg(ctx, [[s1 - 58.5, F - 44.5], [s1 - 57, F - 43.8]]);
  roomPart(ctx, roomRound(n(s1 - 58), F - 44, 4, 4.5, 0.6), '#9a9050', { top: 0.5 }); roomDot(ctx, s1 - 56, F - 43, 0.5, '#4a4436');
  roomPart(ctx, roomRound(n(s1 - 69), F - 52, 20, 6, 2), '#505650', { top: 0.8, under: 1 });  // the range finder, its eyepiece toward the seat and its glass
  roomFlat(ctx, s1 - 49.5, F - 50.5, 2, 3, '#2a2e2a');
  roomDot(ctx, s1 - 69, F - 49, 2.6, '#2e5468'); ctx.lineWidth = 0.9; ctx.strokeStyle = FIG_LINE; ctx.stroke(); roomDot(ctx, s1 - 69.6, F - 49.8, 0.7, '#7aa0b4');
  if (W < 300) return;
  // From the right wall in: the weapons locker, the ammunition locker, the rack.
  const wx = n(X(0.905)), ax = n(X(0.8)), tx = n(ax + 15);
  roomPart(ctx, roomRound(n(wx - 1), F - 3, 28, 3, 0.8), '#24384c', { top: 0.5 });  // the old plinth, the fresh bolts holding the newer locker to it
  for (const bx of [wx + 1.5, wx + 23.5]) roomFlat(ctx, bx, F - 2, 1, 1, '#8a929a');
  roomPart(ctx, roomRound(wx, F - 88, 26, 85, 1.2), '#4a5058', { top: 1, side: 2, solid: 0.45 });
  roomPart(ctx, roomRound(n(wx + 2.5), F - 85, 21, 79, 1), '#525a64', { top: 0.8, side: 1.2 });
  for (let k = 0; k < 3; k++) { roomFlat(ctx, wx + 6, F - 81 + k * 2.2, 14, 0.9, '#2a3038'); roomFlat(ctx, wx + 6, F - 14 + k * 2.2, 14, 0.9, '#2a3038'); }  // its vents
  roomFlat(ctx, wx + 8, F - 73, 10, 4, '#6a6a5a'); for (const px of [wx + 10, wx + 13.5]) roomFlat(ctx, px, F - 72, 2, 2, '#3a3a30');  // its number plate
  roomFlat(ctx, wx + 19, F - 52, 1.6, 8, '#8a96a2'); roomFlat(ctx, wx + 18.3, F - 42, 3, 3, '#6a5a3a');  // the handle and the latch's padlock
  roomPart(ctx, roomRound(ax, F - 44, 30, 44, 1.2), '#3a4a3e', { top: 0, side: 1.5, solid: 0.45 });
  roomFlat(ctx, ax + 1.5, F - 38, 27, 0.8, '#222c26'); roomFlat(ctx, ax + 11, F - 44, 8, 1.2, '#141c18');  // the lid's seam, the slot the belt feeds up through
  roomFlat(ctx, ax + 13, F - 40.5, 4, 3.5, '#8796a5'); roomDot(ctx, ax + 15, F - 39, 0.6, '#3a4a5a');  // the latch
  for (const hy of [F - 30]) for (const hx of [ax + 1.5, ax + 27]) roomFlat(ctx, hx, hy, 1.5, 6, '#2a3446');  // its handles
  for (let k = 0; k < 4; k++) roomFlat(ctx, ax + 6 + k * 4.5, F - 24, 3, 2.5, '#5a6a4e');  // its stencil
  for (const [x, y, sw] of [[ax + 5, F - 7, 6], [ax + 18, F - 5, 4]]) roomFlat(ctx, x, y, sw, 0.8, '#4e5a50');  // scuffs, low
  gunRack(ctx, r, s.torpedoes || 0);
  // At the front: the turret's mount in the ceiling, its lock pin and tag, the feed chute, the belt in the tray and down into the locker.
  roomPart(ctx, roomRound(n(tx - 14), T, 28, 5, 1.5), '#2c4058', { top: 0, under: 1.2 }); for (const bx of [tx - 11, tx + 11]) roomDot(ctx, bx, T + 2.5, 0.6, '#56708c');
  roomFlat(ctx, tx + 12, T + 2, 5, 1.2, '#9aa4ae');
  ctx.strokeStyle = '#8796a5'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.arc(tx + 17.8, T + 2.6, 1.1, 0, Math.PI * 2); ctx.stroke(); roomSeg(ctx, [[tx + 17.8, T + 3.7], [tx + 17.6, T + 9]]);
  roomPart(ctx, roomRound(n(tx + 15.6), T + 9, 4, 5, 0.6), '#8a4436', { top: 0 });
  roomPart(ctx, roomRound(n(tx - 5), T + 5, 10, F - 66 - T - 5, 1), '#33475c', { top: 0, side: 1.5 });
  ctx.strokeStyle = '#4a4436'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(tx - 8, F - 61); ctx.quadraticCurveTo(tx - 11, F - 52, tx - 4, F - 44); ctx.stroke();  // the belt's links
  for (let k = 0; k < 4; k++) { const t = (k + 0.5) / 4, x = (1 - t) * (1 - t) * (tx - 8) + 2 * (1 - t) * t * (tx - 11) + t * t * (tx - 4), y = F - 61 + 17 * t; roomPart(ctx, roomRound(n(x - 1.3), n(y - 0.8), 2.6, 1.6, 0.6), '#8a7a50', { top: 0.4 }); }
  for (let k = 0; k < 8; k++) roomPart(ctx, roomRound(n(tx - 10 + k * 2.6), F - 69, 1.8, 5, 0.8), '#8a7a50', { top: 0.6 });
  roomPart(ctx, `M ${n(tx - 12)} ${F - 66} L ${n(tx + 12)} ${F - 66} L ${n(tx + 10)} ${F - 60} L ${n(tx - 10)} ${F - 60} Z`, '#3e5068', { top: 0.8, side: 1 });
}

// The comms station (#919, #933): the rack of radios on the console at the bridge's aft post, where the slicer sits (POST_SEAT, shiplife.js), its
// cables down to the console tied and taped (point 6); the
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
  // its cables (point 6): a loom from under the rack down its side to the console, held by cable ties, a wrap of tape where it is mended
  ctx.strokeStyle = '#3a3a40'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(b.x + b.w - 3, b.y + 23); ctx.quadraticCurveTo(b.x + b.w + 1.5, b.y + 28, b.x + b.w + 1, b.y + b.h - 1); ctx.stroke();
  for (const ty of [b.y + 27, b.y + 34]) roomFlat(ctx, b.x + b.w - 1, ty, 3.4, 1, '#1e2a36');
  roomPart(ctx, roomRound(b.x + b.w - 0.8, b.y + 29.5, 3.4, 2.6, 0.5), '#7a7462', { top: 0 });
  ctx.font = `600 12px ${roomFont}`;  // the label at 12px on a dark plate over the rack, under the ceiling, as the rooms' names are; it may be wider than the rack
  const lw = ctx.measureText('COMMS').width / s.zoom, fs = 12 / s.zoom, pad = 3 / s.zoom, cx = b.x + b.w / 2, ly = Math.max(r.top + 1, b.y - fs * 1.25 - 1);
  ctx.fillStyle = 'rgba(6,13,22,0.85)'; ctx.fillRect(cx - lw / 2 - pad, ly, lw + pad * 2, fs * 1.25);
  worldText(ctx, s.zoom, 'COMMS', cx, ly + fs, fs, '#9fb4c9', 'center');
}

// The grab bars beside the ladder's opening on the bridge's deck (#933), for coming up it in zero g: on the shaft's bulkheads (#1024), each on the
// room's side of its hatch (cutBulkhead, shiplife.js: the bulkhead 12 wide on its line, the hatch 8 wide in it), on two brackets. x0 to x1: the
// shaft's band; F: the deck's floor. Drawn after the shaft, over it.
function roomHatchBars(ctx, x0, x1, F) {
  for (const gx of [x0 - 6, x1 + 3]) {
    roomFlat(ctx, gx - 0.5, F - 62, 4, 1.5, '#2a3e54'); roomFlat(ctx, gx - 0.5, F - 16.5, 4, 1.5, '#2a3e54');
    roomPart(ctx, roomRound(gx, F - 64, 3, 50, 1.5), '#3a5470', { top: 0.6, side: 1 });
  }
}
// The bridge's forward window (#933): the glass, a clear rectangle high on the back wall of the forward bay (the last of roomBays, well: the
// ladder well) over the consoles' screens, where the destination can be shown (#936); the frame and its struts are drawn round it and over it.
// In the box (#1024) it is as wide as that wall leaves room for in its frame (up to 0.42 of the room), at its right end, and named where it is
// drawn: on the wall, not at the cut.
const bridgeGlass = (r, well) => {
  const bay = roomBays(r, well).pop(), e = roomEye(bay), x1 = roomInto(e, bay.x1, r.floor)[0] - 7, w = Math.min(x1 - roomInto(e, bay.x0, r.floor)[0] - 7, (r.x1 - r.x0) * 0.42);
  return { x: x1 - w, y: r.floor - 91, w, h: 28 };
};
// A pilot's seat at a post of the bridge (#933), facing forward (SEAT_FACE): its pan at the seated hip (23) on a pedestal bolted to the deck, the
// back behind it with a headrest at the seated head, and the harness, slack on the back when no one is strapped in. Old and patched (point 6):
// the foot plate scuffed by boots, the paint worn off the headrest's edge where hands pull on it in zero g.
function roomBridgeSeat(ctx, x, F) {  // its pad and its foot plate solid in the box (#1024), the plate's shadow on the strip
  roomPart(ctx, roomRound(x - 9, F - 2.5, 18, 2.5, 1), '#1c3249', { top: 0.6, solid: 0.25 });
  roomDot(ctx, x - 6.5, F - 1.2, 0.6, '#56708c'); roomDot(ctx, x + 6.5, F - 1.2, 0.6, '#56708c');  // its bolts
  for (const sx of [x - 4.5, x + 2]) roomFlat(ctx, sx, F - 2.2, 2.6, 0.7, '#5a6670');  // scuffs, where boots go
  roomPart(ctx, `M ${x - 2} ${F - 19} L ${x + 2} ${F - 19} L ${x + 2.5} ${F - 2.5} L ${x - 2.5} ${F - 2.5} Z`, '#1c3249', { top: 0, side: 1.2 });
  roomPart(ctx, roomRound(x - 11, F - 52, 2.5, 4, 0.8), '#1c3249', { top: 0 });  // the headrest's stem
  roomPart(ctx, `M ${x - 13} ${F - 20} L ${x - 8} ${F - 20} L ${x - 6.5} ${F - 49} L ${x - 11.5} ${F - 49} Z`, '#284664', { top: 1, side: -1.5 });
  roomPart(ctx, roomRound(x - 14, F - 59, 8, 8, 2.5), '#284664', { top: 1, side: -1.5 });
  roomFlat(ctx, x - 13.4, F - 57, 0.9, 3.5, '#6a747c');  // worn where hands pull on it
  roomPart(ctx, roomRound(x - 11, F - 23, 22, 5, 2), '#2e4a68', { top: 1, under: 1, solid: 0.25 });
  ctx.strokeStyle = '#5a4e3a'; ctx.lineWidth = 1.3;  // the harness: a shoulder strap down the back to its buckle, and the lap belt
  ctx.beginPath(); ctx.moveTo(x - 7.5, F - 47); ctx.quadraticCurveTo(x - 10.5, F - 36, x - 9, F - 24); ctx.moveTo(x - 9, F - 22); ctx.lineTo(x - 3, F - 21); ctx.stroke();
  roomFlat(ctx, x - 10.5, F - 35, 2.5, 2, '#7a8794');
}
// The bridge (#933): a console at waist height in front of each post (the seats are drawn by drawRoom), a screen on each, keys on its sloped top
// and a grab handle on its front; the comms station's rack on the aft post's console (the first); the throttle at the pilot's (the second),
// forward in the burn, and the bobblehead on the pilot's screen; the overhead panel along the ceiling with its switches and lights (the thrust
// light lit in the burn), a grab rail under it; the forward window with struts in its frame; and the master's certificate framed between the
// first two posts. The grab bars beside the ladder's opening are on the shaft's bulkheads (roomHatchBars). The top left is kept clear for the
// room's name (shiplife.js), down to the smallest window (#937). In the box (#1024): the window and the certificate on the back wall first; the
// overhead panel at the cut, under the ceiling; then the consoles standing on the floor, solid (and the seats, drawRoom). Old and patched (point 6):
// each console's edge worn where the hands rest, its grab handle worn and its knee recess scuffed; the third console's access panel a replacement
// in another shade on fresh screws; the last post's screen a newer one on the old stand, on an adapter plate with fresh bolts; a printed guard over
// a switch on the pilot's console, tagged temporary; the comms rack's cables tied and taped (roomCommsRack); the seats worn (roomBridgeSeat).
function roomBridge(ctx, r, s, X, W) {
  const { w, time, spin } = s, F = r.floor, g = bridgeGlass(r, s.well), n = v => Math.round(v * 100) / 100;
  // bridgeGlass names the window where it is on the back wall, so its frame is drawn there as it is: anchored at the eye, which the move onto
  // the wall leaves where it is, for the wall tone. The glass is the view out, in its own colours.
  const eye = roomEye(roomBays(r, s.well).pop()), onWall = fn => roomOnWall(ctx, eye.vx, eye.vy, fn);
  onWall(() => roomPart(ctx, roomRound(g.x - 4, g.y - 4, g.w + 8, g.h + 7, 2.5), '#2a4560', { top: 1, under: 1.5 }));  // the window's frame
  ctx.save(); ctx.beginPath(); ctx.rect(g.x, g.y, g.w, g.h); ctx.clip(); roomFlat(ctx, g.x, g.y, g.w, g.h, '#01040a');
  const cs = Math.cos(spin), sn = Math.sin(spin), mx = g.x + g.w / 2, my = g.y + g.h / 2;
  for (const [a, b, sz] of roomStars) { const sx = (a - 0.5) * g.w * 1.4, sy = (b - 0.5) * g.h * 1.6; roomDot(ctx, mx + sx * cs - sy * sn, my + sx * sn + sy * cs, sz, '#cfe3ff'); }
  const px = g.x + g.w - 14 + Math.sin(spin) * 40, pg = ctx.createRadialGradient(px, my + 6, 2, px, my + 6, 24); pg.addColorStop(0, '#c98a5a'); pg.addColorStop(1, 'rgba(120,70,40,0)'); ctx.fillStyle = pg; ctx.fillRect(g.x, g.y, g.w, g.h);
  roomFlat(ctx, g.x, g.y, g.w * 0.3, g.h, 'rgba(160,200,255,0.05)'); ctx.restore();
  onWall(() => {
    ctx.strokeStyle = roomTint('#132538'); ctx.lineWidth = 1; ctx.strokeRect(g.x - 0.5, g.y - 0.5, g.w + 1, g.h + 1);  // the gasket
    for (let k = 1; k < 4; k++) {  // the struts
      const sx = n(g.x + g.w * k / 4);
      roomPart(ctx, roomRound(sx - 2, g.y - 1, 4, g.h + 2, 0.8), '#2a4560', { top: 0, side: 1.2 }); roomDot(ctx, sx, g.y + 2, 0.7, '#56708c'); roomDot(ctx, sx, g.y + g.h - 2, 0.7, '#56708c');
    }
  });
  const lx = n(X(0.222));  // the master's certificate, on the wall: a seal and lines, no word (it would be wider than the frame at 12px)
  roomOnWall(ctx, lx + 17, F - 61, () => {
    roomPart(ctx, roomRound(lx, F - 74, 34, 26, 1.5), '#3a2c20', { top: 1, side: 1.5 }); roomPart(ctx, roomRound(lx + 3, F - 71, 28, 20, 0.5), '#a39b84', { top: 0 });
    for (const dy of [5, 9, 13]) roomFlat(ctx, lx + 7, F - 71 + dy, dy === 5 ? 20 : 14, 1.2, '#6e6656');
    roomDot(ctx, lx + 25, F - 56, 2.6, '#8e3a32'); for (const sx of [lx + 2, lx + 32]) roomDot(ctx, sx, F - 72, 0.6, '#56708c');
  });
  // the overhead panel: a row of toggle switches, its lights at the end (the drive's, the thrust light in the burn, the flip's), a grab rail under it
  const o0 = n(X(0.23)), o1 = n(X(0.45)), T = r.top;
  roomPart(ctx, roomRound(o0, T + 3, o1 - o0, 10, 2), '#1d3550', { top: 0, under: 1.5 });
  for (let x = o0 + 8; x < o1 - 40; x += 9) { roomFlat(ctx, x, T + 7, 1.2, 3.5, '#8796a5'); roomDot(ctx, x + 0.6, T + 7, 0.8, '#56708c'); }
  [w.burn + w.cruise > 0.5 ? '#4f9a5f' : '#2f3f50', w.burn > 0.5 ? '#c8604a' : '#2f3f50', w.flip > 0.5 ? '#c8903a' : '#2f3f50', Math.floor(time * 1.5) % 2 ? '#4f8ab0' : '#2f3f50']
    .forEach((col, k) => roomDot(ctx, o1 - 32 + k * 7, T + 8, 1.6, col));
  for (const x of [o0 + 3, o1 - 3]) roomDot(ctx, x, T + 8, 0.7, '#56708c');
  for (let k = 0; k < 4; k++) roomFlat(ctx, o0 + 14 + k * (o1 - o0 - 30) / 3, T + 13, 1.5, 4, '#2a3e54');
  roomPart(ctx, roomRound(o0 + 10, T + 16.5, o1 - o0 - 20, 2, 1), '#3a5470', { top: 0.6 });
  SEATS.bridge.forEach((f, i) => {  // the consoles, each in front of its post, solid: the body and its sloped top (#1024)
    const x = n(X(f)), x1 = x + 70, slope = u => F - 36 - 6 * (u - x - 17) / 53;
    roomPart(ctx, `M ${x + 24} ${F - 33} L ${x1 - 2} ${F - 33} L ${x1 - 2} ${F - 1} L ${x + 30} ${F - 1} L ${x + 30} ${F - 9} L ${x + 24} ${F - 12} Z`, '#1f3a56', { top: 0, side: 3, solid: 0.45 });
    roomPart(ctx, roomRound(x + 35, F - 29, 24, 19, 1.2), i === 2 ? '#34495a' : '#22405c', { top: 0.8, side: 1.2 });  // its access panel, screwed shut (the third a replacement), and a vent
    for (const [sx, sy] of [[x + 37, F - 27], [x + 57, F - 27], [x + 37, F - 12], [x + 57, F - 12]]) roomDot(ctx, sx, sy, 0.6, i === 2 ? '#8a929a' : '#56708c');
    roomFlat(ctx, x + 31, F - 4.5, 4, 0.8, '#5a6670');  // a scuff at the knee recess, where boots go
    for (let k = 0; k < 4; k++) roomFlat(ctx, x + 40 + k * 4, F - 6, 2.5, 1, '#0f1d2c');
    for (let k = 0; k < 3; k++) { roomFlat(ctx, x + 27, F - 29 + k * 5, 3, 1.2, '#2a3e54'); roomFlat(ctx, x + 28, F - 30.5 + k * 5, 1, 2, '#8796a5'); }  // the switches
    if (i === 1) {  // the pilot's: a printed guard over the middle switch, its layers, its tag hung on a thread
      roomPart(ctx, roomRound(x + 26.2, F - 26.4, 4.6, 4.2, 0.8), '#8a6a48', { top: 0.5, side: 0.6 }); for (const ly of [F - 25, F - 23.6]) roomFlat(ctx, x + 26.8, ly, 3.4, 0.4, '#6a5038');
      ctx.strokeStyle = '#7a7462'; ctx.lineWidth = 0.5; roomSeg(ctx, [[x + 30.6, F - 23.4], [x + 32.6, F - 20]]);  // to the right of the switches, clear of the third
      roomPart(ctx, roomRound(x + 31.2, F - 20, 3.6, 4.5, 0.6), '#9a9050', { top: 0.5 }); roomDot(ctx, x + 33, F - 19, 0.5, '#4a4436');
    }
    roomPart(ctx, roomRound(x + 21, F - 30, 2, 13, 1), '#3a5470', { top: 0.5 });  // a grab handle, worn where hands go
    roomFlat(ctx, x + 21.5, F - 25, 1, 3, '#6a747c');
    roomPart(ctx, `M ${x + 17} ${F - 33} L ${x + 17} ${F - 36} L ${x1} ${F - 42} L ${x1} ${F - 33} Z`, '#2c4c6e', { top: 0, under: 1, solid: 0.5, slope: [F - 36, F - 42] });
    ctx.strokeStyle = figShade('#2c4c6e', 1.5); ctx.lineWidth = 1; roomSeg(ctx, [[x + 17.5, F - 35.5], [x1 - 0.5, F - 41.5]]);  // its lit edge
    for (let k = 0; k < 5; k++) { const kx = x + 34 + k * 6; roomFlat(ctx, kx, slope(kx) + 1.6, 3, 1.2, (Math.floor(time * 2 + k * 2.3 + i) % 4) ? '#2f5577' : '#c8903a'); }  // the keys
    for (const kx of [x + 20, x + 26]) roomFlat(ctx, kx, n(slope(kx) + 0.4), 3, 0.9, '#7e8a94');  // paint worn off its edge where the hands rest
    if (i === 3) {  // a newer screen on the old stand: its stem, the adapter plate in another finish under the screen, fresh bolts in it
      roomPart(ctx, roomRound(x + 47.5, F - 40.6, 3, n(slope(x + 49) - F + 41.1), 0.6), '#2a3c50', { top: 0, side: 0.8 });
      roomPart(ctx, roomRound(x + 40, F - 42.4, 18, 2, 0.6), '#4a5058', { top: 0.5 }); for (const bx of [x + 41.5, x + 55.5]) roomFlat(ctx, bx, F - 41.9, 1, 1, '#8a929a');
    }
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

// The hold (#933), on the drive deck beside the engine room. A crate is 40 by 24, a load two people lift or the jack moves, and the crates stand
// in stacks of three on pallets, filled from the bottom of the first stack, which starts clear of the room's name at its top left. holdCrate: crate
// k's box; holdLabel: the box on its front where its label goes (one day the contract's good, #936), kept clear of everything else, showing for now
// the crate's serial (holdSerial). The jack stands past the fourth stack. The kit is of different ages: wooden crates of more than one batch and
// a newer moulded one.
const HOLD_W = 40, HOLD_H = 24, HOLD_GAP = 6, HOLD_FROM = 92;  // the four stacks and the jack past them fit the hull's 720 (#1023)
const HOLD_KIT = ['#5a4a34', '#54462f', '#4a5a5e', '#5e4e36', '#4e4230'];  // the third the moulded one
const holdKind = k => (k * 7 + Math.floor(k / 3)) % HOLD_KIT.length;
const holdCrate = (r, k) => ({ x: r.x0 + HOLD_FROM + Math.floor(k / 3) * (HOLD_W + HOLD_GAP), y: r.floor - 4 - HOLD_H * (k % 3 + 1), w: HOLD_W, h: HOLD_H });
const holdLabel = (r, k) => { const c = holdCrate(r, k); return { x: c.x + 4, y: c.y + 7, w: 32, h: 10 }; };
// Crate k's serial, stencilled in its label box b as marks, not text (no words under 12px): a row of six glyphs (a block, a split block, a bar or
// a pair of dashes, varied per crate and fixed), a dash after the second, in paint a little paler than the crate; on every third crate a small
// handling plate beside it, a this-way-up arrow on it.
function holdSerial(ctx, k, b, moulded) {
  const ink = moulded ? '#6a7a7a' : '#7a6c50', y = b.y + 3.5;
  let x = b.x + 2;
  for (let i = 0; i < 6; i++) {
    const g = (k * 37 + 11 + i * (k + 3) * 7) % 4;
    if (g === 0) roomFlat(ctx, x, y, 1.6, 3, ink);
    else if (g === 1) { roomFlat(ctx, x, y, 1.6, 1.2, ink); roomFlat(ctx, x, y + 1.8, 1.6, 1.2, ink); }
    else if (g === 2) roomFlat(ctx, x + 0.45, y, 0.7, 3, ink);
    else { roomFlat(ctx, x, y, 1.6, 0.7, ink); roomFlat(ctx, x, y + 2.3, 1.6, 0.7, ink); }
    x += 2.4;
    if (i === 1) { roomFlat(ctx, x, y + 1.2, 1.4, 0.6, ink); x += 2.2; }
  }
  if (k % 3 === 1) {
    roomFlat(ctx, b.x + 22, b.y + 2, 6, 5, '#5e5a48');
    roomFlat(ctx, b.x + 24.6, b.y + 3.6, 0.8, 2.6, '#3a3226'); roomFlat(ctx, b.x + 24, b.y + 3.2, 2, 0.6, '#3a3226');
  }
}
// A tie-down ring in the deck at x, on its plate.
function holdRing(ctx, x, F) {
  roomFlat(ctx, x - 2.5, F - 1, 5, 1, '#20384f');
  ctx.strokeStyle = '#4a6680'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.arc(x, F - 2.4, 1.3, 0, Math.PI * 2); ctx.stroke();
}
// Crate k: its boards and the gaps between them, the battens at its corners nailed on, its serial (holdSerial); worn at fixed places
// (bare wood at its corners), a board replaced in fresher wood on one, tape over a split corner on another. In the box (#1024) it is solid, a
// crate deep (HOLD_DEPTH), resting on its pallet or the crate under it: its front at the cut, where holdCrate and holdLabel name it.
const HOLD_DEPTH = 0.5;
function roomHoldCrate(ctx, r, k) {
  const n = v => Math.round(v * 100) / 100, c = holdCrate(r, k), x = n(c.x), y = n(c.y), w = c.w, h = c.h, kind = holdKind(k), b = holdLabel(r, k);
  roomPart(ctx, roomRound(x, y, w, h, 1.2), HOLD_KIT[kind], { top: 1, side: 2.5, under: 1, solid: HOLD_DEPTH, shadow: false });
  if (k % 4 === 1 && kind !== 2) roomFlat(ctx, x + 4.5, y + 1, w - 9, 4.6, '#6e5c40');  // a board replaced in fresher wood
  for (const gy of [y + 6, y + 17.6]) roomFlat(ctx, x + 4, gy, w - 8, 0.8, '#2a2218');  // the gaps between its boards
  for (const bx of [x + 0.8, x + w - 4]) roomPart(ctx, roomRound(bx, y + 0.8, 3.2, h - 1.6, 0.6), kind === 2 ? '#56686c' : '#6a583c', { top: 0.5, side: 0.8 });
  for (const [nx, ny] of [[x + 2.4, y + 3], [x + 2.4, y + h - 3], [x + w - 2.4, y + 3], [x + w - 2.4, y + h - 3]]) roomDot(ctx, nx, ny, 0.5, '#2a2218');  // the nails
  if (k % 2 === 0 && kind !== 2) for (const [cx, cy, cw, ch] of [[x + w - 3.6, y + h - 2.8, 2.2, 1.4], [x + 1.2, y + 1.2, 1.8, 1.2]]) roomFlat(ctx, cx, cy, cw, ch, '#7a6a50');  // worn corners
  holdSerial(ctx, k, b, kind === 2);
  if (k % 6 === 4) roomPart(ctx, `M ${n(x + w - 8)} ${n(y - 0.5)} L ${n(x + w - 3)} ${n(y - 0.5)} L ${n(x + w + 0.5)} ${n(y + 2.5)} L ${n(x + w + 0.5)} ${n(y + 6)} Z`, '#7a7462', { top: 0 });  // tape
}
// A stack's pallet at x, its fork pockets, and once loaded the straps over the stack's top (at y) and down its sides to the rings at its foot, a
// ratchet on one.
function roomHoldPallet(ctx, x, F) {  // solid, as deep as its crates, its shadow on the strip (#1024)
  roomPart(ctx, roomRound(x + 2, F - 4, HOLD_W - 4, 4, 0.6), '#3e3426', { top: 0.6, solid: HOLD_DEPTH });
  for (const px of [x + 8, x + HOLD_W - 14]) roomFlat(ctx, px, F - 3, 6, 2.2, '#1a1610');
}
function roomHoldStraps(ctx, x, y, F) {
  const n = v => Math.round(v * 100) / 100;
  for (const sx of [x - 0.5, x + HOLD_W - 2]) roomPart(ctx, roomRound(n(sx), n(y - 1), 2.5, n(F - 3.5 - y + 1), 0.8), '#4a4436', { top: 0 });
  roomPart(ctx, roomRound(n(x - 0.5), n(y - 1.5), HOLD_W + 1, 2, 0.8), '#4a4436', { top: 0.5 });
  roomFlat(ctx, x + HOLD_W - 3, F - 18, 4.5, 5, '#6a7480'); roomFlat(ctx, x + HOLD_W - 2.5, F - 17, 3.5, 1, '#3a4a5a');  // its ratchet
}
// The cargo net over the stacks' tops (n crates), clear of their labels, its ends tied down to rings in the deck; it lifts off the stacks at the
// flip, most in the middle of the run. Mended once over the first stack, in another cord. Cords, not parts, so drawn from s.time as it moves.
function roomHoldNet(ctx, r, n, s) {
  const F = r.floor, stacks = Math.ceil(n / 3), bulge = s.w.flip * (s.still ? 3 : 3 + Math.sin(s.time) * 2), top = [];
  for (let c = 0; c < stacks; c++) {
    const { x } = holdCrate(r, 3 * c), y = holdCrate(r, Math.min(n - 1, 3 * c + 2)).y, lift = bulge * (1 + Math.sin(Math.PI * (c + 0.5) / stacks));
    top.push([x - 1, y - 2 - lift], [x + HOLD_W + 1, y - 2 - lift]);
  }
  const a = top[0], b = top[top.length - 1], e0 = a[0] - 3, e1 = b[0] + 3, low = top.map(([x, y]) => [x, y + 5]);
  const at = (line, x) => { for (let i = 1; i < line.length; i++) if (x <= line[i][0]) { const [p, q] = [line[i - 1], line[i]], t = (x - p[0]) / (q[0] - p[0] || 1); return p[1] + (q[1] - p[1]) * t; } return line[line.length - 1][1]; };
  holdRing(ctx, e0, F); holdRing(ctx, e1, F);
  ctx.strokeStyle = '#8a7e62'; ctx.lineWidth = 0.8;
  roomSeg(ctx, [[e0, F - 2.4], ...top, [e1, F - 2.4]]); roomSeg(ctx, [[e0 + 2, F - 2.4], ...low, [e1 - 2, F - 2.4]]);
  for (const ph of [0, 1]) {  // the mesh, two zigzags crossing between the cords
    const pts = [];
    for (let x = a[0], i = ph; x <= b[0]; x += 5, i++) pts.push([x, at(i % 2 ? low : top, x)]);
    roomSeg(ctx, pts);
  }
  for (const [ex, sx] of [[e0, a], [e1, b]]) for (const t of [0.3, 0.6]) roomSeg(ctx, [[sx[0] + (ex - sx[0]) * t, sx[1] + (F - 2.4 - sx[1]) * t], [sx[0] + (ex + (ex < sx[0] ? 2 : -2) - sx[0]) * t, sx[1] + 5 + (F - 2.4 - sx[1] - 5) * t]]);
  const m0 = holdCrate(r, 0).x + 12, m1 = m0 + 12;  // the mend
  ctx.strokeStyle = '#5e6a50'; ctx.lineWidth = 1.2; roomSeg(ctx, [[m0, at(top, m0)], [m1, at(top, m1)]]);
  for (const kx of [m0, m1]) roomDot(ctx, kx, at(top, kx), 1, '#5e6a50');
}
// The pallet jack parked with its forks at jx, toned down from a bright yellow: the forks a pallet long, the load roller, the pump over the steer
// wheel, and the handle (a replacement in bare steel) up to its grip at the waist, the grip printed on the ship's fabricator and tagged as
// temporary (docs/bible/technology.md). Scuffs on the wall behind it, where it is parked. In the box (#1024) the scuffs are on the back wall, low,
// and the forks (two tines, the far one a pallet back, their shadow on the strip under both) and the pump are solid.
function roomHoldJack(ctx, jx, F) {
  const n = v => Math.round(v * 100) / 100, x = n(jx);
  roomOnWall(ctx, x + 26, F - 9, () => { for (const [sx, sy, sw] of [[x + 10, F - 8, 6], [x + 30, F - 11, 4], [x + 42, F - 7, 5]]) roomFlat(ctx, sx, sy, sw, 0.8, '#3e4c5a'); });
  roomPart(ctx, `M ${n(x + 53)} ${F - 13} L ${n(x + 56)} ${F - 14} L ${n(x + 64)} ${F - 43} L ${n(x + 61.6)} ${F - 43.6} Z`, '#5e646a', { top: 0, side: 1 });
  roomPart(ctx, roomRound(x + 57, F - 47, 11, 4.2, 1.8), '#8a6a48', { top: 0.6, side: 0.8 });  // the printed grip, its layers
  for (const ly of [F - 45.6, F - 44.4]) roomFlat(ctx, x + 58, ly, 9, 0.4, '#6a5038');
  ctx.strokeStyle = '#7a7462'; ctx.lineWidth = 0.5; roomSeg(ctx, [[x + 66, F - 42.8], [x + 67.5, F - 40]]);  // the tag on its thread
  roomPart(ctx, roomRound(x + 65.5, F - 40, 4.5, 5, 0.8), '#9a9050', { top: 0.5 }); roomDot(ctx, x + 67.75, F - 39, 0.5, '#4a4436');
  // the forks, two tines a pallet apart in depth (the far one moved back to its place), their shadow under both
  const fork = () => roomPart(ctx, roomRound(x, F - 5, 50, 3, 0.8), '#7a6a34', { top: 0.6, under: 0.6, solid: 0.12, shadow: false });
  roomShadow(ctx, x, x + 50, HOLD_DEPTH); roomAtDepth(ctx, x + 25, F - 3.5, 0.38, fork); fork();
  roomDot(ctx, x + 4, F - 1.4, 1.4, '#1a2430'); ctx.lineWidth = 0.9; ctx.strokeStyle = FIG_LINE; ctx.stroke();  // the load roller
  roomPart(ctx, `M ${n(x + 47)} ${F - 6} L ${n(x + 47)} ${F - 12} Q ${n(x + 47)} ${F - 15} ${n(x + 50)} ${F - 15} L ${n(x + 58)} ${F - 15} L ${n(x + 59)} ${F - 6} Z`, '#8a7a3a', { top: 1, side: 1.5, solid: 0.3 });
  roomFlat(ctx, x + 49, F - 11, 5, 1.2, '#4a4436');  // its stencil
  roomDot(ctx, x + 54, F - 3, 3, '#1a2430'); ctx.lineWidth = 0.9; ctx.strokeStyle = FIG_LINE; ctx.stroke(); roomDot(ctx, x + 54, F - 3, 1, '#56708c');  // the steer wheel
}
// The hold (#933): the rings in the deck, the crates by the cargo (s.cargo, 0 to 1, up to twelve) on their pallets, strapped down under the net
// (roomHoldCrate, roomHoldStraps, roomHoldNet); the pallet jack (roomHoldJack); the lamp swinging on its cable (moved, not redrawn, as a path given
// to roomPart is fixed per layout); and at the flip the hold log, slipped from its clip, floating. Nothing under the room's name at its top left.
// In the box (#1024): the jack first, past the stacks toward the right wall; then the stacks, each on its pallet from the bottom up, from the
// walls in toward the eye, so a stack nearer it covers its neighbour's side; then at the front the rings in the deck, the straps and the net.
function roomHold(ctx, r, s, X, W) {
  const { w, time } = s, F = r.floor, n = Math.min(12, Math.round(12 * s.cargo)), stacks = Math.ceil(n / 3), sx = c => Math.round(holdCrate(r, 3 * c).x * 100) / 100;
  if (W >= 300) roomHoldJack(ctx, r.x0 + HOLD_FROM + 4 * (HOLD_W + HOLD_GAP) - HOLD_GAP + 2, F);  // at the foot of the last stack
  const off = c => { const e = roomEyeAt(sx(c) + HOLD_W / 2); return e ? Math.abs(sx(c) + HOLD_W / 2 - e.vx) : 0; };
  for (const c of Array.from({ length: stacks }, (_, c) => c).sort((a, b) => off(b) - off(a))) {
    roomHoldPallet(ctx, sx(c), F);
    for (let k = 3 * c; k < Math.min(n, 3 * c + 3); k++) roomHoldCrate(ctx, r, k);
  }
  for (let c = 0; c < 4; c++) for (const ex of [sx(c) + 0.75, sx(c) + HOLD_W - 0.75]) holdRing(ctx, ex, F);
  for (let c = 0; c < stacks; c++) roomHoldStraps(ctx, sx(c), holdCrate(r, Math.min(n - 1, 3 * c + 2)).y, F);
  if (n > 0) roomHoldNet(ctx, r, n, s);
  if (W >= 300) {
    const lx = X(0.9), [ex, ey] = hangEnd(lx, r.top + 6, 16, 0.7, w, time, s.still);
    ctx.strokeStyle = '#7a8a9a'; ctx.lineWidth = 1; roomSeg(ctx, [[lx, r.top + 6], [ex, ey]]);
    ctx.save(); ctx.translate(ex, ey);
    roomFlat(ctx, -1.5, -0.5, 3, 2.5, '#3a4a5a');  // its cap
    roomPart(ctx, 'M -4 2 L 4 2 L 6.5 7 L -6.5 7 Z', '#5a6470', { top: 0.6, side: 1 });  // the shade
    roomPart(ctx, roomRound(-4, 7, 8, 3, 1.4), '#a89a78', { top: 0 });  // the glass
    ctx.strokeStyle = '#3a4a5a'; ctx.lineWidth = 0.6; roomSeg(ctx, [[-2, 7], [-2, 10]]); roomSeg(ctx, [[2, 7], [2, 10]]);  // its cage
    ctx.restore();
  }
  if (w.flip > 0.05 && !s.still) {
    ctx.save(); ctx.globalAlpha = w.flip; ctx.translate(X(0.6) + Math.sin(time * 0.4) * 24, F - 84 + Math.cos(time * 0.5) * 4); ctx.rotate(time * 0.6);
    roomPart(ctx, roomRound(-5, -6.5, 10, 13, 1), '#5e4e36', { top: 0.6, side: 1 }); roomFlat(ctx, -3.5, -4.5, 7, 9, '#8a8678');
    for (let k = 0; k < 3; k++) roomFlat(ctx, -2.5, -2.5 + 2.2 * k, 5, 0.5, '#4a4436');
    roomFlat(ctx, -2, -7.5, 4, 2.5, '#6a7480'); ctx.restore();
  }
}

// The medbay (#933). The cot's mattress top over the deck (about 30, between a person's knee and hip), where the cutaway lays a patient (shiplife.js).
const MED_COT = 30;
// The cot, a person long with a little to spare (108, a lying person is about 89): from 46 before the bed spot at 0.34 of the room, where the hurt
// lie (shiplife.js routineTarget 'bed'), so its pillow end is under the head. Its frame on two legs on casters with their brakes set,
// a cross bar and a stencil, the head and foot boards, a rail along its far side, the mattress, the pillow under the head of a patient at the bed
// spot (head to the left), and two straps with buckles hanging down its front, to hold the hurt down in the burn. In the box (#1024) it is a cot
// deep (MED_DEPTH): its shadow on the strip and its two back legs first, then what stands behind it (behind: the IV pole), then its front legs,
// the rail at its far side, and the frame, the boards and the mattress solid, the mattress's top running back from where the patient lies.
const MED_DEPTH = 0.5;
function roomMedCot(ctx, X, F, behind = () => {}) {
  const n = v => Math.round(v * 100) / 100, x = n(X(0.34) - 46), w = 108, x1 = n(x + w), T = F - MED_COT, hx = n(X(0.34) - 32);
  const legs = [n(x + 9), n(x1 - 12)], leg = lx => {
    roomPart(ctx, `M ${lx} ${T + 8} L ${n(lx + 3)} ${T + 8} L ${n(lx + 2.6)} ${F - 6} L ${n(lx + 0.4)} ${F - 6} Z`, '#1c3249', { top: 0, side: 1 });
    roomPart(ctx, roomRound(lx - 2, F - 7, 7, 2, 0.8), '#20384f', { top: 0.5 });  // the caster's fork
    roomDot(ctx, lx + 1.5, F - 2.6, 2.4, '#1a2430'); ctx.lineWidth = 0.9; ctx.strokeStyle = FIG_LINE; ctx.stroke(); roomDot(ctx, lx + 1.5, F - 2.6, 0.8, '#56708c');
    roomFlat(ctx, lx + 4.5, F - 5.6, 3, 1.4, '#7a3a30');  // its brake, set
  };
  roomShadow(ctx, x, x1, MED_DEPTH);
  for (const lx of legs) roomAtDepth(ctx, lx + 1.5, F, MED_DEPTH, () => leg(lx));  // the back legs, at its far side
  behind();
  for (const lx of legs) leg(lx);
  roomPart(ctx, roomRound(x + 11, F - 17, w - 22, 1.6, 0.8), '#1c3249', { top: 0.5 });  // the cross bar
  ctx.strokeStyle = '#4a6680'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.arc(x + w / 2, F - 2, 1.3, 0, Math.PI * 2); ctx.stroke();  // a tie-down ring
  roomAtDepth(ctx, x + w / 2, T, MED_DEPTH, () => {  // the rail along its far side, its uprights down to the mattress's back edge
    for (const ux of [x + 26, x1 - 26]) roomFlat(ctx, ux, T - 8, 1.5, 8, '#2a3e54');
    roomPart(ctx, roomRound(x + 23, T - 9.5, w - 45, 1.6, 0.8), '#3a5470', { top: 0.5 });
  });
  roomPart(ctx, roomRound(x, T + 4, w, 4, 1), '#2a4664', { top: 0.8, under: 1, solid: MED_DEPTH });  // the frame
  for (const sx of [x + 3, x1 - 3]) roomDot(ctx, sx, T + 6, 0.6, '#56708c');
  for (const [cx, cw] of [[x + 14, 2.5], [x + 33, 1.5], [x + 79, 3], [x1 - 7, 1.5]]) roomFlat(ctx, cx, T + 4.3, cw, 0.9, '#7e8a94');  // paint chipped off its edge
  roomFlat(ctx, x + 66, T + 6.2, 6, 0.6, '#3e4c5a');  // a scuff
  roomFlat(ctx, x + w / 2 - 8, T + 5, 16, 2.2, '#4a4436'); roomFlat(ctx, x + w / 2 - 6.5, T + 5.6, 3, 1, '#2a261e'); roomFlat(ctx, x + w / 2 - 2, T + 5.6, 6, 1, '#2a261e');  // the stencil
  roomPart(ctx, roomRound(x - 1, T - 11, 3, 19, 1), '#2e4a68', { top: 0.8, side: 0.8, solid: MED_DEPTH, shadow: false });  // the head board
  roomPart(ctx, roomRound(x1 - 2, T - 7, 3, 15, 1), '#2e4a68', { top: 0.8, side: 0.8, solid: MED_DEPTH, shadow: false });  // the foot board
  roomPart(ctx, roomRound(x + 3, T, w - 6, 4.5, 2), '#56667a', { top: 1, under: 0.8, solid: MED_DEPTH, shadow: false });
  roomPart(ctx, roomRound(hx - 8, T - 4.5, 20, 4.5, 2), '#9a968a', { top: 0.8, side: 1.5 });
  for (const f of [0.42, 0.72]) {  // the straps, a buckle on each
    const sx = n(x + w * f);
    roomPart(ctx, roomRound(sx, T - 0.5, 3.5, 12, 0.8), '#4a4436', { top: 0 }); roomFlat(ctx, sx - 0.5, T + 6.5, 4.5, 2.2, '#8796a5');
  }
}
// The IV pole at the cot's head end, bolted to the deck, about a person's height, with a clamp printed on the ship's fabricator and tagged as
// temporary (docs/bible/technology.md); the bag on its hook (it swings: moved, not redrawn, as a path given to roomPart is fixed per layout), its
// drip chamber, and the line from it down the pole, held by two cable ties, to the patient's arm on the cot. Drawn in two parts: the pole behind
// the cot, the bag and its line in front. In the box (#1024) it stands with a contact shadow and no faces.
function roomMedPole(ctx, X, F) {
  const px = Math.round(X(0.25) * 100) / 100;
  roomShadow(ctx, px - 7, px + 7, 0.25); roomPart(ctx, roomRound(px - 7, F - 2.5, 14, 2.5, 1), '#20384f', { top: 0.5 });  // its foot, a contact shadow and no faces (spec section 5)
  for (const bx of [px - 5, px + 5]) roomDot(ctx, bx, F - 1.2, 0.6, '#56708c');
  roomPart(ctx, roomRound(px - 1.2, F - 88, 2.4, 86, 1), '#4a5e74', { top: 0, side: 0.8 });
  roomPart(ctx, roomRound(px - 1, F - 88, 9, 1.6, 0.8), '#4a5e74', { top: 0 });  // the hook's arm
  roomPart(ctx, roomRound(px - 2.2, F - 52, 4.4, 4, 0.8), '#8a6a48', { top: 0.6, side: 0.8 });  // the printed clamp, its layers
  for (const ly of [F - 51, F - 49.5]) roomFlat(ctx, px - 1.8, ly, 3.6, 0.4, '#6a5038');
  ctx.strokeStyle = '#7a7462'; ctx.lineWidth = 0.5; roomSeg(ctx, [[px - 2, F - 49], [px - 4.5, F - 47]]);  // the tag on its thread
  roomPart(ctx, roomRound(px - 7.5, F - 47, 5, 5.5, 0.8), '#9a9050', { top: 0.5 }); roomDot(ctx, px - 5, F - 46, 0.5, '#4a4436');
  return px;
}
function roomMedBag(ctx, px, X, F, s) {
  const [ix, iy] = hangEnd(px + 7, F - 88, 4, 3.1, s.w, s.time, s.still);
  ctx.strokeStyle = 'rgba(150,178,196,0.7)'; ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.moveTo(ix, iy + 15); ctx.quadraticCurveTo(px + 1.6, F - 66, px + 1.6, F - 62); ctx.lineTo(px + 1.6, F - 55); ctx.quadraticCurveTo(px + 4, F - 36, X(0.3), F - MED_COT - 1); ctx.stroke();
  for (const ty of [F - 61, F - 56]) roomFlat(ctx, px - 1.6, ty, 4.2, 1, '#1e2a36');  // the cable ties
  ctx.save(); ctx.translate(ix, iy);
  roomFlat(ctx, -0.5, -1, 1, 1.5, '#7a8e9c');  // its loop on the hook
  roomPart(ctx, roomRound(-4, 0.5, 8, 12, 2.5), '#6a8494', { top: 0.6, side: 1.2 }); roomFlat(ctx, -2.8, 5.5, 5.6, 6, '#8aa8b8'); roomFlat(ctx, -2.2, 2.5, 4.4, 1, '#4a5e6c');  // the fluid and its label
  roomFlat(ctx, -1, 12.5, 2, 2.5, '#7a8e9c'); ctx.restore();  // the drip chamber
}
// The scanner arm from the ceiling, a newer unit than the room in a warm grey finish, bolted on later: the old mount, an adapter plate under it
// with fresh bolts, the upper arm down to the elbow and the forearm out over the cot, jointed, to the scanner's head over the patient's chest,
// clear of whoever lies there, its lamp lit while it has one.
function roomMedScanner(ctx, r, s, X) {
  const n = v => Math.round(v * 100) / 100, F = r.floor, T = r.top, mx = n(X(0.44)), ex = n(X(0.42)), hx = n(X(0.315));
  roomPart(ctx, roomRound(mx - 8, T + 1, 16, 3.5, 1), '#20384f', { top: 0, under: 1 });
  for (const bx of [mx - 5.5, mx + 5.5]) roomDot(ctx, bx, T + 2.8, 0.6, '#56708c');
  roomPart(ctx, roomRound(mx - 10, T + 4, 20, 2.5, 0.8), '#5a5e60', { top: 0.5 });  // the adapter plate
  for (const bx of [mx - 8, mx - 3, mx + 3, mx + 8]) roomDot(ctx, bx, T + 5.3, 0.6, '#8a929a');  // its fresh bolts
  roomPart(ctx, `M ${n(mx - 1.8)} ${T + 6.5} L ${n(mx + 1.8)} ${T + 6.5} L ${n(ex + 1.8)} ${F - 74} L ${n(ex - 1.8)} ${F - 74} Z`, '#6a6a66', { top: 0, side: 1 });
  roomPart(ctx, `M ${ex} ${F - 76} L ${n(hx + 2)} ${F - 65.5} L ${hx} ${F - 62.5} L ${n(ex - 1)} ${F - 72.5} Z`, '#6a6a66', { top: 0, under: 1 });
  for (const [jx, jy, jr] of [[mx, T + 8, 2.4], [ex, F - 74, 2.6]]) { roomDot(ctx, jx, jy, jr, '#4a4a48'); ctx.lineWidth = 0.9; ctx.strokeStyle = FIG_LINE; ctx.stroke(); roomDot(ctx, jx, jy, 0.7, '#8a8a84'); }
  roomPart(ctx, `M ${n(hx - 13)} ${F - 63} L ${n(hx + 13)} ${F - 63} L ${n(hx + 11)} ${F - 57} L ${n(hx - 11)} ${F - 57} Z`, '#7a7870', { top: 1, under: 1 });
  roomFlat(ctx, hx - 8, F - 57.2, 16, 1, s.patient ? '#4f8ab0' : '#2f3f50');
}
// The supply cabinet (#933) from 0.76 to 0.97, its top at the counter: two doors with hinges, handles and a latch, a cross on one, a kick plate; on
// its top a rail to keep things in place in zero g, two bottles and a kit with a cross. Worn: chipped paint on its edges and scuffs low on the
// doors, where feet and the cot's casters meet it, and the right door a replacement in another shade. In the box (#1024) its body and its top
// are solid, a cabinet deep, and what stands on its top is stood a little back from its front edge (roomAtDepth).
function roomMedCabinet(ctx, X, F) {
  const n = v => Math.round(v * 100) / 100, cx = n(X(0.76)), cw = n(X(0.97) - cx), c1 = n(cx + cw), mid = n(cx + cw / 2), dw = n(cw / 2 - 4.8);
  roomPart(ctx, roomRound(cx + 2, F - 38, cw - 4, 38, 1), '#4e5e6e', { top: 0, side: 2.5, solid: 0.45 });
  roomFlat(ctx, cx + 4, F - 3.5, cw - 8, 2.5, '#2a3846');  // the kick plate
  for (const j of [0, 1]) {
    const dx = j ? n(mid + 0.8) : n(cx + 4);
    roomPart(ctx, roomRound(dx, F - 35, dw, 30, 1), j ? '#6a7480' : '#64748a', { top: 0.8, side: j ? 1.2 : -1.2 });
    for (const hy of [F - 32, F - 9]) roomFlat(ctx, j ? dx + dw - 1.5 : dx, hy, 1.5, 3, '#3a4a5a');  // its hinges
  }
  roomFlat(ctx, mid - 0.5, F - 35, 1, 30, '#8a96a2');  // the seam between its doors
  for (const [sx, sw] of [[cx + 9, 5], [cx + 17, 2.5], [mid + 9, 4]]) roomFlat(ctx, sx, F - 8, sw, 0.8, '#3e4c5a');  // scuffs
  for (const [sx, sy] of [[cx + 2.3, F - 30], [cx + 2.3, F - 16], [c1 - 4.3, F - 22]]) roomFlat(ctx, sx, sy, 1.6, 1.6, '#7e8a94');  // chipped edges
  for (const hx of [mid - 5, mid + 3]) roomFlat(ctx, hx, F - 24, 2, 6, '#9aa8b6');
  roomFlat(ctx, mid - 1.5, F - 33.5, 3, 2, '#2a3e54');  // the latch
  const kx = n(cx + 4 + dw / 2);
  roomFlat(ctx, kx - 4, F - 26, 8, 2.4, '#8e3a32'); roomFlat(ctx, kx - 1.2, F - 29, 2.4, 8.4, '#8e3a32');  // the cross
  roomFlat(ctx, kx - 6, F - 12, 12, 2, '#3a4436'); roomFlat(ctx, kx - 5, F - 11.4, 4, 0.8, '#2a261e'); roomFlat(ctx, kx, F - 11.4, 4, 0.8, '#2a261e');  // the stencil
  roomPart(ctx, roomRound(cx, F - 41, cw, 3.5, 1), '#6e7e8e', { top: 1, under: 1, solid: 0.5 });
  for (const bx of [cx + 5, cx + 12]) roomAtDepth(ctx, bx + 2.5, F - 41, 0.25, () => {  // the bottles, their caps
    roomPart(ctx, roomRound(bx, F - 51, 5, 10, 1.5), '#4e6a78', { top: 0.6, side: 1 }); roomFlat(ctx, bx + 1, F - 47, 3, 5, '#7fb8c8'); roomFlat(ctx, bx + 1, F - 53, 3, 2, '#8796a5');
  });
  roomAtDepth(ctx, c1 - 13, F - 41, 0.25, () => {
    roomPart(ctx, roomRound(c1 - 22, F - 52, 18, 11, 1.5), '#7a8692', { top: 1, side: 1.5 });
    roomFlat(ctx, c1 - 15, F - 50, 4, 7, '#8e3a32'); roomFlat(ctx, c1 - 16.5, F - 48, 7, 3, '#8e3a32'); roomFlat(ctx, c1 - 16, F - 53.5, 6, 1.5, '#2a3e54');  // its cross and handle
  });
  for (const rx of [cx + 2, c1 - 3.5]) roomFlat(ctx, rx, F - 45, 1.5, 4, '#2a3e54');  // the rail's posts
  roomPart(ctx, roomRound(cx + 1, F - 46, cw - 2, 1.4, 0.7), '#3a5470', { top: 0.5 });
}
// The medbay (#933), beside the airlock: the first-aid box on the wall under the room's name, the IV pole behind the cot (roomMedCot), the scanner
// arm over it, the bag and its line, the monitor at eye height over the cot's foot end (its trace amber and quicker with a patient), a grab rail for zero g,
// and the supply cabinet (roomMedCabinet). The medic's stool is drawn by drawRoom; nothing stands under the room's name at its top left. The room
// is old and cared for, as the ship is (docs/bible/technology.md, ship.md): worn at fixed places, mended, its parts from more than one source.
// In the box (#1024): the first-aid box, the monitor and the grab rail on the back wall first, in the wall tone (the box hung low enough that the
// move onto the wall keeps it under the room's name); then the cot with the pole behind it, from the left wall in, and the cabinet from the right;
// the scanner arm stays on the ceiling at the cut, and the bag and its line hang in front.
function roomMedbay(ctx, r, s, X, W) {
  const { time } = s, F = r.floor, n = v => Math.round(v * 100) / 100;
  if (W >= 300) {
    const bx = n(X(0.03));
    roomOnWall(ctx, bx + 15, F - 40, () => {
      roomPart(ctx, roomRound(bx, F - 51, 30, 22, 2), '#5a6876', { top: 1, side: 1.5 });
      roomFlat(ctx, bx + 11, F - 45, 8, 2.6, '#8e3a32'); roomFlat(ctx, bx + 13.7, F - 48, 2.6, 8.6, '#8e3a32'); roomFlat(ctx, bx + 26, F - 42, 1.5, 4, '#2a3e54');  // its cross and latch
      for (const [sx, sy] of [[bx + 2.5, F - 48.5], [bx + 27.5, F - 31.5]]) roomDot(ctx, sx, sy, 0.6, '#56708c');
    });
  }
  if (W >= 260) {
    const mx = n(X(0.34) + 52), my = F - 85, mw = 30, mh = 16;  // over the cot's foot end, between the scanner arm and the aid's place
    roomOnWall(ctx, mx + mw / 2, my + mh / 2, () => {
      roomFlat(ctx, mx + mw / 2 - 3, my + mh, 6, 4, '#2a3e54');  // its bracket
      roomPart(ctx, roomRound(mx, my, mw, mh, 2), '#1f3a56', { top: 1, under: 1 }); roomFlat(ctx, mx + 2.5, my + 2.5, mw - 5, mh - 5, '#04101a');
      for (const [sx, sy] of [[mx + 1.5, my + 1.5], [mx + mw - 1.5, my + 1.5]]) roomDot(ctx, sx, sy, 0.5, '#56708c');
      roomPart(ctx, `M ${n(mx + mw - 6)} ${n(my - 1)} L ${n(mx + mw - 2)} ${n(my - 1)} L ${n(mx + mw + 1)} ${n(my + 2)} L ${n(mx + mw + 1)} ${n(my + 6)} Z`, '#7a7462', { top: 0 });  // tape over a cracked corner of the bezel
      ctx.strokeStyle = s.patient ? '#ffb030' : '#7fd8a0'; ctx.lineWidth = 1; ctx.beginPath();  // the trace in its own light, amber and quicker with a patient
      for (let x = 0; x < mw - 7; x++) { const u = (x + time * (s.patient ? 40 : 20)) % 20, y = u > 8 && u < 10 ? (u < 9 ? -4.5 : 2.5) : 0; if (x) ctx.lineTo(mx + 3.5 + x, my + 9.5 + y); else ctx.moveTo(mx + 3.5, my + 9.5 + y); }
      ctx.stroke();
    });
    const g0 = n(X(0.8)), g1 = n(X(0.94));  // a grab rail on the wall over the cabinet, for zero g
    roomOnWall(ctx, (g0 + g1) / 2, F - 64, () => {
      for (const gx of [g0 + 2, g1 - 4]) roomFlat(ctx, gx, F - 66, 2, 4.5, '#2a3e54');
      roomPart(ctx, roomRound(g0, F - 64, g1 - g0, 3, 1.5), '#3a5470', { top: 0.6, under: 0.8 });
    });
  }
  let px = null;
  roomMedCot(ctx, X, F, () => { if (W >= 200) px = roomMedPole(ctx, X, F); });
  if (W >= 240) roomMedCabinet(ctx, X, F);
  roomMedScanner(ctx, r, s, X);
  if (px !== null) roomMedBag(ctx, px, X, F, s);
}

// The head and shower on the mess deck (#933), across the well from the galley. The head's door is shut in a partition on the galley side,
// just past where the morning's queue waits by it (shiplife.js headDoorX, at 0.1 and 0.16 of the room): the partition runs from the cut back to
// the back wall, and the cutaway shows its face toward the eye, the inside of the door, so the one inside is seen, as every room is. On the
// door its slide latch, its hinges and the stores list pinned on its back (a line has someone adding soap to it); the occupied lamp on its frame
// at the cut, by the latch, lit while someone is in (s.headIn, drawCutaway). Past it, from the partition in: the toilet, for zero g (its seat
// at the seat's height on a newer pedestal on the old plinth with fresh bolts, the lid up, the thigh bar over the seat, the foot hold with a
// printed bracket tagged temporary, the funnel in its clip on its hose, the suction line down through the deck with a cable tied along it); a
// grab rail over it and one in the passage where the queue waits. From the right wall in: two lockers for wash kit (vents, number plates,
// handles, one newer in another finish); the shower stall on its tray, its door with frosted glass, the rose and its flow restrictor seen
// through it, the handle and the hot water's timer counting the ration. In the middle, where the one inside stands, the basin hung off the
// back wall at the waist with its push tap, and on the wall over it the mirror (taped over a crack) at the eye, the shelf under it with a
// mug, and the towel rail. The room's name (roomNameAt) is short and high, clear of the door. Its lamp is a fitting (LAMP_FITTED), over the basin.
const HEAD_LAMP_LIT = '#a07848', HEAD_LAMP_OFF = '#4a2a26';  // the occupied lamp, lit (muted amber) and dark
function roomHead(ctx, r, s, X) {
  const F = r.floor, T = r.top, n = v => Math.round(v * 100) / 100, e = roomEye(r), I = (x, y, d) => roomInto(e, x, y, d).map(n);
  const at = (d, px, py, fn) => {  // fn draws round (ax, ay), which lands at (px, py) at the depth d (1: on the back wall, in the wall tone)
    const q = 1 - d * (1 - e.k), ax = n(e.vx + (px - e.vx) / q), ay = n(e.vy + (py - e.vy) / q);
    if (d === 1) roomOnWall(ctx, ax, ay, () => fn(ax, ay)); else roomAtDepth(ctx, ax, ay, d, () => fn(ax, ay));
  };
  const rail = (x, y, w) => {  // a grab rail on two brackets, centred on x
    for (const bx of [x - w / 2 + 2, x + w / 2 - 4]) roomFlat(ctx, bx, y - 2, 2, 4.5, '#2a3e54');
    roomPart(ctx, roomRound(n(x - w / 2), n(y - 1.5), w, 3, 1.5), '#3a5470', { top: 0.6, under: 0.8 });
  };
  const P = n(X(0.205)), tx = n(X(0.32)), B = n(X(0.56)), S0 = n(X(0.69)), L1 = n(X(0.985));
  // On the wall: the grab rails, in the passage and over the toilet; the mirror at the eye over the basin, the shelf under it; the towel rail.
  at(1, n(P - 22), F - 50, (x, y) => rail(x, y, 26));
  at(1, tx, F - 52, (x, y) => rail(x, y, 26));
  at(1, B, F - 77, (x, y) => {
    roomPart(ctx, roomRound(x - 10, y - 8, 20, 16, 1.2), '#34506a', { top: 0.8, under: 1 });
    roomFlat(ctx, x - 8, y - 6, 16, 12, '#3b566e'); roomFlat(ctx, x - 8, y - 6, 5, 12, 'rgba(170,200,230,0.1)');
    roomPart(ctx, `M ${n(x + 4)} ${n(y - 6)} L ${n(x + 8)} ${n(y - 6)} L ${n(x + 8)} ${n(y - 2)} Z`, '#7a7462', { top: 0 });  // tape over a crack in its corner
    for (const [sx, sy] of [[x - 9, y - 7], [x + 9, y - 7], [x - 9, y + 7], [x + 9, y + 7]]) roomDot(ctx, sx, sy, 0.5, '#56708c');
  });
  at(1, B, F - 66, (x, y) => {  // the shelf, a mug on it with a toothbrush
    roomPart(ctx, roomRound(x - 11, y, 22, 2.5, 0.8), '#22405c', { top: 0.6, under: 0.6 });
    roomPart(ctx, roomRound(x + 3, y - 5, 5, 5, 1), '#5a6a7a', { top: 0.6, side: 0.8 }); roomFlat(ctx, x + 5, y - 8, 1, 3.5, '#6a8a7a');
  });
  at(1, n(X(0.627)), F - 62, (x, y) => {  // the towel rail, two towels on it
    for (const bx of [x - 12, x + 10]) roomFlat(ctx, bx, y - 1, 2, 4, '#2a3e54');
    roomPart(ctx, roomRound(x - 12, y, 24, 2, 1), '#5a6e84', { top: 0.6 });
    [['#7a3a34', -11], ['#3a5a7a', 0.5]].forEach(([col, dx]) => {
      roomPart(ctx, `M ${n(x + dx)} ${y} L ${n(x + dx + 10.5)} ${y} L ${n(x + dx + 10)} ${y + 25} Q ${n(x + dx + 5.2)} ${y + 26.4} ${n(x + dx + 0.5)} ${y + 25} Z`, col, { top: 1, side: 1.2 });
      roomFlat(ctx, x + dx + 1, y + 21, 8.5, 1, figShade(col, 0.7));
    });
  });
  // The partition from the cut back to the back wall, its face toward the eye; the door's frame and the door shut in it, its latch, hinges and
  // the stores list; the frame's edge at the cut, and the occupied lamp on it.
  roomFace(ctx, [[P, T], [P, F], I(P, F, 1), I(P, T, 1)], '#0e1b28', true);
  const quad = (d0, d1, h0, h1) => { const p = [I(P, F - h1, d0), I(P, F - h1, d1), I(P, F - h0, d1), I(P, F - h0, d0)]; return `M ${p[0].join(' ')} L ${p[1].join(' ')} L ${p[2].join(' ')} L ${p[3].join(' ')} Z`; };
  roomPart(ctx, quad(0, 0.9, 0, 91), '#2a3c50', { top: 0 });
  roomPart(ctx, quad(0.1, 0.85, 0, 88), '#30465c', { top: 0.6 });
  for (const h of [10, 52]) { const [hx, hy] = I(P, F - h, 0.83); roomFlat(ctx, hx - 0.6, hy - 2, 1.2, 4, '#56708c'); }  // the hinges
  roomPart(ctx, quad(0.4, 0.62, 44, 55), '#8a8676', { top: 0 });  // the stores list, pinned up
  for (let l = 0; l < 3; l++) { const [lx, ly] = I(P, F - 52 + l * 2.6, 0.45); roomFlat(ctx, lx, ly, 2.2 - (l % 2) * 0.8, 0.5, '#5a5648'); }
  { const [lx, ly] = I(P, F - 42, 0.16); roomFlat(ctx, lx, ly - 1.2, 3, 2.4, '#8796a5'); roomFlat(ctx, lx + 0.2, ly - 5, 2, 1.2, '#5a6a78'); }  // the slide latch, the paint worn over it
  roomFlat(ctx, P - 1, T, 2, F - T, '#04080d');
  roomPart(ctx, roomRound(P - 3, F - 57, 6, 8, 1.2), '#263a50', { top: 0.5, under: 0.8 });
  if (s.headIn) { roomDot(ctx, P, F - 53, 3, 'rgba(160,120,72,0.25)'); roomDot(ctx, P, F - 53, 1.6, HEAD_LAMP_LIT); } else roomDot(ctx, P, F - 53, 1.6, HEAD_LAMP_OFF);  // lit while someone is in
  // The toilet: its plinth with fresh bolts, the suction line down through the deck, a cable tied along it; the pedestal, the lid up, the seat,
  // the thigh bar over it on its arms, the funnel in its clip on its hose, and the foot hold with its printed bracket and its tag.
  roomPart(ctx, roomRound(tx - 15, F - 3, 30, 3, 0.8), '#24384c', { top: 0.5, solid: 0.5 });
  for (const bx of [tx - 13, tx + 11.8]) roomFlat(ctx, bx, F - 2.2, 1.2, 1.2, '#8a929a');
  roomPart(ctx, roomRound(tx - 22, F - 16, 5, 24, 1), '#34444f', { top: 0, side: 1 });
  roomPart(ctx, roomRound(tx - 22, F - 16, 12, 4, 1.5), '#34444f', { top: 0.5 });
  ctx.strokeStyle = roomTint('#3a3a40'); ctx.lineWidth = 0.9; roomSeg(ctx, [[tx - 23.5, F - 30], [tx - 23.5, F + 6]]);
  for (const ty of [F - 12, F - 4]) roomFlat(ctx, tx - 24, ty, 7, 1.2, '#1e2a36');
  roomPart(ctx, roomRound(tx - 9, F - 41, 18, 17, 3), '#46545f', { top: 0.6, side: 1 });
  roomPart(ctx, `M ${tx - 10} ${F - 3} L ${tx - 11} ${F - 20} L ${tx + 11} ${F - 20} L ${tx + 10} ${F - 3} Z`, '#4e5e6e', { top: 0.8, side: 1.2, solid: 0.45, shadow: false });
  roomPart(ctx, roomRound(tx - 4, F - 16, 8, 4, 0.8), '#3e4c58', { top: 0.4 });  // the flush and suction switch
  roomPart(ctx, roomRound(tx - 13, F - 23, 26, 3, 1.2), '#3a4a58', { top: 0.6, solid: 0.5, shadow: false });
  for (const ax of [tx - 14, tx + 12.4]) roomFlat(ctx, ax, F - 31, 1.6, 9, '#3a4652');
  roomPart(ctx, roomRound(tx - 15, F - 33, 30, 3.5, 1.5), '#2e3a46', { top: 0.6 });
  ctx.strokeStyle = roomTint('#2a3440'); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(tx + 15.5, F - 20); ctx.quadraticCurveTo(tx + 20, F - 9, tx + 10, F - 8); ctx.stroke();
  roomFlat(ctx, tx + 11, F - 25, 2, 3, '#3a4652');
  roomPart(ctx, `M ${tx + 12} ${F - 27} L ${tx + 19} ${F - 27} L ${tx + 17} ${F - 20} L ${tx + 14} ${F - 20} Z`, '#5a6470', { top: 0.5 });
  for (const px of [tx - 14, tx + 12]) roomFlat(ctx, px, F - 4, 2, 4, '#34404c');
  roomPart(ctx, roomRound(tx - 16, F - 6.5, 32, 2.5, 1), '#3a4a5e', { top: 0.5 });
  roomPart(ctx, roomRound(tx + 14, F - 9, 4.5, 4.5, 1), '#8a6a48', { top: 0.5, side: 0.6 });
  for (const ly of [F - 7.8, F - 6.4]) roomFlat(ctx, tx + 14.5, ly, 3.5, 0.4, '#6a5038');
  roomPart(ctx, roomRound(tx + 15, F - 4, 3.5, 3.5, 0.6), '#9a9050', { top: 0.5 }); roomDot(ctx, tx + 16.75, F - 3, 0.5, '#4a4436');
  for (const [sx, sw] of [[tx - 8, 5], [tx + 5, 4]]) roomFlat(ctx, sx, F - 2.4, sw, 0.8, '#5a6670');  // scuffs, where boots go
  // From the right wall in: the lockers, the newer one in another finish; then the shower stall.
  [['#24425e', 0], ['#2a3e4e', 1]].forEach(([col, k]) => {
    const lx = n(L1 - 22 * (k + 1));
    roomPart(ctx, roomRound(lx, F - 88, 22, 88, 1.2), col, { top: 1, side: -1, solid: 0.45 });
    for (let v = 0; v < 4; v++) roomFlat(ctx, lx + 5, F - 82 + v * 2.4, 12, 1, '#0f1f30');
    roomPart(ctx, roomRound(lx + 6, F - 70, 10, 5, 0.8), '#8a8270', { top: 0 }); roomFlat(ctx, lx + 8, F - 68, 2.5, 1, '#4a4436'); roomFlat(ctx, lx + 11.5, F - 68, 2.5, 1, '#4a4436');
    roomFlat(ctx, lx + 16, F - 50, 2.5, 8, '#8796a5');
    for (let v = 0; v < 4; v++) roomFlat(ctx, lx + 5, F - 14 + v * 2.4, 12, 1, '#0f1f30');
  });
  roomPart(ctx, roomRound(S0 - 2, F - 5, 52, 5, 1), '#24405e', { top: 1, solid: 0.65 });
  roomPart(ctx, roomRound(S0, F - 92, 48, 87, 1.5), '#1e3a54', { top: 1, solid: 0.6, shadow: false });
  roomFlat(ctx, S0 + 3, F - 89, 42, 83, '#132a3c');
  ctx.strokeStyle = roomTint('#3d5a7a'); ctx.lineWidth = 1.6; roomSeg(ctx, [[S0 + 12, F - 58], [S0 + 12, F - 84], [S0 + 18, F - 84]]);
  roomFlat(ctx, S0 + 10.5, F - 74, 3, 3, '#5a6a5e');  // the flow restrictor on the pipe, the water ration
  roomPart(ctx, roomRound(S0 + 16, F - 87, 9, 4, 1.5), '#6a7a8a', { top: 0.5, under: 0.6 });
  roomFlat(ctx, S0 + 7, F - 85, 34, 61, 'rgba(150,190,220,0.14)');  // the glass, frosted
  for (const [dx, dy, dw, dh] of [[3, 89, 4, 83], [41, 89, 4, 83], [3, 89, 42, 4], [3, 24, 42, 18]]) roomPart(ctx, roomRound(S0 + dx, F - dy, dw, dh, 1), '#2e4a62', { top: 0.6, under: 0.6 });
  roomPart(ctx, roomRound(S0 + 36, F - 56, 2.5, 14, 1), '#7a8a98', { top: 0, side: 0.6 });
  roomPart(ctx, roomRound(S0 + 31, F - 74, 8, 7, 1), '#28384a', { top: 0.5 });  // the hot water's timer, its count lit, a push to start
  for (let k = 0; k < 3; k++) roomFlat(ctx, S0 + 32.5 + k * 1.9, F - 72, 1.2, 2.4, k < 2 ? '#7fd8a0' : '#2e4a3a');
  roomDot(ctx, S0 + 35, F - 68.8, 0.8, '#4a6a5a');
  for (const [sx, sy, sw] of [[S0 + 8, F - 21, 4], [S0 + 30, F - 12, 5]]) roomFlat(ctx, sx, sy, sw, 0.8, '#3e5a76');  // chips in the door's kick panel
  // In the middle, hung off the back wall: the basin at the waist, its push tap, the bracket and the trap under it.
  at(0.7, B, F - 40, (x, y) => {
    roomPart(ctx, roomRound(x - 3, y + 8, 6, 9, 1), '#36485a', { top: 0, side: 0.8 });
    ctx.strokeStyle = roomTint('#3a4652'); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x + 2, y + 9); ctx.quadraticCurveTo(x + 7, y + 16, x + 2, y + 20); ctx.stroke();
    roomPart(ctx, `M ${n(x - 14)} ${y} L ${n(x + 14)} ${y} L ${n(x + 12)} ${n(y + 5)} Q ${n(x + 8)} ${n(y + 10)} ${x} ${n(y + 10)} Q ${n(x - 8)} ${n(y + 10)} ${n(x - 12)} ${n(y + 5)} Z`, '#6e7e8e', { top: 0, under: 1 });
    ctx.fillStyle = roomTint('#7a8a98'); ctx.beginPath(); ctx.ellipse(x, y, 14, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = roomTint('#2e3c4a'); ctx.beginPath(); ctx.ellipse(x, y + 0.3, 11, 2, 0, 0, Math.PI * 2); ctx.fill();
    roomFlat(ctx, x + 5, y - 7, 2, 6, '#8796a5'); roomFlat(ctx, x, y - 7, 6, 1.6, '#8796a5'); roomDot(ctx, x + 6, y - 7.8, 1, '#56708c');
  });
}

// The workshop (#933), on the gun deck beside the gunnery across the well, where the engineer's and the gunner's rounds bring them (ROUNDS,
// shiplife.js) to stand a quarter to three quarters of the way across (goTo): so nothing there stands higher than the waist, and whoever is at
// work is at the bench or, at its left end, at the fabricator. From the left wall in: the fabricator, the ship's printer (docs/bible/technology.md),
// a newer unit bolted with fresh bolts onto an older stand of stock drawers, a part printing on its bed behind the window, the time left as a
// bar on its screen, a spool of stock on its side with its weight written on it, and its cable taped and tied down the stand. The bench at the
// waist, a few people long: its cabinet, its legs and the shelf under it with the box for the next yard; on its top a breech from the gunnery's
// guns in pieces (the housing, the block, the spring, the pins in the parts tray), and the vice at its right end with a bracket in its jaws, the
// paint worn off the edge where hands go. On the wall over it the tool board, each tool on its hook in its painted outline, the torque wrench out
// and its card hung in its place; beside it the small-parts drawers. At the right wall the spares rack, at a person's height: boxed spares
// stencilled, loose ones (a pump, a coil of cable, the turret's spare feed tray), the fabricator's stock, a strap across each shelf for zero g,
// one shelf a replacement in another shade on printed brackets, one tagged temporary, and scuffs low where boots go. No words: the stencils, the
// card and the screen are marks. Its lamp is a fitting over the bench (LAMP_FITTED). Nothing under the room's name.
function roomWorkshop(ctx, r, s) {
  const F = r.floor, n = v => Math.round(v * 100) / 100, u = v => n(r.x0 + v), e = roomEye(r);
  const wall = (px, py, fn) => { const ax = n(e.vx + (px - e.vx) / e.k), ay = n(e.vy + (py - e.vy) / e.k); roomOnWall(ctx, ax, ay, () => fn(ax, ay)); };  // fn draws round (ax, ay), which lands at (px, py)
  const rects = (list, grow = 0) => list.map(([x, y, w, h]) => roomRound(x - grow, y - grow, w + 2 * grow, h + 2 * grow, 0.6)).join(' ');
  // On the wall: the tool board over the bench, each tool over its painted outline on its hook, the torque wrench out and its card in its place.
  wall(u(176), F - 68, (x, y) => {
    const L = x - 54, T = y - 16;
    roomPart(ctx, roomRound(L, T, 108, 32, 1.2), '#2e3a40', { top: 0.8, under: 0.8 });
    for (let row = 0; row < 3; row++) for (let k = 0; k < 13; k++) roomFlat(ctx, L + 4 + k * 8.2, T + 4 + row * 11, 0.8, 0.8, '#1a2228');  // its holes
    for (const [sx, sy] of [[L + 2, T + 2], [L + 106, T + 2], [L + 2, T + 30], [L + 106, T + 30]]) roomDot(ctx, sx, sy, 0.6, '#56708c');
    const tools = [
      ['#606870', [[L + 4, T + 5, 9, 3.2], [L + 7.3, T + 8, 2.4, 15]]],  // the hammer
      ['#707a82', [[L + 17, T + 5, 3.4, 4], [L + 17.6, T + 8.5, 2.2, 15], [L + 16.8, T + 23, 3.8, 3.8]]],  // the spanners, large to small
      ['#707a82', [[L + 24.3, T + 5, 3, 3.4], [L + 24.8, T + 8, 2, 12], [L + 24.2, T + 19.5, 3.2, 3.2]]],
      ['#707a82', [[L + 30.5, T + 5, 2.6, 3], [L + 30.9, T + 7.5, 1.8, 10], [L + 30.4, T + 17, 2.8, 2.8]]],
      [null, [[L + 38, T + 5, 4, 4], [L + 38.6, T + 8.5, 2.8, 20]]],  // the torque wrench, out
      ['#7a4438', [[L + 48, T + 5, 3.4, 7], [L + 49.2, T + 12, 1, 9]]],  // two screwdrivers
      ['#3a5878', [[L + 54, T + 5, 3.4, 6], [L + 55.2, T + 11, 1, 8]]],
      ['#5e666e', [[L + 60.8, T + 5, 4, 7.5], [L + 60.5, T + 12, 1.6, 11], [L + 63.5, T + 12, 1.6, 11]]],  // the pliers
      ['#4a5c74', [[L + 70, T + 6, 26, 2], [L + 70, T + 6, 2, 9], [L + 94, T + 6, 2, 9], [L + 71, T + 14, 24, 1], [L + 96, T + 8, 5, 9]]],  // the hacksaw
    ];
    for (const [col, parts] of tools) {
      figPath(ctx, rects(parts, 1)); ctx.fillStyle = roomTint('#5a6a58'); ctx.fill();  // its outline, painted on the board
      roomFlat(ctx, parts[0][0] + parts[0][2] / 2 - 0.6, T + 2.6, 1.2, 1.6, '#8796a5');  // its hook
      if (col) roomPart(ctx, rects(parts), col, { top: 0 });
    }
    roomPart(ctx, roomRound(L + 42.5, T + 6, 5, 7, 0.5), '#8a8676', { top: 0 });  // the card signed for the one out, on its hook
    for (let l = 0; l < 3; l++) roomFlat(ctx, L + 43.3, T + 8 + l * 1.6, 3.2 - (l % 2), 0.4, '#5a5448');
  });
  wall(u(247), F - 72, (x, y) => {  // the small-parts drawers, the bolts by size, each drawer's label a mark
    roomPart(ctx, roomRound(x - 11, y - 10, 22, 20, 1), '#3a4652', { top: 0.6, side: 1 });
    for (let row = 0; row < 3; row++) for (let c = 0; c < 3; c++) {
      const dx = x - 9.5 + c * 6.6, dy = y - 8.2 + row * 6.2;
      roomPart(ctx, roomRound(dx, dy, 5.6, 5, 0.5), '#44525e', { top: 0 });
      roomFlat(ctx, dx + 1, dy + 1, 3.4, 1, '#7a7868'); roomFlat(ctx, dx + 2, dy + 3, 1.6, 1, '#8796a5');
    }
  });
  // From the left wall in: the fabricator on its stand, its cable down the stand to the deck; the bench's cabinet.
  roomPart(ctx, roomRound(u(12), F - 30, 50, 30, 1.2), '#2a3a48', { top: 0, side: 2, solid: 0.45 });
  for (const k of [0, 1]) {
    roomPart(ctx, roomRound(u(15), F - 27 + k * 12, 44, 10, 1), '#30404e', { top: 0.6, side: 1 });
    roomFlat(ctx, u(34), F - 23 + k * 12, 6, 1.4, '#8796a5'); roomFlat(ctx, u(18), F - 25 + k * 12, 6, 3, '#7a7868');
  }
  ctx.strokeStyle = roomTint('#3a3a40'); ctx.lineWidth = 1.2; roomSeg(ctx, [[u(14), F - 48], [u(9), F - 44], [u(9), F + 4]]);
  for (const ty of [F - 30, F - 14]) roomFlat(ctx, u(7.5), ty, 3, 1, '#1e2a36');  // the cable ties
  roomPart(ctx, roomRound(u(7.6), F - 40, 2.8, 4, 0.6), '#7a7462', { top: 0 });  // a wrap of tape
  roomPart(ctx, roomRound(u(14), F - 64, 46, 34, 1.5), '#4a5866', { top: 1, side: 2, solid: 0.45, shadow: false });
  for (const bx of [u(16), u(56.8)]) roomFlat(ctx, bx, F - 31.5, 1.2, 1.2, '#8a929a');  // the fresh bolts holding it to the old stand
  roomPart(ctx, roomRound(u(17), F - 60, 28, 25, 1), '#0e1a24', { top: 0 });  // the window, the gantry, the head and its nozzle, the bed, the part printing
  roomFlat(ctx, u(18.5), F - 56, 25, 1.2, '#56626e');
  roomPart(ctx, roomRound(u(28.5), F - 55, 5, 5.5, 0.8), '#66707a', { top: 0.4 }); roomFlat(ctx, u(30.5), F - 49.5, 1, 3.5, '#8796a5');
  roomPart(ctx, roomRound(u(19), F - 39, 24, 2.5, 0.6), '#3a4048', { top: 0.5 });
  roomPart(ctx, roomRound(u(26), F - 45, 10, 6, 0.8), '#8a6a48', { top: 0.6 });
  for (const ly of [F - 43.5, F - 42]) roomFlat(ctx, u(26.5), ly, 9, 0.4, '#6a5038');
  roomPart(ctx, roomRound(u(47), F - 59, 11, 8, 0.8), '#263442', { top: 0.5 });  // its screen, the time left as a bar, and its keys
  roomFlat(ctx, u(48), F - 58, 9, 6, '#03121c'); roomFlat(ctx, u(49), F - 55.5, 7, 1.4, '#24384c'); roomFlat(ctx, u(49), F - 55.5, 4.5, 1.4, '#4f9a5f');
  for (const kx of [u(49.5), u(53.5)]) roomDot(ctx, kx, F - 47, 1, '#5a6a78');
  roomFlat(ctx, u(58), F - 52, 4, 1.6, '#34404c');  // the spool on its spindle, its weight written on its side, the stock fed in
  roomPart(ctx, roomRound(u(60), F - 57, 13, 13, 6.5), '#3a6a70', { top: 0.8, side: 1.2 }); roomPart(ctx, roomRound(u(64.5), F - 52.5, 4, 4, 2), '#2a3440', { top: 0 });
  for (const wy of [F - 48.4, F - 47.2]) roomFlat(ctx, u(62.5), wy, 3, 0.6, '#a09c8e');
  ctx.strokeStyle = roomTint('#4a7a80'); ctx.lineWidth = 0.6; roomSeg(ctx, [[u(61), F - 55], [u(59.8), F - 55.6]]);
  roomPart(ctx, roomRound(u(92), F - 37, 48, 37, 1.2), '#2c3c4c', { top: 0, side: 2, solid: 0.45 });
  for (let k = 0; k < 3; k++) { roomPart(ctx, roomRound(u(95), F - 34 + k * 11, 42, 9, 1), '#34465a', { top: 0.6, side: 1 }); roomFlat(ctx, u(112), F - 30.5 + k * 11, 8, 1.4, '#8796a5'); }
  // From the right wall in: the spares rack, its shelves and what is strapped on them; the bench's legs and the shelf under it.
  roomPart(ctx, roomRound(u(274), F - 86, 64, 86, 1), '#1c2a36', { top: 0, solid: 0.6 });
  roomPart(ctx, roomRound(u(273), F - 4, 66, 4, 1), '#2e3e4c', { top: 0.5 });
  for (const [sx, sw] of [[u(282), 5], [u(316), 4]]) roomFlat(ctx, sx, F - 2.8, sw, 0.8, '#3e4c5a');  // scuffs, where boots go
  for (const px of [u(274), u(334.5)]) roomPart(ctx, roomRound(px, F - 86, 3.5, 86, 1), '#2e3e4c', { top: 0, side: 1 });
  for (const [y, col] of [[F - 28, '#34485a'], [F - 52, '#4a4e44'], [F - 74, '#34485a']]) roomPart(ctx, roomRound(u(276), y, 60, 3, 0.8), col, { top: 0.6, under: 0.6 });
  roomPart(ctx, roomRound(u(276), F - 86, 60, 3.5, 0.8), '#34485a', { top: 0.6, under: 0.6 });
  for (const bx of [u(279), u(329)]) {  // the replacement shelf's printed brackets, their layers, and the tag on one
    roomPart(ctx, roomRound(bx, F - 49, 4, 4, 0.5), '#8a6a48', { top: 0.4 });
    for (const ly of [F - 47.8, F - 46.6]) roomFlat(ctx, bx + 0.4, ly, 3.2, 0.4, '#6a5038');
  }
  ctx.strokeStyle = '#6a6458'; ctx.lineWidth = 0.5; roomSeg(ctx, [[u(281.5), F - 45], [u(281.7), F - 44]]);
  roomPart(ctx, roomRound(u(280), F - 44, 3.5, 4.5, 0.6), '#9a9050', { top: 0.5 }); roomDot(ctx, u(281.75), F - 43, 0.5, '#4a4436');
  const box = (x, y, w, h, col, marks) => {  // a box of spares, its stencil as marks
    roomPart(ctx, roomRound(u(x), y, w, h, 1), col, { top: 0.8, side: 1.2 });
    for (let k = 0; k < marks; k++) roomFlat(ctx, u(x + 3 + k * 4), y + h / 2 - 1.5, 2.5, 3, '#7e7660');
  };
  const strap = y => { roomPart(ctx, roomRound(u(276), y, 60, 2.2, 0.6), '#5a5040', { top: 0.3 }); roomFlat(ctx, u(303), y - 0.6, 4, 3.4, '#8796a5'); };
  box(278, F - 22, 26, 18, '#4e4434', 4); box(306, F - 24, 27, 20, '#3e4a40', 3); strap(F - 15);
  roomPart(ctx, roomRound(u(279), F - 40, 18, 12, 2), '#4a5560', { top: 0.8, side: 1.2 }); roomFlat(ctx, u(296.5), F - 37, 2, 6, '#5a6672');  // the spare pump, its flange
  roomPart(ctx, roomRound(u(300), F - 37, 10, 9, 4.5), '#2e3036', { top: 0.5 }); roomDot(ctx, u(305), F - 32.5, 2, '#1a1c20');  // a coil of cable
  roomPart(ctx, `M ${u(313)} ${F - 34} L ${u(334)} ${F - 34} L ${u(332)} ${F - 28} L ${u(315)} ${F - 28} Z`, '#3e5068', { top: 0.6, side: 1 });  // the turret's spare feed tray
  strap(F - 37);
  for (const sx of [278, 293]) { roomPart(ctx, roomRound(u(sx), F - 66, 14, 14, 7), '#3a6a70', { top: 0.8, side: 1 }); roomPart(ctx, roomRound(u(sx + 5), F - 61, 4, 4, 2), '#2a3440', { top: 0 }); }
  box(310, F - 68, 24, 16, '#4e4434', 3); strap(F - 61);
  box(280, F - 82, 20, 8, '#3e4a40', 2);
  roomPart(ctx, roomRound(u(262), F - 37, 5, 37, 1), '#2a3644', { top: 0, side: -1, solid: 0.45 });
  roomPart(ctx, roomRound(u(200), F - 37, 5, 37, 1), '#2a3644', { top: 0, side: -1, solid: 0.45 });
  roomPart(ctx, roomRound(u(140), F - 12, 124, 2.5, 0.8), '#2a3644', { top: 0.5 });
  roomPart(ctx, roomRound(u(214), F - 24, 18, 12, 0.8), '#5a4a34', { top: 0.8, side: 1 }); roomFlat(ctx, u(217), F - 20, 8, 1, '#3a3022');  // the box for the next yard
  // The bench's top at the waist, the paint worn off its edge where hands go; on it the breech in pieces and the parts tray, and the vice.
  roomPart(ctx, roomRound(u(90), F - 41, 180, 4, 1.2), '#46505a', { top: 1, under: 0.8, solid: 0.5 });
  for (const [wx, ww] of [[150, 8], [178, 4], [226, 6]]) roomFlat(ctx, u(wx), F - 38.6, ww, 0.8, '#6a747c');
  roomPart(ctx, roomRound(u(128), F - 49, 24, 8, 2), '#3e444a', { top: 0.8, side: 1.2 });
  roomDot(ctx, u(132), F - 45, 2.2, '#1a1e22'); for (const lx of [u(140), u(145)]) roomFlat(ctx, lx, F - 49.6, 2.5, 1, '#2e3438');
  roomPart(ctx, roomRound(u(156), F - 45, 14, 4, 1.6), '#5a5e62', { top: 0.6 }); roomFlat(ctx, u(158), F - 43.6, 4, 0.8, '#3e4246');
  ctx.strokeStyle = '#7a8288'; ctx.lineWidth = 0.8; roomSeg(ctx, [[u(173), F - 42], [u(174.5), F - 44], [u(176), F - 42], [u(177.5), F - 44], [u(179), F - 42], [u(180.5), F - 44], [u(182), F - 42]]);
  roomPart(ctx, roomRound(u(186), F - 43.5, 20, 2.5, 0.6), '#2e3a44', { top: 0.4 });
  for (const [px, py, pw, ph] of [[188, F - 44.2, 3, 0.9], [192.5, F - 44.6, 2.2, 1.2], [196, F - 44.2, 3.5, 0.9], [201, F - 44.5, 1.2, 1.2]]) roomFlat(ctx, u(px), py, pw, ph, '#8e969e');
  roomPart(ctx, roomRound(u(238), F - 44, 18, 3, 0.8), '#4a5a4e', { top: 0.5 });
  roomPart(ctx, roomRound(u(239), F - 50, 7, 6, 0.8), '#4a5a4e', { top: 0.6, side: 0.8 });
  roomPart(ctx, roomRound(u(251), F - 49, 6, 5, 0.8), '#4a5a4e', { top: 0.6, side: 0.8 });
  roomPart(ctx, `M ${u(247.4)} ${F - 56} L ${u(249.4)} ${F - 56} L ${u(249.4)} ${F - 49} L ${u(247.4)} ${F - 49} Z`, '#7a7e82', { top: 0 });  // the bracket in its jaws
  for (const jx of [u(245.8), u(249.4)]) roomPart(ctx, roomRound(jx, F - 51, 1.6, 6, 0.4), '#6a6e70', { top: 0 });
  roomFlat(ctx, u(257), F - 47.5, 6, 1.2, '#8796a5'); roomFlat(ctx, u(262.4), F - 52, 1.2, 10, '#8796a5');  // its screw and its handle
  for (const ky of [F - 52.5, F - 42.5]) roomDot(ctx, u(263), ky, 1, '#5a6a78');
}

// The airlock (#933), on the lock deck beside the medbay across the well, where #940's inspector and junior come aboard; no routine sends anyone
// here (#973). From the hull wall in: the lock's chamber, two people wide. The outer door is in the hull, the room's left side wall, seen from inside
// as a heavy hatch dogged shut: its warning marks, its seal ring, the door with its wheel and dogs, scuffed at the sill. It is as tall as the room's
// name over it leaves at the smallest zoom (LOCK_OUTER), so a person stoops through it. The inner door is in the partition on the room side, from the
// cut back to the back wall, its face toward the eye as the head's door is: its frame and seal, the door shut with its window at the eye, its handle
// worn where hands go. On the wall beside it the cycle panel, an older plate with a newer unit bolted on: the cycle lamp over it, dark while the lock
// is idle, the pressure on both sides of the inner door, the cycle lever in a printed guard tagged temporary, the conduit down the wall tied. The
// floor in front of the inner door is clear, for the boarders. Then the bench by the airlock at the seated hip under a grab rail, tape over a split
// in its pad, the lamp over it; the suits on their rack, a person's size, one older and patched, a tag on each, their boots under them on the tray,
// the helmets on the shelf over them and a tether coiled on the post; at the well's wall the lockers for suit spares, one newer in another finish.
// Tie-down rings in the deck. No words: the marks, the tags and the plates are marks. Nothing under the room's name.
const LOCK_OUTER = 66, LOCK_LAMP = '#3e2a26';  // the outer door's ring, its top over the floor; the cycle lamp's lens, dark
function roomAirlock(ctx, r) {
  const F = r.floor, T = r.top, n = v => Math.round(v * 100) / 100, u = v => n(r.x0 + v), e = roomEye(r), I = (x, y, d) => roomInto(e, x, y, d).map(n);
  const wall = (px, py, fn) => { const ax = n(e.vx + (px - e.vx) / e.k), ay = n(e.vy + (py - e.vy) / e.k); roomOnWall(ctx, ax, ay, () => fn(ax, ay)); };  // fn draws round (ax, ay), which lands at (px, py)
  const on = (x, list) => `M ${list.map(([d, h]) => I(x, F - h, d).join(' ')).join(' L ')} Z`;  // a shape on a wall running back from the cut at x, its corners at [depth, height]
  const cham = (d0, d1, h0, h1, c) => [[d0, h0], [d1, h0], [d1, h1 - c], [d1 - c / 40, h1], [d0 + c / 40, h1], [d0, h1 - c]];  // a box on such a wall, its top corners cut
  const P = u(96), rail = (x, y, w) => {  // a grab rail on two brackets, centred on x
    for (const bx of [x - w / 2 + 2, x + w / 2 - 4]) roomFlat(ctx, bx, y - 2, 2, 4.5, '#2a3e54');
    roomPart(ctx, roomRound(n(x - w / 2), n(y - 1.5), w, 3, 1.5), '#3a5470', { top: 0.6, under: 0.8 });
  };
  // On the wall: a grab handle in the chamber, by the outer door; the cycle panel beside the inner door; the grab rail over the bench.
  wall(u(62), F - 48, (x, y) => {
    for (const by of [y - 13, y + 9]) roomFlat(ctx, x - 2, by, 4.5, 2, '#2a3e54');
    roomPart(ctx, roomRound(x - 1.5, y - 12, 3, 24, 1.5), '#3a5470', { top: 0.6, side: 0.8 });
  });
  wall(n(I(P, T, 1)[0] + 14), F - 58, (x, y) => {
    roomFlat(ctx, x + 6, y + 15, 2.4, 27, '#3a3a40');  // the conduit down the wall, tied
    for (const ty of [y + 24, y + 33]) roomFlat(ctx, x + 5.4, ty, 3.6, 1, '#1e2a36');
    roomPart(ctx, roomRound(x - 11, y - 15, 22, 32, 1), '#2e3a44', { top: 0.8, under: 0.8 });  // the older plate
    for (const [sx, sy] of [[x - 9, y - 13], [x + 9, y - 13], [x - 9, y + 15], [x + 9, y + 15]]) roomDot(ctx, sx, sy, 0.6, '#56708c');
    roomPart(ctx, roomRound(x - 9, y - 12, 18, 12, 1), '#3e4a54', { top: 0.6, side: 0.8 });  // the newer unit, its fresh bolts, the two gauges
    for (const [bx, by] of [[x - 8.6, y - 11.6], [x + 7.4, y - 11.6], [x - 8.6, y - 1.2], [x + 7.4, y - 1.2]]) roomFlat(ctx, bx, by, 1.2, 1.2, '#8a929a');
    for (const gx of [x - 4.3, x + 4.3]) roomGauge(ctx, gx, y - 6, 2.8, 0.62);
    roomPart(ctx, roomRound(x - 3.5, y - 23, 7, 7, 2), '#263a50', { top: 0.5, under: 0.8 });  // the cycle lamp, its lens dark while the lock is idle
    roomDot(ctx, x, y - 19.5, 2, LOCK_LAMP);
    ctx.strokeStyle = roomTint('#56626e'); ctx.lineWidth = 0.5; roomSeg(ctx, [[x - 2, y - 19.5], [x + 2, y - 19.5]]);
    roomFlat(ctx, x - 1, y + 3, 2, 10, '#141c24');  // the lever's slot, the lever, its printed guard with its layers and its tag
    roomPart(ctx, roomRound(x - 3, y + 3, 6, 3.5, 1), '#5e666e', { top: 0.5 });
    roomPart(ctx, `M ${n(x - 6)} ${n(y + 1)} L ${n(x - 4.6)} ${n(y + 1)} L ${n(x - 4.6)} ${n(y + 14)} L ${n(x + 4.6)} ${n(y + 14)} L ${n(x + 4.6)} ${n(y + 1)} L ${n(x + 6)} ${n(y + 1)} L ${n(x + 6)} ${n(y + 15.5)} L ${n(x - 6)} ${n(y + 15.5)} Z`, '#8a6a48', { top: 0.4 });
    for (const ly of [y + 6, y + 9.5]) roomFlat(ctx, x - 5.8, ly, 1, 0.4, '#6a5038');
    for (const ly of [y + 14.5, y + 15]) roomFlat(ctx, x - 4, ly, 8, 0.4, '#6a5038');
    ctx.strokeStyle = '#6a6458'; ctx.lineWidth = 0.5; roomSeg(ctx, [[x + 5.3, y + 15.5], [x + 5.5, y + 16.5]]);
    roomPart(ctx, roomRound(x + 3.8, y + 16.5, 3.5, 4.5, 0.6), '#9a9050', { top: 0.5 }); roomDot(ctx, x + 5.55, y + 17.5, 0.5, '#4a4436');
  });
  wall(u(172), F - 60, (x, y) => rail(x, y, 40));
  // The chamber's deck, a grating; the tie-down rings; scuffs at the outer door's sill.
  roomFace(ctx, [[u(1), F], [P, F], I(P, F, 1), I(r.x0 + 1, F, 1)], '#141e28');
  ctx.strokeStyle = '#24323e'; ctx.lineWidth = 0.5; ctx.beginPath();
  for (const d of [0.25, 0.5, 0.75]) { const [ax, ay] = I(r.x0 + 1, F, d), [bx, by] = I(P, F, d); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); }
  for (let x = 12; x < 96; x += 12) { const [bx, by] = I(u(x), F, 1); ctx.moveTo(u(x), F); ctx.lineTo(bx, by); }
  ctx.stroke();
  for (const x of [u(40), u(76), u(140), u(296)]) holdRing(ctx, x, F);
  for (const [sx, sw] of [[u(2), 4], [u(8), 5]]) roomFlat(ctx, sx, F - 2.4, sw, 0.8, '#4a4a40');
  // The outer door in the hull's wall: the warning marks striped round it, its seal ring, the seal, the door, its wheel, its dogs and hinges.
  const band = on(r.x0, cham(0.03, 0.97, 0, LOCK_OUTER + 2, 8));
  roomPart(ctx, band, '#5e5434', { top: 0 });
  ctx.save(); figPath(ctx, band); ctx.clip();
  for (let k = 0; k < 6; k++) { const d = 0.02 + k * 0.15; roomFace(ctx, [I(r.x0, F, d), I(r.x0, F, d + 0.06), I(r.x0, F - LOCK_OUTER - 2, d + 0.12), I(r.x0, F - LOCK_OUTER - 2, d + 0.06)], '#22201a'); }
  ctx.restore();
  roomPart(ctx, on(r.x0, cham(0.08, 0.92, 1, LOCK_OUTER, 7)), '#3a4450', { top: 0.6 });
  roomPart(ctx, on(r.x0, cham(0.12, 0.88, 4, LOCK_OUTER - 4, 6)), '#1a1e22', { top: 0 });
  roomPart(ctx, on(r.x0, cham(0.15, 0.85, 6, LOCK_OUTER - 6, 5)), '#4a5462', { top: 0.8 });
  const [wx, wy] = I(r.x0, F - 33, 0.5);
  ctx.strokeStyle = '#6a6e70'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.ellipse(wx, wy, 5.5, 10, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(wx - 5.5, wy); ctx.lineTo(wx + 5.5, wy); ctx.moveTo(wx, wy - 10); ctx.lineTo(wx, wy + 10); ctx.stroke();
  roomDot(ctx, wx, wy, 1.4, '#3a3e42');
  for (const [d, h] of [[0.18, 12], [0.18, 54], [0.82, 12], [0.82, 54]]) { const [dx, dy] = I(r.x0, F - h, d); roomFlat(ctx, dx - 1, dy - 1.5, 2, 3, '#7a7e82'); }
  for (const h of [18, 46]) { const [hx, hy] = I(r.x0, F - h, 0.87); roomFlat(ctx, hx - 0.6, hy - 2.5, 1.2, 5, '#56708c'); }
  // The partition from the cut back to the back wall, its face toward the room; the inner door's frame and seal, the door shut in it, its window,
  // its handle with the paint worn round it, its hinges; the frame's edge at the cut.
  roomFace(ctx, [[P, T], [P, F], I(P, F, 1), I(P, T, 1)], '#0e1b28', true);
  roomPart(ctx, on(P, cham(0, 0.94, 0, 90, 6)), '#2c3a48', { top: 0 });
  roomPart(ctx, on(P, cham(0.05, 0.9, 1.5, 87, 5)), '#1a1e22', { top: 0 });
  roomPart(ctx, on(P, cham(0.08, 0.87, 2, 85, 5)), '#3a4856', { top: 0.6 });
  roomPart(ctx, on(P, [[0.36, 58], [0.6, 58], [0.6, 74], [0.36, 74]]), '#56626e', { top: 0 });
  roomPart(ctx, on(P, [[0.4, 60], [0.56, 60], [0.56, 72], [0.4, 72]]), '#0e1a24', { top: 0 });
  for (const [d, h] of [[0.12, 46], [0.17, 41]]) { const [cx, cy] = I(P, F - h, d); roomFlat(ctx, cx - 0.6, cy - 1, 2.2, 2, '#56626e'); }  // the paint worn round the handle
  { const [hx, hy] = I(P, F - 44, 0.15); roomFlat(ctx, hx - 0.5, hy - 1.2, 3.2, 2.4, '#7a7e82'); roomFlat(ctx, hx + 0.6, hy - 5, 1.4, 4, '#5a6a78'); }
  for (const h of [14, 70]) { const [hx, hy] = I(P, F - h, 0.84); roomFlat(ctx, hx - 0.6, hy - 2, 1.2, 4, '#56708c'); }
  roomPart(ctx, on(P, [[0, 0], [0.94, 0], [0.94, 2], [0, 2]]), '#5e5434', { top: 0 });  // the sill, marked
  roomFlat(ctx, P - 1, T, 2, F - T, '#04080d');
  // From the well's wall in: the lockers for suit spares, the newer one in another finish; then the suit rack.
  [['#24425e', 0], ['#2a3e4e', 1]].forEach(([col, k]) => {
    const lx = u(323 - 21 * k);
    roomPart(ctx, roomRound(lx, F - 86, 21, 86, 1.2), col, { top: 1, side: -1, solid: 0.45 });
    for (let v = 0; v < 4; v++) roomFlat(ctx, lx + 4.5, F - 80 + v * 2.4, 12, 1, '#0f1f30');
    roomPart(ctx, roomRound(lx + 5.5, F - 68, 10, 5, 0.8), '#8a8270', { top: 0 }); roomFlat(ctx, lx + 7.5, F - 66, 2.5, 1, '#4a4436'); roomFlat(ctx, lx + 11, F - 66, 2.5, 1, '#4a4436');
    roomFlat(ctx, lx + 15.5, F - 50, 2.5, 8, '#8796a5');
    for (let v = 0; v < 4; v++) roomFlat(ctx, lx + 4.5, F - 14 + v * 2.4, 12, 1, '#0f1f30');
  });
  roomPart(ctx, roomRound(u(200), F - 5, 100, 5, 1), '#24384c', { top: 0.8, side: -1, solid: 0.45 });
  for (const px of [u(200), u(296)]) roomPart(ctx, roomRound(px, F - 84, 4, 79, 1), '#2e3e4c', { top: 0, side: 1 });
  roomPart(ctx, roomRound(u(198), F - 84, 104, 3, 0.8), '#34485a', { top: 0.6, under: 0.6 });
  roomPart(ctx, roomRound(u(204), F - 80, 92, 2, 1), '#56626e', { top: 0.5 });
  ctx.strokeStyle = '#7a6a3e'; ctx.lineWidth = 1; ctx.beginPath();  // a tether coiled on the post's hook, its snap hook
  for (let k = 0; k < 3; k++) ctx.ellipse(u(298), F - 54 + k * 1.2, 3.5, 6, 0, 0, Math.PI * 2);
  ctx.stroke(); roomFlat(ctx, u(297), F - 61, 2, 2, '#56708c'); roomFlat(ctx, u(297.4), F - 47.5, 1.6, 4, '#8796a5');
  [[u(221), '#505c68', '#5a6470'], [u(250), '#605642', '#605642'], [u(279), '#505c68', '#5a6470']].forEach(([cx, col, hcol], k) => {
    const S = (dx, h) => `${n(cx + dx)} ${n(F - h)}`;
    roomPart(ctx, `M ${S(-7, 84)} L ${S(-7, 90)} Q ${S(-7, 96)} ${S(0, 96)} Q ${S(7, 96)} ${S(7, 90)} L ${S(7, 84)} Z`, hcol, { top: 0.8, side: 1 });  // its helmet on the shelf
    roomPart(ctx, roomRound(n(cx - 4.5), F - 92, 9, 5.5, 2), '#1a2a36', { top: 0 }); roomFlat(ctx, cx - 3.5, F - 91, 2.5, 3.5, 'rgba(170,200,230,0.12)');
    ctx.strokeStyle = '#3a4652'; ctx.lineWidth = 0.8; roomSeg(ctx, [[cx, F - 80], [cx, F - 77]]);  // its hanger
    for (const g of [-1, 1]) roomPart(ctx, `M ${S(11.5 * g - 1.5, 73)} L ${S(11.5 * g + 1.5, 73)} L ${S(12.5 * g + 2, 44)} L ${S(12.5 * g - 2, 44)} Z`, col, { top: 0, side: 0.8 });  // its arms
    roomPart(ctx, `M ${S(-5, 77)} L ${S(5, 77)} Q ${S(10.5, 77)} ${S(10.5, 71)} L ${S(9.5, 46)} L ${S(9, 16)} L ${S(2, 16)} L ${S(1.2, 42)} L ${S(-1.2, 42)} L ${S(-2, 16)} L ${S(-9, 16)} L ${S(-9.5, 46)} L ${S(-10.5, 71)} Q ${S(-10.5, 77)} ${S(-5, 77)} Z`, col, { top: 1, side: 1.2 });
    for (const g of [-1, 1]) roomPart(ctx, roomRound(n(cx + 12.5 * g - 2.5), F - 45, 5, 5.5, 1.5), '#3a4048', { top: 0.4 });  // its gloves
    roomPart(ctx, roomRound(n(cx - 6), F - 78.5, 12, 3, 1), '#6a7480', { top: 0.6 });  // the neck ring
    roomPart(ctx, roomRound(n(cx - 5), F - 69, 10, 8, 1), '#3a4652', { top: 0.6, side: 0.8 });  // the chest unit, its controls
    roomDot(ctx, cx - 2, F - 65, 0.9, '#5a6a78'); roomDot(ctx, cx + 2, F - 65, 0.9, '#5a6a78');
    roomFlat(ctx, cx - 9.5, F - 48, 19, 2, figShade(col, 0.7));  // the waist ring
    roomPart(ctx, roomRound(n(cx + 3), F - 59, 4, 3, 0.4), '#8a8676', { top: 0 }); roomFlat(ctx, cx + 3.6, F - 58, 2.8, 0.4, '#5a5648');  // its tag, the date
    for (const dx of [-8.5, 2]) roomPart(ctx, `M ${S(dx, 12)} L ${S(dx + 6.5, 12)} L ${S(dx + 6.5, 7)} Q ${S(dx + 9, 7)} ${S(dx + 9, 5)} L ${S(dx, 5)} Z`, '#2e3438', { top: 0.5 });  // its boots
    if (k === 1) {  // the older suit: a patch on its knee in another shade, tape round its elbow
      roomPart(ctx, roomRound(n(cx + 2.5), F - 34, 6, 6, 1), '#4e5a4a', { top: 0 });
      for (const sx of [cx + 3.2, cx + 7.6]) for (const sy of [F - 33, F - 29.4]) roomDot(ctx, sx, sy, 0.3, '#3a3a30');
      roomPart(ctx, roomRound(n(cx - 13.5), F - 61, 5, 2.5, 0.5), '#7a7462', { top: 0 });
    }
  });
  // The bench by the airlock, its shadow on the strip, tape over a split in its pad.
  roomShadow(ctx, u(144), u(200), 0.25);
  roomBench(ctx, u(144), u(200), F);
  roomPart(ctx, roomRound(u(181), F - 23, 6, 4.5, 0.6), '#7a7462', { top: 0 });
}

// Life support (#933), the plant deck over the water tank, full width: two bays either side of the well, where the engineer's rounds bring them
// (ROUNDS, shiplife.js). Drawn from what the ship says of it (LIFE_LINES, the scenes): the air recycler holds the scrubber cartridges in a stack,
// its fans are logged one by one, the carbon dioxide figure is read off the panel by it, the condensate line runs under it, the dust filter is on
// the air intake, the fans are heard in the ducts, and the cabin pressure is written on the slate by the hatch. On the walls: the main air duct
// along the top of both, its risers down to the fans; in the left bay the drop to the air intake with its dust filter, the grey water line down
// from the decks over into the water recycler, the slate by the hatch with the cabin pressure gauge by it; in the right bay the panel over the
// fans at the eye, its readouts as marks and its alarm lamp, dark while all is well. Left bay from the hull wall in: the water recycler under the
// room's name, older, a newer filter canister bolted on, a replacement panel in another shade, its sight glass with the water in it and its
// gauge; its two pipes out of its side and down through the deck to the tank's top under the cut, each with its collar at the deck, one valve a
// wheel and the other a printed handle tagged temporary, tape on a joint. Then the bench at the waist, its cabinet, and the rack under it with the
// four spare cartridges strapped in; on its top the old dust filter, bagged. Right bay: the air recycler. From the well in its fan row at the
// waist, three fans with their grilles turning, the middle one newer in another finish on fresh bolts; at the hull wall the scrubber stack under a
// person's head, six cartridges in two columns, each dated, the handles worn, one bay empty and its cartridge out on the last fan, dated; its
// cable up into the ceiling, tied; scuffs at its foot; the condensate line under the fans, down through the deck, clamped. No words: the
// readouts, the tags and the slate are marks. Its lamps are fittings, one in each bay (LAMP_FITTED). Nothing under the room's name.
const LS_ALARM = '#3e2a26', LS_WATER = 'rgba(70,140,190,0.6)';  // the alarm lamp's lens, dark; the water in the sight glass, as the tank's
function roomLifeSupport(ctx, r, s) {
  const F = r.floor, T = r.top, n = v => Math.round(v * 100) / 100, plate = HULL.plate;
  const wall = (px, py, fn) => { const e = roomEyeAt(px) || roomEye(r), ax = n(e.vx + (px - e.vx) / e.k), ay = n(e.vy + (py - e.vy) / e.k); roomOnWall(ctx, ax, ay, () => fn(ax, ay)); };  // fn draws round (ax, ay), which lands at (px, py)
  const pipe = (x, y0, y1, th = 4) => roomPart(ctx, roomRound(n(x - th / 2), y0, th, n(y1 - y0), 1), '#36506a', { top: 0, side: 1 });
  const run = (x0, x1, y, th = 4) => roomPart(ctx, roomRound(x0, n(y - th / 2), n(x1 - x0), th, 1), '#36506a', { top: 0.8, under: 0.8 });
  const cart = (x, y, dated = true) => {  // a scrubber cartridge, 40 by 14: its end caps, its pull handle worn bright, its date tag
    roomPart(ctx, roomRound(x, y, 40, 14, 1.5), '#4e5a50', { top: 0.8, under: 0.8 });
    for (const cx of [x + 1, x + 36]) roomPart(ctx, roomRound(cx, y + 1, 3, 12, 0.8), '#3a423c', { top: 0 });
    roomPart(ctx, roomRound(x + 14, y + 5.5, 12, 3, 1), '#5e666e', { top: 0.5 }); roomFlat(ctx, x + 15, y + 6, 2, 1.2, '#6a747c');
    if (dated) { roomPart(ctx, roomRound(x + 29, y + 3, 5, 4, 0.4), '#8a8676', { top: 0 }); roomFlat(ctx, x + 29.6, y + 4.5, 3.6, 0.5, '#5a5648'); }
  };
  // On the left bay's wall: the main air duct along the top, its flanges, tape on a joint, the drop to the air intake and its dust filter.
  wall(225, F - 80, (x, y) => {
    roomPart(ctx, roomRound(x - 85, y - 5, 169, 10, 2), '#2e4458', { top: 1, under: 1.2 });
    for (let k = 0; k < 5; k++) roomPart(ctx, roomRound(x - 84 + k * 41, y - 6, 2.4, 12, 0.6), '#3a5266', { top: 0.5 });
    roomPart(ctx, roomRound(x + 38.5, y - 5.5, 6, 11, 0.5), '#7a7462', { top: 0 });
    roomPart(ctx, roomRound(x - 31, y + 5, 12, 10, 1), '#2e4458', { top: 0, side: 1 });
    roomPart(ctx, roomRound(x - 37, y + 14, 24, 14, 1.2), '#3a4440', { top: 0.8, under: 0.8 });
    roomPart(ctx, roomRound(x - 35, y + 16.5, 20, 9, 0.5), '#6a6a5a', { top: 0 });
    for (let k = 0; k < 6; k++) roomFlat(ctx, x - 33.5 + k * 3.2, y + 17.5, 0.6, 7, '#4e4e42');
    roomFlat(ctx, x - 26, y + 25.5, 4, 1.4, '#4e4e42');  // its pull tab
  });
  // The grey water line down from the decks over, along the wall and into the water recycler's back.
  wall(160, F - 66, (x, y) => {
    roomPipe(ctx, [x, y - 29], [x, y + 2], 14, 4); roomPipe(ctx, [x - 90, y], [x + 2, y], 30, 4); roomPipe(ctx, [x - 90, y - 2], [x - 90, y + 4], 10, 4);
  });
  // The slate by the hatch, the cabin pressure written on it in chalk; the cabin pressure gauge beside it.
  wall(298, F - 58, (x, y) => {
    roomPart(ctx, roomRound(x - 9, y - 11, 18, 22, 1), '#2a302c', { top: 0.6, under: 0.6 });
    for (let k = 0; k < 4; k++) roomFlat(ctx, x - 6, y - 7 + k * 4.5, 8 - (k % 2) * 3, 0.8, '#7a7c74');
    roomGauge(ctx, x - 17, y - 6, 3.5, 0.5);
  });
  // On the right bay's wall: the main duct, its flanges, the risers down to the first two fans; the panel over the fans with its readouts and the
  // alarm lamp, dark.
  wall(548, F - 80, (x, y) => {
    roomPart(ctx, roomRound(x - 136, y - 5, 271, 10, 2), '#2e4458', { top: 1, under: 1.2 });
    for (let k = 0; k < 7; k++) roomPart(ctx, roomRound(x - 134 + k * 44.5, y - 6, 2.4, 12, 0.6), '#3a5266', { top: 0.5 });
    for (const rx of [x - 111, x - 55]) { roomPart(ctx, roomRound(rx, y + 5, 10, 25, 1), '#2e4458', { top: 0, side: 1.2 }); roomPart(ctx, roomRound(rx - 1, y + 14, 12, 2.4, 0.6), '#3a5266', { top: 0.5 }); }
  });
  wall(470, F - 62, (x, y) => {
    roomPart(ctx, roomRound(x - 19, y - 12, 38, 25, 1), '#2a3844', { top: 0.8, under: 0.8 });
    for (const [sx, sy] of [[x - 17, y - 10], [x + 17, y - 10], [x - 17, y + 11], [x + 17, y + 11]]) roomDot(ctx, sx, sy, 0.6, '#56708c');
    roomPart(ctx, roomRound(x - 15, y - 9, 22, 7, 0.6), '#0c161e', { top: 0 });  // the carbon dioxide figure, as marks
    for (let k = 0; k < 3; k++) roomFlat(ctx, x - 13 + k * 4.5, y - 7.5, 3, 4, '#3e6a48');
    roomPart(ctx, roomRound(x - 15, y + 0, 10, 9, 0.6), '#0c161e', { top: 0 }); roomPart(ctx, roomRound(x - 3, y + 0, 10, 9, 0.6), '#0c161e', { top: 0 });  // the fans, the water
    roomFlat(ctx, x - 13.5, y + 4, 7, 3.5, '#3e6a48'); roomFlat(ctx, x - 1.5, y + 2.5, 7, 5, '#3a5a72');
    roomPart(ctx, roomRound(x + 9.5, y - 9.5, 7, 7, 2), '#263a50', { top: 0.5, under: 0.8 }); roomDot(ctx, x + 13, y - 6, 2, LS_ALARM);  // the alarm lamp, dark
    for (const kx of [x + 10.5, x + 15.5]) roomDot(ctx, kx, y + 4.5, 1, '#5a6a78');
  });
  // The left bay, from the hull wall in: the water recycler on its plinth, its sight glass, its gauge, the replacement panel, its vents, the newer
  // canister bolted on; its pipes out of its side and down through the deck, collared, one valve a wheel, the other a printed handle, tagged.
  roomPart(ctx, roomRound(14, F - 5, 106, 5, 1), '#24323e', { top: 0.6, solid: 0.45 });
  roomPart(ctx, roomRound(12, F - 62, 110, 57, 2), '#3a4a52', { top: 1.2, side: 1.5, solid: 0.45, shadow: false });
  roomPart(ctx, roomRound(21, F - 56, 10, 46, 2), '#2a3640', { top: 0.5 });
  roomPart(ctx, roomRound(23.5, F - 53, 5, 40, 1.5), '#0e1a24', { top: 0 });
  roomFlat(ctx, 24, F - 34, 4, 20.5, LS_WATER);
  for (let k = 0; k < 4; k++) roomFlat(ctx, 29, F - 50 + k * 10, 1.6, 0.5, '#8796a5');
  roomGauge(ctx, 44, F - 48, 4.5, 0.55);
  roomPart(ctx, roomRound(54, F - 52, 34, 30, 1), '#44505a', { top: 0.6, side: 0.8 });
  for (const [sx, sy] of [[56, F - 50], [86, F - 50], [56, F - 24], [86, F - 24]]) roomDot(ctx, sx, sy, 0.6, '#8796a5');
  roomPart(ctx, roomRound(60, F - 46, 12, 6, 0.6), '#8a8676', { top: 0 }); for (let k = 0; k < 2; k++) roomFlat(ctx, 61.5, F - 44.5 + k * 2, 8, 0.5, '#5a5648');
  for (let k = 0; k < 4; k++) roomFlat(ctx, 38, F - 18 + k * 2.6, 46, 1, '#1c262e');
  roomPart(ctx, roomRound(93, F - 58, 4, 40, 0.8), '#2a3640', { top: 0 });  // the canister's bracket, its fresh bolts, the canister
  roomPart(ctx, roomRound(97, F - 56, 20, 36, 5), '#4a5a62', { top: 1, side: 1.2 });
  for (const by of [F - 50, F - 26]) { roomPart(ctx, roomRound(96, by, 22, 3, 0.8), '#3a4852', { top: 0.4 }); for (const bx of [96.6, 116.2]) roomFlat(ctx, bx, by + 0.9, 1.2, 1.2, '#8a929a'); }  // its straps, bolted fresh
  run(121, 134, F - 30); pipe(132, F - 32, F + plate);
  run(121, 146, F - 46); pipe(144, F - 48, F + plate);
  for (const x of [132, 144]) roomPart(ctx, roomRound(x - 4, F - 2, 8, 3, 0.8), '#4f6f8f', { top: 0.5 });
  roomValve(ctx, 132, F - 18, 4);
  roomFlat(ctx, 143, F - 34, 2, 3, '#56626e');  // the drain's valve: the stem, the printed handle with its layers, its tag on a tie
  roomPart(ctx, roomRound(141, F - 39, 11, 5, 1), '#8a6a48', { top: 0.5 });
  for (const lx of [F - 37.6, F - 36]) roomFlat(ctx, 142, lx, 9, 0.4, '#6a5038');
  ctx.strokeStyle = roomTint('#6a6458'); ctx.lineWidth = 0.5; roomSeg(ctx, [[151, F - 34], [151.5, F - 32]]);
  roomPart(ctx, roomRound(149.5, F - 32, 4, 5, 0.6), '#9a9050', { top: 0.5 }); roomDot(ctx, 151.5, F - 31, 0.5, '#4a4436');
  roomPart(ctx, roomRound(129.5, F - 12, 5, 4, 0.5), '#7a7462', { top: 0 });  // tape on a joint
  // The bench at the waist: the rack under its right end, its shelves, the four spares strapped in; its cabinet; its top, the bagged filter on it.
  roomPart(ctx, roomRound(244, F - 4, 92, 4, 1), '#2a3846', { top: 0.5, solid: 0.45 });
  for (const px of [244, 332]) roomPart(ctx, roomRound(px, F - 38, 4, 34, 0.8), '#2a3644', { top: 0, side: 1 });
  roomPart(ctx, roomRound(246, F - 21, 88, 2.4, 0.6), '#34485a', { top: 0.5 });
  for (const [cx, cy] of [[248, F - 18], [290, F - 18], [248, F - 35.4], [290, F - 35.4]]) cart(cx, cy);
  for (const sy of [F - 12, F - 29.4]) roomPart(ctx, roomRound(246, sy, 88, 2, 0.6), '#5a5040', { top: 0 });
  roomPart(ctx, roomRound(170, F - 38, 72, 38, 1.2), '#2c3a46', { top: 0, side: 1.2, solid: 0.45 });
  for (let k = 0; k < 2; k++) { roomPart(ctx, roomRound(174, F - 34 + k * 16, 64, 13, 1), '#34465a', { top: 0.6, side: 1 }); roomFlat(ctx, 200, F - 29 + k * 16, 12, 1.4, '#8796a5'); }
  roomPart(ctx, roomRound(166, F - 42, 172, 4, 1), '#46525a', { top: 0.8, solid: 0.5, shadow: false });
  for (const [wx, ww] of [[214, 6], [262, 4], [300, 5]]) roomFlat(ctx, wx, F - 42, ww, 0.8, '#6a747c');  // the paint worn off its edge
  roomAtDepth(ctx, 190, F - 42, 0.3, () => {
    roomPart(ctx, `M 178 ${F - 42} L 179 ${F - 47} Q 186 ${F - 50} 196 ${F - 48} L 203 ${F - 47} L 202 ${F - 42} Z`, '#5a5e56', { top: 0.6 });
    roomFlat(ctx, 200.5, F - 48.5, 1.4, 3, '#3a3a34');
  });
  // The right bay: the air recycler. Its fan row from the well in, on an old base rail: the first two fans, then from the hull wall in the
  // scrubber stack, then the fan by the eye joined to the stack; the condensate line under it; the cartridge out on it.
  const fan = (x, col, k) => {
    roomPart(ctx, roomRound(x, F - 44, 70, 38, 1.5), col, { top: 1, side: 1.2, solid: 0.45, shadow: false });
    const cx = x + 26, cy = F - 25;
    roomDot(ctx, cx, cy, 12, '#141c22');
    ctx.strokeStyle = roomTint('#4a5662'); ctx.lineWidth = 3;
    for (let b = 0; b < 3; b++) { const a = s.time * (7 + k) + k + b * 2.094; roomSeg(ctx, [[cx, cy], [cx + Math.cos(a) * 9.5, cy + Math.sin(a) * 9.5]]); }
    ctx.strokeStyle = roomTint('#56626e'); ctx.lineWidth = 0.6; ctx.beginPath();
    for (const g of [-8, -4, 0, 4, 8]) { const h = Math.sqrt(144 - g * g); ctx.moveTo(cx + g, cy - h); ctx.lineTo(cx + g, cy + h); }
    ctx.stroke();
    ctx.strokeStyle = roomTint('#26323c'); ctx.lineWidth = 1.8; ctx.beginPath(); ctx.arc(cx, cy, 12, 0, Math.PI * 2); ctx.stroke();
    roomDot(ctx, cx, cy, 1.8, '#3a4652');
    roomPart(ctx, roomRound(x + 44, F - 40, 22, 28, 1), '#2e3a46', { top: 0.5 });  // its service plate, its log card, its run lamp
    for (const [sx, sy] of [[x + 46, F - 38], [x + 64, F - 38], [x + 46, F - 14], [x + 64, F - 14]]) roomDot(ctx, sx, sy, 0.5, '#56708c');
    roomFlat(ctx, x + 48, F - 34, 14, 1, '#5a6a78'); roomFlat(ctx, x + 48, F - 31, 10, 1, '#5a6a78');
    roomDot(ctx, x + 55, F - 20, 1.3, '#3e6a48');
    if (col === '#4a5660') for (const [bx, by] of [[x + 1.5, F - 42.5], [x + 67, F - 42.5], [x + 1.5, F - 9], [x + 67, F - 9]]) roomFlat(ctx, bx, by, 1.4, 1.4, '#8a929a');  // the newer one's fresh bolts
  };
  roomPart(ctx, roomRound(381, F - 6, 211, 6, 1), '#24323e', { top: 0.6, solid: 0.45 });
  for (const bx of [384, 450, 520, 586]) roomDot(ctx, bx, F - 3, 0.7, '#56708c');
  fan(381, '#3a4652', 0); fan(451, '#4a5660', 1);
  roomPart(ctx, roomRound(598, F - 5, 106, 5, 1), '#24323e', { top: 0.6, solid: 0.5 });
  roomPart(ctx, roomRound(596, F - 86, 110, 81, 2), '#34424e', { top: 1, side: -1.5, solid: 0.5, shadow: false });
  roomPart(ctx, roomRound(602, F - 83, 98, 16, 1), '#3c4a56', { top: 0.6, under: 0.6 });
  for (let k = 0; k < 8; k++) roomFlat(ctx, 608 + k * 11, F - 79, 6, 1, '#1c262e');
  for (let k = 0; k < 8; k++) roomFlat(ctx, 608 + k * 11, F - 74, 6, 1, '#1c262e');
  for (const [sx, sy] of [[604, F - 81], [698, F - 81], [604, F - 69], [698, F - 69]]) roomDot(ctx, sx, sy, 0.6, '#8796a5');
  [[0, 0], [1, 0], [0, 1], [1, 1], [0, 2], [1, 2]].forEach(([c, row]) => {
    const bx = 603 + c * 50, by = F - 65 + row * 19;
    roomPart(ctx, roomRound(bx - 2, by - 1.5, 44, 17, 1), '#2a3640', { top: 0 });
    if (c === 0 && row === 0) { roomPart(ctx, roomRound(bx, by, 40, 14, 1), '#0e161c', { top: 0 }); for (const ry of [by + 3, by + 10]) roomFlat(ctx, bx + 2, ry, 36, 0.8, '#3a4652'); }  // the empty bay, its rails
    else { cart(bx, by); roomFlat(ctx, bx + 13, by + 5, 2, 1, '#6a747c'); }
  });
  ctx.strokeStyle = roomTint('#3a3a40'); ctx.lineWidth = 1.2; roomSeg(ctx, [[702, F - 86], [702, F - 92], [709, F - 96], [709, T + 1]]);  // its cable up into the ceiling, tied
  for (const ty of [F - 90.5, T + 6]) roomFlat(ctx, 700.5, ty, 3, 1, '#1e2a36');
  roomFlat(ctx, 707.5, T + 9, 3, 1, '#1e2a36');
  for (const [sx, sw] of [[606, 5], [624, 4], [668, 6]]) roomFlat(ctx, sx, F - 7, sw, 0.8, '#3e4c5a');  // scuffs where boots go
  fan(521, '#3a4652', 2);
  roomPart(ctx, roomRound(590, F - 36, 8, 14, 1), '#2e4256', { top: 0.5, under: 0.6 });  // the fan's duct into the stack
  pipe(566, F - 14, F + plate, 3.5);  // the condensate line under it, down through the deck, its clamp
  roomPart(ctx, roomRound(563, F - 2.5, 6, 3, 0.6), '#6a6e70', { top: 0.4 });
  roomAtDepth(ctx, 566, F - 44, 0.15, () => cart(549, F - 58));  // the cartridge out, on the last fan, the date on it
}

// The lamp: a pool of light mixing red (burn), warm (cruise) and a pulsing amber (flip), dimmed at night unless the room keeps its lights.
// A ceiling lamp's fitting (#1024, look.md rule 5): its base plate on the ceiling's sliver from the cut back to the wall (e, the bay's eye), the
// housing hung from it at the cut, the lens lit in the lamp's colour (lit) and a wire guard over the lens.
function roomLampFitting(ctx, x, top, lit, e) {
  const a = roomInto(e, x - 9, top), b = roomInto(e, x + 9, top);
  ctx.beginPath(); ctx.moveTo(x - 12, top); ctx.lineTo(x + 12, top); ctx.lineTo(b[0], b[1]); ctx.lineTo(a[0], a[1]); ctx.closePath(); ctx.fillStyle = '#22364c'; ctx.fill();
  roomPart(ctx, roomRound(x - 12, top, 24, 3, 1), '#3a4a5a', { top: 0, under: 1 });
  roomFlat(ctx, x - 10, top + 3, 20, 2.5, lit);
  ctx.strokeStyle = '#6a7a8a'; ctx.lineWidth = 0.6; ctx.strokeRect(x - 10.5, top + 3, 21, 3.4);
  ctx.beginPath(); for (const gx of [x - 5, x, x + 5]) { ctx.moveTo(gx, top + 3); ctx.lineTo(gx, top + 6.4); } ctx.stroke();
  for (const sx of [x - 10, x + 10]) roomDot(ctx, sx, top + 1.5, 0.6, '#56708c');
}
// fitted: the bays of a room whose lamps are drawn as fittings (roomLampFitting) rather than plain strips; at: where its lamps are (roomLamps).
// Where a room's ceiling lamps are, in world x: a third and two thirds of the way across a wide room, its middle in a narrow one; the bridge's
// aft lamp over the aft post, clear of the overhead panel and the COMMS label (#1024).
// The medbay's lamp is over the cot's foot end, clear of the scanner arm's mount on the ceiling.
const roomLamps = (id, r) => { const W = r.x1 - r.x0; return (id === 'bridge' && W > 380 ? [0.11, 2 / 3] : W > 380 ? [1 / 3, 2 / 3] : id === 'medbay' ? [0.6] : [1 / 2]).map(f => r.x0 + W * f); };
function drawPhaseLight(ctx, r, w, time, night, keepsLights, fitted = null, at = roomLamps('', r)) {
  const lamp = roomMix([[255, 90, 70], [255, 226, 184], [255, 176, 48]], [w.burn, w.cruise, w.flip]);
  const pulse = 1 - w.flip * 0.35 * (0.5 + 0.5 * Math.sin(time * 6)), dim = keepsLights ? 1 : 1 - 0.7 * night, W = r.x1 - r.x0;
  ctx.save(); ctx.beginPath(); ctx.rect(r.x0, r.top, W, r.floor - r.top); ctx.clip();
  for (const x of at) {
    const g = ctx.createRadialGradient(x, r.top, 2, x, r.top, 160);
    g.addColorStop(0, `rgba(${lamp},${0.2 * pulse * dim})`); g.addColorStop(1, `rgba(${lamp},0)`); ctx.fillStyle = g; ctx.fillRect(x - 160, r.top, 320, r.floor - r.top);
    const lit = `rgba(${lamp},${0.4 + 0.6 * dim})`, bay = fitted && fitted.find(q => x >= q.x0 && x <= q.x1);
    if (bay) roomLampFitting(ctx, x, r.top, lit, roomEye(bay)); else roomBox(ctx, x - 12, r.top, 24, 3, lit);
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

// Where a room's name is written (#933): 13px on its plate (shiplife.js), 12 in from its left wall, the plate's top 8 under the ceiling, clear of
// the lamps' fittings over it and over the head of anyone standing in the room where the plate is short enough. x and y are the text's start and
// baseline, in world units at the zoom.
const ROOM_NAME_TOP = 8;
const roomNameAt = (r, zoom) => ({ x: r.x0 + 12, y: r.top + ROOM_NAME_TOP + 13 / zoom });
const ROOM_DRAW = { engine: roomEngine, berths: roomBerths, galley: roomGalley, gunnery: roomGunnery, bridge: roomBridge, hold: roomHold, medbay: roomMedbay,
  head: roomHead, workshop: roomWorkshop, airlock: roomAirlock, lifesupport: roomLifeSupport };
// A room, r = { x0, x1, top, floor } in world units, drawn for the state s (w, time, zoom, spin, still, berths, cargo, torpedoes, fuel, burning, night,
// asleep, well, and shell: how a bay's shell is drawn, the burn view's cache): walls, props, then its lamp.
// Which way someone on a room's chair faces (#985): the bridge's and the guns' toward their consoles, the chair's back behind them (#933), the
// medbay's stool toward the cot. The galley's bench is not here: at the mess table people face you.
const SEAT_FACE = { bridge: 1, gunnery: -1, medbay: -1 };
const LAMP_FITTED = ['bridge', 'berths', 'medbay', 'hold', 'gunnery', 'engine', 'head', 'workshop', 'airlock', 'lifesupport'];  // the rooms in the box whose ceiling lamps are fittings so far (#1024)
function drawRoom(ctx, id, r, s) {
  if (s.still) s = { ...s, time: 0 };  // reduced motion: the clock stops, so nothing sways, floats, scrolls or pulses
  const W = r.x1 - r.x0;
  roomWalls(ctx, r, s.w, s.time, s.still, s.well, s.shell);
  roomIn(roomBays(r, s.well), () => {  // its props and seats see their bay's eye (#1024)
    ROOM_DRAW[id](ctx, r, s, sh => r.x0 + W * sh, W);
    const seats = SEATS[id] || [];  // its seats (shiplife.js), where people sit (#925): the galley's on one bench along the mess table, a pilot's seat at each post of the bridge, a stool anywhere else
    if (id === 'galley' && seats.length) roomBench(ctx, r.x0 + W * seats[0] - 14, r.x0 + W * seats[seats.length - 1] + 14, r.floor, true);
    else if (id === 'bridge') for (const f of seats) roomBridgeSeat(ctx, Math.round((r.x0 + W * f) * 100) / 100, r.floor);  // a pilot's seat at each post (#933)
    else for (const f of seats) roomStool(ctx, r.x0 + W * f, r.floor, id === 'medbay' ? 0 : SEAT_FACE[id] || 0);  // a station's chair faces its console (#933); the medbay's is a stool
  });
  const marked = !!(s.damage && s.damage.marks.has(id));
  if (marked) drawDamage(ctx, r, s);
  if (!(marked && s.damage.severe && Math.floor(s.time * 11) % 4 === 0)) drawPhaseLight(ctx, r, s.w, s.time, s.night, id === 'bridge' || id === 'engine', LAMP_FITTED.includes(id) ? roomBays(r, s.well) : null, roomLamps(id, r));  // severe damage: the lamp flickers
}
