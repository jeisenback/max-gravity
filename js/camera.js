'use strict';

// The burn view's camera and the outline of the hull in the corner of it (#living-ship).
// The camera is close in on the tower and pans up and down it after the hand; the outline shows the whole hull, and a tap on a room of it opens that room.

const HULL = { deck: 100, plate: 12, skin: 12 };  // world units: the height of a deck, a floor plate, the skin
const CAM_RUN = { above: 45, plume: 150 };  // world units: how far over the flight deck's ceiling the camera's run starts (the nose's cap), and how much of the plume under the bell's mouth it reaches

// The camera's run down the tower in world y: top, from the nose's cap, and len, down past the drive deck's floor plate, the skin and the
// bell (TOWER_BELL, shiplife.js) to the first of the plume.
const camRun = lay => ({ top: -CAM_RUN.above, len: CAM_RUN.above + towerHeight(lay) + HULL.plate + HULL.skin + TOWER_BELL.h + CAM_RUN.plume });

// The zoom shows about three decks of the tower in the box's height (360 world units), and never less than the whole tower across
// (its width and 40 each side). span is the world height in view.
function viewOf(box, lay) {
  const zoom = Math.min(box.h / 360, box.w / (lay.width + 80));
  return { zoom, span: box.h / zoom };
}

// Where the camera aims for the hand on deck dk (fractional), in the run's terms: the middle of their deck, and on the drive deck the
// bottom of the run, so the bell and the plume come into view past the dead zone (camStep) that would hold the camera short of them.
const camTarget = (lay, dk) => (Math.round(dk) >= lay.decks.length - 1 ? camRun(lay).len : towerDeckY(lay, dk) - HULL.deck / 2 - camRun(lay).top);

// One step of the camera toward a target, down the tower's run (0 at the top of the nose's cap, len past the bell, camRun), held where the
// view stays inside it. A null camera snaps; a run shorter than the view sits in the middle; a camera left outside (the view grew as a
// dialog closed) eases back in.
function camStep(cam, target, dt, span, len) {
  if (span >= len) return len / 2;
  const clamp = y => Math.max(span / 2, Math.min(len - span / 2, y));
  if (cam === null) return clamp(target);
  // the camera holds while the target is in the middle third of the view, and past it eases to keep them at its edge (#924): no slide under every step
  const dead = span / 6, off = target - cam, want = clamp(Math.abs(off) <= dead ? cam : target - Math.sign(off) * dead);
  return cam + (want - cam) * Math.min(1, dt * 1.5);
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
