'use strict';

// What the hull looks like in the cutaway (shiplife.js drawCutaway): plating seams and rivets down the tower's sides, scorch marks that grow
// with the damage the ship has taken, and fittings outside it: a mast with a dish on the nose, radiator fins at the drive deck's sides, a
// turret on the gun deck's sides for each gun the ship carries, and the airlock's outer door. o is the tower's outline (shiplife.js
// towerOutline) in world units, and deck(i) a deck's { top, floor } (#972). Loaded after shiplife.js; only called into at runtime.

// Inside the hull's clip: seams across the skin down both sides, a lighter inner edge, and the scars of damage.
function hullSeams(o) {
  const sk = HULL.skin, sides = [o.x0, o.x1 - sk];
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(61,95,130,0.55)';
  ctx.beginPath();
  for (let y = o.top + 40; y < o.bottom; y += 66) for (const x of sides) { ctx.moveTo(x, y); ctx.lineTo(x + sk, y); }
  ctx.stroke();
  ctx.strokeStyle = 'rgba(130,170,210,0.22)';
  ctx.beginPath(); for (const x of [o.x0 + 3, o.x1 - 3]) { ctx.moveTo(x, o.top + 4); ctx.lineTo(x, o.bottom - 4); } ctx.stroke();
  ctx.fillStyle = 'rgba(150,190,230,0.35)';
  for (let y = o.top + 40; y < o.bottom; y += 66) for (const dy of [14, 28, 42]) for (const x of sides) ctx.fillRect(x + sk / 2 - 0.5, y + dy, 1, 1);
  // Scars: a scorch for each eighth of the armor lost, in the same places every frame, on either side.
  const lost = Math.max(0, 1 - G.state.armor / ship().armor), n = Math.floor(lost * 8);
  for (let i = 0; i < n; i++) {
    const y = o.top + (0.1 + ((i * 0.37) % 0.78)) * (o.bottom - o.top), edge = i % 2 ? o.x1 - sk / 2 : o.x0 + sk / 2, w = 18 + (i % 3) * 9;
    const g = ctx.createRadialGradient(edge, y, 0, edge, y, w);
    g.addColorStop(0, 'rgba(0,0,0,0.55)'); g.addColorStop(0.7, 'rgba(60,30,10,0.25)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(edge - w, y - w, w * 2, w * 2);
  }
}

// Where the fittings sit and how big they are, in world units: the mast at a share of the width on the nose; the fins and the turrets at
// shares of their deck's height from its ceiling; the airlock's door on the lock deck's side.
const HULL_MAST = { at: 0.3, height: 40, dish: 12, light: 44 };
const HULL_FINS = { at: [0.2, 0.5, 0.8], length: 22, width: 9 };
const HULL_TURRET = { at: [0.35, 0.75], radius: 12, barrel: 2.2, barrelRise: 0.7, base: 0.3, most: 3 };
const HULL_HATCH = { height: LOCK_OUTER + 2, depth: 4 };  // the outer door's height, as the airlock draws it inside (rooms.js, #933)

// Outside the hull: the mast and dish, radiator fins, a turret for each gun, and the airlock's outer door.
function hullFittings(o, deck) {
  ctx.lineWidth = 2;
  // Mast with a dish and a blinking light, on the nose.
  const mx = o.x0 + (o.x1 - o.x0) * HULL_MAST.at, my = o.noseTop + (o.top - o.noseTop) * 0.35;
  ctx.strokeStyle = '#4a6a8c';
  ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(mx, my - HULL_MAST.height); ctx.stroke();
  ctx.beginPath(); ctx.arc(mx, my - HULL_MAST.height, HULL_MAST.dish, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
  if (G.time % 2 < 0.25) { ctx.fillStyle = '#ffd36a'; ctx.fillRect(mx - 2, my - HULL_MAST.light - 2, 4, 4); }
  // Radiator fins out from both sides of the drive deck.
  const dd = deck(roomAt('engine').deck);
  ctx.fillStyle = '#10213a'; ctx.strokeStyle = '#3d5f82'; ctx.lineWidth = 1;
  for (const f of HULL_FINS.at) for (const x of [o.x0 - HULL_FINS.length, o.x1]) {
    const y = dd.top + (dd.floor - dd.top) * f - HULL_FINS.width / 2;
    ctx.fillRect(x, y, HULL_FINS.length, HULL_FINS.width); ctx.strokeRect(x, y, HULL_FINS.length, HULL_FINS.width);
  }
  // A turret for each gun on the gun deck's sides, left and right in turn, the barrel out and up toward the nose.
  const gd = deck(roomAt('gunnery').deck), guns = Math.min(HULL_TURRET.most, SHIPS[G.state.shipId].guns || 1);
  for (let i = 0; i < guns; i++) {
    const side = i % 2 ? 1 : -1, tx = side > 0 ? o.x1 : o.x0, ty = gd.top + (gd.floor - gd.top) * HULL_TURRET.at[Math.floor(i / 2)], r = HULL_TURRET.radius;
    ctx.fillStyle = '#15283f'; ctx.strokeStyle = '#4a6a8c'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(tx, ty, r, side > 0 ? -Math.PI / 2 : Math.PI / 2, side > 0 ? Math.PI / 2 : Math.PI * 1.5); ctx.fill(); ctx.stroke();
    ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(tx + side * r * HULL_TURRET.base, ty); ctx.lineTo(tx + side * r * HULL_TURRET.barrel, ty - r * HULL_TURRET.barrelRise); ctx.stroke();
  }
  // The airlock's outer door, in the skin on the lock deck's left side.
  const ld = deck(roomAt('airlock').deck), dy = ld.floor - HULL_HATCH.height;
  ctx.strokeStyle = '#2a4561'; ctx.lineWidth = 1.5; ctx.strokeRect(o.x0 - HULL_HATCH.depth + 0.5, dy, HULL.skin + HULL_HATCH.depth - 1, HULL_HATCH.height);
  ctx.fillStyle = '#c9a227'; ctx.fillRect(o.x0 - HULL_HATCH.depth, dy + HULL_HATCH.height / 2 - 3, 3, 6);
}

// Her name (#936): what is painted on the nose's cap for the game state st and her name: the name, her registry (SHIP_REGISTRY, data.js, by
// her hull) and whether she is the co-op's (chapter two's Ore Runner: the hand's record marked chapter two, as chapterOf reads it, on her hull).
// Pure.
const hullPlate = (st, name) => ({ name: String(name || '').toUpperCase(), reg: SHIP_REGISTRY[st.shipId] || null, coop: !!(st.hired && st.hired.chapter === 2) && st.shipId === 'lightfreighter' });
// The paint on the cap (#936, look.md "a clean frame"): her name and under it her registry, centred on the cap right of the mast, in the
// frame's cold blue and sized on the screen like the room names (the name 16px, the registry 12px, at any zoom); the co-op's mark beside the
// name when she is theirs: a ring round three members' dots joined. o: the tower's outline (towerOutline).
const HULL_NAME = { at: 0.56, col: '#7f97b0' };
function hullName(ctx, o, zoom, plate) {
  if (!plate || !plate.name) return;
  const x = o.x0 + (o.x1 - o.x0) * HULL_NAME.at, cap = o.top - o.noseTop, y = o.noseTop + cap * 0.5 + 4 / zoom;
  ctx.font = `600 ${16}px ${roomFont}`;
  worldText(ctx, zoom, plate.name, x, y, 16 / zoom, HULL_NAME.col, 'center');
  if (plate.reg) worldText(ctx, zoom, plate.reg, x, y + 15 / zoom, 12 / zoom, HULL_NAME.col, 'center');
  if (plate.coop) {  // the co-op's mark, left of the name
    const half = ctx.measureText(plate.name).width / zoom / 2, cx = x - half - 16 / zoom, cy = y - 6 / zoom, r = 8 / zoom;
    ctx.save(); ctx.strokeStyle = HULL_NAME.col; ctx.fillStyle = HULL_NAME.col; ctx.lineWidth = 1.5 / zoom;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    const pts = [0, 1, 2].map(k => [cx + Math.cos(-Math.PI / 2 + k * 2 * Math.PI / 3) * r * 0.5, cy + Math.sin(-Math.PI / 2 + k * 2 * Math.PI / 3) * r * 0.5]);
    ctx.beginPath(); ctx.moveTo(...pts[0]); ctx.lineTo(...pts[1]); ctx.lineTo(...pts[2]); ctx.closePath(); ctx.stroke();
    for (const [px, py] of pts) { ctx.beginPath(); ctx.arc(px, py, 1.8 / zoom, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
  }
}
