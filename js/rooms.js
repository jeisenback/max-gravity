'use strict';

// The burn view's rooms (#living-ship): each room of the cutaway drawn lived-in under a low ceiling, its props answering the phase of
// the burn (weights from phaseWeights in burnpanel.js). A room is r = { x0, x1, top, floor } in world units: props sit at a share of
// its width and are measured up from its floor (the ceiling is 100 above it). Pure drawing: no state read, no randomness, motion
// comes from s.time. Loaded after camera.js; the bulkheads and the hull are the caller's.

const roomFont = '"Chakra Petch", ui-sans-serif, sans-serif';
const roomStars = Array.from({ length: 14 }, (_, k) => [Math.sin(k * 12.9898) * 0.5 + 0.5, Math.sin(k * 78.233) * 0.5 + 0.5, (k % 3) * 0.4 + 0.6]);
const roomBox = (ctx, x, y, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(x, y, w, h); };
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

// A crash couch: deployed (lies back on the floor) or stowed as a slab on the wall.
function roomCouch(ctx, x, F, up) {
  if (up) {
    ctx.save(); ctx.translate(x, F - 18); ctx.rotate(-0.9); roomBox(ctx, -11, -62, 9, 66, '#23405e'); roomBox(ctx, -12, -66, 10, 8, '#2c4c6e'); ctx.restore();
    roomBox(ctx, x - 8, F - 19, 34, 7, '#23405e'); roomBox(ctx, x + 22, F - 24, 8, 12, '#23405e'); roomBox(ctx, x + 4, F - 12, 6, 12, '#1a3048'); roomBox(ctx, x - 4, F - 3, 24, 3, '#1a3048');
  } else { roomBox(ctx, x - 34, F - 96, 12, 72, '#1d3550'); roomBox(ctx, x - 34, F - 78, 12, 2, '#12233a'); roomBox(ctx, x - 34, F - 46, 12, 2, '#12233a'); }
}
function roomStool(ctx, x, F, back) {
  roomBox(ctx, x - 10, F - 18, 20, 4, '#2a4664'); roomBox(ctx, x - 2, F - 14, 4, 14, '#1c3249'); roomBox(ctx, x - 8, F - 3, 16, 3, '#1c3249');
  if (back) roomBox(ctx, x - 14 * back, F - 54, 5 * back, 38, '#2a4664');
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
  roomBox(ctx, x0, top, x1 - x0, F - top, '#0c1826');
  ctx.fillStyle = '#0e1c2c'; for (let x = x0; x < x1 - 40; x += 48) ctx.fillRect(x + 2, top + 14, 44, F - top - 34);
  for (let x = x0; x < x1; x += 48) { roomBox(ctx, x, top, 2, F - top, '#132538'); roomDot(ctx, x + 5, top + 16, 0.9, '#21384f'); roomDot(ctx, x + 5, F - 22, 0.9, '#21384f'); }
  roomBox(ctx, x0, F, x1 - x0, HULL.plate, '#132438'); ctx.fillStyle = '#1b3047'; for (let x = x0 + 4; x < x1 - 4; x += 10) ctx.fillRect(x, F + 2, 5, 2);
  const sag = 9 * w.burn + 4 * w.cruise + (still ? -2 : -2 + Math.sin(time * 0.9 + x0) * 3) * w.flip;
  ctx.strokeStyle = '#2b4462'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(x0 + 6, top + 6); ctx.quadraticCurveTo((x0 + x1) / 2, top + 6 + sag, x1 - 6, top + 6); ctx.stroke();
  ctx.strokeStyle = '#3a2f22'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x0 + 6, top + 10); ctx.quadraticCurveTo((x0 + x1) / 2, top + 10 + sag * 0.7, x1 - 6, top + 10); ctx.stroke();
}

// Each room: (ctx, r, s, X, W) with X(share) the world x at that share of the width. A prop that does not fit the width is dropped, last listed first.
function roomEngine(ctx, r, s, X, W) {
  const { w, time } = s, F = r.floor, top = r.top, deckY = F - (HULL.deck + HULL.plate), rx = X(0.5);
  const hot = (s.burning ? 0.55 : 0.25) + 0.45 * w.burn + 0.1 * Math.sin(time * 4) * w.burn;
  const core = w.burn > 0.5 ? '255,140,60' : w.flip > 0.5 ? '255,176,48' : '90,150,220';
  roomBox(ctx, rx - 40, top + 6, 80, F - top - 6, '#22384e'); for (let y = top + 20; y < F; y += 40) roomBox(ctx, rx - 40, y, 80, 5, '#2c4c6e');
  const g = ctx.createRadialGradient(rx, (top + F) / 2, 4, rx, (top + F) / 2, 120); g.addColorStop(0, `rgba(${core},${0.35 * hot})`); g.addColorStop(1, `rgba(${core},0)`); ctx.fillStyle = g; ctx.fillRect(rx - 120, top + 8, 240, F - top - 8);
  roomBox(ctx, rx - 12, top + 40, 24, F - top - 80, `rgba(${core},${0.35 + 0.5 * hot})`); roomBox(ctx, rx - 16, top + 36, 32, 4, '#3d5a7a'); roomBox(ctx, rx - 16, F - 40, 32, 4, '#3d5a7a');
  ctx.strokeStyle = '#3d5a7a'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(rx + 40, top + 30); ctx.quadraticCurveTo(rx + 94, top + 30, X(0.98), top + 16); ctx.stroke();
  worldText(ctx, s.zoom, 'REACTOR', rx - 36, F - 14, 10, '#c9a227');
  if (W >= 200) {
    const cx = X(0.62), cw = W * 0.34;
    roomBox(ctx, cx, deckY, cw, 5, '#2a4664'); ctx.fillStyle = '#0c1826'; for (let x = cx + 4; x < cx + cw - 4; x += 8) ctx.fillRect(x, deckY + 1, 4, 3);
    ctx.strokeStyle = '#4a6a8a'; ctx.lineWidth = 1.5; roomSeg(ctx, [[cx + 2, deckY - 26], [cx + cw, deckY - 26]]); for (const x of [cx + 2, cx + cw / 2, cx + cw]) roomSeg(ctx, [[x, deckY - 26], [x, deckY]]);
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

// Bunk k of n in the berths room r, in two tiers: its left end x, its width w, and y the bottom of its frame (the mattress lies on it, 5 deep).
// The berths draw their bunks here, and the cutaway lays its sleepers on them (shiplife.js).
function berthBunk(r, n, k) {
  const cols = Math.max(1, Math.ceil(n / 2)), w = Math.min(70, (r.x1 - r.x0) * 0.5 / cols);
  return { x: r.x0 + (r.x1 - r.x0) * 0.02 + Math.floor(k / 2) * w, w, y: k % 2 ? r.floor - 56 : r.floor - 8 };
}

function roomBerths(ctx, r, s, X, W) {
  const { w, time } = s, F = r.floor, n = Math.min(12, s.berths), cols = Math.max(1, Math.ceil(n / 2)), { x: bx0, w: cw } = berthBunk(r, n, 0);
  for (let c = 0; c <= cols; c++) roomBox(ctx, bx0 + c * cw - 2, F - 96, 4, 96, '#2a4664');
  for (let k = 0; k < n; k++) {
    const { x: bx, y } = berthBunk(r, n, k);
    roomBox(ctx, bx, y, cw, 8, '#1f3a56'); roomBox(ctx, bx + 2, y - 5, cw - 4, 5, '#3a4a5e'); roomBox(ctx, bx + 3, y - 9, 12, 4, '#d8d2c4');
    if (k < s.asleep) roomBox(ctx, bx + 16, y - 9, cw - 20, 5, '#334560');
  }
  if (W >= 220 && n >= 3) {
    const bx = bx0 + cw; roomBox(ctx, bx + 3, F - 50, cw - 6, 42, '#4a3a5a'); for (const sx of [bx + 10, bx + cw - 12]) roomBox(ctx, sx, F - 50, 3, 42, '#1a1a1a');
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
  roomCouch(ctx, X(0.93), F, false);  // stowed: in the hard burn the cutaway deploys one under each person (shiplife.js)
}

function roomGalley(ctx, r, s, X, W) {
  const { w, time } = s, F = r.floor, lw = Math.min(130, W * 0.3);
  roomBox(ctx, X(0.02), F - 98, lw, 22, '#1c3249'); for (const dx of [4, lw / 2 + 2]) roomBox(ctx, X(0.02) + dx, F - 95, lw / 2 - 8, 16, '#16293d');
  worldText(ctx, s.zoom, 'MUGS', X(0.02) + 8, F - 83, 9, '#c7b48a');
  roomPorthole(ctx, X(0.34), F - 66, 13, s.spin);
  if (W >= 200) {
    const tx = X(0.42), tw = Math.min(108, W * 0.26);
    roomBox(ctx, tx, F - 40, tw, 5, '#2c4c6e'); roomBox(ctx, tx + 8, F - 35, 4, 35, '#20384f'); roomBox(ctx, tx + tw - 12, F - 35, 4, 35, '#20384f');
    roomBox(ctx, tx + tw * 0.3, F - 43, 8, 3, '#ddd6c8'); roomBox(ctx, tx + tw * 0.45, F - 43, 8, 3, '#ddd6c8'); roomBox(ctx, tx + tw * 0.45 + 2, F - 43, 3, 3, '#b8483a');
    roomStool(ctx, tx - 12, F); roomStool(ctx, tx + tw + 12, F);
    roomMug(ctx, tx + tw * 0.75, F - 43, w, time);
    if (w.burn > 0.5) { ctx.strokeStyle = 'rgba(140,170,200,0.5)'; ctx.lineWidth = 0.8; for (let x = tx + 22; x < tx + tw - 22; x += 6) roomSeg(ctx, [[x, F - 14], [x + 6, F]]); }
  }
  if (W >= 240) {
    const cx = X(0.74), cw = Math.min(100, W * 0.24);
    roomBox(ctx, cx, F - 40, cw, 6, '#24405e'); roomBox(ctx, cx + 4, F - 34, cw - 8, 34, '#18304a'); roomBox(ctx, cx + 8, F - 30, cw / 2 - 12, 26, '#132538'); roomBox(ctx, cx + cw / 2 + 2, F - 30, cw / 2 - 12, 26, '#132538');
    roomBox(ctx, cx + 10, F - 58, 16, 18, '#9aa8b6'); roomBox(ctx, cx + 26, F - 54, 6, 4, '#9aa8b6'); roomBox(ctx, cx + 8, F - 46, 20, 3, '#5a6672');
    if (W >= 290) roomPlant(ctx, cx + cw - 6, F - 50, w, time, s.still);
    if (W >= 320) {
      roomBox(ctx, cx, F - 96, cw, 3, '#3d5a7a');
      [[0.2, 14, 7], [0.5, 20, 9], [0.82, 12, 6]].forEach(([f, l, rad], k) => {
        const ax = cx + cw * f, [ex, ey] = hangEnd(ax, F - 93, l, k * 1.7, w, time, s.still);
        ctx.strokeStyle = '#7a8a9a'; ctx.lineWidth = 1.2; roomSeg(ctx, [[ax, F - 93], [ex, ey]]); roomDot(ctx, ex, ey + rad * 0.6, rad, '#4a5662'); roomDot(ctx, ex, ey + rad * 0.6, rad - 2, '#2e3842');
      });
    }
  }
  if (W >= 340) { const kx = X(0.1); roomBox(ctx, kx, F - 72, 26, 30, '#d8d2c4'); roomBox(ctx, kx, F - 72, 26, 7, '#b8483a'); ctx.strokeStyle = '#7a2a22'; ctx.lineWidth = 1; for (let k = 0; k < 8; k++) roomSeg(ctx, [[kx + 3 + (k % 4) * 5, F - 62 + Math.floor(k / 4) * 8], [kx + 7 + (k % 4) * 5, F - 56 + Math.floor(k / 4) * 8]]); }
}

function roomGunnery(ctx, r, s, X, W) {
  const { w, time } = s, F = r.floor, cx = X(0.04);
  roomBox(ctx, cx, F - 40, 96, 6, '#2c4c6e'); roomBox(ctx, cx + 6, F - 34, 84, 34, '#1f3a56');
  roomBox(ctx, cx + 10, F - 94, 76, 52, '#16293d'); roomBox(ctx, cx + 14, F - 90, 34, 44, '#04101a'); roomBox(ctx, cx + 52, F - 90, 30, 44, '#04101a');
  const rx = cx + 31, ry = F - 68; ctx.strokeStyle = 'rgba(111,176,255,0.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(rx, ry, 14, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = 'rgba(111,255,176,0.8)'; roomSeg(ctx, [[rx, ry], [rx + Math.cos(time * 2) * 14, ry + Math.sin(time * 2) * 14]]); roomDot(ctx, rx + 6, ry - 6, 1.4, '#ff8a6a');
  if (w.flip > 0.5) { ctx.save(); ctx.translate(cx + 67, F - 68); ctx.rotate(s.spin * 0.5); ctx.fillStyle = '#ffb030'; ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(5, 8); ctx.lineTo(-5, 8); ctx.fill(); ctx.restore(); }
  else for (let k = 0; k < 4; k++) { const hgt = Math.min(40, 6 + Math.abs(Math.sin(time * 1.5 + k)) * 26 * (w.burn > 0.5 ? 1.4 : 1)); roomBox(ctx, cx + 55 + k * 6.5, F - 48 - hgt, 4.5, hgt, w.burn > 0.5 ? '#ff7a5a' : '#6fb0ff'); }
  for (let k = 0; k < 6; k++) roomDot(ctx, cx + 14 + k * 8, F - 37, 1.2, (Math.floor(time * 3 + k * 1.7) % 3) ? '#2f5577' : '#7fd8a0');
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

function roomBridge(ctx, r, s, X, W) {
  const { w, time, spin } = s, F = r.floor, wl = X(0.55), wr = X(0.97);
  const pane = () => { ctx.beginPath(); ctx.moveTo(wl, F - 92); ctx.lineTo(wr - 6, F - 92); ctx.lineTo(wr, F - 54); ctx.lineTo(wl, F - 54); ctx.closePath(); };
  ctx.save(); pane(); ctx.clip(); roomBox(ctx, wl - 10, F - 100, wr - wl + 20, 60, '#01040a');
  const cs = Math.cos(spin), sn = Math.sin(spin), mx = (wl + wr) / 2;
  for (const [a, b, sz] of roomStars) { const sx = (a - 0.5) * (wr - wl) * 1.4, sy = (b - 0.5) * 100; roomDot(ctx, mx + sx * cs - sy * sn, F - 73 + sx * sn + sy * cs, sz, '#cfe3ff'); }
  const px = wr - 14 + Math.sin(spin) * 40, pg = ctx.createRadialGradient(px, F - 66, 2, px, F - 66, 24); pg.addColorStop(0, '#c98a5a'); pg.addColorStop(1, 'rgba(120,70,40,0)'); ctx.fillStyle = pg; ctx.fillRect(wl, F - 100, wr - wl, 60);
  ctx.restore(); ctx.strokeStyle = '#3d5a7a'; ctx.lineWidth = 3; pane(); ctx.stroke(); roomSeg(ctx, [[mx, F - 92], [mx + 2, F - 54]]);
  if (W >= 150) {
    const cx = X(0.52), cw = Math.min(130, W * 0.45);
    roomBox(ctx, cx, F - 40, cw, 6, '#2c4c6e'); roomBox(ctx, cx + 6, F - 34, cw - 12, 34, '#1f3a56');
    roomBox(ctx, cx + cw - 42, F - 54, 32, 14, '#04101a'); ctx.strokeStyle = '#6fb0ff'; ctx.lineWidth = 1; roomSeg(ctx, [[cx + cw - 38, F - 44], [cx + cw - 28, F - 50], [cx + cw - 14, F - 46]]); roomDot(ctx, cx + cw - 38 + ((time * 2) % 24), F - 46, 1.4, '#ffd9a8');
    roomBox(ctx, cx + cw - 56, F - 52, 6, 12, '#7a8a7a');
  }
  if (W >= 180) { const bob = Math.sin(time * 6) * (2 * w.cruise + 4 * w.flip) - 1.5 * w.burn, bx = X(0.5); roomBox(ctx, bx, F - 46, 6, 6, '#ffb347'); roomDot(ctx, bx + 3, F - 50 + bob, 4, '#e0b48e'); }
  if (W >= 200) { const lx = X(0.04); roomBox(ctx, lx, F - 94, 34, 26, '#2a2016'); roomBox(ctx, lx + 3, F - 91, 28, 20, '#e8e0c8'); worldText(ctx, s.zoom, 'MASTER', lx + 4, F - 77, 9, '#3a3226'); }
  roomCouch(ctx, X(0.4), F, false);
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
    const mx = X(0.7), mw = Math.min(64, W * 0.2); roomBox(ctx, mx, F - 92, mw, 34, '#04101a'); ctx.strokeStyle = '#7fd8a0'; ctx.lineWidth = 1.2; ctx.beginPath();
    for (let x = 0; x < mw - 4; x++) { const u = (x + time * 30) % 30, y = u > 12 && u < 15 ? (u < 13.5 ? -12 : 8) : 0; if (x) ctx.lineTo(mx + 2 + x, F - 75 + y); else ctx.moveTo(mx + 2, F - 75 + y); } ctx.stroke();
  }
  if (W >= 300) { const cx = X(0.04); roomBox(ctx, cx, F - 92, 40, 40, '#d8dde4'); roomBox(ctx, cx + 17, F - 85, 7, 24, '#c03a30'); roomBox(ctx, cx + 9, F - 77, 23, 8, '#c03a30'); }
}

function roomTanks(ctx, r, s, X, W) {
  const { w, time } = s, F = r.floor, tw = Math.min(220, W * 0.6), tx = X(0.05), fuel = Math.max(0, Math.min(1, s.fuel));
  for (const y of [F - 90, F - 44]) {
    roomBox(ctx, tx, y, tw, 40, '#2a4664'); roomBox(ctx, tx + 2, y + 2, tw - 4, 36, '#0e1c2c'); roomBox(ctx, tx + 2, y + 38 - 36 * fuel, tw - 4, 36 * fuel, '#d8943a');
    roomBox(ctx, tx, y + 4, tw, 3, '#3d5a7a'); roomDot(ctx, tx, y + 20, 20, '#2a4664'); roomDot(ctx, tx + tw, y + 20, 20, '#2a4664');
    worldText(ctx, s.zoom, 'H2', tx + tw / 2 - 8, y + 26, 12, '#9fb4c9');
  }
  const lx = X(0.74);
  if (W >= 150) for (let k = 0; k < 3; k++) { const x = lx + k * 30; if (x + 28 > r.x1) break; roomBox(ctx, x, F - 96, 26, 96, '#1c3249'); for (let v = 0; v < 4; v++) roomBox(ctx, x + 4, F - 88 + v * 4, 18, 2, '#12233a'); }
  ctx.strokeStyle = '#3d5a7a'; ctx.lineWidth = 4; roomSeg(ctx, [[tx + tw + 24, F - 70], [lx - 8, F - 70], [lx - 8, F - 10]]); ctx.strokeStyle = '#b83a30'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(lx - 8, F - 40, 6, 0, Math.PI * 2); ctx.stroke();
  if (W >= 260) { const mx = X(0.7); roomBox(ctx, mx, F - 20, 22, 20, '#5a6a7a'); ctx.save(); ctx.translate(mx + 16, F - 20); ctx.rotate(0.35 - (s.still ? 0 : w.flip * 0.3 * Math.sin(time))); roomBox(ctx, -1.5, -66, 3, 68, '#9a7a4a'); roomBox(ctx, -7, -6, 14, 10, '#c8c0a8'); ctx.restore(); }
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

const ROOM_DRAW = { engine: roomEngine, berths: roomBerths, galley: roomGalley, gunnery: roomGunnery, bridge: roomBridge, hold: roomHold, medbay: roomMedbay, tanks: roomTanks };
// A room, r = { x0, x1, top, floor } in world units, drawn for the state s (w, time, zoom, spin, still, berths, cargo, fuel, burning, night, asleep): walls, props, then its lamp.
function drawRoom(ctx, id, r, s) {
  if (s.still) s = { ...s, time: 0 };  // reduced motion: the clock stops, so nothing sways, floats, scrolls or pulses
  const W = r.x1 - r.x0;
  roomWalls(ctx, r, s.w, s.time, s.still);
  ROOM_DRAW[id](ctx, r, s, sh => r.x0 + W * sh, W);
  drawPhaseLight(ctx, r, s.w, s.time, s.night, id === 'bridge' || id === 'engine');
}
