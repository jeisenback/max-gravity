'use strict';

// The role (js/role.js, #685): what the player may trade, decide and pay for, as one object for the hired hand and one for the owner, in plain Node. The places that ask it
// (the tabs, the actions, the captain taking an event's call, whose money a road event spends) are in hired.test.js, captains.test.js and the layout tests.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./nodecontext');

const { roleOf, ROLES, OWNER_TABS, OWNER_ACTIONS, COOP_BARRED, chapterOf } = load(['js/role.js'], {}, ['roleOf', 'ROLES', 'OWNER_TABS', 'OWNER_ACTIONS', 'COOP_BARRED', 'chapterOf']);
const hand = roleOf({ post: 'gunner' }), owner = roleOf(null);

test('a hand\'s record gives the hand\'s role and no record gives the owner\'s', () => {
  assert.equal(hand, ROLES.hand); assert.equal(owner, ROLES.owner);
  assert.deepEqual([hand.id, owner.id], ['hand', 'owner']);
  assert.deepEqual(Object.keys(hand).sort(), Object.keys(owner).sort(), 'the two roles answer the same questions');
});

test('a hand may not trade, run the company or take the owner\'s actions; an owner may do all of it', () => {
  assert.equal(hand.canTrade, false); assert.equal(owner.canTrade, true);
  for (const tab of OWNER_TABS) { assert.equal(hand.mayTab(tab), false, tab); assert.equal(owner.mayTab(tab), true, tab); }
  for (const tab of ['missions', 'bar', 'shipyard', 'contracts']) assert.equal(hand.mayTab(tab), true, `${tab} is open to a hand`);
  for (const action of OWNER_ACTIONS) { assert.equal(hand.mayAct(action), false, action); assert.equal(owner.mayAct(action), true, action); }
  for (const action of ['tab', 'choose', 'talk']) assert.equal(hand.mayAct(action), true, `${action} is a hand's to take`);
});

test('a hand decides their own affairs and their post\'s calls; the ship\'s and the captain\'s are not theirs; an owner decides every call', () => {
  assert.equal(hand.decides({ via: 'crew' }, 'gunner'), true, 'the crew\'s and your own affairs are yours');
  assert.equal(hand.decides({ via: 'crew', owner: 'gunner' }, 'gunner'), true, 'the call of your own post');
  assert.equal(hand.decides({ via: 'crew', owner: 'engineer' }, 'gunner'), false, 'another post\'s call');
  assert.equal(hand.decides({ via: 'ship' }, 'gunner'), false, 'a ship-to-ship matter is the captain\'s');
  assert.equal(hand.decides({ via: 'ship', owner: 'you' }, 'gunner'), true, 'unless the event says it is yours');
  assert.equal(hand.decides({ via: 'crew', owner: 'captain' }, 'gunner'), false);
  for (const ev of [{ via: 'ship' }, { via: 'crew', owner: 'captain' }, { via: 'crew' }]) assert.equal(owner.decides(ev, 'gunner'), true);
});

test('a hand\'s road events spend the ship\'s fund and an owner\'s spend their own credits', () => {
  assert.equal(hand.paysFrom('burn'), 'fund'); assert.equal(owner.paysFrom('burn'), 'credits');
  assert.equal(hand.canDie, true); assert.equal(owner.canDie, false, 'an owner is laid up by a hurt and the game goes on');
});

test('plotting a course and calling the burn are the owner\'s; a hand picks the downtime of a hand (#757)', () => {
  for (const action of ['plot', 'burn']) { assert.equal(hand.mayAct(action), false, action); assert.equal(owner.mayAct(action), true, action); }
  const own = { hiredOnly: true }, any = {};
  assert.equal(hand.mayDowntime('practise', own, 'gunner'), true, 'practising the post'); assert.equal(owner.mayDowntime('practise', own), false, 'an owner has no post to practise');
  for (const id of ['drills', 'visit']) { assert.equal(hand.mayDowntime(id, any, 'gunner'), false, `${id} is the captain's`); assert.equal(owner.mayDowntime(id, any), true, id); }
  assert.equal(hand.mayDowntime('repair', any, 'engineer'), true, 'the hull is the engineer\'s'); assert.equal(hand.mayDowntime('repair', any, 'gunner'), false);
  assert.equal(hand.mayDowntime('meal', any, 'gunner'), true); assert.equal(owner.mayDowntime('meal', any), true);
});

test('a chapter-two record gives the co-op\'s role: it flies and trades, and buys no ship, runs no company and hires nobody', () => {
  const coop = roleOf({ post: 'gunner', chapter: 2 });
  assert.equal(coop, ROLES.coop); assert.equal(coop.id, 'coop');
  assert.deepEqual(Object.keys(coop).sort(), Object.keys(ROLES.hand).sort(), 'the same questions');
  assert.equal(coop.canTrade, true); assert.equal(coop.canDie, true);
  assert.equal(coop.mayTab('trade'), true); assert.equal(coop.mayTab('company'), false);
  for (const a of ['takeoff', 'plot', 'burn', 'buy', 'sell', 'refuel', 'repair', 'torpbuy', 'buyout', 'sellout']) assert.equal(coop.mayAct(a), true, a);
  assert.deepEqual([...COOP_BARRED].sort(), ['buyship', 'cbuy', 'dismiss', 'hire', 'interviewHire']);
  for (const a of COOP_BARRED) assert.equal(coop.mayAct(a), false, a);
  assert.equal(coop.decides({ via: 'ship' }, 'gunner'), true); assert.equal(coop.paysFrom(), 'credits');
  for (const id of ['drills', 'practise', 'repair']) assert.equal(coop.mayDowntime(id, {}, 'gunner'), ROLES.hand.mayDowntime(id, {}, 'gunner'), id);
});

test('the chapter is read from the hand\'s record', () => {
  assert.equal(chapterOf({ hired: null }), 1); assert.equal(chapterOf({ hired: { post: 'gunner' } }), 1); assert.equal(chapterOf({ hired: { chapter: 2 } }), 2);
});
