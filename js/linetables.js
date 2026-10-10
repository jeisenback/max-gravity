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
  { id: 'lines:bar-react', title: 'Bar: how a trait takes what you did', file: 'js/bartopics.js', table: () => BAR_REACT },
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
const barLines = name => linedText(`lines:bar-${name}`, lineTable(`lines:bar-${name}`).table());
const traitChatter = trait => [].concat(linedText('lines:trait-chatter', TRAITS[trait].chatter, trait));

// The tables as registry scenes, for the override layer and the editor: no title and no choices, only the lines (the shape the beats take, hiredscenes.js).
function lineTableRegistry() {
  return LINE_TABLES.map(t => ({ id: t.id, kind: 'lines', title: t.title, file: t.file, where: t.where || 'port', scene: { title: t.title, choices: [], parts: flatLines(t.table()), noTitle: true } }));
}
