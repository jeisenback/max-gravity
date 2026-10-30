'use strict';

// Ansel Whitcombe, Zoya Pell's first officer (js/captains/zoya.js). Older and careful, an ex-actuary who plans for the worst and
// is the brake on every one of her schemes. He stays out of loyalty or habit, and nobody, himself included, is sure which. He
// wants to retire safely, and fears her last big run taking them all. A first officer is a CAST entry marked xo and fragile
// (fate.js does not protect him with the floor). His scenes follow the cast order; mid2 is "Two Orders".

// The one fight she should not have picked: a point each for a medic who is not hurt, a hull above 60 percent, a gunner at the
// guns, and a second person at the lock with him. Three or more he lives, two he is marked, fewer he dies.
const lockPoints = backup => (roleHolder('medic') ? 1 : 0) + (G.state.armor > ship().armor * 0.6 ? 1 : 0) + (roleHolder('gunner') ? 1 : 0) + (backup ? 1 : 0);
function atTheLock(backup) {
  const points = lockPoints(backup), told = castRec('ansel').flags.told, cap = hiredCaptain();
  const outcome = castFate('ansel', points >= 3 ? 'live' : points === 2 ? 'mark' : 'die', `Lost at the boarding lock near ${system().name}.`, 'The hand that held the sheet doesn\'t close properly.', 'xo');
  const lead = backup ? 'You send a second person to the lock with him. ' : '';
  if (outcome === 'die') {
    like(cap, -1, sceneSay('scene:memories', 'ansel.lost.memory')); cap.mood = { kind: 'low', until: G.state.day + 30 };
    return lead + ('He goes to the lock alone, with the sheet in his hand, and the lock cycles, and what the people on the other side do isn\'t ' +
        'something the board can tell you. When the lock opens again, he\'s not what\'s in it. Captain Pell comes down from the guns slowly, with the ' +
        'grin gone, and stands at the lock without moving. "He told me," she says. "Every time. He told me."')
      + (told ? ' You said you\'d stop her if you could. It wasn\'t in time.' : '');
  }
  castLike('ansel', 2, sceneSay('scene:memories', 'ansel.lived.memory'));
  if (outcome === 'mark') {
    cap.mood = { kind: 'low', until: G.state.day + 15 };
    return lead + ('He goes to the lock with the sheet, and it goes wrong at the second sentence, and for a minute the only sound is shouting through ' +
        'a hatch. He comes back carried, with a cut over one eye, and the hand that held the sheet is closed round it and won\'t open properly. ' +
        '"They\'ve agreed to wait," he says. "I told them the odds."');
  }
  return lead + ('He goes to the lock with the sheet in his hand, and talks for eleven minutes, in a level voice, about the odds. The long ship backs ' +
      'off. He comes back with his coat buttoned wrong and says, "They\'ve agreed to wait," and sits down on the lock coaming and doesn\'t say ' +
      'anything else for a while. Captain Pell doesn\'t make a joke. She puts a hand on his shoulder, and takes it off again.');
}

CAST.ansel = {
  first: 'Ansel', last: 'Whitcombe', culture: 'earth', home: 'Edinburgh Arcology', job: 'first officer', age: 63, role: 'xo',
  traits: ['nervous', 'kind'], wage: 650, xo: true, fragile: true,
  skills: { xo: 3, slicer: 2, engineer: 1, pilot: 0, gunner: 0 }, captain: { trade: 4, nerve: 1, thrift: 5 },
  ambition: 'Wants to retire safely, on an income nobody can touch.',
  bio: 'An actuary once, and he plans for the worst, and writes it down in small numbers. He\'s the brake on every one of the captain\'s schemes, and stays out of loyalty or habit; he hasn\'t decided which.',
  story: {
    left: 'a pension fund he was the actuary for, which was spent by the people he had warned', rel: 'wife', name: 'Margit',
    hope: 'a house with a garden, and an annuity that nobody can touch',
    homeDetail: 'a flat above a bookshop with a tilted floor, a radiator that clanked in a pattern, and a wife who corrected his sums',
    favor: null,
    news: {
      good: ['{who} has found a house with a garden, and a landlord who answers letters', '{who} sent the radiator\'s pattern, transcribed, as a joke', '{who} says the annuity company has written back, and it\'s not a refusal'],
      bad: ['{who} says the bookshop is closing, and the flat with it', '{who} is ill, and won\'t say how much it costs', '{who} says the garden has been sold for a car park'],
    },
  },
  chatter: [
    'Ansel is going through the manifest with a pencil. He has circled the line that says "assorted".',
    'Ansel has written the probability of everything on a card, and the card is in his pocket, and he doesn\'t take it out.',
    'Ansel: "I don\'t say it\'ll go wrong. I say that if it does, here\'s the sheet."',
    'Ansel eats his lunch at the same table, in the same chair, from the same tin.',
    'Ansel has put a second set of fuel orders in the drawer, the cautious ones, in case.',
    'Ansel: "She has never lost on a Tuesday. I don\'t know what that means. I\'m watching it."',
  ],
  scenes: {
    intro: {
      title: 'The Sheet',
      text: ('Ansel Whitcombe is at the galley table with a pencil, a ruled sheet, and a cup of tea he has forgotten. He\'s old for the work and neat ' +
          'for the ship, and he writes in small numbers. "I\'m the first officer," he says, not looking up. "I\'m also, though nobody asked me to be, ' +
          'the person who tells the captain the probability. I tell her. She says, Good, and does it anyway." He turns the sheet round so you can see: ' +
          'columns, and a figure at the bottom. "I\'m not a pessimist. I was an actuary. It\'s the same thing, with better pay, and then it wasn\'t."'),
      choices: [
        {
          label: 'Ask him what the figure means',
          effects: { castLike: { who: 'ansel', n: 2, memory: 'You asked what the figure meant.' } },
          result: '"It\'s the chance she gets all the way home," he says. "From where we are, with what she owes. It\'s not a bad figure. It\'s not a good one." He takes the sheet back and folds it, once. "I don\'t show it to the captain. She\'d bet on it."',
        },
        {
          label: 'Ask him why he stays',
          effects: { castLike: { who: 'ansel', n: 1, memory: 'You asked why I stay.' } },
          result: '"Habit, or loyalty," he says, after a moment. "I haven\'t decided which, and I\'ve been deciding for six years. I\'d say it was the pay, but I\'ve seen the pay."',
        },
      ],
    },
    mid1: {
      days: 25, title: 'The Annuity',
      text: ('Ansel has a letter from an annuity company, and has read it several times. "A guaranteed income, for life, with no clauses," he says. ' +
          '"It costs one hundred and ten thousand, which I don\'t have, and I\'m sixty-three, and the price goes up every year I\'m not sixty-three. This is the ' +
          'whole of my ambition. It\'s not a large one. I\'ve never wanted to be rich. I\'d like to be sure."'),
      choices: [
        {
          label: 'Tell him it\'s not a modest ambition',
          effects: { castLike: { who: 'ansel', n: 2, memory: 'You said my ambition wasn\'t small.' }, castFlag: { who: 'ansel', flag: 'annuity' } },
          result: '"It\'s the largest there is," he says. "Everyone else wants the number to go up. I want it to stay." He folds the letter and puts it in the inside pocket, over the heart.',
        },
        {
          label: 'Ask how close he is',
          effects: { castLike: { who: 'ansel', n: 1, memory: 'You asked how close I was.' } },
          result: 'He tells you, to the credit, and it\'s less than half of one hundred and ten thousand. "That\'s the nice thing about a number," he says. "It doesn\'t pretend."',
        },
      ],
    },
    mid2: {
      days: 40, title: 'Two Orders',
      text: ('It\'s the loading dock, and you have two orders for the crates. Captain Pell\'s came with a grin: take the cargo from the man at the ' +
          'end of the dock, no manifest, triple the rate, and don\'t ask. Ansel\'s came in a quiet voice, in the passage: refuse it, there\'s a ' +
          'manifest or there\'s no cargo, and the man is on a list he has seen. They have both told you, and neither has told the other.'),
      choices: [
        {
          label: 'Take the cargo, as the captain said',
          effects: { castLike: { who: 'ansel', n: -1, memory: 'You took the cargo against my advice.' }, captainLike: { n: 2, memory: 'You took the cargo as I said.' } },
          result: 'You load it. The crates are heavier than they look, and the man is gone before the lock cycles, and the pay is, as promised, triple. Captain Pell kisses the roll of notes. Ansel writes the date and the weight on his sheet, and closes the cover on it.',
        },
        {
          label: 'Refuse it, as Ansel said',
          effects: { castLike: { who: 'ansel', n: 2, memory: 'You refused the cargo on my word.' }, captainLike: { n: -1, memory: 'You refused the cargo I wanted.' } },
          result: ('You refuse. The man shrugs, and takes the crates to the next ship, and the next ship is gone by morning with a cheerful crew. ' +
              'Captain Pell takes it loudly, to the galley. "Triple!" she says. "He made me refuse triple!" Ansel doesn\'t look ' +
              'up from the sheet, and his pencil isn\'t quite steady.'),
        },
      ],
    },
    late: {
      days: 55, title: 'What Ansel Knows', flag: 'secretKnown',
      text: ('Ansel has the sheet on the galley table, and he hasn\'t written on it. "I\'m going to say a number," he says. "It\'s what she owes, and ' +
          'what she has, and what she\'d need to win on a single run, and the odds of her winning it. I worked it out in a week, years ago. I\'ve ' +
          'kept it up since. It comes out the same every time." He looks at you. "I don\'t want to be a person who knew. If the last big run comes, I\'d ' +
          'like somebody else to have known."'),
      choices: [
        {
          label: 'Ask him what the odds are',
          effects: { castLike: { who: 'ansel', n: 1, memory: 'You asked me what the odds were.' } },
          result: 'He tells you: one in four. "You could stand to lose at one in four, if it were only you," he says. "That\'s the part I can\'t do anything with. It\'s never only you."',
        },
        {
          label: 'Tell him you\'ll stop her if you can',
          effects: { castLike: { who: 'ansel', n: 2, memory: 'You said you\'d stop her if you could.' }, castFlag: { who: 'ansel', flag: 'told' } },
          result: 'He looks at you across the sheet. "You can\'t," he says. "But thank you for saying it. That\'s more than I\'ve had in six years." He turns the sheet over, face down, for the first time since you\'ve known him.',
        },
      ],
      // Below friendly he keeps the number to himself, and the promise he would have drawn out (the `told` flag) is not asked for.
      closed: {
        title: 'What Ansel Knows',
        text: ('Ansel has the sheet on the galley table, and when you come in he turns it face down and keeps two fingers on it. "I had a number to ' +
            'tell you," he says. "I\'ve decided to keep it. It\'s not a number you can do anything with, and I don\'t know you well enough to ask you ' +
            'to carry it." He takes his fingers off the sheet. "It doesn\'t change. It\'ll be the same number when you\'ve been here longer."'),
        choices: [
          {
            label: 'Say it can wait',
            result: '"It can," he says. "It always could. That\'s the trouble with it." He picks up a pencil and puts it down again without writing.',
          },
        ],
      },
    },
    pivot: {
      days: 70, title: 'The Fight She Shouldn\'t Have Picked',
      get text() {
        const medic = roleHolder('medic'), low = G.state.armor <= ship().armor * 0.6;
        return ('A ship has come up on your stern, long and dark, and it\'s one of Dobrescu\'s. Captain Pell has seen it on the board and is already ' +
            'at the guns, laughing, with a figure in her head. "We can take her," she says. "We could take her." Ansel is at the boarding lock with ' +
            'his coat on and the sheet in one hand. "I\'d like to speak to them," he says. "Give me ten minutes, and the lock, and don\'t fire." He ' +
            'says it flat.')
          + (low ? ' Your hull has taken a beating, and a bad hull is a bad place to be, in either case.' : ' Your hull is sound.')
          + (medic ? ` ${medic.first} has the med kit open at the lock.` : ' There\'s nobody aboard who can do more than a field dressing, and he knows it.')
          + (roleHolder('gunner') ? ' The guns are manned, which, as he well knows, cuts both ways.' : ' Nobody else is on the guns.')
          + ' He waits for your answer, and has already put a hand on the lock.';
      },
      choices: [
        { label: 'Let him go to the lock', run: () => atTheLock(false) },
        { label: 'Send a second person with him', ...gated(needCrew(2)), run: () => atTheLock(true) },
        { label: 'Back the captain, and open fire', memory: 'You opened fire on Dobrescu\'s ship against my word.', run() {
          castFlag('ansel', 'benched'); castLike('ansel', -3, this.memory); captainLike(1, sceneSay('scene:memories', 'ansel.backed.memory')); G.state.armor = Math.round(G.state.armor * 0.7);
          return ('You give the word, and the guns speak, and the long ship answers, and for a minute it\'s loud and bright and Pell is laughing. The ' +
              'hull takes what it takes. Ansel stands at the lock with the sheet and doesn\'t say anything. When it\'s over he writes a number on it, ' +
              'and puts it in his pocket, and doesn\'t show it to anyone.');
        } },
      ],
    },
  },
};

// The first arrival (captains.js arrivalScene): Ansel settles up at the foot of the ramp.
CAST.ansel.arrival = {
  open: 'Ansel is waiting at the foot of the ramp in his coat, with the ledger held flat against his chest like a tray. He opens it at the right page and holds it out.',
  memory: ('"There are three numbers," Ansel says. "The forecast, the result, and a third that I keep for myself, which is what the run would have ' +
      'paid if something had gone wrong. It\'s smaller than people like. I won\'t show you that one." He turns the book toward you. "Yours is in your ' +
      'account. It\'s in your savings."'),
  column: '"That column is {cap}\'s," Ansel says. "I\'ve advised against it, and it\'s hers to keep."',
  pace: '"A season, if the runs hold," Ansel says. "I\'ve written down what happens if they don\'t. It\'s a longer number."',
};
