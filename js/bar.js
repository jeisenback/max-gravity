'use strict';

// The bar at every port: a Bar tab with the room's mood (from local conditions, the
// feeds, and your crew), a few patrons to talk to, people you already know who are
// in town, and crew looking for a ship. Strangers become people you know once you
// deal with them (st.people), so they can turn up again. Loaded before game.js;
// only calls into it at runtime.

const DRINK = 200, CARDS = 2000;

const BARS = {
  'Hermes Foundry': ['The Heat Sink', ('Foundry shifts change every six hours, and the bar fills and empties with them. Everyone is red through two ' +
      'layers of shielding. The ice in the drinks costs more than the liquor. The bartender slides your glass down the bar without looking. The place ' +
      'smells of cold metal and lime. Nobody stays for more than one round, and everybody says they are here for a couple more years.')],
  Earth: ['The Gravity Well', ('A spaceport bar with a long copper counter and travel posters from a dozen ports curling on the walls. The drinks are ' +
      'real, and so are the prices. At the far end a man in a good coat is telling a story about the sea to a table of freight hands, and he is paying for ' +
      'every round.')],
  Luna: ['Copernicus Lounge', ('Low gravity, a long bar, and Arcology Pact officers in civilian jackets that do not fit. The bartender pours slow on ' +
      'purpose: in one-sixth g the drinks come out in tall ribbons and take a long time to settle. A window behind the bar looks out on the gray ' +
      'plain, the drydocks and, past them, Earth. People keep their voices down.')],
  Mars: ['The Red Line', ('Tharsis veterans at one end of the bar, terraforming engineers at the other, and in the middle an argument about the ' +
      'atmosphere that has run for forty years. The bar top is one slab of red basalt. Most people order coffee. A countdown is chalked on the wall: ' +
      'DAYS UNTIL THE FIRST RAIN. Someone updates it every morning.')],
  'Phobos Yards': ['Dry Dock', ('Shipwrights at tables where they can see the yard through a wide window: gantries, and the welded ribs of a ' +
      'half-finished hull. Every table has a ship part on it and someone explaining it on a napkin. There is a jar behind the bar for lost tools. In ' +
      'the corner an old man is asleep in a chair. They say he built the first hull that left Phobos. Nobody wakes him.')],
  'Ceres Station': ['The Warren', ('Warren folk, three deep at the bar, talking with their hands in a mix of dialects. The water ration is posted over the ' +
      'taps in block letters and updated on the hour. Every drink comes with a small glass of tap water, because the law says so. The floor tilts ' +
      'toward the curve of the station, and the regulars lean with it.')],
  'Ring Nine': ['Auntie Oyelaran\'s', ('A noodle counter with a still behind it, in a corner of an old cargo bay, with paper lanterns strung from the ' +
      'pipes. Squatter families and off-shift dockers sit on stools made from fuel drums. The menu is one hand-lettered board. Auntie says the broth ' +
      'is the best in the Belt, points a wooden spoon at your chest, and says it again. By the till is a shrine to the ship\'s old captain, with a ' +
      'dish of fresh noodles in front of it. Nobody takes them.')],
  'Pallas Refinery': ['The Slag Heap', ('Refinery crews in heat suits unzipped to the waist, steaming in the cool air. By custom no stranger pays for ' +
      'the first round, and the bartender enforces it with a raised eyebrow. The tables are old casting molds, still warm. Signed work jackets hang on ' +
      'the walls like flags, one for every crew that lost someone. It smells of hot metal and beer.')],
  'The Hollows': ['The Chute', ('A bar in an old ore chute, dim and hung with quilts, with a long curved counter cut from the rock. Children ' +
      'underfoot, grandparents at dominoes, a ring-ball match on every screen, and an argument at every table. Someone\'s aunt pours the drinks. ' +
      'Someone\'s cousin plays the fiddle badly. A bowl of salted beans reaches you within a minute of sitting down. Nobody asks your business.')],
  'The Rook': ['The Gallows', ('Hollis Mbeki\'s people drink here. Their tables are known, and nobody sits at them by mistake. The ceiling is low and ' +
      'made of dull black pipe, and a rope with a noose knotted in it hangs over the bar as a joke. It has collected a great many hats. Keep your ' +
      'hands where people can see them. The bartender is polite.')],
  Boneyard: ['The Wreck Room', ('Built inside the bridge of a dead ore hauler. The captain\'s chair is still bolted to the floor, and by custom ' +
      'nobody sits in it. The old instruments are in place, dark and dusty. The original viewport looks out on a hundred other wrecks lashed together. ' +
      'Salvagers trade rumors of fresh wrecks over thick sweet coffee. At closing they switch on the old running lights, one after another.')],
  Ironheart: ['Co-op Hall', ('Half bar, half meeting hall, with a long trestle table down the middle and a cracked gavel on a hook. Most nights there ' +
      'is a vote on something, and the losers buy the next round. The ballot box is a fuel can. The minutes of every meeting are pinned to the wall in ' +
      'handwriting that runs from neat to unreadable. Newcomers are expected to speak.')],
  'Juno Commons': ['The Greenhouse', ('Tables among tomato vines under a curved glass dome. The air is warm and wet and smells of leaves. Within the ' +
      'hour people will ask your name, your ship, and how you take your tea. A small brass watering can hangs at every table, and when you sit, ' +
      'someone hands you one to water the vine over your seat.')],
  'Eros Old Town': ['The Last Strike', ('Sepia holos of the boom years flicker on the walls: crowds, dust, hopeful faces. The regulars are old enough ' +
      'to be in them, and will say which one. The bar is a plank from a mining sledge, dented by a hundred picks. On a shelf behind it, in a glass ' +
      'case, sits one nugget of platinum. Nobody has been able to prove it is real.')],
  Ganymede: ['Harvest Moon', ('Agri-dome workers with dirt under their nails and money in their pockets. A skylight overhead fills with Jupiter, ' +
      'banded and slow. The bar is polished wood, brought from Earth, they say. The drinks are made from whatever came in that week: peach, pear, wild ' +
      'honey, something with rosemary. The air smells of ripe fruit.')],
  Europa: ['The Crack', ('Ice haulers between runs, in bulky insulated jackets, bent over steaming mugs. The walls sweat. The floor is always wet. ' +
      'Union notices are three layers deep on every bulkhead. One blue lamp lights the room, and the only sound is the ice groaning beneath it. When ' +
      'they come in, the regulars tap the wall twice. Nobody explains it, and nobody skips it.')],
  Titan: ['Orange Sky', ('Consortium clerks and methane-rig crews at separate tables, with a space down the middle of the room that nobody crosses. ' +
      'The window looks out on rain, a slow amber curtain, and the light all day is the color of weak tea. The drinks are quiet and expensive. The ' +
      'bartender is at your elbow the moment your glass is empty, and gone before you can say thank you.')],
  Enceladus: ['Geyser Bar', ('Six stools and a window on the plumes, which rise white and silent against the black. The bartender is also the ' +
      'harbormaster, the doctor and, when it comes up, the mayor. A first-aid kit sits next to the bottles, and a shortwave radio on the bar. One ' +
      'bottle of something good stays on the top shelf. It is not for sale. Everyone is offered a glass of it, sooner or later.')],
  'Triton Outpost': ['The Long Night', ('The last bar in the solar system, according to a hand-painted sign. A jar of coins from every port sits on ' +
      'the bar; people leave one to show they came. The people here are either running from something or waiting for someone, and the ones waiting ' +
      'keep their eyes on the door. The stove in the corner burns whatever will burn. The light is dim and orange.')],
};


const OPENERS = {
  talkative: [
    'They\'re halfway through a story when you sit down, and start it again for you from the top.',
    '"You\'re off a ship? Which?" They don\'t wait. "I did six years on a bulk carrier. Don\'t, ever."',
    'They\'ve been talking to the bartender, and turn to you without stopping.'
  ],
  nervous: [
    'They keep looking at the departures board behind the bar.',
    'They move their bag off the stool for you, and then hold it on their lap.',
    'They\'ve torn the label off their bottle in strips and started on the coaster.'
  ],
  generous: [
    'They push the bowl of nuts your way.',
    '"I ordered two by mistake," they say, and slide one over.',
    'They\'re splitting a plate of dumplings with whoever sits down, which is you.'
  ],
  greedy: [
    'They\'re going down a pay slip line by line, with a pen.',
    '"What\'s the day rate on your ship?" they ask, before your name.',
    'They ask the bartender what the second round costs before they\'ve finished the first.'
  ],
  pious: [
    'There\'s a prayer cord round their wrist, worn smooth.',
    'They say a few words over the glass before they drink.',
    'They have a small book open on the bar, and close it on a finger to keep the place.'
  ],
  rude: [
    '"That one\'s taken." It isn\'t.',
    'They look at you, and then at the empty stools further down.',
    '"If you\'re selling something, no."'
  ],
  curious: [
    '"What are you on? What\'s she burn?" they ask, before you\'ve sat down.',
    'They want to know where you came in from, how long it took, and what the dock charged.',
    'They read the patch on your jacket and ask what it\'s for.'
  ],
  drunk: [
    'They\'re a few drinks ahead of you, and pleased about it.',
    'They call you by someone else\'s name, and then decide that\'s fine.',
    'They hold up a finger for you to wait, finish telling the bartender something, and lose it.'
  ],
  secretive: [
    'They turn their terminal face down when you sit.',
    'They ask where you\'re in from, and when you ask back, they say "Around."',
    'They pay for each drink as it comes, in cash.'
  ],
  kind: [
    '"Have you eaten?" they ask. "The soup\'s all right here."',
    'They pour you a glass of water from their jug before they say anything.',
    'They move along the bench to make room, and move their coat.'
  ],
  brave: [
    'There\'s a new burn scar up one forearm, still pink.',
    'They did an outside job on a hull this morning and are still in the undersuit.',
    'They have a fresh dressing on one hand. "Clamp," they say. "My fault. I\'d do it the same."'
  ],
  homesick: [
    'They\'re watching a message on their terminal, an old woman talking in a kitchen. They play it again.',
    'They have a photo taped inside the lid of their lunch tin, and the lid is open.',
    '"Where\'s home?" they ask, and tell you theirs before you can answer.'
  ]
};

const SECRET_TALK = {
  contraband: [
    'keeps their voice down: "If you ever need something moved and not looked at, I know people."',
    'asks whether your hold gets inspected at every port, or just some.'
  ],
  wanted: [
    'goes quiet when a patrol officer comes in, and looks at their drink until the officer leaves.',
    'stops talking every time the door opens.'
  ],
  ill: [
    'coughs into their sleeve. "Recyclers on my last ship," they say. "It\'ll pass."',
    'coughs, and folds the cloth away before you can see it.'
  ],
  spy: [
    'asks a lot about your routes, and says nothing about theirs.',
    'asks small, exact things: which ports, which days, how long you sat in the queue.'
  ],
  debt: [
    'says, three drinks in, that they owe more than they\'ll make this year, and not to a bank.',
    'checks their messages, and puts the terminal away without answering any.'
  ]
};

const CREW_AT_BAR = {
  engineer: [
    '{n} is sketching a drive modification on a napkin for anyone who will look.',
    '{n} has found the one other engineer here. They are arguing about injectors.',
    '{n} is holding a fork up to the light and saying "tolerances" under their breath.',
    '{n} is under a table with a flashlight, looking at the bar\'s wiring.',
    '{n} has been handed a wrench by the bartender and is fixing the tap.',
    '{n} is explaining the coolant loop to a stranger with four salt shakers and a pool of gravy.'
  ],
  pilot: [
    'The flip burn in {n}\'s story is two g harder than it was an hour ago.',
    '{n} is losing at darts and blaming the gravity.',
    '{n} has drawn a lane map in spilled beer and is arguing for it with anyone who comes by.',
    '{n} and another pilot at the far end of the bar are arguing about angles, in hand gestures.',
    '{n} is sitting straight, listening to a stranger\'s story about a bad landing. {n} winces at the landing.',
    '{n} is standing on a chair, demonstrating a docking maneuver with two glasses and a napkin.'
  ],
  gunner: [
    '{n} is arm-wrestling a dockworker, and winning.',
    '{n} sits with their back to the wall and watches hands, not faces.',
    '{n} is cleaning a cup with the hem of their shirt and watching the door.',
    '{n} has won a small bet on a dart throw and is refusing the money.',
    '{n} shares a corner table with an old navy veteran. Neither has spoken in an hour. Both have ordered a second round.',
    '{n} is telling a quiet story about a jammed gun and a captain who never found out.'
  ],
  quartermaster: [
    '{n} is working the room, buying no drinks.',
    '{n} is haggling with the bartender over the price of a bottle.',
    '{n} is making a list on the back of a receipt.',
    '{n} is talking with a grain merchant. A price has been mentioned twice.',
    '{n} is listening to a stranger\'s theory about the price of water and taking notes.',
    '{n} has a very large bag of dried figs and is handing them out to the room.'
  ],
  slicer: [
    '{n} is at a corner table, doing something to the bar\'s jukebox.',
    '{n} is on their terminal with their back to the room.',
    '{n} has taken over the bar\'s music. Nobody has complained.',
    '{n} is watching the bar\'s security feed on a very small screen.',
    '{n} is talking to the bartender, low, about the till. The bartender counts it twice.',
    '{n} has made three friends and one enemy in the last ten minutes.'
  ],
  medic: [
    '{n} is patching up someone who lost an argument with a bulkhead.',
    '{n} is nursing one drink and watching everyone else\'s.',
    '{n} has been cornered by a stranger with a rash.',
    '{n} is giving a short lecture on hydration to a table of dockers.',
    '{n} is sitting alone with an empty glass in both hands.',
    '{n} is showing the bartender how to bandage a burn, with a napkin.'
  ],
};

// What happens at the table, so the same four doors do not open onto the same rooms. Variants are picked by the person (a hash of
// their name, so no random draw) where they are about who someone is, and at random where they are about the night.
const WORK_GROUP = [[/dock|rigger|salvag|miner|ore |ice |haul|crane|freight/i, 'hands'], [/engineer|tech|weld|chemist|hydro|model|architect|mechanic/i, 'tech'], [/navy|veteran|pilot|guard|officer/i, 'service']];
const BAR_WORK = {
  hands: [
    '"Twelve hours. Two on the crane, ten waiting for the crane," {n} says. "They pay the waiting at half." They hold up their terminal with the pay slip on it.',
    '{n} shows you a hand with two fingers that don\'t close all the way. "Clamp," they say. "Supervisor signed it off as checked." They don\'t say his name.',
    '"There\'s a union on the next dock over," {n} says. "Not on ours. Ours pays a bit more, so there won\'t be."'
  ],
  tech: [
    '"The board wants four hundred to renew my licence," {n} says. "Every three years. It\'s the same exam I passed."',
    '{n} puts a pump seal on the bar. "Rated for two years. That came out at eight months." They put it back in their pocket.',
    '"Half the job\'s the log," {n} says. "If it isn\'t in the log you didn\'t do it. If it is, you did it wrong."'
  ],
  service: [
    '{n} did nine years in the navy and won\'t say where. They\'ll say the food was better than this.',
    '"Guard contract. Ninety days, renewable," {n} says. "It\'s been renewed four times. Every time it\'s ninety days."',
    '"They keep your record," {n} says. "Every posting, every mark. I\'ve got one mark, from my second year. It\'s still the first thing anyone reads."'
  ],
  other: [
    '"It\'s the hours, mostly," {n} says. "And the people. Mostly the hours."',
    '"I wasn\'t going to do this for long," {n} says. "That was nine years ago."',
    '{n} tells you about a shipment logged to the wrong bay, and who got the mark for it, which was them. "It was the system\'s mistake," they say. "The system doesn\'t have a record."'
  ]
};
const BAR_SILENCE = [
  'You sit with {n} and neither of you says anything. After a while {n} pushes the bowl along the bar toward you.',
  'You share the table. {n} reads something on their terminal, and you watch the room. Twenty minutes go by.',
  '{n} turns the glass a quarter turn on the bar, and again. You don\'t ask.',
  'Neither of you has anywhere to be. When you stand to go, {n} lifts a hand without looking up.'
];
const BAR_PLACE = [
  '"{bar}\'s been here longer than the owners," {n} says. "They\'re the third lot. It\'s the same bartender."',
  '"Don\'t have the fish," {n} says. "The bartender says it\'s from a tank. Ask which tank."',
  '{n} points out the table where the agency man sits on Fridays, when he does the sign-ons.',
  '"They put the prices up when a big ship\'s in," {n} says. "There\'s a board. Look, they\'ve changed it since you sat down."',
  '"They tried to close {bar} twice," {n} says. "The first time the regulars paid the rent. The second time nobody could find the owner."'
];
const BAR_CARD_WIN = [
  'Three hands, slow and close. On the last one you take {cr} cr off {n}, who says you were counting.',
  '{n} plays fast and bets on everything. You wait them out, and take {cr} cr.',
  'You let {n} talk, and they talk themselves into a bad bet. {cr} cr.',
  'The cards run your way. {n} changes seats, then decks. {cr} cr to you.'
];
const BAR_CARD_LOSE = [
  '{n} takes {cr} cr off you, and spends some of it on your next drink.',
  '{n} plays like someone who learned on long watches, slow and never in a hurry. {cr} cr, and you can\'t find where you went wrong.',
  'You have the better hand most of the night, and not at the end. {cr} cr.',
  '{n} shows you their last hand. You\'d have folded it. {cr} cr.'
];
const BAR_HOME_TALK = [
  '"{home}?" {n} shrugs. "My mum\'s still there. My sister. She sends a message every week, and every week it\'s the lease." They drink. "It went up again."',
  '"I send most of it home," {n} says. "My kids are with my mother. The little one thinks I live in the terminal."',
  '{n} plays you a message from {home}: an old man in a kitchen, reading out the football scores. "My dad. He records them twice, in case the first one doesn\'t go."',
  '"I\'ll go back when the lease comes up," {n} says. "If they renew it. They don\'t renew many."'
];
const BAR_BLESS = [
  '{n} asks the ship\'s name, and says a few words over it, quietly, in a language you don\'t know. Then they touch your hand.',
  '{n} takes a cord from their wrist, knots it three times, and gives it to you for the ship. "Hang it by the lock," they say. "It won\'t stop a rock."',
  '{n} doesn\'t close their eyes. They say it in an ordinary voice, like directions: where the ship should go if it\'s lost, and who to ask.'
];
const BAR_LEAVE = [
  'You leave {n} to their drink.',
  'You nod, and {n} nods.',
  '"Safe burn," {n} says, to your back.',
  'You finish what\'s in your glass. {n} has already turned back to the bar.'
];
const BAR_DRINK_TALK = [
  '"{home}\'s all right," {n} says. "My dad\'s still in the same flat. The agency had my first eleven months before I saw a credit, so that\'s where the first year went." They order another.',
  '{n} shows you the deductions on their last pay slip: agency, berth, air, kit hire. "Kit hire," they say. "It\'s a pair of boots."',
  '{n} asks which agency you came through, and makes a face. "They held my pay for three ports once. Said the ship hadn\'t paid them yet."',
  '"Last ship paid us two weeks late," {n} says, "and took berth off us for the two weeks."',
  '{n} tells you about a captain they had who paid for the crew\'s relay slot on birthdays. "Only one I\'ve had who did."'
];

// What the person is like colors what they say: a line for each of their first two traits (70% of the time, else the shared pool),
// for the kinds of thing that used to be the same for everyone.
const BAR_TRAIT = {
  talkative: {
    win: '{n} talks all through the hand, mostly about their last captain, and bets without looking at their cards. You take {cr} cr.',
    lose: '{n} keeps talking, and keeps winning. "Sorry, was that a raise? That\'s {cr}, then."',
    drink: '{n} had the berth next to the recycler on their last ship. "Every forty minutes. You could set your watch by it." They think. "I did, actually."',
    leave: '"Oh, one more thing," {n} says, and it\'s three more things, and you\'re at the door before the last one.',
    quiet: '{n} lasts about a minute. "Sorry. Is this a quiet thing? I can do quiet." They last another minute.'
  },
  nervous: {
    win: '{n} plays small, folds early, and checks the time twice. You take {cr} cr.',
    lose: '{n} plays every hand the same careful way, and it works. They count the {cr} cr twice before they put it away.',
    drink: '{n} holds the glass in both hands. "My contract\'s up at the next port," they say. "They said they\'d tell me by now."',
    leave: '{n} half stands when you do, and sits again. "Right. Yes. Safe burn."',
    quiet: '{n} sits with their hands flat on the bar. After a while they stop checking the board.'
  },
  generous: {
    win: 'You take {cr} cr off {n}, who laughs and orders a round anyway.',
    lose: '{n} wins {cr} cr and tries to give half of it back. You won\'t take it, so they buy the drinks.',
    drink: '{n} won\'t let you pay. "I had a bosun who stood me drinks for a year while I was paying off the agency," they say. "I\'m still working through it."',
    leave: '{n} wraps the rest of the dumplings in a napkin and pushes them at you. "Take them. I\'ll only eat them."',
    quiet: '{n} slides the bowl across, and then their water.'
  },
  greedy: {
    win: '{n} watches the {cr} cr go across the table, and writes the figure on the back of a pay slip.',
    lose: '{n} takes the {cr} cr and counts it. "A pleasure," they say.',
    drink: '{n} knows the price of everything in here, and what it was last month. "The drinks went up four percent when the new berth fees came in," they say.',
    leave: '"Your round next time," {n} says.',
    quiet: '{n} does sums on a pay slip for twenty minutes, and at the end underlines one figure twice.'
  },
  pious: {
    win: '{n} touches the cord at their wrist before each hand, and loses {cr} cr to you anyway. "It isn\'t for cards," they say.',
    lose: '{n} wins {cr} cr and puts some of it in a separate pocket. "For the shrine."',
    drink: '{n} says a few words over the glass. "My mother says it over the water ration every day," they say. "I do the drinks."',
    leave: '"Go safe," {n} says, and touches two fingers to the bar.',
    quiet: '{n} bows their head at the watch change, and you sit with them, and after a while they lift it again.'
  },
  rude: {
    win: '{n} loses {cr} cr and says the deck\'s marked. It isn\'t. They pay.',
    lose: '{n} takes the {cr} cr. "That wasn\'t close," they say.',
    drink: '"This is the worst bar on the dock," {n} says, "and I\'ve been in all of them." They order another.',
    leave: '"Don\'t let me keep you," {n} says.',
    quiet: '{n} says nothing for a long time. "You\'re all right," they say in the end. "For a hand."'
  },
  curious: {
    win: '{n} wants to know how you knew, and plays the next hand to find out. You take {cr} cr.',
    lose: '{n} wins {cr} cr and asks you to show them where you went wrong. You can\'t.',
    drink: '{n} asks about your ship: the drive, the crew, the run, what the captain pays. When you tell them what a hand clears after deductions, they work it out again on a napkin.',
    leave: '"Which way are you headed?" {n} asks, as you go.',
    quiet: '{n} tries saying nothing too. They last four minutes, and then ask what you were thinking about.'
  },
  drunk: {
    win: '{n} forgets which cards they kept, and laughs when you show them. You take {cr} cr. They order another.',
    lose: '{n} wins {cr} cr and can\'t tell you what the game was.',
    drink: '{n} tells you the same story twice, about a captain who paid them in fuel vouchers, and it ends differently each time.',
    leave: '{n} waves, a little to your left. "Safe burn."',
    quiet: '{n} falls asleep with their head on their arm. The bartender takes the glass away.'
  },
  secretive: {
    win: '{n} loses {cr} cr without a word, and turns their terminal face down.',
    lose: '{n} wins {cr} cr, and asks what your ship\'s carrying, and who for.',
    drink: '{n} asks most of the questions. By the end of the drink they know your ship, your run and your captain, and you know they came in on the last shuttle.',
    leave: '"We didn\'t talk," {n} says.',
    quiet: '{n} puts the terminal away. They don\'t ask you anything.'
  },
  kind: {
    win: '{n} loses {cr} cr, and asks if you\'ve slept. "You look like you came off a long watch."',
    lose: '{n} wins {cr} cr and spends some of it on soup for you.',
    drink: '{n} asks about you, and waits for the answer. By the end of the glass you\'ve told them about your last watch.',
    leave: '"Look after yourself," {n} says.',
    quiet: '{n} moves along the bench and pours you a cup from their pot of tea.'
  },
  brave: {
    win: '{n} puts everything on the last hand and loses {cr} cr to you. "Again?"',
    lose: '{n} wins {cr} cr on a bluff, and shows you the hand: nothing.',
    drink: '{n} tells you about a hull job that went wrong: a tether clip that wasn\'t seated, and four seconds before they got a hand on the rail. "I check the clip twice now," they say.',
    leave: '"If you need a hand outside," {n} says, "I\'m on the board here till the tenth."',
    quiet: '{n} sits easy, with their back to the room.'
  },
  homesick: {
    win: '{n} isn\'t watching the cards. You take {cr} cr off them, and it\'s a moment before they notice.',
    lose: '{n} wins {cr} cr, and puts it in an envelope with a name on it.',
    drink: '{n} plays you a message from {home}: a kid reading a school report out loud. {n} knows the words.',
    leave: '"If you\'re ever on {home}," {n} says, and doesn\'t finish.',
    quiet: '{n} sets a photo on the bar between you, and you both look at it.'
  }
};
const BAR_GOAL = {
  home: '{n} has the route home written on the back of a ticket: three more ports, maybe four.',
  family: '{n} has a present for a niece in a bag on the bar. "Do twelve-year-olds still like these?"',
  job: '{n} has an interview at the end of the trip, and the questions they think they\'ll get open on their terminal.',
  fresh: '{n} is starting again somewhere else. They don\'t say from what.',
  research: '{n} has an instrument case between their feet, and keeps a foot against it.',
  pilgrim: '{n} is travelling to a shrine a long way out, on the cheapest berth every leg.',
  medical: '{n} is going to see a specialist a long way out. They sit carefully, one hand at their side.',
  vague: '{n} is travelling. Asked where, they name the next port and no further.'
};
const barTrait = (kind, p, generic) => {
  const trait = barLines('trait'), own = p.traits.slice(0, 2).map(t => (trait[t] || {})[kind]).filter(Boolean);
  return own.length && Math.random() < 0.7 ? pick(own) : pick(generic);
};
// How they take you, for someone you know: a friend teases, an enemy keeps it stiff.
const barTone = (pat, p) => (!pat.known ? '' : p.opinion >= OPINION.FRIEND ? ` ${p.first} grins. "Same again, next port."` : p.opinion <= OPINION.ENEMY ? ` ${p.first} keeps it short.` : '');

const workGroup = job => (WORK_GROUP.find(([re]) => re.test(job || '')) || [null, 'other'])[1];
const byName = (p, salt, n) => Math.abs(hash(`${p.first}${p.last}${salt}`)) % n;  // the person's own pick, the same every time
const barSays = (line, p, extra = {}) => line.replace(/\{n\}/g, p.first).replace(/\{home\}/g, p.home).replace(/\{bar\}/g, (G.barState || {}).name || 'this place').replace(/\{cr\}/g, extra.cr || '');

function barOf(planet) {
  const b = BARS[planet.name];
  return b ? { name: b[0], vibe: b[1] } : { name: `The ${pick(TITLE_A)} ${pick(TITLE_N)}`, vibe: 'A dockside bar like a hundred others: bad light, cheap drinks, and everybody\'s business.' };
}

// Who is in tonight: people you know who are in town, and a few strangers.
function fillBar(planet) {
  const st = G.state, sid = st.systemId, aboard = new Set(paxAboard().map(m => m.pid));
  const regulars = barRegulars(planet).filter(x => !aboard.has(x.p.id) && !st.crew.includes(x.p.id));
  const known = Object.values(st.people).filter(p => p.location === planet.name && !p.regular && !p.official && !p.portFolk && !p.agent && !p.arcPerson && !st.crew.includes(p.id) && !aboard.has(p.id) && !p.ship)  // the dock's official is at the dock (official.js)
    .sort((a, b) => Math.abs(b.opinion) - Math.abs(a.opinion)).slice(0, 2);
  G.patrons = [
    ...castPatrons(),  // the main characters with a scene due (castbar.js)
    ...regulars,
    ...known.map(p => ({ p, known: true })),
    ...Array.from({ length: randInt(2, 4) }, () => ({ p: makePerson(Math.random() < 0.75 ? cultureOf(sid) : undefined), known: false })),
  ];
  G.barState = { round: false, name: barOf(planet).name, planet: planet.name };
  barLeads(planet);
}

// A stranger you deal with becomes someone you know.
function met(pat) {
  if (!pat.p.id) registerPerson(pat.p);
  pat.p.location = G.state.planet;
}

function roomLines(planet) {
  const out = [], sid = G.state.systemId, c = culture(), day = cultureToday(), show = pick(airing(day)), book = pick(newBooks(day)), ls = pick(LEAGUES), last = season(ls).last;
  for (const x of conditions(sid)) {
    if (x.id === 'shortage-water') out.push(`The beer is watered down. A sign by the taps says the water ration on ${planet.name} is cut.`);
    else if (x.id === 'war') out.push('A navy recruiter is buying drinks for anyone who will sit still.');
    else if (x.id === 'raids') out.push('Half the pilots in here are talking about the raids. The other half are not talking.');
    else if (x.id === 'boom') out.push('Money is loose tonight. Somebody at the back is buying rounds for strangers.');
    else if (x.id === 'slump') out.push('The place is half empty. Everyone is nursing one drink.');
  }
  out.push(pick([
    `The screens over the bar are showing "${show.title}". Someone tells you to be quiet.`,
    last ? `${ls.sport[0].toUpperCase()}${ls.sport.slice(1)} on every screen: ${last.a} ${last.sa}, ${last.b} ${last.sb}. ${pick([`The ${last.winner} fans are buying.`, `Someone here lost money on the ${last.loser}.`])}` : `The ${ls.name} has no games on tonight. Everyone has an opinion anyway.`,
    `"${c.song.title}" by ${c.song.band} comes on for the third time tonight. Nobody complains.`,
    `Two people at the bar are arguing about the ending of "${book.title}".`,
    'A man at the end of the bar is telling the same joke he told an hour ago. Somebody laughs.',
    'Somebody has started a game of dominoes. It has been going an hour, and two people have stopped speaking.',
    'The bartender polishes the same glass under the light and hums something old.',
    'An old couple are dancing in the corner. The song in the room is a different one.',
    'The light over the bar flickers twice. Everyone looks up. It steadies, and they look down again.',
    'A child is asleep in a booth with her head on a rolled-up coat. Her parents are talking in low voices over a bottle.',
  ]));
  for (const cm of crewMembers()) {
    const lines = barLines('crew')[cm.role];
    if (lines && Math.random() < 0.6) out.push(pickFresh(lines).replace(/\{n\}/g, `<button class="link" data-action="person" data-arg="${esc(cm.id)}">${esc(cm.first)}</button>`));  // the name opens their page
  }
  return out;
}

function travelOffer(p) {
  const st = G.state, reachable = Object.keys(SYSTEMS).filter(id => id !== st.systemId && inRange(st.systemId, id));
  if (!reachable.length) return null;
  const sid = pick(reachable), dest = pick(SYSTEMS[sid].planets), days = baseDays(st.systemId, sid);
  const o = makePassengerOffer(st.systemId, sid, dest, days, st.day + days * 2 + 5);
  return Object.assign(o, { person: p, who: `${p.first} ${p.last}`, pax: 1, title: `Carry ${p.first} ${p.last} to ${dest.name}`, blurb: `Met at the bar. ${describe(p)}` });
}

function talkEvent(pat) {
  if (pat.cast) return castBarEvent(pat);
  const p = pat.p, st = G.state, bar = G.barState.name, t0 = p.traits[0], opener = barLines('openers');
  const mem = p.memories.length ? p.memories[p.memories.length - 1].replace(/^(Day \d+|\d+ \w+ \d+): /, '') : null;
  const who = `${p.first} ${p.last}, ${/^[aeiou]/i.test(p.job) ? 'an' : 'a'} ${p.job} from ${p.home}.`, rest = `${pick(opener[t0])} ${barSays(barLines('goal')[p.goal] || '', p)}`.trim();
  const text = pat.known
    ? `${p.first} ${p.last} ${p.opinion >= OPINION.FRIEND ? 'waves you over' : p.opinion <= OPINION.ENEMY ? 'sees you, and turns back to the bar' : 'nods at you'}.${pat.regular && p.gossip ? ` Since you were last here, ${p.first} ${p.gossip}` : ''}${mem ? ` Last time: "${mem}"` : ''}`
    : `${byName(p, 'intro', 2) ? 'Somebody has taken the stool next to yours: ' : ''}${who} ${rest}`;  // who they are, an opener that shows their first trait, and what they are travelling for (#1278)
  const choices = barMenu(pat, p, { st, bar });  // a rotating few from the pool in bartopics.js
  choices.push({ label: 'Leave them to their drink', run: () => barSays(barTrait('leave', p, barLines('leave')), p) + barTone(pat, p) });
  return { title: `${bar}: ${p.first} ${p.last}`, text, choices, place: 'bar' };  // at the counter, at a port drawn as a place (portview.js, #1103)
}

function barHtml() {
  const st = G.state, planet = currentPlanet();
  if (!G.patrons || G.barState.planet !== planet.name) fillBar(planet);
  const b = barOf(planet), round = 250 * (4 + G.patrons.filter(x => !x.cast).length);
  const rows = listHtml(G.patrons, ({ p, known, cast, regular }, i) => h`<div class="mission">
      <div><b>${p.first} ${p.last}</b>${known ? h` <span class="hint">(${opinionWord(p.opinion)})</span>` : ''}
        <div class="hint">${cast ? 'Aboard with you, and at the bar tonight.' : known ? h`${regular ? 'A regular here.' : 'Someone you know.'} ${regular && p.gossip ?
        h`${p.first} ${p.gossip} ` : ''}${p.memories.length ? p.memories[p.memories.length - 1] : ''}` : h`${TRAITS[p.traits[0]].adj[0].toUpperCase()}${TRAITS[p.traits[0]].adj.slice(1)} ${p.job} from ${p.home}.`}</div></div>
      <button data-action="barTalk" data-arg="${i}">Talk</button>
    </div>`);
  const hire = listHtml(G.bar, (c, i) => h`<div class="mission">
      <div><b>${fullName(c)}</b> &middot; ${ROLE_NAMES[c.role]}, skill ${c.skill}/3<div class="hint">${describe(c).replace(GOALS[c.goal], 'looking for a ship')}</div></div>
      ${raw(interviewButton(i))}<button data-action="hire" data-arg="bar:${i}" ${berthsFree() > 0 && st.credits >= c.fee ? '' : 'disabled'}>Hire (${fmt(c.fee)} cr)</button>
    </div>`);
  return String(h`
    <h3>${raw(b.name)}</h3>
    ${raw(barRoomHtml(G.patrons, b.name))}
    <p class="desc">${raw(b.vibe)}</p>
    ${matchNight() ? h`<div class="hint">${raw(matchNight().text)}</div>` : ''}
    ${(G.barState.lines = G.barState.lines || roomLines(planet)).map(l => h`<div class="hint">${raw(l)}</div>`)}
    ${G.barState.note ? h`<p class="desc">${raw(G.barState.note)}</p>` : ''}
    <div class="row"><button data-action="barRound" ${st.credits >= round && !G.barState.round ? '' : 'disabled'}>${G.barState.round ? sceneSay('scene:bar-round', 'label.done') : sceneSay('scene:bar-round', 'label', { cost: fmt(round) })}</button></div>
    ${raw(barWorkHtml())}
    <h3>Tonight</h3>
    ${G.patrons.length ? rows : raw('<p class="hint">Just you and the bartender.</p>')}
    ${G.bar.length && !hired() ? h`<h3>Looking for a ship</h3>${hire}` : ''}`);
}

Mods.register({
  id: 'bar', name: 'Bars', builtin: true,
  init(M) {
    UI.views.bar = barHtml;
    M.on('landed', fillBar);
    M.action('barTalk', i => openEvent(talkEvent(G.patrons[Number(i)])));
    M.action('barRound', () => {
      const st = G.state, cost = 250 * (4 + G.patrons.filter(x => !x.cast).length);
      if (G.barState.round || st.credits < cost) return;
      G.barState.round = true;
      st.credits -= cost;
      for (const pat of G.patrons.filter(x => !x.cast)) { met(pat); like(pat.p, 1, sceneSay('scene:bar-round', 'memory', { bar: G.barState.name })); }
      if (isFaction(localGov())) changeRep(localGov(), 1);
      G.barState.note = sceneSay('scene:bar-round', 'note', { rumor: addRumor() });
    });
  },
});
