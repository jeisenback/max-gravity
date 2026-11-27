'use strict';

// The fights' shared rules (js/fight.js): the sides and damage a ship fight on the radar uses, and the deck fight's numbers, in plain Node. The ship fight's own
// rules are radar.js's (tests/radar.test.js) since #1348.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./nodecontext');

const api = load(['js/data.js', 'js/range.js', 'js/sheet.js', 'js/handtohand.js', 'js/boarders.js', 'js/shipcombat.js', 'js/fight.js'], { Mods: { register() {} } }, ['SHIPS', 'dealDamage', 'OUTFITS', 'FIGHT', 'shipSide', 'DECK_PARTY']);  // Mods is the one thing it reaches for at load
const { SHIPS, dealDamage, OUTFITS, FIGHT, shipSide, DECK_PARTY } = api;
const plain = x => JSON.parse(JSON.stringify(x));  // arrays made in the vm context are not this realm's

test('a side takes its hull from the ship and its outfits', () => {
  const s = shipSide({ armor: 230, guns: 1, dmgMult: 1 }, {});
  assert.deepEqual([s.armor, s.parts.weapons.max, s.parts.drive.max, s.parts.lock.max], [104, 63, 34, 7], 'her 230 at FIGHT.POOL 0.45, rounded; no shields (#1208)');
  assert.equal(s.shields, undefined);
  assert.equal(shipSide({ armor: 100, guns: 3, dmgMult: 1 }, {}).parts.weapons.max, 189, 'weapons are sized per gun mount');
});

test('shipSide scales armor by FIGHT.POOL', () => {
  assert.ok(FIGHT.POOL > 0 && FIGHT.POOL < 1, `POOL ${FIGHT.POOL}`);
  const s = shipSide({ armor: 230, guns: 1, dmgMult: 1 }, {});
  const pool = n => Math.round(n * FIGHT.POOL);
  assert.deepEqual([s.armor, s.maxArmor], [pool(230), pool(230)]);
  const v = shipSide({ armor: 150, guns: 1, dmgMult: 1 }, { grade: 2 });
  assert.deepEqual([v.armor, v.maxArmor], [pool(192), pool(192)], 'a veteran\'s longer hull is scaled too (150 lengthened by GRADE_HULL 0.14 twice)');
  assert.deepEqual([s.parts.weapons.max, s.parts.drive.max, s.parts.lock.max], [63, 34, 7], 'the parts are not');
});

test('a side with a launcher has a launcher part; one without has none', () => {
  const stats = { armor: 150, guns: 1, dmgMult: 1 };
  const a = shipSide(stats, { launcher: true });
  assert.deepEqual(plain([a.parts.launcher, a.launcher]), [{ hp: FIGHT.PART_HP.launcher, max: FIGHT.PART_HP.launcher }, true]);
  const b = shipSide(stats, {});
  assert.deepEqual([b.parts.launcher, b.launcher], [undefined, false]);
});

test('a veteran grade lengthens the hull and raises the punch', () => {
  const plainSide = shipSide({ armor: 150, guns: 1, dmgMult: 1 }, {}), vet = shipSide({ armor: 150, guns: 1, dmgMult: 1 }, { grade: 2 });
  assert.ok(vet.armor > plainSide.armor && vet.dmgMult > plainSide.dmgMult);
});

test('damage takes armor at the hull and hp at a part, and a part at 0 takes nothing', () => {
  const side = shipSide({ armor: 150, guns: 1, dmgMult: 1 }, {}), a0 = side.armor;
  assert.equal(dealDamage(side, 'hull', 10), 10); assert.equal(side.armor, a0 - 10);
  assert.equal(dealDamage(side, 'lock', 100), FIGHT.PART_HP.lock); assert.equal(side.parts.lock.hp, 0);
  assert.equal(dealDamage(side, 'lock', 5), 0, 'nothing from a part already gone');
});

test('the constants are the ones the design names', () => {
  assert.deepEqual(plain(FIGHT), { GUN_DMG: [8, 14], FOE_DMG: [7, 18], HEAVY: 1.4, SKILL_DMG: 1, BAND_MULT: { knife: 1.1, close: 1, mid: 0.85, long: 0.8 }, HEAT_CAP: 4, HEAT_VENT: 2, AIM_MULT: { knife: 1, close: 1, mid: 0.4, long: 0.25 }, PART_HP: { weapons: 63, drive: 34, lock: 7, launcher: 10 }, TORP_DMG: [12, 18], SALVO_DMG: [20, 30], SALVO: 2, SALVO_EVERY: 2, POOL: 0.45, BREAK: 0.3, HAND_HURT: 0.35, PATCH: 0.1, HEAVY_HIT: 0.2, LOST_CARGO: 0.3 });
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

// Who comes aboard (the deck fight's rules are js/deckplan.js, tests/deckplan.test.js).
test('the party is keyed by the hull: cutter and destroyer are navy, an unknown ship is a raider', () => {
  assert.deepEqual(plain(DECK_PARTY), { raider: 'raider', corsair: 'corsair', cutter: 'navy', destroyer: 'navy' });
});

// The ladder reaches level 5 (#963): the deck fight's sidearm table covers every level the hand can hold, and a level past it reads the last row.
test('the sidearm table covers five levels, and a level past the table takes its last row', () => {
  const { DECK, sidearmOf } = load(['js/data.js', 'js/range.js', 'js/sheet.js', 'js/handtohand.js', 'js/boarders.js', 'js/shipcombat.js', 'js/fight.js'], { Mods: { register() {} } }, ['DECK', 'sidearmOf']);
  assert.ok(DECK.SIDEARM_BY_LEVEL.length >= 6, `rows for levels 0 to 5: ${DECK.SIDEARM_BY_LEVEL.length}`);
  for (let l = 0; l <= 5; l++) { const [lo, hi] = sidearmOf({ level: l }); assert.ok(lo >= 1 && hi >= lo, `level ${l}: ${lo} to ${hi}`); }
  assert.deepEqual([...sidearmOf({ level: 9 })], [...DECK.SIDEARM_BY_LEVEL[DECK.SIDEARM_BY_LEVEL.length - 1]]);
  const rows = DECK.SIDEARM_BY_LEVEL; for (let l = 1; l < rows.length; l++) assert.ok(rows[l][1] >= rows[l - 1][1], 'a higher level shoots no worse');
});
