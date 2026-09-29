'use strict';

// The bar at every port: a Bar tab with the room's mood (from local conditions, the
// feeds, and your crew), a few patrons to talk to, people you already know who are
// in town, and crew looking for a ship. Strangers become people you know once you
// deal with them (st.people), so they can turn up again. Loaded before game.js;
// only calls into it at runtime.

const DRINK = 20, CARDS = 200;

const BARS = {
  'Hermes Foundry': ['The Heat Sink', 'Foundry shifts change every six hours, and the bar fills and empties with them. Everyone is sunburned through two layers of shielding.'],
  Earth: ['The Gravity Well', 'A spaceport bar for people leaving Earth and people who wish they had. The drinks are real and the prices are criminal.'],
  Luna: ['Copernicus Lounge', 'Low gravity, long bar, Coalition officers pretending not to be. The bartender pours slow on purpose; it looks better in one-sixth g.'],
  Mars: ['The Red Line', 'Tharsis veterans at one end, terraforming engineers at the other, and an argument about the atmosphere in the middle that has run for forty years.'],
  'Phobos Yards': ['Dry Dock', 'Shipwrights drinking where they can see the yard. Every table has a ship part on it that someone is explaining.'],
  'Ceres Station': ['The Spin', 'Belters, three deep at the bar, talking with their hands. The water ration is posted over the taps.'],
  'Ring Nine': ['Auntie Oyelaran\'s', 'A noodle counter with a still behind it. Squatter families, off-shift dockers, and the best broth in the Belt, which Auntie will tell you herself.'],
  'Pallas Refinery': ['The Slag Heap', 'Refinery crews still in their heat suits. Loud, hot, and nobody lets a stranger pay for the first one.'],
  'The Hollows': ['The Chute', 'A family place in an old ore chute. Kids underfoot, grandparents playing dominoes, a ring-ball match on every screen.'],
  'The Rook': ['The Gallows', 'Hollis Mbeki\'s people drink here, and everyone knows which tables are theirs. Keep your hands where people can see them.'],
  Boneyard: ['The Wreck Room', 'Built inside the bridge of a dead ore hauler, with the captain\'s chair still bolted to the floor. Salvagers trade rumors of fresh wrecks.'],
  Ironheart: ['Co-op Hall', 'Part bar, part meeting hall. There is a vote on something most nights, and the losers buy the next round.'],
  'Juno Commons': ['The Greenhouse', 'Tables among the tomato vines. Everyone knows everyone, and within the hour they want to know you.'],
  'Eros Old Town': ['The Last Strike', 'Sepia holos of the boom years on the walls. The regulars are old enough to be in them, and will tell you which one.'],
  Ganymede: ['Harvest Moon', 'Agri-dome workers with dirt under their nails and money in their pockets. Jupiter fills the skylight.'],
  Europa: ['The Crack', 'Ice haulers between runs. The walls sweat, the floor is always wet, and the union notices are three layers deep.'],
  Titan: ['Orange Sky', 'Consortium clerks and methane-rig crews who pretend not to know each other. The window looks out on the rain.'],
  Enceladus: ['Geyser Bar', 'Six stools and a window on the plumes. The bartender is also the harbormaster and the doctor.'],
  'Triton Outpost': ['The Long Night', 'The last bar in the solar system, and it knows it. Everyone here is either running from something or waiting for someone.'],
};

const OPENERS = {
  talkative: 'They are already halfway through a story when you sit down.',
  nervous: 'They keep one eye on the door.',
  generous: 'They push a bowl of salted beans your way.',
  greedy: 'They ask what a ship like yours clears in a month before they ask your name.',
  pious: 'There is a prayer cord around their wrist, worn smooth.',
  rude: '"You\'re in my light."',
  curious: 'They want to know everything about your ship.',
  drunk: 'They are several drinks ahead of you and pulling away.',
  secretive: 'They angle their terminal away from you.',
  kind: 'They ask if you have eaten.',
  brave: 'They have a fresh scar and a good story about it.',
  homesick: 'They are showing the bartender pictures of home.',
};

const SECRET_TALK = {
  contraband: 'lowers their voice: "If you ever need something moved and not looked at, I know people. I might be people."',
  wanted: 'gets quiet when a patrol officer comes in, and very interested in the drink until they leave.',
  ill: 'coughs into their sleeve and waves it off. "Nothing. Recyclers on my last ship. It\'ll pass."',
  spy: 'asks a lot of questions about your routes, and answers none about theirs.',
  debt: 'admits, three drinks in, that they owe the wrong people more than they will make in a year.',
};

const CREW_AT_BAR = {
  engineer: ['{n} is sketching a drive modification on a napkin for anyone who will look.', '{n} found the one other engineer here and they are arguing about injectors.'],
  pilot: ['{n} is telling a story about a flip burn that gets better every time.', '{n} is losing at darts and claiming the gravity is off.'],
  gunner: ['{n} is arm-wrestling a dockworker, and winning.', '{n} sits with their back to the wall, watching the room.'],
  quartermaster: ['{n} is working the room, buying no drinks and hearing everything.', '{n} is haggling with the bartender over the price of a bottle.'],
  slicer: ['{n} is at a corner table, doing something to the bar\'s jukebox.', '{n} is on their terminal, ignoring everyone, which is how they like it.'],
  medic: ['{n} is patching up someone who lost an argument with a bulkhead.', '{n} is nursing one drink and watching everyone else\'s.'],
};

function barOf(planet) {
  const b = BARS[planet.name];
  return b ? { name: b[0], vibe: b[1] } : { name: `The ${pick(TITLE_A)} ${pick(TITLE_N)}`, vibe: 'A dockside bar like a hundred others: bad light, cheap drinks, and everybody\'s business.' };
}

// Who is in tonight: people you know who are in town, and a few strangers.
function fillBar(planet) {
  const st = G.state, sid = st.systemId, aboard = new Set(paxAboard().map(m => m.pid));
  const known = Object.values(st.people).filter(p => p.location === planet.name && !st.crew.includes(p.id) && !aboard.has(p.id) && !p.ship)
    .sort((a, b) => Math.abs(b.opinion) - Math.abs(a.opinion)).slice(0, 2);
  G.patrons = [
    ...known.map(p => ({ p, known: true })),
    ...Array.from({ length: randInt(2, 4) }, () => ({ p: makePerson(Math.random() < 0.75 ? cultureOf(sid) : undefined), known: false })),
  ];
  G.barState = { round: false, name: barOf(planet).name, planet: planet.name };
}

// A stranger you deal with becomes someone you know.
function met(pat) {
  if (!pat.p.id) registerPerson(pat.p);
  pat.p.location = G.state.planet;
}

function roomLines(planet) {
  const out = [], sid = G.state.systemId, c = culture();
  for (const x of conditions(sid)) {
    if (/Shortage of Water/.test(x.text)) out.push(`The beer is watered down, which on ${planet.name} is saying something.`);
    else if (/at war/.test(x.text)) out.push('A navy recruiter is buying drinks for anyone who will sit still.');
    else if (/pirate/i.test(x.text) && x.bad) out.push('Half the pilots in here are talking about the raids, and the other half are pretending not to be scared.');
    else if (/booming/.test(x.text)) out.push('Money is loose tonight. Somebody at the back is buying rounds for strangers.');
    else if (/slump/.test(x.text)) out.push('The place is half empty. Everyone is nursing one drink as long as it will go.');
  }
  out.push(pick([
    `The screens over the bar are showing "${c.vid.title}". Someone shushes you during the good part.`,
    c.last ? `Ring-ball on every screen: ${c.last.a} ${c.last.sa}, ${c.last.b} ${c.last.sb}. ${pick([`The ${c.last.winner} fans are buying.`, `Someone here lost money on the ${c.last.loser}.`])}` : 'The ring-ball season has just started, and everyone is an expert.',
    `"${c.song.title}" by ${c.song.band} comes on for the third time tonight. Nobody complains.`,
    `Two people at the bar are arguing about the ending of "${c.book.title}".`,
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
  const p = pat.p, st = G.state, bar = G.barState.name, t0 = p.traits[0];
  const mem = p.memories.length ? p.memories[p.memories.length - 1].replace(/^Day \d+: /, '') : null;
  const text = pat.known
    ? `${p.first} ${p.last} ${p.opinion >= 2 ? 'waves you over' : p.opinion <= -2 ? 'sees you and scowls into their drink' : 'nods at you'}.${mem ? ` Last time: "${mem}"` : ''}`
    : `${p.first} ${p.last}: a ${TRAITS[p.traits[0]].adj}, ${TRAITS[p.traits[1]].adj} ${p.job} from ${p.home}, ${GOALS[p.goal]}. ${OPENERS[t0]}`;
  const choices = [
    { label: `Buy ${p.first} a drink (${DRINK} cr)`, can: () => st.credits >= DRINK && !pat.drank, run() {
      pat.drank = true;
      st.credits -= DRINK;
      met(pat);
      like(p, 1, `The captain bought me a drink at ${bar}.`);
      if (p.secret && (p.traits.includes('talkative') || p.traits.includes('drunk') || Math.random() < 0.3)) return `${p.first} ${SECRET_TALK[p.secret]}`;
      if (Math.random() < 0.5) return `${p.first} warms up. "Here's something you can use: ${addRumor()}"`;
      return `${p.first} tells you about ${p.home}, and why they left, and why they might go back. It's a good hour.`;
    } },
    { label: 'Ask what they have heard', can: () => !pat.asked, run() {
      pat.asked = true;
      met(pat);
      if (p.traits.includes('secretive')) return `"Nothing worth repeating." ${p.first} goes back to their drink.`;
      return Math.random() < 0.6 ? `"${addRumor()}"` : `"Did you hear? ${feedLine().replace('[Feed] ', '')}"`;
    } },
  ];
  if (!pat.known || p.opinion >= 0) choices.push({ label: `Offer ${p.first} passage`, can: () => !pat.offered && berthsFree() > 0 && p.goal !== 'fresh', run() {
    pat.offered = true;
    met(pat);
    const o = travelOffer(p);
    if (!o) return '"Nowhere you can reach from here, I\'m afraid."';
    G.offers.unshift(o);
    return `"${o.destPlanet}? That's where I need to be." ${p.first} names a fair fare. The job is on the mission board.`;
  } });
  choices.push({ label: `Play ${p.first} at cards (${CARDS} cr)`, can: () => st.credits >= CARDS && !pat.played, run() {
    pat.played = true;
    met(pat);
    if (Math.random() < 0.5) {
      st.credits += CARDS;
      like(p, p.traits.includes('greedy') || p.traits.includes('rude') ? -1 : 0, 'The captain took my money at cards.');
      return `You take ${fmt(CARDS)} cr off ${p.first}. ${p.traits.includes('rude') ? 'They accuse you of cheating, loudly.' : 'They take it well.'}`;
    }
    st.credits -= CARDS;
    like(p, 1, null);
    return `${p.first} takes ${fmt(CARDS)} cr off you and buys you a drink with it. Fair's fair.`;
  } });
  if (p.traits.includes('rude') && !pat.known) choices.push({ label: 'Tell them what you think of their manners', can: () => !pat.fought, run() {
    pat.fought = true;
    met(pat);
    like(p, -2, 'The captain started a fight with me.');
    if (roleSkill('gunner') || Math.random() < 0.4) return `It is short. ${roleSkill('gunner') ? `${roleName('gunner')} steps in, and ` : ''}${p.first} ends up on the floor, and the bar cheers. The bartender charges you for the stool anyway.`;
    st.credits = Math.max(0, st.credits - 150);
    return `It is short, and it does not go your way. You wake up in the back with a black eye and a 150 cr bill for the mirror.`;
  } });
  if (p.traits.includes('homesick')) choices.push({ label: `Ask about ${p.home}`, can: () => !pat.home, run() {
    pat.home = true; met(pat); like(p, 2, `The captain let me talk about ${p.home}.`);
    return `${p.first} lights up. You hear about the view from the ring, the smell of the market, a sister who writes every week. They buy the next round.`;
  } });
  if (p.traits.includes('pious')) choices.push({ label: 'Ask for a blessing on your ship', can: () => !pat.blessed, run() {
    pat.blessed = true; met(pat); like(p, 1, 'I blessed the captain\'s ship.');
    return `${p.first} closes their eyes and says a few words over your ship's name. It can't hurt.`;
  } });
  if (pat.known && p.opinion <= -3) choices.push({ label: 'Make peace (buy them a bottle, 300 cr)', can: () => st.credits >= 300 && !pat.peace, run() {
    pat.peace = true; st.credits -= 300; like(p, 3, 'The captain bought me a bottle and apologized.');
    return `${p.first} looks at the bottle a long time before taking it. "It's a start."`;
  } });
  choices.push({ label: 'Leave them to their drink', run: () => 'You head back to the bar.' });
  return { title: `${bar}: ${p.first} ${p.last}`, text, choices };
}

function barHtml() {
  const st = G.state, planet = currentPlanet();
  if (!G.patrons || G.barState.planet !== planet.name) fillBar(planet);
  const b = barOf(planet), round = 25 * (4 + G.patrons.length);
  const rows = G.patrons.map(({ p, known }, i) => `<div class="mission">
      <div><b>${p.first} ${p.last}</b>${known ? ` <span class="hint">(${opinionWord(p.opinion)})</span>` : ''}
        <div class="hint">${known ? `Someone you know. ${p.memories.length ? p.memories[p.memories.length - 1] : ''}` : `${TRAITS[p.traits[0]].adj[0].toUpperCase()}${TRAITS[p.traits[0]].adj.slice(1)} ${p.job} from ${p.home}.`}</div></div>
      <button data-action="barTalk" data-arg="${i}">Talk</button>
    </div>`).join('');
  const hire = G.bar.map((c, i) => `<div class="mission">
      <div><b>${fullName(c)}</b> &middot; ${ROLE_NAMES[c.role]}, skill ${c.skill}/3<div class="hint">${describe(c).replace(GOALS[c.goal], 'looking for a ship')}</div></div>
      <button data-action="hire" data-arg="bar:${i}" ${berthsFree() > 0 && st.credits >= c.fee ? '' : 'disabled'}>Hire (${fmt(c.fee)} cr)</button>
    </div>`).join('');
  return `
    <h3>${b.name}</h3>
    <p class="desc">${b.vibe}</p>
    ${(G.barState.lines = G.barState.lines || roomLines(planet)).map(l => `<div class="hint">${l}</div>`).join('')}
    ${G.barState.note ? `<p class="desc">${G.barState.note}</p>` : ''}
    <div class="row"><button data-action="barRound" ${st.credits >= round && !G.barState.round ? '' : 'disabled'}>${G.barState.round ? 'You bought a round' : `Buy a round for the house (${fmt(round)} cr)`}</button></div>
    <h3>Tonight</h3>
    ${rows || '<p class="hint">Just you and the bartender.</p>'}
    ${hire ? `<h3>Looking for a ship</h3>${hire}` : ''}`;
}

Mods.register({
  id: 'bar', name: 'Bars', builtin: true,
  init(M) {
    UI.views.bar = barHtml;
    M.on('landed', fillBar);
    M.action('barTalk', i => openEvent(talkEvent(G.patrons[Number(i)])));
    M.action('barRound', () => {
      const st = G.state, cost = 25 * (4 + G.patrons.length);
      if (G.barState.round || st.credits < cost) return;
      G.barState.round = true;
      st.credits -= cost;
      for (const pat of G.patrons) { met(pat); like(pat.p, 1, `The captain bought a round at ${G.barState.name}.`); }
      if (isFaction(localGov())) changeRep(localGov(), 1);
      G.barState.note = (`You buy a round for the house. The room raises a glass to your ship, and someone at the bar tells you: "${addRumor()}"`);
    });
  },
});
