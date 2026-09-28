'use strict';

// Ship art, drawn in code. Each hull is a half outline (nose to tail, mirrored across
// the centerline) in units of the ship's half length, plus details: drive nozzles, the
// bridge window, panel seams, and gun mounts. Ships are lit from the Sun's real
// direction for the current location. Loaded before game.js; only calls into it at
// runtime.

const HULLS = {
  shuttle: {      // Rock Hopper: a boxy, patched-up skiff
    outline: [[1, 0], [0.8, 0.25], [0.3, 0.35], [0.1, 0.55], [-0.5, 0.55], [-0.7, 0.35], [-0.9, 0.3], [-1, 0.15], [-1, 0]],
    drives: [[-1, 0]], nozzle: 0.16, bridge: 0.7, seams: [0.1, -0.5], guns: [[0.55, 0]],
  },
  lightfreighter: {  // Ore Runner: a long spine with cargo pods
    outline: [[1, 0], [0.85, 0.15], [0.6, 0.18], [0.55, 0.4], [-0.4, 0.4], [-0.45, 0.18], [-0.8, 0.18], [-0.9, 0.28], [-1, 0.28], [-1, 0]],
    drives: [[-1, 0.14], [-1, -0.14]], nozzle: 0.11, bridge: 0.8, seams: [0.25, -0.05], guns: [],
  },
  courier: {      // Torch Courier: a needle with an oversized drive
    outline: [[1, 0], [0.5, 0.12], [-0.4, 0.14], [-0.6, 0.3], [-1, 0.34], [-1, 0]],
    drives: [[-1, 0]], nozzle: 0.3, bridge: 0.6, seams: [0, -0.6], guns: [],
  },
  freighter: {    // Ice Hauler: a huge ringed water tank with a drive bolted on
    outline: [[1, 0], [0.9, 0.2], [0.75, 0.22], [0.7, 0.5], [-0.7, 0.5], [-0.75, 0.25], [-0.9, 0.3], [-1, 0.3], [-1, 0]],
    drives: [[-1, 0.15], [-1, -0.15]], nozzle: 0.13, bridge: 0.88, seams: [0.35, 0, -0.35], guns: [],
  },
  gunship: {      // Corvette: a compact wedge with gun mounts
    outline: [[1, 0], [0.6, 0.18], [0.2, 0.25], [-0.2, 0.45], [-0.7, 0.45], [-0.8, 0.3], [-1, 0.28], [-1, 0]],
    drives: [[-1, 0.13], [-1, -0.13]], nozzle: 0.12, bridge: 0.55, seams: [-0.2], guns: [[0.75, 0], [0.2, 0.18], [0.2, -0.18]],
  },
  raider: {       // Pirate Raider: scrappy and jagged
    outline: [[1, 0], [0.7, 0.1], [0.4, 0.35], [0.2, 0.25], [-0.3, 0.5], [-0.6, 0.3], [-1, 0.25], [-1, 0]],
    drives: [[-1, 0]], nozzle: 0.18, bridge: 0.55, seams: [0.2, -0.3], guns: [[0.6, 0]],
  },
  corsair: {      // Corsair: angular, with welded-on armor wings
    outline: [[1, 0], [0.5, 0.2], [0.3, 0.55], [-0.1, 0.4], [-0.6, 0.6], [-0.8, 0.3], [-1, 0.25], [-1, 0]],
    drives: [[-1, 0.12], [-1, -0.12]], nozzle: 0.11, bridge: 0.6, seams: [0.3, -0.1], guns: [[0.3, 0.3], [0.3, -0.3]],
  },
  cutter: {       // Patrol Cutter: sleek, with swept fins
    outline: [[1, 0], [0.4, 0.15], [0, 0.2], [-0.4, 0.5], [-0.6, 0.5], [-0.7, 0.22], [-1, 0.22], [-1, 0]],
    drives: [[-1, 0]], nozzle: 0.18, bridge: 0.6, seams: [0, -0.4], guns: [[0.2, 0.12], [0.2, -0.12]],
  },
  destroyer: {    // Destroyer: a long warship spine with turrets
    outline: [[1, 0], [0.8, 0.1], [0.4, 0.14], [0.3, 0.32], [-0.3, 0.32], [-0.35, 0.18], [-0.6, 0.18], [-0.7, 0.4], [-0.9, 0.4], [-1, 0.25], [-1, 0]],
    drives: [[-1, 0.14], [-1, 0], [-1, -0.14]], nozzle: 0.09, bridge: 0.75, seams: [0.3, -0.3, -0.6], guns: [[0.55, 0], [0, 0.2], [0, -0.2], [-0.5, 0]],
  },
};

// Hull paint by who flies it; the status color goes on the stripe and nav beacon.
function hullPaint(o) {
  if (o === G.player || o.isPlayer) return '#b8c4d0';
  if (o.shipId === 'destroyer') return '#7a8591';
  return { trader: '#a89f8e', pirate: '#6b5a55', patrol: '#8e9aa6', ally: '#8e9aa6', agent: '#5a6470' }[o.kind] || '#9aa4ae';
}

// Direction toward the Sun (map frame, which is also the flight frame) and how
// strong its light is at the current location.
function sunLight() {
  const pos = orbitPos(G.state.systemId), au = Math.hypot(pos.x, pos.y) || 1;
  return { angle: Math.atan2(-pos.y, -pos.x), strength: Math.max(0.35, Math.min(1.2, 1.1 / Math.sqrt(au))) };
}

function hullPath(outline) {
  ctx.beginPath();
  outline.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  for (let i = outline.length - 2; i > 0; i--) ctx.lineTo(outline[i][0], -outline[i][1]);
  ctx.closePath();
}

function drawPlume(hull, flicker) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const [x, y] of hull.drives) {
    const w = hull.nozzle, len = 2.2 + flicker * 0.5;
    const g = ctx.createLinearGradient(x, 0, x - len, 0);
    g.addColorStop(0, 'rgba(255,255,255,0.95)');
    g.addColorStop(0.12, 'rgba(160,200,255,0.85)');
    g.addColorStop(1, 'rgba(60,100,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x, y - w);
    ctx.lineTo(x - len, y);
    ctx.lineTo(x, y + w);
    ctx.fill();
  }
  ctx.restore();
}

function drawShip(o, accent, toScreen) {
  const hull = HULLS[o.shipId] || HULLS.shuttle, L = SHIPS[o.shipId].size * 1.9;  // drawn a little larger than the hit circle
  const [sx, sy] = toScreen(o), sun = sunLight();
  // Turning since last frame, for thruster puffs.
  const turn = o.lastAngle === undefined ? 0 : wrapAngle(o.angle - o.lastAngle);
  o.lastAngle = o.angle;

  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(o.angle);
  ctx.scale(L, L);
  ctx.lineWidth = 1 / L;

  if (o.thrusting) drawPlume(hull, Math.random());
  else {
    ctx.fillStyle = 'rgba(140,180,255,0.35)';
    for (const [x, y] of hull.drives) { ctx.beginPath(); ctx.arc(x - 0.05, y, hull.nozzle * 0.8, 0, Math.PI * 2); ctx.fill(); }
  }

  // Hull: paint, then sunlight across it from the Sun's side.
  hullPath(hull.outline);
  ctx.fillStyle = hullPaint(o);
  ctx.fill();
  const a = sun.angle - o.angle, s = sun.strength;
  const light = ctx.createLinearGradient(Math.cos(a) * 0.7, Math.sin(a) * 0.7, -Math.cos(a) * 0.7, -Math.sin(a) * 0.7);
  light.addColorStop(0, `rgba(255,248,225,${0.55 * s})`);
  light.addColorStop(0.45, 'rgba(0,0,0,0)');
  light.addColorStop(1, 'rgba(0,0,10,0.7)');
  ctx.fillStyle = light;
  ctx.fill();
  ctx.fillStyle = `rgba(0,0,12,${0.45 * (1.2 - s)})`;  // the outer system is a dim place
  ctx.fill();
  ctx.strokeStyle = 'rgba(10,14,20,0.9)';
  ctx.stroke();

  // Panel seams across the hull.
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  for (const x of hull.seams) {
    const half = widthAt(hull.outline, x);
    ctx.beginPath(); ctx.moveTo(x, -half * 0.92); ctx.lineTo(x, half * 0.92); ctx.stroke();
  }

  // Status stripe along the spine, gun mounts, bridge window.
  ctx.strokeStyle = accent;
  ctx.globalAlpha = 0.85;
  ctx.lineWidth = 0.08;
  ctx.beginPath(); ctx.moveTo(hull.bridge - 0.15, 0); ctx.lineTo(-0.75, 0); ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#2a3038';
  for (const [x, y] of hull.guns) { ctx.beginPath(); ctx.arc(x, y, 0.07, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = '#dff4ff';
  ctx.fillRect(hull.bridge - 0.06, -0.05, 0.08, 0.1);

  // Nav lights: red to port, green to starboard, blinking.
  if (Math.floor(G.time * 2 + (o.x || 0) * 0.01) % 2 === 0) {
    const tip = widest(hull.outline);
    ctx.fillStyle = '#ff4040';
    ctx.fillRect(tip[0] - 0.04, -tip[1] - 0.04, 0.08, 0.08);
    ctx.fillStyle = '#40ff70';
    ctx.fillRect(tip[0] - 0.04, tip[1] - 0.04, 0.08, 0.08);
  }

  // Thruster puffs at the nose when turning.
  if (Math.abs(turn) > 0.01) {
    ctx.fillStyle = 'rgba(230,240,255,0.55)';
    const side = turn > 0 ? -1 : 1;
    ctx.beginPath(); ctx.arc(0.75, side * (widthAt(hull.outline, 0.75) + 0.12), 0.1, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

// Half width of a hull outline at position x (linear between outline points).
function widthAt(outline, x) {
  for (let i = 0; i < outline.length - 1; i++) {
    const [x1, y1] = outline[i], [x2, y2] = outline[i + 1];
    if ((x1 - x) * (x2 - x) <= 0 && x1 !== x2) return y1 + (y2 - y1) * (x - x1) / (x2 - x1);
  }
  return 0.1;
}

function widest(outline) {
  return outline.reduce((best, p) => (p[1] > best[1] ? p : best), outline[0]);
}
