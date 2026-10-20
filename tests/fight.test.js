'use strict';

// The turn-based fight engine (js/fight.js): sides, damage in ranges, heat and parts, in plain Node.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./nodecontext');

const api = load(['js/data.js', 'js/range.js', 'js/sheet.js', 'js/handtohand.js', 'js/boarders.js', 'js/shipcombat.js', 'js/fight.js'], { Mods: { register() {} } }, ['SHIPS', 'OUTFITS', 'FIGHT', 'RANGE_BANDS', 'shipSide', 'shipFight', 'gunsReady', 'resolveShipTurn', 'foeMove', 'captainMove', 'shipEnd', 'DECK', 'CUNNING', 'fightCover', 'deckFight', 'boardMove', 'resolveDeckTurn', 'deckEnd']);  // boarders.js is loaded for REPEL_HURT; Mods is the one thing it reaches for at load
const { SHIPS, OUTFITS, FIGHT, RANGE_BANDS, shipSide, shipFight, gunsReady, resolveShipTurn, foeMove, captainMove, shipEnd, DECK, CUNNING, fightCover, deckFight, boardMove, resolveDeckTurn, deckEnd } = api;
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
  assert.deepEqual([s.shields, s.armor, s.parts.weapons.max, s.parts.drive.max, s.parts.lock.max], [90, 140, 20, 20, 10]);
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
  assert.deepEqual([lo.dmg, hi.dmg], [17, 28], '12 * 1.4 and 20 * 1.4, rounded');
  const long = fight({ stats: { guns: 1 } }, {}, RANGE_BANDS.indexOf('long'));
  assert.equal(resolveShipTurn(long, orders(fire(1)), quiet, HIGH).events[0].dmg, 16, '20 * 0.8');
  const skilled = fight({ stats: { guns: 1 }, opts: { skill: 2 } });
  assert.equal(resolveShipTurn(skilled, orders(fire(1)), quiet, LOW).events[0].dmg, 14, 'a gunner adds a point a level to the low end');
});

test('damage takes shields before armor, and a part at 0 is out', () => {
  const st = fight({ stats: { guns: 1 } }, { stats: { shields: 5 } });
  const foe = resolveShipTurn(st, orders(fire(1)), quiet, LOW).state.foes[0];
  assert.deepEqual([foe.armor, foe.shields], [93, 1], 'the 12 points took the 5 shields, then 7 of armor; a tenth of 5 shields came back');
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
  assert.deepEqual(plain(FIGHT), { GUN_DMG: [12, 20], HEAVY: 1.4, SKILL_DMG: 1, BAND_MULT: { knife: 1.1, close: 1, mid: 0.85, long: 0.8 }, HEAT_CAP: 4, HEAT_VENT: 2, SHIELD_REGEN: 0.1, PART_HP: { weapons: 20, drive: 20, lock: 10 }, TORP_DMG: [30, 45], PDC_HOLD: 0.4, TURNS: 6, BREAK: 0.3, HAND_HURT: 0.35, HEAVY_HIT: 0.1 });
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
  assert.deepEqual(plain(foeMove(st, 0)), { kind: 'pin', target: 'drive', dmg: [10, 17] }, 'faster me: 12 and 20 times 0.85');
  st = fight({}, {}, M);
  assert.deepEqual(plain(foeMove(st, 0)), { kind: 'close', target: 'hull', dmg: [10, 17] }, 'equal speed, above close: she closes, firing at your hull as she comes');
  st = fight({}, {}, CLOSE);
  assert.deepEqual(plain(foeMove(st, 0)), { kind: 'close', target: 'hull', dmg: [12, 20] }, 'from close range she closes on to the knife, to board');
  kill(st.foes[0], 'drive');
  assert.deepEqual(plain(foeMove(st, 0)), { kind: 'broadside', target: 'weapons', dmg: [12, 20] }, 'her drive gone, she stays and shoots at your guns');
  kill(st.me, 'weapons');
  assert.deepEqual(plain(foeMove(st, 0)), { kind: 'broadside', target: 'hull', dmg: [12, 20] }, 'your guns gone, she shoots at your hull');
  st = fight({}, { stats: { guns: 2, dmgMult: 1.5 } }, K);
  assert.deepEqual(plain(foeMove(st, 0)), { kind: 'board' }, 'at the knife she boards');
  hurt(st.foes[0], 0.2);
  assert.deepEqual(plain(foeMove(st, 0)), { kind: 'break' }, 'a hull under 30 percent beats a board');
  st = fight({}, { stats: { guns: 2, dmgMult: 1.5 } }, CLOSE); kill(st.foes[0], 'drive');
  assert.deepEqual(plain(foeMove(st, 0)).dmg, [36, 60], 'two mounts, 1.5, close');
  st.foes[0].parts.weapons.hp = 20;
  assert.deepEqual(plain(foeMove(st, 0)).dmg, [18, 30], 'one mount left');
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
  assert.deepEqual([r.state.me.parts.drive.hp, r.state.me.armor], [12, 140]);
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
  assert.equal(boardMove(hold1, LOW).kind, 'hold', 'one against two in the corridor: they hold');
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
  side.sections[1].mine = 6;
  assert.deepEqual(plain(boardMove(side, LOW)), { kind: 'round', from: 0, to: 3, n: 3, feint: false }, 'with a long ship and the corridor held, round by the cargo bay');
  side.sections[3].theirs = 2; side.sections[2].theirs = 2; side.sections[0].theirs = 1;
  assert.equal(boardMove(side, LOW).from, 2, 'the front is the furthest along, the bridge over the cargo bay');
  const asl = deck({ assault: true, boarders: 6, crew: 3 });
  assert.deepEqual(plain(boardMove(asl, LOW)), { kind: 'hold', from: 0, to: 0, n: 0, feint: false }, 'her crew hold');
  asl.sections[1].mine = 1; asl.sections[1].theirs = 0; asl.sections[2].theirs = 4; asl.sections[2].mine = 0;
  const m = boardMove(asl, LOW);
  assert.deepEqual([m.kind, m.from, m.to], ['push', 2, 1], 'where she outnumbers us she pushes back toward the lock');
});

test('the deck starts with the attackers in the lock and the defenders spread, the remainder in the lock', () => {
  assert.deepEqual(heads(deck({ boarders: 4, crew: 5 })), [[3, 4], [1, 0], [1, 0]], 'five over three: one each and two extra to the lock');
  assert.deepEqual(heads(deck({ boarders: 7, crew: 3, assault: true })), [[3, 3], [0, 2], [0, 2]], 'in an assault mine are the attackers');
  const st = deck({ side: true, cover: [1, 2, 3] });
  assert.deepEqual(plain([st.sections.length, st.sections[3].cover, st.hand, st.began, st.turn, st.used, st.kind]), [4, 0, 0, 3, 0, {}, 'deck']);
  assert.deepEqual(plain(st.sections.map(s => s.cover)), [1, 2, 3, 0]);
  assert.deepEqual(plain(DECK), { SECTIONS: ['lock', 'corridor', 'bridge'], SIDEARM: [1, 2], CREW_HIT: [0, 1], BREAK: 1 / 3, SUIT: 0.7 });
  assert.deepEqual(plain(fightCover({ size: 12, kit: [], extra: [] })), [1, 1, 1], 'the cover input is the shape fightCover gives');
});

test('a section exchange takes heads within the ranges, less with cover', () => {
  const two = (cover, rand) => {
    const st = deck({ boarders: 6, crew: 6, cover });
    st.sections[1] = { mine: 2, theirs: 2, cover: cover[1] };
    const r = resolveDeckTurn(st, { stand: 0, act: null, order: null }, stay, rand);
    return plain(r.state.sections[1]);
  };
  assert.deepEqual(two([0, 0, 0], LOW), { mine: 2, theirs: 2, cover: 0 }, 'the low end of the range takes none');
  assert.deepEqual(two([0, 0, 0], HIGH), { mine: 1, theirs: 1, cover: 0 }, 'the high end takes one a side');
  assert.deepEqual(two([0, 1, 0], HIGH), { mine: 2, theirs: 1, cover: 1 }, 'a pip of cover takes the high end off the defenders');
  const lone = deck({ boarders: 3, crew: 3 });
  lone.sections[2].theirs = 0;
  assert.deepEqual(heads(resolveDeckTurn(lone, { stand: 0, act: null, order: null }, stay, HIGH).state)[2], [1, 0], 'where only one side stands nothing is traded');
});

test('the hand shoots, steadies or covers in the section they stand in', () => {
  const base = () => { const st = deck({ boarders: 6, crew: 6 }); st.sections[0] = { mine: 2, theirs: 6, cover: 0 }; return st; };
  const turn = (act, order, rand) => resolveDeckTurn(base(), { stand: 0, act, order }, stay, rand);
  let r = turn(SHOOT, null, seq(0, 0, 0, 0, 0, 0, 0));
  assert.equal(r.state.sections[0].theirs, 5, 'a shot adds the sidearm roll: one at least');
  r = turn(SHOOT, null, seq(0.999, 0.999, 0.999, 0.999));
  assert.equal(r.state.sections[0].theirs, 3, 'the exchange takes one and the sidearm two');
  r = turn({ kind: 'steady', odds: 0.5 }, null, seq(0.1, 0, 0, 0, 0));
  assert.equal(r.state.sections[0].theirs, 5, 'a steady hand that works thins them by one');
  r = turn({ kind: 'steady', odds: 0.5 }, null, seq(0.9, 0, 0, 0.999));
  assert.equal(r.state.sections[0].theirs, 6, 'one that misses thins no one');
  assert.equal(r.state.sections[0].mine, 1, 'and they press: a roll against us, here a high one');
  r = turn({ kind: 'cover', odds: 0.5 }, null, seq(0.1, 0, 0, 0, 0));
  assert.deepEqual([r.state.sections[0].cover, r.state.used.cover], [2, true], 'cover made is two points, once a fight');
  r = resolveDeckTurn(r.state, { stand: 0, act: { kind: 'cover', odds: 1 }, order: null }, stay, seq(0, 0, 0, 0));
  assert.equal(r.state.sections[0].cover, 2, 'the second cover does nothing');
  r = turn(null, { kind: 'steady', odds: 0.9 }, seq(0.1, 0, 0, 0, 0));
  assert.equal(r.state.sections[0].theirs, 5, 'a crew order works as the hand does');
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
  assert.deepEqual(heads(r.state)[1], [0, 2], 'the last of ours there is down, and one of theirs with it');
  assert.equal(r.state.hand, 2, 'the hand falls back one, toward our side');
  assert.ok(r.events.some(e => e.kind === 'hand' && e.back), 'the retreat is an event');
  assert.equal(r.events.filter(e => e.kind === 'hurt').length, 1, 'with one hurt roll');
  assert.equal(r.events.find(e => e.kind === 'hurt').hurt, false, '0.999 is over 0.315');
  const lucky = resolveDeckTurn(st, { stand: 1, act: null, order: null }, push, seq(0.999, 0.999, 0.999, 0.999, 0, 0, 0, 0));
  assert.ok(lucky.events.some(e => e.kind === 'hurt' && e.hurt), 'a low roll is hurt: 0.45 * 0.7');
  const sheer = resolveDeckTurn(st, { stand: 1, act: null, order: null }, push, seq(0.999, 0.999, 0.999, 0.999, 0.4));
  assert.ok(sheer.events.some(e => e.kind === 'hurt' && !e.hurt), '0.4 is over 0.315: not hurt');
  const asl = deck({ assault: true, boarders: 3, crew: 3 });
  asl.sections[0] = { mine: 1, theirs: 0, cover: 0 }; asl.sections[1] = { mine: 0, theirs: 2, cover: 0 }; asl.hand = 1;
  assert.equal(resolveDeckTurn(asl, { stand: 1, act: null, order: null }, push, HIGH).state.hand, 0, 'in an assault the way back is toward the lock');
});

test('the ends: broken at a third, all down, pushed out of the lock, or the bridge taken; mirrored for an assault', () => {
  const st = deck({ boarders: 6, crew: 3 });
  assert.equal(deckEnd(st), null);
  st.sections[0].theirs = 2;
  assert.equal(deckEnd(st), 'won', 'a third of six is two: broken');
  st.sections[0].theirs = 3;
  assert.equal(deckEnd(st), null, 'three is over a third');
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
  broke.sections.forEach(s => { s.theirs = 0; }); broke.sections[0].theirs = 2;
  assert.equal(deckEnd(broke), 'won', 'hers broken at a third');
});

test('cargo is next to the lock and the bridge both ways: the hand steps in and out, and a feint from the corridor never lands there', () => {
  const at = (from, stand) => resolveDeckTurn({ ...deck({ side: true }), hand: from }, { stand, act: null, order: null }, stay, LOW).state.hand;
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

test('an assault played turn by turn reaches the end: our party advances section by section and holds her bridge', () => {
  let st = deck({ assault: true, boarders: 3, crew: 6 });
  let end = null;
  for (let t = 0; t < 12 && !end; t++) {
    st = resolveDeckTurn(st, { stand: 0, act: null, order: null }, boardMove(st, HIGH), HIGH).state;
    end = deckEnd(st);
  }
  assert.equal(end, 'won');
  assert.ok(st.sections[2].mine > 0 && st.sections[2].theirs === 0, 'mine hold her bridge');
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
  assert.equal(playOut({ me: 'freighter', foes: ['raider'], aim: at('weapons') }), 'broke', 'her guns shot away, she breaks off');
  assert.equal(playOut({ me: 'gunship', foes: ['raider'], aim: drive, roll: 0.99 }), 'crippled', 'her drive and then her guns: dead in space');
  assert.equal(playOut({ me: 'freighter', foes: ['corsair'], aim: at('hull'), roll: 0.1 }), 'boarded', 'shooting her hull does not stop her coming alongside');
  assert.equal(playOut({ me: 'freighter', foes: ['corsair'], aim: drive, nerve: 3, roll: 0.99 }), 'standoff', 'her drive gone, her guns left: six turns of it');
  assert.equal(playOut({ me: 'courier', foes: ['raider'], aim: at('hull'), armor: 1 }), 'escaped', 'a worn courier, a cautious captain and the faster ship: she is lost astern');
  assert.equal(playOut({ me: 'shuttle', foes: ['corsair', 'corsair'], aim: at('hull'), roll: 0.99, grade: 2 }), 'lost', 'a skiff against a veteran pair: the hull goes before they are alongside');
});
