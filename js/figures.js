'use strict';

// The figures aboard in the burn view: the postures a person or the cat can be drawn in (shiplife.js posture() picks one),
// each with its frame count and frames per second. The sprite sheets are drawn to this list.
const POSTURES = {
  couch: { frames: 1, fps: 0 },
  stand: { frames: 2, fps: 1 },
  walk: { frames: 8, fps: 10 },
  climb: { frames: 4, fps: 6 },
  sit: { frames: 2, fps: 1 },
  work: { frames: 4, fps: 3 },  // at a panel, the hands moving (shiplife.js: at a post in a shift, the cook at the stove)
  'work-sit': { frames: 4, fps: 3 },  // seated at the controls, the hands moving (the bridge and the guns)
  bunk: { frames: 1, fps: 0 },
  strap: { frames: 2, fps: 1 },
  tether: { frames: 8, fps: 4 },
  'cat-walk': { frames: 6, fps: 8 },
  'cat-sit': { frames: 2, fps: 1 },
  'cat-sleep': { frames: 1, fps: 0 },
  'cat-float': { frames: 6, fps: 4 },
};

// A placeholder figure, until the sprite sheets replace it: drawPerson(ctx, pose, x, y, look) draws one person or the cat from a
// posture (shiplife.js posture() gives pose = { name, face, frame }). x, y are the place on the deck and the floor under them (the
// bunk's mattress for bunk). A standing person is 72 units tall. look = { color, floating, skin, hair } (skin and hair as the person's portrait has them, character.js portraitLook). Limb angles are
// absolute radians from straight down, ported from the mockup (docs/superpowers/mockups). Returns the point a tap should aim at (the torso's
// middle), with the head and the front foot, so a tap can be tested against the whole body.
const FIG_TALL = 87, FIG_SCALE = 72 / FIG_TALL;  // a standing figure is 87 mockup units from the floor to the top of the head

function figShade(hex, k) { const n = parseInt(hex.slice(1), 16), f = v => Math.max(0, Math.min(255, Math.round(v * k))); return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`; }
function figSeg(ctx, pts) { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) ctx.lineTo(p[0], p[1]); ctx.stroke(); }
function figDot(ctx, x, y, r, col) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
// A limb as two tapered strokes (thigh then shin, upper arm then forearm); a boot at the end of a leg, along the way the foot points (forward is +x);
// the torso as a shape broader at the shoulders than the hips, with a belt and a lighter front edge.
function figLimb(ctx, pts, w1, w2, col) { ctx.strokeStyle = col; ctx.lineWidth = w1; figSeg(ctx, [pts[0], pts[1]]); ctx.lineWidth = w2; figSeg(ctx, [pts[1], pts[2]]); }
function figBoot(ctx, leg, col) { const f = leg[2]; ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(f[0] + 2, f[1] + 0.5, 4.6, 2.7, 0, 0, Math.PI * 2); ctx.fill(); }
function figTorso(ctx, j, col) {
  const n = j.neck, h = j.hip, px = j.perp[0], py = j.perp[1], at = (p, w) => [[p[0] - px * w, p[1] - py * w], [p[0] + px * w, p[1] + py * w]];
  const [ns, ne] = at(n, 6.8), [hs, he] = at(h, 5.2);
  ctx.fillStyle = col; ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(ns[0], ns[1]); ctx.lineTo(ne[0], ne[1]); ctx.lineTo(he[0], he[1]); ctx.lineTo(hs[0], hs[1]); ctx.closePath(); ctx.fill(); ctx.stroke();
  const b = [h[0] + (n[0] - h[0]) * 0.16, h[1] + (n[1] - h[1]) * 0.16], [b1, b2] = at(b, 6.4);
  ctx.strokeStyle = figShade(col, 0.55); ctx.lineWidth = 2; figSeg(ctx, [b1, b2]);  // the belt
  ctx.strokeStyle = figShade(col, 1.18); ctx.lineWidth = 1.1; figSeg(ctx, [[ne[0] - px * 1.2, ne[1] - py * 1.2], [he[0] - px * 1.2, he[1] - py * 1.2]]);  // the light on the front edge
}
// The head in profile, facing +x (the figure is mirrored to face left): the face, the hair over the crown and the back with a fringe at
// the front, an eye under a brow, and the nose. `up` is the way from the neck to the head, so the head turns with the body.
function figHead(ctx, hx, hy, up, skin, hair) {
  const ux = Math.cos(up), uy = Math.sin(up), fx = -uy, fy = ux, at = (f, u) => [hx + fx * f + ux * u, hy + fy * f + uy * u];  // fx, fy: the way the face looks
  const [nx, ny] = at(9.2, -0.5); figDot(ctx, nx, ny, 2.1, skin);  // the nose, standing off the face
  figDot(ctx, hx, hy, 9.5, skin);
  ctx.fillStyle = hair; ctx.beginPath(); ctx.arc(hx, hy, 10, up - 2.0, up + 0.62); ctx.closePath(); ctx.fill();  // the crown and the back
  const [f1x, f1y] = at(8.6, 4.6), [f2x, f2y] = at(2.5, 9.8), [f3x, f3y] = at(6.8, 7.4);
  ctx.beginPath(); ctx.moveTo(f1x, f1y); ctx.quadraticCurveTo(f3x, f3y, f2x, f2y); ctx.lineTo(hx + ux * 9, hy + uy * 9); ctx.closePath(); ctx.fill();  // the fringe
  const [bx, by] = at(5.2, 2.8), [bx2, by2] = at(8.2, 2.4); ctx.strokeStyle = figShade(hair, 0.9); ctx.lineWidth = 1.1; figSeg(ctx, [[bx, by], [bx2, by2]]);  // the brow
  const [eyx, eyy] = at(6.4, 0.9); figDot(ctx, eyx, eyy, 1.25, '#15181d');  // the eye
}
const FIG_GROUNDED = ['stand', 'walk', 'sit', 'strap', 'work', 'work-sit'];  // the postures with their feet (or seat) on the deck, which cast a shadow

// The joint angles of a person's posture at a frame, for a figure facing right (a figure facing left is the same drawn mirrored).
// hip is how high the hip is above the floor; rot leans the whole body (0 upright, negative back, -pi/2 lying with the head to the left).
function figPose(name, frame, frames) {
  const ph = Math.PI * 2 * frame / frames, S = Math.sin, wave = S(ph);
  const base = { hip: 36, rot: 0, arms: [0.1, 0.15, -0.1, 0.05], legs: [0.04, 0, -0.04, 0], head: 0, squash: 1, strap: 0 };
  switch (name) {
    case 'couch': return { ...base, hip: 20, rot: -0.9, arms: [0.6, 1.4, 0.4, 1.3], legs: [1.9, 0.6, 1.8, 0.65], squash: 0.9, strap: 1 };
    case 'stand': return { ...base, arms: [0.1 + wave * 0.05, 0.2, -0.1 - wave * 0.05, 0.1], squash: 1 + wave * 0.01 };
    case 'walk': return { ...base, rot: 0.05, arms: [-wave * 0.45, -wave * 0.45 + 0.45, wave * 0.45, wave * 0.45 + 0.45], legs: [wave * 0.42, wave * 0.42 - 0.75 * Math.max(0, S(ph + 1.5)), -wave * 0.42, -wave * 0.42 - 0.75 * Math.max(0, S(ph + 4.6))], hip: 35 - Math.abs(wave) * 1.2 };  // a short stride, the knee bending as the foot comes through
    case 'climb': return { ...base, arms: [2.55 + wave * 0.4, 3.0 + wave * 0.2, 2.55 - wave * 0.4, 3.0 - wave * 0.2], legs: [0.35 + wave * 0.45, -0.25 + wave * 0.35, 0.35 - wave * 0.45, -0.25 - wave * 0.35], hip: 36 + wave * 2 };  // hand over hand on the rungs, a knee up as the other reaches
    case 'sit': { const k = wave * 0.08; return { ...base, hip: 18, rot: -0.06, arms: [1.2 + k, 1.6 + k, 1.1 - k, 1.5 - k], legs: [1.57, 0, 1.5, -0.05], head: 0.1 }; }
    case 'work': return { ...base, arms: [1.25 + wave * 0.12, 1.75 + wave * 0.25, 1.1 - wave * 0.12, 1.6 - S(ph + 1) * 0.25], head: 0.08 };  // the forearms on the panel, working
    case 'work-sit': return { ...base, hip: 18, rot: -0.04, arms: [1.3 + wave * 0.1, 1.7 + wave * 0.2, 1.2 - wave * 0.1, 1.6 - S(ph + 1) * 0.2], legs: [1.57, 0, 1.5, -0.05], head: 0.12 };
    case 'bunk': return { ...base, hip: 5, rot: -1.57, arms: [1.4, 1.5, 1.3, 1.5], legs: [1.57, 1.57, 1.5, 1.62], head: 0 };
    case 'strap': return { ...base, hip: 19, rot: 0.08 * (1 - 2 * frame), arms: [1.2, 1.6, 0.3, -0.2], legs: [1.6 + wave * 0.08, 0.3 + wave * 0.1, 1.5, 0.2], head: 0.1, strap: 1 };
    case 'tether': return { ...base, hip: 70 + wave * 3, rot: 1.25, arms: [2.1, 1.4, 1.0, 1.6], legs: [-1.4 + wave * 0.25, -1.6 + S(ph + 1) * 0.3, -1.2 + S(ph + 2) * 0.25, -1.0 + S(ph * 2) * 0.3], head: 0.1 };
  }
  return null;
}

function figJoints(q) {
  const S = Math.sin, C = Math.cos, c = C(q.rot), s = S(q.rot), hip = [0, -q.hip], at = (dx, dy) => [hip[0] + dx * c - dy * s, hip[1] + dx * s + dy * c];
  const torso = 32 * q.squash, neck = at(0, -torso);
  const limb = (from, a1, a2, l) => { const e = [from[0] + S(a1) * l, from[1] + C(a1) * l]; return [from, e, [e[0] + S(a2) * l, e[1] + C(a2) * l]]; };
  return { hip, neck, mid: at(0, -torso * 0.5), head: at(S(q.head) * 4, -torso - 10), perp: [c, s],
    armF: limb(neck, q.arms[0], q.arms[1], 14), armB: limb(neck, q.arms[2], q.arms[3], 14), legF: limb(hip, q.legs[0], q.legs[1], 18), legB: limb(hip, q.legs[2], q.legs[3], 18) };
}

function figCat(ctx, name, frame, frames) {
  const S = Math.sin, C = Math.cos, ph = Math.PI * 2 * frame / frames;
  const c = name === 'cat-walk' ? { y: -9, rot: 0, legs: [S(ph) * 0.7, S(ph + 2) * 0.7, S(ph + 1) * 0.7, S(ph + 3) * 0.7], tail: 0.3 }
    : name === 'cat-sit' ? { y: -14, rot: -0.9, legs: [0.9, 0.9, -0.3, -0.3], tail: S(ph) }
    : name === 'cat-sleep' ? { y: -7, rot: 0, legs: [1.5, 1.5, 1.4, 1.4], tail: 0 }
    : { y: -40, rot: S(ph) * 1.2, legs: [S(ph * 3) * 0.7, S(ph * 3 + 2) * 0.7, S(ph * 3 + 1) * 0.7, S(ph * 3 + 3) * 0.7], tail: S(ph * 2) };
  ctx.save(); ctx.translate(0, c.y); ctx.rotate(c.rot); ctx.strokeStyle = '#d98c3a'; ctx.lineCap = 'round'; ctx.lineWidth = 2.6;
  [[-8, 0], [-5, 1], [7, 2], [9, 3]].forEach(([lx], k) => figSeg(ctx, [[lx, 3], [lx + S(c.legs[k]) * 8, 3 + C(c.legs[k]) * 8]]));
  ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(-12, -1); ctx.quadraticCurveTo(-22, -4 + c.tail * 6, -24 + c.tail * 3, -12); ctx.stroke();
  ctx.fillStyle = '#e09a48'; ctx.beginPath(); ctx.ellipse(0, 0, 13, 6.5, 0, 0, Math.PI * 2); ctx.fill();
  figDot(ctx, 13, -4, 6, '#e09a48');
  ctx.beginPath(); ctx.moveTo(9, -8); ctx.lineTo(10, -14); ctx.lineTo(13, -9); ctx.moveTo(14, -9); ctx.lineTo(17, -14); ctx.lineTo(18, -7); ctx.fill();
  ctx.strokeStyle = '#a8662a'; ctx.lineWidth = 1.2; for (const sx of [-6, -1, 4]) figSeg(ctx, [[sx, -6], [sx + 1, -2]]);
  figDot(ctx, 16, -5, 1, '#101418'); ctx.restore();
  return { x: 0, y: c.y };
}

function drawPerson(ctx, pose, x, y, look) {
  const frames = POSTURES[pose.name].frames, face = pose.face < 0 && pose.name !== 'bunk' ? -1 : 1;  // a sleeper always lies head to the left
  ctx.save(); ctx.translate(x, y); ctx.scale(face, 1);
  let tap, head, foot;
  if (pose.name.startsWith('cat')) head = foot = tap = figCat(ctx, pose.name, pose.frame, frames);
  else {
    const k = FIG_SCALE, q = figPose(pose.name, pose.frame, frames), j = figJoints(q), S = Math.sin, col = look.color;
    ctx.scale(k, k); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const skin = look.skin || '#c9a98a', hair = look.hair || '#3a2f28', boot = '#20242b', glove = '#2c3139', back = figShade(col, 0.62);
    if (!look.floating && FIG_GROUNDED.includes(pose.name)) { ctx.fillStyle = 'rgba(0,0,0,0.32)'; ctx.beginPath(); ctx.ellipse(2, 0, 17, 3.2, 0, 0, Math.PI * 2); ctx.fill(); }  // a shadow on the deck
    figLimb(ctx, j.legB, 6.4, 5, back); figBoot(ctx, j.legB, boot);
    figLimb(ctx, j.armB, 5, 4, figShade(col, 0.55)); figDot(ctx, j.armB[2][0], j.armB[2][1], 2.5, glove);
    figLimb(ctx, j.legF, 6.4, 5, col); figBoot(ctx, j.legF, figShade(boot, 1.15));
    figTorso(ctx, j, col);
    if (q.strap > 0) {  // the straps across the chest, and the buckle
      ctx.strokeStyle = 'rgba(18,22,28,1)'; ctx.lineWidth = 2.2;
      const n = j.neck, h = j.hip, px = j.perp[0] * 5, py = j.perp[1] * 5;
      figSeg(ctx, [[n[0] - px, n[1] - py], [h[0] + px, h[1] + py]]); figSeg(ctx, [[n[0] + px, n[1] + py], [h[0] - px, h[1] - py]]);
      ctx.fillStyle = 'rgba(200,205,212,1)'; ctx.fillRect(j.mid[0] - 2, j.mid[1] - 2, 4, 4);
    }
    const hx = j.head[0], hy = j.head[1], ph = Math.PI * 2 * pose.frame / frames, up = Math.atan2(hy - j.neck[1], hx - j.neck[0]);
    ctx.strokeStyle = figShade(skin, 0.85); ctx.lineWidth = 4.5; figSeg(ctx, [j.neck, [j.neck[0] + Math.cos(up) * 3, j.neck[1] + Math.sin(up) * 3]]);  // the neck
    figLimb(ctx, j.armF, 5, 4, col); figDot(ctx, j.armF[2][0], j.armF[2][1], 2.6, glove);
    if (look.floating) {  // three strands of hair rising
      ctx.strokeStyle = hair; ctx.lineWidth = 1.6;
      for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(hx + i * 4, hy - 8); ctx.quadraticCurveTo(hx + i * 7 + S(ph + i) * 4, hy - 17, hx + i * 5 + S(ph * 0.75 + i) * 6, hy - 22); ctx.stroke(); }
    }
    figHead(ctx, hx, hy, up, skin, hair);
    tap = { x: j.mid[0] * k, y: j.mid[1] * k }; head = { x: j.head[0] * k, y: j.head[1] * k }; foot = { x: j.legF[2][0] * k, y: j.legF[2][1] * k };
  }
  ctx.restore();
  const at = p => ({ x: x + p.x * face, y: y + p.y });
  return { ...at(tap), head: at(head), foot: at(foot) };
}
