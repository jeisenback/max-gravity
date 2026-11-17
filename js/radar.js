'use strict';

// The ship fight on the radar: its rules (docs/superpowers/specs/2026-11-16-radar-ship-fight-design.md, plan Part 1, #1344). Pure, as fight.js is: it reads no G,
// changes nothing it is given and takes its dice as `rand`; each call takes the fight's state and returns the next with the facts of the step. Space is km on a
// plane centred where the fight began, our ship first in `ships`; a direction is in degrees clockwise from the top of the radar. Time is fixed steps, SUB to an
// order cycle of TURN_S seconds, each resolved in one order (move, sensors, fire control, fire, point defence, damage), so that how a fight is advanced (a cycle
// at once, small frames at 16x, a pause between) does not change it. Nothing in the game calls this yet: the scene (radarui.js) comes in Part 2. Loaded after fight.js.

const RADAR = {
  TURN_S: 20,          // seconds of fight time in an order cycle: orders, power and comms are set a cycle at a time
  SUB: 24,             // fixed steps in a cycle, whatever the speed it is watched at
  SPEEDS: [1, 2, 16],  // the speeds a fight is watched at (pause aside); it opens at the last
  MEET: 250,           // km: where she is met on the long opening
  MEET_SHORT: 40,      // km: where she is met on the short opening (a contact today's fight starts close, range.js, engagements.js)
  CLOSING: 12,         // km a cycle she closes from the meeting
  JINK: 60,            // km: she jinks only inside this
  ESCAPE: 400,         // km: opening past this is away
  ZOOM: [50, 150, 400],  // km across the radar's three zooms
  TURN: 90,            // degrees the hull turns in a cycle, at most
  GATE: 30,            // degrees off the burn's direction inside which the drive lights
  ACCEL: 0.02,         // km/s/s at full throttle on two units of drive power (the builder's: a 20 s burn is 0.4 km/s, 8 km a cycle)
  BEAR: 30,            // degrees off the nose inside which the gun bears
  FALLOFF: [[30, 0.5], [20, 0.75]],  // km past which a shot does this share of its damage (the farther band first)
  AIM_BANDS: [[5, 'knife'], [12, 'close'], [30, 'mid']],  // km under which a range counts as this band for FIGHT.AIM_MULT; beyond, long
  HIT_R: 1,            // km: a shot that lands within this of her true position hits (the builder's)
  SPREAD_KM: 0.02,     // km of spread per km of range, for a gunner at level 0 (the builder's: about 2 km at 100 km)
  SPREAD_BURN: 2,      // km of spread per km/s of our own speed off her line (the builder's)
  SPREAD_LEVEL: 0.12,  // the share of the spread each gunner level takes off (the builder's: level 5 has 40% of level 0's)
  PDC_R: 9,            // km: the point defence's reach
  PDC_KILL: 7,         // the PDC's kill: 1 - e^-(km through the arc x this / the arc's width in degrees), so 9 km through a 90-degree arc is about even
  TORP_LAUNCH: 165,    // km: from about here her torpedoes are launched
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
  TURNS: 50            // cycles from the long opening before the less whole side breaks off
};

const radarDt = () => RADAR.TURN_S / RADAR.SUB;
const radarClone = x => JSON.parse(JSON.stringify(x));
const radarNorm = d => ((d % 360) + 360) % 360;
const radarTurnBy = (from, to) => ((to - from + 540) % 360) - 180;  // the shortest turn from one direction to another, -180 to 180
const radarDir = (from, to) => radarNorm(Math.atan2(to.x - from.x, to.y - from.y) * 180 / Math.PI);
const radarDist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const radarUnit = d => ({ x: Math.sin(d * Math.PI / 180), y: Math.cos(d * Math.PI / 180) });

// A fight at the meeting: our ship at the centre and still, each foe on a bearing (0 here; Task 6 takes it from the dice) closing at CLOSING km a cycle.
// `me` and `foes` are shipSide's sides; `fit` the fire-control upgrades; `sensors` the ship's sensors' condition, 0 to 1.
function radarFight({ me, foes, nerve, opening = 'long', fit = { accuracy: false, resilience: false }, sensors = 1 }) {
  const at = opening === 'short' ? RADAR.MEET_SHORT : RADAR.MEET, closing = RADAR.CLOSING / RADAR.TURN_S;
  const theirs = foes.map(() => ({ p: { x: 0, y: at }, v: { x: 0, y: -closing }, facing: 180 }));
  return {
    kind: 'radar', me: radarClone(me), foes: radarClone(foes), nerve, opening, fit: { ...fit }, sensors,
    t: 0, step: 0, cycle: 0, ships: [{ p: { x: 0, y: 0 }, v: { x: 0, y: 0 }, facing: 0 }, ...theirs],
    torps: [], nextTorp: 1, heat: 0, locked: false, lockedAt: null, fired: 0, torpFired: false, order: null, fc: 'gun', pdcArc: { dir: 0, width: 90 }, power: { drive: 2, guns: 2, pdc: 2 },
    log: [], events: [], spent: []
  };
}

const radarRange = (state, i = 1) => radarDist(state.ships[0].p, state.ships[i].p);

// The board's error on her, km (Task 5 adds the comms lock, her spoof and the upgrades): straight through ERROR between full sensors and 40%.
const radarError = state => { const s = Math.max(0, Math.min(1, state.sensors)), [full, worn] = RADAR.ERROR; return full + (worn - full) * (1 - s) / 0.6; };

const radarBears = (state, i = 1) => Math.abs(radarTurnBy(state.ships[0].facing, radarDir(state.ships[0].p, state.ships[i].p))) <= RADAR.BEAR;

// The spread of a shot, km: it grows with range, with our own speed off her line, and with the board's error, and the gunner's level takes some off.
function radarSpread(state, level, i = 1) {
  const me = state.ships[0], line = radarUnit(radarDir(me.p, state.ships[i].p)), along = me.v.x * line.x + me.v.y * line.y;
  const across = Math.sqrt(Math.max(0, me.v.x * me.v.x + me.v.y * me.v.y - along * along));
  const raw = radarRange(state, i) * RADAR.SPREAD_KM + across * RADAR.SPREAD_BURN + radarError(state);
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

// Where a torpedo steers: at its target's track, led by the time it takes to get there.
const radarLead = (torp, ship) => { const t = radarDist(torp.p, ship.p) / RADAR.TORP_SPEED; return { x: ship.p.x + ship.v.x * t, y: ship.p.y + ship.v.y * t }; };

// One step of the fight. `orders`: { burn: { dir, throttle } | null, turnTo: dir | null, fc: 'gun' | 'pdc', aim: { foe, part, at: {x, y} } | null, fire, pdcArc,
// torp: foe | null, power, comms, level } (level: the gunner's, for the spread). A torpedo is { id, side: 'us' | 'her', p, v, target } (target: a ship's index).
function radarStep(state, orders, rand) {
  const st = radarClone(state), dt = radarDt(), o = orders || {}, events = [], now = Math.round(st.step * dt * 1e6) / 1e6, at = () => now;  // a step's time is its count's, not the carried t
  const me = st.ships[0], first = st.step % RADAR.SUB === 0;
  if (o.power) st.power = { ...o.power };
  if (o.pdcArc) st.pdcArc = { ...o.pdcArc };
  // move: our hull turns toward the ordered direction (or the burn's), and the drive lights only with the nose inside GATE of the burn
  const want = o.turnTo !== undefined && o.turnTo !== null ? o.turnTo : o.burn ? o.burn.dir : null;
  if (want !== null) { const d = radarTurnBy(me.facing, want), most = RADAR.TURN * dt / RADAR.TURN_S; me.facing = radarNorm(me.facing + Math.max(-most, Math.min(most, d))); }
  let a = { x: 0, y: 0 };
  if (o.burn && o.burn.throttle > 0 && st.me.parts.drive.hp > 0 && Math.abs(radarTurnBy(me.facing, o.burn.dir)) <= RADAR.GATE) {
    const u = radarUnit(o.burn.dir), g = RADAR.ACCEL * Math.min(1, o.burn.throttle) * (st.power.drive / 2);
    a = { x: u.x * g, y: u.y * g };
  }
  for (const [i, s] of st.ships.entries()) {
    const ax = i === 0 ? a.x : 0, ay = i === 0 ? a.y : 0;
    s.p = { x: s.p.x + s.v.x * dt + ax * dt * dt / 2, y: s.p.y + s.v.y * dt + ay * dt * dt / 2 };
    s.v = { x: s.v.x + ax * dt, y: s.v.y + ay * dt };
  }
  const paths = st.torps.map(t => {
    const aim = radarLead(t, st.ships[t.target]), d = radarUnit(radarDir(t.p, aim));
    const from = t.p;
    t.v = { x: d.x * RADAR.TORP_SPEED, y: d.y * RADAR.TORP_SPEED };
    t.p = { x: t.p.x + t.v.x * dt, y: t.p.y + t.v.y * dt };
    return { torp: t, from, to: t.p };
  });
  // fire control: committed to the gun or the PDC at the start of a cycle, for the whole of it
  if (first) st.fc = o.fc === 'pdc' ? 'pdc' : 'gun';
  // fire: the gun, once a cycle for each gun it has, when it is ordered, bears, is not locked and has weapons left; our torpedo when ordered and held
  const hits = [];
  const target = o.aim ? o.aim.foe + 1 : 1;
  if (o.fire && st.fc === 'gun' && st.fired < st.me.guns && st.ships[target]) {
    if (st.locked) { if (!st.spent.includes(`locked:${st.cycle}`)) { st.spent.push(`locked:${st.cycle}`); events.push({ at: at(), kind: 'gunLocked' }); } }
    else if (st.me.parts.weapons.hp <= 0) { if (!st.spent.includes(`noguns:${st.cycle}`)) { st.spent.push(`noguns:${st.cycle}`); events.push({ at: at(), kind: 'noGuns' }); } }
    else if (!radarBears(st, target)) { if (!st.spent.includes(`nobear:${st.cycle}`)) { st.spent.push(`nobear:${st.cycle}`); events.push({ at: at(), kind: 'noBear', foe: target - 1 }); } }
    else {
      st.fired++;
      st.heat += st.power.guns / 2;
      const her = st.ships[target], aimAt = o.aim && o.aim.at ? o.aim.at : her.p, spread = radarSpread(st, o.level || 0, target);
      const r = spread * Math.sqrt(rand()), th = rand() * 2 * Math.PI, land = { x: aimAt.x + r * Math.sin(th), y: aimAt.y + r * Math.cos(th) };
      const km = radarRange(st, target), part = (o.aim && o.aim.part) || 'hull';
      if (radarDist(land, her.p) <= RADAR.HIT_R) {
        const lo = FIGHT.GUN_DMG[0] + FIGHT.SKILL_DMG * st.me.skill, hi = FIGHT.GUN_DMG[1], roll = lo + rand() * (hi - lo);
        hits.push({ to: target, part, dmg: Math.round(roll * st.me.dmgMult * radarFalloff(km) * radarAimMult(km, part)), km });
      } else events.push({ at: at(), kind: 'miss', foe: target - 1, km });
      if (st.heat > RADAR.HEAT_CAP && !st.locked) { st.locked = true; st.lockedAt = st.cycle; events.push({ at: at(), kind: 'overheat' }); }
    }
  }
  if (o.torp !== undefined && o.torp !== null && !st.torpFired && st.me.torps > 0 && st.me.launcher && st.me.parts.launcher && st.me.parts.launcher.hp > 0 && st.ships[o.torp + 1]) {
    st.me.torps--; st.torpFired = true;  // one a cycle
    const t = { id: st.nextTorp++, side: 'us', p: { ...me.p }, v: { x: 0, y: 0 }, target: o.torp + 1 };
    st.torps.push(t);
    events.push({ at: at(), kind: 'launch', side: 'us', torp: t.id, foe: o.torp });
  }
  // point defence: hers at us, through the arc, while the fire control is on the PDC; a stowed PDC never fires
  const gone = new Set();
  for (const { torp, from, to } of paths) {
    if (torp.side !== 'her' || st.fc !== 'pdc' || !st.me.pdc) continue;
    const chance = radarPdcKill(st.pdcArc, from, to, me.p, st.power.pdc);
    if (chance && rand() < chance) { gone.add(torp.id); events.push({ at: at(), kind: 'pdcKill', torp: torp.id }); }
  }
  // damage: the gun's hits, then each torpedo that reached its target this step (nearest point of its path within TORP_HIT)
  for (const h of hits) {
    const side = st.foes[h.to - 1], took = dealDamage(side, side.parts[h.part] || h.part === 'hull' ? h.part : 'hull', h.dmg);
    events.push({ at: at(), kind: 'hit', foe: h.to - 1, part: h.part, dmg: took, km: h.km });
  }
  for (const { torp, from, to } of paths) {
    if (gone.has(torp.id)) continue;
    const ship = st.ships[torp.target];
    if (Math.min(radarDist(from, ship.p), radarDist(to, ship.p), radarDist({ x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 }, ship.p)) <= RADAR.TORP_HIT) {
      gone.add(torp.id);
      const [lo, hi] = torp.side === 'us' ? FIGHT.TORP_DMG : FIGHT.SALVO_DMG, dmg = Math.round(lo + rand() * (hi - lo));
      const side = torp.side === 'us' ? st.foes[torp.target - 1] : st.me;
      events.push({ at: at(), kind: 'impact', side: torp.side, torp: torp.id, dmg: dealDamage(side, 'hull', dmg) });
    }
  }
  st.torps = st.torps.filter(t => !gone.has(t.id));
  st.step++;
  st.t = Math.max(st.t, Math.round(st.step * dt * 1e6) / 1e6);
  // the cycle's bookkeeping, at its last step: heat bleeds; a lock holds through the cycle after the one it came in, and comes off once the heat is back
  // under the cap; the gun and the launcher may fire again
  if (st.step % RADAR.SUB === 0) {
    st.heat = Math.max(0, st.heat - FIGHT.HEAT_VENT);
    if (st.locked && st.cycle > st.lockedAt && st.heat <= RADAR.HEAT_CAP) { st.locked = false; st.lockedAt = null; }
    st.fired = 0; st.torpFired = false;
    st.cycle++;
    events.push({ at: at(), kind: 'cycle', cycle: st.cycle });
  }
  st.events = events;
  return { state: st, events };
}

// Runs the whole steps that `seconds` more of fight time holds, from where the state is (its `t`), so that any split of the same time gives the same fight.
function radarAdvance(state, orders, seconds, rand) {
  const dt = radarDt(), upto = Math.floor((state.t + seconds) / dt + 1e-9);
  let st = state, events = [];
  for (let k = st.step; k < upto; k++) { const r = radarStep(st, orders, rand); st = r.state; events = events.concat(r.events); }
  if (st === state) st = radarClone(state);
  st.t = Math.round((state.t + seconds) * 1e6) / 1e6;
  st.events = events;
  return { state: st, events };
}

// The rest of the cycle the state is in: to the end of its last step.
const radarCycle = (state, orders, rand) => radarAdvance(state, orders, (Math.floor(state.step / RADAR.SUB) + 1) * RADAR.TURN_S - state.t, rand);
