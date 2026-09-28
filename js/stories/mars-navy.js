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
    const home = ['Mars', 'Phobos Yards'];
    const free = { qBelow: { navyTask: 1, mcrnDone: 1 } };
    const task = { set: { navyTask: 1 } }, taskOver = { navyTask: 0 };

    M.addStorylet({
      id: 'navy-recruit', where: 'port', priority: 1, once: false,
      when: { planet: home, day: 15, standing: { 'Mars Republic': 15 }, qBelow: { mcrn: 1, mcrnDone: 1, pirateSworn: 1, corpSworn: 1 }, chance: 0.4 },  // not for the Rook's or the Consortium's
      title: 'Lt. Commander Osei',
      text: 'A naval officer in dress grays buys you a drink you did not ask for: Lieutenant Commander Amara Osei, Mars Republic Navy Reserve. "The Navy is short of hulls and long on enemies. We commission independent captains with good standing: reserve pay, the odd tasking, and a call-up if it comes to war. You would still be your own captain. Mostly."',
      choices: [
        { label: 'Accept the commission', effects: { q: { mcrn: 1 }, rep: { 'Mars Republic': 3 }, log: 'Took a reserve commission in the Mars Republic Navy.' },
          result: 'Osei swears you in at the bar, which she says is traditional. It is not. "Welcome aboard, Reservist. I will be in touch."' },
        { label: 'Not yet', result: '"The offer stands," she says. "For now."' },
        { label: 'Never', effects: { set: { mcrnDone: 1 } }, result: 'Osei nods as if she expected it, finishes her drink, and leaves yours on the bar.' },
      ],
    });

    M.addStorylet({
      id: 'navy-hunt', where: 'port', priority: 2, once: false,
      when: { planet: home, q: { mcrn: 1 }, qBelow: { mcrn: 2, navyTask: 1, mcrnDone: 1 } },
      title: 'First Tasking',
      text: 'Osei slides a data chit across the table. "A raider calling itself the Hollow Crown has been picking off Martian ore haulers near Pallas. Navy hulls are busy. You are not. Bring it down and the Reserve will notice."',
      choices: [
        { label: 'Take the hunt', effects: { ...task, log: 'Tasked by the MCRN Reserve to hunt the raider Hollow Crown near Pallas.',
          bounty: { at: 'pallas', name: 'Raider "Hollow Crown"', pay: 9000, days: 45, issuer: 'Mars Republic',
            onDone: { q: { mcrn: 1 }, set: taskOver, rep: { 'Mars Republic': 3 }, log: 'Destroyed the Hollow Crown for the MCRN Reserve.' },
            onFail: { set: taskOver, rep: { 'Mars Republic': -3 }, log: 'The Hollow Crown got away. Osei was not impressed.' } } },
          result: '"Forty-five days," Osei says. "After that it is someone else\'s problem, and a mark against yours."' },
        { label: 'Ask for another time', result: '"Another time, then. The Crown will still be out there."' },
      ],
    });

    M.addStorylet({
      id: 'navy-distress', where: 'transit', priority: 1,
      when: { q: { mcrn: 2 }, qBelow: { mcrnDone: 1 }, chance: 0.35 },
      title: 'Tharsis Dawn',
      text: 'A Martian survey ship, the Tharsis Dawn, is broadcasting a reactor fault on a Navy channel only reservists would hear. Three of its crew are burned; the rest are trying to hold the containment by hand.',
      choices: [
        { label: '{crew} goes over to treat the burned', when: { crew: 'medic' },
          effects: { q: { mcrn: 1 }, rep: { 'Mars Republic': 4 }, log: 'Answered the Tharsis Dawn\'s distress call; our medic saved her crew.' },
          result: '{crew:medic} comes back six hours later, gray with exhaustion. All three will live. The Navy logs your transponder with a commendation.' },
        { label: 'Send over spare parts (1,500 cr)', when: { credits: 1500 },
          effects: { credits: -1500, q: { mcrn: 1 }, rep: { 'Mars Republic': 3 }, log: 'Answered the Tharsis Dawn\'s distress call with spare parts.' },
          result: 'Your spare coolant pumps hold the containment until a Navy tug arrives. Their captain promises to mention you.' },
        { label: 'Log the call and keep burning', effects: { rep: { 'Mars Republic': -3 } },
          result: 'Someone else answers, eventually. The Reserve notices who did not.' },
      ],
    });

    M.addStorylet({
      id: 'navy-callup', where: 'port', priority: 2,
      when: { planet: 'Mars', q: { mcrn: 2 }, ...free, war: 'Mars Republic' },
      title: 'Call-Up',
      text: 'The Reserve is activated. Osei, now in combat grays, is all business: "Twelve tons of munitions for the fleet anchorage at Phobos Yards. It is a short hop, and it is the most important short hop you will ever make."',
      choices: [
        { label: 'Load the munitions (12t)', when: { space: 12 },
          effects: { ...task, log: 'Called up by the MCRN Reserve: munitions run to Phobos Yards.',
            mission: { to: 'Phobos Yards', tons: 12, good: 'MCRN munitions', pay: 6000, days: 10, title: 'MCRN call-up: munitions to Phobos Yards',
              onDone: { q: { mcrn: 1 }, set: taskOver, rep: { 'Mars Republic': 5 }, log: 'Delivered munitions to the fleet at Phobos.' },
              onFail: { set: taskOver, q: { mcrn: -1 }, rep: { 'Mars Republic': -6 }, log: 'Failed to deliver the Navy\'s munitions.' } } },
          result: '"Ten days," Osei says. "Do not make me come looking for you."' },
      ],
    });

    M.addStorylet({
      id: 'navy-flag', where: 'port', priority: 2,
      when: { planet: home, q: { mcrn: 2 }, ...free, peace: 'Mars Republic' },
      title: 'Showing the Flag',
      text: 'Peacetime work, Osei says, is the part nobody writes songs about. "A sealed pouch for our consulate on Ganymede. The Jovians like to see Martian reservists. It reminds them we have friends out there."',
      choices: [
        { label: 'Carry the pouch', effects: { ...task, log: 'Carrying a sealed MCRN pouch to Ganymede.',
          mission: { to: 'Ganymede', tons: 1, good: 'sealed MCRN pouch', pay: 5000, days: 35, title: 'Carry a sealed MCRN pouch to Ganymede',
            onDone: { q: { mcrn: 1 }, set: taskOver, rep: { 'Mars Republic': 3 }, log: 'Delivered the MCRN pouch to Ganymede.' },
            onFail: { set: taskOver, rep: { 'Mars Republic': -3 }, log: 'The MCRN pouch never reached Ganymede.' } } },
          result: '"Do not open it," Osei says. "I am serious. Do not."' },
        { label: 'Not now', result: '"It will keep," she says. "Diplomacy is slow."' },
      ],
    });

    M.addStorylet({
      id: 'navy-loyalty', where: 'port', priority: 2,
      when: { planet: home, q: { mcrn: 3 }, ...free },
      title: 'An Unpleasant Order',
      text: 'Osei does not sit down. "Naval intelligence wants a Collective freighter, the Blue Ice, boarded and searched at Ceres. They think she is carrying Aquilon contraband. They want it done by a reservist, so it is not an act of war." She pauses. "Belters will remember who did it."',
      choices: [
        { label: 'Do it', effects: { q: { mcrn: 1 }, rep: { 'Mars Republic': 6, 'Belt Collective': -12 }, unrest: { ceres: 0.15 },
          log: 'Boarded and searched the Collective freighter Blue Ice for Naval intelligence.', news: 'A Martian reservist boards a Collective freighter at Ceres. The Collective protests.' },
          result: 'The search finds nothing. The Blue Ice\'s captain spits on your boots. Osei says only, "Good work."' },
        { label: '{crew} fakes the search records', when: { crew: 'slicer' },
          effects: { q: { mcrn: 1 }, rep: { 'Mars Republic': 2 }, log: 'Faked the search of the Blue Ice. Naval intelligence is satisfied, for now.' },
          result: '{crew:slicer} produces a flawless search log for a boarding that never happened. Osei reads it twice and looks at you for a long time.' },
        { label: 'Refuse', effects: { q: { mcrn: 1 }, set: { mcrnRefused: 1 }, rep: { 'Mars Republic': -4 }, log: 'Refused a Naval intelligence order to board a Collective freighter.' },
          result: '"Noted," Osei says, and writes something down. "It will cost you. Not as much as you think."' },
      ],
    });

    const promotion = { where: 'port', priority: 3, title: 'Lieutenant\'s Bars' };
    M.addStorylet({
      ...promotion, id: 'navy-promotion',
      when: { planet: 'Mars', q: { mcrn: 4, 'seen:navy-loyalty': 1 }, qBelow: { mcrnRefused: 1, mcrnDone: 1, navyTask: 1 } },
      text: 'A short ceremony in a Navy hangar on Mars, under a flag older than you. Osei pins the bars on herself. "Lieutenant, Reserve. You have earned the Navy\'s trust, and its enemies. Both come with the rank."',
      choices: [{ label: 'Salute', effects: { set: { mcrnDone: 1 }, credits: 15000, rep: { 'Mars Republic': 10 }, log: 'Promoted to Lieutenant in the MCRN Reserve.', news: 'The Mars Republic Navy promotes an independent captain to Lieutenant in its Reserve.' },
        result: 'The promotion comes with a 15,000 cr bonus and a standing no Martian patrol will question.' }],
    });
    M.addStorylet({
      ...promotion, id: 'navy-promotion-refused',
      when: { planet: 'Mars', q: { mcrn: 4, mcrnRefused: 1, 'seen:navy-loyalty': 1 }, qBelow: { mcrnDone: 1, navyTask: 1 } },
      text: 'No ceremony. Osei meets you on the docks with the bars in her pocket. "Intelligence wanted you out. I told them a reservist who can say no is worth three who can\'t. You will never make commander. You are still ours."',
      choices: [{ label: 'Take the bars', effects: { set: { mcrnDone: 1 }, credits: 8000, rep: { 'Mars Republic': 5 }, log: 'Promoted to Lieutenant in the MCRN Reserve, despite refusing an order.' },
        result: 'The bars come with an 8,000 cr bonus and a note in your file that Osei says she will deny writing.' }],
    });
  },
});
