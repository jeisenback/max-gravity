'use strict';

// The Rook's Crown: a pirate lord's rise at Hygiea, written as storylets. It competes
// with Reserve Commission (js/stories/mars-navy.js): swearing to the Rook closes the
// Navy's offer, and a Navy commission closes the Rook's. The quality `crown` is your
// rise (the Crown at 4); `rookTask` is set while you carry Rook business;
// `contraband` while the smuggled crates are aboard; `rivalDead` remembers how the
// rival was settled; `crownDone` ends the storyline. The raid in beat four sets off a
// real raid in the living world (world.js): unrest, shortages, the lot.

Mods.register({
  id: 'rook-crown', name: "The Rook's Crown", builtin: true,
  init(M) {
    const rook = 'The Rook';
    const free = { qBelow: { rookTask: 1, crownDone: 1 } };
    const taskOver = { rookTask: 0 };

    M.addStorylet({
      id: 'rook-invite', where: 'port', priority: 1, once: false,
      when: { planet: rook, day: 20, qBelow: { crown: 1, crownDone: 1, mcrn: 1, corpSworn: 1 }, chance: 0.5 },
      title: 'Hollis Mbeki',
      text: 'Nobody rules the Rook, which is why everyone on it answers to Hollis Mbeki. He finds you at the refuel collar, an old man in a flight suit older than you. "Captains who dock here more than twice get asked the question. Do you want to fly under the Rook\'s colors? The Coalition and Mars will hate you for it. We will not."',
      choices: [
        { label: 'Fly under the Rook\'s colors', effects: { q: { crown: 1 }, set: { pirateSworn: 1 }, rep: { Pirate: 8, 'Earth Coalition': -4, 'Mars Republic': -4 }, log: 'Swore to fly under the Rook\'s colors.' },
          result: 'Hollis paints a small black tower on your airlock with his own hand. "There. Now every pirate in the Belt knows whose you are."' },
        { label: 'Not yet', result: '"The question keeps," Hollis says. "Captains don\'t."' },
        { label: 'Never', effects: { set: { crownDone: 1 } }, result: 'Hollis shrugs. "Then dock, trade, and leave. We\'re not proud."' },
      ],
    });

    M.addStorylet({
      id: 'rook-smuggle', where: 'port', priority: 2,
      when: { planet: rook, q: { crown: 1 }, ...free },
      title: 'Unmarked Crates',
      text: 'Hollis walks you past ten tons of crates stenciled MEDICAL. "Reactor parts, from a Coalition depot that is missing some reactor parts. Ceres will pay for them and not ask. Collective customs might. That\'s what you\'re for."',
      choices: [
        { label: 'Run the crates to Ceres (10t, 7,000 cr)', when: { space: 10 },
          effects: { set: { rookTask: 1, contraband: 1 }, log: 'Running stolen reactor parts to Ceres for the Rook.',
            mission: { to: 'Ceres Station', tons: 10, good: 'unmarked crates', pay: 7000, days: 30, title: 'Run unmarked crates to Ceres Station for the Rook',
              onDone: { q: { crown: 1 }, set: { ...taskOver, contraband: 0 }, rep: { Pirate: 3 }, log: 'Delivered the Rook\'s crates to Ceres.' },
              onFail: { set: { ...taskOver, contraband: 0 }, rep: { Pirate: -4 }, log: 'The Rook\'s crates never reached Ceres. Hollis will remember.' } } },
          result: '"Thirty days," Hollis says. "Longer than that, and they become your crates."' },
        { label: 'Not this run', result: '"There will be others," he says. "There are always crates."' },
      ],
    });

    M.addStorylet({
      id: 'rook-customs', where: 'transit', priority: 2,
      when: { at: 'ceres', q: { contraband: 1 } },
      title: 'Collective Customs',
      text: 'A Collective militia cutter pulls alongside on the approach to Ceres. "Manifest check. Ten tons of medical? Lovely. We\'ll just have a look."',
      choices: [
        { label: '{crew} rewrites the manifest', when: { crew: 'slicer' },
          effects: { q: { crown: 1 } },
          result: 'By the time they board, your manifest and your crates agree that they are hydroponics substrate. The militia leaves disappointed. Hollis will hear about this.' },
        { label: 'Bribe the inspector (2,000 cr)', when: { credits: 2000 }, effects: { credits: -2000 },
          result: 'The inspector counts the transfer twice, then counts your crates as medical.' },
        { label: 'Dump the crates before they board', effects: { cancelMission: 'unmarked crates' },
          result: 'The crates go out the lock and tumble away toward the Belt. The militia finds an empty hold and a very innocent captain.' },
        { label: 'Run for it', effects: { rep: { 'Belt Collective': -6 }, q: { crown: 1 } },
          result: 'You light the drive and dive into the Ceres traffic. They don\'t follow, but they have your transponder now.' },
      ],
    });

    M.addStorylet({
      id: 'rook-rival', where: 'port', priority: 2,
      when: { planet: rook, q: { crown: 2 }, ...free },
      title: 'Dagger Quartey',
      text: '"Ines Quartey," Hollis says, as if the name tastes bad. "Calls herself Dagger. She wants my chair, and she has been telling the council you are a Coalition plant. She runs out of the Saturn moons. Settle it."',
      choices: [
        { label: 'Hunt her down', effects: { set: { rookTask: 1 }, log: 'Went hunting for Dagger Quartey around Saturn.',
          bounty: { at: 'saturn', name: 'Dagger Quartey\'s "Knife in the Dark"', pay: 10000, days: 50, issuer: 'Pirate',
            onDone: { q: { crown: 1 }, set: { ...taskOver, rivalDead: 1 }, rep: { Pirate: 5 }, log: 'Killed Dagger Quartey near Saturn.' },
            onFail: { set: taskOver, rep: { Pirate: -5 }, log: 'Dagger Quartey is still out there, telling stories about you.' } } },
          result: '"Fifty days," Hollis says. "After that, she comes looking for you."' },
        { label: 'Buy her off (6,000 cr)', when: { credits: 6000 },
          effects: { credits: -6000, q: { crown: 1 }, log: 'Paid Dagger Quartey to stop spreading stories.' },
          result: 'Dagger takes the money with a smile you will think about later. The stories stop.' },
        { label: 'Leave it for now', result: '"She won\'t," Hollis says.' },
      ],
    });

    const raid = (lanes, sid, gov) => ({
      label: `Raid the ${lanes} lanes`,
      effects: { q: { crown: 1 }, credits: 12000, unrest: { [sid]: 0.45 }, rep: { [gov]: -12, Pirate: 5 },
        log: `Led the Rook's raid on the ${lanes} shipping lanes.`, news: `Pirates flying the Rook's colors raid shipping around ${SYSTEMS[sid].name}.` },
      result: `Three ships, one plan, and a week of ${lanes} freighters wishing they had stayed in port. Your share is 12,000 cr. Prices around ${SYSTEMS[sid].name} will feel it for weeks.`,
    });

    M.addStorylet({
      id: 'rook-raid', where: 'port', priority: 2,
      when: { planet: rook, q: { crown: 3 }, ...free },
      title: 'The Council\'s Raid',
      text: 'The Rook\'s council meets in a disused smelter. They want shipping thinned somewhere that will hurt, prices driven up, and the inner planets reminded who owns the dark between the rocks. They want you to lead it.',
      choices: [
        raid('Martian', 'mars', 'Mars Republic'),
        raid('Coalition', 'earth', 'Earth Coalition'),
        { label: 'Decline', effects: { rep: { Pirate: -5 } }, result: 'The council goes quiet. Hollis says, "Another time," in a voice that means there may not be one.' },
      ],
    });

    const crown = { where: 'port', priority: 3, title: 'The Rook\'s Crown' };
    const crowned = { set: { crownDone: 1 }, credits: 20000, rep: { Pirate: 20 }, log: 'Took a seat on the Rook\'s council.', news: 'A new captain sits at the head of the Rook\'s council.' };
    M.addStorylet({
      ...crown, id: 'rook-crown-blood',
      when: { planet: rook, q: { crown: 4, rivalDead: 1, 'seen:rook-raid': 1 }, qBelow: { crownDone: 1, rookTask: 1 } },
      text: 'Hollis Mbeki is dying, slowly and on his own terms. The council gathers around his bed and he points at you. "This one killed Dagger and bled the inner planets. Nobody will doubt they can hold the chair."',
      choices: [{ label: 'Take the chair', effects: crowned, result: 'The council\'s share of the Rook\'s take is yours now, and every pirate between Mars and Jupiter knows your transponder. Some of them will even leave you alone.' }],
    });
    M.addStorylet({
      ...crown, id: 'rook-crown-coin',
      when: { planet: rook, q: { crown: 4, 'seen:rook-raid': 1 }, qBelow: { rivalDead: 1, crownDone: 1, rookTask: 1 } },
      text: 'Hollis Mbeki is dying, slowly and on his own terms. He points at you. "This one bought peace when blood was cheaper. That\'s a lord, not a thug." Dagger Quartey, at the back of the room, raises her glass to you. You will be watching her for the rest of your life.',
      choices: [{ label: 'Take the chair', effects: crowned, result: 'The council\'s share of the Rook\'s take is yours now. Dagger was the first to congratulate you, which is exactly what worries you.' }],
    });
  },
});
