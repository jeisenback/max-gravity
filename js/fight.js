'use strict';

// The turn-based fight engine (docs/superpowers/specs/2026-10-20-turn-combat-design.md). Pure: it reads no G and changes nothing it
// is given; each call takes the fight state and returns the next one with the facts of the turn. Loaded after shipcombat.js, whose
// GRADE_HULL and GRADE_PUNCH set how much a veteran crew adds.

const FIGHT = {
  GUN_DMG: [8, 14],  // one of your shots' range before the multipliers. Every damage and part bar here is about 0.7 of Task 7's, so that a fight's kills are slower and a
                     // raider's run to the knife is a race: two guns and two torpedoes at her hull took her 130 before she was alongside (#808 final fixes)
  FOE_DMG: [7, 18],  // one of her guns' range before the multipliers: wider than yours, and harder at its top
  HEAVY: 1.4,        // what heavy rounds add; it is already in a side's dmgMult, kept here for the board's text
  SKILL_DMG: 1,      // per gunner level, added to the low end
  BAND_MULT: { knife: 1.1, close: 1, mid: 0.85, long: 0.8 },
  HEAT_CAP: 4,       // heat over this locks a gun for the next turn
  HEAT_VENT: 2,      // heat shed each turn
  OVER_MULT: 1.5,    // what an overcharged shot rolls more
  OVER_HEAT: 2,      // the heat an overcharged shot adds (a plain shot adds 1)
  AIM_MULT: { knife: 1, close: 1, mid: 0.4, long: 0.25 },  // on top of the band, for a shot at her drive, lock or launcher; her hull and weapons have none. Low far out, so that her drive is not gone before she is alongside
  PART_HP: { weapons: 63, drive: 34, lock: 7, launcher: 10 },  // weapons is per gun mount, about three turns of fire; a drive takes three turns, so that a raider aimed at only there boards about one time in five; a lock goes in a turn
  TORP_DMG: [12, 18],  // one of your torpedoes: low, so that two of them at a raider's hull do not win the race to the knife for you
  SALVO_DMG: [20, 30], // one torpedo of her salvo: two of them unanswered are a heavy hit about two times in five, and with the turret held back never
  PDC_HOLD: 0.4,     // what a turret held back takes off a volley
  SALVO: 2,          // torpedoes in her salvo
  SALVO_EVERY: 2,    // she arms on turn 0 and then every second turn, and fires the turn after, while her torpedoes last
  PDC_SALVO: 0.6,    // what a turret held back takes off a salvo (a gun volley takes PDC_HOLD)
  LOST_CARGO: 0.3,   // the share of the fullest good in the hold that she takes when the ship is lost, and that the captain jettisons to run (fightui.js, boarders.js)
  TURNS: 8,
  POOL: 0.45,        // both sides' shields and armor in a fight are the ship's times this, so that a fight ends before TURNS (#814); the hand's real armor lost is the fight's
                     // divided by it (fightui.js). Tuned with the fight tool (3 seeds of 100) to the targets in tests/fights.test.js: answer has 99% good ends and loses 1%,
                     // in 6.2 turns, 32% of them at the cap (97% at 1.0); random play loses 38% and 19% of the real hull a fight; a lone raider falls to hull fire (COMBAT.md)
  BREAK: 0.3,        // her hull share (shields and armor) under which she breaks off, if her drive can take her away
  HAND_HURT: 0.35,   // the hand's own hurt roll on a turn of a heavy hit (fightui.js); it was a lost bold call's in the raid
  HEAVY_HIT: 0.2     // a turn is a heavy hit when the damage done to your hull (fight-scale, not pooled: the foe's damage is not scaled by FIGHT.POOL) is over this share of your real maximum armor, about 44% of the hull you have in the fight (fightui.js); a fifth, so that the hand is rarely
                     // killed: on the Ice Hauler only her salvo unanswered reaches it (SALVO_DMG), and the soak holds the hurts a chapter (tests/distribution/stakes.test.js)
};

const KNIFE = RANGE_BANDS.indexOf('knife');
const bandMultOf = band => FIGHT.BAND_MULT[RANGE_BANDS[band]] || 0;  // past long they have escaped and there is no volley
const AIMED = ['drive', 'lock', 'launcher'];
// The multiplier a gun order rolls with: the side's damage, the band, an overcharge, and the aim penalty of a small part at range.
const shotMult = (st, o, lead = false) => st.me.dmgMult * bandMultOf(st.band) * (o.over ? FIGHT.OVER_MULT : 1) * (AIMED.includes(o.part) && !lead ? FIGHT.AIM_MULT[RANGE_BANDS[st.band]] || 0 : 1);
// The [lo, hi] a gun order would roll, for the panel to show.
const shotRange = (st, o, lead = false) => [FIGHT.GUN_DMG[0] + FIGHT.SKILL_DMG * st.me.skill, FIGHT.GUN_DMG[1]].map(d => Math.round(d * shotMult(st, o, lead)));
// The gunner's moves (docs/superpowers/specs/2026-10-23-gunner-moves-design.md), each once a fight, ordered as orders.move (lead names orders.gun).
const FIGHT_MOVES = {
  vent: {},   // heat to 0 and the locks off before the shots, so every gun fires; needs heat or a lock
  lead: {},   // the named gun's aimed shot takes no AIM_MULT; needs that gun ready and aimed at a part
  split: {}   // the held turret still fires: no shot lost to it; her volley and salvo cut stay; needs the turret held
};
// The shots a turn fires, each { o, i } with its gun's index: the ready guns' orders that have a foe, less the one a held turret costs (none under split).
// The engine fires these and the panel counts their heat, so the two cannot disagree.
function turnShots(st, orders, split = false) {
  const n = gunsReady(st), lent = split ? 0 : st.me.pdc && orders.pdc === 'hold' ? 1 : 0;
  return orders.guns.slice(0, n).map((o, i) => ({ o, i })).filter(({ o }) => o && st.foes[o.foe]).slice(0, Math.max(0, n - lent));  // a gun that is not ready has no say, whatever its order
}
// Whether move id can be used this turn: known, not spent, and with something to act on.
function canUse(st, orders, id, known = []) {
  if (!FIGHT_MOVES[id] || !known.includes(id) || (st.spent || []).includes(id)) return false;
  const held = !!(st.me.pdc && orders.pdc === 'hold');
  if (id === 'vent') return st.heat > 0 || st.locked.length > 0;
  if (id === 'split') return held && gunsReady(st) > 0 && turnShots(st, orders, true).length >= gunsReady(st);  // the held turret must really cost a shot
  const shot = turnShots(st, orders).find(x => x.i === orders.gun);  // the named gun must fire
  const part = shot && st.foes[shot.o.foe] && st.foes[shot.o.foe].parts[shot.o.part];
  return !!shot && AIMED.includes(shot.o.part) && !!part && part.hp > 0 && (FIGHT.AIM_MULT[RANGE_BANDS[st.band]] || 0) < 1;  // a band with no aim penalty, or a part already shot away, has nothing to take off
}
const copyOf = o => JSON.parse(JSON.stringify(o));
const rollIn = ([lo, hi], mult, rand) => Math.round(lo * mult + rand() * (hi - lo) * mult);

// What each kind of foe adds to her hull: the share of her shields that comes back each turn, and a torpedo launcher with its torpedoes (tuned with the fight
// tool, COMBAT.md). The destroyer has neither until the fight ladder (PR 3) decides how she is met: the fight tool does not play one.
const FOE_TYPES = {
  raider: { regen: 0, launcher: false },
  corsair: { regen: 0, launcher: true, torps: 4 },
  cutter: { regen: 0.07, launcher: false },
  destroyer: { regen: 0, launcher: false }
};

// A ship's side in a fight: her shields and armor scaled by FIGHT.POOL, her parts by FIGHT.PART_HP.
function shipSide(stats, { grade = 0, skill = 0, torps = 0, regen = 0, launcher = stats.launcher }) {
  const armor = Math.round(stats.armor * (1 + GRADE_HULL * grade) * FIGHT.POOL), shields = Math.round(stats.shields * FIGHT.POOL);
  const part = key => ({ hp: FIGHT.PART_HP[key], max: FIGHT.PART_HP[key] });
  const weapons = FIGHT.PART_HP.weapons * stats.guns;
  return {
    shields, maxShields: shields, armor, maxArmor: armor,
    parts: { weapons: { hp: weapons, max: weapons }, drive: part('drive'), lock: part('lock'), ...(launcher ? { launcher: part('launcher') } : {}) },
    guns: stats.guns, dmgMult: stats.dmgMult * (1 + GRADE_PUNCH * grade), skill,
    speed: stats.accel * stats.turn,  // who wins the say on the range
    launcher: !!launcher, pdc: !!stats.pdc, torps, regen
  };
}

const shipFight = ({ me, foes, nerve, band }) => ({ kind: 'ship', me, foes, band, heat: 0, locked: [], turn: 0, nerve, log: [], moves: null, boarded: false, armed: [], spent: [] });  // armed: one flag a foe, her salvo loaded and fired next turn; spent: the gunner moves used

// A mount whose share of the weapons bar is gone cannot fire, nor can one that is locked.
const gunsReady = st => Math.max(0, Math.min(st.me.guns, Math.ceil(st.me.parts.weapons.hp / FIGHT.PART_HP.weapons)) - st.locked.length);

// Damage to the hull goes to shields first, then armor; to a part, to its hp. Returns what it took: nothing from a part already at 0.
function dealDamage(side, part, dmg) {
  if (part === 'hull') {
    const s = Math.min(side.shields, dmg), a = Math.min(side.armor, dmg - s);
    side.shields -= s;
    side.armor -= a;
    return s + a;
  }
  const took = Math.min(side.parts[part].hp, dmg);
  side.parts[part].hp -= took;
  return took;
}

function resolveShipTurn(state, orders, moves, rand, known = []) {
  const st = copyOf(state), events = [];
  const held = st.me.pdc && orders.pdc === 'hold';
  const move = canUse(st, orders, orders.move, known) ? orders.move : null;
  if (move) {
    st.spent = [...(st.spent || []), move];
    events.push({ who: 'me', move });
    if (move === 'vent') { st.heat = 0; st.locked = []; }
  }

  // A turret held back is not firing, so it costs a shot.
  const shots = turnShots(st, orders, move === 'split');  // split: the held turret costs no shot
  for (const { o, i } of shots) {
    const dmg = dealDamage(st.foes[o.foe], o.part, rollIn([FIGHT.GUN_DMG[0] + FIGHT.SKILL_DMG * st.me.skill, FIGHT.GUN_DMG[1]], shotMult(st, o, move === 'lead' && i === orders.gun), rand));
    events.push({ who: 'me', foe: o.foe, part: o.part, dmg });
  }
  if (orders.torp && st.me.launcher && st.me.torps > 0 && st.foes[orders.torp.foe]) {
    const foe = st.foes[orders.torp.foe];
    st.me.torps--;
    const dmg = dealDamage(foe, orders.torp.part, rollIn(FIGHT.TORP_DMG, foe.pdc ? 1 - FIGHT.PDC_HOLD : 1, rand));
    events.push({ who: 'me', foe: orders.torp.foe, part: orders.torp.part, dmg, torp: true });
  }

  st.moves = copyOf(moves);
  st.foes.forEach((foe, i) => {
    const m = moves.foe[i];
    if (m && m.kind === 'arm') { if (foe.armor > 0 && foe.parts.launcher && foe.parts.launcher.hp > 0) st.armed[i] = true; return; }
    if (m && m.kind === 'salvo') {
      st.armed[i] = false;
      if (foe.armor <= 0 || !foe.parts.launcher || foe.parts.launcher.hp <= 0 || foe.torps < m.n) return;  // a launcher shot away takes the salvo with it
      foe.torps -= m.n;
      const dmg = dealDamage(st.me, 'hull', rollIn(m.dmg, st.me.pdc && orders.pdc === 'hold' ? 1 - FIGHT.PDC_SALVO : 1, rand));
      events.push({ who: 'foe', foe: i, part: 'hull', dmg, salvo: true });
      return;
    }
    if (!m || !m.target || foe.armor <= 0 || foe.parts.weapons.hp <= 0) return;  // a broadside, a pin, or the volley she fires as she closes
    const dmg = dealDamage(st.me, m.target, rollIn(m.dmg, held ? 1 - FIGHT.PDC_HOLD : 1, rand));
    events.push({ who: 'foe', foe: i, part: m.target, dmg });
  });
  if (st.foes.some((foe, i) => foe.armor > 0 && foe.parts.lock.hp > 0 && st.band === KNIFE && moves.foe[i] && moves.foe[i].kind === 'board')) st.boarded = true;
  st.band = nextBand(st, moves);

  const heat = st.heat + shots.reduce((h, { o }) => h + (o.over ? FIGHT.OVER_HEAT : 1), 0);
  st.locked = heat > FIGHT.HEAT_CAP ? [0] : [];
  st.heat = Math.max(0, heat - FIGHT.HEAT_VENT);
  for (const side of [st.me, ...st.foes]) side.shields = Math.min(side.maxShields, side.shields + Math.round(side.regen * side.maxShields));
  st.turn++;
  return { state: st, events };
}

const hullShare = side => (side.shields + side.armor) / (side.maxShields + side.maxArmor);
const poolShare = foes => foes.reduce((n, f) => n + f.shields + f.armor, 0) / foes.reduce((n, f) => n + f.maxShields + f.maxArmor, 0);
const up = side => side.armor > 0 && side.parts.drive.hp > 0;

// What the guns of foe i would do this turn: the range of one volley from the mounts it has left.
function foeVolley(st, i) {
  const foe = st.foes[i];
  const ready = Math.min(foe.guns, Math.ceil(foe.parts.weapons.hp / FIGHT.PART_HP.weapons));
  return FIGHT.FOE_DMG.map(d => Math.round(d * ready * foe.dmgMult * bandMultOf(st.band)));
}

// Her rules, in order: badly hurt or with no guns left she breaks off, while her drive can take her away; alongside with her lock whole she boards;
// against a faster ship she pins its drive; she closes, firing at your hull as she comes, to the knife while her lock can board and to close range when
// it cannot; else a broadside, at your guns while they fire and then at your hull. A lock at 0 only takes the boarding away (R20).
function foeMove(st, i) {
  const foe = st.foes[i], armed = foe.parts.weapons.hp > 0, lock = foe.parts.lock.hp > 0, drive = foe.parts.drive.hp > 0;
  if (drive && (hullShare(foe) < FIGHT.BREAK || !armed)) return { kind: 'break' };
  if (!armed) return { kind: 'hold' };  // no guns and no drive: she is out, and the fight has ended on her
  const launcher = foe.launcher && foe.parts.launcher.hp > 0;
  if (launcher && st.armed[i]) return { kind: 'salvo', target: 'hull', n: Math.min(FIGHT.SALVO, foe.torps), dmg: FIGHT.SALVO_DMG.map(d => d * Math.min(FIGHT.SALVO, foe.torps)) };
  if (launcher && foe.torps >= 1 && st.turn % FIGHT.SALVO_EVERY === 0) return { kind: 'arm', n: Math.min(FIGHT.SALVO, foe.torps) };
  if (st.band === KNIFE && lock) return { kind: 'board' };
  if (st.me.parts.drive.hp > 0 && st.me.speed > foe.speed) return { kind: 'pin', target: 'drive', dmg: foeVolley(st, i) };
  if (drive && st.band > (lock ? KNIFE : RANGE_BANDS.indexOf('close'))) return { kind: 'close', target: 'hull', dmg: foeVolley(st, i) };
  return { kind: 'broadside', target: st.me.parts.weapons.hp > 0 ? 'weapons' : 'hull', dmg: foeVolley(st, i) };
}

function captainMove(st) {
  const mine = hullShare(st.me), hers = poolShare(st.foes);
  const lead = Math.round((mine - hers) * 100);  // whole points, so 0.7 - 0.4 is a lead of 30
  if (st.nerve >= 4) return { kind: hers < mine ? 'close' : 'hold' };
  if (st.nerve >= 1 && st.nerve <= 2) return { kind: mine < 0.6 ? 'open' : 'hold' };
  if (st.nerve === 3) return { kind: mine < 0.4 ? 'open' : lead >= 30 ? 'close' : 'hold' };
  return { kind: 'hold' };
}

// Each side votes the band one step; when they differ the faster side's vote stands, and a side with no drive has no vote. Her side's vote is the closest
// of her ships' (R21): a pack holds the range while any one of them still comes, and the fastest of those that cast it is the speed that counts.
function nextBand(st, moves) {
  if (st.band >= RANGE_BANDS.length) return st.band;
  const votes = st.foes.map((f, i) => ({ f, v: moves.foe[i] ? ({ close: -1, break: 1 }[moves.foe[i].kind] || 0) : null })).filter(({ f, v }) => v !== null && up(f));
  const foeVote = votes.length ? Math.min(...votes.map(x => x.v)) : null;
  const pack = votes.filter(x => x.v === foeVote).sort((a, b) => b.f.speed - a.f.speed)[0];
  const meVote = st.me.parts.drive.hp > 0 ? ({ close: -1, open: 1 }[moves.captain.kind] || 0) : null;
  let step = 0;
  if (foeVote === null || meVote === null) step = foeVote === null ? meVote || 0 : foeVote;
  else if (foeVote === meVote) step = foeVote;
  else step = st.me.speed > pack.f.speed ? meVote : st.me.speed < pack.f.speed ? foeVote : 0;
  return Math.max(0, Math.min(RANGE_BANDS.length, st.band + step));
}

// The ends, in order: lost, boarded, crippled, away (every foe left breaks off with her guns gone and her hull whole: she got away with nothing for you),
// broke, escaped; at the turn cap the captain runs if she is the worse hurt ('ran', a lost fight), else the foe breaks.
function shipEnd(st) {
  const out = f => f.armor <= 0 || (f.parts.weapons.hp <= 0 && f.parts.drive.hp <= 0);
  const breaking = (f, i) => st.moves && st.moves.foe[i] && st.moves.foe[i].kind === 'break' && f.parts.drive.hp > 0;
  const broke = st.moves && st.foes.every((f, i) => out(f) || breaking(f, i));
  if (st.me.armor <= 0) return 'lost';
  if (st.boarded) return 'boarded';
  if (st.foes.every(out)) return 'crippled';
  if (broke && st.foes.every((f, i) => out(f) || (f.parts.weapons.hp <= 0 && hullShare(f) >= FIGHT.BREAK))) return 'away';
  if (broke) return 'broke';
  if (st.band >= RANGE_BANDS.length) return 'escaped';
  if (st.turn < FIGHT.TURNS) return null;
  return hullShare(st.me) < poolShare(st.foes) ? 'ran' : 'broke';
}

// The deck fight: the same turn on the decks (spec 2026-10-20). Sections are lock, corridor, bridge, and 'cargo' on a long ship. `mine` and `theirs`
// are always our crew and hers; `assault` says who pushes (theirs when repelling, mine when we board). Each section keeps our cover (`cover`) and hers (`hers`)
// apart, and each cuts only its own side's losses (R31). Loaded after boarders.js, for REPEL_HURT.
const DECK = {
  SECTIONS: ['lock', 'corridor', 'bridge'],
  SIDEARM_BY_LEVEL: [[1, 2], [1, 2], [2, 3], [3, 4]],  // heads the hand's shot takes, by the level of the fight (sidearmOf): each downs a wounded head there, else wounds one
  SIDEARM_REACH_LEVEL: 2,  // from this level the shot may be aimed at a section next to the hand's as well as its own
  WAVE_TURN: 1,      // the turn at whose end the second wave of a repel lands in the lock
  CREW_HIT: [0, 2],  // heads one opposing head takes in a section where both stand (a roll a head); a side's own cover cuts its total, never below one hit
  BREAK: 0.3,        // of her crew at the start: at or under it she breaks (about a third; at 6 she breaks at 1, not 2)
  SUIT: 0.3,         // times REPEL_HURT.lose: the standard suit's stat (the hand standing in the fight is hurt less often)
  CASUALTY: 0.3,     // of our heads lost, the share that is a casualty (fightui.js deckLoss); the rest are downed and get up after it, so that a fight kills about as many as the lock fight did (R42)
  TURNS: 8           // at the end of this turn the attackers withdraw: a repel is won, an assault lost (R32)
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
function deckFight({ boarders, crew, hand = LOCK, cover, hers = [], grade = 0, assault = false, side = false, party = 'raider', level = 2 }) {
  const names = side ? [...DECK.SECTIONS, 'cargo'] : DECK.SECTIONS;
  const sections = names.map((_, i) => ({ mine: 0, theirs: 0, mineHurt: 0, theirsHurt: 0, cover: cover[i] || 0, hers: hers[i] || 0 }));
  const [atk, def] = assault ? ['mine', 'theirs'] : ['theirs', 'mine'];
  const n = assault ? boarders : crew, each = Math.floor(n / sections.length);
  const first = assault ? boarders : Math.ceil(boarders / 2);
  sections[LOCK][atk] = assault ? crew : first;
  sections.forEach((s, i) => { s[def] = each + (i === BRIDGE ? n - each * sections.length : 0); });  // the remainder holds the bridge, so it is never left empty
  const start = sections[hand].mine ? hand : sections.map((_, i) => i).filter(i => sections[i].mine).sort((a, b) => Math.abs(REACH[a] - REACH[hand]) - Math.abs(REACH[b] - REACH[hand]))[0];
  return { kind: 'deck', sections, hand: start === undefined ? hand : start, began: boarders, party, level, wave: !assault && boarders > first ? { n: boarders - first, turn: DECK.WAVE_TURN } : null, grade, assault, side, used: {}, turn: 0, log: [] };
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

// What her crew do this turn. Attacking (repelling) they advance; defending (an assault), she pushes back toward the lock where she outnumbers us. A veteran may feint a push.
// Raiders rush: a push into a section we hold thinly (under half of the heads sent) and the hand is not in goes on through it, two sections in a turn (`via` is the one passed).
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
  return { ...m, feint: m.kind !== 'rush' && st.grade > 0 && rand() < CUNNING * st.grade };
}

function resolveDeckTurn(state, { stand, act, order }, shown, rand) {
  const st = copyOf(state), S = st.sections, events = [];
  if (stand !== undefined && S[stand] && (stand === st.hand || ADJ[st.hand].includes(stand))) st.hand = stand;

  // A hatch is a steady or cover order with an `at`: it works in that section (one the deck lacks drops it), and is rolled before their move, so it can shut a rush's way.
  const asObj = a => (typeof a === 'string' ? { kind: a } : a);  // 'shoot' may be bare; steady and cover must carry odds
  const here = S[st.hand], extra = S.map(() => 0);
  let press = 0, hatched = -1;
  const ordered = asObj(order);
  const ability = (a, at, hatch) => {
    if (!a || (a.kind !== 'steady' && a.kind !== 'cover')) return;
    if (typeof a.odds !== 'number') throw new Error(a.kind + ' needs odds');
    if (a.kind === 'cover' && st.used.cover) return;
    if (a.kind === 'cover') st.used.cover = true;
    if (a.kind === 'steady' && !hatch && !S[at].theirs) { events.push({ kind: a.kind, nobody: true }); return; }
    const worked = rand() < a.odds;
    const r = abilityStep(a.kind, worked, { pos: at, boarders: S[at].theirs, extra });
    S[at].theirs = r.boarders; S[at].theirsHurt = Math.min(hurtOf(S[at], 'theirs'), r.boarders);
    r.extra.forEach((n, i) => { extra[i] = n; });
    if (r.press && at === st.hand) press++;  // a miss elsewhere costs the section's order, not the hand
    if (hatch && worked) hatched = at;
    events.push(hatch ? { kind: 'hatch', at, worked } : { kind: a.kind, worked });
  };
  const hatch = ordered && ordered.at !== undefined;
  if (hatch && S[ordered.at]) ability(ordered, ordered.at, true);

  const sent = shown.kind === 'hold' ? 0 : Math.min(shown.n, S[shown.from].theirs);  // a hatch may have thinned the section they leave
  if (shown.kind === 'rush') {  // it stops in the section passed when the hand stands there, ours there are half of them or more, or a hatch worked there
    const stopped = st.hand === shown.via || 2 * S[shown.via].mine >= sent || hatched === shown.via, to = stopped ? shown.via : shown.to;
    moveHeads(S, 'theirs', shown.from, to, sent);
    events.push({ kind: 'rush', from: shown.from, to, n: sent, stopped });
  } else if (shown.kind !== 'hold') {  // a feint sends the heads somewhere else they can reach from where they stand, or nowhere
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
  // (our cover). A steady one with nobody of theirs in the section is not rolled, and says so (R34).
  ability(asObj(act), st.hand);
  if (!hatch) ability(ordered, st.hand);
  S.forEach((s, i) => { s.cover = Math.min(COVER_MAX, s.cover + extra[i]); });

  // Each section where both stand trades hits: a side takes a CREW_HIT roll for each opposing head there (R29), cut by that side's own cover there (R31), and a hit is never
  // cut to nothing (R33). A press is one more roll against us where the hand stands. A hit wounds a head and downs one once all are wounded (hitSide); the events say
  // both, `mine` and `theirs` being the downed. The shot comes after the exchange, at the hand's section or, from the reach level, one next to it: it finishes the wounded first.
  const hand = st.hand, contested = here.mine > 0 && here.theirs > 0;
  const [lo, hi] = DECK.CREW_HIT;
  const hits = S.map((s, i) => {
    if (!s.mine || !s.theirs) return { mine: 0, theirs: 0 };
    const hit = (by, cover) => { const rolls = rollsOf(s[by], DECK.CREW_HIT, rand); return rolls > 0 ? Math.max(1, rolls - cover) : 0; };
    let mine = hit('theirs', s.cover), theirs = hit('mine', s.hers || 0);
    if (i === hand) for (let k = 0; k < press; k++) mine += dealt(s.mine, lo, hi, rand);
    return { mine, theirs };
  });
  const shot = asObj(act), aim = shot && shot.kind === 'shoot' ? (shot.at !== hand && st.level >= DECK.SIDEARM_REACH_LEVEL && ADJ[hand].includes(shot.at) && S[shot.at] ? shot.at : hand) : -1;
  const shots = aim >= 0 && S[aim].theirs ? dealt(S[aim].theirs, ...sidearmOf(st), rand) : 0;
  if (aim >= 0 && !S[aim].theirs && sum(st, 'theirs')) events.push({ kind: 'shoot', nobody: true });  // none of them where the shot goes, and some elsewhere: it is not rolled, and says so (R34)
  S.forEach((s, i) => {
    const m = hitSide(s, 'mine', hits[i].mine), t = hitSide(s, 'theirs', hits[i].theirs), g = i === aim ? shootSide(s, 'theirs', Math.min(shots, s.theirs)) : { downed: 0, wounded: 0 };
    const e = { kind: 'exchange', section: i, mine: m.downed, theirs: t.downed + g.downed, mineHurt: m.wounded, theirsHurt: t.wounded + g.wounded };
    if (e.mine || e.theirs || e.mineHurt || e.theirsHurt) events.push(e);
  });

  // A hand left in a section that is theirs alone falls back, one section at a time, to one that is not; with none, it stays with our nearest heads. One hurt roll for it.
  const back = st.assault ? BACK : FORWARD, alone = i => !S[i].mine && S[i].theirs > 0;
  let at = hand;
  while (alone(at) && back[at] !== at) at = back[at];
  if (alone(at)) {
    const near = S.map((s, i) => i).filter(i => S[i].mine).sort((x, y) => Math.abs(x - hand) - Math.abs(y - hand))[0];
    at = near === undefined ? hand : near;
  }
  const left = at !== hand;
  if (left) { st.hand = at; events.push({ kind: 'hand', back: true, from: hand, to: at }); }
  if (contested || left) events.push({ kind: 'hurt', hurt: rand() < REPEL_HURT.lose * DECK.SUIT });
  st.turn++;
  if (st.wave && st.turn === st.wave.turn) {  // the second wave lands in the lock
    S[LOCK].theirs += st.wave.n;  // unwounded
    events.push({ kind: 'wave', n: st.wave.n });
    st.wave = null;
  }
  return { state: st, events };
}

// Her crew is at or under about a third of her start, or none; or (an assault) mine hold her bridge, or (repelling) hers hold ours. Our loss comes first: the bridge lost is the ship lost.
// At the turn cap the attackers withdraw (deckCapped): theirs go back to their ship, a repel won, or ours fall back, an assault lost (R32).
function deckEnd(st) {
  const bridge = st.sections[BRIDGE];
  if (st.assault ? sum(st, 'mine') === 0 : bridge.theirs > 0 && bridge.mine === 0) return 'taken';
  if (sum(st, 'theirs') + pendingWave(st) <= st.began * DECK.BREAK) return 'won';
  if (st.assault && bridge.mine > 0 && bridge.theirs === 0) return 'won';
  return deckCapped(st) ? (st.assault ? 'taken' : 'won') : null;
}
const sidearmOf = st => DECK.SIDEARM_BY_LEVEL[st.level];  // [lo, hi] heads the hand's shot takes at this fight's level
const pendingWave = st => (st.wave ? st.wave.n : 0);  // the heads still to land, 0 once landed
const deckCapped = st => st.turn >= DECK.TURNS;
