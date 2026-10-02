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
    if (scopeOff('storylines')) return;  // not in this build (js/build.js)
    const titan = 'Titan';
    const free = { qBelow: { tscTask: 1, tscDone: 1 } };
    const taskOver = { tscTask: 0 };

    M.addStorylet({
      id: 'tsc-invite', where: 'port', priority: 1, once: false,
      when: { planet: titan, day: 30, fleet: 1, qBelow: { tsc: 1, tscDone: 1, mcrn: 1, pirateSworn: 1 }, chance: 0.5 },
      title: 'Oona Halvorsen',
      text: 'The Tethys Shipping Consortium sends a car for you, which on Titan means a pressurized crawler with a bar, heated seats, and a driver who never once looks at the mirror. It rolls across the orange dusk on wide soft treads, and, through the window, the methane rain slides down in long amber streaks. Director Oona Halvorsen is waiting inside, silver-haired and immaculate, holding a glass of something that catches the light. "We do not hire captains," she says. "We partner with shipping companies. Yours is small. We like small; small is hungry. Partner with us, and the Consortium\'s contracts, lawyers, and friends are yours. So are its enemies."',
      choices: [
        { label: 'Sign the partnership', effects: { q: { tsc: 1 }, set: { corpSworn: 1 }, log: 'Signed a partnership with the Tethys Shipping Consortium.' },
          result: 'The contract is four hundred pages, bound in real leather, and smells faintly of expensive coffee. Halvorsen summarizes it in one sentence: "We win, you win." You read the first page, and the last, and part of the middle, and then you look up and she is watching you with quiet, patient amusement. You sign before your drink is finished. She raises her glass. "Welcome to the family," she says. It is impossible to tell whether she means it as a threat.' },
        { label: 'Not yet', result: '"Small companies stay hungry," she says, and turns her glass a quarter-turn on its coaster. "Until they don\'t. Take your time, captain. The Consortium is patient. It has a great deal of practice." The crawler carries you back through the amber rain, in comfortable silence, and you cannot shake the feeling that you have been priced.' },
        { label: 'Never', effects: { set: { tscDone: 1 } }, result: 'Halvorsen smiles as if you have made a small, forgivable mistake, the kind a child makes with a valuable vase, and drops you back at the port without another word. The crawler\'s door hisses shut behind you, and the heat of the seats lingers on your legs for a long time. You are quite sure she will never call again, and you are not sure whether that is a mercy.' },
      ],
    });

    M.addStorylet({
      id: 'tsc-rush', where: 'port', priority: 2, once: false,
      when: { planet: titan, q: { tsc: 1 }, qBelow: { tsc: 2, tscTask: 1, tscDone: 1 } },
      title: 'A Rush Contract',
      text: 'Halvorsen is waiting at the same table, at the same window, with Saturn hanging behind her like a slow, patient eye. "A test," she says, "because I believe in tests. Twenty tons of cryo-cells for a Coalition hospital on Earth. Human tissue, grown from donors, packed in cold. They spoil in twenty-four days, and the Coalition does not forgive a spoiled shipment. The Consortium does not deliver spoiled goods." She steeples her fingers. "It has never been an option."',
      choices: [
        { label: 'Take the cryo-cells (20t)', when: { space: 20 },
          effects: { set: { tscTask: 1 }, log: 'Rushing Consortium cryo-cells from Titan to Earth.',
            mission: { to: 'Earth', tons: 20, good: 'Consortium cryo-cells', pay: 15000, days: 24, title: 'Rush Consortium cryo-cells to Earth before they spoil',
              onDone: { q: { tsc: 1 }, set: taskOver, rep: { 'Earth Coalition': 3 }, log: 'Delivered the Consortium\'s cryo-cells to Earth on time.' },
              onFail: { set: taskOver, log: 'The Consortium\'s cryo-cells spoiled in the hold. Halvorsen sent a one-word message: "Again."' } } },
          result: '"Twenty-four days," she says. "The clock started when you walked in." Two technicians in white coats load the cells into your hold in silver-cold pallets, checking each seal, tagging each with a small green light. You feel, for the first time, the weight of a very careful promise. The lights blink softly in the dark of the hold, like a small, faithful constellation.' },
        { label: 'Not with this ship', result: '"Then get a bigger one," she says, without malice, the way a doctor tells you to lose weight. "Or come back when your hold is empty. The Consortium has a great many small favors, and some of them are more valuable than you would expect." She turns, and for a moment, in the window, her reflection and Saturn overlap, and it is very hard to tell them apart.' },
      ],
    });

    M.addStorylet({
      id: 'tsc-broker', where: 'transit', priority: 1,
      when: { q: { tsc: 2 }, qBelow: { tscDone: 1 }, chance: 0.35 },
      title: 'A Private Offer',
      text: 'A tight-beam message arrives on a private band, smooth and unhurried, and a little bit too friendly, from a broker for Ganymede Freight, the Consortium\'s biggest rival. The voice is warm as a hand on your shoulder. "Captain, I will not waste your time. Twenty thousand credits for your Consortium access codes. No one will ever know. Nobody at Ganymede Freight has ever been caught." A pause, precisely timed. "It is a great deal of money, for a small favor. And loyalty is such a fragile thing."',
      choices: [
        { label: 'Sell the codes (20,000 cr)', effects: { credits: 20000, set: { tscLeak: 1 }, log: 'Sold Consortium access codes to Ganymede Freight.' },
          result: 'The money arrives before the channel closes, an instant, silent chime on your account. It is a great deal of money. The broker\'s voice thanks you, and there is not a trace of triumph in it, only a mild warm gratitude, and that is the worst part. You tell yourself nobody will ever know. You tell yourself again, an hour later, in the dark of your cabin.' },
        { label: '{crew} sells them fakes', when: { crew: 'slicer' },
          effects: { credits: 5000, q: { tsc: 1 }, log: 'Sold Ganymede Freight a set of very convincing fake access codes.' },
          result: '{crew:slicer} spends a happy, sleepless night building a set of codes that open nothing but a honeypot, with a small, loving flourish at the end that any programmer would recognize as insulting. Ganymede pays a deposit before they find out. Halvorsen, when she hears, laughs out loud, a real bark of delight, and sends a case of very good wine to your ship with a single card: "Well played."' },
        { label: 'Report the offer to Halvorsen', effects: { q: { tsc: 1 }, log: 'Reported Ganymede Freight\'s bribe to the Consortium.' },
          result: 'Halvorsen\'s reply is short, arriving before you have finished the report: "Good. We will remember who is loyal. So will they." It is not warm, exactly, but it is a kind of respect, cool and exact, like the touch of a coin. Somewhere, on a screen in a dome on Ganymede, a broker is reading your name and writing it down, slowly, on a very short list.' },
      ],
    });

    M.addStorylet({
      id: 'tsc-takeover', where: 'port', priority: 2,
      when: { planet: titan, q: { tsc: 2 }, ...free },
      title: 'A Friendly Acquisition',
      text: 'Halvorsen has the Ceres charter open on her desk, its fine print glowing softly in the amber light. She does not look up as you enter. "Ceres is where the water is, and water is where the money is," she says. "The Consortium needs a friendly shareholder in Ceres Station. You will buy twenty percent of it, in your company\'s name, and vote with us. You keep the dividends. We keep the votes." Her pen, at last, comes to rest. "It is a very ordinary transaction. Do not let anyone tell you otherwise."',
      choices: [
        { label: 'Agree to buy in', effects: { set: { tscTask: 1, takeover: 1 }, log: 'Agreed to buy a 20% stake in Ceres Station for the Consortium.' },
          result: '"Buy it on Ceres, from the Port tab, like anyone else," she says, and finally looks up, and her eyes are pale, exact, and not unkind. "Then come and tell me. And captain: do it quietly. Ceres is a fragile place, and it will not thank either of us."' },
      ],
    });

    M.addStorylet({
      id: 'tsc-takeover-done', where: 'port', priority: 2,
      when: { planet: titan, q: { takeover: 1 }, stake: { 'Ceres Station': 0.2 } },
      title: 'Votes on Ceres',
      text: 'Halvorsen reads your shareholder filing on her terminal, twice, her lips moving very slightly, as though savoring a fine wine. Outside, the amber rain has thickened, and the lights of the dome blur into a soft gold haze. "Twenty percent of Ceres Station, voting with the Consortium," she says. "There are councillors on Ceres who will never speak to you again. There are people on this moon who will never forget you did it." She looks up, and, to your surprise, there is something like sympathy in her face. "Both of those are true, and both of them are the price."',
      choices: [{ label: 'Hand over the proxy', effects: { q: { tsc: 1 }, set: { tscTask: 0, takeover: 0 }, rep: { 'Belt Collective': -5 }, log: 'Voted my Ceres Station shares with the Consortium.' },
        result: 'The proxy takes a thumbprint, a small, warm click, and the screen chimes once and goes dark. It is done. The Belt Collective takes it personally. By the time you reach the docks, someone has already sprayed a small, neat drop of water on your hull, in blue, and beneath it, in a hand that shakes very slightly, the word REMEMBER.' }],
    });

    const chair = { where: 'port', priority: 3, title: 'The Partner\'s Chair' };
    M.addStorylet({
      ...chair, id: 'tsc-partner',
      when: { planet: titan, q: { tsc: 3, 'seen:tsc-takeover-done': 1 }, qBelow: { tscLeak: 1, tscDone: 1 } },
      text: 'The Consortium board meets in a dome with Saturn filling the sky, ringed and vast and ochre, and a long table of twelve people in dark, quiet clothes. Halvorsen stands, and the room stills. "Our newest partner. Loyal, fast, and holding a fifth of Ceres. The Consortium takes care of its partners." There is polite applause, and one or two people, you notice, do not join in. Through the great curved window you can see a new Ice Hauler waiting at your company\'s berth, crew and all, its hull shining in the ringlight.',
      choices: [{ label: 'Take your chair', effects: { set: { tscDone: 1 }, companyShip: 'freighter', credits: 10000, log: 'Made a partner of the Tethys Shipping Consortium.', news: 'The Tethys Shipping Consortium names a new partner, an independent captain.' },
        result: 'The chair is soft, the table is cool, and, when you sit, nobody speaks for a long moment. Then Halvorsen slides a slim folder across the polished wood, with a single line of gold lettering: PARTNER. The Ice Hauler is yours, with a Consortium-trained captain, plus a 10,000 cr signing bonus. Set its route on the Company tab. You look out at Saturn, and for a moment you wonder how much of this was ever really your choice.' }],
    });
    M.addStorylet({
      ...chair, id: 'tsc-exposed',
      when: { planet: titan, q: { tsc: 3, tscLeak: 1, 'seen:tsc-takeover-done': 1 }, qBelow: { tscDone: 1 } },
      text: 'There is no board meeting. The great dome is dark and empty, the twelve chairs pushed in, and Halvorsen meets you alone at the end of the long table, with a single lamp burning and a Ganymede Freight access log lying open between you. Your codes are in it, line after line, in a familiar hand. She does not raise her voice. She has never once raised her voice. "Ganymede Freight has never been caught," she says. "They have, however, been bought. Sit down, captain. I would like to explain how this is going to end."',
      choices: [{ label: 'Say nothing', effects: { set: { tscDone: 1 }, log: 'Thrown out of the Tethys Shipping Consortium for selling its codes.', news: 'The Tethys Shipping Consortium dissolves a partnership after a security breach.' },
        result: 'You say nothing, because there is nothing that could be said, and she lets the silence sit between you like a third guest. Your partnership is dissolved by the time you reach your ship, in eleven crisp lines of legal prose. The Consortium keeps your Ceres votes and the story. You keep the twenty thousand, and a reputation on Titan you will never shake. In the crawler back to the port, the amber rain seems, this time, to fall a little heavier, and nobody offers you a drink.' }],
    });
  },
});
