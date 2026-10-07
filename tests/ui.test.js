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
  assert.match(await page.innerText('#bsheet'), /Arrival/);
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

test('the menus scroll on a phone, and Start on the New game screen is always in reach', async () => {
  const problems = [];
  for (const [w, h] of [[360, 640], [390, 844], [844, 390]]) {
    const { page, ev, done } = await open({ title: true, viewport: { width: w, height: h }, mobile: true });
    await page.click('[data-action=menuView][data-arg=new]');
    const start = await page.evaluate(() => {
      const b = document.querySelector('[data-action=menuStart]'), r = b.getBoundingClientRect(), at = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return { inView: r.top >= 0 && r.bottom <= innerHeight, hit: at === b || b.contains(at) };
    });
    if (!start.inView || !start.hit) problems.push(`${w}x${h}: Start is ${start.inView ? 'covered' : 'off the screen'} before any scrolling`);
    // The pages that are taller than the screen scroll inside the panel; their last button can be reached.
    for (const view of ['new', 'load', 'settings', 'help', 'controls', 'credits']) {
      await ev(v => { Menu.view = v; Menu.render(); }, view);
      const r = await page.evaluate(() => {
        const p = document.getElementById('panel'), cs = getComputedStyle(p), tall = p.scrollHeight > p.clientHeight + 1;
        const last = [...p.querySelectorAll('button')].filter(b => b.offsetParent).pop();
        if (last) last.scrollIntoView({ block: 'end' });
        const b = last && last.getBoundingClientRect(), at = b && document.elementFromPoint(Math.min(innerWidth - 1, Math.max(0, b.left + b.width / 2)), Math.min(innerHeight - 1, Math.max(0, b.top + b.height / 2)));
        return { tall, scrolls: /auto|scroll/.test(cs.overflowY), reach: !last || (b.bottom <= innerHeight + 1 && b.top >= -1 && (at === last || last.contains(at))) };
      });
      if (r.tall && !r.scrolls) problems.push(`${w}x${h} ${view}: taller than the screen and cannot scroll`);
      if (!r.reach) problems.push(`${w}x${h} ${view}: the last button cannot be reached`);
    }
    // Tapping Start from the first screen works.
    await ev(() => { Menu.view = 'new'; Menu.render(); });
    await page.tap('[data-action=menuStart]');
    if (await ev(() => G.mode) !== 'landed') problems.push(`${w}x${h}: tapping Start did not start a game`);
    await done();
  }
  assert.deepEqual(problems, []);
});

test('the character sheet shows experience on every post row, not only the one held', async () => {
  const { ev, done } = await open();
  const r = await ev(() => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'pilot' }); while (G.dialog) finishEvent();
    gainSkill('gunner', 12);
    G.viewPerson = 'you';
    const d = document.createElement('div'); d.innerHTML = characterPanel();
    return [...d.querySelectorAll('.char-skill')].map(row => ({ name: row.firstElementChild.textContent, xp: row.querySelector('.char-xp').textContent }));
  });
  assert.equal(r.length, 4);
  assert.match(r.find(x => /Gunner/.test(x.name)).xp, /^12 \/ 45$/);
  assert.match(r.find(x => /Pilot/.test(x.name)).name, /posted/);
  for (const x of r) assert.match(x.xp, /^\d+ (\/ \d+)?$/);
  await done();
});

test('the Sun drifts as the ship travels instead of sitting fixed on the screen', async () => {
  const { ev, done } = await open();
  const r = await ev(() => { const a = sunScreen({ x: 0, y: 0 }, 1000, 800), b = sunScreen({ x: 1000, y: 0 }, 1000, 800); return { dx: b[0] - a[0], dy: b[1] - a[1] }; });
  assert.ok(r.dx < -10 && r.dx > -100, `moves against the ship's travel: ${r.dx}`);
  assert.equal(r.dy, 0);
  await done();
});

test('the cargo bay grid fits inside its plan, for a small and a large hold', async () => {
  const { ev, done } = await open();
  const r = await ev(() => {
    const by = Object.keys(SHIPS).sort((a, b) => SHIPS[a].cargo - SHIPS[b].cargo), pick = [by[0], by[by.length - 1]];
    return pick.map(id => { G.state.shipId = id; const d = document.createElement('div'); d.innerHTML = bayGrid().svg; return { cap: SHIPS[id].cargo, right: Math.max(...[...d.querySelectorAll('rect')].map(el => +el.getAttribute('x') + +el.getAttribute('width'))) }; });
  });
  assert.ok(r[0].cap <= 60 && r[1].cap > 60, 'one small and one large hold');
  for (const x of r) assert.ok(x.right <= 640 - 20, `the last column of a ${x.cap}t hold ends at ${x.right}`);
  await done();
});

test('a hired hand with no errand sees no empty Contracts card, and an owner still does', async () => {
  const { ev, done } = await open();
  const r = await ev(() => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'pilot' }); while (G.dialog) finishEvent();
    const hand = operationsPanel();
    G.state.missions.push({ id: 99, type: 'favor', title: 'Carry a letter to Mars', deadline: G.state.day + 20 });
    const withErrand = operationsPanel();
    G.state.hired = null; G.state.missions = [];
    return { hand, withErrand, owner: operationsPanel() };
  });
  assert.doesNotMatch(r.hand, /Contracts/);
  assert.match(r.hand, /Manifest/);
  assert.match(r.withErrand, /Contracts[\s\S]*Carry a letter to Mars/);
  assert.match(r.owner, /No active contracts/);
  await done();
});

test('a long landed screen scrolls inside the panel and carries a scroll cue', async () => {
  const { ev, page, done } = await open();
  await ev(() => { while (G.dialog) finishEvent(); UI.tab = 'trade'; UI.render(); });
  const r = await page.evaluate(() => {
    const b = document.querySelector('#panel .body'), cs = getComputedStyle(b);
    const start = b.scrollTop; b.scrollTop = 40;
    return { scrolls: b.scrollHeight > b.clientHeight, moved: b.scrollTop > start, overflowY: cs.overflowY, gradients: (cs.backgroundImage.match(/gradient/g) || []).length };
  });
  assert.ok(r.scrolls && r.moved, 'the body scrolls');
  assert.equal(r.overflowY, 'auto');
  assert.equal(r.gradients, 4, 'two covers and two glows');
  await done();
});

test('the title screen describes the build, and sits in the middle of the panel', async () => {
  const out = {};
  for (const scope of ['earth-hired', 'full']) {
    const { page, done } = await open({ scope, title: true });
    out[scope] = await page.evaluate(() => {
      const panel = document.querySelector('#panel').getBoundingClientRect(), menu = document.querySelector('#panel .menu').getBoundingClientRect();
      return { sub: document.querySelector('.menu-sub').textContent, top: menu.top - panel.top, bottom: panel.bottom - menu.bottom };
    });
    await done();
  }
  assert.match(out['earth-hired'].sub, /ice hauler/);
  assert.doesNotMatch(out['earth-hired'].sub, /trader's life/);
  assert.match(out.full.sub, /trader's life/);
  assert.match(out['earth-hired'].sub, /Version \d/);
  const { top, bottom } = out['earth-hired'];
  assert.ok(Math.abs(top - bottom) < 4, `centered: ${top} above, ${bottom} below`);
});

test('the landed panel uses a tall window, and keeps its old size in a short one', async () => {
  const sizes = {};
  for (const [name, viewport] of [['tall', { width: 1280, height: 900 }], ['short', { width: 1280, height: 600 }]]) {
    const { ev, page, done } = await open({ viewport });
    await ev(() => { while (G.dialog) finishEvent(); UI.tab = 'trade'; UI.render(); });
    sizes[name] = await page.evaluate(() => ({ panel: document.querySelector('#panel').getBoundingClientRect().height, body: document.querySelector('#panel .body').getBoundingClientRect().height, win: innerHeight }));
    await done();
  }
  assert.ok(sizes.tall.panel > 700 && sizes.tall.panel <= 780, `tall panel ${sizes.tall.panel}`);
  assert.ok(sizes.tall.body >= 330, `tall content window ${sizes.tall.body}`);
  assert.ok(sizes.short.panel <= sizes.short.win * 0.94 + 1, `short panel ${sizes.short.panel} fits ${sizes.short.win}`);
});

test('on a phone, the choices of a long scene stay in view and the dialog clears the HUD', async () => {
  const { ev, page, done } = await open({ scope: 'earth-hired', viewport: { width: 390, height: 844 }, mobile: true });
  await ev(() => { startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'pilot', captainKey: 'hester' }); });
  await page.waitForTimeout(250);
  const r = await page.evaluate(() => {
    const p = document.querySelector('#panel').getBoundingClientRect(), btns = [...document.querySelectorAll('#panel .choices button')].map(b => b.getBoundingClientRect());
    return { top: p.top, bottom: p.bottom, h: innerHeight, long: document.querySelector('#panel').scrollHeight > document.querySelector('#panel').clientHeight, choices: btns.map(b => [b.top, b.bottom]) };
  });
  assert.ok(r.long, 'the sign-on text is longer than the dialog');
  assert.ok(r.top >= 80, `the dialog starts below the HUD strip: ${r.top}`);
  assert.ok(r.choices.length >= 2);
  for (const [t, b] of r.choices) assert.ok(t >= r.top && b <= r.bottom && b <= r.h, `a choice is in view: ${t}-${b} in ${r.top}-${r.bottom}`);
  await done();
});

test('the transit Comms box leaves room for the ship on a short phone', async () => {
  const { ev, done } = await open();
  const r = await ev(() => ({
    wide: transitCommsLines(false, 0, 470, 640),
    wideBig: transitCommsLines(false, 0, 470, 860),
    tall: transitCommsLines(true, 84, 492, 330),
    short: transitCommsLines(true, 84, 390, 300),
    tiny: transitCommsLines(true, 84, 100, 300),
  }));
  assert.ok(r.wide >= 12 && r.wide <= 16, `a wide screen keeps most of its lines: ${r.wide}`); assert.ok(r.wideBig < r.wide && r.wideBig >= 4, 'and fewer when the ship is drawn larger');
  assert.equal(r.tall, 8, 'a tall phone keeps 8 lines');
  assert.ok(r.short >= 2 && r.short < 8, `a short phone gets fewer: ${r.short}`);
  assert.equal(r.tiny, 2, 'never fewer than 2');
  await done();
});

test('the touch Burn button is hidden for a hired hand and shown for an owner', async () => {
  const state = {};
  for (const [name, hand] of [['hand', true], ['owner', false]]) {
    const { ev, done } = await open();
    state[name] = await ev(hand => {
      while (G.dialog) finishEvent();
      if (hand) { startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'pilot' }); while (G.dialog) finishEvent(); }
      takeOff(); Touch.on = true; Touch.sync();
      return { burn: document.querySelector('#touch [data-tap=burn]').hidden, target: document.querySelector('#touch [data-tap=target]').hidden };
    }, hand);
    await done();
  }
  assert.equal(state.hand.burn, true);
  assert.equal(state.owner.burn, false);
  assert.equal(state.hand.target, false);
});

test('the port scene banner is 96px on desktop and 92px on a phone, and still draws', async () => {
  const out = {};
  for (const [name, viewport, mobile] of [['desktop', { width: 1280, height: 800 }, false], ['phone', { width: 390, height: 844 }, true]]) {
    const { ev, page, done } = await open({ viewport, mobile });
    await ev(() => { while (G.dialog) finishEvent(); UI.render(); });
    await page.waitForTimeout(200);
    out[name] = await page.evaluate(() => { const c = document.getElementById('vs'), g = c.getContext('2d'), d = g.getImageData(0, 0, c.width, c.height).data; let lit = 0; for (let i = 0; i < d.length; i += 4) if (d[i] + d[i + 1] + d[i + 2] > 60) lit++; return { h: c.getBoundingClientRect().height, lit }; });
    await done();
  }
  assert.equal(out.desktop.h, 96);
  assert.equal(out.phone.h, 92);
  assert.ok(out.desktop.lit > 50 && out.phone.lit > 50, `the scene has lit pixels: ${JSON.stringify(out)}`);
});

test('the sign-on dialog keeps its choices on screen at 1280x800, and a hand sees the captain\'s run before the hold', async () => {
  const { ev, page, done } = await open({ scope: 'earth-hired', viewport: { width: 1280, height: 800 } });
  await ev(() => { startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester' }); });
  const choices = await page.evaluate(() => [...document.querySelectorAll('#panel.event .choices button')].map(b => { const r = b.getBoundingClientRect(); return r.top >= 0 && r.bottom <= window.innerHeight; }));
  assert.ok(choices.length >= 3 && choices.every(Boolean), `every sign-on choice is inside the window: ${JSON.stringify(choices)}`);
  const order = await ev(() => { while (G.dialog) finishEvent(); UI.tab = 'port'; UI.render(); const h = document.getElementById('panel').innerHTML; return [h.indexOf("'s</span> run"), h.indexOf('Cargo bay')]; });
  assert.ok(order[0] > 0 && order[1] > 0 && order[0] < order[1], `the captain's run comes before the cargo bay: ${order}`);
  await done();
});

test('a new person never takes a first name already on the register or in the authored cast', async () => {
  const { ev, done } = await open({ scope: 'earth-hired', seed: 6 });
  const dupes = await ev(() => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester' });
    while (G.dialog) finishEvent();
    const clash = [];
    for (let i = 0; i < 60; i++) {
      const taken = new Set([...Object.values(G.state.people).map(x => x.first), ...Object.values(CAST).map(c => c.first)]);
      const p = registerPerson(makePerson('earth'));
      if (taken.has(p.first) && taken.size < 20) clash.push(p.first);
    }
    const names = folk().map(f => f.p.first);
    return { clash, names, dupe: names.length !== new Set(names).size };
  });
  assert.deepEqual(dupes.clash, [], 'while there are names left, none is repeated');
  assert.equal(dupes.dupe, false, `no two shipmates share a first name: ${dupes.names}`);
  await done();
});

test('a crew member\'s page shows what they have told you, the news behind their mood, and who they get on with', async () => {
  const { page, ev, done } = await open();
  await ev(() => {
    const st = G.state; st.tutorial = null; while (G.dialog) finishEvent();
    for (const role of ['engineer', 'pilot']) { const p = makePerson('earth'); p.role = role; p.skills = { [role]: 1 }; p.skill = 1; registerPerson(p); st.crew.push(p.id); }
    const [a, b] = st.crew.map(person);
    storyOf(a).beat = 2; storyOf(b);
    a.traits = ['rude']; b.traits = ['nervous'];
    a.mood = { kind: 'low', until: st.day + 10, text: 'their sister is sick' };
    const [fa, fb] = folk(); addBond(fa, fb, -4);
    G.viewPerson = a.id; UI.tab = 'person'; UI.render();
  });
  const text = await page.innerText('#panel');
  assert.match(text, /Left .* because of /, 'what they said about leaving');
  assert.match(text, /Misses their /, 'who they miss');
  assert.doesNotMatch(text, /Wants /, 'the hope is not told until the third talk');
  assert.match(text, /News from home: their sister is sick/);
  assert.match(text, /rivals/, 'the bond with the other crew member');
  assert.match(text, /abrasive and nervous/, 'and the reason');
  await done();
});

test('a hired hand docked or on a burn gets no radar, targeting or flight keys in the sidebar, but flies with them', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  const r = await ev(() => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester' }); while (G.dialog) finishEvent();
    const out = { errors: [] }, W = innerWidth, H = innerHeight, at = m => { G.mode = m; try { drawHud(W, H); } catch (e) { out.errors.push(`${m}:${e.message}`); } return hudCalm(); };
    out.landed = at('landed');
    G.state.tutorial = null; sail(); while (G.dialog) finishEvent(); tryBurn(); enterTransit(); G.dialog = null;
    out.transit = at('transit'); out.flight = at('flight');
    return out;
  });
  assert.deepEqual(r.errors, []);
  assert.ok(r.landed && r.transit, 'docked and on a burn'); assert.ok(!r.flight, 'a pilot-post hand takes the ship out by hand');
  const owner = await open();
  assert.ok(!await owner.ev(() => { G.mode = 'landed'; return hudCalm(); }), 'an owner keeps the sidebar');
  await owner.done();
  await done();
});

// Names are cleaned on the way in (cleanName, stripTags), but a screen must not trust that: these write markup straight into the
// state, past the cleaning, and look for an element it would add to the page.

test('markup in a captain, ship or earlier captain name does not reach the page on any port screen', async () => {
  const { ev, done } = await open();
  const leaks = await ev(() => {
    const m = k => `<i data-xss="${k}">x</i>`, seen = {}, st = G.state;
    st.tutorial = null; captain().name = m('cap'); home().name = m('ship');
    st.captains = [{ name: m('old'), from: 1, to: 2, fate: m('fate') }];
    home().log.push({ day: 1, text: m('log') }); home().touches.push(m('touch'));
    const look = (where, root) => { for (const e of root.querySelectorAll('[data-xss]')) (seen[e.dataset.xss] = seen[e.dataset.xss] || new Set()).add(where); };
    const html = (where, h) => { const d = document.createElement('div'); d.innerHTML = h; look(where, d); };
    G.mode = 'landed'; UI.openLanded(currentPlanet(), []);
    for (const tab of Object.keys(UI.views)) { if (tab === 'person' || tab === 'company') continue; UI.tab = tab; UI.render(); look(tab, document.body); }
    html('legacy', legacyHtml()); html('home', homeHtml());
    UI.showDead(); look('dead', document.body);
    UI.openLanded(currentPlanet(), []);
    for (const id of Object.keys(st.people).slice(0, 4)) { G.viewPerson = id; UI.tab = 'person'; UI.render(); look('person', document.body); }
    return Object.fromEntries(Object.entries(seen).map(([k, v]) => [k, [...v]]));
  });
  assert.deepEqual(leaks, {});
  await done();
});

test('markup in the ship name does not reach a hired hand\'s person pages', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  const leaks = await ev(() => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester' }); while (G.dialog) finishEvent();
    const st = G.state; st.tutorial = null; home().name = `<i data-xss="ship">x</i>`;
    G.mode = 'landed'; UI.openLanded(currentPlanet(), []);
    const found = [];
    for (const id of [st.hired.captain, ...st.crew.slice(0, 4)]) { G.viewPerson = id; UI.tab = 'person'; UI.render(); if (document.querySelector('[data-xss]')) found.push(id); }
    return found;
  });
  assert.deepEqual(leaks, []);
  await done();
});

// A quote in a string that reaches an attribute value breaks out of it. stripTags (ui.js) takes < and > out of an imported save, not
// quotes, and event titles are built from people's names ("With <name>"), so a name in an imported save could end an aria-label.
const QUOTE_NAME = 'x" onmouseover="window.pwned=1" data-xss="1';

test('a quote in a person\'s name does not break out of an attribute in the event dialog, the crew page or the person page', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  const found = await ev(name => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner' }); while (G.dialog) finishEvent();
    const st = G.state; st.tutorial = null; G.mode = 'landed';
    const p = person(st.crew.find(id => person(id).role === 'cook') || st.crew[0]);
    p.first = name; p.last = 'Vane';  // written straight into the state, past anything done on the way in
    const out = [], scan = where => { for (const e of document.querySelectorAll('*')) for (const a of e.attributes) if (/^on/i.test(a.name) || a.name === 'data-xss') out.push(`${where}: <${e.tagName.toLowerCase()} ${a.name}>`); };
    openEvent(ordinaryTalk(p)); scan('the event dialog'); while (G.dialog) finishEvent();
    UI.openLanded(currentPlanet(), []);
    UI.tab = 'crew'; UI.render(); scan('the crew page');
    G.viewPerson = p.id; UI.tab = 'person'; UI.render(); scan('the person page');
    return out;
  }, QUOTE_NAME);
  assert.deepEqual(found, []);
  await done();
});

test('an imported save loses quotes, and the brackets stripTags takes, from the names of the people in it', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  const r = await ev(name => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner' }); while (G.dialog) finishEvent();
    const st = G.state, id = st.crew.find(i => !person(i).cast) || st.crew[0];
    const copy = JSON.parse(JSON.stringify(st)); copy.people[id].first = name + '<b>'; copy.people[id].last = '`' + name;
    const refused = Saves.import(JSON.stringify(copy), 2);
    Saves.use(2); loadGame();
    const p = G.state.people[id];
    return { refused, first: p.first, last: p.last };
  }, QUOTE_NAME);
  assert.equal(r.refused, null);
  assert.doesNotMatch(r.first + r.last, /["`<>]/, `the names that came in: ${r.first} / ${r.last}`);
  await done();
});

test('markup and quotes in the names a game keeps reach neither the memorial nor the menu\'s save slots', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  const found = await ev(name => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner' }); while (G.dialog) finishEvent();
    const st = G.state; st.tutorial = null;
    captain().name = name; home().name = name;  // written past cleanName
    st.memorial = [{ key: 'k', name, day: 1, place: name, cause: name }];
    Saves.write(st);
    const out = [], scan = where => { for (const e of document.querySelectorAll('*')) for (const a of e.attributes) if (/^on/i.test(a.name) || a.name === 'data-xss') out.push(`${where}: <${e.tagName.toLowerCase()} ${a.name}>`); };
    const box = document.createElement('div'); box.innerHTML = memorialHtml(); document.body.appendChild(box); scan('the memorial'); box.remove();
    for (const view of ['load', 'new', 'main']) { Menu.view = view; Menu.render(); scan(`the ${view} menu`); }
    return out;
  }, '<i data-xss="1" onmouseover="window.pwned=1">x</i>" onmouseover="window.pwned=1" data-xss="1');
  assert.deepEqual(found, []);
  await done();
});

test('clicking a save code selects it, with no inline handler (data-select)', async () => {
  const { page, ev, done } = await open();
  await ev(() => { const t = document.createElement('textarea'); t.id = 'sel'; t.readOnly = true; t.value = 'abc def'; t.setAttribute('data-select', ''); document.body.appendChild(t); });
  await page.click('#sel');
  const picked = await ev(() => { const t = document.getElementById('sel'); return t.value.slice(t.selectionStart, t.selectionEnd); });
  assert.equal(picked, 'abc def');
  await done();
});
