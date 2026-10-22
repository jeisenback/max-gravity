'use strict';

// The ship fight's move-reading orders (#808 Task 7), shared by the fight tool's `answer` policy (tools/fights.js) and the play-through's player
// (tools/playthrough.js). It runs in the page, so it is passed there as source text and made again with eval: it reads only its argument and the
// game's globals (fightUp, gunsReady, FIGHT). Given the fight (s, with s.state and her shown move s.shown), the turn's orders { guns, torp, pdc }:
// - hold the turret back when she fires a salvo;
// - every gun at her lock while she pins or closes with it whole;
// - against a ship whose shields come back (regen), torpedoes and every gun at her hull, each gun overcharged while the heat, with the shots still to
//   come this turn, stays at or under the cap (no gun locked);
// - else every gun at her hull. (Not "her weapons": a ship whose guns are gone and whose hull is whole breaks off as 'away', a weak end; task-7-report.md.)
function answerOrders(s) {
  const f = s.state, live = f.foes.map((_, i) => i).filter(i => fightUp(f.foes[i])), shown = i => (s.shown && s.shown.foe[i]) || {};
  const salvo = live.some(i => shown(i).kind === 'salvo');
  const lock = live.find(i => /^(pin|close)$/.test(shown(i).kind) && f.foes[i].parts.lock.hp > 0);
  const regen = live.find(i => f.foes[i].regen > 0);
  const shots = Math.max(0, gunsReady(f) - (salvo ? 1 : 0));
  let heat = f.heat;
  const guns = Array.from({ length: f.me.guns }, (_, n) => {
    if (lock !== undefined) return { foe: lock, part: 'lock' };
    if (regen !== undefined) {
      const over = n < shots && heat + FIGHT.OVER_HEAT + Math.max(0, shots - n - 1) <= FIGHT.HEAT_CAP;
      if (n < shots) heat += over ? FIGHT.OVER_HEAT : 1;
      return { foe: regen, part: 'hull', over };
    }
    return { foe: live[0] || 0, part: 'hull' };
  });
  return { guns, torp: regen !== undefined && f.me.launcher && f.me.torps > 0 ? { foe: regen, part: 'hull' } : null, pdc: salvo ? 'hold' : 'fire' };
}

module.exports = { answerOrders };
