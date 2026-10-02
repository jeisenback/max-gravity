'use strict';

// The hired chapter's roster, fund and pacing (js/hired.js, js/people.js).

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

const CHAPTER_ROLES = ['xo', 'cook', 'icehand'];

test('the chapter\'s roles have a name, a wage and a perk', async () => {
  const { ev, done } = await open();
  const r = await ev(() => ({ names: [ROLE_NAMES.xo, ROLE_NAMES.cook, ROLE_NAMES.icehand],
    wages: ['xo', 'cook', 'icehand'].map(k => typeof ROLE_WAGE[k]), perks: ['xo', 'cook', 'icehand'].map(k => ROLE_PERKS[k](2)) }));
  assert.deepEqual(r.names, ['First officer', 'Cook', 'Ice hand']);
  assert.deepEqual(r.wages, ['number', 'number', 'number']);
  assert.ok(r.perks.every(p => typeof p === 'string' && p.length > 0));
  await done();
});

test('the chapter\'s roles are never hireable', async () => {
  const { ev, done } = await open();
  const r = await ev(() => ({ hireable: HIREABLE_ROLES, roles: Array.from({ length: 300 }, () => makeCrewCandidate('Earth').role) }));
  assert.deepEqual(r.hireable, ['engineer', 'pilot', 'gunner', 'quartermaster', 'slicer', 'medic']);
  assert.ok(r.roles.every(x => r.hireable.includes(x)));
  await done();
});

test('a passenger who joins the crew never takes a chapter role', async () => {
  const { ev, done } = await open();
  const roles = await ev(() => Array.from({ length: 300 }, () => jobRole('')));
  assert.ok(roles.every(x => !CHAPTER_ROLES.includes(x)), roles.filter(x => CHAPTER_ROLES.includes(x)).join());
  await done();
});
