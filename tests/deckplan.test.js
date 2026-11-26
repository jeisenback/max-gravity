'use strict';

// The deck fight on the deck plan, its rules (js/deckplan.js, #1352): the opening, their move, our side's, a turn and the end, on the
// Ice Hauler's decks and hers (js/layouts.js). In plain Node.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./nodecontext');

const names = ['PLAN', 'LAYOUTS', 'DECK', 'CUNNING', 'RADAR', 'planFight', 'planTheirMove', 'planCaptain', 'planCrewMoves', 'planChoices', 'planSuggestOdds', 'planTurn', 'planEnd', 'planOdds', 'planUp', 'planAt'];
const P = load(['js/sheet.js', 'js/camera.js', 'js/layouts.js', 'js/shipcombat.js', 'js/fight.js', 'js/radar.js', 'js/handtohand.js', 'js/deckplan.js'], { REPEL_HURT: { lose: 0.45 } }, names);
const { PLAN, LAYOUTS, DECK, RADAR, planFight, planTheirMove, planCaptain, planCrewMoves, planChoices, planSuggestOdds, planTurn, planEnd, planOdds, planUp, planAt } = P;
const plain = v => JSON.parse(JSON.stringify(v));  // out of the vm context, so deepEqual compares plain objects

const odds = { steady: 0.5, cover: 0.6 };
const CREW = [
  { id: 'ines', name: 'Ines', level: 2, post: 'pilot', odds }, { id: 'tomas', name: 'Tomas', level: 2, post: 'engineer', odds },
  { id: 'cato', name: 'Cato', level: 3, post: 'bosun', odds },
];
const repel = (over = {}) => planFight({ lay: LAYOUTS.freighter, crew: CREW, hand: { level: 2, post: 'gunner', odds }, captain: { name: 'Hester' }, party: 'raider', boarders: 6, ...over });
// A seeded rand (mulberry32), and one that always returns `x`.
const seeded = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const always = x => () => x;
// A test's own deck: the figures moved where it says (id -> spot), the rest of theirs downed when `only` is set.
function stage(st, where, only = false) {
  for (const f of st.figures) if (f.id in where) f.spot = where[f.id]; else if (only && f.side === 'them') f.hp = 0;
  return st;
}
const spotsOf = (st, side) => planUp(st, side).map(f => f.spot);
const none = { moves: [], shots: [], charge: null, cut: null, seal: null, feint: false };
const quiet = { moves: [], shots: [] };
const hold = { move: null, act: { kind: 'holdfire' }, order: null };

// ---------- the opening ----------
test('a repel opens with half the party at our outer door and ours at their posts', () => {
  const st = repel();
  assert.equal(st.wave, 3, 'the rest is the wave');
  assert.deepEqual(plain(spotsOf(st, 'them')), ['outer', 'outer', 'outer']);
  const at = Object.fromEntries(st.figures.filter(f => f.side === 'us').map(f => [f.id, f.spot]));
  assert.deepEqual(plain(at), { captain: 'helm', hand: 'gunseat', ines: 'helm', tomas: 'reactor', cato: PLAN.REST });
  assert.ok(st.figures.find(f => f.id === 'captain').captain);
  assert.equal(planEnd(st), null);
});
test('a party bigger than a spot crowds outward from the door', () => {
  const st = repel({ boarders: 10 });
  assert.equal(planAt(st, 'outer', 'them').length, PLAN.CAP);
  assert.equal(planUp(st, 'them').length, 5);
  assert.ok(spotsOf(st, 'them').every(s => ['outer', 'inner', 'w4'].includes(s)));
});
test('boarding her, ours open at her outer door and hers stand through her decks above it', () => {
  const lay = LAYOUTS.corsair, st = planFight({ lay, crew: CREW, hand: { level: 2, post: 'gunner', odds }, captain: null, party: 'corsair', boarders: 7, assault: true });
  assert.equal(st.wave, 0);
  assert.ok(!st.figures.some(f => f.captain), 'the captain gives her order from our ship');
  const deckOf = id => LAYOUTS.corsair.spots.concat([{ id: 'w3', deck: 3 }]).find(p => p.id === id).deck;
  assert.ok(spotsOf(st, 'us').every(s => deckOf(s) === 3), 'ours on her lock deck');
  assert.equal(planUp(st, 'them').length, 7);
  assert.ok(spotsOf(st, 'them').every(s => !['outer', 'inner', 'cage', 'shelves', 'w3'].includes(s)), 'hers above her lock deck');
});
test('with no crew standing, the hand and the captain still open it, and it plays and ends (Review Focus 4)', () => {
  let st = planFight({ lay: LAYOUTS.freighter, crew: [], hand: { level: 2, post: 'gunner', odds }, captain: { name: 'Hester' }, party: 'raider', boarders: 4 });
  assert.deepEqual(plain(st.figures.filter(f => f.side === 'us').map(f => f.id)), ['captain', 'hand']);
  const rand = seeded(3);
  let end = null;
  for (let i = 0; i < PLAN.TURNS && !end; i++) ({ state: st, end } = planTurn(st, hold, { theirs: planTheirMove(st, rand), ours: planCrewMoves(st, planCaptain(st, 0.5)) }, rand));
  assert.ok(end, 'it ends by the cap');
});

// ---------- their move ----------
test('a raiders\' rush goes two spots, and the hand standing on the second stops it at the first', () => {
  const st = repel({ boarders: 2 });
  const first = planTheirMove(st, always(0.9));
  assert.deepEqual(plain(first.moves), [{ id: 't1', to: 'w4', rush: true, path: ['inner', 'w4'] }], 'from the outer door through the inner door to the well');
  stage(st, { hand: 'w4' });
  assert.deepEqual(plain(planTheirMove(st, always(0.9)).moves), [{ id: 't1', to: 'inner', rush: false, path: ['inner'] }]);
});
test('the rush goes through a spot held by fewer of ours than half of them, and not one held by more', () => {
  const st = stage(repel({ boarders: 8 }), { cato: 'inner' });
  st.figures.find(f => f.id === 't4').hp = 0;
  assert.ok(planTheirMove(st, always(0.9)).moves.every(m => m.to === 'w4' && m.rush), 'one of ours against three: they go through');
  stage(st, { tomas: 'inner', ines: 'inner' });
  const m = planTheirMove(st, always(0.9));
  assert.equal(m.moves.length, 0, 'three of ours in the doorway: none moves');
  assert.ok(m.shots.length > 0, 'they shoot instead');
});
test('a full spot on the only path stops the rush there, and none passes through or overfills it (Review Focus 2)', () => {
  const st = stage(repel({ boarders: 14 }), { cato: 'w3', tomas: 'w3', ines: 'w3', t1: 'w4', t2: 'w4', t3: 'w4' });
  const m = planTheirMove(st, always(0.9));
  assert.ok(m.moves.every(x => x.to !== 'w3' && x.to !== 'w2'), 'none onto the well spot held by three, nor past it');
  assert.ok(m.moves.every(x => planAt(st, x.to, 'them').length + m.moves.filter(y => y.to === x.to).length <= PLAN.CAP), 'no spot of theirs overfilled');
});
test('a corsair\'s charge is shown a turn ahead from a spot next to the spot of ours with the most heads, and never two turns running', () => {
  const st = stage(repel({ party: 'corsair', boarders: 2 }), { t1: 'w3', cato: 'magazine', hand: 'magazine', tomas: 'bench' }, true);
  const m = planTheirMove(st, always(0.9));
  assert.deepEqual(plain(m.charge), { on: 'magazine', from: 'w3', setter: 't1' });
  assert.equal(m.feint, false, 'a charge is never feinted');
  assert.ok(!m.moves.some(x => x.id === 't1') && !m.shots.some(x => x.id === 't1'), 'the setter only sets it');
  assert.equal(planTheirMove({ ...st, lastCharge: st.turn - 1 }, always(0.9)).charge, null, 'not the turn after one');
  assert.equal(planTheirMove({ ...st, charges: 0 }, always(0.9)).charge, null, 'not once the charges are spent');
});
test('the navy pushes and holds: it never rushes, charges or feints', () => {
  for (let seed = 1; seed <= 40; seed++) {
    const st = repel({ party: 'navy', boarders: 6, grade: 2 }), rand = seeded(seed);
    let s = st;
    for (let i = 0; i < 4; i++) {
      const m = planTheirMove(s, rand);
      assert.ok(!m.charge && !m.feint && !m.moves.some(x => x.rush), `seed ${seed}, turn ${i}`);
      s = planTurn(s, hold, { theirs: m, ours: quiet }, rand).state;
    }
  }
});
test('a veteran\'s push may feint at CUNNING a grade, and at grade 0 never', () => {
  const st = repel({ party: 'corsair', grade: 1 });
  assert.equal(planTheirMove(st, always(P.CUNNING - 0.01)).feint, true);
  assert.equal(planTheirMove(st, always(P.CUNNING + 0.01)).feint, false);
  assert.equal(planTheirMove(repel({ party: 'corsair', grade: 0 }), always(0)).feint, false);
});
test('with every path sealed they cut the hatch on their path (Review Focus 1)', () => {
  const st = stage(repel({ boarders: 2 }), { t1: 'w4' });
  st.sealed = { h3: true };
  const m = planTheirMove(st, always(0.9));
  assert.equal(m.cut, 'h3');
  assert.equal(m.cutter, 't1');
  const far = stage(repel({ boarders: 2 }), { t1: 'outer' });
  far.sealed = { h3: true };
  const n = planTheirMove(far, always(0.9));
  assert.equal(n.cut, null);
  assert.ok(n.moves.length === 1, 'not yet at the hatch: they go to it');
  const { state, events } = planTurn(st, hold, { theirs: m, ours: quiet }, always(0.9));
  assert.ok(events.some(e => e.kind === 'cut' && e.hatch === 'h3'));
  assert.equal(state.sealed.h3, undefined, 'cut in a turn');
});

// ---------- our side ----------
test('pull back is not offered after a move, and seal and open only for the pilot and the engineer', () => {
  const st = repel();
  assert.ok(planChoices(st).acts.some(a => a.kind === 'pullback'));
  assert.ok(!planChoices(st, 'magazine').acts.some(a => a.kind === 'pullback'));
  const seals = planChoices(st).orders.filter(o => o.kind === 'seal' || o.kind === 'open').map(o => o.id);
  assert.deepEqual([...new Set(seals)].sort(), ['ines', 'tomas']);
  assert.ok(!planChoices(st).orders.some(o => o.id === 'captain'), 'the captain is not given orders');
});
test('the hand\'s shots are from the spot the hand steps to, since the hand moves before fire', () => {
  const st = stage(repel({ boarders: 2 }), { hand: 'magazine', t1: 'w2' }, true);
  assert.deepEqual(plain(planChoices(st).acts[0].targets), [], 'from the magazine the well a deck up is out of line');
  const from = planChoices(st, 'w3').acts[0].targets;
  assert.deepEqual(plain(from.map(t => t.at)), ['w2'], 'from the well at the gun deck it is in line, up through the open hatch');
  assert.equal(from[0].odds, planOdds(st, st.figures.find(f => f.hand), 'w3', 'w2', true), 'at a moving shooter\'s odds');
});
test('the hand\'s moves are the linked spots with room and none of theirs', () => {
  const st = stage(repel(), { hand: 'magazine', t1: 'w3' });
  assert.deepEqual(plain(planChoices(st).moves), ['gunseat']);
});
test('the captain falls back when ours are fewer and her nerve is cautious, and pushes when ours are clearly more', () => {
  const st = repel({ boarders: 12 });
  assert.equal(planCaptain(st, 0.3), 'fall');
  assert.equal(planCaptain(st, 0.8), 'hold');
  const few = repel({ boarders: 2 });
  few.wave = 0;
  assert.equal(planCaptain(few, 0.5), 'push');
});
test('boarding her, the captain pushes for her bridge, and pulls back only when ours are under half of hers and her nerve is cautious (#1354)', () => {
  const her = (crew, boarders) => planFight({ lay: LAYOUTS.raider, crew: CREW.slice(0, crew), hand: { level: 2, post: 'gunner', odds }, captain: null, party: 'raider', boarders, assault: true });
  assert.equal(planCaptain(her(3, 7), 0.3), 'push', 'four of ours against seven');
  assert.equal(planCaptain(her(1, 7), 0.3), 'fall', 'two of ours against seven, cautious');
  assert.equal(planCaptain(her(1, 7), 0.8), 'push', 'two against seven, bold');
});
test('a stack of theirs two to one against a spot of ours storms it: one of ours there downed, the rest pushed back a step, the stack in (#1354)', () => {
  const st = stage(repel({ boarders: 6 }), { t1: 'w4', t2: 'w4', t3: 'w4', cato: 'w3' }, false);
  st.wave = 0;
  for (const f of st.figures) if (f.side === 'them' && !['t1', 't2', 't3'].includes(f.id)) f.hp = 0;
  const m = planTheirMove(st, always(0.9));
  assert.deepEqual(plain(m.storm), { from: 'w4', ids: ['t1', 't2', 't3'], on: 'w3' });
  assert.ok(!m.moves.some(x => ['t1', 't2', 't3'].includes(x.id)), 'the stack goes in, and does nothing else');
  const { state, events } = planTurn(st, hold, { theirs: m, ours: quiet }, always(0.9));
  assert.ok(events.some(e => e.kind === 'down' && e.id === 'cato' && e.how === 'storm'));
  assert.deepEqual(plain(['t1', 't2', 't3'].map(id => state.figures.find(f => f.id === id).spot)), ['w3', 'w3', 'w3']);
  const two = stage(repel({ boarders: 6 }), { t1: 'w4', t2: 'w4', t3: 'w4', cato: 'w3', tomas: 'w3' }, false);
  assert.equal(planTheirMove(two, always(0.9)).storm, null, 'three against two is not two to one');
  const navy = stage(repel({ party: 'navy', boarders: 6 }), { t1: 'w4', t2: 'w4', t3: 'w4', cato: 'w3' }, false);
  assert.equal(planTheirMove(navy, always(0.9)).storm, null, 'the navy pushes and holds');
});
test('under a fall-back order our crew step toward the bridge; under hold toward the well a deck above the highest of theirs', () => {
  const st = stage(repel(), { cato: 'bunksM' });
  assert.deepEqual(plain(planCrewMoves(st, 'fall').moves.filter(m => m.id === 'cato')), [{ id: 'cato', to: 'w2' }]);
  assert.deepEqual(plain(planCrewMoves(st, 'hold').moves.filter(m => m.id === 'cato')), [{ id: 'cato', to: 'w2' }], 'theirs at the lock deck: the well at the gun deck, by the berths\' well');
  assert.ok(!planCrewMoves(stage(repel(), { cato: 'w3' }), 'hold').moves.some(m => m.id === 'cato'), 'there already: they stay');
  assert.equal(planCrewMoves(st, 'fall', { id: 'cato', kind: 'hold' }).moves.some(m => m.id === 'cato'), false, 'held by the hand\'s order');
});
test('a suggestion\'s odds rise with level, within the ship fight\'s range', () => {
  const st = repel(), at = l => planSuggestOdds(st, l, 0, 'hold');
  assert.ok(at(0) < at(2) && at(2) < at(5));
  assert.ok(at(0) >= RADAR.SUGGEST[0] && at(5) <= RADAR.SUGGEST[1] + 0.1);
});

// ---------- the turn ----------
test('a first hit wounds and a second downs', () => {
  const st = stage(repel({ boarders: 2 }), { t1: 'magazine', cato: 'gunseat', hand: 'bench' }, true);
  const shot = { ...none, shots: [{ id: 't1', at: 'gunseat' }] };
  const one = planTurn(st, hold, { theirs: shot, ours: quiet }, always(0));
  assert.ok(one.events.some(e => e.kind === 'wound' && e.id === 'cato'));
  const two = planTurn(one.state, hold, { theirs: shot, ours: quiet }, always(0));
  assert.ok(two.events.some(e => e.kind === 'down' && e.id === 'cato' && e.side === 'us'));
  assert.equal(st.figures.find(f => f.id === 'cato').hp, 2, 'the state given is not changed');
});
test('cover cuts the odds of a shot, and a made cover cuts them further, to the cap', () => {
  const st = repel(), t = st.figures.find(f => f.side === 'them');
  assert.ok(planOdds(st, t, 'w3', 'magazine', false) < planOdds(st, t, 'w3', 'w3', false), 'the magazine\'s racks against the open well');
  const made = { ...st, cover: { magazine: PLAN.MADE } };
  assert.ok(planOdds(made, t, 'w3', 'magazine', false) < planOdds(st, t, 'w3', 'magazine', false));
  assert.ok(planOdds(st, t, 'w3', 'magazine', true) < planOdds(st, t, 'w3', 'magazine', false), 'moving first');
});
test('the charge blows on the spot it was shown on, and not when the setter\'s spot was hit that turn', () => {
  const st = stage(repel({ party: 'corsair', boarders: 2 }), { t1: 'w3', cato: 'magazine', hand: 'gunseat' }, true);
  const m = planTheirMove(st, always(0.9));
  const blew = planTurn(st, hold, { theirs: m, ours: quiet }, always(0.9));
  assert.ok(blew.events.some(e => e.kind === 'charge' && e.on === 'magazine' && !e.stopped));
  assert.ok(blew.events.some(e => e.kind === 'down' && e.id === 'cato' && e.how === 'charge'));
  assert.equal(blew.state.charges, PLAN.CHARGES - 1);
  const hit = planTurn(st, hold, { theirs: m, ours: { moves: [], shots: [{ id: 'cato', at: 'w3' }] } }, always(0));
  assert.ok(hit.events.some(e => e.kind === 'charge' && e.stopped));
  assert.equal(hit.state.figures.find(f => f.id === 'cato').hp, 2);
});
test('pull back takes everyone of ours at the hand\'s spot a step toward the bridge before the charge blows', () => {
  const st = stage(repel({ party: 'corsair', boarders: 2 }), { t1: 'w4', hand: 'w3', cato: 'w3' }, true);
  const m = planTheirMove(st, always(0.9));
  assert.equal(m.charge.on, 'w3');
  const { state, events } = planTurn(st, { move: null, act: { kind: 'pullback' }, order: null }, { theirs: m, ours: quiet }, always(0.9));
  assert.deepEqual(plain(['hand', 'cato'].map(id => state.figures.find(f => f.id === id).spot)), ['w2', 'w2']);
  assert.ok(!events.some(e => e.kind === 'down'), 'it blows on nobody');
});
test('the second wave lands at the outer door at the end of WAVE_TURN', () => {
  let st = repel();
  for (let t = 1; t <= DECK.WAVE_TURN; t++) {
    const r = planTurn(st, hold, { theirs: none, ours: quiet }, always(0.9));
    st = r.state;
    assert.equal(r.events.some(e => e.kind === 'wave'), t === DECK.WAVE_TURN, `turn ${t}`);
  }
  assert.equal(st.wave, 0);
  assert.equal(planUp(st, 'them').length, 6);
});
test('the captain wounded twice is downed, not killed, and marked so the screen rolls no casualty (Review Focus 5)', () => {
  const st = stage(repel({ boarders: 2 }), { t1: 'w0', ines: 'nav', hand: 'gunseat' }, true);
  const shot = { ...none, shots: [{ id: 't1', at: 'helm' }] };
  const two = planTurn(planTurn(st, hold, { theirs: shot, ours: quiet }, always(0)).state, hold, { theirs: shot, ours: quiet }, always(0));
  const e = two.events.find(x => x.kind === 'down');
  assert.equal(e.id, 'captain');
  assert.equal(e.captain, true);
});
test('a friend takes the first hit meant for the hand, once a fight; after that the hand is wounded and downed like anyone, and a downed hand does nothing (#1354)', () => {
  const st = stage(repel({ boarders: 2 }), { t1: 'magazine', hand: 'gunseat', cato: 'gunseat' }, true);
  const shot = { ...none, shots: [{ id: 't1', at: 'gunseat' }] };
  const one = planTurn(st, hold, { theirs: shot, ours: quiet }, always(0));
  assert.ok(one.events.some(e => e.kind === 'shielded' && e.id === 'cato'));
  const two = planTurn(one.state, hold, { theirs: shot, ours: quiet }, always(0));
  assert.ok(two.events.some(e => e.kind === 'wound' && e.id === 'hand'), 'the friend has taken theirs: the hand is hit');
  const three = planTurn(two.state, hold, { theirs: shot, ours: quiet }, always(0));
  assert.ok(three.events.some(e => e.kind === 'down' && e.id === 'hand'));
  assert.deepEqual(plain(planChoices(three.state)), { moves: [], acts: [{ kind: 'shoot', targets: [], odds: 0 }, { kind: 'holdfire', odds: 1 }], orders: [] }, 'nothing left for the hand to do');
  const after = planTurn(three.state, { move: 'magazine', act: { kind: 'shoot', at: 'magazine' }, order: null }, { theirs: none, ours: quiet }, always(0)).state;
  assert.equal(after.figures.find(f => f.hand).spot, 'gunseat', 'a downed hand does not move');
});
test('the hand\'s shot takes heads by SIDEARM_BY_LEVEL, the wounded first', () => {
  const st = stage(repel({ boarders: 4 }), { hand: 'magazine', t1: 'w3', t2: 'w3' }, true);
  st.figures.find(f => f.id === 't1').hp = 1;
  const { events } = planTurn(st, { move: null, act: { kind: 'shoot', at: 'w3' }, order: null }, { theirs: none, ours: quiet }, always(0));
  const hits = events.filter(e => e.side === 'them' && (e.kind === 'wound' || e.kind === 'down'));
  assert.equal(hits.length, DECK.SIDEARM_BY_LEVEL[2][0]);
  assert.deepEqual(plain(hits[0]), { kind: 'down', id: 't1', side: 'them', spot: 'w3', how: 'shot' });
});
test('a seal order closes the hatch, and it stops their move and their fire through it', () => {
  const st = stage(repel({ boarders: 2 }), { t1: 'w4', hand: 'w3' }, true);
  const { state } = planTurn(st, { move: null, act: { kind: 'holdfire' }, order: { id: 'ines', kind: 'seal', hatch: 'h3' } }, { theirs: none, ours: quiet }, always(0));
  assert.equal(state.sealed.h3, true);
  const m = planTheirMove(state, always(0.9));
  assert.equal(m.cut, 'h3');
  assert.equal(m.shots.length, 0, 'no line through a sealed hatch');
});
test('a move drawn through a hatch that is sealed that turn stops before it: their rush at the hatch, our crew where they stand', () => {
  const st = stage(repel({ boarders: 2 }), { t1: 'w4', hand: 'gunseat', cato: 'bunksM' }, true);
  const rush = planTheirMove(st, always(0.9));
  assert.deepEqual(plain(rush.moves), [{ id: 't1', to: 'w2', rush: true, path: ['w3', 'w2'] }], 'drawn through h3 and h2');
  const seal = { move: null, act: { kind: 'holdfire' }, order: { id: 'ines', kind: 'seal', hatch: 'h3' } };
  const { state } = planTurn(st, seal, { theirs: rush, ours: quiet }, always(0));
  assert.equal(state.figures.find(f => f.id === 't1').spot, 'w4', 'the rush stops at the sealed hatch, under it');
  const past = planTurn(st, { ...seal, order: { ...seal.order, hatch: 'h2' } }, { theirs: rush, ours: quiet }, always(0)).state;
  assert.equal(past.figures.find(f => f.id === 't1').spot, 'w3', 'sealed past the first step: they stop on the spot before it');
  const ours = planTurn(stage(repel({ boarders: 2 }), { t1: 'outer', cato: 'w2' }, true), { ...seal, order: { ...seal.order, hatch: 'h2' } }, { theirs: none, ours: { moves: [{ id: 'cato', to: 'w3' }], shots: [] } }, always(0)).state;
  assert.equal(ours.figures.find(f => f.id === 'cato').spot, 'w2', 'ours do not step through it either');
});
test('boarding her, her crew seal the hatch over ours, and ours cut it in a turn', () => {
  const lay = LAYOUTS.raider, st = planFight({ lay, crew: CREW, hand: { level: 2, post: 'gunner', odds }, captain: null, party: 'raider', boarders: 4, assault: true });
  const m = planTheirMove(st, always(0.9));
  assert.equal(m.seal, 'h1', 'over her lock deck');
  const sealed = planTurn(st, hold, { theirs: m, ours: quiet }, always(0.9)).state;
  assert.equal(sealed.sealed.h1, true);
  assert.equal(planTheirMove(sealed, always(0.9)).seal, null, 'once a fight');
  stage(sealed, { cato: 'w2' });
  const { state, events } = planTurn(sealed, hold, { theirs: none, ours: quiet }, always(0.9));
  assert.ok(events.some(e => e.kind === 'cut' && e.side === 'us'));
  assert.equal(state.sealed.h1, undefined);
});

// ---------- the end ----------
test('a repel is won at the break line counting the wave still to land, taken when they hold our bridge, searched for the navy, won at the cap', () => {
  const st = repel({ boarders: 6 });
  assert.equal(planEnd(stage(repel({ boarders: 6 }), {}, true)), null, 'the wave still to land keeps it going');
  const broke = stage(repel({ boarders: 6 }), {}, true); broke.wave = 0;
  assert.equal(planEnd(broke), 'won');
  const held = stage(repel({ boarders: 6 }), { t1: 'helm', t2: 'nav' });
  for (const f of held.figures) if (['captain', 'ines'].includes(f.id)) f.hp = 0;
  assert.equal(planEnd(held), 'taken');
  assert.equal(planEnd({ ...held, party: 'navy' }), 'searched');
  const up = stage(repel({ boarders: 6 }), { t1: 'helm', t2: 'nav' });
  for (const f of up.figures) if (f.id === 'ines') f.hp = 0;
  assert.equal(planEnd(up), null, 'the captain counts on her bridge while she is up');
  assert.equal(planEnd({ ...st, turn: PLAN.TURNS }), 'won');
  assert.equal(planEnd({ ...st, turn: PLAN.NAVY_TURNS }), null);
  assert.equal(planEnd({ ...st, party: 'navy', turn: PLAN.NAVY_TURNS }), 'won');
});
test('boarding her is won on her bridge or at her break line, and taken when only the hand is left or at the cap', () => {
  const mk = () => planFight({ lay: LAYOUTS.raider, crew: CREW, hand: { level: 2, post: 'gunner', odds }, captain: null, party: 'raider', boarders: 4, assault: true });
  assert.equal(planEnd(mk()), null);
  const bridge = mk();
  for (const f of bridge.figures) if (f.side === 'them' && ['helm', 'gun', 'w0'].includes(f.spot)) f.hp = 0;
  stage(bridge, { cato: 'helm' });
  assert.equal(planEnd(bridge), 'won');
  const broke = mk();
  for (const f of broke.figures) if (f.side === 'them') f.hp = 0;
  assert.equal(planEnd(broke), 'won');
  const lost = mk();
  for (const f of lost.figures) if (f.side === 'us' && !f.hand) f.hp = 0;
  assert.equal(planEnd(lost), 'taken');
  assert.equal(planEnd({ ...mk(), turn: PLAN.TURNS }), 'taken');
});
test('400 seeded fights played on the captain\'s order all end by the cap', () => {
  const parties = ['raider', 'corsair', 'navy'];
  for (let seed = 1; seed <= 400; seed++) {
    const rand = seeded(seed), party = parties[seed % 3], assault = party !== 'navy' && seed % 4 === 0;
    let st = assault
      ? planFight({ lay: LAYOUTS[party], crew: CREW, hand: { level: seed % 6, post: 'gunner', odds }, captain: null, party, boarders: 3 + seed % 6, grade: seed % 3, assault })
      : repel({ party, boarders: 3 + seed % 9, grade: seed % 3 });
    let end = null, turns = 0;
    while (!end) {
      const pick = { move: null, act: { kind: seed % 2 ? 'holdfire' : 'shoot', at: (planChoices(st).acts[0].targets[0] || {}).at }, order: null };
      ({ state: st, end } = planTurn(st, pick, { theirs: planTheirMove(st, rand), ours: planCrewMoves(st, planCaptain(st, rand())) }, rand));
      turns++;
      assert.ok(turns <= PLAN.TURNS, `seed ${seed} runs past the cap`);
    }
    assert.ok(['won', 'taken', 'searched'].includes(end));
  }
});
