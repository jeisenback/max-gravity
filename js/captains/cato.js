'use strict';

// Cato Rahman, Hester Vance's first officer (js/captains/hester.js). Big and calm, came up through the hold, and knows every
// crew member's family. He covers for the crew against her rules. A first officer is a CAST entry marked xo and fragile:
// fate.js does not protect them with the floor. His scenes follow the cast order (intro, mid1, mid2, late, pivot); mid2 is
// "Two Orders", where he and the captain give the hand opposite orders.

// The ice hold: a point each for a medic who is not hurt, a hull above 60 percent, both ice hands aboard, and a second person
// with him. Three or more he lives, two he is marked, fewer he dies.
const iceHands = () => G.state.crew.map(person).filter(c => c && c.role === 'icehand').length;
const catoHoldPoints = backup => (roleHolder('medic') ? 1 : 0) + (G.state.armor > ship().armor * 0.6 ? 1 : 0) + (iceHands() >= 2 ? 1 : 0) + (backup ? 1 : 0);
function inTheIceHold(backup) {
  const points = catoHoldPoints(backup), told = castRec('cato').flags.told, cap = hiredCaptain();
  const outcome = castFate('cato', points >= 3 ? 'live' : points === 2 ? 'mark' : 'die', `Lost in the ice hold near ${system().name}.`, 'Left hand doesn\'t close properly.', 'xo');
  const lead = backup ? 'You send an ice hand in with him. ' : '';
  if (outcome === 'die') {
    like(cap, -1, sceneSay('scene:memories', 'cato.lost.memory')); cap.mood = { kind: 'low', until: G.state.day + 30 };
    return lead + ('He goes in first, as he said he would. The strap holds, and the pod doesn\'t, and the board shows nothing you can ' +
        'read. You get the hatch open from your side. By then the hold is quiet. Captain Vance is at the hatch before you\'ve finished. She watches the ' +
        'board until the last line stops, and then she closes the notebook. "Take him out," she says.')
      + (told ? ' He asked you to find him if it went badly. It\'s the other way round now.' : '');
  }
  castLike('cato', 2, sceneSay('scene:memories', 'cato.lived.memory'));
  if (outcome === 'mark') {
    cap.mood = { kind: 'low', until: G.state.day + 15 };
    return lead + ('He goes in first, and it goes wrong at the number two strap, and the hold is nothing but ice and shouting. He ' +
        'comes out carried, and the hand that held the strap doesn\'t close properly, and won\'t. The med kit is already open. He says, from the ' +
        'deck, "Number two is lashed. So that\'s done."');
  }
  return lead + ('He goes in, and the pod is lashed, and the load stops. He comes out with ice in his beard and a cut across one knuckle, and sits ' +
      'down on the hatch coaming to get his breath. "That\'s where it goes," he says. Captain Vance looks at the hold, and at him, and says nothing, ' +
      'and writes it down.');
}

CAST.cato = {
  first: 'Cato', last: 'Rahman', culture: 'earth', home: 'Chittagong Arcology', job: 'first officer', age: 44, role: 'xo',
  traits: ['kind', 'generous'], wage: 650, xo: true, fragile: true,
  skills: { xo: 2, engineer: 1, pilot: 0, gunner: 1, slicer: 0 }, captain: { trade: 3, nerve: 3, thrift: 2 },
  ambition: 'Wants a share of a ship, someday, so the crew he came up with could work one deck again.',
  bio: 'He came up through the hold, and he knows every crew member by name and by family. He keeps the watch bill, and covers for the crew where the captain\'s rules wouldn\'t.',
  story: {
    left: 'a ship sold out from under her crew, and a hold gang scattered across three ports', rel: 'mother', name: 'Samira',
    hope: 'a share of a ship, so the hold gang he came up with could work one deck again',
    homeDetail: 'a flat above a cargo exchange where the lift ran all night and nobody in the building kept the same shift',
    favor: null,
    news: {
      good: ['{who} sent a photo of the whole stairwell at a wedding', '{who} has a new lift technician, who actually comes when called', '{who} says the rent is frozen for another year'],
      bad: ['{who} says the lift has been broken for a month', '{who} is ill, and the clinic on {home} has a waiting list', '{who} says the exchange is closing the flats for repairs'],
    },
  },
  chatter: [
    'Cato is walking the hold with a mug, checking lashings that are fine.',
    'Cato has taken the cold watch again. Nobody asked him to.',
    'Cato is teaching one of the ice hands to read a manifest, slowly, one line at a time.',
    'Cato: "She\'s counting, that\'s all. Leave her to it."',
    'Cato has written someone\'s mother\'s name on the back of the watch bill so that he remembers to ask.',
    'Cato hums a few bars with no tune while he checks the lashings, and stops when he sees you.',
  ],
  // What he leaves behind when he walks off or dies (fate.js farewellFacts): a flag and its line, in priority order, two at most.
  farewell: {
    walk: 'Cato leaves the watch bill on the galley table, filled in for the next seven days, and takes his mug.',
    facts: [
      ['benched', 'The hold you sealed on him is in the log, with the date and the hour, in his hand.'],
      ['told', 'At the foot of the watch bill, in pencil, is a line that reads: tell them if it goes badly.'],
      ['share', 'His notebook has the old slow ship with the question mark, and her price, crossed out and written again six times.'],
    ],
  },
  scenes: {
    intro: {
      title: 'The Watch Bill',
      text: ('Cato Rahman finds you at the end of your first watch with a mug in each hand. He\'s a big man, and he moves slowly in the passages. ' +
          '"Sit," he says. "You got the cold watch, and that was me, so if you hate it, say so. The cook has a boy at home, so the cook has the ' +
          'evenings. The medic is waiting on a letter, and I try to have the medic on when we dock. The rest of you get what\'s left. Tell me what ' +
          'you can\'t stand and I\'ll see what I can move. The captain counts every hour I move, mind. I move them anyway." He holds out one of the mugs.'),
      choices: [
        {
          label: 'Tell him what you need',
          effects: { castLike: { who: 'cato', n: 2, memory: 'You told me what you needed, and I put it on the bill.' } },
          result: ('You tell him you\'d rather have the middle watch than the cold one, and that you sleep badly after a hard burn. He writes it on ' +
              'the back of his hand with a stub of pencil. "Done," he says. "Hard burns, middle watch. Nobody has to know why."'),
        },
        {
          label: 'Say you\'re fine',
          effects: { castLike: { who: 'cato', n: 1, memory: 'You said you were fine, and I left it there.' } },
          result: 'You say you\'re fine. "All right," he says. He leaves the mug on the rail beside you, and the offer with it, and goes aft to see about somebody else\'s watch.',
        },
      ],
    },
    mid1: {
      days: 25, title: 'A Share of a Ship',
      text: ('Cato is sitting on a cargo lashing with a notebook the size of a hand, the kind that goes in a shirt pocket. It\'s not the captain\'s; it has no ' +
          'columns. "Twelve years in the hold," he says, "and the jar at home isn\'t enough for a share of anything. I look anyway, when I can\'t ' +
          'sleep." He turns it round so you can see: a ship\'s name crossed out, and another, and a third with a question mark. "I ' +
          'don\'t want to own her. I want a share, and a deck, and the same hold gang on it at the end. That\'s all." He puts the notebook away. "You ' +
          'can tell me if it\'s stupid. The hold gang did, the first time I said it."'),
      choices: [
        {
          label: 'Ask which ship has the question mark',
          effects: { castLike: { who: 'cato', n: 2, memory: 'You asked about the ship with the question mark.' }, castFlag: { who: 'cato', flag: 'share' } },
          result: ('He tells you, and it\'s a hull you\'ve seen on the lanes: old, slow, honest. "Her owner wants out in two years," he says. "I\'ve ' +
              'been watching her price like the weather." He talks about her for ten minutes without stopping, and when he\'s done the mug in his hand has gone cold.'),
        },
        {
          label: 'Say it\'s not stupid, but it\'s a long way off',
          effects: { castLike: { who: 'cato', n: 1, memory: 'You said it wasn\'t stupid, but a long way off.' } },
          result: '"It is," he says. "It\'s a long way off every day, and then it\'s one day nearer." He puts a hand on the lashing.',
        },
      ],
    },
    mid2: {
      days: 40, title: 'Two Orders',
      text: ('It\'s the middle of the cold watch, and you have two orders for it. Captain Vance\'s came first, on paper, in pencil: the watch holds ' +
          'the deck until the cargo has been counted twice, no relief. Cato\'s came a minute ago, aloud, in the passage: stand the cold watch down, he\'ll ' +
          'cover it, they\'ve had four hours\' sleep in two days. Both are somewhere aft of you, not looking at each ' +
          'other, and neither will tell you what the other said.'),
      choices: [
        {
          label: 'Hold the deck, as the captain wrote it',
          effects: { castLike: { who: 'cato', n: -1, memory: 'You held the deck against my order.' }, captainLike: { n: 2, memory: 'You held the deck as I wrote it.' } },
          result: 'You hold the deck. The count comes out right the second time and wrong by one crate the first. Captain Vance writes it in the notebook and doesn\'t look up. Cato says nothing at all, and takes the cold watch himself the next night, without being asked.',
        },
        {
          label: 'Stand the watch down, as Cato said',
          effects: { castLike: { who: 'cato', n: 2, memory: 'You stood the watch down on my word.' }, captainLike: { n: -1, memory: 'You stood the watch down against my order.' } },
          result: ('You stand them down. Cato covers the watch. The count isn\'t done until morning, and Captain Vance finds the gap in it, and finds ' +
              'you. "Whose order?" she says. You tell her. "I see," she says, and writes something down. Cato, passing in the passage, doesn\'t look ' +
              'at either of you, and puts a hand flat on the bulkhead as he goes.'),
        },
      ],
    },
    late: {
      days: 55, title: 'What Cato Knows', flag: 'secretKnown',
      text: ('Cato has the watch bill open on the galley table, and he\'s not reading it. "There\'s nothing on it past the twenty-eighth," he says. ' +
          '"I haven\'t filled it in, because I don\'t know that the same people will be aboard. The captain keeps the books where I can see them, and ' +
          'I\'ve known about the bank since the spring. If she loses the ship, the hold gang goes three ways before the month is out. I watched that ' +
          'happen once, to a different gang." He rubs his face. "I\'m not asking you for anything. If it goes badly, I\'d like you somewhere I ' +
          'could find you."'),
      choices: [
        {
          label: 'Ask him to tell you if it goes badly',
          effects: { castLike: { who: 'cato', n: 2, memory: 'You asked me to tell you if it went badly.' }, castFlag: { who: 'cato', flag: 'told' } },
          result: 'He writes it in pencil at the foot of the bill, where the next person to read it\'ll see. "I will," he says. "It\'s something, to have somebody to tell."',
        },
        {
          label: 'Tell him it\'s not yours to carry',
          effects: { castLike: { who: 'cato', n: 1, memory: 'You said it wasn\'t yours to carry.' } },
          result: '"No," he says. "It\'s not." He squares the watch bill on the table. "I wanted somebody to hear it said, that\'s all. It\'s a lot to carry in the hold."',
        },
      ],
      // Below friendly he keeps it to himself, and the favour he would have asked (the `told` flag, read in the ice hold) is not asked.
      closed: {
        title: 'What Cato Knows',
        text: ('Cato has the watch bill open on the galley table, and he closes it when you come in. "I was going to tell you about the ship\'s books," ' +
            'he says. "I\'ve thought better of it." He turns the pencil over in his fingers. "It\'s nothing you\'ve done. I don\'t know you well ' +
            'enough to hand you a thing like that. Ask me again some day."'),
        choices: [
          {
            label: 'Say it can wait',
            result: '"It can," he says, and puts the pencil back behind his ear. "Thank you. I wouldn\'t have known how to start."',
          },
        ],
      },
    },
    pivot: {
      days: 70, title: 'In the Ice Hold',
      get text() {
        const medic = roleHolder('medic'), low = G.state.armor <= ship().armor * 0.6, hands = iceHands();
        return ('The alarm is a flat two-tone from the hold, and the board shows the number two ice pod with a seal gone and the load moving. Cato is ' +
            'already at the hatch with a lashing strap over one shoulder. "I know where the load goes," he says. "It\'s my hold. Give me ten minutes." ' +
            'Ice doesn\'t move quickly, but it doesn\'t stop, either, and the pod it\'s leaning on isn\'t rated for it.')
          + (low ? ' The hull has taken a beating, and a bad hull is a bad place for a load to shift.' : ' The hull is sound.')
          + (medic ? ` ${medic.first} has the med kit open at the hatch.` : ' There\'s nobody aboard who can do more than a field dressing.')
          + (hands >= 2 ? ' Both ice hands are suited and waiting.' : ' There aren\'t enough hands on the ice for a load like this.')
          + ' He waits for your answer, and has already started on the strap.';
      },
      choices: [
        { label: 'Let him go in', run: () => inTheIceHold(false) },
        { label: 'Send an ice hand in with him', ...gated([() => iceHands() >= 1, () => 'There\'s no ice hand to send.']), run: () => inTheIceHold(true) },
        {
          label: 'Seal the hold and let the ice go',
          effects: { castFlag: { who: 'cato', flag: 'benched' }, castLike: { who: 'cato', n: -3, memory: 'You sealed the hold on me.' } },
          result: 'You tell him no, and shut the hatch. The ice goes where ice goes, and the pod won\'t be the same. Cato stands at the hatch with the strap in his hands and says nothing until the lock indicator goes green. "It\'s your call," he says.',
        },
      ],
    },
  },
};

// The walk-through on the first burn (captains.js plays it once, before anything else): Cato takes the new hand round the ship. The
// names are the crew's own; a role nobody holds reads as the job. Only the Gunner's post gets a line of its own. The words are the lines of
// 'scene:cato-round' (hiredscenes.js).
CAST.cato.round = () => {
  const say = (key, vars) => sceneSay('scene:cato-round', key, vars);
  const ice = G.state.crew.map(person).filter(c => c && c.role === 'icehand').map(c => c.first);
  const [cook, medic, qm, eng, pilot, comms] = ['cook', 'medic', 'quartermaster', 'engineer', 'pilot', 'slicer'].map(crewNamed);
  const names = { cook, medic, qm, eng, pilot, comms, iceA: ice[0] || say('ice.first'), iceB: ice[1] || say('ice.second') };
  const walk = ['galley', 'medic', 'hold', 'engine', 'door', ...(hired().post === 'gunner' ? ['guns'] : []), 'bill'].map(k => say(`walk.${k}`, names));
  return {
    title: say('title'), personal: true,
    text: say('text'),
    choices: [
      { label: say('walk.label'), run: () => walk.join('</p><p>') },
      { label: say('later.label'), result: say('later.result') },
    ],
  };
};

// The first arrival (captains.js arrivalScene): Cato settles up at the foot of the ramp.
CAST.cato.arrival = {
  open: 'The ramp is down. Cato has the captain\'s notebook open on a crate on the apron, and he turns it round so you can read it. "She\'s at the harbor office. I\'m to show you the page and bring it back."',
  memory: '"My first share was nine hundred," he says. "I bought boots with it. They were the wrong boots, and I wore them for six years." He taps the page. "Yours is in your account. Look at the header."',
  column: '"That column\'s {cap}\'s," Cato says. The pencil stays behind his ear.',
  pace: '"A season," Cato says. "{cap} was a hand on this ship before she owned it. It took her three."',
};

// The first deck fight (captains.js deckExplanation): Cato at the inner lock, before the first turn of it.
CAST.cato.firstDeck = {
  title: 'The Inner Lock',
  text: ('Cato has the sidearm locker open and hands you yours butt first. "Same as the guns," he says. "The top line\'s what they mean to do. ' +
      'The board\'s the deck, a box a section. Ours on the left, theirs on the right, and the dots are cover. Fewer dots, less to get behind."</p><p>' +
      'He points at the line under it. "That\'s their count, and the mark is where they break. Put enough of them down and the rest go back the ' +
      'way they came. Each turn you stand or move a section, and you do one thing there. Then you give one of us an order. Me, if you like. I\'ll ' +
      'tell you if it\'s a bad one."'),
  choices: [{
    label: 'Check the sidearm',
    result: 'The safety is where he said it would be. "Breathe out before you squeeze," Cato says. "Everyone forgets the first time."',
  }],
};

// The first raid (captains.js raidExplanation): Cato at the guns hatch, before the first scene.
CAST.cato.firstRaid = {
  title: 'The Guns Hatch',
  text: ('Cato is at the guns hatch before you have your boots on. He has the watch bill under his arm. "Look at the top of the board," he ' +
      'says. "That\'s what she means to do next, and under it what the captain will do with the helm. You don\'t guess either."</p><p>He points at ' +
      'the guns. "Each one goes where you send it: her guns, her drive, her lock, her hull. Then Fire, and you see what came of it. Take her lock and ' +
      'she can\'t board us. If she hits us hard, someone gets hurt, maybe you, and your work counts a level lower for some days. I had it in the hold. ' +
      'I wore a glove for eleven days."</p><p>He taps the gauge over the breech. "Every shot puts heat in the guns, and past that mark one locks ' +
      'for a turn. An overcharged shot hits harder and runs hotter. The turret up top fires with the guns, or you hold it back and it takes the edge ' +
      'off what she throws at us, torpedoes most of all. Holding it costs you a gun. When she opens her bay doors, you have one turn to choose. We ' +
      'carry a few torpedoes of our own. They hit hard, and when they\'re gone they\'re gone."'),
  choices: [{
    label: 'Take your post',
    result: 'He lets go of the hatch frame. "Choose what you\'d choose," he says. "I\'ll be behind you."',
  }],
};
