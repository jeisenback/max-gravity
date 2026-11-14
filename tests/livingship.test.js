'use strict';

// The living ship: the burn's phase weights and the g reading (js/burnpanel.js), and the phases of a run (js/shiplife.js), in plain Node.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./nodecontext');

const { phaseWeights: weights, gReading } = load(['js/burnpanel.js'], { G: {} }, ['phaseWeights', 'gReading']);
const phaseWeights = pr => JSON.parse(JSON.stringify(weights(pr)));  // out of the vm context, so plain objects
const G = {};
const { shipState, marksFor, shipRand, shipDay, routineSpot, routineWait, FIG_GROUNDED, SHIP_DAY, sceneStage, phase, posture, POSTURES, LADDER, drawPerson, camStep, viewOf, outlineLayout, outlineRoomAt, ROOMS, drawOutline, hangEnd, holdLampEnd, HOLD_LAMP_CABLE, worldText, drawRoom, drawPhaseLight, drawThrustSign, roomAt, SEATS, figPose, figStyle, figureMood, roomMessTable, roomBox, roomWalls, roomScreen, gaugeNeedle, LAYOUTS, layoutRooms, climbRate, HAUNTS, towerDeckY, deckFloor, layoutBox, couchPlace, couchPlan, couchPlaces, COUCH_RACKS, towerHeight, camRun, camTarget, towerOutline, TOWER_BELL, outlineAt, berthBunk, berthSleeper, goTo, routineGo, handOver, layoutRoomAt } = load(['js/data.js', 'js/util.js', 'js/figures.js', 'js/layouts.js', 'js/camera.js', 'js/rooms.js', 'js/shiplife.js', 'js/burnspeed.js'], { G, Mods: { filter: (n, v) => v, emit() {}, register() {} } }, ['phase', 'posture', 'POSTURES', 'LADDER', 'drawPerson', 'camStep', 'viewOf', 'outlineLayout', 'outlineRoomAt', 'ROOMS', 'drawOutline', 'hangEnd', 'holdLampEnd', 'HOLD_LAMP_CABLE', 'worldText', 'drawRoom', 'drawPhaseLight', 'drawThrustSign', 'sceneStage', 'shipRand', 'shipDay', 'routineSpot', 'SHIP_DAY', 'routineWait', 'FIG_GROUNDED', 'marksFor', 'shipState', 'figStyle', 'figureMood', 'roomMessTable', 'roomAt', 'SEATS', 'figPose', 'roomBox', 'roomWalls', 'roomScreen', 'gaugeNeedle', 'LAYOUTS', 'layoutRooms', 'climbRate', 'HAUNTS', 'towerDeckY', 'deckFloor', 'layoutBox', 'couchPlace', 'couchPlan', 'couchPlaces', 'COUCH_RACKS', 'towerHeight', 'camRun', 'camTarget', 'towerOutline', 'TOWER_BELL', 'outlineAt', 'berthBunk', 'berthSleeper', 'goTo', 'routineGo', 'handOver', 'layoutRoomAt']);

const fakeCtx = () => { const calls = [], fonts = [], args = [], styles = []; let depth = 0; const c = new Proxy({}, { get: (o, k) => k in o ? o[k] : k === 'calls' ? calls : k === 'depth' ? depth : k === 'save' ? () => { depth++; calls.push(k); } : k === 'restore' ? () => { depth--; calls.push(k); } : k === 'fonts' ? fonts : k === 'args' ? args : k === 'styles' ? styles : k === 'measureText' ? s => ({ width: String(s).length * 6 }) : /Gradient|createPattern/.test(k) ? () => ({ addColorStop() {} }) : (...a) => { calls.push(k); if (/^(moveTo|lineTo|quadraticCurveTo|translate|rotate|fillRect)$/.test(k)) args.push(k + a.map(v => Math.round(v * 1000) / 1000).join()); }, set: (o, k, v) => { if (k === 'font') fonts.push(v); if (k === 'fillStyle' || k === 'strokeStyle') styles.push(String(v).toLowerCase()); o[k] = v; return true; } }); return c; };
test('a scene is staged where it says, by its words, or by who is in it', () => {
  const aboard = [{ id: 'you', role: 'you' }, { id: 'c:tomas', role: 'engineer' }, { id: 'cap', role: 'captain' }, { id: 'p1', role: 'passenger' }];
  const st = (ev, ids) => JSON.parse(JSON.stringify(sceneStage({ title: 'With Tomas', text: '', ...ev }, aboard, ids)));
  assert.deepEqual(st({ room: 'hold', text: 'in the galley' }, ['c:tomas']), { room: 'hold', ids: ['you', 'c:tomas'] }, 'the room it sets');
  assert.equal(st({ text: 'He is on the bench in the engine room, and later in the galley.' }, ['c:tomas']).room, 'engine', 'the first room it names');
  assert.equal(st({ text: 'They talk at the table.' }, ['c:tomas']).room, 'galley');
  assert.equal(st({ text: 'Nothing about a room.' }, ['cap']).room, 'bridge', 'the captain');
  assert.equal(st({ text: 'Nothing about a room.' }, ['p1']).room, 'berths', 'a passenger');
  assert.equal(st({ text: 'Nothing about a room.' }, ['c:tomas']).room, 'galley', 'otherwise the galley');
  assert.deepEqual(st({ text: 'In the galley.' }, ['c:tomas', 'bar:stranger']).ids, ['you', 'c:tomas'], 'only those aboard');
  assert.equal(st({ text: 'In the galley.' }, ['bar:stranger']), null, 'nobody aboard: no stage');
  assert.equal(st({ text: 'In the galley.', board: '<svg/>' }, ['c:tomas']), null, 'a fight: no stage');
  assert.equal(st({ text: 'Tomas has the cards out on the galley table.', downtime: true }, ['c:tomas']), null, 'the downtime scene: no stage (#1169)');
  assert.equal(st({ text: 'The holdout says no.' }, ['c:tomas']).room, 'galley', 'whole words only');
});
test('every posture draws, faced either way, and gives a point to tap; the head is drawn, never a picture', () => {
  for (const name of Object.keys(POSTURES)) for (const face of [1, -1]) for (const frame of [0, POSTURES[name].frames - 1]) {
    const c = fakeCtx(), at = drawPerson(c, { name, x: 0.5, deck: 0, face, frame }, 400, 100, { color: '#ffb347', skin: '#c08a68', hair: '#2a1d18' });
    assert.ok(c.calls.length > 0, `${name} drew`); assert.equal(c.depth, 0, `${name}: every save is restored`); assert.ok(at.y < 100 && at.y > 100 - 80, `${name}: a tap point on the body`);
    assert.ok(!c.calls.includes('drawImage'), `${name}: no portrait in the cutaway`);
  }
});
// #958: the figure is drawn from parts, and people differ: the hair follows the portrait's cut, and the face shows the mood.
test('every posture draws in every hair style and mood, with every save restored (#958)', () => {
  for (const name of Object.keys(POSTURES).filter(n => !n.startsWith('cat'))) for (let v = 0; v < 12; v++) for (const mood of [undefined, 'good', 'low', 'hurt']) for (const floating of [0, 1]) {
    const c = fakeCtx(), at = drawPerson(c, { name, x: 0.5, deck: 0, face: 1, frame: 0 }, 400, 100, { color: '#ffb347', skin: '#c08a68', hair: '#2a1d18', cut: v % 3, v: v * 37, mood, floating });
    assert.equal(c.depth, 0, `${name} v${v} ${mood}: every save is restored`); assert.ok(at.y < 100 && at.y > 20, `${name}: a tap point on the body`);
  }
});
test('the hair style follows the portrait\'s cut, and the rest varies by person (#958)', () => {
  const styles = cut => new Set(Array.from({ length: 64 }, (_, v) => figStyle({ cut, v }).style));
  assert.deepEqual([...styles(0)].sort(), ['crop', 'curls'], 'cut 0 is short');
  assert.deepEqual([...styles(1)].sort(), ['bun', 'loose', 'tail'], 'cut 1 is long');
  assert.deepEqual([...styles(2)].sort(), ['bald', 'buzz'], 'cut 2 is close');
  const all = Array.from({ length: 2048 }, (_, v) => figStyle({ cut: 0, v }));
  for (const k of ['face', 'nose', 'build', 'brow']) assert.ok(new Set(all.map(s => s[k])).size > 1, `${k} varies`);
  assert.ok(Array.from({ length: 2048 }, (_, v) => figStyle({ cut: 1, v })).every(s => s.face === 'none'), 'no beard with long hair');
  assert.deepEqual(figStyle({ cut: 2, v: 99 }), figStyle({ cut: 2, v: 99 }), 'the same person looks the same every time');
});
test('the face shows the mood: hurt over low, low over high spirits, and you when you are hurt (#958)', () => {
  const st = { day: 10, injured: { a: true }, people: { a: { mood: { kind: 'low', until: 20 } }, b: { mood: { kind: 'low', until: 20 } }, c: { mood: { kind: 'high', until: 20 } }, d: { mood: { kind: 'low', until: 5 } }, e: {} } };
  assert.equal(figureMood(st, 'a', false), 'hurt'); assert.equal(figureMood(st, 'b', false), 'low'); assert.equal(figureMood(st, 'c', false), 'good');
  assert.equal(figureMood(st, 'd', false), undefined, 'a mood that has passed'); assert.equal(figureMood(st, 'e', false), undefined);
  assert.equal(figureMood(st, 'you', true), 'hurt'); assert.equal(figureMood(st, 'you', false), undefined);
});
test('on a crash couch a person lies flat on their back (#972)', () => {
  for (const face of [1, -1]) {
    const at = drawPerson(fakeCtx(), { name: 'couch', face, frame: 0 }, 400, 100, { color: '#ffb347' });
    assert.ok(Math.abs(at.head.y - at.foot.y) <= 12, `face ${face}: flat, head ${at.head.y} and foot ${at.foot.y}`);
    assert.ok(at.head.x < 400, `face ${face}: the head toward the couch's head end, on the left`);
  }
});
// #990: in the hard burn the bridge's station chairs recline into crash couches (the gunnery's stay upright: no room between its consoles
// and the torpedo rack to lie down) and the berths keep a rack of them. couchPlan puts each of the company (in bunkOwners' order) on one: a
// station's own first (its role's post on the bridge, the hand at theirs, else a free bridge post), then the rack in order, then a station
// left free, then a bunk; no two in one place, up to the largest company the game carries.
const planKeys = plan => plan.map(q => (q.at === 'station' ? `${q.room}:${q.seat}` : q.at === 'rack' ? `rack ${q.k}` : 'bunk'));
test('who lies where: a station\'s own on its couch, the rest on the rack in order, then a free station, then a bunk (#990)', () => {
  const start = ['you', 'captain', 'pilot', 'engineer', 'slicer', 'xo', 'icehand'];
  assert.equal(planKeys(couchPlan(start, 'gunner')).join(), 'bridge:3,bridge:2,bridge:1,rack 0,bridge:0,rack 1,rack 2', 'the hired start, a gunner hand: the captain, the pilot and the slicer at their posts, the hand at the free one');
  assert.equal(planKeys(couchPlan(['you', 'captain', 'pilot', 'gunner', 'slicer'], 'engineer'))[0], 'bridge:3', 'a hand whose post has no station: a free bridge post');
  assert.equal(planKeys(couchPlan(['you', 'captain', 'gunner', 'engineer', 'slicer'], 'pilot')).slice(0, 3).join(), 'bridge:1,bridge:2,rack 0', 'a pilot hand at the helm, a crew gunner on a rack');
  assert.equal(planKeys(couchPlan(['you', 'pilot'], null)).join(), 'bridge:0,bridge:1', 'an owner (no post): a free bridge post');
  const many = ['you', 'captain', 'pilot', 'slicer', 'engineer', 'xo', 'icehand', 'passenger', 'passenger', 'passenger', 'passenger', 'engineer', 'cook', 'medic'];
  const plan = planKeys(couchPlan(many, 'gunner'));
  assert.equal(plan.slice(7).join(), 'bunk,bunk,bunk,bunk,bunk,bunk,bunk', `past the rack, a bunk (${plan})`);
  assert.equal(planKeys(couchPlan(['you', 'captain', 'engineer', 'xo', 'icehand', 'cook', 'medic', 'passenger'], 'engineer')).slice(5).join(), 'bridge:1,bridge:3,bunk', 'the rack full, a free station before a bunk');
  for (const [roles, hand] of [[start, 'gunner'], [many, 'gunner'], [many, 'engineer'], [many, 'pilot'], [many.slice(1), null], [['you', 'gunner', 'gunner', 'pilot', 'pilot'], 'slicer']]) {
    const p = couchPlan(roles, hand), keys = planKeys(p).filter(k => k !== 'bunk');
    assert.equal(new Set(keys).size, keys.length, `${roles}: no two on one couch (${keys})`);
    assert.equal(p.length, roles.length, `${roles}: everyone placed`);
    const own = { slicer: 'bridge:0', pilot: 'bridge:1', captain: 'bridge:2' };
    for (const [role, key] of Object.entries(own)) { const i = roles.findIndex(r => (r === 'you' ? hand : r) === role); if (i >= 0) assert.equal(planKeys(p)[i], key, `${roles}: the first ${role} at their post`); }
    assert.ok(p.filter(q => q.at === 'bunk').length === Math.max(0, roles.length - 7), `${roles}: a bunk only past the seven couches`);
  }
});
test('past the couches, each straps into their own bunk, or one whose owner is on a couch, and no two into one, on a ship of any size (#990)', () => {
  const roles = n => ['you', 'captain', 'pilot', 'engineer', 'slicer', 'xo', 'icehand', 'passenger', 'passenger', 'passenger', 'passenger', 'cook', 'medic', 'engineer'].slice(0, n);
  for (const nb of [4, 5, 6, 10, 12]) for (let n = 1; n <= nb + 2; n++) {
    const plan = couchPlan(roles(n), 'gunner', nb), bunks = plan.filter(q => q.at === 'bunk').map(q => q.b), at = `${n} aboard, ${nb} berths`;
    assert.equal(new Set(bunks).size, bunks.length, `${at}: no two in one bunk (${bunks})`);
    plan.forEach((q, k) => { if (q.at === 'bunk') assert.ok(q.b >= 0 && q.b < nb && (q.b === k || k >= nb || plan[q.b].at !== 'bunk'), `${at}: the ${k}th in bunk ${q.b}, their own or a free one`); });
    plan.forEach((q, k) => { if (q.at === 'bunk' && k < nb) assert.equal(q.b, k, `${at}: the ${k}th in their own bunk`); });
    plan.forEach((q, k) => { if (q.at === 'bunk') { const c = couchPlace(q, k, nb); assert.equal(c.bunk, q.b, `${at}: walked to the bunk they strap into`); } });
  }
  assert.equal(couchPlan(roles(8), 'gunner', 6).filter(q => q.at === 'bunk').map(q => q.b).join(), '0', 'the gunship (6 berths) with eight aboard: the eighth in the hand\'s bunk, the first free');
});
test('each place is in its room: a station couch at its seat, a rack couch on its tier, a bunk in the berths (#990)', () => {
  const lay = LAYOUTS.freighter, W = lay.width, racks = couchPlaces();
  assert.equal(racks.length, 3, 'three rack couches, all in the berths'); assert.ok(racks.every(c => c.room === 'berths'));
  assert.ok(COUCH_RACKS.every(k => k.room === 'berths'), 'no rack on the bridge');
  const plan = couchPlan(['you', 'captain', 'pilot', 'engineer', 'slicer', 'xo', 'icehand', 'passenger', 'passenger', 'passenger', 'passenger', 'cook', 'medic', 'engineer'], 'gunner');
  plan.forEach((q, k) => {
    const c = couchPlace(q, k, 12), at = `${k} (${JSON.stringify(q)})`;
    if (q.at === 'station') {
      const r = roomAt(q.room), sx = (r.x0 + r.w * SEATS[q.room][q.seat]) * W;
      assert.equal([c.room, c.dk, c.station, c.lift].join(), ['bridge', r.deck, q.seat, 23].join(), at);
      assert.ok(Math.abs(c.x * W - (sx - 20)) < 1e-6, `${at}: the hip behind the seat, toward the headrest (${c.x * W}, the seat ${sx})`);
    } else if (q.at === 'rack') assert.equal([c.room, c.couchAt, c.lift, c.station, Math.round(c.x * W * 100)].join(), ['berths', q.k, racks[q.k].lift, null, Math.round(racks[q.k].x * 100)].join(), at);
    else assert.ok(c.room === 'berths' && c.couchAt === null && c.station === null && c.lift === 0 && c.bunk >= 0, at);
  });
});
test('a person on a couch lies on its pad, the head on its headrest: in a rack, or on a station\'s couch reclined (#990)', () => {
  const r = layoutBox(LAYOUTS.freighter, 'berths'), F = r.floor;
  for (const c of couchPlaces()) {
    const at = drawPerson(fakeCtx(), { name: 'couch', face: 1, frame: 0 }, c.x, F - c.lift, { color: '#ffb347' }), rack = COUCH_RACKS.find(k => c.x > k.x && c.x < k.x + 84);
    assert.ok(rack && at.head.x - 8 > rack.x + 3 && at.foot.x + 4 < rack.x + 81, `couch at ${c.x}: the person (${at.head.x} to ${at.foot.x}) between the rack's posts`);
    assert.ok(at.head.x > c.x - 41 && at.head.x < c.x - 26, `couch at ${c.x}: the head (${at.head.x}) over the headrest`);
    assert.ok(Math.abs(at.head.y - (F - c.lift - 8)) < 3, `couch at ${c.x}: lying on the pad (${at.head.y})`);
  }
  // a bridge station's couch at 400 reclined flat: the headrest's middle 50 behind the seat; the boots short of the console's top, which
  // overhangs from 17 in front of the seat (rooms.js roomBridge), and of its grab handle, from 21
  const at = drawPerson(fakeCtx(), { name: 'couch', face: 1, frame: 0 }, 400 - 20, 100 - 23, { color: '#ffb347' });
  assert.ok(Math.abs(at.head.x - (400 - 50)) < 4, `the head (${at.head.x}) on the headrest`);
  assert.ok(at.foot.x + 4 < 400 + 17, `the boots (${at.foot.x} and their toe) short of the console's overhang`);
});
test('someone on their way to the well walks; only on the ladder do they climb (#972)', () => {
  const p = o => ({ role: 'gunner', room: 'galley', x: 0.2, dk: 1, tdk: 3, tx: 0.3, seat: 0.3, couch: 0, ...o });
  assert.equal(posture(p(), 'move', 0, false).name, 'walk', 'along the deck to the well');
  assert.equal(posture(p({ x: LADDER, dk: 1.4 }), 'move', 0, false).name, 'climb', 'on the ladder');
});
test('someone on the ladder climbs at the couches too, not a walk on the spot (#972)', () => {
  const p = { role: 'gunner', room: 'medbay', x: LADDER, dk: 4.3, tdk: 2, tx: 0.2, seat: 0.2, couch: 0 };
  for (const ph of ['couch', 'move']) assert.equal(posture({ ...p }, ph, 0, false).name, 'climb', `${ph}: on the ladder`);
});
test('a camera outside a run shorter than the view eases to its middle, and only a new one snaps (#972)', () => {
  const y = camStep(300, 0, 0.1, 1000, 960);
  assert.ok(y > 300 && y < 480, `toward 480 and not the whole way: ${y}`);
  assert.equal(camStep(null, 0, 0.1, 1000, 960), 480);
});
test('a stop on a deck the well crosses is clear of its opening, by half a person (#972)', () => {
  const lay = LAYOUTS.freighter, W = lay.width, wx = lay.well.x * W, half = lay.well.w / 2 * W + 12, out = [];
  const check = (x, what) => { if (Math.abs(x * W - wx) < half - 1e-6) out.push(`${what}: ${(x * W).toFixed(1)}`); };
  const across = ROOMS.filter(r => r.x0 < lay.well.x && r.x1 > lay.well.x);
  assert.equal(across.map(r => r.id).sort().join(), 'berths,bridge,lifesupport');
  for (let k = 0; k <= 500; k++) {
    const u = k / 500, rnd = () => u;
    for (const r of across) { const p = { role: 'gunner', id: 'g', x: 0.1, dk: r.deck, tdk: r.deck, tx: null }; goTo(p, r.id, rnd, [p]); check(p.tx, `goTo ${r.id} at ${u}`); }
    const b = { role: 'gunner', id: 'g', x: 0.1, dk: 0, tdk: 0, tx: null, room: 'bridge' }; routineGo(b, 'night', [b], false, rnd); check(b.tx, `a bunk at ${u}`);
    const w = { role: 'pilot', id: 'w', room: 'bridge', x: 0.3, dk: 0, tdk: 0, tx: null }, h = { role: 'gunner', id: 'h', room: 'bridge', x: 0.4, dk: 0, tdk: 0, tx: null, relief: 'w', reliefT: 2 };
    handOver(h, [h, w], 0.1, 'handover', rnd); check(h.tx, `a bunk after the handover at ${u}`);
  }
  assert.deepEqual(out, []);
});
test('a climber is drawn inside the tube through the tank (#972)', () => {
  const lay = LAYOUTS.freighter, y = towerDeckY(lay, 5.5);
  assert.ok(y > deckFloor(lay, 5) && y < deckFloor(lay, 6), `${y} between the plant and the drive decks`);
  assert.equal(towerDeckY(lay, 2), deckFloor(lay, 2));
});
// #978: a person seen from the front or the back, not only in profile.
test('standing, sitting and at work draw from the front and the back in every style and mood, with a tap point on the body (#978)', () => {
  for (const view of ['front', 'back']) for (const name of ['stand', 'sit', 'work', 'work-sit']) for (let v = 0; v < 12; v++) for (const mood of [undefined, 'good', 'low', 'hurt']) {
    const c = fakeCtx(), at = drawPerson(c, { name, view, x: 0.5, deck: 0, face: 1, frame: 1 }, 400, 100, { color: '#ffb347', skin: '#c08a68', hair: '#2a1d18', cut: v % 3, v: v * 37, mood });
    assert.equal(c.depth, 0, `${view} ${name}: every save is restored`);
    assert.ok(Math.abs(at.x - 400) < 1 && at.y < 100 && at.y > 40, `${view} ${name}: the tap point on the body's middle`);
    assert.ok(at.head.y < at.y && at.foot.y >= at.y, `${view} ${name}: the head above it, the feet below`);
  }
});
test('the view: facing you to stand and sit, your back to the panel at work, side-on on the move and in the burn (#978)', () => {
  const seat = roomAt('galley').x0 + roomAt('galley').w * SEATS.galley[0];
  const p = o => ({ role: 'gunner', room: 'galley', x: seat, dk: 0, tdk: 0, tx: null, seat, couch: 1, ...o });
  assert.equal(posture(p({ x: seat + 0.01 }), 'move', 0, false).view, 'front', 'standing about');
  assert.equal(posture(p({ at: 'table' }), 'move', 0, false).view, 'front', 'at the table');
  assert.equal(posture(p({ block: 'shift', at: 'post', room: 'engine', x: 0.05, seat: 0.3 }), 'move', 0, false).view, 'back', 'at a panel');
  assert.equal(posture(p({ tx: 0.6 }), 'move', 0, false).view, 'side', 'walking');
  for (const ph of ['couch', 'secure', 'float']) assert.equal(posture(p(), ph, 0, false).view, 'side', `${ph}: side-on`);
});
test('a sleeper lies with the head to the left whichever way they last faced', () => {
  for (const face of [1, -1]) {
    const at = drawPerson(fakeCtx(), { name: 'bunk', x: 0.5, deck: 0, face, frame: 0 }, 400, 100, { color: '#ffb347' });
    assert.ok(at.x < 400, `face ${face}: the body (and so the head) is left of the hip`);
  }
});
test('a person facing left is drawn mirrored', () => {
  const at = f => drawPerson(fakeCtx(), { name: 'tether', x: 0.5, deck: 0, face: f, frame: 0 }, 400, 100, { color: '#ffb347' });
  assert.ok(at(1).x > 400 && at(-1).x < 400, 'the tap point follows the way they face');
});
test('the phase weights: all burn at the ends, all cruise between, all flip at the middle, and they always sum to one', () => {
  assert.deepEqual(phaseWeights(0.02), { burn: 1, cruise: 0, flip: 0 });
  assert.deepEqual(phaseWeights(0.25), { burn: 0, cruise: 1, flip: 0 });
  assert.deepEqual(phaseWeights(0.5), { burn: 0, cruise: 0, flip: 1 });
  assert.deepEqual(phaseWeights(0.98), { burn: 1, cruise: 0, flip: 0 });
  for (let p = 0; p <= 1; p += 0.001) { const w = phaseWeights(p); assert.ok(Math.abs(w.burn + w.cruise + w.flip - 1) < 1e-9 && Math.min(w.burn, w.cruise, w.flip) >= 0); }
});
test('the g reading: three times the thrust in the hard burn, the thrust in cruise, nothing at the flip, and no jumps', () => {
  assert.equal(gReading(0.02, 0.9), 2.7); assert.equal(gReading(0.3, 0.9), 0.9); assert.equal(gReading(0.5, 0.9), 0); assert.equal(gReading(0.99, 0.9), 2.7);
  assert.equal(phaseWeights(0.06).burn, 0, 'the burn has ramped down by the time the couches empty'); assert.equal(phaseWeights(0.94).burn, 0);
  for (let p = 0; p < 1; p += 0.001) assert.ok(Math.abs(gReading(p + 0.001, 0.9) - gReading(p, 0.9)) < 0.1, `a jump at ${p.toFixed(3)}`);
});
test('the phases of a run, with the crew securing either side of the flip', () => {
  const at = pr => { G.transit = { total: 100, left: 100 * (1 - pr), days: 0.05 }; return phase(); };  // a burn so short its stages are held to the old shares (burnspeed.js, #992)
  assert.deepEqual([0.03, 0.2, 0.45, 0.5, 0.55, 0.8, 0.97].map(at), ['couch', 'move', 'secure', 'float', 'secure', 'move', 'couch']);
});

test('a patient in the medbay bed stays on the cot in every phase, strapped down at the straps and the float (#976)', () => {
  const bed = { role: 'gunner', room: 'medbay', at: 'bed', x: 0.7, dk: 4, tdk: 4, tx: null, seat: 0.3, couch: 0 };
  for (const ph of ['move', 'couch', 'secure', 'float']) assert.equal(posture({ ...bed }, ph, 0, false).name, 'bunk', `${ph}: on the cot`);
  assert.ok(posture({ ...bed }, 'float', 0, false).strapped, 'strapped down at the float'); assert.ok(!posture({ ...bed }, 'move', 0, false).strapped);
  assert.equal(posture({ ...bed, tx: 0.55 }, 'couch', 0, false).name !== 'bunk', true, 'not lying down while still on the way to it');
});
test('seated on a chair, a person is side-on and faces the way the chair does; on the galley bench they face you (#985)', () => {
  const at = (room, k, o = {}) => { const r = roomAt(room), x = r.x0 + r.w * SEATS[room][k]; return { role: 'gunner', room, x, dk: r.deck, tdk: r.deck, tx: null, seat: x, couch: 0, face: -9, ...o }; };
  const pose = (p, staged) => { const q = posture({ ...p, ...(staged ? { staged } : {}) }, 'move', 0, false); return [q.name, q.view, q.face]; };
  assert.deepEqual(pose(at('bridge', 0, { role: 'captain' }), 'bridge'), ['sit', 'side', 1], 'the bridge chairs face forward, the back behind');
  assert.deepEqual(pose(at('bridge', 1, { role: 'pilot', block: 'shift', at: 'post' })), ['work-sit', 'side', 1], 'at the helm, side-on');
  assert.deepEqual(pose(at('gunnery', 0, { block: 'shift', at: 'post' })), ['work-sit', 'side', -1], 'the guns face the other way');
  assert.deepEqual(pose(at('medbay', 0, { role: 'captain' }), 'medbay'), ['sit', 'side', -1], 'the medbay stool faces the cot');
  assert.deepEqual(pose(at('galley', 2), 'galley').slice(0, 2), ['sit', 'front'], 'at the mess table, facing you');
});

test('a posture for everyone in every phase, from the list the sprites are drawn to', () => {
  const seat = roomAt('galley').x0 + roomAt('galley').w * SEATS.galley[0];  // on one of the galley's seats (#925)
  const p = (o) => ({ role: 'gunner', room: 'galley', x: seat, dk: 1, tdk: 1, tx: null, seat, couch: 1, ...o });
  assert.equal(posture(p(), 'couch', 0, false).name, 'couch');
  assert.equal(posture(p({ couch: 0 }), 'couch', 0, false).name, 'stand', 'not on the couch until it has unfolded');
  assert.equal(posture(p({ x: seat + 0.03, couch: 0 }), 'couch', 0, false).name, 'walk', 'and on the way to it');
  assert.equal(posture(p({ x: seat + 0.01 }), 'move', 0, false).name, 'stand', 'off a seat');
  assert.equal(posture(p(), 'secure', 0, false).name, 'strap');
  assert.equal(posture(p(), 'float', 0, false).name, 'strap');
  assert.equal(posture(p({ role: 'engineer' }), 'float', 0, false).name, 'tether');
  assert.equal(posture(p({ role: 'engineer' }), 'secure', 0, false).name, 'strap');
  assert.equal(posture(p({ tx: 0.6 }), 'move', 0, false).name, 'walk');
  assert.equal(posture(p({ x: LADDER, dk: 1.5, tdk: 2 }), 'move', 0, false).name, 'climb');
  assert.equal(posture(p(), 'move', 0, false).name, 'sit');
  assert.equal(posture(p({ room: 'hold' }), 'move', 0, false).name, 'stand');
  assert.equal(posture(p({ room: 'berths' }), 'move', 0, true).name, 'bunk');
  assert.deepEqual(['float', 'couch', 'move'].map(ph => posture(p({ role: 'cat' }), ph, 0, false).name), ['cat-float', 'cat-sleep', 'cat-sit']);
  assert.equal(posture(p({ role: 'cat', tx: 0.3 }), 'move', 0, false).name, 'cat-walk');
  for (const ph of ['couch', 'secure', 'float', 'move']) { const q = posture(p(), ph, 7.3, false); assert.ok(POSTURES[q.name] && q.frame >= 0 && q.frame < POSTURES[q.name].frames); }
  assert.equal(posture(p({ face: -1 }), 'move', 0, false).face, -1);
});
test('the camera snaps first, then eases, and stays inside the tower', () => {
  const lay = LAYOUTS.freighter, len = towerHeight(lay) + 90;
  assert.equal(camStep(null, 0, 0, 360, len), 180);
  assert.equal(camStep(null, 600, 0, 360, len), 600);
  const y = camStep(600, 800, 0.1, 360, len); assert.ok(y > 600 && y < 800);
  assert.equal(camStep(null, 5000, 0, 360, len), len - 180, 'a target past the bottom is held at the bottom');
  assert.equal(camStep(600, 5000, 1, 360, len), len - 180);
  // a camera left outside the tower (a dialog closed, and the view is the whole box again) eases back in, not in one jump
  const back = camStep(len, 5000, 0.1, 360, len); assert.ok(back < len && back > len - 180, `eased to ${back}`);
});
test('the camera reaches down past the drive\'s bell to the first of the plume (#972)', () => {
  const lay = LAYOUTS.freighter, run = camRun(lay), span = viewOf({ x: 0, y: 0, w: 1360, h: 480 }, lay).span, mouth = towerOutline(lay).bottom + TOWER_BELL.h;
  const camY = camStep(null, 1e6, 0, span, run.len) + run.top;
  assert.ok(camY + span / 2 >= mouth + 150, `the view ends at ${camY + span / 2}, the plume starts at ${mouth}`);
  assert.equal(camStep(null, -1e6, 0, span, run.len) + run.top - span / 2, -45, 'the top of the run is still the nose\'s cap');
  // the hand walking onto the drive deck takes the camera down to the bell and the plume, past the dead zone that holds it on other decks
  let cam = camStep(null, camTarget(lay, 5), 0, span, run.len);
  for (let i = 0; i < 200; i++) cam = camStep(cam, camTarget(lay, 6), 0.1, span, run.len);
  assert.ok(cam + run.top + span / 2 >= mouth + 150 - 0.01, `followed to ${cam + run.top + span / 2}`);
  assert.equal(camTarget(lay, 2), towerDeckY(lay, 2) - 50 + 45, 'on any other deck, the middle of it');
});
test('the zoom fits about three decks and the tower across, right of the outline (#972)', () => {
  const lay = LAYOUTS.freighter;
  assert.equal(viewOf({ x: 0, y: 0, w: 1360, h: 480 }, lay).zoom, 480 / 360, 'with no strip left of it, the height fit');
  assert.equal(viewOf({ x: 0, y: 0, w: 760, h: 480 }, lay).zoom, 760 / 800, 'and the width fit (the tower 720 across and 40 each side)');
  // the outline's strip (8 in from the box's edge, its width, and an 8 gap) is left out of the width the tower fits across
  const left = box => outlineLayout(box, lay).w + 16, wide = { x: 0, y: 0, w: 1100, h: 480 }, narrow = { x: 0, y: 0, w: 760, h: 480 };
  assert.equal(viewOf(wide, lay, left(wide)).zoom, (1100 - left(wide)) / 800, 'a wide box: now the width fit less the strip');
  assert.equal(viewOf(narrow, lay, left(narrow)).zoom, (760 - left(narrow)) / 800);
  assert.equal(viewOf({ x: 0, y: 0, w: 1800, h: 480 }, lay, left(wide)).zoom, 480 / 360, 'a box wide enough keeps the height fit');
  const v = viewOf(narrow, lay, left(narrow)); assert.ok(Math.abs(v.span - 480 / v.zoom) < 1e-9);
});
test('the outline is the tower: every room, and a tap finds it (#972)', () => {
  const lay = LAYOUTS.freighter, o = outlineLayout({ x: 0, y: 0, w: 1360, h: 480 }, lay);
  assert.equal(o.rooms.length, ROOMS.length);
  for (const r of o.rooms) assert.equal(outlineRoomAt(o, r.x + r.w / 2, r.y + r.h / 2), r.id, `${r.id} at its centre`);
  assert.equal(o.h, 120, 'a strip 120 tall'); assert.ok(Math.abs(o.w - 120 * (lay.width + 120) / (towerHeight(lay) + 150)) < 1e-9, 'as wide as the tower is to its height');
  assert.equal(outlineRoomAt(o, o.x - 4, o.y - 4), null, 'nothing outside it');
  const tank = (o.rooms.find(r => r.id === 'lifesupport').y + o.rooms.find(r => r.id === 'lifesupport').h + o.rooms.find(r => r.id === 'engine').y) / 2;
  assert.equal(outlineRoomAt(o, o.x + o.w * 0.25, tank), null, 'nor in the tank');
  for (const r of ROOMS) {  // each room at its layoutBox, scaled: the galley left of the head on the mess deck, the decks in order down the strip
    const b = o.rooms.find(q => q.id === r.id), q = layoutBox(lay, r.id);
    assert.ok(Math.abs(b.w / b.h - (q.x1 - q.x0) / (q.floor - q.top)) < 1e-9, `${r.id} keeps its shape`);
  }
  assert.ok(o.rooms.find(r => r.id === 'bridge').y < o.rooms.find(r => r.id === 'galley').y && o.rooms.find(r => r.id === 'galley').x < o.rooms.find(r => r.id === 'head').x);
  assert.equal(outlineLayout({ x: 0, y: 0, w: 760, h: 110 }, lay).h, 94, 'a short box: its height less 16');
});
test('the outline draws balanced, with no text, and a dot on the ladder between the decks (#972)', () => {
  const lay = LAYOUTS.freighter, o = outlineLayout({ x: 0, y: 0, w: 1360, h: 480 }, lay);
  for (const [dots, camY] of [[[{ x: 360, dk: 0, color: '#ffb347' }], 200], [[{ x: 360, dk: 5.5, color: '#ffb347' }, { x: 100, dk: 6, color: '#9fe' }], 1000]]) {
    const c = fakeCtx(); drawOutline(c, o, dots, camY, 360, lay); assert.equal(c.depth, 0); assert.ok(c.calls.length > 0); assert.ok(!c.calls.includes('fillText'));
  }
  const at = outlineAt(o, 360, towerDeckY(lay, 5.5));
  assert.ok(at.y > o.rooms.find(r => r.id === 'lifesupport').y + o.rooms.find(r => r.id === 'lifesupport').h && at.y < o.rooms.find(r => r.id === 'engine').y, 'a climber in the tube is in the tank\'s band');
  assert.ok(Math.abs(at.x - (o.x + o.w / 2)) < 1e-9, 'the well down the middle');
});

const RS = (o) => ({ w: phaseWeights(0.3), time: 3, zoom: 1.45, spin: 0, still: false, berths: 6, cargo: 0.5, fuel: 0.5, burning: true, night: 0, asleep: 0, ...o });
const RR = { x0: 300, x1: 700, top: 0, floor: 100 };
test('every room of the tower draws in every phase, with every save restored', () => {
  for (const id of ROOMS.map(r => r.id)) for (const pr of [0.02, 0.3, 0.45, 0.5]) for (const zoom of [0.8, 1.45]) {
    const c = fakeCtx(); drawRoom(c, id, layoutBox(LAYOUTS.freighter, id), RS({ w: phaseWeights(pr), zoom }));
    assert.ok(c.calls.length > 10, `${id} drew`); assert.equal(c.depth, 0, `${id}: every save is restored`);
    for (const f of c.fonts) assert.ok(Number(/(\d+(?:\.\d+)?)px/.exec(f)[1]) >= 12, `${id}: ${f}`);
  }
  assert.equal(worldText(fakeCtx(), 1, 'MUGS', 0, 0, 9, '#fff'), false); assert.equal(worldText(fakeCtx(), 1.5, 'MUGS', 0, 0, 9, '#fff'), true);
});
test('the rooms show the ship as it is: bunks by berths, crates by cargo', () => {
  const rects = (id, o) => { const c = fakeCtx(); drawRoom(c, id, RR, RS(o)); return c.calls.filter(k => k === 'fillRect').length; };
  assert.ok(rects('berths', { berths: 12 }) > rects('berths', { berths: 2 }));
  assert.ok(rects('hold', { cargo: 1 }) > rects('hold', { cargo: 0 }));
});
test('with reduced motion things hang straight down', () => {
  assert.deepEqual(Array.from(hangEnd(10, 0, 20, 1, phaseWeights(0.3), 4.2, true)), [10, 20]);
  const [x] = hangEnd(10, 0, 20, 1, phaseWeights(0.3), 4.2, false); assert.notEqual(x, 10);
});
test('the hold\'s lamp floats at the flip on its slack cable but stays under its anchor, inside the room, the cable never longer than it is (#1042)', () => {
  const ax = 100, ay = 6;
  for (const f of [0.25, 0.5, 0.75, 1]) for (let t = 0; t < 60; t += 0.37) {
    const w = { burn: 0, cruise: 1 - f, flip: f }, [x, y] = holdLampEnd(ax, ay, w, t, false);
    assert.ok(y >= ay + 3 - 1e-9, `flip ${f} t ${t.toFixed(2)}: under the anchor (${y})`);
    assert.ok(Math.hypot(x - ax, y - ay) <= HOLD_LAMP_CABLE + 1e-9, `flip ${f} t ${t.toFixed(2)}: within the cable`);
  }
  assert.deepEqual(Array.from(holdLampEnd(ax, ay, { burn: 0, cruise: 0, flip: 1 }, 3, true)), [ax, ay + HOLD_LAMP_CABLE], 'still: straight down');
  const [, yc] = holdLampEnd(ax, ay, { burn: 0, cruise: 1, flip: 0 }, 3, false), [, yh] = hangEnd(ax, ay, HOLD_LAMP_CABLE, 0.7, { burn: 0, cruise: 1, flip: 0 }, 3, false);
  assert.equal(yc, yh, 'in cruise it swings as before');
});
test('drawn in the hold at the flip, the lamp hangs under the ceiling\'s sliver at every moment (#1042)', () => {
  const sliver = 4, lamps = time => { const c = fakeCtx(); drawRoom(c, 'hold', RR, RS({ w: phaseWeights(0.5), time })); return c.args.filter(a => a.startsWith('translate')).map(a => a.slice(9).split(',').map(Number)).filter(([x]) => x > 640 && x < 690); };
  for (let t = 0; t < 30; t += 0.25) {
    const l = lamps(t); assert.equal(l.length, 1, `one lamp at t=${t}`);
    assert.ok(l[0][1] - 0.5 >= RR.top + sliver, `its cap under the sliver at t=${t}: ${l[0][1]}`);
  }
});
test('the phase light and the thrust sign', () => {
  for (const pr of [0.02, 0.3, 0.5]) for (const night of [0, 1]) { const c = fakeCtx(); drawPhaseLight(c, RR, phaseWeights(pr), 3, night, false); assert.equal(c.depth, 0); assert.ok(c.calls.length > 0); }
  const say = (pr, time, zoom = 1.5) => { const c = fakeCtx(), t = []; c.fillText = s => t.push(s); drawThrustSign(c, 0, 0, 2.7, phaseWeights(pr), time, zoom); return t.join(' '); };
  assert.match(say(0.02, 1), /THRUST 2\.70 G/); assert.match(say(0.3, 1), /CRUISE/);
  assert.match(say(0.5, 1), /FLIP SECURE/); assert.match(say(0.5, 3), /FLIP 2\.70 G/);
  assert.equal(say(0.02, 1, 0.5), '');
});
test('with reduced motion the flip holds still: a room drawn at two times is the same', () => {
  const moving = [];
  for (const id of ROOMS.map(r => r.id)) {
    const at = (time, still) => { const c = fakeCtx(); drawRoom(c, id, RR, RS({ w: phaseWeights(0.5), time, still })); return c.args.join('|'); };
    assert.equal(at(1.3, true), at(4.9, true), id);
    if (at(1.3, false) !== at(4.9, false)) moving.push(id);
  }
  assert.ok(moving.length > 0, 'without reduced motion the flip does move');
});
test('a mug sits in its holder: steaming and free in cruise, clipped in at the flip', () => {
  const draw = pr => { const c = fakeCtx(); roomMessTable(c, RR, RS({ w: phaseWeights(pr) })); return c; };  // the mug is on the mess table, drawn over the people (#978)
  assert.ok(draw(0.3).calls.filter(k => k === 'quadraticCurveTo').length > draw(0.5).calls.filter(k => k === 'quadraticCurveTo').length, 'steam in cruise only');
});

test('ship life rolls its own dice, the same for the same burn', () => {
  const st = { day: 12 }, a = { to: 'mars', days: 3 }, b = { to: 'mars', days: 3 }, c = { to: 'mars', days: 3 };
  const five = t => Array.from({ length: 5 }, () => shipRand(t, st));
  const fa = five(a);
  assert.ok(fa.every(v => v >= 0 && v < 1), 'in [0, 1)');
  assert.deepEqual(five(b), fa, 'the same burn rolls the same');
  assert.notEqual(shipRand(c, { day: 13 }), fa[0], 'another day rolls otherwise');
});

test('the ship\'s day runs to a timetable, and each person has a place in it', () => {
  const at = f => ((f * SHIP_DAY - 6 + 0.01) + SHIP_DAY) % SHIP_DAY;  // the elapsed burn time at a share of the day (just after it)
  assert.deepEqual([0, 0.079, 0.08, 0.3, 0.38, 0.48, 0.55, 0.65, 0.9].map(f => shipDay(at(f)).block),
    ['breakfast', 'breakfast', 'shift', 'meal', 'shift', 'supper', 'handover', 'night', 'wake']);
  assert.ok(Math.abs(shipDay(at(0.3)).f - 0.3) < 0.001, 'and how far into the day');
  const spot = (role, block) => JSON.parse(JSON.stringify(routineSpot({ role }, block)));
  assert.deepEqual(spot('engineer', 'shift'), { room: 'engine', at: 'post' });
  assert.deepEqual(spot('pilot', 'night'), { room: 'berths', at: 'bunk' }, 'with no watch bill (the ship\'s state) nobody keeps a watch: the bill is tested in watchbill.test.js (#1034)');
  assert.deepEqual(spot('cook', 'meal'), { room: 'galley', at: 'stove' });
  assert.deepEqual(spot('captain', 'shift'), { room: 'bridge', at: 'post' });
  assert.deepEqual(spot('captain', 'handover'), { room: 'berths', at: 'bunk' });
  assert.deepEqual(spot('captain', 'supper'), { room: 'bridge', at: 'post' }, 'the captain keeps the bridge through supper, for the watch to take it');
  assert.deepEqual(spot('you', 'shift'), { rounds: true });
  assert.deepEqual(spot('you', 'breakfast'), { room: 'galley', at: 'table' });
  assert.deepEqual(spot('passenger', 'shift'), { rounds: true });
  assert.deepEqual(spot('passenger', 'supper'), { room: 'galley', at: 'table' });
  assert.deepEqual(spot('quartermaster', 'night'), { room: 'berths', at: 'bunk' });
  assert.deepEqual(spot('cat', 'breakfast'), { rounds: true });
});

test('the working poses stand on the deck, and the routine takes its dice as a parameter', () => {
  assert.ok(FIG_GROUNDED.includes('work') && FIG_GROUNDED.includes('work-sit'), 'a shadow under someone at work');
  const p = { role: 'engineer', block: 'shift', at: 'post', room: 'engine', x: 0.1, dk: 6, tdk: 6, tx: null, wait: 0 };
  routineWait(p, 'shift', false, () => 0);  // no burn, no G: the dice are given
  assert.equal(p.errand, true, 'an errand when the dice say so'); assert.ok(p.wait >= 5, 'and a wait set from them');
});

test('the rooms are the tower\'s: seven decks, the well in the middle, the seats from the layout (#972)', () => {
  assert.deepEqual(ROOMS.map(r => r.id), layoutRooms(LAYOUTS.freighter).map(r => r.id));
  assert.equal(roomAt('berths').deck, 2); assert.equal(roomAt('engine').deck, 6);
  assert.equal(LADDER, 0.5);
  assert.deepEqual([...SEATS.bridge], [0.12, 0.3, 0.7, 0.88]);
  assert.ok(ROOMS.every(r => !('tall' in r)), 'no room is the stern\'s full height');
});
test('the climb through the tank takes as long as its height (#972)', () => {
  const lay = LAYOUTS.freighter;
  assert.ok(Math.abs(climbRate(lay, 5.2, 1) * 372 / 112 - climbRate(lay, 1.5, 1)) < 1e-9);
  assert.ok(Math.abs(climbRate(lay, 5.8, -1) - climbRate(lay, 5.2, 1)) < 1e-9, 'up the tube as slow as down it');
});
test('an errand finds two rooms on a deck with one (#972)', () => {
  HAUNTS.plantsman = { lifesupport: 1 };  // nobody's post is the plant deck yet (step 3, #973): a role for the test
  try {
    const post = roomAt('lifesupport'), far = r => Math.abs(r.deck - post.deck) + Math.abs(r.mid - post.mid);
    const two = ROOMS.filter(r => r.id !== 'lifesupport').map(far).sort((a, b) => a - b)[1];
    const p = { role: 'plantsman', block: 'shift', at: 'post', room: 'lifesupport', x: 0.5, dk: 5, tdk: 5, tx: null, wait: 0 };
    routineWait(p, 'shift', false, () => 0);
    assert.equal(p.errand, true, 'an errand');
    assert.notEqual(p.room, 'lifesupport');
    assert.ok(far(roomAt(p.room)) <= two + 1e-9, `${p.room} is one of the two nearest`);
  } finally { delete HAUNTS.plantsman; }
});

test('an errand that takes the ladder comes half as often as one on the post\'s own deck (#972)', () => {
  const seq = vals => { let i = 0; return () => vals[i++ % vals.length]; };  // the dice: the errand's chance, then which of the two rooms, then the wait
  const at = (role, room, dice) => { const r = roomAt(room), p = { role, block: 'shift', at: 'post', room, x: r.mid, dk: r.deck, tdk: r.deck, tx: null, wait: 0 }; routineWait(p, 'shift', false, seq(dice)); return p.errand ? p.room : null; };
  // the quartermaster's two nearest rooms: the engine room on the drive deck, life support up the ladder (the engineer has rounds of their own, #973)
  assert.equal(at('quartermaster', 'hold', [0.2, 0, 0.5]), 'engine', 'on the post\'s deck at a quarter');
  assert.equal(at('quartermaster', 'hold', [0.2, 0.9, 0.5]), null, 'up the ladder, not at a quarter');
  assert.equal(at('quartermaster', 'hold', [0.1, 0.9, 0.5]), 'lifesupport', 'up the ladder at an eighth');
  assert.equal(at('pilot', 'bridge', [0.2, 0, 0.5]), null, 'the bridge\'s nearest rooms are down the ladder: not at a quarter');
  assert.ok(['galley', 'head'].includes(at('pilot', 'bridge', [0.1, 0, 0.5])), 'at an eighth');
  const n = 400, rate = room => { let k = 0; for (let i = 0; i < n; i++) for (const pick of [0.25, 0.75]) if (at('quartermaster', 'hold', [(i + 0.5) / n, pick, 0.5]) === room) k++; return k / n; };
  assert.ok(Math.abs(rate('lifesupport') - rate('engine') / 2) < 1e-9, `the ladder's errand half as often (${rate('lifesupport')} against ${rate('engine')})`);
});
test('the ship\'s damage marks one to three rooms, kept through the burn, cleared last-first, never the medbay', () => {
  const rnd = (n => () => (n = (n * 16807) % 2147483647) / 2147483647)(7), t = {};
  const m = d => JSON.parse(JSON.stringify(marksFor(t, d, rnd)));
  assert.equal(m(0).length, 0);
  const one = m(0.2); assert.equal(one.length, 1);
  assert.deepEqual(m(0.2), one, 'kept');
  const two = m(0.5); assert.equal(two.length, 2); assert.equal(two[0], one[0], 'added to');
  const three = m(0.9); assert.equal(three.length, 3); assert.equal(new Set(three).size, 3, 'three rooms');
  assert.deepEqual(m(0.5), three.slice(0, 2), 'the last added cleared first');
  assert.ok(!three.includes('medbay'));
  assert.deepEqual(m(0), []);
  assert.equal(m(1 / 3).length, 1, 'a third is still one'); assert.equal(m(2 / 3).length, 2, 'two thirds is still two');
});

test('the ship\'s state gives the hurt a bed, first aid its patients, the hands the damage, and someone low a bunk alone at meals', () => {
  const state = (o = {}) => ({ marks: [], severe: false, hurt: [], low: [], you: false, aid: null, repairs: {}, ...o });
  const spot = (p, block, st) => JSON.parse(JSON.stringify(routineSpot(p, block, st)));
  const eng = { role: 'engineer', id: 'e' }, medic = { role: 'xo', id: 'm' }, gun = { role: 'gunner', id: 'g' }, cook = { role: 'cook', id: 'c' }, you = { role: 'you', id: 'you' };
  assert.deepEqual(spot(eng, 'shift', state({ hurt: ['e'] })), { room: 'medbay', at: 'bed' }, 'the hurt in bed');
  assert.deepEqual(spot(eng, 'meal', state({ hurt: ['e'] })), { room: 'medbay', at: 'bed' }, 'and at meals');
  assert.deepEqual(spot(medic, 'shift', state({ hurt: ['e'], aid: 'm' })), { room: 'medbay', at: 'aid' }, 'first aid by the patient');
  assert.deepEqual(spot(medic, 'shift', state({ aid: 'm' })), { room: 'bridge', at: 'post' }, 'with nobody hurt, the post');
  assert.deepEqual(spot(eng, 'shift', state({ marks: ['hold'], repairs: { e: 'hold' } })), { room: 'hold', at: 'repair' }, 'at the damage');
  assert.deepEqual(spot(eng, 'night', state({ marks: ['hold'], repairs: { e: 'hold' }, bill: { bridge: null, engine: 'e' } })), { room: 'engine', at: 'post' }, 'the watch keeps the drive at night (the bill names them, #1034)');
  assert.deepEqual(spot(gun, 'meal', state({ low: ['g'] })), { room: 'berths', at: 'alone' }, 'someone low eats alone');
  assert.deepEqual(spot(gun, 'handover', state({ low: ['g'] })), { room: 'berths', at: 'alone' }, 'and sits apart in the evening');
  assert.deepEqual(spot(cook, 'meal', state({ low: ['c'] })), { room: 'galley', at: 'stove' }, 'the cook still cooks');
  assert.deepEqual(spot(you, 'night', state({ you: true })), { room: 'medbay', at: 'bed' }, 'you, hurt, sleep in the medbay');
  assert.deepEqual(spot(you, 'shift', state({ you: true })), { rounds: true }, 'and go the rounds by day');
  assert.deepEqual(spot(eng, 'shift'), { room: 'engine', at: 'post' }, 'with no state, as before');
});

test('a marked room shows its damage the same at the same moment, and the medbay shows a patient', () => {
  const draw = (id, o) => { const c = fakeCtx(); drawRoom(c, id, RR, RS(o)); return c; };
  const plain = draw('hold', {}), marked = draw('hold', { damage: { marks: new Set(['hold']), severe: false } }), other = draw('hold', { damage: { marks: new Set(['galley']), severe: false } });
  assert.ok(marked.calls.length > plain.calls.length, 'the panel, the scorch and the cable drawn');
  assert.equal(other.calls.length, plain.calls.length, 'a room not marked is as before');
  assert.equal(draw('hold', { damage: { marks: new Set(['hold']), severe: true } }).args.join('|'), draw('hold', { damage: { marks: new Set(['hold']), severe: true } }).args.join('|'), 'no dice: the same frame twice');
  const wide = { x0: 0, x1: 400, top: 0, floor: 100 }, med = o => { const c = fakeCtx(); drawRoom(c, 'medbay', wide, RS(o)); return c.styles; };
  assert.ok(med({ patient: true }).includes('#ffb030'), 'an amber trace with a patient'); assert.ok(!med({}).includes('#ffb030'), 'and not without');
});

test('the ship\'s state reads only what it is given', () => {
  const st = { day: 10, armor: 50, crew: ['a', 'b', 'c'], injured: { a: true }, people: { a: { id: 'a', role: 'pilot' }, b: { id: 'b', role: 'gunner', mood: { kind: 'low', until: 12 } }, c: { id: 'c', role: 'engineer', mood: { kind: 'low', until: 9 } } } };
  const s = JSON.parse(JSON.stringify(shipState(st, {}, 100, () => 0.5, { aid: 'c', you: true })));
  assert.deepEqual([s.marks.length, s.severe, s.hurt, s.low, s.aid, s.you], [2, false, ['a'], ['b'], 'c', true]);
});

// #927: strapped in at the flip, a person sits in a jump seat; the float lifts their arms as it builds, from nothing, with no jump.
test('the float lifts the arms and the legs as it builds, from strapped in to drifting, with no jump (#927)', () => {
  const at = f => figPose('strap', 0, POSTURES.strap.frames, f);
  const a0 = at(0), a5 = at(0.5), a1 = at(1);
  assert.equal(a0.hip, 18, 'strapped into a seat at sitting height');
  assert.ok(a5.arms[0] > a0.arms[0] + 0.3 && a1.arms[0] > a5.arms[0] + 0.3, `the front arm rises with the float: ${a0.arms[0]}, ${a5.arms[0]}, ${a1.arms[0]}`);
  assert.ok(Math.abs(at(0.02).arms[0] - a0.arms[0]) < 0.08, 'a little float lifts it a little');
  assert.ok(a1.legs[0] < a0.legs[0], 'the legs come up off the deck');
});

// #924: the camera holds while the hand moves about the middle third of the view, and the walk's legs follow the ground covered.
test('the camera holds still while the hand moves within the middle of the view, and follows once they leave it (#924)', () => {
  assert.equal(camStep(800, 850, 0.1, 600, 1600), 800, 'inside the middle third: no slide');
  assert.equal(camStep(800, 700, 0.1, 600, 1600), 800);
  const out = camStep(800, 1000, 0.1, 600, 1600); assert.ok(out > 800 && out < 900, `past it: eases toward keeping them at its edge (${out})`);
});
test('the walk\'s legs follow the ground covered, not the clock (#924)', () => {
  const p = o => ({ role: 'gunner', room: 'galley', x: 0.5, dk: 0, tdk: 0, tx: 0.6, ...o });
  assert.equal(posture(p({ walked: 0.01 }), 'move', 0, false).frame, posture(p({ walked: 0.01 }), 'move', 3.7, false).frame, 'the same ground, the same stride, whatever the time');
  assert.notEqual(posture(p({ walked: 0 }), 'move', 0, false).frame, posture(p({ walked: 0.02 }), 'move', 0, false).frame, 'more ground, the stride moves on');
});

// #933: a prop is drawn with a lit top edge, a shaded underside and an outline, so it stands off the wall; the walls stay flat. The bridge and
// the guns are stations: screens, controls and chairs with backs.
const recorder = () => { const calls = []; const ctx = new Proxy({}, { get: (t, k) => (k in t ? t[k] : String(k).startsWith('create') ? () => ({ addColorStop() {} }) : String(k) === 'measureText' ? () => ({ width: 10 }) : (...a) => calls.push([k, ...a])), set: (t, k, v) => { t[k] = v; if (k === 'fillStyle' || k === 'strokeStyle') calls.push([k, v]); return true; } }); return { ctx, calls }; };
const FW = (lay => ({ x0: (lay.well.x - lay.well.w / 2) * lay.width, x1: (lay.well.x + lay.well.w / 2) * lay.width }))(LAYOUTS.freighter);  // the well (#1024)
const FIG_LINE_WALL = 'rgba(10,13,18,0.85)';
test('a prop has a lit top edge, a shaded underside and an outline; the room\'s walls stay flat (#933)', () => {
  const a = recorder(); roomBox(a.ctx, 10, 10, 40, 30, '#2c4c6e');
  assert.ok(a.calls.filter(c => c[0] === 'fillRect').length >= 3, 'the body, the top edge and the underside');
  assert.ok(a.calls.some(c => c[0] === 'strokeRect'), 'and an outline');
  const small = recorder(); roomBox(small.ctx, 0, 0, 3, 3, '#2c4c6e');
  assert.equal(small.calls.filter(c => c[0] === 'fillRect').length, 1, 'a small detail is a plain fill'); assert.ok(!small.calls.some(c => c[0] === 'strokeRect'));
  for (const well of [undefined, FW]) {  // one bay, and a full-width room's two either side of the well (#1024)
    const w = recorder(); roomWalls(w.ctx, { x0: 0, x1: 720, top: 0, floor: 100 }, { burn: 0, cruise: 1, flip: 0 }, 0, true, well);
    assert.ok(!w.calls.some(c => c[0] === 'strokeRect'), 'the walls have no outlines');
    assert.ok(!w.calls.some(c => c[0] === 'strokeStyle' && c[1] === FIG_LINE_WALL), 'nor the props\' outline');
    assert.equal(w.calls.filter(c => c[0] === 'save').length, w.calls.filter(c => c[0] === 'restore').length);
  }
});

// #1024, the room box: the room's box is the cut, its back wall the same box scaled by k toward the eye, 80 over the floor at the bay's centre;
// between them the ceiling's sliver, the floor's strip and the side walls. A full-width room is two bays, one either side of the well.
const { roomBays, roomEye, roomShell } = load(['js/data.js', 'js/util.js', 'js/figures.js', 'js/layouts.js', 'js/camera.js', 'js/rooms.js'], { G: {}, Mods: { filter: (n, v) => v, emit() {}, register() {} } }, ['roomBays', 'roomEye', 'roomShell']);
const near = (a, b) => Math.abs(a - b) < 1e-6;
test('a bay\'s eye is at its centre, 80 over its floor, and its back wall is the box scaled by k: a sliver of 4, a strip of 16 (#1024)', () => {
  const bay = { x0: 374.4, x1: 720, top: 112, floor: 212 }, e = roomEye(bay);
  assert.ok(near(e.vx, (374.4 + 720) / 2) && near(e.vy, 212 - 80) && near(e.k, 0.8), JSON.stringify(e));
  const back = (x, y) => [e.vx + (x - e.vx) * e.k, e.vy + (y - e.vy) * e.k], [bx0, by0] = back(bay.x0, bay.top), [bx1, by1] = back(bay.x1, bay.floor);
  assert.ok(near(by0 - bay.top, 4), `the ceiling's sliver (${by0 - bay.top})`); assert.ok(near(bay.floor - by1, 16), `the floor's strip (${bay.floor - by1})`);
  assert.ok(near(by1 - by0, 80) && near(bx1 - bx0, (bay.x1 - bay.x0) * 0.8), 'the back wall 80 tall, four fifths of the bay across');
  // the shell draws those faces: each a closed path with its corners where k puts them
  const { ctx, calls } = recorder(); roomShell(ctx, bay);
  const faces = filledParts(calls).map(p => p.pts.map(q => q.map(v => Math.round(v * 1000) / 1000).join()).sort().join(' '));
  const face = pts => pts.map(q => q.map(v => Math.round(v * 1000) / 1000).join()).sort().join(' ');
  assert.ok(faces.includes(face([[bx0, by0], [bx1, by0], [bx1, by1], [bx0, by1]])), 'the back wall');
  assert.ok(faces.includes(face([[bay.x0, bay.top], [bay.x1, bay.top], [bx1, by0], [bx0, by0]])), 'the ceiling\'s sliver');
  assert.ok(faces.includes(face([[bay.x0, bay.floor], [bay.x1, bay.floor], [bx1, by1], [bx0, by1]])), 'the floor\'s strip');
  assert.ok(faces.includes(face([[bay.x0, bay.top], [bx0, by0], [bx0, by1], [bay.x0, bay.floor]])) && faces.includes(face([[bay.x1, bay.top], [bx1, by0], [bx1, by1], [bay.x1, bay.floor]])), 'the side walls');
  const c = fakeCtx(); roomShell(c, bay); assert.equal(c.depth, 0, 'every save restored'); assert.equal(c.fonts.length, 0, 'no text');
  // the cut under it, the deck plate, from the floor down
  assert.ok(calls.some((k, i) => k[0] === 'fillRect' && near(k[1], bay.x0) && near(k[2], bay.floor) && near(k[3], bay.x1 - bay.x0) && k[4] === 12), 'the cut, the plate\'s depth under the floor');
});
test('a room on a split deck is one bay; a full-width room is two, either side of the well, each with its own eye (#1024)', () => {
  const lay = LAYOUTS.freighter;
  for (const id of ['galley', 'head', 'gunnery', 'workshop', 'airlock', 'medbay', 'engine', 'hold']) {
    const r = layoutBox(lay, id); assert.deepEqual(JSON.parse(JSON.stringify(roomBays(r, FW))), [JSON.parse(JSON.stringify(r))], id);
  }
  for (const id of ['bridge', 'berths', 'lifesupport']) {
    const r = JSON.parse(JSON.stringify(layoutBox(lay, id))), bays = JSON.parse(JSON.stringify(roomBays(r, FW)));
    assert.deepEqual(bays, [{ ...r, x1: FW.x0 }, { ...r, x0: FW.x1 }], id);
    const [a, b] = bays.map(roomEye);
    assert.ok(near(a.vx, FW.x0 / 2) && near(b.vx, (FW.x1 + lay.width) / 2) && near(a.vy, r.floor - 80), `${id}: an eye in each bay, none on the ladder`);
  }
  assert.equal(roomBays(layoutBox(lay, 'bridge')).length, 1, 'with no well given, one bay');
  // the room draws its bays through the shell it is given (the burn view's cache), once each
  for (const [id, n] of [['galley', 1], ['bridge', 2], ['berths', 2]]) {
    const got = []; drawRoom(fakeCtx(), id, layoutBox(lay, id), RS({ well: FW, damage: { marks: new Set(), severe: false }, shell: (c, bay) => got.push(bay) }));
    assert.equal(got.length, n, `${id}: ${n} bays`);
  }
});
test('a person\'s shadow lies on the floor strip behind the feet, not across the cut (#1024)', () => {
  const { ctx, calls } = recorder(); drawPerson(ctx, { name: 'walk', face: 1, frame: 0 }, 100, 200, { color: '#ffb347' });
  const i = calls.findIndex(k => k[0] === 'fillStyle' && k[1] === 'rgba(0,0,0,0.32)'), el = calls.slice(i).find(k => k[0] === 'ellipse');
  assert.ok(el, 'a shadow'); assert.ok(near(el[6], Math.PI) && near(el[7], Math.PI * 2), `a half-ellipse above the floor line (${el.slice(6)})`);
});
// #1024 step 2, the helper: a solid part (o.solid, its depth as a share of the strip) draws behind its front its top if the top is under the eye,
// the side toward the eye (none when it straddles it), and a contact shadow on the strip if its foot is on the floor. Things on the wall are moved
// rigidly onto the back wall and drawn a step darker (WALL_TONE); a small thing on a top is moved to its depth.
const box = load(['js/data.js', 'js/util.js', 'js/figures.js', 'js/layouts.js', 'js/camera.js', 'js/rooms.js'], { G: {}, Mods: { filter: (n, v) => v, emit() {}, register() {} } }, ['roomPart', 'roomRound', 'roomIn', 'roomOnWall', 'roomAtDepth', 'roomFlat', 'roomInto', 'roomEye', 'roomBays', 'roomHatchBars', 'roomLamps', 'WALL_TONE', 'figShade']);
test('a solid part shows its top only under the eye, its side toward the eye and none when it straddles it, and a shadow only on the floor (#1024)', () => {
  const bay = { x0: 0, x1: 400, top: 0, floor: 100 }, e = box.roomEye(bay), col = '#1f3852', d = 0.45, P = (x, y) => box.roomInto(e, x, y, d);
  const key = pts => pts.map(q => q.map(v => Math.round(v * 1000) / 1000).join()).sort().join(' ');
  const draw = (x0, y0, x1, y1, o = { solid: d }) => { const { ctx, calls } = recorder(); box.roomIn([bay], () => box.roomPart(ctx, box.roomRound(x0, y0, x1 - x0, y1 - y0, 1), col, o)); return { calls, faces: filledParts(calls) }; };
  const has = (faces, fill, pts) => faces.some(f => f.col === fill && key(f.pts) === key(pts));
  const TOP = box.figShade(col, 1.3), SIDE = box.figShade(col, 0.62), front = f => f.col === col;
  // left of the eye, standing on the floor: its top, its right side (toward the eye) and its shadow, all drawn before its front
  const left = draw(20, 60, 80, 100);
  assert.ok(has(left.faces, TOP, [[20, 60], [80, 60], P(80, 60), P(20, 60)]), 'its top, under the eye');
  assert.ok(has(left.faces, SIDE, [[80, 60], [80, 100], P(80, 100), P(80, 60)]), 'its right side, toward the eye');
  assert.ok(!left.faces.some(f => f.col === SIDE && f.pts.some(q => q[0] < 80 && q[1] > 50)), 'not its far side');
  const shadow = left.faces.find(f => f.col.startsWith('rgba') && key(f.pts) === key([[15, 100], [85, 100], P(85, 100), P(15, 100)]));
  assert.ok(shadow, 'a contact shadow on the strip, its footprint widened 5 each side');
  assert.ok(left.faces.findIndex(front) > left.faces.findIndex(f => f === shadow) && left.faces.findIndex(front) > left.faces.findIndex(f => f.col === TOP), 'behind its front');
  // right of the eye: its left side
  const right = draw(320, 60, 380, 100);
  assert.ok(has(right.faces, SIDE, [[320, 60], [320, 100], P(320, 100), P(320, 60)]), 'its left side, toward the eye');
  // straddling the eye: its top, no side
  const mid = draw(150, 60, 250, 100);
  assert.ok(mid.faces.some(f => f.col === TOP) && !mid.faces.some(f => f.col === SIDE), 'a part across the eye shows no side');
  // in the air under the eye: a top, no shadow; over the eye: no top
  const air = draw(20, 40, 80, 70);
  assert.ok(air.faces.some(f => f.col === TOP) && !air.faces.some(f => f.col.startsWith('rgba')), 'off the floor, no shadow');
  const high = draw(20, 2, 80, 15);
  assert.ok(!high.faces.some(f => f.col === TOP) && high.faces.some(f => f.col === SIDE), 'over the eye, no top; still its side');
  // a flat part, or a solid one drawn outside a room, draws only its front as before
  for (const o of [{}, null]) {
    const { ctx, calls } = recorder();
    if (o) box.roomIn([bay], () => box.roomPart(ctx, box.roomRound(20, 60, 60, 40, 1), col, o)); else box.roomPart(ctx, box.roomRound(20, 60, 60, 40, 1), col, { solid: d });
    assert.deepEqual(filledParts(calls).map(f => f.col), [col], o ? 'not solid: its front' : 'no eye: its front');
  }
  // a sloped top (o.slope, its top edge from the left end's y to the right end's): the top face runs back from that edge, and the side starts at
  // its end of it (#1024, the bridge's consoles)
  const slope = draw(20, 60, 80, 70, { solid: d, slope: [66, 60] });
  assert.ok(has(slope.faces, TOP, [[20, 66], [80, 60], P(80, 60), P(20, 66)]), 'its sloped top, back from the edge');
  assert.ok(has(slope.faces, SIDE, [[80, 60], [80, 70], P(80, 70), P(80, 60)]), 'its side, from its end of the edge');
  assert.ok(!slope.faces.some(f => f.col === TOP && f.pts.some(q => near(q[1], 60) && near(q[0], 20))), 'no flat top over the low end');
  // a part that rests on another (o.shadow false: a mattress on its frame) casts no shadow, however near the floor its foot is
  const rests = draw(20, 92, 80, 97.2, { solid: d, shadow: false });
  assert.ok(rests.faces.some(f => f.col === TOP) && !rests.faces.some(f => f.col.startsWith('rgba')), 'resting on its frame: its top, no shadow');
});
test('a thing on the wall is moved whole onto the back wall in the wall tone; a thing on a top to its depth, in its own colour (#1024)', () => {
  const bay = { x0: 0, x1: 400, top: 0, floor: 100 }, e = box.roomEye(bay), col = '#22405c';
  const { ctx, calls } = recorder();
  box.roomIn([bay], () => {
    box.roomOnWall(ctx, 60, 30, () => { box.roomPart(ctx, box.roomRound(40, 20, 40, 20, 1), col); box.roomFlat(ctx, 50, 25, 2, 4, '#8796a5'); });
    box.roomPart(ctx, box.roomRound(40, 20, 40, 20, 1), col);
    box.roomAtDepth(ctx, 300, 60, 0.25, () => box.roomPart(ctx, box.roomRound(290, 50, 20, 10, 1), col));
  });
  const moves = calls.filter(k => k[0] === 'translate'), [wx, wy] = box.roomInto(e, 60, 30, 1), [tx, ty] = box.roomInto(e, 300, 60, 0.25);
  assert.ok(near(moves[0][1], wx - 60) && near(moves[0][2], wy - 30), `onto the back wall (${moves[0]})`);
  assert.ok(near(moves[1][1], tx - 300) && near(moves[1][2], ty - 60), `to its depth on the top (${moves[1]})`);
  assert.ok(!calls.some(k => k[0] === 'scale'), 'at full size');
  const fills = calls.filter(k => k[0] === 'fillStyle').map(k => k[1]), tone = c => box.figShade(c, box.WALL_TONE);
  assert.ok(near(box.WALL_TONE, 0.85));
  assert.ok(fills.indexOf(tone(col)) >= 0 && fills.indexOf(tone('#8796a5')) >= 0, 'on the wall, a step darker');
  assert.equal(fills.filter(f => f === col).length, 2, 'off the wall, its own colour again');
  assert.equal(calls.filter(k => k[0] === 'save').length, calls.filter(k => k[0] === 'restore').length);
});
test('the bridge and the guns are stations: screens and controls, and chairs with backs at their seats (#933)', () => {
  const api = { drawRoom, roomScreen };
  for (const [id, kinds] of [['bridge', ['plot', 'status']], ['gunnery', ['scope', 'bars']]]) {
    const r = { x0: 0, x1: 224, top: 0, floor: 100 }, s = { w: { burn: 0, cruise: 1, flip: 0 }, time: 1, zoom: 1, spin: 0, still: false, night: 0, berths: 6, cargo: 0, fuel: 1, asleep: 0, damage: { marks: new Set(), severe: false }, patient: false };
    const { ctx, calls } = recorder();
    api.drawRoom(ctx, id, r, s);
    // what the station drew: its screens by kind (a screen draws its glass in its own colour) and the chairs' backs
    const glass = calls.filter(c => c[0] === 'fillStyle' && c[1] === '#03121c').length;
    assert.ok(glass >= kinds.length, `${id}: a screen for each of ${kinds} (${glass})`);
  }
});
test('the engine room\'s gauges read the thrust: up in the hard burn, down at the flip with the drive off (#933)', () => {
  assert.ok(gaugeNeedle({ burn: 1, cruise: 0, flip: 0 }, 0, 0) > gaugeNeedle({ burn: 0, cruise: 1, flip: 0 }, 0, 0), 'the needle swings up in the hard burn');
  assert.ok(gaugeNeedle({ burn: 0, cruise: 1, flip: 0 }, 0, 0) > gaugeNeedle({ burn: 0, cruise: 0, flip: 1 }, 0, 0), 'and drops at the flip, the drive off');
});
test('the galley has a stove, its burners and oven door, under a hood (#933)', () => {
  const r = { x0: 0, x1: 420, top: 0, floor: 100 }, s = { w: { burn: 0, cruise: 1, flip: 0 }, time: 1, zoom: 1, spin: 0, still: false, night: 0, berths: 6, cargo: 0, fuel: 1, asleep: 0, damage: { marks: new Set(), severe: false }, patient: false };
  const { ctx, calls } = recorder();
  drawRoom(ctx, 'galley', r, s);
  const fills = c => calls.filter(k => k[0] === 'fillStyle' && k[1] === c).length;
  assert.ok(fills('#0b1520') >= 2, 'two burners'); assert.ok(fills('#2a1a10') >= 1, 'the oven door\'s window'); assert.ok(fills(box.figShade('#56708c', box.WALL_TONE)) >= 1, 'the hood, on the wall (#1024)');
});
test('the medbay has a supply cabinet, its doors and the supplies on it (#933)', () => {
  const r = { x0: 0, x1: 300, top: 0, floor: 100 }, s = { w: { burn: 0, cruise: 1, flip: 0 }, time: 1, zoom: 1, spin: 0, still: false, night: 0, berths: 6, cargo: 0, fuel: 1, asleep: 0, damage: { marks: new Set(), severe: false }, patient: false };
  const { ctx, calls } = recorder();
  drawRoom(ctx, 'medbay', r, s);
  const fills = c => calls.filter(k => k[0] === 'fillStyle' && k[1] === c).length;
  assert.ok(fills('#8a96a2') >= 1, 'the cabinet, the seam between its doors'); assert.ok(fills('#9aa8b6') >= 2, 'a handle on each door'); assert.ok(fills('#7fb8c8') >= 2, 'bottles on its top');
});

// #933, the figures' standard: a prop part is a path with the figures' outline, lit on its top and shaded on its side.
const { roomPart, roomRound, roomBench } = load(['js/data.js', 'js/util.js', 'js/figures.js', 'js/layouts.js', 'js/camera.js', 'js/rooms.js'], { G: {}, Mods: { filter: (n, v) => v, emit() {}, register() {} } }, ['roomPart', 'roomRound', 'roomBench']);
const FIG_OUTLINE = 'rgba(10,13,18,0.85)';
test('a prop part is a closed path, filled, lit on top, shaded on its side and outlined like the figures (#933)', () => {
  const d = roomRound(10, 20, 40, 30, 3);
  assert.match(d, /^M .* Z$/, 'a rounded box is a closed path'); assert.ok((d.match(/Q/g) || []).length === 4, 'its four corners rounded');
  const c = fakeCtx(), { ctx, calls } = recorder();
  for (const x of [c, ctx]) roomPart(x, d, '#2c4c6e', { side: 5 });
  assert.equal(c.depth, 0, 'every save restored'); assert.ok(c.calls.includes('closePath'), 'closed'); assert.ok(c.calls.includes('clip'), 'the shading kept inside it');
  const fills = calls.filter(k => k[0] === 'fillStyle').map(k => k[1]), strokes = calls.filter(k => k[0] === 'strokeStyle').map(k => k[1]);
  assert.ok(fills.includes('#2c4c6e'), 'its front in its own colour');
  const lum = s => { const [r, g, b] = /\d+,\d+,\d+/.exec(s)[0].split(',').map(Number); return r + g + b; }, base = 0x2c + 0x4c + 0x6e;
  assert.ok(fills.some(f => f.startsWith('rgb') && lum(f) > base), 'a lit top'); assert.ok(fills.some(f => f.startsWith('rgb') && lum(f) < base), 'a side in shade');
  assert.deepEqual(strokes, [FIG_OUTLINE], 'the figures\' outline'); assert.ok(calls.some(k => k[0] === 'stroke'));
  assert.equal(calls.filter(k => k[0] === 'save').length, calls.filter(k => k[0] === 'restore').length);
  const plain = recorder(); roomPart(plain.ctx, d, 'rgba(1,2,3,0.5)');
  assert.ok(plain.calls.some(k => k[0] === 'fill') && plain.calls.some(k => k[0] === 'stroke'), 'a colour it cannot shade is filled and outlined');
});
// What the galley drew, apart from its walls and its lamp (the multiset of recorded points and rects less theirs).
const galleyOwn = (r, s) => {
  const all = fakeCtx(); drawRoom(all, 'galley', r, s);
  const base = fakeCtx(); roomWalls(base, r, s.w, s.time, s.still, s.well); drawPhaseLight(base, r, s.w, s.time, s.night, false);
  const left = [...all.args]; for (const a of base.args) { const i = left.indexOf(a); if (i >= 0) left.splice(i, 1); }
  return left.map(a => { const [k, ...v] = a.split(/(?<=[a-zA-Z])(?=-?\d)|,/); return { k, v: v.map(Number) }; });
};
test('the galley is drawn to the figures\' standard in every phase: its props outlined, the name and the sign on clear wall (#933)', () => {
  const r = layoutBox(LAYOUTS.freighter, 'galley'), F = r.floor;
  for (const pr of [0.02, 0.3, 0.45, 0.5]) for (const zoom of [0.82, 1.17, 1.45]) {  // the burn view's zoom in a window 1000, 1280 and 1600 wide
    const s = RS({ w: phaseWeights(pr), zoom, damage: { marks: new Set(), severe: false } });
    const c = fakeCtx(); drawRoom(c, 'galley', r, s); roomMessTable(c, r, s);
    assert.equal(c.depth, 0, `${pr}: every save restored`);
    const { ctx, calls } = recorder(); drawRoom(ctx, 'galley', r, s); roomMessTable(ctx, r, s);
    const fills = col => calls.filter(k => k[0] === 'fillStyle' && k[1] === col).length;
    const wall = col => box.figShade(col, box.WALL_TONE);  // what is on the back wall is a step darker (#1024)
    for (const [col, what] of [['#1f3852', 'the counter and its cupboards'], [wall('#22405c'), 'the cupboards on the wall'], [wall('#8796a5'), 'latches on the cupboards'], ['#3d6a86', 'the water dispenser'], [wall('#7d8995'), 'knives on the strip'],
      [wall('#2f4a66'), 'the porthole\'s frame'], ['#33506e', 'the bench\'s pad'], ['#4a6680', 'the table\'s tie-down rail'], [wall('#56708c'), 'the hood'], ['#0b1520', 'the burners']]) assert.ok(fills(col) >= 1, `${pr}: ${what}`);
    for (const col of ['#22405c', '#7d8995', '#2f4a66']) assert.equal(fills(col), 0, `${pr}: nothing on the wall in its own colour (${col})`);
    for (const [col, what] of [['#2c4c6e', 'the worktop, the hob and the table'], ['#1f3852', 'the counter'], ['#1b3550', 'the stove'], ['#33506e', 'the bench\'s pad']]) assert.ok(fills(box.figShade(col, 1.3)) >= 1, `${pr}: ${what} solid, its top showing`);
    assert.ok(calls.filter(k => k[0] === 'strokeStyle' && k[1] === FIG_OUTLINE).length >= 20, `${pr}: the props outlined like the figures`);
    for (const col of ['#d8d2c4', '#ddd6c8', '#9aa8b6', '#8a5a3a']) assert.equal(fills(col), 0, `${pr}: no near-white or orange block (${col}), the props a step below the people`);
    // the room's name (shiplife.js: 13px on a plate at its top left) and the thrust sign (its right end, over the hood) on clear wall; in the
    // smallest window the sign is scaled up to keep its text at 12px and covers the hood's top, as it is drawn over the room
    const name = { x0: r.x0, x1: r.x0 + 12 + 60 / zoom, y0: r.top + 8 - 1 / zoom, y1: r.top + 8 + 17 / zoom }, sk = zoom < 0.9 ? 0 : Math.max(1, 1.05 / zoom);
    const sign = { x0: r.x1 - 6 - 112 * sk, x1: r.x1 - 6, y0: r.top + 8, y1: r.top + 8 + 18 * sk };
    const hit = (b, x, y) => x > b.x0 && x < b.x1 && y > b.y0 && y < b.y1;
    for (const { k, v } of galleyOwn(r, s)) {
      const pts = k === 'fillRect' ? [[v[0], v[1]], [v[0] + v[2], v[1]], [v[0], v[1] + v[3]], [v[0] + v[2], v[1] + v[3]], [v[0] + v[2] / 2, v[1] + v[3] / 2]] : /^(moveTo|lineTo)$/.test(k) ? [v] : k === 'quadraticCurveTo' ? [v.slice(2)] : [];
      for (const [x, y] of pts) { assert.ok(!hit(name, x, y), `${pr} ${zoom}: ${k} ${v} under the room's name`); assert.ok(!hit(sign, x, y), `${pr} ${zoom}: ${k} ${v} under the thrust sign`); }
    }
  }
  // sized to a person: the bench at the seated hip, the counter at the waist
  const b = fakeCtx(); roomBench(b, 100, 300, 100);
  const ys = b.args.filter(a => /^(moveTo|lineTo)/.test(a)).map(a => Number(a.split(',')[1]));
  assert.ok(Math.abs(100 - Math.min(...ys) - 23) <= 1.5, `the bench's seat at about 23 (${100 - Math.min(...ys)})`);
});
// Each filled path the galley drew, its points where they land on the screen (the translations it was drawn under applied), and its colour.
const placedParts = calls => {
  const out = [], stack = []; let dx = 0, dy = 0, pts = [], fill = null;
  for (const [k, ...a] of calls) {
    if (k === 'save') stack.push([dx, dy]); else if (k === 'restore') [dx, dy] = stack.pop(); else if (k === 'translate') { dx += a[0]; dy += a[1]; }
    else if (k === 'fillStyle') fill = a[0]; else if (k === 'beginPath') pts = [];
    else if (k === 'moveTo' || k === 'lineTo') pts.push([a[0] + dx, a[1] + dy]); else if (k === 'quadraticCurveTo') pts.push([a[2] + dx, a[3] + dy]);
    else if (k === 'ellipse') pts.push([a[0] + dx, a[1] + dy, a[2], a[3]]); else if (k === 'arc') pts.push([a[0] + dx, a[1] + dy, a[2], a[2]]);
    else if (k === 'fill') out.push({ col: String(fill).toLowerCase(), pts: [...pts], at: [dx, dy] });
  }
  return out;
};
test('in the box the galley\'s hood is over the burners, clear of the pans and the thrust sign, and the dispenser stands on the worktop (#1024)', () => {
  for (const r of [layoutBox(LAYOUTS.freighter, 'galley'), { x0: 0, x1: 420, top: 0, floor: 100 }]) {
    const F = r.floor, e = box.roomEye(r), { ctx, calls } = recorder(); drawRoom(ctx, 'galley', r, RS({ w: phaseWeights(0.3), damage: { marks: new Set(), severe: false } }));
    const parts = placedParts(calls), xs = p => p.pts.map(q => q[0]), ys = p => p.pts.map(q => q[1]), span = p => [Math.min(...xs(p)), Math.max(...xs(p))];
    const hood = parts.find(p => p.col === box.figShade('#56708c', box.WALL_TONE) && p.pts.length >= 4), [h0, h1] = span(hood);
    const burners = parts.filter(p => p.col === '#0b1520' && p.pts.length === 1 && p.pts[0][3] === 1.5).map(p => p.pts[0][0]);
    assert.equal(burners.length, 2, 'two burners');
    const bc = (burners[0] + burners[1]) / 2;
    assert.ok(Math.abs((h0 + h1) / 2 - bc) < 2, `the hood (${h0} to ${h1}) centred over the burners (${bc})`);
    const rail = parts.find(p => p.col === box.figShade('#3d5a7a', box.WALL_TONE)), pans = parts.filter(p => p.col === box.figShade('#4a5662', box.WALL_TONE)).map(p => p.pts[0]);
    const p0 = Math.min(span(rail)[0], ...pans.map(q => q[0] - q[2])), p1 = Math.max(span(rail)[1], ...pans.map(q => q[0] + q[2]));
    assert.equal(pans.length, 2, 'two pans');
    assert.ok(p1 < h0 || p0 > h1, `the pans and their rail (${p0} to ${p1}) clear of the hood (${h0} to ${h1})`);
    const back = box.roomInto(e, r.x1, F, 1)[0];
    assert.ok(Math.max(h1, p1) < back, 'on the back wall, not in the side wall');
    assert.ok(Math.min(...ys(hood)) > r.top + 26, 'under the thrust sign (its bottom at the top + 26)');
    // the dispenser: every part of it drawn under one move, its foot on the worktop's top at the depth it is moved to, inside the worktop's ends
    const bottle = parts.find(p => p.col === '#3d6a86'), its = parts.filter(p => p.at[0] === bottle.at[0] && p.at[1] === bottle.at[1]), foot = Math.max(...its.flatMap(ys));
    const W = r.x1 - r.x0, c0 = r.x0 + W * 0.02 - 1.5, c1 = r.x0 + W * 0.205 + 1.5, cx = (Math.min(...xs(bottle)) + Math.max(...xs(bottle))) / 2;
    const raw = cx - bottle.at[0], d = bottle.at[0] / ((e.vx - raw) * (1 - e.k)), top = box.roomInto(e, raw, F - 41, d)[1];  // the depth its move puts it at
    assert.ok(d > 0 && d < 1, `on a top in front of the back wall (${d})`);
    assert.ok(Math.abs(foot - top) < 0.01, `its foot (${foot}) on the worktop's top (${top})`);
    assert.ok(Math.min(...its.flatMap(xs)) > box.roomInto(e, c0, F - 41, d)[0] && Math.max(...its.flatMap(xs)) < box.roomInto(e, c1, F - 41, d)[0], 'between the worktop\'s ends');
  }
});
test('the mess table has legs and a tie-down rail, its plates and the mug on it, in every phase (#933)', () => {
  for (const pr of [0.02, 0.3, 0.45, 0.5]) {
    const c = fakeCtx(); roomMessTable(c, RR, RS({ w: phaseWeights(pr) })); assert.equal(c.depth, 0);
    const { ctx, calls } = recorder(); roomMessTable(ctx, RR, RS({ w: phaseWeights(pr) }));
    assert.ok(calls.filter(k => k[0] === 'strokeStyle' && k[1] === FIG_OUTLINE).length >= 5, `${pr}: the top, two legs and the rail outlined`);
    assert.ok(calls.filter(k => k[0] === 'fillStyle' && k[1] === '#4a6680').length >= 1, `${pr}: the tie-down rail`);
    assert.ok(calls.filter(k => k[0] === 'arc').length >= 4, `${pr}: the rail's tie-down rings`);
    assert.ok(!calls.some(k => k[0] === 'fillStyle' && k[1] === '#cfe3ff'), `${pr}: the mug a step below white`);
  }
});
test('the thrust sign is a plate screwed to the wall, still reading the phase and the g (#933)', () => {
  const { ctx, calls } = recorder(); drawThrustSign(ctx, 0, 0, 2.7, phaseWeights(0.3), 1, 1.5);
  assert.ok(calls.some(k => k[0] === 'strokeStyle' && k[1] === FIG_OUTLINE), 'outlined like the figures'); assert.ok(calls.some(k => k[0] === 'closePath'), 'a drawn plate');
  assert.ok(calls.filter(k => k[0] === 'arc').length >= 4, 'a screw at each corner');
});

// Review Focus 5 (#972): at the hard burn someone off their couch's deck takes the ladder in the well to it, never through the floors.
test('the couch phase takes the ladder to a couch on another deck, and the couch unfolds once they are on it (#972)', () => {
  const G2 = { mode: 'transit' };
  const api = load(['js/data.js', 'js/util.js', 'js/figures.js', 'js/layouts.js', 'js/camera.js', 'js/rooms.js', 'js/shiplife.js', 'js/burnspeed.js'], {
    G: G2, Mods: { filter: (n, v) => v, emit() {}, register() {} }, Settings: { reduceMotion: false }, document: { getElementById: () => null },
    comm() {}, ship: () => ({ armor: 100 }), roleHolder: () => null, handHurt: () => false,
  }, ['lifeTick', 'roomAt', 'LADDER']);
  const berths = api.roomAt('berths'), seat = berths.x0 + berths.w * 0.2;
  const eng = { name: 'Tomas', role: 'engineer', id: 'e', room: 'engine', x: 0.24, dk: 6, tdk: 6, tx: null, seat, seatDk: berths.deck, couch: 0, wait: 3 };
  const you = { name: 'You', role: 'you', id: 'you', room: 'bridge', x: 0.5, dk: 0, tdk: 0, tx: null, seat: 0.5, seatDk: 0, couch: 0, wait: 3 };
  G2.state = { day: 3, crew: ['e'], armor: 100, people: {}, injured: {} };
  G2.transit = { total: 100, left: 3, elapsed: 0, to: 'mars', days: 3, aboard: [you, eng], dark: false };  // pr 0.97: the hard burn in
  let offLadder = 0, unfolded = false;
  for (let i = 0; i < 1200; i++) {
    api.lifeTick(1 / 30);
    if (eng.dk !== Math.round(eng.dk) && Math.abs(eng.x - api.LADDER) > 0.01) offLadder++;
    if (eng.couch > 0 && eng.dk !== berths.deck) unfolded = true;
  }
  assert.equal(offLadder, 0, 'between decks only in the well');
  assert.equal(eng.dk, berths.deck, 'on the berths deck'); assert.ok(Math.abs(eng.x - seat) < 0.005, `at the couch (${eng.x} for ${seat})`);
  assert.ok(eng.couch > 0.9, 'the couch unfolded under them'); assert.ok(!unfolded, 'and not before they were on its deck');
  assert.equal(you.dk, 0); assert.ok(you.couch > 0.9, 'someone on their couch\'s deck eases onto it as before');
});

// The berths on the tower (#972): the crew deck's full width with the well up its middle, the bunks either side of it, one sleeper to a bunk.
test('the bunks are a person long, three high either side of the well, and a sleeper lies on one with the head on the pillow (#972, #1023)', () => {
  const lay = LAYOUTS.freighter, r = layoutBox(lay, 'berths'), well = { x0: (lay.well.x - lay.well.w / 2) * lay.width, x1: (lay.well.x + lay.well.w / 2) * lay.width };
  for (let n = 2; n <= 12; n++) {
    const bunks = Array.from({ length: n }, (_, k) => berthBunk(r, n, k, well));
    bunks.forEach((b, k) => {
      assert.ok(b.w >= 80, `n ${n}, bunk ${k}: ${b.w} long`);
      assert.ok(b.x >= r.x0 && b.x + b.w <= r.x1, `n ${n}, bunk ${k}: in the room`);
      assert.ok(b.x + b.w <= well.x0 || b.x >= well.x1, `n ${n}, bunk ${k} (${b.x} to ${b.x + b.w}) clear of the well (${well.x0} to ${well.x1})`);
      bunks.slice(0, k).forEach((a, j) => assert.ok(a.y !== b.y || a.x + a.w <= b.x || b.x + b.w <= a.x, `n ${n}: bunks ${j} and ${k} overlap`));
      const at = berthSleeper(b), fig = drawPerson(fakeCtx(), { name: 'bunk', face: 1, frame: 0 }, at.x, at.y, { color: '#ffb347' });
      assert.ok(fig.head.x - 8 >= b.x && fig.head.x < b.x + b.w / 2, `n ${n}, bunk ${k}: the head (${fig.head.x}) on the pillow end of ${b.x} to ${b.x + b.w}`);
      assert.ok(fig.foot.x + 5 <= b.x + b.w, `n ${n}, bunk ${k}: the feet (${fig.foot.x}) on the bunk, to ${b.x + b.w}`);
    });
    assert.ok(bunks.some(b => b.x >= well.x1) || n < 4, `n ${n}: bunks on both sides of the well`);
    // three high (#1023): the bottom tier's frame (2.8 deep) on the deck, the tiers 29.5 apart, each bunk in a column over a bottom one
    const tiers = [...new Set(bunks.map(b => b.y))].sort((a, b) => b - a);
    assert.equal(tiers.length, Math.min(n, 3), `n ${n}: ${tiers.length} tiers`);
    tiers.forEach((y, t) => assert.ok(Math.abs(y - (r.floor - 2.8 - 29.5 * t)) < 1e-9, `n ${n}: tier ${t} at ${y}`));
    assert.ok(bunks.filter(b => b.y === tiers[0]).length === Math.ceil(n / 3) && bunks.every(b => bunks.some(a => a.y === tiers[0] && a.x === b.x)), `n ${n}: every bunk over a bottom one`);
  }
});

test('the mug has its handle in every phase, lifted with it (#933)', () => {
  const tx = RR.x0 + (RR.x1 - RR.x0) * 0.25, mx = tx + (RR.x0 + (RR.x1 - RR.x0) * 0.73 - tx) * 0.75;
  for (const pr of [0.02, 0.3, 0.5]) {
    const { ctx, calls } = recorder(); roomMessTable(ctx, RR, RS({ w: phaseWeights(pr) }));
    assert.ok(calls.some(k => k[0] === 'arc' && Math.abs(k[1] - (mx + 5)) < 0.5 && k[3] === 2.5), `${pr}: the handle at the mug's side`);
  }
});
test('the galley answers the phase: the stove\'s ring lit only in cruise, the table lashed to its rings only in the hard burn (#933)', () => {
  const r = { x0: 0, x1: 420, top: 0, floor: 100 }, W = 420, tx = W * 0.25, tw = W * 0.73 - tx, rings = Array.from({ length: 6 }, (_, k) => tx + 14 + (tw - 28) * k / 5);
  const draw = w => { const { ctx, calls } = recorder(); const s = RS({ w, damage: { marks: new Set(), severe: false } }); drawRoom(ctx, 'galley', r, s); roomMessTable(ctx, r, s); return calls; };
  const lit = calls => calls.some(k => k[0] === 'fillStyle' && String(k[1]).startsWith('rgba(255,122,58'));
  const lashings = calls => { const out = []; calls.forEach((k, i) => { if (k[0] === 'strokeStyle' && k[1] === 'rgba(140,170,200,0.5)') for (let j = i + 1; j < calls.length && calls[j][0] !== 'strokeStyle'; j++) if (calls[j][0] === 'moveTo') out.push(calls[j][1]); }); return out; };
  for (const [w, ring, lashed] of [[{ burn: 0, cruise: 1, flip: 0 }, true, false], [{ burn: 0.96, cruise: 0.04, flip: 0 }, false, true], [{ burn: 0, cruise: 0.04, flip: 0.96 }, false, false], [{ burn: 0.5, cruise: 0.5, flip: 0 }, true, false]]) {
    const calls = draw(w), l = lashings(calls);
    assert.equal(lit(calls), ring, `ring lit at ${JSON.stringify(w)}`);
    assert.equal(l.length > 0, lashed, `lashings at ${JSON.stringify(w)}`);
    for (const x of l) assert.ok(rings.some(rx => Math.abs(rx - x) < 0.01), `a lashing from a ring (${x})`);
  }
});

// #933, the bridge: what it drew, apart from its walls and its lamp, and each filled path with its colour and whether it was outlined like the figures.
const { bridgeGlass, commsRackBox } = load(['js/data.js', 'js/util.js', 'js/figures.js', 'js/layouts.js', 'js/camera.js', 'js/rooms.js'], { G: {}, Mods: { filter: (n, v) => v, emit() {}, register() {} } }, ['bridgeGlass', 'commsRackBox']);
const roomOwn = (id, r, s) => {
  const all = fakeCtx(); drawRoom(all, id, r, s);
  const base = fakeCtx(); roomWalls(base, r, s.w, s.time, s.still, s.well); drawPhaseLight(base, r, s.w, s.time, s.night, true);
  const left = [...all.args]; for (const a of base.args) { const i = left.indexOf(a); if (i >= 0) left.splice(i, 1); }
  return left.map(a => { const [k, ...v] = a.split(/(?<=[a-zA-Z])(?=-?\d)|,/); return { k, v: v.map(Number) }; });
};
const filledParts = calls => {
  const out = []; let pts = [], fill = null, stroke = null, last = null;
  for (const [k, ...a] of calls) {
    if (k === 'fillStyle') fill = a[0]; else if (k === 'strokeStyle') stroke = a[0];
    else if (k === 'beginPath') { pts = []; last = null; } else if (k === 'moveTo' || k === 'lineTo') pts.push(a); else if (k === 'quadraticCurveTo') pts.push(a.slice(2));
    else if (k === 'fill') { last = { col: String(fill).toLowerCase(), pts: [...pts], outlined: false }; out.push(last); } else if (k === 'stroke' && last && stroke === FIG_OUTLINE) last.outlined = true;
  }
  return out;
};
const wallTone = col => box.figShade(col, box.WALL_TONE);  // what is on the back wall is a step darker (#1024)
// A fill's red, green and blue, written as #rrggbb or as figShade writes it (rgb(r,g,b): a solid's faces, the wall tone); null for anything else.
const rgbOf = col => (/^#[0-9a-f]{6}$/.test(col) ? [1, 3, 5].map(i => parseInt(col.slice(i, i + 2), 16)) : /^rgb\(/.test(col) ? col.slice(4, -1).split(',').map(Number) : null);
const BRIDGE_PROPS = [[wallTone('#2a4560'), 'the window\'s frame and its struts, on the wall'], ['#1d3550', 'the overhead panel'], ['#3a5470', 'the grab rails'], [wallTone('#3a2c20'), 'the certificate\'s frame, on the wall'], [wallTone('#a39b84'), 'the certificate, on the wall'],
  ['#1f3a56', 'the consoles'], ['#2c4c6e', 'the consoles\' sloped tops'], ['#2e4a68', 'the seats\' pans'], ['#284664', 'the seats\' backs and headrests'], ['#03121c', 'the screens'], ['#1b2f45', 'the comms station\'s rack']];
// Each filled rectangle where it lands on the screen (the translations it was drawn under applied), and its colour.
const placedRects = calls => {
  const out = [], stack = []; let dx = 0, dy = 0, fill = null;
  for (const [k, ...a] of calls) {
    if (k === 'save') stack.push([dx, dy]); else if (k === 'restore') [dx, dy] = stack.pop(); else if (k === 'translate') { dx += a[0]; dy += a[1]; }
    else if (k === 'fillStyle') fill = a[0]; else if (k === 'fillRect') out.push({ col: String(fill).toLowerCase(), x: a[0] + dx, y: a[1] + dy, w: a[2], h: a[3] });
  }
  return out;
};
test('the bridge is drawn to the figures\' standard in every phase: its props outlined and a step below the people, its name on clear wall (#933)', () => {
  const r = layoutBox(LAYOUTS.freighter, 'bridge'), F = r.floor, W = r.x1 - r.x0;
  for (const pr of [0.02, 0.3, 0.45, 0.5]) for (const zoom of [0.82, 1.17, 1.45]) {  // the burn view's zoom in a window 1000, 1280 and 1600 wide
    const s = RS({ w: phaseWeights(pr), zoom, well: FW, damage: { marks: new Set(), severe: false } });  // two bays, as the burn view draws it (#1024)
    const c = fakeCtx(); drawRoom(c, 'bridge', r, s); assert.equal(c.depth, 0, `${pr}: every save restored`);
    const { ctx, calls } = recorder(); drawRoom(ctx, 'bridge', r, s);
    const fills = col => calls.filter(k => k[0] === 'fillStyle' && k[1] === col).length;
    for (const [col, what] of BRIDGE_PROPS) assert.ok(fills(col) >= 1, `${pr}: ${what} (${col})`);
    for (const col of ['#2a4560', '#3a2c20', '#a39b84']) assert.equal(fills(col), 0, `${pr}: nothing on the wall in its own colour (${col})`);
    for (const [col, what] of [['#1f3a56', 'the consoles'], ['#2c4c6e', 'the consoles\' sloped tops'], ['#2e4a68', 'the seats\' pans'], ['#1c3249', 'the seats\' foot plates']]) assert.ok(fills(box.figShade(col, 1.3)) >= 1, `${pr}: ${what} solid, a top showing`);
    const parts = filledParts(calls), outlined = parts.filter(p => p.outlined);
    assert.ok(outlined.length >= 40, `${pr}: the props outlined like the figures (${outlined.length})`);
    for (const { col } of outlined.filter(p => rgbOf(p.col))) {
      const v = rgbOf(col);
      assert.ok(Math.max(...v) <= 0xb0 && Math.max(...v) - Math.min(...v) <= 0x60, `${pr}: ${col} is near-white or saturated, brighter than the people`);
    }
    for (const col of ['#e8e0c8', '#e0b48e', '#ffb347']) assert.ok(!outlined.some(p => p.col === col), `${pr}: no ${col} block`);
    // the room's name (shiplife.js: 13px on a plate at its top left) on clear wall
    const name = { x0: r.x0, x1: r.x0 + 12 + 60 / zoom, y0: r.top + 8 - 1 / zoom, y1: r.top + 8 + 17 / zoom }, hit = (b, x, y) => x > b.x0 && x < b.x1 && y > b.y0 && y < b.y1;
    for (const { k, v } of roomOwn('bridge', r, s)) {
      const pts = k === 'fillRect' ? [[v[0], v[1]], [v[0] + v[2], v[1]], [v[0], v[1] + v[3]], [v[0] + v[2], v[1] + v[3]], [v[0] + v[2] / 2, v[1] + v[3] / 2]] : /^(moveTo|lineTo)$/.test(k) ? [v] : k === 'quadraticCurveTo' ? [v.slice(2)] : [];
      for (const [x, y] of pts) assert.ok(!hit(name, x, y), `${pr} ${zoom}: ${k} ${v} under the room's name`);
    }
    // sized to a person: a seat's pan at the seated hip (23) at each of the posts, and the consoles' tops at about the waist
    const pans = parts.filter(p => p.col === '#2e4a68' && p.outlined);
    for (const f of SEATS.bridge) {
      const x = r.x0 + W * f, pan = pans.find(p => { const xs = p.pts.map(q => q[0]); return Math.abs((Math.min(...xs) + Math.max(...xs)) / 2 - x) < 1; });
      assert.ok(pan, `${pr}: a seat at the post ${f} (${x})`);
      assert.ok(Math.abs(F - Math.min(...pan.pts.map(q => q[1])) - 23) <= 0.5, `${pr}: the seat at ${f} at 23 (${F - Math.min(...pan.pts.map(q => q[1]))})`);
    }
    const tops = parts.filter(p => p.col === '#2c4c6e' && p.outlined).map(p => F - Math.min(...p.pts.map(q => q[1])));
    assert.equal(tops.length, SEATS.bridge.length, `${pr}: a console at each post`); for (const t of tops) assert.ok(t >= 36 && t <= 44, `${pr}: a console's top at the waist (${t})`);
    calls.forEach((k, i) => { if (k[0] === 'fillStyle' && k[1] === 'rgba(6,13,22,0.85)' && calls[i + 1][0] === 'fillRect') assert.ok(calls[i + 1][2] >= r.top, `${pr} ${zoom}: the COMMS label (${calls[i + 1].slice(1)}) inside the room`); });
    // the forward window: a clear rectangle the code names (for the destination, #936), high on the back wall of the forward bay (#1024), as wide
    // as that wall leaves room for in its frame, over the screens and clear of the name; drawn where it is named, in the glass's own colour
    const g = bridgeGlass(r, FW), bay = box.roomBays(r, FW)[1], e = box.roomEye(bay), [bx0, by0] = box.roomInto(e, bay.x0, bay.top), [bx1, by1] = box.roomInto(e, bay.x1, bay.floor);
    assert.ok(g.x - 4 >= bx0 && g.x + g.w + 4 <= bx1 && g.y - 4 >= by0 && g.y + g.h + 3 <= by1, `${pr}: the window and its frame ${JSON.stringify(g)} on the back wall (${bx0} to ${bx1}, ${by0} to ${by1}), not in a side wall`);
    assert.ok(g.w >= bx1 - bx0 - 16 && g.h >= 25 && g.y > r.top && g.x > name.x1, `${pr}: the window ${JSON.stringify(g)} across the back wall`);
    assert.deepEqual(placedRects(calls).filter(q => q.col === '#01040a').map(q => [q.x, q.y, q.w, q.h]), [[g.x, g.y, g.w, g.h]], `${pr}: the glass drawn where it is named`);
    calls.forEach((k, i) => { if (k[0] === 'fillStyle' && k[1] === '#03121c' && calls[i + 1][0] === 'fillRect') assert.ok(calls[i + 1][2] - 3 >= g.y + g.h + 3 || calls[i + 1][1] > g.x + g.w || calls[i + 1][1] + calls[i + 1][3] < g.x, `${pr}: a screen (${calls[i + 1].slice(1)}) under the window`); });
  }
});
test('the bridge\'s seats have headrests and harnesses, the pilot\'s post a throttle that goes forward in the burn, and the comms rack on the aft post\'s console (#933)', () => {
  const r = layoutBox(LAYOUTS.freighter, 'bridge'), F = r.floor, W = r.x1 - r.x0;
  const draw = pr => { const { ctx, calls } = recorder(); drawRoom(ctx, 'bridge', r, RS({ w: phaseWeights(pr), damage: { marks: new Set(), severe: false } })); return calls; };
  const calls = draw(0.3), parts = filledParts(calls);
  const heads = parts.filter(p => p.col === '#284664' && p.outlined && F - Math.min(...p.pts.map(q => q[1])) >= 55);
  assert.equal(heads.length, SEATS.bridge.length, 'a headrest on each seat, at the seated head');
  for (const p of heads) { const xs = p.pts.map(q => q[0]), seat = SEATS.bridge.map(f => r.x0 + W * f).find(x => Math.max(...xs) <= x && Math.max(...xs) > x - 12); assert.ok(seat, `the headrest at ${xs} behind a seat, which faces forward (#985)`); }
  assert.ok(calls.filter(k => k[0] === 'strokeStyle' && k[1] === '#5a4e3a').length >= SEATS.bridge.length, 'a harness on each seat');
  const throttle = calls => { const i = calls.findIndex(k => k[0] === 'strokeStyle' && k[1] === '#7d8a98'), m = calls.slice(i).find(k => k[0] === 'moveTo'), l = calls.slice(i).find(k => k[0] === 'lineTo'); return [m[1], l[1]]; };
  const [base, cruise] = throttle(calls), burn = throttle(draw(0.02))[1], pilot = r.x0 + W * SEATS.bridge[1];
  assert.ok(base > pilot && base < pilot + 60, `the throttle (${base}) on the pilot's console, in front of the seat at ${pilot}`);
  assert.ok(burn > cruise + 2, `forward in the hard burn (${burn} against ${cruise})`);
  const rk = commsRackBox(r), aft = r.x0 + W * SEATS.bridge[0];
  assert.ok(rk.x > aft && rk.x + rk.w < aft + 70, `the comms rack (${JSON.stringify(rk)}) on the console in front of the aft seat at ${aft}`);
  assert.ok(F - (rk.y + rk.h) >= 36 && F - (rk.y + rk.h) <= 44 && rk.y >= r.top + 19, `on the console's top, under the overhead panel (${JSON.stringify(rk)})`);
  assert.ok(calls.some(k => k[0] === 'fillStyle' && k[1] === '#1b2f45') && rk.w >= 30 && rk.h >= 30, 'drawn, and big enough to click');
  // in the box (#1024): the rack stands on its console at the front, so the box a click opens Comms by (G.cutRack) is where the rack is drawn
  for (const pr of [0.02, 0.3, 0.5]) {
    const { ctx, calls: c } = recorder(); drawRoom(ctx, 'bridge', r, RS({ w: phaseWeights(pr), well: FW, damage: { marks: new Set(), severe: false } }));
    const rack = placedParts(c).find(p => p.col === '#1b2f45'), xs = rack.pts.map(q => q[0]), ys = rack.pts.map(q => q[1]);
    assert.ok(near(Math.min(...xs), rk.x) && near(Math.max(...xs), rk.x + rk.w) && near(Math.min(...ys), rk.y) && rack.at[0] === 0 && rack.at[1] === 0, `${pr}: the rack drawn at its box ${JSON.stringify(rk)} (${Math.min(...xs)}, ${Math.min(...ys)}, moved ${rack.at})`);
  }
});

test('the slicer sits at the comms station and the pilot at the helm, whoever holds the bridge with them (#933)', () => {
  const { postSeat } = load(['js/data.js', 'js/util.js', 'js/figures.js', 'js/layouts.js', 'js/camera.js', 'js/rooms.js', 'js/shiplife.js'], { G: {}, Mods: { filter: (n, v) => v, emit() {}, register() {} } }, ['postSeat']);
  const seats = roles => roles.map((_, k) => postSeat('bridge', roles, k));
  assert.deepEqual(seats(['captain', 'pilot', 'xo', 'slicer']), [2, 1, 3, 0], 'the stations kept, the rest in order');
  assert.deepEqual(seats(['slicer', 'pilot']), [0, 1]);
  assert.deepEqual(seats(['captain', 'pilot']), [0, 1], 'no slicer aboard: the comms station is free for another');
  assert.deepEqual(seats(['pilot', 'pilot', 'captain']), [1, 0, 2], 'a second pilot takes a free post');
  assert.deepEqual(seats(['engineer']), [0], 'a room without stations: in order');
  assert.equal(postSeat('bridge', ['pilot'], -1), -1, 'not among them');
  const five = seats(['you', 'xo', 'captain', 'pilot', 'slicer']);
  assert.equal(new Set(five).size, 5, `five on the bridge, each in their own place (${five})`); assert.deepEqual(five.slice(3), [1, 0]);
  const br = roomAt('bridge'), on = ['captain', 'slicer', 'pilot'].map((role, i) => ({ role, id: role, x: 0.5, dk: 0, tdk: 0, tx: null, room: 'galley' }));
  for (const p of on) routineGo(p, 'shift', on, false, () => 0.5);
  assert.deepEqual(on.map(p => Math.round((p.tx - br.x0) / br.w * 100) / 100), [0.7, 0.12, 0.3], 'the shift seats them so');
});

// #933, the berths: the bunks three high either side of the well (#1023), each with its mattress, pillow, blanket, curtain rail and reading lamp,
// and a clear place for its owner's one thing (#934); the shelf, the guitar and the towel beside the well. Drawn at the burn view's zoom in
// a window 1000, 1280 and 1600 wide, with 4, 8 and 12 bunks.
const { roomBerths, berthKeep, berthCorner, roomIn: berthIn, roomBays: berthBays } = load(['js/data.js', 'js/util.js', 'js/figures.js', 'js/layouts.js', 'js/camera.js', 'js/rooms.js'], { G: {}, Mods: { filter: (n, v) => v, emit() {}, register() {} } }, ['roomBerths', 'berthKeep', 'berthCorner', 'roomIn', 'roomBays']);
const BERTH_PROPS = [['#2a4664', 'the posts'], ['#1f3a56', 'the frames'], ['#3a4a5e', 'the mattresses'], ['#9a968a', 'the pillows'], ['#334560', 'a blanket over a sleeper'],
  ['#3e4f6e', 'a blanket folded on an empty bunk'], ['#3a5470', 'the curtain rails and grab rails'], ['#4a3a5a', 'the curtains'], ['#4a5a6a', 'the reading lamps'],
  [wallTone('#284a68'), 'the shelves, on the wall'], [wallTone('#9a6c40'), 'the guitar, on the wall'], [wallTone('#8a4a40'), 'the towel, on the wall']];
// The berths as the burn view draws them, in their bays (drawRoom's roomIn), without the walls: their solids show their depth (#1024).
const berthsIn = (ctx, r, s) => berthIn(berthBays(r, s.well), () => roomBerths(ctx, r, s, sh => r.x0 + (r.x1 - r.x0) * sh, r.x1 - r.x0));
const berthCase = (n, pr, zoom) => {
  const lay = LAYOUTS.freighter, r = layoutBox(lay, 'berths'), well = { x0: (lay.well.x - lay.well.w / 2) * lay.width, x1: (lay.well.x + lay.well.w / 2) * lay.width };
  return { r, well, s: RS({ w: phaseWeights(pr), zoom, berths: n, asleep: Math.min(n - 2, 5), well, damage: { marks: new Set(), severe: false } }), bunks: Array.from({ length: n }, (_, k) => berthBunk(r, n, k, well)) };
};
const partBox = p => { const xs = p.pts.map(q => q[0]), ys = p.pts.map(q => q[1]); return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) }; };
test('the berths are drawn to the figures\' standard in every phase: their props outlined and a step below the people, the name on clear wall (#933)', () => {
  for (const n of [4, 8, 12]) for (const pr of [0.02, 0.3, 0.45, 0.5]) for (const zoom of [0.82, 1.17, 1.45]) {
    const { r, s } = berthCase(n, pr, zoom), at = `${n} bunks, ${pr}, ${zoom}`;
    const c = fakeCtx(); drawRoom(c, 'berths', r, s); assert.equal(c.depth, 0, `${at}: every save restored`);
    for (const f of c.fonts) assert.ok(Number(/(\d+(?:\.\d+)?)px/.exec(f)[1]) >= 12, `${at}: ${f}`);
    const { ctx, calls } = recorder(); drawRoom(ctx, 'berths', r, s);
    const fills = col => calls.filter(k => k[0] === 'fillStyle' && k[1] === col).length;
    for (const [col, what] of BERTH_PROPS) assert.ok(fills(col) >= 1, `${at}: ${what} (${col})`);
    for (const col of ['#22405c', '#284a68', '#2c4c6e', '#9a6c40', '#8a4a40', '#7a6446', '#3a2c20']) assert.equal(fills(col), 0, `${at}: nothing on the wall in its own colour (${col})`);
    for (const [col, what] of [['#1f3a56', 'the frames'], ['#3a4a5e', 'the mattresses']]) assert.ok(fills(box.figShade(col, 1.3)) >= 1, `${at}: ${what} solid, their tops showing`);
    assert.ok(fills(box.figShade('#2a4664', 0.72)) >= 1, `${at}: a column's back posts, on the side toward the eye`);
    const parts = filledParts(calls), outlined = parts.filter(p => p.outlined);
    assert.ok(outlined.length >= 8 * n + 10, `${at}: the props outlined like the figures (${outlined.length})`);  // eight parts to a bunk, and the corner's
    for (const { col } of outlined.filter(p => rgbOf(p.col))) {
      const v = rgbOf(col);
      assert.ok(Math.max(...v) <= 0xb0 && Math.max(...v) - Math.min(...v) <= 0x60, `${at}: ${col} is near-white or saturated, brighter than the people`);
    }
    for (const col of ['#d8d2c4', '#c84a3a', '#ddd']) assert.equal(fills(col), 0, `${at}: no near-white or saturated block (${col})`);
    const W = r.x1 - r.x0, lamps = [1, 2].map(k => r.x0 + W * k / 3), fitting = b => lamps.some(x => b.x0 >= x - 12 && b.x1 <= x + 12) && b.y1 <= r.top + 7;  // the ceiling lamps' fittings, mounted to it (#1024)
    for (const p of outlined.filter(q => q.col !== wallTone('#8a4a40') && !fitting(partBox(q)))) assert.ok(partBox(p).y0 >= r.top + 6,  // the towel's path is at the origin, moved by ctx.translate as it swings
      `${at}: a ${p.col} part (${JSON.stringify(partBox(p))}) under the ceiling`);
    // the room's name (shiplife.js: 13px on a plate at its top left) on clear wall
    const name = { x0: r.x0, x1: r.x0 + 12 + 60 / zoom, y0: r.top + 8 - 1 / zoom, y1: r.top + 8 + 17 / zoom }, hit = (b, x, y) => x > b.x0 && x < b.x1 && y > b.y0 && y < b.y1;
    for (const { k, v } of roomOwn('berths', r, s)) {
      const pts = k === 'fillRect' ? [[v[0], v[1]], [v[0] + v[2], v[1]], [v[0], v[1] + v[3]], [v[0] + v[2], v[1] + v[3]], [v[0] + v[2] / 2, v[1] + v[3] / 2]] : /^(moveTo|lineTo)$/.test(k) ? [v] : k === 'quadraticCurveTo' ? [v.slice(2)] : [];
      for (const [x, y] of pts) assert.ok(!hit(name, x, y), `${at}: ${k} ${v} under the room's name`);
    }
  }
});
test('each bunk is a person long, with its mattress, the pillow under the sleeper\'s head, a reading lamp over it, in its own tier (#933, #1023)', () => {
  for (const n of [4, 8, 12]) {
    const { r, s, bunks } = berthCase(n, 0.3, 1.45), F = r.floor, { ctx, calls } = recorder(); drawRoom(ctx, 'berths', r, s);
    const parts = filledParts(calls).filter(p => p.outlined).map(p => ({ col: p.col, ...partBox(p) })), within = (p, b) => p.x0 >= b.x - 0.01 && p.x1 <= b.x + b.w + 0.01;
    bunks.forEach((b, k) => {
      const at = `${n} bunks, bunk ${k} (${b.x} to ${b.x + b.w} at ${b.y})`;
      const bed = parts.find(p => p.col === '#3a4a5e' && within(p, b) && Math.abs(p.y0 - (b.y - 5)) < 0.01);
      assert.ok(bed && bed.x1 - bed.x0 >= 80, `${at}: a mattress a person long (${bed && bed.x1 - bed.x0})`);
      const sl = berthSleeper(b), head = drawPerson(fakeCtx(), { name: 'bunk', face: 1, frame: 0 }, sl.x, sl.y, { color: '#ffb347' }).head;
      assert.equal(sl.y, b.y - 5, `${at}: the sleeper on the mattress`);
      // in the box (#1024): the mattress's top runs back from its front edge, where the sleeper lies, at every tier
      const top = filledParts(calls).find(p => p.col === box.figShade('#3a4a5e', 1.3) && p.pts.some(q => near(q[0], b.x + 2) && near(q[1], sl.y)) && p.pts.some(q => near(q[0], b.x + b.w - 2) && near(q[1], sl.y)));
      assert.ok(top && Math.max(...top.pts.map(q => q[1])) === sl.y && Math.min(...top.pts.map(q => q[1])) < sl.y - 1, `${at}: the mattress's top behind the sleeper, its front edge at ${sl.y}`);
      const pillow = parts.find(p => p.col === '#9a968a' && within(p, b) && p.y1 <= b.y - 5 + 0.01 && p.y0 >= b.y - 11);
      assert.ok(pillow && head.x >= pillow.x0 && head.x <= pillow.x1, `${at}: the pillow (${JSON.stringify(pillow)}) under the head at ${head.x}`);
      assert.ok(parts.some(p => p.col === '#4a5a6a' && p.x0 >= b.x && p.x1 <= b.x + b.w / 3 && p.y1 <= b.y - 19 && p.y0 >= b.y - 32), `${at}: a reading lamp at the head end, over the sleeper's head`);
      // a fitting (#1024): clamped round the curtain rail (its underside at the bunk's top - 25) over the shade, not standing free
      const shade = parts.find(p => p.col === '#4a5a6a' && p.x0 >= b.x && p.x1 <= b.x + b.w / 3 && p.y0 >= b.y - 32), clamp = parts.find(p => p.col === '#2a3e54' && p.x0 >= b.x && p.x1 <= b.x + b.w / 3 && p.y0 < b.y - 26.6 && p.y1 > b.y - 25);
      assert.ok(clamp && clamp.x0 < (shade.x0 + shade.x1) / 2 && clamp.x1 > (shade.x0 + shade.x1) / 2, `${at}: the reading lamp's clamp round the rail, over its shade (${JSON.stringify(clamp)})`);
      assert.ok(parts.some(p => p.col === '#3a5470' && within(p, b) && p.x1 - p.x0 >= b.w - 6 && p.y1 <= berthKeep(b).y), `${at}: a curtain rail over it, and over its owner's place`);
      const over = bunks.find(t => t.y < b.y && Math.abs(t.x - b.x) < 0.01);
      if (over) assert.ok(over.y + 2.8 <= sl.y - 13 - 4, `${at}: the sleeper (${sl.y - 13}) clear of the bunk over it (${over.y + 2.8})`);
      else assert.ok(b.y - 5 - 13 >= r.top + 20, `${at}: the top tier's sleeper under the ceiling`);
      if (k % 3 === 0) assert.ok(Math.abs(b.y + 2.8 - F) < 1e-9, `${at}: the bottom tier's frame on the deck`);
    });
  }
});
test('the frame stands only as high as its bunks: no column with an empty tier, from 1 to 12 berths (#1023)', () => {
  for (let n = 1; n <= 12; n++) {
    const { r, s, bunks } = berthCase(n, 0.3, 1.45), F = r.floor, { ctx, calls } = recorder(); drawRoom(ctx, 'berths', r, s);
    const posts = filledParts(calls).filter(p => p.col === '#2a4664').map(partBox).filter(p => Math.abs(p.x1 - p.x0 - 4) < 0.01 && Math.abs(p.y1 - F) < 0.01);
    const cols = [...new Set(bunks.map(b => b.x))].map(x => bunks.filter(b => b.x === x)), w = bunks[0].w;
    // a column's own height: to the ceiling when it is three high, else to the brackets of its top bunk's curtain rail
    const height = col => (col.length === 3 ? F - 92 : Math.min(...col.map(b => b.y)) - 27.6);
    cols.forEach(col => assert.ok(col.every((b, i) => col.some(a => Math.abs(a.y - (F - 2.8 - 29.5 * i)) < 1e-9)), `n ${n}: the column at ${col[0].x} filled from the bottom, no tier missing`));
    assert.equal(cols.filter(col => col.length < 3).length, n % 3 ? 1 : 0, `n ${n}: at most one short column`);
    const edges = [...new Set(cols.flatMap(col => [col[0].x, col[0].x + w]).map(x => Math.round(x * 100) / 100))];
    assert.equal(posts.length, edges.length, `n ${n}: a post at each column's ends (${posts.length} for ${edges.length})`);
    for (const ex of edges) {
      const post = posts.find(p => Math.abs((p.x0 + p.x1) / 2 - ex) < 0.01), want = Math.min(...cols.filter(col => Math.abs(col[0].x - ex) < 0.01 || Math.abs(col[0].x + w - ex) < 0.01).map(height));
      assert.ok(post && Math.abs(post.y0 - want) < 0.01, `n ${n}: the post at ${ex} up to ${want} (${post && post.y0})`);
      const bolts = calls.filter(k => k[0] === 'arc' && Math.abs(k[1] - ex) < 0.01 && k[3] === 0.6);
      assert.ok(bolts.length >= 1, `n ${n}: the post at ${ex} bolted`);
      for (const b of bolts) assert.ok(b[2] > post.y0 && b[2] < F, `n ${n}: a bolt at ${b[2]} on the post at ${ex} (${post.y0} to ${F}), not over it`);
    }
  }
});
test('each bunk keeps a clear place for its owner\'s one thing, inside the bunk over the sleeper (#933, #934)', () => {
  for (const n of [4, 8, 12]) for (const pr of [0.02, 0.3, 0.5]) {
    const { r, s, bunks } = berthCase(n, pr, 1.45), { ctx, calls } = recorder(); berthsIn(ctx, r, s);  // in the box, with the solids' faces and shadows (#1024)
    const parts = placedParts(calls).map(p => ({ col: p.col, ...partBox(p) })), rects = calls.filter(k => k[0] === 'fillRect').map(([, x, y, w, h]) => ({ x0: Math.min(x, x + w), x1: Math.max(x, x + w), y0: Math.min(y, y + h), y1: Math.max(y, y + h) }));
    const meet = (a, b) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
    bunks.forEach((b, k) => {
      const kp = berthKeep(b), box = { x0: kp.x, x1: kp.x + kp.w, y0: kp.y, y1: kp.y + kp.h }, at = `${n} bunks, ${pr}, bunk ${k}: the place ${JSON.stringify(kp)}`;
      assert.ok(kp.w >= 12 && kp.h >= 7, `${at}: room for a thing the size of a hand`);
      assert.ok(box.x0 >= b.x + b.w / 2 && box.x1 <= b.x + b.w, `${at}: inside the bunk, at its foot half`);
      assert.ok(box.y1 <= b.y - 5 - 13, `${at}: over the sleeper`);
      const over = bunks.find(t => t.y < b.y && Math.abs(t.x - b.x) < 0.01);
      assert.ok(box.y0 >= (over ? over.y + 2.8 : r.top + 10), `${at}: under the bunk over it or the ceiling`);
      if (k === 2) return;  // the curtain drawn across the third bunk covers its place, as it covers its sleeper
      for (const p of parts) assert.ok(!meet(p, box), `${at}: clear of a ${p.col} part ${JSON.stringify(p)}`);
      for (const q of rects) assert.ok(!meet(q, box), `${at}: clear of a rect ${JSON.stringify(q)}`);
    });
  }
});

// #934, their own things in the bunks: each of the ship's company has their own bunk, k-th of the company in its standing order on bunk k
// (bunkOwners), and keeps two or three things of their own there (bunkKit), each in its place in the plan every bunk has (roomBunkPlan).
const own934 = load(['js/data.js', 'js/util.js', 'js/figures.js', 'js/layouts.js', 'js/camera.js', 'js/rooms.js', 'js/shiplife.js'], { G: {}, Mods: { filter: (n, v) => v, emit() {}, register() {} } }, ['bunkOwners', 'bunkKit', 'BUNK_THINGS', 'BUNK_DRAW', 'bunkSlots']);
const COMPANY = [{ id: 'you', role: 'you' }, { id: 'c:ines', role: 'pilot' }, { id: 'c:tomas', role: 'engineer' }, { id: 'p7', role: 'gunner' }, { id: 'p8', role: 'passenger' },
  { name: 'Mog', role: 'cat' }, { id: 'c:cato', role: 'xo' }, { id: 'p9', role: 'icehand' }, { id: 'hc', role: 'captain' }];
const ownerIds = (people, n) => Array.from(own934.bunkOwners(people, n), p => (p ? p.id : null));
test('a sleeper with no bunk of their own lies in a free one, a spare first, then one whose owner is up; the cat in none (#934)', () => {
  const owners = own934.bunkOwners(COMPANY, 6), up = new Set(['c:ines']), asleep = p => !up.has(p.id);
  const slots = own934.bunkSlots(COMPANY, owners, asleep), at = id => slots.get(COMPANY.find(p => p.id === id));
  assert.equal(at('you'), 0, 'an owner in their own'); assert.equal(at('c:cato'), 5);
  assert.equal(at('c:ines'), undefined, 'up, so no bunk');
  assert.equal(at('p8'), 2, 'the passenger past the bunks, in the bunk whose owner is up');
  assert.equal(at('p9'), undefined, 'no bunk left for the last'); assert.ok(![...slots.keys()].some(p => p.role === 'cat'), 'not the cat');
  assert.equal(new Set(slots.values()).size, slots.size, 'one to a bunk');
  const spare = own934.bunkSlots([...COMPANY, { id: 'p11', role: 'passenger' }], own934.bunkOwners(COMPANY, 10), () => true);
  assert.equal(spare.get([...spare.keys()].find(p => p.id === 'p11')), 8, 'a spare bunk first');
});
test('each of the ship\'s company has their own bunk, the k-th in its standing order bunk k, and the rest are spare (#934)', () => {
  assert.deepEqual(ownerIds(COMPANY, 10), ['you', 'hc', 'c:ines', 'c:tomas', 'p7', 'c:cato', 'p9', 'p8', null, null], 'the hand, the captain, the crew as they signed on, the passengers; not the cat');
  assert.deepEqual(ownerIds(COMPANY, 10), ownerIds([...COMPANY], 10), 'the same list, the same bunks');
  assert.deepEqual(ownerIds([...COMPANY].reverse(), 10).slice(0, 2), ['you', 'hc'], 'the hand and the captain first whatever the order they are kept in');
  assert.deepEqual(ownerIds(COMPANY, 4), ['you', 'hc', 'c:ines', 'c:tomas'], 'as many as there are bunks');
  const left = COMPANY.filter(p => p.id !== 'c:tomas'), joined = [...left, { id: 'p10', role: 'engineer' }];
  assert.deepEqual(ownerIds(left, 10), ['you', 'hc', 'c:ines', 'p7', 'c:cato', 'p9', 'p8', null, null, null], 'one leaves: those after move up a bunk');
  assert.deepEqual(ownerIds(joined, 10), ['you', 'hc', 'c:ines', 'p7', 'c:cato', 'p9', 'p10', 'p8', null, null], 'the next to sign on takes their place in the crew list');
});
const PLACES = ['shelf', 'photos', 'screen', 'keep'], kitThings = k => [...k.shelf, ...k.photos, ...(k.screen ? [k.screen] : []), ...(k.keep ? [k.keep] : [])];
test('everyone\'s bunk has two or three things of their own, a main character\'s from their sheet and anyone else\'s from their post and home (#934)', () => {
  for (const [key, d] of Object.entries(own934.BUNK_THINGS)) {
    const k = own934.bunkKit({ cast: key, id: `c:${key}` }), n = kitThings(k).length;
    assert.ok(n >= 2 && n <= 3, `${key}: two or three things (${n})`);
    for (const at of Object.keys(d)) assert.ok(PLACES.includes(at), `${key}: ${at} is a place in the plan`);
    for (const t of kitThings(k)) assert.equal(typeof own934.BUNK_DRAW[t], 'function', `${key}: ${t} is drawn`);
  }
  assert.deepEqual(kitThings(own934.bunkKit({ captainKey: 'hester', id: 'p1' })), ['tea', 'notebook'], 'a captain with a sheet, by their key: Hester\'s tea and notebook');
  assert.equal(own934.bunkKit({ cast: 'ines', id: 'c:ines' }).keep, 'logbook', 'Ines keeps her logbook');
  for (const role of ['you', 'pilot', 'gunner', 'engineer', 'slicer', 'xo', 'icehand', 'passenger', 'captain', 'cook']) for (const culture of ['earth', 'mars', 'belt', undefined]) for (let i = 0; i < 12; i++) {
    const p = { id: `p${i}`, role, culture }, k = own934.bunkKit(p), at = `${role} ${culture} ${i}`;
    assert.equal(kitThings(k).length, 2, `${at}: two things (${JSON.stringify(k)})`);
    assert.deepEqual(own934.bunkKit({ ...p }), k, `${at}: the same two every time, by the id`);
    for (const t of kitThings(k)) assert.equal(typeof own934.BUNK_DRAW[t], 'function', `${at}: ${t} is drawn`);
  }
  const kits = new Set(Array.from({ length: 20 }, (_, i) => JSON.stringify(kitThings(own934.bunkKit({ id: `p${i}`, role: 'gunner', culture: 'belt' })))));
  assert.ok(kits.size >= 3, `two ratings at the same post and home keep different things (${[...kits]})`);
});
// The berths drawn with the bunks given (s.bunks), the 10 of the Ice Hauler; the calls a bunk's owner adds, against it spare.
const ownCase = bunks => { const c = berthCase(10, 0.3, 1.17); return { ...c, s: { ...c.s, bunks, asleep: bunks.filter(q => q && q.slept).length } }; };
const callKey = k => JSON.stringify(k.map(v => (typeof v === 'number' ? Math.round(v * 1000) / 1000 : v)));
const extraCalls = (a, b) => { const left = new Map(); for (const k of b) left.set(callKey(k), (left.get(callKey(k)) || 0) + 1); return a.filter(k => { const q = callKey(k), m = left.get(q) || 0; if (m) { left.set(q, m - 1); return false; } return true; }); };
const callPts = k => (k[0] === 'fillRect' ? [[k[1], k[2]], [k[1] + k[3], k[2] + k[4]]] : /^(moveTo|lineTo|arc)$/.test(k[0]) ? [[k[1], k[2]]] : k[0] === 'quadraticCurveTo' ? [[k[1], k[2]], [k[3], k[4]]] : []);
const drawBerths = s => { const { ctx, calls } = recorder(); drawRoom(ctx, 'berths', berthCase(10, 0.3, 1.17).r, s); return calls; };
test('each one\'s things are drawn in their own bunk and nowhere else, and a spare bunk is bare (#934)', () => {
  const kits = [{ cast: 'ines', id: 'c:ines' }, { cast: 'tomas', id: 'c:tomas' }, { cast: 'yelena', id: 'c:yelena' }, { captainKey: 'hester', id: 'p1' }, { id: 'p7', role: 'gunner', culture: 'mars' }].map(own934.bunkKit);
  const spare = drawBerths(ownCase(Array(10).fill(null)).s);
  assert.equal(spare.length, drawBerths({ ...berthCase(10, 0.3, 1.17).s, asleep: 0 }).length, 'with every bunk spare the berths are drawn as with none given');
  for (const kit of kits) for (const k of [0, 1, 3, 9]) for (const slept of [false, true]) {
    const bunks = Array(10).fill(null); bunks[k] = { slept, ...kit };
    const { s, bunks: bs } = ownCase(bunks), b = bs[k], extra = extraCalls(drawBerths(s), drawBerths({ ...s, bunks: bunks.map((q, i) => (i === k ? null : q)), asleep: 0 }));
    const at = `${kitThings(kit)} in bunk ${k}${slept ? ', asleep' : ''}`;
    assert.ok(extra.length > 10, `${at}: drawn (${extra.length} calls)`);
    for (const c of extra) for (const [px, py] of callPts(c)) assert.ok(px >= b.x && px <= b.x + b.w && py >= b.y - 27 && py <= b.y + 3, `${at}: ${callKey(c)} inside the bunk (${b.x} to ${b.x + b.w}, ${b.y - 27} to ${b.y + 3})`);
  }
});
test('every bunk has the same plan: the shelf on its brackets, the screen at the foot, the end rail, and a towel over it when someone sleeps there (#934)', () => {
  const kit = own934.bunkKit({ cast: 'yelena', id: 'c:yelena' }), bunks = Array.from({ length: 10 }, (_, k) => (k < 6 ? { slept: k % 2 === 0, ...kit } : null));
  const { s, bunks: bs } = ownCase(bunks), { ctx, calls } = recorder(); drawRoom(ctx, 'berths', berthCase(10, 0.3, 1.17).r, s);
  const parts = filledParts(calls).filter(p => p.outlined).map(p => ({ col: p.col, ...partBox(p) })), rects = calls.filter(k => k[0] === 'fillRect' || k[0] === 'fillStyle');
  const flats = []; let col = null; for (const k of rects) if (k[0] === 'fillStyle') col = k[1]; else flats.push({ col, x0: k[1], y0: k[2], x1: k[1] + k[3], y1: k[2] + k[4] });
  bs.forEach((b, k) => {
    const at = `bunk ${k}${bunks[k] ? '' : ', spare'}`, inside = p => p.x0 >= b.x && p.x1 <= b.x + b.w && p.y0 >= b.y - 27 && p.y1 <= b.y + 3;
    const shelf = parts.find(p => p.col === '#5a7690' && inside(p));
    assert.ok(shelf && shelf.x0 < b.x + 30 && shelf.y0 >= b.y - 26.6 + 1.6 && shelf.y1 <= b.y - 18, `${at}: a small shelf at the head end, under the rail and over the sleeper (${JSON.stringify(shelf)})`);
    const glass = flats.find(p => p.col === '#03121c' && inside(p)), bezel = flats.find(p => p.col === '#1b2f45' && inside(p));
    assert.ok(glass && bezel && glass.x0 > b.x + b.w - 20 && glass.y1 <= b.y - 18, `${at}: the screen flush on the back wall at the foot end`);
    assert.ok(parts.some(p => p.col === '#3a5470' && inside(p) && p.x0 > b.x + b.w - 10 && p.y0 > b.y - 9), `${at}: the end rail`);
    const towel = parts.find(p => p.col === kit.towel && inside(p) && p.x0 > b.x + b.w - 10);
    if (bunks[k]) assert.ok(towel && towel.y1 > b.y - 2, `${at}: a towel over the end rail, hanging down`);
    else assert.ok(!parts.some(p => inside(p) && /^#(7a2a3a|9a6040|a09a8a)$/.test(p.col)), `${at}: bare, nothing pinned or on the shelf`);
    if (bunks[k]) {
      assert.ok(parts.some(p => p.col === '#7a2a3a' && inside(p) && p.y0 >= b.y - 25 && p.y1 <= b.y - 19), `${at}: the pennant pinned in the row at the eye of someone lying down`);
      assert.ok(parts.some(p => p.col === '#9a6040' && inside(p) && Math.abs(p.y1 - shelf.y0) < 0.01 && p.x0 >= shelf.x0 && p.x1 <= shelf.x1), `${at}: the ball standing on the shelf`);
    }
  });
});
test('the things in the bunks keep inside the props\' brightness, leave every save restored and write no text (#934)', () => {
  const people = [...Object.keys(own934.BUNK_THINGS).map(key => ({ cast: key, id: key })), ...['pilot', 'gunner', 'engineer', 'slicer', 'icehand', 'passenger'].flatMap(role => ['earth', 'mars', 'belt'].map((culture, i) => ({ id: `p${i}${role}`, role, culture })))];
  for (let i = 0; i < people.length; i += 10) for (const slept of [false, true]) {
    const bunks = Array.from({ length: 10 }, (_, k) => (people[i + k] ? { slept, ...own934.bunkKit(people[i + k]) } : null)), { s } = ownCase(bunks), at = `from ${i}${slept ? ', asleep' : ''}`;
    const c = fakeCtx(); drawRoom(c, 'berths', berthCase(10, 0.3, 1.17).r, s); assert.equal(c.depth, 0, `${at}: every save restored`);
    assert.ok(c.fonts.every(f => Number(/(\d+(?:\.\d+)?)px/.exec(f)[1]) >= 12), `${at}: nothing written under 12 px (the sleepers' z only)`);
    assert.ok(c.calls.filter(k => k === 'fillText').length <= 1, `${at}: no words but the z`);
    const { ctx, calls } = recorder(); drawRoom(ctx, 'berths', berthCase(10, 0.3, 1.17).r, s);
    for (const { col } of filledParts(calls).filter(p => p.outlined && rgbOf(p.col))) {
      const v = rgbOf(col); assert.ok(Math.max(...v) <= 0xb0 && Math.max(...v) - Math.min(...v) <= 0x60, `${at}: ${col} brighter or more saturated than the props may be`);
    }
    for (const k of calls.filter(q => q[0] === 'fillStyle' && /^#[0-9a-f]{6}$/.test(q[1]) && q[1] !== '#9fb4c9')) assert.ok(Math.max(...rgbOf(k[1])) <= 0xb0, `${at}: ${k[1]} brighter than the props may be`);
  }
});
test('after a crew change the leaver\'s things are gone from the berths and the newcomer\'s are in their bunk (#934)', () => {
  const recs = { you: { id: 'you', role: 'gunner', culture: 'earth' }, hc: { captainKey: 'hester', id: 'hc', role: 'captain' }, 'c:ines': { cast: 'ines', id: 'c:ines', role: 'pilot' }, 'c:tomas': { cast: 'tomas', id: 'c:tomas', role: 'engineer' },
    'c:cato': { cast: 'cato', id: 'c:cato', role: 'xo' }, 'c:yelena': { cast: 'yelena', id: 'c:yelena', role: 'gunner' } };
  const bunksOf = people => own934.bunkOwners(people, 10).map(p => p && { slept: false, ...own934.bunkKit(recs[p.id]) });
  const before = ['you', 'hc', 'c:ines', 'c:tomas', 'c:cato'].map(id => ({ id, role: recs[id].role })), after = [...before.filter(p => p.id !== 'c:tomas'), { id: 'c:yelena', role: 'gunner' }];
  const a = bunksOf(before), b = bunksOf(after), has = (bunks, what) => bunks.some(q => q && kitThings(q).includes(what));
  assert.ok(has(a, 'tools') && has(a, 'flask') && !has(a, 'pennant'), 'Tomas\'s tools and flask before');
  assert.ok(!has(b, 'tools') && !has(b, 'flask') && has(b, 'pennant'), 'gone after he leaves, and Yelena\'s pennant with her');
  assert.equal(b.findIndex(q => q && q.photos.includes('pennant')), 4, 'in her own bunk, the next in the list');
  const calls = drawBerths(ownCase(b).s), red = calls.filter(k => k[0] === 'fillStyle' && k[1] === '#7a2a3a').length;
  assert.equal(red, 1, 'her pennant drawn once, in the berths');
});

// The crew's corner beside the well: the wall unit, the pinboard where it fits, the towel and the guitar, spread across the open wall, clear of
// the well and the bunks, each part outlined and a step below the people.
const CORNER_PROPS = [['#22405c', 'the wall unit\'s sides'], ['#284a68', 'its two shelves'], ['#2c4c6e', 'their lips'], ['#7d8a98', 'the mug'], ['#5e4434', 'the plant\'s pot'],
  ['#3a2c20', 'the photo\'s frame'], ['#4a5a6a', 'the reading lamp'], ['#9a6c40', 'the guitar\'s top'], ['#5a3a20', 'its side, in shade'], ['#4a2e1c', 'its pickguard'], ['#3a2414', 'its bridge'],
  ['#3a2618', 'its headstock'], ['#3a3a40', 'its lashings']].map(([col, what]) => [wallTone(col), what]);  // on the back wall, a step darker (#1024)
test('the crew\'s corner fills the open wall beside the well: a wall unit, a pinboard, the towel and a guitar, clear of the bunks (#933)', () => {
  for (const [n, board] of [[4, true], [8, true], [9, true], [10, false], [12, false]]) for (const pr of [0.02, 0.3, 0.5]) {
    const { r, s, well, bunks } = berthCase(n, pr, 0.82), c = berthCorner(r, n, well), X = sh => r.x0 + (r.x1 - r.x0) * sh, at = `${n} bunks, ${pr}`;
    assert.ok(c.x0 >= well.x1 + 6 && bunks.every(b => b.x + b.w <= well.x0 || b.x >= c.x1 + 4), `${at}: the corner ${JSON.stringify(c)} between the well and the bunks`);
    const { ctx, calls } = recorder(); berthsIn(ctx, r, s);
    const parts = filledParts(calls).filter(p => p.outlined).map(p => ({ col: p.col, ...partBox(p) })), mine = parts.filter(p => p.x0 >= c.x0 - 1 && p.x1 <= c.x1 + 2);
    // on the back wall (#1024): each thing moved onto it lands between its edge by the shaft and the first column right of it, as far as that
    // column shows (its side and back posts, when it stands right of the eye), and the towel clear of the wall unit
    const bay = berthBays(r, well)[1], e = box.roomEye(bay), wx0 = box.roomInto(e, bay.x0, r.floor)[0], cx = Math.min(...bunks.filter(b => b.x >= well.x1).map(b => b.x));
    const wx1 = (cx > e.vx ? box.roomInto(e, cx, r.floor, 0.6)[0] : cx) - 2, placed = placedParts(calls).filter(p => p.at[0] || p.at[1]).map(p => ({ col: p.col, ...partBox(p) }));
    const onWall = placed.filter(p => p.x1 - p.x0 < 100 && p.x0 > well.x1 && p.x1 < cx);  // the things in the corner, not the wall's own fills
    assert.ok(onWall.length >= 20, `${at}: the corner's things moved onto the wall (${onWall.length})`);
    for (const p of onWall) assert.ok(p.x0 >= wx0 && p.x1 <= wx1, `${at}: a ${p.col} part (${p.x0} to ${p.x1}) on the wall between ${wx0} and ${wx1}`);
    const towel = onWall.find(p => p.col === wallTone('#8a4a40')), unit = onWall.filter(p => p.col === wallTone('#22405c'));
    assert.ok(towel && unit.length && unit.every(u => u.x1 < towel.x0), `${at}: the towel (${towel && towel.x0}) clear of the wall unit (${Math.max(...unit.map(u => u.x1))})`);
    for (const [col, what] of CORNER_PROPS) assert.ok(mine.some(p => p.col === col), `${at}: ${what} (${col}) in the corner`);
    assert.ok(calls.some(k => k[0] === 'translate' && k[1] > c.x0 && k[1] < c.x1), `${at}: the towel swinging in the corner (its path at the origin, moved)`);
    assert.ok(mine.filter(p => p.y1 <= r.floor - 58 && p.y0 >= r.floor - 72 && p.x1 - p.x0 <= 9).length >= 7, `${at}: books of many heights on the lower shelf`);
    for (const { col } of mine.filter(p => rgbOf(p.col))) {
      const v = rgbOf(col);
      assert.ok(Math.max(...v) <= 0xb0 && Math.max(...v) - Math.min(...v) <= 0x60, `${at}: ${col} is near-white or saturated`);
    }
    const guitar = parts.filter(p => [wallTone('#9a6c40'), wallTone('#3a2618')].includes(p.col)), gy0 = Math.min(...guitar.map(p => p.y0)), gy1 = Math.max(...guitar.map(p => p.y1)), body = parts.find(p => p.col === wallTone('#9a6c40'));
    assert.ok(gy1 - gy0 >= 45 && gy1 - gy0 <= 55 && body.x1 - body.x0 >= 14 && body.x1 - body.x0 <= 20, `${at}: a person's guitar, about 50 tall against a person's 89 (${gy1 - gy0} tall, its body ${body.x1 - body.x0} wide)`);
    assert.ok(calls.filter(k => k[0] === 'strokeStyle' && k[1] === 'rgba(214,206,190,0.75)').length >= 1 && calls.some(k => k[0] === 'arc' && Math.abs(k[3] - 5.4 * 0.62) < 0.01), `${at}: its strings and the rosette`);
    const notes = mine.filter(p => ['#9a9480', '#8a9478', '#a09a8c'].map(wallTone).includes(p.col));
    assert.equal(notes.length >= 4, board, `${at}: the pinboard with its notes and photos where it fits (${notes.length})`);
    if (board) assert.ok(mine.some(p => p.col === wallTone('#7a6446')), `${at}: the cork`);
  }
  const stillAt = t => { const { r, s } = berthCase(10, 0.5, 1.17), c = fakeCtx(); drawRoom(c, 'berths', r, { ...s, still: true, time: t }); return c.args.join('|'); };
  assert.equal(stillAt(1.3), stillAt(4.9), 'the same frame at any time under reduced motion');
});
test('the wall unit\'s shelves stand on brackets screwed to the back wall (#1024, look.md rule 5)', () => {
  for (const n of [4, 12]) {
    const { r, s, well } = berthCase(n, 0.3, 1.17), c = berthCorner(r, n, well), x = c.x0 + 2, F = r.floor, { ctx, calls } = recorder(); berthsIn(ctx, r, s);
    const placed = placedParts(calls), raw = p => p.pts.map(q => [q[0] - p.at[0], q[1] - p.at[1]]), bx = p => partBox({ pts: raw(p) });
    const shelf = placed.find(p => p.col === wallTone('#284a68'));
    for (const sy of [F - 80, F - 58]) {
      const br = placed.filter(p => p.col === wallTone('#2a3e54') && Math.abs(bx(p).y0 - (sy + 3)) < 0.01 && bx(p).x0 >= x && bx(p).x1 <= x + 62);
      assert.ok(br.length >= 4, `${n} bunks: two brackets (plate and gusset) under the shelf at ${sy} (${br.length} parts)`);
      for (const b of br) assert.ok(b.at[0] === shelf.at[0] && b.at[1] === shelf.at[1] && (b.at[0] || b.at[1]), `${n} bunks: a bracket moved onto the wall with its shelf`);
      assert.ok(new Set(br.map(b => Math.round(bx(b).x0))).size >= 2 && br.some(b => bx(b).x0 < x + 31) && br.some(b => bx(b).x0 > x + 31), `${n} bunks: one toward each end of the shelf`);
    }
  }
});
test('each bunk column\'s end toward the eye is one frame in depth: its back post joined to the front one, none standing free (#1024)', () => {
  for (const n of [4, 8, 12]) {
    const { r, s, well, bunks } = berthCase(n, 0.3, 1.17), F = r.floor, { ctx, calls } = recorder(); berthsIn(ctx, r, s);
    const parts = filledParts(calls).map(p => ({ col: p.col, pts: p.pts, ...partBox(p) })), back = box.figShade('#2a4664', 0.72);
    const posts = parts.filter(p => p.col === back && Math.abs(p.x1 - p.x0 - 4) < 0.02), rails = parts.filter(p => p.col === back && !posts.includes(p));
    const cols = [...new Set(bunks.map(b => b.x))], bays = berthBays(r, well), w = bunks[0].w;
    const ends = cols.map(x => { const bay = bays.find(q => x >= q.x0 && x <= q.x1), e = box.roomEye(bay); return x + w < e.vx ? [x + w, e] : x > e.vx ? [x, e] : null; }).filter(Boolean);
    assert.equal(posts.length, new Set(ends.map(([px]) => Math.round(px * 100))).size, `n ${n}: a back post at each column end toward the eye, none for a column across the eye`);
    for (const p of posts) {
      const mid = (p.x0 + p.x1) / 2, [px, e] = ends.find(([q, e]) => Math.abs(box.roomInto(e, q, F, 0.6)[0] - mid) < 0.02) || [];
      assert.ok(px !== undefined, `n ${n}: the back post at ${mid} behind a front post`);
      assert.ok(rails.some(q => q.pts.some(t => Math.abs(t[0] - px) < 0.02) && q.pts.some(t => Math.abs(t[0] - mid) < 0.02 && Math.abs(t[1] - p.y0) < 0.02) && q.y1 - q.y0 < 12),
        `n ${n}: the back post at ${mid} joined to the front post at ${px} by a rail at its top`);
      const side = box.figShade('#1f3a56', 0.62), tiers = bunks.filter(b => Math.abs(b.x - px) < 0.02 || Math.abs(b.x + w - px) < 0.02);
      for (const b of tiers) assert.ok(parts.some(q => q.col === side && q.pts.some(t => Math.abs(t[0] - px) < 0.02 && Math.abs(t[1] - b.y) < 0.02) && q.pts.some(t => Math.abs(t[0] - mid) < 0.02)), `n ${n}: the tier at ${b.y} joins them by its frame's side`);
    }
  }
});
test('the bridge\'s and the berths\' ceiling lamps are fittings: a plate on the ceiling\'s sliver, the housing, the lit lens and its guard (#1024)', () => {
  for (const id of ['bridge', 'berths']) for (const pr of [0.02, 0.3, 0.5]) {
    const r = layoutBox(LAYOUTS.freighter, id), W = r.x1 - r.x0, { ctx, calls } = recorder();
    drawRoom(ctx, id, r, RS({ w: phaseWeights(pr), well: FW, berths: 8, damage: { marks: new Set(), severe: false } }));
    const parts = filledParts(calls), lamps = box.roomLamps(id, r);
    assert.equal(lamps.length, 2, `${id}: a lamp in each bay`);
    for (const x of lamps) {
      assert.equal(box.roomBays(r, FW).filter(q => x - 12 >= q.x0 && x + 12 <= q.x1).length, 1, `${id}: the lamp at ${x} inside one bay, lighting it`);
      const bay = box.roomBays(r, FW).find(q => x >= q.x0 && x <= q.x1), e = box.roomEye(bay), back = r.top + (bay.floor - 80 - r.top) * 0.2;
      assert.ok(parts.some(p => p.pts.some(q => near(q[0], x - 12) && near(q[1], r.top)) && p.pts.some(q => near(q[1], back) && near(q[0], box.roomInto(e, x + 9, r.top)[0]))), `${id} ${pr}: the lamp at ${x}: its plate on the sliver, from the cut to the wall`);
      assert.ok(parts.some(p => p.col === '#3a4a5a' && p.outlined && near(Math.min(...p.pts.map(q => q[0])), x - 12) && near(Math.min(...p.pts.map(q => q[1])), r.top)), `${id} ${pr}: its housing hung from the ceiling`);
      assert.ok(calls.some(k => k[0] === 'strokeRect' && near(k[1], x - 10.5) && near(k[2], r.top + 3)), `${id} ${pr}: the guard over its lens`);
      assert.ok(calls.some((k, i) => k[0] === 'fillRect' && near(k[1], x - 10) && near(k[2], r.top + 3) && String(calls[i - 1][1]).startsWith('rgba(')), `${id} ${pr}: its lens lit in the lamp's colour`);
    }
  }
  const gr = layoutBox(LAYOUTS.freighter, 'galley'), { ctx, calls } = recorder(); drawRoom(ctx, 'galley', gr, RS({ well: FW, damage: { marks: new Set(), severe: false } }));
  for (const x of box.roomLamps('galley', gr)) assert.ok(calls.some(k => k[0] === 'strokeRect' && near(k[1], x - 10.5) && k[3] === 21), 'the galley\'s lamp a fitting over the mess table too (#932)');
  // on the bridge, no fitting over the overhead panel or the COMMS label; the lamp's light drawn from where its fitting is
  const r = layoutBox(LAYOUTS.freighter, 'bridge');
  for (const zoom of [0.82, 1.17, 1.45]) {
    const { ctx: c, calls: k } = recorder(); drawRoom(c, 'bridge', r, RS({ zoom, well: FW, damage: { marks: new Set(), severe: false } }));
    const panel = partBox(filledParts(k).find(p => p.col === '#1d3550'));
    const label = k.map((q, i) => q[0] === 'fillStyle' && q[1] === 'rgba(6,13,22,0.85)' && k[i + 1][0] === 'fillRect' ? k[i + 1] : null).find(Boolean);
    for (const x of box.roomLamps('bridge', r)) {
      assert.ok(x + 12 <= panel.x0 || x - 12 >= panel.x1, `${zoom}: the fitting at ${x} (to 12 either side) clear of the overhead panel (${panel.x0} to ${panel.x1})`);
      assert.ok(x + 12 <= label[1] || x - 12 >= label[1] + label[3], `${zoom}: the fitting at ${x} clear of the COMMS label (${label[1]} to ${label[1] + label[3]})`);
    }
  }
  const lights = recorder(); lights.ctx.createRadialGradient = (...a) => { lights.calls.push(['createRadialGradient', ...a]); return { addColorStop() {} }; };
  drawPhaseLight(lights.ctx, r, phaseWeights(0.3), 3, 0, true, box.roomBays(r, FW), box.roomLamps('bridge', r));
  const glow = [...new Set(lights.calls.filter(q => q[0] === 'createRadialGradient').map(q => q[1]))], guards = lights.calls.filter(q => q[0] === 'strokeRect' && q[3] === 21).map(q => q[1] + 10.5);
  assert.deepEqual(glow.map(Math.round), Array.from(box.roomLamps('bridge', r), Math.round), 'each lamp\'s light from where its fitting is'); assert.deepEqual(guards.map(Math.round), glow.map(Math.round), 'and its fitting there');
});
test('someone eating alone sits on the edge of the first bunk (#933)', () => {
  const api = load(['js/data.js', 'js/util.js', 'js/figures.js', 'js/layouts.js', 'js/camera.js', 'js/rooms.js', 'js/shiplife.js'], { G: {}, Mods: { filter: (n, v) => v, emit() {}, register() {} } }, ['routineTarget', 'roomAt', 'posture']);
  const ra = api.roomAt('berths'), x = api.routineTarget({}, { at: 'alone' }, ra, 0, 1, () => 0.5), { r, well } = berthCase(10, 0.3, 1), b = berthBunk(r, 10, 0, well);
  const wx = r.x0 + (x - ra.x0) / ra.w * (r.x1 - r.x0);
  assert.ok(wx > b.x + 4 && wx < b.x + b.w / 2, `at ${wx}, on the first bunk (${b.x} to ${b.x + b.w})`);
  // on its edge at the mattress's height (#1023): the bottom bunk's mattress is low, so they sit lower than on the bench (its seat at 23) by the
  // difference, the knees up and the feet on the deck, facing you or side-on
  const p = { role: 'xo', at: 'alone', room: 'berths', x, dk: ra.deck, tdk: ra.deck, tx: null, block: 'meal', face: 1 }, mat = r.floor - berthSleeper(b).y;
  const seated = api.posture(p, 'move', 0, false);
  assert.equal(seated.name, 'sit', 'sitting'); assert.equal(seated.view, 'front', 'facing you'); assert.ok(Math.abs(seated.seat - mat) < 1e-9, `on the mattress, ${mat} over the deck (${seated.seat})`);
  for (const view of ['front', 'side']) {
    const pose = { ...seated, view }, ph = view;
    const low = drawPerson(fakeCtx(), pose, 0, 100, { color: '#ffb347' }), bench = drawPerson(fakeCtx(), { ...pose, seat: undefined }, 0, 100, { color: '#ffb347' });
    assert.ok(Math.abs(low.head.y - bench.head.y - (23 - mat)) < 0.01, `${ph} (${pose.view}): the head ${low.head.y - bench.head.y} lower than on the bench, by ${23 - mat}`);
    assert.ok(low.foot.y <= 100 && low.foot.y >= 94, `${ph}: the feet on the deck (${low.foot.y})`);
  }
});

// #933, the medbay on the lock deck: the cot with its rails, straps, legs on braked casters, mattress and pillow; the IV pole bolted to the deck,
// its bag swinging and its line to the cot; the scanner arm from the ceiling over the cot; the monitor at eye height; the supply cabinet at the
// counter, down from white; the first-aid box on the wall under the room's name. Drawn at the burn view's zoom in a window 1000, 1280 and 1600 wide.
const { MED_COT } = load(['js/data.js', 'js/util.js', 'js/figures.js', 'js/layouts.js', 'js/camera.js', 'js/rooms.js'], { G: {}, Mods: { filter: (n, v) => v, emit() {}, register() {} } }, ['MED_COT']);
const MED_PROPS = [['#2a4664', 'the cot\'s frame'], ['#1c3249', 'its legs'], ['#1a2430', 'its casters'], ['#2e4a68', 'its head and foot boards'], ['#3a5470', 'its rail'], ['#56667a', 'the mattress'],
  ['#9a968a', 'the pillow'], ['#4a4436', 'the straps'], ['#4a5e74', 'the IV pole'], ['#6a8494', 'the IV bag'], ['#6a6a66', 'the scanner arm'], ['#7a7870', 'the scanner\'s head'], [wallTone('#1f3a56'), 'the monitor, on the wall'],
  ['#4e5e6e', 'the cabinet'], ['#64748a', 'its doors'], ['#6e7e8e', 'its top'], ['#8e3a32', 'the red crosses'], ['#4e6a78', 'the bottles'], ['#7a8692', 'the kit'], [wallTone('#5a6876'), 'the first-aid box, on the wall'],
  [wallTone('#3a5470'), 'the grab rail, on the wall'], [wallTone('#7a7462'), 'the tape on the monitor\'s bezel']];
// The medbay's and the hold's solids (#1024): a solid's top a step lighter, but never brighter or more saturated than the people (#959), as the
// helper draws it; its side a step darker; its contact shadow on the strip.
const solidTop = col => { const v = rgbOf(col), mx = Math.max(...v), mn = Math.min(...v); return box.figShade(col, Math.min(1.3, 0xb0 / mx, 0x60 / (mx - mn || 1))); };
const solidSide = col => box.figShade(col, 0.62), SHADOW = 'rgba(2,5,9,0.5)';
// Every point the room drew where it lands on the screen (the moves it was drawn under applied), apart from its walls and its lamps' light: what
// roomOwn reads, placed, so a thing moved onto the back wall is checked where it is drawn.
const placedOps = calls => {
  const out = [], stack = []; let dx = 0, dy = 0;
  for (const [k, ...a] of calls) {
    if (k === 'save') stack.push([dx, dy]); else if (k === 'restore') [dx, dy] = stack.pop(); else if (k === 'translate') { dx += a[0]; dy += a[1]; }
    else if (k === 'fillRect') out.push({ k, v: a, pts: [[a[0], a[1]], [a[0] + a[2], a[1]], [a[0], a[1] + a[3]], [a[0] + a[2], a[1] + a[3]], [a[0] + a[2] / 2, a[1] + a[3] / 2]].map(([x, y]) => [x + dx, y + dy]) });
    else if (k === 'moveTo' || k === 'lineTo') out.push({ k, v: a, pts: [[a[0] + dx, a[1] + dy]] }); else if (k === 'quadraticCurveTo') out.push({ k, v: a, pts: [[a[2] + dx, a[3] + dy]] });
  }
  return out;
};
const roomOwnPlaced = (id, r, s) => {
  const all = recorder(); drawRoom(all.ctx, id, r, s);
  const base = recorder(); roomWalls(base.ctx, r, s.w, s.time, s.still, s.well); drawPhaseLight(base.ctx, r, s.w, s.time, s.night, true);
  const key = o => o.k + o.pts.map(q => q.map(v => Math.round(v * 1000) / 1000).join()).join(), left = placedOps(all.calls);
  for (const o of placedOps(base.calls)) { const i = left.findIndex(q => key(q) === key(o)); if (i >= 0) left.splice(i, 1); }
  return left;
};
// The back wall of a one-bay room: where roomOnWall puts a thing.
const backWall = r => { const e = box.roomEye(r), [x0, y0] = box.roomInto(e, r.x0, r.top), [x1, y1] = box.roomInto(e, r.x1, r.floor); return { x0, y0, x1, y1, e }; };
const MED_LINE = 'rgba(150,178,196,0.7)';
const medCase = (pr, zoom, patient) => ({ r: layoutBox(LAYOUTS.freighter, 'medbay'), s: RS({ w: phaseWeights(pr), zoom, patient, damage: { marks: new Set(), severe: false } }) });
test('the medbay is drawn to the figures\' standard in every phase: its props outlined and a step below the people, the name on clear wall (#933)', () => {
  for (const patient of [false, true]) for (const pr of [0.02, 0.3, 0.45, 0.5]) for (const zoom of [0.82, 1.17, 1.45]) {
    const { r, s } = medCase(pr, zoom, patient), at = `${patient ? 'a patient' : 'empty'}, ${pr}, ${zoom}`;
    const c = fakeCtx(); drawRoom(c, 'medbay', r, s); assert.equal(c.depth, 0, `${at}: every save restored`);
    for (const f of c.fonts) assert.ok(Number(/(\d+(?:\.\d+)?)px/.exec(f)[1]) >= 12, `${at}: ${f}`);
    const { ctx, calls } = recorder(); drawRoom(ctx, 'medbay', r, s);
    const fills = col => calls.filter(k => k[0] === 'fillStyle' && k[1] === col).length;
    for (const [col, what] of MED_PROPS) assert.ok(fills(col) >= 1, `${at}: ${what} (${col})`);
    for (const col of ['#1f3a56', '#5a6876', '#7a7462']) assert.equal(fills(col), 0, `${at}: nothing on the wall in its own colour (${col})`);
    // in the box (#1024): the cot, its boards, the mattress, the cabinet and its top solid, their tops showing (the IV pole has no faces); the
    // cabinet's side toward the eye; a shadow under the cot, the pole's foot and the cabinet
    for (const [col, what] of [['#2a4664', 'the cot\'s frame'], ['#2e4a68', 'its boards'], ['#56667a', 'the mattress'], ['#4e5e6e', 'the cabinet'], ['#6e7e8e', 'its top']]) assert.ok(fills(solidTop(col)) >= 1, `${at}: ${what} solid, its top showing`);
    for (const [col, what] of [['#4e5e6e', 'the cabinet'], ['#2e4a68', 'the cot\'s head board']]) assert.ok(fills(solidSide(col)) >= 1, `${at}: ${what}'s side toward the eye`);
    assert.ok(fills(SHADOW) >= 3, `${at}: contact shadows on the strip (${fills(SHADOW)})`);
    const outlined = filledParts(calls).filter(p => p.outlined);
    assert.ok(outlined.length >= 30, `${at}: the props outlined like the figures (${outlined.length})`);
    for (const { col } of outlined.filter(p => rgbOf(p.col))) {
      const v = rgbOf(col);
      assert.ok(Math.max(...v) <= 0xb0 && Math.max(...v) - Math.min(...v) <= 0x60, `${at}: ${col} is near-white or saturated, brighter than the people`);
    }
    for (const col of ['#dde4ea', '#eef2f6', '#c9d3dc', '#d8dde4', '#c03a30', '#1a1a1a', '#8aa4c0']) assert.equal(fills(col), 0, `${at}: no near-white, saturated or black block (${col})`);
    assert.ok(calls.some(k => k[0] === 'strokeStyle' && k[1] === (patient ? '#ffb030' : '#7fd8a0')), `${at}: the monitor's trace, amber with a patient`);
    // the room's name (shiplife.js: 13px on a plate at its top left) on clear wall, where each thing is drawn (the wall's things moved onto it)
    const name = { x0: r.x0, x1: r.x0 + 12 + 60 / zoom, y0: r.top + 8 - 1 / zoom, y1: r.top + 8 + 17 / zoom }, hit = (b, x, y) => x > b.x0 && x < b.x1 && y > b.y0 && y < b.y1;
    for (const { k, v, pts } of roomOwnPlaced('medbay', r, s)) for (const [x, y] of pts) assert.ok(!hit(name, x, y), `${at}: ${k} ${v} at ${x}, ${y} under the room's name`);
  }
  const stillAt = t => { const { r, s } = medCase(0.5, 1.17, true), c = fakeCtx(); drawRoom(c, 'medbay', r, { ...s, still: true, time: t }); return c.args.join('|'); };
  assert.equal(stillAt(1.3), stillAt(4.9), 'the same frame at any time under reduced motion');
});
test('the medbay\'s props are sized to a person: the cot\'s mattress under the patient, the IV at head height, the monitor at the eye, the cabinet at the counter (#933)', () => {
  const api = load(['js/data.js', 'js/util.js', 'js/figures.js', 'js/layouts.js', 'js/camera.js', 'js/rooms.js', 'js/shiplife.js'], { G: {}, Mods: { filter: (n, v) => v, emit() {}, register() {} } }, ['routineTarget', 'roomAt']);
  const ra = api.roomAt('medbay'), { r } = medCase(0.3, 1.45, true), F = r.floor, W = r.x1 - r.x0, X = sh => r.x0 + W * sh;
  const bed = api.routineTarget({}, { at: 'bed' }, ra, 0, 1, () => 0.5), bx = r.x0 + (bed - ra.x0) / ra.w * W, head = drawPerson(fakeCtx(), { name: 'bunk', face: 1, frame: 0 }, bx, F - MED_COT, { color: '#ffb347' }).head;
  assert.ok(MED_COT >= 28 && MED_COT <= 32, `the patient lies at about 30, between the knee and the hip (${MED_COT})`);
  for (const pr of [0.02, 0.3, 0.5]) {
    const { s } = medCase(pr, 1.45, true), { ctx, calls } = recorder(); drawRoom(ctx, 'medbay', r, s);
    const parts = filledParts(calls).filter(p => p.outlined).map(p => ({ col: p.col, ...partBox(p) })), at = `${pr}`;
    const bedPart = parts.find(p => p.col === '#56667a');
    assert.ok(bedPart && Math.abs(bedPart.y0 - (F - MED_COT)) < 0.01, `${at}: the mattress's top at the patient (${bedPart && F - bedPart.y0})`);
    const frame = parts.find(p => p.col === '#2a4664'), lying = drawPerson(fakeCtx(), { name: 'bunk', face: 1, frame: 0 }, bx, F - MED_COT, { color: '#ffb347' });
    assert.ok(frame.x1 - frame.x0 >= 105 && frame.x1 - frame.x0 <= 110 && frame.y1 - frame.y0 <= 4, `${at}: the cot a person long with a little to spare (${frame.x1 - frame.x0} long, its frame ${frame.y1 - frame.y0} deep)`);
    assert.ok(bedPart.x0 < head.x - 8 && bedPart.x1 > lying.foot.x + 4, `${at}: the mattress (${bedPart.x0} to ${bedPart.x1}) under the whole patient (${head.x} to ${lying.foot.x})`);
    // in the box (#1024): the mattress's top runs back from its front edge, where the patient lies, under the whole of them
    const bedTop = filledParts(calls).find(p => p.col === solidTop('#56667a') && p.pts.some(q => near(q[0], bedPart.x0) && near(q[1], F - MED_COT)) && p.pts.some(q => near(q[0], bedPart.x1) && near(q[1], F - MED_COT)));
    assert.ok(bedTop && Math.max(...bedTop.pts.map(q => q[1])) === F - MED_COT && Math.min(...bedTop.pts.map(q => q[1])) < F - MED_COT - 1, `${at}: the mattress's top behind the patient, its front edge at ${F - MED_COT}`);
    const pillow = parts.find(p => p.col === '#9a968a');
    assert.ok(pillow && head.x >= pillow.x0 && head.x <= pillow.x1 && Math.abs(pillow.y1 - (F - MED_COT)) < 0.01, `${at}: the pillow (${JSON.stringify(pillow)}) under the patient's head at ${head.x}`);
    assert.ok(parts.filter(p => p.col === '#4a4436' && p.x0 > bedPart.x0 && p.x1 < bedPart.x1).length >= 2, `${at}: straps to hold the hurt down in the burn`);
    assert.ok(parts.filter(p => p.col === '#2e4a68').every(p => F - p.y0 >= MED_COT && F - p.y0 <= 42 && p.x1 - p.x0 <= 3), `${at}: the head and foot boards, slim, a little over the mattress`);
    const pole = parts.find(p => p.col === '#4a5e74' && p.y1 - p.y0 > 60);
    assert.ok(pole && F - pole.y0 >= 85 && F - pole.y0 <= 92 && pole.y1 >= F - 3, `${at}: the IV pole from the deck to about head height (${pole && F - pole.y0})`);
    const fi = calls.findIndex(k => k[0] === 'fillStyle' && k[1] === '#6a8494'), bi = calls.slice(0, fi).map(k => k[0]).lastIndexOf('translate'), [, tx, ty] = calls[bi];
    const bag = parts.find(p => p.col === '#6a8494'), mid = F - (ty + (bag.y0 + bag.y1) / 2);
    assert.ok(bi >= 0 && mid >= 74 && mid <= 84 && Math.abs(tx - pole.x1) < 12, `${at}: the bag hung from the pole at about 80 (${mid}), moved as it swings`);
    const li = calls.findIndex(k => k[0] === 'strokeStyle' && k[1] === MED_LINE), lj = li + calls.slice(li).findIndex(k => k[0] === 'stroke'), m = calls.slice(li, lj).find(k => k[0] === 'moveTo'), q = calls.slice(li, lj).filter(k => k[0] === 'quadraticCurveTo').pop();
    assert.ok(li >= 0 && Math.abs(m[1] - tx) < 3 && m[2] >= ty + bag.y1 - 0.01 && m[2] <= ty + bag.y1 + 5, `${at}: the IV line from the bag's foot (${m && m.slice(1)})`);
    assert.ok(q[3] > bedPart.x0 && q[3] < bedPart.x1 && Math.abs(q[4] - (F - MED_COT)) <= 2, `${at}: to the cot (${q.slice(3)})`);
    // the monitor, the first-aid box and the grab rail on the back wall (#1024), each checked where it is drawn
    const placed = placedParts(calls).map(p => ({ col: p.col, at: p.at, ...partBox(p) })), wall = backWall(r), onWall = p => p.x0 >= wall.x0 && p.x1 <= wall.x1 && p.y0 >= wall.y0 && p.y1 <= wall.y1 && (p.at[0] || p.at[1]);
    for (const [col, what] of [['#1f3a56', 'the monitor'], ['#5a6876', 'the first-aid box'], ['#3a5470', 'the grab rail']]) {
      const p = placed.find(q => q.col === wallTone(col));
      assert.ok(p && onWall(p), `${at}: ${what} (${JSON.stringify(p)}) moved onto the back wall (${JSON.stringify(wall)})`);
    }
    const mon = placed.find(p => p.col === wallTone('#1f3a56')), my = F - (mon.y0 + mon.y1) / 2;
    assert.ok(my >= 72 && my <= 82 && mon.x1 - mon.x0 >= 28 && mon.x1 - mon.x0 <= 32 && mon.y1 - mon.y0 <= 18, `${at}: the monitor, small, at eye height (${my}, ${mon.x1 - mon.x0} by ${mon.y1 - mon.y0})`);
    assert.ok(mon.x0 > bedPart.x0 && mon.x0 < bedPart.x1, `${at}: the monitor (${mon.x0} to ${mon.x1}) over the cot, where someone at its side reads it`);
    const meet = (a, b) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
    for (const p of parts.filter(q => /^#(6a6a66|7a7870|5a5e60|4a5e74|20384f)$/.test(q.col))) assert.ok(!meet(mon, p), `${at}: the monitor clear of the scanner arm and the IV pole (${p.col} ${JSON.stringify(p)})`);
    assert.ok(mon.x0 > tx + 6, `${at}: and clear of the bag`);
    const top = parts.find(p => p.col === '#6e7e8e');
    assert.ok(F - top.y0 >= 36 && F - top.y0 <= 44, `${at}: the cabinet at counter height (${F - top.y0})`);
    const arm = parts.filter(p => /^#(5a5e60|6a6a66|7a7870)$/.test(p.col)), sh = parts.find(p => p.col === '#7a7870');
    assert.ok(Math.min(...arm.map(p => p.y0)) <= r.top + 5 && sh.x0 > bedPart.x0 && sh.x1 < bedPart.x1 && F - sh.y1 >= MED_COT + 20, `${at}: the scanner arm from the ceiling, its head over the cot clear of the patient`);
    const box = placed.find(p => p.col === wallTone('#5a6876'));
    assert.ok(box && box.x1 < bedPart.x0 && F - box.y0 <= 60, `${at}: the first-aid box on the wall left of the cot, under the name (${JSON.stringify(box)})`);
    const rail = placed.find(p => p.col === wallTone('#3a5470')), cab = parts.find(p => p.col === '#4e5e6e');
    assert.ok(rail.x0 > cab.x0 - (cab.x0 - wall.e.vx) * 0.2 - 1 && rail.y1 < cab.y0 - 15, `${at}: the grab rail on the wall over the cabinet (${JSON.stringify(rail)})`);
  }
});
test('the medbay reads old and cared for: a newer scanner bolted on, wear at fixed places, a replacement door, a printed part tagged temporary, tape and cable ties (#933)', () => {
  for (const pr of [0.02, 0.3, 0.5]) for (const patient of [false, true]) {
    const { r, s } = medCase(pr, 1.17, patient), F = r.floor, at = `${patient ? 'a patient' : 'empty'}, ${pr}`, { ctx, calls } = recorder(); drawRoom(ctx, 'medbay', r, s);
    const parts = filledParts(calls).filter(p => p.outlined).map(p => ({ col: p.col, ...partBox(p) })), one = col => parts.find(p => p.col === col);
    const rects = col => calls.flatMap((k, i) => k[0] === 'fillStyle' && k[1] === col && calls[i + 1][0] === 'fillRect' ? [calls[i + 1].slice(1)] : []);
    const inside = ([x, y, w, h], b, pad = 0) => x >= b.x0 - pad && x + w <= b.x1 + pad && y >= b.y0 - pad && y + h <= b.y1 + pad;
    // the scanner: its own finish, unlike the cot's and the cabinet's, on an adapter plate with fresh bolts under the old mount
    const plate = one('#5a5e60'), arm = parts.filter(p => p.col === '#6a6a66');
    assert.ok(plate && arm.length === 2 && plate.y0 <= r.top + 5 && Math.min(...arm.map(p => p.y0)) >= plate.y1 - 0.01, `${at}: the arm hung from an adapter plate on the ceiling`);
    assert.ok(calls.filter(k => k[0] === 'fillStyle' && k[1] === '#8a929a').length >= 4, `${at}: its fresh bolts`);
    for (const col of ['#6a6a66', '#7a7870']) assert.ok(!['#2a4664', '#4e5e6e', '#64748a', '#3a5470'].includes(col), 'a finish of its own');
    // wear at fixed places: chips on the cot's frame and the cabinet's edges, scuffs low on the doors
    const frame = one('#2a4664'), cab = one('#4e5e6e'), chips = rects('#7e8a94'), scuffs = rects('#3e4c5a');
    assert.ok(chips.filter(c => inside(c, frame)).length >= 3, `${at}: chipped paint on the cot's frame`);
    assert.ok(chips.filter(c => inside(c, cab)).length >= 2 && scuffs.filter(c => inside(c, cab) && c[1] > F - 12).length >= 2, `${at}: chips and scuffs on the cabinet, low where feet meet it`);
    const doors = parts.filter(p => /^#(64748a|6a7480)$/.test(p.col));
    assert.equal(doors.length, 2, `${at}: two doors`); assert.notEqual(doors[0].col, doors[1].col, `${at}: one a replacement in another shade`);
    // a printed clamp on the IV pole, tagged temporary, its tag a muted yellow and clear of the name
    const pole = parts.find(p => p.col === '#4a5e74' && p.y1 - p.y0 > 60), clamp = one('#8a6a48'), tag = one('#9a9050');
    assert.ok(clamp && clamp.x0 < pole.x0 && clamp.x1 > pole.x1 && clamp.y0 > pole.y0 && clamp.y1 < pole.y1, `${at}: the printed clamp round the pole`);
    assert.ok(tag && Math.abs(tag.y0 - clamp.y1) < 3 && tag.x1 <= clamp.x0 && tag.x1 - tag.x0 <= 6 && tag.y1 - tag.y0 <= 6, `${at}: its tag hung from it (${JSON.stringify(tag)})`);
    // tape over a corner of the monitor's bezel, and cable ties holding the IV line to the pole
    const mon = one(wallTone('#1f3a56')), tape = one(wallTone('#7a7462'));  // on the back wall, moved together (#1024)
    assert.ok(tape && tape.x0 < mon.x1 && tape.x1 > mon.x1 - 1 && tape.y0 < mon.y0 + 1 && tape.y1 > mon.y0 && tape.x1 - tape.x0 <= 8, `${at}: tape over a corner of the monitor (${JSON.stringify(tape)})`);
    const ties = rects('#1e2a36').filter(t => t[0] <= pole.x0 && t[0] + t[2] >= pole.x1);
    assert.ok(ties.length >= 2, `${at}: cable ties round the pole`);
    const li = calls.findIndex(k => k[0] === 'strokeStyle' && k[1] === MED_LINE), lj = li + calls.slice(li).findIndex(k => k[0] === 'stroke');
    const run = calls.slice(li, lj).filter(k => k[0] === 'lineTo' && Math.abs(k[1] - (pole.x1 + pole.x0) / 2) < 2.5);
    assert.ok(run.length >= 1 && ties.every(t => calls.slice(li, lj).some(k => /^(lineTo|quadraticCurveTo)$/.test(k[0]) && k[k.length - 1] >= t[1])), `${at}: the IV line runs down the pole through the ties`);
  }
});

// #933, the hold on the drive deck: slatted crates on pallets in stacks of three, each with its serial stencilled as marks in a box the code names
// (holdLabel, for the contract's good, #936), strapped to rings in the deck under a cargo net that bulges at the flip; the pallet jack, toned down, its
// handle at the waist; the lamp swinging on its cable; the hold log floating at the flip. Drawn at the burn view's zoom in a window 1000, 1280
// and 1600 wide, empty, half full and full.
const { holdCrate, holdLabel, FIG_TALL } = load(['js/data.js', 'js/util.js', 'js/figures.js', 'js/layouts.js', 'js/camera.js', 'js/rooms.js'], { G: {}, Mods: { filter: (n, v) => v, emit() {}, register() {} } }, ['holdCrate', 'holdLabel', 'FIG_TALL']);
const HOLD_PROPS = [['#78705a', 'the pallet jack\'s body'], ['#6a6450', 'its forks'], ['#5e646a', 'its handle'], ['#1a2430', 'its wheels'], ['#5a6470', 'the lamp\'s shade'], ['#a89a78', 'the lamp\'s glass']];
const HOLD_CRATE_PROPS = [['#3e3426', 'the pallets'], ['#4a4436', 'the straps'], ['#6a583c', 'the crates\' battens']];
const HOLD_INK = ['#7a6c50', '#6a7a7a'], HOLD_NET = '#8a7e62', HOLD_RING = '#4a6680', HOLD_WOOD = ['#5a4a34', '#54462f', '#4a5a5e', '#5e4e36', '#4e4230'];
const holdCase = (pr, zoom, cargo) => ({ r: layoutBox(LAYOUTS.freighter, 'hold'), s: RS({ w: phaseWeights(pr), zoom, cargo, damage: { marks: new Set(), severe: false } }) });
const holdParts = (r, s) => { const { ctx, calls } = recorder(); drawRoom(ctx, 'hold', r, s); return { calls, parts: filledParts(calls).filter(p => p.outlined).map(p => ({ col: p.col, ...partBox(p) })) }; };
// every point a stroke of the colour col went through, in world units
const strokePts = (calls, col) => {
  const out = []; let pts = [], stroke = null;
  for (const [k, ...a] of calls) {
    if (k === 'strokeStyle') stroke = a[0]; else if (k === 'beginPath') pts = []; else if (k === 'moveTo' || k === 'lineTo') pts.push(a); else if (k === 'quadraticCurveTo') pts.push(a.slice(2));
    else if (k === 'stroke' && stroke === col) out.push(...pts);
  }
  return out;
};
test('the hold is drawn to the figures\' standard in every phase: its props outlined and a step below the people, the name on clear wall (#933)', () => {
  for (const cargo of [0, 0.5, 1]) for (const pr of [0.02, 0.3, 0.45, 0.5]) for (const zoom of [0.82, 1.17, 1.45]) {
    const { r, s } = holdCase(pr, zoom, cargo), at = `cargo ${cargo}, ${pr}, ${zoom}`;
    const c = fakeCtx(); drawRoom(c, 'hold', r, s); assert.equal(c.depth, 0, `${at}: every save restored`);
    for (const f of c.fonts) assert.ok(Number(/(\d+(?:\.\d+)?)px/.exec(f)[1]) >= 12, `${at}: ${f}`);
    const { ctx, calls } = recorder(); drawRoom(ctx, 'hold', r, s);
    const fills = col => calls.filter(k => k[0] === 'fillStyle' && k[1] === col).length;
    for (const [col, what] of [...HOLD_PROPS, ...(cargo ? HOLD_CRATE_PROPS : [])]) assert.ok(fills(col) >= 1, `${at}: ${what} (${col})`);
    assert.ok(calls.some(k => k[0] === 'strokeStyle' && k[1] === HOLD_RING), `${at}: the floor rings`);
    const outlined = filledParts(calls).filter(p => p.outlined);
    assert.ok(outlined.length >= 8 + 3 * Math.round(12 * cargo) + 4 * Math.ceil(Math.round(12 * cargo) / 3), `${at}: the props outlined like the figures (${outlined.length})`);
    for (const { col } of outlined.filter(p => rgbOf(p.col))) {
      const v = rgbOf(col);
      assert.ok(Math.max(...v) <= 0xb0 && Math.max(...v) - Math.min(...v) <= 0x60, `${at}: ${col} is near-white or saturated, brighter than the people`);
    }
    for (const col of ['#c9a227', '#ffe2b8', '#222']) assert.equal(fills(col), 0, `${at}: no bright or black block (${col})`);
    // in the box (#1024): the crates, the pallets and the jack's forks and pump solid, their tops showing; the scuffs where the jack parks on the wall
    const n = Math.round(12 * cargo), kinds = [...new Set(Array.from({ length: n }, (_, k) => HOLD_WOOD[(k * 7 + Math.floor(k / 3)) % HOLD_WOOD.length]))];
    for (const col of kinds) assert.ok(fills(solidTop(col)) >= 1, `${at}: the ${col} crates solid, their tops showing`);
    for (const [col, what] of [...(n ? [['#3e3426', 'the pallets']] : []), ['#6a6450', 'the jack\'s forks'], ['#78705a', 'its pump']]) assert.ok(fills(solidTop(col)) >= 1, `${at}: ${what} solid, a top showing`);
    assert.equal(fills('#3e4c5a'), 0, `${at}: the scuffs on the wall, not in their own colour`); assert.ok(fills(wallTone('#3e4c5a')) >= 2, `${at}: the scuffs on the wall`);
    // the room's name (shiplife.js: 13px on a plate at its top left) on clear wall, where each thing is drawn
    const name = { x0: r.x0, x1: r.x0 + 12 + 60 / zoom, y0: r.top + 8 - 1 / zoom, y1: r.top + 8 + 17 / zoom }, hit = (b, x, y) => x > b.x0 && x < b.x1 && y > b.y0 && y < b.y1;
    for (const { k, v, pts } of roomOwnPlaced('hold', r, s)) for (const [x, y] of pts) assert.ok(!hit(name, x, y), `${at}: ${k} ${v} at ${x}, ${y} under the room's name`);
  }
  const stillAt = t => { const { r, s } = holdCase(0.5, 1.17, 1), c = fakeCtx(); drawRoom(c, 'hold', r, { ...s, still: true, time: t }); return c.args.join('|'); };
  assert.equal(stillAt(1.3), stillAt(4.9), 'the same frame at any time under reduced motion');
});
test('the hold\'s crates come from the cargo, in stacks of three, each with its serial in a clear, named box (#933, #936)', () => {
  for (const cargo of [0, 1 / 12, 0.5, 7 / 12, 1]) for (const zoom of [0.82, 1.17, 1.45]) {
    const { r, s } = holdCase(0.3, zoom, cargo), n = Math.round(12 * cargo), at = `cargo ${cargo}, ${zoom}`, { calls, parts } = holdParts(r, s);
    const bodies = parts.filter(p => HOLD_WOOD.includes(p.col) && p.x1 - p.x0 > 30);
    assert.equal(bodies.length, n, `${at}: ${n} crates (${bodies.length})`);
    const name = { x1: r.x0 + 12 + 60 / zoom, y1: r.top + 8 + 17 / zoom };
    for (let k = 0; k < n; k++) {
      const c = holdCrate(r, k), b = holdLabel(r, k);
      assert.ok(bodies.some(p => Math.abs(p.x0 - c.x) < 0.01 && Math.abs(p.y0 - c.y) < 0.01), `${at}: crate ${k} drawn where holdCrate puts it`);
      assert.ok(placedParts(calls).some(p => HOLD_WOOD.includes(p.col) && !p.at[0] && !p.at[1] && near(partBox(p).x0, c.x) && near(partBox(p).y0, c.y)), `${at}: crate ${k}'s front at the cut, unmoved, so its label box is where it is named (#1024)`);
      if (k % 3) assert.ok(Math.abs(c.x - holdCrate(r, k - 1).x) < 0.01 && Math.abs(c.y + c.h - holdCrate(r, k - 1).y) < 0.01, `${at}: crate ${k} on the one under it`);
      else assert.ok(c.y + c.h <= r.floor - 3 && c.y + c.h >= r.floor - 6 && (k === 0 || c.x > holdCrate(r, k - 1).x + c.w), `${at}: crate ${k} on a pallet at the foot of the next stack`);
      assert.ok(c.x > name.x1 && c.x + c.w < r.x1, `${at}: crate ${k} in the room, clear of the name`);
      assert.ok(b.x >= c.x + 4 && b.x + b.w <= c.x + c.w - 4 && b.y >= c.y + 6 && b.y + b.h <= c.y + c.h - 6 && b.w >= 28 && b.h >= 9, `${at}: crate ${k}'s label box ${JSON.stringify(b)} on its front`);
      // its serial: marks, not text, in paint near the wood's own tone, inside the box, and nothing drawn over the box after them
      const inside = (x, y) => x > b.x + 0.01 && x < b.x + b.w - 0.01 && y > b.y + 0.01 && y < b.y + b.h - 0.01;
      const marks = calls.flatMap((q, i) => q[0] === 'fillRect' && i > 0 && calls[i - 1][0] === 'fillStyle' && HOLD_INK.includes(calls[i - 1][1]) && inside(q[1] + q[3] / 2, q[2] + q[4] / 2) ? [i] : []);
      assert.ok(marks.length >= 6, `${at}: crate ${k}'s serial marks (${marks.length})`);
      for (const i of marks) { const q = calls[i]; assert.ok(q[1] >= b.x && q[1] + q[3] <= b.x + b.w && q[2] >= b.y && q[2] + q[4] <= b.y + b.h && q[3] <= 2 && q[4] <= 3, `${at}: a mark ${q.slice(1)} small, in crate ${k}'s box`); }
      const last = calls.reduce((m, q, i) => q[0] === 'fillRect' && i > 0 && [...HOLD_INK, '#5e5a48', '#3a3226'].includes(calls[i - 1][1]) && inside(q[1] + q[3] / 2, q[2] + q[4] / 2) ? i : m, -1);  // the serial and its handling plate
      let tf = 0;
      for (const q of calls.slice(last + 1)) {
        if (q[0] === 'save') tf++; else if (q[0] === 'restore') tf--;
        if (tf) continue;  // a part moved by ctx.translate (the lamp, the hold log)
        const pts = q[0] === 'fillRect' ? [[q[1] + q[3] / 2, q[2] + q[4] / 2], [q[1], q[2]], [q[1] + q[3], q[2] + q[4]]] : /^(moveTo|lineTo)$/.test(q[0]) ? [q.slice(1)] : q[0] === 'quadraticCurveTo' ? [q.slice(3)] : q[0] === 'arc' ? [q.slice(1, 3)] : [];
        for (const [x, y] of pts) assert.ok(!inside(x, y), `${at}: ${q[0]} ${q.slice(1)} over crate ${k}'s label box`);
      }
    }
    const serials = Array.from({ length: n }, (_, k) => calls.filter((q, i) => q[0] === 'fillRect' && i > 0 && HOLD_INK.includes(calls[i - 1][1]) && (b => q[1] >= b.x && q[1] < b.x + b.w && q[2] >= b.y && q[2] < b.y + b.h)(holdLabel(r, k))).map(q => q.slice(1).map(v => Math.round((v - holdLabel(r, k).x) * 10)).join()).join('|'));
    assert.ok(n < 2 || new Set(serials).size >= Math.min(n, 4), `${at}: serials varied by crate`);
    assert.equal(calls.filter(q => q[0] === 'fillText').length, 0, `${at}: no text on the crates`);
    for (const col of [...HOLD_INK, '#5e5a48']) {
      const v = [1, 3, 5].map(i => parseInt(col.slice(i, i + 2), 16));
      assert.ok(Math.max(...v) <= 0x80 && Math.max(...v) - Math.min(...v) <= 0x30, `${col}: the serial's paint low in contrast`);
    }
    if (n >= 2) assert.ok(calls.some((q, i) => q[0] === 'fillStyle' && q[1] === '#5e5a48' && calls[i + 1][0] === 'fillRect' && (c => calls[i + 1][1] >= c.x + 4 && calls[i + 1][1] + calls[i + 1][3] <= c.x + c.w - 4 && calls[i + 1][2] >= c.y && calls[i + 1][2] + calls[i + 1][4] <= holdLabel(r, 1).y)(holdCrate(r, 1))), `${at}: a handling plate on crate 1's top board, clear of its label box (#936)`);
  }
});
// #936, the cargo: each crate reads what the ship carries (holdGoods, from the cargo and the missions' loads), split between the goods by tons
// (holdCrateGoods), with the mark of its good stencilled beside its serial in its label box (holdPictogram); the windows: the bridge's shows the
// destination growing and the galley's porthole the place she left shrinking, swapped after the flip turns her nose back (windowView).
const cargoBox = load(['js/data.js', 'js/util.js', 'js/figures.js', 'js/layouts.js', 'js/camera.js', 'js/rooms.js'], { G: {}, Mods: { filter: (n, v) => v, emit() {}, register() {} } }, ['holdGoods', 'holdCrateGoods', 'holdMark', 'HOLD_MARKS', 'windowView', 'viewTone', 'placeColour', 'COMMODITIES', 'SYSTEMS', 'holdPictogram', 'roomViewDisc']);
const plain = v => JSON.parse(JSON.stringify(v));
test('every good the game trades has its own stencilled mark, and anything else the generic one (#936)', () => {
  const marks = cargoBox.COMMODITIES.map(c => cargoBox.holdMark(c.id));
  assert.equal(marks.length, 7);
  for (const [i, m] of marks.entries()) assert.ok(m && m !== 'mark', `${cargoBox.COMMODITIES[i].id} has a mark of its own (${m})`);
  assert.equal(new Set(marks).size, marks.length, 'no two goods share a mark');
  assert.deepEqual(plain(Object.keys(cargoBox.HOLD_MARKS).sort()), plain(cargoBox.COMMODITIES.map(c => c.id).sort()), 'the table names the goods and nothing else');
  assert.equal(cargoBox.holdMark('sealed diplomatic pouches'), 'mark'); assert.equal(cargoBox.holdMark(undefined), 'mark');
  for (const m of [...marks, 'mark']) {  // each drawn inside the label box's right part, clear of the serial, with no text
    const b = { x: 100, y: 50, w: 32, h: 10 }, c = fakeCtx(); cargoBox.holdPictogram(c, m, b, '#7a6c50', '#5a4a34');
    assert.equal(c.depth, 0); assert.equal(c.fonts.length, 0, `${m}: no text`);
    const pts = c.args.map(a => a.split(/(?<=[a-zA-Z])(?=-?\d)|,/)).filter(([k]) => /^(moveTo|lineTo|fillRect)$/.test(k)).map(([, x, y]) => [Number(x), Number(y)]);
    assert.ok(pts.length >= 1 || c.calls.includes('arc'), `${m} drew`);
    for (const [x, y] of pts) assert.ok(x >= b.x + 20.5 && x <= b.x + b.w && y >= b.y && y <= b.y + b.h, `${m}: ${x}, ${y} in the box, right of the serial`);
  }
});
test('what the hold carries: the cargo in its order, then the missions\' loads, one entry a good (#936)', () => {
  assert.deepEqual(plain(cargoBox.holdGoods({ water: 80 }, [])), [{ id: 'water', tons: 80 }]);
  assert.deepEqual(plain(cargoBox.holdGoods({ food: 10, water: 0, metal: 5 }, [{ good: 'medical crates', tons: 4 }, { good: 'a promise', tons: 0 }, { good: 'metal', tons: 2 }])), [{ id: 'food', tons: 10 }, { id: 'metal', tons: 7 }, { id: 'medical crates', tons: 4 }]);
  assert.deepEqual(plain(cargoBox.holdGoods({}, [])), []); assert.deepEqual(plain(cargoBox.holdGoods(undefined, undefined)), []);
});
test('the crates split between the goods by tons, in the cargo\'s order, the same every time (#936)', () => {
  const split = (g, n) => plain(cargoBox.holdCrateGoods(g, n));
  assert.deepEqual(split([{ id: 'water', tons: 80 }], 8), Array(8).fill('water'));
  assert.deepEqual(split([{ id: 'water', tons: 48 }, { id: 'food', tons: 32 }], 8), ['water', 'water', 'water', 'water', 'water', 'food', 'food', 'food']);
  assert.deepEqual(split([{ id: 'food', tons: 50 }, { id: 'water', tons: 50 }], 3), ['food', 'food', 'water'], 'a tie to the first in the cargo');
  assert.deepEqual(split([{ id: 'a', tons: 1 }, { id: 'b', tons: 1 }, { id: 'c', tons: 1 }], 12), ['a', 'a', 'a', 'a', 'b', 'b', 'b', 'b', 'c', 'c', 'c', 'c']);
  for (let n = 0; n <= 12; n++) for (const g of [[{ id: 'water', tons: 7 }, { id: 'food', tons: 3 }, { id: 'metal', tons: 11 }], [{ id: 'food', tons: 1 }, { id: 'luxury', tons: 99 }]]) {
    const out = split(g, n), total = g.reduce((a, x) => a + x.tons, 0);
    assert.equal(out.length, n, `${n} crates`); assert.deepEqual(out, split(g, n), 'the same every time');
    for (const x of g) assert.ok(Math.abs(out.filter(o => o === x.id).length - x.tons * n / total) < 1, `${x.id}: its share of ${n}`);
    assert.deepEqual(out, [...out].sort((a, b) => g.findIndex(x => x.id === a) - g.findIndex(x => x.id === b)), 'in the cargo\'s order');
  }
  assert.deepEqual(split([], 5), [null, null, null, null, null], 'nothing to name: serials only'); assert.deepEqual(split([{ id: 'water', tons: 0 }], 2), [null, null]);
  for (const f of [cargoBox.holdCrateGoods, cargoBox.holdGoods, cargoBox.windowView, cargoBox.viewTone]) assert.ok(!/random|rand\(|pick\(/.test(String(f)), 'no dice');
});
test('each crate shows its good\'s mark beside its serial; with nothing to name, the serial only, as before; the fill unchanged (#936)', () => {
  const r = layoutBox(LAYOUTS.freighter, 'hold'), draw = (cargo, goods) => { const { ctx, calls } = recorder(); drawRoom(ctx, 'hold', r, RS({ w: phaseWeights(0.3), zoom: 1.17, cargo, goods, damage: { marks: new Set(), severe: false } })); return calls; };
  const inBox = (calls, k) => { const b = holdLabel(r, k); return calls.filter(q => /^(moveTo|lineTo)$/.test(q[0]) && q[1] > b.x + 20 && q[1] <= b.x + b.w && q[2] >= b.y && q[2] <= b.y + b.h).length; };
  const bare = draw(0.5), none = draw(0.5, []), two = draw(0.5, [{ id: 'water', tons: 48 }, { id: 'food', tons: 32 }]);
  assert.equal(JSON.stringify(none), JSON.stringify(bare), 'no goods given and none aboard draw the same');
  const inks = calls => calls.filter((q, i) => q[0] === 'fill' && HOLD_INK.includes(calls.slice(0, i).filter(p => p[0] === 'fillStyle').pop()[1])).length;
  assert.equal(inks(bare), 0, 'with nothing to name, the serial only: no mark filled in its paint');
  for (let k = 0; k < 6; k++) assert.ok(inBox(two, k) >= inBox(bare, k) + 2, `crate ${k}: a mark beside its serial`);
  assert.ok(inks(two) >= 6, 'the marks in the serial\'s paint');
  const crates = calls => filledParts(calls).filter(p => p.outlined && HOLD_WOOD.includes(p.col) && partBox(p).x1 - partBox(p).x0 > 30).length;
  assert.equal(crates(two), crates(bare), 'the same crates stand'); assert.equal(crates(two), 6);
  for (const col of two.filter(q => q[0] === 'fillStyle' && /^#[0-9a-f]{6}$/.test(q[1])).map(q => q[1])) { const v = rgbOf(col); assert.ok(Math.max(...v) <= 0xb0 && Math.max(...v) - Math.min(...v) <= 0x60, `${col} inside the props' brightness`); }
});
test('the bridge\'s window shows the destination growing and the porthole the place she left shrinking; after the flip they swap (#936)', () => {
  const V = (pr, spin, at) => plain(cargoBox.windowView(pr, spin, at));
  assert.equal(V(0.1, 0, 'bridge').place, 'to'); assert.equal(V(0.1, 0, 'porthole').place, 'from');
  assert.equal(V(0.9, Math.PI, 'bridge').place, 'from', 'the nose turned back at the flip (transit.js)'); assert.equal(V(0.9, Math.PI, 'porthole').place, 'to');
  assert.equal(V(0.5, Math.PI / 2, 'bridge').a, 0, 'side-on in the turn: stars only'); assert.equal(V(0.2, 0, 'bridge').a, 1);
  let last = { to: -1, from: 2 };
  for (let pr = 0; pr <= 1.0001; pr += 0.05) {
    const to = cargoBox.windowView(pr, 0, 'bridge').k, from = cargoBox.windowView(pr, 0, 'porthole').k;
    assert.ok(to > last.to && from < last.from, `${pr}: the destination grows, the place she left shrinks`); last = { to, from };
    assert.equal(cargoBox.windowView(pr, Math.PI, 'porthole').k, to); assert.equal(cargoBox.windowView(pr, Math.PI, 'bridge').k, from);
  }
  assert.ok(V(0, 0, 'bridge').k <= 0.1 && V(1, 0, 'bridge').k === 1, 'small at departure, its largest at arrival');
  assert.equal(V(0.5, 0, 'bridge').k, V(0.5, 0, 'porthole').k, 'the same size either side at the flip');
  // drawn: a disc on the glass, larger near arrival, under the struts; none without a place
  const r = layoutBox(LAYOUTS.freighter, 'bridge'), g = bridgeGlass(r, FW), disc = (pr, spin = 0, places = { to: '#8b8378', from: '#3a7bd5' }) => {
    const { ctx, calls } = recorder(); drawRoom(ctx, 'bridge', r, RS({ w: phaseWeights(pr), pr, spin, places, well: FW, damage: { marks: new Set(), severe: false } }));
    return calls.filter(q => q[0] === 'arc' && q[1] > g.x && q[1] < g.x + g.w && q[2] > g.y && q[2] < g.y + g.h).map(q => q[3]);
  };
  assert.equal(disc(0.95, Math.PI, { to: '#8b8378', from: null }).filter(v => v > 1.45).length, 0, 'no place, no disc (the stars only)');
  const early = Math.max(...disc(0.05)), late = Math.max(...disc(0.45));
  assert.ok(early > 0 && late > early * 2, `the destination grows (${early}, ${late})`); assert.ok(late >= g.h * 0.35, 'a good part of the window');
  const gl = layoutBox(LAYOUTS.freighter, 'galley'), port = (pr) => { const { ctx, calls } = recorder(); drawRoom(ctx, 'galley', gl, RS({ w: phaseWeights(pr), pr, spin: 0, places: { to: '#8b8378', from: '#3a7bd5' }, damage: { marks: new Set(), severe: false } })); return calls; };
  const radii = calls => calls.filter((q, i) => q[0] === 'arc' && q[3] > 2 && q[3] < 13).map(q => q[3]);
  assert.ok(Math.max(...radii(port(0.05))) > Math.max(...radii(port(0.45))), 'the place she left shrinks in the porthole');
});
test('the windows\' discs keep inside the brightness limits, leave every save restored, write no text and hold still under reduced motion (#936)', () => {
  const cols = Object.values(cargoBox.SYSTEMS).flatMap(sys => sys.planets.map(p => p.color));
  assert.ok(cols.length >= 10);
  for (const col of [...cols, null, '#ffffff', '#ff0000']) for (const t of plain(cargoBox.viewTone(col))) { const v = rgbOf(t); assert.ok(Math.max(...v) <= 0xb0 && Math.max(...v) - Math.min(...v) <= 0x60, `${col}: ${t}`); }
  assert.equal(cargoBox.placeColour(cargoBox.SYSTEMS.earth, 'Luna'), '#b8b8b8'); assert.equal(cargoBox.placeColour(cargoBox.SYSTEMS.earth, 'nowhere'), cargoBox.SYSTEMS.earth.planets[0].color);
  assert.equal(cargoBox.placeColour({ color: '#6b6152' }, 'x'), '#6b6152'); assert.equal(cargoBox.placeColour(undefined), null);
  for (const id of ['bridge', 'galley']) for (const pr of [0.05, 0.5, 0.95]) for (const spin of [0, Math.PI / 3, Math.PI]) {
    const r = layoutBox(LAYOUTS.freighter, id), s = RS({ w: phaseWeights(pr), pr, spin, places: { to: '#e0a040', from: '#3a7bd5' }, well: FW, damage: { marks: new Set(), severe: false } });
    const c = fakeCtx(); drawRoom(c, id, r, s); assert.equal(c.depth, 0, `${id} ${pr}: saves restored`);
    for (const f of c.fonts) assert.ok(Number(/(\d+(?:\.\d+)?)px/.exec(f)[1]) >= 12, `${id}: ${f}`);
    const at = time => { const q = fakeCtx(); drawRoom(q, id, r, { ...s, still: true, time }); return q.args.join('|'); };
    assert.equal(at(1.3), at(4.9), `${id} ${pr}: the same frame under reduced motion`);
  }
  // the struts and the gasket over the glass's disc: drawn after it
  const r = layoutBox(LAYOUTS.freighter, 'bridge'), { ctx, calls } = recorder(); drawRoom(ctx, 'bridge', r, RS({ w: phaseWeights(0.4), pr: 0.4, spin: 0, places: { to: '#8b8378', from: '#3a7bd5' }, well: FW, damage: { marks: new Set(), severe: false } }));
  const g = bridgeGlass(r, FW), lastDisc = calls.reduce((m, q, i) => q[0] === 'arc' && q[1] > g.x && q[1] < g.x + g.w && q[2] > g.y && q[2] < g.y + g.h ? i : m, -1);
  assert.ok(lastDisc > 0 && calls.slice(lastDisc).some(q => q[0] === 'strokeRect'), 'the gasket and the frame drawn over the disc');
});
test('the pallet jack reads as a worn, painted tool a step below the people: its paint greyed, no channel spread over 0x24 (#1040)', () => {
  for (const col of ['#6a6450', '#78705a']) { const v = [1, 3, 5].map(i => parseInt(col.slice(i, i + 2), 16)); assert.ok(Math.max(...v) <= 0xb0 && Math.max(...v) - Math.min(...v) <= 0x24, `${col}: muted`); }
  const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'js', 'rooms.js'), 'utf8'), body = src.slice(src.indexOf('function roomHoldJack'), src.indexOf('function roomHold(ctx'));
  assert.ok(!/#7a6a34|#8a7a3a/i.test(body), 'the old yellows are gone from the jack');
});
test('the hold\'s props are sized to a person: a crate two can lift, stacks under the head, the jack\'s handle at the waist (#933)', () => {
  const { r } = holdCase(0.3, 1.45, 1), F = r.floor;
  for (const pr of [0.02, 0.3, 0.5]) {
    const { s } = holdCase(pr, 1.45, 1), { parts } = holdParts(r, s), at = `${pr}`;
    for (const p of parts.filter(q => HOLD_WOOD.includes(q.col) && q.x1 - q.x0 > 30)) assert.ok(p.x1 - p.x0 >= 36 && p.x1 - p.x0 <= 44 && p.y1 - p.y0 >= 20 && p.y1 - p.y0 <= 28, `${at}: a crate (${p.x1 - p.x0} by ${p.y1 - p.y0}) two people can lift`);
    assert.ok(F - holdCrate(r, 2).y <= FIG_TALL - 8, `${at}: a stack of three (${F - holdCrate(r, 2).y}) under a person's head (${FIG_TALL})`);
    const pallets = parts.filter(q => q.col === '#3e3426');
    assert.equal(pallets.length, 4, `${at}: a pallet under each stack`); for (const p of pallets) assert.ok(p.y1 >= F - 0.01 && p.y1 - p.y0 <= 5, `${at}: a pallet on the deck`);
    const forks = parts.find(q => q.col === '#6a6450'), body = parts.find(q => q.col === '#78705a'), handle = parts.filter(q => q.col === '#5e646a'), grip = parts.find(q => q.col === '#8a6a48');
    assert.ok(forks && forks.x1 - forks.x0 >= 44 && forks.x1 - forks.x0 <= 60 && forks.y1 - forks.y0 <= 4 && forks.y1 >= F - 3, `${at}: the forks, low and a pallet long (${forks && forks.x1 - forks.x0})`);
    assert.ok(body && F - body.y0 <= 18 && body.x0 >= forks.x1 - 6, `${at}: the pump at the forks' heel, under the knee`);
    assert.ok(handle.length && grip && F - grip.y0 >= 38 && F - grip.y0 <= 50, `${at}: the handle's grip at the waist (${grip && F - grip.y0})`);
    assert.ok(forks.x0 > holdCrate(r, 11).x + 40 && grip.x1 < r.x1, `${at}: the jack clear of the stacks, in the room`);
    const shade = parts.find(q => q.col === '#5a6470');
    assert.ok(shade && shade.x1 - shade.x0 <= 16, `${at}: the lamp, small`);
  }
  for (const cargo of [0, 0.5]) { const { s } = holdCase(0.3, 1.45, cargo), { parts } = holdParts(r, s); assert.equal(parts.filter(q => q.col === '#3e3426').length, Math.ceil(Math.round(12 * cargo) / 3), `cargo ${cargo}: a pallet under each stack there is`); }
});
test('the hold\'s stacks are strapped to rings in the deck, under a cargo net that bulges at the flip (#933)', () => {
  const { r } = holdCase(0.3, 1.17, 1), F = r.floor, top = pr => { const { s } = holdCase(pr, 1.17, 1), { calls } = holdParts(r, s); return Math.min(...strokePts(calls, HOLD_NET).map(p => p[1])); };
  for (const cargo of [0, 0.25, 7 / 12, 1]) for (const pr of [0.02, 0.3, 0.5]) {
    const { s } = holdCase(pr, 1.17, cargo), n = Math.round(12 * cargo), at = `cargo ${cargo}, ${pr}`, { calls, parts } = holdParts(r, s);
    const rings = calls.filter((q, i) => q[0] === 'arc' && (calls.slice(0, i).filter(p => p[0] === 'strokeStyle').pop() || [])[1] === HOLD_RING);
    assert.ok(rings.length >= 8 && rings.every(q => q[2] >= F - 4 && q[2] <= F), `${at}: rings in the deck (${rings.length})`);
    const net = strokePts(calls, HOLD_NET);
    if (!n) { assert.equal(net.length, 0, `${at}: no net over an empty hold`); continue; }
    const stacks = Array.from({ length: Math.ceil(n / 3) }, (_, c) => ({ x0: holdCrate(r, 3 * c).x, x1: holdCrate(r, 3 * c).x + holdCrate(r, 3 * c).w, top: holdCrate(r, Math.min(n - 1, 3 * c + 2)).y }));
    for (const st of stacks) {
      assert.ok(net.some(([x, y]) => x > st.x0 && x < st.x1 && y <= st.top), `${at}: the net over the stack at ${st.x0}`);
      const straps = parts.filter(p => p.col === '#4a4436' && p.x0 >= st.x0 - 1 && p.x1 <= st.x1 + 1);
      assert.ok(straps.some(p => p.x1 - p.x0 >= 30 && p.y0 <= st.top), `${at}: a strap over the stack at ${st.x0}`);
      for (const ex of [st.x0, st.x1]) {
        assert.ok(straps.some(p => Math.abs((p.x0 + p.x1) / 2 - ex) < 2 && p.y1 >= F - 4.5 && p.y0 <= st.top), `${at}: a strap down the stack's side at ${ex} to the deck`);
        assert.ok(rings.some(q => Math.abs(q[1] - ex) < 2.5), `${at}: a ring at its foot (${ex})`);
      }
    }
    assert.ok(net.every(([x]) => x >= stacks[0].x0 - 7 && x <= stacks[stacks.length - 1].x1 + 7), `${at}: the net on the stacks`);
    assert.ok(net.some(([x, y]) => x < stacks[0].x0 && y >= F - 4) && net.some(([x, y]) => x > stacks[stacks.length - 1].x1 && y >= F - 4), `${at}: tied down at both ends`);
  }
  assert.ok(top(0.5) <= top(0.3) - 2 && top(0.02) === top(0.3), `the net lifts off the stacks at the flip (${top(0.5)}, ${top(0.3)})`);
});
test('the hold reads old and cared for: crates of different ages, a replacement board, worn corners, tape, a mended net, a printed grip tagged temporary (#933)', () => {
  for (const pr of [0.02, 0.3, 0.5]) {
    const { r, s } = holdCase(pr, 1.17, 1), F = r.floor, at = `${pr}`, { calls, parts } = holdParts(r, s);
    const rects = col => calls.flatMap((k, i) => k[0] === 'fillStyle' && k[1] === col && calls[i + 1][0] === 'fillRect' ? [calls[i + 1].slice(1)] : []);
    const inside = ([x, y, w, h], b) => x >= b.x0 - 0.01 && x + w <= b.x1 + 0.01 && y >= b.y0 - 0.01 && y + h <= b.y1 + 0.01;
    const bodies = parts.filter(p => HOLD_WOOD.includes(p.col) && p.x1 - p.x0 > 30), cols = new Set(bodies.map(p => p.col));
    assert.ok(cols.size >= 3 && cols.has('#4a5a5e'), `${at}: wooden crates of more than one age, and a newer moulded one`);
    assert.ok(rects('#6e5c40').some(c => bodies.some(b => inside(c, b))), `${at}: a crate with a replacement board in fresher wood`);
    const chips = rects('#7a6a50');
    assert.ok(new Set(chips.map(c => bodies.findIndex(b => inside(c, b))).filter(i => i >= 0)).size >= 3, `${at}: worn corners on several crates`);
    const tape = parts.find(p => p.col === '#7a7462');
    assert.ok(tape && tape.x1 - tape.x0 <= 10 && bodies.some(b => tape.x0 < b.x1 && tape.x1 > b.x1 - 1 && tape.y0 < b.y0 + 1), `${at}: tape over a crate's corner (${JSON.stringify(tape)})`);
    const net = strokePts(calls, HOLD_NET), mend = strokePts(calls, '#5e6a50');
    assert.ok(mend.length >= 2 && mend.every(([x]) => x >= Math.min(...net.map(p => p[0])) && x <= Math.max(...net.map(p => p[0]))), `${at}: a mend in the net in another cord`);
    const grip = parts.find(p => p.col === '#8a6a48'), tag = parts.find(p => p.col === '#9a9050'), handle = parts.filter(p => p.col === '#5e646a');
    assert.ok(grip && handle.some(h => h.y0 <= grip.y1 && h.x1 >= grip.x0), `${at}: a printed grip on the jack's handle`);
    assert.ok(tag && tag.y0 >= grip.y1 - 1 && tag.x1 - tag.x0 <= 6 && tag.y1 - tag.y0 <= 6, `${at}: its temporary tag hung from it (${JSON.stringify(tag)})`);
    // scuffs low on the back wall behind where the jack is parked (#1024: on the wall, where it is drawn)
    const jack = parts.find(p => p.col === '#6a6450'), wall = backWall(r), behind = x => box.roomInto(wall.e, x, F)[0];
    const scuffs = placedRects(calls).filter(c => c.col === wallTone('#3e4c5a') && c.y >= wall.y0 && c.y + c.h <= wall.y1 && c.y > wall.y1 - 14 && c.x >= behind(jack.x0) - 2 && c.x <= behind(jack.x1) + 10);
    assert.ok(scuffs.length >= 2, `${at}: scuffs low on the wall where the jack is parked (${scuffs.length})`);
  }
});

test('in the box the hold\'s stacks stand solid on their pallets, drawn from the walls in toward the eye; the jack on the floor; the straps, the net and the rings at the front (#1024)', () => {
  for (const cargo of [0.25, 0.5, 1]) for (const pr of [0.02, 0.3, 0.5]) {
    const { r, s } = holdCase(pr, 1.17, cargo), F = r.floor, n = Math.round(12 * cargo), stacks = Math.ceil(n / 3), at = `cargo ${cargo}, ${pr}`, { calls } = holdParts(r, s);
    const e = box.roomEye(r), parts = filledParts(calls), first = col => parts.findIndex(p => p.col === col), all = placedParts(calls);
    const body = k => parts.findIndex(p => HOLD_WOOD.includes(p.col) && p.pts.some(q => near(q[0], holdCrate(r, k).x + 1.2) && near(q[1], holdCrate(r, k).y)));
    for (let c = 0; c < stacks; c++) {
      const x0 = holdCrate(r, 3 * c).x, x1 = x0 + holdCrate(r, 3 * c).w, side = x1 < e.vx ? x1 : x0 > e.vx ? x0 : null;
      for (let k = 3 * c; k < Math.min(n, 3 * c + 3); k++) {
        const col = parts[body(k)].col, y = holdCrate(r, k).y, faces = parts.filter(p => p.col === solidSide(col) && p.pts.some(q => near(q[1], y)));
        if (side === null) assert.ok(!faces.some(p => p.pts.some(q => q[0] > x0 && q[0] < x1 && near(q[1], y))), `${at}: crate ${k} across the eye shows no side`);
        else assert.ok(faces.some(p => p.pts.filter(q => near(q[0], side)).length === 2 && p.pts.some(q => Math.abs(q[0] - e.vx) < Math.abs(side - e.vx))), `${at}: crate ${k}'s side toward the eye, at ${side}`);
        if (k % 3) assert.ok(body(k) > body(k - 1), `${at}: crate ${k} drawn over the one under it`);
      }
      assert.ok(parts.some(p => p.col === SHADOW && p.pts.some(q => near(q[0], x0 + 2 - 5) && near(q[1], F))), `${at}: a shadow under the stack's pallet at ${x0}`);
    }
    const off = c => Math.abs(holdCrate(r, 3 * c).x + 20 - e.vx), order = Array.from({ length: stacks }, (_, c) => c).sort((a, b) => body(3 * a) - body(3 * b));
    for (let i = 1; i < order.length; i++) assert.ok(off(order[i]) <= off(order[i - 1]), `${at}: the stacks drawn from the walls in (${order})`);
    assert.equal(parts.filter(p => p.col === SHADOW).length, stacks + 1, `${at}: a shadow under each pallet and the jack's forks, none under a crate resting on another`);
    const lastCrate = Math.max(...Array.from({ length: n }, (_, k) => body(k))), forks = first('#6a6450');
    assert.ok(forks < Math.min(...Array.from({ length: n }, (_, k) => body(k))), `${at}: the jack, farther from the eye, drawn before the stacks`);
    assert.ok(parts.findIndex(p => p.col === '#4a4436' && p.pts.length >= 9) > lastCrate, `${at}: the straps over the stacks, at the front`);
    const ringAt = calls.findIndex(k => k[0] === 'strokeStyle' && k[1] === HOLD_RING), crateAt = calls.findIndex(k => k[0] === 'fillStyle' && HOLD_WOOD.includes(k[1]));
    assert.ok(ringAt > crateAt, `${at}: the rings in the deck drawn over the stacks' shadows`);
    for (const p of all.filter(q => ['#4a4436', '#3e3426'].includes(q.col))) assert.deepEqual(p.at, [0, 0], `${at}: the straps and the pallets at the front, unmoved`);
  }
});
test('in the box the medbay\'s cot stands on four legs with a shadow under it, the IV pole on its foot plate behind it, the cabinet solid, its supplies on its top (#1024)', () => {
  for (const pr of [0.02, 0.3, 0.5]) for (const patient of [false, true]) {
    const { r, s } = medCase(pr, 1.17, patient), F = r.floor, W = r.x1 - r.x0, X = sh => r.x0 + W * sh, at = `${patient ? 'a patient' : 'empty'}, ${pr}`, { ctx, calls } = recorder(); drawRoom(ctx, 'medbay', r, s);
    const parts = filledParts(calls), placed = placedParts(calls), e = box.roomEye(r), n2 = v => Math.round(v * 100) / 100, cot = { x0: n2(X(0.34) - 46), x1: n2(n2(X(0.34) - 46) + 108) };
    // the shadow under the cot first, its footprint widened 5 each side, half the strip deep; then the legs at its back edge, then the pole, then the cot's front
    const sh = parts.findIndex(p => p.col === SHADOW && p.pts.some(q => near(q[0], cot.x0 - 5) && near(q[1], F)) && p.pts.some(q => near(q[0], cot.x1 + 5) && near(q[1], F)));
    assert.ok(sh >= 0, `${at}: a shadow under the cot`);
    assert.ok(parts.find(p => p === parts[sh]).pts.some(q => near(q[1], box.roomInto(e, cot.x0, F, 0.5)[1])), `${at}: the shadow as deep as the cot`);
    const legs = placed.filter(p => p.col === '#1c3249' && p.pts.length === 4 && partBox(p).y1 - partBox(p).y0 > 15);
    const back = legs.filter(p => p.at[0] || p.at[1]), front = legs.filter(p => !p.at[0] && !p.at[1]);
    assert.equal(front.length, 2, `${at}: two legs at the front`); assert.equal(back.length, 2, `${at}: and two at the back`);
    for (const p of back) {  // moved to the cot's back edge, half the strip deep: up by that, and in toward the eye
      const raw = partBox(p).x0 - p.at[0];
      assert.ok(near(p.at[1], box.roomInto(e, 0, F, 0.5)[1] - F) && Math.sign(p.at[0]) === Math.sign(e.vx - raw) && Math.abs(Math.abs(p.at[0]) - Math.abs(e.vx - raw) * 0.1) < 0.5, `${at}: a back leg at ${raw} moved to the cot's back edge (${p.at})`);
    }
    const pole = parts.findIndex(p => p.col === '#4a5e74'), frame = parts.findIndex(p => p.col === '#2a4664');
    assert.ok(sh < pole && parts.indexOf(parts.find(p => p.col === '#1c3249')) < pole && pole < frame, `${at}: the pole between the cot's back and its front`);
    const foot = parts.find(p => p.col === '#20384f' && partBox(p).y1 >= F - 0.01), px = (partBox(foot).x0 + partBox(foot).x1) / 2;
    assert.ok(parts.some(p => p.col === SHADOW && p.pts.some(q => near(q[0], partBox(foot).x0 - 5) && near(q[1], F))), `${at}: a shadow under the pole's foot plate`);
    assert.ok(!parts.some(p => p.col === solidSide('#20384f')) && !parts.some(p => p.col === solidTop('#20384f')), `${at}: the pole's foot plate has no faces, only its shadow (spec section 5)`);
    // the rail along the cot's far side, at its back edge, its posts down to the mattress's back
    const rail = placed.find(p => p.col === '#3a5470' && partBox(p).x1 - partBox(p).x0 > 50);
    assert.ok(rail && near(rail.at[1], box.roomInto(e, 0, F - MED_COT, 0.5)[1] - (F - MED_COT)), `${at}: the rail moved to the cot's far side (${rail && rail.at})`);
    // the cabinet: its body and top solid, its side toward the eye; the bottles and the kit stood on its top, a little back from its front
    const cab = partBox(parts.find(p => p.col === '#4e5e6e')), top = parts.findIndex(p => p.col === '#6e7e8e');
    assert.ok(parts.some(p => p.col === solidSide('#4e5e6e') && p.pts.filter(q => near(q[0], cab.x0)).length === 2), `${at}: the cabinet's left side, toward the eye`);
    for (const col of ['#4e6a78', '#7a8692']) {
      const things = placed.filter(p => p.col === col), i = parts.findIndex(p => p.col === col);
      assert.ok(things.length && things.every(p => p.at[1] < 0 && p.at[1] > -4) && i > top, `${at}: the ${col} things on the top, drawn after it and a little back (${things.map(p => p.at)})`);
    }
  }
});
test('the medbay\'s and the hold\'s ceiling lamps are fittings too, the medbay\'s clear of the scanner arm\'s mount (#1024)', () => {
  for (const id of ['medbay', 'hold']) for (const pr of [0.02, 0.3, 0.5]) {
    const r = layoutBox(LAYOUTS.freighter, id), { ctx, calls } = recorder();
    drawRoom(ctx, id, r, RS({ w: phaseWeights(pr), well: FW, patient: true, cargo: 1, damage: { marks: new Set(), severe: false } }));
    const parts = filledParts(calls), lamps = box.roomLamps(id, r), e = box.roomEye(r), back = r.top + (r.floor - 80 - r.top) * 0.2;
    assert.equal(lamps.length, 1, `${id}: one lamp`);
    for (const x of lamps) {
      assert.ok(x - 12 >= r.x0 && x + 12 <= r.x1, `${id}: the lamp at ${x} in the room`);
      assert.ok(parts.some(p => p.pts.some(q => near(q[0], x - 12) && near(q[1], r.top)) && p.pts.some(q => near(q[1], back) && near(q[0], box.roomInto(e, x + 9, r.top)[0]))), `${id} ${pr}: the lamp at ${x}: its plate on the sliver, from the cut to the wall`);
      assert.ok(parts.some(p => p.col === '#3a4a5a' && p.outlined && near(Math.min(...p.pts.map(q => q[0])), x - 12) && near(Math.min(...p.pts.map(q => q[1])), r.top)), `${id} ${pr}: its housing hung from the ceiling`);
      assert.ok(calls.some(k => k[0] === 'strokeRect' && near(k[1], x - 10.5) && near(k[2], r.top + 3)), `${id} ${pr}: the guard over its lens`);
      assert.ok(calls.some((k, i) => k[0] === 'fillRect' && near(k[1], x - 10) && near(k[2], r.top + 3) && String(calls[i - 1][1]).startsWith('rgba(')), `${id} ${pr}: its lens lit in the lamp's colour`);
      if (id === 'medbay') for (const col of ['#5a5e60', '#20384f']) {
        const mount = parts.filter(p => p.col === col && p.outlined).map(partBox).filter(b => b.y0 <= r.top + 5);
        assert.ok(mount.length && mount.every(b => x + 12 <= b.x0 || x - 12 >= b.x1), `${id}: the fitting at ${x} clear of the scanner's mount (${JSON.stringify(mount)})`);
      }
    }
  }
});
test('a solid\'s top is a step lighter, but never brighter or more saturated than the people (#1024, #959)', () => {
  const bay = { x0: 0, x1: 400, top: 0, floor: 100 };
  for (const col of ['#1f3852', '#6e7e8e', '#78705a', '#6a6450']) {
    const { ctx, calls } = recorder(); box.roomIn([bay], () => box.roomPart(ctx, box.roomRound(20, 60, 60, 40, 1), col, { solid: 0.45 }));
    const top = filledParts(calls).find(p => p.pts.some(q => near(q[1], 60)) && p.pts.length === 4 && p.col !== col && !p.col.startsWith('rgba') && p.col !== solidSide(col));
    const v = rgbOf(top.col), f = rgbOf(col);
    assert.ok(Math.max(...v) <= 0xb0 && Math.max(...v) - Math.min(...v) <= 0x60, `${col}: its top ${top.col} under the people`);
    assert.ok(v.every((c, i) => c >= f[i]) && v.some((c, i) => c > f[i]), `${col}: its top ${top.col} lighter than its front`);
    if (col === '#1f3852') assert.equal(top.col, box.figShade(col, 1.3), 'a dark part\'s top a step lighter, as before');
  }
});

test('the bridge\'s grab bars beside the ladder are on the shaft\'s bulkheads, beside the hatches, not in the room (#1024)', () => {
  const r = layoutBox(LAYOUTS.freighter, 'bridge'), bars = calls => filledParts(calls).filter(p => p.col === '#3a5470' && p.outlined).map(p => { const xs = p.pts.map(q => q[0]), ys = p.pts.map(q => q[1]); return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) }; }).filter(b => b.y1 - b.y0 > 40 && b.x1 - b.x0 < 5);
  const room = recorder(); drawRoom(room.ctx, 'bridge', r, RS({ w: phaseWeights(0.3), well: FW, damage: { marks: new Set(), severe: false } }));
  assert.deepEqual(bars(room.calls), [], 'none drawn with the room, which the shaft is drawn over');
  const shaft = recorder(); box.roomHatchBars(shaft.ctx, FW.x0, FW.x1, r.floor);
  const on = bars(shaft.calls);
  assert.equal(on.length, 2, 'a grab bar either side of the ladder');
  // cutBulkhead (shiplife.js): the bulkhead 12 wide on its line, the hatch 8 wide in it from the floor up 92; each bar on the bulkhead, at the hatch's room side
  for (const [b, e, side] of [[on.find(q => q.x1 < FW.x0 + 6), FW.x0, -1], [on.find(q => q.x0 > FW.x1 - 6), FW.x1, 1]]) {
    assert.ok(b && b.x0 >= e - 6 && b.x1 <= e + 6, `a bar (${b && b.x0} to ${b && b.x1}) on the bulkhead at ${e}`);
    assert.ok(side < 0 ? b.x0 < e - 4 : b.x1 > e + 4, `at the hatch's room side (${b.x0} to ${b.x1})`);
    assert.ok(b.y0 >= r.floor - 92 && b.y1 <= r.floor, 'beside the hatch, inside its height');
  }
});

// #933, the gunnery on the gun deck: the fire-control console at each seat (the gunner faces it, side-on, SEAT_FACE), the gun station's grips and
// triggers, its ready lamp and the targeting scope, the status screen, the range finder and the range tables taped over it; the torpedo rack's six
// cradles holding what the ship carries (s.torpedoes, #956), each torpedo with its fins, clamps and a safety pin with its tag, the count chalked on
// the rack; the ammunition locker and the weapons locker, latched; the close-defense turret's mount in the ceiling, its lock pin, the feed chute
// and the tray with a belt of rounds; the cable conduit on the wall; the recoil plate; and the shared stool, solid. Old and patched (point 6).
// Drawn at the burn view's zoom in a window 1000, 1280 and 1600 wide.
const gun = load(['js/data.js', 'js/util.js', 'js/figures.js', 'js/layouts.js', 'js/camera.js', 'js/rooms.js'], { G: {}, Mods: { filter: (n, v) => v, emit() {}, register() {} } }, ['gunCradle', 'GUN_CRADLES', 'roomStool', 'roomIn', 'roomBays', 'FIG_SEAT']);
const GUN_PROPS = [['#1e3852', 'the consoles'], ['#2a4a6a', 'their sloped tops'], ['#3a4450', 'the gun grips'], ['#263a50', 'the ready lamp\'s housing'], ['#03121c', 'the screens'], ['#505650', 'the range finder'],
  ['#2e5468', 'its glass'], ['#16283a', 'the torpedo rack'], ['#2e4864', 'its posts'], ['#3a5068', 'its cradles'], ['#2a3a4c', 'the rack\'s header, where the count is chalked'], ['#3a4a3e', 'the ammunition locker'],
  ['#4a5058', 'the weapons locker'], ['#2c4058', 'the turret\'s mount'], ['#33475c', 'the feed chute'], ['#3e5068', 'the feed tray'], ['#8a7a50', 'the belt\'s rounds'], ['#2a4664', 'the stools'],
  [wallTone('#2e4458'), 'the cable conduit, on the wall'], [wallTone('#8a8676'), 'the range tables, on the wall'], [wallTone('#7a7058'), 'the recoil plate, on the wall']];
const GUN_WALL = ['#2e4458', '#8a8676', '#7a7058'];
const gunCase = (pr, zoom, torpedoes = 2) => ({ r: layoutBox(LAYOUTS.freighter, 'gunnery'), s: RS({ w: phaseWeights(pr), zoom, torpedoes, damage: { marks: new Set(), severe: false } }) });
const gunParts = (r, s) => { const { ctx, calls } = recorder(); drawRoom(ctx, 'gunnery', r, s); return { calls, parts: filledParts(calls).filter(p => p.outlined).map(p => ({ col: p.col, ...partBox(p) })) }; };
test('the gunnery is drawn to the figures\' standard in every phase: its props outlined and a step below the people, the name on clear wall (#933)', () => {
  for (const torpedoes of [0, 2, 6]) for (const pr of [0.02, 0.3, 0.45, 0.5]) for (const zoom of [0.82, 1.17, 1.45]) {
    const { r, s } = gunCase(pr, zoom, torpedoes), at = `${torpedoes} torpedoes, ${pr}, ${zoom}`;
    const c = fakeCtx(); drawRoom(c, 'gunnery', r, s); assert.equal(c.depth, 0, `${at}: every save restored`);
    for (const f of c.fonts) assert.ok(Number(/(\d+(?:\.\d+)?)px/.exec(f)[1]) >= 12, `${at}: ${f}`);
    assert.ok(!c.calls.includes('fillText'), `${at}: no text in the room (the recoil plate is marks)`);
    const { ctx, calls } = recorder(); drawRoom(ctx, 'gunnery', r, s);
    const fills = col => calls.filter(k => k[0] === 'fillStyle' && k[1] === col).length;
    for (const [col, what] of GUN_PROPS) assert.ok(fills(col) >= 1, `${at}: ${what} (${col})`);
    for (const col of GUN_WALL) assert.equal(fills(col), 0, `${at}: nothing on the wall in its own colour (${col})`);
    // in the box (#1024): the consoles' tops, the ammunition locker and the stools' pads solid, their tops showing; the rack, the lockers and the
    // consoles show their side toward the eye; a contact shadow under each console, the rack, each locker and each stool's foot
    for (const [col, what] of [['#2a4a6a', 'the consoles\' tops'], ['#3a4a3e', 'the ammunition locker'], ['#2a4664', 'the stools\' pads']]) assert.ok(fills(solidTop(col)) >= 1, `${at}: ${what} solid, a top showing`);
    for (const [col, what] of [['#1e3852', 'the consoles'], ['#16283a', 'the rack'], ['#3a4a3e', 'the ammunition locker'], ['#4a5058', 'the weapons locker']]) assert.ok(fills(solidSide(col)) >= 1, `${at}: ${what}' side toward the eye`);
    assert.ok(fills(SHADOW) >= 7, `${at}: contact shadows on the strip (${fills(SHADOW)})`);
    const outlined = filledParts(calls).filter(p => p.outlined);
    assert.ok(outlined.length >= 60 + 5 * torpedoes, `${at}: the props outlined like the figures (${outlined.length})`);
    for (const { col } of outlined.filter(p => rgbOf(p.col))) {
      const v = rgbOf(col);
      assert.ok(Math.max(...v) <= 0xb0 && Math.max(...v) - Math.min(...v) <= 0x60, `${at}: ${col} is near-white or saturated, brighter than the people`);
    }
    for (const col of ['#b8903a', '#d8b060', '#c9b98f', '#c9a227', '#ffb030']) assert.equal(fills(col), 0, `${at}: no bright block (${col})`);
    // the room's name (shiplife.js: 13px on a plate at its top left) on clear wall, where each thing is drawn (the wall's things moved onto it)
    const name = { x0: r.x0, x1: r.x0 + 12 + 60 / zoom, y0: r.top + 8 - 1 / zoom, y1: r.top + 8 + 17 / zoom }, hit = (b, x, y) => x > b.x0 && x < b.x1 && y > b.y0 && y < b.y1;
    for (const { k, v, pts } of roomOwnPlaced('gunnery', r, s)) for (const [x, y] of pts) assert.ok(!hit(name, x, y), `${at}: ${k} ${v} at ${x}, ${y} under the room's name`);
    // what is on the wall is on the back wall, where it is drawn
    const wall = backWall(r), placed = placedParts(calls).map(p => ({ col: p.col, at: p.at, ...partBox(p) }));
    for (const col of GUN_WALL) for (const p of placed.filter(q => q.col === wallTone(col))) assert.ok(p.x0 >= wall.x0 && p.x1 <= wall.x1 && p.y0 >= wall.y0 - 4.5 && p.y1 <= wall.y1 && (p.at[0] || p.at[1]), `${at}: ${col} (${JSON.stringify(p)}) on the back wall`);
  }
  const stillAt = t => { const { r, s } = gunCase(0.5, 1.17), c = fakeCtx(); drawRoom(c, 'gunnery', r, { ...s, still: true, time: t }); return c.args.join('|'); };
  assert.equal(stillAt(1.3), stillAt(4.9), 'the same frame at any time under reduced motion');
});
test('the gunnery\'s torpedo rack holds what the ship carries: that many torpedoes in its six cradles, the rest empty, the count chalked on it (#933, #956)', () => {
  assert.equal(gun.GUN_CRADLES, 6, 'six cradles, the magazine\'s six (TORP_MAX, torpedoes.js)');
  for (const n of [0, 1, 2, 5, 6]) for (const zoom of [0.82, 1.17, 1.45]) {
    const { r, s } = gunCase(0.3, zoom, n), F = r.floor, at = `${n}, ${zoom}`, { calls, parts } = gunParts(r, s);
    const bodies = parts.filter(p => p.col === '#5a6458');
    assert.equal(bodies.length, n, `${at}: ${n} torpedoes (${bodies.length})`);
    for (let k = 0; k < gun.GUN_CRADLES; k++) {
      const c = gun.gunCradle(r, k), on = bodies.filter(p => near(p.x0, c.x) && near(p.y0, c.y) && near(p.x1, c.x + c.w) && near(p.y1, c.y + c.h));
      assert.equal(on.length, k < n ? 1 : 0, `${at}: cradle ${k} ${k < n ? 'holds a torpedo' : 'empty'}`);
      assert.ok(c.y + c.h <= F - 4 && c.y >= F - 84 && c.w >= 44 && c.w <= 60 && c.h <= 9, `${at}: cradle ${k} (${JSON.stringify(c)}) in the rack, a torpedo a person can lift with a hand (#960)`);
      if (k) assert.ok(gun.gunCradle(r, k - 1).y - c.y >= 12, `${at}: cradle ${k} over cradle ${k - 1}, room for the fins`);
      assert.equal(parts.filter(p => p.col === '#3a5068' && p.y0 >= c.y + c.h - 2 && p.y1 <= c.y + c.h + 2 && p.x0 >= c.x - 1 && p.x1 <= c.x + c.w + 1).length, 2, `${at}: cradle ${k} on two saddles`);
      const clamps = parts.filter(p => p.col === '#6a7480' && p.x0 >= c.x && p.x1 <= c.x + c.w && p.y1 > c.y - 2 && p.y0 < c.y + c.h + 1);
      if (k < n) assert.ok(clamps.filter(p => p.y0 <= c.y && p.y1 >= c.y + c.h).length === 2, `${at}: torpedo ${k} held by two clamps closed over it`);
      else assert.ok(clamps.length === 2 && clamps.every(p => p.y1 <= c.y + c.h && p.y1 - p.y0 < c.h), `${at}: cradle ${k}'s clamps open`);
    }
    assert.equal(parts.filter(p => p.col === '#454c44').length, 3 * n, `${at}: each torpedo's tail and two fins`);
    const tags = parts.filter(p => p.col === '#8e3a32');
    assert.equal(tags.length, n, `${at}: a safety pin's tag on each torpedo`);
    for (const t of tags) assert.ok(t.x1 - t.x0 <= 5 && t.y1 - t.y0 <= 6 && bodies.some(b => t.x0 >= b.x0 && t.x1 <= b.x1 && t.y0 >= b.y1 - 1 && t.y0 <= b.y1 + 2), `${at}: a tag (${JSON.stringify(t)}) hung under its torpedo`);
    // the count chalked on the rack's header: one mark a torpedo, marks not text
    const head = parts.find(p => p.col === '#2a3a4c'), chalk = calls.flatMap((k, i) => k[0] === 'fillStyle' && k[1] === '#a09c8e' && calls[i + 1][0] === 'fillRect' ? [calls[i + 1].slice(1)] : []);
    assert.equal(chalk.length, n, `${at}: ${n} chalk marks (${chalk.length})`);
    for (const [x, y, w, h] of chalk) assert.ok(x >= head.x0 && x + w <= head.x1 && y >= head.y0 && y + h <= head.y1 && w <= 1 && h <= 5, `${at}: a chalk mark on the header`);
    assert.equal(calls.filter(k => k[0] === 'fillText').length, 0, `${at}: no text`);
  }
});
test('the gunnery is sized to a person: a console at the waist in front of each seat, its screens at the seated eye, the lockers and the rack under the head, the stool at the seat (#933, #1041)', () => {
  const { r } = gunCase(0.3, 1.45), F = r.floor, W = r.x1 - r.x0;
  const sitter = drawPerson(fakeCtx(), { name: 'work-sit', face: -1, frame: 0, view: 'side' }, 0, F, { color: '#ffb347' });
  assert.ok(Math.abs(F - sitter.head.y - 50.71) < 0.01, `the seated figure's head where it was (${F - sitter.head.y})`);
  for (const pr of [0.02, 0.3, 0.5]) {
    const { s } = gunCase(pr, 1.45, 6), { calls, parts } = gunParts(r, s), at = `${pr}`;
    const tops = parts.filter(p => p.col === '#2a4a6a'), glass = placedRects(calls).filter(q => q.col === '#03121c');
    for (const f of SEATS.gunnery) {
      const x = r.x0 + W * f, top = tops.find(p => p.x1 <= x - 10 && p.x1 >= x - 24);
      assert.ok(top, `${at}: a console in front of the seat at ${f}, the way it faces (SEAT_FACE -1)`);
      assert.ok(F - top.y0 >= 36 && F - top.y0 <= 44 && F - top.y1 >= 30, `${at}: its top at the waist (${F - top.y0})`);
      const g = glass.find(q => q.x >= top.x0 - 1 && q.x + q.w <= top.x1 + 1);
      assert.ok(g, `${at}: a screen on the console at ${f}`);
      assert.ok(Math.abs(F - (g.y + g.h / 2) - (F - sitter.head.y)) <= 4 && g.y + g.h <= top.y0, `${at}: the screen at ${f} at the seated gunner's eye (${F - (g.y + g.h / 2)}), on the console`);
    }
    const grips = parts.filter(p => /^#(3a4450|4a4640)$/.test(p.col) && p.y1 - p.y0 >= 6), seat0 = r.x0 + W * SEATS.gunnery[0];
    assert.equal(grips.length, 2, `${at}: two grips`);
    for (const g of grips) assert.ok(g.x1 <= seat0 - 14 && g.x0 >= seat0 - 40 && F - g.y0 >= 42 && F - g.y0 <= 54, `${at}: a grip (${JSON.stringify(g)}) at the seated gunner's hands`);
    const triggers = calls.flatMap((k, i) => k[0] === 'fillStyle' && k[1] === '#8e3a32' && calls[i + 1][0] === 'fillRect' ? [calls[i + 1].slice(1)] : []);
    assert.ok(grips.every(g => triggers.some(([x, y, w, h]) => x + w <= g.x0 + 0.5 && x + w >= g.x0 - 1 && y >= g.y0 && y + h <= g.y1)), `${at}: a trigger on the front of each grip`);
    const weap = parts.find(p => p.col === '#4a5058' && p.y1 - p.y0 > 60), ammo = parts.find(p => p.col === '#3a4a3e' && p.x1 - p.x0 > 20);
    assert.ok(weap && F - weap.y0 >= 84 && F - weap.y0 <= 92 && weap.y1 >= F - 4, `${at}: the weapons locker at head height (${weap && F - weap.y0})`);
    assert.ok(ammo && F - ammo.y0 >= 36 && F - ammo.y0 <= 48 && ammo.y1 >= F - 1, `${at}: the ammunition locker at the waist (${ammo && F - ammo.y0})`);
    const rack = parts.find(p => p.col === '#16283a');
    assert.ok(rack && F - rack.y0 <= FIG_TALL - 4 && rack.x0 > seat0 && rack.x1 < weap.x0 && rack.x1 < ammo.x0, `${at}: the rack (${JSON.stringify(rack)}) under a person's head, beside the lockers`);
    assert.ok(weap.x1 <= r.x1 - 4 && rack.x0 > r.x0 + W * SEATS.gunnery[1] + 14, `${at}: the rack and the lockers clear of the second seat's chair, in the room`);
    // the turret's feed tray over the ammunition locker, the belt in it and down into the locker; the lock pin through the turret's mount
    const tray = parts.find(p => p.col === '#3e5068'), mount = parts.find(p => p.col === '#2c4058'), chute = parts.find(p => p.col === '#33475c');
    assert.ok(mount.y0 <= r.top + 0.5 && chute.y0 <= mount.y1 + 0.5 && chute.y1 >= tray.y0 - 0.5, `${at}: the chute from the turret's mount in the ceiling down to the tray`);
    assert.ok(tray.x0 >= ammo.x0 - 4 && tray.x1 <= ammo.x1 + 4 && tray.y1 < ammo.y0 - 8 && F - tray.y0 <= 72, `${at}: the tray over the ammunition locker, in reach`);
    const rounds = parts.filter(p => p.col === '#8a7a50');
    assert.ok(rounds.filter(p => p.y1 <= tray.y1 + 1 && p.y0 >= tray.y0 - 5).length >= 5 && rounds.some(p => p.y0 > tray.y1 && p.y1 <= ammo.y0 + 1), `${at}: a belt of rounds in the tray and down to the locker`);
    for (const p of rounds) assert.ok(p.x1 - p.x0 <= 3 && p.y1 - p.y0 <= 6, `${at}: a round, small`);
    // the stools, solid on the floor, at the seat's height, each with its back behind the gunner and a harness on it
    const pads = parts.filter(p => p.col === '#2a4664' && p.x1 - p.x0 >= 16);
    assert.equal(pads.length, SEATS.gunnery.length, `${at}: a stool at each seat`);
    for (const f of SEATS.gunnery) {
      const x = r.x0 + W * f, pad = pads.find(p => Math.abs((p.x0 + p.x1) / 2 - x) < 0.6);
      assert.ok(pad && Math.abs(F - pad.y0 - gun.FIG_SEAT) <= 0.01, `${at}: the stool at ${f} at the seat's height, ${gun.FIG_SEAT} (${pad && F - pad.y0})`);
      assert.ok(parts.some(p => p.col === '#2a4664' && p.y1 - p.y0 > 20 && p.x0 > x + 4 && p.x1 < x + 16), `${at}: its back on the right, behind someone facing left`);
      assert.ok(calls.some(k => k[0] === 'fillStyle' && k[1] === SHADOW) && filledParts(calls).some(p => p.col === SHADOW && p.pts.some(q => near(q[1], F) && q[0] < x - 8 && q[0] > x - 20)), `${at}: its shadow on the strip`);
    }
  }
});
test('the shared stool stands solid, at the seat\'s height, with its shadow; the medbay\'s has no back (#1041)', () => {
  const bay = { x0: 0, x1: 400, top: 0, floor: 100 };
  for (const back of [0, 1, -1]) for (const x of [60, 340]) {
    const { ctx, calls } = recorder(); gun.roomIn([bay], () => gun.roomStool(ctx, x, 100, back));
    const parts = filledParts(calls), at = `back ${back} at ${x}`;
    assert.equal(calls.filter(k => k[0] === 'save').length, calls.filter(k => k[0] === 'restore').length);
    const pad = parts.find(p => p.col === '#2a4664' && p.outlined && partBox(p).x1 - partBox(p).x0 >= 16);
    assert.ok(pad && near(100 - partBox(pad).y0, gun.FIG_SEAT), `${at}: its pad at ${gun.FIG_SEAT}`);
    assert.ok(parts.some(p => p.col === solidTop('#2a4664')), `${at}: the pad's top showing`);
    assert.ok(parts.some(p => p.col === solidSide('#2a4664') && p.pts.filter(q => near(q[0], x < 200 ? partBox(pad).x1 : partBox(pad).x0)).length === 2), `${at}: its side toward the eye`);
    assert.equal(parts.filter(p => p.col === SHADOW).length, 1, `${at}: one contact shadow, under its foot`);
    const shadow = partBox(parts.find(p => p.col === SHADOW));
    assert.ok(near(shadow.y1, 100) && shadow.x0 < x - 8 && shadow.x1 > x + 8, `${at}: the shadow under its foot`);
    const backs = parts.filter(p => p.col === '#2a4664' && p.outlined && partBox(p).y1 - partBox(p).y0 > 20);
    if (!back) assert.equal(backs.length, 0, `${at}: a stool, no back`);
    else assert.ok(backs.length === 1 && (back > 0 ? partBox(backs[0]).x1 < x - 6 : partBox(backs[0]).x0 > x + 6), `${at}: the back behind the sitter`);
  }
});
test('the gunnery reads old and patched: a newer locker bolted on an older plinth, a grip replaced, wear where hands go, a printed mount tagged temporary, tape and cable ties (#933)', () => {
  for (const pr of [0.02, 0.3, 0.5]) {
    const { r, s } = gunCase(pr, 1.17, 2), at = `${pr}`, { calls, parts } = gunParts(r, s);
    const rects = col => calls.flatMap((k, i) => k[0] === 'fillStyle' && k[1] === col && calls[i + 1][0] === 'fillRect' ? [calls[i + 1].slice(1)] : []);
    const inside = ([x, y, w, h], b) => x >= b.x0 - 0.01 && x + w <= b.x1 + 0.01 && y >= b.y0 - 0.01 && y + h <= b.y1 + 0.01;
    const weap = parts.find(p => p.col === '#4a5058' && p.y1 - p.y0 > 60), plinth = parts.find(p => p.col === '#24384c');
    assert.ok(plinth && plinth.y0 >= weap.y1 - 0.5 && plinth.x0 <= weap.x0 + 1 && plinth.x1 >= weap.x1 - 1, `${at}: the weapons locker, newer, on an older plinth`);
    assert.ok(rects('#8a929a').filter(b => b[1] >= plinth.y0 - 0.5).length >= 2, `${at}: fresh bolts in the plinth`);
    const grips = parts.filter(p => /^#(3a4450|4a4640)$/.test(p.col) && p.y1 - p.y0 >= 6);
    assert.ok(new Set(grips.map(p => p.col)).size === 2, `${at}: one grip a replacement in another finish`);
    const top = parts.filter(p => p.col === '#2a4a6a').sort((a, b) => a.x0 - b.x0)[0];
    assert.ok(rects('#7e8a94').filter(c => inside(c, { ...top, y0: top.y0 - 1, y1: top.y1 + 1 }) && c[0] >= grips[0].x0 - 14).length >= 2, `${at}: paint worn off the console's edge by the grips`);
    assert.ok(rects('#4e5a50').length >= 2 && rects('#4e5a50').every(c => inside(c, parts.find(p => p.col === '#3a4a3e' && p.x1 - p.x0 > 20))), `${at}: scuffs on the ammunition locker`);
    const clamp = parts.find(p => p.col === '#8a6a48'), tag = parts.find(p => p.col === '#9a9050'), finder = parts.find(p => p.col === '#505650');
    assert.ok(clamp && finder && clamp.y0 >= finder.y1 - 1.5 && clamp.x0 < finder.x1 && clamp.x1 > finder.x0, `${at}: the range finder on a printed mount`);
    assert.ok(tag && tag.y0 >= clamp.y0 && tag.x1 - tag.x0 <= 6 && tag.y1 - tag.y0 <= 6, `${at}: its temporary tag (${JSON.stringify(tag)})`);
    const placed = placedParts(calls).map(p => ({ col: p.col, ...partBox(p) })), conduit = placed.filter(p => p.col === wallTone('#2e4458'));
    const tape = placed.filter(p => p.col === wallTone('#7a7462')), ties = placedRects(calls).filter(q => q.col === wallTone('#1e2a36'));
    assert.ok(tape.some(t => conduit.some(c => t.x0 < c.x1 && t.x1 > c.x0 && t.y0 < c.y1 && t.y1 > c.y0)), `${at}: tape round the conduit`);
    assert.ok(ties.length >= 2 && ties.every(t => conduit.some(c => t.x < c.x1 && t.x + t.w > c.x0 && t.y < c.y1 && t.y + t.h > c.y0)), `${at}: cable ties on the conduit`);
    assert.ok(rects('#5a6a4e').length >= 3, `${at}: the stencil on the ammunition locker, marks`);
    // the turret's lock pin, its ring and its tag on a lanyard
    const mount = parts.find(p => p.col === '#2c4058'), lock = rects('#9aa4ae'), ltag = parts.find(p => p.col === '#8a4436');
    assert.ok(lock.some(([x, y, w]) => y >= mount.y0 && y <= mount.y1 && x < mount.x1 && x + w > mount.x1), `${at}: the lock pin through the turret's mount`);
    assert.ok(ltag && ltag.y0 > mount.y1 && ltag.x1 - ltag.x0 <= 6, `${at}: its tag hung on a lanyard`);
  }
});
test('the gunnery\'s ceiling lamp is a fitting, clear of the turret\'s mount; the screens show the phase, the flip its heading (#1024, #933)', () => {
  for (const pr of [0.02, 0.3, 0.5]) {
    const r = layoutBox(LAYOUTS.freighter, 'gunnery'), { calls, parts } = gunParts(r, RS({ w: phaseWeights(pr), well: FW, torpedoes: 2, damage: { marks: new Set(), severe: false } })), [x] = box.roomLamps('gunnery', r);
    assert.ok(parts.some(p => p.col === '#3a4a5a' && near(p.x0, x - 12) && near(p.y0, r.top)), `${pr}: the lamp's housing hung from the ceiling at ${x}`);
    assert.ok(calls.some(k => k[0] === 'strokeRect' && near(k[1], x - 10.5) && near(k[2], r.top + 3)), `${pr}: the guard over its lens`);
    const mount = parts.find(p => p.col === '#2c4058');
    assert.ok(x + 12 <= mount.x0 || x - 12 >= mount.x1, `${pr}: clear of the turret's mount`);
    if (pr === 0.5) assert.ok(filledParts(calls).some(p => p.col === '#c8903a') && calls.some(k => k[0] === 'rotate'), `${pr}: the heading arrow turning at the flip`);
    else assert.ok(!calls.some(k => k[0] === 'rotate'), `${pr}: no heading arrow off the flip`);
  }
});
// #933, the engine room on the drive deck: the reactor housing (bands, bolted panels, the maintenance hatch with its wheel and latches, the
// injector cover, the core's sight port, the telltales, warning marks, the drive's lines down through the deck, the coolant up into the
// ceiling); the drive's fuel, deuterium (docs/bible/technology.md), in two cryo bottles in their rack with bands, valves and warning marks;
// the reaction mass's feed down from the tank, its pump, and the level gauge on the wall reading the tank (s.fuel); the gauges at eye height,
// the wall slate, the pipes along the wall and the ceiling, the valve wheels; the tool board over the bench, one tool out; the bench at the
// waist with the engineer's terminal. Old and patched (point 6). Drawn at the burn view's zoom in a window 1000, 1280 and 1600 wide.
const ENGINE_PROPS = [['#2c4258', 'the reactor housing'], ['#3a5268', 'its bands'], ['#30485f', 'its hatch'], ['#33495f', 'the injector cover'], ['#1a2c40', 'the core\'s sight port'],
  ['#34485c', 'the drive\'s lines'], ['#4a5a50', 'the old fuel bottle'], ['#5a6470', 'the newer one'], ['#2e3a36', 'the bottles\' bands'], ['#24384c', 'their rack'], ['#3a4a56', 'the feed pump'],
  ['#3d5a7a', 'the pipes'], ['#4f6f8f', 'their flanges'], ['#3a4048', 'the bench'], ['#03121c', 'the terminal\'s screen'], ['#7a7058', 'the warning plate'],
  [wallTone('#22384e'), 'the gauge panel, on the wall'], [wallTone('#a8a28e'), 'the gauges\' faces, on the wall'], [wallTone('#4a4234'), 'the tool board, on the wall'],
  [wallTone('#6a7078'), 'the tools, on the wall'], [wallTone('#1e2a2c'), 'the wall slate'], [wallTone('#2a3a4c'), 'the level gauge\'s frame, on the wall'], [wallTone('#0c1620'), 'its glass'],
  [wallTone('#3d5a7a'), 'the pipe along the wall']];
const ENGINE_WALL = ['#22384e', '#a8a28e', '#4a4234', '#6a7078', '#1e2a2c', '#2a3a4c', '#0c1620'];
const ENGINE_WATER = 'rgba(70,140,190,0.6)', ENGINE_VALVE = '#8a3a30';
const engCase = (pr, zoom, fuel = 0.5, burning = true) => ({ r: layoutBox(LAYOUTS.freighter, 'engine'), s: RS({ w: phaseWeights(pr), zoom, fuel, burning, well: FW, damage: { marks: new Set(), severe: false } }) });
const engParts = (r, s) => { const { ctx, calls } = recorder(); drawRoom(ctx, 'engine', r, s); return { calls, parts: filledParts(calls).filter(p => p.outlined).map(p => ({ col: p.col, ...partBox(p) })) }; };
test('the engine room is drawn to the figures\' standard in every phase: its props outlined and a step below the people, the name on clear wall (#933)', () => {
  for (const fuel of [0, 0.5, 1]) for (const pr of [0.02, 0.3, 0.45, 0.5]) for (const zoom of [0.82, 1.17, 1.45]) {
    const { r, s } = engCase(pr, zoom, fuel), at = `fuel ${fuel}, ${pr}, ${zoom}`;
    const c = fakeCtx(); drawRoom(c, 'engine', r, s); assert.equal(c.depth, 0, `${at}: every save restored`);
    for (const f of c.fonts) assert.ok(Number(/(\d+(?:\.\d+)?)px/.exec(f)[1]) >= 12, `${at}: ${f}`);
    assert.ok(!c.calls.includes('fillText'), `${at}: no text in the room (the stencils are marks)`);
    const { ctx, calls } = recorder(); drawRoom(ctx, 'engine', r, s);
    const fills = col => calls.filter(k => k[0] === 'fillStyle' && k[1] === col).length;
    for (const [col, what] of ENGINE_PROPS) assert.ok(fills(col) >= 1, `${at}: ${what} (${col})`);
    for (const col of ENGINE_WALL) assert.equal(fills(col), 0, `${at}: nothing on the wall in its own colour (${col})`);
    assert.ok(calls.filter(k => k[0] === 'strokeStyle' && k[1] === ENGINE_VALVE).length + calls.filter(k => k[0] === 'strokeStyle' && k[1] === wallTone(ENGINE_VALVE)).length >= 3, `${at}: valve wheels`);
    // in the box (#1024): the bottles, the pump and the bench solid, their tops and their sides toward the eye showing; the housing, which
    // straddles the eye, and the rest stand with contact shadows on the strip
    for (const [col, what] of [['#4a5a50', 'the old bottle'], ['#5a6470', 'the newer bottle'], ['#3a4a56', 'the pump'], ['#4a5058', 'the bench\'s top']]) assert.ok(fills(solidTop(col)) >= 1, `${at}: ${what} solid, a top showing`);
    for (const [col, what] of [['#4a5a50', 'the old bottle'], ['#5a6470', 'the newer bottle'], ['#3a4a56', 'the pump'], ['#3a4048', 'the bench']]) assert.ok(fills(solidSide(col)) >= 1, `${at}: ${what}'s side toward the eye`);
    assert.equal(fills(solidSide('#2c4258')), 0, `${at}: the housing straddles the eye, no side`);
    assert.ok(fills(SHADOW) >= 5, `${at}: contact shadows on the strip (${fills(SHADOW)})`);
    const outlined = filledParts(calls).filter(p => p.outlined);
    assert.ok(outlined.length >= 80, `${at}: the props outlined like the figures (${outlined.length})`);
    for (const { col } of outlined.filter(p => rgbOf(p.col))) {
      const v = rgbOf(col);
      assert.ok(Math.max(...v) <= 0xb0 && Math.max(...v) - Math.min(...v) <= 0x60, `${at}: ${col} is near-white or saturated, brighter than the people`);
    }
    for (const col of ['#e6dfc9', '#c0392b', '#c9a227', '#ffe2b8', '#ff8a6a']) assert.equal(fills(col), 0, `${at}: no bright block (${col})`);
    // the room's name (shiplife.js: 13px on a plate at its top left) on clear wall, where each thing is drawn (the wall's things moved onto it)
    const name = { x0: r.x0, x1: r.x0 + 12 + 60 / zoom, y0: r.top + 8 - 1 / zoom, y1: r.top + 8 + 17 / zoom }, hit = (b, x, y) => x > b.x0 && x < b.x1 && y > b.y0 && y < b.y1;
    for (const { k, v, pts } of roomOwnPlaced('engine', r, s)) for (const [x, y] of pts) assert.ok(!hit(name, x, y), `${at}: ${k} ${v} at ${x}, ${y} under the room's name`);
    // what is on the wall is on the back wall, where it is drawn
    const wall = backWall(r), placed = placedParts(calls).map(p => ({ col: p.col, at: p.at, ...partBox(p) }));
    for (const col of ENGINE_WALL) for (const p of placed.filter(q => q.col === wallTone(col))) assert.ok(p.x0 >= wall.x0 && p.x1 <= wall.x1 && p.y0 >= wall.y0 && p.y1 <= wall.y1 && (p.at[0] || p.at[1]), `${at}: ${col} (${JSON.stringify(p)}) on the back wall`);
  }
  const stillAt = t => { const { r, s } = engCase(0.5, 1.17), c = fakeCtx(); drawRoom(c, 'engine', r, { ...s, still: true, time: t }); return c.args.join('|'); };
  assert.equal(stillAt(1.3), stillAt(4.9), 'the same frame at any time under reduced motion');
});
test('the engine room\'s level gauge reads the reaction mass in the tank over it (s.fuel): empty, half and full (#933)', () => {
  for (const zoom of [0.82, 1.17, 1.45]) {
    const read = fuel => {
      const { r, s } = engCase(0.3, zoom, fuel), { ctx, calls } = recorder(); drawRoom(ctx, 'engine', r, s);
      const glass = placedParts(calls).filter(p => p.col === wallTone('#0c1620')).map(partBox), water = placedRects(calls).filter(q => q.col === ENGINE_WATER);
      return { glass, water, r };
    };
    for (const fuel of [0, 0.5, 1]) {
      const { glass, water, r } = read(fuel), at = `${fuel}, ${zoom}`;
      assert.equal(glass.length, 1, `${at}: one level gauge`);
      const g = glass[0], inner = g.y1 - g.y0 - 2;
      assert.ok(g.y1 - g.y0 >= 30 && g.x1 - g.x0 <= 8, `${at}: a tall narrow glass (${JSON.stringify(g)})`);
      assert.ok(r.floor - (g.y0 + g.y1) / 2 >= 40 && r.floor - g.y0 <= 84, `${at}: read standing, under the eye (${r.floor - g.y0})`);
      if (fuel === 0) { assert.ok(water.every(q => q.h <= 0.01), `${at}: an empty glass`); continue; }
      assert.equal(water.length, 1, `${at}: the water in the glass`);
      const q = water[0];
      assert.ok(q.x >= g.x0 && q.x + q.w <= g.x1, `${at}: in the glass`);
      assert.ok(near(q.y + q.h, g.y1 - 1) && Math.abs(q.h - inner * fuel) < 0.01, `${at}: filled to ${fuel} (${q.h} of ${inner})`);
    }
  }
});
test('the engine room is sized to a person: the housing the one big thing under the ceiling, the bottles under the shoulder, the bench at the waist, the gauges at the eye (#933, #960)', () => {
  for (const pr of [0.02, 0.3, 0.5]) {
    const { r, s } = engCase(pr, 1.17), F = r.floor, W = r.x1 - r.x0, at = `${pr}`, { calls, parts } = engParts(r, s);
    const housing = parts.find(p => p.col === '#2c4258' && p.x1 - p.x0 > 60);
    assert.ok(housing, `${at}: the housing`);
    assert.ok(F - housing.y0 >= FIG_TALL - 2 && F - housing.y0 <= 92 && housing.y1 >= F - 1 && housing.x1 - housing.x0 <= 100, `${at}: the housing a little over a person, under the ceiling (${JSON.stringify(housing)})`);
    assert.ok(Math.abs((housing.x0 + housing.x1) / 2 - (r.x0 + W / 2)) < 1, `${at}: the housing in the middle of the room, under its lamp`);
    for (const p of parts.filter(q => q.x1 - q.x0 > 40 && q.y1 - q.y0 > 40 && q.col !== '#2c4258')) assert.ok(p.x1 - p.x0 < housing.x1 - housing.x0 || p.y1 - p.y0 < housing.y1 - housing.y0, `${at}: nothing as big as the housing (${JSON.stringify(p)})`);
    const bottles = parts.filter(p => /^#(4a5a50|5a6470)$/.test(p.col) && p.y1 - p.y0 > 30);
    assert.equal(bottles.length, 2, `${at}: two fuel bottles`);
    for (const b of bottles) assert.ok(F - b.y0 >= 40 && F - b.y0 <= 60 && b.x1 - b.x0 <= 26 && b.y1 >= F - 6, `${at}: a bottle (${JSON.stringify(b)}) under the shoulder, two can lift it empty`);
    const bands = parts.filter(p => p.col === '#2e3a36');
    assert.ok(bottles.every(b => bands.filter(q => q.x0 <= b.x0 + 1 && q.x1 >= b.x1 - 1 && q.y0 >= b.y0 && q.y1 <= b.y1).length >= 2), `${at}: two bands on each bottle`);
    const bench = parts.find(p => p.col === '#4a5058' && p.x1 - p.x0 > 60);
    assert.ok(bench && F - bench.y0 >= 38 && F - bench.y0 <= 42, `${at}: the bench's top at the waist (${bench && F - bench.y0})`);
    assert.ok(bench.x0 > housing.x1 && bench.x1 <= r.x1 - 4, `${at}: the bench beside the housing, in the room`);
    const pump = parts.find(p => p.col === '#3a4a56' && p.x1 - p.x0 > 30);
    assert.ok(pump && F - pump.y0 <= 34 && pump.x1 < housing.x0 && pump.x0 > Math.max(...bottles.map(b => b.x1)), `${at}: the pump low, between the bottles and the housing`);
    // the wall's things where they are drawn: the gauges at the eye, the tool board over the bench, the slate beside the gauge
    const placed = placedParts(calls).map(p => ({ col: p.col, ...partBox(p) })), faces = placed.filter(p => p.col === wallTone('#a8a28e') && p.x1 - p.x0 >= 8);
    assert.ok(faces.length >= 3, `${at}: three gauges on the panel (${faces.length})`);
    for (const g of faces) assert.ok(Math.abs(F - (g.y0 + g.y1) / 2 - 77) <= 4, `${at}: a gauge at eye height (${F - (g.y0 + g.y1) / 2})`);
    const board = placed.find(p => p.col === wallTone('#4a4234'));
    assert.ok(board && board.x0 >= bench.x0 - 30 && board.x1 <= bench.x1 && board.y1 <= bench.y0 - 8 && F - board.y0 <= 90, `${at}: the tool board on the wall over the bench (${JSON.stringify(board)})`);
    const valves = strokePts(calls, ENGINE_VALVE).concat(strokePts(calls, wallTone(ENGINE_VALVE)));
    assert.ok(valves.every(([, y]) => F - y >= 20 && F - y <= 85), `${at}: the valve wheels in reach`);
    assert.ok(F - Math.max(...bottles.map(b => b.y0)) <= 60, `${at}: the bottles under the room's name`);
  }
});
test('the engine room\'s reactor housing: bands, bolted panels, the hatch with its wheel and latches, warning marks, the drive\'s lines down through the deck, the coolant up into the ceiling (#933)', () => {
  for (const pr of [0.02, 0.3, 0.5]) {
    const { r, s } = engCase(pr, 1.17), F = r.floor, T = r.top, at = `${pr}`, { calls, parts } = engParts(r, s);
    const housing = parts.find(p => p.col === '#2c4258' && p.x1 - p.x0 > 60), inH = p => p.x0 >= housing.x0 - 2 && p.x1 <= housing.x1 + 2 && p.y0 >= housing.y0 - 2 && p.y1 <= housing.y1 + 2;
    assert.ok(parts.filter(p => p.col === '#3a5268' && inH(p) && p.x1 - p.x0 >= housing.x1 - housing.x0 - 1).length >= 2, `${at}: bands round the housing`);
    const hatch = parts.find(p => p.col === '#30485f');
    assert.ok(hatch && inH(hatch) && hatch.x1 - hatch.x0 >= 20 && hatch.x1 - hatch.x0 <= 34, `${at}: a maintenance hatch a person fits through, on the housing`);
    assert.ok(calls.some(k => k[0] === 'arc' && k[1] > hatch.x0 && k[1] < hatch.x1 && k[2] > hatch.y0 && k[2] < hatch.y1), `${at}: the hatch's wheel`);
    assert.ok(placedRects(calls).filter(q => q.col === '#56708c' || q.col === '#8796a5').length + calls.filter(k => k[0] === 'fillStyle' && k[1] === '#56708c').length >= 8, `${at}: bolts and latches`);
    const plate = parts.find(p => p.col === '#7a7058');
    assert.ok(plate && inH(plate) && plate.x1 - plate.x0 <= 14, `${at}: a warning plate on the housing, a pictogram`);
    const lines = parts.filter(p => p.col === '#34485c');
    assert.ok(lines.length >= 2 && lines.every(p => p.y1 >= F + 8 && p.y0 <= F), `${at}: the drive's lines down through the deck (${JSON.stringify(lines)})`);
    const ups = parts.filter(p => p.col === '#3d5a7a' && p.y0 <= T + 0.5 && p.y1 >= housing.y0 - 0.5 && p.x0 >= housing.x0 && p.x1 <= housing.x1);
    assert.ok(ups.length >= 2, `${at}: the coolant up from the housing into the ceiling`);
    const [lamp] = box.roomLamps('engine', r);
    assert.ok(ups.every(p => p.x1 <= lamp - 12 || p.x0 >= lamp + 12), `${at}: clear of the lamp`);
    const port = parts.find(p => p.col === '#1a2c40');
    assert.ok(port && inH(port), `${at}: the core's sight port in the housing`);
  }
  // the drive working: the core's glow up while burning, and in the burn's red
  const glow = (pr, burning) => { const { r, s } = engCase(pr, 1.17, 0.5, burning), { calls } = engParts(r, s); return calls.filter(k => k[0] === 'fillStyle' && /^rgba\(255,140,60,/.test(String(k[1]))).map(k => parseFloat(String(k[1]).split(',')[3])); };
  assert.ok(Math.max(...glow(0.02, true)) > Math.max(...glow(0.02, false)), 'the core brighter while the drive burns');
  assert.equal(glow(0.3, true).length, 0, 'no burn\'s red in cruise');
});
test('the engine room\'s fuel is deuterium in cryo bottles, in a rack with bands, valves and warning marks; the tool board has one outline empty (#933)', () => {
  for (const pr of [0.02, 0.3, 0.5]) {
    const { r, s } = engCase(pr, 1.17), F = r.floor, at = `${pr}`, { calls, parts } = engParts(r, s);
    const bottles = parts.filter(p => /^#(4a5a50|5a6470)$/.test(p.col) && p.y1 - p.y0 > 30), base = parts.find(p => p.col === '#24384c' && p.x1 - p.x0 > 40);
    assert.ok(base && bottles.every(b => b.x0 >= base.x0 && b.x1 <= base.x1 && b.y1 <= base.y0 + 0.5), `${at}: the bottles stand in their rack`);
    for (const b of bottles) {
      assert.ok(calls.some(k => k[0] === 'arc' && Math.abs(k[1] - (b.x0 + b.x1) / 2) < 3 && k[2] < b.y0 && k[2] > b.y0 - 8), `${at}: a valve on top of the bottle at ${b.x0}`);
      assert.ok(parts.some(p => p.col === '#8a7a40' && p.x0 >= b.x0 && p.x1 <= b.x1 && p.y0 >= b.y0 && p.y1 <= b.y1 && p.x1 - p.x0 <= 10), `${at}: a warning diamond on the bottle at ${b.x0}`);
    }
    const placed = placedParts(calls).map(p => ({ col: p.col, ...partBox(p) })), board = placed.find(p => p.col === wallTone('#4a4234'));
    const marks = placed.filter(p => p.col === wallTone('#5e5646') && p.x0 >= board.x0 && p.x1 <= board.x1 && p.y0 >= board.y0 && p.y1 <= board.y1);
    const tools = placed.filter(p => /^rgb/.test(p.col) && [wallTone('#6a7078'), wallTone('#6a4a34'), wallTone('#3a5a6a')].includes(p.col) && p.x0 >= board.x0 && p.x1 <= board.x1 && p.y0 >= board.y0 && p.y1 <= board.y1);
    const over = (a, b) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
    assert.ok(marks.length >= 4, `${at}: the tools' outlines painted on the board (${marks.length})`);
    assert.equal(marks.filter(m => !tools.some(t => over(m, t))).length, 1, `${at}: one outline empty, its tool out`);
  }
});
test('the engine room reads old and patched: a newer bottle in an older rack with fresh bolts, a replacement panel, a printed handle tagged temporary, tape and cable ties, wear where hands go (#933)', () => {
  for (const pr of [0.02, 0.3, 0.5]) {
    const { r, s } = engCase(pr, 1.17), at = `${pr}`, { calls, parts } = engParts(r, s);
    const rects = col => calls.flatMap((k, i) => k[0] === 'fillStyle' && k[1] === col && calls[i + 1][0] === 'fillRect' ? [calls[i + 1].slice(1)] : []);
    const inside = ([x, y, w, h], b) => x >= b.x0 - 0.01 && x + w <= b.x1 + 0.01 && y >= b.y0 - 0.01 && y + h <= b.y1 + 0.01;
    const bottles = parts.filter(p => /^#(4a5a50|5a6470)$/.test(p.col) && p.y1 - p.y0 > 30), base = parts.find(p => p.col === '#24384c' && p.x1 - p.x0 > 40);
    assert.equal(new Set(bottles.map(b => b.col)).size, 2, `${at}: one bottle newer, in another finish`);
    assert.ok(rects('#8a929a').filter(b => inside(b, base)).length >= 2, `${at}: fresh bolts in the old rack`);
    const housing = parts.find(p => p.col === '#2c4258' && p.x1 - p.x0 > 60), patch = parts.find(p => p.col === '#40545e');
    assert.ok(patch && patch.x0 >= housing.x0 && patch.x1 <= housing.x1, `${at}: a replacement panel on the housing, in another shade`);
    const handle = parts.find(p => p.col === '#8a6a48'), tag = parts.find(p => p.col === '#9a9050');
    assert.ok(handle && tag && tag.y0 >= handle.y0 && tag.x1 - tag.x0 <= 6 && tag.y1 - tag.y0 <= 6, `${at}: a printed handle and its temporary tag`);
    assert.ok(rects('#6a5038').filter(q => inside(q, handle)).length >= 2, `${at}: the printed handle's layers`);
    const pipes = parts.filter(p => p.col === '#3d5a7a'), tape = parts.filter(p => p.col === '#7a7462');
    assert.ok(tape.some(t => pipes.some(c => t.x0 < c.x1 && t.x1 > c.x0 && t.y0 < c.y1 && t.y1 > c.y0)), `${at}: tape round a pipe`);
    const ties = placedRects(calls).filter(q => q.col === '#1e2a36');
    assert.ok(ties.length >= 2 && ties.every(t => pipes.some(c => t.x < c.x1 && t.x + t.w > c.x0 && t.y < c.y1 && t.y + t.h > c.y0)), `${at}: cable ties holding a cable to a pipe`);
    const bench = parts.find(p => p.col === '#4a5058' && p.x1 - p.x0 > 60);
    assert.ok(rects('#7e8a94').filter(q => inside(q, { ...bench, y0: bench.y0 - 1, y1: bench.y1 + 1 })).length >= 2, `${at}: paint worn off the bench's edge where hands rest`);
    const hatch = parts.find(p => p.col === '#30485f');
    assert.ok(rects('#5a6a78').filter(q => inside(q, hatch)).length >= 1, `${at}: the hatch worn where it is opened`);
  }
});
test('the engine room\'s ceiling lamp is a fitting over the housing (#1024)', () => {
  for (const pr of [0.02, 0.3, 0.5]) {
    const { r, s } = engCase(pr, 1.17), rec = recorder(); drawRoom(rec.ctx, 'engine', r, s);
    const parts = filledParts(rec.calls), [x] = box.roomLamps('engine', r), e = box.roomEye(r), back = r.top + (r.floor - 80 - r.top) * 0.2;
    assert.ok(parts.some(p => p.pts.some(q => near(q[0], x - 12) && near(q[1], r.top)) && p.pts.some(q => near(q[1], back) && near(q[0], box.roomInto(e, x + 9, r.top)[0]))), `${pr}: its plate on the sliver`);
    assert.ok(parts.some(p => p.col === '#3a4a5a' && p.outlined && near(Math.min(...p.pts.map(q => q[0])), x - 12) && near(Math.min(...p.pts.map(q => q[1])), r.top)), `${pr}: its housing hung from the ceiling`);
    assert.ok(rec.calls.some(k => k[0] === 'strokeRect' && near(k[1], x - 10.5) && near(k[2], r.top + 3)), `${pr}: the guard over its lens`);
  }
});
// #933, the head and shower on the mess deck, beside the galley across the well: the head's door shut in its partition on the galley side, where
// the morning's queue waits by it (shiplife.js headDoorX, headTurn), with its latch, the occupied lamp on the frame and the stores list on its back;
// a zero-g toilet, a basin with its tap at the waist and the mirror over it on the back wall, the shower stall with its tray, its door, the rose and
// the hot water's timer; towels on a rail, two lockers for wash kit, grab rails for zero g. Old and patched (point 6). Drawn at the burn view's
// zoom in a window 1000, 1280 and 1600 wide. The room's name is long: its plate (shiplife.js, 13px, about 130px wide) covers the left half of
// the room at the smallest zoom, from 61 to 82 over the floor.
const { headDoorX } = load(['js/data.js', 'js/util.js', 'js/figures.js', 'js/layouts.js', 'js/camera.js', 'js/rooms.js', 'js/shiplife.js'], { G: {}, Mods: { filter: (n, v) => v, emit() {}, register() {} } }, ['headDoorX']);
const HEAD_PROPS = [['#2a3c50', 'the door\'s frame'], ['#30465c', 'the door'], ['#263a50', 'the occupied lamp\'s housing'], ['#8a8676', 'the stores list on the door'],
  ['#24384c', 'the toilet\'s plinth'], ['#4e5e6e', 'its pedestal'], ['#3a4a58', 'its seat'], ['#46545f', 'its lid'], ['#2e3a46', 'its thigh bar'], ['#3a4a5e', 'its foot hold'], ['#34444f', 'its suction line'],
  ['#5a6470', 'the funnel on its hose'], ['#6e7e8e', 'the basin'], ['#1e3a54', 'the shower stall'], ['#24405e', 'its tray'], ['#2e4a62', 'its door'], ['#6a7a8a', 'its rose'], ['#28384a', 'the hot water\'s timer'],
  ['#24425e', 'the older locker'], ['#2a3e4e', 'the newer locker'], ['#8a8270', 'the lockers\' number plates'],
  [wallTone('#34506a'), 'the mirror\'s frame, on the wall'], [wallTone('#3b566e'), 'its glass'], [wallTone('#22405c'), 'the shelf under it'], [wallTone('#5a6e84'), 'the towel rail'],
  [wallTone('#7a3a34'), 'a towel'], [wallTone('#3a5a7a'), 'another towel'], [wallTone('#3a5470'), 'the grab rails']];
const HEAD_WALL = ['#34506a', '#3b566e', '#22405c', '#5a6e84', '#7a3a34', '#3a5a7a', '#3a5470'];
const headCase = (pr, zoom, o = {}) => ({ r: layoutBox(LAYOUTS.freighter, 'head'), s: RS({ w: phaseWeights(pr), zoom, well: FW, damage: { marks: new Set(), severe: false }, ...o }) });
const headParts = (r, s) => { const { ctx, calls } = recorder(); drawRoom(ctx, 'head', r, s); return { calls, parts: filledParts(calls).filter(p => p.outlined && p.pts.length).map(p => ({ col: p.col, ...partBox(p) })), placed: placedParts(calls).filter(p => p.pts.length).map(p => ({ col: p.col, ...partBox({ pts: p.pts.map(q => q.slice(0, 2)) }) })) }; };
const headName = (r, zoom) => ({ x0: r.x0 + 12 - 4 / zoom, x1: r.x0 + 12 + 46 / zoom, y0: r.top + 8, y1: r.top + 8 + 16.9 / zoom });  // the name's plate (roomNameAt): HEAD, 13px, about 38px wide
const headX = k => headDoorX(k) * LAYOUTS.freighter.width;  // where the queue waits by the door, in world units
test('the head is drawn to the figures\' standard in every phase: its props outlined and a step below the people, the name on clear wall (#933)', () => {
  for (const marked of [false, true]) for (const pr of [0.02, 0.3, 0.45, 0.5]) for (const zoom of [0.82, 1.17, 1.45]) {
    const { r, s } = headCase(pr, zoom, marked ? { damage: { marks: new Set(['head']), severe: true }, night: 1 } : {}), at = `${marked ? 'damaged at night, ' : ''}${pr}, ${zoom}`;
    const c = fakeCtx(); drawRoom(c, 'head', r, s); assert.equal(c.depth, 0, `${at}: every save restored`);
    for (const f of c.fonts) assert.ok(Number(/(\d+(?:\.\d+)?)px/.exec(f)[1]) >= 12, `${at}: ${f}`);
    assert.ok(!c.calls.includes('fillText'), `${at}: no text in the room (the list and the plates are marks)`);
    const { ctx, calls } = recorder(); drawRoom(ctx, 'head', r, s);
    const fills = col => calls.filter(k => k[0] === 'fillStyle' && k[1] === col).length;
    for (const [col, what] of HEAD_PROPS) assert.ok(fills(col) >= 1, `${at}: ${what} (${col})`);
    for (const col of HEAD_WALL) assert.equal(fills(col), 0, `${at}: nothing on the wall in its own colour (${col})`);
    // in the box (#1024): the toilet, the shower and the lockers solid, their sides toward the eye; contact shadows on the strip
    for (const [col, what] of [['#4e5e6e', 'the toilet\'s pedestal'], ['#24405e', 'the shower\'s tray'], ['#3a4a58', 'the toilet\'s seat']]) assert.ok(fills(solidTop(col)) >= 1, `${at}: ${what} solid, a top showing`);
    for (const [col, what] of [['#4e5e6e', 'the toilet\'s pedestal'], ['#1e3a54', 'the shower stall'], ['#24425e', 'the older locker'], ['#2a3e4e', 'the newer locker']]) assert.ok(fills(solidSide(col)) >= 1, `${at}: ${what}'s side toward the eye`);
    assert.ok(fills(SHADOW) >= 4, `${at}: contact shadows on the strip (${fills(SHADOW)})`);
    const outlined = filledParts(calls).filter(p => p.outlined);
    assert.ok(outlined.length >= 50, `${at}: the props outlined like the figures (${outlined.length})`);
    for (const { col } of outlined.filter(p => rgbOf(p.col))) {
      const v = rgbOf(col);
      assert.ok(Math.max(...v) <= 0xb0 && Math.max(...v) - Math.min(...v) <= 0x60, `${at}: ${col} is near-white or saturated, brighter than the people`);
    }
    for (const col of ['#e6dfc9', '#c0392b', '#c9a227', '#ffe2b8', '#ff8a6a', '#ffffff', '#ffb030']) assert.equal(fills(col), 0, `${at}: no bright block (${col})`);
    // the room's name on clear wall, where each thing is drawn (the wall's things moved onto it)
    const name = headName(r, zoom), hit = (b, x, y) => x > b.x0 && x < b.x1 && y > b.y0 && y < b.y1;
    for (const { k, v, pts } of roomOwnPlaced('head', r, s)) for (const [x, y] of pts) assert.ok(!hit(name, x, y), `${at}: ${k} ${v} at ${x}, ${y} under the room's name`);
    // what is on the wall is on the back wall, where it is drawn, and clear of the name's plate
    const wall = backWall(r), placed = placedParts(calls).map(p => ({ col: p.col, at: p.at, ...partBox(p) }));
    for (const col of HEAD_WALL) for (const p of placed.filter(q => q.col === wallTone(col))) {
      assert.ok(p.x0 >= wall.x0 && p.x1 <= wall.x1 && p.y0 >= wall.y0 && p.y1 <= wall.y1 && (p.at[0] || p.at[1]), `${at}: ${col} (${JSON.stringify(p)}) on the back wall`);
      assert.ok(p.x1 <= name.x0 || p.x0 >= name.x1 || p.y1 <= name.y0 || p.y0 >= name.y1, `${at}: ${col} (${JSON.stringify(p)}) clear of the name's plate`);
    }
  }
  const stillAt = t => { const { r, s } = headCase(0.5, 1.17), c = fakeCtx(); drawRoom(c, 'head', r, { ...s, still: true, time: t }); return c.args.join('|'); };
  assert.equal(stillAt(1.3), stillAt(4.9), 'the same frame at any time under reduced motion');
});
test('the head\'s door is shut in its partition on the galley side, just past where the queue waits by it, with its latch and the occupied lamp (#933, #973)', () => {
  for (const zoom of [0.82, 1.17, 1.45]) for (const pr of [0.02, 0.3, 0.5]) {
    const { r, s } = headCase(pr, zoom), F = r.floor, mid = (r.x0 + r.x1) / 2, at = `${pr}, ${zoom}`, { calls, parts } = headParts(r, s), e = box.roomEye(r);
    const door = parts.filter(p => p.col === '#30465c'), frame = parts.find(p => p.col === '#2a3c50');
    assert.equal(door.length, 1, `${at}: one door`);
    const d = door[0], wait = Math.max(headX(0), headX(1));
    assert.ok(d.x0 >= wait + 10 && d.x0 <= wait + 30, `${at}: the door (${JSON.stringify(d)}) just past the second waiting spot (${wait}), clear of them`);
    assert.ok(d.x1 <= mid - 40, `${at}: on the galley side, well clear of the one inside at the middle`);
    assert.ok(F - d.y0 >= 84 && F - d.y0 <= 92 && d.y1 >= F - 3, `${at}: a door near 90 high, from the floor (${F - d.y0})`);
    assert.ok(frame && frame.x0 <= d.x0 && frame.x1 >= d.x1 && frame.y0 <= d.y0, `${at}: in its frame`);
    // the partition it is in, from the cut back to the back wall, its face toward the eye: a person inside is seen, as the cutaway shows a room
    const P = frame.x0, back = box.roomInto(e, P, r.top)[0];
    assert.ok(filledParts(calls).some(p => p.pts.some(q => near(q[0], P) && near(q[1], r.top)) && p.pts.some(q => near(q[0], P) && near(q[1], F)) && p.pts.some(q => near(q[0], back))), `${at}: the partition from the cut to the back wall`);
    assert.ok(d.x1 - d.x0 >= 0.7 * (back - P), `${at}: the door fills its opening, shut (${d.x1 - d.x0} of ${back - P})`);
    const latch = calls.flatMap((k, i) => k[0] === 'fillStyle' && k[1] === '#8796a5' && calls[i + 1][0] === 'fillRect' ? [calls[i + 1].slice(1)] : []).filter(([x, y, w, h]) => x >= d.x0 - 0.5 && x + w <= d.x1 + 0.5 && F - y >= 34 && F - y - h <= 50);
    assert.ok(latch.length >= 1, `${at}: a latch on the door at the hand`);
    const lamp = parts.find(p => p.col === '#263a50');
    assert.ok(lamp && lamp.x0 <= P + 1 && lamp.x1 >= P - 1 && F - lamp.y0 <= 60 && F - lamp.y1 >= 40, `${at}: the occupied lamp on the door's frame at the cut, by the latch (${JSON.stringify(lamp)})`);
    assert.ok(lamp.x1 - lamp.x0 <= 8 && lamp.y1 - lamp.y0 <= 9, `${at}: a lamp, small`);
    const list = parts.find(p => p.col === '#8a8676');
    assert.ok(list && list.x0 >= d.x0 && list.x1 <= d.x1 && list.y0 >= d.y0 && list.y1 <= d.y1, `${at}: the stores list on the back of the door`);
  }
});
test('the one in the head stands clear of its fixtures, at the basin under the mirror; the queue waits on clear floor (#933, #973)', () => {
  for (const zoom of [0.82, 1.17, 1.45]) {
    const { r, s } = headCase(0.3, zoom), F = r.floor, mid = (r.x0 + r.x1) / 2, at = `${zoom}`, { calls, parts, placed } = headParts(r, s);
    const onFloor = parts.filter(p => p.y1 >= F - 6 && p.y1 <= F + 0.5);
    assert.ok(onFloor.length >= 6, `${at}: things standing on the floor (${onFloor.length})`);
    for (const x of [mid, headX(0), headX(1)]) for (const p of onFloor) assert.ok(p.x1 <= x - 12 || p.x0 >= x + 12, `${at}: ${p.col} (${JSON.stringify(p)}) where someone stands at ${x}`);
    const shadows = filledParts(calls).filter(p => p.col === SHADOW).map(partBox);
    for (const sh of shadows) assert.ok(sh.x1 <= mid - 10 || sh.x0 >= mid + 10, `${at}: no shadow (${JSON.stringify(sh)}) under the one inside`);
    const basin = placed.find(p => p.col === '#6e7e8e'), mirror = placedRects(calls).filter(q => q.col === wallTone('#3b566e')).map(q => ({ x0: q.x, x1: q.x + q.w, y0: q.y, y1: q.y + q.h }))[0];  // the glass
    assert.ok(basin && Math.abs((basin.x0 + basin.x1) / 2 - mid) <= 30 && basin.x0 < mid + 12, `${at}: the basin (${JSON.stringify(basin)}) at the hand of the one at the middle`);
    assert.ok(mirror && Math.abs((mirror.x0 + mirror.x1) / 2 - (basin.x0 + basin.x1) / 2) <= 3 && mirror.y1 < basin.y0, `${at}: the mirror over the basin`);
  }
});
test('the head is sized to a person: the seat at the seat\'s height, the basin at the waist, the mirror at the eye, the stall a person tall, the lockers at the head (#933, #960)', () => {
  for (const pr of [0.02, 0.3, 0.5]) {
    const { r, s } = headCase(pr, 1.17), F = r.floor, at = `${pr}`, { calls, parts, placed } = headParts(r, s);
    const seat = parts.find(p => p.col === '#3a4a58' && p.x1 - p.x0 >= 18), ped = parts.find(p => p.col === '#4e5e6e');
    assert.ok(seat && Math.abs(F - seat.y0 - gun.FIG_SEAT) <= 2, `${at}: the toilet's seat at the seat's height (${seat && F - seat.y0})`);
    assert.ok(seat.x1 - seat.x0 <= 30 && ped.y1 >= F - 4, `${at}: a seat a person sits on, its pedestal on the floor`);
    const toilet = parts.filter(p => /^#(24384c|4e5e6e|3a4a58|46545f|2e3a46|3a4a5e)$/.test(p.col));
    assert.ok(F - Math.min(...toilet.map(p => p.y0)) <= 46 && Math.max(...toilet.map(p => p.x1)) - Math.min(...toilet.map(p => p.x0)) <= 40, `${at}: the toilet under the waist and narrow`);
    const basin = placed.find(p => p.col === '#6e7e8e'), mirror = placedRects(calls).filter(q => q.col === wallTone('#3b566e')).map(q => ({ x0: q.x, x1: q.x + q.w, y0: q.y, y1: q.y + q.h }))[0];  // the glass
    assert.ok(F - basin.y0 >= 36 && F - basin.y0 <= 44 && basin.x1 - basin.x0 <= 34, `${at}: the basin's rim at the waist (${F - basin.y0})`);
    assert.ok(Math.abs(F - (mirror.y0 + mirror.y1) / 2 - 77) <= 4 && mirror.x1 - mirror.x0 <= 26, `${at}: the mirror at the eye (${F - (mirror.y0 + mirror.y1) / 2})`);
    const tap = placedRects(calls).filter(q => q.col === '#8796a5' && q.x >= basin.x0 && q.x + q.w <= basin.x1 && q.y + q.h <= basin.y0 + 1 && q.y >= basin.y0 - 10);
    assert.ok(tap.length >= 1, `${at}: a tap over the basin`);
    const stall = parts.find(p => p.col === '#1e3a54' && p.y1 - p.y0 > 60), tray = parts.find(p => p.col === '#24405e');
    assert.ok(stall && F - stall.y0 >= 88 && F - stall.y0 <= 96 && stall.x1 - stall.x0 >= 40 && stall.x1 - stall.x0 <= 56, `${at}: the stall a person stands in, under the ceiling (${JSON.stringify(stall)})`);
    assert.ok(tray && tray.y1 - tray.y0 <= 6 && tray.y1 >= F - 0.5 && tray.x0 <= stall.x0 && tray.x1 >= stall.x1, `${at}: the tray under the stall`);
    const lockers = parts.filter(p => /^#(24425e|2a3e4e)$/.test(p.col) && p.y1 - p.y0 > 60);
    assert.equal(lockers.length, 2, `${at}: two lockers`);
    for (const l of lockers) assert.ok(F - l.y0 >= 80 && F - l.y0 <= 92 && l.x1 - l.x0 <= 26 && l.x1 <= r.x1 - 2, `${at}: a locker (${JSON.stringify(l)}) at head height, in the room`);
    const towels = placed.filter(p => p.col === wallTone('#7a3a34') || p.col === wallTone('#3a5a7a')), rail = placed.find(p => p.col === wallTone('#5a6e84'));
    assert.ok(towels.length >= 2 && towels.every(t => t.y0 >= rail.y0 - 1 && F - t.y1 >= 30 && t.x1 - t.x0 <= 14), `${at}: towels hung on the rail, clear of the floor`);
    assert.ok(F - rail.y0 >= 55 && F - rail.y0 <= 70, `${at}: the rail at the hand (${F - rail.y0})`);
    for (const p of parts) assert.ok(p.y0 >= r.top - 0.5 && (p.x1 - p.x0) * (p.y1 - p.y0) <= (stall.x1 - stall.x0) * (stall.y1 - stall.y0) + 0.01, `${at}: ${p.col} (${JSON.stringify(p)}) under the ceiling, nothing bigger than the stall`);
  }
});
test('the head has what it is for: a shower with its tray, door, rose and timer; a zero-g toilet with its belt, foot hold and suction line; grab rails (#933)', () => {
  for (const pr of [0.02, 0.3, 0.5]) {
    const { r, s } = headCase(pr, 1.17), F = r.floor, at = `${pr}`, { calls, parts, placed } = headParts(r, s);
    const stall = parts.find(p => p.col === '#1e3a54' && p.y1 - p.y0 > 60), sdoor = parts.find(p => p.col === '#2e4a62'), rose = parts.find(p => p.col === '#6a7a8a'), timer = parts.find(p => p.col === '#28384a');
    const inS = p => p.x0 >= stall.x0 - 1 && p.x1 <= stall.x1 + 1 && p.y0 >= stall.y0 - 1 && p.y1 <= stall.y1 + 1;
    assert.ok(sdoor && inS(sdoor) && sdoor.y1 - sdoor.y0 >= 70, `${at}: the stall's door`);
    assert.ok(calls.some(k => k[0] === 'fillStyle' && /^rgba\(/.test(String(k[1])) && /0\.1\d?\)$/.test(String(k[1]))), `${at}: its glass frosted`);
    assert.ok(rose && inS(rose) && F - rose.y0 >= 78, `${at}: the rose high in the stall`);
    assert.ok(timer && inS(timer) && timer.x1 - timer.x0 <= 10, `${at}: the hot water's timer on the stall's door, the water ration`);
    const segs = calls.flatMap((k, i) => k[0] === 'fillStyle' && k[1] === '#7fd8a0' && calls[i + 1][0] === 'fillRect' ? [calls[i + 1].slice(1)] : []);
    assert.ok(segs.length >= 2 && segs.every(([x, y, w, h]) => x >= timer.x0 && x + w <= timer.x1 && y >= timer.y0 && y + h <= timer.y1), `${at}: the timer's count as lit marks, no text`);
    const ped = parts.find(p => p.col === '#4e5e6e'), bar = parts.find(p => p.col === '#2e3a46'), foot = parts.find(p => p.col === '#3a4a5e'), line = parts.find(p => p.col === '#34444f');
    assert.ok(bar && bar.y1 <= ped.y0 - 4 && bar.x0 <= ped.x0 + 2 && bar.x1 >= ped.x1 - 2, `${at}: the thigh bar over the seat`);
    assert.ok(foot && foot.y1 >= F - 4 && foot.x1 - foot.x0 >= 20, `${at}: the foot hold at the floor`);
    assert.ok(line && line.y1 >= F + 4 && line.y0 <= F - 8, `${at}: the suction line down through the deck`);
    assert.ok(calls.some(k => k[0] === 'strokeStyle' && k[1] === '#2a3440'), `${at}: the funnel's hose`);
    const rails = placed.filter(p => p.col === wallTone('#3a5470') && p.x1 - p.x0 >= 16);
    assert.ok(rails.length >= 2, `${at}: grab rails on the wall for zero g (${rails.length})`);
    for (const g of rails) assert.ok(F - g.y0 >= 40 && F - g.y0 <= 60, `${at}: a grab rail at the hand, under the name (${F - g.y0})`);
    const plates = parts.filter(p => p.col === '#8a8270'), vents = placedRects(calls).filter(q => q.col === '#0f1f30');
    assert.ok(plates.length >= 2 && vents.length >= 6, `${at}: each locker's number plate and vents`);
  }
});
test('the head reads old and patched: a newer locker, a newer toilet on an older plinth, tape on the mirror, a printed part tagged temporary, cable ties, wear where hands and boots go (#933)', () => {
  for (const pr of [0.02, 0.3, 0.5]) {
    const { r, s } = headCase(pr, 1.17), F = r.floor, at = `${pr}`, { calls, parts, placed } = headParts(r, s);
    const rects = col => calls.flatMap((k, i) => k[0] === 'fillStyle' && k[1] === col && calls[i + 1][0] === 'fillRect' ? [calls[i + 1].slice(1)] : []);
    const inside = ([x, y, w, h], b) => x >= b.x0 - 0.01 && x + w <= b.x1 + 0.01 && y >= b.y0 - 0.01 && y + h <= b.y1 + 0.01;
    assert.equal(new Set(parts.filter(p => /^#(24425e|2a3e4e)$/.test(p.col) && p.y1 - p.y0 > 60).map(p => p.col)).size, 2, `${at}: one locker newer, in another finish`);
    const plinth = parts.find(p => p.col === '#24384c'), ped = parts.find(p => p.col === '#4e5e6e');
    assert.ok(plinth && plinth.y0 >= ped.y1 - 0.5 && plinth.x0 <= ped.x0 && plinth.x1 >= ped.x1, `${at}: the toilet on an older plinth`);
    assert.ok(rects('#8a929a').filter(b => inside(b, plinth)).length >= 2, `${at}: fresh bolts in the plinth`);
    const mirror = placed.find(p => p.col === wallTone('#34506a')), tape = placed.filter(p => p.col === wallTone('#7a7462'));
    assert.ok(tape.some(t => t.x0 < mirror.x1 && t.x1 > mirror.x0 && t.y0 < mirror.y1 && t.y1 > mirror.y0), `${at}: tape over a cracked corner of the mirror`);
    const printed = parts.find(p => p.col === '#8a6a48'), tag = parts.find(p => p.col === '#9a9050');
    assert.ok(printed && tag && tag.y0 >= printed.y0 && tag.x1 - tag.x0 <= 6 && tag.y1 - tag.y0 <= 6, `${at}: a printed part and its temporary tag`);
    assert.ok(rects('#6a5038').filter(q => inside(q, printed)).length >= 2, `${at}: its printed layers`);
    const line = parts.find(p => p.col === '#34444f'), ties = placedRects(calls).filter(q => q.col === '#1e2a36');
    assert.ok(ties.length >= 2 && ties.every(t => t.x < line.x1 + 3 && t.x + t.w > line.x0 - 3 && t.y < line.y1 && t.y + t.h > line.y0), `${at}: cable ties on the suction line`);
    const door = parts.find(p => p.col === '#30465c'), foot = parts.find(p => p.col === '#3a4a5e');
    assert.ok(rects('#5a6a78').filter(q => inside(q, door)).length >= 1, `${at}: the door worn by its latch`);
    assert.ok(rects('#5a6670').filter(([x, y, w]) => y >= F - 3 && x + w > foot.x0 - 8 && x < foot.x1 + 8).length >= 2, `${at}: scuffs where boots go at the toilet`);
  }
});
test('the head\'s ceiling lamp is a fitting over the one at the basin (#1024)', () => {
  for (const pr of [0.02, 0.3, 0.5]) {
    const { r, s } = headCase(pr, 1.17), rec = recorder(); drawRoom(rec.ctx, 'head', r, s);
    const parts = filledParts(rec.calls), [x] = box.roomLamps('head', r), e = box.roomEye(r), back = r.top + (r.floor - 80 - r.top) * 0.2;
    assert.ok(Math.abs(x - (r.x0 + r.x1) / 2) < 1, `${pr}: over the middle, where the one inside stands`);
    assert.ok(parts.some(p => p.pts.some(q => near(q[0], x - 12) && near(q[1], r.top)) && p.pts.some(q => near(q[1], back) && near(q[0], box.roomInto(e, x + 9, r.top)[0]))), `${pr}: its plate on the sliver`);
    assert.ok(parts.some(p => p.col === '#3a4a5a' && p.outlined && near(Math.min(...p.pts.map(q => q[0])), x - 12) && near(Math.min(...p.pts.map(q => q[1])), r.top)), `${pr}: its housing hung from the ceiling`);
    assert.ok(rec.calls.some(k => k[0] === 'strokeRect' && near(k[1], x - 10.5) && near(k[2], r.top + 3)), `${pr}: the guard over its lens`);
  }
});
test('the head\'s occupied lamp is lit while someone is in (s.headIn) and dark when it is free (#933, #973)', () => {
  for (const zoom of [0.82, 1.17, 1.45]) for (const headIn of [false, true]) {
    const { r, s } = headCase(0.3, zoom, { headIn }), { calls, parts } = headParts(r, s), F = r.floor, lamp = parts.find(p => p.col === '#263a50');
    const lens = col => filledParts(calls).filter(p => p.col === col).length + calls.filter((k, i) => k[0] === 'fillStyle' && k[1] === col && calls.slice(i + 1, i + 4).some(q => q[0] === 'arc' && q[1] >= lamp.x0 && q[1] <= lamp.x1 && q[2] >= lamp.y0 && q[2] <= lamp.y1)).length;
    assert.equal(lens('#a07848') > 0, headIn, `${zoom}: the lamp ${headIn ? 'lit' : 'not lit'}`);
    assert.equal(lens('#4a2a26') > 0, !headIn, `${zoom}: the lens ${headIn ? 'not dark' : 'dark'}`);
    const v = rgbOf('#a07848'); assert.ok(Math.max(...v) <= 0xb0 && Math.max(...v) - Math.min(...v) <= 0x60, 'lit in a muted colour, a step below the people');
    assert.ok(F - lamp.y0 <= 60, `${zoom}: the lamp by the latch`);
  }
});
const { roomNameAt, ROOM_NAME_TOP } = load(['js/data.js', 'js/util.js', 'js/figures.js', 'js/layouts.js', 'js/camera.js', 'js/rooms.js'], { G: {}, Mods: { filter: (n, v) => v, emit() {}, register() {} } }, ['roomNameAt', 'ROOM_NAME_TOP']);
test('every room\'s name sits high on its wall, under the lamps\' fittings; the head\'s short name is clear of its door (#933)', () => {
  assert.ok(LAYOUTS.freighter.decks.flatMap(d => d.rooms).some(q => q.id === 'head' && q.name === 'Head'), 'the head is named the head');
  for (const zoom of [0.82, 1.17, 1.45]) for (const id of ['bridge', 'galley', 'head', 'berths', 'gunnery', 'workshop', 'airlock', 'medbay', 'hold', 'engine']) {
    const r = layoutBox(LAYOUTS.freighter, id), at = roomNameAt(r, zoom), top = at.y - 13 / zoom;
    assert.ok(near(at.x, r.x0 + 12) && near(top, r.top + ROOM_NAME_TOP), `${id}, ${zoom}: 12 in, its plate's top ${ROOM_NAME_TOP} under the ceiling`);
    assert.ok(top > r.top + 6.4, `${id}, ${zoom}: under the lamps' fittings (6.4 deep)`);
  }
  for (const zoom of [0.82, 1.17, 1.45]) {
    const { r, s } = headCase(0.3, zoom), { parts } = headParts(r, s), frame = parts.find(p => p.col === '#2a3c50');
    assert.ok(headName(r, zoom).x1 < frame.x0, `${zoom}: the head's plate ends before its door's frame`);
  }
});
// #933, the workshop on the gun deck, beside the gunnery across the well, where the engineer's and the gunner's rounds bring them (ROUNDS,
// shiplife.js; goTo puts them a quarter to three quarters of the way across): from the left wall in, the fabricator (the ship's printer, a newer
// unit bolted on an older stand, a printed part on its bed, a spool of stock on its side, its cable taped and tied), then the bench at the waist
// with its vice and a breech from the gunnery's guns in pieces by its parts tray, the tool board on the wall over it (each tool on its hook in its
// painted outline, one out and signed for) and the small-parts drawers; at the right wall the spares rack, its shelves strapped for zero g, boxed
// spares stencilled, loose ones, the stock spools, one shelf a replacement on printed brackets tagged temporary. Old and patched (point 6). Drawn
// at the burn view's zoom in a window 1000, 1280 and 1600 wide.
const { LAMP_FITTED: WS_FITTED } = load(['js/data.js', 'js/util.js', 'js/figures.js', 'js/layouts.js', 'js/camera.js', 'js/rooms.js'], { G: {}, Mods: { filter: (n, v) => v, emit() {}, register() {} } }, ['LAMP_FITTED']);
const WS_PROPS = [['#2a3a48', 'the fabricator\'s stand'], ['#4a5866', 'its enclosure'], ['#0e1a24', 'its window'], ['#3a4048', 'its bed'], ['#8a6a48', 'the printed parts'], ['#3a6a70', 'the stock spools'],
  ['#46505a', 'the bench\'s top'], ['#2c3c4c', 'the bench\'s cabinet'], ['#2a3644', 'its leg'], ['#4a5a4e', 'the vice'], ['#6a6e70', 'its jaws'], ['#3e444a', 'the breech\'s housing'], ['#5a5e62', 'the breech block'],
  ['#2e3a44', 'the parts tray'], ['#1c2a36', 'the spares rack'], ['#2e3e4c', 'its posts'], ['#34485a', 'its shelves'], ['#4a4e44', 'the replacement shelf'], ['#4e4434', 'the boxed spares'], ['#3e4a40', 'the other boxes'],
  ['#5a5040', 'the straps'], ['#4a5560', 'the spare pump'], ['#3e5068', 'the turret\'s spare feed tray'],
  [wallTone('#2e3a40'), 'the tool board, on the wall'], [wallTone('#5a6a58'), 'the tools\' painted outlines'], [wallTone('#707a82'), 'the spanners'], [wallTone('#3a4652'), 'the small-parts drawers'], [wallTone('#8a8676'), 'the sign-out card']];
const WS_WALL = ['#2e3a40', '#5a6a58', '#707a82', '#3a4652', '#8a8676'];
const WS_TOOLS = ['#707a82', '#606870', '#7a4438', '#3a5878', '#5e666e', '#4a5c74'].map(wallTone);
const wsCase = (pr, zoom, o = {}) => ({ r: layoutBox(LAYOUTS.freighter, 'workshop'), s: RS({ w: phaseWeights(pr), zoom, well: FW, damage: { marks: new Set(), severe: false }, ...o }) });
const wsParts = (r, s) => { const { ctx, calls } = recorder(); drawRoom(ctx, 'workshop', r, s); return { calls, parts: filledParts(calls).filter(p => p.outlined && p.pts.length).map(p => ({ col: p.col, ...partBox(p) })), placed: placedParts(calls).filter(p => p.pts.length).map(p => ({ col: p.col, outlined: false, ...partBox({ pts: p.pts.map(q => q.slice(0, 2)) }) })) }; };
const wsName = (r, zoom) => ({ x0: r.x0 + 12 - 4 / zoom, x1: r.x0 + 12 + 85 / zoom, y0: r.top + 8, y1: r.top + 8 + 16.9 / zoom });  // the name's plate (roomNameAt): WORKSHOP, 13px, about 77px wide
const wsRects = (calls, col) => calls.flatMap((k, i) => k[0] === 'fillStyle' && k[1] === col && calls[i + 1][0] === 'fillRect' ? [calls[i + 1].slice(1)] : []);
test('the workshop is drawn to the figures\' standard in every phase: its props outlined and a step below the people, the name on clear wall (#933)', () => {
  assert.ok(WS_FITTED.includes('workshop'), 'its lamp a fitting');
  for (const marked of [false, true]) for (const pr of [0.02, 0.3, 0.45, 0.5]) for (const zoom of [0.82, 1.17, 1.45]) {
    const { r, s } = wsCase(pr, zoom, marked ? { damage: { marks: new Set(['workshop']), severe: true }, night: 1 } : {}), at = `${marked ? 'damaged at night, ' : ''}${pr}, ${zoom}`;
    const c = fakeCtx(); drawRoom(c, 'workshop', r, s); assert.equal(c.depth, 0, `${at}: every save restored`);
    for (const f of c.fonts) assert.ok(Number(/(\d+(?:\.\d+)?)px/.exec(f)[1]) >= 12, `${at}: ${f}`);
    assert.ok(!c.calls.includes('fillText'), `${at}: no text in the room (the stencils, the card and the screen are marks)`);
    const { ctx, calls } = recorder(); drawRoom(ctx, 'workshop', r, s);
    const fills = col => calls.filter(k => k[0] === 'fillStyle' && k[1] === col).length;
    for (const [col, what] of WS_PROPS) assert.ok(fills(col) >= 1, `${at}: ${what} (${col})`);
    for (const col of WS_WALL) assert.equal(fills(col), 0, `${at}: nothing on the wall in its own colour (${col})`);
    // in the box (#1024): the bench's top and the fabricator solid, their tops showing; the fabricator, the bench's cabinet and the rack show their
    // side toward the eye; a contact shadow under the stand, the cabinet, the leg and the rack
    for (const [col, what] of [['#46505a', 'the bench\'s top'], ['#4a5866', 'the fabricator\'s enclosure']]) assert.ok(fills(solidTop(col)) >= 1, `${at}: ${what} solid, a top showing`);
    for (const [col, what] of [['#2a3a48', 'the fabricator\'s stand'], ['#4a5866', 'its enclosure'], ['#2c3c4c', 'the bench\'s cabinet'], ['#1c2a36', 'the spares rack']]) assert.ok(fills(solidSide(col)) >= 1, `${at}: ${what}'s side toward the eye`);
    assert.ok(fills(SHADOW) >= 4, `${at}: contact shadows on the strip (${fills(SHADOW)})`);
    const outlined = filledParts(calls).filter(p => p.outlined);
    assert.ok(outlined.length >= 70, `${at}: the props outlined like the figures (${outlined.length})`);
    for (const { col } of outlined.filter(p => rgbOf(p.col))) {
      const v = rgbOf(col);
      assert.ok(Math.max(...v) <= 0xb0 && Math.max(...v) - Math.min(...v) <= 0x60, `${at}: ${col} is near-white or saturated, brighter than the people`);
    }
    for (const col of ['#e6dfc9', '#c0392b', '#c9a227', '#ffe2b8', '#ff8a6a', '#ffffff', '#ffb030']) assert.equal(fills(col), 0, `${at}: no bright block (${col})`);
    // the room's name on clear wall, where each thing is drawn (the wall's things moved onto it)
    const name = wsName(r, zoom), hit = (b, x, y) => x > b.x0 && x < b.x1 && y > b.y0 && y < b.y1;
    for (const { k, v, pts } of roomOwnPlaced('workshop', r, s)) for (const [x, y] of pts) assert.ok(!hit(name, x, y), `${at}: ${k} ${v} at ${x}, ${y} under the room's name`);
    // what is on the wall is on the back wall, where it is drawn, and clear of the name's plate
    const wall = backWall(r), placed = placedParts(calls).map(p => ({ col: p.col, at: p.at, ...partBox(p) }));
    for (const col of WS_WALL) for (const p of placed.filter(q => q.col === wallTone(col))) {
      assert.ok(p.x0 >= wall.x0 && p.x1 <= wall.x1 && p.y0 >= wall.y0 && p.y1 <= wall.y1 && (p.at[0] || p.at[1]), `${at}: ${col} (${JSON.stringify(p)}) on the back wall`);
      assert.ok(p.x1 <= name.x0 || p.x0 >= name.x1 || p.y1 <= name.y0 || p.y0 >= name.y1, `${at}: ${col} (${JSON.stringify(p)}) clear of the name's plate`);
    }
  }
  const stillAt = t => { const { r, s } = wsCase(0.5, 1.17), c = fakeCtx(); drawRoom(c, 'workshop', r, { ...s, still: true, time: t }); return c.args.join('|'); };
  assert.equal(stillAt(1.3), stillAt(4.9), 'the same frame at any time under reduced motion');
});
test('whoever is at work in the workshop stands at the bench or the fabricator, never inside a fixture (#933, #973)', () => {
  for (const zoom of [0.82, 1.17, 1.45]) for (const pr of [0.02, 0.3, 0.5]) {
    const { r, s } = wsCase(pr, zoom), F = r.floor, W = r.x1 - r.x0, at = `${pr}, ${zoom}`, { parts } = wsParts(r, s);
    const b0 = r.x0 + 0.25 * W, b1 = r.x0 + 0.75 * W;  // where an errand puts them (goTo, shiplife.js)
    const onFloor = parts.filter(p => p.y1 >= F - 6 && p.y1 <= F + 0.5 && /^#/.test(p.col));  // the fronts at the cut, where people stand (a solid's faces run back from it, behind them)
    assert.ok(onFloor.length >= 4, `${at}: things standing on the floor (${onFloor.length})`);
    for (const p of onFloor.filter(q => q.x1 > b0 - 12 && q.x0 < b1 + 12)) assert.ok(F - p.y0 <= 46, `${at}: ${p.col} (${JSON.stringify(p)}) standing higher than the waist where someone stands at work`);
    const top = parts.find(p => p.col === '#46505a'), fab = parts.find(p => p.col === '#4a5866');
    for (let x = b0; x <= b1 + 1e-9; x += W / 40) assert.ok((x >= top.x0 + 4 && x <= top.x1 - 4) || (x - fab.x1 >= 8 && x - fab.x1 <= 30), `${at}: someone at ${x} is at the bench (${top.x0} to ${top.x1}) or at the fabricator (to ${fab.x1})`);
    const [lx] = box.roomLamps('workshop', r);
    assert.ok(lx > top.x0 + 20 && lx < top.x1 - 20, `${at}: the lamp over the bench`);
  }
});
test('the workshop is sized to a person: the bench at the waist with its vice, the tool board at reach, the fabricator under the name, the rack under the head (#933, #960)', () => {
  for (const pr of [0.02, 0.3, 0.5]) {
    const { r, s } = wsCase(pr, 1.17), F = r.floor, at = `${pr}`, { parts, placed } = wsParts(r, s);
    const top = parts.find(p => p.col === '#46505a'), vice = parts.filter(p => p.col === '#4a5a4e'), jaws = parts.filter(p => p.col === '#6a6e70');
    assert.ok(F - top.y0 >= 36 && F - top.y0 <= 44 && top.y1 - top.y0 <= 6, `${at}: the bench's top at the waist (${F - top.y0})`);
    assert.ok(top.x1 - top.x0 >= 120 && top.x1 - top.x0 <= 200, `${at}: a bench a few people long (${top.x1 - top.x0})`);
    assert.ok(vice.length >= 1 && jaws.length >= 2, `${at}: the vice and its two jaws`);
    for (const p of [...vice, ...jaws]) assert.ok(p.x0 >= top.x0 && p.x1 <= top.x1 + 2 && p.y1 <= top.y0 + 0.5 && F - p.y0 <= 56, `${at}: the vice (${JSON.stringify(p)}) on the bench's top, a hand high`);
    const board = placed.find(p => p.col === wallTone('#2e3a40'));
    assert.ok(board && F - board.y0 <= 90 && F - board.y1 >= 46 && board.x0 >= top.x0 - 4 && board.x1 <= top.x1 + 4, `${at}: the tool board (${JSON.stringify(board)}) over the bench, at reach`);
    const fab = parts.find(p => p.col === '#4a5866'), stand = parts.find(p => p.col === '#2a3a48' && p.y1 >= F - 1);
    assert.ok(F - fab.y0 <= 70 && F - fab.y0 >= 55 && stand.y1 >= F - 0.5 && Math.abs(stand.y0 - fab.y1) <= 1, `${at}: the fabricator on its stand, at the chest (${F - fab.y0})`);
    const rack = parts.find(p => p.col === '#1c2a36');
    assert.ok(F - rack.y0 <= FIG_TALL - 3 && F - rack.y0 >= 70 && rack.y1 >= F - 0.5 && rack.x1 <= r.x1 - 4 && rack.x0 >= top.x1, `${at}: the rack (${JSON.stringify(rack)}) under a person's head, past the bench`);
    for (const p of parts) assert.ok(p.y0 >= r.top - 0.5 && p.x0 >= r.x0 && p.x1 <= r.x1 && (p.x1 - p.x0) * (p.y1 - p.y0) <= (rack.x1 - rack.x0) * (rack.y1 - rack.y0) + 0.01, `${at}: ${p.col} (${JSON.stringify(p)}) in the room, nothing bigger than the rack`);
  }
});
test('the workshop has what it is for: a breech in pieces on the bench by its parts tray, tools in their outlines (one out, signed for), the fabricator printing, spares strapped on the rack (#933)', () => {
  for (const pr of [0.02, 0.3, 0.5]) {
    const { r, s } = wsCase(pr, 1.17), F = r.floor, at = `${pr}`, { calls, parts, placed } = wsParts(r, s);
    const top = parts.find(p => p.col === '#46505a'), onTop = p => p.x0 >= top.x0 && p.x1 <= top.x1 && Math.abs(p.y1 - top.y0) <= 1;
    const gun = parts.filter(p => /^#(3e444a|5a5e62)$/.test(p.col)), tray = parts.find(p => p.col === '#2e3a44');
    assert.ok(gun.length >= 2 && gun.every(onTop), `${at}: the breech's housing and its block, apart, on the bench`);
    for (const p of gun) assert.ok(p.x1 - p.x0 <= 26 && F - p.y0 <= 50, `${at}: a gun's part (${JSON.stringify(p)}), small`);
    assert.ok(tray && onTop(tray), `${at}: the parts tray on the bench`);
    assert.ok(wsRects(calls, '#8e969e').filter(([x, y, w, h]) => x >= tray.x0 && x + w <= tray.x1 && y >= tray.y0 - 2 && y + h <= tray.y1).length >= 3, `${at}: pins and screws in the tray`);
    assert.ok(calls.some(k => k[0] === 'strokeStyle' && k[1] === '#7a8288'), `${at}: the breech's spring`);
    // the tool board: each tool on its hook over its painted outline, one outline empty, the card for the one out hung by it
    const outlines = placed.filter(p => p.col === wallTone('#5a6a58')), tools = placedParts(calls).filter(p => p.pts.length && WS_TOOLS.includes(p.col)).map(p => partBox(p));
    const inO = (t, o) => (t.x0 + t.x1) / 2 >= o.x0 && (t.x0 + t.x1) / 2 <= o.x1 && (t.y0 + t.y1) / 2 >= o.y0 && (t.y0 + t.y1) / 2 <= o.y1;
    assert.ok(tools.length >= 6, `${at}: tools on the board (${tools.length})`);
    for (const t of tools) assert.ok(outlines.some(o => inO(t, o)), `${at}: a tool (${JSON.stringify(t)}) over its outline`);
    const empty = outlines.filter(o => !tools.some(t => inO(t, o)));
    assert.equal(empty.length, 1, `${at}: one tool out (${empty.length})`);
    const card = placed.find(p => p.col === wallTone('#8a8676'));
    assert.ok(card && card.x0 < empty[0].x1 + 6 && card.x1 > empty[0].x0 - 6 && card.x1 - card.x0 <= 8, `${at}: the sign-out card hung by the empty outline`);
    assert.ok(placed.filter(p => p.col === wallTone('#44525e')).length >= 6, `${at}: the small-parts drawers`);
    // the fabricator: its window, the bed in it, a printed part on the bed, its screen, the spool on its side feeding it
    const fab = parts.find(p => p.col === '#4a5866'), win = parts.find(p => p.col === '#0e1a24'), bed = parts.find(p => p.col === '#3a4048');
    const inside = (p, b) => p.x0 >= b.x0 - 0.01 && p.x1 <= b.x1 + 0.01 && p.y0 >= b.y0 - 0.01 && p.y1 <= b.y1 + 0.01;
    assert.ok(inside(win, fab) && inside(bed, win), `${at}: the bed in the fabricator's window`);
    const printed = parts.filter(p => p.col === '#8a6a48'), onBed = printed.find(p => inside(p, win) && Math.abs(p.y1 - bed.y0) <= 0.6);
    assert.ok(onBed && onBed.x1 - onBed.x0 <= 14, `${at}: a printed part on the bed (${JSON.stringify(onBed)})`);
    assert.ok(placedRects(calls).some(q => q.col === '#03121c' && q.x >= fab.x0 && q.x + q.w <= fab.x1 && q.y >= fab.y0), `${at}: its screen, the time left as a bar`);
    const spools = parts.filter(p => p.col === '#3a6a70');
    assert.ok(spools.some(p => p.x0 >= fab.x1 - 8 && p.y1 < fab.y1 && p.x1 - p.x0 <= 16), `${at}: a spool of stock on the fabricator's side`);
    // the rack: three shelves, the boxes stencilled, the straps across each shelf for zero g, loose spares, the stock spools
    const rack = parts.find(p => p.col === '#1c2a36'), inR = p => inside(p, { ...rack, y0: rack.y0 - 1 });
    assert.ok(parts.filter(p => /^#(34485a|4a4e44)$/.test(p.col) && inR(p) && p.x1 - p.x0 >= 0.8 * (rack.x1 - rack.x0)).length >= 3, `${at}: three shelves`);
    const boxes = parts.filter(p => /^#(4e4434|3e4a40)$/.test(p.col) && inR(p));
    assert.ok(boxes.length >= 3, `${at}: boxed spares (${boxes.length})`);
    assert.ok(wsRects(calls, '#7e7660').filter(([x, y, w, h]) => boxes.some(b => x >= b.x0 && x + w <= b.x1 && y >= b.y0 && y + h <= b.y1) && h <= 4).length >= 6, `${at}: stencils on the boxes, marks`);
    const straps = parts.filter(p => p.col === '#5a5040' && inR(p));
    assert.ok(straps.length >= 3 && straps.every(p => p.x1 - p.x0 >= 0.7 * (rack.x1 - rack.x0)), `${at}: a strap across each shelf`);
    assert.ok(parts.some(p => p.col === '#4a5560' && inR(p)) && parts.some(p => p.col === '#3e5068' && inR(p)) && spools.some(inR), `${at}: loose spares, the turret's spare feed tray, the stock`);
  }
});
// #935: the plate stock the patches are cut from, in a rack on the wall under the bench, beside the welding kit.
const WS_RACK = ['#5a646c', '#606a70', '#525c66', '#4e5a64', '#2e3c4a', '#3a4a58', '#4a4e54'].map(wallTone);
test('the workshop keeps its plate stock in a rack on the wall under the bench, clear of everything else, beside the welding kit (#935)', () => {
  for (const pr of [0.02, 0.3, 0.45, 0.5]) for (const zoom of [0.82, 1.17, 1.45]) {
    const { r, s } = wsCase(pr, zoom), at = `${pr}, ${zoom}`, { ctx, calls } = recorder(); drawRoom(ctx, 'workshop', r, s);
    const c = fakeCtx(); drawRoom(c, 'workshop', r, s); assert.equal(c.depth, 0, `${at}: every save restored`);
    const all = placedParts(calls).filter(p => p.pts.length && /^(#|rgb)/.test(p.col)).map(p => ({ col: p.col, ...partBox({ pts: p.pts.map(q => q.slice(0, 2)) }) }));
    const rack = all.filter(p => WS_RACK.includes(p.col));
    for (const col of WS_RACK) assert.ok(rack.some(p => p.col === col), `${at}: ${col} in the rack`);
    assert.ok(rack.filter(p => p.col !== WS_RACK[4] && p.col !== WS_RACK[5] && p.col !== WS_RACK[6]).length >= 4, `${at}: plates of different sizes standing in it`);
    const cut = filledParts(calls).find(p => p.col === WS_RACK[3]); assert.ok(cut && cut.pts.length >= 6, `${at}: one with a doubler's shape cut out of it`);
    const b = { x0: Math.min(...rack.map(p => p.x0)) - 1, y0: Math.min(...rack.map(p => p.y0)) - 1, x1: Math.max(...rack.map(p => p.x1)) + 2.5, y1: Math.max(...rack.map(p => p.y1)) + 2.5 };  // with its brackets, the torch and its lead
    const wall = backWall(r), name = wsName(r, zoom), ov = q => b.x0 < q.x1 && b.x1 > q.x0 && b.y0 < q.y1 && b.y1 > q.y0;
    assert.ok(b.x0 >= wall.x0 && b.x1 <= wall.x1 && b.y0 >= wall.y0 && b.y1 <= wall.y1, `${at}: on the back wall (${JSON.stringify(b)})`);
    assert.ok(!ov(name), `${at}: clear of the name`);
    const top = all.find(p => p.col === '#46505a'); assert.ok(b.y0 > top.y1 && b.x0 > top.x0 && b.x1 < top.x1, `${at}: under the bench's top, below where hands work`);
    const [lx] = box.roomLamps('workshop', r); assert.ok(b.y0 > r.top + 40 || b.x1 < lx - 12 || b.x0 > lx + 12, `${at}: clear of the lamp`);
    const own = new Set([...WS_RACK, wallTone('#2a3e54'), wallTone('#8a6a48'), wallTone('#7a7462'), wallTone('#7a7e82'), wallTone('#8a8676'), wallTone('#6a5038'), wallTone('#8796a5'), wallTone('#56708c')]);
    for (const p of all.filter(q => !own.has(q.col))) assert.ok(!ov(p), `${at}: the rack (${JSON.stringify(b)}) clear of ${p.col} (${JSON.stringify(p)})`);
    for (const p of rack) { const v = rgbOf(p.col); assert.ok(Math.max(...v) <= 0xb0 && Math.max(...v) - Math.min(...v) <= 0x60, `${at}: ${p.col} inside the brightness limits`); }
    assert.ok(calls.some(k => k[0] === 'fillStyle' && k[1] === wallTone('#8a6a48')) && calls.some(k => k[0] === 'fillStyle' && k[1] === wallTone('#7a7462')), `${at}: a printed bracket and tape: old and patched`);
  }
});
test('the workshop reads old and patched: a newer fabricator on an older stand, a replacement shelf on printed brackets tagged temporary, tape and cable ties, wear where hands go (#933)', () => {
  for (const pr of [0.02, 0.3, 0.5]) {
    const { r, s } = wsCase(pr, 1.17), F = r.floor, at = `${pr}`, { calls, parts } = wsParts(r, s);
    const inside = ([x, y, w, h], b) => x >= b.x0 - 0.01 && x + w <= b.x1 + 0.01 && y >= b.y0 - 0.01 && y + h <= b.y1 + 0.01;
    const fab = parts.find(p => p.col === '#4a5866'), stand = parts.find(p => p.col === '#2a3a48' && p.y1 >= F - 1);
    assert.ok(stand.x0 <= fab.x0 && stand.x1 >= fab.x1, `${at}: the fabricator, newer, on an older stand`);
    assert.ok(wsRects(calls, '#8a929a').filter(([x, y]) => Math.abs(y - stand.y0) <= 2 && x >= stand.x0 && x <= stand.x1).length >= 2, `${at}: fresh bolts holding it to the stand`);
    const rack = parts.find(p => p.col === '#1c2a36'), shelf = parts.find(p => p.col === '#4a4e44');
    assert.ok(shelf && shelf.x0 >= rack.x0 - 1 && shelf.x1 <= rack.x1 + 1, `${at}: one shelf a replacement, in another shade`);
    const brackets = parts.filter(p => p.col === '#8a6a48' && p.y0 >= shelf.y1 - 0.5 && p.y0 <= shelf.y1 + 2), tag = parts.find(p => p.col === '#9a9050');
    assert.ok(brackets.length >= 2 && brackets.every(p => p.x1 - p.x0 <= 6), `${at}: printed brackets under the replacement shelf`);
    assert.ok(tag && tag.x1 - tag.x0 <= 6 && tag.y1 - tag.y0 <= 6 && tag.y0 >= shelf.y1 && tag.y0 <= shelf.y1 + 10, `${at}: the temporary tag hung from a bracket (${JSON.stringify(tag)})`);
    assert.ok(wsRects(calls, '#6a5038').filter(q => brackets.some(b => inside(q, b))).length >= 2, `${at}: a bracket's printed layers`);
    assert.ok(calls.some(k => k[0] === 'strokeStyle' && k[1] === '#3a3a40'), `${at}: the fabricator's cable`);
    const ties = wsRects(calls, '#1e2a36'), tape = parts.find(p => p.col === '#7a7462');
    assert.ok(ties.length >= 2 && ties.every(([x, y]) => x < fab.x0 + 2 && y > fab.y0 && y < F + 4), `${at}: cable ties on its cable, down the stand`);
    assert.ok(tape && tape.x1 <= fab.x0 + 3 && tape.x1 - tape.x0 <= 6, `${at}: a wrap of tape on the cable`);
    const top = parts.find(p => p.col === '#46505a'), vice = parts.find(p => p.col === '#4a5a4e');
    const wear = wsRects(calls, '#6a747c').filter(q => inside(q, { ...top, y0: top.y0 - 1, y1: top.y1 + 1 }));
    assert.ok(wear.length >= 2 && wear.some(([x, , w]) => x + w > vice.x0 - 20 && x < vice.x1 + 6), `${at}: paint worn off the bench's edge, by the vice`);
    assert.ok(wsRects(calls, '#3e4c5a').filter(([x, y]) => y >= F - 10 && x >= rack.x0 - 1 && x <= rack.x1).length >= 2, `${at}: scuffs low on the rack, where boots go`);
  }
});
test('the workshop\'s ceiling lamp is a fitting over the bench (#1024)', () => {
  for (const pr of [0.02, 0.3, 0.5]) {
    const { r, s } = wsCase(pr, 1.17), rec = recorder(); drawRoom(rec.ctx, 'workshop', r, s);
    const parts = filledParts(rec.calls), [x] = box.roomLamps('workshop', r), e = box.roomEye(r), back = r.top + (r.floor - 80 - r.top) * 0.2;
    assert.ok(parts.some(p => p.pts.some(q => near(q[0], x - 12) && near(q[1], r.top)) && p.pts.some(q => near(q[1], back) && near(q[0], box.roomInto(e, x + 9, r.top)[0]))), `${pr}: its plate on the sliver`);
    assert.ok(parts.some(p => p.col === '#3a4a5a' && p.outlined && near(Math.min(...p.pts.map(q => q[0])), x - 12) && near(Math.min(...p.pts.map(q => q[1])), r.top)), `${pr}: its housing hung from the ceiling`);
    assert.ok(rec.calls.some(k => k[0] === 'strokeRect' && near(k[1], x - 10.5) && near(k[2], r.top + 3)), `${pr}: the guard over its lens`);
  }
});
// #933, the airlock on the lock deck, beside the medbay across the well, where #940's inspector and junior come aboard: from the hull wall in,
// the lock's chamber, the outer door in the hull (a heavy hatch, dogged shut, its wheel, its seal ring and warning marks) and the inner door in
// the partition on the room side, the cycle lamp and its panel on the wall beside it (the pressure on both sides, the cycle lever in its guard);
// the floor in front of the inner door clear; then the bench by the airlock at the seated hip, the suits on their rack with their helmets on the
// shelf over them, their boots under them and a tether, and the lockers for suit spares at the well's wall. Old and patched (point 6). No routine
// sends anyone here (#973), so the drawing only has to leave room for #940. Drawn at the burn view's zoom in a window 1000, 1280 and 1600 wide.
const AL_PROPS = [['#5e5434', 'the warning marks round the outer door'], ['#3a4450', 'the outer door\'s seal ring'], ['#4a5462', 'the outer door'], ['#1a1e22', 'the seals'], ['#0e1b28', 'the partition'],
  ['#2c3a48', 'the inner door\'s frame'], ['#3a4856', 'the inner door'], ['#0e1a24', 'its window'], ['#24384c', 'the suit rack\'s boot tray'], ['#2e3e4c', 'its posts'], ['#34485a', 'its helmet shelf'],
  ['#56626e', 'its hanger rail'], ['#505c68', 'the suits'], ['#605642', 'the older suit'], ['#5a6470', 'the helmets'], ['#1a2a36', 'their visors'], ['#2e3438', 'the boots'], ['#8a8676', 'the suits\' tags'],
  ['#33506e', 'the bench'], ['#24425e', 'the older locker'], ['#2a3e4e', 'the newer locker'], ['#8a8270', 'the lockers\' number plates'],
  [wallTone('#2e3a44'), 'the cycle panel, on the wall'], [wallTone('#3e4a54'), 'its newer unit'], [wallTone('#a8a28e'), 'its pressure gauges'], [wallTone('#263a50'), 'the cycle lamp'],
  [wallTone('#5e666e'), 'the cycle lever'], [wallTone('#8a6a48'), 'its guard'], [wallTone('#3a5470'), 'the grab rails']];
const AL_WALL = ['#2e3a44', '#3e4a54', '#a8a28e', '#263a50', '#5e666e', '#8a6a48', '#9a9050', '#3a5470'];
const alCase = (pr, zoom, o = {}) => ({ r: layoutBox(LAYOUTS.freighter, 'airlock'), s: RS({ w: phaseWeights(pr), zoom, well: FW, damage: { marks: new Set(), severe: false }, ...o }) });
const alParts = (r, s) => { const { ctx, calls } = recorder(); drawRoom(ctx, 'airlock', r, s); return { calls, parts: filledParts(calls).filter(p => p.outlined && p.pts.length).map(p => ({ col: p.col, ...partBox(p) })), placed: placedParts(calls).filter(p => p.pts.length).map(p => ({ col: p.col, ...partBox({ pts: p.pts.map(q => q.slice(0, 2)) }) })) }; };
const alName = (r, zoom) => ({ x0: r.x0 + 12 - 4 / zoom, x1: r.x0 + 12 + 66 / zoom, y0: r.top + 8, y1: r.top + 8 + 16.9 / zoom });  // the name's plate (roomNameAt): AIRLOCK, 13px, about 58px wide
const alRects = (calls, col) => calls.flatMap((k, i) => k[0] === 'fillStyle' && k[1] === col && calls[i + 1][0] === 'fillRect' ? [calls[i + 1].slice(1)] : []);
// the inner door's partition: its front edge at the cut and its back edge on the back wall
const alPartition = (r, parts) => { const e = box.roomEye(r), leaf = parts.find(p => p.col === '#3a4856'), P = parts.find(p => p.col === '#2c3a48').x0; return { P, back: box.roomInto(e, P, r.top)[0], leaf }; };
test('the airlock is drawn to the figures\' standard in every phase: its props outlined and a step below the people, the name on clear wall (#933)', () => {
  assert.ok(WS_FITTED.includes('airlock'), 'its lamp a fitting');
  for (const marked of [false, true]) for (const pr of [0.02, 0.3, 0.45, 0.5]) for (const zoom of [0.82, 1.17, 1.45]) {
    const { r, s } = alCase(pr, zoom, marked ? { damage: { marks: new Set(['airlock']), severe: true }, night: 1 } : {}), at = `${marked ? 'damaged at night, ' : ''}${pr}, ${zoom}`;
    const c = fakeCtx(); drawRoom(c, 'airlock', r, s); assert.equal(c.depth, 0, `${at}: every save restored`);
    for (const f of c.fonts) assert.ok(Number(/(\d+(?:\.\d+)?)px/.exec(f)[1]) >= 12, `${at}: ${f}`);
    assert.ok(!c.calls.includes('fillText'), `${at}: no text in the room (the warning marks, the tags and the plates are marks)`);
    const { ctx, calls } = recorder(); drawRoom(ctx, 'airlock', r, s);
    const fills = col => calls.filter(k => k[0] === 'fillStyle' && k[1] === col).length;
    for (const [col, what] of AL_PROPS) assert.ok(fills(col) >= 1, `${at}: ${what} (${col})`);
    for (const col of AL_WALL) assert.equal(fills(col), 0, `${at}: nothing on the wall in its own colour (${col})`);
    // in the box (#1024): the bench's pad and the rack's tray solid, their tops showing; the lockers and the tray show their side toward the eye;
    // contact shadows under the bench, the tray and the lockers
    for (const [col, what] of [['#33506e', 'the bench\'s pad'], ['#24384c', 'the rack\'s boot tray']]) assert.ok(fills(solidTop(col)) >= 1, `${at}: ${what} solid, a top showing`);
    for (const [col, what] of [['#24384c', 'the rack\'s tray'], ['#24425e', 'the older locker'], ['#2a3e4e', 'the newer locker']]) assert.ok(fills(solidSide(col)) >= 1, `${at}: ${what}'s side toward the eye`);
    assert.ok(fills(SHADOW) >= 4, `${at}: contact shadows on the strip (${fills(SHADOW)})`);
    const outlined = filledParts(calls).filter(p => p.outlined);
    assert.ok(outlined.length >= 70, `${at}: the props outlined like the figures (${outlined.length})`);
    for (const { col } of outlined.filter(p => rgbOf(p.col))) {
      const v = rgbOf(col);
      assert.ok(Math.max(...v) <= 0xb0 && Math.max(...v) - Math.min(...v) <= 0x60, `${at}: ${col} is near-white or saturated, brighter than the people`);
    }
    for (const col of ['#e6dfc9', '#c0392b', '#c9a227', '#ffe2b8', '#ff8a6a', '#ffffff', '#ffb030']) assert.equal(fills(col), 0, `${at}: no bright block (${col})`);
    // the room's name on clear wall, where each thing is drawn (the wall's things moved onto it)
    const name = alName(r, zoom), hit = (b, x, y) => x > b.x0 && x < b.x1 && y > b.y0 && y < b.y1;
    for (const { k, v, pts } of roomOwnPlaced('airlock', r, s)) for (const [x, y] of pts) assert.ok(!hit(name, x, y), `${at}: ${k} ${v} at ${x}, ${y} under the room's name`);
    // what is on the wall is on the back wall, where it is drawn, and clear of the name's plate
    const wall = backWall(r), placed = placedParts(calls).map(p => ({ col: p.col, at: p.at, ...partBox(p) }));
    for (const col of AL_WALL) for (const p of placed.filter(q => q.col === wallTone(col))) {
      assert.ok(p.x0 >= wall.x0 && p.x1 <= wall.x1 && p.y0 >= wall.y0 && p.y1 <= wall.y1 && (p.at[0] || p.at[1]), `${at}: ${col} (${JSON.stringify(p)}) on the back wall`);
      assert.ok(p.x1 <= name.x0 || p.x0 >= name.x1 || p.y1 <= name.y0 || p.y0 >= name.y1, `${at}: ${col} (${JSON.stringify(p)}) clear of the name's plate`);
    }
  }
  const stillAt = t => { const { r, s } = alCase(0.5, 1.17), c = fakeCtx(); drawRoom(c, 'airlock', r, { ...s, still: true, time: t }); return c.args.join('|'); };
  assert.equal(stillAt(1.3), stillAt(4.9), 'the same frame at any time under reduced motion');
});
test('the airlock reads as two doors with a chamber between: the outer door in the hull wall, the inner door in the partition beside it, the cycle lamp and panel by it (#933, #940)', () => {
  for (const zoom of [0.82, 1.17, 1.45]) for (const pr of [0.02, 0.3, 0.5]) {
    const { r, s } = alCase(pr, zoom), F = r.floor, at = `${pr}, ${zoom}`, { calls, parts, placed } = alParts(r, s), wall = backWall(r);
    // the outer door: in the hull's wall (the room's left side wall, from the cut back to the back wall), a hatch a person stoops through,
    // dogged shut: its seal ring, the door in it with its wheel and dogs, the warning marks round it
    const ring = parts.find(p => p.col === '#3a4450'), outer = parts.find(p => p.col === '#4a5462'), band = parts.find(p => p.col === '#5e5434' && p.x1 <= wall.x0 + 0.01);
    assert.ok(ring && ring.x0 >= r.x0 - 0.01 && ring.x1 <= wall.x0 + 0.01, `${at}: the outer door's ring (${JSON.stringify(ring)}) in the hull's side wall`);
    assert.ok(ring.y1 >= F - 3 && F - ring.y0 >= 60 && F - ring.y0 <= 72, `${at}: a hatch a person stoops through, from the floor (${F - ring.y0})`);
    assert.ok(outer && outer.x0 >= ring.x0 && outer.x1 <= ring.x1 && outer.y0 >= ring.y0 && outer.y1 <= ring.y1, `${at}: the door in its ring`);
    assert.ok(band && band.x0 <= ring.x0 && band.x1 >= ring.x1 && band.y0 <= ring.y0, `${at}: the warning marks round it`);
    assert.ok(calls.filter(k => k[0] === 'fillStyle' && k[1] === '#22201a').length >= 4, `${at}: the warning marks striped`);
    const wheel = calls.findIndex(k => k[0] === 'strokeStyle' && k[1] === '#6a6e70');
    const el = calls.slice(wheel).find(k => k[0] === 'ellipse');
    assert.ok(wheel >= 0 && el && el[1] > outer.x0 && el[1] < outer.x1 && el[2] > outer.y0 && el[2] < outer.y1, `${at}: its wheel on the door`);
    assert.ok(alRects(calls, '#7a7e82').filter(([x, y, w, h]) => x >= ring.x0 - 0.5 && x + w <= ring.x1 + 0.5 && y >= ring.y0 && y + h <= ring.y1).length >= 4, `${at}: dogged shut, its dogs`);
    // the inner door, in the partition from the cut back to the back wall, its face toward the room, the chamber between the two doors
    const { P, back, leaf } = alPartition(r, parts);
    assert.ok(filledParts(calls).some(p => p.pts.some(q => near(q[0], P) && near(q[1], r.top)) && p.pts.some(q => near(q[0], P) && near(q[1], F)) && p.pts.some(q => near(q[0], back))), `${at}: the partition from the cut to the back wall`);
    assert.equal(parts.filter(p => p.col === '#3a4856').length, 1, `${at}: one inner door`);
    assert.ok(P - r.x0 >= 80 && P - r.x0 <= 110, `${at}: a chamber two people can stand in between the doors (${P - r.x0})`);
    assert.ok(leaf.x0 >= P && leaf.x1 <= back && leaf.x1 - leaf.x0 >= 0.7 * (back - P), `${at}: the inner door fills its opening, shut (${leaf.x1 - leaf.x0} of ${back - P})`);
    assert.ok(F - leaf.y0 >= 80 && F - leaf.y0 <= 90 && leaf.y1 >= F - 4, `${at}: the inner door a person high, from the floor (${F - leaf.y0})`);
    const win = parts.find(p => p.col === '#0e1a24');
    assert.ok(win && win.x0 >= leaf.x0 && win.x1 <= leaf.x1 && F - win.y0 <= 76 && F - win.y1 >= 54, `${at}: its window at the eye (${JSON.stringify(win)})`);
    // the cycle lamp and panel on the wall beside the inner door, at the hand; the lamp dark, idle
    const panel = placed.find(p => p.col === wallTone('#2e3a44'));
    assert.ok(panel && panel.x0 >= back - 0.5 && panel.x0 <= back + 12 && F - panel.y0 <= 80 && F - panel.y1 >= 36, `${at}: the panel (${JSON.stringify(panel)}) beside the inner door, at the hand`);
    const inP = p => p.x0 >= panel.x0 - 0.5 && p.x1 <= panel.x1 + 0.5 && p.y0 >= panel.y0 - 0.5 && p.y1 <= panel.y1 + 0.5;
    assert.equal(placed.filter(p => p.col === wallTone('#a8a28e') && inP(p)).length, 2, `${at}: the pressure on both sides of the inner door, a gauge each`);
    const lamp = placed.find(p => p.col === wallTone('#263a50')), lever = placed.find(p => p.col === wallTone('#5e666e')), guard = placed.find(p => p.col === wallTone('#8a6a48') && p.x1 - p.x0 >= 8);
    assert.ok(lamp && lamp.y1 <= panel.y0 + 1 && lamp.x0 >= panel.x0 && lamp.x1 <= panel.x1 && lamp.x1 - lamp.x0 <= 9, `${at}: the cycle lamp over the panel`);
    const lens = calls.filter((k, i) => k[0] === 'fillStyle' && calls[i + 3] && calls.slice(i + 1, i + 4).some(q => q[0] === 'arc')).map(k => k[1]).filter(c => c === wallTone('#3e2a26'));
    assert.ok(lens.length >= 1, `${at}: its lens, dark while the lock is idle`);
    const v = rgbOf(wallTone('#3e2a26')); assert.ok(Math.max(...v) <= 0x50 && Math.max(...v) - Math.min(...v) <= 0x30, 'dark, never saturated');
    assert.ok(lever && guard && inP(lever) && guard.x0 <= lever.x0 && guard.x1 >= lever.x1 && guard.y1 >= lever.y1, `${at}: the cycle lever in its guard`);
  }
});
test('the floor in front of the inner door is clear for #940\'s boarders, and the chamber\'s floor between the doors (#933, #940)', () => {
  for (const zoom of [0.82, 1.17, 1.45]) for (const pr of [0.02, 0.3, 0.5]) {
    const { r, s } = alCase(pr, zoom), F = r.floor, at = `${pr}, ${zoom}`, { calls, parts } = alParts(r, s), { P } = alPartition(r, parts), wall = backWall(r);
    const standing = parts.filter(p => p.y1 >= F - 6 && p.y1 <= F + 0.5 && F - p.y0 > 4 && p.col !== '#0e1b28');
    assert.ok(standing.length >= 4, `${at}: things standing on the floor (${standing.length})`);
    const { back } = alPartition(r, parts);  // the outer door is in the hull's side wall and the inner door in its partition; nothing else stands short of P + 44
    for (const p of standing) assert.ok(p.x1 <= wall.x0 + 0.01 || (p.x0 >= P - 0.5 && p.x1 <= back + 0.5) || p.x0 >= P + 44, `${at}: ${p.col} (${JSON.stringify(p)}) on the floor in front of the inner door or in the chamber`);
    const shadows = filledParts(calls).filter(p => p.col === SHADOW).map(partBox);
    for (const sh of shadows) assert.ok(sh.x0 >= P + 40, `${at}: no shadow (${JSON.stringify(sh)}) in front of the inner door`);
  }
});
test('the airlock is sized to a person: the suits a person\'s size on their rack, the helmets on the shelf over them, the bench at the seated hip, the lockers at the head (#933, #960)', () => {
  for (const pr of [0.02, 0.3, 0.5]) {
    const { r, s } = alCase(pr, 1.17), F = r.floor, at = `${pr}`, { calls, parts } = alParts(r, s);
    const fills = col => calls.filter(k => k[0] === 'fillStyle' && k[1] === col).length;
    const suits = parts.filter(p => /^#(505c68|605642)$/.test(p.col) && p.x1 - p.x0 >= 16 && p.y1 >= F - 30).sort((a, b) => a.x0 - b.x0);
    assert.equal(suits.length, 3, `${at}: three suits`);
    for (const p of suits) {
      assert.ok(F - p.y0 >= 72 && F - p.y0 <= 80 && F - p.y1 >= 10 && F - p.y1 <= 18, `${at}: a suit (${JSON.stringify(p)}) hung at a person's height, collar to ankle`);
      assert.ok(p.x1 - p.x0 >= 18 && p.x1 - p.x0 <= 26, `${at}: a suit a person wide (${p.x1 - p.x0})`);
    }
    for (let k = 1; k < 3; k++) assert.ok(suits[k].x0 >= suits[k - 1].x1, `${at}: the suits side by side`);
    const rail = parts.find(p => p.col === '#56626e' && p.x1 - p.x0 >= 60);
    for (const p of suits) assert.ok(rail && rail.x0 <= p.x0 && rail.x1 >= p.x1 && p.y0 - rail.y1 <= 3 && p.y0 >= rail.y0, `${at}: hung from the rail`);
    const shelf = parts.find(p => p.col === '#34485a'), helmets = parts.filter(p => /^#(5a6470|605642)$/.test(p.col) && p.y1 <= shelf.y0 + 0.6);
    assert.equal(helmets.length, 3, `${at}: three helmets on the shelf`);
    for (const h of helmets) {
      assert.ok(h.x1 - h.x0 >= 12 && h.x1 - h.x0 <= 16 && h.y1 - h.y0 >= 10 && h.y1 - h.y0 <= 14, `${at}: a helmet (${JSON.stringify(h)}) a head's size`);
      assert.ok(Math.abs(h.y1 - shelf.y0) <= 0.6 && h.y0 >= r.top + 2, `${at}: on the shelf, under the ceiling`);
    }
    assert.ok(shelf.y1 <= rail.y0 + 0.5, `${at}: the shelf over the suits`);
    const tray = parts.find(p => p.col === '#24384c'), boots = parts.filter(p => p.col === '#2e3438');
    assert.ok(boots.length >= 6 && boots.every(b => Math.abs(b.y1 - tray.y0) <= 0.6 && suits.some(p => b.x0 >= p.x0 - 3 && b.x1 <= p.x1 + 3) && b.y1 - b.y0 <= 8), `${at}: a pair of boots under each suit, on the tray`);
    const pad = parts.find(p => p.col === '#33506e');
    assert.ok(Math.abs(F - pad.y0 - 23) <= 1.5 && pad.x1 - pad.x0 >= 40 && pad.x1 - pad.x0 <= 70, `${at}: the bench at the seated hip, two people long (${F - pad.y0}, ${pad.x1 - pad.x0})`);
    assert.ok(fills(solidTop('#33506e')) >= 1, `${at}: the bench solid`);
    for (const col of ['#24425e', '#2a3e4e']) {
      const l = parts.find(p => p.col === col);
      assert.ok(F - l.y0 >= 82 && F - l.y0 <= 92 && l.y1 >= F - 0.5 && l.x1 <= r.x1, `${at}: a locker (${JSON.stringify(l)}) at a person's head`);
    }
    const [lx] = box.roomLamps('airlock', r);
    assert.ok(lx > pad.x0 && lx < pad.x1, `${at}: the lamp over the bench`);
    for (const p of parts.filter(q => q.col !== '#0e1b28' && q.col !== '#3a4a5a')) assert.ok(p.y0 >= r.top + 3 && p.x0 >= r.x0 - 0.01 && p.x1 <= r.x1, `${at}: ${p.col} (${JSON.stringify(p)}) in the room, under the ceiling`);
  }
});
test('the airlock has what it is for and reads old and patched: tethers and tags on the suits, an older suit patched, a newer unit on an older panel, a printed guard tagged temporary, tape, cable ties, wear (#933)', () => {
  for (const pr of [0.02, 0.3, 0.5]) {
    const { r, s } = alCase(pr, 1.17), F = r.floor, at = `${pr}`, { calls, parts, placed } = alParts(r, s);
    const inside = ([x, y, w, h], b) => x >= b.x0 - 0.01 && x + w <= b.x1 + 0.01 && y >= b.y0 - 0.01 && y + h <= b.y1 + 0.01;
    const inBox = (p, b) => p.x0 >= b.x0 - 0.01 && p.x1 <= b.x1 + 0.01 && p.y0 >= b.y0 - 0.01 && p.y1 <= b.y1 + 0.01;
    const suits = parts.filter(p => /^#(505c68|605642)$/.test(p.col) && p.x1 - p.x0 >= 16 && p.y1 >= F - 30), older = suits.filter(p => p.col === '#605642');
    assert.equal(older.length, 1, `${at}: one suit older, in another finish`);
    const tags = parts.filter(p => p.col === '#8a8676' && suits.some(q => inBox(p, q)));
    assert.equal(tags.length, 3, `${at}: a tag on each suit, its date`);
    assert.ok(parts.some(p => p.col === '#4e5a4a' && inBox(p, older[0])), `${at}: a patch on the older suit`);
    assert.ok(parts.some(p => p.col === '#7a7462' && p.x0 >= older[0].x0 - 6 && p.x1 <= older[0].x1 + 6 && p.y0 >= older[0].y0), `${at}: tape on the older suit`);
    assert.ok(calls.some(k => k[0] === 'strokeStyle' && k[1] === '#7a6a3e'), `${at}: a tether, coiled`);
    const pad = parts.find(p => p.col === '#33506e');
    assert.ok(parts.some(p => p.col === '#7a7462' && p.x0 >= pad.x0 && p.x1 <= pad.x1 && p.y0 >= pad.y0 - 1 && p.y1 <= pad.y1 + 1), `${at}: tape over a split in the bench's pad`);
    const panel = placed.find(p => p.col === wallTone('#2e3a44')), unit = placed.find(p => p.col === wallTone('#3e4a54'));
    assert.ok(unit && inBox(unit, panel), `${at}: a newer unit on the older panel`);
    assert.ok(placedRects(calls).filter(q => q.col === wallTone('#8a929a') && inside([q.x, q.y, q.w, q.h], { ...unit, x0: unit.x0 - 1, x1: unit.x1 + 1, y0: unit.y0 - 1, y1: unit.y1 + 1 })).length >= 4, `${at}: fresh bolts holding it on`);
    const guard = placed.find(p => p.col === wallTone('#8a6a48') && p.x1 - p.x0 >= 8), tag = placed.find(p => p.col === wallTone('#9a9050'));
    assert.ok(tag && tag.x1 - tag.x0 <= 6 && tag.y0 >= guard.y0 && tag.y0 <= guard.y1 + 8, `${at}: the printed guard's temporary tag`);
    assert.ok(placedRects(calls).filter(q => q.col === wallTone('#6a5038') && inside([q.x, q.y, q.w, q.h], guard)).length >= 2, `${at}: the guard's printed layers`);
    assert.ok(placedRects(calls).filter(q => q.col === wallTone('#1e2a36') && q.y >= panel.y1).length >= 2, `${at}: cable ties on the panel's conduit`);
    const { leaf } = alPartition(r, parts);
    assert.ok(alRects(calls, '#56626e').filter(([x, y, w, h]) => x >= leaf.x0 - 0.5 && x + w <= leaf.x1 + 0.5 && F - y >= 36 && F - y - h <= 52).length >= 2, `${at}: the paint worn round the inner door's handle, where hands go`);
    const ring = parts.find(p => p.col === '#3a4450');
    assert.ok(alRects(calls, '#4a4a40').filter(([x, y]) => y >= F - 6 && x <= ring.x1 + 2).length >= 2, `${at}: scuffs at the outer door's sill, where boots go`);
    assert.ok(calls.filter(k => k[0] === 'strokeStyle' && k[1] === '#4a6680').length >= 3, `${at}: tie-down rings in the deck`);
  }
});
test('the airlock\'s ceiling lamp is a fitting over the bench (#1024)', () => {
  for (const pr of [0.02, 0.3, 0.5]) {
    const { r, s } = alCase(pr, 1.17), rec = recorder(); drawRoom(rec.ctx, 'airlock', r, s);
    const parts = filledParts(rec.calls), [x] = box.roomLamps('airlock', r), e = box.roomEye(r), back = r.top + (r.floor - 80 - r.top) * 0.2;
    assert.ok(parts.some(p => p.pts.some(q => near(q[0], x - 12) && near(q[1], r.top)) && p.pts.some(q => near(q[1], back) && near(q[0], box.roomInto(e, x + 9, r.top)[0]))), `${pr}: its plate on the sliver`);
    assert.ok(parts.some(p => p.col === '#3a4a5a' && p.outlined && near(Math.min(...p.pts.map(q => q[0])), x - 12) && near(Math.min(...p.pts.map(q => q[1])), r.top)), `${pr}: its housing hung from the ceiling`);
    assert.ok(rec.calls.some(k => k[0] === 'strokeRect' && near(k[1], x - 10.5) && near(k[2], r.top + 3)), `${pr}: the guard over its lens`);
  }
});
// #933, life support on the plant deck over the water tank, full width, two bays either side of the well, where the engineer's rounds bring them
// (ROUNDS, shiplife.js; goTo puts them a quarter to three quarters of the way across, clear of the well). What the game says of it (LIFE_LINES,
// the scenes): the air recycler holds the scrubber cartridges in a stack (one swapped and dated, four spares counted), its fans logged one by one,
// the carbon dioxide figure read off the panel by it, the condensate line under it with its clamp, the dust filter on the air intake, the fans in
// the ducts, and the slate by the hatch. Left bay: the water recycler under the room's name, its pipes down through the deck into the tank, its
// sight glass, gauge and valves; the bench at the waist with the four spares in the rack under it. Right bay: the air recycler, its fan row at the
// waist and the scrubber stack at the hull wall, one bay empty and its cartridge out on the fan row; the panel at the eye over the fans with its
// alarm lamp dark. The main air duct along both back walls. Old and patched (point 6). Drawn at the burn view's zoom in a window 1000, 1280 and 1600 wide.
const { HULL: LS_HULL } = load(['js/data.js', 'js/util.js', 'js/figures.js', 'js/layouts.js', 'js/camera.js'], { G: {} }, ['HULL']);
const LS_PROPS = [['#3a4a52', 'the water recycler'], ['#4a5a62', 'its newer filter canister'], ['#0e1a24', 'its sight glass'], ['#44505a', 'its replacement panel'], ['#36506a', 'the water pipes'],
  ['#4f6f8f', 'the pipes\' collars at the deck'], ['#46525a', 'the bench\'s top'], ['#2c3a46', 'its cabinet'], ['#34485a', 'the rack\'s shelves'], ['#4e5a50', 'the scrubber cartridges'], ['#5a5040', 'the straps'],
  ['#5a5e56', 'the bagged filter'], ['#34424e', 'the scrubber stack'], ['#3c4a56', 'its service panel'], ['#0e161c', 'the empty bay'], ['#8a8676', 'the date tags'], ['#3a4652', 'the fan row'], ['#4a5660', 'the newer fan'],
  ['#6a6e70', 'the condensate line\'s clamp'], ['#8a6a48', 'the printed handle'],
  [wallTone('#2e4458'), 'the main air duct, on the wall'], [wallTone('#3a4440'), 'the air intake'], [wallTone('#6a6a5a'), 'its dust filter'], [wallTone('#2a3844'), 'the control panel'],
  [wallTone('#0c161e'), 'its readouts'], [wallTone('#263a50'), 'the alarm lamp'], [wallTone('#2a302c'), 'the slate'], [wallTone('#3d5a7a'), 'the grey water line']];
const LS_WALL = ['#2e4458', '#3a5266', '#3a4440', '#6a6a5a', '#2a3844', '#0c161e', '#263a50', '#2a302c', '#7a7c74', '#3d5a7a'];
const lsCase = (pr, zoom, o = {}) => ({ r: layoutBox(LAYOUTS.freighter, 'lifesupport'), s: RS({ w: phaseWeights(pr), zoom, well: FW, damage: { marks: new Set(), severe: false }, ...o }) });
const lsParts = (r, s) => { const { ctx, calls } = recorder(); drawRoom(ctx, 'lifesupport', r, s); return { calls, parts: filledParts(calls).filter(p => p.outlined && p.pts.length).map(p => ({ col: p.col, ...partBox(p) })), placed: placedParts(calls).filter(p => p.pts.length).map(p => ({ col: p.col, ...partBox({ pts: p.pts.map(q => q.slice(0, 2)) }) })) }; };
const lsName = (r, zoom) => ({ x0: r.x0 + 12 - 4 / zoom, x1: r.x0 + 12 + 96 / zoom, y0: r.top + 8, y1: r.top + 8 + 16.9 / zoom });  // the name's plate (roomNameAt): LIFE SUPPORT, 13px, about 92px wide
const lsRects = (calls, col) => calls.flatMap((k, i) => k[0] === 'fillStyle' && k[1] === col && calls[i + 1][0] === 'fillRect' ? [calls[i + 1].slice(1)] : []);
const lsBays = r => box.roomBays(r, FW).map(b => backWall(b));
const lsIn = (p, b) => p.x0 >= b.x0 - 0.01 && p.x1 <= b.x1 + 0.01 && p.y0 >= b.y0 - 0.01 && p.y1 <= b.y1 + 0.01;
test('life support is drawn to the figures\' standard in every phase: its props outlined and a step below the people, the name on clear wall, the well clear (#933)', () => {
  assert.ok(WS_FITTED.includes('lifesupport'), 'its lamps fittings');
  for (const marked of [false, true]) for (const pr of [0.02, 0.3, 0.45, 0.5]) for (const zoom of [0.82, 1.17, 1.45]) {
    const { r, s } = lsCase(pr, zoom, marked ? { damage: { marks: new Set(['lifesupport']), severe: true }, night: 1 } : {}), at = `${marked ? 'damaged at night, ' : ''}${pr}, ${zoom}`;
    const c = fakeCtx(); drawRoom(c, 'lifesupport', r, s); assert.equal(c.depth, 0, `${at}: every save restored`);
    for (const f of c.fonts) assert.ok(Number(/(\d+(?:\.\d+)?)px/.exec(f)[1]) >= 12, `${at}: ${f}`);
    assert.ok(!c.calls.includes('fillText'), `${at}: no text in the room (the readouts, the tags and the slate are marks)`);
    const { ctx, calls } = recorder(); drawRoom(ctx, 'lifesupport', r, s);
    const fills = col => calls.filter(k => k[0] === 'fillStyle' && k[1] === col).length;
    for (const [col, what] of LS_PROPS) assert.ok(fills(col) >= 1, `${at}: ${what} (${col})`);
    for (const col of LS_WALL) assert.equal(fills(col), 0, `${at}: nothing on the wall in its own colour (${col})`);
    // in the box (#1024): the water recycler, the bench's top and the fans solid, their tops showing; the recycler, the stack and the first fan show
    // their sides toward the eye; contact shadows under the recycler, the rack, the cabinet, the fan row and the stack
    for (const [col, what] of [['#3a4a52', 'the water recycler'], ['#46525a', 'the bench\'s top'], ['#3a4652', 'the fans']]) assert.ok(fills(solidTop(col)) >= 1, `${at}: ${what} solid, a top showing`);
    for (const [col, what] of [['#3a4a52', 'the water recycler'], ['#34424e', 'the scrubber stack'], ['#3a4652', 'the first fan']]) assert.ok(fills(solidSide(col)) >= 1, `${at}: ${what}'s side toward the eye`);
    assert.ok(fills(SHADOW) >= 5, `${at}: contact shadows on the strip (${fills(SHADOW)})`);
    const outlined = filledParts(calls).filter(p => p.outlined);
    assert.ok(outlined.length >= 90, `${at}: the props outlined like the figures (${outlined.length})`);
    for (const { col } of outlined.filter(p => rgbOf(p.col))) {
      const v = rgbOf(col);
      assert.ok(Math.max(...v) <= 0xb0 && Math.max(...v) - Math.min(...v) <= 0x60, `${at}: ${col} is near-white or saturated, brighter than the people`);
    }
    for (const col of ['#e6dfc9', '#c0392b', '#c9a227', '#ffe2b8', '#ff8a6a', '#ffffff', '#ffb030']) assert.equal(fills(col), 0, `${at}: no bright block (${col})`);
    // the room's name on clear wall, and nothing in the ladder well, where each thing is drawn (the wall's things moved onto it)
    const name = lsName(r, zoom), hit = (b, x, y) => x > b.x0 && x < b.x1 && y > b.y0 && y < b.y1;
    for (const { k, v, pts } of roomOwnPlaced('lifesupport', r, s)) for (const [x, y] of pts) {
      assert.ok(!hit(name, x, y), `${at}: ${k} ${v} at ${x}, ${y} under the room's name`);
      assert.ok(!(x > FW.x0 + 0.01 && x < FW.x1 - 0.01), `${at}: ${k} ${v} at ${x}, ${y} in the ladder well`);
    }
    // what is on the wall is on the back wall of its bay, where it is drawn, and clear of the name's plate
    const bays = lsBays(r), placed = placedParts(calls).map(p => ({ col: p.col, at: p.at, ...partBox(p) }));
    for (const col of LS_WALL) for (const p of placed.filter(q => q.col === wallTone(col))) {
      assert.ok(bays.some(b => lsIn(p, b)) && (p.at[0] || p.at[1]), `${at}: ${col} (${JSON.stringify(p)}) on a back wall`);
      assert.ok(p.x1 <= name.x0 || p.x0 >= name.x1 || p.y1 <= name.y0 || p.y0 >= name.y1, `${at}: ${col} (${JSON.stringify(p)}) clear of the name's plate`);
    }
  }
  const stillAt = t => { const { r, s } = lsCase(0.5, 1.17), c = fakeCtx(); drawRoom(c, 'lifesupport', r, { ...s, still: true, time: t }); return c.args.join('|'); };
  assert.equal(stillAt(1.3), stillAt(4.9), 'the same frame at any time under reduced motion');
});
test('whoever is at work in life support stands at the bench or at the air recycler\'s fans, never inside a fixture (#933, #973)', () => {
  const lay = LAYOUTS.freighter, half = lay.well.w / 2 * lay.width + 12, wx = lay.well.x * lay.width;
  for (const zoom of [0.82, 1.17, 1.45]) for (const pr of [0.02, 0.3, 0.5]) {
    const { r, s } = lsCase(pr, zoom), F = r.floor, W = r.x1 - r.x0, at = `${pr}, ${zoom}`, { parts } = lsParts(r, s);
    const spots = [];  // where an errand puts them (goTo, shiplife.js): a quarter to three quarters across, and off the well to its nearer side (clearOf)
    for (let x = r.x0 + 0.25 * W; x <= r.x0 + 0.75 * W + 1e-9; x += W / 80) spots.push(Math.abs(x - wx) < half ? (x < wx ? wx - half : wx + half) : x);
    const onFloor = parts.filter(p => p.y1 >= F - 6 && p.y1 <= F + 0.5 && /^#/.test(p.col));  // the fronts at the cut, where people stand
    assert.ok(onFloor.length >= 5, `${at}: things standing on the floor (${onFloor.length})`);
    const lo = Math.min(...spots), hi = Math.max(...spots);
    for (const p of onFloor.filter(q => q.x1 > lo - 12 && q.x0 < hi + 12)) assert.ok(F - p.y0 <= 46, `${at}: ${p.col} (${JSON.stringify(p)}) standing higher than the waist where someone stands at work`);
    const tops = parts.filter(p => (p.col === '#46525a' || (/^#(3a4652|4a5660)$/.test(p.col) && p.y1 - p.y0 >= 30)) && F - p.y0 >= 38 && F - p.y0 <= 46);
    const runs = [...tops].sort((a, b) => a.x0 - b.x0).reduce((o, t) => { const l = o[o.length - 1]; if (l && t.x0 <= l.x1 + 0.5) l.x1 = Math.max(l.x1, t.x1); else o.push({ x0: t.x0, x1: t.x1 }); return o; }, []);  // the fans side by side are one row
    for (const x of spots) assert.ok(runs.some(t => x >= t.x0 + 3 && x <= t.x1 - 3), `${at}: someone at ${x} is at the bench or the fans (${JSON.stringify(runs)})`);
    const lamps = box.roomLamps('lifesupport', r), bench = parts.find(p => p.col === '#46525a'), fans = tops.filter(t => t.col !== '#46525a');
    assert.ok(lamps[0] > bench.x0 + 20 && lamps[0] < bench.x1 - 20, `${at}: a lamp over the bench`);
    assert.ok(lamps[1] > Math.min(...fans.map(f => f.x0)) && lamps[1] < Math.max(...fans.map(f => f.x1)), `${at}: a lamp over the fans`);
  }
});
test('life support is sized to a person: the water recycler under the name, the stack under a person\'s head, the bench and the fans at the waist, the panel at the eye (#933, #960)', () => {
  for (const pr of [0.02, 0.3, 0.5]) {
    const { r, s } = lsCase(pr, 1.17), F = r.floor, at = `${pr}`, { parts, placed } = lsParts(r, s);
    const rec = parts.find(p => p.col === '#3a4a52');
    assert.ok(F - rec.y0 >= 50 && F - rec.y0 <= 64 && rec.x1 - rec.x0 >= 80 && rec.x1 - rec.x0 <= 120 && rec.x0 >= r.x0 + 4, `${at}: the water recycler (${JSON.stringify(rec)}) a unit a person services, chest high`);
    const stack = parts.find(p => p.col === '#34424e');
    assert.ok(F - stack.y0 >= 80 && F - stack.y0 <= FIG_TALL - 3 && stack.x1 - stack.x0 >= 90 && stack.x1 - stack.x0 <= 120 && stack.x1 <= r.x1 - 6, `${at}: the scrubber stack (${JSON.stringify(stack)}) under a person's head`);
    const bench = parts.find(p => p.col === '#46525a');
    assert.ok(F - bench.y0 >= 38 && F - bench.y0 <= 44 && bench.y1 - bench.y0 <= 6, `${at}: the bench's top at the waist (${F - bench.y0})`);
    const fans = parts.filter(p => /^#(3a4652|4a5660)$/.test(p.col) && p.y1 - p.y0 >= 30);
    assert.equal(fans.length, 3, `${at}: three fans in a row`);
    for (const f of fans) assert.ok(F - f.y0 >= 40 && F - f.y0 <= 46 && f.x1 - f.x0 >= 60 && f.x1 - f.x0 <= 76, `${at}: a fan (${JSON.stringify(f)}) at the waist`);
    const carts = parts.filter(p => p.col === '#4e5a50');
    assert.ok(carts.length >= 10, `${at}: the cartridges (${carts.length})`);
    for (const c of carts) assert.ok(c.x1 - c.x0 >= 36 && c.x1 - c.x0 <= 42 && c.y1 - c.y0 >= 12 && c.y1 - c.y0 <= 16, `${at}: a cartridge (${JSON.stringify(c)}) the size of a forearm's length, all alike`);
    const panel = placed.find(p => p.col === wallTone('#2a3844'));
    assert.ok(panel && F - panel.y0 <= 77 && F - panel.y1 >= 40, `${at}: the panel (${JSON.stringify(panel)}) at the eye`);
    for (const p of parts.filter(q => q.col !== '#3a4a5a' && q.col !== '#36506a' && q.col !== '#4f6f8f')) assert.ok(p.y0 >= r.top + 3 && p.x0 >= r.x0 && p.x1 <= r.x1 && p.y1 <= F + 0.5 && (p.x1 - p.x0) * (p.y1 - p.y0) <= (stack.x1 - stack.x0) * (stack.y1 - stack.y0) + 0.01, `${at}: ${p.col} (${JSON.stringify(p)}) in the room, nothing bigger than the stack`);
  }
});
test('the water recycler\'s pipes run down through the deck to the tank\'s top under the cut; it has its sight glass, gauge and valves (#933)', () => {
  for (const zoom of [0.82, 1.17, 1.45]) for (const pr of [0.02, 0.3, 0.5]) {
    const { r, s } = lsCase(pr, zoom), F = r.floor, at = `${pr}, ${zoom}`, { calls, parts } = lsParts(r, s), tank = F + LS_HULL.plate;
    const rec = parts.find(p => p.col === '#3a4a52'), pipes = parts.filter(p => p.col === '#36506a');
    const down = pipes.filter(p => p.y1 >= tank - 0.5 && p.y1 <= tank + 0.5 && p.y0 < F - 20 && p.x0 >= rec.x1 - 1 && p.x1 <= rec.x1 + 30 && p.x1 - p.x0 <= 6);
    assert.ok(down.length >= 2, `${at}: two pipes from the recycler down through the deck to the tank's top (${JSON.stringify(pipes)})`);
    for (const p of down) {
      assert.ok(pipes.some(q => q.y1 - q.y0 <= 6 && q.x0 <= rec.x1 + 0.5 && q.x1 >= p.x0 && q.y0 >= p.y0 - 1 && q.y1 <= p.y0 + 7), `${at}: the pipe at ${p.x0} leaves the recycler's side`);
      assert.ok(parts.some(q => q.col === '#4f6f8f' && q.x0 <= p.x0 && q.x1 >= p.x1 && q.y0 <= F && q.y1 >= F), `${at}: a collar where it goes through the deck`);
    }
    assert.ok(calls.filter(k => k[0] === 'strokeStyle' && k[1] === ENGINE_VALVE).length >= 1, `${at}: a valve wheel`);
    const glass = parts.find(p => p.col === '#0e1a24');
    assert.ok(glass && lsIn(glass, rec) && glass.y1 - glass.y0 >= 24, `${at}: the sight glass on the recycler`);
    assert.ok(placedRects(calls).some(q => q.col === 'rgba(70,140,190,0.6)' && q.x >= glass.x0 && q.x + q.w <= glass.x1 && q.y >= glass.y0 && q.y + q.h <= glass.y1 + 0.01), `${at}: water in the glass`);
    assert.ok(parts.some(p => p.col === '#a8a28e' && lsIn(p, rec)), `${at}: a gauge on the recycler`);
    // the condensate line under the air recycler, down through the deck, its clamp
    const fans = parts.filter(p => /^#(3a4652|4a5660)$/.test(p.col) && p.y1 - p.y0 >= 30), f0 = Math.min(...fans.map(f => f.x0)), f1 = Math.max(...fans.map(f => f.x1));
    const cond = pipes.find(p => p.x0 >= f0 && p.x1 <= f1 && p.y1 >= tank - 0.5 && p.y0 >= F - 20);
    assert.ok(cond, `${at}: the condensate line under the fans, down to the tank`);
    assert.ok(parts.some(p => p.col === '#6a6e70' && p.x0 <= cond.x0 && p.x1 >= cond.x1 && p.y1 - p.y0 <= 4), `${at}: its clamp`);
  }
});
test('the air recycler has what the ship says of it: the cartridges stacked, one out and dated, four spares strapped in the rack, the fans with their grilles, the panel and its dark alarm lamp, the intake\'s filter, the slate by the hatch (#933)', () => {
  for (const pr of [0.02, 0.3, 0.5]) {
    const { r, s } = lsCase(pr, 1.17), F = r.floor, at = `${pr}`, { calls, parts, placed } = lsParts(r, s), [lb, rb] = lsBays(r);
    const stack = parts.find(p => p.col === '#34424e'), carts = parts.filter(p => p.col === '#4e5a50');
    const inStack = carts.filter(c => lsIn(c, stack)), empty = parts.filter(p => p.col === '#0e161c' && lsIn(p, stack));
    assert.equal(inStack.length + empty.length, 6, `${at}: six bays in the stack`);
    assert.equal(empty.length, 1, `${at}: one bay empty, its cartridge out`);
    const fans = parts.filter(p => /^#(3a4652|4a5660)$/.test(p.col) && p.y1 - p.y0 >= 30), last = fans.reduce((a, b) => (a.x1 > b.x1 ? a : b));
    const out = carts.find(c => c.x0 >= last.x0 - 0.5 && c.x1 <= last.x1 + 0.5 && Math.abs(c.y1 - last.y0) <= 2);
    assert.ok(out && stack.x0 - out.x1 <= 12, `${at}: the cartridge out lies on the fan beside the stack (${JSON.stringify(out)})`);
    assert.ok(parts.some(p => p.col === '#8a8676' && lsIn(p, { ...out, y0: out.y0 - 1 })), `${at}: the date on it`);
    assert.ok(inStack.every(c => parts.some(p => p.col === '#8a8676' && lsIn(p, c))), `${at}: a date tag on each in the stack`);
    const bench = parts.find(p => p.col === '#46525a'), spares = carts.filter(c => c.x0 >= bench.x0 && c.x1 <= bench.x1 && c.y0 > bench.y1);
    assert.equal(spares.length, 4, `${at}: four spares under the bench`);
    assert.ok(parts.filter(p => p.col === '#5a5040' && spares.some(c => p.x0 <= c.x0 && p.x1 >= c.x1)).length >= 2, `${at}: strapped for zero g`);
    for (const f of fans) {
      const rings = calls.filter((k, i) => k[0] === 'strokeStyle' && k[1] === '#26323c' && calls.slice(i + 1, i + 5).some(q => q[0] === 'arc' && q[1] > f.x0 && q[1] < f.x1 && q[2] > f.y0 && q[2] < f.y1));
      assert.ok(rings.length >= 1, `${at}: a grille on the fan at ${f.x0}`);
    }
    const panel = placed.find(p => p.col === wallTone('#2a3844'));
    assert.ok(panel && lsIn(panel, rb) && panel.x0 >= Math.min(...fans.map(f => f.x0)) && panel.x1 <= stack.x0, `${at}: the panel by the air recycler, over its fans`);
    const inP = p => lsIn(p, { x0: panel.x0 - 0.5, x1: panel.x1 + 0.5, y0: panel.y0 - 0.5, y1: panel.y1 + 0.5 });
    assert.ok(placed.filter(p => p.col === wallTone('#0c161e') && inP(p)).length >= 3, `${at}: readouts on the panel`);
    const lamp = placed.find(p => p.col === wallTone('#263a50'));
    assert.ok(lamp && inP(lamp), `${at}: the alarm lamp on the panel`);
    const lens = calls.filter((k, i) => k[0] === 'fillStyle' && k[1] === wallTone('#3e2a26') && calls.slice(i + 1, i + 4).some(q => q[0] === 'arc'));
    assert.ok(lens.length >= 1, `${at}: its lens dark, all well`);
    const duct = placed.filter(p => p.col === wallTone('#2e4458') && p.x1 - p.x0 >= 150);
    assert.ok(duct.some(d => lsIn(d, lb)) && duct.some(d => lsIn(d, rb)), `${at}: the main air duct along both back walls`);
    for (const d of duct) assert.ok(d.y0 - r.top <= 20, `${at}: along the top, under the ceiling`);
    const intake = placed.find(p => p.col === wallTone('#3a4440')), filter = placed.find(p => p.col === wallTone('#6a6a5a'));
    assert.ok(intake && filter && lsIn(filter, intake) && lsIn(intake, lb), `${at}: the dust filter in the air intake`);
    const slate = placed.find(p => p.col === wallTone('#2a302c'));
    assert.ok(slate && lsIn(slate, lb) && FW.x0 - slate.x1 <= 45, `${at}: the slate by the hatch`);
  }
});
test('life support reads old and patched: a newer fan in the old row and a newer canister on the old recycler with fresh bolts, a printed handle tagged temporary, tape, cable ties, wear (#933)', () => {
  for (const pr of [0.02, 0.3, 0.5]) {
    const { r, s } = lsCase(pr, 1.17), F = r.floor, at = `${pr}`, { calls, parts, placed } = lsParts(r, s);
    const bolts = b => lsRects(calls, '#8a929a').filter(([x, y, w, h]) => lsIn({ x0: x, x1: x + w, y0: y, y1: y + h }, { x0: b.x0 - 1, x1: b.x1 + 1, y0: b.y0 - 1, y1: b.y1 + 1 })).length;
    const newer = parts.filter(p => p.col === '#4a5660' && p.y1 - p.y0 >= 30);
    assert.equal(newer.length, 1, `${at}: one fan newer, in another finish`);
    assert.ok(bolts(newer[0]) >= 4, `${at}: fresh bolts on the newer fan`);
    const rec = parts.find(p => p.col === '#3a4a52'), can = parts.find(p => p.col === '#4a5a62');
    assert.ok(can && lsIn(can, rec) && bolts(can) >= 2, `${at}: a newer canister bolted onto the older recycler`);
    const handle = parts.find(p => p.col === '#8a6a48'), tag = parts.find(p => p.col === '#9a9050');
    assert.ok(handle && handle.x1 - handle.x0 <= 12, `${at}: a printed handle on a valve`);
    assert.ok(tag && tag.x1 - tag.x0 <= 6 && tag.y0 >= handle.y0 - 2 && tag.y0 <= handle.y1 + 8, `${at}: its temporary tag`);
    assert.ok(lsRects(calls, '#6a5038').filter(([x, y, w, h]) => lsIn({ x0: x, x1: x + w, y0: y, y1: y + h }, handle)).length >= 2, `${at}: its printed layers`);
    assert.ok(parts.some(p => p.col === '#7a7462') && placed.some(p => p.col === wallTone('#7a7462')), `${at}: tape on a pipe and on the duct`);
    const stack = parts.find(p => p.col === '#34424e');
    assert.ok(calls.some(k => k[0] === 'strokeStyle' && k[1] === '#3a3a40'), `${at}: a cable`);
    assert.ok(lsRects(calls, '#1e2a36').filter(([x]) => x >= stack.x0 - 4 && x <= stack.x1 + 4).length >= 2, `${at}: cable ties on the stack's cable`);
    assert.ok(lsRects(calls, '#6a747c').length >= 4, `${at}: the paint worn where hands go (the handles, the bench's edge)`);
    assert.ok(lsRects(calls, '#3e4c5a').filter(([x, y]) => y >= F - 8 && x >= stack.x0 - 1 && x <= stack.x1).length >= 2, `${at}: scuffs low on the stack, where boots go`);
    assert.ok(parts.some(p => p.col === '#44505a' && lsIn(p, rec)), `${at}: a replacement panel in another shade`);
  }
});
test('life support\'s ceiling lamps are fittings, one in each bay (#1024)', () => {
  for (const pr of [0.02, 0.3, 0.5]) {
    const { r, s } = lsCase(pr, 1.17), rec = recorder(); drawRoom(rec.ctx, 'lifesupport', r, s);
    const parts = filledParts(rec.calls), lamps = box.roomLamps('lifesupport', r), bays = box.roomBays(r, FW), back = r.top + (r.floor - 80 - r.top) * 0.2;
    assert.equal(lamps.length, 2, 'two lamps');
    lamps.forEach((x, k) => {
      const bay = bays.find(b => x > b.x0 + 12 && x < b.x1 - 12), e = box.roomEye(bay);
      assert.ok(bay && bays.indexOf(bay) === k, `${pr}: the lamp at ${x} in its own bay`);
      assert.ok(parts.some(p => p.pts.some(q => near(q[0], x - 12) && near(q[1], r.top)) && p.pts.some(q => near(q[1], back) && near(q[0], box.roomInto(e, x + 9, r.top)[0]))), `${pr}: its plate on the sliver`);
      assert.ok(parts.some(p => p.col === '#3a4a5a' && p.outlined && near(Math.min(...p.pts.map(q => q[0])), x - 12) && near(Math.min(...p.pts.map(q => q[1])), r.top)), `${pr}: its housing hung from the ceiling`);
      assert.ok(rec.calls.some(k => k[0] === 'strokeRect' && near(k[1], x - 10.5) && near(k[2], r.top + 3)), `${pr}: the guard over its lens`);
    });
  }
});

// #933, point 6 in the rooms drawn before it: the galley, the bridge and the berths read old and cared for, not a wreck. Each touch at a fixed
// place, the size of a zip or a pocket, inside the brightness limits (#959), clear of the room's name, nothing under 12px, still under reduced motion.
const p6Rects = (calls, col) => calls.flatMap((k, i) => k[0] === 'fillStyle' && k[1] === col && calls[i + 1][0] === 'fillRect' ? [calls[i + 1].slice(1)] : []);
const p6In = ([x, y, w, h], b, e = 0.01) => x >= b.x0 - e && x + w <= b.x1 + e && y >= b.y0 - e && y + h <= b.y1 + e;
const p6Meet = (a, b) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
const p6Name = (r, zoom) => ({ x0: r.x0, x1: r.x0 + 12 + 60 / zoom, y0: r.top + 8 - 1 / zoom, y1: r.top + 8 + 17 / zoom });
// the new touches' colours, outlined, a step below the people, and none of them under the room's name; every save restored, no text under 12px,
// and the same frame at any time under reduced motion
const p6Common = (at, draw, r, zoom, cols) => {
  const c = fakeCtx(); draw(c); assert.equal(c.depth, 0, `${at}: every save restored`);
  for (const f of c.fonts) assert.ok(Number(/(\d+(?:\.\d+)?)px/.exec(f)[1]) >= 12, `${at}: ${f}`);
  const { ctx, calls } = recorder(); draw(ctx);
  const placed = placedParts(calls).map(p => ({ col: p.col, ...partBox({ pts: p.pts.map(q => q.slice(0, 2)) }) })), outlined = filledParts(calls).filter(p => p.outlined).map(p => p.col);
  for (const col of cols) {
    assert.ok(outlined.includes(col), `${at}: a ${col} part drawn and outlined`);
    const v = rgbOf(col); assert.ok(Math.max(...v) <= 0xb0 && Math.max(...v) - Math.min(...v) <= 0x60, `${at}: ${col} a step below the people`);
    for (const p of placed.filter(q => q.col === col)) assert.ok(!p6Meet(p, p6Name(r, zoom)), `${at}: a ${col} part ${JSON.stringify(p)} under the room's name`);
  }
  return { calls, placed };
};
const X0 = (r, f) => r.x0 + (r.x1 - r.x0) * f;
const p6Still = draw => { const at = t => { const c = fakeCtx(); draw(c, t); return c.args.join('|'); }; return at(1.3) === at(4.9); };
test('the galley reads old and patched: a replacement door, a newer dispenser head on fresh bolts, its line taped and tied, a printed latch tagged temporary, wear where hands and boots go (#933)', () => {
  const r = layoutBox(LAYOUTS.freighter, 'galley'), F = r.floor, W = r.x1 - r.x0;
  for (const pr of [0.02, 0.3, 0.5]) for (const zoom of [0.82, 1.17, 1.45]) {
    const s = RS({ w: phaseWeights(pr), zoom, well: FW, damage: { marks: new Set(), severe: false } }), at = `${pr} ${zoom}`;
    const draw = c => { drawRoom(c, 'galley', r, s); roomMessTable(c, r, s); };
    const { calls, placed } = p6Common(at, draw, r, zoom, ['#2e4658', '#4e565e', '#3a4a56', '#7a7462', '#8a6a48', '#9a9050']);
    const parts = filledParts(calls).filter(p => p.outlined).map(p => ({ col: p.col, ...partBox(p) })), rects = col => p6Rects(calls, col);
    const counter = parts.find(p => p.col === '#1f3852' && p.y1 - p.y0 > 30), doors = parts.filter(p => /^#(24405e|2e4658)$/.test(p.col) && p.y1 - p.y0 > 20);
    assert.ok(doors.length === 2 && doors.every(d => d.x0 >= counter.x0 && d.x1 <= counter.x1) && new Set(doors.map(d => d.col)).size === 2, `${at}: the counter's two doors, one a replacement in another shade`);
    assert.ok(rects('#6a747c').length >= 2 && rects(wallTone('#6a747c')).length >= 2, `${at}: the paint worn beside the latches, on the counter and on the wall`);
    const table = parts.filter(p => p.col === '#2c4c6e').sort((a, b) => (b.x1 - b.x0) - (a.x1 - a.x0))[0];
    assert.ok(rects('#7e8a94').filter(q => p6In(q, { ...table, y0: table.y0 - 1, y1: table.y1 + 1 })).length >= 3, `${at}: the table's edge worn where hands rest`);
    // the dispenser, on the worktop under one move: the newer head on the old foot, fresh bolts in the foot, its line taped and tied
    const head = placed.find(p => p.col === '#4e565e'), foot = placed.find(p => p.col === '#2a4664' && p.y1 - p.y0 <= 2.5 && p.x0 >= head.x0 - 0.01 && p.x1 <= head.x1 + 0.01);
    assert.ok(head && foot && foot.y0 > head.y1, `${at}: the newer head over the old foot`);
    const bolts = placedRects(calls).filter(q => q.col === '#8a929a' && p6In([q.x, q.y, q.w, q.h], foot));
    assert.ok(bolts.length >= 2, `${at}: fresh bolts in the old foot`);
    const line = placed.find(p => p.col === '#3a4a56' && p.x0 >= head.x0 && p.x1 <= head.x1), tape = placed.find(p => p.col === '#7a7462');
    assert.ok(line && tape && p6Meet(tape, line) && tape.y0 >= head.y1 - 0.01 && tape.x1 - tape.x0 <= 4, `${at}: tape round the dispenser's line`);
    assert.ok(placedRects(calls).some(q => q.col === '#1e2a36' && p6Meet({ x0: q.x, x1: q.x + q.w, y0: q.y, y1: q.y + q.h }, line)), `${at}: a cable tie on it`);
    const latch = parts.find(p => p.col === '#8a6a48'), tag = parts.find(p => p.col === '#9a9050');
    assert.ok(latch && latch.x0 > X0(r, 0.7) && latch.y1 <= F - 18, `${at}: the stove cupboard's latch printed (${JSON.stringify(latch)})`);
    assert.ok(tag && tag.y0 >= latch.y1 && tag.x1 - tag.x0 <= 6 && tag.y1 - tag.y0 <= 6, `${at}: its temporary tag hung under it`);
    assert.ok(rects('#6a5038').filter(q => p6In(q, latch)).length >= 2, `${at}: its printed layers`);
    const scuffs = rects('#5a6670').filter(([, y]) => y >= F - 7);
    assert.ok(scuffs.filter(([x]) => x > X0(r, 0.7)).length >= 2 && scuffs.filter(([x]) => x < X0(r, 0.21)).length >= 2, `${at}: scuffs low on the stove and the counter`);
    const bench = [r.x0 + W * SEATS.galley[0] - 14, r.x0 + W * SEATS.galley[SEATS.galley.length - 1] + 14];
    assert.ok(scuffs.filter(([x, y]) => x > bench[0] && x < bench[1] && y < F - 5).length >= 2, `${at}: the bench's foot bar scuffed`);
  }
  const r2 = layoutBox(LAYOUTS.freighter, 'galley');
  assert.ok(p6Still((c, t) => { const s = RS({ still: true, time: t, well: FW, damage: { marks: new Set(), severe: false } }); drawRoom(c, 'galley', r2, s); roomMessTable(c, r2, s); }), 'the same frame at any time under reduced motion');
});
test('the bridge reads old and patched: a replacement panel on fresh screws, a newer screen on an adapter plate, a printed switch guard tagged temporary, the comms cables tied and taped, wear where hands and boots go (#933)', () => {
  const r = layoutBox(LAYOUTS.freighter, 'bridge'), F = r.floor, W = r.x1 - r.x0, xs = SEATS.bridge.map(f => Math.round((r.x0 + W * f) * 100) / 100);
  for (const pr of [0.02, 0.3, 0.5]) for (const zoom of [0.82, 1.17, 1.45]) {
    const s = RS({ w: phaseWeights(pr), zoom, well: FW, damage: { marks: new Set(), severe: false } }), at = `${pr} ${zoom}`;
    const { calls } = p6Common(at, c => drawRoom(c, 'bridge', r, s), r, zoom, ['#34495a', '#4a5058', '#2a3c50', '#8a6a48', '#9a9050', '#7a7462']);
    const parts = filledParts(calls).filter(p => p.outlined).map(p => ({ col: p.col, ...partBox(p) })), rects = col => p6Rects(calls, col);
    const panels = parts.filter(p => /^#(22405c|34495a)$/.test(p.col) && p.y1 - p.y0 > 15);
    assert.equal(panels.length, xs.length, `${at}: an access panel on each console`);
    const odd = panels.filter(p => p.col === '#34495a');
    assert.ok(odd.length === 1 && odd[0].x0 > xs[2] && odd[0].x1 < xs[2] + 70, `${at}: the third console's panel a replacement in another shade`);
    assert.ok(calls.filter((k, i) => k[0] === 'fillStyle' && k[1] === '#8a929a' && calls[i + 2] && calls[i + 2][0] === 'arc' && calls[i + 2][1] > odd[0].x0 && calls[i + 2][1] < odd[0].x1).length >= 4, `${at}: on fresh screws`);
    // the last post's screen: a newer one on the old stand, an adapter plate under it with fresh bolts
    const glass = p6Rects(calls, '#03121c').filter(([x]) => x > xs[3] && x < xs[3] + 70), plate = parts.find(p => p.col === '#4a5058'), stem = parts.find(p => p.col === '#2a3c50' && p.x0 > xs[3]);
    assert.ok(glass.length === 1 && plate && plate.x0 > xs[3] && plate.y0 >= glass[0][1] + glass[0][3] && plate.x0 < glass[0][0] + glass[0][2] && plate.x1 > glass[0][0], `${at}: an adapter plate under the last post's screen`);
    assert.ok(stem && stem.y0 >= plate.y1 - 0.5, `${at}: on the old stand's stem`);
    assert.ok(rects('#8a929a').filter(q => p6In(q, plate)).length >= 2, `${at}: fresh bolts in the plate`);
    const guard = parts.find(p => p.col === '#8a6a48'), tag = parts.find(p => p.col === '#9a9050');
    assert.ok(guard && guard.x0 > xs[1] + 17 && guard.x1 < xs[1] + 40 && guard.x1 - guard.x0 <= 6, `${at}: a printed guard over a switch on the pilot's console`);
    assert.ok(tag && tag.y0 >= guard.y1 && tag.x0 >= guard.x1 - 0.01 && tag.x1 - tag.x0 <= 6 && tag.y1 - tag.y0 <= 6, `${at}: its temporary tag`);
    assert.ok(rects('#6a5038').filter(q => p6In(q, guard)).length >= 2, `${at}: its printed layers`);
    const rk = commsRackBox(r), near6 = ([x, y, w, h]) => x >= rk.x + rk.w - 4 && x + w <= rk.x + rk.w + 6 && y > rk.y + 20 && y < rk.y + rk.h;
    assert.ok(calls.some(k => k[0] === 'strokeStyle' && k[1] === '#3a3a40'), `${at}: the comms rack's cables`);
    assert.ok(rects('#1e2a36').filter(near6).length >= 2, `${at}: cable ties on them`);
    const tape = parts.find(p => p.col === '#7a7462');
    assert.ok(tape && near6([tape.x0, tape.y0, tape.x1 - tape.x0, tape.y1 - tape.y0]), `${at}: a wrap of tape on them`);
    assert.ok(rects('#7e8a94').length >= 2 * xs.length, `${at}: the consoles' edges worn where the hands rest`);
    assert.ok(rects('#6a747c').length >= 2 * xs.length, `${at}: the grab handles and the headrests worn where hands pull`);
    assert.ok(rects('#5a6670').filter(([, y]) => y >= F - 5).length >= 3 * xs.length, `${at}: scuffs at the foot plates and the knee recesses`);
  }
  const rb = layoutBox(LAYOUTS.freighter, 'bridge');
  assert.ok(p6Still((c, t) => drawRoom(c, 'bridge', rb, RS({ still: true, time: t, well: FW, damage: { marks: new Set(), severe: false } }))), 'the same frame at any time under reduced motion');
});
test('the berths read old and patched on their shared fixtures: lockers with a replacement door, a patched curtain on a printed clip tagged temporary, a newer lamp on fresh bolts, tape, wear; every bunk the same plan (#933)', () => {
  for (const n of [4, 8, 12]) for (const pr of [0.02, 0.3, 0.5]) for (const zoom of [0.82, 1.45]) {
    const { r, s, bunks, well } = berthCase(n, pr, zoom), F = r.floor, at = `${n} bunks, ${pr}, ${zoom}`;
    const { calls, placed } = p6Common(at, c => drawRoom(c, 'berths', r, s), r, zoom, [wallTone('#1f3a52'), wallTone('#22405a'), wallTone('#34444e'), '#5a4a5e', '#8a6a48', '#9a9050', '#7a7462', wallTone('#4a5058'), wallTone('#2e4458')]);
    const parts = filledParts(calls).filter(p => p.outlined).map(p => ({ col: p.col, ...partBox(p) })), rects = col => p6Rects(calls, col);
    // the lockers on the back wall left of the bunks, under the name, one door a replacement, worn by the handles
    const body = placed.find(p => p.col === wallTone('#1f3a52')), doors = placed.filter(p => [wallTone('#22405a'), wallTone('#34444e')].includes(p.col));
    assert.ok(doors.length === 2 && new Set(doors.map(d => d.col)).size === 2 && doors.every(d => d.x0 >= body.x0 && d.x1 <= body.x1), `${at}: two locker doors, one a replacement in another shade`);
    assert.ok(body.x1 < Math.min(...bunks.map(b => b.x)) && body.y0 > p6Name(r, zoom).y1, `${at}: the lockers (${JSON.stringify(body)}) left of the bunks, under the name`);
    assert.ok(placedRects(calls).filter(q => q.col === wallTone('#6a747c') && p6In([q.x, q.y, q.w, q.h], body)).length >= 2, `${at}: the paint worn by their handles`);
    // every bunk's grab rail worn alike in its middle (one plan, look.md rule 7)
    for (const b of bunks) assert.ok(rects('#6a747c').some(([x, y]) => near(x, b.x + b.w / 2 - 4) && near(y, b.y + 1.1)), `${at}: the grab rail of the bunk at ${b.x},${b.y} worn in its middle`);
    // the first bunk's curtain, drawn back: patched, held by a printed clip and its tag
    const b0 = bunks[0], inB0 = p => p.x0 >= b0.x - 6 && p.x1 <= b0.x + b0.w && p.y0 >= b0.y - 30 && p.y1 <= b0.y;
    const curtain = parts.find(p => p.col === '#4a3a5a' && inB0(p)), patch = parts.find(p => p.col === '#5a4a5e');
    assert.ok(curtain && patch && inB0(patch) && patch.x0 >= curtain.x0 - 0.5 && patch.x1 <= curtain.x1 + 1, `${at}: a patch sewn on the first bunk's curtain`);
    const clip = parts.find(p => p.col === '#8a6a48'), tag = parts.find(p => p.col === '#9a9050');
    assert.ok(clip && inB0(clip) && clip.x1 - clip.x0 <= 6 && tag && inB0(tag) && tag.x1 - tag.x0 <= 6 && tag.y1 - tag.y0 <= 6 && tag.y0 >= clip.y0, `${at}: the printed clip holding it back, its temporary tag`);
    const tape = parts.find(p => p.col === '#7a7462'), posts = parts.filter(p => p.col === '#2a4664' && Math.abs(p.x1 - p.x0 - 4) < 0.02 && near(p.y1, F));
    assert.ok(tape && posts.some(q => p6Meet(q, tape)) && tape.x1 - tape.x0 <= 6, `${at}: tape round a post`);
    assert.ok(rects('#3e4c5a').filter(([, y]) => y >= F - 4).length >= 4, `${at}: the deck scuffed by the bunks`);
    // the wall unit's lamp: a newer one on an adapter plate on the old base, fresh bolts
    const plate = placed.find(p => p.col === wallTone('#4a5058')), base = placed.find(p => p.col === wallTone('#2e4458') && p.y1 - p.y0 <= 2.5);
    assert.ok(plate && base && plate.y1 <= base.y0 + 0.5 && plate.x0 >= base.x0 && plate.x1 <= base.x1 && well.x1 < base.x0, `${at}: the newer lamp's plate on the old base, in the corner`);
    assert.ok(placedRects(calls).filter(q => q.col === wallTone('#8a929a') && p6Meet({ x0: q.x, x1: q.x + q.w, y0: q.y, y1: q.y + q.h }, base)).length >= 2, `${at}: fresh bolts in it`);
  }
  const { r } = berthCase(8, 0.3, 1.17);
  assert.ok(p6Still((c, t) => drawRoom(c, 'berths', r, { ...berthCase(8, 0.3, 1.17).s, still: true, time: t })), 'the same frame at any time under reduced motion');
});
// #932, the lighting pass: the light, the reading lamps and a screen's glow on a face leave every save restored and write nothing.
const lightApi = load(['js/data.js', 'js/util.js', 'js/figures.js', 'js/layouts.js', 'js/camera.js', 'js/rooms.js'], { G: {}, Mods: { filter: (n, v) => v, emit() {}, register() {} } }, ['roomScreenGlow', 'ROOM_GLOW', 'berthReading', 'bunkReading']);
test('the lighting pass leaves its saves balanced and writes no text (#932)', () => {
  const r = layoutBox(LAYOUTS.freighter, 'berths');
  for (const pr of [0.02, 0.3, 0.5]) for (const night of [0, 0.5, 1]) for (const off of [false, true]) {
    const s = RS({ w: phaseWeights(pr), night, asleep: 3, berths: 12, well: FW }), small = lightApi.berthReading(r, s), c = fakeCtx();
    drawPhaseLight(c, r, s.w, 3, night, false, box.roomBays(r, FW), box.roomLamps('berths', r), { glow: lightApi.ROOM_GLOW.galley, small, off });
    assert.equal(c.depth, 0, `${pr} ${night} ${off}: every save restored`); assert.ok(!c.calls.includes('fillText') && c.fonts.length === 0, 'no text');
    const d = fakeCtx(); drawRoom(d, 'berths', r, { ...s, damage: { marks: new Set(['berths']), severe: off } }); assert.equal(d.depth, 0);
  }
  for (const face of [1, -1]) { const c = fakeCtx(); lightApi.roomScreenGlow(c, { x: 10, y: 20 }, face); assert.equal(c.depth, 0); }
  assert.equal(lightApi.berthReading(r, RS({ w: phaseWeights(0.3), night: 0.5, asleep: 1, berths: 12, well: FW })).length, 10, 'the evening: every bunk lit but the one slept in and the one shut');
  assert.equal(lightApi.bunkReading(false, false, phaseWeights(0.02), 0.5), 0, 'nobody reads in the hard burn');
});

// #990: the crash couches are part of the rooms, drawn in every phase to the room standard: a pad, a headrest, a harness, a frame on posts
// bolted to the deck, solid in the box with a contact shadow, two tones a step below the people, one pad older and one patched; empty, the
// harness hangs loose. None of them over a prop, a bunk, a seat, the well or the room's name.
const couchApi = load(['js/data.js', 'js/util.js', 'js/figures.js', 'js/layouts.js', 'js/camera.js', 'js/rooms.js'], { G: {}, Mods: { filter: (n, v) => v, emit() {}, register() {} } }, ['COUCH_RACKS', 'COUCH_W', 'couchPlaces', 'bridgeGlass', 'berthCorner']);
const couchCase = (id, n, pr, zoom, o = {}) => {
  const r = layoutBox(LAYOUTS.freighter, id);
  return { r, s: RS({ w: phaseWeights(pr), zoom, berths: n, asleep: 0, well: FW, damage: { marks: new Set(), severe: false }, ...o }) };
};
const couchPads = ['#3e5266', '#4c4e4a'];
test('the crash couches are drawn in every phase, in the box, two tones a step below the people, old and patched, nothing under 12 px (#990)', () => {
  const count = id => couchApi.COUCH_RACKS.filter(k => k.room === id).reduce((t, k) => t + k.tiers, 0);
  for (const id of ['berths']) for (const n of [4, 10, 12]) for (const pr of [0.02, 0.3, 0.45, 0.5]) for (const zoom of [0.82, 1.17, 1.45]) {
    const { r, s } = couchCase(id, n, pr, zoom), at = `${id}, ${n} berths, ${pr}, ${zoom}`;
    const c = fakeCtx(); drawRoom(c, id, r, s); assert.equal(c.depth, 0, `${at}: every save restored`);
    for (const f of c.fonts) assert.ok(Number(/(\d+(?:\.\d+)?)px/.exec(f)[1]) >= 12, `${at}: ${f}`);
    const { ctx, calls } = recorder(); drawRoom(ctx, id, r, s);
    const parts = filledParts(calls).filter(p => p.outlined), pads = parts.filter(p => couchPads.includes(p.col));
    assert.equal(pads.length, 2 * count(id), `${at}: a pad and a headrest for each of its ${count(id)} couches`);
    assert.equal(parts.filter(p => p.col === '#4c4e4a').length, 2, `${at}: one couch's pad and headrest older ones`);
    assert.ok(parts.some(p => p.col === '#4e5a66'), `${at}: one pad patched`);
    for (const col of ['#24405c', '#3e5266', '#4c4e4a', '#4e5a66', '#1c3249']) { const v = rgbOf(col); assert.ok(Math.max(...v) <= 0xb0 && Math.max(...v) - Math.min(...v) <= 0x60, `${at}: ${col} a step below the people`); }
    for (const p of parts.filter(q => rgbOf(q.col))) { const v = rgbOf(p.col); assert.ok(Math.max(...v) <= 0xb0 && Math.max(...v) - Math.min(...v) <= 0x60, `${at}: ${p.col} brighter than the props may be`); }
    // in the box: the pads' tops showing, the posts' sides toward the eye, a contact shadow at each post's foot
    assert.ok(calls.some(k => k[0] === 'fillStyle' && k[1] === box.figShade('#3e5266', 1.3)) || calls.some(k => k[0] === 'fillStyle' && String(k[1]).startsWith('rgb(')), `${at}: the pads solid`);
    const shadows = filledParts(calls).filter(p => p.col === 'rgba(2,5,9,0.5)').map(partBox);
    for (const k of couchApi.COUCH_RACKS.filter(q => q.room === id)) for (const px of [k.x, k.x + couchApi.COUCH_W - 3]) assert.ok(shadows.some(b => b.x0 <= px - 4 && b.x1 >= px + 7 && Math.abs(b.y1 - r.floor) < 0.01), `${at}: a contact shadow under the post at ${px}`);
  }
});
test('an empty couch\'s harness hangs loose; with someone strapped in, theirs is on them; the frame the same at any time under reduced motion (#990)', () => {
  for (const id of ['berths']) {
    const buckles = couched => { const { r, s } = couchCase(id, 10, 0.02, 1.17, { couched }), { ctx, calls } = recorder(); drawRoom(ctx, id, r, s); return calls.filter(k => k[0] === 'fillStyle' && k[1] === '#7a8794').length; };
    const mine = couchApi.couchPlaces().map((c, k) => [c, k]).filter(([c]) => c.room === id).map(([, k]) => k);
    assert.equal(buckles([]) - buckles(mine), mine.length, `${id}: a loose buckle on each empty couch, none on a taken one`);
    const r = layoutBox(LAYOUTS.freighter, id);
    assert.ok(p6Still((c, t) => drawRoom(c, id, r, RS({ still: true, time: t, well: FW, berths: 10, couched: mine.slice(1), damage: { marks: new Set(), severe: false } }))), `${id}: the same frame at any time under reduced motion`);
  }
});
test('no couch is over a prop, a bunk, a seat, the well or the room\'s name (#990)', () => {
  const W = LAYOUTS.freighter.width, places = couchApi.couchPlaces();
  const span = k => { const top = Math.max(...places.filter(c => c.x > k.x && c.x < k.x + couchApi.COUCH_W).map(c => c.lift)) + 14; return { x0: k.x, x1: k.x + couchApi.COUCH_W, top }; };  // its posts, and the person on its top couch
  for (const k of couchApi.COUCH_RACKS) {
    const r = layoutBox(LAYOUTS.freighter, k.room), b = span(k), F = r.floor, at = `the ${k.room}'s rack at ${k.x}`;
    assert.ok(b.x0 >= r.x0 && b.x1 <= r.x1 && (b.x1 <= FW.x0 - 2 || b.x0 >= FW.x1 + 6), `${at}: in the room, clear of the well (${FW.x0} to ${FW.x1})`);
    for (const zoom of [0.82, 1.17, 1.45]) { const name = { x1: r.x0 + 12 + 60 / zoom, y1: r.top + 8 + 17 / zoom }; assert.ok(b.x0 >= name.x1 || F - b.top >= name.y1, `${at}: clear of the room's name at ${zoom}`); }
    assert.ok(F - b.top >= r.top + 10, `${at}: under the ceiling`);
    if (k.room === 'bridge') {
      const seats = SEATS.bridge.map(f => r.x0 + (r.x1 - r.x0) * f), g = couchApi.bridgeGlass(r, FW);
      for (const sx of seats) assert.ok(b.x1 + 10 <= sx - 14 || b.x0 >= sx + 70, `${at}: clear of the seat at ${sx} and its console`);
      assert.ok(F - b.top > g.y + g.h + 4, `${at}: under the window (${g.y + g.h + 4})`);
    } else for (let n = 1; n <= 12; n++) {
      const bunks = Array.from({ length: n }, (_, j) => berthBunk(r, n, j, FW));
      for (const q of bunks) assert.ok(q.x - 2 >= b.x1 || q.x + q.w + 2 <= b.x0, `${at}, ${n} berths: clear of the bunk at ${q.x}`);
      assert.ok(couchApi.berthCorner(r, n, FW).x0 <= b.x0 || b.x1 <= FW.x0, `${at}, ${n} berths: in the crew's corner, or left of the well`);
    }
  }
  // the things on the berths' back wall, the lockers and the crew's corner, clear of the couches and their people, whatever swings
  for (const pr of [0.02, 0.3, 0.5]) for (const time of [0, 1.7, 3.1]) {
    const r = layoutBox(LAYOUTS.freighter, 'berths'), { ctx, calls } = recorder(); berthsIn(ctx, r, RS({ w: phaseWeights(pr), time, berths: 10, well: FW }));
    const onWall = placedParts(calls).filter(p => p.at[0] || p.at[1]).map(p => ({ col: p.col, ...partBox({ pts: p.pts.map(q => q.slice(0, 2)) }) }));
    for (const k of couchApi.COUCH_RACKS.filter(q => q.room === 'berths')) {
      const b = span(k), x1 = k.x + couchApi.COUCH_W + 8;  // and its side toward the eye, a tenth of the way to it
      for (const p of onWall) assert.ok(p.x1 <= b.x0 || p.x0 >= x1 || p.y1 <= r.floor - b.top, `${pr} ${time}: a ${p.col} part on the wall ${JSON.stringify(p)} behind the rack at ${k.x}`);
    }
  }
  assert.ok(places.every(c => c.x * 1 > 0 && c.x < W), 'every couch on the hull');
});

test('the bridge\'s station chairs are crash couches: upright at work, flat in the hard burn, clear of the consoles and the well (#990)', () => {
  const r = layoutBox(LAYOUTS.freighter, 'bridge'), F = r.floor, W = r.x1 - r.x0, xs = SEATS.bridge.map(f => Math.round((r.x0 + W * f) * 100) / 100), bays = box.roomBays(r, FW);
  for (const [i, x] of xs.entries()) for (const rec of [0, 0.5, 1]) {
    const at = `seat ${i} at ${x}, reclined ${rec}`, { ctx, calls } = recorder(); box.roomIn(bays, () => couchSeat.roomBridgeSeat(ctx, x, F, rec));
    const turns = calls.filter(k => k[0] === 'rotate').map(k => k[1]);
    assert.equal(turns.length, rec ? 2 : 0, `${at}: the back and the leg rest turned only when reclined`);
    for (const a of turns) assert.ok(near(a, -rec * Math.PI / 2), `${at}: by ${a}`);
    assert.equal(calls.filter(k => k[0] === 'save').length, calls.filter(k => k[0] === 'restore').length, `${at}: every save restored`);
    const parts = filledParts(calls).filter(p => p.outlined);
    for (const col of ['#284664', '#2e4a68', '#2b4766', '#1c3249']) assert.ok(parts.some(p => p.col === col), `${at}: ${col}`);
    for (const p of parts.filter(q => rgbOf(q.col))) { const v = rgbOf(p.col); assert.ok(Math.max(...v) <= 0xb0 && Math.max(...v) - Math.min(...v) <= 0x60, `${at}: ${p.col} a step below the people`); }
  }
  // reclined flat, where its parts land (the turns applied): it runs from its headrest, 54 behind the seat, to its leg rest's end; clear of
  // every other console (each 17 to 70 in front of its seat), of its own console's top (from 17 in front, F - 42 to F - 33) and of its grab
  // handle (21 to 23 in front, F - 30 to F - 17), in the room and clear of the well's shaft
  for (const [i, x] of xs.entries()) {
    const { ctx, calls } = recorder(); box.roomIn(bays, () => couchSeat.roomBridgeSeat(ctx, x, F, 1));
    const pts = turnedPoints(calls), x0 = Math.min(...pts.map(q => q[0])), x1 = Math.max(...pts.map(q => q[0]));
    for (const [j, y] of xs.entries()) if (j !== i) assert.ok(x1 <= y + 17 || x0 >= y + 70, `seat ${i}: flat (${x0} to ${x1}) clear of the console at ${y + 17} to ${y + 70}`);
    for (const [bx0, bx1, by0, by1, what] of [[x + 17, x + 70, F - 42, F - 33, 'the console\'s top'], [x + 21, x + 23, F - 30, F - 17, 'its grab handle']]) {
      assert.ok(!pts.some(([px, py]) => px > bx0 && px < bx1 && py > by0 && py < by1), `seat ${i}: clear of ${what}`);
    }
    assert.ok(x1 < x + 21, `seat ${i}: its leg rest (to ${x1}) short of the grab handle`);
    assert.ok(x0 > r.x0 + 4 && (x1 < FW.x0 || x0 > FW.x1), `seat ${i}: in the room, clear of the well`);
  }
  assert.ok(p6Still((c, t) => drawRoom(c, 'bridge', r, RS({ still: true, time: t, well: FW, recline: [1, 1, 0, 0.5], damage: { marks: new Set(), severe: false } }))), 'the same frame at any time under reduced motion');
});
test('the gunnery\'s chairs are crash seats, upright: a headrest and a stowed leg rest; the medbay\'s stool stays a stool (#990)', () => {
  const r = layoutBox(LAYOUTS.freighter, 'gunnery'), F = r.floor;
  for (const back of [1, -1, 0]) {
    const { ctx, calls } = recorder(); box.roomIn(box.roomBays(r, FW), () => couchSeat.roomStool(ctx, 100, F, back));
    const parts = filledParts(calls).filter(p => p.outlined);
    assert.equal(parts.filter(p => p.col === '#284664').length, back ? 1 : 0, `back ${back}: a headrest on a chair, none on a stool`);
    assert.equal(parts.filter(p => p.col === '#2b4766').length, back ? 1 : 0, `back ${back}: a leg rest on a chair`);
    assert.equal(calls.filter(k => k[0] === 'rotate').length, 0, `back ${back}: upright`);
  }
});
// Every point of every path drawn, where it lands on the screen (translations and turns applied).
const turnedPoints = calls => {
  const out = [], stack = []; let m = [1, 0, 0, 1, 0, 0];
  const at = (x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]], mul = (a, b) => [a[0] * b[0] + a[2] * b[1], a[1] * b[0] + a[3] * b[1], a[0] * b[2] + a[2] * b[3], a[1] * b[2] + a[3] * b[3], a[0] * b[4] + a[2] * b[5] + a[4], a[1] * b[4] + a[3] * b[5] + a[5]];
  for (const [k, ...a] of calls) {
    if (k === 'save') stack.push(m); else if (k === 'restore') m = stack.pop(); else if (k === 'translate') m = mul(m, [1, 0, 0, 1, a[0], a[1]]);
    else if (k === 'rotate') m = mul(m, [Math.cos(a[0]), Math.sin(a[0]), -Math.sin(a[0]), Math.cos(a[0]), 0, 0]);
    else if (k === 'moveTo' || k === 'lineTo') out.push(at(a[0], a[1])); else if (k === 'quadraticCurveTo') out.push(at(a[2], a[3]));
  }
  return out;
};
const couchSeat = load(['js/data.js', 'js/util.js', 'js/figures.js', 'js/layouts.js', 'js/camera.js', 'js/rooms.js'], { G: {}, Mods: { filter: (n, v) => v, emit() {}, register() {} } }, ['roomBridgeSeat', 'roomStool']);

// #936, the rest: her name and registry painted on the nose's cap (hullName, hullPlate) and her registry as marks on the bridge's certificate
// (registryMarks); the watch bill on the galley's wall (billSheet, roomWatchBill), the hand's tab on the middle watch when they asked Cato
// (askedMiddle); the mood (crewSpirits): the galley warmer with the radio on in good spirits, a low person's own bunk's curtain drawn.
const restApi = load(['js/data.js', 'js/util.js', 'js/figures.js', 'js/layouts.js', 'js/camera.js', 'js/rooms.js', 'js/shiplife.js', 'js/hulldetail.js'], { G: {}, Mods: { filter: (n, v) => v, emit() {}, register() {} } },
  ['hullName', 'hullPlate', 'SHIP_REGISTRY', 'registryMarks', 'billSheet', 'askedMiddle', 'crewSpirits', 'billTone', 'ROLE_COLORS', 'WATCH_ORDER', 'onWatchTonight', 'roomLight', 'ROOM_GLOW', 'GALLEY_SPIRITS', 'bunkShut', 'towerOutline', 'LAYOUTS', 'drawRoom', 'layoutBox', 'BILL_AT', 'roomEye', 'figShade', 'WALL_TONE', 'hullNameLayout', 'HULL_NAME', 'CAM_RUN', 'nightStateOf', 'crewRoster', 'shipDay', 'SHIP_DAY']);
const inLimits = col => { const v = rgbOf(col); return v && Math.max(...v) <= 0xb0 && Math.max(...v) - Math.min(...v) <= 0x60; };
test('her name and registry are painted on the nose\'s cap at 12px or more, every glyph and the co-op\'s ring inside the camera\'s run (#936)', () => {
  const o = restApi.towerOutline(restApi.LAYOUTS.freighter), runTop = -restApi.CAM_RUN.above, measure = (t, px) => t.length * px * 0.66;  // wider than the font's capitals
  for (const zoom of [0.82, 1.17, 1.45]) for (const coop of [false, true]) for (const name of ['IRON ANVIL', 'WANDERING TORTOISE', 'W'.repeat(30)]) {
    const plate = { name, reg: 'BR 4471', coop }, at = `${zoom} ${coop} ${name.length}`;
    const c = fakeCtx(); restApi.hullName(c, o, zoom, plate); assert.equal(c.depth, 0, `${at}: saves restored`);
    assert.equal(c.calls.filter(k => k === 'fillText').length, 2, `${at}: the name and the registry`);
    for (const f of c.fonts) assert.ok(Number(/(\d+(?:\.\d+)?)px/.exec(f)[1]) >= 12, `${at}: ${f}`);
    const L = restApi.hullNameLayout(o, zoom, plate, measure);
    assert.ok(L.px >= 12 && L.regPx >= 12, `${at}: never under 12px`);
    assert.ok(L.base - 0.8 * L.px / zoom >= runTop && L.regBase - 0.8 * L.regPx / zoom >= runTop && L.top >= runTop, `${at}: the glyphs' tops (${L.top}) under the camera's run's top (${runTop})`);
    if (L.ring) assert.ok(L.ring.y - L.ring.r >= runTop && L.ring.y + L.ring.r < o.top, `${at}: the ring inside the run, over the skin`);
    assert.ok(L.base < o.top && L.regBase < o.top, `${at}: over the flight deck`);
    assert.ok(L.x0 >= restApi.HULL_NAME.x0 - 1e-9 && L.x1 <= 470 + 1e-9, `${at}: in the cap's span, right of the corner's outline at the dock and left of the speed buttons (${L.x0}, ${L.x1})`);
    const { ctx, calls } = recorder(); restApi.hullName(ctx, o, zoom, plate);
    assert.deepEqual(calls.filter(k => k[0] === 'fillText').map(k => k[1]), [name, 'BR 4471']);
    assert.equal(calls.some(k => k[0] === 'arc'), coop, `${at}: the co-op's mark only on hers`);
  }
  const c = fakeCtx(); restApi.hullName(c, o, 1, { name: '', reg: null, coop: false }); assert.equal(c.calls.length, 0, 'nothing to paint, nothing painted');
  const { ctx, calls } = recorder(); restApi.hullName(ctx, o, 1, { name: '', reg: 'CR 2208', coop: true });
  assert.deepEqual(calls.filter(k => k[0] === 'fillText').map(k => k[1]), ['CR 2208'], 'not yet named: the registry and the mark only'); assert.ok(calls.some(k => k[0] === 'arc'));
});
test('a name that will not fit even at 12px is shortened with an ellipsis, so the paint never passes the cap\'s span, whatever the font (#936)', () => {
  const o = restApi.towerOutline(restApi.LAYOUTS.freighter), wide = (t, px) => t.length * px * 1.1;  // wider than any font's capitals
  for (const zoom of [0.82, 1.17, 1.45]) {
    const name = 'W'.repeat(60), L = restApi.hullNameLayout(o, zoom, { name, reg: 'BR 4471', coop: false }, wide);
    assert.ok(L.px >= 12, `${zoom}: never under 12px`);
    assert.ok(L.name.endsWith('\u2026') && L.name.length < name.length, `${zoom}: shortened (${L.name})`);
    assert.ok(L.x1 <= 470 + 1e-9, `${zoom}: within the cap's span (${L.x1})`);
  }
  const fits = restApi.hullNameLayout(o, 1, { name: 'IRON ANVIL', reg: 'BR 4471', coop: false }, (t, px) => t.length * px * 0.66);
  assert.equal(fits.name, 'IRON ANVIL', 'a name that fits is painted whole');
});
test('her registry is fixed per hull, and the co-op\'s mark is on chapter two\'s Ore Runner only (#936)', () => {
  const P = (st, name = 'Iron Anvil') => JSON.parse(JSON.stringify(restApi.hullPlate(st, name)));
  assert.deepEqual(P({ shipId: 'freighter' }), { name: 'IRON ANVIL', reg: 'BR 4471', coop: false });
  assert.equal(P({ shipId: 'freighter' }, 'Second Chance').reg, P({ shipId: 'freighter' }).reg, 'the hull\'s, whatever her name');
  assert.equal(new Set(Object.values(restApi.SHIP_REGISTRY)).size, Object.keys(restApi.SHIP_REGISTRY).length, 'no two hulls share one');
  for (const id of ['shuttle', 'lightfreighter', 'courier', 'freighter', 'gunship']) assert.match(restApi.SHIP_REGISTRY[id], /^[A-Z]{2} \d{4}$/, id);
  assert.equal(P({ shipId: 'lightfreighter', hired: { chapter: 2 } }, 'Ore Runner').coop, true, 'the co-op\'s hull');
  assert.equal(P({ shipId: 'lightfreighter', hired: { chapter: 2 } }, 'Ore Runner').name, '', 'not named till the members meet: her class\'s name, the stand-in, is not painted');
  assert.equal(P({ shipId: 'lightfreighter', hired: { chapter: 2 } }, 'Kestrel').name, 'KESTREL', 'once named, her name');
  assert.equal(P({ shipId: 'lightfreighter', hired: null }, 'Ore Runner').name, 'ORE RUNNER', 'an owner\'s ship is named what the owner named her');
  assert.equal(P({ shipId: 'lightfreighter', hired: null }).coop, false, 'an owner\'s Ore Runner is not the co-op\'s');
  assert.equal(P({ shipId: 'lightfreighter', hired: { chapter: 1 } }).coop, false); assert.equal(P({ shipId: 'freighter', hired: { chapter: 2 } }).coop, false);
  assert.deepEqual(JSON.parse(JSON.stringify(restApi.registryMarks('BR 4471'))), JSON.parse(JSON.stringify(restApi.registryMarks('BR 4471'))), 'the same marks every time');
  assert.equal(restApi.registryMarks('BR 4471').length, 6); assert.notDeepEqual(restApi.registryMarks('BR 4471'), restApi.registryMarks('CR 2208'));
  // on the certificate: the marks beside the seal, inside the paper, no text; none given, as before
  const r = layoutBox(LAYOUTS.freighter, 'bridge'), F = r.floor, lx = Math.round((r.x0 + (r.x1 - r.x0) * 0.222) * 100) / 100;
  const draw = registry => { const { ctx, calls } = recorder(); drawRoom(ctx, 'bridge', r, RS({ well: FW, registry, damage: { marks: new Set(), severe: false } })); return calls; };
  const ink = calls => placedRects(calls).filter(q => q.col === wallTone('#5a5246'));
  assert.equal(ink(draw(null)).length, 0); assert.equal(JSON.stringify(draw(undefined)), JSON.stringify(draw(null)));
  const marks = ink(draw('BR 4471')); assert.equal(marks.length, 6, 'a mark for each of its letters and digits');
  const xs = marks.map(m => m.x), ys = marks.flatMap(m => [m.y, m.y + m.h]), lines = placedRects(draw('BR 4471')).filter(q => q.col === wallTone('#6e6656'));  // its printed lines
  assert.ok(Math.max(...xs) - Math.min(...xs) < 10 && Math.max(...ys) - Math.min(...ys) <= 2.5, 'a short row of marks');
  assert.ok(Math.min(...xs) >= Math.min(...lines.map(q => q.x)) - 1 && Math.min(...ys) > Math.max(...lines.map(q => q.y + q.h)), 'on the paper, under its lines');
  assert.ok(lx > 0 && !draw('BR 4471').some(k => k[0] === 'fillText' && /BR|4471/.test(k[1])), 'no words on it');
});
test('the galley\'s watch bill shows tonight\'s bill and a scene\'s record, with your tab on the middle watch when you asked Cato (#936)', () => {
  const roster = [{ id: 'you', role: 'you' }, { id: 'a', role: 'pilot' }, { id: 'b', role: 'engineer' }, { id: 'c', role: 'icehand' }, { id: 'd', role: 'slicer' }], C = restApi.ROLE_COLORS;
  const S = (bill, watch, night, asked) => JSON.parse(JSON.stringify(restApi.billSheet(roster, bill, watch, night, asked)));
  assert.deepEqual(Object.keys(restApi.WATCH_ORDER), ['bridge', 'engine']);
  assert.deepEqual(S({ bridge: 'a', engine: 'b' }, null, 3, false), { rows: [{ post: 'bridge', col: C.pilot }, { post: 'engine', col: C.engineer }], middle: null });
  assert.deepEqual(S({ bridge: 'a', engine: null }, null, 3, false).rows[1].col, null, 'nobody on it: the line blank');
  assert.equal(S({ bridge: 'a', engine: 'b' }, { night: 3, post: 'bridge', stands: 'you' }, 3, false).rows[0].col, C.you, 'a scene\'s record on its post');
  assert.equal(S({ bridge: 'a', engine: 'b' }, { night: 3, post: 'engine', stands: 'c' }, 3, false).rows[1].col, C.icehand);
  assert.equal(S({ bridge: 'a', engine: 'b' }, { night: 2, post: 'bridge', stands: 'you' }, 3, false).rows[0].col, C.pilot, 'another night\'s record: the bill');
  assert.deepEqual(S({ bridge: 'a', engine: 'b' }, { night: 3, post: 'gunnery', stands: 'd' }, 3, false).rows.map(q => q.col), [C.pilot, C.engineer], 'a record on another room leaves the bill');
  for (const [id, post] of [['a', 'bridge'], ['b', 'engine']]) assert.equal(restApi.onWatchTonight({ id }, { bill: { bridge: 'a', engine: 'b' } }), post, 'as onWatchTonight reads it');
  assert.equal(S({ bridge: 'a', engine: 'b' }, null, 3, true).middle, C.you, 'your tab on the middle watch');
  // how the game records the ask (#914): the memory Cato's choice leaves on him
  const ask = 'You told me what you needed, and I put it on the bill.', edited = 'You asked for the middle watch, and it is yours.';
  const st = (mem, crew = ['c:cato']) => ({ crew, cast: { cato: { pid: 'c:cato' } }, people: { 'c:cato': { memories: mem } } });
  assert.equal(restApi.askedMiddle(st([`9 Jun 2214: ${ask}`]), [ask]), true); assert.equal(restApi.askedMiddle(st(['9 Jun 2214: You kept the cold watch, so I didn\'t have to move anyone.']), [ask]), false);
  assert.equal(restApi.askedMiddle(st([`9 Jun 2214: ${ask}`], ['c:ines']), [ask]), false, 'Cato gone from the crew: no tab');
  assert.equal(restApi.askedMiddle({ people: {} }, [ask]), false, 'no Cato'); assert.equal(restApi.askedMiddle(st([ask]), []), false);
  assert.equal(restApi.askedMiddle(st([`9 Jun 2214: ${edited}`]), [ask, edited]), true, 'an override\'s words, as the memory holds them');
  // drawn: a tab in each stander's colour (toned to the props), the middle tab only when asked, on the wall clear of the room's name and the patch
  const r = layoutBox(LAYOUTS.freighter, 'galley'), wt = col => restApi.figShade(restApi.billTone(col), restApi.WALL_TONE);
  const draw = bill => { const { ctx, calls } = recorder(); drawRoom(ctx, 'galley', r, RS({ well: FW, bill, damage: { marks: new Set(), severe: false } })); return calls; };
  const tabs = (calls, col) => filledParts(calls).filter(p => p.col === wt(col) && p.outlined).length;
  const plainBill = S({ bridge: 'a', engine: 'b' }, null, 3, false), asked = S({ bridge: 'a', engine: 'b' }, null, 3, true);
  assert.equal(tabs(draw(plainBill), C.pilot), 1); assert.equal(tabs(draw(plainBill), C.engineer), 1); assert.equal(tabs(draw(plainBill), C.you), 0);
  assert.equal(tabs(draw(asked), C.you), 1, 'asked: your tab on the middle watch');
  const sheet = filledParts(draw(asked)).filter(p => p.col === wallTone('#3a2c20')).map(partBox)[0];
  for (const zoom of [0.82, 1.17, 1.45]) assert.ok(sheet.x0 >= p6Name(r, zoom).x1 || sheet.y0 >= p6Name(r, zoom).y1, `${zoom}: clear of the name (${JSON.stringify(sheet)})`);
  const pb = { x0: r.x0 + 92 - 11.5, x1: r.x0 + 92 + 11.5, y0: r.floor - 58 - 7.5, y1: r.floor - 58 + 7.5 };
  assert.ok(!p6Meet(sheet, pb), 'clear of the patch\'s spot');
  // and of everything else the galley draws, with all its clutter out (the trip's end): the cupboard, the screen, the knife strip, the worktop's things
  const placed = calls => { const out = [], stack = []; let dx = 0, dy = 0, fill = null, pts = [];
    for (const [k, ...a] of calls) {
      if (k === 'save') stack.push([dx, dy]); else if (k === 'restore') [dx, dy] = stack.pop(); else if (k === 'translate') { dx += a[0]; dy += a[1]; }
      else if (k === 'fillStyle') fill = String(a[0]).toLowerCase(); else if (k === 'beginPath') pts = []; else if (k === 'moveTo' || k === 'lineTo') pts.push([a[0] + dx, a[1] + dy]); else if (k === 'quadraticCurveTo') pts.push([a[2] + dx, a[3] + dy]);
      else if (k === 'fill' && pts.length) out.push({ col: fill, x0: Math.min(...pts.map(q => q[0])), x1: Math.max(...pts.map(q => q[0])), y0: Math.min(...pts.map(q => q[1])), y1: Math.max(...pts.map(q => q[1])) });
      else if (k === 'fillRect') out.push({ col: fill, x0: a[0] + dx, x1: a[0] + dx + a[2], y0: a[1] + dy, y1: a[1] + dy + a[3] });
    }
    return out; };
  const { ctx: gc, calls: gcalls } = recorder(); drawRoom(gc, 'galley', r, RS({ well: FW, bill: asked, age: 1, spirits: true, damage: { marks: new Set(), severe: false } }));
  const all = placed(gcalls), board = all.find(q => q.col === wallTone('#3a2c20')), mine = all.slice(all.indexOf(board) - 1, all.indexOf(board) + 40).filter(q => q.x0 >= board.x0 - 0.5 && q.x1 <= board.x1 + 0.5 && q.y0 >= board.y0 - 3 && q.y1 <= board.y1 + 0.5);
  assert.ok(board && Math.abs(board.x0 - sheet.x0) < 0.01, 'the sheet where it lands on the wall');
  const solid = q => /^#|^rgb\(/.test(q.col) && q.x1 - q.x0 < 200 && q.y1 - q.y0 < 90;  // a prop, not the room's shell or its light
  const hits = all.filter(q => solid(q) && !mine.includes(q) && p6Meet(q, { x0: board.x0, x1: board.x1, y0: board.y0 - 3, y1: board.y1 }));
  assert.deepEqual(hits, [], 'nothing else on the sheet or its clip');
  assert.equal(JSON.stringify(draw(undefined)).includes(String(wt(C.pilot))), false, 'no bill given, none drawn');
});
test('the bill on the galley\'s wall is who onWatchTonight puts on watch, with a scene\'s record and with someone hurt (#936)', () => {
  const people = { a: { id: 'a', role: 'pilot' }, b: { id: 'b', role: 'engineer' }, c: { id: 'c', role: 'icehand' }, d: { id: 'd', role: 'slicer' }, e: { id: 'e', role: 'xo' } };
  for (const [injured, watch, day] of [[{}, null, 0], [{ a: true }, null, 0], [{}, { night: 0, stands: 'c', post: 'engine' }, 0], [{ b: true }, { night: 0, stands: 'you', post: 'bridge' }, 0], [{ d: true }, { night: 0, stands: 'e', post: 'bridge' }, 3], [{}, { night: 0, stands: 'd', post: 'gunnery' }, 1]]) {
    const st = { day, crew: Object.keys(people), people, injured }, t = { elapsed: restApi.SHIP_DAY * 0.7 - 6, watch: watch && { ...watch } };
    const ns = restApi.nightStateOf(st, t, false), roster = restApi.crewRoster(st), sheet = restApi.billSheet(roster, ns.bill, ns.watch, restApi.shipDay(t.elapsed).day, false), at = JSON.stringify({ injured, watch, day });
    for (const row of sheet.rows) {
      const on = roster.filter(p => restApi.onWatchTonight(p, ns) === row.post);
      assert.ok(on.length <= 1, `${at}: one on ${row.post}`);
      assert.equal(row.col, on.length ? restApi.ROLE_COLORS[on[0].role] : null, `${at}: the ${row.post} row is ${on.length ? on[0].id : 'nobody'}`);
    }
    for (const id of Object.keys(injured)) assert.ok(!sheet.rows.some(q => q.col === restApi.ROLE_COLORS[people[id].role]), `${at}: ${id}, hurt, is off the bill`);
  }
});
test('the crew in good spirits: the galley warmer and stronger with the radio on; otherwise the radio off (#936)', () => {
  const st = moods => ({ day: 10, injured: { h: true }, people: Object.fromEntries(Object.entries(moods).map(([id, k]) => [id, k ? { mood: { kind: k, until: 20 } } : {}])) });
  const sp = (moods, ids = Object.keys(moods)) => JSON.parse(JSON.stringify(restApi.crewSpirits(st(moods), ids)));
  assert.deepEqual(sp({ a: 'high', b: 'high', c: null }), { good: true, low: [] });
  assert.deepEqual(sp({ a: 'high', b: null }), { good: false, low: [] }, 'one cheerful is not the crew');
  assert.deepEqual(sp({ a: 'high', b: 'high', c: 'low', d: 'low' }), { good: false, low: ['c', 'd'] }, 'as many low');
  assert.deepEqual(sp({ a: 'high', b: 'high', c: 'low' }), { good: true, low: ['c'] });
  assert.equal(sp({ a: 'high', b: 'high', h: 'high', x: 'low' }).good, false, 'the hurt are not in good spirits');
  assert.deepEqual(sp({ a: 'low' }, []), { good: false, low: [] });
  for (const f of [restApi.crewSpirits, restApi.billSheet, restApi.askedMiddle, restApi.hullPlate, restApi.registryMarks, restApi.bunkShut]) assert.ok(!/random|rand\(|pick\(/.test(String(f)), 'no dice');
  const [base, good] = [restApi.ROOM_GLOW.galley, restApi.GALLEY_SPIRITS].map(g => restApi.roomLight({ x0: 0, x1: 340, top: 0, floor: 100 }, phaseWeights(0.3), 0, false, [170], g));
  assert.ok(good.k > base.k && good.k <= 1.5, 'a little stronger'); assert.ok(good.pool[2] < base.pool[2] && good.pool[0] >= base.pool[0], 'a little warmer');
  const r = layoutBox(LAYOUTS.freighter, 'galley'), draw = spirits => { const { ctx, calls } = recorder(); drawRoom(ctx, 'galley', r, RS({ well: FW, spirits, damage: { marks: new Set(), severe: false } })); return calls; };
  const dial = (calls, col) => placedRects(calls).filter(q => q.col === col).length;
  assert.equal(dial(draw(true), '#a89060'), 1, 'on: its dial lit'); assert.equal(dial(draw(false), '#a89060'), 0); assert.equal(dial(draw(false), '#2e2c24'), 1, 'off: dark');
  assert.ok(draw(true).filter(k => k[0] === 'arc').length > draw(false).filter(k => k[0] === 'arc').length, 'on: its sound marks');
  assert.ok(!draw(true).some(k => k[0] === 'strokeStyle' && /^rgba\(200,170,110/.test(k[1])), 'the sound marks tinted as the room is, not a raw colour');
  for (const col of ['#a89060', '#2e2c24', '#4a4e44', '#262a24', '#6a6a5a', '#9a9480', '#3a2c20', '#4a4436', ...Object.values(restApi.ROLE_COLORS).map(restApi.billTone)]) assert.ok(inLimits(col), `${col} inside the props' brightness`);
});
test('someone low has their own bunk\'s curtain drawn, even by day; the bunk always shut stays shut (#936)', () => {
  const { r, s } = berthCase(10, 0.3, 1.17), owner = { slept: false, shelf: [], photos: [], screen: null, keep: null, towel: '#5a7a8a' };
  const bunks = low => Array.from({ length: 10 }, (_, k) => (k < 7 ? { ...owner, low: low.includes(k) } : null));
  const shut = b => { const { ctx, calls } = recorder(); drawRoom(ctx, 'berths', r, { ...s, night: 0, bunks: b }); return filledParts(calls).filter(p => p.col === '#4a3a5a' && partBox(p).x1 - partBox(p).x0 > 40).length; };
  assert.equal(shut(bunks([])), 1, 'the one kept shut'); assert.equal(shut(bunks([4])), 2, 'and the low one\'s'); assert.equal(shut(bunks([2])), 1, 'low in the shut one: the same');
  assert.equal(shut(bunks([0, 4])), 3, 'the first bunk\'s too');
  assert.equal(restApi.bunkShut({ bunks: bunks([4]) }, 4, 2), true); assert.equal(restApi.bunkShut({}, 2, 2), true); assert.equal(restApi.bunkShut({}, 3, 2), false);
});
test('the bill, the radio, the low curtains and her name leave every save restored, write nothing under 12px and hold still under reduced motion (#936)', () => {
  const sheet = { rows: [{ post: 'bridge', col: '#6fb0ff' }, { post: 'engine', col: null }], middle: '#d9d4cc' };
  for (const [id, extra] of [['galley', { bill: sheet, spirits: true }], ['galley', { bill: sheet, spirits: false }], ['bridge', { registry: 'CR 2208' }], ['berths', { bunks: [null, null, null, { slept: false, shelf: [], photos: [], screen: null, keep: null, towel: '#5a7a8a', low: true }] }]]) for (const zoom of [0.82, 1.17, 1.45]) {
    const r = layoutBox(LAYOUTS.freighter, id), s = RS({ zoom, well: FW, berths: 10, ...extra, damage: { marks: new Set(), severe: false } });
    const c = fakeCtx(); drawRoom(c, id, r, s); assert.equal(c.depth, 0, `${id} ${zoom}: saves restored`);
    for (const f of c.fonts) assert.ok(Number(/(\d+(?:\.\d+)?)px/.exec(f)[1]) >= 12, `${id}: ${f}`);
    assert.ok(p6Still((q, t) => drawRoom(q, id, r, { ...s, still: true, time: t })), `${id} ${zoom}: the same frame under reduced motion`);
  }
});
