'use strict';

// People: crew and their arcs, passengers, relationships and downtime, the bar,
// landing scenes, personal stories, letters and moods, occasions, traditions,
// the cat, and passengers who join the crew.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

// Every choice of an event, each on a fresh copy made by `make`.
const everyChoice = (make) => {
  let n = 0;
  for (let i = 0; i < make().choices.length; i++) {
    const ev = make(); openEvent(ev);
    if (i < G.dialog.choices.length) { const c = G.dialog.choices[i]; if (!c.can || c.can()) { chooseEvent(i); n++; } }
    G.dialog = null; G.nextEvent = null; if (G.transit) G.transit.event = null;
  }
  return n;
};

test('hiring crew, their perks, and every crew and passenger scene', async () => {
  const { page, ev, done } = await open();
  await ev(() => { const st = G.state; st.tutorial = null; st.story.next = 1e9; st.credits = 200000; while (G.dialog) finishEvent(); st.systemId = 'ceres'; st.planet = 'Ceres Station'; landAt(currentPlanet(), []); while (G.dialog) finishEvent(); });
  const massBefore = await ev(() => burnFuel('ceres', 'jupiter'));
  await page.click('[data-action=station][data-arg=interior]');
  await page.click('[data-action=hire][data-arg=rosa]');
  assert.ok(await ev(() => G.state.crew.includes('rosa')));
  assert.ok(await ev(() => burnFuel('ceres', 'jupiter')) < massBefore, 'an engineer saves reaction mass');
  const r = await ev((everyChoiceSrc) => {
    const everyChoice = (0, eval)(`(${everyChoiceSrc})`);
    const st = G.state;
    st.shipId = 'freighter'; st.crew.push('dima', 'kit', 'josef', 'wren');
    const hand = makeCrewCandidate('ceres'); registerPerson(hand); st.crew.push(hand.id);
    const out = { faster: travelDays('earth', 'saturn') < baseDays('earth', 'saturn'), guns: playerGuns() };
    let o; do { o = generateMissions(currentPlanet()).find(m => m.type === 'passenger' && m.pax === 1 && m.person); } while (!o);
    o.id = st.nextId++; o.pid = registerPerson(o.person).id; delete o.person; st.missions.push(o);
    takeOff(); st.dest = o.destSystem === 'ceres' ? 'mars' : o.destSystem; G.player.x = 6000; tryBurn(); enterTransit(); G.transit.times = [];
    let n = 0;
    for (const id of Object.keys(CREW)) for (const step of [0, 1]) n += everyChoice(() => CREW[id].events[step]);
    for (const pid of Object.keys(PASSENGERS)) n += everyChoice(() => { if (!st.missions.includes(o)) st.missions.push(o); return PASSENGERS[pid].event(o); });
    for (const t of PAX_EVENTS) n += everyChoice(() => { if (!st.missions.includes(o)) st.missions.push(o); return t.make(st.people[o.pid], o); });
    for (const trait of Object.keys(CREW_EVENTS)) n += everyChoice(() => CREW_EVENTS[trait](hand));
    for (let i = 0; i < 30; i++) { startHappening(); G.dialog = null; G.transit.event = null; }
    out.choices = n;
    return out;
  }, everyChoice.toString());
  assert.ok(r.faster, 'a pilot shortens burns');
  assert.ok(r.guns > 1, 'a gunner adds a gun');
  assert.ok(r.choices > 50, `played ${r.choices} choices`);
  await done();
});

test('downtime from the transit screen', async () => {
  const { page, ev, done } = await open();
  await ev(() => {
    const st = G.state; st.tutorial = null; st.story.next = 1e9; st.credits = 50000; st.shipId = 'lightfreighter';
    while (G.dialog) finishEvent();
    st.crew.push('kit');
    const c = makeCrewCandidate('earth'); c.role = 'engineer'; c.skill = 2; registerPerson(c); st.crew.push(c.id);
    takeOff(); st.dest = 'mars'; G.player.x = 6000; G.player.y = 0; tryBurn();
  });
  await page.waitForFunction(() => G.mode === 'transit');
  await ev(() => { G.transit.times = []; });
  await page.waitForSelector('#tlife button:not([disabled])', { timeout: 10000 });
  await page.click('#tlife button');
  const labels = await page.$$eval('[data-action=choose]', b => b.map(x => x.textContent));
  assert.ok(labels.length >= 3, `downtime menu (${labels})`);
  await page.click('[data-action=choose][data-arg="0"]');
  await page.click('[data-action=continue]');
  assert.ok(await ev(() => G.transit.lifeUsed), 'downtime used up for this leg');
  await ev(() => { G.transit.left = 0.05; });
  await page.waitForFunction(() => G.mode === 'flight' || G.dialog, null, { timeout: 5000 });
  assert.ok(await ev(() => document.getElementById('tlife').hidden), 'buttons go away on arrival');
  await done();
});

test('relationships, feeds, seasons, and passengers who come back', async () => {
  const { ev, done } = await open();
  const r = await ev(() => {
    const st = G.state, out = {}; st.tutorial = null; st.story.next = 1e9; st.credits = 50000; st.shipId = 'lightfreighter';
    while (G.dialog) finishEvent();
    st.crew.push('kit');
    const c = makeCrewCandidate('ceres'); c.role = 'engineer'; c.skill = 2; c.traits = ['rude', 'talkative']; registerPerson(c); st.crew.push(c.id);
    const p = makePerson('belt'); p.traits = ['nervous', 'kind']; registerPerson(p);
    st.missions.push({ id: 99, type: 'passenger', pid: p.id, who: `${p.first} ${p.last}`, pax: 1, bonus: 0, destSystem: 'mars', destPlanet: 'Mars', title: 'Carry', pay: 900, deadline: 99, eventDone: true });
    takeOff(); st.dest = 'mars'; G.player.x = 6000; tryBurn(); enterTransit();
    out.activities = Object.values(ACTIVITIES).filter(a => a.can()).map(a => a.run()).length;
    const scenes = new Set();
    for (let i = 0; i < 60; i++) {
      const e = relationshipScene(); if (!e || scenes.has(e.title)) continue;
      scenes.add(e.title); pick(e.choices.filter(c => !c.can || c.can())).run();
    }
    out.scenes = scenes.size;
    out.feed = feedLine();
    out.bonds = Object.keys(st.bonds || {}).length;
    const season = culture().season;
    for (let d = 0; d < 45; d++) { st.day++; Mods.emit('newDay', st.day); }
    out.seasonMoved = culture().season !== season;
    // Deliver the passenger, then find them wanting another trip.
    G.transit = null; st.systemId = 'mars'; G.player = makeShip(st.shipId, 0, 0, 0); G.mode = 'flight';
    land(SYSTEMS.mars.planets[0]);
    while (G.dialog) { chooseEvent(G.dialog.choices.length - 1); finishEvent(); }  // the last choice is the one that keeps things as they are (not "Welcome aboard")
    out.trips = p.trips; out.loc = p.location;
    p.opinion = 4;
    let note = null; for (let i = 0; i < 10 && !note; i++) { p.nextAsk = 0; note = regularsAt(SYSTEMS.mars.planets[0]); }
    out.regular = !!(G.offers[0] && G.offers[0].regular);
    return out;
  });
  assert.ok(r.activities >= 3, 'downtime activities run');
  assert.ok(r.scenes >= 3, `relationship scenes (${r.scenes})`);
  assert.ok(r.feed, 'the feed has something on');
  assert.ok(r.bonds > 0, 'bonds form');
  assert.ok(r.seasonMoved, 'seasons roll over');
  assert.equal(r.trips, 1);
  assert.equal(r.loc, 'Mars');
  assert.ok(r.regular, 'a regular asks for another trip');
  await done();
});

test('the bar in every port, and every landing scene', async () => {
  const { page, ev, done } = await open();
  await ev(() => {
    const st = G.state; st.tutorial = null; st.story.next = 1e9; st.credits = 50000; st.shipId = 'lightfreighter';
    while (G.dialog) finishEvent();
    st.systemId = 'juno'; st.planet = 'Juno Commons'; landAt(SYSTEMS.juno.planets[0], []);
    while (G.dialog) { chooseEvent(G.dialog.choices.length - 1); finishEvent(); }
  });
  await page.click('[data-action=station][data-arg=ops]');
  await page.click('[data-action=tab][data-arg=bar]');
  await page.click('[data-action=barTalk][data-arg="0"]');
  await page.click('[data-action=choose][data-arg="0"]');
  await page.click('[data-action=continue]');
  await page.click('[data-action=barRound]');
  assert.equal(await ev(() => UI.tab), 'bar', 'stays on the bar tab');
  const r = await ev(() => {
    const st = G.state, out = { bars: 0, talks: 0 };
    for (const [sid, s] of Object.entries(SYSTEMS)) for (const pl of s.planets) {
      st.systemId = sid; st.planet = pl.name; landAt(pl, []);
      while (G.dialog) { chooseEvent(G.dialog.choices.length - 1); finishEvent(); }
      UI.tab = 'bar'; UI.render();
      if (G.barState && G.barState.name) out.bars++;
      for (const pat of G.patrons) for (const c of talkEvent(pat).choices) if (!c.can || c.can()) { c.run(); out.talks++; }
    }
    const lands = STORYLETS.filter(s => s.id.startsWith('land-'));
    st.cargo = { luxury: 5, water: 10, medical: 5 };
    for (const s of lands) for (const c of storyletEvent(s).choices) c.run();
    out.lands = lands.length;
    st.systemId = 'juno'; st.planet = 'Juno Commons'; st.day = 10;
    let hits = 0; for (let i = 0; i < 400; i++) { const s = pickStorylet('port'); if (s && s.id.startsWith('land-')) hits++; }
    out.rate = hits / 400;
    out.planets = Object.values(SYSTEMS).reduce((n, s) => n + s.planets.length, 0);
    return out;
  });
  assert.equal(r.bars, r.planets, 'every port has a bar');
  assert.ok(r.talks > r.planets, 'patrons to talk to');
  assert.ok(r.lands >= 20, `landing scenes registered (${r.lands})`);
  assert.ok(r.rate > 0.05 && r.rate < 0.6, `landing scenes are occasional (${r.rate})`);
  await done();
});

test('family: a personal story to loyalty, letters and moods, occasions, traditions, the cat, joining', async () => {
  const { page, ev, done } = await open();
  const r = await ev(() => {
    const st = G.state, out = {};
    st.tutorial = null; st.story.next = 1e9; st.credits = 60000; st.shipId = 'lightfreighter';
    while (G.dialog) finishEvent();
    const a = makeCrewCandidate('ceres'); a.role = 'engineer'; a.skill = 2; a.home = 'Ceres Station'; a.culture = 'belt'; registerPerson(a); st.crew.push(a.id);
    const b = makeCrewCandidate('mars'); b.role = 'pilot'; b.skill = 2; registerPerson(b); st.crew.push(b.id);
    a.opinion = 5;
    for (let k = 0; k < 5; k++) sitBeat(a, true).choices[0].run();
    out.favor = st.missions.some(m => m.type === 'favor');
    st.systemId = 'ceres'; G.player = makeShip(st.shipId, 0, 0, 0); G.mode = 'flight';
    land(SYSTEMS.ceres.planets[0]);
    while (G.dialog) { chooseEvent(0); finishEvent(); }
    out.loyal = !!a.loyal;
    for (let i = 0; i < 40 && !a.news; i++) { a.letterDay = -99; letters(currentPlanet()); }
    out.letter = !!a.news;
    a.news = { good: false, text: 'their sister is sick' }; a.mood = { kind: 'low', until: st.day + 25 };
    out.lowSkill = roleSkill('engineer');
    newsEvent(a).choices[1].run();
    out.helpedSkill = roleSkill('engineer');
    // A burn crossing First Water with a Belter aboard.
    st.day = 53; takeOff(); st.dest = 'pallas'; G.player.x = 6000; tryBurn(); enterTransit(); planOccasions();
    out.holiday = G.transit.occasions.some(o => o.kind === 'holiday');
    occasionEvent({ kind: 'birthday', id: b.id, day: st.day + 1 }).choices[0].run();
    home().burns = 3;
    traditionEvent().choices[0].run();
    for (let i = 0; i < 20; i++) addTouches();
    out.touches = home().touches.length;
    catEvent().choices[0].run();
    const p = makePerson('belt'); p.job = 'nurse'; registerPerson(p); p.opinion = 5;
    const crew0 = st.crew.length;
    joinEvent(p).choices[0].run();
    out.joined = st.crew.length - crew0;
    out.log = home().log.length;
    return out;
  });
  assert.ok(r.favor, 'the story ends in a favor');
  assert.ok(r.loyal, 'keeping it makes them loyal');
  assert.ok(r.letter, 'letters arrive');
  assert.equal(r.lowSkill, 1, 'a low mood costs a skill level');
  assert.equal(r.helpedSkill, 2, 'helping restores it');
  assert.ok(r.holiday, 'First Water falls on this burn');
  assert.ok(r.touches > 0, 'the ship picks up touches');
  assert.equal(r.joined, 1, 'a passenger joins the crew');
  assert.ok(r.log > 0, 'the home log records it');
  // Rename the ship from the Crew tab.
  await ev(() => { G.transit = null; G.state.systemId = 'ceres'; G.state.planet = 'Ceres Station'; landAt(SYSTEMS.ceres.planets[0], []); while (G.dialog) { chooseEvent(0); finishEvent(); } });
  await page.click('[data-action=station][data-arg=interior]');
  await page.fill('#shipName', 'Tuesday Forever');
  await page.click('[data-action=renameShip]');
  assert.equal(await ev(() => home().name), 'Tuesday Forever');
  await done();
});

test('a long career with random answers: no errors, no broken text, no overfull ship', async () => {
  const { ev, done } = await open({ seed: 4 });
  const bad = await ev(() => {
    const st = G.state, bad = [];
    const odd = t => /undefined|NaN|\[object|\{[a-z]+\}/.test(String(t));
    const answer = () => {
      for (let k = 0; k < 6 && G.dialog; k++) {
        const d = G.dialog;
        if (odd(d.event.title + d.event.text)) bad.push('text: ' + d.event.title);
        const ok = d.choices.map((c, i) => i).filter(i => !d.choices[i].can || d.choices[i].can());
        if (ok.length) { const r = chooseEvent(pick(ok)); if (odd(r)) bad.push('result: ' + String(r).slice(0, 80)); }
        finishEvent();
      }
      while (G.dialog) finishEvent();
    };
    st.tutorial = null; st.credits = 80000; st.shipId = 'freighter';
    answer();
    for (let leg = 0; leg < 40; leg++) {
      UI.tab = 'bar'; UI.render();
      if (G.patrons && G.patrons.length) { openEvent(talkEvent(pick(G.patrons))); answer(); }
      if (berthsFree() > 0 && G.bar.length && st.crew.length < 5 && Math.random() < 0.3) UI.act('hire', 'bar:0');
      const pi = G.offers.findIndex(o => o.type === 'passenger' && (o.pax || 1) <= berthsFree());
      if (pi >= 0 && Math.random() < 0.5) UI.act('accept', String(pi));
      st.credits = Math.max(st.credits, 20000); st.fuel = ship().fuel;
      const dests = Object.keys(SYSTEMS).filter(id => id !== st.systemId && burnFuel(st.systemId, id) <= st.fuel);
      const to = (st.missions.find(m => dests.includes(m.destSystem)) || {}).destSystem || pick(dests);
      takeOff(); answer(); st.dest = to; G.player.x = 6000; G.player.y = 0; tryBurn(); enterTransit(); G.transit.times = [];
      planOccasions();
      for (const o of G.transit.occasions) { openEvent(occasionEvent(o)); answer(); }
      for (let h = 0; h < 4; h++) { startHappening(); answer(); }
      const acts = Object.values(ACTIVITIES).filter(a => a.can());
      if (acts.length) pick(acts).run();
      const rs = relationshipScene(); if (rs) { openEvent(rs); answer(); }
      for (const c of G.transit.comms) if (odd(c)) bad.push('comm: ' + c.slice(0, 80));
      const days = G.transit.days; G.transit = null;
      for (let d = 0; d < days; d++) { st.day++; Mods.emit('newDay', st.day); }
      st.systemId = to; G.player = makeShip(st.shipId, 0, 0, 0); G.mode = 'flight'; G.npcs = [];
      const m = st.missions.find(x => x.destSystem === to);
      land(system().planets.find(p => m && p.name === m.destPlanet) || pick(system().planets));
      for (const n of UI.notes) if (odd(n)) bad.push('note: ' + n.slice(0, 80));
      answer();
      if (berthsUsed() > ship().berths) bad.push(`overfull ${berthsUsed()}/${ship().berths}`);
      if (!Number.isFinite(st.credits)) bad.push('credits ' + st.credits);
    }
    return [...new Set(bad)];
  });
  assert.deepEqual(bad, []);
  await done();
});

test('what people are seen doing on the ship: every room and role has lines that fill in', async () => {
  const { ev, done } = await open();
  const r = await ev(() => {
    const st = G.state; st.tutorial = null; while (G.dialog) finishEvent();
    st.crew.push('rosa', 'kit', 'dima'); home().cat = 'Rivet'; st.shipId = 'freighter';
    takeOff(); st.dest = 'mars'; G.player.x = 6000; tryBurn(); enterTransit(); G.transit.times = [];
    const people = shipPeople(), bad = [];
    let seen = 0;
    for (const room of ['engine', 'hold', 'berths', 'galley', 'bridge']) {
      for (const p of people) {
        if (p.role === 'you') continue;
        p.room = room;
        for (let i = 0; i < 20; i++) { const l = lifeLine(p, people); if (l) { seen++; if (/[{}]|undefined/.test(l)) bad.push(`${room}/${p.role}: ${l}`); } }
      }
    }
    return { seen, bad, roles: people.map(p => p.role) };
  });
  assert.ok(r.seen > 50, `lines shown (${r.seen}, roles ${r.roles})`);
  assert.deepEqual(r.bad, []);
  await done();
});
