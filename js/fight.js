'use strict';

// The turn-based fight engine (docs/superpowers/specs/2026-10-20-turn-combat-design.md). Pure: it reads no G and changes nothing it
// is given; each call takes the fight state and returns the next one with the facts of the turn. Loaded after shipcombat.js, whose
// GRADE_HULL and GRADE_PUNCH set how much a veteran crew adds.

const FIGHT = {
  GUN_DMG: [8, 14],  // one shot's range before the multipliers
  HEAVY: 1.4,        // what heavy rounds add; it is already in a side's dmgMult, kept here for the board's text
  SKILL_DMG: 1,      // per gunner level, added to the low end
  BAND_MULT: { knife: 1.1, close: 1, mid: 0.85, long: 0.6 },
  HEAT_CAP: 4,       // heat over this locks a gun for the next turn
  HEAT_VENT: 2,      // heat shed each turn
  SHIELD_REGEN: 0.1, // of the maximum, at the end of the turn
  PART_HP: { weapons: 20, drive: 30, lock: 20 },  // weapons is per gun mount
  TORP_DMG: [30, 45],
  PDC_HOLD: 0.4,     // what a turret held back takes off a volley
  TURNS: 6
};

const bandMultOf = band => FIGHT.BAND_MULT[RANGE_BANDS[band]] || 0;  // past long they have escaped and there is no volley
const copyOf = o => JSON.parse(JSON.stringify(o));
const rollIn = ([lo, hi], mult, rand) => Math.round(lo * mult + rand() * (hi - lo) * mult);

function shipSide(stats, { grade = 0, skill = 0, torps = 0 }) {
  const armor = Math.round(stats.armor * (1 + GRADE_HULL * grade));
  const part = key => ({ hp: FIGHT.PART_HP[key], max: FIGHT.PART_HP[key] });
  const weapons = FIGHT.PART_HP.weapons * stats.guns;
  return {
    shields: stats.shields, maxShields: stats.shields, armor, maxArmor: armor,
    parts: { weapons: { hp: weapons, max: weapons }, drive: part('drive'), lock: part('lock') },
    guns: stats.guns, dmgMult: stats.dmgMult * (1 + GRADE_PUNCH * grade), skill,
    speed: stats.accel * stats.turn,  // who wins the say on the range
    launcher: !!stats.launcher, pdc: !!stats.pdc, torps
  };
}

const shipFight = ({ me, foes, nerve, band }) => ({ kind: 'ship', me, foes, band, heat: 0, locked: [], turn: 0, nerve, log: [], moves: null, boarded: false });

// A mount whose share of the weapons bar is gone cannot fire, nor can one that is locked.
const gunsReady = st => Math.max(0, Math.min(st.me.guns, Math.ceil(st.me.parts.weapons.hp / FIGHT.PART_HP.weapons)) - st.locked.length);

// Damage to the hull goes to shields first, then armor; to a part, to its hp. Returns what was dealt.
function dealDamage(side, part, dmg) {
  if (part === 'hull') {
    const s = Math.min(side.shields, dmg);
    side.shields -= s;
    side.armor = Math.max(0, side.armor - (dmg - s));
  } else side.parts[part].hp = Math.max(0, side.parts[part].hp - dmg);
  return dmg;
}

function resolveShipTurn(state, orders, moves, rand) {
  const st = copyOf(state), events = [];
  const held = st.me.pdc && orders.pdc === 'hold';
  const bandMult = bandMultOf(st.band);
  const lo = FIGHT.GUN_DMG[0] + FIGHT.SKILL_DMG * st.me.skill;

  // A turret held back is not firing, so it costs a shot.
  const shots = orders.guns.filter(o => o && st.foes[o.foe]).slice(0, Math.max(0, gunsReady(st) - (held ? 1 : 0)));
  for (const o of shots) {
    const dmg = dealDamage(st.foes[o.foe], o.part, rollIn([lo, FIGHT.GUN_DMG[1]], st.me.dmgMult * bandMult, rand));
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
    if (!m || (m.kind !== 'broadside' && m.kind !== 'pin') || foe.armor <= 0 || foe.parts.weapons.hp <= 0) return;
    const dmg = dealDamage(st.me, m.target, rollIn(m.dmg, held ? 1 - FIGHT.PDC_HOLD : 1, rand));
    events.push({ who: 'foe', foe: i, part: m.target, dmg });
  });
  if (st.foes.some((foe, i) => foe.armor > 0 && foe.parts.lock.hp > 0 && st.band === 0 && moves.foe[i] && moves.foe[i].kind === 'board')) st.boarded = true;
  st.band = nextBand(st, moves);

  const heat = st.heat + shots.length;
  st.locked = heat > FIGHT.HEAT_CAP ? [0] : [];
  st.heat = Math.max(0, heat - FIGHT.HEAT_VENT);
  for (const side of [st.me, ...st.foes]) side.shields = Math.min(side.maxShields, side.shields + Math.round(FIGHT.SHIELD_REGEN * side.maxShields));
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
  return FIGHT.GUN_DMG.map(d => Math.round(d * ready * foe.dmgMult * bandMultOf(st.band)));
}

function foeMove(st, i) {
  const foe = st.foes[i], armed = foe.parts.weapons.hp > 0;
  if (hullShare(foe) < 0.3) return { kind: 'break' };
  if (st.band === 0 && foe.parts.lock.hp > 0) return { kind: 'board' };
  if (armed && st.me.parts.drive.hp > 0 && st.me.speed > foe.speed) return { kind: 'pin', target: 'drive', dmg: foeVolley(st, i) };
  if (st.band > RANGE_BANDS.indexOf('close') && foe.parts.drive.hp > 0) return { kind: 'close' };
  return armed ? { kind: 'broadside', target: 'weapons', dmg: foeVolley(st, i) } : { kind: 'hold' };
}

function captainMove(st) {
  const mine = hullShare(st.me), hers = poolShare(st.foes);
  const kind = st.nerve >= 4 ? (hers < mine ? 'close' : 'hold')
    : st.nerve >= 1 && st.nerve <= 2 ? (mine < 0.6 ? 'open' : 'hold')
    : st.nerve === 3 ? (mine < 0.4 ? 'open' : mine - hers >= 0.3 ? 'close' : 'hold') : 'hold';
  return { kind };
}

// Each side votes the band one step; when they differ the faster side's vote stands, and a side with no drive has no vote.
function nextBand(st, moves) {
  if (st.band >= RANGE_BANDS.length) return st.band;
  const pack = st.foes.map((f, i) => ({ f, m: moves.foe[i] })).filter(({ f, m }) => m && up(f)).sort((a, b) => b.f.speed - a.f.speed)[0];
  const foeVote = pack ? ({ close: -1, break: 1 }[pack.m.kind] || 0) : null;
  const meVote = st.me.parts.drive.hp > 0 ? ({ close: -1, open: 1 }[moves.captain.kind] || 0) : null;
  let step = 0;
  if (foeVote === null || meVote === null) step = foeVote === null ? meVote || 0 : foeVote;
  else if (foeVote === meVote) step = foeVote;
  else step = st.me.speed > pack.f.speed ? meVote : st.me.speed < pack.f.speed ? foeVote : 0;
  return Math.max(0, Math.min(RANGE_BANDS.length, st.band + step));
}

function shipEnd(st) {
  const out = f => f.parts.weapons.hp <= 0 && f.parts.drive.hp <= 0;
  const broke = st.moves && st.foes.every((f, i) => out(f) || (st.moves.foe[i] && st.moves.foe[i].kind === 'break' && f.parts.drive.hp > 0));
  if (st.me.armor <= 0) return 'lost';
  if (st.boarded) return 'boarded';
  if (st.foes.every(out)) return 'crippled';
  if (broke) return 'broke';
  if (st.band >= RANGE_BANDS.length) return 'escaped';
  return st.turn >= FIGHT.TURNS ? 'standoff' : null;
}
