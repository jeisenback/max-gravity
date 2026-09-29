'use strict';

// Frontier and platform: founding an outpost, the heir and retirement, shared
// news and scenarios (with a stand-in for the claude.ai runtime), mods by link,
// and the tester (UAT) panel.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, watch, closeBrowser } = require('./helpers');

after(closeBrowser);

test('found an outpost, supply it, build, save and reload', async () => {
  const { page, ev, done } = await open();
  await ev(() => {
    const st = G.state; st.tutorial = null; st.story.next = 1e9; st.flags.classicCombat = true; st.credits = 120000; st.shipId = 'freighter';
    while (G.dialog) finishEvent();
    st.cargo = { industrial: 40, equipment: 20, metal: 40, food: 20, water: 20, medical: 5 };
    st.systemId = 'jupiter'; st.planet = 'Ganymede'; landAt(SYSTEMS.jupiter.planets[0], []);
    while (G.dialog) { chooseEvent(G.dialog.choices.length - 1); finishEvent(); }
  });
  assert.equal(await ev(() => !!planetNamed('Callisto')), false, 'no Callisto until claimed');
  await page.fill('#opName', 'Hope Station');
  await page.click('[data-action=opFound]');
  assert.deepEqual(await ev(() => [G.state.outpost.name, G.state.outpost.site, !!planetNamed('Callisto')]), ['Hope Station', 'Callisto', true]);
  await ev(() => { G.state.planet = 'Callisto'; landAt(planetNamed('Callisto').pl, []); while (G.dialog) { chooseEvent(0); finishEvent(); } });
  for (const cid of ['food', 'water', 'medical', 'equipment']) {
    const b = await page.$(`[data-action=opSupply][data-arg=${cid}]`);
    if (b && await b.isEnabled()) await b.click();
  }
  await page.click('[data-action=opBuild][data-arg=icemine]');
  const r = await ev(() => {
    const st = G.state, o = st.outpost, c0 = st.credits, pop0 = o.pop;
    for (let d = 0; d < 20; d++) { st.day++; Mods.emit('newDay', st.day); }
    const out = { built: o.built.includes('icemine'), earned: st.credits - c0, grew: o.pop > pop0 };
    o.pop = 70; landAt(planetNamed('Callisto').pl, []);
    while (G.dialog) { chooseEvent(0); finishEvent(); }
    save();
    return out;
  });
  assert.ok(r.built, 'ice mine built');
  assert.ok(r.earned > 0, 'the outpost pays');
  await page.reload();
  await page.waitForFunction(() => G.state);
  assert.deepEqual(await ev(() => [G.state.planet, !!planetNamed('Callisto')]), ['Callisto', true], 'the outpost survives a reload');
  await done();
});

test('death passes the company to an heir; a captain can retire', async () => {
  const { page, ev, done } = await open();
  await ev(() => { const st = G.state; st.tutorial = null; st.credits = 10000; while (G.dialog) finishEvent(); st.crew.push('kit'); G.mode = 'dead'; UI.showDead(); });
  await page.click('[data-action=heir]');
  const heir = await ev(() => ({ mode: G.mode, credits: G.state.credits, crew: G.state.crew.length, past: G.state.captains.length }));
  assert.equal(heir.mode, 'landed');
  assert.equal(heir.credits, 5000, 'half the money');
  assert.equal(heir.crew, 0, 'the crew are lost');
  assert.equal(heir.past, 1);
  await ev(() => { while (G.dialog) finishEvent(); UI.render(); });
  await page.click('[data-action=tab][data-arg=company]');
  await page.fill('#capName', 'Ines Okafor');
  await page.click('[data-action=renameCaptain]');
  await page.click('[data-action=retire]');
  await page.fill('#heirName', 'Tomas Okafor');
  await page.click('[data-action=retire][data-arg=yes]');
  const r = await ev(() => ({ name: captain().name, fates: G.state.captains.map(c => c.fate) }));
  assert.equal(r.name, 'Tomas Okafor');
  assert.deepEqual(r.fates.slice(-1), ['retired']);
  await done();
});

// A stand-in for the claude.ai artifact runtime: an in-memory db holding another
// captain's deeds, with markup in them that must never run.
const fakeRuntime = () => {
  const store = { 'deeds/other-player': { captain: 'Ama <b>Bold</b>', ship: 'Long Odds', updated: 1, deeds: [{ date: '3 Jul 2214', text: 'Founded Nine Lives on Nereid. <img src=x onerror="window.pwned=1">' }] } };
  window.__store = store;
  const snap = path => ({ id: path.split('/').pop(), exists: !!store[path], data: () => store[path] });
  const listeners = [];
  const db = {
    doc: path => ({ get: async () => snap(path), set: async body => { store[path] = JSON.parse(JSON.stringify(body)); listeners.forEach(f => f()); } }),
    collection: name => ({ orderBy: () => ({ limit: () => ({ onSnapshot(next) {
      const fire = () => next({ docs: Object.keys(store).filter(k => k.startsWith(name + '/')).map(snap) });
      listeners.push(fire); setTimeout(fire, 0); return () => {};
    } }) }) }),
  };
  window.claude = { use: async name => (name === 'db' ? db : name === 'user' ? { id: async () => 'me-123' } : null) };
};

test('shared news is escaped; sharing my deeds; mods by link', async () => {
  const { page, ev, done } = await open({ init: fakeRuntime });
  await ev(() => { G.state.tutorial = null; while (G.dialog) finishEvent(); UI.render(); });
  await page.waitForFunction(() => [...document.querySelectorAll('.hint')].some(e => /Captain Ama/.test(e.innerHTML)));
  const shown = await page.evaluate(() => [...document.querySelectorAll('.hint')].map(e => e.innerHTML).find(t => /Captain Ama/.test(t)));
  assert.doesNotMatch(shown, /<img|<b>/, 'markup shows as text');
  assert.equal(await ev(() => !!window.pwned), false);
  await page.click('[data-action=shareDeeds]');
  await ev(() => { homeLog('Named the ship the Test Pattern.'); Mods.emit('missionDone', { type: 'bounty', targetName: 'Harlan Voss' }); });
  await page.waitForFunction(() => window.__store['deeds/me-123'] && window.__store['deeds/me-123'].deeds.length >= 2);

  await page.click('[data-action=modAdd][data-arg="mods/example-vesta.js"]');
  await page.waitForFunction(() => Community.modStatus['mods/example-vesta.js']);
  assert.ok(await ev(() => !!SYSTEMS.vesta && Mods.list.some(m => m.id === 'example-vesta')), 'the Vesta mod runs');
  assert.ok(await ev(() => typeof Community.addMod('javascript:alert(1)') === 'string'), 'a javascript: link is refused');
  await page.reload();
  await page.waitForFunction(() => G.state);
  assert.ok(await ev(() => !!SYSTEMS.vesta), 'mods load again after a reload');
  await done();
});

test('scenarios: share a link, start it, and a hostile one is defanged', async () => {
  const { page, ctx, ev, errors, done } = await open();
  await ev(() => { G.state.tutorial = null; while (G.dialog) finishEvent(); UI.render(); });
  await page.click('[data-action=scenarioShare][data-arg="0"]');
  const link = await ev(() => UI.shareLink);
  const p2 = await ctx.newPage();
  watch(p2, errors);
  await p2.goto(link);
  await p2.waitForFunction(() => typeof UI !== 'undefined' && UI.pendingScenario);
  await p2.click('[data-action=scenarioGo]');
  assert.ok(await p2.evaluate(() => STORYLETS.some(s => s.id.startsWith('scenario-'))), 'scenario storylets registered');

  const evil = await p2.evaluate(() => encode({ title: 'Evil <script>window.pwned2=1</script>', text: '<img src=x onerror="window.pwned2=1">', start: { shipId: 'nonsense', credits: 1e12, systemId: 'earth', planet: 'Nowhere' },
    storylets: [{ id: 'x', where: 'port', when: { day: 1 }, title: '<b>t</b>', text: '<img src=x onerror="window.pwned2=1">', choices: [{ label: 'ok', effects: { credits: 5 } }] }] }));
  await p2.evaluate(() => { while (G.dialog) { chooseEvent(0); finishEvent(); } UI.tab = 'port'; UI.render(); });
  await p2.fill('#scenarioCode', evil);
  await p2.click('[data-action=scenarioPaste]');
  await p2.click('[data-action=scenarioGo]');
  const r = await p2.evaluate(() => ({ pwned: !!window.pwned2, credits: G.state.credits, ship: G.state.shipId }));
  assert.equal(r.pwned, false);
  assert.ok(r.credits < 1e12, 'absurd credits ignored');
  assert.ok(r.ship in (await p2.evaluate(() => SHIPS)), 'unknown ship ignored');
  await done();
});

test('the UAT panel sets up every scene and restores the real game', async () => {
  const { page, ev, done } = await open();
  await ev(() => { while (G.dialog) finishEvent(); G.state.credits = 777; G.state.day = 33; save(); });
  await page.keyboard.press('Shift+KeyU');
  assert.ok(await ev(() => !!document.getElementById('uat') && !!localStorage.getItem('maxGravity.save.uatBackup')));
  const failed = await ev(async () => {
    const bad = [];
    for (const item of UAT_ITEMS) {
      try { item.setup(); } catch (e) { bad.push(`${item.id}: ${e.message}`); }
      await new Promise(r => setTimeout(r, 50));
      G.dialog = null; G.engage = null;
    }
    return bad;
  });
  assert.deepEqual(failed, []);
  await ev(() => { Uat.open = false; Uat.toggle(); });
  await page.click('[data-uat=pass][data-id=trade]');
  await page.click('[data-uat=fail][data-id=bar]');
  assert.match(await ev(() => Uat.report()), /bar/);
  await page.click('[data-uat=tool][data-id=restore]');
  assert.deepEqual(await ev(() => [G.state.credits, G.state.day]), [777, 33]);
  await done();
});
