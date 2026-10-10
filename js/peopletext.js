'use strict';

// The text tables of people.js, moved out so the logic reads on its own (#254). Data only; loaded before people.js.

const NAMES = {
  earth: {
    first: [
      'Amara',
      'Daniel',
      'Priya',
      'Mateo',
      'Chen',
      'Fatima',
      'Oliver',
      'Aiko',
      'Samuel',
      'Leila',
      'Tomas',
      'Grace',
      'Ravi',
      'Ines',
      'Kwame',
      'Hana',
      'Diego',
      'Nadia',
      'Arjun',
      'Sofia'
    ],
    last: [
      'Nakamura',
      'Silva',
      'Hassan',
      'Kowalski',
      'Mbeki',
      'Singh',
      'Ferreira',
      'Lindqvist',
      'Moreau',
      'Castillo',
      'Haddad',
      'Petrov',
      'Osei',
      'Tanaka',
      'Mendoza',
      'Kaur',
      'Novak',
      'Achebe',
      'Okonjo',
      'Brennan'
    ],
    jobs: [
      'accountant',
      'schoolteacher',
      'insurance adjuster',
      'journalist',
      'nurse',
      'software auditor',
      'lawyer',
      'aid worker',
      'sales rep'
    ]
  },
  mars: {
    first: [
      'Marcus',
      'Yelena',
      'Tariq',
      'Ingrid',
      'Hector',
      'Mei',
      'Anton',
      'Zara',
      'Felix',
      'Olga',
      'Kenji',
      'Dalia',
      'Viktor',
      'Sana',
      'Ruben',
      'Noor'
    ],
    last: [
      'Holloway',
      'Achterberg',
      'Castellanos',
      'Ibarra',
      'Kerr',
      'Laszlo',
      'Quint',
      'Reyes',
      'Sato',
      'Ueda',
      'Valenti',
      'Weller',
      'Zamora',
      'Okoye',
      'Brandvold'
    ],
    jobs: [
      'terraforming engineer',
      'soil chemist',
      'dome architect',
      'navy veteran',
      'hydrologist',
      'teacher',
      'atmospheric modeler'
    ]
  },
  belt: {
    first: [
      'Tiko',
      'Ama',
      'Bexa',
      'Dru',
      'Esa',
      'Fen',
      'Gaz',
      'Imi',
      'Jo',
      'Kez',
      'Lolo',
      'Mika',
      'Nim',
      'Pax',
      'Ruo',
      'Sabe',
      'Tuk',
      'Vesna',
      'Wim',
      'Yuri'
    ],
    last: [
      'Ashford-Kamau',
      'Bello',
      'Chu-Okoro',
      'Dagny',
      'Esteban-Li',
      'Faro',
      'Ghosh',
      'Hollis',
      'Iwu',
      'Jansen-Ruiz',
      'Kalu',
      'Lindo',
      'Marsh',
      'Nyambura',
      'Oyelaran',
      'Pike',
      'Quesada',
      'Rourke',
      'Soto-Nakamura',
      'Tembo'
    ],
    jobs: [
      'ice miner',
      'hydroponics tech',
      'dockworker',
      'refinery welder',
      'water recycler tech',
      'salvager',
      'ore assayer',
      'EVA rigger'
    ]
  }
};

const TRAITS = {
  talkative: {
    adj: 'talkative',
    chatter: [
      '{first}: "Did I ever tell you about the time on {home}..."',
      '{first} is telling a long story in the galley, and, from the sound of it, has reached the good part for the third time.',
      '{first}: "And that, I always say, is the whole trouble with {home}. Oh, but that reminds me..."',
      '{first} has been talking for an hour, and the coffee maker, in a corner, has given up in sympathy.',
      '{first} is explaining, to nobody in particular, what they would do with a ship of their own.'
    ]
  },
  nervous: {
    adj: 'nervous',
    chatter: [
      '{first} keeps checking the hull pressure readouts.',
      '{first} jumps at a clank from the engine room, and pretends they did not.',
      '{first} has, for the fifth time this watch, tested the seal on the nearest hatch.',
      '{first} is counting the emergency suits, quietly, under their breath, in a low, steady mutter.',
      '{first} sleeps with a hand on the bulkhead.'
    ]
  },
  generous: {
    adj: 'generous',
    chatter: [
      '{first} made coffee for everyone.',
      '{first} has left a plate of something sweet outside the engine room, without a note.',
      '{first} is giving away, one piece at a time, the contents of their sock drawer.',
      '{first} covered someone\'s shift, and will not hear a word about it.',
      '{first} has a knack for turning up, unasked, with exactly what you need.'
    ]
  },
  greedy: {
    adj: 'money-minded',
    chatter: [
      '{first} is doing sums on a hand terminal and muttering.',
      '{first} has worked out what every ton of cargo on the ship is worth, and tells you, twice.',
      '{first} is running the numbers on a trade route, and, from the muttering, it is not going to be enough.',
      '{first} watches the fuel gauge, and does not blink.',
      '{first} has started a betting pool on the arrival date, and holds all the odds.'
    ]
  },
  pious: {
    adj: 'devout',
    chatter: [
      '{first} is praying quietly in the cargo bay.',
      '{first} has tied a ribbon to a bulkhead, for luck, and blessed it.',
      '{first} murmurs a short blessing over the drive before each flip.',
      '{first} is reading, aloud and softly, from a worn book.',
      '{first} is lighting a very small, very safe candle in a jar, and shielding it from the draught with a hand.'
    ]
  },
  rude: {
    adj: 'abrasive',
    chatter: [
      '{first}: "Who designed this galley, and were they drunk?"',
      '{first} is complaining about the coffee. The coffee, to be fair, deserves it.',
      '{first}: "In my last ship, we had a proper bunk. With a door."',
      '{first} has an opinion about the way you are flying, and shares it, generously, at every turn.',
      '{first} is glaring at the thermostat.'
    ]
  },
  curious: {
    adj: 'curious',
    chatter: [
      '{first} is asking the nav computer far too many questions.',
      '{first} has taken the panel off the galley clock to see what makes it tick.',
      '{first} is following the plume readout with a notebook, and a look of pure joy.',
      '{first}: "But why does it hum at that particular note? Has anybody ever asked?"',
      '{first} is pressing an ear to the bulkhead, listening to something nobody else can hear.'
    ]
  },
  drunk: {
    adj: 'hard-drinking',
    chatter: [
      '{first} is suspiciously cheerful for this hour.',
      '{first} is humming, loudly, an old song from {home}, and has forgotten the second verse.',
      '{first} is sitting very carefully upright, with a mug that smells like anything but coffee.',
      '{first} has made a toast to the ship, and is now, tenderly, toasting the coffee maker.',
      '{first} is cheerfully explaining something to a coaster.'
    ]
  },
  secretive: {
    adj: 'guarded',
    chatter: [
      '{first} closes a message window whenever you walk past.',
      '{first} answers every question with a question, and does it very gracefully.',
      '{first} has a locked case, and a way of standing between it and everyone else.',
      '{first} is very quiet, and very watchful, and always knows where everyone is.',
      '{first} deletes a message, and looks up, and smiles at you.'
    ]
  },
  kind: {
    adj: 'kind',
    chatter: [
      '{first} fixed the squeaky hatch without being asked.',
      '{first} noticed someone was tired, and quietly took the rest of their watch.',
      '{first} is sewing a torn sleeve, by a lamp, for someone who is not going to ask.',
      '{first} has left a note on the galley wall: "Ask me if you need anything. Anything at all."',
      '{first} is humming, softly, at the sink, while washing everyone else\'s cups.'
    ]
  },
  brave: {
    adj: 'steady',
    chatter: [
      '{first} volunteered for the next EVA before anyone asked.',
      '{first} is calmly checking the emergency hatches, one by one, whistling.',
      '{first} has a plain scar, and a plain refusal to talk about it.',
      '{first}: "If anything goes wrong, I will be the one to go and look. That is what I am for."',
      '{first} is smiling, in the face of a very small, very real problem with the coolant.'
    ]
  },
  homesick: {
    adj: 'homesick',
    chatter: [
      '{first} is looking through old pictures of {home}.',
      '{first} has gone very quiet, and is watching the viewport.',
      '{first} is making a dish from {home}, out of not-quite-right ingredients, and eating it with great seriousness.',
      '{first} is humming something from {home}, low and soft, and does not seem to know.',
      '{first} keeps a stone from {home}, worn smooth, and turns it over, and over, and over.'
    ]
  }
};

const SHIP_WORDS = {
  a: [
    'Patient',
    'Lucky',
    'Stubborn',
    'Quiet',
    'Wandering',
    'Iron',
    'Honest',
    'Restless',
    'Silver',
    'Distant',
    'Second',
    'Brave'
  ],
  n: [
    'Promise',
    'Horizon',
    'Tortoise',
    'Heron',
    'Bargain',
    'Anvil',
    'Lantern',
    'Wager',
    'Pilgrim',
    'Ember',
    'Mule',
    'Comet'
  ],
  pa: ['Crimson', 'Hungry', 'Silent', 'Black', 'Bitter', 'Rusted'],
  pn: ['Knife', 'Grin', 'Debt', 'Tooth', 'Widow', 'Vulture', 'Hook']
};

// The words of the passenger events (PAX_EVENTS) and the crew events (CREW_EVENTS) of js/people.js (#457), by the id of each event and the name each line has: `title`, `text`, and for each choice `c0.label` and
// its result (`c0.result`, or `c0.win` and `c0.lose` where the choice rolls). A {word} is filled from the game when the event plays: {first}, {last}, {home} and {crime} are
// the passenger's, {dest} the port they are bound for, {armor} the hull the event takes and {rumor} the tip it gives; {crew} is the shipmate who does the work, and the dialog fills it. A crew event's {first}, {last} and {home} are the shipmate's, and {raise} the new wage. The bar topics' lines (`bar:<topic>`, js/bartopics.js) have {first}, {home} and the like, and the words the topic builds: {rumor} (a tip), {react} (how they took it), {slip} (what a secret lets slip), {cr} and {cost} (the stake).
// What a choice does (credits, regard, time, who stays aboard) is in code. tests/peoplelines.test.js plays every event and checks that each name here is read.
const PEOPLE_LINES = {
  'people:pax:contraband': {
    title: 'Customs Inspection',
    text: 'The customs cutter\'s searchlight comes across the hull plate by plate. "Ship, this is Inspection," says the voice on the open band. "Hold your burn and open the hold to a scan. It takes a quarter hour, and we do it twice if there is a reason to." {first} is at the hold hatch with one hand on the frame. "Captain." {first} says it low. "Whatever you can do. Stall them. I will explain at the next port, and you will not like it, but I will explain."',
    'c0.label': 'Stall them',
    'c0.win': '"Inspection, the hold scanner has a fault," you say, and then you have the fault\'s maintenance log, and three forms in the wrong order that she has to send back. "That is your problem, captain," the officer says. "It will be mine when I log it," you say. It takes forty-one minutes. Her intercept window closes at forty-two, and the cutter peels away with a burst of static. {first} sits down on a crate. At the airlock {first} puts a folded note in your hand and does not say what it is for.',
    'c0.lose': '"That is the second form I have asked for," the officer says. "For the third I come aboard." She comes aboard. They find {first}\'s stash behind a false panel in the second bay, in under ten minutes. "Negligent inspection," she says, writing it, "two thousand credits." You pay it. At supper the only sound in the galley is cutlery.',
    'c1.label': '[{crew}] Spoof the cargo manifest',
    'c1.win': '{crew} sits down at the console. "Ninety seconds," {crew} says, "and do not talk to me." In ninety seconds the manifest, the cargo record and the ship\'s last six ports are rewritten. The scan crosses the hold and reads tidy crates and honest paperwork. {first} watches from the hatch, looks at you, and then at {crew}.',
    'c1.lose': '{crew}\'s spoof fails a checksum on one line of the manifest, and the scanner lights. You pay a 2,000 cr fine. "One digit," {crew} says, for the next hour. "It was one digit."',
    'c2.label': 'Turn {first} in (+1,500 cr reward)',
    'c2.result': '"{first} {last}," the officer says, once, to be sure, and customs takes {first} off in cuffs with one hand on their shoulder. {first} does not look back. The airlock cycles. At the galley table a cup is left half full, and nobody clears it.',
  },
  'people:pax:wanted': {
    title: 'Bounty Hunter',
    text: 'A bounty hunter matches your burn, dark, with one running light that winks on and off. "You are carrying {first} {last}," says the voice on the channel, low and unhurried. "Wanted on {home} for {crime}. Five thousand for the handover. Or I come and take them, and that costs everyone aboard." In the galley {first} sets a cup on the table and turns it a quarter turn, so that the handle faces away.',
    'c0.label': 'Hand them over (+5,000 cr)',
    'c0.result': '"Dock at my lock," the hunter says, "and keep your hands off the panel." {first} goes across with one bag. At the lock {first} looks back once. The credits arrive before the lock finishes cycling.',
    'c1.label': '[{crew}] Make them reconsider',
    'c1.result': '{crew} puts a burst of tracer across the hunter\'s bow, a line of light that picks out the hull number. "That was the warning," {crew} says on the channel. "The next one has a number on it." The hunter reconsiders. One wild shot comes back and costs you {armor} points of armor. At the airlock {first} pays you extra and shakes your hand hard enough to hurt.',
    'c2.label': 'Refuse, and fight if you must',
    'c2.win': 'It takes a long, ugly exchange to drive the hunter off, and it costs you {armor} points of armor and an antenna. That night in the galley, over a bulb of something strong, {first} tells you their side of it. "A bad partner and a worse lawyer," {first} says, "and I did not do half of what is on the sheet." The bulb is empty before the other half.',
    'c2.lose': 'The hunter hammers the hull for three minutes, {armor} points of armor, and then breaks off with a curse on the channel. {first}, gray in the face, holds the patch plate. "Hold it flat," you say, and {first} does, while you seal the worst of the breaches.',
  },
  'people:pax:ill': {
    title: 'Medical Emergency',
    text: '{first} goes down in the galley, dropping a cup, and slides to the deck with their back against a cabinet. Their breathing is shallow and fast. {reason} Everyone in the room has stopped moving. They look at you.',
    'reason.ill': 'Between breaths they say they have hidden an illness for weeks and did not want to be a burden.',
    'reason.medical': 'The condition they were traveling to get treated has taken a turn.',
    'c0.label': '[{crew}] Treat them',
    'c0.result': '{crew} works through the night with a lamp and a case of instruments and does not leave the bunk. By morning {first} is sitting up, pale, asking for coffee in a cracked voice. {crew} is asleep in the corridor with a blanket over their shoulders, and nobody steps over them.',
    'c1.label': 'Use the ship\'s medkit (500 cr of supplies)',
    'c1.win': 'You sit up with them through the night, working from the manual, with a bulb of water and a flashlight in your teeth. The fever breaks in the small hours, and they sleep for the first time in days.',
    'c1.lose': 'You do everything the medkit and the manual allow, and it holds them stable. They need a real doctor. For the rest of the burn you take their pulse every twenty minutes, in the dark.',
    'c2.label': 'Burn harder to get them help (40 reaction mass)',
    'c2.result': 'You push the drive until the frame ticks. {first} lies pinned to a bunk with a wet cloth on their forehead and asks, every hour, how many hours you have saved. When the doctors take them at the dock, they say something you do not catch. It might be thanks.',
    'c3.label': 'There is nothing you can do',
    'c3.result': '{first} recovers over three days, on their own, in a cold bunk. They ask you for nothing, and they do not speak to you for the rest of the trip. At the dock they go down the ramp without turning round.',
  },
  'people:pax:spy': {
    title: 'Encrypted Bursts',
    text: 'Your comms log shows {first} sending tight-beam bursts between the second and third watch, short pulses aimed at no port you know. They send them from the observation blister, alone, with the lights off. You have started to count how many times a shift {first} looks at the door.',
    'c0.label': 'Confront them',
    'c0.win': '{first} sighs, looks at you, and transfers 2,500 cr "for your discretion". "I like you, captain," they say. "I would rather not have to like you less."',
    'c0.lose': '{first} tells you, evenly, that it is none of your business. They do not raise their voice and they do not threaten you. They stand there until you leave.',
    'c1.label': '[{crew}] Quietly decrypt the traffic',
    'c1.result': '{crew} cracks it over a long evening. Someone is paying for market numbers from every port you touch, in tidy weekly reports. Nothing dangerous: a patient stranger who wants to know what everything costs. Among the bursts is one line you can use: "{rumor}"',
    'c2.label': 'Not your business',
    'c2.result': 'You let it go. The bursts keep coming every night at the same hour. Once, in the corridor, {first} meets your eye and keeps walking.',
  },
  'people:pax:debt': {
    title: 'Collectors',
    text: 'A collection agency hails and reads from a script: {first} owes 1,500 credits and they want it now, "or we flag your ship as an accessory". In the corner of the galley {first} has gone the color of old paper and is looking at the deck. The agent adds, pleasantly, that they have "a great deal of patience, and a great many lawyers."',
    'c0.label': 'Pay it for them (1,500 cr)',
    'c0.result': '{first} opens their mouth and nothing comes out. Then they say, low, that they will pay you back with interest, every credit, if it takes the rest of their life. They do not sit down until you have.',
    'c1.label': 'Tell the collectors to get lost',
    'c1.result': 'They threaten legal action at length and cut the channel. Nothing comes of it. {first} looks at you across the galley. Later there is a cup of tea at your elbow that you did not ask for.',
  },
  'people:pax:job': {
    title: 'Running Late',
    text: '{first} has a job interview on {dest}, and the schedule is tighter than they thought. They have ironed their good shirt three times in the galley and run their answers at the mirror. Now they stand at the cockpit hatch, twisting their hands. "Captain, I hate to ask. Is there any way to go faster?"',
    'c0.label': '[{crew}] Find a faster line',
    'c0.result': '{crew} bends over the nav display, muttering, and finds a gravity assist nobody else would try, a long swoop round a moon that barely shows on the charts. It works. {first} arrives with an hour to spare, freshly ironed, and at the dock hugs {crew} before {crew} can step back.',
    'c1.label': 'Hard burn (40 reaction mass)',
    'c1.result': 'You push the drive, and {first} spends the burn on a crash couch, running answers through their teeth. They arrive on time, rumpled and out of breath, with no time to thank you. You watch them run for the concourse, straightening their collar.',
    'c2.label': '"Physics does not negotiate."',
    'c2.result': 'They say all right and go back to their bunk. For the rest of the trip you can hear them through the bulkhead, running their answers again and again. You never learn whether they made the interview.',
  },
  'people:pax:research': {
    title: 'Sample Opportunity',
    text: '{first} has been at the observation blister for hours with a battered notebook and a pair of binoculars. Now they appear at the cockpit hatch, out of breath, hair on end. They have spotted a rock a few hours off your trajectory, pale, with a bright glint in the sun. "A sample from that could make my career," they say. "I will pay for the detour. Please. I have waited my whole life for something like this."',
    'c0.label': 'Match orbits and take a sample (costs time)',
    'c0.result': '{first} spends six hours in a vac suit on the rock, tethered to your hull, giggling into the radio and chipping at the crust with a tiny hammer. When they come back in, frosted and shaking, they hold a vial up to the light. They promise to name something after you.',
    'c1.label': 'Stay on course',
    'c1.result': 'They watch it slide past the window, a pale point in the dark, and stay at the glass until it is gone. Later you see them write something in the notebook: the date, and a line you cannot read. They are polite for the rest of the trip. When they disembark they leave a folded drawing on the galley table, of a rock, and a ship, and a long distance.',
  },
  'people:pax:pilgrim': {
    title: 'A Request for Stillness',
    text: '{first} comes to the cockpit hatch holding a worn book. They ask whether you might cut the drive for a few hours, so that they can hold a prayer service in zero g. It is a holy day for them, and the old prayers say that in weightlessness a person is closest to whatever is out there. They do not press. They wait with their hands folded, and the book shakes in their grip.',
    'c0.label': 'Cut thrust for them (costs time)',
    'c0.result': 'The drive falls silent. They drift through the cargo bay in a slow circle, singing in a language older than any port, and one by one other passengers and crew drift in to listen. When it is over they press a donation on you, in small folded notes, and touch the bulkhead once.',
    'c1.label': 'Decline politely',
    'c1.result': 'They thank you for hearing them. They pray at one g instead, kneeling on the cold deck of the cargo bay.',
  },
  'people:pax:talkative': {
    title: 'Long Stories',
    text: '{first} corners you in the galley with a bulb of coffee and begins to talk before you can leave. They talk about {home}: the streets, the smells, the bakery at the corner, the neighbor who kept bees, the long evenings. Every story is longer than the last, and every one ends with "and then, of course, I left."',
    'c0.label': 'Listen',
    'c0.result': 'You listen for an hour, and then another. Near the end, between the bakery and the bees, is something you can use: "{rumor}" {first} gives you a shy smile.',
    'c1.label': 'Excuse yourself to the cockpit',
    'c1.result': 'You escape to the cockpit with a muttered excuse and check the instruments. {first} finds someone else to talk to. Through the hatch, for the next hour, you hear the stories moving from bunk to bunk.',
  },
  'people:pax:nervous': {
    title: 'Panic at the Flip',
    text: '{first} panics when the drive cuts for the flip. The silence and the sudden lightness come at once, and they are sure the reactor has failed. They grip the edge of the bunk, breathing in short gasps, and a low moan starts in their throat. The others look at you.',
    'c0.label': 'Talk them through it',
    'c0.result': 'You sit beside them and explain flip-and-burn three times, slowly, with a hand on their shoulder and a cup of water. The third time you draw it on the bulkhead with a finger. The trembling slows, and they laugh once, wetly. {first} apologizes. You tell them there is nothing to apologize for.',
    'c1.label': 'Give them a sedative (200 cr)',
    'c1.result': '{first} takes the sedative with a shaking hand and lies back on the bunk. Within minutes they are breathing slow. They sleep through the rest of the burn and wake at the dock with no memory of what frightened them.',
    'c2.label': 'Tell them to pull themselves together',
    'c2.result': '{first} flinches and goes quiet. They spend the rest of the trip in their bunk with the curtain drawn, eating little, speaking to no one. Sometimes, in the night, you can hear them.',
  },
  'people:pax:curious': {
    title: 'Engine Room Tour',
    text: '{first} has been hovering near the engine room hatch for two days, with an ear pressed to the bulkhead. Now they come to you. "Captain, I would love to see the drive room. Just a quick look. I will not touch anything. I promise. I have always wanted to know how it works."',
    'c0.label': 'Show them around',
    'c0.spill': '{first} touches something. A hiss goes up, and a valve you did not know existed blows its seal. You vent 20 units of reaction mass into the black before you can shut it. {first} apologizes for the next hour, fast and stammering, until you laugh.',
    'c0.fine': '{first} asks questions for an hour, about coolant loops and injector timing and why the drive hums at that note. You find yourself explaining, and enjoying it. By the end you are both leaning on a pipe with the drive humming around you.',
    'c1.label': 'Crew only, sorry',
    'c1.result': 'They say they understand and are sorry to have asked. That evening you find them at the observation blister with an ear against the wall, listening to the drive. When they see you, they go on listening.',
  },
  'people:pax:drunk': {
    title: 'Galley Incident',
    text: '{first} got into the good whiskey, the bottle you were saving, and somewhere around the third glass decided to give the galley water recycler "a bit of a fix", with a spoon and a fork. There is a gap in the wall and a fine mist in the air. {first} is sitting in the middle of the galley, wet through, holding the spoon upright. Repairs will run about 400 credits.',
    'c0.label': 'Add it to their fare',
    'c0.result': '{first} grumbles, studies the deck, and says "unreasonable" to nobody. They stay out of the galley for the rest of the trip, and at the dock they pay in full, in small folded notes.',
    'c1.label': 'Let it slide (400 cr)',
    'c1.result': '{first} goes deep red. They clean the galley themselves, top to bottom, all night, with a toothbrush, and in the morning it is the cleanest room on the ship. There is a note on the door in pencil: "Sorry. Thank you. Never again."',
  },
  'people:pax:greedy': {
    title: 'Card Game',
    text: '{first} produces a deck worn soft at the corners and shuffles it with a flourish. "A friendly game, captain," {first} says. "With a little money on it, just to make things interesting. It is a long burn, and a man gets bored." The deck is not yet square, and {first} is already smiling.',
    'c0.label': 'Play (500 cr stake)',
    'c0.win': 'You clean {first} out in one long quiet hand. {first} looks at the table for ten seconds. "Luck," {first} says. For the rest of the trip {first} sits in a corner and mutters it at the deck.',
    'c0.lose': '{first} wins in one slow hand, turning a single card over at the end. "Well," {first} says, and gathers the money. "That was friendly." For the rest of the trip {first} hums in the corridors and shuffles the deck where you can see it.',
    'c1.label': 'Decline',
    'c1.result': '"Suit yourself," {first} says, and deals a hand of solitaire, slowly. You hear each card click down. {first} plays it out, loses, and begins again.',
  },
  'people:pax:generous': {
    title: 'Gratitude',
    text: '{first} takes over the galley for an afternoon and cooks a dinner for everyone aboard, with spices they brought from {home}, wrapped in twists of paper in a hidden pouch. The ship fills with the smell of cumin and roasted peppers, and the crew drift in one by one. At the end they insist on tipping you for a smooth trip, pressing the notes into your palm.',
    'c0.label': 'Accept graciously',
    'c0.result': 'You take the notes, and sit at the long table with the crew, elbow to elbow, passing dishes. It is the best meal the ship has had in months, and for an hour nobody talks about anything else. Somebody starts to sing, and the table joins in.',
    'c1.label': 'Refuse the money, keep the dinner',
    'c1.result': '{first} cannot speak for a moment. They take your hand in both of theirs, and then they write out the recipe on a napkin, every step, with a sketch of the pot. You will cook it, badly, for years.',
  },
  'people:pax:rude': {
    title: 'Complaints',
    text: '{first} has a list in a neat notebook, and reads it to you at the cockpit hatch, in order. "The bunk is too hard. The food is a crime. The gravity is insufficiently serious. The coffee tastes of pipe." {first} turns a page. "And frankly, captain, your face is not one I would choose to look at for so long."',
    'c0.label': 'Humor them',
    'c0.result': '"Item one," you say, and write it in a book. "The bunk." {first} reads the list again, slower, so that you can keep up. By the end of the hour {first} has run out. "Is there any more tea?" {first} asks.',
    'c1.label': 'Put them in their place',
    'c1.result': '"I have read your list," you say, in a level voice, "and here is what I think of it." You go item by item: the bunk is the bunk you were given, the food is the food you eat, and the gravity is the only gravity the drive makes. {first} goes pale, then red, then still. A formal complaint arrives that evening, in triplicate, and the fee comes out of your fare. The rest of the trip is quiet, and at night you can hear the drive again.',
  },
  'people:crew:greedy': {
    title: '{first} Wants a Raise',
    text: '{first} finds you at the end of a long shift with a printed sheet and folded arms. The sheet lists what crew with their skills earn on other ships, what a ship of your size can afford, and what {first} has done for you lately. The last line says: "I am worth it."',
    'c0.label': 'Give them 25% more ({raise} cr/day)',
    'c0.result': '{first} hums through the rest of the week and calls you "boss". Unasked, they tidy the corner of the cockpit.',
    'c1.label': 'No',
    'c1.result': '{first} goes back to work. For the next few days they do exactly what is asked and nothing more, and their tools are always where they were left. They have stopped smiling.',
  },
  'people:crew:drunk': {
    title: 'Galley Brawl',
    text: '{first} got drunk on something they had been keeping in a pipe, and had an argument with the galley bulkhead. The bulkhead won. There is a dent the size of a fist in the wall, blood on the deck, and {first} on the floor with a cloth pressed to their forehead. The medical supplies cost 300 cr.',
    'c0.label': 'Dock their pay',
    'c0.result': '{first} spends the week in a corner of the engine room with their back to the ship, and does the work in silence.',
    'c1.label': 'Pay for it and let it go (300 cr)',
    'c1.result': '{first} stares at the floor, then swears off drink. For now. They take the next three galley shifts. You find them scrubbing the bulkhead, and they do not look up. The dent is polished.',
  },
  'people:crew:homesick': {
    title: 'Homesick',
    text: '{first} has been quiet for days. At mealtimes they push their food around. At night you have seen them at the viewport, looking at a point of light. They have not said they miss {home}.',
    'c0.label': 'Give them a 500 cr bonus to call home',
    'c0.result': '{first} takes an hour on a lagged call home, in a quiet corner of the ship, with a hand over their mouth. They come back with red eyes and laugh once. They do not say what was said. For the rest of the week they hum in the corridors, and nobody mentions it.',
    'c1.label': 'Share a drink and listen',
    'c1.result': 'You pour two cups of something strong and sit on a crate beside them. For an hour they talk about {home}: the weather, the food, the quiet places. You say almost nothing. When they go to bed, they put a hand on your shoulder on the way out.',
    'c2.label': '"We all miss somewhere."',
    'c2.result': '{first} goes back to work. That night you see them at the viewport again, alone, and you leave them to it.',
  },
  'people:crew:nervous': {
    title: 'Bad Dreams',
    text: '{first} has not been sleeping. There are shadows under their eyes, they drop small tools, and they jump at every clank of the hull. When you ask, they tell you in a flat voice: nightmares about hull breaches, the same one every night. The thin bright line of a crack, spreading. The sudden silence. The cold.',
    'c0.label': 'Talk them through it',
    'c0.result': 'You sit with them in the galley at three in the morning with a pot of tea between you, and talk about nothing in particular. {first} sleeps through the night for the first time in a week. In the morning they bring you a cup of coffee and spill half of it.',
    'c1.label': 'Tell them to toughen up',
    'c1.result': '{first} flinches, and stops mentioning it. In the days after, the shadows under their eyes get darker. They check the seals on every hatch they pass.',
  },
  'people:crew:talkative': {
    title: 'Gossip',
    text: '{first} has been on the open band with half the ships in comm range, chatting. They know the name of the freighter captain\'s dog. They know who is feuding with whom at the next port. They lean in at your cabin door with news.',
    'c0.label': 'What have you heard?',
    'c0.result': '{first} sits down and gives you an hour of gossip: names, debts, who left whom at which port. In the middle of it is one thing you can use: "{rumor}" Then {first} moves on to the next thing.',
  },
  'people:crew:secretive': {
    title: 'Locked Locker',
    text: '{first}\'s locker has two locks, one you do not recognize and a cheap padlock over it. They have been receiving messages with no sender ID, short ones, at odd hours. They read them, delete them, and read them again. When you come into the room, they flinch.',
    'c0.label': 'Ask about it',
    'c0.result': '{first} looks at you. "Family business," {first} says. That is all you get. Afterward {first} takes meals in the bunk and locks the door to sleep.',
    'c1.label': 'Respect their privacy',
    'c1.result': 'You say nothing and turn to go. Behind you their shoulders come down. That evening {first} brings you a cup of tea you did not ask for, stands in the doorway, and goes.',
  },
  'people:crew:curious': {
    title: 'Tinkering',
    text: '{first} has the reaction mass pumps in pieces on newspaper in the middle of the engine room, "to see how they work". Every bolt is in a row. Three manuals are open, and there is a cup of cold tea. Nobody asked them to.',
    'c0.label': 'Let them experiment',
    'c0.win': 'They find a leak nobody knew about, a hairline crack in an old fitting that has been weeping mass for months, and seal it with a strip of foil. You recover 25 units of reaction mass. From then on the pumps run quiet, and {first} hums while they work.',
    'c0.lose': 'Something goes pop. A thin jet of reaction mass hisses out of the open housing before you can shut it, and you lose 20 units. {first} looks at the empty housing. "Ah," {first} says.',
    'c1.label': 'Put it back together. Now.',
    'c1.result': 'They reassemble every part, muttering, and the pumps run as before. {first} tightens the last bolt without looking at you.',
  },
  'people:crew:pious': {
    title: 'Quiet Prayer',
    text: '{first} finds you in the galley at the turn of the watch with a worn charm in one hand and asks you to join a short prayer for safe passage. They say it every burn, alone, in a corner, but tonight they wanted company. It will take a few minutes. They say you may stay silent.',
    'c0.label': 'Join them',
    'c0.result': 'You kneel beside them in the dim light. For a few minutes nobody speaks. The drive hums. A pipe ticks. When it ends, you both sit a moment. "Thank you," {first} says.',
    'c1.label': 'Politely decline',
    'c1.result': '{first} goes to their corner. Through the thin wall you hear the low murmur of their prayer. {first} prays for you anyway. You listen until it stops.',
  },
  'people:crew:rude': {
    title: 'Friction',
    text: '{first} has been needling the rest of the crew for days: a jab at breakfast, a remark in the corridor, a sneer at how someone hums. Tonight in the galley it is the humming again. A chair scrapes. "Say that again," says a level voice. "I said it was flat," {first} says. "I did not say it was your fault. I said it was flat." "Say that again." There is going to be a fight.',
    'c0.label': 'Reprimand them',
    'c0.result': 'You step between them. "Sit," you say. "Both of you." The room goes still. "You do not talk about a shipmate\'s humming at my table," you say to {first}, "or anywhere I can hear it." {first} goes red, then pale, and leaves. For days {first} eats alone.',
    'c1.label': 'Let them sort it out',
    'c1.result': 'You lean in the doorway with your arms folded and let them. It is short, loud and untidy, and involves a soup pot. {armor} points of hull damage later they are sitting side by side on the deck, breathing hard, sharing a cloth for a bloody lip. "It was flat," {first} says. "It was flat," says the other, and they both laugh.',
  },
  'people:crew:kind': {
    title: 'Small Kindnesses',
    text: '{first} spent the night fixing everyone\'s bunk lights, one by one, with a screwdriver, and in the small hours cooked a real meal from the last of the good stores. Nobody asked them to. In the morning every bunk had a light that worked, and every plate was full.',
    'c0.label': 'Thank them',
    'c0.result': 'You find {first} in the galley washing the last of the pots. You thank them. They wave it off and make a joke of it, and their ears go pink. For the rest of the trip nobody snaps at the table.',
  },
  'people:crew:generous': {
    title: 'Shared Bottle',
    text: '{first} comes into the galley at the end of a long shift with a dusty bottle wrapped in a shirt. They have carried it in the bottom of their bag since they left {home}. They set it on the table and take down every cup in the cupboard. "I was saving it for a special occasion," they say. "But I think we are the occasion."',
    'c0.label': 'Raise a glass',
    'c0.result': 'You raise a glass, and so does everyone else, in a ring around the table. The bottle tastes of {home}: sweet, smoky, with something bitter under it. To the ship. To the crew. To not dying. Somebody laughs, then everyone does, and the bottle goes round twice before it is empty.',
  },
  'people:crew:brave': {
    title: 'Volunteer',
    text: 'A sensor mast has come loose in the burn and hangs by one strut, banging against the hull with every pulse of the drive. It will tear free sooner or later and take plating with it. Before you can speak, {first} has the suit half on. "I will go, captain," they say, buckling a strap. "It is a ten-minute job. I have done worse."',
    'c0.label': 'Let them go',
    'c0.win': '{first} goes out through the lock with a tether and a bag of tools. For twenty minutes they are a bright shape against the stars, working along the hull. Then they are back inside, helmet off, sweating, grinning, holding the bent strut.',
    'c0.lose': 'A tether snaps. For one second {first} drifts, arms out, into the black, until a gloved hand catches a handhold and holds. They make it back, shaking and gasping. The ship takes {armor} points of damage from the loose mast, and nobody sleeps that night.',
    'c1.label': 'Go yourself',
    'c1.result': 'You go out through the lock yourself, with the tether at your belt, and fix it in the cold and the silence with the ship turning slowly below your boots. It takes forty minutes. {first} watched through the port, and when you come in {first} hands you a cup and says nothing.',
  },
  'bar:drink': {
    label: 'Buy {first} a drink ({cost} cr)',
    gate: 'You have bought them a drink already.',
    generous: '{first} will not hear of it, and slides the credits back across the bar, and buys the next one too. {react}',
    rumor: '{first} looks around and leans in. "Here\'s something you can use," they say, low and fast: "{rumor}" Then they sit back and finish their drink. {react}',
  },
  'bar:heard': {
    label: 'Ask what they have heard',
    gate: 'You have done that already tonight.',
    secretive: '"Nothing worth repeating," {first} says, and smiles. "And you? How long have you had the ship?"',
    heard: '{first} thinks about it, then says: "{rumor}"',
    more: '{first} adds, before you can answer: "{rumor}"',
  },
  'bar:passage': {
    label: 'Offer {first} passage',
    gate: 'You have offered already.',
    none: '{first} counts on their fingers, then shakes their head. "Nowhere you can reach from here," they say. "Ask me again when you have a longer tank."',
    set: '"{dest}?" {first} says. "That\'s where I need to be." They name a fare and shake on it with both hands. The job is on the mission board.',
  },
  'bar:cards': {
    label: 'Play {first} at cards ({cr} cr)',
    gate: 'You have played already tonight.',
    'win.rude': '{first} stands up and says, in a level voice, that you cheated, and the whole bar turns to look. You leave them to it.',
    'win.end.0': '{first} buys you a drink with your own money.',
    'win.end.1': '{first} shakes your hand and means it.',
    'win.end.2': '{first} tells the story of it to the next table, with you as the villain.',
    'lose.end': 'By the end of the glass you are laughing.',
  },
  'bar:work': {
    label: 'Ask {first} about their work',
    gate: 'You have done that already tonight.',
    post: 'You come away knowing something new about the {post}. (Experience gained.)',
    hands: 'Then {first} tells you what they are hearing on the docks: "{rumor}"',
  },
  'bar:place': {
    label: 'Ask {first} about this place',
    gate: 'You have done that already tonight.',
  },
  'bar:quiet': {
    label: 'Sit with {first} and say nothing',
    gate: 'You have done that already tonight.',
  },
  'bar:goal': {
    gate: 'You have done that already tonight.',
    result: 'You ask, and {first} puts down the glass.',
  },
  'bar:secret': {
    label: 'Ask {first} what is weighing on them',
    gate: 'You have done that already tonight.',
    result: '{first} looks at you, and takes their time deciding.',
  },
  'bar:home': {
    label: 'Ask about {home}',
    gate: 'You have done that already tonight.',
  },
  'bar:bless': {
    label: 'Ask for a blessing on your ship',
    'label.hired': 'Ask for a blessing on the ship',
    gate: 'You have done that already tonight.',
  },
  'bar:fight': {
    label: 'Tell them what you think of their manners',
    gate: 'You have done that already tonight.',
    win: 'It is short and loud. {step}{first} ends up on the floor, and the whole bar cheers. Someone starts a chant. The bartender charges you for the stool anyway.',
    'win.step': '{gunner} steps in and',
    lose: 'It is short, and it does not go your way. There is a light, and a loud noise, and then nothing. You wake up in the back with a black eye and a 150 cr bill for the mirror. The bartender is standing over you with a wet cloth. "You were doing so well," the bartender says.',
  },
  'bar:peace': {
    label: 'Make peace (buy them a bottle, 300 cr)',
    gate: 'You have made peace already tonight.',
    result: '{first} looks at the bottle a long time before taking it, turning it in the light to read the label. Then they set it between you on the table and pour two glasses. "It\'s a start," they say.',
  },
  'bar:goal-help': {
    'gift.result': 'You put it on the table and push it across.',
    'advice.result': 'You tell them what you know, plainly.',
    'listen.result': 'You sit back, and ask, and for an hour that is all there is.',
    thanks: 'As thanks {first} leans in. "Here\'s something you can use," they say: "{rumor}"',
    quiet: 'In the quiet after, {first} {slip}',
    'close.label': 'Say you hope it goes well',
    'close.result': '{first} thanks you, and that is the end of it.',
  },
  'bar:secret-help': {
    'close.label': 'Let it be',
    'close.result': 'You let it be, and the talk goes somewhere easier.',
  },
};
