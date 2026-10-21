'use strict';

// Hand to hand on the sheet (js/handtohand.js, #684): the abilities, the cover by section and the strip that draws it, in plain Node. The lock fight that uses them is in boarders.test.js.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./nodecontext');

const api = load(['js/sheet.js', 'js/handtohand.js'], {}, ['FIGHT_ABILITY', 'ABILITY_EDGE', 'fightCover', 'baseCover', 'abilityStep', 'fightStrip', 'COVER_MAX', 'COVER_MADE', 'CREW_ABILITY', 'crewSheet', 'crewOrderOdds', 'crewOrders', 'ORDERS_MAX', 'CREW_HURT', 'check', 'POST_STAT']);
const { FIGHT_ABILITY, ABILITY_EDGE, fightCover, abilityStep, fightStrip, COVER_MAX, COVER_MADE, CREW_ABILITY, crewSheet, crewOrderOdds, crewOrders, ORDERS_MAX, CREW_HURT, check, POST_STAT } = api;
const POSTS = ['gunner', 'pilot', 'engineer', 'comms'];

test('every post has a steady ability and a cover ability, each with a label and a line for working and for missing', () => {
  assert.deepEqual(Object.keys(FIGHT_ABILITY).sort(), [...POSTS].sort());
  for (const post of POSTS) {
    assert.deepEqual(Object.keys(FIGHT_ABILITY[post]), Object.keys(ABILITY_EDGE), `${post} has one ability of each kind`);
    for (const t of Object.values(FIGHT_ABILITY[post])) for (const f of ['label', 'win', 'lose']) assert.ok(t[f] && !/[^\x20-\x7e]/.test(t[f]), `${post} ${f} is plain text`);
  }
  assert.ok(ABILITY_EDGE.steady < 0 && ABILITY_EDGE.cover > 0, 'the cover one is an easier gamble than the post\'s move, the steady one a harder one: it is the one that can end the fight');
});

test('cover by section: the ship\'s length sets the corridor\'s, the kit and the fight add to it, and it stops at three', () => {
  assert.deepEqual([...fightCover({ size: 13, kit: [], extra: [0, 0, 0] })], [1, 1, 1], 'a middling ship has a point of cover everywhere');
  assert.deepEqual([...fightCover({ size: 18, kit: [], extra: [0, 0, 0] })], [1, 2, 1], 'a long ship has berth doors to stand behind in the corridor');
  assert.deepEqual([...fightCover({ size: 10, kit: [], extra: [0, 0, 0] })], [1, 0, 1], 'a cramped ship has none');
  assert.deepEqual([...fightCover({ size: 13, kit: ['valve-keys'], extra: [0, 0, 0] })], [1, 2, 1], 'the valve keys open the service crawl');
  assert.deepEqual([...fightCover({ size: 13, kit: ['audit-seal'], extra: [0, 0, 0] })], [1, 1, 1], 'an item with no cover gives none');
  assert.deepEqual([...fightCover({ size: 18, kit: ['valve-keys'], extra: [0, COVER_MADE, 0] })], [1, COVER_MAX, 1], 'the corridor stops at three');
});

test('an ability that works thins them or makes cover and the exchange stands; one that misses holds the ground and lets them press', () => {
  const s = { pos: 1, boarders: 4, extra: [0, 0, 0] };
  assert.deepEqual({ ...abilityStep('steady', true, s) }, { result: 'tie', press: false, boarders: 3, extra: s.extra });
  const miss = abilityStep('steady', false, s); assert.deepEqual([miss.result, miss.press, miss.boarders], ['tie', true, 4]);
  assert.equal(abilityStep('steady', true, { ...s, boarders: 1 }).boarders, 0, 'the last of them can be picked off');
  assert.equal(abilityStep('steady', true, { ...s, boarders: 0 }).boarders, 0, 'and there are never fewer than none');
  const made = abilityStep('cover', true, s); assert.deepEqual([made.result, made.press, [...made.extra]], ['tie', false, [0, COVER_MADE, 0]]); assert.deepEqual([...s.extra], [0, 0, 0], 'the fight\'s own list is not changed in place');
  const coverMiss = abilityStep('cover', false, s); assert.deepEqual([coverMiss.result, coverMiss.press, [...coverMiss.extra]], ['tie', true, [0, 0, 0]]);
});

test('the strip draws each section with both sides\' heads, its cover, where the hand stands, and their shown move, marked when it may feint', () => {
  const titles = ['The Lock', 'The Corridor', 'The Bridge'], sections = [{ mine: 2, theirs: 3, cover: 1 }, { mine: 1, theirs: 0, cover: 2 }, { mine: 0, theirs: 0, cover: 0 }];
  const svg = fightStrip({ titles, sections, hand: 0, move: { from: 0, to: 1, n: 3 }, feint: false });
  assert.match(svg, /^<svg class="board" viewBox="0 0 360 98" role="img" aria-label="The deck in three sections\. The Lock: 2 of ours and 3 of theirs, cover 1, you stand here\. The Corridor: 1 of ours, cover 2\. The Bridge: empty, cover 0\. Their move: 3 from The Lock into The Corridor\.">/);
  assert.deepEqual([...svg.matchAll(/letter-spacing="1">([\w ]+)</g)].map(m => m[1]), ['THE LOCK', 'THE CORRIDOR', 'THE BRIDGE']);
  assert.equal((svg.match(/<circle class="pip"/g) || []).length, 3, 'three points of cover drawn');
  assert.equal((svg.match(/<circle class="nopip"/g) || []).length, 6);
  assert.equal((svg.match(/class="you"/g) || []).length, 1, 'the hand in one section');
  assert.match(svg, /<path class="move"/); assert.doesNotMatch(svg, /MAY FEINT/);
  const vet = fightStrip({ titles: [...titles, 'The Cargo Bay'], sections: [...sections, { mine: 1, theirs: 0, cover: 1 }], hand: 3, move: null, feint: true });
  assert.match(vet, /aria-label="The deck in four sections\. .*The Cargo Bay: 1 of ours, cover 1, you stand here\. Their move: they hold, may feint\."/);
  assert.doesNotMatch(vet, /<path class="move"/, 'a hold draws no arrow');
  assert.match(fightStrip({ titles, sections, hand: 0, move: { from: 0, to: 1, n: 3 }, feint: true }), />3 MAY FEINT</, 'a veteran\'s move is marked on the arrow');
  const counted = fightStrip({ titles, sections, hand: 0, move: null, feint: false, began: 6, breakAt: 2 });  // spec Section 3: the line she breaks at, on her count
  assert.equal((counted.match(/<rect class="head"/g) || []).length, 3, 'a mark for each of hers still up');
  assert.equal((counted.match(/<rect class="nohead"/g) || []).length, 3, 'and a hollow one for each down');
  assert.match(counted, /<path class="break" d="M24\.5 /, 'the line after her second mark');
  assert.match(counted, />BREAKS AT 2</);
  assert.match(counted, /3 of their 6 still up; they break at 2\."/);
  const few = fightStrip({ titles, sections, hand: 0, move: null, feint: false, began: 3, breakAt: 0 });  // a count of 1 to 3 has no line to break at
  assert.match(few, />FIGHTS TO THE LAST</); assert.doesNotMatch(few, /BREAKS AT/);
  assert.match(few, /3 of their 3 still up; they fight to the last\."/);
  assert.doesNotMatch(svg, /class="break"/, 'no count is drawn when none is given');
});

// The crew at the lock (#711): a sheet from role, skill and traits, and the orders to named crew.
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

test('the orders on offer: up to three crew with a post, the most skilled first, the cover to the first while the fight still has it to make', () => {
  const j = x => JSON.parse(JSON.stringify(x));
  const crew = [
    { id: 'a', first: 'Ana', sheet: crewSheet({ role: 'gunner', skill: 1, traits: [] }) },
    { id: 'b', first: 'Bo', sheet: crewSheet({ role: 'pilot', skill: 3, traits: [] }) },
    { id: 'c', first: 'Cy', sheet: null },
    { id: 'd', first: 'Di', sheet: crewSheet({ role: 'engineer', skill: 2, traits: [] }) },
    { id: 'e', first: 'Ed', sheet: crewSheet({ role: 'slicer', skill: 0, traits: [] }) },
  ];
  const fresh = j(crewOrders(crew, false)).map(o => [o.id, o.kind]);
  assert.deepEqual(fresh, [['b', 'cover'], ['d', 'steady'], ['a', 'steady']], 'three, best first, the cover to the best, none for the one with no post');
  assert.equal(fresh.length, ORDERS_MAX);
  assert.deepEqual(j(crewOrders(crew, true)).map(o => o.kind), ['steady', 'steady', 'steady'], 'with the cover made, all are steady');
  assert.deepEqual(crewOrders([{ id: 'c', first: 'Cy', sheet: null }], false), [], 'a crew of cooks has none to send');
});

test('every post has a line for each of the crew\'s two orders: a phrase for the button and a line for working and for missing', () => {
  for (const post of POSTS) for (const kind of Object.keys(ABILITY_EDGE)) for (const f of ['label', 'win', 'lose']) {
    const t = CREW_ABILITY[post][kind][f];
    assert.ok(t && !/[^\x20-\x7e]/.test(t) && !/^[A-Z]/.test(t) && !/\b[Yy]ou\b/.test(t), `${post} ${kind} ${f}: plain, after the name, in the third person`);
  }
});
