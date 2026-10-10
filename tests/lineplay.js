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
    return o.run();
  };
  const note = (key, text) => out.push({ key, text: String(text) });
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
    G.nextEvent = null; note(`secrethelp:${sec}:go`, o.run()); const ev = G.nextEvent; G.nextEvent = null; scene(`secrethelp:${sec}:scene`, ev);
    ev.choices.forEach((c, k) => { st.credits = 5000; __seed(600 + i * 10 + k); note(`secrethelp:${sec}:${k}`, c.run()); });
  });
  // what they are traveling for: the ask, the scene and each thing you can do (the person has a secret, for what the quiet after lets slip)
  Object.keys(GOAL_HELP).forEach((goal, i) => {
    __seed(300 + i); st.credits = 5000;
    const p = person(['talkative'], { goal, secret: 'debt' }), o = BAR_TOPICS.find(t => t.id === 'goal').make(p, { p, known: false }, ctx);
    note(`goalask:${goal}`, o.label); G.nextEvent = null; note(`goalhelp:${goal}:go`, o.run()); const ev = G.nextEvent; G.nextEvent = null; scene(`goalhelp:${goal}:scene`, ev);
    ev.choices.forEach((c, k) => { st.credits = 5000; __seed(400 + i * 10 + k); note(`goalhelp:${goal}:${k}`, c.run()); });
  });
  // the crew in the room: a shipmate of each role, and the lines about them that the room draws
  for (const role of ['engineer', 'pilot', 'gunner', 'quartermaster', 'slicer', 'medic']) for (const seed of [1, 2, 3, 4, 5, 6]) {
    __seed(seed * 7); const c = makeCrewCandidate(st.systemId); c.role = role; c.first = 'Sam'; registerPerson(c); st.crew = [c.id];
    note(`crewbar:${role}:${seed}`, roomLines(currentPlanet()).filter(l => /data-action="person"/.test(l)).join(' | '));
  }
  return out;
};

module.exports = { playLines };
