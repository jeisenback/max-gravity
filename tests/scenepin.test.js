'use strict';

// Pins the words the hired chapter's function-built scenes and the hired events written in code play (#463): the stakes, the walk off, the used ship, the yard office, the sign-on
// and ten events of the captain, the crew, money and the road, in tests/fixtures/scene-lines-pin.json. Putting the text layer in front of them must leave this fixture as it
// is. After a change to the words on purpose, write it again with `PIN_WRITE=1 node --test tests/scenepin.test.js` and read the diff.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { open, closeBrowser } = require('./helpers');
const { playScenes } = require('./sceneplay');

after(closeBrowser);

const FIXTURE = path.join(__dirname, 'fixtures', 'scene-lines-pin.json');

test('the function-built scenes and the code-written hired events play the words they always did', async () => {
  const g = await open({ scope: 'full' });
  const got = await g.ev(playScenes);
  await g.done();
  assert.deepEqual(got.filter(r => r.error).map(r => `${r.id}: ${r.error}`), [], 'every case plays');
  assert.ok(got.length > 100, `${got.length} cases`);
  if (process.env.PIN_WRITE) fs.writeFileSync(FIXTURE, JSON.stringify(got, null, 1) + '\n');
  const want = JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));
  assert.equal(got.length, want.length);
  for (let n = 0; n < want.length; n++) assert.deepEqual(got[n], want[n], want[n].id);
});

test('the pin is repeatable: playing the scenes twice gives the same record', async () => {
  const g = await open({ scope: 'full' });
  const a = await g.ev(playScenes), b = await g.ev(playScenes);
  await g.done();
  assert.deepEqual(a, b);
});
