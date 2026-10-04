'use strict';

// Ship against ship in a raid (js/shipcombat.js): the ships move the odds, pirate crews differ, and pairs hunt on bad lanes.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

const helpers = () => {
  window.setup = (post = 'gunner') => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post, captainKey: 'hester' }); while (G.dialog) finishEvent();
    const st = G.state; st.story.next = 1e9; st.day += 30; G.mode = 'landed';
    return st;
  };
  window.foe = (shipId, extra = {}) => { const f = makeEnemy({ kind: 'pirate' }); Object.assign(f, { shipId, armor: SHIPS[shipId].armor, maxArmor: SHIPS[shipId].armor }); return { spec: { kind: 'pirate' }, foe: f, style: 'grapple', edge: 0, beat: 0, hurt: new Set(), dead: [], marked: [], grade: 0, pack: false, ...extra }; };
};

test('a slow hauler against a raider is out-turned and out-lasts her, and the odds say so', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const st = setup(), out = {}, s = foe('raider'), p = raidProfile(s);
    out.mob = p.mob; out.tough = p.tough; out.gun = p.gun; out.read = raidRead(s);
    out.burn = shipOdds(s, 'burn', null, 0.7); out.screen = shipOdds(s, 'screen', null, 0.6); out.hold = shipOdds(s, 'hold', null, 1);
    out.pilot = shipOdds(s, 'post', 'pilot', 0.5); out.engineer = shipOdds(s, 'post', 'engineer', 0.5); out.comms = shipOdds(s, 'post', 'comms', 0.5);
    st.shipId = 'courier'; out.courierBurn = shipOdds(s, 'burn', null, 0.7);
    st.shipId = 'gunship'; out.gunshipFire = shipOdds(s, 'fire', null, 0.5);
    return out;
  });
  assert.ok(r.mob < 0.6 && r.tough > 1.5); assert.match(r.read, /faster than you/); assert.match(r.read, /take a good deal more/);
  assert.ok(r.burn < 0.7, 'a slow ship burns badly'); assert.ok(r.screen > 0.6, 'a tough one screens well'); assert.equal(r.hold, 1);
  assert.ok(r.pilot < 0.5 && r.engineer > 0.5 && r.comms === 0.5);
  assert.ok(r.courierBurn > r.burn, 'a courier burns better'); assert.ok(r.gunshipFire > 0.5, 'three guns return fire better');
  await done();
});

test('pirate crews differ by the lane: veterans are tougher and harder on the odds, and pairs hunt on a bad lane', async () => {
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
    const base = foe('corsair'), vet = foe('corsair', { grade: 2 }), pair = foe('raider', { pack: true });
    out.vetOdds = shipOdds(vet, 'fire', null, 0.5) < shipOdds(base, 'fire', null, 0.5); out.vetPunch = foePunch(vet) > foePunch(base);
    out.punchGuns = foePunch(foe('corsair')) > foePunch(foe('raider')); out.pairPunch = foePunch(pair) > foePunch(foe('raider'));
    const v = foe('raider'); const armor0 = v.foe.maxArmor; v.grade = 0; v.spec = { kind: 'pirate' };
    return { ...out, armorUp: (() => { const w = foe('raider'); w.edge = 0; G.transit = { to, total: 1, left: 1 }; worldOf(to).unrest = 0.9; for (let i = 0; i < 400 && !w.grade; i++) { w.foe.armor = w.foe.maxArmor = SHIPS.raider.armor; rateFoe(w); } const up = w.grade ? w.foe.maxArmor > SHIPS.raider.armor : true; G.transit = null; return up; })() };
  });
  assert.ok(r.bad.grade > r.calm.grade * 2, `grade ${r.calm.grade} to ${r.bad.grade}`); assert.ok(r.bad.packs > 0.2 && r.calm.packs === 0, `packs ${r.calm.packs} / ${r.bad.packs}`);
  assert.ok(r.vetOdds && r.vetPunch && r.punchGuns && r.pairPunch && r.armorUp);
  await done();
});
