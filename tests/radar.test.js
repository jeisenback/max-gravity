'use strict';

// The radar ship fight's rules (js/radar.js, #1344): the state, motion and the cycle, the gun, the PDC and torpedoes, in plain Node.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./nodecontext');

const api = load(['js/data.js', 'js/range.js', 'js/sheet.js', 'js/handtohand.js', 'js/boarders.js', 'js/shipcombat.js', 'js/fight.js', 'js/radar.js'], { Mods: { register() {} } },
  ['FIGHT', 'RADAR', 'shipSide', 'radarFight', 'radarRange', 'radarStep', 'radarAdvance', 'radarCycle', 'radarBears', 'radarSpread', 'radarFalloff', 'radarAimMult', 'radarPdcKill', 'radarError', 'radarNear']);
const { FIGHT, RADAR, shipSide, radarFight, radarRange, radarStep, radarAdvance, radarCycle, radarBears, radarFalloff, radarAimMult, radarPdcKill } = api;
const plain = x => JSON.parse(JSON.stringify(x));  // what the vm context made, in this realm
const LOW = () => 0;
// A seeded stream (mulberry32), so a fight can be played twice on the same dice.
const seeded = seed => () => { seed = (seed + 0x6d2b79f5) >>> 0; let t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const side = (armor, guns, extra = {}, opts = {}) => shipSide({ armor, guns, dmgMult: 1, accel: 1, turn: 1, ...extra }, opts);
const fight = (o = {}) => radarFight({ me: side(230, 2, { pdc: true, launcher: true }, { torps: 2 }), foes: [side(150, 1)], nerve: 3, ...o });  // the Ice Hauler's two torpedoes
// Her ship set where a test wants it, still.
const place = (s, p, i = 1) => { const st = plain(s); st.ships[i].p = p; st.ships[i].v = { x: 0, y: 0 }; return st; };
const cycles = (s, orders, n, rand) => { let st = s, events = []; for (let k = 0; k < n; k++) { const r = radarCycle(st, orders, rand); st = r.state; events = events.concat(plain(r.events)); } return { state: st, events }; };
const speed = s => Math.hypot(s.ships[0].v.x, s.ships[0].v.y);

// ---------- Task 1: the state ----------

test('a fight opens at the meeting range with our ship at the centre, her sides as the old fight builds them', () => {
  const s = fight();
  assert.equal(radarRange(s), RADAR.MEET);
  assert.deepEqual(plain(s.ships[0].p), { x: 0, y: 0 });
  assert.equal(s.me.armor, Math.round(230 * FIGHT.POOL));
  assert.equal(s.foes[0].armor, Math.round(150 * FIGHT.POOL));
  assert.equal(s.fc, 'gun');
  assert.equal(s.power.drive + s.power.guns + s.power.pdc, RADAR.POWER);
});

test('the short opening meets her at MEET_SHORT km', () => {
  assert.equal(radarRange(fight({ opening: 'short' })), RADAR.MEET_SHORT);
});

test('she closes at about CLOSING km a cycle from the meeting', () => {
  const r = cycles(fight(), {}, 1, LOW);
  assert.ok(Math.abs(RADAR.MEET - radarRange(r.state) - RADAR.CLOSING) < 1e-6, `closed ${RADAR.MEET - radarRange(r.state)} km`);
});

test('the rules change nothing they are given', () => {
  const s = fight(), before = JSON.stringify(s);
  radarCycle(s, { burn: { dir: 90, throttle: 1 }, fire: true }, seeded(1));
  assert.equal(JSON.stringify(s), before);
});

// ---------- Task 2: motion, facing and the cycle ----------

test('a flip and burn takes about two cycles: the drive does not light until the nose comes round', () => {
  const s = fight(), burn = { burn: { dir: 180, throttle: 1 } };
  const one = cycles(s, burn, 1, LOW).state, two = cycles(one, burn, 1, LOW).state;
  assert.ok(Math.abs(Math.abs(((one.ships[0].facing + 540) % 360) - 180) - RADAR.TURN) < 1e-6, `turned ${one.ships[0].facing} after one cycle, either way round`);
  assert.equal(speed(one), 0, 'no burn while the nose is more than GATE off');
  assert.ok(speed(two) > 0, 'lit once the nose came within GATE of the burn');
  assert.ok(two.ships[0].v.y < 0, 'and it burns the way it was ordered');
});

test('the hull turns at most TURN degrees in a cycle', () => {
  const r = cycles(fight(), { turnTo: 170 }, 1, LOW);
  assert.ok(Math.abs(r.state.ships[0].facing - RADAR.TURN) < 1e-6, `facing ${r.state.ships[0].facing}`);
  assert.ok(Math.abs(cycles(r.state, { turnTo: 170 }, 1, LOW).state.ships[0].facing - 170) < 1e-6, 'and gets there the next');
});

test('a ship with no drive does not burn', () => {
  const s = plain(fight()); s.me.parts.drive.hp = 0; s.ships[0].facing = 90;
  assert.equal(speed(cycles(s, { burn: { dir: 90, throttle: 1 } }, 2, LOW).state), 0);
});

test('momentum: a ship that has burned goes on at that speed once the burn stops', () => {
  const s = plain(fight()); s.ships[0].facing = 90;
  const burned = cycles(s, { burn: { dir: 90, throttle: 1 } }, 1, LOW).state, v = speed(burned);
  const coasted = cycles(burned, {}, 1, LOW).state;
  assert.ok(v > 0 && Math.abs(speed(coasted) - v) < 1e-9);
  assert.ok(coasted.ships[0].p.x - burned.ships[0].p.x > v * RADAR.TURN_S - 1e-6, 'and covers that a cycle');
});

test('a cycle advanced in one call, in 0.05 s frames at 16x, or with a pause in the middle, gives the same state and events', () => {
  const start = place(fight(), { x: 0, y: 30 });
  const orders = { burn: { dir: 20, throttle: 0.5 }, fire: true, aim: { foe: 0, part: 'hull' }, level: 2 };
  const once = cycles(start, orders, 2, seeded(7));
  let st = start, events = [];
  const frames = seeded(7);
  while (st.cycle < 2) { const r = radarAdvance(st, orders, 0.05 * 16, frames); st = r.state; events = events.concat(plain(r.events)); }
  const paused = seeded(7);
  let p = start, pe = [];
  for (const secs of [7.3, 0, 0, 12.7, 0, 20]) { const r = radarAdvance(p, orders, secs, paused); p = r.state; pe = pe.concat(plain(r.events)); }
  const strip = s => { const x = plain(s); delete x.events; return x; };
  assert.deepEqual(strip(st), strip(once.state), 'frames of 0.8 s');
  assert.deepEqual(events, once.events);
  assert.deepEqual(strip(p), strip(once.state), 'with pauses');
  assert.deepEqual(pe, once.events);
  assert.ok(once.events.some(e => e.kind === 'hit' || e.kind === 'miss'), 'the gun fired in it, so the dice were used');
});

test('a cycle ends with its bookkeeping: the cycle counts on and the gun may fire again', () => {
  const r = cycles(place(fight(), { x: 0, y: 10 }), { fire: true }, 1, LOW);
  assert.equal(r.state.cycle, 1);
  assert.equal(r.state.fired, 0);
  assert.equal(r.events.filter(e => e.kind === 'hit').length, 2, 'two guns, a shot each');
  assert.equal(r.events[r.events.length - 1].kind, 'cycle');
});

// ---------- Task 3: the gun, her parts and heat ----------

test('a shot at her lock at 40 km loses damage to the aim penalty; the same shot at her hull lands in full', () => {
  const s = place(fight(), { x: 0, y: 40 }), lo = FIGHT.GUN_DMG[0] + FIGHT.SKILL_DMG * s.me.skill;
  const shot = part => plain(cycles(s, { fire: true, aim: { foe: 0, part } }, 1, LOW).events).filter(e => e.kind === 'hit').map(e => e.dmg);
  assert.deepEqual(shot('hull'), [1, 1].map(() => Math.round(lo * radarFalloff(40))), 'the hull: the falloff only');
  assert.deepEqual(shot('lock'), [1, 1].map(() => Math.round(lo * radarFalloff(40) * radarAimMult(40, 'lock'))), 'her lock: the falloff and the aim penalty');
  assert.equal(radarAimMult(40, 'hull'), 1); assert.equal(radarAimMult(40, 'weapons'), 1);
  assert.equal(radarAimMult(40, 'lock'), FIGHT.AIM_MULT.long); assert.equal(radarAimMult(3, 'lock'), FIGHT.AIM_MULT.knife);
});

test('damage falls off past 20 km and past 30 km', () => {
  assert.deepEqual([10, 20, 25, 30, 31].map(radarFalloff), [1, 1, 0.75, 0.75, 0.5]);
});

test('a gun that does not bear does not fire, and says so in the events', () => {
  const s = place(fight(), { x: 0, y: -20 });  // behind us: our nose is at 0, she is at 180
  assert.equal(radarBears(s), false);
  const r = cycles(s, { fire: true }, 1, LOW);
  assert.equal(r.events.filter(e => e.kind === 'hit' || e.kind === 'miss').length, 0);
  assert.equal(r.events.filter(e => e.kind === 'noBear').length, 1, 'said once a cycle');
  assert.equal(r.state.foes[0].armor, s.foes[0].armor);
});

test('the spread grows with range and our speed off her line, and the gunner\'s level takes some off', () => {
  const near = place(fight(), { x: 0, y: 20 }), far = place(fight(), { x: 0, y: 120 }), moving = plain(near); moving.ships[0].v = { x: 1, y: 0 };
  assert.ok(api.radarSpread(far, 0) > api.radarSpread(near, 0));
  assert.ok(api.radarSpread(moving, 0) > api.radarSpread(near, 0));
  assert.ok(api.radarSpread(near, 5) < api.radarSpread(near, 0));
});

test('a shot that lands farther than HIT_R from her misses', () => {
  const r = cycles(place(fight(), { x: 0, y: 30 }), { fire: true, aim: { foe: 0, part: 'hull', at: { x: 5, y: 30 } } }, 1, LOW);  // aimed 5 km off her, no spread at LOW
  assert.equal(r.events.filter(e => e.kind === 'hit').length, 0);
  assert.equal(r.events.filter(e => e.kind === 'miss').length, 2);
});

test('heat over the cap locks the gun for the next cycle, until it bleeds off', () => {
  const s = place(fight(), { x: 0, y: 10 }), hot = { fire: true, power: { drive: 0, guns: 6, pdc: 0 } };
  const one = cycles(s, hot, 1, LOW);
  assert.ok(one.events.some(e => e.kind === 'overheat'));
  assert.equal(one.state.locked, true, 'two shots at six units: over HEAT_CAP');
  const two = cycles(one.state, hot, 1, LOW);
  assert.equal(two.events.filter(e => e.kind === 'hit' || e.kind === 'miss').length, 0, 'no shot the cycle after');
  assert.ok(two.events.some(e => e.kind === 'gunLocked'));
  assert.equal(two.state.locked, false, 'bled off by the end of it');
  assert.ok(cycles(two.state, { fire: true }, 1, LOW).events.some(e => e.kind === 'hit'), 'and fires again');
});

// ---------- Task 4: the PDC and torpedoes ----------

const herTorp = (s, from) => { const st = plain(s); st.torps.push({ id: 99, side: 'her', p: from, v: { x: 0, y: 0 }, target: 0 }); return st; };

test('a torpedo that crosses the whole PDC reach in one step is still checked against the arc', () => {
  const from = { x: 0, y: RADAR.PDC_R + 2 }, to = { x: 0, y: -(RADAR.PDC_R + 2) };  // both ends outside the reach
  assert.ok(radarPdcKill({ dir: 0, width: 90 }, from, to) > 0);
});

test('a narrow arc kills more of the torpedoes inside it, and none outside it', () => {
  const from = { x: 0, y: 8 }, to = { x: 0, y: 2 };  // straight in along the arc's centre
  const narrow = radarPdcKill({ dir: 0, width: 30 }, from, to), wide = radarPdcKill({ dir: 0, width: 120 }, from, to);
  assert.ok(narrow > wide && wide > 0, `${narrow} > ${wide}`);
  assert.equal(radarPdcKill({ dir: 180, width: 30 }, from, to), 0, 'the arc the other way');
  assert.equal(radarPdcKill({ dir: 0, width: 30 }, { x: 0, y: 30 }, { x: 0, y: 20 }), 0, 'outside the reach');
});

test('with the fire control on the gun the PDC does not fire, whatever its arc; on the PDC it does', () => {
  const s = herTorp(fight(), { x: 0, y: 12 });
  const gun = cycles(s, { fc: 'gun', pdcArc: { dir: 0, width: 20 } }, 1, () => 0);
  assert.equal(gun.events.filter(e => e.kind === 'pdcKill').length, 0);
  assert.equal(gun.events.filter(e => e.kind === 'impact' && e.side === 'her').length, 1, 'and it hits us');
  assert.ok(gun.state.me.armor < s.me.armor);
  const pdc = cycles(s, { fc: 'pdc', pdcArc: { dir: 0, width: 20 } }, 1, () => 0);
  assert.equal(pdc.events.filter(e => e.kind === 'pdcKill').length, 1);
  assert.equal(pdc.state.me.armor, s.me.armor);
});

test('changing fc mid-cycle takes effect at the next cycle only', () => {
  const half = radarAdvance(fight(), { fc: 'gun' }, RADAR.TURN_S / 2, LOW).state;
  const mid = radarAdvance(half, { fc: 'pdc' }, RADAR.TURN_S / 4, LOW).state;
  assert.equal(mid.fc, 'gun', 'committed at the cycle\'s start');
  const next = radarAdvance(mid, { fc: 'pdc' }, RADAR.TURN_S / 2, LOW).state;
  assert.equal(next.cycle, 1); assert.equal(next.fc, 'pdc');
});

test('a torpedo\'s hit is its closest approach over the step: a glancing pass between the ends and the middle is seen', () => {
  // the review's case: a 1.75 km step whose nearest point, 0.45 km off, is at the quarter; the ends and the middle are all past TORP_HIT
  const a = { x: -0.4375, y: 0.45 }, b = { x: 1.3125, y: 0.45 }, mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, off = p => Math.hypot(p.x, p.y);
  assert.ok([a, b, mid].every(p => off(p) > RADAR.TORP_HIT), 'three samples would miss it');
  assert.ok(Math.abs(api.radarNear(a, b) - 0.45) < 1e-9);
  assert.ok(api.radarNear(a, b) <= RADAR.TORP_HIT, 'so it hits');
  assert.equal(api.radarNear({ x: 1, y: 1 }, { x: 2, y: 2 }), Math.hypot(1, 1), 'a segment moving away: its near end');
});

test('a power split changed mid-cycle takes effect at the next cycle only', () => {
  const half = radarAdvance(fight(), {}, RADAR.TURN_S / 2, LOW).state, split = { drive: 0, guns: 6, pdc: 0 };
  const mid = radarAdvance(half, { power: split }, RADAR.TURN_S / 4, LOW).state;
  assert.deepEqual(plain(mid.power), plain(fight().power), 'set a cycle at a time');
  const next = radarAdvance(mid, { power: split }, RADAR.TURN_S / 2, LOW).state;
  assert.equal(next.cycle, 1); assert.deepEqual(plain(next.power), split);
});

test('our torpedo is fired by the gunner, spent, and steers to her', () => {
  const s = place(fight(), { x: 30, y: 60 });
  const r = cycles(s, { torp: 0 }, 1, LOW);
  assert.equal(r.state.me.torps, s.me.torps - 1, 'one a cycle while it is ordered');
  assert.ok(r.events.some(e => e.kind === 'launch' && e.side === 'us'));
  const t = r.state.torps[0];
  assert.ok(t && radarRange(s) > Math.hypot(t.p.x - 30, t.p.y - 60), 'closer to her than it began');
});
