'use strict';

// Core game: state, flight physics, AI, combat, burns between locations, and rendering.

const HUD_W = 220;          // sidebar width on wide screens; phones get a top strip
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
  bar: [],            // procedural crew looking for work at the current planet
  revenge: null,      // someone who hates you has hired a gun, see people.js
  mode: 'landed',     // landed | flight | departing | transit | hail | map | dead
  dialog: null,       // open choice dialog (transit event or hail), see transit.js
  mapReturn: null,
  keys: {},
  navPlanet: null,
  target: null,
  burnAngle: 0, departTimer: 0,
  transit: null,      // burn in progress, see transit.js
  transitStars: null,
  flash: 0, shake: 0, time: 0, spawnTimer: 0,
  stars: [], W: 0, H: 0, hudW: HUD_W, mapPos: null,
};

// ---------- helpers ----------

const rand = (a, b) => a + Math.random() * (b - a);
const randInt = (a, b) => Math.floor(rand(a, b + 1));
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const fmt = n => Math.round(n).toLocaleString('en-US');
const wrapAngle = a => Math.atan2(Math.sin(a), Math.cos(a));
const system = (id = G.state.systemId) => SYSTEMS[id];
const ship = () => shipStats(G.state.shipId);  // the player's ship, outfits included
const statsOf = o => (o === G.player ? ship() : SHIPS[o.shipId]);
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
// Crew perks: a pilot shortens burns, an engineer (and Rosa's drive tuning) saves mass.
const baseDays = (a, b) => Math.round(2 + 3 * Math.pow(distAU(a, b), 0.7));
const travelDays = (a, b) => Math.max(1, Math.round(baseDays(a, b) * (1 - 0.07 * roleSkill('pilot'))));
const burnFuel = (a, b) => Math.round((30 + 60 * Math.sqrt(distAU(a, b)))
  * (1 - 0.05 * roleSkill('engineer')) * (G.state.flags.rosaTuned ? 0.9 : 1));
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
  return Math.round(c.base * PRICE_MULT[level] * wobble * (rumor ? rumor.mult : 1) * storyPriceMult(planet, cid));
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
    crew: [], flags: {}, people: {}, nextPid: 1, rep: {}, outfits: {},
    story: { stage: 0, next: STORY_START_DAY, log: [] },
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
  G.state.people = G.state.people || {};  // saves from before procedural people
  G.state.nextPid = G.state.nextPid || 1;
  G.state.rep = G.state.rep || {};        // saves from before factions and outfitting
  G.state.outfits = G.state.outfits || {};
  G.state.story = G.state.story || { stage: 0, next: STORY_START_DAY, log: [] };  // saves from before the story
  resetWorld();
  landAt(currentPlanet(), ['Save loaded. Welcome back, captain.']);
}

function resetWorld() {
  G.player = null; G.npcs = []; G.shots = []; G.particles = []; G.target = null; G.navPlanet = null;
}

// ---------- ships ----------

// A hull's stats with the player's outfits applied. Outfits use up cargo space.
function shipStats(shipId) {
  const s = { ...SHIPS[shipId], dmgMult: 1, spoofer: false };
  for (const [id, count] of Object.entries(G.state.outfits)) {
    for (let i = 0; i < count; i++) {
      OUTFITS[id].mod(s);
      s.cargo -= OUTFITS[id].space;
    }
  }
  return s;
}

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
  const s = statsOf(o);
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

// `hits` says who a shot can hit: 'npcs' for the player's shots, 'player' for ships
// attacking the player, 'pirates' for patrols fighting pirates.
function fire(o, hits = 'player') {
  if (o.cooldown > 0) return;
  const isPlayer = o === G.player;
  o.cooldown = isPlayer ? 0.22 : 0.35;
  const s = SHIPS[o.shipId], guns = isPlayer ? playerGuns() : s.guns;
  const dmg = isPlayer ? SHOT_DMG * ship().dmgMult : SHOT_DMG;
  for (let i = 0; i < guns; i++) {
    const a = o.angle + (i - (guns - 1) / 2) * 0.08;
    G.shots.push({
      x: o.x + Math.cos(a) * s.size, y: o.y + Math.sin(a) * s.size,
      vx: o.vx + Math.cos(a) * SHOT_SPEED, vy: o.vy + Math.sin(a) * SHOT_SPEED,
      life: SHOT_LIFE, fromPlayer: isPlayer, hits: isPlayer ? 'npcs' : hits, dmg,
      team: isPlayer ? 'player' : hits === 'player' ? 'hostile' : 'ally',
    });
  }
  const m = s.size * 1.9;  // muzzle flash at the nose
  G.particles.push({ type: 'flash', x: o.x + Math.cos(o.angle) * m, y: o.y + Math.sin(o.angle) * m, vx: o.vx, vy: o.vy, life: 0.06, max: 0.06, size: 7 });
}

function burst(x, y, count, colors, speed) {
  for (let i = 0; i < count; i++) {
    const a = rand(0, Math.PI * 2), v = rand(0.2, 1) * speed, life = rand(0.3, 1.1);
    G.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life, max: life, color: pick(colors) });
  }
}

function damage(o, d, byPlayer = false) {
  const absorbed = Math.min(o.shields, d);
  o.shields -= absorbed;
  o.armor -= d - absorbed;
  if (absorbed) o.shieldFlash = G.time;
  burst(o.x, o.y, absorbed ? 3 : 6, absorbed ? ['#8cf', '#fff'] : ['#fc6', '#f80', '#fff'], absorbed ? 120 : 180);
  if (o === G.player && d > absorbed) shake(3);
  if (o.armor <= 0) destroy(o, byPlayer);
}

// Rewards, standing, and memory only follow kills the player made.
function destroy(o, byPlayer = false) {
  explode(o);
  if (G.player) shake(Math.max(0, 10 - dist(o, G.player) / 60));
  if (o === G.player) {
    o.dead = true;
    G.mode = 'dead';
    setTimeout(() => UI.showDead(), 1500);
    return;
  }
  o.dead = true;
  const st = G.state;
  if (o.persona && o.persona.id) delete st.people[o.persona.id];  // a known captain, gone for good
  if (!byPlayer) {
    if (o.kind === 'pirate' || o.enemy) msg(`${o.name} destroyed.`);
    return;
  }
  if (o.story) {
    msg(`${o.name} destroyed. Aquilon will not be happy.`);
    return;
  }
  if (o.bountyId) {
    const i = st.missions.findIndex(m => m.id === o.bountyId);
    if (i >= 0) {
      const m = st.missions[i];
      st.credits += m.pay;
      st.missions.splice(i, 1);
      msg(`Bounty complete: ${m.targetName} destroyed. +${fmt(m.pay)} cr`);
      changeRep(m.issuer, 5);
      changeRep('Pirate', -3);
    }
  } else if (o.kind === 'pirate') {
    const b = randInt(2, 6) * 100;
    st.credits += b;
    msg(`Pirate destroyed. Bounty +${b} cr`);
    if (localGov() !== 'Pirate') changeRep(localGov(), 1);
    changeRep('Pirate', -2);
  } else if (o.kind === 'patrol') {
    msg(`${o.name} destroyed.`);
    changeRep(o.gov, -25);
  } else {
    msg(`${o.name} destroyed.`);
    changeRep(localGov(), -10);
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

// `fresh` skips known captains, for one-off ships like bounty targets and hired guns.
function spawnNpc(kind, atPlanet, fresh = false) {
  const sys = system();
  let x, y, from = null;
  if (atPlanet) {
    from = pick(sys.planets);
    x = from.x; y = from.y;
  } else {
    const a = rand(0, Math.PI * 2);
    x = Math.cos(a) * 1800; y = Math.sin(a) * 1800;
  }
  const known = !fresh && pickKnownCaptain(kind);
  const shipId = known ? known.ship.shipId
    : kind === 'pirate' ? (Math.random() < 0.7 ? 'raider' : 'corsair')
    : kind === 'patrol' ? 'cutter' : pick(['shuttle', 'courier', 'freighter']);
  const n = makeShip(shipId, x, y, rand(0, Math.PI * 2));
  n.kind = kind;
  if (known) {
    // A captain you have met before, who remembers you.
    n.persona = known;
    n.name = known.ship.name;
    n.hostile = kind === 'pirate' ? known.opinion < 3 : known.opinion <= -4;
    if (Math.abs(known.opinion) >= 2) msg(`Sensors: the ${n.name} (Capt. ${known.first} ${known.last}, ${opinionWord(known.opinion)}) is in local space.`);
  } else {
    // Wren's ghost transponder, or trust among pirates, can keep a pirate off your back.
    n.hostile = kind === 'pirate' && !(G.state.flags.ghost && Math.random() < 0.5)
      && !(repOf('Pirate') >= 15 && Math.random() < 0.6);
    n.name = kind === 'patrol' ? `${PATROL_NAMES[sys.gov]} "${shipName(false)}"`
      : `${kind === 'pirate' ? 'Pirate ' : ''}"${shipName(kind === 'pirate')}"`;
    n.persona = makePerson(cultureOf(G.state.systemId));  // the captain, for hails
  }
  n.captain = `${n.persona.first} ${n.persona.last}`;
  if (kind === 'patrol') {
    n.gov = sys.gov;
    n.hostile = repOf(sys.gov) <= -15;
  }
  n.goal = pickGoal(sys, from);
  if (!atPlanet) {
    n.angle = Math.atan2(n.goal.y - y, n.goal.x - x);
    n.vx = Math.cos(n.angle) * 150; n.vy = Math.sin(n.angle) * 150;
  }
  G.npcs.push(n);
  return n;
}

function spawnBountyTarget(m) {
  const n = spawnNpc('pirate', false, true);
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
  if (PATROL_NAMES[sys.gov] && Math.random() < 0.7) spawnNpc('patrol', Math.random() < 0.5);
  if (Math.random() < sys.pirates) {
    const pirates = randInt(1, 2);
    for (let i = 0; i < pirates; i++) spawnNpc('pirate', false);
  }
  if (G.revenge) {
    const p = G.revenge, n = spawnNpc('pirate', false, true);
    Object.assign(n, { shipId: 'corsair', hostile: true, name: 'Hired gun', payer: `${p.first} ${p.last}` });
    n.shields = SHIPS.corsair.shields;
    n.armor = n.maxArmor = SHIPS.corsair.armor;
    msg(`A ship is closing fast. The captain says ${p.first} ${p.last} sends regards.`);
    G.revenge = null;
  }
  for (const m of G.state.missions) {
    if (m.type === 'bounty' && m.targetSystem === G.state.systemId) {
      spawnBountyTarget(m);
      msg(`Sensors detect ${m.targetName} in local space.`);
    }
  }
  storyInSystem();
  G.spawnTimer = 15;
}

// What a ship hunts besides the player: 'pirates', or at the Ceres blockade 'enemy'
// (for the player's allies) and 'ally' (for the enemy fleet).
const huntsFor = n => n.hunts || (n.enemy ? 'ally' : n.kind === 'patrol' && !n.blockade ? 'pirates' : null);
function preyOf(hunts, o) {
  if (o.dead) return false;
  if (hunts === 'pirates') return o.kind === 'pirate' && o.hostile;
  if (hunts === 'enemy') return !!o.enemy;
  return hunts === 'ally' && o.kind === 'ally';
}

function updateNpc(n, dt) {
  const p = G.player;
  const pd = p && !p.dead && G.mode === 'flight' ? dist(n, p) : Infinity;
  let tx, ty, attacking = false;

  // Who this ship is fighting: the nearer of the player (if hostile and close) and the
  // nearest ship it hunts (patrols hunt pirates; at Ceres, the two fleets hunt each other).
  let foe = n.hostile && pd < 1600 ? p : null;
  const hunts = huntsFor(n);
  if (hunts) {
    const prey = G.npcs.filter(o => preyOf(hunts, o) && dist(o, n) < 1500)
      .sort((a, b) => dist(a, n) - dist(b, n))[0];
    if (prey && (!foe || dist(prey, n) < pd)) foe = prey;
  }
  const fd = foe ? dist(n, foe) : Infinity;

  if (foe) {
    if (foe === p && n.kind === 'pirate' && pd < 1400) pirateDemand(n);
    if (foe === p && n.blockade && pd < 1400) blockadeWarning(n);
    else if (foe === p && n.kind === 'patrol' && pd < 1400) patrolWarning(n);
    if (foe === p && n.kind === 'agent' && pd < 1400) agentWarning(n);
    if (n.armor < n.maxArmor * 0.25 && !n.bountyId && n.kind !== 'patrol') {
      tx = n.x * 2 - foe.x; ty = n.y * 2 - foe.y;   // flee directly away
    } else {
      const lead = fd / SHOT_SPEED;
      tx = foe.x + (foe.vx - n.vx) * lead; ty = foe.y + (foe.vy - n.vy) * lead;
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
  n.thrusting = off < 0.6 && (!attacking || fd > 250);
  if (attacking && off < 0.2 && fd < 650) fire(n, foe === p ? 'player' : hunts);
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
  if (repOf(localGov()) <= -50 && !storyDockingOverride(n.pl)) {
    msg(`Docking denied. The ${localGov() === 'Pirate' ? 'pirates here' : localGov()} will not let your ship land.`);
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
    changeRep(localGov(), m.contract ? 4 : 2);
    if (m.type === 'delivery') {
      st.credits += m.pay;
      msg(`Delivered ${m.tons}t of ${m.good}. Payment received: ${fmt(m.pay)} cr.`);
    } else {
      if (m.pid) {
        const p = st.people[m.pid];
        p.location = planet.name;
        like(p, 1, `You got me to ${planet.name}.`);
      }
      const fare = Math.max(0, m.pay + m.bonus);
      st.credits += fare;
      msg(`${m.who[0].toUpperCase()}${m.who.slice(1)} ${m.pax > 1 ? 'disembark' : 'disembarks'}.${fare ? ` Fare received: ${fmt(fare)} cr${m.bonus ? ` (${m.bonus > 0 ? '+' : '-'}${fmt(Math.abs(m.bonus))} for the trip)` : ''}.` : ''}`);
    }
    return false;
  });
  expireMissions();
  for (const c of crewMembers().filter(c => c.id && c.opinion <= -4)) {
    leaveCrew(c.id);
    c.location = planet.name;
    msg(`${fullName(c)} has had enough of you and your ship, and walks off at ${planet.name}.`);
  }
  landAt(planet, G.messages.slice(before).map(m => m.text));
}

function landAt(planet, notes) {
  G.mode = 'landed';
  G.shots = [];
  G.flash = 0;
  G.offers = generateMissions(planet);
  G.bar = planet.services.includes('missions') || planet.services.includes('shipyard')
    ? Array.from({ length: randInt(1, 3) }, () => makeCrewCandidate(G.state.systemId)) : [];
  notes = notes.concat(meetContacts(planet));
  save();
  UI.openLanded(planet, notes);
  storyOnLanding(planet);
}

function takeOff() {
  const pl = currentPlanet();
  const a = rand(0, Math.PI * 2);
  G.player = makeShip(G.state.shipId, pl.x + Math.cos(a) * pl.r * 0.5, pl.y + Math.sin(a) * pl.r * 0.5, a);
  const s = ship();
  Object.assign(G.player, { armor: G.state.armor, maxArmor: s.armor, shields: s.shields });
  G.mode = 'flight';
  G.navPlanet = null;
  populateSystem();
  storyOnTakeoff();
  UI.hide();
}

function expireMissions() {
  const st = G.state;
  st.missions = st.missions.filter(m => {
    if (st.day <= m.deadline) return true;
    msg(`Mission failed (deadline passed): ${m.title}`);
    if (m.pid) {
      like(st.people[m.pid], -3, 'You never got me where I was going.');
      st.people[m.pid].location = st.planet;
    }
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
      const days = daysTo(destSystem), deadline = day + Math.ceil(days * 1.5) + randInt(2, 6);
      if (dest === planet) continue;
      // Mostly procedural travelers, occasionally one of the handcrafted groups.
      const pid = pick(Object.keys(PASSENGERS)), P = PASSENGERS[pid];
      if (Math.random() < 0.2 && ![...offers, ...G.state.missions].some(m => m.passenger === pid)) {
        offers.push({
          type: 'passenger', passenger: pid, who: P.name, pax: P.pax, bonus: 0, destSystem, destPlanet: dest.name,
          title: `Carry ${P.name} (${P.pax}) to ${dest.name}`,
          pay: Math.round((1500 + days * 400) * P.fare), deadline,
        });
      } else {
        offers.push(makePassengerOffer(here, destSystem, dest, days, deadline));
      }
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
        type: 'bounty', targetSystem, targetName, issuer: localGov(),
        title: `Bounty: destroy ${targetName} near ${SYSTEMS[targetSystem].name}`,
        pay: randInt(8, 16) * 1000,
        deadline: day + daysTo(targetSystem) * 2 + 10,
      });
    }
  }
  // Captains the local government trusts are offered a better-paid contract.
  const gov = localGov(), job = offers.find(o => o.type === 'delivery');
  if (job && gov !== 'Pirate' && repOf(gov) >= 15) {
    Object.assign(job, { contract: true, pay: Math.round(job.pay * 1.6), title: `${gov} contract: ${job.title.toLowerCase()}` });
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
  Touch.steer(p, dt);
  if (k.fire) fire(p);
  physics(p, dt);
}

function updateShots(dt) {
  const p = G.player;
  for (const sh of G.shots) {
    sh.x += sh.vx * dt; sh.y += sh.vy * dt; sh.life -= dt;
    if (sh.hits === 'player') {
      if (p && !p.dead && dist(sh, p) < SHIPS[p.shipId].size + 2) {
        p.hitAngle = Math.atan2(sh.y - p.y, sh.x - p.x);
        damage(p, sh.dmg);
        sh.life = 0;
      }
      continue;
    }
    for (const n of G.npcs) {
      if (n.dead || (sh.hits !== 'npcs' && !preyOf(sh.hits, n)) || dist(sh, n) >= SHIPS[n.shipId].size + 2) continue;
      if (sh.hits === 'npcs') {
        n.hostile = true;
        if (!n.wasShot) {
          n.wasShot = true;
          feel(n, -2, 'You shot at my ship.');
          if (n.kind === 'patrol') changeRep(n.gov, -8);
          else if (n.kind === 'trader') changeRep(localGov(), -3);
        }
      }
      n.hitAngle = Math.atan2(sh.y - n.y, sh.x - n.x);
      damage(n, sh.dmg, sh.hits === 'npcs');
      sh.life = 0;
      break;
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
  for (const pt of G.particles) {
    pt.x += pt.vx * dt; pt.y += pt.vy * dt; pt.life -= dt;
    if (pt.spin) pt.rot += pt.spin * dt;
    if (pt.grow) pt.size += pt.grow * dt;
  }
  // Badly damaged ships trail smoke.
  for (const o of [...G.npcs, G.player]) {
    if (o && !o.dead && o.armor < o.maxArmor * 0.35 && Math.random() < dt * 14) {
      G.particles.push({ type: 'smoke', x: o.x + rand(-4, 4), y: o.y + rand(-4, 4), vx: o.vx * 0.3 + rand(-15, 15), vy: o.vy * 0.3 + rand(-15, 15), life: 1.2, max: 1.2, size: 3, grow: 10 });
    }
  }
  G.shake = Math.max(0, G.shake - dt * 25);
  G.particles = G.particles.filter(pt => pt.life > 0);
  G.npcs = G.npcs.filter(n => !n.dead);
  if (G.target && G.target.dead) G.target = null;
  if (G.flash > 0) G.flash -= dt * 2;

  if (G.mode === 'flight' && (G.spawnTimer -= dt) <= 0) {
    G.spawnTimer = rand(10, 20);
    if (G.npcs.length < 6) {
      if (Math.random() < system().pirates * 0.5) spawnNpc('pirate', false);
      else if (PATROL_NAMES[localGov()] && Math.random() < 0.25) spawnNpc('patrol', Math.random() < 0.5);
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

function npcColor(n) {
  if (n.bountyId) return '#ff2d6f';
  if (n.hostile) return '#ff5f5f';
  return n.kind === 'patrol' ? '#7fb4ff' : '#e8d17a';
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
  const viewW = W - G.hudW, p = G.player;
  const cam = p || currentPlanet();
  const toScreen = o => [o.x - cam.x + viewW / 2, o.y - cam.y + H / 2];

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, viewW, H);
  ctx.clip();
  if (G.shake) ctx.translate(rand(-G.shake, G.shake), rand(-G.shake, G.shake));

  drawStars(cam, viewW, H, p ? { x: p.vx, y: p.vy } : { x: 0, y: 0 });
  drawBackdrop(cam, viewW, H);

  system().planets.forEach((pl, i) => {
    const [x, y] = toScreen(pl);
    drawBody(pl, x, y);
    ctx.fillStyle = '#9ab';
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(pl.name, x, y + pl.r + 16);
    if (G.navPlanet === i) drawBrackets(x, y, pl.r + 10, '#5fd35f');
  });

  for (const n of G.npcs) drawShip(n, npcColor(n), toScreen);
  if (p && !p.dead) drawShip(p, '#9fe0ff', toScreen);

  for (const pt of G.particles) drawParticle(pt, ...toScreen(pt));
  for (const sh of G.shots) drawShot(sh, ...toScreen(sh));

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

  // Message log, bottom-left, above the touch controls when they are showing.
  ctx.font = '13px monospace';
  ctx.textAlign = 'left';
  const bottom = H - 16 - (Touch.on && G.mode === 'flight' ? 220 : 0);
  const lines = G.messages.filter(m => G.time - m.t < 10).slice(-6)
    .flatMap(m => wrapText(m.text, viewW - 28).map(l => ({ l, m }))).slice(-8);
  lines.forEach(({ l, m }, i) => {
    ctx.globalAlpha = Math.min(1, (10 - (G.time - m.t)) / 2);
    ctx.fillStyle = '#cfe3ff';
    ctx.fillText(l, 14, bottom - (lines.length - 1 - i) * 17);
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

function drawRadar(rx, ry, R) {
  const p = G.player, scale = R / 2500, center = p || currentPlanet();
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
  for (const pl of system().planets) blip(pl, '#4a7a4a', R > 50 ? 6 : 4, true);
  for (const n of G.npcs) blip(n, npcColor(n), 3, false);
  if (p) blip(p, '#fff', 3, false);
}

// Phones: a compact strip across the top instead of the sidebar.
function drawHudCompact(W) {
  const p = G.player, st = G.state, s = ship(), sys = system(), inTransit = G.mode === 'transit';
  const h = 78, R = 32, rx = W - R - 12;
  ctx.fillStyle = 'rgba(8,16,24,0.88)';
  ctx.fillRect(0, 0, W, h);
  ctx.fillStyle = '#23405f';
  ctx.fillRect(0, h, W, 1);
  if (!inTransit) drawRadar(rx, h / 2, R);
  const x = 12, w = (inTransit ? W - 12 : rx - R - 14) - x;
  ctx.textAlign = 'left';
  ctx.font = 'bold 13px monospace';
  ctx.fillStyle = inTransit ? '#7fb4ff' : GOV_COLORS[sys.gov];
  ctx.fillText(inTransit ? `To ${SYSTEMS[G.transit.to].name}` : sys.name, x, 17);
  ctx.font = '11px monospace';
  ctx.fillStyle = '#9ab';
  ctx.textAlign = 'right';
  ctx.fillText(`Day ${st.day}  ${fmt(st.credits)} cr`, x + w, 17);
  ctx.textAlign = 'left';
  const bars = [['SHD', p ? p.shields : s.shields, s.shields, '#4aa3ff'], ['ARM', p ? p.armor : st.armor, p ? p.maxArmor : s.armor, '#ff9a3c'], ['RM', st.fuel, s.fuel, '#5fd35f']];
  bars.forEach(([label, v, max, color], i) => {
    const y = 26 + i * 12;
    ctx.fillStyle = '#9ab';
    ctx.fillText(label, x, y + 7);
    ctx.fillStyle = '#1a2533';
    ctx.fillRect(x + 30, y, w - 30, 7);
    ctx.fillStyle = color;
    ctx.fillRect(x + 30, y, (w - 30) * Math.max(0, Math.min(1, v / max)), 7);
  });
  ctx.fillStyle = '#cfe3ff';
  const from = G.transit ? G.transit.to : st.systemId;
  const burn = st.dest ? ` · Burn ${SYSTEMS[st.dest].name} ${travelDays(from, st.dest)}d/${burnFuel(from, st.dest)}rm` : '';
  ctx.fillText(wrapText(`Cargo ${cargoUsed()}/${s.cargo}t${burn}`, w)[0], x, 72);
  if (G.target && p && !inTransit) {
    ctx.fillStyle = npcColor(G.target);
    ctx.fillText(wrapText(`Target: ${G.target.name}, ${Math.round(dist(G.target, p))} out`, W - 24)[0], x, h + 16);
  }
}

function drawHud(W, H) {
  if (!G.hudW) return drawHudCompact(W);
  const x0 = W - HUD_W, p = G.player, st = G.state, s = ship(), sys = system();
  const inTransit = G.mode === 'transit';
  ctx.fillStyle = '#081018';
  ctx.fillRect(x0, 0, HUD_W, H);
  ctx.fillStyle = '#23405f';
  ctx.fillRect(x0, 0, 2, H);
  if (!inTransit) drawRadar(x0 + HUD_W / 2, 110, 95);
  else {
    ctx.fillStyle = '#02070c';
    ctx.strokeStyle = '#23405f';
    ctx.beginPath(); ctx.arc(x0 + HUD_W / 2, 110, 95, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
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
    for (const l of wrapText(t.name, w)) ctx.fillText(l, x, y += 16);
    ctx.fillStyle = '#9ab';
    for (const l of wrapText(`${SHIPS[t.shipId].name}${t.captain ? `, Capt. ${t.captain}` : ''}`, w)) ctx.fillText(l, x, y += 16);
    ctx.fillText(`Dist ${Math.round(dist(t, p))}`, x, y += 16);
    y += 14;
    ctx.fillStyle = '#1a2533'; ctx.fillRect(x, y, w, 5); ctx.fillRect(x, y + 8, w, 5);
    ctx.fillStyle = '#4aa3ff'; ctx.fillRect(x, y, w * Math.max(0, t.shields / SHIPS[t.shipId].shields), 5);
    ctx.fillStyle = '#ff9a3c'; ctx.fillRect(x, y + 8, w * Math.max(0, t.armor / t.maxArmor), 5);
  } else {
    ctx.fillStyle = '#cfe3ff';
    ctx.fillText('none (Tab)', x, y += 16);
  }

  if (Touch.on) return;
  ctx.fillStyle = '#56687a';
  ctx.font = '11px monospace';
  const help = ['Arrows/WASD fly', 'S/Down  reverse', 'Space   fire', 'Tab     target', 'H  hail target', 'L  select / land', 'M  system map', 'J  burn'];
  help.forEach((h, i) => ctx.fillText(h, x, H - 14 - (help.length - 1 - i) * 14));
}

function drawMap(W, H) {
  ctx.fillStyle = '#050a12';
  ctx.fillRect(0, 0, W, H);
  const ids = Object.keys(SYSTEMS), st = G.state;
  const from = G.transit ? G.transit.to : st.systemId;

  // Logarithmic radial scale, so the inner planets are not a smudge next to Neptune,
  // even on a phone.
  const mr = au => Math.log(1 + au * 1.5);
  const maxR = mr(Math.max(...ids.map(id => SYSTEMS[id].au)));
  const narrow = W < 700;
  const cx = W / 2, cy = H / 2 + (narrow ? 20 : 10), sc = (Math.min(W, H) / 2 - (narrow ? 44 : 70)) / maxR;
  const P = id => {
    const s = SYSTEMS[id], a = s.angle * Math.PI / 180, r = mr(s.au) * sc;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
  };
  G.mapPos = P;

  ctx.strokeStyle = 'rgba(232,209,122,0.07)';
  ctx.lineWidth = (mr(3.3) - mr(2.2)) * sc;
  ctx.beginPath(); ctx.arc(cx, cy, (mr(2.2) + mr(3.3)) / 2 * sc, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = '#14243a';
  ctx.lineWidth = 1;
  for (const au of new Set(ids.map(id => SYSTEMS[id].au))) {
    ctx.beginPath(); ctx.arc(cx, cy, mr(au) * sc, 0, Math.PI * 2); ctx.stroke();
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
    ctx.font = narrow ? '12px monospace' : '13px monospace';
    if (narrow) {
      // Beside the dot, pointing away from the Sun, so crowded inner planets stay readable.
      const right = x >= cx;
      ctx.textAlign = right ? 'left' : 'right';
      ctx.fillText(sys.name, x + (right ? 16 : -16), y + 4);
      ctx.textAlign = 'center';
    } else {
      ctx.fillText(sys.name, x, y + 26);
    }
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
  ctx.fillText('SYSTEM MAP', 16, 36);
  ctx.font = narrow ? '12px monospace' : '13px monospace';
  ctx.fillStyle = '#9ab';
  const help = `${Touch.on ? 'Tap' : 'Click'} a destination to plot a burn.${Touch.on ? '' : ' M or Esc to close.'} White ring: you. Orange: mission. Dim: beyond a full tank.`;
  let y = 42;
  for (const l of wrapText(help, W - (narrow ? 150 : 48))) ctx.fillText(l, 16, y += 16);
  let status = 'No burn plotted.';
  ctx.fillStyle = '#9ab';
  if (st.dest) {
    const need = burnFuel(from, st.dest);
    ctx.fillStyle = need > st.fuel ? '#ff7f7f' : '#5fd35f';
    status = `Burn to ${SYSTEMS[st.dest].name}: ${travelDays(from, st.dest)} days, ${need} reaction mass (you have ${st.fuel})`;
  }
  const lines = wrapText(status, W - 32);
  lines.forEach((l, i) => ctx.fillText(l, 16, H - 20 - (lines.length - 1 - i) * 16));
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
    else if (e.code === 'KeyH') tryHail();
    else if (e.code === 'Tab') { e.preventDefault(); cycleTarget(); }
  } else if (G.mode === 'transit') {
    if (e.code === 'KeyM' && !G.transit.event) openMap();
  } else if (G.mode === 'hail') {
    if (e.code === 'Escape') finishEvent();
  } else if (G.mode === 'map') {
    if (e.code === 'KeyM' || e.code === 'Escape') closeMap();
  } else if (G.mode === 'landed') {
    if (e.code === 'KeyT' && !G.dialog) takeOff();
  }
});
window.addEventListener('keyup', e => { if (KEYMAP[e.code]) G.keys[KEYMAP[e.code]] = false; });
window.addEventListener('blur', () => { G.keys = {}; });

canvas.addEventListener('click', e => {
  // In flight, tap or click a ship to target it, or a planet to set it as the nav target.
  if (G.mode === 'flight') {
    const p = G.player, at = { x: e.clientX - (G.W - G.hudW) / 2 + p.x, y: e.clientY - G.H / 2 + p.y };
    const hit = G.npcs.find(n => dist(n, at) < SHIPS[n.shipId].size + 18);
    if (hit) { G.target = hit; return; }
    const i = system().planets.findIndex(pl => dist(pl, at) < pl.r + 10);
    if (i >= 0) { G.navPlanet = i; msg(`Nav target: ${system().planets[i].name}.`); }
    return;
  }
  if (G.mode !== 'map' || !G.mapPos) return;
  for (const id of Object.keys(SYSTEMS)) {
    const [x, y] = G.mapPos(id);
    if (Math.hypot(e.clientX - x, e.clientY - y) < (Touch.on ? 26 : 16)) {
      G.state.dest = id === (G.transit ? G.transit.to : G.state.systemId) ? null : id;
      return;
    }
  }
});

function resize() {
  const dpr = window.devicePixelRatio || 1;
  G.W = window.innerWidth; G.H = window.innerHeight;
  G.hudW = G.W >= 700 ? HUD_W : 0;
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
  Touch.sync();
  requestAnimationFrame(frame);
}

resize();
initStars();
Touch.build();
if (loadSave()) loadGame(); else newGame();
requestAnimationFrame(frame);
