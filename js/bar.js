'use strict';

// The bar at every port: a Bar tab with the room's mood (from local conditions, the
// feeds, and your crew), a few patrons to talk to, people you already know who are
// in town, and crew looking for a ship. Strangers become people you know once you
// deal with them (st.people), so they can turn up again. Loaded before game.js;
// only calls into it at runtime.

const DRINK = 20, CARDS = 200;

const BARS = {
  'Hermes Foundry': ['The Heat Sink', ('Foundry shifts change every six hours, and the bar fills and empties with them. Everyone is red through two ' +
      'layers of shielding. The ice in the drinks costs more than the liquor. The bartender slides your glass down the bar without looking. The place ' +
      'smells of cold metal and lime. Nobody stays for more than one round, and everybody says they are here for a couple more years.')],
  Earth: ['The Gravity Well', ('A spaceport bar with a long copper counter and travel posters from a dozen ports curling on the walls. The drinks are ' +
      'real, and so are the prices. At the far end a man in a good coat is telling a story about the sea to a table of freight hands, and he is paying for ' +
      'every round.')],
  Luna: ['Copernicus Lounge', ('Low gravity, a long bar, and Compact officers in civilian jackets that do not fit. The bartender pours slow on ' +
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
  talkative: ['They are already halfway through a story when you sit down.', 'They start talking before you have finished sitting. They do not stop for breath.', '"You have a kind face," they say. "I have to tell you something." They do.'],
  nervous: ['They keep one eye on the door.', 'They jump when you sit down, laugh, and apologize.', 'They have shredded a bar napkin into strips and have started on a second.'],
  generous: ['They push a bowl of salted beans toward you.', 'They have already ordered you a drink, and say the barman got it wrong.', 'They slide over on the bench and press a warm roll into your hand.'],
  greedy: ['They ask what a ship like yours clears in a month before they ask your name.', 'They are doing sums on a napkin. When they see you looking, they keep going.', 'They look at your boots, your jacket, and the transponder on the bar, and name a higher price.'],
  pious: ['There is a prayer cord around their wrist, worn smooth.', 'They murmur a short blessing over their cup before they drink. They see you watching and say sorry.', 'A small charm hangs from a chain at their throat. Twice they touch it.'],
  rude: ['"You\'re in my light."', '"Do you mind? I was here first, and I was enjoying the silence."', 'They look you up and down and sigh.'],
  curious: ['They want to know everything about your ship.', 'They ask what the drive is, how many g, and whether it is true about the coolant loops, all in one breath.', '"Tell me about your ship," they say. "All of it. Take your time."'],
  drunk: ['They are several drinks ahead of you.', 'They greet you like a cousin and lose their train of thought in the same breath.', 'They are explaining something to a coaster. They hold up a finger for you to wait.'],
  secretive: ['They angle their terminal away from you.', 'They look at you one second longer than is comfortable, and smile.', 'They answer every question with a question.'],
  kind: ['They ask if you have eaten.', 'They push a glass of water toward you before they say anything.', 'They make room for you on the bench without a word.'],
  brave: ['They have a fresh scar and a story about it.', 'They sit with their back to the door.', 'They roll up one sleeve to show a long healing burn. "You should see the other guy," they say. "He is a wall."'],
  homesick: ['They are showing the bartender pictures of home.', 'They hold a creased photograph in both hands and set it down on the table as you sit.', 'They say the name of a place twice, under their breath, and check whether you heard.'],
};

const SECRET_TALK = {
  contraband: ['lowers their voice: "If you ever need something moved and not looked at, I know people. I might be people."', 'leans in and does not meet your eye: "There is cargo that does not appear on a manifest. I can put you in touch with someone who moves it."'],
  wanted: ['goes quiet when a patrol officer comes in, and studies their drink until the officer leaves.', 'watches the door through the whole conversation. When it opens they stop moving. It is the barman\'s cousin, and they start again.'],
  ill: ['coughs into their sleeve and waves it off. "Nothing. Recyclers on my last ship. It\'ll pass."', 'coughs hard and hides the cloth. It is the dust in here, they say, and would you like another.'],
  spy: ['asks a lot of questions about your routes and answers none about theirs.', 'is pleasant and asks small, exact things about ports and times, and gives you nothing.'],
  debt: ['says, three drinks in, that they owe the wrong people more than they will make in a year.', 'looks into the bottom of their cup and says there are people looking for them, and it is mostly a question of time.'],
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
    '{n} sits with their back to the wall and watches the room.',
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
  hands: [('{n} talks about the work with their hands: how a load shifts in a hold, the sound a bad cable makes before it goes.'), (
      '"Fourteen years," {n} says, "and I can tell the weather on the other side of a hull by the way it hums." They say it as a joke.'), (
      '{n} shows you a hand with two fingers that do not close. It was a clamp, and a shift supervisor who did not check it. They do not give ' +
      'the supervisor\'s name.')],
  tech: [('{n} explains, with a coaster and a fork, why a thing you have always assumed works a certain way does not.'), ('"Nobody thanks you when it works," {n} says. "They thank you when it breaks and then you ' +
          'fix it." They drink to that.'), '{n} has opinions on three kinds of failure and a favorite, and tells you which. It is a boring one.'],
  service: [('{n} sits very straight for a person with a drink in their hand. They talk about the service the way people talk about a family they ' +
      'have left.'), ('"They taught me to count exits," {n} says. "I still do it. There ' +
          'are three." They glance at each one, in order, without moving their head.'), '{n} will not tell you where they served. They will tell you what the food was like, and that is a long story.'],
  other: [('{n} talks about the work: the hours, the people, the small politics.'), (
      '"It is not what I thought I would do," {n} says. "But I am better at it than I thought I would be."'), (
      '{n} tells you about a bad day at work in such detail that you can see the room. It ends with an apology to a colleague, and the colleague, to ' +
      'everyone\'s surprise, accepting.')],
};
const BAR_SILENCE = [('You sit with {n} and neither of you says anything. The room talks around you. After a while {n} pushes the bowl of beans an ' +
    'inch toward you, and that is all.'), ('You share the table. {n} reads something on a terminal, you watch the room, and it is the quietest twenty ' +
        'minutes you have had in a week.'), ('{n} starts to say something, stops, and you do not ask. The drink ' +
            'goes down slowly.'), (
            'Neither of you has anywhere to be. The light over the bar changes with the hour. When you stand to go, {n} lifts a hand without looking ' +
            'up.')];
const BAR_PLACE = [('"{bar}," {n} says, "has been here longer than the people who own it. Nobody knows where the counter came from. The rule is you ' +
    'do not ask."'), (
    '{n} points out the table by the wall. "A man died there in the first week. Heart. Nobody moved the table. We just stopped using it for a year, ' +
    'and then it was a table again."'), '"The bartender knows everyone\'s business," {n} says, "and has never repeated any of it. That is why anyone trusts this place."', (
    '{n} tells you where to sit on a bad night (the corner, back to the wall), what not to order, and who to nod to on the way in. It is a short ' +
    'list.'), '"They tried to close {bar} twice," {n} says. "The first time the regulars paid the rent. The second time nobody could find the owner."'];
const BAR_CARD_WIN = [
  'Three hands, slow and close. On the last card you take {cr} cr off {n}, who groans and says you were counting.',
  '{n} deals fast and cheats badly, and you let them think they are getting away with it for two hands, and take the third. {cr} cr.',
  'You play it quiet and let {n} talk. They talk themselves into a bad bet. {cr} cr, and they laugh about it.',
  'The cards run for you all night. {n} tries a different seat, a different deck, a different luck charm. {cr} cr to you in the end.'
];
const BAR_CARD_LOSE = [
  'It goes the other way. {n} takes {cr} cr off you, and buys you a drink with it, and sets it in front of you. Fair is fair.',
  '{n} plays like someone who learned on a long watch: patient, quiet, unrattled. {cr} cr, and you cannot find the mistake you made.',
  'You have the better hand for most of the evening and none of it at the end. {n} says sorry and means about half of it. {cr} cr.',
  '{n} fans the last cards with a flourish you have seen before, in a port you do not name. {cr} cr, and a lesson.'
];
const BAR_HOME_TALK = [('{n} talks about the view from the ring where the light comes in at dusk, the smell of the market, the man who sold fried ' +
    'dough on the corner, and a sister who writes every week. They talk until the bar is nearly empty.'), (
    '"You will think I am making it up," {n} says, and then tells you about a festival on {home} where the whole district eats at one long table, and ' +
    'the oldest person gets the first plate and the last word.'), (
    '{n} draws {home} on the bar in spilled water: the lanes, the lock, the place where the lift always stops a floor early. "That is the street," ' +
    '{n} says. "That is where I will be, one day."'), (
    '{n} says the name of a street on {home} and then says nothing for a while. When they start again it is about a dog, and it is a happy story, and ' +
    'then it is not.')];
const BAR_BLESS = [('{n} closes their eyes and lays two fingers on the transponder. They say a few words over your ship\'s name, in a cadence you do ' +
    'not know. The bar goes quiet. When they are done they open their eyes and touch your hand.'), (
    '{n} takes a small cord from their wrist and ties it to the transponder with three knots, a word for each. "It will not stop a rock," {n} says. ' +
    '"It is not for rocks."'), (
    '{n} does not close their eyes or raise their voice. They say, in a normal tone, as if giving directions, where the ship should go if it is lost.')];
const BAR_LEAVE = [
  'You get up and leave them to their drink. You go back to the bar and the noise of the room.',
  'You nod, and {n} nods, and that is the whole goodbye. The room closes over the gap you left.',
  '"Safe burn," {n} says, to your back. You do not turn round, but you lift a hand.',
  'You finish what is in your glass and stand. {n} has already gone back to their own business.'
];
const BAR_DRINK_TALK = [('{n} tells you about {home}: the streets, the smell of the market, why they left, and why they might go back. There is no ' +
    'rumor in it, and no secret, and no angle. It takes an hour.'), (
    '{n} spends the whole drink on a long story about a boss they hated and a ship they loved, and how the two are the same person. It is very funny. ' +
    'It teaches you nothing.'), '{n} asks about you, and listens, and says nothing useful, and the drink is gone before you notice. It is the most relaxing hour of the week.', (
    '{n} complains for an hour about the price of everything, with such precision and love that you leave feeling you have been to a very good ' +
    'concert.'), (
    '{n} talks about the one trip that went right: the cargo that sold, the weather that held, the pilot who sang. It is a nice story. It has no use ' +
    'at all.')];

// What the person is like colors what they say: a line for each of their first two traits (70% of the time, else the shared pool),
// for the kinds of thing that used to be the same for everyone.
const BAR_TRAIT = {
  talkative: { win: ('{n} talks the whole way through the hand and loses the thread of the bet. You take {cr} cr off them while they are explaining a ' +
      'cousin.'), lose: '{n} talks, and you talk back, and somewhere in it {cr} cr leaves your pocket. You could not say which hand it was.', drink: (
      '{n} starts a story, stops it for a better one, and starts the first again at the end. You learn the names of eleven people and the plot of ' +
      'none.'), leave: '"Wait, one more thing," {n} says, and then three more things, and you are at the door before the last of them.', quiet: '{n} lasts nearly a minute in the silence, and then they start on the bakery, and you let them.' },
  nervous: { win: ('{n} watches your hands the whole game and flinches at every card. You take {cr} cr off them, and they thank you for it.'), lose: ('{n} plays carefully and with tiny, exact movements, and wins, and looks at the door before they pick up the {cr} ' +
          'cr.'), drink: ('{n} holds the glass in both hands and talks to it. By the end they have said more in an hour than they meant to, and look ' +
              'at the door.'), leave: '{n} half rises when you stand, and sits again, and says goodbye to the table.', quiet: '{n} sits with their hands flat on the table. After ten minutes they stop moving.' },
  generous: { win: ('{n} insists on shuffling for you and refills your glass between hands. You take {cr} cr off them and they would not hear of ' +
      'giving it back, or of taking it back.'), lose: ('{n} wins {cr} cr and tries to press half of it back into your hand. You refuse. They put it ' +
          'in the tip jar in your name.'), drink: ('{n} will not let you pay for anything and tells you about the first person who was kind to them ' +
              'on a ship, and what they did with it.'), leave: '{n} puts a roll in your pocket as you go and does not mention it.', quiet: '{n} pushes the bowl of beans across, and then the bread, and then a second glass of water, without a word.' },
  greedy: { win: ('{n} counts the pot twice, then counts your {cr} cr, and then counts it again as you take it. "Beginner\'s luck," {n} says.'), lose: '{n} takes the {cr} cr, checks it against a coin they keep for the purpose. "A pleasure," {n} says, and writes the figure on the napkin.', drink: (
      '{n} has a price for everything: the drink, the stool, the gossip about the man two tables over. By the end you have heard a lot of figures and ' +
      'no stories.'), leave: '"Next time, bring a bigger tank," {n} says, "and a bigger purse."', quiet: (
      '{n} does sums on a napkin for twenty minutes, in silence, and at the end turns the napkin round for you to see. It is your ship\'s price, ' +
      'within a few percent.') },
  pious: { win: ('{n} says a short word over each card, and loses, and says one over the {cr} cr as it leaves. "What is lost is returned in another ' +
      'form," {n} says.'), lose: '{n} says a word over each card. You lose {cr} cr, and {n} touches the charm at their throat and says it was not their doing.', drink: (
      '{n} speaks of the long road, and the long wait, and the small kindness that is worth more than either. It is not a sermon.'), leave: '"Fair winds," {n} says.', quiet: (
      '{n} bows their head, and you sit beside them, and for a while the bar is only glasses. When they lift it again they say it was good to ' +
      'have company.') },
  rude: { win: '{n} puts down the last card and says, in a level voice, that it was a dishonest deck. You take {cr} cr off them anyway.', lose: '{n} wins {cr} cr, and says it was not even close. You do not argue.', drink: (
      '{n} insults the drink, the bar, the bartender, and the city, in that order, from a list.'), leave: '"Don\'t come back," {n} says, to the screen.', quiet: (
      '{n} says nothing for a long time, and then says, "You are not as bad as I thought."') },
  curious: { win: ('{n} asks how you knew, and what the odds were, and whether you count, and takes {cr} cr off the table in questions before you ' +
      'take it in coin.'), lose: '{n} plays a hand and then spends ten minutes asking how you lost it, and you are never sure whether it is a joke. {cr} cr.', drink: (
      '{n} asks about your ship, your home, your last port and the best thing you have eaten, and writes none of it down, and does not forget any of ' +
      'it.'), leave: '"Where are you headed next?" {n} asks, at the door, and writes it on their hand.', quiet: '{n} watches you not talking with open interest, and then tries it. They last four minutes.' },
  drunk: { win: ('{n} deals you a hand and then forgets which they dealt to themselves. You take {cr} cr, and {n} cheers for you, sincerely, and ' +
      'orders another.'), lose: '{n} wins {cr} cr and looks astonished, and wants it understood that it was skill, and then asks what game it was.', drink: (
      '{n} tells you the same story three times, and each time it is about a different ship. You are not sure which one is true. You think none of ' +
      'them.'), leave: '{n} waves, to the left of where you are, and says something warm that is not quite a word.', quiet: '{n} falls asleep with their head on their arm, and you sit with them until the bartender comes over with a blanket.' },
  secretive: { win: ('{n} plays with an expression you cannot read and a hand you cannot guess. You take {cr} cr, and {n} gives nothing away, and the ' +
      'only change is that they do not look at the door.'), lose: '{n} wins {cr} cr without a word, counts it without looking, and asks how long you have had the ship.', drink: (
      '{n} answers every question with a question and gives you, as far as you can tell, nothing. On the way home you realize you told them a great ' +
      'deal.'), leave: '"I never saw you," {n} says, without a smile.', quiet: '{n} relaxes in the silence, and does not ask you anything.' },
  kind: {
    win: '{n} loses gracefully, and as you take {cr} cr they ask if you are all right, because you looked tired. You were.',
    lose: '{n} wins {cr} cr and feels bad about it at once, and buys you a drink, and says it is nothing.',
    drink: '{n} asks about you, and means it. By the end of the glass you have said something true that you had not planned to say to anyone.',
    leave: '"Look after yourself," {n} says, and offers to walk you to the lock.',
    quiet: '{n} makes room on the bench, and then nothing else.'
  },
  brave: { win: ('{n} bets everything on the last hand with a grin and loses {cr} cr to you, and offers a rematch, double or nothing, before the ' +
      'cards are down.'),
  lose: '{n} wins {cr} cr on a bluff that should not have worked, and shows you the hand afterwards, with relish.',
      drink: '{n} tells you about a bad moment and what they did in it, and does not make it sound better than it was.',
      leave: '"Any time," {n} says, "and any place." It is an offer.',
      quiet: '{n} sits with their back to the door, as always, and for once does not watch it.' },
  homesick: {
    win: '{n} plays absent-mindedly, thinking of somewhere else, and loses {cr} cr to you without noticing.',
    lose: '{n} plays well, for someone whose mind is elsewhere. {cr} cr, and a smile that is not about the game.',
    drink: '{n} talks about {home}, and then stops, and then talks about it again, and by the third time you could draw the street.',
    leave: '{n} looks at the door, and then at you, and says, "Say hello to somewhere nice for me."',
    quiet: '{n} takes out a creased photograph and sets it between you, and neither of you mentions it. You look at it for a while.'
  },
};
const BAR_GOAL = {
  home: '{n} is going home, and keeps looking at the clock. "Three more ports," they say, to nobody in particular.',
  family: '{n} is going to see family, and has brought the wrong present, and knows it. "What do you give a niece?" they ask.',
  job: '{n} has an interview, and is rehearsing it under their breath, and stops when they see you looking.',
  fresh: '{n} says, flatly, that they are starting again, and that they would rather not say from what.',
  research: '{n} has a posting waiting at the end of the trip, and mentions the instruments for it before the name.',
  pilgrim: '{n} touches the cord at their wrist and asks, quietly, whether your ship is bound anywhere holy.',
  medical: '{n} presses a hand to their side and asks, quietly, whether your ship carries a medic.',
  vague: '{n} says they are traveling for reasons, and leaves it there, and orders another.',
};
const barTrait = (kind, p, generic) => {
  const trait = barLines('trait'), own = p.traits.slice(0, 2).map(t => (trait[t] || {})[kind]).filter(Boolean);
  return own.length && Math.random() < 0.7 ? pick(own) : pick(generic);
};
// How they take you, for someone you know: a friend teases, an enemy keeps it stiff.
const barTone = (pat, p) => (!pat.known ? '' : p.opinion >= OPINION.FRIEND ? ` ${p.first} grins. "Same again, next port."` : p.opinion <= OPINION.ENEMY ? ` ${p.first} keeps it short, and does not look up.` : '');

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
  const known = Object.values(st.people).filter(p => p.location === planet.name && !p.regular && !st.crew.includes(p.id) && !aboard.has(p.id) && !p.ship)
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
    if (/Shortage of Water/.test(x.text)) out.push(`The beer is watered down. A sign by the taps says the water ration on ${planet.name} is cut.`);
    else if (/at war/.test(x.text)) out.push('A navy recruiter is buying drinks for anyone who will sit still.');
    else if (/pirate/i.test(x.text) && x.bad) out.push('Half the pilots in here are talking about the raids. The other half are not talking.');
    else if (/booming/.test(x.text)) out.push('Money is loose tonight. Somebody at the back is buying rounds for strangers.');
    else if (/slump/.test(x.text)) out.push('The place is half empty. Everyone is nursing one drink.');
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
    const lines = CREW_AT_BAR[cm.role];
    if (lines && Math.random() < 0.6) out.push(pick(lines).replace(/\{n\}/g, `<button class="link" data-action="person" data-arg="${esc(cm.id)}">${esc(cm.first)}</button>`));  // the name opens their page
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
  const p = pat.p, st = G.state, bar = G.barState.name, t0 = p.traits[0];
  const mem = p.memories.length ? p.memories[p.memories.length - 1].replace(/^(Day \d+|\d+ \w+ \d+): /, '') : null;
  const text = pat.known
    ? `${p.first} ${p.last} ${p.opinion >= OPINION.FRIEND ? 'waves you over' : p.opinion <= OPINION.ENEMY ? 'sees you and scowls into their drink' : 'nods at you'}.${pat.regular && p.gossip ? ` Since you were last here, ${p.first} ${p.gossip}` : ''}${mem ? ` Last time: "${mem}"` : ''}`
    : [
      `${p.first} ${p.last}: a ${TRAITS[p.traits[0]].adj}, ${TRAITS[p.traits[1]].adj} ${p.job} from ${p.home}, ${GOALS[p.goal]}. ${pick(OPENERS[t0])}`,
      `${pick(OPENERS[t0])} It is ${p.first} ${p.last}, ${GOALS[p.goal]}: a ${p.job} from ${p.home}, and ${TRAITS[p.traits[1]].adj}, you would say, if you had to.`,
      `Somebody has taken the other stool. ${p.first} ${p.last} is a ${p.job} from ${p.home}, ${TRAITS[p.traits[0]].adj} and ${TRAITS[p.traits[1]].adj}, and ${GOALS[p.goal]}. ${pick(OPENERS[t0])}`,
    ][byName(p, 'intro', 3)];
  const choices = barMenu(pat, p, { st, bar });  // a rotating few from the pool in bartopics.js
  choices.push({ label: 'Leave them to their drink', run: () => barSays(barTrait('leave', p, barLines('leave')), p) + barTone(pat, p) });
  return { title: `${bar}: ${p.first} ${p.last}`, text, choices };
}

function barHtml() {
  const st = G.state, planet = currentPlanet();
  if (!G.patrons || G.barState.planet !== planet.name) fillBar(planet);
  const b = barOf(planet), round = 25 * (4 + G.patrons.filter(x => !x.cast).length);
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
    <p class="desc">${raw(b.vibe)}</p>
    ${matchNight() ? h`<div class="hint">${raw(matchNight().text)}</div>` : ''}
    ${(G.barState.lines = G.barState.lines || roomLines(planet)).map(l => h`<div class="hint">${raw(l)}</div>`)}
    ${G.barState.note ? h`<p class="desc">${raw(G.barState.note)}</p>` : ''}
    <div class="row"><button data-action="barRound" ${st.credits >= round && !G.barState.round ? '' : 'disabled'}>${G.barState.round ? 'You bought a round' : `Buy a round for the house (${fmt(round)} cr)`}</button></div>
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
      const st = G.state, cost = 25 * (4 + G.patrons.filter(x => !x.cast).length);
      if (G.barState.round || st.credits < cost) return;
      G.barState.round = true;
      st.credits -= cost;
      for (const pat of G.patrons.filter(x => !x.cast)) { met(pat); like(pat.p, 1, `The captain bought a round at ${G.barState.name}.`); }
      if (isFaction(localGov())) changeRep(localGov(), 1);
      G.barState.note = (`You buy a round for the house. The room raises a glass to your ship, and someone at the bar tells you: "${addRumor()}"`);
    });
  },
});
