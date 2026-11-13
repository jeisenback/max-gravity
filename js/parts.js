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
// How fast a system wears with its fitted part: the source's rate, times its quirk's (partEffect, below).
const partWear = (st, sys) => PART_SOURCES[fittedPart(st, sys).source].wear * partEffect(st, sys, 'wear');

// ---------- used parts: where each came from, and its quirk (Task 2) ----------
// A used part's history: the system it fits, where it came from (a line in the voice), and one quirk, a plus and a minus, each one effect of a kind
// the wear, the fight and the checks read: { wear: k } (how fast its system wears), { perf: k } (its system's performance, capped at PERF_CAP),
// { fight: { dmgMult: k } | { shields: k } } (the hand's ship in a fight), { edge: { <check kind>: n } } (the hand's checks, sheet.js DIFFICULTY).
const PART_QUIRKS = [
  { id: 'ore-tug-coil', system: 'drive', from: 'a drive coil off a Ganymede ore tug, rewound twice', plus: { wear: 0.8 }, minus: { perf: 0.95 } },
  { id: 'hot-injector', system: 'drive', from: 'an injector rail from a scrapped courier, tuned to run hot', plus: { perf: 1.05 }, minus: { wear: 1.3 } },
  { id: 'hauler-manifold', system: 'drive', from: 'a coolant manifold off a Ceres water hauler, its seals already replaced once', plus: { wear: 0.9 }, minus: { perf: 0.97 } },
  { id: 'cutter-feed', system: 'fire', from: 'a feed off a Compact patrol cutter, faster than it needs to be', plus: { fight: { dmgMult: 1.06 } }, minus: { wear: 1.25 } },
  { id: 'raider-board', system: 'fire', from: 'a fire-control board from a Rook raider, the old tallies still scratched on the case', plus: { edge: { post: 0.05 } }, minus: { perf: 0.95 } },
  { id: 'escort-mount', system: 'fire', from: 'a gun mount out of a decommissioned escort, stiff in the cold', plus: { wear: 0.85 }, minus: { fight: { dmgMult: 0.96 } } },
  { id: 'picket-bank', system: 'shields', from: 'a capacitor bank off a Fleet picket, rated for a hull twice this size', plus: { fight: { shields: 1.08 } }, minus: { wear: 1.25 } },
  { id: 'taped-emitter', system: 'shields', from: 'a field emitter out of the Boneyard, wrapped in somebody else\'s tape', plus: { wear: 0.85 }, minus: { fight: { shields: 0.95 } } },
  { id: 'yacht-regulator', system: 'shields', from: 'a regulator from a yacht that never saw a fight', plus: { perf: 1.05 }, minus: { fight: { shields: 0.96 } } },
  { id: 'hospital-stack', system: 'life', from: 'a scrubber stack out of a hospital ship, quieter than the old one', plus: { wear: 0.8 }, minus: { perf: 0.96 } },
  { id: 'grower-plant', system: 'life', from: 'an air plant from a Juno grower\'s barge, still smelling faintly of soil', plus: { perf: 1.05 }, minus: { wear: 1.2 } },
  { id: 'camp-reclaimer', system: 'life', from: 'a water reclaimer off a mining camp, its filters labelled in a Hollows hand', plus: { wear: 0.9 }, minus: { perf: 0.97 } },
  { id: 'survey-array', system: 'sensors', from: 'a scope array off a survey ship, still calibrated for rocks', plus: { edge: { solo: 0.04 } }, minus: { wear: 1.2 } },
  { id: 'pirate-head', system: 'sensors', from: 'a sensor head from a pirate\'s boat, half its labels scraped off', plus: { perf: 1.05 }, minus: { wear: 1.25 } },
  { id: 'trainer-ranger', system: 'sensors', from: 'a ranging unit out of a Fleet trainer, slow to warm up', plus: { wear: 0.85 }, minus: { perf: 0.95 } },
];
const PERF_CAP = 1.05, USED_ALWAYS = ['Boneyard', 'Phobos Yards'];  // a quirk never takes a system past this; the ports that always have used parts

// The used part a port has for a system on a day, or null: at a port with an outfitter on about half the days, at the Boneyard and Phobos Yards on
// every one, by the port's name and the day (hash, no dice of the game's), so a port offers the same part for the length of a stay.
function usedPartAt(planet, day, sys) {
  if (!planet || !(planet.services || []).includes('outfitter')) return null;
  if (!USED_ALWAYS.includes(planet.name) && Math.abs(hash(`used|${planet.name}|${day}`)) % 2) return null;
  const list = PART_QUIRKS.filter(q => q.system === sys);
  return list.length ? list[Math.abs(hash(`used|${planet.name}|${day}|${sys}`)) % list.length] : null;
}

// A fitted part's quirk, by system: its factor of a kind (wear, perf), 1 with none; the fight numbers of all the fitted parts; their edge on a kind of check.
function partEffect(st, sys, kind) {
  const q = fittedPart(st, sys).quirk;
  return q ? [q.plus, q.minus].reduce((k, e) => (typeof e[kind] === 'number' ? k * e[kind] : k), 1) : 1;
}
const fittedQuirks = st => Object.values(st.parts || {}).map(p => p.quirk).filter(Boolean);
function partFight(st) {
  const out = { dmgMult: 1, shields: 1 };
  for (const q of fittedQuirks(st)) for (const e of [q.plus, q.minus]) if (e.fight) for (const k of Object.keys(out)) if (e.fight[k]) out[k] *= e.fight[k];
  return out;
}
const partEdge = (st, kind) => fittedQuirks(st).reduce((n, q) => n + [q.plus, q.minus].reduce((m, e) => m + ((e.edge && e.edge[kind]) || 0), 0), 0);
