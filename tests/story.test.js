'use strict';

// Story: Cold Water from the derelict to each ending, and the side campaigns
// (the Ice Haulers' Strike, the Mars Navy, the Rook's Crown, the Tethys Consortium).
// Scenes are played straight through the game's functions; burns skip to arrival
// with the calendar moved on as a real burn would.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

// Installed in the page as window.S.
const helpers = () => {
  window.S = {
    reset(stage, extra) {
      localStorage.clear(); newGame(); while (G.dialog) finishEvent();
      const st = G.state; st.tutorial = null; st.shipId = 'freighter'; st.credits = 50000;
      if (stage !== undefined) Object.assign(st.story, { stage }, extra || {});
      home().cat = 'Rivet';  // no stray-cat scene in front of the story scene under test
    },
    // Lands and returns the scene title, or null.
    land(sys, body) { while (G.dialog) finishEvent(); G.transit = null; G.state.systemId = sys; G.state.planet = body; G.mode = 'landed'; landAt(currentPlanet(), []); return G.dialog ? G.dialog.event.title : null; },
    // Answers the open scene with the choice whose label starts with `start`.
    choose(start) {
      const i = G.dialog.choices.findIndex(c => c.label.startsWith(start));
      if (i < 0) throw new Error(`no choice "${start}" in ${G.dialog.event.title}: ${G.dialog.choices.map(c => c.label).join(' | ')}`);
      const c = G.dialog.choices[i];
      if (c.can && !c.can()) throw new Error(`choice "${start}" is disabled`);
      const r = chooseEvent(i); finishEvent(); return r;
    },
    burn(to) { while (G.dialog) finishEvent(); if (G.mode === 'landed') takeOff(); G.mode = 'flight'; G.state.dest = to; G.state.fuel = ship().fuel; G.player.x = 6000; G.player.y = 0; tryBurn(); enterTransit(); G.transit.times = []; },
    arrive(body) {
      const to = G.transit.to, days = travelDays(G.state.systemId, to);
      while (G.dialog) finishEvent();
      G.transit = null;
      for (let i = 0; i < days; i++) { G.state.day++; Mods.emit('newDay', G.state.day); }
      // Dock the way a player does, so missions are delivered.
      G.state.systemId = to; G.player = makeShip(G.state.shipId, 0, 0, 0); G.mode = 'flight'; G.npcs = [];
      land(system().planets.find(p => p.name === body));
      return G.dialog ? G.dialog.event.title : null;
    },
    // Plays whatever storylet comes up here, picking the choice starting with `label`.
    play(where, label) {
      let s = null;
      for (let i = 0; i < 30 && !s; i++) { s = pickStorylet(where); if (s && s.id.startsWith('land-')) s = null; }
      if (!s) return null;
      const ch = storyletEvent(s).choices.filter(x => !x.role || roleSkill(x.role)).find(x => x.label.startsWith(label));
      if (!ch || (ch.can && !ch.can())) return `${s.id}: no "${label}"`;
      ch.run(); G.nextEvent = null;
      return s.id;
    },
    at(sid, planet) { G.state.systemId = sid; G.state.planet = planet; G.mode = 'landed'; G.transit = null; },
    // A bounty target beaten in a burn duel: the kill settles like any other.
    killBounty(sid) { const m = G.state.missions.find(x => x.type === 'bounty' && x.targetSystem === sid); settleKill(makeEnemy({ kind: 'bounty', mission: m }), true); },
    done(good) { const m = G.state.missions.find(x => x.good === good || x.targetName === good); Mods.emit('missionDone', m); G.state.missions = G.state.missions.filter(x => x !== m); },
    slicer(culture) { const c = makeCrewCandidate(culture); c.role = 'slicer'; c.skill = 2; registerPerson(c); G.state.crew.push(c.id); },
  };
};

test('Cold Water act 1: derelict, Voight, the agent, Mira, Europa', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    const o = {};
    S.reset();
    S.burn('mars'); startHappening(); o.early = G.dialog && G.dialog.event.title; S.arrive('Mars');
    G.state.day = 12; S.burn('earth'); startHappening(); o.derelict = G.dialog && G.dialog.event.title;
    S.choose(G.dialog.choices[0].label); o.s1 = story().stage;
    o.voight = S.arrive('Earth'); S.choose('"It is not for sale'); o.s2 = story().stage;
    takeOff(); Mods.emit('frame', 0.1); o.recovery = G.dialog && G.dialog.event.title;
    const rep = JSON.stringify(G.state.rep);
    S.choose('Battle stations');
    for (let i = 0; i < 80 && (G.dialog || G.nextEvent); i++) { if (!G.dialog) { finishEvent(); continue; } chooseEvent(0); finishEvent(); }
    Mods.emit('frame', 0.1);
    o.repKept = rep === JSON.stringify(G.state.rep);
    o.sameDay = S.land('earth', 'Earth');  // a landing scene may play, but not Mira
    S.burn('mars'); o.mira = S.arrive('Mars'); S.choose(G.dialog.choices[0].label);
    o.storyMission = G.state.missions.some(m => m.story);
    G.state.crew.push('rosa'); S.burn('jupiter'); startHappening(); o.miraScene = G.dialog.event.title; S.choose('[Rosa]');
    o.europa = S.arrive('Europa'); S.choose(G.dialog.choices[0].label); o.s5 = story().stage;
    // The other road: sell the core to Voight.
    S.reset(1); o.sold = S.land('earth', 'Earth'); S.choose('Sell it'); o.soldStage = story().stage;
    return o;
  });
  assert.notEqual(r.early, "The Persephone's Due", 'no derelict before day 10');
  assert.equal(r.derelict, "The Persephone's Due");
  assert.equal(r.s1, 1);
  assert.equal(r.voight, 'A Man From Aquilon');
  assert.equal(r.s2, 2);
  assert.equal(r.recovery, 'Aquilon Recovery Ship', 'Aquilon sends a recovery ship');
  assert.ok(r.repKept, 'fighting the recovery ship costs no standing');
  assert.notEqual(r.sameDay, 'Mira Castellane', 'Mira does not appear the same day');
  assert.equal(r.mira, 'Mira Castellane');
  assert.ok(r.storyMission);
  assert.equal(r.miraScene, "Mira's Story");
  assert.equal(r.europa, 'What the Core Says');
  assert.equal(r.s5, 5);
  assert.equal(r.soldStage, 'sold');
  await done();
});

test('Cold Water act 2: every side can be chosen', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    const o = {};
    // The Belt: proof to Ceres, water to Ceres, then Pallas.
    S.reset(5); S.land('ceres', 'Ceres Station'); S.choose('Give the proof');
    G.state.cargo.water = 25; G.state.paid.water = 2000; S.land('ceres', 'Ceres Station'); S.choose('Unload');
    G.state.crew.push('rosa'); S.burn('pallas'); S.arrive('Pallas Refinery'); S.choose('Tell them');
    o.belt = [story().stage, story().side];
    // Mars: needs standing, then Hermes Foundry and Phobos.
    S.reset(5); G.state.rep['Mars Republic'] = 20; S.land('mars', 'Mars'); S.choose('Give the proof');
    S.burn('mercury'); S.arrive('Hermes Foundry'); S.choose('Bribe');
    G.state.crew.push('dima'); S.burn('mars'); S.arrive('Phobos Yards'); S.choose('Take');
    o.mars = [story().stage, story().side];
    // Earth: Luna, then carry the contact back from Europa.
    S.reset('earth1'); G.state.crew.push('kit');
    S.land('jupiter', 'Europa'); S.choose('"Come to Luna');
    S.burn('earth'); S.arrive('Luna'); S.choose('Collect');
    o.earth = [story().stage, story().side];
    // Aquilon: sell the proof at Hermes Foundry, then turn them in at Ceres.
    S.reset(5); S.land('mercury', 'Hermes Foundry'); S.choose('Sell the proof');
    S.burn('ceres'); S.arrive('Ceres Station'); S.choose('Turn them in');
    o.turned = [story().stage, story().side];
    return o;
  });
  assert.deepEqual(r.belt, ['act2', 'belt']);
  assert.deepEqual(r.mars, ['act2', 'mars']);
  assert.deepEqual(r.earth, ['act2', 'earth']);
  assert.equal(r.turned[0], 'belt2', 'turning Aquilon in puts you on the Belt road');
  await done();
});

test('Cold Water act 3: each side reaches its ending at Ceres', async () => {
  const { page, ev, done } = await open();
  await ev(helpers);
  for (const [side, pick] of [['belt', 'Unload'], ['mars', 'Publish'], ['earth', 'Hand the water'], ['aquilon', 'Sell it']]) {
    const r = await ev(([side, pick]) => {
      const o = {};
      S.reset('act2', { side, act2Day: 20 }); G.state.shipId = 'gunship'; G.state.day = 22;
      o.early = S.land('earth', 'Earth');
      G.state.day = 26; o.briefing = S.land('earth', 'Earth'); S.choose('Understood');
      S.at('ceres', 'Ceres Station'); takeOff(); Mods.emit('frame', 0.1);
      o.blockade = G.dialog && G.dialog.event.title;
      G.dialog = null; G.pendingScene = null; story().blockadeCleared = true; G.npcs = [];  // the fights have their own test
      G.state.cargo.water = 30; G.state.paid.water = 3000; G.state.crew = ['rosa', 'kit'];
      S.land('ceres', 'Ceres Station'); S.choose(pick);
      o.epilogue = G.dialog && G.dialog.event.title;
      S.choose('Keep flying');
      o.ending = story().ending;
      return o;
    }, [side, pick]);
    assert.equal(r.early, null, `${side}: nothing before the briefing day`);
    assert.ok(r.briefing, `${side}: briefing`);
    assert.ok(r.blockade, `${side}: the blockade is waiting`);
    assert.ok(r.epilogue, `${side}: epilogue`);
    assert.ok(r.ending, `${side}: an ending is recorded`);
  }
  // The epilogue can be read again from the port.
  await ev(() => UI.render());
  await page.click('[data-action=epilogue]');
  assert.ok(await ev(() => !!G.dialog));
  await done();
});

test("the Ice Haulers' Strike plays to its end", async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    S.reset(); const st = G.state; st.day = 12; st.story.next = 1e9; st.credits = 30000; st.shipId = 'shuttle';
    S.slicer('earth');
    S.burn('ceres');
    let s = null; for (let i = 0; i < 60 && !s; i++) { const x = pickStorylet('transit'); if (x && x.id.startsWith('strike')) s = x; }
    openEvent(storyletEvent(s)); const first = G.dialog.event.title; S.choose('Send 2,000');
    S.arrive('Ceres Station'); const ceres = G.dialog && G.dialog.event.title; S.choose('Carry them (8t');
    S.burn('pallas'); startHappening(); if (G.dialog) S.choose(G.dialog.choices[0].label);
    S.arrive('Pallas Refinery'); if (G.dialog) S.choose(G.dialog.choices[G.dialog.choices.length - 1].label);
    return { first, ceres, done: quality('strikeDone'), journal: st.journal.length };
  });
  assert.equal(r.first, 'Picket Line on the Band');
  assert.ok(r.ceres, 'a scene at Ceres');
  assert.ok(r.done, `strike finished (${JSON.stringify(r)})`);
  await done();
});

test('the Mars Navy commission runs start to finish', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    S.reset(); const st = G.state; st.story.next = 1e9; st.day = 20; st.rep['Mars Republic'] = 20; S.slicer('mars');
    S.at('mars', 'Mars');
    const steps = [S.play('port', 'Accept'), S.play('port', 'Take the hunt')];
    S.at('pallas', 'Pallas Refinery'); const target = G.state.missions.some(m => m.type === 'bounty' && m.targetSystem === 'pallas'); S.killBounty('pallas');
    G.mode = 'landed'; G.transit = { to: 'mars', total: 60, left: 30, flipped: true, event: null, comms: [] };
    steps.push(S.play('transit', 'Fatima'));
    S.at('mars', 'Mars'); steps.push(S.play('port', 'Carry the pouch'));
    S.done('sealed MCRN pouch');
    steps.push(S.play('port', 'Refuse'), S.play('port', ''));
    return { steps, target: !!target, done: quality('mcrnDone') };
  });
  assert.ok(r.target, 'the hunt is posted');
  assert.ok(r.done, `commission complete (${r.steps.join(', ')})`);
  await done();
});

test("the Rook's Crown by blood and by coin; Navy officers are never invited", async () => {
  const { ev, done } = await open();
  await ev(helpers);
  for (const path of ['blood', 'coin']) {
    const r = await ev(path => {
      S.reset(); const st = G.state; st.story.next = 1e9; st.day = 25; st.credits = 60000; S.slicer('belt');
      const steps = [];
      S.at('hygiea', 'The Rook'); steps.push(S.play('port', 'Fly under'));
      steps.push(S.play('port', 'Run the crates'));
      G.transit = { to: 'ceres', total: 60, left: 30, flipped: true, event: null, comms: [] };
      steps.push(S.play('transit', path === 'blood' ? 'Fatima' : 'Bribe'));
      G.transit = null; S.done('unmarked crates');
      S.at('hygiea', 'The Rook'); steps.push(S.play('port', path === 'blood' ? 'Hunt' : 'Buy her off'));
      if (path === 'blood') { st.systemId = 'saturn'; S.killBounty('saturn'); }
      S.at('hygiea', 'The Rook');
      const mars = danger('mars');
      steps.push(S.play('port', 'Raid the Martian'));
      const raided = danger('mars') > mars;
      steps.push(S.play('port', 'Take the chair'));
      return { steps, raided, done: quality('crownDone') };
    }, path);
    assert.ok(r.raided, `${path}: the raid raises unrest at Mars`);
    assert.ok(r.done, `${path}: crown taken (${r.steps.join(', ')})`);
  }
  const invited = await ev(() => { S.reset(); G.state.qualities = { mcrn: 1 }; G.state.day = 30; S.at('hygiea', 'The Rook'); return meets({ ...STORYLETS.find(x => x.id === 'rook-invite').when, chance: 1 }); });
  assert.equal(invited, false);
  await done();
});

test('the Tethys Consortium, loyal and leaking', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  for (const loyal of [true, false]) {
    const r = await ev(loyal => {
      S.reset(); const st = G.state; st.story.next = 1e9; st.day = 35; st.credits = 300000;
      S.at('saturn', 'Titan');
      const noShip = S.play('port', 'Sign');
      buyCompanyShip('lightfreighter');
      const steps = [S.play('port', 'Sign'), S.play('port', 'Take the cryo')];
      S.done('Consortium cryo-cells');
      G.transit = { to: 'saturn', total: 60, left: 30, flipped: true, event: null, comms: [] };
      steps.push(S.play('transit', loyal ? 'Report' : 'Sell the codes'));
      G.transit = null;
      steps.push(S.play('port', 'Agree'));
      S.at('ceres', 'Ceres Station'); buyStake(); buyStake();
      S.at('saturn', 'Titan');
      steps.push(S.play('port', 'Hand over'), S.play('port', loyal ? 'Take your chair' : 'Say nothing'));
      return { noShip, steps, done: quality('tscDone') };
    }, loyal);
    assert.match(String(r.noShip), /no "Sign"|^null$/, 'needs a company ship first');
    assert.ok(r.done, `${loyal ? 'loyal' : 'leak'}: finished (${r.steps.join(', ')})`);
  }
  await done();
});

test('every storylet opens and every choice plays, with no unfilled text', async () => {
  const { ev, done } = await open();
  const bad = await ev(() => {
    const bad = [], odd = t => /undefined|NaN|\[object|\{[a-z]+\}/.test(t);
    const fresh = () => {
      localStorage.clear(); newGame(); while (G.dialog) finishEvent();
      const st = G.state; st.tutorial = null; st.credits = 100000; st.shipId = 'freighter'; st.day = 60;
      st.cargo = { water: 20, medical: 10, luxury: 10, food: 10, equipment: 10 };
      st.crew.push('rosa', 'kit');
      for (const role of ['slicer', 'medic', 'pilot']) { const c = makeCrewCandidate('belt'); c.role = role; c.skill = 2; registerPerson(c); st.crew.push(c.id); }
    };
    for (const s of STORYLETS) {
      fresh();
      const n = storyletEvent(s).choices.length;
      for (let i = 0; i < n; i++) {
        fresh();
        const ev = storyletEvent(s), c = ev.choices[i];
        if (odd((ev.title + ' ' + ev.text + ' ' + c.label).replace(/\{crew\}/g, 'X'))) bad.push(`${s.id}: ${(ev.text + ' | ' + c.label).slice(0, 100)}`);
        try {
          const r = String(c.run()); if (odd(r.replace(/\{crew\}/g, 'X'))) bad.push(`${s.id}#${i}: ${r.slice(0, 100)}`);
          if (G.nextEvent) G.nextEvent = null;
        } catch (e) { bad.push(`${s.id}#${i} threw: ${e.message}`); }
        if (!Number.isFinite(G.state.credits) || !Number.isFinite(G.state.fuel)) bad.push(`${s.id}#${i}: credits or fuel not a number`);
      }
    }
    return bad;
  });
  assert.deepEqual(bad, []);
  await done();
});

test('a story scene comes before anything else at a landing, and the cat waits', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    S.reset(); const st = G.state; st.day = 12; st.story.next = 1e9; st.shipId = 'shuttle';
    st.qualities = { strike: 1 };  // the Ceres strike scene is ready
    home().cat = null;             // and the cat is about to come aboard
    const first = [];
    for (let i = 0; i < 100; i++) {
      while (G.dialog) finishEvent(); G.nextEvent = null; delete st.qualities['seen:strike-ceres'];
      S.land('ceres', 'Ceres Station');
      first.push(G.dialog && G.dialog.event.title);
    }
    return { first, cat: !!home().cat };
  });
  assert.ok(r.first.every(t => t && t !== 'Stowaway'), `the strike scene always came first (${[...new Set(r.first)]})`);
  assert.equal(r.cat, false, 'the cat did not squeeze in');
  await done();
});

test('a story scene on a burn beats a relationship scene', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    S.reset(); const st = G.state; st.day = 12; st.story.next = 1e9;
    uatCrew(3, 2);
    st.qualities = {};
    STORYLETS.push({ id: 'test-story', where: 'transit', priority: 1, when: {}, title: 'Test story', text: 'x', choices: [{ label: 'Ok', effects: {} }] });
    const seen = new Set();
    for (let i = 0; i < 60; i++) {
      while (G.dialog) finishEvent();
      S.burn('ceres'); startHappening();
      seen.add(G.dialog && G.dialog.event.title);
    }
    STORYLETS.pop();
    return [...seen];
  });
  assert.ok(r.includes('Test story') && r.every(t => ['Test story', 'Picket Line on the Band'].includes(t)), `only story scenes play (${r})`);
  await done();
});

// The set pieces on the console: with a crewed gunner, the recovery ship and the blockade are scenes
// and duels; without one they are ships in local space, as before.
const consoleHelpers = () => {
  window.hireGunner = () => { const c = makeCrewCandidate('belt'); c.role = 'gunner'; c.skill = 2; c.mood = null; registerPerson(c); G.state.crew.push(c.id); };
  window.playOut = () => { for (let i = 0; i < 80 && (G.dialog || G.nextEvent); i++) { if (!G.dialog) { finishEvent(); continue; } chooseEvent(0); finishEvent(); } Mods.emit('frame', 0.1); };
};

test('the recovery ship on the console: a scene with a way out, and a fight settled there', async () => {
  const { ev, done } = await open();
  await ev(helpers); await ev(consoleHelpers);
  const r = await ev(() => {
    S.reset(2); const st = G.state, out = {};
    // Solo: the same scene, and you take the guns.
    S.land('earth', 'Earth'); takeOff(); G.npcs = []; Mods.emit('frame', 0.1);
    out.solo = { agents: G.npcs.filter(n => n.kind === 'agent').length, title: G.dialog && G.dialog.event.title, fight: G.dialog.choices.find(c => /^Battle/.test(c.label)).label };
    G.dialog = null; G.pendingScene = null;
    // Crewed gunner: a scene, and no ship.
    S.reset(2); hireGunner();
    S.land('earth', 'Earth'); takeOff(); G.npcs = []; Mods.emit('frame', 0.1);
    out.scene = { title: G.dialog && G.dialog.event.title, mode: G.mode, agents: G.npcs.filter(n => n.kind === 'agent').length, labels: G.dialog.choices.map(c => c.label), via: G.dialog.event.via };
    // Hand over the core: the story moves on, and there is no fight.
    S.choose('Hand over the core'); Mods.emit('frame', 0.1);
    out.sold = { stage: story().stage, fight: !!G.storyFight, mode: G.mode };
    // The other way: fight it out, on the console, and be back in flight after.
    S.reset(2); hireGunner(); st.credits = 50000; st.armor = ship().armor;
    S.land('earth', 'Earth'); takeOff(); G.npcs = []; Mods.emit('frame', 0.1);
    S.choose('Battle stations');
    out.fighting = { duel: !!G.duel, name: G.duel && G.duel.foe.name, story: G.duel && G.duel.foe.story };
    playOut();
    out.after = { duel: G.duel, fight: G.storyFight, mode: G.mode, dialog: !!G.dialog, armor: st.armor >= 1 };
    return out;
  });
  assert.equal(r.solo.agents, 0, 'no ship in local space, gunner or not'); assert.equal(r.solo.title, 'Aquilon Recovery Ship');
  assert.match(r.solo.fight, /you take the guns/);
  assert.equal(r.scene.title, 'Aquilon Recovery Ship'); assert.equal(r.scene.mode, 'hail'); assert.equal(r.scene.agents, 0); assert.equal(r.scene.via, 'ship');
  assert.ok(r.scene.labels.some(l => /Hand over the core/.test(l)) && r.scene.labels.some(l => /outrun/.test(l)));
  assert.deepEqual(r.sold, { stage: 'sold', fight: false, mode: 'flight' });
  assert.match(r.fighting.name, /Quiet Ledger/); assert.ok(r.fighting.story);
  assert.deepEqual(r.after, { duel: null, fight: null, mode: 'flight', dialog: false, armor: true }, 'the fight ends and the ship flies on');
  await done();
});

test('the blockade on the console: a scene at arrival, a gate at the dock, two fights, or a cold approach', async () => {
  const { ev, done } = await open();
  await ev(helpers); await ev(consoleHelpers);
  const r = await ev(() => {
    S.reset('act3', { side: 'belt' }); const st = G.state, out = {}; hireGunner();
    st.cargo.water = 20; st.systemId = 'ceres'; G.transit = null; G.mode = 'flight';
    const station = system().planets[0]; G.player = makeShip(st.shipId, station.x + 300, station.y, 0); G.npcs = [];
    populateSystem(); Mods.emit('frame', 0.1);
    out.arrival = { title: G.dialog && G.dialog.event.title, ships: G.npcs.filter(n => n.blockade).length, mode: G.mode, labels: G.dialog.choices.map(c => c.label) };
    S.choose('Stay clear'); Mods.emit('frame', 0.1);
    out.clear0 = { cleared: !!story().blockadeCleared, mode: G.mode };
    // Docking is gated until the blockade is broken.
    Object.assign(G.player, { x: station.x + station.r * 0.5, y: station.y, vx: 0, vy: 0 });
    tryLand(); out.gate = { title: G.dialog && G.dialog.event.title, mode: G.mode };
    S.choose('Stay clear');
    // The gauntlet: two fights, in turn. Win each (the duel itself is covered elsewhere), and it is clear.
    populateSystem(); Mods.emit('frame', 0.1); S.choose('Run the blockade');
    const first = G.duel && G.duel.foe.name; G.dialog = null; G.nextEvent = null; G.duel.foeHp = 0;
    Mods.emit('frame', 0.1);  // fight one is won: the second opens
    const second = G.duel && G.duel.foe.name; out.chain = { first, second, cleared: !!story().blockadeCleared, dialog: !!G.dialog };
    G.dialog = null; G.nextEvent = null; G.duel.foeHp = 0; Mods.emit('frame', 0.1);
    out.won = { cleared: !!story().blockadeCleared, title: G.dialog && G.dialog.event.title };
    while (G.dialog) finishEvent();
    tryLand(); out.docked = { mode: G.mode, planet: st.planet };
    // Another run at it: a cold approach, which can work, without a fight.
    G.duel = null; G.storyFight = null; S.reset('act3', { side: 'mars' }); hireGunner(); const st2 = G.state; st2.cargo.water = 20; st2.systemId = 'ceres'; G.mode = 'flight'; G.npcs = [];
    G.player = makeShip(st2.shipId, station.x + 300, station.y, 0); populateSystem(); Mods.emit('frame', 0.1);
    const real = Math.random; Math.random = () => 0; S.choose('Slip in'); Math.random = real;
    out.cold = { cleared: !!story().blockadeCleared, duel: !!G.duel };
    return out;
  });
  assert.equal(r.arrival.title, 'The Blockade of Ceres'); assert.equal(r.arrival.ships, 0, 'no ships in local space'); assert.equal(r.arrival.mode, 'hail');
  assert.ok(r.arrival.labels.some(l => /Run the blockade/.test(l)) && r.arrival.labels.some(l => /Slip in/.test(l)));
  assert.deepEqual(r.clear0, { cleared: false, mode: 'flight' });
  assert.deepEqual(r.gate, { title: 'The Blockade of Ceres', mode: 'hail' }, 'trying to dock reopens the blockade');
  assert.notEqual(r.chain.first, r.chain.second, 'two different ships, one after the other'); assert.equal(r.chain.cleared, false);
  assert.ok(r.won.cleared && r.won.title === 'The Blockade Breaks');
  assert.deepEqual(r.docked, { mode: 'landed', planet: 'Ceres Station' }, 'and then the dock is open');
  assert.deepEqual(r.cold, { cleared: true, duel: false });
  await done();
});
