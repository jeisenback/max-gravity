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

// An authored person (cast.js) has their own story in their entry. It replaces anything rolled before, and keeps the
// progress made. Later authored people (the captains and XOs) add their lookup here.
const authoredStory = p => { const d = p.cast ? CAST[p.cast] : p.captainKey ? CAPTAINS[p.captainKey] : null; return d ? d.story || null : null; };

function storyOf(p) {
  const own = authoredStory(p);
  if (own && !(p.story && p.story.authored)) p.story = { ...own, authored: true, beat: p.story ? p.story.beat : 0 };
  if (!p.story) {
    const rel = pick(RELATIONS), who = makePerson(cultureOfPerson(p));
    p.story = { left: pick(LEFT), rel, name: who.first, hope: pick(HOPES).replace('{home}', p.home), favor: planetNamed(p.home) ? 'visit' : 'debt', debt: randInt(8, 25) * 100, beat: 0 };
  }
  return p.story;
}
const missed = p => `${storyOf(p).rel} ${storyOf(p).name}`;

// When there is no arc to move on, the talk is about what is on their mind now: how they are (a letter, an injury), the war if they
// are of a side in it, how they get on with the others, what you did last time. Each is its own short scene, with its own choices.
const TALK_IDLE = {
  talkative: 'is already telling you about something that happened at the last port, and by the second mug has told you about two more',
  nervous: 'keeps glancing at the corridor, and relaxes a little when you stay',
  generous: 'has saved you the good end of the loaf, and does not mention it',
  greedy: 'is working out, aloud and not quite to you, what the next run should clear',
  pious: 'sits with a hand around the cord at their wrist and says nothing for a long time, comfortably',
  rude: 'has a view on the galley, the rota, and the way you hold a mug, and shares them',
  curious: 'wants to know how the drive works, what you do on watch, and whether you have ever been to Titan',
  drunk: 'is on water tonight, and says so with an effort that is its own kind of story',
  secretive: 'answers a question about the weather with a question about you',
  kind: 'asks if you have slept, and does not take "fine" for an answer',
  brave: 'tells you about the worst day they have had on a ship, quietly, as if it were a recipe',
  homesick: 'has a photograph out, and puts it away when you come in, and then takes it out again',
};
function talkTopics(p) {
  const st = G.state, n = p.first, out = [];
  const lift = (x, memory, text) => ({ run() { like(p, x, memory); if (moodLow(p)) p.mood.until -= x * 3; return text; } });
  if (moodLow(p)) out.push({ pressing: true, open: `${n} is quiet, and has been since ${p.mood.text ? `the news: ${p.mood.text}` : 'the last message from home'}. A mug sits in front of them, untouched.`, choices: [
    { label: 'Let them talk', ...lift(1, 'You sat with me while I was having a hard time.', `You say nothing, and ${n} talks, in pieces, about ${missed(p)}, and what they cannot do from here. By the end the mug is empty. They look lighter, and a little embarrassed about it.`) },
    { label: 'Offer to take a watch off them', ...lift(2, 'You offered to cover for me when I was having a hard time.', `${n} starts to say no, and then does not. "Just the one," ${n} says. It is the first time they have smiled in days.`) },
    { label: '"It will pass."', ...lift(0, null, `${n} nods. "It does," they say. "It just takes its time." You both drink your coffee.`) },
  ] });
  if ((st.injured || {})[p.id]) out.push({ pressing: true, open: `${n} is favoring one side, and has been all watch. They have not asked for anything, and they have not sat down properly in two days.`, choices: [
    { label: 'Ask how it is', ...lift(1, 'You asked how I was, and meant it.', `"It is fine," ${n} says, and then, when you wait, "It is not fine. It is getting better." You nod, and that is enough.`) },
    { label: 'Tell them to rest', ...lift(1, 'You told me to rest, and I did.', `${n} argues for a minute and then goes to their bunk. You can hear them let out a long breath through the bulkhead.`) },
  ] });
  const t = typeof tiesOf === 'function' ? tiesOf(p) : null, w = typeof factionState === 'function' ? factionState().war : null;
  if (t && w && (t.aff === w.a || t.aff === w.b)) { const foe = t.aff === w.a ? w.b : w.a; out.push({ open: `${n} has had the war on the galley screen since it started, the ${t.aff} against the ${foe}, with the sound off. "Do not tell me it will be over soon," ${n} says.`, choices: [
    { label: 'Ask what they think', ...lift(1, 'You asked what I thought about the war.', `${n} thinks about it for a while. "I think I would have stayed home," ${n} says, "and I think I would have been wrong." You do not have anything to add to that.`) },
    { label: 'Ask if they want to go home', ...lift(1, 'You asked if I wanted to go home during the war.', `"Every day," ${n} says. "And then I look at what is on the screen and I think, not like this." They do not sound sure.`) },
    { label: 'Change the subject', ...lift(0, null, `You ask about the food at the last port. ${n} is grateful for that, and says so by going on about it for ten minutes.`) },
  ] }); }
  const others = typeof bond === 'function' ? G.state.crew.filter(id => id !== p.id).map(id => ({ id, p: person(id) })).filter(f => f.p) : [], me = { id: p.id, p };
  const worst = others.map(f => ({ f, b: bond(me, f) })).sort((x, y) => x.b - y.b)[0], best = others.map(f => ({ f, b: bond(me, f) })).sort((x, y) => y.b - x.b)[0];
  if (worst && worst.b <= -2) out.push({ open: `${n} is short with ${worst.f.p.first} all through the meal, and then pretends not to be.`, choices: [
    { label: 'Ask what happened', ...lift(1, `You asked what was wrong between me and ${worst.f.p.first}.`, `${n} says it was nothing, and then says it was the thing at the rota, and then the thing from before. "I do not even like being angry," ${n} says. "It is just there."`) },
    { label: 'Stay out of it', ...lift(0, null, `You say you will not take sides. ${n} nods, a little disappointed, and you finish the coffee talking about something else.`) },
  ] });
  if (best && best.b >= 6) out.push({ open: `${n} laughs at something ${best.f.p.first} said across the galley, and then catches you looking. "We have been through a lot," ${n} says, a little defensively.`, choices: [
    { label: `Ask about ${best.f.p.first}`, ...lift(1, `You asked about ${best.f.p.first}, and I told you.`, `${n} talks about ${best.f.p.first} for a long time: how they met, what ${best.f.p.first} is like on a bad day, the one thing ${n} would never say to their face. It is the warmest part of the watch.`) },
    { label: 'Say you can tell', ...lift(1, null, `"You can tell?" ${n} says. They look pleased, and alarmed. "Do not say anything." You will not.`) },
  ] });
  const mem = p.memories && p.memories.length ? p.memories[p.memories.length - 1].replace(/^(Day \d+|\d+ \w+ \d+): /, '') : null;
  if (mem) out.push({ open: `${n} says, without quite looking at you, that they have been thinking about something: "${mem}"`, choices: [
    { label: 'Bring it up', ...lift(1, 'You brought it up, and I was glad.', `You say you remember it too. ${n} looks up. "I did not think you would," ${n} says. It is quiet for a moment, and then it is easy.`) },
    { label: 'Let it lie', ...lift(0, null, `You let it lie. ${n} nods, and after a minute the talk turns to the next port, and you both pretend that was the point.`) },
  ] });
  return out;
}
function ordinaryTalk(p) {
  const n = p.first, topics = talkTopics(p), tp = topics.length ? pick(topics) : null;
  if (tp) return { title: `With ${n}`, text: tp.open, choices: tp.choices };
  const idle = (p.traits || []).map(t => TALK_IDLE[t]).filter(Boolean);
  return { title: `With ${n}`, text: `You sit with ${n} in the galley, over two mugs. ${n} ${idle.length ? pick(idle) : 'is easy company'}. The drive hums. A pipe ticks.`,
    choices: [
      { label: 'Stay a while', run() { like(p, 1, null); if (moodLow(p)) p.mood.until -= 5; return pick([`The ship hums around you both, steady and warm. Somewhere aft, a door closes. You watch ${n}'s shoulders come down, one careful inch at a time.`, `You do not say much, and neither does ${n}. When you stand to go, ${n} says it was good, and the mug is still warm in your hand.`, `${n} tells you a story about the last ship they were on. It is a small one, and it goes nowhere, and it is the best thing you will hear this week.`]); } },
      { label: `Ask ${n} about ${p.home}`, run() { like(p, 1, null); return `${n} tells you what they miss about ${p.home}, and what they do not. By the end it is hard to say which list is longer.`; } },
    ] };
}

function sitBeat(p, isCrew) {
  const s = storyOf(p), st = G.state, n = p.first;
  // Someone in a bad way (a letter that hurt, an injury) is talked to about that first, once, and then the story goes on where it was.
  const pressKey = moodLow(p) ? `mood:${p.mood.text || p.mood.kind}` : (st.injured || {})[p.id] ? 'hurt' : null;
  if (!pressKey) p.pressed = null;
  else if (p.pressed !== pressKey) {
    const t = talkTopics(p).find(x => x.pressing);
    if (t) { p.pressed = pressKey; return { title: `With ${n}`, text: t.open, choices: t.choices }; }
  }
  // `result` is what happens after: a line, or a list to pick from.
  const talk = (label, likeBy, result, extra) => ({ label, run() {
    like(p, likeBy, null); s.beat++; if (extra) extra();
    const lines = [].concat(result);
    return lines.length > 1 ? pick(lines) : lines[0];
  } });
  if (s.beat > (p.opinion + 1) && s.beat < 4) {
    return { title: `With ${n}`, text: `You sit with ${n} in the galley for a while, over two mugs going cold. They talk about the ship, the food, the noise the recycler makes at night, the next port. It is easy and polite. Whenever the talk drifts toward anything real, ${n} asks about the food, or the next port, or whether you have eaten. Nothing about themselves, not yet.`,
      choices: [{ label: 'That\'s all right', run() { like(p, 1, null); return `You let it be, and finish your coffee, and say nothing about the hole in the floor. Some people take longer, and that is all right too. When you get up to go, ${n} looks up, quickly, with something in their face that might be gratitude, and says, "Thanks for the company." It is more than they have said all week.`; } }] };
  }
  if (s.beat === 0) return { title: `With ${n}`, text: `${n} tells you about ${p.home}: ${s.homeDetail || HOME_DETAIL[cultureOfPerson(p)]}. They turn their mug a quarter turn on the table as they say it. Then, unprompted, they say they left because of ${s.left}, and stop, and drink, and look at you.`,
    choices: [
      talk('Listen', 1, [`You say nothing, and let the silence hold, and ${n} goes on about smaller things: a street, a smell, a name. It is a long while before either of you looks at the clock. At the end ${n} says it is late, and does not get up.`, `${n} talks for most of an hour, and you mostly listen, and, when they run down, they let out a long breath. "I never told anyone that," they say, quietly. "Not aloud."`]),
      talk('Tell them about where you came from', 2, `You tell them something true and small about where you came from, and ${n} listens with their whole face, laughs, and at one point reaches over and steals a bite off your plate. "Everybody out here is from somewhere they left," they say. "It is a little bit of a comfort."`),
    ] };
  if (s.beat === 1) return { title: `With ${n}`, text: `${n} takes something out of a breast pocket, a small worn picture, soft at the edges from handling, and slides it across the table. It shows their ${missed(p)}, squinting into the light, mid-laugh. "We used to talk every day," ${n} says. "Now it is a message every few weeks, with a lag. Half of what I say is out of date before they hear it." They look at the picture for a while. Then they put it back in the pocket and button the flap.`,
    choices: [
      talk('"Tell me about them."', 1, `${n} does, and it takes a long time, and it is not a story so much as a list of small things: how their ${s.rel} hums when they cook, what they say when they lose at cards, the particular way they pronounce the name of a place. By the end, ${n} is smiling, and there are tears in it, and neither of you mentions them.`),
      talk('"You\'ll see them again."', 1, `${n} looks at you for a moment. "You cannot promise that," they say. They take the picture out again and prop it against the sugar tin. "No," they say. "But thank you for saying it."`),
    ] };
  if (s.beat === 2) return { title: `With ${n}`, text: `Late in the watch, when the corridors are dim and the ship is quiet, ${n} admits what they really want: ${s.hope}. They say it in a rush, looking at their hands, and as soon as it is out they laugh, a short laugh that asks you not to laugh with them. Then they go still, and wait, with their shoulders braced.`,
    choices: [
      talk('"It\'s not a stupid thing to want."', 1, `You tell them, plainly, that it is not, and ${n} lets out a long, slow breath. "Nobody has ever said that to me," they say. "They say it is nice, or it is late. They never say it is not stupid." They are quiet for a bit. "I think I needed someone to just say it."`),
      talk('"If I can help, I will."', 2, `You say it simply, and ${n} looks up. "You mean that," they say. Then: "I am going to remember you said it." They refill your mug without being asked.`, () => { s.promised = true; }),
    ] };
  if (s.beat === 3 && isCrew && s.favor) {
    if (s.favor === 'visit') {
      const where = planetNamed(p.home);
      return { title: `A Favor`, text: `${n} comes to find you in the cockpit, and stands in the hatch, twisting the hem of their sleeve, which is not like them. "Could we put in at ${p.home} sometime?" they ask. "I want to see my ${missed(p)} while I still can. It has been too long. I would work the whole trip for nothing, captain, I swear, I would work double, just to see them one time." They stop. Their voice has gone thin. "I have never asked for anything before."`,
        choices: [
          { label: '"We\'ll go."', run() {
            st.missions.push({ id: st.nextId++, type: 'favor', favorPid: p.id, good: 'a promise', tons: 0, destSystem: where.sid, destPlanet: p.home,
              title: `Take ${n} home to ${p.home} to see their ${s.rel}`, pay: 0, deadline: st.day + 150 });
            s.beat = 4;
            like(p, 2, 'The captain promised to take me home.');
            return `${n} does not say anything. For a moment, you are afraid they will cry. Instead, they put a hand on the back of your seat, and squeeze, once, hard, and go out. That night the whole ship smells of something baking, and nobody says why. (It's on your missions list.)`;
          } },
          { label: '"Not yet. But soon."', run: () => `${n} nods. "Soon, then," they say. "I can wait. I have gotten good at it." They do not bring it up again.` },
        ] };
    }
    return { title: 'A Favor', text: `${n} finds you alone, at the end of the watch, and sits down without being asked, hands flat on the table. "I owe ${fmt(s.debt)} cr to people on ${p.home}," they say, all in one breath. "It is the real reason I left. They send messages. I do not open them anymore. I just watch the little number go up." They look at you, at last, with a plain, tired courage. "I am not asking. I just wanted you to know, before you decide whether I am worth what you pay me."`,
      choices: [
        { label: `Pay it off (${fmt(s.debt)} cr)`, can: () => st.credits >= s.debt, run() {
          st.credits -= s.debt;
          s.beat = 4;
          becomeLoyal(p, 'The captain paid off my debt.');
          return `${n} reads the confirmation three times, with their lips moving, and puts the screen face-down on the table, and goes to their bunk. After a while you hear them crying through the bulkhead, and, after a longer while, laughing. In the morning they are making everyone breakfast. They will not look you in the eye, and they will not stop smiling.`;
        } },
        { label: '"I can\'t, not now."', run: () => `"I know," ${n} says. "I did not expect you to." And they mean it, which is the hardest part. They stand, and touch the table once, and go back to work.` },
      ] };
  }
  return ordinaryTalk(p);
}

function becomeLoyal(p, memory) {
  p.loyal = true;
  like(p, 5, memory);
  homeLog(`${p.first} ${p.last} will follow ${shipTitle()} anywhere now.`);
}

function sitPicker() {
  const aboard = [...procedural(), ...paxAboard().filter(m => m.pid && G.state.people[m.pid]).map(m => ({ id: m.pid, p: G.state.people[m.pid], pax: true }))];
  return {
    title: 'Sit With Someone', text: pick([
      'You make two mugs of coffee. Who could use the company?',
      'The galley is empty, and the kettle has just clicked off. Somebody aboard might like a cup.',
      'Between watches, you find yourself with an hour and two mugs. Who gets the second one?',
      'The ship is quiet tonight. You could use the company yourself, and so, maybe, could someone else.',
      'You are carrying a plate of the good biscuits down the corridor. Who is it for?',
    ]),
    choices: aboard.map(f => ({
      label: `${f.p.first} (${f.pax ? 'passenger' : ROLE_NAMES[f.p.role].toLowerCase()})${moodLow(f.p) ? ', having a hard time' : (G.state.injured || {})[f.p.id] ? ', hurt' : ''}`,
      run() { G.nextEvent = sitBeat(f.p, !f.pax); return `You find ${f.p.first} in the galley.`; },
    })),
  };
}

// ---------- birthdays and holidays ----------
const calOf = day => { const d = new Date(START_DATE + (day - 1) * 864e5); return { m: d.getUTCMonth() + 1, d: d.getUTCDate(), y: d.getUTCFullYear() }; };
const birthday = id => { const d = new Date(Date.UTC(2214, 0, 1 + (Math.abs(hash(id + 'bday')) % 365))); return { m: d.getUTCMonth() + 1, d: d.getUTCDate() }; };
const HOLIDAYS = [
  { m: 3, d: 12, name: 'Landing Day', culture: 'mars', text: '{n} is up before the watch change, kneading dough with a fierce, focused joy, and the galley smells of hot, spiced, red-tinted bread. It is Landing Day, when the first colonists set down on Mars, and {n} has been baking for it every year of their life, from a recipe that came from a grandmother they can barely remember. They are already arguing with nobody in particular about the terraforming schedule, jabbing a floury finger at the air.', join: 'The bread is dense and far too spicy, and everyone eats it anyway, with tears in their eyes and hands out for more. The argument about the terraforming schedule lasts until the flip, with three factions and one point of order, and everyone has a side, and nobody, in the end, wins.' },
  { m: 7, d: 20, name: 'Tranquility Night', culture: 'earth', text: '{n} has the old footage of the first Moon landing queued up on the galley screen, the grainy black-and-white version, with the crackle of the old radio. On Earth and Luna everyone watches it tonight, all together, at the same hour, even though they have all seen it a hundred times. {n} sets out cups of something warm, dims the lights, and says that it is not the same without company.', join: 'Two people in bulky suits bounce across gray dust, centuries ago, and a voice, tiny and tinny and calm, says the words. Nobody on the ship says anything for a while. When the picture fades, {n} wipes their eyes. In the dark someone begins to hum.' },
  { m: 8, d: 2, name: 'First Water', culture: 'belt', text: 'It is First Water, the day the first ice reached Ceres, and the oldest, quietest holiday in the Belt. {n} fills a cup from the ship\'s tank, slowly, without spilling a drop, and sets it on the galley table, and passes it around: each person drinks, and says the name of someone they have lost. It is not a happy day. It is not meant to be. It is the day that a people remember what they nearly did not survive.', join: 'The cup goes around twice, in silence, warm from many hands. Some of the names you know. Most you don\'t. When it is your turn, you find you have a name, too, after all, and you say it aloud, and the room, which was waiting, lets out a breath.' },
  { m: 12, d: 31, name: 'Year\'s End', culture: null, text: 'It is the last night of {year}. {n} has strung lights across the galley, and cobbled together a table out of crates, and set out every bottle on the ship, and, in the middle, a single cake made of ration bars and hope. They are counting down to a midnight that means nothing out here, where there is no sunrise and no season, and everything, in the way that small bright rituals do.', join: 'Everyone counts down together, in a ragged, cheerful roar, with the last ten seconds shouted in unison. At zero, somebody cries, somebody laughs, somebody kisses somebody, and the ship hums on, warm and steady, into the new year, carrying you all.' },
  { m: 12, d: 21, name: 'The Long Night', culture: 'earth', text: '{n} tells you that, back on Earth, it is the longest night of the year, and that, where they grew up, the old people stayed up all through it, with candles, telling stories to keep the dark at bay. They have set out a single candle, real wax, saved for the purpose, in a jar in the middle of the galley table. "It is silly out here," they say, "where every night is the longest. But I would like to keep it."', join: 'You sit, all of you, in a ring around the candle, and, one by one, tell a story. Some are funny. Some are sad. Some are not stories at all, just a few careful sentences about a place or a person. The candle burns down, and nobody moves. It gutters.' },
  { m: 10, d: 9, name: 'Dome Day', culture: 'mars', text: '{n} is polishing a small brass plaque, worn smooth at the edges, that was, they say, cut from the first dome on Mars, three hundred years ago. It is Dome Day, and They have hung a strip of red-dyed cloth over the galley hatch, and there is, for some reason, a small potted fern on the table.', join: 'You raise a glass to the domes, and to the people who built them, and to the fools who thought a dead world could be made to breathe. {n} makes a short, awkward, moving speech, and forgets the end of it, and everyone claps anyway. The fern is declared the ship\'s mascot.' },
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
      title: `${n}'s Birthday`, text: `It is ${dateOf(o.day)}, and it is ${n}'s birthday. ${pick([`${n} hasn't mentioned it. All week, ${n} has been somewhere near the galley whenever anyone is in it.`, `${n} mentioned it once, weeks ago, in passing. At every meal since, ${n} has been busy with something on the far side of the galley.`, `${n} says birthdays are for dirtsiders. They have said it twice this morning, too loudly, and have, for some reason, put on their good jacket.`, `${n} woke up early, and cleaned the galley, and is now sitting straight at the table, with a clean mug set out at every place.`])}`,
      choices: [
        { label: 'Throw a party in the galley', run() { like(p, 2, `The crew threw me a birthday party aboard ${shipTitle()}.`); homeLog(`A birthday party for ${n}.`); return warm(1, `Somebody makes a cake out of ration bars and a candle out of a welding stub, and somebody else finds a bottle no one admits to hiding. The whole ship crowds into the galley to sing, off-key and enthusiastically, and ${n}, who was going to be cool about it, laughs until they cry, and blows out the welding stub on the third try.`)(); } },
        { label: 'Give them something from the cargo (1t luxury goods)', can: () => (st.cargo.luxury || 0) >= 1, run() {
          st.cargo.luxury -= 1;
          like(p, 3, 'The captain remembered my birthday.');
          return `${n} unwraps it slowly, saving the paper. When they see what it is, they go still. They do not say anything for a moment. Then they set it on the shelf by their bunk, and keep it there for the rest of the trip. More than once you see them stop and look at it.`;
        } },
        { label: 'A quiet word and a drink', run() { like(p, 1, null); return `You find ${n} alone in the galley, and set down two cups, and say the words, plainly. "You remembered," they say, and look at the cup. You sit together and drink and say little.`; } },
      ],
    };
  }
  const h = o.h, fillH = t => t.replace(/\{n\}/g, n).replace(/\{year\}/g, o.year);
  return {
    title: h.name, text: fillH(h.text),
    choices: [
      { label: 'Everyone joins in', run() { like(p, 2, `We kept ${h.name} aboard ${shipTitle()}.`); homeLog(`Kept ${h.name} aboard.`); return warm(1.2, fillH(h.join))(); } },
      { label: `Let ${n} mark it their own way`, run: () => `${n} nods, and thanks you, and marks it alone in their bunk, with the curtain drawn. You hear music through the bulkhead, something old, from home, and, once, a laugh. In the morning they are cheerful, and nobody asks.` },
    ],
  };
}

// ---------- letters from home ----------
const GOOD_NEWS = ['{who} got into the engineering academy on Ceres', '{who} had a baby, a girl, healthy and loud', '{who} finally paid off the family\'s water debt', '{who} sent a photo of the whole family at one table, laughing', '{who} was promoted, after nine years, to shift foreman', '{who} planted the first real tomatoes in the family\'s section, and they came up red', '{who} got a berth on a ship bound for the outer moons, and is thrilled', '{who} recovered from a long illness, and is walking again', '{who} won a little money on the ring-ball pool, and is buying everyone a round', '{who} sent a letter that said only "I am proud of you," and nothing else', '{who} passed the pilot exam on the third try', '{who} moved into a bigger section, with a window', '{who} got the loan for the shop, and the sign goes up on Monday', '{who} sent the first picture of a new dog, a brown one, asleep on a boot', 'the strike at the foundry on {home} is over, and {who} is back on full shifts', 'the water ration on {home} was lifted'];
const BAD_NEWS = ['{who} is sick, and the clinic on {home} wants money up front', '{who} lost their job when the mine cut shifts', 'the section where {who} lives is on emergency rationing', '{who} has stopped answering messages, and nobody at home will say why', '{who} was hurt in an accident at work, and it is not clear how badly', 'the family\'s cabin was flooded when a pipe burst, and everything is gone', '{who} is being evicted, and has nowhere to go', '{who} has been arrested at a protest, and nobody knows for how long', 'an old friend of {who}\'s passed away, and the funeral is next week', '{who} says the recyclers on {home} are failing, and the water tastes wrong', 'the clinic on {home} is closing, and {who} has to travel two days for treatment', '{who} broke a leg in the market and cannot work for six weeks', 'there was a fire in the section where {who} lives, and they are in a shelter', '{who} has been laid off, and the severance has not come', 'the school where {who} teaches is closing at the end of the term', '{who} left a message that says only "call when you can," and the line does not connect'];

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
    const news = storyOf(p).news, pool = news ? (good ? news.good : news.bad) : (good ? GOOD_NEWS : BAD_NEWS);  // an authored person's own news, or the generic
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
        { label: 'Break out something to celebrate', run() { for (const [a, b] of pairs(folk())) addBond(a, b, 0.8); like(p, 1, null); return pick(['You break out the good bottle. Within the hour everyone who is not on watch is in the galley, and everyone has a toast. Someone finds the guitar, which has two strings. It goes past midnight. Nobody mentions the watch bill.', `You open the locker and put out whatever the ship has. Cards come out, and the cook brings tomorrow's noodles forward a day. ${n} tells the story three times, and the story changes each time. The galley is full until the watch bell.`, `You call the galley to order with a spoon on a pot. Everyone off watch comes. The cook finds a cake mix at the back of the cupboard and makes it in the pressure pan. It comes out flat. It is eaten.`]); } },
        { label: '"That\'s wonderful."', run() { like(p, 1, null); return pick([`${n} shows you the picture. A minute later ${n} shows you again. "I keep wanting to tell someone," ${n} says, and laughs.`, `"Tell me all of it," you say, and ${n} does, from the start, with the dates. At the end ${n} goes back to the part about the street and tells that again.`, `You read it over ${n}'s shoulder. "Send them something," you say. ${n} sends a line from the bridge console and watches the relay clock for the next hour.`]); } },
      ] };
  }
  const others = procedural().filter(f => f.p !== p && bond(f, { id: p.id }) >= 1);
  const choices = [
    { label: 'Sit with them', run() { like(p, 2, 'The captain sat with me when the news from home was bad.'); p.mood.until -= 10; return pick([`You do not fix anything. You stay in the galley with a pot of tea going cold while ${n} looks at the wall. After a time ${n} starts talking, low, about the person and the place and the years. When they get up, they touch your shoulder on the way out.`, `You bring two cups to the cargo bay and sit on a crate. ${n} does not talk for a while. When ${n} does, it is about the street they grew up on and a night in the market. You stay until the watch bell, and ${n} says thank you at the hatch.`, `You sit on the other side of the galley table and do not look at the terminal. ${n} tells you what the section was like before the cuts. It takes an hour. At the end ${n} washes both cups.`]); } },
    { label: 'Advance them 500 cr to send home', can: () => st.credits >= 500, run() { st.credits -= 500; like(p, 3, 'The captain advanced me money to send home.'); p.mood.until = st.day; return pick([`${n} sends it at the next relay with a short message. For two days ${n} checks the terminal every few minutes. When the reply comes, ${n} reads it aloud in the galley. "They are all right," ${n} says. "They are all right." They sit down.`, `${n} sends it from the bridge console with two lines. The reply is nine hours behind the question. When it comes, ${n} reads it standing at the console and says nothing until the end. "They are all right," ${n} says. The next watch ${n} is early.`, `${n} will not take it at first. Then ${n} says it comes out of the pay, all of it, and sends it with the evening relay. Two days later the reply comes. ${n} reads it twice in the galley and puts the terminal in a pocket. They stay for dinner.`]); } },
  ];
  if (others.length) {
    const o = pick(others);
    choices.push({ label: `Ask ${o.p.first} to look in on them`, run() { addBond(o, { id: p.id, p }, 2); like(p, 1, null); p.mood.until -= 5; return pick([`${o.p.first} takes ${n} a mug of something hot and sits down beside them on the crate by the galley wall. ${o.p.first} does not speak. They are still there two hours later. Through the hatch you see two heads close together. Once, ${n}'s shoulders shake.`, `${o.p.first} finds ${n} in the cargo bay, sits down on the next crate, opens a ration bar and hands half across. They eat without talking. At the watch bell they go forward together.`, `${o.p.first} takes ${n}'s next hour at the console without being asked. ${n} sits with the terminal on their knees and does not look at it. When ${o.p.first} comes back for the cup, ${n} says something, and ${o.p.first} nods.`]); } });
  }
  choices.push({ label: 'Give them space', run: () => pick([`${n} goes to their bunk. You hear the terminal, faintly, and later nothing. Their work suffers for a time: a missed step, a cold cup. (Their skill counts one lower until they feel better.)`, `${n} takes the cargo bay for the rest of the watch and does the manifest twice. You leave the door open. A missed step shows up in the log the next day, and ${n} corrects it before anyone asks. (Their skill counts one lower until they feel better.)`]) });
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
    line: () => pick(['[Ship] The flip toast: "Halfway to somewhere." Everyone drinks.', '[Ship] At the flip, cups go up all through the ship, and a quiet, ragged chorus: "Halfway to somewhere."', '[Ship] The flip comes, and the ship turns, and someone raises a bulb: "Halfway to somewhere." Nobody says no.']) },
  'first-meal': { name: 'first-night noodles', moment: 'start', propose: '{n} cooks for everyone on the first night out, a huge, clattering pot of noodles and broth and chili, with the lid steaming and a small paper bag of scallions torn open on the counter. They ladle it out with a wooden spoon, one bowl at a time, without a word. When the last bowl is full they look around the table and say: "Tradition. Starting now."',
    line: () => pick(['[Ship] First night out, and the galley smells of noodles. Tradition.', '[Ship] The first-night noodles are on, and the whole ship is queuing with bowls, in a cheerful, hungry line.', '[Ship] Noodles again, first night out. Somebody says it wouldn\'t feel like a burn without them.']) },
  'burn-name': { name: 'naming the burn', moment: 'start', propose: '{n} says every burn deserves a name, in the way that every storm deserves a name, and, ideally, every mistake. They have a marker, and a large sheet of paper taped to the galley wall. They write, in tall block letters, and propose calling this one "{b}".',
    line: () => `[Ship] By unanimous vote, this burn is called "${pick(BURN_NAMES)}".` },
  'docking-song': { name: 'the docking song', moment: 'end', propose: '{n} starts singing an old work song from {home} on final approach, softly at first, mostly to themselves, a slow, rolling tune about hauling, and home, and the long way round. By the second verse, someone is harmonizing, and by the third, half the ship has joined in, off-key and untroubled, and somebody is keeping time on a pipe with a wrench.',
    line: () => pick(['[Ship] Final approach, and everyone is singing the docking song, badly and with feeling.', '[Ship] The docking song starts up in the galley, and spreads through the ship, verse by verse, like weather.', '[Ship] Somebody starts the docking song, and, in the cockpit, the pilot, who swore he would not, is humming along.']) },
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
      { label: 'Make it a tradition', run() { h.traditions.push(id); homeLog(`Started ${T.name}.`); for (const [a, b] of pairs(folk())) addBond(a, b, 1); like(f.p, 1, null); return `You say the words, and nobody speaks for a second, and then somebody laughs, and it is done. It sticks. From now on, ${T.name} is part of life aboard ${shipTitle()}.`; } },
      { label: 'Just this once', run: () => 'You say yes to the moment and no to the promise. Nobody makes a fuss. It\'s a good moment. It doesn\'t have to be more than that.' },
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
    title: 'Stowaway', text: `There is a cat in the cargo lock: skinny, gray, one torn ear, a kinked tail, and completely unimpressed by you. It is sitting on the top of a crate, washing one paw, with the air of a small, ancient, extremely tired landlord. When you open the inner hatch it looks up, unhurried, and gives you a long, level stare, and goes back to its paw.`,
    choices: [
      ...names.map((nm, i) => ({ label: `"${nm}," suggests ${voters[i]}`, run() {
        h.cat = nm;
        homeLog(`${nm} the cat came aboard at ${G.state.planet}.`);
        for (const f of crewPeople()) likeAmbient(f.p, 1, null);
        return `${nm} it is. The cat, for its part, does not acknowledge the name, or the vote, or the existence of the arrangement. By the time you take off, ${nm} has found the warmest spot on the ship, which is on the reactor housing, and has curled into a perfect gray circle, one ear twitching. Somebody puts a saucer of milk down, and somebody else makes a small bed out of a folded jacket.`;
      } })),
      { label: 'Put it back on the dock', run: () => 'You carry it back down the ramp, in both hands, and set it on the dock, and it gives you a look you will remember for a long time, a long, level, wholly unsurprised stare, and walks off, with its tail high. Nobody on the crew speaks to you for an hour. Somewhere, in the distance, a small, imperious meow.' },
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
    title: 'One More Berth', text: `The trip is over, and the other passengers have gone ashore, but ${p.first} ${p.last} lingers at the airlock with their bag, a battered, over-stuffed thing that has, over the burn, become oddly familiar. They shift it from hand to hand. They look at the deck, and at the hatch, and at you, and back at the deck. "I've been thinking," they say at last, in a rush. "I don't really have anywhere I need to be. And I like it here. I like all of you. Could ${shipTitle()} use a ${ROLE_NAMES[role].toLowerCase()}?" They hold your eye, bravely, and wait, braced for either answer.`,
    choices: [
      { label: 'Welcome aboard', can: () => berthsFree() > 0, run() {
        Object.assign(p, { role, skill: randInt(1, 2), location: null });
        p.wage = Math.round(ROLE_WAGE[role] * (0.6 + 0.3 * p.skill));
        st.crew.push(p.id);
        like(p, 2, `I signed on with ${shipTitle()}.`);
        homeLog(`${p.first} ${p.last} came aboard as a passenger and stayed as crew.`);
        return `${p.first} lets out a breath so long it is almost a laugh, and drops their bag in the same bunk as before, with a thump. "Same one," they say. "It's lucky." Somebody, in the galley, starts to clap. (They join as your ${ROLE_NAMES[role].toLowerCase()}.)`;
      } },
      { label: '"Not this time."', run: () => `"I understand," ${p.first} says, quickly, with a brave, bright smile that does not entirely work. "Really. If you ever need someone..." They write their contact code on the back of your hand, in pen, since they do not seem to have paper, wave, shoulder their bag, and go down the ramp. You watch them all the way to the end of the dock, and, at the corner, they turn, and lift a hand, and are gone.` },
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
  return `<h3>${h.name[0].toUpperCase()}${h.name.slice(1)}</h3>
    ${hired() ? '' : '<div class="row"><input type="text" id="shipName" maxlength="30" placeholder="A new name for the ship"><button data-action="renameShip">Rename the ship</button></div>'}
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
