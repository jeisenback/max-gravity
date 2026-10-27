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
  if (s.spec.grade !== undefined) s.grade = s.spec.grade;  // a ladder fight (fightladder.js) says how she is rated
  if (s.spec.pack !== undefined) s.pack = s.spec.pack;
  if (s.pack) s.edge -= 1;
  return s;
}
const foeFlavor = s => `${GRADE_TEXT[s.grade] || ''}${s.pack ? ' There are two of them, running in company.' : ''}`.trim();

// ---------- boarding and repelling (boarders.js) ----------
// How many come over the side: her ship's crew, DECK.FULL more when she came fully alongside (a pair DECK.FULL_PAIR; boarding her, DECK.ASSAULT.FULL more aboard her; a corsair DECK.CORSAIR_LESS fewer, so boarding her and in the duel's full run), two more a
// grade of a veteran crew, and two more for a pair. A veteran crew's shown move may be a feint (fight.js boardMove), at CUNNING a grade.
const CUNNING = 0.25;  // a veteran's chance, per grade, of a feint
// The counts are tuned with the deck's numbers so that the deck answer wins and random play kills about as many by grade as before the parties (COMBAT.md, the deck fight).
const boardersFor = (foe, outcome, rate = {}) => Math.max(1, (FOE_CREW[foe.shipId] || 3) + (outcome === 'full' ? (rate.assault ? DECK.ASSAULT.FULL : rate.pack ? DECK.FULL_PAIR : DECK.FULL) - (DECK_PARTY[foe.shipId] === 'corsair' ? DECK.CORSAIR_LESS : 0) : 0) + 2 * (rate.grade || 0) + (rate.pack ? 2 : 0));
