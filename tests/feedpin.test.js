'use strict';

// Pins the words of the culture feeds and the crew's talk about them (js/social.js; #457): the feed line, the port headlines, what the crew say, the downtime activities and the card
// night, on days across the year, in tests/fixtures/feed-pin.json. Putting the text layer in front of them must leave this fixture as it is. After a change to the words on purpose,
// write it again with `PIN_WRITE=1 node --test tests/feedpin.test.js` and read the diff.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { open, closeBrowser } = require('./helpers');
const { playFeeds } = require('./feedplay');

after(closeBrowser);

const FIXTURE = path.join(__dirname, 'fixtures', 'feed-pin.json');

test('the feeds and the crew\'s talk about them play the words they always did', async () => {
  const g = await open({ scope: 'full' });
  const got = await g.ev(playFeeds);
  await g.done();
  assert.ok(got.length > 500, `${got.length} cases`);
  assert.deepEqual(got.filter(r => (r.text === null && !r.key.startsWith('bondword:')) || /undefined|\[object|NaN/.test(r.text)).map(r => r.key), [], 'no broken line');
  if (process.env.PIN_WRITE) fs.writeFileSync(FIXTURE, JSON.stringify(got, null, 1) + '\n');
  const want = JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));
  assert.equal(got.length, want.length);
  for (let n = 0; n < want.length; n++) assert.deepEqual(got[n], want[n], want[n].key);
});

test('the pin is repeatable: playing the feeds twice gives the same record', async () => {
  const g = await open({ scope: 'full' });
  const a = await g.ev(playFeeds), b = await g.ev(playFeeds);
  await g.done();
  assert.deepEqual(a, b);
});
