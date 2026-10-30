'use strict';

// The figures aboard in the burn view: the postures a person or the cat can be drawn in (shiplife.js posture() picks one),
// each with its frame count and frames per second. The sprite sheets are drawn to this list.
const POSTURES = {
  couch: { frames: 1, fps: 0 },
  stand: { frames: 2, fps: 1 },
  walk: { frames: 8, fps: 10 },
  climb: { frames: 4, fps: 6 },
  sit: { frames: 2, fps: 1 },
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
// bunk's mattress for bunk). A standing person is 72 units tall. look = { color, face (an Image or null), floating }. Limb angles are
// absolute radians from straight down, ported from the mockup (docs/superpowers/mockups). Returns the point a tap should aim at.
const FIG_TALL = 87, FIG_SCALE = 72 / FIG_TALL;  // a standing figure is 87 mockup units from the floor to the top of the head

function figShade(hex, k) { const n = parseInt(hex.slice(1), 16), f = v => Math.max(0, Math.min(255, Math.round(v * k))); return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`; }
function figSeg(ctx, pts) { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) ctx.lineTo(p[0], p[1]); ctx.stroke(); }
function figDot(ctx, x, y, r, col) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }

// The joint angles of a person's posture at a frame, for a figure facing right (a figure facing left is the same drawn mirrored).
// hip is how high the hip is above the floor; rot leans the whole body (0 upright, negative back, -pi/2 lying with the head to the left).
function figPose(name, frame, frames) {
  const ph = Math.PI * 2 * frame / frames, S = Math.sin, wave = S(ph);
  const base = { hip: 36, rot: 0, arms: [0.1, 0.15, -0.1, 0.05], legs: [0.04, 0, -0.04, 0], head: 0, squash: 1, strap: 0 };
  switch (name) {
    case 'couch': return { ...base, hip: 20, rot: -0.9, arms: [0.6, 1.4, 0.4, 1.3], legs: [1.9, 0.6, 1.8, 0.65], squash: 0.9, strap: 1 };
    case 'stand': return { ...base, arms: [0.1 + wave * 0.05, 0.2, -0.1 - wave * 0.05, 0.1], squash: 1 + wave * 0.01 };
    case 'walk': return { ...base, rot: 0.05, arms: [-wave * 0.7, -wave * 0.7 + 0.3, wave * 0.7, wave * 0.7 + 0.3], legs: [wave * 0.6, wave * 0.6 - 0.35 * Math.max(0, S(ph + 1.5)), -wave * 0.6, -wave * 0.6 - 0.35 * Math.max(0, S(ph + 4.6))], hip: 35 + Math.abs(wave) * -1.5 };
    case 'climb': return { ...base, arms: [2.8 + wave * 0.15, 2.9, 2.8 - wave * 0.15, 2.9], legs: [wave * 0.5, wave * 0.5 + 0.5, -wave * 0.5, -wave * 0.5 + 0.5], hip: 36 + wave * 2 };
    case 'sit': { const k = wave * 0.08; return { ...base, hip: 18, rot: -0.06, arms: [1.2 + k, 1.6 + k, 1.1 - k, 1.5 - k], legs: [1.57, 0, 1.5, -0.05], head: 0.1 }; }
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
  let tap;
  if (pose.name.startsWith('cat')) tap = figCat(ctx, pose.name, pose.frame, frames);
  else {
    const k = FIG_SCALE, q = figPose(pose.name, pose.frame, frames), j = figJoints(q), S = Math.sin, col = look.color;
    ctx.scale(k, k); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const skin = '#c9a98a';  // no skin colour in the data: the head is the face image, or this muted tone
    ctx.strokeStyle = figShade(col, 0.6); ctx.lineWidth = 3.4;
    for (const l of [j.legB, j.armB]) figSeg(ctx, l);
    figDot(ctx, j.legB[2][0], j.legB[2][1], 2.6, '#1a1d22'); figDot(ctx, j.armB[2][0], j.armB[2][1], 2, figShade(skin, 0.75));
    ctx.strokeStyle = col; figSeg(ctx, j.legF); figDot(ctx, j.legF[2][0], j.legF[2][1], 2.8, '#22262c');
    ctx.lineWidth = 8.5; figSeg(ctx, [j.hip, j.neck]);
    ctx.strokeStyle = figShade(col, 0.7); ctx.lineWidth = 1.2;
    figSeg(ctx, [[j.mid[0] - j.perp[0] * 4, j.mid[1] - j.perp[1] * 4], [j.mid[0] + j.perp[0] * 4, j.mid[1] + j.perp[1] * 4]]);
    if (q.strap > 0) {  // the straps across the chest, and the buckle
      ctx.strokeStyle = 'rgba(18,22,28,1)'; ctx.lineWidth = 2.4;
      const n = j.neck, h = j.hip, px = j.perp[0] * 4, py = j.perp[1] * 4;
      figSeg(ctx, [[n[0] - px, n[1] - py], [h[0] + px, h[1] + py]]); figSeg(ctx, [[n[0] + px, n[1] + py], [h[0] - px, h[1] - py]]);
      ctx.fillStyle = 'rgba(200,205,212,1)'; ctx.fillRect(j.mid[0] - 2, j.mid[1] - 2, 4, 4);
    }
    ctx.strokeStyle = col; ctx.lineWidth = 3.4; figSeg(ctx, j.armF); figDot(ctx, j.armF[2][0], j.armF[2][1], 2.2, skin);
    const hx = j.head[0], hy = j.head[1], ph = Math.PI * 2 * pose.frame / frames;
    if (look.floating) {  // three strands of hair rising
      ctx.strokeStyle = figShade(col, 0.5); ctx.lineWidth = 1.6;
      for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(hx + i * 4, hy - 7); ctx.quadraticCurveTo(hx + i * 7 + S(ph + i) * 4, hy - 16, hx + i * 5 + S(ph * 0.75 + i) * 6, hy - 21); ctx.stroke(); }
    }
    if (look.face) {
      ctx.save(); ctx.beginPath(); ctx.arc(hx, hy, 9, 0, Math.PI * 2); ctx.clip(); ctx.translate(hx, hy); ctx.scale(face, 1); ctx.drawImage(look.face, -9, -9, 18, 18);  // counter-flipped: the face is not mirrored ctx.restore();
    } else figDot(ctx, hx, hy, 9, skin);
    ctx.strokeStyle = col; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.arc(hx, hy, 9.6, 0, Math.PI * 2); ctx.stroke();
    tap = { x: j.mid[0] * k, y: j.mid[1] * k };
  }
  ctx.restore();
  return { x: x + tap.x * face, y: y + tap.y };
}
