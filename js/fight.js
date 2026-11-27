'use strict';

// The fights' shared rules: the sides, parts and damage of a ship fight (fought on the radar since #1348, radar.js, which reads these), the hand's
// learned moves, a contact's head-start volley (fightui.js), and the deck fight's numbers (its rules are js/deckplan.js).
// Pure: it reads no G and changes nothing it is given. Loaded after shipcombat.js, whose GRADE_HULL and GRADE_PUNCH set how much a veteran crew adds.

const FIGHT = {
  GUN_DMG: [8, 14],  // one of your shots' range before the multipliers. Every damage and part bar here is about 0.7 of Task 7's, so that a fight's kills are slower and a
                     // raider's run to the knife is a race: two guns and two torpedoes at her hull took her 130 before she was alongside (#808 final fixes)
  FOE_DMG: [7, 18],  // one of her guns' range before the multipliers: wider than yours, and harder at its top
  HEAVY: 1.4,        // what heavy rounds add; it is already in a side's dmgMult, kept here for the board's text
  SKILL_DMG: 1,      // per gunner level, added to the low end
  BAND_MULT: { knife: 1.1, close: 1, mid: 0.85, long: 0.8 },
  HEAT_CAP: 4,       // heat over this locks a gun for the next turn
  HEAT_VENT: 2,      // heat shed each turn
  AIM_MULT: { knife: 1, close: 1, mid: 0.4, long: 0.25 },  // on top of the band, for a shot at her drive, lock or launcher; her hull and weapons have none. Low far out, so that her drive is not gone before she is alongside
  PART_HP: { weapons: 63, drive: 34, lock: 7, launcher: 10 },  // weapons is per gun mount, about three turns of fire; a drive takes three turns, so that a raider aimed at only there boards about one time in five; a lock goes in a turn
  TORP_DMG: [12, 18],  // one of your torpedoes: low, so that two of them at a raider's hull do not win the race to the knife for you
  SALVO_DMG: [20, 30], // one torpedo of her salvo: two of them unanswered are a heavy hit about two times in five, and with the turret held back never
  SALVO: 2,          // torpedoes in her salvo
  SALVO_EVERY: 2,    // she arms on turn 0 and then every second turn, and fires the turn after, while her torpedoes last
  LOST_CARGO: 0.3,   // the share of the fullest good in the hold that she takes when the ship is lost, and that the captain jettisons to run (fightui.js, boarders.js)
  POOL: 0.45,        // both sides' armor in a fight is the ship's times this, so that a fight ends before its cap (#814); the hand's real armor lost is the fight's
                     // divided by it (fightui.js). Tuned with the fight tool (3 seeds of 100) to the targets in tests/distribution/fights.test.js: answer has 99% good ends and loses 1%,
                     // in 6.2 turns, 32% of them at the cap (97% at 1.0); random play loses 38% and 19% of the real hull a fight; a lone raider falls to hull fire (COMBAT.md)
  BREAK: 0.3,        // her hull share (her armor) under which she breaks off, if her drive can take her away
  HAND_HURT: 0.35,   // the hand's own hurt roll on a turn of a heavy hit (fightui.js); it was a lost bold call's in the raid
  PATCH: 0.1,        // the share of the pooled maximum armor a patch (the engineer's move) gives back
  HEAVY_HIT: 0.2     // (of the armor past the skin, HULL_SKIN, data.js) a turn is a heavy hit when the damage done to your hull (fight-scale, not pooled: the foe's damage is not scaled by FIGHT.POOL) is over this share of your real maximum armor, about 44% of the hull you have in the fight (fightui.js); a fifth, so that the hand is rarely
                     // killed: on the Ice Hauler only her salvo unanswered reaches it (SALVO_DMG), and the soak holds the hurts a chapter (tests/distribution/stakes-fights.test.js)
};

const bandMultOf = band => FIGHT.BAND_MULT[RANGE_BANDS[band]] || 0;  // past long they have escaped and there is no volley
// The hand's moves (docs/superpowers/specs/2026-10-23-gunner-moves-design.md, and the post ladders' eight, docs/superpowers/specs/2026-11-08-post-ladders-design.md),
// each once a fight, ordered as orders.move (lead and called-shot name orders.gun).
const FIGHT_MOVES = {
  vent: {},   // heat to 0 and the locks off before the shots, so every gun fires; needs heat or a lock
  lead: {},   // the named gun's aimed shot takes no AIM_MULT; needs that gun ready and aimed at a part
  split: {},  // the held turret still fires: no shot lost to it; her volley and salvo cut stay; needs the turret held
  'called-shot': {},      // the named gun's shot takes no AIM_MULT and rolls the top of its range; needs that gun firing
  'break-intercept': {},  // your vote to open the range stands this turn whatever her speed; needs a drive and a band to open
  redline: {},            // at the long band, the ship is away this turn (escaped), after the guns fire; needs a drive
  patch: {},              // FIGHT.PATCH of the pooled maximum armor past the skin back; needs armor lost
  'hot-start': {},        // every shot this turn is overcharged at a plain shot's heat; needs a shot
  bypass: {},             // the drive's part back to full; needs it hurt
  spoof: {},              // she fires no volley and no salvo this turn; needs a foe up
  parley: {}              // at mid or long, a roll: landed, every foe up breaks off; needs a foe up
};
const copyOf = o => JSON.parse(JSON.stringify(o));
const rollIn = ([lo, hi], mult, rand) => Math.round(lo * mult + rand() * (hi - lo) * mult);

// What each kind of foe adds to her hull: a torpedo launcher with its torpedoes (tuned with the fight tool, COMBAT.md). The destroyer has none until
// the fight ladder (PR 3) decides how she is met: the fight tool does not play one. (The cutter's shield coming back each turn went with the shields, #1208.)
const FOE_TYPES = {
  raider: { launcher: false },
  corsair: { launcher: true, torps: 4 },
  cutter: { launcher: false },
  destroyer: { launcher: false }
};

// A ship's side in a fight: her armor scaled by FIGHT.POOL, her parts by FIGHT.PART_HP.
function shipSide(stats, { grade = 0, skill = 0, torps = 0, launcher = stats.launcher, breakAt }) {  // breakAt: her own break-off share, when the hand's record gives her one (Hard Case, traits.js)
  const armor = Math.round(stats.armor * (1 + GRADE_HULL * grade) * FIGHT.POOL);
  const part = key => ({ hp: FIGHT.PART_HP[key], max: FIGHT.PART_HP[key] });
  const weapons = FIGHT.PART_HP.weapons * stats.guns;
  return {
    armor, maxArmor: armor,
    parts: { weapons: { hp: weapons, max: weapons }, drive: part('drive'), lock: part('lock'), ...(launcher ? { launcher: part('launcher') } : {}) },
    guns: stats.guns, dmgMult: stats.dmgMult * (1 + GRADE_PUNCH * grade), skill,
    speed: stats.accel * stats.turn,  // who wins the say on the range
    launcher: !!launcher, pdc: !!stats.pdc, torps, ...(breakAt ? { breakAt } : {})
  };
}

// A mount whose share of the weapons bar is gone cannot fire, nor can one that is locked.
const gunsReady = st => Math.max(0, Math.min(st.me.guns, Math.ceil(st.me.parts.weapons.hp / FIGHT.PART_HP.weapons)) - st.locked.length);

// Damage to the hull goes to armor; to a part, to its hp. Returns what it took: nothing from a part already at 0.
function dealDamage(side, part, dmg) {
  if (part === 'hull') {
    const a = Math.min(side.armor, dmg);
    side.armor -= a;
    return a;
  }
  const took = Math.min(side.parts[part].hp, dmg);
  side.parts[part].hp -= took;
  return took;
}

// What the guns of foe i would do this turn: the range of one volley from the mounts it has left.
function foeVolley(st, i) {
  const foe = st.foes[i];
  const ready = Math.min(foe.guns, Math.ceil(foe.parts.weapons.hp / FIGHT.PART_HP.weapons));
  return FIGHT.FOE_DMG.map(d => Math.round(d * ready * foe.dmgMult * bandMultOf(st.band)));
}

// The deck fight's numbers the deck-plan fight reads (js/deckplan.js, which holds its own rules in PLAN), and who comes aboard. Loaded after boarders.js.
const DECK = {
  SIDEARM_BY_LEVEL: [[1, 2], [1, 2], [2, 3], [3, 4], [3, 5], [4, 5]],  // heads the hand's shot rolls, by the level of the fight, 0 to 5 (sidearmOf)
  SIDEARM_REACH_LEVEL: 2,  // from this level the hand's shot reaches a spot one step on through an open hatch (deckplan.js planReach)
  WAVE_TURN: 2,      // the turn at whose end the second wave of a repel lands at the outer door
  CHARGE: [1, 1],    // heads of ours a corsair's breaching charge downs outright on the spot it blows on, unless its setter is hit (deckplan.js planTurn)
  BREAK: 0.15,       // of her crew at the start: at or under it she breaks (at 6 she fights to the last)
  FULL: 4,           // the heads a boarding run that landed in full brings over a half one's (shipcombat.js boardersFor)
  CORSAIR_LESS: 2,   // the heads fewer a corsair has aboard when we board her, and brings on a full run (the duel's, duel.js; her ship fight boards at a half run, so not there) (boardersFor): her charge takes heads of ours the rest of her crew would otherwise
  FULL_PAIR: 2,      // and for a raider pair, which brings two more of its own
  CASUALTY: 0.3,     // repelling, of our heads downed, the share that is a casualty (deckplan.js planCasualty, fightui.js deckLoss); the rest get up after it (R42)
  ASSAULT: {         // boarding her, where it differs from a repel
    BREAK: 0.2,      // her crew at or under this share of her start breaks (at 7 she breaks at 1)
    FULL: 5,         // the heads over a half run's that she has aboard
  },
  NAVY_STANDING: 2   // the standing with her government each head of a navy party put down costs, charged at the settle (boarders.js repelSettle: repelled, withdrawn or searched): a quarter of the 8 that firing on her cost
};

// Who comes aboard, by the hull she is: the navy hulls are the navy's, the corsair's her own, any other ship a raider's.
const DECK_PARTY = { raider: 'raider', corsair: 'corsair', cutter: 'navy', destroyer: 'navy' };
const sidearmOf = st => DECK.SIDEARM_BY_LEVEL[Math.min(st.level, DECK.SIDEARM_BY_LEVEL.length - 1)];  // [lo, hi] heads the hand's shot takes at this level
// A navy party on our deck, the only deck it boards: each of them put down costs standing, holding our bridge is a search, and it withdraws at its own cap.
const navyBoarding = st => st.party === 'navy' && !st.assault;
