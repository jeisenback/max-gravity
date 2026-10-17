'use strict';

// A stay in port: days the ship has to spend on the pad before she sails, each a night the hand can fill. The yard sets one while
// the hull is mended (repairs.js), and the captain sets one when nothing on the freight board is worth the fuel (no contract, or none
// that pays the ship WORTH_THE_FUEL a day, contracts.js): she waits RESUPPLY_WAIT days for a shipper, the board drawn again each
// morning, unless she is heading for a yard with your money in hand. After the wait she runs light to look for work elsewhere. While a stay is on,
// the dock's button passes a night instead of sailing (ui.js, and the T key): the day turns with its new-day events, the bar fills
// again (bar.js), and the port can bring something to the dock (happenings.js). The job board is the visit's, not the night's
// (jobs.js), so a stay is no second board. State on st.hired: stay { left, why }, and visit { planet, day }, the landing this is.
// Loaded after awayjobs.js; only calls into the game at runtime.

const RESUPPLY_WAIT = 3, WORTH_THE_FUEL = 2000;  // days she waits; the profit a day to the ship she sails for (set from the soak's plans, ROADMAP.md)
const STAY_WHY = { yard: 'the hull is in the yard', market: 'the captain is waiting for a market worth the fuel' };

const stayOf = h => (h && h.stay && h.stay.left > 0 ? h.stay : null);
// The visit this is: the landing's planet and day, so what is once a visit stays once through the nights.
const visitKey = st => `${st.planet}@${st.hired && st.hired.visit && st.hired.visit.planet === st.planet ? st.hired.visit.day : st.day}`;
// A longer stay takes over a shorter one; a stay never shortens another.
function beginStay(h, days, why) { if (days > 0 && days > (stayOf(h) ? h.stay.left : 0)) h.stay = { left: days, why }; }
// Whether the captain waits here for a shipper: a port that trades, no contract worth the fuel, no yard to head for, and not the port she signed
// the hand on at (the first run sails whatever the board, so the opening is not a wait).
const marketWait = (h, planet, plan) => (h.runsDone || 0) > 0 && planet.services.includes('trade') && (!plan || plan.ballast || plan.profit / Math.max(1, plan.days) < WORTH_THE_FUEL) && !wantsYard();
const nightLabel = s => `Pass the night (${STAY_WHY[s.why] || s.why}, ${s.left} more day${s.left === 1 ? '' : 's'})`;

// One night of a stay: the day turns, the stay shortens, and the port is new again.
function passNight() {
  const st = G.state, h = hired(), stay = stayOf(h);
  if (!stay || G.mode !== 'landed' || G.dialog) return false;
  st.day++; Mods.emit('newDay', st.day);
  stay.left--;
  if (!stay.left) delete h.stay;
  const planet = currentPlanet();
  fillBar(planet);
  const ev = pickHappening('port', planet);
  if (ev) openEvent(ev);
  return true;
}

Mods.register({
  id: 'stay', name: 'A stay in port', builtin: true,
  init(M) {
    M.on('landed', planet => {
      const h = hired();
      if (!h) return;
      h.visit = { planet: planet.name, day: G.state.day };
      if (!marketWait(h, planet, currentPlan())) return;
      beginStay(h, RESUPPLY_WAIT, 'market');
      M.note(`Nothing on the board is worth the fuel. Captain ${hiredCaptain().last} is waiting ${RESUPPLY_WAIT} days for a shipper, and the ship stays on the pad.`);
    });
    M.action('night', () => passNight());
  },
});
