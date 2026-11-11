'use strict';

// The Ice Haulers' Strike, for the hand (#1044, docs/bible/chapter-1.md): the Belt's ice haulers stop hauling against the price the buyers at Ceres pay, and
// Hester's ship hauls ice between contracts. The hand can stand with it (ask the captain to keep the ship off the ice for the month), carry for it (the Guild's
// crates in the hold, under a tarp, against her insurer's terms), keep out of it, or cross it for the buyers' bonus. How it ends is the world's, on the strike's
// own dice, tipped by what the hand did: the Guild wins, it deadlocks, or it breaks.
// Qualities: `strikeOn` (the broadcast heard; the strike runs until `due:strike-end`), `strike` (the weight the hand has put in, for or against), `strikeAsked`,
// `strikeHold` (the captain keeps the ship off the ice, read by icerun.js iceOption), `strikeCarry` and `strikeCarried` (the crates aboard and landed),
// `strikeFound` (the captain found them), `scab`, `strikeDone`. Who remembers the ship: `markGuild` (1 with it, -1 crossed it) and `markKaur` (Kaur's buying office
// noticed the ship's name). The organiser is Mirela Sandoval, the Guild's at Ceres; she talks in tonnes, days and who is owed, and never asks twice.
// The old strike (the owner's, in git history before #1044) is the source this was checked against, not copied from.

// How the strike ends: the strike's own roll (0 to 1, drawn from the run's facts by strikeRoll, so no other system's dice move), tipped a tenth for each point of the
// weight the hand put in (`strike`, held to -3..5). The Guild wins from 0.7, it breaks under 0.3, and between them it deadlocks.
const strikeRoll = h => (Math.abs(hash(`strike|${h ? h.captain : ''}|${h ? h.since : 0}`)) % 1000) / 1000;
const strikeEnd = (roll, weight) => { const score = roll + Math.max(-3, Math.min(5, weight)) * 0.1; return score >= 0.7 ? 'won' : score < 0.3 ? 'broke' : 'held'; };

Mods.register({
  id: 'ice-strike', name: "The Ice Haulers' Strike", builtin: true,
  init(M) {
    // The end (strikeEnd, above): the three ends are written in the data below, each with its effects and its words.
    // A captain who kept the ship off the ice for it has a stake in how it ends (#1060): her words and her regard, from the end's `kept`, in chapter one only (in
    // chapter two the captain who kept the ship off the ice is not aboard).
    M.addAction('strike-settle', (won, held, broke) => {
      const end = { won, held, broke }[strikeEnd(strikeRoll(hired()), quality('strike'))];
      const kept = end.kept && quality('strikeHold') && chapterOf(G.state) === 1 && hiredCaptain() ? end.kept : null;
      applyEffects(end.effects);
      if (kept) applyEffects(kept.effects);
      return kept ? `${end.say} ${kept.say}` : end.say;
    });

    M.addStorylet({
      id: 'strike-broadcast', where: 'transit', priority: 1,
      when: { day: 20, gov: 'Guild Federation', hired: true, qBelow: { strikeOn: 1 }, chance: 0.5 },
      title: 'On the Band',
      text: ('The relay batch comes in at the change of watch, and in it, under the freight notices, is a recording off the open band. It is the Ice Haulers\' Guild. ' +
          'A woman reads it in a flat Ceres voice, the way the freight rates are read. "The buyers at Ceres pay what they paid a tonne four years ago. Fuel is up a ' +
          'third in that time. From the first, Guild hulls haul no ice to Ceres until the price is talked about. We are asking every hull in the Belt that hauls ice ' +
          'to do the same. This is Mirela Sandoval, for the Guild." The batch moves on to the dock schedules.'),
      choices: [
        { label: 'Write the frequency down',
          effects: { q: { strikeOn: 1, strike: 1 }, later: { 'strike-end': 30 }, log: 'Heard the Ice Haulers\' Guild call its strike, and wrote down the band.' },
          result: 'You write it on the back of the watch sheet: the band, the day, the name. The captain\'s ship hauls ice between contracts. Everyone on the bridge knows it, and nobody says it.' },
        { label: 'Let the batch run on',
          effects: { q: { strikeOn: 1 }, later: { 'strike-end': 30 }, log: 'Heard the Ice Haulers\' Guild call its strike.' },
          result: 'The dock schedules come up, and then a notice about berth fees at Juno. By the end of the watch the strike is in the galley, and the deckhands have the price a tonne to the credit.' },
      ],
    });

    M.addStorylet({
      id: 'strike-ceres', where: 'port', priority: 2,
      when: { planet: 'Ceres Station', hired: true, q: { strikeOn: 1 }, qBelow: { strikeAsked: 1, strikeDone: 1 } },
      title: 'Mirela Sandoval',
      text: ('Mirela Sandoval is at the foot of the ramp before the lock has finished cycling, a short woman in a Guild jacket with the cuffs gone through. She has ' +
          'the ship\'s registry on her slate and the ice it has hauled this year under it. "Your captain runs ice between contracts," she says. "So you know what ' +
          'the buyers pay. I am not asking you to stop the ship. That is not yours to stop." She looks at the hold doors. "I am asking what you will do."'),
      choices: [
        { label: 'Say you will ask the captain to stay off the ice', next: 'strike-captain',
          effects: { q: { strikeAsked: 1, strike: 1 }, log: 'Told the Guild\'s organiser at Ceres I would ask the captain to keep the ship off the ice.' },
          result: '"Ask her in figures," Mirela says. "She will answer in them." She writes the ship\'s name on her slate, and a day beside it, and goes up the dock to the next ramp.' },
        { label: 'Say you will carry for the Guild',
          effects: { q: { strikeAsked: 1, strikeCarry: 1, strike: 2, markGuild: 1, markKaur: 1 }, log: 'Took the Guild\'s crates aboard at Ceres, under a tarp in the hold.' },
          result: ('Three crates come up the ramp on a Guild sled after the shift change: formula, insulin, scrubber filters, for the families of the hulls that have ' +
              'stopped. Two tonnes, a bit over. You lash them behind the water tank and put a tarp over them. It is against the insurer\'s terms, and the captain ' +
              'counts the mass at every undock. Mirela says they come off at the next Belt dock you make, and that someone will be waiting.') },
        { label: 'Say it is not your fight',
          effects: { q: { strikeAsked: 1 }, log: 'Told the Guild\'s organiser at Ceres the strike was not my fight.' },
          result: '"It is everyone\'s fight who drinks water," Mirela says, "but I take your point." She does not write anything down. She goes up the dock to the next ramp.' },
        { label: 'Say the ship hauls, and take the buyers\' bonus',
          effects: { credits: 600, q: { strikeAsked: 1, scab: 1, strike: -3, markGuild: -1 }, log: 'Took the buyers\' bonus for hauling ice to Ceres through the strike.' },
          result: ('The buyers\' office pays hands on a hull that hauls through the strike a day\'s bonus, 600, and the clerk counts it out at the counter without ' +
              'looking up. Mirela is still at the foot of the ramp when you come back. She has your name on her slate. She does not say anything about it.') },
      ],
    });

    M.addStorylet({
      id: 'strike-captain', where: 'port', chained: true, priority: 2,
      title: 'In Figures',
      text: ('The captain has the paper notebook open on the galley table, and she does not close it. "Ice is a third of what we clear this quarter," she says. "The ' +
          'charter is due on the first, whatever the buyers pay. A month off the ice is a payment I make out of the next quarter, and the house reads the books." ' +
          'She turns the notebook round so you can see the column. "Ask me, then."'),
      choices: [
        { label: 'Ask her with Cato beside you', when: { opinion: { who: 'xo', min: 3 } },
          effects: { q: { strikeHold: 1, strike: 2, markGuild: 1, markKaur: 1 }, captainLike: { n: -1, memory: 'You and the bosun asked me to keep the ship off the ice for the strike.' },
            log: 'Asked the captain, with Cato, to keep the ship off the ice for the strike. She did.' },
          result: ('Cato sits down across from her and puts his tea on the notebook, on the column. "A month," he says. "We have done worse months." The captain ' +
              'looks at the cup for a while. Then she moves it, and writes a line under the column, and the day. "Contracts only, until it is settled," she says. ' +
              '"I am writing down what it costs."') },
        { label: 'Ask her yourself', when: { opinion: { who: 'captain', min: 3 } },
          effects: { q: { strikeHold: 1, strike: 2, markGuild: 1, markKaur: 1 }, captainLike: { n: -1, memory: 'You asked me to keep the ship off the ice for the strike.' },
            log: 'Asked the captain to keep the ship off the ice for the strike. She did.' },
          result: ('She hears it out without a word, and does the sum again with the pencil, and gets the same figure. "Contracts only, until it is settled," she ' +
              'says. "Your wage is the same. The ice pay is not." She writes the day under the column.') },
        { label: 'Ask her',
          effects: { log: 'Asked the captain to keep the ship off the ice for the strike. She said no.' },
          result: ('"No," the captain says. "Not because they are wrong. Because the house is not on strike." She closes the notebook. "We haul what we are paid to ' +
              'haul. Go and eat something."') },
      ],
    });

    M.addStorylet({
      id: 'strike-tarp', where: 'transit', priority: 2,
      when: { hired: true, q: { strikeCarry: 1 }, qBelow: { strikeCarried: 1, strikeFound: 1, strikeDone: 1 }, chance: 0.35 },
      title: 'The Mass at Undock',
      text: ('The captain comes up the ladder from the hold with the manifest on her slate and the tarp folded over her arm. "Two point three tonnes over at ' +
          'undock," she says. "I wondered where." She puts the tarp on the galley table, square. "The insurer does not cover cargo that is not on the manifest. ' +
          'Neither do I."'),
      choices: [
        { label: 'Tell her what is in the crates',
          effects: { credits: -300, set: { strikeFound: 1 }, captainLike: { n: -1, memory: 'You carried the Guild\'s crates in my hold and told me when I asked.' },
            log: 'The captain found the Guild\'s crates in the hold. I told her what they were.' },
          result: ('"Formula," she says. "Insulin." She writes it on the manifest, as your own kit, and the mass under it. "Two tonnes of mass is fuel, and fuel ' +
              'comes out of your pay. They come off at the next dock. Nothing else goes under a tarp on my ship."') },
        { label: 'Say they are yours',
          effects: { credits: -300, set: { strikeFound: 1 }, captainLike: { n: -2, memory: 'You told me the Guild\'s crates in my hold were yours.' },
            log: 'The captain found the Guild\'s crates in the hold. I said they were mine.' },
          result: ('"Then they are your kit," the captain says, "and your mass, and your fuel." She writes it down as exactly that, and the figure, and does not ' +
              'look up while she does. "They have the Guild\'s stencil on them. I can read."') },
      ],
    });

    M.addStorylet({
      id: 'strike-landed', where: 'port', priority: 2,
      when: { gov: 'Guild Federation', hired: true, q: { strikeCarry: 1 }, qBelow: { strikeCarried: 1, strikeDone: 1 } },
      title: 'Off at the Lock',
      text: ('A Guild sled is waiting at the lock after the shift change, with two people on it who do not give their names. The crates come off in the time ' +
          'it takes to undo the lashings. One of them reads the stencils against a list and ticks them. Nobody signs for anything.'),
      choices: [
        { label: 'Help them load the sled',
          effects: { q: { strikeCarried: 1, strike: 1 }, log: 'Landed the Guild\'s crates for the families of the hulls on strike.' },
          result: 'The sled goes off up the dock with the crates on it and the tarp folded on top. The one with the list comes back for the tarp, and then leaves it with you. "You will want it," she says.' },
      ],
    });

    M.addStorylet({
      id: 'strike-end', where: 'port', priority: 3, consumes: 'strike-end',
      when: { gov: 'Guild Federation', hired: true, due: 'strike-end', q: { strikeOn: 1 }, qBelow: { strikeDone: 1 } },
      title: 'The Guild Calls the Hulls In',
      text: ('The Guild calls the hulls in on the open band at the shift change, and on the dock everyone stops what they are doing to hear it. Mirela Sandoval ' +
          'reads it. She reads it the way she read the call, flat, with the figures first.'),
      choices: [
        { label: 'Listen',
          effects: { do: ['strike-settle',
            { effects: { unrest: { ceres: -0.1 }, price: { 'Ceres Station': { water: 0.1 } }, news: 'Ceres: the ice buyers raise the price a tonne by a tenth, and the Ice Haulers\' Guild ends its strike.',
              log: 'The Ice Haulers\' strike won: the buyers at Ceres raised the price a tonne.' },
              kept: { effects: { captainLike: { n: 2, memory: 'You asked me to keep the ship off the ice for the strike, and the price went up on it.' } },
                say: 'Captain Vance writes the new price a tonne in the notebook, under the old one, and does the sum for a quarter of ice runs at it. She shows you the figure without saying anything.' },
              say: ('"The buyers have raised the price a tonne by a tenth, from the first," Mirela says. "Guild hulls haul from tomorrow." On the dock nobody cheers. ' +
                'A hauler by the rail says the new figure under his breath, and then works it out per run, and says that.') },
            { effects: { news: 'Ceres: the Ice Haulers\' Guild goes back to work at the old price, on the buyers\' word of a review.',
              log: 'The Ice Haulers\' strike ended without a raise: the haulers went back on the buyers\' word of a review.' },
              say: ('"The buyers have agreed to a review of the price in the spring," Mirela says. "Guild hulls haul from tomorrow, at the old price." She stops, and ' +
                'then she reads the date of the review again, as if somebody might write it down. Somebody does.') },
            { effects: { unrest: { ceres: 0.1 }, news: 'Ceres: the Ice Haulers\' strike ends. Guild hulls go back at a twentieth less a tonne.',
              log: 'The Ice Haulers\' strike broke: the haulers went back for less.' },
              kept: { effects: { captainLike: { n: -1, memory: 'You asked me to keep the ship off the ice for a strike that broke.' } },
                say: 'Captain Vance writes the month in the notebook and draws a line through it, and then the new price under it, a twentieth less.' },
              say: ('"Guild hulls haul from tomorrow," Mirela says, "at a twentieth less a tonne, which is what the buyers offered the hulls that went back first." ' +
                'She reads out the names of those hulls, all of them, at the same pace as the rest.') },
          ], set: { strikeDone: 1, strikeHold: 0 } },
          result: '' },
      ],
    });
  },
});
