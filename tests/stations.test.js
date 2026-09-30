'use strict';

// Posts: crewed and manual modes, taking the controls, and orders.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

// A crew member with the given role and skill, aboard.
const helpers = () => {
  window.hire = (role, skill = 2) => {
    const c = makeCrewCandidate('belt'); c.role = role; c.skill = skill; c.mood = null; registerPerson(c); G.state.crew.push(c.id); return c;
  };
  // A burn with a contact on it, and the contact event open.
  window.contact = (kind = 'pirate') => {
    const st = G.state; st.tutorial = null; st.flags.classicCombat = false; st.story.next = 1e9; while (G.dialog) finishEvent();
    st.credits = 5000; st.armor = ship().armor;
    uatBurn('Ceres Station', 'pallas'); G.transit.times = []; G.transit.event = null; G.dialog = null;
    openEvent(contactEvent({ kind }));
  };
  // Runs the game a frame at a time, with nobody else in the sky.
  window.fly = (until, max = 6000) => { let i = 0; while (!until() && i++ < max) { G.npcs = []; G.spawnTimer = 99; update(1 / 30); } return i; };
};

test('a solo captain is manual everywhere; hiring a role makes that post crewed', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    const st = G.state; st.crew = []; delete st.posts;  // an old save has no posts
    const before = Object.keys(POSTS).map(id => postMode(id));
    const e = hire('engineer');
    const after = Object.keys(POSTS).map(id => postMode(id));
    st.injured = { [e.id]: 1 };
    const hurt = postMode('engineer');
    return { before, after, hurt };
  });
  assert.deepEqual(r.before, ['manual', 'manual', 'manual', 'manual']);
  assert.deepEqual(r.after, ['manual', 'manual', 'crewed', 'manual']);
  assert.equal(r.hurt, 'manual', 'an injured engineer cannot hold the post');
  await done();
});

test('taking the controls is instant; being overruled often costs the crew heart', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    const st = G.state; st.crew = [];
    const c = hire('pilot'); const start = c.opinion;
    takeControl('pilot');
    const taken = postMode('pilot'), calm = c.opinion;
    handBack('pilot');
    const back = postMode('pilot');
    takeControl('pilot'); handBack('pilot'); takeControl('pilot');  // the third time in a short while
    return { taken, back, calm: calm === start, after: c.opinion < start, remembered: c.memories.some(m => /keeps taking my controls/.test(m)) };
  });
  assert.equal(r.taken, 'manual'); assert.equal(r.back, 'crewed');
  assert.ok(r.calm, 'once is fine');
  assert.ok(r.after && r.remembered, 'the third time dips their opinion and they remember it');
  await done();
});

test('orders: a skilled crew member does better than the captain, once a day, within the cap', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    const st = G.state, max = ship().armor, cap = Math.floor(max * 0.75);
    st.crew = []; st.armor = 1;
    const solo = orderOdds('engineer');
    hire('engineer', 3);
    const crewed = orderOdds('engineer');
    let gained = 0; const tries = [];
    for (let i = 0; i < 40 && st.armor < cap; i++) { const a = st.armor; postState('engineer').busy = false; giveOrder('engineer', 'patch'); tries.push(st.armor - a); }
    const second = giveOrder('engineer', 'patch');  // busy after the last one, or nothing left to patch
    postState('engineer').busy = false; Mods.emit('newDay', st.day + 1);
    return { solo, crewed, armor: st.armor, cap, second, freed: postState('engineer').busy === false, tries };
  });
  assert.ok(r.crewed > r.solo, `crewed ${r.crewed} beats solo ${r.solo}`);
  assert.ok(r.armor <= r.cap && r.armor > 1, `armor patched to no more than the cap (${r.armor}/${r.cap})`);
  assert.equal(r.second, null, 'no second order while busy, or when the patch has done all it can');
  assert.ok(r.freed);
  await done();
});

test('mods can add orders, and the stations show the post', async () => {
  const { page, ev, done } = await open();
  await ev(helpers);
  await ev(() => { G.state.tutorial = null; while (G.dialog) finishEvent(); hire('engineer'); Mods.register({ id: 'test-orders', name: 'T', init(M) { M.filter('orders', (list, post) => post === 'gunner' ? [...list, { id: 'salute', name: 'Salute', desc: 'x', run: () => 'A crisp salute.' }] : list); } }); UI.render(); });
  await page.click('[data-action=station][data-arg=eng]');
  assert.match(await page.innerText('#panel'), /engineer post/i);
  assert.match(await page.innerText('#panel'), /has the engineer post/);
  await page.click('[data-action=takeControl][data-arg=engineer]');
  assert.match(await page.innerText('#panel'), /taken the engineer controls/);
  await page.click('[data-action=handBack][data-arg=engineer]');
  await page.click('[data-action=station][data-arg=weapons]');
  await page.click('[data-action=postOrder][data-arg="gunner:salute"]');
  assert.match(await page.innerText('#panel'), /crisp salute/);
  // Underway, the same post shows on the station sheet and its buttons work.
  await ev(() => { uatBurn('Ceres Station', 'pallas'); G.transit.times = []; });
  await page.waitForSelector('#bkeys', { state: 'visible' });
  await page.click('[data-bst=eng]');
  assert.match(await page.innerText('#bsheet'), /engineer post/i);
  await page.click('#bsheet [data-action=takeControl]');
  assert.match(await page.innerText('#bsheet'), /taken the engineer controls/);
  await done();
});


test('autopilot: a crewed pilot takes the ship out, brings it in and lands on the chosen planet', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    const st = G.state; st.tutorial = null; st.flags.classicCombat = true; st.story.next = 1e9; st.crew = []; while (G.dialog) finishEvent();
    st.dest = 'mars'; st.fuel = ship().fuel;
    const solo = giveOrder('pilot', 'depart');  // nobody to fly it
    hire('pilot', 2);
    const note = giveOrder('pilot', 'depart');
    const out = { solo, note, auto: G.auto && G.auto.kind, flying: G.mode };
    out.ticks = fly(() => G.mode !== 'flight');
    out.left = G.mode;  // departing, then the burn
    // Arrival: in the destination's local space, route set, pilot crewed.
    st.systemId = 'mars'; G.transit = null; G.mode = 'flight'; G.state.route = { dock: 'Phobos Yards', go: true };
    const a = -0.6; G.player = makeShip(st.shipId, -Math.cos(a) * 1100, -Math.sin(a) * 1100, a);
    G.player.vx = Math.cos(a) * ship().maxSpeed; G.player.vy = Math.sin(a) * ship().maxSpeed;
    Mods.emit('arrive', 'mars'); out.dock = G.auto && G.auto.kind;
    out.dockTicks = fly(() => G.mode === 'landed');
    out.landedAt = st.planet; out.cleared = G.auto === null && st.route.go === false;
    return out;
  });
  assert.equal(r.solo, null, 'no pilot, no autopilot');
  assert.match(r.note, /takes her out/);
  assert.equal(r.auto, 'out'); assert.equal(r.flying, 'flight');
  assert.ok(['departing', 'transit'].includes(r.left), `it went on to the burn (${r.left})`);
  assert.equal(r.dock, 'dock');
  assert.equal(r.landedAt, 'Phobos Yards', `landed on the chosen planet in ${r.dockTicks} frames`);
  assert.ok(r.cleared);
  await done();
});

test('autopilot: a flight key, a hostile ship, or a hand-back gives the controls to you', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    const st = G.state; st.tutorial = null; st.flags.classicCombat = true; st.story.next = 1e9; st.crew = []; while (G.dialog) finishEvent();
    st.dest = 'mars'; st.fuel = ship().fuel; hire('pilot', 2);
    const go = () => { takeOff(); G.npcs = []; G.spawnTimer = 99; G.auto = { kind: 'out', t: 0, care: 0.8 }; };
    const out = {};
    go(); update(1 / 30); G.keys.thrust = true; update(1 / 30); G.keys.thrust = false;
    out.key = { auto: G.auto, mode: postMode('pilot') };
    handBack('pilot'); G.mode = 'landed'; go(); const n = spawnNpc('pirate', false, true); Object.assign(n, { hostile: true, x: G.player.x + 400, y: G.player.y, vx: 0, vy: 0 }); G.npcs = [n];
    update(1 / 30);
    out.hostile = { auto: G.auto, mode: postMode('pilot') };
    return out;
  });
  assert.equal(r.key.auto, null); assert.equal(r.key.mode, 'manual', 'taking the controls is recorded');
  assert.equal(r.hostile.auto, null); assert.equal(r.hostile.mode, 'crewed', 'a handed-over fight is not an override');
  await done();
});

test('autopilot: the Navigation station offers it to a crewed pilot, and the dock choice sticks', async () => {
  const { page, ev, done } = await open();
  await ev(helpers);
  await ev(() => { const st = G.state; st.tutorial = null; st.crew = []; while (G.dialog) finishEvent(); st.dest = 'mars'; st.fuel = ship().fuel; UI.render(); });
  await page.click('[data-action=station][data-arg=nav]');
  assert.equal(await page.$$eval('[data-action=routeDock]', b => b.length), 0, 'a solo captain has nothing to route');
  await ev(() => { hire('pilot', 2); UI.render(); });
  assert.ok(await page.$$eval('[data-action=routeDock]', b => b.length) >= 2, 'the planets of the destination');
  await page.click('[data-action=routeDock]:nth-of-type(2)');
  const chosen = await ev(() => G.state.route.dock);
  assert.equal(chosen, await ev(() => SYSTEMS.mars.planets[1].name));
  await page.click('[data-action=postOrder][data-arg="pilot:depart"]');
  assert.equal(await ev(() => G.mode), 'flight');
  assert.equal(await ev(() => G.auto && G.auto.kind), 'out');
  await done();
});

test('gunner: a manual gunner fights in real time, a crewed one settles it on the console', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    G.state.crew = [];
    contact();
    const labels = G.dialog.choices.map(c => c.label);
    chooseEvent(0); finishEvent();
    const solo = { pending: !!G.engagePending, duel: !!G.duel };
    G.engagePending = null;
    hire('gunner', 2); contact();
    const crewedLabels = G.dialog.choices.map(c => c.label);
    chooseEvent(0);
    const after = { pending: !!G.engagePending, duel: !!G.duel, next: G.nextEvent && G.nextEvent.title };
    // "take the guns yourself" is the real-time fight again, and is an override.
    finishEvent(); while (G.dialog) finishEvent(); G.duel = null; G.nextEvent = null;
    contact(); chooseEvent(1);
    const taken = { pending: !!G.engagePending, mode: postMode('gunner') };
    return { labels, solo, crewedLabels, after, taken };
  });
  assert.equal(r.labels[0], 'Battle stations');
  assert.deepEqual(r.solo, { pending: true, duel: false });
  assert.match(r.crewedLabels[0], /fights/);
  assert.match(r.crewedLabels[1], /take the guns yourself/);
  assert.equal(r.after.pending, false); assert.equal(r.after.duel, true);
  assert.match(r.after.next, /round 1 of 5/);
  assert.deepEqual(r.taken, { pending: true, mode: 'manual' });
  await done();
});

test('gunner: rounds follow rock paper scissors, end in five, and never kill you', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    G.state.crew = []; hire('gunner', 3); hire('pilot', 2);
    const out = { wins: 0, rounds: [], armorOk: true, ended: 0, credits: [] };
    // Always play the counter to what they play: they lose hit points every round.
    for (let i = 0; i < 20; i++) {
      contact(); const pre = G.state.credits; chooseEvent(0);
      let n = 0;
      while (G.dialog || G.nextEvent) {
        if (G.nextEvent && !G.dialog) finishEvent();
        if (!G.dialog) break;
        if (!/^Contact: round/.test(G.dialog.event.title)) { finishEvent(); continue; }
        const theirs = foeStance(G.duel.spec.kind), mine = Object.keys(STANCES).find(k => STANCES[k].beats === theirs);
        const text = duelRound(mine, theirs); n++;
        G.dialog = null; if (!G.nextEvent) break; const nx = G.nextEvent; G.nextEvent = null; openEvent(nx);
        out.armorOk = out.armorOk && G.state.armor >= 1;
        if (n > 7) break;
      }
      out.rounds.push(n); out.credits.push(G.state.credits - pre); out.ended += G.duel === null ? 1 : 0;
      G.duel = null; G.nextEvent = null; G.dialog = null;
    }
    out.table = ['guns', 'dark', 'board'].map(m => STANCES[m].beats);
    return out;
  });
  assert.deepEqual(r.table, ['board', 'guns', 'dark'], 'guns beat boarders, dark beats guns, boarders beat dark');
  assert.ok(r.rounds.every(n => n >= 1 && n <= 5), `no fight runs past five rounds (${r.rounds})`);
  assert.ok(r.armorOk, 'armor never drops below 1');
  assert.equal(r.ended, 20, 'every fight ends');
  assert.ok(r.credits.some(c => c > 0), 'beating a pirate pays a bounty');
  await done();
});

test('gunner: good crew read the other captain better, and better stances are stronger', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    const st = G.state; st.crew = [];
    const spread = () => { let worst = 0; for (let i = 0; i < 200; i++) { const h = duelHints('pirate'); worst = Math.max(worst, Math.abs(h.guns - 50), Math.abs(h.dark - 20)); } return worst; };
    const solo = { spread: spread(), edge: duelEdges().guns };
    hire('gunner', 3); hire('pilot', 3);
    return { solo, crew: { spread: spread(), edge: duelEdges().guns }, a: Object.values(duelEdges()) };
  });
  assert.ok(r.crew.spread < r.solo.spread, `crew read closer (${r.crew.spread} vs ${r.solo.spread})`);
  assert.ok(r.crew.edge > r.solo.edge);
  assert.ok(r.a.every(e => e >= 0.1 && e <= 0.9));
  await done();
});

test('engineer: power always adds to 100, within limits', async () => {
  const { ev, done } = await open();
  const bad = await ev(() => {
    const out = [];
    for (let i = 0; i < 300; i++) {
      const k = pick(['drive', 'weapons', 'shields']); setPower(k, rand(-20, 120));
      const p = power(), sum = p.drive + p.weapons + p.shields;
      if (sum !== 100 || Object.values(p).some(v => v < POWER_MIN || v > POWER_MAX)) out.push(JSON.stringify(p));
    }
    return out.slice(0, 3);
  });
  assert.deepEqual(bad, []);
  await done();
});

test('engineer: a manual engineer can scram the reactor; a crewed one keeps it cool', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    const st = G.state, run = (secs) => { for (let i = 0; i < secs; i++) { G.transit.event = null; Mods.emit('frame', 1); } };
    st.tutorial = null; st.crew = []; while (G.dialog) finishEvent();
    const go = () => { uatBurn('Ceres Station', 'pallas'); G.transit.times = []; st.heat = 0; st.armor = ship().armor; Object.assign(power(), { drive: 40, weapons: 30, shields: 30 }); setPower('drive', 80); G.transit.comms = []; };
    go(); run(30); const warm = st.heat;
    run(40); const scrammed = { drive: power().drive, heat: st.heat, armor: st.armor < ship().armor, comm: G.transit.comms.some(c => /Reactor scram/.test(c)) };
    const cool = (skill) => { go(); st.crew = []; hire('engineer', skill); let peak = 0; for (let i = 0; i < 200; i++) { G.transit.event = null; Mods.emit('frame', 1); peak = Math.max(peak, st.heat); } return { peak, drive: power().drive, armor: st.armor === ship().armor, comm: G.transit.comms.some(c => /eases the drive/.test(c)) }; };
    const c1 = cool(1), c3 = cool(3);
    // Landing cools everything.
    st.heat = 70; Mods.emit('landed', currentPlanet());
    return { warm, scrammed, c1, c3, landed: st.heat };
  });
  assert.ok(r.warm > 20 && r.warm < 100, `heat builds (${r.warm})`);
  assert.equal(r.scrammed.drive, 10); assert.ok(r.scrammed.armor && r.scrammed.comm, 'the scram costs hull and is on the comms');
  assert.ok(r.c1.peak < 100 && r.c3.peak < 100, `crewed engineers never scram (${r.c1.peak}, ${r.c3.peak})`);
  assert.ok(r.c1.armor && r.c1.comm && r.c1.drive < 80, `they ease the drive back and say so`);
  assert.ok(r.c3.peak > r.c1.peak, 'a better engineer lets it run hotter first');
  assert.equal(r.landed, 0);
  await done();
});

test('engineer: power orders, and power changes the console fight', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    const st = G.state; st.crew = []; st.tutorial = null;
    const a = giveOrder('engineer', 'favor-shields'), again = giveOrder('engineer', 'favor-shields');
    const shields = power().shields;
    hire('engineer', 2); giveOrder('engineer', 'balance');
    const sure = postState('engineer').busy === false;  // power orders are commands, they do not use up the day
    const gunsLow = (setPower('weapons', 10), duelEdges().guns), gunsHigh = (setPower('weapons', 80), duelEdges().guns);
    const darkLow = (setPower('drive', 10), duelEdges().dark), darkHigh = (setPower('drive', 80), duelEdges().dark);
    const loss = sh => {
      let total = 0;
      for (let i = 0; i < 60; i++) { Object.assign(power(), { drive: 10, weapons: 10, shields: 10 }); setPower('shields', sh); st.armor = ship().armor; G.duel = { spec: { kind: 'pirate' }, foe: makeEnemy({ kind: 'pirate' }), foeHp: 9, round: 0, hints: duelHints('pirate') }; duelRound('guns', 'dark'); total += ship().armor - st.armor; G.nextEvent = null; G.duel = null; }
      return total;
    };
    return { a, again, shields, sure, gunsLow, gunsHigh, darkLow, darkHigh, soft: loss(80), hard: loss(10) };
  });
  assert.match(r.a, /behind the shields/); assert.equal(r.again, null, 'already there');
  assert.equal(r.shields, 50); assert.ok(r.sure);
  assert.ok(r.gunsHigh > r.gunsLow && r.darkHigh > r.darkLow, 'weapons power sharpens guns, drive power sharpens running dark');
  assert.ok(r.soft < r.hard, `shields soften the hits (${r.soft} vs ${r.hard})`);
  await done();
});

test('engineer: sliders for a manual engineer, bars for a crewed one, and a sheet you can drag', async () => {
  const { page, ev, done } = await open();
  await ev(helpers);
  await ev(() => { G.state.tutorial = null; G.state.crew = []; while (G.dialog) finishEvent(); UI.render(); });
  await page.click('[data-action=station][data-arg=eng]');
  assert.equal(await page.$$eval('#panel input[data-power]', i => i.length), 3, 'a manual engineer gets sliders');
  await page.$eval('#panel input[data-power=weapons]', el => { el.value = 60; el.dispatchEvent(new Event('input', { bubbles: true })); });
  assert.equal(await ev(() => power().weapons), 60);
  assert.equal(await ev(() => Object.values(power()).reduce((a, b) => a + b, 0)), 100);
  assert.equal(await page.$eval('#panel [data-power-val=weapons]', el => el.textContent), '60%', 'the readout follows');
  await ev(() => { hire('engineer', 2); UI.render(); });
  assert.equal(await page.$$eval('#panel input[data-power]', i => i.length), 0, 'crewed: bars, not sliders');
  assert.ok(await page.$('#panel [data-action=postOrder][data-arg="engineer:favor-drive"]'));
  await ev(() => { takeControl('engineer'); uatBurn('Ceres Station', 'pallas'); G.transit.times = []; });
  await page.waitForSelector('#bkeys', { state: 'visible' });
  await page.click('[data-bst=eng]');
  assert.equal(await page.$$eval('#bsheet input[data-power]', i => i.length), 3);
  await page.$eval('#bsheet input[data-power=drive]', el => { el.focus(); el.value = 70; el.dispatchEvent(new Event('input', { bubbles: true })); });
  await ev(() => { G.state.heat = 40; });
  await page.waitForTimeout(700);  // the sheet refreshes a few times; the slider survives
  assert.equal(await page.$eval('#bsheet input[data-power=drive]', el => el.value), '70');
  assert.match(await page.innerText('#bsheet'), /Heat\s*\d+%/);
  await done();
});
