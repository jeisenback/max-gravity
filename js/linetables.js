'use strict';

// The line tables of the generated people (#457): the bar's talk (js/bar.js, js/bartopics.js) and what the crew say in a burn (TRAITS chatter, js/peopletext.js). Each table
// is a pool of plain lines with {words} in them, and a scene picks from it at random. Each gets one id here, and each line the name of where it sits in the table: `0`, `1`
// for a list, `hands.0` for a list under a key, `talkative.win` for a line under two. The game reads the tables through the editor's words (lineWords, storylets.js) by that
// name, and the editor lists them with the same names. A line is changed in place; the pool keeps its size and its order, so what is picked is the same.
// tests/linetables.test.js plays the readers and checks that each table is read.
const LINE_TABLES = [
  { id: 'lines:bar-silence', title: 'Bar: sitting in silence', file: 'js/bar.js', table: () => BAR_SILENCE },
  { id: 'lines:bar-place', title: 'Bar: asking about the place', file: 'js/bar.js', table: () => BAR_PLACE },
  { id: 'lines:bar-card-win', title: 'Bar: cards, you win', file: 'js/bar.js', table: () => BAR_CARD_WIN },
  { id: 'lines:bar-card-lose', title: 'Bar: cards, you lose', file: 'js/bar.js', table: () => BAR_CARD_LOSE },
  { id: 'lines:bar-home-talk', title: 'Bar: talk of home', file: 'js/bar.js', table: () => BAR_HOME_TALK },
  { id: 'lines:bar-bless', title: 'Bar: a blessing', file: 'js/bar.js', table: () => BAR_BLESS },
  { id: 'lines:bar-leave', title: 'Bar: leaving them to their drink', file: 'js/bar.js', table: () => BAR_LEAVE },
  { id: 'lines:bar-drink-talk', title: 'Bar: over a drink', file: 'js/bar.js', table: () => BAR_DRINK_TALK },
  { id: 'lines:bar-work', title: 'Bar: talk of work, by kind of work', file: 'js/bar.js', table: () => BAR_WORK },
  { id: 'lines:bar-trait', title: 'Bar: a line for each trait', file: 'js/bar.js', table: () => BAR_TRAIT },
  { id: 'lines:bar-goal', title: 'Bar: what they are traveling for', file: 'js/bar.js', table: () => BAR_GOAL },
  { id: 'lines:bar-openers', title: 'Bar: how a stranger opens, by trait', file: 'js/bar.js', table: () => OPENERS },
  { id: 'lines:bar-secret-talk', title: 'Bar: what a secret lets slip', file: 'js/bar.js', table: () => SECRET_TALK },
  { id: 'lines:bar-crew', title: 'Bar: the crew in the room, by post', file: 'js/bar.js', table: () => CREW_AT_BAR },
  { id: 'lines:bar-goal-help', title: 'Bar: helping with what they are traveling for', file: 'js/bartopics.js', plainKey: /(^|\.)(ask|gift|advice|listen)$/, table: () => GOAL_HELP },
  { id: 'lines:bar-secret-help', title: 'Bar: helping with a secret', file: 'js/bartopics.js', table: () => SECRET_HELP },
  { id: 'lines:social-causes', title: 'What a small ship argues about', file: 'js/social.js', table: () => CAUSES },
  { id: 'lines:social-critics', title: 'What the critics say of a show', file: 'js/social.js', table: () => CRITICS },
  { id: 'lines:bar-react', title: 'Bar: how a trait takes what you did', file: 'js/bartopics.js', table: () => BAR_REACT },
  { id: 'lines:family-left', title: 'A story: what they left behind', file: 'js/familytext.js', where: 'transit', table: () => LEFT },
  { id: 'lines:family-hopes', title: 'A story: what they hope for', file: 'js/familytext.js', where: 'transit', table: () => HOPES },
  { id: 'lines:family-home', title: 'A story: what home is like, by culture', file: 'js/family.js', where: 'transit', table: () => HOME_DETAIL },
  { id: 'lines:family-idle', title: 'Sitting with a crew member with nothing on their mind, by trait', file: 'js/familytext.js', where: 'transit', table: () => TALK_IDLE },
  { id: 'lines:family-good-news', title: 'A letter from home: good news', file: 'js/familytext.js', where: 'transit', table: () => GOOD_NEWS },
  { id: 'lines:family-bad-news', title: 'A letter from home: bad news', file: 'js/familytext.js', where: 'transit', table: () => BAD_NEWS },
  { id: 'lines:family-holidays', title: 'Holidays from home: the scene and keeping it', file: 'js/familytext.js', where: 'transit', table: () => holidayLines() },
  { id: 'lines:trait-chatter', title: 'Crew chatter, by trait', file: 'js/peopletext.js', plain: true, where: 'transit', table: () => Object.fromEntries(Object.entries(TRAITS).map(([t, d]) => [t, d.chatter])) },
];
const lineTable = id => LINE_TABLES.find(t => t.id === id);

// The lines of a table by name: every string in it, under the path that leads to it.
function flatLines(node, path = '', out = {}) {
  if (typeof node === 'string') out[path] = node;
  else if (Array.isArray(node)) node.forEach((x, i) => flatLines(x, path ? `${path}.${i}` : `${i}`, out));
  else if (node && typeof node === 'object') for (const [k, v] of Object.entries(node)) flatLines(v, path ? `${path}.${k}` : k, out);
  return out;
}
// The same table with each line read through the editor's words, in the same shape and order.
function linedText(id, node, path = '') {
  if (typeof node === 'string') return lineWords(id, path, node);
  if (Array.isArray(node)) return node.map((x, i) => linedText(id, x, path ? `${path}.${i}` : `${i}`));
  if (node && typeof node === 'object') return Object.fromEntries(Object.entries(node).map(([k, v]) => [k, linedText(id, v, path ? `${path}.${k}` : k)]));
  return node;
}
const socialTable = name => linedText(`lines:social-${name}`, lineTable(`lines:social-${name}`).table());  // the tables of js/social.js
const barLines = name => linedText(`lines:bar-${name}`, lineTable(`lines:bar-${name}`).table());
const familyLines = name => linedText(`lines:family-${name}`, lineTable(`lines:family-${name}`).table());  // the tables of js/familytext.js (#457)
const holidayKey = h => h.name.toLowerCase().replace(/[^a-z]+/g, '-').replace(/^-|-$/g, '');  // the key of a holiday's lines: its name ('landing-day')
const holidayLines = () => Object.fromEntries(HOLIDAYS.map(h => [holidayKey(h), { text: h.text, join: h.join }]));
const traitChatter = trait => [].concat(linedText('lines:trait-chatter', TRAITS[trait].chatter, trait));

// The tables as registry scenes, for the override layer and the editor: no title and no choices, only the lines (the shape the beats take, hiredscenes.js).
function lineTableRegistry() {
  return LINE_TABLES.map(t => ({ id: t.id, kind: 'lines', title: t.title, file: t.file, where: t.where || 'port', scene: { title: t.title, choices: [], parts: flatLines(t.table()), noTitle: true } }));
}

// The passenger events (PAX_EVENTS) and the crew events (CREW_EVENTS) of js/people.js (#457): the words of each are in PEOPLE_LINES (peopletext.js), by the name each line has, and the
// event reads them through peopleSay. A line may use only the {words} the shipped line has; what the event builds from the game (a sum of hull, a tip) is passed in as a word.
const peopleSay = (id, key, vars = {}) => lineWords(id, key, PEOPLE_LINES[id][key]).replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
const socialSay = id => (key, vars) => peopleSay(`social:${id}`, key, vars);  // the relationship scenes of social.js (#457)
const familySay = id => (key, vars) => peopleSay(`family:${id}`, key, vars);  // the "With {name}" scenes of family.js (#457)
function peopleEventRegistry() {
  const row = (id, title, extra) => ({ id, kind: 'people', title, file: 'js/people.js', where: 'transit', scene: { title, choices: [], parts: PEOPLE_LINES[id], noTitle: true }, ...extra });
  const bar = (id, title, extra) => row(id, title, { file: 'js/bartopics.js', where: 'port', ...extra });
  return [...PAX_EVENTS.map(e => row(`people:pax:${e.id}`, PEOPLE_LINES[`people:pax:${e.id}`].title, { event: e })), ...Object.entries(CREW_EVENTS).map(([trait, make]) => row(`people:crew:${trait}`, PEOPLE_LINES[`people:crew:${trait}`].title, { trait, make })),
    ...Object.keys(SOCIAL_SCENES).map(id => row(`social:${id}`, PEOPLE_LINES[`social:${id}`].title || `Social: ${id}`, { file: 'js/social.js', social: id })), ...Object.keys(FAMILY_SCENES).map(id => row(`family:${id}`, `Sit with a shipmate: ${id}`, { file: 'js/family.js', family: id })), ...BAR_TOPICS.map(t => bar(`bar:${t.id}`, `Bar topic: ${t.id}`, { topic: t })), bar('bar:goal-help', 'Bar topic: what they are traveling for (the help scene)', { help: 'goal' }), bar('bar:secret-help', 'Bar topic: a secret (the help scene)', { help: 'secret' })];
}
