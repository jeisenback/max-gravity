'use strict';

// The port inspection played out in the cutaway at the dock (#940). When the inspector's scene (inspection.js, its `stage: 'dock'`) opens on
// landing, the burn view's cutaway of the ship stands behind the scene's page in place of the port screen, for as long as the scene is open:
// the ship docked (no thrust, the cruise's light), the clamps on her hull, the outer lock door open on a gangway down to a boarding tower, and a
// pad under the drive. The inspector and a junior with the seal gun come aboard, and on a short timeline within each of the scene's pages:
//   the opening page: (a) the two come up the gangway and through the lock; (b) the inspector to the bridge with the papers, the junior to the
//   hold, counting crates against a slate;
//   the result page: (c) the hand's move, if it was one: from the comms post the hand brings the papers to the inspector, from any other post
//   climbs to the bridge to speak up; (d) the junior seals the hold; (e) the two go back down the gangway and the clamps come off.
// The crew keep their posts, the captain on the bridge. The dock's state is G.dock (game.js), set as the scene opens and cleared as it closes.
// dockBeats is a pure function of the page, the time on it, the choice and the hand's post; the drawing reads it. Under reduced motion each beat
// jumps to where it ends, with no walking.

const DOCK_KHAKI = '#a39a74', DOCK_CAP = '#4e4a36';  // the port's uniform, and the inspector's cap
const DOCK_PACE = { walk: 80, climb: 1.5 * (HULL.deck + HULL.plate) };  // world units a second: a walk, and a climb as the ladder's (climbRate)
const DOCK_OUT = 360;  // how far left of the tower the camera may pan at the dock (shiplife.js drawCutaway), over the gangway
const DOCK_GANGWAY = { len: 560, drop: 70, rail: 40, post: 46 };  // the gangway from the outer door's sill down to the tower: its run, its fall, the rail's height and the posts' spacing
// Where the two and the hand stand, in world x: off the gangway's far end, in the lock's chamber, on the bridge (the inspector this side of the
// well, close enough to the comms post and to the captain's that the camera keeps both with them beside a narrow page; the hand from the comms post
// on the inspector's near side, from the ladder on the far one; `look`, the inspector and the captain's post between), and in the hold.
const DOCK_AT = { off: -330, gangway: -90, lock: { insp: 64, junior: 28 }, bridge: { insp: 300, comms: 266, ladder: 334, look: 402 }, hold: { junior: 600 } };
// The hold's posts at the dock, as shares of the hold: past the junior's place, so nobody stands where the junior walks from the ladder.
const DOCK_HOLD_POSTS = [0.75, 0.95];
const DOCK_HOLD = { lag: 0.3, a: 0.2, bridge: 2, hold: 1, c: 0.6, seal: 1.2, sealAt: 0.6, clamps: 0.3, swing: 0.8 };  // seconds: the junior a step behind; the pauses after each beat; the seal put on; the clamps after the two are down, and their swing
const DOCK_REST = {
  lock: { name: 'stand', view: 'side', face: 1 },  // in the chamber, facing in
  front: { name: 'stand', view: 'front' },  // the inspector on the bridge with the slate
  turned: { name: 'stand', view: 'side', face: -1 },  // the inspector turned to the hand who came up
  count: { name: 'work', view: 'side', face: -1 },  // the junior at the crates
  hand: { name: 'stand', view: 'side', face: 1 },  // the hand by the inspector
};
const dockDeckOf = id => LAYOUTS.freighter.decks.findIndex(d => d.rooms.some(r => r.id === id));
const dockWell = () => LAYOUTS.freighter.well.x * LAYOUTS.freighter.width;

// A path's legs from its stops [{ x, dk }] (world x; between two stops on different decks a climb on the ladder, which the stops put the
// person at), each with its length and its start and end in seconds.
function dockLegs(stops) {
  const lay = LAYOUTS.freighter, out = [];
  let t = 0;
  for (let i = 1; i < stops.length; i++) {
    const a = stops[i - 1], b = stops[i], climb = a.dk !== b.dk, len = climb ? Math.abs(towerDeckY(lay, b.dk) - towerDeckY(lay, a.dk)) : Math.abs(b.x - a.x);
    out.push({ a, b, climb, len, t0: t, t1: (t += len / (climb ? DOCK_PACE.climb : DOCK_PACE.walk)) });
  }
  return out;
}
const dockTime = stops => { const l = dockLegs(stops); return l.length ? l[l.length - 1].t1 : 0; };
// The fractional deck at world y down the tower (towerDeckY's inverse).
function dockDeckAt(lay, y) {
  for (let k = 0; k < lay.decks.length - 1; k++) { const a = deckFloor(lay, k), b = deckFloor(lay, k + 1); if (y <= b) return k + Math.max(0, (y - a) / (b - a)); }
  return lay.decks.length - 1;
}
// Where someone is `t` seconds along `stops`: { x, dk, pose, moving }, walking side-on the way they go (the stride by the ground covered, as
// shiplife.js posture's), climbing at the ladder, or at the end in `rest`; before the start at the first stop in `from`. Reduced motion (still):
// at the end at once. A path with no rest is gone at its end: null.
function dockAlong(stops, t, rest, still, from = rest) {
  const legs = dockLegs(stops), end = stops[stops.length - 1], first = stops[0];
  if (still || t >= (legs.length ? legs[legs.length - 1].t1 : 0)) return rest ? { x: end.x, dk: end.dk, pose: rest, moving: false } : null;
  if (t < 0) return from ? { x: first.x, dk: first.dk, pose: from, moving: false } : null;
  let walked = 0;
  for (const g of legs) {
    if (t >= g.t1) { if (!g.climb) walked += g.len; continue; }
    const f = (t - g.t0) / (g.t1 - g.t0 || 1);
    if (g.climb) {
      const lay = LAYOUTS.freighter, ya = towerDeckY(lay, g.a.dk), y = ya + (towerDeckY(lay, g.b.dk) - ya) * f;
      return { x: g.a.x, dk: dockDeckAt(lay, y), pose: { name: 'climb', view: 'side', face: 1, frame: Math.floor(Math.abs(y - ya) / (DOCK_PACE.climb / POSTURES.climb.fps)) % POSTURES.climb.frames }, moving: true };
    }
    const x = g.a.x + (g.b.x - g.a.x) * f;
    return { x, dk: g.a.dk, pose: { name: 'walk', view: 'side', face: Math.sign(g.b.x - g.a.x) || 1, frame: Math.floor((walked + Math.abs(x - g.a.x)) / 10) % POSTURES.walk.frames }, moving: true };
  }
  return { x: end.x, dk: end.dk, pose: rest, moving: false };
}

// Where a role keeps its post at the dock: the room (the captain the bridge, the cat the engine room, a passenger the berths) and, of the `roles`
// who keep it (in order), the k-th's world x: a seat where the room has them (shiplife.js postSeat), else spread along it.
const dockRoomOf = role => (role === 'cat' ? 'engine' : role === 'passenger' ? 'berths' : postOf(role));
function dockPlace(room, roles, k) {
  const r = roomAt(room), seats = SEATS[room] || [], W = LAYOUTS.freighter.width;
  if (seats.length) return routineTarget({}, { at: 'post' }, r, postSeat(room, roles, k), roles.length, () => 0.5) * W;
  return dockSpread(room, r, k, roles.length) * W;
}
// The k-th of n places along a room with no seats, as a share of the width: spread along it, and in the hold past where the junior walks and counts.
function dockSpread(room, r, k, n) {
  const [a, b] = room === 'hold' ? DOCK_HOLD_POSTS : [0.15, 0.85];
  return r.x0 + r.w * (a + (b - a) * (n > 1 ? k / (n - 1) : 0.5));
}
// The hand's place at their post (handRole: the post's role; with none, the bridge): { room, x, dk }.
function dockPostSpot(handRole) {
  const role = handRole || 'captain', room = dockRoomOf(role);
  return { room, x: dockPlace(room, [role], 0), dk: roomAt(room).deck };
}
// The hand's way to the inspector on the bridge from their post.
function dockHandPath(handRole) {
  const s = dockPostSpot(handRole), to = { x: s.dk === 0 && s.x < DOCK_AT.bridge.insp ? DOCK_AT.bridge.comms : DOCK_AT.bridge.ladder, dk: 0 };
  return s.dk === 0 ? [s, to] : [s, { x: dockWell(), dk: s.dk }, { x: dockWell(), dk: 0 }, to];
}

// The timeline of both pages for the choice (`move` for the hand's move, else none) and the hand's post's role: each beat's paths and ends.
function dockPlan(choice, handRole) {
  const L = dockDeckOf('airlock'), HD = dockDeckOf('hold'), A = DOCK_AT, well = dockWell(), H = DOCK_HOLD, P = (x, dk) => ({ x, dk });
  const aI = [P(A.off, L), P(A.lock.insp, L)], aJ = [P(A.off, L), P(A.lock.junior, L)];
  const aEnd = Math.max(dockTime(aI), H.lag + dockTime(aJ)) + H.a;
  const bI = [P(A.lock.insp, L), P(well, L), P(well, 0), P(A.bridge.insp, 0)], bJ = [P(A.lock.junior, L), P(well, L), P(well, HD), P(A.hold.junior, HD)];
  const bBridge = aEnd + dockTime(bI) + H.bridge, bEnd = Math.max(bBridge, aEnd + dockTime(bJ)) + H.hold;
  const hand = choice === 'move' ? dockHandPath(handRole) : null, cEnd = hand ? dockTime(hand) + H.c : 0, dEnd = cEnd + H.seal;
  const eI = [P(A.bridge.insp, 0), P(well, 0), P(well, L), P(A.off, L)], eJ = [P(A.hold.junior, HD), P(well, HD), P(well, L), P(A.off, L)];
  const down = dEnd + Math.max(dockTime(eI), dockTime(eJ)), eEnd = down + H.clamps + H.swing;
  return { L, HD, aI, aJ, aEnd, bI, bJ, bBridge, bEnd, hand, cEnd, dEnd, eI, eJ, down, eEnd };
}

// What the dock shows on `page` ('open' or 'result') `t` seconds in, for the choice (`move`, `keep`, `nod`, `pay` or null) and the hand's post
// (a POSTS key, or null): the beat ('a' to 'e', or 'done' once the two have gone), where the camera looks ({ x, dk }), the inspector and the junior
// ({ x, dk, pose, carry, outside }, null once gone), the hand when the move takes them from their post (else null), the lock ({ open, lit }),
// how far the clamps have swung off (0 on, 1 off) and whether the hold is sealed. Pure: no G, no dice.
function dockBeats(page, t, choice, post, still) {
  const handRole = post ? POSTS[post].role : null, p = dockPlan(choice, handRole), A = DOCK_AT, R = DOCK_REST, H = DOCK_HOLD, along = (path, at, rest, from) => dockAlong(path, t - at, rest, still, from);
  const out = { beat: 'a', focus: null, insp: null, junior: null, hand: null, lock: { open: true, lit: false }, swing: 0, sealed: false };
  const atRest = (x, dk, pose) => ({ x, dk, pose, moving: false }), follow = (q, rest) => (q && q.moving ? { x: q.x, dk: q.dk } : rest);
  const moved = choice === 'move', bridge = { x: A.bridge.look, dk: 0 }, hold = { x: A.hold.junior, dk: p.HD }, lock = { x: A.gangway, dk: p.L };
  if (page !== 'result') {
    if (t < p.aEnd) {
      Object.assign(out, { beat: 'a', insp: along(p.aI, 0, R.lock, R.lock), junior: along(p.aJ, H.lag, R.lock, R.lock) });
      out.focus = { x: (out.insp.x + out.junior.x) / 2, dk: p.L };  // up the gangway with them
    } else {
      out.beat = 'b'; out.insp = along(p.bI, p.aEnd, R.front); out.junior = along(p.bJ, p.aEnd, R.count);
      out.focus = t < p.bBridge ? follow(out.insp, bridge) : hold;
    }
  } else {
    const side = moved ? Math.sign(p.hand[p.hand.length - 1].x - A.bridge.insp) : 0;  // which side of the inspector the hand comes to
    const hand = moved ? along(p.hand, 0, { ...R.hand, face: -side }) : null, inspAt = atRest(A.bridge.insp, 0, moved ? { ...R.turned, face: side } : R.front);
    out.hand = hand; out.sealed = t >= p.cEnd + H.sealAt;
    // (c): the camera between the hand and the inspector while both are on the bridge, so both stay clear of the page; on the ladder, with the hand
    if (moved && t < p.cEnd) Object.assign(out, { beat: 'c', insp: inspAt, junior: atRest(A.hold.junior, p.HD, R.count), focus: hand.dk === 0 ? { x: (hand.x + A.bridge.insp) / 2, dk: 0 } : { x: hand.x, dk: hand.dk } });
    else if (t < p.dEnd) Object.assign(out, { beat: 'd', insp: inspAt, junior: atRest(A.hold.junior, p.HD, R.count), focus: hold });
    else {
      out.insp = along(p.eI, p.dEnd, null); out.junior = along(p.eJ, p.dEnd, null);
      out.beat = out.insp || out.junior ? 'e' : 'done';
      const onLock = [out.insp, out.junior].filter(q => q && Math.abs(q.dk - p.L) < 0.01), mid = onLock.reduce((a, q) => a + q.x, 0) / (onLock.length || 1);
      out.focus = onLock.length ? { x: mid, dk: p.L } : out.insp ? follow(out.insp, lock) : lock;  // after them down to the lock deck, along it and out
      out.swing = still ? +(t >= p.down) : Math.max(0, Math.min(1, (t - p.down - H.clamps) / H.swing));
    }
  }
  const carry = (q, thing) => (q ? { ...q, carry: thing, outside: Math.abs(q.dk - p.L) < 0.01 && q.x < 0 } : null);
  out.insp = carry(out.insp, 'slate');
  out.junior = out.junior && carry(out.junior, out.junior.pose === R.count && (out.beat === 'b' || out.beat === 'c') ? 'slate' : 'seal');  // the slate to count by; the seal gun to seal with and between
  if (out.hand) out.hand.carry = post === 'comms' ? 'papers' : null;
  for (const q of [out.insp, out.junior, out.hand]) if (q && !q.moving) { const f = POSTURES[q.pose.name]; q.pose = { ...q.pose, frame: still ? 0 : Math.floor(t * f.fps) % f.frames }; }  // at rest: the posture's own frames by the page's clock
  out.lock.lit = [out.insp, out.junior].some(q => q && Math.abs(q.dk - p.L) < 0.01 && q.x > -24 && q.x < 100);  // the cycle lamp lit while they pass the chamber
  return out;
}

// The dock as the scene opens; a frame `dt` seconds later (the hand's post as the game holds it, reduced motion), the beat, the clamps and the
// seal read from dockBeats; and the result page after a choice (its `dock` tag, inspection.js). Pure: the caller keeps it in G.dock.
const dockOpened = () => ({ page: 'open', t: 0, clock: 0, choice: null, beat: 'a', clamps: true, sealed: false });
function dockStep(d, dt, post, still) {
  const n = { ...d, t: d.t + dt, clock: d.clock + dt }, b = dockBeats(n.page, n.t, n.choice, post, still);
  return { ...n, beat: b.beat, clamps: b.swing === 0, sealed: b.sealed };
}
const dockChose = (d, kind) => ({ ...d, page: 'result', t: 0, choice: kind || null });

// The ship's company at the dock, from `company` ([{ id, role, name }]: the hand first) placed at their posts, and the beats' people put in: the
// hand moved when the move takes them, the inspector (`official`: { id, name }) and the junior as visitors in the port's uniform. Each as drawCutaway
// draws people: x a share of the tower's width, dk a deck; a moving or posed one with its pose, a visitor with what it wears and carries (look,
// `trim` the port owner's colour).
function dockCast(company, handRole, v, official, trim, hurt = []) {  // hurt: the ids of those hurt (the hand 'you'), who lie in the medbay as on a burn
  const lay = LAYOUTS.freighter, W = lay.width, spot = dockPostSpot(handRole), rooms = new Map(), placed = [];
  const roomOf = p => (hurt.includes(p.id) ? 'medbay' : p.role === 'you' ? spot.room : dockRoomOf(p.role)), rank = p => (p.role === 'you' ? 0 : p.role === 'captain' ? 1 : 2);
  for (const p of company) { const room = roomOf(p); if (!rooms.has(room)) rooms.set(room, []); rooms.get(room).push(p); }
  for (const [room, list] of rooms) {
    if (room === 'medbay') {  // the hurt on the medbay's cot, as routineTarget lays them; the medic at the post
      const bed = list.filter(p => hurt.includes(p.id)), up = list.filter(p => !hurt.includes(p.id)), r = roomAt(room);
      bed.forEach((p, k) => { placed[company.indexOf(p)] = { ...p, room, x: routineTarget({}, { at: 'bed' }, r, k, bed.length, () => 0.5), dk: r.deck, tdk: r.deck, tx: null, block: 'shift', at: 'bed', face: 1, couch: 0, couchAt: null, station: null }; });
      if (!up.length) continue;
      list.splice(0, list.length, ...up);
    }
    const r = roomAt(room), them = [...list].sort((a, b) => rank(a) - rank(b)), roles = them.map(p => (p.role === 'you' ? handRole || 'captain' : p.role));
    const others = them.filter(p => p.role !== 'you'), slots = Array.from({ length: them.length }, (_, k) => dockPlace(room, roles, k));
    if (!(SEATS[room] || []).length && others.length < them.length) {  // a room with no seats: the hand at its middle, as dockPostSpot puts them, the rest spread either side
      const free = Array.from({ length: them.length }, (_, k) => dockSpread(room, r, k, them.length) * W);
      free.splice(free.reduce((b, x, i) => (Math.abs(x - spot.x) < Math.abs(free[b] - spot.x) ? i : b), 0), 1);
      others.forEach((p, k) => { slots[them.indexOf(p)] = free[k]; });
      slots[them.findIndex(p => p.role === 'you')] = spot.x;
    }
    them.forEach((p, k) => {
      const at = p.role === 'cat' || p.role === 'passenger' ? undefined : p.role === 'cook' ? 'stove' : 'post', x = at === 'stove' ? (r.x0 + r.w * 0.15) * W : slots[k];
      placed[company.indexOf(p)] = { ...p, room, x: x / W, dk: r.deck, tdk: r.deck, tx: null, block: 'shift', at, face: 1, couch: 0, couchAt: null, station: null };
    });
  }
  const out = placed.filter(Boolean);  // in the company's order, the hand first
  const put = (p, q) => Object.assign(p, { x: q.x / W, dk: q.dk, tdk: q.dk, pose: q.pose, outside: !!q.outside, look: { ...(p.look || {}), carry: q.carry || undefined } });
  const hand = out.find(p => p.role === 'you');
  if (hand && v.hand) put(hand, v.hand);
  const visit = (id, role, name, q, look) => { if (q) out.push(put({ id, role, name, visitor: true, color: DOCK_KHAKI, room: null, tx: null, look: { trim, ...look } }, q)); };
  visit(official.id, 'inspector', official.name, v.insp, { cap: { col: DOCK_CAP, band: trim } });
  visit('dock:junior', 'junior', '', v.junior, {});
  return out;
}

// The seal's colour on the crates: the port owner's, toned halfway to a grey, a step below the people (#959).
function dockSealTone(trim) {
  const n = parseInt(String(trim || '#8a8a8a').slice(1), 16), mix = (c, g) => Math.round((c + g) / 2);
  return `#${[mix(n >> 16, 0x5a), mix((n >> 8) & 255, 0x5a), mix(n & 255, 0x5a)].map(v => v.toString(16).padStart(2, '0')).join('')}`;
}

// The gangway's deck at world x, from the outer door's sill (y the lock deck's floor F) down to its far end.
const dockGangwayY = (sill, F, x) => F + DOCK_GANGWAY.drop * Math.max(0, Math.min(1, (sill - x) / DOCK_GANGWAY.len));

// Outside the hull at the dock, in world units (drawCutaway's frame, after the hull): the pad under the drive with the cradle's blocks, the
// clamps on the hull at two decks with their lamps (green on, red off) swung off by dock.swing, the outer door open, the gangway with its rails
// down to the boarding tower, and whoever is on it (dock.people with `outside`). Returns those drawn, with where a tap would find them.
function drawDockOutside(ctx, o, lay, deck, dock, zoom) {
  const W = lay.width, F = deck(dockDeckOf('airlock')).floor, sill = o.x0 - HULL_HATCH.depth, mouth = o.bottom + TOWER_BELL.h, mid = W / 2, x0 = -DOCK_OUT - 600, x1 = W + 600;
  const box = (x, y, w, h, fill, line = '#3a4e62') => { ctx.fillStyle = fill; ctx.fillRect(x, y, w, h); ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.strokeRect(x, y, w, h); };
  // the pad: a slab under the bell, its edge lit and striped, and the cradle's blocks either side of the bell
  box(x0, mouth, x1 - x0, 70, '#161c22', '#2a3644');
  ctx.fillStyle = '#26303a'; ctx.fillRect(x0, mouth, x1 - x0, 4);
  ctx.fillStyle = '#7a6a34'; for (let x = x0; x < x1; x += 28) ctx.fillRect(x, mouth + 7, 14, 3);
  for (const s of [-1, 1]) box(mid + s * (TOWER_BELL.mouth / 2 + 34) - 14, mouth - 34, 28, 34, '#2c3640');
  // the clamps at the berths' and life support's decks: an arm from the tower to a jaw on the skin, striped, its lamp; off, swung back from the hull
  const swing = dock.swing || 0, on = swing === 0;
  for (const k of [dockDeckOf('berths'), dockDeckOf('lifesupport')]) {
    const y = deck(k).top + HULL.deck * 0.55, gap = 60 * swing;
    for (const side of [-1, 1]) {
      const hx = side < 0 ? o.x0 - gap : o.x1 + gap, far = side < 0 ? x0 : x1, jx = side < 0 ? hx - 18 : hx;
      box(Math.min(far, hx + side * 18), y - 7, Math.abs(far - hx) - 18, 14, '#26323e');
      box(jx, y - 20, 18, 40, '#34424f');
      for (let i = 0; i < 4; i++) { ctx.fillStyle = i % 2 ? '#1a1e22' : '#8a7a3a'; ctx.fillRect(side < 0 ? jx + 14 : jx, y - 20 + i * 10, 4, 10); }  // the jaw's face on the skin, striped
      ctx.fillStyle = on ? '#5aff8a' : '#ff5a5a'; ctx.fillRect(jx + 7, y - 2, 4, 4);  // its lamp
    }
  }
  // the outer door open: the gap in the skin, the door swung out against the hull over it
  if (dock.lock && dock.lock.open) {
    ctx.fillStyle = '#2a2c26'; ctx.fillRect(sill, F - HULL_HATCH.height, HULL.skin + HULL_HATCH.depth, HULL_HATCH.height);
    box(sill - 7, F - HULL_HATCH.height - 3, 7, HULL_HATCH.height, '#2a3e54', '#4a6a8c');
  }
  // the gangway: its deck down from the sill, the edge striped; the rail and the mid rail on posts; the boarding tower at its far end
  const G2 = DOCK_GANGWAY, end = sill - G2.len, gy = x => dockGangwayY(sill, F, x);
  box(end - 40, gy(end) - 150, 40, mouth - gy(end) + 150, '#1e2832');
  for (let y = gy(end) - 140; y < mouth; y += 30) { ctx.strokeStyle = '#2e3c4a'; ctx.beginPath(); ctx.moveTo(end - 40, y); ctx.lineTo(end, y + 30); ctx.stroke(); }  // its bracing
  ctx.fillStyle = '#26303a'; ctx.strokeStyle = '#4a6a8c'; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(sill, F); ctx.lineTo(end, gy(end)); ctx.lineTo(end, gy(end) + 8); ctx.lineTo(sill, F + 8); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = '#8a7a3a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(sill, F + 1); ctx.lineTo(end, gy(end) + 1); ctx.stroke();
  ctx.strokeStyle = '#4e6a86'; ctx.lineWidth = 1.5;
  for (const h of [G2.rail, G2.rail / 2]) { ctx.beginPath(); ctx.moveTo(sill - 8, F - h); ctx.lineTo(end, gy(end) - h); ctx.stroke(); }
  for (let x = sill - 8; x > end; x -= G2.post) { ctx.beginPath(); ctx.moveTo(x, gy(x)); ctx.lineTo(x, gy(x) - G2.rail); ctx.stroke(); }
  // those on the gangway, in front of its rail, named under their feet as the people inside are
  const drawn = [];
  ctx.font = `600 12px ${roomFont}`;
  for (const p of dock.people.filter(q => q.outside)) {
    const x = p.x * W, y = gy(x), at = drawPerson(ctx, { x: p.x, deck: p.dk, ...p.pose }, x, y, { color: p.color, ...portraitLook({ id: p.id, name: p.name }), ...(p.look || {}) });
    if (p.name) worldText(ctx, zoom, p.name, x, y + 10, 12 / zoom, '#9fb4c9', 'center');
    drawn.push({ ...at, id: p.id });
  }
  return drawn;
}

// The bar over the ship at the dock: the ship at the dock and the port, and at the right the clamps and the owner's customs.
function dockBar(b, port, gov, clamps, aboard) {  // aboard: the customs still on the ship
  const label = px => `600 ${px}px ${LABEL_FONT}`, mono = px => `${px}px "IBM Plex Mono", monospace`, L = b.x + 14, R = b.x + b.w - 14;
  const put = (str, x, y, font, color, align = 'left', maxW = Infinity) => { ctx.font = font; ctx.fillStyle = color; ctx.textAlign = align; ctx.fillText(fitLine(str, maxW), x, y); };
  glassPanel(b.x, b.y, b.w, b.h);
  const half = (R - L) / 2 - 12;
  put(`${shipTitle().toUpperCase()} AT THE DOCK`, L, b.y + 22, label(12), '#7fb4ff', 'left', half);
  put(port, L, b.y + 46, label(18), '#e6f0ff', 'left', half);
  put(clamps ? 'CLAMPS ON' : 'CLAMPS OFF', R, b.y + 26, label(16), clamps ? '#8fd8a8' : '#ff8a7a', 'right', half);
  put(`${gov} customs ${aboard ? 'aboard' : 'ashore'}`, R, b.y + 46, mono(12), '#8fb0d0', 'right', half);
  ctx.textAlign = 'left';
}

// Whether the dock is drawn now: a scene staged at the dock is open at a port, and G.dock holds its state.
const dockShown = () => !!(G.dock && G.mode === 'landed' && G.dialog && G.dialog.event && G.dialog.event.stage === 'dock');
const dockPost = () => { const c = career(); return (role().hatch && c && c.post) || null; };  // as the inspector's scene reads it (inspection.js): an owner who kept a post only pays

// The view at the dock in place of the port screen while the inspection is open: the burn view's layout (burnlayout.js) with the scene's page in
// its dock, the stars still, the cutaway at the dock (drawCutaway's dock), and the bar. Leaves G.burnBoxes, as the burn view does.
function drawDockView(W, H) {
  const viewW = W - G.hudW, st = G.state, d = G.dock, panel = document.querySelector('#panel.event'), post = dockPost(), still = Settings.reduceMotion;
  const L = burnLayout(W, H, G.hudW, !G.hudW, panel ? { h: panel.scrollHeight + panel.offsetHeight - panel.clientHeight } : null);
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#03060f'); bg.addColorStop(1, '#070b18');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, viewW, H);
  drawStars({ x: 0, y: 0 }, viewW, H, { x: 0, y: 0 });
  const v = dockBeats(d.page, d.t, d.choice, post, still), gov = system().gov, trim = GOV_COLORS[gov], off = dockOfficial(currentPlanet());
  const company = [{ id: 'you', role: 'you', name: 'You' }, ...crewMembers().map(c => ({ id: c.id, role: c.role, name: c.first }))];
  const cap = hiredCaptain();
  if (cap) company.push({ id: cap.id, role: 'captain', name: cap.first });
  if (st.home && st.home.cat) company.push({ name: st.home.cat, role: 'cat' });
  const hurt = [...crewHurt(st), ...(handHurt() ? ['you'] : [])];
  const people = dockCast(company, post ? POSTS[post].role : null, v, { id: off.id, name: off.last }, trim, hurt);
  drawCutaway(L.ship, L.clear, {
    t: { to: st.systemId, days: 1, left: 0, total: 1, angle: -Math.PI / 2, flipped: false, event: G.dialog.event, elapsed: 0, marks: st.hullMarks || [] },
    people, focus: v.focus, clock: d.clock, sign: v.swing === 0 ? 'CLAMPS ON' : 'CLAMPS OFF', lock: v.lock, seal: v.sealed ? dockSealTone(trim) : null, swing: v.swing,
  });
  G.burnBoxes = { bar: L.bar, ship: L.ship, ...(L.dock ? { dock: L.dock, clear: L.clear } : {}) };
  dockBar(L.bar, st.planet, gov, v.swing === 0, v.beat !== 'done');
}

Mods.register({
  id: 'dock', name: 'The inspection at the dock', builtin: true,
  init(M) {
    M.on('eventOpened', ev => { if (ev.stage === 'dock' && G.mode === 'landed') { G.dock = dockOpened(); G.cam = null; } else G.dock = null; });  // the camera snaps to the dock; any other scene ends one left over
    M.on('stateReady', () => { G.dock = null; });  // a new game or a load (startGame, loadGame) drops a scene without closing it
    M.on('frame', dt => { if (dockShown()) G.dock = dockStep(G.dock, dt, dockPost(), Settings.reduceMotion); });
  },
});
