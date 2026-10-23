'use strict';

// tools/fights.js: the fights over seeded trials. One tiny run, to check the tool still drives each fight to its end and
// reports a table of the right shape (the numbers themselves are in COMBAT.md, and are for tuning, not for a test).

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { closeBrowser } = require('./helpers');
const { fights } = require('../tools/fights');

after(closeBrowser);
const DECK_N = 200, DECK_SEEDS = [1, 2];  // deck fights a cell in the spread test, on each of two seeds played side by side: boarding her at grade 1 wins 57 in a hundred over
// five seeds against the lock fight's 62, so one seed of 200 can fall just past the ten points (seed 1 at 0.515 after R42's casualty roll moved the draws); two seeds hold it

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

// The ship fight's targets (docs/superpowers/specs/2026-10-21-ship-fight-rework-design.md, "How we know it worked"; #808; #814's FIGHT.POOL), read from the tool's
// table by the type she is (a raider, a corsair, a navy cutter, a raider pair), on two seeds of 200 played side by side (about 130 to 300 fights a policy and type);
// the figures in brackets are at three seeds of 100 (COMBAT.md has five):
// - no fixed aim (random, focus, drive, lock, hull, hullhold) has more than 70% good ends (crippled, broken off, escaped) against every type, and the best fixed
//   aim is not the same against every type (hull fire against a lone raider and a corsair, random against a cutter and a pair);
// - the policy that reads her shown move (answer) has good ends at or above every fixed aim's against each type, and above all of them over every type
//   (99% against hull fire's 52%). Two ties, as measured: the lone raider (hull fire 100% against answer's 100%) and the corsair (hull fire 99% against answer's 100%). A lone raider is beaten by hull fire, so there answer only ties it: the owner's choice (#814), as a smaller pool
//   halves her hull and every gun at it cripples her before she is alongside. The lock lesson is the raider pair's: every gun at the hull, the turret held or
//   not, is boarded at least half the time (every time), and answer, at the locks, wins (93%);
// - random play loses ('ran' or 'lost') a quarter of its fights or more over every type (38%), and loses real hull: at least 5% of it a fight (19%);
// - a fight lasts five to eight turns on the mean over every policy and type (5.3), and under a third of answer's fights reach the turn cap (32%: a corsair
//   and a pair still run long); every fight ends one of the named ways, so there is no standoff.
// The lock fights started directly are left out (lock: false). The hand is killed in at most 3 random fights in a hundred (1%).
const SHIP_N = 200, SHIP_SEEDS = [1, 2];
test('no fixed aim wins against every type of ship and the best one differs by type, reading her move is never beaten, hull fire alone loses to a raider pair\'s board, random play loses a quarter of its fights and real hull, and a fight lasts five to eight turns and mostly ends before the cap', async () => {
  const runs = await Promise.all(SHIP_SEEDS.map(seed => fights({ seed, n: SHIP_N, lock: false })));
  for (const x of runs) assert.deepEqual(x.errors, []);
  const m = {};  // the seeds' rows by policy and type, summed
  for (const x of runs) for (const [k, t] of Object.entries(x.match)) { const acc = m[k] = m[k] || {}; for (const [f, v] of Object.entries(t)) acc[f] = (acc[f] || 0) + v; }
  const TYPES = ['raider', 'corsair', 'cutter', 'raider pair'], FIXED = ['random', 'focus', 'drive', 'lock', 'hull', 'hullhold'], ENDS = ['crippled', 'broke', 'escaped', 'away', 'boarded', 'ran', 'lost'];
  const row = (p, type) => m[`${p}|${type}`], good = t => t.good / t.n;
  for (const type of TYPES) for (const p of [...FIXED, 'answer']) {
    const t = row(p, type);
    assert.ok(t && t.n >= 80, `${p} against a ${type}: ${t ? t.n : 0} fights`);
    assert.equal(ENDS.reduce((n, e) => n + (t[e] || 0), 0) + t.died, t.n, `${p} against a ${type}: every fight ends one of the named ways (no standoff)`);
  }
  for (const p of FIXED) assert.ok(TYPES.some(type => good(row(p, type)) <= 0.7), `${p} has more than 70% good ends against every type: ${TYPES.map(type => good(row(p, type)).toFixed(2)).join(', ')}`);
  const best = TYPES.map(type => FIXED.slice().sort((a, b) => good(row(b, type)) - good(row(a, type)))[0]);
  assert.ok(new Set(best).size >= 2, `the best fixed aim is ${best[0]} against every type`);
  TYPES.forEach((type, i) => assert.ok(good(row('answer', type)) >= good(row(best[i], type)), `against a ${type}: answer ${good(row('answer', type)).toFixed(2)}, ${best[i]} ${good(row(best[i], type)).toFixed(2)}`));
  for (const p of ['hull', 'hullhold']) { const t = row(p, 'raider pair'); assert.ok(t.boarded / t.n >= 0.5, `${p} against a raider pair: boarded ${(t.boarded / t.n).toFixed(2)}, good ${good(t).toFixed(2)}`); }
  const over = p => { const all = {}; for (const type of TYPES) for (const [f, v] of Object.entries(row(p, type))) all[f] = (all[f] || 0) + v; return all; };
  const ans = over('answer');
  for (const p of FIXED) { const t = over(p); assert.ok(good(ans) > good(t), `over every type: answer ${good(ans).toFixed(2)}, ${p} ${good(t).toFixed(2)}`); }
  assert.ok(ans.atCap / ans.n < 1 / 3, `${(ans.atCap / ans.n).toFixed(2)} of answer's fights reach the turn cap`);
  const rnd = over('random');
  assert.ok(rnd.lostFight / rnd.n >= 0.25, `random play loses ${(rnd.lostFight / rnd.n).toFixed(2)} of its fights`);
  assert.ok(rnd.hull / rnd.n >= 0.05, `random play loses ${(100 * rnd.hull / rnd.n).toFixed(2)}% of the hull a fight`);
  assert.ok(rnd.died / rnd.n <= 0.03, `the hand is killed in ${(rnd.died / rnd.n).toFixed(3)} of random fights`);
  const every = [...FIXED, 'answer'].map(over), turns = every.reduce((n, t) => n + t.rounds, 0) / every.reduce((n, t) => n + t.n, 0);
  assert.ok(turns >= 5 && turns <= 8, `a fight lasts ${turns.toFixed(2)} turns on the mean`);
});

// The deck fight both ways (Task 7, R36). With five crew, random play wins about as often by her grade as the lock fight before it did (within ten points of
// 83, 59 and 40 in a hundred repelling, and 82, 62 and 34 boarding her), and costs about as many dead (within 0.15 a fight of 0.28, 0.43 and 0.57
// repelling, and 0.29, 0.41 and 0.56 boarding her: R42, a head lost is downed and only sometimes a casualty, DECK.CASUALTY); and the best of the hand's plans wins five points or more over random play,
// so that where the hand stands and what it does there count: repelling with two crew or five, and boarding her with two. Boarding her with five, the best
// plan is seven points up over five seeds but from -5 to 7 on one seed, so it is not checked here (task-7-report.md). The ship fights are left out
// (raid: false), and only the groups asked are played.
test('the deck fight is won by grade about as often as the lock fight was, kills about as many of the crew, and the hand\'s plan beats random play', async () => {
  const runs = await Promise.all(DECK_SEEDS.map(seed => fights({ seed, n: DECK_N, raid: false, groups: ['policy', 'small crew', 'grade'] })));
  for (const x of runs) assert.deepEqual(x.errors, []);
  const r = {};  // the seeds' tallies summed, cell by cell
  for (const kind of ['repel', 'assault']) { r[kind] = {}; for (const x of runs) for (const [cell, t] of Object.entries(x[kind])) { const acc = r[kind][cell] = r[kind][cell] || {}; for (const [k, v] of Object.entries(t)) acc[k] = (acc[k] || 0) + v; } }
  const won = t => t.won / t.n, BASE = { repel: [0.83, 0.59, 0.4], assault: [0.82, 0.62, 0.34] };
  const dead = t => t.dead / t.n, DEAD = { repel: [0.28, 0.43, 0.57], assault: [0.29, 0.41, 0.56] };  // the lock fight's dead a fight (R42)
  for (const kind of ['repel', 'assault']) {
    const k = r[kind];
    BASE[kind].forEach((was, grade) => {
      const now = won(k[`grade|crew 5 level 2 random grade ${grade}`]);
      assert.ok(Math.abs(now - was) <= 0.1, `${kind} at grade ${grade}: ${now.toFixed(2)} won against the lock fight's ${was}`);
      const died = dead(k[`grade|crew 5 level 2 random grade ${grade}`]);
      assert.ok(Math.abs(died - DEAD[kind][grade]) <= 0.15, `${kind} at grade ${grade}: ${died.toFixed(2)} dead a fight against the lock fight's ${DEAD[kind][grade]}`);
    });
    for (const [group, crew] of kind === 'repel' ? [['policy', 5], ['small crew', 2]] : [['small crew', 2]]) {
      const rnd = won(k[`${group}|crew ${crew} level 2 random grade 0`]);
      const [plan, best] = ['shoot', 'cover', 'order'].map(p => [p, won(k[`${group}|crew ${crew} level 2 ${p} grade 0`])]).sort((a, b) => b[1] - a[1])[0];
      assert.ok(best >= rnd + 0.05, `${kind} with ${crew} crew: ${plan} ${best.toFixed(2)} against random ${rnd.toFixed(2)}`);
    }
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
  const split = moveOrders({ known: ALL, shown: { kind: 'salvo' }, regen: 0.07, heat: 2 });
  assert.equal(split.move, 'split');
  assert.ok(heatOf(split) <= 4, 'two guns at heat 2 on a split turn stay at the cap');
  assert.equal(moveOrders({ known: ALL, shown: { kind: 'hold' }, heat: 3 }).move, undefined, 'heat alone, no gun locked: vent would add no shot')
  assert.equal(moveOrders({ known: ALL, shown: { kind: 'pin' }, lockHp: 7, band: 3, locked: [1] }).move, 'vent', 'vent and lead both apply: vent first');
  assert.equal(moveOrders({ known: ALL, shown: { kind: 'pin' }, lockHp: 7, band: 3, locked: [1], spent: ['vent'] }).move, 'lead', 'a spent vent leaves lead');
  assert.equal(moveOrders({ known: ALL, shown: { kind: 'salvo' }, spent: ['split'] }).move, undefined, 'a spent split is not ordered again');
});
