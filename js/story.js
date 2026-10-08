'use strict';

// The main plot, "Cold Water": someone is sabotaging Ceres cisterns to drive up the
// price of water. Act 1 runs from finding a sealed tally book on a surveyed hulk to opening it on
// Europa; Act 2 is deciding who gets the proof; Act 3 is running water through the
// blockade (local space, or scenes and console duels with a crewed gunner). The scenes are storylets in js/stories/cold-water.js. This file keeps the
// machinery they lean on: story state, the objective text, the recovery ship, the
// blockade fleets, the endings and epilogue, and the named actions scenes run with
// `do`. Loaded before game.js; only calls into it at runtime.
//
// Act 1 stages: 0 not started, 1 carrying the book, 2 refused Aquilon (recovery ship
// coming), 3 Mira is looking for you, 4 carrying Mira to Europa, 5 Act 1 complete,
// 'sold' gave the book to Aquilon.
// Act 2 stages, one chain per side: 'belt1', 'belt2' (Charter League); 'mars1',
// 'mars2' (Dome Concord); 'earth1', 'earth2' (Arcology Compact); 'aq1' (Aquilon).
// 'act2' is Act 2 complete, with `side` recording who got the proof.
// Act 3: 'act3' run 20t of water through the blockade to Ceres Station; 'end' is the
// epilogue, with `ending` one of belt, mars, earth, aquilon, or truth.

const STORY_START_DAY = 10;

function story() {
  return G.state.story;
}

function storyLog(text) {
  story().log.push(`${dateOf()}: ${text}`);
}

function storyObjective() {
  const s = story();
  return {
    1: 'You have the Persephone\'s tally book. Someone will come asking about it.',
    2: 'You refused to hand over the book. Aquilon Hydrologics will not take no for an answer. Watch your back on the next takeoff.',
    3: 'A Ceres water engineer named Mira Castellane is looking for you. She will find you at your next port.',
    4: 'Take Mira Castellane to Europa, at Jupiter, so a Water Authority clerk can open the book.',
    5: 'Decide who gets the proof. Take it to Councillor Tembo of the Charter League on Ceres Station, Commander Ueda, fleet auditor of the Dome Concord Fleet, on Mars (needs Trusted standing), Director Achebe of Compact intelligence on Luna, or Anselm Voight at Hermes Foundry on Mercury.',
    sold: 'Anselm Voight wants to see you at Hermes Foundry, on Mercury. Aquilon has work for people it can trust.',
    belt1: 'Bring 20t of Water to Ceres Station, so the League council can show people the ration is breaking.',
    belt2: 'Aquilon knows you are working with the League. Get to Pallas Refinery and rally the refinery crews.',
    mars1: 'Land at Hermes Foundry, on Mercury, and plant Commander Ueda\'s tracer in its comm net.',
    mars2: 'Report back to Commander Ueda at Phobos Yards, at Mars.',
    earth1: 'Pick up Mira Castellane on Europa and bring her to Director Achebe on Luna.',
    earth2: 'Take Mira Castellane to Luna.',
    aq1: 'Carry Aquilon\'s maintenance technicians to Ceres Station.',
    act3: (`Ceres is under blockade. Bring at least 20t of Water and land at Ceres Station, whatever it ` +
        `takes. ${{ belt: 'The League is counting on you.', mars: 'Mars wants its colors on that water.', earth: 'Compact relief is waiting on you.', aquilon: 'Voight has paid the blockade to let you through.' }[s.side] || ''}`),
    end: 'The story of Cold Water is over. The solar system carries on, and so do you.',
    act2: {
      belt: 'The Belt is on strike and the League has voided Aquilon\'s ice claims. A Compact fleet is on its way to "secure" Ceres. (Act 3, the blockade of Ceres, arrives in a later update.)',
      mars: 'Mars holds the proof as leverage over Earth. Both navies are moving toward Ceres. (Act 3, the blockade of Ceres, arrives in a later update.)',
      earth: 'Compact intelligence has buried the proof, and Mira with it. Ceres is rioting, and a Compact fleet is moving in to "restore order". (Act 3, the blockade of Ceres, arrives in a later update.)',
      aquilon: 'You helped Aquilon. Ceres is dying of thirst, the Belt blames Earth, and the fleets are gathering. (Act 3, the blockade of Ceres, arrives in a later update.)',
    }[s.side],
  }[s.stage] || '';
}

// ---------- landing ----------

// Scenes are storylets (js/stories/cold-water.js); this only moves the clock on. It
// runs before the storylets pick a scene, since this mod registers first.
function storyOnLanding() {
  const s = story();
  if (s.stage === 2 && s.agentDay && G.state.day > s.agentDay) s.stage = 3;
}

// ---------- takeoff: the recovery ship ----------

function spawnAgent(name) {
  const n = spawnNpc('agent', false, true);
  Object.assign(n, { shipId: 'corsair', hostile: true, story: true, name });
  n.shields = SHIPS.corsair.shields;
  n.armor = n.maxArmor = SHIPS.corsair.armor * 1.3;
}

function storyOnTakeoff() {
  const s = story();
  if (s.stage === 2 && !s.agentDay) {
    s.agentDay = G.state.day;
    if (consoleFights()) { G.pendingScene = agentConsoleEvent(false); return; }
    spawnAgent('Aquilon recovery ship "Quiet Ledger"');
    msg('A ship with an Aquilon Hydrologics transponder is closing fast.');
  } else if (s.stage === 'belt2' && !s.ambushed) {
    s.ambushed = true;
    if (consoleFights()) { G.pendingScene = agentConsoleEvent(true); return; }
    spawnAgent('Aquilon security "Due Diligence"');
    spawnAgent('Aquilon security "Hostile Takeover"');
    msg('Two Aquilon security ships are closing fast. Voight is done talking.');
  }
}

function agentWarning(n) {
  if (n.hailed) return;
  n.hailed = true;
  const line = story().stage !== 2 ? 'Mr. Voight sends his regards.' : story().copied ? 'You kept a copy, captain. Mr. Voight is disappointed.' : 'Mr. Voight sends his regards. Hand over the book.';
  msg(`${n.name}: "${line}" (H to answer)`);
}

function agentHail(n) {
  const s = story();
  if (s.stage !== 2) {
    return {
      title: n.name,
      text: `Capt. ${n.persona.first} ${n.persona.last}: "Nothing personal, captain. Mr. Voight would like a word with your hull."`,
      choices: [{ label: 'Cut the channel', run: () => 'You cut the channel. They keep coming.' }],
    };
  }
  return {
    title: n.name,
    text: `Capt. ${n.persona.first} ${n.persona.last}: "${s.copied ? 'We know about the copy. Transmit it to us and wipe your systems, and you walk away.' : 'You have something that belongs to Aquilon. Hand it over and nobody gets hurt.'}"`,
    choices: [
      { label: s.copied ? 'Hand over the copy' : 'Hand over the book', run() {
        s.stage = 'sold';
        n.hostile = false;
        leave(n);
        storyLog('Surrendered the Persephone\'s book to an Aquilon recovery ship.');
        return '"Smart choice." They take it and break off. Somewhere on Ceres, another pump fails.';
      } },
      { label: 'Cut the channel', run: () => 'You cut the channel. They keep coming.' },
    ],
  };
}

// While the story is live, some rumors are really news of the sabotage.
function storyRumor() {
  const s = story();
  if (s.stage === 0 || Math.random() > 0.25) return null;
  const planet = pick(['Ceres Station', 'Pallas Refinery']);
  return { planet, sid: planet === 'Ceres Station' ? 'ceres' : 'pallas', cid: 'water', up: true, text: `Another cistern failure on ${planet}. Water rationing is tightening.` };
}

// ==================== Act 2: who gets the proof ====================

function storyPassenger(who, pax, destSystem, destPlanet, pay, storyWho) {
  const st = G.state;
  st.missions.push({
    id: st.nextId++, type: 'passenger', story: true, storyWho, who, pax, bonus: 0,
    eventDone: storyWho === 'mira-ceres',  // she has already told her story
    destSystem, destPlanet, title: `Carry ${who} (${pax}) to ${destPlanet}`, pay, deadline: st.day + 999,
  });
}

function endAct2(side, text) {
  const s = story();
  s.stage = 'act2';
  s.side = side;
  s.act2Day = G.state.day;
  storyLog(text);
}

// ==================== Act 3: the blockade of Ceres ====================

function storyDockingOverride(planet) {
  return story().stage === 'act3' && planet.name === 'Ceres Station';
}

// ---------- the set pieces on the console ----------
// With console fights (see consoleFights in engage.js) the recovery ship and the blockade are
// scenes and duels instead of ships in local space. A story fight runs through startDuel;
// when it is over (nothing left to show), onEnd hears how it went: 'won' or 'escaped'.

function storyFight(spec, { flee = false, allies = 0, onEnd }) {
  const text = startDuel(spec, flee);
  if (G.duel && allies) G.duel.foeHp = Math.max(2, G.duel.foeHp - allies);  // friends thin the other side
  G.storyFight = { duel: G.duel, onEnd };
  return text;
}

// From the frame hook: the scene waiting to open (it cannot open during a takeoff), and a fight that has ended.
function storyConsoleTick() {
  if (G.pendingScene && !G.dialog && G.mode === 'flight') {
    const ev = G.pendingScene;
    G.pendingScene = null;
    G.mode = 'hail';  // the game waits, and returns to flight when the scene closes
    openEvent(ev);
  }
  const f = G.storyFight;
  if (f && !G.dialog && !G.nextEvent) {
    G.storyFight = null;
    f.onEnd(f.duel && f.duel.foeHp === 0 ? 'won' : 'escaped');
  }
}

// A fight opened from the frame hook, where no scene is open to carry its first round.
function openStoryFight(title, spec, opts) {
  const text = storyFight(spec, opts);
  G.mode = 'hail';
  openEvent({ title, text, choices: [{ label: 'Continue', run: () => '' }] });
}

function agentConsoleEvent(ambush) {
  const s = story(), c = makePerson(cultureOf(G.state.systemId));
  const spec = ambush
    ? { kind: 'pirate', story: true, shipId: 'corsair', armorMult: 1.8, name: 'Aquilon security "Due Diligence" and "Hostile Takeover"' }
    : { kind: 'pirate', story: true, shipId: 'corsair', armorMult: 1.3, name: 'Aquilon recovery ship "Quiet Ledger"' };
  const fight = flee => () => storyFight(spec, { flee, onEnd: r => msg(r === 'won' ? `${spec.name} breaks up. Aquilon will not be happy.` : `${spec.name} breaks off, for now.`) });
  const choices = [];
  if (!ambush) choices.push({ label: s.copied ? 'Hand over the copy' : 'Hand over the book', run() {
    s.stage = 'sold';
    storyLog('Surrendered the Persephone\'s book to an Aquilon recovery ship.');
    return '"Smart choice." They take it and break off. Somewhere on Ceres, another pump fails.';
  } });
  choices.push({ label: `Battle stations (${gunnerLabel()})`, run: fight(false) }, { label: 'Burn hard to outrun them', run: fight(true) });
  return {
    title: ambush ? 'Aquilon Security' : 'Aquilon Recovery Ship', via: 'ship',
    text: ambush ? `Two Aquilon security ships come around the planet together, closing fast. Capt. ${c.first} ${c.last}: "Nothing personal, captain. Mr. Voight would like a word with your hull."`
      : `A ship with an Aquilon Hydrologics transponder is closing fast. Capt. ${c.first} ${c.last}: "${s.copied ? 'We know about the copy. Transmit it to us and wipe your systems, and you walk away.' : 'You have something that belongs to Aquilon. Hand it over and nobody gets hurt.'}"`,
    choices,
  };
}

// Ceres is under blockade: two ships of the other side, and whoever is on yours.
function blockadeForces() {
  const s = story(), coalitionBlocks = s.side === 'belt' || s.side === 'mars';
  const gov = coalitionBlocks ? 'Arcology Compact' : 'Charter League';
  const foes = [
    { kind: 'patrol', gov, story: false, shipId: coalitionBlocks ? 'destroyer' : 'corsair', name: coalitionBlocks ? 'Compact destroyer "Resolute"' : 'League militia "Last Drop"' },
    { kind: 'patrol', gov, story: false, shipId: 'cutter', name: `${PATROL_NAMES[gov]} "${shipName(false)}"` },
  ];
  const side = { belt: 3, mars: 3, earth: 2, aquilon: 1 }[s.side] || 0;  // ships of your side
  const loved = alivePeople().filter(p => !G.state.crew.includes(p.id) && p.opinion >= OPINION.ALLY).slice(0, 2).length;
  return { foes, allies: side + loved, coalitionBlocks };
}

function blockadeScene() {
  const { foes, allies, coalitionBlocks } = blockadeForces(), s = story();
  const clear = how => { s.blockadeCleared = true; msg('The blockade breaks. Ceres Station clears you to dock.'); return how; };
  // The first fight starts from a choice (its first round follows the result); the second from the frame hook.
  const gauntlet = (i, fromChoice) => {
    const spec = foes[i], assist = Math.max(0, Math.round(allies / 2)), open = fromChoice ? storyFight : (...a) => openStoryFight('The Blockade', ...a);
    return open(spec, { allies: assist, onEnd: r => {
      if (r !== 'won') { msg('The blockade holds. Fall back, or try again when you are ready.'); return; }
      if (i + 1 < foes.length) return gauntlet(i + 1, false);
      clear();
      G.mode = 'hail';
      openEvent({ title: 'The Blockade Breaks', text: `${allies ? `Your side's ships close in behind you, and the ` : 'The '}${foes[0].gov} line comes apart. Ceres Station clears you to dock.`, choices: [{ label: 'Continue', run: () => 'The approach to Ceres Station is open.' }] });
    } });
  };
  return {
    title: 'The Blockade of Ceres', via: 'station',
    text: (`${coalitionBlocks ? 'The Compact blockade holds the approach to Ceres Station' : ('League hardliners are attacking ships near Ceres ' +
        'Station')}: ${foes.map(f => f.name).join(' and ')}. ${allies ? `${allies} ship${allies > 1 ? 's' : ''} on your side are already moving to meet them.` : 'Nobody is on your side out here.'} ` +
        `Twenty tons of water are in your hold, and Ceres is thirsty.`),
    choices: [
      { label: `Run the blockade (${gunnerLabel()})`, run() { return gauntlet(0, true); } },
      { label: 'Slip in on a cold drive', can: () => true, run() {
        const odds = Math.min(0.85, 0.25 + 0.12 * roleSkill('pilot') + (power().drive <= 25 ? 0.2 : 0));
        if (Math.random() < odds) return clear(`${roleName('pilot')} kills the drive glow and threads the picket on thrusters, and the blockade never sees you. Ceres Station clears you to dock.`);
        return `A picket ship lights you up as you coast in. So much for the cold approach. ${gauntlet(0, true)}`;
      } },
      { label: 'Stay clear for now', run: () => 'You hold off, and watch the blockade from a safe distance.' },
    ],
  };
}

// Docking at Ceres Station while it is blockaded (on the console) reopens the blockade scene.
function storyBlockadeGate(planet) {
  const s = story();
  if (!consoleFights() || s.stage !== 'act3' || planet.name !== 'Ceres Station' || s.blockadeCleared) return false;
  G.mode = 'hail';
  openEvent(blockadeScene());
  return true;
}

// Ships at the blockade. Enemies attack the player; allies hunt enemies.
function spawnFleetShip(shipId, gov, name, enemy) {
  const s = SHIPS[shipId], station = SYSTEMS.ceres.planets[0], a = rand(0, Math.PI * 2);
  const n = spawnNpc(enemy ? 'patrol' : 'ally', false, true);
  Object.assign(n, {
    shipId, gov, name, blockade: true, enemy, hostile: enemy, hunts: enemy ? null : 'enemy',
    x: station.x + Math.cos(a) * rand(450, 750), y: station.y + Math.sin(a) * rand(450, 750), vx: 0, vy: 0,
    shields: s.shields, armor: s.armor, maxArmor: s.armor,
  });
  n.goal = station;
  return n;
}

function storyInSystem() {
  const s = story();
  if (s.stage !== 'act3' || G.state.systemId !== 'ceres') return;
  const coalitionBlocks = s.side === 'belt' || s.side === 'mars';
  const foeGov = coalitionBlocks ? 'Arcology Compact' : 'Charter League';
  if (consoleFights()) { if (!s.blockadeCleared) G.pendingScene = blockadeScene(); return; }  // the console version, below
  spawnFleetShip(coalitionBlocks ? 'destroyer' : 'corsair', foeGov, coalitionBlocks ? 'Compact destroyer "Resolute"' : 'League militia "Last Drop"', true);
  spawnFleetShip('cutter', foeGov, `${PATROL_NAMES[foeGov]} "${shipName(false)}"`, true);
  // Your side's ships.
  if (!coalitionBlocks) for (let i = 0; i < 2; i++) spawnFleetShip('cutter', 'Arcology Compact', `Compact cutter "${shipName(false)}"`, false);
  const allies = { belt: ['Charter League', 'League militia', 3], mars: ['Dome Concord', 'Concord frigate', 3], aquilon: [null, 'Aquilon security', 1] }[s.side];
  if (allies) for (let i = 0; i < allies[2]; i++) spawnFleetShip('cutter', allies[0], `${allies[1]} "${shipName(false)}"`, false);
  // People who love you come to help. People who hate you pay someone to make it worse.
  const people = alivePeople().filter(p => !G.state.crew.includes(p.id));
  for (const p of people.filter(p => p.opinion >= OPINION.ALLY).slice(0, 2)) {
    const n = spawnFleetShip('corsair', null, p.ship ? p.ship.name : `"${shipName(false)}"`, false);
    n.persona = p;
    n.captain = `${p.first} ${p.last}`;
    msg(`${n.name}: "${p.first} ${p.last} here. We heard you might need a hand."`);
  }
  for (const p of people.filter(p => p.opinion <= OPINION.HIRED_GUN).slice(0, 2)) {
    const n = spawnFleetShip('corsair', null, 'Hired gun', true);
    Object.assign(n, { kind: 'pirate', blockade: false, payer: `${p.first} ${p.last}` });
    msg(`A hired gun paid by ${p.first} ${p.last} has joined the blockade.`);
  }
  msg(coalitionBlocks ? 'The Compact blockade holds the approach to Ceres Station.' : 'League hardliners are attacking ships near Ceres Station.');
}

function blockadeHail(n) {
  const c = n.persona;
  return {
    title: n.name,
    text: n.enemy
      ? `Capt. ${c.first} ${c.last}: "Ceres is closed. Turn back now, or we will open fire."`
      : `Capt. ${c.first} ${c.last}: "We have your back, captain. Get that water to the station."`,
    choices: [{ label: 'Cut the channel', run: () => 'You cut the channel.' }],
  };
}

// ---------- the last choice ----------

const ENDINGS = {
  belt: { credits: 10000, rep: { 'Charter League': 20, 'Arcology Compact': -15 },
    text: 'Twenty tons of water roll off your ship under League banners while the blockade burns behind you. Within a month Earth withdraws its fleet, the strike ends on the Belt\'s terms, and Aquilon Hydrologics files for bankruptcy. Water flows on Ceres again.' },
  mars: { credits: 20000, rep: { 'Dome Concord': 15, 'Arcology Compact': -10 },
    text: 'Your water comes ashore under Dome Concord colors, and the Martian parliament gets its pictures. Earth backs down and concedes water rights to Mars-friendly Belt stations. Nobody ever answers for the Ceres pumps.' },
  earth: { credits: 25000, rep: { 'Arcology Compact': 15, 'Charter League': -20 },
    text: 'Compact relief comes ashore, the riots end, and the proof stays buried. Aquilon quietly sells its claims to an Earth consortium. Ceres has water again, rationed under Compact supervision.' },
  aquilon: { credits: 20000, rep: { 'Charter League': -30 },
    text: 'You sell twenty tons of water at a thousand credits a ton to people who have been thirsty for months. Aquilon\'s share price doubles. Ceres survives, barely, and the Belt never forgets the name of your ship.' },
  truth: { credits: 5000, rep: { 'Charter League': 20, 'Arcology Compact': -10, 'Dome Concord': -10 },
    text: 'You tell them everything: the pumps, the ice claims, the water futures, and everyone who looked away. The broadcast reaches every station in a day. Aquilon\'s executives are arrested on Mercury, three Compact officials resign, and even Mars has questions to answer. Ceres drinks.' },
};

function finish(ending) {
  const s = story(), st = G.state, e = ENDINGS[ending];
  st.paid.water = (st.paid.water || 0) * (1 - 20 / st.cargo.water);
  st.cargo.water -= 20;
  st.credits += e.credits;
  for (const [gov, amount] of Object.entries(e.rep)) changeRep(gov, amount);
  s.stage = 'end';
  s.ending = ending;
  s.showEpilogue = true;
  storyLog(`Ran the blockade to Ceres Station. Ending: ${{ belt: 'the Charter League', mars: 'the Dome Concord', earth: 'the Arcology Compact', aquilon: 'Aquilon', truth: 'the truth' }[ending]}.`);
  return `${e.text} (+${fmt(e.credits)} cr)`;
}

// Shows the epilogue after the final scene closes. Returns true if it opened one.
function storyNextScene() {
  const s = story();
  if (!s.showEpilogue) return false;
  s.showEpilogue = false;
  openEvent(epilogueEvent());
  return true;
}

function epilogueEvent() {
  const s = story(), st = G.state, e = s.ending;
  const mira = {
    belt: 'Mira Castellane runs the Ceres Water Authority now. She keeps a picture of your ship on her office wall.',
    truth: s.side === 'earth'
      ? 'Mira Castellane walked out of Compact custody the day your broadcast went out. She runs the Ceres Water Authority now.'
      : 'Mira Castellane runs the Ceres Water Authority now. She keeps a picture of your ship on her office wall.',
    mars: 'Mira Castellane testified before the Martian parliament, then went home to Ceres to fix pumps.',
    earth: 'Nobody has heard from Mira Castellane since Luna.',
    aquilon: 'Mira Castellane vanished from Europa. Some say she is still out there, gathering proof. Some say Aquilon found her first.',
  }[e];
  const fates = {
    rosa: ['belt', 'truth'].includes(e) ? 'Rosa Okafor went home to Ceres a hero, then came right back. "Somebody has to keep your drive alive."' : 'Rosa Okafor keeps the drive alive and does not talk about Ceres.',
    dima: 'Dima Sokolov still flies like someone is shooting at him. Lately, someone usually is.',
    kit: 'Kit Halloran sleeps through the night now, most nights.',
    josef: 'Josef Brandt has started a ledger of everything Aquilon owes. It is a long ledger.',
    wren: 'Wren says she has been inside the Aquilon servers. She says nothing else.',
  };
  const crew = st.crew.map(id => (CREW[id] ? fates[id]
    : person(id).opinion >= OPINION.FRIEND ? `${fullName(person(id))} stays aboard, loyal as ever.` : `${fullName(person(id))} signs off at Ceres to find a quieter ship.`));
  const known = alivePeople();
  const friends = known.filter(p => p.opinion >= OPINION.FRIEND).length, enemies = known.filter(p => p.opinion <= OPINION.ENEMY).length;
  const standing = FACTIONS.map(g => `${g === 'Pirate' ? 'Pirates' : g}: ${standingWord(repOf(g))}`).join(', ');
  const parts = [
    ENDINGS[e].text,
    homeLine(),
    mira,
    crew.length ? crew.join(' ') : 'You fly alone, the way you started.',
    `Across the solar system, ${friends} ${friends === 1 ? 'person' : 'people'} would cross a burn for you, and ${enemies} would not.`,
    `${dateOf(st.day)}. ${fmt(st.credits)} cr. Your ship: the ${ship().name}. ${standing}.`,
  ];
  return {
    title: 'Epilogue: Cold Water',
    text: parts.join('<br><br>'),
    choices: [{ label: 'Keep flying', run: () => 'The solar system carries on. So do you. (You can reread the epilogue from the Port page.)' }],
  };
}

// The endings leave their mark on the price of water in the Belt.
function storyPriceMult(planet, cid) {
  const e = story().ending;
  if (!e || cid !== 'water' || (planet.name !== 'Ceres Station' && planet.name !== 'Pallas Refinery')) return 1;
  return { belt: 0.8, truth: 0.8, mars: 1, earth: 1.2, aquilon: 1.5 }[e];
}

Mods.register({
  id: 'cold-water', name: 'Cold Water', builtin: true,
  init(M) {
    M.on('enterSystem', storyInSystem);
    M.on('frame', storyConsoleTick);
    M.on('landed', storyOnLanding);
    M.on('takeoff', storyOnTakeoff);
    M.filter('price', (v, planet, cid) => v * storyPriceMult(planet, cid));
    M.filter('canDock', (ok, planet) => ok || storyDockingOverride(planet));
    M.addAction('storyPassenger', storyPassenger);
    M.addAction('endAct2', endAct2);
    M.addAction('finish', finish);
    M.addAction('tracerAttempt', () => {
      if (Math.random() < 0.6) {
        story().stage = 'mars2';
        storyLog('Planted Commander Ueda\'s tracer in Hermes Foundry\'s comm net.');
        return 'You find an unguarded junction behind a coolant stack and plug it in. Nobody sees a thing.';
      }
      changeRep('Arcology Compact', -10);
      return 'A security patrol turns the corner just as you open the panel. You talk your way out of it, barely, and your record with the Compact takes a hit. You will have to try again.';
    });
    M.addAction('aquilonPumps', () => {
      G.state.rumors.push({ planet: 'Ceres Station', cid: 'water', mult: 1.8, until: G.state.day + 40, text: 'Three more pumps failed on Ceres Station. Water is worth more than fuel there now. (Ceres)' });
      endAct2('aquilon', 'Delivered Aquilon\'s saboteurs to Ceres Station.');
    });
  },
});
