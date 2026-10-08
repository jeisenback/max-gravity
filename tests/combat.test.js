'use strict';

// Combat: duels during burns, local-space fights, torpedoes,
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

test('a pirate intercepts a burn, and the duel plays to an end and back to the burn', async () => {
  const { page, ev, done } = await open();
  await ev(burnSetup);
  await ev(() => { G.transit.times = []; G.transit.interceptPlanned = true; G.transit.intercept = { spec: { kind: 'pirate' }, at: 0 }; });
  await page.waitForFunction(() => G.dialog && G.dialog.event.title === 'Contact');
  const label = await ev(() => G.dialog.choices[0].label);
  await page.click('[data-action=choose][data-arg="0"]');
  await page.click('[data-action=continue]');
  const r = await ev(() => {
    let n = 0;
    // Play the first card offered until the fight is over.
    while (G.dialog && n < 20) {
      if (/^Contact: exchange/.test(G.dialog.event.title)) n++;
      const hand = G.duel && G.duel.me.threat.hand;
      const i = hand && G.duel.init === 'me' && hand.includes('torp') ? G.dialog.choices.findIndex(c => /^Torpedo/.test(c.label)) : 0;
      chooseEvent(Math.max(0, i)); finishEvent();
    }
    return { n, duel: !!G.duel, mode: G.mode };
  });
  assert.match(label, /you take the guns/, 'with no gunner aboard, the captain fights');
  assert.ok(r.n >= 1 && r.n <= 8, `the duel runs one to eight exchanges (${r.n})`);
  assert.equal(r.duel, false, 'the duel ends');
  assert.equal(r.mode, 'transit', 'back to the burn');
  await done();
});

test('bounties intercept and pay; beaten pirates can be boarded; local space stays quiet', async () => {
  const { ev, done } = await open();
  const r = await ev(() => {
    const st = G.state, out = {}; st.tutorial = null; st.story.next = 1e9; st.credits = 50000; st.shipId = 'freighter';
    const burnTo = (from, planet, to) => {
      G.transit = null; st.systemId = from; st.planet = planet; landAt(system().planets.find(p => p.name === planet), []);
      while (G.dialog) { chooseEvent(G.dialog.choices.length - 1); finishEvent(); }
      takeOff(); st.dest = to; G.player.x = 6000; G.player.y = 0; tryBurn(); enterTransit();
    };
    // Wins the duel on the next exchange.
    const winDuel = spec => {
      startDuel(spec, false); G.nextEvent = null;
      const d = G.duel; d.foeHp = 1; d.init = 'me'; d.me.threat.hand[0] = 'gun'; d.them.answer.hand = ['locks'];
      return duelExchange('gun', 'locks');
    };
    st.missions.push({ id: 777, type: 'bounty', targetSystem: 'ceres', targetName: 'The Weeping Saint', issuer: 'Belt Collective', title: 'Bounty', pay: 9000, deadline: 999 });
    burnTo('hygiea', 'The Rook', 'ceres');
    planIntercept();
    out.bountyKind = G.transit.intercept && G.transit.intercept.spec.kind;
    const credits = st.credits;
    out.summary = winDuel(G.transit.intercept.spec);
    out.paid = st.credits - credits;
    out.bountyLeft = st.missions.some(m => m.id === 777);
    out.bountyBoard = !!G.nextEvent;

    out.pirateText = winDuel({ kind: 'pirate' });
    const drift = G.nextEvent; G.nextEvent = null;
    out.driftChoices = drift.choices.map(c => c.label);
    drift.choices[0].run();
    out.boardChoices = G.nextEvent.choices.map(c => c.label);
    G.nextEvent = null;

    st.rep['Earth Coalition'] = -40;
    burnTo('mars', 'Mars', 'earth');
    let patrols = 0;
    for (let i = 0; i < 40; i++) { G.transit.interceptPlanned = false; G.transit.intercept = null; planIntercept(); if (G.transit.intercept && G.transit.intercept.spec.kind === 'patrol') patrols++; }
    out.patrols = patrols;

    G.transit = null; st.systemId = 'hygiea'; st.planet = 'The Rook'; G.player = makeShip('shuttle', 0, 0, 0); G.mode = 'flight';
    let pirates = 0;
    for (let i = 0; i < 20; i++) { populateSystem(); pirates += G.npcs.filter(x => x.kind === 'pirate' && x.hostile).length; }
    out.pirates = pirates;
    return out;
  });
  assert.equal(r.bountyKind, 'bounty');
  assert.equal(r.paid, 9000);
  assert.equal(r.bountyLeft, false);
  assert.equal(r.bountyBoard, false, 'a bounty target is finished, not boarded');
  assert.doesNotMatch(r.summary, /The The/);
  assert.match(r.pirateText, /dead in space/);
  assert.deepEqual(r.driftChoices, ['Close in and board', 'Finish her', 'Leave her drifting']);
  assert.ok(r.boardChoices.some(l => /^Board/.test(l)), `board offered (${r.boardChoices})`);
  assert.ok(r.patrols > 10, 'wanted captains meet patrols');
  assert.equal(r.pirates, 0, 'pirates come for you in burns, not in local space');
  await done();
});

test('classic fights: a corvette beats a corsair, torpedoes help a shuttle', async () => {
  const { ev, done } = await open();
  const r = await ev(() => {
    G.state.tutorial = null; G.state.story.next = 1e9;
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
    const fresh = () => { const st = G.state; st.tutorial = null; st.story.next = 1e9; st.credits = 50000; while (G.dialog) finishEvent(); G.mode = 'landed'; takeOff(); G.spawnTimer = 1e9; G.npcs = []; G.torps = []; };
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
    const st = G.state; st.tutorial = null; st.story.next = 1e9; st.credits = 50000; st.cargo.equipment = 15; st.paid.equipment = 4000;
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
    const st = G.state; st.tutorial = null; st.credits = 200000;
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

test('a destroyed pirate sometimes leaves an escape pod, never twice in forty days, and only an unnamed pirate does', async () => {
  const { ev, done } = await open();
  const r = await ev(() => {
    const st = G.state, out = {}; st.tutorial = null; st.story.next = 1e9;
    const real = Math.random, foe = (kind, bountyId) => ({ kind, name: 'Test', persona: null, bountyId });
    const kill = (roll, kind = 'pirate', bountyId) => { G.nextEvent = null; Math.random = () => roll; try { duelFinish(foe(kind, bountyId)); } finally { Math.random = real; } const e = G.nextEvent; G.nextEvent = null; return e && e.title; };
    out.lucky = kill(0.01);                      // the pod comes (and its scene is built, so the gap starts)
    out.again = kill(0.01);                      // not again at once
    st.day += 41; out.later = kill(0.01);        // after the gap, yes
    st.day += 41; out.unlucky = kill(0.99);      // most kills leave nothing
    out.trader = kill(0.01, 'trader');           // only a pirate
    st.day += 41; out.bounty = kill(0.01, 'pirate', 777);  // and not a named bounty, who is finished
    return out;
  });
  assert.equal(r.lucky, 'The Escape Pod'); assert.equal(r.again, null); assert.equal(r.later, 'The Escape Pod');
  assert.equal(r.unlucky, null); assert.equal(r.trader, null); assert.equal(r.bounty, null);
  await done();
});
