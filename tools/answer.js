'use strict';

// The hands' answers to what the fight shows: the deck fight's (the fight tool's `answer` deck policy, tools/fights.js, and the play-through's player) and the
// radar fight's (tools/radarfights.js). The ship fight's old move-reading orders went with the old fight (#1348).

// The deck fight's answer, self-contained on the game's globals, as it runs in the page and is passed there as source text (ADJ, REACH, DECK, BRIDGE,
// BACK, FORWARD, repelOrders, isHatch, navyBoarding). Given the fight (s, with s.state and their shown move s.shown), the hand's plan { stand, act, shootAt, order, at } (fightui.js deckFightEvent):
// - on a shown rush, stand in the section it goes through (via) when it is in reach, the hand's section or one next to it; otherwise order a hatch at via
//   when one is on offer (the pilot's or the engineer's: isHatch);
// - otherwise go where the fight is (the section where both sides will stand after their shown move, the fullest of them, else where they are going, else the
//   nearest of them), a section a turn; boarding her, make the cover there first, while it is unused;
// - shoot at the section in the shot's reach (the hand's, and from DECK.SIDEARM_REACH_LEVEL one next to it) with the most of theirs wounded after their move,
//   then the most of them, the hand's own on a tie: the shot downs the wounded first;
// - order the first crewmate on offer, except where the hatch took the order;
// - on a shown charge, hit its setter, who stands in `from`: shoot there when the shot can reach it (the hand standing there, or from DECK.SIDEARM_REACH_LEVEL
//   next to it, the plan's stand first, then where the hand is, then a section a step away); else, where the hand stands in the charged section and it is not
//   the back one, pull back; else send a steady hatch (the pilot's) to `from` when one is on offer. A charge moves no heads, so it is reckoned as a hold;
// - against a navy party, where each head of theirs put down costs standing and they withdraw at their own cap (DECK.NAVY_TURNS): stand where they push when ours
//   stand there, else with ours nearest them; pull ours back out of the hand's section where they trade there while the bridge is not at stake; make the cover
//   while it can, then hold fire; send a hatch to the section they push into; and shoot only when they would hold our bridge after their move (theirs on it, ours
//   none) or the section stood in would be lost (theirs there outnumbering ours), at the bridge when it is in reach.
// With read false it reads neither the rush nor the wounded and shoots where it stands: the fight tool's fixed policies go where the fight is by it, and its
// `order` policy is that plan. With charge false it reads all but the charge: the fight tool's `answerNoCharge`, to show the charge is the puzzle boarding her.
function answerDeck(s, read = true, charge = read) {
  const f = s.state, S = f.sections.map(x => ({ ...x })), m = s.shown;
  const near = [f.hand, ...ADJ[f.hand].filter(i => f.sections[i])];
  const act = read && f.assault && !f.used.cover ? 'cover' : 'shoot';
  const orders = repelOrders(s, f.used.cover || act === 'cover'), first = orders.length ? orders[0].id : null;  // as the panel offers them (deckFightEvent)
  const hatch = orders.find(isHatch), meet = read && m.kind === 'rush' && near.includes(m.via);  // the one list for the hatch, reckoned and returned
  const to = m.kind === 'rush' && (meet || (read && hatch)) ? m.via : m.to;  // a rush met, or hatched (it may fail), is reckoned as stopped in via
  const moves = m.kind !== 'hold' && m.kind !== 'charge';
  if (moves) {  // their move, the wounded last (fight.js moveHeads)
    const hurt = Math.max(0, m.n - (S[m.from].theirs - (S[m.from].theirsHurt || 0)));
    S[m.from].theirs -= m.n; S[m.from].theirsHurt = (S[m.from].theirsHurt || 0) - hurt; S[to].theirs += m.n; S[to].theirsHurt = (S[to].theirsHurt || 0) + hurt;
  }
  const both = S.map((_, i) => i).filter(i => S[i].theirs && S[i].mine).sort((a, b) => S[b].theirs - S[a].theirs);
  const theirs = S.map((_, i) => i).filter(i => S[i].theirs).sort((a, b) => Math.abs(REACH[a] - REACH[f.hand]) - Math.abs(REACH[b] - REACH[f.hand]));
  const t = both.length ? both[0] : moves ? to : theirs.length ? theirs[0] : f.hand;  // with nobody trading, to the nearest of them, to shoot
  const toward = x => near.slice().sort((a, b) => Math.abs(REACH[a] - REACH[x]) - Math.abs(REACH[b] - REACH[x]) || (b === x) - (a === x))[0];  // the section in reach nearest x
  const goal = toward(t);
  const stand = meet ? m.via : goal;
  const reach = [stand, ...(f.level >= DECK.SIDEARM_REACH_LEVEL ? ADJ[stand].filter(i => f.sections[i]) : [])];
  const shootAt = !read ? stand : reach.filter(i => S[i].theirs).sort((a, b) => (S[b].theirsHurt || 0) - (S[a].theirsHurt || 0) || S[b].theirs - S[a].theirs || (b === stand) - (a === stand))[0];
  const plan = { stand, act, ...(act === 'shoot' ? { shootAt: shootAt === undefined ? stand : shootAt } : {}), order: first };
  if (read && navyBoarding(f)) {
    const ours = S.map((_, i) => i).filter(i => f.sections[i] && S[i].mine), them = moves ? to : t;
    const ourSide = moves && S[to].mine ? to : ours.sort((a, b) => Math.abs(REACH[a] - REACH[them]) - Math.abs(REACH[b] - REACH[them]))[0];  // where they push when ours stand there, else ours nearest them
    const into = toward(ourSide === undefined ? t : ourSide), bridge = S[BRIDGE].theirs > 0 && !S[BRIDGE].mine, fire = bridge || S[into].theirs > S[into].mine;
    if (!bridge && into === f.hand && S[f.hand].theirs && S[f.hand].mine && FORWARD[f.hand] !== f.hand) return { stand: f.hand, act: 'pullback', order: null };
    const navyAct = fire ? 'shoot' : f.used.cover ? 'holdfire' : 'cover';
    const navyOrders = repelOrders(s, f.used.cover || navyAct === 'cover'), door = navyOrders.find(isHatch);
    const aims = [into, ...(f.level >= DECK.SIDEARM_REACH_LEVEL ? ADJ[into].filter(i => f.sections[i]) : [])];
    const aim = bridge && aims.includes(BRIDGE) ? BRIDGE : aims.filter(i => S[i].theirs).sort((a, b) => (S[b].theirsHurt || 0) - (S[a].theirsHurt || 0) || S[b].theirs - S[a].theirs || (b === into) - (a === into))[0];
    return { stand: into, act: navyAct, ...(fire ? { shootAt: aim === undefined ? into : aim } : {}), order: door ? door.id : navyOrders.length ? navyOrders[0].id : null, ...(door ? { at: moves ? to : into } : {}) };
  }
  if (read && m.kind === 'rush' && !meet && hatch) return { ...plan, order: hatch.id, at: m.via };
  if (read && charge && m.kind === 'charge') {
    const reaches = x => x === m.from || (f.level >= DECK.SIDEARM_REACH_LEVEL && ADJ[x].includes(m.from));
    const from = [stand, f.hand, ...near].find(reaches);
    if (from !== undefined) return { ...plan, stand: from, act: 'shoot', shootAt: m.from, order: first };
    if (m.at === f.hand && (f.assault ? BACK : FORWARD)[f.hand] !== f.hand) return { ...plan, stand: f.hand, act: 'pullback', order: first };
    const pick = orders.find(o => isHatch(o) && o.kind === 'steady');
    if (pick) return { ...plan, order: pick.id, at: m.from };
  }
  return plan;
}

// The radar fight's policy for the hand's post (#1347): it reads her shown threat. `orders` are the crew's for the cycle (radarAuto),
// `R` the radar rules (js/radar.js, loaded in Node by tools/radarfights.js), and it returns the post's orders in place of the crew's:
// - gunner: the PDC when one of her torpedoes will reach its reach this cycle, its arc on the nearest; else the gun, at a raider's lock as she comes alongside with it whole (LOCK_AT), at
//   a corsair's launcher while she has torpedoes, at the hull otherwise; a torpedo at the most hurt of hers inside JINK;
// - pilot: across the line of a torpedo that will hit inside two cycles; a lone raider, the order's own plot; nose on her and no burn while she breaks
//   off, so she can go; a cutter or a pair, in close at ANSWER_CLOSE, braking to arrive, where the gun does not miss; a corsair, at her under her guns; each burn
//   jinked to the other side of her line each cycle, inside the gun's bearing (JINK_OFF), but against two of hers; else the order's plot.
function answerRadar(s, post, orders, R) {
  const me = s.ships[0], i = R.radarNearest(s);
  if (i < 0) return {};
  const her = s.foes[i], km = R.radarRange(s, i + 1), toHer = R.radarDir(me.p, s.ships[i + 1].p);
  const hers = s.torps.filter(t => t.side === 'her').sort((a, b) => R.radarDist(a.p, me.p) - R.radarDist(b.p, me.p));
  const soon = hers.find(t => R.radarDist(t.p, me.p) - R.radarPdcReach(s) <= R.RADAR.TORP_SPEED * R.RADAR.TURN_S);
  const raiderClosing = (s.types[i] || 'raider') === 'raider' && her.parts.lock.hp > 0;
  if (post === 'gunner') {
    const part = raiderClosing && km <= R.RADAR.LOCK_AT ? 'lock' : her.launcher && her.parts.launcher && her.parts.launcher.hp > 0 && her.torps > 0 ? 'launcher' : 'hull';
    const weak = s.foes.map((f, j) => j).filter(j => !R.radarOut(s.foes[j])).sort((a, b) => R.radarHull(s.foes[a]) - R.radarHull(s.foes[b]))[0];
    return { fire: true, fc: soon && s.me.pdc ? 'pdc' : 'gun', aim: { foe: i, part }, pdcArc: soon ? { dir: R.radarDir(me.p, soon.p), width: 60 } : { dir: toHer, width: 90 },
      torp: km <= R.RADAR.JINK && s.me.torps > 0 ? weak : null };
  }
  if (post === 'pilot') {
    const near = hers.find(t => R.radarDist(t.p, me.p) <= R.RADAR.TORP_SPEED * R.RADAR.TURN_S * 2);
    if (near) return { burn: { dir: R.radarNorm(R.radarDir(me.p, near.p) + 90), throttle: 1 }, turnTo: null };
    const pair = s.foes.filter(f => !R.radarOut(f)).length > 1;  // two of hers come in on two lines: a jink off one is no jink off the other
    if (!her.launcher && !pair && (s.types[i] || 'raider') === 'raider') return { burn: orders.burn, turnTo: orders.turnTo };  // a lone raider: the order's plot, the gun on her
    if ((s.foeOrders[i] || {}).kind === 'break') return { burn: null, turnTo: toHer };  // she breaks off: let her go
    const jink = b => (b && !pair ? { ...b, dir: R.radarNorm(b.dir + (s.cycle % 2 ? 1 : -1) * R.RADAR.JINK_OFF) } : b);  // each cycle to the other side of her line, the gun still bearing
    if (!her.launcher) {  // a cutter or a pair, no torpedoes to fear: in close, where the gun does not miss, faster than the crew close, braking to arrive and not fly past her, jinking
      const want = Math.max(0, Math.min(R.RADAR.ANSWER_CLOSE, (km - R.RADAR.COAST_ENGAGE) / R.RADAR.TURN_S)), u = R.radarUnit(toHer), her1 = s.ships[i + 1];
      const dv = { x: want * u.x - (me.v.x - her1.v.x), y: want * u.y - (me.v.y - her1.v.y) }, size = Math.hypot(dv.x, dv.y);
      return size < 0.05 ? { burn: null, turnTo: toHer } : { burn: jink({ dir: R.radarDir({ x: 0, y: 0 }, dv), throttle: Math.min(1, size / (R.RADAR.ACCEL * R.RADAR.TURN_S)) }), turnTo: null };
    }
    if (km <= R.RADAR.GUN_RANGE && her.parts.weapons.hp > 0) return { burn: jink({ dir: toHer, throttle: 1 }), turnTo: null };  // under a corsair's guns: at her, jinking, the gun bearing
    return { burn: orders.burn, turnTo: orders.turnTo };
  }
  return {};
}

// The deck fight on the deck plan (js/deckplan.js, #1354): the hand's turn read from their drawn move ({ theirs, intent }, planTheirMove and the captain's
// order). `R` is the rules (tools/planfights.js). A charge: shoot its setter from where the hand stands or from a step away, and failing that, pull back off
// the spot it is set on, never step onto it, and order one of the crew on it off it (`charge: false` plays it as if there were no charge). Otherwise the
// hand takes the step (or stays) with the best shot, standing on a rush's path (which stops it) where it can, and off a spot about to be stormed. Every turn, the crewmate with the best odds takes their steady move, which downs one of theirs in line. Against the navy,
// whose every head put down costs standing and who withdraw at their cap: hold fire and give no order, pulling back off a spot they are about to take.
function answerPlan(R, st, { theirs }, { charge = true } = {}) {
  const hand = st.figures.find(f => f.hand), c = R.planChoices(st);
  if (st.party === 'navy' && !st.assault) {
    const coming = theirs.moves.some(m => m.to === hand.spot) || theirs.shots.some(x => x.at === hand.spot);
    return { move: null, act: coming && c.acts.some(a => a.kind === 'pullback') ? { kind: 'pullback' } : { kind: 'holdfire' }, order: null };
  }
  const best = to => (R.planChoices(st, to).acts[0].targets || []).slice().sort((a, b) => b.odds - a.odds)[0];
  const steady = c.orders.filter(o => o.kind === 'steady').sort((a, b) => b.odds - a.odds)[0], steadyOrder = steady ? { id: steady.id, kind: 'steady' } : null;
  if (charge && theirs.charge) {
    const from = theirs.charge.from;
    for (const to of [null, ...c.moves]) if ((R.planChoices(st, to).acts[0].targets || []).some(t => t.at === from)) return { move: to, act: { kind: 'shoot', at: from }, order: steadyOrder };
    if (theirs.charge.on === hand.spot && c.acts.some(a => a.kind === 'pullback')) return { move: null, act: { kind: 'pullback' }, order: steadyOrder };
  }
  // the charge on a spot of the crew's, its setter out of reach: the order of the turn sends one of them off it
  const off = charge && theirs.charge && c.orders.find(o => o.kind === 'move' && st.figures.find(f => f.id === o.id).spot === theirs.charge.on);
  const offTo = off && R.spotLinks(st.lay)[theirs.charge.on].find(s => !st.sealed[R.spotHatch(st.lay, theirs.charge.on, s)] && R.planHeld(st, s) !== 'them' && R.planAt(st, s, 'us').length < R.PLAN.CAP);
  const order = offTo ? { id: off.id, kind: 'move', to: offTo } : steadyOrder;
  const path = new Set(theirs.moves.filter(m => m.rush).flatMap(m => m.path || []));
  const score = to => { const at = to || hand.spot, t = best(to); return (t ? t.odds : 0) + (path.has(at) ? 1 : 0) - (theirs.storm && theirs.storm.on === at ? 1 : 0) - (charge && theirs.charge && theirs.charge.on === at ? 1 : 0); };
  let move = [null, ...c.moves].reduce((a, b) => (score(b) > score(a) ? b : a));
  if (st.assault && !best(move) && !path.has(move || hand.spot)) {  // boarding her, no shot from anywhere in reach: a step toward the nearest of them (repelling, the hand keeps its cover)
    const foes = [...new Set(R.planUp(st, 'them').map(f => f.spot))], r = foes.length && R.spotPath(st.lay, hand.spot, foes, st.sealed);
    if (r && r.next && c.moves.includes(r.next) && !(theirs.storm && theirs.storm.on === r.next) && !(charge && theirs.charge && theirs.charge.on === r.next)) move = r.next;
  }
  const t = best(move);
  return { move, act: t ? { kind: 'shoot', at: t.at } : { kind: 'holdfire' }, order };
}

module.exports = { answerDeck, answerRadar, answerPlan };
