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

test('no two scripts declare the same top-level name', () => {
  const where = {};
  for (const f of scripts) {
    for (const line of fs.readFileSync(path.join(ROOT, f), 'utf8').split('\n')) {
      const m = DECL.exec(line);
      if (m) (where[m[1]] = where[m[1]] || []).push(f);
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
