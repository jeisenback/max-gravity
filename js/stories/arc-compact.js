'use strict';

// The license inspection at Luna (#683): a mission arc hung on the Compact Freight Office (js/arcs.js). The Office has a notice of inspection for Dag Ibarra, a master rigger who has
// worked Bay Nine at the Luna yards on a license that lapsed in the spring, and would rather it did not go by the relay, where the whole yard would read it. Petra Lindqvist, the
// licensing officer, comes down for the inspection herself. Qualities: `compact` (begun), `compactSide` (from 2 the hand told the inspector what they saw: the license is issued).
// The notice leads into the inspection if the hand stays for it; the end plays at Earth (the hand spoke: the carrier license) or at Luna (not: the riggers' fee) when the hand next comes.
// Petra speaks in kindnesses and what would be convenient, and never says no; Dag speaks in hulls and years, loudly, and finishes his jokes.

Mods.register({
  id: 'arc-compact', name: 'The license inspection', builtin: true,
  init(M) {
    // The words each action keeps for a person are the scene's, passed in from the data below.
    // The hand who said the bay was idle: the inspector minds that.
    M.addAction('compact-lie', memory => { like(arcPerson('petra'), -2, memory); return ''; });
    // The license: a person, a regard and an item.
    M.addAction('compact-license', memory => { like(arcPerson('petra'), 2, memory); moveStanding('the Compact Freight Office', 1); return addKit('carrier-license'); });
    // The fee: Dag warms, and the Office cools.
    M.addAction('compact-fee', (forDag, forPetra) => { like(arcPerson('dag'), 2, forDag); like(arcPerson('petra'), -1, forPetra); return ''; });

    M.addStorylet({
      id: 'compact-notice', where: 'port', chained: true, priority: 1,
      title: 'A Notice for Bay Nine',
      text: ('Bay Nine is the last on the row, a bare gantry over a cradle with a half-stripped hauler in it, and Dag Ibarra comes out from under the hull on a creeper with a ' +
          'torch still lit in his hand. He reads the page standing up, in the lock light, with his lips moving, and then reads it again. It is one sheet with the Office\'s crest, ' +
          'and a signature line at the foot that is for him. "Eleven years under a hull," he says to the hauler, "and they send a boy with a slate." You are not a boy and you have no slate. ' +
          'He signs anyway, in a block hand that goes off the edge of the line. "The inspector comes the day after tomorrow. Stay for it, if you like. It will be a show."'),
      choices: [
        { label: 'Stay for the inspection', next: 'compact-bay',
          effects: { q: { compact: 1, compactSide: 1 }, do: ['arcLike', 'dag', 1, 'You stayed for the inspection.'],
            log: 'Carried the Compact Freight Office\'s notice of inspection to Dag Ibarra on Luna, and stayed for the inspection.' },
          result: 'Dag finds you a crate to sit on at the end of the gantry and a tin cup of something that was once coffee. "Don\'t touch the hull," he says. "It has opinions."' },
        { label: 'Leave him the page and go',
          effects: { q: { compact: 1 }, later: { 'compact-end': 5 }, do: ['arcLike', 'dag', -1, 'You would not stay for the inspection.'],
            log: 'Carried the Compact Freight Office\'s notice of inspection to Dag Ibarra on Luna, and did not stay.' },
          result: ('"Delivered, then," Dag says, and puts the page under the torch\'s casing, where it will stay. He is back under the hull before you reach the end of the ' +
              'gantry, and you hear him laughing at something down there that was not funny.') },
      ],
    });

    M.addStorylet({
      id: 'compact-bay', where: 'port', chained: true, priority: 1,
      title: 'The Inspection',
      text: ('Petra Lindqvist comes down the row with a clerk a pace behind her, in a pressed Compact grey with the license insignia on the collar, and she is the most ' +
          'pleasant person you have seen on Luna. She shakes Dag\'s hand and admires the gantry. She asks after the hauler and after the coffee. She walks the whole of Bay Nine ' +
          'with the clerk writing, and at the end of it she stops beside you, with the air of a woman who has only just thought of it. "You were here the whole of last month, I believe," she says. ' +
          '"The Office would be so grateful to know whether the bay worked on Compact hulls in that time, without the license."'),
      choices: [
        { label: 'Say what you saw',
          effects: { q: { compactSide: 1 }, later: { 'compact-end': 5 }, do: ['arcLike', 'dag', -2, 'You told the inspector what the bay worked on.'],
            log: 'Told the Compact\'s licensing officer what the rigger\'s bay had worked on, at the Luna inspection.' },
          result: ('"That is very clear," Petra says, and the clerk writes it as you say it. "I do thank you." Dag holds the torch out at arm\'s length and does not say ' +
              'one word, which on Luna is a sound that carries from end to end of the row.') },
        { label: 'Say the bay was idle',
          effects: { later: { 'compact-end': 5 }, do: ['compact-lie', 'You said the bay was idle and it was not.', 'You said the bay was idle all month.'],
            log: 'Told the Compact\'s licensing officer the rigger\'s bay had been idle, at the Luna inspection.' },
          result: ('"Idle," Petra says, in the same pleasant voice. "All month." She looks at the hull in the cradle, and the welds on its plates, and the date stamped in the ' +
              'frame. "I do so appreciate your being plain about it." Dag turns his head away and coughs into his sleeve twice.') },
        { label: 'Say you only carried the page',
          effects: { later: { 'compact-end': 5 }, do: ['arcLike', 'petra', -1, 'You would not say what the bay worked on.'],
            log: 'Left the Compact\'s licensing officer to find out for herself what the bay had worked on.' },
          result: '"Then the Office will find out another way," Petra says, not unkindly. "It always does." She goes on up the row with the clerk behind her, and does not hurry.' },
      ],
    });

    M.addStorylet({
      id: 'compact-license', where: 'port', priority: 1, consumes: 'compact-end',
      when: { planet: 'Earth', due: 'compact-end', q: { compact: 1, compactSide: 2 }, hired: true },
      title: 'The Carrier License',
      text: ('The license desk is on the freight concourse, between the noodle stall and a queue that goes round the pillar twice, and Petra Lindqvist has left her place open and ' +
          'come out to meet you. She has a card in a clear sleeve in her hand. "The Office has been so helpful to the yard," she says, "and the yard to the Office, at last. ' +
          'This is the Office\'s carrier license, for the ship, with the hand\'s name on it. It will be convenient for a good many doors." She turns it so the stamp catches the light.'),
      choices: [
        { label: 'Take the license', effects: { do: ['compact-license', 'You took the Office\'s carrier license and said it would be used.'], log: 'The Compact Freight Office gave the ship a carrier license, after the inspection at Luna.' },
          result: 'The sleeve is warm from her hand. "Do keep it dry," Petra says. "The Office would be so sorry to have to issue another."' },
        { label: 'Say the license belongs to the Office', effects: { do: ['arcLike', 'petra', 3, 'You gave the carrier license back.'], log: 'Gave the Compact Freight Office\'s carrier license back to the licensing officer.' },
          result: ('Petra slides the card back into its sleeve and the sleeve into her jacket, with the care of someone putting away a letter. "How very proper," she says. "The Office ' +
              'will remember it. I will see that it does."') },
      ],
    });

    M.addStorylet({
      id: 'compact-dag', where: 'port', priority: 1, consumes: 'compact-end',
      when: { planet: 'Luna', due: 'compact-end', q: { compact: 1 }, qBelow: { compactSide: 2 }, hired: true },
      title: 'The Riggers\' Collection',
      text: ('Dag Ibarra is waiting at the lock with a welding glove in his fist, and when he opens it there is a roll of notes in the palm, tied with a bit of cable sheathing. ' +
          '"The row put in," he says. "Every bay. They said a ship that did not name the work is a ship that can be fed. It is not a great deal. We have got a license, ' +
          'by the way, of a sort: the Office gave us ninety days, and then it will do the same again. It likes us at a distance." He pushes the glove at you and grins.'),
      choices: [
        { label: 'Take the roll (350 cr)', effects: { credits: 350, do: ['compact-fee', 'You took the riggers\' collection and said nothing of the bay.', 'You took the riggers\' money after the inspection.'], log: 'Took the Luna riggers\' collection after the inspection.' },
          result: 'It is mostly small notes, much folded. Dag counts them again in front of you to be sure you are not cheated. "Come back and sit on the crate," he says. "The hull still has opinions."' },
        { label: 'Give it back to the row', effects: { do: ['arcLike', 'dag', 1, 'You would not take the riggers\' money.'], log: 'Left the Luna riggers\' collection with the row.' },
          result: 'Dag stares at the glove and then at you, and for once says nothing at all. Then he puts the roll in his shirt. "The cradle fund," he says. "Eleven years of rotas, and it has never been so big."' },
      ],
    });
  },
});
