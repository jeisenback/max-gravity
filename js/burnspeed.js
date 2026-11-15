'use strict';

// The burn at its own pace (#992, docs/superpowers/specs/2026-11-10-burn-speed-design.md). One ship day is SHIP_DAY burn seconds (shiplife.js), so a
// burn of `days` takes days * SHIP_DAY real seconds at 1x. The stages are spans of ship time: the crash couches at each end, and the flip (strapping
// in, weightless while she turns, strapping out) round the midpoint, played slowed so it lasts FLIP_REAL real seconds at any speed. The player
// pauses or runs the burn at 2x or 16x (#1083: 2x, at which the crew can still be watched walking, in place of 4x). These take the burn and the speed and return a value; transit.js and shiplife.js read G.

// Run ahead (#1186, docs/bible/burn.md): the burn as fast as it goes to the next scene or arrival, the flip still in its slow motion; an 8-day
// burn's cruise is over in about two and a half seconds. A scene that opens ends it, back at the speed it was run from (aheadFrom).
const RUN_AHEAD = 256;
const BURN_SPEEDS = [0, 1, 2, 16, RUN_AHEAD];  // paused, normal, the two fast-forwards, and run ahead
const COUCH_HOURS = 6, STRAP_MIN = 20, FLOAT_MIN = 6;  // ship time on the couches at each end; strapped in either side of the float; weightless
const FLIP_REAL = 25;  // real seconds for the whole flip, strap to strap, at any speed

// The burn's shape (#1195, docs/bible/burn.md, The burn's shape): hard on the couches at HARD_G up to the hull's cruise speed (its `cruise`, or
// CRUISE_KMS), the easy cruise to the flip at whatever g makes the trip its days, and the same back. A trip too short to reach the speed has
// the hard burn it can, keeping the cruise at CRUISE_MIN_G or more; the hard burn is at most HARD_MAX of the trip at each end. `dist` in km.
// Returns { hard (the share of the trip on the couches at each end), hardG, cruiseG, vHard (km/s at the end of the hard burn), peak (km/s
// at the flip) }. Pure.
const HARD_G = 1, CRUISE_KMS = 210, CRUISE_MIN_G = 0.03, HARD_MAX = 0.06, COUCH_SPEED = 16;  // COUCH_SPEED: the pace the clock runs on by itself on the couches
function burnShape(dist, days, vc = CRUISE_KMS) {
  const half = Math.max(1, days) * 86400 / 2, ah = HARD_G * G_KMS2, floor = CRUISE_MIN_G * G_KMS2;
  const cruise = th => { const tc = half - th; return 2 * (dist / 2 - ah * th * th / 2 - ah * th * tc) / (tc * tc); };  // the cruise's acceleration after a hard burn of th seconds
  let th = Math.min(vc / ah, HARD_MAX * 2 * half);
  if (cruise(th) < floor) { let lo = 0, hi = th; for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (cruise(m) >= floor) lo = m; else hi = m; } th = lo; }
  const ac = Math.max(0, cruise(th));
  return { hard: th / (2 * half), hardG: HARD_G, cruiseG: ac / G_KMS2, vHard: ah * th, peak: ah * th + ac * (half - th) };
}

// The stages as shares of the burn: `couch` at each end (the shape's hard burn, `hard`; six hours on a burn with none, as before #1195), `secure`
// and `float` as half-widths round the midpoint (`secure` the whole flip, strap and float). A span longer than today's share of the burn is held to it.
function burnStages(days, hard) {
  return {
    couch: hard !== undefined ? hard : Math.min(HARD_MAX, COUCH_HOURS / (24 * days)),
    secure: Math.min(0.06, (FLOAT_MIN / 2 + STRAP_MIN) / (1440 * days)),
    float: Math.min(0.03, FLOAT_MIN / 2 / (1440 * days)),
  };
}

// The stage at a share `pr` of the burn: on the couches, strapped in, weightless, or free to move.
function stageAt(days, pr, hard) {
  const s = burnStages(days, hard), off = Math.abs(pr - 0.5);
  return pr < s.couch || pr > 1 - s.couch ? 'couch' : off < s.float ? 'float' : off < s.secure ? 'secure' : 'move';
}

// The star streaks at the flip (#962): a share of their length and light, STREAK_HUSH while the crew are strapped in and weightless (the `secure`
// span), easing back to 1 over as long again either side, so the view does not pull the eye off the ship when the people in it do the most.
const STREAK_HUSH = 0.35;
function streakHush(days, pr) {
  const sec = burnStages(days).secure, off = Math.abs(pr - 0.5);
  return off <= sec ? STREAK_HUSH : off >= 2 * sec ? 1 : STREAK_HUSH + (1 - STREAK_HUSH) * (off - sec) / sec;
}

// Burn seconds per real second, with `speed` from BURN_SPEEDS and `drive` the drive's rate (engineering.js burnSpeed): the speed, or none paused;
// in the flip the rate that makes it last FLIP_REAL; on the couches at least COUCH_SPEED, the clock running on by itself (#1195).
function burnRate(t, speed, drive) {
  if (!speed) return 0;
  const st = burnStages(t.days, t.hard), pr = 1 - t.left / t.total;
  if (Math.abs(pr - 0.5) <= st.secure + 1e-9) return 2 * st.secure * t.total / (FLIP_REAL * drive);  // the first instant in, give or take a float
  return pr < st.couch || pr > 1 - st.couch ? Math.max(speed, COUCH_SPEED) : speed;
}

// Burn seconds a frame of `dt` real seconds moves the burn on: dt at its rate, except that a step from before the flip stops at its first
// instant, so none of the flip goes by at speed, and a step on the hard burn out stops at its end, so none of the cruise goes by at its pace
// (#1195). The burn's `left` falls by this times `drive`.
function burnStep(t, speed, drive, dt) {
  const st = burnStages(t.days, t.hard), step = dt * burnRate(t, speed, drive), start = (0.5 - st.secure) * t.total, done = t.total - t.left, up = st.couch * t.total;
  const stop = done < up ? up + 1e-6 : done < start ? start : Infinity;  // a hair past the couches' end, so rounding does not leave it short of it
  return Math.min(step, Math.max(0, stop - done) / drive);
}

// Real seconds to arrival at `speed` (the time at 1x when paused): the cruise at the speed, the couches still ahead at COUCH_SPEED or more, and
// what is still ahead of the flip at FLIP_REAL.
function realLeft(t, speed, drive) {
  const st = burnStages(t.days, t.hard), sec = st.secure, pr = 1 - t.left / t.total, s = speed || 1;
  const ahead = Math.max(0, 0.5 + sec - Math.max(pr, 0.5 - sec)), couch = Math.max(0, st.couch - Math.max(0, pr - (1 - st.couch))) + Math.max(0, st.couch - pr);
  const cruise = Math.max(0, t.left - (ahead + couch) * t.total);
  return cruise / (s * drive) + couch * t.total / (Math.max(s, COUCH_SPEED) * drive) + ahead / (2 * sec) * FLIP_REAL;
}

// Today's length of a burn, before #992: what the number of scenes and the ship's wear, heat and projects per trip are kept at.
const oldBurnSeconds = days => Math.max(60, lifeSlotCount(days) * 30);
const burnSceneCount = days => 1 + Math.floor(oldBurnSeconds(days) / 40);

// A frame's time on the burn, for the callers that read G: burn seconds on the burn's clock (none while a scene holds it), the ship's
// per-trip ticks at today's pace (wear, heat, projects, programs), and ship life, which goes on at normal speed under a scene so the crew
// can walk to it.
const burnDt = dt => { const t = G.transit; return !t || t.event || G.dialog ? 0 : burnStep(t, G.speed, burnSpeed(), dt); };
const paceDt = dt => (G.transit ? burnDt(dt) * G.transit.pace : 0);
const lifeDt = dt => { const t = G.transit; return !t ? dt : t.event || G.dialog ? dt : dt * burnRate(t, G.speed, burnSpeed()); };

// ---------- the controls: Space, 1, 2 and 3 in a burn (game.js), and a button for each speed under the burn bar ----------
const BURN_KEYS = { Digit1: 1, Digit2: 2, Digit3: 16, Digit4: RUN_AHEAD };
const BURN_LABELS = { 0: 'Pause', 1: '1x', 2: '2x', 16: '16x', [RUN_AHEAD]: '\u00bb' };  // run ahead as a sign: the row stays narrow enough to keep clear of her name on the nose at 1000px (hulldetail.js, #936)
const BURN_TITLES = { [RUN_AHEAD]: 'Run ahead (4)' };
function setBurnSpeed(s) {
  if (!BURN_SPEEDS.includes(s)) return;
  if (s === RUN_AHEAD && G.speed !== RUN_AHEAD && G.transit) G.transit.aheadFrom = G.speed && G.speed !== RUN_AHEAD ? G.speed : G.speedBefore !== RUN_AHEAD && G.speedBefore ? G.speedBefore : 1;  // the speed it goes back to
  if (s) G.speedBefore = s;
  G.speed = s;
}
// A scene that opens on a burn ends a run ahead, at the speed it was run from.
function endRunAhead() {
  if (G.mode === 'transit' && G.transit && (G.speed === RUN_AHEAD || G.speedBefore === RUN_AHEAD)) { const back = G.transit.aheadFrom || 1; G.speedBefore = back; if (G.speed) G.speed = back; }
}
const toggleBurnPause = () => setBurnSpeed(G.speed ? 0 : G.speedBefore || 1);
// Shown when the burn's station keys are (bridge.js syncBridge), at the right end of the burn bar and under it; the chosen speed lit.
function syncBurnSpeed() {
  const el = document.getElementById('bspeed');
  if (!el) return;
  const box = G.burnBoxes && G.burnBoxes.bar, show = G.mode === 'transit' && !!G.transit && !G.transit.event && !G.dialog && !G.paused && !!box;
  el.hidden = !show;
  if (!show) return;
  el.style.top = `${box.y + box.h + 6}px`; el.style.left = `${box.x + box.w - el.offsetWidth}px`;
  el.querySelectorAll('button').forEach(b => b.classList.toggle('active', Number(b.dataset.speed) === G.speed));
}

Mods.register({
  id: 'burnspeed', name: 'Burn speed', builtin: true,
  init(M) {
    const el = Object.assign(document.createElement('div'), { id: 'bspeed', hidden: true });
    el.innerHTML = BURN_SPEEDS.map(s => `<button data-speed="${s}"${BURN_TITLES[s] ? ` title="${BURN_TITLES[s]}" aria-label="${BURN_TITLES[s]}"` : ''}>${BURN_LABELS[s]}</button>`).join('');
    el.addEventListener('click', e => { const b = e.target.closest('[data-speed]'); if (b) { Sfx.click(); setBurnSpeed(Number(b.dataset.speed)); b.blur(); } });  // blurred, so Space toggles the pause and does not press it again
    document.body.appendChild(el);
    M.on('frame', syncBurnSpeed);
    M.on('eventOpened', endRunAhead);
  },
});
