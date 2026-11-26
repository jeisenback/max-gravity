'use strict';

// The deck fight on the deck plan's targets (docs/superpowers/specs/2026-11-16-boarding-deck-plan-design.md, "How we know it worked"; plan Part 4, #1354),
// over the trials of tools/planfights.js: the rules (js/deckplan.js) played in plain Node, our crew by the captain's order, the hand by a policy (random,
// shoot, push, fall, and answer, which reads their drawn move: tools/answer.js answerPlan). Many-seed checks, so they are in the soak (npm run soak) and not
// in npm test. The targets are the strip's (tests/distribution/fights.test.js) as the owner ruled them for this fight on 2026-11-26 (#1354):
// - two crew are fewer than the strip's numbers assumed: the answer's two-crew wins are checked at what is measured, and two crew boarding a raider's
//   seven, which no plan wins, is not checked (the owner: too few to board);
// - the hand's shot stays a roll, so the hand's level counting is not checked (reported);
// - reading a corsair's charge boarding her, and the rooms' cover, are checked only to hold at least as measured (#1390).
// Measured over seeds 1 to 4 of 400 (1,600 fights a cell), 2026-11-26: the numbers in each check's message, and COMBAT.md's table.
//
// Profiles:  none: the deck-plan fight tool (tools/planfights.js) uses no soak player (tools/soak.js SOAK_PROFILES, #1199).

const { test } = require('node:test');
const assert = require('node:assert/strict');
const P = require('../../tools/planfights');

const SEEDS = [1, 2, 3, 4], N = 400;
const r = P.sumRuns(SEEDS.map(seed => P.planFights({ seed, n: N, cells: P.planCells() })));
const cell = (kind, party, crew, policy, level = 2) => r[`${kind} ${party} crew ${crew} level ${level} ${policy} grade 0`];
const won = t => t.won / t.n, per = (t, k) => t[k] / t.n, f2 = x => x.toFixed(2);
const FIXED = ['random', 'shoot', 'push', 'fall'];

// The answer's least wins, and no fixed plan above it: with five crew by no more than 0.02 (about three standard errors near 0.97 at n = 1,600, as on the strip).
function answerBeats(kind, party, crew, least) {
  const ans = won(cell(kind, party, crew, 'answer'));
  assert.ok(ans >= least, `${party}, ${kind} with ${crew} crew: answer wins ${f2(ans)}, at least ${least}`);
  for (const p of FIXED) { const w = won(cell(kind, party, crew, p)); assert.ok(crew === 5 ? w <= ans + 0.02 : w < ans, `${party}, ${kind} with ${crew} crew: ${p} ${f2(w)}, answer ${f2(ans)}`); }
}

test('against raiders the answer wins a repel nine in ten with five crew and seven in ten with two, boarding her with five, and no fixed plan beats it', () => {
  answerBeats('repel', 'raider', 5, 0.9);   // measured 1.00
  answerBeats('repel', 'raider', 2, 0.68);  // measured 0.72 (the owner's lowered two-crew target)
  answerBeats('assault', 'raider', 5, 0.88);  // measured 0.91
  const [l1, l3] = [1, 3].map(level => won(cell('repel', 'raider', 2, 'answer', level)));
  console.log(`raiders repelled with two crew: answer wins ${f2(l1)} at level 1, ${f2(l3)} at level 3 (not checked: the hand's shot is a roll, the owner)`);
});

test('against a corsair the answer wins a repel and boarding her with five crew, and with two wins more than any fixed plan', () => {
  answerBeats('repel', 'corsair', 5, 0.9);   // measured 1.00
  answerBeats('repel', 'corsair', 2, 0.9);   // measured 0.99
  answerBeats('assault', 'corsair', 5, 0.9);   // measured 0.93
  answerBeats('assault', 'corsair', 2, 0.45);  // measured 0.50 (the lowered two-crew target)
  const ans = won(cell('assault', 'corsair', 2, 'answer')), not = won(cell('assault', 'corsair', 2, 'answerNoCharge'));
  assert.ok(ans >= not - 0.03, `boarding a corsair with two crew: answer ${f2(ans)}, without its charge rule ${f2(not)} (as measured, #1390)`);
});

test('against the navy the answer wins nine in ten holding them to their cap, costs at most half the standing shooting does, and random play costs more', () => {
  const st = t => 2 * t.navyDown / t.n;
  for (const crew of [2, 5]) {
    const ans = cell('repel', 'navy', crew, 'answer');
    assert.ok(won(ans) >= 0.9, `navy with ${crew} crew: answer wins ${f2(won(ans))}`);
    assert.equal(per(ans, 'rounds'), P.R.PLAN.NAVY_TURNS, `navy with ${crew} crew: answer's fights last ${f2(per(ans, 'rounds'))} turns`);
    assert.ok(st(ans) <= 0.5 * st(cell('repel', 'navy', crew, 'shoot')), `navy with ${crew} crew: answer costs ${f2(st(ans))} standing, shoot ${f2(st(cell('repel', 'navy', crew, 'shoot')))}`);
    assert.ok(st(cell('repel', 'navy', crew, 'random')) > st(ans), `navy with ${crew} crew: random costs ${f2(st(cell('repel', 'navy', crew, 'random')))}, answer ${f2(st(ans))}`);
  }
});

test('no fixed plan wins seven in ten against every party with two crew, and random play loses a quarter of its fights', () => {
  const pool = (party, policy, crews) => {
    const all = { n: 0, won: 0 };
    for (const kind of ['repel', 'assault']) for (const crew of crews) { const c = cell(kind, party, crew, policy); if (c) { all.n += c.n; all.won += c.won; } }
    return all;
  };
  for (const p of FIXED) {
    const by = ['raider', 'corsair', 'navy'].map(party => won(pool(party, p, [2])));
    assert.ok(by.some(w => w < 0.7), `with two crew ${p} wins ${by.map(f2).join(', ')} against the raider, the corsair and the navy`);
  }
  const rnd = ['raider', 'corsair', 'navy'].map(party => pool(party, 'random', [2, 5])).reduce((a, c) => ({ n: a.n + c.n, won: a.won + c.won }), { n: 0, won: 0 });
  assert.ok(1 - won(rnd) >= 0.25, `random play loses ${f2(1 - won(rnd))} of its fights`);
});

test('the rooms hold at least as measured: the answer on the decks does no worse than on decks of equal cover (#1390)', () => {
  for (const [kind, party, crew] of [['repel', 'raider', 2], ['assault', 'corsair', 2], ['assault', 'raider', 5]]) {
    const ans = won(cell(kind, party, crew, 'answer')), flat = won(cell(kind, party, crew, 'flat'));
    assert.ok(ans >= flat - 0.03, `${party}, ${kind} with ${crew} crew: answer ${f2(ans)}, on equal cover ${f2(flat)}`);
  }
});

test('repelling, the answer keeps the hand standing and the crew\'s losses near the strip\'s', () => {
  for (const [party, crew] of [['raider', 2], ['raider', 5], ['corsair', 2], ['corsair', 5]]) {
    const ans = cell('repel', party, crew, 'answer');
    assert.ok(per(ans, 'hurt') <= 0.1, `${party} with ${crew} crew: the hand downed ${f2(per(ans, 'hurt'))} a fight`);  // measured 0.00 to 0.01; the strip's hand was hurt about 0.09
    assert.ok(per(ans, 'casualties') <= 0.5, `${party} with ${crew} crew: ${f2(per(ans, 'casualties'))} casualties a fight`);  // measured 0.12 to 0.45 (the strip's 0.16 to 0.21 with the bosun's first aid)
  }
});
