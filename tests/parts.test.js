'use strict';

// Parts (#1135, js/parts.js): each of the ship's systems has one fitted part, from a yard, used or printed; its price is a share of the yard's
// (today's overhaul), it puts the system back to its source's mark, and it sets how fast the system wears after. A system with no fitted part
// has its original yard part, so an old save wears as it did.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./nodecontext');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

const parts = () => load(['js/util.js', 'js/parts.js'], {}, ['PART_SOURCES', 'partPrice', 'fittedPart', 'fitPart', 'partWear']);

test('a part costs its source\'s share of the yard\'s price, which is today\'s overhaul', () => {
  const { partPrice } = parts();
  assert.equal(partPrice(40, 'yard'), 4800);
  assert.equal(partPrice(40, 'used'), 2160);
  assert.equal(partPrice(40, 'printed'), 960);
});

test('a system with no fitted part has its original yard part; a printed part restores to 85 and wears at 1.75', () => {
  const { fittedPart, fitPart, partWear } = parts();
  assert.deepEqual(JSON.parse(JSON.stringify(fittedPart({}, 'drive'))), { source: 'yard', quirk: null, day: 0 });
  assert.equal(partWear({}, 'drive'), 1);
  const st = { condition: { drive: 40 } };
  fitPart(st, 'drive', 'printed', null, 5);
  assert.equal(st.condition.drive, 85);
  assert.equal(partWear(st, 'drive'), 1.75);
  fitPart(st, 'drive', 'used', null, 6); assert.equal(st.condition.drive, 90, 'a used part restores to 90');
  st.condition.drive = 95; fitPart(st, 'drive', 'printed', null, 7); assert.equal(st.condition.drive, 95, 'never takes a system down');
});

test('in the game a printed drive wears 1.75 times a yard one, nothing wears with wear off, and a new chapter\'s ship has no parts fitted', async () => {
  const { ev, done } = await open();
  const r = await ev(() => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester' }); while (G.dialog) finishEvent();
    const st = G.state, c = condition(), out = {};
    Settings.wear = 'slow';
    c.drive = 80; wear('drive', 1); out.yard = 80 - c.drive;
    fitPart(st, 'drive', 'printed', null, st.day); c.drive = 80; wear('drive', 1); out.printed = 80 - c.drive;
    Settings.wear = 'off'; c.drive = 80; wear('drive', 1); out.off = 80 - c.drive; Settings.wear = 'slow';
    st.parts = { drive: { source: 'printed', quirk: null, day: 1 } };
    chapterTwoShip(st);  // the co-op's hull (hired.js), as the chapter two start makes her
    out.after = st.parts || null;
    return out;
  });
  await done();
  assert.equal(r.yard, 1); assert.equal(r.printed, 1.75); assert.equal(r.off, 0);
  assert.ok(!r.after || Object.keys(r.after).length === 0, 'the co-op\'s ship has no parts fitted');
});
