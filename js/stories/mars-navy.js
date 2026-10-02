'use strict';

// Reserve Commission: a Mars Republic Navy career, written as storylets. The quality
// `mcrn` is your standing in the Navy (promotion at 4); `navyTask` is set while you
// have Navy work in hand; `mcrnRefused` remembers the order you would not follow;
// `mcrnDone` ends the storyline. Which assignment comes third depends on whether Mars
// is at war when you are ready for it. It competes with The Rook's Crown: captains
// sworn to the Rook are never offered a commission, and commissioned ones are never
// asked to swear.

Mods.register({
  id: 'mars-navy', name: 'Reserve Commission', builtin: true,
  init(M) {
    if (scopeOff('storylines')) return;  // not in this build (js/build.js)
    const home = ['Mars', 'Phobos Yards'];
    const free = { qBelow: { navyTask: 1, mcrnDone: 1 } };
    const task = { set: { navyTask: 1 } }, taskOver = { navyTask: 0 };

    M.addStorylet({
      id: 'navy-recruit', where: 'port', priority: 1, once: false,
      when: { planet: home, day: 15, standing: { 'Mars Republic': 15 }, qBelow: { mcrn: 1, mcrnDone: 1, pirateSworn: 1, corpSworn: 1 }, chance: 0.4 },  // not for the Rook's or the Consortium's
      title: 'Lt. Commander Osei',
      text: 'A naval officer in dress grays takes the stool beside you and buys you a drink you did not ask for: Lieutenant Commander Amara Osei, Mars Republic Navy Reserve, forty-odd, weathered, with the calm, unhurried patience of someone who has sat at a great many bars waiting for the right person. She turns her glass slowly on the counter. "The Navy is short of hulls and long on enemies. We commission independent captains with good standing: reserve pay, the odd tasking, and a call-up if it comes to war. You would still be your own captain." A small dry smile. "Mostly."',
      choices: [
        { label: 'Accept the commission', effects: { q: { mcrn: 1 }, rep: { 'Mars Republic': 3 }, log: 'Took a reserve commission in the Mars Republic Navy.' },
          result: 'Osei swears you in at the bar, one hand raised over a plate of fried dumplings, which she says is traditional. It is not. The barman applauds, slowly, without looking up. "Welcome aboard, Reservist," she says, and stamps a small brass pin into your palm. "I will be in touch. Do try to stay alive. The paperwork is horrible."' },
        { label: 'Not yet', result: '"The offer stands," she says, without any offense at all, and slides her card across the counter. "For now. Wars have a way of changing the terms." She finishes her drink and leaves the card where it lies, face up, with a Martian sunrise stamped on the back.' },
        { label: 'Never', effects: { set: { mcrnDone: 1 } }, result: 'Osei nods as if she expected it, finishes her drink in a single swallow, and leaves yours untouched on the bar. "Then I hope the Belters treat you better than the Navy would have," she says, evenly, and something in the way she says it is neither a threat nor a blessing. She is gone before you find the words to answer.' },
      ],
    });

    M.addStorylet({
      id: 'navy-hunt', where: 'port', priority: 2, once: false,
      when: { planet: home, q: { mcrn: 1 }, qBelow: { mcrn: 2, navyTask: 1, mcrnDone: 1 } },
      title: 'First Tasking',
      text: 'Osei finds you at the same bar, at the same stool, as though she has been waiting there for a week. She slides a data chit across the table, worn smooth at the corners. "A raider calling itself the Hollow Crown has been picking off Martian ore haulers near Pallas. Eleven ships in two months, and the crews they leave alive tell stories I would rather not repeat. Navy hulls are busy. You are not. Bring it down, and the Reserve will notice."',
      choices: [
        { label: 'Take the hunt', effects: { ...task, log: 'Tasked by the MCRN Reserve to hunt the raider Hollow Crown near Pallas.',
          bounty: { at: 'pallas', name: 'Raider "Hollow Crown"', pay: 9000, days: 45, issuer: 'Mars Republic',
            onDone: { q: { mcrn: 1 }, set: taskOver, rep: { 'Mars Republic': 3 }, log: 'Destroyed the Hollow Crown for the MCRN Reserve.' },
            onFail: { set: taskOver, rep: { 'Mars Republic': -3 }, log: 'The Hollow Crown got away. Osei was not impressed.' } } },
          result: '"Forty-five days," Osei says. "After that it is someone else\'s problem, and a mark against yours." She taps the chit once, with one blunt fingernail, the way a sergeant taps a map. "Do not be brave. Be exact. The Crown is clever, and the ones who are brave do not come home."' },
        { label: 'Ask for another time', result: '"Another time, then," she says, without any reproach, and pockets the chit. "The Crown will still be out there. That, I promise you." She looks at her empty glass for a moment. "So will the crews it leaves behind."' },
      ],
    });

    M.addStorylet({
      id: 'navy-distress', where: 'transit', priority: 1,
      when: { q: { mcrn: 2 }, qBelow: { mcrnDone: 1 }, chance: 0.35 },
      title: 'Tharsis Dawn',
      text: 'A Martian survey ship, the Tharsis Dawn, is broadcasting a reactor fault on a Navy channel only reservists would hear, in a voice cracked with strain and pain. Three of her crew are burned, badly, and the rest are trying to hold the containment by hand, taking turns on the manual rods until their gloves smoke. In the background, someone is crying quietly, and someone else is telling them, over and over, that it is going to be all right.',
      choices: [
        { label: '{crew} goes over to treat the burned', when: { crew: 'medic' },
          effects: { q: { mcrn: 1 }, rep: { 'Mars Republic': 4 }, log: 'Answered the Tharsis Dawn\'s distress call; our medic saved her crew.' },
          result: '{crew:medic} goes across in a suit with a case of dressings and a face like stone, and comes back six hours later, gray with exhaustion, with somebody else\'s blood down one sleeve. All three will live. The captain of the Tharsis Dawn sends a message, formal and stumbling and very sincere, and the Navy logs your transponder with a commendation you did not ask for.' },
        { label: 'Send over spare parts (1,500 cr)', when: { credits: 1500 },
          effects: { credits: -1500, q: { mcrn: 1 }, rep: { 'Mars Republic': 3 }, log: 'Answered the Tharsis Dawn\'s distress call with spare parts.' },
          result: 'You pack the spare coolant pumps into a cargo sled and send it drifting across on a thin line of thrust. They fit, barely, and a shaky voice on the channel says, "It is holding. Oh, God, it is holding." The containment stays up until a Navy tug arrives, two hours later. Their captain promises to mention you, and you suspect that, for once, it is true.' },
        { label: 'Log the call and keep burning', effects: { rep: { 'Mars Republic': -3 } },
          result: 'You log the call, and the position, and the time. You tell yourself somebody else is closer. Somebody else answers, eventually, and the Tharsis Dawn limps home. But the Reserve keeps its own records, and it notices who was in range and did not come. The silence on the next Navy channel you open has a particular, careful quality.' },
      ],
    });

    M.addStorylet({
      id: 'navy-callup', where: 'port', priority: 2,
      when: { planet: 'Mars', q: { mcrn: 2 }, ...free, war: 'Mars Republic' },
      title: 'Call-Up',
      text: 'The Reserve is activated. The dock is alive with Navy trucks and hurried officers, and Osei, now in combat grays with a sidearm on her hip, is all business, without a trace of the dry humor you remember. There is dust on her boots and a deep, tired line between her brows. "Twelve tons of munitions for the fleet anchorage at Phobos Yards. It is a short hop, and it is the most important short hop you will ever make. I do not have to tell you why."',
      choices: [
        { label: 'Load the munitions (12t)', when: { space: 12 },
          effects: { ...task, log: 'Called up by the MCRN Reserve: munitions run to Phobos Yards.',
            mission: { to: 'Phobos Yards', tons: 12, good: 'MCRN munitions', pay: 6000, days: 10, title: 'MCRN call-up: munitions to Phobos Yards',
              onDone: { q: { mcrn: 1 }, set: taskOver, rep: { 'Mars Republic': 5 }, log: 'Delivered munitions to the fleet at Phobos.' },
              onFail: { set: taskOver, q: { mcrn: -1 }, rep: { 'Mars Republic': -6 }, log: 'Failed to deliver the Navy\'s munitions.' } } },
          result: 'Sailors in gray fatigues load the crates in a silent, efficient line, and the manifest arrives on your console with three separate seals. "Ten days," Osei says. She looks at you for a long moment, and, for the first time, does not smile. "Do not make me come looking for you. I would rather not be that person."' },
      ],
    });

    M.addStorylet({
      id: 'navy-flag', where: 'port', priority: 2,
      when: { planet: home, q: { mcrn: 2 }, ...free, peace: 'Mars Republic' },
      title: 'Showing the Flag',
      text: 'Peacetime work, Osei says, is the part nobody writes songs about. She has found you at the docks, in a plain gray jacket, holding a tin of Martian tea like a guilty secret. "A sealed pouch for our consulate on Ganymede. The Jovians like to see Martian reservists in port. It reminds them we have friends out there, and that we are polite about it." She hands you a small locked case, heavier than it looks, with a very ordinary Navy seal.',
      choices: [
        { label: 'Carry the pouch', effects: { ...task, log: 'Carrying a sealed MCRN pouch to Ganymede.',
          mission: { to: 'Ganymede', tons: 1, good: 'sealed MCRN pouch', pay: 5000, days: 35, title: 'Carry a sealed MCRN pouch to Ganymede',
            onDone: { q: { mcrn: 1 }, set: taskOver, rep: { 'Mars Republic': 3 }, log: 'Delivered the MCRN pouch to Ganymede.' },
            onFail: { set: taskOver, rep: { 'Mars Republic': -3 }, log: 'The MCRN pouch never reached Ganymede.' } } },
          result: '"Do not open it," Osei says. "I am serious. Do not." She pauses. "I opened one, once. As a very young ensign. It was menus. Fourteen pages of menus for a state dinner. I have never been so frightened in my life." You are not sure if she is joking. You decide it is safer not to ask.' },
        { label: 'Not now', result: '"It will keep," she says, tucking the case back under her arm. "Diplomacy is slow, and it is, mostly, a matter of not making the same mistake twice." She sips her tea, and gives you a long, patient look. "Come find me when you are ready."' },
      ],
    });

    M.addStorylet({
      id: 'navy-loyalty', where: 'port', priority: 2,
      when: { planet: home, q: { mcrn: 3 }, ...free },
      title: 'An Unpleasant Order',
      text: 'Osei does not sit down. She stands at the edge of the table with her hands clasped behind her back, and for once she does not meet your eye. "Naval intelligence wants a Collective freighter, the Blue Ice, boarded and searched at Ceres. They think she is carrying Aquilon contraband. They want it done by a reservist, so it is not an act of war." She pauses, and the pause is heavy. "Belters will remember who did it. Belters remember everything. I want you to know that I did not choose this."',
      choices: [
        { label: 'Do it', effects: { q: { mcrn: 1 }, rep: { 'Mars Republic': 6, 'Belt Collective': -12 }, unrest: { ceres: 0.15 },
          log: 'Boarded and searched the Collective freighter Blue Ice for Naval intelligence.', news: 'A Martian reservist boards a Collective freighter at Ceres. The Collective protests.' },
          result: 'The search takes four humiliating hours, with the whole crew of the Blue Ice lined up along the bulkhead, watching you paw through their bunks. It finds nothing. The captain, a lean, grey woman with a tattoo of a water drop on her neck, spits on your boots as you leave. Osei meets you on the dock afterward. "Good work," she says, and it sounds like an apology.' },
        { label: '{crew} fakes the search records', when: { crew: 'slicer' },
          effects: { q: { mcrn: 1 }, rep: { 'Mars Republic': 2 }, log: 'Faked the search of the Blue Ice. Naval intelligence is satisfied, for now.' },
          result: '{crew:slicer} produces a flawless search log for a boarding that never happened, complete with photographs, a chain of custody, and a small comment about the quality of the coffee. Osei reads it twice, scrolling slowly, and looks at you for a long time over the top of the page. Then she closes the file. "I did not see this," she says, quietly, "and I am very glad I did not."' },
        { label: 'Refuse', effects: { q: { mcrn: 1 }, set: { mcrnRefused: 1 }, rep: { 'Mars Republic': -4 }, log: 'Refused a Naval intelligence order to board a Collective freighter.' },
          result: '"Noted," Osei says, and writes something down in a small black notebook, and then, to your surprise, closes it and puts it away. "It will cost you. Not as much as you think." There is something in her face that you have not seen before, and it takes you a moment to recognize it as respect. "Between us: I would have done the same, if I had the choice."' },
      ],
    });

    const promotion = { where: 'port', priority: 3, title: 'Lieutenant\'s Bars' };
    M.addStorylet({
      ...promotion, id: 'navy-promotion',
      when: { planet: 'Mars', q: { mcrn: 4, 'seen:navy-loyalty': 1 }, qBelow: { mcrnRefused: 1, mcrnDone: 1, navyTask: 1 } },
      text: 'A short ceremony in a Navy hangar on Mars, under a flag older than you, with a dozen officers in dress grays and an honor guard that looks slightly bored. The light comes down in long dusty bars from the gantry windows. Osei stands at the front with a small velvet box, and, for a moment, you think her hands are not entirely steady. She pins the bars on herself, as the old custom has it. "Lieutenant, Reserve. You have earned the Navy\'s trust, and its enemies. Both come with the rank."',
      choices: [{ label: 'Salute', effects: { set: { mcrnDone: 1 }, credits: 15000, rep: { 'Mars Republic': 10 }, log: 'Promoted to Lieutenant in the MCRN Reserve.', news: 'The Mars Republic Navy promotes an independent captain to Lieutenant in its Reserve.' },
        result: 'You salute, and the honor guard, on cue, does the same, and for a moment the whole hangar is a still, white-gold picture. The promotion comes with a 15,000 cr bonus and a standing no Martian patrol will question. Afterwards Osei buys you a drink at the same bar, at the same stool, and for once does not say a word about the war.' }],
    });
    M.addStorylet({
      ...promotion, id: 'navy-promotion-refused',
      when: { planet: 'Mars', q: { mcrn: 4, mcrnRefused: 1, 'seen:navy-loyalty': 1 }, qBelow: { mcrnDone: 1, navyTask: 1 } },
      text: 'No ceremony. Osei meets you on the docks, in the grey of an early shift change, with the bars in her pocket and the look of someone who has been arguing all night. "Intelligence wanted you out," she says, without preamble. "I told them a reservist who can say no is worth three who can\'t. It took a long time, and a great deal of shouting. You will never make commander. You are still ours."',
      choices: [{ label: 'Take the bars', effects: { set: { mcrnDone: 1 }, credits: 8000, rep: { 'Mars Republic': 5 }, log: 'Promoted to Lieutenant in the MCRN Reserve, despite refusing an order.' },
        result: 'You pin them on yourself, and Osei watches with her arms folded, and, very slightly, nods. The bars come with an 8,000 cr bonus and a note in your file that Osei says she will deny writing. "Do not let it go to your head," she says. It is the kindest thing she has ever said to you, and you both know it.' }],
    });
  },
});
