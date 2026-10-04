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
  talkative:  { adj: 'talkative',   chatter: ['{first}: "Did I ever tell you about the time on {home}..."', '{first} is telling a long story in the galley, and, from the sound of it, has reached the good part for the third time.', '{first}: "And that, I always say, is the whole trouble with {home}. Oh, but that reminds me..."', '{first} has been talking for an hour, and the coffee maker, in a corner, has given up in sympathy.', '{first} is explaining, to nobody in particular, what they would do with a ship of their own.'] },
  nervous:    { adj: 'nervous',     chatter: ['{first} keeps checking the hull pressure readouts.', '{first} jumps at a small clank from the engine room, and pretends they did not.', '{first} has, for the fifth time this watch, tested the seal on the nearest hatch.', '{first} is counting the emergency suits, quietly, under their breath, in a low, steady mutter.', '{first} sleeps with a hand on the bulkhead.'] },
  generous:   { adj: 'generous',    chatter: ['{first} made coffee for everyone.', '{first} has left a small plate of something sweet outside the engine room, without a note.', '{first} is giving away, one piece at a time, the contents of their sock drawer.', '{first} covered someone\'s shift, and will not hear a word about it.', '{first} has a knack for turning up, unasked, with exactly what you need.'] },
  greedy:     { adj: 'money-minded', chatter: ['{first} is doing sums on a hand terminal and muttering.', '{first} has worked out what every ton of cargo on the ship is worth, and tells you, twice.', '{first} is running the numbers on a trade route, and, from the muttering, it is not going to be enough.', '{first} watches the fuel gauge, and does not blink.', '{first} has started a small betting pool on the arrival date, and holds all the odds.'] },
  pious:      { adj: 'devout',      chatter: ['{first} is praying quietly in the cargo bay.', '{first} has tied a small ribbon to a bulkhead, for luck, and blessed it.', '{first} murmurs a short blessing over the drive before each flip.', '{first} is reading, aloud and very softly, from a small worn book.', '{first} is lighting a very small, very safe candle in a jar, and shielding it from the draught with a hand.'] },
  rude:       { adj: 'abrasive',    chatter: ['{first}: "Who designed this galley, and were they drunk?"', '{first} is complaining about the coffee. The coffee, to be fair, deserves it.', '{first}: "In my last ship, we had a proper bunk. With a door."', '{first} has an opinion about the way you are flying, and shares it, generously, at every turn.', '{first} is glaring at the thermostat.'] },
  curious:    { adj: 'curious',     chatter: ['{first} is asking the nav computer far too many questions.', '{first} has taken the panel off the galley clock to see what makes it tick.', '{first} is following the plume readout with a small notebook, and a look of pure joy.', '{first}: "But why does it hum at that particular note? Has anybody ever asked?"', '{first} is pressing an ear to the bulkhead, listening to something nobody else can hear.'] },
  drunk:      { adj: 'hard-drinking', chatter: ['{first} is suspiciously cheerful for this hour.', '{first} is humming, loudly, an old song from {home}, and has forgotten the second verse.', '{first} is sitting very carefully upright, with a mug that smells like anything but coffee.', '{first} has made a small toast to the ship, and is now, tenderly, toasting the coffee maker.', '{first} is cheerfully explaining something to a coaster.'] },
  secretive:  { adj: 'guarded',     chatter: ['{first} closes a message window whenever you walk past.', '{first} answers every question with a question, and does it very gracefully.', '{first} has a small locked case, and a way of standing between it and everyone else.', '{first} is very quiet, and very watchful, and always knows where everyone is.', '{first} deletes a message, and looks up, and smiles at you.'] },
  kind:       { adj: 'kind',        chatter: ['{first} fixed the squeaky hatch without being asked.', '{first} noticed someone was tired, and quietly took the rest of their watch.', '{first} is sewing a torn sleeve, by a lamp, for someone who is not going to ask.', '{first} has left a note on the galley wall: "Ask me if you need anything. Anything at all."', '{first} is humming, softly, at the sink, while washing everyone else\'s cups.'] },
  brave:      { adj: 'steady',      chatter: ['{first} volunteered for the next EVA before anyone asked.', '{first} is calmly checking the emergency hatches, one by one, whistling.', '{first} has a small, plain scar, and a small, plain refusal to talk about it.', '{first}: "If anything goes wrong, I will be the one to go and look. That is what I am for."', '{first} is smiling, in the face of a very small, very real problem with the coolant.'] },
  homesick:   { adj: 'homesick',    chatter: ['{first} is looking through old pictures of {home}.', '{first} has gone very quiet, and is watching the viewport.', '{first} is making a dish from {home}, out of not-quite-right ingredients, and eating it with great seriousness.', '{first} is humming something from {home}, low and soft, and does not seem to know.', '{first} keeps a small stone from {home}, worn smooth, and turns it over, and over, and over.'] },
};

const GOALS = {
  home: 'going home', family: 'visiting family', job: 'heading to a job interview', fresh: 'starting over after a bad divorce',
  research: 'taking up a research posting', pilgrim: 'on a pilgrimage', medical: 'traveling for medical treatment', vague: 'traveling for reasons they keep vague',
};
const SECRETS = ['contraband', 'wanted', 'ill', 'spy', 'debt'];
const CRIMES = ['fraud', 'smuggling', 'assaulting a dock boss', 'desertion', 'stealing a ship', 'selling forged water ration cards'];

const ROLE_NAMES = { engineer: 'Engineer', pilot: 'Pilot', gunner: 'Gunner', quartermaster: 'Quartermaster', slicer: 'Slicer', medic: 'Medic', xo: 'First officer', cook: 'Cook', icehand: 'Ice hand' };
// The hired chapter's crew only: nobody offers to hire these, and a passenger never asks to join as one.
const HIREABLE_ROLES = ['engineer', 'pilot', 'gunner', 'quartermaster', 'slicer', 'medic'];
const ROLE_WAGE = { engineer: 60, pilot: 70, gunner: 60, quartermaster: 45, slicer: 80, medic: 55, xo: 65, cook: 40, icehand: 35 };
const ROLE_PERKS = {
  engineer: s => `Burns use ${s * 5}% less reaction mass.`,
  pilot: s => `Burns take ${s * 7}% fewer days.`,
  gunner: s => `One extra gun in combat, better odds in fights (skill ${s}).`,
  quartermaster: () => 'One extra market rumor on every burn.',
  slicer: s => `Can spoof transponders and manifests (${60 + s * 10}% reliable).`,
  medic: () => 'Can treat sick or injured passengers.',
  xo: () => 'Runs the watch bill and speaks for the captain.',
  cook: () => 'Keeps the galley and knows everyone\'s business.',
  icehand: () => 'Handles the ice and the cargo.',
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

// A first name not already worn by anyone on the register or in the authored cast, so two shipmates are never both "Tomas".
// The draw is the one random pick it always was; a taken name steps to the next free one in the pool, so the random stream is unchanged.
function freshFirst(pool) {
  const taken = new Set([...Object.values((G.state && G.state.people) || {}).map(x => x.first), ...Object.values(CAST).map(c => c.first)]);
  const i = Math.floor(Math.random() * pool.first.length);
  for (let k = 0; k < pool.first.length; k++) { const first = pool.first[(i + k) % pool.first.length]; if (!taken.has(first)) return first; }
  return pool.first[i];
}

function makePerson(culture = pick(['earth', 'earth', 'mars', 'belt', 'belt'])) {
  const pool = NAMES[culture];
  const traits = [];
  while (traits.length < 2) { const t = pick(Object.keys(TRAITS)); if (!traits.includes(t)) traits.push(t); }
  const p = {
    id: null, first: freshFirst(pool), last: pick(pool.last), culture, home: homeBody(culture),
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

// The main characters who have died keep their records: castPerson would otherwise build a fresh, unmarked one (fate.js).
const deadCastIds = () => Object.values(G.state.cast || {}).filter(r => r.status === 'dead' && r.pid).map(r => r.pid);

function registerPerson(p) {
  const st = G.state;
  if (!p.id) p.id = `p${st.nextPid++}`;
  st.people[p.id] = p;
  // Forget strangers first once the registry grows large.
  const ids = Object.keys(st.people);
  if (ids.length > 80) {
    const busy = new Set([p.id, ...(st.hired ? [st.hired.captain] : []), ...st.crew, ...st.missions.map(m => m.pid), ...(st.fleet || []).map(f => f.captain.pid), ...deadCastIds()]);
    const forget = ids.filter(id => !busy.has(id) && !st.people[id].regular && !(st.leads || []).some(l => l.pid === id)).sort((a, b) => Math.abs(st.people[a].opinion) - Math.abs(st.people[b].opinion));
    for (const id of forget.slice(0, ids.length - 80)) delete st.people[id];
  }
  return p;
}

// Liking someone gets harder the more they already like you: each OPINION_EASE points of opinion take one off every gain (so a
// small kindness stops at 'trusted', and only a large one gets to 'devoted'), and a high opinion fades by one every
// OPINION_FADE days that you do not do anything for them. Both are about keeping a whole crew from being friends by the end of a chapter.
const OPINION_EASE = 3, OPINION_FADE = 14;
// A thing that happens to everyone aboard (a shared meal, a tradition) only gets someone as far as 'welcome': it makes a stranger
// easy with you, and does nothing to make a friend. Friends are made one at a time, on purpose.
const likeAmbient = (p, n, memory) => { if (p && p.opinion < OPINION.CLOSE) like(p, n, memory); };
function like(p, n, memory) {
  if (!p.memories) return;  // handcrafted crew (crew.js) have arcs instead of opinions
  if (n > 0) n = Math.max(0, n - Math.floor(Math.max(0, p.opinion) / OPINION_EASE));
  if (n) p.touched = G.state.day;
  p.opinion += n;
  if (G.shifts && n) G.shifts.push({ p, n });  // what a choice did, for its result screen (shiftLines, character.js)
  if (memory) p.memories.push(`${dateOf()}: ${memory}`);
}

// How much someone thinks of you (p.opinion, an integer that starts at 0), and the cutoffs where the game starts to treat them
// differently. Every comparison uses this table. Two entries are the captain's, and become per captain (the hired-hand chapter).
const OPINION = {
  CLOSE: 1,       // close enough to leave the ship with you at a buy-in (hired.js)
  HEARD: 1,       // the captain listens when you disagree with an order (hiredevents.js)
  FRIEND: 2,      // a friend: stays aboard and counts at the epilogue (story.js), waves you over (bar.js), asks for your ship again (social.js)
  NOTABLE: 2,     // worth a mention either way: a known captain in local space (game.js), someone you remember (social.js)
  BONUS: 2,       // the captain gives a bonus when you ask (hiredevents.js)
  TRUSTED: 3,     // friendly terms from a trader (hail.js), a pirate who knows you is not hostile (game.js), someone who thanks you (people.js)
  STRONG: 3,      // strong feelings either way: a known captain is likelier to turn up on the lanes (hail.js)
  WELCOME: 4,     // a passenger may ask to join the crew (family.js)
  ALLY: 5,        // answers the blockade call (story.js)
  ENEMY: -2,      // an enemy at the epilogue (story.js), a patron who scowls (bar.js)
  GRUDGE: -3,     // no deals, a higher price to pay them off (hail.js), a patron you can make peace with (bar.js)
  BITTER: -4,     // crew who are not loyal walk off, a known captain is hostile (game.js), someone who comes looking for revenge (people.js)
  HIRED_GUN: -5,  // pays a hired gun to join the blockade (story.js)
};

function opinionWord(n) {
  return n >= OPINION.ALLY ? 'devoted' : n >= OPINION.FRIEND ? 'friendly' : n > OPINION.ENEMY ? 'neutral' : n > OPINION.HIRED_GUN ? 'resentful' : 'hostile';
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
  p.role = pick(HIREABLE_ROLES);
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
    text: `A customs cutter hails for a cargo scan. Its searchlight sweeps your hull, and the voice on the open band is calm and businesslike. ${p.first} has gone pale. Their hands are shaking, and they keep glancing toward the hold. "Captain," they whisper. "Please. Whatever you can do. Stall them, delay them, anything. I will explain later. I promise."`,
    choices: [
      { label: 'Stall them', run() {
        if (Math.random() < 0.6) {
          m.bonus += 1500 * p.wealth;
          like(p, 3, 'You covered for me with customs.');
          return `You bury the customs officer in paperwork, forms and queries and a long story about a sensor fault, for forty-one minutes, until their intercept window closes and the cutter peels away with a burst of static. ${p.first} sits down on a crate and lets out a breath. Later they slip you a tip, folded small, and do not say what it is for.`;
        }
        G.state.credits = Math.max(0, G.state.credits - 2000);
        changeRep(localGov(), -5);
        like(p, 1, 'You tried to cover for me with customs.');
        return `It does not work. The inspectors board within the hour. They find ${p.first}'s stash in the second bay, behind a false panel, in under ten minutes. ${p.first} does not say a word. You pay a 2,000 cr fine for "negligent inspection", and for the rest of the trip nobody on the ship meets anyone else's eye.`;
      } },
      { role: 'slicer', label: '[{crew}] Spoof the cargo manifest', run() {
        if (Math.random() < slicerOdds()) {
          m.bonus += 1500 * p.wealth;
          like(p, 3, 'Your slicer hid me from customs.');
          return `{crew} bends over the console and in about ninety seconds rewrites the manifest, the cargo record and the ship's recent history. When the scan sweeps the hold, it finds tidy crates and honest paperwork. ${p.first} watches from the hatch, and looks at you, and then at {crew}.`;
        }
        G.state.credits = Math.max(0, G.state.credits - 2000);
        return '{crew}\'s spoof does not hold. One line of the manifest fails a checksum, and the scanner lights up. You pay a 2,000 cr fine. {crew} spends the next hour saying that the mistake was one misplaced digit.';
      } },
      { label: `Turn ${p.first} in (+1,500 cr reward)`, run() {
        G.state.credits += 1500;
        dropPassenger(m, null);
        changeRep(localGov(), 3);
        like(p, -6, 'You turned me in to customs.');
        return `Customs takes ${p.first} away in cuffs, quietly, with a hand on their shoulder. ${p.first} does not look back and does not speak. The airlock clicks shut. The galley is silent.`;
      } },
    ] }) },
  { weight: 3, when: p => p.secret === 'wanted', make: (p, m) => ({
    title: 'Bounty Hunter',
    text: `A bounty hunter matches your burn, dark and silent, with one running light that winks on and off. The voice on the channel is low and bored. "You are carrying ${p.first} ${p.last}, wanted on ${p.home} for ${p.crime}. Five thousand for the handover, or I take them the hard way." In the galley, ${p.first} sets down a cup, carefully, and says nothing. Their hands are steady.`,
    choices: [
      { label: 'Hand them over (+5,000 cr)', run() {
        G.state.credits += 5000;
        dropPassenger(m, null);
        like(p, -8, 'You sold me to a bounty hunter.');
        return `The hunter docks, and ${p.first} goes quietly with one small bag. At the airlock ${p.first} looks back at you once. The credits arrive before the lock finishes cycling.`;
      } },
      { role: 'gunner', label: '[{crew}] Make them reconsider', run() {
        m.bonus += 2000;
        like(p, 4, 'You fought off a bounty hunter for me.');
        return `{crew} puts a burst across their bow, a line of tracer that lights the hunter's hull. They reconsider. You take ${hurt(0.1)} points of armor damage from one wild shot in return. When you arrive ${p.first} pays you extra, and at the airlock squeezes your hand hard enough to hurt.`;
      } },
      { label: 'Refuse, and fight if you must', run() {
        if (Math.random() < fightOdds()) {
          m.bonus += 2000;
          like(p, 4, 'You fought off a bounty hunter for me.');
          return `You drive the hunter off in a long, ugly exchange, with ${hurt(0.2)} points of armor damage and a singed antenna. That night in the galley, over a bulb of something strong, ${p.first} tells you their side of it. It is more complicated than the bounty made it sound.`;
        }
        like(p, 3, 'You risked your ship for me.');
        return `The hunter pounds your hull for ${hurt(0.4)} points of armor damage, three minutes of it, then gives up with a curse on the channel. ${p.first}, gray in the face, helps you patch the worst of the breaches without a word.`;
      } },
    ] }) },
  { weight: 3, when: p => p.secret === 'ill' || p.goal === 'medical', make: (p, m) => ({
    title: 'Medical Emergency',
    text: `${p.first} collapses in the galley, dropping a cup, gray and sweating, and slides to the deck with their back against a cabinet. Their breath is shallow. ${p.goal === 'medical' ? 'The condition they were traveling to get treated has taken a turn.' : 'They say, between breaths, that they have been hiding an illness for weeks and did not want to be a burden.'} Everyone in the room has stopped moving. They look at you.`,
    choices: [
      { role: 'medic', label: '[{crew}] Treat them', run() {
        m.bonus += 1000;
        like(p, 4, 'Your medic saved my life.');
        return `{crew} works through the night with a lamp and a case of instruments and does not leave the bunk once. By morning ${p.first} is sitting up, pale, and asking for coffee in a cracked voice. {crew} is asleep in the corridor with a blanket over their shoulders, and nobody wakes them.`;
      } },
      { label: "Use the ship's medkit (500 cr of supplies)", can: () => G.state.credits >= 500, run() {
        G.state.credits -= 500;
        like(p, 3, 'You spent your medical supplies on me.');
        if (Math.random() < 0.75) { m.bonus += 800; return 'You sit up with them through the night, working from the manual, with a bulb of water and a flashlight in your teeth. It is enough, barely. The fever breaks in the small hours, and they sleep for the first time in days.'; }
        return 'You do everything the medkit and the manual allow, and it keeps them stable, only just. They will need a real doctor, soon. For the rest of the burn you check their pulse every twenty minutes, in the dark.';
      } },
      { label: 'Burn harder to get them help (40 reaction mass)', can: () => G.state.fuel >= 40, run() {
        G.state.fuel -= 40;
        delay(-10);
        like(p, 2, 'You burned hard to get me to a doctor.');
        return `You push the drive until the frame groans. ${p.first} is stable, pinned to a bunk with a wet cloth on their forehead, and counts every hour you save. When the doctors take them at the dock, they whisper something to you. It sounds like thanks.`;
      } },
      { label: 'There is nothing you can do', run() {
        m.bonus -= 500;
        like(p, -2, 'You left me to suffer.');
        return `${p.first} recovers, over three days, on their own, in a cold bunk. They ask you for nothing and do not speak to you for the rest of the trip. When they leave, they do not say goodbye.`;
      } },
    ] }) },
  { weight: 3, when: p => p.secret === 'spy', make: (p, m) => ({
    title: 'Encrypted Bursts',
    text: `Your comms log shows ${p.first} sending tight-beam encrypted bursts at odd hours, always between the second and third watch, short pulses aimed at no port you know. They send them from the observation blister, alone, with the lights off. It may be nothing. You have started to count how often ${p.first} looks at the door.`,
    choices: [
      { label: 'Confront them', run() {
        if (Math.random() < 0.5) {
          m.bonus += 2500;
          like(p, 1, 'You caught me, and took money to keep quiet.');
          return `${p.first} sighs, looks at you, and transfers 2,500 cr "for your discretion". "I like you, captain," they say. "I would rather not have to like you less."`;
        }
        like(p, -3, 'You pried into my business.');
        return `${p.first} tells you it is none of your business, evenly, without raising their voice. They do not threaten you. They look at you steadily until you leave.`;
      } },
      { role: 'slicer', label: '[{crew}] Quietly decrypt the traffic', run() {
        return `{crew} cracks it over a long evening: someone is paying for market intelligence, hard numbers, from every port you touch, in tidy reports. Nothing dangerous. A patient stranger who wants to know what everything costs. Among the bursts is a line that might be useful: "${addRumor()}"`;
      } },
      { label: 'Not your business', run() {
        like(p, 2, 'You respected my privacy.');
        return `You let it go. The bursts continue every night at the same hour, faint and regular. Once, in the corridor, ${p.first} meets your eye and nods.`;
      } },
    ] }) },
  { weight: 3, when: p => p.secret === 'debt', make: (p, m) => ({
    title: 'Collectors',
    text: `A collection agency hails, in a crisp voice, reading from a script: ${p.first} owes 1,500 credits and they want it now, "or we flag your ship as an accessory". In the corner of the galley ${p.first} has gone the color of old paper and is not looking at anyone. The agent adds, pleasantly, that they have "a great deal of patience, and a great many lawyers."`,
    choices: [
      { label: 'Pay it for them (1,500 cr)', can: () => G.state.credits >= 1500, run() {
        G.state.credits -= 1500;
        p.owes = 1500;
        like(p, 5, 'You paid off my debt. I will pay you back.');
        return `${p.first} opens their mouth and nothing comes out. Then they swear, low, that they will pay you back with interest, every credit, if it takes the rest of their life. They do not sit down until you have.`;
      } },
      { label: 'Tell the collectors to get lost', run() {
        like(p, 1, 'You stood up to my collectors.');
        return `They threaten legal action, at length, and cut the channel. Nothing comes of it. ${p.first} looks at you across the galley. A little later they bring you a cup of tea without being asked.`;
      } },
    ] }) },
  { weight: 2, when: p => p.goal === 'job', make: (p, m) => ({
    title: 'Running Late',
    text: `${p.first} has a job interview on ${m.destPlanet}, and the schedule is tighter than they thought. They have ironed their good shirt three times in the galley and rehearsed their answers to the mirror. Now they stand at the cockpit hatch, twisting their hands. "Captain, I hate to ask. Is there any way at all to go any faster?"`,
    choices: [
      { role: 'pilot', label: '[{crew}] Find a faster line', run() {
        m.bonus += 800;
        like(p, 3, 'You got me to my interview on time.');
        return `{crew} bends over the nav display, muttering, and finds a gravity assist nobody else would try, a long swoop around a moon barely on the charts. It works. ${p.first} arrives with an hour to spare, freshly ironed, and at the dock hugs {crew} before they can dodge.`;
      } },
      { label: 'Hard burn (40 reaction mass)', can: () => G.state.fuel >= 40, run() {
        G.state.fuel -= 40;
        m.bonus += 800;
        like(p, 3, 'You got me to my interview on time.');
        return `You push the drive, and ${p.first} spends the burn on a crash couch, rehearsing answers through their teeth. They arrive on time, rumpled and out of breath, with no time to thank you. You watch them run for the concourse, straightening their collar.`;
      } },
      { label: '"Physics does not negotiate."', run() {
        like(p, -1, 'You would not hurry for my interview.');
        return `They nod and go back to their bunk. For the rest of the trip you can hear them through the thin wall, rehearsing under their breath, again and again. You never learn whether they made the interview.`;
      } },
    ] }) },
  { weight: 2, when: p => p.goal === 'research', make: (p, m) => ({
    title: 'Sample Opportunity',
    text: `${p.first} has been at the observation blister for hours with a battered notebook and a pair of binoculars. Now they appear at the cockpit hatch, out of breath, hair on end. They have spotted a rock a few hours off your trajectory, pale, with a bright glint in the sun. "A sample from that could make my career," they say. "I will pay for the detour. Please. I have waited my whole life for something like this."`,
    choices: [
      { label: 'Match orbits and take a sample (costs time)', run() {
        delay(20);
        m.bonus += 1000 * p.wealth;
        like(p, 3, 'You made a detour for my research.');
        return `${p.first} spends six hours in a vac suit on the rock's pale surface, tethered to your hull, giggling into the radio, chipping at the crust with a tiny hammer. When they come back in, frosted and shaking, they hold a small vial to the light. They promise to name something after you.`;
      } },
      { label: 'Stay on course', run() {
        like(p, -1, 'You would not stop for my research.');
        return `They watch it slide past the window, a pale point in the dark, and stay at the glass until it is gone. Later you see them write something in the notebook: the date, and a line you cannot read. They are polite for the rest of the trip. When they disembark they leave a folded drawing on the galley table, of a rock, and a ship, and a long distance.`;
      } },
    ] }) },
  { weight: 2, when: p => p.goal === 'pilgrim' || p.traits.includes('pious'), make: (p, m) => ({
    title: 'A Request for Stillness',
    text: `${p.first} comes to the cockpit hatch holding a worn book. They ask whether you might cut the drive for a few hours, so that they can hold a prayer service in zero g. It is a holy day for them, and the old prayers say that in weightlessness a person is closest to whatever is out there. They do not press. They wait with their hands folded, and the book shakes a little in their grip.`,
    choices: [
      { label: 'Cut thrust for them (costs time)', run() {
        delay(12);
        m.bonus += 400 * m.pax;
        like(p, 3, 'You stilled your ship for our prayers.');
        return 'The drive falls silent. They drift through the cargo bay in a slow circle, singing in a language older than any port, and one by one other passengers and crew drift in to listen. When it is over they press a donation on you, in small folded notes, and touch the bulkhead once.';
      } },
      { label: 'Decline politely', run() {
        like(p, -1, null);
        return 'They nod and thank you for hearing them. They pray at one g instead, kneeling in the cargo bay on the cold deck.';
      } },
    ] }) },
  { weight: 1, when: p => p.traits.includes('talkative') || p.traits.includes('homesick'), make: (p, m) => ({
    title: 'Long Stories',
    text: `${p.first} corners you in the galley with a bulb of coffee and begins to talk before you can leave. They talk about ${p.home}: the streets, the smells, the bakery at the corner, the neighbor who kept bees, the long evenings. Every story is longer than the last, and every one ends with "and then, of course, I left."`,
    choices: [
      { label: 'Listen', run() {
        like(p, 1, 'You listened to my stories.');
        return `You listen for an hour, and then another. Near the end, buried in the stories, is something useful: "${addRumor()}" ${p.first} gives you a shy smile.`;
      } },
      { label: 'Excuse yourself to the cockpit', run() {
        like(p, -1, null);
        return `You escape to the cockpit with a muttered excuse and check the instruments. ${p.first} finds someone else to talk to. Through the hatch, for the next hour, you hear the stories moving from bunk to bunk.`;
      } },
    ] }) },
  { weight: 1, when: p => p.traits.includes('nervous'), make: (p, m) => ({
    title: 'Panic at the Flip',
    text: `${p.first} panics when the drive cuts out for the flip. The silence and the sudden lightness hit them at once, and they are sure the reactor has failed. They grip the edge of the bunk, wide-eyed, breathing in short gasps, and a low moan starts in their throat. The others look at you.`,
    choices: [
      { label: 'Talk them through it', run() {
        like(p, 2, 'You talked me through a panic attack.');
        return `You sit beside them and explain flip-and-burn three times, slowly, in an even voice, with a hand on their shoulder and a cup of water. You draw it on the bulkhead with a finger. The third time, they nod, and the trembling slows, and they laugh, once, wetly. ${p.first} apologizes. You tell them there is nothing to apologize for.`;
      } },
      { label: 'Give them a sedative (200 cr)', can: () => G.state.credits >= 200, run() {
        G.state.credits -= 200;
        like(p, 1, null);
        return `${p.first} takes the sedative with a shaking hand and lies back on the bunk. Within minutes they are breathing slow and deep. They sleep through the rest of the burn and wake at the dock calmer. They do not remember what frightened them.`;
      } },
      { label: 'Tell them to pull themselves together', run() {
        m.bonus -= 300;
        like(p, -2, 'You mocked me when I was scared.');
        return `${p.first} flinches and goes quiet. They spend the rest of the trip in their bunk with the curtain drawn, eating little, speaking to no one. Sometimes, in the night, you can hear them.`;
      } },
    ] }) },
  { weight: 1, when: p => p.traits.includes('curious'), make: (p, m) => ({
    title: 'Engine Room Tour',
    text: `${p.first} has been hovering near the engine room hatch for two days, listening to the hum, with an ear pressed to the bulkhead. Now they come to you. "Captain, I would love to see the drive room. Just a quick look. I will not touch anything. I promise. I have always wanted to know how it works."`,
    choices: [
      { label: 'Show them around', run() {
        like(p, 2, 'You showed me the drive room.');
        if (Math.random() < 0.25) {
          G.state.fuel = Math.max(0, G.state.fuel - 20);
          return `${p.first} touches something. A hiss goes up, and a valve you did not know existed blows its seal. You vent 20 units of reaction mass into the black before you can shut it. ${p.first} apologizes for the next hour, fast and stammering, until you laugh.`;
        }
        return `${p.first} asks questions for an hour, about coolant loops and injector timing and why the drive hums at that note. You find yourself explaining, and enjoying it. By the end you are both leaning on a pipe, grinning, with the drive humming around you.`;
      } },
      { label: 'Crew only, sorry', run() {
        like(p, -1, null);
        return 'They say they understand and are sorry to have asked. That evening you find them at the observation blister, listening to the hum of the drive through the wall. When they see you, they smile and go on listening.';
      } },
    ] }) },
  { weight: 1, when: p => p.traits.includes('drunk'), make: (p, m) => ({
    title: 'Galley Incident',
    text: `${p.first} got into the good whiskey, the bottle you were saving, and at about the third glass decided to give the galley water recycler "a bit of a fix", with a spoon and a fork. There is a gap in the wall and a fine mist in the air, and ${p.first} is sitting in the middle of the galley, wet through, holding the spoon like a scepter. Repairs will run about 400 credits.`,
    choices: [
      { label: 'Add it to their fare', run() {
        m.bonus += 400;
        like(p, -2, 'You charged me for the recycler.');
        return `${p.first} grumbles, looks at the floor, and mutters something about "unreasonable". When you arrive they pay in full, in small folded notes, without another word. They do not touch whiskey again that trip, and they avoid the galley.`;
      } },
      { label: 'Let it slide (400 cr)', run() {
        G.state.credits = Math.max(0, G.state.credits - 400);
        like(p, 2, 'You let the recycler thing slide.');
        return `${p.first} goes deep red. They insist on cleaning the galley themselves, top to bottom, all night, with a toothbrush, and in the morning it is the cleanest room on the ship. There is a note on the door in pencil: "Sorry. Thank you. Never again."`;
      } },
    ] }) },
  { weight: 1, when: p => p.traits.includes('greedy'), make: (p, m) => ({
    title: 'Card Game',
    text: `${p.first} produces a deck of cards, worn soft at the corners, and shuffles it with a flourish. The smile is friendly, a little too friendly. "A friendly game, captain," they say, "with a little money on it. Just to make things interesting. It is a long burn, and a man gets bored."`,
    choices: [
      { label: `Play (500 cr stake)`, can: () => G.state.credits >= 500, run() {
        if (Math.random() < 0.5) { G.state.credits += 500; like(p, -1, 'You beat me at cards.'); return `You clean ${p.first} out in one long quiet hand. ${p.first} stares at the table for ten seconds. For the rest of the trip ${p.first} sulks in a corner and mutters about "luck".`; }
        G.state.credits -= 500;
        like(p, 1, null);
        return `${p.first} wins, in one slow hand, with a single card turned over at the end. They gather the money and are insufferable about it for the rest of the trip, humming, shuffling the deck, and smiling at you every so often.`;
      } },
      { label: 'Decline', run: () => 'They shrug and deal a hand of solitaire instead, slowly. You hear each card click down. You watch them play and lose and begin again.' },
    ] }) },
  { weight: 1, when: p => p.traits.includes('generous') || p.traits.includes('kind'), make: (p, m) => ({
    title: 'Gratitude',
    text: `${p.first} takes over the galley for an afternoon and cooks a dinner for everyone aboard, with spices they brought from ${p.home}, wrapped in twists of paper in a hidden pouch. The ship fills with the smell of cumin and roasted peppers, and the crew drift in one by one. At the end they insist on tipping you for a smooth trip, pressing the notes into your palm.`,
    choices: [
      { label: 'Accept graciously', run() {
        m.bonus += 300 * p.wealth;
        like(p, 1, null);
        return 'You accept, with a small bow, and sit at the long table with the crew, elbow to elbow, passing dishes. It is the best meal the ship has had in months, and for an hour nobody talks about anything else. Somebody starts to sing, and the table joins in.';
      } },
      { label: 'Refuse the money, keep the dinner', run() {
        like(p, 3, 'You would not take my money.');
        return `${p.first} cannot speak for a moment. They take your hand in both of theirs, and then they write out the recipe, every step, on a napkin, with a sketch of the pot. You will cook it, badly, for years.`;
      } },
    ] }) },
  { weight: 1, when: p => p.traits.includes('rude'), make: (p, m) => ({
    title: 'Complaints',
    text: `${p.first} has a list of complaints in a neat notebook, and reads it aloud, in order, like a prosecutor. The bunk is too hard. The food is a crime. The gravity is "insufficiently serious". The coffee tastes of pipe. Then, after a pause: "And frankly, captain, your face is not one I would choose to look at for so long."`,
    choices: [
      { label: 'Humor them', run() { like(p, 1, null); return 'You nod gravely, make sounds of sympathy in the right places, and write a few of the complaints down in a small book. By the end of the hour ' + p.first + ' has run out, and asks, in a smaller voice, whether there might be more tea.'; } },
      { label: 'Put them in their place', run() {
        m.bonus -= 300;
        like(p, -2, 'You put me in my place.');
        return `You tell them, in a level voice, exactly what you think of their list, item by item. ${p.first} goes pale, then red, then still. They file a formal complaint, in triplicate. It comes out of your fare, but the rest of the trip is quiet, and at night you can hear the drive again.`;
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
  greedy: c => ({ title: `${c.first} Wants a Raise`, text: `${c.first} finds you at the end of a long shift with a printed sheet and folded arms. The sheet lists what crew with their skills earn on other ships, what a ship of your size can afford, and what ${c.first} has done for you lately. The last line says: "I am worth it."`,
    choices: [
      { label: `Give them 25% more (${fmt(c.wage * 1.25)} cr/day)`, run() { c.wage = Math.round(c.wage * 1.25); like(c, 3, 'You gave me a raise.'); return `${c.first} hums while they work for the rest of the week and calls you "boss". Unasked, they tidy the corner of the cockpit.`; } },
      { label: 'No', run() { like(c, -2, 'You refused me a raise.'); return `${c.first} goes back to work without a word. For the next few days they do exactly what is asked and nothing more. Their tools are always where they were left. They have stopped smiling.`; } },
    ] }),
  drunk: c => ({ title: 'Galley Brawl', text: `${c.first} got drunk on something they had been keeping in a pipe, and had an argument with the galley bulkhead. The bulkhead won. There is a dent the size of a fist in the wall, blood on the deck, and ${c.first} sitting on the floor with a cloth pressed to their forehead. The medical supplies cost 300 cr.`,
    choices: [
      { label: 'Dock their pay', run() { like(c, -2, 'You docked my pay.'); return `${c.first} spends the week in a corner of the engine room with their back to the ship, and does the work in silence.`; } },
      { label: 'Pay for it and let it go (300 cr)', run() { G.state.credits = Math.max(0, G.state.credits - 300); like(c, 2, 'You let the brawl go.'); return `${c.first} stares at the floor, then swears off drink. For now. They insist on doing the next three galley shifts. When you find them scrubbing the bulkhead, they do not meet your eye. The dent has been polished.`; } },
    ] }),
  homesick: c => ({ title: 'Homesick', text: `${c.first} has been quiet for days. At mealtimes they push their food around. At night you have seen them at the viewport, looking at a point of light. They have not said they miss ${c.home}.`,
    choices: [
      { label: 'Give them a 500 cr bonus to call home', can: () => G.state.credits >= 500, run() { G.state.credits -= 500; like(c, 3, 'You paid for my call home.'); return `${c.first} spends an hour on a lagged call home, in a quiet corner of the ship, with a hand over their mouth. They come back with red eyes and laugh once. They will not say what was said. For the rest of the week they hum in the corridors, and nobody mentions it.`; } },
      { label: 'Share a drink and listen', run() { like(c, 1, null); return `You pour two cups of something strong and sit on a crate beside them. For an hour you listen to them talk about ${c.home}: the weather, the food, the quiet places. You say almost nothing. When they go to bed, they put a hand on your shoulder on the way out.`; } },
      { label: '"We all miss somewhere."', run() { like(c, -1, null); return `${c.first} nods and goes back to work. That night you see them at the viewport again, alone, and you leave them to it.`; } },
    ] }),
  nervous: c => ({ title: 'Bad Dreams', text: `${c.first} has not been sleeping. There are dark shadows under their eyes, they fumble small tasks, and they jump at every clank of the hull. When you ask, they tell you in a flat voice: nightmares about hull breaches, the same one every night. The thin bright line of a crack, spreading. The sudden silence. The cold.`,
    choices: [
      { label: 'Talk them through it', run() { like(c, 2, 'You helped me through the nightmares.'); return `You sit with them in the galley at three in the morning with a pot of tea between you, and talk about nothing in particular. ${c.first} sleeps through the night for the first time in a week. In the morning they bring you a cup of coffee and spill half of it.`; } },
      { label: 'Tell them to toughen up', run() { like(c, -2, 'You told me to toughen up.'); return `${c.first} flinches, nods, and stops mentioning it. In the days after, the shadows under their eyes get darker. They check the seals on every hatch they pass.`; } },
    ] }),
  talkative: c => ({ title: 'Gossip', text: `${c.first} has been on the open band with half the ships in comm range, chatting. They know the name of the freighter captain's dog. They know who is feuding with whom at the next port. They lean in at your cabin door with news.`,
    choices: [{ label: 'What have you heard?', run() { like(c, 1, null); return `${c.first} sits down and gives you an hour of gossip: names, and small betrayals. In the middle of it is one thing that is useful: "${addRumor()}" Then ${c.first} moves on to the next thing.`; } }] }),
  secretive: c => ({ title: 'Locked Locker', text: `${c.first}'s locker has two locks, one you do not recognize and a cheap padlock over it. They have been receiving messages with no sender ID, short ones, at odd hours. They read them, delete them, and read them again. When you come into the room, they flinch.`,
    choices: [
      { label: 'Ask about it', run() { like(c, -2, 'You pried into my locker.'); return `${c.first} looks at you. "Family business," ${c.first} says, quietly. That is all you get. Afterward ${c.first} takes meals in the bunk and locks the door to sleep.`; } },
      { label: 'Respect their privacy', run() { like(c, 2, 'You respected my privacy.'); return 'You say nothing and turn to go. Behind you, their shoulders come down. That evening ' + c.first + ' brings you a cup of tea you did not ask for, stands a moment in the doorway, and goes.'; } },
    ] }),
  curious: c => ({ title: 'Tinkering', text: `${c.first} has the reaction mass pumps in pieces on newspaper in the middle of the engine room, "to see how they work". Every bolt is in a row. Three manuals are open, and there is a cup of cold tea. Nobody asked them to.`,
    choices: [
      { label: 'Let them experiment', run() {
        like(c, 2, 'You let me tinker.');
        if (Math.random() < 0.6) { G.state.fuel = Math.min(ship().fuel, G.state.fuel + 25); return 'They find a leak nobody knew about, a hairline crack in an old fitting that has been weeping mass for months, and seal it with a strip of foil. You recover 25 units of reaction mass. From then on the pumps run quiet, and ' + c.first + ' hums while they work.'; }
        G.state.fuel = Math.max(0, G.state.fuel - 20);
        return 'Something goes pop. A thin jet of reaction mass hisses out of the open housing before you can shut it, and you lose 20 units. ' + c.first + ' looks at the empty housing. "Ah," ' + c.first + ' says.';
      } },
      { label: 'Put it back together. Now.', run() { like(c, -1, null); return 'They reassemble every part, muttering, and the pumps run as before. ' + c.first + ' tightens the last bolt without looking at you.'; } },
    ] }),
  pious: c => ({ title: 'Quiet Prayer', text: `${c.first} finds you in the galley at the turn of the watch with a worn charm in one hand and asks you to join a short prayer for safe passage. They say it every burn, alone, in a corner, but tonight they wanted company. It will take a few minutes. They say you may stay silent.`,
    choices: [
      { label: 'Join them', run() { like(c, 2, 'You prayed with me.'); return 'You kneel beside them in the dim light. For a few minutes nobody speaks. The drive hums. A pipe ticks. When it ends, you both sit a moment. "Thank you," ' + c.first + ' says.'; } },
      { label: 'Politely decline', run() { like(c, 0, null); return `${c.first} goes to their corner. Through the thin wall you hear the low murmur of their prayer. ${c.first} prays for you anyway. You listen for a while.`; } },
    ] }),
  rude: c => ({ title: 'Friction', text: `${c.first} has been needling the rest of the crew for days: a jab at breakfast, a remark in the corridor, a sneer at how someone hums. Tonight in the galley a chair scrapes, and a level voice says, "Say that again." There is going to be a fight.`,
    choices: [
      { label: 'Reprimand them', run() { like(c, -2, 'You reprimanded me in front of everyone.'); return `You step between them and say a few sharp things in front of everyone. The room goes still. ${c.first} goes red, then pale, and leaves without a word. The air clears, mostly. For days ${c.first} eats alone.`; } },
      { label: 'Let them sort it out', run() { like(c, 1, null); return `You lean in the doorway with your arms folded and let them. It is short, loud and untidy, and involves a soup pot. ${hurt(0.03)} points of hull damage later they are sitting side by side on the deck, breathing hard, sharing a cloth for a bloody lip, and laughing.`; } },
    ] }),
  kind: c => ({ title: 'Small Kindnesses', text: `${c.first} spent the night fixing everyone's bunk lights, one by one, with a small screwdriver, and in the small hours cooked a real meal from the last of the good stores, with a pinch of something warm. Nobody asked them to. In the morning every bunk had a light that worked, and every plate was full.`,
    choices: [{ label: 'Thank them', run() { like(c, 1, null); return `You find ${c.first} in the galley washing the last of the pots. You thank them. They wave it off and make a joke of it, and their ears go pink. For the rest of the trip nobody snaps at the table.`; } }] }),
  generous: c => ({ title: 'Shared Bottle', text: `${c.first} comes into the galley at the end of a long shift with a dusty bottle wrapped in a shirt. They have carried it in the bottom of their bag since they left ${c.home}. They set it on the table and take down every cup in the cupboard. "I was saving it for a special occasion," they say. "But I think we are the occasion."`,
    choices: [{ label: 'Raise a glass', run() { like(c, 1, 'We shared a bottle.'); return `You raise a glass, and so does everyone else, in a ring around the table. The bottle tastes of ${c.home}: sweet, smoky, a little strange. To the ship. To the crew. To not dying. Somebody laughs, then everyone does, and the bottle goes round twice before it is empty.`; } }] }),
  brave: c => ({ title: 'Volunteer', text: `A sensor mast has come loose in the burn and hangs by one strut, banging against the hull with every pulse of the drive. It will tear free sooner or later and take plating with it. Before you can speak, ${c.first} has the suit half on. "I will go, captain," they say, buckling a strap. "It is a ten-minute job. I have done worse."`,
    choices: [
      { label: 'Let them go', run() { like(c, 1, null); return Math.random() < 0.85 ? `${c.first} goes out through the lock with a tether and a bag of tools. For twenty minutes they are a small bright shape against the stars, working along the hull. Then they are back inside, helmet off, sweating, grinning, holding the bent strut.` : `A tether snaps. For one second ${c.first} drifts, arms out, into the black, until a gloved hand catches a handhold and holds. They make it back, shaking and gasping. The ship takes ${hurt(0.05)} points of damage from the loose mast, and nobody sleeps that night.`; } },
      { label: 'Go yourself', run() { like(c, 2, 'You took the risky EVA yourself.'); return `You go out through the lock yourself, with the tether at your belt, and fix it in the cold and the silence with the ship turning slowly below your boots. It takes forty minutes. ${c.first} watched through the port, and when you come in ${c.first} hands you a cup without a word.`; } },
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
    } else if (p.opinion >= OPINION.TRUSTED && !p.thanked) {
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
    } else if (p.opinion <= OPINION.BITTER && !p.avenged) {
      p.avenged = true;
      G.revenge = p;
      notes.push(`Word on the docks: ${p.first} ${p.last} has been asking around about your ship, and paying people to listen. Watch yourself out there.`);
    }
  }
  return notes;
}
