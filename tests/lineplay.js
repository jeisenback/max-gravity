'use strict';

// Plays the words of the line tables (#457) for the pin (linetables.test.js): the bar topics that read them, once for each trait, and the crew's chatter. Not a test file.
// playLines runs in the page. It reads the tables only through the game's own topics and chatter, so it plays the same before and after the text layer is put in front of them.
const playLines = () => {
  const out = [];
  startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester', credits: 5000 });
  while (G.dialog) finishEvent();
  const st = G.state; st.story.next = 1e9; st.day += 30;
  const person = (traits, extra = {}) => { const p = makePerson('earth'); p.traits = traits; p.secret = null; p.goal = 'home'; p.first = 'Sam'; p.last = 'Vale'; p.home = 'Mars'; Object.assign(p, extra); return p; };
  const traits = Object.keys(TRAITS), goals = Object.keys(BAR_GOAL), jobs = ['dockhand', 'welder', 'navy pilot', 'clerk'];
  const topic = (id, p, seed) => {
    __seed(seed); st.credits = 5000;
    const pat = { p, known: false }, o = BAR_TOPICS.find(t => t.id === id).make(p, pat, { st, bar: 'The Anchor' });
    return withMem(p, o.run());
  };
  const note = (key, text) => out.push({ key, text: String(text) });
  const withMem = (p, t) => `${t}|${p.memories.slice(-1)[0] || ''}`;  // what a topic says, and the memory it leaves
  traits.forEach((t, i) => { for (const id of ['drink', 'cards', 'quiet', 'place']) for (const seed of [1, 2, 3, 4]) note(`${id}:${t}:${seed}`, topic(id, person([t]), seed * 100 + i)); });  // a seed of its own for each case, so the dice differ from trait to trait
  for (const t of traits) for (const seed of [1, 2]) for (const id of ['home', 'bless']) note(`${id}:${t}:${seed}`, topic(id, person([t, 'homesick', 'pious']), seed));
  for (const goal of goals) for (const seed of [1, 2]) note(`heard:${goal}:${seed}`, topic('heard', person(['curious'], { goal }), seed));
  for (const job of jobs) for (const seed of [1, 2, 3]) note(`work:${job}:${seed}`, topic('work', person(['kind'], { job }), seed));
  traits.forEach((t, i) => { for (const seed of [1, 2, 3]) { __seed(seed * 100 + i); const p = person([t, t === 'kind' ? 'brave' : 'kind']); const e = talkEvent({ p, known: false }); note(`leave:${t}:${seed}`, e.choices.find(c => /Leave them/.test(c.label)).run()); } });
  // the crew's chatter: a captain with no lines of their own, once for each trait
  hired().captainKey = null;
  for (const t of traits) for (const seed of [1, 2, 3]) { __seed(seed); hiredCaptain().traits = [t]; note(`chatter:${t}:${seed}`, captainChatter().join(' | ')); }
  // the openers a stranger gets, by the first trait and by the name (the person's own pick of three)
  for (const t of traits) for (const last of ['Vale', 'Okafor', 'Lind', 'Marsh']) { __seed(1); const p = person([t, t === 'kind' ? 'brave' : 'kind'], { last }); note(`opener:${t}:${last}`, talkEvent({ p, known: false }).text); }
  // what a secret lets slip over a drink, and what it asks of you
  const secrets = Object.keys(SECRET_TALK), ctx = { st, bar: 'The Anchor' }, scene = (key, ev) => note(key, JSON.stringify([ev.title, ev.text, ev.choices.map(c => String(c.label))]));
  secrets.forEach((sec, i) => { for (const seed of [1, 2, 3]) note(`secret:${sec}:${seed}`, topic('drink', person(['talkative'], { secret: sec }), seed * 100 + i)); });
  secrets.forEach((sec, i) => {
    __seed(500 + i); st.credits = 5000;
    const p = person(['kind'], { secret: sec, opinion: OPINION.CLOSE }), o = BAR_TOPICS.find(t => t.id === 'secret').make(p, { p, known: false, drank: true }, ctx);
    G.nextEvent = null; note(`secrethelp:${sec}:go`, withMem(p, o.run())); const ev = G.nextEvent; G.nextEvent = null; scene(`secrethelp:${sec}:scene`, ev);
    ev.choices.forEach((c, k) => { st.credits = 5000; __seed(600 + i * 10 + k); note(`secrethelp:${sec}:${k}`, withMem(p, c.run())); });
  });
  // what they are traveling for: the ask, the scene and each thing you can do (the person has a secret, for what the quiet after lets slip)
  Object.keys(GOAL_HELP).forEach((goal, i) => {
    __seed(300 + i); st.credits = 5000;
    const p = person(['talkative'], { goal, secret: 'debt' }), o = BAR_TOPICS.find(t => t.id === 'goal').make(p, { p, known: false }, ctx);
    note(`goalask:${goal}`, o.label); G.nextEvent = null; note(`goalhelp:${goal}:go`, withMem(p, o.run())); const ev = G.nextEvent; G.nextEvent = null; scene(`goalhelp:${goal}:scene`, ev);
    ev.choices.forEach((c, k) => { st.credits = 5000; __seed(400 + i * 10 + k); note(`goalhelp:${goal}:${k}`, withMem(p, c.run())); });
  });
  // the crew in the room: a shipmate of each role, and the lines about them that the room draws
  for (const role of ['engineer', 'pilot', 'gunner', 'quartermaster', 'slicer', 'medic']) for (const seed of [1, 2, 3, 4, 5, 6]) {
    __seed(seed * 7); const c = makeCrewCandidate(st.systemId); c.role = role; c.first = 'Sam'; registerPerson(c); st.crew = [c.id];
    note(`crewbar:${role}:${seed}`, roomLines(currentPlanet()).filter(l => /data-action="person"/.test(l)).join(' | '));
  }
  // the topics the cases above do not reach whole (#457): what they have heard (the secretive, the talkative, the rest, the friend), the offer of passage (with a lane and with none),
  // the same drink and cards over more dice, the fight (with and without a gunner among us), the peace, and the goal help for the homesick (whom a gift and a listen move)
  const run1 = (id, p, seed, pat = {}) => { __seed(seed); st.credits = 5000; return withMem(p, BAR_TOPICS.find(t => t.id === id).make(p, { p, known: false, ...pat }, ctx).run()); };
  traits.forEach((t, i) => { for (const seed of [1, 2, 3, 4]) { note(`heard2:${t}:${seed}`, run1('heard', person([t, 'kind'], { goal: 'vague' }), 700 + seed * 10 + i)); note(`heard3:${t}:${seed}`, run1('heard', person([t, 'kind'], { goal: 'home', opinion: 3 }), 800 + seed * 10 + i)); } });
  for (const seed of [1, 2, 3, 4, 5, 6]) note(`passage:${seed}`, run1('passage', person(['kind', 'brave']), 900 + seed));
  { const real2 = window.travelOffer; window.travelOffer = () => null; note('passage:none', run1('passage', person(['kind', 'brave']), 950)); window.travelOffer = real2; }
  for (const seed of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]) { note(`drink2:${seed}`, run1('drink', person(['kind', 'brave']), 1000 + seed)); for (const t of ['rude', 'kind']) note(`cards2:${t}:${seed}`, run1('cards', person([t, 'brave']), 1100 + seed)); }
  for (const post of ['gunner', 'pilot']) for (const seed of [1, 2, 3, 4]) { const was = hired().post; hired().post = post; note(`fight:${post}:${seed}`, run1('fight', person(['rude', 'kind']), 1200 + seed)); hired().post = was; }
  { const gun = makeCrewCandidate(st.systemId); Object.assign(gun, { role: 'gunner', skill: 2, first: 'Rhea' }); registerPerson(gun); const crew0 = [...st.crew]; st.crew.push(gun.id);  // a gunner among us steps in
    for (const seed of [1, 2]) note(`fight:crew:${seed}`, run1('fight', person(['rude', 'kind']), 1250 + seed)); st.crew = crew0; }
  note('peace', run1('peace', person(['kind', 'brave'], { opinion: -3 }), 1300, { known: true }));
  Object.keys(GOAL_HELP).forEach((goal, i) => {
    __seed(350 + i); st.credits = 5000;
    const p = person(['homesick'], { goal, secret: 'spy' }), o = BAR_TOPICS.find(t => t.id === 'goal').make(p, { p, known: false }, ctx);
    G.nextEvent = null; o.run(); const ev = G.nextEvent; G.nextEvent = null;
    ev.choices.forEach((c, k) => { st.credits = 5000; __seed(450 + i * 10 + k); note(`goalhelp2:${goal}:${k}`, withMem(p, c.run())); });
  });
  // the button of each topic and the reason it gives when it is shut (a topic done already tonight)
  for (const t of BAR_TOPICS) {
    const done = { drank: true, asked: true, offered: true, played: true, work: true, place: true, quiet: true, goal: true, troubled: true, home: true, blessed: true, fought: true, peace: true }, p = person(['kind', 'brave'], { goal: 'home', secret: 'debt' });
    __seed(1); const o = t.make(p, { p, known: false, ...done }, ctx); note(`label:${t.id}`, o.label); note(`gate:${t.id}`, o.why ? o.why() : '');
  }
  { const was = st.hired; st.hired = null; const p = person(['pious', 'kind']); note('label:bless:owner', BAR_TOPICS.find(t => t.id === 'bless').make(p, { p, known: false }, ctx).label); st.hired = was; }  // an owner's blessing is for 'your ship'
  // what is seen of the people in the ship's rooms: every line of every pool, as the game draws it (a crowd of two in the room, so that a line for two can be drawn), and the lights
  { const realRandom = Math.random, crowd = [{ name: 'Ana', role: 'pilot', room: 'galley' }, { name: 'Ben', role: 'gunner', room: 'galley' }];
    for (const [room, pools] of Object.entries(LIFE_LINES)) for (const [role, list] of Object.entries(pools)) for (let i = 0; i < list.length; i++) {
      Math.random = () => (i + 0.5) / list.length;  // the draw that picks line i of the pool
      note(`life:${room}:${role}:${i}`, lifeLine({ name: 'Cass', role: role === 'any' ? 'cook' : role, room }, crowd.map(c => ({ ...c, room }))));
    }
    Math.random = realRandom;
    uatBurn('Ceres Station', 'pallas');
    const realComm = window.comm, heard = [];
    window.comm = text => heard.push(text);
    for (const [name, elapsed, dark] of [['dusk', 24, false], ['dawn', -2, true]]) { G.transit.elapsed = elapsed; G.transit.dark = dark; heard.length = 0; lifeTick(0.01); note(`lights:${name}`, heard.join(' | ')); }
    window.comm = realComm; }
  // the world's news: every line of the pool of pirate raids and of the pool of incidents, as the game draws it (the dice that pick line k; the first draws of the tick are the chance and the sides)
  { const realRandom = Math.random, drawn = list => { const q = [...list]; Math.random = () => (q.length ? q.shift() : 0.99); };  // the dice given, then dice that start nothing else
    for (let k = 0; k < 4; k++) { __seed(2000 + k); st.news = []; drawn([0, (k + 0.5) / 4]); worldTick(); note(`news:flare:${k}`, st.news.map(n => n.text).join(' | ')); }
    for (let k = 0; k < 10; k++) { __seed(2100 + k); st.news = []; st.factions = null; drawn([0, k < 5 ? 0.2 : 0.7, (k + 0.5) / 10, 0.3]); factionTick(); note(`news:incident:${k}`, st.news.map(n => n.text).join(' | ')); }
    Math.random = realRandom; }
  // the market rumors: every line of the pool of a rise and of a fall, as the game draws it (the days, the market and the good, whether it rises, then the line)
  { const realRandom = Math.random, drawn = list => { const q = [...list]; Math.random = () => (q.length ? q.shift() : 0.99); };
    const rumor = (key, dice) => { __seed(2200); st.rumors = []; drawn(dice); addRumor(); note(key, st.rumors[st.rumors.length - 1].text); };
    for (let k = 0; k < 12; k++) rumor(`rumor:up:${k}`, [0.5, 0, 0, 0.1, (k + 0.5) / 12]);
    for (let k = 0; k < 8; k++) rumor(`rumor:down:${k}`, [0.5, 0, 0, 0.9, (k + 0.5) / 8]);
    Math.random = realRandom; }
  // the errands a hand is offered: every item and what is said of it, as the game draws it
  { const realRandom = Math.random, drawn = list => { const q = [...list]; Math.random = () => (q.length ? q.shift() : 0.99); };
    for (let k = 0; k < 5; k++) { __seed(2300 + k); drawn([0, (k + 0.5) / 5]); const got = errandsFor(currentPlanet()); note(`errand:${k}`, got.map(o => `${o.title} | ${o.blurb}`).join(' || ')); }
    Math.random = realRandom; }
  // the comms chatter on a burn: each line of the pool, drawn in turn (the pool without what the family mod adds to it)
  takeOff(); uatBurn('Ceres Station', 'pallas'); G.transit.times = []; G.transit.event = null; G.dialog = null;
  { const filter = Mods.filter; let k = 0; const lines = [];
    Mods.filter = (key, list) => { if (key !== 'chatter') return filter.call(Mods, key, list); if (list.length === CHATTER.length) lines.push(list[k]); return [list[k % list.length]]; };
    const rnd = Math.random; try { for (k = 0; k < CHATTER.length; k++) { G.transit.chatter = 0; G.transit.chattered = 0; Math.random = () => 0.99; updateTransit(0.01); Math.random = rnd; } } finally { Mods.filter = filter; Math.random = rnd; }  // 0.99: the pool of the band, not what the crew say
    note('comms-chatter', lines.join(' | ')); }
  return out;
};

module.exports = { playLines };
