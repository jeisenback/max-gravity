'use strict';

// The radar ship fight's rules (js/radar.js, #1344): the state, motion and the cycle, the gun, the PDC and torpedoes, in plain Node.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./nodecontext');

const api = load(['js/data.js', 'js/range.js', 'js/sheet.js', 'js/handtohand.js', 'js/boarders.js', 'js/shipcombat.js', 'js/fight.js', 'js/radar.js'], { Mods: { register() {} } },
  ['FIGHT', 'RADAR', 'shipSide', 'radarFight', 'radarRange', 'radarStep', 'radarAdvance', 'radarCycle', 'radarBears', 'radarSpread', 'radarFalloff', 'radarAimMult', 'radarPdcKill', 'radarError', 'radarNear', 'radarSeen', 'radarProject', 'radarFoe', 'radarCaptain', 'radarCrew', 'radarCost', 'radarAuto', 'radarEnd', 'radarPauses', 'radarCap', 'RADAR_ORDERS', 'radarWedge', 'radarHold', 'radarScatter', 'radarScatterOf']);
const { FIGHT, RADAR, shipSide, radarFight, radarRange, radarStep, radarAdvance, radarCycle, radarBears, radarFalloff, radarAimMult, radarPdcKill } = api;
const plain = x => JSON.parse(JSON.stringify(x));  // what the vm context made, in this realm
const LOW = () => 0;
// A seeded stream (mulberry32), so a fight can be played twice on the same dice.
const seeded = seed => () => { seed = (seed + 0x6d2b79f5) >>> 0; let t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const side = (armor, guns, extra = {}, opts = {}) => shipSide({ armor, guns, dmgMult: 1, accel: 1, turn: 1, ...extra }, opts);
const fight = (o = {}) => radarFight({ me: side(230, 2, { pdc: true, launcher: true }, { torps: 2 }), foes: [side(150, 1)], nerve: 3, ...o });  // the Ice Hauler's two torpedoes
// Her ship set where a test wants it, still; `held` also takes her drive, so she stays there (her own orders would otherwise move her, radarFoe).
const place = (s, p, i = 1) => { const st = plain(s); st.ships[i].p = p; st.ships[i].v = { x: 0, y: 0 }; return st; };
const held = (s, p, i = 1) => { const st = place(s, p, i); st.foes[i - 1].parts.drive.hp = 0; return st; };
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
  const s = held(fight(), { x: 0, y: 10 }), hot = { fire: true, power: { drive: 0, guns: 6, pdc: 0 } };
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

// ---------- Task 5: fire control, projection and error ----------

test('worn sensors widen the error; resilience holds 40% sensors near 0.7 km; accuracy halves it', () => {
  const at = (sensors, fit = {}) => api.radarError({ sensors, fit });
  assert.ok(Math.abs(at(1) - 0.5) < 1e-9); assert.ok(Math.abs(at(0.4) - 1.25) < 1e-9);
  assert.ok(Math.abs(at(0.4, { resilience: true }) - RADAR.RESILIENT) < 1e-9);
  assert.ok(Math.abs(at(1, { accuracy: true }) - 0.25) < 1e-9);
  assert.ok(at(0.7) > at(1) && at(0.7) < at(0.4));
});

test('her true position is inside her band at every projected cycle, over many seeds', () => {
  for (let seed = 1; seed <= 60; seed++) {
    const rand = seeded(seed), s = place(fight({ types: ['corsair'] }), { x: 8, y: 45 });  // inside JINK, so she burns and jinks
    const proj = api.radarProject(s, {}, 4, api.radarSeen(s, rand));
    let st = s;
    for (let k = 1; k <= 4; k++) {
      st = radarCycle(st, {}, rand).state;
      const at = proj.tracks[1][k], off = Math.hypot(st.ships[1].p.x - at.p.x, st.ships[1].p.y - at.p.y);
      assert.ok(off <= at.band + 1e-9, `seed ${seed}, cycle ${k}: ${off} km off, band ${at.band}`);
    }
  }
});

test('the bands widen as they run forward', () => {
  const t = api.radarProject(place(fight(), { x: 0, y: 40 }), {}, 4).tracks[1];
  for (let k = 1; k < t.length; k++) assert.ok(t[k].band > t[k - 1].band);
});

test('a comms lock narrows the error on her and bends her projected track toward her habit', () => {
  const s = place(fight(), { x: 0, y: 40 }); s.ships[1].a = { x: 0.01, y: 0 };  // she has been burning across
  const locked = plain(s); locked.lockOn = true;
  assert.ok(api.radarError(locked) < api.radarError(s));
  const coast = api.radarProject(s, {}, 2).tracks[1][2].p, habit = api.radarProject(locked, {}, 2).tracks[1][2].p;
  assert.ok(habit.x > coast.x + 1, `bent ${habit.x - coast.x} km toward her burn`);
});

test('a blind cycle loses her past BLIND', () => {
  const far = place(fight(), { x: 0, y: 40 }), near = place(fight(), { x: 0, y: 8 });
  far.blind = true; near.blind = true;
  assert.equal(api.radarSeen(far, LOW)[0], null);
  assert.ok(api.radarSeen(near, LOW)[0]);
});

test('closest approach and the solution are ranges, low under high', () => {
  const s = place(fight(), { x: 3, y: 40 }); s.ships[1].v = { x: 0, y: -0.5 };
  const p = api.radarProject(s, {}, 4);
  assert.ok(p.cpa && p.cpa.min <= p.cpa.max && p.cpa.at > 0);
  assert.ok(p.solution[0] <= p.solution[1] && p.solution[1] > 0);
  const t = plain(s); t.torps.push({ id: 7, side: 'her', p: { x: 0, y: 30 }, v: { x: 0, y: 0 }, target: 0 });
  const imp = api.radarProject(t, {}, 4).impacts[0];
  assert.ok(imp.at[0] <= imp.at[1]); assert.equal(imp.hits, 'yes', 'nothing between it and us');
});

// ---------- Task 6: her, the captain, the crew and the ends ----------

// Plays a fight to its end with the crew on every post, or to `most` cycles.
const play = (s, rand, levels = { pilot: 2, gunner: 2, engineer: 2, comms: 2 }, most = 80) => {
  let st = s, events = [];
  while (!radarEnd(st) && st.cycle < most) { const r = radarCycle(st, api.radarAuto(st, levels, rand), rand); st = r.state; events = events.concat(plain(r.events)); }
  return { state: st, events, end: radarEnd(st) };
};
const { radarEnd } = api;

test('a raider with her lock whole comes alongside and the fight ends boarded; with it shot away she cannot', () => {
  const s = fight({ opening: 'short' }), unarmed = plain(s); unarmed.me.parts.weapons.hp = 0; unarmed.me.torps = 0;  // nothing of ours to stop her coming on
  const whole = play(unarmed, () => 0.5, { pilot: 0, gunner: 0, engineer: 0, comms: 0 });
  assert.ok(whole.events.some(e => e.kind === 'alongside') && whole.end === 'boarded', `ended ${whole.end}`);
  for (let seed = 1; seed <= 20; seed++) {
    const shot = plain(s); shot.foes[0].parts.lock.hp = 0;
    const r = play(shot, seeded(seed));
    assert.notEqual(r.end, 'boarded', `seed ${seed}`);
    assert.ok(!r.events.some(e => e.kind === 'alongside'));
  }
});

test('a corsair arms a cycle before she fires, and the arming is an event', () => {
  const s = place(fight({ types: ['corsair'] }), { x: 0, y: 150 }); s.foes[0].launcher = true; s.foes[0].torps = 4; s.foes[0].parts.launcher = { hp: 10, max: 10 };
  const one = radarCycle(s, {}, LOW), two = radarCycle(one.state, {}, LOW);
  assert.ok(one.events.some(e => e.kind === 'armed'), 'armed in the first cycle');
  assert.ok(!one.events.some(e => e.kind === 'launch' && e.side === 'her'), 'and fires nothing in it');
  assert.equal(two.events.filter(e => e.kind === 'launch' && e.side === 'her').length, FIGHT.SALVO, 'her salvo the next');
  assert.equal(two.state.foes[0].torps, 4 - FIGHT.SALVO);
  assert.equal(api.radarFoe(place(s, { x: 0, y: 200 }), 0, LOW).kind, 'close', 'not past TORP_LAUNCH');
});

test('a raider pair: with one crippled, the other fights on and her lock alone decides boarding', () => {
  const pair = () => radarFight({ me: side(230, 2, { pdc: true, launcher: true }, { torps: 2 }), foes: [side(150, 1), side(150, 1)], types: ['raider', 'raider'], nerve: 3, opening: 'short' });
  const s = plain(pair()); s.foes[0].armor = 0;  // the first is out
  assert.equal(radarEnd(s), null, 'not over while the second is up');
  const lockless = plain(s); lockless.foes[1].parts.lock.hp = 0;  // the crippled one's lock is whole, the live one's is gone
  for (let seed = 1; seed <= 10; seed++) assert.notEqual(play(lockless, seeded(seed)).end, 'boarded', `seed ${seed}: the out ship does not board`);
  const unarmed = plain(s); unarmed.me.parts.weapons.hp = 0; unarmed.me.torps = 0;
  const boards = play(unarmed, () => 0.5, { pilot: 0, gunner: 0, engineer: 0, comms: 0 });
  assert.equal(boards.end, 'boarded'); assert.equal(boards.events.find(e => e.kind === 'alongside').foe, 1, 'the live one');
  const both = plain(s); both.foes[1].armor = 0;
  assert.equal(radarEnd(both), 'crippled', 'over once both are out');
});

test('called-out torpedoes about to hit lead the captain to evade; a cautious captain badly hurt breaks off', () => {
  const s = fight(), soon = { torps: [{ side: 'her', hits: 'yes', at: [0.5, 0.8] }] };
  assert.equal(api.radarCaptain(s, 3, soon), 'evade');
  assert.equal(api.radarCaptain(s, 5, soon), 'evade', 'whatever her nerve');
  assert.equal(api.radarCaptain(s, 3, { torps: [{ side: 'her', hits: 'no', at: [0.5, 0.8] }] }), 'hold', 'not one that misses');
  const hurt = plain(s); hurt.me.armor = Math.round(hurt.me.maxArmor * 0.3);
  assert.equal(api.radarCaptain(hurt, 1), 'break');
  assert.equal(api.radarCaptain(hurt, 3), 'open');
  const ahead = plain(s); ahead.foes[0].armor = Math.round(ahead.foes[0].maxArmor * 0.4);
  assert.equal(api.radarCaptain(ahead, 5), 'engage'); assert.equal(api.radarCaptain(ahead, 3), 'engage', 'a lead of 30 points');
});

test('each order sets the power split, inside the units there are', () => {
  for (const [k, o] of Object.entries(api.RADAR_ORDERS)) assert.equal(o.power.drive + o.power.guns + o.power.pdc, RADAR.POWER, k);
  assert.deepEqual(plain(api.radarCrew(fight(), 'engineer', 2, 'evade', LOW).power), plain(api.RADAR_ORDERS.evade.power));
});

test('the crew pilot coasts nose-on near the range to hold, and burns to it otherwise', () => {
  const near = place(fight(), { x: 0, y: api.RADAR_ORDERS.hold.range + 3 });
  const coast = api.radarCrew(near, 'pilot', 5, 'hold', LOW);
  assert.equal(coast.burn, null); assert.ok(Math.abs(coast.turnTo) < 1e-9, 'nose on her');
  const far = api.radarCrew(place(fight(), { x: 0, y: 50 }), 'pilot', 5, 'hold', LOW);
  assert.ok(far.burn && Math.abs(far.burn.dir) < 1e-9, 'burns toward her, where it was put at level 5');
  const low = api.radarCrew(place(fight(), { x: 0, y: 50 }), 'pilot', 0, 'hold', LOW);
  assert.ok(Math.abs(((low.burn.dir + 540) % 360) - 180 + 0) <= RADAR.SCATTER + 1e-9, 'level 0 lands up to SCATTER off');
});

test('an order\'s cost is shown before it is carried out: opening the range takes the gun off her', () => {
  const s = place(fight(), { x: 0, y: 30 });
  const cost = plain(api.radarCost(s, 'open'));
  assert.deepEqual([cost.bears, cost.why], [false, 'driveAway']);
  assert.equal(Math.abs(((cost.endFacing + 540) % 360) - 180), RADAR.TURN, 'the turn away, as far as it goes in a cycle, either way round');
  assert.equal(api.radarCost(place(fight(), { x: 0, y: 22 }), 'hold').bears, true);
});

test('every fight ends one of the named ways by the cycle cap', () => {
  const ENDS = ['crippled', 'broke', 'away', 'escaped', 'boarded', 'lost', 'ran'];
  const kinds = [['raider'], ['corsair'], ['cutter'], ['raider', 'raider']];
  for (let seed = 1; seed <= 200; seed++) {
    const rand = seeded(seed), types = kinds[seed % kinds.length], foes = types.map(t => side(t === 'cutter' ? 260 : 150, t === 'cutter' ? 2 : 1, t === 'corsair' ? { launcher: true } : {}, t === 'corsair' ? { torps: 4 } : {}));
    const s = radarFight({ me: side(230, 2, { pdc: true, launcher: true }, { torps: 2 }), foes, types, nerve: 1 + (seed % 5), opening: seed % 3 ? 'long' : 'short', rand });
    const r = play(s, rand, { pilot: seed % 6, gunner: seed % 6, engineer: 2, comms: 2 }, api.radarCap(s) + 1);
    assert.ok(ENDS.includes(r.end), `seed ${seed} (${types}): ${r.end} at cycle ${r.state.cycle}`);
    assert.ok(r.state.cycle <= api.radarCap(s));
  }
});

// ---------- Task 7: when real time pauses itself ----------

test('it pauses on a launch, a hit and coming into gun range once, and never on a locked gun or a coast', () => {
  const ev = kinds => kinds.map(k => (typeof k === 'string' ? { kind: k } : k));
  assert.deepEqual(plain(api.radarPauses(null, null, ev([{ kind: 'launch', side: 'her' }]))), ['launched']);
  assert.deepEqual(plain(api.radarPauses(null, null, ev([{ kind: 'launch', side: 'us' }]))), [], 'not our own');
  assert.deepEqual(plain(api.radarPauses(null, null, ev([{ kind: 'hitUs', first: true }]))), ['hit'], 'her guns\' first hit');
  assert.deepEqual(plain(api.radarPauses(null, null, ev(['hitUs']))), [], 'her guns\' later hits do not pause it (the owner, 2026-11-19)');
  assert.deepEqual(plain(api.radarPauses(null, null, ev([{ kind: 'impact', side: 'her' }]))), ['hit'], 'every torpedo does');
  assert.deepEqual(plain(api.radarPauses(null, null, ev(['gunLocked', 'cycle', 'miss', 'hit']))), [], 'a locked gun, a cycle, our own shots');
  assert.deepEqual(plain(api.radarPauses(null, null, ev(['armed', 'pdcSoon']))).sort(), ['armed', 'pdcSoon']);
  // gun range: said by the step once a fight
  let st = place(fight(), { x: 0, y: RADAR.GUN_PAUSE + 0.2 }); st.ships[1].v = { x: 0, y: -1 };
  const seen = [];
  for (let k = 0; k < 3; k++) { const r = radarCycle(st, { burn: null, turnTo: 0 }, LOW); st = r.state; seen.push(plain(r.events).filter(e => e.kind === 'gunRange').length); }
  assert.deepEqual(seen, [1, 0, 0]);
});

test('an order change pauses only into or out of evade or break-off', () => {
  const change = (from, to) => plain(api.radarPauses(null, null, [{ kind: 'order', from, to }]));
  assert.deepEqual(change('hold', 'evade'), ['plan']); assert.deepEqual(change('evade', 'hold'), ['plan']); assert.deepEqual(change('hold', 'break'), ['plan']);
  assert.deepEqual(change('hold', 'engage'), [], 'one that only refines the plan');
  const r = radarCycle(fight(), { order: 'evade' }, LOW);
  assert.ok(plain(r.events).some(e => e.kind === 'order' && e.from === 'hold' && e.to === 'evade'), 'the step says the change');
});

// ---------- review fixes (#1367) ----------

test('our projected track flies on the orders\' power from the next cycle, as the step does: a break order\'s drive', () => {
  const s = fight(); s.ships[0].facing = 180;  // nose already away from her, so the burn lights at once
  const orders = { burn: { dir: 180, throttle: 1 }, power: { drive: 5, guns: 0, pdc: 1 } };
  const proj = api.radarProject(s, orders, 2), flown = cycles(s, orders, 2, LOW).state;
  const at = proj.tracks[0][2].p, off = Math.hypot(flown.ships[0].p.x - at.x, flown.ships[0].p.y - at.y);
  assert.ok(off < 1e-6, `projected ${JSON.stringify(plain(at))}, flown ${JSON.stringify(plain(flown.ships[0].p))}`);
  const onOld = api.radarProject(s, { burn: orders.burn }, 2).tracks[0][2].p;
  assert.ok(Math.abs(onOld.y) < Math.abs(at.y), 'five units of drive go farther than two');
});

test('a contact the board cannot see has no track, closest approach or solution', () => {
  const s = place(fight(), { x: 0, y: 40 }); s.blind = true;
  const p = api.radarProject(s, {}, 2, api.radarSeen(s, LOW));
  assert.deepEqual(plain(p.tracks[1]), []); assert.equal(p.cpa, null); assert.deepEqual(plain(p.solution), [0, 0]);
});

test('no gun power, no shot: an order that gives the guns nothing fires nothing, and says so once a cycle', () => {
  const r = cycles(held(fight(), { x: 0, y: 10 }), { fire: true, power: { drive: 3, guns: 0, pdc: 3 } }, 1, LOW);
  assert.equal(r.events.filter(e => e.kind === 'hit' || e.kind === 'miss').length, 0);
  assert.equal(r.events.filter(e => e.kind === 'noPower').length, 1);
  assert.equal(r.state.heat, 0);
});

test('the projected impact time of a torpedo is when it hits in the fight', () => {
  const s = plain(fight()); s.torps.push({ id: 9, side: 'her', p: { x: 0, y: 30 }, v: { x: 0, y: 0 }, target: 0 });
  const imp = api.radarProject(s, {}, 2).impacts[0];
  let st = s, hit = null;
  for (let k = 0; k < 2 * RADAR.SUB && hit === null; k++) { const r = radarStep(st, {}, LOW); st = r.state; const e = plain(r.events).find(x => x.kind === 'impact'); if (e) hit = e.at; }
  assert.ok(hit !== null, 'it hits');
  assert.ok(Math.abs(hit / RADAR.TURN_S - imp.at[0]) < 1e-6, `projected ${imp.at[0]} cycles, hit at ${hit / RADAR.TURN_S}`);
});

test('a ship fires only the mounts still working: one mount of two shot away, one shot a cycle and one gun\'s volley', () => {
  const s = held(fight(), { x: 0, y: 10 }); s.me.parts.weapons.hp = FIGHT.PART_HP.weapons;  // two guns, one mount's hp left
  assert.equal(cycles(s, { fire: true }, 1, LOW).events.filter(e => e.kind === 'hit' || e.kind === 'miss').length, 1);
  const two = held(radarFight({ me: side(230, 2), foes: [side(150, 2)], nerve: 3 }), { x: 0, y: 10 }), one = plain(two); one.foes[0].parts.weapons.hp = FIGHT.PART_HP.weapons;
  const took = st => plain(cycles(st, {}, 1, () => 0.999).events).filter(e => e.kind === 'hitUs').map(e => e.dmg);
  const [full] = took(two), [half] = took(one);
  assert.ok(full && half && Math.abs(full / half - 2) < 0.05, `two mounts ${full}, one ${half}`);
});

// ---------- Task 10: the hand at the pilot's post ----------

test('the wedge is the order\'s plotted line, half its width either side, at full throttle; a coast allows any direction at the order\'s trim', () => {
  const { radarWedge, radarCrew, RADAR_ORDERS } = api;
  const s = place(fight(), { x: 0, y: 100 });  // far from the range to hold: the order plots a burn toward her
  const w = plain(radarWedge(s, 'hold')), p = radarCrew(s, 'pilot', 5, 'hold', () => 0.5);
  assert.deepEqual(w, { dir: p.burn.dir, half: RADAR_ORDERS.hold.wedge / 2, most: 1 });
  const near = place(fight(), { x: 0, y: RADAR_ORDERS.hold.range });  // at the range to hold and not closing: a coast
  assert.deepEqual(plain(radarWedge(near, 'hold')), { dir: null, half: 180, most: RADAR_ORDERS.hold.trim });
});

test('a burn dragged outside the wedge is held to its nearer edge, and its throttle to the most the order allows', () => {
  const { radarHold } = api, w = { dir: 0, half: 45, most: 1 };
  assert.deepEqual(plain(radarHold({ dir: 120, throttle: 1 }, w)), { dir: 45, throttle: 1 });
  assert.deepEqual(plain(radarHold({ dir: 250, throttle: 1 }, w)), { dir: 315, throttle: 1 });
  assert.deepEqual(plain(radarHold({ dir: 20, throttle: 0.6 }, w)), { dir: 20, throttle: 0.6 });
  assert.deepEqual(plain(radarHold({ dir: 200, throttle: 1 }, { dir: null, half: 180, most: 0.3 })), { dir: 200, throttle: 0.3 });
});

test('a burn lands up to SCATTER off where it was put at level 0, and on it at level 5', () => {
  const { radarScatter, radarScatterOf } = api, put = { dir: 90, throttle: 1 };
  assert.equal(radarScatterOf(0), RADAR.SCATTER);
  assert.equal(radarScatter(put, 0, () => 1).dir, 90 + RADAR.SCATTER);
  assert.equal(radarScatter(put, 0, LOW).dir, 90 - RADAR.SCATTER);
  const r = seeded(7), offs = Array.from({ length: 200 }, () => radarScatter(put, 0, r).dir - 90);
  assert.ok(offs.every(d => Math.abs(d) <= RADAR.SCATTER) && offs.some(d => Math.abs(d) > RADAR.SCATTER / 2), 'off by up to the scatter');
  assert.equal(radarScatter(put, 5, () => 1).dir, 90);
});

test('advanced a step\'s time at a time, the fight runs a step each time and never falls behind its clock', () => {
  const dt = RADAR.TURN_S / RADAR.SUB;
  let st = fight();
  for (let k = 1; k <= 3 * RADAR.SUB; k++) {
    st = radarAdvance(st, {}, dt, LOW).state;  // a frame of a step's length, from where the clock is kept (to a millionth of a second)
    assert.equal(st.step, k, `at ${st.t} s`);
  }
});

test('the gun\'s solution is for the one it is aimed at: with a pair, aimed at the one that bears, it is not the other\'s nothing', () => {
  const { radarProject } = api;
  let s = fight({ foes: [side(150, 1), side(150, 1)] });
  s = place(s, { x: 0, y: -15 }, 1);  // the first astern, out of the gun's bearing
  s = place(s, { x: 0, y: 15 }, 2);   // her consort dead ahead
  assert.deepEqual(plain(radarProject(s, {}, 1).solution), [0, 0], 'unaimed: the first of hers, who does not bear');
  const aimed = plain(radarProject(s, { aim: { foe: 1, part: 'hull' } }, 1).solution);
  assert.ok(aimed[1] > 0, `aimed at her consort, who bears: ${aimed}`);
});

test('more power to the guns hits harder: a shot on the engage order\'s guns does the half again of one on hold\'s', () => {
  const s = place(fight(), { x: 0, y: 10 }), RADAR_ORDERS = api.RADAR_ORDERS;
  const dmg = power => { const st = plain(s); st.power = { ...power }; return plain(radarStep(st, { fire: true, power }, () => 0.5).events).find(e => e.kind === 'hit').dmg; };
  const hold = dmg(RADAR_ORDERS.hold.power), engage = dmg(RADAR_ORDERS.engage.power);
  assert.equal(engage, Math.round(hold * RADAR_ORDERS.engage.power.guns / RADAR.GUN_POWER), `${engage} against ${hold}`);
});

test('her guns\' first hit of the fight is marked as the first, and only it', () => {
  let s = held(fight(), { x: 0, y: 10 }); const firsts = [];
  for (let k = 0; k < 3; k++) { const r = radarCycle(s, {}, () => 0.1); s = r.state; firsts.push(...plain(r.events).filter(e => e.kind === 'hitUs').map(e => !!e.first)); }
  assert.ok(firsts.length >= 2, 'she hit more than once');
  assert.deepEqual(firsts, [true, ...firsts.slice(1).map(() => false)]);
});
