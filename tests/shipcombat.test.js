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
  assert.deepEqual(r.plain.me, [180, 260, 180], 'the hauler: 180 shields, 260 armor, and slow (accel 100 times turn 1.8)');
  assert.deepEqual(r.plain.her, [70, 60, 828], 'the raider: thin, and four times as quick');
  assert.deepEqual(r.fitted, [230, 300], 'a deflector capacitor and armor plating, +50 and +40');
  assert.equal(r.worn, 100, 'the fight starts from the hull the ship has');
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
  assert.deepEqual(r.vet, [120, 192, 1, 1.3], 'a veteran: thirty percent more hull a grade, fifteen percent more punch'); assert.deepEqual(r.pair, [2, true]);
  await done();
});

test('boarders come by her ship, her crew and her company, try what her ship tries, and your ship is the ground', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const st = setup(), out = {}, raider = foe('raider').foe, corsair = foe('corsair').foe;
    out.raider = boardersFor(raider, 'half'); out.corsair = boardersFor(corsair, 'half'); out.full = boardersFor(raider, 'full');
    out.vet = boardersFor(raider, 'half', { grade: 2 }); out.pair = boardersFor(raider, 'half', { pack: true });
    // what they try, and a veteran's counter
    const sFor = (f, grade) => ({ d: { foe: f }, grade, assault: false });
    const tally = (f, n = 600) => { const t = { rush: 0, hold: 0, flank: 0 }; for (let i = 0; i < n; i++) t[pickWeighted(foeLean(sFor(f, 0)))]++; return t; };
    const r1 = tally(raider), c1 = tally(corsair); out.raiderRush = r1.rush > r1.hold * 1.1; out.corsairHold = c1.hold > c1.rush * 1.1;
    out.counter = counterOf(REPEL_TACTICS, 'hold') === 'rush' && counterOf(REPEL_TACTICS, 'rush') === 'flank' && counterOf(REPEL_TACTICS, 'flank') === 'hold';
    // a veteran crew counters your tactic outright some of the time
    const sv = repelStart({ foe: corsair, foeHp: 0, grade: 2 }, 'full'); out.gradeKept = sv.grade === 2;
    let hits = 0; const real = Math.random; for (let i = 0; i < 400; i++) { const d0 = repelStart({ foe: corsair, foeHp: 0, grade: 2 }, 'half'); const before = d0.pos; Math.random = real; repelStep(d0, 'hold'); G.nextEvent = null; if (d0.pos > before) hits++; }
    out.vetBeatsHold = hits / 400;
    const s0 = repelStart({ foe: corsair, foeHp: 0 }, 'half'); let h0 = 0; for (let i = 0; i < 400; i++) { const d1 = repelStart({ foe: corsair, foeHp: 0 }, 'half'); const b = d1.pos; repelStep(d1, 'hold'); G.nextEvent = null; if (d1.pos > b) h0++; }
    out.plainBeatsHold = h0 / 400;
    // the ship: long, standard, cramped
    st.shipId = 'freighter'; out.long = [layoutEdge('flank'), layoutEdge('rush'), layoutHint()];
    st.shipId = 'shuttle'; out.small = [layoutEdge('flank'), layoutEdge('rush'), layoutHint()];
    st.shipId = 'lightfreighter'; out.mid = [layoutEdge('flank'), layoutEdge('rush'), layoutHint()];
    st.shipId = 'freighter'; out.text = /long, with room to go round/.test(repelScene(repelStart({ foe: raider, foeHp: 0 }, 'half')).text);
    out.assault = assaultStart(corsair, { grade: 1, pack: false }).boarders > assaultStart(corsair).boarders;
    return out;
  });
  assert.ok(r.corsair > r.raider, 'a corsair carries more'); assert.equal(r.full, r.raider + 2); assert.ok(r.vet > r.raider && r.pair === r.raider + 2);
  assert.ok(r.raiderRush && r.corsairHold && r.counter && r.gradeKept);
  assert.ok(r.vetBeatsHold > r.plainBeatsHold + 0.08 || r.vetBeatsHold > 0.35, `a veteran counters: ${r.vetBeatsHold} against ${r.plainBeatsHold}`);
  assert.deepEqual(r.long.slice(0, 2), [0.15, -0.1]); assert.match(r.long[2], /long/);
  assert.deepEqual(r.small.slice(0, 2), [-0.15, 0.15]); assert.match(r.small[2], /cramped/); assert.deepEqual(r.mid, [0, 0, '']);
  assert.ok(r.text); assert.ok(r.assault);
  await done();
});
