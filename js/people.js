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
  nervous:    { adj: 'nervous',     chatter: ['{first} keeps checking the hull pressure readouts.', '{first} jumps at a small clank from the engine room, and pretends they did not.', '{first} has, for the fifth time this watch, tested the seal on the nearest hatch.', '{first} is counting the emergency suits, quietly, under their breath, in a low, steady mutter.', '{first} sleeps with a hand on the bulkhead, as if to feel for anything wrong.'] },
  generous:   { adj: 'generous',    chatter: ['{first} made coffee for everyone.', '{first} has left a small plate of something sweet outside the engine room, without a note.', '{first} is giving away, one piece at a time, the contents of their sock drawer.', '{first} covered someone\'s shift, and will not hear a word about it.', '{first} has a knack for turning up, unasked, with exactly what you need.'] },
  greedy:     { adj: 'money-minded', chatter: ['{first} is doing sums on a hand terminal and muttering.', '{first} has worked out what every ton of cargo on the ship is worth, and tells you, twice.', '{first} is running the numbers on a trade route, and, from the muttering, it is not going to be enough.', '{first} watches the fuel gauge with a look like a small, private grief.', '{first} has started a small betting pool on the arrival date, and, somehow, holds all the odds.'] },
  pious:      { adj: 'devout',      chatter: ['{first} is praying quietly in the cargo bay.', '{first} has tied a small ribbon to a bulkhead, for luck, and blessed it.', '{first} murmurs a short blessing over the drive before each flip, and the ship, somehow, always seems the better for it.', '{first} is reading, aloud and very softly, from a small worn book.', '{first} is lighting a very small, very safe candle in a jar, and guarding it like a treasure.'] },
  rude:       { adj: 'abrasive',    chatter: ['{first}: "Who designed this galley, and were they drunk?"', '{first} is complaining about the coffee. The coffee, to be fair, deserves it.', '{first}: "In my last ship, we had a proper bunk. With a door."', '{first} has an opinion about the way you are flying, and shares it, generously, at every turn.', '{first} is glaring at the thermostat, as if it had personally insulted them.'] },
  curious:    { adj: 'curious',     chatter: ['{first} is asking the nav computer far too many questions.', '{first} has taken the panel off the galley clock to see what makes it tick.', '{first} is following the plume readout with a small notebook, and a look of pure joy.', '{first}: "But why does it hum at that particular note? Has anybody ever asked?"', '{first} is pressing an ear to the bulkhead, listening to something nobody else can hear.'] },
  drunk:      { adj: 'hard-drinking', chatter: ['{first} is suspiciously cheerful for this hour.', '{first} is humming, loudly, an old song from {home}, and has forgotten the second verse.', '{first} is sitting very carefully upright, with a mug that smells like anything but coffee.', '{first} has made a small toast to the ship, and is now, tenderly, toasting the coffee maker.', '{first} is cheerfully explaining something to a coaster.'] },
  secretive:  { adj: 'guarded',     chatter: ['{first} closes a message window whenever you walk past.', '{first} answers every question with a question, and does it very gracefully.', '{first} has a small locked case, and a way of standing between it and everyone else.', '{first} is very quiet, and very watchful, and, somehow, always knows where everyone is.', '{first} deletes a message, and looks up, and smiles at you, with nothing at all behind it.'] },
  kind:       { adj: 'kind',        chatter: ['{first} fixed the squeaky hatch without being asked.', '{first} noticed someone was tired, and quietly took the rest of their watch.', '{first} is sewing a torn sleeve, by a lamp, for someone who is not going to ask.', '{first} has left a note on the galley wall: "Ask me if you need anything. Anything at all."', '{first} is humming, softly, at the sink, while washing everyone else\'s cups.'] },
  brave:      { adj: 'steady',      chatter: ['{first} volunteered for the next EVA before anyone asked.', '{first} is calmly checking the emergency hatches, one by one, as if it were a pleasant stroll.', '{first} has a small, plain scar, and a small, plain refusal to talk about it.', '{first}: "If anything goes wrong, I will be the one to go and look. That is what I am for."', '{first} is smiling, in the face of a very small, very real problem with the coolant.'] },
  homesick:   { adj: 'homesick',    chatter: ['{first} is looking through old pictures of {home}.', '{first} has gone very quiet, and is watching the viewport as though a place might come up in it.', '{first} is making a dish from {home}, out of not-quite-right ingredients, and eating it with great seriousness.', '{first} is humming something from {home}, low and soft, and does not seem to know.', '{first} keeps a small stone from {home}, worn smooth, and turns it over, and over, and over.'] },
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

function like(p, n, memory) {
  if (!p.memories) return;  // handcrafted crew (crew.js) have arcs instead of opinions
  p.opinion += n;
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
    text: `A customs cutter hails for a cargo scan, its searchlight sweeping your hull, its voice calm and businesslike on the open band. ${p.first} goes very pale, and looks, all at once, like a child caught out of bed. Their hands are shaking, and they keep glancing toward the hold. "Captain," they whisper. "Please. Whatever you can do. Stall them, delay them, anything. I will explain later. I promise."`,
    choices: [
      { label: 'Stall them', run() {
        if (Math.random() < 0.6) {
          m.bonus += 1500 * p.wealth;
          like(p, 3, 'You covered for me with customs.');
          return `You bury the customs officer in paperwork, forms and queries and a long, plaintive story about a sensor fault, for forty-one minutes, until their intercept window closes and the cutter, with a resigned burst of static, peels away. ${p.first} lets out a long breath and sits down heavily on a crate, and, later, slips you a very generous tip, with a look of sheer, unspoken gratitude.`;
        }
        G.state.credits = Math.max(0, G.state.credits - 2000);
        changeRep(localGov(), -5);
        like(p, 1, 'You tried to cover for me with customs.');
        return `It does not work. The inspectors board within the hour, moving with cheerful, methodical purpose, and they find ${p.first}'s stash in the second bay, behind a false panel, in less than ten minutes. ${p.first} does not say a word. You pay a 2,000 cr fine for "negligent inspection", and, for the rest of the trip, nobody on the ship meets anyone else's eye.`;
      } },
      { role: 'slicer', label: '[{crew}] Spoof the cargo manifest', run() {
        if (Math.random() < slicerOdds()) {
          m.bonus += 1500 * p.wealth;
          like(p, 3, 'Your slicer hid me from customs.');
          return `{crew} bends over the console and, in about ninety seconds, rewrites the manifest, the cargo record, and, for good measure, the ship's whole recent history. When the scan sweeps the hold, it finds nothing but tidy crates and honest paperwork. ${p.first}, watching from the hatch, looks at you with new respect, and the faintest trace of awe.`;
        }
        G.state.credits = Math.max(0, G.state.credits - 2000);
        return '{crew}\'s spoof does not hold. A single line of the manifest fails a checksum, and the scanner, which has probably seen every trick in the book, lights up like a festival. You pay a 2,000 cr fine, and {crew} spends the next hour muttering, in slow horror, about how the mistake was a single misplaced digit.';
      } },
      { label: `Turn ${p.first} in (+1,500 cr reward)`, run() {
        G.state.credits += 1500;
        dropPassenger(m, null);
        changeRep(localGov(), 3);
        like(p, -6, 'You turned me in to customs.');
        return `Customs takes ${p.first} away in cuffs, quietly, without any fuss, with a neat efficient hand on their shoulder. They do not look back at you. They do not say a word. The only sound is the soft click of the airlock, and, behind it, the long, awful silence of a ship that has just lost someone.`;
      } },
    ] }) },
  { weight: 3, when: p => p.secret === 'wanted', make: (p, m) => ({
    title: 'Bounty Hunter',
    text: `A bounty hunter matches your burn, silent and dark, with a single running light that winks on and off like an eye. The voice on the channel is low, bored, and patient. "You are carrying ${p.first} ${p.last}, wanted on ${p.home} for ${p.crime}. Five thousand for the handover, or I take them the hard way." In the galley, ${p.first} sets down a cup very carefully, and says nothing at all. Their hands are perfectly steady. That is the frightening part.`,
    choices: [
      { label: 'Hand them over (+5,000 cr)', run() {
        G.state.credits += 5000;
        dropPassenger(m, null);
        like(p, -8, 'You sold me to a bounty hunter.');
        return `The hunter docks, and ${p.first} goes quietly, with their one small bag, without a single word of protest. They pause at the airlock, and look back at you once, with an expression you will see for weeks in the dark of your cabin. The credits arrive before the airlock finishes cycling.`;
      } },
      { role: 'gunner', label: '[{crew}] Make them reconsider', run() {
        m.bonus += 2000;
        like(p, 4, 'You fought off a bounty hunter for me.');
        return `{crew} puts a burst across their bow, a long, bright, deliberate line of tracer that lights the hunter's hull like a sunrise. They reconsider. You take ${hurt(0.1)} points of armor damage from a single wild return shot, and, when you arrive, ${p.first} pays you extra, and, at the airlock, squeezes your hand so hard that it hurts.`;
      } },
      { label: 'Refuse, and fight if you must', run() {
        if (Math.random() < fightOdds()) {
          m.bonus += 2000;
          like(p, 4, 'You fought off a bounty hunter for me.');
          return `You drive the hunter off in a long, ugly exchange, with ${hurt(0.2)} points of armor damage and a singed antenna. That night, in the galley, over a bulb of something strong, ${p.first} finally tells you their side of the story, slowly, haltingly, and it is a great deal more complicated than the bounty made it sound.`;
        }
        like(p, 3, 'You risked your ship for me.');
        return `The hunter pounds your hull for ${hurt(0.4)} points of armor damage, hammering at you through three long, ringing minutes, then gives up, with a curse on the channel. ${p.first}, ashen, helps you patch the worst of the breaches, without a word. They will not forget this. You are not sure whether you will, either.`;
      } },
    ] }) },
  { weight: 3, when: p => p.secret === 'ill' || p.goal === 'medical', make: (p, m) => ({
    title: 'Medical Emergency',
    text: `${p.first} collapses in the galley, with a clatter of a dropped cup, grey and sweating, and slides to the deck with their back against a cabinet. Their breath is shallow. ${p.goal === 'medical' ? 'The condition they were traveling to get treated has taken a turn, and quickly.' : 'They admit, between gasps, that they have been hiding an illness for weeks, and did not want to be a burden.'} Everyone in the room has stopped moving. They look at you, the captain, the way people look at the only person who can decide.`,
    choices: [
      { role: 'medic', label: '[{crew}] Treat them', run() {
        m.bonus += 1000;
        like(p, 4, 'Your medic saved my life.');
        return `{crew} works through the night, with a lamp and a case of instruments and infinite patience, and does not leave the bunk once. By morning ${p.first} is sitting up, pale and hollow-eyed, and asking, in a cracked voice, for coffee. {crew} sleeps in the corridor, with a blanket over their shoulders, and nobody has the heart to wake them.`;
      } },
      { label: "Use the ship's medkit (500 cr of supplies)", can: () => G.state.credits >= 500, run() {
        G.state.credits -= 500;
        like(p, 3, 'You spent your medical supplies on me.');
        if (Math.random() < 0.75) { m.bonus += 800; return 'You sit up with them through the night, working from the manual, with a bulb of water and a flashlight in your teeth. It is enough, barely. The fever breaks in the small hours, all at once, like a tide going out, and they sleep, deeply, for the first time in days.'; }
        return 'You do everything the medkit and the manual allow, and it keeps them stable, but only just. They will need a real doctor, and soon, and you spend the rest of the burn checking their pulse every twenty minutes, in the dark, without a word.';
      } },
      { label: 'Burn harder to get them help (40 reaction mass)', can: () => G.state.fuel >= 40, run() {
        G.state.fuel -= 40;
        delay(-10);
        like(p, 2, 'You burned hard to get me to a doctor.');
        return `You push the drive until the frame groans, and the whole ship shudders in a long, low, straining note. ${p.first} is miserable but stable, pinned to a bunk with a wet cloth on their forehead, and grateful for every hour saved. When the doctors take them at the dock, they whisper something to you that you cannot quite make out. It sounds like thanks.`;
      } },
      { label: 'There is nothing you can do', run() {
        m.bonus -= 500;
        like(p, -2, 'You left me to suffer.');
        return `${p.first} recovers, slowly, over three long days, on their own, in a cold bunk. They do not ask you for anything, and they do not speak to you for the rest of the trip. When they leave, they do not say goodbye. You tell yourself there was nothing else you could have done, and you almost believe it.`;
      } },
    ] }) },
  { weight: 3, when: p => p.secret === 'spy', make: (p, m) => ({
    title: 'Encrypted Bursts',
    text: `Your comms log shows ${p.first} sending tight-beam encrypted bursts at odd hours, always between the second and third watch, when the ship is quietest, in short, sharp pulses, aimed at no port you know. They do it from the observation blister, alone, with the lights off. It is very possible that it is nothing. It is also very possible that it is something. You have started to notice how often ${p.first} looks at the door.`,
    choices: [
      { label: 'Confront them', run() {
        if (Math.random() < 0.5) {
          m.bonus += 2500;
          like(p, 1, 'You caught me, and took money to keep quiet.');
          return `${p.first} sighs, and looks at you for a long moment, with a strange, tired, almost relieved smile, and transfers 2,500 cr "for your discretion". "I like you, captain," they say. "I would rather not have to like you less." It is impossible to tell if that is a promise or a warning.`;
        }
        like(p, -3, 'You pried into my business.');
        return `${p.first} tells you it is none of your business, with an icy calm that makes the hair stand up on your arms. They do not shout, and they do not threaten. They only look at you, steadily, the way one might look at a door one has just decided to lock. It suggests that it really is not your business, and that you would do well to remember it.`;
      } },
      { role: 'slicer', label: '[{crew}] Quietly decrypt the traffic', run() {
        return `{crew} cracks it over a long, quiet evening: someone is paying for market intelligence, hard numbers, from every port you touch, in tidy, careful reports. Nothing dangerous, nothing sinister. Just a very patient stranger who wants to know what everything costs. Among the bursts is a line that might be useful: "${addRumor()}"`;
      } },
      { label: 'Not your business', run() {
        like(p, 2, 'You respected my privacy.');
        return `You let it go. The bursts continue, every night, at the same hour, faint and regular as a heartbeat, and you find you sleep a little better for not knowing. Once, in the corridor, ${p.first} meets your eye, and nods, very slightly, as if in thanks.`;
      } },
    ] }) },
  { weight: 3, when: p => p.secret === 'debt', make: (p, m) => ({
    title: 'Collectors',
    text: `A collection agency hails, in a crisp, well-modulated voice, with the tone of someone reading from a script: ${p.first} owes 1,500 credits and they want it now, "or we flag your ship as an accessory". In the corner of the galley, ${p.first} has turned the color of old paper, and is very carefully not looking at anyone. The agent on the line adds, pleasantly, that they have "a great deal of patience, and a great many lawyers."`,
    choices: [
      { label: 'Pay it for them (1,500 cr)', can: () => G.state.credits >= 1500, run() {
        G.state.credits -= 1500;
        p.owes = 1500;
        like(p, 5, 'You paid off my debt. I will pay you back.');
        return `${p.first} is speechless for a long moment, mouth working, hands clenched at their sides. Then they swear, in a low, shaken voice, that they will pay you back with interest, every credit, every day, if it takes them the rest of their life. They mean it. You can see it, in the way they will not sit down until you have.`;
      } },
      { label: 'Tell the collectors to get lost', run() {
        like(p, 1, 'You stood up to my collectors.');
        return `They threaten legal action, in a long, elegant, faintly hurt speech, and cut the channel. Nothing comes of it. Probably. ${p.first} looks at you across the galley with an expression of stunned, incredulous gratitude, and, a little later, brings you a cup of tea without being asked.`;
      } },
    ] }) },
  { weight: 2, when: p => p.goal === 'job', make: (p, m) => ({
    title: 'Running Late',
    text: `${p.first} has a job interview on ${m.destPlanet}, the kind that comes along once in a long while, and the schedule is tighter than they thought. They have ironed their good shirt three times in the galley, and rehearsed their answers to the mirror. Now they stand at the cockpit hatch, twisting their hands, with the look of someone who has run the numbers and does not like the result. "Captain, I hate to ask. Is there any way at all to go any faster?"`,
    choices: [
      { role: 'pilot', label: '[{crew}] Find a faster line', run() {
        m.bonus += 800;
        like(p, 3, 'You got me to my interview on time.');
        return `{crew} bends over the nav display, muttering, and finds a gravity assist nobody else would try, a long swoop around a moon so small it is barely on the charts. It works. ${p.first} arrives with an hour to spare, freshly ironed, and, at the dock, hugs {crew} before they can dodge.`;
      } },
      { label: 'Hard burn (40 reaction mass)', can: () => G.state.fuel >= 40, run() {
        G.state.fuel -= 40;
        m.bonus += 800;
        like(p, 3, 'You got me to my interview on time.');
        return `You push the drive, and ${p.first} spends the burn pinned to a crash couch, rehearsing answers through gritted teeth, sweat beading on their forehead, in a low, fierce mutter that sounds almost like a prayer. They arrive on time, barely, rumpled and breathless. They do not have time to thank you. You watch them run for the concourse, straightening their collar.`;
      } },
      { label: '"Physics does not negotiate."', run() {
        like(p, -1, 'You would not hurry for my interview.');
        return `They nod, quietly, without argument, and go back to their bunk, and for the rest of the trip you can hear them, through the thin wall, rehearsing under their breath, again and again, in a small, tense voice. It is a very long burn. You do not know whether they make the interview, and, for a while, it bothers you.`;
      } },
    ] }) },
  { weight: 2, when: p => p.goal === 'research', make: (p, m) => ({
    title: 'Sample Opportunity',
    text: `${p.first} has been at the observation blister for hours with a battered notebook and a pair of binoculars, and now they appear at the cockpit hatch, breathless, hair on end, with a look that is very close to joy. They have spotted an interesting rock a few hours off your trajectory, unusual, pale, with a strange bright glint in the sun. "A sample from that could make my career," they say. "I will pay for the detour. Please. I have waited my whole life for something like this."`,
    choices: [
      { label: 'Match orbits and take a sample (costs time)', run() {
        delay(20);
        m.bonus += 1000 * p.wealth;
        like(p, 3, 'You made a detour for my research.');
        return `${p.first} spends six hours in a vac suit on the rock's pale surface, tethered to your hull, giggling into the radio like a child in a snowfield, chipping at the crust with a tiny hammer. When they come back in, frosted and shaking, they hold a small vial to the light, as though it were a newborn. They promise to name something after you, and, though you would not have believed it, they mean it.`;
      } },
      { label: 'Stay on course', run() {
        like(p, -1, 'You would not stop for my research.');
        return `They watch it slide past the window, a small pale point in the dark, and do not say a word. They stay at the glass until it is gone. Later you see them writing, very neatly, in the notebook, the date, and a line you cannot read. They are polite for the rest of the trip, and very quiet, and, when they disembark, they leave a small, folded drawing on the galley table, of a rock, and a ship, and a very long distance.`;
      } },
    ] }) },
  { weight: 2, when: p => p.goal === 'pilgrim' || p.traits.includes('pious'), make: (p, m) => ({
    title: 'A Request for Stillness',
    text: `${p.first} comes to the cockpit hatch, hesitantly, holding a small worn book, with a quiet, almost embarrassed dignity. They ask whether you might cut the drive for a few hours, so that they may hold a prayer service in zero g. It is a holy day for them, and the old prayers say that, in weightlessness, a person is closest to whatever is out there. They do not press. They wait, hands folded, and the small book trembles very slightly in their grip.`,
    choices: [
      { label: 'Cut thrust for them (costs time)', run() {
        delay(12);
        m.bonus += 400 * m.pax;
        like(p, 3, 'You stilled your ship for our prayers.');
        return 'The drive falls silent, and the whole ship seems to exhale. They drift through the cargo bay in a slow, quiet circle, singing, softly, in a language that is older than any port, and, one by one, other passengers and crew drift in to listen. When it is over, they press a donation on you, in small folded notes, and touch the bulkhead once, gently, in blessing.';
      } },
      { label: 'Decline politely', run() {
        like(p, -1, null);
        return 'They nod, without reproach, and thank you for hearing them. They pray at one g instead, kneeling in the cargo bay on the cold deck, a little stiffly, a little less at home, and the quiet is the quiet of people making do. You feel, uneasily, that you have missed something rare.';
      } },
    ] }) },
  { weight: 1, when: p => p.traits.includes('talkative') || p.traits.includes('homesick'), make: (p, m) => ({
    title: 'Long Stories',
    text: `${p.first} corners you in the galley with a bulb of coffee and a look of quiet, determined loneliness, and, before you can escape, begins to talk. They talk about ${p.home}: the streets, the smells, the bakery at the corner, the neighbor who kept bees, the long slow evenings. Every story is a little longer than the last, and every one ends with a soft, wistful "and then, of course, I left." It is clear that they have not had anyone to tell these to in a very long time.`,
    choices: [
      { label: 'Listen', run() {
        like(p, 1, 'You listened to my stories.');
        return `You listen for an hour, and then another, and it is, oddly, a pleasure. ${p.first} has a way of making the small things sound like the whole world. Buried in the stories, near the end, is something useful: "${addRumor()}" They give you a small, shy smile, as though you had given them a gift, and you realize, with a shock, that you did.`;
      } },
      { label: 'Excuse yourself to the cockpit', run() {
        like(p, -1, null);
        return `You escape to the cockpit, with a muttered excuse, and pretend to check the instruments. ${p.first} finds someone else to talk to. Eventually. Through the hatch, for the next hour, you can hear the faint, cheerful murmur of the stories, moving from bunk to bunk, patient as water, and somebody, at least, is listening.`;
      } },
    ] }) },
  { weight: 1, when: p => p.traits.includes('nervous'), make: (p, m) => ({
    title: 'Panic at the Flip',
    text: `${p.first} panics when the drive cuts out for the flip, and the sudden silence and the strange swimming lightness of weightlessness hit them all at once. They are convinced the reactor has failed. They are clutching the edge of the bunk, wide-eyed, breathing in rapid little gasps, and a low, frightened moan is building in their throat. The others look at you. It has to be you. You are the captain, and it is your ship.`,
    choices: [
      { label: 'Talk them through it', run() {
        like(p, 2, 'You talked me through a panic attack.');
        return `You sit beside them and explain flip-and-burn three times, slowly, in a low, even voice, with a hand on their shoulder and a cup of water. You draw it, with a finger, on the bulkhead. The third time, they nod, and the trembling slows, and, at last, they laugh, a wet, embarrassed little laugh. ${p.first} calms down and apologizes, and you tell them, honestly, that there is nothing to apologize for.`;
      } },
      { label: 'Give them a sedative (200 cr)', can: () => G.state.credits >= 200, run() {
        G.state.credits -= 200;
        like(p, 1, null);
        return `${p.first} takes the sedative with a shaking hand, and lies back on the bunk, and within minutes is breathing slow and deep. They sleep through the rest of the burn, without a dream, and wake at the dock, slightly bewildered and much calmer. They do not remember what they were so afraid of. You wonder if you should be pleased.`;
      } },
      { label: 'Tell them to pull themselves together', run() {
        m.bonus -= 300;
        like(p, -2, 'You mocked me when I was scared.');
        return `${p.first} flinches as though struck, and goes very quiet, and does not say a word. They spend the rest of the trip in their bunk, with the curtain drawn, eating little, speaking to no one. You can hear them, sometimes, in the night, and it is not a sound you would wish on anyone.`;
      } },
    ] }) },
  { weight: 1, when: p => p.traits.includes('curious'), make: (p, m) => ({
    title: 'Engine Room Tour',
    text: `${p.first} has been hovering near the engine room hatch for two days, listening to the hum, pressing an ear to the bulkhead with an expression of blissful concentration. Now they come to you, with shining eyes and the air of someone asking for a very great favor. "Captain, I would love to see the drive room. Just a quick look. I will not touch anything. I promise. I have always wanted to know how it works."`,
    choices: [
      { label: 'Show them around', run() {
        like(p, 2, 'You showed me the drive room.');
        if (Math.random() < 0.25) {
          G.state.fuel = Math.max(0, G.state.fuel - 20);
          return `${p.first} touches something. A small, sharp hiss goes up, and a valve you did not know existed blows its seal. You vent 20 units of reaction mass into the black before you can slam it shut, and ${p.first} apologizes profusely, in a stammering, mortified rush, for the next hour, until you are forced to laugh.`;
        }
        return `${p.first} asks smart questions for an hour, in a careful, delighted voice, about coolant loops and injector timing and why the thing hums at that particular note. You find yourself explaining, and then, unexpectedly, enjoying it, and by the end you are both grinning, and leaning on a pipe together, and the drive hums around you like a great, contented animal.`;
      } },
      { label: 'Crew only, sorry', run() {
        like(p, -1, null);
        return 'They look disappointed, like a child told the zoo is closed, but they understand, and nod, and say they are sorry to have asked. That evening you find them at the observation blister, listening to the faint, far hum of the drive through the wall, a little wistful, and, when they notice you, they smile and go on listening.';
      } },
    ] }) },
  { weight: 1, when: p => p.traits.includes('drunk'), make: (p, m) => ({
    title: 'Galley Incident',
    text: `${p.first} got into the good whiskey, the bottle you were saving, and, at about the third glass, decided to give the galley water recycler a "bit of a fix", using a spoon and a fork. There is now a gap in the wall and a fine, damp mist in the air, and a very small, very wet ${p.first} sitting in the middle of the galley, holding the spoon like a scepter. Repairs will run about 400 credits.`,
    choices: [
      { label: 'Add it to their fare', run() {
        m.bonus += 400;
        like(p, -2, 'You charged me for the recycler.');
        return `${p.first} grumbles, and looks at the floor, and mutters something about "unreasonable", but, when you arrive, they pay in full, in small folded notes, without another word. They will not touch whiskey for a good while, and, for the rest of the trip, they avoid the galley as though it were on fire.`;
      } },
      { label: 'Let it slide (400 cr)', run() {
        G.state.credits = Math.max(0, G.state.credits - 400);
        like(p, 2, 'You let the recycler thing slide.');
        return `${p.first} is mortified, and turns a deep, alarming red, and very grateful. They insist on cleaning the galley themselves, top to bottom, all night, with a toothbrush, and in the morning it is the cleanest room on the ship. There is a small, hand-lettered note on the door: "Sorry. Thank you. Never again."`;
      } },
    ] }) },
  { weight: 1, when: p => p.traits.includes('greedy'), make: (p, m) => ({
    title: 'Card Game',
    text: `${p.first} produces a deck of cards, worn soft at the corners, with a magician's flourish, and shuffles them with a great deal of confident, practiced ease. The little smile they wear is very friendly, and, if you look closely, a little bit too friendly. "A friendly game, captain," they say, "with a little money on it. Just to make things interesting. It is a long burn, and a man gets bored."`,
    choices: [
      { label: `Play (500 cr stake)`, can: () => G.state.credits >= 500, run() {
        if (Math.random() < 0.5) { G.state.credits += 500; like(p, -1, 'You beat me at cards.'); return `You clean ${p.first} out, in a long, tense, beautifully quiet hand, and the last card falls like a small guillotine. They stare at the table for a full ten seconds. They are a poor loser, and, for the rest of the trip, they sulk, in a corner, muttering to themselves about "luck".`; }
        G.state.credits -= 500;
        like(p, 1, null);
        return `${p.first} wins, in a long, sly, elegant hand, with a single card turned over at the end like a magician's trick. They gather the money with immense satisfaction, and are insufferable about it for the rest of the trip, humming, and shuffling the deck, and, every so often, giving you a small, dazzling smile.`;
      } },
      { label: 'Decline', run: () => 'They shrug, without offense, and shuffle and deal a hand of solitaire instead, slowly, with the click of each card a small, patient sound in the quiet. For a while you watch them play, and lose, and, with a sigh, begin again. It is, you decide, a fair enough way to spend a burn.' },
    ] }) },
  { weight: 1, when: p => p.traits.includes('generous') || p.traits.includes('kind'), make: (p, m) => ({
    title: 'Gratitude',
    text: `${p.first} takes over the galley for an afternoon, with a small, fierce, joyful energy, and cooks a proper dinner for everyone aboard, using spices they brought from ${p.home}, wrapped in twists of paper and kept in a secret pouch. The whole ship fills with the smell of cumin and roasted peppers, and the crew, one by one, drift in like moths to a flame. And then, at the end, they insist on tipping you for a smooth trip, pressing the notes into your palm.`,
    choices: [
      { label: 'Accept graciously', run() {
        m.bonus += 300 * p.wealth;
        like(p, 1, null);
        return 'You accept graciously, with a small, formal bow, and sit at the long table with the rest of the crew, elbow to elbow, passing dishes hand to hand. It is the best meal this ship has seen in months, and, for an hour, nobody talks about anything but how good it is. Somebody starts to sing, and, unexpectedly, the whole table joins in.';
      } },
      { label: 'Refuse the money, keep the dinner', run() {
        like(p, 3, 'You would not take my money.');
        return `${p.first} is touched, and, for a moment, cannot speak, and their eyes are very bright. They take your hand in both of theirs, and hold it, and insist on writing out the recipe, every step, on a napkin, with a little sketch of the pot. You get the recipe. You will cook it, badly, for years, and every time, you will think of them.`;
      } },
    ] }) },
  { weight: 1, when: p => p.traits.includes('rude'), make: (p, m) => ({
    title: 'Complaints',
    text: `${p.first} has complaints, and they have prepared a list, in a small neat notebook, which they read aloud, in order, with all the relish of a prosecutor. The bunk is too hard. The food is a crime. The gravity is "insufficiently serious". The coffee tastes of pipe. And then, with a small pause for effect, your face: "Frankly, captain, it is not one I would choose to look at for so long."`,
    choices: [
      { label: 'Humor them', run() { like(p, 1, null); return 'You nod a lot, gravely, and make small noises of sympathy in all the right places, and even write a few of the complaints down in a little book. It helps, somewhat. By the end of the hour, ' + p.first + ' has run out of steam, and is looking almost embarrassed, and, in a small voice, asks if there might be more tea.'; } },
      { label: 'Put them in their place', run() {
        m.bonus -= 300;
        like(p, -2, 'You put me in my place.');
        return `You tell them, in a calm, very level voice, precisely what you think of their list, in order, item by item, and ${p.first} goes pale, then red, then, oddly, very still. They file a formal complaint, in triplicate, with a flourish. It comes out of your fare, but the rest of the trip is blissfully quiet, and, at night, you find you can hear the drive again.`;
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
  greedy: c => ({ title: `${c.first} Wants a Raise`, text: `${c.first} finds you at the end of a long shift, arms folded, with a small printed sheet that they have clearly been working on for days. They point out, at length, and with great precision, what crew with their skills earn on other ships, and what a ship of your size can afford, and what they, personally, have done for you lately. It is a very good presentation. It ends with a slide that simply says: "I am worth it."`,
    choices: [
      { label: `Give them 25% more (${fmt(c.wage * 1.25)} cr/day)`, run() { c.wage = Math.round(c.wage * 1.25); like(c, 3, 'You gave me a raise.'); return `${c.first} is all smiles, and, for the rest of the week, hums while they work, and calls you "boss" in a warm, cheerful tone, and, unbidden, tidies the corner of the cockpit. It is amazing what a few credits will do.`; } },
      { label: 'No', run() { like(c, -2, 'You refused me a raise.'); return `${c.first} goes back to work, sullenly, without a word, and, for the next few days, does exactly what is asked of them and not one thing more. Their tools are always where they were left. Their smiles, you notice, are gone. You have won the argument, and it does not feel like winning.`; } },
    ] }),
  drunk: c => ({ title: 'Galley Brawl', text: `${c.first} got drunk, spectacularly, on something they had been keeping in a pipe, and got into a dispute with the galley bulkhead. The bulkhead won, by a small margin. There is now a dent the size of a fist in the wall, a smear of blood on the deck, and a very sorry-looking ${c.first} sitting on the floor with a cloth pressed to their forehead. The medical supplies cost 300 cr.`,
    choices: [
      { label: 'Dock their pay', run() { like(c, -2, 'You docked my pay.'); return `${c.first} nurses a headache and a grudge, in a dark corner of the engine room, with their back to the ship, and, for a week, does their work in a hard, sullen silence. It is impossible to say how much of it is the whiskey and how much is you.`; } },
      { label: 'Pay for it and let it go (300 cr)', run() { G.state.credits = Math.max(0, G.state.credits - 300); like(c, 2, 'You let the brawl go.'); return `${c.first} stares at the floor, in a long, awful silence, and then swears off drink. For now. They insist on doing the next three galley shifts, and, when you catch them scrubbing the bulkhead, they will not meet your eye, but the dent, you notice, has been very carefully polished.`; } },
    ] }),
  homesick: c => ({ title: 'Homesick', text: `${c.first} has been quiet for days, and it is a particular kind of quiet, the kind that comes from a person carrying something heavy and trying not to show it. At mealtimes they push their food around. In the dark, at night, you have seen them at the viewport, looking at a small bright point that might be a long way from here. They miss ${c.home}. They have not said so.`,
    choices: [
      { label: 'Give them a 500 cr bonus to call home', can: () => G.state.credits >= 500, run() { G.state.credits -= 500; like(c, 3, 'You paid for my call home.'); return `${c.first} spends an hour on a lagged call home, in a quiet corner of the ship, with a hand over their mouth, and comes back beaming, with red eyes and a small, shaky laugh. They will not say what was said. But, for the rest of the week, they hum in the corridors, and everyone, without a word, lets them.`; } },
      { label: 'Share a drink and listen', run() { like(c, 1, null); return `You pour two cups of something strong and sit on a crate beside them, and, for an hour, you listen to them talk about ${c.home}: the weather, the food, the odd quiet places. You say almost nothing. It helps, a little, and, when they finally go to bed, they put a hand on your shoulder on the way out.`; } },
      { label: '"We all miss somewhere."', run() { like(c, -1, null); return `${c.first} nods, slowly, and goes back to work. It is true, and it was kindly meant, and it does not help at all. That night you see them at the viewport again, alone, and you leave them to it.`; } },
    ] }),
  nervous: c => ({ title: 'Bad Dreams', text: `${c.first} has not been sleeping, and it shows: dark shadows under their eyes, hands that fumble a little on the small tasks, a jumpiness at every clank of the hull. When you ask, at last, they tell you, in a small flat voice: nightmares about hull breaches. Every night, the same one. The thin bright line of a crack, spreading. The sudden silence. The cold.`,
    choices: [
      { label: 'Talk them through it', run() { like(c, 2, 'You helped me through the nightmares.'); return `You sit with them in the galley, at three in the morning, with a pot of tea between you, and talk, about everything and nothing, until the shadows lift a little. It is not a cure. But ${c.first} sleeps through the night for the first time in a week, and, in the morning, brings you a small, clumsy cup of coffee, and a look of quiet, dazed relief.`; } },
      { label: 'Tell them to toughen up', run() { like(c, -2, 'You told me to toughen up.'); return `${c.first} flinches, very slightly, and nods, and stops mentioning it. That is not the same as better. In the days after, you notice the dark shadows deepening, and the small, careful way they check the seals on every hatch they pass, and you wish, quietly, that you had said something else.`; } },
    ] }),
  talkative: c => ({ title: 'Gossip', text: `${c.first} has been chatting with half the ships in comm range, on the open band, cheerfully and at length, in the manner of a person who has never met a stranger. They know the name of the freighter captain's dog. They know who is feuding with whom at the next port. They lean into your cabin door, eyes bright, brimming with news.`,
    choices: [{ label: 'What have you heard?', run() { like(c, 1, null); return `${c.first} settles in, delighted, and pours out an hour of gossip, a great warm tangle of names and small betrayals, and, in the middle of it, one thing that is actually useful: "${addRumor()}" They look extremely pleased with themselves, and have, already, moved on to the next thing.`; } }] }),
  secretive: c => ({ title: 'Locked Locker', text: `${c.first}'s locker is double-locked, with a lock you do not recognize and a second, cheap padlock over it, and they have been receiving messages with no sender ID, short ones, at odd hours, that they read, and delete, and read again. They flinch, very slightly, when you enter the room. It might be nothing. Every ship has its secrets. But you are the captain, and it is your ship.`,
    choices: [
      { label: 'Ask about it', run() { like(c, -2, 'You pried into my locker.'); return `${c.first} looks at you for a long moment, and, quietly, says: "Family business." That is all you get. It is said politely, and it closes the subject like a door, and, afterward, you notice they take their meals in their bunk, and lock the door when they sleep.`; } },
      { label: 'Respect their privacy', run() { like(c, 2, 'You respected my privacy.'); return 'You say nothing, and turn to go, and, behind you, you feel their shoulders come down. Everyone out here has something. That evening, ' + c.first + ' brings you a small, unasked cup of tea, and stays, awkward, for a moment, in the doorway, as though about to say something, and, at last, does not.'; } },
    ] }),
  curious: c => ({ title: 'Tinkering', text: `${c.first} has been taking apart the reaction mass pumps "to see how they work", in the middle of the engine room, on a bed of newspaper, with every bolt in a neat little row. They have three manuals open, a cup of cold tea, and the calm, glowing look of a person entirely at home. Nobody has asked them to. Nobody, you suspect, could have stopped them.`,
    choices: [
      { label: 'Let them experiment', run() {
        like(c, 2, 'You let me tinker.');
        if (Math.random() < 0.6) { G.state.fuel = Math.min(ship().fuel, G.state.fuel + 25); return 'They find a leak nobody knew about, a hairline crack in an old fitting, weeping mass into the dark for months, and seal it with a small, triumphant flourish and a strip of foil. You recover 25 units of reaction mass, and, from then on, the pumps run smooth and quiet, and ' + c.first + ' hums while they work.'; }
        G.state.fuel = Math.max(0, G.state.fuel - 20);
        return 'Something goes pop. A long, thin jet of reaction mass hisses out of the open housing before you can slam it shut, and you lose 20 units of it, and a great deal of your dignity. ' + c.first + ' stares at the empty housing, and, in a very small voice, says, "Ah."';
      } },
      { label: 'Put it back together. Now.', run() { like(c, -1, null); return 'They do, grumbling, in a low, injured mutter, and reassemble every last part, and the pumps, when they are done, run exactly as before. Their eyes, as they tighten the last bolt, have a faint, private sadness, and you have the feeling that a small, bright thing has gone out of the ship.'; } },
    ] }),
  pious: c => ({ title: 'Quiet Prayer', text: `${c.first} finds you in the galley at the turn of the watch, hesitant, with a small worn charm in one hand, and invites you to join a short prayer for safe passage. They do this every burn, alone, in a quiet corner, but tonight, somehow, they wanted company. It will take only a few minutes. They will not mind if you stay silent. They ask so quietly that you almost do not hear.`,
    choices: [
      { label: 'Join them', run() { like(c, 2, 'You prayed with me.'); return 'You kneel beside them in the dim light, and, for a few minutes, nobody speaks. The drive hums. Somewhere, a pipe ticks. It is quiet, and oddly calming, in a way you had not expected, and, when it ends, you both sit for a moment, in a comfortable stillness. "Thank you," ' + c.first + ' whispers.'; } },
      { label: 'Politely decline', run() { like(c, 0, null); return `${c.first} nods, without offense, and goes to their corner, and, through the thin wall, you can hear the low murmur of their prayer, steady as a heartbeat. ${c.first} prays for you anyway. It is oddly comforting, and, for a while, you find yourself listening.`; } },
    ] }),
  rude: c => ({ title: 'Friction', text: `${c.first} has been needling the rest of the crew for days, a little jab at breakfast, a cutting remark in the corridor, a sneer at the way someone hums. The others have gone quiet in the way that people do before a storm. Tonight, in the galley, there is a slow scrape of a chair, and a very clear, level voice says, "Say that again." There is going to be a fight.`,
    choices: [
      { label: 'Reprimand them', run() { like(c, -2, 'You reprimanded me in front of everyone.'); return `You step between them, and say a few sharp, clear things, in front of everyone, and the room goes still. ${c.first} goes red, and then pale, and, without a word, turns and goes. It clears the air, mostly. It also leaves a little chill behind it, and, for days, ${c.first} eats alone.`; } },
      { label: 'Let them sort it out', run() { like(c, 1, null); return `You lean in the doorway, arms folded, and let them. It is short, loud, and inelegant, and involves a soup pot. ${hurt(0.03)} points of hull damage later, they have sorted it out, and are sitting side by side on the deck, breathing hard, sharing a cloth for a bloody lip, and, gradually, laughing. Nobody quite knows why.`; } },
    ] }),
  kind: c => ({ title: 'Small Kindnesses', text: `${c.first} spent the night fixing everyone's bunk lights, one by one, with a small screwdriver and a great deal of patience, and, in the small hours, cooking a real meal, from the last of the good stores, with a pinch of something warm. Nobody asked them to. Nobody noticed, until the morning, when every bunk had a light that worked, and every plate was full.`,
    choices: [{ label: 'Thank them', run() { like(c, 1, null); return `You find ${c.first} in the galley, washing the last of the pots, and thank them, and they wave it off, embarrassed, and laugh, and turn it into a joke. But their ears go pink. Morale aboard is noticeably better, and, for the rest of the trip, there is a small, contented hum in the ship, like a kettle just off the boil.`; } }] }),
  generous: c => ({ title: 'Shared Bottle', text: `${c.first} appears in the galley at the end of a long shift with a dusty bottle they have been saving, carefully, since they left ${c.home}, wrapped in a shirt, tucked in the bottom of their bag. They set it on the table, and, without a word, take down every cup in the cupboard. "I was saving it for a special occasion," they say. "But, I think, we are the occasion."`,
    choices: [{ label: 'Raise a glass', run() { like(c, 1, 'We shared a bottle.'); return `You raise a glass, and, in the warm glow of the galley lights, so does everyone else, in a slow, quiet ring, the taste of ${c.home} on every tongue, sweet and smoky and faintly strange. To the ship. To the crew. To not dying. Somebody starts to laugh, and then everyone is laughing, and the bottle goes around twice before it is empty.`; } }] }),
  brave: c => ({ title: 'Volunteer', text: `A sensor mast has come loose during the burn, and hangs by a single strut, banging faintly against the hull with every pulse of the drive, a slow, ominous clang. It will tear free, sooner or later, and take a good bit of plating with it. Before you can say a word, ${c.first} has already got the suit half on. "I will go, captain," they say, buckling a strap. "It is a ten-minute job. I have done worse."`,
    choices: [
      { label: 'Let them go', run() { like(c, 1, null); return Math.random() < 0.85 ? `${c.first} goes out through the lock with a tether and a bag of tools, and, for twenty long minutes, is a small, bright shape against the stars, working slowly along the hull. Then they are back inside, helmet off, sweaty and grinning, and holding the bent strut like a trophy.` : `A tether snaps. For one terrible, silent second, ${c.first} drifts, arms out, into the black, before their gloved hand catches a handhold and holds. They make it back, shaken and gasping. The ship takes ${hurt(0.05)} points of damage from the loose mast, and nobody sleeps that night.`; } },
      { label: 'Go yourself', run() { like(c, 2, 'You took the risky EVA yourself.'); return `You go out through the lock yourself, with the tether snug at your belt and your heart hammering, and fix it, in the cold and the silence, with the whole ship turning slowly below your boots. It is beautiful, and terrifying, and over far too fast. ${c.first} was watching, through the port, and looks at you differently now, with a quiet, considering respect.`; } },
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
