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
  assert.match(r.after.next, /exchange 1 of 8/);
  assert.deepEqual(r.taken, { pending: true, mode: 'manual' });
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
