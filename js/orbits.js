'use strict';

// Where everything is and how long a burn takes: orbit positions, the distance between two places on a day, the days and the
// reaction mass a burn costs (with the crew's perks), the best launch window, and whether a place is in range of a full tank.
// Pure but for G.state (the day, the flags) and the crew and ship it asks (roleSkill, ship), so it loads and runs without a
// browser: tests/orbits.test.js. Loaded after data.js and util.js, before game.js.

// Everything orbits the Sun at its real period (Kepler: years = au^1.5), so the
// distance between two places, and the burn, changes over the months. `angle` is
// where a location sits on day 0.
const orbitPeriod = id => 365.25 * Math.pow(SYSTEMS[id].au, 1.5);
function orbitPos(id, day = G.state.day) {
  const s = SYSTEMS[id], a = (s.angle + 360 * day / orbitPeriod(id)) * Math.PI / 180;
  return { x: Math.cos(a) * s.au, y: Math.sin(a) * s.au };
}

// Travel time and reaction mass grow with distance at departure, but less than
// linearly, so the outer planets stay reachable.
const distAU = (a, b, day) => dist(orbitPos(a, day), orbitPos(b, day));
// Crew perks: a pilot shortens burns, an engineer (and Rosa's drive tuning) saves mass.
const baseDays = (a, b, day) => Math.round(2 + 3 * Math.pow(distAU(a, b, day), 0.7));
const travelDays = (a, b, day) => Math.max(1, Math.round(baseDays(a, b, day) * (1 - 0.07 * roleSkill('pilot'))));
const burnFuel = (a, b, day) => Math.round((30 + 60 * Math.sqrt(distAU(a, b, day)))
  * (1 - 0.05 * roleSkill('engineer')) * (G.state.flags.rosaTuned ? 0.9 : 1));

// The shortest this burn gets over the next two years, and when.
function bestWindow(a, b) {
  let best = { days: travelDays(a, b), wait: 0 };
  for (let d = 5; d <= 730; d += 5) {
    const days = travelDays(a, b, G.state.day + d);
    if (days < best.days) best = { days, wait: d };
  }
  return best;
}
const inRange = (a, b) => a === b || burnFuel(a, b) <= ship().fuel;
