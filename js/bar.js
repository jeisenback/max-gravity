'use strict';

// The bar at every port: a Bar tab with the room's mood (from local conditions, the
// feeds, and your crew), a few patrons to talk to, people you already know who are
// in town, and crew looking for a ship. Strangers become people you know once you
// deal with them (st.people), so they can turn up again. Loaded before game.js;
// only calls into it at runtime.

const DRINK = 20, CARDS = 200;

const BARS = {
  'Hermes Foundry': ['The Heat Sink', 'Foundry shifts change every six hours, and the bar fills and empties with them. Everyone is red through two layers of shielding. The ice in the drinks costs more than the liquor. The bartender slides your glass down the bar without looking. The place smells of cold metal and lime. Nobody stays for more than one round, and everybody says they are here for a couple more years.'],
  Earth: ['The Gravity Well', 'A spaceport bar with a long copper counter and travel posters from a dozen ports curling on the walls. The drinks are real, and so are the prices. At the far end a man in a good coat is telling a story about the sea to a table of Belters, and he is paying for every round.'],
  Luna: ['Copernicus Lounge', 'Low gravity, a long bar, and Coalition officers in civilian jackets that do not fit. The bartender pours slow on purpose: in one-sixth g the drinks come out in tall ribbons and take a long time to settle. A window behind the bar looks out on the gray plain, the drydocks and, past them, Earth. People keep their voices down.'],
  Mars: ['The Red Line', 'Tharsis veterans at one end of the bar, terraforming engineers at the other, and in the middle an argument about the atmosphere that has run for forty years. The bar top is one slab of red basalt. Most people order coffee. A countdown is chalked on the wall: DAYS UNTIL THE FIRST RAIN. Someone updates it every morning.'],
  'Phobos Yards': ['Dry Dock', 'Shipwrights at tables where they can see the yard through a wide window: gantries, and the welded ribs of a half-finished hull. Every table has a ship part on it and someone explaining it on a napkin. There is a jar behind the bar for lost tools. In the corner an old man is asleep in a chair. They say he built the first hull that left Phobos. Nobody wakes him.'],
  'Ceres Station': ['The Spin', 'Belters, three deep at the bar, talking with their hands in a mix of dialects. The water ration is posted over the taps in block letters and updated on the hour. Every drink comes with a small glass of tap water, because the law says so. The floor tilts toward the curve of the station, and the regulars lean with it.'],
  'Ring Nine': ['Auntie Oyelaran\'s', 'A noodle counter with a still behind it, in a corner of an old cargo bay, with paper lanterns strung from the pipes. Squatter families and off-shift dockers sit on stools made from fuel drums. The menu is one hand-lettered board. Auntie says the broth is the best in the Belt, points a wooden spoon at your chest, and says it again. By the till is a shrine to the ship\'s old captain, with a dish of fresh noodles in front of it. Nobody takes them.'],
  'Pallas Refinery': ['The Slag Heap', 'Refinery crews in heat suits unzipped to the waist, steaming in the cool air. By custom no stranger pays for the first round, and the bartender enforces it with a raised eyebrow. The tables are old casting molds, still warm. Signed work jackets hang on the walls like flags, one for every crew that lost someone. It smells of hot metal and beer.'],
  'The Hollows': ['The Chute', 'A bar in an old ore chute, dim and hung with quilts, with a long curved counter cut from the rock. Children underfoot, grandparents at dominoes, a ring-ball match on every screen, and an argument at every table. Someone\'s aunt pours the drinks. Someone\'s cousin plays the fiddle badly. A bowl of salted beans reaches you within a minute of sitting down. Nobody asks your business.'],
  'The Rook': ['The Gallows', 'Hollis Mbeki\'s people drink here. Their tables are known, and nobody sits at them by mistake. The ceiling is low and made of dull black pipe, and a rope with a noose knotted in it hangs over the bar as a joke. It has collected a great many hats. Keep your hands where people can see them. The bartender is polite.'],
  Boneyard: ['The Wreck Room', 'Built inside the bridge of a dead ore hauler. The captain\'s chair is still bolted to the floor, and by custom nobody sits in it. The old instruments are in place, dark and dusty. The original viewport looks out on a hundred other wrecks lashed together. Salvagers trade rumors of fresh wrecks over thick sweet coffee. At closing they switch on the old running lights, one after another.'],
  Ironheart: ['Co-op Hall', 'Half bar, half meeting hall, with a long trestle table down the middle and a cracked gavel on a hook. Most nights there is a vote on something, and the losers buy the next round. The ballot box is a fuel can. The minutes of every meeting are pinned to the wall in handwriting that runs from neat to unreadable. Newcomers are expected to speak.'],
  'Juno Commons': ['The Greenhouse', 'Tables among tomato vines under a curved glass dome. The air is warm and wet and smells of leaves. Within the hour people will ask your name, your ship, and how you take your tea. A small brass watering can hangs at every table, and when you sit, someone hands you one to water the vine over your seat.'],
  'Eros Old Town': ['The Last Strike', 'Sepia holos of the boom years flicker on the walls: crowds, dust, hopeful faces. The regulars are old enough to be in them, and will say which one. The bar is a plank from a mining sledge, dented by a hundred picks. On a shelf behind it, in a glass case, sits one nugget of platinum. Nobody has been able to prove it is real.'],
  Ganymede: ['Harvest Moon', 'Agri-dome workers with dirt under their nails and money in their pockets. A skylight overhead fills with Jupiter, banded and slow. The bar is polished wood, brought from Earth, they say. The drinks are made from whatever came in that week: peach, pear, wild honey, something with rosemary. The air smells of ripe fruit.'],
  Europa: ['The Crack', 'Ice haulers between runs, in bulky insulated jackets, bent over steaming mugs. The walls sweat. The floor is always wet. Union notices are three layers deep on every bulkhead. One blue lamp lights the room, and the only sound is the ice groaning beneath it. When they come in, the regulars tap the wall twice. Nobody explains it, and nobody skips it.'],
  Titan: ['Orange Sky', 'Consortium clerks and methane-rig crews at separate tables, with a space down the middle of the room that nobody crosses. The window looks out on rain, a slow amber curtain, and the light all day is the color of weak tea. The drinks are quiet and expensive. The bartender is at your elbow the moment your glass is empty, and gone before you can say thank you.'],
  Enceladus: ['Geyser Bar', 'Six stools and a window on the plumes, which rise white and silent against the black. The bartender is also the harbormaster, the doctor and, when it comes up, the mayor. A first-aid kit sits next to the bottles, and a shortwave radio on the bar. One bottle of something good stays on the top shelf. It is not for sale. Everyone is offered a glass of it, sooner or later.'],
  'Triton Outpost': ['The Long Night', 'The last bar in the solar system, according to a hand-painted sign. A jar of coins from every port sits on the bar; people leave one to show they came. The people here are either running from something or waiting for someone, and the ones waiting keep their eyes on the door. The stove in the corner burns whatever will burn. The light is dim and orange.'],
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
  contraband: ['lowers their voice: "If you ever need something moved and not looked at, I know people. I might be people."', 'leans in and does not meet your eye: "There is a kind of cargo that does not appear on a kind of manifest. I can put you in touch with a kind of person."'],
  wanted: ['goes quiet when a patrol officer comes in, and studies their drink until the officer leaves.', 'watches the door through the whole conversation. When it opens they stop moving. It is the barman\'s cousin, and they start again.'],
  ill: ['coughs into their sleeve and waves it off. "Nothing. Recyclers on my last ship. It\'ll pass."', 'coughs hard and hides the cloth. It is the dust in here, they say, and would you like another.'],
  spy: ['asks a lot of questions about your routes and answers none about theirs.', 'is pleasant and asks small, exact things about ports and times, and gives you nothing.'],
  debt: ['says, three drinks in, that they owe the wrong people more than they will make in a year.', 'looks into the bottom of their cup and says there are people looking for them, and it is mostly a question of time.'],
};

const CREW_AT_BAR = {
  engineer: ['{n} is sketching a drive modification on a napkin for anyone who will look.', '{n} has found the one other engineer here. They are arguing about injectors.', '{n} is holding a fork up to the light and saying "tolerances" under their breath.', '{n} is under a table with a flashlight, looking at the bar\'s wiring.', '{n} has been handed a wrench by the bartender and is fixing the tap.', '{n} is explaining the coolant loop to a stranger with four salt shakers and a pool of gravy.'],
  pilot: ['The flip burn in {n}\'s story is two g harder than it was an hour ago.', '{n} is losing at darts and blaming the gravity.', '{n} has drawn a lane map in spilled beer and is arguing for it with anyone who comes by.', '{n} and another pilot at the far end of the bar are arguing about angles, in hand gestures.', '{n} is sitting straight, listening to a stranger\'s story about a bad landing. {n} winces at the landing.', '{n} is standing on a chair, demonstrating a docking maneuver with two glasses and a napkin.'],
  gunner: ['{n} is arm-wrestling a dockworker, and winning.', '{n} sits with their back to the wall and watches the room.', '{n} is cleaning a cup with the hem of their shirt and watching the door.', '{n} has won a small bet on a dart throw and is refusing the money.', '{n} shares a corner table with an old navy veteran. Neither has spoken in an hour. Both have ordered a second round.', '{n} is telling a quiet story about a jammed gun and a captain who never found out.'],
  quartermaster: ['{n} is working the room, buying no drinks.', '{n} is haggling with the bartender over the price of a bottle.', '{n} is making a list on the back of a receipt.', '{n} is talking with a grain merchant. A price has been mentioned twice.', '{n} is listening to a stranger\'s theory about the price of water and taking notes.', '{n} has a very large bag of dried figs and is handing them out to the room.'],
  slicer: ['{n} is at a corner table, doing something to the bar\'s jukebox.', '{n} is on their terminal with their back to the room.', '{n} has taken over the bar\'s music. Nobody has complained.', '{n} is watching the bar\'s security feed on a very small screen.', '{n} is talking to the bartender, low, about the till. The bartender counts it twice.', '{n} has made three friends and one enemy in the last ten minutes.'],
  medic: ['{n} is patching up someone who lost an argument with a bulkhead.', '{n} is nursing one drink and watching everyone else\'s.', '{n} has been cornered by a stranger with a rash.', '{n} is giving a short lecture on hydration to a table of dockers.', '{n} is sitting alone with an empty glass in both hands.', '{n} is showing the bartender how to bandage a burn, with a napkin.'],
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
    if (lines && Math.random() < 0.6) out.push(pick(lines).replace(/\{n\}/g, cm.first));
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
    : `${p.first} ${p.last}: a ${TRAITS[p.traits[0]].adj}, ${TRAITS[p.traits[1]].adj} ${p.job} from ${p.home}, ${GOALS[p.goal]}. ${pick(OPENERS[t0])}`;
  const choices = [
    { label: `Buy ${p.first} a drink (${DRINK} cr)`, can: () => st.credits >= DRINK && !pat.drank, run() {
      pat.drank = true;
      st.credits -= DRINK;
      met(pat);
      like(p, 1, `The captain bought me a drink at ${bar}.`);
      if (p.secret && (p.traits.includes('talkative') || p.traits.includes('drunk') || Math.random() < 0.3)) return `${p.first} ${pick(SECRET_TALK[p.secret])}`;
      if (Math.random() < 0.5) return `${p.first} looks around and leans in. "Here's something you can use," they say, low and fast: "${addRumor()}" Then they sit back and finish their drink. Neither of you speaks for the rest of the glass.`;
      return `${p.first} tells you about ${p.home}: the streets, the smell of the market, why they left, and why they might go back. There is no rumor in it, and no secret, and no angle. It takes an hour.`;
    } },
    { label: 'Ask what they have heard', can: () => !pat.asked, run() {
      pat.asked = true;
      met(pat);
      if (p.traits.includes('secretive')) return `"Nothing worth repeating," ${p.first} says, and smiles, and goes back to their drink. They do not look up again while you are there.`;
      return Math.random() < 0.6 ? `${p.first} thinks about it, then says: "${addRumor()}"` : `${p.first} laughs and leans back. "Did you hear? ${feedLine().replace('[Feed] ', '')}" They go on for twenty minutes.`;
    } },
  ];
  // A berth is the captain's to give, so a hand has none to offer.
  if (!hired() && (!pat.known || p.opinion >= 0)) choices.push({ label: `Offer ${p.first} passage`, can: () => !pat.offered && berthsFree() > 0 && p.goal !== 'fresh', run() {
    pat.offered = true;
    met(pat);
    const o = travelOffer(p);
    if (!o) return `${p.first} counts on their fingers, then shakes their head. "Nowhere you can reach from here," they say. "Ask me again when you have a longer tank."`;
    G.offers.unshift(o);
    return `"${o.destPlanet}?" ${p.first} says. "That's where I need to be." They name a fair fare and shake on it with both hands. The job is on the mission board.`;
  } });
  choices.push({ label: `Play ${p.first} at cards (${CARDS} cr)`, can: () => st.credits >= CARDS && !pat.played, run() {
    pat.played = true;
    met(pat);
    if (Math.random() < 0.5) {
      st.credits += CARDS;
      like(p, p.traits.includes('greedy') || p.traits.includes('rude') ? -1 : 0, 'The captain took my money at cards.');
      return `Three hands, slow and close. On the last card you take ${fmt(CARDS)} cr off ${p.first}. ${p.traits.includes('rude') ? `${p.first} stands up and says you cheated, loudly, and the whole bar turns to look. You leave them to it.` : `${p.first} shrugs, groans, and buys you a drink with your own money. You talk about nothing for an hour.`}`;
    }
    st.credits -= CARDS;
    like(p, 1, null);
    return `It goes the other way. ${p.first} takes ${fmt(CARDS)} cr off you, and buys you a drink with it, and sets it in front of you. Fair's fair. By the end of the glass you are laughing.`;
  } });
  if (p.traits.includes('rude') && !pat.known) choices.push({ label: 'Tell them what you think of their manners', can: () => !pat.fought, run() {
    pat.fought = true;
    met(pat);
    like(p, -2, 'The captain started a fight with me.');
    if (roleSkill('gunner') || Math.random() < 0.4) return `It is short and loud. ${roleSkill('gunner') ? `${roleName('gunner')} steps in and ` : ''}${p.first} ends up on the floor, and the whole bar cheers. Someone starts a chant. The bartender charges you for the stool anyway.`;
    st.credits = Math.max(0, st.credits - 150);
    return `It is short, and it does not go your way. There is a light, and a loud noise, and then nothing. You wake up in the back with a black eye and a 150 cr bill for the mirror. The bartender is standing over you with a wet cloth. "You were doing so well," the bartender says.`;
  } });
  if (p.traits.includes('homesick')) choices.push({ label: `Ask about ${p.home}`, can: () => !pat.home, run() {
    pat.home = true; met(pat); like(p, 2, `The captain let me talk about ${p.home}.`);
    return `${p.first} talks about the view from the ring where the light comes in at dusk, the smell of the market, the man who sold fried dough on the corner, and a sister who writes every week and signs off the same way. They talk until the bar is nearly empty. Then they buy the next round.`;
  } });
  if (p.traits.includes('pious')) choices.push({ label: hired() ? 'Ask for a blessing on the ship' : 'Ask for a blessing on your ship', can: () => !pat.blessed, run() {
    pat.blessed = true; met(pat); like(p, 1, 'I blessed the captain\'s ship.');
    return `${p.first} closes their eyes and lays two fingers on the transponder. They say a few words over your ship's name, in a cadence you do not know. The bar goes quiet. When they are done they open their eyes and touch your hand.`;
  } });
  if (pat.known && p.opinion <= OPINION.GRUDGE) choices.push({ label: 'Make peace (buy them a bottle, 300 cr)', can: () => st.credits >= 300 && !pat.peace, run() {
    pat.peace = true; st.credits -= 300; like(p, 3, 'The captain bought me a bottle and apologized.');
    return `${p.first} looks at the bottle a long time before taking it, turning it in the light to read the label. Then they set it between you on the table and pour two glasses. "It's a start," they say.`;
  } });
  choices.push({ label: 'Leave them to their drink', run: () => 'You get up and leave them to their drink. You go back to the bar and the noise of the room.' });
  return { title: `${bar}: ${p.first} ${p.last}`, text, choices };
}

function barHtml() {
  const st = G.state, planet = currentPlanet();
  if (!G.patrons || G.barState.planet !== planet.name) fillBar(planet);
  const b = barOf(planet), round = 25 * (4 + G.patrons.filter(x => !x.cast).length);
  const rows = G.patrons.map(({ p, known, cast, regular }, i) => `<div class="mission">
      <div><b>${p.first} ${p.last}</b>${known ? ` <span class="hint">(${opinionWord(p.opinion)})</span>` : ''}
        <div class="hint">${cast ? 'Aboard with you, and at the bar tonight.' : known ? `${regular ? 'A regular here.' : 'Someone you know.'} ${regular && p.gossip ? `${p.first} ${p.gossip} ` : ''}${p.memories.length ? p.memories[p.memories.length - 1] : ''}` : `${TRAITS[p.traits[0]].adj[0].toUpperCase()}${TRAITS[p.traits[0]].adj.slice(1)} ${p.job} from ${p.home}.`}</div></div>
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
