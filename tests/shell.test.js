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

test('the rail shows the ship group and the Ashore group', async () => {
  const { ev, done } = await open({ shell: true });
  await ev(helpers);
  const r = await ev(([fn]) => { start(); return (0, eval)(`(${fn})`)(); }, [railState.toString()]);
  assert.deepEqual(r.names, ['Crew', 'Port', 'Bar']);
  assert.deepEqual(r.groups, ['Ship', 'Ashore', 'Ashore']);
  assert.equal(r.active, 'port', 'a new landing opens on Port');
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
  const r = await ev(([fn]) => { start(); UI.tab = 'nav'; UI.render(); return (0, eval)(`(${fn})`)(); }, [railState.toString()]);
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
