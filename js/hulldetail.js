'use strict';

// What the hull looks like in the cutaway (shiplife.js drawCutaway): plating seams and rivets down the tower's sides, scorch marks that grow
// with the damage the ship has taken, and fittings outside it: a mast with a dish on the nose, radiator fins at the drive deck's sides, a
// turret on the gun deck's sides for each gun the ship carries, and the airlock's outer door. o is the tower's outline (shiplife.js
// towerOutline) in world units, and deck(i) a deck's { top, floor } (#972). Loaded after shiplife.js; only called into at runtime.

// Inside the hull's clip: seams across the skin down both sides, a lighter inner edge, and the scars of damage.
// The seams, the inner edge and the rivets are the same every frame: kept as images in bands HULL_BAND high down each side (#1122), those in
// view (seen(y0, y1)) copied in; drawn as they are where an image would not match (rooms.js worldSprite).
const HULL_BAND = 264;
function hullSeamLines(c, o) {
  const sk = HULL.skin, sides = [o.x0, o.x1 - sk];
  c.lineWidth = 1;
  c.strokeStyle = 'rgba(61,95,130,0.55)';
  c.beginPath();
  for (let y = o.top + 40; y < o.bottom; y += 66) for (const x of sides) { c.moveTo(x, y); c.lineTo(x + sk, y); }
  c.stroke();
  c.strokeStyle = 'rgba(130,170,210,0.22)';
  c.beginPath(); for (const x of [o.x0 + 3, o.x1 - 3]) { c.moveTo(x, o.top + 4); c.lineTo(x, o.bottom - 4); } c.stroke();
  c.fillStyle = 'rgba(150,190,230,0.35)';
  for (let y = o.top + 40; y < o.bottom; y += 66) for (const dy of [14, 28, 42]) for (const x of sides) c.fillRect(x + sk / 2 - 0.5, y + dy, 1, 1);
}
function hullSeams(o, seen = () => true) {
  const sk = HULL.skin, at = `${o.x0},${o.x1},${o.top},${o.bottom}`;
  bands: for (let y0 = o.top; y0 < o.bottom; y0 += HULL_BAND) {
    if (!seen(y0, y0 + HULL_BAND)) continue;
    for (const x of [o.x0, o.x1 - sk]) if (!worldSprite(ctx, DECK_SPRITES, `seams|${at}|${x}|${y0}`, [x - 1, y0, x + sk + 1, Math.min(o.bottom, y0 + HULL_BAND)], g => hullSeamLines(g, o))) { hullSeamLines(ctx, o); break bands; }
  }
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
// The co-op's hull is named at the members' first meeting (hired.js chapterTwoShip): until then she carries her class's name as a stand-in,
// and none is painted, only her registry and the co-op's mark. Pure.
function hullPlate(st, name) {
  const coop = !!(st.hired && st.hired.chapter === 2) && st.shipId === 'lightfreighter', N = String(name || '').toUpperCase();
  return { name: coop && N === SHIPS.lightfreighter.name.toUpperCase() ? '' : N, reg: SHIP_REGISTRY[st.shipId] || null, coop };
}
// Where the paint goes on the cap (#936, look.md "a clean frame"): her name and her registry, with the co-op's mark before the name when she is
// theirs, sized on the screen like the room names (the name 16px, the registry 12px) and shrunk to fit, never under 12px, centred in the span
// x0 to x1 of world x: right of where the cap curves into the skin at the camera's top, and left of where the speed buttons (burnspeed.js, under
// the burn bar) begin in the smallest window (1000 wide: about world x 505, less where the font sets the buttons wider; the span ends 35 short of
// that, #936: CI's font set them half a pixel from a full-width name). On one line, its baseline `base` over the skin's top; a name too long for
// that at 12px puts the registry on a line of its own under it, `low` over the skin. Every glyph under the top of the camera's run (CAM_RUN.above,
// camera.js) and over the flight deck. measure(text, px): its width in px at that size. Returns the sizes, the baselines (name, reg), each
// piece's left end (world: nameX, regX), the name as painted (name: ellipsised when even the smallest size will not fit), the ring ({ x, y, r }) or none, and the paint's extent { x0, x1, top }.
const HULL_NAME = { col: '#7f97b0', x0: 4, x1: 470, base: 8, low: 2, px: 16, reg: 12, min: 12, gap: 8, cap: 0.8 };
function hullNameLayout(o, zoom, plate, measure) {
  const span = (HULL_NAME.x1 - HULL_NAME.x0) * zoom, mid = (HULL_NAME.x0 + HULL_NAME.x1) / 2, g = HULL_NAME.gap;
  const row = ws => ws.filter(v => v > 0).reduce((t, v, i) => t + v + (i ? g : 0), 0);
  const size = (px, split) => {
    const rp = Math.max(HULL_NAME.min, px * HULL_NAME.reg / HULL_NAME.px), name = plate.name ? measure(plate.name, px) : 0, reg = plate.reg ? measure(plate.reg, rp) : 0, ring = plate.coop ? px : 0;
    return { px, rp, ring, name, reg, split, w: split ? Math.max(row([ring, name]), reg) : row([ring, name, reg]) };
  };
  const fit = split => { let f = size(HULL_NAME.px, split); for (let px = HULL_NAME.px - 0.5; f.w > span && px >= HULL_NAME.min; px -= 0.5) f = size(px, split); return f; };
  let f = fit(false);
  if (f.w > span && f.name && f.reg) f = fit(true);
  if (f.w > span && f.name) {  // still too wide at the smallest size (a long name, a wide font): the name shortened with an ellipsis until it fits
    let n = plate.name;
    while (n.length > 1 && f.w > span) { n = n.slice(0, -1); plate = { ...plate, name: n.trimEnd() + '\u2026' }; f = size(f.px, f.split); }
  }
  const regBase = o.top - (f.split ? HULL_NAME.low : HULL_NAME.base), base = f.split ? regBase - (f.rp + 2) / zoom : regBase;
  const lineW = f.split ? row([f.ring, f.name]) : f.w;
  let x = mid - lineW / zoom / 2; const at = w => { const here = x; if (w) x += (w + g) / zoom; return here; };
  const ring = f.ring ? { x: at(f.ring) + f.ring / zoom / 2, y: base - 0.36 * f.px / zoom, r: f.ring / zoom / 2 } : null, nameX = at(f.name);
  const regX = f.split ? mid - f.reg / zoom / 2 : at(f.reg);
  return { name: plate.name, px: f.px, regPx: f.rp, base, regBase, ring, nameX, regX, x0: mid - f.w / zoom / 2, x1: mid + f.w / zoom / 2, top: Math.min(base - HULL_NAME.cap * f.px / zoom, ring ? ring.y - ring.r : Infinity) };
}
// The paint (hullNameLayout) in the frame's cold blue: the name, the registry, and the co-op's mark, a ring round three members' dots joined.
function hullName(ctx, o, zoom, plate) {
  if (!plate || !(plate.name || plate.reg || plate.coop)) return;
  const L = hullNameLayout(o, zoom, plate, (t, px) => { ctx.font = `600 ${px}px ${roomFont}`; return ctx.measureText(t).width; });
  if (L.name) worldText(ctx, zoom, L.name, L.nameX, L.base, L.px / zoom, HULL_NAME.col, 'left');
  if (plate.reg) worldText(ctx, zoom, plate.reg, L.regX, L.regBase, L.regPx / zoom, HULL_NAME.col, 'left');
  if (L.ring) {
    const { x: cx, y: cy, r } = L.ring;
    ctx.save(); ctx.strokeStyle = HULL_NAME.col; ctx.fillStyle = HULL_NAME.col; ctx.lineWidth = 1.5 / zoom;
    ctx.beginPath(); ctx.arc(cx, cy, r - 0.75 / zoom, 0, Math.PI * 2); ctx.stroke();
    const pts = [0, 1, 2].map(k => [cx + Math.cos(-Math.PI / 2 + k * 2 * Math.PI / 3) * r * 0.5, cy + Math.sin(-Math.PI / 2 + k * 2 * Math.PI / 3) * r * 0.5]);
    ctx.beginPath(); ctx.moveTo(...pts[0]); ctx.lineTo(...pts[1]); ctx.lineTo(...pts[2]); ctx.closePath(); ctx.stroke();
    for (const [px, py] of pts) { ctx.beginPath(); ctx.arc(px, py, 1.8 / zoom, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
  }
}
