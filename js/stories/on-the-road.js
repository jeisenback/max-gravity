'use strict';

// Things that happen between ports: small scenes on a burn that depend on where you are,
// who you carry, and what the world is doing. Each can come round again after `every`
// days, and most only happen in the right place or company. Story scenes come first.

Mods.register({
  id: 'on-the-road', name: 'Scenes on the road', builtin: true,
  init(M) {
    M.addAction('hull', pct => (G.player ? `${hurt(pct)} points of armor damage.` : ''));
    M.addAction('mass', n => {
      const st = G.state, d = n > 0 ? Math.min(n, ship().fuel - st.fuel) : -Math.min(-n, st.fuel);
      st.fuel += d;
    });
    const road = (def, chance = 0.4, every = 60) => M.addStorylet({ where: 'transit', once: false, every, ...def, when: { day: 5, ...def.when, chance } });

    road({
      id: 'road-toll-beacon', when: { gov: 'Dome Concord' },
      title: 'Toll Beacon',
      text: ('An automated beacon hangs in the lane with a Dome Concord seal on its casing. It has been pinging you politely for an hour: lane ' +
          'maintenance, a hundred and fifty credits, receipt provided. It is a real toll. It has also been collected, by the look of the paint, by at ' +
          'least three different people.'),
      choices: [
        {
          label: 'Pay the toll (150 cr)',
          when: { credits: 150 },
          effects: {
          credits: -150,
          rep: { 'Dome Concord': 1 }
        },
          result: ('You tap the transfer, and the beacon takes a moment, humming. It prints a receipt no one will ever read, on a thin strip of ' +
              'Martian paper, and wishes you a productive day, in a voice of flawless courtesy. It even, at the last, thanks you for your patience. ' +
              'You keep the receipt anyway, folded in the logbook.')
        },
        {
          label: '[{crew}] Have {crew} tell it you already paid',
          when: { crew: 'slicer' },
          result: 'Nineteen seconds later the beacon has you down as a prepaid municipal vessel, with a full year of lane rights, a courtesy waiver and a commendation for civic conduct. It thanks you for your service. {crew} closes the console with a tap and says nothing about it.'
        },
        {
          label: 'Ignore it',
          effects: { rep: { 'Dome Concord': -1 } },
          result: 'It logs your transponder and asks you, politely, to reconsider. Twice. Then a third time. You do not. The beacon falls behind, still murmuring its reminders, until the signal fades. Somewhere in a Tharsis office a file gets thicker.'
        },
      ],
    });

    road({
      id: 'road-ice-convoy', when: { gov: 'Charter League' },
      title: 'Ice Convoy',
      text: 'Six haulers are burning in a tight line ahead of you, nose to tail, sharing one long plume of heat. The lead ship hails. "Small ship. You can draft in our wake if you keep your distance and your hands to yourself. Costs nothing, saves your mass. We just like to know who is out here."',
      choices: [
        {
          label: 'Slip in behind them',
          effects: {
          do: [
          'mass',
          30
        ],
          rep: { 'Charter League': 1 }
        },
          result: 'For a day you ride in their shadow, sipping at the drive. At the shift change the lead hauler sends a single line: "Seals tight." It is not a greeting exactly. It is what haulers say instead.'
        },
        {
          label: 'Thank them and keep your own line',
          result: 'They understand at once: nobody drafts behind a stranger without checking the stranger out. "Fair enough," says the lead hauler, and the convoy\'s running lights blink together, once, along the line, before it pulls ahead. You watch them go, six lights in a row.'
        },
        {
          label: 'Ask what they are carrying',
          when: { standing: { 'Charter League': 10 } },
          effects: { news: 'A convoy of ice haulers bound for the inner system is running short on medical stock.' },
          result: 'A pause. "Ice. Mostly. And a lot of people who want their families to hear from them." The lead ship shares the channel for an hour. You listen to other people\'s good news until you notice you are smiling.'
        },
      ],
    });

    road({
      id: 'road-flare', when: { at: ['mercury', 'earth', 'mars'] },
      title: 'Flare Warning',
      text: [
        'The Sun has thrown a flare, and the warning reached you ninety seconds ahead of the particles. Radios crackle. Somewhere in the ship a rad counter starts to tick, patient and rising.',
        { when: { crew: 'engineer' }, text: '{crew:engineer} is already at the reactor shielding, sleeves rolled.' },
      ],
      choices: [
        { label: 'Everyone into the shielded core', effects: { delay: 8 }, result: 'Four hours pressed together in the one compartment with the good lead lining. Someone hums. Someone else tells the story of the worst flare they ever lived through, and it gets worse each time it is corrected.' },
        {
          label: 'Keep burning and trust the hull',
          effects: { do: [
          'hull',
          0.1
        ] },
          result: ('The counter climbs, slowly, from green to yellow to something you do not want to think about, and the whole ship, for two long ' +
              'hours, listens to it tick. The hull takes it. Your hair stands on end in the galley, and a spoon, for no reason at all, rises an inch ' +
              'off the table and drops again, and nobody says a word about it. When the counter finally falls, someone, at last, lets out a long, ' +
              'shaky laugh, and the whole crew joins in.')
        },
        { label: '[{crew}] Have {crew} reroute power to the shielding', when: { crew: 'engineer' }, result: 'It costs {crew} an hour of swearing and a burnt thumb, and the counter never gets past yellow. "The trick," says {crew}, "is to be very annoyed at it."' },
      ],
    });

    road({
      id: 'road-stranded-tug', when: { raid: true },
      title: 'Empty Tank',
      text: 'A mining tug is drifting well off any lane, its drive cold. Three people are waving from a hatch. They have been waving for hours. Pirates scared them off their claim two weeks ago, and they burned everything they had getting clear.',
      choices: [
        {
          label: 'Share reaction mass (40 units)',
          effects: {
          do: [
          'mass',
          -40
        ],
          rep: { 'Charter League': 2 }
        },
          result: 'They fill their tank from your line with the grave care of people handling something breakable. The oldest presses a lump of ore into your hand. "It is not much. It is what we have. Tell them at Ceres that Tamsin\'s crew is alive."'
        },
        {
          label: 'Take them aboard, tow the tug',
          effects: {
          delay: 14,
          rep: { 'Charter League': 3 }
        },
          result: 'Slow going, and the tug\'s spin drags at your hull. But three miners eat hot food for the first time in a fortnight, and the youngest sleeps through the whole burn with a blanket up to their nose.'
        },
        {
          label: 'Radio it in and keep going',
          result: ('You send the position to the nearest station, and the exact time, and the tug\'s name, and a note about what the crew needs. The ' +
              'reply comes back within a minute: "Acknowledged. Someone will come." You keep the channel open long after. At the edge of range a tired ' +
              'voice says, "Thank you. We heard."')
        },
      ],
    }, 0.5, 90);

    road({
      id: 'road-wedding', when: { gov: 'Charter League', standing: { 'Charter League': 0 } },
      title: 'Open Channel',
      text: 'An old habit of the Belt: when two people marry between ships, they do it on the open band, and anyone in range is a guest. You are in range. A small voice is reading vows off a paper that is clearly shaking, and the whole channel is quiet to listen.',
      choices: [
        { label: 'Answer with the ship\'s horn', result: 'Every ship in range answers. It sounds like a herd of enormous animals. The couple laughs on the band, and the channel breaks into cheering.' },
        { label: 'Listen quietly', result: 'You listen to the whole thing: the vows, the shaky laughter, the silence at the end, the ragged cheer. You never learn their names. Days later, in a dull moment, you find yourself smiling at nothing.' },
        {
          label: 'Send a gift of water (5t)',
          when: { cargo: { water: 5 } },
          effects: {
          cargo: { water: -5 },
          rep: { 'Charter League': 3 },
          log: 'Sent five tons of water to a wedding on the open band.'
        },
          result: 'The bride reads out your ship\'s name, so the band will remember. A hundred people now think well of you.'
        },
      ],
    }, 0.35, 120);

    road({
      id: 'road-pace-cutter', when: { war: true },
      title: 'A Cutter at Your Shoulder',
      text: 'A navy cutter has spent the last six hours matching your speed, two hundred kilometers off your beam, saying nothing at all. It is doing what warships do in a war: being visible, being patient, and letting your imagination fill in the rest.',
      choices: [
        { label: 'Hail them first', result: 'A tired voice: "Routine, freighter. Everyone gets a pacer this month." A pause. "Watch the lanes near the front. Bad luck for small ships." That is all you get, and it is more than you asked for.' },
        { label: 'Say nothing and hold your course', result: 'Six hours. Then, as suddenly as it came, the cutter turns its nose and drops away into the dark. You do not realize how tight your shoulders were until they let go.' },
        {
          label: '[{crew}] Have {crew} read their traffic',
          when: { crew: 'slicer' },
          effects: { news: 'Navy patrols are stretched thin along the inner lanes.' },
          result: '{crew} lists it off in a low voice: supply requests, a medical evacuation, a man asking after a woman on another ship. "They are as scared as we are," {crew} says. "They just get better food."'
        },
      ],
    }, 0.6, 45);

    road({
      id: 'road-old-radio',
      title: 'The Old Pilot',
      text: ('On a lane channel nobody listens to, a man with a voice like gravel in a tin cup is talking to no one in particular. He flew freight ' +
          'for forty years and retired to a habitat with a good radio. He is describing this exact stretch of lane as he remembers it, one hazard and ' +
          'one good joke at a time.'),
      choices: [
        { label: 'Listen for an hour', result: [
          'He knows things: which stretch of lane runs slow in a cold year, which stations water their coffee, which relay to trust when the main one dies.',
          { when: { crew: 'pilot' }, text: '{crew:pilot} takes notes, then admits, grudgingly, that a few of them are useful.' },
          'When he finally signs off he says, to no one, "Good burning." You find you would like to have known him.',
        ] },
        { label: 'Tell him a joke', result: 'There is a pause on the channel so long you think he has gone. Then a dry wheeze, and: "Well. That is a terrible joke." He tells you a worse one back, and you trade them all the way to the flip.' },
        { label: 'Mute the channel', result: 'You do, with a single tap. The old pilot\'s voice cuts off in the middle of a sentence. That night, in the dark, you turn it back on, low, and listen to the gravel and the jokes until you fall asleep.' },
      ],
    }, 0.3, 90);

    road({
      id: 'road-hull-ticks',
      title: 'Something in the Hull',
      text: 'It starts at the flip: a tick, a rest, a tick, like a fingernail on a pipe somewhere in the frame. Nobody can find it. The longer it goes, the more people start to hear it, and the less anyone jokes about it.',
      choices: [
        {
          label: '[{crew}] Have {crew} track it down',
          when: { crew: 'engineer' },
          result: 'It takes {crew} most of a shift with a stethoscope and a ridiculous amount of patience. A loose clamp on a coolant line. Thirty seconds to fix. {crew} comes out of the crawlspace looking at it like an old enemy defeated.'
        },
        { label: 'Put someone on watch and wait', effects: { do: ['hull', 0.05] }, result: 'The tick stops on its own near the end of the burn. It leaves a fine scratch along the inside of a bulkhead. Nobody finds out what it was.' },
        { label: 'Play something loud', result: 'You put the hit vid up full and everyone pretends to watch. Under it the ship goes on ticking. At the flip, when the whole ship shifts and groans, the tick stops, and nobody says why.' },
      ],
    }, 0.35, 75);

    road({
      id: 'road-prospector', when: { gov: ['Charter League', 'Independent'] },
      title: 'The Prospector',
      text: ('A single ship on a lonely rock, hailing on every band it has. The voice is a man working hard at being cheerful. He has a claim. He has ' +
          'assay results that make his voice crack when he reads them. What he does not have is water or food to last until the survey ship arrives. ' +
          '"Half a share," he says. "Just get me through the month."'),
      choices: [
        {
          label: 'Leave him supplies (5t of water and 5t of food)',
          when: { cargo: {
          water: 5,
          food: 5
        } },
          effects: {
          cargo: {
          water: -5,
          food: -5
        },
          do: [
          'gamble',
          0,
          0.5,
          {
          credits: 4000,
          log: 'Backed a prospector who struck it.'
        },
          'Weeks later, at the next port, a bank transfer catches up with you: four thousand credits and a one-word note, "Told you."',
          'You never hear from him again. The claim was good rock and bad luck, or the reverse, or he never existed at all.',
          {}
        ]
        },
          result: 'He thanks you four times, his voice breaking on the third, and is still thanking you when you drop out of range, thin and tinny, on a channel that is turning to static. You are gripping the console harder than you need to.'
        },
        { label: 'Give him what you can spare (2t of water)', when: { cargo: { water: 2 } }, effects: { cargo: { water: -2 }, rep: { 'Charter League': 1 } }, result: 'It is not half a share, and he knows it. There is a pause before he speaks. "That is very kind," he says. "I will remember it."' },
        { label: 'Wish him luck', result: 'He wishes you the same in a voice that has stopped trying so hard. You keep the channel open a while after, just in case. He does not use it.' },
      ],
    }, 0.4, 90);

    road({
      id: 'road-rival-trader',
      title: 'A Fellow Trader',
      text: 'A freighter about your size pulls alongside and hails on a private band. The captain\'s voice is wary and friendly. "Nobody is watching us and I am tired of guessing. I will tell you what the market is doing where I have been. You tell me where you have been. No cash."',
      choices: [
        { label: 'Trade honest information', effects: { rep: { 'Independent': 1 } }, result: [
          'You trade half an hour of prices, shortages, and gossip. It is more than either of you expected. When you break off, the other captain says, "Fair winds," and means it.',
          { when: { boom: 'Arcology Compact' }, text: 'They laugh at the news from Earth. "Boom times. Everybody\'s hiring."' },
        ] },
        {
          label: 'Tell them the least you can',
          result: 'You get a little back and give a little back: a shortage here, a rumor there, a name or two you would rather not have shared. When it is done the other captain says, "Safe burns." You answer in kind. Behind you the freighter\'s lights dim, one by one.'
        },
        { label: 'Decline and burn on', result: 'They wave it off with a light laugh. "Suit yourself," they say. Behind you the channel closes with a click.' },
      ],
    }, 0.4, 50);

    road({
      id: 'road-long-quiet', when: { day: 20 },
      title: 'The Long Quiet',
      text: [
        'Four days out, and nothing has happened. Nothing is going to happen. The plume is steady, the air is stale in the good way, and the ship has settled into the rhythm of a place where people live.',
        { when: { crew: 'kit' }, text: 'Kit is on watch with their boots up, whistling something off-key.' },
      ],
      choices: [
        { label: 'Walk the ship', result: 'You go compartment to compartment, slowly. A cup left half-full. A handwritten note taped to the coolant panel: "Please do not touch, ask Rosa." A pair of socks drying on a pipe. The ship is not just a machine. It is a house, and people are happy in it.' },
        { label: 'Sit with the stars', result: 'You take a mug of something hot to the observation blister and watch the black. A long time later you realize you have been thinking about nothing at all.' },
        { label: 'Check the books', result: 'You go through the accounts line by line, with a cup of tea gone cold at your elbow: a column of small hopes and larger bills. When you close the book, the numbers are the same. You sleep that night.' },
      ],
    }, 0.2, 40);
  },
});
