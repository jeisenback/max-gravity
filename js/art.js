'use strict';

// Ship art, drawn in code. Each hull is a half outline (nose to tail, mirrored across
// the centerline) in units of the ship's half length, plus details: drive nozzles, the
// bridge window, panel seams, and gun mounts. Ships are lit from the Sun's real
// direction for the current location. Loaded before game.js; only calls into it at
// runtime.

const HULLS = {
  shuttle: {      // Dust Skiff: a boxy, patched-up skiff
    outline: [[1, 0], [0.8, 0.25], [0.3, 0.35], [0.1, 0.55], [-0.5, 0.55], [-0.7, 0.35], [-0.9, 0.3], [-1, 0.15], [-1, 0]],
    drives: [[-1, 0]], nozzle: 0.16, bridge: 0.7, seams: [0.1, -0.5], guns: [[0.55, 0]],
  },
  lightfreighter: {  // Ore Runner: a long spine with cargo pods
    outline: [[1, 0], [0.85, 0.15], [0.6, 0.18], [0.55, 0.4], [-0.4, 0.4], [-0.45, 0.18], [-0.8, 0.18], [-0.9, 0.28], [-1, 0.28], [-1, 0]],
    drives: [[-1, 0.14], [-1, -0.14]], nozzle: 0.11, bridge: 0.8, seams: [0.25, -0.05], guns: [],
  },
  courier: {      // Needle courier: a needle with an oversized drive
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

  // Shield flash: an arc of the shield bubble lights up on the side that was hit.
  const since = G.time - (o.shieldFlash || -9);
  if (since < 0.25 && o.hitAngle !== undefined) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = `rgba(140,200,255,${0.9 * (1 - since / 0.25)})`;
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(sx, sy, L * 1.15, o.hitAngle - 0.9, o.hitAngle + 0.9); ctx.stroke();
    ctx.restore();
  }
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

// ==================== Planets, moons, and stations ====================

// How each body looks. Anything not listed is drawn as a plain cratered moon in its
// data color. Giants are backdrops, not landable.
const BODY_ART = {
  Earth: { type: 'planet', base: ['#3a86d4', '#0f2f5c'], land: ['#4c8a3f', '#8f7f4c', '#6b8f45'], clouds: 12, caps: '#f2f6ff', atmo: '#8cc8ff' },
  Mars: { type: 'planet', base: ['#d0683a', '#5e2410'], maria: 5, craters: 8, caps: '#f5ece6', atmo: '#ffb08a' },
  Luna: { type: 'moon', base: ['#c8c8c4', '#5a5a58'], maria: 5, craters: 16 },
  Ganymede: { type: 'moon', base: ['#a8927a', '#463a30'], craters: 8, grooves: 12, lights: 'domes' },
  Europa: { type: 'moon', base: ['#efe6d6', '#8a7e6c'], cracks: 20, crack: '#9a5a3a' },
  Titan: { type: 'moon', base: ['#e8aa48', '#6e4212'], bands: 7, atmo: '#ffc070' },
  Enceladus: { type: 'moon', base: ['#ffffff', '#95a3b3'], cracks: 7, crack: '#6ea8d8', geysers: true },
  'Triton Outpost': { type: 'moon', base: ['#dcbcc8', '#665060'], craters: 6, caps: '#fff4f8', lights: 'domes' },
  'Hermes Foundry': { type: 'station', style: 'foundry' },
  'Phobos Yards': { type: 'asteroid', base: ['#927e6c', '#3a2e26'], craters: 7, lights: 'yard' },
  'Ceres Station': { type: 'asteroid', base: ['#a3a39b', '#43433e'], craters: 12, lights: 'port' },
  'Pallas Refinery': { type: 'asteroid', base: ['#86909a', '#30353b'], craters: 6, lights: 'smelter' },
  'The Rook': { type: 'asteroid', base: ['#56626a', '#1a1f23'], craters: 5, lights: 'rook' },
  'Ring Nine': { type: 'asteroid', base: ['#8a8f86', '#34362f'], craters: 4, lights: 'port' },
  'The Hollows': { type: 'asteroid', base: ['#7d8a80', '#2e3530'], craters: 8, lights: 'domes' },
  Boneyard: { type: 'asteroid', base: ['#6b6152', '#27221b'], craters: 3, lights: 'yard' },
  Ironheart: { type: 'asteroid', base: ['#9a9088', '#3b3530'], craters: 9, lights: 'smelter' },
  'Juno Commons': { type: 'asteroid', base: ['#8f9c7a', '#353d2c'], craters: 6, lights: 'domes' },
  'Eros Old Town': { type: 'asteroid', base: ['#a08a70', '#3f3326'], craters: 10, lights: 'domes' },
  Jupiter: { type: 'giant', base: ['#e6cfa8', '#7a5634'], bands: 16, bandColors: ['#c49a6c', '#efe0c4', '#a8784e', '#dcc098', '#b58a60'], spot: true },
  Saturn: { type: 'giant', base: ['#efdcae', '#8e7648'], bands: 12, bandColors: ['#e3cc98', '#f3e6c2', '#c9ae76'], rings: true },
  Neptune: { type: 'giant', base: ['#5b8cec', '#18347e'], bands: 8, bandColors: ['#6f9af0', '#3c62c4', '#8fb2f6'], atmo: '#9fc4ff' },
};

// Gas giants hang behind the moons that orbit them, drifting slowly (parallax).
const BACKDROPS = {
  jupiter: { name: 'Jupiter', r: 300, x: -1400, y: 1100 },
  saturn: { name: 'Saturn', r: 220, x: 1450, y: 1150 },
  neptune: { name: 'Neptune', r: 220, x: -1300, y: -1000 },
};

const BODY_CACHE = {};

function seeded(str) {
  let a = hash(str) >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hexA(hex, alpha) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${alpha})`;
}

// A lumpy asteroid outline around radius r.
function lumpy(rnd, r) {
  return Array.from({ length: 18 }, (_, i) => {
    const a = (i / 18) * Math.PI * 2, d = r * (0.82 + rnd() * 0.2);
    return [Math.cos(a) * d, Math.sin(a) * d];
  });
}

function bodyPath(g, r, shape) {
  g.beginPath();
  if (shape) {
    shape.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    g.closePath();
  } else g.arc(0, 0, r, 0, Math.PI * 2);
}

// Draw a body's surface once into an offscreen canvas; lighting is added live. Cached by name and radius: the same body
// is painted small on the map, at its size in flight and large in the port's viewscreen. Over 200px it is drawn at
// device ratio 1, like the gas giants, to bound memory.
function bodySprite(pl) {
  const key = `${pl.name}@${pl.r}`;
  if (BODY_CACHE[key]) return BODY_CACHE[key];
  const art = BODY_ART[pl.name] || { type: 'moon', base: [pl.color, '#1a1d22'], craters: 8 };
  const r = pl.r, k = art.type === 'giant' || r > 200 ? 1 : Math.min(2, window.devicePixelRatio || 1);
  const span = r * 2 * (art.type === 'station' ? 1.4 : art.rings ? 2.4 : 1.4);
  const c = document.createElement('canvas');
  c.width = c.height = Math.ceil(span * k);
  const g = c.getContext('2d');
  g.scale(k, k);
  g.translate(span / 2, span / 2);
  const rnd = seeded(pl.name), inDisc = f => { const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * r * f; return [Math.cos(a) * d, Math.sin(a) * d]; };
  const shape = art.type === 'asteroid' ? lumpy(rnd, r) : null;
  const lights = [];

  if (art.type === 'station') {
    drawFoundry(g, r, lights);
    return (BODY_CACHE[key] = { c, span, art, shape, lights });
  }

  bodyPath(g, r, shape);
  const base = g.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r * 1.05);
  base.addColorStop(0, art.base[0]);
  base.addColorStop(1, art.base[1]);
  g.fillStyle = base;
  g.fill();

  g.save();
  bodyPath(g, r, shape);
  g.clip();
  if (art.bands) {
    for (let i = 0; i < art.bands; i++) {
      const y = -r + (i + rnd() * 0.5) * (2 * r / art.bands), h = (2 * r / art.bands) * (0.4 + rnd() * 0.8);
      g.fillStyle = art.bandColors ? hexA(pick2(rnd, art.bandColors), 0.55) : (i % 2 ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.12)');
      g.beginPath();
      g.ellipse(0, y, r * 1.1, h / 2, (rnd() - 0.5) * 0.04, 0, Math.PI * 2);
      g.fill();
    }
  }
  if (art.spot) {
    g.fillStyle = 'rgba(180,80,50,0.75)';
    g.beginPath(); g.ellipse(r * 0.3, r * 0.35, r * 0.2, r * 0.1, 0, 0, Math.PI * 2); g.fill();
  }
  for (let i = 0; i < (art.maria || 0); i++) {
    const [x, y] = inDisc(0.8);
    g.fillStyle = 'rgba(0,0,0,0.17)';
    for (let j = 0; j < 4; j++) { g.beginPath(); g.arc(x + (rnd() - 0.5) * r * 0.3, y + (rnd() - 0.5) * r * 0.3, r * (0.1 + rnd() * 0.15), 0, Math.PI * 2); g.fill(); }
  }
  if (art.land) {
    for (let i = 0; i < 7; i++) {
      const [x, y] = inDisc(0.85);
      g.fillStyle = pick2(rnd, art.land);
      for (let j = 0; j < 5; j++) { g.beginPath(); g.arc(x + (rnd() - 0.5) * r * 0.35, y + (rnd() - 0.5) * r * 0.25, r * (0.06 + rnd() * 0.12), 0, Math.PI * 2); g.fill(); }
    }
  }
  for (let i = 0; i < (art.craters || 0); i++) {
    const [x, y] = inDisc(0.9), cr = r * (0.03 + rnd() * 0.1);
    g.fillStyle = 'rgba(0,0,0,0.22)';
    g.beginPath(); g.arc(x, y, cr, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.14)';
    g.lineWidth = Math.max(0.6, cr * 0.2);
    g.beginPath(); g.arc(x, y, cr, Math.PI * 0.9, Math.PI * 1.7); g.stroke();
  }
  for (let i = 0; i < (art.grooves || 0); i++) {
    const [x, y] = inDisc(0.9), a = rnd() * Math.PI;
    g.strokeStyle = 'rgba(255,255,255,0.13)';
    g.lineWidth = r * 0.03;
    g.beginPath(); g.moveTo(x - Math.cos(a) * r * 0.3, y - Math.sin(a) * r * 0.3); g.lineTo(x + Math.cos(a) * r * 0.3, y + Math.sin(a) * r * 0.3); g.stroke();
  }
  for (let i = 0; i < (art.cracks || 0); i++) {
    let [x, y] = inDisc(0.9), a = rnd() * Math.PI * 2;
    g.strokeStyle = hexA(art.crack, 0.55);
    g.lineWidth = Math.max(0.7, r * 0.012);
    g.beginPath(); g.moveTo(x, y);
    for (let j = 0; j < 7; j++) { a += (rnd() - 0.5) * 0.9; x += Math.cos(a) * r * 0.14; y += Math.sin(a) * r * 0.14; g.lineTo(x, y); }
    g.stroke();
  }
  if (art.caps) {
    g.fillStyle = art.caps;
    g.beginPath(); g.ellipse(0, -r * 0.97, r * 0.5, r * 0.2, 0, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.ellipse(0, r * 0.98, r * 0.35, r * 0.13, 0, 0, Math.PI * 2); g.fill();
  }
  for (let i = 0; i < (art.clouds || 0); i++) {
    const [x, y] = inDisc(0.95);
    g.fillStyle = `rgba(255,255,255,${0.3 + rnd() * 0.3})`;
    g.beginPath(); g.ellipse(x, y, r * (0.15 + rnd() * 0.3), r * (0.03 + rnd() * 0.05), (rnd() - 0.5) * 0.6, 0, Math.PI * 2); g.fill();
  }
  if (art.lights === 'domes') {
    for (let i = 0; i < 5; i++) {
      const [x, y] = inDisc(0.7);
      g.fillStyle = '#c9d2da';
      g.beginPath(); g.arc(x, y, r * 0.05, Math.PI, 0); g.fill();
      lights.push({ x, y: y - r * 0.02, color: '#ffd48a', blink: false });
    }
  }
  g.restore();

  // Structures that stick out past the surface, and their lights.
  if (art.lights === 'port') {
    g.fillStyle = '#6d747c';
    g.fillRect(r * 0.5, -r * 0.08, r * 0.85, r * 0.16);
    g.fillStyle = '#9aa2aa';
    g.fillRect(r * 1.2, -r * 0.2, r * 0.1, r * 0.4);
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; lights.push({ x: Math.cos(a) * r * 0.78, y: Math.sin(a) * r * 0.78, color: '#bfe4ff', blink: true, phase: i }); }
    lights.push({ x: r * 1.3, y: 0, color: '#ff5050', blink: true, phase: 0 });
  } else if (art.lights === 'yard') {
    g.strokeStyle = '#7a848e';
    g.lineWidth = Math.max(1, r * 0.04);
    for (const dy of [-0.35, 0.35]) { g.beginPath(); g.moveTo(r * 0.6, r * dy); g.lineTo(r * 1.5, r * dy); g.stroke(); }
    for (let x = 0.7; x <= 1.5; x += 0.2) { g.beginPath(); g.moveTo(r * x, -r * 0.35); g.lineTo(r * x, r * 0.35); g.stroke(); }
    g.fillStyle = '#5a646e';
    g.fillRect(r * 0.75, -r * 0.18, r * 0.6, r * 0.36);
    for (let x = 0.7; x <= 1.5; x += 0.2) lights.push({ x: r * x, y: -r * 0.35, color: '#ffd060', blink: true, phase: x * 5 });
  } else if (art.lights === 'smelter') {
    for (let i = 0; i < 5; i++) { const [x, y] = inDisc(0.6); lights.push({ x, y, color: '#ff8a2a', glow: true, phase: i }); }
  } else if (art.lights === 'rook') {
    for (let i = 0; i < 4; i++) { const [x, y] = inDisc(0.7); lights.push({ x, y, color: '#ff3a3a', blink: true, phase: i * 1.7 }); }
  }
  if (art.geysers) {
    g.globalCompositeOperation = 'lighter';
    for (const dx of [-0.25, 0, 0.2]) {
      const gr = g.createLinearGradient(0, r * 0.9, 0, r * 1.6);
      gr.addColorStop(0, 'rgba(220,240,255,0.5)');
      gr.addColorStop(1, 'rgba(220,240,255,0)');
      g.fillStyle = gr;
      g.beginPath(); g.moveTo(r * (dx - 0.04), r * 0.95); g.lineTo(r * (dx - 0.12), r * 1.6); g.lineTo(r * (dx + 0.12), r * 1.6); g.lineTo(r * (dx + 0.04), r * 0.95); g.fill();
    }
    g.globalCompositeOperation = 'source-over';
  }
  return (BODY_CACHE[key] = { c, span, art, shape, lights });
}

function pick2(rnd, arr) {
  return arr[Math.floor(rnd() * arr.length)];
}

// Hermes Foundry: a hub with four solar-furnace mirrors and radiator fins.
function drawFoundry(g, r, lights) {
  g.strokeStyle = '#6a727a';
  g.lineWidth = Math.max(1, r * 0.05);
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2 + Math.PI / 4;
    g.save();
    g.rotate(a);
    g.beginPath(); g.moveTo(r * 0.25, 0); g.lineTo(r * 0.45, 0); g.stroke();
    const m = g.createLinearGradient(r * 0.45, -r * 0.2, r * 1.2, r * 0.2);
    m.addColorStop(0, '#f6e7b0');
    m.addColorStop(0.5, '#fff8de');
    m.addColorStop(1, '#c9a860');
    g.fillStyle = m;
    g.fillRect(r * 0.45, -r * 0.22, r * 0.8, r * 0.44);
    g.strokeStyle = 'rgba(90,70,30,0.5)';
    g.lineWidth = 1;
    for (let x = 0.65; x < 1.25; x += 0.2) { g.beginPath(); g.moveTo(r * x, -r * 0.22); g.lineTo(r * x, r * 0.22); g.stroke(); }
    g.restore();
    g.strokeStyle = '#6a727a';
    g.lineWidth = Math.max(1, r * 0.05);
  }
  g.fillStyle = '#2c3137';
  for (let i = 0; i < 4; i++) { g.save(); g.rotate(i * Math.PI / 2); g.fillRect(r * 0.2, -r * 0.03, r * 0.35, r * 0.06); g.restore(); }
  const hub = g.createRadialGradient(-r * 0.08, -r * 0.08, 1, 0, 0, r * 0.3);
  hub.addColorStop(0, '#c4ccd4');
  hub.addColorStop(1, '#4a525a');
  g.fillStyle = hub;
  g.beginPath(); g.arc(0, 0, r * 0.3, 0, Math.PI * 2); g.fill();
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; lights.push({ x: Math.cos(a) * r * 0.28, y: Math.sin(a) * r * 0.28, color: i % 3 ? '#ffffff' : '#ff5050', blink: true, phase: i }); }
}

// Day and night sides, from the Sun's direction, clipped to the body's outline.
// The painters below draw on the main canvas unless handed another context (the viewscreen, a test's canvas).
function shadeBody(x, y, r, shape, sun, c = ctx) {
  const a = sun.angle, s = sun.strength, ox = Math.cos(a) * r * 0.8, oy = Math.sin(a) * r * 0.8;
  c.save();
  c.translate(x, y);
  bodyPath(c, r, shape);
  const g = c.createRadialGradient(ox, oy, r * 0.1, ox, oy, r * 2);
  g.addColorStop(0, `rgba(255,250,235,${0.14 * s})`);
  g.addColorStop(0.42, 'rgba(0,0,8,0)');
  g.addColorStop(0.6, `rgba(0,0,8,${0.78 + 0.12 * (1.2 - s)})`);
  g.addColorStop(0.85, 'rgba(0,0,8,0.96)');
  c.fillStyle = g;
  c.fill();
  c.restore();
}

function drawAtmosphere(color, x, y, r, sun, c = ctx) {
  c.save();
  c.globalCompositeOperation = 'lighter';
  // Transparent inside the disc: a gradient's first stop would otherwise tint the whole planet.
  const g = c.createRadialGradient(x, y, r * 0.85, x, y, r * 1.14);
  g.addColorStop(0, hexA(color, 0));
  g.addColorStop(0.45, hexA(color, 0.3 * sun.strength));
  g.addColorStop(1, hexA(color, 0));
  c.fillStyle = g;
  c.beginPath(); c.arc(x, y, r * 1.14, 0, Math.PI * 2); c.fill();
  c.strokeStyle = hexA(color, 0.35 * sun.strength);
  c.lineWidth = r * 0.05;
  c.beginPath(); c.arc(x, y, r * 1.01, sun.angle - 1.2, sun.angle + 1.2); c.stroke();
  c.restore();
}

function drawBodyLights(sp, x, y, c = ctx) {
  for (const l of sp.lights) {
    if (l.glow) {
      const pulse = 0.6 + 0.4 * Math.sin(G.time * 3 + l.phase);
      c.save();
      c.globalCompositeOperation = 'lighter';
      const g = c.createRadialGradient(x + l.x, y + l.y, 0, x + l.x, y + l.y, 7);
      g.addColorStop(0, hexA(l.color, 0.9 * pulse));
      g.addColorStop(1, hexA(l.color, 0));
      c.fillStyle = g;
      c.fillRect(x + l.x - 7, y + l.y - 7, 14, 14);
      c.restore();
    } else if (!l.blink || Math.sin(G.time * 3 + l.phase) > 0) {
      c.fillStyle = l.color;
      c.fillRect(x + l.x - 1, y + l.y - 1, 2, 2);
    }
  }
}

// A body at (x, y) on the main canvas, lit by the real sun, or with opts: g, the context to draw on; sun, { angle, strength }
// (the title has no game state to read a sun from).
function drawBody(pl, x, y, opts = {}) {
  const sp = bodySprite(pl), c = opts.g || ctx, sun = opts.sun || sunLight();
  if (sp.art.rings) drawRings(x, y, pl.r, true, sun, c);
  c.drawImage(sp.c, x - sp.span / 2, y - sp.span / 2, sp.span, sp.span);
  if (sp.art.type !== 'station') shadeBody(x, y, pl.r, sp.shape, sun, c);
  if (sp.art.atmo) drawAtmosphere(sp.art.atmo, x, y, pl.r, sun, c);
  if (sp.art.rings) drawRings(x, y, pl.r, false, sun, c);
  drawBodyLights(sp, x, y, c);
}

// Saturn's rings: the far half behind the planet, the near half in front.
function drawRings(x, y, r, back, sun, c = ctx) {
  const tilt = -0.35, s = sun.strength;
  c.save();
  c.translate(x, y);
  c.rotate(tilt);
  for (const [f, w, a] of [[1.35, 0.1, 0.35], [1.55, 0.18, 0.55], [1.8, 0.12, 0.4], [2.05, 0.06, 0.25]]) {
    c.strokeStyle = `rgba(226,210,170,${a * Math.max(0.5, s)})`;
    c.lineWidth = r * w;
    c.beginPath();
    c.ellipse(0, 0, r * f, r * f * 0.22, 0, back ? Math.PI : 0, back ? Math.PI * 2 : Math.PI);
    c.stroke();
  }
  c.restore();
}

// The Sun (sized by your real distance from it) and any gas giant behind the moons.
// The Sun is far away, so it holds its real direction, but it drifts a little against the ship's travel (SUN_PARALLAX)
// so it does not look pinned to the screen.
const SUN_PARALLAX = 0.04;
function sunScreen(cam, viewW, H) {
  const sun = sunLight(), edge = Math.min(viewW, H) * 0.42;
  return [viewW / 2 + Math.cos(sun.angle) * edge - cam.x * SUN_PARALLAX, H / 2 + Math.sin(sun.angle) * edge - cam.y * SUN_PARALLAX];
}
function drawBackdrop(cam, viewW, H) {
  const pos = orbitPos(G.state.systemId), au = Math.hypot(pos.x, pos.y);
  const [sx, sy] = sunScreen(cam, viewW, H);
  const sr = Math.max(2, 9 / au);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, sr * 8);
  glow.addColorStop(0, 'rgba(255,245,220,0.8)');
  glow.addColorStop(0.15, 'rgba(255,220,150,0.25)');
  glow.addColorStop(1, 'rgba(255,180,90,0)');
  ctx.fillStyle = glow;
  ctx.beginPath(); ctx.arc(sx, sy, sr * 8, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fffaf0';
  ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  const b = BACKDROPS[G.state.systemId];
  if (b) {
    const x = viewW / 2 + (b.x - cam.x) * 0.3, y = H / 2 + (b.y - cam.y) * 0.3;
    drawBody({ name: b.name, r: b.r }, x, y);
    ctx.fillStyle = 'rgba(2,4,10,0.35)';  // distance haze, so the giant stays in the background
    ctx.beginPath(); ctx.arc(x, y, b.r * 1.02, 0, Math.PI * 2); ctx.fill();
  }
}

// ==================== Combat effects ====================

const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const TRACER = { player: [200, 255, 255], hostile: [255, 140, 70], ally: [140, 190, 255] };

function shake(amount) {
  if (!REDUCED_MOTION && !Settings.reduceMotion) G.shake = Math.min(12, G.shake + amount);
}

// A tracer round: a hot head and a fading tail along its path.
function drawShot(sh, x, y) {
  const [r, g, b] = TRACER[sh.team] || TRACER.hostile;
  const tx = x - sh.vx * 0.03, ty = y - sh.vy * 0.03;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const tail = ctx.createLinearGradient(x, y, tx, ty);
  tail.addColorStop(0, `rgba(${r},${g},${b},0.9)`);
  tail.addColorStop(1, `rgba(${r},${g},${b},0)`);
  ctx.strokeStyle = tail;
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(tx, ty); ctx.stroke();
  ctx.fillStyle = `rgba(${r},${g},${b},0.35)`;
  ctx.beginPath(); ctx.arc(x, y, 3.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x - 1, y - 1, 2, 2);
  ctx.restore();
}

function drawParticle(pt, x, y) {
  const f = Math.max(0, pt.life / pt.max);
  ctx.save();
  if (pt.type === 'flash' || pt.type === 'fire') {
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(x, y, 0, x, y, pt.size);
    g.addColorStop(0, pt.type === 'flash' ? `rgba(255,255,240,${f})` : `rgba(255,220,140,${0.8 * f})`);
    g.addColorStop(0.4, pt.type === 'flash' ? `rgba(255,220,160,${0.6 * f})` : `rgba(255,120,40,${0.5 * f})`);
    g.addColorStop(1, 'rgba(255,80,20,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, pt.size, 0, Math.PI * 2); ctx.fill();
  } else if (pt.type === 'ring') {
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = `rgba(255,230,190,${0.7 * f})`;
    ctx.lineWidth = 2 + 3 * f;
    ctx.beginPath(); ctx.arc(x, y, pt.size * (1 - f) + 4, 0, Math.PI * 2); ctx.stroke();
  } else if (pt.type === 'debris') {
    ctx.globalAlpha = Math.min(1, f * 3);
    ctx.translate(x, y);
    ctx.rotate(pt.rot);
    ctx.fillStyle = pt.color;
    ctx.fillRect(-pt.size / 2, -pt.size / 4, pt.size, pt.size / 2);
    ctx.fillStyle = `rgba(255,120,40,${f * 0.8})`;  // still glowing hot
    ctx.fillRect(-pt.size / 2, -pt.size / 4, pt.size * 0.3, pt.size / 2);
  } else if (pt.type === 'smoke') {
    ctx.fillStyle = `rgba(120,120,125,${0.3 * f})`;
    ctx.beginPath(); ctx.arc(x, y, pt.size, 0, Math.PI * 2); ctx.fill();
  } else {
    // Sparks: short hot streaks along their motion.
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = f;
    ctx.strokeStyle = pt.color;
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - pt.vx * 0.03, y - pt.vy * 0.03); ctx.stroke();
  }
  ctx.restore();
}

// A ship breaking apart: flash, shockwave, fireball, sparks, and tumbling hull debris.
function explode(o) {
  const size = SHIPS[o.shipId].size * 1.9, paint = hullPaint(o), v = [o.vx || 0, o.vy || 0];
  const add = pt => G.particles.push(pt);
  add({ type: 'flash', x: o.x, y: o.y, vx: v[0], vy: v[1], life: 0.3, max: 0.3, size: size * 4 });
  add({ type: 'ring', x: o.x, y: o.y, vx: v[0] * 0.5, vy: v[1] * 0.5, life: 0.7, max: 0.7, size: size * 5 });
  for (let i = 0; i < 8; i++) {
    const a = rand(0, Math.PI * 2), s = rand(20, 90), life = rand(0.6, 1.2);
    add({ type: 'fire', x: o.x, y: o.y, vx: v[0] + Math.cos(a) * s, vy: v[1] + Math.sin(a) * s, life, max: life, size: size * rand(0.4, 0.8), grow: size * 0.8 });
  }
  for (let i = 0; i < 6 + size / 3; i++) {
    const a = rand(0, Math.PI * 2), s = rand(50, 200), life = rand(1.5, 3);
    add({ type: 'debris', x: o.x, y: o.y, vx: v[0] + Math.cos(a) * s, vy: v[1] + Math.sin(a) * s, life, max: life, size: size * rand(0.15, 0.35), rot: rand(0, 6), spin: rand(-6, 6), color: paint });
  }
  burst(o.x, o.y, 24, ['#fff', '#ffd27f', '#ff8c3a'], 280);
}

// ==================== HUD pieces ====================

const LABEL_FONT = '"Chakra Petch", ui-sans-serif, sans-serif';

// A small spaced-out uppercase label, like a console legend.
function hudLabel(text, x, y, color = '#7f95ab') {
  ctx.font = `600 11px ${LABEL_FONT}`;
  ctx.fillStyle = color;
  ctx.letterSpacing = '2px';
  ctx.fillText(text.toUpperCase(), x, y);
  ctx.letterSpacing = '0px';
}

// A segmented gauge: lit segments for the filled fraction.
function gauge(x, y, w, h, frac, color) {
  const n = Math.max(8, Math.round(w / 8)), gap = 2, seg = (w - gap * (n - 1)) / n;
  const lit = Math.round(Math.max(0, Math.min(1, frac)) * n);
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = i < lit ? color : '#16243a';
    ctx.fillRect(x + i * (seg + gap), y, seg, h);
  }
}
