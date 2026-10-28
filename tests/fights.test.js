'use strict';

// tools/fights.js: the fights over seeded trials. One tiny run, to check the tool still drives each fight to its end and
// reports a table of the right shape. The targets the fights are tuned to (many seeds of them) are checked in the soak, tests/distribution/fights.test.js (#753).

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { closeBrowser } = require('./helpers');
const { fights } = require('../tools/fights');

after(closeBrowser);

test('the fights tool plays the ship fight, the repel fight and the assault fight to their ends', async () => {
  const r = await fights({ seed: 1, n: 3 });
  assert.deepEqual(r.errors, []);
  assert.deepEqual(Object.keys(r.raid), ['random', 'focus', 'drive', 'lock', 'hull', 'hullhold', 'answer'], 'the guns\' policies');
  const closed = t => t.crippled + t.broke + t.ran + t.away + t.boarded + t.lost + t.escaped + t.died;
  for (const t of Object.values(r.raid)) { assert.equal(t.n, 3); assert.equal(closed(t), 3, 'every fight ends one way, or with the hand killed'); assert.ok(t.rounds >= 3 - t.died && t.rounds <= 3 * 8, 'one to eight turns a fight'); assert.equal(t.capped, 0, 'and the scene after it is played to its end'); }
  for (const kind of [r.repel, r.assault]) {
    assert.ok(Object.keys(kind).length >= 10);
    for (const t of Object.values(kind)) { assert.equal(t.n, 3); assert.ok(t.rounds >= 3, 'a fight lasts more than a round'); assert.ok(t.won <= 3); }
  }
});

// answerOrders (tools/answer.js, #814): the torpedo is held until her shields are down. It is a self-contained script on the game's globals, so it runs here in a bare context with those stubbed.
const vm = require('node:vm');
const { answerOrders } = require('../tools/answer');
function orders(foes, { torps = 2, launcher = true } = {}) {
  const ctx = vm.createContext({ FIGHT: { OVER_HEAT: 2, HEAT_CAP: 4 }, fightUp: f => f.armor > 0, gunsReady: st => st.me.guns });
  const fn = vm.runInContext(`(${answerOrders.toString()})`, ctx);
  const foe = (shields, armor, regen = 0) => ({ shields, maxShields: 100, armor, maxArmor: 100, regen, parts: { lock: { hp: 0 } } });
  const state = { heat: 0, me: { guns: 2, launcher, torps }, foes: foes.map(([s, a, r]) => foe(s, a, r)) };
  // (the round trip brings the result out of the vm's realm, so deepEqual compares plain objects)
  return JSON.parse(JSON.stringify(fn({ state, shown: { foe: [] } })));
}

test('answer holds torpedoes at full shields', () => {
  assert.equal(orders([[100, 100, 0]]).torp, null, 'a foe that does not regenerate, at full shields');
  assert.equal(orders([[100, 100, 0.1]]).torp, null, 'a foe that regenerates, at full shields');
  assert.equal(orders([[26, 100, 0]]).torp, null, 'just over a quarter');
});

test('answer fires a torpedo once her shields are down', () => {
  assert.deepEqual(orders([[25, 100, 0]]).torp, { foe: 0, part: 'hull' }, 'at a quarter, any type');
  assert.deepEqual(orders([[0, 80, 0.1]]).torp, { foe: 0, part: 'hull' });
  assert.equal(orders([[0, 80, 0]], { torps: 0 }).torp, null, 'none left');
  assert.equal(orders([[0, 80, 0]], { launcher: false }).torp, null, 'no launcher');
});

test('answer fires at a foe that regenerates once her shields are under their maximum', () => {
  const at = n => { const o = orders([[n, 100, 0.07]]); return o.torp; };
  assert.deepEqual(at(80), { foe: 0, part: 'hull' }, 'dented, well over a quarter');
  assert.equal(at(100), null, 'full');
  assert.equal(orders([[80, 100, 0]]).torp, null, 'the same shields on a foe that does not regenerate are held');
});

test('answer fires at a pair', () => {
  assert.deepEqual(orders([[100, 100, 0], [10, 60, 0]]).torp, { foe: 1, part: 'hull' }, 'at the one whose shields are down');
  assert.deepEqual(orders([[10, 90, 0], [0, 50, 0]]).torp, { foe: 1, part: 'hull' }, 'at the one with the least left');
  assert.equal(orders([[100, 100, 0], [100, 60, 0]]).torp, null, 'held while both are whole');
});

// The gunner moves in answerOrders: run against the engine's own canUse (js/fight.js loaded into the same bare context), so the rule and the engine cannot disagree.
const moveCtx = vm.createContext({ RANGE_BANDS: ['knife', 'close', 'mid', 'long'], GRADE_HULL: 0, GRADE_PUNCH: 0, fightUp: f => f.armor > 0 });
vm.runInContext(require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'js', 'fight.js'), 'utf8'), moveCtx);  // the engine, loaded once
function moveOrders({ known, band = 2, heat = 0, locked = [], spent = [], regen = 0, shown, lockHp = 0, pdc = true, weapons = 126 }) {
  const ctx = moveCtx;
  const fn = vm.runInContext(`(${answerOrders.toString()})`, ctx);
  const foe = { shields: 100, maxShields: 100, armor: 100, maxArmor: 100, regen, parts: { lock: { hp: lockHp }, drive: { hp: 34 }, weapons: { hp: 63 } } };
  const state = { kind: 'ship', band, heat, locked, spent, me: { guns: 2, launcher: false, torps: 0, pdc, parts: { weapons: { hp: weapons, max: 126 } } }, foes: [foe] };
  return JSON.parse(JSON.stringify(fn({ state, shown: { foe: [shown] }, known })));
}
const ALL = ['vent', 'lead', 'split'];

test('answer splits the turret on a salvo turn, vents a locked gun, and leads an aimed shot at range', () => {
  assert.equal(moveOrders({ known: ALL, shown: { kind: 'salvo' }, heat: 3 }).move, 'split', 'a salvo turn: the turret is held, split keeps its shot (before vent)');
  assert.equal(moveOrders({ known: ALL, shown: { kind: 'hold' }, locked: [1] }).move, 'vent', 'a gun locked: vent fires it');
  assert.equal(moveOrders({ known: ALL, shown: { kind: 'pin' }, lockHp: 7, band: 3 }).move, 'lead', 'a shot at her lock from long range');
  assert.equal(moveOrders({ known: ALL, shown: { kind: 'pin' }, lockHp: 7, band: 2 }).move, 'lead', 'and from mid range');
  const o = moveOrders({ known: ALL, shown: { kind: 'pin' }, lockHp: 7, band: 3 });
  assert.ok(Number.isInteger(o.gun) && o.guns[o.gun].part === 'lock', 'lead names a gun that aims at a part');
  assert.equal(moveOrders({ known: ALL, shown: { kind: 'pin' }, lockHp: 7, band: 1 }).move, undefined, 'close in, the aim costs nothing: no lead');
  assert.equal(moveOrders({ known: ALL, shown: { kind: 'hold' } }).move, undefined, 'nothing to act on: no move');
});

test('answer never orders a move the hand does not know', () => {
  const cases = [{ shown: { kind: 'salvo' }, heat: 3 }, { shown: { kind: 'hold' }, locked: [1] }, { shown: { kind: 'pin' }, lockHp: 7, band: 3 }];
  for (const c of cases) {
    assert.equal(moveOrders({ ...c, known: [] }).move, undefined, 'knowing none');
    assert.equal(moveOrders({ ...c }).move, undefined, 'a fight with no known list');
  }
  assert.equal(moveOrders({ known: ['lead'], shown: { kind: 'salvo' }, heat: 3 }).move, undefined, 'a salvo turn without split');
  assert.equal(moveOrders({ known: ['vent'], shown: { kind: 'pin' }, lockHp: 7, band: 3 }).move, undefined, 'a lead without lead');
});

test('answer counts the shot split gives back, vents only for a shot, picks one move by priority, and does not repeat a spent one', () => {
  const heatOf = o => o.guns.reduce((h, g) => h + (g.over ? 2 : 1), 2);
  const split = moveOrders({ known: ALL, shown: { kind: 'salvo' }, regen: 0.07, heat: 2, spent: ['vent'] });
  assert.equal(split.move, 'split');
  assert.ok(heatOf(split) <= 4, 'two guns at heat 2 on a split turn stay at the cap (vent spent: the budget stands)');
  assert.equal(moveOrders({ known: ALL, shown: { kind: 'hold' }, heat: 3 }).move, undefined, 'heat alone, no gun locked: vent would add no shot')
  assert.equal(moveOrders({ known: ALL, shown: { kind: 'pin' }, lockHp: 7, band: 3, locked: [1] }).move, 'vent', 'vent and lead both apply: vent first');
  assert.equal(moveOrders({ known: ALL, shown: { kind: 'pin' }, lockHp: 7, band: 3, locked: [1], spent: ['vent'] }).move, 'lead', 'a spent vent leaves lead');
  assert.equal(moveOrders({ known: ALL, shown: { kind: 'salvo' }, spent: ['split'] }).move, undefined, 'a spent split is not ordered again');
});

test('answer runs the guns hot against shields that come back while it can still vent, and keeps the heat budget otherwise', () => {
  const overs = o => o.guns.map(g => !!g.over);
  assert.deepEqual(overs(moveOrders({ known: ALL, shown: { kind: 'hold' }, regen: 0.07, heat: 3 })), [true, true], 'vent unspent: every gun overcharged past the cap');
  assert.deepEqual(overs(moveOrders({ known: ['vent'], shown: { kind: 'hold' }, regen: 0.07, heat: 3 })), [true, true], 'vent alone is enough');
  for (const [why, o] of [['no moves', { known: [] }], ['no vent', { known: ['lead', 'split'] }], ['vent spent', { known: ALL, spent: ['vent'] }]]) {
    assert.deepEqual(overs(moveOrders({ ...o, shown: { kind: 'hold' }, regen: 0.07, heat: 3 })), [false, false], `${why}: at heat 3 no gun is overcharged (the cap)`);
  }
  const vented = moveOrders({ known: ALL, shown: { kind: 'hold' }, regen: 0.07, heat: 5, locked: [0] });
  assert.equal(vented.move, 'vent', 'a gun locked: vent');
  assert.ok(vented.guns.reduce((h, g) => h + (g.over ? 2 : 1), 0) <= 4, 'the turn it vents, the heat budget from 0 stands');
  assert.deepEqual(overs(moveOrders({ known: ALL, shown: { kind: 'hold' }, regen: 0, heat: 0 })), [false, false], 'shields that do not come back: no overcharge');
});
