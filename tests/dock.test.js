'use strict';

// The port inspection played out in the cutaway at the dock (#940, js/dock.js): the beats on each of the scene's pages as a pure function of the page,
// the time on it, the choice and the hand's post; the two figures' cap and carried things; the airlock's open door and the hold's seal; and in the page,
// landing into the dock and out to the port screen, the camera keeping each beat clear of the scene's page, and the burn view as it was.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./nodecontext');
const { open, closeBrowser, frames } = require('./helpers');

after(closeBrowser);

const POSTS = { pilot: { role: 'pilot' }, gunner: { role: 'gunner' }, engineer: { role: 'engineer' }, comms: { role: 'slicer' } };
const api = load(['js/data.js', 'js/util.js', 'js/figures.js', 'js/layouts.js', 'js/camera.js', 'js/rooms.js', 'js/shiplife.js', 'js/hulldetail.js', 'js/dock.js'],
  { G: {}, POSTS, Mods: { filter: (n, v) => v, emit() {}, register() {} }, portraitLook: () => ({ skin: '#c08a68', hair: '#2a1d18', cut: 0, v: 7 }) },
  ['dockBeats', 'dockPlan', 'dockOpened', 'dockStep', 'dockChose', 'dockCast', 'dockPostSpot', 'dockSealTone', 'drawDockOutside', 'DOCK_AT', 'DOCK_HOLD', 'DOCK_KHAKI', 'DOCK_CAP',
    'drawPerson', 'posture', 'drawRoom', 'layoutBox', 'LAYOUTS', 'towerOutline', 'deckFloor', 'HULL', 'SEATS', 'roomAt', 'WALL_TONE', 'figShade', 'POSTURES']);
const lay = api.LAYOUTS.freighter, W = lay.width, LOCK = 4, HOLD = 6, WELL = lay.well.x * W;
const plan = (choice, post) => api.dockPlan(choice, post ? POSTS[post].role : null);
const beat = (page, t, choice = null, post = 'comms', still = false) => JSON.parse(JSON.stringify(api.dockBeats(page, t, choice, post, still)));
const near = (a, b, e = 0.5) => Math.abs(a - b) <= e;
const inChamber = q => q && q.dk === LOCK && q.x > 0 && q.x < 96;
const rgbOf = col => (/^#[0-9a-f]{6}$/.test(col) ? [1, 3, 5].map(i => parseInt(col.slice(i, i + 2), 16)) : /^rgb\(/.test(col) ? col.slice(4, -1).split(',').map(Number) : null);
const inLimits = col => { const v = rgbOf(col); return !v || (Math.max(...v) <= 0xb0 && Math.max(...v) - Math.min(...v) <= 0x60); };

// A context that records what is drawn: the calls, the fonts, the fills and strokes, and how deep the saves are.
const fakeCtx = () => {
  const calls = [], fonts = [], fills = [], strokes = []; let depth = 0;
  return new Proxy({}, {
    get: (o, k) => (k in o ? o[k] : k === 'calls' ? calls : k === 'fonts' ? fonts : k === 'fills' ? fills : k === 'strokes' ? strokes : k === 'depth' ? depth
      : k === 'measureText' ? s => ({ width: String(s).length * 6 }) : /Gradient|createPattern/.test(k) ? () => ({ addColorStop() {} }) : k === 'getTransform' ? () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 })
        : (...a) => { if (k === 'save') depth++; if (k === 'restore') depth--; calls.push([k, ...a]); }),
    set: (o, k, v) => { o[k] = v; if (k === 'font') fonts.push(v); if (k === 'fillStyle') fills.push(String(v).toLowerCase()); if (k === 'strokeStyle') strokes.push(String(v).toLowerCase()); calls.push([k, v]); return true; },
  });
};

// ---------- the beats (pure) ----------

test('the opening page: (a) the two come up the gangway and through the lock, the lamp lit; (b) the inspector to the bridge with the slate, the junior to the hold to count', () => {
  const p = plan(null, 'comms');
  const start = beat('open', 0);
  assert.equal(start.beat, 'a');
  for (const k of ['insp', 'junior']) assert.ok(start[k].outside && start[k].x < 0 && start[k].dk === LOCK, `${k} starts on the gangway, outside the hull (${JSON.stringify(start[k])})`);
  assert.equal(start.insp.pose.name, 'walk', 'the inspector walking up it');
  assert.ok(start.lock.open, 'the outer door open');
  assert.deepEqual([start.focus.dk, start.focus.x < 0], [LOCK, true], 'the camera on the lock deck, over the gangway');
  const half = beat('open', p.aEnd / 2);
  assert.ok(half.insp.x > start.insp.x, 'up the gangway toward the door');
  const inside = beat('open', p.aEnd - 0.1);
  assert.ok(inChamber(inside.insp) && inChamber(inside.junior), `both in the lock's chamber at the end of (a) (${inside.insp.x}, ${inside.junior.x})`);
  assert.ok(!inside.insp.outside && inside.lock.lit, 'inside the hull, the cycle lamp lit');
  assert.equal(inside.insp.carry, 'slate'); assert.equal(inside.junior.carry, 'seal');
  // (b): to the ladder, the inspector up, the junior down
  const climbs = [];
  for (let t = p.aEnd; t < p.bEnd; t += 0.25) { const b = beat('open', t); assert.equal(b.beat, 'b'); if (b.insp.pose.name === 'climb') climbs.push(b.insp); }
  assert.ok(climbs.length > 4 && climbs.every(q => q.x === WELL), 'the inspector climbs on the ladder, in the well');
  const bridge = beat('open', p.bBridge - 0.5);
  assert.deepEqual([bridge.insp.dk, bridge.insp.x, bridge.insp.pose.name, bridge.insp.pose.view, bridge.insp.carry], [0, api.DOCK_AT.bridge.insp, 'stand', 'front', 'slate'], 'the inspector on the bridge, the slate in hand');
  assert.equal(bridge.focus.dk, 0, 'the camera on the bridge');
  const hold = beat('open', p.bEnd + 10);
  assert.deepEqual([hold.junior.dk, hold.junior.x, hold.junior.pose.name, hold.junior.pose.face, hold.junior.carry], [HOLD, api.DOCK_AT.hold.junior, 'work', -1, 'slate'], 'the junior at the crates in the hold, counting against a slate');
  assert.deepEqual([hold.focus.dk, hold.focus.x], [HOLD, api.DOCK_AT.hold.junior], 'and the camera there');
  assert.equal(hold.insp.dk, 0, 'the inspector still on the bridge');
  assert.ok(!hold.lock.lit && hold.swing === 0 && !hold.sealed, 'the lamp out once they have gone through, the clamps on, the hold not sealed yet');
});

test('the result page: (c) from the comms post the hand brings the papers along the bridge; from another post the hand climbs to it to speak up', () => {
  const comms = plan('move', 'comms'), seat0 = api.dockPostSpot('slicer');
  assert.deepEqual([seat0.room, seat0.dk, near(seat0.x, W * api.roomAt('bridge').x0 + W * api.roomAt('bridge').w * api.SEATS.bridge[0])], ['bridge', 0, true], 'the comms post is the bridge\'s first seat');
  const c0 = beat('result', 0, 'move', 'comms');
  assert.equal(c0.beat, 'c');
  assert.deepEqual([c0.hand.dk, near(c0.hand.x, seat0.x, 2), c0.hand.carry], [0, true, 'papers'], 'from the comms seat, the papers in hand');
  for (let t = 0; t < comms.cEnd; t += 0.25) { const b = beat('result', t, 'move', 'comms'); assert.equal(b.hand.dk, 0, `${t}: along the bridge, no climb`); assert.equal(b.focus.dk, 0, `${t}: the camera on the bridge`); }
  const cEnd = beat('result', comms.cEnd - 0.1, 'move', 'comms');
  assert.deepEqual([cEnd.hand.x, cEnd.hand.pose.name, cEnd.hand.pose.face], [api.DOCK_AT.bridge.comms, 'stand', 1], 'by the inspector, on the comms post\'s side, facing them');
  assert.equal(cEnd.insp.pose.face, -1, 'the inspector turned to the hand');
  for (const post of ['gunner', 'engineer']) {
    const p = plan('move', post), from = api.dockPostSpot(POSTS[post].role), poses = new Set();
    for (let t = 0; t < p.cEnd; t += 0.2) { const b = beat('result', t, 'move', post); assert.equal(b.beat, 'c'); poses.add(b.hand.pose.name); }
    const b0 = beat('result', 0, 'move', post), b1 = beat('result', p.cEnd - 0.1, 'move', post);
    assert.ok(from.dk > 0 && b0.hand.dk === from.dk && near(b0.hand.x, from.x, 2), `${post}: from their post on deck ${from.dk}`);
    assert.ok(poses.has('climb') && poses.has('walk'), `${post}: walks to the ladder and climbs (${[...poses]})`);
    assert.deepEqual([b1.hand.dk, b1.hand.x, b1.hand.pose.face, b1.hand.carry], [0, api.DOCK_AT.bridge.ladder, -1, null], `${post}: up on the bridge to speak up from the ladder's side, nothing in hand`);
    assert.equal(b1.insp.pose.face, 1, `${post}: the inspector turned to them`);
  }
});

test('no (c) for keeping out of it, the nod or the owner\'s payment: the result page starts with the seal, and the hand stays at their post', () => {
  for (const choice of ['keep', 'nod', 'pay', null]) for (const post of ['comms', 'gunner', null]) {
    const p = plan(choice, post);
    assert.equal(p.cEnd, 0, `${choice}, ${post}: no time for a move`);
    for (let t = 0; t < p.eEnd + 2; t += 0.5) { const b = beat('result', t, choice, post); assert.notEqual(b.beat, 'c', `${choice}, ${post} at ${t}`); assert.equal(b.hand, null, `${choice}, ${post} at ${t}: the hand not moved`); }
    assert.equal(beat('result', 0, choice, post).insp.pose.view, 'front', `${choice}: the inspector not turned to anyone`);
  }
});

test('(d) the junior seals the hold with the seal gun; (e) the two go back down the gangway and the clamps swing off, their lamps red', () => {
  for (const choice of ['move', 'keep']) {
    const p = plan(choice, 'gunner'), at = t => beat('result', t, choice, 'gunner');
    const d0 = at(p.cEnd + 0.1), d1 = at(p.cEnd + api.DOCK_HOLD.sealAt + 0.1);
    assert.deepEqual([d0.beat, d0.junior.dk, d0.junior.pose.name, d0.junior.carry, d0.sealed], ['d', HOLD, 'work', 'seal', false], `${choice}: the junior at the crates with the seal gun`);
    assert.ok(d1.sealed && d1.beat === 'd', `${choice}: then the hold sealed`);
    assert.deepEqual([d0.focus.dk, d0.focus.x], [HOLD, api.DOCK_AT.hold.junior], `${choice}: the camera in the hold`);
    const seen = { lit: false, outside: 0 };
    for (let t = p.dEnd; t < p.down; t += 0.2) {
      const b = at(t); assert.equal(b.beat, 'e'); assert.equal(b.swing, 0, `${t}: the clamps on while they are aboard`); assert.ok(b.sealed);
      if (b.lock.lit) seen.lit = true; if (b.insp && b.insp.outside) seen.outside++;
    }
    assert.ok(seen.lit && seen.outside > 3, `${choice}: back through the lit lock and down the gangway (${JSON.stringify(seen)})`);
    assert.ok(at(p.down - 0.1).junior || at(p.down - 0.1).insp, 'someone still on the way down');
    const gone = at(p.down + 0.1);
    assert.deepEqual([gone.insp, gone.junior, gone.beat], [null, null, 'done'], `${choice}: gone down the gangway`);
    assert.equal(gone.swing, 0, 'the clamps still on a moment after');
    const swinging = at(p.down + api.DOCK_HOLD.clamps + api.DOCK_HOLD.swing / 2), off = at(p.eEnd + 1);
    assert.ok(swinging.swing > 0 && swinging.swing < 1, `swinging off (${swinging.swing})`); assert.equal(off.swing, 1, 'off');
    assert.deepEqual([off.focus.dk, off.focus.x < 0], [LOCK, true], 'the camera on the lock and the gangway');
  }
});

test('the clamps\' lamps are green while they are on and red once they swing off, drawn on the hull outside', () => {
  const o = api.towerOutline(lay), deck = i => { const floor = api.deckFloor(lay, i); return { top: floor - api.HULL.deck, floor }; };
  for (const [swing, want, not] of [[0, '#5aff8a', '#ff5a5a'], [0.4, '#ff5a5a', '#5aff8a'], [1, '#ff5a5a', '#5aff8a']]) {
    const c = fakeCtx(); api.drawDockOutside(c, o, lay, deck, { swing, lock: { open: true }, people: [] }, 1.2);
    assert.ok(c.fills.filter(f => f === want).length >= 4, `${swing}: four lamps ${want}`); assert.ok(!c.fills.includes(not), `${swing}: none ${not}`);
    assert.equal(c.depth, 0, 'every save restored');
  }
});

test('under reduced motion each beat jumps to where it ends: no walking or climbing, and the clamps off at once', () => {
  for (const [choice, post] of [['move', 'comms'], ['move', 'gunner'], ['keep', 'gunner']]) {
    const pO = plan(null, post), pR = plan(choice, post);
    for (let t = 0; t < pO.bEnd + 2; t += 0.3) {
      const b = beat('open', t, null, post, true);
      for (const q of [b.insp, b.junior]) assert.ok(q && !['walk', 'climb'].includes(q.pose.name), `open ${t}: ${q && q.pose.name}`);
      if (b.beat === 'a') assert.ok(inChamber(b.insp) && inChamber(b.junior), `open ${t}: (a) jumps into the chamber`);
      else { assert.equal(b.insp.dk, 0, `open ${t}: (b) the inspector on the bridge`); assert.equal(b.junior.dk, HOLD, `open ${t}: the junior in the hold`); }
    }
    for (let t = 0; t < pR.eEnd + 2; t += 0.3) {
      const b = beat('result', t, choice, post, true);
      for (const q of [b.insp, b.junior, b.hand]) assert.ok(!q || !['walk', 'climb'].includes(q.pose.name), `result ${t}: ${q && q.pose.name}`);
      if (b.beat === 'c') assert.equal(b.hand.x, post === 'comms' ? api.DOCK_AT.bridge.comms : api.DOCK_AT.bridge.ladder, `result ${t}: (c) the hand at once by the inspector`);
      if (b.beat === 'e' || b.beat === 'done') { assert.equal(b.insp, null, `result ${t}: (e) gone at once`); assert.equal(b.swing, t >= pR.down ? 1 : 0); }
    }
  }
});

test('every pose the beats give is a posture with a frame in range, so a figure has a place to tap', () => {
  for (const [choice, post] of [['move', 'comms'], ['move', 'engineer'], ['keep', 'gunner'], ['pay', null]]) for (const still of [false, true]) for (const page of ['open', 'result']) {
    const p = plan(choice, post);
    for (let t = 0; t < (page === 'open' ? p.bEnd : p.eEnd) + 1; t += 0.37) {
      const b = beat(page, t, page === 'open' ? null : choice, post, still);
      for (const q of [b.insp, b.junior, b.hand].filter(Boolean)) {
        const f = api.POSTURES[q.pose.name];
        assert.ok(f && Number.isInteger(q.pose.frame) && q.pose.frame >= 0 && q.pose.frame < f.frames, `${page} ${t} ${choice} ${post}: ${JSON.stringify(q.pose)}`);
      }
    }
  }
});

test('the dock\'s state: opened on the first page, stepped on by the frame with the beat, the clamps and the seal, and the result page after a choice', () => {
  const plain = v => JSON.parse(JSON.stringify(v));
  let d = api.dockOpened();
  assert.deepEqual(plain(d), { page: 'open', t: 0, clock: 0, choice: null, beat: 'a', clamps: true, sealed: false });
  const p = plan('move', 'comms');
  for (let i = 0; i < 20; i++) d = api.dockStep(d, 1, 'comms', false);
  assert.deepEqual([d.t, d.clock, d.beat], [20, 20, 'b']);
  d = api.dockChose(d, 'move');
  assert.deepEqual([d.page, d.t, d.clock, d.choice], ['result', 0, 20, 'move'], 'the page and its clock start again; the camera\'s clock runs on');
  d = api.dockStep(d, p.cEnd + 2, 'comms', false); assert.deepEqual([d.beat, d.sealed, d.clamps], ['d', true, true]);
  d = api.dockStep(d, p.eEnd, 'comms', false); assert.deepEqual([d.beat, d.sealed, d.clamps], ['done', true, false]);
  assert.equal(api.dockChose(api.dockOpened(), undefined).choice, null, 'a choice with no tag plays no move');
});

test('the crew keep their posts and the captain the bridge; the hand is moved only by the move; the two are visitors in the port\'s uniform', () => {
  const company = [{ id: 'you', role: 'you', name: 'You' }, { id: 'a', role: 'pilot', name: 'Ines' }, { id: 'b', role: 'engineer', name: 'Rosa' }, { id: 'c', role: 'gunner', name: 'Mateo' }, { id: 'cap', role: 'captain', name: 'Hester' }, { name: 'Tom', role: 'cat' }];
  for (const post of ['comms', 'gunner', 'engineer']) {
    const v = api.dockBeats('open', 3, null, post, false), people = api.dockCast(company, POSTS[post].role, v, { id: 'off', name: 'Valenti' }, '#ff8a4a');
    const by = id => people.find(p => p.id === id);
    assert.equal(people[0].id, 'you', `${post}: the hand first`);
    assert.deepEqual([by('cap').room, by('cap').dk, by('cap').at], ['bridge', 0, 'post'], `${post}: the captain at a post on the bridge`);
    assert.ok(api.SEATS.bridge.some(f => near(by('cap').x * W, W * f, 0.5)), `${post}: in one of its seats`);
    for (const [id, room] of [['a', 'bridge'], ['b', 'engine']]) assert.deepEqual([by(id).room, by(id).at], [room, 'post'], `${post}: ${id} at their post`);
    const hand = by('you'), spot = api.dockPostSpot(POSTS[post].role);
    assert.ok(near(hand.x * W, spot.x, 0.01) && hand.dk === spot.dk && !hand.pose, `${post}: the hand at their post, as the move starts from`);
    const xs = people.filter(p => p.dk === hand.dk && p.room === hand.room && p !== hand).map(p => p.x * W);
    assert.ok(xs.every(x => Math.abs(x - hand.x * W) > 20), `${post}: nobody at the hand's place (${xs})`);
    const insp = by('off'), jun = by('dock:junior');
    assert.ok(insp.visitor && jun.visitor && insp.color === api.DOCK_KHAKI && jun.color === api.DOCK_KHAKI, 'both in khaki');
    assert.deepEqual([insp.name, insp.look.cap.band, insp.look.cap.col, insp.look.carry], ['Valenti', '#ff8a4a', api.DOCK_CAP, 'slate'], 'the inspector named, the cap\'s band in the owner\'s colour, the slate');
    assert.deepEqual([jun.name, jun.look.cap, jun.look.carry, jun.look.trim], ['', undefined, 'seal', '#ff8a4a'], 'the junior: no name, no cap, the seal gun, its seal in the owner\'s colour');
  }
  const moved = api.dockCast(company, 'slicer', api.dockBeats('result', 1, 'move', 'comms', false), { id: 'off', name: 'V' }, '#ff8a4a').find(p => p.id === 'you');
  assert.ok(moved.pose && moved.pose.name === 'walk' && moved.look.carry === 'papers', 'the hand walking with the papers in (c)');
});

test('the hurt lie in the medbay, the hand too; and nobody keeps a post where the two walk: the lock deck left of the well, the hold deck from the well to the junior\'s place', () => {
  const company = [{ id: 'you', role: 'you', name: 'You' }, { id: 'a', role: 'pilot', name: 'Ines' }, { id: 'q', role: 'quartermaster', name: 'Hana' }, { id: 'i', role: 'icehand', name: 'Bo' },
    { id: 'i2', role: 'icehand', name: 'Ty' }, { id: 'm', role: 'medic', name: 'Ana' }, { id: 'e', role: 'engineer', name: 'Rosa' }, { id: 'cap', role: 'captain', name: 'Hester' }];
  const med = api.roomAt('medbay');
  for (const hurt of [[], ['a'], ['a', 'you']]) for (const post of ['comms', 'gunner']) {
    const people = api.dockCast(company, POSTS[post].role, api.dockBeats('open', 3, null, post, false), { id: 'off', name: 'V' }, '#ff8a4a', hurt), at = `${post}, hurt ${hurt}`;
    for (const id of hurt) {
      const p = people.find(q => q.id === id);
      assert.deepEqual([p.room, p.at, p.dk], ['medbay', 'bed', med.deck], `${at}: ${id} in the medbay`);
      assert.ok(p.x >= med.x0 && p.x <= med.x1, `${at}: ${id} inside it`);
      assert.equal(api.posture(p, 'move', 0, false).name, 'bunk', `${at}: ${id} lying on the cot`);
    }
    for (const p of people.filter(q => !q.visitor && !hurt.includes(q.id))) {
      const x = p.x * W;
      assert.ok(!(p.dk === LOCK && x < WELL + 12), `${at}: ${p.id} at ${x} on the lock deck, where the two come and go`);
      assert.ok(!(p.dk === HOLD && x > WELL - 12 && x < api.DOCK_AT.hold.junior + 20), `${at}: ${p.id} at ${x} on the hold deck, where the junior walks and counts`);
    }
  }
});

// ---------- the figures and the rooms ----------

const LOOKS = { insp: { color: '#a39a74', cap: { col: '#4e4a36', band: '#ff8a4a' }, carry: 'slate', trim: '#ff8a4a' }, junior: { color: '#a39a74', carry: 'seal', trim: '#ff8a4a' }, hand: { color: '#c08cff', carry: 'papers' } };
test('the cap and the carried things are drawn in the figures\' style: in every pose the two take, outlined, every save restored, a tap on the body, no text', () => {
  const poses = [['stand', 'front'], ['stand', 'side'], ['stand', 'back'], ['walk', 'side'], ['climb', 'side'], ['work', 'side']];
  for (const [who, look] of Object.entries(LOOKS)) for (const [name, view] of poses) for (const face of [1, -1]) for (let v = 0; v < 6; v++) {
    const frame = api.POSTURES[name].frames - 1, at = `${who} ${name} ${view} ${face} v${v}`;
    const c = fakeCtx(), tap = api.drawPerson(c, { name, view, face, frame, x: 0, deck: 0 }, 400, 100, { ...look, skin: '#c08a68', hair: '#2a1d18', cut: v % 3, v: v * 37 });
    assert.equal(c.depth, 0, `${at}: every save restored`);
    assert.ok(tap.y < 100 && tap.y > 40 && tap.head.y < tap.y, `${at}: a tap point on the body`);
    assert.ok(!c.calls.some(k => k[0] === 'fillText' || k[0] === 'drawImage'), `${at}: no text or picture`);
    const bare = fakeCtx(); api.drawPerson(bare, { name, view, face, frame, x: 0, deck: 0 }, 400, 100, { color: look.color, skin: '#c08a68', hair: '#2a1d18', cut: v % 3, v: v * 37 });
    const extra = c.calls.length - bare.calls.length, shows = !!look.cap || (look.carry && view !== 'back' && name !== 'climb');
    if (shows) assert.ok(extra > 0, `${at}: drawn`);
    if (look.carry && view !== 'back' && name !== 'climb') assert.ok(c.strokes.filter(s => s === 'rgba(10,13,18,0.85)').length > bare.strokes.filter(s => s === 'rgba(10,13,18,0.85)').length, `${at}: outlined like the figure`);
  }
  const fills = look => { const c = fakeCtx(); api.drawPerson(c, { name: 'stand', view: 'front', face: 1, frame: 0 }, 0, 100, look); return c.fills; };
  assert.ok(fills(LOOKS.insp).includes('#ff8a4a'), 'the cap\'s band in the owner\'s colour');
  assert.ok(fills({ ...LOOKS.junior, trim: '#5fa8ff' }).includes('#5fa8ff'), 'the seal gun\'s roll in the owner\'s colour');
});

test('the airlock\'s open door and lit lamp and the hold\'s seals keep inside the props\' brightness, every save restored, no text', () => {
  const RS = o => ({ w: { burn: 0, cruise: 1, flip: 0 }, time: 3, zoom: 1.17, spin: 0, still: false, berths: 10, asleep: 0, cargo: 0.6, fuel: 0.5, burning: false, night: 0, well: { x0: (lay.well.x - lay.well.w / 2) * W, x1: (lay.well.x + lay.well.w / 2) * W }, patient: false, headIn: false, damage: { marks: new Set(), severe: false, patches: new Set() }, ...o });
  const drawn = (id, s) => { const c = fakeCtx(); api.drawRoom(c, id, api.layoutBox(lay, id), s); return c; };
  for (const trim of ['#ff8a4a', '#5fa8ff', '#e8d17a']) assert.ok(inLimits(api.dockSealTone(trim)), `the seal ${api.dockSealTone(trim)} for ${trim} a step below the people`);
  for (const [id, extra] of [['airlock', { lock: { open: true, lit: true } }], ['airlock', { lock: { open: true, lit: false } }], ['hold', { seal: api.dockSealTone('#ff8a4a') }]]) {
    const plainRoom = drawn(id, RS({})), c = drawn(id, RS(extra)), at = `${id} ${JSON.stringify(extra)}`;
    assert.equal(c.depth, 0, `${at}: every save restored`);
    assert.ok(!c.calls.some(k => k[0] === 'fillText'), `${at}: no text`);
    for (const f of c.fonts) assert.ok(Number(/(\d+(?:\.\d+)?)px/.exec(f)[1]) >= 12, `${at}: ${f}`);
    const before = new Set([...plainRoom.fills, ...plainRoom.strokes]);
    const added = [...c.fills, ...c.strokes].filter(col => !before.has(col) && /^#/.test(col));  // its own colours (the lit tops and shaded sides roomPart derives are the light's)
    assert.ok(added.length > 0, `${at}: something drawn for it`);
    for (const col of added) assert.ok(inLimits(col), `${at}: ${col} inside the props' brightness`);
  }
  const shut = drawn('airlock', RS({})), open = drawn('airlock', RS({ lock: { open: true } }));
  assert.ok(shut.strokes.includes('#6a6e70') && !open.strokes.includes('#6a6e70'), 'open: the door\'s wheel is not in its ring');
});

test('outside the hull at the dock: the pad, the clamps and the gangway keep the props\' brightness but for the clamps\' lamps, no text under 12 px, and whoever is on the gangway is drawn on it', () => {
  const o = api.towerOutline(lay), deck = i => { const floor = api.deckFloor(lay, i); return { top: floor - api.HULL.deck, floor }; };
  const v = api.dockBeats('open', 1, null, 'comms', false), people = api.dockCast([{ id: 'you', role: 'you', name: 'You' }], 'slicer', v, { id: 'off', name: 'Valenti' }, '#ff8a4a');
  for (const zoom of [0.8, 1.2, 1.6]) {
    const c = fakeCtx(), drawn = api.drawDockOutside(c, o, lay, deck, { swing: 0, lock: { open: true }, people }, zoom);
    assert.equal(c.depth, 0, `${zoom}: every save restored`);
    for (const f of c.fonts) assert.ok(Number(/(\d+(?:\.\d+)?)px/.exec(f)[1]) >= 12, `${zoom}: ${f}`);
    assert.deepEqual(JSON.parse(JSON.stringify(drawn.map(q => q.id).sort())), ['dock:junior', 'off'], `${zoom}: the two on the gangway`);
    for (const q of drawn) assert.ok([q.x, q.y, q.head.y, q.foot.y].every(Number.isFinite), `${zoom}: ${q.id} has a place to tap`);
    const F = deck(LOCK).floor;
    for (const q of drawn) assert.ok(q.foot.y > F && q.foot.y < F + 70 && q.x < o.x0, `${zoom}: ${q.id} stands on the gangway, down from the sill (${JSON.stringify(q.foot)})`);
    const figure = new Set(); { const f = fakeCtx(); for (const p of people.filter(q => q.outside)) api.drawPerson(f, { ...p.pose }, 0, 0, { color: p.color, skin: '#c08a68', hair: '#2a1d18', cut: 0, v: 7, ...p.look }); f.fills.forEach(x => figure.add(x)); f.strokes.forEach(x => figure.add(x)); }  // the people are as bright as people are
    for (const col of [...c.fills, ...c.strokes].filter(x => !figure.has(x) && !['#5aff8a', '#ff5a5a', '#9fb4c9'].includes(x))) assert.ok(inLimits(col), `${zoom}: ${col} inside the props' brightness`);
  }
});

// ---------- in the page ----------

// A hired hand at their post, at Ceres, with the water the Dome Pact licenses aboard, landing at Mars (a Dome Pact port).
const helpers = () => {
  window.landInspected = (post, o = {}) => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post, captainKey: 'hester' }); while (G.dialog) finishEvent();
    const st = G.state; st.story.next = 1e9; st.tutorial = null;
    uatLand('Ceres Station'); G.dialog = null; G.nextEvent = null; UI.notes = [];
    st.cargo = { water: 50 }; st.rep['Dome Pact'] = 0;
    const at = planetNamed('Mars'); st.systemId = at.sid; st.planet = at.pl.name; resetWorld(); landAt(at.pl, []);
    if (o.still !== undefined) Settings.reduceMotion = o.still;
    return st;
  };
  // The dock drawn as the page draws it at the beat's time: the camera snapped, the dock's state as the frame steps it.
  window.dockAt = (page, t, choice) => {
    G.dock = { ...G.dock, page, t, choice }; G.dock = dockStep(G.dock, 0, dockPost(), Settings.reduceMotion); G.cam = null;
    drawDockView(innerWidth, innerHeight);
    const box = G.burnBoxes.ship, clear = G.burnBoxes.clear || box, x0 = Math.max(clear.x, box.x + outlineLeft(box, G.cutOutline)), x1 = clear.x + clear.w;
    return { hits: G.cutHits.map(h => ({ id: h.id, x: h.x, y: h.y, head: h.head, foot: h.foot })), x0, x1, y0: clear.y, y1: clear.y + clear.h, dock: G.burnBoxes.dock, beat: G.dock.beat };
  };
};

test('landing at a port whose inspection opens shows the cutaway at the dock behind the scene, and the port screen after; the dock\'s field is cleared', async () => {
  const { ev, page, done } = await open({ viewport: { width: 1280, height: 800 } });
  await ev(helpers);
  const r = await ev(() => {
    landInspected('comms');
    const out = { title: G.dialog && G.dialog.event.title, stage: G.dialog && G.dialog.event.stage, dock: G.dock && { ...G.dock }, shown: dockShown() };
    const seen = []; const real = { cut: window.drawCutaway, world: window.drawWorld };
    window.drawCutaway = (...a) => { seen.push(a[2] ? 'dock' : 'burn'); return real.cut(...a); }; window.drawWorld = (...a) => { seen.push('world'); return real.world(...a); };
    const texts = [], fill = ctx.fillText; ctx.fillText = function (s, ...a) { texts.push(String(s)); return fill.call(this, s, ...a); };
    try { render(); } finally { window.drawCutaway = real.cut; window.drawWorld = real.world; delete ctx.fillText; }
    out.seen = seen; out.texts = texts;
    return out;
  });
  assert.equal(r.title, 'The Inspector'); assert.equal(r.stage, 'dock');
  assert.ok(r.shown && r.dock && r.dock.page === 'open' && r.dock.choice === null, `the dock's state set (${JSON.stringify(r.dock)})`);
  assert.deepEqual(r.seen, ['dock'], 'the cutaway at the dock, not the port\'s space');
  assert.ok(r.texts.includes('THE IRON ANVIL AT THE DOCK') || r.texts.some(t => / AT THE DOCK$/.test(t)), `the bar names the dock (${r.texts.slice(0, 6)})`);
  assert.ok(r.texts.includes('CLAMPS ON') && r.texts.includes('Mars') && r.texts.some(t => /Dome Pact/.test(t)), 'the port, its owner and the clamps');
  assert.ok(!r.texts.some(t => /IN TRANSIT|In transit/.test(t)), 'nothing says in transit');
  assert.ok(r.texts.some(t => /^At the dock, clamps on$/.test(t)), 'the side panel gives the dock');
  await frames(page, 3);
  const docked = await ev(() => ({ docked: UI.el.classList.contains('docked'), dock: G.burnBoxes.dock, t: G.dock.t, rect: (r => ({ x: r.left, y: r.top, w: r.width }))(UI.el.getBoundingClientRect()) }));
  assert.ok(docked.docked && docked.dock, 'the scene\'s page in the dock');
  assert.equal(docked.rect.x, Math.round(docked.dock.x)); assert.equal(docked.rect.w, Math.round(docked.dock.w));
  assert.ok(docked.t > 0, 'the beats\' clock runs');
  const after = await ev(() => {
    const real = Math.random; Math.random = () => 0; try { UI.act('choose', 0); } finally { Math.random = real; }
    const result = { page: G.dock.page, choice: G.dock.choice, shown: dockShown() };
    UI.act('continue');
    return { result, dock: G.dock, shown: dockShown(), dialog: !!G.dialog, mode: G.mode };
  });
  assert.deepEqual(after.result, { page: 'result', choice: 'move', shown: true }, 'the result page plays on at the dock');
  assert.deepEqual([after.dock, after.shown, after.dialog, after.mode], [null, false, false, 'landed'], 'cleared when the scene closes');
  await frames(page, 3);
  const port = await ev(() => {
    const seen = []; const real = { cut: window.drawCutaway, world: window.drawWorld };
    window.drawCutaway = (...a) => { seen.push('cut'); return real.cut(...a); }; window.drawWorld = (...a) => { seen.push('world'); return real.world(...a); };
    try { render(); } finally { window.drawCutaway = real.cut; window.drawWorld = real.world; }
    return { seen, docked: UI.el.classList.contains('docked'), event: UI.el.classList.contains('event'), hidden: UI.el.classList.contains('hidden'), tabs: !!UI.el.querySelector('[data-action="tab"]') };
  });
  assert.deepEqual(port.seen, ['world'], 'then the port as before');
  assert.ok(!port.docked && !port.event && !port.hidden && port.tabs, `the port screen (${JSON.stringify(port)})`);
  await done();
});

test('a scene with no stage at the dock (the customs crewmate, any other) opens on the port screen as before, and a dock left over draws nothing', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    landInspected('comms'); chooseEvent(1); finishEvent();
    openEvent({ title: 'Other', text: 'x', choices: [{ label: 'A', run: () => 'a' }] });
    const a = { dock: G.dock, shown: dockShown() };
    G.dock = dockOpened();
    return { a, b: dockShown() };
  });
  assert.deepEqual(r, { a: { dock: null, shown: false }, b: false });
  await done();
});

test('a load or a new game drops the dock with the scene: nothing is stepped after it, and a later scene leaves the burn\'s camera alone', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    landInspected('comms');
    const before = !!G.dock;
    loadSlot(1);
    const loaded = G.dock;
    while (G.dialog) finishEvent();
    sail(); while (G.dialog) finishEvent(); tryBurn(); enterTransit(); G.transit.times = []; G.transit.event = null; G.dialog = null;
    G.cam = { x: 123, y: 456, t: G.time };
    openEvent({ title: 'Other', text: 'x', choices: [{ label: 'A', run: () => 'a' }] }); chooseEvent(0); finishEvent();
    const cam = G.cam && G.cam.x === 123 && G.cam.y === 456;
    landInspected('gunner'); startGame({ slot: 2, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'pilot', captainKey: 'hester' });
    return { before, loaded, cam, dock: G.dock, started: G.dock };
  });
  assert.deepEqual(r, { before: true, loaded: null, cam: true, dock: null, started: null });
  await done();
});

test('the hand\'s post is read as the scene reads it: an owner who kept a post only pays, and the dock leaves them on the bridge', async () => {
  const { ev, done } = await open({ scope: 'full' });
  const r = await ev(() => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe' }); while (G.dialog) finishEvent();
    const st = G.state; st.story.next = 1e9; st.tutorial = null; st.career = { post: 'gunner', skill: {}, kit: [], picks: [] };
    st.cargo = { water: 50 }; st.rep['Dome Pact'] = 0; st.credits = 20000;
    const at = planetNamed('Mars'); st.systemId = at.sid; st.planet = at.pl.name; resetWorld(); G.mode = 'landed'; G.dialog = null; inspectAtLanding(at.pl);
    const labels = G.dialog.event.choices.map(c => c.label), post = dockPost(), shown = dockShown();
    let hand = null; const real = window.drawCutaway; window.drawCutaway = (box, clear, dock) => { if (dock) hand = dock.people.find(p => p.role === 'you'); return real(box, clear, dock); };
    try { chooseEvent(0); G.dock.t = 5; drawDockView(innerWidth, innerHeight); } finally { window.drawCutaway = real; }
    return { labels: labels.length, post, shown, choice: G.dock.choice, hand: hand && { dk: hand.dk, room: hand.room, pose: hand.pose || null } };
  });
  assert.equal(r.labels, 1, 'the scene: only pay'); assert.ok(r.shown);
  assert.equal(r.post, null, 'no post to move from');
  assert.equal(r.choice, 'pay');
  assert.deepEqual(r.hand, { dk: 0, room: 'bridge', pose: null }, 'the hand on the bridge, not walked from the guns');
  await done();
});

const WIDTHS = [[1000, 700], [1280, 800], [1600, 900]];
// Who each beat must keep in the part the page leaves clear at an instant (from the beats themselves): (a) both on the way up; (b) the inspector on the
// way and then with the captain, and once the camera goes down, the junior; (c) the hand, and the inspector too whenever the hand is on the bridge;
// (d) the junior; (e) whoever is on the lock deck, or the inspector on the way down to it.
const DUE = () => {
  window.dueAt = (page, t, choice, post) => {
    const b = dockBeats(page, t, choice, post, Settings.reduceMotion), p = dockPlan(choice, post ? POSTS[post].role : null), L = 4;
    if (b.beat === 'a') return ['insp', 'junior'];
    if (b.beat === 'b') return t < p.bBridge ? (b.insp.moving ? ['insp'] : ['insp', 'captain']) : ['junior'];
    if (b.beat === 'c') return b.hand.dk === 0 ? ['you', 'insp'] : ['you'];
    if (b.beat === 'd') return ['junior'];
    if (b.beat === 'e') { const on = ['insp', 'junior'].filter(k => b[k] && Math.abs(b[k].dk - L) < 0.01); return on.length ? on : b.insp ? ['insp'] : []; }
    return [];
  };
};
test('the camera keeps each beat\'s people in the part the scene\'s page leaves clear at every instant, from 1000 to 1600 wide, for three posts', async () => {
  for (const [width, height] of WIDTHS) {
    const { ev, done } = await open({ viewport: { width, height } });
    await ev(helpers); await ev(DUE);
    for (const post of ['comms', 'gunner', 'engineer']) {
      const r = await ev(post => {
        landInspected(post); const off = dockOfficial(currentPlanet()).id, cap = hiredCaptain().id, idOf = { insp: off, junior: 'dock:junior', captain: cap, you: 'you' };
        const p = dockPlan('move', POSTS[post].role), out = [];
        let n = 0;
        for (const [page, end] of [['open', p.bEnd + 2], ['result', p.eEnd + 1]]) for (let t = 0; t <= end; t += 0.5) {
          const choice = page === 'open' ? null : 'move', d = dockAt(page, t, choice);
          if (!d.dock || d.x1 > d.dock.x) out.push(`${page} ${t}: the clear part runs under the page`);
          for (const w of dueAt(page, t, choice, post)) {
            n++;
            const h = d.hits.find(q => q.id === idOf[w]);
            if (!h) { out.push(`${page} ${t} (${d.beat}): ${w} not drawn in the clear part`); continue; }
            for (const q of [h, h.head, h.foot]) if (q.x < d.x0 - 0.5 || q.x > d.x1 + 0.5 || q.y < d.y0 - 0.5 || q.y > d.y1 + 0.5) { out.push(`${page} ${t} (${d.beat}): ${w} at ${Math.round(q.x)},${Math.round(q.y)} outside ${Math.round(d.x0)}..${Math.round(d.x1)}, ${Math.round(d.y0)}..${Math.round(d.y1)}`); break; }
          }
        }
        return { out: out.slice(0, 12), n };
      }, post);
      assert.ok(r.n > 80, `${width}x${height}, ${post}: ${r.n} checks`);
      assert.deepEqual(r.out, [], `${width}x${height}, ${post}`);
    }
    await done();
  }
});

test('in the dock view canvas text is 12 px or more, every canvas save is restored, and nothing draws a random number', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    landInspected('gunner');
    const sizes = new Set(), proto = Object.getOwnPropertyDescriptor(CanvasRenderingContext2D.prototype, 'font');
    Object.defineProperty(ctx, 'font', { configurable: true, get() { return proto.get.call(this); }, set(v) { proto.set.call(this, v); const m = /(\d+(?:\.\d+)?)px/.exec(v); if (m) sizes.add(Number(m[1])); } });
    let depth = 0, most = 0, rolls = 0; const save = ctx.save, restore = ctx.restore, rnd = Math.random;
    ctx.save = function () { depth++; most = Math.max(most, depth); return save.call(this); }; ctx.restore = function () { depth--; return restore.call(this); };
    Math.random = () => { rolls++; return rnd(); };
    try {
      const p = dockPlan('move', 'gunner');
      for (let t = 0; t < p.bEnd + 2; t += 1.5) dockAt('open', t, null);
      for (let t = 0; t < p.eEnd + 2; t += 1.5) dockAt('result', t, 'move');
    } finally { delete ctx.font; ctx.save = save; ctx.restore = restore; Math.random = rnd; }
    return { sizes: [...sizes], depth, most, rolls };
  });
  assert.ok(r.sizes.length && r.sizes.every(s => s >= 12), `font sizes: ${r.sizes}`);
  assert.ok(r.most > 0 && r.depth === 0, `every save restored (${r.depth})`);
  assert.equal(r.rolls, 0, 'no dice');
  await done();
});

test('under reduced motion the dock view holds still: the same frame at two times within a beat', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    landInspected('comms', { still: true });
    const p = dockPlan(null, 'slicer'), grab = t => { dockAt('open', t, null); G.dock.clock = 0; G.cam = null; render(); return canvas.toDataURL(); };
    const out = { a: grab(0.5) === grab(p.aEnd - 0.5), b: grab(p.aEnd + 0.5) === grab(p.bBridge - 0.5), hold: grab(p.bBridge + 0.5) === grab(p.bEnd + 5) };
    Settings.reduceMotion = false;
    return out;
  });
  assert.deepEqual(r, { a: true, b: true, hold: true });
  await done();
});

test('the burn view is unchanged when not docked: no dock outside the hull, the thrust sign reads the thrust, and the camera stays on the tower', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(() => {
    window.burn = () => {
      startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester' }); while (G.dialog) finishEvent();
      const st = G.state; st.tutorial = null;
      sail(); while (G.dialog) finishEvent(); tryBurn(); enterTransit(); G.transit.times = []; G.transit.event = null; G.dialog = null;
      G.transit.lifeOffered = { before: true, m1: true, m2: true, m3: true, after: true };
    };
  });
  const r = await ev(() => {
    burn(); G.transit.left = G.transit.total * 0.3;
    let outside = 0; const real = window.drawDockOutside; window.drawDockOutside = (...a) => { outside++; return real(...a); };
    const texts = [], fill = ctx.fillText; ctx.fillText = function (s, ...a) { texts.push(String(s)); return fill.call(this, s, ...a); };
    const xs = [];
    try { for (let i = 0; i < 5; i++) { G.cam = null; render(); xs.push(G.cam.x); } } finally { window.drawDockOutside = real; delete ctx.fillText; }
    return { outside, dock: G.dock, sign: texts.filter(t => / G$|FLIP/.test(t)), bar: texts.some(t => / IN TRANSIT$/.test(t)), clamps: texts.some(t => /CLAMPS/.test(t)), xs, min: Math.min(...xs) };
  });
  assert.equal(r.outside, 0, 'no pad, clamps or gangway'); assert.equal(r.dock, null);
  assert.ok(r.sign.length > 0, `the thrust sign reads the thrust (${r.sign})`); assert.ok(r.bar && !r.clamps, 'the burn bar, no clamps');
  assert.ok(r.min >= -40, `the camera no further out than the tower's margin (${r.xs})`);
  await done();
});
