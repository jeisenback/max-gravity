'use strict';

// Core game: state, flight physics, AI, combat, burns between locations, and rendering.

const HUD_W = 220;
const BURN_DIST = 800;      // must be this far out from local traffic to start a long burn
const LAND_SPEED = 140;
const FUEL_PRICE = 2;       // credits per unit of reaction mass
const REPAIR_PRICE = 15;    // credits per armor point
const SHOT_SPEED = 750;
const SHOT_LIFE = 0.9;
const SHOT_DMG = 8;
const SAVE_KEY = 'maxGravity.save.v2';  // v1 was the pre-solar-system galaxy

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const G = {
  state: null,        // persistent, saved to localStorage
  player: null,       // flight physics for the player ship
  npcs: [], shots: [], particles: [], messages: [],
  offers: [],         // mission offers at the current planet
  mode: 'landed',     // landed | flight | departing | transit | map | dead
  mapReturn: null,
  keys: {},
  navPlanet: null,
  target: null,
  burnAngle: 0, departTimer: 0,
  transit: null,      // burn in progress, see transit.js
  transitStars: null,
  flash: 0, time: 0, spawnTimer: 0,
  stars: [], W: 0, H: 0, mapPos: null,
};

// ---------- helpers ----------

const rand = (a, b) => a + Math.random() * (b - a);
const randInt = (a, b) => Math.floor(rand(a, b + 1));
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const fmt = n => Math.round(n).toLocaleString('en-US');
const wrapAngle = a => Math.atan2(Math.sin(a), Math.cos(a));
const system = (id = G.state.systemId) => SYSTEMS[id];
const ship = (id = G.state.shipId) => SHIPS[id];
const currentPlanet = () => system().planets.find(p => p.name === G.state.planet);

function msg(text) {
  G.messages.push({ text, t: G.time });
  if (G.messages.length > 30) G.messages.shift();
}

function hash(str) {
  let h = 0;
  for (const c of str) h = (h * 31 + c.charCodeAt(0)) | 0;
  return h;
}

function orbitPos(id) {
  const s = SYSTEMS[id], a = s.angle * Math.PI / 180;
  return { x: Math.cos(a) * s.au, y: Math.sin(a) * s.au };
}

// Travel time and reaction mass grow with distance, but less than linearly,
// so the outer planets stay reachable.
const distAU = (a, b) => dist(orbitPos(a), orbitPos(b));
// Crew perks: a pilot shortens burns, an engineer (and her drive tuning) saves mass.
const baseDays = (a, b) => Math.round(2 + 3 * Math.pow(distAU(a, b), 0.7));
const travelDays = (a, b) => Math.max(1, Math.round(baseDays(a, b) * (hasCrew('dima') ? 0.8 : 1)));
const burnFuel = (a, b) => Math.round((30 + 60 * Math.sqrt(distAU(a, b)))
  * (hasCrew('rosa') ? 0.85 : 1) * (G.state.flags.rosaTuned ? 0.9 : 1));
const inRange = (a, b) => a === b || burnFuel(a, b) <= ship().fuel;

function cargoUsed() {
  let t = 0;
  for (const k in G.state.cargo) t += G.state.cargo[k];
  for (const m of G.state.missions) t += m.tons || 0;
  return t;
}
const cargoFree = () => ship().cargo - cargoUsed();

function price(planet, cid) {
  const level = planet.prices[cid];
  if (!level) return null;
  const c = COMMODITIES.find(c => c.id === cid);
  const wobble = 1 + 0.08 * Math.sin(G.state.day * 0.9 + hash(planet.name + cid));
  const rumor = G.state.rumors.find(r => r.planet === planet.name && r.cid === cid && r.until >= G.state.day);
  return Math.round(c.base * PRICE_MULT[level] * wobble * (rumor ? rumor.mult : 1));
}

// Most profitable place within one full tank to sell a commodity bought here, at today's
// prices, weighing profit against travel days.
function bestSale(planet, cid) {
  const buy = price(planet, cid), here = G.state.systemId;
  if (buy === null) return null;
  let best = null;
  for (const [sid, sys] of Object.entries(SYSTEMS)) {
    if (!inRange(here, sid)) continue;
    const days = sid === here ? 0 : travelDays(here, sid);
    for (const pl of sys.planets) {
      const sell = price(pl, cid);
      if (pl === planet || sell === null || sell <= buy) continue;
      const score = (sell - buy) / Math.max(1, days);
      if (!best || score > best.score) best = { planet: pl, days, profit: sell - buy, score };
    }
  }
  return best;
}

// ---------- persistence ----------

function newState() {
  return {
    credits: 12000, day: 1, systemId: 'earth', planet: 'Earth', shipId: 'shuttle',
    fuel: SHIPS.shuttle.fuel, armor: SHIPS.shuttle.armor,
    cargo: {}, paid: {}, rumors: [], missions: [], dest: null, nextId: 1,
    crew: [], flags: {},
  };
}

function save() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(G.state)); } catch (e) { /* storage unavailable */ }
}

function loadSave() {
  try { const s = localStorage.getItem(SAVE_KEY); return s ? JSON.parse(s) : null; } catch (e) { return null; }
}

const INTRO = [
  'You have 12,000 credits, a patched-up Rock Hopper, and a solar system full of opportunity.',
  'Buy low, sell high. The Commodity Exchange shows the best market in range for each good.',
  'Tip: Earth sells Electronics cheap, and Mars, a five-day burn away, pays well for them. Mars sells Refined Metals cheap for the trip back.',
];

function newGame() {
  G.state = newState();
  save();
  resetWorld();
  landAt(currentPlanet(), INTRO);
}

function loadGame() {
  G.state = loadSave() || newState();
  G.state.crew = G.state.crew || [];    // saves from before crew
  G.state.flags = G.state.flags || {};
  resetWorld();
  landAt(currentPlanet(), ['Save loaded. Welcome back, captain.']);
}

function resetWorld() {
  G.player = null; G.npcs = []; G.shots = []; G.particles = []; G.target = null; G.navPlanet = null;
}

// ---------- ships ----------

function makeShip(shipId, x, y, angle) {
  const s = SHIPS[shipId];
  return { shipId, x, y, vx: 0, vy: 0, angle, shields: s.shields, armor: s.armor, maxArmor: s.armor, cooldown: 0, thrusting: false };
}

function turnToward(o, desired, dt) {
  const diff = wrapAngle(desired - o.angle);
  o.angle += Math.sign(diff) * Math.min(Math.abs(diff), SHIPS[o.shipId].turn * dt);
  return Math.abs(diff);
}

function physics(o, dt) {
  const s = SHIPS[o.shipId];
  if (o.thrusting) {
    o.vx += Math.cos(o.angle) * s.accel * dt;
    o.vy += Math.sin(o.angle) * s.accel * dt;
  }
  const sp = Math.hypot(o.vx, o.vy);
  if (sp > s.maxSpeed) { o.vx *= s.maxSpeed / sp; o.vy *= s.maxSpeed / sp; }
  o.x += o.vx * dt;
  o.y += o.vy * dt;
  o.shields = Math.min(s.shields, o.shields + s.shields * 0.03 * dt);
  o.cooldown -= dt;
}

function fire(o) {
  if (o.cooldown > 0) return;
  const isPlayer = o === G.player;
  o.cooldown = isPlayer ? 0.22 : 0.35;
  const s = SHIPS[o.shipId], guns = isPlayer ? playerGuns() : s.guns;
  for (let i = 0; i < guns; i++) {
    const a = o.angle + (i - (guns - 1) / 2) * 0.08;
    G.shots.push({
      x: o.x + Math.cos(a) * s.size, y: o.y + Math.sin(a) * s.size,
      vx: o.vx + Math.cos(a) * SHOT_SPEED, vy: o.vy + Math.sin(a) * SHOT_SPEED,
      life: SHOT_LIFE, fromPlayer: isPlayer,
    });
  }
}

function burst(x, y, count, colors, speed) {
  for (let i = 0; i < count; i++) {
    const a = rand(0, Math.PI * 2), v = rand(0.2, 1) * speed, life = rand(0.3, 1.1);
    G.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life, max: life, color: pick(colors) });
  }
}

function damage(o, d) {
  const absorbed = Math.min(o.shields, d);
  o.shields -= absorbed;
  o.armor -= d - absorbed;
  burst(o.x, o.y, 3, absorbed ? ['#8cf', '#fff'] : ['#fc6', '#f80'], 120);
  if (o.armor <= 0) destroy(o);
}

function destroy(o) {
  burst(o.x, o.y, 40, ['#fff', '#ffd27f', '#ff8c3a', '#ff4b1f'], 260);
  if (o === G.player) {
    o.dead = true;
    G.mode = 'dead';
    setTimeout(() => UI.showDead(), 1500);
    return;
  }
  o.dead = true;
  const st = G.state;
  if (o.bountyId) {
    const i = st.missions.findIndex(m => m.id === o.bountyId);
    if (i >= 0) {
      const m = st.missions[i];
      st.credits += m.pay;
      st.missions.splice(i, 1);
      msg(`Bounty complete: ${m.targetName} destroyed. +${fmt(m.pay)} cr`);
    }
  } else if (o.kind === 'pirate') {
    const b = randInt(2, 6) * 100;
    st.credits += b;
    msg(`Pirate destroyed. Bounty +${b} cr`);
  } else {
    msg(`${o.name} destroyed.`);
  }
}

// ---------- NPCs ----------

function pickGoal(sys, exclude) {
  const opts = sys.planets.filter(p => p !== exclude);
  if (!opts.length || Math.random() < 0.25) {
    const a = rand(0, Math.PI * 2);
    return { x: Math.cos(a) * 2400, y: Math.sin(a) * 2400, r: 150 };
  }
  return pick(opts);
}

function spawnNpc(kind, atPlanet) {
  const sys = system();
  let x, y, from = null;
  if (atPlanet) {
    from = pick(sys.planets);
    x = from.x; y = from.y;
  } else {
    const a = rand(0, Math.PI * 2);
    x = Math.cos(a) * 1800; y = Math.sin(a) * 1800;
  }
  const shipId = kind === 'pirate' ? (Math.random() < 0.7 ? 'raider' : 'corsair') : pick(['shuttle', 'courier', 'freighter']);
  const n = makeShip(shipId, x, y, rand(0, Math.PI * 2));
  n.kind = kind;
  n.hostile = kind === 'pirate' && !(G.state.flags.ghost && Math.random() < 0.5);  // Wren's ghost transponder
  n.name = `${kind === 'pirate' ? 'Pirate' : 'Trader'} ${SHIPS[shipId].name}`;
  n.goal = pickGoal(sys, from);
  if (!atPlanet) {
    n.angle = Math.atan2(n.goal.y - y, n.goal.x - x);
    n.vx = Math.cos(n.angle) * 150; n.vy = Math.sin(n.angle) * 150;
  }
  G.npcs.push(n);
  return n;
}

function spawnBountyTarget(m) {
  const n = spawnNpc('pirate', false);
  n.shipId = 'corsair';
  n.name = m.targetName;
  n.bountyId = m.id;
  n.shields = SHIPS.corsair.shields;
  n.armor = n.maxArmor = SHIPS.corsair.armor * 1.5;
}

function populateSystem() {
  const sys = system();
  G.npcs = []; G.shots = []; G.target = null;
  const traders = randInt(1, 3);
  for (let i = 0; i < traders; i++) spawnNpc('trader', Math.random() < 0.5);
  if (Math.random() < sys.pirates) {
    const pirates = randInt(1, 2);
    for (let i = 0; i < pirates; i++) spawnNpc('pirate', false);
  }
  for (const m of G.state.missions) {
    if (m.type === 'bounty' && m.targetSystem === G.state.systemId) {
      spawnBountyTarget(m);
      msg(`Sensors detect ${m.targetName} in local space.`);
    }
  }
  G.spawnTimer = 15;
}

function updateNpc(n, dt) {
  const s = SHIPS[n.shipId], p = G.player;
  const pd = p && !p.dead && G.mode === 'flight' ? dist(n, p) : Infinity;
  let tx, ty, attacking = false;

  if (n.hostile && pd < 1600) {
    if (n.armor < n.maxArmor * 0.25 && !n.bountyId) {
      tx = n.x * 2 - p.x; ty = n.y * 2 - p.y;   // flee directly away
    } else {
      const lead = pd / SHOT_SPEED;
      tx = p.x + (p.vx - n.vx) * lead; ty = p.y + (p.vy - n.vy) * lead;
      attacking = true;
    }
  } else {
    tx = n.goal.x; ty = n.goal.y;
    if (Math.hypot(n.x - tx, n.y - ty) < n.goal.r) {
      if (n.kind === 'trader') { n.dead = true; return; }  // landed or left the system
      n.goal = pickGoal(system(), n.goal);
    }
  }

  const off = turnToward(n, Math.atan2(ty - n.y, tx - n.x), dt);
  n.thrusting = off < 0.6 && (!attacking || pd > 250);
  if (attacking && off < 0.2 && pd < 650) fire(n);
  physics(n, dt);
  if (Math.hypot(n.x, n.y) > 4000) n.dead = true;
}

// ---------- player actions ----------

function nearestPlanet() {
  let best = null;
  system().planets.forEach((pl, index) => {
    const d = dist(pl, G.player);
    if (!best || d < best.d) best = { pl, index, d };
  });
  return best;
}

function tryLand() {
  const n = nearestPlanet();
  if (n.d > n.pl.r + 60) {
    G.navPlanet = n.index;
    msg(`Nav target: ${n.pl.name}.`);
    return;
  }
  if (Math.hypot(G.player.vx, G.player.vy) > LAND_SPEED) {
    msg('Moving too fast to land. Slow down (S / Down turns you around).');
    return;
  }
  land(n.pl);
}

function land(planet) {
  const st = G.state;
  st.planet = planet.name;
  st.armor = Math.max(1, Math.round(G.player.armor));
  const before = G.messages.length;
  // deliveries
  st.missions = st.missions.filter(m => {
    if (m.type === 'bounty' || m.destSystem !== st.systemId || m.destPlanet !== planet.name) return true;
    if (m.type === 'delivery') {
      st.credits += m.pay;
      msg(`Delivered ${m.tons}t of ${m.good}. Payment received: ${fmt(m.pay)} cr.`);
    } else {
      const fare = Math.max(0, m.pay + m.bonus);
      st.credits += fare;
      msg(`${m.who[0].toUpperCase()}${m.who.slice(1)} ${m.pax > 1 ? 'disembark' : 'disembarks'}. Fare received: ${fmt(fare)} cr${m.bonus ? ` (${m.bonus > 0 ? '+' : '-'}${fmt(Math.abs(m.bonus))} for the trip)` : ''}.`);
    }
    return false;
  });
  expireMissions();
  landAt(planet, G.messages.slice(before).map(m => m.text));
}

function landAt(planet, notes) {
  G.mode = 'landed';
  G.shots = [];
  G.flash = 0;
  G.offers = generateMissions(planet);
  save();
  UI.openLanded(planet, notes);
}

function takeOff() {
  const pl = currentPlanet();
  const a = rand(0, Math.PI * 2);
  G.player = makeShip(G.state.shipId, pl.x + Math.cos(a) * pl.r * 0.5, pl.y + Math.sin(a) * pl.r * 0.5, a);
  G.player.armor = G.state.armor;
  G.mode = 'flight';
  G.navPlanet = null;
  populateSystem();
  UI.hide();
}

function expireMissions() {
  const st = G.state;
  st.missions = st.missions.filter(m => {
    if (st.day <= m.deadline) return true;
    msg(`Mission failed (deadline passed): ${m.title}`);
    return false;
  });
}

function cycleTarget() {
  if (!G.npcs.length) { G.target = null; return; }
  const sorted = [...G.npcs].sort((a, b) => dist(a, G.player) - dist(b, G.player));
  G.target = sorted[(sorted.indexOf(G.target) + 1) % sorted.length];
}

function tryBurn() {
  const st = G.state;
  if (!st.dest) return msg('No destination. Press M to open the system map.');
  const need = burnFuel(st.systemId, st.dest);
  if (st.fuel < need) return msg(`Not enough reaction mass (need ${need}). Refuel or pick a closer destination.`);
  if (Math.hypot(G.player.x, G.player.y) < BURN_DIST) return msg('Traffic control: clear local space before starting a long burn.');
  const from = orbitPos(st.systemId), to = orbitPos(st.dest);
  G.burnAngle = Math.atan2(to.y - from.y, to.x - from.x);
  G.departTimer = 1.2;
  G.mode = 'departing';
  msg(`Burning for ${SYSTEMS[st.dest].name}.`);
}

function updateDeparture(dt) {
  const p = G.player;
  const off = turnToward(p, G.burnAngle, dt);
  p.thrusting = off < 0.05;
  if (p.thrusting) {
    p.vx += Math.cos(p.angle) * 4000 * dt;
    p.vy += Math.sin(p.angle) * 4000 * dt;
    G.departTimer -= dt;
  }
  p.x += p.vx * dt;
  p.y += p.vy * dt;
  if (G.departTimer <= 0) enterTransit();
}

function arrive() {
  const st = G.state, p = G.player, s = ship(), a = G.burnAngle;
  st.systemId = G.transit.to;
  st.day += G.transit.days;
  payCrew(G.transit.days);
  st.rumors = st.rumors.filter(r => r.until >= st.day);
  G.transit = null;
  p.x = -Math.cos(a) * 1100; p.y = -Math.sin(a) * 1100;
  p.vx = Math.cos(a) * s.maxSpeed; p.vy = Math.sin(a) * s.maxSpeed;
  G.mode = 'flight';
  G.flash = 1;
  G.navPlanet = null;
  const sys = system();
  msg(`Arrived at ${sys.name} (${sys.gov}). Day ${st.day}.`);
  expireMissions();
  populateSystem();
}

function openMap() {
  G.mapReturn = G.mode;
  G.mode = 'map';
  UI.hide();
}

function closeMap() {
  G.mode = G.mapReturn;
  if (G.mode === 'landed') UI.show();
}

// ---------- missions ----------

function generateMissions(planet) {
  if (!planet.services.includes('missions')) return [];
  const here = G.state.systemId, day = G.state.day, offers = [];
  const reachable = Object.keys(SYSTEMS).filter(id => inRange(here, id));
  const daysTo = id => (id === here ? 1 : baseDays(here, id));
  for (let i = 0; i < 4; i++) {
    const roll = Math.random();
    if (roll >= 0.45 && roll < 0.75) {
      const destSystem = pick(reachable), dest = pick(SYSTEMS[destSystem].planets);
      const pid = pick(Object.keys(PASSENGERS)), P = PASSENGERS[pid], days = daysTo(destSystem);
      if (dest === planet || [...offers, ...G.state.missions].some(m => m.passenger === pid)) continue;
      offers.push({
        type: 'passenger', passenger: pid, who: P.name, pax: P.pax, bonus: 0, destSystem, destPlanet: dest.name,
        title: `Carry ${P.name} (${P.pax}) to ${dest.name}`,
        pay: Math.round((1500 + days * 400) * P.fare),
        deadline: day + Math.ceil(days * 1.5) + randInt(2, 6),
      });
    } else if (roll < 0.45) {
      const destSystem = pick(reachable);
      const dest = pick(SYSTEMS[destSystem].planets);
      if (dest === planet) continue;
      const days = daysTo(destSystem), tons = randInt(3, 15), good = pick(MISSION_GOODS);
      offers.push({
        type: 'delivery', good, tons, destSystem, destPlanet: dest.name,
        title: `Deliver ${tons}t of ${good} to ${dest.name}`,
        pay: 1000 + days * 350 + tons * 100,
        deadline: day + Math.ceil(days * 1.5) + randInt(2, 6),
      });
    } else {
      const options = reachable.filter(id => SYSTEMS[id].pirates > 0);
      const taken = [...offers, ...G.state.missions].map(m => m.targetName);
      const names = PIRATE_NAMES.filter(n => !taken.includes(n));
      if (!names.length || !options.length) continue;
      const targetSystem = pick(options), targetName = pick(names);
      offers.push({
        type: 'bounty', targetSystem, targetName,
        title: `Bounty: destroy ${targetName} near ${SYSTEMS[targetSystem].name}`,
        pay: randInt(8, 16) * 1000,
        deadline: day + daysTo(targetSystem) * 2 + 10,
      });
    }
  }
  return offers;
}

// ---------- update loop ----------

function updatePlayer(dt) {
  const p = G.player, s = ship(), k = G.keys;
  if (k.left) p.angle -= s.turn * dt;
  if (k.right) p.angle += s.turn * dt;
  if (k.reverse && Math.hypot(p.vx, p.vy) > 5) turnToward(p, Math.atan2(-p.vy, -p.vx), dt);
  p.thrusting = !!k.thrust;
  if (k.fire) fire(p);
  physics(p, dt);
}

function updateShots(dt) {
  const p = G.player;
  for (const sh of G.shots) {
    sh.x += sh.vx * dt; sh.y += sh.vy * dt; sh.life -= dt;
    if (sh.fromPlayer) {
      for (const n of G.npcs) {
        if (!n.dead && dist(sh, n) < SHIPS[n.shipId].size + 2) {
          n.hostile = true;
          damage(n, SHOT_DMG);
          sh.life = 0;
          break;
        }
      }
    } else if (p && !p.dead && dist(sh, p) < ship().size + 2) {
      damage(p, SHOT_DMG);
      sh.life = 0;
    }
  }
  G.shots = G.shots.filter(s => s.life > 0);
}

function update(dt) {
  G.time += dt;
  if (G.mode === 'flight') updatePlayer(dt);
  else if (G.mode === 'departing') updateDeparture(dt);
  else if (G.mode === 'transit') return updateTransit(dt);

  for (const n of G.npcs) updateNpc(n, dt);
  updateShots(dt);
  for (const pt of G.particles) { pt.x += pt.vx * dt; pt.y += pt.vy * dt; pt.life -= dt; }
  G.particles = G.particles.filter(pt => pt.life > 0);
  G.npcs = G.npcs.filter(n => !n.dead);
  if (G.target && G.target.dead) G.target = null;
  if (G.flash > 0) G.flash -= dt * 2;

  if (G.mode === 'flight' && (G.spawnTimer -= dt) <= 0) {
    G.spawnTimer = rand(10, 20);
    if (G.npcs.length < 6) {
      if (Math.random() < system().pirates * 0.5) spawnNpc('pirate', false);
      else if (Math.random() < 0.7) spawnNpc('trader', Math.random() < 0.5);
    }
  }
}

// ---------- rendering ----------

function initStars() {
  G.stars = [0.15, 0.4, 0.8].map((f, i) => ({
    f, size: i + 1, color: ['#445', '#889', '#dde'][i],
    pts: Array.from({ length: 70 }, () => ({ x: Math.random() * 1024, y: Math.random() * 1024 })),
  }));
}

function drawStars(cam, viewW, H, vel) {
  const T = 1024;
  for (const layer of G.stars) {
    ctx.strokeStyle = layer.color;
    ctx.lineWidth = layer.size;
    const offX = ((-cam.x * layer.f) % T + T) % T, offY = ((-cam.y * layer.f) % T + T) % T;
    const lx = -vel.x * 0.02 * layer.f, ly = -vel.y * 0.02 * layer.f;
    ctx.beginPath();
    for (const s of layer.pts) {
      const x0 = (s.x + offX) % T, y0 = (s.y + offY) % T;
      for (let x = x0; x < viewW; x += T) {
        for (let y = y0; y < H; y += T) {
          ctx.moveTo(x, y);
          ctx.lineTo(x + lx - 0.5, y + ly);
        }
      }
    }
    ctx.stroke();
  }
}

function drawShip(o, color, toScreen) {
  const s = SHIPS[o.shipId], z = s.size;
  const [sx, sy] = toScreen(o);
  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(o.angle);
  if (o.thrusting) {
    ctx.fillStyle = Math.random() < 0.5 ? '#ffb347' : '#ff6a00';
    ctx.beginPath();
    ctx.moveTo(-0.55 * z, 0.3 * z);
    ctx.lineTo(-(1.1 + Math.random() * 0.5) * z, 0);
    ctx.lineTo(-0.55 * z, -0.3 * z);
    ctx.fill();
  }
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(z, 0);
  ctx.lineTo(-0.8 * z, 0.7 * z);
  ctx.lineTo(-0.5 * z, 0);
  ctx.lineTo(-0.8 * z, -0.7 * z);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function npcColor(n) {
  if (n.bountyId) return '#ff2d6f';
  return n.hostile ? '#ff5f5f' : '#e8d17a';
}

function drawBrackets(x, y, r, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  const c = r * 0.4;
  for (const [dx, dy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    ctx.beginPath();
    ctx.moveTo(x + dx * r, y + dy * (r - c));
    ctx.lineTo(x + dx * r, y + dy * r);
    ctx.lineTo(x + dx * (r - c), y + dy * r);
    ctx.stroke();
  }
}

function drawWorld(W, H) {
  const viewW = W - HUD_W, p = G.player;
  const cam = p || currentPlanet();
  const toScreen = o => [o.x - cam.x + viewW / 2, o.y - cam.y + H / 2];

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, viewW, H);
  ctx.clip();

  drawStars(cam, viewW, H, p ? { x: p.vx, y: p.vy } : { x: 0, y: 0 });

  system().planets.forEach((pl, i) => {
    const [x, y] = toScreen(pl);
    const g = ctx.createRadialGradient(x - pl.r * 0.4, y - pl.r * 0.4, pl.r * 0.1, x, y, pl.r);
    g.addColorStop(0, pl.color);
    g.addColorStop(1, '#05080c');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, pl.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#9ab';
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(pl.name, x, y + pl.r + 16);
    if (G.navPlanet === i) drawBrackets(x, y, pl.r + 10, '#5fd35f');
  });

  for (const n of G.npcs) drawShip(n, npcColor(n), toScreen);
  if (p && !p.dead) drawShip(p, '#9fe0ff', toScreen);

  ctx.lineWidth = 2;
  for (const sh of G.shots) {
    const [x, y] = toScreen(sh);
    ctx.strokeStyle = sh.fromPlayer ? '#7fff7f' : '#ff6060';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - sh.vx * 0.012, y - sh.vy * 0.012);
    ctx.stroke();
  }

  for (const pt of G.particles) {
    const [x, y] = toScreen(pt);
    ctx.globalAlpha = Math.max(0, pt.life / pt.max);
    ctx.fillStyle = pt.color;
    ctx.fillRect(x - 1.5, y - 1.5, 3, 3);
  }
  ctx.globalAlpha = 1;

  if (G.target) {
    const [x, y] = toScreen(G.target);
    drawBrackets(x, y, SHIPS[G.target.shipId].size + 8, npcColor(G.target));
  }

  // Arrow at the screen edge pointing toward an off-screen nav planet.
  if (p && G.navPlanet !== null) {
    const pl = system().planets[G.navPlanet];
    const [x, y] = toScreen(pl);
    if (x < 0 || x > viewW || y < 0 || y > H) {
      const a = Math.atan2(y - H / 2, x - viewW / 2);
      const ex = viewW / 2 + Math.cos(a) * (Math.min(viewW, H) / 2 - 30);
      const ey = H / 2 + Math.sin(a) * (Math.min(viewW, H) / 2 - 30);
      ctx.save();
      ctx.translate(ex, ey);
      ctx.rotate(a);
      ctx.fillStyle = '#5fd35f';
      ctx.beginPath();
      ctx.moveTo(10, 0); ctx.lineTo(-6, 7); ctx.lineTo(-6, -7);
      ctx.fill();
      ctx.restore();
    }
  }

  // Message log, bottom-left.
  ctx.font = '13px monospace';
  ctx.textAlign = 'left';
  const recent = G.messages.filter(m => G.time - m.t < 10).slice(-6);
  recent.forEach((m, i) => {
    ctx.globalAlpha = Math.min(1, (10 - (G.time - m.t)) / 2);
    ctx.fillStyle = '#cfe3ff';
    ctx.fillText(m.text, 14, H - 16 - (recent.length - 1 - i) * 18);
  });
  ctx.globalAlpha = 1;

  if (G.flash > 0) {
    ctx.fillStyle = `rgba(255,255,255,${G.flash})`;
    ctx.fillRect(0, 0, viewW, H);
  }
  ctx.restore();
}

function drawBar(x, y, w, label, val, max, color) {
  ctx.fillStyle = '#9ab';
  ctx.fillText(label, x, y);
  ctx.textAlign = 'right';
  ctx.fillText(`${Math.max(0, Math.round(val))}/${Math.round(max)}`, x + w, y);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#1a2533';
  ctx.fillRect(x, y + 5, w, 6);
  ctx.fillStyle = color;
  ctx.fillRect(x, y + 5, w * Math.max(0, Math.min(1, val / max)), 6);
}

function drawHud(W, H) {
  const x0 = W - HUD_W, p = G.player, st = G.state, s = ship(), sys = system();
  const inTransit = G.mode === 'transit';
  ctx.fillStyle = '#081018';
  ctx.fillRect(x0, 0, HUD_W, H);
  ctx.fillStyle = '#23405f';
  ctx.fillRect(x0, 0, 2, H);

  // Radar
  const rx = x0 + HUD_W / 2, ry = 110, R = 95, scale = R / 2500;
  const center = p || currentPlanet();
  ctx.fillStyle = '#02070c';
  ctx.strokeStyle = '#23405f';
  ctx.beginPath(); ctx.arc(rx, ry, R, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  const blip = (o, color, sz, clamp) => {
    let dx = (o.x - center.x) * scale, dy = (o.y - center.y) * scale;
    const d = Math.hypot(dx, dy);
    if (d > R - 3) { if (!clamp) return; dx *= (R - 3) / d; dy *= (R - 3) / d; }
    ctx.fillStyle = color;
    ctx.fillRect(rx + dx - sz / 2, ry + dy - sz / 2, sz, sz);
  };
  if (!inTransit) {
    for (const pl of sys.planets) blip(pl, '#4a7a4a', 6, true);
    for (const n of G.npcs) blip(n, npcColor(n), 3, false);
    if (p) blip(p, '#fff', 3, false);
  }

  ctx.font = '12px monospace';
  ctx.textAlign = 'left';
  const x = x0 + 14, w = HUD_W - 28;
  let y = 228;
  ctx.fillStyle = inTransit ? '#7fb4ff' : GOV_COLORS[sys.gov];
  ctx.font = 'bold 14px monospace';
  ctx.fillText(inTransit ? 'In transit' : sys.name, x, y);
  ctx.font = '12px monospace';
  ctx.fillStyle = '#9ab';
  ctx.fillText(inTransit ? `To ${SYSTEMS[G.transit.to].name}` : `${sys.gov}`, x, y += 16);
  ctx.fillText(`Day ${st.day}`, x, y += 16);

  y += 26;
  if (p) {
    drawBar(x, y, w, 'Shields', p.shields, s.shields, '#4aa3ff');
    drawBar(x, y += 30, w, 'Armor', p.armor, p.maxArmor, '#ff9a3c');
  }
  drawBar(x, y += 30, w, 'Reaction mass', st.fuel, s.fuel, '#5fd35f');

  y += 36;
  ctx.fillStyle = '#cfe3ff';
  ctx.fillText(`Credits: ${fmt(st.credits)}`, x, y);
  ctx.fillText(`Cargo:   ${cargoUsed()}/${s.cargo}t`, x, y += 18);

  y += 28;
  ctx.fillStyle = '#9ab';
  ctx.fillText('NAV', x, y);
  ctx.fillStyle = '#cfe3ff';
  const nav = G.navPlanet !== null && p ? system().planets[G.navPlanet] : null;
  ctx.fillText(nav ? `${nav.name} (${Math.round(dist(nav, p))})` : 'none (L)', x, y += 16);
  const from = G.transit ? G.transit.to : st.systemId;
  ctx.fillText(st.dest ? `Burn: ${SYSTEMS[st.dest].name}` : 'Burn: none (M)', x, y += 16);
  if (st.dest) {
    const need = burnFuel(from, st.dest);
    ctx.fillStyle = need > st.fuel ? '#ff7f7f' : '#9ab';
    ctx.fillText(`${travelDays(from, st.dest)} days, ${need} mass`, x, y += 16);
  }

  y += 28;
  ctx.fillStyle = '#9ab';
  ctx.fillText('TARGET', x, y);
  if (G.target && p) {
    const t = G.target;
    ctx.fillStyle = npcColor(t);
    ctx.fillText(t.name, x, y += 16);
    ctx.fillStyle = '#9ab';
    ctx.fillText(`Dist ${Math.round(dist(t, p))}`, x, y += 16);
    y += 14;
    ctx.fillStyle = '#1a2533'; ctx.fillRect(x, y, w, 5); ctx.fillRect(x, y + 8, w, 5);
    ctx.fillStyle = '#4aa3ff'; ctx.fillRect(x, y, w * Math.max(0, t.shields / SHIPS[t.shipId].shields), 5);
    ctx.fillStyle = '#ff9a3c'; ctx.fillRect(x, y + 8, w * Math.max(0, t.armor / t.maxArmor), 5);
  } else {
    ctx.fillStyle = '#cfe3ff';
    ctx.fillText('none (Tab)', x, y += 16);
  }

  ctx.fillStyle = '#56687a';
  ctx.font = '11px monospace';
  const help = ['Arrows/WASD fly', 'S/Down  reverse', 'Space   fire', 'Tab     target', 'L  select / land', 'M  system map', 'J  burn'];
  help.forEach((h, i) => ctx.fillText(h, x, H - 14 - (help.length - 1 - i) * 14));
}

function drawMap(W, H) {
  ctx.fillStyle = '#050a12';
  ctx.fillRect(0, 0, W, H);
  const ids = Object.keys(SYSTEMS), st = G.state;
  const from = G.transit ? G.transit.to : st.systemId;

  // Square-root radial scale, so the inner planets are not a smudge next to Neptune.
  const maxR = Math.sqrt(Math.max(...ids.map(id => SYSTEMS[id].au)));
  const cx = W / 2, cy = H / 2 + 10, sc = (Math.min(W, H) / 2 - 70) / maxR;
  const P = id => {
    const s = SYSTEMS[id], a = s.angle * Math.PI / 180, r = Math.sqrt(s.au) * sc;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
  };
  G.mapPos = P;

  ctx.strokeStyle = 'rgba(232,209,122,0.07)';
  ctx.lineWidth = (Math.sqrt(3.3) - Math.sqrt(2.2)) * sc;
  ctx.beginPath(); ctx.arc(cx, cy, (Math.sqrt(2.2) + Math.sqrt(3.3)) / 2 * sc, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = '#14243a';
  ctx.lineWidth = 1;
  for (const au of new Set(ids.map(id => SYSTEMS[id].au))) {
    ctx.beginPath(); ctx.arc(cx, cy, Math.sqrt(au) * sc, 0, Math.PI * 2); ctx.stroke();
  }
  const sun = ctx.createRadialGradient(cx, cy, 2, cx, cy, 22);
  sun.addColorStop(0, '#fff6d0');
  sun.addColorStop(0.4, '#ffc44a');
  sun.addColorStop(1, 'rgba(255,150,40,0)');
  ctx.fillStyle = sun;
  ctx.beginPath(); ctx.arc(cx, cy, 22, 0, Math.PI * 2); ctx.fill();

  const line = (a, b) => { const [x1, y1] = P(a), [x2, y2] = P(b); ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); };
  ctx.lineWidth = 3;
  if (G.transit) {
    ctx.strokeStyle = '#7fb4ff';
    ctx.setLineDash([6, 5]);
    line(st.systemId, G.transit.to);
    ctx.setLineDash([]);
  }
  if (st.dest) {
    ctx.strokeStyle = '#5fd35f';
    line(from, st.dest);
  }

  const missionSystems = new Set(st.missions.map(m => m.destSystem || m.targetSystem));
  ctx.textAlign = 'center';
  for (const id of ids) {
    const [x, y] = P(id), sys = SYSTEMS[id];
    ctx.globalAlpha = inRange(from, id) ? 1 : 0.35;
    ctx.fillStyle = GOV_COLORS[sys.gov];
    ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#cfe3ff';
    ctx.font = '13px monospace';
    ctx.fillText(sys.name, x, y + 26);
    ctx.globalAlpha = 1;
    if (id === from) {
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x, y, 13, 0, Math.PI * 2); ctx.stroke();
    }
    if (missionSystems.has(id)) {
      ctx.strokeStyle = '#ffa53a'; ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.arc(x, y, 18, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  ctx.textAlign = 'left';
  ctx.fillStyle = '#cfe3ff';
  ctx.font = 'bold 18px monospace';
  ctx.fillText('SYSTEM MAP', 24, 36);
  ctx.font = '13px monospace';
  ctx.fillStyle = '#9ab';
  ctx.fillText('Click a destination to plot a burn. M or Esc to close.', 24, 58);
  ctx.fillText('White ring: you. Orange: mission. Dim: beyond a full tank.', 24, 76);
  if (st.dest) {
    const need = burnFuel(from, st.dest);
    ctx.fillStyle = need > st.fuel ? '#ff7f7f' : '#5fd35f';
    ctx.fillText(`Burn to ${SYSTEMS[st.dest].name}: ${travelDays(from, st.dest)} days, ${need} reaction mass (you have ${st.fuel})`, 24, H - 24);
  } else {
    ctx.fillStyle = '#9ab';
    ctx.fillText('No burn plotted.', 24, H - 24);
  }
}

function render() {
  const { W, H } = G;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  if (G.mode === 'map') return drawMap(W, H);
  if (G.mode === 'transit') drawTransit(W, H); else drawWorld(W, H);
  drawHud(W, H);
}

// ---------- input & boot ----------

const KEYMAP = {
  ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
  ArrowUp: 'thrust', KeyW: 'thrust', ArrowDown: 'reverse', KeyS: 'reverse', Space: 'fire',
};

window.addEventListener('keydown', e => {
  if (KEYMAP[e.code]) { G.keys[KEYMAP[e.code]] = true; e.preventDefault(); }
  if (e.repeat) return;
  if (G.mode === 'flight') {
    if (e.code === 'KeyL') tryLand();
    else if (e.code === 'KeyJ') tryBurn();
    else if (e.code === 'KeyM') openMap();
    else if (e.code === 'Tab') { e.preventDefault(); cycleTarget(); }
  } else if (G.mode === 'transit') {
    if (e.code === 'KeyM' && !G.transit.event) openMap();
  } else if (G.mode === 'map') {
    if (e.code === 'KeyM' || e.code === 'Escape') closeMap();
  } else if (G.mode === 'landed') {
    if (e.code === 'KeyT') takeOff();
  }
});
window.addEventListener('keyup', e => { if (KEYMAP[e.code]) G.keys[KEYMAP[e.code]] = false; });
window.addEventListener('blur', () => { G.keys = {}; });

canvas.addEventListener('click', e => {
  if (G.mode !== 'map' || !G.mapPos) return;
  for (const id of Object.keys(SYSTEMS)) {
    const [x, y] = G.mapPos(id);
    if (Math.hypot(e.clientX - x, e.clientY - y) < 16) {
      G.state.dest = id === (G.transit ? G.transit.to : G.state.systemId) ? null : id;
      return;
    }
  }
});

function resize() {
  const dpr = window.devicePixelRatio || 1;
  G.W = window.innerWidth; G.H = window.innerHeight;
  canvas.width = G.W * dpr; canvas.height = G.H * dpr;
  canvas.style.width = G.W + 'px'; canvas.style.height = G.H + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', resize);

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (['flight', 'departing', 'transit', 'dead'].includes(G.mode)) update(dt);
  render();
  requestAnimationFrame(frame);
}

resize();
initStars();
if (loadSave()) loadGame(); else newGame();
requestAnimationFrame(frame);
