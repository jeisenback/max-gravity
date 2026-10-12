'use strict';

// Pins the words the hired chapter's function-built scenes and the hired events written in code play (#463): the stakes, the walk off, the used ship, the yard office, the sign-on
// and ten events of the captain, the crew, money and the road, in tests/fixtures/scene-lines-pin.json. Putting the text layer in front of them must leave this fixture as it
// is. After a change to the words on purpose, write it again with `PIN_WRITE=1 node --test tests/scenepin.test.js` and read the diff.

const assert = require('node:assert/strict');
const { pinTests } = require('./pin');
const { playScenes } = require('./sceneplay');

pinTests({
  name: 'the function-built scenes and the code-written hired events',
  fixture: 'scene-lines-pin.json',
  play: playScenes,
  min: 101,
  words: ['text', 'mem', 'title', 'labels'],
  check: got => assert.deepEqual(got.filter(r => r.error).map(r => `${r.id}: ${r.error}`), [], 'every case plays'),
});
