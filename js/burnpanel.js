'use strict';

// The burn instruments: how fast you are going, how hard the drive is pushing, and where in the burn you are. The speed follows a
// real constant-thrust burn between the two systems (accelerate to the flip, then brake), so the peak is twice the distance over the
// time, and the thrust is that over half the time. Read on the burn view's bar (transit.js drawBurnBar). Loaded after transit.js; only
// called into at runtime.

const AU_KM = 149.6e6, G_KMS2 = 0.00981;
// How much of the run is hard burn, cruise and flip at a point p (0..1): the weights ease between phases and always sum to one.
const burnRamp = (p, a, b) => { const x = Math.min(1, Math.max(0, (p - a) / (b - a))); return x * x * (3 - 2 * x); };
function phaseWeights(pr) {
  const burn = 1 - burnRamp(pr, 0.02, 0.06) + burnRamp(pr, 0.94, 0.98), flip = burnRamp(pr, 0.44, 0.47) - burnRamp(pr, 0.53, 0.56);
  return { burn, cruise: 1 - burn - flip, flip };
}
// What the g meter reads: three times the thrust in the hard burn, the thrust in cruise, nothing at the flip.
function gReading(pr, accel) {
  const w = phaseWeights(pr);
  return Math.round(accel * (1 + 2 * w.burn) * (1 - w.flip) * 100) / 100;
}
function burnState() {
  const t = G.transit, p = Math.min(1, Math.max(0, 1 - t.left / t.total));
  const dist = Math.max(0.15, Math.abs(SYSTEMS[t.to].au - SYSTEMS[G.state.systemId].au)) * AU_KM, secs = Math.max(1, t.days) * 86400;
  const peak = (2 * dist) / secs, v = peak * (1 - Math.abs(2 * p - 1)), accel = (peak / (secs / 2)) / G_KMS2;
  const phase = Math.abs(p - 0.5) < 0.03 ? 'FLIP' : p < 0.5 ? 'BURN' : 'BRAKE';
  return { p, peak, v, g: gReading(p, accel), phase, covered: dist * (p < 0.5 ? 2 * p * p : 1 - 2 * (1 - p) * (1 - p)), dist };
}
const fmtKms = v => `${Math.round(v).toLocaleString('en-US')} km/s`;
