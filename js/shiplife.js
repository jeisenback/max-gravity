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
  cat: { engine: 4, galley: 3, berths: 2, bridge: 1, hold: 1 },
};
const ROLE_COLORS = { you: '#ffffff', engineer: '#ffa24a', pilot: '#6fb0ff', gunner: '#ff6b5a', quartermaster: '#f0d060', slicer: '#c08cff', medic: '#6fd08c', passenger: '#9aa7b5', cat: '#b8aca0' };

// What someone is seen doing, by room and (optionally) role. {n} is their name, {m} someone else here.
const LIFE_LINES = {
  engine: { cat: ['{n} is asleep on the reactor housing, where it is warm.', '{n} is stretched full length along a warm pipe, purring in a key that matches the drive.', '{n} is watching a dripping valve with a look of tremendous, murderous focus.'],
    engineer: ['{n} is elbow-deep in the reactor housing again.', '{n} is rerunning the injector timing. It was fine. It is finer now.', '{n} is lying on their back under the coolant manifold, telling a small, private joke to a gasket.', '{n} is tapping a pipe with a wrench, listening to the note it makes, and frowning.'],
    any: ['{n} is watching the reactor telltales like they owe money.', '{n} is leaning on the engine room hatch, feeling the drive hum through the deck.', '{n} is warming their hands on the coolant housing, and pretending it is for a reason.'] },
  hold: { cat: ['{n} is stalking something between the crates that nobody else can see.', '{n} has found a box, and has decided, definitively, that it is a bed.', '{n} sits on the highest crate in the hold, very upright, surveying its kingdom.'],
    quartermaster: ['{n} re-straps the cargo and counts it twice.', '{n} is arguing with the manifest.', '{n} is walking the rows with a clipboard, tapping each crate in turn, like a priest with a rosary.', '{n} is sniffing a crate of food, thoughtfully, and writing something down.'],
    gunner: ['{n} is dry-firing at shadows in the hold.', '{n} is cleaning a gun, by feel, in the half-dark, with a small satisfied sigh.', '{n} has set up a small target on a crate, and is very politely losing to it.'],
    any: ['{n} is checking the cargo straps.', '{n} is standing among the crates with a look of quiet thought, and a hand on a lashing.', '{n} is reading the labels on the cargo, one by one, as though the whole hold were a poem.'] },
  berths: { cat: ['{n} has claimed somebody\'s pillow, and nobody has the heart to move it.', '{n} is curled in the exact center of a freshly made bunk, and gives a look of warning to anyone who approaches.', '{n} is asleep on a pair of boots, in a shaft of dim light, and twitching slightly in a dream.'],
    medic: ['{n} is restocking the med bay, one ampoule at a time.', '{n} is labeling small vials in tiny, exact handwriting, and humming.', '{n} is checking, with a quiet, private frown, the sleeping faces of the berths.'],
    passenger: ['{n} is writing letters in their bunk.', '{n} is asleep, or pretending to be.', '{n} is looking through a small pile of photographs, and putting them back, one at a time.', '{n} is sitting on the edge of their bunk, looking at the wall, in the way people do on long trips.'],
    any: ['{n} is catching a few hours in their bunk.', '{n} is asleep with an arm thrown over their eyes and a small book open on their chest.', '{n} is reading, by the light of a small lamp, with their lips moving very slightly.'] },
  galley: { cat: ['{n} is sitting by the food locker, staring at it.', '{n} is licking a stray drop of milk from the galley floor with an air of great, weary dignity.', '{n} has taken the seat of honor at the table, and dares anyone to move it.'],
    any: ['{n} is making coffee that could strip paint.', '{n} and {m} are playing cards in the galley, badly.', '{n} is telling {m} a story that is only partly true.', '{n} and {m} are washing up together, in a companionable silence, and passing each other cups.', '{n} is trying to teach {m} a card trick, and, so far, has failed with great dignity.', '{n} is cooking something unlabelled in a pan, with a small, hopeful look.', '{n} is leaning on the counter with a mug, watching {m} argue, cheerfully, with the recycler.'] },
  bridge: { cat: ['{n} is sitting on the nav console again.', '{n} has settled directly on the flight controls, and looks at you as if to say: what now?', '{n} is watching the stars through the forward window, ears up, with the air of a small, furry navigator.'],
    pilot: ['{n} is double-checking the flip solution.', '{n} is tracing a line on the nav chart with one finger, and nodding, slowly, at something they alone can see.', '{n} is flying, with their hands off the controls, for the sheer bravado of it, and their eyes on every readout.'],
    slicer: ['{n} is combing through the comms traffic.', '{n} is reading a long, tangled stream of code, and smiling, faintly, at something in it.', '{n} is listening to a dozen channels at once, with their eyes closed, and their fingers, faintly, moving.'],
    any: ['{n} is staring out the forward window.', '{n} is standing very still at the viewport, watching the plume, and the dark, and the long, slow pull of the stars.', '{n} is leaning on the nav console, chin on their hands, watching the little green line crawl.'] },
};

function lifeLine(p, crowd) {
  const room = LIFE_LINES[p.room], pool = room[p.role] || room.any;
  if (!pool) return null;
  const others = crowd.filter(o => o !== p && o.room === p.room && o.role !== 'you' && o.role !== 'cat');
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
  if (G.state.home && G.state.home.cat) people.push({ name: G.state.home.cat, role: 'cat' });  // family.js
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
    if (p.role === 'cat') {  // low to the deck, with ears and a tail
      ctx.fillRect(x - 3, y - 3, 6, 3);
      ctx.fillRect(x + 2, y - 5, 2, 2);
      ctx.fillRect(x - 4, y - 5, 1, 3);
    } else {
      ctx.fillRect(x - 2, y - (seated ? 7 : 11), 4, seated ? 7 : 11);
      ctx.beginPath(); ctx.arc(x, y - (seated ? 10 : 14), 3, 0, Math.PI * 2); ctx.fill();
    }
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
      return pick(['You cook something real for once, out of the good stores, with garlic and a little stolen butter, and everyone crowds into the galley, elbow to elbow, passing bowls. Somebody produces a bottle. Somebody else tells a story. For an hour the ship feels small in the good way, and, when the last bowl is scraped clean, nobody wants to be the first to leave.', 'You cook, badly but with feeling, and, to your amazement, it works. The whole ship crowds around the table, and, in the steam and the warm light, the long dark outside the hull seems very far away. There is a toast, and a second, and a small, unplanned song. For an hour the ship feels small in the good way.']);
    },
  },
  drills: {
    label: 'Run drills', can: () => !G.transit.drilled,
    run() {
      G.transit.drilled = true;
      for (const p of shipPeople()) goTo(p, p.role === 'you' ? 'bridge' : pick(['hold', 'bridge', 'engine']));
      return 'You call it, and the klaxon sounds, and the whole ship jumps. Damage control, then gunnery, then damage control again, with a stopwatch, and a great deal of muttering, and one very spirited argument about whose fault the fire in the galley was. Nobody enjoys it. Everyone is sharper for it, and, when it is done, the crew sits on the deck, breathing hard, exchanging tired, grudging, satisfied looks. (Better odds in a fight for the rest of this burn.)';
    },
  },
  repair: {
    label: 'Maintenance', can: () => G.state.armor < ship().armor,
    run() {
      const max = ship().armor, amount = Math.round(max * (roleSkill('engineer') ? 0.4 : 0.2)), before = G.state.armor;
      G.state.armor = Math.min(max, before + amount);
      for (const p of shipPeople()) goTo(p, p.role === 'passenger' ? 'galley' : pick(['engine', 'hold']));
      return `You spend a watch patching and sealing, with a heat gun, a tin of compound, and a great deal of swearing, crawling along the frame with a flashlight in your teeth, filling the scars of old fights. Hull ${before} to ${G.state.armor} of ${max}.${roleSkill('engineer') ? ` ${roleName('engineer')} does the hard parts, quietly, with a kind of tender, patient skill, and, when it is done, pats the bulkhead, once, like a horse.` : ' It is not elegant, and it is slow, but it is honest work, and, at the end, you sit against the wall with your hands black to the wrist, and look at what you have done.'}`;
    },
  },
  visit: {
    label: 'Check on passengers', can: () => paxAboard().length > 0,
    run() {
      goTo(shipPeople()[0], 'berths');
      for (const m of paxAboard()) if (m.pid) like(G.state.people[m.pid], 1, 'The captain came to check on us.');
      return pick(['You make the rounds of the berths, with a small, tired smile, knocking on each door in turn. You hear out a complaint about the air recycler, a story about a cousin, a request for an extra blanket, and, from one quiet passenger, a long, hesitant question about whether it is normal to feel this far from everything. You promise to look into the recycler. You tell them, honestly, that it is.', 'You go from bunk to bunk, and sit, in each, for a few minutes, on the edge of the mattress. You hear out a complaint about the air recycler, and another about the coffee, and a much longer, more careful one about the silence. You promise to look into it. You mean it, and it helps, a little, to have been asked.']);
    },
  },
};

// One activity before the flip and one after.
const lifeHalf = () => (G.transit.flipped ? 'after' : 'before');

const activityLabel = a => (typeof a.label === 'function' ? a.label() : a.label);

// Downtime is a menu: one activity before the flip and one after. There are many to choose from, so it shows five at a
// time, mixed from the three kinds (the ship's own, a hand's, and what is on now) and turned on each time, so everything
// comes round. The same five stay while that half of the burn is open.
const DOWNTIME_SHOWN = 5;
const baseActivities = () => Object.entries(ACTIVITIES).filter(([id, a]) => hiredMay(id, a)).map(([, a]) => a);
function downtimeFive() {
  const t = G.transit, st = G.state, half = lifeHalf(), ok = a => !a.can || a.can();
  const lanes = [baseActivities().filter(ok), handDowntime().filter(ok), onNow().filter(ok)], every = lanes.flat();
  if (every.length <= DOWNTIME_SHOWN) return every;
  t.lifeShown = t.lifeShown || {};
  const kept = (t.lifeShown[half] || []).map(l => every.find(a => activityLabel(a) === l)).filter(Boolean);
  if (kept.length) return kept;
  const turn = st.lifeTurn = (st.lifeTurn || 0) + 1;
  const spun = lanes.map(l => (l.length ? l.slice(turn % l.length).concat(l.slice(0, turn % l.length)) : l));
  const out = [];
  for (let i = 0; out.length < DOWNTIME_SHOWN && spun.some(l => l.length > i); i++) for (const l of spun) if (l[i] && out.length < DOWNTIME_SHOWN) out.push(l[i]);
  t.lifeShown[half] = out.map(activityLabel);
  return out;
}

// `all` lists every option instead of five (for tests and the like).
function downtimeEvent(all) {
  const t = G.transit;
  return {
    title: 'Downtime', personal: true,  // a hand's savings are their own, not the ship's purse
    text: hired() ? `A long burn and nowhere to go. What do you do with ${t.flipped ? 'the rest of the trip' : 'the time before the flip'}?` : `A long burn and nowhere to go. What does the ship do with ${t.flipped ? 'the rest of the trip' : 'the time before the flip'}?`,
    choices: [
      ...(all ? [...baseActivities(), ...handDowntime(), ...onNow()] : downtimeFive()).map(a => ({
        label: activityLabel(a), can: a.can,
        run() {
          t.lifeUsed = t.lifeUsed || {};
          t.lifeUsed[lifeHalf()] = true;
          const text = a.run();
          comm(`[Ship] ${text}`);
          return text;
        },
      })),
      { label: 'Not now', run: () => 'Everyone goes back to their own business.' },
    ],
  };
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
  el.querySelector('button').disabled = !!used;
  el.dataset.note = used ? (t.flipped ? 'Done for this burn' : 'Next after the flip') : 'Downtime';
}

function buildLifeButtons() {
  const el = Object.assign(document.createElement('div'), { id: 'tlife', hidden: true });
  el.innerHTML = '<button data-life="menu">Spend some downtime</button>';
  document.body.appendChild(el);
  el.addEventListener('click', e => {
    const b = e.target.closest('[data-life]'), t = G.transit;
    if (!b || b.disabled || !t || t.event) return;
    Sfx.click();
    openEvent(downtimeEvent());
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
