'use strict';

// Pins the words the passenger events play (#457): each event of PAX_EVENTS (js/people.js) for the passenger it is about, every choice on a good roll and a bad one, with
// what it changed, in tests/fixtures/pax-events-pin.json; and the same for the crew events (CREW_EVENTS), one for each trait, in tests/fixtures/crew-events-pin.json. Putting the text layer in front of them must leave this fixture as it is. After a change to the words on purpose, write it
// again with `PIN_WRITE=1 node --test tests/peoplepin.test.js` and read the diff.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { open, closeBrowser } = require('./helpers');
const { playPax, playCrew } = require('./peopleplay');

after(closeBrowser);

const FIXTURE = path.join(__dirname, 'fixtures', 'pax-events-pin.json');

test('the passenger events play the words they always did', async () => {
  const g = await open({ scope: 'full' });
  const got = await g.ev(playPax);
  await g.done();
  assert.deepEqual(got.filter(r => r.error).map(r => `${r.id}: ${r.error}`), [], 'every case plays');
  assert.equal(got.length, 16, 'fifteen events, and the ill passenger twice');
  if (process.env.PIN_WRITE) fs.writeFileSync(FIXTURE, JSON.stringify(got, null, 1) + '\n');
  const want = JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));
  assert.equal(got.length, want.length);
  for (let n = 0; n < want.length; n++) assert.deepEqual(got[n], want[n], want[n].id);
});

test('the pin is repeatable: playing the events twice gives the same record', async () => {
  const g = await open({ scope: 'full' });
  const a = await g.ev(playPax), b = await g.ev(playPax);
  await g.done();
  assert.deepEqual(a, b);
});

const CREW_FIXTURE = path.join(__dirname, 'fixtures', 'crew-events-pin.json');

test('the crew events play the words they always did', async () => {
  const g = await open({ scope: 'full' });
  const got = await g.ev(playCrew);
  await g.done();
  assert.deepEqual(got.filter(r => r.error).map(r => `${r.id}: ${r.error}`), [], 'every case plays');
  assert.equal(got.length, 12, 'twelve traits');
  if (process.env.PIN_WRITE) fs.writeFileSync(CREW_FIXTURE, JSON.stringify(got, null, 1) + '\n');
  const want = JSON.parse(fs.readFileSync(CREW_FIXTURE, 'utf8'));
  assert.equal(got.length, want.length);
  for (let n = 0; n < want.length; n++) assert.deepEqual(got[n], want[n], want[n].id);
});

test('the crew pin is repeatable', async () => {
  const g = await open({ scope: 'full' });
  const a = await g.ev(playCrew), b = await g.ev(playCrew);
  await g.done();
  assert.deepEqual(a, b);
});
