'use strict';

// The words of the "With {name}" scenes (js/family.js, #457) as they play. The pin (fixtures/talk-pin.json) is what the talk topics, the idle talk, the sittings of a story, the favor and
// the picker play with no edits; the text layer must leave it as it is. After a change to the words on purpose, write it again with
// `PIN_WRITE=1 node --test tests/talkpin.test.js` and read the diff.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { open, closeBrowser } = require('./helpers');
const { playTalk } = require('./talkplay');

after(closeBrowser);

const FIXTURE = path.join(__dirname, 'fixtures', 'talk-pin.json');

test('the talk scenes play the words they always did', async () => {
  const g = await open({ scope: 'full' });
  const got = await g.ev(playTalk);
  await g.done();
  assert.ok(got.length >= 20, `${got.length} cases`);
  assert.deepEqual(got.filter(r => /undefined|\[object|NaN/.test(r.text)).map(r => r.key), [], 'no broken line');
  if (process.env.PIN_WRITE) fs.writeFileSync(FIXTURE, JSON.stringify(got, null, 1) + '\n');
  const want = JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));
  assert.equal(got.length, want.length);
  for (let n = 0; n < want.length; n++) assert.deepEqual(got[n], want[n], want[n].key);
});

test('the pin is repeatable: playing the scenes twice gives the same record', async () => {
  const g = await open({ scope: 'full' });
  const a = await g.ev(playTalk), b = await g.ev(playTalk);
  await g.done();
  assert.deepEqual(a, b);
});
