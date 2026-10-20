'use strict';

// The turn-based fight engine (js/fight.js): sides, damage in ranges, heat and parts, in plain Node.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./nodecontext');

const api = load(['js/data.js', 'js/range.js', 'js/sheet.js', 'js/handtohand.js', 'js/shipcombat.js', 'js/fight.js'], {}, ['SHIPS', 'OUTFITS', 'FIGHT', 'RANGE_BANDS', 'shipSide', 'shipFight', 'gunsReady', 'resolveShipTurn', 'foeMove', 'captainMove', 'shipEnd']);
const { SHIPS, OUTFITS, FIGHT, RANGE_BANDS, shipSide, shipFight, gunsReady, resolveShipTurn, foeMove, captainMove, shipEnd } = api;
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
  assert.deepEqual([s.shields, s.armor, s.parts.weapons.max, s.parts.drive.max, s.parts.lock.max], [90, 140, 20, 30, 20]);
  assert.equal(shipSide({ shields: 0, armor: 100, guns: 3, dmgMult: 1 }, {}).parts.weapons.max, 60, 'weapons are sized per gun mount');
});

test('a veteran grade lengthens the hull and raises the punch, and the state starts at turn 0', () => {
  const s = shipSide({ shields: 50, armor: 100, guns: 1, dmgMult: 1 }, { grade: 2, skill: 1, torps: 3 });
  assert.deepEqual([s.armor, s.maxArmor, s.dmgMult, s.skill, s.torps], [160, 160, 1.3, 1, 3]);
  const st = fight();
  assert.deepEqual(plain([st.kind, st.band, st.heat, st.locked, st.turn, st.log]), ['ship', CLOSE, 0, [], 0, []]);
});

test('a shot does damage within its range, times heavy rounds and the band', () => {
  const st = fight({ stats: { guns: 1, dmgMult: 1.4 } });
  const lo = resolveShipTurn(st, orders(fire(1)), quiet, LOW).events[0];
  const hi = resolveShipTurn(st, orders(fire(1)), quiet, HIGH).events[0];
  assert.deepEqual([lo.dmg, hi.dmg], [11, 20], '8 * 1.4 and 14 * 1.4, rounded');
  const long = fight({ stats: { guns: 1 } }, {}, RANGE_BANDS.indexOf('long'));
  assert.equal(resolveShipTurn(long, orders(fire(1)), quiet, HIGH).events[0].dmg, 8, '14 * 0.6, rounded');
  const skilled = fight({ stats: { guns: 1 }, opts: { skill: 2 } });
  assert.equal(resolveShipTurn(skilled, orders(fire(1)), quiet, LOW).events[0].dmg, 10, 'a gunner adds a point a level to the low end');
});

test('damage takes shields before armor, and a part at 0 is out', () => {
  const st = fight({ stats: { guns: 1 } }, { stats: { shields: 5 } });
  const foe = resolveShipTurn(st, orders(fire(1)), quiet, LOW).state.foes[0];
  assert.deepEqual([foe.armor, foe.shields], [97, 1], 'the 8 points took the 5 shields, then 3 of armor; a tenth of 5 shields came back');
  const part = fight({ stats: { guns: 1, dmgMult: 100 } });
  const r = resolveShipTurn(part, orders(fire(1, 'drive')), quiet, LOW);
  assert.equal(r.state.foes[0].parts.drive.hp, 0, 'hp does not go below 0');
  assert.deepEqual([r.state.foes[0].armor, r.state.foes[0].shields], [100, 50], 'a part hit leaves the hull alone');
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
  assert.equal(bare.events[0].dmg, 45);
  assert.equal(bare.state.me.torps, 0);
  assert.equal(resolveShipTurn(mk({ stats: { pdc: true } }), o, quiet, HIGH).events[0].dmg, 27, '45 less 40 percent');
});

test('a turret held back cuts the next volley by 40 percent', () => {
  const st = fight({ stats: { guns: 2, pdc: true } });
  const volley = { foe: [{ kind: 'broadside', target: 'hull', dmg: [20, 20] }], captain: hold };
  const open = resolveShipTurn(st, orders([]), volley, LOW).events[0].dmg;
  const held = resolveShipTurn(st, orders([], { pdc: 'hold' }), volley, LOW).events[0].dmg;
  assert.deepEqual([open, held], [20, 12]);
});

test('shields regenerate a tenth of the maximum at the end of the turn, and the band does not move', () => {
  const st = fight();
  st.me.shields = 10;
  const r = resolveShipTurn(st, orders([]), quiet, LOW).state;
  assert.deepEqual([r.me.shields, r.band], [19, CLOSE]);
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
  assert.deepEqual(plain(FIGHT), { GUN_DMG: [8, 14], HEAVY: 1.4, SKILL_DMG: 1, BAND_MULT: { knife: 1.1, close: 1, mid: 0.85, long: 0.6 }, HEAT_CAP: 4, HEAT_VENT: 2, SHIELD_REGEN: 0.1, PART_HP: { weapons: 20, drive: 30, lock: 20 }, TORP_DMG: [30, 45], PDC_HOLD: 0.4, TURNS: 6 });
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

test('her move follows her rules: break below 30 percent, board at knife with a lock, pin when you are faster, close from range, else a broadside', () => {
  let st = fight({ stats: { accel: 2 } }, {}, M);
  assert.deepEqual(plain(foeMove(st, 0)), { kind: 'pin', target: 'drive', dmg: [7, 12] }, 'faster me: 8 and 14 times 0.85');
  st = fight({}, {}, M);
  assert.deepEqual(plain(foeMove(st, 0)), { kind: 'close' }, 'equal speed, above close');
  st = fight({}, {}, CLOSE);
  assert.deepEqual(plain(foeMove(st, 0)), { kind: 'broadside', target: 'weapons', dmg: [8, 14] });
  st = fight({}, { stats: { guns: 2, dmgMult: 1.5 } }, K);
  assert.deepEqual(plain(foeMove(st, 0)), { kind: 'board' }, 'knife and a lock beats a broadside');
  hurt(st.foes[0], 0.2);
  assert.deepEqual(plain(foeMove(st, 0)), { kind: 'break' }, 'a hull under 30 percent beats a board');
  st = fight({}, { stats: { guns: 2, dmgMult: 1.5 } }, CLOSE);
  assert.deepEqual(plain(foeMove(st, 0)).dmg, [24, 42], 'two mounts, 1.5, close');
  st.foes[0].parts.weapons.hp = 20;
  assert.deepEqual(plain(foeMove(st, 0)).dmg, [12, 21], 'one mount left');
});

test('a part at 0 cancels its move: no lock, no board; no drive, no close; no guns, no broadside', () => {
  let st = fight({}, {}, K);
  kill(st.foes[0], 'lock');
  assert.equal(foeMove(st, 0).kind, 'broadside', 'no lock, no board');
  st = fight({}, {}, M);
  kill(st.foes[0], 'drive');
  assert.equal(foeMove(st, 0).kind, 'broadside', 'no drive, no close');
  st = fight({ stats: { accel: 2 } }, {}, M);
  kill(st.me, 'drive');
  assert.equal(foeMove(st, 0).kind, 'close', 'with your drive out she cannot pin it');
  kill(st.foes[0], 'weapons', 'drive');
  assert.deepEqual(plain(foeMove(st, 0)), { kind: 'hold' });
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

test('each end is reached: crippled, broke, boarded, lost, escaped, standoff after six turns', () => {
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
  assert.equal(shipEnd(st), 'standoff');
});

test('your loss comes first: boarded while your armor is 0 is lost', () => {
  const st = fight({}, {}, K); st.me.armor = 0;
  assert.equal(shipEnd(resolveShipTurn(st, orders([]), mv('board'), LOW).state), 'lost');
});

test('a pin is a broadside at your drive', () => {
  const st = fight({ stats: { accel: 2 } }, {}, CLOSE);
  const r = resolveShipTurn(st, orders([]), { foe: [{ kind: 'pin', target: 'drive', dmg: [8, 8] }], captain: hold }, LOW);
  assert.deepEqual([r.state.me.parts.drive.hp, r.state.me.armor], [22, 140]);
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
