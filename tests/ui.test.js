'use strict';

// The screens: the tutorial from the first trade to the first sale, touch
// controls on a phone, and every screen at five sizes without sideways overflow.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser, goTo, frames } = require('./helpers');

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
      await frames(page);
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
  const { page, ev, done } = await open({ scope: 'full', title: true });
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
  assert.ok(await page.evaluate(() => document.activeElement.matches('.shell .body')), 'a room change moves focus to the page (js/a11y.js)');
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

test('the rail at port reaches each room, and a key bar with status sheets in a burn', async () => {
  const { page, ev, done } = await open({});
  await ev(() => { G.state.tutorial = null; while (G.dialog) finishEvent(); UI.render(); });
  const names = await page.$$eval('.rail .rail-group:first-child button', bs => bs.map(b => b.textContent));
  assert.deepEqual(names, ['Bridge', 'Comms', 'Gunnery', 'Engine', 'Crew', 'Bonds', 'Journal']);
  assert.ok(await page.isVisible('#vs'), 'the viewscreen is above the rail');
  for (const [tab, marker] of [['nav', 'System map'], ['weapons', 'Armament'], ['shipyard', 'Outfits'], ['crew', 'Crew'], ['comms', 'Inbox'], ['port', 'Cargo']]) {
    await goTo(page, tab);
    assert.match(await page.innerText('.shell .body'), new RegExp(marker, 'i'), `${tab} shows ${marker}`);
  }
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
  await frames(page);
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

test('the cue that a scene continues shows on a long scene and a long result, and not on a short result that follows a long scene (#732)', async () => {
  const { ev, page, done } = await open({ scope: 'earth-hired', viewport: { width: 390, height: 844 }, mobile: true });
  await ev(() => { startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'pilot', captainKey: 'hester' }); while (G.dialog) finishEvent(); });
  const longText = Array.from({ length: 14 }, (_, i) => `<p>Paragraph ${i}: the lock cycles, the deck rings, and somebody says something that takes a line or two to say.</p>`).join('');
  const show = (shortResult) => page.evaluate(([text, res]) => {
    openEvent({ title: 'A Long Scene', text, choices: [{ label: 'Go on', run: () => res }] });
    const cue = () => document.getElementById('panel').classList.contains('more');
    const out = { scene: cue() };
    document.querySelector('#panel .choices button').click();
    out.result = cue();
    return out;
  }, [longText, shortResult ? 'A short result.' : longText]);
  await frames(page);
  const short = await show(true);
  await ev(() => { while (G.dialog) finishEvent(); });
  const long = await show(false);
  assert.equal(short.scene, true, 'a long scene says it continues');
  assert.equal(short.result, false, 'a short result after it does not');
  assert.equal(long.scene, true); assert.equal(long.result, true, 'a long result does');
  await done();
});

test('the burn view\'s Comms ticker keeps two lines where there is room, one on a short window, and none on a landscape phone', async () => {
  const { ev, done } = await open();
  const r = await ev(() => ({
    wide: burnLayout(1280, 800, 220, false, null).tickerLines,
    tablet: burnLayout(768, 1024, 0, true, null).tickerLines,
    short: burnLayout(1280, 600, 220, false, null).tickerLines,
    landscape: burnLayout(844, 390, 0, true, null).tickerLines,
  }));
  assert.deepEqual(r, { wide: 2, tablet: 2, short: 1, landscape: 0 });
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

test('the port scene banner is 150px on desktop and 92px on a phone, and still draws', async () => {
  const out = {};
  for (const [name, viewport, mobile] of [['desktop', { width: 1280, height: 800 }, false], ['phone', { width: 390, height: 844 }, true]]) {
    const { ev, page, done } = await open({ viewport, mobile });
    await ev(() => { while (G.dialog) finishEvent(); UI.render(); });
    await frames(page);
    out[name] = await page.evaluate(() => { const c = document.getElementById('vs'), g = c.getContext('2d'), d = g.getImageData(0, 0, c.width, c.height).data; let lit = 0; for (let i = 0; i < d.length; i += 4) if (d[i] + d[i + 1] + d[i + 2] > 60) lit++; return { h: c.getBoundingClientRect().height, lit }; });
    await done();
  }
  assert.equal(out.desktop.h, 150);
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
    G.state.tutorial = null; sail(); while (G.dialog) finishEvent(); tryBurn(); enterTransit(); G.dialog = null; G.auto = null;  // the autopilot lets go before it calls the burn (autopilot.js)
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

// #691: the landed pages say less on day one.
test('day one: the journal keeps the feeds to a line, the bonds legend is swatches, the person page lists only those with a view, the run eyebrow is the captain\'s name', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  const r = await ev(() => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester' }); while (G.dialog) finishEvent();
    const d = document.createElement('div'), view = tab => { d.innerHTML = UI.views[tab].call(UI); return d; };
    const out = {};
    const j = view('journal'); out.feeds = j.querySelectorAll('details.feeds').length; out.feedLines = j.querySelectorAll('details.feeds .hint').length; out.more = (j.querySelector('details.feeds .more') || {}).textContent;
    out.signposts = /Listen to the comms|What the port offers/.test(j.textContent);
    const w = view('web'); out.swatches = w.querySelectorAll('.legend .swatch').length; out.legendText = [...w.querySelectorAll('.legend')].map(l => l.textContent.trim()).join('|'); out.oldLegend = /Green\s+lines join friends/.test(w.textContent);
    G.viewPerson = 'you'; const p0 = view('person'); out.rows0 = [...p0.querySelectorAll('.con-card')].find(c => /How they see you/.test(c.textContent)).querySelectorAll('.con-read').length; out.none = /Nobody aboard has formed a view of you yet/.test(p0.textContent);
    const mate = person(G.state.crew[0]); mate.opinion = 4; mate.memories.push('9 Jun 2214: You covered the watch.');
    const p1 = view('person'); out.rows = [...p1.querySelectorAll('.con-card')].find(c => /How they see you/.test(c.textContent)).querySelectorAll('.con-read').length; out.noneAfter = /formed a view/.test(p1.textContent);
    G.state.tutorial = null;
    d.innerHTML = runHtml(); out.eyebrow = d.querySelector('.eyebrow').textContent;
    return out;
  });
  assert.equal(r.feeds, 1, 'the feeds are one collapsed block'); assert.ok(r.feedLines >= 1); assert.match(r.more, /^and \d+ more$/); assert.ok(!r.signposts, 'the two signposts are gone');
  assert.equal(r.swatches, 3); assert.equal(r.legendText, 'friends|rivals|having a hard time'); assert.ok(!r.oldLegend);
  assert.equal(r.rows0, 0, 'no list of neutral names on day one'); assert.ok(r.none, 'one line says nobody has a view yet');
  assert.equal(r.rows, 1, 'a crew member with a view is listed'); assert.ok(!r.noneAfter);
  assert.match(r.eyebrow, /^Captain .+'s run$/, 'the funds and the savings are the strip\'s');
  await done();
});

// What a frame draws as text, for the tests of what the HUD and the overlays say: start it, draw, and call the returned function for the lines.
const drawnText = () => { const drawn = [], fill = CanvasRenderingContext2D.prototype.fillText; CanvasRenderingContext2D.prototype.fillText = function (t, ...a) { drawn.push(String(t)); return fill.call(this, t, ...a); }; return () => { CanvasRenderingContext2D.prototype.fillText = fill; return drawn; }; };

// #692: while the crewed pilot flies her out, a hand is shown no flight controls and a key does not strand the ship.
test('a hand whose pilot flies her out sees no autopilot banner, key list or touch controls, and a key does not take the stick', async () => {
  const { ev, page, done } = await open({ scope: 'earth-hired', viewport: { width: 1280, height: 800 } });
  await ev(([src]) => { window.drawnText = (0, eval)(`(${src})`); }, [drawnText.toString()]);
  const r = await ev(() => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester' }); while (G.dialog) finishEvent(); G.state.tutorial = null;
    sail(); while (G.dialog) finishEvent();
    const out = { mode: G.mode, auto: G.auto && G.auto.kind, calm: hudCalm() };
    let stop = drawnText(); drawHud(G.W, G.H); Mods.emit('drawOverlay', G.W); out.text = stop();
    G.keys.left = true; G.keys.thrust = true; update(1 / 30); G.keys.left = G.keys.thrust = false;
    out.afterKey = { auto: G.auto && G.auto.kind, mode: G.mode };
    Touch.on = true; Touch.shown = null; Touch.sync(); out.touchHidden = document.getElementById('touch').hidden;
    return out;
  });
  assert.equal(r.mode, 'flight'); assert.equal(r.auto, 'out'); assert.ok(r.calm, 'the sidebar is the calm one');
  assert.ok(!r.text.some(t => /AUTOPILOT|FLIGHT KEY/.test(t)), `no banner: ${r.text.join('|')}`);
  assert.ok(!r.text.some(t => /^Arrows\/WASD|^Space\s+fire/.test(t)), 'no key list');
  assert.deepEqual(r.afterKey, { auto: 'out', mode: 'flight' }, 'a key does not take the stick from the pilot');
  assert.ok(r.touchHidden, 'no stick or fire button');
  await done();
});

test('a hand who is the pilot flies her out by hand, with the controls, and an owner still takes the stick from the autopilot', async () => {
  const hand = await open({ scope: 'earth-hired', viewport: { width: 1280, height: 800 } });
  const r = await hand.ev(() => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'pilot', captainKey: 'hester' }); while (G.dialog) finishEvent(); G.state.tutorial = null;
    sail(); while (G.dialog) finishEvent();
    return { mode: G.mode, auto: G.auto, calm: hudCalm() };
  });
  assert.equal(r.mode, 'flight'); assert.equal(r.auto, null, 'no autopilot for the pilot'); assert.ok(!r.calm, 'the pilot keeps the flight sidebar');
  await hand.done();
  const owner = await open({ scope: 'full' });
  const o = await owner.ev(() => {
    startGame({ slot: 1, background: 'earth', captain: 'Ines' }); while (G.dialog) finishEvent(); G.state.tutorial = null;
    G.state.dest = Object.keys(SYSTEMS).find(id => id !== G.state.systemId && inRange(G.state.systemId, id)); G.state.fuel = ship().fuel;
    ORDERS.pilot.find(x => x.id === 'depart').run();
    const out = { auto: G.auto && G.auto.kind, calm: hudCalm() };
    G.keys.left = true; update(1 / 30); G.keys.left = false; out.after = G.auto;
    return out;
  });
  assert.equal(o.auto, 'out'); assert.ok(!o.calm, 'an owner keeps the flight sidebar'); assert.equal(o.after, null, 'a key takes the stick from the autopilot');
  await owner.done();
});

// #687: the bar is a room with its patrons in it, tapped or keyed to talk to, and the hand's sheet carries the stats and the kit.
test('the bar draws its patrons in a room: a token each, tapped to talk, open to the keyboard, with the list kept under it', async () => {
  const { ev, page, done } = await open({ scope: 'earth-hired' });
  await ev(() => { startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester' }); while (G.dialog) finishEvent(); G.state.tutorial = null; UI.tab = 'bar'; UI.render(); });
  const r = await ev(() => ({ patrons: G.patrons.length, tokens: document.querySelectorAll('.bar-room .room-patron').length, talk: document.querySelectorAll('.body button[data-action=barTalk]').length, label: document.querySelector('.bar-room .room-patron').getAttribute('aria-label'), first: `${G.patrons[0].p.first} ${G.patrons[0].p.last}` }));
  assert.ok(r.patrons >= 2); assert.equal(r.tokens, r.patrons, 'a token for every patron'); assert.equal(r.talk, r.patrons, 'the list and its Talk buttons are kept: the way in for a phone and a reader');
  assert.equal(r.label, `Talk to ${r.first}`);
  await page.click('.bar-room .room-patron >> nth=0');
  assert.equal(await ev(() => !!G.dialog && /^The .*: /.test(G.dialog.event.title)), true, 'a tap opens the talk'); assert.match(await ev(() => G.dialog.event.title), new RegExp(r.first));
  await ev(() => { while (G.dialog) finishEvent(); UI.tab = 'bar'; UI.render(); });
  await page.focus('.bar-room .room-patron >> nth=1'); await page.keyboard.press('Enter');
  assert.ok(await ev(() => !!G.dialog), 'Enter on a focused token opens the talk too');
  await done();
});

test('the hand\'s sheet shows the four stats with the posts on them and the kit, empty at first and carrying what an arc left', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  const r = await ev(() => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester' }); while (G.dialog) finishEvent();
    G.viewPerson = 'you'; const d = document.createElement('div'), view = () => { d.innerHTML = UI.views.person.call(UI); return d; };
    const card = t => [...view().querySelectorAll('.con-card')].find(c => c.querySelector('.eyebrow').textContent === t);
    const out = { stats: [...card('Stats').querySelectorAll('.char-cap')].map(r => r.textContent.replace(/\s+/g, ' ').trim()), posts: [...card('Stats').querySelectorAll('.char-on')].map(e => e.textContent), kit0: card('Kit').textContent };
    out.said = addKit('valve-keys'); out.kit1 = [...card('Kit').querySelectorAll('.con-read')].map(r => r.textContent);
    out.crewHasNone = (() => { G.viewPerson = G.state.crew[0]; return !card('Stats'); })();
    return out;
  });
  assert.deepEqual(r.stats, ['Hands3 / 5', 'Eye4 / 5', 'Nerve3 / 5', 'Wit4 / 5'], 'the earth gunner: eye for the post, wit for the background');
  assert.deepEqual(r.posts, ['Engineer', 'Gunner', 'Pilot', 'Comms']); assert.match(r.kit0, /Nothing yet/);
  assert.match(r.said, /valve keys/); assert.deepEqual(r.kit1, ['a roll of valve keysjobs ashore +5%, +1 cover in the corridor']); assert.ok(r.crewHasNone, 'a crew member has skills and traits, not stats: their sheet is as it was');
  await done();
});

// #686 (the pieces main's readouts did not carry): the due date on the burn's bar, the booked load in the hold.
test('on a burn with a contract the bar says the due date and the log says the load, the shipper and whether the ship is on time', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(([src]) => { window.drawnText = (0, eval)(`(${src})`); }, [drawnText.toString()]);
  const r = await ev(() => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester' }); while (G.dialog) finishEvent();
    G.state.tutorial = null; sail(); while (G.dialog) finishEvent(); tryBurn(); enterTransit(); G.dialog = null;
    const run = hired().run, out = { contract: !!run.contract, due: dateOf(run.due) };
    let stop = drawnText(); drawTransit(G.W, G.H); out.onTime = stop();
    out.logOn = shipLogLines(G.state, G.transit, heldContract(hired()))[0];
    run.due = G.state.day - 2; out.lateDue = dateOf(run.due); out.logLate = shipLogLines(G.state, G.transit, heldContract(hired()))[0]; stop = drawnText(); drawTransit(G.W, G.H); out.late = stop();
    return out;
  });
  assert.ok(r.contract);
  assert.ok(r.onTime.includes(`due ${r.due}`), `the due date under the bar: ${r.onTime.join('|')}`);
  assert.ok(r.late.includes(`due ${r.lateDue}`), 'and when the ship is late for it');
  assert.match(r.logOn, / for .*, due .*, on time$/, 'the ship\'s log line says the load, the shipper, the due date and that the ship is on time');
  assert.ok(!/^Cargo:/.test(r.logOn), 'the contract line says what is aboard');
  assert.match(r.logLate, / for .*, due .*, late by \d+ days$/, 'and late');
  await done();
});

// The burn's time remaining is on the bar at every size: in the dates line, clock first, or beside the speed where there is no room for it.
test('the time remaining is drawn on the burn bar on a phone, a tablet, a desktop, a landscape phone and a short window with the prompt', async () => {
  for (const [W, H, mobile, prompt] of [[390, 844, true], [768, 1024, false], [1280, 800, false], [844, 390, true], [1280, 600, false, true]]) {
    const { ev, done } = await open({ scope: 'earth-hired', viewport: { width: W, height: H }, mobile });
    await ev(([src]) => { window.drawnText = (0, eval)(`(${src})`); }, [drawnText.toString()]);
    const r = await ev(prompt => {
      startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester' }); while (G.dialog) finishEvent();
      G.state.tutorial = null; sail(); while (G.dialog) finishEvent(); tryBurn(); enterTransit(); G.dialog = null; G.transit.event = null;
      if (prompt) G.state.tutorial = tutorialSteps().findIndex(s => /Work your post/.test(s.text()));
      G.transit.left = G.transit.total * 0.7; const secs = Math.ceil(G.transit.left), mss = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
      const stop = drawnText(); drawTransit(innerWidth, innerHeight); return { mss, text: stop(), tut: !!(G.burnBoxes && G.burnBoxes.tutorial) };
    }, !!prompt);
    assert.ok(r.text.some(t => t.includes(r.mss)), `${W}x${H}: ${r.mss} is drawn: ${r.text.join('|')}`);
    if (prompt) assert.ok(r.tut, `${W}x${H}: the prompt shows`);
    await done();
  }
});

// The arrival date on a narrow screen: a phone says it beside the clock where it fits, or under the strip's far end when there is no
// due date there; a tablet's dates line says it before today's date, so a cut takes today's (which the HUD strip shows).
test('the arrival date is drawn on the burn bar on a phone without a contract, and first in a tablet\'s dates line', async () => {
  for (const [W, H, mobile] of [[390, 844, true], [768, 1024, false]]) {
    const { ev, done } = await open({ scope: 'earth-hired', viewport: { width: W, height: H }, mobile });
    await ev(([src]) => { window.drawnText = (0, eval)(`(${src})`); }, [drawnText.toString()]);
    const r = await ev(() => {
      startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester' }); while (G.dialog) finishEvent();
      G.state.tutorial = null; sail(); while (G.dialog) finishEvent(); tryBurn(); enterTransit(); G.dialog = null; G.transit.event = null;
      const hd = hired(); if (hd.run) hd.run.contract = null; if (hd.plan && hd.plan.run) hd.plan.run.contract = null;  // no contract, so no due date under the strip
      G.transit.left = G.transit.total * 0.7;
      const stop = drawnText(); drawTransit(innerWidth, innerHeight); return { eta: dateOf(transitEta(G.transit)), today: dateOf(transitNow(G.transit)), text: stop() };
    });
    if (W === 390) assert.ok(r.text.includes(`arr. ${r.eta}`), `${W}x${H}: arr. ${r.eta} is drawn: ${r.text.join('|')}`);
    else {
      const line = r.text.find(t => t.includes('arriving'));
      assert.ok(line && line.includes(`arriving ${r.eta}`) && (!line.includes(r.today) || line.indexOf(r.today) > line.indexOf('arriving')), `${W}x${H}: the arrival comes before today's date: ${line}`);
    }
    await done();
  }
});

test('the hold draws a contract\'s load as booked cells before sailing, and as cargo after', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  const r = await ev(() => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester' }); while (G.dialog) finishEvent();
    const plan = currentPlan(), d = document.createElement('div'), count = (html, attr) => { d.innerHTML = html; return d.querySelectorAll(`[${attr}]`).length; };
    const before = operationsPanel(), out = { tons: plan.tons, booked: count(before, 'data-booked'), bay: count(before, 'data-bay'), says: /booked/.test(before) && before.includes(`for ${plan.shipper}`) };
    G.state.tutorial = null; sail(); while (G.dialog) finishEvent();
    const after = operationsPanel(); out.bookedAfter = count(after, 'data-booked'); out.bayAfter = count(after, 'data-bay'); out.saysAfter = /booked/.test(after);
    return out;
  });
  assert.equal(r.booked, r.tons); assert.equal(r.bay, 0); assert.ok(r.says, 'the manifest says the load is booked and for whom');
  assert.equal(r.bookedAfter, 0); assert.equal(r.bayAfter, r.tons); assert.ok(!r.saysAfter);
  await done();
});
