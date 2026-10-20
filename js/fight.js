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

const KNIFE = RANGE_BANDS.indexOf('knife');
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
  if (st.foes.some((foe, i) => foe.armor > 0 && foe.parts.lock.hp > 0 && st.band === KNIFE && moves.foe[i] && moves.foe[i].kind === 'board')) st.boarded = true;
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
  if (st.band === KNIFE && foe.parts.lock.hp > 0) return { kind: 'board' };
  if (armed && st.me.parts.drive.hp > 0 && st.me.speed > foe.speed) return { kind: 'pin', target: 'drive', dmg: foeVolley(st, i) };
  if (st.band > RANGE_BANDS.indexOf('close') && foe.parts.drive.hp > 0) return { kind: 'close' };
  return armed ? { kind: 'broadside', target: 'weapons', dmg: foeVolley(st, i) } : { kind: 'hold' };
}

function captainMove(st) {
  const mine = hullShare(st.me), hers = poolShare(st.foes);
  const lead = Math.round((mine - hers) * 100);  // whole points, so 0.7 - 0.4 is a lead of 30
  if (st.nerve >= 4) return { kind: hers < mine ? 'close' : 'hold' };
  if (st.nerve >= 1 && st.nerve <= 2) return { kind: mine < 0.6 ? 'open' : 'hold' };
  if (st.nerve === 3) return { kind: mine < 0.4 ? 'open' : lead >= 30 ? 'close' : 'hold' };
  return { kind: 'hold' };
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
  const out = f => f.armor <= 0 || (f.parts.weapons.hp <= 0 && f.parts.drive.hp <= 0);
  const broke = st.moves && st.foes.every((f, i) => out(f) || (st.moves.foe[i] && st.moves.foe[i].kind === 'break' && f.parts.drive.hp > 0));
  if (st.me.armor <= 0) return 'lost';
  if (st.boarded) return 'boarded';
  if (st.foes.every(out)) return 'crippled';
  if (broke) return 'broke';
  if (st.band >= RANGE_BANDS.length) return 'escaped';
  return st.turn >= FIGHT.TURNS ? 'standoff' : null;
}

// The deck fight: the same turn on the decks (spec 2026-10-20). Sections are lock, corridor, bridge, and 'cargo' on a long ship. `mine` and `theirs`
// are always our crew and hers; `assault` says who pushes (theirs when repelling, mine when we board). Loaded after boarders.js, for REPEL_HURT.
const DECK = {
  SECTIONS: ['lock', 'corridor', 'bridge'],
  SIDEARM: [1, 2],   // heads the hand's shot takes, added to the exchange in their section
  CREW_HIT: [0, 1],  // heads each side loses in a section where both stand; cover pips take from the high end of the defenders'
  BREAK: 1 / 3,      // of her crew at the start: at or under it she breaks
  SUIT: 0.7          // times REPEL_HURT.lose: the standard suit's stat
};

const LOCK = 0, CORRIDOR = 1, BRIDGE = 2, CARGO = 3;
const FORWARD = [CORRIDOR, BRIDGE, BRIDGE, BRIDGE];  // the next section toward the bridge
const BACK = [LOCK, LOCK, CORRIDOR, LOCK];           // and toward the lock
const REACH = [0, 1, 2, 1];                          // how far along each is from the lock: the front is the furthest
const sum = (st, key) => st.sections.reduce((n, s) => n + s[key], 0);
const dealt = (n, lo, hi, rand) => Math.min(n, lo + Math.floor(rand() * (hi - lo + 1)));

function deckFight({ boarders, crew, hand = LOCK, cover, grade = 0, assault = false, side = false }) {
  const names = side ? [...DECK.SECTIONS, 'cargo'] : DECK.SECTIONS;
  const sections = names.map((_, i) => ({ mine: 0, theirs: 0, cover: cover[i] || 0 }));
  const [atk, def] = assault ? ['mine', 'theirs'] : ['theirs', 'mine'];
  const n = assault ? boarders : crew, each = Math.floor(n / sections.length);
  sections[LOCK][atk] = assault ? crew : boarders;
  sections.forEach((s, i) => { s[def] = each + (i === LOCK ? n - each * sections.length : 0); });
  return { kind: 'deck', sections, hand, began: boarders, grade, assault, side, used: {}, turn: 0, log: [] };
}

// What her crew do this turn. Attackers push from their front into the next section where they outnumber the defenders, else hold; on a long ship with the
// corridor held they go round by the cargo bay. Defending (an assault), she pushes back toward the lock where she outnumbers us. A veteran may feint.
function boardMove(st, rand) {
  const S = st.sections, hold = from => ({ kind: 'hold', from, to: from, n: 0 });
  let m = hold(LOCK);
  if (st.assault) {
    for (let i = S.length - 1; i > LOCK && m.kind === 'hold'; i--) {
      if (S[i].theirs && S[BACK[i]].mine && S[i].theirs > S[BACK[i]].mine) m = { kind: 'push', from: i, to: BACK[i], n: S[i].theirs };
    }
  } else {
    const from = S.reduce((f, s, i) => (s.theirs && (f < 0 || REACH[i] >= REACH[f]) ? i : f), -1);
    const to = from === LOCK && st.side && S[CORRIDOR].mine && S[CARGO].mine < S[CORRIDOR].mine ? CARGO : FORWARD[from];
    m = from < 0 || from === BRIDGE || S[from].theirs <= S[to].mine ? hold(Math.max(from, 0)) : { kind: to === CARGO ? 'round' : 'push', from, to, n: S[from].theirs };
  }
  return { ...m, feint: st.grade > 0 && rand() < CUNNING * st.grade };
}

function resolveDeckTurn(state, { stand, act, order }, shown, rand) {
  const st = copyOf(state), S = st.sections, events = [];
  const near = (a, b) => a === b || FORWARD[a] === b || BACK[a] === b;
  if (stand !== undefined && S[stand] && near(st.hand, stand)) st.hand = stand;

  if (shown.kind !== 'hold') {  // a feint sends the heads somewhere else they can reach from where they stand, or nowhere
    let to = shown.to;
    if (shown.feint) {
      const other = [...new Set([FORWARD[shown.from], BACK[shown.from], shown.from, ...(st.side ? [CARGO] : [])])].filter(t => S[t] && t !== shown.to);
      to = other[Math.floor(rand() * other.length)];
    }
    if (to !== shown.from) {
      S[shown.from].theirs -= shown.n; S[to].theirs += shown.n;
      events.push({ kind: 'move', from: shown.from, to, n: shown.n });
    }
  }

  // The hand's act and the crew order: steady and cover go through abilityStep, once each for the order and the act. Cover is once a fight.
  const here = S[st.hand], extra = S.map(() => 0);
  let press = 0;
  for (const a of [typeof act === 'string' ? { kind: act } : act, order]) {
    if (!a || (a.kind !== 'steady' && a.kind !== 'cover') || (a.kind === 'cover' && st.used.cover)) continue;
    if (a.kind === 'cover') st.used.cover = true;
    const worked = rand() < a.odds;
    const r = abilityStep(a.kind, worked, { pos: st.hand, boarders: here.theirs, extra });
    here.theirs = r.boarders;
    r.extra.forEach((n, i) => { extra[i] = n; });
    if (r.press) press++;
    events.push({ kind: a.kind, worked });
  }
  S.forEach((s, i) => { s.cover = Math.min(COVER_MAX, s.cover + extra[i]); });

  // Each section where both stand trades heads; the defenders' high end is cut by the cover there. Pressed abilities add a roll against us.
  const hand = st.hand, contested = here.mine > 0 && here.theirs > 0;
  const [lo, hi] = DECK.CREW_HIT, defender = st.assault ? 'theirs' : 'mine';
  const loss = S.map((s, i) => {
    if (!s.mine || !s.theirs) return { mine: 0, theirs: 0 };
    const cut = Math.max(lo, hi - s.cover);
    return { mine: dealt(s.mine, lo, defender === 'mine' ? cut : hi, rand) + (i === hand ? press : 0), theirs: dealt(s.theirs, lo, defender === 'theirs' ? cut : hi, rand) };
  });
  if ((typeof act === 'string' ? act : act && act.kind) === 'shoot') loss[hand].theirs += dealt(here.theirs, ...DECK.SIDEARM, rand);
  S.forEach((s, i) => {
    s.mine = Math.max(0, s.mine - loss[i].mine); s.theirs = Math.max(0, s.theirs - loss[i].theirs);
    if (loss[i].mine || loss[i].theirs) events.push({ kind: 'exchange', section: i, mine: loss[i].mine, theirs: loss[i].theirs });
  });

  // A hand left in a section that is theirs alone falls back one toward our side, with the hurt roll for it.
  const back = st.assault ? BACK : FORWARD;
  const left = !here.mine && here.theirs && back[hand] !== hand;
  if (left) { st.hand = back[hand]; events.push({ kind: 'hand', back: true, from: hand, to: st.hand }); }
  if (contested || left) events.push({ kind: 'hurt', hurt: rand() < REPEL_HURT.lose * DECK.SUIT });
  st.turn++;
  return { state: st, events };
}

// Her crew is at or under a third of her start, or none; or (an assault) mine hold her bridge, or (repelling) hers hold ours. Our loss comes first.
function deckEnd(st) {
  const bridge = st.sections[BRIDGE];
  if (st.assault ? sum(st, 'mine') === 0 : bridge.theirs > 0 && bridge.mine === 0) return 'taken';
  if (sum(st, 'theirs') <= st.began * DECK.BREAK) return 'won';
  return st.assault && bridge.mine > 0 && bridge.theirs === 0 ? 'won' : null;
}
