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
//   come this turn, stays at or under the cap (no gun locked);
// - else every gun at her hull. (Not "her weapons": a ship whose guns are gone and whose hull is whole breaks off as 'away', a weak end; task-7-report.md.)
// The gunner moves (s.known: the ones this fight offers; canUse is the engine's own test of whether one would apply), at most one a turn, the first of:
// split when the turret is held for her salvo; vent when a gun is locked; lead on the first gun that aims at a part, at the mid or long band.
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
    : aimed >= 0 && /^(long|mid)$/.test(RANGE_BANDS[f.band]) && canUse(f, { ...orders, gun: aimed }, 'lead', known) ? 'lead' : null;
  const ready = move === 'vent' ? gunsReady({ ...f, locked: [] }) : gunsReady(f);
  const shots = Math.max(0, ready - (salvo && move !== 'split' ? 1 : 0));
  let heat = move === 'vent' ? 0 : f.heat;
  if (lock === undefined && regen !== undefined) orders.guns = base.map((g, n) => {
    const over = n < shots && heat + FIGHT.OVER_HEAT + Math.max(0, shots - n - 1) <= FIGHT.HEAT_CAP;
    if (n < shots) heat += over ? FIGHT.OVER_HEAT : 1;
    return { ...g, over };
  });
  if (move) orders.move = move;
  if (move === 'lead') orders.gun = aimed;
  return orders;
}

module.exports = { answerOrders };
