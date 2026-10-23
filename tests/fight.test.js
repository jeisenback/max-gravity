'use strict';

// The turn-based fight engine (js/fight.js): sides, damage in ranges, heat and parts, in plain Node.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./nodecontext');

const api = load(['js/data.js', 'js/range.js', 'js/sheet.js', 'js/handtohand.js', 'js/boarders.js', 'js/shipcombat.js', 'js/fight.js'], { Mods: { register() {} } }, ['SHIPS', 'OUTFITS', 'FIGHT', 'RANGE_BANDS', 'shipSide', 'shipFight', 'gunsReady', 'resolveShipTurn', 'FIGHT_MOVES', 'canUse', 'shotRange', 'foeMove', 'captainMove', 'shipEnd', 'DECK', 'CUNNING', 'fightCover', 'deckFight', 'boardMove', 'resolveDeckTurn', 'deckEnd']);  // boarders.js is loaded for REPEL_HURT; Mods is the one thing it reaches for at load
const { SHIPS, OUTFITS, FIGHT, RANGE_BANDS, shipSide, shipFight, gunsReady, resolveShipTurn, FIGHT_MOVES, canUse, shotRange, foeMove, captainMove, shipEnd, DECK, CUNNING, fightCover, deckFight, boardMove, resolveDeckTurn, deckEnd } = api;
const LOW = () => 0, HIGH = () => 0.999;
const CLOSE = RANGE_BANDS.indexOf('close');
const HULL = { kind: 'broadside', target: 'hull', dmg: [8, 14] };
const hold = { kind: 'hold' };
const plain = x => JSON.parse(JSON.stringify(x));  // arrays made in the vm context are not this realm's

const fight = (me = {}, foe = {}, band = CLOSE) => shipFight({
  me: shipSide({ shields: 90, armor: 140, guns: 2, dmgMult: 1, accel: 1, turn: 1, ...me.stats }, me.opts || {}),
  foes: [shipSide({ shields: 50, armor: 100, guns: 1, dmgMult: 1, accel: 1, turn: 1, ...foe.stats }, foe.opts || {})],
  nerve: 0, band
});
const fire = (n, part = 'hull') => Array.from({ length: n }, () => ({ foe: 0, part }));
const orders = (guns, extra = {}) => ({ guns, torp: null, pdc: 'fire', ...extra });
const K = RANGE_BANDS.indexOf('knife'), M = RANGE_BANDS.indexOf('mid'), L = RANGE_BANDS.indexOf('long');
const quiet = { foe: [hold], captain: hold };

test('a side takes its hull from the ship and its outfits', () => {
  const s = shipSide({ shields: 90, armor: 140, guns: 1, dmgMult: 1 }, {});
  assert.deepEqual([s.shields, s.armor, s.parts.weapons.max, s.parts.drive.max, s.parts.lock.max], [41, 63, 63, 34, 7], 'her 90 and 140 at FIGHT.POOL 0.45, rounded');
  assert.equal(shipSide({ shields: 0, armor: 100, guns: 3, dmgMult: 1 }, {}).parts.weapons.max, 189, 'weapons are sized per gun mount');
});

test('shipSide scales shields and armor by FIGHT.POOL', () => {
  assert.ok(FIGHT.POOL > 0 && FIGHT.POOL < 1, `POOL ${FIGHT.POOL}`);
  const s = shipSide({ shields: 90, armor: 140, guns: 1, dmgMult: 1 }, {});
  const pool = n => Math.round(n * FIGHT.POOL);
  assert.deepEqual([s.shields, s.maxShields, s.armor, s.maxArmor], [pool(90), pool(90), pool(140), pool(140)]);
  const v = shipSide({ shields: 50, armor: 100, guns: 1, dmgMult: 1 }, { grade: 2 });
  assert.deepEqual([v.shields, v.armor, v.maxArmor], [pool(50), pool(160), pool(160)], 'a veteran\'s longer hull is scaled too');
  assert.deepEqual([s.parts.weapons.max, s.parts.drive.max, s.parts.lock.max], [63, 34, 7], 'the parts are not');
});

test('a veteran grade lengthens the hull and raises the punch, and the state starts at turn 0', () => {
  const s = shipSide({ shields: 50, armor: 100, guns: 1, dmgMult: 1 }, { grade: 2, skill: 1, torps: 3 });
  assert.deepEqual([s.armor, s.maxArmor, s.dmgMult, s.skill, s.torps], [72, 72, 1.3, 1, 3], 'her 100 lengthened to 160, at FIGHT.POOL 0.45');
  const st = fight();
  assert.deepEqual(plain([st.kind, st.band, st.heat, st.locked, st.turn, st.log]), ['ship', CLOSE, 0, [], 0, []]);
});

test('a shot does damage within its range, times heavy rounds and the band', () => {
  const st = fight({ stats: { guns: 1, dmgMult: 1.4 } });
  const lo = resolveShipTurn(st, orders(fire(1)), quiet, LOW).events[0];
  const hi = resolveShipTurn(st, orders(fire(1)), quiet, HIGH).events[0];
  assert.deepEqual([lo.dmg, hi.dmg], [11, 20], '8 * 1.4 and 14 * 1.4, rounded');
  const long = fight({ stats: { guns: 1 } }, {}, RANGE_BANDS.indexOf('long'));
  assert.equal(resolveShipTurn(long, orders(fire(1)), quiet, HIGH).events[0].dmg, 11, '14 * 0.8');
  const skilled = fight({ stats: { guns: 1 }, opts: { skill: 2 } });
  assert.equal(resolveShipTurn(skilled, orders(fire(1)), quiet, LOW).events[0].dmg, 10, 'a gunner adds a point a level to the low end');
});

test('damage takes shields before armor, and a part at 0 is out', () => {
  const st = fight({ stats: { guns: 1 } }, { stats: { shields: 5 } });
  const foe = resolveShipTurn(st, orders(fire(1)), quiet, LOW).state.foes[0];
  assert.deepEqual([foe.armor, foe.shields], [39, 0], 'the 8 points took the 2 shields (5 at FIGHT.POOL), then 6 of her 45 armor; no shields come back in the fight');
  const part = fight({ stats: { guns: 1, dmgMult: 100 } });
  const r = resolveShipTurn(part, orders(fire(1, 'drive')), quiet, LOW);
  assert.equal(r.state.foes[0].parts.drive.hp, 0, 'hp does not go below 0');
  assert.deepEqual([r.state.foes[0].armor, r.state.foes[0].shields], [45, 23], 'a part hit leaves the hull alone (100 and 50 at FIGHT.POOL)');
});

test('each shot adds 1 heat and 2 bleed off a turn; over 4, a gun is locked next turn', () => {
  let st = fight({ stats: { guns: 4 } });
  st = resolveShipTurn(st, orders(fire(3)), quiet, LOW).state;
  assert.deepEqual([st.heat, st.locked.length], [1, 0], '3 shots, 2 bled off');
  st = resolveShipTurn(st, orders(fire(4)), quiet, LOW).state;
  assert.deepEqual([st.heat, st.locked.length], [3, 1], '5 is over the cap of 4: a gun is locked, and 2 bleed off');
  assert.equal(gunsReady(st), 3);
  const r = resolveShipTurn(st, orders(fire(4)), quiet, LOW);
  assert.equal(r.events.filter(e => e.who === 'me').length, 3, 'only the ready guns fire');
});

test('an overcharged shot rolls OVER_MULT more and adds two heat', () => {
  const st = { ...fight({ stats: { guns: 1, dmgMult: 2 } }), heat: 3 };
  const plainShot = resolveShipTurn(st, orders([{ foe: 0, part: 'hull' }]), quiet, LOW);
  const overShot = resolveShipTurn(st, orders([{ foe: 0, part: 'hull', over: true }]), quiet, LOW);
  assert.deepEqual([plainShot.events[0].dmg, overShot.events[0].dmg], [16, 24], 'a ratio of OVER_MULT, 1.5');
  assert.deepEqual([plainShot.state.heat, overShot.state.heat], [2, 3], '3 + 1 and 3 + 2, less the vent of 2');
});

test('two overcharged shots go over the heat cap and lock a gun next turn', () => {
  const over = [{ foe: 0, part: 'hull', over: true }, { foe: 0, part: 'hull', over: true }];
  const base = fight({ stats: { guns: 2 } });
  const cool = resolveShipTurn(base, orders(over), quiet, LOW).state;
  assert.deepEqual([cool.heat, cool.locked.length], [2, 0], '4 is at the cap, not over it: the existing rule locks only over HEAT_CAP');
  const warm = resolveShipTurn({ ...base, heat: 1 }, orders(over), quiet, LOW).state;
  assert.deepEqual([warm.heat, warm.locked.length], [3, 1], 'carried heat 1 + 4 is 5, over the cap of 4');
});

test('a shot at her drive at long range is cut by AIM_MULT.long on top of the band; at her hull it is not', () => {
  const st = fight({ stats: { guns: 1 } }, {}, L);
  const at = part => resolveShipTurn(st, orders([{ foe: 0, part }]), quiet, HIGH).events[0].dmg;
  assert.equal(at('hull'), 11, '14 * 0.8');
  assert.equal(at('weapons'), 11, 'her weapons are not aimed at');
  assert.equal(at('drive'), 3, '14 * 0.8 * 0.25, 2.8');
  assert.equal(at('lock'), 3);
  const mid = fight({ stats: { guns: 1 } }, {}, M);
  assert.equal(resolveShipTurn(mid, orders([{ foe: 0, part: 'drive' }]), quiet, HIGH).events[0].dmg, 5, '14 * 0.85 * 0.4, 4.76');
});

test('shotRange gives the roll an order would make', () => {
  const st = fight({ stats: { guns: 1, dmgMult: 1.3 }, opts: { skill: 2 } }, {}, M);
  for (const p of ['drive', 'lock']) st.foes[0].parts[p].hp = 999;  // a part's hp would cap the damage the shot is compared by
  for (const o of [{ foe: 0, part: 'hull' }, { foe: 0, part: 'drive', over: true }, { foe: 0, part: 'lock' }]) {
    const lo = resolveShipTurn(st, orders([o]), quiet, LOW).events[0].dmg, hi = resolveShipTurn(st, orders([o]), quiet, HIGH).events[0].dmg;
    assert.deepEqual(plain(shotRange(st, o)), [lo, hi], JSON.stringify(o));
  }
});

test('with every gun locked the turn still resolves: no shots, heat bleeds, the foe acts', () => {
  const st = { ...fight({ stats: { guns: 1 } }), heat: 4, locked: [0] };
  assert.equal(gunsReady(st), 0);
  const r = resolveShipTurn(st, orders(fire(1)), { foe: [HULL], captain: hold }, LOW);
  assert.deepEqual(plain(r.events), [{ who: 'foe', foe: 0, part: 'hull', dmg: 8 }]);
  assert.deepEqual(plain([r.state.heat, r.state.locked, r.state.turn]), [2, [], 1]);
});

test('weapons damage takes mounts out of the volley', () => {
  const st = fight({ stats: { guns: 2 } });
  st.me.parts.weapons.hp = 20;
  assert.equal(gunsReady(st), 1);
  st.me.parts.weapons.hp = 0;
  assert.equal(gunsReady(st), 0);
});

test('a ship with no launcher or no turret ignores torp and pdc orders', () => {
  const st = fight({ stats: { guns: 1 }, opts: { torps: 2 } });
  const r = resolveShipTurn(st, orders(fire(1), { torp: { foe: 0, part: 'hull' }, pdc: 'hold' }), { foe: [HULL], captain: hold }, LOW);
  assert.equal(r.events.length, 2, 'one gun shot and the foe\'s broadside, no torpedo');
  assert.equal(r.state.me.torps, 2);
  assert.equal(r.events[1].dmg, 8, 'the volley is not cut');
});

test('a launcher with torpedoes fires one for its large hit, and the foe\'s turret cuts it down', () => {
  const mk = foe => fight({ stats: { guns: 1, launcher: true }, opts: { torps: 1 } }, foe);
  const o = orders([], { torp: { foe: 0, part: 'hull' } });
  const bare = resolveShipTurn(mk({}), o, quiet, HIGH);
  assert.equal(bare.events[0].dmg, 18);
  assert.equal(bare.state.me.torps, 0);
  assert.equal(resolveShipTurn(mk({ stats: { pdc: true } }), o, quiet, HIGH).events[0].dmg, 11, '18 less 40 percent');
});

test('a turret held back cuts the next volley by 40 percent', () => {
  const st = fight({ stats: { guns: 2, pdc: true } });
  const volley = { foe: [{ kind: 'broadside', target: 'hull', dmg: [20, 20] }], captain: hold };
  const open = resolveShipTurn(st, orders([]), volley, LOW).events[0].dmg;
  const held = resolveShipTurn(st, orders([], { pdc: 'hold' }), volley, LOW).events[0].dmg;
  assert.deepEqual([open, held], [20, 12]);
});

test('a cutter\'s shields come back by her regen share each turn, a raider\'s not at all', () => {
  const stats = { shields: 90, armor: 140, guns: 1, dmgMult: 1, accel: 1, turn: 1 };
  const st = fight();
  st.foes = [shipSide(stats, { regen: 0.25 }), shipSide(stats, { regen: 0 })];
  st.foes.forEach(f => { f.shields = 0; });
  const r = resolveShipTurn(st, orders([]), { foe: [hold, hold], captain: hold }, LOW).state;
  assert.deepEqual(plain(r.foes.map(f => f.shields)), [Math.round(0.25 * 41), 0], 'a quarter of her 41 (90 at FIGHT.POOL)');
  assert.equal(r.band, CLOSE, 'the band does not move');
});

test('a side with a launcher has a launcher part; one without has none', () => {
  const stats = { shields: 50, armor: 100, guns: 1, dmgMult: 1 };
  const a = shipSide(stats, { launcher: true });
  assert.deepEqual(plain([a.parts.launcher, a.launcher]), [{ hp: FIGHT.PART_HP.launcher, max: FIGHT.PART_HP.launcher }, true]);
  const b = shipSide(stats, {});
  assert.deepEqual([b.parts.launcher, b.launcher], [undefined, false]);
});

test('her weapons bar is 63 a mount: one gun at the bar takes about three turns', () => {
  assert.equal(FIGHT.PART_HP.weapons, 63);
  const st = fight({ stats: { guns: 1 } });
  const hit = { foe: [{ kind: 'broadside', target: 'weapons', dmg: [30, 30] }], captain: hold };
  let s = st, turns = 0;
  while (s.me.parts.weapons.hp > 0) { s = resolveShipTurn(s, orders([]), hit, LOW).state; turns++; }
  assert.equal(turns, 3);
});

test('resolveShipTurn does not change the state it was given', () => {
  const st = fight({ stats: { guns: 2, launcher: true }, opts: { torps: 1 } });
  const before = JSON.stringify(st);
  const o = orders(fire(2), { torp: { foe: 0, part: 'drive' } });
  const m = { foe: [HULL], captain: hold };
  const r = resolveShipTurn(st, o, m, HIGH);
  assert.equal(JSON.stringify(st), before);
  assert.notEqual(r.state, st);
  assert.equal(JSON.stringify(o), JSON.stringify(orders(fire(2), { torp: { foe: 0, part: 'drive' } })));
});

test('the constants are the ones the design names', () => {
  assert.deepEqual(plain(FIGHT), { GUN_DMG: [8, 14], FOE_DMG: [7, 18], HEAVY: 1.4, SKILL_DMG: 1, BAND_MULT: { knife: 1.1, close: 1, mid: 0.85, long: 0.8 }, HEAT_CAP: 4, HEAT_VENT: 2, OVER_MULT: 1.5, OVER_HEAT: 2, AIM_MULT: { knife: 1, close: 1, mid: 0.4, long: 0.25 }, PART_HP: { weapons: 63, drive: 34, lock: 7, launcher: 10 }, TORP_DMG: [12, 18], SALVO_DMG: [20, 30], PDC_HOLD: 0.4, SALVO: 2, SALVO_EVERY: 2, PDC_SALVO: 0.6, TURNS: 8, POOL: 0.45, BREAK: 0.3, HAND_HURT: 0.35, HEAVY_HIT: 0.2, LOST_CARGO: 0.3 });
});

test('the turret and heavy rounds outfits reach a side: the extra gun, the turret flag and the heavy multiplier', () => {
  // shipStats reads G, so its outfit loop is replayed on a plain copy of a hull.
  const stats = { ...Object.values(SHIPS)[0], dmgMult: 1, spoofer: false };
  const base = stats.guns;
  for (const id of ['pdc', 'heavy']) OUTFITS[id].mod(stats);
  const s = shipSide(stats, {});
  assert.deepEqual([s.pdc, s.guns, s.dmgMult], [true, base + 1, FIGHT.HEAVY]);
  assert.equal(s.dmgMult, 1.4);
});

test('a held turret costs a shot: two guns ordered with the turret held fire once', () => {
  const st = fight({ stats: { guns: 2, pdc: true } });
  const r = resolveShipTurn(st, orders(fire(2), { pdc: 'hold' }), quiet, LOW);
  assert.equal(r.events.filter(e => e.who === 'me').length, 1);
});

const kill = (side, ...parts) => parts.forEach(p => { side.parts[p].hp = 0; });
const hurt = (side, share) => { side.shields = 0; side.armor = Math.round(side.maxArmor * share); };  // share of armor; shields gone
const mv = (foe, captain = 'hold') => ({ foe: [{ kind: foe }], captain: { kind: captain } });

test('her move follows her rules: break below 30 percent or with no guns, while her drive is up, board at the knife, pin when you are faster, close to the knife firing at your hull, else a broadside at your guns and then your hull', () => {
  let st = fight({ stats: { accel: 2 } }, {}, M);
  assert.deepEqual(plain(foeMove(st, 0)), { kind: 'pin', target: 'drive', dmg: [6, 15] }, 'faster me: her 7 and 18 times 0.85');
  st = fight({}, {}, M);
  assert.deepEqual(plain(foeMove(st, 0)), { kind: 'close', target: 'hull', dmg: [6, 15] }, 'equal speed, above close: she closes, firing at your hull as she comes');
  st = fight({}, {}, CLOSE);
  assert.deepEqual(plain(foeMove(st, 0)), { kind: 'close', target: 'hull', dmg: [7, 18] }, 'from close range she closes on to the knife, to board');
  kill(st.foes[0], 'drive');
  assert.deepEqual(plain(foeMove(st, 0)), { kind: 'broadside', target: 'weapons', dmg: [7, 18] }, 'her drive gone, she stays and shoots at your guns');
  kill(st.me, 'weapons');
  assert.deepEqual(plain(foeMove(st, 0)), { kind: 'broadside', target: 'hull', dmg: [7, 18] }, 'your guns gone, she shoots at your hull');
  st = fight({}, { stats: { guns: 2, dmgMult: 1.5 } }, K);
  assert.deepEqual(plain(foeMove(st, 0)), { kind: 'board' }, 'at the knife she boards');
  hurt(st.foes[0], 0.2);
  assert.deepEqual(plain(foeMove(st, 0)), { kind: 'break' }, 'a hull under 30 percent beats a board');
  st = fight({}, { stats: { guns: 2, dmgMult: 1.5 } }, CLOSE); kill(st.foes[0], 'drive');
  assert.deepEqual(plain(foeMove(st, 0)).dmg, [21, 54], 'two mounts, 1.5, close');
  st.foes[0].parts.weapons.hp = 20;
  assert.deepEqual(plain(foeMove(st, 0)).dmg, [11, 27], 'one mount left');
});

test('a part at 0 changes her move: no lock, no board; no guns, she breaks off; no drive, no close; your drive out, no pin', () => {
  let st = fight({}, {}, K);
  kill(st.foes[0], 'lock');
  assert.equal(foeMove(st, 0).kind, 'broadside', 'no lock, no board: she fights where she is (R20)');
  st = fight({}, {}, M);
  kill(st.foes[0], 'lock');
  assert.equal(foeMove(st, 0).kind, 'close', 'and from further out she still comes in to close range');
  st = fight({}, {}, CLOSE);
  kill(st.foes[0], 'lock');
  assert.equal(foeMove(st, 0).kind, 'broadside', 'but no nearer');
  st = fight({}, {}, M);
  kill(st.foes[0], 'drive');
  assert.equal(foeMove(st, 0).kind, 'broadside', 'no drive, no close');
  st = fight({ stats: { accel: 2 } }, {}, M);
  kill(st.me, 'drive');
  assert.equal(foeMove(st, 0).kind, 'close', 'with your drive out she cannot pin it');
  kill(st.foes[0], 'weapons');
  assert.deepEqual(plain(foeMove(st, 0)), { kind: 'break' }, 'nothing left to fire, she breaks off');
});

test('a foe with no drive cannot break off: with her guns up she fires every turn, badly hurt or not', () => {
  let st = fight({}, {}, M);
  kill(st.foes[0], 'drive', 'lock'); hurt(st.foes[0], 0.1);
  for (let t = 0; t < 4; t++) {
    const m = foeMove(st, 0);
    assert.equal(m.kind, 'broadside', `turn ${t + 1}`);
    st = resolveShipTurn(st, orders([]), { foe: [m], captain: hold }, LOW).state;
    assert.equal(st.moves.foe[0].kind, 'broadside');
  }
  assert.ok(st.me.parts.weapons.hp < st.me.parts.weapons.max, 'her shots land');
  assert.equal(shipEnd(st), null, 'and the fight goes on');
});

test('a pack holds the range while any one of them still comes (R21)', () => {
  const st = fight({}, { stats: { accel: 2 } }, M);  // both of them faster than you
  st.foes.push(shipSide({ shields: 50, armor: 100, guns: 1, dmgMult: 1, accel: 2, turn: 1 }, {}));
  const r = resolveShipTurn(st, orders([]), { foe: [{ kind: 'break' }, { kind: 'close', target: 'hull', dmg: [8, 8] }], captain: hold }, LOW);
  assert.equal(r.state.band, CLOSE, 'one breaks off, the other closes: the band closes');
  const held = resolveShipTurn(st, orders([]), { foe: [{ kind: 'break' }, { kind: 'broadside', target: 'hull', dmg: [8, 8] }], captain: hold }, LOW);
  assert.equal(held.state.band, M, 'one breaks off, the other holds and fires: the band holds');
});

test('the captain moves by nerve: a bold one closes when ahead, a cautious one opens below 60 percent', () => {
  const at = (nerve, mine, hers) => {
    const st = fight();
    st.nerve = nerve;
    hurt(st.me, mine); hurt(st.foes[0], hers);
    st.me.maxShields = 0; st.foes[0].maxShields = 0;
    return captainMove(st).kind;
  };
  assert.equal(at(5, 1, 0.5), 'close');
  assert.equal(at(4, 0.5, 1), 'hold');
  assert.equal(at(1, 0.5, 1), 'open');
  assert.equal(at(2, 0.7, 1), 'hold');
  assert.equal(at(3, 0.3, 1), 'open');
  assert.equal(at(3, 0.9, 0.5), 'close', 'ahead by 40 points');
  assert.equal(at(3, 0.9, 0.7), 'hold', 'ahead by only 20');
});

test('the range moves one band when the moves agree, and the faster ship wins when they do not', () => {
  const band = (st, m) => resolveShipTurn(st, orders([]), m, LOW).state.band;
  assert.equal(band(fight({}, {}, M), mv('close', 'close')), CLOSE, 'both close');
  assert.equal(band(fight({}, {}, M), mv('hold', 'hold')), M);
  assert.equal(band(fight({}, {}, CLOSE), mv('break', 'open')), M, 'both open');
  assert.equal(band(fight({ stats: { accel: 2 } }, {}, CLOSE), mv('break', 'close')), K, 'I am faster: my close stands');
  assert.equal(band(fight({}, { stats: { accel: 2 } }, CLOSE), mv('break', 'close')), M, 'she is faster: her break stands');
  assert.equal(band(fight({}, {}, K), mv('close', 'close')), K, 'clamped at knife');
  assert.equal(band(fight({}, {}, L), mv('break', 'open')), RANGE_BANDS.length, 'past long is escaped');
});

test('a ship whose drive is out has no say on the range, and in a pack the fastest live drive speaks', () => {
  const band = (st, m) => resolveShipTurn(st, orders([]), m, LOW).state.band;
  let st = fight({ stats: { accel: 3 } }, {}, CLOSE);
  kill(st.me, 'drive');
  assert.equal(band(st, mv('break', 'close')), M, 'my vote is gone, hers stands');
  st = fight({}, {}, M);
  kill(st.foes[0], 'drive');
  assert.equal(band(st, mv('close', 'close')), CLOSE, 'her vote is gone, mine stands');
  st = fight({ stats: { accel: 2 } }, {}, CLOSE);
  st.foes.push(shipSide({ shields: 50, armor: 100, guns: 1, dmgMult: 1, accel: 3, turn: 1 }, {}));
  const m = { foe: [{ kind: 'break' }, { kind: 'hold' }], captain: { kind: 'close' } };
  assert.equal(band(st, m), CLOSE, 'the speed-3 foe holds and outspeeds me: no step');
  kill(st.foes[1], 'drive');
  assert.equal(band(st, m), K, 'with its drive out the slower foe speaks, and I outrun it');
});

test('each end is reached: crippled, broke, boarded, lost, escaped, away, and at eight turns broke or ran', () => {
  const turn = (st, m) => resolveShipTurn(st, orders([]), m, LOW).state;
  assert.equal(shipEnd(fight()), null);
  let st = fight(); kill(st.foes[0], 'weapons', 'drive');
  assert.equal(shipEnd(st), 'crippled');
  st = turn(fight({}, {}, CLOSE), mv('break'));
  assert.equal(shipEnd(st), 'broke');
  st = fight({}, {}, CLOSE); kill(st.foes[0], 'drive');
  assert.equal(shipEnd(turn(st, mv('break'))), null, 'a foe with its drive out cannot break away');
  assert.equal(shipEnd(turn(fight({}, {}, K), mv('board'))), 'boarded');
  st = fight({}, {}, K); kill(st.foes[0], 'lock');
  assert.equal(shipEnd(turn(st, mv('board'))), null, 'no lock, no boarding');
  assert.equal(shipEnd(turn(fight({}, {}, CLOSE), mv('board'))), null, 'not at knife');
  st = fight(); st.me.armor = 0;
  assert.equal(shipEnd(st), 'lost');
  assert.equal(shipEnd(turn(fight({ stats: { accel: 2 } }, {}, L), mv('hold', 'open'))), 'escaped');
  st = fight();
  for (let i = 0; i < FIGHT.TURNS; i++) {
    assert.equal(shipEnd(st), null, 'turn ' + i);
    st = turn(st, quiet);
  }
  assert.ok(['broke', 'ran'].includes(shipEnd(st)), 'eight quiet turns end in a broke or a ran, never a standoff');
  assert.equal(FIGHT.TURNS, 8);
  const brk = { foe: [{ kind: 'break' }], captain: { kind: 'hold' } };
  st = fight(); st.foes[0].parts.weapons.hp = 0; st.foes[0].shields = 50; st.foes[0].armor = 70; st.moves = brk;  // 120 of 150 is 0.8
  assert.equal(shipEnd(st), 'away', 'no guns, hull at 0.8, drive up, breaking: she got away with nothing for you');
  st.foes[0].shields = 5; st.foes[0].armor = 5;
  assert.equal(shipEnd(st), 'broke', 'under the break line she is a broke, not an away');
  const cap = (me, her) => {
    const c = fight(); c.turn = FIGHT.TURNS;
    c.me.shields = me * c.me.maxShields; c.me.armor = me * c.me.maxArmor;
    c.foes[0].shields = her * c.foes[0].maxShields; c.foes[0].armor = her * c.foes[0].maxArmor;
    return shipEnd(c);
  };
  assert.equal(cap(0.5, 0.7), 'ran', 'at turn 8 you at 0.5 and her at 0.7: the captain runs');
  assert.equal(cap(0.7, 0.5), 'broke', 'you at 0.7 and her at 0.5: she breaks');
});

test('a tie at the turn cap goes to her: she breaks off, and the captain does not run', () => {
  const st = fight(); st.turn = FIGHT.TURNS;
  st.me.shields = 20; st.me.armor = 32; st.foes[0].shields = 11; st.foes[0].armor = 23;  // 52 of 104 and 34 of 68 (the sides at FIGHT.POOL): both at 0.5
  assert.equal((st.me.shields + st.me.armor) / (st.me.maxShields + st.me.maxArmor), (st.foes[0].shields + st.foes[0].armor) / (st.foes[0].maxShields + st.foes[0].maxArmor));
  assert.equal(shipEnd(st), 'broke');
});

test('two ships breaking off: away only when every one left has lost her guns with her hull whole, else broke', () => {
  const two = () => shipFight({ me: shipSide({ shields: 90, armor: 140, guns: 2, dmgMult: 1, accel: 1, turn: 1 }, {}),
    foes: [0, 1].map(() => shipSide({ shields: 50, armor: 100, guns: 1, dmgMult: 1, accel: 1, turn: 1 }, {})), nerve: 0, band: CLOSE });
  const breaking = st => { st.moves = { foe: [{ kind: 'break' }, { kind: 'break' }], captain: hold }; return st; };
  let st = breaking(two()); kill(st.foes[0], 'weapons'); kill(st.foes[1], 'weapons');
  assert.equal(shipEnd(st), 'away', 'both with no guns and their hulls whole: they got away with nothing for you');
  st = breaking(two()); kill(st.foes[0], 'weapons'); hurt(st.foes[1], 0.2);
  assert.equal(shipEnd(st), 'broke', 'one with her guns up and badly hurt: a broke, though her sister got away whole');
  st = breaking(two()); kill(st.foes[0], 'weapons', 'drive'); kill(st.foes[1], 'weapons');
  st.moves.foe[0] = { kind: 'hold' };
  assert.equal(shipEnd(st), 'away', 'one out (no guns, no drive) and the other gone with her guns shot away and her hull whole: away');
});

test('her rule order: a corsair at the knife with her lock up arms and fires her salvos on their turns, and boards only when they are spent', () => {
  let st = fight({}, { stats: { launcher: true }, opts: { torps: 4 } }, K);
  const kinds = [];
  for (let i = 0; i < 5; i++) {
    const m = foeMove(st, 0);
    kinds.push(m.kind);
    if (m.kind === 'board') break;
    st = resolveShipTurn(st, orders([]), { foe: [m], captain: hold }, LOW).state;
    assert.equal(st.boarded, false, `turn ${i}: no boarding on an arm or a salvo turn`);
  }
  assert.deepEqual(kinds, ['arm', 'salvo', 'arm', 'salvo', 'board']);
});

test('your loss comes first: boarded while your armor is 0 is lost', () => {
  const st = fight({}, {}, K); st.me.armor = 0;
  assert.equal(shipEnd(resolveShipTurn(st, orders([]), mv('board'), LOW).state), 'lost');
});

test('a pin is a broadside at your drive', () => {
  const st = fight({ stats: { accel: 2 } }, {}, CLOSE);
  const r = resolveShipTurn(st, orders([]), { foe: [{ kind: 'pin', target: 'drive', dmg: [8, 8] }], captain: hold }, LOW);
  assert.deepEqual([r.state.me.parts.drive.hp, r.state.me.armor], [26, 63], 'the drive takes the 8; the armor (140 at FIGHT.POOL) is whole');
  assert.equal(r.state.moves.foe[0].kind, 'pin', 'the turn records the moves');
});

test('in a pack, one crippled foe does not end the fight; both do', () => {
  const st = fight();
  st.foes.push(shipSide({ shields: 50, armor: 100, guns: 1, dmgMult: 1, accel: 1, turn: 1 }, {}));
  kill(st.foes[0], 'weapons', 'drive');
  assert.equal(shipEnd(st), null);
  kill(st.foes[1], 'weapons', 'drive');
  assert.equal(shipEnd(st), 'crippled');
  const p = fight({}, {}, CLOSE);
  p.foes.push(shipSide({ shields: 50, armor: 100, guns: 1, dmgMult: 1, accel: 1, turn: 1 }, {}));
  kill(p.foes[0], 'weapons', 'drive');
  const one = resolveShipTurn(p, orders([]), { foe: [hold, { kind: 'break' }], captain: hold }, LOW).state;
  assert.equal(shipEnd(one), 'broke', 'the crippled foe is out; the other broke');
  const two = resolveShipTurn(p, orders([]), { foe: [hold, hold], captain: hold }, LOW).state;
  assert.equal(shipEnd(two), null);
});

test('a foe at armor 0 is out: the only foe so makes it crippled, even with its parts up', () => {
  const st = fight();
  st.foes[0].armor = 0;
  assert.equal(shipEnd(st), 'crippled');
});

test('the captain closes when ahead by exactly 30 points, despite float error', () => {
  const st = fight();
  st.nerve = 3;
  hurt(st.me, 0.7); hurt(st.foes[0], 0.4);
  st.me.maxShields = 0; st.foes[0].maxShields = 0;
  assert.equal(captainMove(st).kind, 'close');
});

// The deck fight. Repelling: theirs push lock, corridor, bridge on our deck; in an assault, mine push the same way on hers.
const deck = (o = {}) => deckFight({ boarders: 3, crew: 3, hand: 0, cover: [0, 0, 0], grade: 0, assault: false, side: false, ...o });
const heads = st => plain(st.sections.map(s => [s.mine, s.theirs]));
const seq = (...xs) => { let i = 0; return () => xs[Math.min(i++, xs.length - 1)]; };
const stay = { kind: 'hold', from: 0, to: 0, n: 0, feint: false };
const SHOOT = { kind: 'shoot' };

test('their move is shown, and at a veteran grade it may feint, at CUNNING * grade', () => {
  const st = deck({ boarders: 4, crew: 1 });
  assert.deepEqual(plain(boardMove(st, LOW)), { kind: 'push', from: 0, to: 1, n: 4, feint: false }, 'they outnumber the corridor');
  const hold1 = deck({ boarders: 1, crew: 6 });
  assert.equal(boardMove(hold1, LOW).kind, 'hold', 'two of ours stand in the lock with them: they hold');
  for (const grade of [1, 2]) {
    let n = 0, seed = 12345;
    const rand = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
    for (let i = 0; i < 2000; i++) if (boardMove({ ...st, grade }, rand).feint) n++;
    assert.ok(Math.abs(n / 2000 - CUNNING * grade) < 0.03, 'grade ' + grade + ': ' + n / 2000);
  }
  assert.equal(boardMove(st, () => 0).feint, false, 'no feint at grade 0, whatever the draw');
  const r = resolveDeckTurn({ ...st, grade: 1 }, { stand: 0, act: SHOOT, order: null }, { kind: 'push', from: 0, to: 1, n: 4, feint: true }, seq(0.999, 0, 0));
  assert.ok(!r.events.some(e => e.kind === 'move' && e.to === 1), 'a feinted push does not go where it was shown');
  const mid = deck({ boarders: 4, crew: 1, grade: 1 });
  mid.sections[0].theirs = 0; mid.sections[1].theirs = 4;
  const f = resolveDeckTurn(mid, { stand: 0, act: null, order: null }, { kind: 'push', from: 1, to: 2, n: 4, feint: true }, seq(0, 0, 0, 0));
  assert.deepEqual(plain(f.events[0]), { kind: 'move', from: 1, to: 0, n: 4 }, 'from the corridor the other way is back to the lock');
  const side = deck({ side: true, crew: 6 });
  side.sections[0].mine = 0; side.sections[1].mine = 6;
  assert.deepEqual(plain(boardMove(side, LOW)), { kind: 'round', from: 0, to: 3, n: 3, feint: false }, 'with a long ship and the corridor held, round by the cargo bay');
  side.sections[3].theirs = 2; side.sections[2].theirs = 2; side.sections[0].theirs = 1;
  assert.equal(boardMove(side, LOW).from, 2, 'the front is the furthest along, the bridge over the cargo bay');
  const asl = deck({ assault: true, boarders: 6, crew: 3 });
  assert.deepEqual(plain(boardMove(asl, LOW)), { kind: 'hold', from: 0, to: 0, n: 0, feint: false }, 'her crew hold');
  asl.sections[1].mine = 1; asl.sections[1].theirs = 0; asl.sections[2].theirs = 4; asl.sections[2].mine = 0;
  const m = boardMove(asl, LOW);
  assert.deepEqual([m.kind, m.from, m.to], ['push', 2, 1], 'where she outnumbers us she pushes back toward the lock');
});

test('the deck starts with the attackers in the lock and the defenders spread, the remainder on the bridge, which is never left empty (R29)', () => {
  assert.deepEqual(heads(deck({ boarders: 4, crew: 5 })), [[1, 4], [1, 0], [3, 0]], 'five over three: one each and two extra to the bridge');
  assert.deepEqual(heads(deck({ boarders: 7, crew: 3, assault: true })), [[3, 2], [0, 2], [0, 3]], 'in an assault mine are the attackers, and hers keep the bridge');
  for (const side of [false, true]) for (let n = 1; n <= 7; n++) {
    assert.ok(deck({ crew: n, side }).sections[2].mine > 0, `our bridge with ${n} crew${side ? ', a long ship' : ''}`);
    assert.ok(deck({ boarders: n, crew: 3, assault: true, side }).sections[2].theirs > 0, `her bridge with ${n} of hers${side ? ', a long ship' : ''}`);
  }
  const st = deck({ side: true, cover: [1, 2, 3] });
  assert.deepEqual(plain([st.sections.length, st.sections[3].cover, st.hand, st.began, st.turn, st.used, st.kind]), [4, 0, 2, 3, 0, {}, 'deck'], 'three crew over four sections are all on the bridge, and the hand starts with them (R34)');
  assert.deepEqual(plain(st.sections.map(s => s.cover)), [1, 2, 3, 0]);
  assert.deepEqual(plain(DECK), { SECTIONS: ['lock', 'corridor', 'bridge'], SIDEARM: [2, 3], CREW_HIT: [0, 2], BREAK: 0.3, SUIT: 0.3, CASUALTY: 0.3, TURNS: 8 });
  assert.equal(deck({ crew: 3 }).hand, 0, 'with one of ours in the lock the hand starts there');
  assert.deepEqual(plain(deck({ assault: true, hers: [1, 0, 1] }).sections.map(x => [x.cover, x.hers])), [[0, 1], [0, 0], [0, 1]], 'her cover is kept apart from ours');
  assert.deepEqual(plain(fightCover({ size: 12, kit: [], extra: [] })), [1, 1, 1], 'the cover input is the shape fightCover gives');
});

test('a section exchange takes a CREW_HIT roll a head from the other side, so losses grow with the opposing heads (R29)', () => {
  const trade = (mine, theirs, cover, rand) => {
    const st = deck({ boarders: 6, crew: 6 });
    st.sections = st.sections.map(() => ({ mine: 0, theirs: 0, cover: 0 })); st.sections[2].mine = 1;  // no one else trades, and the bridge is ours
    st.sections[1] = { mine, theirs, cover };
    return plain(resolveDeckTurn(st, { stand: 2, act: null, order: null }, stay, rand).state.sections[1]);
  };
  assert.deepEqual(trade(2, 2, 0, LOW), { mine: 2, theirs: 2, cover: 0 }, 'the low end of the range takes none');
  assert.deepEqual(trade(5, 1, 0, HIGH), { mine: 3, theirs: 0, cover: 0 }, 'one of theirs takes two of ours at the top of the roll');
  assert.deepEqual(trade(7, 3, 0, HIGH), { mine: 1, theirs: 0, cover: 0 }, 'three of theirs take six');
  assert.deepEqual(trade(2, 6, 0, HIGH), { mine: 0, theirs: 2, cover: 0 }, 'a loss is never more than the heads there');
  const lone = deck({ boarders: 3, crew: 3 });
  lone.sections[2].theirs = 0;
  assert.deepEqual(heads(resolveDeckTurn(lone, { stand: 0, act: null, order: null }, stay, HIGH).state)[2], [1, 0], 'where only one side stands nothing is traded');
});

test('each side\'s own cover cuts its loss, by a pip a pip, but never cuts a hit to nothing (R31, R33)', () => {
  const trade = (mine, theirs, cover, hers, assault = false, rand = HIGH) => {
    const st = deck({ boarders: 6, crew: 6, assault });
    st.sections = st.sections.map(() => ({ mine: 0, theirs: 0, cover: 0, hers: 0 })); st.sections[2] = assault ? { mine: 0, theirs: 1, cover: 0, hers: 0 } : { mine: 1, theirs: 0, cover: 0, hers: 0 };
    st.sections[1] = { mine, theirs, cover, hers }; st.hand = assault ? 0 : 2; if (assault) st.sections[0].mine = 1;
    return plain(resolveDeckTurn(st, { stand: st.hand, act: null, order: null }, stay, rand).state.sections[1]);
  };
  assert.deepEqual(trade(5, 1, 2, 0), { mine: 4, theirs: 0, cover: 2, hers: 0 }, 'two pips against one head\'s hit still leave it a hit');
  assert.deepEqual(trade(5, 2, 2, 0), { mine: 3, theirs: 0, cover: 2, hers: 0 }, 'four hits, two pips: two');
  assert.deepEqual(trade(5, 4, 2, 0, false, LOW), { mine: 5, theirs: 4, cover: 2, hers: 0 }, 'no hit rolled, nothing lost');
  assert.deepEqual(trade(2, 5, 0, 1, true), { mine: 0, theirs: 2, cover: 0, hers: 1 }, 'in an assault her pip cuts her loss to three, and ours, with none, lose both');
  assert.deepEqual(trade(4, 2, 2, 0, true), { mine: 2, theirs: 0, cover: 2, hers: 0 }, 'our pips cut only our loss: four hits less two');
});

test('in an assault a cover that works is ours: it cuts our loss and not hers (R31)', () => {
  const play = odds => {
    const st = deck({ assault: true, boarders: 6, crew: 6 });
    st.sections = st.sections.map(() => ({ mine: 0, theirs: 0, cover: 0, hers: 0 })); st.sections[2].theirs = 1;
    st.sections[0] = { mine: 5, theirs: 2, cover: 0, hers: 0 }; st.hand = 0;
    return plain(resolveDeckTurn(st, { stand: 0, act: { kind: 'cover', odds }, order: null }, stay, HIGH).state.sections[0]);
  };
  assert.deepEqual(play(0), { mine: 0, theirs: 0, cover: 0, hers: 0 }, 'a cover that misses: her two take four of ours, and the press the last');
  assert.deepEqual(play(1), { mine: 3, theirs: 0, cover: 2, hers: 0 }, 'one that works cuts her four hits to two, and our hits on her are not cut at all');
});

test('a steady act with nobody of theirs where the hand stands is not rolled, and says so; a cover still is (R34)', () => {
  const st = deck({ boarders: 3, crew: 3 });
  st.sections[0].theirs = 0; st.sections[1].theirs = 3;
  const r = resolveDeckTurn(st, { stand: 0, act: { kind: 'steady', odds: 0 }, order: { kind: 'steady', odds: 0 } }, stay, HIGH);
  assert.deepEqual(plain(r.events.filter(e => e.kind === 'steady')), [{ kind: 'steady', nobody: true }, { kind: 'steady', nobody: true }]);
  assert.equal(r.state.sections[0].mine, 1, 'a check that would have missed is not made, so nobody presses on us');
  const c = resolveDeckTurn(st, { stand: 0, act: { kind: 'cover', odds: 1 }, order: null }, stay, LOW);
  assert.deepEqual([c.state.sections[0].cover, c.events.find(e => e.kind === 'cover').worked], [2, true], 'the cover is made where nobody is');
});

test('a deck fight ends at the turn cap: matched stacks that cannot move withdraw, a repel won and an assault lost (R32)', () => {
  const run = st => { let end = null; for (let t = 0; t < 20 && !end; t++) { st = resolveDeckTurn(st, { stand: st.hand, act: null, order: null }, boardMove(st, LOW), LOW).state; end = deckEnd(st); } return [end, st.turn]; };
  const rep = deck({ boarders: 5, crew: 5 });
  rep.sections = [{ mine: 0, theirs: 0, cover: 1, hers: 0 }, { mine: 0, theirs: 2, cover: 2, hers: 0 }, { mine: 3, theirs: 0, cover: 1, hers: 0 }]; rep.hand = 2;
  assert.deepEqual(run(rep), ['won', DECK.TURNS], 'two of theirs in our corridor and three of ours on the bridge: they go back to their ship');
  const asl = deck({ assault: true, boarders: 5, crew: 5 });
  asl.sections = [{ mine: 0, theirs: 0, cover: 0, hers: 1 }, { mine: 3, theirs: 0, cover: 0, hers: 0 }, { mine: 0, theirs: 3, cover: 0, hers: 1 }]; asl.hand = 1;
  assert.deepEqual(run(asl), ['taken', DECK.TURNS], 'three of ours in her corridor and three of hers on her bridge: ours fall back');
  assert.equal(deckEnd({ ...deck(), turn: DECK.TURNS - 1 }), null, 'not before the cap');
});

test('a stack does not leave a section while the other side stands in it: their push, her push back and our advance (R29)', () => {
  const st = deck({ boarders: 4, crew: 3 });  // one of ours in each section
  assert.equal(boardMove(st, LOW).kind, 'hold', 'one of ours in the lock holds four of them there');
  st.sections[0].mine = 0;
  assert.deepEqual(plain(boardMove(st, LOW)), { kind: 'push', from: 0, to: 1, n: 4, feint: false }, 'with the lock theirs alone they push on');
  const asl = deck({ assault: true, boarders: 3, crew: 5 });
  const r = resolveDeckTurn(asl, { stand: 0, act: null, order: null }, stay, LOW);
  assert.ok(!r.events.some(e => e.kind === 'move' && e.who === 'mine'), 'ours stay in her lock while one of hers is there');
  asl.sections[0].theirs = 0;
  assert.ok(resolveDeckTurn(asl, { stand: 0, act: null, order: null }, stay, LOW).events.some(e => e.kind === 'move' && e.who === 'mine'), 'and push on once it is clear');
  const back = deck({ assault: true, boarders: 3, crew: 3 });
  back.sections = [{ mine: 1, theirs: 0, cover: 0 }, { mine: 1, theirs: 4, cover: 0 }, { mine: 0, theirs: 1, cover: 0 }];
  assert.equal(boardMove(back, LOW).kind, 'hold', 'her four do not leave the corridor while one of ours is in it');
  back.sections[1].mine = 0;
  assert.deepEqual([boardMove(back, LOW).kind, boardMove(back, LOW).from], ['push', 1], 'with it hers alone she pushes back to the lock');
});

test('the hand shoots, steadies or covers in the section they stand in', () => {
  const base = () => { const st = deck({ boarders: 8, crew: 6 }); st.sections[0] = { mine: 2, theirs: 8, cover: 0 }; return st; };
  const turn = (act, order, rand) => resolveDeckTurn(base(), { stand: 0, act, order }, stay, rand);
  let r = turn(SHOOT, null, seq(0, 0, 0, 0, 0, 0, 0));
  assert.equal(r.state.sections[0].theirs, 6, 'a shot adds the sidearm roll: two at least');
  r = turn(SHOOT, null, seq(0.999, 0.999, 0.999, 0.999));
  assert.equal(r.state.sections[0].theirs, 1, 'the exchange takes two for each of our two, and the sidearm three');
  r = turn({ kind: 'steady', odds: 0.5 }, null, seq(0.1, 0, 0, 0, 0));
  assert.equal(r.state.sections[0].theirs, 7, 'a steady hand that works thins them by one');
  r = turn({ kind: 'steady', odds: 0.5 }, null, seq(0.9, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.5));  // the check, eight rolls against us and two against them, then the press
  assert.equal(r.state.sections[0].theirs, 8, 'one that misses thins no one');
  assert.equal(r.state.sections[0].mine, 1, 'and they press: a roll against us, here a middling one');
  r = turn({ kind: 'cover', odds: 0.5 }, null, seq(0.1, 0, 0, 0, 0));
  assert.deepEqual([r.state.sections[0].cover, r.state.used.cover], [2, true], 'cover made is two points, once a fight');
  r = resolveDeckTurn(r.state, { stand: 0, act: { kind: 'cover', odds: 1 }, order: null }, stay, seq(0, 0, 0, 0));
  assert.equal(r.state.sections[0].cover, 2, 'the second cover does nothing');
  r = turn(null, { kind: 'steady', odds: 0.9 }, seq(0.1, 0, 0, 0, 0));
  assert.equal(r.state.sections[0].theirs, 7, 'a crew order works as the hand does');
  const before = JSON.stringify(base());
  const st = base();
  resolveDeckTurn(st, { stand: 1, act: SHOOT, order: null }, stay, HIGH);
  assert.equal(JSON.stringify(st), before, 'the state given is not changed');
});

test('a hand standing in a taken section is pushed back one with a hurt roll, never left alone with them', () => {
  const st = deck({ boarders: 4, crew: 3 });
  st.sections[1] = { mine: 1, theirs: 0, cover: 0 };
  st.sections[0].theirs = 1; st.sections[1].theirs = 3;
  st.hand = 1;
  const push = { kind: 'hold', from: 1, to: 1, n: 0, feint: false };
  const r = resolveDeckTurn(st, { stand: 1, act: null, order: null }, push, seq(0.999, 0.999, 0.999, 0.999, 0.999, 0.999));
  assert.deepEqual(heads(r.state)[1], [0, 1], 'the last of ours there is down, and two of theirs with it');
  assert.equal(r.state.hand, 2, 'the hand falls back one, toward our side');
  assert.ok(r.events.some(e => e.kind === 'hand' && e.back), 'the retreat is an event');
  assert.equal(r.events.filter(e => e.kind === 'hurt').length, 1, 'with one hurt roll');
  assert.equal(r.events.find(e => e.kind === 'hurt').hurt, false, '0.999 is over 0.135');
  const lucky = resolveDeckTurn(st, { stand: 1, act: null, order: null }, push, seq(0.999, 0.999, 0.999, 0.999, 0, 0, 0, 0));
  assert.ok(lucky.events.some(e => e.kind === 'hurt' && e.hurt), 'a low roll is hurt: 0.45 * 0.3');
  const sheer = resolveDeckTurn(st, { stand: 1, act: null, order: null }, push, seq(0.999, 0.999, 0.999, 0.999, 0.4));
  assert.ok(sheer.events.some(e => e.kind === 'hurt' && !e.hurt), '0.4 is over 0.135: not hurt');
  const asl = deck({ assault: true, boarders: 3, crew: 3 });
  asl.sections[0] = { mine: 1, theirs: 0, cover: 0 }; asl.sections[1] = { mine: 0, theirs: 2, cover: 0 }; asl.hand = 1;
  assert.equal(resolveDeckTurn(asl, { stand: 1, act: null, order: null }, push, HIGH).state.hand, 0, 'in an assault the way back is toward the lock');
});

test('the ends: broken at three in ten, all down, pushed out of the lock, or the bridge taken; mirrored for an assault', () => {
  const st = deck({ boarders: 6, crew: 3 });
  assert.equal(deckEnd(st), null);
  st.sections[0].theirs = 1;
  assert.equal(deckEnd(st), 'won', 'one of six is under three in ten: broken');
  st.sections[0].theirs = 2;
  assert.equal(deckEnd(st), null, 'two is over');
  st.sections[0].theirs = 0;
  assert.equal(deckEnd(st), 'won', 'none aboard');
  const lost = deck({ boarders: 3, crew: 3 });
  lost.sections[2] = { mine: 0, theirs: 2, cover: 0 };
  assert.equal(deckEnd(lost), 'taken', 'they hold the bridge');
  lost.sections[2].mine = 1;
  assert.equal(deckEnd(lost), null, 'while one of ours stands there it is not held');
  const asl = deck({ assault: true, boarders: 6, crew: 3 });
  assert.equal(deckEnd(asl), null);
  asl.sections[2] = { mine: 1, theirs: 0, cover: 0 };
  assert.equal(deckEnd(asl), 'won', 'mine hold her bridge');
  const gone = deck({ assault: true, boarders: 6, crew: 3 });
  gone.sections.forEach(s => { s.mine = 0; });
  assert.equal(deckEnd(gone), 'taken', 'mine all down');
  const broke = deck({ assault: true, boarders: 6, crew: 3 });
  broke.sections.forEach(s => { s.theirs = 0; }); broke.sections[0].theirs = 1;
  assert.equal(deckEnd(broke), 'won', 'hers broken at three in ten');
});

test('cargo is next to the lock and the bridge both ways: the hand steps in and out, and a feint from the corridor never lands there', () => {
  const at = (from, stand) => resolveDeckTurn({ ...deck({ side: true, crew: 8 }), hand: from }, { stand, act: null, order: null }, stay, LOW).state.hand;
  assert.deepEqual([at(0, 3), at(3, 0), at(2, 3), at(3, 2), at(1, 3), at(0, 2)], [3, 0, 3, 2, 1, 0], 'lock and bridge reach cargo and back; the corridor does not, nor does the lock reach the bridge');
  const st = deck({ side: true, boarders: 4, grade: 1 });
  st.sections[0].theirs = 0; st.sections[1].theirs = 4;
  for (let k = 0; k < 40; k++) {
    let seed = k + 1;
    const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const r = resolveDeckTurn(st, { stand: 0, act: null, order: null }, { kind: 'push', from: 1, to: 2, n: 4, feint: true }, rand);
    assert.ok(!r.events.some(e => e.kind === 'move' && (e.to === 3 || e.to === 2)), 'seed ' + k);
  }
});

test('steady and cover must carry odds, and shoot may be bare', () => {
  const st = deck();
  assert.throws(() => resolveDeckTurn(st, { stand: 0, act: 'steady', order: null }, stay, LOW), /odds/);
  assert.throws(() => resolveDeckTurn(st, { stand: 0, act: null, order: { kind: 'cover' } }, stay, LOW), /odds/);
  assert.throws(() => resolveDeckTurn(st, { stand: 0, act: null, order: 'steady' }, stay, LOW), /odds/);
  assert.doesNotThrow(() => resolveDeckTurn(st, { stand: 0, act: 'shoot', order: null }, stay, LOW));
});

test('a press is a roll, and no loss is more than the heads there; the events say what was taken', () => {
  const st = deck({ boarders: 1, crew: 1 });
  st.sections = st.sections.map(() => ({ mine: 0, theirs: 0, cover: 0 }));
  st.sections[0] = { mine: 1, theirs: 1, cover: 0 };
  const r = resolveDeckTurn(st, { stand: 0, act: { kind: 'steady', odds: 0 }, order: { kind: 'steady', odds: 0 } }, stay, () => 0.99);
  const ex = r.events.filter(e => e.kind === 'exchange');
  assert.deepEqual(plain(ex), [{ kind: 'exchange', section: 0, mine: 1, theirs: 1 }], 'one head each, however many rolls');
  assert.deepEqual(heads(r.state)[0], [0, 0]);
  const low = resolveDeckTurn(st, { stand: 0, act: { kind: 'steady', odds: 0 }, order: null }, stay, () => 0);
  assert.deepEqual(heads(low.state)[0], [1, 1], 'a press that rolls low takes no one');
});

test('the hand falls back until it stands where they do not hold alone; with nowhere, it goes to our nearest heads', () => {
  const st = deck({ boarders: 6, crew: 3 });
  st.sections[0] = { mine: 0, theirs: 3, cover: 0 }; st.sections[1] = { mine: 0, theirs: 3, cover: 0 }; st.sections[2] = { mine: 1, theirs: 0, cover: 0 };
  st.hand = 0;
  assert.equal(resolveDeckTurn(st, { stand: 0, act: null, order: null }, stay, LOW).state.hand, 2, 'two sections back at once');
  const lost = deck({ boarders: 9, crew: 3 });
  lost.sections.forEach(x => { x.mine = 0; x.theirs = 3; });
  assert.equal(resolveDeckTurn(lost, { stand: 0, act: null, order: null }, stay, LOW).state.hand, 0, 'with no one of ours anywhere it stays');
});

test('an assault played turn by turn reaches the end: our party advances section by section as each is cleared', () => {
  let st = deck({ assault: true, boarders: 3, crew: 9 });
  let end = null;
  for (let t = 0; t < 12 && !end; t++) {
    st = resolveDeckTurn(st, { stand: 0, act: null, order: null }, boardMove(st, HIGH), HIGH).state;
    end = deckEnd(st);
  }
  assert.equal(end, 'won');
  assert.ok(st.sections[0].theirs === 0 && st.sections[1].theirs === 0 && st.sections[2].mine > 0, 'her lock and corridor cleared, and ours on her bridge');
});

test('a gun that is not ready has no say: a hidden gun\'s order does not fire in place of a shown gun set to hold', () => {
  const st = fight({ stats: { guns: 2 } });
  st.me.parts.weapons.hp = 20;  // one mount left
  const r = resolveShipTurn(st, orders([null, { foe: 0, part: 'hull' }]), quiet, LOW);
  assert.deepEqual(plain(r.events), [], 'the ready gun holds, and the gone one cannot fire');
});

test('a hit on a part already at 0 takes nothing, and the event says so', () => {
  const st = fight({ stats: { guns: 1 } });
  kill(st.foes[0], 'lock');
  assert.equal(resolveShipTurn(st, orders(fire(1, 'lock')), quiet, LOW).events[0].dmg, 0);
});

// Every end, from the ships' own stats (js/data.js) and the moves by her rules and the captain's, not from states set by hand. The dice are a constant.
const sideOf = (id, grade = 0) => shipSide({ dmgMult: 1, ...SHIPS[id] }, { grade });
function playOut({ me, foes, aim, nerve = 1, roll = 0.5, grade = 0, armor }) {
  const mine = sideOf(me); if (armor !== undefined) mine.armor = armor;
  let st = shipFight({ me: mine, foes: foes.map(id => sideOf(id, grade)), nerve, band: L }), end = null;
  while (!end) {
    const moves = { foe: st.foes.map((_, i) => foeMove(st, i)), captain: captainMove(st) };
    st = resolveShipTurn(st, orders(Array.from({ length: st.me.guns }, () => ({ foe: 0, part: aim(st) }))), moves, () => roll).state;
    end = shipEnd(st);
  }
  return end;
}
test('every end is reached by a hauler (or her sisters) against a raider or a corsair, by where the guns aim', () => {
  const at = part => () => part, drive = st => (st.foes[0].parts.drive.hp > 0 ? 'drive' : 'weapons');
  assert.equal(playOut({ me: 'gunship', foes: ['raider'], aim: at('weapons') }), 'away', 'her guns shot away, her hull whole: she gets away with nothing for you (a hauler\'s two guns are too slow at it now: she is alongside first)');
  assert.equal(playOut({ me: 'gunship', foes: ['raider'], aim: drive, roll: 0.99 }), 'crippled', 'her drive and then her guns: dead in space');
  assert.equal(playOut({ me: 'freighter', foes: ['corsair'], aim: at('hull'), roll: 0.1 }), 'boarded', 'shooting her hull does not stop her coming alongside');
  assert.equal(playOut({ me: 'gunship', foes: ['corsair'], aim: drive }), 'ran', 'her drive gone, her guns left: eight turns of it and the corvette is the worse hurt, so the captain runs');
  assert.equal(playOut({ me: 'courier', foes: ['raider'], aim: at('hull'), armor: 1, roll: 0 }), 'escaped', 'a worn courier, a cautious captain and the faster ship: she is lost astern before her pin takes the drive');
  assert.equal(playOut({ me: 'shuttle', foes: ['corsair', 'corsair'], aim: at('hull'), roll: 0.99, grade: 2 }), 'lost', 'a skiff against a veteran pair: the hull goes before they are alongside');
});

const corsair = (torps = 3) => fight({}, { stats: { launcher: true }, opts: { torps } });
const armTurn = st => resolveShipTurn(st, orders([]), { foe: [foeMove(st, 0)], captain: hold }, LOW).state;

test('a corsair with a launcher and torpedoes arms on turn 0 and fires the salvo the turn after', () => {
  let st = corsair();
  assert.deepEqual(plain(foeMove(st, 0)), { kind: 'arm', n: 2 });
  st = armTurn(st);
  assert.equal(st.armed[0], true);
  const m = plain(foeMove(st, 0));
  assert.deepEqual([m.kind, m.target, m.n, m.dmg], ['salvo', 'hull', 2, [40, 60]]);
  const r = resolveShipTurn(st, orders([]), { foe: [m], captain: hold }, LOW);
  assert.equal(r.state.foes[0].torps, 1);
  assert.equal(r.state.armed[0], false);
  assert.equal(r.events.filter(e => e.who === 'foe')[0].dmg, 40);
});

test('a turret held back cuts a salvo by PDC_SALVO; a gun-fired turret does not', () => {
  const st = armTurn(fight({ stats: { pdc: true } }, { stats: { launcher: true }, opts: { torps: 3 } }));
  const m = foeMove(st, 0);
  for (const [rand, raw] of [[LOW, 40], [HIGH, 60]]) {
    const dmgOf = pdc => resolveShipTurn(st, orders([], { pdc }), { foe: [m], captain: hold }, rand).events.find(e => e.who === 'foe').dmg;
    assert.equal(dmgOf('fire'), raw);
    assert.ok(Math.abs(dmgOf('hold') - Math.round(raw * 0.4)) <= 1);
  }
});

test('her launcher at 0 takes the salvo away, armed or not', () => {
  let st = armTurn(corsair());
  kill(st.foes[0], 'launcher');
  assert.notEqual(foeMove(st, 0).kind, 'salvo');
  const r = resolveShipTurn(st, orders([]), { foe: [{ kind: 'salvo', target: 'hull', n: 2, dmg: [40, 60] }], captain: hold }, LOW);
  assert.equal(r.state.foes[0].torps, 3);
  assert.equal(r.events.filter(e => e.who === 'foe').length, 0);
  st = corsair(); kill(st.foes[0], 'launcher');
  assert.notEqual(foeMove(st, 0).kind, 'arm');
});

test('with no torpedoes left she does not arm, and with one she arms for one', () => {
  assert.notEqual(foeMove(corsair(0), 0).kind, 'arm');
  assert.deepEqual(plain(foeMove(corsair(1), 0)), { kind: 'arm', n: 1 });
});

test('vent clears the heat and unlocks the guns, once a fight', () => {
  assert.deepEqual(Object.keys(FIGHT_MOVES), ['vent', 'lead', 'split']);
  const hot = { ...fight({ stats: { guns: 3 } }), heat: 5, locked: [0] };
  assert.equal(gunsReady(hot), 2);
  const r = resolveShipTurn(hot, orders(fire(3), { move: 'vent' }), quiet, LOW, ['vent']);
  assert.equal(r.events.filter(e => e.who === 'me' && e.foe === 0).length, 3, 'every gun fires');
  assert.deepEqual(plain([r.state.heat, r.state.locked, r.state.spent]), [3 - FIGHT.HEAT_VENT, [], ['vent']], '0 plus 3 shots, less the vent');
  assert.ok(r.events.some(e => e.who === 'me' && e.move === 'vent'));
  const again = resolveShipTurn({ ...r.state, heat: 5, locked: [0] }, orders(fire(3), { move: 'vent' }), quiet, LOW, ['vent']);
  assert.equal(again.events.filter(e => e.who === 'me' && e.foe === 0).length, 2, 'spent: the lock stands');
  assert.deepEqual(plain(again.state.spent), ['vent']);
});

const sh = r => r.events.filter(e => e.who === 'me' && e.dmg !== undefined);  // the turn's shots, without the move's own event

test('lead takes no range penalty on one aimed shot', () => {
  const st = fight({ stats: { guns: 2 } }, {}, L);
  const two = orders([{ foe: 0, part: 'drive' }, { foe: 0, part: 'drive' }], { move: 'lead', gun: 0 });
  const r = resolveShipTurn(st, two, quiet, HIGH, ['lead']);
  const plainShot = sh(resolveShipTurn(st, orders(two.guns), quiet, HIGH));
  assert.equal(sh(r)[0].dmg, Math.round(14 * st.me.dmgMult * FIGHT.BAND_MULT.long), 'aim factor 1');
  assert.equal(sh(r)[1].dmg, plainShot[1].dmg, 'the other gun keeps AIM_MULT.long');
  assert.ok(sh(r)[0].dmg > plainShot[0].dmg);
  assert.deepEqual(plain(r.state.spent), ['lead']);
});

test('split holds the turret back and still fires it', () => {
  const st = fight({ stats: { guns: 2, pdc: true } });
  const held = resolveShipTurn(st, orders(fire(2), { pdc: 'hold' }), quiet, LOW);
  assert.equal(held.events.filter(e => e.who === 'me').length, 1, 'a held turret costs a shot');
  const r = resolveShipTurn(st, orders(fire(2), { pdc: 'hold', move: 'split' }), quiet, LOW, ['split']);
  assert.equal(r.events.filter(e => e.who === 'me' && e.foe === 0).length, gunsReady(st), 'no shot lost');
  const v = (o, k) => resolveShipTurn(st, orders(fire(1), o), { foe: [HULL], captain: hold }, HIGH, k).events.find(e => e.who === 'foe').dmg;
  assert.equal(v({ pdc: 'hold', move: 'split' }, ['split']), v({ pdc: 'hold' }, []), 'her volley is cut by PDC_HOLD as before');
  assert.ok(v({ pdc: 'hold' }, []) < v({}, []));
});

test('a move not known, already spent, or with nothing to act on is ignored and not spent', () => {
  const cool = fight({ stats: { guns: 2, pdc: true } });
  const hot = { ...cool, heat: 3 };
  const run = (st, o, known) => resolveShipTurn(st, o, quiet, LOW, known);
  const same = (st, o, known) => { const r = run(st, o, known), b = run(st, { ...o, move: undefined }, known); assert.deepEqual(plain(r), plain(b)); return r; };
  assert.deepEqual(plain(same(hot, orders(fire(2), { move: 'vent' }), []).state.spent), [], 'not known');
  assert.deepEqual(plain(same({ ...hot, spent: ['vent'] }, orders(fire(2), { move: 'vent' }), ['vent']).state.spent), ['vent'], 'spent');
  assert.deepEqual(plain(same(cool, orders(fire(2), { move: 'vent' }), ['vent']).state.spent), [], 'no heat, no lock');
  assert.deepEqual(plain(same(fight({ stats: { guns: 2 } }, {}, L), orders(fire(2), { move: 'lead', gun: 0 }), ['lead']).state.spent), [], 'a hull shot is not aimed');
  assert.deepEqual(plain(same(cool, orders(fire(2), { move: 'split' }), ['split']).state.spent), [], 'turret not held');
  assert.equal(canUse(hot, orders(fire(2)), 'vent', ['vent']), true);
  assert.equal(canUse(hot, orders(fire(2)), 'vent', []), false);
  assert.equal(canUse(cool, orders(fire(2)), 'vent', ['vent']), false);
  assert.equal(canUse(cool, orders(fire(2), { pdc: 'hold' }), 'split', ['split']), true);
});

test('lead on a pair applies to the named gun only', () => {
  const st = shipFight({
    me: shipSide({ shields: 90, armor: 140, guns: 2, dmgMult: 1, accel: 1, turn: 1 }, {}),
    foes: [0, 1].map(() => shipSide({ shields: 50, armor: 100, guns: 1, dmgMult: 1, accel: 1, turn: 1 }, {})), nerve: 0, band: L
  });
  const o = orders([{ foe: 0, part: 'drive' }, { foe: 1, part: 'drive' }], { move: 'lead', gun: 1 });
  const r = resolveShipTurn(st, o, { foe: [hold, hold], captain: hold }, HIGH, ['lead']);
  const base = sh(resolveShipTurn(st, orders(o.guns), { foe: [hold, hold], captain: hold }, HIGH));
  assert.equal(sh(r)[0].dmg, base[0].dmg, 'gun 0 unchanged');
  assert.ok(sh(r)[1].dmg > base[1].dmg && sh(r)[1].foe === 1, 'gun 1 leads at its own foe');
});
