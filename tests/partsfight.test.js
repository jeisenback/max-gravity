'use strict';

// The hand's ship fight wears and reads fire control and shields (#1135), as the owner's fight does (duel.js): the guns hit by perf('fire') and
// the shields stand by perf('shields'), times what the fitted parts give (parts.js partFight); each salvo the ship fires wears fire control and
// each hit she takes wears the shields.

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

test('a worn fire control and worn shields weaken the hand\'s ship in a fight, and a fitted part\'s fight numbers count', async () => {
  const { ev, done } = await open();
  await ev(setup);
  const r = await ev(() => {
    Settings.wear = 'slow';
    const fresh = handFight(), base = { dmg: fresh.state.me.dmgMult, shields: fresh.state.me.maxShields };
    const c = condition(); c.fire = 50; c.shields = 50;
    const worn = handFight(false);
    return { base, worn: { dmg: worn.state.me.dmgMult, shields: worn.state.me.maxShields }, perfFire: perf('fire'), perfShields: perf('shields'), want: Math.round(ship().shields * perf('shields') * FIGHT.POOL) };
  });
  await done();
  assert.ok(r.perfFire < 1 && r.perfShields < 1);
  assert.ok(Math.abs(r.worn.dmg - r.base.dmg * r.perfFire) < 1e-9, `the guns by perf('fire') (${r.worn.dmg} against ${r.base.dmg})`);
  assert.equal(r.worn.shields, r.want, 'the shields by perf(shields)'); assert.ok(r.worn.shields < r.base.shields, 'fewer shields');
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

test('a turn\'s salvos wear fire control and the hits she takes wear the shields; with wear off nothing wears', async () => {
  const { ev, done } = await open();
  await ev(setup);
  const r = await ev(() => {
    const s = handFight(), c = condition(), out = {};
    const events = [{ who: 'me', foe: 0, part: 'weapons', dmg: 5 }, { who: 'me', foe: 0, part: 'weapons', dmg: 5 }, { who: 'me', foe: 0, part: 'hull', dmg: 5 },
      { who: 'foe', foe: 0, part: 'hull', dmg: 1 }, { who: 'foe', foe: 0, part: 'hull', dmg: 1 }];
    Settings.wear = 'slow'; c.fire = 90; c.shields = 90; fightTook(s, events); out.fire = 90 - c.fire; out.shields = 90 - c.shields;
    Settings.wear = 'off'; c.fire = 90; c.shields = 90; fightTook(s, events); out.offFire = 90 - c.fire; out.offShields = 90 - c.shields; Settings.wear = 'slow';
    return out;
  });
  await done();
  assert.ok(Math.abs(r.fire - 1.2) < 1e-9, `three salvos wear fire control 1.2, a turn's share of the owner's fight (${r.fire})`);
  assert.ok(Math.abs(r.shields - 1.8) < 1e-9, `two hits wear the shields 1.8 (${r.shields})`);
  assert.equal(r.offFire, 0); assert.equal(r.offShields, 0);
});
