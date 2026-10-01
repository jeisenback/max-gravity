'use strict';

// The console: the shared look of a station's page, as a view from a workstation. A bezel with
// a header line, a display (an instrument drawn from real ship stats), side cards, and the
// station's controls along the bottom. It lays out by its own width (a container query), so it
// reads the same on the landed screen and in the narrower sheet during a burn.
// Loaded before the stations that use it; only calls into the game at runtime.

const condColor = c => c >= 70 ? '#5fd35f' : c >= 40 ? '#ff9a3c' : '#ff6a4a';  // good, worn, failing

function consoleHtml({ title, status = '', screen, side = '', controls = '', note = '' }) {
  return `<div class="con"><div class="con-bezel">
    <div class="con-head"><b>${title}</b><span>${status}</span></div>
    <div class="con-grid"><div class="con-screen">${screen}</div>${side ? `<div class="con-side">${side}</div>` : ''}</div>
    ${controls ? `<div class="con-ctl">${controls}</div>` : ''}${note}
  </div></div>`;
}

const conCard = (label, html) => `<div class="con-card"><div class="eyebrow">${label}</div>${html}</div>`;
const conRead = (label, value, attr = '') => `<div class="con-read"><span>${label}</span><b ${attr}>${value}</b></div>`;
const conBar = (pct, color) => `<span class="con-bar"><i style="width:${Math.max(0, Math.min(100, pct))}%;background:${color}"></i></span>`;

// A half-dial from 0 to 100, with a mark where the limit is. The inner markup is rebuilt only when
// the rounded value changes (refreshGauges), so a gauge can sit on a page that redraws every frame.
function gaugeInner(v, limit) {
  const a = x => Math.PI * (1 - x / 100), pt = (x, r) => [100 + r * Math.cos(a(x)), 100 - r * Math.sin(a(x))];
  const arc = (x, y, r) => { const [p, q] = [pt(x, r), pt(y, r)]; return `M${p[0].toFixed(1)} ${p[1].toFixed(1)} A${r} ${r} 0 0 1 ${q[0].toFixed(1)} ${q[1].toFixed(1)}`; };
  const n = pt(v, 66), m = pt(limit, 92), color = v >= limit ? '#ff6a4a' : v >= limit * 0.75 ? '#ff9a3c' : '#5fd35f';
  return `<path d="${arc(0, 100, 70)}" stroke="#12202f" stroke-width="12" fill="none"/>
    <path d="${arc(0, Math.max(1, v), 70)}" stroke="${color}" stroke-width="12" fill="none"/>
    <path d="${arc(limit, limit + 0.8, 76)}" stroke="#ff6a4a" stroke-width="22" fill="none" opacity=".8"/>
    <line x1="100" y1="100" x2="${n[0].toFixed(1)}" y2="${n[1].toFixed(1)}" stroke="#d4e4f5" stroke-width="2"/><circle cx="100" cy="100" r="4" fill="#d4e4f5"/>
    <text x="100" y="116" fill="#d4e4f5" font-size="14" text-anchor="middle">${v}%</text>
    <text x="${m[0].toFixed(1)}" y="${m[1].toFixed(1)}" fill="#ff6a4a" font-size="9" text-anchor="middle">LIMIT</text>`;
}
const gaugeSvg = (name, v, limit) => `<svg class="con-gauge" viewBox="0 0 200 120" data-gauge="${name}" data-v="${v}/${limit}" role="img" aria-label="${name} ${v}%">${gaugeInner(v, limit)}</svg>`;
function refreshGauges(name, v, limit) {
  for (const el of document.querySelectorAll(`[data-gauge="${name}"]`)) {
    if (el.dataset.v === `${v}/${limit}`) continue;
    el.dataset.v = `${v}/${limit}`;
    el.setAttribute('aria-label', `${name} ${v}%`);
    el.innerHTML = gaugeInner(v, limit);
  }
}

// The ship's side profile on a faint grid, the ground a station draws its systems on (Engineering, Weapons).
function hullSvg() {
  const grid = Array.from({ length: 15 }, (_, i) => `<line x1="${i * 46}" y1="0" x2="${i * 46}" y2="300"/>`).join('') + Array.from({ length: 7 }, (_, i) => `<line x1="0" y1="${i * 46}" x2="640" y2="${i * 46}"/>`).join('');
  return `<defs><linearGradient id="con-hull" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1b2a3d"/><stop offset="1" stop-color="#0e1826"/></linearGradient></defs>
  <g stroke="#16243a" stroke-width="1">${grid}</g>
  <path d="M70 150 L110 112 L470 100 L560 130 L600 150 L560 170 L470 200 L110 188 Z" fill="url(#con-hull)" stroke="#34506e" stroke-width="2"/>`;
}
