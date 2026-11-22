'use strict';

// The ship fight on the radar as a scene (js/radarui.js, plan Part 2, #1345): the setting that starts it, real time and its pauses, the timeline, the
// hand's death mid-cycle, a reload mid-fight, Space on a focused button, and an end through shipFightEnd.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

// A hired game on a burn with an ordinary foe of a kind (as fightui.test.js sets one up), and the fight started as a contact starts it.
const helpers = () => {
  window.radarGame = (shipId = 'raider', post = 'gunner') => {
    __seed(1);
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post, captainKey: 'hester' }); while (G.dialog) finishEvent();
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
  window.runQuiet = (g, seconds) => { const real = radarPauses; window.radarPauses = () => []; g.running = true; try { radarRun(g, seconds); } finally { window.radarPauses = real; g.running = false; } };  // fight time with no pause
  window.placeHer = km => { const st = G.radar.s.state; st.ships[1].p = { x: 0, y: km }; st.ships[1].v = { x: 0, y: -RADAR.CLOSING / RADAR.TURN_S }; };
};
const stopped = page => page.waitForFunction(() => G.radar && !G.radar.running && G.radar.why.length, null, { timeout: 30000, polling: 50 });

test('the ship fight is drawn on the radar, with no sensor board', async () => {
  const { ev, errors, done } = await open();
  await ev(helpers);
  const r = await ev(() => { radarGame(); radarBattle(); return { radar: !!document.querySelector('#panel canvas.radar'), board: !!document.querySelector('#panel svg.board'), title: G.dialog.event.title, kind: G.dialog.event.fight.state.kind }; });
  assert.deepEqual(r, { radar: true, board: false, title: 'Battle Stations', kind: 'radar' });
  assert.deepEqual(errors, []);
  await done();
});

test('the opening is short where she is met inside mid range (a patrol), long for a raider met far out', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    radarGame('raider'); const raider = radarBattle().s.state.opening; G.radar = null; G.dialog = null;
    radarGame('cutter'); startShipFight({ kind: 'patrol', gov: 'Arcology Pact', shipId: 'cutter' }, false); const patrol = G.nextEvent.fight.state.opening;
    return { raider, patrol };
  });
  assert.deepEqual(r, { raider: 'long', patrol: 'short' });
  await done();
});

test('pressing play at 16x runs the fight past her arming until she launches, and it pauses then saying so', async () => {
  const { page, ev, errors, done } = await open();
  await ev(helpers);
  await ev(() => { radarGame('corsair'); radarBattle(); placeHer(RADAR.TORP_LAUNCH - 5); });
  assert.equal(await ev(() => G.radar.speed), 16, 'it opens at the fastest speed');
  assert.equal(await ev(() => G.radar.running), false, 'it opens paused');
  await page.click('[data-action="radarPlay"]');
  await stopped(page);
  const r = await ev(() => ({ why: G.radar.why, torps: G.radar.s.state.torps.length, armed: G.radar.feed.some(e => e.kind === 'armed') }));
  assert.deepEqual(r.why, ['launched'], 'her arming does not stop it (the owner, 2026-11-20); her launch does');
  assert.ok(r.armed, 'her arming is on the timeline');
  assert.ok(r.torps > 0, 'her torpedoes are on the radar');
  assert.match(await page.textContent('.radar-sit'), /She's launched\./);
  assert.match(await page.textContent('.radar-last'), /launches\./);
  assert.deepEqual(errors, []);
  await done();
});

test('a pause on a cycle\'s last step still plans the next cycle, so it runs on its own orders', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    radarGame(); radarBattle();
    const g = G.radar, pauses = radarPauses, plan = radarPlan, planned = [];
    window.radarPauses = (prev, next, events) => (next.step === RADAR.SUB ? ['hit'] : pauses(prev, next, events));  // a pause on the cycle's last step
    window.radarPlan = x => { planned.push(x.s.state.step); plan(x); };
    g.running = true; radarRun(g, RADAR.TURN_S);
    window.radarPauses = pauses; window.radarPlan = plan;
    return { sub: RADAR.SUB, step: g.s.state.step, running: g.running, why: g.why, planned };
  });
  assert.deepEqual(r, { sub: r.sub, step: r.sub, running: false, why: ['hit'], planned: [r.sub] });
  await done();
});

test('pressing a speed changes how far a frame advances the fight; the zoom buttons set the reach and auto gives it back', async () => {
  const { page, ev, done } = await open();
  await ev(helpers);
  await ev(() => { radarGame(); radarBattle(); });
  for (const n of [1, 2, 16]) {
    await page.click(`[data-action="radarSpeed"][data-arg="${n}"]`);
    const moved = await ev(() => { const r = G.radar; r.running = true; const t = r.s.state.t; radarTick(0.05); r.running = false; return r.s.state.t - t; });
    assert.ok(Math.abs(moved - 0.05 * n) < 1e-5,  // the clock is kept to a millionth of a second (radarAdvance)
      `at ${n}x a 0.05 s frame is ${0.05 * n} s of fight, not ${moved}`);
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
    radarGame('raider', 'engineer'); radarBattle();  // a post the crew work: the radar's own labels, with no part marks round her
    G.radar.feed = Array.from({ length: 8 }, (_, i) => ({ at: i * 5, cycle: 0, kind: 'miss', text: `Miss number ${i}.`, p: { x: i, y: 100 } }));
    radarTick(0);
  });
  const items = await page.$$eval('.radar-last li', l => l.map(x => x.textContent));
  assert.equal(items.length, 6);
  assert.match(items[0], /Miss number 2\./);
  assert.match(items[5], /0:35 Miss number 7\./);
  assert.match(await page.textContent('.radar-log summary'), /The whole log/);
  await page.locator('canvas.radar').scrollIntoViewIfNeeded();
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
    radarGame(); radarBattle(); placeHer(20); RADAR.HIT_R = 1e3;  // every shot lands, so her first volley hits
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

test('a reload mid-fight does not save the fight, and the game continues from the last port', async () => {
  const { page, ev, errors, done } = await open({ title: true });
  await ev(helpers);
  await ev(() => {
    radarGame(); uatLand('Ceres Station'); Saves.write(G.state);
    uatBurn('Ceres Station', 'pallas'); G.transit.times = []; G.transit.event = null; G.dialog = null; radarBattle();
  });
  await page.click('[data-action="radarPlay"]'); await page.waitForFunction(() => G.radar.s.state.t > 0, null, { timeout: 30000 });
  await page.reload();
  await page.click('[data-action="menuContinue"]');
  const r = await ev(() => ({ mode: G.mode, planet: G.state.planet, fight: !!(G.dialog && G.dialog.event.fight), radar: G.radar }));
  assert.deepEqual(r, { mode: 'landed', planet: 'Ceres Station', fight: false, radar: null });
  assert.deepEqual(errors, []);
  await done();
});

test('Space on a focused button pauses and resumes the fight and does not also press the button', async () => {
  const { page, ev, done } = await open();
  await ev(helpers);
  await ev(() => { radarGame(); radarBattle(); });
  await page.click('[data-action="radarPlay"]');
  await page.focus('[data-action="radarSpeed"][data-arg="1"]');
  await page.keyboard.press('Space');
  assert.deepEqual(await ev(() => ({ running: G.radar.running, speed: G.radar.speed })), { running: false, speed: 16 });
  await page.focus('[data-action="radarSpeed"][data-arg="2"]');
  await page.keyboard.press('Space');
  assert.deepEqual(await ev(() => ({ running: G.radar.running, speed: G.radar.speed })), { running: true, speed: 16 });
  await done();
});

test('the fight ends in the ship fight\'s ends: a crippled raider goes on to the dead-in-space scene', async () => {
  const { page, ev, errors, done } = await open();
  await ev(helpers);
  await ev(() => { radarGame(); radarBattle(); const f = G.radar.s.state.foes[0]; f.parts.weapons.hp = 0; f.parts.drive.hp = 0; });
  await page.click('[data-action="radarPlay"]');
  await page.waitForFunction(() => !G.radar, null, { timeout: 30000, polling: 50 });
  const r = await ev(() => ({ text: G.dialog.event.text, line: sceneSay('scene:fight', 'end.crippled.grapple'), fight: !!document.querySelector('canvas.radar') }));
  assert.ok(r.text.startsWith(r.line), `the dead-in-space scene, led by the crippled line: ${r.text.slice(0, 200)}`);
  assert.equal(r.fight, false);
  assert.deepEqual(errors, []);
  await done();
});

// ---------- the hand's post on the radar (Task 10) ----------

test('the gunner aims by a mark on her contact or by its button; aimed at her lock and fired, the hit lands on her lock', async () => {
  const { page, ev, errors, done } = await open();
  await ev(helpers);
  await ev(() => { radarGame('raider', 'gunner'); radarBattle(); placeHer(8); G.radar.s.state.foes[0].parts.drive.hp = 0; radarTick(0); });
  const mark = await ev(() => G.radar.drawn.marks.find(m => m.part === 'drive'));
  const box = await page.locator('canvas.radar').boundingBox();
  await page.mouse.click(box.x + mark.x, box.y + mark.y);
  assert.deepEqual(await ev(() => G.radar.orders.aim), { foe: 0, part: 'drive' }, 'a click on her drive mark aims there');
  await page.click('[data-action="radarAimPart"][data-arg="0:lock"]');
  assert.deepEqual(await ev(() => G.radar.orders.aim), { foe: 0, part: 'lock' });
  const r = await ev(() => { const g = G.radar, max = g.s.state.foes[0].parts.lock.hp; runQuiet(g, RADAR.TURN_S); return { max, now: g.s.state.foes[0].parts.lock.hp, hits: g.feed.filter(e => e.kind === 'hit').map(e => e.text) }; });
  assert.ok(r.now < r.max, `her lock took the hit: ${r.now} of ${r.max}`);
  assert.ok(r.hits.length && r.hits.every(t => /lock/.test(t)), r.hits.join(' | '));
  assert.deepEqual(errors, []);
  await done();
});

test('the gun-or-PDC tile changes what fires from the next cycle, not this one; hold fire and a torpedo are the gunner\'s too', async () => {
  const { page, ev, done } = await open();
  await ev(helpers);
  await ev(() => { radarGame('raider', 'gunner'); radarBattle(); runQuiet(G.radar, 5 * radarDt()); });
  await page.click('[data-action="radarFc"][data-arg="pdc"]');
  const r = await ev(() => { const g = G.radar, before = g.s.state.fc; runQuiet(g, (RADAR.SUB - 6) * radarDt()); const late = g.s.state.fc; runQuiet(g, 2 * radarDt()); return { before, late, next: g.s.state.fc, ordered: g.orders.fc }; });
  assert.deepEqual(r, { before: 'gun', late: 'gun', next: 'pdc', ordered: 'pdc' });
  await page.click('[data-action="radarFire"][data-arg="hold"]');
  assert.equal(await ev(() => G.radar.orders.fire), false);
  await page.click('[data-action="radarFire"][data-arg="fire"]');
  assert.equal(await ev(() => G.radar.orders.fire), true);
  await ev(() => { const st = G.radar.s.state; st.me.launcher = true; st.me.parts.launcher = st.me.parts.launcher || { hp: 10, max: 10 }; st.me.torps = 2; radarTick(0); });
  await page.click('[data-action="radarTorp"]');
  const t = await ev(() => { const g = G.radar; const ordered = g.orders.torp; runQuiet(g, radarDt()); return { ordered, left: g.s.state.me.torps, launched: g.feed.some(e => e.kind === 'launch' && e.side === 'us') }; });
  assert.deepEqual(t, { ordered: 0, left: 1, launched: true });
  await done();
});

test('the pilot drags the burn: outside the wedge it is held to its edge, and it lands within the hand\'s scatter of where it was put', async () => {
  const { page, ev, done } = await open();
  await ev(helpers);
  // our ship opening the range from her, so the order plots a burn back toward her
  const w = await ev(() => { radarGame('raider', 'pilot'); radarBattle(); G.radar.s.state.ships[0].v = { x: 0, y: -0.5 }; radarPlan(G.radar); radarTick(0); return { wedge: G.radar.wedge, geo: G.radar.geo, scatter: radarScatterOf(radarLevels().pilot) }; });
  assert.ok(w.wedge.dir !== null, 'far out, the order plots a burn toward her');
  const box = await page.locator('canvas.radar').boundingBox(), out = (w.wedge.dir + 90) * Math.PI / 180;  // a quarter turn off the plotted line: outside the wedge
  await page.mouse.move(box.x + w.geo.cx + 60 * Math.sin(out), box.y + w.geo.cy - 60 * Math.cos(out));
  await page.mouse.down();
  await page.mouse.up();
  const r = await ev(() => ({ plot: G.radar.hand.plot, burn: G.radar.orders.burn }));
  const edge = (w.wedge.dir + w.wedge.half) % 360, off = d => ((d - edge + 540) % 360) - 180;
  assert.ok(Math.abs(off(r.plot.dir)) < 1e-6, `held to the wedge's edge ${edge}, not ${r.plot.dir}`);
  assert.ok(Math.abs(off(r.burn.dir)) <= w.scatter + 1e-6, `lands within the scatter: ${r.burn.dir}`);
  await done();
});

test('the pilot chooses, when coasting, to turn to her or hold the heading; a post the crew work has no console', async () => {
  const { page, ev, done } = await open();
  await ev(helpers);
  await ev(() => { radarGame('raider', 'pilot'); radarBattle(); G.radar.hand.burn = null; G.radar.orders = radarCompose(G.radar); radarTick(0); });
  await page.click('[data-action="radarCoast"][data-arg="hold"]');
  assert.equal(await ev(() => G.radar.orders.turnTo), null);
  await page.click('[data-action="radarCoast"][data-arg="turn"]');
  assert.equal(await ev(() => { const st = G.radar.s.state; return G.radar.orders.turnTo === radarDir(st.ships[0].p, st.ships[1].p); }), true);
  await ev(() => { G.radar = null; G.dialog = null; radarGame('raider', 'engineer'); radarBattle(); });
  assert.equal(await page.textContent('.radar-post'), '');
  await done();
});

test('an aim at a part she has lost moves to her hull at the next cycle, so the gun does not fire at nothing', async () => {
  const { page, ev, done } = await open();
  await ev(helpers);
  await ev(() => { radarGame('raider', 'gunner'); radarBattle(); });
  await page.click('[data-action="radarAimPart"][data-arg="0:drive"]');
  const r = await ev(() => { const g = G.radar; g.s.state.foes[0].parts.drive.hp = 0; const before = { ...g.orders.aim }; runQuiet(g, RADAR.TURN_S); return { before, after: g.orders.aim }; });
  assert.deepEqual(r, { before: { foe: 0, part: 'drive' }, after: { foe: 0, part: 'hull' } });
  await done();
});
