'use strict';

// The cutover (docs/superpowers/plans/2026-10-08-ship-interface-step6-cutover.md, #324): the shell is the only way through the landed
// screens. The old station keys, tab bars and the flag that chose between them are gone, and every page a script sends the player to is one
// the shell knows. A scan of the sources, so nothing is left pointing at a removed page.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const jsFiles = fs.readdirSync(path.join(ROOT, 'js'), { recursive: true }).filter(f => f.endsWith('.js')).map(f => [f, fs.readFileSync(path.join(ROOT, 'js', f), 'utf8')]);

test('the old navigation and the shell flag are gone from the scripts', () => {
  const gone = ['data-action="station"', 'stationOf', 'bridgeKeys', 'bridgeStation', 'TAB_NAMES', 'shellOn', 'BUILD.shell', 'shell=off', 'shell=on'];
  const found = [];
  for (const [file, src] of jsFiles) for (const name of gone) if (src.includes(name)) found.push(`${file}: ${name}`);
  assert.deepEqual(found, []);
});

test('no test reaches for the removed navigation', () => {
  const gone = ['stationOf', 'bridgeKeys', 'bridgeStation', 'data-action=station', '.tabs.sub', '.tabs.stations'];
  const found = [];
  for (const f of fs.readdirSync(__dirname).filter(f => f.endsWith('.test.js') && f !== 'cutover.test.js')) {
    const src = fs.readFileSync(path.join(__dirname, f), 'utf8');
    for (const name of gone) if (src.includes(name)) found.push(`${f}: ${name}`);
  }
  assert.deepEqual(found, []);
});

test('the old tab bars are gone from the style sheet', () => {
  assert.doesNotMatch(fs.readFileSync(path.join(ROOT, 'style.css'), 'utf8'), /\.tabs\b/);
});

test('every page a script sets UI.tab to is a page the shell knows', () => {
  const shell = jsFiles.find(([f]) => f === 'shell.js')[1];
  const known = new Set([...shell.slice(shell.indexOf('const SHELL_PAGES')).split('};')[0].matchAll(/\b(\w+): \{/g)].map(m => m[1]));
  assert.ok(known.has('port') && known.has('person') && known.has('nav'), `read the pages: ${[...known]}`);
  const unknown = [];
  for (const [file, src] of jsFiles) for (const m of src.matchAll(/\bUI\.tab = '(\w+)'/g)) if (!known.has(m[1])) unknown.push(`${file}: ${m[1]}`);
  assert.deepEqual(unknown, []);
});
