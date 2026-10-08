'use strict';

// The Ice Haulers' Strike: a short storyline written entirely as storylets (data,
// no code), and a worked example for writing your own. The quality `strike` tracks
// how far you have thrown in with the Guild; `crates` is set while you carry their
// medical supplies; `strikeDone` ends the storyline. How it ends depends on the
// living world when you reach Pallas: war, a Belt boom, or a deadlock.

Mods.register({
  id: 'ice-strike', name: "The Ice Haulers' Strike", builtin: true,
  init(M) {
    if (scopeOff('storylines')) return;  // not in this build (js/build.js)
    const crates = 'Guild medical crates';

    M.addStorylet({
      id: 'strike-broadcast', where: 'transit', priority: 1,
      when: { day: 12, gov: 'Charter League', qBelow: { strike: 1, scab: 1 }, chance: 0.5 },
      title: 'Picket Line on the Band',
      text: ('The comms catch a broadcast on a pirate band, but it is not pirates: it is the Ice Haulers\' Guild. A woman\'s voice, tired and ' +
          'precise, is reading a list of names into the static, crews who have walked off their ships over tariffs, cut shifts, and a pay cap that has ' +
          'not moved in eleven years. Behind her you can hear people cheering. "This is Dana Oyelaran, for the Guild. We are asking independent ' +
          'captains to stay off Compact water contracts, and to chip in to the strike fund. We cannot do this without you. Water does not haul ' +
          'itself."'),
      choices: [
        { label: 'Send 2,000 cr to the strike fund', when: { credits: 2000 },
          effects: { credits: -2000, q: { strike: 2 }, rep: { 'Charter League': 3, 'Arcology Compact': -2 }, log: "Gave 2,000 cr to the Ice Haulers' strike fund." },
          result: ('The transfer goes through in a moment, and a reply comes back within the hour, in the same tired, precise voice: "We won\'t ' +
              'forget it. Every credit is a shift somebody does not have to work hungry. Look me up on Ceres, captain. I would like to shake your ' +
              'hand." Later that evening, a second message, unsigned, just a single drop of water in ASCII, and nothing else.') },
        { label: 'Note the frequency and stay out of it', effects: { q: { strike: 1 } },
          result: ('You note the frequency in the log, and the position, and the exact wording of the appeal. You are not sure why. The broadcast ' +
              'repeats twice more before you drop out of range, and by the last time you find you know the list of names by heart. Somebody on Ceres ' +
              'will want to hear that.') },
        { label: 'Report the broadcast to Compact customs',
          effects: { q: { scab: 1 }, rep: { 'Arcology Compact': 4, 'Charter League': -3 }, log: "Reported the Ice Haulers' Guild broadcast to Compact customs." },
          result: ('A customs officer thanks you in a flat, bored voice and logs the frequency without comment. It takes twelve minutes. It costs you ' +
              'a great deal more than that: for weeks afterwards, Belter channels go quiet whenever your transponder comes up, and a dock hand at ' +
              'Ceres turns her back on you, slowly and deliberately, as you walk past.') },
      ],
    });

    M.addStorylet({
      id: 'strike-ceres', where: 'port', priority: 2,
      when: { planet: 'Ceres Station', q: { strike: 1 }, qBelow: { scab: 1, strikeDone: 1 } },
      title: 'Dana Oyelaran',
      text: ('A woman in a Guild jacket finds you in the docking ring, weaving through the crowd with the practiced ease of someone who has learned ' +
          'to be unremarkable: Dana Oyelaran, shorter than her voice, with ink on her fingers and dark, patient eyes. She waits until the corridor ' +
          'thins. "Strikers\' families on Pallas are short of medicine. Insulin, antibiotics, a few things for the babies. Compact customs holds ' +
          'anything flagged for the Guild, and has for a month. I need a ship nobody is watching to carry eight tons of medical crates to Pallas ' +
          'Refinery. I cannot pay you what it is worth."'),
      choices: [
        { label: 'Carry them (8t, pays 3,000 cr)', when: { space: 8 },
          effects: { set: { crates: 1 }, log: 'Agreed to carry medical crates to Pallas for the Guild.',
            mission: { to: 'Pallas Refinery', tons: 8, good: crates, pay: 3000, days: 25, title: 'Carry Guild medical crates to Pallas Refinery',
              onDone: { q: { strike: 2 }, set: { crates: 0 }, log: "Delivered the Guild's medical crates to Pallas." },
              onFail: { q: { strike: -5 }, set: { crates: 0 }, rep: { 'Charter League': -5 }, log: 'The Guild crates never reached Pallas.' } } },
          result: ('"Twenty-five days," she says. "After that the kids stop waiting." She does not thank you, exactly. She hands you a ticket stub ' +
              'with the pickup berth scribbled on it, and shakes your hand, hard, like a promise. The crates are loaded before your coffee is cold, by ' +
              'a line of silent Guild workers who do not meet your eye and do not need to.') },
        { label: 'Carry them for free (8t)', when: { space: 8 },
          effects: { set: { crates: 1 }, log: 'Agreed to carry medical crates to Pallas for the Guild, for free.',
            mission: { to: 'Pallas Refinery', tons: 8, good: crates, pay: 0, days: 25, title: 'Carry Guild medical crates to Pallas Refinery (unpaid)',
              onDone: { q: { strike: 3 }, set: { crates: 0 }, rep: { 'Charter League': 5 }, log: "Delivered the Guild's medical crates to Pallas, free of charge." },
              onFail: { q: { strike: -5 }, set: { crates: 0 }, rep: { 'Charter League': -5 }, log: 'The Guild crates never reached Pallas.' } } },
          result: ('Dana looks at you for a long moment, and something in her hard, tired face shifts. Then she shakes your hand, slowly, in both of ' +
              'hers. "Word gets around," she says quietly. "Belters are terrible at forgetting a kindness, captain. You are going to find that out." ' +
              'Behind her, the loaders have stopped and are watching. One of them, an old man with a gaunt face, touches two fingers to his forehead.') },
        { label: 'Not my fight', effects: { set: { strikeDone: 1 } },
          result: '"Fair," she says, and means the opposite. She does not argue, and she does not plead: she nods once, like a woman ticking off a name, and turns away into the crowd. You watch her go until she is a jacket among jackets. You finish your drink slowly. It tastes of metal.' },
      ],
    });

    M.addStorylet({
      id: 'strike-customs', where: 'transit', priority: 2,
      when: { at: 'pallas', q: { crates: 1 } },
      title: 'Customs Cutter',
      text: ('A Compact customs cutter drops out of the dark and matches your burn a few kilometers outside Pallas, gun ports open, searchlights ' +
          'sweeping your hull. A voice, professional and bored: "Independent vessel, this is a routine inspection. Cut your drive and prepare to be ' +
          'boarded." Down in the hold, the Guild crates sit strapped to the deck, marked with a red cross, and every one of them is a small quiet ' +
          'crime.'),
      choices: [
        { label: '{crew} spoofs the manifest', when: { crew: 'slicer' },
          effects: { q: { strike: 1 } },
          result: ('Your manifest now lists eight tons of hydroponics substrate, with a full chain of custody, a stamp from a very real Ganymede ' +
              'farm, and a small joke about compost that you would have missed if you were not looking. The inspector skims it, yawns, and waves you ' +
              'on, bored. As the cutter falls away, {crew} lets out a breath and says, quietly, "I have always wanted to write a lie that boring."') },
        { label: 'Pay them to look elsewhere (1,500 cr)', when: { credits: 1500 },
          effects: { credits: -1500 },
          result: ('The transfer goes through with a small, discreet chime. The inspector reads the manifest for exactly as long as it takes to look ' +
              'busy, and declares your hold remarkably uninteresting. "Safe burn, captain," he says, in the tone of a man who has done this before, ' +
              'and the searchlights click off, one by one.') },
        { label: 'Let them board', effects: { cancelMission: crates, rep: { 'Arcology Compact': 1 } },
          result: ('They find the crates in ten minutes, and they take them in twenty, in neat efficient lines, the little red crosses passing hand ' +
              'to hand. The inspector thanks you for your cooperation, and means it, which is somehow the worst part. You think about the families on ' +
              'Pallas the whole way in, and about how tidy the whole thing was.') },
        { label: 'Run for it', effects: { rep: { 'Arcology Compact': -8 }, q: { strike: 1 } },
          result: ('You slam the drive to its stops and the cutter\'s searchlights slide off your hull. For eleven long minutes it is a flat-out ' +
              'chase, weaving through the ore haulers and the dust of a thousand tons of rock, with the cutter\'s voice shouting on the open band. ' +
              'Then you are lost among the traffic, and the voice goes quiet. They will have logged your transponder. They will not forget.') },
      ],
    });

    const done = { set: { strikeDone: 1 } };
    const ending = { where: 'port', priority: 3, title: 'The Picket at Pallas' };  // war outranks boom outranks deadlock

    M.addStorylet({
      ...ending, id: 'strike-end-war', priority: 5,
      when: { planet: 'Pallas Refinery', q: { strike: 4 }, qBelow: { strikeDone: 1 }, war: 'Charter League' },
      text: ('The war has swallowed the strike. The Guild voted to go back to work hauling for the League\'s navy, on the Guild\'s terms, and the ' +
          'picket line at Pallas is coming down, banner by banner. Dana Oyelaran is on the ladder one last time, unpinning a hand-lettered sign that ' +
          'says NO WATER WITHOUT JUSTICE. The paint has faded. She climbs down slowly, like a woman much older than she is. "We didn\'t win," she ' +
          'says. "We just stopped losing. I will take it."'),
      choices: [{ label: 'Help take down the line', effects: { ...done, rep: { 'Charter League': 8 }, credits: 5000, log: 'The Ice Haulers\' strike ended in the war effort.', news: 'The Ice Haulers\' Guild ends its strike to haul for the Charter League\'s war effort.' },
        result: ('You hold the ladder, and fold the banners, and carry the folding tables out to the trucks, and nobody says much. When it is done, ' +
            'the Guild pays you a share of the strike fund you helped fill: 5,000 cr, in a battered envelope, and a handful of the old, tired haulers ' +
            'come to shake your hand. The League, you realize, has just decided that it remembers your name.') }],
    });

    M.addStorylet({
      ...ending, id: 'strike-end-win', priority: 4,
      when: { planet: 'Pallas Refinery', q: { strike: 4 }, qBelow: { strikeDone: 1 }, boom: 'Charter League' },
      text: ('With the Belt booming, every hauler is worth their weight in water, and Aquilon has caved: tariffs cut, shifts restored, a back-pay ' +
          'clause that made the Guild lawyers cry. The picket line at Pallas has turned into a party, a long noisy tangle of tables and lanterns and ' +
          'children on shoulders, and somebody has strung a banner that reads WE HAULED IT. Dana Oyelaran finds you in the crush and hands you a bulb ' +
          'of something that is technically not fuel.'),
      choices: [{ label: 'Drink to the Guild',
      effects: {
        ...done,
        rep: {
        'Charter League': 10,
        'Arcology Compact': -3
      },
        credits: 8000,
        unrest: {
        ceres: -0.2,
        pallas: -0.2
      },
        log: 'The Ice Haulers\' strike won.',
        news: 'Aquilon Hydrologics concedes to the Ice Haulers\' Guild. The strike is over.'
      },
        result: ('It burns all the way down, and you will not remember the toast you gave. "You were there when it counted," Dana says, and her voice ' +
            'is not steady. The Guild votes you a share of the fund: 8,000 cr, and an honorary membership that comes with a pin and a very tired ' +
            'handshake. For weeks afterward, haulers on the Belt lanes flash their running lights at you, in a slow blink, as they pass.') }],
    });

    M.addStorylet({
      ...ending, id: 'strike-end-deadlock',
      when: { planet: 'Pallas Refinery', q: { strike: 4 }, qBelow: { strikeDone: 1 }, peace: 'Charter League' },
      text: ('The strike is deadlocked. Aquilon is hauling with scab crews from Earth at a loss, the Guild is running out of fund, and Dana Oyelaran ' +
          'looks like she has not slept in a week. The picket line at Pallas is thinner than it was: fewer banners, more empty chairs. She is drinking ' +
          'cold tea from a dented cup, and she does not sit down when you come in. "Five thousand more and we outlast them," she says, and then, more ' +
          'quietly, "I know what I\'m asking. I know exactly what it is."'),
      choices: [
        { label: 'Put in 5,000 cr', when: { credits: 5000 },
          effects: { ...done, credits: -5000, rep: { 'Charter League': 10, 'Arcology Compact': -3 }, log: 'Funded the Ice Haulers\' strike through to a win.', news: 'Aquilon Hydrologics concedes to the Ice Haulers\' Guild after a long deadlock.' },
          result: ('The credits go across, and the line grows. New banners appear, and the tired faces look up. Eleven days later, Aquilon caves, all ' +
              'at once, the way a wall falls after years of leaning. Dana sends a one-line message, in the same tired, precise voice: "Told you." Then ' +
              'a second: "Thank you." The Belt remembers who paid.') },
        { label: 'Wish her luck', effects: { ...done, log: 'Left the Ice Haulers\' strike deadlocked.' },
          result: ('"Luck," she says. "Right." She gives you a small, gentle smile, the smile of a woman who has been told no by better people than ' +
              'you. The strike collapses a month later, without a bang, the banners folded away, the crews trickling back to their ships one by one. ' +
              'Nobody on Pallas mentions it to you again, and when you pass the old picket line, someone has painted over the sign.') },
      ],
    });
  },
});
