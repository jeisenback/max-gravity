'use strict';

// The ship as home, and the crew as family. Procedural crew (and passengers you know)
// have a personal story you learn by sitting with them in downtime, ending, for crew,
// in a favor that makes them loyal. Birthdays and holidays from home fall on real
// dates during burns. Letters from home reach crew at ports and change their mood,
// for better or worse (a low mood costs a skill level until it lifts). The crew
// propose traditions that repeat every burn, add their own touches to the ship, and
// might adopt a cat. You name the ship, and it keeps a history (st.home). Passengers
// who loved the trip may ask to stay aboard as crew. Loaded before game.js; only
// calls into it at runtime.

// ---------- the ship ----------
function home() {
  const st = G.state;
  if (!st.home) st.home = { name: 'Second Chance', named: st.day, traditions: [], proposed: [], touches: [], cat: null, log: [], burns: 0 };
  return st.home;
}
const shipTitle = () => `the ${home().name}`;
function homeLog(text) {
  const h = home();
  h.log.unshift({ day: G.state.day, text });
  h.log.length = Math.min(h.log.length, 30);
}
const crewPeople = () => G.state.crew.map(id => ({ id, p: person(id) }));
const procedural = () => crewPeople().filter(f => G.state.people[f.id]);
const moodLow = p => !!(p && p.mood && p.mood.kind === 'low' && p.mood.until > G.state.day);
const moodHigh = p => !!(p && p.mood && p.mood.kind === 'high' && p.mood.until > G.state.day);

// ---------- personal stories ----------
const LEFT = ['a mine closure that emptied half the town', 'a marriage that ended badly', 'a debt to the wrong people', 'wanting to see a sky that wasn\'t painted on a dome', 'a sister who went first and wrote home about it', 'an accident at work they still blame themselves for', 'the rationing, and being tired of being thirsty', 'a scholarship that fell through at the last minute'];
const RELATIONS = ['mother', 'father', 'sister', 'brother', 'grandmother', 'daughter', 'son', 'best friend', 'old crew chief'];
const HOPES = ['a berth on a ship of their own someday', 'to see one of Earth\'s oceans, just once', 'to open a noodle stand somewhere with real gravity', 'to get their family off {home}', 'to finish the engineering license they started years ago', 'to be somewhere long enough to grow something', 'to find out what happened to their father\'s old ship'];
const HOME_DETAIL = {
  belt: 'the hum of the recyclers, the tunnel markets, spin gravity you could argue with',
  mars: 'dust storms that last a month, dome lights at dusk, everyone arguing about the future',
  earth: 'too many people, real rain, and an ocean you could hear from the arcology at night',
};
const cultureOfPerson = p => p.culture || HOME_CULTURE[p.home] || 'earth';

function storyOf(p) {
  if (!p.story) {
    const rel = pick(RELATIONS), who = makePerson(cultureOfPerson(p));
    p.story = { left: pick(LEFT), rel, name: who.first, hope: pick(HOPES).replace('{home}', p.home), favor: planetNamed(p.home) ? 'visit' : 'debt', debt: randInt(8, 25) * 100, beat: 0 };
  }
  return p.story;
}
const missed = p => `${storyOf(p).rel} ${storyOf(p).name}`;

function sitBeat(p, isCrew) {
  const s = storyOf(p), st = G.state, n = p.first;
  const talk = (label, likeBy, extra) => ({ label, run() { like(p, likeBy, null); s.beat++; if (extra) extra(); return `${n} ${pick(['smiles, a little', 'nods slowly', 'goes quiet for a moment, then keeps talking', 'laughs, surprised at themselves'])}.`; } });
  if (s.beat > (p.opinion + 1) && s.beat < 4) {
    return { title: `With ${n}`, text: `You sit with ${n} for a while. They talk about the ship, the food, the next port. Not about themselves, not yet.`,
      choices: [{ label: 'That\'s all right', run() { like(p, 1, null); return 'Some people take longer. That is all right too.'; } }] };
  }
  if (s.beat === 0) return { title: `With ${n}`, text: `${n} tells you about ${p.home}: ${HOME_DETAIL[cultureOfPerson(p)]}. They left because of ${s.left}.`,
    choices: [talk('Listen', 1), talk('Tell them about where you came from', 2)] };
  if (s.beat === 1) return { title: `With ${n}`, text: `${n} shows you a picture: their ${missed(p)}. "We used to talk every day. Now it is a message every few weeks, with a lag." They look at it a long time before putting it away.`,
    choices: [talk('"Tell me about them."', 1), talk('"You\'ll see them again."', 1)] };
  if (s.beat === 2) return { title: `With ${n}`, text: `Late in the watch, ${n} admits what they really want: ${s.hope}. They laugh at themselves as soon as they say it.`,
    choices: [talk('"It\'s not a stupid thing to want."', 1), talk('"If I can help, I will."', 2, () => { s.promised = true; })] };
  if (s.beat === 3 && isCrew) {
    if (s.favor === 'visit') {
      const where = planetNamed(p.home);
      return { title: `A Favor`, text: `"Could we put in at ${p.home} sometime? I want to see my ${missed(p)} while I still can. I'd work the whole trip for nothing."`,
        choices: [
          { label: '"We\'ll go."', run() {
            st.missions.push({ id: st.nextId++, type: 'favor', favorPid: p.id, good: 'a promise', tons: 0, destSystem: where.sid, destPlanet: p.home,
              title: `Take ${n} home to ${p.home} to see their ${s.rel}`, pay: 0, deadline: st.day + 150 });
            s.beat = 4;
            like(p, 2, 'The captain promised to take me home.');
            return `${n} doesn't say anything. They don't need to. (It's on your missions list.)`;
          } },
          { label: '"Not yet. But soon."', run: () => `${n} nods. "Soon, then."` },
        ] };
    }
    return { title: 'A Favor', text: `"I owe ${fmt(s.debt)} cr to people on ${p.home}. It's the real reason I left. They send messages. I don't open them anymore."`,
      choices: [
        { label: `Pay it off (${fmt(s.debt)} cr)`, can: () => st.credits >= s.debt, run() {
          st.credits -= s.debt;
          s.beat = 4;
          becomeLoyal(p, 'The captain paid off my debt.');
          return `${n} reads the confirmation three times. Then they go to their bunk, and you hear them crying, and then laughing.`;
        } },
        { label: '"I can\'t, not now."', run: () => `"I know. I didn't expect you to." ${n} means it.` },
      ] };
  }
  return { title: `With ${n}`, text: `You sit with ${n} and neither of you needs to say much. ${moodLow(p) ? 'They are still carrying the news from home, but it is lighter with company.' : 'It is a good, quiet hour.'}`,
    choices: [{ label: 'Stay a while', run() { like(p, 1, null); if (p.mood && p.mood.kind === 'low') p.mood.until -= 5; return 'The ship hums around you both.'; } }] };
}

function becomeLoyal(p, memory) {
  p.loyal = true;
  like(p, 5, memory);
  homeLog(`${p.first} ${p.last} will follow ${shipTitle()} anywhere now.`);
}

function sitPicker() {
  const aboard = [...procedural(), ...paxAboard().filter(m => m.pid && G.state.people[m.pid]).map(m => ({ id: m.pid, p: G.state.people[m.pid], pax: true }))];
  return {
    title: 'Sit With Someone', text: 'You make two mugs of coffee. Who could use the company?',
    choices: aboard.map(f => ({
      label: `${f.p.first} (${f.pax ? 'passenger' : ROLE_NAMES[f.p.role].toLowerCase()})${moodLow(f.p) ? ', having a hard time' : ''}`,
      run() { G.nextEvent = sitBeat(f.p, !f.pax); return `You find ${f.p.first} in the galley.`; },
    })),
  };
}

// ---------- birthdays and holidays ----------
const calOf = day => { const d = new Date(START_DATE + (day - 1) * 864e5); return { m: d.getUTCMonth() + 1, d: d.getUTCDate(), y: d.getUTCFullYear() }; };
const birthday = id => { const d = new Date(Date.UTC(2214, 0, 1 + (Math.abs(hash(id + 'bday')) % 365))); return { m: d.getUTCMonth() + 1, d: d.getUTCDate() }; };
const HOLIDAYS = [
  { m: 3, d: 12, name: 'Landing Day', culture: 'mars', text: '{n} is baking red bread for Landing Day, when the first colonists set down on Mars, and is already arguing with nobody in particular about the terraforming schedule.', join: 'The bread is dense and far too spicy. The argument lasts until the flip, and everyone has a side.' },
  { m: 7, d: 20, name: 'Tranquility Night', culture: 'earth', text: '{n} has the old footage of the first Moon landing queued up. On Earth and Luna everyone watches it tonight, even though they have all seen it a hundred times.', join: 'Two people in bulky suits bounce across grey dust, centuries ago. Nobody on the ship says anything for a while.' },
  { m: 8, d: 2, name: 'First Water', culture: 'belt', text: 'It is First Water, the day the first ice reached Ceres. {n} fills a cup from the ship\'s tank and passes it around: each person drinks, and says the name of someone they have lost.', join: 'The cup goes around twice. Some of the names you know. Most you don\'t.' },
  { m: 12, d: 31, name: 'Year\'s End', culture: null, text: 'It is the last night of {year}. {n} has strung lights across the galley and is counting down to a midnight that means nothing out here, and everything.', join: 'Everyone counts down together. At zero, somebody cries, somebody laughs, and the ship hums on.' },
];

// What falls on the days of this burn.
function planOccasions() {
  const t = G.transit, st = G.state, crew = crewPeople(), out = [];
  for (let k = 1; k <= t.days; k++) {
    const day = st.day + k, c = calOf(day);
    for (const f of crew) { const b = birthday(f.id); if (b.m === c.m && b.d === c.d) out.push({ kind: 'birthday', id: f.id, day }); }
    for (const h of HOLIDAYS) {
      if (h.m !== c.m || h.d !== c.d) continue;
      const who = crew.find(f => !h.culture || cultureOfPerson(f.p) === h.culture);
      if (who) out.push({ kind: 'holiday', h, id: who.id, day, year: c.y });
    }
  }
  t.occasions = out.map(o => ({ ...o, at: (o.day - st.day - 0.5) / t.days }));
}

function occasionEvent(o) {
  const p = person(o.id), n = p.first, st = G.state;
  const all = () => folk();
  const warm = (x, text) => () => { for (const [a, b] of pairs(all())) addBond(a, b, x); return text; };
  if (o.kind === 'birthday') {
    return {
      title: `${n}'s Birthday`, text: `It is ${dateOf(o.day)}, and it is ${n}'s birthday. ${pick([`${n} hasn't mentioned it.`, `${n} mentioned it once, weeks ago, and is pretending not to hope anyone remembered.`, `${n} says birthdays are for dirtsiders.`])}`,
      choices: [
        { label: 'Throw a party in the galley', run() { like(p, 2, `The crew threw me a birthday party aboard ${shipTitle()}.`); homeLog(`A birthday party for ${n}.`); return warm(1, `Somebody makes a cake out of ration bars and a candle out of a welding stub. ${n} laughs until they cry.`)(); } },
        { label: 'Give them something from the cargo (1t luxury goods)', can: () => (st.cargo.luxury || 0) >= 1, run() {
          st.cargo.luxury -= 1;
          like(p, 3, 'The captain remembered my birthday.');
          return `${n} unwraps it slowly, and keeps it on the shelf by their bunk for the rest of the trip.`;
        } },
        { label: 'A quiet word and a drink', run() { like(p, 1, null); return `"You remembered." ${n} looks pleased and embarrassed in equal measure.`; } },
      ],
    };
  }
  const h = o.h;
  return {
    title: h.name, text: h.text.replace('{n}', n).replace('{year}', o.year),
    choices: [
      { label: 'Everyone joins in', run() { like(p, 2, `We kept ${h.name} aboard ${shipTitle()}.`); homeLog(`Kept ${h.name} aboard.`); return warm(1.2, h.join)(); } },
      { label: `Let ${n} mark it their own way`, run: () => `${n} marks it quietly in their bunk. You hear music through the bulkhead.` },
    ],
  };
}

// ---------- letters from home ----------
const GOOD_NEWS = ['{who} got into the engineering academy on Ceres', '{who} had a baby, a girl, healthy and loud', '{who} finally paid off the family\'s water debt', '{who} sent a photo of the whole family at one table, laughing'];
const BAD_NEWS = ['{who} is sick, and the clinic on {home} wants money up front', '{who} lost their job when the mine cut shifts', 'the section where {who} lives is on emergency rationing', '{who} has stopped answering messages, and nobody at home will say why'];

function letters(planet) {
  const st = G.state, notes = [];
  for (const f of procedural()) {
    const p = f.p;
    if (Math.random() > 0.2 || (p.letterDay || -99) > st.day - 12) continue;
    p.letterDay = st.day;
    const good = Math.random() < 0.55;
    const text = pick(good ? GOOD_NEWS : BAD_NEWS).replace('{who}', `their ${missed(p)}`).replace('{home}', p.home);
    p.mood = { kind: good ? 'high' : 'low', until: st.day + (good ? 10 : 25), text };
    p.news = { good, text };
    notes.push(`A message for ${p.first} at ${planet.name}: ${text}.`);
  }
  return notes;
}

function newsEvent(p) {
  const n = p.first, st = G.state, news = p.news;
  p.news = null;
  if (news.good) {
    return { title: 'Good News', text: `${n} comes into the galley waving their terminal: ${news.text}. They can't stop grinning.`,
      choices: [
        { label: 'Break out something to celebrate', run() { for (const [a, b] of pairs(folk())) addBond(a, b, 0.8); like(p, 1, null); return 'The whole ship ends up in the galley. Good news travels fast in a small space.'; } },
        { label: '"That\'s wonderful."', run() { like(p, 1, null); return `${n} shows you the picture twice.`; } },
      ] };
  }
  const others = procedural().filter(f => f.p !== p && bond(f, { id: p.id }) >= 1);
  const choices = [
    { label: 'Sit with them', run() { like(p, 2, 'The captain sat with me when the news from home was bad.'); p.mood.until -= 10; return `You don't fix anything. You just stay. After a while, ${n} starts talking, and that helps.`; } },
    { label: 'Advance them 500 cr to send home', can: () => st.credits >= 500, run() { st.credits -= 500; like(p, 3, 'The captain advanced me money to send home.'); p.mood.until = st.day; return `${n} sends it at the next relay. The reply takes two days, and when it comes, they read it out loud to everyone.`; } },
  ];
  if (others.length) {
    const o = pick(others);
    choices.push({ label: `Ask ${o.p.first} to look in on them`, run() { addBond(o, { id: p.id, p }, 2); like(p, 1, null); p.mood.until -= 5; return `${o.p.first} takes ${n} a mug of something hot and doesn't leave for two hours.`; } });
  }
  choices.push({ label: 'Give them space', run: () => `${n} keeps to their bunk. Their work suffers for a while. (Their skill counts one lower until they feel better.)` });
  return { title: 'Bad News', text: `${n} has been quiet since the last port. The message was from their ${missed(p)}: ${news.text}.`, choices };
}

// ---------- traditions ----------
const BURN_NAMES = ['The Long Sulk', 'Operation Soup', 'Tuesday Forever', 'Nobody Touch Anything', 'The Great Coffee Shortage', 'Probably Fine', 'Second Breakfast', 'Hold My Drink'];
const TRADITIONS = {
  'flip-toast': { name: 'the flip toast', moment: 'flip', propose: '{n} raises a bulb of something strong as the ship turns end over end: "To the flip. Halfway to somewhere." Everyone looks at you.',
    line: () => '[Ship] The flip toast: "Halfway to somewhere." Everyone drinks.' },
  'first-meal': { name: 'first-night noodles', moment: 'start', propose: '{n} cooks for everyone on the first night out. "Tradition," they say. "Starting now."',
    line: () => '[Ship] First night out, and the galley smells of noodles. Tradition.' },
  'burn-name': { name: 'naming the burn', moment: 'start', propose: '{n} says every burn deserves a name, and proposes calling this one "{b}".',
    line: () => `[Ship] By unanimous vote, this burn is called "${pick(BURN_NAMES)}".` },
  'docking-song': { name: 'the docking song', moment: 'end', propose: '{n} starts singing an old work song from {home} on final approach. By the second verse, someone is harmonizing.',
    line: () => '[Ship] Final approach, and everyone is singing the docking song, badly and with feeling.' },
};

function traditionEvent() {
  const h = home(), crew = procedural().length ? procedural() : crewPeople();
  const id = Object.keys(TRADITIONS).find(k => !h.proposed.includes(k));
  if (!id || !crew.length) return null;
  h.proposed.push(id);
  const T = TRADITIONS[id], f = pick(crew);
  return {
    title: 'A New Tradition', text: T.propose.replace('{n}', f.p.first).replace('{home}', f.p.home).replace('{b}', pick(BURN_NAMES)),
    choices: [
      { label: 'Make it a tradition', run() { h.traditions.push(id); homeLog(`Started ${T.name}.`); for (const [a, b] of pairs(folk())) addBond(a, b, 1); like(f.p, 1, null); return `It sticks. From now on, ${T.name} is part of life aboard ${shipTitle()}.`; } },
      { label: 'Just this once', run: () => 'It\'s a good moment. It doesn\'t have to be more than that.' },
    ],
  };
}

function traditionMoment(moment) {
  for (const id of home().traditions) {
    const T = TRADITIONS[id];
    if (T.moment !== moment) continue;
    comm(T.line());
    for (const [a, b] of pairs(folk())) addBond(a, b, 0.3);
  }
}

// ---------- touches, and the cat ----------
const TOUCHES = [
  f => `${f.p.first} hung a ${tastes(f).team} pennant in the galley`,
  f => `${f.p.first} is growing basil in a ration tin on the galley shelf`,
  f => `${f.p.first} painted a small ${f.p.home} skyline on their bunk panel`,
  f => `${f.p.first} rigged fairy lights along the berth corridor`,
  f => `${f.p.first} put up a picture of their ${missed(f.p)} by the coffee maker`,
  f => `${f.p.first} keeps a battered copy of "${culture().book.title}" in the galley for anyone to borrow`,
];
function addTouches() {
  const h = home();
  for (const f of procedural()) {
    if (f.p.touched || Math.random() > 0.2) continue;
    f.p.touched = true;
    const text = pick(TOUCHES)(f);
    h.touches.push(text);
    comm(`[Ship] ${text}.`);
  }
}
const CAT_NAMES = ['Rivet', 'Biscuit', 'Admiral', 'Dust', 'Pumpkin', 'Lug Nut', 'Orbit', 'Nine', 'Captain Whiskers'];
function catEvent() {
  const h = home(), crew = crewPeople();
  const names = [...CAT_NAMES].sort(() => Math.random() - 0.5).slice(0, 3);
  const voters = names.map((nm, i) => (crew[i] ? crew[i].p.first : 'You'));
  return {
    title: 'Stowaway', text: `There is a cat in the cargo lock: skinny, grey, one torn ear, and completely unimpressed by you. It has clearly decided this is its ship now.`,
    choices: [
      ...names.map((nm, i) => ({ label: `"${nm}," suggests ${voters[i]}`, run() {
        h.cat = nm;
        homeLog(`${nm} the cat came aboard at ${G.state.planet}.`);
        for (const f of crewPeople()) like(f.p, 1, null);
        return `${nm} it is. By the time you take off, ${nm} has found the warmest spot on the ship, which is on the reactor housing.`;
      } })),
      { label: 'Put it back on the dock', run: () => 'The cat gives you a look you will remember for a long time, and walks off.' },
    ],
  };
}

// ---------- passengers who want to stay ----------
function jobRole(job) {
  const j = (job || '').toLowerCase();
  if (/nurse|medic|doctor/.test(j)) return 'medic';
  if (/engineer|tech|welder|rigger|architect|chemist/.test(j)) return 'engineer';
  if (/accountant|sales|assayer|adjuster|dockworker|lawyer/.test(j)) return 'quartermaster';
  if (/navy|miner|salvager/.test(j)) return 'gunner';
  if (/software|journalist|auditor|modeler/.test(j)) return 'slicer';
  return pick(Object.keys(ROLE_NAMES));
}
function joinEvent(p) {
  const role = p.role || jobRole(p.job), st = G.state;
  return {
    title: 'One More Berth', text: `${p.first} ${p.last} lingers at the airlock with their bag. "I've been thinking. I don't really have anywhere I need to be. Could ${shipTitle()} use a ${ROLE_NAMES[role].toLowerCase()}?"`,
    choices: [
      { label: 'Welcome aboard', can: () => berthsFree() > 0, run() {
        Object.assign(p, { role, skill: randInt(1, 2), location: null });
        p.wage = Math.round(ROLE_WAGE[role] * (0.6 + 0.3 * p.skill));
        st.crew.push(p.id);
        like(p, 2, `I signed on with ${shipTitle()}.`);
        homeLog(`${p.first} ${p.last} came aboard as a passenger and stayed as crew.`);
        return `${p.first} drops their bag in the same bunk as before. "Same one. It's lucky." (They join as your ${ROLE_NAMES[role].toLowerCase()}.)`;
      } },
      { label: '"Not this time."', run: () => `"I understand. If you ever need someone..." ${p.first} leaves you their contact code.` },
    ],
  };
}

// ---------- port pages ----------
function homeHtml() {
  const h = home(), st = G.state;
  const crew = crewPeople().map(({ p }) => {
    const bits = [];
    if (p.loyal) bits.push('loyal');
    if (moodLow(p)) bits.push('having a hard time');
    else if (moodHigh(p)) bits.push('in high spirits');
    if (p.story && p.story.beat >= 3 && p.story.beat < 4) bits.push('has a favor to ask');
    return bits.length ? `<div class="hint">${p.first}: ${bits.join(', ')}</div>` : '';
  }).join('');
  return `<h3>${h.name[0].toUpperCase()}${h.name.slice(1)}</h3>
    <div class="row"><input type="text" id="shipName" maxlength="30" placeholder="A new name for the ship"><button data-action="renameShip">Rename the ship</button></div>
    ${crew}
    ${h.traditions.length ? `<p class="hint">Traditions: ${h.traditions.map(id => TRADITIONS[id].name).join(', ')}.</p>` : ''}
    ${h.cat ? `<p class="hint">${h.cat} the cat lives aboard.</p>` : ''}
    ${h.touches.map(t => `<div class="hint">${t}.</div>`).join('')}
    ${h.log.slice(0, 8).map(l => `<div class="hint">${dateOf(l.day)}: ${l.text}</div>`).join('')}`;
}

// For the Cold Water epilogue.
function homeLine() {
  const h = home(), bits = [`${shipTitle()[0].toUpperCase()}${shipTitle().slice(1)} is still flying.`];
  if (h.cat) bits.push(`${h.cat} still sleeps on the reactor housing.`);
  if (h.traditions.length) bits.push(`Every burn still has ${h.traditions.map(id => TRADITIONS[id].name).join(' and ')}.`);
  return bits.join(' ');
}

Mods.register({
  id: 'family', name: 'Found family', builtin: true,
  init(M) {
    ACTIVITIES.sit = {
      label: 'Sit with someone', can: () => procedural().length > 0 || paxAboard().some(m => m.pid),
      run() { G.nextEvent = sitPicker(); return 'You make two mugs of coffee.'; },
    };
    // Happenings: the news from home first, then the calendar, then a new tradition.
    M.filter('transitEvent', ev => {
      if (ev) return ev;
      // Main story scenes (storylets with priority) go first; family moments can wait.
      if (STORYLETS.some(s => s.where === 'transit' && s.priority > 0 && !(s.once && quality(`seen:${s.id}`)) && meets(s.when))) return null;
      const t = G.transit, progress = 1 - t.left / t.total;
      const told = procedural().find(f => f.p.news);
      if (told) return newsEvent(told.p);
      const o = (t.occasions || []).find(x => !x.done && x.at <= progress);
      if (o) { o.done = true; return occasionEvent(o); }
      if (home().burns >= 2 && Math.random() < 0.3) return traditionEvent();
      return null;
    });
    M.on('frame', () => {
      const t = G.transit;
      if (G.mode !== 'transit' || !t) return;
      if (!t.homeStarted) {
        t.homeStarted = true;
        home().burns++;
        planOccasions();
        addTouches();
        traditionMoment('start');
      }
      if (t.flipped && !t.homeFlip) { t.homeFlip = true; traditionMoment('flip'); }
      if (t.left < t.total * 0.08 && !t.homeEnd) { t.homeEnd = true; traditionMoment('end'); }
    });
    M.filter('chatter', pool => {
      const lines = [];
      for (const { p } of crewPeople()) {
        if (moodLow(p)) lines.push(`${p.first} has been quiet all watch.`, `${p.first} is rereading an old message from their ${missed(p)}.`);
        if (moodHigh(p)) lines.push(`${p.first} is humming. ${p.first} never hums.`);
      }
      const h = home();
      if (h.cat) lines.push(`${h.cat} is asleep on the reactor housing again.`, `${h.cat} knocked a wrench off the workbench, on purpose, while making eye contact.`, `Somebody has been feeding ${h.cat} from the good rations.`);
      for (const t of h.touches) lines.push(`${t}, and it makes the ship feel more like home.`);
      return lines.length && Math.random() < 0.3 ? lines : pool;
    });
    M.on('missionDone', m => {
      const st = G.state, p = m.pid && st.people[m.pid];
      if (m.favorPid && st.people[m.favorPid]) {
        const f = st.people[m.favorPid];
        becomeLoyal(f, `The captain took me home to see my ${storyOf(f).rel}.`);
        msg(`${f.first} goes ashore to see their ${missed(f)}, and comes back the next morning with red eyes and a bag of home cooking for everyone.`);
      }
      if (p && m.type === 'passenger' && p.opinion >= 4 && !st.crew.includes(p.id) && Math.random() < 0.6) G.joinOffer = p;
    });
    M.on('landed', planet => {
      const st = G.state, notes = letters(planet);
      for (const n of notes) M.note(n);
      const queue = ev => { if (G.dialog) { if (!G.nextEvent) G.nextEvent = ev; } else openEvent(ev); };
      if (G.joinOffer) { const p = G.joinOffer; G.joinOffer = null; queue(joinEvent(p)); }
      else if (!home().cat && st.day >= 5 && ['Ring Nine', 'Boneyard', 'The Hollows', 'Juno Commons', 'Ceres Station', 'Eros Old Town'].includes(planet.name) && Math.random() < 0.1) queue(catEvent());
    });
    M.action('renameShip', () => {
      // An in-page field: browser prompt() dialogs are blocked in some embeds.
      const el = document.getElementById('shipName'), name = el ? el.value.trim().slice(0, 30) : '';
      if (!name || name === home().name) return;
      home().name = name.replace(/^the /i, '');
      home().named = G.state.day;
      homeLog(`Named the ship ${shipTitle()}.`);
    });
  },
});
