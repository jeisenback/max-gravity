'use strict';

// The fights' shared rules (js/fight.js): the sides and damage a ship fight on the radar uses, and the deck fight, in plain Node. The ship fight's own
// rules are radar.js's (tests/radar.test.js) since #1348.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./nodecontext');

const api = load(['js/data.js', 'js/range.js', 'js/sheet.js', 'js/handtohand.js', 'js/boarders.js', 'js/shipcombat.js', 'js/fight.js'], { Mods: { register() {} } }, ['SHIPS', 'dealDamage', 'OUTFITS', 'FIGHT', 'shipSide', 'DECK', 'CUNNING', 'fightCover', 'deckFight', 'hitSide', 'shootSide', 'boardMove', 'resolveDeckTurn', 'deckEnd', 'LOCK', 'CORRIDOR', 'BRIDGE', 'CARGO', 'pendingWave', 'sidearmOf', 'DECK_PARTY', 'ADJ', 'deckCap']);  // boarders.js is loaded for REPEL_HURT; Mods is the one thing it reaches for at load
const { SHIPS, dealDamage, OUTFITS, FIGHT, shipSide, DECK, CUNNING, fightCover, deckFight, hitSide, shootSide, boardMove, resolveDeckTurn, deckEnd, LOCK, CORRIDOR, BRIDGE, CARGO, pendingWave, sidearmOf, DECK_PARTY, ADJ, deckCap } = api;
const LOW = () => 0, HIGH = () => 0.999;
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


const kill = (side, ...parts) => parts.forEach(p => { side.parts[p].hp = 0; });
const hurt = (side, share) => { side.armor = Math.round(side.maxArmor * share); };  // share of armor
const mv = (foe, captain = 'hold') => ({ foe: [{ kind: foe }], captain: { kind: captain } });

















// The deck fight. Repelling: theirs push lock, corridor, bridge on our deck; in an assault, mine push the same way on hers.
const deck = (o = {}) => deckFight({ boarders: 3, crew: 3, hand: 0, cover: [0, 0, 0], grade: 0, assault: false, side: false, ...o });
const heads = st => plain(st.sections.map(s => [s.mine, s.theirs]));
const seq = (...xs) => { let i = 0; return () => xs[Math.min(i++, xs.length - 1)]; };
const stay = { kind: 'hold', from: 0, to: 0, n: 0, feint: false };
const SHOOT = { kind: 'shoot' };
const worn = (x, y = {}) => ({ ...x, mineHurt: x.mine, theirsHurt: x.theirs, ...y });  // every head wounded: a hit downs one, as in the fights before wounds
const bare = ({ mineHurt, theirsHurt, ...x }) => x;  // a section without its wounded count

test('a repel comes aboard in two waves: half first, the rest at the lock at the end of the second turn, shown until then', () => {
  const st = deckFight({ boarders: 7, crew: 5, cover: [0, 0, 0], party: 'raider' });
  assert.equal(st.sections[LOCK].theirs, 4);
  assert.deepEqual(plain(st.wave), { n: 3, turn: DECK.WAVE_TURN });
  assert.equal(pendingWave(st), 3);
  const hold = { kind: 'hold', from: LOCK, to: LOCK, n: 0 }, first = resolveDeckTurn(st, { stand: st.hand, act: 'shoot' }, hold, () => 0.99);
  assert.equal(pendingWave(first.state), 3, 'still shown after the first turn');
  const r = resolveDeckTurn(first.state, { stand: first.state.hand, act: 'shoot' }, hold, () => 0.99);
  assert.equal(pendingWave(r.state), 0);
  assert.ok(r.events.some(e => e.kind === 'wave' && e.n === 3));
  assert.equal(deckFight({ boarders: 7, crew: 5, cover: [0, 0, 0], assault: true }).wave, null);
});

test('the break line counts the wave still to land: the first wave all down is not a win', () => {
  const st = deckFight({ boarders: 8, crew: 5, cover: [0, 0, 0] });
  st.sections.forEach(s => { s.theirs = 0; });
  assert.equal(deckEnd(st), null);
  st.wave = null;
  assert.equal(deckEnd(st), 'won');
});

test('the sidearm takes more heads at a higher level', () => {
  assert.deepEqual(plain(sidearmOf(deckFight({ boarders: 6, crew: 5, cover: [0, 0, 0], level: 1 }))), [1, 2]);
  assert.deepEqual(plain(sidearmOf(deckFight({ boarders: 6, crew: 5, cover: [0, 0, 0], level: 3 }))), [3, 4]);
  assert.deepEqual(plain(sidearmOf(deckFight({ boarders: 6, crew: 5, cover: [0, 0, 0] }))), [2, 3]);
});

test('the party is keyed by the hull: cutter and destroyer are navy, an unknown ship is a raider', () => {
  assert.deepEqual(plain(DECK_PARTY), { raider: 'raider', corsair: 'corsair', cutter: 'navy', destroyer: 'navy' });
  assert.equal(deckFight({ boarders: 6, crew: 5, cover: [0, 0, 0], party: DECK_PARTY.cutter }).party, 'navy');
  assert.equal(deckFight({ boarders: 6, crew: 5, cover: [0, 0, 0] }).party, 'raider');
});

test('their move is shown, and at a veteran grade it may feint, at CUNNING * grade', () => {
  const st = deck({ boarders: 8, crew: 1, party: 'corsair' });  // a plain push that may feint: with none of ours next to her lock she has no charge to show; four in the lock, four more in the wave
  assert.deepEqual(plain(boardMove(st, LOW)), { kind: 'push', from: 0, to: 1, n: 4, feint: false }, 'they outnumber the corridor');
  const hold1 = deck({ boarders: 1, crew: 6 });
  assert.equal(boardMove(hold1, LOW).kind, 'hold', 'two of ours stand in the lock with them: they hold');
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
  const side = deck({ side: true, crew: 6, boarders: 6 });  // three in the lock
  side.sections[0].mine = 0; side.sections[1].mine = 6;
  assert.deepEqual(plain(boardMove(side, LOW)), { kind: 'round', from: 0, to: 3, n: 3, feint: false }, 'with a long ship and the corridor held, round by the cargo bay');
  side.sections[3].theirs = 2; side.sections[2].theirs = 2; side.sections[0].theirs = 1;
  assert.equal(boardMove(side, LOW).from, 2, 'the front is the furthest along, the bridge over the cargo bay');
  const asl = deck({ assault: true, boarders: 6, crew: 3, party: 'navy' });
  assert.deepEqual(plain(boardMove(asl, LOW)), { kind: 'hold', from: 0, to: 0, n: 0, feint: false }, 'her crew hold');
  asl.sections[1].mine = 1; asl.sections[1].theirs = 0; asl.sections[2].theirs = 4; asl.sections[2].mine = 0;
  const m = boardMove(asl, LOW);
  assert.deepEqual([m.kind, m.from, m.to], ['push', 2, 1], 'where she outnumbers us she pushes back toward the lock');
});

test('the deck starts with the attackers in the lock and the defenders spread, the remainder on the bridge, which is never left empty (R29)', () => {
  assert.deepEqual(heads(deck({ boarders: 8, crew: 5 })), [[1, 4], [1, 0], [3, 0]], 'five over three: one each and two extra to the bridge');
  assert.deepEqual(heads(deck({ boarders: 7, crew: 3, assault: true })), [[3, 2], [0, 2], [0, 3]], 'in an assault mine are the attackers, and hers keep the bridge');
  for (const side of [false, true]) for (let n = 1; n <= 7; n++) {
    assert.ok(deck({ crew: n, side }).sections[2].mine > 0, `our bridge with ${n} crew${side ? ', a long ship' : ''}`);
    assert.ok(deck({ boarders: n, crew: 3, assault: true, side }).sections[2].theirs > 0, `her bridge with ${n} of hers${side ? ', a long ship' : ''}`);
  }
  const st = deck({ side: true, cover: [1, 2, 3] });
  assert.deepEqual(plain([st.sections.length, st.sections[3].cover, st.hand, st.began, st.turn, st.used, st.kind]), [4, 0, 2, 3, 0, {}, 'deck'], 'three crew over four sections are all on the bridge, and the hand starts with them (R34)');
  assert.deepEqual(plain(st.sections.map(s => s.cover)), [1, 2, 3, 0]);
  assert.deepEqual(plain(DECK), { SECTIONS: ['lock', 'corridor', 'bridge'], SIDEARM_BY_LEVEL: [[1, 2], [1, 2], [2, 3], [3, 4], [3, 5], [4, 5]], SIDEARM_REACH_LEVEL: 2, WAVE_TURN: 2, CREW_HIT: [0, 2], CHARGE: [1, 1], BREAK: 0.15, FULL: 4, CORSAIR_LESS: 2, FULL_PAIR: 2, SUIT: 0.2, CASUALTY: 0.3, TURNS: 8,
    ASSAULT: { BREAK: 0.2, FULL: 5, CREW_HIT: [0, 1], CASUALTY: 0.5 }, NAVY_TURNS: 5, NAVY_STANDING: 2 });
  assert.equal(deck({ crew: 3 }).hand, 0, 'with one of ours in the lock the hand starts there');
  assert.deepEqual(plain(deck({ assault: true, hers: [1, 0, 1] }).sections.map(x => [x.cover, x.hers])), [[0, 1], [0, 0], [0, 1]], 'her cover is kept apart from ours');
  assert.deepEqual(plain(fightCover({ size: 12, kit: [], extra: [] })), [1, 1, 1], 'the cover input is the shape fightCover gives');
});

test('a section exchange takes a CREW_HIT roll a head from the other side, so losses grow with the opposing heads (R29)', () => {
  const trade = (mine, theirs, cover, rand) => {
    const st = deck({ boarders: 6, crew: 6 });
    st.sections = st.sections.map(() => ({ mine: 0, theirs: 0, cover: 0 })); st.sections[2].mine = 1;  // no one else trades, and the bridge is ours
    st.sections[1] = worn({ mine, theirs, cover });
    return bare(plain(resolveDeckTurn(st, { stand: 2, act: null, order: null }, stay, rand).state.sections[1]));
  };
  assert.deepEqual(trade(2, 2, 0, LOW), { mine: 2, theirs: 2, cover: 0 }, 'the low end of the range takes none');
  assert.deepEqual(trade(5, 1, 0, HIGH), { mine: 3, theirs: 0, cover: 0 }, 'one of theirs takes two of ours at the top of the roll');
  assert.deepEqual(trade(7, 3, 0, HIGH), { mine: 1, theirs: 0, cover: 0 }, 'three of theirs take six');
  assert.deepEqual(trade(2, 6, 0, HIGH), { mine: 0, theirs: 2, cover: 0 }, 'a loss is never more than the heads there');
  const lone = deck({ boarders: 3, crew: 3 });
  lone.sections[2].theirs = 0;
  assert.deepEqual(heads(resolveDeckTurn(lone, { stand: 0, act: null, order: null }, stay, HIGH).state)[2], [1, 0], 'where only one side stands nothing is traded');
});

test('each side\'s own cover cuts its loss, by a pip a pip, but never cuts a hit to nothing (R31, R33)', () => {
  const trade = (mine, theirs, cover, hers, assault = false, rand = HIGH) => {
    const st = deck({ boarders: 6, crew: 6, assault });
    st.sections = st.sections.map(() => ({ mine: 0, theirs: 0, cover: 0, hers: 0 })); st.sections[2] = assault ? { mine: 0, theirs: 1, cover: 0, hers: 0 } : { mine: 1, theirs: 0, cover: 0, hers: 0 };
    st.sections[1] = worn({ mine, theirs, cover, hers }); st.hand = assault ? 0 : 2; if (assault) st.sections[0].mine = 1;
    return bare(plain(resolveDeckTurn(st, { stand: st.hand, act: null, order: null }, stay, rand).state.sections[1]));
  };
  assert.deepEqual(trade(5, 1, 2, 0), { mine: 4, theirs: 0, cover: 2, hers: 0 }, 'two pips against one head\'s hit still leave it a hit');
  assert.deepEqual(trade(5, 2, 2, 0), { mine: 3, theirs: 0, cover: 2, hers: 0 }, 'four hits, two pips: two');
  assert.deepEqual(trade(5, 4, 2, 0, false, LOW), { mine: 5, theirs: 4, cover: 2, hers: 0 }, 'no hit rolled, nothing lost');
  assert.deepEqual(trade(2, 5, 0, 1, true), { mine: 0, theirs: 4, cover: 0, hers: 1 }, 'in an assault (a hit a head at most, DECK.ASSAULT) her pip cuts her loss to one, and ours, with none, lose both');
  assert.deepEqual(trade(4, 2, 2, 0, true), { mine: 3, theirs: 0, cover: 2, hers: 0 }, 'our pips cut only our loss: two hits less two is still one');
});

test('in an assault a cover that works is ours: it cuts our loss and not hers (R31)', () => {
  const play = odds => {
    const st = deck({ assault: true, boarders: 6, crew: 6 });
    st.sections = st.sections.map(() => ({ mine: 0, theirs: 0, cover: 0, hers: 0 })); st.sections[2].theirs = 1;
    st.sections[0] = worn({ mine: 5, theirs: 2, cover: 0, hers: 0 }); st.hand = 0;
    return bare(plain(resolveDeckTurn(st, { stand: 0, act: { kind: 'cover', odds }, order: null }, stay, HIGH).state.sections[0]));
  };
  assert.deepEqual(play(0), { mine: 2, theirs: 0, cover: 0, hers: 0 }, 'a cover that misses: her two take two of ours (a hit a head at most, DECK.ASSAULT), and the press one more');
  assert.deepEqual(play(1), { mine: 4, theirs: 0, cover: 2, hers: 0 }, 'one that works cuts her two hits to one (never to none), and our hits on her are not cut at all');
});

test('a steady act with nobody of theirs where the hand stands is not rolled, and says so; a cover still is (R34)', () => {
  const st = deck({ boarders: 3, crew: 3 });
  st.sections[0].theirs = 0; st.sections[1].theirs = 3;
  const r = resolveDeckTurn(st, { stand: 0, act: { kind: 'steady', odds: 0 }, order: { kind: 'steady', odds: 0 } }, stay, HIGH);
  assert.deepEqual(plain(r.events.filter(e => e.kind === 'steady')), [{ kind: 'steady', nobody: true }, { kind: 'steady', nobody: true }]);
  assert.equal(r.state.sections[0].mine, 1, 'a check that would have missed is not made, so nobody presses on us');
  const c = resolveDeckTurn(st, { stand: 0, act: { kind: 'cover', odds: 1 }, order: null }, stay, LOW);
  assert.deepEqual([c.state.sections[0].cover, c.events.find(e => e.kind === 'cover').worked], [2, true], 'the cover is made where nobody is');
});

test('a deck fight ends at the turn cap: matched stacks that cannot move withdraw, a repel won and an assault lost (R32)', () => {
  const run = st => { let end = null; for (let t = 0; t < 20 && !end; t++) { st = resolveDeckTurn(st, { stand: st.hand, act: null, order: null }, boardMove(st, LOW), LOW).state; end = deckEnd(st); } return [end, st.turn]; };
  const rep = deck({ boarders: 5, crew: 5 });
  rep.sections = [{ mine: 0, theirs: 0, cover: 1, hers: 0 }, { mine: 0, theirs: 2, cover: 2, hers: 0 }, { mine: 3, theirs: 0, cover: 1, hers: 0 }]; rep.hand = 2;
  assert.deepEqual(run(rep), ['won', DECK.TURNS], 'two of theirs in our corridor and three of ours on the bridge: they go back to their ship');
  const asl = deck({ assault: true, boarders: 5, crew: 5 });
  asl.sections = [{ mine: 0, theirs: 0, cover: 0, hers: 1 }, { mine: 3, theirs: 0, cover: 0, hers: 0 }, { mine: 0, theirs: 3, cover: 0, hers: 1 }]; asl.hand = 1;
  assert.deepEqual(run(asl), ['taken', DECK.TURNS], 'three of ours in her corridor and three of hers on her bridge: ours fall back');
  assert.equal(deckEnd({ ...deck(), turn: DECK.TURNS - 1 }), null, 'not before the cap');
});

test('a stack does not leave a section while the other side stands in it: their push, her push back and our advance (R29)', () => {
  const st = deck({ boarders: 8, crew: 3, party: 'navy' });  // one of ours in each section, four of theirs in the lock
  assert.equal(boardMove(st, LOW).kind, 'hold', 'one of ours in the lock holds four of them there');
  st.sections[0].mine = 0;
  assert.deepEqual(plain(boardMove(st, LOW)), { kind: 'push', from: 0, to: 1, n: 4, feint: false }, 'with the lock theirs alone they push on');
  const asl = deck({ assault: true, boarders: 3, crew: 5 });
  const r = resolveDeckTurn(asl, { stand: 0, act: null, order: null }, stay, LOW);
  assert.ok(!r.events.some(e => e.kind === 'move' && e.who === 'mine'), 'ours stay in her lock while one of hers is there');
  asl.sections[0].theirs = 0;
  assert.ok(resolveDeckTurn(asl, { stand: 0, act: null, order: null }, stay, LOW).events.some(e => e.kind === 'move' && e.who === 'mine'), 'and push on once it is clear');
  const back = deck({ assault: true, boarders: 3, crew: 3 });
  back.sections = [{ mine: 1, theirs: 0, cover: 0 }, { mine: 1, theirs: 4, cover: 0 }, { mine: 0, theirs: 1, cover: 0 }];
  assert.equal(boardMove(back, LOW).kind, 'hold', 'her four do not leave the corridor while one of ours is in it');
  back.sections[1].mine = 0;
  assert.deepEqual([boardMove(back, LOW).kind, boardMove(back, LOW).from], ['push', 1], 'with it hers alone she pushes back to the lock');
});

test('the hand shoots, steadies or covers in the section they stand in', () => {
  const base = () => { const st = deck({ boarders: 8, crew: 6 }); st.wave = null; st.sections[0] = worn({ mine: 2, theirs: 8, cover: 0 }); return st; };
  const turn = (act, order, rand) => resolveDeckTurn(base(), { stand: 0, act, order }, stay, rand);
  let r = turn(SHOOT, null, seq(0, 0, 0, 0, 0, 0, 0));
  assert.equal(r.state.sections[0].theirs, 6, 'a shot adds the sidearm roll: two at least');
  r = turn(SHOOT, null, seq(0.999, 0.999, 0.999, 0.999));
  assert.equal(r.state.sections[0].theirs, 1, 'the exchange takes two for each of our two, and the sidearm three');
  r = turn({ kind: 'steady', odds: 0.5 }, null, seq(0.1, 0, 0, 0, 0));
  assert.equal(r.state.sections[0].theirs, 7, 'a steady hand that works thins them by one');
  r = turn({ kind: 'steady', odds: 0.5 }, null, seq(0.9, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.5));  // the check, eight rolls against us and two against them, then the press
  assert.equal(r.state.sections[0].theirs, 8, 'one that misses thins no one');
  assert.equal(r.state.sections[0].mine, 1, 'and they press: a roll against us, here a middling one');
  r = turn({ kind: 'cover', odds: 0.5 }, null, seq(0.1, 0, 0, 0, 0));
  assert.deepEqual([r.state.sections[0].cover, r.state.used.cover], [2, true], 'cover made is two points, once a fight');
  r = resolveDeckTurn(r.state, { stand: 0, act: { kind: 'cover', odds: 1 }, order: null }, stay, seq(0, 0, 0, 0));
  assert.equal(r.state.sections[0].cover, 2, 'the second cover does nothing');
  r = turn(null, { kind: 'steady', odds: 0.9 }, seq(0.1, 0, 0, 0, 0));
  assert.equal(r.state.sections[0].theirs, 7, 'a crew order works as the hand does');
  const before = JSON.stringify(base());
  const st = base();
  resolveDeckTurn(st, { stand: 1, act: SHOOT, order: null }, stay, HIGH);
  assert.equal(JSON.stringify(st), before, 'the state given is not changed');
});

test('a hand standing in a taken section is pushed back one with a hurt roll, never left alone with them', () => {
  const st = deck({ boarders: 4, crew: 3 });
  st.sections[1] = worn({ mine: 1, theirs: 3, cover: 0 });
  st.sections[0].theirs = 1;
  st.hand = 1;
  const push = { kind: 'hold', from: 1, to: 1, n: 0, feint: false };
  const r = resolveDeckTurn(st, { stand: 1, act: null, order: null }, push, seq(0.999, 0.999, 0.999, 0.999, 0.999, 0.999));
  assert.deepEqual(heads(r.state)[1], [0, 1], 'the last of ours there is down, and two of theirs with it');
  assert.equal(r.state.hand, 2, 'the hand falls back one, toward our side');
  assert.ok(r.events.some(e => e.kind === 'hand' && e.back), 'the retreat is an event');
  assert.equal(r.events.filter(e => e.kind === 'hurt').length, 1, 'with one hurt roll');
  assert.equal(r.events.find(e => e.kind === 'hurt').hurt, false, '0.999 is over 0.09');
  const lucky = resolveDeckTurn(st, { stand: 1, act: null, order: null }, push, seq(0.999, 0.999, 0.999, 0.999, 0, 0, 0, 0));
  assert.ok(lucky.events.some(e => e.kind === 'hurt' && e.hurt), 'a low roll is hurt: 0.45 * 0.2');
  const sheer = resolveDeckTurn(st, { stand: 1, act: null, order: null }, push, seq(0.999, 0.999, 0.999, 0.999, 0.4));
  assert.ok(sheer.events.some(e => e.kind === 'hurt' && !e.hurt), '0.4 is over 0.09: not hurt');
  const asl = deck({ assault: true, boarders: 3, crew: 3 });
  asl.sections[0] = { mine: 1, theirs: 0, cover: 0 }; asl.sections[1] = { mine: 0, theirs: 2, cover: 0 }; asl.hand = 1;
  assert.equal(resolveDeckTurn(asl, { stand: 1, act: null, order: null }, push, HIGH).state.hand, 0, 'in an assault the way back is toward the lock');
});

test('the ends: broken at her break line, all down, pushed out of the lock, or the bridge taken; mirrored for an assault', () => {
  const st = deck({ boarders: 6, crew: 3 });
  assert.equal(deckEnd(st), null);
  st.wave = null;  // the wave has landed (the break line counts it until then)
  st.sections[0].theirs = 1;
  assert.equal(deckEnd(st), null, 'repelling, six fight to the last: one left is over the line (DECK.BREAK)');
  const big = deck({ boarders: 14, crew: 3 }); big.wave = null; big.sections.forEach(s => { s.theirs = 0; }); big.sections[0].theirs = 2;
  assert.equal(deckEnd(big), 'won', 'two of fourteen is under it: broken');
  big.sections[0].theirs = 3;
  assert.equal(deckEnd(big), null, 'three is over');
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
  broke.sections.forEach(s => { s.theirs = 0; }); broke.sections[0].theirs = 1;
  assert.equal(deckEnd(broke), 'won', 'hers broken at one of six (DECK.ASSAULT.BREAK)');
});

test('cargo is next to the lock and the bridge both ways: the hand steps in and out, and a feint from the corridor never lands there', () => {
  const at = (from, stand) => resolveDeckTurn({ ...deck({ side: true, crew: 8 }), hand: from }, { stand, act: null, order: null }, stay, LOW).state.hand;
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
  st.sections[0] = worn({ mine: 1, theirs: 1, cover: 0 });
  const r = resolveDeckTurn(st, { stand: 0, act: { kind: 'steady', odds: 0 }, order: { kind: 'steady', odds: 0 } }, stay, () => 0.99);
  const ex = r.events.filter(e => e.kind === 'exchange');
  assert.deepEqual(plain(ex), [{ kind: 'exchange', section: 0, mine: 1, theirs: 1, mineHurt: 0, theirsHurt: 0 }], 'one head each, however many rolls');
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

test('an assault played turn by turn reaches the end: our party advances section by section as each is cleared', () => {
  let st = deck({ assault: true, boarders: 3, crew: 9 });
  let end = null;
  for (let t = 0; t < 12 && !end; t++) {
    st = resolveDeckTurn(st, { stand: 0, act: null, order: null }, boardMove(st, HIGH), HIGH).state;
    end = deckEnd(st);
  }
  assert.equal(end, 'won');
  assert.ok(st.sections[0].theirs === 0 && st.sections[1].theirs === 0 && st.sections[2].mine > 0, 'her lock and corridor cleared, and ours on her bridge');
});









const sh = r => r.events.filter(e => e.who === 'me' && e.dmg !== undefined);  // the turn's shots, without the move's own event










// Hard Case (traits.js): a foe's side may carry its own break-off share, read where FIGHT.BREAK is.

// The fight perks of the post ladders (picks.js): the engine reads them as figures on the state the panel builds.

test('a worked cover order makes the deck state\'s coverMade points, COVER_MADE unless the state says more (cover-eye)', () => {
  const made = (o = {}) => { const st = deckFight({ boarders: 3, crew: 3, cover: [0, 0, 0], ...o }); st.sections[0].theirs = 0; st.sections[1].theirs = 3; return resolveDeckTurn(st, { stand: 0, act: { kind: 'cover', odds: 1 }, order: null }, { kind: 'hold' }, LOW).state.sections[0].cover; };
  assert.equal(made(), 2); assert.equal(made({ coverMade: 3 }), 3);
  assert.equal(deckFight({ boarders: 3, crew: 3, cover: [0, 0, 0] }).coverMade, 2, 'the state carries it');
});

// The eight moves of the post ladders (docs/superpowers/specs/2026-11-08-post-ladders-design.md), each once a fight, spent as the gunner's three are.








// The raider's rush: through a thinly held section in one turn. Our heads are off the lock (a head there would hold the push) and a lone one holds the corridor.
const rushDeck = () => { const st = deckFight({ boarders: 8, crew: 3, cover: [0, 0, 0], party: 'raider' }); st.sections[LOCK].mine = 0; st.sections[CORRIDOR].mine = 1; st.hand = BRIDGE; return st; };

test('raiders rush through a thin section: two sections in a turn, shown as a rush', () => {
  const st = rushDeck(), m = boardMove(st, () => 0.99);
  assert.equal(m.kind, 'rush'); assert.equal(m.via, CORRIDOR); assert.equal(m.to, BRIDGE);
  const r = resolveDeckTurn(st, { stand: BRIDGE, act: 'shoot' }, m, () => 0.99);
  assert.ok(r.events.some(e => e.kind === 'rush' && !e.stopped));
});

test('a rush stops where the hand stands, or at a hatch that worked', () => {
  const st = rushDeck(), m = boardMove(st, () => 0.99);
  const met = resolveDeckTurn(st, { stand: CORRIDOR, act: 'shoot' }, m, () => 0.99);
  assert.ok(met.events.some(e => e.kind === 'rush' && e.stopped));
  const hatched = resolveDeckTurn(st, { stand: BRIDGE, act: 'shoot', order: { kind: 'steady', odds: 1, at: CORRIDOR } }, m, () => 0.5);
  assert.ok(hatched.events.some(e => e.kind === 'hatch' && e.worked && e.at === CORRIDOR));
  assert.ok(hatched.events.some(e => e.kind === 'rush' && e.stopped));
});

test('a rush stops in the section passed when ours there are half of the heads sent or more: a worked hatch at their lock thins them to it', () => {
  const st = rushDeck(); st.sections[LOCK].theirs = 5; st.sections[CORRIDOR].mine = 2;
  const m = boardMove(st, () => 0.99);
  assert.deepEqual([m.kind, m.n], ['rush', 5], 'two of ours against five: under half, a rush');
  const r = resolveDeckTurn(st, { stand: BRIDGE, act: 'shoot', order: { kind: 'steady', odds: 1, at: LOCK } }, m, () => 0.5);
  const rush = r.events.find(e => e.kind === 'rush');
  assert.deepEqual([rush.n, rush.stopped, rush.to], [4, true, CORRIDOR], 'four sent against two: stopped in the corridor, not by the hand nor a hatch there');
});

test('boarding her, her crew push back toward the lock, and a raider crew rush through a thin section the same way', () => {
  const st = deckFight({ boarders: 3, crew: 4, cover: [0, 0, 0], assault: true, party: 'raider' });
  st.sections = st.sections.map(() => ({ mine: 0, theirs: 0, cover: 0 })); st.sections[LOCK].mine = 2; st.sections[CORRIDOR].mine = 1; st.sections[BRIDGE].theirs = 4; st.hand = LOCK;
  const m = boardMove(st, () => 0.99);
  assert.deepEqual([m.kind, m.from, m.via, m.to, m.n], ['rush', BRIDGE, CORRIDOR, LOCK, 4], 'from her bridge through her corridor into her lock: BACK, not FORWARD');
  const r = resolveDeckTurn(st, { stand: LOCK, act: 'shoot' }, m, () => 0.5);
  assert.ok(r.events.some(e => e.kind === 'rush' && !e.stopped && e.to === LOCK), 'it goes through');
  const met = resolveDeckTurn(st, { stand: CORRIDOR, act: 'shoot' }, m, () => 0.5);
  assert.ok(met.events.some(e => e.kind === 'rush' && e.stopped && e.to === CORRIDOR), 'and the hand in her corridor stops it there');
});

test('only raiders rush, a rush is never feinted, and a hatch at a section the deck lacks is dropped', () => {
  const st = rushDeck(); st.party = 'navy';
  assert.equal(boardMove(st, () => 0.99).kind, 'push');
  const vet = rushDeck(); vet.grade = 2;
  assert.equal(boardMove(vet, () => 0).feint, false);
  const r = resolveDeckTurn(rushDeck(), { stand: BRIDGE, act: 'shoot', order: { kind: 'steady', odds: 1, at: CARGO } }, { kind: 'hold', from: LOCK, to: LOCK, n: 0 }, () => 0.5);
  assert.ok(!r.events.some(e => e.kind === 'hatch'));
});

test('a rush onto a bridge with none of ours on it takes the ship that turn', () => {
  const st = rushDeck(); st.sections[BRIDGE].mine = 0;
  const r = resolveDeckTurn(st, { stand: BRIDGE, act: 'shoot' }, boardMove(st, () => 0.99), () => 0.99);
  assert.equal(deckEnd(r.state), 'taken');
});

test('a worked steady hatch at the section they leave thins the heads that move, and no section goes below none', () => {
  for (const party of ['navy', 'raider']) {
    const st = rushDeck(); st.party = party;
    const m = boardMove(st, () => 0.99), order = { kind: 'steady', odds: 1, at: LOCK };
    const r = resolveDeckTurn(st, { stand: BRIDGE, act: null, order }, m, () => 0.5);
    assert.ok(r.state.sections.every(s => s.theirs >= 0 && s.mine >= 0), party);
    assert.equal(r.events.find(e => e.kind === (party === 'raider' ? 'rush' : 'move')).n, m.n - 1, party);
  }
});

test('a missed hatch at a section other than the hand\'s presses nobody where the hand stands', () => {
  const a = rushDeck(), b = rushDeck();
  for (const st of [a, b]) { st.sections[BRIDGE].theirs = 2; st.sections[BRIDGE].mine = 3; }
  const hold = { kind: 'hold', from: LOCK, to: LOCK, n: 0 };
  const plain1 = resolveDeckTurn(a, { stand: BRIDGE, act: null }, hold, seq(0.5, 0.5, 0.5, 0.5, 0.5, 0.5));
  const missed = resolveDeckTurn(b, { stand: BRIDGE, act: null, order: { kind: 'steady', odds: 0, at: LOCK } }, hold, seq(0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5));
  assert.ok(missed.events.some(e => e.kind === 'hatch' && !e.worked));
  assert.deepEqual(plain(missed.events.filter(e => e.kind === 'exchange')), plain(plain1.events.filter(e => e.kind === 'exchange')));
});

// The corsair's breaching charge (Task 5): shown where their move would be a push or a hold, on a section of ours next to one of theirs, never two turns
// running and never feinted; it blows in the turn it is shown, downing DECK.CHARGE of ours there past cover and wounds, unless its setter, in `from`, is hit.
const chargeDeck = (o = {}) => { const st = deck({ boarders: 8, crew: 3, party: 'corsair', ...o }); st.wave = null; st.sections[LOCK].mine = 0; st.hand = BRIDGE; return st; };  // one of ours in the corridor and the bridge, four of theirs in the lock

test('a corsair party next to ours shows a charge on the section of ours with the most heads, and not two turns running', () => {
  const st = chargeDeck(); st.sections[CORRIDOR].mine = 2;
  assert.deepEqual(plain(boardMove(st, LOW)), { kind: 'charge', at: CORRIDOR, from: LOCK, n: 0, feint: false }, 'the corridor is next to their lock, and their move would be a hold');
  const side = deck({ side: true, boarders: 8, crew: 0, party: 'corsair' }); side.wave = null;
  side.sections[CORRIDOR].mine = 1; side.sections[CARGO].mine = 3; side.sections[BRIDGE].mine = 1;
  assert.deepEqual([boardMove(side, LOW).kind, boardMove(side, LOW).at], ['charge', CARGO], 'of two sections next to them, the one with more of ours');
  const r = resolveDeckTurn(st, { stand: BRIDGE, act: null, order: null }, boardMove(st, LOW), LOW);
  assert.equal(r.state.charged, 0, 'the state keeps the turn of the last charge');
  assert.notEqual(boardMove(r.state, LOW).kind, 'charge', 'not the turn after');
  const later = resolveDeckTurn(r.state, { stand: BRIDGE, act: null, order: null }, boardMove(r.state, LOW), LOW);
  assert.equal(boardMove(later.state, LOW).kind, 'charge', 'and again the turn after that');
  const far = chargeDeck(); far.sections[CORRIDOR].mine = 0;
  assert.equal(boardMove(far, LOW).kind, 'push', 'none of ours next to them: no charge, and they push on');
});

test('a charge blows in the turn it is shown: DECK.CHARGE of ours in its section down outright, past cover and wounds, the wounded first', () => {
  const blow = rand => { const st = chargeDeck(); st.hand = BRIDGE; Object.assign(st.sections[CORRIDOR], { mine: 4, mineHurt: 1, cover: 3 }); return resolveDeckTurn(st, { stand: BRIDGE, act: null, order: null }, boardMove(st, LOW), rand); };
  const [lo, hi] = DECK.CHARGE, low = blow(LOW), high = blow(HIGH);
  assert.deepEqual(plain(low.events.find(e => e.kind === 'charge')), { kind: 'charge', at: CORRIDOR, from: LOCK, mine: lo, stopped: false }, 'the least of the roll');
  assert.deepEqual(plain(high.events.find(e => e.kind === 'charge')), { kind: 'charge', at: CORRIDOR, from: LOCK, mine: hi, stopped: false }, 'the most of the roll');
  assert.deepEqual([low.state.sections[CORRIDOR].mine, low.state.sections[CORRIDOR].mineHurt], [4 - lo, 0], 'the wounded one is downed first, and cover 3 cuts none of it');
  assert.deepEqual([high.state.sections[CORRIDOR].mine, high.state.sections[CORRIDOR].mineHurt], [4 - hi, 0]);
  assert.ok(!low.events.some(e => e.kind === 'move'), 'the setter does not move');
  assert.ok(lo >= 1 && hi <= 3 && lo <= hi, 'it downs one at least and three at most');
});

test('hitting its setter stops the charge: the shot aimed where it stands, a steady or a hatch worked there, or ours trading with it there; a steady in the charged section does not', () => {
  const st = () => { const x = chargeDeck(); x.sections[CORRIDOR].mine = 2; x.hand = CORRIDOR; return x; };  // two of ours in the corridor, the setter among four in the lock
  const shown = boardMove(st(), LOW), stopped = r => r.events.find(e => e.kind === 'charge').stopped;
  assert.deepEqual([shown.kind, shown.at, shown.from], ['charge', CORRIDOR, LOCK]);
  assert.equal(stopped(resolveDeckTurn(st(), { stand: CORRIDOR, act: { kind: 'shoot', at: LOCK }, order: null }, shown, () => 0.5)), true, 'the shot aimed into the lock from the corridor (level 2)');
  const one = st(); one.level = 1;
  assert.equal(stopped(resolveDeckTurn(one, { stand: CORRIDOR, act: { kind: 'shoot', at: LOCK }, order: null }, shown, () => 0.5)), false, 'at level 1 the shot stays in the corridor, where none of them are');
  assert.equal(stopped(resolveDeckTurn(st(), { stand: LOCK, act: { kind: 'steady', odds: 1 }, order: null }, shown, () => 0.5)), true, 'the hand\'s steady, standing in the lock');
  const away = st(); away.hand = BRIDGE;
  assert.equal(stopped(resolveDeckTurn(away, { stand: BRIDGE, act: null, order: { kind: 'steady', odds: 1, at: LOCK } }, shown, () => 0.5)), true, 'a steady hatch worked in the lock');
  assert.equal(stopped(resolveDeckTurn(away, { stand: BRIDGE, act: null, order: { kind: 'steady', odds: 0, at: LOCK } }, shown, () => 0.5)), false, 'one that misses');
  const trade = st(); trade.hand = BRIDGE; trade.sections[LOCK].mine = 2;
  assert.equal(stopped(resolveDeckTurn(trade, { stand: BRIDGE, act: null, order: null }, shown, HIGH)), true, 'ours in the lock wounding one of them');
  const r = resolveDeckTurn(trade, { stand: BRIDGE, act: null, order: null }, shown, LOW);
  assert.equal(stopped(r), false, 'a trade there that hits none of them');
  const inAt = st(); inAt.sections[CORRIDOR].theirs = 1;
  assert.equal(stopped(resolveDeckTurn(inAt, { stand: CORRIDOR, act: { kind: 'steady', odds: 1 }, order: null }, shown, () => 0.5)), false, 'a steady in the charged section, where the setter is not');
  const hit = resolveDeckTurn(st(), { stand: CORRIDOR, act: { kind: 'shoot', at: LOCK }, order: null }, shown, () => 0.5);
  assert.deepEqual(plain(hit.events.find(e => e.kind === 'charge')), { kind: 'charge', at: CORRIDOR, from: LOCK, mine: 0, stopped: true });
  assert.equal(hit.state.sections[CORRIDOR].mine, 2, 'none of ours down by it');
});

test('a pull back moves the hand and ours in its section one section back before the charge, so a charge on the section left downs nobody', () => {
  const st = chargeDeck(); st.hand = CORRIDOR; st.sections[CORRIDOR].mine = 2; st.sections[CORRIDOR].mineHurt = 1;  // none of ours in the lock, where the setter is
  const r = resolveDeckTurn(st, { stand: CORRIDOR, act: 'pullback', order: null }, boardMove(st, LOW), HIGH);
  const S = r.state.sections;
  assert.equal(r.state.hand, BRIDGE, 'repelling, back is toward our bridge');
  assert.deepEqual([S[CORRIDOR].mine, S[BRIDGE].mine, S[BRIDGE].mineHurt], [0, 3, 1], 'all of ours there go with the hand, the wounded too');
  assert.deepEqual(plain(r.events.find(e => e.kind === 'pullback')), { kind: 'pullback', from: CORRIDOR, to: BRIDGE, n: 2 });
  assert.deepEqual(plain(r.events.find(e => e.kind === 'charge')), { kind: 'charge', at: CORRIDOR, from: LOCK, mine: 0, stopped: false }, 'it blows on nobody');
  const bridge = chargeDeck(); bridge.hand = BRIDGE;
  const none = resolveDeckTurn(bridge, { stand: BRIDGE, act: 'pullback', order: null }, stay, LOW);
  assert.equal(none.state.hand, BRIDGE, 'from the back section there is nowhere to fall back to');
  assert.ok(!none.events.some(e => e.kind === 'pullback'));
  const asl = deck({ assault: true, boarders: 3, crew: 3, party: 'corsair' });
  asl.sections = [{ mine: 1, theirs: 0, cover: 0 }, { mine: 2, theirs: 0, cover: 0 }, { mine: 0, theirs: 3, cover: 0 }]; asl.hand = CORRIDOR;
  const a = resolveDeckTurn(asl, { stand: CORRIDOR, act: 'pullback', order: null }, boardMove(asl, LOW), LOW);
  assert.deepEqual([a.state.hand, a.state.sections[LOCK].mine], [LOCK, 3], 'boarding her, back is toward her lock, the way we came');
});

test('a pull back on a turn the hand moved is ignored: a section a turn, and ours in a section it was not in stay', () => {
  const st = chargeDeck(); st.hand = BRIDGE; st.sections[CORRIDOR].mine = 2;  // the hand on the bridge, two of ours in the corridor
  const r = resolveDeckTurn(st, { stand: CORRIDOR, act: 'pullback', order: null }, boardMove(st, LOW), LOW);
  assert.equal(r.state.hand, CORRIDOR, 'the hand moved into the corridor and stays there');
  assert.ok(!r.events.some(e => e.kind === 'pullback'), 'no pull back');
  assert.equal(r.state.sections[BRIDGE].mine, st.sections[BRIDGE].mine, 'none of ours came out of the corridor');
});

test('a raider party never shows a charge, and a charge is never feinted', () => {
  const raider = chargeDeck({ party: 'raider' });
  assert.notEqual(boardMove(raider, LOW).kind, 'charge');
  for (const grade of [1, 2]) assert.deepEqual([boardMove({ ...chargeDeck(), grade }, () => 0).kind, boardMove({ ...chargeDeck(), grade }, () => 0).feint], ['charge', false], `grade ${grade}`);
});

// The navy's party (Task 6): each head of theirs put down is counted in the state (the settle charges the standing), holding our bridge is a search,
// and their move is a plain push or hold, never feinted.
const navyDeck = (o = {}) => { const st = deck({ boarders: 4, crew: 3, party: 'navy', ...o }); st.wave = null; return st; };

test('a navy fight counts the heads of theirs it puts down, in the exchange, by the shot, by a steady and by a hatch, and not the wounded', () => {
  assert.equal(navyDeck().navyDown, 0, 'a navy fight starts at none');
  assert.equal(deck().navyDown, undefined, 'a raider fight keeps no count');
  const fought = navyDeck(); fought.sections[LOCK] = worn({ mine: 2, theirs: 2, cover: 0 });  // every head wounded: a hit downs one
  const ex = resolveDeckTurn(fought, { stand: LOCK, act: null, order: null }, stay, HIGH);
  const downed = ex.events.filter(e => e.kind === 'exchange').reduce((n, e) => n + e.theirs, 0);
  assert.ok(downed > 0, 'the exchange downs some of them'); assert.equal(ex.state.navyDown, downed, 'and each is counted');
  const hurt = navyDeck(); hurt.sections[LOCK] = { mine: 1, theirs: 2, mineHurt: 0, theirsHurt: 0, cover: 0 };  // one roll of one hit: a wound, not a head down
  const w = resolveDeckTurn(hurt, { stand: LOCK, act: null, order: null }, stay, () => 0.5);
  assert.deepEqual([w.state.sections[LOCK].theirs, w.state.sections[LOCK].theirsHurt, w.state.navyDown], [2, 1, 0], 'a wound is not counted');
  const shot = navyDeck(); shot.sections[CORRIDOR] = { mine: 1, theirs: 2, mineHurt: 0, theirsHurt: 2, cover: 0 }; shot.hand = CORRIDOR;  // two wounded: the shot of two downs both
  const s = resolveDeckTurn(shot, { stand: CORRIDOR, act: SHOOT, order: null }, stay, LOW);
  assert.deepEqual([s.state.sections[CORRIDOR].theirs, s.state.navyDown], [0, 2], 'the shot');
  const steady = navyDeck(); steady.sections[LOCK].theirs = 2; steady.sections[LOCK].mine = 1;
  const st = resolveDeckTurn(steady, { stand: LOCK, act: { kind: 'steady', odds: 1 }, order: null }, stay, LOW);
  assert.equal(st.state.navyDown, 1, 'a worked steady');
  const hatch = navyDeck(); hatch.hand = BRIDGE; hatch.sections[LOCK].mine = 0;
  const h = resolveDeckTurn(hatch, { stand: BRIDGE, act: null, order: { kind: 'steady', odds: 1, at: LOCK } }, stay, LOW);
  assert.equal(h.state.navyDown, 1, 'a worked steady hatch at their lock');
  assert.equal(resolveDeckTurn(h.state, { stand: BRIDGE, act: null, order: { kind: 'steady', odds: 1, at: LOCK } }, stay, LOW).state.navyDown, 2, 'the count runs on over the turns');
  const raider = deck({ boarders: 4 }); raider.wave = null; raider.hand = BRIDGE;
  assert.equal(resolveDeckTurn(raider, { stand: BRIDGE, act: null, order: { kind: 'steady', odds: 1, at: LOCK } }, stay, LOW).state.navyDown, undefined, 'a raider fight counts nothing');
});

test('a navy party that holds our bridge ends the fight in a search, where a raider party takes the ship', () => {
  const held = party => { const st = deck({ boarders: 4, crew: 3, party }); st.wave = null; st.sections[BRIDGE] = { mine: 0, theirs: 2, mineHurt: 0, theirsHurt: 0, cover: 0 }; return st; };
  assert.equal(deckEnd(held('navy')), 'searched');
  assert.equal(deckEnd(held('raider')), 'taken');
  const capped = held('navy'); capped.sections[BRIDGE].mine = 1; capped.turn = DECK.NAVY_TURNS;
  assert.equal(deckEnd(capped), 'won', 'held off to their cap, an inspection party withdraws: a repel won');
  assert.equal(deckEnd({ ...capped, turn: DECK.NAVY_TURNS - 1 }), null, 'not before it');
  const raider = held('raider'); raider.sections[BRIDGE].mine = 1; raider.turn = DECK.NAVY_TURNS;
  assert.equal(deckEnd(raider), null, 'a raider party fights on to the deck\'s cap');
  const hers = deck({ boarders: 4, crew: 3, party: 'navy', assault: true });  // a navy hull boarded (the owner's game): her crew, not a navy party on our deck
  assert.deepEqual([hers.navyDown, deckCap(hers), deckEnd({ ...hers, sections: hers.sections.map(x => ({ ...x, mine: 0 })) })], [undefined, DECK.TURNS, 'taken'], 'boarding a navy hull is no search, and runs to the deck\'s cap');
});

test('a navy party pushes and holds: it never rushes, never charges, and is never feinted', () => {
  const thin = grade => { const st = navyDeck({ grade, boarders: 6 }); st.sections[LOCK] = { mine: 0, theirs: 4, mineHurt: 0, theirsHurt: 0, cover: 0 }; st.sections[CORRIDOR].mine = 1; st.hand = BRIDGE; return st; };
  for (const grade of [0, 1, 2]) {
    const m = boardMove(thin(grade), () => 0);
    assert.deepEqual([m.kind, m.to, m.feint], ['push', CORRIDOR, false], `grade ${grade}: a push into a thin section, not a rush, and no feint`);
  }
  const next = navyDeck({ grade: 2 }); next.sections[LOCK].mine = 0; next.sections[CORRIDOR].mine = 3; next.hand = BRIDGE;
  assert.deepEqual([boardMove(next, () => 0).kind, boardMove(next, () => 0).feint], ['hold', false], 'next to ours, a hold and not a charge');
  const hers = deck({ boarders: 4, crew: 4, party: 'navy', assault: true, grade: 2 });  // a navy hull's crew boarded (the owner's game) is no navy party on our deck
  assert.equal(boardMove(hers, () => 0).feint, true, 'boarding a navy hull, her veteran crew may feint');
});

// Hold fire (fightui.js DECK_ACTS): the hand stands ready and fires at nobody. The engine does nothing for it: no shot, no ability rolled, and the turn goes as
// it would with no act at all.
test('hold fire fires no shot and rolls nothing: the turn is the one with no act', () => {
  const st = navyDeck(); st.sections[LOCK] = { mine: 2, theirs: 2, mineHurt: 0, theirsHurt: 0, cover: 0 };
  const draws = rand => { let n = 0; return [() => { n++; return rand(); }, () => n]; };
  const [r1, n1] = draws(() => 0.5), [r2, n2] = draws(() => 0.5);
  const held = resolveDeckTurn(st, { stand: LOCK, act: { kind: 'holdfire' }, order: null }, stay, r1), none = resolveDeckTurn(st, { stand: LOCK, act: null, order: null }, stay, r2);
  assert.deepEqual(plain(held), plain(none), 'the same state and events');
  assert.equal(n1(), n2(), 'and the same rolls');
  assert.ok(!held.events.some(e => e.kind === 'shoot' || e.kind === 'steady' || e.kind === 'cover'), 'no shot, no steady, no cover');
  assert.deepEqual(plain(held.state.used), {}, 'the cover is not spent');
});

// Wounds: a hit wounds a head, and downs one only once all are wounded; the shot finishes the wounded; a move takes the unwounded first.
test('hitSide wounds each unwounded head, then downs one a hit', () => {
  const s = { mine: 0, theirs: 3, theirsHurt: 0 };
  assert.deepEqual(plain(hitSide(s, 'theirs', 3)), { downed: 0, wounded: 3 });
  assert.deepEqual([s.theirs, s.theirsHurt], [3, 3], 'three hits wound all three and down none');
  assert.deepEqual(plain(hitSide(s, 'theirs', 1)), { downed: 1, wounded: 0 });
  assert.deepEqual([s.theirs, s.theirsHurt], [2, 2], 'a fourth downs one');
  assert.deepEqual(plain(hitSide(s, 'theirs', 9)), { downed: 2, wounded: 0 }, 'no more than the heads there');
  const ours = { mine: 2, theirs: 0 };
  hitSide(ours, 'mine', 1);
  assert.deepEqual([ours.mine, ours.mineHurt], [2, 1], 'a section without a count starts at none');
});

test('an exchange\'s first hits wound and do not down', () => {
  const st = deck({ boarders: 6, crew: 6 });
  st.sections = st.sections.map(() => ({ mine: 0, theirs: 0, cover: 0 })); st.sections[2].mine = 1;
  st.sections[1] = { mine: 3, theirs: 3, cover: 0 };
  const r = resolveDeckTurn(st, { stand: 2, act: null, order: null }, stay, seq(0.999, 0.999, 0.999, 0.999, 0.999, 0.999));  // two hits a head: six against each side
  const ex = r.events.find(e => e.kind === 'exchange' && e.section === 1);
  assert.deepEqual([ex.theirs, ex.theirsHurt, ex.mine, ex.mineHurt], [3, 0, 3, 0], 'six hits on three heads: all wounded, then all down, so none is said wounded');
  const some = resolveDeckTurn(st, { stand: 2, act: null, order: null }, stay, seq(0.5, 0.5, 0.5, 0.5, 0.5, 0.5));  // one hit a head
  const e = some.events.find(x => x.kind === 'exchange');
  assert.deepEqual([e.theirs, e.theirsHurt, e.mine, e.mineHurt], [0, 3, 0, 3], 'one hit a head wounds three and downs none');
  assert.deepEqual([some.state.sections[1].theirs, some.state.sections[1].theirsHurt], [3, 3], 'wounded heads still stand');
});

test('the wounded a turn says are those still standing at its end: with the downed, never more than the heads there', () => {
  const st = deck({ boarders: 6, crew: 2 }); st.wave = null;  // the review's case: three rush onto the bridge, two of them are downed and all three were wounded
  st.sections = st.sections.map(() => ({ mine: 0, theirs: 0, cover: 0 })); st.sections[LOCK].theirs = 3; st.sections[BRIDGE].mine = 2; st.hand = BRIDGE; st.level = 3; st.party = 'raider';
  const r = resolveDeckTurn(st, { stand: BRIDGE, act: SHOOT, order: null }, { kind: 'rush', from: LOCK, via: CORRIDOR, to: BRIDGE, n: 3, feint: false }, () => 0.999);
  const ex = r.events.find(e => e.kind === 'exchange' && e.section === BRIDGE);
  assert.ok(ex.theirs + ex.theirsHurt <= 3 && ex.mine + ex.mineHurt <= 2, JSON.stringify(ex));
  assert.equal(ex.theirsHurt, r.state.sections[BRIDGE].theirsHurt, 'the one wounded and standing');
  let x = 7;
  const rand = () => { x = (x * 16807) % 2147483647; return x / 2147483647; };  // a seeded stream: many turns of many fights
  for (let k = 0; k < 300; k++) {
    let f = deckFight({ boarders: 4 + (k % 7), crew: 2 + (k % 4), cover: [0, 1, 0, 1], assault: k % 3 === 0, side: k % 2 === 0, level: k % 4, party: 'raider' });
    for (let t = 0; t < DECK.TURNS && !deckEnd(f); t++) {
      const near = [f.hand, ...ADJ[f.hand].filter(i => f.sections[i])], stand = near[Math.floor(rand() * near.length)];
      const res = resolveDeckTurn(f, { stand, act: { kind: 'shoot', at: near[Math.floor(rand() * near.length)] }, order: null }, boardMove(f, rand), rand);
      const wave = res.events.find(e => e.kind === 'wave');
      for (const e of res.events.filter(y => y.kind === 'exchange')) {
        const end = res.state.sections[e.section], landed = wave && e.section === LOCK ? wave.n : 0;
        assert.ok(e.theirs + e.theirsHurt <= end.theirs - landed + e.theirs && e.theirsHurt <= (end.theirsHurt || 0), `theirs: ${JSON.stringify(e)}`);
        assert.ok(e.mine + e.mineHurt <= end.mine + e.mine && e.mineHurt <= (end.mineHurt || 0), `ours: ${JSON.stringify(e)}`);
      }
      f = res.state;
    }
  }
});

test('the shot downs a wounded head before it wounds another', () => {
  const base = () => { const st = deck({ boarders: 6, crew: 6 }); st.wave = null; st.sections[0] = { mine: 2, theirs: 4, theirsHurt: 1, cover: 0 }; return st; };
  const low = seq(0, 0, 0, 0, 0, 0), at = (rand, st = base()) => resolveDeckTurn(st, { stand: 0, act: SHOOT, order: null }, stay, rand);
  const one = at(low, Object.assign(base(), { level: 0 }));  // a shot of one head
  assert.deepEqual([one.state.sections[0].theirs, one.state.sections[0].theirsHurt], [3, 0], 'one head of shot: the wounded one is down, none newly wounded');
  const three = at(low);  // level 2: two to three heads, rolled at the bottom: two
  assert.deepEqual([three.state.sections[0].theirs, three.state.sections[0].theirsHurt], [3, 1], 'a second head of shot wounds one');
  const ev = three.events.find(e => e.kind === 'exchange');
  assert.deepEqual([ev.theirs, ev.theirsHurt], [1, 1], 'the events say both');
});

test('the shot goes a head at a time: a head it has just wounded may be downed by the next', () => {
  const s = { mine: 0, theirs: 3, theirsHurt: 1 };
  assert.deepEqual(plain(shootSide(s, 'theirs', 3)), { downed: 2, wounded: 1 });
  assert.deepEqual([s.theirs, s.theirsHurt], [1, 0], 'one wounded and two unwounded, three shots: two down, one wounded then downed');
  const t = { mine: 0, theirs: 2, theirsHurt: 0 };
  assert.deepEqual(plain(shootSide(t, 'theirs', 1)), { downed: 0, wounded: 1 }); assert.deepEqual([t.theirs, t.theirsHurt], [2, 1]);
  assert.deepEqual(plain(shootSide(t, 'theirs', 9)), { downed: 2, wounded: 1 }, 'no more than the heads there'); assert.deepEqual([t.theirs, t.theirsHurt], [0, 0]);
});

test('from level 2 a shot may go to a section next to the hand; at level 1 it falls back to the hand\'s', () => {
  const play = (level, at) => {
    const st = deck({ boarders: 6, crew: 6, level }); st.wave = null;
    st.sections = st.sections.map(() => ({ mine: 0, theirs: 0, cover: 0 })); st.sections[0] = { mine: 2, theirs: 3, cover: 0 }; st.sections[1] = { mine: 0, theirs: 3, cover: 0 }; st.hand = 0;
    const r = resolveDeckTurn(st, { stand: 0, act: { kind: 'shoot', at }, order: null }, { kind: 'hold', from: 2, to: 2, n: 0 }, () => 0);
    return plain(r.state.sections.slice(0, 2).map(s => [s.theirs, s.theirsHurt || 0]));
  };
  assert.deepEqual(play(2, 1), [[3, 0], [2, 0]], 'next to the hand: the corridor takes the shot (two heads: wound one, down it)');
  assert.deepEqual(play(1, 1), [[3, 1], [3, 0]], 'at level 1 the same aim is the hand\'s own section');
  assert.deepEqual(play(2, 2), [[2, 0], [3, 0]], 'two away is out of reach at any level');
  assert.deepEqual(play(2, 0), [[2, 0], [3, 0]], 'the hand\'s own at any level');
  const bare = deck({ boarders: 6, crew: 6 }); bare.wave = null;
  assert.deepEqual(plain(resolveDeckTurn(bare, { stand: 0, act: 'shoot', order: null }, stay, () => 0).state.sections[0].theirs), 2, 'a bare shoot is at the hand\'s section');
});

test('a push takes the unwounded first and leaves the wounded behind; a wave lands unwounded', () => {
  const st = deck({ boarders: 6, crew: 6 });
  st.sections = st.sections.map(() => ({ mine: 0, theirs: 0, cover: 0 })); st.sections[2].mine = 1; st.hand = 2;
  st.sections[0] = { mine: 0, theirs: 3, theirsHurt: 1, cover: 0 };
  st.wave = { n: 2, turn: 1 };
  const r = resolveDeckTurn(st, { stand: 2, act: null, order: null }, { kind: 'push', from: 0, to: 1, n: 2, feint: false }, () => 0);
  const S = r.state.sections;
  assert.deepEqual([S[0].theirs, S[0].theirsHurt, S[1].theirs, S[1].theirsHurt], [1 + 2, 1, 2, 0], 'two unwounded go; the wounded one stays (and the wave lands beside it)');
  assert.deepEqual([S[0].theirs, S[0].theirsHurt], [3, 1], 'the wave landed unwounded');
  const wounded = deck({ boarders: 6, crew: 6 });
  wounded.sections = wounded.sections.map(() => ({ mine: 0, theirs: 0, cover: 0 })); wounded.sections[2].mine = 1; wounded.hand = 2; wounded.wave = null;
  wounded.sections[0] = { mine: 0, theirs: 3, theirsHurt: 3, cover: 0 };
  const w = resolveDeckTurn(wounded, { stand: 2, act: null, order: null }, { kind: 'push', from: 0, to: 1, n: 2, feint: false }, () => 0).state.sections;
  assert.deepEqual([w[0].theirsHurt, w[1].theirsHurt], [1, 2], 'with only the wounded left, they go');
});

// The ladder reaches level 5 (#963): the deck fight's sidearm table covers every level the hand can hold, and a level past it reads the last row.
test('the sidearm table covers five levels, and a level past the table takes its last row', () => {
  const { DECK, sidearmOf } = load(['js/data.js', 'js/range.js', 'js/sheet.js', 'js/handtohand.js', 'js/boarders.js', 'js/shipcombat.js', 'js/fight.js'], { Mods: { register() {} } }, ['DECK', 'sidearmOf']);
  assert.ok(DECK.SIDEARM_BY_LEVEL.length >= 6, `rows for levels 0 to 5: ${DECK.SIDEARM_BY_LEVEL.length}`);
  for (let l = 0; l <= 5; l++) { const [lo, hi] = sidearmOf({ level: l }); assert.ok(lo >= 1 && hi >= lo, `level ${l}: ${lo} to ${hi}`); }
  assert.deepEqual([...sidearmOf({ level: 9 })], [...DECK.SIDEARM_BY_LEVEL[DECK.SIDEARM_BY_LEVEL.length - 1]]);
  const rows = DECK.SIDEARM_BY_LEVEL; for (let l = 1; l < rows.length; l++) assert.ok(rows[l][1] >= rows[l - 1][1], 'a higher level shoots no worse');
});
