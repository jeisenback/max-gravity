'use strict';

// The pilot post, crewed: a hired pilot flies the local-space legs. "Autopilot: depart"
// takes the ship from the dock out to clear space and starts the burn; on arrival the
// pilot brings the ship in to the planet chosen under Navigation and lands. Any flight
// key (or the touch stick) takes the controls back at once, and so does a hostile ship
// close by: the pilot hands the fight to you. G.auto is not saved; a load is manual.
// Loaded before game.js; only calls into it at runtime.

const AUTO_HAIL_RANGE = 1500;  // a hostile this close ends the autopilot
const AUTO_LIMIT = 120;        // seconds; a leg that takes longer is handed back

const pilotName = () => { const h = postHolder('pilot'); return h ? h.first || h.name : 'The pilot'; };
const pilotCare = () => 0.6 + 0.1 * roleSkill('pilot');  // a better pilot brakes later and lands sooner

// The planet to dock at: the one chosen on the Navigation station if it is in this system
// (or, at port, in the destination), otherwise the first.
function dockTarget(sysId) {
  const st = G.state, planets = SYSTEMS[sysId].planets, want = st.route && st.route.dock;
  return planets.find(p => p.name === want) || planets[0];
}

function autoOff(text, taken) {
  G.auto = null;
  if (taken) takeControl('pilot');
  if (text) msg(text);
}

function updateAutopilot(dt) {
  const p = G.player, a = G.auto, s = ship(), k = G.keys, st = G.state;
  if (k.left || k.right || k.thrust || k.reverse || k.fire || Touch.stick) { autoOff('You take the controls.', true); return updatePlayer(dt); }
  if (postMode('pilot') !== 'crewed') { autoOff(); return updatePlayer(dt); }
  if (G.npcs.some(n => n.hostile && !n.dead && dist(n, p) < AUTO_HAIL_RANGE)) { autoOff(`${pilotName()}: Contact, and they are not friendly. She's yours, captain.`); return updatePlayer(dt); }
  if ((a.t += dt) > AUTO_LIMIT) { autoOff(`${pilotName()}: I can't get us settled. Your ship, captain.`); return updatePlayer(dt); }
  if (a.kind === 'out') {
    const r = Math.hypot(p.x, p.y);
    if (r >= BURN_DIST + 40) { autoOff(); tryBurn(); return; }
    p.thrusting = turnToward(p, r > 1 ? Math.atan2(p.y, p.x) : p.angle, dt) < 0.35;
  } else {
    const pl = dockTarget(st.systemId), d = dist(pl, p), speed = Math.hypot(p.vx, p.vy);
    if (d <= pl.r + 55 && speed < LAND_SPEED * 0.8) { autoOff(); G.navPlanet = system().planets.indexOf(pl); tryLand(); return; }
    // Fly the speed the remaining distance allows, braking at a fraction of the drive.
    const want = Math.min(s.maxSpeed * 0.9, Math.sqrt(2 * s.accel * a.care * Math.max(0, d - pl.r - 40)) + 30);
    const ex = (pl.x - p.x) / d * want - p.vx, ey = (pl.y - p.y) / d * want - p.vy;
    p.thrusting = turnToward(p, Math.atan2(ey, ex), dt) < 0.4 && Math.hypot(ex, ey) > 12;
  }
  physics(p, dt);
}

const canDepart = () => {
  const st = G.state;
  return !hired() && G.mode === 'landed' && !G.dialog && postMode('pilot') === 'crewed' && !!st.dest && st.dest !== st.systemId && st.fuel >= burnFuel(st.systemId, st.dest);
};

ORDERS.pilot = [{
  id: 'depart', name: 'Autopilot: depart', sure: true,
  desc: 'Take the ship out to clear space and start the burn. Fly any key to take over.',
  can: canDepart,
  run() {
    const st = G.state;
    st.route = { dock: dockTarget(st.dest).name, ...st.route, go: true };  // the dock chosen on Navigation, else the first
    takeOff();
    G.auto = { kind: 'out', t: 0, care: pilotCare() };
    return `${pilotName()} takes her out.`;
  },
}];

// Where to dock on arrival, for the Navigation station and the pilot's burn sheet.
function routeHtml() {
  const st = G.state, sid = st.dest && st.dest !== st.systemId ? st.dest : null;
  if (!sid || hired() || postMode('pilot') !== 'crewed') return '';
  const here = dockTarget(sid).name;
  return `<div class="post"><div class="eyebrow">Dock at, on arrival</div><div class="row">${SYSTEMS[sid].planets.map(pl => `<button data-action="routeDock" data-arg="${esc(pl.name)}" class="${pl.name === here ? 'primary' : ''}">${pl.name}</button>`).join('')}</div></div>`;
}

Mods.register({
  id: 'autopilot', name: 'Autopilot', builtin: true,
  init(M) {
    M.action('routeDock', name => { G.state.route = { ...G.state.route, dock: name }; });
    M.on('arrive', () => {
      if (postMode('pilot') !== 'crewed' || !(G.state.route && G.state.route.go)) return;
      G.auto = { kind: 'dock', t: 0, care: pilotCare() };
      msg(`${pilotName()} brings us in to ${dockTarget(G.state.systemId).name}.`);
    });
    for (const e of ['landed', 'stateReady']) M.on(e, () => { G.auto = null; if (G.state.route) G.state.route.go = false; });
    M.on('drawOverlay', W => {
      if (!G.auto || G.mode !== 'flight') return;
      ctx.save();
      ctx.textAlign = 'center'; ctx.font = `600 13px ${LABEL_FONT}`; ctx.fillStyle = '#7fb4ff';
      ctx.fillText(`AUTOPILOT: ${G.auto.kind === 'out' ? 'LEAVING THE DOCK' : `DOCKING AT ${dockTarget(G.state.systemId).name.toUpperCase()}`}. ANY FLIGHT KEY TAKES THE CONTROLS.`, W / 2, G.hudW ? 24 : 100);
      ctx.restore();
    });
  },
});
