'use strict';

// Small scenes on landing: what is going on at the dock when you arrive. Each is a
// storylet with a low priority, so story scenes always come first, and a small chance,
// so most landings are quiet. Many only happen in certain places or conditions.

Mods.register({
  id: 'landings', name: 'Landing scenes', builtin: true,
  init(M) {
    const BELT = ['Ceres Station', 'Ring Nine', 'Pallas Refinery', 'The Hollows', 'Juno Commons', 'Ironheart', 'Boneyard', 'Eros Old Town'];
    const scene = (def, chance = 0.08) => M.addStorylet({ where: 'port', priority: -1, once: false, ...def, when: { day: 3, ...def.when, chance } });

    // A gamble: pay `cost`, then with `odds` apply the `win` effects, otherwise `lose`.
    M.addAction('gamble', (cost, odds, win, winText, loseText, lose) => {
      G.state.credits = Math.max(0, G.state.credits - cost);
      if (Math.random() >= odds) return [loseText, ...applyEffects(lose)].join(' ');
      return [winText, ...applyEffects(win)].join(' ');
    });
    // Standing with whoever runs this port.
    M.addAction('localRep', n => { if (isFaction(localGov())) changeRep(localGov(), n); });

    scene({
      id: 'land-customs', when: { gov: ['Earth Coalition', 'Mars Republic'], cargo: { luxury: 1 } },
      title: 'Random Inspection', text: 'Two customs officers are waiting at your cargo lock with a scanner and a clipboard. One of them is young and eager, the other old and tired, and the old one keeps glancing at your hold. "Routine," he says, before you have said a word. "Won\'t take long."',
      choices: [
        { label: 'Let them inspect', effects: { cargo: { luxury: -3 } }, result: 'The young officer runs the scanner over every crate. After a long silence he finds a "labeling irregularity" and confiscates three tons of luxury goods. For evidence. The old officer signs the form, and they carry the crates out on a sled. Your hold feels emptier than three tons should.' },
        { label: 'Offer a "processing fee" (300 cr)', when: { credits: 300 }, effects: { credits: -300 }, result: 'The old officer looks at the chit, and at you, and taps his scanner against his palm. "Would you look at that," he says. "A fault." The young one starts to speak and is stepped on. They wish you a pleasant stay, in the tone of a funeral, and leave. The whole thing takes less than a minute.' },
        { label: '[{crew}] Have {crew} fix the manifest first', when: { crew: 'slicer' }, result: 'By the time the officers plug in, {crew} has been through the manifest twice. It is spotless, and boring, with the dull, plausible detail no smuggler would invent. The old officer reads it slowly, twice, and looks up. He cannot find a reason. They leave.' },
      ],
    });

    scene({
      id: 'land-water-crowd', when: { planet: ['Ceres Station', 'Ring Nine', 'Pallas Refinery', 'The Hollows'], cargo: { water: 5 } },
      title: 'Thirsty Crowd', text: 'Word got out that your hold has water in it. A crowd is waiting at the dock when the lock opens: families with jugs and buckets and old fuel drums, a few angry dockers with their arms folded, a knot of old women who have brought their own folding stools. At the front, a kid of six or seven holds a plastic cup in both hands, and does not move.',
      choices: [
        { label: 'Hand out five tons at cost', effects: { cargo: { water: -5 }, credits: 300, rep: { 'Belt Collective': 3 }, log: 'Handed out water to a crowd on {planet}.' }, result: 'It goes in twenty minutes, drum by drum, along a line that snakes around the concourse. Nobody pushes. The angry dockers unfold their arms and start carrying. The old women pass a thermos of tea down the line. When the last drum is empty the kid with the cup comes back, holding it out to you, half full. "This is yours, too," she says. You drink it.' },
        { label: 'Seal the lock and sell it through the market', result: 'You seal the lock and go the long way round, through a service corridor, with the crowd\'s silence behind you. Nobody throws anything. The kid with the cup does not move. At the market the price is exactly what it says on the board.' },
      ],
    });

    scene({
      id: 'land-wedding', when: { planet: ['Juno Commons', 'The Hollows', 'Ring Nine'] },
      title: 'A Wedding', text: 'There is a wedding in the main corridor, and on {planet} that means everyone is invited, including the crew of whatever ship just docked. Strings of lanterns hang from the pipes, and long tables have been laid out end to end, groaning under bowls of steaming food. A band of three, with a fiddle, a drum, and a battered accordion, is playing something fast and cheerful. The bride, in a dress made of patched parachute silk, catches your eye across the crowd and waves you over, laughing, with a plate already in her hand.',
      choices: [
        { label: 'Bring a gift (200 cr)', when: { credits: 200 }, effects: { credits: -200, rep: { 'Belt Collective': 2 }, log: 'Danced at a wedding on {planet}.' }, result: 'You press the gift into the groom\'s hands and are swept into a dance you do not know, led by a grandmother. You dance badly, eat well, and are toasted three times, in three dialects. Somewhere after midnight you are singing a chorus you have never heard, with an arm around a stranger. They will remember your ship\'s name.' },
        { label: 'Stand at the back and raise a glass', result: 'The couple are very young, and they do not seem to care who is watching. You raise your glass at the vows, and the bride, across the crowd, lifts hers. You stay for the first dance and leave before the music turns wild.' },
        { label: 'Excuse yourself', result: 'You have cargo to see to, and you say so. The music follows you back to the dock, down three corridors and a ladder, and you can hear it for a long time.' },
      ],
    });

    scene({
      id: 'land-funeral', when: { planet: ['Pallas Refinery', 'The Hollows', 'Ironheart'] },
      title: 'Procession', text: 'A funeral procession fills the corridor, slow and silent, and the whole dock goes still to let it pass. A refinery accident, three crew, taken in the night when a coolant line let go. Their families walk in front, carrying the helmets, in a row, with the visors polished to a mirror shine. Behind them, in ranks, come the smelter crews in their soot-stained work jackets, each with a small blue candle. Nobody speaks. The only sound is the shuffle of boots, and the hush of the vents.',
      choices: [
        { label: 'Give to the families\' fund (300 cr)', when: { credits: 300 }, effects: { credits: -300, rep: { 'Belt Collective': 2 } }, result: 'You put the credits into the box at the head of the line, a battered ore canister with a slot cut in the lid. A woman in a heat suit, one of the families, stops and takes your hand in both of hers without a word. Her hands are burned and rough and shaking. She nods, and moves on, and the line closes behind her.' },
        { label: 'Stand aside with your head bowed', result: 'You step back against the bulkhead and wait, hands folded, as the procession goes by. It takes a long time. When the last of them has passed the dock stays hushed a moment more, and then the noise comes back, one voice at a time.' },
      ],
    });

    scene({
      id: 'land-stowaway', when: { planet: BELT },
      title: 'Stowaway', text: 'Your cargo lock opens on a kid of about fourteen, curled up behind a crate with a bag of clothes, thin and shivering, with a fading bruise on one cheekbone and a shoe held together with tape. They have been here for days, living on stale ration bars. They look up at you, and their voice is a cracked whisper: "Please. Anywhere but here."',
      choices: [
        { label: 'Walk them home', effects: { rep: { 'Belt Collective': 1 } }, result: 'You walk them home, through three corridors and a market, without speaking. Their mother meets you at the door of a small crowded cabin. She cries, then shouts, then cries again, with her hands on the kid\'s face. The kid will not look at you. You stand there a moment. The mother, still crying, presses a fried dumpling into your hand, and you go.' },
        { label: 'Give them 200 cr and some advice', when: { credits: 200 }, effects: { credits: -200 }, result: '"Find a ship with a good captain," you say, low, "and learn a trade first. Do not go with anyone who is in a hurry." They take the money in both hands, staring at it, and look up at you, once. Then they nod, and vanish into the crowd, quick as a fish.' },
        { label: 'Hand them to dock security', result: 'Security is not gentle about it. The kid does not fight, does not cry, does not say a word. They look back once over their shoulder as they are led away, and their eyes find yours. It takes a while for your hands to feel right again.' },
      ],
    });

    scene({
      id: 'land-pickpocket', when: { planet: ['Earth', 'Ceres Station', 'The Rook', 'Ganymede', 'Eros Old Town', 'Ring Nine'] },
      title: 'Light Fingers', text: 'Somebody bumps you in the crush at the dock, a quick shoulder in the ribs, apologizes nicely in a low warm voice, and is gone into the crowd before you can turn. A half-second later you feel the lightness in your coat, and the empty place where your credit chit was. Ahead of you a green jacket ducks around a corner.',
      choices: [
        { label: 'Give chase', effects: { do: ['gamble', 0, 0.5, {}, 'You catch them two corridors on, in a dead end by the recyclers: a skinny kid, all elbows, out of breath and grinning. You get the chit back, and an apology in three languages ending with a compliment on your boots. You almost let them go.', 'They know these corridors and you do not, and within a minute you are lost among the laundry lines. Gone, with 250 cr, and a distant laugh.', { credits: -250 }] }, result: '' },
        { label: 'Let it go', effects: { credits: -250 }, result: 'You cancel the chit at a kiosk, but they have already spent 250 cr of it. A receipt for a very large bag of candied ginger arrives on your comm a moment later, with a note: "Thank you." Welcome to {planet}.' },
      ],
    });

    scene({
      id: 'land-claim-map', when: { planet: ['Eros Old Town', 'Ironheart', 'Boneyard'] },
      title: 'The Map', text: 'An old prospector catches your sleeve at the dock, with a hand like a bundle of twigs, and pulls you into the shadow of a fuel tank. His coat is patched at every seam, and his eyes are wet. "Survey data," he whispers. "A rock nobody has claimed, thick with platinum. I found it thirty years ago and never had the ship. I\'m too old to go." He presses a battered data slate into your palm. "Five hundred and it\'s yours. I would rather it went to someone who might use it."',
      choices: [
        { label: 'Buy the map (500 cr)', when: { credits: 500 }, effects: { do: ['gamble', 500, 0.3, { credits: 2500 }, 'You sell the survey to the claims office for 2,500 cr, in a small dusty room, to a surprised clerk. The old man was telling the truth. When you go back to find him, the dock crew say he left on the last ship to Ceres.', 'The claims office laughs you out of the room, kindly: the rock was registered forty years ago and has been mined out for thirty. The old man is nowhere to be found. Someone at the dock says he does this to a new captain every year.'] }, result: '' },
        { label: '"Save it for someone else."', result: '"Everyone says that," he says, quietly, and lets go of your sleeve, and slips the slate back into his coat, carefully. He does not look angry. He has said the same thing at the same rail for thirty years.' },
      ],
    });

    scene({
      id: 'land-recruiters', when: { war: true, gov: ['Earth Coalition', 'Mars Republic', 'Belt Collective'] },
      title: 'Recruiters', text: 'Navy recruiters have set up a table at the dock under a banner that says your system needs you, in tall red letters, with a photograph of a very young sailor. There is a bowl of hard candy, a stack of pamphlets, and a sergeant with a friendly smile. They look at your ship\'s guns with interest, and at your crew with more, and one of them is reaching for a clipboard. "Captain! Got a minute for your country?"',
      choices: [
        { label: 'Donate to the war relief fund (300 cr)', when: { credits: 300 }, effects: { credits: -300, do: ['localRep', 2] }, result: 'The sergeant takes the credits with a nod and pins a small enamel badge to your jacket. Behind him is a wall of names, the fallen, in small neat letters, and a child is laying a paper flower under the newest. For the rest of your stay strangers nod at the pin.' },
        { label: 'Walk past', result: 'A recruiter calls after you about patriotism, then, as you keep going, about duty, then, more quietly, about somebody\'s brother. You keep walking. The voice fades behind you.' },
      ],
    });

    scene({
      id: 'land-crush', when: { crew: 'medic' },
      title: 'Crush Injury', text: 'A cargo sled slips its clamps two berths down with a sharp ringing crack, and pins a dockworker against the bulkhead. His shout is short and awful, then stops. The other dockers freeze, then scramble, dragging at the sled with bare hands, and someone is screaming for a medic. The dock medic, you hear, is on the other side of the station, at least six minutes away. The man\'s face is going gray.',
      choices: [
        { label: '[{crew}] Send {crew}', when: { crew: 'medic' }, effects: { credits: 300, do: ['localRep', 2] }, result: '{crew} is there in thirty seconds, with a case in one hand, shouldering through the crowd, and kneels in the wreckage without a word. For six minutes {crew} keeps the worker breathing, hands red to the wrist, while the dockers lift the sled by inches. When the medics arrive the man is alive. The dock foreman, weeping, insists on paying you 300 cr, and the dockers stop overcharging you for clamps.' },
        { label: 'Stay out of it', result: 'You stay where you are, hands at your sides, and watch the dockers work. The medics get there eventually, running, and the man is carried away on a stretcher, quiet. You do not learn if he lives. In the corridor, afterward, a woman who saw you standing there looks at you, and looks away, and does not say anything.' },
      ],
    }, 0.06);

    scene({
      id: 'land-raid-aftermath', when: { raid: true, cargo: { medical: 2 } },
      title: 'After the Raid', text: 'Two ships at the next berths are scorched and holed, black streaks down their flanks, one with a breach in the hull that still glows at the edges. The crews are laying their wounded out on the dock on blankets and cargo netting, in a row, waiting for a medic who is not coming. A woman with a burned arm is holding a child\'s hand. Neither is crying. The air smells of ozone and scorched paint.',
      choices: [
        { label: 'Open two tons of your medical supplies', effects: { cargo: { medical: -2 }, rep: { 'Belt Collective': 2, 'Earth Coalition': 1, 'Mars Republic': 1 }, log: 'Gave medical supplies to raid survivors on {planet}.' }, result: 'You carry the crates out yourself, two at a time, and crack the seals on the dock. Painkillers, dressings and clean water go down the row hand to hand, like a bucket line at a fire. The woman with the burned arm looks up and puts a hand over her heart.' },
        { label: 'Keep your cargo sealed', result: 'You have contracts to fill, and a schedule, and you tell yourself the medics will be along. You walk between the rows of wounded to your own airlock with your eyes on the deck. When the lock closes behind you, it is quiet.' },
      ],
    });

    scene({
      id: 'land-surcharge', when: { bust: 'Belt Collective', gov: 'Belt Collective' },
      title: 'Slump Surcharge', text: 'The dockmaster has a new form on official pink paper, three pages long: a "temporary economic stabilization surcharge" of 200 cr on every visiting ship. He slides it across the counter without meeting your eye. Behind him a hand-lettered sign has been taped over the old rate card: PRICES SUBJECT TO CHANGE. Somebody has added, in pencil, "DAILY."',
      choices: [
        { label: 'Pay it (200 cr)', when: { credits: 200 }, effects: { credits: -200 }, result: 'The dockmaster stamps your form without looking up, and files it, and does not say thank you. His stamp is worn nearly to a smooth blob, and each press leaves a smeared, purple ring. As you turn to go, you catch a flicker of something in his face, shame, or exhaustion, and then it is gone, and the next ship is at the counter.' },
        { label: 'Argue', effects: { rep: { 'Belt Collective': -1 } }, result: 'You argue, at length, with citations, and a rising voice. The dockmaster gives in at last and stamps the form PAID. You win. You feel wonderful for about ten minutes. Then you notice the line of tired captains behind you, who could not have won, and the dockmaster, who will remember.' },
        { label: '[{crew}] Let {crew} talk to them', when: { crew: 'quartermaster' }, result: '{crew} reads the form once, slowly, the way an old miner reads a cave wall, and finds a clause on the third page that exempts ships carrying essential goods, and a way to make yours one, with a single stamped line in your manifest. The dockmaster reads it twice, opens his mouth, closes it, and waives the fee. "Nobody reads the fine print anymore," he says.' },
      ],
    }, 0.12);

    scene({
      id: 'land-festival', when: { boom: 'Belt Collective', planet: BELT },
      title: 'Payday', text: 'The ore prices are up and it is payday on {planet}. The corridors are full of music, food stalls with hissing griddles, and people spending money they did not have last month, arm in arm, laughing, in their best jackets. A ring toss has set up under a gantry. A man is selling paper lanterns shaped like little ships. Kids run between the legs of the crowd with sticky hands. The whole place smells of fried dough and cheap sweet wine, and it is, for the moment, entirely joyful.',
      choices: [
        { label: 'Join in (150 cr)', when: { credits: 150 }, effects: { credits: -150, log: 'Joined a payday party on {planet}.' }, result: 'You eat things on sticks, three kinds, all delicious and none identifiable, lose at a ring toss to a nine-year-old, and get home late with a paper lantern shaped like a freighter under one arm. A stranger insists on buying you a cup of the sweet wine.' },
        { label: 'Work the crowd for cargo buyers', effects: { credits: 400 }, result: 'Everyone is buying, and for once nobody haggles. You set up a folding table at the mouth of the concourse and sell odds and ends from your stores for 400 cr, in twenty minutes, to a stream of cheerful, slightly drunk strangers.' },
      ],
    }, 0.15);

    scene({
      id: 'land-ringball-kids', when: { planet: ['The Hollows', 'Juno Commons', 'Ring Nine'] },
      title: 'Referee', text: 'A gang of kids is playing ring-ball in the corridor outside your dock, a dozen of them in mismatched jerseys made of old work shirts, and the argument over the last goal is turning into a fight. Voices are rising, fists are balling, and one small boy, red in the face, has picked up the ball and is holding it hostage. Then, all at once, they turn and look at you: an adult, a stranger, obviously neutral, the only person in the corridor who does not have a team.',
      choices: [
        { label: '"Goal."', result: 'You say it with the gravity of a judge, and half the kids erupt in a shrieking cheer and throw their jerseys in the air. The other half stand in silence, and then someone calls you a Coalition spy, and the chant spreads. For the next hour you cannot walk the corridor without a delegation of children explaining your mistake.' },
        { label: '"No goal."', result: 'You say it firmly, and the other half of the kids erupt, and the cheer echoes down the corridor. The half that lost stare at you. One of them, a girl with a missing front tooth, says clearly, "You are a Belter traitor," and stalks off.' },
        { label: 'Buy them a new ball (50 cr)', when: { credits: 50 }, effects: { credits: -50, rep: { 'Belt Collective': 1 } }, result: 'You duck into the nearest shop and come back with a fresh orange ball that smells of new rubber. The old one, you see, was mostly tape, layers of it, wound by generations of small hands. The argument is forgotten. They swarm you, shouting thanks, and within a minute the whole gang is playing again.' },
      ],
    });

    scene({
      id: 'land-salvage-auction', when: { planet: 'Boneyard' },
      title: 'Salvage Auction', text: 'The Boneyard auctions sealed containers pulled from wrecks, unopened, on the dock, from a rickety stage made of an old cargo lift. The auctioneer, a tall woman in a faded flight jacket and a top hat, works the crowd like a preacher. The next lot is a two-ton crate with a Coalition stencil, dented and scarred, still with a scrap of burned rope on one handle. "Sealed," she cries, rapping the crate. "Untouched! Who knows what riches lie within! Bidding starts at 800."',
      choices: [
        { label: 'Bid 800 cr', when: { credits: 800, space: 8 }, effects: { do: ['gamble', 800, 0.55, { cargo: { equipment: 8 } }, 'You crack it open on the dock, with a borrowed crowbar, while the crowd leans in: eight tons of electronics, still in their packing, gleaming and pristine. A cheer goes up, and the auctioneer tips her hat.', 'You crack it open on the dock, with a borrowed crowbar, while the crowd leans in: two tons of Coalition paperwork, in triplicate, bound in soft gray folders. A groan goes up. The auctioneer tips her hat in sympathy.'] }, result: '' },
        { label: 'Watch someone else lose their money', result: 'The bidding climbs, in a slow, cheerful, cutthroat way, to a bright peak, and the winner, a stout man with a cigar, opens it to cheers. It is full of boots. Left boots. Hundreds of them, all the same size, in a neat, pungent pile. The crowd roars with laughter, and the man with the cigar, after a stunned pause, starts laughing, too, until he has to sit down.' },
      ],
    }, 0.25);

    scene({
      id: 'land-dock-tax', when: { planet: 'The Rook', standingBelow: { Pirate: 15 } },
      title: 'Dock Tax', text: 'A woman with a pistol on each hip and a clipboard steps out from behind a stack of crates as you leave the airlock, blocking the corridor, one boot against the door frame. She has a shaved head, a scar through one eyebrow, and a friendly smile. "Welcome to the Rook," she says. "Ten minutes, and a short list of rules. First: the Rook charges a dock tax, payable to me, now." She taps the clipboard with a pen. "It is a fair tax."',
      choices: [
        { label: 'Pay (300 cr)', when: { credits: 300 }, effects: { credits: -300 }, result: 'She writes you a receipt in a looping hand, tears it off the pad, and gives it to you with a flourish. It is a real receipt, stamped and numbered, with a little black tower embossed at the top. "Keep it," she says. "If anyone stops you, show them. It will save you trouble." She steps aside to let you pass.' },
        { label: 'Refuse', effects: { rep: { Pirate: -2 } }, result: 'She shrugs and makes a note on the clipboard without looking up. "Suit yourself," she says. She does not threaten you, and she does not follow. For the rest of your stay, in the bars and along the corridors, the same two people are always a little behind you.' },
        { label: '[{crew}] {crew} steps forward', when: { crew: 'gunner' }, effects: { rep: { Pirate: 1 } }, result: '{crew} steps forward, hands loose at their sides, and looks at her for a long moment without a word. The corridor goes quiet. Then the woman with the pistols throws back her head and laughs, and lowers her clipboard. "Fair enough. First one\'s free." She claps {crew} on the shoulder, hard, and steps aside. You do not get a receipt, but you get a wave from the whole bar.' },
      ],
    }, 0.2);

    scene({
      id: 'land-journalist', when: { planet: ['Earth', 'Luna'] },
      title: 'Human Interest', text: 'A feed journalist with a camera drone waylays you at the dock, well dressed, with a microphone the size of a child\'s fist. The drone hovers at your shoulder, humming, with a small red light. "Excuse me! Excuse me, captain! You look like a real Belt captain." She flashes a good smile. "I am doing a segment on life in the outer system, and, honestly, nobody here has any idea what it is like out there. Two minutes? It would mean the world."',
      choices: [
        { label: 'Tell them how it really is out there', effects: { rep: { 'Belt Collective': 2, 'Earth Coalition': -1 }, news: 'A feed segment on life in the Belt is getting attention on Earth: rationing, raids, and the ships that keep it running.' }, result: 'You tell her about the rationing lines, and the crews who go without, and the ships that keep it running on hope and sealant, and the way the water is counted, drop by drop. Halfway through she stops smiling, lowers the microphone, and listens. The segment runs that night, and half of Earth watches. The Coalition press office is not pleased. The next morning a package of very good coffee arrives at your ship, with no name on it.' },
        { label: 'Talk up the Coalition\'s work in the Belt', effects: { rep: { 'Earth Coalition': 2, 'Belt Collective': -1 } }, result: 'You say all the right things: the relief convoys, the medical shipments, the tireless dockers, the great cooperation between planets. You have a good, clear, sincere voice, and it sounds even better on camera. It plays well on Earth, and gets shared a thousand times. Afterward you wash your hands for longer than you need to.' },
        { label: '"No comment."', result: 'The drone follows you halfway to customs, humming, with its small red eye fixed on your face, and the journalist trots behind it, calling out increasingly creative questions. "Just one word, captain! One word! Do you like the food?" You do not answer. At the customs gate, the drone finally peels off, with what feels like a small electronic sigh.' },
      ],
    });

    scene({
      id: 'land-memorial', when: { planet: 'Mars' },
      title: 'Memorial Day', text: 'It is the anniversary of the Tharsis blockade, and all across the port the ordinary noise has stopped. Old navy veterans in faded dress blues, some in wheelchairs, some with canes, are laying wreaths of red paper flowers at the dock memorial, a black wall carved with names. A single bugle plays somewhere, slow and thin. A little girl in a Navy cap salutes, and nobody smiles.',
      choices: [
        { label: 'Join the moment of silence', effects: { rep: { 'Mars Republic': 1 } }, result: 'You stand with the others, head bowed, hands folded, for the full two minutes, as the bugle plays and the wreaths are laid. When it ends, an old woman in a faded MRN jacket, with a chest full of tarnished medals, comes over and nods to you once. She does not say a word.' },
        { label: 'Get on with your business', result: 'You get some looks. Not angry ones, exactly, but a slow, steady, silent turning of heads as you cross the dock with your cargo sled, the wheels loud in the hush. A veteran in a wheelchair watches you all the way to the far gate, without expression, and you feel, at every step, the weight of what you did not stop for.' },
      ],
    });

    scene({
      id: 'land-harvest', when: { planet: ['Ganymede', 'Juno Commons'], space: 5 },
      title: 'Harvest Fair', text: 'The harvest came in heavy, and the growers are selling the surplus off the back of carts on the dock, cheap, before it spoils. The whole concourse smells of ripe fruit and turned earth. Tomatoes are stacked in pyramids, peaches in crates, leeks and beans and dark greens piled on trestle tables. A woman in a straw hat is shouting prices in a sing-song. Sunburned kids in overalls run between the carts with baskets. It is loud, and bright, and it looks like a village fair on some old green Earth.',
      choices: [
        { label: 'Buy five tons of food (250 cr)', when: { credits: 250 }, effects: { credits: -250, cargo: { food: 5 } }, result: 'Fresh, cheap, and loaded by a gang of sunburned teenagers who badger you the whole time with questions about your ship: how fast, how big, how many guns, has it ever been in a fight? The food is still warm from the sun. The woman in the straw hat throws in a bag of peaches for free. "For the road," she says. A good deal.' },
        { label: 'Just buy lunch', result: 'You wander the carts with a paper plate and a fork, and eat, standing up, a hot bean stew with sweet bread, a slice of peach pie, a tomato salted and eaten like an apple. It is the best meal you have had in months. Nobody rushes you. An old man on a crate hums a tune, and a child, unbidden, brings you a cup of cold, sweet tea.' },
      ],
    }, 0.12);

    scene({
      id: 'land-long-night', when: { planet: ['Triton Outpost', 'Enceladus'] },
      title: 'News From Inside', text: 'Your ship is the first in weeks. Half the outpost comes down to the dock as you arrive, in heavy quilted coats and patched suits, in small silent clusters, not to trade, but to ask what is happening in the inner system. They stand at the edge of the light with their breath steaming, and do not crowd you. An old man in a knitted cap steps forward. "Sorry, captain," he says. "It is just that, out here, it gets very quiet. Would you tell us something? Anything?"',
      choices: [
        { label: 'Stay and talk (a long evening)', effects: { log: 'Spent an evening telling {planet} the news.' }, result: 'You sit on an upturned crate by the airlock and tell them, for hours, about the markets, the wars, the new ring-ball season, and what everyone is watching on the feeds. They listen in a circle in the cold, with their hands around cups of something hot that someone keeps refilling. Nobody interrupts. When you finally stop, hoarse, there is a silence, and then the old man says, "Thank you. That was better than a supply drop."' },
        { label: 'Leave them a crate of luxuries (1 ton)', when: { cargo: { luxury: 1 } }, effects: { cargo: { luxury: -1 }, credits: 900 }, result: 'You carry the crate down the ramp and crack the lid. Nobody moves: chocolate, coffee, small bottles of spirits, a wheel of real cheese. Then a laugh goes up, and someone passes the hat, and they give you 900 cr for it, which is more than it is worth anywhere else. A little girl sits on the crate and eats chocolate with her eyes closed.' },
      ],
    }, 0.2);

    scene({
      id: 'land-noodle-letter', when: { planet: 'Ring Nine' },
      title: 'A Letter', text: 'Auntie Oyelaran from the noodle counter presses a sealed envelope into your hand, wiping her other hand on her apron, with steam from the broth still curling around her face. The envelope is real paper, thick and creamy, addressed in a careful, old-fashioned hand. "For my son, on Ceres Station," she says. "He never answers his messages. He will answer a letter. A mother knows these things." She looks at you with the calm, unshakeable authority of every mother who has ever stood at a counter.',
      choices: [
        { label: 'Carry it', effects: { mission: { to: 'Ceres Station', title: 'Deliver Auntie Oyelaran\'s letter to her son on Ceres Station', pay: 150, days: 20 } }, result: 'She gives you a bowl of noodles for the road, packed in a hot metal tin with a lid tied down by string, with ginger, and chili oil, and a soft-boiled egg on top, which is worth more than the fee. "Tell him I said to eat properly," she calls, as you go, and half the counter turns to watch you leave, nodding gravely.' },
        { label: '"I\'m not going that way."', result: '"Everyone goes that way eventually," she says, and tucks the envelope back in her apron. "The letter will keep. My son will not, but the letter will." She goes back to the broth.' },
      ],
    }, 0.15);

    scene({
      id: 'land-coop-vote', when: { planet: 'Ironheart' },
      title: 'The Vote', text: 'The Ironheart co-op is voting on whether to raise docking fees for outside ships, and outsiders get to speak before the vote. The hall is a round cavern, its floor worn to a shallow groove by generations of boots, with five hundred prospectors in mismatched work jackets sitting in rows on old crates. A very old woman in the front holds a battered gavel, and when she sees you she points it at the speaker\'s stone. "Outsider," she says. "Two minutes. Make them count."',
      choices: [
        { label: 'Make a speech about free trade', effects: { do: ['gamble', 0, 0.5, { credits: 300 }, 'You speak for a minute and forty seconds, about ships and trade and how an open dock feeds a town, and the hall listens with a long, dry silence that turns, unexpectedly, into a ripple of applause. They vote the fee down, and a grateful member finds you on the way out and slips you a 300 cr contract to haul her ore samples, wrapped in a cloth. "Nobody ever talks that sense in here," she says.', 'You are booed off the floor within thirty seconds, in a rolling, cheerful wave of jeers, and somebody throws a heel of bread. The fee passes. At least you tried, and at least, on the way out, the old woman with the gavel gives you a small nod that might be sympathy.'] }, result: '' },
        { label: 'Stay out of local politics', result: 'You take a seat at the back, and listen to two hours of cheerful, passionate, wonderfully pointless argument about the price of dock clamps. The fee passes by six votes. It is not much, and nobody seems especially upset, and afterward half the hall goes out to the same tavern together, arguing happily.' },
      ],
    }, 0.2);

    scene({
      id: 'land-old-timer', when: { planet: 'Eros Old Town' },
      title: 'The Old Days', text: 'An old miner at the dock rail tells you, unprompted, about the boom: forty thousand people, money in the air, dance halls open all night, and a ship leaving for somewhere new every hour. He leans on the rail with both forearms, looking out at the empty berths, and his voice grows quieter and rounder as he goes, the way a man\'s voice does when he is telling something for the thousandth time and still means it. "I was nineteen," he says. "Nineteen, and I thought it would last forever."',
      choices: [
        { label: 'Listen to the whole thing', effects: { do: ['gamble', 0, 0.4, { credits: 400 }, 'It takes forty minutes. At the end he grips your wrist, lowers his voice, and gives you a tip about a sealed tunnel on the west side with old stock in it that nobody has bothered to open. You go, out of curiosity, and find an assayer\'s office with a cracked window and, in the back, four crates of scrap. You sell what you find for 400 cr.', 'It is a good story, with a long slow ending about a woman he lost in the crush of a Friday night. Some of it might be true. When you leave, he is still standing at the rail, looking out at the empty berths.'] }, result: '' },
        { label: 'Politely excuse yourself', result: 'He nods, without offense, and turns back to the rail. By the time you have reached the end of the dock, he has found the next captain, and his voice, low and warm, has begun again: "I was nineteen." It follows you a long way, softer and softer, like a tune.' },
      ],
    }, 0.2);
  },
});
