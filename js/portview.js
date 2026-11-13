'use strict';

// The port view (#1101, docs/bible/ports.md, the reference frame docs/bible/ports-target.png): a cutaway of the part of a port a crew uses, drawn the way
// the burn view draws the ship (js/rooms.js: rooms as boxes in depth, warm light in a cold structure, wear where people go). A port that has one gets a
// tall view strip in place of the painted backdrop (bridge.js drawViewscreen); the rest keep theirs. Its people keep the port's hours (#1102, ports.md, How a
// port runs): who is where at an hour is portCast, from the layout's `folk` (the port's own people, the same on every visit) and its `hours`.
// A port is data, as the ship's layout is (LAYOUTS, layouts.js): its levels (the floor of each, in world units, outermost first) and its rooms, each a
// kind drawn by PORT_ROOMS with its own extent and words; the next port is new data and, where it has new kinds of room, new drawers. Pure drawing:
// no state read but the clock, no randomness.

// Lagos Ring (docs/bible/ports.md): a slice of the rim, three levels deep, the outermost at half a g. The rim is 200 m in radius, 10,000 world units
// (a person stands 85): over the slice the floor rises a few units at each end, too little to read, so `curve` draws it twice over; more, and the rooms
// (each a straight box set on the curve) step apart.
const PORT_LAYOUTS = {
  Earth: {
    place: 'Lagos Ring', section: 'Rim, section 14', berth: 'Berth 6, hub',
    width: 860, radius: 10000, curve: 2, spokeX: 58,
    levels: [300, 186, 72],
    rooms: [
      { id: 'lift', label: 'Lift', level: 0, x0: 0, x1: 120, kind: 'lift' },
      { id: 'market', label: 'Market', level: 0, x0: 120, x1: 520, kind: 'market' },
      { id: 'bar', label: 'The Gravity Well', level: 0, x0: 520, x1: 860, kind: 'bar' },
      { id: 'yard', label: 'Yard offices', level: 1, x0: 0, x1: 420, kind: 'yard' },
      { id: 'clinic', label: 'Clinic', level: 1, x0: 420, x1: 860, kind: 'clinic' },
      { id: 'bunks', label: 'Bunkrooms', level: 2, x0: 0, x1: 860, kind: 'bunks' },
    ],
    // The port's own people (ports.md, Who is there): where each works and the hours they keep (an hour past 24 is after midnight). Ngozi is Tomas's
    // sister (lagos.md), with her food bay; the rest are made from the port's culture the first time, the same face on every visit.
    folk: [
      { key: 'ngozi', first: 'Ngozi', last: 'Achebe', job: 'food bay', room: 'market', x: 215, name: 'work', view: 'back', hours: [6, 21] },
      { key: 'repairer', job: 'repair bay', room: 'market', x: 490, name: 'work', view: 'back', hours: [8, 18] },
      { key: 'keeper', job: 'keeper of the Gravity Well', room: 'bar', x: 700, name: 'stand', view: 'front', hours: [11, 26] },
      { key: 'clerk', job: 'yard clerk', room: 'yard', x: 345, name: 'work-sit', view: 'side', face: -1, hours: [7, 19] },
      { key: 'nurse', job: 'clinic nurse', room: 'clinic', x: 540, name: 'stand', view: 'front', hours: [8, 20] },
    ],
    // The place's hours: the yard's shift changes fill the lift lobby, the hiring boards draw contract workers by day, the Gravity Well's stools and the
    // spaces along its wall seat the bar's patrons while it is open, and the ship's crew ashore are in the market by day and at the bar after it.
    shifts: [6, 14, 22],
    spots: {
      lobby: [{ room: 'lift', x: 18 }, { room: 'lift', x: 104 }, { room: 'lift', x: 8 }],
      boards: [{ room: 'yard', x: 90, view: 'back' }, { room: 'yard', x: 200, view: 'back' }, { room: 'yard', x: 255 }],
      stools: [{ room: 'bar', x: 660, name: 'sit', view: 'side', face: 1 }, { room: 'bar', x: 740, name: 'sit', view: 'side', face: -1 }, { room: 'bar', x: 620, name: 'sit', view: 'side', face: 1 }, { room: 'bar', x: 790, name: 'sit', view: 'side', face: -1 }, { room: 'bar', x: 560 }, { room: 'bar', x: 835 }],
      market: [{ room: 'market', x: 300 }, { room: 'market', x: 352 }, { room: 'market', x: 240, name: 'sit', view: 'side', face: -1 }],
      clinic: [{ room: 'clinic', x: 690, name: 'sit' }, { room: 'clinic', x: 760, name: 'sit' }],
    },
  },
};
const PORT_NIGHT = 22, PORT_MORNING = 7;  // the view's clock stops at night (ports.md, The port's clock), and a night passed in port wakes at seven
const portOpen = (hours, hour) => { const [a, b] = hours, h = b > 24 && hour < a ? hour + 24 : hour; return h >= a && h < b; };
const portDark = hour => hour >= 21 || hour < 6;  // the rim's lights down: Lagos's night
// The hour at a landing (ports.md): the port's own dice, from the port and the day, so it moves no other system's rolls; a morning, a day or an evening.
const arrivalHour = (planet, day) => 8 + (Math.abs(hash(`${planet.name}|${day}|arrive`)) % 120) / 10;

// Who is on the view at `hour` (pure: the layout, the hour, the bar's patrons and the ship's crew ashore, each { id, first, role }, and the day for the port's dice):
// a list of { who, room, x, name, view, face, kind } where kind is 'folk' (the port's own), 'patron', 'worker' or 'crew'. Nobody is drawn twice.
function portCast(layout, hour, patrons, crew, day) {
  const out = [], seed = k => Math.abs(hash(`${layout.place}|${day}|${Math.floor(hour)}|${k}`)), take = (list, n) => list.slice(0, Math.max(0, Math.min(n, list.length)));
  for (const f of layout.folk) if (portOpen(f.hours, hour)) out.push({ who: f.key, room: f.room, x: f.x, name: f.name, view: f.view, face: f.face || 1, kind: 'folk' });
  const keeper = layout.folk.find(f => f.room === 'bar'), barOpen = !keeper || portOpen(keeper.hours, hour);
  const s = layout.spots;
  if (barOpen) take(patrons, hour >= 17 || hour < 2 ? s.stools.length : 2).forEach((p, i) => out.push({ who: p.id, room: s.stools[i].room, x: s.stools[i].x, name: s.stools[i].name || 'stand', view: s.stools[i].view || 'front', face: s.stools[i].face || 1, kind: 'patron' }));
  const nearShift = layout.shifts.some(h => Math.abs(hour - h) < 1 || Math.abs(hour - h + 24) < 1);
  if (nearShift) take(s.lobby, 1 + (seed('lobby') % s.lobby.length)).forEach((sp, i) => out.push({ who: `worker:lobby:${i}`, room: sp.room, x: sp.x, name: 'stand', view: 'front', face: 1, kind: 'worker' }));
  if (hour >= 8 && hour < 18) take(s.boards, 1 + (seed('boards') % s.boards.length)).forEach((sp, i) => out.push({ who: `worker:boards:${i}`, room: sp.room, x: sp.x, name: 'stand', view: sp.view || 'front', face: 1, kind: 'worker' }));
  if (hour >= 9 && hour < 19 && seed('clinic') % 2) take(s.clinic, 1).forEach((sp, i) => out.push({ who: `worker:clinic:${i}`, room: sp.room, x: sp.x, name: sp.name, view: 'front', face: 1, kind: 'worker' }));
  const ashore = hour >= 18 && barOpen ? s.stools.slice(Math.min(patrons.length, s.stools.length)) : hour >= 9 && hour < 18 ? s.market : [];
  take(crew, Math.min(ashore.length, 1 + (seed('crew') % 2))).forEach((c, i) => out.push({ who: c.id, room: ashore[i].room, x: ashore[i].x, name: ashore[i].name || 'stand', view: ashore[i].view || 'front', face: ashore[i].face || 1, kind: 'crew', role: c.role }));
  return out;
}

// The port's own people as records, made the first time from the port's culture by a dice stream of the port's own (official.js seededRandom), kept by
// port and key in st.portFolk, so they remember and are the same on every visit; marked `portFolk` so the bar keeps them off its stools (bar.js).
function portFolkPerson(planet, f) {
  const st = G.state, ids = (st.portFolk = st.portFolk || {})[planet.name] = (st.portFolk[planet.name] || {});
  let p = ids[f.key] && st.people[ids[f.key]];
  if (p) return p;
  const real = Math.random;
  Math.random = seededRandom(Math.abs(hash(`${planet.name} ${f.key}`)));
  try { p = makePerson(cultureOf(st.systemId)); } finally { Math.random = real; }
  Object.assign(p, { job: f.job, location: planet.name, portFolk: planet.name }, f.first ? { first: f.first, last: f.last } : {});
  registerPerson(p);
  ids[f.key] = p.id;
  return p;
}
const portLayout = planet => (planet && PORT_LAYOUTS[planet.name]) || null;

// ---------- the parts the rooms are made of ----------
const portPlate = (ctx, x, y, w, col = '#7a8a96') => { roomPart(ctx, roomRound(x, y, w, 5, 0.6), col, { top: 0.5 }); roomFlat(ctx, x + 1.5, y + 2, w - 3, 0.7, '#3a4650'); };  // a lease or name plate
// A warm lamp under the ceiling and the pool of light it makes (look.md rule 10).
function portLamp(ctx, x, y, rad, a = 0.42) {
  const g = ctx.createRadialGradient(x, y, 2, x, y + rad * 0.4, rad);
  g.addColorStop(0, `rgba(255,196,120,${a})`); g.addColorStop(1, 'rgba(255,196,120,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y + rad * 0.4, rad, 0, Math.PI * 2); ctx.fill();
  roomFlat(ctx, x - 6, y - 2, 12, 3, '#d8b070');
}
// Wear where people go: a scuff on the floor strip, a stain down a wall, a panel patched with a plate that does not match (look.md rule 9).
function portScuff(ctx, x, F, w) {
  ctx.fillStyle = 'rgba(4,8,12,0.35)'; ctx.beginPath(); ctx.ellipse(x, F - 4, w, 3, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(120,140,160,0.08)'; ctx.beginPath(); ctx.ellipse(x + w * 0.3, F - 5, w * 0.5, 1.5, 0, 0, Math.PI * 2); ctx.fill();
}
function portStain(ctx, x, y, w, h) { const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, 'rgba(60,40,20,0.35)'); g.addColorStop(1, 'rgba(60,40,20,0)'); ctx.fillStyle = g; ctx.fillRect(x, y, w, h); }
function portPatch(ctx, x, y, w, h) {
  roomOnWall(ctx, x, y + h, () => {
    roomPart(ctx, roomRound(x, y, w, h, 0.5), '#2a3644', { top: 0.6, side: 1 });
    for (const [px, py] of [[x + 2, y + 2], [x + w - 2, y + 2], [x + 2, y + h - 2], [x + w - 2, y + h - 2]]) roomDot(ctx, px, py, 0.6, '#5a6a7a');
  });
}
function portMug(ctx, x, y) { roomPart(ctx, roomRound(x, y - 6, 5, 6, 1), '#c8c0b0', { top: 0.5 }); ctx.strokeStyle = '#c8c0b0'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x + 5.5, y - 3, 1.8, -1.2, 1.2); ctx.stroke(); }
// A bay rented in the wall (ports.md, the market): a steel frame with the shutter's housing over it, the lease plate on the frame, the permit card for the year
// in the corner, and a counter in front; shut, its shutter is down. What is inside is the tenant's, drawn by the caller.
function portBay(ctx, x0, w, F, shut) {
  roomPart(ctx, roomRound(x0 - 3, F - 90, w + 6, 90, 1), '#2c3a48', { top: 1, side: 2, solid: 0.15 });
  roomPart(ctx, roomRound(x0, F - 84, w, 74, 0.5), '#0e1824', { top: 0 });
  roomPart(ctx, roomRound(x0 - 3, F - 92, w + 6, 9, 1), '#3a4858', { top: 1, under: 1 });
  portPlate(ctx, x0 + 4, F - 90, 22);
  roomPart(ctx, roomRound(x0 + w - 13, F - 80, 10, 13, 0.4), '#d8d0b8', { top: 0 });
  if (shut) { for (let y = F - 82; y < F - 2; y += 4) roomFlat(ctx, x0, y, w, 3, '#46505a'); roomFlat(ctx, x0 + w / 2 - 3, F - 6, 6, 3, '#2a3036'); return; }
  roomPart(ctx, roomRound(x0 - 2, F - 32, w + 4, 32, 1), '#3a4652', { top: 1.2, under: 1, solid: 0.35 });
}
// Earth as it goes by under the Ring, once every forty seconds (one turn at 1.5 a minute): `turn` is 0 to 1 through a turn.
function portEarth(ctx, cx, cy, r, turn) {
  const g = ctx.createRadialGradient(cx, cy, r * 0.92, cx, cy, r * 1.04);
  g.addColorStop(0, '#244a7a'); g.addColorStop(0.85, '#3a7bd5'); g.addColorStop(0.93, '#8fc4f0'); g.addColorStop(1, 'rgba(143,196,240,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r * 1.04, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(240,244,248,0.18)';
  for (const [dx, dy, rx] of [[-0.25, -0.86, 0.14], [0.12, -0.9, 0.09], [0.4, -0.82, 0.18]]) { ctx.beginPath(); ctx.ellipse(cx + (dx + turn * 0.6 - 0.3) * r, cy + dy * r, rx * r, r * 0.016, -0.15, 0, Math.PI * 2); ctx.fill(); }
}

// ---------- the rooms, by kind: each draws inside its box (r, its floor F), its words its own ----------
const PORT_ROOMS = {
  lift(ctx, r, F) {  // the spoke lift's lobby: the car's doors, the call panel, the arcology's mark over the doors
    roomPart(ctx, roomRound(30, F - 92, 56, 92, 1), '#2a3a4a', { top: 1, side: 2 });
    for (const x of [33, 59]) roomPart(ctx, roomRound(x, F - 88, 24, 88, 0.5), '#46586a', { top: 0 });
    roomFlat(ctx, 57, F - 88, 2, 88, '#11181f');
    roomPart(ctx, roomRound(92, F - 60, 10, 16, 1), '#3a4a58', { top: 0.6 }); roomDot(ctx, 97, F - 55, 1.6, '#e0a040'); roomDot(ctx, 97, F - 49, 1.6, '#5a6a74');
    portPlate(ctx, 34, F - 98, 48, '#8a7a5a');
    portScuff(ctx, 58, F, 30); portPatch(ctx, 4, F - 70, 18, 22);
  },
  market(ctx, r, F, time, open = {}) {  // bays rented in the wall: Ngozi's food bay, a bay between tenants, a repair bay; the port in the floor. A bay is shut outside its keeper's hours
    portLamp(ctx, 200, F - 98, 70); portLamp(ctx, 330, F - 98, 60, 0.3); portLamp(ctx, 450, F - 98, 70);
    portScuff(ctx, 200, F, 50); portScuff(ctx, 330, F, 40); portScuff(ctx, 430, F, 30); portStain(ctx, 150, F - 84, 40, 30);
    portBay(ctx, 140, 110, open.ngozi === false);
    if (open.ngozi !== false) roomScreen(ctx, 150, F - 76, 34, 18, 'nav', time);
    if (open.ngozi !== false) {
      roomPart(ctx, roomRound(196, F - 54, 40, 4, 1), '#4a4e52', { top: 0.8 });
      roomPart(ctx, roomRound(200, F - 62, 16, 8, 2), '#5a5a5e', { top: 1 }); roomPart(ctx, roomRound(220, F - 63, 14, 9, 2), '#6a5040', { top: 1 });
      portLamp(ctx, 195, F - 84, 40, 0.3);
    }
    for (const sx of [160, 240]) roomStool(ctx, sx, F, 0);
    // the port in the floor, with the stars and Earth going by
    ctx.save(); ctx.beginPath(); ctx.ellipse(320, F - 4, 34, 4.5, 0, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = '#02040a'; ctx.fillRect(280, F - 10, 80, 12);
    const turn = Settings.reduceMotion ? 0.5 : (time / 40) % 1, ex = 290 + turn * 80;
    const g = ctx.createRadialGradient(ex, F + 30, 6, ex, F + 30, 36); g.addColorStop(0.7, '#3a7bd5'); g.addColorStop(0.95, '#9fd0ff'); g.addColorStop(1, 'rgba(159,208,255,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(ex, F + 30, 36, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = '#5a6a7a'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(320, F - 4, 34, 4.5, 0, 0, Math.PI * 2); ctx.stroke();
    portBay(ctx, 380, 56, true);
    portBay(ctx, 450, 60, open.repairer === false);
    if (open.repairer !== false) for (let k = 0; k < 8; k++) roomPart(ctx, roomRound(454 + (k % 4) * 13, F - 80 + Math.floor(k / 4) * 12, 11, 9, 0.5), ['#3a5a6a', '#5a4a3a'][k % 2], { top: 0.5 });
    if (open.repairer !== false) { roomFlat(ctx, 470, F - 54, 1.5, 16, '#6a747c'); roomPart(ctx, roomRound(466, F - 40, 10, 5, 1), '#c8b070', { top: 0.6 }); portLamp(ctx, 471, F - 42, 22, 0.35); }
  },
  bar(ctx, r, F) {  // the Gravity Well: the copper counter, its stools, the posters and the shelf of bottles
    portLamp(ctx, 600, F - 98, 60, 0.3); portLamp(ctx, 700, F - 98, 60, 0.3); portLamp(ctx, 800, F - 98, 50, 0.2);
    roomOnWall(ctx, 560, F - 50, () => {
      for (const [px, c] of [[548, '#a0503a'], [600, '#3a6a8a'], [770, '#8a7a3a'], [820, '#5a3a6a']]) { roomPart(ctx, roomRound(px, F - 86, 30, 40, 0.5), c, { top: 0, side: 1.5 }); roomFlat(ctx, px + 4, F - 80, 22, 18, '#d8c8a0'); }
      for (let k = 0; k < 10; k++) roomPart(ctx, roomRound(660 + k * 9, F - 72 - (k % 3) * 2, 6, 18 + (k % 3) * 2, 2), ['#4a7a4a', '#8a5a2a', '#c8c0a0'][k % 3], { top: 0.5 });
      roomFlat(ctx, 654, F - 52, 100, 2, '#5a4a3a');
    });
    portScuff(ctx, 660, F, 60); portScuff(ctx, 770, F, 40); portStain(ctx, 540, F - 96, 30, 40); portPatch(ctx, 840, F - 64, 14, 30);
    roomPart(ctx, roomRound(600, F - 40, 210, 40, 1.5), '#5a3a26', { top: 0, solid: 0.45 });
    roomPart(ctx, roomRound(596, F - 44, 218, 6, 1), '#b87333', { top: 1.5, under: 1, solid: 0.5, shadow: false });
    for (const mx of [612, 650, 735, 760, 800]) portMug(ctx, mx, F - 44);
    for (const sx of [620, 660, 740, 790]) roomStool(ctx, sx, F, 0);
  },
  yard(ctx, r, F, time) {  // the agencies' hiring boards, and the yard's own desk where a refit is signed
    portLamp(ctx, 150, F - 98, 60, 0.18); portLamp(ctx, 320, F - 98, 60, 0.18);
    roomPinboard(ctx, 40, F, 120); roomPinboard(ctx, 170, F, 90);
    portPlate(ctx, 60, F - 92, 70, '#8a7a5a'); portPlate(ctx, 180, F - 92, 60, '#7a8a5a');
    portScuff(ctx, 100, F, 50); portScuff(ctx, 220, F, 40); portPatch(ctx, 260, F - 90, 22, 16);
    roomPart(ctx, roomRound(300, F - 30, 90, 30, 1), '#2e3e50', { top: 1, solid: 0.4 });
    roomScreen(ctx, 330, F - 58, 30, 22, 'nav', time);
    for (const [px, py, a] of [[306, F - 31, 0.1], [312, F - 32, -0.08]]) { ctx.save(); ctx.translate(px, py); ctx.rotate(a); roomFlat(ctx, 0, 0, 14, 1.4, '#d8d0c0'); ctx.restore(); }
    portMug(ctx, 372, F - 30);
  },
  clinic(ctx, r, F) {  // under contract: the counter and its window, the notice, the bench to wait on
    portLamp(ctx, 640, F - 98, 70, 0.15);
    roomPart(ctx, roomRound(470, F - 40, 150, 40, 1), '#2a3a48', { top: 1, solid: 0.3 });
    roomPart(ctx, roomRound(470, F - 84, 150, 34, 1), 'rgba(140,190,220,0.15)', {});
    portPlate(ctx, 510, F - 92, 70, '#5a8a9a');
    roomOnWall(ctx, 700, F - 60, () => { roomPart(ctx, roomRound(690, F - 88, 26, 32, 0.4), '#c8d8d8', { top: 0 }); for (let l = 0; l < 4; l++) roomFlat(ctx, 694, F - 82 + l * 6, 18, 1.2, '#5a7a8a'); });
    roomBench(ctx, 660, 820, F, true);
    portScuff(ctx, 740, F, 50); portScuff(ctx, 540, F, 30);
  },
  bunks(ctx, r, F) {  // the agency berths, three high, held as long as the contract: some curtained, a few with photos under a reading lamp, a bag on the floor
    portLamp(ctx, 200, F - 98, 40, 0.12); portLamp(ctx, 640, F - 98, 40, 0.12);
    for (let k = 0; k < 18; k++) roomBunk(ctx, berthBunk(r, 18, k), F, false, k % 5 === 3, 0);
    for (const k of [0, 4, 10]) { const b = berthBunk(r, 18, k); for (let q = 0; q < 3; q++) roomFlat(ctx, b.x + 10 + q * 7, b.y - 20, 5, 6, ['#a09a8c', '#8a9a7a', '#9a8a7a'][q]); portLamp(ctx, b.x + 8, b.y - 24, 18, 0.35); }
    roomPart(ctx, roomRound(470, F - 14, 22, 14, 3), '#4a5a3a', { top: 1 }); portScuff(ctx, 430, F, 60);
  },
};

// The view at `planet` into a canvas context g of w by h px: the frame's bar along the top (the section, the berth), the spoke rising to the hub, the
// rooms on the rim's curve, its outer hull, and Earth going by under it. `time` is ms (performance.now). Text is 12 px or more (#265).
const PORT_BAR = 30;
function drawPortView(g, w, h, layout, time, hour = 12, cast = [], look = () => ({})) {
  const top = Math.min(...layout.levels) - 100, bottom = Math.max(...layout.levels) + HULL.plate, R = layout.radius, cx0 = layout.width / 2;
  const zoom = Math.min(w / layout.width, (h - PORT_BAR - 40) / (bottom - top + 40)), ox = (w - layout.width * zoom) / 2, oy = PORT_BAR + 30 * zoom - top * zoom;
  const sag = x => layout.curve * (x - cx0) * (x - cx0) / (2 * R), X = x => ox + x * zoom, turn = Settings.reduceMotion ? 0.5 : (time / 40000) % 1;
  g.fillStyle = '#02050b'; g.fillRect(0, 0, w, h);
  for (let k = 0; k < 90; k++) { const x = (Math.sin(k * 12.9898) * 0.5 + 0.5) * w, y = PORT_BAR + (Math.sin(k * 78.233) * 0.5 + 0.5) * (h - PORT_BAR); g.fillStyle = `rgba(220,230,240,${0.25 + (k % 3) * 0.2})`; g.fillRect(x, y, 1.4, 1.4); }
  const hull = oy + bottom * zoom;  // the outer hull's line at the slice's middle
  portEarth(g, w * (0.45 + turn * 0.3), hull + w * 0.62, w * 0.6, turn);
  // the outer hull under the floor, following the rim's curve
  g.fillStyle = '#0b1420'; g.beginPath();
  for (let x = 0; x <= w; x += 16) { const wx = (x - ox) / zoom; g[x ? 'lineTo' : 'moveTo'](x, hull + (4 - sag(wx)) * zoom); }
  for (let x = w; x >= 0; x -= 16) { const wx = (x - ox) / zoom; g.lineTo(x, hull - (14 + sag(wx)) * zoom); }
  g.closePath(); g.fill();
  g.strokeStyle = '#34506e'; g.lineWidth = 2; g.beginPath();
  for (let x = 0; x <= w; x += 16) { const wx = (x - ox) / zoom; g[x ? 'lineTo' : 'moveTo'](x, hull + (4 - sag(wx)) * zoom); }
  g.stroke();
  // the spoke's tube rising from the lift toward the hub, its rail inside
  const sx = X(layout.spokeX), sTop = oy + (top - sag(layout.spokeX)) * zoom;
  g.fillStyle = '#0b1420'; g.fillRect(sx - 28 * zoom, PORT_BAR, 56 * zoom, sTop - PORT_BAR); g.strokeStyle = '#34506e'; g.lineWidth = 2; g.strokeRect(sx - 28 * zoom, PORT_BAR, 56 * zoom, sTop - PORT_BAR);
  g.fillStyle = '#4a6a8c'; g.fillRect(sx - 2, PORT_BAR, 4, sTop - PORT_BAR);
  // the rooms, each on the curve: dropped by the sag at its middle and turned by the slope there
  g.save(); g.translate(ox, oy); g.scale(zoom, zoom);
  for (const rm of layout.rooms) {
    const F = layout.levels[rm.level], mid = (rm.x0 + rm.x1) / 2, a = layout.curve * (mid - cx0) / R, r = { x0: rm.x0, x1: rm.x1, top: F - 100, floor: F };
    g.save(); g.translate(mid, F - sag(mid)); g.rotate(-a); g.translate(-mid, -F);
    g.beginPath(); g.rect(r.x0, r.top, r.x1 - r.x0, 100 + HULL.plate); g.clip();  // a room's things stay in its box
    const open = Object.fromEntries(layout.folk.map(f => [f.key, portOpen(f.hours, hour)]));
    roomIn([r], () => {
      roomShell(g, r); PORT_ROOMS[rm.kind](g, r, F, time / 1000, open);  // the rooms' own clock is seconds, as the burn view's
      for (const c of cast.filter(c => c.room === rm.id)) {  // the people in this room, in their postures (figures.js), each as look gives them
        const frames = POSTURES[c.name].frames, fps = POSTURES[c.name].fps, frame = fps ? Math.floor(time / 1000 * fps + c.x) % frames : 0;
        drawPerson(g, { name: c.name, view: c.view, face: c.face, frame }, c.x, F - (c.name === 'work' || c.name === 'work-sit' ? 2 : 0), look(c));
      }
      if (portDark(hour) && rm.id !== 'bar') { g.fillStyle = 'rgba(2,5,10,0.5)'; g.fillRect(r.x0, r.top, r.x1 - r.x0, 100); }  // the rim's lights down; the bar's stay up
    });
    g.restore();
  }
  g.restore();
  // the room names on their plates, and the frame's bar, at screen size
  g.font = `600 12px ${roomFont}`; g.textBaseline = 'alphabetic';
  for (const rm of layout.rooms) {
    const F = layout.levels[rm.level], x = X(rm.x0) + 6, y = oy + (F - 100 - sag((rm.x0 + rm.x1) / 2)) * zoom + 18, name = rm.label.toUpperCase(), tw = g.measureText(name).width;
    g.fillStyle = 'rgba(6,13,22,0.85)'; g.fillRect(x - 4, y - 13, tw + 8, 17); g.fillStyle = '#7f97b0'; g.fillText(name, x, y);
  }
  g.fillStyle = 'rgba(8,14,22,0.92)'; g.fillRect(0, 0, w, PORT_BAR);
  g.font = `600 13px ${roomFont}`; g.fillStyle = '#7f95ab';
  g.fillText(`${layout.place.toUpperCase()}  -  ${layout.section.toUpperCase()}`, 16, 20);
  const berth = layout.berth.toUpperCase(); g.fillText(berth, w - 16 - g.measureText(berth).width, 20);
  const hh = Math.floor(hour) % 24, mm = Math.floor((hour % 1) * 6) * 10, clock = `LAGOS TIME ${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  g.fillText(clock, (w - g.measureText(clock).width) / 2, 20);
}

// The view's people and clock, from the game (the one place that reads G): the port's own records, the bar's patrons and the ship's crew ashore, and the hour.
// The hour runs while the port is on screen with nothing open, at the burn view's pace (a day in SHIP_DAY seconds), and stops at night (ports.md).
const CIVIL = ['#8a6a4a', '#5a6a5a', '#7a5a6a', '#6a7a8a', '#9a8a6a', '#5a5a6a', '#8a4a3a', '#4a6a7a'];  // the port's own wear their own colours, not a ship's
function portViewNow(planet, layout) {
  const st = G.state, hour = G.portHour === null ? arrivalHour(planet, st.day) : G.portHour;
  const folk = Object.fromEntries(layout.folk.map(f => [f.key, portFolkPerson(planet, f)]));
  const patrons = (G.patrons || []).filter(x => !x.cast).map(x => ({ id: `patron:${x.p.id || x.p.first}`, p: x.p }));
  const crew = st.crew.map(person).filter(c => c && c.id && !c.dead).map(c => ({ id: c.id, role: c.role, p: c }));
  const byId = Object.fromEntries([...patrons, ...crew].map(x => [x.id, x.p]));
  const cast = portCast(layout, hour, patrons, crew, st.day);
  const look = c => {
    const p = c.kind === 'folk' ? folk[c.who] : byId[c.who], id = p ? p.id || `${p.first}${p.last}` : c.who;
    return { color: c.kind === 'crew' ? ROLE_COLORS[c.role] || '#9aa7b5' : CIVIL[Math.abs(hash(String(id))) % CIVIL.length], ...portraitLook({ id }) };
  };
  return { hour, cast, look };
}

Mods.register({
  id: 'portview', name: 'The port view', builtin: true,
  init(M) {
    M.on('landed', planet => { G.portHour = portLayout(planet) ? arrivalHour(planet, G.state.day) : null; });
    M.on('newDay', () => { if (G.portHour !== null) G.portHour = PORT_MORNING; });  // a night passed in port
    M.on('frame', dt => { if (G.mode === 'landed' && !G.dialog && G.portHour !== null && G.portHour < PORT_NIGHT) G.portHour = Math.min(PORT_NIGHT, G.portHour + (dt || 0) * 24 / SHIP_DAY); });
  },
});
