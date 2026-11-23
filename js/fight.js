'use strict';

// The fights' shared rules: the sides, parts and damage of a ship fight (fought on the radar since #1348, radar.js, which reads these), the hand's
// learned moves, a contact's head-start volley (fightui.js), and the deck fight's turn engine (docs/superpowers/specs/2026-10-20-turn-combat-design.md).
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

// The deck fight: the same turn on the decks (spec 2026-10-20). Sections are lock, corridor, bridge, and 'cargo' on a long ship. `mine` and `theirs`
// are always our crew and hers; `assault` says who pushes (theirs when repelling, mine when we board). Each section keeps our cover (`cover`) and hers (`hers`)
// apart, and each cuts only its own side's losses (R31). Loaded after boarders.js, for REPEL_HURT.
const DECK = {
  SECTIONS: ['lock', 'corridor', 'bridge'],
  SIDEARM_BY_LEVEL: [[1, 2], [1, 2], [2, 3], [3, 4], [3, 5], [4, 5]],  // heads the hand's shot takes, by the level of the fight, 0 to 5 (sidearmOf): each downs a wounded head there, else wounds one
  SIDEARM_REACH_LEVEL: 2,  // from this level the shot may be aimed at a section next to the hand's as well as its own
  WAVE_TURN: 2,      // the turn at whose end the second wave of a repel lands in the lock
  CREW_HIT: [0, 2],  // heads one opposing head takes in a section where both stand (a roll a head); a side's own cover cuts its total, never below one hit
  CHARGE: [1, 1],    // heads of ours a corsair's breaching charge downs outright in the section it blows in, past cover and wounds, unless its setter is hit (boardMove, resolveDeckTurn)
  BREAK: 0.15,       // of her crew at the start: at or under it she breaks (at 6 she fights to the last)
  FULL: 4,           // the heads a boarding run that landed in full brings over a half one's (shipcombat.js boardersFor)
  CORSAIR_LESS: 2,   // the heads fewer a corsair has aboard when we board her, and brings on a full run (the duel's, duel.js; her ship fight boards at a half run, so not there) (boardersFor): her charge takes heads of ours the rest of her crew would otherwise
  FULL_PAIR: 2,      // and for a raider pair, which brings two more of its own: a pair at grade 1 or 2 came over with 10 and 12, and took the bridge one time in two
  SUIT: 0.2,         // times REPEL_HURT.lose: the standard suit's stat (the hand standing in the fight is hurt less often); under the lock fight's 0.3, since a deck fight lasts about twice the turns (measured over 120 chapters, tests/distribution/stakes-fights.test.js)
  CASUALTY: 0.3,     // of our heads lost, the share that is a casualty (fightui.js deckLoss); the rest are downed and get up after it, so that a fight kills about as many as the lock fight did (R42)
  TURNS: 8,          // at the end of this turn the attackers withdraw: a repel is won, an assault lost (R32)
  ASSAULT: {         // boarding her, where it differs from a repel (deckRule): a short, risky push
    BREAK: 0.2,      // her crew at or under this share of her start breaks (at 7 she breaks at 1)
    FULL: 5,         // the heads over a half run's that she has aboard
    CREW_HIT: [0, 1],  // the exchange's roll a head, and a press's: lighter, so that two of ours last long enough for the hand's shot to tell
    CASUALTY: 0.5    // of our heads downed, the share that is a casualty: fewer are downed than repelling, and more of them die
  },
  NAVY_TURNS: 5,     // a navy party's turn cap (deckCap): an inspection party that has not held our bridge by then withdraws, and the repel is won
  NAVY_STANDING: 2   // the standing with her government each head of a navy party put down costs, charged at the settle (boarders.js repelSettle: repelled, withdrawn or searched): a quarter of the 8 that firing on her cost
};

// Who comes aboard, by the hull she is: the navy hulls are the navy's, the corsair's her own, any other ship a raider's.
const DECK_PARTY = { raider: 'raider', corsair: 'corsair', cutter: 'navy', destroyer: 'navy' };

const LOCK = 0, CORRIDOR = 1, BRIDGE = 2, CARGO = 3;
const ADJ = [[CORRIDOR, CARGO], [LOCK, BRIDGE], [CORRIDOR, CARGO], [LOCK, BRIDGE]];  // who is next to whom, both ways; cargo is on a long ship only
const FORWARD = [CORRIDOR, BRIDGE, BRIDGE, BRIDGE];  // the next section toward the bridge
const BACK = [LOCK, LOCK, CORRIDOR, LOCK];           // and toward the lock
const REACH = [0, 1, 2, 1];                          // how far along each is from the lock: the front is the furthest
// A head is wounded before it is downed: a section keeps `mineHurt` and `theirsHurt`, how many of the heads of that side there are wounded (0 to the heads there). A hit wounds an
// unwounded head, and downs one once all are wounded; a wounded head still stands. The shot finishes the wounded first. A move takes the unwounded first. All update `s` in place.
const hurtOf = (s, side) => s[side + 'Hurt'] || 0;
function hitSide(s, side, hits) {
  let downed = 0, wounded = 0;
  for (let k = 0; k < hits && s[side] > 0; k++) {
    if (s[side] > hurtOf(s, side)) { s[side + 'Hurt'] = hurtOf(s, side) + 1; wounded++; } else { s[side]--; s[side + 'Hurt'] = hurtOf(s, side) - 1; downed++; }
  }
  return { downed, wounded };
}
function shootSide(s, side, shots) {  // one head of shot at a time: it downs a wounded head there, else wounds one (so the next head may down the one just wounded)
  let downed = 0, wounded = 0;
  for (let k = 0; k < shots && s[side] > 0; k++) {
    if (hurtOf(s, side) > 0) { s[side]--; s[side + 'Hurt']--; downed++; } else { s[side + 'Hurt'] = 1; wounded++; }
  }
  return { downed, wounded };
}
function moveHeads(S, side, from, to, n) {
  const key = side + 'Hurt', hurt = Math.max(0, n - (S[from][side] - hurtOf(S[from], side)));  // the wounded move last
  S[from][side] -= n; S[from][key] = hurtOf(S[from], side) - hurt; S[to][side] += n; S[to][key] = hurtOf(S[to], side) + hurt;
}
const sum = (st, key) => st.sections.reduce((n, s) => n + s[key], 0);
const dealt = (n, lo, hi, rand) => Math.min(n, lo + Math.floor(rand() * (hi - lo + 1)));
const rollsOf = (k, [lo, hi], rand) => { let t = 0; for (let i = 0; i < k; i++) t += lo + Math.floor(rand() * (hi - lo + 1)); return t; };  // k rolls in a range, summed

// `cover` is ours by section and `hers` hers. A repel brings half of the boarders to the lock and the rest as a wave (`wave`, null in an assault, where her crew are already aboard). The hand starts in `hand` (the lock), or with the nearest of our heads when none of ours is there (R34).
function deckFight({ boarders, crew, hand = LOCK, cover, hers = [], grade = 0, assault = false, side = false, party = 'raider', level = 2, coverMade = COVER_MADE }) {  // coverMade: what a worked cover order makes (cover-eye: 3)
  const names = side ? [...DECK.SECTIONS, 'cargo'] : DECK.SECTIONS;
  const sections = names.map((_, i) => ({ mine: 0, theirs: 0, mineHurt: 0, theirsHurt: 0, cover: cover[i] || 0, hers: hers[i] || 0 }));
  const [atk, def] = assault ? ['mine', 'theirs'] : ['theirs', 'mine'];
  const n = assault ? boarders : crew, each = Math.floor(n / sections.length);
  const first = assault ? boarders : Math.ceil(boarders / 2);
  sections[LOCK][atk] = assault ? crew : first;
  sections.forEach((s, i) => { s[def] = each + (i === BRIDGE ? n - each * sections.length : 0); });  // the remainder holds the bridge, so it is never left empty
  const start = sections[hand].mine ? hand : sections.map((_, i) => i).filter(i => sections[i].mine).sort((a, b) => Math.abs(REACH[a] - REACH[hand]) - Math.abs(REACH[b] - REACH[hand]))[0];
  return { kind: 'deck', sections, hand: start === undefined ? hand : start, began: boarders, party, level, coverMade, wave: !assault && boarders > first ? { n: boarders - first, turn: DECK.WAVE_TURN } : null, grade, assault, side, used: {}, turn: 0, charged: null, log: [],  // charged: the turn of the last charge
    ...(party === 'navy' && !assault ? { navyDown: 0 } : {}) };  // navyDown: the heads of a navy party put down so far, which the settle charges in standing
}

// How the side `atk` ('theirs' repelling, 'mine' in an assault) advances: from its front into the next section where it outnumbers the other, else hold; on a long
// ship with the corridor held it goes round by the cargo bay. A side does not leave a section while the other side stands in it (R29).
function advance(st, atk) {
  const S = st.sections, foe = atk === 'mine' ? 'theirs' : 'mine';
  const from = S.reduce((f, s, i) => (s[atk] && (f < 0 || REACH[i] >= REACH[f]) ? i : f), -1);
  if (from < 0 || from === BRIDGE || S[from][foe]) return { kind: 'hold', from: Math.max(from, 0), to: Math.max(from, 0), n: 0 };
  const to = from === LOCK && st.side && S[CORRIDOR][foe] && S[CARGO][foe] < S[CORRIDOR][foe] ? CARGO : FORWARD[from];
  return S[from][atk] <= S[to][foe] ? { kind: 'hold', from, to: from, n: 0 } : { kind: to === CARGO ? 'round' : 'push', from, to, n: S[from][atk] };
}

// Where a corsair's charge goes: the section of ours with the most heads (the first in deck order on a tie) next to one where theirs stand (`from`, the fullest), or null.
function chargeAt(st) {
  const S = st.sections;
  let best = null;
  S.forEach((s, at) => {
    const from = ADJ[at].filter(i => S[i] && S[i].theirs).sort((a, b) => S[b].theirs - S[a].theirs)[0];
    if (s.mine && from !== undefined && (!best || s.mine > S[best.at].mine)) best = { at, from };
  });
  return best;
}

// What her crew do this turn. Attacking (repelling) they advance; defending (an assault), she pushes back toward the lock where she outnumbers us. A veteran may feint a push.
// Raiders rush: a push into a section we hold thinly (under half of the heads sent) and the hand is not in goes on through it, two sections in a turn (`via` is the one passed).
// Corsairs charge: where they would push or hold, a breaching charge on a section of ours next to theirs (chargeAt), never two turns running and never feinted. It moves no heads.
// The navy pushes and holds, and on our deck never feints: a lawful party does what it says (a navy hull's crew boarded, in the owner's game, may).
function boardMove(st, rand) {
  const S = st.sections;
  let m = { kind: 'hold', from: LOCK, to: LOCK, n: 0 };
  if (!st.assault) m = advance(st, 'theirs');
  else {
    for (let i = S.length - 1; i > LOCK && m.kind === 'hold'; i--) {
      if (S[i].theirs && !S[i].mine && S[BACK[i]].mine && S[i].theirs > S[BACK[i]].mine) m = { kind: 'push', from: i, to: BACK[i], n: S[i].theirs };
    }
  }
  const via = m.to, past = (st.assault ? BACK : FORWARD)[via];
  if (m.kind === 'push' && st.party === 'raider' && past !== via && st.hand !== via && 2 * S[via].mine < m.n) m = { kind: 'rush', from: m.from, via, to: past, n: m.n };
  const charge = st.party === 'corsair' && (m.kind === 'push' || m.kind === 'hold') && st.charged !== st.turn - 1 ? chargeAt(st) : null;
  if (charge) return { kind: 'charge', ...charge, n: 0, feint: false };
  return { ...m, feint: m.kind !== 'rush' && !navyBoarding(st) && st.grade > 0 && rand() < CUNNING * st.grade };
}

function resolveDeckTurn(state, { stand, act, order }, shown, rand) {
  const st = copyOf(state), S = st.sections, events = [], stood = st.hand;  // stood: where the hand began the turn
  if (stand !== undefined && S[stand] && (stand === st.hand || ADJ[st.hand].includes(stand))) st.hand = stand;

  // A hatch is a steady or cover order with an `at`: it works in that section (one the deck lacks drops it), and is rolled before their move, so it can shut a rush's way.
  const asObj = a => (typeof a === 'string' ? { kind: a } : a);  // 'shoot' may be bare; steady and cover must carry odds
  const extra = S.map(() => 0), steadied = [], back = st.assault ? BACK : FORWARD;  // steadied: where a steady worked this turn; back: the way ours fall back, toward our bridge or her lock
  let press = 0, hatched = -1, down = 0;  // down: heads of theirs put down this turn (a worked steady, the exchange and the shot), for a navy party's count
  const ordered = asObj(order);
  const ability = (a, at, hatch) => {
    if (!a || (a.kind !== 'steady' && a.kind !== 'cover')) return;
    if (typeof a.odds !== 'number') throw new Error(a.kind + ' needs odds');
    if (a.kind === 'cover' && st.used.cover) return;
    if (a.kind === 'cover') st.used.cover = true;
    if (a.kind === 'steady' && !hatch && !S[at].theirs) { events.push({ kind: a.kind, nobody: true }); return; }
    const worked = rand() < a.odds;
    const r = abilityStep(a.kind, worked, { pos: at, boarders: S[at].theirs, extra }, st.coverMade);
    down += S[at].theirs - r.boarders;
    S[at].theirs = r.boarders; S[at].theirsHurt = Math.min(hurtOf(S[at], 'theirs'), r.boarders);
    r.extra.forEach((n, i) => { extra[i] = n; });
    if (r.press && at === st.hand) press++;  // a miss elsewhere costs the section's order, not the hand
    if (hatch && worked) hatched = at;
    if (a.kind === 'steady' && worked) steadied.push(at);
    events.push(hatch ? { kind: 'hatch', at, worked } : { kind: a.kind, worked });
  };
  const hatch = ordered && ordered.at !== undefined;
  if (hatch && S[ordered.at]) ability(ordered, ordered.at, true);

  const sent = shown.kind === 'hold' ? 0 : Math.min(shown.n, S[shown.from].theirs);  // a hatch may have thinned the section they leave
  if (shown.kind === 'rush') {  // it stops in the section passed when the hand stands there, ours there are half of them or more, or a hatch worked there
    const stopped = st.hand === shown.via || 2 * S[shown.via].mine >= sent || hatched === shown.via, to = stopped ? shown.via : shown.to;
    moveHeads(S, 'theirs', shown.from, to, sent);
    events.push({ kind: 'rush', from: shown.from, to, n: sent, stopped });
  } else if (shown.kind !== 'hold' && shown.kind !== 'charge') {  // a feint sends the heads somewhere else they can reach from where they stand, or nowhere
    let to = shown.to;
    if (shown.feint) {
      const other = [...ADJ[shown.from], shown.from].filter(t => S[t] && t !== shown.to);
      to = other[Math.floor(rand() * other.length)];
    }
    if (to !== shown.from) {
      moveHeads(S, 'theirs', shown.from, to, sent);
      events.push({ kind: 'move', from: shown.from, to, n: sent });
    }
  }
  if (st.assault) {  // our party advances by the same rule
    const m = advance(st, 'mine');
    if (m.kind !== 'hold') {
      moveHeads(S, 'mine', m.from, m.to, m.n);
      events.push({ kind: 'move', who: 'mine', from: m.from, to: m.to, n: m.n });
    }
  }

  // The hand's act and the crew order: steady and cover go through abilityStep, once each for the order and the act. Cover is once a fight, and is made for us
  // (our cover). A steady one with nobody of theirs in the section is not rolled, and says so (R34). A pull back takes the hand and all of ours there one section back
  // (none from the back section, and none on a turn the hand moved: a section a turn), and the order is then worked where the hand has gone. Hold fire
  // (fightui.js DECK_ACTS) is none of these: nothing is rolled or fired for it.
  const pulled = asObj(act) && asObj(act).kind === 'pullback' && st.hand === stood && back[st.hand] !== st.hand;
  if (pulled) {
    const from = st.hand, n = S[from].mine;
    moveHeads(S, 'mine', from, back[from], n); st.hand = back[from];
    events.push({ kind: 'pullback', from, to: st.hand, n });
  }
  ability(asObj(act), st.hand);
  if (!hatch) ability(ordered, st.hand);
  S.forEach((s, i) => { s.cover = Math.min(COVER_MAX, s.cover + extra[i]); });

  // Each section where both stand trades hits: a side takes a CREW_HIT roll (boarding her, DECK.ASSAULT's) for each opposing head there (R29), cut by that side's own cover there (R31), and a hit is never
  // cut to nothing (R33). A press is one more roll against us where the hand stands. A hit wounds a head and downs one once all are wounded (hitSide); the events say
  // both, `mine` and `theirs` being the downed. The shot comes after the exchange, at the hand's section or, from the reach level, one next to it: it finishes the wounded first.
  const hand = st.hand, contested = S[hand].mine > 0 && S[hand].theirs > 0;
  const [lo, hi] = deckRule(st, 'CREW_HIT');
  const hits = S.map((s, i) => {
    if (!s.mine || !s.theirs) return { mine: 0, theirs: 0 };
    const hit = (by, cover) => { const rolls = rollsOf(s[by], deckRule(st, 'CREW_HIT'), rand); return rolls > 0 ? Math.max(1, rolls - cover) : 0; };
    let mine = hit('theirs', s.cover), theirs = hit('mine', s.hers || 0);
    if (i === hand) for (let k = 0; k < press; k++) mine += dealt(s.mine, lo, hi, rand);
    return { mine, theirs };
  });
  const shot = asObj(act), aim = shot && shot.kind === 'shoot' ? (shot.at !== hand && st.level >= DECK.SIDEARM_REACH_LEVEL && ADJ[hand].includes(shot.at) && S[shot.at] ? shot.at : hand) : -1;
  const shots = aim >= 0 && S[aim].theirs ? dealt(S[aim].theirs, ...sidearmOf(st), rand) : 0;
  if (aim >= 0 && !S[aim].theirs && sum(st, 'theirs')) events.push({ kind: 'shoot', nobody: true, at: aim, aimed: aim !== hand });  // none of them where the shot goes, and some elsewhere: it is not rolled, and says so (R34)
  let setterHit = shown.kind === 'charge' && steadied.includes(shown.from);  // a steady worked where the charge's setter stands
  S.forEach((s, i) => {
    const m = hitSide(s, 'mine', hits[i].mine), t = hitSide(s, 'theirs', hits[i].theirs), g = i === aim ? shootSide(s, 'theirs', Math.min(shots, s.theirs)) : { downed: 0, wounded: 0 };
    if (i === shown.from && t.downed + t.wounded + g.downed + g.wounded > 0) setterHit = true;  // or ours there, or the shot, downed or wounded one of them
    down += t.downed + g.downed;
    // the wounded said are the heads newly wounded this turn and still standing at its end (a head wounded and then downed is said once, as down): never more than stand there
    const e = { kind: 'exchange', section: i, mine: m.downed, theirs: t.downed + g.downed, mineHurt: Math.min(m.wounded, hurtOf(s, 'mine')), theirsHurt: Math.min(t.wounded + g.wounded, hurtOf(s, 'theirs')) };
    if (e.mine || e.theirs || e.mineHurt || e.theirsHurt) events.push(e);
  });

  // A charge shown blows at the end of the exchange, unless its setter was hit this turn (one of theirs in `from` downed or wounded by ours: the shot, a worked steady or
  // hatch there, or the trade where ours stand there): DECK.CHARGE of ours in `at` down outright, past cover and wounds, the wounded first.
  if (shown.kind === 'charge') {
    const s = S[shown.at], mine = setterHit || !s.mine ? 0 : Math.min(s.mine, rollsOf(1, deckRule(st, 'CHARGE'), rand));
    s.mine -= mine; s.mineHurt = Math.max(0, hurtOf(s, 'mine') - mine);
    st.charged = st.turn;
    events.push({ kind: 'charge', at: shown.at, from: shown.from, mine, stopped: setterHit });
  }

  // A hand left in a section that is theirs alone falls back, one section at a time, to one that is not; with none, it stays with our nearest heads. One hurt roll for it.
  const alone = i => !S[i].mine && S[i].theirs > 0;
  let at = hand;
  while (alone(at) && back[at] !== at) at = back[at];
  if (alone(at)) {
    const near = S.map((s, i) => i).filter(i => S[i].mine).sort((x, y) => Math.abs(x - hand) - Math.abs(y - hand))[0];
    at = near === undefined ? hand : near;
  }
  const left = at !== hand;
  if (left) { st.hand = at; events.push({ kind: 'hand', back: true, from: hand, to: at }); }
  if (contested || left) events.push({ kind: 'hurt', hurt: rand() < REPEL_HURT.lose * DECK.SUIT });
  if (navyBoarding(st)) st.navyDown += down;  // a wounded head is not counted: only one put down
  st.turn++;
  if (st.wave && st.turn === st.wave.turn) {  // the second wave lands in the lock
    S[LOCK].theirs += st.wave.n;  // unwounded
    events.push({ kind: 'wave', n: st.wave.n });
    st.wave = null;
  }
  return { state: st, events };
}

// Her crew, with any wave still to land, is at or under her break share of her start (deckRule BREAK: 0.15 repelling, 0.2 boarding her), or none; or (an assault) mine hold her bridge, or (repelling) hers hold ours. Our loss comes first: the bridge lost is the ship lost,
// or held by a navy party, the ship searched ('searched': boarders.js repelSettle).
// At the turn cap the attackers withdraw (deckCapped): theirs go back to their ship, a repel won, or ours fall back, an assault lost (R32).
function deckEnd(st) {
  const bridge = st.sections[BRIDGE];
  if (st.assault ? sum(st, 'mine') === 0 : bridge.theirs > 0 && bridge.mine === 0) return navyBoarding(st) ? 'searched' : 'taken';
  if (sum(st, 'theirs') + pendingWave(st) <= st.began * deckRule(st, 'BREAK')) return 'won';
  if (st.assault && bridge.mine > 0 && bridge.theirs === 0) return 'won';
  return deckCapped(st) ? (st.assault ? 'taken' : 'won') : null;
}
const deckRule = (st, key) => (st.assault && key in DECK.ASSAULT ? DECK.ASSAULT : DECK)[key];  // a DECK number, or boarding her its DECK.ASSAULT one
const sidearmOf = st => DECK.SIDEARM_BY_LEVEL[Math.min(st.level, DECK.SIDEARM_BY_LEVEL.length - 1)];  // [lo, hi] heads the hand's shot takes at this fight's level
const pendingWave = st => (st.wave ? st.wave.n : 0);  // the heads still to land, 0 once landed
const deckCap = st => (navyBoarding(st) ? DECK.NAVY_TURNS : DECK.TURNS);  // the turn the attackers withdraw at: a navy party's own, or the deck's
// A navy party on our deck, the only deck it boards (a navy hull boarded, in the owner's game, fights as her crew): each of them put down costs standing, holding
// our bridge is a search, and it withdraws at its own cap.
const navyBoarding = st => st.party === 'navy' && !st.assault;
const deckCapped = st => st.turn >= deckCap(st);
const deckWithdrew = st => deckCapped(st) && deckEnd({ ...st, turn: 0 }) === null;  // the attackers went back at the cap, with their party not broken or beaten: the close (fightui.js deckClose), and for a navy party the citation (boarders.js repelSettle)
