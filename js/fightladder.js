'use strict';

// The ladder of chapter 1's fights (#810): a hired hand meets the ship types in a teaching order, and the random contacts after draw only
// from the types already met. Each step is one scripted contact, due on a burn when its condition holds and marked done in h.fights when its
// fight starts (startShipFight), or, for the cutter, when the ship heaves to. A scene shown and run from leaves it due. Pure: the hand's record and the burn come in as parameters. Loaded after engage.js; only called into at runtime.

const LADDER_RANDOM = 0.5;  // a hand's random pirate contacts come at this share of the rate engage.js gives them, and only once a type is met
const ladderGov = (st, to) => [SYSTEMS[st.systemId].gov, SYSTEMS[to].gov].find(g => PATROL_NAMES[g]);  // the system the burn leaves, then the one it goes to
const FIGHT_LADDER = [
  { id: 'raider', spec: { kind: 'pirate', shipId: 'raider', grade: 0, pack: false }, due: h => runTotals(h).runs >= 1 },
  { id: 'corsair', spec: { kind: 'pirate', shipId: 'corsair', grade: 0, pack: false }, due: h => runTotals(h).runs >= 3 },
  { id: 'cutter', spec: { kind: 'patrol', shipId: 'cutter' }, gov: ladderGov, due: (h, st, to) => captainBeatsDone(h) && !!ladderGov(st, to) },
  { id: 'pair', parked: true, spec: { kind: 'pirate', shipId: 'raider', pack: true }, due: h => !!h.deal },  // the lock lesson: not in chapter one, it waits for chapter two, the owner's (the owner, 2026-10-28); its fight and lines stay
  { id: 'setpiece', spec: { kind: 'pirate', shipId: 'corsair', grade: 2 }, due: (h, st) => !!h.deal && st.day <= h.deal.until && st.credits >= h.deal.price },  // wantsYard() with the deal open
];

// The first step not done, when its condition holds on this burn (from st.systemId to `to`), with its spec as the fight takes it; else null. A
// later step never comes ahead of an earlier one that is not done. A parked step is passed over.
function ladderNext(h, st, to) {
  if (!h) return null;
  const done = (h.fights || { done: [] }).done, step = FIGHT_LADDER.find(s => !s.parked && !done.includes(s.id));
  return step && step.due(h, st, to) ? { id: step.id, spec: { ...step.spec, ...(step.gov ? { gov: step.gov(st, to) } : {}), ladder: step.id } } : null;
}
function ladderDone(h, id) {
  h.fights = h.fights || { done: [] };  // an old save has none
  if (!h.fights.done.includes(id)) h.fights.done.push(id);
}
// The ship ids met, once each, in the order of the steps.
const ladderMet = h => FIGHT_LADDER.filter(s => ((h && h.fights) || { done: [] }).done.includes(s.id)).map(s => s.spec.shipId).filter((id, i, a) => a.indexOf(id) === i);
// A random pirate's pack: false (one ship) until the ladder's pair has been met, so no pair comes before it; after, undefined lets the lane roll it. With the pair
// parked, a hand meets none; an older save that met it still rolls them.
const ladderPack = h => (((h && h.fights) || { done: [] }).done.includes('pair') ? undefined : false);
// A pirate ship for a random contact: one of the pirate types met (the cutter is met only as a patrol), picked by r in [0, 1); null if none yet.
function ladderPirate(h, r) {
  const met = ladderMet(h).filter(id => id !== 'cutter');
  return met.length ? met[Math.floor(r * met.length)] : null;
}
