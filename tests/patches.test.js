'use strict';

// #935: a damage mark that clears leaves a welded patch on that room's wall until a shipyard's repair, and the trip shows its age in the galley
// and the berths (the mugs and plates left out, the laundry bag, the plant), from the burn's elapsed share and nothing from the dice. The logic
// (patchesFor, mendHull, galleyClutter) and the drawing in plain Node; the game's own repairs, a port stay and a new burn in the page.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./nodecontext');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

const api = load(['js/data.js', 'js/util.js', 'js/figures.js', 'js/layouts.js', 'js/camera.js', 'js/rooms.js', 'js/shiplife.js'], { G: {}, Mods: { filter: (n, v) => v, emit() {}, register() {} } },
  ['patchesFor', 'mendHull', 'tripAge', 'galleyClutter', 'GALLEY_CLUTTER', 'drawRoom', 'roomMessTable', 'roomWalls', 'drawPhaseLight', 'LAYOUTS', 'layoutBox', 'SEATS', 'roomEye', 'roomInto', 'roomBays', 'berthCorner', 'figShade', 'WALL_TONE']);
const plain = v => JSON.parse(JSON.stringify(v));
const W = { burn: 0, cruise: 1, flip: 0 };
const lay = api.LAYOUTS.freighter, FW = { x0: (lay.well.x - lay.well.w / 2) * lay.width, x1: (lay.well.x + lay.well.w / 2) * lay.width };
const RS = o => ({ w: W, time: 3, zoom: 1.17, spin: 0, still: false, berths: 10, asleep: 0, cargo: 0.5, fuel: 0.5, burning: true, night: 0, well: FW, patient: false, headIn: false, damage: { marks: new Set(), severe: false, patches: new Set() }, ...o });
const recorder = () => {
  const calls = []; let depth = 0;
  const ctx = new Proxy({}, { get: (t, k) => (k in t ? t[k] : String(k).startsWith('create') ? () => ({ addColorStop() {} }) : k === 'measureText' ? () => ({ width: 10 }) : (...a) => { if (k === 'save') depth++; if (k === 'restore') depth--; calls.push([k, ...a]); }),
    set: (t, k, v) => { t[k] = v; if (k === 'fillStyle' || k === 'strokeStyle' || k === 'font') calls.push([k, v]); return true; } });
  return { ctx, calls, depth: () => depth };
};
// Each fill, its points where they land (the translations applied) and its colour.
const placed = calls => {
  const out = [], stack = []; let dx = 0, dy = 0, pts = [], fill = null;
  for (const [k, ...a] of calls) {
    if (k === 'save') stack.push([dx, dy]); else if (k === 'restore') [dx, dy] = stack.pop(); else if (k === 'translate') { dx += a[0]; dy += a[1]; }
    else if (k === 'fillStyle') fill = a[0]; else if (k === 'beginPath') pts = [];
    else if (k === 'moveTo' || k === 'lineTo') pts.push([a[0] + dx, a[1] + dy]); else if (k === 'quadraticCurveTo') pts.push([a[2] + dx, a[3] + dy]);
    else if (k === 'arc' || k === 'ellipse') pts.push([a[0] + dx, a[1] + dy]);
    else if (k === 'fillRect') out.push({ col: String(fill).toLowerCase(), pts: [[a[0] + dx, a[1] + dy], [a[0] + a[2] + dx, a[1] + a[3] + dy]] });
    else if (k === 'fill') out.push({ col: String(fill).toLowerCase(), pts: [...pts] });
  }
  return out;
};
const rgbOf = col => (/^#[0-9a-f]{6}$/.test(col) ? [1, 3, 5].map(i => parseInt(col.slice(i, i + 2), 16)) : /^rgb\(/.test(col) ? col.slice(4, -1).split(',').map(Number) : null);
const inLimits = col => { const v = rgbOf(col); return !v || (Math.max(...v) <= 0xb0 && Math.max(...v) - Math.min(...v) <= 0x60); };
const wall = col => api.figShade(col, api.WALL_TONE);
const draw = (id, s) => { const r = api.layoutBox(lay, id), rec = recorder(); api.drawRoom(rec.ctx, id, r, s); if (id === 'galley') api.roomMessTable(rec.ctx, r, s); return { r, ...rec }; };
const key = calls => JSON.stringify(calls.map(k => k.map(v => (typeof v === 'number' ? Math.round(v * 1000) / 1000 : v))));
const nameBox = (r, zoom) => ({ x0: r.x0, x1: r.x0 + 12 + 60 / zoom, y0: r.top + 8 - 1 / zoom, y1: r.top + 8 + 17 / zoom });
const hits = (b, [x, y]) => x > b.x0 && x < b.x1 && y > b.y0 && y < b.y1;

test('a mark that clears leaves a patch, one to a room, the oldest first; a yard repair clears them all (#935)', () => {
  assert.deepEqual(plain(api.patchesFor(undefined, ['hold', 'galley'], ['hold'], false)), ['galley'], 'the mark that cleared');
  assert.deepEqual(plain(api.patchesFor(['galley'], ['hold'], [], false)), ['galley', 'hold'], 'added after the older one');
  assert.deepEqual(plain(api.patchesFor(['galley', 'hold'], ['galley'], [], false)), ['galley', 'hold'], 'a room patched again keeps its one patch, in its place');
  assert.deepEqual(plain(api.patchesFor(['galley'], [], ['engine'], false)), ['galley'], 'a new mark leaves nothing yet');
  assert.deepEqual(plain(api.patchesFor(['galley'], ['engine'], ['engine'], false)), ['galley'], 'a mark still there leaves nothing');
  assert.deepEqual(plain(api.patchesFor(['galley', 'hold'], ['engine'], [], true)), [], 'the yard clears them all, and the mark it mends leaves none');
});

test('the patches survive a port stay and a new burn, and the state keeps nothing while there is nothing to keep (#935)', () => {
  const st = {};
  api.mendHull(st, [], ['hold', 'galley']); assert.deepEqual(plain(st), { hullMarks: ['hold', 'galley'] }, 'the marks the hull carries');
  api.mendHull(st, ['hold', 'galley'], ['hold']); assert.deepEqual(plain(st), { patches: ['galley'], hullMarks: ['hold'] }, 'repaired in flight: a patch');
  api.mendHull(st, st.hullMarks, []); assert.deepEqual(plain(st), { patches: ['galley', 'hold'] }, 'the port patches the scrape: its mark a patch too');
  api.mendHull(st, [], []); assert.deepEqual(plain(st), { patches: ['galley', 'hold'] }, 'a new burn with the hull whole: the patches stay');
  api.mendHull(st, [], ['engine']); assert.deepEqual(plain(st), { patches: ['galley', 'hold'], hullMarks: ['engine'] }, 'and with new damage');
  api.mendHull(st, ['engine'], [], true); assert.deepEqual(plain(st), {}, 'the yard: nothing left');
});

test('the trip\'s age is the burn\'s elapsed share, and the galley\'s clutter comes at fixed shares of it: none, two or three by halfway, four to six at the end (#935)', () => {
  assert.equal(api.tripAge({ total: 100, left: 100 }), 0); assert.equal(api.tripAge({ total: 100, left: 50 }), 0.5); assert.equal(api.tripAge({ total: 100, left: 0 }), 1); assert.equal(api.tripAge(null), 0);
  const n = age => api.galleyClutter(age).length;
  assert.equal(n(0), 0, 'none at the start'); assert.equal(n(undefined), 0, 'nor with no age given');
  assert.ok(n(0.5) >= 2 && n(0.5) <= 3, `two or three by halfway (${n(0.5)})`);
  for (const age of [0.9, 0.95, 1]) assert.ok(n(age) >= 4 && n(age) <= 6, `four to six near the end (${n(age)} at ${age})`);
  for (let a = 0; a < 1; a += 0.01) assert.ok(n(a + 0.01) >= n(a), 'only gathers as the burn goes on');
  // on nobody's place: each on the table halfway between two places at the bench
  const seats = api.SEATS.galley, r = api.layoutBox(lay, 'galley'), Wd = r.x1 - r.x0;
  for (const c of api.GALLEY_CLUTTER.filter(q => q.where === 'table')) assert.ok(seats.every(f => Math.abs(f - c.x) * Wd >= 10), `the ${c.kind} at ${c.x} clear of every place at the bench`);
});

test('the galley gathers its mugs and plates on the worktop and the table, clear of the name, and a new burn starts clean (#935)', () => {
  const at = age => draw('galley', RS({ age })), r = api.layoutBox(lay, 'galley');
  assert.equal(key(at(0).calls), key(draw('galley', RS({})).calls), 'a new burn draws as before: nothing out');
  const mugs = age => placed(at(age).calls).filter(p => p.col === '#6e7a86').length, plates = age => placed(at(age).calls).filter(p => p.col === '#8e887a').length;
  assert.deepEqual([mugs(0), plates(0)], [0, 0], 'none at the start');
  assert.equal(mugs(0.5) + plates(0.5), 3, 'three by halfway');
  assert.equal(mugs(0.95) + plates(0.95), 7, 'six near the end, one of them a stack of two plates');
  const e = api.roomEye(r), F = r.floor, Wd = r.x1 - r.x0;
  for (const p of placed(at(0.95).calls).filter(q => ['#6e7a86', '#8e887a'].includes(q.col))) {
    const ys = p.pts.map(q => q[1]), xs = p.pts.map(q => q[0]), bottom = Math.max(...ys);
    const on = y => bottom <= y + 0.01 && bottom >= y - 1.81;  // on the top, or on the plate under it
    const counter = xs.every(x => x > api.roomInto(e, r.x0 + Wd * 0.02 - 1.5, F - 41, 0.25)[0] && x < api.roomInto(e, r.x0 + Wd * 0.205 + 1.5, F - 41, 0.25)[0]) && on(api.roomInto(e, 0, F - 41, 0.25)[1]);
    const table = xs.every(x => x > api.roomInto(e, r.x0 + Wd * 0.25, F - 32, 0.2)[0] && x < api.roomInto(e, r.x0 + Wd * 0.73, F - 32, 0.2)[0]) && on(api.roomInto(e, 0, F - 32, 0.2)[1]);
    assert.ok(counter || table, `a ${p.col} part standing on the worktop or the table (${JSON.stringify(p.pts)})`);
    for (const zoom of [0.82, 1.17, 1.45]) for (const q of p.pts) assert.ok(!hits(nameBox(r, zoom), q), `clear of the room's name (${q})`);
  }
});

test('the berths\' laundry bag fills from flat to full on its peg under the wall unit, and the galley\'s plant droops (#935)', () => {
  const bag = age => placed(draw('berths', RS({ age })).calls).filter(p => p.col === wall('#5a6450')).map(p => { const xs = p.pts.map(q => q[0]), ys = p.pts.map(q => q[1]); return { w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys), x: (Math.max(...xs) + Math.min(...xs)) / 2, y0: Math.min(...ys) }; })[0];
  const flat = bag(0), half = bag(0.5), full = bag(0.95);
  assert.ok(flat && half && full, 'a bag at every age');
  assert.ok(flat.w < half.w && half.w < full.w && flat.h < full.h, `fuller as the burn goes on (${flat.w}, ${half.w}, ${full.w} wide)`);
  const r = api.layoutBox(lay, 'berths'), c = api.berthCorner(r, 10, FW), e = api.roomEye(api.roomBays(r, FW)[1]);
  const [lx0] = api.roomInto(e, c.x0, r.floor), [lx1] = api.roomInto(e, c.x1, r.floor);
  assert.ok(full.x - full.w / 2 > lx0 && full.x + full.w / 2 < lx1, 'on the crew corner\'s wall');
  const peg = placed(draw('berths', RS({ age: 0.5 })).calls).filter(p => p.col === wall('#2a3e54')).some(p => p.pts.some(q => Math.abs(q[0] - half.x) < 3 && q[1] < half.y0 && q[1] > half.y0 - 4));
  assert.ok(peg, 'hung on a peg over its neck');
  const leaves = age => { const { calls } = draw('galley', RS({ age })); const i = calls.findIndex(k => k[0] === 'strokeStyle' && /^#[0-9a-f]{6}$/.test(k[1]) && rgbOf(k[1])[1] > rgbOf(k[1])[0] && rgbOf(k[1])[1] > rgbOf(k[1])[2]); const tips = []; for (let j = i + 1; j < calls.length && calls[j][0] !== 'strokeStyle'; j++) if (calls[j][0] === 'quadraticCurveTo') tips.push(calls[j][4]); return { col: calls[i][1], low: tips.reduce((a, b) => a + b, 0) / tips.length }; };
  const fresh = leaves(0), old = leaves(0.95);
  assert.equal(fresh.col, '#5fae5a', 'green at the start, as before');
  assert.ok(old.low > fresh.low + 1, `the leaves lower near the end (${fresh.low} to ${old.low})`);
  assert.ok(rgbOf(old.col)[0] > rgbOf(fresh.col)[0] && rgbOf(old.col)[1] < rgbOf(fresh.col)[1], `a little browner (${old.col})`);
  assert.ok(inLimits(old.col), `and inside the brightness limits (${old.col})`);
});

test('a patch is drawn on its room\'s back wall where the mark was, clear of the name; a mark over it hides it (#935)', () => {
  const PLATE = wall('#33404a');
  for (const id of ['galley', 'hold', 'berths', 'engine', 'bridge', 'medbay']) {
    const s = RS({ damage: { marks: new Set(), severe: false, patches: new Set([id]) } }), { r, calls } = draw(id, s);
    const plate = placed(calls).filter(p => p.col === PLATE);
    assert.equal(plate.length, 1, `${id}: one plate`);
    const bay = api.roomBays(r, FW).find(b => plate[0].pts.every(q => q[0] >= b.x0 && q[0] <= b.x1)); assert.ok(bay, `${id}: inside one bay`);
    const e = api.roomEye(bay), [bx0, by0] = api.roomInto(e, bay.x0, bay.top), [bx1, by1] = api.roomInto(e, bay.x1, bay.floor);
    for (const [x, y] of plate[0].pts) assert.ok(x > bx0 && x < bx1 && y > by0 && y < by1, `${id}: on the back wall (${x}, ${y})`);
    for (const zoom of [0.82, 1.17, 1.45]) for (const q of plate[0].pts) assert.ok(!hits(nameBox(r, zoom), q), `${id}: clear of the name`);
    const px = r.x0 + (r.x1 - r.x0) * 0.7 + 13, xs = plate[0].pts.map(q => q[0]), mid = (Math.min(...xs) + Math.max(...xs)) / 2;
    assert.ok(Math.abs(mid - api.roomInto(e, px, 0)[0]) < 0.01, `${id}: where the mark was drawn, carried onto the wall`);
    assert.ok(calls.some(k => k[0] === 'strokeStyle' && k[1] === wall('#4e4c44')), `${id}: its weld bead`);
    const other = draw(id, RS({ damage: { marks: new Set(), severe: false, patches: new Set(['workshop']) } }));
    assert.equal(key(other.calls), key(draw(id, RS({})).calls), `${id}: another room's patch draws nothing here`);
    const over = draw(id, RS({ damage: { marks: new Set([id]), severe: false, patches: new Set([id]) } }));
    assert.equal(placed(over.calls).filter(p => p.col === PLATE).length, 0, `${id}: hidden under a new mark`);
    assert.equal(key(over.calls), key(draw(id, RS({ damage: { marks: new Set([id]), severe: false, patches: new Set() } })).calls), `${id}: the mark as it was`);
  }
});

test('what the trip and the patches add keeps inside the brightness limits, leaves every save restored, writes nothing under 12 px, and draws no dice (#935)', () => {
  const PROPS = ['#6e7a86', '#8e887a', '#5a4a3a', '#4a3a2e', wall('#5a6450'), wall('#3a4034'), wall('#6a5a6e'), wall('#33404a'), wall('#5e5a4e'), wall('#6a7a88')];
  for (const id of ['galley', 'berths', 'hold']) for (const age of [0, 0.5, 0.95]) for (const still of [false, true]) {
    const s = RS({ age, still, damage: { marks: new Set(), severe: false, patches: new Set(['galley', 'berths', 'hold']) } }), at = `${id} at ${age}${still ? ', still' : ''}`;
    const a = draw(id, s), b = draw(id, s);
    assert.equal(a.depth(), 0, `${at}: every save restored`);
    assert.equal(key(a.calls), key(b.calls), `${at}: the same frame twice`);
    for (const k of a.calls.filter(q => q[0] === 'font')) assert.ok(Number(/(\d+(?:\.\d+)?)px/.exec(k[1])[1]) >= 12, `${at}: ${k[1]}`);
    for (const p of placed(a.calls).filter(q => PROPS.includes(q.col))) assert.ok(inLimits(p.col), `${at}: ${p.col} inside the props' brightness`);
    const before = new Set(draw(id, RS({ still })).calls.filter(q => q[0] === 'strokeStyle').map(q => q[1]));
    for (const k of a.calls.filter(q => q[0] === 'strokeStyle' && !before.has(q[1]) && /^#|^rgb\(/.test(q[1]))) assert.ok(inLimits(k[1]), `${at}: the new stroke ${k[1]} inside the brightness limits`);
    if (still) assert.equal(key(draw(id, { ...s, time: 9.7 }).calls), key(a.calls), `${at}: under reduced motion the same frame at any time`);
  }
});

test('in the game a repair in flight leaves the marks as patches, they stay through a port and a new burn, the port patches a scrape, the yard clears them, and an old save loads with none (#935)', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  const r = await ev(() => {
    const out = {}, tick = n => { for (let i = 0; i < n; i++) lifeTick(1 / 30); };
    const burn = () => { sail(); while (G.dialog) finishEvent(); tryBurn(); enterTransit(); G.transit.times = []; G.transit.event = null; G.dialog = null; G.transit.lifeOffered = { before: true, m1: true, m2: true, m3: true, after: true }; shipPeople(); };
    const land = () => { G.transit = null; G.mode = 'landed'; landAt(currentPlanet(), []); while (G.dialog) finishEvent(); };
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester' }); while (G.dialog) finishEvent();
    G.state.tutorial = null; out.fresh = [G.state.patches, G.state.hullMarks];
    burn(); G.state.armor = Math.round(ship().armor * 0.55); tick(30);
    const marks = [...G.transit.marks]; out.marks = marks.length;
    ACTIVITIES.repair.run(); tick(5);  // the downtime repair: one mark back
    out.oneBack = [G.transit.marks.length, [...(G.state.patches || [])], marks[1]];
    G.state.armor = ship().armor; tick(5);
    out.allBack = [...G.state.patches]; out.wanted = [marks[1], marks[0]];
    out.drawn = drawRoomSet();
    land(); out.port = [...G.state.patches];
    save(); loadGame(); out.loaded = [...G.state.patches];
    burn(); tick(30); out.newBurn = [...G.state.patches];
    G.state.armor = Math.round(ship().armor * 0.95); tick(30); const scrape = G.transit.marks[0];
    land(); out.scrape = [[...G.state.patches], scrape, G.state.armor === ship().armor, G.state.hullMarks];
    G.state.armor = Math.round(ship().armor * 0.5); G.state.hullMarks = ['engine'];
    repairScene(currentPlanet()).choices[0].run(); out.yard = [G.state.patches, G.state.hullMarks, G.state.armor === ship().armor];
    const old = JSON.parse(JSON.stringify(G.state)); delete old.patches; delete old.hullMarks; out.old = migrate(old).patches;
    out.bad = migrate({ ...JSON.parse(JSON.stringify(G.state)), patches: 'galley', hullMarks: 7 });
    out.bad = [out.bad.patches, out.bad.hullMarks];
    return out;
    function drawRoomSet() { const t = G.transit; t.left = t.total * 0.5; drawTransit(innerWidth, innerHeight); return true; }
  });
  await done();
  assert.deepEqual(r.fresh, [undefined, undefined], 'a new game has none');
  assert.equal(r.marks, 2, 'two rooms marked');
  assert.deepEqual(r.oneBack, [1, [r.oneBack[2]], r.oneBack[2]], 'the repair in flight: the last mark cleared, its room patched');
  assert.deepEqual(r.allBack, r.wanted, 'the hull whole: both patched, the oldest first');
  assert.deepEqual(r.port, r.wanted, 'through the port stay');
  assert.deepEqual(r.loaded, r.wanted, 'saved and loaded');
  assert.deepEqual(r.newBurn, r.wanted, 'and into a new burn');
  const [after, scrape, whole, left] = r.scrape;
  assert.ok(whole, 'the scrape patched on the way in'); assert.equal(left, undefined, 'no marks left to carry');
  assert.deepEqual(after, r.wanted.includes(scrape) ? r.wanted : [...r.wanted, scrape], `the scrape's mark (${scrape}) a patch too`);
  assert.deepEqual(r.yard, [undefined, undefined, true], 'the yard: the hull whole and no patches');
  assert.equal(r.old, undefined, 'an old save without them loads with none');
  assert.deepEqual(r.bad, [undefined, undefined], 'and the wrong kind of thing is dropped');
});
