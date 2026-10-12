'use strict';

// Pins the words the raid, ambush and boarding beats play (#478): the raid's openings, passes, choices and closes by the foe's style and the hand's post,
// the ambush's read by post, and the repel and assault fights' places and exchanges, in tests/fixtures/beats-pin.json. Putting the text layer in front of
// the tables must leave this fixture as it is. After a change to the words on purpose, write it again with `PIN_WRITE=1 node --test tests/beatpin.test.js`
// and read the diff.

const assert = require('node:assert/strict');
const { pinTests } = require('./pin');
const { playBeats } = require('./beatplay');

pinTests({
  name: 'the raid, the ambush and the boarding fights',
  fixture: 'beats-pin.json',
  play: playBeats,
  words: ['text', 'labels', 'title', 'mem'],
  // three foe styles and four posts for the raid, four for the ambush, each choice of it blind and after a read to a trap and a real call, the dead-in-space scene for three
  // foes and four posts, how the two fights end, two fights for four posts
  check: got => assert.equal(got.length, 12 + 4 + 16 + 12 + 16 + 8),
});
