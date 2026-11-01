'use strict';

// The fights' targets, over many seeded trials of tools/fights.js: the ship fight by the type she is, with the gunner moves and without, and the deck fight
// by the party that comes aboard (COMBAT.md). Many-seed checks, so they are in the soak (npm run soak, nightly on main) and not in npm test (#753, the owner's
// choice, 2026-10-28): run them by hand when a change touches the fights, as CLAUDE.md says. The tool's quick check and the answer's own rules stay in
// tests/fights.test.js.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { closeBrowser } = require('../helpers');
const { fights } = require('../../tools/fights');
const { load } = require('../nodecontext');

after(closeBrowser);
const DECK_N = 400, DECK_SEEDS = [1, 2, 3, 4];  // deck fights a cell in the deck test, on each of four seeds played side by side (1,600 a cell: the margins of #832)

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
let shipRuns = null;  // the ship fights without the moves, played once for the two tests that read them
const shipFights = () => (shipRuns = shipRuns || Promise.all(SHIP_SEEDS.map(seed => fights({ seed, n: SHIP_N, lock: false }))));
const byMatch = runs => {  // the seeds' rows by policy and type, summed
  const m = {};
  for (const x of runs) for (const [k, t] of Object.entries(x.match)) { const acc = m[k] = m[k] || {}; for (const [f, v] of Object.entries(t)) acc[f] = (acc[f] || 0) + v; }
  return m;
};
test('no fixed aim wins against every type of ship and the best one differs by type, reading her move is never beaten, hull fire alone loses to a raider pair\'s board, random play loses a quarter of its fights and real hull, and a fight lasts five to eight turns and mostly ends before the cap', async () => {
  const runs = await shipFights();
  for (const x of runs) assert.deepEqual(x.errors, []);
  const m = byMatch(runs);
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

// A navy destroyer (three patrol stops in ten, met only by a ship hostile with that navy) is a ship to heave to for, not to fight (the owner, 2026-10-28, #833):
// against her no policy, the answer among them, has more than 10% good ends (random play, the best of them, has 3% to 5%), and the answer, which fights her to the cap until the captain runs, loses a
// third of the hull or more a fight. Heaving to at the contact is the way out (engage.js), and it lifts the standing back above the line that sends the patrols.
test('a navy destroyer is not beaten by any plan, and fighting her costs the hull: she is a ship to heave to for', async () => {
  const m = byMatch(await shipFights());
  for (const p of ['random', 'focus', 'drive', 'lock', 'hull', 'hullhold', 'answer']) {
    const t = m[`${p}|destroyer`];
    assert.ok(t && t.n >= 80, `${p} against a destroyer: ${t ? t.n : 0} fights`);
    assert.ok(t.good / t.n <= 0.1, `${p} against a destroyer: ${(t.good / t.n).toFixed(2)} good ends`);
  }
  const ans = m['answer|destroyer'];
  assert.ok(ans.hull / ans.n >= 1 / 3, `answer against a destroyer loses ${(100 * ans.hull / ans.n).toFixed(1)}% of the hull a fight`);
});

// The gunner moves (docs/superpowers/specs/2026-10-23-gunner-moves-design.md, section 4), the same fights with all three known (moves: true), beside the ones
// above without them; the figures in brackets are at five seeds of 200 (COMBAT.md):
// - a move is worth having: answer, which reads her move, does better with them against the type each answers. Split against a corsair: good ends are 100%
//   either way, so it is the turns (7.42 to 6.18) and the turn cap (5% to 0%). Lead against a raider pair: good ends (94% to 98%) and the hull lost (7.0% to 2.3%).
//   Vent against a cutter: the move rule runs every gun hot while it can vent, so she is crippled rather than broken off (1% to 75% of the ends; 5.32 to 4.88 turns);
// - a move is a choice, not a free win: no other policy with the moves has more good ends than answer against any type, among them two that use the moves
//   without reading her move for it, randmove (random aims and a random usable move: 36% good over every type) and eager (the first usable move at
//   its first chance: 1%); and random play with the moves still loses a quarter of its fights or more (randmove 44%).
test('with the moves, each helps against its type, no fixed plan beats reading her move, and random play still loses a quarter', async () => {
  const [plain, runs] = await Promise.all([shipFights(), Promise.all(SHIP_SEEDS.map(seed => fights({ seed, n: SHIP_N, lock: false, moves: true })))]);
  for (const x of runs) assert.deepEqual(x.errors, []);
  const was = byMatch(plain), m = byMatch(runs), TYPES = ['raider', 'corsair', 'cutter', 'raider pair'];
  const good = t => t.good / t.n, turns = t => t.rounds / t.n, hull = t => t.hull / t.n, cap = t => t.atCap / t.n;
  const over = (rows, p) => { const all = {}; for (const type of TYPES) for (const [f, v] of Object.entries(rows[`${p}|${type}`])) all[f] = (all[f] || 0) + v; return all; };
  const f2 = x => x.toFixed(2);
  const [c0, c1] = [was, m].map(r => r['answer|corsair']), [p0, p1] = [was, m].map(r => r['answer|raider pair']);
  assert.ok(good(c1) >= good(c0) && turns(c1) < turns(c0) && cap(c1) <= cap(c0), `split against a corsair: good ${f2(good(c0))} to ${f2(good(c1))}, turns ${f2(turns(c0))} to ${f2(turns(c1))}, at cap ${f2(cap(c0))} to ${f2(cap(c1))}`);
  assert.ok(good(p1) >= good(p0) && hull(p1) < hull(p0), `lead against a raider pair: good ${f2(good(p0))} to ${f2(good(p1))}, hull ${f2(hull(p0))} to ${f2(hull(p1))}`);
  const [k0, k1] = [was, m].map(r => r['answer|cutter']), crip = t => (t.crippled || 0) / t.n;
  assert.ok(good(k1) >= good(k0) && crip(k1) >= crip(k0) + 0.3, `vent against a cutter: good ${f2(good(k0))} to ${f2(good(k1))}, crippled ${f2(crip(k0))} to ${f2(crip(k1))}`);
  const a0 = over(was, 'answer'), a1 = over(m, 'answer');
  assert.ok(good(a1) >= good(a0) && hull(a1) < hull(a0), `over every type: answer good ${f2(good(a0))} to ${f2(good(a1))}, hull ${f2(hull(a0))} to ${f2(hull(a1))}`);
  const others = [...new Set(Object.keys(m).map(k => k.split('|')[0]))].filter(p => p !== 'answer');
  for (const p of ['randmove', 'eager']) assert.ok(others.includes(p), `the ${p} policy is played`);
  for (const type of TYPES) for (const p of others) assert.ok(good(m[`${p}|${type}`]) <= good(m[`answer|${type}`]), `against a ${type} with the moves: ${p} ${f2(good(m[`${p}|${type}`]))}, answer ${f2(good(m[`answer|${type}`]))}`);
  const rnd = over(m, 'randmove');
  assert.ok(rnd.lostFight / rnd.n >= 0.25, `random play with the moves loses ${f2(rnd.lostFight / rnd.n)} of its fights`);
});

// The deck fight both ways, against a raider party (docs/superpowers/specs/2026-10-24-deck-fight-rework-design.md, Section 3, and the owner's ruling on the
// assault, 2026-10-24: boarding her is a short, risky push; the corsair's and the navy's targets come with their signatures), on four seeds of 400 played side
// by side, at level 2. Repelling them, with two crew and with five:
// - the answer (tools/answer.js answerDeck: meet the rush or hatch it, else go where the fight is, shoot and order) wins at least 90%, and no fixed policy
//   (random, shoot, cover, order) wins more than it (with five crew, by more than 0.02);
// - its fights last 3.5 to 6.5 turns on the mean (the spec's 4 to 6, with a margin for the sample);
// - with two crew, the answer at level 3 wins ten points or more over level 1 (the sidearm by level);
// - random play with five crew costs about as many dead a fight by her grade as measured with the bosun's first aid aboard (#879): within 0.15 of 0.16, 0.18 and 0.21.
// Boarding her:
// - with two crew the answer wins more than every fixed policy, and at least 60%; with five it wins at least 90%, and no fixed policy wins more (with five crew, by more than 0.02);
// - its fights last 2.5 turns or more on the mean;
// - random play with five crew costs at most 0.15 a fight more dead by her grade than measured with the bosun's first aid aboard (0.15, 0.21 and 0.21, #879): fewer is allowed.
// The ship fights are left out (raid: false), and only the groups asked are played (each cell on its own seeded stream); the corsair's checks, on the same runs, are the test after this one.
let deckRuns = null;  // the deck fights, played once for the raider's test and the corsair's
const deckFights = async () => {
  const runs = await (deckRuns = deckRuns || Promise.all(DECK_SEEDS.map(seed => fights({ seed, n: DECK_N, raid: false, groups: ['party', 'level', 'grade', 'charge', 'navy'] }))));
  for (const x of runs) assert.deepEqual(x.errors, []);
  const r = {};  // the seeds' tallies summed, cell by cell
  for (const kind of ['repel', 'assault']) { r[kind] = {}; for (const x of runs) for (const [cell, t] of Object.entries(x[kind])) { const acc = r[kind][cell] = r[kind][cell] || {}; for (const [k, v] of Object.entries(t)) acc[k] = (acc[k] || 0) + v; } }
  return r;
};
const won = t => t.won / t.n, turns = t => t.rounds / t.n, dead = t => t.dead / t.n, f2 = x => x.toFixed(2);
// Dead a fight by her grade. They were 0.32, 0.44, 0.49 and 0.36, 0.49, 0.55 before the parties (the spec's "Why"), with no medic among the five crew; since
// #879 the five are the bosun's ship, and his first aid (crew.js roleHolder) takes the loss odds from 1.3 to 0.5 (losses.js), so they are measured again
// (tools/fights.js --seeds 1,2,3 --n 400 --deck-only, the owner, 2026-11-01).
const DEAD = { repel: [0.16, 0.18, 0.21], assault: [0.15, 0.21, 0.21] };
const CORSAIR_REPEL_DEAD = 0.18;  // random play repelling a corsair with five crew (#832: 0.40 with no medic; 0.16 to 0.20 with the bosun's first aid, #879)
// The checks both parties share, at level 2, with two crew and with five: the answer's least wins, no fixed policy above it, and its turns.
function deckChecks(k, kind, party) {
  const cell = (crew, policy) => k[`party|${party} crew ${crew} level 2 ${policy} grade 0`];
  for (const crew of [2, 5]) {
    const ans = won(cell(crew, 'answer')), t = turns(cell(crew, 'answer')), least = kind === 'assault' && crew === 2 ? 0.6 : 0.9;
    assert.ok(ans >= least, `${party}, ${kind} with ${crew} crew: answer wins ${f2(ans)}`);
    for (const p of ['random', 'shoot', 'cover', 'order']) {
      const w = won(cell(crew, p));
      // with five crew a fixed policy may come within 0.02 of answer: about 3 standard errors of the difference at n = 1,600 and p near 0.97;
      // so may one repelling a corsair with two crew, where every plan that goes where the fight is shoots her charge's setter without reading it
      const margin = crew === 5 || (party === 'corsair' && kind === 'repel');
      assert.ok(margin ? w <= ans + 0.02 : kind === 'assault' ? w < ans : w <= ans, `${party}, ${kind} with ${crew} crew: ${p} ${f2(w)}, answer ${f2(ans)}`);
    }
    const floor = kind === 'assault' || party === 'corsair' ? 2.5 : 3.5;  // repelling a corsair is a cost, as boarding her is: her half run of three ends in about three turns (the owner, 2026-10-27)
    assert.ok(t >= floor && (kind === 'assault' || t <= 6.5), `${party}, ${kind} with ${crew} crew: answer's fights last ${f2(t)} turns`);
  }
}
test('against raiders the answer wins a repel nine in ten in four to six turns and the level counts, boarding her is a short risky push it wins, and no fixed plan beats it', async () => {
  const r = await deckFights();
  for (const kind of ['repel', 'assault']) {
    const k = r[kind], cell = (group, crew, level, policy, grade = 0) => k[`${group}|raider crew ${crew} level ${level} ${policy} grade ${grade}`];
    deckChecks(k, kind, 'raider');
    if (kind === 'repel') {
      const [l1, l3] = [1, 3].map(l => won(cell('level', 2, l, 'answer')));
      assert.ok(l3 >= l1 + 0.1, `${kind} with two crew: answer wins ${f2(l3)} at level 3, ${f2(l1)} at level 1`);
    }
    DEAD[kind].forEach((was, grade) => {
      const now = dead(cell('grade', 5, 2, 'random', grade));
      assert.ok(kind === 'assault' ? now <= was + 0.15 : Math.abs(now - was) <= 0.15, `${kind} at grade ${grade}: ${f2(now)} dead a fight against ${was} before`);
    });
  }
});

// The corsair's party (Task 5: her breaching charge, stopped by hitting its setter, and the pull back), on the same runs and the same rules as the raider's
// above, repelling her at a half run as the game does (she fights with torpedoes, fightui.js fightBoarded), at level 2, with two crew and with five: the
// answer's least wins, no fixed policy above it (with five crew, and repelling with two, by more than 0.02) and its turns, as above but 2.5 turns or more
// repelling her too; random play with five crew at grade 0 (the grade checked; the tool reports grade 2, her setpiece, unchecked) costs dead a fight within 0.15 of 0.40 repelling
// and at most 0.15 over 0.36 boarding her; boarding her with two crew, going to them and shooting (`shoot`), which stands in the charge, wins less than the
// answer (not checked repelling her, where her charge is a cost, not a puzzle, and shoot against answer is a strict check on noise: the 0.02 margin above holds
// it); and boarding her with two crew, the answer wins at least 0.2 more than the answer without its charge rule (`answerNoCharge`).
test('against a corsair\'s charge the answer wins a repel nine in ten and boarding her, no fixed plan beats it, and boarding her the charge is the puzzle', async () => {
  const r = await deckFights();
  for (const kind of ['repel', 'assault']) {
    const k = r[kind], cell = (crew, policy) => k[`party|corsair crew ${crew} level 2 ${policy} grade 0`];
    deckChecks(k, kind, 'corsair');
    // repelling a corsair is the cost of her charge, not a puzzle: above the raider repel's grade-0 baseline (DEAD.repel[0]), at the 0.39 to 0.40 measured with no medic (0.16 to 0.20 with the bosun's first aid, #879)
    // in two runs of 1,600 fights after the pull back (the owner, 2026-10-28, #832; it was 0.32 + 0.2, which sat a standard error over its floor)
    const now = dead(cell(5, 'random')), was = kind === 'repel' ? CORSAIR_REPEL_DEAD : DEAD.assault[0];
    assert.ok(kind === 'assault' ? now <= was + 0.15 : Math.abs(now - was) <= 0.15, `corsair, ${kind}: ${f2(now)} dead a fight against ${f2(was)}`);
    if (kind === 'assault') assert.ok(won(cell(2, 'shoot')) < won(cell(2, 'answer')), `corsair, ${kind} with two crew: shoot ${f2(won(cell(2, 'shoot')))}, answer ${f2(won(cell(2, 'answer')))}`);
  }
  const ans = won(r.assault['party|corsair crew 2 level 2 answer grade 0']), not = won(r.assault['charge|corsair crew 2 level 2 answerNoCharge grade 0']);
  assert.ok(ans >= not + 0.2, `boarding a corsair with two crew: answer ${f2(ans)}, without its charge rule ${f2(not)}`);
});

// The navy's party (Task 6: each head of theirs put down costs standing, and holding our bridge is a search), started as the game starts it (from a patrol's
// ship fight, fightui.js fightBoarded: a half run), repelling at level 2 with two crew and with five: the answer wins at least 90% (a win is repelled, or
// held to their cap, DECK.NAVY_TURNS, when an inspection party withdraws; a search is not), costs at most half the standing going to them and shooting does, and less than random play does, and holds them to that cap, which sits in the spec's 4 to 6 turns;
// random play with five crew costs dead a fight within 0.15 of the raider repel's grade-0 baseline (DEAD.repel[0]).
const { DECK } = load(['js/data.js', 'js/range.js', 'js/sheet.js', 'js/handtohand.js', 'js/boarders.js', 'js/shipcombat.js', 'js/fight.js'], { Mods: { register() {} } }, ['DECK']);  // the cap, as tests/fight.test.js loads it
test('the navy party\'s cap sits in the spec\'s 4 to 6 turns', () => assert.ok(DECK.NAVY_TURNS >= 4 && DECK.NAVY_TURNS <= 6, `DECK.NAVY_TURNS is ${DECK.NAVY_TURNS}`));
test('against the navy\'s party the answer holds them at half the standing shooting costs, wins nine in ten, and random play costs more', async () => {
  const r = await deckFights();
  const cell = (crew, policy) => r.repel[`navy|navy crew ${crew} level 2 ${policy} grade 0`], st = t => t.standing / t.n;
  for (const crew of [2, 5]) {
    const ans = cell(crew, 'answer');
    assert.ok(ans && ans.n >= 200, `navy with ${crew} crew: ${ans ? ans.n : 0} fights`);
    assert.ok(won(ans) >= 0.9, `navy with ${crew} crew: answer wins ${f2(won(ans))}`);
    assert.ok(st(ans) <= 0.5 * st(cell(crew, 'shoot')), `navy with ${crew} crew: answer costs ${f2(st(ans))} standing a fight, shoot ${f2(st(cell(crew, 'shoot')))}`);
    assert.ok(st(cell(crew, 'random')) > st(ans), `navy with ${crew} crew: random costs ${f2(st(cell(crew, 'random')))}, answer ${f2(st(ans))}`);
    // the answer wins by holding: its fights last the cap, every one (#832: a range check passed by construction)
    assert.equal(turns(ans), DECK.NAVY_TURNS, `navy with ${crew} crew: answer's fights last ${f2(turns(ans))} turns`);
  }
  // the answer always holds to the cap, and the citation stands (#828): letting a patrol board costs the heave-to's fine, a quarter of the purse
  for (const crew of [2, 5]) { const ans = cell(crew, 'answer'); assert.ok(ans.fined >= 0.9 * ans.quarter, `navy with ${crew} crew: answer is fined ${f2(ans.fined / ans.n)} cr a fight, a quarter-purse is ${f2(ans.quarter / ans.n)}`); }
  const d = dead(cell(5, 'random'));
  assert.ok(Math.abs(d - DEAD.repel[0]) <= 0.15, `navy, random with five crew: ${f2(d)} dead a fight against ${DEAD.repel[0]}`);
});

// Over the three parties (the spec's Section 3), at level 2 and grade 0, both ways where a party comes both ways: no fixed policy (random, shoot, cover, order) wins
// 70% or more of its fights against every party (a party's fights pooled), with two crew (the owner's ruling, 2026-10-27: with five, shoot, cover and order
// each win nine in ten against every party, so the five-crew rows are reported here and not checked); and random play loses 25% or more of all its fights,
// with two crew and five. The corsair's repel stays in it: it is a cost (the owner's earlier ruling), and every policy wins it, but with two crew no fixed
// policy wins boarding her, nor against the raider.
test('no fixed plan wins seven in ten against every party with two crew, and random play loses a quarter of its fights', async t => {
  const r = await deckFights();
  const pool = (party, policy, crews) => { const all = { n: 0, won: 0 }; for (const kind of ['repel', 'assault']) for (const crew of crews) { const c = r[kind][`${party === 'navy' ? 'navy' : 'party'}|${party} crew ${crew} level 2 ${policy} grade 0`]; if (c) { all.n += c.n; all.won += c.won; } } return all; };
  const PARTIES = ['raider', 'corsair', 'navy'];
  for (const p of ['random', 'shoot', 'cover', 'order']) {
    const by = PARTIES.map(party => won(pool(party, p, [2])));
    assert.ok(by.some(w => w < 0.7), `with two crew ${p} wins ${by.map(f2).join(', ')} against the raider, the corsair and the navy`);
    t.diagnostic(`with five crew ${p} wins ${PARTIES.map(party => f2(won(pool(party, p, [5])))).join(', ')} against the raider, the corsair and the navy (not checked)`);
  }
  const rnd = PARTIES.map(party => pool(party, 'random', [2, 5])).reduce((a, c) => ({ n: a.n + c.n, won: a.won + c.won }), { n: 0, won: 0 });
  assert.ok(1 - won(rnd) >= 0.25, `random play loses ${f2(1 - won(rnd))} of its fights`);
});
