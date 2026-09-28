'use strict';

// The Ice Haulers' Strike: a short storyline written entirely as storylets (data,
// no code), and a worked example for writing your own. The quality `strike` tracks
// how far you have thrown in with the Guild; `crates` is set while you carry their
// medical supplies; `strikeDone` ends the storyline. How it ends depends on the
// living world when you reach Pallas: war, a Belt boom, or a deadlock.

Mods.register({
  id: 'ice-strike', name: "The Ice Haulers' Strike", builtin: true,
  init(M) {
    const crates = 'Guild medical crates';

    M.addStorylet({
      id: 'strike-broadcast', where: 'transit', priority: 1,
      when: { day: 12, gov: 'Belt Collective', qBelow: { strike: 1, scab: 1 }, chance: 0.5 },
      title: 'Picket Line on the Band',
      text: 'The comms catch a broadcast on a pirate band, but it is not pirates: it is the Ice Haulers\' Guild. Crews hauling water for Aquilon and the Coalition are walking off the job over tariffs and cut shifts. Organizer Dana Oyelaran asks independent captains to stay off Coalition water contracts, and to chip in to the strike fund.',
      choices: [
        { label: 'Send 2,000 cr to the strike fund', when: { credits: 2000 },
          effects: { credits: -2000, q: { strike: 2 }, rep: { 'Belt Collective': 3, 'Earth Coalition': -2 }, log: "Gave 2,000 cr to the Ice Haulers' strike fund." },
          result: 'A reply comes back within the hour, signed Dana Oyelaran: "We won\'t forget it. Look me up on Ceres."' },
        { label: 'Note the frequency and stay out of it', effects: { q: { strike: 1 } },
          result: 'You note the frequency. Somebody on Ceres will know it.' },
        { label: 'Report the broadcast to Coalition customs',
          effects: { q: { scab: 1 }, rep: { 'Earth Coalition': 4, 'Belt Collective': -3 }, log: "Reported the Ice Haulers' Guild broadcast to Coalition customs." },
          result: 'A customs officer thanks you in a flat voice. For a while, Belter channels go quiet whenever your transponder comes up.' },
      ],
    });

    M.addStorylet({
      id: 'strike-ceres', where: 'port', priority: 2,
      when: { planet: 'Ceres Station', q: { strike: 1 }, qBelow: { scab: 1, strikeDone: 1 } },
      title: 'Dana Oyelaran',
      text: 'A woman in a Guild jacket finds you in the docking ring: Dana Oyelaran, shorter than her voice. "Strikers\' families on Pallas are short of medicine. Coalition customs holds anything flagged for the Guild. I need a ship nobody is watching to carry eight tons of medical crates to Pallas Refinery."',
      choices: [
        { label: 'Carry them (8t, pays 3,000 cr)', when: { space: 8 },
          effects: { set: { crates: 1 }, log: 'Agreed to carry medical crates to Pallas for the Guild.',
            mission: { to: 'Pallas Refinery', tons: 8, good: crates, pay: 3000, days: 25, title: 'Carry Guild medical crates to Pallas Refinery',
              onDone: { q: { strike: 2 }, set: { crates: 0 }, log: "Delivered the Guild's medical crates to Pallas." },
              onFail: { q: { strike: -5 }, set: { crates: 0 }, rep: { 'Belt Collective': -5 }, log: 'The Guild crates never reached Pallas.' } } },
          result: '"Twenty-five days," she says. "After that the kids stop waiting." The crates are loaded before your coffee is cold.' },
        { label: 'Carry them for free (8t)', when: { space: 8 },
          effects: { set: { crates: 1 }, log: 'Agreed to carry medical crates to Pallas for the Guild, for free.',
            mission: { to: 'Pallas Refinery', tons: 8, good: crates, pay: 0, days: 25, title: 'Carry Guild medical crates to Pallas Refinery (unpaid)',
              onDone: { q: { strike: 3 }, set: { crates: 0 }, rep: { 'Belt Collective': 5 }, log: "Delivered the Guild's medical crates to Pallas, free of charge." },
              onFail: { q: { strike: -5 }, set: { crates: 0 }, rep: { 'Belt Collective': -5 }, log: 'The Guild crates never reached Pallas.' } } },
          result: 'Dana looks at you for a long moment, then shakes your hand. "Word gets around," she says.' },
        { label: 'Not my fight', effects: { set: { strikeDone: 1 } },
          result: '"Fair," she says, and means the opposite. She is gone before you finish your drink.' },
      ],
    });

    M.addStorylet({
      id: 'strike-customs', where: 'transit', priority: 2,
      when: { at: 'pallas', q: { crates: 1 } },
      title: 'Customs Cutter',
      text: 'A Coalition customs cutter matches your burn outside Pallas. "Independent vessel, this is a routine inspection. Cut your drive and prepare to be boarded."',
      choices: [
        { label: '{crew} spoofs the manifest', when: { crew: 'slicer' },
          effects: { q: { strike: 1 } },
          result: 'Your manifest now lists eight tons of hydroponics substrate. The inspector skims it and waves you on, bored.' },
        { label: 'Pay them to look elsewhere (1,500 cr)', when: { credits: 1500 },
          effects: { credits: -1500 },
          result: 'The inspector pockets the transfer and finds your hold remarkably uninteresting.' },
        { label: 'Let them board', effects: { cancelMission: crates, rep: { 'Earth Coalition': 1 } },
          result: 'They find the crates in ten minutes and take them in twenty. The inspector thanks you for your cooperation.' },
        { label: 'Run for it', effects: { rep: { 'Earth Coalition': -8 }, q: { strike: 1 } },
          result: 'You burn hard for the Pallas traffic lanes and lose them in the ore haulers. They will have logged your transponder.' },
      ],
    });

    const done = { set: { strikeDone: 1 } };
    const ending = { where: 'port', priority: 3, title: 'The Picket at Pallas' };  // war outranks boom outranks deadlock

    M.addStorylet({
      ...ending, id: 'strike-end-war', priority: 5,
      when: { planet: 'Pallas Refinery', q: { strike: 4 }, qBelow: { strikeDone: 1 }, war: 'Belt Collective' },
      text: 'The war has swallowed the strike. The Guild voted to go back to work hauling for the Collective\'s navy, on the Guild\'s terms. Dana Oyelaran is on the picket line one last time, taking it down. "We didn\'t win," she says. "We just stopped losing."',
      choices: [{ label: 'Help take down the line', effects: { ...done, rep: { 'Belt Collective': 8 }, credits: 5000, log: 'The Ice Haulers\' strike ended in the war effort.', news: 'The Ice Haulers\' Guild ends its strike to haul for the Belt Collective\'s war effort.' },
        result: 'The Guild pays you a share of the strike fund you helped fill: 5,000 cr, and the Collective remembers your name.' }],
    });

    M.addStorylet({
      ...ending, id: 'strike-end-win', priority: 4,
      when: { planet: 'Pallas Refinery', q: { strike: 4 }, qBelow: { strikeDone: 1 }, boom: 'Belt Collective' },
      text: 'With the Belt booming, every hauler is worth their weight in water, and Aquilon has caved: tariffs cut, shifts restored. The picket line has turned into a party. Dana Oyelaran hands you a bulb of something that is technically not fuel.',
      choices: [{ label: 'Drink to the Guild', effects: { ...done, rep: { 'Belt Collective': 10, 'Earth Coalition': -3 }, credits: 8000, unrest: { ceres: -0.2, pallas: -0.2 }, log: 'The Ice Haulers\' strike won.', news: 'Aquilon Hydrologics concedes to the Ice Haulers\' Guild. The strike is over.' },
        result: '"You were there when it counted," Dana says. The Guild votes you a share of the fund: 8,000 cr. Haulers on the Belt lanes flash their running lights at you for weeks.' }],
    });

    M.addStorylet({
      ...ending, id: 'strike-end-deadlock',
      when: { planet: 'Pallas Refinery', q: { strike: 4 }, qBelow: { strikeDone: 1 }, peace: 'Belt Collective' },
      text: 'The strike is deadlocked. Aquilon is hauling with scab crews from Earth at a loss, the Guild is running out of fund, and Dana Oyelaran looks like she has not slept in a week. "Five thousand more and we outlast them," she says. "I know what I\'m asking."',
      choices: [
        { label: 'Put in 5,000 cr', when: { credits: 5000 },
          effects: { ...done, credits: -5000, rep: { 'Belt Collective': 10, 'Earth Coalition': -3 }, log: 'Funded the Ice Haulers\' strike through to a win.', news: 'Aquilon Hydrologics concedes to the Ice Haulers\' Guild after a long deadlock.' },
          result: 'Eleven days later, Aquilon caves. Dana sends a one-line message: "Told you." The Belt remembers who paid.' },
        { label: 'Wish her luck', effects: { ...done, log: 'Left the Ice Haulers\' strike deadlocked.' },
          result: '"Luck," she says. "Right." The strike collapses a month later, and nobody on Pallas mentions it to you again.' },
      ],
    });
  },
});
