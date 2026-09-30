'use strict';

// The hired-hand start: sign on to a captain's ship, work one post, and leave the owner's
// business (cargo, contracts, the yard, hiring) to the captain.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

test('new game offers a hired start, and the choice of post', async () => {
  const { page, ev, done } = await open({ title: true });
  await page.click('[data-action=menuView][data-arg=new]');
  assert.equal(await page.$$eval('[data-action=menuMode]', b => b.length), 2);
  assert.ok(await page.$('#ngShip'), 'an owner names their ship');
  await page.fill('#ngCaptain', 'Ines Okafor');
  await page.click('[data-action=menuMode][data-arg=hired]');
  assert.equal(await page.$('#ngShip'), null, 'a hired hand does not');
  assert.equal(await page.$$eval('[data-action=menuPost]', b => b.map(x => x.textContent).join(',')), 'Pilot,Gunner,Engineer,Comms');
  assert.equal(await page.$eval('#ngCaptain', e => e.value), 'Ines Okafor', 'what you typed is kept');
  await page.click('[data-action=menuPost][data-arg=gunner]');
  await page.click('[data-action=menuStart]');
  const r = await ev(() => {
    const st = G.state, cap = st.people[st.hired.captain];
    return {
      post: st.hired.post, credits: st.credits, ship: st.shipId, captain: !!cap && cap.role === 'captain',
      roles: st.crew.map(id => person(id).role).sort(), modes: Object.keys(POSTS).map(p => postMode(p)),
      tutorial: st.tutorial, mode: G.mode, intro: UI.notes.join(' '),
    };
  });
  assert.equal(r.post, 'gunner'); assert.equal(r.credits, 300); assert.equal(r.ship, 'lightfreighter'); assert.ok(r.captain);
  assert.deepEqual(r.roles, ['engineer', 'pilot', 'slicer'], 'the crew fill every role but yours');
  assert.deepEqual(r.modes, ['crewed', 'manual', 'crewed', 'crewed'], 'pilot, gunner, engineer, comms: your post is the manual one');
  assert.equal(r.tutorial, null); assert.equal(r.mode, 'landed');
  assert.match(r.intro, /signed on to the/);
  assert.match(r.intro, /gunner/);
  await done();
});

test('hired: the captain\'s business is not yours', async () => {
  const { page, ev, done } = await open({ title: true });
  await page.click('[data-action=menuView][data-arg=new]');
  await page.click('[data-action=menuMode][data-arg=hired]');
  await page.click('[data-action=menuStart]');
  await ev(() => { while (G.dialog) finishEvent(); G.state.tutorial = null; UI.render(); });
  // Ops tabs: the port, the bar; not the exchange, contracts or the company.
  const tabs = await page.$$eval('.tabs.sub button', bs => bs.map(b => [b.dataset.arg, b.disabled]));
  for (const [id, off] of tabs) assert.equal(off, ['trade', 'missions', 'company'].includes(id), `${id} ${off ? 'is off' : 'is on'}`);
  // No refuel button, no yard table, no hiring.
  assert.equal(await page.$('[data-action=refuel]'), null);
  await page.click('[data-action=station][data-arg=eng]');
  assert.equal(await page.$('[data-action=buyship]'), null); assert.equal(await page.$('[data-action=overhaul]'), null);
  assert.match(await page.innerText('#panel'), /yard deals with the captain/);
  await page.click('[data-action=station][data-arg=interior]');
  assert.equal(await page.$('[data-action=hire]'), null); assert.equal(await page.$('[data-action=dismiss]'), null);
  assert.equal(await page.$$eval('#panel h3', h => h.some(x => /Looking for work/.test(x.textContent))), false);
  // The actions themselves are refused, and the crew are not yours to pay.
  const r = await ev(() => {
    const st = G.state; st.cargo = {}; const before = { credits: st.credits, cargo: JSON.stringify(st.cargo), crew: st.crew.length };
    UI.act('buy', 'water'); UI.act('buymax', 'water'); UI.act('buyship', 'freighter'); UI.act('dismiss', '0'); UI.act('repair');
    st.fuel = 10; Mods.emit('landed', currentPlanet()); const fuel = st.fuel;
    payCrew(30);
    return { same: before.credits === st.credits && before.cargo === JSON.stringify(st.cargo) && before.crew === st.crew.length, fuel, full: ship().fuel, credits: st.credits };
  });
  assert.ok(r.same, 'nothing was bought, sold or dismissed, and the crew were not paid by you');
  assert.equal(r.fuel, r.full, 'the captain tops her up');
  assert.equal(r.credits, 300);
  // The ship still flies: a burn and an arrival with a hired crew raise no errors.
  await ev(() => { uatBurn('Ceres Station', 'pallas'); G.transit.times = []; G.transit.left = 1; for (let i = 0; i < 5 && G.mode === 'transit'; i++) { G.transit.event = null; update(1); Mods.emit('frame', 1); } });
  assert.notEqual(await ev(() => G.mode), 'transit', 'she arrived');
  assert.equal(await ev(() => G.state.credits), 300, 'and the crew were still not paid by you');
  await done();
});

test('hired: a save keeps it, and an owner game is unchanged', async () => {
  const { ev, done } = await open();
  const r = await ev(() => {
    // An owner: the tabs are on, crew are paid, hired() is null.
    const owner = { hired: hired(), trade: tabReady(currentPlanet(), 'trade'), paid: (() => { const st = G.state; st.crew = []; { const c = makeCrewCandidate('earth'); c.role = 'pilot'; registerPerson(c); st.crew.push(c.id); } const c0 = st.credits; payCrew(10); return c0 - st.credits; })() };
    // A hired start, saved and loaded.
    startGame({ slot: 1, background: 'belt', captain: 'Ines Okafor', mode: 'hired', post: 'engineer' });
    const st = G.state, cap = st.hired.captain;
    save(); loadSlot(1);
    return { owner, loaded: { post: G.state.hired.post, captain: G.state.hired.captain === cap, known: !!G.state.people[G.state.hired.captain], credits: G.state.credits } };
  });
  assert.equal(r.owner.hired, null); assert.equal(r.owner.trade, true); assert.ok(r.owner.paid > 0, 'an owner pays the crew');
  assert.deepEqual(r.loaded, { post: 'engineer', captain: true, known: true, credits: 300 });
  await done();
});

// Installed in the page: a hired game at Earth, on a given post, with nothing in the way.
const hiredHelpers = () => { window.startHired = (post = 'gunner') => { startGame({ slot: 1, background: 'earth', captain: 'Ines Okafor', mode: 'hired', post }); while (G.dialog) finishEvent(); G.state.flags.classicCombat = true; G.state.story.next = 1e9; }; };

test('the captain plans a run: the best cargo within reach, paid for from the ship\'s funds', async () => {
  const { page, ev, done } = await open();
  await ev(hiredHelpers);
  const r = await ev(() => {
    startHired(); const st = G.state, h = st.hired;
    const plan = planRun(), here = currentPlanet();
    const sell = plan && price(Object.values(SYSTEMS).find((_, i) => Object.keys(SYSTEMS)[i] === plan.sid).planets.find(p => p.name === plan.planet), plan.good);
    // With no money there is no cargo; she runs light.
    h.fund = 0; h.plan = null; const broke = planRun();
    return { plan, fits: plan.tons <= ship().cargo && plan.cost <= HIRED_FUND, buy: plan.good && price(here, plan.good), sell, broke, days: plan.days, here: st.systemId };
  });
  assert.ok(r.plan.profit > 0 && !r.plan.ballast, 'a profitable cargo');
  assert.ok(r.fits, 'that fits the hold and the purse');
  assert.ok(r.sell > r.buy, 'and sells for more than it cost');
  assert.notEqual(r.plan.sid, r.here);
  assert.equal(r.broke.ballast, true, 'no money, no cargo: she runs light');
  await ev(() => { startHired(); UI.render(); });
  assert.match(await page.innerText('#panel'), /The captain will buy \d+t of .* here for/);
  assert.match(await page.innerText('.dock'), /Sail with the captain/);
  assert.equal(await page.$('[data-action=takeoff]'), null, 'she sails when the captain says');
  await done();
});

test('a run, end to end: sail, burn, come in, sell, and be paid a wage and a share', async () => {
  const { ev, done } = await open();
  await ev(hiredHelpers);
  const r = await ev(() => {
    startHired('engineer'); const st = G.state, h = st.hired, out = {};
    const plan = currentPlan(), fund0 = h.fund, credits0 = st.credits;
    out.sailed = sail();
    out.loaded = { tons: st.cargo[plan.good], fund: fund0 - h.fund === plan.cost, dest: st.dest === plan.sid, auto: G.auto && G.auto.kind, mode: G.mode };
    // Fly: out to clear space, then the burn, then the pilot brings her in to the planet the captain chose.
    let steps = 0;
    while (G.mode !== 'landed' && steps++ < 20000) {
      if (G.mode === 'transit' && G.transit && !G.transit.interceptPlanned) { G.transit.times = []; G.transit.interceptPlanned = true; }
      if (G.dialog) { while (G.dialog) finishEvent(); }
      G.npcs = []; G.spawnTimer = 99;
      update(G.mode === 'transit' ? 1 : 1 / 30); Mods.emit('frame', G.mode === 'transit' ? 1 : 1 / 30);
    }
    const e = h.ledger[0];
    out.settled = { mode: G.mode, planet: st.planet, matches: st.planet === plan.planet, run: h.run, cargo: Object.keys(st.cargo).length, entry: e && { tons: e.tons, profit: e.profit, revenue: e.revenue - e.cost === e.profit, wage: e.wage > 0 } };
    out.paid = { credits: st.credits - credits0, equals: e && st.credits - credits0 === e.wage + e.share, share: e && e.share === Math.round(Math.max(0, e.profit) * h.share), fund: e && h.fund === fund0 - e.cost + e.revenue };
    out.note = UI.notes.join(' ');
    return out;
  });
  assert.equal(r.sailed, true);
  assert.ok(r.loaded.tons > 0 && r.loaded.fund && r.loaded.dest, 'the cargo is aboard and paid for');
  assert.equal(r.loaded.auto, 'out', 'a crewed pilot flew her out'); assert.equal(r.loaded.mode, 'flight');
  assert.deepEqual([r.settled.mode, r.settled.matches, r.settled.run, r.settled.cargo], ['landed', true, null, 0], 'she docked where the captain said and sold it all');
  assert.ok(r.settled.entry.tons > 0 && r.settled.entry.wage);
  assert.ok(r.paid.equals && r.paid.share && r.paid.fund, `the books add up (${JSON.stringify(r.paid)})`);
  assert.match(r.note, /The captain sold \d+t of .* Your pay: [\d,]+ cr wage/);
  await ev(() => UI.render());
  await done();
});

test('the captain sails again from where she landed, and a manual pilot flies her out himself', async () => {
  const { ev, done } = await open();
  await ev(hiredHelpers);
  const r = await ev(() => {
    startHired('pilot'); const st = G.state, h = st.hired, out = {};
    const plan = currentPlan(); out.manual = postMode('pilot');
    sail();  // you are the pilot: she takes off, and you fly
    out.flight = { mode: G.mode, auto: G.auto, dest: st.dest === plan.sid };
    // A run that ends somewhere else leaves cargo aboard; the next plan sells it.
    G.mode = 'landed'; st.systemId = 'mars'; st.planet = 'Mars'; h.run = null; h.plan = null;
    landAt(currentPlanet(), []); while (G.dialog) finishEvent();
    const again = planRun();
    out.again = { loaded: again.loaded, tons: again.tons, good: again.good === plan.good };
    return out;
  });
  assert.equal(r.manual, 'manual');
  assert.deepEqual(r.flight, { mode: 'flight', auto: null, dest: true });
  assert.ok(r.again.loaded && r.again.tons > 0 && r.again.good, 'cargo still aboard is sold before any new one is bought');
  await done();
});
