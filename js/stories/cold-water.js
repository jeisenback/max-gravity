'use strict';

// Cold Water's scenes, written as storylets. The story's state lives in st.story
// (stage, side, and flags; see js/story.js for the stages), which these scenes read
// with the `story` condition and change with the `story` effect. The machinery that
// isn't a scene stays in story.js and is called with `do`: story passengers, the end
// of Act 2, the pump failures, the tracer attempt, and the endings. Agent ships, the
// blockade fleets, the docking override, and the epilogue are code there too.

Mods.register({
  id: 'cold-water-scenes', name: 'Cold Water (scenes)', builtin: true,
  init(M) {
    // Cold Water scenes outrank other storylines when both could play.
    const scene = (def) => M.addStorylet({ priority: 10, once: false, ...def });
    const at = (stage, planet, extra) => ({ story: { stage }, ...(planet ? { planet } : {}), ...(extra || {}) });

    // ==================== Act 1: the core ====================

    scene({
      id: 'cw-derelict', where: 'transit', when: { story: { stage: 0 }, storyDay: { next: 0 } },
      title: "The Persephone's Due",
      text: 'A dead ice hauler tumbles across your trajectory, reactor cold, transponder scrubbed. Her hull is scorched around the cargo locks, as if someone cut their way in and left in a hurry. There is still a sealed data core in her bridge.',
      choices: [
        { label: 'Match velocity and take the data core (costs time)',
          effects: { delay: 10, story: { stage: 1 }, storyLog: "Recovered a data core from the derelict ice hauler Persephone's Due." },
          result: 'The core carries Ceres Water Authority markings, under a second layer of encryption from a company called Aquilon Hydrologics. Someone will want this back.' },
        { label: '[{crew}] Crack it on the spot', when: { crew: 'slicer' },
          effects: { delay: 15, story: { stage: 1, peeked: true }, storyLog: "Recovered a data core from the derelict ice hauler Persephone's Due." },
          result: '{crew} gets through the first layer: maintenance logs for Ceres cistern pumps, every one signed off by Aquilon Hydrologics crews. The rest is locked tight. You take the core.' },
        // If you leave it, it drifts back into your path later.
        { label: 'Leave it', effects: { storyDays: { next: 10 } },
          result: 'Whatever happened to her, you want no part of it. You log her position and burn on.' },
      ],
    });

    scene({
      id: 'cw-voight', where: 'port', when: at(1),
      title: 'A Man From Aquilon',
      text: 'A man in an immaculate grey suit is waiting at your berth, which should not be possible. "Anselm Voight, Aquilon Hydrologics, asset recovery. You have recovered some company property, captain: a data core from the Persephone\'s Due. We would like it back, and we are happy to pay a generous finder\'s fee. Eight thousand credits. No questions."',
      choices: [
        { label: 'Sell it (8,000 cr)', effects: { credits: 8000, story: { stage: 'sold' }, storyLog: 'Sold the Persephone\'s core to Anselm Voight of Aquilon Hydrologics for 8,000 cr.' },
          result: 'Voight smiles and pockets the core. "A pleasure, captain. You will find Aquilon never forgets its friends." Something about the way he says it stays with you.' },
        { label: '[{crew}] Have {crew} copy it first, then sell', when: { crew: 'slicer' },
          effects: { credits: 8000, story: { stage: 2, copied: true }, storyLog: 'Sold the core to Aquilon for 8,000 cr, after copying it.' },
          result: '{crew} clones the core in the ninety seconds it takes you to "find" it. Voight pays, smiles, and leaves. "He will check it," {crew} says quietly. "And he will know."' },
        { label: '"It is not for sale."', effects: { story: { stage: 2 }, storyLog: 'Refused to hand the core to Anselm Voight of Aquilon Hydrologics.' },
          result: 'Voight\'s smile does not move. "Everything is for sale, captain. We will talk again." He leaves. Your dock handler will not meet your eyes.' },
      ],
    });

    scene({
      id: 'cw-mira-contact', where: 'port', when: at(3),
      title: 'Mira Castellane',
      text: 'A wiry Belter woman in a faded Ceres Water Authority jacket is waiting in the shadow of your airlock. "You have the Persephone\'s core. Aquilon has people on every dock looking for you. I can read it, but not here. The decryption key is in a Water Authority relay on Europa. Take me there and I will show you why Ceres is running dry."',
      choices: [
        { label: 'Take her to Europa (needs a free berth)', when: { berths: 1 },
          effects: { story: { stage: 4 }, do: ['storyPassenger', 'Mira Castellane', 1, 'jupiter', 'Europa', 3000, 'mira-europa'], storyLog: 'Agreed to carry Mira Castellane, a former Ceres water engineer, to Europa.' },
          result: 'She drops a battered duffel in your spare berth and does not unpack. "Europa. Jupiter. As fast as you like."' },
        { label: '"Not yet."', result: 'She presses a contact chip into your hand. "Do not wait too long. They will not." She is gone before you can answer. She will find you again at your next port.' },
      ],
    });

    M.addStorylet({
      id: 'cw-mira-talk', where: 'transit', priority: 10, when: { aboard: 'mira-europa' },
      title: "Mira's Story",
      text: 'Somewhere past the flip, Mira finally talks. Twelve years a cistern engineer on Ceres. Three months ago the pumps in her sector started failing, one after another, always right after an Aquilon Hydrologics maintenance visit. When she filed a report, she lost her job. When she kept asking questions, someone tried to space her.',
      choices: [
        { label: '"Why should I believe you?"', effects: { storyAdd: { miraTrust: -1 } },
          result: 'She pulls up her sleeve. A ropey scar runs from wrist to elbow. "Airlock door. It closed early. Someone overrode the safety." She rolls the sleeve back down. "Believe whatever you like. The core will speak for itself."' },
        { label: '"I believe you. What do you need from me?"', effects: { storyAdd: { miraTrust: 1 }, passenger: { who: 'mira-europa', bonus: 1000 } },
          result: 'She lets out a breath she seems to have been holding for three months. "Get me to Europa alive. After that, we will see how brave you are." She insists on paying extra for the berth.' },
        { label: '[Rosa] Let Rosa talk to her', when: { crew: 'rosa' }, effects: { storyAdd: { miraTrust: 2 } },
          result: 'Rosa stares at her. "Castellane. Sector Nine pumps." Mira stares back. "Okafor. You fixed the Nine-B recycler the year it froze." They talk late into the night about pumps and people they both knew. When Rosa comes back to the cockpit, she is quiet. "Everything she says is true, captain. I was there when the pumps started failing."' },
      ],
    });

    scene({
      id: 'cw-europa', where: 'port', when: at(4, 'Europa'),
      title: 'What the Core Says',
      text: 'In a rented room above the Europa ice docks, Mira splices the core into a Water Authority relay, and it all spills out. Aquilon crews disabling Ceres recyclers on a schedule. Shell companies buying up ice claims on Europa and Enceladus at rock-bottom prices. Water futures bought in Hermes Foundry\'s name the day before every "failure". Someone is starving the Belt of water to get rich, and the proof is in your hands.',
      choices: [
        { label: '"What happens now?"', effects: { story: { stage: 5 }, storyLog: 'On Europa, Mira decrypted the core: Aquilon Hydrologics and Hermes Foundry are sabotaging Ceres\'s water supply.' },
          result: 'Mira looks at you for a long moment. "Now you decide who gets this. The Collective will fight. Mars will use it against Earth. Earth will bury it. And Aquilon will pay anything to make it disappear." She keeps a copy and stays on Europa. "Whatever you choose, I will be here." (Act 1 complete. Your choice is on the Port tab.)' },
      ],
    });

    // ==================== Act 2: who gets the proof ====================

    scene({
      id: 'cw-contact-ceres', where: 'port', when: at(5, 'Ceres Station'),
      title: 'The Collective Council',
      text: 'Councillor Ama Tembo meets you in a pump room, because it is the only room on Ceres the council trusts. She reads the core in silence. "Three months of rationing. Children on half water. And it was a business plan." She looks up. "Give this to the Collective and we will fight with it. But we need people to believe the ration is breaking first."',
      choices: [
        { label: ['Give the proof to the Collective', { when: { standingBelow: { 'Belt Collective': -14 } }, text: '(the Collective does not trust you)' }],
          when: { standing: { 'Belt Collective': -14 } },
          effects: { story: { stage: 'belt1' }, storyLog: 'Gave the proof to Councillor Ama Tembo of the Belt Collective.' },
          result: '"Then bring us water," Tembo says. "Twenty tons, and let the whole station watch it come in. After that, we move."' },
        { label: 'Not yet', result: '"Do not wait too long, captain. Ceres cannot."' },
      ],
    });

    scene({
      id: 'cw-contact-mars', where: 'port', when: at(5, 'Mars'),
      title: 'Navy Intelligence',
      text: [{ when: { standing: { 'Mars Republic': 15 } },
        text: 'Commander Yelena Ueda of Mars Republic Navy intelligence meets you in a room with no windows. "Headlines fade. Leverage lasts. Give Mars this, and we will make Earth pay for every ton of water it let Aquilon steal. But first I want to know who else is on Aquilon\'s payroll."',
        else: 'A Mars Republic Navy guard checks your record and shakes his head. "Commander Ueda does not meet with captains the Republic does not trust." (Needs Trusted standing with the Mars Republic.)' }],
      choices: [
        { label: 'Give the proof to Mars', when: { standing: { 'Mars Republic': 15 } },
          effects: { story: { stage: 'mars1' }, storyLog: 'Gave the proof to Commander Yelena Ueda of Mars Republic Navy intelligence.' },
          result: 'Ueda slides a sliver of hardware across the table. "A tracer. Get it into Hermes Foundry\'s comm net, on Mercury. Then come to Phobos Yards and we will see who has been paying whom."' },
        { label: 'Not yet', result: '"The offer stands, captain. For now."' },
      ],
    });

    scene({
      id: 'cw-contact-luna', where: 'port', when: at(5, 'Luna'),
      title: 'Coalition Intelligence',
      text: 'Director Samuel Achebe of Coalition intelligence receives you in an office overlooking the Luna shipyards. "You have done Earth a great service, captain. This needs careful handling. A panic on Ceres helps no one." He folds his hands. "We will also need Ms. Castellane. For her own protection."',
      choices: [
        { label: ['Give the proof to the Coalition', { when: { standingBelow: { 'Earth Coalition': -14 } }, text: '(the Coalition does not trust you)' }],
          when: { standing: { 'Earth Coalition': -14 } },
          effects: { story: { stage: 'earth1' }, storyLog: 'Gave the proof to Director Samuel Achebe of Coalition intelligence.' },
          result: '"Bring her from Europa," Achebe says. "Discreetly." He is already reading the core.' },
        { label: 'Not yet', result: '"Of course. Take your time, captain. Within reason."' },
      ],
    });

    // Anselm Voight at Hermes Foundry: with the proof to sell, or after selling him the core.
    const voightJob = (id, stage, hasProof) => scene({
      id, where: 'port', when: at(stage, 'Hermes Foundry'),
      title: 'Anselm Voight',
      text: hasProof
        ? 'Voight receives you in an office with a view of the solar furnaces. "You came to me. Sensible. Twenty-five thousand credits for the core and every copy, and I can offer steady work besides. Aquilon rewards discretion."'
        : 'Voight receives you in an office with a view of the solar furnaces. "Captain. You made the right choice about that core. Now I have a job for someone discreet."',
      choices: [
        { label: hasProof ? 'Sell the proof and take the job (+25,000 cr; needs 2 free berths)' : 'Take the job (needs 2 free berths)', when: { berths: 2 },
          effects: { credits: hasProof ? 25000 : 0, story: { stage: 'aq1' }, do: ['storyPassenger', 'two Aquilon technicians', 2, 'ceres', 'Ceres Station', 2000, 'techs'],
            storyLog: hasProof ? 'Sold the proof to Anselm Voight for 25,000 cr and took an Aquilon job.' : 'Took a job from Anselm Voight of Aquilon Hydrologics.' },
          result: '"Two of our maintenance technicians need passage to Ceres Station. Quietly." Voight smiles. "They will pay their own fare."' },
        { label: 'Not yet', result: '"Aquilon is patient, captain. Up to a point."' },
      ],
    });
    voightJob('cw-voight-proof', 5, true);
    voightJob('cw-voight-sold', 'sold', false);

    // ---------- Belt Collective ----------

    scene({
      id: 'cw-belt-water', where: 'port', when: at('belt1', 'Ceres Station', { cargo: { water: 20 } }),
      title: 'Water Day',
      text: 'Word spreads before you even dock. By the time your cargo lock opens, half the ring is crowding the concourse to watch twenty tons of water roll out under Collective banners. Councillor Tembo makes sure the cameras catch every drum.',
      choices: [{ label: 'Unload the water',
        effects: { cargo: { water: -20 }, credits: 6000, rep: { 'Belt Collective': 10 }, story: { stage: 'belt2' }, storyLog: 'Delivered 20t of water to Ceres Station for the Collective.' },
        result: 'The council pays 6,000 cr, and the crowd cheers your ship\'s name. Tembo does not smile. "Aquilon will have seen that too. Get to Pallas Refinery. The refinery crews listen to people who deliver."' }],
    });

    scene({
      id: 'cw-pallas', where: 'port', when: at('belt2', 'Pallas Refinery', { story: { stage: 'belt2', ambushed: true } }),
      title: 'The Refinery Floor',
      text: ['Jo Marsh, the refinery steward, gathers three hundred smelter crews on the refinery floor to hear you out.',
        { when: { crew: 'rosa' }, text: 'Before you can start, Rosa steps up beside you. Half of them seem to know her.', else: 'They look tired, thirsty, and in no mood for speeches.' }],
      choices: [{ label: 'Tell them what the core says',
        effects: { rep: { 'Belt Collective': 10 }, credits: 4000, do: ['endAct2', 'belt', 'Rallied the Pallas refinery crews. The Belt went on strike and the Collective voided Aquilon\'s ice claims.'] },
        result: [{ when: { crew: 'rosa' }, text: 'Rosa tells them about the Nine-B pumps, and the room goes quiet.' },
          'When you finish, Marsh raises a fist, and the refinery shuts down around you. By nightfall every Belt station is on strike, and the Collective council declares Aquilon\'s ice claims void. The union sends 4,000 cr for your trouble. Earth answers within the week: a Coalition fleet is on its way "to secure Ceres." (Act 2 complete. Act 3, the blockade of Ceres, arrives in a later update.)'] }],
    });

    // ---------- Mars Republic ----------

    scene({
      id: 'cw-tracer', where: 'port', when: at('mars1', 'Hermes Foundry'),
      title: 'The Tracer',
      text: 'Hermes Foundry\'s comm hub sits behind two security checkpoints and a very bored dock technician.',
      choices: [
        { label: '[{crew}] Have {crew} slip it in', when: { crew: 'slicer' },
          effects: { story: { stage: 'mars2' }, storyLog: 'Planted Commander Ueda\'s tracer in Hermes Foundry\'s comm net.' },
          result: '{crew} is in and out of the hub\'s maintenance port in four minutes. "Done. Their security is a joke."' },
        { label: 'Bribe the dock technician (3,000 cr)', when: { credits: 3000 },
          effects: { credits: -3000, story: { stage: 'mars2' }, storyLog: 'Bribed a Hermes Foundry technician to plant Commander Ueda\'s tracer.' },
          result: 'The technician pockets the credits and the tracer, and does not ask what it is. By the time you are back aboard, Ueda\'s channel blinks: "Signal confirmed."' },
        { label: 'Do it yourself', effects: { do: 'tracerAttempt' } },
      ],
    });

    scene({
      id: 'cw-mars-debrief', where: 'port', when: at('mars2', 'Phobos Yards'),
      title: 'Leverage',
      text: ['Commander Ueda spreads the tracer\'s take across a table at Phobos Yards. Hermes Foundry executives bankrolling Aquilon. Three Earth Coalition trade officials on the payroll. "Now," she says, "Earth will listen."',
        { when: { crew: 'dima' }, text: 'She glances at Dima. "Sokolov. I heard you were flying freighters now. Good." Dima grins.' }],
      choices: [{ label: 'Take the Navy\'s thanks',
        effects: { credits: 15000, rep: { 'Mars Republic': 15 }, do: ['endAct2', 'mars', 'Mars Republic Navy intelligence used the proof as leverage over Earth.'] },
        result: 'The Navy pays 15,000 cr and quietly marks your record. Mars leaks just enough to make Earth sweat. Earth accuses Mars of manufacturing the evidence, and within a week both navies are moving toward Ceres. (Act 2 complete. Act 3, the blockade of Ceres, arrives in a later update.)' }],
    });

    // ---------- Earth Coalition ----------

    scene({
      id: 'cw-mira-doubt', where: 'port', when: at('earth1', 'Europa'),
      title: 'Mira Castellane',
      text: 'Mira is waiting at the Europa ice docks. "Achebe sent you." It is not a question. "You know Coalition intelligence buries things for a living."',
      choices: [
        { label: '"Come to Luna. You will be safe." (needs a free berth)', when: { berths: 1 },
          effects: { story: { stage: 'earth2' }, do: ['storyPassenger', 'Mira Castellane', 1, 'earth', 'Luna', 0, 'mira-luna'] },
          result: 'She looks at you for a long time, then picks up her duffel.' },
        { label: '"Then let us take it to Ceres instead." (needs a free berth)', when: { berths: 1 },
          effects: { story: { stage: 'belt1' }, rep: { 'Earth Coalition': -10 }, do: ['storyPassenger', 'Mira Castellane', 1, 'ceres', 'Ceres Station', 0, 'mira-ceres'],
            storyLog: 'Turned away from Coalition intelligence and took Mira to the Belt Collective instead.' },
          result: '"Now you are talking." Achebe will not be pleased. Councillor Tembo will want water on Ceres: 20 tons of it.' },
      ],
    });

    M.addStorylet({
      id: 'cw-second-thoughts', where: 'transit', priority: 10, when: { aboard: 'mira-luna' },
      title: 'Second Thoughts',
      text: 'Mira watches Luna grow in the forward screen. "You know what they will do with it. Achebe will lock the proof in a vault and me in a nice quiet room, and Ceres will keep running dry. Drop me at Ceres Station instead. Let the Collective have it."',
      choices: [
        { label: '"Trust me. Achebe gave his word."', effects: { storyAdd: { miraTrust: -1 } }, result: 'She says nothing for the rest of the burn.' },
        { label: '"All right. Ceres it is."',
          effects: { passenger: { who: 'mira-luna', set: { destSystem: 'ceres', destPlanet: 'Ceres Station', title: 'Carry Mira Castellane (1) to Ceres Station' } },
            story: { stage: 'belt1' }, storyAdd: { miraTrust: 2 }, rep: { 'Earth Coalition': -10 }, storyLog: 'Turned away from Coalition intelligence and took Mira to the Belt Collective instead.' },
          result: 'She closes her eyes. "Thank you." You replot for Ceres. Achebe will not be pleased. (Your burn continues to its current destination; take Mira on to Ceres Station from there.)' },
      ],
    });

    scene({
      id: 'cw-custody', where: 'port', when: at('earth2', 'Luna'),
      title: 'Protective Custody',
      text: ['Two quiet people in Coalition grey are waiting at the airlock. "Ms. Castellane will be well looked after," Achebe says. Mira does not look back.',
        { when: { crew: 'kit' }, text: 'Kit watches them go. "Protective custody," she mutters. "I have seen that before. Nobody comes back from it."' }],
      choices: [{ label: 'Collect your reward',
        effects: { credits: 20000, rep: { 'Earth Coalition': 15 }, do: ['endAct2', 'earth', 'Handed the proof and Mira Castellane to Coalition intelligence.'] },
        result: 'Achebe pays 20,000 cr from a discretionary fund and shakes your hand. The proof disappears. So does Mira. Two weeks later, Ceres riots over water, and a Coalition fleet moves in to "restore order". (Act 2 complete. Act 3, the blockade of Ceres, arrives in a later update.)' }],
    });

    // ---------- Aquilon ----------

    M.addStorylet({
      id: 'cw-techs', where: 'transit', priority: 10, when: { aboard: 'techs' },
      title: 'Quiet Passengers',
      text: 'The two Aquilon "maintenance technicians" keep to their bunks, and they keep their tool cases locked and within reach, even to eat.',
      choices: [
        { label: 'Check their cases while they sleep', effects: { story: { techsKnown: true } },
          result: 'Pump-override kits, keyed to Ceres Water Authority hardware, and a schedule. Three sectors. Six days.' },
        { label: 'Mind your own business', result: 'You leave them to it. Aquilon is paying well.' },
      ],
    });

    scene({
      id: 'cw-techs-reveal', where: 'port', when: at('aq1', 'Ceres Station'),
      title: 'Maintenance',
      text: ['Your two passengers head straight for the Sector Nine pump rooms with their locked cases.',
        { when: { story: { techsKnown: true } }, text: 'You know exactly what is in those cases.', else: 'A Water Authority engineer watching them pass goes pale.' },
        'Once they are through that door, three more pumps will fail.'],
      choices: [
        { label: 'Look the other way', effects: { credits: 12000, rep: { 'Belt Collective': -30 }, do: 'aquilonPumps' },
          result: 'An Aquilon account pays you 12,000 cr. Three more pumps fail on Ceres that week, and water there sells for more than reaction mass. The Collective blames Earth, Earth blames Mars, and the fleets start to gather. (Act 2 complete. Act 3, the blockade of Ceres, arrives in a later update.)' },
        { label: 'Turn them in to the Collective', effects: { rep: { 'Belt Collective': 20 }, story: { stage: 'belt2' }, storyLog: 'Turned Aquilon\'s saboteurs over to the Belt Collective on Ceres.' },
          result: 'Collective militia take the technicians and their cases before they reach the pump rooms. Councillor Tembo shakes your hand. "Aquilon will come for you now. Get to Pallas Refinery. The refinery crews need to hear this from someone who was there."' },
      ],
    });

    // ==================== Act 3: the blockade of Ceres ====================

    scene({
      id: 'cw-act3-brief', where: 'port', when: { story: { stage: 'act2' }, storyDay: { act2Day: 5 } },
      title: 'The Fleets Arrive',
      text: [
        { when: { story: { side: 'belt' } }, text: 'Councillor Tembo, on a tight-beam channel: "The Coalition has blockaded Ceres. Nothing gets in, not even water. Bring us twenty tons and break it. Every station in the Belt will be watching."' },
        { when: { story: { side: 'mars' } }, text: 'Commander Ueda, on an encrypted channel: "The Coalition has closed Ceres. If a Mars-friendly captain breaks that blockade with water, Earth loses the Belt. Twenty tons, captain. Under our colors."' },
        { when: { story: { side: 'earth' } }, text: 'Director Achebe: "Ceres is rioting, and Collective hardliners are attacking anything that approaches. Our blockade holds the station. Bring twenty tons of water through for Coalition relief and we can end this."' },
        { when: { story: { side: 'aquilon' } }, text: 'Anselm Voight: "The blockade has made water on Ceres very valuable. Bring twenty tons. The Coalition will let you through; I have seen to it. The Collective hardliners, less so."' },
      ],
      choices: [{ label: 'Understood', effects: { story: { stage: 'act3' }, storyLog: 'Ceres was blockaded. Set out to run water through.' },
        result: 'You check the market prices for water, and your guns. (Water is cheapest on Europa, Enceladus, and Triton.)' }],
    });

    scene({
      id: 'cw-empty-handed', where: 'port', when: at('act3', 'Ceres Station'),
      title: 'Empty-Handed',
      text: 'You made it through the blockade, but your hold has no water in it. The people crowding the docking ring watch your cargo lock open on nothing. Come back with at least 20 tons.',
      choices: [{ label: 'Understood', result: 'You will be back.' }],
    });

    // The last choice: what you do with the water depends on whose side you took.
    const finalText = 'You made it. The docking ring is packed wall to wall, and the crowd goes silent as your cargo lock cycles open. Twenty tons of water. Every camera on Ceres is on your ship. What happens next is up to you.';
    const ending = (label, e) => ({ label, effects: { do: ['finish', e] } });
    const final = (side, choices) => scene({
      id: `cw-final-${side}`, where: 'port', priority: 11,  // over Empty-Handed, once the water is aboard
      when: { story: { stage: 'act3', side }, planet: 'Ceres Station', cargo: { water: 20 } },
      title: 'Ceres Station', text: finalText, choices,
    });
    final('belt', [ending('Unload the water for the Collective', 'belt')]);
    final('mars', [ending('Deliver it under Mars colors', 'mars'), ending('Publish everything, Mars\'s dealings included', 'truth')]);
    final('earth', [ending('Hand the water to Coalition relief', 'earth'), ending('Tell the crowd the truth', 'truth')]);
    final('aquilon', [ending('Sell it at blockade prices (1,000 cr/t)', 'aquilon'), ending('Give it away, and tell them who poisoned their wells', 'truth')]);
  },
});
