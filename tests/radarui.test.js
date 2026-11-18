'use strict';

// The ship fight on the radar as a scene (js/radarui.js, plan Part 2, #1345): the setting that starts it, real time and its pauses, the timeline, the
// hand's death mid-cycle, a reload mid-fight, Space on a focused button, and an end through today's shipFightEnd.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

// A hired game on a burn with an ordinary foe of a kind (as fightui.test.js sets one up), and the fight started as a contact starts it.
const helpers = () => {
  window.radarGame = (shipId = 'raider') => {
    __seed(1);
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester' }); while (G.dialog) finishEvent();
    const st = G.state; st.story.next = 1e9; st.day += 30; hired().raidTold = true;
    uatBurn('Ceres Station', 'pallas'); G.transit.times = []; G.transit.event = null; G.dialog = null;
    __seed(2);
    if (!window.realMakeEnemy) window.realMakeEnemy = makeEnemy;
    const spare = window.realMakeEnemy({ kind: 'pirate' });
    window.makeEnemy = () => Object.assign(spare, { shipId, armor: SHIPS[shipId].armor, maxArmor: SHIPS[shipId].armor });
    window.rateFoe = s => { s.grade = 0; s.pack = false; return s; };
    return st;
  };
  window.radarBattle = () => { startDuel({ kind: 'pirate' }, false); const e = G.nextEvent; G.nextEvent = null; openEvent(e); return G.radar; };
  window.placeHer = km => { const st = G.radar.s.state; st.ships[1].p = { x: 0, y: km }; st.ships[1].v = { x: 0, y: -RADAR.CLOSING / RADAR.TURN_S }; };
};
const stopped = page => page.waitForFunction(() => G.radar && !G.radar.running && G.radar.why.length, null, { timeout: 30000, polling: 50 });

test('the settings checkbox starts the radar fight at a raider; unticked, today\'s fight starts', async () => {
  const { page, ev, errors, done } = await open({ title: true });
  await page.click('[data-action="menuView"][data-arg="settings"]');
  await page.click('[data-action="radarFight"]');
  assert.equal(await ev(() => Settings.radarFight), true);
  assert.equal(await page.isChecked('[data-action="radarFight"]'), true);
  assert.equal(await ev(() => JSON.parse(localStorage.getItem('maxGravity.settings')).radarFight), true, 'stored with the other settings');
  await ev(helpers);
  const on = await ev(() => { radarGame(); radarBattle(); return { radar: !!document.querySelector('#panel canvas.radar'), board: !!document.querySelector('#panel svg.board'), title: G.dialog.event.title, kind: G.dialog.event.fight.state.kind }; });
  assert.deepEqual(on, { radar: true, board: false, title: 'Battle Stations', kind: 'radar' });
  await ev(() => { G.radar = null; G.dialog = null; Settings.radarFight = false; applySettings(); });
  const off = await ev(() => { radarGame(); radarBattle(); return { radar: !!document.querySelector('#panel canvas.radar'), board: !!document.querySelector('#panel svg.board'), kind: G.dialog.event.fight.state.kind }; });
  assert.deepEqual(off, { radar: false, board: true, kind: 'ship' });
  assert.deepEqual(errors, []);
  await done();
});

test('the opening is short where today\'s fight starts inside mid range (a patrol), long for a raider met far out', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    Settings.radarFight = true;
    radarGame('raider'); const raider = radarBattle().s.state.opening; G.radar = null; G.dialog = null;
    radarGame('cutter'); startShipFight({ kind: 'patrol', gov: 'Arcology Pact', shipId: 'cutter' }, false); const patrol = G.nextEvent.fight.state.opening;
    return { raider, patrol };
  });
  assert.deepEqual(r, { raider: 'long', patrol: 'short' });
  await done();
});

test('pressing play at 16x runs the fight until she arms and then launches, and it pauses each time saying so', async () => {
  const { page, ev, errors, done } = await open();
  await ev(helpers);
  await ev(() => { Settings.radarFight = true; radarGame('corsair'); radarBattle(); placeHer(RADAR.TORP_LAUNCH - 5); });
  assert.equal(await ev(() => G.radar.speed), 16, 'it opens at the fastest speed');
  assert.equal(await ev(() => G.radar.running), false, 'it opens paused');
  await page.click('[data-action="radarPlay"]');
  await stopped(page);
  assert.deepEqual(await ev(() => G.radar.why), ['armed']);
  assert.match(await page.textContent('.radar-sit'), /Paused: She's loading torpedoes\./);
  await page.click('[data-action="radarPlay"]');
  await stopped(page);
  const r = await ev(() => ({ why: G.radar.why, torps: G.radar.s.state.torps.length, cycle: G.radar.s.state.cycle }));
  assert.ok(r.why.includes('launched'), r.why.join());
  assert.ok(r.torps > 0, 'her torpedoes are on the radar');
  assert.match(await page.textContent('.radar-sit'), /She's launched\./);
  assert.match(await page.textContent('.radar-last'), /launches\./);
  assert.deepEqual(errors, []);
  await done();
});

test('pressing a speed changes how far a frame advances the fight; the zoom buttons set the reach and auto gives it back', async () => {
  const { page, ev, done } = await open();
  await ev(helpers);
  await ev(() => { Settings.radarFight = true; radarGame(); radarBattle(); });
  for (const n of [1, 2, 16]) {
    await page.click(`[data-action="radarSpeed"][data-arg="${n}"]`);
    const moved = await ev(() => { const r = G.radar; r.running = true; const t = r.s.state.t; radarTick(0.05); r.running = false; return r.s.state.t - t; });
    assert.ok(Math.abs(moved - 0.05 * n) < 1e-6, `at ${n}x a 0.05 s frame is ${0.05 * n} s of fight, not ${moved}`);
  }
  assert.equal(await ev(() => G.radar.drawn.reach), 400, 'her at the long opening is in the widest zoom');
  await page.click('[data-action="radarZoom"][data-arg="50"]');
  assert.equal(await ev(() => { radarTick(0); return G.radar.drawn.reach; }), 50);
  await page.click('[data-action="radarZoom"][data-arg="150"]');
  assert.equal(await ev(() => { radarTick(0); return G.radar.drawn.reach; }), 150);
  await page.click('[data-action="radarZoom"][data-arg="auto"]');
  assert.equal(await ev(() => { placeHer(40); radarTick(0); return G.radar.drawn.reach; }), 50, 'auto: the least zoom that keeps her in view');
  await done();
});

test('the timeline lists the last six events, the rest folded; hovering one rings its spot on the radar, and hovering the radar labels what is there', async () => {
  const { page, ev, done } = await open();
  await ev(helpers);
  await ev(() => {
    Settings.radarFight = true; radarGame(); radarBattle();
    G.radar.feed = Array.from({ length: 8 }, (_, i) => ({ at: i * 5, cycle: 0, kind: 'miss', text: `Miss number ${i}.`, p: { x: i, y: 100 } }));
    radarTick(0);
  });
  const items = await page.$$eval('.radar-last li', l => l.map(x => x.textContent));
  assert.equal(items.length, 6);
  assert.match(items[0], /Miss number 2\./);
  assert.match(items[5], /0:35 Miss number 7\./);
  assert.match(await page.textContent('.radar-log summary'), /The whole log/);
  await page.hover('.radar-last li:nth-child(6)');
  assert.deepEqual(await ev(() => G.radar.ring.p), { x: 7, y: 100 });
  const box = await page.locator('canvas.radar').boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  assert.match(await ev(() => { radarTick(0); return G.radar.drawn.hover; }), /^Us, heading/);
  await done();
});

test('the hand killed mid-cycle stops the fight at that step and queues the ending', async () => {
  const { page, ev, errors, done } = await open();
  await ev(helpers);
  await ev(() => {
    Settings.radarFight = true; radarGame(); radarBattle(); placeHer(20);
    const real = fightTook; window.fightTook = (s, events) => { real(s, events); if (events.some(e => e.who === 'foe' && e.dmg > 0)) handDies(s, 'hurt'); };
  });
  await page.click('[data-action="radarPlay"]');
  await page.waitForFunction(() => !G.radar, null, { timeout: 30000, polling: 50 });
  const r = await ev(() => ({ died: !!hired().died, title: G.dialog && G.dialog.event.title, want: handDeathScene('hurt').title, radar: !!document.querySelector('canvas.radar') }));
  assert.equal(r.died, true);
  assert.equal(r.title, r.want, 'the ending is the scene up now');
  assert.equal(r.radar, false);
  assert.equal(await ev(() => { radarTick(0.05); return G.radar; }), null, 'nothing is left running behind it');
  assert.deepEqual(errors, []);
  await done();
});

test('a reload mid-fight does what today\'s ship fight does: the fight is not saved, and the game continues from the last port', async () => {
  for (const radar of [false, true]) {
    const { page, ev, errors, done } = await open({ title: true });
    await ev(helpers);
    await ev(on => {
      Settings.radarFight = on; applySettings();
      radarGame(); uatLand('Ceres Station'); Saves.write(G.state);
      uatBurn('Ceres Station', 'pallas'); G.transit.times = []; G.transit.event = null; G.dialog = null; radarBattle();
    }, radar);
    assert.equal(await ev(() => G.dialog.event.fight.state.kind), radar ? 'radar' : 'ship');
    if (radar) { await page.click('[data-action="radarPlay"]'); await page.waitForFunction(() => G.radar.s.state.t > 0, null, { timeout: 30000 }); }
    await page.reload();
    await page.click('[data-action="menuContinue"]');
    const r = await ev(() => ({ mode: G.mode, planet: G.state.planet, fight: !!(G.dialog && G.dialog.event.fight), radar: G.radar }));
    assert.deepEqual(r, { mode: 'landed', planet: 'Ceres Station', fight: false, radar: null }, radar ? 'the radar fight' : 'today\'s fight');
    assert.deepEqual(errors, []);
    await done();
  }
});

test('Space on a focused button pauses and resumes the fight and does not also press the button', async () => {
  const { page, ev, done } = await open();
  await ev(helpers);
  await ev(() => { Settings.radarFight = true; radarGame(); radarBattle(); });
  await page.click('[data-action="radarPlay"]');
  await page.focus('[data-action="radarSpeed"][data-arg="1"]');
  await page.keyboard.press('Space');
  assert.deepEqual(await ev(() => ({ running: G.radar.running, speed: G.radar.speed })), { running: false, speed: 16 });
  await page.focus('[data-action="radarSpeed"][data-arg="2"]');
  await page.keyboard.press('Space');
  assert.deepEqual(await ev(() => ({ running: G.radar.running, speed: G.radar.speed })), { running: true, speed: 16 });
  await done();
});

test('the fight ends in today\'s ends: a crippled raider goes on to the dead-in-space scene', async () => {
  const { page, ev, errors, done } = await open();
  await ev(helpers);
  await ev(() => { Settings.radarFight = true; radarGame(); radarBattle(); const f = G.radar.s.state.foes[0]; f.parts.weapons.hp = 0; f.parts.drive.hp = 0; });
  await page.click('[data-action="radarPlay"]');
  await page.waitForFunction(() => !G.radar, null, { timeout: 30000, polling: 50 });
  const r = await ev(() => ({ text: G.dialog.event.text, line: sceneSay('scene:fight', 'end.crippled.grapple'), fight: !!document.querySelector('canvas.radar') }));
  assert.ok(r.text.startsWith(r.line), `the dead-in-space scene, led by the crippled line: ${r.text.slice(0, 200)}`);
  assert.equal(r.fight, false);
  assert.deepEqual(errors, []);
  await done();
});
