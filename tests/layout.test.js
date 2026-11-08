'use strict';

// The shell fits the desktop windows it is played in: the smallest the game takes (1000x640), a 1280x800 desktop and a 1920x1080 one
// (desktop only, #937; the phone and tablet sizes of #322 are gone).

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

const SIZES = [
  { name: 'desktop', viewport: { width: 1280, height: 800 }, mobile: false },
  { name: 'small', viewport: { width: 1000, height: 640 }, mobile: false },
  { name: 'wide', viewport: { width: 1920, height: 1080 }, mobile: false },
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

test('the hand\'s readouts show on the landed screen, under the header and above the page, and in a burn, at the three sizes (#686)', async () => {
  await atWidths(async ({ page, ev, size }) => {
    const r = await ev(() => {
      const box = sel => { const e = document.querySelector(sel); if (!e) return null; const b = e.getBoundingClientRect(); return { left: b.left, top: b.top, right: b.right, bottom: b.bottom }; };
      return { strip: box('.strip'), hdr: box('.hdr'), body: box('.shell .body'), innerW: innerWidth, text: document.querySelector('.strip').textContent };
    });
    const at = `${size.name} landed`;
    assert.ok(r.strip, `${at}: the strip is there`); assert.match(r.text, /Contract/);
    assert.ok(r.strip.top >= r.hdr.bottom - 1 && r.strip.bottom <= r.body.top + 1, `${at}: the strip sits between the header and the page`);
    assert.ok(r.strip.left >= 0 && r.strip.right <= r.innerW, `${at}: the strip fits the width`);
    await ev(() => { uatBurn('Earth', 'mars'); G.transit.times = []; G.transit.event = null; G.dialog = null; G.hudStrip = null; });
    await page.waitForFunction(() => G.hudStrip);
    const b = await ev(() => ({ s: G.hudStrip, W: innerWidth, H: innerHeight }));
    assert.ok(b.s.x >= 0 && b.s.x + b.s.w <= b.W && b.s.y >= 0 && b.s.y + b.s.h <= b.H, `${size.name} burn: the HUD's readouts are on screen (${JSON.stringify(b.s)})`);
  });
});

test('the sensor board and the bars fit the fight panel at the three sizes (#680)', async () => {
  await atWidths(async ({ ev, size }) => {
    const r = await ev(() => {
      uatBurn('Earth', 'mars'); G.transit.times = []; G.transit.event = null; G.dialog = null; hired().raidTold = true;
      startShipFight({ kind: 'pirate' }, false); openEvent(G.nextEvent); G.nextEvent = null;
      const panel = document.getElementById('panel'), pb = panel.getBoundingClientRect();
      const fits = cls => { const svg = document.querySelector(`#panel .event-body svg.${cls}`), b = svg && svg.getBoundingClientRect(); return { has: !!svg, left: b && b.left, right: b && b.right, width: b && b.width }; };
      return { board: fits('board'), bars: fits('bars'), panelLeft: pb.left, panelRight: pb.right, scrollW: document.documentElement.scrollWidth, innerW: innerWidth };
    });
    for (const cls of ['board', 'bars']) {
      const at = `${size.name} fight, the ${cls}`, b = r[cls];
      assert.ok(b.has, `${at}: drawn`);
      assert.ok(b.left >= r.panelLeft - 1 && b.right <= r.panelRight + 1, `${at}: inside the dialog (${b.left} to ${b.right} in ${r.panelLeft} to ${r.panelRight})`);
      assert.ok(b.width >= 200, `${at}: readable (${b.width}px wide)`);
    }
    assert.ok(r.scrollW <= r.innerW, `${size.name}: no sideways scroll (${r.scrollW} > ${r.innerW})`);
  });
});

test('the HUD sidebar and the panel do not overlap on the smallest window', async () => {
  const g = await open({ scope: 'earth-hired', viewport: { width: 1000, height: 640 } });
  await g.ev(() => { startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner' }); while (G.dialog) finishEvent(); });
  const r = await g.ev(() => {
    const p = document.querySelector('#panel').getBoundingClientRect();
    return { hudW: G.hudW, hudLeft: innerWidth - G.hudW, panelTop: p.top, panelRight: p.right };
  });
  assert.ok(r.hudW > 0, 'the sidebar is there'); assert.ok(r.panelRight <= r.hudLeft, `the panel (right edge ${r.panelRight}) stays left of the HUD sidebar (${r.hudLeft})`);
  await g.done();
});

test('the panel is centred in the area beside the HUD sidebar, so no sliver of the backdrop shows beside it (#269)', async () => {
  for (const width of [1000, 1100, 1280, 1600]) {
    const g = await open({ scope: 'earth-hired', viewport: { width, height: 800 } });
    await g.ev(() => { startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner' }); while (G.dialog) finishEvent(); G.state.tutorial = null; UI.render(); });
    const r = await g.ev(() => { const b = document.getElementById('panel').getBoundingClientRect(); return { left: b.left, right: b.right, hud: G.hudW, W: innerWidth }; });
    const area = r.W - r.hud, gapLeft = r.left, gapRight = area - r.right;
    assert.ok(r.right <= area + 0.5, `${width}px: the panel ends at ${r.right}, the sidebar starts at ${area}`);
    assert.ok(Math.abs(gapLeft - gapRight) <= 1, `${width}px: the margins are ${gapLeft} and ${gapRight}`);
    await g.done();
  }
});

test('from 1000px, the smallest window the game takes, the HUD is the sidebar', async () => {
  const g = await open({ scope: 'earth-hired', viewport: { width: 1280, height: 800 } });
  const hudAt = async w => { await g.page.setViewportSize({ width: w, height: 800 }); await g.page.waitForFunction(x => innerWidth === x && G.W === x, w); return g.ev(() => ({ hudW: G.hudW, hud: HUD_W })); };
  const wide = await hudAt(1000);
  assert.equal(wide.hudW, wide.hud, 'the sidebar at 1000');
  assert.equal((await hudAt(1280)).hudW, wide.hud, 'the sidebar at 1280');
  await g.done();
});

test('a shut entry\'s reason is visible text', async () => {
  const g = await open({ scope: 'earth-hired', viewport: { width: 1000, height: 640 } });
  const r = await g.ev(() => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner' }); while (G.dialog) finishEvent();
    UI.planet.services = []; UI.render();  // a port with no work board and no shipyard
    const why = [...document.querySelectorAll('.rail-why')].map(e => { const b = e.getBoundingClientRect(); return { text: e.textContent, visible: b.height > 0 && getComputedStyle(e).visibility !== 'hidden', width: b.width }; });
    return { why, railW: document.querySelector('.rail').getBoundingClientRect().width };
  });
  assert.ok(r.why.length > 0, 'a shut entry gives a reason');
  for (const w of r.why) assert.ok(w.visible, `"${w.text}" is visible`);
  await g.done();
});

test('the rail groups are labelled at every width', async () => {
  await atWidths(async ({ ev, size }) => {
    const groups = await ev(() => [...document.querySelectorAll('.rail-group')].map(g => ({ role: g.getAttribute('role'), label: g.getAttribute('aria-label'), heading: g.querySelector('h3').textContent })));
    assert.ok(groups.length >= 2, `${size.name}: the Ship and Ashore groups`);
    for (const g of groups) { assert.equal(g.role, 'group', `${size.name}: ${g.heading} is a group`); assert.equal(g.label, g.heading, `${size.name}: ${g.heading} is labelled`); }
  });
});

test('the dock has no Sound button', async () => {
  for (const size of [SIZES[1], SIZES[0]]) {
    const g = await open({ scope: 'earth-hired', viewport: size.viewport, mobile: size.mobile });
    const r = await g.ev(() => {
      startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner' }); while (G.dialog) finishEvent();
      const buttons = [...document.querySelectorAll('.dock button')].map(b => { const r = b.getBoundingClientRect(); return { top: r.top, width: r.width, primary: b.classList.contains('primary') }; });
      return { buttons, sound: !!document.querySelector('.dock [data-action=sound]') };
    });
    assert.equal(r.sound, false, `${size.name}: no Sound button in the dock`);
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

test('a choice with a cost note is two lines at the three screen sizes, the readout under the label (#689)', async () => {
  await atWidths(async ({ page, ev, size }) => {
    await ev(() => openEvent({ title: 'A Test', text: 'Text.', choices: [{ label: 'Carry it to a ship that is about to sail [Pilot, 53%; if it fails: 20 cr of your own]', run: () => 0 }, { label: 'Refuse', run: () => 0 }] }));
    const r = await page.evaluate(() => {
      const box = e => e.getBoundingClientRect(), pick = document.querySelector('#panel .choices .pick'), odds = document.querySelector('#panel .choices .odds');
      return { pick: box(pick), odds: box(odds), button: box(pick.closest('button')), inner: innerWidth };
    });
    assert.ok(r.odds.top >= r.pick.bottom - 1, `${size.name}: the readout is under the label (${r.odds.top} vs ${r.pick.bottom})`);
    assert.ok(r.button.right <= r.inner, `${size.name}: the button fits`);
  });
});
