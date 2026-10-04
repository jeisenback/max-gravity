'use strict';

// Ports with something of their own: scenes that happen at one place and read like it. Each is a storylet at a landing
// (landings.js has the shape), for a hired hand, with a small chance and a wait before it comes round again, so a hub that is
// landed at a lot is not the same scene each time. A choice for your own post (`when: { post }`) is shown to that post only.
// Mars, Ganymede and Hermes Foundry first: the ports the captain's runs go to most, and that had the least.

Mods.register({
  id: 'ports', name: 'Port scenes', builtin: true,
  init(M) {
    const scene = (def, chance = 0.12) => M.addStorylet({ where: 'port', priority: -1, once: false, every: 40, via: 'station', ...def, when: { day: 3, hired: true, ...def.when, chance } });

    // ---------- Mars: domes, dust and a long argument about the sky ----------
    scene({
      id: 'port-mars-front', when: { planet: 'Mars' }, title: 'A Front Over the Valley',
      text: 'The port siren goes as you finish tying down, a long falling note, and the pad crews start dragging tarps over everything that cannot be shut in. Out on the valley rim a brown wall is standing up into the sky, from the ground to as high as you can see, and it is moving. "Front," says a pad boss, going past at a run. "Two hours, or less. Anybody who wants to lift needs to do it now."',
      choices: [
        { label: '[Pilot] Lift before it arrives', when: { post: 'pilot' }, effects: { learn: 4, like: { captain: 1 } }, result: 'You have the ship off the pad with forty minutes in hand and climb out over the front, with the dust boiling a few kilometers below and the sun coming through it red. Captain says nothing, and then says it was a good lift.' },
        { label: '[Engineer] Seal the intakes, and ride it out', when: { post: 'engineer' }, effects: { learn: 4, like: { captain: 1 } }, result: 'You seal every intake and put a filter sock on the cooling vents, and the dust comes down on the ship like a hand. It scours the paint and nothing else. When the siren goes again the ship is cleaner inside than the port is outside.' },
        { label: 'Help the pad crew with the tarps', effects: { rep: { 'Mars Republic': 2 }, like: { crew: 1 } }, result: 'You spend an hour on the pad with a stranger on the other end of every tarp, and when the front comes you are all inside the dome, grey to the knees and laughing. The pad boss writes your ship on a chit for a berth discount next time.' },
        { label: 'Sit it out aboard', result: 'The front takes two hours and a bit, and sounds like sand on a drum. Nobody aboard says much, and by the end you know the sound of the ship\'s every joint.' },
      ],
    });
    scene({
      id: 'port-mars-sky', when: { planet: 'Mars' }, title: 'What Color the Sky Will Be',
      text: 'At the Red Line two people have been arguing about the sky for what the bartender says is longer than the bar has been there: an old veteran from the first domes, who says it will be blue in her lifetime, and a young atmospheric modeler, who has the numbers and says it will not be in anyone\'s. They notice you listening and appeal to you, both at once, over the noise.',
      choices: [
        { label: 'Side with the veteran', effects: { like: { crew: 1 }, rep: { 'Mars Republic': 1 } }, result: '"There," says the veteran, and pays for your drink. The modeler says that is not how evidence works, and then says he hopes you are right, and means it.' },
        { label: 'Side with the modeler', effects: { learn: 2 }, result: 'The modeler sits you down and shows you the numbers on a napkin: the pressure, the water, the long slow sums. By the end you understand why nobody is sure, and the veteran, grudgingly, buys the next round.' },
        { label: 'Say the sky is a good color already', effects: { rep: { 'Mars Republic': 2 } }, result: 'They both stop. "Butterscotch," says the veteran, slowly. "It is the color of home," says the modeler. They agree on something for the first time in forty years, and the bar applauds.' },
      ],
    });
    scene({
      id: 'port-mars-recruiter', when: { planet: 'Mars', war: 'Mars Republic' }, title: 'A Recruiter at the Pad',
      text: 'A navy recruiter in a good jacket is working the pad in the gap between ships, with a tablet and a smile. The Mars Republic is at war, and the navy wants pilots, gunners, and anyone who can keep an old drive alive. She has a pitch ready, and the ship\'s name already, and she says it to you like a promise.',
      choices: [
        { label: 'Take the leaflet and say you will think about it', effects: { rep: { 'Mars Republic': 2 } }, result: 'You take the leaflet. She seems to expect that, and writes your name down anyway, in case. It is a good leaflet, and you keep it.' },
        { label: 'Ask what the pay is', effects: { learn: 1 }, result: 'She tells you, and you do the sums, and then she tells you what the navy pays for a hand who is good at their post. It is more than your share, and it is a hundred times the risk. You understand each other.' },
        { label: 'Tell her you have a berth', result: '"Everyone has a berth," she says, not unkindly. "Until they do not." She hands you a card anyway, for the day the berth stops being yours.' },
      ],
    });

    // ---------- Ganymede: domes, harvest, and Jupiter ----------
    scene({
      id: 'port-ganymede-pump', when: { planet: 'Ganymede' }, title: 'The Pump in the Third Dome', personal: true,
      text: 'There is a line of people at the dock gate with buckets, and a smell of wet soil and something green and cooked. The third dome\'s irrigation pump has gone, an old centrifugal on a bearing that has been sung to for years, and the beans are four days from a very dry week. A woman in a field coat has been through the port asking for anyone who can read a pump.',
      choices: [
        { label: '[Engineer] Rebuild the pump', when: { post: 'engineer' }, effects: { learn: 4, credits: 120, like: { captain: 1 } }, result: 'You spend a long afternoon in a pit under the dome with a flashlight in your teeth and a stranger passing you tools. The bearing was the thing. When the pump catches, every person in the dome stops what they are doing and looks at the sky, as if it were the sky that had moved. They pay you 120 cr and a crate of beans.' },
        { label: '[Pilot] Fly a spare bearing in from the yard', when: { post: 'pilot' }, effects: { learn: 3, credits: 80, like: { captain: 1 } }, result: 'The yard has the bearing, in a drawer, and you carry it back across the ice in a hurry. The woman in the field coat meets you at the lock and does not say anything until the pump has started. She pays you 80 cr, and then she hugs you.' },
        { label: 'Carry buckets until the pump is fixed', effects: { like: { crew: 1 } }, result: 'You carry water for six hours in a line with forty strangers and one very old man who sets the pace. By the end you know three people\'s names and a lot of songs about beans. The old man tells you that is how it is done.' },
        { label: 'Leave them to it', result: 'You go back aboard. It is not your pump. Behind you the line at the gate does not get any shorter, and you do not look back to see.' },
      ],
    });
    scene({
      id: 'port-ganymede-jupiter', when: { planet: 'Ganymede' }, title: 'Jupiter at the Skylight',
      text: 'The dome\'s skylight is the biggest window you have been under in a month, and Jupiter fills it, banded and slow, with a storm the size of a world turning in the middle. Somebody has put a bench under the center of the glass, and a sign that says nothing, and a few people are sitting there not talking. One of your crew is among them.',
      choices: [
        { label: 'Sit with them', effects: { like: { crew: 1 }, learn: 1 }, result: 'You sit. Nobody says anything for a long time, and the storm turns a few degrees, and the light on the glass changes. It is the best twenty minutes of the trip, and nobody says that either.' },
        { label: 'Take a picture for the ship\'s wall', effects: { like: { crew: 1 } }, result: 'You take the picture, and it is not as good as the sky. It goes on the galley wall anyway, and a month later somebody has drawn a small ship in front of the storm.' },
        { label: 'Keep walking', result: 'You have a berth to find and a captain who wants you back by the hour. The skylight is behind you, and so is Jupiter, and you tell yourself you will come back.' },
      ],
    });
    scene({
      id: 'port-ganymede-market', when: { planet: 'Ganymede' }, title: 'The Harvest Stall',
      personal: true,
      text: 'The dome market is on the day when the first of the harvest comes in, and the stalls are piled with things you have not seen in months: green beans, orange squash, a pile of bright red tomatoes that a woman is selling by the single fruit, and loudly. She puts one in your hand before you can say no. "Taste," she says. "Then argue."',
      choices: [
        { label: 'Buy a crate for the galley (60 cr)', when: { credits: 60 }, effects: { credits: -60, like: { crew: 1 } }, result: 'The crate goes on the ship, and the galley smells of tomato for three days. The cook, if you have one, is in a good mood, and so is everyone else.' },
        { label: 'Buy one tomato and eat it standing there (5 cr)', when: { credits: 5 }, effects: { credits: -5 }, result: 'It is warm from the sun, in a dome, under Jupiter, and it is the best thing you have eaten in a year. The woman nods as if you had passed.' },
        { label: 'Haggle', effects: { learn: 1 }, result: 'You haggle for twenty minutes, with a great deal of noise on both sides and no purchase at the end. The woman gives you a tomato anyway, for entertainment.' },
      ],
    }, 0.1);

    // ---------- Hermes Foundry: heat, shifts and ice that costs more than the liquor ----------
    scene({
      id: 'port-hermes-heat', when: { planet: 'Hermes Foundry' }, title: 'The Shift Bell',
      text: 'The bell goes for the shift change and the corridors fill, a river of red-faced people in shielding, going both ways at once. In the middle of it a man in a smelter suit sits down hard against the wall and does not get up. The river parts around him, and closes again. Nobody stops. It is not callousness. It is a shift, and the next one is coming.',
      choices: [
        { label: 'Stop, and give him your water', effects: { like: { crew: 1 }}, result: 'You crouch, and he drinks, and his color comes back. "Shift change," he says. "Nobody stops at shift change." Then, after a while: "Thank you." He goes back into the river with your flask, and you do not ask for it back.' },
        { label: '[Engineer] Check his suit seals', when: { post: 'engineer' }, effects: { learn: 3, like: { crew: 1 } }, result: 'His cooling loop has a seal gone, a small one, slowly cooking him. You change it with your own kit in two minutes on the corridor floor. He looks at the seal, and then at you, and says that one is for the next shift to hear about.' },
        { label: 'Call the foundry medics', effects: { like: { crew: 1 } }, result: 'The medics come in under a minute, which is faster than you expected, and take him away with practiced hands. One of them says there are four a day. They do not stop, either.' },
        { label: 'Keep moving', result: 'You keep moving, with the river, and you do not look back. It is the right thing for the shift, and it follows you to the airlock.' },
      ],
    });
    scene({
      id: 'port-hermes-coolant', when: { planet: 'Hermes Foundry' }, title: 'The Coolant Bill',
      text: 'The port clerk slides the bill across the counter with an apology in her face. It is for the coolant your ship drew on the way in: the dock loop runs hot enough to boil an ordinary radiator, and the price is the price. "Nobody argues," she says. "Everyone argues." She has a stamp, and a queue behind you.',
      choices: [
        { label: 'Pay it', effects: { like: { captain: -1 } }, result: 'You pay the bill and the clerk stamps it. It is more than you expected, and the captain will notice it in the ledger, and does.' },
        { label: '[Engineer] Show her the loop ran cold', when: { post: 'engineer' }, effects: { learn: 3, like: { captain: 1 } }, result: 'You pull the loop log and show her where it ran twenty degrees under what she billed. She checks it with her lips moving, and then checks it again, and writes a lower number. The queue behind you is delighted.' },
        { label: 'Ask the clerk what the usual rate is', effects: { learn: 1 }, result: 'She tells you, quietly, off the record, and the usual rate is less than the bill. You get it knocked down a third for asking, and a look that says she will remember you.' },
      ],
    });
    scene({
      id: 'port-hermes-glass', when: { planet: 'Hermes Foundry' }, title: 'Slag Glass',
      personal: true,
      text: 'A kid is selling pieces of slag glass on a cloth by the dock gate: the smelter\'s leavings, poured into a mold and cooled fast, every one a different swirl of green and amber and black. He holds one up to the red light from the furnaces. "It is not worth anything," he says honestly. "But look."',
      choices: [
        { label: 'Buy one for the ship (20 cr)', when: { credits: 20 }, effects: { credits: -20, like: { crew: 1 } }, result: 'It goes on the sill of the galley hatch, where it catches the light on every burn. By the end of the month everyone has named it.' },
        { label: 'Ask the kid how it is made', effects: { learn: 1 }, result: 'He tells you, at length, with gestures: the pour, the cooling, the way the color is the metal that was in the slag. He knows more about a foundry than anyone you have met this month.' },
        { label: 'Give him a coin and take nothing (5 cr)', when: { credits: 5 }, effects: { credits: -5}, result: 'He looks at the coin, and at you, and puts a piece of glass in your pocket when you turn away. You find it later, and smile.' },
      ],
    }, 0.1);
  },
});
