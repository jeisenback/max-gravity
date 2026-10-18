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

// A pin that names `words` (the keys that hold prose, at any depth) is compared twice (#574). The effects test drops the words and the changes of a memory or the home log
// (`changes` holds paths with their values) and must pass unchanged: a diff in it says behavior changed, and a commit that changes it says why. The words test
// compares everything and fails when a prose pass has changed a line: write the fixture again with `PIN_WRITE=1` and read the diff as a proofread.
const MEMORY_CHANGE = /^s\.(?:home\.log|people\.[^.]+\.memories)\b/;
function withoutWords(v, words) {
  if (Array.isArray(v)) return v.map(x => withoutWords(x, words)).filter(x => !(typeof x === 'string' && MEMORY_CHANGE.test(x)));
  if (v && typeof v === 'object') {
    const out = {};
    for (const k of Object.keys(v)) if (!words.includes(k)) out[k] = withoutWords(v[k], words);
    return out;
  }
  return v;
}

function pinTests({ name, fixture, play, min = 1, broken = /undefined|\[object|NaN/, words, check, label }) {
  let played, page;  // the one page both plays run on: the repeatable test plays again on it, so a pin costs one page and two plays (#753)
  after(async () => { try { if (page) await page.done(); } finally { await closeBrowser(); } });
  const file = path.join(__dirname, 'fixtures', fixture);
  const text = r => (typeof r.text === 'string' ? r.text : JSON.stringify(r));
  const idOf = (r, n) => (label ? label(r) : r.key || r.id || `record ${n}`);
  const playOnce = () => played || (played = (async () => {
    page = await open({ scope: 'full' });
    const got = await page.ev(play);
    assert.ok(got.length >= min, `${got.length} cases`);
    assert.deepEqual(got.filter(r => broken.test(text(r))).map(idOf), [], 'no broken record');
    if (check) check(got);
    if (process.env.PIN_WRITE) fs.writeFileSync(file, JSON.stringify(got, null, 1) + '\n');
    return { got, want: JSON.parse(fs.readFileSync(file, 'utf8')) };
  })());
  const same = (got, want, f) => {
    assert.equal(got.length, want.length);
    for (let n = 0; n < want.length; n++) assert.deepEqual(f(got[n]), f(want[n]), idOf(want[n], n));
  };

  if (words) {
    test(`${name} do what they always did`, async () => {
      const { got, want } = await playOnce();
      same(got, want, r => withoutWords(r, words));
    });
    test(`${name} say what the fixture holds (after a prose pass, PIN_WRITE=1 and read the diff)`, async () => {
      const { got, want } = await playOnce();
      same(got, want, r => r);
    });
  } else {
    test(`${name} play as they always did`, async () => {
      const { got, want } = await playOnce();
      same(got, want, r => r);
    });
  }

  test(`the pin of ${name} is repeatable: playing them twice gives the same record`, async () => {
    const { got } = await playOnce();
    assert.deepEqual(await page.ev(play), got);
  });
}

module.exports = { pinTests };
