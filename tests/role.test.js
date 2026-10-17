'use strict';

// The role (js/role.js, #685): what the player may trade, decide and pay for, as one object for the hired hand and one for the owner, in plain Node. The places that ask it
// (the tabs, the actions, the captain taking an event's call, whose money a road event spends) are in hired.test.js, captains.test.js and the layout tests.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./nodecontext');

const { roleOf, ROLES, OWNER_TABS, OWNER_ACTIONS } = load(['js/role.js'], {}, ['roleOf', 'ROLES', 'OWNER_TABS', 'OWNER_ACTIONS']);
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
});
