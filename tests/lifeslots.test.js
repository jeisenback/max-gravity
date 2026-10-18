'use strict';

// Downtime slots (js/shiplife.js): a pick every couple of days of the leg, two on a short leg and five on a long one, the first before the flip and the last after. The rules in plain Node, the
// burn's length and the button in the page.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./nodecontext');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

const { lifeSlotCount, lifeSlotKeys, lifeSlotOf, lifeFree, spendLife } = load(['js/shiplife.js'], { Mods: { register() {} } }, ['lifeSlotCount', 'lifeSlotKeys', 'lifeSlotOf', 'lifeFree', 'spendLife']);
const at = (slots, p, used = {}, flipped = p >= 0.5) => lifeSlotOf({ slots, total: 100, left: 100 * (1 - p), flipped, lifeUsed: used });

test('a leg of a few days has two slots and a long one five, and the keys run before, the middle ones, after', () => {
  assert.deepEqual([3, 4, 6, 8, 10, 15, 40].map(lifeSlotCount), [2, 2, 3, 4, 5, 5, 5]);
  assert.deepEqual([...lifeSlotKeys(2)], ['before', 'after']);
  assert.deepEqual([...lifeSlotKeys(4)], ['before', 'm1', 'm2', 'after']);
});

test('a slot opens when the burn reaches its share, and a slot not taken is gone when the next opens; two slots are the flip', () => {
  assert.equal(at(2, 0.1), 'before'); assert.equal(at(2, 0.49), 'before'); assert.equal(at(2, 0.5), 'after');
  assert.equal(at(4, 0.1), 'before'); assert.equal(at(4, 0.3), 'm1'); assert.equal(at(4, 0.6), 'm2'); assert.equal(at(4, 0.8), 'after'); assert.equal(at(4, 0.99), 'after');
  assert.equal(at(5, 0.5), 'm2', 'the flip opens the middle one of five, and after is still to come');
  assert.equal(lifeSlotOf({ flipped: true, lifeUsed: {} }), 'after', 'a bare transit has two slots, and the flip opens the second');
  assert.equal(lifeSlotOf({ lifeUsed: {} }), 'before');
});

test('a slot is free until it is spent, and a sitting can spend the first or the last ahead of the burn', () => {
  const t = { slots: 4, total: 100, left: 70 };  // a third in: the second slot
  assert.equal(lifeFree(t), true); spendLife(t); assert.deepEqual({ ...t.lifeUsed }, { m1: true }); assert.equal(lifeFree(t), false);
  t.left = 40; assert.equal(lifeFree(t), true, 'the next slot is open');
  spendLife(t, 'after'); spendLife(t, 'before'); assert.deepEqual({ ...t.lifeUsed }, { m1: true, after: true, before: true });
  t.left = 5; assert.equal(lifeFree(t), false, 'the last was spent ahead');
});

test('a long burn runs longer and has a pick for each slot, one opening as the burn reaches it', async () => {
  const { ev, done } = await open();
  const r = await ev(() => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'engineer' }); while (G.dialog) finishEvent();
    const out = {}, st = G.state; st.story.next = 1e9; st.flags.classicCombat = true; st.day += 30;
    out.secs = [3, 6, 10, 15].map(transitSeconds);
    uatBurn('Ceres Station', 'pallas'); const t = G.transit; t.times = []; t.event = null; G.dialog = null;
    t.slots = 4; t.lifeUsed = {}; t.flipped = false;
    const slot = p => { t.left = t.total * (1 - p); return lifeSlot(); }, note = () => { syncLifeButtons(); const el = document.getElementById('tlife'); return [el.hidden, el.querySelector('button').disabled, el.dataset.note]; };
    out.a = slot(0.1); out.free = note(); t.lifeUsed[out.a] = true; out.spent = note(); out.c = slot(0.3); out.next = note(); t.lifeUsed[out.c] = true; out.d = slot(0.3);
    out.last = slot(0.8); t.lifeUsed.after = true; out.done = note();
    return out; });
  assert.deepEqual(r.secs, [60, 90, 150, 150].map((n, i) => (i === 0 ? 60 : n)), 'a short leg keeps the minimum, a long one has thirty seconds a slot');
  assert.deepEqual([r.a, r.c, r.d, r.last], ['before', 'm1', 'm1', 'after']);
  assert.deepEqual([r.free, r.spent, r.next, r.done].map(x => x[1]), [false, true, false, true], 'the button is shut once the slot is taken and open when the next one opens');
  assert.deepEqual([r.spent[2], r.done[2]], ['Next in a day or two', 'Done for this burn']);
  await done();
});
