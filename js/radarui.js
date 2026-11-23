'use strict';

// The ship fight on the radar, as a scene (docs/superpowers/specs/2026-11-16-radar-ship-fight-design.md, "The page"; #1345, the only ship fight since #1348).
// startShipFight (fightui.js) builds the sides and opens radarFightEvent; the fight runs in real time from the game's frame hook (radarTick), a step at a time
// through radar.js, and stops itself at each of radarPauses' reasons, saying why. The crew work every post but the hand's (radarAuto); the hand works the
// gunner's or the pilot's (#1346). What a step costs the ship goes through fightTook, and an end through shipFightEnd. The page is a top bar (play and pause,
// the speeds, the zoom), the situation bar, the canvas radar with the captain's order's cost under it, the hand's post, and the timeline; they are drawn once
// with the scene and kept up to date in place, each frame. The fight is kept with the scene, so nothing of it is in the save. The words are the
// 'scene:fight' lines under 'radar.' (hiredscenes.js). Loaded after radar.js.

const RADAR_UI = { FADE: 3, LAST: 6, RATIO: 0.62, HOVER: 14, ARC: 40, ARC_MIN: 10, ARC_MAX: 180, WEDGE: 90 };  // cycles an event's mark fades over; events listed in words; the radar's height to its width; px a hover finds a thing within; px out to the PDC arc's ends; its narrowest and widest, degrees; px a full-throttle burn reaches
const radarSay = (key, vars) => sceneSay('scene:fight', `radar.${key}`, vars);
const radarFit = st => ({ accuracy: !!(st.outfits || {}).fcAccuracy, resilience: !!(st.outfits || {}).fcResilience });  // the fire-control upgrades, fitted on no ship yet (an outfit is a follow-up)
const radarLevels = () => Object.fromEntries(HIRED_POSTS.map(p => [p, Math.min(5, roleSkill(POSTS[p].role))]));  // each post's crew level, for radarAuto
const RADAR_POSTS = ['gunner', 'pilot'];  // the posts the hand works on the radar (Task 10); the crew work the others for now
const radarPost = () => (RADAR_POSTS.includes(lockPost()) ? lockPost() : null);

// The head start (an ambush, a run that fails) on the radar: today's volley (headStart), taken off the sides where they stand.
function radarHeadStart(state, edge, band) {
  const r = headStart({ ...state, band, locked: [] }, edge, Math.random);
  return { state: { ...state, me: r.state.me, foes: r.state.foes }, events: r.events };
}

// The scene. The view's state (G.radar) is made with the fight and kept across redraws of the same fight; it opens paused, at the fastest speed.
function radarFightEvent(s) {
  if (!G.radar || G.radar.s !== s) {
    G.radar = { s, orders: {}, crew: {}, seen: [], cost: null, running: false, speed: RADAR.SPEEDS[RADAR.SPEEDS.length - 1], why: [], lastPause: null, zoom: null, feed: [], hover: null, ring: null, shown: {},
      post: radarPost(), hand: { aim: { foe: 0, part: 'hull' }, fc: 'gun', fire: true, torp: false, arc: null, coast: 'turn', plot: null, burn: null }, wedge: null, drag: null };
    radarPlan(G.radar);
  }
  return { title: fightSay('title'), personal: true, via: 'crew', owner: 'you', fight: s, board: String(radarPanelHtml(G.radar)), text: s.state.log.join('</p><p>'), choices: [] };
}

// A cycle's plan, at its start: the crew's orders on what the board shows, where the board sees her this cycle (an offset off her true place, kept so her
// contact moves with her), and what the captain's order costs the gun.
function radarPlan(r) {
  const st = r.s.state, h = r.hand;
  r.crew = radarAuto(st, radarLevels(), Math.random);
  r.seen = radarSeen(st, Math.random).map((c, i) => (c ? { x: c.p.x - st.ships[i + 1].p.x, y: c.p.y - st.ships[i + 1].p.y } : null));
  r.cost = radarCost(st, r.crew.order);
  // the hand's post: a torpedo is ordered a cycle at a time; the aim moves off one of hers who is out; the pilot's burn is the order's plot, landing by the hand's scatter, until it is dragged; the aim moves to her hull once its part is gone
  h.torp = false;
  if (radarOut(st.foes[h.aim.foe] || { armor: 0 })) h.aim = { foe: Math.max(0, radarNearest(st)), part: 'hull' };
  else if (h.aim.part !== 'hull' && !(st.foes[h.aim.foe].parts[h.aim.part].hp > 0)) h.aim = { ...h.aim, part: 'hull' };  // a part shot away: on to her hull, so the gun does not fire at nothing
  r.wedge = radarWedge(st, r.crew.order);
  h.plot = r.crew.burn ? { dir: r.wedge.dir, throttle: Math.min(r.wedge.most, r.crew.burn.throttle) } : null;
  h.burn = h.plot ? radarScatter(h.plot, radarLevels()[r.post] || 0, Math.random) : null;
  r.orders = radarCompose(r);
}

// The cycle's orders: the crew's, with the hand's own post's in place of its crew's. The gunner's aim, fire control, fire, arc and torpedo; the pilot's burn,
// and when coasting whether to turn to her or hold the facing.
function radarCompose(r) {
  const o = { ...r.crew }, h = r.hand, st = r.s.state;
  if (r.post === 'gunner') Object.assign(o, { aim: { ...h.aim }, fc: h.fc, fire: h.fire, pdcArc: h.arc || r.crew.pdcArc, torp: h.torp ? h.aim.foe : null, level: radarLevels().gunner });
  if (r.post === 'pilot') {
    const i = radarNearest(st);
    o.burn = h.burn; o.turnTo = h.burn || h.coast !== 'turn' || i < 0 ? null : radarDir(st.ships[0].p, st.ships[i + 1].p);
  }
  return o;
}
const radarHandSet = (r, change) => { Object.assign(r.hand, change); r.orders = radarCompose(r); radarPaint(r); };
const radarSeenNow = r => r.s.state.foes.map((f, i) => { const ship = r.s.state.ships[i + 1], off = r.seen[i]; return off ? { p: { x: ship.p.x + off.x, y: ship.p.y + off.y }, v: { ...ship.v }, a: { ...ship.a } } : null; });

// ---------- real time ----------

const radarShowing = () => !!(G.radar && G.dialog && G.dialog.event.fight === G.radar.s);
function radarTick(dt) {
  if (!radarShowing()) return;
  const r = G.radar;
  if (r.running && dt > 0) radarRun(r, dt * r.speed);
  if (G.radar === r) radarPaint(r);
}

// Runs `seconds` of fight time a step at a time, so that each step's cost, end and pause is seen at the step it comes in.
function radarRun(r, seconds) {
  const s = r.s, dt = radarDt();
  let left = seconds;
  while (left > 1e-9) {
    const was = s.state, take = Math.min(left, (was.step + 1) * dt - was.t);
    const res = radarAdvance(was, r.orders, take, Math.random);
    s.state = res.state; left -= take;
    if (res.events.length && radarAfter(r, was, res.events)) return;
  }
}

// What a step's events do: each goes on the timeline; the ship takes what it cost (fightTook, with today's words for a casualty); then the hand's death, an
// end, a pause, or the next cycle's plan. True when the fight stopped.
function radarAfter(r, was, events) {
  const s = r.s;
  for (const e of events) { const text = radarEventText(s, e); if (text) r.feed.push({ at: e.at, cycle: was.cycle, kind: e.kind, side: e.side, text, p: radarSpot(was, s.state, e) }); }
  s.state.log.push('');
  fightTook(s, radarTook(events));
  const said = s.state.log.pop().trim();
  if (said) r.feed.push({ at: events[0].at, cycle: was.cycle, kind: 'hurt', text: said, p: { ...s.state.ships[0].p } });
  if (s.handDied) { radarStop(); finishEvent(); return true; }  // the hand is dead: the ending is queued (boarders.js)
  const end = radarEnd(s.state);
  if (end) {
    s.state = { ...s.state, log: [...s.state.log, ...r.feed.slice(-2).map(e => e.text)] };  // its last lines, for the close's panel (shipFightEnd)
    radarStop(); shipFightEnd(s, end); finishEvent();
    return true;
  }
  if (s.state.step % RADAR.SUB === 0) radarPlan(r);  // a new cycle's plan, before any pause, so the cycle after it runs on its own orders
  const why = radarQuiet(radarPauses(was, s.state, events), r.lastPause, s.state.t);  // none close after the last (radar.js)
  if (why.length) { r.running = false; r.why = why; r.lastPause = s.state.t; radarPaintBar(r); return true; }
  return false;
}
const radarStop = () => { G.radar = null; };

// The events in today's shape for fightTook: our shots (a miss wears fire control as a shot does) and hers, a torpedo's hit as a hit on the hull.
const radarTook = events => events.flatMap(e => (e.kind === 'hit' ? [{ who: 'me', foe: e.foe, part: e.part, dmg: e.dmg }] : e.kind === 'miss' ? [{ who: 'me', foe: e.foe, part: 'hull', dmg: 0 }]
  : e.kind === 'hitUs' ? [{ who: 'foe', foe: e.foe, part: e.part, dmg: e.dmg }] : e.kind === 'impact' ? [{ who: e.side === 'us' ? 'me' : 'foe', torp: e.side === 'us', part: 'hull', dmg: e.dmg }] : []));

// Where an event happened, for its mark: at her for what was done to or by her, at the torpedo for a kill, at us otherwise.
function radarSpot(was, now, e) {
  const her = i => ({ ...now.ships[(i || 0) + 1].p }), us = { ...now.ships[0].p };
  if (e.kind === 'pdcKill') { const t = was.torps.find(x => x.id === e.torp); return t ? { ...t.p } : us; }
  if (e.kind === 'impact') return e.side === 'us' ? her(0) : us;
  if (e.kind === 'launch') return e.side === 'us' ? us : her(e.foe);
  return ['hit', 'miss', 'armed', 'alongside'].includes(e.kind) ? her(e.foe) : us;
}

// An event's line on the timeline, or null for one that is not news (a cycle's turn, a standing condition).
function radarEventText(s, e) {
  const who = (e.foe ? fightSay('consort') : theShip(s.foe)), part = e.part ? fightSay(`part.${e.part}`) : '';
  switch (e.kind) {
    case 'launch': return radarSay(`ev.launch.${e.side}`, { ship: who });
    case 'armed': return radarSay('ev.armed', { ship: who, n: e.n });
    case 'pdcKill': return radarSay('ev.pdcKill');
    case 'pdcSoon': return radarSay('ev.pdcSoon');
    case 'hit': return radarSay('ev.hit', { part, dmg: e.dmg, km: Math.round(e.km) });
    case 'miss': return radarSay('ev.miss', { km: Math.round(e.km) });
    case 'hitUs': return radarSay('ev.hitUs', { ship: who, part, dmg: e.dmg });
    case 'missUs': return radarSay('ev.missUs', { ship: who });
    case 'impact': return radarSay(`ev.impact.${e.side}`, { dmg: e.dmg });
    case 'order': return radarSay('ev.order', { cap: radarCapName(), order: radarSay(`order.${e.to}`) });
    case 'overheat': return radarSay('ev.overheat');
    case 'gunRange': return radarSay('ev.gunRange', { ship: who });
    case 'alongside': return radarSay('ev.alongside', { ship: who });
    default: return null;
  }
}
const radarCapName = () => { const cap = raidCap(); return cap ? `Captain ${cap.last}` : helmName(); };
const radarClock = t => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

// ---------- the page ----------

function radarPanelHtml(r) {
  return h`<div class="radar-fight">
    <div class="radar-top" role="toolbar" aria-label="${radarSay('controls')}">${radarBarHtml(r)}</div>
    <div class="radar-sit" aria-live="polite">${radarSitHtml(r)}</div>
    <canvas class="radar" role="img" aria-label="${radarSay('radar')}"></canvas>
    <p class="radar-cost hint">${radarCostText(r)}</p>
    <div class="radar-post">${radarPostHtml(r)}</div>
    <div class="radar-line">${radarLineHtml(r)}</div>
  </div>`;
}

function radarBarHtml(r) {
  const on = b => (b ? raw('class="on" aria-pressed="true"') : raw('aria-pressed="false"'));
  return h`<button data-action="radarPlay" class="primary">${radarSay(r.running ? 'pause' : 'play')}</button>
    <span class="radar-group">${RADAR.SPEEDS.map(n => h`<button data-action="radarSpeed" data-arg="${n}" ${on(r.speed === n)}>${radarSay('speed', { n })}</button>`)}</span>
    <span class="radar-group">${[null, ...RADAR.ZOOM].map(km => h`<button data-action="radarZoom" data-arg="${km || 'auto'}" ${on(r.zoom === km)}>${km ? radarSay('zoom', { km }) : radarSay('zoom.auto')}</button>`)}</span>`;
}

// What is happening now: the clock and whether it runs (or why it stopped), her range and its way, her arming, what is inbound, the order, the hulls and the heat.
function radarSitHtml(r) {
  const st = r.s.state, i = radarNearest(st), proj = radarProject(st, r.orders, 4, radarSeenNow(r));
  const inbound = proj.impacts.filter(t => t.side === 'her'), first = inbound.reduce((b, t) => (!b || t.at[0] < b.at[0] ? t : b), null);
  const state = r.running ? radarSay('running', { n: r.speed }) : r.why.length ? `${radarSay('paused')}: ${r.why.map(w => radarSay(`why.${w}`)).join(' ')}` : radarSay('paused');
  const her = i >= 0 ? (() => { const ship = st.ships[i + 1], me = st.ships[0], u = radarUnit(radarDir(me.p, ship.p)), way = (ship.v.x - me.v.x) * u.x + (ship.v.y - me.v.y) * u.y <= 0 ? 'closing' : 'opening';
    return radarSay('range', { km: Math.round(radarRange(st, i + 1)), way: radarSay(way) }); })() : '';
  const hers = i >= 0 ? Math.round(100 * radarHull(st.foes[i])) : 0;
  return h`<span class="radar-clock">${radarSay('clock', { cycle: st.cycle + 1, s: Math.floor(st.t - st.cycle * RADAR.TURN_S) })}</span>
    <span class="radar-state ${r.running ? '' : 'stopped'}">${state}</span>
    <span>${her}</span>${st.armed.some(Boolean) ? h`<span class="warn">${radarSay('arming')}</span>` : ''}
    <span class="radar-threat ${first && first.at[0] < 2 ? 'bad' : ''}">${first ? radarSay('threat', { n: inbound.length, lo: first.at[0].toFixed(1), hi: first.at[1].toFixed(1) }) : radarSay('threat.none')}</span>
    <span>${radarSay('order', { order: radarSay(`order.${r.orders.order || st.order}`) })}</span>
    <span>${radarSay('hulls', { me: Math.round(100 * radarHull(st.me)), her: hers, heat: Math.round(st.heat * 10) / 10, cap: RADAR.HEAT_CAP })}</span>`;
}

const radarCostText = r => (r.cost ? radarSay(r.cost.bears ? 'cost.bears' : `cost.${r.cost.why}`, { order: radarSay(`order.${r.orders.order}`) }) : '');

// The hand's post, under the radar: its choices as tiles, clearly on or off, and its readouts. Nothing for a post the crew work.
function radarPostHtml(r) {
  if (!r.post) return '';
  const st = r.s.state, hd = r.hand, on = b => (b ? raw('class="on" aria-pressed="true"') : raw('aria-pressed="false"')), level = radarLevels()[r.post] || 0;
  const row = (label, buttons) => h`<div class="choice-row" role="group" aria-label="${label}"><span class="row-label">${label}</span><span class="row-picks">${buttons}</span></div>`;
  const read = items => h`<p class="radar-read">${items.map(x => h`<span>${x}</span>`)}</p>`;
  const head = h`<div class="group">${radarSay('console', { post: POSTS[r.post].name })}</div>`;
  if (r.post === 'gunner') {
    const aims = st.foes.map((f, i) => (radarOut(f) ? '' : row(i ? fightSay('consort') : theShip(r.s.foe), ['hull', 'weapons', 'drive', 'lock', ...(f.parts.launcher ? ['launcher'] : [])]
      .map(part => h`<button data-action="radarAimPart" data-arg="${i}:${part}" ${on(hd.aim.foe === i && hd.aim.part === part)}>${fightSay(`aim.${part}`)}</button>`))));
    const sol = radarProject(st, r.orders, 1, radarSeenNow(r)).solution, foe = hd.aim.foe + 1;
    const torp = st.me.launcher && st.me.torps > 0 ? row(radarSay('torp'), h`<button data-action="radarTorp" ${on(hd.torp)}>${radarSay(hd.torp ? 'torp.ordered' : 'torp.fire', { n: st.me.torps })}</button>`) : '';
    return h`${head}${aims}
      ${row(radarSay('fc'), ['gun', 'pdc'].map(k => h`<button data-action="radarFc" data-arg="${k}" ${on(hd.fc === k)}>${radarSay(`fc.${k}`)}</button>`))}
      ${row(radarSay('fire'), ['fire', 'hold'].map(k => h`<button data-action="radarFire" data-arg="${k}" ${on(hd.fire === (k === 'fire'))}>${radarSay(`fire.${k}`)}</button>`))}
      ${torp}
      ${read([radarSay('read.solution', { lo: Math.round(100 * sol[0]), hi: Math.round(100 * sol[1]) }), radarSay('read.spread', { km: st.ships[foe] ? radarSpread(st, level, foe).toFixed(1) : '-' }), radarSay('read.heat', { heat: Math.round(st.heat * 10) / 10, cap: RADAR.HEAT_CAP })])}
      <p class="hint">${radarSay('drag.gunner')}</p>`;
  }
  const me = st.ships[0], i = radarNearest(st), cpa = radarProject(st, r.orders, 4, radarSeenNow(r)).cpa, deg = d => String(Math.round(d)).padStart(3, '0');
  return h`${head}
    ${row(radarSay('coast'), ['turn', 'hold'].map(k => h`<button data-action="radarCoast" data-arg="${k}" ${on(hd.coast === k)}>${radarSay(`coast.${k}`)}</button>`))}
    ${read([hd.burn ? radarSay('read.burn', { dir: deg(hd.burn.dir), pct: Math.round(100 * hd.burn.throttle) }) : radarSay('read.coasting'), radarSay('read.facing', { dir: deg(me.facing) }),
      i >= 0 && radarBears(st, i + 1) ? radarSay('read.bears') : radarSay('read.nobear'), cpa ? radarSay('closest', { lo: Math.round(cpa.min), hi: Math.round(cpa.max), at: cpa.at.toFixed(1) }) : '',
      radarSay('read.scatter', { deg: Math.round(radarScatterOf(level)) }), radarSay('read.speed', { v: Math.hypot(me.v.x, me.v.y).toFixed(2) })].filter(Boolean))}
    <p class="hint">${radarSay('drag.pilot')}</p>`;
}

// What has happened: a tick for each event along the fight so far, the last few in words with their times, and the whole log folded under them.
const RADAR_TICKS = { launch: 'launch', pdcKill: 'kill', hit: 'given', impact: 'given', hitUs: 'taken', miss: 'miss', missUs: 'miss', order: 'order' };
function radarLineHtml(r) {
  const all = r.feed, span = Math.max(RADAR.TURN_S, r.s.state.t), last = all.slice(-RADAR_UI.LAST), from = all.length - last.length;
  const tick = (e, i) => { const k = e.kind === 'impact' && e.side === 'her' ? 'taken' : RADAR_TICKS[e.kind]; return k ? h`<i class="tick ${k}" style="left:${(100 * e.at / span).toFixed(1)}%" data-radar-ev="${i}"></i>` : ''; };
  return h`<div class="radar-ticks" aria-hidden="true">${all.map(tick)}</div>
    <ol class="radar-last">${last.map((e, k) => h`<li data-radar-ev="${from + k}"><b>${radarClock(e.at)}</b> ${e.text}</li>`)}</ol>
    ${all.length > last.length ? h`<details class="radar-log"><summary>${radarSay('log')}</summary><ol>${all.map(e => h`<li><b>${radarClock(e.at)}</b> ${e.text}</li>`)}</ol></details>` : ''}`;
}

// Keeps the page up to date in place: each part's markup is put back only when it has changed, so a hover or a focused button is not lost to a redraw.
function radarPaint(r) {
  const el = UI.el, put = (sel, html) => { const n = el.querySelector(sel); if (n && r.shown[sel] !== html) { n.innerHTML = html; r.shown[sel] = html; } };
  put('.radar-sit', String(radarSitHtml(r)));
  put('.radar-cost', String(radarCostText(r)));
  put('.radar-post', String(radarPostHtml(r)));
  put('.radar-line', String(radarLineHtml(r)));
  const c = el.querySelector('canvas.radar');
  if (c) radarDraw(c, r);
}
function radarPaintBar(r) { const n = UI.el.querySelector('.radar-top'); if (n) n.innerHTML = String(radarBarHtml(r)); radarPaint(r); }

// ---------- the radar ----------

// The reach from our ship to the radar's edge, km: set by hand, or the least of the zooms that keeps her and every torpedo in view.
function radarReach(r) {
  if (r.zoom) return r.zoom;
  const st = r.s.state, me = st.ships[0].p, far = Math.max(0, ...st.foes.map((f, i) => (radarOut(f) ? 0 : radarDist(me, st.ships[i + 1].p))), ...st.torps.map(t => radarDist(me, t.p))) * 1.15;
  return RADAR.ZOOM.find(km => km >= far) || RADAR.ZOOM[RADAR.ZOOM.length - 1];
}

const RADAR_INK = { bg: '#050a11', ring: '#23405f', us: '#cfe3ff', her: '#ff6a4a', ours: '#4aa3ff', track: '#7fb4ff', warn: '#ffcf7f', dim: '#56687a', label: '#cfe3ff' };
function radarDraw(c, r) {
  const dpr = window.devicePixelRatio || 1, w = Math.max(200, c.clientWidth || 600), hgt = Math.round(w * RADAR_UI.RATIO);
  if (c.width !== Math.round(w * dpr) || c.height !== Math.round(hgt * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(hgt * dpr); c.style.height = `${hgt}px`; }
  if (!c.dataset.bound) {  // the hover: the pointer's place on the radar, for the labels that show only on hover
    c.dataset.bound = '1';
    c.addEventListener('mousemove', e => { if (G.radar) { const b = c.getBoundingClientRect(); G.radar.hover = { x: e.clientX - b.left, y: e.clientY - b.top }; } });
    c.addEventListener('mouseleave', () => { if (G.radar) G.radar.hover = null; });
    c.addEventListener('mousedown', e => { const b = c.getBoundingClientRect(); if (G.radar) radarPress(G.radar, e.clientX - b.left, e.clientY - b.top); });
    window.addEventListener('mousemove', e => { const b = c.getBoundingClientRect(); if (G.radar && G.radar.drag) radarDrag(G.radar, e.clientX - b.left, e.clientY - b.top); });
    window.addEventListener('mouseup', () => { if (G.radar && G.radar.drag) radarRelease(G.radar); });
  }
  const g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const st = r.s.state, me = st.ships[0], reach = radarReach(r), cx = w / 2, cy = hgt / 2, k = (Math.min(w, hgt) / 2 - 10) / reach;
  const px = p => ({ x: cx + (p.x - me.p.x) * k, y: cy - (p.y - me.p.y) * k });
  const font = n => `${n}px "IBM Plex Mono", monospace`, labels = [], hovers = [], said = [];
  const text = (str, x, y, color = RADAR_INK.label, size = 11, up = false) => { said.push(str); g.font = font(size); g.fillStyle = color; g.fillText(up ? str.toUpperCase() : str, x, y); };  // up: a main label, in capitals
  const dir = (d, len) => ({ x: Math.sin(d * Math.PI / 180) * len, y: -Math.cos(d * Math.PI / 180) * len });
  g.fillStyle = RADAR_INK.bg; g.fillRect(0, 0, w, hgt);
  g.strokeStyle = RADAR_INK.ring; g.lineWidth = 1;
  for (let n = 1; n <= 4; n++) { g.beginPath(); g.arc(cx, cy, reach * k * n / 4, 0, 2 * Math.PI); g.stroke(); }
  text(radarSay('reach', { km: reach }), 8, hgt - 8, RADAR_INK.dim, 10);
  // the gun's bearing either side of the nose, and the PDC's arc
  g.strokeStyle = 'rgba(207,227,255,0.18)';
  for (const side of [-1, 1]) { const d = dir(me.facing + side * RADAR.BEAR, reach * k); g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + d.x, cy + d.y); g.stroke(); }
  const arc = st.pdcArc, a0 = (arc.dir - arc.width / 2 - 90) * Math.PI / 180, a1 = (arc.dir + arc.width / 2 - 90) * Math.PI / 180;
  g.fillStyle = st.fc === 'pdc' ? 'rgba(74,163,255,0.25)' : 'rgba(74,163,255,0.1)'; g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, Math.max(4, radarPdcReach(st) * k), a0, a1); g.closePath(); g.fill();
  const handles = [], marks = [];
  if (r.post === 'gunner') {  // the arc's two ends, at a fixed size so they can be taken at any zoom; dashed while the fire control is on the gun (the PDC stowed)
    const ga = r.hand.arc || r.orders.pdcArc || arc;
    g.strokeStyle = RADAR_INK.ours; if (st.fc !== 'pdc') g.setLineDash([3, 3]); g.beginPath(); g.arc(cx, cy, RADAR_UI.ARC, (ga.dir - ga.width / 2 - 90) * Math.PI / 180, (ga.dir + ga.width / 2 - 90) * Math.PI / 180); g.stroke(); g.setLineDash([]);
    for (const edge of [-1, 1]) { const d = dir(ga.dir + edge * ga.width / 2, RADAR_UI.ARC), q = { x: cx + d.x, y: cy + d.y }; g.fillStyle = RADAR_INK.ours; g.beginPath(); g.arc(q.x, q.y, 4, 0, 2 * Math.PI); g.fill(); handles.push({ ...q, edge }); hovers.push({ ...q, text: radarSay('arc.edge') }); }
  }
  if (r.post === 'pilot') {  // the order's wedge, the burn put and where it lands, and the scatter either side of it
    const R = RADAR_UI.WEDGE, hd = r.hand, w = r.wedge;
    if (w && w.dir !== null) { g.fillStyle = 'rgba(207,227,255,0.08)'; g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, R, (w.dir - w.half - 90) * Math.PI / 180, (w.dir + w.half - 90) * Math.PI / 180); g.closePath(); g.fill(); const d = dir(w.dir, R); hovers.push({ x: cx + d.x, y: cy + d.y, text: radarSay('wedge') }); }
    const ray = (b, dash, color) => { const d = dir(b.dir, R * Math.max(0.15, b.throttle)); g.strokeStyle = color; g.setLineDash(dash); g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + d.x, cy + d.y); g.stroke(); g.setLineDash([]); return { x: cx + d.x, y: cy + d.y }; };
    if (hd.plot) {
      const q = ray(hd.plot, [4, 3], RADAR_INK.track), sc = radarScatterOf(radarLevels().pilot || 0);
      hovers.push({ ...q, text: radarSay('plot') });
      if (sc > 0) for (const side of [-1, 1]) { const d = dir(hd.plot.dir + side * sc, R * Math.max(0.15, hd.plot.throttle)); g.strokeStyle = RADAR_INK.dim; g.beginPath(); g.arc(cx + d.x, cy + d.y, 4, 0, 2 * Math.PI); g.stroke(); }
    }
    if (hd.burn) hovers.push({ ...ray(hd.burn, [], RADAR_INK.us), text: radarSay('landed') });
  }
  // the projected tracks, a dot a cycle, hers in their bands, and closest approach
  const seen = radarSeenNow(r), proj = radarProject(st, r.orders, 4, seen);
  proj.tracks.forEach((track, t) => track.forEach((pt, n) => {
    if (!n) return;
    const q = px(pt.p); g.fillStyle = t ? RADAR_INK.her : RADAR_INK.track; g.beginPath(); g.arc(q.x, q.y, 2, 0, 2 * Math.PI); g.fill();
    if (t && pt.band * k > 2) { g.strokeStyle = 'rgba(255,106,74,0.35)'; g.beginPath(); g.arc(q.x, q.y, pt.band * k, 0, 2 * Math.PI); g.stroke(); }
    if (t || Math.hypot(q.x - cx, q.y - cy) > RADAR_UI.HOVER) hovers.push({ ...q, text: radarSay(t ? 'track.her' : 'track.us', { n: radarSay(n === 1 ? 'cycle' : 'cycles', { n }) }) });  // our track's dots only clear of the ship, as the ghost is
  }));
  if (proj.cpa) labels.push(radarSay(proj.cpa.at < 0.05 ? 'closest.now' : 'closest', { lo: Math.round(proj.cpa.min), hi: Math.round(proj.cpa.max), at: proj.cpa.at.toFixed(1) }));  // now: the range is opening
  // the torpedoes, each on its way to its target; the nearest of hers labelled with its impact
  const nearest = st.torps.filter(t => t.side === 'her').sort((a, b) => radarDist(a.p, me.p) - radarDist(b.p, me.p))[0];
  for (const t of st.torps) {
    const q = px(t.p), to = px(st.ships[t.target].p), imp = proj.impacts.find(x => x.torp === t.id);
    g.strokeStyle = t.side === 'her' ? 'rgba(255,207,127,0.5)' : 'rgba(74,163,255,0.5)'; g.setLineDash([4, 3]); g.beginPath(); g.moveTo(q.x, q.y); g.lineTo(to.x, to.y); g.stroke(); g.setLineDash([]);
    g.fillStyle = t.side === 'her' ? RADAR_INK.warn : RADAR_INK.ours; g.fillRect(q.x - 2.5, q.y - 2.5, 5, 5);
    const say = imp ? radarSay(`torp.${t.side}`, { lo: imp.at[0].toFixed(1), hi: imp.at[1].toFixed(1) }) : radarSay(`torp.${t.side}`, { lo: '?', hi: '?' });
    if (t === nearest) text(say, q.x + 6, q.y - 6, RADAR_INK.warn, 10, true); else hovers.push({ ...q, text: say });
  }
  // her, where the board sees her, with her facing and the error round her; a contact the board does not see is drawn where it was last seen, dim
  st.foes.forEach((f, i) => {
    const c2 = seen[i], ship = st.ships[i + 1], q = px(c2 ? c2.p : ship.p), out = radarOut(f);
    g.globalAlpha = out ? 0.4 : c2 ? 1 : 0.4;
    g.fillStyle = RADAR_INK.her; g.beginPath(); g.arc(q.x, q.y, 5, 0, 2 * Math.PI); g.fill();
    const d = dir(ship.facing, 9); g.strokeStyle = RADAR_INK.her; g.beginPath(); g.moveTo(q.x, q.y); g.lineTo(q.x + d.x, q.y + d.y); g.stroke();
    const e = radarError(st) * k; if (e > 3) { g.strokeStyle = 'rgba(255,106,74,0.5)'; g.beginPath(); g.arc(q.x, q.y, e, 0, 2 * Math.PI); g.stroke(); }
    g.globalAlpha = 1;
    if (r.post === 'gunner' && !out) {  // her parts as marks on her contact: a click on one aims there
      const parts = ['hull', 'weapons', 'drive', 'lock', ...(f.parts.launcher ? ['launcher'] : [])], at = { hull: [0, 0], weapons: [0, -12], drive: [0, 12], lock: [-12, 0], launcher: [12, 0] };
      for (const part of parts) {
        const m = { x: q.x + at[part][0], y: q.y + at[part][1], foe: i, part }, aimed = r.hand.aim.foe === i && r.hand.aim.part === part;
        if (part !== 'hull') { g.fillStyle = (f.parts[part].hp > 0 ? RADAR_INK.warn : RADAR_INK.dim); g.fillRect(m.x - 3, m.y - 3, 6, 6); }
        if (aimed) { g.strokeStyle = RADAR_INK.us; g.beginPath(); g.arc(m.x, m.y, 7, 0, 2 * Math.PI); g.stroke(); }
        marks.push(m);
        hovers.push({ ...m, text: part === 'hull' ? radarSay('mark.hull', { ship: i ? fightSay('consort') : theShip(r.s.foe), hp: f.armor, max: f.maxArmor }) : radarSay('mark', { part: fightSay(`part.${part}`), hp: f.parts[part].hp, max: f.parts[part].max }) });
      }
    }
    const say = radarSay('her', { ship: i ? fightSay('consort') : theShip(r.s.foe), km: Math.round(radarRange(st, i + 1)) });
    if (!i) text(say, q.x + 8, q.y + 4, RADAR_INK.her, 10, true); else hovers.push({ ...q, text: say });
  });
  // our ship at the centre, and the ghost of it at the cycle's end showing where the nose will point, when it is clear of the ship
  const ship = (x, y, facing, stroke) => { const n = dir(facing, 8), l = dir(facing + 140, 6), rr = dir(facing - 140, 6); g.beginPath(); g.moveTo(x + n.x, y + n.y); g.lineTo(x + l.x, y + l.y); g.lineTo(x + rr.x, y + rr.y); g.closePath(); if (stroke) { g.setLineDash([2, 2]); g.strokeStyle = RADAR_INK.us; g.stroke(); g.setLineDash([]); } else { g.fillStyle = RADAR_INK.us; g.fill(); } };
  if (r.cost && proj.tracks[0][1]) { const q = px(proj.tracks[0][1].p); if (Math.hypot(q.x - cx, q.y - cy) > RADAR_UI.HOVER) { ship(q.x, q.y, r.cost.endFacing, true); hovers.push({ ...q, text: radarSay('ghost') }); } }
  ship(cx, cy, me.facing, false);
  hovers.push({ x: cx, y: cy, text: radarSay('you', { facing: String(Math.round(me.facing)).padStart(3, '0'), v: Math.hypot(me.v.x, me.v.y).toFixed(2) }) });
  // the event marks, fading over FADE cycles: a cross for a kill, a burst for a hit, a ring for a launch
  for (const e of r.feed) {
    const age = (st.t - e.at) / RADAR.TURN_S; if (age > RADAR_UI.FADE || !e.p) continue;
    const q = px(e.p); g.globalAlpha = 1 - age / RADAR_UI.FADE; g.strokeStyle = e.kind === 'hitUs' || (e.kind === 'impact' && e.side === 'her') ? RADAR_INK.her : RADAR_INK.warn; g.beginPath();
    if (e.kind === 'pdcKill') { g.moveTo(q.x - 5, q.y - 5); g.lineTo(q.x + 5, q.y + 5); g.moveTo(q.x + 5, q.y - 5); g.lineTo(q.x - 5, q.y + 5); }
    else if (e.kind === 'launch') g.arc(q.x, q.y, 8, 0, 2 * Math.PI);
    else if (['hit', 'hitUs', 'impact'].includes(e.kind)) for (let n = 0; n < 8; n++) { const d1 = dir(n * 45, 4), d2 = dir(n * 45, 9); g.moveTo(q.x + d1.x, q.y + d1.y); g.lineTo(q.x + d2.x, q.y + d2.y); }
    g.stroke(); g.globalAlpha = 1;
  }
  if (r.ring && r.ring.p) { const q = px(r.ring.p); g.strokeStyle = RADAR_INK.warn; g.lineWidth = 2; g.beginPath(); g.arc(q.x, q.y, 12, 0, 2 * Math.PI); g.stroke(); g.lineWidth = 1; }
  // the main labels, along the top; why it stopped, over them; the hover's label at the pointer
  labels.forEach((l, n) => text(l, 8, 16 + n * 14, RADAR_INK.track, 10, true));
  if (!r.running && r.why.length) text(r.why.map(x => radarSay(`why.${x}`)).join(' '), 8, 16 + labels.length * 14, RADAR_INK.warn, 11, true);
  const near = r.hover && hovers.filter(o => Math.hypot(o.x - r.hover.x, o.y - r.hover.y) <= RADAR_UI.HOVER).sort((a, b) => Math.hypot(a.x - r.hover.x, a.y - r.hover.y) - Math.hypot(b.x - r.hover.x, b.y - r.hover.y))[0];
  if (near) { g.font = font(11); const tw = g.measureText(near.text).width, x = Math.min(w - tw - 10, near.x + 10), y = Math.max(14, near.y - 10); g.fillStyle = 'rgba(5,10,17,0.85)'; g.fillRect(x - 4, y - 11, tw + 8, 15); text(near.text, x, y); }
  r.geo = { cx, cy, R: Math.min(w, hgt) / 2 - 10 };  // where the radar's centre is, for a press and a drag
  r.drawn = { reach, hover: near ? near.text : null, says: [...said, ...hovers.map(o => o.text)], marks, handles };  // for the tests: the zoom in use, the label the hover shows, and every word the radar has on it
}

// ---------- the controls ----------

// A press on the radar: the gunner aims at the part mark under it or takes an end of the PDC's arc; the pilot puts the burn where it is dragged.
const radarAngle = (r, x, y) => radarNorm(Math.atan2(x - r.geo.cx, r.geo.cy - y) * 180 / Math.PI);
function radarPress(r, x, y) {
  if (!r.geo || !r.drawn) return;
  const near = (list, d) => list.find(m => Math.hypot(m.x - x, m.y - y) <= d);
  if (r.post === 'gunner') {
    const m = near(r.drawn.marks, 6);
    if (m) { radarHandSet(r, { aim: { foe: m.foe, part: m.part } }); return; }
    const end = near(r.drawn.handles, 9);
    if (end) r.drag = { kind: 'arc', edge: end.edge };
  }
  if (r.post === 'pilot') { r.drag = { kind: 'burn' }; radarDrag(r, x, y); }
}
function radarDrag(r, x, y) {
  const a = radarAngle(r, x, y);
  if (r.drag.kind === 'arc') {
    const now = r.hand.arc || r.orders.pdcArc, lo = r.drag.edge < 0 ? a : now.dir - now.width / 2, hi = r.drag.edge > 0 ? a : now.dir + now.width / 2;
    const width = Math.max(RADAR_UI.ARC_MIN, Math.min(RADAR_UI.ARC_MAX, radarNorm(hi - lo)));
    radarHandSet(r, { arc: { dir: radarNorm(r.drag.edge > 0 ? hi - width / 2 : lo + width / 2), width } });
  } else if (r.wedge) { r.hand.plot = radarHold({ dir: a, throttle: Math.min(1, Math.hypot(x - r.geo.cx, y - r.geo.cy) / RADAR_UI.WEDGE) }, r.wedge); radarPaint(r); }
}
// Let go: the burn put lands by the hand's scatter, and the ship flies it from the next step.
function radarRelease(r) {
  if (r.drag.kind === 'burn' && r.hand.plot) radarHandSet(r, { burn: radarScatter(r.hand.plot, radarLevels().pilot || 0, Math.random) });
  r.drag = null;
}

function radarToggle() { const r = G.radar; if (!r) return; r.running = !r.running; if (r.running) r.why = []; radarPaintBar(r); }
Mods.register({
  id: 'radar-fight', name: 'The ship fight on the radar', builtin: true,
  init(M) {
    M.on('frame', dt => radarTick(dt));
    M.action('radarPlay', () => radarToggle());
    M.action('radarSpeed', n => { if (G.radar) { G.radar.speed = Number(n); radarPaintBar(G.radar); } });
    M.action('radarZoom', km => { if (G.radar) { G.radar.zoom = km === 'auto' ? null : Number(km); radarPaintBar(G.radar); } });
    // the hand's post: the gunner's aim, fire control, fire or hold, and torpedo; the pilot's turn or hold when coasting
    M.action('radarAimPart', arg => { const [foe, part] = String(arg).split(':'); if (G.radar) radarHandSet(G.radar, { aim: { foe: Number(foe), part } }); });
    M.action('radarFc', k => { if (G.radar) radarHandSet(G.radar, { fc: k === 'pdc' ? 'pdc' : 'gun' }); });
    M.action('radarFire', k => { if (G.radar) radarHandSet(G.radar, { fire: k === 'fire' }); });
    M.action('radarTorp', () => { if (G.radar) radarHandSet(G.radar, { torp: !G.radar.hand.torp }); });
    M.action('radarCoast', k => { if (G.radar) radarHandSet(G.radar, { coast: k === 'hold' ? 'hold' : 'turn' }); });
  },
});
// Space pauses and resumes, wherever the focus is, and does not also press a focused button (a button is pressed on Space's keyup)
for (const kind of ['keydown', 'keyup']) {
  window.addEventListener(kind, e => {
    if (e.code !== 'Space' || !radarShowing() || G.paused) return;
    e.preventDefault(); e.stopImmediatePropagation();
    if (kind === 'keydown' && !e.repeat) radarToggle();
  }, { capture: true });
}
// hovering an event on the timeline rings its spot on the radar
document.addEventListener('mouseover', e => { const li = e.target.closest && e.target.closest('[data-radar-ev]'); if (G.radar) G.radar.ring = li ? G.radar.feed[Number(li.dataset.radarEv)] || null : null; });
