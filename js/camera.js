'use strict';

// The burn view's camera and the outline of the hull in the corner of it (#living-ship).
// The camera is close in on the tower and pans up and down it after the hand; the outline shows the whole hull, and a tap on a room of it opens that room.

const HULL = { deck: 100, plate: 12, skin: 12 };  // world units: the height of a deck, a floor plate, the skin
const CAM_RUN = { above: 45, plume: 150 };  // world units: how far over the flight deck's ceiling the camera's run starts (the nose's cap), and how much of the plume under the bell's mouth it reaches

// The camera's run down the tower in world y: top, from the nose's cap, and len, down past the drive deck's floor plate, the skin and the
// bell (TOWER_BELL, shiplife.js) to the first of the plume.
const camRun = lay => ({ top: -CAM_RUN.above, len: CAM_RUN.above + towerHeight(lay) + HULL.plate + HULL.skin + TOWER_BELL.h + CAM_RUN.plume });

// The zoom shows about three decks of the tower in the box's height (360 world units), and never less than the whole tower across
// (its width and 40 each side) in the box right of a strip `left` px wide (the outline's: outlineLeft). span is the world height in view.
function viewOf(box, lay, left = 0) {
  const zoom = Math.min(box.h / 360, (box.w - left) / (lay.width + 80));
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

// The outline of the whole tower in screen units (#972): a tall strip in the top left corner of the view box, the tower nose up, 60 world
// units of space each side and 75 over the nose's cap and under the drive deck (the bell's throat), at most 120 px tall, scaled by k (screen px a world unit) from
// the world origin at ox, oy. Each room is its layoutBox scaled.
const OUTLINE = { maxH: 120, side: 60, end: 75, gap: 8 };
function outlineLayout(box, lay) {
  const h = Math.min(OUTLINE.maxH, box.h - 16), w = h * (lay.width + 2 * OUTLINE.side) / (towerHeight(lay) + 2 * OUTLINE.end), x = box.x + 8, y = box.y + 8;
  const k = h / (towerHeight(lay) + 2 * OUTLINE.end), ox = x + OUTLINE.side * k, oy = y + OUTLINE.end * k;
  const rooms = layoutRooms(lay).map(r => { const q = layoutBox(lay, r.id); return { id: r.id, x: ox + q.x0 * k, y: oy + q.top * k, w: (q.x1 - q.x0) * k, h: (q.floor - q.top) * k }; });
  return { x, y, w, h, k, ox, oy, rooms };
}
// The strip of the box the outline keeps for itself, from the box's left edge to the outline's right and a gap: the tower stands right of it.
const outlineLeft = (box, o) => o.x + o.w + OUTLINE.gap - box.x;
// A world point (x across the tower, y down from the flight deck's ceiling) on the outline, in screen units.
const outlineAt = (o, wx, wy) => ({ x: o.ox + wx * o.k, y: o.oy + wy * o.k });

// The room under a point, or null: the plain box test.
function outlineRoomAt(outline, x, y) {
  const r = outline.rooms.find(q => x >= q.x && x <= q.x + q.w && y >= q.y && y <= q.y + q.h);
  return r ? r.id : null;
}

// The outline: a dark panel, the tower's skin and nose, the tank's band and the well down the middle, the rooms, a dot per person (dots:
// [{ x, dk, color }], x in world units, dk a fractional deck, placed by towerDeckY so a climber in the tube is in the tank's band) and the
// view's frame across the full width, from camY - span / 2 to camY + span / 2, held inside the strip.
function drawOutline(ctx, outline, dots, camY, span, lay) {
  const o = outline, sk = towerOutline(lay), at = (x, y) => outlineAt(o, x, y), a = at(sk.x0, sk.top), b = at(sk.x1, sk.bottom), nose = at(0, sk.noseTop).y;
  const tk = at(0, sk.tank.top).y, tb = at(0, sk.tank.bottom).y, wx = at(lay.well.x * lay.width, 0).x;
  ctx.save();
  ctx.fillStyle = 'rgba(5,10,17,0.8)'; ctx.fillRect(o.x - 4, o.y - 4, o.w + 8, o.h + 8);
  ctx.fillStyle = '#0e1826'; ctx.strokeStyle = '#4a6a8a'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(a.x, b.y); ctx.lineTo(a.x, a.y); ctx.quadraticCurveTo(a.x, nose, (a.x + b.x) / 2, nose); ctx.quadraticCurveTo(b.x, nose, b.x, a.y); ctx.lineTo(b.x, b.y); ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(50,100,150,0.45)'; ctx.fillRect(a.x + 1, tk, b.x - a.x - 2, tb - tk);  // the water tank
  ctx.strokeStyle = '#2a4664';
  for (const r of o.rooms) ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
  ctx.beginPath(); ctx.moveTo(wx, at(0, 0).y); ctx.lineTo(wx, at(0, towerHeight(lay)).y); ctx.stroke();  // the ladder well, through the tube
  for (const d of dots) { const p = at(d.x, towerDeckY(lay, d.dk) - HULL.deck / 3); ctx.fillStyle = d.color; ctx.beginPath(); ctx.arc(p.x, p.y, 2, 0, Math.PI * 2); ctx.fill(); }
  const y0 = Math.max(o.y, at(0, camY - span / 2).y), y1 = Math.min(o.y + o.h, at(0, camY + span / 2).y);
  ctx.strokeStyle = '#d6e4f5'; ctx.lineWidth = 1.2; ctx.strokeRect(o.x - 2, y0, o.w + 4, Math.max(0, y1 - y0));
  ctx.restore();
}
