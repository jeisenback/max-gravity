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
      text: 'A dead ice hauler tumbles across your trajectory, turning slowly end over end, her reactor cold and her transponder scrubbed clean of any name. The paint on her flank still says PERSEPHONE\'S DUE, in the proud blocky letters of a family firm. Her hull is scorched around the cargo locks, as if someone cut their way in and left in a hurry, and the locks hang open like a jaw. Through the bridge viewport you can see, floating in the dark, a sealed data core, bolted to a console, blinking a single patient green light. Nothing else on the ship is alive.',
      choices: [
        { label: 'Match velocity and take the data core (costs time)',
          effects: { delay: 10, story: { stage: 1 }, storyLog: "Recovered a data core from the derelict ice hauler Persephone's Due." },
          result: 'You match velocity with the dead ship and go across in suits, through the ruin of her cargo locks, past a crew mess with a half-eaten meal frozen to the table. The core comes free with a few turns of a wrench, cold as a stone in your hands. Back aboard, it turns out to carry Ceres Water Authority markings, under a second layer of encryption from a company called Aquilon Hydrologics. Someone will want this back. Someone, you think, has already been looking.' },
        { label: '[{crew}] Crack it on the spot', when: { crew: 'slicer' },
          effects: { delay: 15, story: { stage: 1, peeked: true }, storyLog: "Recovered a data core from the derelict ice hauler Persephone's Due." },
          result: '{crew} crouches over the core on the dead ship\'s bridge, hands moving in the glow of the console, and gets through the first layer in eleven minutes: maintenance logs for Ceres cistern pumps, hundreds of them, every one signed off by Aquilon Hydrologics crews. The rest is locked tight, behind something a good deal more serious. "Whoever put this here did not want it read," {crew} says quietly. "And whoever locked it did not want it lost." You take the core, and get out of the dead ship\'s bridge as fast as you decently can.' },
        // If you leave it, it drifts back into your path later.
        { label: 'Leave it', effects: { storyDays: { next: 10 } },
          result: 'Whatever happened to her, you want no part of it. You log her position, and the name on her flank, and burn on. Behind you the dead hauler dwindles, turning slowly, still blinking her single green light. Somehow you know you have not seen the last of her.' },
      ],
    });

    scene({
      id: 'cw-voight', where: 'port', when: at(1),
      title: 'A Man From Aquilon',
      text: 'A man in an immaculate grey suit is waiting at your berth, which should not be possible: it is a private dock, and the door was locked. He is tall, unhurried, and very clean, with a small silver pin of a water drop in his lapel. He holds out a hand, and, when you do not take it, lowers it without any sign of offense. "Anselm Voight, Aquilon Hydrologics, asset recovery. You have recovered some company property, captain: a data core from the Persephone\'s Due. We would like it back, and we are happy to pay a generous finder\'s fee. Eight thousand credits. No questions." His smile is a small precise thing. "I think you will find that I am a very reasonable man."',
      choices: [
        { label: 'Sell it (8,000 cr)', effects: { credits: 8000, story: { stage: 'sold' }, storyLog: 'Sold the Persephone\'s core to Anselm Voight of Aquilon Hydrologics for 8,000 cr.' },
          result: 'Voight smiles and pockets the core, neatly, in an inside pocket, the way a man pockets a folded handkerchief. The credits arrive before he has finished turning away. "A pleasure, captain. You will find Aquilon never forgets its friends." Something about the way he says it stays with you: not a threat, exactly, but the calm of a man who has never been wrong about anyone\'s price. You watch him walk the length of the dock, and not once does he look back.' },
        { label: '[{crew}] Have {crew} copy it first, then sell', when: { crew: 'slicer' },
          effects: { credits: 8000, story: { stage: 2, copied: true }, storyLog: 'Sold the core to Aquilon for 8,000 cr, after copying it.' },
          result: '{crew} clones the core in the ninety seconds it takes you to "find" it, fingers flying, with a small flash of a smile. Voight pays, smiles, and leaves, and the dock is very quiet after he goes. "He will check it," {crew} says at last, quietly, sliding the copy into a pocket. "And he will know. Men like that always know." Neither of you says anything more, but for the rest of the day the dock feels smaller, as though it were listening.' },
        { label: '"It is not for sale."', effects: { story: { stage: 2 }, storyLog: 'Refused to hand the core to Anselm Voight of Aquilon Hydrologics.' },
          result: 'Voight\'s smile does not move. It is the most frightening thing you have seen in a long while. "Everything is for sale, captain," he says gently, as if to a child. "We will talk again." He leaves, without hurry, and without another word. Your dock handler, who watched the whole thing from the corner, will not meet your eyes for the rest of the day, and, that night, someone slips a note under your hatch that says only: BE CAREFUL.' },
      ],
    });

    scene({
      id: 'cw-mira-contact', where: 'port', when: at(3),
      title: 'Mira Castellane',
      text: 'A wiry Belter woman in a faded Ceres Water Authority jacket is waiting in the shadow of your airlock, with a battered duffel at her feet and the wary, watchful stillness of someone who has not slept properly in weeks. Her hands are cracked and stained blue at the fingertips, the way pump engineers\' hands get. "You have the Persephone\'s core," she says, low and fast. "Aquilon has people on every dock looking for you. I can read it, but not here. The decryption key is in a Water Authority relay on Europa. Take me there and I will show you why Ceres is running dry." Her eyes flick to the corridor behind you, and back. "Please. I do not have long."',
      choices: [
        { label: 'Take her to Europa (needs a free berth)', when: { berths: 1 },
          effects: { story: { stage: 4 }, do: ['storyPassenger', 'Mira Castellane', 1, 'jupiter', 'Europa', 3000, 'mira-europa'], storyLog: 'Agreed to carry Mira Castellane, a former Ceres water engineer, to Europa.' },
          result: 'She drops her battered duffel in your spare berth and does not unpack. It sits there, zipped, like a bag ready to run. "Europa. Jupiter. As fast as you like," she says, and then, awkwardly, as though the word were a little rusty from lack of use: "Thank you." She spends the first hour at the viewport, watching the dock fall away, and only when it is gone does she let her shoulders down.' },
        { label: '"Not yet."', result: 'She nods, as if she had expected it, and presses a contact chip into your hand, warm from her pocket. "Do not wait too long. They will not." She is gone before you can answer, with a swift, silent grace, into the crowd of the dock, and, for a moment, you can still see the faded blue of her jacket. She will find you again at your next port.' },
      ],
    });

    M.addStorylet({
      id: 'cw-mira-talk', where: 'transit', priority: 10, when: { aboard: 'mira-europa' },
      title: "Mira's Story",
      text: 'Somewhere past the flip, in the long dead hours when the ship hums to itself, Mira finally talks. She sits on a crate in the galley with a cold mug between her palms, and does not look up. Twelve years a cistern engineer on Ceres, she says. She knew every valve in Sector Nine by touch. Three months ago the pumps in her sector started failing, one after another, always right after an Aquilon Hydrologics maintenance visit. When she filed a report, she lost her job. When she kept asking questions, someone tried to space her. She says it all in a flat, even voice, like a woman reading aloud from someone else\'s file.',
      choices: [
        { label: '"Why should I believe you?"', effects: { storyAdd: { miraTrust: -1 } },
          result: 'She looks at you for a long moment, without anger, and pulls up her sleeve. A ropey scar runs from wrist to elbow, white and puckered, the kind that only comes from a bad decompression. "Airlock door," she says. "It closed early. Someone overrode the safety." She rolls the sleeve back down, slowly. "Believe whatever you like. I stopped needing people to believe me a long time ago. The core will speak for itself." She takes her cold mug, and goes back to her bunk, and the galley feels colder than before.' },
        { label: '"I believe you. What do you need from me?"', effects: { storyAdd: { miraTrust: 1 }, passenger: { who: 'mira-europa', bonus: 1000 } },
          result: 'She lets out a breath she seems to have been holding for three months, a long, shaky, ragged sound, and for the first time since she came aboard she looks her age, and a little younger. "Get me to Europa alive," she says. "After that, we will see how brave you are." She insists on paying extra for the berth, pressing the credits into your hand with a stubborn tilt of her chin. "I have not owed anyone in a long while," she says. "I am not going to start with you."' },
        { label: '[Rosa] Let Rosa talk to her', when: { crew: 'rosa' }, effects: { storyAdd: { miraTrust: 2 } },
          result: 'Rosa stares at her, and something in her face changes, all at once, like a door swinging open. "Castellane. Sector Nine pumps." Mira stares back, and the mug slips slightly in her hands. "Okafor. You fixed the Nine-B recycler the year it froze." For a moment neither of them moves. Then they sit, side by side on the crates, and they talk late into the night about pumps, and people they both knew, and a bakery on Ring Three that burned down. You hear Mira laugh, once, a rusty, startled sound. When Rosa comes back to the cockpit, at last, she is quiet, and her eyes are red. "Everything she says is true, captain," she says. "I was there when the pumps started failing. I just never knew why."' },
      ],
    });

    scene({
      id: 'cw-europa', where: 'port', when: at(4, 'Europa'),
      title: 'What the Core Says',
      text: 'In a rented room above the Europa ice docks, with the ice groaning faintly beneath the floor and the smell of cold metal in the air, Mira splices the core into a Water Authority relay, and it all spills out. Line after line of it, scrolling faster than either of you can read. Aquilon crews disabling Ceres recyclers on a schedule. Shell companies buying up ice claims on Europa and Enceladus at rock-bottom prices. Water futures bought in Hermes Foundry\'s name the day before every "failure". Mira reads, and does not speak, and her lips go white. Someone is starving the Belt of water to get rich, and the proof is in your hands.',
      choices: [
        { label: '"What happens now?"', effects: { story: { stage: 5 }, storyLog: 'On Europa, Mira decrypted the core: Aquilon Hydrologics and Hermes Foundry are sabotaging Ceres\'s water supply.' },
          result: 'Mira looks at you for a long moment, and for the first time you see how tired she is, and how much she has held together. "Now you decide who gets this," she says. "The Collective will fight. Mars will use it against Earth. Earth will bury it. And Aquilon will pay anything to make it disappear." She keeps a copy, in a small metal capsule on a chain, and stays on Europa, with the Water Authority workers who still remember her. "Whatever you choose, I will be here. I will be the one on the ice, watching the ships come in." (Act 1 complete. Your choice is on the Port tab.)' },
      ],
    });

    // ==================== Act 2: who gets the proof ====================

    scene({
      id: 'cw-contact-ceres', where: 'port', when: at(5, 'Ceres Station'),
      title: 'The Collective Council',
      text: 'Councillor Ama Tembo meets you in a pump room, because it is the only room on Ceres the council trusts: every wall a dripping tangle of pipe, every surface cold and damp, and the low steady thrum of the pumps in the floor. She is a broad, weathered woman in a Collective jacket, with grey braids and a voice that carries. She reads the core in silence, one finger moving down the screen. When she reaches the end, she sits down heavily on a crate. "Three months of rationing," she says. "Children on half water. Old people who did not make it. And it was a business plan." She looks up, and her eyes are terrible. "Give this to the Collective and we will fight with it. But we need people to believe the ration is breaking first."',
      choices: [
        { label: ['Give the proof to the Collective', { when: { standingBelow: { 'Belt Collective': -14 } }, text: '(the Collective does not trust you)' }],
          when: { standing: { 'Belt Collective': -14 } },
          effects: { story: { stage: 'belt1' }, storyLog: 'Gave the proof to Councillor Ama Tembo of the Belt Collective.' },
          result: '"Then bring us water," Tembo says. "Twenty tons, and let the whole station watch it come in. After that, we move." She puts her hand flat on the pump housing, as though on the shoulder of a friend, and for a while she does not speak. When she does, it is quieter. "My daughter is on the rationing list. She is eight. I am going to make sure this matters."' },
        { label: 'Not yet', result: '"Do not wait too long, captain," Tembo says, and closes her hand slowly around the edge of the pump housing. "Ceres cannot." The pumps thrum on beneath your feet, steady, patient, and every drop that passes through them is counted.' },
      ],
    });

    scene({
      id: 'cw-contact-mars', where: 'port', when: at(5, 'Mars'),
      title: 'Navy Intelligence',
      text: [{ when: { standing: { 'Mars Republic': 15 } },
        text: 'Commander Yelena Ueda of Mars Republic Navy intelligence meets you in a room with no windows, no clock, and one chair too few. She is short, precise, and impeccably groomed, with the flat, attentive gaze of someone who has spent her life listening for what people do not say. A single lamp burns on the desk. She reads the core without any visible reaction at all. "Headlines fade," she says at last. "Leverage lasts. Give Mars this, and we will make Earth pay for every ton of water it let Aquilon steal. But first I want to know who else is on Aquilon\'s payroll. That is the difference between a scandal and a weapon."',
        else: 'A Mars Republic Navy guard checks your record and shakes his head. "Commander Ueda does not meet with captains the Republic does not trust." (Needs Trusted standing with the Mars Republic.)' }],
      choices: [
        { label: 'Give the proof to Mars', when: { standing: { 'Mars Republic': 15 } },
          effects: { story: { stage: 'mars1' }, storyLog: 'Gave the proof to Commander Yelena Ueda of Mars Republic Navy intelligence.' },
          result: 'Ueda slides a sliver of hardware across the table, no bigger than a thumbnail, and cold as a coin. "A tracer. Get it into Hermes Foundry\'s comm net, on Mercury. It will listen for a week. Then come to Phobos Yards and we will see who has been paying whom." She does not smile. But as you turn to go, she says, to the wall, in a voice so soft you almost miss it: "Thank you. It matters more than you know."' },
        { label: 'Not yet', result: '"The offer stands, captain," Ueda says, without looking up from her desk, and her pen resumes its slow, exact scratching. "For now. But intelligence has a shelf life, and so, I am afraid, does patience."' },
      ],
    });

    scene({
      id: 'cw-contact-luna', where: 'port', when: at(5, 'Luna'),
      title: 'Coalition Intelligence',
      text: 'Director Samuel Achebe of Coalition intelligence receives you in an office overlooking the Luna shipyards, with the grey plain spread below in the harsh, clean light, and a slow parade of hulls in the drydocks. He is a tall, courtly man in his sixties, with a soft, warm baritone and a way of looking at you as though you were the only person in the room. He reads the core with evident distress. "You have done Earth a great service, captain," he says. "This needs careful handling. A panic on Ceres helps no one." He folds his hands. "We will also need Ms. Castellane. For her own protection, of course. You understand."',
      choices: [
        { label: ['Give the proof to the Coalition', { when: { standingBelow: { 'Earth Coalition': -14 } }, text: '(the Coalition does not trust you)' }],
          when: { standing: { 'Earth Coalition': -14 } },
          effects: { story: { stage: 'earth1' }, storyLog: 'Gave the proof to Director Samuel Achebe of Coalition intelligence.' },
          result: '"Bring her from Europa," Achebe says, warmly, without looking up. "Discreetly. She has been through a great deal, and we should not add to it." He is already reading the core, scrolling down through the damning lines with a small, thoughtful frown. You get the odd feeling of being politely dismissed by a man who has already forgotten you were there.' },
        { label: 'Not yet', result: '"Of course," Achebe says, with grace. "Take your time, captain. Within reason." He walks you to the door, one hand light on your shoulder, and the warmth of his smile does not quite reach his eyes. "But I would not wait long. Rumors have a way of outrunning the truth."' },
      ],
    });

    // Anselm Voight at Hermes Foundry: with the proof to sell, or after selling him the core.
    const voightJob = (id, stage, hasProof) => scene({
      id, where: 'port', when: at(stage, 'Hermes Foundry'),
      title: 'Anselm Voight',
      text: hasProof
        ? 'Voight receives you in an office at Hermes Foundry with a view of the solar furnaces, which glow like the inside of a forge through tinted glass. He is as immaculate as ever, without a hair out of place, and his desk holds a single glass of water, untouched, that catches the light. "You came to me," he says, and smiles. "Sensible. Twenty-five thousand credits for the core and every copy, and I can offer steady work besides. Aquilon rewards discretion."'
        : 'Voight receives you in an office at Hermes Foundry with a view of the solar furnaces, which glow like the inside of a forge through tinted glass. He is as immaculate as ever, and his desk holds a single glass of water, untouched, that catches the light. "Captain," he says, and there is real warmth in it. "You made the right choice about that core. Now I have a job for someone discreet."',
      choices: [
        { label: hasProof ? 'Sell the proof and take the job (+25,000 cr; needs 2 free berths)' : 'Take the job (needs 2 free berths)', when: { berths: 2 },
          effects: { credits: hasProof ? 25000 : 0, story: { stage: 'aq1' }, do: ['storyPassenger', 'two Aquilon technicians', 2, 'ceres', 'Ceres Station', 2000, 'techs'],
            storyLog: hasProof ? 'Sold the proof to Anselm Voight for 25,000 cr and took an Aquilon job.' : 'Took a job from Anselm Voight of Aquilon Hydrologics.' },
          result: '"Two of our maintenance technicians need passage to Ceres Station. Quietly." Voight smiles, and slides a slim folder across the desk. "They will pay their own fare. They are very professional. You will hardly notice they are there." He raises the glass of water, looks at it for a moment, and, very slowly, drinks. "Safe journey, captain."' },
        { label: 'Not yet', result: '"Aquilon is patient, captain," Voight says, setting down the glass. "Up to a point." He says it warmly, like a man wishing you a good evening, and you are halfway down the corridor before you understand what he meant.' },
      ],
    });
    voightJob('cw-voight-proof', 5, true);
    voightJob('cw-voight-sold', 'sold', false);

    // ---------- Belt Collective ----------

    scene({
      id: 'cw-belt-water', where: 'port', when: at('belt1', 'Ceres Station', { cargo: { water: 20 } }),
      title: 'Water Day',
      text: 'Word spreads before you even dock. By the time your cargo lock opens, half the ring is crowding the concourse to watch twenty tons of water roll out under Collective banners, in blue-lidded drums, one after another, on a line of hand-drawn sleds. Children are perched on the shoulders of parents. Old women hold up their cups. Someone has begun to sing, an old Belter hymn, low and rough, and one by one the others take it up. Councillor Tembo stands at the head of the line, and makes sure the cameras catch every drum.',
      choices: [{ label: 'Unload the water',
        effects: { cargo: { water: -20 }, credits: 6000, rep: { 'Belt Collective': 10 }, story: { stage: 'belt2' }, storyLog: 'Delivered 20t of water to Ceres Station for the Collective.' },
        result: 'The last drum rolls down the ramp, and the whole concourse erupts. The council pays 6,000 cr, and the crowd cheers your ship\'s name, again and again, until it is a wave. A small girl presses a paper cup into your hand, half full, and looks at you with grave, wide eyes. Tembo does not smile. "Aquilon will have seen that too," she says, low. "Get to Pallas Refinery. The refinery crews listen to people who deliver."' }],
    });

    scene({
      id: 'cw-pallas', where: 'port', when: at('belt2', 'Pallas Refinery', { story: { stage: 'belt2', ambushed: true } }),
      title: 'The Refinery Floor',
      text: ['Jo Marsh, the refinery steward, a big, soot-stained woman with forearms like cables, gathers three hundred smelter crews on the refinery floor to hear you out. They stand among the cooling molds in the red glow, in shifts still smoking from the furnace, and the air tastes of hot metal.',
        { when: { crew: 'rosa' }, text: 'Before you can start, Rosa steps up beside you, wiping her hands on a rag. Half of them seem to know her, and a murmur goes through the crowd like wind through a field.', else: 'They look tired, thirsty, and in no mood for speeches. A few of them have brought their children. Nobody is smiling.' }],
      choices: [{ label: 'Tell them what the core says',
        effects: { rep: { 'Belt Collective': 10 }, credits: 4000, do: ['endAct2', 'belt', 'Rallied the Pallas refinery crews. The Belt went on strike and the Collective voided Aquilon\'s ice claims.'] },
        result: [{ when: { crew: 'rosa' }, text: 'Rosa tells them about the Nine-B pumps, in her flat, plain voice, without a single decoration, and the room goes so quiet you can hear the molds cooling.' },
          'You tell them everything: the core, the pumps, the futures bought the day before every failure. When you finish, nobody speaks. Then Marsh raises a fist, slowly, and one by one three hundred fists rise with hers, and the refinery shuts down around you with a long, falling groan of machinery. By nightfall every Belt station is on strike, and the Collective council declares Aquilon\'s ice claims void. The union sends 4,000 cr for your trouble. Earth answers within the week: a Coalition fleet is on its way "to secure Ceres." (Act 2 complete. In a few days the fleets will reach Ceres, and your objective will be on the Port tab.)'] }],
    });

    // ---------- Mars Republic ----------

    scene({
      id: 'cw-tracer', where: 'port', when: at('mars1', 'Hermes Foundry'),
      title: 'The Tracer',
      text: 'Hermes Foundry\'s comm hub sits behind two security checkpoints and a very bored dock technician, who is eating noodles out of a foam cup and has, by the look of him, been on shift for eleven hours. The hub itself is a squat grey building at the base of a radiator fin, ringed with warning signs, its antennae glowing faintly in the furnace light. In your pocket, Ueda\'s tracer feels heavier than it should.',
      choices: [
        { label: '[{crew}] Have {crew} slip it in', when: { crew: 'slicer' },
          effects: { story: { stage: 'mars2' }, storyLog: 'Planted Commander Ueda\'s tracer in Hermes Foundry\'s comm net.' },
          result: '{crew} walks past both checkpoints with a borrowed badge and an expression of complete boredom, and is in and out of the hub\'s maintenance port in four minutes. When the door closes behind you, {crew} lets out a long, slow breath, and a small, delighted grin breaks across a face that has been solemn all week. "Done. Their security is a joke." A pause. "Please do not tell Ueda I said that. She will make it a training exercise."' },
        { label: 'Bribe the dock technician (3,000 cr)', when: { credits: 3000 },
          effects: { credits: -3000, story: { stage: 'mars2' }, storyLog: 'Bribed a Hermes Foundry technician to plant Commander Ueda\'s tracer.' },
          result: 'The technician looks at the credits, and at the tracer, and at you, and you watch him decide, very slowly, not to care. He pockets both, and goes back to his noodles. "I did not see you," he says. "I have never seen anyone." By the time you are back aboard, Ueda\'s channel blinks: "Signal confirmed." It is the shortest message she has ever sent, and the most relieved.' },
        { label: 'Do it yourself', effects: { do: 'tracerAttempt' } },
      ],
    });

    scene({
      id: 'cw-mars-debrief', where: 'port', when: at('mars2', 'Phobos Yards'),
      title: 'Leverage',
      text: ['Commander Ueda spreads the tracer\'s take across a table at Phobos Yards, sheet after sheet, in a room lit only by a single low lamp. Hermes Foundry executives bankrolling Aquilon. Three Earth Coalition trade officials on the payroll. Wire transfers with Martian banks, in the names of dead men. She reads aloud, and her voice, for once, is not entirely flat. "Now," she says, "Earth will listen."',
        { when: { crew: 'dima' }, text: 'She glances at Dima, who is leaning in the doorway with his arms folded. "Sokolov. I heard you were flying freighters now. Good." Dima grins, for a moment looking twenty years younger, and says nothing, which, for Dima, is a kind of speech.' }],
      choices: [{ label: 'Take the Navy\'s thanks',
        effects: { credits: 15000, rep: { 'Mars Republic': 15 }, do: ['endAct2', 'mars', 'Mars Republic Navy intelligence used the proof as leverage over Earth.'] },
        result: 'The Navy pays 15,000 cr and quietly marks your record, in a small, careful hand that you never see. Mars leaks just enough to make Earth sweat, a page here, a name there, timed to the hour. Earth accuses Mars of manufacturing the evidence, loudly and at length, and within a week both navies are moving toward Ceres, the way two ships circle each other in a crowded harbor. (Act 2 complete. In a few days the fleets will reach Ceres, and your objective will be on the Port tab.)' }],
    });

    // ---------- Earth Coalition ----------

    scene({
      id: 'cw-mira-doubt', where: 'port', when: at('earth1', 'Europa'),
      title: 'Mira Castellane',
      text: 'Mira is waiting at the Europa ice docks, in the same faded jacket, hands deep in her pockets, with the cold breath of the ice hanging in the air between you. Her face is very still. "Achebe sent you," she says. It is not a question. She looks past you at the long white hoses lining the dock, frozen into glittering fringes. "You know Coalition intelligence buries things for a living. I would like very much for you to tell me I am wrong."',
      choices: [
        { label: '"Come to Luna. You will be safe." (needs a free berth)', when: { berths: 1 },
          effects: { story: { stage: 'earth2' }, do: ['storyPassenger', 'Mira Castellane', 1, 'earth', 'Luna', 0, 'mira-luna'] },
          result: 'She looks at you for a long time, and something in her face slowly closes, like a hand. Then she picks up her duffel, without a word, and follows you up the ramp. She does not look back at the ice. You cannot tell if what you feel is trust, or its opposite.' },
        { label: '"Then let us take it to Ceres instead." (needs a free berth)', when: { berths: 1 },
          effects: { story: { stage: 'belt1' }, rep: { 'Earth Coalition': -10 }, do: ['storyPassenger', 'Mira Castellane', 1, 'ceres', 'Ceres Station', 0, 'mira-ceres'],
            storyLog: 'Turned away from Coalition intelligence and took Mira to the Belt Collective instead.' },
          result: '"Now you are talking," Mira says, and, to your surprise, laughs, a sudden bright startled sound, and scrubs her eyes with the heel of her hand. Achebe will not be pleased. Councillor Tembo will want water on Ceres: 20 tons of it. Mira picks up her duffel with a little more spring than before. "I have been waiting for someone to say that for three months."' },
      ],
    });

    M.addStorylet({
      id: 'cw-second-thoughts', where: 'transit', priority: 10, when: { aboard: 'mira-luna' },
      title: 'Second Thoughts',
      text: 'Mira watches Luna grow in the forward screen, grey and enormous, ringed with the pinpricks of a thousand drydock lights. She has not said a word in hours, and when she speaks, at last, her voice is dry and quiet. "You know what they will do with it. Achebe will lock the proof in a vault and me in a nice quiet room, and Ceres will keep running dry. I have seen it before, in a different coat." She turns to you, and, for the first time, she is pleading. "Drop me at Ceres Station instead. Let the Collective have it. Please."',
      choices: [
        { label: '"Trust me. Achebe gave his word."', effects: { storyAdd: { miraTrust: -1 } }, result: 'She says nothing for the rest of the burn. She sits at the viewport with her arms wrapped around herself, watching Luna grow, and every so often she touches the small metal capsule at her throat, as if to make sure it is still there. When you look at her, she does not look back.' },
        { label: '"All right. Ceres it is."',
          effects: { passenger: { who: 'mira-luna', set: { destSystem: 'ceres', destPlanet: 'Ceres Station', title: 'Carry Mira Castellane (1) to Ceres Station' } },
            story: { stage: 'belt1' }, storyAdd: { miraTrust: 2 }, rep: { 'Earth Coalition': -10 }, storyLog: 'Turned away from Coalition intelligence and took Mira to the Belt Collective instead.' },
          result: 'She closes her eyes, and a single tear slides down her cheek and is gone. "Thank you," she whispers. You replot for Ceres, and the ship swings around with a long, low groan of the frame. Achebe will not be pleased. (Your burn continues to its current destination; take Mira on to Ceres Station from there.)' },
      ],
    });

    scene({
      id: 'cw-custody', where: 'port', when: at('earth2', 'Luna'),
      title: 'Protective Custody',
      text: ['Two quiet people in Coalition grey are waiting at the airlock, with soft shoes and flat, kind faces, and a wheelchair no one will need. "Ms. Castellane will be well looked after," Achebe says, warmly, at your shoulder. Mira steps out of the airlock with her duffel in her hand and does not look back. Not once. Her back is very straight, and the metal capsule is gone from her throat.',
        { when: { crew: 'kit' }, text: 'Kit watches them go, arms folded, jaw set. "Protective custody," she mutters. "I have seen that before. Nobody comes back from it."' }],
      choices: [{ label: 'Collect your reward',
        effects: { credits: 20000, rep: { 'Earth Coalition': 15 }, do: ['endAct2', 'earth', 'Handed the proof and Mira Castellane to Coalition intelligence.'] },
        result: 'Achebe pays 20,000 cr from a discretionary fund and shakes your hand, warmly, with both of his. The proof disappears. So does Mira. Somewhere in the long cold corridors of the Luna shipyards, a door closes on a very quiet room. Two weeks later, Ceres riots over water, and a Coalition fleet moves in to "restore order". (Act 2 complete. In a few days the fleets will reach Ceres, and your objective will be on the Port tab.)' }],
    });

    // ---------- Aquilon ----------

    M.addStorylet({
      id: 'cw-techs', where: 'transit', priority: 10, when: { aboard: 'techs' },
      title: 'Quiet Passengers',
      text: 'The two Aquilon "maintenance technicians" keep to their bunks, and they keep their tool cases locked and within reach, even to eat, even to sleep. They are polite, pale, and utterly forgettable, with the flat, careful faces of people trained not to leave an impression. They speak in low voices, rarely, and never when anyone else is in the room. One of them, a young man, has the beginning of a tremor in his left hand that he hides in his pocket.',
      choices: [
        { label: 'Check their cases while they sleep', effects: { story: { techsKnown: true } },
          result: 'You wait until the ship\'s night, and ease the latches with a thin blade. Inside, nested in foam: pump-override kits, keyed to Ceres Water Authority hardware, with the Authority\'s own seals stolen and re-stamped, and a schedule, neatly printed. Three sectors. Six days. Your hands are cold when you close the cases. In the next bunk, the young man\'s eyes are open, watching you in the dark.' },
        { label: 'Mind your own business', result: 'You leave them to it. Aquilon is paying well, and it is not your job to look inside other people\'s luggage. You tell yourself this over dinner, and again before sleep. The cases sit in the corner of the berth, small and black and quiet, and nobody eats near them.' },
      ],
    });

    scene({
      id: 'cw-techs-reveal', where: 'port', when: at('aq1', 'Ceres Station'),
      title: 'Maintenance',
      text: ['Your two passengers head straight for the Sector Nine pump rooms with their locked cases, past a line of children carrying empty jugs, past a wall of hand-lettered ration notices, past a shrine to a water spirit that someone has decorated with paper drops.',
        { when: { story: { techsKnown: true } }, text: 'You know exactly what is in those cases, and they know that you know.', else: 'A Water Authority engineer watching them pass goes pale, and takes a quiet step backward, as though from a snake.' },
        'Once they are through that door, three more pumps will fail, and a great many people you will never meet will go thirsty.'],
      choices: [
        { label: 'Look the other way', effects: { credits: 12000, rep: { 'Belt Collective': -30 }, do: 'aquilonPumps' },
          result: 'An Aquilon account pays you 12,000 cr, quietly, with no note. You watch the door swing shut behind the technicians, and you turn away, and keep walking. Three more pumps fail on Ceres that week, and water there sells for more than reaction mass. In the ration lines, people who have been calm for months begin to shout. The Collective blames Earth, Earth blames Mars, and the fleets start to gather. (Act 2 complete. In a few days the fleets will reach Ceres, and your objective will be on the Port tab.)' },
        { label: 'Turn them in to the Collective', effects: { rep: { 'Belt Collective': 20 }, story: { stage: 'belt2' }, storyLog: 'Turned Aquilon\'s saboteurs over to the Belt Collective on Ceres.' },
          result: 'You tip off the Collective, and the militia are waiting at the pump-room door, six of them, very quiet. They take the technicians and their cases without a shot. The young man does not resist; he looks, if anything, relieved, and, as they lead him away, he gives you one wide, frightened look you will never forget. Councillor Tembo shakes your hand, hard, with both of hers. "Aquilon will come for you now," she says. "Get to Pallas Refinery. The refinery crews need to hear this from someone who was there."' },
      ],
    });

    // ==================== Act 3: the blockade of Ceres ====================

    scene({
      id: 'cw-act3-brief', where: 'port', when: { story: { stage: 'act2' }, storyDay: { act2Day: 5 } },
      title: 'The Fleets Arrive',
      text: [
        { when: { story: { side: 'belt' } }, text: 'Councillor Tembo, on a tight-beam channel, her voice raw and low: "The Coalition has blockaded Ceres. Nothing gets in, not even water. The rationing lines are three hours long, and we have buried four. Bring us twenty tons and break it. Every station in the Belt will be watching. We have nothing else left to ask you."' },
        { when: { story: { side: 'mars' } }, text: 'Commander Ueda, on an encrypted channel, clipped and cool: "The Coalition has closed Ceres. If a Mars-friendly captain breaks that blockade with water, Earth loses the Belt. Twenty tons, captain. Under our colors. Do not be brave. Be exact. I will not be able to help you once you are inside."' },
        { when: { story: { side: 'earth' } }, text: 'Director Achebe, gravely, with the air of a man burdened by duty: "Ceres is rioting, and Collective hardliners are attacking anything that approaches. Our blockade holds the station. Bring twenty tons of water through for Coalition relief and we can end this, before any more lives are lost. It is a sad business, captain. I would like to see it finished."' },
        { when: { story: { side: 'aquilon' } }, text: 'Anselm Voight, pleasantly, as though inviting you to dinner: "The blockade has made water on Ceres very valuable. Bring twenty tons. The Coalition will let you through; I have seen to it. The Collective hardliners, less so. Do try to be quick. The price is at its peak, and peaks do not last."' },
      ],
      choices: [{ label: 'Understood', effects: { story: { stage: 'act3' }, storyLog: 'Ceres was blockaded. Set out to run water through.' },
        result: 'You go through the checklist twice: guns, shields, reaction mass, hold. Then a third time, out of habit, because your hands need something to do. A single line of numbers on the console will decide whether you get through. (Water is cheapest on Europa, Enceladus, and Triton.)' }],
    });

    scene({
      id: 'cw-empty-handed', where: 'port', when: at('act3', 'Ceres Station'),
      title: 'Empty-Handed',
      text: 'You made it through the blockade, but your hold has no water in it. The people crowding the docking ring watch your cargo lock open on nothing, on an empty dark hold with a single loose strap swinging. Nobody says a word. A child in the front row, holding an empty jug, lowers it slowly to her side, and nobody tells her to pick it up. Come back with at least 20 tons.',
      choices: [{ label: 'Understood', result: 'You will be back. You say it aloud, once, to nobody, and the words come out smaller than you meant. The crowd parts to let you through, without a sound, and you feel their eyes on you all the way to the airlock.' }],
    });

    // The last choice: what you do with the water depends on whose side you took.
    const finalText = 'You made it. Through the blockade, through the gunfire, through the long dark burn, and now the docking ring is packed wall to wall, faces upturned in the hard light, and the crowd goes silent as your cargo lock cycles open. Twenty tons of water, lashed in drums along the hold, catching the light like a row of small moons. Every camera on Ceres is on your ship. Councillors, soldiers, children, and, somewhere in the crush, Mira Castellane\'s old friends from the pumps. Nobody moves. What happens next is up to you.';
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
