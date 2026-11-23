'use strict';

// The deck fights' targets, over many seeded trials of tools/fights.js, by the party that comes aboard (COMBAT.md). The ship fight is on the radar since
// #1348, and its targets are tests/distribution/radarfights.test.js. Many-seed checks, so they are in the soak (npm run soak, nightly on main) and not in npm test (#753, the owner's
// choice, 2026-10-28): run them by hand when a change touches the fights, as CLAUDE.md says. The tool's quick check stays in
// tests/fights.test.js.
//
// Profiles:  none: the fight tool (tools/fights.js) and chapter two's soak (tools/soaktwo.js) use no soak player (tools/soak.js SOAK_PROFILES, #1199).

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { closeBrowser } = require('../helpers');
const { fights } = require('../../tools/fights');
const { load } = require('../nodecontext');

after(closeBrowser);
const DECK_N = 400, DECK_SEEDS = [1, 2, 3, 4];  // deck fights a cell in the deck test, on each of four seeds played side by side (1,600 a cell: the margins of #832)

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
// Only the groups asked are played (each cell on its own seeded stream); the corsair's checks, on the same runs, are the test after this one.
let deckRuns = null;  // the deck fights, played once for the raider's test and the corsair's
const deckFights = async () => {
  const runs = await (deckRuns = deckRuns || Promise.all(DECK_SEEDS.map(seed => fights({ seed, n: DECK_N, groups: ['party', 'level', 'grade', 'charge', 'navy'] }))));
  for (const x of runs) assert.deepEqual(x.errors, []);
  const r = {};  // the seeds' tallies summed, cell by cell
  for (const kind of ['repel', 'assault']) { r[kind] = {}; for (const x of runs) for (const [cell, t] of Object.entries(x[kind])) { const acc = r[kind][cell] = r[kind][cell] || {}; for (const [k, v] of Object.entries(t)) acc[k] = (acc[k] || 0) + v; } }
  return r;
};
const won = t => t.won / t.n, turns = t => t.rounds / t.n, dead = t => t.dead / t.n, f2 = x => x.toFixed(2);
// Dead a fight by her grade. They were 0.32, 0.44, 0.49 and 0.36, 0.49, 0.55 before the parties (the spec's "Why"), with no medic among the five crew; since
// #879 the five are the bosun's ship, and his first aid (crew.js roleHolder) takes the loss odds from 1.3 to 0.5 (losses.js), so they are measured again
// (tools/fights.js --seeds 1,2,3 --n 400, the owner, 2026-11-01).
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

// Chapter two (#891): the raids the co-op's Ore Runner meets on 60 days of the board's contracts (tools/soaktwo.js), what they cost the hull, and who is lost.
// Sample: 6 seeds. Measured 2026-11-07 over 8 seeds: 0 to 3 raids a seed (about 0.3 a run), 0 to 297 hull lost (the Ore Runner has 100), nobody lost and no
// hand killed. The bands were accepted by the owner as measured (2026-11-07, #891).
test('chapter two: the co-op meets raids on the board\'s runs, and they cost the hull without ending every run', async () => {
  const { soaksTwo } = require('../../tools/soaktwo');
  const rs = await soaksTwo([1, 2, 3, 4, 5, 6], { days: 60 }, 3);
  const runs = rs.reduce((t, r) => t + r.runs, 0), raids = rs.reduce((t, r) => t + r.raids, 0), ended = rs.filter(r => r.ending).length;
  for (const r of rs) { assert.deepEqual(r.bad, [], `seed ${r.seed}`); assert.deepEqual(r.errors, [], `seed ${r.seed}`); }
  assert.ok(raids / runs <= 1, `${raids} raids in ${runs} runs`);  // accepted by the owner (#891)
  assert.ok(ended <= rs.length / 2, `${ended} of ${rs.length} runs ended early`);  // accepted by the owner (#891)
  console.log(`chapter two fights: ${rs.map(r => `${r.seed}:${r.raids} raids ${r.hull} hull${r.ending ? ` ${r.ending}` : ''}`).join(', ')}`);
});
