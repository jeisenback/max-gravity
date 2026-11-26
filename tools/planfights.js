'use strict';

// The deck fight on the deck plan (js/deckplan.js, #1354) over many seeded trials, in plain Node: the tuning tool for PLAN's numbers against the spec's
// targets (docs/superpowers/specs/2026-11-16-boarding-deck-plan-design.md, "How we know it worked"; tests/distribution/deckplanfights.test.js).
// A trial opens the fight as the game would (the party's size by boardersFor, shipcombat.js; ours at their posts, the captain on our bridge repelling),
// plays the hand by a stated policy and our crew by the captain's standing order, and tallies the end, the turns, the hand downed (the scene's hurt
// roll, deckplanui.js), our heads downed (a casualty at DECK.CASUALTY, or DECK.ASSAULT's) and the navy's heads put down.
//   node tools/fights.js --plan [--seeds 1,2,3,4] [--n 400] [--set KEY=value,...]
// Policies: 'random' (each part of the turn drawn from what the hand is offered), 'shoot' (stand and shoot), 'push' (step toward them, and shoot),
// 'fall' (pull back while offered, else shoot), and 'answer' (tools/answer.js answerPlan: reads their drawn move). 'answerNoCharge' is the answer without
// its charge rule, and 'flat' the answer played on decks with every spot's cover made the same (the rooms-matter check).

const { load } = require('../tests/nodecontext');

const R = load(['js/sheet.js', 'js/camera.js', 'js/layouts.js', 'js/shipcombat.js', 'js/fight.js', 'js/radar.js', 'js/handtohand.js', 'js/deckplan.js'], { REPEL_HURT: { lose: 0.45 } },
  ['PLAN', 'DECK', 'LAYOUTS', 'RADAR', 'planFight', 'planTheirMove', 'planCaptain', 'planCrewMoves', 'planChoices', 'planTurn', 'planEnd', 'planUp', 'planAt', 'planHeld', 'planOdds', 'spotLinks', 'spotPath', 'spotHatch', 'deckSpot', 'deckSpots', 'inLine', 'planSuggestOdds']);
const { answerPlan } = require('./answer');

const mulberry = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const FOE_CREW = { raider: 2, corsair: 3, navy: 4 };  // duel.js FOE_CREW by the party's hull (a navy party is a cutter's)
// As the game boards: a raider grapples, a full run; a corsair and the navy fight with guns or torpedoes, a half run (fightui.js fightBoarded). Boarding her, all her crew is aboard.
const boarders = (party, assault, grade) => FOE_CREW[party] + (assault ? R.DECK.ASSAULT.FULL - (party === 'corsair' ? R.DECK.CORSAIR_LESS : 0) : party === 'raider' ? R.DECK.FULL : 0) + 2 * grade;
// Our crew, the posts first (their orders at about the game's odds for a crewmate of level 2), then hands with no post.
const CREW = [{ id: 'pilot', post: 'pilot' }, { id: 'engineer', post: 'engineer' }, { id: 'comms', post: 'comms' }, { id: 'bosun', post: 'bosun' }, { id: 'deck', post: 'deck' }];
const crewOf = n => CREW.slice(0, n).map(c => ({ ...c, name: c.id, level: 2, odds: ['pilot', 'engineer', 'comms'].includes(c.post) ? { steady: 0.7, cover: 0.8 } : null }));
const handOf = level => ({ level, post: 'gunner', odds: { steady: 0.45 + 0.05 * level, cover: 0.6 + 0.05 * level } });  // about abilityOdds at each level

const pick = (list, rand) => list[Math.floor(rand() * list.length)];
const bestShot = acts => (acts[0].targets || []).slice().sort((a, b) => b.odds - a.odds)[0];
const shootOr = (acts, kind = 'holdfire') => { const t = bestShot(acts); return t ? { kind: 'shoot', at: t.at } : { kind }; };
// A step toward the nearest of them, among the hand's moves.
function towardThem(st, moves) {
  const hand = st.figures.find(f => f.hand), foes = [...new Set(R.planUp(st, 'them').map(f => f.spot))];
  const r = foes.length && R.spotPath(st.lay, hand.spot, foes, st.sealed);
  return r && r.next && moves.includes(r.next) ? r.next : null;
}
const POLICY = {
  random: (st, shown, rand) => {
    const c = R.planChoices(st), move = pick([null, ...c.moves], rand), cm = R.planChoices(st, move), acts = cm.acts.filter(a => a.kind !== 'pullback' || !move);
    const a = pick(acts, rand), act = a.kind === 'shoot' ? (a.targets.length ? { kind: 'shoot', at: pick(a.targets, rand).at } : { kind: 'holdfire' }) : { kind: a.kind };
    const o = pick([null, ...c.orders.filter(x => !['seal', 'open', 'move'].includes(x.kind))], rand);
    return { move, act, order: o && { id: o.id, kind: o.kind } };
  },
  shoot: st => ({ move: null, act: shootOr(R.planChoices(st).acts), order: null }),
  push: st => { const c = R.planChoices(st), move = towardThem(st, c.moves); return { move, act: shootOr(R.planChoices(st, move).acts), order: null }; },
  fall: st => { const c = R.planChoices(st); return { move: null, act: c.acts.some(a => a.kind === 'pullback') ? { kind: 'pullback' } : shootOr(c.acts), order: null }; },
  answer: (st, shown) => answerPlan(R, st, shown),
  answerNoCharge: (st, shown) => answerPlan(R, st, shown, { charge: false }),
  flat: (st, shown) => answerPlan(R, st, shown),
};

// One fight to its end. Returns its tallies.
function planOne({ party, assault, crew, level, policy, grade, rand, nerve = 0.5 }) {
  const lay0 = assault ? R.LAYOUTS[party === 'navy' ? 'raider' : party] : R.LAYOUTS.freighter;
  const lay = policy === 'flat' ? { ...lay0, spots: lay0.spots.map(p => ({ ...p, cover: 1 })) } : lay0;  // every spot's cover the same
  let st = R.planFight({ lay, crew: crewOf(crew), hand: handOf(level), captain: assault ? null : { name: 'Hester' }, party, boarders: boarders(party, assault, grade), grade, assault });
  const t = { n: 1, won: 0, taken: 0, searched: 0, rounds: 0, hurt: 0, downed: 0, casualties: 0, navyDown: 0, capped: 0 };
  const rule = assault ? R.DECK.ASSAULT : R.DECK;
  for (let end = null; !end;) {
    const theirs = R.planTheirMove(st, rand), intent = R.planCaptain(st, nerve), pick0 = POLICY[policy](st, { theirs, intent }, rand);
    const ours = R.planCrewMoves(st, pick0.intent || intent, pick0.order);
    const r = R.planTurn(st, pick0, { theirs, ours }, rand);
    st = r.state; end = r.end; t.rounds++;
    if (r.events.some(e => e.kind === 'down' && e.id === 'hand')) t.hurt++;  // the hand downed: the scene's hurt roll (deckplanui.js)
    for (const e of r.events) if (e.kind === 'down' && e.side === 'us' && !e.captain) { t.downed++; if (rand() < rule.CASUALTY) t.casualties++; }
  }
  const end = R.planEnd(st);
  t[end === 'won' ? 'won' : end] = 1; t.navyDown = st.navyDown || 0;
  if (st.turn >= (party === 'navy' && !assault ? R.PLAN.NAVY_TURNS : R.PLAN.TURNS)) t.capped = 1;
  return t;
}

// One seed's trials over the cells asked: { [cell]: tallies }, a cell 'kind party crew level policy grade'.
function planFights({ seed = 1, n = 100, cells }) {
  const out = {};
  cells.forEach((c, i) => {
    const rand = mulberry(seed * 1000 + i), key = `${c.assault ? 'assault' : 'repel'} ${c.party} crew ${c.crew} level ${c.level} ${c.policy} grade ${c.grade}`, acc = out[key] = {};
    for (let k = 0; k < n; k++) for (const [f, v] of Object.entries(planOne({ ...c, rand }))) acc[f] = (acc[f] || 0) + v;
  });
  return out;
}
// The cells the targets read: each party both ways (the navy only repelled), two crew and five, at level 2 and grade 0, by every policy; the level cells
// (two crew, raiders repelled, levels 1 and 3); and the grade cells (random play, five crew, grades 0 to 2).
function planCells() {
  const cells = [];
  for (const party of ['raider', 'corsair', 'navy']) for (const assault of party === 'navy' ? [false] : [false, true]) for (const crew of [2, 5])
    for (const policy of Object.keys(POLICY)) cells.push({ party, assault, crew, level: 2, policy, grade: 0 });
  for (const level of [1, 3]) cells.push({ party: 'raider', assault: false, crew: 2, level, policy: 'answer', grade: 0 });
  return cells;
}
const sumRuns = runs => { const r = {}; for (const x of runs) for (const [k, t] of Object.entries(x)) { const a = r[k] = r[k] || {}; for (const [f, v] of Object.entries(t)) a[f] = (a[f] || 0) + v; } return r; };
function planReport(r) {
  const f2 = x => x.toFixed(2);
  for (const [k, t] of Object.entries(r)) console.log(`${k.padEnd(52)} won ${f2(t.won / t.n)} turns ${f2(t.rounds / t.n)} hurt ${f2(t.hurt / t.n)} lost ${f2(t.casualties / t.n)}${t.navyDown ? ` standing ${f2(2 * t.navyDown / t.n)}` : ''} capped ${f2(t.capped / t.n)}`);
}

module.exports = { R, planOne, planFights, planCells, sumRuns, planReport, POLICY };
