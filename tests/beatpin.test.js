'use strict';

// Pins the words the raid, ambush and boarding beats play (#478): the raid's openings, passes, choices and closes by the foe's style and the hand's post,
// the ambush's read by post, and the repel and assault fights' places and exchanges, in tests/fixtures/beats-pin.json. Putting the text layer in front of
// the tables must leave this fixture as it is. After a change to the words on purpose, write it again with `PIN_WRITE=1 node --test tests/beatpin.test.js`
// and read the diff.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { open, closeBrowser } = require('./helpers');
const { playBeats } = require('./beatplay');

after(closeBrowser);

const FIXTURE = path.join(__dirname, 'fixtures', 'beats-pin.json');

test('the raid, the ambush and the boarding fights play the words they always did', async () => {
  const g = await open({ scope: 'full' });
  const got = await g.ev(playBeats);
  await g.done();
  assert.equal(got.length, 12 + 4 + 8, 'three foe styles and four posts for the raid, four for the ambush, two fights for four posts');
  if (process.env.PIN_WRITE) fs.writeFileSync(FIXTURE, JSON.stringify(got, null, 1) + '\n');
  const want = JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));
  assert.equal(got.length, want.length);
  for (let n = 0; n < want.length; n++) assert.deepEqual(got[n], want[n], want[n].id);
});

test('the pin is repeatable: playing the beats twice gives the same record', async () => {
  const g = await open({ scope: 'full' });
  const a = await g.ev(playBeats), b = await g.ev(playBeats);
  await g.done();
  assert.deepEqual(a, b);
});
