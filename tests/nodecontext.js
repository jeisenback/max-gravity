'use strict';

// Loads the game's own scripts into a bare Node context, with no browser, for tests of pure logic (orbits.js, market.js). The
// scripts are classic scripts sharing one global scope, so they run here the way the page runs them: in order, in one context.
// The few things they reach for that live elsewhere (the game state G, the crew and ship, Mods) are passed in as stubs.
//
//   const api = load(['js/data.js', 'js/util.js', 'js/orbits.js'], { G, roleSkill, ship }, ['travelDays', 'burnFuel']);
//
// returns the named functions and constants, which run inside the context (so they see the stubs, and G if a test changes it).

const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');

function load(files, globals = {}, names = []) {
  const context = vm.createContext({ console, ...globals });
  for (const file of files) vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), context, { filename: file });
  return vm.runInContext(`({ ${names.join(', ')} })`, context);
}

module.exports = { load };
