'use strict';

// Combat: fights during burns (the default), classic local-space fights, torpedoes,
// boarding, injuries, escorts, hails, and the captains you meet more than once.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

// Starts a burn from Hygiea to Ceres with a launcher and torpedoes, ready for a fight.
const burnSetup = () => {
  const st = G.state; st.tutorial = null; st.story.next = 1e9; st.credits = 50000;
  st.shipId = 'shuttle'; st.outfits = { launcher: 1 }; st.torpedoes = 6;
  st.systemId = 'hygiea'; st.planet = 'The Rook';
  landAt(SYSTEMS.hygiea.planets[0], []);
  while (G.dialog) { chooseEvent(G.dialog.choices.length - 1); finishEvent(); }
  takeOff(); st.dest = 'ceres'; G.player.x = 6000; G.player.y = 0; tryBurn(); enterTransit();
};

test('a pirate intercepts a burn; a bot pilot fights it to an end', async () => {
  const { page, ev, done } = await open();
  await ev(burnSetup);
  await ev(() => { G.transit.times = []; G.transit.interceptPlanned = true; G.transit.intercept = { spec: { kind: 'pirate' }, at: 0 }; });
  await page.waitForFunction(() => G.dialog && G.dialog.event.title === 'Contact');
  await page.click('[data-action=choose][data-arg="0"]');
  await page.click('[data-action=continue]');
  await page.waitForFunction(() => G.mode === 'engage');
  const r = await ev(() => {
    G.paused = true;  // the test drives the clock
    const t0 = G.time;
    while (G.mode === 'engage' && G.time - t0 < 240) {
      const e = G.engage, p = G.player, n = e.enemy, dx = n.x - p.x, dy = n.y - p.y, d = Math.hypot(dx, dy);
      const off = wrapAngle(Math.atan2(dy + (n.vy - p.vy) * d / 520, dx + (n.vx - p.vx) * d / 520) - p.angle);
      G.keys = { left: off < -0.05, right: off > 0.05, thrust: Math.abs(off) < 0.3 && d > 700 && Math.hypot(n.vx - p.vx, n.vy - p.vy) < 120, fire: Math.abs(off) < 0.1 && d < 900 };
      if (d < 2500 && d > 800 && Math.random() < 0.01) playerTorpedo();
      engageTick(1 / 60);
      if (G.player.dead) break;
    }
    G.keys = {}; G.paused = false;
    return { mode: G.mode, dead: !!G.player.dead, summary: G.dialog && G.dialog.event.text, torps: G.state.torpedoes };
  });
  assert.ok(r.dead || r.mode !== 'engage', `the fight ends (${JSON.stringify(r)})`);
  if (!r.dead) {
    assert.ok(r.summary, 'a summary follows the fight');
    await ev(() => { chooseEvent(0); finishEvent(); });
    assert.equal(await ev(() => G.mode), 'transit', 'back to the burn');
  }
  assert.ok(r.torps < 6, 'torpedoes were fired');
  await done();
});

test('burning hard strains the crew to a blackout', async () => {
  const { ev, done } = await open();
  await ev(burnSetup);
  const r = await ev(() => {
    G.paused = true;
    startEngage({ spec: { kind: 'pirate' }, flee: true });
    G.engage.throttle = maxG(G.player);
    let maxStrain = 0, blackout = false;
    for (let i = 0; i < 60 * 30 && G.mode === 'engage'; i++) {
      G.keys = { thrust: true };
      engageTick(1 / 60);
      maxStrain = Math.max(maxStrain, G.engage ? G.engage.strain : 0);
      if (G.engage && G.engage.blackout > 0) blackout = true;
      if (G.dialog) { chooseEvent(0); finishEvent(); }
    }
    G.keys = {}; G.paused = false;
    return { maxStrain, blackout, g: maxG(G.player) };
  });
  assert.ok(r.g > 2.5, 'the shuttle can pull more than the strain limit');
  assert.ok(r.maxStrain > 0 && r.blackout, `strain builds to a blackout (${JSON.stringify(r)})`);
  await done();
});

test('bounties intercept and pay; disabled ships can be boarded; burn mode keeps local space quiet', async () => {
  const { ev, done } = await open();
  const r = await ev(() => {
    const st = G.state, out = {}; st.tutorial = null; st.story.next = 1e9; st.credits = 50000; st.shipId = 'freighter';
    const burnTo = (from, planet, to) => {
      G.transit = null; st.systemId = from; st.planet = planet; landAt(system().planets.find(p => p.name === planet), []);
      while (G.dialog) { chooseEvent(G.dialog.choices.length - 1); finishEvent(); }
      takeOff(); st.dest = to; G.player.x = 6000; G.player.y = 0; tryBurn(); enterTransit();
    };
    st.missions.push({ id: 777, type: 'bounty', targetSystem: 'ceres', targetName: 'The Weeping Saint', issuer: 'Belt Collective', title: 'Bounty', pay: 9000, deadline: 999 });
    burnTo('hygiea', 'The Rook', 'ceres');
    planIntercept();
    out.bountyKind = G.transit.intercept && G.transit.intercept.spec.kind;
    startEngage({ spec: G.transit.intercept.spec, flee: false });
    const credits = st.credits;
    damage(G.engage.enemy, 9999, true); engageTick(0.016);
    out.paid = st.credits - credits;
    out.bountyLeft = st.missions.some(m => m.id === 777);
    out.summary = G.dialog && G.dialog.event.text;
    finishEvent();

    startEngage({ spec: { kind: 'pirate' }, flee: false });
    const m = G.engage.enemy, p = G.player;
    damage(m, m.shields + m.maxArmor * 0.85, true);
    out.disabled = !!m.disabled;
    Object.assign(p, { x: m.x - 100, y: m.y, vx: m.vx + 20, vy: m.vy });
    engageHail();
    out.boardChoices = G.dialog.choices.map(c => c.label);
    chooseEvent(0); finishEvent(); engageTick(0.016);
    out.afterBoard = G.mode;
    if (G.dialog) finishEvent();

    st.rep['Earth Coalition'] = -40;
    burnTo('mars', 'Mars', 'earth');
    let patrols = 0;
    for (let i = 0; i < 40; i++) { G.transit.interceptPlanned = false; G.transit.intercept = null; planIntercept(); if (G.transit.intercept && G.transit.intercept.spec.kind === 'patrol') patrols++; }
    out.patrols = patrols;

    G.transit = null; st.systemId = 'hygiea'; st.planet = 'The Rook'; G.player = makeShip('shuttle', 0, 0, 0); G.mode = 'flight';
    let burn = 0, classic = 0;
    for (let i = 0; i < 20; i++) { populateSystem(); burn += G.npcs.filter(x => x.kind === 'pirate' && x.hostile).length; }
    st.flags.classicCombat = true;
    for (let i = 0; i < 20; i++) { populateSystem(); classic += G.npcs.filter(x => x.kind === 'pirate').length; }
    out.burn = burn; out.classic = classic;
    return out;
  });
  assert.equal(r.bountyKind, 'bounty');
  assert.equal(r.paid, 9000);
  assert.equal(r.bountyLeft, false);
  assert.doesNotMatch(r.summary, /The The/);
  assert.ok(r.disabled);
  assert.ok(r.boardChoices.some(l => /^Board/.test(l)), `board offered (${r.boardChoices})`);
  assert.equal(r.afterBoard, 'transit');
  assert.ok(r.patrols > 10, 'wanted captains meet patrols');
  assert.equal(r.burn, 0, 'no hostile pirates in local space in burn mode');
  assert.ok(r.classic > 0, 'classic mode keeps them');
  await done();
});

test('classic fights: a corvette beats a corsair, torpedoes help a shuttle', async () => {
  const { ev, done } = await open();
  const r = await ev(() => {
    G.state.tutorial = null; G.state.story.next = 1e9; G.state.flags.classicCombat = true;
    while (G.dialog) finishEvent();
    G.paused = true;
    const fight = (shipId, outfits, foeId) => {
      const st = G.state;
      st.shipId = shipId; st.outfits = { ...outfits }; st.torpedoes = outfits.launcher ? 6 : 0; st.armor = ship().armor;
      G.mode = 'landed'; takeOff(); G.spawnTimer = 1e9; G.npcs = []; G.shots = []; G.torps = [];
      Object.assign(G.player, { x: 0, y: 0, vx: 0, vy: 0 });
      spawnNpc('pirate', false, true);
      const n = G.npcs[G.npcs.length - 1], s0 = SHIPS[foeId];
      Object.assign(n, { shipId: foeId, hostile: true, x: 700, y: 0, vx: 0, vy: 0, shields: s0.shields, armor: s0.armor, maxArmor: s0.armor });
      G.npcs = [n]; G.target = n;
      for (let t = 0; t < 90; t += 1 / 60) {
        const pl = G.player, d = dist(pl, n), off = turnToward(pl, Math.atan2(n.y - pl.y, n.x - pl.x), 1 / 60);
        G.keys = { thrust: d > 300 && off < 0.5, fire: Math.abs(off) < 0.12 && d < 650 };
        if (st.torpedoes > 0 && !(pl.torpCd > 0) && d < 800) fireTorpedo();
        update(1 / 60); updateTorpedoes(1 / 60);
        if (pl.dead) return false;
        if (n.dead) return true;
      }
      return null;
    };
    const wins = (...a) => { let w = 0; for (let i = 0; i < 12; i++) if (fight(...a)) w++; return w; };
    const out = { corvette: wins('gunship', {}, 'corsair'), shuttle: wins('shuttle', {}, 'corsair'), torps: wins('shuttle', { launcher: 1 }, 'corsair') };
    G.keys = {}; G.paused = false; G.mode = 'landed'; G.player.dead = false;
    return out;
  });
  assert.ok(r.corvette >= 9, `corvette wins most (${JSON.stringify(r)})`);
  assert.ok(r.torps > r.shuttle, `a launcher helps (${JSON.stringify(r)})`);
  await done();
});

test('boarding, prizes, injuries and the medic', async () => {
  const { ev, done } = await open();
  const r = await ev(() => {
    const out = {};
    const fresh = () => { const st = G.state; st.tutorial = null; st.story.next = 1e9; st.credits = 50000; st.flags.classicCombat = true; while (G.dialog) finishEvent(); G.mode = 'landed'; takeOff(); G.spawnTimer = 1e9; G.npcs = []; G.torps = []; };
    const spawn = (kind, shipId, x) => { spawnNpc(kind, false, true); const n = G.npcs[G.npcs.length - 1], s = SHIPS[shipId]; Object.assign(n, { shipId, x: G.player.x + x, y: G.player.y, vx: 0, vy: 0, shields: s.shields, armor: s.armor, maxArmor: s.armor }); return n; };
    const beat = n => { let i = 0; while (!n.disabled && !n.dead && i++ < 200) damage(n, 6, true); };
    const choose = (ev, label) => ev.choices.find(x => x.label.startsWith(label)).run();
    fresh();
    const n = spawn('trader', 'freighter', 600);
    beat(n);
    out.disabled = !!n.disabled && !n.dead;
    out.farChoices = hailEvent(n).choices.map(c => c.label);
    n.x = G.player.x + 120; n.vx = G.player.vx; n.vy = G.player.vy;
    choose(hailEvent(n), 'Board and strip');
    out.cargo = Object.values(G.state.cargo).reduce((a, b) => a + b, 0);
    const f0 = fleet().length;
    choose(hailEvent(n), 'Take the ship');
    out.prize = fleet().length - f0;

    fresh();
    const odds0 = boardOdds();
    G.state.crew.push('kit');
    out.gunnerHelps = boardOdds() > odds0;
    G.state.injured = { kit: true };
    out.injuredGuns = roleSkill('gunner');
    treatInjuries(currentPlanet());
    out.stillHurt = !!G.state.injured.kit;
    const m = makeCrewCandidate('earth'); m.role = 'medic'; m.skill = 1; registerPerson(m); G.state.crew.push(m.id);
    treatInjuries(currentPlanet());
    out.healed = !G.state.injured.kit;
    return out;
  });
  assert.ok(r.disabled);
  assert.ok(!r.farChoices.some(l => l.startsWith('Board')), 'no boarding from far away');
  assert.ok(r.cargo > 0, 'stripping takes cargo');
  assert.equal(r.prize, 1, 'the prize joins the company');
  assert.ok(r.gunnerHelps);
  assert.equal(r.injuredGuns, 0, 'an injured gunner does not man the guns');
  assert.ok(r.healed, 'a medic treats injuries');
  await done();
});

test('every hail answers without errors, and captains remember you', async () => {
  const { page, ev, done } = await open();
  const r = await ev(() => {
    const st = G.state; st.tutorial = null; st.story.next = 1e9; st.flags.classicCombat = true; st.credits = 50000; st.cargo.equipment = 15; st.paid.equipment = 4000;
    while (G.dialog) finishEvent();
    takeOff();
    const setups = {
      trader: () => spawnNpc('trader', false),
      angryTrader: () => { const n = spawnNpc('trader', false); n.hostile = true; return n; },
      pirate: () => { const n = spawnNpc('pirate', false); n.hostile = true; return n; },
      beatenPirate: () => { const n = spawnNpc('pirate', false); n.hostile = true; n.armor = 5; return n; },
      friendlyPirate: () => { const n = spawnNpc('pirate', false); n.hostile = false; return n; },
      patrol: () => spawnNpc('patrol', false),
    };
    let answered = 0;
    for (const make of Object.values(setups)) {
      for (let c = 0; ; c++) {
        G.npcs = []; G.mode = 'flight';
        const n = make(); Object.assign(n, { x: G.player.x + 300, y: G.player.y }); G.target = n;
        tryHail();
        if (!G.dialog || c >= G.dialog.choices.length) { if (G.dialog) finishEvent(); break; }
        const ch = G.dialog.choices[c];
        if (!ch.can || ch.can()) { chooseEvent(c); answered++; }
        finishEvent();
      }
    }
    // A trader you have met turns up again.
    G.npcs = []; const t = spawnNpc('trader', false, true); feel(t, 3, 'Traded fairly.');
    let seen = 0;
    for (let i = 0; i < 30; i++) { G.npcs = []; if (spawnNpc('trader', false).persona === t.persona) seen++; }
    // A captain you kill is gone for good.
    let n; do { G.npcs = []; n = spawnNpc('pirate', false); } while (!n.persona);
    const id = n.persona.id; n.shields = 0; damage(n, 999);
    return { answered, seen, gone: !G.state.people[id] };
  });
  assert.ok(r.answered > 15, `answered ${r.answered} hail choices`);
  assert.ok(r.seen > 0, 'known captains reappear');
  assert.ok(r.gone, 'dead captains are forgotten');
  // H opens a hail with the nearest ship; Esc closes it.
  await ev(() => { G.npcs = []; G.target = null; G.mode = 'flight'; const n = spawnNpc('pirate', false); n.hostile = true; Object.assign(n, { x: G.player.x + 400, y: G.player.y }); });
  await page.keyboard.press('KeyH');
  assert.equal(await ev(() => G.mode), 'hail');
  await page.keyboard.press('Escape');
  assert.equal(await ev(() => G.mode), 'flight');
  await done();
});

test('escorts fly with you, cost reaction mass, and can be lost', async () => {
  const { ev, done } = await open();
  const r = await ev(() => {
    const st = G.state; st.tutorial = null; st.credits = 200000; st.flags.classicCombat = true;
    while (G.dialog) finishEvent();
    buyCompanyShip('lightfreighter'); buyCompanyShip('gunship');
    Mods.act('cescort', '0'); Mods.act('cescort', '1');
    const c1 = st.credits;
    takeOff();
    const flying = G.npcs.filter(x => x.kind === 'escort').length;
    st.dest = 'mars'; G.player.x = 6000; G.player.y = 0; tryBurn();
    const billed = c1 - st.credits;
    enterTransit(); G.transit.times = []; G.transit.left = 0.01;
    for (let i = 0; i < 10 && G.mode !== 'flight'; i++) { update(0.05); if (G.dialog) finishEvent(); }
    const arrived = G.npcs.filter(x => x.kind === 'escort').length;
    const f0 = fleet().length;
    damage(G.npcs.find(x => x.kind === 'escort'), 9999);
    return { flying, billed, arrived, lost: f0 - fleet().length };
  });
  assert.equal(r.flying, 2);
  assert.ok(r.billed > 0, 'escort reaction mass is billed');
  assert.equal(r.arrived, 2, 'escorts arrive with you');
  assert.equal(r.lost, 1, 'a destroyed escort leaves the fleet');
  await done();
});

test('paying off an intercept needs the money', async () => {
  const { ev, done } = await open();
  const r = await ev(() => {
    const pay = kind => contactEvent(kind === 'pirate' ? { kind } : { kind, gov: 'Earth Coalition' }).choices.find(c => /^(Pay|Cut)/.test(c.label));
    G.state.credits = 0;
    const broke = [pay('pirate').can(), pay('patrol').can()];
    G.state.credits = 50000;
    const rich = [pay('pirate').can(), pay('patrol').can()];
    pay('pirate').run();
    return { broke, rich, left: G.state.credits };
  });
  assert.deepEqual(r.broke, [false, false]);
  assert.deepEqual(r.rich, [true, true]);
  assert.equal(r.left, 45000);
  await done();
});
