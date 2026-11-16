'use strict';

// A person's pronouns for the words (js/util.js, #1240): she, he and they, each with its forms and the verbs that agree, and 'they' for anyone with none given.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./nodecontext');

const U = load(['js/util.js'], { CAPTAINS: { hester: { pronouns: 'she' }, imre: { pronouns: 'they' }, dov: { pronouns: 'he' } } }, ['pronouns', 'pronounsOf', 'pronounWords']);

test('each set has its forms and its verbs, and they is plural in its verbs', () => {
  assert.deepEqual([U.pronouns('she').them, U.pronouns('she').have, U.pronouns('he').their, U.pronouns('he').are], ['her', 'has', 'his', 'is']);
  assert.deepEqual([U.pronouns('they').they, U.pronouns('they').have, U.pronouns('they').are, U.pronouns('they').themself], ['they', 'have', 'are', 'themself']);
});

test('a person\'s own pronouns, a captain\'s from their entry, and they for anyone with none given', () => {
  assert.equal(U.pronounsOf({ pronouns: 'he' }).they, 'he');
  assert.equal(U.pronounsOf({ captainKey: 'hester' }).they, 'she', 'a captain from before pronouns were kept on the person');
  assert.equal(U.pronounsOf({ captainKey: 'imre' }).they, 'they');
  assert.equal(U.pronounsOf({ first: 'Hester' }).they, 'they', 'never guessed from a name');
  assert.equal(U.pronounsOf(null).they, 'they');
});

test('the template words: each form, and the ones a sentence starts with capitalised', () => {
  const w = U.pronounWords({ pronouns: 'she' });
  assert.deepEqual([w.They, w.they, w.Their, w.have], ['She', 'she', 'Her', 'has']);
  assert.deepEqual([U.pronounWords({ pronouns: 'they' }).They, U.pronounWords({ pronouns: 'they' }).have], ['They', 'have']);
});
