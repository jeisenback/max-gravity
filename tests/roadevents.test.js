'use strict';

// The five incidents the hand decides on the road (js/hiredevents.js, group 'road'): they are drawn with the road group's weight, every choice reads whole,
// the gunner's own choice needs level 2 and is shown shut below it, and the effects do what the choices say (opinion, experience, a little hull).

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

const helpers = () => {
  window.startHired = (post = 'gunner') => { startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post, captainKey: 'hester' }); while (G.dialog) finishEvent(); G.state.tutorial = null; G.state.story.next = 1e9; };
  window.IDS = ['road-dust', 'road-tender', 'road-beacon', 'road-frost', 'road-hail'];
  window.stage = (id, xp = 0) => { startHired(); if (xp) gainSkill('gunner', xp); uatBurn('Ceres Station', 'pallas'); G.player = G.player || makeShip(G.state.shipId, 0, 0, 0); G.transit.times = []; G.transit.event = null; G.dialog = null; const e = HAND_EVENTS.find(x => x.id === id).make(handContext()); openEvent(e); return G.dialog; };
};

test('the road group holds the five incidents and the group is drawn with the weight it was given', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => ({ road: HAND_EVENTS.filter(d => d.group === 'road').map(d => d.id), weight: HIRED_WEIGHTS.road, ids: IDS.every(id => HAND_EVENTS.find(d => d.id === id && d.group === 'road')) }));
  assert.equal(r.ids, true); assert.equal(r.road.length, 6, 'the five and the post-gated scene on the lane');
  assert.equal(r.weight, 3, 'the same weight as the work group');
  await done();
});

test('every choice of the five reads whole, and the gunner\'s choice is shut below level 2 and open at it', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const out = { bad: [], shut: {}, open: {} };
    for (const id of IDS) {
      const d0 = stage(id);
      out.shut[id] = d0.choices.map(c => [c.label.startsWith('[Gunner 2]'), c.can ? !!c.can() : true]).filter(x => x[0]).map(x => x[1]);
      const d1 = stage(id, SKILL_STEPS[2]);
      out.open[id] = d1.choices.map(c => [c.label.startsWith('[Gunner 2]'), c.can ? !!c.can() : true]).filter(x => x[0]).map(x => x[1]);
      const n = d1.choices.length;
      for (let j = 0; j < n; j++) {
        const d = stage(id, SKILL_STEPS[2]);
        if (/[{}]|undefined|NaN/.test(d.event.text)) out.bad.push(`${id}: ${d.event.text}`);
        const text = String(chooseEvent(j));
        if (/[{}]|undefined|NaN/.test(text)) out.bad.push(`${id}.${j}: ${text}`);
        while (G.dialog) finishEvent();
      }
    }
    return out;
  });
  assert.deepEqual(r.bad, []);
  for (const id of ['road-dust', 'road-tender', 'road-beacon', 'road-frost', 'road-hail']) { assert.deepEqual(r.shut[id], [false], `${id}: shut below level 2`); assert.deepEqual(r.open[id], [true], `${id}: open at level 2`); }
  await done();
});

test('the choices change the captain\'s opinion and the hand\'s experience as they say, and holding course through the dust costs hull', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const out = {}, run = (id, j) => { const d = stage(id, SKILL_STEPS[2]); const cap = person(hired().captain), op = cap.opinion, xp = skillXp('gunner'), armor = G.player.armor; chooseEvent(j); const r = { op: cap.opinion - op, xp: skillXp('gunner') - xp, armor: G.player.armor - armor }; while (G.dialog) finishEvent(); return r; };
    out.dustTell = run('road-dust', 0); out.dustHold = run('road-dust', 1); out.dustGunner = run('road-dust', 2);
    out.tenderSilent = run('road-tender', 1); out.frostHammer = run('road-frost', 0); out.hailPass = run('road-hail', 0);
    return out;
  });
  assert.deepEqual([r.dustTell.op, r.dustTell.xp], [1, 0]); assert.deepEqual([r.dustGunner.op > 0, r.dustGunner.xp > 0], [true, true]);
  assert.ok(r.dustHold.armor < 0 && r.dustHold.op === 0, 'holding course costs hull and nothing with the captain');
  assert.deepEqual([r.tenderSilent.op, r.tenderSilent.xp], [0, 0]); assert.deepEqual([r.frostHammer.op, r.frostHammer.xp > 0], [0, true]); assert.equal(r.hailPass.op, 1);
  await done();
});
