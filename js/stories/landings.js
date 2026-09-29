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
      title: 'Random Inspection', text: 'Two customs officers are waiting at your cargo lock with a scanner and the look of people who have already decided what they will find.',
      choices: [
        { label: 'Let them inspect', effects: { cargo: { luxury: -3 } }, result: 'They find a "labeling irregularity" and confiscate three tons of luxury goods. For evidence.' },
        { label: 'Offer a "processing fee" (300 cr)', when: { credits: 300 }, effects: { credits: -300 }, result: 'The scanner develops a fault. They wish you a pleasant stay.' },
        { label: '[{crew}] Have {crew} fix the manifest first', when: { crew: 'slicer' }, result: 'By the time the officers plug in, your manifest is spotless, and a little boring. They leave disappointed.' },
      ],
    });

    scene({
      id: 'land-water-crowd', when: { planet: ['Ceres Station', 'Ring Nine', 'Pallas Refinery', 'The Hollows'], cargo: { water: 5 } },
      title: 'Thirsty Crowd', text: 'Word got out that your hold has water in it. A crowd is waiting at the dock: families with jugs, a few angry dockers, a kid holding a cup.',
      choices: [
        { label: 'Hand out five tons at cost', effects: { cargo: { water: -5 }, credits: 300, rep: { 'Belt Collective': 3 }, log: 'Handed out water to a crowd on {planet}.' }, result: 'It goes in twenty minutes. The kid with the cup comes back to say thank you.' },
        { label: 'Seal the lock and sell it through the market', result: 'You go the long way round. Nobody throws anything, quite.' },
      ],
    });

    scene({
      id: 'land-wedding', when: { planet: ['Juno Commons', 'The Hollows', 'Ring Nine'] },
      title: 'A Wedding', text: 'There is a wedding in the main corridor, and on {planet} that means everyone is invited, including the crew of whatever ship just docked.',
      choices: [
        { label: 'Bring a gift (200 cr)', when: { credits: 200 }, effects: { credits: -200, rep: { 'Belt Collective': 2 }, log: 'Danced at a wedding on {planet}.' }, result: 'You dance badly, eat well, and are toasted as honored guests. Someone will remember your ship\'s name for a long time.' },
        { label: 'Stand at the back and raise a glass', result: 'It is a good wedding. The couple are very young and very happy.' },
        { label: 'Excuse yourself', result: 'You have cargo to see to. The music follows you all the way back to the dock.' },
      ],
    });

    scene({
      id: 'land-funeral', when: { planet: ['Pallas Refinery', 'The Hollows', 'Ironheart'] },
      title: 'Procession', text: 'A funeral procession fills the corridor: a refinery accident, three crew. Their families walk in front, carrying the helmets.',
      choices: [
        { label: 'Give to the families\' fund (300 cr)', when: { credits: 300 }, effects: { credits: -300, rep: { 'Belt Collective': 2 } }, result: 'A woman in a heat suit presses your hand without a word.' },
        { label: 'Stand aside with your head bowed', result: 'You wait until the last of them has passed.' },
      ],
    });

    scene({
      id: 'land-stowaway', when: { planet: BELT },
      title: 'Stowaway', text: 'Your cargo lock opens on a kid of maybe fourteen, curled up behind a crate with a bag of clothes. "Please. Anywhere but here."',
      choices: [
        { label: 'Walk them home', effects: { rep: { 'Belt Collective': 1 } }, result: 'Their mother cries, then shouts, then cries again. The kid will not look at you. They will run again, but not today.' },
        { label: 'Give them 200 cr and some advice', when: { credits: 200 }, effects: { credits: -200 }, result: '"Find a ship with a good captain, and learn a trade first." They take the money and vanish into the crowd.' },
        { label: 'Hand them to dock security', result: 'Security is not gentle about it.' },
      ],
    });

    scene({
      id: 'land-pickpocket', when: { planet: ['Earth', 'Ceres Station', 'The Rook', 'Ganymede', 'Eros Old Town', 'Ring Nine'] },
      title: 'Light Fingers', text: 'Somebody bumps you in the crush at the dock, apologizes nicely, and is gone. So is your credit chit.',
      choices: [
        { label: 'Give chase', effects: { do: ['gamble', 0, 0.5, {}, 'You catch them two corridors on: a skinny kid, all elbows. You get the chit back, and a very creative apology.', 'They know these corridors and you do not. Gone, with 250 cr.', { credits: -250 }] }, result: '' },
        { label: 'Let it go', effects: { credits: -250 }, result: 'You cancel the chit, but they have already spent 250 cr of it on something. Welcome to {planet}.' },
      ],
    });

    scene({
      id: 'land-claim-map', when: { planet: ['Eros Old Town', 'Ironheart', 'Boneyard'] },
      title: 'The Map', text: 'An old prospector catches your sleeve at the dock. "Survey data. A rock nobody has claimed, thick with platinum. I\'m too old to go. Five hundred and it\'s yours."',
      choices: [
        { label: 'Buy the map (500 cr)', when: { credits: 500 }, effects: { do: ['gamble', 500, 0.3, { credits: 2500 }, 'You sell the survey to the claims office for 2,500 cr. The old man was telling the truth.', 'The claims office laughs you out of the room: the rock was registered forty years ago. The old man is nowhere to be found.'] }, result: '' },
        { label: '"Save it for someone else."', result: '"Everyone says that," he says, and lets go.' },
      ],
    });

    scene({
      id: 'land-recruiters', when: { war: true, gov: ['Earth Coalition', 'Mars Republic', 'Belt Collective'] },
      title: 'Recruiters', text: 'Navy recruiters have set up a table at the dock under a banner that says your system needs you. They look at your ship\'s guns with interest.',
      choices: [
        { label: 'Donate to the war relief fund (300 cr)', when: { credits: 300 }, effects: { credits: -300, do: ['localRep', 2] }, result: 'They give you a pin. Your standing here goes up a little, in the way that matters on {planet} right now.' },
        { label: 'Walk past', result: 'A recruiter calls after you about patriotism. You keep walking.' },
      ],
    });

    scene({
      id: 'land-crush', when: { crew: 'medic' },
      title: 'Crush Injury', text: 'A cargo sled slips its clamps two berths down and pins a dockworker against the bulkhead. The dock medic is on the other side of the station.',
      choices: [
        { label: '[{crew}] Send {crew}', when: { crew: 'medic' }, effects: { credits: 300, do: ['localRep', 2] }, result: '{crew} is there in thirty seconds and keeps the worker breathing until the medics arrive. The dock foreman insists on paying you 300 cr, and the dockers stop overcharging you for clamps.' },
        { label: 'Stay out of it', result: 'The medics get there eventually.' },
      ],
    }, 0.06);

    scene({
      id: 'land-raid-aftermath', when: { raid: true, cargo: { medical: 2 } },
      title: 'After the Raid', text: 'Two ships at the next berths are scorched and holed. The crews are laying their wounded out on the dock while they wait for a medic.',
      choices: [
        { label: 'Open two tons of your medical supplies', effects: { cargo: { medical: -2 }, rep: { 'Belt Collective': 2, 'Earth Coalition': 1, 'Mars Republic': 1 }, log: 'Gave medical supplies to raid survivors on {planet}.' }, result: 'Nobody here will forget which ship handed out the painkillers.' },
        { label: 'Keep your cargo sealed', result: 'You have contracts to fill. It is not a good feeling.' },
      ],
    });

    scene({
      id: 'land-surcharge', when: { bust: 'Belt Collective', gov: 'Belt Collective' },
      title: 'Slump Surcharge', text: 'The dockmaster has a new form: a "temporary economic stabilization surcharge" of 200 cr on every visiting ship.',
      choices: [
        { label: 'Pay it (200 cr)', when: { credits: 200 }, effects: { credits: -200 }, result: 'The dockmaster stamps your form without looking up.' },
        { label: 'Argue', effects: { rep: { 'Belt Collective': -1 } }, result: 'You argue. You win. The dockmaster will remember.' },
        { label: '[{crew}] Let {crew} talk to them', when: { crew: 'quartermaster' }, result: '{crew} finds a clause that exempts ships carrying essential goods, and a way to make yours one. No fee.' },
      ],
    }, 0.12);

    scene({
      id: 'land-festival', when: { boom: 'Belt Collective', planet: BELT },
      title: 'Payday', text: 'The ore prices are up and it is payday on {planet}. The corridors are full of music, food stalls, and people spending money they did not have last month.',
      choices: [
        { label: 'Join in (150 cr)', when: { credits: 150 }, effects: { credits: -150, log: 'Joined a payday party on {planet}.' }, result: 'You eat things on sticks, lose at a ring toss, and get home late. Worth every credit.' },
        { label: 'Work the crowd for cargo buyers', effects: { credits: 400 }, result: 'Everyone is buying. You sell off some odds and ends from your stores for 400 cr.' },
      ],
    }, 0.15);

    scene({
      id: 'land-ringball-kids', when: { planet: ['The Hollows', 'Juno Commons', 'Ring Nine'] },
      title: 'Referee', text: 'A gang of kids is playing ring-ball in the corridor outside your dock, and the argument over the last goal is turning into a fight. They look at you: an adult, a stranger, obviously neutral.',
      choices: [
        { label: '"Goal."', result: 'Half the kids cheer. The other half call you a Coalition spy. You have made friends and enemies for life.' },
        { label: '"No goal."', result: 'Half the kids cheer. The other half call you a Coalition spy. You have made friends and enemies for life.' },
        { label: 'Buy them a new ball (50 cr)', when: { credits: 50 }, effects: { credits: -50, rep: { 'Belt Collective': 1 } }, result: 'The old one was mostly tape. The argument is forgotten immediately.' },
      ],
    });

    scene({
      id: 'land-salvage-auction', when: { planet: 'Boneyard' },
      title: 'Salvage Auction', text: 'The Boneyard auctions sealed containers pulled from wrecks, unopened, on the dock. The next lot is a two-ton crate with a Coalition stencil. Bidding starts at 800.',
      choices: [
        { label: 'Bid 800 cr', when: { credits: 800, space: 8 }, effects: { do: ['gamble', 800, 0.55, { cargo: { equipment: 8 } }, 'You crack it open: eight tons of electronics, still in their packing.', 'You crack it open: two tons of Coalition paperwork, in triplicate.'] }, result: '' },
        { label: 'Watch someone else lose their money', result: 'The winner opens it to cheers. It is full of boots. Left boots.' },
      ],
    }, 0.25);

    scene({
      id: 'land-dock-tax', when: { planet: 'The Rook', standingBelow: { Pirate: 15 } },
      title: 'Dock Tax', text: 'A woman with a pistol on each hip and a clipboard informs you that the Rook charges a dock tax, payable to her, now.',
      choices: [
        { label: 'Pay (300 cr)', when: { credits: 300 }, effects: { credits: -300 }, result: 'She writes you a receipt. It is, somehow, a real receipt.' },
        { label: 'Refuse', effects: { rep: { Pirate: -2 } }, result: 'She shrugs and makes a note. You feel watched for the rest of your stay.' },
        { label: '[{crew}] {crew} steps forward', when: { crew: 'gunner' }, effects: { rep: { Pirate: 1 } }, result: '{crew} looks at her for a long moment. She laughs. "Fair enough. First one\'s free." Respect, of a kind.' },
      ],
    }, 0.2);

    scene({
      id: 'land-journalist', when: { planet: ['Earth', 'Luna'] },
      title: 'Human Interest', text: 'A feed journalist with a camera drone wants "a real Belt captain" for a segment on life in the outer system.',
      choices: [
        { label: 'Tell them how it really is out there', effects: { rep: { 'Belt Collective': 2, 'Earth Coalition': -1 }, news: 'A feed segment on life in the Belt is getting attention on Earth: rationing, raids, and the ships that keep it running.' }, result: 'The segment runs that night. The Coalition press office is not pleased.' },
        { label: 'Talk up the Coalition\'s work in the Belt', effects: { rep: { 'Earth Coalition': 2, 'Belt Collective': -1 } }, result: 'You say all the right things. It plays well on Earth.' },
        { label: '"No comment."', result: 'The drone follows you halfway to customs.' },
      ],
    });

    scene({
      id: 'land-memorial', when: { planet: 'Mars' },
      title: 'Memorial Day', text: 'It is the anniversary of the Tharsis blockade. Old navy veterans are laying wreaths at the dock memorial, and the port has gone quiet.',
      choices: [
        { label: 'Join the moment of silence', effects: { rep: { 'Mars Republic': 1 } }, result: 'An old woman in a faded MRN jacket nods to you afterward.' },
        { label: 'Get on with your business', result: 'You get some looks.' },
      ],
    });

    scene({
      id: 'land-harvest', when: { planet: ['Ganymede', 'Juno Commons'], space: 5 },
      title: 'Harvest Fair', text: 'The harvest came in heavy and the growers are selling the surplus off the back of carts on the dock, cheap, before it spoils.',
      choices: [
        { label: 'Buy five tons of food (250 cr)', when: { credits: 250 }, effects: { credits: -250, cargo: { food: 5 } }, result: 'Fresh, cheap, and loaded by teenagers who want to see your ship. A good deal.' },
        { label: 'Just buy lunch', result: 'Best meal you have had in months.' },
      ],
    }, 0.12);

    scene({
      id: 'land-long-night', when: { planet: ['Triton Outpost', 'Enceladus'] },
      title: 'News From Inside', text: 'Your ship is the first in weeks. Half the outpost comes down to the dock, not to trade, but to ask what is happening in the inner system.',
      choices: [
        { label: 'Stay and talk (a long evening)', effects: { log: 'Spent an evening telling {planet} the news.' }, result: 'You tell them about the markets, the wars, the new ring-ball season, and what everyone is watching. They listen like it is water.' },
        { label: 'Leave them a crate of luxuries (1 ton)', when: { cargo: { luxury: 1 } }, effects: { cargo: { luxury: -1 }, credits: 900 }, result: 'They pass the hat and give you 900 cr for it, which is more than it is worth anywhere else.' },
      ],
    }, 0.2);

    scene({
      id: 'land-noodle-letter', when: { planet: 'Ring Nine' },
      title: 'A Letter', text: 'Auntie Oyelaran from the noodle counter presses a sealed envelope into your hand. "For my son, on Ceres Station. He never answers his messages. He will answer a letter."',
      choices: [
        { label: 'Carry it', effects: { mission: { to: 'Ceres Station', title: 'Deliver Auntie Oyelaran\'s letter to her son on Ceres Station', pay: 150, days: 20 } }, result: 'She gives you a bowl of noodles for the road, which is worth more than the fee.' },
        { label: '"I\'m not going that way."', result: '"Everyone goes that way eventually," she says.' },
      ],
    }, 0.15);

    scene({
      id: 'land-coop-vote', when: { planet: 'Ironheart' },
      title: 'The Vote', text: 'The Ironheart co-op is voting on whether to raise docking fees for outside ships, and outsiders get to speak before the vote.',
      choices: [
        { label: 'Make a speech about free trade', effects: { do: ['gamble', 0, 0.5, { credits: 300 }, 'It goes over well. They vote the fee down, and a grateful member slips you a 300 cr contract to haul her ore samples.', 'You are booed off the floor. The fee passes. At least you tried.'] }, result: '' },
        { label: 'Stay out of local politics', result: 'The fee passes by six votes. It is not much.' },
      ],
    }, 0.2);

    scene({
      id: 'land-old-timer', when: { planet: 'Eros Old Town' },
      title: 'The Old Days', text: 'An old miner at the dock rail tells you, unprompted, about the boom: forty thousand people, money in the air, and a ship leaving for somewhere new every hour.',
      choices: [
        { label: 'Listen to the whole thing', effects: { do: ['gamble', 0, 0.4, { credits: 400 }, 'At the end he gives you a tip about a sealed tunnel with old stock in it. You sell what you find for 400 cr of scrap.', 'It is a good story. Some of it might be true.'] }, result: '' },
        { label: 'Politely excuse yourself', result: 'He tells the next ship instead.' },
      ],
    }, 0.2);
  },
});
