'use strict';

// Tester tools for acceptance testing: jump straight into any feature without playing
// up to it. Open with Shift+U, or tap the date in the port header five times (phones),
// or add #uat to the address. Each checklist item sets up a fresh game in the right
// situation and says what to check; Pass/Fail and a note are kept in this browser and
// can be copied as a report. General tools cover money, time, places, ships, and
// playing any scene by id. Your real save is backed up the first time the panel opens
// and can be restored from it. Loaded before game.js; only calls into it at runtime.

const UAT_KEY = 'maxGravity.uat.results', UAT_BACKUP = 'maxGravity.save.uatBackup';

// ---------- set-up helpers ----------
function uatFresh(o = {}) {
  G.dialog = null; G.nextEvent = null; G.transit = null;
  newGame();
  const st = G.state;
  Object.assign(st, { tutorial: null, credits: o.credits || 500000, shipId: o.ship || 'lightfreighter', uat: true });  // a test game, never backed up
  st.story.next = 1e9;                       // keep the Cold Water derelict out of the way
  st.fuel = SHIPS[st.shipId].fuel; st.armor = SHIPS[st.shipId].armor;
  if (o.cargo) Object.assign(st.cargo, o.cargo);
  if (o.launcher) { st.outfits.launcher = 1; st.torpedoes = 6; }
  G.dialog = null;
  return st;
}
function uatCrew(n = 2, opinion = 0) {
  const st = G.state, out = [];
  for (let i = 0; i < n; i++) {
    const c = makeCrewCandidate(pick(['ceres', 'mars', 'earth']));
    c.role = ['engineer', 'pilot', 'medic', 'gunner'][i % 4]; c.skill = 2; c.opinion = opinion;
    registerPerson(c); st.crew.push(c.id); out.push(c);
  }
  return out;
}
function uatPassenger(dest = 'mars', planet = 'Mars', opinion = 0) {
  const st = G.state, p = registerPerson(makePerson('belt'));
  p.opinion = opinion;
  st.missions.push({ id: st.nextId++, type: 'passenger', pid: p.id, who: `${p.first} ${p.last}`, pax: 1, bonus: 0, destSystem: dest, destPlanet: planet, title: `Carry ${p.first} ${p.last} (1) to ${planet}`, pay: 20000, deadline: st.day + 60, eventDone: true });
  return p;
}
function uatLand(name) {
  const at = planetNamed(name), st = G.state;
  st.systemId = at.sid; st.planet = at.pl.name;
  G.transit = null; G.dialog = null;
  resetWorld();
  landAt(at.pl, []);
  while (G.dialog) { G.dialog = null; }  // no landing scene on top of the test
  UI.show();
}
function uatBurn(from, to, { quiet = true } = {}) {
  uatLand(from);
  takeOff();
  G.state.dest = to;
  G.player.x = 6000; G.player.y = 0;
  tryBurn(); enterTransit();
  if (quiet) { G.transit.times = []; G.transit.interceptPlanned = true; }
  UI.hide();
}
const uatScene = id => { const s = STORYLETS.find(x => x.id === id); if (s) openEvent(storyletEvent(s)); };

// ---------- the checklist ----------
const UAT_ITEMS = [
  { group: 'Basics', id: 'trade', title: 'Trading and markets', check: 'Buying raises the price and selling lowers it. Best market column makes sense. Port conditions show shortages with haulers inbound.',
    setup() { uatFresh({ credits: 500000 }); uatLand('Earth'); UI.tab = 'trade'; UI.render(); } },
  { group: 'Basics', id: 'tutorial', title: 'Tutorial', check: 'A new player is walked through an Earth-to-Mars electronics run.',
    setup() { G.dialog = null; newGame(); G.state.uat = true; } },
  { group: 'Basics', id: 'company', title: 'Company ships, escorts, stakes', check: 'Buy a company ship at the shipyard, set a route, fly with an escort, buy a stake from the Port page.',
    setup() { uatFresh({ credits: 4000000 }); uatLand('Earth'); UI.tab = 'shipyard'; UI.render(); } },
  { group: 'Life aboard', id: 'transit', title: 'Transit screen and downtime', check: 'Cutaway, route strip, star streaks, feed chatter. The downtime menu lists every activity and each one works.',
    setup() { uatFresh(); uatCrew(2, 2); uatPassenger(); uatBurn('Earth', 'mars'); G.transit.left = G.transit.total * 0.7; } },
  { group: 'Life aboard', id: 'relationships', title: 'Relationship scene', check: 'A scene between two crew opens and reads naturally. Afterwards the Crew page shows their bond.',
    setup() { uatFresh(); const [a, b] = uatCrew(2, 3); addBond({ id: a.id }, { id: b.id }, 6); uatBurn('Earth', 'mars'); const ev = relationshipScene(); if (ev) openEvent(ev); } },
  { group: 'Life aboard', id: 'sit', title: 'Sit with someone (personal story)', check: 'Each talk reveals more: home, who they miss, their hope, then a favor. The favor adds a mission; keeping it makes them loyal.',
    setup() { uatFresh(); uatCrew(2, 6); uatBurn('Earth', 'mars'); openEvent(sitPicker()); } },
  { group: 'Life aboard', id: 'birthday', title: 'Birthday', check: 'The party, gift, and quiet-drink choices all work and feel warm.',
    setup() { uatFresh({ cargo: { luxury: 2 } }); const [a] = uatCrew(2, 2); uatBurn('Earth', 'mars'); openEvent(occasionEvent({ kind: 'birthday', id: a.id, day: G.state.day + 1 })); } },
  { group: 'Life aboard', id: 'holiday', title: 'Holiday (First Water)', check: 'The crew member from the Belt leads the holiday; joining in brings the crew closer.',
    setup() { uatFresh(); const [a] = uatCrew(2, 2); a.culture = 'belt'; a.home = 'Ceres Station'; uatBurn('Earth', 'mars'); openEvent(occasionEvent({ kind: 'holiday', h: HOLIDAYS[2], id: a.id, day: G.state.day + 1, year: 2214 })); } },
  { group: 'Life aboard', id: 'letter', title: 'Bad news from home', check: 'The crew member is shown as having a hard time (Crew page), works a skill lower, and the choices help.',
    setup() { uatFresh(); const [a] = uatCrew(2, 2); a.news = { good: false, text: `their ${missed(a)} is sick, and the clinic wants money up front` }; a.mood = { kind: 'low', until: G.state.day + 25 }; uatBurn('Earth', 'mars'); openEvent(newsEvent(a)); } },
  { group: 'Life aboard', id: 'tradition', title: 'A new tradition', check: 'Adopting it adds it to the Crew page, and it repeats at its moment on later burns.',
    setup() { uatFresh(); uatCrew(2, 2); uatBurn('Earth', 'mars'); home().burns = 3; openEvent(traditionEvent()); } },
  { group: 'Life aboard', id: 'cat', title: 'The ship\'s cat', check: 'Adopting the cat names it; it then wanders the cutaway on the next burn and turns up in chatter.',
    setup() { uatFresh(); uatCrew(2, 2); uatLand('Ring Nine'); openEvent(catEvent()); } },
  { group: 'Life aboard', id: 'join', title: 'A passenger asks to join', check: 'Welcoming them adds them to the crew in a sensible role.',
    setup() { uatFresh(); uatLand('Mars'); const p = registerPerson(makePerson('mars')); p.job = 'nurse'; p.opinion = 5; openEvent(joinEvent(p)); } },
  { group: 'Life aboard', id: 'rename', title: 'Name the ship', check: 'Renaming from the Crew page changes the port header and the transit title.',
    setup() { uatFresh(); uatLand('Earth'); UI.tab = 'crew'; UI.render(); } },
  { group: 'Ports', id: 'bar', title: 'The bar', check: 'The bar has a name and mood. Talking to patrons, buying a drink, cards, offering passage, and buying a round all work.',
    setup() { uatFresh(); uatCrew(2); uatLand('Boneyard'); UI.tab = 'bar'; UI.render(); } },
  { group: 'Ports', id: 'landing', title: 'Landing scenes', check: 'A landing scene opens (a random one each time) and its choices work. Use Play a scene below for a specific one.',
    setup() { uatFresh({ cargo: { luxury: 3, water: 10, medical: 3 } }); uatCrew(3); uatLand('Juno Commons'); uatScene(pick(STORYLETS.filter(s => s.id.startsWith('land-'))).id); } },
  { group: 'Ports', id: 'belt', title: 'Belt communities on the map', check: 'Ring Nine, The Hollows, Boneyard, Ironheart, Juno Commons, and Eros Old Town are on the map and can be visited.',
    setup() { uatFresh({ ship: 'courier' }); uatLand('Ceres Station'); openMap(); } },
  { group: 'Combat', id: 'contact', title: 'Pirate contact during a burn', check: 'The contact offers battle stations, a hard burn, and a payoff. Battle stations opens the fight.',
    setup() { uatFresh({ launcher: true, ship: 'courier' }); uatBurn('The Rook', 'ceres'); openEvent(contactEvent({ kind: 'pirate' })); } },
  { group: 'Combat', id: 'duel', title: 'Console duel', check: 'Threat and answer: your hand only offers cards you hold, a stopped threat passes the initiative, and the fight ends in eight exchanges or fewer. With no gunner aboard, you take the guns yourself.',
    setup() { uatFresh({ launcher: true, ship: 'courier' }); G.state.torpedoes = 3; uatBurn('The Rook', 'ceres'); startDuel({ kind: 'pirate' }, false); finishEvent(); } },
  { group: 'Combat', id: 'board', title: 'Boarding after a duel', check: 'A beaten pirate drifts, disabled: board her, finish her, or leave her. Boarding offers her strongbox or the ship as a prize.',
    setup() { uatFresh({
      launcher: true,
      ship: 'courier'
    }); uatBurn('The Rook', 'ceres'); startDuel({ kind: 'pirate' }, false); G.nextEvent = null; G.duel.foeHp = 1; G.duel.init = 'me'; G.duel.me.threat.hand[0] = 'torp'; G.duel.them.answer.hand = ['locks']; openEvent({
      title: 'Last exchange',
      text: 'Fire the torpedo.',
      choices: [{
      label: 'Torpedo',
      run: () => duelExchange('torp', 'locks')
    }]
    }); } },
  { group: 'Combat', id: 'local', title: 'Combat in local space', check: 'Pirates attack in local space; torpedoes and point defense work.',
    setup() { uatFresh({ launcher: true, ship: 'gunship' }); uatLand('The Rook'); takeOff(); for (let i = 0; i < 2; i++) { const n = spawnNpc('pirate', false); n.hostile = true; } } },
  { group: 'Frontier', id: 'claim', title: 'Found an outpost', check: 'Claim Callisto at Ganymede, fly there, deliver supplies (capped at 30 days), and build.',
    setup() { uatFresh({ credits: 1500000, ship: 'freighter', cargo: { industrial: 40, equipment: 20, metal: 30, food: 15, water: 15 } }); uatLand('Ganymede'); } },
  { group: 'Frontier', id: 'outpost', title: 'A growing outpost', check: 'The First Born moment opens on landing; the outpost page shows supplies, income, and buildings.',
    setup() { uatFresh({ credits: 1500000, ship: 'freighter', cargo: { industrial: 30, equipment: 20, metal: 40 } }); found('Callisto', 'Test Landing'); G.state.outpost.pop = 70; uatLand('Callisto'); const m = MOMENTS[0]; G.state.outpost.moments.push(0); openEvent(m.make(G.state.outpost)); } },
  { group: 'Frontier', id: 'death', title: 'Death and the heir', check: 'The death screen offers going on as your heir; the heir inherits the company and outpost.',
    setup() { uatFresh({ cargo: { industrial: 20 } }); uatCrew(1); found('Callisto', 'Test Landing'); uatLand('Earth'); G.mode = 'dead'; UI.showDead(); } },
  { group: 'Frontier', id: 'retire', title: 'Retirement', check: 'Retire from the Company page; the successor takes the ship and crew, and the list of captains grows.',
    setup() { uatFresh(); uatCrew(2); uatLand('Earth'); UI.tab = 'company'; UI.render(); } },
  { group: 'Cold Water', id: 'cw-derelict', title: 'The derelict', check: 'The derelict scene opens; taking the core starts the story.',
    setup() { uatFresh(); uatBurn('Earth', 'mars'); G.state.story.next = 0; uatScene('cw-derelict'); } },
  { group: 'Cold Water', id: 'cw-mira', title: 'Mira\'s contact', check: 'Mira finds you and asks for passage to Europa.',
    setup() { uatFresh(); Object.assign(G.state.story, { stage: 3 }); uatLand('Mars'); uatScene('cw-mira-contact'); } },
  { group: 'Cold Water', id: 'cw-europa', title: 'Europa reveal', check: 'The core is decrypted on Europa and Act 1 ends.',
    setup() { uatFresh(); Object.assign(G.state.story, { stage: 4 }); storyPassenger('Mira Castellane', 1, 'jupiter', 'Europa', 30000, 'mira-europa'); uatLand('Europa'); uatScene('cw-europa'); } },
  { group: 'Cold Water', id: 'cw-contacts', title: 'Act 2: who gets the proof', check: 'At Ceres Station the League contact offers to take the proof.',
    setup() { uatFresh(); Object.assign(G.state.story, { stage: 5 }); uatLand('Ceres Station'); uatScene('cw-contact-ceres'); } },
  { group: 'Cold Water', id: 'cw-blockade', title: 'Act 3: the blockade', check: 'Arriving at Ceres, the blockade fleet engages; allies help; landing is allowed.',
    setup() { uatFresh({
      ship: 'gunship',
      launcher: true,
      classic: true,
      cargo: { water: 20 }
    }); Object.assign(G.state.story, {
      stage: 'act3',
      side: 'belt'
    }); uatLand('Pallas Refinery'); G.state.systemId = 'ceres'; G.player = makeShip(G.state.shipId, -1100, 0, 0); G.mode = 'flight'; UI.hide(); populateSystem(); } },
  { group: 'Cold Water', id: 'cw-finale', title: 'The final choice', check: 'Landing at Ceres Station with water opens the last choice, then the epilogue (which mentions the ship).',
    setup() { uatFresh({ cargo: { water: 25 } }); Object.assign(G.state.story, { stage: 'act3', side: 'mars' }); uatLand('Ceres Station'); uatScene('cw-final-mars'); } },
  { group: 'Campaigns', id: 'strike', title: 'Ice Haulers\' Strike', check: 'The Guild broadcast opens on a burn into the Belt.',
    setup() { uatFresh(); G.state.day = 15; uatBurn('Mars', 'ceres'); uatScene('strike-broadcast'); } },
  { group: 'Campaigns', id: 'navy', title: 'Reserve Commission', check: 'The Mars Navy offers a commission.',
    setup() { uatFresh(); G.state.rep['Dome Concord'] = 30; uatLand('Mars'); uatScene('navy-recruit'); } },
  { group: 'Campaigns', id: 'rook', title: 'The Rook\'s Crown', check: 'Hollis Mbeki invites you to fly under the Rook\'s colors.',
    setup() { uatFresh(); G.state.day = 25; uatLand('The Rook'); uatScene('rook-invite'); } },
  { group: 'Campaigns', id: 'tethys', title: 'The Partner\'s Chair', check: 'The Tethys Consortium invites you once you own a company ship.',
    setup() { uatFresh({ credits: 2000000 }); uatLand('Titan'); buyCompanyShip('freighter'); uatScene('tsc-invite'); } },
  { group: 'Community', id: 'community', title: 'Mods, scenarios, shared news', check: 'At the bottom of the Port page: load the Vesta mod, share and play a scenario, paste a code. On claude.ai, Share deeds sends your deeds.',
    setup() { uatFresh(); uatLand('Earth'); UI.tab = 'port'; UI.render(); } },
];

// ---------- the hired chapter (one set per authored captain) ----------
function uatHired(key) {
  G.dialog = null; G.nextEvent = null; G.transit = null;
  startGame({ slot: Saves.current, background: 'earth', captain: 'Tester', mode: 'hired', post: 'pilot', captainKey: key });
  G.state.uat = true;
  return G.state;
}
const uatFinish = () => { while (G.dialog) finishEvent(); };
UAT_ITEMS.push(...Object.entries(CAPTAINS).flatMap(([key, d]) => [
  { group: 'The hired chapter', id: `hired-${key}`, title: `Sign-on with ${d.first}`, check: 'The sign-on scene reads in the captain\'s voice and the first run is on the board. Help has a hand topic.',
    setup() { uatHired(key); } },
  { group: 'The hired chapter', id: `hired-${key}-xo`, title: `${d.first}'s first officer turns on you`, check: 'The first officer\'s pivot scene opens and its choices work; the crew screen shows their opinion of you.',
    setup() { uatHired(key); uatFinish(); openEvent(castScene(d.xo, CAST[d.xo].scenes.pivot)); } },
]));
UAT_ITEMS.push(
  { group: 'The hired chapter', id: 'hired-deal', title: 'The used Ore Runner', check: 'With enough savings at a yard port, the offer arrives and states the price; accepting or declining both work.',
    setup() { uatHired('hester'); uatFinish(); G.state.credits = USED_OFFER_AT; Mods.emit('landed', currentPlanet()); } },
  { group: 'The hired chapter', id: 'hired-goodbye', title: 'Buying in and the goodbye', check: 'Buying the ship runs the crew goodbyes and the captain\'s closing scene, then the ending.',
    setup() { uatHired('hester'); uatFinish(); G.state.credits = 1000000; hired().flags = { lent: true, secretKnown: true }; hired().confirm = 'courier'; Mods.act('buyInGo', 'courier'); } },
);

// ---------- the turn-based fights (#786): a hired hand at the guns, on a burn, in one situation ----------
function uatHand(post = 'gunner') {  // the tester items' hand is the gunner; the editor's preview can ask for another post
  G.dialog = null; G.nextEvent = null; G.transit = null;
  startGame({ slot: Saves.current, background: 'earth', captain: 'Tester', mode: 'hired', post, captainKey: 'hester' });
  uatFinish();
  const st = G.state; st.uat = true; st.story.next = 1e9; hired().raidTold = true; hired().deckTold = true;  // the first fight's explanation is for real play
  uatBurn('Ceres Station', 'pallas'); G.dialog = null;
  return st;
}
// The ship fight with her given: her ship, her grade and a consort. The game's own draws for them are put back after.
function uatShipFight(spec, { ship, grade = 0, pack = false } = {}) {
  const make = makeEnemy, rate = rateFoe;
  makeEnemy = sp => { const f = make(sp); if (ship) Object.assign(f, { shipId: ship, armor: SHIPS[ship].armor, maxArmor: SHIPS[ship].armor }); return f; };
  rateFoe = s => { rate(s); s.edge += (s.pack ? 1 : 0) - (pack ? 1 : 0); s.grade = grade; s.pack = pack; };  // a pack starts a volley behind, as rateFoe has it
  try { startShipFight(spec, false); } finally { makeEnemy = make; rateFoe = rate; }
  const e = G.nextEvent; G.nextEvent = null; openEvent(e);
}
const uatRaider = () => Object.assign(makeEnemy({ kind: 'pirate' }), { shipId: 'raider', armor: SHIPS.raider.armor, maxArmor: SHIPS.raider.armor });
// Late in the chapter (about 240 days on): the gunner at the top level with the guns boresighted, the valve keys carried, and a crew who are friends and a level better.
function uatLate() {
  const st = G.state, c = career();
  c.skill = { ...(c.skill || {}), gunner: SKILL_STEPS[SKILL_STEPS.length - 1] }; c.kit = ['valve-keys'];
  postState('gunner').sighted = true; st.day += 240;
  for (const p of st.crew.map(person).filter(Boolean)) { p.opinion = Math.max(p.opinion, OPINION.FRIEND); p.skill = Math.min(3, (p.skill || 1) + 1); }
}
// Each fight, early and late: the late one meets a crew a grade better (up to the top), as the lanes get worse.
const UAT_FIGHTS = [
  { id: 'fight-raider', title: 'A lone raider', check: 'The panel shows both ships\' bars, her next move and the captain\'s, and one order per gun. Setting a gun\'s target redraws in place; Fire plays a turn and adds a log line. Every gun at her hull, she is alongside and boards most of the time before the hull fire tells; at her guns, she boards or gets away with her guns gone; at her lock while she closes (or her drive first), she cannot board, and she breaks off or is left dead in space by the eighth turn.',
    run: g => uatShipFight({ kind: 'pirate' }, { ship: 'raider', grade: g }) },
  { id: 'fight-pack', title: 'Two raiders in company', check: 'Both are on the board with their own bars and moves, and you start a volley behind. Once the first is crippled, a shot at her hull or lock goes to the consort and the log says so.',
    run: g => uatShipFight({ kind: 'pirate' }, { ship: 'raider', grade: g, pack: true }) },
  { id: 'fight-veteran', title: 'A veteran corsair, with torpedoes aboard', check: 'The opening names a veteran crew; her bars are longer and her volleys harder. The torpedo order shows while torpedoes are left, and a torpedo hits harder than a gun.', grade: 2,
    prep: () => { const st = G.state; st.outfits.launcher = 1; st.torpedoes = 6; },  // the loadout, before the fight (prep: what the hand brings to it)
    run: g => uatShipFight({ kind: 'pirate' }, { ship: 'corsair', grade: g }) },
  { id: 'fight-patrol', title: 'A navy stop', check: 'Firing on her costs standing with her government. She is never boarded, and crippled she calls the stop off.', grade: null,
    run: () => uatShipFight({ kind: 'patrol', gov: 'Arcology Compact' }) },
  { id: 'deck-repel', title: 'Being boarded', check: 'The deck cutaway shows heads and cover by section, where you stand, their next move (a push marked may feint above grade 0) and Turn n of 8. Stand or move, shoot, steady, cover once, and one crew order all work; it ends repelled or taken through the usual scenes.', grade: 1,
    run: g => openEvent(repelEvent({ foe: uatRaider(), foeHp: 0, init: 'foe', grade: g, pack: false }, 'full')) },
  { id: 'deck-navy', title: 'Boarded by a navy patrol', check: 'The deck names the boarding party, with Turn n of 5, and the standing line under it (what each head put down costs with her government). Hold fire is an order. They never feint, rush or charge. At turn 5 they withdraw and the citation (the heave-to\'s fine) is charged; if you let them take the bridge they search the ship and fine it.', grade: 1,
    run: g => openEvent(repelEvent({ foe: makeEnemy({ kind: 'patrol', gov: 'Arcology Compact', shipId: 'cutter' }), foeHp: 0, init: 'foe', grade: g, pack: false }, 'half')) },
  { id: 'deck-assault', title: 'Boarding a crippled ship', check: 'Dead in space gives her count, and Board her opens a fight of that count. On her deck your crew push from her lock to her bridge, and her cover is hers.',
    run: g => openEvent(deadInSpaceScene({ spec: { kind: 'pirate' }, foe: uatRaider(), grade: g, pack: false })) },
];
const UAT_LATE_CHECK = ' Late in the chapter: the gunner\'s level and the boresight show in your damage ranges, the valve keys add cover in the corridor, and a crewmate who is a friend takes the first hit meant for you.';
// One of the fights, early or late, from a fresh hand (at `post`, the gunner unless asked): the fight's own loadout (`prep`), then `ready` once the hand is set up and before
// the fight starts (the editor's preview sets the day and the turret there, and counts what the fight changes from it).
function uatFight(f, late, ready = () => {}, post = 'gunner') {
  uatHand(post);
  if (late) uatLate();
  if (f.prep) f.prep();
  ready();
  f.run(!late ? f.grade || 0 : f.grade === null ? 0 : Math.min(2, (f.grade || 0) + 1));
}
UAT_ITEMS.push(
  ...UAT_FIGHTS.map(f => ({ group: 'Turn-based fights', id: f.id, title: f.title, check: f.check, setup() { uatFight(f, false); } })),
  ...UAT_FIGHTS.map(f => ({ group: 'Turn-based fights, late chapter', id: `late-${f.id}`, title: `${f.title}, late`, check: f.check + UAT_LATE_CHECK, setup() { uatFight(f, true); } })),
);

// ---------- general tools ----------
const UAT_TOOLS = {
  cash: () => { G.state.credits += 500000; },
  refuel: () => { const st = G.state; st.fuel = ship().fuel; st.armor = ship().armor; if (G.player) { G.player.armor = G.player.maxArmor; G.player.shields = ship().shields; } },
  days: () => { const st = G.state; for (let i = 0; i < 10; i++) { st.day++; Mods.emit('newDay', st.day); } },
  cargo: () => { const st = G.state; for (const c of COMMODITIES) { const q = Math.min(20, cargoFree()); if (q > 0) st.cargo[c.id] = (st.cargo[c.id] || 0) + q; } },
  happen: () => { if (G.mode === 'transit' && !G.transit.event) startHappening(); },
  intercept: () => { if (G.mode === 'transit' && !G.transit.event) openEvent(contactEvent({ kind: 'pirate' })); },
  arrive: () => { if (G.mode === 'transit') { G.transit.left = 0.05; G.transit.times = []; } },
  restore: () => {
    try { const s = localStorage.getItem(UAT_BACKUP); if (s) { localStorage.setItem(Saves.key(Saves.current), s); G.dialog = null; G.transit = null; G.paused = false; loadGame(); } } catch (e) { /* storage blocked */ }
  },
};

// ---------- the panel ----------
const Uat = {
  open: false,
  results: store.get(UAT_KEY, {}),
  saveResults() { store.set(UAT_KEY, this.results); },
  toggle() {
    this.open = !this.open;
    if (this.open) {
      // Back up the real game each time the panel opens from it (never a test game).
      try { if (G.state && !G.state.uat) { save(); localStorage.setItem(UAT_BACKUP, localStorage.getItem(Saves.key(Saves.current))); } } catch (e) { /* storage blocked */ }
    }
    this.render();
  },
  report() {
    return UAT_ITEMS.map(i => { const r = this.results[i.id] || {}; return `${(r.status || 'untested').toUpperCase().padEnd(8)} ${i.group} / ${i.title}${r.note ? ` - ${r.note}` : ''}`; }).join('\n');
  },
  render() {
    let el = document.getElementById('uat');
    if (!this.open) { if (el) el.remove(); return; }
    if (!el) {
      el = Object.assign(document.createElement('div'), { id: 'uat' });
      document.body.appendChild(el);
      el.addEventListener('click', e => this.click(e));
      el.addEventListener('change', e => this.change(e));
      el.addEventListener('keydown', e => e.stopPropagation());  // typing a note must not fly the ship
    }
    const tested = UAT_ITEMS.filter(i => this.results[i.id] && this.results[i.id].status).length;
    let group = '';
    const items = UAT_ITEMS.map(i => {
      const r = this.results[i.id] || {}, head = i.group !== group ? `<h4>${(group = i.group)}</h4>` : '';
      return `${head}<div class="uat-item ${r.status || ''}"><div><b>${i.title}</b><div class="hint">${i.check}</div></div>
        <div class="uat-row"><button data-uat="setup" data-id="${i.id}">Set up</button><button data-uat="pass" data-id="${i.id}" class="${r.status === 'pass' ? 'on' : ''}">Pass</button><button data-uat="fail" data-id="${i.id}" class="${r.status === 'fail' ? 'on' : ''}">Fail</button></div>
        <input type="text" data-note="${i.id}" placeholder="Note" value="${esc(r.note || '')}"></div>`;
    }).join('');
    const places = Object.values(SYSTEMS).flatMap(s => s.planets.map(p => p.name));
    const scenes = STORYLETS.map(s => s.id).sort();
    el.innerHTML = `
      <div class="uat-head"><b>Tester tools</b> <span class="hint">${tested}/${UAT_ITEMS.length} checked</span><button data-uat="close">Close</button></div>
      <p class="hint">Each Set up starts a fresh game in the right spot. Your own game was backed up when this opened: <button data-uat="tool" data-id="restore">Restore my game</button></p>
      <div class="uat-row">
        <button data-uat="tool" data-id="cash">+500,000 cr</button><button data-uat="tool" data-id="refuel">Refuel and repair</button><button data-uat="tool" data-id="days">+10 days</button><button data-uat="tool" data-id="cargo">Fill hold</button>
        <button data-uat="tool" data-id="happen">Transit happening now</button><button data-uat="tool" data-id="intercept">Pirate contact now</button><button data-uat="tool" data-id="arrive">Arrive now</button>
      </div>
      <div class="uat-row"><select data-sel="place"><option value="">Land at...</option>${places.map(p => `<option>${esc(p)}</option>`).join('')}</select>
        <select data-sel="ship"><option value="">Switch ship...</option>${Object.keys(SHIPS).map(s => `<option value="${s}">${SHIPS[s].name}</option>`).join('')}</select>
        <select data-sel="scene"><option value="">Play a scene...</option>${scenes.map(s => `<option>${esc(s)}</option>`).join('')}</select></div>
      ${items}
      <h4>Report</h4>
      <textarea readonly rows="8" data-select>${esc(this.report())}</textarea>
      <div class="uat-row"><button data-uat="clear">Clear results</button><button data-uat="off">Turn tester tools off</button></div>`;
  },
  click(e) {
    const b = e.target.closest('[data-uat]');
    if (!b) return;
    const act = b.dataset.uat, id = b.dataset.id;
    if (act === 'close') return this.toggle();
    if (act === 'off') { uatOn = false; try { localStorage.removeItem('maxGravity.uat.on'); } catch (err) { /* ignore */ } this.open = false; uatButton(); return this.render(); }
    if (act === 'clear') { this.results = {}; this.saveResults(); return this.render(); }
    if (act === 'setup') {
      const item = UAT_ITEMS.find(i => i.id === id);
      try { item.setup(); } catch (err) { console.error(err); alertNote(`Set up failed: ${err.message}`); }
      this.open = false;  // get out of the way; Shift+U or the UAT button brings it back
    } else if (act === 'pass' || act === 'fail') {
      this.results[id] = { ...(this.results[id] || {}), status: act };
      this.saveResults();
    } else if (act === 'tool') {
      UAT_TOOLS[id]();
      if (G.mode === 'landed' && !G.dialog) UI.render();
    }
    this.render();
  },
  change(e) {
    const t = e.target;
    if (t.dataset.note) { this.results[t.dataset.note] = { ...(this.results[t.dataset.note] || {}), note: t.value.slice(0, 300) }; this.saveResults(); return this.render(); }
    const v = t.value;
    if (!v) return;
    if (t.dataset.sel === 'place') { uatLand(v); }
    else if (t.dataset.sel === 'ship') { const st = G.state; st.shipId = v; st.fuel = SHIPS[v].fuel; st.armor = SHIPS[v].armor; if (G.mode === 'landed') UI.render(); }
    else if (t.dataset.sel === 'scene') { G.dialog = null; uatScene(v); }
    this.render();
  },
};
const alertNote = text => msg(text);

// A small UAT button once tester tools are on, so phones can reopen the panel.
let uatOn = BUILD.dev && (() => { try { return localStorage.getItem('maxGravity.uat.on') === '1'; } catch (e) { return false; } })();
function uatButton() {
  let b = document.getElementById('uatBtn');
  if (!uatOn) { if (b) b.remove(); return; }
  if (!b) {
    b = Object.assign(document.createElement('button'), { id: 'uatBtn', textContent: 'UAT' });
    b.addEventListener('click', () => Uat.toggle());
    document.body.appendChild(b);
  }
}
function uatEnable() {
  if (!BUILD.dev) return;  // release builds keep the tester tools hidden
  uatOn = true;
  try { localStorage.setItem('maxGravity.uat.on', '1'); } catch (e) { /* session only */ }
  uatButton();
  if (!Uat.open) Uat.toggle();
}

Mods.register({
  id: 'uat', name: 'Tester tools', builtin: true,
  init(M) {
    if (/uat/i.test(location.hash) || /[?&]uat\b/i.test(location.search)) setTimeout(uatEnable, 0);
    window.addEventListener('keydown', e => { if (e.shiftKey && e.code === 'KeyU' && !e.repeat) uatEnable(); });
    // Phones: five quick taps on the date in the port header.
    let taps = [];
    document.addEventListener('click', e => {
      if (!e.target.closest('.stats')) return;
      const now = Date.now();
      taps = taps.filter(t => now - t < 2000).concat(now);
      if (taps.length >= 5) { taps = []; uatEnable(); }
    });
    uatButton();
  },
});
