'use strict';

// The living ship: the burn's phase weights and the g reading (js/burnpanel.js), and the phases of a run (js/shiplife.js), in plain Node.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./nodecontext');

const { phaseWeights: weights, gReading } = load(['js/burnpanel.js'], { G: {} }, ['phaseWeights', 'gReading']);
const phaseWeights = pr => JSON.parse(JSON.stringify(weights(pr)));  // out of the vm context, so plain objects
const G = {};
const { shipState, marksFor, shipRand, shipDay, routineSpot, routineWait, FIG_GROUNDED, SHIP_DAY, sceneStage, phase, posture, POSTURES, LADDER, drawPerson, camStep, viewOf, outlineLayout, outlineRoomAt, ROOMS, drawOutline, hangEnd, worldText, drawRoom, drawPhaseLight, drawThrustSign, roomAt, SEATS, figPose, figStyle, figureMood, roomMessTable, roomBox, roomWalls, roomScreen, gaugeNeedle, LAYOUTS, layoutRooms, climbRate, HAUNTS, towerDeckY, deckFloor, layoutBox, couchX, towerHeight, camRun, camTarget, towerOutline, TOWER_BELL, outlineAt, berthBunk, berthSleeper, goTo, routineGo, handOver } = load(['js/data.js', 'js/util.js', 'js/figures.js', 'js/layouts.js', 'js/camera.js', 'js/rooms.js', 'js/shiplife.js', 'js/burnspeed.js'], { G, Mods: { filter: (n, v) => v, emit() {}, register() {} } }, ['phase', 'posture', 'POSTURES', 'LADDER', 'drawPerson', 'camStep', 'viewOf', 'outlineLayout', 'outlineRoomAt', 'ROOMS', 'drawOutline', 'hangEnd', 'worldText', 'drawRoom', 'drawPhaseLight', 'drawThrustSign', 'sceneStage', 'shipRand', 'shipDay', 'routineSpot', 'SHIP_DAY', 'routineWait', 'FIG_GROUNDED', 'marksFor', 'shipState', 'figStyle', 'figureMood', 'roomMessTable', 'roomAt', 'SEATS', 'figPose', 'roomBox', 'roomWalls', 'roomScreen', 'gaugeNeedle', 'LAYOUTS', 'layoutRooms', 'climbRate', 'HAUNTS', 'towerDeckY', 'deckFloor', 'layoutBox', 'couchX', 'towerHeight', 'camRun', 'camTarget', 'towerOutline', 'TOWER_BELL', 'outlineAt', 'berthBunk', 'berthSleeper', 'goTo', 'routineGo', 'handOver']);

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
test('one couch each, 60 apart on a deck and clear of the well (#972)', () => {
  const lay = LAYOUTS.freighter, W = lay.width, band = [(lay.well.x - lay.well.w / 2) * W - 30, (lay.well.x + lay.well.w / 2) * W + 30];
  const check = (xs, what) => {
    const s = xs.map(x => x * W).sort((a, b) => a - b);
    for (let k = 1; k < s.length; k++) assert.ok(s[k] - s[k - 1] >= 60, `${what}: couches at ${s[k - 1]} and ${s[k]}`);
    for (const x of s) assert.ok(x < band[0] || x > band[1], `${what}: a couch at ${x} over the well's band ${band}`);
  };
  check([couchX(0, 2), couchX(0, 2, 'captain')], 'the bridge');
  for (let n = 2; n <= 9; n++) check(Array.from({ length: n - 1 }, (_, k) => couchX(k + 1, n)), `the berths, ${n} aboard`);
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
  assert.equal(viewOf({ x: 0, y: 0, w: 760, h: 480 }, lay).zoom, 760 / 960, 'and the width fit');
  // the outline's strip (8 in from the box's edge, its width, and an 8 gap) is left out of the width the tower fits across
  const left = box => outlineLayout(box, lay).w + 16, wide = { x: 0, y: 0, w: 1360, h: 480 }, narrow = { x: 0, y: 0, w: 760, h: 480 };
  assert.equal(viewOf(wide, lay, left(wide)).zoom, (1360 - left(wide)) / 960, 'a wide box: now the width fit less the strip');
  assert.equal(viewOf(narrow, lay, left(narrow)).zoom, (760 - left(narrow)) / 960);
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
  for (const [dots, camY] of [[[{ x: 440, dk: 0, color: '#ffb347' }], 200], [[{ x: 440, dk: 5.5, color: '#ffb347' }, { x: 100, dk: 6, color: '#9fe' }], 1000]]) {
    const c = fakeCtx(); drawOutline(c, o, dots, camY, 360, lay); assert.equal(c.depth, 0); assert.ok(c.calls.length > 0); assert.ok(!c.calls.includes('fillText'));
  }
  const at = outlineAt(o, 440, towerDeckY(lay, 5.5));
  assert.ok(at.y > o.rooms.find(r => r.id === 'lifesupport').y + o.rooms.find(r => r.id === 'lifesupport').h && at.y < o.rooms.find(r => r.id === 'engine').y, 'a climber in the tube is in the tank\'s band');
  assert.ok(Math.abs(at.x - (o.x + o.w / 2)) < 1e-9, 'the well down the middle');
});

const RS = (o) => ({ w: phaseWeights(0.3), time: 3, zoom: 1.24, spin: 0, still: false, berths: 6, cargo: 0.5, fuel: 0.5, burning: true, night: 0, asleep: 0, ...o });
const RR = { x0: 300, x1: 700, top: 0, floor: 100 };
test('every room of the tower draws in every phase, with every save restored', () => {
  for (const id of ROOMS.map(r => r.id)) for (const pr of [0.02, 0.3, 0.45, 0.5]) for (const zoom of [0.8, 1.24]) {
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
  assert.deepEqual(spot('pilot', 'night'), { room: 'bridge', at: 'post' }, 'the watch at night');
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
  assert.deepEqual(spot(eng, 'night', state({ marks: ['hold'], repairs: { e: 'hold' } })), { room: 'engine', at: 'post' }, 'the watch keeps the drive at night');
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
test('a prop has a lit top edge, a shaded underside and an outline; the room\'s walls stay flat (#933)', () => {
  const a = recorder(); roomBox(a.ctx, 10, 10, 40, 30, '#2c4c6e');
  assert.ok(a.calls.filter(c => c[0] === 'fillRect').length >= 3, 'the body, the top edge and the underside');
  assert.ok(a.calls.some(c => c[0] === 'strokeRect'), 'and an outline');
  const small = recorder(); roomBox(small.ctx, 0, 0, 3, 3, '#2c4c6e');
  assert.equal(small.calls.filter(c => c[0] === 'fillRect').length, 1, 'a small detail is a plain fill'); assert.ok(!small.calls.some(c => c[0] === 'strokeRect'));
  const w = recorder(); roomWalls(w.ctx, { x0: 0, x1: 200, top: 0, floor: 100 }, { burn: 0, cruise: 1, flip: 0 }, 0, true);
  assert.ok(!w.calls.some(c => c[0] === 'strokeRect'), 'the walls have no outlines');
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
test('the engine room has gauges whose needles read the thrust, valve wheels and pipes with joints (#933)', () => {
  const r = { x0: 0, x1: 300, top: 0, floor: 100 }, s = { w: { burn: 0, cruise: 1, flip: 0 }, time: 1, zoom: 1, spin: 0, still: false, night: 0, berths: 6, cargo: 0, fuel: 1, asleep: 0, damage: { marks: new Set(), severe: false }, patient: false, burning: false };
  const { ctx, calls } = recorder();
  drawRoom(ctx, 'engine', r, s);
  const fills = c => calls.filter(k => k[0] === 'fillStyle' && k[1] === c).length, strokes = c => calls.filter(k => k[0] === 'strokeStyle' && k[1] === c).length;
  assert.ok(fills('#e6dfc9') >= 1, 'a gauge face on the feed (the upper deck\'s gauges went with it, #972)'); assert.ok(strokes('#c0392b') >= 2, 'valve wheels'); assert.ok(fills('#4f6f8f') >= 4, 'joints on the pipes');
  assert.ok(gaugeNeedle({ burn: 1, cruise: 0, flip: 0 }, 0, 0) > gaugeNeedle({ burn: 0, cruise: 1, flip: 0 }, 0, 0), 'the needle swings up in the hard burn');
  assert.ok(gaugeNeedle({ burn: 0, cruise: 1, flip: 0 }, 0, 0) > gaugeNeedle({ burn: 0, cruise: 0, flip: 1 }, 0, 0), 'and drops at the flip, the drive off');
});
test('the galley has a stove, its burners and oven door, under a hood (#933)', () => {
  const r = { x0: 0, x1: 420, top: 0, floor: 100 }, s = { w: { burn: 0, cruise: 1, flip: 0 }, time: 1, zoom: 1, spin: 0, still: false, night: 0, berths: 6, cargo: 0, fuel: 1, asleep: 0, damage: { marks: new Set(), severe: false }, patient: false };
  const { ctx, calls } = recorder();
  drawRoom(ctx, 'galley', r, s);
  const fills = c => calls.filter(k => k[0] === 'fillStyle' && k[1] === c).length;
  assert.ok(fills('#0b1520') >= 2, 'two burners'); assert.ok(fills('#2a1a10') >= 1, 'the oven door\'s window'); assert.ok(fills('#56708c') >= 1, 'the hood');
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
  const base = fakeCtx(); roomWalls(base, r, s.w, s.time, s.still); drawPhaseLight(base, r, s.w, s.time, s.night, false);
  const left = [...all.args]; for (const a of base.args) { const i = left.indexOf(a); if (i >= 0) left.splice(i, 1); }
  return left.map(a => { const [k, ...v] = a.split(/(?<=[a-zA-Z])(?=-?\d)|,/); return { k, v: v.map(Number) }; });
};
test('the galley is drawn to the figures\' standard in every phase: its props outlined, the name and the sign on clear wall (#933)', () => {
  const r = layoutBox(LAYOUTS.freighter, 'galley'), F = r.floor;
  for (const pr of [0.02, 0.3, 0.45, 0.5]) for (const zoom of [0.66, 0.96, 1.24]) {  // the burn view's zoom in a window 1000, 1280 and 1600 wide
    const s = RS({ w: phaseWeights(pr), zoom, damage: { marks: new Set(), severe: false } });
    const c = fakeCtx(); drawRoom(c, 'galley', r, s); roomMessTable(c, r, s);
    assert.equal(c.depth, 0, `${pr}: every save restored`);
    const { ctx, calls } = recorder(); drawRoom(ctx, 'galley', r, s); roomMessTable(ctx, r, s);
    const fills = col => calls.filter(k => k[0] === 'fillStyle' && k[1] === col).length;
    for (const [col, what] of [['#1f3852', 'the counter and its cupboards'], ['#22405c', 'the cupboards on the wall'], ['#8796a5', 'latches on the cupboards'], ['#3d6a86', 'the water dispenser'], ['#7d8995', 'knives on the strip'],
      ['#2f4a66', 'the porthole\'s frame'], ['#33506e', 'the bench\'s pad'], ['#4a6680', 'the table\'s tie-down rail'], ['#56708c', 'the hood'], ['#0b1520', 'the burners']]) assert.ok(fills(col) >= 1, `${pr}: ${what}`);
    assert.ok(calls.filter(k => k[0] === 'strokeStyle' && k[1] === FIG_OUTLINE).length >= 20, `${pr}: the props outlined like the figures`);
    for (const col of ['#d8d2c4', '#ddd6c8', '#9aa8b6', '#8a5a3a']) assert.equal(fills(col), 0, `${pr}: no near-white or orange block (${col}), the props a step below the people`);
    // the room's name (shiplife.js: 13px on a plate at its top left) and the thrust sign (its right end, over the hood) on clear wall; in the
    // smallest window the sign is scaled up to keep its text at 12px and covers the hood's top, as it is drawn over the room
    const name = { x0: r.x0, x1: r.x0 + 12 + 60 / zoom, y0: r.top + 34 - 14 / zoom, y1: r.top + 34 + 4 / zoom }, sk = zoom < 0.9 ? 0 : Math.max(1, 1.05 / zoom);
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
test('the bunks are a person long, either side of the well, and a sleeper lies on one with the head on the pillow (#972)', () => {
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
  const base = fakeCtx(); roomWalls(base, r, s.w, s.time, s.still); drawPhaseLight(base, r, s.w, s.time, s.night, true);
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
const BRIDGE_PROPS = [['#2a4560', 'the window\'s frame and its struts'], ['#1d3550', 'the overhead panel'], ['#3a5470', 'the grab rails'], ['#3a2c20', 'the certificate\'s frame'], ['#a39b84', 'the certificate'],
  ['#1f3a56', 'the consoles'], ['#2c4c6e', 'the consoles\' sloped tops'], ['#2e4a68', 'the seats\' pans'], ['#284664', 'the seats\' backs and headrests'], ['#03121c', 'the screens'], ['#1b2f45', 'the comms station\'s rack']];
test('the bridge is drawn to the figures\' standard in every phase: its props outlined and a step below the people, its name on clear wall (#933)', () => {
  const r = layoutBox(LAYOUTS.freighter, 'bridge'), F = r.floor, W = r.x1 - r.x0;
  for (const pr of [0.02, 0.3, 0.45, 0.5]) for (const zoom of [0.66, 0.96, 1.24]) {  // the burn view's zoom in a window 1000, 1280 and 1600 wide
    const s = RS({ w: phaseWeights(pr), zoom, damage: { marks: new Set(), severe: false } });
    const c = fakeCtx(); drawRoom(c, 'bridge', r, s); assert.equal(c.depth, 0, `${pr}: every save restored`);
    const { ctx, calls } = recorder(); drawRoom(ctx, 'bridge', r, s);
    const fills = col => calls.filter(k => k[0] === 'fillStyle' && k[1] === col).length;
    for (const [col, what] of BRIDGE_PROPS) assert.ok(fills(col) >= 1, `${pr}: ${what} (${col})`);
    const parts = filledParts(calls), outlined = parts.filter(p => p.outlined);
    assert.ok(outlined.length >= 40, `${pr}: the props outlined like the figures (${outlined.length})`);
    for (const { col } of outlined.filter(p => /^#[0-9a-f]{6}$/.test(p.col))) {
      const v = [1, 3, 5].map(i => parseInt(col.slice(i, i + 2), 16));
      assert.ok(Math.max(...v) <= 0xb0 && Math.max(...v) - Math.min(...v) <= 0x60, `${pr}: ${col} is near-white or saturated, brighter than the people`);
    }
    for (const col of ['#e8e0c8', '#e0b48e', '#ffb347']) assert.ok(!outlined.some(p => p.col === col), `${pr}: no ${col} block`);
    // the room's name (shiplife.js: 13px on a plate at its top left) on clear wall
    const name = { x0: r.x0, x1: r.x0 + 12 + 60 / zoom, y0: r.top + 34 - 14 / zoom, y1: r.top + 34 + 4 / zoom }, hit = (b, x, y) => x > b.x0 && x < b.x1 && y > b.y0 && y < b.y1;
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
    // the forward window: a clear rectangle the code names (for the destination, #936), wide, high on the wall, over the screens and clear of the name
    const g = bridgeGlass(r);
    assert.ok(g.w >= 300 && g.h >= 25 && g.x >= r.x0 && g.x + g.w <= r.x1 && g.y > r.top && g.x > name.x1, `${pr}: the window ${JSON.stringify(g)}`);
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

// #933, the berths: the bunks either side of the well, each with its mattress, pillow, blanket, curtain rail, reading lamp and lockers under,
// and a clear place for its owner's one thing (#934); the shelf, the guitar and the towel beside the well. Drawn at the burn view's zoom in
// a window 1000, 1280 and 1600 wide, with 4, 8 and 12 bunks.
const { roomBerths, berthKeep, berthCorner } = load(['js/data.js', 'js/util.js', 'js/figures.js', 'js/layouts.js', 'js/camera.js', 'js/rooms.js'], { G: {}, Mods: { filter: (n, v) => v, emit() {}, register() {} } }, ['roomBerths', 'berthKeep', 'berthCorner']);
const BERTH_PROPS = [['#2a4664', 'the posts'], ['#1f3a56', 'the frames'], ['#3a4a5e', 'the mattresses'], ['#9a968a', 'the pillows'], ['#334560', 'a blanket over a sleeper'],
  ['#3e4f6e', 'a blanket folded on an empty bunk'], ['#3a5470', 'the curtain rails and grab rails'], ['#4a3a5a', 'the curtains'], ['#4a5a6a', 'the reading lamps'], ['#1c3349', 'the lockers\' doors'],
  ['#284a68', 'the shelves'], ['#9a6c40', 'the guitar'], ['#8a4a40', 'the towel']];
const berthCase = (n, pr, zoom) => {
  const lay = LAYOUTS.freighter, r = layoutBox(lay, 'berths'), well = { x0: (lay.well.x - lay.well.w / 2) * lay.width, x1: (lay.well.x + lay.well.w / 2) * lay.width };
  return { r, well, s: RS({ w: phaseWeights(pr), zoom, berths: n, asleep: Math.min(n - 2, 5), well, damage: { marks: new Set(), severe: false } }), bunks: Array.from({ length: n }, (_, k) => berthBunk(r, n, k, well)) };
};
const partBox = p => { const xs = p.pts.map(q => q[0]), ys = p.pts.map(q => q[1]); return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) }; };
test('the berths are drawn to the figures\' standard in every phase: their props outlined and a step below the people, the name on clear wall (#933)', () => {
  for (const n of [4, 8, 12]) for (const pr of [0.02, 0.3, 0.45, 0.5]) for (const zoom of [0.66, 0.96, 1.24]) {
    const { r, s } = berthCase(n, pr, zoom), at = `${n} bunks, ${pr}, ${zoom}`;
    const c = fakeCtx(); drawRoom(c, 'berths', r, s); assert.equal(c.depth, 0, `${at}: every save restored`);
    for (const f of c.fonts) assert.ok(Number(/(\d+(?:\.\d+)?)px/.exec(f)[1]) >= 12, `${at}: ${f}`);
    const { ctx, calls } = recorder(); drawRoom(ctx, 'berths', r, s);
    const fills = col => calls.filter(k => k[0] === 'fillStyle' && k[1] === col).length;
    for (const [col, what] of BERTH_PROPS) assert.ok(fills(col) >= 1, `${at}: ${what} (${col})`);
    const parts = filledParts(calls), outlined = parts.filter(p => p.outlined);
    assert.ok(outlined.length >= 9 * n + 10, `${at}: the props outlined like the figures (${outlined.length})`);
    for (const { col } of outlined.filter(p => /^#[0-9a-f]{6}$/.test(p.col))) {
      const v = [1, 3, 5].map(i => parseInt(col.slice(i, i + 2), 16));
      assert.ok(Math.max(...v) <= 0xb0 && Math.max(...v) - Math.min(...v) <= 0x60, `${at}: ${col} is near-white or saturated, brighter than the people`);
    }
    for (const col of ['#d8d2c4', '#c84a3a', '#ddd']) assert.equal(fills(col), 0, `${at}: no near-white or saturated block (${col})`);
    for (const p of outlined.filter(q => q.col !== '#8a4a40')) assert.ok(partBox(p).y0 >= r.top + 6,  // the towel's path is at the origin, moved by ctx.translate as it swings
      `${at}: a ${p.col} part (${JSON.stringify(partBox(p))}) under the ceiling`);
    // the room's name (shiplife.js: 13px on a plate at its top left) on clear wall
    const name = { x0: r.x0, x1: r.x0 + 12 + 60 / zoom, y0: r.top + 34 - 14 / zoom, y1: r.top + 34 + 4 / zoom }, hit = (b, x, y) => x > b.x0 && x < b.x1 && y > b.y0 && y < b.y1;
    for (const { k, v } of roomOwn('berths', r, s)) {
      const pts = k === 'fillRect' ? [[v[0], v[1]], [v[0] + v[2], v[1]], [v[0], v[1] + v[3]], [v[0] + v[2], v[1] + v[3]], [v[0] + v[2] / 2, v[1] + v[3] / 2]] : /^(moveTo|lineTo)$/.test(k) ? [v] : k === 'quadraticCurveTo' ? [v.slice(2)] : [];
      for (const [x, y] of pts) assert.ok(!hit(name, x, y), `${at}: ${k} ${v} under the room's name`);
    }
  }
});
test('each bunk is a person long, with its mattress, the pillow under the sleeper\'s head, a reading lamp over it and lockers under the bottom tier (#933)', () => {
  for (const n of [4, 8, 12]) {
    const { r, s, bunks } = berthCase(n, 0.3, 1.24), F = r.floor, { ctx, calls } = recorder(); drawRoom(ctx, 'berths', r, s);
    const parts = filledParts(calls).filter(p => p.outlined).map(p => ({ col: p.col, ...partBox(p) })), within = (p, b) => p.x0 >= b.x - 0.01 && p.x1 <= b.x + b.w + 0.01;
    bunks.forEach((b, k) => {
      const at = `${n} bunks, bunk ${k} (${b.x} to ${b.x + b.w} at ${b.y})`;
      const bed = parts.find(p => p.col === '#3a4a5e' && within(p, b) && Math.abs(p.y0 - (b.y - 5)) < 0.01);
      assert.ok(bed && bed.x1 - bed.x0 >= 80, `${at}: a mattress a person long (${bed && bed.x1 - bed.x0})`);
      const sl = berthSleeper(b), head = drawPerson(fakeCtx(), { name: 'bunk', face: 1, frame: 0 }, sl.x, sl.y, { color: '#ffb347' }).head;
      assert.equal(sl.y, b.y - 5, `${at}: the sleeper on the mattress`);
      const pillow = parts.find(p => p.col === '#9a968a' && within(p, b) && p.y1 <= b.y - 5 + 0.01 && p.y0 >= b.y - 11);
      assert.ok(pillow && head.x >= pillow.x0 && head.x <= pillow.x1, `${at}: the pillow (${JSON.stringify(pillow)}) under the head at ${head.x}`);
      assert.ok(parts.some(p => p.col === '#4a5a6a' && p.x0 >= b.x && p.x1 <= b.x + b.w / 3 && p.y1 <= b.y - 19 && p.y0 >= b.y - 32), `${at}: a reading lamp at the head end, over the sleeper's head`);
      assert.ok(parts.some(p => p.col === '#3a5470' && within(p, b) && p.x1 - p.x0 >= b.w - 6 && p.y1 <= b.y - 26), `${at}: a curtain rail over it`);
      if (k % 2 === 0) {
        const doors = parts.filter(p => p.col === '#1c3349' && within(p, b) && p.y0 > b.y && p.y1 <= F);
        assert.ok(doors.length >= 2, `${at}: lockers under the bottom tier (${doors.length})`);
        const over = bunks.find(t => t.y < b.y && Math.abs(t.x - b.x) < 0.01);
        if (over) assert.ok(over.y + 6 <= sl.y - 13 - 4, `${at}: the sleeper (${sl.y - 13}) clear of the bunk over it (${over.y + 6})`);
      } else assert.ok(b.y - 5 - 13 >= r.top + 20, `${at}: the top tier's sleeper under the ceiling`);
    });
  }
});
test('each bunk keeps a clear place for its owner\'s one thing, inside the bunk over the sleeper (#933, #934)', () => {
  for (const n of [4, 8, 12]) for (const pr of [0.02, 0.3, 0.5]) {
    const { r, s, bunks } = berthCase(n, pr, 1.24), X = sh => r.x0 + (r.x1 - r.x0) * sh, { ctx, calls } = recorder(); roomBerths(ctx, r, s, X, r.x1 - r.x0);
    const parts = filledParts(calls).map(p => ({ col: p.col, ...partBox(p) })), rects = calls.filter(k => k[0] === 'fillRect').map(([, x, y, w, h]) => ({ x0: Math.min(x, x + w), x1: Math.max(x, x + w), y0: Math.min(y, y + h), y1: Math.max(y, y + h) }));
    const meet = (a, b) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
    bunks.forEach((b, k) => {
      const kp = berthKeep(b), box = { x0: kp.x, x1: kp.x + kp.w, y0: kp.y, y1: kp.y + kp.h }, at = `${n} bunks, ${pr}, bunk ${k}: the place ${JSON.stringify(kp)}`;
      assert.ok(kp.w >= 12 && kp.h >= 7, `${at}: room for a thing the size of a hand`);
      assert.ok(box.x0 >= b.x + b.w / 2 && box.x1 <= b.x + b.w, `${at}: inside the bunk, at its foot half`);
      assert.ok(box.y1 <= b.y - 5 - 13, `${at}: over the sleeper`);
      const over = bunks.find(t => t.y < b.y && Math.abs(t.x - b.x) < 0.01);
      assert.ok(box.y0 >= (over ? over.y + 6 : r.top + 10), `${at}: under the bunk over it or the ceiling`);
      if (k === 2) return;  // the curtain drawn across the third bunk covers its place, as it covers its sleeper
      for (const p of parts) assert.ok(!meet(p, box), `${at}: clear of a ${p.col} part ${JSON.stringify(p)}`);
      for (const q of rects) assert.ok(!meet(q, box), `${at}: clear of a rect ${JSON.stringify(q)}`);
    });
  }
});

// The crew's corner beside the well: the wall unit, the pinboard where it fits, the towel and the guitar, spread across the open wall, clear of
// the well and the bunks, each part outlined and a step below the people.
const CORNER_PROPS = [['#22405c', 'the wall unit\'s sides'], ['#284a68', 'its two shelves'], ['#2c4c6e', 'their lips'], ['#7d8a98', 'the mug'], ['#5e4434', 'the plant\'s pot'],
  ['#3a2c20', 'the photo\'s frame'], ['#4a5a6a', 'the reading lamp'], ['#9a6c40', 'the guitar\'s top'], ['#5a3a20', 'its side, in shade'], ['#4a2e1c', 'its pickguard'], ['#3a2414', 'its bridge'],
  ['#3a2618', 'its headstock'], ['#3a3a40', 'its lashings']];
test('the crew\'s corner fills the open wall beside the well: a wall unit, a pinboard, the towel and a guitar, clear of the bunks (#933)', () => {
  for (const [n, board] of [[4, true], [8, true], [10, true], [12, false]]) for (const pr of [0.02, 0.3, 0.5]) {
    const { r, s, well, bunks } = berthCase(n, pr, 0.66), c = berthCorner(r, n, well), X = sh => r.x0 + (r.x1 - r.x0) * sh, at = `${n} bunks, ${pr}`;
    assert.ok(c.x0 >= well.x1 + 6 && bunks.every(b => b.x + b.w <= well.x0 || b.x >= c.x1 + 4), `${at}: the corner ${JSON.stringify(c)} between the well and the bunks`);
    const { ctx, calls } = recorder(); roomBerths(ctx, r, s, X, r.x1 - r.x0);
    const parts = filledParts(calls).filter(p => p.outlined).map(p => ({ col: p.col, ...partBox(p) })), mine = parts.filter(p => p.x0 >= c.x0 - 1 && p.x1 <= c.x1 + 2);
    for (const [col, what] of CORNER_PROPS) assert.ok(mine.some(p => p.col === col), `${at}: ${what} (${col}) in the corner`);
    assert.ok(calls.some(k => k[0] === 'translate' && k[1] > c.x0 && k[1] < c.x1), `${at}: the towel swinging in the corner (its path at the origin, moved)`);
    assert.ok(mine.filter(p => p.y1 <= r.floor - 58 && p.y0 >= r.floor - 72 && p.x1 - p.x0 <= 9).length >= 7, `${at}: books of many heights on the lower shelf`);
    for (const { col } of mine.filter(p => /^#[0-9a-f]{6}$/.test(p.col))) {
      const v = [1, 3, 5].map(i => parseInt(col.slice(i, i + 2), 16));
      assert.ok(Math.max(...v) <= 0xb0 && Math.max(...v) - Math.min(...v) <= 0x60, `${at}: ${col} is near-white or saturated`);
    }
    const guitar = parts.filter(p => /^#(9a6c40|3a2618)$/.test(p.col)), gy0 = Math.min(...guitar.map(p => p.y0)), gy1 = Math.max(...guitar.map(p => p.y1)), body = parts.find(p => p.col === '#9a6c40');
    assert.ok(gy1 - gy0 >= 45 && gy1 - gy0 <= 55 && body.x1 - body.x0 >= 14 && body.x1 - body.x0 <= 20, `${at}: a person's guitar, about 50 tall against a person's 89 (${gy1 - gy0} tall, its body ${body.x1 - body.x0} wide)`);
    assert.ok(calls.filter(k => k[0] === 'strokeStyle' && k[1] === 'rgba(214,206,190,0.75)').length >= 1 && calls.some(k => k[0] === 'arc' && Math.abs(k[3] - 5.4 * 0.62) < 0.01), `${at}: its strings and the rosette`);
    const notes = mine.filter(p => /^#(9a9480|8a9478|a09a8c)$/.test(p.col));
    assert.equal(notes.length >= 4, board, `${at}: the pinboard with its notes and photos where it fits (${notes.length})`);
    if (board) assert.ok(mine.some(p => p.col === '#7a6446'), `${at}: the cork`);
  }
  const stillAt = t => { const { r, s } = berthCase(10, 0.5, 0.96), c = fakeCtx(); drawRoom(c, 'berths', r, { ...s, still: true, time: t }); return c.args.join('|'); };
  assert.equal(stillAt(1.3), stillAt(4.9), 'the same frame at any time under reduced motion');
});
test('someone eating alone sits on the edge of the first bunk (#933)', () => {
  const api = load(['js/data.js', 'js/util.js', 'js/figures.js', 'js/layouts.js', 'js/camera.js', 'js/rooms.js', 'js/shiplife.js'], { G: {}, Mods: { filter: (n, v) => v, emit() {}, register() {} } }, ['routineTarget', 'roomAt']);
  const ra = api.roomAt('berths'), x = api.routineTarget({}, { at: 'alone' }, ra, 0, 1, () => 0.5), { r, well } = berthCase(10, 0.3, 1), b = berthBunk(r, 10, 0, well);
  const wx = r.x0 + (x - ra.x0) / ra.w * (r.x1 - r.x0);
  assert.ok(wx > b.x + 4 && wx < b.x + b.w / 2, `at ${wx}, on the first bunk (${b.x} to ${b.x + b.w})`);
});

// #933, the medbay on the lock deck: the cot with its rails, straps, legs on braked casters, mattress and pillow; the IV pole bolted to the deck,
// its bag swinging and its line to the cot; the scanner arm from the ceiling over the cot; the monitor at eye height; the supply cabinet at the
// counter, down from white; the first-aid box on the wall under the room's name. Drawn at the burn view's zoom in a window 1000, 1280 and 1600 wide.
const { MED_COT } = load(['js/data.js', 'js/util.js', 'js/figures.js', 'js/layouts.js', 'js/camera.js', 'js/rooms.js'], { G: {}, Mods: { filter: (n, v) => v, emit() {}, register() {} } }, ['MED_COT']);
const MED_PROPS = [['#2a4664', 'the cot\'s frame'], ['#1c3249', 'its legs'], ['#1a2430', 'its casters'], ['#2e4a68', 'its head and foot boards'], ['#3a5470', 'its rail and the grab rails'], ['#56667a', 'the mattress'],
  ['#9a968a', 'the pillow'], ['#4a4436', 'the straps'], ['#4a5e74', 'the IV pole'], ['#6a8494', 'the IV bag'], ['#2c4560', 'the scanner arm'], ['#3a5068', 'the scanner\'s head'], ['#1f3a56', 'the monitor'],
  ['#4e5e6e', 'the cabinet'], ['#64748a', 'its doors'], ['#6e7e8e', 'its top'], ['#8e3a32', 'the red crosses'], ['#4e6a78', 'the bottles'], ['#7a8692', 'the kit'], ['#5a6876', 'the first-aid box']];
const MED_LINE = 'rgba(150,178,196,0.7)';
const medCase = (pr, zoom, patient) => ({ r: layoutBox(LAYOUTS.freighter, 'medbay'), s: RS({ w: phaseWeights(pr), zoom, patient, damage: { marks: new Set(), severe: false } }) });
test('the medbay is drawn to the figures\' standard in every phase: its props outlined and a step below the people, the name on clear wall (#933)', () => {
  for (const patient of [false, true]) for (const pr of [0.02, 0.3, 0.45, 0.5]) for (const zoom of [0.66, 0.96, 1.24]) {
    const { r, s } = medCase(pr, zoom, patient), at = `${patient ? 'a patient' : 'empty'}, ${pr}, ${zoom}`;
    const c = fakeCtx(); drawRoom(c, 'medbay', r, s); assert.equal(c.depth, 0, `${at}: every save restored`);
    for (const f of c.fonts) assert.ok(Number(/(\d+(?:\.\d+)?)px/.exec(f)[1]) >= 12, `${at}: ${f}`);
    const { ctx, calls } = recorder(); drawRoom(ctx, 'medbay', r, s);
    const fills = col => calls.filter(k => k[0] === 'fillStyle' && k[1] === col).length;
    for (const [col, what] of MED_PROPS) assert.ok(fills(col) >= 1, `${at}: ${what} (${col})`);
    const outlined = filledParts(calls).filter(p => p.outlined);
    assert.ok(outlined.length >= 30, `${at}: the props outlined like the figures (${outlined.length})`);
    for (const { col } of outlined.filter(p => /^#[0-9a-f]{6}$/.test(p.col))) {
      const v = [1, 3, 5].map(i => parseInt(col.slice(i, i + 2), 16));
      assert.ok(Math.max(...v) <= 0xb0 && Math.max(...v) - Math.min(...v) <= 0x60, `${at}: ${col} is near-white or saturated, brighter than the people`);
    }
    for (const col of ['#dde4ea', '#eef2f6', '#c9d3dc', '#d8dde4', '#c03a30', '#1a1a1a', '#8aa4c0']) assert.equal(fills(col), 0, `${at}: no near-white, saturated or black block (${col})`);
    assert.ok(calls.some(k => k[0] === 'strokeStyle' && k[1] === (patient ? '#ffb030' : '#7fd8a0')), `${at}: the monitor's trace, amber with a patient`);
    // the room's name (shiplife.js: 13px on a plate at its top left) on clear wall
    const name = { x0: r.x0, x1: r.x0 + 12 + 60 / zoom, y0: r.top + 34 - 14 / zoom, y1: r.top + 34 + 4 / zoom }, hit = (b, x, y) => x > b.x0 && x < b.x1 && y > b.y0 && y < b.y1;
    for (const { k, v } of roomOwn('medbay', r, s)) {
      const pts = k === 'fillRect' ? [[v[0], v[1]], [v[0] + v[2], v[1]], [v[0], v[1] + v[3]], [v[0] + v[2], v[1] + v[3]], [v[0] + v[2] / 2, v[1] + v[3] / 2]] : /^(moveTo|lineTo)$/.test(k) ? [v] : k === 'quadraticCurveTo' ? [v.slice(2)] : [];
      for (const [x, y] of pts) assert.ok(!hit(name, x, y), `${at}: ${k} ${v} under the room's name`);
    }
  }
  const stillAt = t => { const { r, s } = medCase(0.5, 0.96, true), c = fakeCtx(); drawRoom(c, 'medbay', r, { ...s, still: true, time: t }); return c.args.join('|'); };
  assert.equal(stillAt(1.3), stillAt(4.9), 'the same frame at any time under reduced motion');
});
test('the medbay\'s props are sized to a person: the cot\'s mattress under the patient, the IV at head height, the monitor at the eye, the cabinet at the counter (#933)', () => {
  const api = load(['js/data.js', 'js/util.js', 'js/figures.js', 'js/layouts.js', 'js/camera.js', 'js/rooms.js', 'js/shiplife.js'], { G: {}, Mods: { filter: (n, v) => v, emit() {}, register() {} } }, ['routineTarget', 'roomAt']);
  const ra = api.roomAt('medbay'), { r } = medCase(0.3, 1.24, true), F = r.floor, W = r.x1 - r.x0, X = sh => r.x0 + W * sh;
  const bed = api.routineTarget({}, { at: 'bed' }, ra, 0, 1, () => 0.5), bx = r.x0 + (bed - ra.x0) / ra.w * W, head = drawPerson(fakeCtx(), { name: 'bunk', face: 1, frame: 0 }, bx, F - MED_COT, { color: '#ffb347' }).head;
  assert.ok(MED_COT >= 28 && MED_COT <= 32, `the patient lies at about 30, between the knee and the hip (${MED_COT})`);
  for (const pr of [0.02, 0.3, 0.5]) {
    const { s } = medCase(pr, 1.24, true), { ctx, calls } = recorder(); drawRoom(ctx, 'medbay', r, s);
    const parts = filledParts(calls).filter(p => p.outlined).map(p => ({ col: p.col, ...partBox(p) })), at = `${pr}`;
    const bedPart = parts.find(p => p.col === '#56667a');
    assert.ok(bedPart && Math.abs(bedPart.y0 - (F - MED_COT)) < 0.01, `${at}: the mattress's top at the patient (${bedPart && F - bedPart.y0})`);
    const frame = parts.find(p => p.col === '#2a4664'), lying = drawPerson(fakeCtx(), { name: 'bunk', face: 1, frame: 0 }, bx, F - MED_COT, { color: '#ffb347' });
    assert.ok(frame.x1 - frame.x0 >= 105 && frame.x1 - frame.x0 <= 110 && frame.y1 - frame.y0 <= 4, `${at}: the cot a person long with a little to spare (${frame.x1 - frame.x0} long, its frame ${frame.y1 - frame.y0} deep)`);
    assert.ok(bedPart.x0 < head.x - 8 && bedPart.x1 > lying.foot.x + 4, `${at}: the mattress (${bedPart.x0} to ${bedPart.x1}) under the whole patient (${head.x} to ${lying.foot.x})`);
    const pillow = parts.find(p => p.col === '#9a968a');
    assert.ok(pillow && head.x >= pillow.x0 && head.x <= pillow.x1 && Math.abs(pillow.y1 - (F - MED_COT)) < 0.01, `${at}: the pillow (${JSON.stringify(pillow)}) under the patient's head at ${head.x}`);
    assert.ok(parts.filter(p => p.col === '#4a4436' && p.x0 > bedPart.x0 && p.x1 < bedPart.x1).length >= 2, `${at}: straps to hold the hurt down in the burn`);
    assert.ok(parts.filter(p => p.col === '#2e4a68').every(p => F - p.y0 >= MED_COT && F - p.y0 <= 42 && p.x1 - p.x0 <= 3), `${at}: the head and foot boards, slim, a little over the mattress`);
    const pole = parts.find(p => p.col === '#4a5e74' && p.y1 - p.y0 > 60);
    assert.ok(pole && F - pole.y0 >= 85 && F - pole.y0 <= 92 && pole.y1 >= F - 3, `${at}: the IV pole from the deck to about head height (${pole && F - pole.y0})`);
    const fi = calls.findIndex(k => k[0] === 'fillStyle' && k[1] === '#6a8494'), bi = calls.slice(0, fi).map(k => k[0]).lastIndexOf('translate'), [, tx, ty] = calls[bi];
    const bag = parts.find(p => p.col === '#6a8494'), mid = F - (ty + (bag.y0 + bag.y1) / 2);
    assert.ok(bi >= 0 && mid >= 74 && mid <= 84 && Math.abs(tx - pole.x1) < 12, `${at}: the bag hung from the pole at about 80 (${mid}), moved as it swings`);
    const li = calls.findIndex(k => k[0] === 'strokeStyle' && k[1] === MED_LINE), m = calls.slice(li).find(k => k[0] === 'moveTo'), q = calls.slice(li).find(k => k[0] === 'quadraticCurveTo');
    assert.ok(li >= 0 && Math.abs(m[1] - tx) < 3 && m[2] >= ty + bag.y1 - 0.01 && m[2] <= ty + bag.y1 + 5, `${at}: the IV line from the bag's foot (${m && m.slice(1)})`);
    assert.ok(q[3] > bedPart.x0 && q[3] < bedPart.x1 && Math.abs(q[4] - (F - MED_COT)) <= 2, `${at}: to the cot (${q.slice(3)})`);
    const mon = parts.find(p => p.col === '#1f3a56'), my = F - (mon.y0 + mon.y1) / 2;
    assert.ok(my >= 72 && my <= 82 && mon.x1 - mon.x0 >= 28 && mon.x1 - mon.x0 <= 32 && mon.y1 - mon.y0 <= 18, `${at}: the monitor, small, at eye height (${my}, ${mon.x1 - mon.x0} by ${mon.y1 - mon.y0})`);
    assert.ok(mon.x0 > bedPart.x0 && mon.x0 < bedPart.x1, `${at}: the monitor (${mon.x0} to ${mon.x1}) over the cot, where someone at its side reads it`);
    const meet = (a, b) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
    for (const p of parts.filter(q => /^#(2c4560|3a5068|4a5e74|20384f)$/.test(q.col))) assert.ok(!meet(mon, p), `${at}: the monitor clear of the scanner arm and the IV pole (${p.col} ${JSON.stringify(p)})`);
    assert.ok(mon.x0 > tx + 6, `${at}: and clear of the bag`);
    const top = parts.find(p => p.col === '#6e7e8e');
    assert.ok(F - top.y0 >= 36 && F - top.y0 <= 44, `${at}: the cabinet at counter height (${F - top.y0})`);
    const arm = parts.filter(p => /^#(2c4560|3a5068)$/.test(p.col)), sh = parts.find(p => p.col === '#3a5068');
    assert.ok(Math.min(...arm.map(p => p.y0)) <= r.top + 5 && sh.x0 > bedPart.x0 && sh.x1 < bedPart.x1 && F - sh.y1 >= MED_COT + 20, `${at}: the scanner arm from the ceiling, its head over the cot clear of the patient`);
    const box = parts.find(p => p.col === '#5a6876');
    assert.ok(box && box.x1 < bedPart.x0 && F - box.y0 <= 60, `${at}: the first-aid box on the wall left of the cot, under the name`);
  }
});
