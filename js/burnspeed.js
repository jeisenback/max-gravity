'use strict';

// The burn at its own pace (#992, docs/superpowers/specs/2026-11-10-burn-speed-design.md). One ship day is SHIP_DAY burn seconds (shiplife.js), so a
// burn of `days` takes days * SHIP_DAY real seconds at 1x. The stages are spans of ship time: the crash couches at each end, and the flip (strapping
// in, weightless while she turns, strapping out) round the midpoint, played slowed so it lasts FLIP_REAL real seconds at any speed. The player
// pauses or runs the burn at 4x or 16x. These take the burn and the speed and return a value; transit.js and shiplife.js read G.

const BURN_SPEEDS = [0, 1, 4, 16];  // paused, normal, and the two fast-forwards
const COUCH_HOURS = 6, STRAP_MIN = 20, FLOAT_MIN = 6;  // ship time on the couches at each end; strapped in either side of the float; weightless
const FLIP_REAL = 25;  // real seconds for the whole flip, strap to strap, at any speed

// The stages as shares of the burn: `couch` at each end, `secure` and `float` as half-widths round the midpoint (`secure` the whole flip, strap and
// float). A span longer than today's share of the burn is held to it.
function burnStages(days) {
  return {
    couch: Math.min(0.06, COUCH_HOURS / (24 * days)),
    secure: Math.min(0.06, (FLOAT_MIN / 2 + STRAP_MIN) / (1440 * days)),
    float: Math.min(0.03, FLOAT_MIN / 2 / (1440 * days)),
  };
}

// The stage at a share `pr` of the burn: on the couches, strapped in, weightless, or free to move.
function stageAt(days, pr) {
  const s = burnStages(days), off = Math.abs(pr - 0.5);
  return pr < s.couch || pr > 1 - s.couch ? 'couch' : off < s.float ? 'float' : off < s.secure ? 'secure' : 'move';
}

// Burn seconds per real second, with `speed` from BURN_SPEEDS and `drive` the drive's rate (engineering.js burnSpeed): the speed, or none paused,
// and in the flip the rate that makes it last FLIP_REAL.
function burnRate(t, speed, drive) {
  if (!speed) return 0;
  const sec = burnStages(t.days).secure;
  return Math.abs(1 - t.left / t.total - 0.5) <= sec + 1e-9 ? 2 * sec * t.total / (FLIP_REAL * drive) : speed;  // the first instant in, give or take a float
}

// Burn seconds a frame of `dt` real seconds moves the burn on: dt at its rate, except that a step from before the flip stops at its first
// instant, so none of the flip goes by at speed. The burn's `left` falls by this times `drive`.
function burnStep(t, speed, drive, dt) {
  const step = dt * burnRate(t, speed, drive), start = (0.5 - burnStages(t.days).secure) * t.total, done = t.total - t.left;
  return done < start ? Math.min(step, (start - done) / drive) : step;
}

// Real seconds to arrival at `speed` (the time at 1x when paused): the cruise at the speed, and what is still ahead of the flip at FLIP_REAL.
function realLeft(t, speed, drive) {
  const sec = burnStages(t.days).secure, pr = 1 - t.left / t.total;
  const ahead = Math.max(0, 0.5 + sec - Math.max(pr, 0.5 - sec)), cruise = Math.max(0, t.left - ahead * t.total);
  return cruise / ((speed || 1) * drive) + ahead / (2 * sec) * FLIP_REAL;
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
const BURN_KEYS = { Digit1: 1, Digit2: 4, Digit3: 16 };
const BURN_LABELS = { 0: 'Pause', 1: '1x', 4: '4x', 16: '16x' };
function setBurnSpeed(s) {
  if (!BURN_SPEEDS.includes(s)) return;
  if (s) G.speedBefore = s;
  G.speed = s;
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
    el.innerHTML = BURN_SPEEDS.map(s => `<button data-speed="${s}">${BURN_LABELS[s]}</button>`).join('');
    el.addEventListener('click', e => { const b = e.target.closest('[data-speed]'); if (b) { Sfx.click(); setBurnSpeed(Number(b.dataset.speed)); b.blur(); } });  // blurred, so Space toggles the pause and does not press it again
    document.body.appendChild(el);
    M.on('frame', syncBurnSpeed);
  },
});
