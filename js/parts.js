'use strict';

// Parts (#1135, docs/superpowers/specs/2026-11-13-parts-design.md): each of the ship's systems (wear.js SHIP_PARTS) has one fitted part, kept on
// the save as st.parts by system: { source, quirk, day }. A part comes from a yard (new and rated), used (off a ship broken up, later off a wreck,
// with a history and a quirk) or printed (from the fabricator, logged as temporary). Its source sets its price as a share of the yard's (today's
// overhaul, 80 cr a point), the condition it puts the system back to, and how fast the system wears after. A system with no entry has its
// original part, a yard one with no quirk, so a save from before wears as it did. Every function takes the state it reads. Loaded after wear.js.

const PART_SOURCES = {
  yard: { share: 1, restore: 100, wear: 1 },
  used: { share: 0.45, restore: 90, wear: 1 },
  printed: { share: 0.2, restore: 85, wear: 1.75 },
};
const PART_POINT = 80;  // the yard's price a point of condition (wear.js overhaulCost)

const partPrice = (cond, source) => Math.round((100 - cond) * PART_POINT * PART_SOURCES[source].share);
const fittedPart = (st, sys) => (st.parts && st.parts[sys]) || { source: 'yard', quirk: null, day: 0 };
function fitPart(st, sys, source, quirk, day) {
  st.parts = st.parts || {};
  st.parts[sys] = { source, quirk, day };
  const c = st.condition = st.condition || {};
  c[sys] = Math.max(c[sys] === undefined ? 100 : c[sys], PART_SOURCES[source].restore);
}
// How fast a system wears with its fitted part: the source's rate.
const partWear = (st, sys) => PART_SOURCES[fittedPart(st, sys).source].wear;
