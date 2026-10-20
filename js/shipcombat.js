'use strict';

// Ship against ship (fight.js, fightui.js): who she is. Pirates are not all the same: some crews are veterans (a longer hull and a harder punch,
// GRADE_HULL and GRADE_PUNCH, which the fight engine reads), and on dangerous lanes raiders hunt in pairs. And who comes over the side when she
// boards (boarders.js). Loaded after engagements.js; only called into at runtime.

const GRADE_HULL = 0.3, GRADE_PUNCH = 0.15;
const GRADE_TEXT = ['', 'Her crew have done this before.', 'She is flown by a hard crew, with a captain who has done it for years.'];

const laneDanger = () => { const st = G.state; return G.transit ? Math.max(danger(G.transit.to), danger(st.systemId)) : danger(st.systemId); };

// How the foe stands: a grade (0 to 2) for a pirate, by the lane's danger, and a pack of raiders on a bad lane, which starts the fight a volley behind.
function rateFoe(s) {
  s.grade = 0; s.pack = false;
  if (s.spec.kind !== 'pirate') return s;
  const d = laneDanger(), r = Math.random();
  s.grade = r < Math.min(0.3, 0.05 + 0.6 * d) ? 2 : r < Math.min(0.6, 0.2 + d) ? 1 : 0;
  s.pack = s.foe.shipId === 'raider' && d > 0.12 && Math.random() < 0.15 + d;
  if (s.pack) s.edge -= 1;
  return s;
}
const foeFlavor = s => `${GRADE_TEXT[s.grade] || ''}${s.pack ? ' There are two of them, running in company.' : ''}`.trim();

// ---------- boarding and repelling (boarders.js) ----------
// How many come over the side: her ship's crew, one more or one fewer by how she came alongside, more for a veteran crew and a pair.
// What they try: a raider's boarders lean on the rush, a corsair's hold the line, and a veteran crew is sometimes ready for exactly
// the tactic you chose. And the ship you fight in: a long one has room to go round them and little for a rush; a cramped one the
// other way about.
const BOARDER_LEAN = { raider: { rush: 0.38, hold: 0.3, flank: 0.32 }, corsair: { hold: 0.38, rush: 0.3, flank: 0.32 } };
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
