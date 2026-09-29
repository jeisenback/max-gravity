'use strict';

// Life aboard during a burn: a cutaway of your ship in place of the outside view,
// with you, your crew, and your passengers moving between the engine room, hold,
// berths, galley, and bridge. Everyone is strapped in for the hard burns at each end
// and floats at the flip. Crew doing something visible sometimes says so on comms.
// Once before the flip and once after, you can pick a downtime activity. Loaded
// before game.js; only calls into it at runtime.

// Rooms from stern to bow, as shares of the ship's length.
const ROOMS = [
  { id: 'engine', name: 'Engine', w: 0.17 },
  { id: 'hold', name: 'Hold', w: 0.29 },
  { id: 'berths', name: 'Berths', w: 0.21 },
  { id: 'galley', name: 'Galley', w: 0.17 },
  { id: 'bridge', name: 'Bridge', w: 0.16 },
];
let acc = 0;
for (const r of ROOMS) { r.x0 = acc; acc += r.w; r.x1 = acc; r.mid = (r.x0 + r.x1) / 2; }
const roomAt = id => ROOMS.find(r => r.id === id);

// Where each kind of person likes to spend a burn.
const HAUNTS = {
  you: { bridge: 4, galley: 2, hold: 1, engine: 1, berths: 1 },
  engineer: { engine: 5, galley: 2, berths: 1 },
  pilot: { bridge: 5, galley: 2, berths: 1 },
  gunner: { hold: 2, bridge: 2, galley: 2, berths: 1 },
  quartermaster: { hold: 5, galley: 2, berths: 1 },
  slicer: { bridge: 3, berths: 2, galley: 2 },
  medic: { berths: 3, galley: 2, hold: 1 },
  passenger: { berths: 4, galley: 3 },
};
const ROLE_COLORS = { you: '#ffffff', engineer: '#ffa24a', pilot: '#6fb0ff', gunner: '#ff6b5a', quartermaster: '#f0d060', slicer: '#c08cff', medic: '#6fd08c', passenger: '#9aa7b5' };

// What someone is seen doing, by room and (optionally) role. {n} is their name, {m} someone else here.
const LIFE_LINES = {
  engine: { engineer: ['{n} is elbow-deep in the reactor housing again.', '{n} is rerunning the injector timing. It was fine. It is finer now.'], any: ['{n} is watching the reactor telltales like they owe money.'] },
  hold: { quartermaster: ['{n} re-straps the cargo and counts it twice.', '{n} is arguing with the manifest.'], gunner: ['{n} is dry-firing at shadows in the hold.'], any: ['{n} is checking the cargo straps.'] },
  berths: { medic: ['{n} is restocking the med bay, one ampoule at a time.'], passenger: ['{n} is writing letters in their bunk.', '{n} is asleep, or pretending to be.'], any: ['{n} is catching a few hours in their bunk.'] },
  galley: { any: ['{n} is making coffee that could strip paint.', '{n} and {m} are playing cards in the galley, badly.', '{n} is telling {m} a story that is only partly true.'] },
  bridge: { pilot: ['{n} is double-checking the flip solution.'], slicer: ['{n} is combing through the comms traffic.'], any: ['{n} is staring out the forward window.'] },
};

function lifeLine(p, crowd) {
  const room = LIFE_LINES[p.room], pool = room[p.role] || room.any;
  if (!pool) return null;
  const others = crowd.filter(o => o !== p && o.room === p.room && o.role !== 'you');
  const line = pick(pool.filter(l => !l.includes('{m}') || others.length));
  return line && line.replace('{n}', p.name).replace('{m}', others.length ? pick(others).name : '');
}

// ---------- the people aboard ----------
function shipPeople() {
  const t = G.transit;
  if (t.aboard) return t.aboard;
  const people = [{ name: 'You', role: 'you' }];
  for (const c of crewMembers()) people.push({ name: c.first, role: c.role });
  for (const m of paxAboard().slice(0, 4)) {
    const p = m.pid && G.state.people[m.pid];
    people.push({ name: p ? p.first : m.who.split(' ').slice(-1)[0], role: 'passenger', pid: m.pid });
  }
  // Everyone starts strapped in for the burn out.
  people.forEach((p, i) => Object.assign(p, { room: 'berths', x: couchX(i, people.length), tx: null, wait: rand(1, 4), seat: couchX(i, people.length) }));
  return (t.aboard = people);
}

// Crash couches: along the berths and bridge.
const couchX = (i, n) => (i === 0 ? roomAt('bridge').mid : roomAt('berths').x0 + 0.02 + (roomAt('berths').w - 0.04) * (i / Math.max(1, n - 1)));

function goTo(p, roomId) {
  const r = roomAt(roomId);
  p.room = roomId;
  p.tx = r.x0 + r.w * rand(0.25, 0.75);
}

function weighted(table) {
  const entries = Object.entries(table), total = entries.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  for (const [k, w] of entries) if ((r -= w) <= 0) return k;
  return entries[0][0];
}

// Hard burn at each end, weightless at the flip, free to move otherwise.
function phase() {
  const t = G.transit, pr = 1 - t.left / t.total;
  if (pr < 0.06 || pr > 0.94) return 'couch';
  if (Math.abs(pr - 0.5) < 0.03) return 'float';
  return 'move';
}

function lifeTick(dt) {
  syncLifeButtons();
  if (G.mode !== 'transit' || !G.transit) return;
  const people = shipPeople(), ph = phase();
  for (const p of people) {
    if (ph !== 'move') { p.x += (p.seat - p.x) * Math.min(1, dt * 2); p.tx = null; continue; }
    if (p.tx !== null) {
      const step = 0.06 * dt;
      p.x += Math.max(-step, Math.min(step, p.tx - p.x));
      if (Math.abs(p.tx - p.x) < 0.002) {
        p.tx = null; p.wait = rand(5, 12);
        if (p.role !== 'you' && Math.random() < 0.18) {
          const line = lifeLine(p, people);
          if (line) comm(`[Ship] ${line}`);
        }
      }
    } else if ((p.wait -= dt) <= 0) {
      goTo(p, weighted(HAUNTS[p.role]));
    }
  }
}

// ---------- the cutaway ----------
function drawCutaway(cx, cy, maxL) {
  // Longer hulls for bigger ships: a Rock Hopper is 60% of the space, an Ice Hauler all of it.
  const L = maxL * Math.min(1, 0.6 + 0.4 * (SHIPS[G.state.shipId].size - 10) / 8);
  const t = G.transit, people = shipPeople(), ph = phase(), H = Math.round(maxL * 0.17);
  const burning = !t.event && Math.abs(t.angle - (t.flipped ? Math.PI / 2 : -Math.PI / 2)) < 0.05;
  // Nose to the right on the way out; at the flip the ship turns end over end.
  const turn = -Math.sin(t.angle);  // 1 before the flip, -1 after, 0 mid-turn
  const X = f => cx + (f - 0.5) * L * turn;
  const top = cy - H / 2, floor = cy + H / 2 - 6;

  // Drive plume off the stern.
  if (burning) {
    const len = L * 0.28 + Math.random() * 12, sx = X(0), dir = -Math.sign(turn || 1);
    const g = ctx.createLinearGradient(sx, 0, sx + dir * len, 0);
    g.addColorStop(0, 'rgba(255,255,255,0.95)');
    g.addColorStop(0.15, 'rgba(140,190,255,0.8)');
    g.addColorStop(1, 'rgba(60,90,255,0)');
    const halo = ctx.createRadialGradient(sx, cy, 0, sx, cy, H * 0.7);
    halo.addColorStop(0, 'rgba(140,190,255,0.3)'); halo.addColorStop(1, 'rgba(60,90,255,0)');
    ctx.fillStyle = halo;
    ctx.fillRect(sx - H * 0.7, cy - H * 0.7, H * 1.4, H * 1.4);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(sx, cy - H * 0.22); ctx.lineTo(sx + dir * len, cy); ctx.lineTo(sx, cy + H * 0.22); ctx.fill();
  }
  if (Math.abs(turn) < 0.05) return;  // edge-on mid-turn

  // Hull, with a rounded nose, lit from above.
  const shade = ctx.createLinearGradient(0, top, 0, top + H);
  shade.addColorStop(0, '#132338'); shade.addColorStop(1, '#08111c');
  ctx.fillStyle = shade;
  ctx.strokeStyle = '#3d5f82';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(X(0), top + 6); ctx.lineTo(X(0.9), top);
  ctx.quadraticCurveTo(X(1.02), cy, X(0.9), top + H);
  ctx.lineTo(X(0), top + H - 6); ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.save();
  ctx.clip();

  // A pool of light under each room's ceiling lamp: warm in the galley and berths.
  for (const r of ROOMS) {
    const lx = X(r.mid), warm = r.id === 'galley' || r.id === 'berths';
    const lamp = ctx.createRadialGradient(lx, top + 4, 0, lx, top + 4, H * 0.9);
    lamp.addColorStop(0, warm ? 'rgba(255,200,130,0.22)' : 'rgba(150,200,255,0.15)');
    lamp.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = lamp;
    ctx.fillRect(lx - H * 0.9, top + 2, H * 1.8, H - 4);
    ctx.fillStyle = warm ? '#ffcf8f' : '#bfe0ff';
    ctx.fillRect(lx - 4, top + 3, 8, 1.5);
  }
  // Bridge window in the nose.
  ctx.strokeStyle = 'rgba(160,215,255,0.8)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(X(0.915), top + H * 0.2); ctx.quadraticCurveTo(X(0.955), top + H * 0.3, X(0.96), cy - H * 0.05);
  ctx.stroke();
  ctx.restore();
  // Running lights, blinking.
  if (G.time % 1.6 < 0.2) {
    ctx.fillStyle = '#ff5a5a'; ctx.fillRect(X(0.45) - 1.5, top - 3, 3, 3);
    ctx.fillStyle = '#5aff8a'; ctx.fillRect(X(0.45) - 1.5, top + H, 3, 3);
  }

  // Rooms, bulkheads, and what's in them.
  ctx.lineWidth = 1;
  for (const r of ROOMS) {
    if (r.x0 > 0) { ctx.strokeStyle = '#27405c'; ctx.beginPath(); ctx.moveTo(X(r.x0), top + 4); ctx.lineTo(X(r.x0), top + H - 4); ctx.stroke(); }
    ctx.fillStyle = '#5b7896';
    ctx.font = `600 ${L < 450 ? 8 : 10}px ${LABEL_FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(r.name.toUpperCase(), X(r.mid), top + 14);
  }
  ctx.strokeStyle = '#1f3349';
  ctx.beginPath(); ctx.moveTo(X(0.01), floor + 1); ctx.lineTo(X(0.9), floor + 1); ctx.stroke();

  // Engine: the reactor, brighter under thrust.
  const eng = roomAt('engine'), glow = (burning ? 0.9 : 0.35) * (0.9 + 0.1 * Math.sin(G.time * 6));
  const ex = X(eng.mid), ey = cy + 2, er = H * 0.18;
  const core = ctx.createRadialGradient(ex, ey, 0, ex, ey, er * 1.6);
  core.addColorStop(0, `rgba(230,245,255,${glow})`);
  core.addColorStop(0.4, `rgba(120,180,255,${glow * 0.8})`);
  core.addColorStop(1, 'rgba(60,110,255,0)');
  ctx.fillStyle = core;
  ctx.beginPath(); ctx.arc(ex, ey, er * 1.6, 0, Math.PI * 2); ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = '#5d7fa3';
  ctx.beginPath(); ctx.arc(ex, ey, er, 0, Math.PI * 2); ctx.stroke();

  // Hold: crates for the cargo you carry.
  const hold = roomAt('hold'), cap = ship().cargo, used = Math.min(cap, cargoUsed());
  const fillN = cap ? Math.round(12 * used / cap) : 0, cw = hold.w * L * Math.abs(turn) / 6 - 3, chh = Math.min(10, (floor - top - 22) / 2);
  const colors = ['#8a6d3b', '#6d7f3b', '#3b6d7f', '#7f3b5a'];
  for (let i = 0; i < fillN; i++) {
    const col = i % 6, row = Math.floor(i / 6);
    ctx.fillStyle = colors[i % colors.length];
    ctx.fillRect(X(hold.x0 + hold.w * (col + 0.5) / 6) - cw / 2, floor - (row + 1) * (chh + 1), cw, chh);
  }

  // Berths: a bunk for each berth on this ship (up to six drawn).
  const berths = roomAt('berths'), n = Math.min(6, ship().berths);
  for (let i = 0; i < n; i++) {
    const bx = X(berths.x0 + berths.w * (i + 0.5) / n);
    ctx.fillStyle = '#1d2f45';
    ctx.fillRect(bx - 6, i % 2 ? top + 22 : floor - 12, 12, 4);
  }
  // Galley table and bridge consoles.
  ctx.fillStyle = '#2a3f58';
  ctx.fillRect(X(roomAt('galley').mid) - 8, floor - 8, 16, 3);
  ctx.fillStyle = '#35587d';
  ctx.fillRect(X(roomAt('bridge').x0 + 0.03) - 5, floor - 12, 10, 12);

  // People, with names below where they fit.
  ctx.textAlign = 'center';
  ctx.font = `${L < 450 ? 8 : 9}px "IBM Plex Mono", monospace`;
  const labels = [];
  people.forEach((p, i) => {
    const x = X(p.x), bob = ph === 'float' ? Math.sin(G.time * 2 + i) * H * 0.18 - H * 0.12 : 0;
    const y = floor + bob, seated = ph === 'couch';
    ctx.fillStyle = ROLE_COLORS[p.role];
    ctx.fillRect(x - 2, y - (seated ? 7 : 11), 4, seated ? 7 : 11);
    ctx.beginPath(); ctx.arc(x, y - (seated ? 10 : 14), 3, 0, Math.PI * 2); ctx.fill();
    if (p.role !== 'passenger' || p.pid) {
      const w = ctx.measureText(p.name).width + 4;
      const row = [0, 1, 2].find(r => !labels.some(b => b.row === r && Math.abs(b.x - x) < (b.w + w) / 2));
      if (row !== undefined) {
        labels.push({ x, w, row });
        ctx.fillStyle = '#9fb4c9';
        ctx.fillText(p.name, x, top + H + 12 + row * 10);
      }
    }
  });
  ctx.textAlign = 'left';
}

// ---------- downtime activities ----------
const ACTIVITIES = {
  meal: {
    label: 'Share a meal', can: () => true,
    run() {
      for (const p of shipPeople()) if (p.role !== 'you') goTo(p, 'galley');
      goTo(shipPeople()[0], 'galley');
      for (const id of G.state.crew) if (G.state.people[id]) like(G.state.people[id], 1, 'We shared a meal on a long burn.');
      for (const m of paxAboard()) if (m.pid) like(G.state.people[m.pid], 1, 'The captain shared a meal with us.');
      return 'You cook something real for once and everyone crowds into the galley. For an hour the ship feels small in the good way.';
    },
  },
  drills: {
    label: 'Run drills', can: () => !G.transit.drilled,
    run() {
      G.transit.drilled = true;
      for (const p of shipPeople()) goTo(p, p.role === 'you' ? 'bridge' : pick(['hold', 'bridge', 'engine']));
      return 'Damage control, then gunnery, then damage control again. Nobody enjoys it. Everyone is sharper for it. (Better odds in a fight for the rest of this burn.)';
    },
  },
  repair: {
    label: 'Maintenance', can: () => G.state.armor < ship().armor,
    run() {
      const max = ship().armor, amount = Math.round(max * (roleSkill('engineer') ? 0.4 : 0.2)), before = G.state.armor;
      G.state.armor = Math.min(max, before + amount);
      for (const p of shipPeople()) goTo(p, p.role === 'passenger' ? 'galley' : pick(['engine', 'hold']));
      return `You spend a watch patching and sealing. Hull ${before} to ${G.state.armor} of ${max}.${roleSkill('engineer') ? ` ${roleName('engineer')} does the hard parts.` : ''}`;
    },
  },
  visit: {
    label: 'Check on passengers', can: () => paxAboard().length > 0,
    run() {
      goTo(shipPeople()[0], 'berths');
      for (const m of paxAboard()) if (m.pid) like(G.state.people[m.pid], 1, 'The captain came to check on us.');
      return 'You make the rounds of the berths, hear out a complaint about the air recycler, and promise to look into it.';
    },
  },
};

// One activity before the flip and one after.
const lifeHalf = () => (G.transit.flipped ? 'after' : 'before');

function lifeButtonsHtml() {
  return Object.entries(ACTIVITIES).map(([id, a]) => `<button data-life="${id}">${a.label}</button>`).join('');
}

function syncLifeButtons() {
  const el = document.getElementById('tlife');
  if (!el) return;
  const t = G.transit, show = G.mode === 'transit' && t && !t.event && phase() === 'move';
  el.hidden = !show;
  if (!show) return;
  el.style.top = `${G.lifeY}px`;
  el.style.left = `${(G.W - G.hudW) / 2}px`;
  const used = (t.lifeUsed || {})[lifeHalf()];
  el.querySelectorAll('button').forEach(b => { b.disabled = !!used || !ACTIVITIES[b.dataset.life].can(); });
  el.dataset.note = used ? (t.flipped ? 'Done for this burn' : 'Next after the flip') : 'Downtime';
}

function buildLifeButtons() {
  const el = Object.assign(document.createElement('div'), { id: 'tlife', hidden: true });
  el.innerHTML = lifeButtonsHtml();
  document.body.appendChild(el);
  el.addEventListener('click', e => {
    const b = e.target.closest('[data-life]'), t = G.transit;
    if (!b || b.disabled || !t || t.event) return;
    t.lifeUsed = t.lifeUsed || {};
    t.lifeUsed[lifeHalf()] = true;
    comm(`[Ship] ${ACTIVITIES[b.dataset.life].run()}`);
    Sfx.click();
  });
}

Mods.register({
  id: 'shiplife', name: 'Life aboard', builtin: true,
  init(M) {
    buildLifeButtons();
    M.on('frame', lifeTick);
    M.on('landed', () => { const el = document.getElementById('tlife'); if (el) el.hidden = true; });
  },
});
