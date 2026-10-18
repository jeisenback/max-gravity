'use strict';

// The stall watchdog of tests/helpers.js (#729): a page that stops answering fails its test, naming where it was called from and whether the renderer was busy, and does not stall the run.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

test('an evaluate that does not return fails in the time given, saying where it was called from and that the renderer was busy', async () => {
  const { ev } = await open({ stall: 2500 });
  const t0 = Date.now();
  await assert.rejects(() => ev(() => { for (;;); }), e => {
    assert.match(e.message, /the page did not answer in 2\.5 s/);
    assert.match(e.message, /ev, .*stall\.test\.js/, 'it names the test file that called');
    assert.match(e.message, /the renderers used (0\.[5-9]\d|1\.\d\d|[2-9]\.\d\d) s of CPU/, 'a loop keeps a renderer busy');
    return true;
  });
  assert.ok(Date.now() - t0 < 12000, `failed after ${Date.now() - t0} ms`);
});

test('a page that answers is not touched by the watchdog, and no limit is a choice', async () => {
  const quick = await open({ stall: 5000 });
  assert.equal(await quick.ev(() => 6 * 7), 42);
  await quick.done();
  const free = await open({ stall: 0 });
  assert.equal(await free.ev(() => 'ok'), 'ok');
  await free.done();
});
