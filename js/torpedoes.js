'use strict';

// Torpedoes and point defense. A Torpedo launcher outfit fires homing torpedoes at
// your target (F, or TORP on touch); torpedoes are bought as ammunition at outfitters.
// They leave the rail slow, then accelerate past anything with a drive, and hit hard.
// Point defense shoots them down: each Point-defense cannon you fit is also an
// automatic turret, and heavier NPC ships (two guns or more) carry one too. Ordinary
// gunfire can hit torpedoes as well. Corsairs, cutters, and destroyers launch
// torpedoes of their own. Loaded before game.js; only calls into it at runtime.

const TORP_MAX = 6, TORP_PRICE = 400;
const TORP = { accel: 520, maxSpeed: 540, turn: 2.8, life: 7, playerDmg: 60, npcDmg: 45 };
const NPC_TORPS = { corsair: 1, cutter: 1, destroyer: 3, gunship: 2 };
const PD_RANGE = 300, PD_SPEED = 1100, PD_SPREAD = 0.12, PD_RATE = 0.25;  // tuned so one turret stops about two torpedoes in three

// Which side a ship fights on, for torpedoes and point defense.
const sideOf = o => (o === G.player || o.kind === 'escort' ? 'friend' : 'foe');

function launch(owner, target) {
  const a = owner.angle, s = SHIPS[owner.shipId];
  G.torps.push({
    x: owner.x + Math.cos(a) * s.size * 2, y: owner.y + Math.sin(a) * s.size * 2,
    vx: owner.vx + Math.cos(a) * 80, vy: owner.vy + Math.sin(a) * 80, angle: a,
    target, side: sideOf(owner), life: TORP.life,
    dmg: owner === G.player ? TORP.playerDmg : TORP.npcDmg,
  });
  if (G.player && dist(owner, G.player) < 1400) Sfx.hiss(1800, 250, 0.45, owner === G.player ? 0.2 : 0.1);
}

function fireTorpedo() {
  const st = G.state, p = G.player;
  if (!ship().launcher) return msg('No torpedo launcher fitted. Outfitters sell them.');
  if (!(st.torpedoes > 0)) return msg('Torpedo tubes are empty. Load more at an outfitter.');
  if (!G.target || G.target.dead) return msg('No target for the torpedo. Select one first (Tab, or tap a ship).');
  if ((p.torpCd || 0) > 0) return;
  st.torpedoes--;
  p.torpCd = 0.8;
  launch(p, G.target);
  msg(`Torpedo away: ${st.torpedoes} left.`);
}

// Hostile NPCs with torpedoes launch at you or your escorts now and then.
function npcLaunches(dt) {
  const friends = [G.player, ...G.npcs.filter(n => n.kind === 'escort')].filter(o => o && !o.dead);
  for (const n of G.npcs) {
    if (n.torps === undefined) { n.torps = NPC_TORPS[n.shipId] || 0; n.torpCd = rand(3, 7); }
    if (!n.hostile || n.disabled || n.torps <= 0 || (n.torpCd -= dt) > 0) continue;
    const t = friends.filter(f => dist(f, n) < 900 && dist(f, n) > 250).sort((a, b) => dist(a, n) - dist(b, n))[0];
    if (!t) continue;
    n.torps--;
    n.torpCd = rand(8, 12);
    launch(n, t);
    if (t === G.player) msg(`${n.name} launched a torpedo at you!`);
  }
}

// Point defense: each turret takes a quick shot at the nearest torpedo coming its way.
function pointDefense(dt) {
  const shooters = [];
  if (G.player && !G.player.dead && G.state.outfits.pdc) shooters.push([G.player, G.state.outfits.pdc]);
  for (const n of G.npcs) if (!n.dead && !n.disabled && SHIPS[n.shipId].guns >= 2) shooters.push([n, 1]);
  for (const [o, turrets] of shooters) {
    if ((o.pdCd = (o.pdCd || 0) - dt) > 0) continue;
    // Your turret and your escorts' cover anything coming at your side; other ships only defend themselves.
    const side = sideOf(o), covers = side === 'friend';
    const t = G.torps.filter(t => t.side !== side && (covers || t.target === o) && dist(t, o) < PD_RANGE).sort((a, b) => dist(a, o) - dist(b, o))[0];
    if (!t) continue;
    o.pdCd = PD_RATE / turrets;
    const lead = dist(t, o) / PD_SPEED, ax = t.x + t.vx * lead - o.x, ay = t.y + t.vy * lead - o.y, a = Math.atan2(ay, ax) + rand(-PD_SPREAD, PD_SPREAD);
    G.shots.push({ x: o.x, y: o.y, vx: o.vx + Math.cos(a) * PD_SPEED, vy: o.vy + Math.sin(a) * PD_SPEED, life: 0.35,
      hits: 'torps', pdSide: side, dmg: 0, team: side === 'friend' ? 'player' : 'hostile' });
  }
}

function blowUp(t, big) {
  burst(t.x, t.y, big ? 18 : 8, ['#fff', '#ffd27f', '#ff8c3a'], big ? 220 : 140);
  G.particles.push({ type: 'flash', x: t.x, y: t.y, vx: 0, vy: 0, life: 0.15, max: 0.15, size: big ? 40 : 18 });
  t.life = 0;
}

function updateTorpedoes(dt) {
  G.torps = G.torps || [];
  if (!['flight', 'departing'].includes(G.mode)) return;
  if (G.player && G.player.torpCd > 0) G.player.torpCd -= dt;
  npcLaunches(dt);
  pointDefense(dt);
  for (const t of G.torps) {
    t.life -= dt;
    if (t.target && !t.target.dead) {
      const want = Math.atan2(t.target.y - t.y, t.target.x - t.x);
      const off = wrapAngle(want - t.angle);
      t.angle += Math.max(-TORP.turn * dt, Math.min(TORP.turn * dt, off));
    }
    t.vx += Math.cos(t.angle) * TORP.accel * dt;
    t.vy += Math.sin(t.angle) * TORP.accel * dt;
    const sp = Math.hypot(t.vx, t.vy);
    if (sp > TORP.maxSpeed) { t.vx *= TORP.maxSpeed / sp; t.vy *= TORP.maxSpeed / sp; }
    t.x += t.vx * dt; t.y += t.vy * dt;
    if (Math.random() < dt * 30) G.particles.push({ type: 'smoke', x: t.x, y: t.y, vx: -t.vx * 0.1, vy: -t.vy * 0.1, life: 0.5, max: 0.5, size: 1.5, grow: 4 });

    // Shot down: point defense, or any gunfire from the other side.
    for (const sh of G.shots) {
      if (sh.life <= 0 || Math.hypot(sh.x - t.x, sh.y - t.y) > 5) continue;
      const from = sh.pdSide || (sh.byPlayer ? 'friend' : sh.hits === 'player' ? 'foe' : null);
      if (!from || from === t.side) continue;
      sh.life = 0;
      blowUp(t, false);
      break;
    }
    if (t.life <= 0) continue;

    // Impact on the target, or anything else on the target's side it runs into.
    const hit = [G.player, ...G.npcs].find(o => o && !o.dead && sideOf(o) !== t.side
      && (t.side === 'foe' || o === t.target || o.hostile) && dist(o, t) < SHIPS[o.shipId].size + 5);
    if (hit) {
      const byPlayer = t.side === 'friend';
      if (byPlayer && hit !== G.player && !hit.hostile) {  // torpedoing the innocent has the usual consequences
        hit.hostile = true;
        if (hit.kind === 'patrol') changeRep(hit.gov, -8);
        else if (hit.kind === 'trader') changeRep(localGov(), -3);
      }
      hit.hitAngle = Math.atan2(t.y - hit.y, t.x - hit.x);
      blowUp(t, true);
      if (hit === G.player) shake(8);
      Sfx.boom(hit);
      damage(hit, t.dmg, byPlayer);
    }
  }
  G.torps = G.torps.filter(t => t.life > 0);
  G.shots = G.shots.filter(s => s.life > 0);
}

function drawTorpedoes(toScreen) {
  for (const t of G.torps || []) {
    const [x, y] = toScreen(t);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(t.angle);
    ctx.fillStyle = t.side === 'friend' ? '#bfe6ff' : '#ffb0a0';
    ctx.fillRect(-5, -1.5, 9, 3);
    ctx.fillStyle = 'rgba(255,220,150,0.9)';
    ctx.beginPath(); ctx.arc(-6, 0, 2 + Math.random(), 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}

// ---------- buying torpedoes ----------
function torpedoShopHtml() {
  const st = G.state;
  if (!ship().launcher) return '';
  const have = st.torpedoes || 0, room = TORP_MAX - have, fill = Math.min(room, Math.floor(st.credits / TORP_PRICE));
  return `<div class="mission">
    <div><b>Torpedoes</b> <span class="hint">${have}/${TORP_MAX} loaded</span>
      <div class="hint">Homing torpedoes for your launcher. ${fmt(TORP_PRICE)} cr each.</div></div>
    <div class="row" style="margin:0">
      <button data-action="torpbuy" data-arg="1" ${room > 0 && st.credits >= TORP_PRICE ? '' : 'disabled'}>Buy 1</button>
      <button data-action="torpbuy" data-arg="${fill}" ${fill > 0 ? '' : 'disabled'}>Fill (${fmt(fill * TORP_PRICE)})</button>
    </div></div>`;
}

Mods.register({
  id: 'torpedoes', name: 'Torpedoes and point defense', builtin: true,
  init(M) {
    M.on('frame', updateTorpedoes);
    M.on('drawWorld', drawTorpedoes);
    M.on('enterSystem', () => { G.torps = []; });
    M.on('landed', () => { G.torps = []; });
    M.on('key', code => { if (code === 'KeyF' && G.mode === 'flight') fireTorpedo(); });
    M.action('torpbuy', n => {
      const st = G.state, q = Math.min(Number(n), TORP_MAX - (st.torpedoes || 0), Math.floor(st.credits / TORP_PRICE));
      st.torpedoes = (st.torpedoes || 0) + q;
      st.credits -= q * TORP_PRICE;
    });
    // A TORP button on touch screens, shown when a launcher is fitted. The touch
    // controls are built at boot, after this runs, so it is added on the first frame.
    let b = null;
    M.on('frame', () => {
      if (!b) {
        const row = document.querySelector('#touch .tbtns');
        if (!row) return;
        b = Object.assign(document.createElement('button'), { textContent: 'Torp', hidden: true });
        b.addEventListener('pointerdown', e => { e.preventDefault(); if (G.mode === 'flight') fireTorpedo(); else if (G.mode === 'engage') playerTorpedo(); });
        row.appendChild(b);
      }
      const hide = !ship().launcher;
      if (b.hidden !== hide) b.hidden = hide;
    });
  },
});
