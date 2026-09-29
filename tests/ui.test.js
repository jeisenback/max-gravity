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
  await ev(() => { G.state.tutorial = null; G.state.flags.classicCombat = true; while (G.dialog) finishEvent(); UI.render(); });
  assert.ok(await ev(() => Touch.on));
  await page.tap('[data-action=takeoff]');
  assert.ok(await page.isVisible('#stick') && await page.isVisible('#fire'));
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
    bar: () => { UI.tab = 'bar'; UI.render(); },
    crew: () => { uatCrew(3, 2); UI.tab = 'crew'; UI.render(); },
    company: () => { UI.tab = 'company'; UI.render(); },
    pause: () => { UI.tab = 'port'; UI.render(); Menu.pause(); },
    event: () => { Menu.resume(); openEvent(sitPicker()); },
    transit: () => { G.dialog = null; UI.hide(); uatBurn('Ceres Station', 'pallas'); },
    fight: () => { startEngage({ spec: { kind: 'pirate' }, flee: false }); },
    uat: () => { G.engage = null; G.mode = 'transit'; uatEnable(); },
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
        for (const el of document.querySelectorAll('#panel *, #uat *, #touch *, #menuBtn, #tlife *')) {
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
