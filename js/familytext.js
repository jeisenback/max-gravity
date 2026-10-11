'use strict';

// The text tables of family.js, moved out so the logic reads on its own (#254). Data only; loaded before family.js.

const LEFT = [
  'a mine closure that emptied half the town',
  'a marriage that ended badly',
  'a debt to the wrong people',
  'wanting to see a sky that wasn\'t painted on a dome',
  'a sister who went first and wrote home about it',
  'an accident at work they still blame themselves for',
  'the rationing, and being tired of being thirsty',
  'a scholarship that fell through at the last minute'
];

const HOPES = [
  'a berth on a ship of their own someday',
  'to see one of Earth\'s oceans, just once',
  'to open a noodle stand somewhere with real gravity',
  'to get their family off {home}',
  'to finish the engineering license they started years ago',
  'to be somewhere long enough to grow something',
  'to find out what happened to their father\'s old ship'
];

// When there is no arc to move on, the talk is about what is on their mind now: how they are (a letter, an injury), the war if they
// are of a side in it, how they get on with the others, what you did last time. Each is its own short scene, with its own choices.
const TALK_IDLE = {
  talkative: 'is already telling you about something that happened at the last port, and by the second mug has told you about two more',
  nervous: 'keeps glancing at the corridor, and relaxes a little when you stay',
  generous: 'has saved you the good end of the loaf, and does not mention it',
  greedy: 'is working out, aloud and not quite to you, what the next run should clear',
  pious: 'sits with a hand around the cord at their wrist and says nothing for a long time, comfortably',
  rude: 'has a view on the galley, the rota, and the way you hold a mug, and shares them',
  curious: 'wants to know how the drive works, what you do on watch, and whether you have ever been to Titan',
  drunk: 'is on water tonight, and says so with an effort that is its own kind of story',
  secretive: 'answers a question about the weather with a question about you',
  kind: 'asks if you have slept, and does not take "fine" for an answer',
  brave: 'tells you about the worst day they have had on a ship, quietly, as if it were a recipe',
  homesick: 'has a photograph out, and puts it away when you come in, and then takes it out again'
};

const HOLIDAYS = [
  {
    m: 3,
    d: 12,
    name: 'Landing Day',
    culture: 'mars',
    text: ('{n} is up before the watch change, kneading dough with a fierce, focused joy, and the galley smells of hot, spiced, red-tinted bread. It ' +
        'is Landing Day, when the first colonists set down on Mars, and {n} has been baking for it every year of their life, from a recipe that came ' +
        'from a grandmother they can barely remember. They are already arguing with nobody in particular about the terraforming schedule, jabbing a ' +
        'floury finger at the air.'),
    join: 'The bread is dense and far too spicy, and everyone eats it anyway, with tears in their eyes and hands out for more. The argument about the terraforming schedule lasts until the flip, with three factions and one point of order, and everyone has a side, and nobody, in the end, wins.'
  },
  {
    m: 7,
    d: 20,
    name: 'Tranquility Night',
    culture: 'earth',
    text: ('{n} has the old footage of the first Moon landing queued up on the galley screen, the grainy black-and-white version, with the crackle of ' +
        'the old radio. On Earth and Luna everyone watches it tonight, all together, at the same hour, even though they have all seen it a hundred ' +
        'times. {n} sets out cups of something warm, dims the lights, and says that it is not the same without company.'),
    join: 'Two people in bulky suits bounce across gray dust, centuries ago, and a voice, tiny and tinny and calm, says the words. Nobody on the ship says anything for a while. When the picture fades, {n} wipes their eyes. In the dark someone begins to hum.'
  },
  {
    m: 8,
    d: 2,
    name: 'First Water',
    culture: 'belt',
    text: ('It is First Water, the day the first ice reached Ceres, and the oldest, quietest holiday in the Belt. {n} fills a cup from the ship\'s ' +
        'tank, slowly, without spilling a drop, and sets it on the galley table, and passes it around: each person drinks, and says the name of ' +
        'someone they have lost. It is not a happy day. It is not meant to be. It is the day that a people remember what they nearly did not survive.'),
    join: 'The cup goes around twice, in silence, warm from many hands. Some of the names you know. Most you don\'t. When it is your turn, you find you have a name, too, after all, and you say it aloud, and the room, which was waiting, lets out a breath.'
  },
  {
    m: 12,
    d: 31,
    name: 'Year\'s End',
    culture: null,
    text: ('It is the last night of {year}. {n} has strung lights across the galley, and cobbled together a table out of crates, and set out every ' +
        'bottle on the ship, and, in the middle, a single cake made of ration bars and hope. They are counting down to a midnight that means nothing ' +
        'out here, where there is no sunrise and no season, and everything, in the way that small bright rituals do.'),
    join: 'Everyone counts down together, in a ragged, cheerful roar, with the last ten seconds shouted in unison. At zero, somebody cries, somebody laughs, somebody kisses somebody, and the ship hums on, warm and steady, into the new year, carrying you all.'
  },
  {
    m: 12,
    d: 21,
    name: 'The Long Night',
    culture: 'earth',
    text: ('{n} tells you that, back on Earth, it is the longest night of the year, and that, where they grew up, the old people stayed up all ' +
        'through it, with candles, telling stories to keep the dark at bay. They have set out a single candle, real wax, saved for the purpose, in a ' +
        'jar in the middle of the galley table. "It is silly out here," they say, "where every night is the longest. But I would like to keep it."'),
    join: 'You sit, all of you, in a ring around the candle, and, one by one, tell a story. Some are funny. Some are sad. Some are not stories at all, just a few careful sentences about a place or a person. The candle burns down, and nobody moves. It gutters.'
  },
  {
    m: 10,
    d: 9,
    name: 'Dome Day',
    culture: 'mars',
    text: ('{n} is polishing a small brass plaque, worn smooth at the edges, that was, they say, cut from the first dome on Mars, three hundred years ' +
        'ago. It is Dome Day, and They have hung a strip of red-dyed cloth over the galley hatch, and there is, for some reason, a small potted fern ' +
        'on the table.'),
    join: 'You raise a glass to the domes, and to the people who built them, and to the fools who thought a dead world could be made to breathe. {n} makes a short, awkward, moving speech, and forgets the end of it, and everyone claps anyway. The fern is declared the ship\'s mascot.'
  }
];

const GOOD_NEWS = [
  '{who} got into the engineering academy on Ceres',
  '{who} had a baby, a girl, healthy and loud',
  '{who} finally paid off the family\'s water debt',
  '{who} sent a photo of the whole family at one table, laughing',
  '{who} was promoted, after nine years, to shift foreman',
  '{who} planted the first real tomatoes in the family\'s section, and they came up red',
  '{who} got a berth on a ship bound for the outer moons, and is thrilled',
  '{who} recovered from a long illness, and is walking again',
  '{who} won a little money on the ring-ball pool, and is buying everyone a round',
  '{who} sent a letter that said only "I am proud of you," and nothing else',
  '{who} passed the pilot exam on the third try',
  '{who} moved into a bigger section, with a window',
  '{who} got the loan for the shop, and the sign goes up on Monday',
  '{who} sent the first picture of a new dog, a brown one, asleep on a boot',
  'the strike at the foundry on {home} is over, and {who} is back on full shifts',
  'the water ration on {home} was lifted'
];

const BAD_NEWS = [
  '{who} is sick, and the clinic on {home} wants money up front',
  '{who} lost their job when the mine cut shifts',
  'the section where {who} lives is on emergency rationing',
  '{who} has stopped answering messages, and nobody at home will say why',
  '{who} was hurt in an accident at work, and it is not clear how badly',
  'the family\'s cabin was flooded when a pipe burst, and everything is gone',
  '{who} is being evicted, and has nowhere to go',
  '{who} has been arrested at a protest, and nobody knows for how long',
  'an old friend of {who}\'s passed away, and the funeral is next week',
  '{who} says the recyclers on {home} are failing, and the water tastes wrong',
  'the clinic on {home} is closing, and {who} has to travel two days for treatment',
  '{who} broke a leg in the market and cannot work for six weeks',
  'there was a fire in the section where {who} lives, and they are in a shelter',
  '{who} has been laid off, and the severance has not come',
  'the school where {who} teaches is closing at the end of the term',
  '{who} left a message that says only "call when you can," and the line does not connect'
];

// What a crew member puts up on the ship, what the crew say of it, and the ship's own lines (#457). Words in {braces} are filled by family.js.
const TOUCH_LINES = [
  '{n} hung a {team} pennant in the galley',
  '{n} is growing basil in a ration tin on the galley shelf',
  '{n} painted a small {home} skyline on their bunk panel',
  '{n} rigged fairy lights along the berth corridor',
  '{n} put up a picture of their {missed} by the coffee maker',
  '{n} keeps a battered copy of "{book}" in the galley for anyone to borrow',
  '{n} chalked a hopscotch grid on the cargo bay deck, and people use it',
  '{n} tied a small bell by the airlock, so you can hear who is coming and going',
  '{n} started a jar by the galley door for good news, and it already has three slips in it',
  '{n} taped a hand-drawn star chart to the cockpit bulkhead, with everybody\'s home marked in a different color',
  '{n} put a small potted succulent on the nav console, and named it, and refuses to say what',
  '{n} set up a board by the mess with everybody\'s birthday on it, in careful, curly writing'
];

const CHATTER_LINES = {
  low: ['{n} has been quiet all watch.', '{n} is rereading an old message from their {missed}.'],
  high: '{n} is humming. {n} never hums.',
  cat: ['{cat} is asleep on the reactor housing again.', '{cat} knocked a wrench off the workbench, on purpose, while making eye contact.', 'Somebody has been feeding {cat} from the good rations.'],
  touch: '{touch}, and it makes the ship feel more like home.'
};

const SHIP_LINES = {
  flying: '{ship} is still flying.',
  cat: '{cat} still sleeps on the reactor housing.',
  traditions: 'Every burn still has {list}.',
  ashore: '{n} goes ashore to see their {missed}, and comes back the next morning with red eyes and a bag of home cooking for everyone.',
  letter: 'A message for {n} at {planet}: {text}.',
  touch: '[Ship] {text}.'
};
