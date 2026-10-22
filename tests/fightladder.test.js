'use strict';

// The ladder of chapter 1's fights (js/fightladder.js, #810), in plain Node: which fight is due on a burn, what has been met, and what a random contact may be.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./nodecontext');

const world = { runs: 0, beats: false };
const { FIGHT_LADDER, LADDER_RANDOM, ladderNext, ladderDone, ladderMet, ladderPirate } = load(['js/data.js', 'js/fightladder.js'], {
  runTotals: h => ({ runs: world.runs }), captainBeatsDone: () => world.beats,
}, ['FIGHT_LADDER', 'LADDER_RANDOM', 'ladderNext', 'ladderDone', 'ladderMet', 'ladderPirate']);
const plain = x => JSON.parse(JSON.stringify(x));  // out of the context's realm
const st = { systemId: 'ceres', day: 50, credits: 0 };
const next = (h, s = st, to = 'pallas') => { const n = ladderNext(h, s, to); return n && plain(n); };
const walk = h => { const n = next(h); if (n) ladderDone(h, n.id); return n && n.id; };

test('the steps come in order, each when its condition holds', () => {
  const h = {};
  assert.deepEqual(plain(FIGHT_LADDER.map(s => s.id)), ['raider', 'corsair', 'cutter', 'pair', 'setpiece']);
  world.runs = 0; world.beats = false;
  assert.equal(next(h), null, 'nothing before the first run');
  world.runs = 1; assert.equal(walk(h), 'raider');
  assert.equal(next(h), null, 'the corsair waits for the third run');
  world.runs = 3; assert.equal(walk(h), 'corsair');
  assert.equal(next(h), null, 'the cutter waits for the captain\'s scenes');
  world.beats = true; const c = next(h);
  assert.deepEqual(c.spec, { kind: 'patrol', shipId: 'cutter', gov: 'Charter League', ladder: 'cutter' }, 'the gov of the system the burn leaves');
  assert.equal(walk(h), 'cutter');
  assert.equal(next(h), null, 'the pair waits for the offer of a ship');
  h.deal = { price: 90000, until: 80 };
  const p = next(h); assert.equal(p.id, 'pair'); assert.deepEqual(p.spec, { kind: 'pirate', shipId: 'raider', pack: true, ladder: 'pair' }); walk(h);
  assert.equal(next(h), null, 'the set piece waits for the money');
  const rich = { ...st, credits: 90000 };
  assert.deepEqual(next(h, rich).spec, { kind: 'pirate', shipId: 'corsair', grade: 2, ladder: 'setpiece' });
  assert.equal(next(h, { ...rich, day: 81 }), null, 'a lapsed deal is no set piece');
  ladderDone(h, 'setpiece');
  assert.equal(next(h, rich), null, 'the chapter is done; the ladder is empty and nothing throws');
});

test('the raider is not due on a burn from Earth to Earth, and the cutter takes the other end\'s gov, or waits', () => {
  const h = { fights: { done: [] } }; world.runs = 1; world.beats = false;
  assert.equal(next(h, { ...st, systemId: 'earth' }, 'earth'), null, 'a burn within Earth\'s own space waits');
  assert.equal(next(h, { ...st, systemId: 'earth' }, 'mars').id, 'raider');
  world.beats = true; h.fights.done.push('raider', 'corsair');
  assert.equal(next(h, { ...st, systemId: 'mercury' }, 'mars').spec.gov, 'Dome Concord');
  assert.equal(next(h, { ...st, systemId: 'earth' }, 'mars').spec.gov, 'Arcology Compact');
  assert.equal(next(h, { ...st, systemId: 'mercury' }, 'mercury'), null, 'no navy at either end: the cutter waits');
});

test('with no hand the ladder is never asked, and an old save with no record is made one', () => {
  assert.equal(ladderNext(null, st, 'mars'), null); assert.equal(ladderNext(undefined, st, 'mars'), null);
  assert.deepEqual(plain(ladderMet(null)), []);
  const h = {}; ladderDone(h, 'raider'); ladderDone(h, 'raider');
  assert.deepEqual(plain(h.fights), { done: ['raider'] }, 'once');
});

test('what is met is the ship ids of the steps done, and random contacts draw only from the types met', () => {
  assert.equal(LADDER_RANDOM, 0.5);
  assert.deepEqual(plain(ladderMet({})), []); assert.equal(ladderPirate({}, 0.3), null, 'nothing met, no random pirate');
  const h = { fights: { done: ['raider'] } };
  assert.deepEqual(plain(ladderMet(h)), ['raider']);
  for (let i = 0; i < 200; i++) assert.equal(ladderPirate(h, Math.random()), 'raider');
  h.fights.done.push('corsair', 'cutter', 'pair');
  assert.deepEqual(plain(ladderMet(h)), ['raider', 'corsair', 'cutter'], 'each once');
  const seen = new Set(); for (let i = 0; i < 200; i++) seen.add(ladderPirate(h, i / 200));
  assert.deepEqual([...seen].sort(), ['corsair', 'raider'], 'the cutter is met only as a patrol');
  assert.equal(ladderPirate({ fights: { done: ['cutter'] } }, 0.5), null);
});
