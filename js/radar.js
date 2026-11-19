'use strict';

// The ship fight on the radar: its rules (docs/superpowers/specs/2026-11-16-radar-ship-fight-design.md, plan Part 1, #1344). Pure, as fight.js is: it reads no G,
// changes nothing it is given and takes its dice as `rand`; each call takes the fight's state and returns the next with the facts of the step. Space is km on a
// plane centred where the fight began, our ship first in `ships`; a direction is in degrees clockwise from the top of the radar. Time is fixed steps, SUB to an
// order cycle of TURN_S seconds, each resolved in one order (move, sensors, fire control, fire, point defence, damage), so that how a fight is advanced (a cycle
// at once, small frames at 16x, a pause between) does not change it. The scene is radarui.js. Loaded after fight.js.

const RADAR = {
  TURN_S: 20,          // seconds of fight time in an order cycle: orders, power and comms are set a cycle at a time
  SUB: 24,             // fixed steps in a cycle, whatever the speed it is watched at
  SPEEDS: [1, 2, 16],  // the speeds a fight is watched at (pause aside); it opens at the last
  MEET: 250,           // km: where she is met on the long opening
  MEET_SHORT: 40,      // km: where she is met on the short opening (a contact today's fight starts close, range.js, engagements.js)
  CLOSING: 12,         // km a cycle she closes from the meeting
  JINK: 60,            // km: she jinks only inside this
  ESCAPE: 400,         // km: opening past this is away
  ZOOM: [50, 150, 400],  // km from our ship to the radar's edge, at its three zooms
  TURN: 90,            // degrees the hull turns in a cycle, at most
  GATE: 30,            // degrees off the burn's direction inside which the drive lights
  ACCEL: 0.02,         // km/s/s at full throttle on two units of drive power (the builder's: a 20 s burn is 0.4 km/s, 8 km a cycle)
  BEAR: 30,            // degrees off the nose inside which the gun bears
  FALLOFF: [[30, 0.5], [20, 0.75]],  // km past which a shot does this share of its damage (the farther band first)
  AIM_BANDS: [[5, 'knife'], [12, 'close'], [30, 'mid']],  // km under which a range counts as this band for FIGHT.AIM_MULT; beyond, long
  HIT_R: 0.5,          // km: a shot that lands within this of her true position hits (tuned, #1347: at 1 every shot inside 25 km hit, and range, level and sensors did not matter)
  SPREAD_KM: 0.02,     // km of spread per km of range, for a gunner at level 0 (the builder's: about 2 km at 100 km)
  SPREAD_BURN: 1,      // km of spread per km/s of the shooter's speed across the line, relative to the target's, both sides' (tuned, #1347)
  SPREAD_LEVEL: 0.12,  // the share of the spread each gunner level takes off (the builder's: level 5 has 40% of level 0's)
  PDC_R: 9,            // km: the point defence's reach
  PDC_KILL: 7,         // the PDC's kill: 1 - e^-(km through the arc x this / the arc's width in degrees), so 9 km through a 90-degree arc is about even
  TORP_LAUNCH: 165,    // km: from about here her torpedoes are launched
  SALVO_EVERY: 4,      // cycles between a corsair's arming and her next (tuned, #1347) (the old fight's FIGHT.SALVO_EVERY was in turns, which are longer)
  TORP_SPEED: 2.1,     // km/s a torpedo makes good: from TORP_LAUNCH in about four cycles
  TORP_HIT: 0.5,       // km: a torpedo that passes within this of its target hits it
  POWER: 6,            // units across drive, guns and the PDC
  HEAT_CAP: 5,         // heat over this locks the gun until it bleeds off
  ERROR: [0.5, 1.25],  // km: the board's error on her at full sensors and at 40% (the stock fire control); between and below, straight through them
  ACCURACY: 0.25,      // km: the error with the accuracy upgrade at full sensors (Task 5 takes the rest of fire control)
  RESILIENT: 0.7,      // km: the error at 40% sensors with the resilience upgrade
  GUN_PAUSE: 35,       // km: real time pauses once, as she comes into gun range
  BLIND: 12,           // km: a failed lock or spoof leaves the board blind past this for the cycle
  COAST: 10,           // km of the range to hold inside which the crew pilot coasts nose-on (6 closing to engage)
  COAST_ENGAGE: 6,
  SUGGEST: [0.35, 0.7],  // a suggestion to the captain taken at level 0 and at level 5
  TURNS: 50,           // cycles from the long opening before the less whole side breaks off (fewer from the short: radarCap)
  // her side (the builder's, from the spec's words, to be tuned in Part 4)
  HER_ACCEL: 0.02,     // km/s/s at full throttle; she points where she burns (no gate), which the builder takes as her crew's skill
  HELD: { raider: 0, corsair: 30, cutter: 25, destroyer: 25 },  // km each type works to: a raider comes alongside while her lock is whole
  LOCKLESS: 10,        // km a raider with her lock gone holds at, as today's closes only to close range
  ALONGSIDE: 1,        // km: a ship with her lock whole that comes within this of ours boards
  GUN_RANGE: 35,       // km: her guns fire inside this, once a cycle
  GUN_DMG: 2,          // a gun's damage on the radar, both sides', as a share of the old fight's (tuned, #1347) (FIGHT.GUN_DMG, FIGHT.FOE_DMG): a cycle is one shot a mount, where a turn was a volley
  GUN_POWER: 2,        // units of power at which our gun does its plain damage; more hits harder in proportion, less softer
  ANSWER_CLOSE: 1,     // km/s the answer policy closes on a ship with no torpedoes at (tools/answer.js), faster than the crew's CLOSING, braking to arrive
  JINK_OFF: 25,        // degrees off her line a pilot can burn and still keep the gun bearing on her (under BEAR and GATE): a jink that keeps shooting
  SCATTER: 20,         // degrees a crew pilot's burn can land off at level 0; none at level 5
  LOCK_AT: 0,          // km: inside this the gunner shoots a raider's lock as she comes alongside, her hull before it. 0, as measured (#1347): her hull is the better target at every range
  EVADE_SOON: 1.5      // cycles: a torpedo comms calls out that will hit inside this sends the captain to evade
};

const radarDt = () => RADAR.TURN_S / RADAR.SUB;
const radarClone = x => JSON.parse(JSON.stringify(x));
const radarNorm = d => ((d % 360) + 360) % 360;
const radarTurnBy = (from, to) => ((to - from + 540) % 360) - 180;  // the shortest turn from one direction to another, -180 to 180
const radarDir = (from, to) => radarNorm(Math.atan2(to.x - from.x, to.y - from.y) * 180 / Math.PI);
const radarDist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const radarUnit = d => ({ x: Math.sin(d * Math.PI / 180), y: Math.cos(d * Math.PI / 180) });

// A fight at the meeting: our ship at the centre and still, each foe on a bearing (0 with no `rand`; with it, from the dice, a pair's second a little
// round from the first) closing at CLOSING km a cycle. `me` and `foes` are shipSide's sides and `types` their kinds (FOE_TYPES); `fit` the fire-control
// upgrades; `sensors` the ship's sensors' condition, 0 to 1.
function radarFight({ me, foes, nerve, types = foes.map(() => 'raider'), opening = 'long', fit = { accuracy: false, resilience: false }, sensors = 1, rand = null }) {
  const at = opening === 'short' ? RADAR.MEET_SHORT : RADAR.MEET, closing = RADAR.CLOSING / RADAR.TURN_S, bearing = rand ? rand() * 360 : 0;
  const theirs = foes.map((f, i) => { const b = radarNorm(bearing + 12 * i), u = radarUnit(b); return { p: { x: u.x * at, y: u.y * at }, v: { x: -u.x * closing, y: -u.y * closing }, a: { x: 0, y: 0 }, facing: radarNorm(b + 180) }; });
  return {
    kind: 'radar', me: radarClone(me), foes: radarClone(foes), types: [...types], nerve, opening, fit: { ...fit }, sensors,
    t: 0, step: 0, cycle: 0, ships: [{ p: { x: 0, y: 0 }, v: { x: 0, y: 0 }, a: { x: 0, y: 0 }, facing: 0 }, ...theirs],
    torps: [], nextTorp: 1, heat: 0, locked: false, lockedAt: null, fired: 0, torpFired: false, order: 'hold', fc: 'gun', pdcArc: { dir: 0, width: 90 }, power: { drive: 2, guns: 2, pdc: 2 },
    foeOrders: [], armed: foes.map(() => false), herFired: foes.map(() => false), boarded: false, ranged: false,
    struck: false,  // her guns have hit us this fight
    lockOn: false, spoofing: false, herSpoof: false, blind: false,  // this cycle's comms: our lock on her, our spoof, her spoof (no foe spoofs yet), the board blind past BLIND
    log: [], events: [], spent: []
  };
}

const radarHull = side => (side.maxArmor ? side.armor / side.maxArmor : 0);
const radarOut = f => f.armor <= 0 || (f.parts.weapons.hp <= 0 && f.parts.drive.hp <= 0);  // shipEnd's `out`: no hull, or no guns and no drive
const radarMounts = side => Math.max(0, Math.min(side.guns, Math.ceil(side.parts.weapons.hp / FIGHT.PART_HP.weapons)));  // the mounts still working, as gunsReady and foeVolley count them
const radarCap = state => (state.opening === 'short' ? Math.round(RADAR.TURNS - (RADAR.MEET - RADAR.MEET_SHORT) / RADAR.CLOSING) : RADAR.TURNS);

const radarRange = (state, i = 1) => radarDist(state.ships[0].p, state.ships[i].p);

// The board's error on her, km: straight through ERROR between full sensors and 40% (to RESILIENT at 40% with the resilience upgrade); the accuracy
// upgrade takes it to ACCURACY at full sensors (and the same share below); our comms lock on her halves it, and her spoof doubles it.
function radarError(state) {
  const s = Math.max(0, Math.min(1, state.sensors)), fit = state.fit || {}, [full, worn] = RADAR.ERROR, at40 = fit.resilience ? RADAR.RESILIENT : worn;
  let e = full + (at40 - full) * (1 - s) / 0.6;
  if (fit.accuracy) e *= RADAR.ACCURACY / full;
  if (state.lockOn) e *= 0.5;
  if (state.herSpoof) e *= 2;
  return e;
}

const radarBears = (state, i = 1) => Math.abs(radarTurnBy(state.ships[0].facing, radarDir(state.ships[0].p, state.ships[i].p))) <= RADAR.BEAR;

// A ship's speed across the line between two ships, km/s, relative to the other: what spreads a shot between them.
function radarAcross(a, b) {
  const line = radarUnit(radarDir(a.p, b.p)), v = { x: a.v.x - b.v.x, y: a.v.y - b.v.y }, along = v.x * line.x + v.y * line.y;
  return Math.sqrt(Math.max(0, v.x * v.x + v.y * v.y - along * along));
}

// The spread of a shot, km: it grows with range, with our speed across her line relative to hers, and with the board's error, and the gunner's level takes some off.
function radarSpread(state, level, i = 1) {
  const raw = radarRange(state, i) * RADAR.SPREAD_KM + radarAcross(state.ships[0], state.ships[i]) * RADAR.SPREAD_BURN + radarError(state);
  return raw * Math.max(0.2, 1 - RADAR.SPREAD_LEVEL * level);
}
const radarFalloff = km => (RADAR.FALLOFF.find(([past]) => km > past) || [0, 1])[1];
const radarBand = km => (RADAR.AIM_BANDS.find(([under]) => km < under) || [0, 'long'])[1];
const RADAR_AIMED = ['drive', 'lock', 'launcher'];  // the small parts an aimed shot loses damage on at range, as AIMED in fight.js
const radarAimMult = (km, part = 'drive') => (RADAR_AIMED.includes(part) ? FIGHT.AIM_MULT[radarBand(km)] : 1);

// The PDC's chance to kill a torpedo that moves from `from` to `to` in a step: by the km of that segment inside the arc and the reach, sampled along it so a
// torpedo that crosses the whole reach in one step is still seen. `centre` is our ship, `power` its PDC's units.
function radarPdcKill(arc, from, to, centre = { x: 0, y: 0 }, power = 2) {
  const N = 64, len = radarDist(from, to);
  let inside = 0;
  for (let k = 0; k < N; k++) {
    const f = (k + 0.5) / N, p = { x: from.x + (to.x - from.x) * f, y: from.y + (to.y - from.y) * f };
    if (radarDist(p, centre) <= RADAR.PDC_R && Math.abs(radarTurnBy(arc.dir, radarDir(centre, p))) <= arc.width / 2) inside += len / N;
  }
  return inside ? 1 - Math.exp(-inside * RADAR.PDC_KILL * (power / 2) / Math.max(1, arc.width)) : 0;
}

// How near the origin a segment passes: a torpedo's motion relative to its target over a step, so a glancing pass between its ends is seen.
function radarNear(a, b) {
  const dx = b.x - a.x, dy = b.y - a.y, len2 = dx * dx + dy * dy, f = len2 ? Math.max(0, Math.min(1, -(a.x * dx + a.y * dy) / len2)) : 0;
  return Math.hypot(a.x + dx * f, a.y + dy * f);
}

// Where a torpedo steers: at its target's track, led by the time it takes to get there.
const radarLead = (torp, ship) => { const t = radarDist(torp.p, ship.p) / RADAR.TORP_SPEED; return { x: ship.p.x + ship.v.x * t, y: ship.p.y + ship.v.y * t }; };

// Our hull's motion for a step: it turns toward `want` at TURN a cycle, and the drive lights only with the nose inside GATE of the burn. Used by the step
// and by the projection, so the board projects our ship by the same rules it moves by.
function radarMoveUs(ship, burn, want, power, drive, dt) {
  if (want !== null && want !== undefined) { const d = radarTurnBy(ship.facing, want), most = RADAR.TURN * dt / RADAR.TURN_S; ship.facing = radarNorm(ship.facing + Math.max(-most, Math.min(most, d))); }
  let a = { x: 0, y: 0 };
  if (burn && burn.throttle > 0 && drive && Math.abs(radarTurnBy(ship.facing, burn.dir)) <= RADAR.GATE) { const u = radarUnit(burn.dir), g = RADAR.ACCEL * Math.min(1, burn.throttle) * (power / 2); a = { x: u.x * g, y: u.y * g }; }
  return a;
}
const radarCoast = (ship, a, dt) => { ship.p = { x: ship.p.x + ship.v.x * dt + a.x * dt * dt / 2, y: ship.p.y + ship.v.y * dt + a.y * dt * dt / 2 }; ship.v = { x: ship.v.x + a.x * dt, y: ship.v.y + a.y * dt }; ship.a = a; };

// One step of the fight. `orders`: { burn: { dir, throttle } | null, turnTo: dir | null, fc: 'gun' | 'pdc', aim: { foe, part, at: {x, y} } | null, fire, pdcArc,
// torp: foe | null, power, comms: 'watch' | 'lock' | 'spoof', commsFailed, order, level } (level: the gunner's, for the spread; commsFailed: the comms check's
// result, from the caller's handCheck). Her orders are hers (radarFoe), set at a cycle's first step. A torpedo is { id, side: 'us' | 'her', p, v, target, warned }.
function radarStep(state, orders, rand) {
  const st = radarClone(state), dt = radarDt(), o = orders || {}, events = [], now = Math.round(st.step * dt * 1e6) / 1e6, at = () => now;  // a step's time is its count's, not the carried t
  const me = st.ships[0], first = st.step % RADAR.SUB === 0;
  // a cycle's start: power, comms and the captain's order are set for the cycle; she chooses hers; an armed corsair fires her salvo, another arms
  if (first) {
    if (o.power) st.power = { ...o.power };  // power is set a cycle at a time, as the fire control is; the burn and the PDC's arc change at any step
    const tried = o.comms === 'lock' || o.comms === 'spoof';
    st.lockOn = o.comms === 'lock' && !o.commsFailed; st.spoofing = o.comms === 'spoof' && !o.commsFailed; st.blind = tried && !!o.commsFailed;
    if (o.order && o.order !== st.order) { events.push({ at: at(), kind: 'order', from: st.order, to: o.order }); st.order = o.order; }
    st.foeOrders = st.foes.map((f, i) => radarFoe(st, i, rand));
    for (const [i, fo] of st.foeOrders.entries()) {
      const f = st.foes[i], ship = st.ships[i + 1];
      if (fo.kind === 'arm') { st.armed[i] = true; events.push({ at: at(), kind: 'armed', foe: i, n: fo.n }); }
      if (fo.kind === 'salvo') {
        st.armed[i] = false;
        for (let k = 0; k < fo.n; k++) { const t = { id: st.nextTorp++, side: 'her', p: { ...ship.p }, v: { x: 0, y: 0 }, target: 0, warned: false }; st.torps.push(t); events.push({ at: at(), kind: 'launch', side: 'her', torp: t.id, foe: i }); }
        f.torps -= fo.n;
      }
    }
  }
  if (o.pdcArc) st.pdcArc = { ...o.pdcArc };
  // move: our hull by the orders; each of hers by her burn; then the torpedoes, each steering at its target's track
  const was = st.ships.map(s => ({ ...s.p }));  // where each ship began the step, for a closest approach over it
  const want = o.turnTo !== undefined && o.turnTo !== null ? o.turnTo : o.burn ? o.burn.dir : null;
  radarCoast(me, radarMoveUs(me, o.burn, want, st.power.drive, st.me.parts.drive.hp > 0, dt), dt);
  for (const [i, f] of st.foes.entries()) {
    const ship = st.ships[i + 1], fo = st.foeOrders[i] || {}, burn = fo.burn;
    let a = { x: 0, y: 0 };
    if (burn && f.parts.drive.hp > 0) { const u = radarUnit(burn.dir), g = RADAR.HER_ACCEL * Math.min(1, burn.throttle); a = { x: u.x * g, y: u.y * g }; ship.facing = burn.dir; }
    radarCoast(ship, a, dt);
  }
  const paths = st.torps.map(t => {
    const aim = radarLead(t, st.ships[t.target]), d = radarUnit(radarDir(t.p, aim));
    const from = t.p;
    t.v = { x: d.x * RADAR.TORP_SPEED, y: d.y * RADAR.TORP_SPEED };
    t.p = { x: t.p.x + t.v.x * dt, y: t.p.y + t.v.y * dt };
    return { torp: t, from, to: t.p };
  });
  // sensors: she comes into gun range (said once a fight); one of her torpedoes will reach the PDC's reach before this cycle is out (said once a torpedo)
  if (!st.ranged && st.foes.some((f, i) => !radarOut(f) && radarRange(st, i + 1) <= RADAR.GUN_PAUSE)) { st.ranged = true; events.push({ at: at(), kind: 'gunRange' }); }
  const left = RADAR.TURN_S - ((st.step % RADAR.SUB) + 1) * dt;
  for (const t of st.torps) if (t.side === 'her' && !t.warned && radarDist(t.p, me.p) - RADAR.PDC_R <= RADAR.TORP_SPEED * left) { t.warned = true; events.push({ at: at(), kind: 'pdcSoon', torp: t.id }); }
  // fire control: committed to the gun or the PDC at the start of a cycle, for the whole of it
  if (first) st.fc = o.fc === 'pdc' ? 'pdc' : 'gun';
  // fire: the gun, once a cycle for each gun it has, when it is ordered, bears, is not locked and has weapons left; our torpedo when ordered and held
  const hits = [];
  const target = o.aim ? o.aim.foe + 1 : 1;
  if (o.fire && st.fc === 'gun' && st.fired < Math.max(1, radarMounts(st.me)) && st.ships[target]) {  // a shot a working mount (one, to say why none fires)
    if (st.locked) { if (!st.spent.includes(`locked:${st.cycle}`)) { st.spent.push(`locked:${st.cycle}`); events.push({ at: at(), kind: 'gunLocked' }); } }
    else if (st.me.parts.weapons.hp <= 0) { if (!st.spent.includes(`noguns:${st.cycle}`)) { st.spent.push(`noguns:${st.cycle}`); events.push({ at: at(), kind: 'noGuns' }); } }
    else if (st.power.guns <= 0) { if (!st.spent.includes(`nopower:${st.cycle}`)) { st.spent.push(`nopower:${st.cycle}`); events.push({ at: at(), kind: 'noPower' }); } }  // an order that gives the guns nothing (break, evade)
    else if (!radarBears(st, target)) { if (!st.spent.includes(`nobear:${st.cycle}`)) { st.spent.push(`nobear:${st.cycle}`); events.push({ at: at(), kind: 'noBear', foe: target - 1 }); } }
    else {
      st.fired++;
      st.heat += st.power.guns / 2;
      const her = st.ships[target], aimAt = o.aim && o.aim.at ? o.aim.at : her.p, spread = radarSpread(st, o.level || 0, target);
      const r = spread * Math.sqrt(rand()), th = rand() * 2 * Math.PI, land = { x: aimAt.x + r * Math.sin(th), y: aimAt.y + r * Math.cos(th) };
      const km = radarRange(st, target), part = (o.aim && o.aim.part) || 'hull';
      if (radarDist(land, her.p) <= RADAR.HIT_R) {
        const lo = FIGHT.GUN_DMG[0] + FIGHT.SKILL_DMG * st.me.skill, hi = FIGHT.GUN_DMG[1], roll = lo + rand() * (hi - lo);
        hits.push({ to: target, part, dmg: Math.round(roll * RADAR.GUN_DMG * st.me.dmgMult * (st.power.guns / RADAR.GUN_POWER) * radarFalloff(km) * radarAimMult(km, part)), km });  // more power to the guns hits harder, as an overcharge did (the owner, 2026-11-19), and runs hotter
      } else events.push({ at: at(), kind: 'miss', foe: target - 1, km });
      if (st.heat > RADAR.HEAT_CAP && !st.locked) { st.locked = true; st.lockedAt = st.cycle; events.push({ at: at(), kind: 'overheat' }); }
    }
  }
  if (o.torp !== undefined && o.torp !== null && !st.torpFired && st.me.torps > 0 && st.me.launcher && st.me.parts.launcher && st.me.parts.launcher.hp > 0 && st.ships[o.torp + 1]) {
    st.me.torps--; st.torpFired = true;  // one a cycle
    const t = { id: st.nextTorp++, side: 'us', p: { ...me.p }, v: { x: 0, y: 0 }, target: o.torp + 1, warned: false };
    st.torps.push(t);
    events.push({ at: at(), kind: 'launch', side: 'us', torp: t.id, foe: o.torp });
  }
  // her fire: her guns once a cycle inside GUN_RANGE, at the part her order names; her spread from the range, our speed across her line (a ship that
  // manoeuvres under her guns is harder to hit, as hers is for ours: the owner, 2026-11-19) and the board's stock error, doubled by our spoof
  const herHits = [];
  for (const [i, f] of st.foes.entries()) {
    const fo = st.foeOrders[i] || {}, km = radarRange(st, i + 1);
    if (!fo.fire || st.herFired[i] || radarOut(f) || f.parts.weapons.hp <= 0 || km > RADAR.GUN_RANGE) continue;
    st.herFired[i] = true;
    const spread = km * RADAR.SPREAD_KM + radarAcross(me, st.ships[i + 1]) * RADAR.SPREAD_BURN + RADAR.ERROR[0] * (st.spoofing ? 2 : 1), chance = Math.min(1, (RADAR.HIT_R / spread) ** 2);
    if (rand() < chance) herHits.push({ foe: i, part: fo.part || 'hull', dmg: Math.round(RADAR.GUN_DMG * radarMounts(f) * (FIGHT.FOE_DMG[0] + rand() * (FIGHT.FOE_DMG[1] - FIGHT.FOE_DMG[0])) * f.dmgMult * radarFalloff(km)) });
    else events.push({ at: at(), kind: 'missUs', foe: i });
  }
  // point defence: hers at us, through the arc, while the fire control is on the PDC; a stowed PDC never fires
  const gone = new Set();
  for (const { torp, from, to } of paths) {
    if (torp.side !== 'her' || st.fc !== 'pdc' || !st.me.pdc) continue;
    const chance = radarPdcKill(st.pdcArc, from, to, me.p, st.power.pdc);
    if (chance && rand() < chance) { gone.add(torp.id); events.push({ at: at(), kind: 'pdcKill', torp: torp.id }); }
  }
  // damage: the gun's hits, hers, then each torpedo that reached its target this step (their closest approach over it within TORP_HIT)
  for (const h of hits) {
    const side = st.foes[h.to - 1], took = dealDamage(side, side.parts[h.part] || h.part === 'hull' ? h.part : 'hull', h.dmg);
    events.push({ at: at(), kind: 'hit', foe: h.to - 1, part: h.part, dmg: took, km: h.km });
  }
  for (const h of herHits) { events.push({ at: at(), kind: 'hitUs', foe: h.foe, part: h.part, dmg: dealDamage(st.me, st.me.parts[h.part] || h.part === 'hull' ? h.part : 'hull', h.dmg), ...(st.struck ? {} : { first: true }) }); st.struck = true; }  // first: her guns' first hit of the fight, the one that pauses it (the owner, 2026-11-19)
  for (const { torp, from, to } of paths) {
    if (gone.has(torp.id)) continue;
    const ship = st.ships[torp.target], start = was[torp.target];
    if (radarNear({ x: from.x - start.x, y: from.y - start.y }, { x: to.x - ship.p.x, y: to.y - ship.p.y }) <= RADAR.TORP_HIT) {  // their closest approach over the step
      gone.add(torp.id);
      const [lo, hi] = torp.side === 'us' ? FIGHT.TORP_DMG : FIGHT.SALVO_DMG, dmg = Math.round(lo + rand() * (hi - lo));
      const side = torp.side === 'us' ? st.foes[torp.target - 1] : st.me;
      events.push({ at: at(), kind: 'impact', side: torp.side, torp: torp.id, dmg: dealDamage(side, 'hull', dmg) });
    }
  }
  st.torps = st.torps.filter(t => !gone.has(t.id));
  // alongside: a ship of hers with her lock and drive whole, not breaking off, that comes within ALONGSIDE of ours over the step boards
  for (const [i, f] of st.foes.entries()) {
    const ship = st.ships[i + 1], fo = st.foeOrders[i] || {};
    if (st.boarded || radarOut(f) || f.parts.lock.hp <= 0 || f.parts.drive.hp <= 0 || fo.kind === 'break') continue;
    if (radarNear({ x: was[i + 1].x - was[0].x, y: was[i + 1].y - was[0].y }, { x: ship.p.x - me.p.x, y: ship.p.y - me.p.y }) <= RADAR.ALONGSIDE) { st.boarded = true; events.push({ at: at(), kind: 'alongside', foe: i }); }
  }
  st.step++;
  st.t = Math.max(st.t, Math.round(st.step * dt * 1e6) / 1e6);
  // the cycle's bookkeeping, at its last step: heat bleeds; a lock holds through the cycle after the one it came in, and comes off once the heat is back
  // under the cap; the gun, the launcher and her guns may fire again
  if (st.step % RADAR.SUB === 0) {
    st.heat = Math.max(0, st.heat - FIGHT.HEAT_VENT);
    if (st.locked && st.cycle > st.lockedAt && st.heat <= RADAR.HEAT_CAP) { st.locked = false; st.lockedAt = null; }
    st.fired = 0; st.torpFired = false; st.herFired = st.foes.map(() => false);
    st.cycle++;
    events.push({ at: at(), kind: 'cycle', cycle: st.cycle });
  }
  st.events = events;
  return { state: st, events };
}

// Runs the whole steps that `seconds` more of fight time holds, from where the state is (its `t`), so that any split of the same time gives the same fight.
function radarAdvance(state, orders, seconds, rand) {
  const dt = radarDt(), upto = Math.max(state.step, Math.floor((state.t + seconds) / dt + 1e-5));  // t is kept to a millionth of a second, so a step boundary may fall a hair short
  let st = state, events = [];
  for (let k = st.step; k < upto; k++) { const r = radarStep(st, orders, rand); st = r.state; events = events.concat(r.events); }
  if (st === state) st = radarClone(state);
  const base = st.step * dt;  // the clock, kept to a millionth past the last step's end, so its rounding does not build up over a fight
  st.t = Math.round((base + Math.round((state.t + seconds - base) * 1e6) / 1e6) * 1e6) / 1e6;
  st.events = events;
  return { state: st, events };
}

// The rest of the cycle the state is in: to the end of its last step.
const radarCycle = (state, orders, rand) => radarAdvance(state, orders, (Math.floor(state.step / RADAR.SUB) + 1) * RADAR.TURN_S - state.t, rand);

// ---------- fire control: what the board shows (Task 5) ----------

// Each foe's contact as the board sees it: off her true position by up to the error, her velocity as she makes it. Past BLIND on a blind cycle, nothing.
function radarSeen(state, rand) {
  const e = radarError(state);
  return state.foes.map((f, i) => {
    const ship = state.ships[i + 1];
    if (state.blind && radarRange(state, i + 1) > RADAR.BLIND) return null;
    const r = e * Math.sqrt(rand()), th = rand() * 2 * Math.PI;
    return { p: { x: ship.p.x + r * Math.sin(th), y: ship.p.y + r * Math.cos(th) }, v: { ...ship.v }, a: { ...ship.a } };
  });
}

// The board's projection, `cycles` ahead, at each cycle's end: our track by our orders and the rules we move by (no band: our own ship is known); each of
// hers from what the board sees (`seen`, radarSeen's; her true contact without it), coasting, or on her present burn with a comms lock on her (her habit),
// in a band of the error plus all she could burn off it since (HER_ACCEL). Closest approach and each torpedo's impact are ranges over those bands; the
// gun's solution is the chance a shot lands, from its spread, low with the aim off by the error and high with it on her.
function radarProject(state, orders, cycles = 4, seen = null) {
  const o = orders || {}, dt = radarDt(), e = radarError(state), want = o.turnTo !== undefined && o.turnTo !== null ? o.turnTo : o.burn ? o.burn.dir : null;
  // a contact the board does not see (null in a seen it was given) has no track, closest approach or impact
  const us = radarClone(state.ships[0]), hers = state.foes.map((f, i) => { const c = seen ? seen[i] : state.ships[i + 1]; return c ? { p: { ...c.p }, v: { ...c.v }, a: state.lockOn ? { ...(c.a || { x: 0, y: 0 }) } : { x: 0, y: 0 } } : null; });
  const band = t => e + RADAR.HER_ACCEL * t * t / 2;
  const tracks = [[{ p: { ...us.p }, band: 0 }], ...hers.map(h => (h ? [{ p: { ...h.p }, band: band(0) }] : []))];
  const steps = cycles * RADAR.SUB, path = [];
  let drivePower = state.power.drive;
  for (let k = 1; k <= steps; k++) {
    if ((state.step + k - 1) % RADAR.SUB === 0 && o.power) drivePower = o.power.drive;  // the orders' split takes over at a cycle's start, as in the step
    radarCoast(us, radarMoveUs(us, o.burn, want, drivePower, state.me.parts.drive.hp > 0, dt), dt);
    for (const h of hers) if (h) radarCoast(h, h.a, dt);
    path.push({ t: k * dt, us: { ...us.p }, hers: hers.map(h => (h ? { ...h.p } : null)) });
    if (k % RADAR.SUB === 0) { tracks[0].push({ p: { ...us.p }, band: 0 }); hers.forEach((h, i) => { if (h) tracks[i + 1].push({ p: { ...h.p }, band: band(k * dt) }); }); }
  }
  const first = hers.findIndex((h, i) => h && !radarOut(state.foes[i]));
  let cpa = null;
  if (first >= 0) {
    const near = path.reduce((b, s) => { const d = radarDist(s.us, s.hers[first]); return d < b.d ? { d, t: s.t } : b; }, { d: radarDist(tracks[0][0].p, tracks[first + 1][0].p), t: 0 });  // from where the projection began
    cpa = { min: Math.max(0, near.d - band(near.t)), max: near.d + band(near.t), at: near.t / RADAR.TURN_S };
  }
  const impacts = state.torps.map(t => {
    const target = t.target === 0 ? path.map(s => s.us) : path.map(s => s.hers[t.target - 1]), p = { ...t.p };
    let best = { d: Infinity, t: 0 }, was = t.target === 0 ? tracks[0][0].p : tracks[t.target][0] && tracks[t.target][0].p;
    for (const [k, s] of path.entries()) {
      const aim = target[k]; if (!aim || !was) break;
      const from = { x: p.x - was.x, y: p.y - was.y };
      const u = radarUnit(radarDir(p, aim)); p.x += u.x * RADAR.TORP_SPEED * dt; p.y += u.y * RADAR.TORP_SPEED * dt;
      const d = radarNear(from, { x: p.x - aim.x, y: p.y - aim.y });  // the closest approach over the step, as the step measures it
      if (d < best.d) best = { d, t: s.t - dt };  // at the step's start, as the step's events are
      if (d <= RADAR.TORP_HIT) break;
      was = aim;
    }
    const b = t.target === 0 ? 0 : band(best.t), spread = b / RADAR.TORP_SPEED / RADAR.TURN_S;
    return { torp: t.id, side: t.side, at: [Math.max(0, best.t / RADAR.TURN_S - spread), best.t / RADAR.TURN_S + spread], hits: best.d + b <= RADAR.TORP_HIT ? 'yes' : best.d - b <= RADAR.TORP_HIT ? 'may' : 'no' };
  });
  const aimed = o.aim && hers[o.aim.foe] && !radarOut(state.foes[o.aim.foe]) ? o.aim.foe : first;  // the solution is for the one the gun is aimed at, else the first of hers the board sees
  const s = aimed >= 0 ? radarSpread(state, o.level || 0, aimed + 1) : Infinity, chance = r => Math.min(1, (Math.max(0, r) / s) ** 2);
  const solution = aimed >= 0 && radarBears(state, aimed + 1) ? [chance(RADAR.HIT_R - e), chance(RADAR.HIT_R)] : [0, 0];
  return { tracks, cpa, impacts, solution };
}

// ---------- her, the captain, the crew and the ends (Task 6) ----------

// Her orders for a cycle, by her kind (spec, "Her"; foeMove in fight.js for today's): badly hurt or with no guns she breaks off while her drive can take her
// away; a corsair with torpedoes arms inside TORP_LAUNCH (a cycle ahead, every SALVO_EVERY cycles) and fires a salvo the cycle after; outside JINK she comes
// on at the rate she was met at, burning for us when we open the range, and inside it she burns to the range her kind works at (HELD; a raider alongside
// while her lock is whole, LOCKLESS without it), jinking; her guns fire inside GUN_RANGE, at our drive if we are the faster, at our hull while she closes, else at our guns while they last.
function radarFoe(state, i, rand) {
  const f = state.foes[i], ship = state.ships[i + 1], me = state.ships[0], type = (state.types && state.types[i]) || 'raider';
  if (radarOut(f)) return { kind: 'out', burn: null, fire: false };
  const km = radarDist(ship.p, me.p), toUs = radarDir(ship.p, me.p), armed = f.parts.weapons.hp > 0, drive = f.parts.drive.hp > 0, lock = f.parts.lock.hp > 0;
  if (drive && (radarHull(f) < (f.breakAt || FIGHT.BREAK) || !armed)) return { kind: 'break', burn: { dir: radarNorm(toUs + 180), throttle: 1 }, fire: armed, part: 'hull' };
  const launcher = f.launcher && f.parts.launcher && f.parts.launcher.hp > 0 && f.torps > 0;
  let kind = 'close', n = 0;
  if (launcher && state.armed[i]) { kind = 'salvo'; n = Math.min(FIGHT.SALVO, f.torps); }
  else if (launcher && km <= RADAR.TORP_LAUNCH && state.cycle % RADAR.SALVO_EVERY === 0) { kind = 'arm'; n = Math.min(FIGHT.SALVO, f.torps); }
  const held = type === 'raider' ? (lock ? 0 : RADAR.LOCKLESS) : (RADAR.HELD[type] !== undefined ? RADAR.HELD[type] : RADAR.HELD.cutter);
  let burn = null;
  const jink = (rand() - 0.5) * 60;  // drawn every cycle, so her dice do not hang on where she is
  if (drive && km <= RADAR.JINK) {
    const u = radarUnit(toUs), closingNow = (ship.v.x - me.v.x) * u.x + (ship.v.y - me.v.y) * u.y, wantClosing = Math.max(-0.6, Math.min(0.6, (km - held) / (2 * RADAR.TURN_S)));
    const dv = wantClosing - closingNow;
    burn = { dir: radarNorm((dv >= 0 ? toUs : toUs + 180) + jink), throttle: Math.min(1, Math.abs(dv) / (RADAR.HER_ACCEL * RADAR.TURN_S)) };
  } else if (drive) {  // outside JINK she comes on at the rate she was met at, and burns straight for us to get it back when we open the range
    const u = radarUnit(toUs), dv = RADAR.CLOSING / RADAR.TURN_S - ((ship.v.x - me.v.x) * u.x + (ship.v.y - me.v.y) * u.y);
    if (dv > 1e-6) burn = { dir: toUs, throttle: Math.min(1, dv / (RADAR.HER_ACCEL * RADAR.TURN_S)) };
  }
  const part = state.me.parts.drive.hp > 0 && state.me.speed > f.speed ? 'drive' : km > held + 5 ? 'hull' : state.me.parts.weapons.hp > 0 ? 'weapons' : 'hull';
  return { kind, n, burn, fire: armed, part };
}

// The captain's orders: each sets the power split, the comms stance, the range the pilot holds (null: away) and the pilot's wedge (degrees of burn either
// side of the line the order wants; a coast trims up to `trim` of throttle).
const RADAR_ORDERS = {
  engage: { power: { drive: 2, guns: 3, pdc: 1 }, comms: 'lock', range: 12, wedge: 90, trim: 0.3 },
  hold: { power: { drive: 2, guns: 2, pdc: 2 }, comms: 'watch', range: 20, wedge: 90, trim: 0.3 },
  open: { power: { drive: 4, guns: 1, pdc: 1 }, comms: 'watch', range: 60, wedge: 90, trim: 0.3 },
  break: { power: { drive: 5, guns: 0, pdc: 1 }, comms: 'spoof', range: null, wedge: 90, trim: 0.3 },
  evade: { power: { drive: 3, guns: 0, pdc: 3 }, comms: 'spoof', range: 20, wedge: 90, trim: 0.3 }
};

// The captain's order for a cycle, after comms has reported (`read.torps`: what is known of her torpedoes, as radarProject's impacts): a torpedo that will
// hit inside EVADE_SOON sends any captain to evade; then by nerve, as captainMove: a cautious one (1, 2) badly hurt against a less hurt foe breaks off, and
// opens the range hurt; a steady one (3) opens badly hurt and closes with a lead of 30 points; a bold one (4, 5) closes on a more hurt foe.
function radarCaptain(state, nerve, read = { torps: [] }) {
  if ((read.torps || []).some(t => t.side === 'her' && t.hits !== 'no' && t.at[0] <= RADAR.EVADE_SOON)) return 'evade';
  const up = state.foes.filter(f => !radarOut(f)), mine = radarHull(state.me), hers = up.length ? up.reduce((a, f) => a + radarHull(f), 0) / up.length : 0;
  if (nerve >= 4) return hers < mine ? 'engage' : 'hold';
  if (nerve >= 1 && nerve <= 2) return mine < 0.4 && hers > mine ? 'break' : mine < 0.6 ? 'open' : 'hold';
  if (nerve === 3) return mine < 0.4 ? 'open' : mine - hers >= 0.3 ? 'engage' : 'hold';
  return 'hold';
}

// The nearest of hers still up, as an index into foes, or -1.
const radarNearest = state => state.foes.reduce((b, f, i) => (radarOut(f) ? b : b < 0 || radarRange(state, i + 1) < radarRange(state, b + 1) ? i : b), -1);

// What a crew hand at a post does this cycle under the order, at their level (0 to 5), as part of the orders. The pilot coasts nose-on while within COAST of
// the range to hold (COAST_ENGAGE closing to engage) and not closing fast, and while she breaks off, and makes short burns otherwise, landing up to SCATTER off at level 0; the
// gunner fires at her hull (at her lock while a raider with it whole closes inside JINK), sets the arc at the nearest of her torpedoes and puts the fire
// control on the PDC when one will reach it this cycle, and fires a torpedo inside JINK; the engineer gives the order's power, and comms its stance.
function radarCrew(state, post, level, order, rand) {
  const o = RADAR_ORDERS[order] || RADAR_ORDERS.hold, i = radarNearest(state), me = state.ships[0];
  if (post === 'engineer') return { power: { ...o.power } };
  if (post === 'comms') return { comms: o.comms };
  if (i < 0) return {};
  const her = state.ships[i + 1], km = radarRange(state, i + 1), toHer = radarDir(me.p, her.p);
  if (post === 'pilot') {
    const off = (rand() - 0.5) * 2 * RADAR.SCATTER * Math.max(0, 1 - level / 5);
    if (order === 'break' || o.range === null) return { burn: { dir: radarNorm(toHer + 180 + off), throttle: 1 }, turnTo: null };
    if (state.foeOrders[i] && state.foeOrders[i].kind === 'break') return { burn: null, turnTo: toHer };  // she is breaking off: let her go, nose on her, rather than chase her back into the fight
    if (order === 'evade') return { burn: { dir: radarNorm(toHer + 90 + off), throttle: 1 }, turnTo: null };
    const u = radarUnit(toHer), closing = (her.v.x - me.v.x) * -u.x + (her.v.y - me.v.y) * -u.y;  // positive while the range comes down
    const room = order === 'engage' ? RADAR.COAST_ENGAGE : RADAR.COAST;
    if (Math.abs(km - o.range) <= room && Math.abs(closing) < 0.3) return { burn: null, turnTo: toHer };
    if ((order === 'hold' || order === 'engage') && km < o.range) return { burn: null, turnTo: toHer };  // she is inside the range to hold: nose on her and fight, not turn the gun away to run
    // a burn for the motion the range wants relative to her: straight at or away from her, no faster than she was met at, and none across her line, so the
    // ship neither overshoots her nor drifts round her
    const most = RADAR.CLOSING / RADAR.TURN_S, want = Math.max(-most, Math.min(most, (km - o.range) / (2 * RADAR.TURN_S)));
    const dv = { x: want * u.x - (me.v.x - her.v.x), y: want * u.y - (me.v.y - her.v.y) }, size = Math.hypot(dv.x, dv.y);
    if (size < 0.05) return { burn: null, turnTo: toHer };
    return { burn: { dir: radarNorm(radarDir({ x: 0, y: 0 }, dv) + off), throttle: Math.min(1, size / (RADAR.ACCEL * RADAR.TURN_S)) }, turnTo: null };
  }
  if (post === 'gunner') {
    const lockFirst = (state.types[i] || 'raider') === 'raider' && state.foes[i].parts.lock.hp > 0 && km <= RADAR.LOCK_AT;
    const soon = state.torps.filter(t => t.side === 'her').sort((a, b) => radarDist(a.p, me.p) - radarDist(b.p, me.p))[0];
    const pdc = !!soon && state.me.pdc && radarDist(soon.p, me.p) - RADAR.PDC_R <= RADAR.TORP_SPEED * RADAR.TURN_S;
    return { fire: km <= RADAR.JINK, aim: { foe: i, part: lockFirst ? 'lock' : 'hull' }, fc: pdc ? 'pdc' : 'gun',  // the crew hold fire until she is close enough to hit often pdcArc: soon ? { dir: radarDir(me.p, soon.p), width: 60 } : { dir: toHer, width: 90 },
      torp: km <= RADAR.JINK && state.me.torps > 0 ? i : null, level };
  }
  return {};
}

// What an order does to the gun before it is carried out: where the hull will face at the cycle's end under the pilot's burn for it, whether the gun will
// bear on her then, and why not (a key for the page's words: the drive points away from her to do this).
function radarCost(state, order) {
  const i = radarNearest(state);
  if (i < 0) return { endFacing: state.ships[0].facing, bears: false, why: null };
  const p = radarCrew(state, 'pilot', 5, order, () => 0.5), want = p.turnTo !== undefined && p.turnTo !== null ? p.turnTo : p.burn ? p.burn.dir : state.ships[0].facing;
  const d = radarTurnBy(state.ships[0].facing, want), endFacing = radarNorm(state.ships[0].facing + Math.max(-RADAR.TURN, Math.min(RADAR.TURN, d)));
  const bears = Math.abs(radarTurnBy(endFacing, radarDir(state.ships[0].p, state.ships[i + 1].p))) <= RADAR.BEAR;
  return { endFacing, bears, why: bears ? null : 'driveAway' };
}

// ---------- the hand at the pilot's post (Task 10) ----------

// The order's wedge for a burn the pilot drags: about the line the order plots (the crew pilot's burn without scatter), `half` degrees either side, at full
// throttle; a coast plots no burn, so any direction, trimmed to the order's `trim`.
function radarWedge(state, order) {
  const o = RADAR_ORDERS[order] || RADAR_ORDERS.hold, p = radarCrew(state, 'pilot', 5, order, () => 0.5);
  return p.burn ? { dir: p.burn.dir, half: o.wedge / 2, most: 1 } : { dir: null, half: 180, most: o.trim };
}
// A burn held to the wedge: its direction to the nearer edge when it is outside, its throttle to the most the order allows.
function radarHold(burn, wedge) {
  const d = wedge.dir === null ? 0 : radarTurnBy(wedge.dir, burn.dir);
  const dir = wedge.dir === null ? radarNorm(burn.dir) : radarNorm(wedge.dir + Math.max(-wedge.half, Math.min(wedge.half, d)));
  return { dir, throttle: Math.max(0, Math.min(wedge.most, burn.throttle)) };
}
// Where a burn the pilot puts really lands: up to SCATTER degrees off at level 0, on it at level 5.
const radarScatterOf = level => RADAR.SCATTER * Math.max(0, 1 - level / 5);
const radarScatter = (burn, level, rand) => ({ ...burn, dir: radarNorm(burn.dir + (rand() - 0.5) * 2 * radarScatterOf(level)) });

// A cycle's orders when the crew work every post (the fight tool and the tests; the page puts the hand's own post in place of the crew's): the captain's
// order on what the board shows, and each post at its level. `levels`: { pilot, gunner, engineer, comms }.
function radarAuto(state, levels = {}, rand) {
  const read = { torps: radarProject(state, {}, 2).impacts };
  const order = radarCaptain(state, state.nerve, read), out = { order };
  for (const post of ['engineer', 'comms', 'pilot', 'gunner']) Object.assign(out, radarCrew(state, post, levels[post] || 0, order, rand));
  return out;
}

// The fight's end, or null, in today's names (shipEnd in fight.js), so everything after it (shipFightEnd) works unchanged: lost (our hull gone); boarded
// (she came alongside with her lock whole); crippled (each of hers out); away (each of hers left breaking off with her guns gone and her hull whole) and
// broke (each breaking off), once past GUN_RANGE; escaped (each of hers past ESCAPE); at the cap the less whole side breaks off, ran if it is us.
function radarEnd(state) {
  if (state.me.armor <= 0) return 'lost';
  if (state.boarded) return 'boarded';
  const up = state.foes.map((f, i) => ({ f, i })).filter(x => !radarOut(x.f));
  if (!up.length) return 'crippled';
  const breaking = ({ f, i }) => state.foeOrders[i] && state.foeOrders[i].kind === 'break' && f.parts.drive.hp > 0 && radarRange(state, i + 1) > RADAR.GUN_RANGE;
  if (up.every(breaking)) return up.every(({ f }) => f.parts.weapons.hp <= 0 && radarHull(f) >= (f.breakAt || FIGHT.BREAK)) ? 'away' : 'broke';
  if (up.every(({ i }) => radarRange(state, i + 1) > RADAR.ESCAPE)) return 'escaped';
  if (state.cycle < radarCap(state)) return null;
  const hers = up.reduce((a, { f }) => a + radarHull(f), 0) / up.length;
  return radarHull(state.me) < hers ? 'ran' : 'broke';
}

// ---------- when real time pauses itself (Task 7) ----------

// Why the fight pauses itself on what just happened, as keys for the page's words: only on new events, never on a standing condition (a locked gun, a coast).
// She comes into gun range is said once a fight (the step says it once); an order change pauses only into or out of evade or break-off.
function radarPauses(prev, next, events) {
  const why = new Set();
  for (const e of events || []) {
    if (e.kind === 'armed') why.add('armed');
    if (e.kind === 'launch' && e.side === 'her') why.add('launched');
    if (e.kind === 'pdcSoon') why.add('pdcSoon');
    if ((e.kind === 'hitUs' && e.first) || (e.kind === 'impact' && e.side === 'her')) why.add('hit');  // her guns pause it on their first hit only, a torpedo on every one (the owner, 2026-11-19)
    if (e.kind === 'call') why.add('call');
    if (e.kind === 'gunRange') why.add('gunRange');
    if (e.kind === 'order' && ['evade', 'break'].some(k => e.from === k || e.to === k)) why.add('plan');
  }
  return [...why];
}
