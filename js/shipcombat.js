'use strict';

// Ship against ship in an authored raid (engagements.js). The odds of each choice start from the choice and the post, and are then
// moved by the two ships: how well yours turns and burns against hers (an evasive burn, turning into her, a pilot's call), how
// many guns each has (a warning round, return fire, a gunner's call), and how much each can take (point defense, holding course,
// an engineer's call). A slow hauler against a raider has the worst of the first and the best of the last. Pirates are not all the
// same: some crews are veterans (tougher, and harder on your odds), and on dangerous lanes raiders hunt in pairs. Loaded after
// engagements.js; only called into at runtime.

const SHIP_EDGE = 0.1, SHIP_EDGE_MAX = 0.2, GRADE_ODDS = 0.04, GRADE_HULL = 0.3, GRADE_PUNCH = 0.15, PACK_PUNCH = 1.25;
const CHOICE_EDGE = { warn: 'gun', fire: 'gun', burn: 'mob', turn: 'mob', screen: 'tough', hold: null };
const POST_EDGE = { pilot: 'mob', gunner: 'gun', engineer: 'tough', comms: null };
const GRADE_TEXT = ['', 'Her crew have done this before.', 'She is flown by a hard crew, with a captain who has done it for years.'];

const laneDanger = () => { const st = G.state; return G.transit ? Math.max(danger(G.transit.to), danger(st.systemId)) : danger(st.systemId); };

// How the foe stands: a grade (0 to 2) for a pirate, by the lane's danger, and a pack of raiders on a bad lane.
function rateFoe(s) {
  s.grade = 0; s.pack = false;
  if (s.spec.kind !== 'pirate') return s;
  const d = laneDanger(), r = Math.random();
  s.grade = r < Math.min(0.3, 0.05 + 0.6 * d) ? 2 : r < Math.min(0.6, 0.2 + d) ? 1 : 0;
  s.pack = s.foe.shipId === 'raider' && d > 0.12 && Math.random() < 0.15 + d;
  s.foe.armor = s.foe.maxArmor = Math.round(s.foe.maxArmor * (1 + GRADE_HULL * s.grade));
  if (s.pack) s.edge -= 1;
  return s;
}
const foeFlavor = s => `${GRADE_TEXT[s.grade] || ''}${s.pack ? ' There are two of them, running in company.' : ''}`.trim();

// Ratios of mine to hers, above one in my favor.
function raidProfile(s) {
  const me = SHIPS[G.state.shipId], foe = SHIPS[s.foe.shipId], g = s.grade || 0;
  return {
    mob: (me.accel * me.turn) / (foe.accel * foe.turn),
    gun: (me.guns * (1 + 0.12 * roleSkill('gunner'))) / (foe.guns * (1 + GRADE_PUNCH * g) * (s.pack ? 2 : 1)),
    tough: (me.armor + me.shields) / ((foe.armor + foe.shields) * (1 + GRADE_HULL * g) * (s.pack ? 1.5 : 1)),
  };
}
const edgeOf = ratio => Math.max(-SHIP_EDGE_MAX, Math.min(SHIP_EDGE_MAX, SHIP_EDGE * Math.log2(ratio)));
// The odds of a choice once the ships and her crew are counted. A choice that cannot fail is left alone.
function shipOdds(s, id, post, odds) {
  if (odds >= 1) return odds;
  const kind = post ? POST_EDGE[post] : CHOICE_EDGE[id], p = raidProfile(s);
  return Math.max(0.05, Math.min(0.95, odds + (kind ? edgeOf(p[kind]) : 0) - GRADE_ODDS * (s.grade || 0)));
}
// What a lost beat costs the hull: more from a gun-heavy ship, a veteran crew and a pair.
const foePunch = s => (0.8 + 0.2 * SHIPS[s.foe.shipId].guns) * (1 + GRADE_PUNCH * (s.grade || 0)) * (s.pack ? PACK_PUNCH : 1);

// A line for the scene: what you can tell of her against you.
function raidRead(s) {
  const p = raidProfile(s), bits = [];
  if (p.mob < 0.6) bits.push('She is a good deal faster than you, and turns better.'); else if (p.mob > 1.4) bits.push('You are faster than she is.');
  if (p.gun < 0.7) bits.push('She has the guns on you.'); else if (p.gun > 1.4) bits.push('You have the guns on her.');
  if (p.tough > 1.5) bits.push('You can take a good deal more than she can.'); else if (p.tough < 0.7) bits.push('She can take more than you can.');
  return bits.length ? bits.join(' ') : 'You are about evenly matched.';
}

// ---------- boarding and repelling (boarders.js) ----------
// How many come over the side: her ship's crew, one more or one fewer by how she came alongside, more for a veteran crew and a pair.
// What they try: a raider's boarders lean on the rush, a corsair's hold the line, and a veteran crew is sometimes ready for exactly
// the tactic you chose. And the ship you fight in: a long one has room to go round them and little for a rush; a cramped one the
// other way about.
const BOARDER_LEAN = { raider: { rush: 0.5, hold: 0.2, flank: 0.3 }, corsair: { hold: 0.45, rush: 0.25, flank: 0.3 } };
const CUNNING = 0.25;  // a veteran's chance, per grade, of countering your tactic outright
const boardersFor = (foe, outcome, rate = {}) => Math.max(1, (FOE_CREW[foe.shipId] || 3) + (outcome === 'full' ? 1 : -1) + Math.round(0.6 * (rate.grade || 0)) + (rate.pack ? 2 : 0));
const foeLean = s => BOARDER_LEAN[s.d.foe.shipId] || REPEL_LEAN[s.d.foe.kind] || { rush: 0.34, hold: 0.33, flank: 0.33 };
const counterOf = (tactics, kind) => Object.keys(tactics).find(t => tactics[t].beats === kind);
const layoutEdge = kind => {
  const size = SHIPS[G.state.shipId].size;
  if (kind === 'flank') return size >= 16 ? 0.15 : size <= 11 ? -0.15 : 0;
  if (kind === 'rush') return size <= 11 ? 0.15 : size >= 16 ? -0.1 : 0;
  return 0;
};
const layoutHint = () => { const size = SHIPS[G.state.shipId].size; return size >= 16 ? 'Your ship is long, with room to go round and little room for a rush.' : size <= 11 ? 'Your ship is cramped, with no room to go round and no room to give.' : ''; };
