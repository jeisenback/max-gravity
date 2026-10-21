'use strict';

// The play-through tool (tools/playthrough.js): a short seeded chapter with no video writes a transcript and shots, and the same seed writes the same transcript.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { closeBrowser } = require('./helpers');
const { playthrough } = require('../tools/playthrough');

after(closeBrowser);

test('a short play-through writes its transcript and shots, and the same seed writes the same transcript', async () => {
  const dirs = [0, 1].map(i => fs.mkdtempSync(path.join(os.tmpdir(), `playthrough-${i}-`)));
  try {
    const runs = [];
    for (const out of dirs) runs.push(await playthrough({ seed: 1, maxDays: 20, video: false, out }));
    const [a, b] = runs, text = fs.readFileSync(path.join(dirs[0], 'transcript.md'), 'utf8');
    assert.deepEqual(a.errors, []);
    assert.deepEqual(a.bad, []);
    assert.equal(a.stopped, null);
    assert.ok(a.legs >= 1, `legs ${a.legs}`);
    assert.match(text, /^# Max Gravity play-through: seed 1, Captain /);
    assert.ok(a.records.some(r => r.k === 'scene' && r.taken), 'a scene with a choice taken');
    assert.ok(a.records.some(r => r.k === 'land'), 'a landing');
    assert.match(text, /\n### Landed at /);
    assert.match(text, /\*\*\(taken\)\*\*/);
    assert.match(text, /\n- Page errors: none\n/);
    assert.ok(fs.readdirSync(path.join(dirs[0], 'shots')).some(f => /^\d{3}-[a-z0-9-]+\.png$/.test(f)), 'the shots are written');
    assert.ok(!fs.existsSync(path.join(dirs[0], 'run.webm')), 'no video with video off');
    assert.equal(fs.readFileSync(path.join(dirs[1], 'transcript.md'), 'utf8'), text, 'the same seed, the same transcript');
    assert.equal(b.days, a.days);
  } finally {
    for (const d of dirs) fs.rmSync(d, { recursive: true, force: true });
  }
});
