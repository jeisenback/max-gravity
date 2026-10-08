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
    const g = await open({ scope: 'earth-hired', viewport: size.viewport, mobile: size.mobile });
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
  const g = await open({ scope: 'earth-hired', viewport: { width: 768, height: 1024 }, mobile: true });
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
  const g = await open({ scope: 'earth-hired', viewport: { width: 768, height: 1024 } });
  const hudAt = async w => { await g.page.setViewportSize({ width: w, height: 800 }); await g.page.waitForFunction(x => innerWidth === x && G.W === x, w); return g.ev(() => ({ hudW: G.hudW, hud: HUD_W })); };
  assert.equal((await hudAt(768)).hudW, 0, 'no sidebar at 768');
  assert.equal((await hudAt(999)).hudW, 0, 'no sidebar at 999');
  const wide = await hudAt(1000);
  assert.equal(wide.hudW, wide.hud, 'the sidebar at 1000');
  assert.equal((await hudAt(1280)).hudW, wide.hud, 'the sidebar at 1280');
  await g.done();
});

test('on a phone the rail is a grid between the page and the dock, with every entry at least 44px high', async () => {
  const g = await open({ scope: 'earth-hired', viewport: { width: 390, height: 844 }, mobile: true });
  await g.ev(() => { startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner' }); while (G.dialog) finishEvent(); });
  const r = await g.ev(() => {
    const rail = document.querySelector('.rail'), rb = rail.getBoundingClientRect();
    const buttons = [...rail.querySelectorAll('button')].map(b => b.getBoundingClientRect());
    return {
      bodyBottom: document.querySelector('.shell .body').getBoundingClientRect().bottom, dockTop: document.querySelector('.dock').getBoundingClientRect().top,
      railTop: rb.top, railBottom: rb.bottom, scrollW: rail.scrollWidth, clientW: rail.clientWidth,
      heights: buttons.map(b => b.height), rows: new Set(buttons.map(b => Math.round(b.top))).size,
    };
  });
  assert.ok(r.railTop >= r.bodyBottom - 1, `the rail (top ${r.railTop}) is below the page (bottom ${r.bodyBottom})`);
  assert.ok(r.railBottom <= r.dockTop + 1, `the rail (bottom ${r.railBottom}) is above the dock (top ${r.dockTop})`);
  assert.ok(r.heights.every(h => h >= 44), `every entry is at least 44px high: ${r.heights}`);
  assert.ok(r.rows <= 6, `the entries are in at most six rows (${r.rows})`);
  assert.ok(r.scrollW <= r.clientW, 'the rail does not scroll sideways');
  await g.done();
});

test('a shut entry\'s reason is visible text on a phone, across the grid', async () => {
  const g = await open({ scope: 'earth-hired', viewport: { width: 390, height: 844 }, mobile: true });
  const r = await g.ev(() => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner' }); while (G.dialog) finishEvent();
    UI.planet.services = []; UI.render();  // a port with no work board and no shipyard
    const why = [...document.querySelectorAll('.rail-why')].map(e => { const b = e.getBoundingClientRect(); return { text: e.textContent, visible: b.height > 0 && getComputedStyle(e).visibility !== 'hidden', width: b.width }; });
    return { why, railW: document.querySelector('.rail').getBoundingClientRect().width };
  });
  assert.ok(r.why.length > 0, 'a shut entry gives a reason');
  for (const w of r.why) { assert.ok(w.visible, `"${w.text}" is visible`); assert.ok(w.width >= r.railW - 30, `"${w.text}" spans the grid (${w.width} of ${r.railW})`); }
  await g.done();
});

test('the rail groups are labelled at every width', async () => {
  await atWidths(async ({ ev, size }) => {
    const groups = await ev(() => [...document.querySelectorAll('.rail-group')].map(g => ({ role: g.getAttribute('role'), label: g.getAttribute('aria-label'), heading: g.querySelector('h3').textContent })));
    assert.ok(groups.length >= 2, `${size.name}: the Ship and Ashore groups`);
    for (const g of groups) { assert.equal(g.role, 'group', `${size.name}: ${g.heading} is a group`); assert.equal(g.label, g.heading, `${size.name}: ${g.heading} is labelled`); }
  });
});

test('the dock has no Sound button, and is one row on a phone', async () => {
  for (const size of [SIZES[2], SIZES[0]]) {
    const g = await open({ scope: 'earth-hired', viewport: size.viewport, mobile: size.mobile });
    const r = await g.ev(() => {
      startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner' }); while (G.dialog) finishEvent();
      const buttons = [...document.querySelectorAll('.dock button')].map(b => { const r = b.getBoundingClientRect(); return { top: r.top, width: r.width, primary: b.classList.contains('primary') }; });
      return { buttons, sound: !!document.querySelector('.dock [data-action=sound]') };
    });
    assert.equal(r.sound, false, `${size.name}: no Sound button in the dock`);
    if (size.name === 'phone') {
      assert.ok(r.buttons.every(b => Math.abs(b.top - r.buttons[0].top) <= 1), `the dock buttons share one row: ${r.buttons.map(b => b.top)}`);
      assert.ok(r.buttons.find(b => b.primary).width >= Math.max(...r.buttons.map(b => b.width)) - 1, 'the primary button is the widest');
    }
    await g.done();
  }
});

test('Sound is still a setting', async () => {
  const g = await open({ scope: 'earth-hired' });
  const r = await g.ev(() => {
    Menu.view = 'settings'; Menu.render();
    const box = document.getElementById('setSound'), before = Sfx.on;
    if (!box) return { box: false };
    box.checked = !before; box.dispatchEvent(new Event('change', { bubbles: true }));
    return { box: true, before, after: Sfx.on };
  });
  assert.equal(r.box, true, 'the Settings screen has #setSound');
  assert.notEqual(r.after, r.before, 'toggling it changes Sfx.on');
  await g.done();
});
