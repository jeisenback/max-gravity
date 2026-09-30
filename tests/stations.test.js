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
    const st = G.state; st.tutorial = null; st.story.next = 1e9; while (G.dialog) finishEvent();
    st.credits = 5000; st.armor = ship().armor;
    uatBurn('Ceres Station', 'pallas'); G.transit.times = []; G.transit.event = null; G.dialog = null;
    openEvent(contactEvent({ kind }));
  };
  // One burn's worth of frames, at the current power and wear setting.
  window.wearBurn = () => { const t = G.transit; for (let i = 0; i < 90; i++) { t.event = null; G.dialog = null; Mods.emit('frame', 1); } };
  // Frames of a burn that can see projects.
  window.burnFrames = n => { const t = G.transit; for (let i = 0; i < n; i++) { t.event = null; G.dialog = null; Mods.emit('frame', 1); } };
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
    const st = G.state; st.tutorial = null; st.story.next = 1e9; st.crew = []; while (G.dialog) finishEvent();
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
    const st = G.state; st.tutorial = null; st.story.next = 1e9; st.crew = []; while (G.dialog) finishEvent();
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

test('gunner: a crewed gunner fights the duel; with none, or the post taken, you do', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    G.state.crew = [];
    contact();
    const labels = G.dialog.choices.map(c => c.label);
    chooseEvent(0);
    const solo = { duel: !!G.duel, next: G.nextEvent && G.nextEvent.title, board: G.duel.me.counts.board };
    G.dialog = null; G.duel = null; G.nextEvent = null;
    hire('gunner', 2); hire('pilot', 1); contact();
    const crewedLabels = G.dialog.choices.map(c => c.label);
    const text = chooseEvent(0);
    const crewed = { duel: !!G.duel, board: G.duel.me.counts.board, text };
    G.dialog = null; G.duel = null; G.nextEvent = null;
    // Taking over the post means you fight it, without the gunner's skill.
    takeControl('gunner'); contact();
    const takenLabel = G.dialog.choices[0].label, takenText = chooseEvent(0);
    return { labels, solo, crewedLabels, crewed, takenLabel, takenText, taken: G.duel.me.counts.board };
  });
  assert.match(r.labels[0], /you take the guns/);
  assert.ok(!r.labels.some(l => /take the guns yourself/.test(l)), 'no separate real-time option');
  assert.equal(r.solo.duel, true);
  assert.match(r.solo.next, /exchange 1 of 8/);
  assert.match(r.crewedLabels[0], /fights/);
  assert.equal(r.crewedLabels.length, r.labels.length, 'the same choices, crewed or not');
  assert.match(r.crewed.text, /takes the guns/);
  assert.equal(r.crewed.board, 2, 'a crewed gunner adds a boarding run');
  assert.match(r.takenLabel, /you take the guns/);
  assert.match(r.takenText, /You take the guns yourself/);
  assert.equal(r.taken, 1, 'and without them, you do not');
  await done();
});

test('gunner: decks come from the fit, and torpedoes are spent for good', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    const st = G.state;
    st.crew = []; hire('gunner', 2); hire('pilot', 2); hire('engineer', 1);
    st.outfits.pdc = 1; st.outfits.launcher = 1; st.torpedoes = 3;
    const counts = playerCounts();
    contact(); chooseEvent(0);
    const d = G.duel;
    // Put a torpedo in the threat hand and fire it.
    d.init = 'me'; d.me.threat.hand[0] = 'torp';
    const answer = d.them.answer.hand[0];
    duelExchange('torp', answer);
    return { counts, torps: st.torpedoes, spent: d.me.spent, inDiscard: d.me.threat.discard.includes('torp') };
  });
  assert.deepEqual(r.counts, { torp: 3, gun: 2 + 1 + 1, board: 2, pdc: 3, burn: 4, locks: 2 });
  assert.equal(r.torps, 2, 'a fired torpedo leaves the magazine');
  assert.equal(r.spent, 1);
  assert.equal(r.inDiscard, false, 'torpedoes never go back into the deck');
  await done();
});

test('gunner: exchanges follow threat and answer, end in eight, and never kill you', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    G.state.crew = []; hire('gunner', 3); hire('pilot', 2);
    const table = DUEL_THREATS.map(t => DUEL_ANSWERS.map(a => DUEL_OUTCOME[t][a]));
    const out = { rounds: [], armorOk: true, ended: 0, credits: [], initOk: true };
    // Always play the best card in hand against what they play.
    const best = (hand, theirs, attacking) => {
      const rank = { stop: 0, half: 1, full: 2 };
      return [...hand].sort((a, b) => attacking ? rank[DUEL_OUTCOME[b][theirs]] - rank[DUEL_OUTCOME[a][theirs]] : rank[DUEL_OUTCOME[theirs][a]] - rank[DUEL_OUTCOME[theirs][b]])[0];
    };
    for (let i = 0; i < 20; i++) {
      contact(); const pre = G.state.credits; chooseEvent(0);
      let n = 0;
      while (G.dialog || G.nextEvent) {
        if (G.nextEvent && !G.dialog) finishEvent();
        if (!G.dialog) break;
        if (/\(disabled\)$/.test(G.dialog.event.title)) { chooseEvent(1); finishEvent(); continue; }  // finish her off
        if (!/^Contact: exchange/.test(G.dialog.event.title)) { finishEvent(); continue; }
        const d = G.duel, attacking = d.init === 'me', theirs = foePlay();
        const mine = best(d.me[attacking ? 'threat' : 'answer'].hand, theirs, attacking);
        const res = attacking ? DUEL_OUTCOME[mine][theirs] : DUEL_OUTCOME[theirs][mine];
        duelExchange(mine, theirs); n++;
        if (G.duel) out.initOk = out.initOk && (res === 'stop' ? G.duel.init !== (attacking ? 'me' : 'foe') : G.duel.init === (attacking ? 'me' : 'foe'));
        G.dialog = null; if (!G.nextEvent) break; const nx = G.nextEvent; G.nextEvent = null; openEvent(nx);
        out.armorOk = out.armorOk && G.state.armor >= 1;
        if (n > 10) break;
      }
      out.rounds.push(n); out.credits.push(G.state.credits - pre); out.ended += G.duel === null ? 1 : 0;
      G.duel = null; G.nextEvent = null; G.dialog = null;
    }
    return { ...out, table };
  });
  assert.deepEqual(r.table, [['stop', 'half', 'full'], ['half', 'stop', 'full'], ['half', 'full', 'stop']],
    'PDCs stop torpedoes, burns stop gun runs, crew at the locks stop boarders');
  assert.ok(r.initOk, 'a landed threat keeps the initiative and a stopped one passes it');
  assert.ok(r.rounds.every(n => n >= 1 && n <= 8), `no fight runs past eight exchanges (${r.rounds})`);
  assert.ok(r.armorOk, 'armor never drops below 1');
  assert.equal(r.ended, 20, 'every fight ends');
  assert.ok(r.credits.some(c => c > 0), 'beating a pirate pays a bounty');
  await done();
});

test('gunner: the enemy counts cards from public information', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    const st = G.state; st.crew = []; hire('gunner', 2); hire('pilot', 1);
    contact(); chooseEvent(0);
    const d = G.duel; d.init = 'me'; d.spec.kind = 'patrol';  // no lean toward any answer
    d.them.answer.hand = ['pdc', 'burn', 'locks'];
    const tally = () => { const n = { pdc: 0, burn: 0, locks: 0 }; for (let i = 0; i < 400; i++) n[foePlay()]++; return n; };
    // All you have left is gun runs: evasive burns stop them.
    d.me.counts = { ...d.me.counts, torp: 0, board: 0 };
    const guns = tally();
    // All you have left is torpedoes: the PDC screen stops them.
    d.me.counts = { ...d.me.counts, torp: 4, gun: 0 }; d.me.threat.discard = [];
    const torps = tally();
    return { guns, torps };
  });
  assert.ok(r.guns.burn > r.guns.pdc && r.guns.burn > r.guns.locks, `burns against guns (${JSON.stringify(r.guns)})`);
  assert.ok(r.torps.pdc > r.torps.burn && r.torps.pdc > r.torps.locks, `PDCs against torpedoes (${JSON.stringify(r.torps)})`);
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
    const go = () => { uatBurn('Ceres Station', 'pallas'); G.transit.times = []; st.heat = 0; st.fuel = ship().fuel; st.armor = ship().armor; Object.assign(power(), { drive: 40, weapons: 30, shields: 30 }); setPower('drive', 80); G.transit.comms = []; };
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
  assert.ok(r.c1.armor && r.c1.comm && r.c1.drive < 80, "they ease the drive back and say so");
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
    const deck = () => playerCounts();
    const gunsLow = (setPower('weapons', 10), deck().gun), gunsHigh = (setPower('weapons', 80), deck().gun);
    const burnLow = (setPower('drive', 10), deck().burn), burnHigh = (setPower('drive', 80), deck().burn);
    // Shields of 40% or more give a deflector that soaks the first half hit.
    const wall = sh => { Object.assign(power(), { drive: 10, weapons: 10, shields: 10 }); setPower('shields', sh); G.duel = null; startDuel({ kind: 'pirate' }, false); const d = G.duel.deflector; G.duel = null; G.nextEvent = null; return d; };
    const soaks = { high: wall(60), low: wall(20) };
    // The deflector is used up on the first half hit: a half-hit answer, a foe threat.
    setPower('shields', 60); startDuel({ kind: 'pirate' }, false); const d = G.duel; d.init = 'foe'; d.me.answer.hand = ['pdc', 'pdc', 'pdc']; d.them.threat.hand = ['gun', 'gun', 'gun'];
    const before = st.armor; duelExchange('pdc', 'gun'); const soakedOnce = st.armor === before && G.duel && G.duel.deflector === false;
    G.duel = null; G.nextEvent = null;
    return { a, again, shields, sure, gunsLow, gunsHigh, burnLow, burnHigh, soaks, soakedOnce };
  });
  assert.match(r.a, /behind the shields/); assert.equal(r.again, null, 'already there');
  assert.equal(r.shields, 50); assert.ok(r.sure);
  assert.ok(r.gunsHigh > r.gunsLow && r.burnHigh > r.burnLow, 'weapons power adds gun runs, drive power adds evasive burns');
  assert.deepEqual(r.soaks, { high: true, low: false }, 'shields of 40% or more give a deflector');
  assert.ok(r.soakedOnce, 'and it soaks the first half hit only');
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

test('drive power sets the burn: speed, days, reaction mass, and how easily pirates spot you', async () => {
  const { page, ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    const st = G.state; st.tutorial = null; st.crew = []; while (G.dialog) finishEvent();
    const burn = drive => {
      uatBurn('Ceres Station', 'pallas'); const t = G.transit; t.times = []; t.interceptPlanned = true;
      Object.assign(power(), { drive: 40, weapons: 30, shields: 30 }); setPower('drive', drive);
      st.fuel = Math.round(ship().fuel * 0.6); const fuel0 = st.fuel, day0 = st.day, cost = t.fuelCost;
      let frames = 0;
      while (G.mode === 'transit' && frames++ < 600) { t.event = null; G.dialog = null; st.heat = 0; update(1); if (G.mode === 'transit') Mods.emit('frame', 1); }
      return { frames, days: st.day - day0, used: fuel0 - st.fuel, cost, base: t.days };
    };
    const slow = burn(10), even = burn(40), fast = burn(80);
    // A pirate is planned for this burn; it only finds you if it can see you.
    const spot = drive => {
      uatBurn('Ceres Station', 'pallas'); const t = G.transit; t.times = [];
      Object.assign(power(), { drive: 40, weapons: 30, shields: 30 }); setPower('drive', drive);
      t.interceptPlanned = true; t.intercept = { spec: { kind: 'pirate' }, at: 0 };
      const real = Math.random; Math.random = () => 0.6;  // in the middle: a cool drive is missed, a hot one is seen
      G.dialog = null; t.event = null; t.comms = [];
      Mods.emit('frame', 0.1); Math.random = real;
      return { seen: !!G.dialog && G.dialog.event.title === 'Contact', scan: t.comms.some(c => /\[Scan\]/.test(c)) };
    };
    const cool = spot(10), hot = spot(80);
    return { slow, even, fast, cool, hot, vis: [10, 40, 80].map(d => (setPower('drive', d), scanVisibility())), max: SCAN_MAX };
  });
  assert.ok(r.slow.frames > r.even.frames && r.even.frames > r.fast.frames, `a hot drive arrives sooner (${r.slow.frames}, ${r.even.frames}, ${r.fast.frames} frames)`);
  assert.ok(r.slow.days > r.even.days && r.even.days > r.fast.days, `and in fewer days (${r.slow.days}, ${r.even.days}, ${r.fast.days})`);
  assert.equal(r.even.days, r.even.base, 'an even load takes the plotted days');
  assert.ok(Math.abs(r.even.used - r.even.cost) <= 1 || r.even.used === 0, `an even load uses no extra mass (${r.even.used})`);
  assert.ok(r.fast.used > r.even.used && r.slow.used < r.even.used, `a hot drive burns more reaction mass per distance (${r.slow.used}, ${r.even.used}, ${r.fast.used})`);
  assert.ok(r.cool.scan && !r.cool.seen, 'a cool drive slips past the pirate');
  assert.ok(r.hot.seen, 'a hot drive is seen');
  assert.ok(r.vis[0] < r.vis[1] && r.vis[1] === 1 && r.vis[2] === r.max, 'visibility is 1 at an even load and tops out at the maximum');
  // Dry tanks throttle the drive, and the panel says what the sliders do.
  await ev(() => { uatBurn('Ceres Station', 'pallas'); G.transit.times = []; setPower('drive', 80); G.state.fuel = 0; G.transit.event = null; Mods.emit('frame', 1); });
  assert.equal(await ev(() => power().drive), 40);
  await ev(() => { G.state.tutorial = null; hire('pilot'); G.state.crew = []; });
  await page.waitForSelector('#bkeys', { state: 'visible' });
  await page.click('[data-bst=eng]');
  await page.$eval('#bsheet input[data-power=drive]', el => { el.value = 70; el.dispatchEvent(new Event('input', { bubbles: true })); });
  assert.match(await page.innerText('#bsheet'), /Burn speed 1\.24x\. Reaction mass use \+30%/);
  await done();
});

test('comms: a scene says how it arrived, the inbox keeps it, and the comms post listens', async () => {
  const { page, ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    const st = G.state; st.tutorial = null; st.crew = []; st.inbox = []; while (G.dialog) finishEvent();
    uatBurn('Ceres Station', 'pallas'); G.transit.times = [];
    // A storylet can say how it reaches you; a bad value is refused.
    const bad = (() => { const real = console.error; let msg = ''; console.error = m => { msg = m; }; addStorylet({ id: 'via-bad', where: 'transit', via: 'pigeon', title: 'T', text: 'x', choices: [{ label: 'a' }] }); console.error = real; return msg; })();
    addStorylet({ id: 'via-ok', where: 'transit', via: 'message', priority: 1, title: 'A letter', text: 'x', choices: [{ label: 'a' }] });
    const ev1 = storyletEvent(STORYLETS.find(s => s.id === 'via-ok'));
    STORYLETS.pop();
    // Happenings carry the source onto the scene and into the inbox.
    const seen = {};
    for (let i = 0; i < 80; i++) { G.transit.event = null; G.dialog = null; const e = pickHappening('transit'); if (e) seen[e.via] = (seen[e.via] || 0) + 1; }
    const inboxVias = [...new Set(st.inbox.map(m => m.via))];
    // The comms post: solo you listen (may fail), a crewed officer does it better, once a day.
    const before = st.rumors.length;
    let got = 0; for (let i = 0; i < 12; i++) { postState('comms').busy = false; const n = st.rumors.length; giveOrder('comms', 'listen'); got += st.rumors.length > n ? 1 : 0; }
    hire('slicer', 3); postState('comms').busy = false;
    const note = giveOrder('comms', 'listen'), second = giveOrder('comms', 'listen');
    return { bad, via: ev1.via, seen, inboxVias, got, note, second, tips: st.rumors.length > before };
  });
  assert.match(r.bad, /via must be/);
  assert.equal(r.via, 'message');
  assert.ok(Object.keys(r.seen).length >= 2 && Object.keys(r.seen).every(v => ['station', 'ship', 'message', 'crew'].includes(v)), `scenes carry a source (${JSON.stringify(r.seen)})`);
  assert.ok(r.inboxVias.length >= 1);
  assert.ok(r.got > 0 && r.tips, 'listening finds tips');
  assert.match(r.note, /tip|static/); assert.equal(r.second, null, 'once a day');
  // The station at port and the sheet in a burn.
  await ev(() => { G.transit = null; G.mode = 'landed'; landAt(currentPlanet(), []); while (G.dialog) finishEvent(); UI.render(); });
  await page.click('[data-action=station][data-arg=comms]');
  assert.match(await page.innerText('#panel'), /Inbox/i);
  assert.ok(await page.$('#panel [data-action=postOrder][data-arg="comms:listen"]'));
  await done();
});

test('comms: a crewed officer takes the merchant hail themselves, a solo captain answers it', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    const st = G.state; st.tutorial = null; st.crew = []; st.inbox = []; while (G.dialog) finishEvent();
    const hail = TRANSIT_EVENTS.find(e => e.title === 'Merchant Hail');
    const only = { tier: 2, weight: 1, via: 'ship', make: () => hail };
    Mods.register({ id: 'only-hail', name: 'x', init(M) { M.filter('happenings', (list, where) => where === 'transit' ? [only] : list); } });
    const go = (credits) => {
      uatBurn('Ceres Station', 'pallas'); const t = G.transit; t.times = []; st.credits = credits; t.seen = []; G.dialog = null; G.handled = false;
      const e = pickHappening('transit');
      return { e: e && e.title, handled: G.handled, credits: st.credits, comms: t.comms.filter(c => /\[Comms\]/.test(c)).length };
    };
    const solo = go(5000);
    hire('slicer', 2);
    const rich = go(5000), poor = go(800);
    return { solo, rich, poor, inbox: st.inbox.length };
  });
  assert.equal(r.solo.e, 'Merchant Hail', 'a solo captain gets the hail to answer');
  assert.equal(r.rich.e, null); assert.ok(r.rich.handled && r.rich.comms === 1 && r.rich.credits === 4500, 'the officer buys the tip when there is money to spare');
  assert.ok(r.poor.handled && r.poor.credits === 800, 'and declines it when there is not');
  assert.ok(r.inbox >= 2);
  await done();
});


test('wear: systems wear slowly with use, at the setting you choose, and old saves start new', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    const st = G.state; st.tutorial = null; st.crew = []; while (G.dialog) finishEvent();
    delete st.condition;
    const fresh = Object.values(condition()).every(v => v === 100);
    const run = (setting, drive) => {
      Settings.wear = setting; st.condition = undefined; condition();
      uatBurn('Ceres Station', 'pallas'); G.transit.times = []; Object.assign(power(), { drive: 40, weapons: 30, shields: 30 }); setPower('drive', drive); st.fuel = ship().fuel; st.heat = 0;
      wearBurn();
      return { ...condition() };
    };
    const off = run('off', 40), slow = run('slow', 40), normal = run('normal', 40), hot = run('slow', 80);
    // Fights and hits wear the fire control and shields.
    Settings.wear = 'slow'; st.condition = undefined; condition();
    for (let i = 0; i < 100; i++) Mods.emit('fire', G.player);
    for (let i = 0; i < 20; i++) Mods.emit('damage', G.player, true, false, 0);
    const fight = { ...condition() };
    Settings.wear = 'slow';
    return { fresh, off, slow, normal, hot, fight };
  });
  assert.ok(r.fresh, 'an old save has full condition');
  assert.ok(Object.values(r.off).every(v => v === 100), 'wear off means no wear');
  assert.ok(r.slow.drive < 100 && r.slow.drive > 95, `a burn costs a few percent (${r.slow.drive})`);
  assert.ok(100 - r.normal.drive > 2 * (100 - r.slow.drive), 'normal wears faster than slow');
  assert.ok(r.hot.drive < r.slow.drive, 'a hot drive wears faster');
  assert.ok(r.fight.fire < 100 && r.fight.shields < 100 && r.fight.drive === 100, 'shots and hits wear the gear that took them');
  await done();
});

test('wear: a worn system costs performance, and breakdowns come as a scene', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    const st = G.state; st.tutorial = null; st.crew = []; Settings.wear = 'slow'; while (G.dialog) finishEvent();
    st.condition = undefined; condition();
    const blurs = () => { let n = 0; for (let i = 0; i < 40; i++) { startDuel({ kind: 'pirate' }, false); n += Object.values(G.duel.blur).filter(v => v !== 0).length; G.duel = null; G.nextEvent = null; } return n; };
    const good = { speed: burnSpeed(), guns: playerCounts().gun, blur: blurs() };
    Object.assign(condition(), { drive: 10, fire: 10, sensors: 10 });
    const worn = { speed: burnSpeed(), guns: playerCounts().gun, blur: blurs() };
    // A part below the line can break down on a burn; one above never does.
    uatBurn('Ceres Station', 'pallas'); G.transit.times = [];
    const titles = new Set(); for (let i = 0; i < 120; i++) { G.transit.event = null; G.dialog = null; const e = pickHappening('transit'); if (e) titles.add(e.title); }
    st.condition = undefined; condition(); const calm = new Set();
    for (let i = 0; i < 120; i++) { G.transit.event = null; G.dialog = null; const e = pickHappening('transit'); if (e) calm.add(e.title); }
    // The scene: fix it properly (needs an engineer), jury-rig it, or nurse it along.
    condition().shields = 30;
    const ev1 = breakdownEvent('shields'), labels = ev1.choices.map(c => c.label);
    openEvent(ev1); const visible = G.dialog.choices.map(c => c.label);
    const nurse = ev1.choices[2].run(); const after = condition().shields;
    hire('engineer', 2); condition().shields = 30; const left0 = G.transit.left;
    openEvent(breakdownEvent('shields')); const crewed = G.dialog.choices.map(c => c.label);
    chooseEvent(0); const fixed = condition().shields;
    return { good, worn, broke: [...titles].filter(t => /Trouble$/.test(t)), calm: [...calm].filter(t => /Trouble$/.test(t)), labels, visible, crewed, nurse, after, fixed };
  });
  assert.ok(r.worn.speed < r.good.speed && r.worn.guns < r.good.guns && r.worn.blur > r.good.blur && r.good.blur === 0, 'worn drive, fire control and sensors each cost something');
  assert.ok(r.broke.length > 0, 'a failing system can break down on a burn');
  assert.equal(r.calm.length, 0, 'healthy ones do not');
  assert.equal(r.visible.length, 2, 'without an engineer there is no "fix it properly"');
  assert.ok(r.crewed.some(l => /Fix it properly/.test(l)), 'with one there is');
  assert.equal(r.after, 26); assert.equal(r.fixed, 60);
  await done();
});

test('wear: port overhaul, servicing in flight, and the setting in the menu', async () => {
  const { page, ev, done } = await open();
  await ev(helpers);
  await ev(() => { const st = G.state; st.tutorial = null; st.crew = []; st.credits = 10000; while (G.dialog) finishEvent(); st.condition = undefined; Object.assign(condition(), { drive: 50, shields: 80 }); UI.render(); });
  await page.click('[data-action=station][data-arg=eng]');
  assert.match(await page.innerText('#panel'), /Condition/i);
  const cost = await ev(() => overhaulCost('drive'));
  assert.equal(cost, 400);
  await page.click('[data-action=overhaul][data-arg=drive]');
  const after = await ev(() => ({ drive: condition().drive, credits: G.state.credits }));
  assert.deepEqual(after, { drive: 100, credits: 9600 });
  // Servicing in flight: the worst system, once a day, better with a skilled engineer.
  const svc = await ev(() => {
    const st = G.state; uatBurn('Ceres Station', 'pallas'); G.transit.times = [];
    Object.assign(condition(), { drive: 100, shields: 20, fire: 90 });
    hire('engineer', 3); const note = giveOrder('engineer', 'service'); const again = giveOrder('engineer', 'service');
    return { note, again, shields: condition().shields, asked: postOrders('engineer').some(o => o.id === 'service') };
  });
  assert.ok(svc.asked); assert.equal(svc.again, null);
  assert.ok(svc.shields === 20 || svc.shields === 45, `a service helps or fails (${svc.shields})`);
  await done();
  // The setting.
  const m = await open({ title: true });
  await m.ev(() => { Menu.view = 'settings'; Menu.render(); });
  await m.page.click('[data-action=menuWear][data-arg=off]');
  assert.equal(await m.ev(() => Settings.wear), 'off');
  assert.equal(await m.ev(() => JSON.parse(localStorage.getItem('maxGravity.settings')).wear), 'off', 'and it is remembered');
  await m.done();
});

test('projects: they take parts, run only on a burn, and finish with a result', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    const st = G.state; st.tutorial = null; st.crew = []; Settings.wear = 'slow'; while (G.dialog) finishEvent();
    st.cargo = {}; st.paid = {}; st.condition = undefined; condition().shields = 30;
    const none = startProject('patch');  // no parts in the hold
    st.cargo.industrial = 4; st.paid.industrial = 800;
    const started = startProject('patch'), again = startProject('patch'), tune = startProject('tune');  // one job per post
    const out = { none, started, again, tune, parts: st.cargo.industrial, paid: st.paid.industrial, secs: projectsOf().patch.total };
    Mods.emit('frame', 5); out.idleAtPort = projectsOf().patch.left;  // nothing moves at port (not in transit)
    uatBurn('Ceres Station', 'pallas'); G.transit.times = []; st.condition = undefined; condition().shields = 30;
    return out;
  });
  assert.equal(r.none, false); assert.equal(r.started, true); assert.equal(r.again, false); assert.equal(r.tune, false);
  assert.equal(r.parts, 3); assert.equal(r.paid, 600, 'what you paid for the parts goes with them');
  assert.equal(r.secs, 30, 'alone it takes half as long again');
  assert.equal(r.idleAtPort, 30);
  await done();
});

test('projects: a crewed engineer does better; patch, tune and refit each have their effect', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    const st = G.state; st.tutorial = null; st.crew = []; Settings.wear = 'slow'; while (G.dialog) finishEvent();
    const tries = (id, n) => { let ok = 0; for (let i = 0; i < n; i++) { st.condition = undefined; condition().shields = 30; delete projectsOf()[id]; st.cargo.industrial = 9; uatBurn('Ceres Station', 'pallas'); G.transit.times = []; st.cargo.industrial = 9; startProject(id); burnFrames(80); if (condition().shields > 30) ok++; } return ok; };
    const solo = tries('patch', 40);
    hire('engineer', 3); const crew = tries('patch', 40);
    // Tune: faster until you next dock.
    uatBurn('Ceres Station', 'pallas'); G.transit.times = []; st.tuned = null; const base = burnSpeed(); st.tuned = { drive: true }; const tuned = burnSpeed();
    Mods.emit('landed', currentPlanet()); const cleared = burnSpeed();
    // Refit: a permanent edge, and a fresh fire control; a failure hurts it.
    hire('gunner', 3); st.condition = undefined; delete st.refits; condition().fire = 100; const edge0 = playerCounts().gun;
    refits().fire = 1; const edge1 = playerCounts().gun;
    delete st.refits;
    let worse = 0; for (let i = 0; i < 60; i++) { condition().fire = 100; st.cargo.industrial = 9; delete projectsOf().refit; startProject('refit'); uatBurn('Ceres Station', 'pallas'); G.transit.times = []; burnFrames(70); if (condition().fire < 100 && !refits().fire) worse++; else if (refits().fire) delete st.refits; }
    return { solo, crew, base, tuned, cleared, edge0, edge1, worse, left: Object.keys(projectsOf()) };
  });
  assert.ok(r.crew > r.solo, `a crewed engineer succeeds more often (${r.crew} vs ${r.solo} of 40)`);
  assert.ok(r.solo > 0 && r.crew < 40, 'and nobody is certain');
  assert.ok(Math.abs(r.tuned / r.base - 1.1) < 1e-9 && r.cleared === r.base, 'a tune is 10% faster and wears off at the next port');
  assert.ok(r.edge1 > r.edge0, 'a refit adds a gun run to the deck');
  assert.ok(r.worse > 0, 'a refit can go wrong');
  assert.deepEqual(r.left, []);
  await done();
});

test('projects: the station lists them, starts one, and shows its progress', async () => {
  const { page, ev, done } = await open();
  await ev(helpers);
  await ev(() => { const st = G.state; st.tutorial = null; st.crew = []; st.cargo = { industrial: 2 }; st.paid = { industrial: 400 }; while (G.dialog) finishEvent(); UI.render(); });
  await page.click('[data-action=station][data-arg=eng]');
  assert.match(await page.innerText('#panel'), /Projects/i);
  assert.ok(await page.$('#panel [data-action=project][data-arg=patch]:not([disabled])'));
  await page.click('[data-action=project][data-arg=patch]');
  assert.ok(await ev(() => !!projectsOf().patch), 'started');
  await ev(() => { uatBurn('Ceres Station', 'pallas'); G.transit.times = []; burnFrames(10); });
  await page.waitForSelector('#bkeys', { state: 'visible' });
  await page.click('[data-bst=eng]');
  await page.waitForFunction(() => /\d+%/.test(document.querySelector('#bsheet [data-project=patch]').textContent));
  assert.ok(await page.$('#bsheet [data-project-bar=patch]'));
  await page.click('[data-bst=weapons]');
  assert.match(await page.innerText('#bsheet'), /Refit the fire control/);
  assert.equal(await page.$eval('#bsheet [data-action=project][data-arg=refit]', b => b.disabled), true, 'not enough parts for a refit');
  await done();
});
