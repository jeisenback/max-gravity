'use strict';

// Every script is a classic script, so top-level names in different files share
// one global scope: a second `const has` in another file stops the page loading.
// This finds those clashes without a browser, and checks index.html loads every
// script under js/ and nothing that is missing.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const scripts = fs.readdirSync(path.join(ROOT, 'js'), { recursive: true })
  .filter(f => f.endsWith('.js')).map(f => 'js/' + f.split(path.sep).join('/'));
const DECL = /^(?:const|let|var|class|(?:async\s+)?function\*?)\s+([A-Za-z_$][\w$]*)/;

// Where the string or template literal that opens at `i` ends (the index of its closing quote), or -1 if the line ends first. A template's `${}` may hold strings of its own.
function stringEnd(line, i) {
  const q = line[i];
  for (let j = i + 1; j < line.length; j++) {
    if (line[j] === '\\') j++;
    else if (line[j] === q) return j;
    else if (q === '`' && line[j] === '$' && line[j + 1] === '{') {
      let depth = 1;
      for (j += 2; j < line.length && depth; j++) {
        if (line[j] === '{') depth++; else if (line[j] === '}') depth--;
        else if ("'\"`".includes(line[j])) { j = stringEnd(line, j); if (j < 0) return -1; }
      }
      j--;
    }
  }
  return -1;
}

// Every name a top-level declaration line declares: the first, and for a const, let or var the identifier that starts each declarator after a comma at the top of the line
// (`const A = 1, B = 2;` declares both). Names inside brackets, strings and comments are not declarations. A declaration that goes on over several lines is read to the end of its first.
function declared(line) {
  const m = DECL.exec(line);
  if (!m) return [];
  const names = [m[1]];
  if (!/^(?:const|let|var)\s/.test(line)) return names;
  let depth = 0;
  for (let i = m[0].length; i < line.length; i++) {
    const c = line[i];
    if (c === '/' && line[i + 1] === '/') break;
    if ("'\"`".includes(c)) { i = stringEnd(line, i); if (i < 0) break; }
    else if ('([{'.includes(c)) depth++;
    else if (')]}'.includes(c)) depth--;
    else if (c === ';' && !depth) break;
    else if (c === ',' && !depth) { const n = /^\s*([A-Za-z_$][\w$]*)\s*(?:=|,|;|$)/.exec(line.slice(i + 1)); if (n) names.push(n[1]); }
  }
  return names;
}

test('a declaration line gives every name it declares, and not what only looks like one', () => {
  assert.deepEqual(declared('const BOARD_MAX = 40, BOARD_RING = 10, PD_RANGE = 15;'), ['BOARD_MAX', 'BOARD_RING', 'PD_RANGE']);
  assert.deepEqual(declared('let a, b'), ['a', 'b']);
  assert.deepEqual(declared('const A = { x: 1, y: 2 }, B = [1, 2], C = (a, b) => a, D = "a, E = 1", F = `${g(1, \'h, I = 2\')}, G = 3`;'), ['A', 'B', 'C', 'D', 'F']);
  assert.deepEqual(declared('const H = 1; // , I = 2'), ['H']);
  assert.deepEqual(declared('const J = f(x), K = 2; const L = 3, M = 4;'), ['J', 'K'], 'a line is read to its first semicolon');
  assert.deepEqual(declared('function f(a, b) {'), ['f']);
  assert.deepEqual(declared('  const indented = 1, nope = 2;'), []);
  assert.deepEqual(declared('const { p, q } = obj, r = 3;'), []);
});

test('no two scripts declare the same top-level name', () => {
  const where = {};
  for (const f of scripts) {
    for (const line of fs.readFileSync(path.join(ROOT, f), 'utf8').split('\n')) {
      for (const name of declared(line)) (where[name] = where[name] || []).push(f);
    }
  }
  const clashes = Object.entries(where).filter(([, fs]) => fs.length > 1).map(([n, fs]) => `${n}: ${fs.join(', ')}`);
  assert.deepEqual(clashes, []);
});

test('index.html loads every script, and only scripts that exist', () => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const loaded = [...html.matchAll(/<script src="([^"]+)"/g)].map(m => m[1]);
  assert.deepEqual(loaded.filter(s => !fs.existsSync(path.join(ROOT, s))), [], 'missing files');
  assert.deepEqual(scripts.filter(s => !loaded.includes(s)), [], 'scripts not loaded');
});
