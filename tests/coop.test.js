'use strict';

// The chapter's goal as a member's share in the Ceres co-op's Ore Runner (#882, docs/superpowers/specs/2026-11-02-coop-share-design.md).

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

test('the share\'s figures: a buy-in by the vote, the full share, and the rest owed', async () => {
  const { ev, done } = await open();
  const r = await ev(() => ({ share: typeof SHARE_PRICE === 'undefined' ? null : SHARE_PRICE, buyIn: typeof BUY_IN === 'undefined' ? null : BUY_IN, target: HIRED_TARGET, debt: HIRED_DEBT,
    port: typeof COOP_PORT === 'undefined' ? null : COOP_PORT, stopgap: typeof STOPGAP_FACTOR }));
  await done();
  assert.equal(r.share, 150000);
  assert.deepEqual(r.buyIn, { good: 51000, mid: 57000, bad: 63000 });
  assert.equal(r.target, 57000); assert.equal(r.debt, 9000); assert.equal(r.port, 'Ceres Station');
  assert.equal(r.stopgap, 'undefined');
});
