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
