'use strict';

// The air audit at Eros (#683): a mission arc hung on the Concord Freight Office (js/arcs.js). Odile Marchetti, a Fleet auditor, needs a berth from Mars to Eros Old Town
// without her name on the manifest: the domes' air levy has been paying for the air of the sealed half of the town, fourteen corridors, and she thinks nobody breathes it. Hob Strand,
// the town's air steward, has been sending that air to the cisterns of the living half. Qualities: `concord` (begun), `concordSide` (from 2 the audit stands: the hand walked
// the corridors and signed the count as it is). The arrival leads into the corridors if the hand goes; the end plays at Mars (the audit stood: the auditor's seal) or at Eros Old
// Town (it did not: the steward's fee) when the hand next comes.
// Odile speaks in line items and dry asides and wants it written down; Hob speaks in pressures, valves and what a door has done, a few words at a time.

Mods.register({
  id: 'arc-concord', name: 'The air audit', builtin: true,
  init(M) {
    // The words each action keeps for a person are the scene's, passed in from the data below.
    // The hand who signed for the vents being open: the auditor minds that.
    M.addAction('concord-lie', memory => { like(arcPerson('odile'), -2, memory); return ''; });
    // The seal: a person, a regard and an item.
    M.addAction('concord-seal', memory => { like(arcPerson('odile'), 2, memory); moveStanding('the Concord Freight Office', 1); return addKit('audit-seal'); });
    // The fee: Hob warms, and the Fleet cools.
    M.addAction('concord-fee', (forHob, forOdile) => { like(arcPerson('hob'), 2, forHob); like(arcPerson('odile'), -1, forOdile); return ''; });

    M.addStorylet({
      id: 'concord-auditor', where: 'port', chained: true, priority: 1,
      title: 'A Passenger for Old Town',
      text: ('Odile Marchetti comes down the ramp with a single case and a Fleet coat folded over it so the crest does not show, and pays you the passage in coin before the hatch is ' +
          'shut. She is a thin woman of about fifty with ink on two fingers. "Fourteen corridors," she says, looking up the dim main street of Old Town. "Sealed, and not a soul in ' +
          'any of them. The domes have paid to air them every day for nine years. That is a great deal of air." She opens the case a hand\'s width: a ledger, a lamp and a flat ' +
          'iron seal on a cord. "I need to count the doors. I need someone who is neither the Fleet nor the town to stand there while I do it."'),
      choices: [
        { label: 'Walk the corridors with her', next: 'concord-dark',
          effects: { q: { concord: 1, concordSide: 1 }, do: ['arcLike', 'odile', 2, 'You walked the dark corridors with me.'],
            log: 'Carried a Fleet auditor to Eros Old Town, and went with her to count the sealed corridors.' },
          result: 'Odile hangs the lamp on her wrist and writes your name in the ledger, with the day, before either of you has left the lock. "For the record," she says.' },
        { label: 'Wait at the ship',
          effects: { q: { concord: 1 }, later: { 'concord-end': 5 }, do: ['arcLike', 'odile', -1, 'You would not walk the corridors with me.'],
            log: 'Carried a Fleet auditor to Eros Old Town, and waited at the ship while she counted.' },
          result: ('"Then I count alone," Odile says, "and the count will say so." She takes the lamp off her wrist and goes up the street at a good pace. She is back in two days ' +
              'with her coat dusty to the knee, and does not say what she found.') },
      ],
    });

    M.addStorylet({
      id: 'concord-dark', where: 'port', chained: true, priority: 1,
      title: 'The Sealed Half',
      text: ('The doors are numbered in white paint, one to fourteen, and every one has a fresh bead of sealant round the frame. Odile counts them aloud and writes each in the ' +
          'ledger. In the ninth corridor the pipes are warm. The vents breathe on your face, and the dust on the floor under them has been swept in a half-circle. A man is sitting ' +
          'on a coil of hose at the end with a hand lamp in his lap, a broad man in a stained apron with a gauge hung round his neck. "You\'ll want the pressure," he says. "It\'s ' +
          'right on the dial." Hob Strand has been the town\'s air steward since before the doors were sealed. He does not get up.'),
      choices: [
        { label: 'Sign the count as it stands',
          effects: { q: { concordSide: 1 }, later: { 'concord-end': 5 }, do: ['arcLike', 'hob', -2, 'You signed the count of the vents as it stood.'],
            log: 'Signed the Fleet auditor\'s count of the sealed corridors at Eros, as it stood.' },
          result: ('Odile turns the ledger for you and you sign under her name. Hob watches the pen all the way down. "Nine years," he says. "Nobody asked where it went. ' +
              'They asked if it was drawn." He winds the hose over his arm and goes up the corridor ahead of you with the lamp, and does not look back at the vents.') },
        { label: 'Say the vents were open when you came',
          effects: { later: { 'concord-end': 5 }, do: ['concord-lie', 'You said the vents were open and they were not.', 'You said the vents were open when you came.'],
            log: 'Told the Fleet auditor the vents in the sealed corridors were open, and let her count stand on it.' },
          result: ('Odile writes it down, slowly, and looks at the dust under the vent, and at you. "Open," she says. "All fourteen." She closes the ledger on her pen. Hob ' +
              'says nothing at all, and stands to put the hose back on its hook.') },
        { label: 'Say you only carried her',
          effects: { later: { 'concord-end': 5 }, do: ['arcLike', 'odile', -1, 'You would not sign the count.'],
            log: 'Left the count of the sealed corridors at Eros to the auditor.' },
          result: ('"Then I\'ll sign for myself," Odile says, and does, and the lamp swings on her wrist while she does it. Hob lets out a breath through his nose. It is the ' +
              'first sound he has made since the ninth door.') },
      ],
    });

    M.addStorylet({
      id: 'concord-seal', where: 'port', priority: 1, consumes: 'concord-end',
      when: { planet: 'Mars', due: 'concord-end', q: { concord: 1, concordSide: 2 }, hired: true },
      title: 'The Air Levy Meeting',
      text: ('The levy meeting is held in the open, in the great square under the dome, and you hear it from the ramp: eight hundred people who each know exactly what the ' +
          'air costs them, and say so. Odile Marchetti is waiting at the edge with her coat on properly this time, the Fleet crest out. She hands you the flat iron seal on its cord. ' +
          '"The Fleet\'s audit seal," she says. "The report went in with your name under mine. Fourteen corridors, drawn and paid. They will be shouting about it until midnight." ' +
          'Somewhere behind her a man is on a crate, naming dome shares in a very loud voice.'),
      choices: [
        { label: 'Take the seal', effects: { do: ['concord-seal', 'You took the Fleet\'s audit seal and said it would be used.'], log: 'The Fleet gave the ship an audit seal, after the air audit at Eros.' },
          result: 'It is heavier than it looks, and warm from her pocket. Odile closes your hand round it. "It opens a Fleet clerk\'s door," she says, "and shuts a good many others."' },
        { label: 'Say the seal belongs to the Fleet', effects: { do: ['arcLike', 'odile', 3, 'You gave the audit seal back.'], log: 'Gave the Fleet\'s audit seal back to the auditor.' },
          result: ('Odile turns the seal over once, and writes something on the cord\'s tag. "Itemised," she says. "One seal, returned." She puts it in her coat. "Come ' +
              'and find me when you want a clerk\'s door opened. I will say you have earned it."') },
      ],
    });

    M.addStorylet({
      id: 'concord-hob', where: 'port', priority: 1, consumes: 'concord-end',
      when: { planet: 'Eros Old Town', due: 'concord-end', q: { concord: 1 }, qBelow: { concordSide: 2 }, hired: true },
      title: 'The Steward\'s Fee',
      text: ('Hob Strand is waiting at the ship\'s lock in his stained apron, with an envelope held flat against the gauge on his chest. He has washed his hands. "The count went in," ' +
          'he says. "Seven doors short, the Fleet says, and I was not asked about the rest." He holds the envelope out. "The town put in. It breathes the same air. Nobody wrote ' +
          'a word down for you, and nobody will."'),
      choices: [
        { label: 'Take the envelope (3,000 cr)', effects: { credits: 3000, do: ['concord-fee', 'You took the town\'s fee and said nothing of the vents.', 'You took the town\'s money after the count.'], log: 'Took the Old Town air fund\'s fee after the audit.' },
          result: 'The envelope is mostly small coin, counted twice. Hob reads it the way he reads a gauge. "Pressure\'s holding," he says. "Mind the ninth corridor."' },
        { label: 'Leave it with him', effects: { do: ['arcLike', 'hob', 1, 'You would not take the town\'s money.'], log: 'Left the Old Town air fund\'s fee with the steward.' },
          result: 'Hob turns the envelope over and puts it in the apron. He says nothing until the apron is tied. "Then the cisterns get it," he says. "Come in out of the cold."' },
      ],
    });
  },
});
