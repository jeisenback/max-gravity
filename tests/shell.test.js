'use strict';

// The ship-interface shell (docs/superpowers/specs/2026-10-05-ship-interface-design.md): a landed screen with a rail of
// the ship's rooms and an Ashore group, built behind a flag that is off unless the address says shell=on (js/build.js).

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

const helpers = () => {
  window.start = (o = {}) => { startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', ...o }); while (G.dialog) finishEvent(); const st = G.state; st.story.next = 1e9; return st; };
};

test('the shell is off unless the address asks for it', async () => {
  const off = await open({});
  assert.equal(await off.ev(() => shellOn()), false);
  await off.done();
  const on = await open({ shell: true });
  assert.equal(await on.ev(() => shellOn()), true);
  await on.done();
});

test('with the shell off the landed screen is unchanged', async () => {
  const { ev, done } = await open({});
  await ev(helpers);
  const r = await ev(() => {
    start();
    // innerHTML is the browser's own serialization, so put the pieces through the same parser before comparing.
    const norm = html => { const d = document.createElement('div'); d.innerHTML = html; return d.innerHTML; };
    const shown = UI.el.innerHTML;
    return {
      shell: !!document.querySelector('.shell'), stations: document.querySelectorAll('[data-action=station]').length,
      header: shown.includes(norm(UI.headerHtml(UI.planet))), dock: shown.includes(norm(UI.dockHtml())),
    };
  });
  assert.equal(r.shell, false, 'no shell');
  assert.ok(r.stations > 0, 'the old station keys are still there');
  assert.ok(r.header, 'the screen contains the header UI.headerHtml builds');
  assert.ok(r.dock, 'the screen contains the dock UI.dockHtml builds');
  await done();
});

// With the shell on, a hired gunner at Earth. Returns what the rail shows.
const railState = () => {
  const names = [...document.querySelectorAll('.rail button')].map(b => b.textContent);
  const group = name => { const g = [...document.querySelectorAll('.rail-group')].find(x => [...x.querySelectorAll('button')].some(b => b.textContent === name)); return g ? g.querySelector('h3').textContent : null; };
  const active = document.querySelector('.rail button.active');
  return { names, groups: names.map(group), active: active ? active.dataset.arg : null, tab: UI.tab, body: (document.querySelector('.shell .body') || {}).innerHTML || '' };
};

test('a hired gunner\'s rail has the ship\'s pages and three Ashore pages, and no owner pages', async () => {
  const { ev, done } = await open({ shell: true });
  await ev(helpers);
  const r = await ev(([fn]) => { start(); return (0, eval)(`(${fn})`)(); }, [railState.toString()]);
  assert.deepEqual(r.names, ['Bridge', 'Comms', 'Gunnery', 'Engine', 'Crew', 'Bonds', 'Journal', 'Port', 'Missions', 'Bar']);
  assert.deepEqual(r.groups, ['Ship', 'Ship', 'Ship', 'Ship', 'Ship', 'Ship', 'Ship', 'Ashore', 'Ashore', 'Ashore']);
  assert.ok(!r.names.includes('Exchange') && !r.names.includes('Company'), 'the owner pages are not on a hand\'s rail');
  assert.equal(r.active, 'port', 'a new landing opens on Port');
  await done();
});

test('an owner\'s rail keeps Exchange and Company in the Ashore group', async () => {
  const { ev, done } = await open({ shell: true });
  await ev(helpers);
  const r = await ev(([fn]) => { start({ mode: 'owner', post: undefined }); return (0, eval)(`(${fn})`)(); }, [railState.toString()]);
  assert.ok(r.names.includes('Exchange') && r.names.includes('Company'), 'both owner pages are on the rail');
  assert.equal(r.groups[r.names.indexOf('Exchange')], 'Ashore'); assert.equal(r.groups[r.names.indexOf('Company')], 'Ashore');
  await done();
});

test('every rail entry opens its page', async () => {
  const { page, ev, done } = await open({ shell: true });
  await ev(helpers);
  await ev(() => { start(); });
  const tabs = await ev(() => [...document.querySelectorAll('.rail button:not([disabled])')].map(b => b.dataset.arg));
  assert.ok(tabs.length >= 7, `enough enabled entries: ${tabs}`);
  for (const tab of tabs) {
    await page.click(`.rail [data-action=tab][data-arg=${tab}]`);
    const r = await ev(([fn]) => (0, eval)(`(${fn})`)(), [railState.toString()]);
    assert.equal(r.tab, tab); assert.equal(r.active, tab, `${tab} is lit`); assert.ok(r.body.length > 0, `${tab} has a page`);
  }
  await done();
});

test('a rail button opens its page and takes the highlight', async () => {
  const { page, ev, done } = await open({ shell: true });
  await ev(helpers);
  await ev(() => { start(); });
  await page.click('.rail [data-action=tab][data-arg=bar]');
  const r = await ev(([fn]) => (0, eval)(`(${fn})`)(), [railState.toString()]);
  assert.equal(r.tab, 'bar');
  assert.equal(r.active, 'bar');
  assert.ok(r.body.length > 0, 'the Bar page is on screen');
  await done();
});

test('the character screen keeps the Crew entry lit', async () => {
  const { ev, done } = await open({ shell: true });
  await ev(helpers);
  const r = await ev(([fn]) => { start(); G.viewPerson = 'you'; UI.tab = 'person'; UI.render(); return (0, eval)(`(${fn})`)(); }, [railState.toString()]);
  assert.equal(r.tab, 'person', 'the character screen is still the page');
  assert.equal(r.active, 'crew');
  await done();
});

test('a tab the shell does not know falls back to Port', async () => {
  const { ev, done } = await open({ shell: true });
  await ev(helpers);
  const r = await ev(([fn]) => { start(); UI.tab = 'nowhere'; UI.render(); return (0, eval)(`(${fn})`)(); }, [railState.toString()]);
  assert.equal(r.tab, 'port');
  assert.equal(r.active, 'port');
  await done();
});

test('an entry for a service this port lacks is shut and says why', async () => {
  const { ev, done } = await open({ shell: true });
  await ev(helpers);
  const r = await ev(() => {
    start();
    const planet = Object.values(SYSTEMS).flatMap(sy => sy.planets).find(pl => !['shipyard', 'outfitter', 'missions'].some(x => pl.services.includes(x)));
    if (!planet) return { none: true };
    const engine = RAIL.find(e => e.id === 'engine'), why = engine.ready(planet);
    return { why, html: railEntryHtml(engine, planet, 'port'), missions: RAIL.find(e => e.id === 'missions').ready(planet) };
  });
  assert.ok(!r.none, 'a planet with none of those services exists');
  assert.equal(typeof r.why, 'string'); assert.match(r.html, /disabled/); assert.ok(r.html.includes(r.why), 'the reason is visible text');
  assert.equal(typeof r.missions, 'string');
  await done();
});

test('the captain\'s name and run label do not split or gap, at 390 and 1280', async () => {
  for (const [name, viewport, mobile] of [['phone', { width: 390, height: 844 }, true], ['wide', { width: 1280, height: 800 }, false]]) {
    const { ev, done } = await open({ shell: true, scope: 'earth-hired', viewport, mobile });
    await ev(helpers);
    const r = await ev(() => {
      start({ captainKey: 'hester' });
      const label = document.querySelector('.post .eyebrow'), btn = label.querySelector('button.link'), after = btn.nextSibling;
      const range = document.createRange(); range.setStart(after, 0); range.setEnd(after, after.textContent.indexOf("'") + 1);
      const apos = range.getClientRects()[0], inner = document.createRange(); inner.selectNodeContents(btn); const b = inner.getBoundingClientRect();  // the name's own text, not the button's padding
      const head = document.querySelector('.stats .nowrap');
      return { text: label.textContent.replace(/\s+/g, ' ').trim().toLowerCase(), btnRects: btn.getClientRects().length, gap: apos.left - b.right, head: head ? head.getClientRects().length : null, headText: head ? head.textContent : '' };
    });
    assert.ok(r.text.startsWith("captain hester vance's run"), `${name}: ${r.text}`);
    assert.equal(r.btnRects, 1, `${name}: the name is on one line`);
    assert.ok(r.gap <= 2, `${name}: the gap before the apostrophe is ${r.gap}px`);
    assert.equal(r.head, 1, `${name}: the header name is on one line`); assert.match(r.headText, /^Capt\. Hester Vance$/);
    await done();
  }
});

// (The plant and cutaway drawings are SVG, and the con- readouts sit beside them: step 5, the burn view, reworks both.)
const smallText = () => [...document.querySelectorAll('#panel *')].filter(el => !el.closest('#uat, svg, [class^=con-], [class*=" con-"]') && el.offsetParent !== null
  && [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && parseFloat(getComputedStyle(el).fontSize) < 12)
  .map(el => `${el.tagName.toLowerCase()}.${String(el.className).trim().replace(/\s+/g, '.')} ${getComputedStyle(el).fontSize}`);

test('no visible text on a shell page is under 12px at 390px', async () => {
  const { page, ev, done } = await open({ shell: true, viewport: { width: 390, height: 844 }, mobile: true });
  await ev(helpers);
  await ev(() => { start(); });
  const tabs = await ev(() => [...document.querySelectorAll('.rail button:not([disabled])')].map(b => b.dataset.arg));
  const offenders = {};
  for (const tab of tabs) {
    await page.click(`.rail [data-action=tab][data-arg=${tab}]`);
    for (const o of await ev(([fn]) => (0, eval)(`(${fn})`)(), [smallText.toString()])) (offenders[o] = offenders[o] || (offenders[o] = [])).includes(tab) || offenders[o].push(tab);
  }
  assert.deepEqual(offenders, {}, 'text under 12px, with the pages it shows on');
  await done();
});

test('the rail fits at 360px', async () => {
  const { ev, done } = await open({ shell: true, viewport: { width: 360, height: 740 }, mobile: true });
  await ev(helpers);
  const r = await ev(([fn]) => { start(); return (0, eval)(`(${fn})`)(); }, [layout.toString()]);
  assert.equal(r.noSideScroll, true, 'the page does not scroll sideways'); assert.equal(r.buttonsOnScreen, true, 'every entry is on screen');
  await done();
});

test('the last item can be scrolled clear of the dock at 390px', async () => {
  const { ev, done } = await open({ shell: true, viewport: { width: 390, height: 844 }, mobile: true });
  await ev(helpers);
  const r = await ev(() => {
    start(); UI.tab = 'port'; UI.render();
    const body = document.querySelector('.shell .body'), dock = document.querySelector('.dock');
    // whichever box scrolls: the page body or the panel
    for (const el of [body, document.getElementById('panel'), document.scrollingElement]) if (el) el.scrollTop = el.scrollHeight;
    const last = [...body.children].pop().getBoundingClientRect();
    return { lastBottom: last.bottom, dockTop: dock.getBoundingClientRect().top };
  });
  assert.ok(r.lastBottom <= r.dockTop + 1, `the last item ends at ${r.lastBottom}, the dock starts at ${r.dockTop}`);
  await done();
});

test('the Suggest buttons line up at 1280px and stack at 390px', async () => {
  for (const [name, viewport, mobile] of [['wide', { width: 1280, height: 800 }, false], ['phone', { width: 390, height: 844 }, true]]) {
    const { ev, done } = await open({ shell: true, scope: 'earth-hired', viewport, mobile });
    await ev(helpers);
    const r = await ev(() => {
      start({ captainKey: 'hester' }); UI.tab = 'port'; UI.render();
      const rows = [...document.querySelectorAll('.suggest-row')];
      return { n: rows.length, lefts: rows.map(row => row.querySelector('button').getBoundingClientRect().left), widths: rows.map(row => [row.querySelector('button').getBoundingClientRect().width, row.getBoundingClientRect().width]),
        below: rows.map(row => row.querySelector('button').getBoundingClientRect().top >= row.querySelector('.hint').getBoundingClientRect().bottom - 1) };
    });
    assert.ok(r.n >= 2, `${name}: the alternatives are shown (${r.n})`);
    if (name === 'wide') assert.ok(r.lefts.every(l => Math.abs(l - r.lefts[0]) <= 1), `wide: the buttons share a left edge: ${r.lefts}`);
    else { assert.ok(r.widths.every(([b, w]) => b >= w - 2), `phone: each button is as wide as its row: ${JSON.stringify(r.widths)}`); assert.ok(r.below.every(Boolean), 'phone: each button sits below its text'); }
    await done();
  }
});

test('an unavailable entry says why', async () => {
  const { ev, done } = await open({ shell: true });
  await ev(helpers);
  const html = await ev(() => { start(); return railEntryHtml({ id: 'x', label: 'X', group: 'ashore', tab: 'x', ready: () => 'No work board here' }, UI.planet, 'port'); });
  assert.match(html, /disabled/);
  assert.match(html, /No work board here/, 'the reason is visible text, not only a disabled button');
  await done();
});

// Where the rail and the page sit, and whether anything runs off the side.
const layout = () => {
  const rail = document.querySelector('.rail').getBoundingClientRect(), body = document.querySelector('.shell .body').getBoundingClientRect();
  const buttons = [...document.querySelectorAll('.rail button')].map(b => b.getBoundingClientRect());
  return {
    railLeftOfBody: rail.right <= body.left + 1, railAboveBody: rail.bottom <= body.top + 1,
    noSideScroll: document.documentElement.scrollWidth <= window.innerWidth,
    buttonsOnScreen: buttons.every(r => r.left >= 0 && r.right <= window.innerWidth && r.width > 0),
  };
};

test('a scene opened over the shell returns to the shell', async () => {
  const { ev, done } = await open({ shell: true });
  await ev(helpers);
  const r = await ev(() => {
    start();
    const before = UI.tab;
    openEvent({ title: 'T', text: 'x', choices: [{ label: 'A', run: () => 'a' }] });
    chooseEvent(0); finishEvent();
    return { shell: !!document.querySelector('.shell'), tab: UI.tab, before };
  });
  assert.equal(r.shell, true, 'the shell is back on screen, not the old screen');
  assert.equal(r.tab, r.before);
  await done();
});

test('at desktop width the rail sits beside the page', async () => {
  const { ev, done } = await open({ shell: true });
  await ev(helpers);
  const r = await ev(([fn]) => { start(); return (0, eval)(`(${fn})`)(); }, [layout.toString()]);
  assert.equal(r.railLeftOfBody, true, 'the rail is to the left of the page');
  assert.equal(r.noSideScroll, true);
  assert.equal(r.buttonsOnScreen, true);
  await done();
});

test('a phone has no horizontal scroll, the rail is a row above the page, and every entry is on screen', async () => {
  const { ev, done } = await open({ shell: true, viewport: { width: 390, height: 844 }, mobile: true });
  await ev(helpers);
  const r = await ev(([fn]) => { start(); return (0, eval)(`(${fn})`)(); }, [layout.toString()]);
  assert.equal(r.railAboveBody, true, 'the rail is above the page');
  assert.equal(r.noSideScroll, true, 'the page does not scroll sideways');
  assert.equal(r.buttonsOnScreen, true, 'every rail entry is inside the screen width');
  await done();
});
