'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// A new trait, culture or secret cannot arrive without a voice (docs/voices/people.md, #455).
const root = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const card = read('docs/voices/people.md');
const { TRAITS, NAMES } = vm.runInNewContext(`${read('js/peopletext.js')}\n;({ TRAITS, NAMES })`);
const secrets = vm.runInNewContext(`${read('js/people.js').match(/const SECRETS = \[[^\]]*\];/)[0]}\n;SECRETS`);

test('every trait has a card in docs/voices/people.md', () => {
  for (const key of Object.keys(TRAITS)) assert.match(card, new RegExp(`^### ${key}$`, 'm'), `no card for the trait "${key}"`);
});

test('every culture has a note in docs/voices/people.md', () => {
  for (const key of Object.keys(NAMES)) assert.match(card, new RegExp(`^### ${key}$`, 'm'), `no note for the culture "${key}"`);
});

test('every secret has a line in docs/voices/people.md', () => {
  assert.ok(secrets.length >= 5);
  for (const key of secrets) assert.match(card, new RegExp(`^- \\*\\*${key}:\\*\\*`, 'm'), `no line for the secret "${key}"`);
});
