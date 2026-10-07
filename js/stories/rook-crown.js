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
    if (scopeOff('storylines')) return;  // not in this build (js/build.js)
    const rook = 'The Rook';
    const free = { qBelow: { rookTask: 1, crownDone: 1 } };
    const taskOver = { rookTask: 0 };

    M.addStorylet({
      id: 'rook-invite', where: 'port', priority: 1, once: false,
      when: { planet: rook, day: 20, qBelow: { crown: 1, crownDone: 1, mcrn: 1, corpSworn: 1 }, chance: 0.5 },
      title: 'Hollis Mbeki',
      text: ('Nobody rules the Rook, which is why everyone on it answers to Hollis Mbeki. He finds you at the refuel collar, an old man in a flight ' +
          'suit older than you, patched at the elbows and the knees, with a cracked leather cap and a soft, raspy voice. He does not seem to be in a ' +
          'hurry. He watches you top off your tanks with the flat, patient gaze of a man who has been reading captains for sixty years. "Captains who ' +
          'dock here more than twice get asked the question," he says. "Do you want to fly under the Rook\'s colors? The Coalition and Mars will hate ' +
          'you for it. We will not. That is not a small thing, in these lanes."'),
      choices: [
        { label: 'Fly under the Rook\'s colors', effects: { q: { crown: 1 }, set: { pirateSworn: 1 }, rep: { Pirate: 8, 'Earth Coalition': -4, 'Mars Republic': -4 }, log: 'Swore to fly under the Rook\'s colors.' },
          result: ('Hollis climbs the ladder to your airlock, slowly, wheezing a little, with a small pot of black paint and a brush older than you ' +
              'are, and paints a tower on the frame with his own hand, dot by dot, in silence. It takes ten minutes. He steps back to look at it, head ' +
              'cocked, and nods. "There. Now every pirate in the Belt knows whose you are. Do not make me regret the paint."') },
        {
          label: 'Not yet',
          result: ('"The question keeps," Hollis says, with a small dry smile, and taps the side of your hull twice, gently, like a man patting a ' +
              'horse. "Captains don\'t. Keep that in mind, and keep your transponder clean." He shuffles away down the collar, and, behind him, a ' +
              'young pirate at the bar raises a cup in something halfway to a salute.')
        },
        {
          label: 'Never',
          effects: { set: { crownDone: 1 } },
          result: ('Hollis shrugs, with no anger at all, only an old man\'s tiredness. "Then dock, trade, and leave. We\'re not proud, and we are not ' +
              'fools. Not everyone is meant for our colors." He turns, and, over his shoulder, adds, "But do not tell them where we are. That I would ' +
              'take personally."')
        },
      ],
    });

    M.addStorylet({
      id: 'rook-smuggle', where: 'port', priority: 2,
      when: { planet: rook, q: { crown: 1 }, ...free },
      title: 'Unmarked Crates',
      text: ('Hollis walks you past a stack of crates in a dim side bay of the Rook, ten tons of them, stenciled MEDICAL in official red paint that ' +
          'has not quite dried. He rests one hand on the top of the pile, affectionately, as if it were a horse. "Reactor parts, from a Coalition ' +
          'depot that is missing some reactor parts. Ceres will pay for them and not ask. Collective customs might. That\'s what you\'re for." He ' +
          'smiles, thinly. "Nobody has ever inspected a captain who looks this honest."'),
      choices: [
        { label: 'Run the crates to Ceres (10t, 7,000 cr)', when: { space: 10 },
          effects: { set: { rookTask: 1, contraband: 1 }, log: 'Running stolen reactor parts to Ceres for the Rook.',
            mission: { to: 'Ceres Station', tons: 10, good: 'unmarked crates', pay: 7000, days: 30, title: 'Run unmarked crates to Ceres Station for the Rook',
              onDone: { q: { crown: 1 }, set: { ...taskOver, contraband: 0 }, rep: { Pirate: 3 }, log: 'Delivered the Rook\'s crates to Ceres.' },
              onFail: { set: { ...taskOver, contraband: 0 }, rep: { Pirate: -4 }, log: 'The Rook\'s crates never reached Ceres. Hollis will remember.' } } },
          result: ('"Thirty days," Hollis says. "Longer than that, and they become your crates." Two silent dockhands load them, with the exaggerated ' +
              'care of people who know exactly what is inside. The stencil paint smears on your palms, and you cannot get it off for a day. Every time ' +
              'you look at it, it looks like a small red cross.') },
        {
          label: 'Not this run',
          result: ('"There will be others," he says, and takes his hand off the crates, and looks at you a moment longer than is comfortable. "There ' +
              'are always crates. And there are always captains who say yes the first time." He does not say it unkindly. He says it like a man ' +
              'reading a weather report.')
        },
      ],
    });

    M.addStorylet({
      id: 'rook-customs', where: 'transit', priority: 2,
      when: { at: 'ceres', q: { contraband: 1 } },
      title: 'Collective Customs',
      text: ('A Collective militia cutter pulls alongside on the approach to Ceres, close enough that you can see the scratches on her hull and the ' +
          'crew in the observation blister, watching you. A cheerful young voice, far too friendly to be reassuring: "Manifest check. Ten tons of ' +
          'medical? Lovely. We\'ll just have a look." In the hold, behind you, the crates sit quietly, stenciled a bright, honest red.'),
      choices: [
        { label: '{crew} rewrites the manifest', when: { crew: 'slicer' },
          effects: { q: { crown: 1 } },
          result: ('By the time the militia boards, your manifest and your crates agree completely: hydroponics substrate, ten tons, packed in the ' +
              'customary way. The sergeant in charge inspects the crates, prods a corner, and finds, to his visible sorrow, that they are exactly what ' +
              'they say. The militia leaves disappointed. Hollis will hear about this, and, you suspect, will be very pleased.') },
        { label: 'Bribe the inspector (2,000 cr)', when: { credits: 2000 }, effects: { credits: -2000 },
          result: ('The inspector counts the transfer twice, very slowly, like a man in prayer. Then he counts your crates, and, with a small, sad ' +
              'shake of the head, records them as medical supplies, nothing else, perfectly in order. "A pleasure doing business with you, captain," ' +
              'he says, and does not look at your face.') },
        { label: 'Dump the crates before they board', effects: { cancelMission: 'unmarked crates' },
          result: ('The crates go out the lock one after another, and tumble away in slow, dark rotation toward the Belt, each one a small red cross ' +
              'falling into the black. It takes eleven minutes. The militia boards and finds an empty hold and a very innocent captain, and a faint, ' +
              'guilty smell of stencil paint. Hollis is not going to be pleased, and you know it.') },
        { label: 'Run for it', effects: { rep: { 'Belt Collective': -6 }, q: { crown: 1 } },
          result: 'You light the drive and dive headlong into the Ceres traffic, between lumbering ice haulers and a tangle of tugs, with the militia\'s voice ringing on every band. They don\'t follow. But they have your transponder now, and, on Ceres, that is a long memory.' },
      ],
    });

    M.addStorylet({
      id: 'rook-rival', where: 'port', priority: 2,
      when: { planet: rook, q: { crown: 2 }, ...free },
      title: 'Dagger Quartey',
      text: ('"Ines Quartey," Hollis says, as if the name tastes bad, and spits, neatly, into a cup. He is sitting in a battered old chair at the ' +
          'back of the bar, with a blanket over his knees, and his hands are trembling slightly on the armrests. "Calls herself Dagger. She wants my ' +
          'chair, and she has been telling the council you are a Coalition plant. She runs out of the Saturn moons, in a ship called the Knife in the ' +
          'Dark, which tells you everything you need to know. Settle it." His voice, for a moment, is very old.'),
      choices: [
        { label: 'Hunt her down', effects: { set: { rookTask: 1 }, log: 'Went hunting for Dagger Quartey around Saturn.',
          bounty: { at: 'saturn', name: 'Dagger Quartey\'s "Knife in the Dark"', pay: 10000, days: 50, issuer: 'Pirate',
            onDone: { q: { crown: 1 }, set: { ...taskOver, rivalDead: 1 }, rep: { Pirate: 5 }, log: 'Killed Dagger Quartey near Saturn.' },
            onFail: { set: taskOver, rep: { Pirate: -5 }, log: 'Dagger Quartey is still out there, telling stories about you.' } } },
          result: ('"Fifty days," Hollis says. "After that, she comes looking for you." He looks out over the bar for a moment, at the young faces in ' +
              'the corners, and something in his expression softens. "She is not a bad pilot, you know. That is the pity of it. It would have been a ' +
              'good thing, to have someone that good on our side."') },
        { label: 'Buy her off (6,000 cr)', when: { credits: 6000 },
          effects: { credits: -6000, q: { crown: 1 }, log: 'Paid Dagger Quartey to stop spreading stories.' },
          result: ('You meet her in a neutral bar on Titan, over a table with a sticky surface. She counts the money twice, with her long fingers, ' +
              'and takes it with a smile you will think about later, and a look at you that is very nearly friendly. The stories stop. The look stays ' +
              'with you. You will never quite be sure what she bought.') },
        { label: 'Leave it for now', result: '"She won\'t," Hollis says, very quietly. He does not add anything. He does not have to. In the silence, you can hear the old fan in the ceiling turning, and someone, far down the corridor, playing a slow, sad tune on a battered guitar.' },
      ],
    });

    const raid = (lanes, sid, gov) => ({
      label: `Raid the ${lanes} lanes`,
      effects: { q: { crown: 1 }, credits: 12000, unrest: { [sid]: 0.45 }, rep: { [gov]: -12, Pirate: 5 },
        log: `Led the Rook's raid on the ${lanes} shipping lanes.`, news: `Pirates flying the Rook's colors raid shipping around ${SYSTEMS[sid].name}.` },
      result: (`Three ships, one plan, and a week of ${lanes} freighters wishing they had stayed in port. You watch the plumes go dark on the scope, ` +
          `one after another, and you do not let yourself count the crews. Your share is 12,000 cr, counted out on the table at the Rook, in used ` +
          `notes that smell of engine oil. Prices around ${SYSTEMS[sid].name} will feel it for weeks, and every merchant there will remember the black ` +
          `tower on your airlock.`),
    });

    M.addStorylet({
      id: 'rook-raid', where: 'port', priority: 2,
      when: { planet: rook, q: { crown: 3 }, ...free },
      title: 'The Council\'s Raid',
      text: ('The Rook\'s council meets in a disused smelter, thirteen chairs around a table made of an old cargo hatch, the air thick with the smell ' +
          'of cold metal and cheap cigars. Faces, some hard and some frightened, turn to look as you come in. They want shipping thinned somewhere ' +
          'that will hurt, prices driven up, and the inner planets reminded who owns the dark between the rocks. They want you to lead it. Nobody in ' +
          'the room is smiling. Everybody is watching to see what you will do.'),
      choices: [
        raid('Martian', 'mars', 'Mars Republic'),
        raid('Coalition', 'earth', 'Earth Coalition'),
        {
          label: 'Decline',
          effects: { rep: { Pirate: -5 } },
          result: ('The council goes quiet, thirteen faces gone perfectly still. Somebody coughs. Somebody, at the far end of the table, draws a slow ' +
              'breath through their teeth. Hollis says, "Another time," in a voice that means there may not be one, and looks at you, for a long ' +
              'moment, as though committing your face to memory.')
        },
      ],
    });

    const crown = { where: 'port', priority: 3, title: 'The Rook\'s Crown' };
    const crowned = { set: { crownDone: 1 }, credits: 20000, rep: { Pirate: 20 }, log: 'Took a seat on the Rook\'s council.', news: 'A new captain sits at the head of the Rook\'s council.' };
    M.addStorylet({
      ...crown, id: 'rook-crown-blood',
      when: { planet: rook, q: { crown: 4, rivalDead: 1, 'seen:rook-raid': 1 }, qBelow: { crownDone: 1, rookTask: 1 } },
      text: ('Hollis Mbeki is dying, slowly and on his own terms. The infirmary is a converted galley, with a single lamp and a bowl of cold tea, and ' +
          'the council gathers around his bed in a ring of low murmurs and folded hands. He looks impossibly small, a bundle of bones beneath a ' +
          'blanket. His eyes find you, and he lifts one shaking finger. "This one killed Dagger and bled the inner planets," he whispers. "Nobody will ' +
          'doubt they can hold the chair."'),
      choices: [{
        label: 'Take the chair',
        effects: crowned,
        result: ('Hollis does not live to see the morning, but he sees you sit. He nods, once, and closes his eyes, and the council lets out a long ' +
            'collective breath. The council\'s share of the Rook\'s take is yours now, and every pirate between Mars and Jupiter knows your ' +
            'transponder. Some of them will even leave you alone. The black tower on your airlock, you realize, is no longer paint. It is a promise.')
      }],
    });
    M.addStorylet({
      ...crown, id: 'rook-crown-coin',
      when: { planet: rook, q: { crown: 4, 'seen:rook-raid': 1 }, qBelow: { rivalDead: 1, crownDone: 1, rookTask: 1 } },
      text: ('Hollis Mbeki is dying, slowly and on his own terms, in a converted galley with a single lamp and a bowl of cold tea. The council crowds ' +
          'around his bed, and he points at you, one thin finger trembling. "This one bought peace when blood was cheaper," he whispers. "That\'s a ' +
          'lord, not a thug." At the back of the room, Dagger Quartey, elegant, alive, and smiling, raises her glass to you. You will be watching her ' +
          'for the rest of your life.'),
      choices: [{
        label: 'Take the chair',
        effects: crowned,
        result: ('Hollis does not live to see the morning, but he sees you sit, and closes his eyes with something like relief. The council\'s share ' +
            'of the Rook\'s take is yours now. Dagger was the first to congratulate you, pressing your hand in both of hers, warm and dry and utterly ' +
            'sincere, which is exactly what worries you. That night you sleep with your back to a bulkhead, and you do not sleep well.')
      }],
    });
  },
});
