'use strict';

// The living ship: the burn's phase weights and the g reading (js/burnpanel.js), and the phases of a run (js/shiplife.js), in plain Node.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./nodecontext');

const { phaseWeights: weights, gReading } = load(['js/burnpanel.js'], { G: {} }, ['phaseWeights', 'gReading']);
const phaseWeights = pr => JSON.parse(JSON.stringify(weights(pr)));  // out of the vm context, so plain objects
const G = {};
const { shipState, marksFor, shipRand, shipDay, routineSpot, routineWait, FIG_GROUNDED, SHIP_DAY, sceneStage, phase, posture, POSTURES, LADDER, drawPerson, camStep, viewOf, outlineLayout, outlineRoomAt, floorY, hullLength, ROOMS, drawOutline, hangEnd, worldText, drawRoom, drawPhaseLight, drawThrustSign, roomAt, SEATS, figPose, roomBox, roomWalls, roomScreen, gaugeNeedle } = load(['js/data.js', 'js/util.js', 'js/figures.js', 'js/camera.js', 'js/rooms.js', 'js/shiplife.js'], { G, Mods: { filter: (n, v) => v, emit() {}, register() {} } }, ['phase', 'posture', 'POSTURES', 'LADDER', 'drawPerson', 'camStep', 'viewOf', 'outlineLayout', 'outlineRoomAt', 'floorY', 'hullLength', 'ROOMS', 'drawOutline', 'hangEnd', 'worldText', 'drawRoom', 'drawPhaseLight', 'drawThrustSign', 'sceneStage', 'shipRand', 'shipDay', 'routineSpot', 'SHIP_DAY', 'routineWait', 'FIG_GROUNDED', 'marksFor', 'shipState', 'roomAt', 'SEATS', 'figPose', 'roomBox', 'roomWalls', 'roomScreen', 'gaugeNeedle']);

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
  const at = pr => { G.transit = { total: 100, left: 100 * (1 - pr) }; return phase(); };
  assert.deepEqual([0.03, 0.2, 0.45, 0.5, 0.55, 0.8, 0.97].map(at), ['couch', 'move', 'secure', 'float', 'secure', 'move', 'couch']);
});

test('a posture for everyone in every phase, from the list the sprites are drawn to', () => {
  const seat = roomAt('galley').x0 + roomAt('galley').w * SEATS.galley[0];  // on one of the galley's seats (#925)
  const p = (o) => ({ role: 'gunner', room: 'galley', x: seat, dk: 0, tdk: 0, tx: null, seat, couch: 1, ...o });
  assert.equal(posture(p(), 'couch', 0, false).name, 'couch');
  assert.equal(posture(p({ couch: 0 }), 'couch', 0, false).name, 'stand', 'not on the couch until it has unfolded');
  assert.equal(posture(p({ x: seat + 0.03, couch: 0 }), 'couch', 0, false).name, 'walk', 'and on the way to it');
  assert.equal(posture(p({ x: seat + 0.01 }), 'move', 0, false).name, 'stand', 'off a seat');
  assert.equal(posture(p(), 'secure', 0, false).name, 'strap');
  assert.equal(posture(p(), 'float', 0, false).name, 'strap');
  assert.equal(posture(p({ role: 'engineer' }), 'float', 0, false).name, 'tether');
  assert.equal(posture(p({ role: 'engineer' }), 'secure', 0, false).name, 'strap');
  assert.equal(posture(p({ tx: 0.6 }), 'move', 0, false).name, 'walk');
  assert.equal(posture(p({ x: LADDER, dk: 0.5, tdk: 1 }), 'move', 0, false).name, 'climb');
  assert.equal(posture(p(), 'move', 0, false).name, 'sit');
  assert.equal(posture(p({ room: 'hold' }), 'move', 0, false).name, 'stand');
  assert.equal(posture(p({ room: 'berths' }), 'move', 0, true).name, 'bunk');
  assert.deepEqual(['float', 'couch', 'move'].map(ph => posture(p({ role: 'cat' }), ph, 0, false).name), ['cat-float', 'cat-sleep', 'cat-sit']);
  assert.equal(posture(p({ role: 'cat', tx: 0.3 }), 'move', 0, false).name, 'cat-walk');
  for (const ph of ['couch', 'secure', 'float', 'move']) { const q = posture(p(), ph, 7.3, false); assert.ok(POSTURES[q.name] && q.frame >= 0 && q.frame < POSTURES[q.name].frames); }
  assert.equal(posture(p({ face: -1 }), 'move', 0, false).face, -1);
});
test('the camera snaps first, then eases, and stays inside the hull', () => {
  assert.equal(camStep(null, 800, 0.1, 600, 1600), 800);
  const x = camStep(800, 1000, 0.1, 600, 1600); assert.ok(x > 800 && x < 1000);
  assert.equal(camStep(800, 0, 1, 600, 1600), 300); assert.equal(camStep(800, 5000, 1, 600, 1600), 1632 - 300);
  // a camera left outside the hull (a dialog closed, and the view is the whole box again) eases back in, not in one jump
  const back = camStep(1500, 5000, 0.1, 600, 1600); assert.ok(back < 1500 && back > 1632 - 300, `eased to ${back}`);
});
test('a hull shorter than the view sits in the middle and does not jitter', () => {
  const a = camStep(null, 100, 0.1, 1200, 960), b = camStep(a, 900, 0.1, 1200, 960); assert.equal(a, 960 * 0.51); assert.equal(b, a);
});
test('the zoom fits both decks in the box; the outline finds every room, and nothing outside it', () => {
  const v = viewOf({ x: 0, y: 0, w: 864, h: 311 }); assert.ok(Math.abs(v.zoom - 311 / 290) < 1e-9); assert.equal(v.y, 83); assert.ok(Math.abs(v.span - 864 / v.zoom) < 1e-9);
  const o = outlineLayout({ x: 100, y: 50, w: 864, h: 311 }, 1600);
  for (const r of o.rooms) assert.equal(outlineRoomAt(o, r.x + r.w / 2, r.y + r.h / 2), r.id);
  assert.equal(o.rooms.length, ROOMS.length); assert.equal(outlineRoomAt(o, o.x - 4, o.y - 4), null);
  assert.equal(floorY(0), 100); assert.equal(floorY(1), 212); assert.equal(hullLength(18), 1600); assert.equal(hullLength(10), 960); assert.equal(hullLength(20), 1600);
});
test('a tap on the outline mid-turn finds the room where it is drawn, squeezed', () => {
  const o = outlineLayout({ x: 0, y: 0, w: 864, h: 311 }, 1600), cx = o.x + o.w / 2, sq = 0.5, half = { ...o, squeeze: sq };
  for (const r of o.rooms) assert.equal(outlineRoomAt(half, cx + (r.x + r.w / 2 - cx) * sq, r.y + r.h / 2), r.id, `${r.id} where it is drawn`);
  const bridge = o.rooms.find(r => r.id === 'bridge');
  assert.equal(outlineRoomAt(half, bridge.x + bridge.w / 2, bridge.y + bridge.h / 2), null, 'not where the full-width box would be');
  assert.equal(outlineRoomAt({ ...o, squeeze: 1 }, bridge.x + bridge.w / 2, bridge.y + bridge.h / 2), 'bridge');
});
test('the outline draws balanced, squeezed by the turn, with no text', () => {
  const o = outlineLayout({ x: 0, y: 0, w: 864, h: 311 }, 1600);
  for (const turn of [1, -1, 0.3]) { const c = fakeCtx(); drawOutline(c, o, [{ x: 800, deck: 0, color: '#ffb347' }], 800, 694, 1600, turn); assert.equal(c.depth, 0); assert.ok(c.calls.length > 0); assert.ok(!c.calls.includes('fillText')); }
});

const RS = (o) => ({ w: phaseWeights(0.3), time: 3, zoom: 1.24, spin: 0, still: false, berths: 6, cargo: 0.5, fuel: 0.5, burning: true, night: 0, asleep: 0, ...o });
const RR = { x0: 300, x1: 700, top: 0, floor: 100 };
test('every room draws in every phase, and its text is 12px on screen or not drawn', () => {
  for (const id of [...ROOMS.map(r => r.id), 'tanks']) for (const pr of [0.02, 0.3, 0.45, 0.5]) for (const zoom of [0.8, 1.24]) {
    const c = fakeCtx(); drawRoom(c, id, RR, RS({ w: phaseWeights(pr), zoom }));
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
  for (const id of [...ROOMS.map(r => r.id), 'tanks']) {
    const at = (time, still) => { const c = fakeCtx(); drawRoom(c, id, RR, RS({ w: phaseWeights(0.5), time, still })); return c.args.join('|'); };
    assert.equal(at(1.3, true), at(4.9, true), id);
    if (at(1.3, false) !== at(4.9, false)) moving.push(id);
  }
  assert.ok(moving.length > 0, 'without reduced motion the flip does move');
});
test('a mug sits in its holder: steaming and free in cruise, clipped in at the flip', () => {
  const draw = pr => { const c = fakeCtx(); drawRoom(c, 'galley', RR, RS({ w: phaseWeights(pr) })); return c; };
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
  const p = { role: 'engineer', block: 'shift', at: 'post', room: 'engine', x: 0.1, dk: 1, tdk: 1, tx: null, wait: 0 };
  routineWait(p, 'shift', false, () => 0);  // no burn, no G: the dice are given
  assert.equal(p.errand, true, 'an errand when the dice say so'); assert.ok(p.wait >= 5, 'and a wait set from them');
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
  const r = { x0: 0, x1: 300, top: 0, floor: 224 }, s = { w: { burn: 0, cruise: 1, flip: 0 }, time: 1, zoom: 1, spin: 0, still: false, night: 0, berths: 6, cargo: 0, fuel: 1, asleep: 0, damage: { marks: new Set(), severe: false }, patient: false, burning: false };
  const { ctx, calls } = recorder();
  drawRoom(ctx, 'engine', r, s);
  const fills = c => calls.filter(k => k[0] === 'fillStyle' && k[1] === c).length, strokes = c => calls.filter(k => k[0] === 'strokeStyle' && k[1] === c).length;
  assert.ok(fills('#e6dfc9') >= 2, 'gauge faces'); assert.ok(strokes('#c0392b') >= 2, 'valve wheels'); assert.ok(fills('#4f6f8f') >= 4, 'joints on the pipes');
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
