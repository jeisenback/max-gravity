'use strict';

// The bar at every port: a Bar tab with the room's mood (from local conditions, the
// feeds, and your crew), a few patrons to talk to, people you already know who are
// in town, and crew looking for a ship. Strangers become people you know once you
// deal with them (st.people), so they can turn up again. Loaded before game.js;
// only calls into it at runtime.

const DRINK = 20, CARDS = 200;

const BARS = {
  'Hermes Foundry': ['The Heat Sink', 'Foundry shifts change every six hours, and the bar fills and empties with them, in a long, steady tide of sunburned faces. Everyone is red through two layers of shielding, and the ice in the drinks is the most expensive thing on the menu. A bartender with forearms like cables slides your glass down the bar without looking, and the whole place smells of cold metal and lime. Nobody stays for more than one round. Everybody says they are only here for a couple more years.'],
  Earth: ['The Gravity Well', 'A spaceport bar for people leaving Earth and people who wish they had, with a long copper counter, and travel posters from a dozen ports curling on the walls. The drinks are real and the prices are criminal. At the far end, a man in a good coat is telling a story about the sea to a table of wide-eyed Belters, and, by the look of them, buying every round. It is loud, warm, and a little bit desperate, in the way of all places that sit at a door.'],
  Luna: ['Copernicus Lounge', 'Low gravity, long bar, Coalition officers pretending not to be, in civilian jackets that do not quite fit. The bartender pours slow on purpose: it looks better in one-sixth g, and the drinks, in tall curling ribbons, take a long, shining moment to settle. Behind the bar a great window looks out on the grey plain and the drydocks, and, beyond, the small bright curve of Earth. Nobody speaks loudly here. The walls have a habit of listening.'],
  Mars: ['The Red Line', 'Tharsis veterans at one end, terraforming engineers at the other, and an argument about the atmosphere in the middle that has run for forty years and shows no sign of a verdict. The bar top is a single slab of red basalt, polished by generations of elbows, and the coffee, which is what most people order, is excellent. Somebody has chalked a countdown on the wall: DAYS UNTIL THE FIRST RAIN. It is, apparently, updated every morning, with great seriousness.'],
  'Phobos Yards': ['Dry Dock', 'Shipwrights drinking where they can see the yard, through a wide window that looks out on the gantries and the cold, welded ribs of a half-finished hull. Every table has a ship part on it that someone is explaining, with drawings, on a napkin. There is a jar behind the bar for lost tools, and, in the corner, a very old man asleep in a chair, who, they say, built the first hull that ever left Phobos. Nobody has the heart to wake him.'],
  'Ceres Station': ['The Spin', 'Belters, three deep at the bar, talking with their hands, in a rolling, layered clamor of dialects and slang. The water ration is posted over the taps, in tall block letters, and updated on the hour, and every drink, without exception, is served with a small glass of tap water on the side, because the law says so and because it is the polite thing to do. The floor tilts very slightly toward the curve of the station. Regulars lean without noticing.'],
  'Ring Nine': ['Auntie Oyelaran\'s', 'A noodle counter with a still behind it, in a corner of an old cargo bay, with paper lanterns strung from the pipes. Squatter families, off-shift dockers, and the best broth in the Belt, which Auntie will tell you herself, without being asked, and with a wooden spoon pointed at your chest. The stools are made from fuel drums, and the menu is a single hand-lettered board. There is a shrine to the ship\'s old captain by the till, with a little dish of fresh noodles. Nobody ever takes them.'],
  'Pallas Refinery': ['The Slag Heap', 'Refinery crews still in their heat suits, unzipped to the waist, steaming gently in the cool air. Loud, hot, and nobody lets a stranger pay for the first one: it is the tradition, and the bartender enforces it with a raised eyebrow. The tables are made from old casting molds, still faintly warm, and the walls are covered in signed work jackets, hung like flags, one for every crew that ever lost someone. It is a rowdy, kind, unpretentious place, and it smells of hot metal and beer.'],
  'The Hollows': ['The Chute', 'A family place in an old ore chute, warm, dim, and hung with quilts, with a long curving bar carved from the rock itself. Kids underfoot, grandparents playing dominoes, a ring-ball match on every screen and a small, fierce argument at every table. Somebody\'s aunt is pouring the drinks, and somebody\'s cousin is playing the fiddle, badly. You are handed a bowl of salted beans within a minute of sitting down, and not one person asks your business, though everyone, you can tell, has a theory.'],
  'The Rook': ['The Gallows', 'Hollis Mbeki\'s people drink here, and everyone knows which tables are theirs, and no one, ever, sits at them by mistake. The room is dark, with a low ceiling of dull black pipes, and a rope with a noose knotted at the end hangs, as a joke, over the bar, and has, over the years, accumulated a great many hats. Keep your hands where people can see them. The bartender is very polite, and the polite ones are the ones you watch.'],
  Boneyard: ['The Wreck Room', 'Built inside the bridge of a dead ore hauler, with the captain\'s chair still bolted to the floor, patched, scarred, and, by long tradition, never sat in. The old instruments have been left in place, dusty and dark, and the viewport, the original one, looks out on a hundred other wrecks, lashed together in their slow, silent town. Salvagers trade rumors of fresh wrecks over cups of thick, sweet coffee, and, at closing time, they turn on the old running lights, all together, one by one.'],
  Ironheart: ['Co-op Hall', 'Part bar, part meeting hall, with a long trestle table down the middle and a cracked gavel on a hook. There is a vote on something most nights, and the losers buy the next round, which has, over the decades, produced a very gracious, very drunk sort of democracy. The ballot box is an old fuel can. The minutes of every meeting are pinned to the wall, in handwriting that ranges from immaculate to unreadable, and everyone, even the newcomers, is expected to have an opinion.'],
  'Juno Commons': ['The Greenhouse', 'Tables among the tomato vines, under a great curving dome of glass, with warm humid air that smells of leaves and earth. Everyone knows everyone, and within the hour they want to know you: your name, your ship, and how you take your tea. Little brass watering cans hang at every table, and, when you sit, somebody will hand you one, to tend the vine over your seat. It is the gentlest bar in the Belt, and there is not a stool in it that does not have a story.'],
  'Eros Old Town': ['The Last Strike', 'Sepia holos of the boom years on the walls, flickering, grainy, alive with crowds and dust and big, hopeful faces. The regulars are old enough to be in them, and will tell you which one, and will, if you let them, tell you what became of the others. The bar is a long, gleaming plank of a mining sledge, dented with a hundred picks, and, on a shelf behind it, in a glass case, is a single nugget of platinum, which nobody has ever been able to prove is real.'],
  Ganymede: ['Harvest Moon', 'Agri-dome workers with dirt under their nails and money in their pockets, and a great skylight overhead through which Jupiter fills the whole sky, banded and slow and enormous. The bar is a shining stretch of polished wood, brought, they say, from Earth, and the drinks are made from whatever came in that week: peach, pear, wild honey, something with rosemary. It is a plain, comfortable, generous place, and it smells, faintly and constantly, of ripe fruit.'],
  Europa: ['The Crack', 'Ice haulers between runs, in bulky insulated jackets, hunched over steaming mugs. The walls sweat, the floor is always wet, and the union notices are three layers deep on every bulkhead, in a dozen shades of curling paper. The room is lit by a single blue lamp, and the only sound is the faint, deep, humming groan of the ice beneath it. The regulars tap the wall, twice, for luck, when they come in. Nobody explains it, and nobody skips it.'],
  Titan: ['Orange Sky', 'Consortium clerks and methane-rig crews who pretend not to know each other, at separate tables, with a careful invisible line down the middle of the room. The window looks out on the rain, an endless, slow, amber curtain, and the light, all day, is the color of weak tea. The drinks are quiet and expensive, and the bartender has a way of appearing at your elbow the moment your glass empties, and vanishing before you can say thank you.'],
  Enceladus: ['Geyser Bar', 'Six stools and a window on the plumes, which rise white and silent against the black, and catch the light of a distant Sun. The bartender is also the harbormaster and the doctor, and the mayor, when it comes up, and keeps a first-aid kit next to the bottles, and a shortwave radio on the bar. There is one bottle of something good on the top shelf, which is not for sale, and which everyone, sooner or later, is offered a glass of. It is the kindest gesture on the moon.'],
  'Triton Outpost': ['The Long Night', 'The last bar in the solar system, and it knows it, with a hand-painted sign to say so, and a jar of coins from every port at the bar, that people leave to prove they came. Everyone here is either running from something or waiting for someone, and the ones who are waiting never stop looking at the door. The stove in the corner is fed with whatever will burn, and the whole room is lit, dimly, orange, like the inside of a very old lantern.'],
};

const OPENERS = {
  talkative: ['They are already halfway through a story when you sit down.', 'They start talking before you have finished sitting, and do not, for some time, pause for breath.', 'They lean across and say, "You have a kind face. I have to tell you something," and then do.'],
  nervous: ['They keep one eye on the door.', 'They jump when you sit down, and laugh at themselves a little too loudly, and apologize.', 'They have shredded a bar napkin into very fine strips, and are working on a second.'],
  generous: ['They push a bowl of salted beans your way.', 'They have already ordered you a drink, and are pretending not to have.', 'They slide over on the bench without being asked, and press a warm roll into your hand.'],
  greedy: ['They ask what a ship like yours clears in a month before they ask your name.', 'They are doing sums on a napkin, and, when they see you looking, do not stop.', 'They look at your boots, and your jacket, and your ship\'s transponder on the bar, and revise their price for you upward.'],
  pious: ['There is a prayer cord around their wrist, worn smooth.', 'They murmur a short blessing over their cup before they drink, and, seeing you watch, look faintly apologetic.', 'A small charm hangs from a chain at their throat, and, once or twice, they touch it.'],
  rude: ['"You\'re in my light."', '"Do you mind? I was here first, and I was enjoying the silence."', 'They look you up and down, slowly, and sigh, as though at a bill.'],
  curious: ['They want to know everything about your ship.', 'They ask what the drive is, and how many g, and whether it is true about the coolant loops, in a rapid, delighted stream.', 'They lean in, eyes bright, and say, "Tell me about your ship. All of it. Take your time."'],
  drunk: ['They are several drinks ahead of you and pulling away.', 'They greet you like a long-lost cousin, and, in the same breath, lose their train of thought.', 'They are cheerfully explaining something to a coaster, and hold up a finger, to ask you to wait.'],
  secretive: ['They angle their terminal away from you.', 'They give you a look that lasts exactly one second too long, and then a smile that means nothing.', 'They answer every question with a question, and they do it very well.'],
  kind: ['They ask if you have eaten.', 'They notice you are tired, and gently push a glass of water toward you before anything else.', 'They smile at you as if they had been waiting to, and make room without a word.'],
  brave: ['They have a fresh scar and a good story about it.', 'They sit with their back to the door, deliberately, as if daring the room to try something.', 'They roll up one sleeve to show a long, healing burn, and grin. "You should see the other guy," they say. "He is a wall."'],
  homesick: ['They are showing the bartender pictures of home.', 'They hold a small, creased photograph with both hands, and set it down, very carefully, as you sit.', 'They have the look of someone who has said the name of a place aloud a great many times, silently, and would like, tonight, to say it to someone.'],
};

const SECRET_TALK = {
  contraband: ['lowers their voice: "If you ever need something moved and not looked at, I know people. I might be people."', 'leans in, all warmth and no eye contact: "There is a certain kind of cargo that does not appear on a certain kind of manifest. I can put you in touch with a certain kind of person."'],
  wanted: ['gets quiet when a patrol officer comes in, and very interested in the drink until they leave.', 'watches the door the whole conversation, and, when it opens, goes still as a rabbit, and only relaxes when it is the barman\'s cousin.'],
  ill: ['coughs into their sleeve and waves it off. "Nothing. Recyclers on my last ship. It\'ll pass."', 'coughs, hard, and hides the cloth, and says, in a very light voice, that it is the dust in here, and would you like another.'],
  spy: ['asks a lot of questions about your routes, and answers none about theirs.', 'is pleasant, and interested, and asks small, precise things about ports and times, while giving you nothing at all, in the smooth, practiced way of someone who is very good at it.'],
  debt: ['admits, three drinks in, that they owe the wrong people more than they will make in a year.', 'stares at the bottom of their cup, and says, quietly, that there are people who are looking for them, and that it is, honestly, mostly a question of time.'],
};

const CREW_AT_BAR = {
  engineer: ['{n} is sketching a drive modification on a napkin for anyone who will look.', '{n} found the one other engineer here and they are arguing about injectors.', '{n} is holding a fork up to the light and muttering about the tolerances.', '{n} is under a table with a flashlight, looking at the bar\'s wiring, with an expression of pure, delighted horror.', '{n} has, somehow, been handed a wrench by the bartender, and is fixing the tap.', '{n} is explaining the coolant loop to a stranger with the aid of four salt shakers and a pool of gravy.'],
  pilot: ['{n} is telling a story about a flip burn that gets better every time.', '{n} is losing at darts and claiming the gravity is off.', '{n} has drawn a lane map in spilled beer and is defending it against all comers.', '{n} is trading hand gestures with another pilot at the far end of the bar, in what is clearly a very serious argument about angles.', '{n} is sitting very straight, listening to a stranger\'s story about a bad landing, and wincing in all the right places.', '{n} is standing on a chair, demonstrating a docking maneuver with two glasses and a napkin.'],
  gunner: ['{n} is arm-wrestling a dockworker, and winning.', '{n} sits with their back to the wall, watching the room.', '{n} is quietly, expertly, cleaning a cup with the hem of their shirt, and studying the door.', '{n} has won a very small, very serious bet on a dart throw, and is refusing, courteously, to take the money.', '{n} is sharing a corner table with an old navy veteran, and the two of them are not speaking, and seem to be having a wonderful time.', '{n} is telling a very quiet, very funny story about a jammed gun, and a captain who never found out.'],
  quartermaster: ['{n} is working the room, buying no drinks and hearing everything.', '{n} is haggling with the bartender over the price of a bottle.', '{n} is making a small, neat list on the back of a receipt, and nodding to themselves.', '{n} has struck up a conversation with a grain merchant, and, from the look of it, is very close to a deal.', '{n} is listening, with an air of great courtesy, to a stranger\'s theory about the price of water, and taking notes.', '{n} has, somehow, acquired a very large bag of dried figs, and is distributing them to the room.'],
  slicer: ['{n} is at a corner table, doing something to the bar\'s jukebox.', '{n} is on their terminal, ignoring everyone, which is how they like it.', '{n} has taken over the bar\'s music, and the playlist is, everyone agrees, a great improvement.', '{n} is watching the bar\'s security feed on a very small screen, with a small, private, professional smile.', '{n} is talking, in a low, amused voice, to a bartender who is clearly learning, in real time, how much {n} knows about his till.', '{n} has, in the last ten minutes, made three friends and one enemy, and is delighted with both.'],
  medic: ['{n} is patching up someone who lost an argument with a bulkhead.', '{n} is nursing one drink and watching everyone else\'s.', '{n} has been cornered by a stranger with a rash, and is being remarkably patient about it.', '{n} is giving a small, calm lecture on hydration to a table of very unwell-looking dockers.', '{n} is sitting alone, quietly, and, from the look of them, would like very much for someone to ask how they are.', '{n} is teaching a bartender the correct way to bandage a burn, with the help of a napkin and a great deal of patience.'],
};

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
    if (/Shortage of Water/.test(x.text)) out.push(`The beer is watered down, which on ${planet.name} is saying something.`);
    else if (/at war/.test(x.text)) out.push('A navy recruiter is buying drinks for anyone who will sit still.');
    else if (/pirate/i.test(x.text) && x.bad) out.push('Half the pilots in here are talking about the raids, and the other half are pretending not to be scared.');
    else if (/booming/.test(x.text)) out.push('Money is loose tonight. Somebody at the back is buying rounds for strangers.');
    else if (/slump/.test(x.text)) out.push('The place is half empty. Everyone is nursing one drink as long as it will go.');
  }
  out.push(pick([
    `The screens over the bar are showing "${show.title}". Someone shushes you during the good part.`,
    last ? `${ls.sport[0].toUpperCase()}${ls.sport.slice(1)} on every screen: ${last.a} ${last.sa}, ${last.b} ${last.sb}. ${pick([`The ${last.winner} fans are buying.`, `Someone here lost money on the ${last.loser}.`])}` : `The ${ls.name} has no games on tonight, and everyone is an expert anyway.`,
    `"${c.song.title}" by ${c.song.band} comes on for the third time tonight. Nobody complains.`,
    `Two people at the bar are arguing about the ending of "${book.title}".`,
    'A man at the end of the bar is telling the same joke he has told all evening, and, every time, somebody laughs, out of pity or habit.',
    'Somebody has started a game of dominoes, and it has become, in the last hour, a serious matter.',
    'The bartender polishes the same glass, slowly, in a pool of warm light, and hums something old.',
    'A very old couple are dancing, very slowly, in the corner, to a song nobody else can hear.',
    'The light over the bar flickers, twice, and everyone looks up, and, when it steadies, nobody says anything.',
    'A child is asleep in a booth, with her head on a rolled-up coat, while her parents talk in low voices over a bottle.',
  ]));
  for (const cm of crewMembers()) {
    const lines = CREW_AT_BAR[cm.role];
    if (lines && Math.random() < 0.6) out.push(pick(lines).replace('{n}', cm.first));
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
    ? `${p.first} ${p.last} ${p.opinion >= OPINION.FRIEND ? 'waves you over' : p.opinion <= OPINION.ENEMY ? 'sees you and scowls into their drink' : 'nods at you'}.${pat.regular && p.news ? ` Since you were last here, ${p.first} ${p.news}` : ''}${mem ? ` Last time: "${mem}"` : ''}`
    : `${p.first} ${p.last}: a ${TRAITS[p.traits[0]].adj}, ${TRAITS[p.traits[1]].adj} ${p.job} from ${p.home}, ${GOALS[p.goal]}. ${pick(OPENERS[t0])}`;
  const choices = [
    { label: `Buy ${p.first} a drink (${DRINK} cr)`, can: () => st.credits >= DRINK && !pat.drank, run() {
      pat.drank = true;
      st.credits -= DRINK;
      met(pat);
      like(p, 1, `The captain bought me a drink at ${bar}.`);
      if (p.secret && (p.traits.includes('talkative') || p.traits.includes('drunk') || Math.random() < 0.3)) return `${p.first} ${pick(SECRET_TALK[p.secret])}`;
      if (Math.random() < 0.5) return `${p.first} warms up over the second sip, and looks around, and leans in. "Here's something you can use," they say, low and fast, as though passing you a coin under the table: "${addRumor()}" They straighten, and, with a small, satisfied nod, return to their drink, and, for a while, you sit together in an easy silence.`;
      return `${p.first} tells you about ${p.home}, at length, and, in a low, unhurried voice, about the streets, and the smell of the market, and why they left, and why they might go back. There is no rumor in it, and no secret, and no angle. It's a good hour, the kind that reminds you that most people are, mostly, good company.`;
    } },
    { label: 'Ask what they have heard', can: () => !pat.asked, run() {
      pat.asked = true;
      met(pat);
      if (p.traits.includes('secretive')) return `"Nothing worth repeating," ${p.first} says, with a small polite smile that shuts like a door. They go back to their drink, and, for a long time, do not look up. You have the strong impression that they heard a great deal, and are choosing, very carefully, what to say.`;
      return Math.random() < 0.6 ? `${p.first} thinks for a moment, tilting their head, and then, with the air of a person choosing the best pastry in a case, says: "${addRumor()}" They nod, once, as if closing a book.` : `${p.first} laughs, and leans back, delighted to be asked. "Did you hear? ${feedLine().replace('[Feed] ', '')}" And, with that, they are off, into twenty minutes of gossip that you will remember, at odd hours, for weeks.`;
    } },
  ];
  // A berth is the captain's to give, so a hand has none to offer.
  if (!hired() && (!pat.known || p.opinion >= 0)) choices.push({ label: `Offer ${p.first} passage`, can: () => !pat.offered && berthsFree() > 0 && p.goal !== 'fresh', run() {
    pat.offered = true;
    met(pat);
    const o = travelOffer(p);
    if (!o) return `${p.first} thinks about it, seriously, counting on their fingers, and then shakes their head, with a rueful smile. "Nowhere you can reach from here, I'm afraid," they say. "I wish I could. Ask me again when you have a longer tank."`;
    G.offers.unshift(o);
    return `"${o.destPlanet}?" ${p.first} lights up, in a slow, disbelieving way, as though you had produced a rabbit from your sleeve. "That's where I need to be. That is exactly where I need to be." They name a fair fare, and shake on it with both hands. The job is on the mission board.`;
  } });
  choices.push({ label: `Play ${p.first} at cards (${CARDS} cr)`, can: () => st.credits >= CARDS && !pat.played, run() {
    pat.played = true;
    met(pat);
    if (Math.random() < 0.5) {
      st.credits += CARDS;
      like(p, p.traits.includes('greedy') || p.traits.includes('rude') ? -1 : 0, 'The captain took my money at cards.');
      return `The game is close, and slow, and tense, three hands, and a long stare across the table, and then, on the last card, you take ${fmt(CARDS)} cr off ${p.first}. ${p.traits.includes('rude') ? 'They accuse you of cheating, loudly, and at length, standing up, and the whole bar turns to watch. You leave them to it.' : 'They take it well, with a shrug and a good-natured groan, and buy you a drink with your own money, and, for a while, the two of you talk about nothing.'}`;
    }
    st.credits -= CARDS;
    like(p, 1, null);
    return `It is a good game, and it goes the other way. ${p.first} takes ${fmt(CARDS)} cr off you, with a small, apologetic smile, and, to your surprise, buys you a drink with it, and sets it in front of you with a flourish. Fair's fair. You drink, and, by the end of the glass, you are laughing.`;
  } });
  if (p.traits.includes('rude') && !pat.known) choices.push({ label: 'Tell them what you think of their manners', can: () => !pat.fought, run() {
    pat.fought = true;
    met(pat);
    like(p, -2, 'The captain started a fight with me.');
    if (roleSkill('gunner') || Math.random() < 0.4) return `It is short, and loud, and very bright. ${roleSkill('gunner') ? `${roleName('gunner')} steps in, unhurried, and ` : ''}${p.first} ends up on the floor, with a bewildered expression, and the whole bar cheers, and someone starts a chant. The bartender charges you for the stool anyway, with a very small, very private smile.`;
    st.credits = Math.max(0, st.credits - 150);
    return `It is short, and it does not go your way. There is a very bright light, and a very loud noise, and then a long, dark, pleasant nothing. You wake up in the back with a black eye and a 150 cr bill for the mirror, and a bartender, standing over you, holding a wet cloth, who says, with real sympathy, "You were doing so well."`;
  } });
  if (p.traits.includes('homesick')) choices.push({ label: `Ask about ${p.home}`, can: () => !pat.home, run() {
    pat.home = true; met(pat); like(p, 2, `The captain let me talk about ${p.home}.`);
    return `${p.first} lights up, like a lamp coming on in a window. You hear about the view from the ring, where the light comes in at dusk, the smell of the market, the man who sold fried dough on the corner, and a sister who writes every week and always signs off the same way. They talk until the bar is nearly empty, and, when they finally stop, they buy the next round, and their eyes are very bright.`;
  } });
  if (p.traits.includes('pious')) choices.push({ label: hired() ? 'Ask for a blessing on the ship' : 'Ask for a blessing on your ship', can: () => !pat.blessed, run() {
    pat.blessed = true; met(pat); like(p, 1, 'I blessed the captain\'s ship.');
    return `${p.first} closes their eyes, and lays two fingers on the transponder, very gently, and says a few words over your ship's name, in a low, ancient cadence you do not know. The whole bar seems, for a moment, to lean in. When they are done, they open their eyes, and smile, and touch your hand. It can't hurt. It might, you think, even help.`;
  } });
  if (pat.known && p.opinion <= OPINION.GRUDGE) choices.push({ label: 'Make peace (buy them a bottle, 300 cr)', can: () => st.credits >= 300 && !pat.peace, run() {
    pat.peace = true; st.credits -= 300; like(p, 3, 'The captain bought me a bottle and apologized.');
    return `${p.first} looks at the bottle a long time before taking it, turning it in the light, reading the label, as though it might be a trap. Then they take it, and set it between you on the table, and pour two glasses. "It's a start," they say, gruffly. It is not forgiveness. But the tension, in the room, and in their shoulders, comes down, one small notch.`;
  } });
  choices.push({ label: 'Leave them to their drink', run: () => 'You nod, and get up, and leave them to their drink, and the little pool of quiet around their table closes behind you like water. You head back to the bar, and the noise of the room, and, for a while, do not think of them at all.' });
  return { title: `${bar}: ${p.first} ${p.last}`, text, choices };
}

function barHtml() {
  const st = G.state, planet = currentPlanet();
  if (!G.patrons || G.barState.planet !== planet.name) fillBar(planet);
  const b = barOf(planet), round = 25 * (4 + G.patrons.filter(x => !x.cast).length);
  const rows = G.patrons.map(({ p, known, cast, regular }, i) => `<div class="mission">
      <div><b>${p.first} ${p.last}</b>${known ? ` <span class="hint">(${opinionWord(p.opinion)})</span>` : ''}
        <div class="hint">${cast ? 'Aboard with you, and at the bar tonight.' : known ? `${regular ? 'A regular here.' : 'Someone you know.'} ${regular && p.news ? `${p.first} ${p.news} ` : ''}${p.memories.length ? p.memories[p.memories.length - 1] : ''}` : `${TRAITS[p.traits[0]].adj[0].toUpperCase()}${TRAITS[p.traits[0]].adj.slice(1)} ${p.job} from ${p.home}.`}</div></div>
      <button data-action="barTalk" data-arg="${i}">Talk</button>
    </div>`).join('');
  const hire = G.bar.map((c, i) => `<div class="mission">
      <div><b>${fullName(c)}</b> &middot; ${ROLE_NAMES[c.role]}, skill ${c.skill}/3<div class="hint">${describe(c).replace(GOALS[c.goal], 'looking for a ship')}</div></div>
      ${interviewButton(i)}<button data-action="hire" data-arg="bar:${i}" ${berthsFree() > 0 && st.credits >= c.fee ? '' : 'disabled'}>Hire (${fmt(c.fee)} cr)</button>
    </div>`).join('');
  return `
    <h3>${b.name}</h3>
    <p class="desc">${b.vibe}</p>
    ${matchNight() ? `<div class="hint">${matchNight().text}</div>` : ''}
    ${(G.barState.lines = G.barState.lines || roomLines(planet)).map(l => `<div class="hint">${l}</div>`).join('')}
    ${G.barState.note ? `<p class="desc">${G.barState.note}</p>` : ''}
    <div class="row"><button data-action="barRound" ${st.credits >= round && !G.barState.round ? '' : 'disabled'}>${G.barState.round ? 'You bought a round' : `Buy a round for the house (${fmt(round)} cr)`}</button></div>
    ${barWorkHtml()}
    <h3>Tonight</h3>
    ${rows || '<p class="hint">Just you and the bartender.</p>'}
    ${hire && !hired() ? `<h3>Looking for a ship</h3>${hire}` : ''}`;
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
