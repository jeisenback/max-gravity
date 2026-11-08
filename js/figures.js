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
  strap: { frames: 8, fps: 2 },  // strapped into a jump seat; the float drifts the arms and the legs (#927)
  tether: { frames: 8, fps: 4 },
  'cat-walk': { frames: 6, fps: 8 },
  'cat-sit': { frames: 2, fps: 1 },
  'cat-sleep': { frames: 1, fps: 0 },
  'cat-float': { frames: 6, fps: 4 },
};

// A person drawn from parts (#958): drawPerson(ctx, pose, x, y, look) draws one person or the cat from a posture (shiplife.js posture()
// gives pose = { name, face, frame }). x, y are the place on the deck and the floor under them (the bunk's mattress for bunk). A standing
// person is 72 units tall. look = { color, floating, skin, hair, cut, v, mood }: skin, hair, its cut and v as character.js portraitLook gives
// them, mood as figureMood (shiplife.js) reads it. Limb angles are absolute radians from straight down. Returns the point a tap should aim
// at (the torso's middle), with the head and the front foot, so a tap can be tested against the whole body.
//
// Each part is an outline in SVG path syntax (M, L, C, Q, Z; absolute) in its own frame: the joint at the origin, the limb running down +y,
// the way the person faces +x. They are drawn by figPath, not Path2D, so the figures draw in tests without a browser.
const FIG_TALL = 89, FIG_SCALE = 72 / FIG_TALL;  // a standing figure is 89 units from the floor to the top of the head
const FIG_LEN = { upperArm: 13, foreArm: 12, thigh: 20, shin: 19, ankle: 3.6, torso: 29, neck: 3.2, head: 7 };
const FIG_PART = {
  upperArm: 'M -3.3 -0.5 C -3.4 -3.6 3.4 -3.6 3.3 -0.5 L 2.5 12.2 C 2.4 14.2 -2.4 14.2 -2.5 12.2 Z',  // the shoulder's cap to the elbow
  foreArm: 'M -2.5 0 C -2.5 -1.6 2.5 -1.6 2.5 0 L 2.1 10.8 L -2.1 10.8 Z',
  cuff: 'M -2.3 9.4 L 2.3 9.4 L 2.2 11.6 L -2.2 11.6 Z',
  hand: 'M -1.9 -0.3 C -2.9 1.6 -2.6 4.4 -0.4 4.9 C 1.6 5.1 2.6 3.4 2.2 1.4 L 3.4 1.0 C 3.6 2.0 2.9 2.8 2.2 2.6 L 2.0 -0.3 Z',  // a glove, the thumb forward
  thigh: 'M -4.3 -1 C -4.4 -3.5 4.2 -3.5 4.3 -1 C 4.6 6 3.6 14 3.1 19.6 C 2.8 21.4 -2.8 21.4 -3.1 19.6 C -3.6 14 -4.7 6 -4.3 -1 Z',
  shin: 'M -3.1 0 C -3.1 -1.8 3.0 -1.8 3.0 0 C 3.0 6 2.5 12 2.2 18.6 L -2.2 18.6 C -2.6 13 -4.6 7 -3.1 0 Z',  // the calf behind
  boot: 'M -2.8 -2.2 L 2.6 -2.2 L 3.0 0.4 C 5.6 0.6 8.0 1.4 8.0 3.0 L 8.0 3.8 L -3.4 3.8 L -3.4 0.8 Z',  // the ankle at the origin, the sole on 3.8
};
const FIG_LINE = 'rgba(10,13,18,0.85)';  // the outline round every part, so a figure stands off the wall behind it
const figTokens = {};
function figPath(ctx, d) {
  const t = figTokens[d] || (figTokens[d] = d.match(/[MLCQZ]|-?\d*\.?\d+/g));
  ctx.beginPath();
  for (let i = 0; i < t.length;) {
    const c = t[i++], n = k => t.slice(i, i += k).map(Number);
    if (c === 'M') ctx.moveTo(...n(2)); else if (c === 'L') ctx.lineTo(...n(2)); else if (c === 'C') ctx.bezierCurveTo(...n(6)); else if (c === 'Q') ctx.quadraticCurveTo(...n(4)); else ctx.closePath();
  }
}
function figShade(hex, k) { const n = parseInt(hex.slice(1), 16), f = v => Math.max(0, Math.min(255, Math.round(v * k))); return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`; }
function figSeg(ctx, pts) { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) ctx.lineTo(p[0], p[1]); ctx.stroke(); }
function figDot(ctx, x, y, r, col) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
// One part at a joint, turned to the limb's angle and widened by the person's build: filled, then outlined.
function figPart(ctx, d, at, ang, col, build) {
  ctx.save(); ctx.translate(at[0], at[1]); ctx.rotate(-ang); ctx.scale(build, 1);
  figPath(ctx, d); ctx.fillStyle = col; ctx.fill(); ctx.lineWidth = 0.9; ctx.strokeStyle = FIG_LINE; ctx.stroke();
  ctx.restore();
}
function figLeg(ctx, L, col, boot, build) {
  figPart(ctx, FIG_PART.thigh, L[0], L[3], col, build); figPart(ctx, FIG_PART.shin, L[1], L[4], col, build);
  figPart(ctx, FIG_PART.boot, L[2], L[4] * 0.35, boot, 1);  // the boot stays near level, following the shin only a little
}
function figArm(ctx, A, col, glove, build) {
  figPart(ctx, FIG_PART.upperArm, A[0], A[3], col, build); figPart(ctx, FIG_PART.foreArm, A[1], A[4], col, build);
  figPart(ctx, FIG_PART.cuff, A[1], A[4], figShade(col, 0.7), build); figPart(ctx, FIG_PART.hand, A[2], A[4], glove, 1);
}

// What a person looks like, from the portrait's cut and v (character.js portraitLook): the same every time they are drawn. The hair follows
// the cut, so the bust and the figure agree: cut 0 short (a crop or curls), cut 1 long (tied back, a bun or loose), cut 2 close (buzzed or bald).
// Facial hair only with the short and close cuts.
// Each trait is picked by v mixed with the trait's own number, so the traits do not follow each other (the id's hash, util.js, varies
// mostly in its low bits).
function figStyle(look) {
  const v = look.v || 0, cut = look.cut || 0, pick = (k, list) => {
    let x = Math.imul(v + k * 374761393, 668265263); x = Math.imul(x ^ (x >>> 13), 1274126177);
    return list[((x ^ (x >>> 16)) >>> 0) % list.length];
  };
  const style = pick(1, cut === 0 ? ['crop', 'curls'] : cut === 1 ? ['tail', 'bun', 'loose'] : ['buzz', 'bald']);
  const face = cut === 1 ? 'none' : pick(2, ['none', 'none', 'stubble', 'beard', 'moustache', 'none']);
  return { style, face, nose: pick(3, [0, 0.9, 1.8]), build: pick(4, [0.88, 1, 1.16]), brow: pick(5, [0.8, 1.2]) };
}

// The torso in its own frame: the hip at the origin, the neck at (0, -T), the chest forward, the back flatter; a collar, zip, belt, buckle,
// shoulder patch and chest pocket, the back in shade and the light on the chest.
function figTorso(ctx, j, col, build) {
  const T = FIG_LEN.torso, body = `M -5.8 2.4 C -7.2 -6 -6.6 ${8 - T} -7.0 ${3 - T} C -6.8 ${-T - 0.8} -2.4 ${-T - 1.4} 0 ${-T - 1.2} C 3 ${-T - 1.4} 6.8 ${-T} 7.6 ${5 - T} C 8.2 ${11 - T} 6.0 -13 5.8 -6 C 5.8 -2 6.0 0.4 5.6 2.4 Z`;
  ctx.save(); ctx.translate(j.hip[0], j.hip[1]); ctx.rotate(j.rot); ctx.scale(build, 1);
  figPath(ctx, body); ctx.fillStyle = col; ctx.fill();
  ctx.save(); ctx.clip();
  ctx.fillStyle = figShade(col, 0.78); ctx.fillRect(-8, -T - 2, 3.8, T + 6);  // the back in shade
  ctx.fillStyle = figShade(col, 1.15); ctx.fillRect(5.2, 4 - T, 2.8, T - 8);  // light on the chest
  ctx.fillStyle = figShade(col, 0.5); ctx.fillRect(-8, -1.2, 16, 2.6);  // the belt
  ctx.fillStyle = '#9aa3ad'; ctx.fillRect(3.2, -1, 2.2, 2.2);  // the buckle
  ctx.fillStyle = figShade(col, 0.66); ctx.fillRect(-1.6, 7 - T, 3.6, 2.6);  // the shoulder patch
  ctx.strokeStyle = figShade(col, 0.62); ctx.lineWidth = 0.7; figSeg(ctx, [[4.4, 1 - T], [4.0, -2]]); figSeg(ctx, [[0, 15 - T], [4.4, 15 - T]]);  // the zip, the pocket
  ctx.restore();
  figPath(ctx, body); ctx.lineWidth = 0.9; ctx.strokeStyle = FIG_LINE; ctx.stroke();
  ctx.fillStyle = figShade(col, 0.72); figPath(ctx, `M -3.6 ${-T - 0.4} L 2.6 ${-T - 0.6} L 1.4 ${2.6 - T} L -2.4 ${2.4 - T} Z`); ctx.fill();  // the collar
  ctx.restore();
}

// The hair in the head's frame (the centre at the origin, up -y, the face +x): the mass over the crown, then for some styles a part behind
// the head (a tail, a bun, loose hair), drawn first. Curls are drawn as circles (figHead).
function figHair(style, r) {
  const cap = `M ${-r - 0.6} 1.8 C ${-r - 1.2} ${-r * 1.3} ${r * 0.9} ${-r * 1.45} ${r + 0.6} -2.6 C ${r * 0.6} ${-r * 0.75} ${r * 0.1} ${-r * 0.7} -1 ${-r * 0.45} C -2.2 -1 -3 0.6 -3.6 2.6 C -4.6 2.6 ${-r} 3.2 ${-r - 0.6} 1.8 Z`;
  const flat = `M ${-r - 0.3} 1.4 C ${-r - 0.6} ${-r * 1.2} ${r * 0.85} ${-r * 1.3} ${r + 0.2} -3.2 C ${r * 0.4} ${-r * 0.95} -1 ${-r * 0.8} -3 -1 C -4 1 ${-r} 2.4 ${-r - 0.3} 1.4 Z`;
  return {
    crop: [cap], buzz: [flat], bald: [], curls: [],
    tail: [flat, `M ${0.5 - r} -3.4 C ${-r - 4} -3 ${-r - 5.6} 4 ${-r - 3.4} 10.5 C ${-r - 2} 8 ${-r - 1.4} 2 ${-r} 0 Z`],
    bun: [flat, `M ${-r + 5} ${1.6 - r} C ${-r + 5} ${-2.9 - r} ${-r - 1.8} ${-2.9 - r} ${-r - 1.8} ${1.6 - r} C ${-r - 1.8} ${5.9 - r} ${-r + 5} ${5.9 - r} ${-r + 5} ${1.6 - r} Z`],
    loose: [cap, `M ${-r - 0.6} -2 C ${-r - 2.4} 4 ${-r - 1.6} 9 ${-r - 0.6} 11.5 L -1.6 11 C -2.6 7 -2.8 4 -2.6 1.6 Z`],
  }[style];
}
const FIG_CURLS = [[-6.4, 1.2, 2.6], [-6.8, -2.4, 2.8], [-5.2, -5.6, 2.9], [-2, -7.6, 3], [1.6, -7.8, 2.9], [4.8, -6.4, 2.6], [6.6, -4, 2.1], [-3.6, -3, 3]];

// The head in profile facing +x, and the neck: the hair by style, facial hair, the nose's shape, and the eye, brow and mouth by mood.
// Low hangs the head, hurt drops it a little, good lifts the chin. Floating (#927), the hair lifts off the head as one soft mass.
function figHead(ctx, j, look, st, ph) {
  const r = FIG_LEN.head, mood = look.mood, n = st.nose, skin = look.skin || '#c9a98a', hair = look.hair || '#3a2f28', f = +look.floating || 0;
  const up = Math.atan2(j.head[1] - j.neck[1], j.head[0] - j.neck[0]) + Math.PI / 2, tilt = { low: 0.38, hurt: 0.16, good: -0.1 }[mood] || 0;
  ctx.save(); ctx.translate(j.neck[0], j.neck[1]); ctx.rotate(up); ctx.fillStyle = figShade(skin, 0.82); ctx.fillRect(-2.2, -FIG_LEN.neck - 2, 4.2, FIG_LEN.neck + 3); ctx.restore();
  ctx.save(); ctx.translate(j.head[0], j.head[1]); ctx.rotate(up + tilt); ctx.lineWidth = 0.9; ctx.strokeStyle = FIG_LINE;
  const lifts = f > 0 && st.style !== 'bald' && st.style !== 'buzz', hairs = figHair(st.style, r);
  if (lifts) {  // floating: a soft cloud over the crown and two smaller masses drifting either way (#927), in place of the tail or the loose hair
    const sway = Math.sin(ph) * 0.25 * f; ctx.save(); ctx.rotate(sway); ctx.fillStyle = hair;
    for (const [cx, cy, rx, ry, rot] of [[-1.5, -5 - 1.5 * f, 7.8, 3 + 2.2 * f, 0], [-4.5 + sway * 3, -7.5 - 3 * f, 4.5, 2.2 + 1.9 * f, -0.3], [2.2 - sway * 3, -8 - 3 * f, 3.7, 1.9 + 1.5 * f, 0.3]]) { ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, rot, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
  } else for (const d of hairs.slice(1)) { figPath(ctx, d); ctx.fillStyle = hair; ctx.fill(); ctx.stroke(); }  // a tail, a bun or loose hair, behind
  const skull = `M ${-r} 0 C ${-r} ${-r * 1.1} ${r * 0.9} ${-r * 1.15} ${r * 0.95} -1.2 L ${r + 1.2 + n} ${1.2 + n * 0.3} L ${r + 0.4} 2.2 C ${r + 0.3} 3.6 ${r - 0.4} ${r * 0.9} ${r * 0.35} ${r * 1.05} C -1 ${r * 1.1} -3 ${r * 0.6} -3.4 ${r * 0.5} C ${-r} 3 ${-r} 1.5 ${-r} 0 Z`;
  figPath(ctx, skull); ctx.fillStyle = skin; ctx.fill(); ctx.stroke();
  if (st.style === 'bald') { ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.beginPath(); ctx.ellipse(1, -r * 0.7, 2.4, 1.1, -0.3, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = figShade(skin, 0.8); ctx.beginPath(); ctx.ellipse(-1.2, 0.8, 1.3, 1.8, 0, 0, Math.PI * 2); ctx.fill();  // the ear
  ctx.fillStyle = hair;
  if (st.style === 'curls' && !lifts) for (const [cx, cy, cr] of FIG_CURLS) { ctx.beginPath(); ctx.arc(cx, cy, cr, 0, Math.PI * 2); ctx.fill(); }
  else if (hairs[0] && !(lifts && st.style !== 'curls')) { ctx.save(); if (st.style === 'buzz') ctx.globalAlpha = 0.7; figPath(ctx, hairs[0]); ctx.fill(); if (st.style !== 'buzz') ctx.stroke(); ctx.restore(); }
  else if (lifts) { figPath(ctx, figHair('buzz', r)[0]); ctx.fill(); }  // the hair close at the roots under the floating mass
  ctx.fillStyle = hair;  // facial hair
  if (st.face === 'beard') { ctx.beginPath(); ctx.moveTo(-1.2, 3); ctx.quadraticCurveTo(-0.5, r * 1.25, r * 0.4, r * 1.15); ctx.quadraticCurveTo(r * 0.95, r * 0.95, r + 0.2, 3.4); ctx.lineTo(r * 0.5, 4.6); ctx.lineTo(0.6, 3.2); ctx.closePath(); ctx.fill(); }
  if (st.face === 'beard' || st.face === 'moustache') ctx.fillRect(r * 0.5, 2.8, r * 0.5, 1.1);
  if (st.face === 'stubble') { ctx.save(); ctx.globalAlpha = 0.35; ctx.beginPath(); ctx.moveTo(-1, 3); ctx.quadraticCurveTo(0, r * 1.15, r * 0.4, r * 1.05); ctx.quadraticCurveTo(r * 0.95, r * 0.9, r + 0.2, 3.2); ctx.lineTo(0.6, 2.8); ctx.closePath(); ctx.fill(); ctx.restore(); }
  const ex = r * 0.62, ey = -0.6;  // the eye
  ctx.fillStyle = '#14171c'; ctx.strokeStyle = '#14171c'; ctx.lineCap = 'round';
  if (mood === 'hurt') { ctx.lineWidth = 0.9; figSeg(ctx, [[ex - 1.1, ey - 0.5], [ex + 0.2, ey + 0.1], [ex - 0.9, ey + 0.6]]); }  // screwed shut
  else if (mood === 'good') { ctx.lineWidth = 0.9; ctx.beginPath(); ctx.arc(ex, ey + 0.5, 1, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); }  // smiling eyes
  else { ctx.beginPath(); ctx.ellipse(ex, ey, 0.8, 1, 0, 0, Math.PI * 2); ctx.fill(); if (mood === 'low') { ctx.fillStyle = figShade(skin, 0.85); ctx.fillRect(ex - 1.2, ey - 1.4, 2.4, 1.3); } }  // a heavy lid when low
  ctx.strokeStyle = figShade(hair, 0.9); ctx.lineWidth = st.brow; ctx.beginPath();  // the brow: raised inside when low, pulled down when hurt
  if (mood === 'low') { ctx.moveTo(r * 0.3, -2); ctx.lineTo(r * 0.95, -2.7); } else if (mood === 'hurt') { ctx.moveTo(r * 0.3, -2.6); ctx.lineTo(r * 0.95, -1.8); }
  else if (mood === 'good') { ctx.moveTo(r * 0.3, -2.4); ctx.quadraticCurveTo(r * 0.62, -3, r * 0.95, -2.4); } else { ctx.moveTo(r * 0.3, -2.2); ctx.lineTo(r * 0.95, -2.1); }
  ctx.stroke();
  if (st.face !== 'beard') {  // the mouth: a grin, turned down, a grimace with the teeth set, or flat
    const mx = r * 0.45, my = 3.9; ctx.strokeStyle = '#3a1f1a'; ctx.lineWidth = 0.8; ctx.beginPath();
    if (mood === 'good') { ctx.moveTo(mx - 0.6, my - 0.9); ctx.quadraticCurveTo(mx + 0.4, my + 1.3, r + 0.3, my - 0.6); ctx.stroke(); }
    else if (mood === 'low') { ctx.moveTo(mx - 0.2, my + 0.9); ctx.quadraticCurveTo(mx + 0.6, my - 0.6, r * 0.98, my + 0.5); ctx.stroke(); }
    else if (mood === 'hurt') { ctx.fillStyle = '#3a1f1a'; figPath(ctx, `M ${mx - 0.2} ${my - 0.4} L ${r} ${my - 0.6} L ${r - 0.2} ${my + 0.9} L ${mx} ${my + 0.7} Z`); ctx.fill(); ctx.fillStyle = '#e9e4da'; ctx.fillRect(mx + 0.4, my - 0.3, r - mx - 0.9, 0.6); }
    else { ctx.moveTo(mx, my); ctx.lineTo(r * 0.95, my - 0.1); ctx.stroke(); }
  }
  ctx.restore();
}
const FIG_GROUNDED = ['stand', 'walk', 'sit', 'strap', 'work', 'work-sit'];  // the postures with their feet (or seat) on the deck, which cast a shadow

// The joint angles of a person's posture at a frame, for a figure facing right (a figure facing left is the same drawn mirrored).
// hip is how high the hip is above the floor; rot leans the whole body (0 upright, negative back, -pi/2 lying with the head to the left).
function figPose(name, frame, frames, float = 0) {  // float: how far the flip's float has built, 0 to 1 (the strap pose)
  const ph = Math.PI * 2 * frame / frames, S = Math.sin, wave = S(ph);
  const base = { hip: 36, rot: 0, arms: [0.1, 0.15, -0.1, 0.05], legs: [0.04, 0, -0.04, 0], head: 0, squash: 1, strap: 0 };
  switch (name) {
    case 'couch': return { ...base, hip: 20, rot: -0.9, arms: [0.6, 1.4, 0.4, 1.3], legs: [1.9, 0.6, 1.8, 0.65], squash: 0.9, strap: 1 };
    case 'stand': return { ...base, arms: [0.1 + wave * 0.05, 0.2, -0.1 - wave * 0.05, 0.1], squash: 1 + wave * 0.01 };
    case 'walk': return { ...base, rot: 0.05, arms: [-wave * 0.45, -wave * 0.45 + 0.45, wave * 0.45, wave * 0.45 + 0.45], legs: [wave * 0.42, wave * 0.42 - 0.75 * Math.max(0, S(ph + 1.5)), -wave * 0.42, -wave * 0.42 - 0.75 * Math.max(0, S(ph + 4.6))], hip: 35 - Math.abs(wave) * 1.2 };  // a short stride, the knee bending as the foot comes through
    case 'climb': return { ...base, arms: [2.55 + wave * 0.4, 3.0 + wave * 0.2, 2.55 - wave * 0.4, 3.0 - wave * 0.2], legs: [0.35 + wave * 0.45, -0.25 + wave * 0.35, 0.35 - wave * 0.45, -0.25 - wave * 0.35], hip: 36 + wave * 2 };  // hand over hand on the rungs, a knee up as the other reaches
    case 'sit': { const k = wave * 0.08; return { ...base, hip: 18, rot: -0.06, arms: [0.35 + k, 1.5 + k, 0.25 - k, 1.4 - k], legs: [1.57, 0, 1.5, -0.05], head: 0.1 }; }  // the hands on the thighs
    case 'work': return { ...base, arms: [0.55 + wave * 0.08, 1.75 + wave * 0.2, 0.45 - wave * 0.08, 1.65 - S(ph + 1) * 0.15], head: 0.08 };  // the elbows bent, the forearms on the panel, working
    case 'work-sit': return { ...base, hip: 18, rot: -0.04, arms: [0.6 + wave * 0.08, 1.7 + wave * 0.2, 0.5 - wave * 0.08, 1.6 - S(ph + 1) * 0.15], legs: [1.57, 0, 1.5, -0.05], head: 0.12 };
    case 'bunk': return { ...base, hip: 5, rot: -1.57, arms: [1.4, 1.5, 1.3, 1.5], legs: [1.57, 1.57, 1.5, 1.62], head: 0 };
    case 'strap': {  // seated in a jump seat, the hands on the harness; as the float builds the arms and the legs lift and drift against the straps (#927)
      const f = float, d = wave * f;
      return { ...base, hip: 18 + f * 2 + d * 1.5, rot: -0.06, arms: [0.5 + f * 1.8 + d * 0.25, 1.2 + f * 1.4 - d * 0.2, 0.4 + f * 1.6 - d * 0.2, 1.1 + f * 1.3 + d * 0.15],
        legs: [1.57 - f * 0.6 + d * 0.1, -0.1 + f * 0.4, 1.5 - f * 0.5 - d * 0.1, -0.1 + f * 0.3], head: 0.1 - f * 0.15, strap: 1 };
    }
    case 'tether': return { ...base, hip: 70 + wave * 3, rot: 1.25, arms: [2.1, 1.4, 1.0, 1.6], legs: [-1.4 + wave * 0.25, -1.6 + S(ph + 1) * 0.3, -1.2 + S(ph + 2) * 0.25, -1.0 + S(ph * 2) * 0.3], head: 0.1 };
  }
  return null;
}

// The joints of a pose. A standing pose's hip is measured on the old 36-unit legs, so it is moved up by what the longer legs add; a seated
// one (hip between 10 and 30) is raised 5.5 to sit the longer thigh on the seat; a sleeper's stays on the mattress.
function figJoints(q) {
  const S = Math.sin, C = Math.cos, L = FIG_LEN, leg = L.thigh + L.shin + L.ankle;
  const hipH = q.hip >= 30 ? q.hip + leg - 36 : q.hip > 10 ? q.hip + 5.5 : q.hip;
  const c = C(q.rot), s = S(q.rot), hip = [0, -hipH], at = (dx, dy) => [hip[0] + dx * c - dy * s, hip[1] + dx * s + dy * c];
  const torso = L.torso * q.squash, shoulder = at(0.5, 3 - torso);
  const limb = (from, a1, a2, l1, l2) => { const e = [from[0] + S(a1) * l1, from[1] + C(a1) * l1]; return [from, e, [e[0] + S(a2) * l2, e[1] + C(a2) * l2], a1, a2]; };
  return { hip, rot: q.rot, neck: at(0, -torso), mid: at(0, -torso * 0.5), head: at(S(q.head) * 2, -torso - L.neck - L.head), perp: [c, s],
    armF: limb(shoulder, q.arms[0], q.arms[1], L.upperArm, L.foreArm), armB: limb(shoulder, q.arms[2], q.arms[3], L.upperArm, L.foreArm),
    legF: limb(hip, q.legs[0], q.legs[1], L.thigh, L.shin), legB: limb(hip, q.legs[2], q.legs[3], L.thigh, L.shin) };
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
  const frames = POSTURES[pose.name].frames, face = pose.face < 0 && pose.name !== 'bunk' && pose.name !== 'couch' ? -1 : 1;  // a sleeper lies head to the left; a crash couch's back is on the left (#949)
  ctx.save(); ctx.translate(x, y); ctx.scale(face, 1);
  let tap, head, foot;
  if (pose.name.startsWith('cat')) head = foot = tap = figCat(ctx, pose.name, pose.frame, frames);
  else {
    const k = FIG_SCALE, q = figPose(pose.name, pose.frame, frames, +look.floating || 0), j = figJoints(q), col = look.color, st = figStyle(look), b = st.build;
    ctx.scale(k, k); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const boot = '#262b33', glove = '#2c3139';
    if (!look.floating && FIG_GROUNDED.includes(pose.name)) { ctx.fillStyle = 'rgba(0,0,0,0.32)'; ctx.beginPath(); ctx.ellipse(2, 0, 15, 2.8, 0, 0, Math.PI * 2); ctx.fill(); }  // a shadow on the deck
    figLeg(ctx, j.legB, figShade(col, 0.66), figShade(boot, 0.85), b);
    figArm(ctx, j.armB, figShade(col, 0.6), figShade(glove, 0.85), b);
    figLeg(ctx, j.legF, col, boot, b);
    figTorso(ctx, j, col, b);
    if (q.strap > 0 || pose.strapped) {  // the straps across the chest, and the buckle (a sleeper is strapped into the bunk at the flip)
      ctx.strokeStyle = 'rgba(18,22,28,1)'; ctx.lineWidth = 2.2;
      const n = j.neck, h = j.hip, px = j.perp[0] * 5 * b, py = j.perp[1] * 5 * b;
      figSeg(ctx, [[n[0] - px, n[1] - py], [h[0] + px, h[1] + py]]); figSeg(ctx, [[n[0] + px, n[1] + py], [h[0] - px, h[1] - py]]);
      ctx.fillStyle = 'rgba(200,205,212,1)'; ctx.fillRect(j.mid[0] - 2, j.mid[1] - 2, 4, 4);
    }
    figHead(ctx, j, look, st, Math.PI * 2 * pose.frame / frames);
    figArm(ctx, j.armF, col, glove, b);
    tap = { x: j.mid[0] * k, y: j.mid[1] * k }; head = { x: j.head[0] * k, y: j.head[1] * k }; foot = { x: j.legF[2][0] * k, y: j.legF[2][1] * k };
  }
  ctx.restore();
  const at = p => ({ x: x + p.x * face, y: y + p.y });
  return { ...at(tap), head: at(head), foot: at(foot) };
}
