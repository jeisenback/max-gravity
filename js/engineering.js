'use strict';

// The engineer's post: where the reactor's output goes (drive, weapons, shields), and
// the heat the drive builds during a burn. A manual engineer moves the sliders and
// watches the heat: past 100 the reactor scrams, the drive drops to a crawl, and the hull
// takes a knock. A crewed engineer keeps the heat down on their own (a better one lets it
// run hotter first) and takes orders: favor the drive, the guns, or the shields.
// Drive power also sets the burn's speed, its reaction mass use, and how easily pirates spot
// you. In a console fight (duel.js) weapons power adds gun runs to the deck, drive power adds
// evasive burns, and shields of 40% or more give a deflector that soaks the first half hit.
// Loaded before game.js; only calls into it at runtime.

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
    can: () => Object.entries(pre.to).some(([k, v]) => power()[k] !== v), idle: 'The reactor is already set that way.',
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

// The Engineering station, as a console: the plant schematic on the display, heat and condition beside it,
// and the power channels and the post's orders along the bottom.
const POWER_NAMES = { drive: 'Drive', weapons: 'Weapons', shields: 'Shields' };

// A side view of the ship. Each conduit's width is that power share; each system takes the color of its condition.
function plantSvg() {
  const p = power(), c = condition(), w = s => 2 + s / 80 * 9, a = s => 0.35 + s / 80 * 0.65, col = k => condColor(c[k]);
  return `${hullSvg()}
  <rect x="150" y="128" width="170" height="44" rx="6" fill="#0a1320" stroke="#34506e"/>
  <text class="lbl" x="235" y="154" fill="#7f95ab" font-size="11" text-anchor="middle" letter-spacing="2">REACTOR</text>
  <path d="M150 140 L96 140" stroke="${col('drive')}" stroke-width="${w(p.drive)}" opacity="${a(p.drive)}" stroke-linecap="round"/>
  <path d="M320 138 L380 120 L430 120" stroke="${col('fire')}" stroke-width="${w(p.weapons)}" opacity="${a(p.weapons)}" fill="none" stroke-linecap="round"/>
  <path d="M320 164 L380 180 L440 180" stroke="${col('shields')}" stroke-width="${w(p.shields)}" opacity="${a(p.shields)}" fill="none" stroke-linecap="round"/>
  <path d="M70 150 L34 128 L34 172 Z" fill="#0a1320" stroke="${col('drive')}" stroke-width="2"/>
  <path d="M30 150 L${Math.max(6, 30 - p.drive * 0.3).toFixed(0)} 150" stroke="#6fb0ff" stroke-width="${(w(p.drive) + 2).toFixed(1)}" opacity="${a(p.drive).toFixed(2)}" stroke-linecap="round"/>
  <rect x="400" y="100" width="44" height="22" rx="3" fill="#0a1320" stroke="${col('fire')}" stroke-width="2"/><line x1="444" y1="111" x2="486" y2="111" stroke="${col('fire')}" stroke-width="3"/>
  <circle cx="440" cy="180" r="9" fill="#0a1320" stroke="${col('shields')}" stroke-width="2"/><circle cx="300" cy="190" r="6" fill="#0a1320" stroke="${col('shields')}" stroke-width="2"/><circle cx="200" cy="112" r="6" fill="#0a1320" stroke="${col('shields')}" stroke-width="2"/>
  <ellipse cx="330" cy="150" rx="${(200 * (0.5 + p.shields / 160)).toFixed(0)}" ry="${(90 * (0.5 + p.shields / 160)).toFixed(0)}" fill="none" stroke="${col('shields')}" stroke-dasharray="4 7" opacity="${(a(p.shields) * 0.6).toFixed(2)}"/>
  <circle cx="500" cy="150" r="22" fill="#0a1320" stroke="${col('life')}" stroke-width="2"/><circle cx="500" cy="150" r="10" fill="none" stroke="${col('life')}" stroke-dasharray="3 3"/>
  <line x1="580" y1="140" x2="612" y2="108" stroke="${col('sensors')}" stroke-width="3"/><circle cx="614" cy="106" r="6" fill="#0a1320" stroke="${col('sensors')}" stroke-width="2"/>
  <g class="lbl" font-size="11" fill="#7f95ab" letter-spacing="1"><text x="26" y="206">DRIVE</text><text x="420" y="92">FIRE CTRL</text><text x="410" y="214">SHIELDS</text><text x="476" y="190">LIFE</text><text x="520" y="70">SENSORS</text></g>
  <text x="14" y="24" fill="#7f95ab" font-size="11" letter-spacing="2">PLANT SCHEMATIC</text>
  <text class="lbl" x="14" y="282" fill="#4b617a" font-size="10">Conduit width is the power share. Color is the system's condition.</text>`;
}
const plantSig = () => `${Object.values(power())}|${Object.values(condition()).map(x => condColor(x))}`;

// The three effects of the drive's share: speed, reaction mass, and how easily pirates spot you.
function effectRows() {
  const d = power().drive - 40, v = scanVisibility();
  return conRead('Burn speed', `${burnSpeed().toFixed(2)}x`, 'data-eff="speed"')
    + conRead('Reaction mass use', `${d >= 0 ? '+' : ''}${d}%`, 'data-eff="fuel"')
    + conRead('Pirates spot you', v < 0.85 ? 'rarely' : v < 1.15 ? 'as usual' : 'easily', 'data-eff="scan"');
}

function engineerPanel() {
  const p = power(), manual = postMode('engineer') === 'manual' && !notYours('engineer');
  const channel = k => `<div class="con-chan"><label><span>${POWER_NAMES[k]}</span><b data-power-val="${k}">${p[k]}%</b></label>${manual
    ? `<input type="range" min="${POWER_MIN}" max="${POWER_MAX}" value="${p[k]}" data-power="${k}" aria-label="${POWER_NAMES[k]} power"><div class="con-ticks"><span>${POWER_MIN}</span><span>${POWER_MAX}</span></div>`
    : `<span class="con-bar" data-power-bar="${k}"><i style="width:${p[k]}%"></i></span>`}</div>`;
  const st = G.state, s = ship();
  return consoleHtml({
    title: 'Engineering',
    status: manual ? 'You run the plant' : `${roleName('engineer')} runs the plant`,
    screen: `<svg class="con-plant" data-plant data-sig="${plantSig()}" viewBox="0 0 640 300" role="img" aria-label="Ship systems diagram">${plantSvg()}</svg>`,
    side: conCard('Reactor heat', `${gaugeSvg('heat', Math.round(Math.min(100, heat())), heatLimit())}${effectRows()}`)
      + conCard('Systems', wearHtml()),
    controls: `<div class="con-chans">${['drive', 'weapons', 'shields'].map(channel).join('')}</div>${postHtml('engineer')}${projectsHtml('engineer')}`,
    note: `<p class="con-note">Reaction mass ${st.fuel}/${s.fuel}. Armor ${st.armor}/${s.armor}. In a console fight, weapons power adds gun runs, drive power adds evasive burns, and shields of 40% or more soak the first half hit.</p>`,
  });
}

// Live numbers, filled in without rebuilding the page so a slider can be dragged.
function engineeringReadouts() {
  refreshGauges('heat', Math.round(Math.min(100, heat())), heatLimit());
  const p = power(), rows = document.querySelector('[data-eff]') ? effectRows() : null;
  for (const el of document.querySelectorAll('[data-power]')) if (document.activeElement !== el) el.value = p[el.dataset.power];
  for (const el of document.querySelectorAll('[data-power-val]')) el.textContent = `${p[el.dataset.powerVal]}%`;
  for (const el of document.querySelectorAll('[data-power-bar] i')) el.style.width = `${p[el.parentNode.dataset.powerBar]}%`;
  if (rows) {
    const t = document.createElement('div'); t.innerHTML = rows;
    for (const b of t.querySelectorAll('[data-eff]')) for (const el of document.querySelectorAll(`[data-eff="${b.dataset.eff}"]`)) el.textContent = b.textContent;
  }
  const sig = plantSig();
  for (const el of document.querySelectorAll('[data-plant]')) if (el.dataset.sig !== sig) { el.dataset.sig = sig; el.innerHTML = plantSvg(); }
}

function powerInput(e) {
  const k = e.target.dataset && e.target.dataset.power;
  if (!k) return;
  setPower(k, Number(e.target.value));
  const p = power();
  for (const el of document.querySelectorAll('[data-power]')) el.value = p[el.dataset.power];
  engineeringReadouts();
}

Mods.register({
  id: 'engineering', name: 'Engineering', builtin: true,
  init(M) {
    UI.el.addEventListener('input', powerInput);
    M.on('frame', dt => { engineeringTick(dt); engineeringReadouts(); });
    M.on('landed', () => { G.state.heat = 0; });
  },
});
