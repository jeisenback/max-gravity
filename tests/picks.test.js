'use strict';

// The post ladders (js/picks.js, docs/superpowers/specs/2026-11-08-post-ladders-design.md): the pick table, a rung due at a level, what shuts a
// pick, taking one, and the edge and the perks the taken picks give. Plain Node through tests/nodecontext.js; the career record is built by hand.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./nodecontext');

const NAMES = ['PICKS', 'PICK_LEVELS', 'picksFor', 'takenPicks', 'pickDue', 'pickOpen', 'takePick', 'pickEdge', 'hasPerk', 'DIFFICULTY', 'STATS', 'STAT_MAX'];
const api = load(['js/data.js', 'js/util.js', 'js/sheet.js', 'js/picks.js'], { OPINION: { TRUSTED: 3 } }, NAMES);
const { PICKS, PICK_LEVELS, picksFor, takenPicks, pickDue, pickOpen, takePick, pickEdge, hasPerk, DIFFICULTY, STATS, STAT_MAX } = api;

test('the table has two picks at each of five levels at each post, with unique ids and sound kinds', () => {
  assert.equal(PICK_LEVELS, 5);
  for (const post of ['gunner', 'pilot', 'engineer', 'comms']) for (let l = 1; l <= 5; l++) {
    const two = picksFor(post, l); assert.equal(two.length, 2, `${post} ${l}`);
    for (const p of two) {
      assert.equal(p.post, post); assert.equal(p.level, l); assert.ok(p.name && p.text, `${p.id} has a name and words`);
      assert.ok(['move', 'edge', 'perk', 'stat'].includes(p.kind), `${p.id}: a kind`);
      if (p.kind === 'edge') assert.ok(Object.keys(p.adds).length && Object.keys(p.adds).every(k => k in DIFFICULTY), `${p.id}: an edge on a kind of roll`);
      if (p.kind === 'stat') assert.ok(STATS.includes(p.stat), `${p.id}: a stat`);
      if (p.kind === 'move') assert.equal(typeof p.move, 'string');
      if (p.kind === 'perk') assert.equal(typeof p.perk, 'string');
    }
  }
  const ids = Object.keys(PICKS); assert.equal(ids.length, 40); assert.equal(new Set(ids).size, 40);
  assert.ok(ids.every(id => PICKS[id].id === id), 'each pick knows its id');
});

test('a rung is due once its level is reached and until one of its picks is taken; a hurt level offers less', () => {
  const c = { post: 'gunner', sheet: { hands: 3, eye: 4, nerve: 3, wit: 4 }, picks: [] };
  assert.equal(pickDue(c, 0), 0); assert.equal(pickDue(c, 2), 1);
  assert.ok(takePick(c, 'steady-eye')); assert.equal(pickDue(c, 2), 2); assert.equal(pickDue(c, 1), 0, 'a hurt hand at level 1 has no rung waiting');
  assert.equal(takePick(c, 'vent'), null, 'one pick a rung'); assert.equal(takenPicks(c).join(), 'steady-eye');
  assert.equal(takenPicks(null).length, 0, 'no career, no picks');
});

test('a move with a teacher needs the teacher aboard and trusting; one without is known when taken; a stat at the max is shut', () => {
  const c = { post: 'gunner', sheet: { hands: 3, eye: 5, nerve: 3, wit: 4 }, picks: [], moves: [] };
  const vent = PICKS.vent, none = { teacher: () => null, opinionOf: () => 0 }, cold = { teacher: () => ({ id: 'tomas', first: 'Tomas' }), opinionOf: () => 1 }, warm = { teacher: () => ({ id: 'tomas', first: 'Tomas' }), opinionOf: () => 3 };
  assert.match(pickOpen(vent, c, none), /not aboard/); assert.match(pickOpen(vent, c, cold), /does not trust/); assert.equal(pickOpen(vent, c, warm), true);
  assert.match(pickOpen(PICKS['gunner-eye'], c, warm), /as sharp as it gets/);
  assert.ok(takePick(c, 'called-shot')); assert.ok(c.moves.includes('called-shot'), 'no teacher: known when taken');
  assert.ok(takePick(c, 'vent'), 'another rung'); assert.ok(!c.moves.includes('vent'), 'taught: not known until the scene');
  assert.equal(takePick(c, 'steady-eye'), null, 'the first rung is vent\'s now');
});

test('a stat pick moves the sheet, an edge adds to its kind, a perk is read by id', () => {
  const c = { post: 'pilot', sheet: { hands: 3, eye: 3, nerve: 4, wit: 3 }, picks: [] };
  assert.ok(takePick(c, 'pilot-nerve')); assert.equal(c.sheet.nerve, 5);
  assert.ok(takePick(c, 'cool-hand')); assert.equal(pickEdge(c.picks, 'solo'), 0.05); assert.equal(pickEdge(c.picks, 'job'), 0);
  assert.equal(takePick(c, 'trim'), null, 'the first rung is cool-hand\'s already'); assert.ok(takePick(c, 'long-legs')); assert.equal(hasPerk(c.picks, 'long-legs'), true); assert.equal(hasPerk(c.picks, 'trim'), false);
  assert.equal(c.sheet.nerve, STAT_MAX);
});

test('an old save with taught moves and no picks counts each known move as its rung\'s pick, so the rung is not offered again (#1002)', () => {
  const old = { post: 'gunner', moves: ['vent', 'lead'] };
  assert.deepEqual([...takenPicks(old)], ['vent', 'lead']);
  assert.equal(pickDue(old, 3), 3, 'rungs 1 and 2 are taken by the moves known; rung 3 waits');
  assert.deepEqual([...takenPicks({ post: 'gunner', moves: ['vent'], picks: ['steady-eye'] })], ['steady-eye'], 'a save with picks is read as it is');
});
