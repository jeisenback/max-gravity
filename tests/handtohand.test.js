'use strict';

// Hand to hand on the sheet (js/handtohand.js, #684): the abilities, the cover by section and the strip that draws it, in plain Node. The lock fight that uses them is in boarders.test.js.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./nodecontext');

const api = load(['js/sheet.js', 'js/handtohand.js'], {}, ['FIGHT_ABILITY', 'ABILITY_EDGE', 'fightCover', 'baseCover', 'hurtScale', 'abilityStep', 'fightStrip', 'COVER_MAX', 'COVER_MADE']);
const { FIGHT_ABILITY, ABILITY_EDGE, fightCover, hurtScale, abilityStep, fightStrip, COVER_MAX, COVER_MADE } = api;
const POSTS = ['gunner', 'pilot', 'engineer', 'comms'];

test('every post has a steady ability and a cover ability, each with a label and a line for working and for missing', () => {
  assert.deepEqual(Object.keys(FIGHT_ABILITY).sort(), [...POSTS].sort());
  for (const post of POSTS) {
    assert.deepEqual(Object.keys(FIGHT_ABILITY[post]), Object.keys(ABILITY_EDGE), `${post} has one ability of each kind`);
    for (const t of Object.values(FIGHT_ABILITY[post])) for (const f of ['label', 'win', 'lose']) assert.ok(t[f] && !/[^\x20-\x7e]/.test(t[f]), `${post} ${f} is plain text`);
  }
  assert.ok(ABILITY_EDGE.steady > ABILITY_EDGE.cover && ABILITY_EDGE.cover > 0, 'both are easier gambles than the post\'s move, the steady one the easier');
});

test('cover by section: the ship\'s length sets the corridor\'s, the kit and the fight add to it, and it stops at three', () => {
  assert.deepEqual([...fightCover({ size: 13, kit: [], extra: [0, 0, 0] })], [1, 1, 1], 'a middling ship has a point of cover everywhere');
  assert.deepEqual([...fightCover({ size: 18, kit: [], extra: [0, 0, 0] })], [1, 2, 1], 'a long ship has berth doors to stand behind in the corridor');
  assert.deepEqual([...fightCover({ size: 10, kit: [], extra: [0, 0, 0] })], [1, 0, 1], 'a cramped ship has none');
  assert.deepEqual([...fightCover({ size: 13, kit: ['valve-keys'], extra: [0, 0, 0] })], [1, 2, 1], 'the valve keys open the service crawl');
  assert.deepEqual([...fightCover({ size: 13, kit: ['audit-seal'], extra: [0, 0, 0] })], [1, 1, 1], 'an item with no cover gives none');
  assert.deepEqual([...fightCover({ size: 18, kit: ['valve-keys'], extra: [0, COVER_MADE, 0] })], [1, COVER_MAX, 1], 'the corridor stops at three');
});

test('cover turns the chance of a casualty: a point over the ship\'s own takes a fifth off, a point under puts a fifth on, and it never falls below two fifths', () => {
  assert.equal(hurtScale(1), 1, 'the ship\'s own cover leaves the odds as they were');
  assert.ok(Math.abs(hurtScale(2) - 0.8) < 1e-9 && Math.abs(hurtScale(0) - 1.2) < 1e-9);
  assert.ok(hurtScale(3) < hurtScale(2) && hurtScale(9) >= 0.4);
});

test('an ability that works thins them or makes cover and the exchange stands; one that misses holds the ground and lets them press', () => {
  const s = { pos: 1, boarders: 4, extra: [0, 0, 0] };
  assert.deepEqual({ ...abilityStep('steady', true, s) }, { result: 'tie', press: false, boarders: 3, extra: s.extra });
  const miss = abilityStep('steady', false, s); assert.deepEqual([miss.result, miss.press, miss.boarders], ['tie', true, 4]);
  assert.equal(abilityStep('steady', true, { ...s, boarders: 1 }).boarders, 1, 'never fewer than one');
  const made = abilityStep('cover', true, s); assert.deepEqual([made.result, made.press, [...made.extra]], ['tie', false, [0, COVER_MADE, 0]]); assert.deepEqual([...s.extra], [0, 0, 0], 'the fight\'s own list is not changed in place');
  const coverMiss = abilityStep('cover', false, s); assert.deepEqual([coverMiss.result, coverMiss.press, [...coverMiss.extra]], ['tie', true, [0, 0, 0]]);
});

test('the strip draws the three sections with who holds each hatch, the cover in each and how many are at the front', () => {
  const titles = ['The Lock', 'The Corridor', 'The Bridge'], svg = fightStrip({ titles, pos: 1, boarders: 3, cover: [1, 2, 0] });
  assert.match(svg, /^<svg class="board" viewBox="0 0 360 72" role="img" aria-label="The ship in three sections\. The Lock: theirs, cover 1\. The Corridor: the front, 3 of them, cover 2\. The Bridge: yours, cover 0\.">/);
  assert.deepEqual([...svg.matchAll(/letter-spacing="1">(\w+)</g)].map(m => m[1]), ['THEIRS', 'FRONT', 'YOURS']);
  assert.equal((svg.match(/<circle class="pip"/g) || []).length, 3, 'three points of cover drawn');
  assert.equal((svg.match(/<circle class="nopip"/g) || []).length, 6);
  assert.match(svg, /text-anchor="end"[^>]*>3</, 'the count of them is at the front');
});
