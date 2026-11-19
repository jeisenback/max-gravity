'use strict';

// The radar ship fight's targets (docs/superpowers/specs/2026-11-16-radar-ship-fight-design.md, "How we know it worked"; plan Part 4, #1347), over the trials of
// tools/radarfights.js: the rules played by cycles in plain Node, the crew at every post but the hand's, and the hand's post by a policy (random, the fixed habits,
// and answer, which reads her shown threat: tools/answer.js answerRadar). Many-seed checks, so they are in the soak (npm run soak) and not in npm test.
// A navy destroyer is left out of the targets, as in the old fight's: she is a ship to heave to for, not to fight (the owner's choice, #833).
//
// Profiles:  none: the radar fight tool (tools/radarfights.js) uses no soak player (tools/soak.js SOAK_PROFILES, #1199).

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { radarFights, radarSum, radarOverall, POLICIES } = require('../../tools/radarfights');

const SEEDS = [1, 2, 3], N = 100;  // a hundred fights of each type for each policy on each seed: 300 a cell, 1,200 a policy over the four types
const TARGET_TYPES = ['raider', 'corsair', 'cutter', 'raider pair'];
const FIXED = { gunner: ['hull', 'lock', 'pdc'], pilot: ['hold', 'close'] };
const runs = {};
const table = (post, o = {}) => (runs[JSON.stringify([post, o])] = runs[JSON.stringify([post, o])] || radarSum(SEEDS.map(seed => radarFights({ seed, n: N, post, types: TARGET_TYPES, ...o }))));
const cell = (t, policy, type) => t[`${policy}|${type}`];

test('reading her beats a habit: answer\'s good ends are at or above every fixed policy\'s against each type, at each post the hand works', () => {
  for (const post of Object.keys(POLICIES)) {
    const t = table(post);
    for (const type of TARGET_TYPES) for (const p of FIXED[post]) {
      assert.ok(cell(t, 'answer', type).goodRate >= cell(t, p, type).goodRate, `${post} against a ${type}: answer ${cell(t, 'answer', type).goodRate} under ${p} ${cell(t, p, type).goodRate}`);
    }
  }
});

test('no fixed policy has more than 70% good ends against every type', () => {
  for (const post of Object.keys(POLICIES)) {
    const t = table(post);
    for (const p of FIXED[post]) assert.ok(TARGET_TYPES.some(type => cell(t, p, type).goodRate <= 0.7), `${post} ${p} wins over 70% against every type`);
  }
});

test('random play loses a quarter of its fights or more over every type', () => {
  for (const post of Object.keys(POLICIES)) assert.ok(radarOverall(table(post), 'random').lostRate >= 0.25, `${post}: random loses ${radarOverall(table(post), 'random').lostRate}`);
});

test('every post matters: the hand\'s choices move the good ends by 15 points or more between answer and random', () => {
  for (const post of Object.keys(POLICIES)) {
    const t = table(post), gap = radarOverall(t, 'answer').goodRate - radarOverall(t, 'random').goodRate;
    assert.ok(gap >= 0.15, `${post}: answer is ${Math.round(100 * gap)} points over random`);
  }
});
test.todo('the engineer and comms posts move the good ends by 15 points too: their choices are #1371, kept as a target by the owner (2026-11-19)');

test('fights end: every fight ends one of the named ways, and under a third of answer\'s fights reach the cycle cap', () => {
  for (const post of Object.keys(POLICIES)) {
    const t = table(post);
    for (const [k, c] of Object.entries(t)) assert.equal(c.standoff || 0, 0, `${post} ${k}: a fight with no end`);
    assert.ok(radarOverall(t, 'answer').capped < 1 / 3, `${post}: ${radarOverall(t, 'answer').capped} of answer's fights at the cap`);  // as the old fight's target reads it (tests/distribution/fights.test.js)
  }
});

test('pauses do not nag: the median gap between the cycles that pause the fight by themselves is three cycles or more', () => {
  const t = table('gunner'), gaps = TARGET_TYPES.flatMap(type => cell(t, 'answer', type).gaps).sort((a, b) => a - b);
  assert.ok(gaps[Math.floor(gaps.length / 2)] >= 3, `median gap ${gaps[Math.floor(gaps.length / 2)]} cycles`);
});

test('the upgrades show: worn stock sensors lose clearly against full ones, and each upgrade wins back part of it', () => {
  const good = o => radarOverall(table('gunner', o), 'answer').goodRate;
  const full = good({ sensors: 1 }), worn = good({ sensors: 0.4 });
  assert.ok(full - worn >= 0.05, `worn sensors lose ${Math.round(100 * (full - worn))} points`);
  for (const k of ['accuracy', 'resilience']) assert.ok(good({ sensors: 0.4, fit: { [k]: true } }) > worn, `${k} wins nothing back`);
});
