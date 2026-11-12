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

test('coming off the couches is a moment too: after the flip, or at the start of the burn (review)', () => {
  const t = { total: 100, left: 40, slots: 2, flipped: true };
  assert.equal(downtimeDue(t, 'supper', 'supper', 'move', 'secure'), true);
  assert.equal(downtimeDue(t, 'supper', 'supper', 'move', 'move'), false, 'no change');
  assert.equal(downtimeDue(t, 'supper', 'supper', 'move', undefined), false, 'a burn just loaded');
  assert.equal(downtimeDue({ ...t, lifeOffered: { after: true } }, 'supper', 'supper', 'move', 'secure'), false, 'offered');
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

// ---------- the tags in the cutaway (task 4) ----------

test('while the downtime scene is open its choices are tagged: on the room for a place, over the person for a person; none after', async () => {
  const { ev, done } = await open();
  await ev(burnHelpers);
  const r = await ev(() => {
    const t = onBurn(); t.left = t.total * 0.6; t.lifeBlock = shipDay(t.elapsed).block;
    shipPeople()[0].x = 0.4;  // the hand off their couch at the bridge's end post (#990), mid-ship: the camera keeps them in the part the scene leaves clear, the galley too
    const mate = shipPeople().find(p => p.id && p.role !== 'you' && p.role !== 'captain');
    const real = window.downtimeFive;
    window.downtimeFive = () => [ACTIVITIES.meal, { label: 'Cards in the galley', on: () => 'x', where: 'galley', run: () => '' },
      { label: 'Talk to them', on: () => 'x', where: () => mate.id, run: () => '' }, { label: 'And again', on: () => 'x', where: () => mate.id, run: () => '' },
      { label: 'A long label for whoever stands nearest the edge', on: () => 'x', where: () => window.edgeId, run: () => '' }];
    try {
      openEvent(downtimeScene()); render();
      window.edgeId = G.cutHits.slice().sort((a, b) => b.head.x - a.head.x)[0].id; finishEvent(); openEvent(downtimeScene()); render();
      const tags = (G.burnBoxes.tags || []).slice(), rooms = G.cutRooms.slice(), hits = G.cutHits.slice(), clear = G.burnBoxes.clear || G.burnBoxes.ship;
      finishEvent(); render();
      return { tags, rooms, hits, clear, mate: mate.id, after: (G.burnBoxes.tags || []).length };
    } finally { window.downtimeFive = real; }
  });
  await done();
  assert.ok(r.tags.length >= 1, 'something is tagged');
  for (const g of r.tags) {
    if (g.room) {
      const b = r.rooms.find(x => x.id === g.room);
      assert.ok(b && g.x >= b.x && g.x + g.w <= b.x + b.w + 0.5 && g.y >= b.y && g.y + g.h <= b.y + b.h + 0.5, `${g.label} inside the ${g.room}`);
    } else {
      const h = r.hits.find(x => x.id === g.id);
      assert.ok(h && g.y + g.h <= h.head.y && g.x <= h.head.x && g.x + g.w >= h.head.x, `${g.label} over ${g.id}'s head`);
    }
  }
  assert.ok(r.tags.some(g => g.room === 'galley'), 'the meal on the galley');
  const meets = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
  for (let i = 0; i < r.tags.length; i++) for (let j = i + 1; j < r.tags.length; j++) assert.ok(!meets(r.tags[i], r.tags[j]), `${r.tags[i].label} and ${r.tags[j].label} do not overlap`);
  assert.equal(r.tags.filter(g => g.room === 'galley').length, 2, 'two on one room, stacked');
  for (const g of r.tags) assert.ok(g.x >= r.clear.x && g.x + g.w <= r.clear.x + r.clear.w + 0.5, `${g.label} inside the part the scene leaves clear`);
  if (r.hits.some(h => h.id === r.mate)) assert.ok(r.tags.some(g => g.id === r.mate), 'the person tagged when in view');
  assert.equal(r.after, 0, 'no tags once the scene is closed');
});

test('a tagged person out of view gets no tag, and nothing throws', async () => {
  const { ev, done } = await open();
  await ev(burnHelpers);
  const r = await ev(() => {
    const t = onBurn(); t.left = t.total * 0.6; t.lifeBlock = shipDay(t.elapsed).block;
    shipPeople()[0].x = 0.4;  // the hand off their couch at the bridge's end post (#990), mid-ship: the camera keeps them in the part the scene leaves clear, the galley too
    const real = window.downtimeFive;
    window.downtimeFive = () => [ACTIVITIES.meal, { label: 'Nobody', on: () => 'x', where: () => 'c:nobody-aboard', run: () => '' }];
    try { openEvent(downtimeScene()); let threw = null; try { render(); } catch (e) { threw = String(e); } return { threw, tags: (G.burnBoxes.tags || []).map(g => g.room || g.id) }; } finally { window.downtimeFive = real; finishEvent(); }
  });
  await done();
  assert.equal(r.threw, null); assert.deepEqual(r.tags, ['galley']);
});

test('a person tag at the edge of the clear part is kept inside it', async () => {
  const { ev, done } = await open();
  const r = await ev(() => drawDowntimeTags([{ label: 'A long label for someone at the edge', id: 'z' }], [], [{ id: 'z', head: { x: 995, y: 300 } }], { x: 0, y: 0, w: 1000, h: 800 }));
  await done();
  assert.equal(r.length, 1); assert.ok(r[0].x + r[0].w <= 1000 && r[0].x >= 0, JSON.stringify(r[0]));
});

// ---------- comms over the ship (task 5) ----------

test('at 1280x800 the cutaway shows all four decks, and a comms line is drawn over it and gone after six seconds', async () => {
  const { ev, done } = await open();
  await ev(burnHelpers);
  const r = await ev(() => {
    const t = onBurn(); t.lifeOffered = { before: true, m1: true, m2: true, m3: true, after: true }; t.comms = []; t.commsAt = [];
    comm('[Ship] A line to read.'); render();
    const now = { comms: G.burnBoxes.comms || null, ship: G.burnBoxes.ship, decks: LAYOUTS.freighter.decks.length, rooms: G.cutRooms.map(x => x.id) };
    G.time += 6.5; render();
    return { ...now, later: G.burnBoxes.comms || null, ticker: G.burnBoxes.ticker || null };
  });
  await done();
  assert.ok(r.comms, 'the line is drawn'); assert.ok(r.comms.y >= r.ship.y && r.comms.y + r.comms.h <= r.ship.y + r.ship.h, 'over the ship');
  assert.equal(r.later, null, 'gone after six seconds'); assert.equal(r.ticker, null, 'no ticker');
  for (const room of ['gunnery', 'workshop']) assert.ok(r.rooms.includes(room), `${room} in view (${r.rooms})`);
});

test('the tutorial prompt stays over the ship until its step is done, and is hidden under a scene', async () => {
  const { ev, done } = await open();
  await ev(burnHelpers);
  const r = await ev(() => {
    const t = onBurn(); t.lifeOffered = { before: true, m1: true, m2: true, m3: true, after: true }; G.state.tutorial = 1; render();
    const shown = G.burnBoxes.tutorial || null, ship = G.burnBoxes.ship;
    G.time += 30; render(); const still = !!G.burnBoxes.tutorial;
    openEvent({ title: 'x', text: 'x', choices: [{ label: 'OK', run: () => '' }] }); render(); const under = !!G.burnBoxes.tutorial;
    finishEvent(); return { shown, ship, still, under };
  });
  await done();
  assert.ok(r.shown && r.shown.y >= r.ship.y && r.shown.y + r.shown.h <= r.ship.y + r.ship.h, 'inside the ship');
  assert.equal(r.still, true, 'it does not fade'); assert.equal(r.under, false, 'hidden under a scene');
});

test('tags on people standing side by side do not overlap', async () => {
  const { ev, done } = await open();
  const r = await ev(() => drawDowntimeTags([{ label: 'Run the range with Pax', id: 'a' }, { label: 'Sit with Tomas', id: 'b' }, { label: 'Card night', room: 'galley' }],
    [{ id: 'galley', x: 200, y: 180, w: 300, h: 160 }], [{ id: 'a', head: { x: 360, y: 240 } }, { id: 'b', head: { x: 420, y: 240 } }], { x: 0, y: 0, w: 1000, h: 800 }));
  await done();
  const meets = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
  assert.equal(r.length, 3);
  for (let i = 0; i < r.length; i++) for (let j = i + 1; j < r.length; j++) assert.ok(!meets(r[i], r[j]), `${r[i].label} / ${r[j].label}`);
});

// ---------- the final review's fixes ----------

test('a one-day burn on a tuned drive still offers both slots (review: the after slot had no change of the day before the couches)', async () => {
  const { ev, done } = await open();
  await ev(burnHelpers); await ev(runHelpers);
  const r = await ev(() => {
    const t = onBurn(); G.state.tuned = true;  // burnSpeed 1.1
    t.days = 1; t.total = transitSeconds(1); t.left = t.total; t.elapsed = 0; t.slots = lifeSlotCount(1); t.flipped = false; setBurnSpeed(16);
    const seen = stepBurn(0.05, 40000);
    return { seen: seen.map(s => s.slot), slots: t.slots, arrived: G.mode !== 'transit', speed: burnSpeed() };
  });
  await done();
  assert.ok(r.arrived); assert.ok(r.speed > 1.05);
  assert.deepEqual(r.seen, ['before', 'after'], JSON.stringify(r));
});

test('a scene does not name the same shipmate in two choices, and Sit with someone turns from slot to slot (review)', async () => {
  const { ev, done } = await open();
  await ev(burnHelpers);
  const r = await ev(() => {
    const out = { dupes: [], sits: [] };
    for (let d = 0; d < 6; d++) {
      const t = onBurn(); G.state.day += d; t.slots = 4; t.flipped = false; const sits = [];
      for (const p of [0.1, 0.3, 0.6, 0.9]) {
        t.left = t.total * (1 - p); if (p > 0.5) t.flipped = true;
        const e = downtimeScene(true), cap = hired().captain, ids = e.tags.filter(g => g.id && g.id !== cap).map(g => g.id);
        const twice = ids.filter((id, i) => ids.indexOf(id) !== i);
        if (twice.length) out.dupes.push(`day+${d} ${lifeSlot()}: ${e.tags.filter(g => twice.includes(g.id)).map(g => g.label).join(' / ')}`);
        sits.push((e.tags.find(g => /^Sit with /.test(g.label)) || {}).id);
      }
      out.sits.push(new Set(sits).size);
    }
    return out;
  });
  await done();
  assert.deepEqual(r.dupes, []);
  assert.ok(r.sits.every(n => n >= 2), `Sit with someone turns within a burn (${r.sits})`);
});

// ---------- the minors (#1086, #1087, #1089) ----------

test('the tags go once a choice is made: none on the result page (#1086)', async () => {
  const { ev, done } = await open();
  await ev(burnHelpers);
  const r = await ev(() => {
    const t = onBurn(); t.left = t.total * 0.6; t.lifeBlock = shipDay(t.elapsed).block;
    const real = window.downtimeFive; window.downtimeFive = () => [ACTIVITIES.meal];
    try {
      openEvent(downtimeScene()); render(); const before = (G.burnBoxes.tags || []).length;
      UI.act('choose', 0); render(); const result = !!document.getElementById('event-result'), after = (G.burnBoxes.tags || []).length;
      finishEvent(); return { before, result, after };
    } finally { window.downtimeFive = real; }
  });
  await done();
  assert.ok(r.before > 0); assert.equal(r.result, true); assert.equal(r.after, 0);
});

test('a person tag near the top of the clear part stays inside it (#1087)', async () => {
  const { ev, done } = await open();
  const r = await ev(() => drawDowntimeTags([{ label: 'Ask the captain', id: 'z' }, { label: 'Go over the figures', id: 'z' }], [], [{ id: 'z', head: { x: 300, y: 112 } }], { x: 0, y: 100, w: 1000, h: 700 }));
  await done();
  for (const g of r) assert.ok(g.y >= 100, `${g.label} at ${g.y}`);
  assert.ok(r.length >= 1, 'at least one still drawn');
});

test('comms set by hand do not take the times of the lines they replaced (#1089)', async () => {
  const { ev, done } = await open();
  await ev(burnHelpers);
  const r = await ev(() => {
    const t = onBurn(); t.comms = []; t.commsAt = [];
    for (let i = 0; i < 6; i++) comm(`[Ship] old ${i}`);
    t.comms = ['[Ship] set by hand'];  // commsAt left as it was: six recent times
    comm('[Ship] new');
    return commsShown(t.comms, t.commsAt, G.time).map(x => x.text);
  });
  await done();
  assert.deepEqual(r, ['[Ship] new']);
});
