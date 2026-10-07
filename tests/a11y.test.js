'use strict';

// Keyboard and screen-reader access to the shell (docs/superpowers/plans/2026-10-07-ship-interface-step4-phone-tablet-access.md, #322, #267).

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

// A hired gunner landed at Earth, with a spy on announce() that records each line it is given.
async function landed() {
  const g = await open({ scope: 'earth-hired', shell: 'default' });
  await g.ev(() => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner' }); while (G.dialog) finishEvent(); G.state.story.next = 1e9;
    window.__told = []; const real = window.announce; window.announce = t => { __told.push(t); return real(t); };
  });
  return g;
}
const live = page => page.evaluate(() => (document.getElementById('live') || {}).textContent);

test('a ship\'s-log message and a Comms line are announced once', async () => {
  const g = await landed();
  await g.ev(() => msg('Hull sound.'));
  await g.page.waitForFunction(() => (document.getElementById('live') || {}).textContent === 'Hull sound.');
  await g.ev(() => { G.transit = { comms: [] }; comm('A plume sweeps past.'); });
  await g.page.waitForFunction(() => (document.getElementById('live') || {}).textContent === 'A plume sweeps past.');
  assert.deepEqual(await g.ev(() => __told), ['Hull sound.', 'A plume sweeps past.'], 'each line was announced once');
  await g.done();
});

test('a muted Comms line is not announced', async () => {
  const g = await landed();
  await g.ev(() => { G.transit = { comms: [] }; Settings.quiet.market = true; comm('[Market] Prices rise at Mars.'); });
  await g.page.waitForTimeout(150);
  assert.deepEqual(await g.ev(() => __told), [], 'nothing announced');
  assert.ok(!(await live(g.page)).includes('Prices rise'), 'the live region does not read it');
  await g.done();
});

test('the live region survives a re-render', async () => {
  const g = await landed();
  await g.ev(() => msg('Hull sound.'));
  await g.page.waitForFunction(() => (document.getElementById('live') || {}).textContent === 'Hull sound.');
  const r = await g.ev(() => {
    const el = document.getElementById('live'); UI.render();
    return { same: document.getElementById('live') === el, text: el.textContent, polite: el.getAttribute('aria-live'), atomic: el.getAttribute('aria-atomic'), inPanel: !!el.closest('#panel') };
  });
  assert.equal(r.same, true, 'the same element is still in the page');
  assert.equal(r.text, 'Hull sound.', 'its text is kept');
  assert.equal(r.polite, 'polite'); assert.equal(r.atomic, 'true');
  assert.equal(r.inPanel, false, 'it sits outside #panel');
  await g.done();
});
