'use strict';

// The burn instruments: how fast you are going, how hard the drive is pushing, and where in the burn you are. The speed follows a
// real constant-thrust burn between the two systems (accelerate to the flip, then brake), so the peak is twice the distance over the
// time, and the thrust is that over half the time. Drawn at the right of the transit view (transit.js), and as a figure on the
// time line on a phone. Loaded after transit.js; only called into at runtime.

const AU_KM = 149.6e6, G_KMS2 = 0.00981;
function burnState() {
  const t = G.transit, p = Math.min(1, Math.max(0, 1 - t.left / t.total));
  const dist = Math.max(0.15, Math.abs(SYSTEMS[t.to].au - SYSTEMS[G.state.systemId].au)) * AU_KM, secs = Math.max(1, t.days) * 86400;
  const peak = (2 * dist) / secs, v = peak * (1 - Math.abs(2 * p - 1)), accel = (peak / (secs / 2)) / G_KMS2;
  const phase = Math.abs(p - 0.5) < 0.03 ? 'FLIP' : p < 0.5 ? 'BURN' : 'BRAKE';
  return { p, peak, v, g: phase === 'FLIP' ? 0 : accel, phase, covered: dist * (p < 0.5 ? 2 * p * p : 1 - 2 * (1 - p) * (1 - p)), dist };
}
const fmtKms = v => `${Math.round(v).toLocaleString('en-US')} km/s`;

function drawBurnPanel(x, y, w) {
  const b = burnState(), h = 112;
  transitPanel(x, y, w, h, 'BURN');
  ctx.textAlign = 'left';
  ctx.font = `600 26px "IBM Plex Mono", monospace`;
  const hot = Math.min(1, b.v / b.peak || 0);
  ctx.fillStyle = `rgb(${Math.round(150 + 90 * hot)},${Math.round(200 + 40 * hot)},255)`;
  ctx.fillText(fmtKms(b.v), x + 12, y + 46);
  ctx.font = '11px "IBM Plex Mono", monospace';
  ctx.fillStyle = '#8fb0d0';
  ctx.fillText(b.phase === 'FLIP' ? 'FLIP: drive off, weightless' : `${b.phase}: ${b.g.toFixed(2)} g thrust`, x + 12, y + 64);
  // The gauge: up to the peak and back, with the flip in the middle.
  const gx = x + 12, gw = w - 24, gy = y + 80;
  ctx.fillStyle = '#1a2533'; ctx.fillRect(gx, gy, gw, 8);
  const g = ctx.createLinearGradient(gx, 0, gx + gw, 0);
  g.addColorStop(0, '#3d6fb8'); g.addColorStop(0.5, '#cfe8ff'); g.addColorStop(1, '#3d6fb8');
  ctx.fillStyle = g; ctx.fillRect(gx, gy, gw * (b.v / b.peak || 0), 8);
  ctx.fillStyle = '#56687a'; ctx.fillRect(gx + gw / 2 - 1, gy - 3, 2, 14);
  ctx.fillStyle = '#9ab';
  ctx.fillText(`peak ${fmtKms(b.peak)}`, gx, y + 104);
  ctx.textAlign = 'right';
  ctx.fillText(`${(b.covered / 1e6).toFixed(1)} of ${(b.dist / 1e6).toFixed(1)} million km`, gx + gw, y + 104);
  ctx.textAlign = 'left';
}
