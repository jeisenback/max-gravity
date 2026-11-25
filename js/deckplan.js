'use strict';

// The deck fight on the deck plan, its rules (docs/superpowers/specs/2026-11-16-boarding-deck-plan-design.md, #1352): a turn played spot
// by spot through a ship's decks (layouts.js deckSpots, spotLinks, spotPath, inLine). Each figure is one person, wounded by a first hit and
// downed by a second; two sides never share a spot. Their move and our crew's are drawn before the hand commits (planTheirMove,
// planCrewMoves), the hand picks a move, an act and one order (planChoices), and planTurn resolves it: moves, fire, the charge, the wave,
// the end. Pure: it reads no G, changes nothing it is given, and takes `rand`. Runs in Node (tests/deckplan.test.js). Loaded after
// fight.js (DECK), layouts.js, shipcombat.js (CUNNING), boarders.js (REPEL_HURT) and radar.js (RADAR.SUGGEST).

// Starting numbers, to be tuned against the targets in part 4 (#1353).
const PLAN = {
  CAP: 3,           // people on a spot, at most
  MADE: 2,          // the cover a worked cover ability adds to its spot
  COVER_CAP: 3,     // a spot's cover, with what was made and the kit, at most
  RUSH: 2,          // the spots a raider's rush goes in a turn
  TURNS: 12,        // the attackers withdraw at the end of this turn: a repel won, an assault lost (DECK.TURNS on the strip)
  NAVY_TURNS: 8,    // a navy inspection's own cap (DECK.NAVY_TURNS on the strip)
  HIT: { base: 0.35, level: 0.06, cover: 0.12, moved: 0.1, min: 0.05, max: 0.9 },  // a shot's odds: the shooter's level, the target spot's cover, and moving first
  CHARGES: 2,       // a corsair's breaching charges a fight (the prototype's; the strip limits them only by never two turns running)
  CAPTAIN_LEVEL: 3, // the captain's shooting
  NAVY_HOLD: 0.3,   // a navy head with a shot at these odds or better holds and shoots rather than push
  REST: 'bunksM',   // where one of our crew with no post of their own stands when the boarders come
};
const PLAN_HOME = { captain: 'helm' };  // the captain on our bridge, with the pilot

// ---------- the state ----------
const planSpot = (st, id) => deckSpot(st.lay, id);
const planUp = (st, side) => st.figures.filter(f => f.hp > 0 && (!side || f.side === side));
const planAt = (st, spot, side) => planUp(st, side).filter(f => f.spot === spot);
const planHeld = (st, spot) => { const f = planUp(st).find(x => x.spot === spot); return f ? f.side : null; };
const planCover = (st, spot) => Math.min(PLAN.COVER_CAP, planSpot(st, spot).cover + (st.cover[spot] || 0) + (planAt(st, spot, 'us').some(f => f.hand) ? st.kitCover : 0));
const planAttackers = st => (st.assault ? 'us' : 'them');
const planOther = side => (side === 'us' ? 'them' : 'us');
const planBridge = st => deckSpots(st.lay).filter(p => p.deck === 0).map(p => p.id);  // the bridge's spots: ours repelling, hers boarding her
const planLock = () => ['outer'];  // every layout's outer door is its lock's
const planHome = st => (st.assault ? planLock(st) : planBridge(st));  // where pulling back goes: toward our bridge, or boarding her, toward her lock
const planLevel = (st, f) => (f.side === 'us' ? f.level : 1 + st.grade);

// The nearest spot to `want` (want first) with room and none of the other side: where a figure is put, crowding outward.
function planPlace(st, want, side) {
  const links = spotLinks(st.lay), seen = { [want]: true }, q = [want];
  while (q.length) {
    const c = q.shift();
    if (planHeld(st, c) !== planOther(side) && planAt(st, c, side).length < PLAN.CAP) return c;
    for (const n of links[c]) if (!seen[n]) { seen[n] = true; q.push(n); }
  }
  return want;
}
const planPut = (st, fig, want) => { st.figures.push({ ...fig, hp: 2, spot: planPlace(st, want, fig.side) }); };
const planPostSpot = (lay, post) => ((lay.spots || []).find(p => p.post === post) || {}).id;

// The fight's opening. `crew`: [{ id, name, level, post, odds: { steady, cover } }]; `hand`: { level, post, odds }; `captain`: { name } or null.
// Repelling, ours stand at their posts and half the boarders are at our outer door, the rest a wave; boarding her, ours are at her outer
// door and hers through her decks from her bridge down.
function planFight({ lay, crew, hand, captain, party, boarders, grade = 0, assault = false, kitCover = 0 }) {
  const st = { lay, figures: [], sealed: {}, cover: {}, turn: 0, wave: 0, began: boarders, charges: party === 'corsair' ? PLAN.CHARGES : 0,
    lastCharge: -9, party, grade, assault, kitCover, coverUsed: false, friend: true, log: [], events: [] };
  const theirs = n => Array.from({ length: n }, (_, i) => ({ id: `t${st.figures.filter(f => f.side === 'them').length + 1}`, side: 'them', name: '', level: 1 + grade }));
  const ours = [{ id: 'hand', side: 'us', name: '', level: hand.level, post: hand.post, odds: hand.odds, hand: true }, ...crew.map(c => ({ ...c, side: 'us' }))];
  if (assault) {
    const lock = planLock(st)[0];
    for (const f of ours) planPut(st, f, lock);
    const room = deckSpots(lay).filter(p => p.deck < deckSpot(lay, lock).deck).sort((a, b) => a.deck - b.deck);
    for (let i = 0; i < boarders; i++) planPut(st, theirs(1)[0], room[i % room.length].id);
    return st;
  }
  if (captain) planPut(st, { id: 'captain', side: 'us', name: captain.name, level: PLAN.CAPTAIN_LEVEL, captain: true }, PLAN_HOME.captain);
  for (const f of ours) planPut(st, f, planPostSpot(lay, f.post) || PLAN.REST);
  const first = Math.ceil(boarders / 2);
  for (let i = 0; i < first; i++) planPut(st, theirs(1)[0], 'outer');
  st.wave = boarders - first;
  return st;
}
const planCopy = st => ({ ...st, figures: st.figures.map(f => ({ ...f })), sealed: { ...st.sealed }, cover: { ...st.cover }, log: [...st.log], events: [] });

// ---------- shots ----------
const planOdds = (st, f, from, at, moved) => {
  const H = PLAN.HIT;
  return Math.max(H.min, Math.min(H.max, H.base + H.level * planLevel(st, f) - H.cover * planCover(st, at) - (moved ? H.moved : 0)));
};
// The best shot for `f` standing at `from`: the spot of the other side in line with the best odds, the nearest first on a tie.
function planAim(st, f, from, moved, extra = []) {
  const p = planSpot(st, from), foe = planOther(f.side);
  const spots = [...new Set(planUp(st, foe).map(x => x.spot))].filter(s => inLine(st.lay, from, s, st.sealed) || extra.includes(s));
  const best = spots.map(s => ({ at: s, odds: planOdds(st, f, from, s, moved), d: Math.abs(planSpot(st, s).x - p.x) + Math.abs(planSpot(st, s).deck - p.deck) }))
    .sort((a, b) => b.odds - a.odds || a.d - b.d)[0];
  return best ? { id: f.id, at: best.at, odds: best.odds } : null;
}

// ---------- their move ----------
// A step for `f` toward `goals`: { path } over open hatches, or the hatch to cut first when every path is sealed.
function planRoute(st, from, goals) {
  const open = spotPath(st.lay, from, goals, st.sealed);
  if (open) return { next: open.next };
  const any = spotPath(st.lay, from, goals);
  if (!any || !any.next) return { next: null };
  const h = spotHatch(st.lay, from, any.next);
  return h && st.sealed[h] ? { cut: h } : { next: any.next };
}
// The attackers repelling, drawn before the hand commits. Raiders rush two spots where the spot on their path holds fewer of ours than half
// of them and the hand is not on it; corsairs set a charge from a spot next to the spot of ours with the most heads (never two turns
// running, while charges last); the navy pushes and holds. Every path sealed: they cut the hatch. A veteran's push may feint, at CUNNING a
// grade, never the navy's, a rush or a charge. Boarding her, her crew hold their spots, shoot, and seal the hatch over ours once.
function planTheirMove(st, rand) {
  const out = { moves: [], shots: [], charge: null, cut: null, seal: null, feint: false };
  const them = planUp(st, 'them'), into = {};
  if (st.assault) {
    const ours = planUp(st, 'us'), top = Math.min(...ours.map(f => planSpot(st, f.spot).deck)), h = `h${top - 1}`;
    if (!st.herSealed && top > 0 && !st.sealed[h] && !them.some(f => planSpot(st, f.spot).deck >= top)) out.seal = h;
    for (const f of them) { const s = planAim(st, f, f.spot, false); if (s) out.shots.push(s); }
    return out;
  }
  const goals = planBridge(st), dist = f => (spotPath(st.lay, f.spot, goals) || { dist: 99 }).dist;
  if (st.party === 'corsair' && st.charges > 0 && st.turn - st.lastCharge >= 2) {
    const links = spotLinks(st.lay), targets = [...new Set(planUp(st, 'us').map(f => f.spot))]
      .map(on => ({ on, n: planAt(st, on, 'us').length, from: links[on].find(s => planHeld(st, s) === 'them' && !st.sealed[spotHatch(st.lay, s, on)]) }))
      .filter(t => t.from).sort((a, b) => b.n - a.n);
    if (targets[0]) out.charge = { on: targets[0].on, from: targets[0].from, setter: planAt(st, targets[0].from, 'them')[0].id };
  }
  for (const f of [...them].sort((a, b) => dist(a) - dist(b))) {
    if (out.charge && out.charge.setter === f.id) continue;
    const r = planRoute(st, f.spot, goals);
    if (r.cut) { if (!out.cut) { out.cut = r.cut; out.cutter = f.id; } continue; }
    // the steps on their path this turn: one, or a raider's rush of two, which goes through a spot of ours held by fewer than half of them
    // with the hand not on it, and stops at one held by more, by the hand, or full
    const steps = [];
    for (let k = 0, at = f.spot; k < (st.party === 'raider' ? PLAN.RUSH : 1); k++) {
      const n = planRoute(st, at, goals).next;
      if (!n) break;
      steps.push(n); at = n;
      const ours = planAt(st, n, 'us');
      if (ours.length && (ours.length * 2 >= them.length || ours.length >= PLAN.CAP || ours.some(x => x.hand))) break;
    }
    const land = [...steps].reverse().find(s => planHeld(st, s) !== 'us' && planAt(st, s, 'them').length + (into[s] || 0) < PLAN.CAP);
    const hold = st.party === 'navy' && (planAim(st, f, f.spot, false) || { odds: 0 }).odds >= PLAN.NAVY_HOLD;
    if (land && !hold) {
      into[land] = (into[land] || 0) + 1;
      out.moves.push({ id: f.id, to: land, rush: steps.indexOf(land) > 0, path: steps.slice(0, steps.indexOf(land) + 1) });
      if (steps.indexOf(land) > 0) continue;
      const s = planAim(st, f, land, true); if (s) out.shots.push(s);
    } else { const s = planAim(st, f, f.spot, false); if (s) out.shots.push(s); }
  }
  out.feint = st.party !== 'navy' && !out.charge && st.grade > 0 && out.moves.length > 0 && !out.moves.some(m => m.rush) && rand() < CUNNING * st.grade;
  return out;
}

// ---------- our side ----------
const planStrength = (st, side) => planUp(st, side).reduce((n, f) => n + (f.hp === 2 ? 1 : 0.6), 0) + (side === 'them' ? st.wave : 0);
// The captain's standing order: hold, push them back (boarding her, push for her bridge), or fall back to our bridge (boarding her, to her lock).
function planCaptain(st, nerve) {
  const ours = planStrength(st, 'us'), theirs = planStrength(st, 'them');
  if (ours < theirs && nerve < 0.6) return 'fall';
  if (!st.wave && (theirs <= 2 || ours >= theirs + 2 - nerve)) return 'push';
  return 'hold';
}
// Our crew under the order (the hand and the captain stand where they are): a step toward the order's goal, onto no spot of theirs and no full
// spot, then each a shot from where they will stand. `order` is the captain's ('hold' | 'push' | 'fall'); `named` the hand's order this turn.
function planCrewMoves(st, order, named = null) {
  const out = { moves: [], shots: [] }, into = {};
  const foes = [...new Set(planUp(st, 'them').map(f => f.spot))];
  const goal = order === 'fall' ? planHome(st) : order === 'push' ? (st.assault ? planBridge(st) : foes) : null;
  for (const f of planUp(st, 'us')) {
    if (f.hand) continue;
    let to = null;
    if (named && named.id === f.id && named.kind === 'move') to = named.to;
    else if (goal && !f.captain && !(named && named.id === f.id && named.kind === 'hold')) {
      const r = planRoute(st, f.spot, goal);
      if (r.next && planHeld(st, r.next) !== 'them' && planAt(st, r.next, 'us').length + (into[r.next] || 0) < PLAN.CAP) to = r.next;
    }
    if (to) { into[to] = (into[to] || 0) + 1; out.moves.push({ id: f.id, to }); }
    const s = planAim(st, f, to || f.spot, !!to);
    if (s) out.shots.push(s);
  }
  return out;
}
// The hand's reach: every spot in line, and from DECK.SIDEARM_REACH_LEVEL a spot one step on through an open hatch.
const planReach = (st, hand, from) => (hand.level >= DECK.SIDEARM_REACH_LEVEL ? spotLinks(st.lay)[from].filter(s => !st.sealed[spotHatch(st.lay, from, s)]) : []);
// What the hand may do this turn: a step (a linked spot through an open hatch, with room and none of theirs), an act, and an order to a named crewmate.
function planChoices(st, moved = false) {
  const hand = st.figures.find(f => f.hand), links = spotLinks(st.lay)[hand.spot];
  const moves = links.filter(s => !st.sealed[spotHatch(st.lay, hand.spot, s)] && planHeld(st, s) !== 'them' && planAt(st, s, 'us').length < PLAN.CAP);
  const shot = planAim(st, hand, hand.spot, moved, planReach(st, hand, hand.spot));
  const foes = [...new Set(planUp(st, 'them').map(f => f.spot))].filter(s => inLine(st.lay, hand.spot, s, st.sealed) || planReach(st, hand, hand.spot).includes(s));
  const acts = [
    { kind: 'shoot', targets: foes.map(at => ({ at, odds: planOdds(st, hand, hand.spot, at, moved) })), odds: shot ? shot.odds : 0 },
    { kind: 'steady', odds: hand.odds.steady },
    ...(st.coverUsed ? [] : [{ kind: 'cover', odds: hand.odds.cover }]),
    ...(moved ? [] : [{ kind: 'pullback', odds: 1 }]),
    { kind: 'holdfire', odds: 1 },
  ];
  const orders = planUp(st, 'us').filter(f => !f.hand && !f.captain && f.odds).flatMap(f => [
    { id: f.id, kind: 'steady', odds: f.odds.steady },
    ...(st.coverUsed ? [] : [{ id: f.id, kind: 'cover', odds: f.odds.cover }]),
    ...(HATCH_ORDER[f.post] ? [{ id: f.id, kind: 'seal', odds: f.odds[HATCH_ORDER[f.post]] }, { id: f.id, kind: 'open', odds: f.odds[HATCH_ORDER[f.post]] }] : []),
    { id: f.id, kind: 'move', odds: 1 }, { id: f.id, kind: 'hold', odds: 1 },
  ]);
  return { moves, acts, orders };
}
// A suggestion to the captain taken: the ship fight's range by level (RADAR.SUGGEST), her opinion of the hand (-1 to 1), what the decks show, and her nerve.
function planSuggestOdds(st, level, opinion, intent, nerve = 0.5) {
  const [lo, hi] = RADAR.SUGGEST, ours = planStrength(st, 'us'), theirs = planStrength(st, 'them');
  const shows = { push: ours > theirs + 1 ? 0.15 : -0.15, fall: ours < theirs ? 0.15 : -0.15, hold: 0.05 }[intent];
  const fit = { push: (nerve - 0.5) * 0.2, fall: (0.5 - nerve) * 0.2, hold: 0 }[intent];
  return Math.max(0.05, Math.min(0.95, lo + (hi - lo) * Math.min(level, 5) / 5 + 0.1 * opinion + shows + fit));
}

// ---------- the turn ----------
// A hit on a spot: an unwounded one there is wounded, else a wounded one is downed (the hand's shot, `sidearm`, downs the wounded first). A hit meant for the hand is taken by a friend standing
// there, once a fight; otherwise it is the hand's hurt roll's (the screen's, REPEL_HURT.lose times DECK.SUIT), and the hand stays up.
function planHit(st, side, spot, rand, events, how, sidearm = false) {
  const there = planAt(st, spot, side);
  if (!there.length) return false;
  const first = there.filter(f => (f.hp === 1) === sidearm), pool = first.length ? first : there;
  let f = pool[Math.floor(rand() * pool.length)];
  if (f.hand) {
    const friend = there.find(x => !x.hand);
    if (st.friend && friend) { st.friend = false; f = friend; events.push({ kind: 'shielded', id: f.id, spot }); }
    else { events.push({ kind: 'handHit', spot, how }); return true; }
  }
  f.hp--;
  events.push({ kind: f.hp ? 'wound' : 'down', id: f.id, side, spot, how, ...(f.captain ? { captain: true } : {}) });
  return true;
}
const planDown = (st, f, events, how) => { f.hp = 0; events.push({ kind: 'down', id: f.id, side: f.side, spot: f.spot, how, ...(f.captain ? { captain: true } : {}) }); };
// The step from `spot` toward `goals`, onto no spot of theirs and no full one.
// Where a drawn move ends now: the planned spot, or, where a hatch on its path was sealed this turn, the last spot before it if `side` may
// stand there, else where the figure is.
function planStop(st, f, path) {
  let at = f.spot;
  for (const s of path) { if (st.sealed[spotHatch(st.lay, at, s)]) break; at = s; }
  const ok = at === path[path.length - 1] || (planHeld(st, at) !== planOther(f.side) && planAt(st, at, f.side).length < PLAN.CAP);
  return ok ? at : f.spot;
}
const planBack = (st, spot, goals) => { const r = spotPath(st.lay, spot, goals, st.sealed); return r && r.next && planHeld(st, r.next) !== 'them' ? r.next : null; };

// One turn. `pick`: { move: spot | null, act: { kind, at? }, order: { id, kind, to?, hatch? } | null }; `shown`: { theirs, ours } as drawn
// (planTheirMove, planCrewMoves). Resolved in order: the order's hatch, moves, fire, the abilities, the cuts, the charge, the wave, the end.
// Returns { state, events, end }.
function planTurn(st0, pick, shown, rand) {
  const st = planCopy(st0), ev = st.events, fig = id => st.figures.find(f => f.id === id), hand = st.figures.find(f => f.hand);
  const { theirs, ours } = shown, order = pick.order, act = pick.act || { kind: 'holdfire' };
  const worked = (odds, kind, id) => { const ok = rand() < odds; ev.push({ kind: 'ability', id, ability: kind, worked: ok }); return ok; };
  // the order to a named crewmate
  if (order && fig(order.id) && fig(order.id).hp > 0 && (order.kind === 'seal' || order.kind === 'open')) {
    const c = fig(order.id);
    if (worked(c.odds[HATCH_ORDER[c.post]], order.kind, c.id)) { if (order.kind === 'seal') st.sealed[order.hatch] = true; else delete st.sealed[order.hatch]; }
  }
  // moves: the hand's (or the pull back), ours, then theirs, unless they feinted
  const moved = {};
  if (act.kind === 'pullback' && !pick.move) {
    const to = planBack(st, hand.spot, planHome(st));
    if (to) for (const f of planAt(st, hand.spot, 'us').slice(0, PLAN.CAP - planAt(st, to, 'us').length)) { f.spot = to; moved[f.id] = true; }
    if (to) ev.push({ kind: 'pullback', to });
  } else if (pick.move && planStop(st, hand, [pick.move]) === pick.move && planHeld(st, pick.move) !== 'them' && planAt(st, pick.move, 'us').length < PLAN.CAP) { hand.spot = pick.move; moved.hand = true; }
  // a move drawn before the turn stops at a hatch sealed since (the order's, above)
  for (const m of ours.moves) {
    const f = fig(m.id);
    if (f && f.hp > 0 && !moved[f.id] && planStop(st, f, [m.to]) === m.to && planHeld(st, m.to) !== 'them' && planAt(st, m.to, 'us').length < PLAN.CAP) { f.spot = m.to; moved[f.id] = true; }
  }
  if (!theirs.feint) for (const m of theirs.moves) {
    const f = fig(m.id), to = f && planStop(st, f, m.path || [m.to]);
    if (f && f.hp > 0 && to !== f.spot && planHeld(st, to) !== 'us' && planAt(st, to, 'them').length < PLAN.CAP) { f.spot = to; moved[f.id] = true; }
  }
  // fire, all at once, at the spot each picked, from where each now stands
  const hitAt = {}, shots = [...theirs.shots, ...ours.shots];
  if (act.kind === 'shoot' && act.at) shots.push({ id: 'hand', at: act.at, sidearm: true });
  const fired = shots.map(s => ({ s, f: fig(s.id) })).filter(({ f }) => f && f.hp > 0 && !(theirs.feint && f.side === 'them' && theirs.moves.some(m => m.id === f.id)));
  if (fired.some(({ s, f }) => f.side === 'them' && s.at === hand.spot)) ev.push({ kind: 'contested', spot: hand.spot });
  for (const { s, f } of fired) {
    const reach = s.sidearm ? planReach(st, f, f.spot) : [];
    if (!inLine(st.lay, f.spot, s.at, st.sealed) && !reach.includes(s.at)) continue;
    if (rand() >= planOdds(st, f, f.spot, s.at, !!moved[f.id])) { ev.push({ kind: 'miss', id: f.id, at: s.at }); continue; }
    const k = s.sidearm ? (([lo, hi]) => lo + Math.floor(rand() * (hi - lo + 1)))(sidearmOf({ level: f.level })) : 1;
    for (let i = 0; i < k; i++) if (planHit(st, planOther(f.side), s.at, rand, ev, f.side === 'us' ? 'shot' : 'their', !!s.sidearm)) hitAt[s.at] = true;
  }
  // the abilities: the hand's act and the order to a crewmate, each a steady one (one of theirs in line downed) or a cover one (once a fight)
  const ability = (f, kind, odds) => {
    if (!worked(odds, kind, f.id)) return;
    if (kind === 'cover') { st.coverUsed = true; st.cover[f.spot] = (st.cover[f.spot] || 0) + PLAN.MADE; return; }
    const aim = planAim(st, f, f.spot, false), foe = aim && planAt(st, aim.at, 'them').sort((a, b) => a.hp - b.hp)[0];
    if (foe) { planDown(st, foe, ev, 'steady'); hitAt[aim.at] = true; }
  };
  if ((act.kind === 'steady' || (act.kind === 'cover' && !st.coverUsed)) && hand.odds) ability(hand, act.kind, hand.odds[act.kind]);
  if (order && fig(order.id) && fig(order.id).hp > 0 && (order.kind === 'steady' || (order.kind === 'cover' && !st.coverUsed))) ability(fig(order.id), order.kind, fig(order.id).odds[order.kind]);
  // the hatches they cut (and, boarding her, the one her crew seal), unless the cutter was hit
  if (theirs.cut) { const c = fig(theirs.cutter); if (c && c.hp > 0 && !hitAt[c.spot]) { delete st.sealed[theirs.cut]; ev.push({ kind: 'cut', hatch: theirs.cut }); } }
  if (theirs.seal) { st.sealed[theirs.seal] = true; st.herSealed = true; ev.push({ kind: 'sealed', hatch: theirs.seal, side: 'them' }); }
  if (st.assault) for (const f of planUp(st, 'us')) {
    const r = planRoute(st, f.spot, planBridge(st));
    if (r.cut && !moved[f.id]) { delete st.sealed[r.cut]; ev.push({ kind: 'cut', hatch: r.cut, side: 'us' }); break; }
  }
  // the charge: it blows on the spot it was shown on, unless one of theirs at the setter's spot was hit this turn
  if (theirs.charge) {
    const c = theirs.charge;
    st.charges--; st.lastCharge = st.turn;
    if (hitAt[c.from]) ev.push({ kind: 'charge', on: c.on, stopped: true });
    else {
      const [lo, hi] = DECK.CHARGE, n = lo + Math.floor(rand() * (hi - lo + 1)), there = planAt(st, c.on, 'us').filter(f => !f.hand);
      ev.push({ kind: 'charge', on: c.on, stopped: false });
      for (const f of there.slice(0, n)) planDown(st, f, ev, 'charge');
      if (planAt(st, c.on, 'us').some(f => f.hand) && there.length < n) ev.push({ kind: 'handHit', spot: c.on, how: 'charge' });
    }
  }
  // the wave lands at the outer door at the end of DECK.WAVE_TURN
  st.turn++;
  if (st.wave && st.turn === DECK.WAVE_TURN) {
    const n = st.wave;
    st.wave = 0;
    for (let i = 0; i < n; i++) planPut(st, { id: `t${st.figures.filter(f => f.side === 'them').length + 1}`, side: 'them', name: '', level: 1 + st.grade }, 'outer');
    ev.push({ kind: 'wave', n });
  }
  const end = planEnd(st);
  return { state: st, events: ev, end };
}

// ---------- the end ----------
// Repelling: won at or under the break line (the wave still to land counted) or with them all down; taken (searched, for the navy) when they
// stand on our bridge with none of ours up there (the captain counts while up); won at the cap. Boarding her: won when ours hold her bridge
// with none of hers there or she is at her break line; taken when only the hand is left, or at the cap.
function planEnd(st) {
  const rule = st.assault ? DECK.ASSAULT : DECK, bridge = planBridge(st);
  const on = side => planUp(st, side).some(f => bridge.includes(f.spot));
  const crew = planUp(st, 'us').filter(f => !f.hand).length;
  if (st.assault) {
    if (!crew) return 'taken';
    if (planUp(st, 'them').length <= st.began * rule.BREAK || (on('us') && !on('them'))) return 'won';
    return st.turn >= PLAN.TURNS ? 'taken' : null;
  }
  if (on('them') && !on('us')) return st.party === 'navy' ? 'searched' : 'taken';
  if (planUp(st, 'them').length + st.wave <= st.began * rule.BREAK) return 'won';
  return st.turn >= (st.party === 'navy' ? PLAN.NAVY_TURNS : PLAN.TURNS) ? 'won' : null;
}
