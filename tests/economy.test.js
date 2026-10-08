'use strict';

// Markets, the living world (stockpiles, raids, faction economies and war),
// outfitting and standing, the shipping company, stakes, and a greedy trader
// that checks a new player can still make money.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser, goTo } = require('./helpers');

after(closeBrowser);

test('buying raises the price, selling lowers it, markets save', async () => {
  const { page, ev, done } = await open({});
  const before = await ev(() => price(currentPlanet(), 'equipment'));
  await page.click('[data-action=tab][data-arg=trade]');
  await page.click('[data-action=buymax][data-arg=equipment]');
  const r = await ev(() => ({ held: G.state.cargo.equipment, now: price(currentPlanet(), 'equipment') }));
  assert.ok(r.held > 0, 'bought some');
  assert.ok(r.now > before, `price rose (${before} -> ${r.now})`);
  await page.click('[data-action=sellall][data-arg=equipment]');
  assert.ok(await ev(() => price(currentPlanet(), 'equipment')) < r.now, 'selling brings it back down');
  assert.ok(await ev(() => { save(); return Object.keys(JSON.parse(localStorage.getItem(SAVE_KEY)).market).length; }) > 0);
  await done();
});

test('the world runs for years: shortages come and go, raids clear when pirates die', async () => {
  const { ev, done } = await open({});
  const r = await ev(() => {
    const st = G.state; st.tutorial = null;
    const pairs = Object.values(SYSTEMS).flatMap(s => s.planets).reduce((n, pl) => n + Object.keys(pl.prices).length, 0);
    let shortDays = 0, total = 0;
    for (let d = 0; d < 600; d++) {
      st.day++; Mods.emit('newDay', st.day);
      const n = Object.keys(SYSTEMS).flatMap(conditions).filter(c => c.text.startsWith('Shortage')).length;
      if (n) shortDays++;
      total += n;
    }
    // A raid at Ceres, then five pirates killed there.
    worldOf('ceres').unrest = 0.6;
    for (let d = 0; d < 6; d++) { st.day++; Mods.emit('newDay', st.day); }
    const raided = danger('ceres');
    st.systemId = 'ceres'; st.planet = 'Ceres Station';
    for (let k = 0; k < 5; k++) Mods.emit('destroyed', { kind: 'pirate' }, true);
    for (let d = 0; d < 20; d++) { st.day++; Mods.emit('newDay', st.day); }
    return { shortDays, share: total / 600 / pairs, raided, after: danger('ceres') };
  });
  assert.ok(r.shortDays > 0, 'shortages happen');
  assert.ok(r.share < 0.25, 'but on average most markets are supplied');
  assert.ok(r.after < r.raided, 'killing pirates calms a raided system');
  await done();
});

test('wars break out and end; slumps follow, and player trade makes booms', async () => {
  const { ev, done } = await open({});
  const r = await ev(() => {
    const st = G.state; st.tutorial = null;
    const econ = new Set(), wars = new Set();
    for (let d = 0; d < 1200; d++) {
      st.day++; Mods.emit('newDay', st.day);
      const w = factionState().war;
      if (w) wars.add(`${w.a}/${w.b}/${w.start}`);
      for (const f of STATE_FACTIONS) if (economy(f)) econ.add(economy(f));
    }
    // Sell 20 tons a day into Mars for two months.
    factionState().war = null;
    const mars = SYSTEMS.mars.planets[0];
    for (let d = 0; d < 60; d++) { recordTrade(mars, 'equipment', 20, -1); st.day++; Mods.emit('newDay', st.day); }
    return { econ: [...econ], wars: wars.size, mars: economy('Mars Republic') };
  });
  assert.ok(r.wars >= 1, 'at least one war in 1200 days');
  assert.ok(r.econ.includes('bust'), 'wars and raids cause slumps');
  assert.equal(r.mars, 'boom', 'steady selling makes a boom');
  await done();
});

test('a war sends warships into local space', async () => {
  const { ev, done } = await open({});
  const r = await ev(() => {
    const st = G.state; st.tutorial = null;
    factionState().war = { a: 'Earth Coalition', b: 'Mars Republic', start: st.day, until: st.day + 40, score: { 'Earth Coalition': 0, 'Mars Republic': 0 } };
    while (G.dialog) finishEvent();
    takeOff(); G.spawnTimer = 1e9;
    const spawned = G.npcs.filter(n => n.war).length;
    for (let t = 0; t < 60; t += 1 / 60) { G.keys = {}; update(1 / 60); }
    return { spawned, war: conditions('earth').some(c => /war/i.test(c.text)) };
  });
  assert.ok(r.spawned > 0, 'warships spawn');
  assert.ok(r.war, 'port conditions mention the war');
  await done();
});

test('outfits change the ship, standing unlocks ships, hostility closes ports', async () => {
  const { page, ev, done } = await open({});
  await ev(() => { G.state.tutorial = null; G.state.credits = 300000; while (G.dialog) finishEvent(); UI.render(); });
  await goTo(page, 'shipyard');
  const base = await ev(() => ({ ...ship() }));
  for (const id of ['pdc', 'armor', 'tank', 'pod', 'drive']) await page.click(`[data-action=buyout][data-arg=${id}]`);
  const fitted = await ev(() => ({ ...ship() }));
  assert.ok(fitted.cargo > base.cargo && fitted.armor > base.armor && fitted.fuel > base.fuel && fitted.maxSpeed > base.maxSpeed, 'outfits add up');
  assert.ok(await page.isDisabled('[data-action=buyship][data-arg=gunship]'), 'corvette locked at Neutral');

  // A full hold keeps the cargo pod fitted.
  await ev(() => { G.state.cargo.food = ship().cargo; UI.render(); });
  await page.click('[data-action=sellout][data-arg=pod]');
  assert.equal(await ev(() => G.state.outfits.pod), 1);
  await ev(() => { G.state.cargo.food = 0; changeRep('Earth Coalition', 20); UI.render(); });
  assert.ok(await page.isEnabled('[data-action=buyship][data-arg=gunship]'), 'corvette unlocked at Trusted');
  await page.click('[data-action=buyship][data-arg=gunship]');
  assert.equal(await ev(() => G.state.shipId), 'gunship');
  assert.ok(await ev(() => ship().cargo > SHIPS.gunship.cargo), 'outfits carried to the new hull');

  // Hostile: patrols turn on you and the port refuses you.
  await page.click('[data-action=takeoff]');
  const r = await ev(() => {
    G.npcs = []; const n = spawnNpc('patrol', false); Object.assign(n, { x: G.player.x + 400, y: G.player.y });
    changeRep('Earth Coalition', -80);
    const pl = system().planets[0]; Object.assign(G.player, { x: pl.x, y: pl.y, vx: 0, vy: 0 });
    tryLand();
    return { hostile: n.hostile, mode: G.mode };
  });
  assert.equal(r.hostile, true);
  assert.equal(r.mode, 'flight', 'docking refused');
  await done();
});

test('company ships and stakes earn money', async () => {
  const { ev, done } = await open({});
  const r = await ev(() => {
    const st = G.state; st.tutorial = null; st.credits = 1e6;
    for (const id of ['lightfreighter', 'freighter']) {
      buyCompanyShip(id);
      const s = fleet()[fleet().length - 1];
      s.route = [s.at, routeOptions(s)[0].to];
    }
    for (const [sid, name] of [['earth', 'Earth'], ['ceres', 'Ceres Station'], ['mars', 'Mars']]) { st.systemId = sid; st.planet = name; buyStake(); }
    for (let d = 0; d < 200; d++) { st.day++; Mods.emit('newDay', st.day); }
    return { earned: fleet().map(s => s.earned), dividends: Object.values(stakes()).map(s => s.dividends), log: st.companyLog.length };
  });
  assert.ok(r.earned.every(e => e > 0), `every ship earned (${r.earned})`);
  assert.ok(r.dividends.every(d => d > 0), `every stake paid (${r.dividends})`);
  assert.ok(r.log > 0);
  await done();
});

test('a greedy trader from a new game gets rich and upgrades', async () => {
  const { ev, done } = await open({});
  const r = await ev(() => {
    const st = G.state; st.tutorial = null;
    const all = Object.entries(SYSTEMS).flatMap(([sid, s]) => s.planets.map(pl => ({ sid, pl })));
    const cap = () => SHIPS[st.shipId].cargo, tank = () => SHIPS[st.shipId].fuel;
    const legs = (a, credits, fuel) => all.filter(b => b.sid !== a.sid && burnFuel(a.sid, b.sid) <= fuel).map(b => {
      const lot = {}; let spent = 0, gain = 0;
      for (let room = cap(); room > 0;) {
        const q = Math.min(10, room); let best = null;
        for (const c of COMMODITIES) {
          if (!price(a.pl, c.id) || !price(b.pl, c.id)) continue;
          const q0 = lot[c.id] || 0;
          const buy = tradeTotal(a.pl, c.id, q0 + q, 1) - tradeTotal(a.pl, c.id, q0, 1);
          const m = tradeTotal(b.pl, c.id, q0 + q, -1) - tradeTotal(b.pl, c.id, q0, -1) - buy;
          if (spent + buy <= credits && m > 0 && (!best || m > best.m)) best = { c: c.id, m, buy };
        }
        if (!best) break;
        lot[best.c] = (lot[best.c] || 0) + q; spent += best.buy; gain += best.m; room -= q;
      }
      const f = burnFuel(a.sid, b.sid);
      return { b, lot, fuel: f, days: travelDays(a.sid, b.sid), profit: gain - f * FUEL_PRICE };
    });
    const ships = [];
    while (st.day < 300) {
      const a = all.find(x => x.sid === st.systemId && x.pl.name === st.planet);
      if (a.pl.services.includes('refuel')) { st.credits -= (tank() - st.fuel) * FUEL_PRICE; st.fuel = tank(); }
      const opts = legs(a, st.credits, st.fuel);
      if (!opts.length) break;
      const best = opts.reduce((m, x) => (x.profit / x.days > m.profit / m.days ? x : m));
      for (const [c, q] of Object.entries(best.lot)) { st.credits -= tradeTotal(a.pl, c, q, 1); recordTrade(a.pl, c, q, 1); }
      st.fuel -= best.fuel;
      for (let i = 0; i < best.days; i++) { st.day++; Mods.emit('newDay', st.day); }
      st.systemId = best.b.sid; st.planet = best.b.pl.name;
      for (const [c, q] of Object.entries(best.lot)) { st.credits += tradeTotal(best.b.pl, c, q, -1); recordTrade(best.b.pl, c, q, -1); }
      if (best.b.pl.services.includes('shipyard')) for (const id of ['lightfreighter', 'freighter']) {
        const cost = SHIPS[id].price - Math.round(SHIPS[st.shipId].price * 0.6);
        if (SHIPS[id].cargo > cap() && st.credits - cost > 10000) { st.credits -= cost; st.shipId = id; st.fuel = tank(); ships.push(`${id} day ${st.day}`); }
      }
    }
    return { day: st.day, credits: Math.round(st.credits), ship: st.shipId, ships };
  });
  assert.ok(r.day >= 300, 'never stranded');
  assert.ok(r.ships.length >= 1, 'upgraded at least once');
  assert.ok(r.credits > 50000, `made money (${r.credits})`);
  await done();
});

test('money never goes negative or NaN: broke escorts stay behind, empty sells do nothing', async () => {
  const { ev, done } = await open({});
  const r = await ev(() => {
    const st = G.state; st.tutorial = null; while (G.dialog) finishEvent();
    st.credits = 300000; buyCompanyShip('gunship'); Mods.act('cescort', '0');
    st.credits = 10;
    takeOff(); st.dest = 'mars'; G.player.x = 6000; G.player.y = 0; tryBurn();
    const afterBurn = st.credits, stayed = !fleet()[0].escort;
    G.mode = 'landed'; G.transit = null; landAt(currentPlanet(), []); while (G.dialog) finishEvent();
    UI.act('sellall', 'food'); UI.act('sell', 'food');
    return { afterBurn, stayed, credits: st.credits };
  });
  assert.equal(r.afterBurn, 10);
  assert.ok(r.stayed, 'the escort waits at port');
  assert.equal(r.credits, 10);
  await done();
});
