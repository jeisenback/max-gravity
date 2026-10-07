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
  assert.deepEqual(r.groups, [...Array(7).fill('Ship'), ...Array(3).fill('Ashore')]);
  assert.ok(!r.names.includes('Exchange') && !r.names.includes('Company'), 'the owner pages are not drawn for a hired hand');
  assert.equal(r.active, 'port', 'a new landing opens on Port');
  await done();
});

test('an owner\'s rail keeps Exchange and Company in the Ashore group', async () => {
  const { ev, done } = await open({ shell: true });
  const r = await ev(([fn]) => {
    startGame({ slot: 1, background: 'earth', mode: 'owner', captain: 'Sam Rowe' });
    while (G.dialog) finishEvent();
    UI.render();
    return (0, eval)(`(${fn})`)();
  }, [railState.toString()]);
  for (const name of ['Exchange', 'Company']) assert.equal(r.groups[r.names.indexOf(name)], 'Ashore', `${name} is on the rail, in Ashore`);
  await done();
});

test('every enabled rail entry opens its page', async () => {
  const { page, ev, done } = await open({ shell: true });
  await ev(helpers);
  await ev(() => { start(); });
  const tabs = await page.evaluate(() => [...document.querySelectorAll('.rail button:not([disabled])')].map(b => b.dataset.arg));
  assert.ok(tabs.length >= 8, `most entries are enabled: ${tabs}`);
  for (const tab of tabs) {
    await page.click(`.rail [data-action=tab][data-arg=${tab}]`);
    const r = await ev(([fn]) => (0, eval)(`(${fn})`)(), [railState.toString()]);
    assert.equal(r.tab, tab, `${tab}: the page opened`);
    assert.equal(r.active, tab, `${tab}: its entry is lit`);
    assert.ok(r.body.length > 0, `${tab}: the page has content`);
  }
  await done();  // fails on any page error
});

test('an entry for a service this port lacks is shut and says why', async () => {
  const { ev, done } = await open({ shell: true });
  await ev(helpers);
  const r = await ev(() => {
    start();
    const planet = Object.values(SYSTEMS).flatMap(s => s.planets).find(pl => !['shipyard', 'outfitter', 'missions'].some(s => pl.services.includes(s)));
    if (!planet) return null;
    const engine = RAIL.find(e => e.id === 'engine');
    return { why: engine.ready(planet), html: railEntryHtml(engine, planet, 'port') };
  });
  assert.ok(r, 'a planet with no yard and no work board exists');
  assert.equal(typeof r.why, 'string', 'ready returns the reason');
  assert.match(r.html, /disabled/);
  assert.ok(r.html.includes(r.why), 'the reason is visible text');
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
  const r = await ev(([fn]) => { start(); UI.tab = 'nonsense'; UI.render(); return (0, eval)(`(${fn})`)(); }, [railState.toString()]);
  assert.equal(r.tab, 'port');
  assert.equal(r.active, 'port');
  await done();
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

test('a hired hand with a stale Exchange or Company tab falls back to Port', async () => {
  const { ev, done } = await open({ shell: true });
  await ev(helpers);
  const r = await ev(([fn]) => {
    start();
    const out = {};
    for (const tab of ['trade', 'company']) { UI.tab = tab; UI.render(); out[tab] = (0, eval)(`(${fn})`)().tab; }
    return out;
  }, [railState.toString()]);
  assert.deepEqual(r, { trade: 'port', company: 'port' });
  await done();
});
