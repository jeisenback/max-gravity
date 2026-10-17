'use strict';

// What the captain knows of prices away from here. She sees the market she is docked at. For the port at the other end of a run
// she plans on word of it (a rumor still current, which the hand may have heard at the bar: the usual price there, moved as the
// rumor says), else on the prices she saw there herself when she last sailed from it, else on what a port of that kind usually
// pays (the base price at the port's level, data.js). The sale at the far end is at the real price, so a run can clear more or
// less than she planned. State: st.hired.seen[planet] = { day, prices }, written when she sails (hired.js). Pure: each function
// takes the state it reads. Loaded after market.js.

const usualPrice = (planet, cid) => (planet.prices && planet.prices[cid] ? Math.round(COMMODITIES.find(c => c.id === cid).base * PRICE_MULT[planet.prices[cid]]) : null);
const currentRumor = (st, planet, cid) => st.rumors.find(r => r.planet === planet.name && r.cid === cid && r.until >= st.day) || null;
// What the price she plans on rests on: { kind: 'here' | 'rumor' | 'seen' | 'usual', days (seen: how old the sighting is) }.
function priceBasis(st, planet, cid, here) {
  if (here) return { kind: 'here' };
  if (currentRumor(st, planet, cid)) return { kind: 'rumor' };
  const seen = st.hired && st.hired.seen && st.hired.seen[planet.name];
  if (seen && seen.prices[cid] !== undefined) return { kind: 'seen', days: st.day - seen.day };
  return { kind: 'usual' };
}
function knownPrice(st, planet, cid, here) {
  if (!planet.prices || !planet.prices[cid]) return null;
  const b = priceBasis(st, planet, cid, here);
  if (b.kind === 'here') return price(planet, cid);
  if (b.kind === 'rumor') return Math.round(usualPrice(planet, cid) * currentRumor(st, planet, cid).mult);
  if (b.kind === 'seen') return st.hired.seen[planet.name].prices[cid];
  return usualPrice(planet, cid);
}
// The prices here as she leaves: what she plans on next time.
function recordPrices(h, planet, day) { (h.seen = h.seen || {})[planet.name] = { day, prices: Object.fromEntries(Object.keys(planet.prices || {}).map(cid => [cid, price(planet, cid)])) }; }
const basisText = (b, planet) => (b.kind === 'rumor' ? `word of the market at ${planet}` : b.kind === 'seen' ? `the prices she saw at ${planet} ${b.days === 0 ? 'today' : b.days === 1 ? 'a day ago' : `${b.days} days ago`}`
  : b.kind === 'usual' ? `what ${planet} usually pays` : '');
