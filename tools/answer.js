'use strict';

// The ship fight's move-reading orders (#808 Task 7), shared by the fight tool's `answer` policy (tools/fights.js) and the play-through's player
// (tools/playthrough.js). It runs in the page, so it is passed there as source text and made again with eval: it reads only its argument and the
// game's globals (fightUp, gunsReady, canUse, turnShots, RANGE_BANDS, FIGHT). Given the fight (s, with s.state and her shown move s.shown), the turn's orders { guns, torp, pdc, move, gun }:
// - hold the turret back when she fires a salvo;
// - every gun at her lock while she pins or closes with it whole;
// - a torpedo only at a foe whose shields are at or under TORP_SHIELDS of their maximum (a torpedo into full shields is spent on them: #814), or, for a foe
//   whose shields come back (regen), whose shields are under their maximum at all (she would not stay down to a quarter), at the one with the
//   least shields and armor left, whatever the type; otherwise it is held;
// - against a ship whose shields come back (regen), every gun at her hull, each gun overcharged while the heat, with the shots still to
//   come this turn, stays at or under the cap (no gun locked); while vent is known and unspent, every gun overcharged past the cap (vent
//   takes the lock off when one comes);
// - else every gun at her hull. (Not "her weapons": a ship whose guns are gone and whose hull is whole breaks off as 'away', a weak end; task-7-report.md.)
// The gunner moves (s.known: the ones this fight offers; canUse is the engine's own test of whether one would apply), at most one a turn, the first of:
// split when the turret is held for her salvo; vent when it frees a locked gun (against regen she runs hot until then, above); lead on the first gun that aims at a part, where canUse allows (a band with an aim penalty).
function answerOrders(s) {
  const f = s.state, live = f.foes.map((_, i) => i).filter(i => fightUp(f.foes[i])), shown = i => (s.shown && s.shown.foe[i]) || {};
  const salvo = live.some(i => shown(i).kind === 'salvo');
  const lock = live.find(i => /^(pin|close)$/.test(shown(i).kind) && f.foes[i].parts.lock.hp > 0);
  const regen = live.find(i => f.foes[i].regen > 0);
  const TORP_SHIELDS = 0.25, left = i => f.foes[i].shields + f.foes[i].armor;  // (inside the function: it is passed to the page as source text)
  const down = live.filter(i => (f.foes[i].regen > 0 ? f.foes[i].shields < f.foes[i].maxShields : f.foes[i].shields <= TORP_SHIELDS * f.foes[i].maxShields)).sort((a, b) => left(a) - left(b))[0];
  const base = Array.from({ length: f.me.guns }, () => (lock !== undefined ? { foe: lock, part: 'lock' } : { foe: regen !== undefined ? regen : live[0] || 0, part: 'hull' }));
  const orders = { guns: base, torp: down !== undefined && f.me.launcher && f.me.torps > 0 ? { foe: down, part: 'hull' } : null, pdc: salvo ? 'hold' : 'fire' };
  // The move comes first, so that the overcharge budget counts the shots it gives back. Vent only when the unlocked guns would fire more shots (the engine's turnShots).
  const known = s.known || [], aimed = base.findIndex(g => g.part !== 'hull' && g.part !== 'weapons');
  const freed = known.length > 0 && f.locked.length > 0 && turnShots({ ...f, locked: [] }, orders).length > turnShots(f, orders).length;
  const move = !known.length ? null : salvo && canUse(f, orders, 'split', known) ? 'split'
    : freed && canUse(f, orders, 'vent', known) ? 'vent'
    : aimed >= 0 && canUse(f, { ...orders, gun: aimed }, 'lead', known) ? 'lead' : null;
  const ready = move === 'vent' ? gunsReady({ ...f, locked: [] }) : gunsReady(f);
  const shots = Math.max(0, ready - (salvo && move !== 'split' ? 1 : 0));
  let heat = move === 'vent' ? 0 : f.heat;
  const hot = known.includes('vent') && !(f.spent || []).includes('vent') && move !== 'vent';  // vent still to come: run every gun hot, and vent the turn one locks
  if (lock === undefined && regen !== undefined) orders.guns = base.map((g, n) => {
    const over = n < shots && (hot || heat + FIGHT.OVER_HEAT + Math.max(0, shots - n - 1) <= FIGHT.HEAT_CAP);
    if (n < shots) heat += over ? FIGHT.OVER_HEAT : 1;
    return { ...g, over };
  });
  if (move) orders.move = move;
  if (move === 'lead') orders.gun = aimed;
  return orders;
}

// The deck fight's answer (the fight tool's `answer` deck policy, tools/fights.js), self-contained on the game's globals as answerOrders is (ADJ, REACH, DECK,
// repelOrders, isHatch). Given the fight (s, with s.state and their shown move s.shown), the hand's plan { stand, act, shootAt, order, at } (fightui.js deckFightEvent):
// - on a shown rush, stand in the section it goes through (via) when it is in reach, the hand's section or one next to it; otherwise order a hatch at via
//   when one is on offer (the pilot's or the engineer's: isHatch);
// - otherwise go where the fight is (the section where both sides will stand after their shown move, the fullest of them, else where they are going, else the
//   nearest of them), a section a turn; boarding her, make the cover there first, while it is unused;
// - shoot at the section in the shot's reach (the hand's, and from DECK.SIDEARM_REACH_LEVEL one next to it) with the most of theirs wounded after their move,
//   then the most of them, the hand's own on a tie: the shot downs the wounded first;
// - order the first crewmate on offer, except where the hatch took the order.
// With read false it reads neither the rush nor the wounded and shoots where it stands: the fight tool's fixed policies go where the fight is by it, and its
// `order` policy is that plan.
function answerDeck(s, read = true) {
  const f = s.state, S = f.sections.map(x => ({ ...x })), m = s.shown;
  const near = [f.hand, ...ADJ[f.hand].filter(i => f.sections[i])];
  const act = read && f.assault && !f.used.cover ? 'cover' : 'shoot';
  const orders = repelOrders(s, f.used.cover || act === 'cover'), first = orders.length ? orders[0].id : null;  // as the panel offers them (deckFightEvent)
  const hatch = orders.find(isHatch), meet = read && m.kind === 'rush' && near.includes(m.via);  // the one list for the hatch, reckoned and returned
  const to = m.kind === 'rush' && (meet || (read && hatch)) ? m.via : m.to;  // a rush met, or hatched (it may fail), is reckoned as stopped in via
  if (m.kind !== 'hold') {  // their move, the wounded last (fight.js moveHeads)
    const hurt = Math.max(0, m.n - (S[m.from].theirs - (S[m.from].theirsHurt || 0)));
    S[m.from].theirs -= m.n; S[m.from].theirsHurt = (S[m.from].theirsHurt || 0) - hurt; S[to].theirs += m.n; S[to].theirsHurt = (S[to].theirsHurt || 0) + hurt;
  }
  const both = S.map((_, i) => i).filter(i => S[i].theirs && S[i].mine).sort((a, b) => S[b].theirs - S[a].theirs);
  const theirs = S.map((_, i) => i).filter(i => S[i].theirs).sort((a, b) => Math.abs(REACH[a] - REACH[f.hand]) - Math.abs(REACH[b] - REACH[f.hand]));
  const t = both.length ? both[0] : m.kind !== 'hold' ? to : theirs.length ? theirs[0] : f.hand;  // with nobody trading, to the nearest of them, to shoot
  const goal = near.slice().sort((a, b) => Math.abs(REACH[a] - REACH[t]) - Math.abs(REACH[b] - REACH[t]) || (b === t) - (a === t))[0];
  const stand = meet ? m.via : goal;
  const reach = [stand, ...(f.level >= DECK.SIDEARM_REACH_LEVEL ? ADJ[stand].filter(i => f.sections[i]) : [])];
  const shootAt = !read ? stand : reach.filter(i => S[i].theirs).sort((a, b) => (S[b].theirsHurt || 0) - (S[a].theirsHurt || 0) || S[b].theirs - S[a].theirs || (b === stand) - (a === stand))[0];
  const plan = { stand, act, ...(act === 'shoot' ? { shootAt: shootAt === undefined ? stand : shootAt } : {}), order: first };
  if (read && m.kind === 'rush' && !meet && hatch) return { ...plan, order: hatch.id, at: m.via };
  return plan;
}

module.exports = { answerOrders, answerDeck };
