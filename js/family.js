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
    return {
      title: `${n}'s Birthday`, text: (`It is ${dateOf(o.day)}, and it is ${n}'s ` +
          `birthday. ${pick([(`${n} hasn't mentioned it. All week, ${n} has been ` +
          `somewhere near the galley whenever anyone is in it.`), `${n} mentioned it once, weeks ago, in passing. At every meal since, ${n} has been busy with something on the far side of the galley.`, (
          `${n} says birthdays are for dirtsiders. They have said it twice this morning, too loudly, and have, for some reason, put on their good ` +
          `jacket.`), `${n} woke up early, and cleaned the galley, and is now sitting straight at the table, with a clean mug set out at every place.`])}`),
      choices: [
        { label: 'Throw a party in the galley', run() { like(p, 2, `The crew threw me a birthday party aboard ${shipTitle()}.`); homeLog(`A birthday party for ${n}.`); return warm(1, (
            `Somebody makes a cake out of ration bars and a candle out of a welding stub, and somebody else finds a bottle no one admits to hiding. ` +
            `The whole ship crowds into the galley to sing, off-key and enthusiastically, and ${n}, who was going to be cool about it, laughs until ` +
            `they cry, and blows out the welding stub on the third try.`))(); } },
        { label: 'Give them something from the cargo (1t luxury goods)', ...gated([() => (st.cargo.luxury || 0) >= 1, () => 'There is no luxury cargo in the hold.']), run() {
          st.cargo.luxury -= 1;
          like(p, 3, 'The captain remembered my birthday.');
          return `${n} unwraps it slowly, saving the paper. When they see what it is, they go still. They do not say anything for a moment. Then they set it on the shelf by their bunk, and keep it there for the rest of the trip. More than once you see them stop and look at it.`;
        } },
        { label: 'A quiet word and a drink', run() { like(p, 1, null); return `You find ${n} alone in the galley, and set down two cups, and say the words, plainly. "You remembered," they say, and look at the cup. You sit together and drink and say little.`; } },
      ],
    };
  }
  const h = o.h, said = familyLines('holidays')[holidayKey(h)], fillH = t => t.replace(/\{n\}/g, n).replace(/\{year\}/g, o.year);
  return {
    title: h.name, text: fillH(said.text),
    choices: [
      { label: 'Everyone joins in', run() { like(p, 2, `We kept ${h.name} aboard ${shipTitle()}.`); homeLog(`Kept ${h.name} aboard.`); return warm(1.2, fillH(said.join))(); } },
      { label: `Let ${n} mark it their own way`, run: () => `${n} nods, and thanks you, and marks it alone in their bunk, with the curtain drawn. You hear music through the bulkhead, something old, from home, and, once, a laugh. In the morning they are cheerful, and nobody asks.` },
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
    notes.push(noteFor(`A message for ${p.first} at ${planet.name}: ${text}.`, p.id));
    break;  // one letter a landing: each one is a scene on the next burn, so three would be three scenes in a row
  }
  if (notes.length) st.letterAt = st.day;
  return notes;
}

function newsEvent(p) {
  const n = p.first, st = G.state, news = p.news;
  p.news = null;
  if (news.good) {
    return { title: 'Good News', text: pick([
      `${n} comes into the galley fast, holding the terminal out in front of them. "Listen," ${n} says. "Listen to this." The message reads: ${news.text}. ${n} reads it aloud, loses their place, and starts again.`,
      `${n} stops you at the hatch. "Captain. Listen to this." The message is open on the terminal: ${news.text}. ${n} reads it aloud twice. The second time, ${n} has to stop partway through.`,
      `You find ${n} in the corridor with the terminal pressed flat against their chest and their eyes shut. Then they hold it out to you: ${news.text}. "I had to tell somebody," ${n} says. "You were closest."`,
      `${n} has been humming since the start of watch. You ask why, and ${n} hands you the terminal: ${news.text}. ${n} stands there while you read it.`,
      `${n} slides the terminal across the galley table without a word and watches you read it. The message: ${news.text}. "Third time I have read it," ${n} says. "It still says that."`,
      `Over the intercom, ${n}: "Captain, can you come aft? It is not an emergency." You find ${n} at the engine room hatch with the terminal. The message: ${news.text}. ${n} is grinning at the deck.`,
      `The message came in at the last port, and ${n} carried it for a watch before saying anything. At the galley table ${n} says it: ${news.text}. Somebody at the table drops a spoon.`,
      `${n} is waiting for you at the end of the watch, rocking on their heels. "Captain, do you have a minute?" The terminal is already out: ${news.text}. "That is all," ${n} says. "That is the whole thing."`,
    ]),
      choices: [
        { label: 'Break out something to celebrate', run() { for (const [a, b] of pairs(folk())) addBond(a, b, 0.8); like(p, 1, null); return pick([(
            'You break out the good bottle. Within the hour everyone who is not on watch is in the galley, and everyone has a toast. Someone finds ' +
            'the guitar, which has two strings. It goes past midnight. Nobody mentions the watch bill.'), (
            `You open the locker and put out whatever the ship has. Cards come out, and the cook brings tomorrow's noodles forward a day. ${n} tells ` +
            `the story three times, and the story changes each time. The galley is full until the watch bell.`), (
            `You call the galley to order with a spoon on a pot. Everyone off watch comes. The cook finds a cake mix at the back of the cupboard and ` +
            `makes it in the pressure pan. It comes out flat. It is eaten.`)]); } },
        { label: '"That\'s wonderful."', run() { like(p, 1, null); return pick([(`${n} shows you the picture. A minute later ${n} shows you again. "I ` +
            `keep wanting to tell someone," ${n} says, and laughs.`), (
            `"Tell me all of it," you say, and ${n} does, from the start, with the dates. At the end ${n} goes back to the part about the street and ` +
            `tells that again.`), (
            `You read it over ${n}'s shoulder. "Send them something," you say. ${n} sends a line from the bridge console and watches the relay clock ` +
            `for the next hour.`)]); } },
      ] };
  }
  const others = procedural().filter(f => f.p !== p && bond(f, { id: p.id }) >= 1);
  const choices = [
    { label: 'Sit with them', run() { like(p, 2, 'The captain sat with me when the news from home was bad.'); p.mood.until -= 10; return pick([(
        `You do not fix anything. You stay in the galley with a pot of tea going cold while ${n} looks at the wall. After a time ${n} starts talking, ` +
        `low, about the person and the place and the years. When they get up, they touch your shoulder on the way out.`), (
        `You bring two cups to the cargo bay and sit on a crate. ${n} does not talk for a while. When ${n} does, it is about the street they grew up ` +
        `on and a night in the market. You stay until the watch bell, and ${n} says thank you at the hatch.`), (
        `You sit on the other side of the galley table and do not look at the terminal. ${n} tells you what the section was like before the cuts. It ` +
        `takes an hour. At the end ${n} washes both cups.`)]); } },
    { label: 'Advance them 500 cr to send home', ...gated(needCr(500)), run() { st.credits -= 500; like(p, 3, 'The captain advanced me money to send home.'); p.mood.until = st.day; return pick([(
        `${n} sends it at the next relay with a short message. For two days ${n} checks the terminal every few minutes. When the reply comes, ${n} ` +
        `reads it aloud in the galley. "They are all right," ${n} says. "They are all right." They sit down.`), (
        `${n} sends it from the bridge console with two lines. The reply is nine hours behind the question. When it comes, ${n} reads it standing at ` +
        `the console and says nothing until the end. "They are all right," ${n} says. The next watch ${n} is early.`), (
        `${n} will not take it at first. Then ${n} says it comes out of the pay, all of it, and sends it with the evening relay. Two days later the ` +
        `reply comes. ${n} reads it twice in the galley and puts the terminal in a pocket. They stay for dinner.`)]); } },
  ];
  if (others.length) {
    const o = pick(others);
    choices.push({ label: `Ask ${o.p.first} to look in on them`, run() { addBond(o, { id: p.id, p }, 2); like(p, 1, null); p.mood.until -= 5; return pick([(
        `${o.p.first} takes ${n} a mug of something hot and sits down beside them on the crate by the galley wall. ${o.p.first} does not speak. They ` +
        `are still there two hours later. Through the hatch you see two heads close together. Once, ${n}'s shoulders shake.`), (
        `${o.p.first} finds ${n} in the cargo bay, sits down on the next crate, opens a ration bar and hands half across. They eat without talking. ` +
        `At the watch bell they go forward together.`), (
        `${o.p.first} takes ${n}'s next hour at the console without being asked. ${n} sits with the terminal on their knees and does not look at it. ` +
        `When ${o.p.first} comes back for the cup, ${n} says something, and ${o.p.first} nods.`)]); } });
  }
  choices.push({ label: 'Give them space', run: () => pick([(`${n} goes to their bunk. You hear the terminal, faintly, and later nothing. Their work ` +
      `suffers for a time: a missed step, a cold cup. (Their skill counts one lower until they feel better.)`), (
      `${n} takes the cargo bay for the rest of the watch and does the manifest twice. You leave the door open. A missed step shows up in the log the ` +
      `next day, and ${n} corrects it before anyone asks. (Their skill counts one lower until they feel better.)`)]) });
  return { title: 'Bad News', text: pick([
      `${n} has been quiet since the last port. ${n} stands the watch and eats, and twice has stopped with the fork halfway up. A message came in at the last port: ${news.text}. ${n} has told no one. You saw the screen over their shoulder in the corridor.`,
      `${n} missed the start of the watch briefing. You find ${n} on a crate in the cargo bay with the terminal dark in their lap. The last message on it reads: ${news.text}.`,
      `${n} has not touched their plate. Nobody at the galley table has said anything. The message is on the terminal by ${n}'s elbow: ${news.text}.`,
      `${n} does the whole shift without a word and checks every gauge twice. Late, in the corridor, ${n} tells you: ${news.text}. "I'm fine," ${n} says.`,
      `${n} asks to speak to you in the cargo bay, where the hull carries the noise. ${n} says it flat, without the terminal: ${news.text}. "I do not need anything," ${n} says. "I wanted you to know why I am slow."`,
      `The terminal pings in the galley and ${n} reads it standing, then sits down. The message: ${news.text}. ${n} finishes the coffee. Nobody at the table asks.`,
      `${n} has been at the comms station for an hour, sending messages and waiting out the lag. When you come in, ${n} turns the screen toward you: ${news.text}.`,
      `You find ${n}'s tool roll closed on the bench, which it never is. ${n} is in the corridor with the terminal. ${n} says: ${news.text}. "I will be on my watch," ${n} says.`,
    ]), choices };
}

// ---------- traditions ----------
const BURN_NAMES = ['The Long Sulk', 'Operation Soup', 'Tuesday Forever', 'Nobody Touch Anything', 'The Great Coffee Shortage', 'Probably Fine', 'Second Breakfast', 'Hold My Drink'];
const TRADITIONS = {
  'flip-toast': { name: 'the flip toast', moment: 'flip', propose: '{n} raises a bulb of something strong as the ship turns end over end, and the stars wheel silently past the viewport, and says, in a clear voice: "To the flip. Halfway to somewhere." Everyone in the room looks at you.',
    line: () => pick(['[Ship] The flip toast: "Halfway to somewhere." Everyone drinks.', ('[Ship] At the flip, cups go up all through the ship, and a ' +
        'quiet, ragged chorus: "Halfway to somewhere."'), '[Ship] The flip comes, and the ship turns, and someone raises a bulb: "Halfway to somewhere." Nobody says no.']) },
  'first-meal': { name: 'first-night noodles', moment: 'start', propose: ('{n} cooks for everyone on the first night out, a huge, clattering pot of ' +
      'noodles and broth and chili, with the lid steaming and a small paper bag of scallions torn open on the counter. They ladle it out with a wooden ' +
      'spoon, one bowl at a time, without a word. When the last bowl is full they look around the table and say: "Tradition. Starting now."'),
    line: () => pick(['[Ship] First night out, and the galley smells of noodles. Tradition.', ('[Ship] The first-night noodles are on, and the whole ' +
        'ship is queuing with bowls, in a cheerful, hungry line.'), '[Ship] Noodles again, first night out. Somebody says it wouldn\'t feel like a burn without them.']) },
  'burn-name': { name: 'naming the burn', moment: 'start', propose: ('{n} says every burn deserves a name, in the way that every storm deserves a ' +
      'name, and, ideally, every mistake. They have a marker, and a large sheet of paper taped to the galley wall. They write, in tall block letters, ' +
      'and propose calling this one "{b}".'),
    line: () => `[Ship] By unanimous vote, this burn is called "${pick(BURN_NAMES)}".` },
  'docking-song': { name: 'the docking song', moment: 'end', propose: ('{n} starts singing an old work song from {home} on final approach, softly at ' +
      'first, mostly to themselves, a slow, rolling tune about hauling, and home, and the long way round. By the second verse, someone is harmonizing, ' +
      'and by the third, half the ship has joined in, off-key and untroubled, and somebody is keeping time on a pipe with a wrench.'),
    line: () => pick([
      '[Ship] Final approach, and everyone is singing the docking song, badly and with feeling.',
      '[Ship] The docking song starts up in the galley, and spreads through the ship, verse by verse, like weather.',
      '[Ship] Somebody starts the docking song, and, in the cockpit, the pilot, who swore he would not, is humming along.'
    ]) },
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
      { label: 'Make it a tradition', run() { h.traditions.push(id); homeLog(`Started ${T.name}.`); for (const [a, b] of pairs(folk())) addBond(a, b, 1); like(f.p, 1, null); return (
          `You say the words, and nobody speaks for a second, and then somebody laughs, and it is done. It sticks. From now on, ${T.name} is part of ` +
          `life aboard ${shipTitle()}.`); } },
      { label: 'Just this once', run: () => 'You say yes to the moment and no to the promise. Nobody makes a fuss, and the cups go round again.' },
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
  f => `${f.p.first} keeps a battered copy of "${pick(newBooks(cultureToday())).title}" in the galley for anyone to borrow`,
  f => `${f.p.first} chalked a hopscotch grid on the cargo bay deck, and people use it`,
  f => `${f.p.first} tied a small bell by the airlock, so you can hear who is coming and going`,
  f => `${f.p.first} started a jar by the galley door for good news, and it already has three slips in it`,
  f => `${f.p.first} taped a hand-drawn star chart to the cockpit bulkhead, with everybody's home marked in a different color`,
  f => `${f.p.first} put a small potted succulent on the nav console, and named it, and refuses to say what`,
  f => `${f.p.first} set up a board by the mess with everybody's birthday on it, in careful, curly writing`,
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
    title: 'Stowaway', text: (`There is a cat in the cargo lock: skinny, gray, one torn ear, a kinked tail, and completely unimpressed by you. It is ` +
        `sitting on the top of a crate, washing one paw, with the air of a small, ancient, extremely tired landlord. When you open the inner hatch it ` +
        `looks up, unhurried, and gives you a long, level stare, and goes back to its paw.`),
    choices: [
      ...names.map((nm, i) => ({ label: `"${nm}," suggests ${voters[i]}`, run() {
        h.cat = nm;
        homeLog(`${nm} the cat came aboard at ${G.state.planet}.`);
        for (const f of crewPeople()) likeAmbient(f.p, 1, null);
        return (`${nm} it is. The cat, for its part, does not acknowledge the name, or the vote, or the existence of the arrangement. By the time you ` +
            `take off, ${nm} has found the warmest spot on the ship, which is on the reactor housing, and has curled into a perfect gray circle, one ` +
            `ear twitching. Somebody puts a saucer of milk down, and somebody else makes a small bed out of a folded jacket.`);
      } })),
      { label: 'Put it back on the dock', run: () => ('You carry it back down the ramp, in both hands, and set it on the dock, and it gives you a ' +
          'look you will remember for a long time, a long, level, wholly unsurprised stare, and walks off, with its tail high. Nobody on the crew ' +
          'speaks to you for an hour. Somewhere, in the distance, a small, imperious meow.') },
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
  const role = p.role || jobRole(p.job), st = G.state;
  return {
    title: 'One More Berth', text: (`The trip is over, and the other passengers have gone ashore, but ${p.first} ${p.last} lingers at the airlock ` +
        `with their bag, a battered, over-stuffed thing that has, over the burn, become oddly familiar. They shift it from hand to hand. They look at ` +
        `the deck, and at the hatch, and at you, and back at the deck. "I've been thinking," they say at last, in a rush. "I don't really have ` +
        `anywhere I need to be. And I like it here. I like all of you. Could ${shipTitle()} use a ${ROLE_NAMES[role].toLowerCase()}?" They hold your eye and wait.`),
    choices: [
      { label: 'Welcome aboard', ...gated(needBerth), run() {
        Object.assign(p, { role, skill: randInt(1, 2), location: null });
        p.wage = Math.round(ROLE_WAGE[role] * (0.6 + 0.3 * p.skill));
        st.crew.push(p.id);
        like(p, 2, `I signed on with ${shipTitle()}.`);
        homeLog(`${p.first} ${p.last} came aboard as a passenger and stayed as crew.`);
        return `${p.first} lets out a breath so long it is almost a laugh, and drops their bag in the same bunk as before, with a thump. "Same one," they say. "It's lucky." Somebody, in the galley, starts to clap. (They join as your ${ROLE_NAMES[role].toLowerCase()}.)`;
      } },
      { label: '"Not this time."', run: () => (`"I understand," ${p.first} says, quickly. "Really. If you ever need someone..." They write their contact code on the back of your hand, in pen, since they do not seem to have paper, ` +
          `wave, shoulder their bag, and go down the ramp. You watch them all the way to the end of the dock, and, at the corner, they turn, and lift ` +
          `a hand, and are gone.`) },
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
