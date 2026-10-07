'use strict';

// What the hull looks like in the cutaway (shiplife.js drawCutaway): plating seams and rivets, scorch marks that grow with the
// damage the ship has taken, and fittings outside it: a mast with a dish, radiator fins at the stern, and a dorsal turret for each
// gun the ship carries. Everything is placed by share of the length, so it follows the hull when it turns end over end. Loaded
// after shiplife.js; only called into at runtime.

// Inside the hull's clip: seams along the top and bottom plating, a lighter inner edge, and the scars of damage.
function hullSeams(X, top, H, turn) {
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(61,95,130,0.55)';
  ctx.beginPath();
  for (let f = 0.06; f < 0.9; f += 0.075) { ctx.moveTo(X(f), top); ctx.lineTo(X(f), top + 5); ctx.moveTo(X(f), top + H - 5); ctx.lineTo(X(f), top + H); }
  ctx.stroke();
  ctx.strokeStyle = 'rgba(130,170,210,0.22)';
  ctx.beginPath(); ctx.moveTo(X(0.02), top + 3); ctx.lineTo(X(0.9), top + 3); ctx.moveTo(X(0.02), top + H - 3); ctx.lineTo(X(0.9), top + H - 3); ctx.stroke();
  ctx.fillStyle = 'rgba(150,190,230,0.35)';
  for (let f = 0.06; f < 0.9; f += 0.075) for (const dx of [0.012, 0.024, 0.036]) { ctx.fillRect(X(f + dx), top + 1.5, 1, 1); ctx.fillRect(X(f + dx), top + H - 2.5, 1, 1); }
  // Scars: a scorch for each eighth of the armor lost, in the same places every frame.
  const lost = Math.max(0, 1 - G.state.armor / ship().armor), n = Math.floor(lost * 8);
  for (let i = 0; i < n; i++) {
    const f = 0.1 + ((i * 0.37) % 0.78), edge = i % 2 ? top + H - 3 : top + 3, w = Math.abs(turn) * (12 + (i % 3) * 6);
    const g = ctx.createRadialGradient(X(f), edge, 0, X(f), edge, w);
    g.addColorStop(0, 'rgba(0,0,0,0.55)'); g.addColorStop(0.7, 'rgba(60,30,10,0.25)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(X(f) - w, edge - w, w * 2, w * 2);
  }
}

// Where the fittings sit, as a share of the hull's length from the stern (`at`), and how big they are in pixels at full scale
// (`sc` in hullFittings scales them down for a short ship).
const HULL_MAST = { at: 0.56, height: 15, dish: 5, light: 17 };
const HULL_FINS = { at: [0.03, 0.065, 0.1], length: 8, width: 4 };
const HULL_TURRET = { at: 0.64, step: 0.075, radius: 4.5, barrel: 2.4, barrelRise: 0.9, base: 0.6, most: 3 };
const HULL_HATCH = { at: [0.22, 0.3, 0.38], depth: 3 };

// Outside the hull: the mast and dish, radiator fins, and a turret for each gun.
function hullFittings(X, top, H, L, turn, cy) {
  const sc = Math.max(0.6, L / 640), dir = Math.sign(turn || 1), bottom = top + H;
  ctx.lineWidth = 1;
  // Mast with a dish and a blinking light.
  const mx = X(HULL_MAST.at);
  ctx.strokeStyle = '#4a6a8c';
  ctx.beginPath(); ctx.moveTo(mx, top); ctx.lineTo(mx, top - HULL_MAST.height * sc); ctx.stroke();
  ctx.beginPath(); ctx.arc(mx, top - HULL_MAST.height * sc, HULL_MAST.dish * sc, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
  if (G.time % 2 < 0.25) { ctx.fillStyle = '#ffd36a'; ctx.fillRect(mx - 1, top - HULL_MAST.light * sc, 2, 2); }
  // Radiator fins at the stern, top and bottom.
  ctx.fillStyle = '#10213a'; ctx.strokeStyle = '#3d5f82';
  for (const f of HULL_FINS.at) for (const [y, h] of [[top - HULL_FINS.length * sc, HULL_FINS.length * sc], [bottom, HULL_FINS.length * sc]]) {
    const x = X(f) - HULL_FINS.width / 2 * sc, w = HULL_FINS.width * sc;  // thin fins
    ctx.fillRect(x, y, w, h); ctx.strokeRect(x, y, w, h);
  }
  // A dorsal turret for each gun.
  const guns = Math.min(HULL_TURRET.most, SHIPS[G.state.shipId].guns || 1);
  for (let i = 0; i < guns; i++) {
    const tx = X(HULL_TURRET.at + i * HULL_TURRET.step), r = HULL_TURRET.radius * sc;
    ctx.fillStyle = '#15283f'; ctx.strokeStyle = '#4a6a8c';
    ctx.beginPath(); ctx.arc(tx, top, r, Math.PI, 0); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(tx, top - r * HULL_TURRET.base); ctx.lineTo(tx + dir * r * HULL_TURRET.barrel, top - r * HULL_TURRET.barrelRise); ctx.stroke();
  }
  // Cargo hatch seams along the belly.
  ctx.strokeStyle = '#2a4561';
  ctx.beginPath(); for (const f of HULL_HATCH.at) { ctx.moveTo(X(f), bottom); ctx.lineTo(X(f), bottom + HULL_HATCH.depth * sc); } ctx.stroke();
}
