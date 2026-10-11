'use strict';

// The words of the found-family scenes (js/family.js, js/familytext.js, #457) as they play. The pin (fixtures/family-pin.json) is what the stories, the idle talk, the letters from
// home and the holidays play with no edits; the text layer must leave it as it is. After a change to the words on purpose, write it again with
// `PIN_WRITE=1 node --test tests/familypin.test.js` and read the diff.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { open, closeBrowser } = require('./helpers');
const { playFamily } = require('./familyplay');

after(closeBrowser);

const FIXTURE = path.join(__dirname, 'fixtures', 'family-pin.json');

test('the family scenes play the words they always did', async () => {
  const g = await open({ scope: 'full' });
  const got = await g.ev(playFamily);
  await g.done();
  assert.ok(got.length > 150, `${got.length} cases`);
  assert.deepEqual(got.filter(r => /undefined|\[object|NaN/.test(r.text)).map(r => r.key), [], 'no broken line');
  if (process.env.PIN_WRITE) fs.writeFileSync(FIXTURE, JSON.stringify(got, null, 1) + '\n');
  const want = JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));
  assert.equal(got.length, want.length);
  for (let n = 0; n < want.length; n++) assert.deepEqual(got[n], want[n], want[n].key);
});

test('the pin is repeatable: playing the scenes twice gives the same record', async () => {
  const g = await open({ scope: 'full' });
  const a = await g.ev(playFamily), b = await g.ev(playFamily);
  await g.done();
  assert.deepEqual(a, b);
});
