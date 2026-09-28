'use strict';

// The main plot, "Cold Water": someone is sabotaging Ceres cisterns to drive up the
// price of water. Act 1 runs from finding a derelict's data core to decrypting it on
// Europa. Beats fire from transit (startHappening), landing (landAt), and takeoff
// (populateSystem). Loaded before game.js; only calls into it at runtime.
//
// Stages: 0 not started, 1 carrying the core, 2 refused Aquilon (recovery ship coming),
// 3 Mira is looking for you, 4 carrying Mira to Europa, 5 Act 1 complete,
// 'sold' gave the core to Aquilon.

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
    5: 'The core proves Aquilon Hydrologics is sabotaging Ceres\'s water. Now someone has to decide who gets the proof. (Act 2 arrives in a later update.)',
    sold: 'You sold the Persephone\'s core to Aquilon Hydrologics. Ceres keeps running dry. (The story continues in a later update.)',
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
  const s = story();
  if (s.stage === 1) return openEvent(voightOffer());
  if (s.stage === 2 && s.agentDay && G.state.day > s.agentDay) s.stage = 3;
  if (s.stage === 3) return openEvent(miraContact());
  if (s.stage === 4 && planet.name === 'Europa') return openEvent(europaReveal());
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
        return 'Mira looks at you for a long moment. "Now we decide who gets this. The Collective will fight. Mars will use it against Earth. Earth will bury it. And Aquilon will pay anything to make it disappear." (Act 1 complete. Act 2, choosing who gets the proof, arrives in a later update.)';
      } },
    ],
  };
}

// ---------- takeoff: the recovery ship ----------

function storyOnTakeoff() {
  const s = story();
  if (s.stage !== 2 || s.agentDay) return;
  s.agentDay = G.state.day;
  const n = spawnNpc('agent', false, true);
  Object.assign(n, { shipId: 'corsair', hostile: true, story: true, name: 'Aquilon recovery ship "Quiet Ledger"' });
  n.shields = SHIPS.corsair.shields;
  n.armor = n.maxArmor = SHIPS.corsair.armor * 1.3;
  msg('A ship with an Aquilon Hydrologics transponder is closing fast.');
}

function agentWarning(n) {
  if (n.hailed) return;
  n.hailed = true;
  msg(`${n.name}: "${story().copied ? 'You kept a copy, captain. Mr. Voight is disappointed.' : 'Mr. Voight sends his regards. Hand over the core.'}" (H to answer)`);
}

function agentHail(n) {
  const s = story();
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
