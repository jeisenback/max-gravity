'use strict';

// The Bonds tab (js/web.js), under Interior: everyone aboard on a ring, with a line for each bond between two of them.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser, goTo } = require('./helpers');

after(closeBrowser);

const helpers = () => { window.hand = () => { startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'pilot', captainKey: 'hester' }); while (G.dialog) finishEvent(); }; };

const parse = html => { const d = document.createElement('div'); d.innerHTML = html; return d; };

test('the rail has Crew, Bonds and Journal in that order, and Bonds opens the web', async () => {
  const { ev, page, done } = await open({ shell: true, scope: 'earth-hired' });
  await ev(helpers);
  await ev(() => { hand(); UI.tab = 'crew'; UI.render(); });
  assert.deepEqual(await page.$$eval('.rail button', b => b.map(x => x.textContent).filter(n => ['Crew', 'Bonds', 'Journal'].includes(n))), ['Crew', 'Bonds', 'Journal']);
  await goTo(page, 'web');
  assert.equal(await ev(() => UI.tab), 'web');
  assert.equal(await page.innerText('.rail button.active'), 'Bonds', 'the rail lights Bonds');
  assert.ok(await page.$('#panel svg.con-plant .web-node'), 'the web is drawn');
  await done();
});

test('every person aboard is a node, and a line joins each pair with a bond, green for friends and orange for rivals', async () => {
  const { ev, page, done } = await open({ shell: true, scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    hand();
    const l = folk(), none = webSvg(l).match(/data-tie/g);
    addBond(l[0].p, l[1].p, 7); addBond(l[0].p, l[2].p, 3); addBond(l[3].p, l[4].p, -5); addBond(l[5].p, l[6].p, 0.5);  // the last is too faint to count
    const d = document.createElement('div'); d.innerHTML = webSvg(l);
    return {
      n: l.length, none: none ? none.length : 0, nodes: d.querySelectorAll('.web-node').length,
      ties: [...d.querySelectorAll('line[data-tie]')].map(x => [x.getAttribute('stroke'), +x.getAttribute('stroke-width')]),
      ids: [...d.querySelectorAll('.web-node')].map(x => x.dataset.arg).sort(), expect: l.map(f => f.id).sort(),
    };
  });
  assert.equal(r.none, 0, 'no lines before anyone has a bond');
  assert.equal(r.nodes, r.n);
  assert.deepEqual(r.ids, r.expect, 'a clickable node for each person');
  assert.equal(r.ties.length, 3, 'three bonds worth drawing');
  assert.equal(r.ties.filter(([c]) => c === '#5fd35f').length, 2, 'green for friends');
  assert.equal(r.ties.filter(([c]) => c === '#ff8a3c').length, 1, 'orange for rivals');
  const widths = r.ties.map(([, w]) => w);
  assert.ok(Math.max(...widths) > Math.min(...widths), 'the stronger the thicker');
  await done();
});

test('the strongest ties are listed strongest first, and a click on a node opens that person', async () => {
  const { ev, page, done } = await open({ shell: true, scope: 'earth-hired' });
  await ev(helpers);
  const ids = await ev(() => {
    hand();
    const l = folk(); addBond(l[0].p, l[1].p, 2); addBond(l[2].p, l[3].p, -8); addBond(l[4].p, l[5].p, 5);
    UI.tab = 'web'; UI.render();
    return l.map(f => f.id);
  });
  const rows = await page.$$eval('#panel .con-card:first-child .con-read b', b => b.map(x => x.textContent));
  assert.deepEqual(rows, ["can't stand each other", 'friends', 'friendly'], 'by strength, whichever way it points');
  await page.click(`#panel .web-node[data-arg="${ids[0]}"]`);
  assert.equal(await ev(() => UI.tab), 'person');
  assert.equal(await ev(() => G.viewPerson), ids[0]);
  await done();
});

test('with no bonds the web says so, and an owner with a small crew still draws', async () => {
  const { ev, done } = await open({ shell: true });
  const r = await ev(() => {
    while (G.dialog) finishEvent();
    const empty = UI.views.web.call(UI);
    G.state.crew = [];
    const alone = UI.views.web.call(UI);
    return { empty, alone };
  });
  assert.match(r.empty, /Nobody aboard has strong feelings/);
  assert.match(r.alone, /0 aboard/);
  await done();
});
