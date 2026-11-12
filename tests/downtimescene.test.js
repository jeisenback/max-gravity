'use strict';

// Downtime as a scene (docs/superpowers/specs/2026-11-12-downtime-scene-design.md): once a slot, at a change of the ship's day, one scene
// says what's on in the ship; each choice is tagged where it happens; comms lines fade over the ship.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./nodecontext');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

const { downtimeDue, sitPerson, onDeck, shipDay, SHIP_DAY, DOWNTIME_BLOCKS } = load(['js/data.js', 'js/util.js', 'js/figures.js', 'js/layouts.js', 'js/camera.js', 'js/rooms.js', 'js/shiplife.js', 'js/burnspeed.js'],
  { G: {}, Mods: { filter: (n, v) => v, emit() {}, register() {} } }, ['downtimeDue', 'sitPerson', 'onDeck', 'shipDay', 'SHIP_DAY', 'DOWNTIME_BLOCKS']);
const plain = x => JSON.parse(JSON.stringify(x));

// ---------- the pure rules (task 1) ----------

test('the downtime scene is due at a change to breakfast, a shift, the meal or supper, once a slot', () => {
  const t = { total: 100, left: 90, slots: 2 };  // the 'before' slot
  assert.equal(downtimeDue(t, 'shift', 'breakfast'), true);
  assert.equal(downtimeDue(t, 'shift', 'shift'), false, 'no change');
  for (const b of ['handover', 'night', 'wake']) assert.equal(downtimeDue(t, b, 'supper'), false, b);
  assert.equal(downtimeDue({ ...t, lifeOffered: { before: true } }, 'meal', 'shift'), false, 'offered');
  assert.equal(downtimeDue({ ...t, lifeUsed: { before: true } }, 'meal', 'shift'), false, 'spent');
  assert.equal(downtimeDue({ ...t, lifeOffered: { before: true }, left: 40, flipped: true }, 'meal', 'shift'), true, 'the next slot');
});

test('the shortest slot still has a change that is due', () => {
  // a 2-slot burn of 1.2 ship days: each slot, 0.6 ship days long, holds at least one start of breakfast, a shift, the meal or supper
  for (let start = 0; start < SHIP_DAY; start += 4) {
    const blocks = []; for (let e = start; e < start + 0.6 * SHIP_DAY; e += 0.5) blocks.push(shipDay(e).block);
    assert.ok(blocks.some((b, i) => i && b !== blocks[i - 1] && DOWNTIME_BLOCKS.includes(b)), `from ${start}`);
  }
});

test('sit with someone: one having a hard time or hurt first, else by the day', () => {
  const c = [{ id: 'a' }, { id: 'b' }, { id: 'c', low: true }];
  assert.equal(sitPerson(c, 0).id, 'c');
  assert.equal(sitPerson([{ id: 'a' }, { id: 'b', hurt: true }], 4).id, 'b');
  assert.equal(sitPerson([{ id: 'a' }, { id: 'b' }], 3).id, 'b');
  assert.equal(sitPerson([], 1), null);
});

test('onDeck: a room for a place, an id for a person, nothing without a where', () => {
  const people = [{ id: 'c:ines', role: 'pilot' }];
  assert.deepEqual(plain(onDeck([{ label: 'Cards', where: 'galley' }, { label: 'Ask', where: ps => ps[0].id }, { label: 'X' }, { label: 'Y', where: () => null }], people)),
    [{ label: 'Cards', room: 'galley' }, { label: 'Ask', id: 'c:ines' }]);
});

// ---------- what's on, and where (task 2) ----------

// A hired hand on a burn, in the move phase, with the cutaway's people built; a passenger aboard when `pax`.
const burnHelpers = () => {
  window.onBurn = () => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester' }); while (G.dialog) finishEvent();
    G.state.story.next = 1e9; G.state.tutorial = null;
    uatBurn('Earth', 'mars'); const t = G.transit; t.left = t.total * 0.7; t.times = []; t.chatter = 1e9; t.aboard = null; shipPeople();
    return t;
  };
};

test('every activity a burn can offer says what is on, and where it is', async () => {
  const { ev, done } = await open({ scope: 'full' });
  await ev(burnHelpers);
  const r = await ev(() => {
    onBurn(); G.state.armor = Math.max(1, ship().armor - 50);  // the repair is on
    const people = shipPeople(), ids = new Set([...people.map(p => p.id).filter(Boolean), ...G.state.crew, hired().captain]), rooms = new Set(ROOMS.map(x => x.id)), bad = [];
    const all = [...Object.values(ACTIVITIES), ...handDowntime(), ...HAND_DOWNTIME.filter(d => d.cast), ...onNow()];
    for (const a of all) {
      const label = activityLabel(a);
      if (typeof a.on !== 'function') { bad.push(`${label}: no on()`); continue; }
      if (a.can && !a.can()) continue;
      const on = a.on();
      if (!on || /[{}]/.test(on)) bad.push(`${label}: on() ${on}`);
      const w = typeof a.where === 'function' ? a.where(people) : a.where;
      if (a.where !== undefined && !(rooms.has(w) || ids.has(w) || (w && G.state.people[w]))) bad.push(`${label}: where ${w}`);
    }
    return bad;
  });
  await done();
  assert.deepEqual(r, []);
});

test('the paid odd jobs are gone', async () => {
  const { ev, done } = await open();
  const r = await ev(() => ({ labels: HAND_DOWNTIME.map(d => activityLabel(d)), keys: Object.keys(SCENE_LINES['scene:downtime']) }));
  await done();
  assert.ok(!r.labels.some(l => /Mend|spare watch/i.test(l)), r.labels.join(' / '));
  assert.ok(!r.keys.some(k => /^(mend|spare)\./.test(k)), r.keys.filter(k => /^(mend|spare)/.test(k)).join(' '));
});

test('a shadowed or taught mate is the same in the line, the tag and the run', async () => {
  const { ev, done } = await open();
  await ev(burnHelpers);
  const r = await ev(() => {
    onBurn(); const people = shipPeople(), out = {};
    for (const key of ['shadow', 'teach']) {
      const a = HAND_DOWNTIME.find(d => activityLabel(d) === sceneSay('scene:downtime', `${key}.label`));
      if (!a.can()) { out[key] = 'cannot'; continue; }
      const id = a.where(people), p = person(id), before = JSON.stringify([p.opinion, p.memories, p.arc]), on = a.on();
      const text = a.run();
      out[key] = { named: on.includes(p.first), told: text.includes(p.first), liked: JSON.stringify([p.opinion, p.memories, p.arc]) !== before };
    }
    return out;
  });
  await done();
  for (const k of ['shadow', 'teach']) assert.deepEqual(r[k], { named: true, told: true, liked: true }, k);
});

// ---------- the scene (task 3) ----------

// Steps the burn as the game loop does (update, then the frame's hooks), closing other scenes and passing on the downtime scene; returns each
// downtime scene opened, with the slot, the block, the lights and the phase it opened in.
const runHelpers = () => {
  window.stepBurn = (dt, n, onDown) => {
    const seen = [];
    for (let i = 0; i < n && G.mode === 'transit' && G.transit; i++) {
      update(dt); Mods.emit('frame', dt);
      if (!G.dialog) continue;
      const e = G.dialog.event;
      if (e && e.downtime) {
        seen.push({ slot: lifeSlot(), block: shipDay(G.transit.elapsed).block, dark: isDark(), ph: phase() });
        const pass = e.choices.findIndex(c => c.label === sceneSay('scene:shiplife', 'none.label'));
        if (onDown) onDown(e); else chooseEvent(pass);
      }
      finishEvent();
    }
    return seen;
  };
};

test('on a burn the downtime scene opens once a slot, at a change of the ship day, at 1x and at 16x', async () => {
  const { ev, done } = await open();
  await ev(burnHelpers); await ev(runHelpers);
  const r = await ev(() => {
    const out = {};
    for (const speed of [1, 16]) {
      const t = onBurn(); t.left = t.total; t.elapsed = 0; setBurnSpeed(speed);
      const seen = stepBurn(0.05, 40000);
      out[speed] = { seen, slots: t.slots, arrived: G.mode !== 'transit' };
    }
    return out;
  });
  await done();
  for (const speed of ['1', '16']) {
    const { seen, slots, arrived } = r[speed];
    assert.ok(arrived, `${speed}x: the burn ran to arrival`);
    assert.equal(seen.length, slots, `${speed}x: one a slot (${JSON.stringify(seen)})`);
    assert.equal(new Set(seen.map(s => s.slot)).size, slots, `${speed}x: each slot once`);
    for (const s of seen) {
      assert.ok(['breakfast', 'shift', 'meal', 'supper'].includes(s.block), `${speed}x: at ${s.block}`);
      assert.equal(s.dark, false); assert.equal(s.ph, 'move');
    }
  }
});

test('choosing an activity runs it, spends the slot, logs it and sends the hand there; Pass spends nothing and it does not come back', async () => {
  const { ev, done } = await open();
  await ev(burnHelpers); await ev(runHelpers);
  const r = await ev(() => {
    const t = onBurn(), slot = lifeSlot();
    openEvent(downtimeScene(true)); const e = G.dialog.event, i = e.choices.findIndex(c => c.label === 'Practice at your post');
    t.comms = []; chooseEvent(i); finishEvent();
    const you = shipPeople().find(p => p.role === 'you'), chose = { spent: !lifeFree(t), log: t.comms.some(c => /^\[Ship\] Downtime: Practice/.test(c.text || c)), room: you.room, block: you.block };
    // a fresh slot: Pass at the change, and the next change in the slot opens nothing
    const u = onBurn(); u.left = u.total * 0.85; u.elapsed = SHIP_DAY * 0.1; u.lifeBlock = 'breakfast';
    let d = 0; while (shipDay(u.elapsed).block !== 'shift' && d++ < 200) u.elapsed += 0.5;
    lifeTick(0.016); const opened = !!(G.dialog && G.dialog.event.downtime);
    if (opened) { chooseEvent(G.dialog.choices.length - 1); finishEvent(); }
    d = 0; while (shipDay(u.elapsed).block !== 'meal' && d++ < 400) { u.elapsed += 0.5; lifeTick(0.016); }
    return { chose, post: postOf(POSTS[hired().post].role), slot, opened, passFree: lifeFree(u), again: !!G.dialog };
  });
  await done();
  assert.equal(r.chose.spent, true); assert.equal(r.chose.log, true);
  assert.equal(r.chose.room, r.post, 'the hand goes to their post'); assert.equal(r.chose.block, 'activity');
  assert.equal(r.opened, true, 'the scene opens at the change to a shift');
  assert.equal(r.passFree, true, 'Pass spends nothing'); assert.equal(r.again, false, 'and it does not come back that slot');
});

test('Sit with someone names one person, the one having a hard time first, and opens the sitting with them', async () => {
  const { ev, done } = await open();
  await ev(burnHelpers);
  const r = await ev(() => {
    onBurn(); const crew = G.state.crew.map(id => G.state.people[id]).filter(p => p && p.memories);
    const low = crew[crew.length - 1]; low.mood = { kind: 'low', until: G.state.day + 30, text: 'a message from home' };
    const e = downtimeScene(true), i = e.choices.findIndex(c => /^Sit with /.test(c.label)), tag = e.tags.find(x => /^Sit with /.test(x.label));
    G.dialog = { event: e, choices: e.choices }; chooseEvent(i);
    return { label: e.choices[i].label, first: low.first, id: low.id, tag: tag && tag.id, next: !!G.nextEvent && JSON.stringify(G.nextEvent).includes(low.first) };
  });
  await done();
  assert.equal(r.label, `Sit with ${r.first}`); assert.equal(r.tag, r.id); assert.equal(r.next, true);
});

test('with a scene already open at the change, the downtime scene waits for the next change in the slot', async () => {
  const { ev, done } = await open();
  await ev(burnHelpers);
  const r = await ev(() => {
    const u = onBurn(); u.left = u.total * 0.85; u.elapsed = SHIP_DAY * 0.1; u.lifeBlock = 'breakfast';
    let d = 0; while (shipDay(u.elapsed).block !== 'shift' && d++ < 200) u.elapsed += 0.5;
    openEvent({ title: 'Something else', text: 'x', choices: [{ label: 'OK', run: () => '' }] });
    lifeTick(0.016); const under = G.dialog.event.title;
    finishEvent(); lifeTick(0.016); const sameBlock = !!G.dialog;
    d = 0; while (shipDay(u.elapsed).block !== 'meal' && d++ < 400) { u.elapsed += 0.5; lifeTick(0.016); if (G.dialog) break; }
    return { under, sameBlock, next: !!(G.dialog && G.dialog.event.downtime), block: shipDay(u.elapsed).block };
  });
  await done();
  assert.equal(r.under, 'Something else', 'not stacked on the open scene');
  assert.equal(r.sameBlock, false, 'not later in the same block');
  assert.equal(r.next, true, `at the next change (${r.block})`);
});

test('a slot where nothing can run opens no scene', async () => {
  const { ev, done } = await open();
  await ev(burnHelpers);
  const r = await ev(() => {
    const real = window.downtimeFive; window.downtimeFive = () => [{ label: 'Nothing', can: () => false, run: () => '' }];
    try {
      const u = onBurn(); u.left = u.total * 0.85; u.elapsed = SHIP_DAY * 0.1; u.lifeBlock = 'breakfast';
      let d = 0; while (shipDay(u.elapsed).block !== 'shift' && d++ < 200) u.elapsed += 0.5;
      lifeTick(0.016); return !!G.dialog;
    } finally { window.downtimeFive = real; }
  });
  await done();
  assert.equal(r, false);
});

test('a burn from an older save, with no lifeOffered or lifeBlock, still gets its scene and nothing throws', async () => {
  const { ev, done } = await open();
  await ev(burnHelpers);
  const r = await ev(() => {
    const u = onBurn(); u.left = u.total * 0.85; u.elapsed = SHIP_DAY * 0.2; delete u.lifeOffered; delete u.lifeBlock;
    let threw = null, d = 0;
    try { while (!G.dialog && d++ < 400) { u.elapsed += 0.5; lifeTick(0.016); } } catch (e) { threw = String(e); }
    return { threw, opened: !!(G.dialog && G.dialog.event.downtime) };
  });
  await done();
  assert.deepEqual(r, { threw: null, opened: true });
});

test('there is no Spend some downtime button anywhere: not under the ship, not on the Interior sheet', async () => {
  const { ev, done } = await open();
  await ev(burnHelpers);
  const r = await ev(() => { onBurn(); return { tlife: !!document.getElementById('tlife'), sheet: interiorPanel() }; });
  await done();
  assert.equal(r.tlife, false);
  assert.doesNotMatch(r.sheet, /Spend some downtime|data-bdown/);
});
