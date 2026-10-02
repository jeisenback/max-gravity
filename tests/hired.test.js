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
  assert.equal(r.post, 'gunner'); assert.equal(r.credits, 300); assert.equal(r.ship, 'freighter'); assert.ok(r.captain);
  assert.deepEqual(r.roles, ['cook', 'engineer', 'icehand', 'icehand', 'medic', 'pilot', 'quartermaster', 'slicer', 'xo'], 'the crew fill every role but yours, and the chapter\'s wider crew');
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
  // Ops tabs: the port, errands, the bar; not the exchange or the company.
  const tabs = await page.$$eval('.tabs.sub button', bs => bs.map(b => [b.dataset.arg, b.disabled]));
  for (const [id, off] of tabs) assert.equal(off, ['trade', 'company'].includes(id), `${id} ${off ? 'is off' : 'is on'}`);
  // No refuel button, no yard table, no hiring.
  assert.equal(await page.$('[data-action=refuel]'), null);
  await page.click('[data-action=station][data-arg=eng]');
  assert.equal(await page.$('[data-action=buyship]'), null); assert.equal(await page.$('[data-action=overhaul]'), null);
  assert.match(await page.innerText('#panel'), /a ship of your own/i);
  assert.equal(await page.$eval('[data-action=buyInAsk]', b => b.disabled), true, 'and you cannot afford one yet');
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

test('errands: small jobs for where she is going, paid less, with a cut to the captain', async () => {
  const { page, ev, done } = await open();
  await ev(hiredHelpers);
  const r = await ev(() => {
    startHired('engineer'); const st = G.state, plan = currentPlan(); Mods.emit('landed', currentPlanet());
    const offers = G.offers.map(o => ({ type: o.type, dest: o.destPlanet, sys: o.destSystem, pay: o.pay, cut: o.cut, tons: o.tons || 0, pax: o.pax || 0 }));
    // Owner games keep their contracts.
    return { plan: { planet: plan.planet, sid: plan.sid }, offers };
  });
  assert.ok(r.offers.length >= 1 && r.offers.length <= 3);
  for (const o of r.offers) {
    assert.equal(o.type, 'errand'); assert.equal(o.dest, r.plan.planet); assert.equal(o.sys, r.plan.sid);
    assert.equal(o.tons + o.pax, 0, 'no cargo space, no berth');
    assert.equal(Math.round(o.cut / (o.pay + o.cut) * 100), 20, 'the captain keeps a fifth');
  }
  await ev(() => UI.render());
  await page.click('[data-action=station][data-arg=ops]');
  await page.click('[data-action=tab][data-arg=missions]');
  assert.match(await page.innerText('#panel'), /Errand: carry/);
  await page.click('[data-action=accept][data-arg="0"]');
  assert.equal(await ev(() => G.state.missions.length), 1, 'taken');
  const owner = await ev(() => { startGame({ slot: 1, background: 'earth', captain: 'Ines' }); while (G.dialog) finishEvent(); return G.offers.every(o => o.type !== 'errand'); });
  assert.ok(owner, 'an owner sees contracts, not errands');
  await done();
});

test('errands: delivered when she docks, the fee to you and the cut to the ship', async () => {
  const { ev, done } = await open();
  await ev(hiredHelpers);
  const r = await ev(() => {
    startHired('engineer'); const st = G.state, h = st.hired, plan = currentPlan();
    Mods.emit('landed', currentPlanet());
    const errand = G.offers.splice(0, 1)[0]; errand.id = st.nextId++; st.missions.push(errand);
    const credits0 = st.credits; sail();
    let steps = 0;
    while (G.mode !== 'landed' && steps++ < 20000) {
      if (G.mode === 'transit' && G.transit && !G.transit.interceptPlanned) { G.transit.times = []; G.transit.interceptPlanned = true; }
      while (G.dialog) finishEvent();
      G.npcs = []; G.spawnTimer = 99;
      update(G.mode === 'transit' ? 1 : 1 / 30); Mods.emit('frame', G.mode === 'transit' ? 1 : 1 / 30);
    }
    const e = h.ledger[0];
    return { planet: st.planet === plan.planet, left: st.missions.length, earned: st.credits - credits0, runPay: e.wage + e.share, fee: errand.pay, cut: errand.cut, fund: h.fund, expectFund: HIRED_FUND - e.cost + e.revenue + errand.cut };
  });
  assert.ok(r.planet); assert.equal(r.left, 0, 'the errand is done');
  assert.equal(r.earned, r.runPay + r.fee, 'you got your pay for the run and the errand fee');
  assert.equal(r.fund, r.expectFund, 'and the captain got the cut');
  await done();
});

test('posts: your own work teaches you, it is kept, and it improves your odds', async () => {
  const { ev, done } = await open();
  await ev(hiredHelpers);
  const r = await ev(() => {
    startHired('engineer'); const st = G.state, h = st.hired, out = {};
    out.start = { level: skillLevel('engineer'), xp: skillXp('engineer'), other: skillLevel('pilot'), odds: soloOdds('engineer'), otherOdds: soloOdds('pilot') };
    gainSkill('engineer', 30); out.after = { level: skillLevel('engineer'), odds: soloOdds('engineer') };
    // Orders, projects and programs you do yourself teach; a crew member's do not.
    const x0 = skillXp('engineer'); Settings.wear = 'off'; st.armor = 1; st.crew = st.crew.filter(id => person(id).role !== 'engineer');
    postState('engineer').busy = false; giveOrder('engineer', 'patch'); out.order = skillXp('engineer') - x0;
    // A run worked: experience for your post, and the captain's regard.
    const cap = st.people[h.captain], op0 = cap.opinion, x1 = skillXp('engineer');
    h.run = { planet: currentPlanet().name, sid: st.systemId, good: null, tons: 0, cost: 0, day: st.day, from: 'Earth' };
    st.day += 3; settleRun(currentPlanet());
    out.run = { xp: skillXp('engineer') - x1, opinion: cap.opinion - op0 };
    // An owner is unaffected.
    startGame({ slot: 1, background: 'earth', captain: 'Ines' }); while (G.dialog) finishEvent();
    out.owner = { odds: orderOdds('engineer'), skill: skillLevel('engineer') };
    return out;
  });
  assert.deepEqual(r.start, { level: 1, xp: 10, other: -1 + 1, odds: 0.55, otherOdds: 0.45 });
  assert.deepEqual(r.after, { level: 2, odds: 0.65 });
  assert.equal(r.order, 1, 'your own order teaches you a little');
  assert.equal(r.run.xp, 2, 'a burn worked teaches you more'); assert.equal(r.run.opinion, -1, 'a run that made nothing costs you the captain\'s regard');
  assert.deepEqual(r.owner, { odds: 0.45, skill: -1 + 1 }, 'an owner\'s solo odds are the old ones');
  await done();
});

test('posts: you can ask the captain to move you, and they decide', async () => {
  const { page, ev, done } = await open();
  await ev(hiredHelpers);
  await ev(() => { startHired('gunner'); G.state.tutorial = null; UI.render(); });
  await page.click('[data-action=station][data-arg=interior]');
  assert.match(await page.innerText('#panel'), /your posts/i);
  assert.equal(await page.$$eval('[data-action=swapPost]', b => b.length), 3, 'the three others');
  const r = await ev(() => {
    const st = G.state, h = st.hired, out = {};
    const before = st.crew.map(id => [person(id).first, person(id).role]);
    const holder = roleHolder('engineer'), holderSkill = holder.skill;
    // They say no: nothing changes, and it cannot be asked again today.
    const real = Math.random; Math.random = () => 0.99; askSwap('engineer'); Math.random = real;
    out.no = { post: h.post, asked: h.asked === st.day, note: UI.notes.join(' ') };
    askSwap('engineer'); out.again = h.post;
    // The next day they say yes: the roles change places, and your experience stays.
    h.asked = -1; gainSkill('engineer', 12);
    Math.random = () => 0; askSwap('engineer'); Math.random = real;
    out.yes = { post: h.post, modes: Object.keys(POSTS).map(p => postMode(p)), holderRole: holder.role, holderSkill: holder.skill, was: holderSkill, gunnerHeld: roleHolder('gunner') === holder, gunnerXp: skillXp('gunner') };
    out.odds = { low: swapOdds('pilot'), more: (bossFor('swap').opinion += 3, swapOdds('pilot')) };
    return out;
  });
  assert.equal(r.no.post, 'gunner'); assert.ok(r.no.asked); assert.match(r.no.note, /Not yet/);
  assert.equal(r.again, 'gunner', 'one request a day');
  assert.equal(r.yes.post, 'engineer');
  assert.deepEqual(r.yes.modes, ['crewed', 'crewed', 'manual', 'crewed'], 'pilot, gunner, engineer, comms: the engineer post is now yours');
  assert.equal(r.yes.holderRole, 'gunner'); assert.ok(r.yes.gunnerHeld, 'the engineer took the gun post');
  assert.equal(r.yes.holderSkill, Math.max(1, r.yes.was - 1), 'and is a little rusty at it');
  assert.equal(r.yes.gunnerXp, 10, 'what you learned at the gun post stays with you');
  assert.ok(r.odds.more > r.odds.low, 'whoever decides is likelier to say yes once they trust you');
  await done();
});

test('buying in: a ship of your own, one friend, and the captain as a contact', async () => {
  const { page, ev, done } = await open();
  await ev(hiredHelpers);
  await ev(() => { startHired('pilot'); const st = G.state; st.tutorial = null; st.credits = 12000; st.cargo = { water: 5 }; st.paid = { water: 100 };
    const crew = st.crew.map(person); crew[0].opinion = 4; crew[1].opinion = 1; crew[2].opinion = -2; window.friendId = crew[0].id; window.otherIds = [crew[1].id, crew[2].id];
    UI.render(); });
  await page.click('[data-action=station][data-arg=eng]');
  const price = await ev(() => SHIPS.shuttle.price);
  assert.equal(await page.$$eval('[data-action=buyInAsk]:not([disabled])', b => b.length), 1, 'only the ship you can afford');
  await page.click('[data-action=buyInAsk]:not([disabled])');
  assert.match(await page.innerText('#panel'), /would come with you/);
  await page.click('[data-action=buyInNo]');
  assert.ok(await ev(() => !!G.state.hired), 'not yet is not yet');
  await page.click('[data-action=buyInAsk]:not([disabled])');
  await page.click('[data-action=buyInGo]');
  const r = await ev(() => {
    const st = G.state, cap = Object.values(st.people).find(p => p.role === 'captain');
    return {
      hired: st.hired, ship: st.shipId, credits: st.credits, crew: st.crew, friend: window.friendId, cargo: Object.keys(st.cargo).length,
      captain: { known: !!cap, ship: !!cap.ship, haunt: cap.haunt === st.systemId, liked: cap.opinion >= 2 }, left: window.otherIds.every(id => !st.crew.includes(id) && st.people[id].location === st.planet),
      tradeTab: tabReady(currentPlanet(), 'trade'), offers: G.offers.every(o => o.type !== 'errand'), note: UI.notes.join(' '),
      payCrew: (() => { const c0 = st.credits; payCrew(10); return c0 - st.credits; })(), posts: Object.keys(POSTS).map(p => postMode(p)),
    };
  });
  assert.equal(r.hired, null); assert.equal(r.ship, 'shuttle'); assert.equal(r.credits, 12000 - price);
  assert.deepEqual(r.crew, [r.friend], 'the friend comes, the others stay with the captain');
  assert.ok(r.left); assert.equal(r.cargo, 0, 'the hold was the captain\'s');
  assert.deepEqual(r.captain, { known: true, ship: true, haunt: true, liked: true });
  assert.ok(r.tradeTab && r.offers, 'the owner\'s business is open again');
  assert.ok(r.payCrew > 0, 'and the crew are your wages now');
  assert.match(r.note, /You bought the .* and left the/); assert.match(r.note, /came with you/);
  await done();
});

test('buying in: nobody comes if nobody likes you, and it needs the money and a yard', async () => {
  const { ev, done } = await open();
  await ev(hiredHelpers);
  const r = await ev(() => {
    startHired('engineer'); const st = G.state, out = {};
    st.crew.map(person).forEach(c => { c.opinion = 0; });
    out.friend = buyInFriend();
    out.poor = canBuyIn('shuttle', currentPlanet());
    st.credits = 50000; out.rich = canBuyIn('shuttle', currentPlanet());
    out.noYard = canBuyIn('shuttle', { services: ['trade'] });
    out.blocked = (() => { hired().confirm = 'shuttle'; buyIn('freighter'); return !!hired(); })();
    Mods.act('buyInAsk', 'shuttle'); Mods.act('buyInGo', 'shuttle');
    out.alone = { hired: G.state.hired, crew: G.state.crew.length, note: UI.notes.join(' ') };
    // An owner has nothing to buy in to.
    startGame({ slot: 1, background: 'earth', captain: 'Ines' }); while (G.dialog) finishEvent();
    G.state.credits = 99999; buyIn('courier'); out.owner = G.state.shipId;
    return out;
  });
  assert.equal(r.friend, null); assert.equal(r.poor, false); assert.equal(r.rich, true); assert.equal(r.noYard, false);
  assert.equal(r.blocked, true, 'a ship too dear for the standing, or not asked for, is not bought');
  assert.equal(r.alone.hired, null); assert.equal(r.alone.crew, 0); assert.match(r.alone.note, /on your own/);
  assert.equal(r.owner, 'shuttle', 'an owner is not affected');
  await done();
});

test('a second run buys new cargo: a plan made before the last cargo was sold is not reused', async () => {
  const { ev, done } = await open();
  await ev(hiredHelpers);
  const r = await ev(() => {
    startHired('engineer'); const st = G.state, h = st.hired;
    const fly = () => { let steps = 0; while (G.mode !== 'landed' && steps++ < 30000) { while (G.dialog) { chooseEvent(0); finishEvent(); } G.npcs = []; update(G.mode === 'transit' ? 1 : 1 / 30); Mods.emit('frame', G.mode === 'transit' ? 1 : 1 / 30); } };
    const out = {};
    currentPlan(); sail(); fly();
    // The port screen drew while the cargo was still aboard: the plan it made must not survive the sale.
    out.stale = !!h.plan; out.cargo = Object.keys(st.cargo).length;
    const plan = currentPlan(); out.loaded = !!plan.loaded;
    G.offers = []; const fund0 = h.fund; sail(); out.bought = plan.ballast || (Object.values(st.cargo)[0] || 0) > 0;
    out.paid = plan.ballast || fund0 - h.fund === h.run.cost;
    fly(); out.second = h.ledger[0];
    out.honest = plan.ballast || out.second.cost > 0;
    return out;
  });
  assert.equal(r.cargo, 0); assert.equal(r.loaded, false);
  assert.ok(r.bought && r.paid, 'the cargo was bought and paid for');
  assert.ok(r.honest && r.second.revenue > 0, 'and sold, so the run is not a loss of cargo nobody carried');
  await done();
});

test('once you can afford a ship, the captain heads for a port with a yard', async () => {
  const { ev, done } = await open();
  await ev(hiredHelpers);
  const r = await ev(() => {
    startHired('engineer'); const st = G.state, h = st.hired, out = {};
    out.yardsInReach = Object.entries(SYSTEMS).filter(([sid]) => sid !== st.systemId && inRange(st.systemId, sid)).some(([, s]) => s.planets.some(p => p.services.includes('shipyard') && p.services.includes('trade')));
    st.credits = 20000; h.plan = null; const rich = currentPlan();
    out.rich = { yard: rich.yard, planet: rich.planet };
    st.credits = 300; h.plan = null; const poor = currentPlan();
    out.poorIsNotForced = poor !== null;
    return out;
  });
  assert.ok(r.yardsInReach, 'there is a yard to head for');
  assert.ok(r.rich.yard, `she heads for a yard (${r.rich.planet})`);
  assert.ok(r.poorIsNotForced);
  await done();
});

test('a hired hand is offered only what is theirs: their own post, and no owner\'s business', async () => {
  const { page, ev, done } = await open();
  await ev(hiredHelpers);
  const FORBIDDEN = ['sbuy', 'hire', 'dismiss', 'renameShip', 'handBack', 'programWrite', 'programSlot', 'programPick', 'programRemove', 'routeDock', 'takeoff', 'buy', 'sell'];
  const problems = [];
  for (const post of ['pilot', 'gunner', 'engineer', 'comms']) {
    await ev(p => { startHired(p); G.state.tutorial = null; G.state.credits = 50000; UI.render(); }, post);
    for (const station of ['nav', 'weapons', 'eng', 'interior', 'comms', 'ops']) {
      for (const tab of station === 'ops' ? ['port', 'bar', 'missions'] : [null]) {
        await ev(([s, t]) => { UI.tab = t || bridgeStation(s, currentPlanet()); UI.render(); }, [station, tab]);
        const found = await page.evaluate(() => [...document.querySelectorAll('#panel .body button, #panel .post button')].filter(b => !b.disabled).map(b => [b.dataset.action, b.dataset.arg || '']));
        for (const [a, arg] of found) {
          if (FORBIDDEN.includes(a)) problems.push(`${post}/${station}${tab ? '/' + tab : ''}: ${a}`);
          if (a === 'takeControl') problems.push(`${post}/${station}: take controls`);
          if ((a === 'postOrder' || a === 'project') && !(arg.split(':')[0] === post || (a === 'project' && ({ patch: 'engineer', tune: 'engineer', refit: 'gunner' })[arg] === post))) problems.push(`${post}/${station}: ${a} ${arg} is not their post`);
        }
      }
    }
  }
  assert.deepEqual(problems, []);
  // The pilot's orders: none (departing is the captain's: she sails when you say), and the nav page shows the run, not a course.
  await ev(() => { startHired('pilot'); G.state.tutorial = null; UI.tab = 'nav'; UI.render(); });
  assert.match(await page.innerText('#panel'), /captain picks where she goes/i);
  assert.equal(await page.$('[data-action=map]:not(.dock *)'), null, 'no course to plot');
  // Commands on a post that is not yours do nothing, and the map does not set a course.
  const r = await ev(() => {
    startHired('pilot'); const st = G.state; st.crew.map(person).forEach(c => { c.opinion = 0; });
    const before = JSON.stringify(postState('engineer'));
    takeControl('engineer'); const note = giveOrder('engineer', 'patch'); const proj = (st.cargo.industrial = 5, startProject('patch')); const prog = writeProgram('heat', 'engineer', 'balance');
    st.dest = null; G.mode = 'map'; G.mapPos = id => [100, 100]; const ev0 = { clientX: 100, clientY: 100 };
    const out = { took: postMode('engineer'), note, proj, prog, before: before === JSON.stringify(postState('engineer')) };
    return out;
  });
  assert.deepEqual(r, { took: 'crewed', note: null, proj: false, prog: false, before: true });
  await done();
});

test('downtime for a hired hand: not the captain\'s drills, and a chance to practise your post', async () => {
  const { ev, done } = await open();
  await ev(hiredHelpers);
  const r = await ev(() => {
    const labels = () => { G.transit.lifeUsed = {}; return downtimeEvent(true).choices.map(c => c.label); };
    startHired('engineer'); const st = G.state; st.tutorial = null; st.armor = 10;
    uatBurn('Ceres Station', 'pallas'); G.transit.times = [];
    const eng = labels(), engText = downtimeEvent(true).text;
    const x0 = skillXp('engineer'); const prac = downtimeEvent(true).choices.find(c => c.label === 'Practise at your post'); const said = prac.run(); const gained = skillXp('engineer') - x0;
    startHired('pilot'); G.state.armor = 10; uatBurn('Ceres Station', 'pallas'); G.transit.times = [];
    const pilot = labels();
    startGame({ slot: 1, background: 'earth', captain: 'Ines' }); while (G.dialog) finishEvent(); G.state.armor = 10; uatBurn('Ceres Station', 'pallas'); G.transit.times = [];
    const owner = labels(), ownerText = downtimeEvent(true).text;
    return { eng, engText, gained, said, pilot, owner, ownerText };
  });
  assert.ok(!r.eng.includes('Run drills') && !r.eng.includes('Check on passengers'), 'the drills and the rounds of the berths are the captain\'s');
  assert.ok(r.eng.includes('Practise at your post') && r.eng.includes('Maintenance'), 'an engineer keeps the hull');
  assert.ok(!r.pilot.includes('Maintenance') && r.pilot.includes('Practise at your post'), 'a pilot does not');
  assert.match(r.engText, /What do you do/); assert.equal(r.gained, 3); assert.match(r.said, /engineer post/);
  assert.ok(r.owner.includes('Run drills') && !r.owner.includes('Practise at your post'), 'an owner is unchanged');
  assert.match(r.ownerText, /What does the ship do/);
  await done();
});

test('burn events for a hired hand: the captain takes the ship\'s calls, with the ship\'s money', async () => {
  const { ev, done } = await open();
  await ev(hiredHelpers);
  const r = await ev(() => {
    startHired('pilot'); const st = G.state; st.tutorial = null; st.flags.classicCombat = false; st.armor = ship().armor;
    uatBurn('Ceres Station', 'pallas'); G.transit.times = []; const t = G.transit, h = st.hired;
    const distress = TRANSIT_EVENTS.find(e => e.title === 'Distress Call'), coolant = TRANSIT_EVENTS.find(e => e.title === 'Coolant Leak');
    const out = { shown: null, mine: [], yours: null };
    h.fund = 20000;
    let fundMoved = false, minePaid = 0;
    for (let i = 0; i < 60; i++) {
      G.dialog = null; t.event = null; G.nextEvent = null; const f0 = h.fund, c0 = st.credits;
      openEvent(distress);
      if (i === 0) out.shown = { labels: G.dialog.choices.map(c => c.label), text: G.dialog.event.text.slice(-120), decided: !!G.dialog.event.decided };
      chooseEvent(0); finishEvent();
      for (let n = 0; G.dialog && n < 4; n++) { chooseEvent(0); finishEvent(); }  // the owner's offer, or the raiders: the captain's call too
      minePaid += st.credits - c0; fundMoved = fundMoved || h.fund !== f0;
    }
    out.mine = { minePaid, fundMoved };
    // The contact: the captain answers, and pays from the ship's purse.
    h.fund = 20000; let contactMine = 0;
    for (let i = 0; i < 40; i++) { G.dialog = null; t.event = null; G.nextEvent = null; G.duel = null; const c0 = st.credits; st.armor = ship().armor; openEvent(contactEvent({ kind: 'pirate' })); const e = G.dialog.event; chooseEvent(0); finishEvent(); for (let n = 0; G.dialog && n < 30; n++) { chooseEvent(0); finishEvent(); } contactMine += st.credits - c0; if (i === 0) out.contact = { decided: e.decided, labels: e.choices.map(c => c.label) }; }
    out.contactMine = contactMine; out.contactFund = h.fund !== 20000;
    // Your own post's event is yours; another post's is the captain's.
    G.dialog = null; t.event = null; openEvent(coolant); out.coolantPilot = { decided: !!G.dialog.event.decided, n: G.dialog.choices.length };
    st.hired.post = 'engineer'; G.dialog = null; t.event = null; openEvent(coolant); out.coolantEngineer = { decided: !!G.dialog.event.decided, n: G.dialog.choices.length };
    return out;
  });
  assert.deepEqual(r.shown.labels, ['See how it goes']); assert.match(r.shown.text, /takes the call/); assert.ok(r.shown.decided);
  assert.equal(r.mine.minePaid, 0, 'none of it came out of, or went into, your savings'); assert.ok(r.mine.fundMoved, 'it was the ship\'s money');
  assert.ok(r.contact.decided); assert.equal(r.contactMine, 0); assert.ok(r.contactFund, 'a fight and a bounty or a fine, in the ship\'s purse');
  assert.deepEqual(r.coolantPilot, { decided: true, n: 1 }, 'the engineer\'s leak is not the pilot\'s to decide');
  assert.equal(r.coolantEngineer.decided, false, 'but it is yours when you are the engineer'); assert.ok(r.coolantEngineer.n >= 2);
  await done();
});

test('a hired hand who is not the gunner watches the duel; the gunner picks the cards', async () => {
  const { ev, done } = await open();
  await ev(hiredHelpers);
  const r = await ev(() => {
    const run = post => {
      startHired(post); const st = G.state; st.tutorial = null; st.flags.classicCombat = false; st.armor = ship().armor;
      uatBurn('Ceres Station', 'pallas'); G.transit.times = []; G.dialog = null; G.transit.event = null; G.nextEvent = null; G.duel = null;
      const c0 = st.credits; startDuel({ kind: 'pirate' }, false); finishEvent2();
      const first = G.nextEvent; const labels = first.choices.map(c => c.label); let rounds = 0;
      openEvent(first);
      while ((G.dialog || G.nextEvent) && rounds++ < 20) { if (!G.dialog) { finishEvent(); continue; } chooseEvent(0); finishEvent(); }
      return { labels, ended: G.duel === null, credits: st.credits === c0 };
    };
    window.finishEvent2 = () => {};
    return { pilot: run('pilot'), gunner: run('gunner') };
  });
  assert.deepEqual(r.pilot.labels, ['Hold on'], 'the gunner plays it for you');
  assert.ok(r.gunner.labels.length >= 1 && !r.gunner.labels.includes('Hold on'), 'as the gunner you pick the card');
  assert.ok(r.pilot.ended && r.gunner.ended); assert.ok(r.pilot.credits && r.gunner.credits, 'and your savings are not in it');
  await done();
});

test('at the bar a hand cannot offer passage, because the berths are the captain\'s', async () => {
  const { ev, done } = await open();
  await ev(hiredHelpers);
  const r = await ev(() => {
    const talk = () => { const p = makePerson('earth'); p.goal = 'home'; p.traits = ['pious', 'kind']; registerPerson(p); return talkEvent({ p, known: false }).choices.map(c => c.label); };
    startHired(); const hand = talk();
    startGame({ slot: 1, background: 'earth', captain: 'Ines Okafor' }); while (G.dialog) finishEvent(); G.state.tutorial = null;
    return { hand, owner: talk() };
  });
  assert.ok(!r.hand.some(l => /passage/i.test(l)), `a hand has no passage to offer (${r.hand})`);
  assert.ok(r.owner.some(l => /passage/i.test(l)), 'an owner still does');
  assert.ok(r.hand.includes('Ask for a blessing on the ship') && r.owner.includes('Ask for a blessing on your ship'), 'and the ship is not theirs to bless as theirs');
  await done();
});
