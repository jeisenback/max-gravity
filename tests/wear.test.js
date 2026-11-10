'use strict';

// Ship wear (js/wear.js): the engineer's hear-it-coming pick names a part in the ship's log the day its condition crosses the breakdown line.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

test('hear-it-coming: a part worn under BREAKDOWN_BELOW is named in the home log once, and only for a hand with the pick', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  const r = await ev(() => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'engineer', captainKey: 'hester' }); while (G.dialog) finishEvent();
    const st = G.state, out = {}, logs = () => home().log.map(l => l.text).filter(t => /drive|Drive/.test(t));
    condition().drive = BREAKDOWN_BELOW + 1; wear('drive', 2); out.plain = { cond: condition().drive, logs: logs() };
    takePick(hired(), 'hear-it-coming');
    condition().drive = BREAKDOWN_BELOW + 1; wear('drive', 2); out.named = { cond: condition().drive, logs: logs() };
    wear('drive', 2); out.again = logs().length;
    condition().sensors = BREAKDOWN_BELOW + 5; wear('sensors', 1); out.above = home().log.some(l => /ensors/.test(l.text));
    return out;
  });
  assert.ok(r.plain.cond < r.named.cond + 1 && r.plain.logs.length === 0, 'without the pick the log says nothing');
  assert.ok(r.named.cond < 40); assert.equal(r.named.logs.length, 1); assert.match(r.named.logs[0], /drive/i);
  assert.equal(r.again, 1, 'the crossing is logged once, not every tick under the line');
  assert.equal(r.above, false, 'a part still above the line is not named');
  await done();
});
