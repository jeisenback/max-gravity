'use strict';

// The hand's sheet and the one check rule (js/sheet.js), in plain Node: the sheet set at the sign-on from the background and the
// post, and the odds every roll of the hand's comes from.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./nodecontext');

const api = load(['js/sheet.js'], {}, ['STATS', 'POST_STAT', 'DIFFICULTY', 'STAT_BASE', 'STAT_STEP', 'SKILL_STEP', 'CHECK_MIN', 'CHECK_MAX', 'newSheet', 'check', 'KIT_ITEMS', 'kitEdge', 'sheetRows']);
const { STATS, POST_STAT, DIFFICULTY, STAT_BASE, STAT_STEP, SKILL_STEP, CHECK_MIN, CHECK_MAX, newSheet, check, KIT_ITEMS, kitEdge, sheetRows } = api;
const near = (a, b) => Math.abs(a - b) < 1e-9, sheet = (bg, post) => ({ ...newSheet(bg, post) });  // spread: the vm context has its own Object

test('the sheet: four stats at the base, one up for the post and one for the background, never above five', () => {
  assert.deepEqual([...STATS], ['hands', 'eye', 'nerve', 'wit']);
  assert.deepEqual(sheet('earth', 'gunner'), { hands: 3, eye: 4, nerve: 3, wit: 4 });
  assert.deepEqual(sheet('mars', 'pilot'), { hands: 3, eye: 3, nerve: 5, wit: 3 }, 'the post and the background on the same stat stack');
  assert.deepEqual(sheet('belt', 'engineer'), { hands: 5, eye: 3, nerve: 3, wit: 3 });
  assert.deepEqual(sheet('nowhere', 'comms'), { hands: 3, eye: 3, nerve: 3, wit: 4 }, 'an unknown background moves nothing');
  for (const post of Object.keys(POST_STAT)) assert.ok(STATS.includes(POST_STAT[post]), `${post} sits on a stat`);
  assert.equal(STAT_BASE, 3);
});

test('the rule: a stat, a skill, a difficulty and an edge, with one step each and one clamp', () => {
  assert.equal(check(STAT_BASE, 0, 0), 0.5, 'the base stat, no skill, no difficulty: even');
  assert.ok(near(check(STAT_BASE + 1, 0, 0), 0.5 + STAT_STEP), 'a point of stat');
  assert.ok(near(check(STAT_BASE, 2, 0), 0.5 + 2 * SKILL_STEP), 'a level of skill');
  assert.ok(near(check(STAT_BASE, 0, DIFFICULTY.job), 0.5 - DIFFICULTY.job), 'the difficulty comes off');
  assert.ok(near(check(STAT_BASE, 0, 0, 0.1), 0.6), 'an edge goes on');
  assert.equal(check(1, 0, 0.9), CHECK_MIN, 'never hopeless');
  assert.equal(check(5, 3, 0, 0.5), CHECK_MAX, 'never sure');
  assert.ok(near(check(STAT_BASE, 3, DIFFICULTY.post), 0.8), 'the post move at level 3 is what it was');
  assert.ok(near(check(STAT_BASE, 0, DIFFICULTY.solo), 0.45), 'the solo roll at level 0 is what it was');
  assert.ok(near(check(STAT_BASE, 0, DIFFICULTY.job), 0.35), 'a job at level 0 is what it was');
  assert.ok(near(check(STAT_BASE, 0, DIFFICULTY.brawl), 0.4), 'the bar fight is what it was');
  for (const d of Object.values(DIFFICULTY)) assert.ok(d >= 0 && d < 0.5, 'a difficulty is what comes off even odds');
});

test('the kit: each item adds to a kind of check, the edge is the sum for that kind, and an unknown id or an old save with no kit adds nothing', () => {
  assert.ok(near(kitEdge(['valve-keys'], 'job'), 0.05), 'valve keys help a job'); assert.equal(kitEdge(['valve-keys'], 'word'), 0, 'and nothing else');
  assert.equal(kitEdge([], 'job'), 0); assert.equal(kitEdge(undefined, 'job'), 0, 'a save from before the kit'); assert.equal(kitEdge(['nothing-like-it'], 'job'), 0);
  assert.ok(near(kitEdge(['valve-keys', 'valve-keys'], 'job'), 0.1), 'the sum');
  for (const [id, item] of Object.entries(KIT_ITEMS)) { assert.ok(item.name && !/^[A-Z]/.test(item.name), `${id} is named for a sentence ("You carry ${item.name}")`); for (const kind of Object.keys(item.adds)) assert.ok(kind in DIFFICULTY, `${id} adds to a kind of roll that exists (${kind})`); }
  assert.ok(near(check(STAT_BASE, 0, DIFFICULTY.job, kitEdge(['valve-keys'], 'job')), 0.35 + 0.05 - 0.0), 'the edge goes into the rule');
});

test('the sheet as rows: each stat with the posts on it, and the kit with what each item adds', () => {
  const rows = JSON.parse(JSON.stringify(sheetRows({ hands: 3, eye: 4, nerve: 3, wit: 5 }, ['valve-keys', 'audit-seal', 'unknown'])));
  assert.deepEqual(rows.stats, [
    { stat: 'hands', value: 3, posts: ['engineer'] }, { stat: 'eye', value: 4, posts: ['gunner'] }, { stat: 'nerve', value: 3, posts: ['pilot'] }, { stat: 'wit', value: 5, posts: ['comms'] },
  ]);
  assert.deepEqual(rows.kit, [{ id: 'valve-keys', name: 'a roll of valve keys', adds: 'jobs ashore +5%' }, { id: 'audit-seal', name: 'a Fleet audit seal', adds: 'a word with the captain +5%' }], 'an id the table does not know is left out');
  const old = JSON.parse(JSON.stringify(sheetRows(undefined, undefined)));
  assert.deepEqual(old.stats.map(r => r.value), [3, 3, 3, 3], 'a hand from before the sheet has every stat at the base'); assert.deepEqual(old.kit, []);
});

