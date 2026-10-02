'use strict';

// The narrow build (BUILD.scope 'earth-hired', js/build.js): an Earth hired hand, ending at the buy-in. Everything
// else is switched off here and back on with scope 'full', which the rest of the tests run in.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

const NARROW = { scope: 'earth-hired' };
const helpers = () => {
  window.start = (o = {}) => { startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', ...o }); while (G.dialog) finishEvent(); const st = G.state; st.story.next = 1e9; return st; };
};

test('the new game screen offers only a hired Earth start, with no tutorial', async () => {
  const { page, ev, done } = await open({ title: true, ...NARROW });
  await page.click('[data-action=menuView][data-arg=new]');
  const seen = await page.evaluate(() => ({
    mode: !!document.querySelector('[data-action=menuMode]'), background: !!document.querySelector('[data-action=menuBackground]'),
    tutorial: !!document.querySelector('#ngTutorial'), posts: document.querySelectorAll('[data-action=menuPost]').length,
  }));
  assert.deepEqual(seen, { mode: false, background: false, tutorial: false, posts: 4 });
  await page.fill('#ngCaptain', 'Sam Rowe');
  await page.click('[data-action=menuStart]');
  const st = await ev(() => { while (G.dialog) finishEvent(); return { hired: !!G.state.hired, background: G.state.background, tutorial: G.state.tutorial, at: G.state.planet }; });
  assert.deepEqual(st, { hired: true, background: 'earth', tutorial: null, at: 'Earth' });
  await done();
});

test('any other start is turned into a hired Earth start', async () => {
  const { ev, done } = await open(NARROW);
  const r = await ev(() => { startGame({ slot: 1, background: 'mars', mode: 'owner', tutorial: true, captain: 'Sam Rowe' }); while (G.dialog) finishEvent(); const st = G.state; return { hired: !!st.hired, background: st.background, tutorial: st.tutorial, at: st.planet }; });
  assert.deepEqual(r, { hired: true, background: 'earth', tutorial: null, at: 'Earth' });
  await done();
});

test('errands, bar side work and leads are off, and come back with the full build', async () => {
  const { ev, done } = await open(NARROW);
  await ev(helpers);
  const r = await ev(() => {
    start(); const out = {};
    const bar = () => { UI.tab = 'bar'; UI.render(); return document.body.innerHTML; };
    out.errands = errandsFor(currentPlanet()).length; out.side = /data-action="sideWork"/.test(bar()); out.leads = /Ships that are hiring/.test(bar());
    G.barState.leadLines = ['x knows of a ship that is hiring.']; out.leadLine = /knows of a ship that is hiring/.test(bar());
    BUILD.scope = 'full';
    out.errandsFull = errandsFor(currentPlanet()).length > 0; out.sideFull = /data-action="sideWork"/.test(bar());
    return out;
  });
  assert.deepEqual([r.errands, r.side, r.leadLine], [0, false, false]);
  assert.ok(r.errandsFull && r.sideFull, 'the full build still has them');
  await done();
});

test('the five storylines are not loaded in the narrow build, and are in the full one', async () => {
  const count = async scope => { const { ev, done } = await open({ scope }); const n = await ev(() => STORYLETS.filter(s => /^(strike|navy|rook|tsc|cw)-/.test(s.id)).length); await done(); return n; };
  assert.equal(await count('earth-hired'), 0);
  assert.ok(await count('full') > 20);
});

test('the owner systems stay shut after the buy-in: company, stakes, outposts, community', async () => {
  const { ev, done } = await open(NARROW);
  await ev(helpers);
  const r = await ev(() => {
    const st = start(); st.credits = 100000;
    const html = tab => { UI.tab = tab; UI.render(); return document.body.innerHTML; };
    hired().confirm = 'courier'; Mods.act('buyInGo', 'courier'); while (G.dialog) finishEvent();
    const out = { owner: !hired() };
    out.companyTab = tabReady(currentPlanet(), 'company'); out.cbuy = /data-action="cbuy"/.test(html('shipyard'));
    const port = html('port'); out.stakes = /Invest/.test(port); out.community = /Load a mod by link|Scenarios/.test(port);
    BUILD.scope = 'full';
    out.companyFull = tabReady(currentPlanet(), 'company'); out.cbuyFull = /data-action="cbuy"/.test(html('shipyard'));
    return out;
  });
  assert.deepEqual([r.owner, r.companyTab, r.cbuy, r.stakes, r.community], [true, false, false, false, false]);
  assert.ok(r.companyFull && r.cbuyFull, 'the full build has them');
  await done();
});

test('buying a ship closes the chapter with one scene, then play goes on', async () => {
  const { ev, done } = await open(NARROW);
  await ev(helpers);
  const r = await ev(() => {
    const st = start(); st.credits = 100000;
    person('c:ines').opinion = 3; person('c:tomas').opinion = 2;
    hired().confirm = 'courier'; Mods.act('buyInGo', 'courier');
    const out = { title: G.dialog && G.dialog.event.title, text: G.dialog && G.dialog.event.text, flag: !!st.flags.chapterOne, owner: !hired() };
    chooseEvent(0); finishEvent(); out.after = G.dialog ? G.dialog.event.title : null; out.crew = st.crew.length;
    return out;
  });
  assert.equal(r.title, 'Your Own Ship'); assert.ok(r.flag && r.owner);
  assert.match(r.text, /Courier/); assert.match(r.text, /Ines/); assert.match(r.text, /Tomas/);
  assert.equal(r.after, null, 'the scene is not repeated'); assert.equal(r.crew, 2);
  await done();
});

test('the closing scene waits for a main character\'s own buy-in scene', async () => {
  const { ev, done } = await open(NARROW);
  await ev(helpers);
  const r = await ev(() => {
    const st = start(); st.credits = 100000;
    person('c:ines').opinion = 3; person('c:tomas').opinion = 2; castRec('ines').arc = 3;
    hired().confirm = 'courier'; Mods.act('buyInGo', 'courier');
    const first = G.dialog.event.title; chooseEvent(0); finishEvent();
    return { first, second: G.dialog && G.dialog.event.title };
  });
  assert.equal(r.first, 'Permission to Land'); assert.equal(r.second, 'Your Own Ship');
  await done();
});

test('the opening scene does not promise errands the narrow build does not have', async () => {
  const { ev, done } = await open(NARROW);
  await ev(helpers);
  const r = await ev(() => {
    start();
    const narrow = signOnEvent().text;
    BUILD.scope = 'full';
    return { narrow, full: signOnEvent().text };
  });
  assert.doesNotMatch(r.narrow, /Errands|Missions board|keeps a fifth/);
  assert.match(r.narrow, /press Sail\. You are paid a wage and a share/, 'the sentences either side still join up');
  assert.match(r.full, /Errands for wherever she is going turn up on the Missions board/);
  await done();
});
