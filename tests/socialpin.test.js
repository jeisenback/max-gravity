'use strict';

// Pins the words the relationship scenes of js/social.js play (#457): relationshipScene over setups that let each kind of scene come up (a bond, shared homes, a passenger, a hired
// game, two fans of rival teams), from several seeds, with every choice on a good roll and a bad one and what it changed, and welcomeBack. In tests/fixtures/social-pin.json.
// Putting the text layer in front of them must leave this fixture as it is. After a change to the words on purpose, write it again with
// `PIN_WRITE=1 node --test tests/socialpin.test.js` and read the diff.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { open, closeBrowser } = require('./helpers');
const { playSocial } = require('./socialplay');

after(closeBrowser);

const FIXTURE = path.join(__dirname, 'fixtures', 'social-pin.json');
const TITLES = ['Ship\'s Rules', 'Close Quarters', 'A Small Ship', 'The Handover', 'Cold Shoulders', 'Small System', 'The Recipe', 'The Grand Tour', 'A Word', 'A Word, Captain', 'Cover My Watch', 'The Replay', 'Galley Duty', 'Welcome Back'];

test('the relationship scenes play the words they always did, and the pin reaches every one of them', async () => {
  const g = await open({ scope: 'full' });
  const got = await g.ev(playSocial);
  await g.done();
  assert.deepEqual(got.filter(r => r.error).map(r => `${r.id} ${r.seed}: ${r.error}`), [], 'every case plays');
  const seen = new Set(got.map(r => r.title).filter(Boolean));
  assert.deepEqual(TITLES.filter(t => !seen.has(t)), [], 'a scene the pin does not reach');
  if (process.env.PIN_WRITE) fs.writeFileSync(FIXTURE, JSON.stringify(got, null, 1) + '\n');
  const want = JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));
  assert.equal(got.length, want.length);
  for (let n = 0; n < want.length; n++) assert.deepEqual(got[n], want[n], `${want[n].id} ${want[n].seed}`);
});

test('the pin is repeatable: playing the scenes twice gives the same record', async () => {
  const g = await open({ scope: 'full' });
  const a = await g.ev(playSocial), b = await g.ev(playSocial);
  await g.done();
  assert.deepEqual(a, b);
});
