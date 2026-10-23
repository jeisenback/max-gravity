'use strict';

// The play-through tool (tools/playthrough.js): a short seeded chapter with no video writes a transcript and shots, and the same seed writes the same transcript.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { open, closeBrowser } = require('./helpers');
const { playthrough, policy } = require('../tools/playthrough');
const { answerOrders } = require('../tools/answer');

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

// The player's ship-fight clicks (tools/playthrough.js policy) end, on each turn, with the panel holding the gunner move tools/answer.js chose (lead on its gun),
// or none: what Fire sends to the engine is read where it is resolved. Seeded fights against a pirate and a cutter, with all three moves known (every third with a gun locked, for vent), until each move has been ordered.
test('the play-through\'s player orders the gunner move the move rule chooses', async () => {
  const { ev, done } = await open({ scope: 'earth-hired', seed: 1, stall: 0 });
  const r = await ev(([policySrc, answerSrc]) => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester' }); while (G.dialog) finishEvent();
    G.state.story.next = 1e9; G.state.day += 30; hired().raidTold = true;
    uatBurn('Ceres Station', 'pallas'); G.transit.times = []; G.transit.event = null; G.dialog = null;
    const choose = (0, eval)(`(${policySrc})`), memo = {}, snap = JSON.stringify(G.state);
    window.__answer = (0, eval)(`(${answerSrc})`);
    const real = resolveShipTurn, sent = [];
    resolveShipTurn = (st, o, ...rest) => { sent.push({ move: o.move || null, gun: o.move === 'lead' ? o.gun : null }); return real(st, o, ...rest); };
    const out = { turns: 0, used: {}, wrong: [], stuck: 0, gaveUp: 0 };
    window.__pt = { stuck: () => { out.gaveUp++; } };  // the player's 40 clicks on a turn without its orders taking
    const SPECS = [{ kind: 'pirate' }, { kind: 'patrol', gov: 'Arcology Compact', shipId: 'cutter' }];
    try {
      for (let k = 0; k < 40 && !(out.used.vent && out.used.lead && out.used.split); k++) {
        G.state = JSON.parse(snap); G.dialog = null; G.nextEvent = null; G.duel = null; career().moves = ['vent', 'lead', 'split'];
        startDuel(SPECS[k % 2], false);
        const e0 = G.nextEvent; G.nextEvent = null; if (!e0 || !e0.fight) continue;
        const s = e0.fight;
        if (k % 3 === 2) { s.state.heat = FIGHT.HEAT_CAP; s.state.locked = [1]; }  // a gun locked from the start: the rule seldom runs that hot itself, so vent is set up
        openEvent(k % 3 === 2 ? shipFightEvent(s, { guns: Array.from({ length: s.state.me.guns }, () => ({ foe: 0, part: 'weapons' })), torp: null, pdc: 'fire' }) : e0);
        for (let clicks = 0; G.dialog && G.dialog.event.fight === s && clicks < 400; clicks++) {
          const d = G.dialog, ok = d.choices.map((c, i) => i).filter(i => !d.choices[i].can || d.choices[i].can());
          const i = choose(d, ok, memo), fire = i === ok[ok.length - 1] && ok.length > 1;
          const want = fire ? window.__answer(s) : null, n = sent.length;
          const next = chooseEvent(i);
          if (fire && sent.length > n) {
            out.turns++;
            const got = sent[sent.length - 1], w = { move: want.move || null, gun: want.move === 'lead' ? want.gun : null };
            if (got.move) out.used[got.move] = (out.used[got.move] || 0) + 1;
            if (got.move !== w.move || got.gun !== w.gun) out.wrong.push({ turn: s.state.turn, want: w, got });
          }
          if (d.choices[i].keep && next) openEvent(next); else finishEvent();
        }
        if (G.dialog && G.dialog.event.fight === s) out.stuck++;
      }
    } finally { resolveShipTurn = real; delete window.__pt; }
    return out;
  }, [policy.toString(), answerOrders.toString()]);
  await done();
  assert.deepEqual(r.wrong, [], 'each turn Fire sends the move the rule chose');
  assert.equal(r.gaveUp, 0, 'every turn\'s orders take within 40 clicks');
  assert.equal(r.stuck, 0, 'no fight left open');
  assert.ok(r.turns > 0);
  for (const id of ['vent', 'lead', 'split']) assert.ok(r.used[id] > 0, `${id} ordered: ${JSON.stringify(r.used)}`);
});
