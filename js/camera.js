'use strict';

// The burn view's camera and the outline of the hull in the corner of it (#living-ship).
// The camera is close in on the ship and follows the hand; the outline shows the whole hull, and a tap on a room of it opens that room.

const HULL = { deck: 100, plate: 12, length: 1600, skin: 12 };  // world units: the height of a deck, a floor plate, the length of the largest hull, the skin
const hullLength = size => 160 + 80 * size;  // size 18 is 1600, size 10 is 960
const floorY = dk => 100 + 112 * dk;  // the floor of deck 0 is 100, of deck 1 is 212, linear between

// Both decks (250 world units tall) fit the box high; the width then says how much of the ship is in view.
function viewOf(box) {
  const zoom = box.h / 250;
  return { zoom, span: box.w / zoom };
}

// One step of the camera toward a target x. A null camera snaps; a hull shorter than the view sits in the middle.
function camStep(camX, target, dt, span, len) {
  const max = len * 1.02;
  if (span >= max) return len * 0.51;
  const x = camX === null ? target : camX + (target - camX) * Math.min(1, dt * 2.5);
  return Math.max(span / 2, Math.min(max - span / 2, x));
}

// The outline's boxes in screen units, in the top left corner of the view box. Each room is mapped by its shares and its deck.
function outlineLayout(box, len) {
  const w = Math.min(180, box.w * 0.32), h = w * 0.16, x = box.x + 8, y = box.y + 8;
  const rooms = ROOMS.map(r => ({ id: r.id, x: x + r.x0 * w, y: r.tall ? y : y + r.deck * h / 2, w: (r.x1 - r.x0) * w, h: r.tall ? h : h / 2 }));
  return { x, y, w, h, rooms };
}

// The room under a point, or null.
function outlineRoomAt(outline, x, y) {
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
