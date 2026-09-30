'use strict';

// Procedural people: passengers, hireable crew, and ship captains. Everyone gets a
// culture-appropriate name, a home, a job, traits, a reason to travel, and sometimes
// a secret. People you deal with persist in the save, remember what you did, and can
// turn up again. Loaded before game.js; only calls into it at runtime.

const NAMES = {
  earth: {
    first: ['Amara', 'Daniel', 'Priya', 'Mateo', 'Chen', 'Fatima', 'Oliver', 'Aiko', 'Samuel', 'Leila', 'Tomas', 'Grace', 'Ravi', 'Ines', 'Kwame', 'Hana', 'Diego', 'Nadia', 'Arjun', 'Sofia'],
    last: ['Nakamura', 'Silva', 'Hassan', 'Kowalski', 'Mbeki', 'Singh', 'Ferreira', 'Lindqvist', 'Moreau', 'Castillo', 'Haddad', 'Petrov', 'Osei', 'Tanaka', 'Mendoza', 'Kaur', 'Novak', 'Achebe', 'Okonjo', 'Brennan'],
    jobs: ['accountant', 'schoolteacher', 'insurance adjuster', 'journalist', 'nurse', 'software auditor', 'lawyer', 'aid worker', 'sales rep'],
  },
  mars: {
    first: ['Marcus', 'Yelena', 'Tariq', 'Ingrid', 'Hector', 'Mei', 'Anton', 'Zara', 'Felix', 'Olga', 'Kenji', 'Dalia', 'Viktor', 'Sana', 'Ruben', 'Noor'],
    last: ['Holloway', 'Achterberg', 'Castellanos', 'Ibarra', 'Kerr', 'Laszlo', 'Quint', 'Reyes', 'Sato', 'Ueda', 'Valenti', 'Weller', 'Zamora', 'Okoye', 'Brandvold'],
    jobs: ['terraforming engineer', 'soil chemist', 'dome architect', 'navy veteran', 'hydrologist', 'teacher', 'atmospheric modeler'],
  },
  belt: {
    first: ['Tiko', 'Ama', 'Bexa', 'Dru', 'Esa', 'Fen', 'Gaz', 'Imi', 'Jo', 'Kez', 'Lolo', 'Mika', 'Nim', 'Pax', 'Ruo', 'Sabe', 'Tuk', 'Vesna', 'Wim', 'Yuri'],
    last: ['Ashford-Kamau', 'Bello', 'Chu-Okoro', 'Dagny', 'Esteban-Li', 'Faro', 'Ghosh', 'Hollis', 'Iwu', 'Jansen-Ruiz', 'Kalu', 'Lindo', 'Marsh', 'Nyambura', 'Oyelaran', 'Pike', 'Quesada', 'Rourke', 'Soto-Nakamura', 'Tembo'],
    jobs: ['ice miner', 'hydroponics tech', 'dockworker', 'refinery welder', 'water recycler tech', 'salvager', 'ore assayer', 'EVA rigger'],
  },
};

const TRAITS = {
  talkative:  { adj: 'talkative',   chatter: '{first}: "Did I ever tell you about the time on {home}..."' },
  nervous:    { adj: 'nervous',     chatter: '{first} keeps checking the hull pressure readouts.' },
  generous:   { adj: 'generous',    chatter: '{first} made coffee for everyone.' },
  greedy:     { adj: 'money-minded', chatter: '{first} is doing sums on a hand terminal and muttering.' },
  pious:      { adj: 'devout',      chatter: '{first} is praying quietly in the cargo bay.' },
  rude:       { adj: 'abrasive',    chatter: '{first}: "Who designed this galley, and were they drunk?"' },
  curious:    { adj: 'curious',     chatter: '{first} is asking the nav computer far too many questions.' },
  drunk:      { adj: 'hard-drinking', chatter: '{first} is suspiciously cheerful for this hour.' },
  secretive:  { adj: 'guarded',     chatter: '{first} closes a message window whenever you walk past.' },
  kind:       { adj: 'kind',        chatter: '{first} fixed the squeaky hatch without being asked.' },
  brave:      { adj: 'steady',      chatter: '{first} volunteered for the next EVA before anyone asked.' },
  homesick:   { adj: 'homesick',    chatter: '{first} is looking through old pictures of {home}.' },
};

const GOALS = {
  home: 'going home', family: 'visiting family', job: 'heading to a job interview', fresh: 'starting over after a bad divorce',
  research: 'taking up a research posting', pilgrim: 'on a pilgrimage', medical: 'traveling for medical treatment', vague: 'traveling for reasons they keep vague',
};
const SECRETS = ['contraband', 'wanted', 'ill', 'spy', 'debt'];
const CRIMES = ['fraud', 'smuggling', 'assaulting a dock boss', 'desertion', 'stealing a ship', 'selling forged water ration cards'];

const ROLE_NAMES = { engineer: 'Engineer', pilot: 'Pilot', gunner: 'Gunner', quartermaster: 'Quartermaster', slicer: 'Slicer', medic: 'Medic' };
const ROLE_WAGE = { engineer: 60, pilot: 70, gunner: 60, quartermaster: 45, slicer: 80, medic: 55 };
const ROLE_PERKS = {
  engineer: s => `Burns use ${s * 5}% less reaction mass.`,
  pilot: s => `Burns take ${s * 7}% fewer days.`,
  gunner: s => `One extra gun in combat, better odds in fights (skill ${s}).`,
  quartermaster: () => 'One extra market rumor on every burn.',
  slicer: s => `Can spoof transponders and manifests (${60 + s * 10}% reliable).`,
  medic: () => 'Can treat sick or injured passengers.',
};

const SHIP_WORDS = {
  a: ['Patient', 'Lucky', 'Stubborn', 'Quiet', 'Wandering', 'Iron', 'Honest', 'Restless', 'Silver', 'Distant', 'Second', 'Brave'],
  n: ['Promise', 'Horizon', 'Tortoise', 'Heron', 'Bargain', 'Anvil', 'Lantern', 'Wager', 'Pilgrim', 'Ember', 'Mule', 'Comet'],
  pa: ['Crimson', 'Hungry', 'Silent', 'Black', 'Bitter', 'Rusted'],
  pn: ['Knife', 'Grin', 'Debt', 'Tooth', 'Widow', 'Vulture', 'Hook'],
};

// ---------- generation ----------

function cultureOf(systemId) {
  return systemId === 'earth' || systemId === 'mercury' ? 'earth' : systemId === 'mars' ? 'mars' : 'belt';
}

function homeBody(culture) {
  const ids = Object.keys(SYSTEMS).filter(id => cultureOf(id) === culture);
  return pick(SYSTEMS[pick(ids)].planets).name;
}

function makePerson(culture = pick(['earth', 'earth', 'mars', 'belt', 'belt'])) {
  const pool = NAMES[culture];
  const traits = [];
  while (traits.length < 2) { const t = pick(Object.keys(TRAITS)); if (!traits.includes(t)) traits.push(t); }
  const p = {
    id: null, first: pick(pool.first), last: pick(pool.last), culture, home: homeBody(culture),
    job: pick(pool.jobs), traits, goal: pick(Object.keys(GOALS)), wealth: randInt(1, 3),
    secret: Math.random() < 0.35 ? pick(SECRETS) : null,
    opinion: 0, memories: [], location: null,
  };
  if (p.secret === 'wanted') p.crime = pick(CRIMES);
  if (p.goal === 'research') p.job = 'research scientist';
  return p;
}

function describe(p) {
  return `${p.first} ${p.last}, a ${TRAITS[p.traits[0]].adj}, ${TRAITS[p.traits[1]].adj} ${p.job} from ${p.home}, ${GOALS[p.goal]}.`;
}

function registerPerson(p) {
  const st = G.state;
  if (!p.id) p.id = `p${st.nextPid++}`;
  st.people[p.id] = p;
  // Forget strangers first once the registry grows large.
  const ids = Object.keys(st.people);
  if (ids.length > 80) {
    const busy = new Set([p.id, ...st.crew, ...st.missions.map(m => m.pid), ...(st.fleet || []).map(f => f.captain.pid)]);
    const forget = ids.filter(id => !busy.has(id)).sort((a, b) => Math.abs(st.people[a].opinion) - Math.abs(st.people[b].opinion));
    for (const id of forget.slice(0, ids.length - 80)) delete st.people[id];
  }
  return p;
}

function like(p, n, memory) {
  if (!p.memories) return;  // handcrafted crew (crew.js) have arcs instead of opinions
  p.opinion += n;
  if (memory) p.memories.push(`${dateOf()}: ${memory}`);
}

function opinionWord(n) {
  return n >= 5 ? 'devoted' : n >= 2 ? 'friendly' : n > -2 ? 'neutral' : n > -5 ? 'resentful' : 'hostile';
}

// A passenger offer: a solo traveler, a couple, a family, or a survey team.
function makePassengerOffer(here, destSystem, dest, days, deadline) {
  const p = makePerson();
  const roll = Math.random();
  let who = `${p.first} ${p.last}`, pax = 1;
  if (roll < 0.15) { who = `${p.first} ${p.last} and their partner`; pax = 2; }
  else if (roll < 0.35) { who = `the ${p.last} family`; pax = randInt(3, 4); p.goal = pick(['home', 'family', 'fresh']); }
  else if (roll < 0.45) { p.goal = 'research'; p.job = 'research scientist'; who = `Dr. ${p.last}'s survey team`; pax = randInt(2, 3); }
  return {
    type: 'passenger', person: p, who, pax, bonus: 0, destSystem, destPlanet: dest.name,
    title: `Carry ${who} (${pax}) to ${dest.name}`, blurb: describe(p),
    pay: Math.round((1500 + days * 400) * (0.8 + 0.2 * p.wealth) * (1 + 0.3 * (pax - 1))),
    deadline,
  };
}

function makeCrewCandidate(systemId) {
  const p = makePerson(Math.random() < 0.6 ? cultureOf(systemId) : undefined);
  p.role = pick(Object.keys(ROLE_NAMES));
  p.skill = Math.random() < 0.5 ? 1 : Math.random() < 0.7 ? 2 : 3;
  p.wage = Math.round(ROLE_WAGE[p.role] * (0.6 + 0.3 * p.skill));
  p.fee = p.wage * 30;
  p.job = ROLE_NAMES[p.role].toLowerCase();
  return p;
}

function shipName(pirate) {
  return pirate ? `${pick(SHIP_WORDS.pa)} ${pick(SHIP_WORDS.pn)}` : `${pick(SHIP_WORDS.a)} ${pick(SHIP_WORDS.n)}`;
}

// ---------- passengers aboard ----------

function dropPassenger(m, location) {
  G.state.missions = G.state.missions.filter(x => x !== m);
  if (m.pid) G.state.people[m.pid].location = location;
}

// Transit events built from a passenger's secret, goal, and traits.
// Each entry: when(p) says whether it fits, make(p, m) builds the event.
const PAX_EVENTS = [
  { weight: 3, when: p => p.secret === 'contraband', make: (p, m) => ({
    title: 'Customs Inspection',
    text: `A customs cutter hails for a cargo scan. ${p.first} goes very pale and asks, quietly, whether you could stall them.`,
    choices: [
      { label: 'Stall them', run() {
        if (Math.random() < 0.6) {
          m.bonus += 1500 * p.wealth;
          like(p, 3, 'You covered for me with customs.');
          return `You bury the customs officer in paperwork until their intercept window closes. Later, ${p.first} slips you a very generous tip.`;
        }
        G.state.credits = Math.max(0, G.state.credits - 2000);
        changeRep(localGov(), -5);
        like(p, 1, 'You tried to cover for me with customs.');
        return `They find ${p.first}'s stash anyway. You pay a 2,000 cr fine for "negligent inspection".`;
      } },
      { role: 'slicer', label: '[{crew}] Spoof the cargo manifest', run() {
        if (Math.random() < slicerOdds()) {
          m.bonus += 1500 * p.wealth;
          like(p, 3, 'Your slicer hid me from customs.');
          return `{crew} rewrites the manifest before the scan completes. ${p.first} looks at you with new respect.`;
        }
        G.state.credits = Math.max(0, G.state.credits - 2000);
        return '{crew}\'s spoof does not hold. You pay a 2,000 cr fine.';
      } },
      { label: `Turn ${p.first} in (+1,500 cr reward)`, run() {
        G.state.credits += 1500;
        dropPassenger(m, null);
        changeRep(localGov(), 3);
        like(p, -6, 'You turned me in to customs.');
        return `Customs takes ${p.first} away in cuffs. They do not look back at you.`;
      } },
    ] }) },
  { weight: 3, when: p => p.secret === 'wanted', make: (p, m) => ({
    title: 'Bounty Hunter',
    text: `A bounty hunter matches your burn. "You are carrying ${p.first} ${p.last}, wanted on ${p.home} for ${p.crime}. Five thousand for the handover, or I take them the hard way." ${p.first} says nothing.`,
    choices: [
      { label: 'Hand them over (+5,000 cr)', run() {
        G.state.credits += 5000;
        dropPassenger(m, null);
        like(p, -8, 'You sold me to a bounty hunter.');
        return `The hunter docks, and ${p.first} goes quietly. The credits arrive before the airlock finishes cycling.`;
      } },
      { role: 'gunner', label: '[{crew}] Make them reconsider', run() {
        m.bonus += 2000;
        like(p, 4, 'You fought off a bounty hunter for me.');
        return `{crew} puts a burst across their bow. They reconsider. You take ${hurt(0.1)} points of armor damage, and ${p.first} pays you extra when you arrive.`;
      } },
      { label: 'Refuse, and fight if you must', run() {
        if (Math.random() < fightOdds()) {
          m.bonus += 2000;
          like(p, 4, 'You fought off a bounty hunter for me.');
          return `You drive the hunter off with ${hurt(0.2)} points of armor damage. ${p.first} finally tells you their side of the story.`;
        }
        like(p, 3, 'You risked your ship for me.');
        return `The hunter pounds your hull for ${hurt(0.4)} points of armor damage, then gives up. ${p.first} will not forget this.`;
      } },
    ] }) },
  { weight: 3, when: p => p.secret === 'ill' || p.goal === 'medical', make: (p, m) => ({
    title: 'Medical Emergency',
    text: `${p.first} collapses in the galley, grey and sweating. ${p.goal === 'medical' ? 'The condition they were traveling to get treated has taken a turn.' : 'They admit they have been hiding an illness.'}`,
    choices: [
      { role: 'medic', label: '[{crew}] Treat them', run() {
        m.bonus += 1000;
        like(p, 4, 'Your medic saved my life.');
        return `{crew} works through the night. By morning ${p.first} is sitting up and asking for coffee.`;
      } },
      { label: "Use the ship's medkit (500 cr of supplies)", can: () => G.state.credits >= 500, run() {
        G.state.credits -= 500;
        like(p, 3, 'You spent your medical supplies on me.');
        if (Math.random() < 0.75) { m.bonus += 800; return 'It is enough, barely. The fever breaks overnight.'; }
        return 'The medkit keeps them stable, but they will need a real doctor.';
      } },
      { label: 'Burn harder to get them help (40 reaction mass)', can: () => G.state.fuel >= 40, run() {
        G.state.fuel -= 40;
        delay(-10);
        like(p, 2, 'You burned hard to get me to a doctor.');
        return `You push the drive. ${p.first} is miserable but stable, and grateful for every hour saved.`;
      } },
      { label: 'There is nothing you can do', run() {
        m.bonus -= 500;
        like(p, -2, 'You left me to suffer.');
        return `${p.first} recovers, slowly, and does not speak to you for the rest of the trip.`;
      } },
    ] }) },
  { weight: 3, when: p => p.secret === 'spy', make: (p, m) => ({
    title: 'Encrypted Bursts',
    text: `Your comms log shows ${p.first} sending tight-beam encrypted bursts at odd hours.`,
    choices: [
      { label: 'Confront them', run() {
        if (Math.random() < 0.5) {
          m.bonus += 2500;
          like(p, 1, 'You caught me, and took money to keep quiet.');
          return `${p.first} sighs and transfers 2,500 cr "for your discretion".`;
        }
        like(p, -3, 'You pried into my business.');
        return `${p.first} tells you it is none of your business, with an icy calm that suggests it really is not.`;
      } },
      { role: 'slicer', label: '[{crew}] Quietly decrypt the traffic', run() {
        return `{crew} cracks it: someone is paying for market intelligence. "${addRumor()}"`;
      } },
      { label: 'Not your business', run() {
        like(p, 2, 'You respected my privacy.');
        return 'You let it go. The bursts continue.';
      } },
    ] }) },
  { weight: 3, when: p => p.secret === 'debt', make: (p, m) => ({
    title: 'Collectors',
    text: `A collection agency hails: ${p.first} owes 1,500 credits and they want it now, "or we flag your ship as an accessory".`,
    choices: [
      { label: 'Pay it for them (1,500 cr)', can: () => G.state.credits >= 1500, run() {
        G.state.credits -= 1500;
        p.owes = 1500;
        like(p, 5, 'You paid off my debt. I will pay you back.');
        return `${p.first} is speechless, then swears they will pay you back with interest.`;
      } },
      { label: 'Tell the collectors to get lost', run() {
        like(p, 1, 'You stood up to my collectors.');
        return 'They threaten legal action and cut the channel. Nothing comes of it. Probably.';
      } },
    ] }) },
  { weight: 2, when: p => p.goal === 'job', make: (p, m) => ({
    title: 'Running Late',
    text: `${p.first} has a job interview on ${m.destPlanet} and the schedule is tighter than they thought. They ask whether you can go any faster.`,
    choices: [
      { role: 'pilot', label: '[{crew}] Find a faster line', run() {
        m.bonus += 800;
        like(p, 3, 'You got me to my interview on time.');
        return `{crew} finds a gravity assist nobody else would try. ${p.first} arrives with time to spare.`;
      } },
      { label: 'Hard burn (40 reaction mass)', can: () => G.state.fuel >= 40, run() {
        G.state.fuel -= 40;
        m.bonus += 800;
        like(p, 3, 'You got me to my interview on time.');
        return `${p.first} spends the burn pinned to a crash couch, rehearsing answers through gritted teeth.`;
      } },
      { label: '"Physics does not negotiate."', run() {
        like(p, -1, 'You would not hurry for my interview.');
        return 'They spend the rest of the trip rehearsing under their breath.';
      } },
    ] }) },
  { weight: 2, when: p => p.goal === 'research', make: (p, m) => ({
    title: 'Sample Opportunity',
    text: `${p.first} has spotted an interesting rock a few hours off your trajectory. "A sample from that could make my career. I will pay for the detour."`,
    choices: [
      { label: 'Match orbits and take a sample (costs time)', run() {
        delay(20);
        m.bonus += 1000 * p.wealth;
        like(p, 3, 'You made a detour for my research.');
        return `${p.first} spends six hours in a vac suit, giggling. They promise to name something after you.`;
      } },
      { label: 'Stay on course', run() {
        like(p, -1, 'You would not stop for my research.');
        return 'They watch it slide past the window without a word.';
      } },
    ] }) },
  { weight: 2, when: p => p.goal === 'pilgrim' || p.traits.includes('pious'), make: (p, m) => ({
    title: 'A Request for Stillness',
    text: `${p.first} asks you to cut the drive for a few hours for a zero-g prayer service.`,
    choices: [
      { label: 'Cut thrust for them (costs time)', run() {
        delay(12);
        m.bonus += 400 * m.pax;
        like(p, 3, 'You stilled your ship for our prayers.');
        return 'They drift through the cargo bay singing. Afterwards they press a donation on you.';
      } },
      { label: 'Decline politely', run() {
        like(p, -1, null);
        return 'They pray at one g instead, a little stiffly.';
      } },
    ] }) },
  { weight: 1, when: p => p.traits.includes('talkative') || p.traits.includes('homesick'), make: (p, m) => ({
    title: 'Long Stories',
    text: `${p.first} corners you in the galley with a bulb of coffee and a lot of stories about ${p.home}.`,
    choices: [
      { label: 'Listen', run() {
        like(p, 1, 'You listened to my stories.');
        return `Buried in the stories is something useful: "${addRumor()}"`;
      } },
      { label: 'Excuse yourself to the cockpit', run() {
        like(p, -1, null);
        return `${p.first} finds someone else to talk to. Eventually.`;
      } },
    ] }) },
  { weight: 1, when: p => p.traits.includes('nervous'), make: (p, m) => ({
    title: 'Panic at the Flip',
    text: `${p.first} panics when the drive cuts out for the flip, convinced the reactor has failed.`,
    choices: [
      { label: 'Talk them through it', run() {
        like(p, 2, 'You talked me through a panic attack.');
        return `You explain flip-and-burn three times, slowly. ${p.first} calms down and apologizes.`;
      } },
      { label: 'Give them a sedative (200 cr)', can: () => G.state.credits >= 200, run() {
        G.state.credits -= 200;
        like(p, 1, null);
        return `${p.first} sleeps through the rest of the burn.`;
      } },
      { label: 'Tell them to pull themselves together', run() {
        m.bonus -= 300;
        like(p, -2, 'You mocked me when I was scared.');
        return `${p.first} spends the rest of the trip in their bunk.`;
      } },
    ] }) },
  { weight: 1, when: p => p.traits.includes('curious'), make: (p, m) => ({
    title: 'Engine Room Tour',
    text: `${p.first} would love to see the drive room. "Just a quick look. I will not touch anything."`,
    choices: [
      { label: 'Show them around', run() {
        like(p, 2, 'You showed me the drive room.');
        if (Math.random() < 0.25) {
          G.state.fuel = Math.max(0, G.state.fuel - 20);
          return `${p.first} touches something. You vent 20 units of reaction mass and they apologize profusely.`;
        }
        return `${p.first} asks smart questions for an hour. You enjoy it more than you expected.`;
      } },
      { label: 'Crew only, sorry', run() {
        like(p, -1, null);
        return 'They look disappointed but understand.';
      } },
    ] }) },
  { weight: 1, when: p => p.traits.includes('drunk'), make: (p, m) => ({
    title: 'Galley Incident',
    text: `${p.first} got into the good whiskey and broke the galley water recycler. Repairs will run about 400 credits.`,
    choices: [
      { label: 'Add it to their fare', run() {
        m.bonus += 400;
        like(p, -2, 'You charged me for the recycler.');
        return `${p.first} grumbles but pays when you arrive.`;
      } },
      { label: 'Let it slide (400 cr)', run() {
        G.state.credits = Math.max(0, G.state.credits - 400);
        like(p, 2, 'You let the recycler thing slide.');
        return `${p.first} is mortified, and very grateful.`;
      } },
    ] }) },
  { weight: 1, when: p => p.traits.includes('greedy'), make: (p, m) => ({
    title: 'Card Game',
    text: `${p.first} produces a deck of cards and suggests a friendly game with a little money on it.`,
    choices: [
      { label: `Play (500 cr stake)`, can: () => G.state.credits >= 500, run() {
        if (Math.random() < 0.5) { G.state.credits += 500; like(p, -1, 'You beat me at cards.'); return `You clean ${p.first} out. They are a poor loser.`; }
        G.state.credits -= 500;
        like(p, 1, null);
        return `${p.first} wins, and is insufferable about it.`;
      } },
      { label: 'Decline', run: () => 'They shuffle and deal a hand of solitaire instead.' },
    ] }) },
  { weight: 1, when: p => p.traits.includes('generous') || p.traits.includes('kind'), make: (p, m) => ({
    title: 'Gratitude',
    text: `${p.first} cooks a proper dinner for everyone aboard, using spices they brought from ${p.home}, and then insists on tipping you for a smooth trip.`,
    choices: [
      { label: 'Accept graciously', run() {
        m.bonus += 300 * p.wealth;
        like(p, 1, null);
        return 'It is the best meal this ship has seen in months.';
      } },
      { label: 'Refuse the money, keep the dinner', run() {
        like(p, 3, 'You would not take my money.');
        return `${p.first} is touched. You get the recipe.`;
      } },
    ] }) },
  { weight: 1, when: p => p.traits.includes('rude'), make: (p, m) => ({
    title: 'Complaints',
    text: `${p.first} has complaints: about the bunk, the food, the gravity, and your face.`,
    choices: [
      { label: 'Humor them', run() { like(p, 1, null); return 'You nod a lot. It helps, somewhat.'; } },
      { label: 'Put them in their place', run() {
        m.bonus -= 300;
        like(p, -2, 'You put me in my place.');
        return `${p.first} files a complaint. It comes out of your fare, but the rest of the trip is blissfully quiet.`;
      } },
    ] }) },
];

function passengerEvent(m) {
  const p = G.state.people[m.pid];
  const fits = PAX_EVENTS.filter(e => e.when(p));
  const total = fits.reduce((t, e) => t + e.weight, 0);
  let r = Math.random() * total;
  const e = fits.find(f => (r -= f.weight) < 0) || PAX_EVENTS.find(f => f.make && f.weight === 1);
  return e.make(p, m);
}

// ---------- procedural crew ----------

// Small trait-driven events for procedural crew members.
const CREW_EVENTS = {
  greedy: c => ({ title: `${c.first} Wants a Raise`, text: `${c.first} points out, at length, what crew with their skills earn on other ships.`,
    choices: [
      { label: `Give them 25% more (${fmt(c.wage * 1.25)} cr/day)`, run() { c.wage = Math.round(c.wage * 1.25); like(c, 3, 'You gave me a raise.'); return `${c.first} is all smiles.`; } },
      { label: 'No', run() { like(c, -2, 'You refused me a raise.'); return `${c.first} goes back to work, sullenly.`; } },
    ] }),
  drunk: c => ({ title: 'Galley Brawl', text: `${c.first} got drunk and put a dent in the galley bulkhead with their head. The medical supplies cost 300 cr.`,
    choices: [
      { label: 'Dock their pay', run() { like(c, -2, 'You docked my pay.'); return `${c.first} nurses a headache and a grudge.`; } },
      { label: 'Pay for it and let it go (300 cr)', run() { G.state.credits = Math.max(0, G.state.credits - 300); like(c, 2, 'You let the brawl go.'); return `${c.first} swears off drink. For now.`; } },
    ] }),
  homesick: c => ({ title: 'Homesick', text: `${c.first} has been quiet. They miss ${c.home}.`,
    choices: [
      { label: 'Give them a 500 cr bonus to call home', can: () => G.state.credits >= 500, run() { G.state.credits -= 500; like(c, 3, 'You paid for my call home.'); return `${c.first} spends an hour on a lagged call home and comes back beaming.`; } },
      { label: 'Share a drink and listen', run() { like(c, 1, null); return 'It helps, a little.'; } },
      { label: '"We all miss somewhere."', run() { like(c, -1, null); return `${c.first} nods and goes back to work.`; } },
    ] }),
  nervous: c => ({ title: 'Bad Dreams', text: `${c.first} has not been sleeping. Nightmares about hull breaches.`,
    choices: [
      { label: 'Talk them through it', run() { like(c, 2, 'You helped me through the nightmares.'); return `${c.first} sleeps through the night for the first time in a week.`; } },
      { label: 'Tell them to toughen up', run() { like(c, -2, 'You told me to toughen up.'); return `${c.first} stops mentioning it. That is not the same as better.`; } },
    ] }),
  talkative: c => ({ title: 'Gossip', text: `${c.first} has been chatting with half the ships in comm range.`,
    choices: [{ label: 'What have you heard?', run() { like(c, 1, null); return `"${addRumor()}"`; } }] }),
  secretive: c => ({ title: 'Locked Locker', text: `${c.first}'s locker is double-locked, and they have been receiving messages with no sender ID.`,
    choices: [
      { label: 'Ask about it', run() { like(c, -2, 'You pried into my locker.'); return `${c.first}: "Family business." That is all you get.`; } },
      { label: 'Respect their privacy', run() { like(c, 2, 'You respected my privacy.'); return 'Everyone out here has something.'; } },
    ] }),
  curious: c => ({ title: 'Tinkering', text: `${c.first} has been taking apart the reaction mass pumps "to see how they work".`,
    choices: [
      { label: 'Let them experiment', run() {
        like(c, 2, 'You let me tinker.');
        if (Math.random() < 0.6) { G.state.fuel = Math.min(ship().fuel, G.state.fuel + 25); return 'They find a leak nobody knew about. You recover 25 units of reaction mass.'; }
        G.state.fuel = Math.max(0, G.state.fuel - 20);
        return 'Something goes pop. You lose 20 units of reaction mass.';
      } },
      { label: 'Put it back together. Now.', run() { like(c, -1, null); return 'They do, grumbling.'; } },
    ] }),
  pious: c => ({ title: 'Quiet Prayer', text: `${c.first} invites you to join a short prayer for safe passage.`,
    choices: [
      { label: 'Join them', run() { like(c, 2, 'You prayed with me.'); return 'It is quiet, and oddly calming.'; } },
      { label: 'Politely decline', run() { like(c, 0, null); return `${c.first} prays for you anyway.`; } },
    ] }),
  rude: c => ({ title: 'Friction', text: `${c.first} has been needling the rest of the crew. There is going to be a fight.`,
    choices: [
      { label: 'Reprimand them', run() { like(c, -2, 'You reprimanded me in front of everyone.'); return 'It clears the air, mostly.'; } },
      { label: 'Let them sort it out', run() { like(c, 1, null); return `${hurt(0.03)} points of hull damage later, they have sorted it out.`; } },
    ] }),
  kind: c => ({ title: 'Small Kindnesses', text: `${c.first} spent the night fixing everyone's bunk lights and cooking a real meal.`,
    choices: [{ label: 'Thank them', run() { like(c, 1, null); return 'Morale aboard is noticeably better.'; } }] }),
  generous: c => ({ title: 'Shared Bottle', text: `${c.first} opens a bottle they have been saving from ${c.home} and shares it around.`,
    choices: [{ label: 'Raise a glass', run() { like(c, 1, 'We shared a bottle.'); return 'To the ship. To the crew. To not dying.'; } }] }),
  brave: c => ({ title: 'Volunteer', text: `A sensor mast came loose during the burn. ${c.first} volunteers for the EVA to fix it.`,
    choices: [
      { label: 'Let them go', run() { like(c, 1, null); return Math.random() < 0.85 ? `${c.first} is back inside in twenty minutes, grinning.` : `A tether snaps. ${c.first} makes it back, shaken. The ship takes ${hurt(0.05)} points of damage from the loose mast.`; } },
      { label: 'Go yourself', run() { like(c, 2, 'You took the risky EVA yourself.'); return `You fix it yourself. ${c.first} was watching, and looks at you differently now.`; } },
    ] }),
};

function crewTraitEvent() {
  const mine = G.state.crew.map(id => G.state.people[id]).filter(Boolean);
  if (!mine.length) return null;
  const c = pick(mine);
  return CREW_EVENTS[pick(c.traits)](c);
}

// ---------- reunions ----------

// People who like you (or hate you) and are at this port. Each reunion happens once.
function meetContacts(planet) {
  const st = G.state, notes = [];
  for (const p of Object.values(st.people)) {
    if (p.location !== planet.name || st.crew.includes(p.id)) continue;
    if (p.owes && !p.repaid) {
      p.repaid = p.thanked = true;
      st.credits += p.owes * 2;
      notes.push(`${p.first} ${p.last} finds you at the dock and repays the ${fmt(p.owes)} cr you covered, with interest: ${fmt(p.owes * 2)} cr.`);
    } else if (p.opinion >= 3 && !p.thanked) {
      p.thanked = true;
      const roll = Math.random();
      if (roll < 0.4) {
        const c = p.wealth * randInt(5, 12) * 100;
        st.credits += c;
        notes.push(`${p.first} ${p.last} spots you at the bar and insists on buying you dinner, and slips you ${fmt(c)} cr "for last time".`);
      } else if (roll < 0.7) {
        notes.push(`${p.first} ${p.last} buys you a drink and passes on a tip: "${addRumor()}"`);
      } else {
        const reachable = Object.keys(SYSTEMS).filter(id => id !== st.systemId && inRange(st.systemId, id));
        const sid = pick(reachable), dest = pick(SYSTEMS[sid].planets), days = baseDays(st.systemId, sid);
        G.offers.unshift({
          type: 'delivery', good: `a sealed case for ${p.first}`, tons: 1, destSystem: sid, destPlanet: dest.name,
          title: `Favor for ${p.first} ${p.last}: deliver a sealed case to ${dest.name}`,
          pay: 3000 + days * 700, deadline: st.day + days * 2 + 5,
        });
        notes.push(`${p.first} ${p.last} has a job for someone they trust. It is on the mission board.`);
      }
    } else if (p.opinion <= -4 && !p.avenged) {
      p.avenged = true;
      G.revenge = p;
      notes.push(`Word on the docks: ${p.first} ${p.last} has been asking around about your ship, and paying people to listen. Watch yourself out there.`);
    }
  }
  return notes;
}
