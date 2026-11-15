'use strict';

// The hand's ship fight wears and reads fire control and point defence (#1135, #1208), as the owner's fight does (duel.js): the guns hit by
// perf('fire') and the hull stands by perf('pd'), times what the fitted parts give (parts.js partFight); each salvo the ship fires wears fire
// control and each hit she takes wears the point defence.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

const setup = () => {
  window.handFight = (fresh = true) => {
    if (fresh) { startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester' }); while (G.dialog) finishEvent(); }
    hired().raidTold = true; G.nextEvent = null;
    startShipFight({ kind: 'pirate', gov: 'Arcology Pact', shipId: 'raider' }, false);
    const e = G.nextEvent; G.nextEvent = null; return e.fight;
  };
};

test('a worn fire control and worn point defence weaken the hand\'s ship in a fight, and a fitted part\'s fight numbers count', async () => {
  const { ev, done } = await open();
  await ev(setup);
  const r = await ev(() => {
    Settings.wear = 'slow';
    const fresh = handFight(), base = { dmg: fresh.state.me.dmgMult, armor: fresh.state.me.maxArmor };
    const c = condition(); c.fire = 50; c.pd = 50;
    const worn = handFight(false);
    return { base, worn: { dmg: worn.state.me.dmgMult, armor: worn.state.me.maxArmor }, perfFire: perf('fire'), perfPd: perf('pd'), want: Math.round(ship().armor * perf('pd') * FIGHT.POOL) };
  });
  await done();
  assert.ok(r.perfFire < 1 && r.perfPd < 1);
  assert.ok(Math.abs(r.worn.dmg - r.base.dmg * r.perfFire) < 1e-9, `the guns by perf('fire') (${r.worn.dmg} against ${r.base.dmg})`);
  assert.equal(r.worn.armor, r.want, 'the hull by perf(pd)'); assert.ok(r.worn.armor < r.base.armor, 'less hull');
});

test('a fitted part\'s fight numbers reach the hand\'s side', async () => {
  const { ev, done } = await open();
  await ev(setup);
  const r = await ev(() => {
    const a = handFight().state.me;
    fitPart(G.state, 'fire', 'used', { id: 't', system: 'fire', from: 'test', plus: { fight: { dmgMult: 1.1 } }, minus: { wear: 1.2 } }, G.state.day);
    const b = handFight(false).state.me;
    return { a: a.dmgMult, b: b.dmgMult };
  });
  await done();
  assert.ok(Math.abs(r.b - r.a * 1.1) < 1e-9, `${r.b} against ${r.a}`);
});

test('a turn\'s salvos wear fire control and the hits she takes wear the point defence; with wear off nothing wears', async () => {
  const { ev, done } = await open();
  await ev(setup);
  const r = await ev(() => {
    const s = handFight(), c = condition(), out = {};
    const events = [{ who: 'me', foe: 0, part: 'weapons', dmg: 5 }, { who: 'me', foe: 0, part: 'weapons', dmg: 5 }, { who: 'me', foe: 0, part: 'hull', dmg: 5 },
      { who: 'foe', foe: 0, part: 'hull', dmg: 1 }, { who: 'foe', foe: 0, part: 'hull', dmg: 1 }];
    Settings.wear = 'slow'; c.fire = 90; c.pd = 90; fightTook(s, events); out.fire = 90 - c.fire; out.pd = 90 - c.pd;
    Settings.wear = 'off'; c.fire = 90; c.pd = 90; fightTook(s, events); out.offFire = 90 - c.fire; out.offPd = 90 - c.pd; Settings.wear = 'slow';
    return out;
  });
  await done();
  assert.ok(Math.abs(r.fire - 1.2) < 1e-9, `three salvos wear fire control 1.2, a turn's share of the owner's fight (${r.fire})`);
  assert.ok(Math.abs(r.pd - 1.8) < 1e-9, `two hits wear the point defence 1.8 (${r.pd})`);
  assert.equal(r.offFire, 0); assert.equal(r.offPd, 0);
});
