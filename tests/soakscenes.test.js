'use strict';

// The scene report of tools/soak.js --scenes (#512): a storylet is found by its id, any other scene by its title, a scene the narrow build leaves out is not counted,
// and the report is the same for the same plays. The soak itself is not part of npm test (it plays whole chapters); this checks the report on made-up plays.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { scenesReport, report, messagesReport } = require('../tools/soak');

const rows = [
  { id: 'port-a', title: 'Alpha', off: false, storylet: true },
  { id: 'port-b', title: 'Beta', off: false, storylet: true },
  { id: 'port-c', title: 'Gamma', off: true, storylet: true },
  { id: 'cast:x:intro', title: 'Intro', off: false, storylet: false },
  { id: 'cast:y:intro', title: 'Intro', off: false, storylet: false },
  { id: 'cast:z:late', title: 'Late', off: false, storylet: false },
  { id: 'lines:x', title: 'A table', off: false, storylet: false, table: true },
  { id: 'scene:flight-notes', title: 'Notes of flight', off: false, storylet: false },
  { id: 'social:feed', title: 'Social: feed', off: false, storylet: false },
  { id: 'away:package', title: 'A Package for {dest}', off: false, storylet: false },
];
const runs = [
  { seed: 1, byId: { 'port-a': 3 }, byTitle: { Intro: 1, 'Drawn Title': 2 } },
  { seed: 2, byId: { 'port-a': 1 }, byTitle: { Intro: 1 } },
];

test('the report lists each scene the narrow build keeps with its plays, the ones that never played, the largest shares, and what the index does not list', () => {
  const out = scenesReport(runs, rows, 40, 2);
  assert.match(out[0], /^scenes: 8 plays over 2 seeds \(1, 2\), up to 40 legs each/);
  assert.ok(out.includes('5 scenes in the narrow build (1 left out of it are not counted):'));
  assert.ok(out.includes('  port-a  Alpha: 4 plays, 2 of 2 seeds'));
  assert.ok(out.includes('  port-b  Beta: 0 plays, 0 of 2 seeds'));
  assert.ok(out.includes('not judged, since the plays cannot be matched to them (words tables, labels of scene families, titles with a {word}): 4'), 'a table, a family label and a templated title are not judged');
  assert.ok(!out.some(l => l.includes('lines:x') && l.includes('plays')), 'and are not listed as unplayed');
  assert.ok(out.includes('  cast:x:intro  Intro (title shared): 2 plays, 2 of 2 seeds'), 'a scene that is not a storylet is matched by its title, and says so when others share it');
  assert.ok(!out.some(l => l.includes('port-c')), 'a scene the narrow build leaves out is not listed');
  assert.ok(out.includes('never played in this sample: 2 of 5'));
  assert.ok(out.includes('  port-b  Beta') && out.includes('  cast:z:late  Late'));
  const share = out.slice(out.indexOf('largest share of all plays:') + 1, out.indexOf('largest share of all plays:') + 3);
  assert.deepEqual(share, ['  Alpha (port-a): 4 plays, 50 percent, 2 of 2 seeds', '  Drawn Title: 2 plays, 25 percent, 1 of 2 seeds'], 'a tie is broken by the key, so the order is the same each time');
  assert.deepEqual(out.slice(-2), ['played but not listed in the index: 1', '  Drawn Title: 2 plays'], 'each with its plays, so a scene built in code is counted too (#777)');
  assert.deepEqual(scenesReport(runs, rows, 40, 2), out, 'the same plays give the same report');
});

test('with the landings and the hand counted the report gives the plays by kind, the mix of scenes at a landing, and the hand\'s hurts', () => {
  const night = [{ seed: 1, byId: { 'land-a': 2, 'port-a': 3, 'road-x': 4, 'road-night-watch': 1 }, byTitle: {}, landings: { 0: 5, 1: 3, 2: 1 }, hand: { hurt: 2, again: 1 } },
    { seed: 2, byId: { 'port-a': 1 }, byTitle: {}, landings: { 0: 2, 1: 2, 3: 1 }, hand: { hurt: 1, again: 0 } }];
  const out = scenesReport(night, rows, 40, 2);
  assert.ok(out.includes('storylet plays by kind: landing 2, port 4, road 5 (of which at night 1)'));
  assert.ok(out.includes('landings: 14, with no scene 7, one 5, two or more 2'), 'three scenes count with two');
  assert.ok(out.indexOf('played but not listed in the index: 3') > out.indexOf('landings: 14, with no scene 7, one 5, two or more 2'), 'the new lines come before the unlisted scenes');
  const lines = [], log = console.log; console.log = x => lines.push(x);
  try { report(night.map(r => ({ ...r, losses: [] }))); } finally { console.log = log; }
  assert.match(lines.at(-1), /; the hand was hurt 3 times \(1 while still hurt\) and died in 0; nights in port \d+(\.\d)? a chapter$/);
});

test('the message report gives the lines and notes a chapter writes, and the lines that come most often', () => {
  const runs = [
    { seed: 1, days: 100, messages: { log: 5, comm: 4, note: 1, lines: { 'log: Burning for N.': 3, 'log: Arrived at N (#).': 2, 'note: Wages #.': 1 } } },
    { seed: 2, days: 100, messages: { log: 3, comm: 2, note: 1, lines: { 'log: Burning for N.': 3, 'note: Wages #.': 1 } } },
  ];
  const out = messagesReport(runs, 2);
  assert.equal(out[0], 'messages: 4 flight-log lines, 3 comms lines of a burn and 1 port notes a chapter over 2 seeds, 8 every 100 days');
  assert.deepEqual(out.slice(1), ['the most often, a chapter\'s mean:', '  3  log: Burning for N.', '  1  log: Arrived at N (#).']);
});
