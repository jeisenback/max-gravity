'use strict';

// The main plot, "Cold Water": someone is sabotaging Ceres cisterns to drive up the
// price of water. Act 1 runs from finding a derelict's data core to decrypting it on
// Europa; Act 2 is deciding who gets the proof; Act 3 is running water through the
// blockade. The scenes are storylets in js/stories/cold-water.js. This file keeps the
// machinery they lean on: story state, the objective text, the recovery ship, the
// blockade fleets, the endings and epilogue, and the named actions scenes run with
// `do`. Loaded before game.js; only calls into it at runtime.
//
// Act 1 stages: 0 not started, 1 carrying the core, 2 refused Aquilon (recovery ship
// coming), 3 Mira is looking for you, 4 carrying Mira to Europa, 5 Act 1 complete,
// 'sold' gave the core to Aquilon.
// Act 2 stages, one chain per side: 'belt1', 'belt2' (Belt Collective); 'mars1',
// 'mars2' (Mars Republic); 'earth1', 'earth2' (Earth Coalition); 'aq1' (Aquilon).
// 'act2' is Act 2 complete, with `side` recording who got the proof.
// Act 3: 'act3' run 20t of water through the blockade to Ceres Station; 'end' is the
// epilogue, with `ending` one of belt, mars, earth, aquilon, or truth.

const STORY_START_DAY = 10;

function story() {
  return G.state.story;
}

function storyLog(text) {
  story().log.push(`Day ${G.state.day}: ${text}`);
}

function storyObjective() {
  const s = story();
  return {
    1: 'You have the Persephone\'s data core. Someone will come asking about it.',
    2: 'You refused to hand over the core. Aquilon Hydrologics will not take no for an answer. Watch your back on the next takeoff.',
    3: 'A Ceres water engineer named Mira Castellane is looking for you. She will find you at your next port.',
    4: 'Take Mira Castellane to Europa, at Jupiter, so she can decrypt the core.',
    5: 'Decide who gets the proof. Take it to Councillor Tembo of the Belt Collective on Ceres Station, Commander Ueda of Mars Republic Navy intelligence on Mars (needs Trusted standing), Director Achebe of Coalition intelligence on Luna, or Anselm Voight at Hermes Foundry on Mercury.',
    sold: 'Anselm Voight wants to see you at Hermes Foundry, on Mercury. Aquilon has work for people it can trust.',
    belt1: 'Bring 20t of Water to Ceres Station, so the Collective council can show people the ration is breaking.',
    belt2: 'Aquilon knows you are working with the Collective. Get to Pallas Refinery and rally the refinery crews.',
    mars1: 'Land at Hermes Foundry, on Mercury, and plant Commander Ueda\'s tracer in its comm net.',
    mars2: 'Report back to Commander Ueda at Phobos Yards, at Mars.',
    earth1: 'Pick up Mira Castellane on Europa and bring her to Director Achebe on Luna.',
    earth2: 'Take Mira Castellane to Luna.',
    aq1: 'Carry Aquilon\'s maintenance technicians to Ceres Station.',
    act3: `Ceres is under blockade. Bring at least 20t of Water and land at Ceres Station, whatever it takes. ${{ belt: 'The Collective is counting on you.', mars: 'Mars wants its colors on that water.', earth: 'Coalition relief is waiting on you.', aquilon: 'Voight has paid the blockade to let you through.' }[s.side] || ''}`,
    end: 'The story of Cold Water is over. The solar system carries on, and so do you.',
    act2: {
      belt: 'The Belt is on strike and the Collective has voided Aquilon\'s ice claims. A Coalition fleet is on its way to "secure" Ceres. (Act 3, the blockade of Ceres, arrives in a later update.)',
      mars: 'Mars holds the proof as leverage over Earth. Both navies are moving toward Ceres. (Act 3, the blockade of Ceres, arrives in a later update.)',
      earth: 'Coalition intelligence has buried the proof, and Mira with it. Ceres is rioting, and a Coalition fleet is moving in to "restore order". (Act 3, the blockade of Ceres, arrives in a later update.)',
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
    spawnAgent('Aquilon recovery ship "Quiet Ledger"');
    msg('A ship with an Aquilon Hydrologics transponder is closing fast.');
  } else if (s.stage === 'belt2' && !s.ambushed) {
    s.ambushed = true;
    spawnAgent('Aquilon security "Due Diligence"');
    spawnAgent('Aquilon security "Hostile Takeover"');
    msg('Two Aquilon security ships are closing fast. Voight is done talking.');
  }
}

function agentWarning(n) {
  if (n.hailed) return;
  n.hailed = true;
  const line = story().stage !== 2 ? 'Mr. Voight sends his regards.' : story().copied ? 'You kept a copy, captain. Mr. Voight is disappointed.' : 'Mr. Voight sends his regards. Hand over the core.';
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
      { label: s.copied ? 'Hand over the copy' : 'Hand over the core', run() {
        s.stage = 'sold';
        n.hostile = false;
        leave(n);
        storyLog('Surrendered the Persephone\'s core to an Aquilon recovery ship.');
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
  const foeGov = coalitionBlocks ? 'Earth Coalition' : 'Belt Collective';
  spawnFleetShip(coalitionBlocks ? 'destroyer' : 'corsair', foeGov, coalitionBlocks ? 'Coalition destroyer "Resolute"' : 'Collective militia "Last Drop"', true);
  spawnFleetShip('cutter', foeGov, `${PATROL_NAMES[foeGov]} "${shipName(false)}"`, true);
  // Your side's ships.
  if (!coalitionBlocks) for (let i = 0; i < 2; i++) spawnFleetShip('cutter', 'Earth Coalition', `Coalition cutter "${shipName(false)}"`, false);
  const allies = { belt: ['Belt Collective', 'Collective militia', 3], mars: ['Mars Republic', 'MRN frigate', 3], aquilon: [null, 'Aquilon security', 1] }[s.side];
  if (allies) for (let i = 0; i < allies[2]; i++) spawnFleetShip('cutter', allies[0], `${allies[1]} "${shipName(false)}"`, false);
  // People who love you come to help. People who hate you pay someone to make it worse.
  const people = Object.values(G.state.people).filter(p => !G.state.crew.includes(p.id));
  for (const p of people.filter(p => p.opinion >= 5).slice(0, 2)) {
    const n = spawnFleetShip('corsair', null, p.ship ? p.ship.name : `"${shipName(false)}"`, false);
    n.persona = p;
    n.captain = `${p.first} ${p.last}`;
    msg(`${n.name}: "${p.first} ${p.last} here. We heard you might need a hand."`);
  }
  for (const p of people.filter(p => p.opinion <= -5).slice(0, 2)) {
    const n = spawnFleetShip('corsair', null, 'Hired gun', true);
    Object.assign(n, { kind: 'pirate', blockade: false, payer: `${p.first} ${p.last}` });
    msg(`A hired gun paid by ${p.first} ${p.last} has joined the blockade.`);
  }
  msg(coalitionBlocks ? 'The Coalition blockade holds the approach to Ceres Station.' : 'Collective hardliners are attacking ships near Ceres Station.');
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
  belt: { credits: 10000, rep: { 'Belt Collective': 20, 'Earth Coalition': -15 },
    text: 'Twenty tons of water roll off your ship under Collective banners while the blockade burns behind you. Within a month Earth withdraws its fleet, the strike ends on the Belt\'s terms, and Aquilon Hydrologics files for bankruptcy. Water flows on Ceres again.' },
  mars: { credits: 20000, rep: { 'Mars Republic': 15, 'Earth Coalition': -10 },
    text: 'Your water comes ashore under Mars Republic colors, and the Martian parliament gets its pictures. Earth backs down and concedes water rights to Mars-friendly Belt stations. Nobody ever answers for the Ceres pumps.' },
  earth: { credits: 25000, rep: { 'Earth Coalition': 15, 'Belt Collective': -20 },
    text: 'Coalition relief comes ashore, the riots end, and the proof stays buried. Aquilon quietly sells its claims to an Earth consortium. Ceres has water again, rationed under Coalition supervision.' },
  aquilon: { credits: 20000, rep: { 'Belt Collective': -30 },
    text: 'You sell twenty tons of water at a thousand credits a ton to people who have been thirsty for months. Aquilon\'s share price doubles. Ceres survives, barely, and the Belt never forgets the name of your ship.' },
  truth: { credits: 5000, rep: { 'Belt Collective': 20, 'Earth Coalition': -10, 'Mars Republic': -10 },
    text: 'You tell them everything: the pumps, the ice claims, the water futures, and everyone who looked away. The broadcast reaches every station in a day. Aquilon\'s executives are arrested on Mercury, three Coalition officials resign, and even Mars has questions to answer. Ceres drinks.' },
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
  storyLog(`Ran the blockade to Ceres Station. Ending: ${{ belt: 'the Belt Collective', mars: 'the Mars Republic', earth: 'the Earth Coalition', aquilon: 'Aquilon', truth: 'the truth' }[ending]}.`);
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
      ? 'Mira Castellane walked out of Coalition custody the day your broadcast went out. She runs the Ceres Water Authority now.'
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
    : person(id).opinion >= 2 ? `${fullName(person(id))} stays aboard, loyal as ever.` : `${fullName(person(id))} signs off at Ceres to find a quieter ship.`));
  const known = Object.values(st.people);
  const friends = known.filter(p => p.opinion >= 2).length, enemies = known.filter(p => p.opinion <= -2).length;
  const standing = FACTIONS.map(g => `${g === 'Pirate' ? 'Pirates' : g}: ${standingWord(repOf(g))}`).join(', ');
  const parts = [
    ENDINGS[e].text,
    mira,
    crew.length ? crew.join(' ') : 'You fly alone, the way you started.',
    `Across the solar system, ${friends} ${friends === 1 ? 'person' : 'people'} would cross a burn for you, and ${enemies} would not.`,
    `Day ${st.day}. ${fmt(st.credits)} cr. Your ship: the ${ship().name}. ${standing}.`,
  ];
  return {
    title: 'Epilogue: Cold Water',
    text: parts.join('<br><br>'),
    choices: [{ label: 'Keep flying', run: () => 'The solar system carries on. So do you. (You can reread the epilogue from the Port tab.)' }],
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
      changeRep('Earth Coalition', -10);
      return 'A security patrol turns the corner just as you open the panel. You talk your way out of it, barely, and your record with the Coalition takes a hit. You will have to try again.';
    });
    M.addAction('aquilonPumps', () => {
      G.state.rumors.push({ planet: 'Ceres Station', cid: 'water', mult: 1.8, until: G.state.day + 40, text: 'Three more pumps failed on Ceres Station. Water is worth more than fuel there now. (Ceres)' });
      endAct2('aquilon', 'Delivered Aquilon\'s saboteurs to Ceres Station.');
    });
  },
});
