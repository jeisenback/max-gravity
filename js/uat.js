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
  Object.assign(st, { tutorial: null, credits: o.credits || 50000, shipId: o.ship || 'lightfreighter', uat: true });  // a test game, never backed up
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
  st.missions.push({ id: st.nextId++, type: 'passenger', pid: p.id, who: `${p.first} ${p.last}`, pax: 1, bonus: 0, destSystem: dest, destPlanet: planet, title: `Carry ${p.first} ${p.last} (1) to ${planet}`, pay: 2000, deadline: st.day + 60, eventDone: true });
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
    setup() { uatFresh({ credits: 50000 }); uatLand('Earth'); UI.tab = 'trade'; UI.render(); } },
  { group: 'Basics', id: 'tutorial', title: 'Tutorial', check: 'A new player is walked through an Earth-to-Mars electronics run.',
    setup() { G.dialog = null; newGame(); G.state.uat = true; } },
  { group: 'Basics', id: 'company', title: 'Company ships, escorts, stakes', check: 'Buy a company ship at the shipyard, set a route, fly with an escort, buy a stake from the Port page.',
    setup() { uatFresh({ credits: 400000 }); uatLand('Earth'); UI.tab = 'shipyard'; UI.render(); } },
  { group: 'Life aboard', id: 'transit', title: 'Transit screen and downtime', check: 'Cutaway, route strip, star streaks, feed chatter. The downtime menu lists every activity and each one works.',
    setup() { uatFresh(); uatCrew(2, 2); uatPassenger(); uatBurn('Earth', 'mars'); G.transit.left = G.transit.total * 0.7; } },
  { group: 'Life aboard', id: 'relationships', title: 'Relationship scene', check: 'A scene between two crew opens and reads naturally. Afterwards the Crew page shows their bond.',
    setup() { uatFresh(); const [a, b] = uatCrew(2, 3); addBond({ id: a.id }, { id: b.id }, 6); uatBurn('Earth', 'mars'); const ev = relationshipScene(); if (ev) openEvent(ev); } },
  { group: 'Life aboard', id: 'sit', title: 'Sit with someone (personal story)', check: 'Each talk reveals more: home, who they miss, their hope, then a favor. The favor adds a mission; keeping it makes them loyal.',
    setup() { uatFresh(); uatCrew(2, 6); uatBurn('Earth', 'mars'); openEvent(sitPicker()); } },
  { group: 'Life aboard', id: 'birthday', title: 'Birthday', check: 'The party, gift, and quiet-drink choices all work and feel warm.',
    setup() { uatFresh({ cargo: { luxury: 2 } }); const [a] = uatCrew(2, 2); uatBurn('Earth', 'mars'); openEvent(occasionEvent({ kind: 'birthday', id: a.id, day: G.state.day + 1 })); } },
  { group: 'Life aboard', id: 'holiday', title: 'Holiday (First Water)', check: 'The Belter crew member leads the holiday; joining in brings the crew closer.',
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
    setup() { uatFresh({ credits: 150000, ship: 'freighter', cargo: { industrial: 40, equipment: 20, metal: 30, food: 15, water: 15 } }); uatLand('Ganymede'); } },
  { group: 'Frontier', id: 'outpost', title: 'A growing outpost', check: 'The First Born moment opens on landing; the outpost page shows supplies, income, and buildings.',
    setup() { uatFresh({ credits: 150000, ship: 'freighter', cargo: { industrial: 30, equipment: 20, metal: 40 } }); found('Callisto', 'Test Landing'); G.state.outpost.pop = 70; uatLand('Callisto'); const m = MOMENTS[0]; G.state.outpost.moments.push(0); openEvent(m.make(G.state.outpost)); } },
  { group: 'Frontier', id: 'death', title: 'Death and the heir', check: 'The death screen offers going on as your heir; the heir inherits the company and outpost.',
    setup() { uatFresh({ cargo: { industrial: 20 } }); uatCrew(1); found('Callisto', 'Test Landing'); uatLand('Earth'); G.mode = 'dead'; UI.showDead(); } },
  { group: 'Frontier', id: 'retire', title: 'Retirement', check: 'Retire from the Company page; the successor takes the ship and crew, and the list of captains grows.',
    setup() { uatFresh(); uatCrew(2); uatLand('Earth'); UI.tab = 'company'; UI.render(); } },
  { group: 'Cold Water', id: 'cw-derelict', title: 'The derelict', check: 'The derelict scene opens; taking the core starts the story.',
    setup() { uatFresh(); uatBurn('Earth', 'mars'); G.state.story.next = 0; uatScene('cw-derelict'); } },
  { group: 'Cold Water', id: 'cw-mira', title: 'Mira\'s contact', check: 'Mira finds you and asks for passage to Europa.',
    setup() { uatFresh(); Object.assign(G.state.story, { stage: 3 }); uatLand('Mars'); uatScene('cw-mira-contact'); } },
  { group: 'Cold Water', id: 'cw-europa', title: 'Europa reveal', check: 'The core is decrypted on Europa and Act 1 ends.',
    setup() { uatFresh(); Object.assign(G.state.story, { stage: 4 }); storyPassenger('Mira Castellane', 1, 'jupiter', 'Europa', 3000, 'mira-europa'); uatLand('Europa'); uatScene('cw-europa'); } },
  { group: 'Cold Water', id: 'cw-contacts', title: 'Act 2: who gets the proof', check: 'At Ceres Station the Collective contact offers to take the proof.',
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
    setup() { uatFresh(); G.state.rep['Mars Republic'] = 30; uatLand('Mars'); uatScene('navy-recruit'); } },
  { group: 'Campaigns', id: 'rook', title: 'The Rook\'s Crown', check: 'Hollis Mbeki invites you to fly under the Rook\'s colors.',
    setup() { uatFresh(); G.state.day = 25; uatLand('The Rook'); uatScene('rook-invite'); } },
  { group: 'Campaigns', id: 'tethys', title: 'The Partner\'s Chair', check: 'The Tethys Consortium invites you once you own a company ship.',
    setup() { uatFresh({ credits: 200000 }); uatLand('Titan'); buyCompanyShip('freighter'); uatScene('tsc-invite'); } },
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
    setup() { uatHired('hester'); uatFinish(); G.state.credits = 100000; hired().flags = { lent: true, secretKnown: true }; hired().confirm = 'courier'; Mods.act('buyInGo', 'courier'); } },
);

// ---------- general tools ----------
const UAT_TOOLS = {
  cash: () => { G.state.credits += 50000; },
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
        <button data-uat="tool" data-id="cash">+50,000 cr</button><button data-uat="tool" data-id="refuel">Refuel and repair</button><button data-uat="tool" data-id="days">+10 days</button><button data-uat="tool" data-id="cargo">Fill hold</button>
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
const alertNote = text => { if (typeof msg === 'function') msg(text); };

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
