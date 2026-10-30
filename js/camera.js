'use strict';

// The burn view's camera and the outline of the hull in the corner of it (#living-ship).
// The camera is close in on the ship and follows the hand; the outline shows the whole hull, and a tap on a room of it opens that room.

const HULL = { deck: 100, plate: 12, length: 1600, skin: 12 };  // world units: the height of a deck, a floor plate, the length of the largest hull, the skin
const hullLength = size => HULL.length * Math.min(1, 0.6 + 0.4 * (size - 10) / 8);  // size 18 and up is the full length, size 10 is 0.6 of it
const floorY = dk => HULL.deck + dk * (HULL.deck + HULL.plate);  // the floor of deck 0 is 100, of deck 1 is 212, linear between

// The box is 290 world units high: the hull (-12 to 224) in the lower part, and a band of 50 above it that holds the outline. The width
// then says how much of the ship is in view; y is the world y at the box's centre.
function viewOf(box) {
  const zoom = box.h / 290;
  return { zoom, span: box.w / zoom, y: 228 - 145 };
}

// One step of the camera toward a target x, held where the view stays inside the hull. A null camera snaps; a hull shorter than the
// view sits in the middle; a camera left outside (the view grew as a dialog closed) eases back in.
function camStep(camX, target, dt, span, len) {
  const max = len * 1.02;
  if (span >= max) return len * 0.51;
  const to = Math.max(span / 2, Math.min(max - span / 2, target));
  return camX === null ? to : camX + (to - camX) * Math.min(1, dt * 2.5);
}

// The outline's boxes in screen units, in the top left corner of the view box. Each room is mapped by its shares and its deck.
function outlineLayout(box, len) {
  const w = Math.min(180, box.w * 0.32), h = w * 0.16, x = box.x + 8, y = box.y + 8;
  const rooms = ROOMS.map(r => ({ id: r.id, x: x + r.x0 * w, y: r.tall ? y : y + r.deck * h / 2, w: (r.x1 - r.x0) * w, h: r.tall ? h : h / 2 }));
  return { x, y, w, h, rooms };
}

// The room under a point, or null. outline.squeeze (abs(turn), as drawOutline draws it; 1 if not set) maps the point back across the
// squeezed outline to the full-width boxes.
function outlineRoomAt(outline, x, y) {
  const sq = Math.max(0.05, outline.squeeze === undefined ? 1 : outline.squeeze), cx = outline.x + outline.w / 2;
  x = cx + (x - cx) / sq;
  const r = outline.rooms.find(q => x >= q.x && x <= q.x + q.w && y >= q.y && y <= q.y + q.h);
  return r ? r.id : null;
}

// The outline: a dark panel, the hull, the rooms, a dot per person (dots: [{ x, deck, color }], x in world units) and the frame of the view.
// It is squeezed across by abs(turn) while the ship turns.
function drawOutline(ctx, outline, dots, camX, span, len, turn) {
  const o = outline, sq = Math.max(0.05, Math.abs(turn)), cx = o.x + o.w / 2, px = wx => o.x + wx / len * o.w;
  ctx.save();
  ctx.translate(cx, 0); ctx.scale(sq, 1); ctx.translate(-cx, 0);
  ctx.fillStyle = 'rgba(5,10,17,0.8)'; ctx.fillRect(o.x - 4, o.y - 4, o.w + 8, o.h + 8);
  ctx.strokeStyle = '#4a6a8a'; ctx.lineWidth = 1; ctx.strokeRect(o.x + 0.5, o.y + 0.5, o.w - 1, o.h - 1);
  ctx.strokeStyle = '#2a4664';
  for (const r of o.rooms) ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
  for (const d of dots) { ctx.fillStyle = d.color; ctx.beginPath(); ctx.arc(px(d.x), o.y + (d.deck + 0.5) * o.h / 2, 2, 0, Math.PI * 2); ctx.fill(); }
  const a = Math.max(o.x, px(camX - span / 2)), b = Math.min(o.x + o.w, px(camX + span / 2));
  ctx.strokeStyle = '#d6e4f5'; ctx.lineWidth = 1.2; ctx.strokeRect(a, o.y - 2, Math.max(0, b - a), o.h + 4);
  ctx.restore();
}
