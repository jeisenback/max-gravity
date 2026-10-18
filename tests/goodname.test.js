'use strict';

// A save can name a good from a mod that has since been removed (game.js dropMissingModContent). A good's name is read with goodName() (readouts.js),
// which falls back to the id, never with COMMODITIES.find(...).name, which throws on a good that is gone (#750). No browser needed.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const scripts = fs.readdirSync(path.join(ROOT, 'js'), { recursive: true }).filter(f => f.endsWith('.js')).map(f => 'js/' + f.split(path.sep).join('/'));

test('no script reads a good\'s name straight off COMMODITIES.find', () => {
  const found = [];
  for (const f of scripts) fs.readFileSync(path.join(ROOT, f), 'utf8').split('\n').forEach((line, i) => { if (/COMMODITIES\.find\([^)]*\)\.name/.test(line)) found.push(`${f}:${i + 1}`); });
  assert.deepEqual(found, [], 'use goodName(id), which falls back to the id for a good that is gone');
});
