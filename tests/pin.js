'use strict';

// The two tests every pin has (docs/pins.md, #457): what the code plays is what the fixture holds, and playing it twice gives the same record. A pin test file is
// then a name, the fixture, and the play function that runs in the page:
//
//   pinTests({ name: 'the family scenes', fixture: 'family-pin.json', play: playFamily, min: 150 });
//
// `play` returns a list of records; give each a `key` (or an `id`) so that tools/pin-from.js can say which records differ. A record is checked for the words of a
// broken line (`broken`). After a change on purpose, write the fixture again with `PIN_WRITE=1 node --test tests/xxxpin.test.js` and read the diff.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { open, closeBrowser } = require('./helpers');

function pinTests({ name, fixture, play, min = 1, broken = /undefined|\[object|NaN/ }) {
  after(closeBrowser);
  const file = path.join(__dirname, 'fixtures', fixture);
  const text = r => (typeof r.text === 'string' ? r.text : JSON.stringify(r));

  test(`${name} play the words they always did`, async () => {
    const g = await open({ scope: 'full' });
    const got = await g.ev(play);
    await g.done();
    assert.ok(got.length >= min, `${got.length} cases`);
    assert.deepEqual(got.filter(r => broken.test(text(r))).map(r => r.key || r.id), [], 'no broken line');
    if (process.env.PIN_WRITE) fs.writeFileSync(file, JSON.stringify(got, null, 1) + '\n');
    const want = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert.equal(got.length, want.length);
    for (let n = 0; n < want.length; n++) assert.deepEqual(got[n], want[n], want[n].key || want[n].id || `record ${n}`);
  });

  test(`the pin of ${name} is repeatable: playing them twice gives the same record`, async () => {
    const g = await open({ scope: 'full' });
    const a = await g.ev(play), b = await g.ev(play);
    await g.done();
    assert.deepEqual(a, b);
  });
}

module.exports = { pinTests };
