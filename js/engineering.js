'use strict';

// The engineer's post: where the reactor's output goes (drive, weapons, shields), and
// the heat the drive builds during a burn. A manual engineer moves the sliders and
// watches the heat: past 100 the reactor scrams, the drive drops to a crawl, and the hull
// takes a knock. A crewed engineer keeps the heat down on their own (a better one lets it
// run hotter first) and takes orders: favor the drive, the guns, or the shields.
// Drive power also sets the burn's speed, its reaction mass use, and how easily pirates spot
// you. Weapons power sharpens "run guns", drive power "run dark", shields soften the hits
// the console fights deal out (duel.js). Loaded before game.js; only calls into it at runtime.

const POWER_MIN = 10, POWER_MAX = 80;
const POWER_PRESETS = {
  'favor-drive': { name: 'Favor the drive', label: 'the drive', to: { drive: 60, weapons: 20, shields: 20 } },
  'favor-guns': { name: 'Favor the guns', label: 'the guns', to: { drive: 25, weapons: 50, shields: 25 } },
  'favor-shields': { name: 'Favor the shields', label: 'the shields', to: { drive: 25, weapons: 25, shields: 50 } },
  balance: { name: 'Balance the load', label: 'an even load', to: { drive: 40, weapons: 30, shields: 30 } },
};

const power = () => { const st = G.state; return st.power = st.power || { drive: 40, weapons: 30, shields: 30 }; };

// Set one share; the others give up or take the difference in proportion. Always 100 in all.
function setPower(key, value) {
  const p = power(), v = Math.max(POWER_MIN, Math.min(POWER_MAX, Math.round(value)));
  const others = Object.keys(p).filter(k => k !== key), sum = others.reduce((t, k) => t + p[k], 0);
  for (const k of others) p[k] = Math.max(POWER_MIN, Math.round(p[k] / sum * (100 - v)));
  p[key] = v;
  const off = 100 - Object.values(p).reduce((t, x) => t + x, 0);
  others.sort((a, b) => p[b] - p[a]);
  p[others[0]] += off;
}

for (const [id, pre] of Object.entries(POWER_PRESETS)) {
  (ORDERS.engineer = ORDERS.engineer || []).push({
    id, name: pre.name, sure: true, desc: `Put the reactor's output behind ${pre.label}.`,
    can: () => Object.entries(pre.to).some(([k, v]) => power()[k] !== v),
    run(ok, doer) {
      Object.assign(power(), pre.to);
      return `${doer ? doer.first || doer.name : 'You'} put${doer ? 's' : ''} the reactor's output behind ${pre.label}.`;
    },
  });
}

// What the drive's share does to a burn. 40% is the usual: speed 1, fuel as plotted, seen as usual.
const SCAN_MAX = 1 + (POWER_MAX - 40) * 0.012;  // how visible the hottest drive is
const burnSpeed = () => (1 + (power().drive - 40) * 0.008) * perf('drive') * (G.state.tuned ? 1.1 : 1);  // a worn drive is slower (wear.js)
const scanVisibility = () => 1 + (power().drive - 40) * 0.012;

// Days a burn took, and the date it will end: a faster burn ends sooner.
const transitDays = t => Math.max(1, Math.round(t.days * (t.elapsed || t.total) / t.total));
const transitNow = t => G.state.day + Math.floor(t.days * (t.elapsed || 0) / t.total);
const transitEta = t => G.state.day + Math.max(1, Math.round(t.days * ((t.elapsed || 0) + Math.max(0, t.left) / burnSpeed()) / t.total));

const heat = () => G.state.heat || 0;
const heatLimit = () => 75 + 5 * roleSkill('engineer');

function overload() {
  const st = G.state, p = power();
  st.heat = 50;
  setPower('drive', POWER_MIN);
  st.armor = Math.max(1, st.armor - Math.round(ship().armor * 0.05));
  const text = `Reactor scram. The drive drops to ${p.drive}% while the coolant catches up, and the hull takes a knock from the shock.`;
  comm(`[Engineering] ${text}`);
  msg(text);
}

function engineeringTick(dt) {
  const st = G.state, t = G.transit;
  if (!dt || G.mode !== 'transit' || !t || t.event || G.dialog) return;
  const p = power();
  st.heat = Math.max(0, heat() + dt * (p.drive - 45) * 0.06 * (p.drive > 45 ? 2 - perf('drive') : 1));  // a worn drive runs hotter
  if (postMode('engineer') === 'crewed' && st.heat > heatLimit() && p.drive > 40) {  // 40 is where the reactor stops heating
    setPower('drive', 40);
    comm(`[Engineering] ${roleName('engineer')} eases the drive back to ${p.drive}% to let the reactor cool.`);
  }
  if (st.heat >= 100) overload();
  // A hot drive burns more reaction mass per distance, a cool one less. Dry tanks throttle it back.
  if (t.fuelCost) {
    t.fuelOwed = (t.fuelOwed || 0) + t.fuelCost * (p.drive - 40) / 100 * dt * burnSpeed() / t.total;  // settled in whole units
    const whole = Math.trunc(t.fuelOwed);
    t.fuelOwed -= whole;
    st.fuel = Math.max(0, Math.min(ship().fuel, st.fuel - whole));
    if (st.fuel <= 0 && p.drive > 40) {
      setPower('drive', 40);
      comm('[Engineering] Reaction mass is nearly gone. The drive is throttled back to an even load.');
    }
  }
}

// The Engineering station: power (sliders for a manual engineer), heat, and the post.
const POWER_NAMES = { drive: 'Drive', weapons: 'Weapons', shields: 'Shields' };
function engineerPanel() {
  const p = power(), manual = postMode('engineer') === 'manual';
  const row = k => manual
    ? `<label class="slider"><span>${POWER_NAMES[k]}</span><input type="range" min="${POWER_MIN}" max="${POWER_MAX}" value="${p[k]}" data-power="${k}"><span class="mono" data-power-val="${k}">${p[k]}%</span></label>`
    : `<div class="slider"><span>${POWER_NAMES[k]}</span><span class="pbar"><i style="width:${p[k]}%"></i></span><span class="mono" data-power-val="${k}">${p[k]}%</span></div>`;
  return `<div class="power">
    <div class="eyebrow">Power &middot; ${manual ? 'you set it' : `${roleName('engineer')} runs it`}</div>
    ${['drive', 'weapons', 'shields'].map(row).join('')}
    <div class="slider"><span>Heat</span><span class="pbar" data-heat-bar><i></i></span><span class="mono" data-heat></span></div>
    <p class="hint" data-effects>${powerEffects()}</p>
    <p class="hint">Drive power also sharpens running dark. Weapons power sharpens running guns. Shields soften the hits you take in a console fight.</p>
  </div>${wearHtml()}${projectsHtml('engineer')}${postHtml('engineer')}`;
}

const powerEffects = () => {
  const d = power().drive - 40, v = scanVisibility();
  return `Burn speed ${burnSpeed().toFixed(2)}x. Reaction mass use ${d >= 0 ? '+' : ''}${d}%. Heat ${d > 5 ? 'builds' : d < -5 ? 'drains' : 'holds'}. Pirates spot you ${v < 0.85 ? 'rarely' : v < 1.15 ? 'as usual' : 'easily'}.`;
};

// Live numbers, filled in without rebuilding the panel so a slider can be dragged.
function engineeringReadouts() {
  const h = Math.round(Math.min(100, heat()));
  for (const el of document.querySelectorAll('[data-heat]')) el.textContent = `${h}%`;
  for (const el of document.querySelectorAll('[data-heat-bar]')) { el.firstElementChild.style.width = `${h}%`; el.classList.toggle('hot', h >= heatLimit()); }
}

function powerInput(e) {
  const k = e.target.dataset && e.target.dataset.power;
  if (!k) return;
  setPower(k, Number(e.target.value));
  const p = power();
  for (const el of document.querySelectorAll('[data-power]')) el.value = p[el.dataset.power];
  for (const el of document.querySelectorAll('[data-power-val]')) el.textContent = `${p[el.dataset.powerVal]}%`;
  for (const el of document.querySelectorAll('[data-effects]')) el.textContent = powerEffects();
}

Mods.register({
  id: 'engineering', name: 'Engineering', builtin: true,
  init(M) {
    UI.el.addEventListener('input', powerInput);
    M.on('frame', dt => { engineeringTick(dt); engineeringReadouts(); });
    M.on('landed', () => { G.state.heat = 0; });
  },
});
