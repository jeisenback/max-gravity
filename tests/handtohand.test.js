'use strict';

// Hand to hand on the sheet (js/handtohand.js, #684): the abilities and the crew's sheets, in plain Node. The deck fight that uses them is in deckplan.test.js.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./nodecontext');

const api = load(['js/sheet.js', 'js/handtohand.js'], {}, ['FIGHT_ABILITY', 'ABILITY_EDGE', 'CREW_ABILITY', 'crewSheet', 'crewOrderOdds', 'CREW_HURT', 'check', 'POST_STAT']);
const { FIGHT_ABILITY, ABILITY_EDGE, CREW_ABILITY, crewSheet, crewOrderOdds, CREW_HURT, check, POST_STAT } = api;
const POSTS = ['gunner', 'pilot', 'engineer', 'comms'];

test('every post has a steady ability and a cover ability, each with a label and a line for working and for missing', () => {
  assert.deepEqual(Object.keys(FIGHT_ABILITY).sort(), [...POSTS].sort());
  for (const post of POSTS) {
    assert.deepEqual(Object.keys(FIGHT_ABILITY[post]), Object.keys(ABILITY_EDGE), `${post} has one ability of each kind`);
    for (const t of Object.values(FIGHT_ABILITY[post])) for (const f of ['label', 'win', 'lose']) assert.ok(t[f] && !/[^\x20-\x7e]/.test(t[f]), `${post} ${f} is plain text`);
  }
  assert.ok(ABILITY_EDGE.steady < 0 && ABILITY_EDGE.cover > 0, 'the cover one is an easier gamble than the post\'s move, the steady one a harder one: it is the one that can end the fight');
});

test('a crew member\'s sheet comes from their role, skill and traits, and a role with no post has none', () => {
  const j = x => JSON.parse(JSON.stringify(x));
  assert.deepEqual(j(crewSheet({ role: 'gunner', skill: 2, traits: ['kind', 'rude'] })), { post: 'gunner', stat: 4, skill: 2 }, 'the post\'s stat is a point over the base, as the hand\'s is at the sign-on');
  assert.equal(crewSheet({ role: 'slicer', skill: 1, traits: [] }).post, 'comms', 'the slicer is Comms');
  assert.equal(crewSheet({ role: 'gunner', skill: 2, traits: ['brave', 'kind'] }).stat, 5, 'a brave one is a point up');
  assert.equal(crewSheet({ role: 'gunner', skill: 2, traits: ['nervous', 'drunk'] }).stat, 2, 'a nervous one and a drunk one are a point down each');
  assert.equal(crewSheet({ role: 'pilot', skill: 3, traits: ['brave', 'brave'] }).stat, 5, 'it stops at five');
  assert.equal(crewSheet({ role: 'pilot', skill: 3, traits: [], low: true }).skill, 2, 'bad news from home costs a level');
  assert.equal(crewSheet({ role: 'pilot', skill: 0, traits: [], low: true }).skill, 0, 'and not below none');
  for (const role of ['cook', 'medic', 'xo', 'quartermaster', 'icehand']) assert.equal(crewSheet({ role, skill: 2, traits: [] }), null, `${role} has no post`);
  assert.equal(crewSheet({ role: 'engineer', skill: 1 }).stat, 4, 'a person with no traits listed is as the post makes them');
});

test('an order\'s odds are the one rule at the crew member\'s own stat and skill, and a tenth worse for one already hurt', () => {
  const sheet = crewSheet({ role: 'gunner', skill: 2, traits: [] });
  assert.equal(crewOrderOdds(sheet, 'steady', false), check(POST_STAT.gunner ? 4 : 0, 2, 0, ABILITY_EDGE.steady));
  assert.equal(crewOrderOdds(sheet, 'cover', false), check(4, 2, 0, ABILITY_EDGE.cover));
  assert.ok(Math.abs(crewOrderOdds(sheet, 'steady', true) - (crewOrderOdds(sheet, 'steady', false) - CREW_HURT)) < 1e-9, 'hurt takes a tenth off');
  const better = crewSheet({ role: 'gunner', skill: 3, traits: [] });
  assert.ok(crewOrderOdds(better, 'steady', false) > crewOrderOdds(sheet, 'steady', false), 'skill counts a tenth a level');
});

test('every post has a line for each of the crew\'s two orders: a phrase for the button and a line for working and for missing', () => {
  for (const post of POSTS) for (const kind of Object.keys(ABILITY_EDGE)) for (const f of ['label', 'win', 'lose']) {
    const t = CREW_ABILITY[post][kind][f];
    assert.ok(t && !/[^\x20-\x7e]/.test(t) && !/^[A-Z]/.test(t) && !/\b[Yy]ou\b/.test(t), `${post} ${kind} ${f}: plain, after the name, in the third person`);
  }
});
