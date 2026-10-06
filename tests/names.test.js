'use strict';

// A name the player typed (captain, ship, outpost, heir) is cleaned on the way in (cleanName, stripTags in menu.js),
// but that holds only while every new path goes through it. These tests set the names to markup directly in state,
// as a path that missed the cleaning would, and check that every screen that shows them prints it as text.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

const EVIL = '<img src=x onerror="window.__pwn=1">';
const SETUP = evil => {
  const st = G.state;
  st.captain = { name: evil, since: 1 };
  st.captains = [{ name: evil, from: 1, to: 2, fate: evil }];
  home().name = evil;
  homeLog(`${shipTitle()} is still flying.`);
  st.outpost = { site: 'Callisto', name: evil, founded: 1, pop: 40, built: ['habitat'], earned: 0, moments: [], stock: { food: 12, water: 12, medical: 3, equipment: 2 } };
  return st;
};
const injected = html => /<img\b[^>]*onerror/i.test(html);

test('names with markup show as text on every landed tab', async () => {
  const { ev, done } = await open({});
  const bad = await ev(([evil, setup]) => {
    (0, eval)(`(${setup})`)(evil);
    const out = [], seen = [];
    for (const tab of ['port', 'trade', 'missions', 'bar', 'company', 'crew', 'journal', 'shipyard']) {
      UI.tab = tab;
      try { UI.render(); } catch (e) { continue; }  // a tab this port does not offer
      seen.push(tab);
      if (/<img\b[^>]*onerror/i.test(UI.el.innerHTML)) out.push(tab);
    }
    return { out, seen };
  }, [EVIL, SETUP.toString()]);
  assert.ok(bad.seen.length >= 5, `most tabs rendered: ${bad.seen}`);
  assert.deepEqual(bad.out, [], 'tabs that printed the name as markup');
  await done();
});

test('names with markup show as text in the helpers that build parts of a screen', async () => {
  const { ev, done } = await open({});
  const bad = await ev(([evil, setup]) => {
    (0, eval)(`(${setup})`)(evil);
    const out = [], seen = [];
    for (const [name, fn] of Object.entries({ homeHtml, homeLine, outpostHtml, memorialHtml, captainRunsHtml, claimHtml })) {
      let html = '';
      try { html = String(fn()); } catch (e) { continue; }
      seen.push(name);
      if (/<img\b[^>]*onerror/i.test(html)) out.push(name);
    }
    return { out, seen };
  }, [EVIL, SETUP.toString()]);
  assert.ok(bad.seen.includes('homeLine') && bad.seen.includes('outpostHtml'), `the helpers ran: ${bad.seen}`);
  assert.deepEqual(bad.out, [], 'helpers that printed the name as markup');
  await done();
});

test('names with markup show as text on the menu and in the save slots', async () => {
  const { ev, done } = await open({ title: true });
  const bad = await ev(([evil, setup]) => {
    G.state = G.state || newState();
    (0, eval)(`(${setup})`)(evil);
    Saves.write(G.state);
    const out = [], seen = [];
    for (const view of ['main', 'load', 'new', 'pause']) {
      Menu.view = view;
      try { Menu.render(); } catch (e) { continue; }
      seen.push(view);
      if (/<img\b[^>]*onerror/i.test(UI.el.innerHTML)) out.push(view);
    }
    return { out, seen };
  }, [EVIL, SETUP.toString()]);
  assert.ok(bad.seen.includes('load'), `the save slot list rendered: ${bad.seen}`);
  assert.deepEqual(bad.out, [], 'menu views that printed the name as markup');
  await done();
});

test('a scene that names the ship shows the name as text', async () => {
  const { page, ev, done } = await open({});
  await ev(([evil, setup]) => {
    (0, eval)(`(${setup})`)(evil);
    openEvent({ title: `Aboard ${shipTitle()}`, text: `The crew of ${shipTitle()} wait.`, choices: [{ label: 'Go', run: () => `Back to ${shipTitle()}.` }] });
  }, [EVIL, SETUP.toString()]);
  assert.equal(await page.evaluate(() => /<img\b[^>]*onerror/i.test(UI.el.innerHTML)), false, 'the dialog printed the name as markup');
  assert.equal(await page.evaluate(() => window.__pwn), undefined, 'the image error handler did not run');
  await done();
});

test('a quote in a person\'s name does not break out of an attribute on any landed tab', async () => {
  const { ev, done } = await open({});
  const bad = await ev(() => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner' });
    while (G.dialog) finishEvent();
    const st = G.state, evil = 'x" onmouseover="window.__pwn=1" y="';
    for (const id of Object.keys(st.people || {})) { const p = st.people[id]; if (p && typeof p === 'object') { p.first = evil; p.last = evil; } }
    const out = [], seen = [], crewId = st.crew[0];
    for (const tab of ['port', 'bar', 'crew', 'web', 'journal', 'person', 'missions']) {
      UI.tab = tab; G.viewPerson = crewId;
      try { UI.render(); } catch (e) { continue; }
      seen.push(tab);
      if (UI.el.querySelector('[onmouseover]')) out.push(tab);
    }
    return { out, seen, named: !!(st.people && Object.keys(st.people).length) };
  });
  assert.ok(bad.named && bad.seen.includes('crew') && bad.seen.includes('person'), `people were renamed and the crew screens rendered: ${bad.seen}`);
  assert.deepEqual(bad.out, [], 'tabs where a name added an attribute');
  await done();
});
