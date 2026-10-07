'use strict';

// The shell fits the three screens it is played on: a 1280x800 desktop, a 768x1024 tablet and a 390x844 phone
// (docs/superpowers/plans/2026-10-07-ship-interface-step4-phone-tablet-access.md, #322).

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

const SIZES = [
  { name: 'desktop', viewport: { width: 1280, height: 800 }, mobile: false },
  { name: 'tablet', viewport: { width: 768, height: 1024 }, mobile: true },
  { name: 'phone', viewport: { width: 390, height: 844 }, mobile: true },
];

// Opens the narrow build at each size with a hired gunner landed at Earth, and runs fn({ page, ev, size }) there.
async function atWidths(fn) {
  for (const size of SIZES) {
    const g = await open({ scope: 'earth-hired', shell: 'default', viewport: size.viewport, mobile: size.mobile });
    await g.ev(() => {
      window.start = (o = {}) => { startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', ...o }); while (G.dialog) finishEvent(); G.state.story.next = 1e9; };
      start();
    });
    await fn({ page: g.page, ev: g.ev, size });
    await g.done();
  }
}

// What the layout checks read: the boxes of the rail, the page, the dock and its primary action, and the scroll width.
const boxes = () => {
  const box = sel => { const e = document.querySelector(sel); if (!e) return null; const r = e.getBoundingClientRect(); return { left: r.left, top: r.top, right: r.right, bottom: r.bottom }; };
  return { scrollW: document.documentElement.scrollWidth, innerW: innerWidth, innerH: innerHeight, rail: box('.rail'), body: box('.shell .body'), dock: box('.dock'), primary: box('.dock .primary') };
};
const overlap = (a, b) => a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1;

test('every rail page fits at the three screen sizes', async () => {
  await atWidths(async ({ page, ev, size }) => {
    const tabs = await ev(() => [...document.querySelectorAll('.rail button:not([disabled])')].map(b => b.dataset.arg));
    assert.ok(tabs.length >= 7, `${size.name}: enough enabled entries: ${tabs}`);
    for (const tab of tabs) {
      await page.click(`.rail [data-action=tab][data-arg=${tab}]`);
      const r = await ev(([fn]) => (0, eval)(`(${fn})`)(), [boxes.toString()]);
      const at = `${size.name} ${tab}`;
      assert.ok(r.scrollW <= r.innerW, `${at}: no sideways scroll (${r.scrollW} > ${r.innerW})`);
      assert.ok(r.rail && r.body && r.dock && r.primary, `${at}: the rail, page, dock and primary action are all there`);
      assert.ok(!overlap(r.rail, r.body), `${at}: the rail and the page do not overlap`);
      assert.ok(!overlap(r.dock, r.rail), `${at}: the dock does not cover the rail`);
      assert.ok(!overlap(r.dock, r.body), `${at}: the dock does not cover the page`);
      assert.ok(r.primary.left >= 0 && r.primary.right <= r.innerW && r.primary.top >= 0 && r.primary.bottom <= r.innerH, `${at}: the primary action is on screen`);
    }
  });
});

test('the HUD sidebar and the panel do not overlap, and the panel clears the compact strip', async () => {
  const g = await open({ scope: 'earth-hired', shell: 'default', viewport: { width: 768, height: 1024 }, mobile: true });
  await g.ev(() => { startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner' }); while (G.dialog) finishEvent(); });
  const r = await g.ev(() => {
    const p = document.querySelector('#panel').getBoundingClientRect();
    return { hudW: G.hudW, hudLeft: innerWidth - G.hudW, panelTop: p.top, panelRight: p.right };
  });
  if (r.hudW) assert.ok(r.panelRight <= r.hudLeft, `the panel (right edge ${r.panelRight}) stays left of the HUD sidebar (${r.hudLeft})`);
  else assert.ok(r.panelTop >= 84, `the panel's top (${r.panelTop}) is at least 84px, clear of the compact HUD strip`);
  await g.done();
});

test('between 700 and 999px the compact HUD is used, and from 1000px the sidebar', async () => {
  const g = await open({ scope: 'earth-hired', shell: 'default', viewport: { width: 768, height: 1024 } });
  const hudAt = async w => { await g.page.setViewportSize({ width: w, height: 800 }); await g.page.waitForFunction(x => innerWidth === x && G.W === x, w); return g.ev(() => ({ hudW: G.hudW, hud: HUD_W })); };
  assert.equal((await hudAt(768)).hudW, 0, 'no sidebar at 768');
  assert.equal((await hudAt(999)).hudW, 0, 'no sidebar at 999');
  const wide = await hudAt(1000);
  assert.equal(wide.hudW, wide.hud, 'the sidebar at 1000');
  assert.equal((await hudAt(1280)).hudW, wide.hud, 'the sidebar at 1280');
  await g.done();
});
