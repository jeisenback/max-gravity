'use strict';

// The rotating watch bill (#1034, docs/superpowers/specs/2026-11-11-watch-bill-design.md): who stands the bridge and the engine-room watch each
// night (js/shiplife.js watchBill), and where the cutaway puts everyone at night by it.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./nodecontext');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

const { watchBill, routineSpot, WATCH_ORDER, nightsAhead, SHIP_DAY, nightStateOf, billOnOf, handWatchPostOf } = load(['js/data.js', 'js/util.js', 'js/figures.js', 'js/layouts.js', 'js/camera.js', 'js/rooms.js', 'js/shiplife.js', 'js/burnspeed.js'],
  { G: {}, Mods: { filter: (n, v) => v, emit() {}, register() {} } }, ['watchBill', 'routineSpot', 'WATCH_ORDER', 'nightsAhead', 'SHIP_DAY', 'nightStateOf', 'billOnOf', 'handWatchPostOf']);
const plain = x => JSON.parse(JSON.stringify(x));
const crew = (over = {}) => [
  { id: 'you', role: 'you' }, { id: 'p', role: 'pilot' }, { id: 'm', role: 'slicer' }, { id: 'c', role: 'xo' }, { id: 't', role: 'engineer' }, { id: 'h', role: 'icehand' },
].map(x => ({ hurt: false, ...x, ...(over[x.id] || {}) }));
const nights = (roster, n, post) => [...Array(n).keys()].map(k => watchBill(roster, k)[post]);

test('the bridge goes round the pilot, comms, the hand and the first officer, and the engine room round the engineer and the ice hand', () => {
  assert.deepEqual(plain(WATCH_ORDER), { bridge: ['pilot', 'slicer', 'you', 'xo'], engine: ['engineer', 'icehand'] });
  assert.deepEqual(nights(crew(), 8, 'bridge'), ['p', 'm', 'you', 'c', 'p', 'm', 'you', 'c']);
  assert.deepEqual(nights(crew(), 4, 'engine'), ['t', 'h', 't', 'h']);
});

test('someone hurt, or a role nobody holds, is passed over for the next in order; with nobody able the watch is empty', () => {
  assert.equal(watchBill(crew({ p: { hurt: true } }), 0).bridge, 'm', 'the pilot hurt on their night');
  assert.equal(watchBill(crew({ you: { hurt: true } }), 2).bridge, 'c', 'the hand hurt on their night');
  const small = [{ id: 'you', role: 'you', hurt: false }, { id: 'p', role: 'pilot', hurt: false }, { id: 't', role: 'engineer', hurt: false }];
  assert.deepEqual(nights(small, 4, 'bridge'), ['p', 'you', 'you', 'p'], 'no comms officer and no first officer: those who are aboard');
  assert.equal(watchBill(small, 1).engine, 't', 'no ice hand: the engineer');
  assert.deepEqual(plain(watchBill([], 0)), { bridge: null, engine: null });
});

const state = (bill, watch = null, hurt = []) => ({ marks: [], hurt, low: [], you: false, aid: null, watch, bill });
const you = { id: 'you', role: 'you' }, ines = { id: 'c:ines', role: 'pilot' }, tomas = { id: 'c:tomas', role: 'engineer' }, hana = { id: 'c:hana', role: 'icehand' };
const mateo = { id: 'c:mateo', role: 'slicer' };

test('at night whoever the bill names is at their watch\'s post, and everyone else is in a bunk, the pilot and the engineer too', () => {
  const s = state({ bridge: 'you', engine: 'c:hana' });
  assert.deepEqual(plain(routineSpot(you, 'night', s)), { room: 'bridge', at: 'post' });
  assert.deepEqual(plain(routineSpot(hana, 'night', s)), { room: 'engine', at: 'post' });
  assert.deepEqual(plain(routineSpot(ines, 'night', s)), { room: 'berths', at: 'bunk' });
  assert.deepEqual(plain(routineSpot(tomas, 'handover', s)), { room: 'berths', at: 'bunk' });
});

test('a scene\'s watch stands on top of the bill: at the guns the bill holds; on the bridge it takes the bill\'s place', () => {
  const bill = { bridge: 'c:ines', engine: 'c:tomas' };
  const guns = state(bill, { stands: 'you', post: 'gunnery', relieved: 'c:yelena', relievedAt: 'galley' });
  assert.deepEqual(plain(routineSpot(you, 'night', guns)), { room: 'gunnery', at: 'post' });
  assert.deepEqual(plain(routineSpot(ines, 'night', guns)), { room: 'bridge', at: 'post' });
  const bridge = state(bill, { stands: 'c:mateo', post: 'bridge', relieved: null, relievedAt: 'bunk' });
  assert.deepEqual(plain(routineSpot(mateo, 'night', bridge)), { room: 'bridge', at: 'post' });
  assert.deepEqual(plain(routineSpot(ines, 'night', bridge)), { room: 'berths', at: 'bunk' }, 'the bill\'s bridge turns in');
});

test('the hand hurt on their own night is in the medbay', () => {
  const s = { ...state({ bridge: 'you', engine: 'c:hana' }), you: true };
  assert.deepEqual(plain(routineSpot(you, 'night', s)), { room: 'medbay', at: 'bed' });
});

test('on the hand\'s bridge night the cutaway has them on the bridge and the pilot and the engineer asleep', async () => {
  const { ev, done } = await open();
  const r = await ev(() => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester' }); while (G.dialog) finishEvent();
    G.state.story.next = 1e9; G.state.tutorial = null;
    uatBurn('Earth', 'mars'); const t = G.transit; t.left = t.total * 0.3; t.times = []; t.aboard = null; shipPeople();
    let d = 0; while ((G.state.day + d) % 4 !== 2) d++;
    t.elapsed = (d + 0.75) * SHIP_DAY - 6;  // the night of the hand's bridge watch
    const state = shipState(G.state, t, ship().armor, () => 0.5, { aid: null, you: false });
    const spot = id => routineSpot(t.aboard.find(p => p.id === id), 'night', state);
    const ines = castPerson('ines').id, tomas = castPerson('tomas').id;
    const bunk = id => { const p = t.aboard.find(q => q.id === id); Object.assign(p, { room: 'berths', at: 'bunk', tx: null, dk: roomAt('berths').deck, tdk: roomAt('berths').deck, staged: false }); return isAsleep(p); };
    return { bill: state.bill, tomas, you: spot('you'), ines: spot(ines), asleep: [bunk(ines), bunk(tomas)] };
  });
  await done();
  assert.equal(r.bill.bridge, 'you');
  assert.deepEqual(r.you, { room: 'bridge', at: 'post' });
  assert.deepEqual(r.ines, { room: 'berths', at: 'bunk' });
  assert.deepEqual(r.asleep, [true, r.bill.engine !== r.tomas], 'Ines asleep; Tomas asleep unless he has the engine room tonight');
});

// ---------- seen and said (#1034, task 2) ----------

const burnHelpers = () => {
  window.onBurnAtNight = (bridgeIndex = 1) => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester' }); while (G.dialog) finishEvent();
    G.state.story.next = 1e9; G.state.tutorial = null; G.state.day += 8;  // past the road scenes' first days, at the same place in the rota
    uatBurn('Earth', 'mars'); const t = G.transit; t.left = t.total * 0.3; t.times = []; t.chatter = 1e9; t.aboard = null; shipPeople();
    let d = 0; while ((G.state.day + d) % 4 !== bridgeIndex) d++;
    t.elapsed = (d + 0.5) * SHIP_DAY - 6;  // supper, before that night's handover
    return t;
  };
};

test('the bill is said in one line: who has the bridge and who the engine room, "you" for the hand', async () => {
  const { ev, done } = await open();
  const r = await ev(() => {
    const names = { 'c:mateo': 'Mateo', 'c:hana': 'Hana', you: 'you' };
    return [billLine({ bridge: 'c:mateo', engine: 'c:hana' }, names), billLine({ bridge: 'you', engine: 'c:hana' }, names), billLine({ bridge: null, engine: 'c:hana' }, names)];
  });
  await done();
  assert.deepEqual(r, ['The watch tonight: Mateo on the bridge, Hana in the engine room.', 'The watch tonight: you on the bridge, Hana in the engine room.', 'The watch tonight: Hana in the engine room.']);
});

test('the line is said once as the handover begins, and not again through it; nothing is said at port', async () => {
  const { ev, done } = await open();
  await ev(burnHelpers);
  const r = await ev(() => {
    const t = onBurnAtNight(1), said = () => t.comms.filter(c => /The watch tonight/.test(c.text || c)).length;
    t.comms = []; G.speed = 1;
    lifeTick(0.016); const before = said();
    t.elapsed += SHIP_DAY * 0.06; lifeTick(0.016);  // into the handover
    const once = said();
    for (let i = 0; i < 10; i++) { t.elapsed += 0.2; lifeTick(0.016); }
    const after = said();
    G.mode = 'landed'; lifeTick(0.016);
    return { before, once, after, port: said() };
  });
  await done();
  assert.deepEqual(r, { before: 0, once: 1, after: 1, port: 1 });
});

test('the Watch bill card shows tonight and the next three nights on a burn, the hand\'s marked, and is not shown at port', async () => {
  const { ev, done } = await open();
  await ev(burnHelpers);
  const r = await ev(() => {
    onBurnAtNight(2).left = 10 * SHIP_DAY * burnSpeed(); const html = watchBillCard(), div = document.createElement('div'); div.innerHTML = html;
    const rows = [...div.querySelectorAll('.watch-night')].map(x => x.textContent);
    G.transit = null; G.mode = 'landed';
    return { title: /Watch bill/.test(div.textContent), rows, port: watchBillCard() };
  });
  await done();
  assert.equal(r.title, true);
  assert.equal(r.rows.length, 4);
  assert.match(r.rows[0], /\(yours\)/, 'tonight is the hand\'s bridge night');
  assert.equal(r.rows.filter(x => /\(yours\)/.test(x)).length, 1, 'once in four nights');
  assert.equal(r.port, '');
});

// ---------- the hand's nights (#1034, task 3) ----------

test('the night scenes follow the bill: the Middle Watch names tonight\'s bridge and not on the hand\'s night, the pump names the engine room', async () => {
  const { ev, done } = await open();
  await ev(burnHelpers);
  const r = await ev(() => {
    const t = onBurnAtNight(1); t.elapsed += SHIP_DAY * 0.25;  // Mateo's bridge night, Hana's engine room, in the night
    const scene = id => STORYLETS.find(s => s.id === id), holds = id => { const w = { ...sceneView(scene(id)).when }; delete w.chance; return meets(w); };
    const out = { dark: isDark(), mid: holds('road-night-watch'), midText: fill(scene('road-night-watch').text), pumpText: fill(scene('road-night-pump').text),
      stood: [meets({ watchStood: 'bridge' }), meets({ watchStood: 'engine' })], onWatch: meets({ onWatch: true }) };
    t.elapsed += SHIP_DAY;  // the next night: the hand's bridge
    out.mine = { mid: holds('road-night-watch'), onWatch: meets({ onWatch: true }), off: meets({ onWatch: false }) };
    t.elapsed -= SHIP_DAY * 0.5; out.byDay = meets({ onWatch: true });
    return out;
  });
  await done();
  assert.equal(r.dark, true);
  assert.equal(r.mid, true); assert.match(r.midText, /Mateo/); assert.match(r.pumpText, /Hana/);
  assert.deepEqual(r.stood, [true, true]); assert.equal(r.onWatch, false);
  assert.deepEqual(r.mine, { mid: false, onWatch: true, off: false });
  assert.equal(r.byDay, false, 'onWatch holds only with the lights down');
});

test('a contact on the hand\'s watch opens with them there; on another\'s night it does not; a scene at night on the hand\'s watch is staged at their post', async () => {
  const { ev, done } = await open();
  await ev(burnHelpers);
  const r = await ev(() => {
    const t = onBurnAtNight(2); t.elapsed += SHIP_DAY * 0.25;
    const opens = () => /^Sensors[^.]*\.[^]*?You have the watch when the board lights up\.|^You have the watch when the board lights up\./.test(contactEvent({ kind: 'pirate' }).text);
    const mine = opens(), cato = castPerson('cato').id, stage = sceneStage({ title: 'A Word', text: 'Nothing about a room.' }, t.aboard, [cato]);
    t.elapsed += SHIP_DAY;  // Cato's bridge night
    return { mine, other: opens(), stage: stage && stage.room, otherStage: (sceneStage({ title: 'A Word', text: 'Nothing about a room.' }, t.aboard, [cato]) || {}).room };
  });
  await done();
  assert.equal(r.mine, true); assert.equal(r.other, false);
  assert.equal(r.stage, 'bridge', 'staged where the hand keeps the watch');
  assert.equal(r.otherStage, 'galley', 'otherwise as before');
});

// ---------- the review's fixes (#1034) ----------

test('a scene that puts the hand elsewhere on their own bridge night leaves the bridge to the next in order, and the line names them once', async () => {
  const { ev, done } = await open();
  await ev(burnHelpers);
  const r = await ev(() => {
    const t = onBurnAtNight(2); t.elapsed += SHIP_DAY * 0.25;
    EFFECTS.standWatch({ stands: 'you', post: 'engine', relieved: 'engineer', relievedAt: 'bunk' });  // the captain's extra watch
    const state = shipState(G.state, t, ship().armor, () => 0.5, { aid: null, you: false }), b = billOn(0);
    const onBridge = t.aboard.filter(p => { const s = routineSpot(p, 'night', state); return s.room === 'bridge' && s.at === 'post'; }).map(p => p.id);
    return { onBridge, line: billLine(b, billNames(t.aboard)) };
  });
  await done();
  assert.equal(r.onBridge.length, 1, `someone has the bridge: ${r.onBridge}`);
  assert.notEqual(r.onBridge[0], 'you');
  assert.equal((r.line.match(/\byou\b/g) || []).length, 1, r.line);
  assert.match(r.line, /you in the engine room/);
});

test('the pump is not played on a night the hand keeps the engine room', async () => {
  const { ev, done } = await open();
  await ev(burnHelpers);
  const r = await ev(() => {
    const t = onBurnAtNight(1); t.elapsed += SHIP_DAY * 0.25;
    EFFECTS.standWatch({ stands: 'you', post: 'engine', relieved: 'icehand', relievedAt: 'bunk' });
    const w = { ...sceneView(STORYLETS.find(s => s.id === 'road-night-pump')).when }; delete w.chance;
    return meets(w);
  });
  await done();
  assert.equal(r, false);
});

test('the card says which watch is which', async () => {
  const { ev, done } = await open();
  await ev(burnHelpers);
  const r = await ev(() => { onBurnAtNight(1); const div = document.createElement('div'); div.innerHTML = watchBillCard(); return [...div.querySelectorAll('.watch-night')].map(x => x.textContent); });
  await done();
  assert.match(r[0], /bridge/); assert.match(r[0], /engine room/);
});

test('a hurt hand with a scene\'s watch does not keep it: no "You have the watch", not on the card or the line (#1052)', async () => {
  const { ev, done } = await open();
  await ev(burnHelpers);
  const r = await ev(() => {
    const t = onBurnAtNight(1); t.elapsed += SHIP_DAY * 0.25;
    career().hurtUntil = G.state.day + 5;
    t.watch = { night: shipDay(t.elapsed).day, stands: 'you', post: 'gunnery', relieved: null, relievedAt: 'bunk' };  // a scene's watch at the guns
    const guns = { post: handWatchPost(), opens: /You have the watch/.test(contactEvent({ kind: 'pirate' }).text) };
    EFFECTS.standWatch({ stands: 'you', post: 'engine', relieved: 'icehand', relievedAt: 'bunk' });
    const div = document.createElement('div'); div.innerHTML = watchBillCard();
    const b = billOn(0);
    return { guns, engine: b.engine, line: billLine(b, billNames(t.aboard)), tonight: div.querySelector('.watch-night').textContent, onWatch: meets({ onWatch: true }) };
  });
  await done();
  assert.equal(r.guns.post, null); assert.equal(r.guns.opens, false);
  assert.ok(r.engine && r.engine !== 'you', `someone else has the engine room: ${r.engine}`);
  assert.doesNotMatch(r.line, /\byou\b/, r.line);
  assert.doesNotMatch(r.tonight, /yours/, r.tonight);
  assert.equal(r.onWatch, false);
});

test('the nights after tonight that the burn lasts into: a night counts when its handover begins before arrival, three at most (#1053)', () => {
  const supper = 0.5 * SHIP_DAY - 6;  // ship day 0, before the handover
  assert.equal(nightsAhead(supper, supper + 10 * SHIP_DAY), 3);
  assert.equal(nightsAhead(supper, supper + 0.5 * SHIP_DAY), 0, 'arrives before tomorrow\'s handover');
  assert.equal(nightsAhead(supper, supper + 1.1 * SHIP_DAY), 1);
  assert.equal(nightsAhead(supper, supper + 2.1 * SHIP_DAY), 2);
});

test('the card shows only the nights the burn lasts into (#1053)', async () => {
  const { ev, done } = await open();
  await ev(burnHelpers);
  const r = await ev(() => {
    const t = onBurnAtNight(1), rows = () => { const div = document.createElement('div'); div.innerHTML = watchBillCard(); return div.querySelectorAll('.watch-night').length; };
    t.left = 1.2 * SHIP_DAY * burnSpeed();  // arrives a little after tomorrow's handover
    const short = rows(); t.left = 0.2 * SHIP_DAY * burnSpeed();
    return { short, last: rows() };
  });
  await done();
  assert.equal(r.short, 2, 'tonight and tomorrow');
  assert.equal(r.last, 1, 'tonight only');
});

// ---------- #1055, #1056 ----------

test('the readers take their state: tonight\'s ship state, the bill on a night and the hand\'s post, from the game state and the burn given (#1055)', () => {
  const st = { day: 2, crew: ['p', 's', 'e'], people: { p: { id: 'p', role: 'pilot' }, s: { id: 's', role: 'slicer' }, e: { id: 'e', role: 'engineer' } }, injured: { s: true } };
  const t = { elapsed: SHIP_DAY * 0.7 - 6 };  // ship day 0, the night: night 2, the bridge's turn index 2 is the hand
  const s = nightStateOf(st, t, false);
  assert.deepEqual(plain(s.hurt), ['s']); assert.equal(s.you, false);
  assert.deepEqual(plain(billOnOf(st, t, s, 0)), { bridge: 'you', engine: 'e' });
  assert.equal(handWatchPostOf(t, s, true), 'bridge', 'the hand keeps the bridge tonight');
  assert.equal(handWatchPostOf(t, s, false), null, 'not with the lights up');
  assert.equal(billOnOf(st, null, s, 0), null, 'no burn, no bill');
  assert.equal(nightStateOf(st, null, false), null);
});

test('the morning after a scene\'s watch, its stander is excused from the head, and the one it relieved is not (#1056)', async () => {
  const { ev, done } = await open();
  await ev(burnHelpers);
  const r = await ev(() => {
    const t = onBurnAtNight(1); t.elapsed += SHIP_DAY * 0.25;  // that night
    EFFECTS.standWatch({ stands: 'you', post: 'engine', relieved: 'engineer', relievedAt: 'bunk' });
    const rota = billFor(G.state, { hurt: [], you: false }, G.state.day + shipDay(t.elapsed).day).engine;
    while (shipDay(t.elapsed).block !== 'wake') t.elapsed += 0.5;
    const state = shipState(G.state, t, ship().armor, () => 0.5, { aid: null, you: false }), you = shipPeople().find(p => p.role === 'you'), relieved = shipPeople().find(p => p.id === rota);
    return { record: !!watchTonight(t), you: onWatchTonight(you, state), relieved: onWatchTonight(relieved, state) };
  });
  await done();
  assert.equal(r.record, true, 'the record holds through the wake');
  assert.equal(r.you, 'engine', 'the scene\'s stander kept the night: excused');
  assert.equal(r.relieved, null, 'the one it relieved slept: not excused');
});

test('the one a scene relieved from the engine stays asleep in the bunk through the wake while it is still dark (#1048)', async () => {
  const { ev, done } = await open();
  await ev(burnHelpers);
  const r = await ev(() => {
    const t = onBurnAtNight(1); t.elapsed += SHIP_DAY * 0.25;
    EFFECTS.standWatch({ stands: 'you', post: 'engine', relieved: 'engineer', relievedAt: 'bunk' });
    const rota = billFor(G.state, { hurt: [], you: false }, G.state.day + shipDay(t.elapsed).day).engine;
    while (shipDay(t.elapsed).block !== 'wake') t.elapsed += 0.5;
    const p = shipPeople().find(q => q.id === rota), b = roomAt('berths');
    Object.assign(p, { room: 'berths', dk: b.deck, tdk: b.deck, tx: null, at: 'bunk', staged: false });
    return { block: shipDay(t.elapsed).block, dark: isDark(), asleep: isAsleep(p) };
  });
  await done();
  assert.equal(r.block, 'wake'); assert.equal(r.dark, true, 'still dark at the start of the wake');
  assert.equal(r.asleep, true, 'drawn asleep, not awake in the bunk');
});
