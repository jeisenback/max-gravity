'use strict';

// Ship against ship (js/shipcombat.js, js/fightui.js): the fight's two sides are the two ships, pirate crews differ, and pairs hunt on bad lanes.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

const helpers = () => {
  window.setup = (post = 'gunner') => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post, captainKey: 'hester' }); while (G.dialog) finishEvent();
    const st = G.state; st.story.next = 1e9; st.day += 30; G.mode = 'landed'; hired().raidTold = true;  // the first fight's explanation is out of the way
    return st;
  };
  window.foe = (shipId, extra = {}) => { const f = makeEnemy({ kind: 'pirate' }); Object.assign(f, { shipId, armor: SHIPS[shipId].armor, maxArmor: SHIPS[shipId].armor }); return { spec: { kind: 'pirate' }, foe: f, style: 'grapple', edge: 0, beat: 0, hurt: new Set(), dead: [], marked: [], grade: 0, pack: false, ...extra }; };
};

test('the fight\'s sides are the two ships: a slow hauler is out-turned by a raider and out-lasts her, and the outfits lengthen the bars', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const st = setup(), out = {}, f = foe('raider').foe; window.makeEnemy = () => f; window.rateFoe = s => { s.grade = 0; s.pack = false; return s; };
    const side = () => { G.nextEvent = null; startShipFight({ kind: 'pirate' }, false); const s = G.nextEvent.fight.state; G.nextEvent = null; return s; };
    const a = side(); out.plain = { me: [a.me.shields, a.me.armor, a.me.speed], her: [a.foes[0].shields, a.foes[0].armor, a.foes[0].speed] };
    st.outfits.armor = 1; st.outfits.shield = 1; st.armor = ship().armor;
    const b = side(); out.fitted = [b.me.maxShields, b.me.maxArmor];
    st.armor = 100; out.worn = side().me.armor;
    return out;
  });
  assert.deepEqual(r.plain.me, [81, 117, 180], 'the hauler: 180 shields and 260 armor (81 and 117 at FIGHT.POOL 0.45), and slow (accel 100 times turn 1.8)');
  assert.deepEqual(r.plain.her, [32, 27, 828], 'the raider: thin (70 and 60), and four times as quick');
  assert.deepEqual(r.fitted, [104, 135], 'a deflector capacitor and armor plating, +50 and +40: 230 and 300, at FIGHT.POOL');
  assert.equal(r.worn, 45, 'the fight starts from the hull the ship has: 100, at FIGHT.POOL');
  await done();
});

test('pirate crews differ by the lane: veterans have a longer hull and a harder punch, and pairs hunt on a bad lane', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const st = setup(), out = {}, to = Object.keys(SYSTEMS).find(id => id !== st.systemId);
    const sample = d => {
      worldOf(st.systemId).unrest = d; worldOf(to).unrest = d; G.transit = { to, total: 100, left: 100 }; G.mode = 'transit';
      let grades = 0, packs = 0, n = 800;
      for (let i = 0; i < n; i++) { const s = foe('raider'); rateFoe(s); grades += s.grade; if (s.pack) packs++; }
      G.transit = null; G.mode = 'landed';
      return { grade: grades / n, packs: packs / n };
    };
    out.calm = sample(0.02); out.bad = sample(0.35);
    // a veteran's side is longer and hits harder, and a pair is two ships on the board, one of which fires first
    const side = (shipId, grade, pack) => { const f = foe(shipId).foe; window.makeEnemy = () => f; window.rateFoe = s => { s.grade = grade; s.pack = pack; if (pack) s.edge -= 1; return s; }; G.nextEvent = null; startShipFight({ kind: 'pirate' }, false); const s = G.nextEvent.fight.state; G.nextEvent = null; return s; };
    const base = side('corsair', 0, false), vet = side('corsair', 2, false), pair = side('raider', 0, true);
    out.vet = [base.foes[0].maxArmor, vet.foes[0].maxArmor, base.foes[0].dmgMult, vet.foes[0].dmgMult];
    out.pair = [pair.foes.length, /She fires first/.test(pair.log.join(' '))];
    return out;
  });
  assert.ok(r.bad.grade > r.calm.grade * 2, `grade ${r.calm.grade} to ${r.bad.grade}`); assert.ok(r.bad.packs > 0.2 && r.calm.packs === 0, `packs ${r.calm.packs} / ${r.bad.packs}`);
  assert.deepEqual(r.vet, [54, 86, 1, 1.3], 'a veteran: thirty percent more hull a grade (120 and 192, at FIGHT.POOL), fifteen percent more punch'); assert.deepEqual(r.pair, [2, true]);
  await done();
});

test('boarders come by her ship, her crew and her company, and a veteran crew is kept on the deck fight', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    setup(); const out = {}, raider = foe('raider').foe, corsair = foe('corsair').foe;
    out.raider = boardersFor(raider, 'half'); out.corsair = boardersFor(corsair, 'half'); out.full = boardersFor(raider, 'full'); out.hers = boardersFor(raider, 'full', { assault: true });
    out.vet = boardersFor(raider, 'half', { grade: 2 }); out.pair = boardersFor(raider, 'half', { pack: true }); out.pairFull = boardersFor(raider, 'full', { pack: true });
    out.gradeKept = repelStart({ foe: corsair, foeHp: 0, grade: 2 }, 'full').state.grade;
    out.assault = assaultStart(corsair, { grade: 1, pack: false }).state.began > assaultStart(corsair).state.began;
    return out;
  });
  assert.ok(r.corsair > r.raider, 'a corsair carries more'); assert.equal(r.full, r.raider + 4, 'a full run brings DECK.FULL more'); assert.equal(r.hers, r.raider + 5, 'and aboard her DECK.ASSAULT.FULL more'); assert.ok(r.vet > r.raider && r.pair === r.raider + 2); assert.equal(r.pairFull, r.pair + 2, 'a pair\'s full run brings DECK.FULL_PAIR more');
  assert.equal(r.gradeKept, 2, 'the grade is the deck fight\'s, for its feint'); assert.ok(r.assault);
  await done();
});
