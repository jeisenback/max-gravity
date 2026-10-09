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
  const outcome = castFate('ansel', points >= 3 ? 'live' : points === 2 ? 'mark' : 'die', `Lost at the boarding lock near ${system().name}.`, 'The hand that held the sheet does not close properly.', 'xo');
  const lead = backup ? 'You send a second person to the lock with him. ' : '';
  if (outcome === 'die') {
    like(cap, -1, 'We lost Ansel at the lock.'); cap.mood = { kind: 'low', until: G.state.day + 30 };
    return lead + ('He goes to the lock alone, with the sheet in his hand, and the lock cycles, and what the people on the other side do is not ' +
        'something the board can tell you. When the lock opens again, he is not what is in it. Captain Pell comes down from the guns slowly, with the ' +
        'grin gone, and stands at the lock without moving. "He told me," she says. "Every time. He told me."')
      + (told ? ' You said you would stop her if you could. It was not in time.' : '');
  }
  castLike('ansel', 2, 'You let me go to the lock, and I came back.');
  if (outcome === 'mark') {
    cap.mood = { kind: 'low', until: G.state.day + 15 };
    return lead + ('He goes to the lock with the sheet, and it goes wrong at the second sentence, and for a minute the only sound is shouting through ' +
        'a hatch. He comes back carried, with a cut over one eye, and the hand that held the sheet is closed round it and will not open properly. ' +
        '"They have agreed to wait," he says. "I told them the odds."');
  }
  return lead + ('He goes to the lock with the sheet in his hand, and talks for eleven minutes, in a level voice, about the odds. The long ship backs ' +
      'off. He comes back with his coat buttoned wrong and says, "They have agreed to wait," and sits down on the lock coaming and does not say ' +
      'anything else for a while. Captain Pell does not make a joke. She puts a hand on his shoulder, and takes it off again.');
}

CAST.ansel = {
  first: 'Ansel', last: 'Whitcombe', culture: 'earth', home: 'Edinburgh Arcology', job: 'first officer', age: 63, role: 'xo',
  traits: ['nervous', 'kind'], wage: 65, xo: true, fragile: true,
  skills: { xo: 3, slicer: 2, engineer: 1, pilot: 0, gunner: 0 }, captain: { trade: 4, nerve: 1, thrift: 5 },
  ambition: 'Wants to retire safely, on an income nobody can touch.',
  bio: 'An actuary once, and he plans for the worst, and writes it down in small numbers. He is the brake on every one of the captain\'s schemes, and stays out of loyalty or habit; he has not decided which.',
  story: {
    left: 'a pension fund he was the actuary for, which was spent by the people he had warned', rel: 'wife', name: 'Margit',
    hope: 'a small house with a garden, and an annuity that nobody can touch',
    homeDetail: 'a flat above a bookshop with a tilted floor, a radiator that clanked in a pattern, and a wife who corrected his sums',
    favor: null,
    news: {
      good: ['{who} has found a house with a garden, and a landlord who answers letters', '{who} sent the radiator\'s pattern, transcribed, as a joke', '{who} says the annuity company has written back, and it is not a refusal'],
      bad: ['{who} says the bookshop is closing, and the flat with it', '{who} is ill, and will not say how much it costs', '{who} says the garden has been sold for a car park'],
    },
  },
  chatter: [
    'Ansel is going through the manifest with a pencil, and looking at the line that says "assorted" with great care.',
    'Ansel has written the probability of everything on a card, and the card is in his pocket, and he does not take it out.',
    'Ansel: "I do not say it will go wrong. I say that if it does, here is the sheet."',
    'Ansel eats his lunch at the same table, in the same chair, from the same tin, with a faint, sustained look of worry.',
    'Ansel has put a second set of fuel orders in the drawer, the cautious ones, in case.',
    'Ansel: "She has never lost on a Tuesday. I do not know what that means. I am watching it."',
  ],
  scenes: {
    intro: {
      title: 'The Sheet',
      text: ('Ansel Whitcombe is at the galley table with a pencil, a ruled sheet, and a cup of tea he has forgotten. He is old for the work and neat ' +
          'for the ship, and he writes in small numbers. "I am the first officer," he says, not looking up. "I am also, though nobody asked me to be, ' +
          'the person who tells the captain the probability. I tell her. She says, Good, and does it anyway." He turns the sheet round so you can see: ' +
          'columns, and a figure at the bottom. "I am not a pessimist. I was an actuary. It is the same thing, with better pay, and then it was not."'),
      choices: [
        {
          label: 'Ask him what the figure means',
          effects: { castLike: { who: 'ansel', n: 2, memory: 'You asked what the figure meant.' } },
          result: '"It is the chance she gets all the way home," he says. "From where we are, with what she owes. It is not a bad figure. It is not a good one." He takes the sheet back and folds it, once. "I do not show it to the captain. She would bet on it."',
        },
        {
          label: 'Ask him why he stays',
          effects: { castLike: { who: 'ansel', n: 1, memory: 'You asked why I stay.' } },
          result: '"Habit, or loyalty," he says, after a moment. "I have not decided which, and I have been deciding for six years." He seems surprised to have been asked. "I would say it was the pay, but I have seen the pay."',
        },
      ],
    },
    mid1: {
      days: 25, title: 'The Annuity',
      text: ('Ansel has a letter from an annuity company, and has read it several times. "A guaranteed income, for life, with no clauses," he says. ' +
          '"It costs eleven thousand, which I do not have, and I am sixty-three, and the price goes up every year I am not sixty-three. This is the ' +
          'whole of my ambition. It is not a large one. I have never wanted to be rich. I would like to be sure."'),
      choices: [
        {
          label: 'Tell him it is not a small ambition',
          effects: { castLike: { who: 'ansel', n: 2, memory: 'You said my ambition was not small.' }, castFlag: { who: 'ansel', flag: 'annuity' } },
          result: '"It is the largest there is," he says, thoughtfully. "Everyone else wants the number to go up. I want it to stay." He folds the letter and puts it in the inside pocket, over the heart, where, you suspect, it has been for some time.',
        },
        {
          label: 'Ask how close he is',
          effects: { castLike: { who: 'ansel', n: 1, memory: 'You asked how close I was.' } },
          result: 'He tells you, to the credit, and it is a good deal further than you hoped. He does not seem troubled by it. "That is the nice thing about a number," he says. "It does not pretend."',
        },
      ],
    },
    mid2: {
      days: 40, title: 'Two Orders',
      text: ('It is the loading dock, and you have two orders for the crates. Captain Pell\'s came with a grin: take the cargo from the man at the ' +
          'end of the dock, no manifest, triple the rate, and do not ask. Ansel\'s came in a quiet voice, in the passage: refuse it, there is a ' +
          'manifest or there is no cargo, and the man is on a list he has seen. They have both told you, and neither has told the other.'),
      choices: [
        {
          label: 'Take the cargo, as the captain said',
          effects: { castLike: { who: 'ansel', n: -1, memory: 'You took the cargo against my advice.' }, captainLike: { n: 2, memory: 'You took the cargo as I said.' } },
          result: 'You load it. The crates are heavier than they look, and the man is gone before the lock cycles, and the pay is, as promised, triple. Captain Pell kisses the roll of notes. Ansel writes the date and the weight on his sheet, and closes the cover on it, quietly, like a lid.',
        },
        {
          label: 'Refuse it, as Ansel said',
          effects: { castLike: { who: 'ansel', n: 2, memory: 'You refused the cargo on my word.' }, captainLike: { n: -1, memory: 'You refused the cargo I wanted.' } },
          result: ('You refuse. The man shrugs, and takes the crates to the next ship, and the next ship is gone by morning with a cheerful crew. ' +
              'Captain Pell takes it well, which is to say loudly. "Triple!" she says, to the galley. "He made me refuse triple!" Ansel does not look ' +
              'up from the sheet, and his pencil is not quite steady.'),
        },
      ],
    },
    late: {
      days: 55, title: 'What Ansel Knows',
      text: ('Ansel has the sheet on the galley table, and he has not written on it. "I am going to say a number," he says. "It is what she owes, and ' +
          'what she has, and what she would need to win on a single run, and the odds of her winning it. I worked it out in a week, years ago. I have ' +
          'kept it up since. It comes out the same every time." He looks at you. "I do not want to be a person who knew. If the last big run comes, I ' +
          'would like somebody else to have known."'),
      choices: [
        {
          label: 'Ask him what the odds are',
          effects: { castLike: { who: 'ansel', n: 1, memory: 'You asked me what the odds were.' } },
          result: 'He tells you, and you wish he had not. It is not a small figure and it is not a large one, and it is somewhere you could stand to lose, if it were only you. "That is the part I cannot do anything with," he says. "It is never only you."',
        },
        {
          label: 'Tell him you will stop her if you can',
          effects: { castLike: { who: 'ansel', n: 2, memory: 'You said you would stop her if you could.' }, castFlag: { who: 'ansel', flag: 'told' } },
          result: 'He looks at you for a long time. "You cannot," he says, gently. "But thank you for saying it as if you could. That is more than I have had in six years." He turns the sheet over, face down, for the first time since you have known him.',
        },
      ],
      // Below friendly he keeps the number to himself, and the promise he would have drawn out (the `told` flag) is not asked for.
      closed: {
        title: 'What Ansel Knows',
        text: ('Ansel has the sheet on the galley table, and when you come in he turns it face down and keeps two fingers on it. "I had a number to ' +
            'tell you," he says. "I have decided to keep it. It is not a number you can do anything with, and I do not know you well enough to ask you ' +
            'to carry it." He takes his fingers off the sheet. "It does not change. It will be the same number when you have been here longer."'),
        choices: [
          { label: 'Say it can wait', run: () => '"It can," he says. "It always could. That is the trouble with it." He picks up a pencil and puts it down again without writing.' },
        ],
      },
    },
    pivot: {
      days: 70, title: 'The Fight She Should Not Have Picked',
      get text() {
        const medic = roleHolder('medic'), low = G.state.armor <= ship().armor * 0.6;
        return ('A ship has come up on your stern, long and dark, and it is one of Dobrescu\'s. Captain Pell has seen it on the board and is already ' +
            'at the guns, laughing, with a figure in her head. "We can take her," she says. "We could take her." Ansel is at the boarding lock with ' +
            'his coat on and the sheet in one hand. "I would like to speak to them," he says. "Give me ten minutes, and the lock, and do not fire." He ' +
            'says it flat.')
          + (low ? ' Your hull has taken a beating, and a bad hull is a bad place to be, in either case.' : ' Your hull is sound, which is something.')
          + (medic ? ` ${medic.first} has the med kit open at the lock.` : ' There is nobody aboard who can do more than a field dressing, and he knows it.')
          + (roleHolder('gunner') ? ' The guns are manned, which, as he well knows, cuts both ways.' : ' Nobody else is on the guns.')
          + ' He waits for your answer, and has already put a hand on the lock.';
      },
      choices: [
        { label: 'Let him go to the lock', run: () => atTheLock(false) },
        { label: 'Send a second person with him', ...gated(needCrew(2)), run: () => atTheLock(true) },
        { label: 'Back the captain, and open fire', run() {
          castFlag('ansel', 'benched'); castLike('ansel', -3, 'You opened fire on Dobrescu\'s ship against my word.'); captainLike(1, 'You backed me when I picked the fight.'); G.state.armor = Math.round(G.state.armor * 0.7);
          return ('You give the word, and the guns speak, and the long ship answers, and for a minute it is loud and bright and Pell is laughing. The ' +
              'hull takes what it takes. Ansel stands at the lock with the sheet and does not say anything. When it is over he writes a number on it, ' +
              'and puts it in his pocket, and does not show it to anyone.');
        } },
      ],
    },
  },
};

// The first arrival (captains.js arrivalScene): Ansel settles up at the foot of the ramp.
CAST.ansel.arrival = {
  open: 'Ansel is waiting at the foot of the ramp in his coat, with the ledger held flat against his chest like a tray. He opens it at the right page and holds it out.',
  memory: ('"There are three numbers," Ansel says. "The forecast, the result, and a third that I keep for myself, which is what the run would have ' +
      'paid if something had gone wrong. It is smaller than people like. I will not show you that one." He turns the book a little. "Yours is in your ' +
      'account. Look at the header."'),
  column: '"That column is {cap}\'s," Ansel says. "I have advised against it, and it is hers to keep."',
  pace: '"A season, if the runs hold," Ansel says. "I have written down what happens if they do not. It is a longer number."',
};
