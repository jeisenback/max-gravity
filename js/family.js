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
const shipTitle = () => `the ${cleanName(home().name)}`;  // cleaned here too: the title goes into scene text, news and canvas as well as templates
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
const RELATIONS = ['mother', 'father', 'sister', 'brother', 'grandmother', 'daughter', 'son', 'best friend', 'old crew chief'];
const HOME_DETAIL = {
  belt: 'the hum of the recyclers, the tunnel markets, spin gravity you could argue with',
  mars: 'dust storms that last a month, dome lights at dusk, everyone arguing about the future',
  earth: 'too many people, real rain, and an ocean you could hear from the arcology at night',
};
const cultureOfPerson = p => p.culture || HOME_CULTURE[p.home] || 'earth';

// An authored person (cast.js) has their own story in their entry. It replaces anything rolled before, and keeps the
// progress made. Later authored people (the captains and XOs) add their lookup here.
const authoredStory = p => { const d = p.cast ? CAST[p.cast] : p.captainKey ? CAPTAINS[p.captainKey] : null; return d ? d.story || null : null; };

function storyOf(p) {
  const own = authoredStory(p);
  if (own && !(p.story && p.story.authored)) p.story = { ...own, authored: true, beat: p.story ? p.story.beat : 0 };
  if (!p.story) {
    const rel = pick(RELATIONS), who = makePerson(cultureOfPerson(p));
    p.story = { left: pick(familyLines('left')), rel, name: who.first, hope: pick(familyLines('hopes')).replace('{home}', p.home), favor: planetNamed(p.home) ? 'visit' : 'debt', debt: randInt(8, 25) * 100, beat: 0 };
  }
  return p.story;
}
const missed = p => `${storyOf(p).rel} ${storyOf(p).name}`;

// The "With {name}" scenes (#457). The words of each are in PEOPLE_LINES (peopletext.js) under `family:`, read through familySay; what a choice does stays here. Each is built for a
// shipmate, and for who it is about, so that the editor can play it (FAMILY_SCENES below).
const liftBy = (p, x, memory, text) => ({ run() { like(p, x, memory); if (moodLow(p)) p.mood.until -= x * 3; return text; } });
const moodTopic = p => {
  const say = familySay('mood'), n = p.first;
  return { pressing: true, title: say('title', { n }), open: p.mood.text ? say('open.news', { n, news: p.mood.text }) : say('open.plain', { n }), choices: [
    { label: say('c0.label'), ...liftBy(p, 1, 'You sat with me while I was having a hard time.', say('c0.result', { n, missed: missed(p) })) },
    { label: say('c1.label'), ...liftBy(p, 2, 'You offered to cover for me when I was having a hard time.', say('c1.result', { n })) },
    { label: say('c2.label'), ...liftBy(p, 0, null, say('c2.result', { n })) },
  ] };
};
const hurtTopic = p => {
  const say = familySay('hurt'), n = p.first;
  return { pressing: true, title: say('title', { n }), open: say('open', { n }), choices: [
    { label: say('c0.label'), ...liftBy(p, 1, 'You asked how I was, and meant it.', say('c0.result', { n })) },
    { label: say('c1.label'), ...liftBy(p, 1, 'You told me to rest, and I did.', say('c1.result', { n })) },
  ] };
};
const warTopic = (p, aff, foe) => {
  const say = familySay('war'), n = p.first;
  return { title: say('title', { n }), open: say('open', { n, aff, foe }), choices: [
    { label: say('c0.label'), ...liftBy(p, 1, 'You asked what I thought about the war.', say('c0.result', { n })) },
    { label: say('c1.label'), ...liftBy(p, 1, 'You asked if I wanted to go home during the war.', say('c1.result', { n })) },
    { label: say('c2.label'), ...liftBy(p, 0, null, say('c2.result', { n })) },
  ] };
};
const riftTopic = (p, other) => {
  const say = familySay('rift'), n = p.first;
  return { title: say('title', { n }), open: say('open', { n, other: other.first }), choices: [
    { label: say('c0.label'), ...liftBy(p, 1, `You asked what was wrong between me and ${other.first}.`, say('c0.result', { n })) },
    { label: say('c1.label'), ...liftBy(p, 0, null, say('c1.result', { n })) },
  ] };
};
const friendTopic = (p, other) => {
  const say = familySay('friend'), n = p.first;
  return { title: say('title', { n }), open: say('open', { n, other: other.first }), choices: [
    { label: say('c0.label', { other: other.first }), ...liftBy(p, 1, `You asked about ${other.first}, and I told you.`, say('c0.result', { n, other: other.first })) },
    { label: say('c1.label'), ...liftBy(p, 1, null, say('c1.result', { n })) },
  ] };
};
const memoryTopic = (p, mem) => {
  const say = familySay('memory'), n = p.first;
  return { title: say('title', { n }), open: say('open', { n, mem }), choices: [
    { label: say('c0.label'), ...liftBy(p, 1, 'You brought it up, and I was glad.', say('c0.result', { n })) },
    { label: say('c1.label'), ...liftBy(p, 0, null, say('c1.result', { n })) },
  ] };
};
function talkTopics(p) {
  const st = G.state, out = [];
  if (moodLow(p)) out.push(moodTopic(p));
  if ((st.injured || {})[p.id]) out.push(hurtTopic(p));
  const t = typeof tiesOf === 'function' ? tiesOf(p) : null, w = typeof factionState === 'function' ? factionState().war : null;
  if (t && w && (t.aff === w.a || t.aff === w.b)) out.push(warTopic(p, t.aff, t.aff === w.a ? w.b : w.a));
  const others = typeof bond === 'function' ? G.state.crew.filter(id => id !== p.id).map(id => ({ id, p: person(id) })).filter(f => f.p) : [], me = { id: p.id, p };
  const worst = others.map(f => ({ f, b: bond(me, f) })).sort((x, y) => x.b - y.b)[0], best = others.map(f => ({ f, b: bond(me, f) })).sort((x, y) => y.b - x.b)[0];
  if (worst && worst.b <= -2) out.push(riftTopic(p, worst.f.p));
  if (best && best.b >= 6) out.push(friendTopic(p, best.f.p));
  const mem = p.memories && p.memories.length ? p.memories[p.memories.length - 1].replace(/^(Day \d+|\d+ \w+ \d+): /, '') : null;
  if (mem) out.push(memoryTopic(p, mem));
  return out;
}
function ordinaryTalk(p) {
  const topics = talkTopics(p), tp = topics.length ? pick(topics) : null;
  return tp ? { title: tp.title, text: tp.open, choices: tp.choices } : idleTalk(p);
}
function idleTalk(p) {
  const say = familySay('idle'), n = p.first, idle = (p.traits || []).map(t => familyLines('idle')[t]).filter(Boolean);
  return { title: say('title', { n }), text: say('text', { n, idle: idle.length ? pick(idle) : say('easy') }),
    choices: [
      { label: say('c0.label'), run() { like(p, 1, null); if (moodLow(p)) p.mood.until -= 5; return pick([say('c0.result.0', { n }), say('c0.result.1', { n }), say('c0.result.2', { n })]); } },
      { label: say('c1.label', { n, home: p.home }), run() { like(p, 1, null); return say('c1.result', { n, home: p.home }); } },
    ] };
}

// The sittings of a story. `result` is what happens after: a line, or a list to pick from.
const storyTalk = (p, s) => (label, likeBy, result, extra) => ({ label, run() {
  like(p, likeBy, null); s.beat++; if (extra) extra();
  const lines = [].concat(result);
  return lines.length > 1 ? pick(lines) : lines[0];
} });
const politeScene = p => {
  const say = familySay('polite'), n = p.first;
  return { title: say('title', { n }), text: say('text', { n }), choices: [{ label: say('c0.label'), run() { like(p, 1, null); return say('c0.result', { n }); } }] };
};
const homeScene = (p, s) => {
  const say = familySay('story-home'), n = p.first, talk = storyTalk(p, s);
  return { title: say('title', { n }), text: say('text', { n, home: p.home, detail: s.homeDetail || familyLines('home')[cultureOfPerson(p)], left: s.left }),
    choices: [talk(say('c0.label'), 1, [say('c0.result.0', { n }), say('c0.result.1', { n })]), talk(say('c1.label'), 2, say('c1.result', { n }))] };
};
const pictureScene = (p, s) => {
  const say = familySay('story-picture'), n = p.first, talk = storyTalk(p, s);
  return { title: say('title', { n }), text: say('text', { n, missed: missed(p) }),
    choices: [talk(say('c0.label'), 1, say('c0.result', { n, rel: s.rel })), talk(say('c1.label'), 1, say('c1.result', { n }))] };
};
const hopeScene = (p, s) => {
  const say = familySay('story-hope'), n = p.first, talk = storyTalk(p, s);
  return { title: say('title', { n }), text: say('text', { n, hope: s.hope }),
    choices: [talk(say('c0.label'), 1, say('c0.result', { n })), talk(say('c1.label'), 2, say('c1.result', { n }), () => { s.promised = true; })] };
};
// The favor at the end of it, for crew: to see their family (a mission home), or a debt to pay.
const visitFavor = (p, s) => {
  const say = familySay('favor-visit'), n = p.first, st = G.state, where = planetNamed(p.home);
  return { title: say('title'), text: say('text', { n, home: p.home, missed: missed(p) }),
    choices: [
      { label: say('c0.label'), run() {
        st.missions.push({ id: st.nextId++, type: 'favor', favorPid: p.id, good: 'a promise', tons: 0, destSystem: where.sid, destPlanet: p.home,
          title: `Take ${n} home to ${p.home} to see their ${s.rel}`, pay: 0, deadline: st.day + 150 });
        s.beat = 4;
        like(p, 2, 'The captain promised to take me home.');
        return say('c0.result', { n });
      } },
      { label: say('c1.label'), run: () => say('c1.result', { n }) },
    ] };
};
const debtFavor = (p, s) => {
  const say = familySay('favor-debt'), n = p.first, st = G.state;
  return { title: say('title'), text: say('text', { n, debt: fmt(s.debt), home: p.home }),
    choices: [
      { label: say('c0.label', { debt: fmt(s.debt) }), ...gated(needCr(s.debt)), run() {
        st.credits -= s.debt;
        s.beat = 4;
        becomeLoyal(p, 'The captain paid off my debt.');
        return say('c0.result', { n });
      } },
      { label: say('c1.label'), run: () => say('c1.result', { n }) },
    ] };
};

function sitBeat(p, isCrew) {
  const s = storyOf(p), st = G.state;
  // Someone in a bad way (a letter that hurt, an injury) is talked to about that first, once, and then the story goes on where it was.
  const pressKey = moodLow(p) ? `mood:${p.mood.text || p.mood.kind}` : (st.injured || {})[p.id] ? 'hurt' : null;
  if (!pressKey) p.pressed = null;
  else if (p.pressed !== pressKey) {
    const t = talkTopics(p).find(x => x.pressing);
    if (t) { p.pressed = pressKey; return { title: t.title, text: t.open, choices: t.choices }; }
  }
  if (s.beat > (p.opinion + 1) && s.beat < 4) return politeScene(p);
  if (s.beat === 0) return homeScene(p, s);
  if (s.beat === 1) return pictureScene(p, s);
  if (s.beat === 2) return hopeScene(p, s);
  if (s.beat === 3 && isCrew && s.favor) return s.favor === 'visit' ? visitFavor(p, s) : debtFavor(p, s);
  return ordinaryTalk(p);
}

function becomeLoyal(p, memory) {
  p.loyal = true;
  like(p, 5, memory);
  homeLog(`${p.first} ${p.last} will follow ${shipTitle()} anywhere now.`);
}

function sitPicker() {
  const say = familySay('picker'), aboard = [...procedural(), ...paxAboard().filter(m => m.pid && G.state.people[m.pid]).map(m => ({ id: m.pid, p: G.state.people[m.pid], pax: true }))];
  return {
    title: say('title'), text: say(`text.${pick([0, 1, 2, 3, 4])}`),
    choices: aboard.map(f => ({
      label: `${f.p.first} (${f.pax ? 'passenger' : ROLE_NAMES[f.p.role].toLowerCase()})${moodLow(f.p) ? ', having a hard time' : (G.state.injured || {})[f.p.id] ? ', hurt' : ''}`,
      run() { G.nextEvent = sitBeat(f.p, !f.pax); return say('go', { first: f.p.first }); },
    })),
  };
}

// The scenes by the name of their lines (`family:` + the name), each built for a shipmate with what it needs about, for the editor to play (#457).
const asTalk = t => ({ title: t.title, text: t.open, choices: t.choices });
const FAMILY_SCENES = {
  mood: p => { p.mood = { kind: 'low', until: G.state.day + 30, text: 'a message from home' }; return asTalk(moodTopic(p)); },
  hurt: p => asTalk(hurtTopic(p)),
  war: p => asTalk(warTopic(p, 'Mars Republic', 'Arcology Compact')),
  rift: p => asTalk(riftTopic(p, { first: 'Ana' })),
  friend: p => asTalk(friendTopic(p, { first: 'Ben' })),
  memory: p => asTalk(memoryTopic(p, 'You sat with me when it was hard.')),
  idle: p => idleTalk(p),
  polite: p => politeScene(p),
  'story-home': p => homeScene(p, storyOf(p)),
  'story-picture': p => pictureScene(p, storyOf(p)),
  'story-hope': p => hopeScene(p, storyOf(p)),
  'favor-visit': p => visitFavor(p, Object.assign(storyOf(p), { favor: 'visit' })),
  'favor-debt': p => debtFavor(p, Object.assign(storyOf(p), { favor: 'debt', debt: 1500 })),
  picker: () => sitPicker(),
  birthday: p => occasionEvent({ kind: 'birthday', id: p.id, day: G.state.day + 3 }),
  holiday: p => occasionEvent({ kind: 'holiday', h: HOLIDAYS[0], id: p.id, day: G.state.day + 1, year: calOf(G.state.day + 1).y }),
  'news-good': p => { p.news = { good: true, text: 'their sister got into the academy' }; return newsEvent(p); },
  'news-bad': p => { p.news = { good: false, text: 'their father is sick' }; p.mood = { kind: 'low', until: G.state.day + 20, text: p.news.text }; return newsEvent(p); },
  tradition: () => { home().proposed = []; return traditionEvent(); },
  cat: () => catEvent(),
  join: p => { p.role = p.role || 'engineer'; return joinEvent(p); },
};

// ---------- birthdays and holidays ----------
const calOf = day => { const d = new Date(START_DATE + (day - 1) * 864e5); return { m: d.getUTCMonth() + 1, d: d.getUTCDate(), y: d.getUTCFullYear() }; };
const birthday = id => { const d = new Date(Date.UTC(2214, 0, 1 + (Math.abs(hash(id + 'bday')) % 365))); return { m: d.getUTCMonth() + 1, d: d.getUTCDate() }; };

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
  if (hired() && hired().run && hired().run.ice) ICE_AT.forEach((at, stage) => t.occasions.push({ kind: 'ice', stage, at }));  // the ice run's three scenes (icerun.js)
}

function occasionEvent(o) {
  if (o.kind === 'ice') return iceStageScene(o.stage);
  const p = person(o.id), n = p.first, st = G.state;
  const all = () => folk();
  const warm = (x, text) => () => { for (const [a, b] of pairs(all())) addBond(a, b, x); return text; };
  if (o.kind === 'birthday') {
    const say = familySay('birthday');
    return {
      title: say('title', { n }), text: say('text', { date: dateOf(o.day), n, act: say(`act.${pick([0, 1, 2, 3])}`, { n }) }),
      choices: [
        { label: say('c0.label'), run() { like(p, 2, `The crew threw me a birthday party aboard ${shipTitle()}.`); homeLog(`A birthday party for ${n}.`); return warm(1, say('c0.result', { n }))(); } },
        { label: say('c1.label'), ...gated([() => (st.cargo.luxury || 0) >= 1, () => say('c1.gate')]), run() {
          st.cargo.luxury -= 1;
          like(p, 3, 'The captain remembered my birthday.');
          return say('c1.result', { n });
        } },
        { label: say('c2.label'), run() { like(p, 1, null); return say('c2.result', { n }); } },
      ],
    };
  }
  const h = o.h, said = familyLines('holidays')[holidayKey(h)], say = familySay('holiday'), fillH = t => t.replace(/\{n\}/g, n).replace(/\{year\}/g, o.year);
  return {
    title: h.name, text: fillH(said.text),
    choices: [
      { label: say('c0.label'), run() { like(p, 2, `We kept ${h.name} aboard ${shipTitle()}.`); homeLog(`Kept ${h.name} aboard.`); return warm(1.2, fillH(said.join))(); } },
      { label: say('c1.label', { n }), run: () => say('c1.result', { n }) },
    ],
  };
}

// ---------- letters from home ----------
// Letters from home come at most one landing in LETTER_GAP days, so they are an occasional thing and not half of every burn.
const LETTER_GAP = 18;
function letters(planet) {
  const st = G.state, notes = [];
  if (st.day - (st.letterAt === undefined ? -99 : st.letterAt) < LETTER_GAP) return notes;
  for (const f of procedural()) {
    const p = f.p;
    if (Math.random() > 0.2 || (p.letterDay || -99) > st.day - 30) continue;
    p.letterDay = st.day;
    const good = Math.random() < 0.55;
    const news = storyOf(p).news, pool = news ? (good ? news.good : news.bad) : (good ? familyLines('good-news') : familyLines('bad-news'));  // an authored person's own news, or the generic
    const text = pick(pool).replace('{who}', `their ${missed(p)}`).replace('{home}', p.home);
    p.mood = { kind: good ? 'high' : 'low', until: st.day + (good ? 10 : 25), text };
    p.news = { good, text };
    notes.push(noteFor(fillLine(familyLines('ship').letter, { n: p.first, planet: planet.name, text }), p.id));
    break;  // one letter a landing: each one is a scene on the next burn, so three would be three scenes in a row
  }
  if (notes.length) st.letterAt = st.day;
  return notes;
}

function newsEvent(p) {
  const n = p.first, st = G.state, news = p.news;
  p.news = null;
  if (news.good) {
    const say = familySay('news-good');
    return { title: say('title'), text: say(`open.${pick([0, 1, 2, 3, 4, 5, 6, 7])}`, { n, news: news.text }),
      choices: [
        { label: say('c0.label'), run() { for (const [a, b] of pairs(folk())) addBond(a, b, 0.8); like(p, 1, null); return say(`c0.result.${pick([0, 1, 2])}`, { n }); } },
        { label: say('c1.label'), run() { like(p, 1, null); return say(`c1.result.${pick([0, 1, 2])}`, { n }); } },
      ] };
  }
  const say = familySay('news-bad'), others = procedural().filter(f => f.p !== p && bond(f, { id: p.id }) >= 1);
  const choices = [
    { label: say('sit.label'), run() { like(p, 2, 'The captain sat with me when the news from home was bad.'); p.mood.until -= 10; return say(`sit.result.${pick([0, 1, 2])}`, { n }); } },
    { label: say('advance.label'), ...gated(needCr(500)), run() { st.credits -= 500; like(p, 3, 'The captain advanced me money to send home.'); p.mood.until = st.day; return say(`advance.result.${pick([0, 1, 2])}`, { n }); } },
  ];
  if (others.length) {
    const o = pick(others);
    choices.push({ label: say('ask.label', { other: o.p.first }), run() { addBond(o, { id: p.id, p }, 2); like(p, 1, null); p.mood.until -= 5; return say(`ask.result.${pick([0, 1, 2])}`, { n, other: o.p.first }); } });
  }
  choices.push({ label: say('space.label'), run: () => say(`space.result.${pick([0, 1])}`, { n }) });
  return { title: say('title'), text: say(`open.${pick([0, 1, 2, 3, 4, 5, 6, 7])}`, { n, news: news.text }), choices };
}

// ---------- traditions ----------
const BURN_NAMES = ['The Long Sulk', 'Operation Soup', 'Tuesday Forever', 'Nobody Touch Anything', 'The Great Coffee Shortage', 'Probably Fine', 'Second Breakfast', 'Hold My Drink'];
const TRADITIONS = {  // the name of each is here; its proposal and the line it gives in a burn are in PEOPLE_LINES (family:tradition)
  'flip-toast': { name: 'the flip toast', moment: 'flip', line: () => familySay('tradition')(`flip-toast.line.${pick([0, 1, 2])}`) },
  'first-meal': { name: 'first-night noodles', moment: 'start', line: () => familySay('tradition')(`first-meal.line.${pick([0, 1, 2])}`) },
  'burn-name': { name: 'naming the burn', moment: 'start', line: () => familySay('tradition')('burn-name.line', { b: pick(BURN_NAMES) }) },
  'docking-song': { name: 'the docking song', moment: 'end', line: () => familySay('tradition')(`docking-song.line.${pick([0, 1, 2])}`) },
};

function traditionEvent() {
  const h = home(), crew = procedural().length ? procedural() : crewPeople();
  const id = Object.keys(TRADITIONS).find(k => !h.proposed.includes(k));
  if (!id || !crew.length) return null;
  h.proposed.push(id);
  const say = familySay('tradition'), T = TRADITIONS[id], f = pick(crew);
  return {
    title: say('title'), text: say(`${id}.propose`, { n: f.p.first, home: f.p.home, b: pick(BURN_NAMES) }),
    choices: [
      { label: say('c0.label'), run() { h.traditions.push(id); homeLog(`Started ${T.name}.`); for (const [a, b] of pairs(folk())) addBond(a, b, 1); like(f.p, 1, null); return say('c0.result', { name: T.name, ship: shipTitle() }); } },
      { label: say('c1.label'), run: () => say('c1.result') },
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
const touchSay = (i, vars) => fillLine(familyLines('touches')[i], vars);
const TOUCHES = [
  f => touchSay(0, { n: f.p.first, team: tastes(f).team }),
  f => touchSay(1, { n: f.p.first }),
  f => touchSay(2, { n: f.p.first, home: f.p.home }),
  f => touchSay(3, { n: f.p.first }),
  f => touchSay(4, { n: f.p.first, missed: missed(f.p) }),
  f => touchSay(5, { n: f.p.first, book: pick(newBooks(cultureToday())).title }),
  f => touchSay(6, { n: f.p.first }),
  f => touchSay(7, { n: f.p.first }),
  f => touchSay(8, { n: f.p.first }),
  f => touchSay(9, { n: f.p.first }),
  f => touchSay(10, { n: f.p.first }),
  f => touchSay(11, { n: f.p.first }),
];
function addTouches() {
  const h = home();
  for (const f of procedural()) {
    if (f.p.touched || Math.random() > 0.2) continue;
    f.p.touched = true;
    const text = pick(TOUCHES)(f);
    h.touches.push(text);
    comm(fillLine(familyLines('ship').touch, { text }));
  }
}
const CAT_NAMES = ['Rivet', 'Biscuit', 'Admiral', 'Dust', 'Pumpkin', 'Lug Nut', 'Orbit', 'Nine', 'Captain Whiskers'];
function catEvent() {
  const h = home(), crew = crewPeople(), say = familySay('cat');
  const names = [...CAT_NAMES].sort(() => Math.random() - 0.5).slice(0, 3);
  const voters = names.map((nm, i) => (crew[i] ? crew[i].p.first : 'You'));
  return {
    title: say('title'), text: say('text'),
    choices: [
      ...names.map((nm, i) => ({ label: say('name.label', { name: nm, voter: voters[i] }), run() {
        h.cat = nm;
        homeLog(`${nm} the cat came aboard at ${G.state.planet}.`);
        for (const f of crewPeople()) likeAmbient(f.p, 1, null);
        return say('name.result', { name: nm });
      } })),
      { label: say('dock.label'), run: () => say('dock.result') },
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
  return pick(HIREABLE_ROLES);
}
function joinEvent(p) {
  const role = p.role || jobRole(p.job), st = G.state, say = familySay('join'), roleName = ROLE_NAMES[role].toLowerCase();
  return {
    title: say('title'), text: say('text', { first: p.first, last: p.last, ship: shipTitle(), role: roleName }),
    choices: [
      { label: say('c0.label'), ...gated(needBerth), run() {
        Object.assign(p, { role, skill: randInt(1, 2), location: null });
        p.wage = Math.round(ROLE_WAGE[role] * (0.6 + 0.3 * p.skill));
        st.crew.push(p.id);
        like(p, 2, `I signed on with ${shipTitle()}.`);
        homeLog(`${p.first} ${p.last} came aboard as a passenger and stayed as crew.`);
        return say('c0.result', { first: p.first, role: roleName });
      } },
      { label: say('c1.label'), run: () => say('c1.result', { first: p.first }) },
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
    if (p.story && p.story.favor && p.story.beat >= 3 && p.story.beat < 4) bits.push('has a favor to ask');
    return bits.length ? `<div class="hint">${p.first}: ${bits.join(', ')}</div>` : '';
  }).join('');
  return `<h3>${esc(h.name[0].toUpperCase() + h.name.slice(1))}</h3>
    ${hired() ? '' : '<div class="row"><input type="text" id="shipName" maxlength="30" placeholder="A new name for the ship"><button data-action="renameShip">Rename the ship</button></div>'}
    ${crew}
    ${h.traditions.length ? `<p class="hint">Traditions: ${h.traditions.map(id => TRADITIONS[id].name).join(', ')}.</p>` : ''}
    ${h.cat ? `<p class="hint">${h.cat} the cat lives aboard.</p>` : ''}
    ${h.touches.map(t => `<div class="hint">${esc(t)}.</div>`).join('')}
    ${h.log.slice(0, 8).map(l => `<div class="hint">${dateOf(l.day)}: ${esc(l.text)}</div>`).join('')}`;
}

// For the Cold Water epilogue.
function homeLine() {
  const h = home(), t = familyLines('ship'), ship = shipTitle(), bits = [fillLine(t.flying, { ship: `${ship[0].toUpperCase()}${ship.slice(1)}` })];
  if (h.cat) bits.push(fillLine(t.cat, { cat: h.cat }));
  if (h.traditions.length) bits.push(fillLine(t.traditions, { list: h.traditions.map(id => TRADITIONS[id].name).join(' and ') }));
  return bits.join(' ');
}

Mods.register({
  id: 'family', name: 'Found family', builtin: true,
  init(M) {
    ACTIVITIES.sit = {
      label: 'Sit with someone', can: () => procedural().length > 0 || paxAboard().some(m => m.pid),
      run() { G.nextEvent = sitPicker(); return 'You make two mugs of coffee.'; },
    };
    M.on('newDay', day => {  // a high opinion fades when you do nothing for them (people.js)
      for (const id of [...G.state.crew, (hired() || {}).captain].filter(Boolean)) {
        const p = person(id);
        if (p && p.memories && !p.loyal && p.opinion > OPINION.FRIEND && day - (p.liftedAt || 0) >= OPINION_FADE) { p.opinion--; p.liftedAt = day; }
      }
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
      const lines = [], c = familyLines('chatter');
      for (const { p } of crewPeople()) {
        const n = p.first;
        if (moodLow(p)) lines.push(fillLine(c.low[0], { n }), fillLine(c.low[1], { n, missed: missed(p) }));
        if (moodHigh(p)) lines.push(fillLine(c.high, { n }));
      }
      const h = home();
      if (h.cat) lines.push(...c.cat.map(t => fillLine(t, { cat: h.cat })));
      for (const t of h.touches) lines.push(fillLine(c.touch, { touch: t }));
      return lines.length && Math.random() < 0.3 ? lines : pool;
    });
    M.on('missionDone', m => {
      const st = G.state, p = m.pid && st.people[m.pid];
      if (m.favorPid && st.people[m.favorPid]) {
        const f = st.people[m.favorPid];
        becomeLoyal(f, `The captain took me home to see my ${storyOf(f).rel}.`);
        msg(fillLine(familyLines('ship').ashore, { n: f.first, missed: missed(f) }));
      }
      if (p && m.type === 'passenger' && p.opinion >= OPINION.WELCOME && !st.crew.includes(p.id) && Math.random() < 0.6) G.joinOffer = p;
    });
    M.on('landed', planet => { for (const n of letters(planet)) M.note(n); });
    M.action('renameShip', () => {
      if (hired()) return;  // her name is the captain's
      // An in-page field: browser prompt() dialogs are blocked in some embeds.
      const el = document.getElementById('shipName'), name = cleanName(el && el.value);
      if (!name || name === home().name) return;
      home().name = name.replace(/^the /i, '');
      home().named = G.state.day;
      homeLog(`Named the ship ${shipTitle()}.`);
    });
  },
});
