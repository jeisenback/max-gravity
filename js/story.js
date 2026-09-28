'use strict';

// The main plot, "Cold Water": someone is sabotaging Ceres cisterns to drive up the
// price of water. Act 1 runs from finding a derelict's data core to decrypting it on
// Europa; Act 2 is deciding who gets the proof. Beats fire from transit
// (startHappening), landing (landAt), and takeoff (takeOff). Loaded before game.js;
// only calls into it at runtime.
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

// ---------- transit: the derelict ----------

function storyTransitBeat() {
  const s = story();
  if (s.stage !== 0 || G.state.day < s.next) return null;
  s.next = G.state.day + 10;  // if you leave it, it drifts back into your path later
  return {
    title: "The Persephone's Due",
    text: 'A dead ice hauler tumbles across your trajectory, reactor cold, transponder scrubbed. Her hull is scorched around the cargo locks, as if someone cut their way in and left in a hurry. There is still a sealed data core in her bridge.',
    choices: [
      { label: 'Match velocity and take the data core (costs time)', run() {
        delay(10);
        takeCore();
        return 'The core carries Ceres Water Authority markings, under a second layer of encryption from a company called Aquilon Hydrologics. Someone will want this back.';
      } },
      { label: '[{crew}] Crack it on the spot', role: 'slicer', run() {
        delay(15);
        takeCore();
        s.peeked = true;
        return '{crew} gets through the first layer: maintenance logs for Ceres cistern pumps, every one signed off by Aquilon Hydrologics crews. The rest is locked tight. You take the core.';
      } },
      { label: 'Leave it', run: () => 'Whatever happened to her, you want no part of it. You log her position and burn on.' },
    ],
  };
}

function takeCore() {
  story().stage = 1;
  storyLog("Recovered a data core from the derelict ice hauler Persephone's Due.");
}

// Mira's conversation while you carry her to Europa.
function miraTransitEvent(m) {
  const s = story();
  const choices = [
    { label: '"Why should I believe you?"', run() {
      s.miraTrust = (s.miraTrust || 0) - 1;
      return 'She pulls up her sleeve. A ropey scar runs from wrist to elbow. "Airlock door. It closed early. Someone overrode the safety." She rolls the sleeve back down. "Believe whatever you like. The core will speak for itself."';
    } },
    { label: '"I believe you. What do you need from me?"', run() {
      s.miraTrust = (s.miraTrust || 0) + 1;
      m.bonus += 1000;
      return 'She lets out a breath she seems to have been holding for three months. "Get me to Europa alive. After that, we will see how brave you are." She insists on paying extra for the berth.';
    } },
  ];
  if (G.state.crew.includes('rosa')) {
    choices.push({ label: '[Rosa] Let Rosa talk to her', run() {
      s.miraTrust = (s.miraTrust || 0) + 2;
      return 'Rosa stares at her. "Castellane. Sector Nine pumps." Mira stares back. "Okafor. You fixed the Nine-B recycler the year it froze." They talk late into the night about pumps and people they both knew. When Rosa comes back to the cockpit, she is quiet. "Everything she says is true, captain. I was there when the pumps started failing."';
    } });
  }
  return {
    title: "Mira's Story",
    text: 'Somewhere past the flip, Mira finally talks. Twelve years a cistern engineer on Ceres. Three months ago the pumps in her sector started failing, one after another, always right after an Aquilon Hydrologics maintenance visit. When she filed a report, she lost her job. When she kept asking questions, someone tried to space her.',
    choices,
  };
}

// ---------- landing ----------

function storyOnLanding(planet) {
  const s = story(), at = planet.name;
  if (s.stage === 1) return openEvent(voightOffer());
  if (s.stage === 2 && s.agentDay && G.state.day > s.agentDay) s.stage = 3;
  if (s.stage === 3) return openEvent(miraContact());
  if (s.stage === 4 && at === 'Europa') return openEvent(europaReveal());
  if (s.stage === 'act2' && G.state.day >= (s.act2Day || 0) + 5) return openEvent(act3Briefing());
  if (s.stage === 'act3' && at === 'Ceres Station') return openEvent((G.state.cargo.water || 0) >= 20 ? finalScene() : emptyHanded());
  const scene = {
    5: CONTACTS[at] && (() => CONTACTS[at]()),
    sold: at === 'Hermes Foundry' && (() => aquilonJob(false)),
    belt1: at === 'Ceres Station' && (G.state.cargo.water || 0) >= 20 && beltWater,
    belt2: at === 'Pallas Refinery' && s.ambushed && pallasRally,
    mars1: at === 'Hermes Foundry' && plantTracer,
    mars2: at === 'Phobos Yards' && marsDebrief,
    earth1: at === 'Europa' && miraDoubt,
    earth2: at === 'Luna' && earthCustody,
    aq1: at === 'Ceres Station' && techsReveal,
  }[s.stage];
  if (scene) openEvent(scene());
}

function voightOffer() {
  const s = story();
  return {
    title: 'A Man From Aquilon',
    text: 'A man in an immaculate grey suit is waiting at your berth, which should not be possible. "Anselm Voight, Aquilon Hydrologics, asset recovery. You have recovered some company property, captain: a data core from the Persephone\'s Due. We would like it back, and we are happy to pay a generous finder\'s fee. Eight thousand credits. No questions."',
    choices: [
      { label: 'Sell it (8,000 cr)', run() {
        G.state.credits += 8000;
        s.stage = 'sold';
        storyLog('Sold the Persephone\'s core to Anselm Voight of Aquilon Hydrologics for 8,000 cr.');
        return 'Voight smiles and pockets the core. "A pleasure, captain. You will find Aquilon never forgets its friends." Something about the way he says it stays with you.';
      } },
      { label: '[{crew}] Have {crew} copy it first, then sell', role: 'slicer', run() {
        G.state.credits += 8000;
        s.stage = 2;
        s.copied = true;
        storyLog('Sold the core to Aquilon for 8,000 cr, after copying it.');
        return '{crew} clones the core in the ninety seconds it takes you to "find" it. Voight pays, smiles, and leaves. "He will check it," {crew} says quietly. "And he will know."';
      } },
      { label: '"It is not for sale."', run() {
        s.stage = 2;
        storyLog('Refused to hand the core to Anselm Voight of Aquilon Hydrologics.');
        return 'Voight\'s smile does not move. "Everything is for sale, captain. We will talk again." He leaves. Your dock handler will not meet your eyes.';
      } },
    ],
  };
}

function miraContact() {
  const s = story();
  return {
    title: 'Mira Castellane',
    text: 'A wiry Belter woman in a faded Ceres Water Authority jacket is waiting in the shadow of your airlock. "You have the Persephone\'s core. Aquilon has people on every dock looking for you. I can read it, but not here. The decryption key is in a Water Authority relay on Europa. Take me there and I will show you why Ceres is running dry."',
    choices: [
      { label: 'Take her to Europa (needs a free berth)', can: () => berthsFree() >= 1, run() {
        s.stage = 4;
        const st = G.state;
        st.missions.push({
          id: st.nextId++, type: 'passenger', story: true, who: 'Mira Castellane', pax: 1, bonus: 0,
          destSystem: 'jupiter', destPlanet: 'Europa', title: 'Carry Mira Castellane (1) to Europa',
          pay: 3000, deadline: st.day + 999,
        });
        storyLog('Agreed to carry Mira Castellane, a former Ceres water engineer, to Europa.');
        return 'She drops a battered duffel in your spare berth and does not unpack. "Europa. Jupiter. As fast as you like."';
      } },
      { label: '"Not yet."', run() {
        return 'She presses a contact chip into your hand. "Do not wait too long. They will not." She is gone before you can answer. She will find you again at your next port.';
      } },
    ],
  };
}

function europaReveal() {
  const s = story();
  return {
    title: 'What the Core Says',
    text: 'In a rented room above the Europa ice docks, Mira splices the core into a Water Authority relay, and it all spills out. Aquilon crews disabling Ceres recyclers on a schedule. Shell companies buying up ice claims on Europa and Enceladus at rock-bottom prices. Water futures bought in Hermes Foundry\'s name the day before every "failure". Someone is starving the Belt of water to get rich, and the proof is in your hands.',
    choices: [
      { label: '"What happens now?"', run() {
        s.stage = 5;
        storyLog('On Europa, Mira decrypted the core: Aquilon Hydrologics and Hermes Foundry are sabotaging Ceres\'s water supply.');
        return 'Mira looks at you for a long moment. "Now you decide who gets this. The Collective will fight. Mars will use it against Earth. Earth will bury it. And Aquilon will pay anything to make it disappear." She keeps a copy and stays on Europa. "Whatever you choose, I will be here." (Act 1 complete. Your choice is on the Spaceport tab.)';
      } },
    ],
  };
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

// Transit events for story passengers.
function storyPaxEvent(m) {
  const s = story();
  if (m.storyWho === 'mira-luna') {
    return {
      title: 'Second Thoughts',
      text: 'Mira watches Luna grow in the forward screen. "You know what they will do with it. Achebe will lock the proof in a vault and me in a nice quiet room, and Ceres will keep running dry. Drop me at Ceres Station instead. Let the Collective have it."',
      choices: [
        { label: '"Trust me. Achebe gave his word."', run() {
          s.miraTrust = (s.miraTrust || 0) - 1;
          return 'She says nothing for the rest of the burn.';
        } },
        { label: '"All right. Ceres it is."', run() {
          m.destSystem = 'ceres';
          m.destPlanet = 'Ceres Station';
          m.title = 'Carry Mira Castellane (1) to Ceres Station';
          s.stage = 'belt1';
          s.miraTrust = (s.miraTrust || 0) + 2;
          changeRep('Earth Coalition', -10);
          storyLog('Turned away from Coalition intelligence and took Mira to the Belt Collective instead.');
          return 'She closes her eyes. "Thank you." You replot for Ceres. Achebe will not be pleased. (Your burn continues to its current destination; take Mira on to Ceres Station from there.)';
        } },
      ],
    };
  }
  if (m.storyWho === 'techs') {
    return {
      title: 'Quiet Passengers',
      text: 'The two Aquilon "maintenance technicians" keep to their bunks, and they keep their tool cases locked and within reach, even to eat.',
      choices: [
        { label: 'Check their cases while they sleep', run() {
          s.techsKnown = true;
          return 'Pump-override kits, keyed to Ceres Water Authority hardware, and a schedule. Three sectors. Six days.';
        } },
        { label: 'Mind your own business', run: () => 'You leave them to it. Aquilon is paying well.' },
      ],
    };
  }
  return miraTransitEvent(m);
}

// The four people who could take the proof, met by landing where they are.
const CONTACTS = {
  'Ceres Station': () => ({
    title: 'The Collective Council',
    text: 'Councillor Ama Tembo meets you in a pump room, because it is the only room on Ceres the council trusts. She reads the core in silence. "Three months of rationing. Children on half water. And it was a business plan." She looks up. "Give this to the Collective and we will fight with it. But we need people to believe the ration is breaking first."',
    choices: [
      { label: `Give the proof to the Collective${repOf('Belt Collective') <= -15 ? ' (the Collective does not trust you)' : ''}`, can: () => repOf('Belt Collective') > -15, run() {
        story().stage = 'belt1';
        storyLog('Gave the proof to Councillor Ama Tembo of the Belt Collective.');
        return '"Then bring us water," Tembo says. "Twenty tons, and let the whole station watch it come in. After that, we move."';
      } },
      { label: 'Not yet', run: () => '"Do not wait too long, captain. Ceres cannot."' },
    ],
  }),
  Mars: () => ({
    title: 'Navy Intelligence',
    text: repOf('Mars Republic') >= 15
      ? 'Commander Yelena Ueda of Mars Republic Navy intelligence meets you in a room with no windows. "Headlines fade. Leverage lasts. Give Mars this, and we will make Earth pay for every ton of water it let Aquilon steal. But first I want to know who else is on Aquilon\'s payroll."'
      : 'A Mars Republic Navy guard checks your record and shakes his head. "Commander Ueda does not meet with captains the Republic does not trust." (Needs Trusted standing with the Mars Republic.)',
    choices: [
      { label: 'Give the proof to Mars', can: () => repOf('Mars Republic') >= 15, run() {
        story().stage = 'mars1';
        storyLog('Gave the proof to Commander Yelena Ueda of Mars Republic Navy intelligence.');
        return 'Ueda slides a sliver of hardware across the table. "A tracer. Get it into Hermes Foundry\'s comm net, on Mercury. Then come to Phobos Yards and we will see who has been paying whom."';
      } },
      { label: 'Not yet', run: () => '"The offer stands, captain. For now."' },
    ],
  }),
  Luna: () => ({
    title: 'Coalition Intelligence',
    text: 'Director Samuel Achebe of Coalition intelligence receives you in an office overlooking the Luna shipyards. "You have done Earth a great service, captain. This needs careful handling. A panic on Ceres helps no one." He folds his hands. "We will also need Ms. Castellane. For her own protection."',
    choices: [
      { label: `Give the proof to the Coalition${repOf('Earth Coalition') <= -15 ? ' (the Coalition does not trust you)' : ''}`, can: () => repOf('Earth Coalition') > -15, run() {
        story().stage = 'earth1';
        storyLog('Gave the proof to Director Samuel Achebe of Coalition intelligence.');
        return '"Bring her from Europa," Achebe says. "Discreetly." He is already reading the core.';
      } },
      { label: 'Not yet', run: () => '"Of course. Take your time, captain. Within reason."' },
    ],
  }),
  'Hermes Foundry': () => aquilonJob(true),
};

// ---------- Belt Collective ----------

function beltWater() {
  return {
    title: 'Water Day',
    text: 'Word spreads before you even dock. By the time your cargo lock opens, half the ring is crowding the concourse to watch twenty tons of water roll out under Collective banners. Councillor Tembo makes sure the cameras catch every drum.',
    choices: [{ label: 'Unload the water', run() {
      const st = G.state;
      st.paid.water = (st.paid.water || 0) * (1 - 20 / st.cargo.water);
      st.cargo.water -= 20;
      st.credits += 6000;
      changeRep('Belt Collective', 10);
      story().stage = 'belt2';
      storyLog('Delivered 20t of water to Ceres Station for the Collective.');
      return 'The council pays 6,000 cr, and the crowd cheers your ship\'s name. Tembo does not smile. "Aquilon will have seen that too. Get to Pallas Refinery. The refinery crews listen to people who deliver."';
    } }],
  };
}

function pallasRally() {
  const rosa = G.state.crew.includes('rosa');
  return {
    title: 'The Refinery Floor',
    text: `Jo Marsh, the refinery steward, gathers three hundred smelter crews on the refinery floor to hear you out. ${rosa ? 'Before you can start, Rosa steps up beside you. Half of them seem to know her.' : 'They look tired, thirsty, and in no mood for speeches.'}`,
    choices: [{ label: 'Tell them what the core says', run() {
      changeRep('Belt Collective', 10);
      G.state.credits += 4000;
      endAct2('belt', 'Rallied the Pallas refinery crews. The Belt went on strike and the Collective voided Aquilon\'s ice claims.');
      return `${rosa ? 'Rosa tells them about the Nine-B pumps, and the room goes quiet. ' : ''}When you finish, Marsh raises a fist, and the refinery shuts down around you. By nightfall every Belt station is on strike, and the Collective council declares Aquilon's ice claims void. The union sends 4,000 cr for your trouble. Earth answers within the week: a Coalition fleet is on its way "to secure Ceres." (Act 2 complete. Act 3, the blockade of Ceres, arrives in a later update.)`;
    } }],
  };
}

// ---------- Mars Republic ----------

function plantTracer() {
  const s = story();
  return {
    title: 'The Tracer',
    text: 'Hermes Foundry\'s comm hub sits behind two security checkpoints and a very bored dock technician.',
    choices: [
      { label: '[{crew}] Have {crew} slip it in', role: 'slicer', run() {
        s.stage = 'mars2';
        storyLog('Planted Commander Ueda\'s tracer in Hermes Foundry\'s comm net.');
        return '{crew} is in and out of the hub\'s maintenance port in four minutes. "Done. Their security is a joke."';
      } },
      { label: 'Bribe the dock technician (3,000 cr)', can: () => G.state.credits >= 3000, run() {
        G.state.credits -= 3000;
        s.stage = 'mars2';
        storyLog('Bribed a Hermes Foundry technician to plant Commander Ueda\'s tracer.');
        return 'The technician pockets the credits and the tracer, and does not ask what it is. By the time you are back aboard, Ueda\'s channel blinks: "Signal confirmed."';
      } },
      { label: 'Do it yourself', run() {
        if (Math.random() < 0.6) {
          s.stage = 'mars2';
          storyLog('Planted Commander Ueda\'s tracer in Hermes Foundry\'s comm net.');
          return 'You find an unguarded junction behind a coolant stack and plug it in. Nobody sees a thing.';
        }
        changeRep('Earth Coalition', -10);
        return 'A security patrol turns the corner just as you open the panel. You talk your way out of it, barely, and your record with the Coalition takes a hit. You will have to try again.';
      } },
    ],
  };
}

function marsDebrief() {
  const dima = G.state.crew.includes('dima');
  return {
    title: 'Leverage',
    text: `Commander Ueda spreads the tracer's take across a table at Phobos Yards. Hermes Foundry executives bankrolling Aquilon. Three Earth Coalition trade officials on the payroll. "Now," she says, "Earth will listen." ${dima ? 'She glances at Dima. "Sokolov. I heard you were flying freighters now. Good." Dima grins.' : ''}`,
    choices: [{ label: 'Take the Navy\'s thanks', run() {
      G.state.credits += 15000;
      changeRep('Mars Republic', 15);
      endAct2('mars', 'Mars Republic Navy intelligence used the proof as leverage over Earth.');
      return 'The Navy pays 15,000 cr and quietly marks your record. Mars leaks just enough to make Earth sweat. Earth accuses Mars of manufacturing the evidence, and within a week both navies are moving toward Ceres. (Act 2 complete. Act 3, the blockade of Ceres, arrives in a later update.)';
    } }],
  };
}

// ---------- Earth Coalition ----------

function miraDoubt() {
  const s = story();
  return {
    title: 'Mira Castellane',
    text: 'Mira is waiting at the Europa ice docks. "Achebe sent you." It is not a question. "You know Coalition intelligence buries things for a living."',
    choices: [
      { label: '"Come to Luna. You will be safe." (needs a free berth)', can: () => berthsFree() >= 1, run() {
        s.stage = 'earth2';
        storyPassenger('Mira Castellane', 1, 'earth', 'Luna', 0, 'mira-luna');
        return 'She looks at you for a long time, then picks up her duffel.';
      } },
      { label: '"Then let us take it to Ceres instead." (needs a free berth)', can: () => berthsFree() >= 1, run() {
        s.stage = 'belt1';
        changeRep('Earth Coalition', -10);
        storyPassenger('Mira Castellane', 1, 'ceres', 'Ceres Station', 0, 'mira-ceres');
        storyLog('Turned away from Coalition intelligence and took Mira to the Belt Collective instead.');
        return '"Now you are talking." Achebe will not be pleased. Councillor Tembo will want water on Ceres: 20 tons of it.';
      } },
    ],
  };
}

function earthCustody() {
  const kit = G.state.crew.includes('kit');
  return {
    title: 'Protective Custody',
    text: `Two quiet people in Coalition grey are waiting at the airlock. "Ms. Castellane will be well looked after," Achebe says. Mira does not look back. ${kit ? 'Kit watches them go. "Protective custody," she mutters. "I have seen that before. Nobody comes back from it."' : ''}`,
    choices: [{ label: 'Collect your reward', run() {
      G.state.credits += 20000;
      changeRep('Earth Coalition', 15);
      endAct2('earth', 'Handed the proof and Mira Castellane to Coalition intelligence.');
      return 'Achebe pays 20,000 cr from a discretionary fund and shakes your hand. The proof disappears. So does Mira. Two weeks later, Ceres riots over water, and a Coalition fleet moves in to "restore order". (Act 2 complete. Act 3, the blockade of Ceres, arrives in a later update.)';
    } }],
  };
}

// ---------- Aquilon ----------

function aquilonJob(hasProof) {
  const s = story();
  return {
    title: 'Anselm Voight',
    text: hasProof
      ? 'Voight receives you in an office with a view of the solar furnaces. "You came to me. Sensible. Twenty-five thousand credits for the core and every copy, and I can offer steady work besides. Aquilon rewards discretion."'
      : 'Voight receives you in an office with a view of the solar furnaces. "Captain. You made the right choice about that core. Now I have a job for someone discreet."',
    choices: [
      { label: hasProof ? 'Sell the proof and take the job (+25,000 cr; needs 2 free berths)' : 'Take the job (needs 2 free berths)', can: () => berthsFree() >= 2, run() {
        if (hasProof) G.state.credits += 25000;
        s.stage = 'aq1';
        storyPassenger('two Aquilon technicians', 2, 'ceres', 'Ceres Station', 2000, 'techs');
        storyLog(hasProof ? 'Sold the proof to Anselm Voight for 25,000 cr and took an Aquilon job.' : 'Took a job from Anselm Voight of Aquilon Hydrologics.');
        return '"Two of our maintenance technicians need passage to Ceres Station. Quietly." Voight smiles. "They will pay their own fare."';
      } },
      { label: 'Not yet', run: () => '"Aquilon is patient, captain. Up to a point."' },
    ],
  };
}

function techsReveal() {
  const s = story();
  return {
    title: 'Maintenance',
    text: `Your two passengers head straight for the Sector Nine pump rooms with their locked cases. ${s.techsKnown ? 'You know exactly what is in those cases.' : 'A Water Authority engineer watching them pass goes pale.'} Once they are through that door, three more pumps will fail.`,
    choices: [
      { label: 'Look the other way', run() {
        G.state.credits += 12000;
        changeRep('Belt Collective', -30);
        G.state.rumors.push({ planet: 'Ceres Station', cid: 'water', mult: 1.8, until: G.state.day + 40, text: 'Three more pumps failed on Ceres Station. Water is worth more than fuel there now. (Ceres)' });
        endAct2('aquilon', 'Delivered Aquilon\'s saboteurs to Ceres Station.');
        return 'An Aquilon account pays you 12,000 cr. Three more pumps fail on Ceres that week, and water there sells for more than reaction mass. The Collective blames Earth, Earth blames Mars, and the fleets start to gather. (Act 2 complete. Act 3, the blockade of Ceres, arrives in a later update.)';
      } },
      { label: 'Turn them in to the Collective', run() {
        changeRep('Belt Collective', 20);
        s.stage = 'belt2';
        storyLog('Turned Aquilon\'s saboteurs over to the Belt Collective on Ceres.');
        return 'Collective militia take the technicians and their cases before they reach the pump rooms. Councillor Tembo shakes your hand. "Aquilon will come for you now. Get to Pallas Refinery. The refinery crews need to hear this from someone who was there."';
      } },
    ],
  };
}

// ==================== Act 3: the blockade of Ceres ====================

function act3Briefing() {
  const s = story();
  return {
    title: 'The Fleets Arrive',
    text: {
      belt: 'Councillor Tembo, on a tight-beam channel: "The Coalition has blockaded Ceres. Nothing gets in, not even water. Bring us twenty tons and break it. Every station in the Belt will be watching."',
      mars: 'Commander Ueda, on an encrypted channel: "The Coalition has closed Ceres. If a Mars-friendly captain breaks that blockade with water, Earth loses the Belt. Twenty tons, captain. Under our colors."',
      earth: 'Director Achebe: "Ceres is rioting, and Collective hardliners are attacking anything that approaches. Our blockade holds the station. Bring twenty tons of water through for Coalition relief and we can end this."',
      aquilon: 'Anselm Voight: "The blockade has made water on Ceres very valuable. Bring twenty tons. The Coalition will let you through; I have seen to it. The Collective hardliners, less so."',
    }[s.side],
    choices: [{ label: 'Understood', run() {
      s.stage = 'act3';
      storyLog('Ceres was blockaded. Set out to run water through.');
      return 'You check the market prices for water, and your guns. (Water is cheapest on Europa, Enceladus, and Triton.)';
    } }],
  };
}

function emptyHanded() {
  return {
    title: 'Empty-Handed',
    text: 'You made it through the blockade, but your hold has no water in it. The people crowding the docking ring watch your cargo lock open on nothing. Come back with at least 20 tons.',
    choices: [{ label: 'Understood', run: () => 'You will be back.' }],
  };
}

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

function finalScene() {
  const side = story().side;
  const choices = {
    belt: [{ label: 'Unload the water for the Collective', run: () => finish('belt') }],
    mars: [
      { label: 'Deliver it under Mars colors', run: () => finish('mars') },
      { label: 'Publish everything, Mars\'s dealings included', run: () => finish('truth') },
    ],
    earth: [
      { label: 'Hand the water to Coalition relief', run: () => finish('earth') },
      { label: 'Tell the crowd the truth', run: () => finish('truth') },
    ],
    aquilon: [
      { label: 'Sell it at blockade prices (1,000 cr/t)', run: () => finish('aquilon') },
      { label: 'Give it away, and tell them who poisoned their wells', run: () => finish('truth') },
    ],
  }[side];
  return {
    title: 'Ceres Station',
    text: 'You made it. The docking ring is packed wall to wall, and the crowd goes silent as your cargo lock cycles open. Twenty tons of water. Every camera on Ceres is on your ship. What happens next is up to you.',
    choices,
  };
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
    choices: [{ label: 'Keep flying', run: () => 'The solar system carries on. So do you. (You can reread the epilogue from the Spaceport tab.)' }],
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
  },
});
