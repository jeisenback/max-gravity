'use strict';

// What comes of the hand-written burn events (transit.js). Each of them leads on: a second beat that
// plays straight after (`chained`: only reached from the event), and a follow-up that arrives some days
// later because a choice set it going with `later`. Follow-ups wait their time (`due`), come up ahead
// of ordinary scenes, and play once for each time they were set going. The Journal keeps the thread.

Mods.register({
  id: 'aftermath', name: 'What comes of it', builtin: true,
  init(M) {
    // A second beat, straight after the event that led to it.
    const beat = def => M.addStorylet({ where: 'transit', via: 'ship', once: false, chained: true, ...def });
    // A follow-up, some days after a choice set it going.
    const after = def => M.addStorylet({ where: 'transit', via: 'message', once: false, priority: 1, consumes: def.id, ...def, when: { due: def.id } });

    // ---- Distress Call ----
    beat({
      id: 'dc-owner', title: 'The Owner',
      text: 'The owner, Halden Voss, has recovered enough to be embarrassed. He runs a shipping house out of Luna, he says, and the yacht was a present to himself. "Name your price," he says. "I would rather it were a fair one. I am told I am a poor judge of my own life."',
      choices: [
        { label: 'Take payment now (3,000 cr)', effects: { credits: 3000, log: 'Pulled Halden Voss and two others out of a dead yacht, and was paid for it.' }, result: 'He transfers it without looking at the number, and thanks you again, quietly, and then a third time. You find you are glad of the money, and a little embarrassed to be.' },
        { label: 'Ask for a letter of introduction', effects: { later: { 'dc-voss': 14 }, log: 'Halden Voss owes me a letter. It should be worth more than the cash.' }, result: 'He writes it on the back of his own business card, in a shaky hand, with a pen borrowed from your galley: "Bearer saved my life. Treat accordingly." He seals it with a thumbprint. "Do not lose it. I will make sure the right people know."' },
        { label: 'Ask for nothing', effects: { rep: { 'Earth Coalition': 1 }, later: { 'dc-gift': 10 }, log: 'Told Halden Voss I wanted nothing. He said he owed me something worse than money.' }, result: '"Nothing," you say. "Go home." He stares at you the way a man looks at a thing he has no word for, and nods. "Then I owe you something worse than money," he says. "I will think of something."' },
      ],
    });
    beat({
      id: 'dc-raiders', title: 'They Follow You',
      text: 'The raiders are not done. Two dark shapes keep pace off your quarter, closing, and the yacht behind them has gone from a distress call to a decoy to a joke. On the open band a voice you have not heard before says: "Cargo or hull, friend." There is a pause, and, for a moment, nobody breathes.',
      choices: [
        { label: 'Burn hard to break away (30 reaction mass)', effects: { do: ['mass', -30] }, result: 'You throw the drive wide open, and the ship groans, and the two shapes fall behind, one at a time, still talking on the band, still cheerful about it. When the last of them is a spark, someone in the galley starts, shakily, to laugh.' },
        { label: 'Turn and fight', effects: { do: ['hull', 0.2], later: { 'dc-lure': 12 }, log: 'Fought off the raiders who baited me with a yacht. The yacht was a decoy and I wrote down its transponder.' }, result: 'You turn, and fire, and so do they, and the exchange is short and loud and ugly. You come out of it with the hull scarred and both raiders limping for the dark. The yacht\'s decoy transponder is still pinging from a lost position. You write it down.' },
        { label: 'Pay them to leave (800 cr)', when: { credits: 800 }, effects: { credits: -800 }, result: 'You send the credits, and they take them, with a mock bow on the channel, and a "pleasure." They do not follow. It is a very expensive silence.' },
      ],
    });
    after({
      id: 'dc-voss', title: 'A Letter from Voss',
      text: 'A message arrives from Luna, formal and slightly unsteady, in the handwriting of a man who rarely writes anything himself. Halden Voss has shown your card to his board. They would like to do business: a standing contract, which he describes as "modest", and which is, by the figure attached, nothing of the sort.',
      choices: [
        { label: 'Accept the contract', effects: { credits: 4000, rep: { 'Earth Coalition': 1 }, log: 'Voss\'s house paid out on the letter: 4,000 cr.' }, result: 'You accept, and the first payment is in your account before the end of the watch. The second message is just a photograph of the yacht, back on its pad, with a small hand-lettered sign on the bow: "Thanks to the ship that stopped."' },
        { label: 'Decline with thanks', effects: { rep: { 'Earth Coalition': 2 } }, result: '"Too kind," you write, "but I did not stop for a contract." His reply is one line, and warm, and it spreads, in the way these things do, a good deal further than a contract would have.' },
      ],
    });
    after({
      id: 'dc-gift', title: 'Voss Remembers',
      text: 'A cargo drone matches your course, a tidy white box with a Luna house seal, and docks itself to the lock without being asked. Inside: six tons of luxury goods, packed with unreasonable care, and a note that says only: "For the ship that asked for nothing."',
      choices: [{ label: 'Take it aboard', effects: { cargo: { luxury: 6 }, log: 'Voss sent six tons of luxury goods, for the ship that asked for nothing.' }, result: 'You take it aboard, and nobody says anything for a while. Then somebody, quietly, pours the crew a drink from the good bottle, which was in the crate as well.' }],
    });
    after({
      id: 'dc-lure', title: 'The Same Trick',
      text: 'A message from the patrol: the decoy transponder you wrote down turns up again, on a tanker this time, and the tanker\'s crew did not walk away. They would be grateful for anything you can add. They say it is "entirely voluntary," in the tone of people who would like it to be otherwise.',
      choices: [
        { label: 'Send them your sensor logs', effects: { rep: { 'Earth Coalition': 1 }, credits: 600, log: 'Sent the patrol my logs on the yacht decoy. They paid a finder\'s fee.' }, result: 'You send everything, down to the timestamps. A day later there is a short reply, a finder\'s fee, and one line: "We have them."' },
        { label: 'Leave it', result: 'You close the message. Somewhere ahead, a tanker is not the only one. You try to think of something else, and mostly succeed.' },
      ],
    });
    after({
      id: 'dc-silence', title: 'The Yacht',
      text: 'A news item crosses the comms, between a price list and a sports result: a private yacht has been found drifting off the lanes. Two of the three aboard are alive, and one of them says that a freighter passed within a day and never answered. It is not said to be yours. It could have been.',
      choices: [
        { label: 'Send something to the rescue fund (200 cr)', when: { credits: 200 }, effects: { credits: -200, rep: { 'Earth Coalition': 1 }, log: 'Sent 200 cr to the rescue fund for a yacht I did not stop for.' }, result: 'It is not an apology, quite, and nobody will ever know what it is for. You send it anyway, and do not feel better, and it is something.' },
        { label: 'Switch it off', effects: { rep: { 'Earth Coalition': -1 }, log: 'A yacht I did not stop for lost one of its crew.' }, result: 'You switch it off. You tell yourself it was a trap, and it probably was. It was not, this time. That is the thing about the probably.' },
      ],
    });

    // ---- Pirates Matching Course ----
    beat({
      id: 'pi-survivors', title: 'The Escape Pod',
      text: 'Three hours after the fight, your sensors catch a small, battered escape pod, tumbling, its beacon stuttering. Somebody got out. Whoever it is will not last another day out here, and, an hour ago, they were shooting at you.',
      choices: [
        { label: 'Take them aboard (costs time)', effects: { delay: 6, later: { 'pi-gratitude': 10 }, log: 'Took a pirate survivor out of an escape pod. Did not hand them over. Not yet.' }, result: 'You haul the pod in on a line, and crack it on the deck, and a thin, furious teenager glares up at you through a cracked visor. They are fed, and watched, and, after a day of silence, begin, bit by bit, to talk. You do not hand them over to anyone. Not yet.' },
        { label: 'Report it and keep burning', effects: { rep: { 'Earth Coalition': 1 } }, result: 'You log the pod\'s position and pass it to the nearest patrol, and burn on. It is correct, and it is cold, and it is probably what the survivors would have done for you. Probably.' },
        { label: 'Leave it', effects: { later: { 'pi-vendetta': 18 }, log: 'Left a pirate escape pod to drift. Somebody will want to know.' }, result: 'The pod falls behind, its beacon flickering. Nobody speaks. Somewhere, a family will not get the news from you.' },
      ],
    });
    after({
      id: 'pi-gratitude', title: 'A Message from the Pod',
      text: 'A message arrives, a single line from a stranger: "I am out. I am clean. I am sorry. There is a cache on the rock at the coordinates below, my crew\'s, and nobody left to claim it. Take it." The coordinates are a day off your course. A second line, smaller: "You did not have to."',
      choices: [
        { label: 'Detour for the cache (costs time)', effects: { delay: 8, credits: 1800, log: 'The pirate kid sent a cache. Took it. Did not feel good, quite.' }, result: 'It is where they said, under a tarp, and it is more than you expected. You feel like someone who was paid by a ghost.' },
        { label: 'Let it lie', effects: { rep: { 'Belt Collective': 1 } }, result: 'You leave it where it is. The kid will hear about it, eventually, the way these things get around the Belt, and it will count for something.' },
      ],
    });
    after({
      id: 'pi-vendetta', title: 'Blood Money',
      text: 'A hail, level and quiet, from a ship that is not close enough to shoot. "You left Dari in the dark. Dari was my cousin." A pause. "I am not asking for anything you cannot afford. I am asking you to think about it."',
      choices: [
        { label: 'Send them 1,000 cr', when: { credits: 1000 }, effects: { credits: -1000, rep: { 'Belt Collective': 1 }, log: 'Paid blood money for a pirate I left in a pod.' }, result: 'You send it, and the line goes quiet, and then it says, "That is not forgiveness." "No," you say. "I know." It is enough, and the ship turns away.' },
        { label: 'Tell them to try it', effects: { do: ['hull', 0.2] }, result: '"Noted," says the voice, and a few hours later a ship you did not see lights its drive, and rakes your hull in one clean pass. It is not a fight. It is a receipt.' },
      ],
    });
    after({
      id: 'pi-subscription', title: 'The Subscription',
      text: 'A hail from a ship you know. "Hoser. We have been thinking about you, and how much it must worry you out here, alone. We have a service. Protection. Five hundred credits, and nobody in this stretch of the lane will trouble you for forty days. Cheap, for what it covers."',
      choices: [
        { label: 'Pay (500 cr)', when: { credits: 500 }, effects: { credits: -500, later: { 'pi-safe': 40 }, log: 'Bought forty days of pirate protection for 500 cr. It is a real service.' }, result: 'They send a receipt, an actual receipt, with a skull on it, and a promise, which, for what it is worth, they keep.' },
        { label: 'Refuse', effects: { do: ['hull', 0.1] }, result: 'There is a long silence, and then a single pass, a warning burst across your bow, close enough to feel in the hull. "Last chance," says the voice, and goes.' },
      ],
    });
    after({
      id: 'pi-brother', title: 'Brother',
      text: 'A hail, warm and amused, from the crew whose transponder you faked. "Brother!" says the voice. "We have been looking for you. Nobody told us we had a new cousin. We need a hand with a parcel, nothing dirty, just heavy, and we pay in cash."',
      choices: [
        { label: 'Run the parcel (900 cr)', effects: { credits: 900, rep: { 'Belt Collective': -1 }, log: 'Ran a parcel for pirates who think I am their cousin. It was only heavy.' }, result: 'It is a crate, and it is heavy, and it asks nothing of you but a small detour and a short silence. They pay in clean notes. "Family," says the voice, with real warmth. You do not correct it.' },
        { label: 'Tell them it was a spoof', effects: { do: ['hull', 0.15] }, result: 'The line is silent for exactly as long as it takes them to understand. Then it goes cold, and a pass from a ship you cannot see leaves a groove along your hull. "Brother," says the voice, just once, with no warmth at all.' },
        { label: 'Cut the channel', result: 'You cut it. They hail twice more, then stop. You will not be hearing from the cousins. Probably.' },
      ],
    });

    // ---- Drifting Cargo Container ----
    beat({
      id: 'co-contents', title: 'The Sealed Case',
      text: 'Under the cargo, strapped to the frame, is a small gray case with a customs seal that has been broken and badly re-glued. Whatever is in it, it was the reason somebody wanted this container to disappear. Someone in the galley says, quietly, that it is probably illegal, and, in the same voice, that it is probably valuable.',
      choices: [
        { label: 'Sell it quietly at the next port', effects: { credits: 1800, later: { 'co-customs': 10 }, log: 'Sold a sealed case from a drifting container, no questions. Customs may ask some.' }, result: 'You find a buyer who does not want your name, and do not offer it, and the credits arrive in your account in small, tidy pieces. It is easy. That is what worries you.' },
        { label: 'Hand it to the authorities', effects: { rep: { 'Earth Coalition': 1 }, later: { 'co-reward': 8 }, log: 'Handed a sealed case from a drifting container to customs.' }, result: 'You pass it up the chain, with a short form and a long wait, and a customs officer with kind, tired eyes tells you it will be looked at. It is the sort of thing that is taken seriously.' },
        { label: 'Put it out of the airlock', result: 'You put it out of the airlock, unopened, and watch it go. It tumbles, small and gray, into the dark. Somebody says you did the sensible thing. Nobody sounds sure.' },
      ],
    });
    after({
      id: 'co-customs', title: 'A Customs Inquiry',
      text: 'A courteous notice from customs: a sealed case of a certain description was lost from a container in this part of the lane, and they would like to ask whoever found the container a few questions, in person, at the next port. The notice is polite. The politeness is the worrying part.',
      choices: [
        { label: 'Pay a facilitation fee (900 cr)', when: { credits: 900 }, effects: { credits: -900 }, result: 'You pay it, through a lawyer who bills like a surgeon, and the inquiry goes quiet. It costs half of what you made, and you do not discuss it.' },
        { label: 'Answer the questions', effects: { credits: -400, rep: { 'Earth Coalition': -2 }, log: 'Customs asked about the case. It cost me.' }, result: 'You answer them, all of them, and they are polite, and they take 400 cr and a good deal of your standing. When you leave, a junior officer holds the door and does not meet your eye.' },
        { label: 'Ignore it', effects: { rep: { 'Earth Coalition': -1 } }, result: 'You ignore it, and it is ignored back. It will be remembered at the next port with a customs office.' },
      ],
    });
    after({
      id: 'co-reward', title: 'A Reward',
      text: 'A letter from the customs office, on proper paper. The case you handed in held records in a smuggling case that has run for six years. There is a reward, a thank-you, and a line at the bottom, handwritten, that says: "Few people hand these in."',
      choices: [{ label: 'Accept the reward', effects: { credits: 1000, rep: { 'Earth Coalition': 1 }, log: 'Customs paid a 1,000 cr reward for the case I handed in.' }, result: 'It is less than you would have got from the buyer. You find, to your surprise, that you do not mind.' }],
    });

    // ---- Stowaway ----
    beat({
      id: 'st-where', title: 'Where To?', via: 'crew',
      text: 'The kid has eaten two bowls of stew and is sitting very straight at the galley table. "I should tell you where I am going," they say. "I have an aunt on Ceres, in the spin, with a laundry. She does not know I am coming. She will be furious. She will be glad."',
      choices: [
        { label: 'Drop them at the next port', result: 'They nod, quickly, the way people do when they have been disappointed in advance. They shake your hand, hard, and are gone at the first dock, with the rucksack, into the crowd.' },
        { label: 'Take them to their aunt (costs time)', effects: { delay: 6, later: { 'st-thanks': 12 }, log: 'Took the stowaway kid to their aunt on Ceres.' }, result: 'It is a detour, and a long one, and the kid says nothing for most of it, and then, at the last, takes your sleeve and does not let go. The aunt is furious. The aunt is glad. You are given a cup of tea, and a look.' },
      ],
    });
    after({
      id: 'st-thanks', title: 'A Laundry Parcel', via: 'crew',
      text: 'A parcel arrives by the next courier: a shirt, ironed so sharply it could cut, and a note in two handwritings: "From the aunt, who says you are an idiot, and from me, who says thank you." Folded in the shirt is a roll of notes, rather more than the passage ever was.',
      choices: [{ label: 'Keep the shirt, and the notes', effects: { credits: 700, rep: { 'Belt Collective': 1 }, log: 'The stowaway kid\'s aunt sent a shirt and 700 cr.' }, result: 'You put the shirt on, and it fits, and nobody in the galley says a word. It has been a long time since anyone ironed anything for you.' }],
    });
    after({
      id: 'st-tip', title: 'What the Broom Heard', via: 'crew',
      text: 'A message from the kid, scrawled and enthusiastic: "I told you I know things. There is something going on at the port office, a price, a ship, a thing that is going to be worth money. Go early." It is vague, and, on reflection, entirely believable.',
      choices: [
        { label: 'Act on it', effects: { credits: 600, news: 'A rich cargo run is quietly about to be posted at the port office.' }, result: 'You are early, and the right person is late, and a short conversation in a corridor does, in the end, pay for itself.' },
        { label: 'Ignore it', result: 'You ignore it. A week later somebody else does not, and, at the dock, someone mentions, in passing, what they made. You do not look at the galley.' },
      ],
    });

    // ---- Derelict Ship ----
    beat({
      id: 'de-drawing', title: 'The Drawing',
      text: 'On the way out, the child\'s drawing comes with you, pinned to your sleeve by a bit of tape. Under the crayon, in careful adult handwriting, there is a ship name and a registry number. Somebody once cared very much about this ship. Somebody, somewhere, might still.',
      choices: [
        { label: 'Look up the registry (costs time)', effects: { delay: 4, later: { 'de-family': 10 }, log: 'Looked up the registry of the derelict I stripped. Somebody should know.' }, result: 'It takes an afternoon of slow channels and a favor from a registry clerk, but the name resolves, in the end, to a home and a family. You put the drawing in a drawer, and the drawer stays slightly open.' },
        { label: 'Put it in the log and say nothing', result: 'You tape it to the inside of a locker, and close the locker.' },
      ],
    });
    after({
      id: 'de-family', title: 'The Hauler\'s Family',
      text: 'A message comes by a slow channel, from a woman on Ceres whose husband flew the Marguerite. She has been told the ship is lost with everything aboard. She asks, politely, whether you took anything from her, in particular the nav core, which is the last thing he touched.',
      choices: [
        { label: 'Return the nav core, free', effects: { rep: { 'Belt Collective': 2 }, log: 'Gave a widow her husband\'s nav core.' }, result: 'You send it by the next courier, and a week later the reply is two lines, and the second one is just your ship\'s name, in capitals, underlined.' },
        { label: 'Sell it to her for 2,000 cr', effects: { credits: 2000, rep: { 'Belt Collective': -1 }, log: 'Sold a widow her husband\'s nav core for 2,000 cr.' }, result: 'She pays it, without arguing, and the receipt comes back, signed, in a very steady hand. It is what the thing was worth. It is also what it was worth.' },
        { label: 'Say you do not have it', result: 'You say you do not, and she thanks you for your time, with great courtesy, and the channel closes. The nav core is in a locker. The locker has not been opened since.' },
      ],
    });
    after({
      id: 'de-claim', title: 'A Salvage Dispute',
      text: 'You logged a derelict and kept burning. A salvage crew following behind found her stripped by somebody else, and, with your log entry as proof, the dispute over whose claim it was has reached you. A magistrate would like to hear your statement, and a lawyer, bored, would like to buy you a coffee.',
      choices: [
        { label: 'Give a statement for a fee (600 cr)', effects: { credits: 600 }, result: 'You give it, over a bad connection, and the magistrate thanks you, and the claim goes to the crew who deserved it. The fee arrives the same evening.' },
        { label: 'Decline', result: 'You decline, and the dispute settles itself without you, as most of them do, with a lot of paperwork and no particular villain.' },
      ],
    });

    // ---- Coolant Leak ----
    beat({
      id: 'cl-aftermath', title: 'The Patch', via: 'crew',
      text: 'The patch holds, but it is ugly: a lump of sealant the size of a fist, bulging over a section of pipe that is thinner than it should be. The drive is happy. The pipe is not. Anyone who has ever been near a coolant loop knows what happens to a patch on a pipe like that.',
      choices: [
        { label: 'Pay a yard to replace the section at the next port (400 cr)', when: { credits: 400 }, effects: { credits: -400 }, result: 'You book it, and it is dull, and it works. The old section comes out in a yard worker\'s gloves, with the patch still on it, and the worker holds it up and says, with real admiration, "Whoever did this was brave."' },
        { label: 'Run on the patch', effects: { later: { 'cl-fail': 9 } }, result: 'You leave it, and it holds, day after day, and, every day, it holds a little less comfortably. You find you listen to the pipe the way you would listen to a clock.' },
      ],
    });
    after({
      id: 'cl-fail', title: 'The Patch Lets Go', via: 'crew',
      text: 'The alarm goes at the worst hour, with the same sound as the first one. The patch has failed, as everyone knew it would, and this time it takes some of the pipe with it. The ship vents a cloud of white glycol, and, for a minute, nobody is quite sure whether the drive is going to hold.',
      choices: [{ label: 'Shut down and seal it', effects: { do: ['mass', -40] }, result: 'You shut down, and seal the section, and run on one loop for an hour, losing forty units of reaction mass to the vent before it is done. The drive holds. Afterward, someone quietly writes "REPLACE THE PIPE" on the galley wall, in marker, in capitals, and underlines it twice.' }],
    });

    // ---- Merchant Hail ----
    after({
      id: 'me-good', title: 'The Tip Pays',
      text: 'The merchant\'s tip was right. You find out when the price at your next port moves exactly as promised, in the direction they promised, by about the amount, and a trader on the dock, who has also heard the rumor, tells you how much they paid to learn it. It was more than five hundred.',
      choices: [{ label: 'Press the advantage', effects: { credits: 1500, log: 'The merchant\'s tip paid off: 1,500 cr.' }, result: 'You move before the market does, and the margin is the best of the month. Somewhere, a forty-year freighter captain raises a cup, and nobody sees it.' }],
    });
    after({
      id: 'me-bad', title: 'The Tip Does Not',
      text: 'The tip was nonsense. You find out at the dock, when the price moves, solidly, the other way, and a trader nearby tells you, with a look of real sympathy, that the merchant sells the same tip to everyone, in both directions.',
      choices: [{ label: 'Learn the lesson', effects: { log: 'The merchant sold me a bad tip. Never again.' }, result: 'You learn it. It costs nothing more than the pride, and you have to admit that is less than the five hundred, which is already gone.' }],
    });
    after({
      id: 'me-regret', title: 'What You Turned Down',
      text: 'News from the market: a tip of the kind a passing freighter was selling, five hundred a head, turned out to be sound, and a number of ships made a great deal of money on it. You are not among them. Somebody on the crew finds it funnier than you do.',
      choices: [{ label: 'Shrug', effects: { log: 'Turned down a merchant\'s tip that turned out to be good.' }, result: 'You shrug. It was five hundred credits, and a gamble, and you did not take it. A decision made is a decision made, and, for the next day or two, you are insufferable about it.' }],
    });
  },
});
