'use strict';

// The text tables of family.js, moved out so the logic reads on its own (#254). Data only; loaded before family.js.

// When there is no arc to move on, the talk is about what is on their mind now: how they are (a letter, an injury), the war if they
// are of a side in it, how they get on with the others, what you did last time. Each is its own short scene, with its own choices.
const TALK_IDLE = {
  talkative: 'is already telling you about something that happened at the last port, and by the second mug has told you about two more',
  nervous: 'listens for the pump to change its note, and relaxes a little when you stay',
  generous: 'has saved you the good end of the loaf, and doesn\'t mention it',
  greedy: 'is working out, aloud and not quite to you, what the next run should clear',
  pious: 'sits with a hand around the cord at their wrist and says nothing for a long time, comfortably',
  rude: 'has a view on the galley, the rota, and the way you hold a mug, and shares them',
  curious: 'wants to know how the drive works, what you do on watch, and whether you\'ve ever been to Titan',
  drunk: 'is on water tonight, and says so with an effort that\'s its own kind of story',
  secretive: 'answers a question about the weather with a question about you',
  kind: 'asks if you have slept, and doesn\'t take "fine" for an answer',
  brave: 'tells you about the worst day they\'ve had on a ship, quietly, as if it were a recipe',
  homesick: 'has a photograph out, and puts it away when you come in, and then takes it out again'
};

const HOLIDAYS = [
  {
    m: 3,
    d: 12,
    name: 'Landing Day',
    culture: 'mars',
    text: '{n} is up before the watch change, kneading dough at the galley counter. It\'s Landing Day, the day the first landers set down on Mars, and the bread is red with paprika, from {n}\'s grandmother\'s recipe. "Gran said they\'d have the air done by now," {n} says. "She said it every year."',
    join: 'The bread is dense and too hot with pepper, and everyone has a second piece anyway. The argument about the terraforming goes on until the flip, and nobody changes their mind.'
  },
  {
    m: 7,
    d: 20,
    name: 'Tranquility Night',
    culture: 'earth',
    text: '{n} has the old footage of the first Moon landing queued on the galley screen, the grey version with the radio crackle. On Earth and Luna people watch it tonight, at the same hour, though everyone has seen it. {n} puts out cups of something hot and turns the galley lights down. "It\'s not the same on your own," {n} says.',
    join: 'Two people in bulky suits bounce across grey dust, and a small, calm voice says the words. Nobody in the galley says anything. When the picture ends, {n} puts the lights back up and collects the cups.'
  },
  {
    m: 8,
    d: 2,
    name: 'First Water',
    culture: 'belt',
    text: 'It\'s First Water, the day the first ice reached Ceres. {n} fills a cup from the ship\'s tank and sets it on the galley table. Each person drinks and says the name of someone they\'ve lost. "At home the queue for the cistern gate goes on all day," {n} says.',
    join: 'The cup goes round twice. Some of the names you know. Most you don\'t. When it comes to you, you say one too. {n} fills the cup again and puts it back in the rack.'
  },
  {
    m: 12,
    d: 31,
    name: 'Year\'s End',
    culture: null,
    text: 'It\'s the last night of {year}. {n} has strung the work lights across the galley, made a table out of two crates, and put out every bottle on the ship. In the middle there\'s a cake made of ration bars. {n} is counting down to midnight, ship\'s time.',
    join: 'Everyone counts the last ten seconds together. At zero somebody cries and somebody laughs, and the cake is gone in four minutes.'
  },
  {
    m: 12,
    d: 21,
    name: 'The Long Night',
    culture: 'earth',
    text: '{n} says it\'s the longest night of the year on Earth, and where {n} grew up the old people stayed up through it with candles. There\'s a battery candle in a jar on the galley table, the kind that flickers. "You can\'t have a real one aboard," {n} says. "But I\'d like to keep it."',
    join: 'You sit round the jar and tell a story each. Some are funny. Some are a few sentences about a place or a person. Nobody gets up until the battery starts to go.'
  },
  {
    m: 10,
    d: 9,
    name: 'Dome Day',
    culture: 'mars',
    text: '{n} is polishing a small brass plaque, worn at the edges, that {n} says was cut from the first dome at Tharsis. It\'s Dome Day, and there\'s a strip of red cloth over the galley hatch.',
    join: 'You drink to the domes and the people who built them. {n} starts a speech, forgets the end of it, and sits down. Everyone claps.'
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
  '{who} sent a letter that said only "I\'m proud of you," and nothing else',
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
  '{who} was hurt in an accident at work, and it\'s not clear how badly',
  'the family\'s cabin was flooded when a pipe burst, and everything\'s gone',
  '{who} is being evicted, and has nowhere to go',
  '{who} has been arrested at a protest, and nobody knows for how long',
  'an old friend of {who}\'s passed away, and the funeral is next week',
  '{who} says the recyclers on {home} are failing, and the water tastes wrong',
  'the clinic on {home} is closing, and {who} has to travel two days for treatment',
  '{who} broke a leg in the market and can\'t work for six weeks',
  'there was a fire in the section where {who} lives, and they\'re in a shelter',
  '{who} has been laid off, and the severance hasn\'t come',
  'the school where {who} teaches is closing at the end of the term',
  '{who} left a message that says only "call when you can," and the line doesn\'t connect'
];

// What a crew member puts up on the ship, what the crew say of it, and the ship's own lines (#457). Words in {braces} are filled by family.js.
const TOUCH_LINES = [
  '{n} hung a {team} pennant in the galley',
  '{n} is growing basil in a ration tin on the galley shelf',
  '{n} painted the {home} skyline on a bunk panel',
  '{n} screwed a row of mug hooks by the galley hatch, one for each person aboard',
  'A picture of {n}\'s {missed} is taped by the coffee maker',
  '{n} keeps a copy of "{book}" in the galley for anyone to borrow',
  '{n} chalked a ring-ball tally on the cargo bay bulkhead, and people keep it up',
  '{n} labelled every locker in the hold, by hand',
  '{n} pinned the schedule for the next three ports by the galley door',
  '{n} taped a star chart to the cockpit bulkhead, with everybody\'s home marked on it',
  '{n} fixed the rattle in the berth corridor\'s air vent with a strip of tape',
  '{n} wrote everybody\'s birthday on the galley board'
];

const CHATTER_LINES = {
  low: ['{n} has been quiet all watch.', '{n} is rereading an old message from their {missed}.'],
  high: '{n} is humming. {n} never hums.',
  cat: ['{cat} is asleep on the reactor housing again.', '{cat} knocked a wrench off the workbench, on purpose, while making eye contact.', 'Somebody has been feeding {cat} from the good rations.'],
  touch: '{touch}.'
};

const SHIP_LINES = {
  flying: '{ship} is still flying.',
  cat: '{cat} still sleeps on the reactor housing.',
  traditions: 'Every burn still has {list}.',
  ashore: '{n} goes ashore to see their {missed}, and comes back the next morning with red eyes and a bag of home cooking for everyone.',
  letter: 'A message for {n} at {planet}: {text}.',
  touch: '[Ship] {text}.',
  loyal: '{first} {last} will follow {ship} anywhere now.',
  rename: 'Named the ship {ship}.',
  returned: 'The captain took me home to see my {rel}.',
  visitLetter: 'their {rel} {who} writes that a plate is laid at every meal now for the shipmate who came up, and asks when the ship is back',
  // the port page (family.js homeHtml): what is said of a shipmate, the traditions and the cat
  'page.loyal': 'loyal',
  'page.low': 'having a hard time',
  'page.high': 'in high spirits',
  'page.favor': 'has a favor to ask',
  'page.traditions': 'Traditions: {list}.',
  'page.cat': '{cat} the cat lives aboard.',
  'page.rename.label': 'Rename the ship',
  'page.rename.placeholder': 'A new name for the ship'
};

// The names: of the holidays (their titles), the traditions, the burns and the cat (#457). A holiday is found by its name here; its lines are under the same key.
const TRADITION_NAMES = { 'flip-toast': 'the flip toast', 'first-meal': 'first-night noodles', 'burn-name': 'naming the burn', 'docking-song': 'the docking song' };
const BURN_NAMES = ['The Long Sulk', 'Operation Soup', 'Tuesday Forever', 'Nobody Touch Anything', 'The Great Coffee Shortage', 'Probably Fine', 'Second Breakfast', 'Hold My Drink'];
const CAT_NAMES = ['Rivet', 'Biscuit', 'Admiral', 'Dust', 'Pumpkin', 'Lug Nut', 'Orbit', 'Nine', 'Captain Whiskers'];
