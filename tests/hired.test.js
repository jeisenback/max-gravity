'use strict';

// The hired-hand start: sign on to a captain's ship, work one post, and leave the owner's
// business (cargo, contracts, the yard, hiring) to the captain.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser, goTo } = require('./helpers');

after(closeBrowser);

test('new game offers a hired start, and the choice of post', async () => {
  const { page, ev, done } = await open({ scope: 'full', title: true });
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
      tutorial: st.tutorial, mode: G.mode, intro: UI.notes.join(' '), scene: G.dialog ? { title: G.dialog.event.title, text: G.dialog.event.text } : null,
    };
  });
  assert.equal(r.post, 'gunner'); assert.equal(r.credits, 3000); assert.equal(r.ship, 'freighter'); assert.ok(r.captain);
  assert.deepEqual(r.roles, ['cook', 'engineer', 'icehand', 'icehand', 'medic', 'pilot', 'quartermaster', 'slicer', 'xo'], 'the crew fill every role but yours, and the chapter\'s wider crew');
  assert.deepEqual(r.modes, ['crewed', 'manual', 'crewed', 'crewed'], 'pilot, gunner, engineer, comms: your post is the manual one');
  assert.equal(r.tutorial, 0, 'the first run begins'); assert.equal(r.mode, 'landed');
  assert.doesNotMatch(r.intro, /signed on to the|credits to your name|Save toward a ship|You are her/, 'the port screen does not repeat what Signing On says');
  assert.equal(r.scene.title, 'Signing On');
  assert.match(r.scene.text, /ice hauler/); assert.match(r.scene.text, /Captain/); assert.match(r.scene.text, /You have the guns/);
  assert.doesNotMatch(r.scene.text, /credits to your name|Save toward|press Sail/, 'the opening leaves the interface to the help');
  await done();
});

test('hired: the captain\'s business is not yours', async () => {
  const { page, ev, done } = await open({ scope: 'full', title: true });
  await page.click('[data-action=menuView][data-arg=new]');
  await page.click('[data-action=menuMode][data-arg=hired]');
  await page.click('[data-action=menuStart]');
  await ev(() => { while (G.dialog) finishEvent(); G.state.tutorial = null; UI.render(); });
  // The rail: the port, errands, the bar; not the exchange or the company.
  const ids = await page.$$eval('.rail [data-action=tab]', bs => bs.map(b => b.dataset.arg));
  for (const id of ['port', 'missions', 'bar']) assert.ok(ids.includes(id), `${id} is on the rail`);
  for (const id of ['trade', 'company']) assert.ok(!ids.includes(id), `${id} is not on a hired hand's rail`);
  // No refuel button, no yard table, no hiring.
  assert.equal(await page.$('[data-action=refuel]'), null);
  await goTo(page, 'shipyard');
  assert.equal(await page.$('[data-action=buyship]'), null); assert.equal(await page.$('[data-action=overhaul]'), null);
  assert.match(await page.innerText('#panel'), /a ship of your own/i);
  assert.equal(await page.$eval('[data-action=buyInAsk]', b => b.disabled), true, 'and you cannot afford one yet');
  await goTo(page, 'crew');
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
  assert.equal(r.credits, 3000);
  // The ship still flies: a burn and an arrival with a hired crew raise no errors.
  await ev(() => { uatBurn('Ceres Station', 'pallas'); G.transit.times = []; G.transit.left = 1; for (let i = 0; i < 5 && G.mode === 'transit'; i++) { G.transit.event = null; update(1); Mods.emit('frame', 1); } });
  assert.notEqual(await ev(() => G.mode), 'transit', 'she arrived');
  assert.equal(await ev(() => G.state.credits), 3000, 'and the crew were still not paid by you');
  await done();
});

test('hired: a save keeps it, and an owner game is unchanged', async () => {
  const { ev, done } = await open({});
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
  assert.deepEqual(r.loaded, { post: 'engineer', captain: true, known: true, credits: 3000 });
  await done();
});

// Installed in the page: a hired game at Earth, on a given post, with nothing in the way.
const hiredHelpers = () => { window.startHired = (post = 'gunner') => { startGame({ slot: 1, background: 'earth', captain: 'Ines Okafor', mode: 'hired', post }); while (G.dialog) finishEvent(); G.state.flags.classicCombat = true; G.state.story.next = 1e9; }; };

test('the captain plans a run: a contract from the board her hold can fill, and a light run when the board is empty', async () => {
  const { page, ev, done } = await open({});
  await ev(hiredHelpers);
  const r = await ev(() => {
    startHired(); const st = G.state, h = st.hired;
    const plan = planRun(), here = currentPlanet(), board = contractBoard(st, here);
    // An empty board: she runs light to look for work.
    h.freight = { key: `${here.name}@${st.day}`, list: [] }; h.plan = null; const empty = planRun();
    return { plan, onBoard: !!plan && board.some(c => c.planet === plan.planet && c.good === plan.good && c.pay === plan.pay), fits: !!plan && plan.tons <= ship().cargo && plan.cost === 0, empty, here: st.systemId };
  });
  assert.ok(r.plan && r.plan.contract && r.plan.profit > 0 && !r.plan.ballast, 'a contract, its pay the profit');
  assert.ok(r.onBoard, 'from the board'); assert.ok(r.fits, 'that fits the hold, and costs the ship nothing');
  assert.notEqual(r.plan.sid, r.here);
  assert.equal(r.empty.ballast, true, 'nothing on the board: she runs light');
  await ev(() => { startHired(); UI.render(); });
  assert.match(await page.innerText('#panel'), /The captain has a contract from .*: \d+t of .* to .*, due by/);
  assert.match(await page.innerText('.dock'), /Sail with the captain/);
  assert.equal(await page.$('[data-action=takeoff]'), null, 'she sails when the captain says');
  await done();
});

test('a run, end to end: sail, burn, come in, sell, and be paid a wage and a share', async () => {
  const { ev, done } = await open({});
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
    out.note = UI.notes.join(' '); out.scene = G.dialog && G.dialog.event.title;
    return out;
  });
  assert.equal(r.sailed, true);
  assert.ok(r.loaded.tons > 0 && r.loaded.fund && r.loaded.dest, 'the cargo is aboard and paid for');
  assert.equal(r.loaded.auto, 'out', 'a crewed pilot flew her out'); assert.equal(r.loaded.mode, 'flight');
  assert.deepEqual([r.settled.mode, r.settled.matches, r.settled.run, r.settled.cargo], ['landed', true, null, 0], 'she docked where the captain said and sold it all');
  assert.ok(r.settled.entry.tons > 0 && r.settled.entry.wage);
  assert.ok(r.paid.equals && r.paid.share && r.paid.fund, `the books add up (${JSON.stringify(r.paid)})`);
  assert.equal(r.scene, 'Settling Up', 'the first officer settles up on the first arrival, in place of the one-line note');
  await ev(() => UI.render());
  await done();
});

test('the captain sails again from where she landed, and a manual pilot flies her out himself', async () => {
  const { ev, done } = await open({});
  await ev(hiredHelpers);
  const r = await ev(() => {
    startHired('pilot'); const st = G.state, h = st.hired, out = {};
    const plan = currentPlan(); out.manual = postMode('pilot');
    sail();  // you are the pilot: she takes off, and you fly
    out.flight = { mode: G.mode, auto: G.auto, dest: st.dest === plan.sid };
    // A run that ends somewhere else: she plans again from there, a contract or a light run, and nothing is bought.
    G.mode = 'landed'; st.systemId = 'mars'; st.planet = 'Mars'; h.run = null; h.plan = null;
    landAt(currentPlanet(), []); while (G.dialog) finishEvent();
    const again = planRun();
    out.again = { planned: !!again && (!!again.contract || !!again.ballast), cost: again && again.cost };
    return out;
  });
  assert.equal(r.manual, 'manual');
  assert.deepEqual(r.flight, { mode: 'flight', auto: null, dest: true });
  assert.ok(r.again.planned && !r.again.cost, 'she plans again from where she landed, and buys nothing');
  await done();
});

test('errands: small jobs for where she is going, paid less, with a cut to the captain', async () => {
  const { page, ev, done } = await open({ scope: 'full' });
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
  await goTo(page, 'port');
  await page.click('[data-action=tab][data-arg=missions]');
  assert.match(await page.innerText('#panel'), /Errand: carry/);
  await page.click('[data-action=accept][data-arg="0"]');
  assert.equal(await ev(() => G.state.missions.length), 1, 'taken');
  const owner = await ev(() => { startGame({ slot: 1, background: 'earth', captain: 'Ines' }); while (G.dialog) finishEvent(); return G.offers.every(o => o.type !== 'errand'); });
  assert.ok(owner, 'an owner sees contracts, not errands');
  await done();
});

test('errands: delivered when she docks, the fee to you and the cut to the ship', async () => {
  const { ev, done } = await open({ scope: 'full' });
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
  const { ev, done } = await open({ scope: 'full' });
  await ev(hiredHelpers);
  const r = await ev(() => {
    startHired('engineer'); const st = G.state, h = st.hired, out = {};
    out.steps = SKILL_STEPS;
    out.start = { level: skillLevel('engineer'), xp: skillXp('engineer'), other: skillLevel('pilot'), odds: soloOdds('engineer'), otherOdds: soloOdds('pilot') };
    gainSkill('engineer', SKILL_STEPS[2] - SKILL_STEPS[1]); out.after = { level: skillLevel('engineer'), odds: soloOdds('engineer') };
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
  assert.deepEqual(r.start, { level: 1, xp: r.steps[1], other: -1 + 1, odds: 0.6, otherOdds: 0.45 }, 'the sheet: an engineer\'s hands are a point up, a twentieth on the roll (sheet.js)');
  assert.deepEqual(r.after, { level: 2, odds: 0.7 });
  assert.equal(r.order, 1, 'your own order teaches you a little');
  assert.equal(r.run.xp, 2, 'a burn worked teaches you more'); assert.equal(r.run.opinion, -1, 'a run that made nothing costs you the captain\'s regard');
  assert.deepEqual(r.owner, { odds: 0.45, skill: -1 + 1 }, 'an owner\'s solo odds are the old ones');
  await done();
});

test('posts: you can ask the captain to move you, and they decide', async () => {
  const { page, ev, done } = await open({});
  await ev(hiredHelpers);
  await ev(() => { startHired('gunner'); G.state.tutorial = null; UI.render(); });
  await goTo(page, 'crew');
  assert.match(await page.innerText('#panel'), /your posts/i);
  assert.equal(await page.$$eval('[data-action=swapPost]', b => b.length), 3, 'the three others');
  const r = await ev(() => {
    const st = G.state, h = st.hired, out = { steps: SKILL_STEPS };
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
  assert.equal(r.yes.gunnerXp, r.steps[1], 'what you learned at the gun post stays with you');
  assert.ok(r.odds.more > r.odds.low, 'whoever decides is likelier to say yes once they trust you');
  await done();
});

test('buying in: a ship of your own, one friend, and the captain as a contact', async () => {
  const { page, ev, done } = await open({});
  await ev(hiredHelpers);
  await ev(() => { startHired('pilot'); const st = G.state; st.tutorial = null; st.credits = 120000; st.cargo = { water: 5 }; st.paid = { water: 1000 };
    const crew = st.crew.map(person); crew[0].opinion = 4; crew[1].opinion = 1; crew[2].opinion = -2; window.friendId = crew[0].id; window.otherIds = [crew[1].id, crew[2].id];
    UI.render(); });
  await goTo(page, 'shipyard');
  const price = await ev(() => SHIPS.shuttle.price);
  assert.equal(await page.$$eval('[data-action=buyInAsk]:not([disabled])', b => b.length), 1, 'only the ship you can afford');
  await page.click('[data-action=buyInAsk]:not([disabled])');
  await ev(() => { chooseEvent(0); finishEvent(); UI.render(); });  // the yard office: pay the asking price
  assert.match(await page.innerText('#panel'), /would come with you/);
  await page.click('[data-action=buyInNo]');
  assert.ok(await ev(() => !!G.state.hired), 'not yet is not yet');
  await page.click('[data-action=buyInAsk]:not([disabled])');
  await ev(() => { chooseEvent(0); finishEvent(); UI.render(); });
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
  assert.equal(r.hired, null); assert.equal(r.ship, 'shuttle'); assert.equal(r.credits, 120000 - price);
  assert.deepEqual(r.crew, [r.friend], 'the friend comes, the others stay with the captain');
  assert.ok(r.left); assert.equal(r.cargo, 0, 'the hold was the captain\'s');
  assert.deepEqual(r.captain, { known: true, ship: true, haunt: true, liked: true });
  assert.ok(r.tradeTab && r.offers, 'the owner\'s business is open again');
  assert.ok(r.payCrew > 0, 'and the crew are your wages now');
  assert.match(r.note, /You bought the .* and left the/); assert.match(r.note, /came with you/);
  await done();
});

test('buying in: nobody comes if nobody likes you, and it needs the money and a yard', async () => {
  const { ev, done } = await open({ scope: 'full' });
  await ev(hiredHelpers);
  const r = await ev(() => {
    startHired('engineer'); const st = G.state, out = {};
    st.crew.map(person).forEach(c => { c.opinion = 0; });
    out.friend = buyInFriend();
    out.poor = canBuyIn('shuttle', currentPlanet());
    st.credits = 500000; out.rich = canBuyIn('shuttle', currentPlanet());
    out.noYard = canBuyIn('shuttle', { services: ['trade'] });
    out.blocked = (() => { hired().confirm = 'shuttle'; buyIn('freighter'); return !!hired(); })();
    Mods.act('buyInAsk', 'shuttle'); Mods.act('buyInGo', 'shuttle');
    out.alone = { hired: G.state.hired, crew: G.state.crew.length, note: UI.notes.join(' ') };
    // An owner has nothing to buy in to.
    startGame({ slot: 1, background: 'earth', captain: 'Ines' }); while (G.dialog) finishEvent();
    G.state.credits = 999999; buyIn('courier'); out.owner = G.state.shipId;
    return out;
  });
  assert.equal(r.friend, null); assert.equal(r.poor, false); assert.equal(r.rich, true); assert.equal(r.noYard, false);
  assert.equal(r.blocked, true, 'a ship too dear for the standing, or not asked for, is not bought');
  assert.equal(r.alone.hired, null); assert.equal(r.alone.crew, 0); assert.match(r.alone.note, /on your own/);
  assert.equal(r.owner, 'shuttle', 'an owner is not affected');
  await done();
});

test('a second run loads a new contract: a plan made before the last cargo was delivered is not reused', async () => {
  const { ev, done } = await open({});
  await ev(hiredHelpers);
  const r = await ev(() => {
    startHired('engineer'); const st = G.state, h = st.hired;
    const fly = () => { let steps = 0; while (G.mode !== 'landed' && steps++ < 30000) { while (G.dialog) { chooseEvent(0); finishEvent(); } G.npcs = []; update(G.mode === 'transit' ? 1 : 1 / 30); Mods.emit('frame', G.mode === 'transit' ? 1 : 1 / 30); } };
    const out = {};
    currentPlan(); sail(); fly(); while (G.dialog) finishEvent();  // the first arrival has a scene
    // The port screen drew while the cargo was still aboard: the plan it made must not survive the sale.
    out.stale = !!h.plan; out.cargo = Object.keys(st.cargo).length;
    const plan = currentPlan(); out.loaded = !!plan.loaded;
    const skip = plan.ballast || !!plan.ice;  // a light run loads nothing, and an ice run cuts its water on the way (icerun.js)
    G.offers = []; const fund0 = h.fund; delete h.stay; sail(); out.bought = skip || (Object.values(st.cargo)[0] || 0) > 0;  // the wait in port is stay.js's own test
    out.paid = skip || fund0 - h.fund === h.run.cost;
    fly(); out.second = h.ledger[0];
    out.honest = skip || (out.second.cost === 0 && !!out.second.shipper && (out.second.revenue > 0 || out.second.tons === 0));  // paid for what arrived; a load wholly lost on the way (an event took it) is no pay
    return out;
  });
  assert.equal(r.cargo, 0); assert.equal(r.loaded, false);
  assert.ok(r.bought && r.paid, 'the shipper\'s cargo was loaded, at no cost to the ship');
  assert.ok(r.honest, `and delivered, so the shipper paid for what arrived: ${JSON.stringify(r.second)}`);
  await done();
});

test('once you can afford a ship, the captain heads for a port with a yard', async () => {
  const { ev, done } = await open({});
  await ev(hiredHelpers);
  const r = await ev(() => {
    startHired('engineer'); const st = G.state, h = st.hired, out = {};
    out.yardsInReach = Object.entries(SYSTEMS).filter(([sid]) => sid !== st.systemId && inRange(st.systemId, sid)).some(([, s]) => s.planets.some(p => p.services.includes('shipyard') && p.services.includes('trade')));
    st.credits = 200000; h.plan = null; const rich = currentPlan();
    out.rich = { yard: rich.yard, planet: rich.planet };
    st.credits = 3000; h.plan = null; const poor = currentPlan();
    out.poorIsNotForced = poor !== null;
    return out;
  });
  assert.ok(r.yardsInReach, 'there is a yard to head for');
  assert.ok(r.rich.yard, `she heads for a yard (${r.rich.planet})`);
  assert.ok(r.poorIsNotForced);
  await done();
});

test('a hired hand is offered only what is theirs: their own post, and no owner\'s business', async () => {
  const { page, ev, done } = await open({});
  await ev(hiredHelpers);
  const FORBIDDEN = ['sbuy', 'hire', 'dismiss', 'renameShip', 'handBack', 'programWrite', 'programSlot', 'programPick', 'programRemove', 'routeDock', 'takeoff', 'buy', 'sell'];
  const problems = [];
  for (const post of ['pilot', 'gunner', 'engineer', 'comms']) {
    await ev(p => { startHired(p); G.state.tutorial = null; G.state.credits = 500000; UI.render(); }, post);
    for (const tab of ['nav', 'weapons', 'shipyard', 'crew', 'web', 'journal', 'comms', 'port', 'bar', 'missions']) {
      await ev(t => { UI.tab = t; UI.render(); }, tab);
      const found = await page.evaluate(() => [...document.querySelectorAll('#panel .body button, #panel .post button')].filter(b => !b.disabled).map(b => [b.dataset.action, b.dataset.arg || '']));
      for (const [a, arg] of found) {
        if (FORBIDDEN.includes(a)) problems.push(`${post}/${tab}: ${a}`);
        if (a === 'takeControl') problems.push(`${post}/${tab}: take controls`);
        if ((a === 'postOrder' || a === 'project') && !(arg.split(':')[0] === post || (a === 'project' && ({ patch: 'engineer', tune: 'engineer', refit: 'gunner' })[arg] === post))) problems.push(`${post}/${tab}: ${a} ${arg} is not their post`);
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

test('downtime for a hired hand: not the captain\'s drills, and a chance to practice your post', async () => {
  const { ev, done } = await open({ scope: 'full' });
  await ev(hiredHelpers);
  const r = await ev(() => {
    const labels = () => { G.transit.lifeUsed = {}; return downtimeEvent(true).choices.map(c => c.label); };
    startHired('engineer'); const st = G.state; st.tutorial = null; st.armor = 10;
    uatBurn('Ceres Station', 'pallas'); G.transit.times = [];
    const eng = labels(), engText = downtimeEvent(true).text;
    const x0 = skillXp('engineer'); const prac = downtimeEvent(true).choices.find(c => c.label === 'Practice at your post'); const said = prac.run(); const gained = skillXp('engineer') - x0;
    startHired('pilot'); G.state.armor = 10; uatBurn('Ceres Station', 'pallas'); G.transit.times = [];
    const pilot = labels();
    startGame({ slot: 1, background: 'earth', captain: 'Ines' }); while (G.dialog) finishEvent(); G.state.armor = 10; uatBurn('Ceres Station', 'pallas'); G.transit.times = [];
    const owner = labels(), ownerText = downtimeEvent(true).text;
    return { eng, engText, gained, said, pilot, owner, ownerText };
  });
  assert.ok(!r.eng.includes('Run drills') && !r.eng.includes('Check on passengers'), 'the drills and the rounds of the berths are the captain\'s');
  assert.ok(r.eng.includes('Practice at your post') && r.eng.includes('Maintenance'), 'an engineer keeps the hull');
  assert.ok(!r.pilot.includes('Maintenance') && r.pilot.includes('Practice at your post'), 'a pilot does not');
  assert.match(r.engText, /What do you do/); assert.equal(r.gained, 3); assert.match(r.said, /engineer post/);
  assert.ok(r.owner.includes('Run drills') && !r.owner.includes('Practice at your post'), 'an owner is unchanged');
  assert.match(r.ownerText, /What does the ship do/);
  await done();
});

test('burn events for a hired hand: the captain takes the ship\'s calls, with the ship\'s money', async () => {
  const { ev, done } = await open({});
  await ev(hiredHelpers);
  const r = await ev(() => {
    startHired('pilot'); const st = G.state; st.tutorial = null; st.flags.classicCombat = false; st.armor = ship().armor;
    uatBurn('Ceres Station', 'pallas'); G.transit.times = []; const t = G.transit, h = st.hired;
    const distress = TRANSIT_EVENTS.find(e => e.title === 'Distress Call'), coolant = TRANSIT_EVENTS.find(e => e.title === 'Coolant Leak');
    const out = { shown: null, mine: [], yours: null };
    h.fund = 200000;
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
    // The contact (a patrol: no option fits a pilot, as a pirate's would): the captain answers, and pays from the ship's purse.
    h.fund = 200000; let contactMine = 0;
    for (let i = 0; i < 40; i++) { G.dialog = null; t.event = null; G.nextEvent = null; G.duel = null; const c0 = st.credits; st.armor = ship().armor; openEvent(contactEvent({ kind: 'patrol', gov: 'Arcology Compact' })); const e = G.dialog.event; chooseEvent(0); contactMine += st.credits - c0; finishEvent(); for (let n = 0; G.dialog && n < 30 && !/^(Without a Captain|The Last Run)$/.test(G.dialog.event.title); n++) { chooseEvent(0); finishEvent(); }  /* the captain's pick is measured; the boarding that may follow is the scenes' own */ if (i === 0) out.contact = { decided: e.decided, labels: e.choices.map(c => c.label) }; }
    out.contactMine = contactMine; out.contactFund = h.fund !== 200000;
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

test('the captain\'s call quotes the option without its cost note', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  const r = await ev(() => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'pilot' }); while (G.dialog) finishEvent();
    G.transit = G.transit || {};
    const label = `Fire a warning shot${costNote({ hull: true, hand: true })}`;
    const out = hiredCall({ title: 'Raiders', text: 'A pirate hails.', via: 'ship', choices: [{ label, run: () => 'ok' }] });
    return { label, text: out.text };
  });
  assert.match(r.label, /\[if it fails: /, 'the label itself carries the note');
  assert.doesNotMatch(r.text, /[<>]|class=|if it fails/, 'the quoted call does not');
  assert.match(r.text, /takes the call: "Fire a warning shot\."/);
  await done();
});

test('a hired hand who is not the gunner watches the duel; the gunner picks the cards', async () => {
  const { ev, done } = await open({});
  await ev(hiredHelpers);
  const r = await ev(() => {
    const run = post => {
      startHired(post); const st = G.state; st.tutorial = null; st.flags.classicCombat = false; st.armor = ship().armor;
      uatBurn('Ceres Station', 'pallas'); G.transit.times = []; G.dialog = null; G.transit.event = null; G.nextEvent = null; G.duel = null;
      const c0 = st.credits; startDuel({ kind: 'hunter', person: { first: 'Ana', last: 'Voss' } }, false); finishEvent2();  // a pirate or a patrol is a raid in beats (engagements.js); a hunter is the card duel
      const first = G.nextEvent; const labels = first.choices.map(c => c.label); let rounds = 0;
      openEvent(first);
      while ((G.dialog || G.nextEvent) && rounds++ < 20) { if (!G.dialog) { finishEvent(); continue; } chooseEvent(Math.max(0, G.dialog.event.choices.findIndex(c => /locks/.test(c.label)))); finishEvent(); }  // the locks stop a boarding party; the ship now also has a PDC screen to pick first, which a boarding party gets past into a deck fight this driver does not play
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
  const { ev, done } = await open({ scope: 'full' });
  await ev(hiredHelpers);
  const r = await ev(() => {
    const talk = () => { const p = makePerson('earth'); p.goal = 'home'; p.traits = ['pious', 'kind']; registerPerson(p); const seen = new Set(); for (let i = 0; i < 30; i++) talkEvent({ p, known: false }).choices.forEach(c => seen.add(c.label)); return [...seen]; };  // the menu rotates: look at several
    startHired(); const hand = talk();
    startGame({ slot: 1, background: 'earth', captain: 'Ines Okafor' }); while (G.dialog) finishEvent(); G.state.tutorial = null;
    return { hand, owner: talk() };
  });
  assert.ok(!r.hand.some(l => /passage/i.test(l)), `a hand has no passage to offer (${r.hand})`);
  assert.ok(r.owner.some(l => /passage/i.test(l)), 'an owner still does');
  assert.ok(r.hand.includes('Ask for a blessing on the ship') && r.owner.includes('Ask for a blessing on your ship'), 'and the ship is not theirs to bless as theirs');
  await done();
});

test('a hired hand\'s own page shows their place on the ship and how the crew see them', async () => {
  const { page, ev, done } = await open({ scope: 'earth-hired' });
  const cap = await ev(() => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester' });
    while (G.dialog) finishEvent();
    G.state.day += 12; G.viewPerson = 'you'; UI.tab = 'person'; UI.render();
    return G.state.hired.captain;
  });
  const text = await page.innerText('#panel');
  assert.match(text, /ON THE SHIP/i);
  assert.match(text, /Aboard\s+12 days/);
  assert.match(text, /Post\s+Gunner/);
  assert.match(text, /HOW THEY SEE YOU/i);
  assert.ok(await page.$(`#panel [data-action=person][data-arg="${cap}"]`), 'the captain, linked, among those who see you');
  await done();
});

test('the Gunner\'s line and the GUNS tab match how contacts play for a hired hand: no card play, no projects that cannot start', async () => {
  const { ev, done } = await open({ scope: 'full' });
  await ev(hiredHelpers);
  const r = await ev(() => {
    startHired('gunner');
    const hand = { sign: sceneSay('scene:sign-on', 'post.gunner', { cap: 'Captain X' }), weapons: weaponsPanel(), projects: projectsHtml('gunner') };
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'owner' });
    const owner = { weapons: weaponsPanel(), projects: projectsHtml('gunner') };
    return { hand, owner, hiredNow: !!hired() };
  });
  assert.doesNotMatch(r.hand.sign, /cards|threats and answers/); assert.match(r.hand.sign, /the move at the guns is yours alone/);
  assert.match(r.hand.weapons, /A raid or a navy stop is fought turn by turn on the sensor board, not with cards/); assert.equal(r.hand.projects, '', 'no projects a hand cannot start');
  assert.equal(r.hiredNow, false); assert.doesNotMatch(r.owner.weapons, /not with cards/); assert.match(r.owner.projects, /Refit the fire control/, 'an owner still has them');
  await done();
});

// ---------- the hiring hall's bond (#280) ----------

test('a hand starts owing the hall, each arrival repays a third of the pay and never more than is owed, and the note says so', async () => {
  const { ev, done } = await open({ debt: true });
  await ev(hiredHelpers);
  const r = await ev(() => {
    startHired('gunner'); const st = G.state, h = hired(), out = { start: h.debt }; h.runsDone = 1;  // a later arrival: the first is the first officer's scene
    const arrive = days => { h.run = { planet: currentPlanet().name, sid: st.systemId, day: st.day - days, from: 'X', cost: 0 }; const c0 = st.credits, d0 = h.debt; const note = settleRun(currentPlanet()); return { note, credits: st.credits - c0, paid: d0 - h.debt, entry: h.ledger[0] }; };
    out.first = arrive(5);
    h.debt = 400; out.cap = arrive(5); out.capFlag = !!(h.flags || {}).debtCleared; out.after = h.debt;
    out.none = arrive(5);
    return out;
  });
  assert.equal(r.start, 30000);
  assert.equal(r.first.paid, Math.round(r.first.entry.wage * 0.3)); assert.equal(r.first.credits, r.first.entry.wage + r.first.entry.share - r.first.paid, 'the hall is paid out of the pay');
  assert.match(r.first.note, new RegExp(`The hall took ${r.first.paid} cr of your pay\\. [\\d,]+ cr still owed\\.`)); assert.equal(r.first.entry.hall, r.first.paid);
  assert.equal(r.cap.paid, 400, 'never more than is owed'); assert.match(r.cap.note, /The hall took 400 cr of your pay\. The bond is paid\./); assert.equal(r.capFlag, true); assert.equal(r.after, 0);
  assert.equal(r.none.paid, 0); assert.doesNotMatch(r.none.note, /The hall/, 'nothing owed, nothing said');
  await done();
});

test('a hand cannot buy a ship while owing, the panel says what is left, and a hand put ashore carries it; an older save has none to pay', async () => {
  const { ev, done } = await open({ debt: true });
  await ev(hiredHelpers);
  const r = await ev(() => {
    startHired('gunner'); const st = G.state, h = hired(), out = {};
    G.mode = 'landed'; const yard = Object.values(SYSTEMS).flatMap(s => s.planets).find(p => p.services.includes('shipyard'));
    st.credits = 2000000; const ship = Object.keys(SHIPS).find(id => SHIPS[id].forSale && !SHIPS[id].req);
    out.owing = canBuyIn(ship, yard); out.panelOwing = (st.planet = yard.name, buyInHtml());
    h.debt = 0; out.clear = canBuyIn(ship, yard);
    h.debt = 12340; startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', debt: 12340 }); out.carried = hired().debt;
    hired().debt = 7770; putAshore(); out.ashore = hired().debt;
    const old = hired(); old.runsDone = 1; delete old.debt; out.older = { guard: !(old.debt > 0), note: (old.run = { planet: currentPlanet().name, sid: G.state.systemId, day: G.state.day - 3, from: 'X', cost: 0 }, settleRun(currentPlanet())) };
    return out;
  });
  assert.equal(r.owing, false); assert.match(r.panelOwing, /You owe the hiring hall [\d,]+ cr\. You cannot buy a ship until it is paid\./); assert.equal(r.clear, true);
  assert.equal(r.carried, 12340); assert.equal(r.ashore, 7770, 'a hand put ashore keeps what is left');
  assert.ok(r.older.guard); assert.doesNotMatch(r.older.note, /The hall/);
  await done();
});

test('the hand has a sheet: set at the sign-on from the background and the post, read by a job on any post, shown in the look back', async () => {
  const { ev, done } = await open();
  await ev(hiredHelpers);
  const r = await ev(() => {
    startHired('gunner'); const st = G.state, h = st.hired, out = {};
    out.sheet = { ...h.sheet };
    st.crew = [];  // nobody to help
    out.comms = jobOdds({ post: 'comms' }); h.sheet.wit = 5; out.commsSharper = jobOdds({ post: 'comms' });
    out.recap = chapterRecap().text;
    h.sheet = null; out.old = { stat: handStat('eye'), recap: /Hands \d/.test(chapterRecap().text) };  // a save from before the sheet
    return out;
  });
  assert.deepEqual(r.sheet, { hands: 3, eye: 4, nerve: 3, wit: 4 }, 'an Earth gunner: the eye and the wit a point up');
  assert.ok(Math.abs(r.commsSharper - r.comms - 0.05) < 1e-9, 'a job on another post reads that post\'s stat');
  assert.match(r.recap, /Hands 3, eye 4, nerve 3, wit 5\./);
  assert.deepEqual(r.old, { stat: 3, recap: false }, 'without a sheet every stat is the base, and the look back says nothing of it');
  await done();
});

test('the Ice Hauler is fitted with a close-defense turret and a launcher with two torpedoes (#fight-rework)', async () => {
  const { page, ev, done } = await open({});
  await page.evaluate(hiredHelpers);
  const r = await ev(() => {
    startHired('gunner');
    const st = G.state;
    return { pdc: st.outfits.pdc, launcher: st.outfits.launcher, torps: st.torpedoes, shipPdc: ship().pdc, shipLauncher: ship().launcher, guns: ship().guns, cargo: ship().cargo };
  });
  assert.deepEqual(r, { pdc: 1, launcher: 1, torps: 2, shipPdc: true, shipLauncher: true, guns: 2, cargo: 114 });
  await done();
});

test('at a port with an outfitter the captain restocks the torpedoes from the fund (#fight-rework)', async () => {
  const { page, ev, done } = await open({});
  await page.evaluate(hiredHelpers);
  const r = await ev(() => {
    startHired('gunner');
    const st = G.state, h = hired(), earth = currentPlanet(), out = {};
    out.outfitter = earth.services.includes('outfitter');
    st.torpedoes = 0; h.fund = 100000; h.bill = 0;
    out.line = restockTorps(st, h, earth, true); out.torps = st.torpedoes; out.fund = h.fund; out.bill = h.bill; out.expect = fmt(2 * TORP_PRICE); out.price = TORP_PRICE;
    st.torpedoes = 0; h.fund = TORP_PRICE - 1; h.bill = 0;
    out.poor = [restockTorps(st, h, earth, true), st.torpedoes, h.fund, h.bill];
    st.torpedoes = 1; h.fund = 100000; h.bill = 0;
    out.one = [restockTorps(st, h, earth, true), st.torpedoes, h.fund];
    st.torpedoes = 0;
    h.fund = 100000;
    const none = { name: 'Nowhere', services: ['trade'] };
    out.none = [restockTorps(st, h, none, true), st.torpedoes, h.fund];
    out.unfitted = [restockTorps(st, h, earth, false), st.torpedoes, h.fund];  // a ship with no launcher buys none
    return out;
  });
  assert.ok(r.outfitter);
  assert.equal(r.torps, 2); assert.equal(r.fund, 100000 - 2 * r.price); assert.equal(r.bill, 2 * r.price);
  assert.ok(r.line.includes(r.expect), r.line);
  assert.deepEqual(r.poor, ['', 0, r.price - 1, 0]);
  assert.equal(r.one[1], 2); assert.equal(r.one[2], 100000 - r.price);
  assert.deepEqual(r.none, ['', 0, 100000]);
  assert.deepEqual(r.unfitted, ['', 0, 100000]);
  await done();
});

test('a save from before the fitting (no launcher) lands at an outfitter and is not charged for torpedoes (#808)', async () => {
  const { page, ev, done } = await open({});
  await page.evaluate(hiredHelpers);
  const r = await ev(() => {
    startHired('gunner');
    const st = G.state, h = hired();
    st.outfits = {}; st.torpedoes = 0; h.fund = 100000; h.bill = 0;  // the Ice Hauler as an old save has her: no turret, no launcher
    Mods.emit('landed', currentPlanet());
    return { outfitter: currentPlanet().services.includes('outfitter'), launcher: !!ship().launcher, torps: st.torpedoes, fund: h.fund, bill: h.bill };
  });
  assert.deepEqual(r, { outfitter: true, launcher: false, torps: 0, fund: 100000, bill: 0 });
  await done();
});

// ---------- the ladder of fights (js/fightladder.js, #810) ----------
const ladderHelpers = () => {
  window.ladderBurn = (to = 'mars') => { const prev = G.transit; G.transit = { to, total: 100, left: 100, times: [] }; planIntercept(); const spec = G.transit.intercept && JSON.parse(JSON.stringify(G.transit.intercept.spec)); G.transit = prev; return spec; };
};

test('a ladder step that is due waits for a burn with no other intercept', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(hiredHelpers); await ev(ladderHelpers);
  const r = await ev(() => {
    startHired('gunner'); const st = G.state, h = hired(); h.runsDone = 1; st.flags.classicCombat = true;
    const out = {};
    st.rep['Dome Concord'] = -40;
    const hostile = []; for (let i = 0; i < 30; i++) hostile.push(ladderBurn('mars'));
    out.patrolFirst = hostile.some(s => s && s.kind === 'patrol' && !s.ladder);
    out.laddered = hostile.filter(s => s && s.ladder).length;
    st.rep['Dome Concord'] = 0;
    out.step = ladderBurn('mars');
    out.doneBefore = (h.fights || { done: [] }).done.slice();
    return out;
  });
  assert.ok(r.patrolFirst, 'a wanted patrol still takes the burn');
  assert.ok(r.laddered > 0, 'the ladder takes the burns the patrol did not');
  assert.equal(r.step.ladder, 'raider'); assert.equal(r.step.shipId, 'raider'); assert.equal(r.step.kind, 'pirate');
  assert.deepEqual(r.doneBefore, [], 'planned is not met');
  await done();
});

test('the ladder contact is marked done when its fight starts, not when its scene is shown', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(hiredHelpers); await ev(ladderHelpers);
  const r = await ev(() => {
    startHired('gunner'); const h = hired(); h.runsDone = 1; G.state.flags.classicCombat = true;
    uatBurn('Ceres Station', 'pallas'); const t = G.transit; t.interceptPlanned = false; planIntercept(); const spec = JSON.parse(JSON.stringify(t.intercept.spec));
    t.intercept.at = 0; t.left = 50;
    const real = Math.random; Math.random = () => 0;  // the drive is seen
    try { Mods.emit('frame', 0.01); } finally { Math.random = real; }
    const shown = (h.fights || { done: [] }).done.slice(), before = ladderBurn('pallas');
    chooseEvent(0);  // battle stations: the fight starts
    return { spec, scene: t.event ? t.event.title : null, shown, before: before && before.ladder, done: h.fights && h.fights.done.slice(), next: ladderBurn('pallas') };
  });
  assert.equal(r.spec.ladder, 'raider'); assert.equal(r.scene, 'Contact'); assert.deepEqual(r.shown, []); assert.equal(r.before, 'raider', 'still due while only shown'); assert.deepEqual(r.done, ['raider']);
  assert.notEqual(r.next && r.next.ladder, 'raider', 'the same step is not met twice');
  await done();
});

test('a ladder fight opens with its own entry line, and a random one with the sensor line', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(hiredHelpers);
  const r = await ev(() => {
    startHired('gunner'); const st = G.state, h = hired();
    const vars = { cap: 'Captain Vance', patrol: 'Compact cutter', price: '1,000' };  // the narrow build's captain, the patrol of Earth's space (the burn leaves it), the deal below
    const labels = e => e.choices.map(c => String(c.label));
    // each step's condition made to hold in turn, so the walk meets the four of chapter one in the ladder's order (the pair is parked for chapter two)
    const preps = [() => { h.runsDone = 1; }, () => { h.runsDone = 3; }, () => { h.beats = CAPTAIN_BEATS.length; h.beatRun = 0; h.flags = { ...(h.flags || {}), sawHull: true }; },
      () => { h.deal = { price: 1000, day: st.day, until: st.day + 50, broker: false }; st.credits = Math.max(st.credits, 1000); }];
    const steps = preps.map(prep => {
      prep(); const step = ladderNext(h, st, 'mars');
      if (!step) return null;
      const plain = contactEvent({ ...step.spec, ladder: undefined }), e = contactEvent(step.spec);
      ladderDone(h, step.id);  // the scene does not meet it (the fight does, startShipFight); the walk moves on to the next step
      return { id: step.id, text: e.text, want: sceneSay('scene:fight-entry', `${step.id}.text`, vars), labels: labels(e), plainLabels: labels(plain) };
    });
    return { steps, done: h.fights.done.slice(), pirate: contactEvent({ kind: 'pirate', shipId: 'raider' }).text, patrol: contactEvent({ kind: 'patrol', gov: 'Dome Concord', shipId: 'cutter' }).text };
  });
  assert.deepEqual(r.steps.map(s => s && s.id), ['raider', 'corsair', 'cutter', 'setpiece'], 'the four, in order');
  assert.deepEqual(r.done, ['raider', 'corsair', 'cutter', 'setpiece']);
  for (const s of r.steps) {
    assert.match(s.text, /^Sensors: a drive plume at [\d,]+ km, on an intercept course\. /, `${s.id}: the range is kept`);
    assert.ok(s.text.endsWith(` ${s.want}`), `${s.id} opens with its own line: ${s.text}`);
    assert.doesNotMatch(s.text, /No transponder\. The plume signature says pirate\.|You are wanted in their space\.|\{\w+\}/, `${s.id}: no sensor line and no slot left unfilled`);
    assert.deepEqual(s.labels, s.plainLabels, `${s.id}: the choices are the contact's own`);
  }
  assert.equal(new Set(r.steps.map(s => s.want)).size, 4, 'four different lines');
  const by = Object.fromEntries(r.steps.map(s => [s.id, s.text]));
  assert.ok(by.cutter.includes('Transponder: Compact cutter, with'), by.cutter); assert.ok(by.setpiece.includes('1,000 cr'), by.setpiece); assert.ok(by.raider.includes('Captain Vance'), by.raider);
  assert.ok(r.pirate.endsWith('No transponder. The plume signature says pirate.'), r.pirate);
  assert.ok(r.patrol.endsWith('Transponder: Dome Concord navy. You are wanted in their space.'), r.patrol);
  await done();
});

test('random contacts for a hand come only once a type is met, and only of the types met', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(hiredHelpers); await ev(ladderHelpers);
  const r = await ev(() => {
    startHired('gunner'); const st = G.state, h = hired(); h.runsDone = 0;
    worldOf('mars').unrest = 0.3; worldOf('earth').unrest = 0.3;
    const draws = n => { const out = []; for (let i = 0; i < n; i++) { const s = ladderBurn('mars'); if (s) out.push(s); } return out; };
    const none = draws(300).filter(s => s.kind === 'pirate').length;
    h.runsDone = 1; h.fights = { done: ['raider'] };
    st.rep['Dome Concord'] = 0;
    const met = draws(600).filter(s => s.kind === 'pirate'), scene = scenePirate().pack;
    h.fights.done.push('corsair', 'cutter', 'pair');  // the ladder's pair met: the lane rolls a random raider's pack again
    const after = draws(600).filter(s => s.kind === 'pirate');
    return { none, ships: [...new Set(met.map(s => s.shipId))], count: met.length, packs: [...new Set(met.map(s => s.pack))], scene,
      after: [...new Set(after.map(s => 'pack' in s))], afterScene: 'pack' in JSON.parse(JSON.stringify(scenePirate())) };
  });
  assert.equal(r.none, 0, 'no types met, no random pirate');
  assert.ok(r.count > 20, `some contacts come (${r.count})`);
  assert.deepEqual(r.ships, ['raider']);
  assert.deepEqual(r.packs, [false], 'a random raider comes alone before the ladder\'s pair'); assert.equal(r.scene, false);
  assert.deepEqual(r.after, [false], 'after the pair, the spec leaves the pack to the lane'); assert.equal(r.afterScene, false);
  await done();
});

test('the ladder is for a hand: an owner game plans its contacts as it did', async () => {
  const { ev, done } = await open({ scope: 'full' });
  const r = await ev(() => {
    startGame({ slot: 1, background: 'earth', captain: 'Ines' }); while (G.dialog) finishEvent();
    worldOf('earth').unrest = 0.3; worldOf('mars').unrest = 0.3;
    const specs = []; for (let i = 0; i < 400; i++) { G.transit = { to: 'mars', total: 100, left: 100 }; planIntercept(); if (G.transit.intercept) specs.push(G.transit.intercept.spec); }
    G.transit = null;
    return { n: specs.length, ladder: specs.filter(s => s.ladder || s.shipId).length, hired: !!hired() };
  });
  assert.equal(r.hired, false); assert.ok(r.n > 10); assert.equal(r.ladder, 0, 'no ladder spec, no chosen ship');
  await done();
});

test('a raid honors the spec\'s grade and pack, and the pack starts a volley behind', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(hiredHelpers); await ev(ladderHelpers);
  const r = await ev(() => {
    startHired('gunner');
    const rate = spec => { const s = { spec, foe: makeEnemy(spec), edge: 0 }; rateFoe(s); return { grade: s.grade, pack: s.pack, edge: s.edge }; };
    const out = []; for (let i = 0; i < 40; i++) out.push(rate({ kind: 'pirate', shipId: 'corsair', grade: 2 }), rate({ kind: 'pirate', shipId: 'raider', pack: true }), rate({ kind: 'pirate', shipId: 'raider', pack: true, grade: 0 }));
    return { setpiece: out.filter((_, i) => i % 3 === 0), pair: out.filter((_, i) => i % 3 === 1), calm: out.filter((_, i) => i % 3 === 2) };
  });
  assert.ok(r.setpiece.every(x => x.grade === 2), 'the set piece is a hard crew every time');
  assert.ok(r.pair.every(x => x.pack && x.edge === -1), 'the pair is a pair every time');
  assert.ok(r.calm.every(x => x.grade === 0 && x.pack));
  await done();
});
