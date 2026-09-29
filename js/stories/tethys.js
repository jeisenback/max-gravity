'use strict';

// The Partner's Chair: a corporate climb with the Tethys Shipping Consortium of Titan,
// written as storylets. The Consortium partners with shipping companies, so it only
// comes calling once you own a company ship, and it asks for a stake in Ceres Station
// along the way (company.js). It competes with Reserve Commission and The Rook's
// Crown: whichever you join first closes the others. The quality `tsc` is your rise
// (the chair at 3, after the Ceres takeover); `tscTask` is set while you carry Consortium work; `tscLeak`
// remembers selling the access codes; `tscDone` ends the storyline.

Mods.register({
  id: 'tethys', name: "The Partner's Chair", builtin: true,
  init(M) {
    const titan = 'Titan';
    const free = { qBelow: { tscTask: 1, tscDone: 1 } };
    const taskOver = { tscTask: 0 };

    M.addStorylet({
      id: 'tsc-invite', where: 'port', priority: 1, once: false,
      when: { planet: titan, day: 30, fleet: 1, qBelow: { tsc: 1, tscDone: 1, mcrn: 1, pirateSworn: 1 }, chance: 0.5 },
      title: 'Oona Halvorsen',
      text: 'The Tethys Shipping Consortium sends a car for you, which on Titan means a pressurized crawler with a bar. Director Oona Halvorsen is waiting inside. "We do not hire captains. We partner with shipping companies. Yours is small. We like small; small is hungry. Partner with us, and the Consortium\'s contracts, lawyers, and friends are yours. So are its enemies."',
      choices: [
        { label: 'Sign the partnership', effects: { q: { tsc: 1 }, set: { corpSworn: 1 }, log: 'Signed a partnership with the Tethys Shipping Consortium.' },
          result: 'The contract is four hundred pages. Halvorsen summarizes it in one sentence: "We win, you win." You sign before your drink is finished.' },
        { label: 'Not yet', result: '"Small companies stay hungry," she says. "Until they don\'t."' },
        { label: 'Never', effects: { set: { tscDone: 1 } }, result: 'Halvorsen smiles as if you have made a small, forgivable mistake, and drops you back at the port.' },
      ],
    });

    M.addStorylet({
      id: 'tsc-rush', where: 'port', priority: 2, once: false,
      when: { planet: titan, q: { tsc: 1 }, qBelow: { tsc: 2, tscTask: 1, tscDone: 1 } },
      title: 'A Rush Contract',
      text: '"A test," Halvorsen says, "because I believe in tests. Twenty tons of cryo-cells for a Coalition hospital on Earth. They spoil in twenty-four days. The Consortium does not deliver spoiled goods."',
      choices: [
        { label: 'Take the cryo-cells (20t)', when: { space: 20 },
          effects: { set: { tscTask: 1 }, log: 'Rushing Consortium cryo-cells from Titan to Earth.',
            mission: { to: 'Earth', tons: 20, good: 'Consortium cryo-cells', pay: 15000, days: 24, title: 'Rush Consortium cryo-cells to Earth before they spoil',
              onDone: { q: { tsc: 1 }, set: taskOver, rep: { 'Earth Coalition': 3 }, log: 'Delivered the Consortium\'s cryo-cells to Earth on time.' },
              onFail: { set: taskOver, log: 'The Consortium\'s cryo-cells spoiled in the hold. Halvorsen sent a one-word message: "Again."' } } },
          result: '"Twenty-four days," she says. "The clock started when you walked in."' },
        { label: 'Not with this ship', result: '"Then get a bigger one," she says. "Or come back when your hold is empty."' },
      ],
    });

    M.addStorylet({
      id: 'tsc-broker', where: 'transit', priority: 1,
      when: { q: { tsc: 2 }, qBelow: { tscDone: 1 }, chance: 0.35 },
      title: 'A Private Offer',
      text: 'A tight-beam message from a broker for Ganymede Freight, the Consortium\'s biggest rival: "Twenty thousand credits for your Consortium access codes. No one will ever know. Nobody at Ganymede Freight has ever been caught."',
      choices: [
        { label: 'Sell the codes (20,000 cr)', effects: { credits: 20000, set: { tscLeak: 1 }, log: 'Sold Consortium access codes to Ganymede Freight.' },
          result: 'The money arrives before the channel closes. You tell yourself nobody will ever know.' },
        { label: '{crew} sells them fakes', when: { crew: 'slicer' },
          effects: { credits: 5000, q: { tsc: 1 }, log: 'Sold Ganymede Freight a set of very convincing fake access codes.' },
          result: '{crew:slicer} builds a set of codes that open nothing but a honeypot. Ganymede pays a deposit before they find out. Halvorsen, when she hears, laughs out loud.' },
        { label: 'Report the offer to Halvorsen', effects: { q: { tsc: 1 }, log: 'Reported Ganymede Freight\'s bribe to the Consortium.' },
          result: 'Halvorsen\'s reply is short: "Good. We will remember who is loyal. So will they."' },
      ],
    });

    M.addStorylet({
      id: 'tsc-takeover', where: 'port', priority: 2,
      when: { planet: titan, q: { tsc: 2 }, ...free },
      title: 'A Friendly Acquisition',
      text: '"Ceres is where the water is, and water is where the money is," Halvorsen says. "The Consortium needs a friendly shareholder in Ceres Station. You will buy twenty percent of it, in your company\'s name, and vote with us. You keep the dividends. We keep the votes."',
      choices: [
        { label: 'Agree to buy in', effects: { set: { tscTask: 1, takeover: 1 }, log: 'Agreed to buy a 20% stake in Ceres Station for the Consortium.' },
          result: '"Buy it on Ceres, from the Port tab, like anyone else," she says. "Then come and tell me."' },
      ],
    });

    M.addStorylet({
      id: 'tsc-takeover-done', where: 'port', priority: 2,
      when: { planet: titan, q: { takeover: 1 }, stake: { 'Ceres Station': 0.2 } },
      title: 'Votes on Ceres',
      text: 'Halvorsen reads your shareholder filing on her terminal, twice. "Twenty percent of Ceres Station, voting with the Consortium. There are councillors on Ceres who will never speak to you again. There are people on this moon who will never forget you did it."',
      choices: [{ label: 'Hand over the proxy', effects: { q: { tsc: 1 }, set: { tscTask: 0, takeover: 0 }, rep: { 'Belt Collective': -5 }, log: 'Voted my Ceres Station shares with the Consortium.' },
        result: 'The proxy takes a thumbprint. The Belt Collective takes it personally.' }],
    });

    const chair = { where: 'port', priority: 3, title: 'The Partner\'s Chair' };
    M.addStorylet({
      ...chair, id: 'tsc-partner',
      when: { planet: titan, q: { tsc: 3, 'seen:tsc-takeover-done': 1 }, qBelow: { tscLeak: 1, tscDone: 1 } },
      text: 'The Consortium board meets in a dome with Saturn filling the sky. Halvorsen stands. "Our newest partner. Loyal, fast, and holding a fifth of Ceres. The Consortium takes care of its partners." A new Ice Hauler waits at your company\'s berth, crew and all.',
      choices: [{ label: 'Take your chair', effects: { set: { tscDone: 1 }, companyShip: 'freighter', credits: 10000, log: 'Made a partner of the Tethys Shipping Consortium.', news: 'The Tethys Shipping Consortium names a new partner, an independent captain.' },
        result: 'The Ice Hauler is yours, with a Consortium-trained captain, plus a 10,000 cr signing bonus. Set its route on the Company tab.' }],
    });
    M.addStorylet({
      ...chair, id: 'tsc-exposed',
      when: { planet: titan, q: { tsc: 3, tscLeak: 1, 'seen:tsc-takeover-done': 1 }, qBelow: { tscDone: 1 } },
      text: 'There is no board meeting. Halvorsen meets you alone, with a Ganymede Freight access log on the table between you. Your codes are in it. "Ganymede Freight has never been caught," she says. "They have, however, been bought."',
      choices: [{ label: 'Say nothing', effects: { set: { tscDone: 1 }, log: 'Thrown out of the Tethys Shipping Consortium for selling its codes.', news: 'The Tethys Shipping Consortium dissolves a partnership after a security breach.' },
        result: 'Your partnership is dissolved by the time you reach your ship. The Consortium keeps your Ceres votes and the story. You keep the twenty thousand, and a reputation on Titan you will never shake.' }],
    });
  },
});
