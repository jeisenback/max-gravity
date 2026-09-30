'use strict';

// The screens: the tutorial from the first trade to the first sale, touch
// controls on a phone, and every screen at five sizes without sideways overflow.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

test('the tutorial walks a first trade run', async () => {
  const { page, ev, done } = await open();
  const step = () => ev(() => G.state.tutorial);
  await ev(() => { while (G.dialog) finishEvent(); UI.render(); });
  const steps = [await step()];
  await page.click('[data-action=tab][data-arg=trade]');
  await page.click('[data-action=buymax][data-arg=equipment]');
  steps.push(await step());
  await page.click('[data-action=takeoff]');
  await ev(() => { G.keys.thrust = true; });
  await page.waitForFunction(() => G.state.tutorial > 2, null, { timeout: 5000 });
  await ev(() => { G.keys.thrust = false; });
  steps.push(await step());
  await ev(() => openMap());
  await page.waitForFunction(() => G.mapPos);
  const [x, y] = await ev(() => G.mapPos('mars'));
  await page.mouse.click(x, y);
  await ev(() => closeMap());
  assert.equal(await ev(() => G.state.dest), 'mars');
  await ev(() => { G.player.x = 6000; G.player.y = 0; tryBurn(); });
  await page.waitForFunction(() => G.mode === 'transit');
  await ev(() => { G.transit.times = []; G.transit.left = 0.05; });
  await page.waitForFunction(() => G.mode === 'flight' || G.dialog, null, { timeout: 5000 });
  await ev(() => { while (G.dialog) finishEvent(); if (G.transit) G.transit.left = 0.05; });
  await page.waitForFunction(() => G.mode === 'flight');
  await ev(() => { const pl = system().planets[0]; Object.assign(G.player, { x: pl.x, y: pl.y, vx: 0, vy: 0 }); G.navPlanet = 0; G.npcs = []; tryLand(); while (G.dialog) finishEvent(); UI.render(); });
  assert.equal(await ev(() => G.state.systemId), 'mars');
  await page.click('[data-action=tab][data-arg=trade]');
  await page.click('[data-action=sellall][data-arg=equipment]');
  await page.waitForFunction(() => TUTORIAL[G.state.tutorial].last, null, { timeout: 5000 });
  steps.push(await step());
  assert.deepEqual([...steps].sort((a, b) => a - b), steps, `the tutorial only moves forward (${steps})`);
  await page.click('[data-action=tutorial]');
  assert.equal(await page.$$eval('.tutorial', e => e.length), 0, 'dismissed');
  await done();
});

test('touch controls on a phone', async () => {
  const { page, ev, done } = await open({ viewport: { width: 390, height: 844 }, mobile: true });
  await ev(() => { G.state.tutorial = null; while (G.dialog) finishEvent(); UI.render(); });
  assert.ok(await ev(() => Touch.on));
  await page.tap('[data-action=takeoff]');
  await page.waitForSelector('#stick', { state: 'visible' });  // shown on the next frame
  assert.ok(await page.isVisible('#fire'));
  // Drag the stick right: the ship turns that way and thrusts.
  const box = await page.locator('#stick').boundingBox();
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
  await page.mouse.move(cx, cy); await page.mouse.down(); await page.mouse.move(cx + 60, cy, { steps: 3 });
  await page.waitForTimeout(1200);
  const a = await ev(() => ({ angle: Math.atan2(Math.sin(G.player.angle), Math.cos(G.player.angle)), vx: G.player.vx }));
  await page.mouse.up();
  assert.ok(Math.abs(a.angle) < 0.5 && a.vx > 0, `stick steers (${JSON.stringify(a)})`);
  assert.equal(await ev(() => Touch.stick), null, 'released');
  // Tap a ship to target it, then hail it with the button.
  const at = await ev(() => { G.npcs = []; const n = spawnNpc('trader', false, true); Object.assign(n, { x: G.player.x + 60, y: G.player.y - 120, vx: 0, vy: 0 }); window.N = n; return { x: G.W / 2 + 60, y: G.H / 2 - 120 }; });
  await page.touchscreen.tap(at.x, at.y);
  assert.ok(await ev(() => G.target === N), 'tapped target');
  await page.tap('[data-tap=hail]');
  assert.equal(await ev(() => G.mode), 'hail');
  await ev(() => finishEvent());
  // Pick a destination on the map by tapping.
  await page.tap('[data-tap=map]');
  await page.waitForFunction(() => G.mapPos);
  const [mx, my] = await ev(() => G.mapPos('mars'));
  await page.touchscreen.tap(mx, my);
  assert.equal(await ev(() => G.state.dest), 'mars');
  assert.ok(await ev(() => document.documentElement.scrollWidth <= 391), 'no sideways scroll');
  await done();
});

test('no screen overflows sideways at phone, landscape, and tablet sizes', async () => {
  const sizes = [[360, 640], [390, 844], [414, 896], [844, 390], [768, 1024]];
  const screens = {
    title: () => {},
    newgame: () => { Menu.view = 'new'; Menu.render(); },
    load: () => { Menu.view = 'load'; Menu.render(); },
    settings: () => { Menu.view = 'settings'; Menu.render(); },
    help: () => { Menu.view = 'help'; Menu.topic = 'combat'; Menu.render(); },
    port: () => { Menu.topic = null; startGame({ slot: 1, background: 'belt', captain: 'Ines Okafor-Achterberg', ship: 'Tuesday Forever and Always' }); G.state.tutorial = null; while (G.dialog) finishEvent(); UI.tab = 'port'; UI.render(); },
    exchange: () => { UI.tab = 'trade'; UI.render(); },
    missions: () => { UI.tab = 'missions'; UI.render(); },
    shipyard: () => { UI.tab = 'shipyard'; UI.render(); },
    navigation: () => { UI.tab = 'nav'; UI.render(); },
    weapons: () => { UI.tab = 'weapons'; UI.render(); },
    bar: () => { UI.tab = 'bar'; UI.render(); },
    crew: () => { uatCrew(3, 2); UI.tab = 'crew'; UI.render(); },
    company: () => { UI.tab = 'company'; UI.render(); },
    pause: () => { UI.tab = 'port'; UI.render(); Menu.pause(); },
    event: () => { Menu.resume(); openEvent(sitPicker()); },
    transit: () => { G.dialog = null; UI.hide(); uatBurn('Ceres Station', 'pallas'); },
    sheet: () => { G.bridgeOpen = 'interior'; syncBridge(true); },
    fight: () => { startDuel({ kind: 'pirate' }, false); finishEvent(); },
    uat: () => { G.dialog = null; G.duel = null; G.nextEvent = null; UI.hide(); uatEnable(); },
  };
  const problems = [];
  for (const [w, h] of sizes) {
    const { page, done } = await open({ title: true, viewport: { width: w, height: h }, mobile: w < 700 || h < 500 });
    for (const [id, fn] of Object.entries(screens)) {
      await page.evaluate(`(${fn.toString()})()`);
      await page.waitForTimeout(100);
      const bad = await page.evaluate(W => {
        const out = [];
        if (document.documentElement.scrollWidth > W + 1) out.push(`page ${document.documentElement.scrollWidth}px wide`);
        for (const el of document.querySelectorAll('#panel *, #uat *, #touch *, #menuBtn, #tlife *, #bkeys *, #bsheet *')) {
          if (!el.offsetParent || el.closest('.tabs') || el.closest('.scroll')) continue;
          const r = el.getBoundingClientRect();
          if (r.width && (r.right > W + 1 || r.left < -1)) out.push(`${el.tagName.toLowerCase()} "${(el.textContent || '').trim().slice(0, 30)}"`);
        }
        return [...new Set(out)].slice(0, 3);
      }, w);
      if (bad.length) problems.push(`${w}x${h} ${id}: ${bad.join('; ')}`);
    }
    await done();
  }
  assert.deepEqual(problems, []);
});

test('keyboard focus survives the panel being rebuilt', async () => {
  const { page, ev, done } = await open({ title: true });
  const focused = () => page.evaluate(() => { const a = document.activeElement; return a && a.dataset ? `${a.dataset.action}:${a.dataset.arg || ''}` : null; });
  await page.keyboard.press('Tab');
  assert.equal(await focused(), 'menuView:new');
  await page.keyboard.press('Enter');  // opens New game
  assert.ok(await ev(() => Menu.view === 'new'));
  assert.notEqual(await focused(), null, 'focus stays inside the menu after the page changes');
  await page.click('[data-action=menuStart]');
  await ev(() => { G.state.tutorial = null; while (G.dialog) finishEvent(); UI.render(); });
  await page.focus('[data-action=tab][data-arg=trade]');
  await page.keyboard.press('Enter');
  assert.equal(await focused(), 'tab:trade', 'the tab you activated keeps focus');
  assert.equal(await page.getAttribute('[data-action=tab][data-arg=trade]', 'aria-current'), 'page');
  await ev(() => openEvent({ title: 'T', text: 'x', choices: [{ label: 'A', run: () => 'a' }, { label: 'B', run: () => 'b' }] }));
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');  // choose B
  assert.equal(await focused(), 'continue:', 'Continue is ready for Enter');
  await done();
});

test('the largest text size still fits a small phone', async () => {
  const { page, ev, done } = await open({ title: true, viewport: { width: 360, height: 640 }, mobile: true });
  await ev(() => { Settings.textScale = 1.3; applySettings(); startGame({ slot: 1, background: 'belt', captain: 'Ines Okafor-Achterberg', ship: 'Tuesday Forever and Always' }); G.state.tutorial = null; while (G.dialog) finishEvent(); });
  const bad = [];
  for (const tab of ['port', 'trade', 'missions', 'shipyard', 'bar', 'crew', 'company']) {
    await ev(t => { UI.tab = t; UI.render(); }, tab);
    const r = await page.evaluate(() => {
      const out = [];
      if (document.documentElement.scrollWidth > innerWidth + 1) out.push('page scrolls sideways');
      for (const el of document.querySelectorAll('#panel button, #panel input')) {
        if (!el.offsetParent || el.closest('.tabs') || el.closest('.scroll')) continue;
        const b = el.getBoundingClientRect();
        if (b.right > innerWidth + 1 || b.left < -1) out.push(`${el.tagName} "${(el.textContent || '').trim().slice(0, 20)}"`);
      }
      return out.slice(0, 3);
    });
    if (r.length) bad.push(`${tab}: ${r.join('; ')}`);
  }
  assert.deepEqual(bad, []);
  await done();
});

test('every tab at every port reads cleanly, broke or rich, empty or full', async () => {
  const { ev, done } = await open();
  const bad = await ev(() => {
    const st = G.state, out = [];
    st.tutorial = null; st.story.next = 1e9; while (G.dialog) finishEvent();
    const states = {
      broke: () => { st.credits = 0; st.cargo = {}; st.crew = []; st.shipId = 'shuttle'; },
      full: () => { st.credits = 1e6; st.shipId = 'freighter'; st.cargo = { food: SHIPS.freighter.cargo }; st.crew = ['rosa', 'kit', 'dima']; st.fuel = 0; st.armor = 1; },
    };
    for (const [name, setup] of Object.entries(states)) {
      for (const [sid, s] of Object.entries(SYSTEMS)) for (const pl of s.planets) {
        setup(); st.systemId = sid; st.planet = pl.name; G.mode = 'landed';
        landAt(pl, []); while (G.dialog) { chooseEvent(G.dialog.choices.length - 1); finishEvent(); }
        for (const tab of ['port', 'trade', 'missions', 'shipyard', 'bar', 'crew', 'company']) {
          UI.tab = tab; UI.render();
          const t = UI.el.innerText;
          if (/undefined|NaN|\[object|null\b/.test(t)) out.push(`${name} ${pl.name} ${tab}: ${(t.match(/.{0,30}(undefined|NaN|\[object|null\b).{0,20}/) || [''])[0].replace(/\s+/g, ' ')}`);
        }
      }
    }
    return out.slice(0, 12);
  });
  assert.deepEqual(bad, []);
  await done();
});

test('the bridge: station keys at port, and a key bar with status sheets in a burn', async () => {
  const { page, ev, done } = await open();
  await ev(() => { G.state.tutorial = null; while (G.dialog) finishEvent(); UI.render(); });
  const names = await page.$$eval('.stations button .full', bs => bs.map(b => b.textContent));
  assert.deepEqual(names, ['Navigation', 'Weapons', 'Engineering', 'Interior', 'Comms', 'Operations']);
  assert.ok(await page.isVisible('#vs'), 'the viewscreen is above the stations');
  for (const [station, marker] of [['nav', 'System map'], ['weapons', 'Armament'], ['eng', 'Outfits'], ['interior', 'Crew'], ['comms', 'Inbox'], ['ops', 'Exchange']]) {
    await page.click(`[data-action=station][data-arg=${station}]`);
    assert.match(await page.innerText('#panel'), new RegExp(marker, 'i'), `${station} shows ${marker}`);
  }
  assert.equal(await page.$$eval('.tabs.sub button', b => b.length), 5, 'Operations keeps the port tabs');
  await page.click('[data-action=tab][data-arg=trade]');
  await page.click('[data-action=station][data-arg=ops]');
  assert.equal(await ev(() => UI.tab), 'trade', 'the key for the station you are in keeps your tab');
  // Underway: the key bar shows, a sheet opens on a key, and it goes when a scene opens.
  await ev(() => { uatBurn('Ceres Station', 'pallas'); G.transit.times = []; });
  await page.waitForSelector('#bkeys', { state: 'visible' });
  assert.equal(await page.isVisible('#bsheet'), false);
  await page.click('[data-bst=nav]');
  assert.match(await page.innerText('#bsheet'), /Arriving/);
  await page.click('[data-bst=ops]');
  assert.match(await page.innerText('#bsheet'), /open when you dock/);
  await ev(() => openEvent({ title: 'T', text: 'x', choices: [{ label: 'A', run: () => 'a' }] }));
  await page.waitForSelector('#bkeys', { state: 'hidden' });
  assert.equal(await page.isVisible('#bsheet'), false, 'a scene has the screen to itself');
  await done();
});

test('the burn key bar shows all six keys, and the sheet stays clear of the HUD, at phone sizes', async () => {
  const problems = [];
  for (const [w, h] of [[360, 640], [390, 844], [414, 896], [844, 390], [768, 1024]]) {
    const { page, ev, done } = await open({ viewport: { width: w, height: h }, mobile: true });
    await ev(() => { G.state.tutorial = null; while (G.dialog) finishEvent(); uatBurn('Ceres Station', 'pallas'); G.transit.times = []; });
    await page.waitForSelector('#bkeys', { state: 'visible' });
    await page.click('[data-bst=eng]');
    const r = await page.evaluate(() => {
      const hud = G.hudW, limit = innerWidth - hud;
      const keys = [...document.querySelectorAll('#bkeys button')].map(b => { const r = b.getBoundingClientRect(); return { l: r.left, r: r.right, vis: !!b.offsetParent }; });
      const s = document.getElementById('bsheet').getBoundingClientRect();
      return { limit, keys, sheet: { l: s.left, r: s.right, t: s.top, b: s.bottom }, h: innerHeight, pageW: document.documentElement.scrollWidth };
    });
    const bad = r.keys.filter(k => k.l < -1 || k.r > r.limit + 1 || !k.vis);
    if (r.keys.length !== 6 || bad.length) problems.push(`${w}x${h}: ${r.keys.length} keys, ${bad.length} outside the ${r.limit}px view`);
    if (r.sheet.l < -1 || r.sheet.r > r.limit + 1) problems.push(`${w}x${h}: the sheet spans ${Math.round(r.sheet.l)} to ${Math.round(r.sheet.r)} in a ${r.limit}px view`);
    if (r.pageW > w + 1) problems.push(`${w}x${h}: the page scrolls sideways`);
    await done();
  }
  assert.deepEqual(problems, []);
});
