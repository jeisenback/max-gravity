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
  // `result` is what happens after: a line, or a list to pick from.
  const talk = (label, likeBy, result, extra) => ({ label, run() {
    like(p, likeBy, null); s.beat++; if (extra) extra();
    const lines = [].concat(result);
    return lines.length > 1 ? pick(lines) : lines[0];
  } });
  if (s.beat > (p.opinion + 1) && s.beat < 4) {
    return { title: `With ${n}`, text: `You sit with ${n} in the galley for a while, over two mugs going cold. They talk about the ship, the food, the noise the recycler makes at night, the next port. It is easy, polite, and entirely on the surface. Whenever the talk drifts toward anything real, ${n} finds a new subject, smoothly, like a person stepping around a hole in the floor. Not about themselves, not yet.`,
      choices: [{ label: 'That\'s all right', run() { like(p, 1, null); return `You let it be, and finish your coffee, and say nothing about the hole in the floor. Some people take longer, and that is all right too. When you get up to go, ${n} looks up, quickly, with something in their face that might be gratitude, and says, "Thanks for the company." It is more than they have said all week.`; } }] };
  }
  if (s.beat === 0) return { title: `With ${n}`, text: `${n} tells you about ${p.home}, slowly, as if turning a stone over to look at the underside: ${HOME_DETAIL[cultureOfPerson(p)]}. They tell it with a small, fond smile that never quite settles. Then, unprompted, they say they left because of ${s.left}, and stop, and drink, and look at you to see what you will do with that.`,
    choices: [
      talk('Listen', 1, [`You say nothing, and let the silence hold, and ${n} goes on, a little at a time, about smaller things: a street, a smell, a name. It is a long while before either of you looks at the clock. ${n} smiles, a little, at the end, like someone who has set down a bag.`, `${n} talks for most of an hour, and you mostly listen, and, when they run down, they let out a breath they seem to have been keeping for years. "I never told anyone that," they say, quietly. "Not aloud."`]),
      talk('Tell them about where you came from', 2, `You tell them something true and small about where you came from, and ${n} listens with their whole face, and laughs in the right places, and, at one point, reaches over and steals a bite off your plate. "Everybody out here is from somewhere they left," they say. "It is a little bit of a comfort."`),
    ] };
  if (s.beat === 1) return { title: `With ${n}`, text: `${n} takes something out of a breast pocket, a small worn picture, soft at the edges from handling, and slides it across the table. It shows their ${missed(p)}, squinting into the light, mid-laugh. "We used to talk every day," ${n} says. "Now it is a message every few weeks, with a lag. Half of what I say is out of date before they hear it." They look at the picture a long time before putting it away, very carefully, as though it might bruise.`,
    choices: [
      talk('"Tell me about them."', 1, `${n} does, and it takes a long time, and it is not a story so much as a list of small things: how their ${s.rel} hums when they cook, what they say when they lose at cards, the particular way they pronounce the name of a place. By the end, ${n} is smiling, and there are tears in it, and neither of you mentions them.`),
      talk('"You\'ll see them again."', 1, `${n} looks at you for a moment, and something in their face is at war with itself. "You cannot promise that," they say, gently. But they do not take it back, either, and they slip the picture out again, and look at it, with a small, private, stubborn hope. "No," they say. "But thank you for saying it."`),
    ] };
  if (s.beat === 2) return { title: `With ${n}`, text: `Late in the watch, when the corridors are dim and the ship is quiet, ${n} admits what they really want: ${s.hope}. They say it in a rush, looking at their hands, and, as soon as it is out, they laugh at themselves, a short, embarrassed laugh, the kind that means please do not laugh with me. Then they go still, and wait, with their shoulders very slightly braced.`,
    choices: [
      talk('"It\'s not a stupid thing to want."', 1, `You tell them, plainly, that it is not, and ${n} lets out a long, slow breath. "Nobody has ever said that to me," they say. "They say it is nice, or it is late. They never say it is not stupid." They are quiet for a bit. "I think I needed someone to just say it."`),
      talk('"If I can help, I will."', 2, `You say it simply, without any flourish, and ${n} looks up, startled, as if you had handed them something heavy and precious. "You mean that," they say. It is not quite a question. Then, softly: "I am going to remember you said it." They do not say anything more, and they do not need to.`, () => { s.promised = true; }),
    ] };
  if (s.beat === 3 && isCrew) {
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
          { label: '"Not yet. But soon."', run: () => `${n} nods, and the light in their face goes down a little, like a lamp turned low, but does not go out. "Soon, then," they say. "I can wait. I have gotten good at it." They do not bring it up again, and you feel, every day, the weight of having asked them to be patient.` },
        ] };
    }
    return { title: 'A Favor', text: `${n} finds you alone, at the end of the watch, and sits down without being asked, hands flat on the table. "I owe ${fmt(s.debt)} cr to people on ${p.home}," they say, all in one breath. "It is the real reason I left. They send messages. I do not open them anymore. I just watch the little number go up." They look at you, at last, with a plain, tired courage. "I am not asking. I just wanted you to know, before you decide whether I am worth what you pay me."`,
      choices: [
        { label: `Pay it off (${fmt(s.debt)} cr)`, can: () => st.credits >= s.debt, run() {
          st.credits -= s.debt;
          s.beat = 4;
          becomeLoyal(p, 'The captain paid off my debt.');
          return `${n} reads the confirmation three times, with their lips moving, and puts the screen face-down on the table, very gently, as if it were asleep. Then they go to their bunk. After a while you hear them crying, and, after a longer while, laughing, and, in the morning, they are making everyone breakfast, and will not look you in the eye, and will not stop smiling.`;
        } },
        { label: '"I can\'t, not now."', run: () => `"I know," ${n} says. "I did not expect you to." And they mean it, which is the hardest part. They stand, and touch the table once, and go back to work, and, for days, you carry the small, quiet weight of a debt that is not yours, and that you could have paid.` },
      ] };
  }
  return { title: `With ${n}`, text: `You sit with ${n} in the quiet, and neither of you needs to say much. The drive hums. A pipe ticks. ${moodLow(p) ? 'They are still carrying the news from home, and it shows around the eyes, but it is lighter with company, and, now and then, a small breath of a laugh comes out of them, like steam.' : 'It is a good, quiet hour, the kind that does not ask anything of anyone, and it settles over the galley like a blanket.'}`,
    choices: [{ label: 'Stay a while', run() { like(p, 1, null); if (p.mood && p.mood.kind === 'low') p.mood.until -= 5; return `The ship hums around you both, steady and warm. Somewhere aft, a door closes. You watch ${n}\'s shoulders come down, one careful inch at a time, and, when you finally stand to go, ${n} says, softly, "Same time tomorrow?" and you find that you would like that.`; } }] };
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
  { m: 3, d: 12, name: 'Landing Day', culture: 'mars', text: '{n} is up before the watch change, kneading dough with a fierce, focused joy, and the galley smells of hot, spiced, red-tinted bread. It is Landing Day, when the first colonists set down on Mars, and {n} has been baking for it every year of their life, from a recipe that came from a grandmother they can barely remember. They are already arguing with nobody in particular about the terraforming schedule, jabbing a floury finger at the air.', join: 'The bread is dense and far too spicy, and everyone eats it anyway, with tears in their eyes and hands out for more. The argument about the terraforming schedule lasts until the flip, with three factions and one point of order, and everyone has a side, and nobody, in the end, wins.' },
  { m: 7, d: 20, name: 'Tranquility Night', culture: 'earth', text: '{n} has the old footage of the first Moon landing queued up on the galley screen, the grainy black-and-white version, with the crackle of the old radio. On Earth and Luna everyone watches it tonight, all together, at the same hour, even though they have all seen it a hundred times. {n} sets out cups of something warm, dims the lights, and says, a little shyly, that it is not the same without company.', join: 'Two people in bulky suits bounce across grey dust, centuries ago, and a voice, tiny and tinny and calm, says the words. Nobody on the ship says anything for a while. When the picture fades, {n} wipes their eyes, and, in the dark, someone begins, very softly, to hum.' },
  { m: 8, d: 2, name: 'First Water', culture: 'belt', text: 'It is First Water, the day the first ice reached Ceres, and the oldest, quietest holiday in the Belt. {n} fills a cup from the ship\'s tank, slowly, without spilling a drop, and sets it on the galley table, and passes it around: each person drinks, and says the name of someone they have lost. It is not a happy day. It is not meant to be. It is the day that a people remember what they nearly did not survive.', join: 'The cup goes around twice, in silence, warm from many hands. Some of the names you know. Most you don\'t. When it is your turn, you find you have a name, too, after all, and you say it aloud, and the room, which was waiting, lets out a breath.' },
  { m: 12, d: 31, name: 'Year\'s End', culture: null, text: 'It is the last night of {year}. {n} has strung lights across the galley, and cobbled together a table out of crates, and set out every bottle on the ship, and, in the middle, a single cake made of ration bars and hope. They are counting down to a midnight that means nothing out here, where there is no sunrise and no season, and everything, in the way that small bright rituals do.', join: 'Everyone counts down together, in a ragged, cheerful roar, with the last ten seconds shouted in unison. At zero, somebody cries, somebody laughs, somebody kisses somebody, and the ship hums on, warm and steady, into the new year, carrying you all.' },
  { m: 12, d: 21, name: 'The Long Night', culture: 'earth', text: '{n} tells you that, back on Earth, it is the longest night of the year, and that, where they grew up, the old people stayed up all through it, with candles, telling stories to keep the dark at bay. They have set out a single candle, real wax, saved for the purpose, in a jar in the middle of the galley table. "It is silly out here," they say, "where every night is the longest. But I would like to keep it."', join: 'You sit, all of you, in a ring around the candle, and, one by one, tell a story. Some are funny. Some are sad. Some are not stories at all, just a few careful sentences about a place or a person. The candle burns down, and nobody moves, and, when it gutters, the dark, for once, feels almost friendly.' },
  { m: 10, d: 9, name: 'Dome Day', culture: 'mars', text: '{n} is polishing a small brass plaque, worn smooth at the edges, that was, they say, cut from the first dome on Mars, three hundred years ago. It is Dome Day, and {n} is a little bit solemn, and a little bit giddy, and completely unwilling to admit either. They have hung a strip of red-dyed cloth over the galley hatch, and there is, for some reason, a small potted fern on the table.', join: 'You raise a glass to the domes, and to the people who built them, and to the fools who thought a dead world could be made to breathe. {n} makes a short, awkward, moving speech, and forgets the end of it, and everyone claps anyway. The fern, somehow, is declared the ship\'s mascot.' },
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
      title: `${n}'s Birthday`, text: `It is ${dateOf(o.day)}, and it is ${n}'s birthday. ${pick([`${n} hasn't mentioned it, and has, all week, been acting like a person who very much hopes no one will notice, and very much hopes someone will.`, `${n} mentioned it once, weeks ago, in passing, and is now pretending, with great effort, not to hope anyone remembered. They have made a very elaborate show of being busy at every meal.`, `${n} says birthdays are for dirtsiders. They have said it twice this morning, a little too loudly, and have, for some reason, put on their good jacket.`, `${n} woke up early, and cleaned the galley, and is now sitting very straight at the table, with the studied calm of a person who is waiting for something and will deny it.`])}`,
      choices: [
        { label: 'Throw a party in the galley', run() { like(p, 2, `The crew threw me a birthday party aboard ${shipTitle()}.`); homeLog(`A birthday party for ${n}.`); return warm(1, `Somebody makes a cake out of ration bars and a candle out of a welding stub, and somebody else finds a bottle no one admits to hiding. The whole ship crowds into the galley to sing, off-key and enthusiastically, and ${n}, who was going to be cool about it, laughs until they cry, and blows out the welding stub on the third try.`)(); } },
        { label: 'Give them something from the cargo (1t luxury goods)', can: () => (st.cargo.luxury || 0) >= 1, run() {
          st.cargo.luxury -= 1;
          like(p, 3, 'The captain remembered my birthday.');
          return `${n} unwraps it slowly, a little at a time, saving the paper, and, when they see what it is, goes very still. They do not say anything for a moment. Then they set it on the shelf by their bunk, and keep it there for the rest of the trip, where the light catches it, and, more than once, you see them stop and look.`;
        } },
        { label: 'A quiet word and a drink', run() { like(p, 1, null); return `You find ${n} alone in the galley, and set down two cups, and say the words, plainly, and a small, rueful smile spreads across their face. "You remembered," they say. They look pleased and embarrassed in equal measure, and, for a while, you sit together in an easy, warm quiet, and drink, and say very little, which is exactly right.`; } },
      ],
    };
  }
  const h = o.h, fillH = t => t.replace(/\{n\}/g, n).replace(/\{year\}/g, o.year);
  return {
    title: h.name, text: fillH(h.text),
    choices: [
      { label: 'Everyone joins in', run() { like(p, 2, `We kept ${h.name} aboard ${shipTitle()}.`); homeLog(`Kept ${h.name} aboard.`); return warm(1.2, fillH(h.join))(); } },
      { label: `Let ${n} mark it their own way`, run: () => `${n} nods, and thanks you, with a kind of quiet relief, and marks it alone in their bunk, with the curtain drawn. You hear music through the bulkhead, soft and old, something from home, and, once, a soft, private laugh. In the morning, they are cheerful, and a little bit lighter, and nobody asks.` },
    ],
  };
}

// ---------- letters from home ----------
const GOOD_NEWS = ['{who} got into the engineering academy on Ceres', '{who} had a baby, a girl, healthy and loud', '{who} finally paid off the family\'s water debt', '{who} sent a photo of the whole family at one table, laughing', '{who} was promoted, after nine years, to shift foreman', '{who} planted the first real tomatoes in the family\'s section, and they came up red', '{who} got a berth on a ship bound for the outer moons, and is thrilled', '{who} recovered from a long illness, and is walking again', '{who} won a little money on the ring-ball pool, and is buying everyone a round', '{who} sent a letter that said only "I am proud of you," and nothing else'];
const BAD_NEWS = ['{who} is sick, and the clinic on {home} wants money up front', '{who} lost their job when the mine cut shifts', 'the section where {who} lives is on emergency rationing', '{who} has stopped answering messages, and nobody at home will say why', '{who} was hurt in an accident at work, and it is not clear how badly', 'the family\'s cabin was flooded when a pipe burst, and everything is gone', '{who} is being evicted, and has nowhere to go', '{who} has been arrested at a protest, and nobody knows for how long', 'an old friend of {who}\'s passed away, and the funeral is next week', '{who} says the recyclers on {home} are failing, and the water tastes wrong'];

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
    return { title: 'Good News', text: `${n} comes into the galley at a near-run, waving their terminal over their head like a flag: ${news.text}. They cannot stop grinning, and they cannot quite stand still, and they keep starting a sentence and losing it in the middle, and beginning again, in a bubbling, breathless, rising tone. It is the first time you have seen them look their real age.`,
      choices: [
        { label: 'Break out something to celebrate', run() { for (const [a, b] of pairs(folk())) addBond(a, b, 0.8); like(p, 1, null); return 'You break out the good stuff, and, within minutes, the whole ship has crowded into the galley, in a warm, laughing crush. Good news travels fast in a small space, and, by the second round, everyone has a toast, and somebody has dug out the old guitar. It goes well past midnight, and, for once, nobody mentions the schedule.'; } },
        { label: '"That\'s wonderful."', run() { like(p, 1, null); return `${n} beams, and shows you the picture, and then, a moment later, shows you again, and again, as though you might have missed something. You say the right things, and mean them, and it costs you nothing at all, and it means, you can tell, the world. "I keep wanting to tell someone," ${n} says, and laughs at themselves, delighted.`; } },
      ] };
  }
  const others = procedural().filter(f => f.p !== p && bond(f, { id: p.id }) >= 1);
  const choices = [
    { label: 'Sit with them', run() { like(p, 2, 'The captain sat with me when the news from home was bad.'); p.mood.until -= 10; return `You do not fix anything. You just stay, in the galley, with a pot of tea gone cold, while ${n} looks at the wall. It is a long silence, and you let it be one. After a while, ${n} starts talking, in a low, stumbling voice, about the person and the place and the years, and that helps. It does not fix it, but it helps, and, when they finally rise, they touch your shoulder on the way out.`; } },
    { label: 'Advance them 500 cr to send home', can: () => st.credits >= 500, run() { st.credits -= 500; like(p, 3, 'The captain advanced me money to send home.'); p.mood.until = st.day; return `${n} sends it at the next relay, with a short, stiff, grateful message, and, for two days, waits, pacing, checking their terminal every few minutes. The reply, when it comes, is short, and warm, and slightly damp with tears, and ${n} reads it out loud to everyone, in the galley, in a voice that shakes only a little. "They are all right," ${n} says. "They are all right." They sit down.`; } },
  ];
  if (others.length) {
    const o = pick(others);
    choices.push({ label: `Ask ${o.p.first} to look in on them`, run() { addBond(o, { id: p.id, p }, 2); like(p, 1, null); p.mood.until -= 5; return `${o.p.first} takes ${n} a mug of something hot, without a word, and sits down beside them, close, on the crate by the galley wall, and does not leave for two hours. You see them through the hatch: a small, quiet ring of light in the dim, and two heads bent together, and, once, ${n}'s shoulders shaking. It is not what you could have done, and it is exactly what was needed.`; } });
  }
  choices.push({ label: 'Give them space', run: () => `${n} nods, without a word, and keeps to their bunk. You hear the faint, faraway sound of their terminal, and, later, nothing. Their work suffers for a while, a missed step here, a cold cup there, and you feel, at every one of them, the weight of a hard, respectful silence. (Their skill counts one lower until they feel better.)` });
  return { title: 'Bad News', text: `${n} has been quiet since the last port, quieter than you have ever seen them, and it is not the comfortable kind. They go through the motions of the watch, and eat without tasting, and stare, more than once, at nothing at all. The message was from their ${missed(p)}: ${news.text}. They have not told anyone. You only know because you saw the screen, over their shoulder, in the corridor, and you have not been able to un-see it.`, choices };
}

// ---------- traditions ----------
const BURN_NAMES = ['The Long Sulk', 'Operation Soup', 'Tuesday Forever', 'Nobody Touch Anything', 'The Great Coffee Shortage', 'Probably Fine', 'Second Breakfast', 'Hold My Drink'];
const TRADITIONS = {
  'flip-toast': { name: 'the flip toast', moment: 'flip', propose: '{n} raises a bulb of something strong as the ship turns end over end, and the stars wheel silently past the viewport, and, in a clear, unhurried voice, says: "To the flip. Halfway to somewhere." Everyone in the room looks at you, waiting, with the bright, hopeful, slightly nervous expression of people who want a thing to become real.',
    line: () => pick(['[Ship] The flip toast: "Halfway to somewhere." Everyone drinks.', '[Ship] At the flip, cups go up all through the ship, and a quiet, ragged chorus: "Halfway to somewhere."', '[Ship] The flip comes, and the ship turns, and someone raises a bulb: "Halfway to somewhere." Nobody says no.']) },
  'first-meal': { name: 'first-night noodles', moment: 'start', propose: '{n} cooks for everyone on the first night out, a huge, clattering pot of noodles and broth and chili, with the lid steaming and a small paper bag of scallions torn open on the counter. They ladle it out with a wooden spoon, one bowl at a time, without a word, and, when the last bowl is full, they look around the table, at everyone, and say: "Tradition. Starting now."',
    line: () => pick(['[Ship] First night out, and the galley smells of noodles. Tradition.', '[Ship] The first-night noodles are on, and the whole ship is queuing with bowls, in a cheerful, hungry line.', '[Ship] Noodles again, first night out. Somebody says it wouldn\'t feel like a burn without them.']) },
  'burn-name': { name: 'naming the burn', moment: 'start', propose: '{n} says every burn deserves a name, in the way that every storm deserves a name, and, ideally, every mistake. They have a marker, and a large sheet of paper, taped to the galley wall, and a look of enormous purpose. After a moment of grave consideration, they write, in tall block letters, and propose calling this one "{b}".',
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
      { label: 'Make it a tradition', run() { h.traditions.push(id); homeLog(`Started ${T.name}.`); for (const [a, b] of pairs(folk())) addBond(a, b, 1); like(f.p, 1, null); return `You say the words, and it is done, and something in the room changes, the way a room does when a small, ordinary thing becomes a promise. It sticks. From now on, ${T.name} is part of life aboard ${shipTitle()}, and years from now, somewhere, someone will tell a story about how it began.`; } },
      { label: 'Just this once', run: () => 'You say yes to the moment, and no to the promise, and everyone, without any fuss, seems to understand. It\'s a good moment. It doesn\'t have to be more than that, and, in a way, it is better for not trying to be.' },
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
  f => `${f.p.first} chalked a hopscotch grid on the cargo bay deck, and, astonishingly, people use it`,
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
    title: 'Stowaway', text: `There is a cat in the cargo lock: skinny, grey, one torn ear, a kinked tail, and completely unimpressed by you. It is sitting on the top of a crate, washing one paw, with the air of a small, ancient, extremely tired landlord. When you open the inner hatch it looks up, unhurried, and gives you a long, level, evaluating stare. It has clearly decided this is its ship now, and is only waiting for you to catch up.`,
    choices: [
      ...names.map((nm, i) => ({ label: `"${nm}," suggests ${voters[i]}`, run() {
        h.cat = nm;
        homeLog(`${nm} the cat came aboard at ${G.state.planet}.`);
        for (const f of crewPeople()) like(f.p, 1, null);
        return `${nm} it is. The cat, for its part, does not acknowledge the name, or the vote, or the very existence of the arrangement. By the time you take off, ${nm} has found the warmest spot on the ship, which is on the reactor housing, and has curled into a perfect grey circle, one ear twitching. Somebody puts a saucer of milk down, and somebody else, quietly, makes a small, apologetic, wholly unnecessary bed.`;
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
  return pick(Object.keys(ROLE_NAMES));
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
        return `${p.first} lets out a breath so long it is almost a laugh, and drops their bag in the same bunk as before, with a small, private, victorious thump. "Same one," they say. "It's lucky." They look about the cabin as if seeing it new, and the whole ship, somehow, seems a little warmer, as if it had been waiting for this. Somebody, in the galley, starts to clap. (They join as your ${ROLE_NAMES[role].toLowerCase()}.)`;
      } },
      { label: '"Not this time."', run: () => `"I understand," ${p.first} says, quickly, with a brave, bright smile that does not entirely work. "Really. If you ever need someone..." They write their contact code on the back of your hand, in pen, since they do not seem to have paper, and, with a small wave, shoulder their bag, and go down the ramp. You watch them all the way to the end of the dock, and, at the corner, they turn, and lift a hand, and are gone.` },
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
