'use strict';

// The burn instruments: how fast you are going, how hard the drive is pushing, and where in the burn you are. The speed follows the
// burn's shape between the two systems (burnspeed.js burnShape, #1195): a steep climb on the couches, a slow rise to the flip, a slow fall
// and a steep drop into the port. Read on the burn view's bar (transit.js drawBurnBar). Loaded after transit.js; only called into at runtime.

const AU_KM = 149.6e6, G_KMS2 = 0.00981;
// How much of the run is hard burn, cruise and flip at a point p (0..1): the weights ease between phases and always sum to one.
const burnRamp = (p, a, b) => { const x = b > a ? Math.min(1, Math.max(0, (p - a) / (b - a))) : p >= b ? 1 : 0; return x * x * (3 - 2 * x); };  // a span of none (a burn with no hard burn, #1195) is a step
// `st` is the burn's stages in shares (burnspeed.js burnStages, #992): the couches at each end, strapped in round the flip, the float.
const PHASE_SHARES = { couch: 0.06, secure: 0.06, float: 0.03 };
function phaseWeights(pr, st = PHASE_SHARES) {
  const c = st.couch, burn = 1 - burnRamp(pr, c / 3, c) + burnRamp(pr, 1 - c, 1 - c / 3);
  const flip = burnRamp(pr, 0.5 - st.secure, 0.5 - st.float) - burnRamp(pr, 0.5 + st.float, 0.5 + st.secure);
  return { burn, cruise: 1 - burn - flip, flip };
}
// What the g meter reads: the hard burn's g on the couches, the cruise's g between, nothing at the flip (`shape`: burnShape's).
function gReading(pr, shape, st) {
  const w = phaseWeights(pr, st);
  return Math.round((w.burn * shape.hardG + w.cruise * shape.cruiseG) * 100) / 100;
}
// The distance a burn covers, in km: the two places apart on the day it leaves (orbits.js distAU, what its days come from), and no less than 0.15 AU.
const burnDist = (from, to, day) => Math.max(0.15, distAU(from, to, day)) * AU_KM;
// The speed (km/s) and the distance covered (km) at a share p of a burn of `days` with this shape: the hard burn, the cruise, and the same back.
function shapeAt(p, shape, days, dist) {
  const T = Math.max(1, days) * 86400, th = shape.hard * T, ah = shape.hardG * G_KMS2, ac = shape.cruiseG * G_KMS2, tau = Math.min(p, 1 - p) * T;
  const v = tau < th ? ah * tau : shape.vHard + ac * (tau - th), x = tau < th ? ah * tau * tau / 2 : ah * th * th / 2 + shape.vHard * (tau - th) + ac * (tau - th) * (tau - th) / 2;
  return { v, covered: p <= 0.5 ? x : dist - x };
}
function burnState() {
  const t = G.transit, p = Math.min(1, Math.max(0, 1 - t.left / t.total)), dist = t.dist || burnDist(G.state.systemId, t.to);
  const shape = t.shape || burnShape(dist, t.days), at = shapeAt(p, shape, t.days, dist);  // a burn from before #1195 has no shape kept: worked out as it goes
  const st = burnStages(t.days, t.hard), phase = Math.abs(p - 0.5) < st.float ? 'FLIP' : p < 0.5 ? 'BURN' : 'BRAKE';  // the stages in ship time (#992)
  return { p, peak: shape.peak, v: at.v, g: gReading(p, shape, st), phase, covered: at.covered, dist };
}
const fmtKms = v => `${Math.round(v).toLocaleString('en-US')} km/s`;
