'use strict';

// Wrecks and salvage (#965, js/salvage.js): the cutting's numbers in plain Node; the board, the scenes and delivery in the browser.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./nodecontext');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

const NAMES = ['WRECK_TYPES', 'SECTION_RISK', 'CAREFUL', 'sectionRisk', 'sectionTake', 'sectionPart', 'riskOutcome', 'readWord', 'seedSite'];
const pure = () => load(['js/data.js', 'js/util.js', 'js/orbits.js', 'js/sites.js', 'js/salvage.js'], { G: { state: {} }, Mods: { register() {}, on() {} } }, NAMES);

test('the risk of a section rises with depth and halves when cut carefully', () => {
  const { sectionRisk, SECTION_RISK, CAREFUL } = pure();
  assert.deepEqual([...SECTION_RISK], [0.1, 0.25, 0.4]); assert.equal(CAREFUL, 0.5);
  assert.equal(sectionRisk(1, false), 0.1); assert.equal(sectionRisk(3, false), 0.4); assert.equal(sectionRisk(2, true), 0.125);
});

test('the take of a section is 3, 5 or 8 tons by depth, halved carefully, never more than the room, in one of the type\'s goods', () => {
  const { sectionTake, WRECK_TYPES } = pure();
  assert.equal(sectionTake('orehauler', 1, false, 100).tons, 3); assert.equal(sectionTake('orehauler', 2, false, 100).tons, 5);
  assert.equal(sectionTake('orehauler', 3, false, 100).tons, 8); assert.equal(sectionTake('orehauler', 3, true, 100).tons, 4);
  assert.equal(sectionTake('orehauler', 3, false, 2).tons, 2); assert.equal(sectionTake('orehauler', 3, false, 0).tons, 0);
  for (const type of Object.keys(WRECK_TYPES)) for (const d of [1, 2, 3]) assert.ok(WRECK_TYPES[type].goods.includes(sectionTake(type, d, false, 50).good));
});

test('an intact part is on a later section of some wrecks, the same every time, and never on the first', () => {
  const { sectionPart, seedSite } = pure();
  let two = 0, three = 0;
  for (let i = 0; i < 300; i++) {
    const w = seedSite(i * 7919, 'wreck', 1, 0).wreck;
    assert.equal(sectionPart(w, 1), false); assert.equal(sectionPart(w, 2), sectionPart(w, 2));
    if (sectionPart(w, 2)) two++; if (sectionPart(w, 3)) three++;
  }
  assert.ok(two > 60 && two < 140, `about a third on section 2: ${two}`); assert.ok(three > 110 && three < 190, `about half on section 3: ${three}`);
});

test('a failed cut is an injury, a system hit or the section lost, by thirds of the roll', () => {
  const { riskOutcome } = pure();
  assert.equal(riskOutcome(0.1), 'hurt'); assert.equal(riskOutcome(0.5), 'system'); assert.equal(riskOutcome(0.9), 'lost');
});

test('the read of a section is clean, some or bad, never more than a band off, and a skilled reader reads true', () => {
  const { readWord } = pure();
  const band = r => (r < 0.15 ? 0 : r < 0.33 ? 1 : 2), words = ['clean', 'some', 'bad'];
  assert.equal(readWord(0.1, 0), 'clean'); assert.equal(readWord(0.1, 3), 'clean');
  assert.equal(readWord(0.4, 3), 'bad'); assert.equal(readWord(0.25, 3), 'some');
  for (const r of [0.05, 0.1, 0.125, 0.2, 0.25, 0.4]) assert.ok(Math.abs(words.indexOf(readWord(r, 0)) - band(r)) <= 1, `${r}`);
});
