'use strict';

// Milestone 4b prototype: combat happens during burns, in momentum flight. Pirates,
// hostile patrols, bounty targets, and hired guns intercept you mid-burn instead of
// waiting in local space. The fight plays out in open space with no speed cap:
// thrust in g, velocity adds up, and matching velocity is a skill. Torpedoes are the
// long-range weapon, guns fire slugs that carry your own velocity, and every ship's
// point defense shoots down incoming torpedoes. Burning hard builds strain; past the
// limit your crew black out and can be hurt. Switch back to classic local-space
// combat with the Combat button at any port. Story set pieces (Aquilon's recovery
// ship, the Ceres blockade) still happen in local space.
//
// Distances read as km and speeds as km/s. G.engage holds the fight; G.player is
// the same ship object as in flight, moved into the engagement frame and back.
// Loaded before game.js; only calls into it at runtime.

const ENG = {
  g: 10,               // units/s^2 per g
  start: 3500, fleeStart: 5200, escape: 7000,
  slug: { speed: 520, life: 4, spread: 0.02, cd: 0.25 },
  torp: { accel: 260, turn: 3.2, life: 16, playerDmg: 60, npcDmg: 45 },
  pd: { range: 320, every: 0.12, kill: 0.1 },
  strain: { from: 2.5, rate: 5, recover: 14, blackout: 2.5 },
};
const ENEMY_TORPS = { raider: 1, corsair: 3, cutter: 2, destroyer: 5 };

// "The Pirate ...", but not "The The Weeping Saint".
const theShip = n => (/^the /i.test(n.name) ? n.name : `The ${n.name}`);
const burnCombat = () => !(G.state && G.state.flags.classicCombat);
const maxG = o => Math.max(2, Math.round(statsOf(o).accel / 30));

// ---------- who intercepts you ----------
function planIntercept() {
  const t = G.transit, st = G.state, from = st.systemId, to = t.to;
  t.interceptPlanned = true;
  let spec = null;
  const bounty = st.missions.find(m => m.type === 'bounty' && [from, to].includes(m.targetSystem));
  const hostileGov = [SYSTEMS[to].gov, SYSTEMS[from].gov].find(g => PATROL_NAMES[g] && repOf(g) <= -15);
  if (bounty) spec = { kind: 'bounty', mission: bounty };
  else if (G.revenge) { spec = { kind: 'hunter', person: G.revenge }; G.revenge = null; }
  else if (hostileGov && Math.random() < 0.6) spec = { kind: 'patrol', gov: hostileGov };
  else if (Math.random() < Math.min(0.55, 0.05 + 0.6 * Math.max(danger(from), danger(to)))) spec = { kind: 'pirate' };
  if (spec) t.intercept = { spec, at: t.total * rand(0.25, 0.7) };
}

function makeEnemy(spec) {
  const sid = G.state.systemId, persona = makePerson(cultureOf(sid));
  const shipId = spec.kind === 'patrol' ? (Math.random() < 0.3 ? 'destroyer' : 'cutter')
    : spec.kind === 'pirate' ? (Math.random() < Math.min(0.6, danger(sid) + 0.2) ? 'corsair' : 'raider') : 'corsair';
  const n = makeShip(shipId, 0, 0, 0);
  Object.assign(n, { kind: spec.kind === 'patrol' ? 'patrol' : 'pirate', hostile: true, persona, captain: `${persona.first} ${persona.last}`, torps: ENEMY_TORPS[shipId] || 0, torpCd: rand(2, 4) });
  if (spec.kind === 'patrol') Object.assign(n, { gov: spec.gov, name: `${PATROL_NAMES[spec.gov]} "${shipName(false)}"` });
  else if (spec.kind === 'bounty') Object.assign(n, { name: spec.mission.targetName, bountyId: spec.mission.id });
  else if (spec.kind === 'hunter') Object.assign(n, { name: 'Hired gun', payer: `${spec.person.first} ${spec.person.last}` });
  else n.name = `Pirate "${shipName(true)}"`;
  if (spec.kind === 'bounty' || spec.kind === 'hunter') n.armor = n.maxArmor = SHIPS.corsair.armor * 1.4;
  return n;
}

function contactEvent(spec) {
  const st = G.state, d = fmt(Math.round(rand(3200, 3800) / 10) * 10);
  const who = { pirate: 'No transponder. The plume signature says pirate.', patrol: `Transponder: ${spec.gov} navy. You are wanted in their space.`,
    bounty: `Transponder spoofed, but the plume matches: ${spec.mission && spec.mission.targetName}, the ship you are hunting.`,
    hunter: `A hired gun. The captain says ${spec.person && `${spec.person.first} ${spec.person.last}`} sends regards.` }[spec.kind];
  const go = flee => () => { G.engagePending = { spec, flee }; return flee ? 'You wind the drive up past the redline. Crash couches, everyone.' : 'Battle stations. Everyone into their couches.'; };
  const choices = [
    { label: 'Battle stations', run: go(false) },
    { label: 'Burn hard to outrun them', run: go(true) },
  ];
  if (spec.kind === 'pirate') {
    choices.push({ label: 'Pay them off (10% of your credits, at least 500)', can: () => st.credits >= 500, run() {
      const c = Math.max(500, Math.round(st.credits * 0.1));
      st.credits -= c;
      return `You transfer ${fmt(c)} cr. Their plume swings away.`;
    } });
    choices.push({ label: '[{crew}] Spoof a pirate transponder', role: 'slicer', run() {
      if (Math.random() < slicerOdds()) return '{crew}\'s fake transponder reads as one of their own. The plume swings away.';
      G.engagePending = { spec, flee: false };
      return 'They see through it. Battle stations.';
    } });
  }
  if (spec.kind === 'patrol') choices.push({ label: 'Cut your drive and pay the fine (4,000 cr)', can: () => st.credits >= 4000, run() {
    st.credits -= 4000;
    st.rep[spec.gov] = Math.max(repOf(spec.gov), -10);
    return 'They take your money and log your ship as settled. For now.';
  } });
  return { title: 'Contact', text: `Sensors: a drive plume at ${d} km, on an intercept course. ${who}`, choices };
}

// ---------- the engagement ----------
function startEngage({ spec, flee }) {
  const p = G.player, n = makeEnemy(spec), a = rand(0, Math.PI * 2), d = flee ? ENG.fleeStart : ENG.start;
  G.engage = {
    saved: { x: p.x, y: p.y, vx: p.vx, vy: p.vy, angle: p.angle }, enemy: n, slugs: [], torps: [], tracers: [],
    throttle: Math.min(3, maxG(p)), strain: 0, blackout: 0, msgStart: G.messages.length, spec, cd: 0, torpCd: 0,
  };
  Object.assign(p, { x: 0, y: 0, vx: 0, vy: 0, angle: flee ? a + Math.PI : 0, thrusting: false });
  // They come in fast from a random bearing, closing and a little off-line.
  const close = rand(110, 170), side = rand(-40, 40);
  Object.assign(n, { x: Math.cos(a) * d, y: Math.sin(a) * d, angle: a + Math.PI,
    vx: -Math.cos(a) * close - Math.sin(a) * side, vy: -Math.sin(a) * close + Math.cos(a) * side });
  G.npcs = [n];
  G.target = n;
  G.particles = [];
  G.mode = 'engage';
  msg(`${n.name} is closing. ${Touch.on ? 'Stick to steer and burn, Torp to launch.' : 'W burn, A/D turn, Q/E thrust, S retrograde, Space guns, F torpedo, H hail.'}`);
}

function endEngage(text) {
  const e = G.engage, p = G.player, st = G.state;
  Object.assign(p, e.saved, { thrusting: false });
  st.armor = Math.max(1, Math.round(p.armor));
  const log = G.messages.slice(e.msgStart).map(m => m.text).filter(t => !/is closing\./.test(t));
  G.engage = null;
  G.npcs = []; G.target = null; G.particles = [];
  G.mode = 'transit';
  comm(`[Ship] ${text}`);
  openEvent({ title: 'After the Fight', text: [text, ...log.slice(-4)].join(' '), choices: [{ label: 'Back to the burn', run: () => 'You settle back into your couches. The burn goes on.' }] });
}

// Relative motion of `o` seen from `from`.
const rel = (o, from) => ({ x: o.x - from.x, y: o.y - from.y, vx: o.vx - from.vx, vy: o.vy - from.vy });

// Did a projectile moving with relative velocity pass within r of o this step?
function sweptHit(sh, o, r, dt) {
  const x0 = sh.x - o.x, y0 = sh.y - o.y, vx = (sh.vx - o.vx) * dt, vy = (sh.vy - o.vy) * dt;
  const t = Math.max(0, Math.min(1, -(x0 * vx + y0 * vy) / (vx * vx + vy * vy || 1)));
  return Math.hypot(x0 + vx * t, y0 + vy * t) < r;
}

function thrust(o, g, dt) {
  o.thrusting = g > 0;
  if (!g) return;
  o.vx += Math.cos(o.angle) * g * ENG.g * dt;
  o.vy += Math.sin(o.angle) * g * ENG.g * dt;
}

function gunsFire(o, target) {
  const s = SHIPS[o.shipId], isPlayer = o === G.player, guns = isPlayer ? playerGuns() : s.guns;
  for (let i = 0; i < guns; i++) {
    const a = o.angle + (i - (guns - 1) / 2) * 0.03 + rand(-ENG.slug.spread, ENG.slug.spread);
    G.engage.slugs.push({ x: o.x, y: o.y, vx: o.vx + Math.cos(a) * ENG.slug.speed, vy: o.vy + Math.sin(a) * ENG.slug.speed,
      life: ENG.slug.life, from: o, target, dmg: isPlayer ? SHOT_DMG * ship().dmgMult : SHOT_DMG });
  }
  Mods.emit('fire', o);
}

function launchTorp(o, target) {
  G.engage.torps.push({ x: o.x, y: o.y, vx: o.vx + Math.cos(o.angle) * 60, vy: o.vy + Math.sin(o.angle) * 60, angle: o.angle,
    life: ENG.torp.life, from: o, target, dmg: o === G.player ? ENG.torp.playerDmg : ENG.torp.npcDmg });
  Sfx.hiss(1800, 250, 0.45, o === G.player ? 0.2 : 0.12);
}

function playerTorpedo() {
  const st = G.state, e = G.engage;
  if (!e || e.blackout > 0) return;
  if (!ship().launcher) return msg('No torpedo launcher fitted. Outfitters sell them.');
  if (!(st.torpedoes > 0)) return msg('Torpedo tubes are empty.');
  if (e.torpCd > 0) return;
  st.torpedoes--;
  e.torpCd = 0.6;
  launchTorp(G.player, e.enemy);
  msg(`Torpedo away: ${st.torpedoes} left.`);
}

// Hail: board a disabled ship you have matched, or talk.
function engageHail() {
  const e = G.engage, n = e && e.enemy;
  if (!n || n.dead) return;
  if (n.disabled) return openEvent(boardingEvent(n));
  openEvent({ title: n.name, text: n.kind === 'patrol' ? `Capt. ${n.captain}: "Cut your drive and prepare to be boarded."` : `Capt. ${n.captain}: "Nothing personal. Cut your drive."`,
    choices: [{ label: 'Cut the channel', run: () => 'You cut the channel.' }] });
}

function steerPlayer(dt) {
  const p = G.player, e = G.engage, k = G.keys, s = ship();
  if (e.blackout > 0) { p.thrusting = false; return 0; }
  if (k.left) p.angle -= s.turn * dt;
  if (k.right) p.angle += s.turn * dt;
  // S: point retrograde against the target's motion, to match velocity.
  if (k.reverse) { const r = rel(p, e.enemy); if (Math.hypot(r.vx, r.vy) > 2) turnToward(p, Math.atan2(-r.vy, -r.vx), dt); }
  let g = k.thrust ? e.throttle : 0;
  const st = Touch.stick;
  if (st && st.m >= 0.15) {
    const off = turnToward(p, st.a, dt);
    if (st.m > 0.55 && off < 0.9) g = Math.max(1, Math.round(1 + (st.m - 0.55) / 0.45 * (maxG(p) - 1)));
  }
  thrust(p, g, dt);
  if (k.fire && (e.cd -= dt) <= 0) { e.cd = ENG.slug.cd; gunsFire(p, e.enemy); }
  return g;
}

// Crew strain from hard burns; past 100 everyone blacks out for a moment.
function strainTick(g, dt) {
  const e = G.engage, S = ENG.strain;
  if (e.blackout > 0) { e.blackout -= dt; return; }
  const gain = g > S.from ? Math.pow(g - S.from, 1.6) * S.rate * (roleSkill('medic') ? 0.7 : 1) : -S.recover;
  e.strain = Math.max(0, e.strain + gain * dt);
  if (e.strain >= 100) {
    e.blackout = S.blackout;
    e.strain = 60;
    msg('Blackout. Too many g for too long.');
    if (Math.random() < 0.35) hurtCrew();
  }
}

function enemyAI(n, dt) {
  const p = G.player, r = rel(p, n), d = Math.hypot(r.x, r.y), gmax = maxG(n);
  n.thrusting = false;
  if (n.disabled) return;
  const toward = Math.atan2(r.y, r.x);
  if (n.armor < n.maxArmor * 0.3) {  // run for it
    turnToward(n, toward + Math.PI, dt);
    if (Math.abs(wrapAngle(n.angle - toward - Math.PI)) < 0.4) thrust(n, gmax, dt);
    return;
  }
  // Close to fighting range and match velocity: steer the relative velocity toward
  // a closing speed that shrinks as the range does.
  const want = Math.min(260, Math.max(0, d - 350) * 0.12);
  const ax = Math.cos(toward) * want + r.vx, ay = Math.sin(toward) * want + r.vy;  // desired minus current, as seen by n
  if (d < 800) {
    const lead = d / ENG.slug.speed, aim = Math.atan2(r.y + r.vy * lead, r.x + r.vx * lead);
    const off = turnToward(n, aim, dt);
    if (off < 0.08 && (n.cooldown -= dt) <= 0) { n.cooldown = 0.35; gunsFire(n, p); }
    if (Math.hypot(ax, ay) > 60 && off > 0.8) thrust(n, 1, dt);
  } else if (Math.hypot(ax, ay) > 8) {
    const off = turnToward(n, Math.atan2(ay, ax), dt);
    if (off < 0.5) thrust(n, Math.min(gmax, 3), dt);  // a steady chase; they sprint only to run
  }
  if (n.torps > 0 && d > 600 && d < 3800 && (n.torpCd -= dt) <= 0) {
    n.torps--;
    n.torpCd = rand(4, 7);
    launchTorp(n, p);
    msg(`${n.name} launched a torpedo!`);
  }
}

function hitShip(o, dmg, byPlayer, from) {
  o.hitAngle = Math.atan2(from.y - o.y, from.x - o.x);
  damage(o, dmg, byPlayer);
}

function projectilesTick(dt) {
  const e = G.engage;
  for (const sh of e.slugs) {
    sh.life -= dt;
    const t = sh.target;
    if (t && !t.dead && sweptHit(sh, t, SHIPS[t.shipId].size + 6, dt)) { sh.life = 0; hitShip(t, sh.dmg, sh.from === G.player, sh); }
    sh.x += sh.vx * dt; sh.y += sh.vy * dt;
  }
  for (const tp of e.torps) {
    tp.life -= dt;
    const t = tp.target;
    if (t && !t.dead) {
      // Aim at where the target will be, given the closing speed.
      const r = rel(t, tp), d = Math.hypot(r.x, r.y), closing = Math.max(80, -(r.x * r.vx + r.y * r.vy) / (d || 1));
      const lead = Math.min(3, d / closing), want = Math.atan2(r.y + r.vy * lead, r.x + r.vx * lead);
      const off = wrapAngle(want - tp.angle);
      tp.angle += Math.max(-ENG.torp.turn * dt, Math.min(ENG.torp.turn * dt, off));
      if (sweptHit(tp, t, SHIPS[t.shipId].size + 8, dt)) {
        tp.life = 0;
        burst(tp.x, tp.y, 16, ['#fff', '#ffd27f', '#ff8c3a'], 200);
        if (t === G.player) shake(8);
        Sfx.boom(t);
        hitShip(t, tp.dmg, tp.from === G.player, tp);
      }
    }
    tp.vx += Math.cos(tp.angle) * ENG.torp.accel * dt;
    tp.vy += Math.sin(tp.angle) * ENG.torp.accel * dt;
    tp.x += tp.vx * dt; tp.y += tp.vy * dt;
    if (Math.random() < dt * 25) G.particles.push({ type: 'smoke', x: tp.x, y: tp.y, vx: tp.vx, vy: tp.vy, life: 0.6, max: 0.6, size: 1.5, grow: 3 });
  }
  // Point defense: each turret takes a shot at the nearest torpedo coming at its ship.
  for (const o of [G.player, e.enemy]) {
    if (!o || o.dead || o.disabled) continue;
    const turrets = 1 + (o === G.player ? G.state.outfits.pdc || 0 : SHIPS[o.shipId].guns >= 2 ? 1 : 0);
    if ((o.pdCd = (o.pdCd || 0) - dt) > 0) continue;
    const tp = e.torps.filter(x => x.target === o && x.life > 0 && dist(x, o) < ENG.pd.range).sort((a, b) => dist(a, o) - dist(b, o))[0];
    if (!tp) continue;
    o.pdCd = ENG.pd.every / turrets;
    e.tracers.push({ x0: o.x, y0: o.y, x1: tp.x + rand(-15, 15), y1: tp.y + rand(-15, 15), life: 0.07 });
    if (Math.random() < ENG.pd.kill + (o === G.player ? roleSkill('gunner') * 0.03 : 0)) {
      tp.life = 0;
      burst(tp.x, tp.y, 8, ['#fff', '#ffd27f'], 120);
    }
  }
  e.slugs = e.slugs.filter(s => s.life > 0);
  e.torps = e.torps.filter(t => t.life > 0);
  e.tracers = e.tracers.filter(t => (t.life -= dt) > 0);
}

function engageTick(dt) {
  const e = G.engage, p = G.player, n = e.enemy;
  if (G.dialog || p.dead) return;
  G.time += dt;
  e.torpCd -= dt;
  const g = steerPlayer(dt);
  strainTick(g, dt);
  if (!n.dead) enemyAI(n, dt);
  for (const o of [p, n]) {
    o.x += o.vx * dt; o.y += o.vy * dt;
    const s = statsOf(o);
    o.shields = Math.min(s.shields, o.shields + s.shields * 0.03 * dt);
  }
  projectilesTick(dt);
  for (const pt of G.particles) { pt.x += pt.vx * dt; pt.y += pt.vy * dt; pt.life -= dt; if (pt.grow) pt.size += pt.grow * dt; }
  G.particles = G.particles.filter(pt => pt.life > 0);
  G.shake = Math.max(0, G.shake - dt * 25);
  if (p.dead) { G.npcs = []; return; }  // the flight loop takes over the death scene
  if (G.mode !== 'engage') return;
  const d = dist(p, n), opening = rel(n, p), rate = (opening.x * opening.vx + opening.y * opening.vy) / (d || 1);
  if (n.dead) return endEngage(n.armor > 0 ? `Your prize crew brings ${theShip(n).replace(/^The/, 'the')} about.` : `${theShip(n)} breaks up on your screens.`);
  if (n.disabled === 'stripped') return endEngage(`You leave ${theShip(n).replace(/^The/, 'the')} drifting, lighter than you found it.`);
  if (d > ENG.escape && rate > 0) {
    if (n.disabled) return endEngage(`You leave ${theShip(n).replace(/^The/, 'the')} drifting behind you.`);
    if (n.armor < n.maxArmor * 0.3) return endEngage(`${theShip(n)} runs for it, trailing debris, and you let it go.`);
    return endEngage(`You leave ${theShip(n).replace(/^The/, 'the')} behind. Their plume fades off your screens.`);
  }
}

// ---------- drawing ----------
function drawEngage(W, H) {
  const e = G.engage, p = G.player, n = e.enemy, viewW = W - G.hudW;
  const d = dist(p, n), target = Math.min(1, Math.min(viewW, H) * 0.36 / Math.max(300, d));
  e.scale = e.scale ? e.scale + (target - e.scale) * 0.08 : target;
  const s = e.scale, toScreen = o => [(o.x - p.x) * s + viewW / 2, (o.y - p.y) * s + H / 2];
  ctx.save();
  ctx.beginPath(); ctx.rect(0, 0, viewW, H); ctx.clip();
  if (G.shake) ctx.translate(rand(-G.shake, G.shake), rand(-G.shake, G.shake));
  ctx.fillStyle = '#02040a';
  ctx.fillRect(0, 0, viewW, H);
  // A grid fixed in space, so you can see your own motion.
  const step = 500 * s;
  ctx.strokeStyle = 'rgba(40,70,110,0.25)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = (viewW / 2 - p.x * s) % step; x < viewW; x += step) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
  for (let y = (H / 2 - p.y * s) % step; y < H; y += step) { ctx.moveTo(0, y); ctx.lineTo(viewW, y); }
  ctx.stroke();
  // Range rings around you.
  ctx.font = '10px "IBM Plex Mono", monospace';
  ctx.textAlign = 'left';
  for (const r of [1000, 2500, 5000]) {
    ctx.strokeStyle = 'rgba(127,180,255,0.18)';
    ctx.beginPath(); ctx.arc(viewW / 2, H / 2, r * s, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = 'rgba(127,180,255,0.45)';
    ctx.fillText(`${fmt(r)} km`, viewW / 2 + r * s * 0.71 + 4, H / 2 - r * s * 0.71);
  }
  // Their drift relative to you over the next ten seconds, and the closest approach.
  const r = rel(n, p), [ex, ey] = toScreen(n);
  ctx.setLineDash([4, 6]);
  ctx.strokeStyle = 'rgba(255,140,120,0.6)';
  ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex + r.vx * 10 * s, ey + r.vy * 10 * s); ctx.stroke();
  ctx.setLineDash([]);
  const vv = r.vx * r.vx + r.vy * r.vy, tc = vv ? -(r.x * r.vx + r.y * r.vy) / vv : -1;
  if (tc > 0 && tc < 60) {
    const cx = viewW / 2 + (r.x + r.vx * tc) * s, cy = H / 2 + (r.y + r.vy * tc) * s;
    ctx.strokeStyle = '#ffb07a';
    ctx.beginPath(); ctx.moveTo(cx - 5, cy - 5); ctx.lineTo(cx + 5, cy + 5); ctx.moveTo(cx + 5, cy - 5); ctx.lineTo(cx - 5, cy + 5); ctx.stroke();
    ctx.fillStyle = '#ffb07a';
    ctx.fillText(`closest ${fmt(Math.round(Math.hypot(r.x + r.vx * tc, r.y + r.vy * tc)))} km in ${Math.round(tc)}s`, cx + 8, cy + 4);
  }
  // Destination: the way your burn was heading.
  ctx.fillStyle = 'rgba(95,211,95,0.8)';
  ctx.textAlign = 'right';
  if (G.transit) ctx.fillText(`${SYSTEMS[G.transit.to].name} >`, viewW - 12, H / 2 - 12);
  ctx.textAlign = 'left';
  for (const t of e.tracers) {
    ctx.strokeStyle = 'rgba(255,230,160,0.7)';
    const [x0, y0] = toScreen({ x: t.x0, y: t.y0 }), [x1, y1] = toScreen({ x: t.x1, y: t.y1 });
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  }
  for (const pt of G.particles) drawParticle(pt, ...toScreen(pt));
  for (const sh of e.slugs) drawShot(sh, ...toScreen(sh));
  for (const tp of e.torps) {
    const [x, y] = toScreen(tp);
    ctx.fillStyle = tp.from === p ? '#bfe6ff' : '#ff9a8a';
    ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill();
  }
  if (!n.dead) {
    drawShip(n, n.disabled ? '#888' : '#ff6b5a', toScreen);
    drawBrackets(ex, ey, SHIPS[n.shipId].size + 8, n.disabled ? '#aaa' : '#ff6b5a');
  }
  if (!p.dead) drawShip(p, '#9fe0ff', toScreen);

  // Readouts.
  const rate = (r.x * r.vx + r.y * r.vy) / (d || 1);
  ctx.textAlign = 'center';
  ctx.font = `600 12px ${LABEL_FONT}`;
  ctx.fillStyle = '#ff8c7a';
  const top = G.hudW ? 20 : 96;
  ctx.fillText(`ENGAGEMENT: ${n.name.toUpperCase()}`, viewW / 2, top);
  ctx.font = '12px "IBM Plex Mono", monospace';
  ctx.fillStyle = '#cfe3ff';
  const rangeLine = `Range ${fmt(Math.round(d))} km, ${rate < 0 ? 'closing' : 'opening'} ${Math.abs(Math.round(rate))} km/s`;
  const hullLine = `Their hull ${Math.max(0, Math.round(100 * n.armor / n.maxArmor))}%${n.disabled ? ' DISABLED' : ''}${n.torps ? `, torps ${n.torps}` : ''}`;
  if (viewW < 600) { ctx.fillText(rangeLine, viewW / 2, top + 18); ctx.fillText(hullLine, viewW / 2, top + 34); }
  else ctx.fillText(`${rangeLine}  |  ${hullLine}`, viewW / 2, top + 18);
  if (n.disabled) {
    ctx.fillStyle = '#ffd27f';
    const rv = Math.hypot(r.vx, r.vy);
    const lines = wrapText(`They are dead in space. Close within 200 km, match to under 90 km/s (now ${Math.round(rv)}), and ${Touch.on ? 'tap Hail' : 'press H'} to board.`, viewW - 32);
    lines.forEach((l, i) => ctx.fillText(l, viewW / 2, top + 54 + i * 16));
  }
  const bx = 16, by = H - (Touch.on ? 250 : 70);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#9ab';
  ctx.fillText(`Thrust ${e.throttle}g of ${maxG(p)}g${Touch.on ? '' : ' (Q/E)'}  Torpedoes ${G.state.torpedoes || 0}${ship().launcher ? '' : ' (no launcher)'}`, bx, by);
  ctx.fillText('Crew strain', bx, by + 18);
  ctx.fillStyle = '#1a2533'; ctx.fillRect(bx + 96, by + 9, 160, 10);
  ctx.fillStyle = e.strain > 75 ? '#ff5a5a' : e.strain > 40 ? '#ffb347' : '#5fd35f';
  ctx.fillRect(bx + 96, by + 9, 160 * Math.min(1, e.strain / 100), 10);
  if (!Touch.on) { ctx.fillStyle = '#56687a'; ctx.fillText('W burn  A/D turn  S retrograde  Space guns  F torpedo  H hail/board', bx, by + 40); }
  // Recent messages, above the readouts.
  const recent = G.messages.slice(e.msgStart).filter(m => G.time - m.t < 8).slice(-4);
  recent.forEach((m, i) => { ctx.fillStyle = '#cfe3ff'; ctx.fillText(wrapText(m.text, viewW - 32)[0], bx, by - 20 - (recent.length - 1 - i) * 16); });
  // Strain greys out the edges; a blackout takes the whole screen.
  const dark = e.blackout > 0 ? 0.92 : Math.max(0, (e.strain - 60) / 40) * 0.5;
  if (dark > 0) {
    const gr = ctx.createRadialGradient(viewW / 2, H / 2, Math.min(viewW, H) * 0.15, viewW / 2, H / 2, Math.max(viewW, H) * 0.7);
    gr.addColorStop(0, `rgba(0,0,0,${e.blackout > 0 ? dark : 0})`); gr.addColorStop(1, `rgba(0,0,0,${dark})`);
    ctx.fillStyle = gr; ctx.fillRect(0, 0, viewW, H);
    if (e.blackout > 0) { ctx.fillStyle = '#ff5a5a'; ctx.textAlign = 'center'; ctx.font = `600 18px ${LABEL_FONT}`; ctx.fillText('BLACKOUT', viewW / 2, H / 2 - 40); }
  }
  ctx.restore();
}

Mods.register({
  id: 'burn-combat', name: 'Combat during burns (4b prototype)', builtin: true,
  init(M) {
    M.on('frame', dt => {
      const t = G.transit;
      if (G.mode === 'engage') return engageTick(dt);
      if (G.mode !== 'transit' || !t || !burnCombat()) return;
      if (G.engagePending && !G.dialog) { const s = G.engagePending; G.engagePending = null; return startEngage(s); }
      if (!t.interceptPlanned) planIntercept();
      if (t.intercept && !t.event && !G.dialog && t.total - t.left >= t.intercept.at) {
        const { spec } = t.intercept;
        t.intercept = null;
        openEvent(contactEvent(spec));
      }
    });
    M.on('key', code => {
      if (G.mode !== 'engage' || G.dialog) return;
      const e = G.engage;
      if (code === 'KeyF') playerTorpedo();
      else if (code === 'KeyH') engageHail();
      else if (code === 'KeyQ') e.throttle = Math.max(1, e.throttle - 1);
      else if (code === 'KeyE') e.throttle = Math.min(maxG(G.player), e.throttle + 1);
    });
    M.filter('dockButtons', html => `${html}<button data-action="combatMode">Combat: ${burnCombat() ? 'in burns' : 'classic'}</button>`);
    M.action('combatMode', () => { G.state.flags.classicCombat = burnCombat(); });
    // The old text-only pirate ambush becomes a real engagement in this mode.
    const ev = TRANSIT_EVENTS.find(x => x.title === 'Pirates Matching Course');
    if (ev) {
      for (const [label, flee] of [['Fight', false], ['Hard burn', true]]) {
        const c = ev.choices.find(x => x.label.startsWith(label)), old = c.run;
        c.run = () => {
          if (!burnCombat()) return old();
          G.engagePending = { spec: { kind: 'pirate' }, flee };
          return flee ? 'You wind the drive up past the redline. Crash couches, everyone.' : 'Battle stations.';
        };
      }
    }
  },
});
