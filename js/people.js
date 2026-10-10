'use strict';

// Procedural people: passengers, hireable crew, and ship captains. Everyone gets a
// culture-appropriate name, a home, a job, traits, a reason to travel, and sometimes
// a secret. People you deal with persist in the save, remember what you did, and can
// turn up again. Loaded before game.js; only calls into it at runtime.

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
  if (n) p.liftedAt = G.state.day;
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
// The words of each event are in PEOPLE_LINES (peopletext.js), read through peopleSay (linetables.js) so the scene editor can change them; `say` fills a line's {words} from
// the passenger and the trip. What a choice does is here. `sample` is a passenger the event is about, for the scene editor's preview.
const paxSay = (id, p, m) => (key, vars) => peopleSay(`people:pax:${id}`, key, { first: p.first, last: p.last, home: p.home, crime: p.crime, dest: m.destPlanet, ...vars });
const PAX_EVENTS = [
  { id: 'contraband', sample: { secret: 'contraband' }, weight: 3, when: p => p.secret === 'contraband', make: (p, m) => { const say = paxSay('contraband', p, m); return ({
    title: say('title'),
    text: say('text'),
    choices: [
      { label: say('c0.label'), run() {
        if (Math.random() < 0.6) {
          m.bonus += 1500 * p.wealth;
          like(p, 3, 'You covered for me with customs.');
          return say('c0.win');
        }
        G.state.credits = Math.max(0, G.state.credits - 2000);
        changeRep(localGov(), -5);
        like(p, 1, 'You tried to cover for me with customs.');
        return say('c0.lose');
      } },
      { role: 'slicer', label: say('c1.label'), run() {
        if (Math.random() < slicerOdds()) {
          m.bonus += 1500 * p.wealth;
          like(p, 3, 'Your slicer hid me from customs.');
          return say('c1.win');
        }
        G.state.credits = Math.max(0, G.state.credits - 2000);
        return say('c1.lose');
      } },
      { label: say('c2.label'), run() {
        G.state.credits += 1500;
        dropPassenger(m, null);
        changeRep(localGov(), 3);
        like(p, -6, 'You turned me in to customs.');
        return say('c2.result');
      } },
    ] }); } },
  { id: 'wanted', sample: { secret: 'wanted' }, weight: 3, when: p => p.secret === 'wanted', make: (p, m) => { const say = paxSay('wanted', p, m); return ({
    title: say('title'),
    text: say('text'),
    choices: [
      { label: say('c0.label'), run() {
        G.state.credits += 5000;
        dropPassenger(m, null);
        like(p, -8, 'You sold me to a bounty hunter.');
        return say('c0.result');
      } },
      { role: 'gunner', label: say('c1.label'), run() {
        m.bonus += 2000;
        like(p, 4, 'You fought off a bounty hunter for me.');
        return say('c1.result', { armor: hurt(0.1) });
      } },
      { label: say('c2.label'), run() {
        if (Math.random() < fightOdds()) {
          m.bonus += 2000;
          like(p, 4, 'You fought off a bounty hunter for me.');
          return say('c2.win', { armor: hurt(0.2) });
        }
        like(p, 3, 'You risked your ship for me.');
        return say('c2.lose', { armor: hurt(0.4) });
      } },
    ] }); } },
  { id: 'ill', sample: { secret: 'ill' }, weight: 3, when: p => p.secret === 'ill' || p.goal === 'medical', make: (p, m) => { const say = paxSay('ill', p, m); return ({
    title: say('title'),
    text: say('text', { reason: say(p.goal === 'medical' ? 'reason.medical' : 'reason.ill') }),
    choices: [
      { role: 'medic', label: say('c0.label'), run() {
        m.bonus += 1000;
        like(p, 4, 'Your medic saved my life.');
        return say('c0.result');
      } },
      { label: say('c1.label'), ...gated(needCr(500)), run() {
        G.state.credits -= 500;
        like(p, 3, 'You spent your medical supplies on me.');
        if (Math.random() < 0.75) { m.bonus += 800; return say('c1.win'); }
        return say('c1.lose');
      } },
      { label: say('c2.label'), ...gated(needMass(40)), run() {
        G.state.fuel -= 40;
        delay(-10);
        like(p, 2, 'You burned hard to get me to a doctor.');
        return say('c2.result');
      } },
      { label: say('c3.label'), run() {
        m.bonus -= 500;
        like(p, -2, 'You left me to suffer.');
        return say('c3.result');
      } },
    ] }); } },
  { id: 'spy', sample: { secret: 'spy' }, weight: 3, when: p => p.secret === 'spy', make: (p, m) => { const say = paxSay('spy', p, m); return ({
    title: say('title'),
    text: say('text'),
    choices: [
      { label: say('c0.label'), run() {
        if (Math.random() < 0.5) {
          m.bonus += 2500;
          like(p, 1, 'You caught me, and took money to keep quiet.');
          return say('c0.win');
        }
        like(p, -3, 'You pried into my business.');
        return say('c0.lose');
      } },
      { role: 'slicer', label: say('c1.label'), run() {
        return say('c1.result', { rumor: addRumor() });
      } },
      { label: say('c2.label'), run() {
        like(p, 2, 'You respected my privacy.');
        return say('c2.result');
      } },
    ] }); } },
  { id: 'debt', sample: { secret: 'debt' }, weight: 3, when: p => p.secret === 'debt', make: (p, m) => { const say = paxSay('debt', p, m); return ({
    title: say('title'),
    text: say('text'),
    choices: [
      { label: say('c0.label'), ...gated(needCr(1500)), run() {
        G.state.credits -= 1500;
        p.owes = 1500;
        like(p, 5, 'You paid off my debt. I will pay you back.');
        return say('c0.result');
      } },
      { label: say('c1.label'), run() {
        like(p, 1, 'You stood up to my collectors.');
        return say('c1.result');
      } },
    ] }); } },
  { id: 'job', sample: { goal: 'job' }, weight: 2, when: p => p.goal === 'job', make: (p, m) => { const say = paxSay('job', p, m); return ({
    title: say('title'),
    text: say('text'),
    choices: [
      { role: 'pilot', label: say('c0.label'), run() {
        m.bonus += 800;
        like(p, 3, 'You got me to my interview on time.');
        return say('c0.result');
      } },
      { label: say('c1.label'), ...gated(needMass(40)), run() {
        G.state.fuel -= 40;
        m.bonus += 800;
        like(p, 3, 'You got me to my interview on time.');
        return say('c1.result');
      } },
      { label: say('c2.label'), run() {
        like(p, -1, 'You would not hurry for my interview.');
        return say('c2.result');
      } },
    ] }); } },
  { id: 'research', sample: { goal: 'research' }, weight: 2, when: p => p.goal === 'research', make: (p, m) => { const say = paxSay('research', p, m); return ({
    title: say('title'),
    text: say('text'),
    choices: [
      { label: say('c0.label'), run() {
        delay(20);
        m.bonus += 1000 * p.wealth;
        like(p, 3, 'You made a detour for my research.');
        return say('c0.result');
      } },
      { label: say('c1.label'), run() {
        like(p, -1, 'You would not stop for my research.');
        return say('c1.result');
      } },
    ] }); } },
  { id: 'pilgrim', sample: { goal: 'pilgrim' }, weight: 2, when: p => p.goal === 'pilgrim' || p.traits.includes('pious'), make: (p, m) => { const say = paxSay('pilgrim', p, m); return ({
    title: say('title'),
    text: say('text'),
    choices: [
      { label: say('c0.label'), run() {
        delay(12);
        m.bonus += 400 * m.pax;
        like(p, 3, 'You stilled your ship for our prayers.');
        return say('c0.result');
      } },
      { label: say('c1.label'), run() {
        like(p, -1, null);
        return say('c1.result');
      } },
    ] }); } },
  { id: 'talkative', sample: { traits: ['talkative'] }, weight: 1, when: p => p.traits.includes('talkative') || p.traits.includes('homesick'), make: (p, m) => { const say = paxSay('talkative', p, m); return ({
    title: say('title'),
    text: say('text'),
    choices: [
      { label: say('c0.label'), run() {
        like(p, 1, 'You listened to my stories.');
        return say('c0.result', { rumor: addRumor() });
      } },
      { label: say('c1.label'), run() {
        like(p, -1, null);
        return say('c1.result');
      } },
    ] }); } },
  { id: 'nervous', sample: { traits: ['nervous'] }, weight: 1, when: p => p.traits.includes('nervous'), make: (p, m) => { const say = paxSay('nervous', p, m); return ({
    title: say('title'),
    text: say('text'),
    choices: [
      { label: say('c0.label'), run() {
        like(p, 2, 'You talked me through a panic attack.');
        return say('c0.result');
      } },
      { label: say('c1.label'), ...gated(needCr(200)), run() {
        G.state.credits -= 200;
        like(p, 1, null);
        return say('c1.result');
      } },
      { label: say('c2.label'), run() {
        m.bonus -= 300;
        like(p, -2, 'You mocked me when I was scared.');
        return say('c2.result');
      } },
    ] }); } },
  { id: 'curious', sample: { traits: ['curious'] }, weight: 1, when: p => p.traits.includes('curious'), make: (p, m) => { const say = paxSay('curious', p, m); return ({
    title: say('title'),
    text: say('text'),
    choices: [
      { label: say('c0.label'), run() {
        like(p, 2, 'You showed me the drive room.');
        if (Math.random() < 0.25) {
          G.state.fuel = Math.max(0, G.state.fuel - 20);
          return say('c0.spill');
        }
        return say('c0.fine');
      } },
      { label: say('c1.label'), run() {
        like(p, -1, null);
        return say('c1.result');
      } },
    ] }); } },
  { id: 'drunk', sample: { traits: ['drunk'] }, weight: 1, when: p => p.traits.includes('drunk'), make: (p, m) => { const say = paxSay('drunk', p, m); return ({
    title: say('title'),
    text: say('text'),
    choices: [
      { label: say('c0.label'), run() {
        m.bonus += 400;
        like(p, -2, 'You charged me for the recycler.');
        return say('c0.result');
      } },
      { label: say('c1.label'), run() {
        G.state.credits = Math.max(0, G.state.credits - 400);
        like(p, 2, 'You let the recycler thing slide.');
        return say('c1.result');
      } },
    ] }); } },
  { id: 'greedy', sample: { traits: ['greedy'] }, weight: 1, when: p => p.traits.includes('greedy'), make: (p, m) => { const say = paxSay('greedy', p, m); return ({
    title: say('title'),
    text: say('text'),
    choices: [
      { label: say('c0.label'), ...gated(needCr(500)), run() {
        if (Math.random() < 0.5) { G.state.credits += 500; like(p, -1, 'You beat me at cards.'); return say('c0.win'); }
        G.state.credits -= 500;
        like(p, 1, null);
        return say('c0.lose');
      } },
      { label: say('c1.label'), run: () => say('c1.result') },
    ] }); } },
  { id: 'generous', sample: { traits: ['generous'] }, weight: 1, when: p => p.traits.includes('generous') || p.traits.includes('kind'), make: (p, m) => { const say = paxSay('generous', p, m); return ({
    title: say('title'),
    text: say('text'),
    choices: [
      { label: say('c0.label'), run() {
        m.bonus += 300 * p.wealth;
        like(p, 1, null);
        return say('c0.result');
      } },
      { label: say('c1.label'), run() {
        like(p, 3, 'You would not take my money.');
        return say('c1.result');
      } },
    ] }); } },
  { id: 'rude', sample: { traits: ['rude'] }, weight: 1, when: p => p.traits.includes('rude'), make: (p, m) => { const say = paxSay('rude', p, m); return ({
    title: say('title'),
    text: say('text'),
    choices: [
      { label: say('c0.label'), run() { like(p, 1, null); return say('c0.result'); } },
      { label: say('c1.label'), run() {
        m.bonus -= 300;
        like(p, -2, 'You put me in my place.');
        return say('c1.result');
      } },
    ] }); } },
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
  greedy: c => ({ title: `${c.first} Wants a Raise`, text: (`${c.first} finds you at the end of a long shift with a printed sheet and folded arms. ` +
      `The sheet lists what crew with their skills earn on other ships, what a ship of your size can afford, and what ${c.first} has done for you ` +
      `lately. The last line says: "I am worth it."`),
    choices: [
      { label: `Give them 25% more (${fmt(c.wage * 1.25)} cr/day)`, run() { c.wage = Math.round(c.wage * 1.25); like(c, 3, 'You gave me a raise.'); return `${c.first} hums through the rest of the week and calls you "boss". Unasked, they tidy the corner of the cockpit.`; } },
      { label: 'No', run() { like(c, -2, 'You refused me a raise.'); return `${c.first} goes back to work. For the next few days they do exactly what is asked and nothing more, and their tools are always where they were left. They have stopped smiling.`; } },
    ] }),
  drunk: c => ({ title: 'Galley Brawl', text: (`${c.first} got drunk on something they had been keeping in a pipe, and had an argument with the ` +
      `galley bulkhead. The bulkhead won. There is a dent the size of a fist in the wall, blood on the deck, and ${c.first} on the floor with ` +
      `a cloth pressed to their forehead. The medical supplies cost 300 cr.`),
    choices: [
      { label: 'Dock their pay', run() { like(c, -2, 'You docked my pay.'); return `${c.first} spends the week in a corner of the engine room with their back to the ship, and does the work in silence.`; } },
      { label: 'Pay for it and let it go (300 cr)', run() { G.state.credits = Math.max(0, G.state.credits - 300); like(c, 2, 'You let the brawl go.'); return (
          `${c.first} stares at the floor, then swears off drink. For now. They take the next three galley shifts. You find them scrubbing the ` +
          `bulkhead, and they do not look up. The dent is polished.`); } },
    ] }),
  homesick: c => ({ title: 'Homesick', text: `${c.first} has been quiet for days. At mealtimes they push their food around. At night you have seen them at the viewport, looking at a point of light. They have not said they miss ${c.home}.`,
    choices: [
      { label: 'Give them a 500 cr bonus to call home', ...gated(needCr(500)), run() { G.state.credits -= 500; like(c, 3, 'You paid for my call home.'); return (
          `${c.first} takes an hour on a lagged call home, in a quiet corner of the ship, with a hand over their mouth. They come back with red eyes ` +
          `and laugh once. They do not say what was said. For the rest of the week they hum in the corridors, and nobody mentions it.`); } },
      { label: 'Share a drink and listen', run() { like(c, 1, null); return (`You pour two cups of something strong and sit on a crate beside them. ` +
          `For an hour they talk about ${c.home}: the weather, the food, the quiet places. You say almost nothing. When they go to bed, ` +
          `they put a hand on your shoulder on the way out.`); } },
      { label: '"We all miss somewhere."', run() { like(c, -1, null); return `${c.first} goes back to work. That night you see them at the viewport again, alone, and you leave them to it.`; } },
    ] }),
  nervous: c => ({ title: 'Bad Dreams', text: (`${c.first} has not been sleeping. There are shadows under their eyes, they drop small tools, ` +
      `and they jump at every clank of the hull. When you ask, they tell you in a flat voice: nightmares about hull breaches, the same one every ` +
      `night. The thin bright line of a crack, spreading. The sudden silence. The cold.`),
    choices: [
      { label: 'Talk them through it', run() { like(c, 2, 'You helped me through the nightmares.'); return (`You sit with them in the galley at three ` +
          `in the morning with a pot of tea between you, and talk about nothing in particular. ${c.first} sleeps through the night for the first time ` +
          `in a week. In the morning they bring you a cup of coffee and spill half of it.`); } },
      { label: 'Tell them to toughen up', run() { like(c, -2, 'You told me to toughen up.'); return `${c.first} flinches, and stops mentioning it. In the days after, the shadows under their eyes get darker. They check the seals on every hatch they pass.`; } },
    ] }),
  talkative: c => ({ title: 'Gossip', text: `${c.first} has been on the open band with half the ships in comm range, chatting. They know the name of the freighter captain's dog. They know who is feuding with whom at the next port. They lean in at your cabin door with news.`,
    choices: [{ label: 'What have you heard?', run() { like(c, 1, null); return `${c.first} sits down and gives you an hour of gossip: names, debts, who left whom at which port. In the middle of it is one thing you can use: "${addRumor()}" Then ${c.first} moves on to the next thing.`; } }] }),
  secretive: c => ({ title: 'Locked Locker', text: (`${c.first}'s locker has two locks, one you do not recognize and a cheap padlock over it. They ` +
      `have been receiving messages with no sender ID, short ones, at odd hours. They read them, delete them, and read them again. When you come into ` +
      `the room, they flinch.`),
    choices: [
      { label: 'Ask about it', run() { like(c, -2, 'You pried into my locker.'); return `${c.first} looks at you. "Family business," ${c.first} says. That is all you get. Afterward ${c.first} takes meals in the bunk and locks the door to sleep.`; } },
      { label: 'Respect their privacy', run() { like(c, 2, 'You respected my privacy.'); return `You say nothing and turn to go. Behind you their shoulders come down. That evening ${c.first} brings you a cup of tea you did not ask for, stands in the doorway, and goes.`; } },
    ] }),
  curious: c => ({ title: 'Tinkering', text: `${c.first} has the reaction mass pumps in pieces on newspaper in the middle of the engine room, "to see how they work". Every bolt is in a row. Three manuals are open, and there is a cup of cold tea. Nobody asked them to.`,
    choices: [
      { label: 'Let them experiment', run() {
        like(c, 2, 'You let me tinker.');
        if (Math.random() < 0.6) { G.state.fuel = Math.min(ship().fuel, G.state.fuel + 25); return `They find a leak nobody knew about, a hairline crack in an old fitting that has been weeping mass for months, and seal it with a strip of foil. You recover 25 units of reaction mass. From then on the pumps run quiet, and ${c.first} hums while they work.`; }
        G.state.fuel = Math.max(0, G.state.fuel - 20);
        return `Something goes pop. A thin jet of reaction mass hisses out of the open housing before you can shut it, and you lose 20 units. ${c.first} looks at the empty housing. "Ah," ${c.first} says.`;
      } },
      { label: 'Put it back together. Now.', run() { like(c, -1, null); return `They reassemble every part, muttering, and the pumps run as before. ${c.first} tightens the last bolt without looking at you.`; } },
    ] }),
  pious: c => ({ title: 'Quiet Prayer', text: (`${c.first} finds you in the galley at the turn of the watch with a worn charm in one hand and asks ` +
      `you to join a short prayer for safe passage. They say it every burn, alone, in a corner, but tonight they wanted company. It will take a few ` +
      `minutes. They say you may stay silent.`),
    choices: [
      { label: 'Join them', run() { like(c, 2, 'You prayed with me.'); return `You kneel beside them in the dim light. For a few minutes nobody speaks. The drive hums. A pipe ticks. When it ends, you both sit a moment. "Thank you," ${c.first} says.`; } },
      { label: 'Politely decline', run() { like(c, 0, null); return `${c.first} goes to their corner. Through the thin wall you hear the low murmur of their prayer. ${c.first} prays for you anyway. You listen until it stops.`; } },
    ] }),
  rude: c => ({ title: 'Friction', text: `${c.first} has been needling the rest of the crew for days: a jab at breakfast, a remark in the corridor, a sneer at how someone hums. Tonight in the galley it is the humming again. A chair scrapes. "Say that again," says a level voice. "I said it was flat," ${c.first} says. "I did not say it was your fault. I said it was flat." "Say that again." There is going to be a fight.`,
    choices: [
      { label: 'Reprimand them', run() { like(c, -2, 'You reprimanded me in front of everyone.'); return (`You step between them. "Sit," you say. "Both of you." ` +
          `The room goes still. "You do not talk about a shipmate's humming at my table," you say to ${c.first}, "or anywhere I can hear it." ${c.first} goes red, then pale, and leaves. For days ${c.first} eats alone.`); } },
      { label: 'Let them sort it out', run() { like(c, 1, null); return (`You lean in the doorway with your arms folded and let them. It is short, ` +
          `loud and untidy, and involves a soup pot. ${hurt(0.03)} points of hull damage later they are sitting side by side on the deck, breathing ` +
          `hard, sharing a cloth for a bloody lip. "It was flat," ${c.first} says. "It was flat," says the other, and they both laugh.`); } },
    ] }),
  kind: c => ({ title: 'Small Kindnesses', text: (`${c.first} spent the night fixing everyone's bunk lights, one by one, with a screwdriver, ` +
      `and in the small hours cooked a real meal from the last of the good stores. Nobody asked them to. In the ` +
      `morning every bunk had a light that worked, and every plate was full.`),
    choices: [{ label: 'Thank them', run() { like(c, 1, null); return `You find ${c.first} in the galley washing the last of the pots. You thank them. They wave it off and make a joke of it, and their ears go pink. For the rest of the trip nobody snaps at the table.`; } }] }),
  generous: c => ({ title: 'Shared Bottle', text: (`${c.first} comes into the galley at the end of a long shift with a dusty bottle wrapped in a ` +
      `shirt. They have carried it in the bottom of their bag since they left ${c.home}. They set it on the table and take down every cup in the ` +
      `cupboard. "I was saving it for a special occasion," they say. "But I think we are the occasion."`),
    choices: [{ label: 'Raise a glass', run() { like(c, 1, 'We shared a bottle.'); return (`You raise a glass, and so does everyone else, in a ring ` +
        `around the table. The bottle tastes of ${c.home}: sweet, smoky, with something bitter under it. To the ship. To the crew. To not dying. Somebody laughs, ` +
        `then everyone does, and the bottle goes round twice before it is empty.`); } }] }),
  brave: c => ({ title: 'Volunteer', text: (`A sensor mast has come loose in the burn and hangs by one strut, banging against the hull with every ` +
      `pulse of the drive. It will tear free sooner or later and take plating with it. Before you can speak, ${c.first} has the suit half on. "I will ` +
      `go, captain," they say, buckling a strap. "It is a ten-minute job. I have done worse."`),
    choices: [
      { label: 'Let them go', run() { like(c, 1, null); return Math.random() < 0.85 ? (`${c.first} goes out through the lock with a tether and a bag ` +
          `of tools. For twenty minutes they are a bright shape against the stars, working along the hull. Then they are back inside, helmet ` +
          `off, sweating, grinning, holding the bent strut.`) : (
          `A tether snaps. For one second ${c.first} drifts, arms out, into the black, until a gloved hand catches a handhold and holds. They make it ` +
          `back, shaking and gasping. The ship takes ${hurt(0.05)} points of damage from the loose mast, and nobody sleeps that night.`); } },
      { label: 'Go yourself', run() { like(c, 2, 'You took the risky EVA yourself.'); return (`You go out through the lock yourself, with the tether ` +
          `at your belt, and fix it in the cold and the silence with the ship turning slowly below your boots. It takes forty minutes. ${c.first} ` +
          `watched through the port, and when you come in ${c.first} hands you a cup and says nothing.`); } },
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
