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

// ---------- the hand's own station (Task 6 fills the table) ----------
// Parts a hand fits to their post's station from their own savings, by post: { id, name, desc, price, effect } with effect of the quirks' kinds
// (fight, edge, wear by system). Kept on the hand's record as h.station, a list of { id, source, quirk }, and carried into chapter two (sheet.js careerOf).
const STATION_PARTS = {};
const stationPart = (post, id) => (STATION_PARTS[post] || []).find(p => p.id === id) || null;
// The effects of the hand's fitted station parts and their quirks, for a post: each part's own effect and, if it was used, its quirk's plus and minus.
const stationEffects = h => (h && h.station || []).flatMap(f => { const p = stationPart(h.post, f.id); return [...(p ? [p.effect] : []), ...(f.quirk ? [f.quirk.plus, f.quirk.minus] : [])]; });
function stationFight(h) {
  const out = { dmgMult: 1, shields: 1 };
  for (const e of stationEffects(h)) if (e.fight) for (const k of Object.keys(out)) if (e.fight[k]) out[k] *= e.fight[k];
  return out;
}

// ---------- the repair in port: Hester's part, the hand's say (Task 4) ----------
// On landing at a port with an outfitter, the worst system under REPAIR_BELOW is put up for repair, once a stay (h.partsAt, the day it was offered),
// when the fund can pay at least the printed part, in chapter one (repairs.js offers it after the hull repair: one yard scene a landing). The captain's
// pick is a fixed score from her card, no dice: thrift weighs a part's price against what the fund holds, nerve the risk of a used or printed one.
// The words are the lines of 'scene:parts' (hiredscenes.js).
const REPAIR_BELOW = 75, PART_RISK = { yard: 0, used: 1, printed: 2 }, PART_POST = { fire: 'gunner' };  // the post that works a system: the gunner the guns' fire control, the engineer the rest
const partPost = sys => PART_POST[sys] || 'engineer';
function partsRepairDue(st, h, planet) {
  if (!h || (h.chapter || 1) > 1 || h.partsAt === st.day || !(planet.services || []).includes('outfitter')) return null;
  const c = st.condition || {}, worst = Object.keys(c).filter(k => c[k] < REPAIR_BELOW).sort((a, b) => c[a] - c[b])[0];
  return worst && (h.fund || 0) >= partPrice(c[worst], 'printed') ? worst : null;
}
// What the yard has for a system: a yard part, the used one if the port has one that day (usedPartAt), and a printed one.
function partsOffers(st, planet, sys, day) {
  const cond = st.condition[sys], used = usedPartAt(planet, day, sys);
  return [{ source: 'yard', quirk: null }, ...(used ? [{ source: 'used', quirk: used }] : []), { source: 'printed', quirk: null }].map(o => ({ ...o, price: partPrice(cond, o.source) }));
}
function captainPartPick(card, offers, fund) {
  const score = o => -(o.price / Math.max(1, fund)) * card.thrift * 4 - PART_RISK[o.source] * (6 - card.nerve) * 0.15;
  return offers.reduce((best, o, i) => (score(o) > score(offers[best]) ? i : best), 0);
}
// A quirk in a few words: its plus, but its minus (the lines eff.<kind>.up and eff.<kind>.down).
function quirkWords(say, q) {
  const one = e => { const [kind, v] = Object.entries(e)[0], n = typeof v === 'number' ? v : Object.values(v)[0], key = kind === 'fight' ? Object.keys(v)[0] : kind;
    return say(`eff.${key}.${(kind === 'wear' ? n < 1 : n > 0 && (kind === 'edge' || n > 1)) ? 'good' : 'bad'}`); };
  return say('quirk', { plus: one(q.plus), minus: one(q.minus) });
}
function partsEvent(planet, sys) {
  const st = G.state, h = hired(), cap = hiredCaptain(), say = (key, vars) => sceneSay('scene:parts', key, vars), name = SHIP_PARTS[sys].name;
  const offers = partsOffers(st, planet, sys, st.day), pick = captainPartPick(cap.captain, offers, h.fund), crew = (roleHolder('engineer') || roleHolder('xo') || cap).first;
  const offerLine = o => say(`offer.${o.source}`, { price: fmt(o.price), from: o.quirk ? o.quirk.from : '', quirk: o.quirk ? quirkWords(say, o.quirk) : '' });
  const fit = (i, argued) => {
    const o = offers[i], before = h.partsArgued;
    if (before && before.sys === sys) { like(cap, before.broke ? -1 : 1, say(before.broke ? 'memory.broke' : 'memory.held', { part: name.toLowerCase() })); delete h.partsArgued; }
    if (argued) h.partsArgued = { sys, day: st.day };
    fitPart(st, sys, o.source, o.quirk, st.day);
    h.fund = Math.max(0, h.fund - o.price); h.bill = (h.bill || 0) + o.price;
    let help = '';
    if (h.post === partPost(sys)) { const ok = Math.random() < handCheck('hands', skillLevel(h.post), 'post'); if (ok) st.condition[sys] = Math.min(100, st.condition[sys] + 2); help = ' ' + say(ok ? 'help.win' : 'help.lose', { crew }); }
    return say('fitted', { name: name.toLowerCase(), pct: Math.round(st.condition[sys]), price: fmt(o.price), pick: say(`pick.${o.source}`) }) + help;
  };
  const choices = [{ label: say('quiet.label'), run: () => `${say('quiet.result', { captain: cap.first, pick: say(`pick.${offers[pick].source}`) })} ${fit(pick, false)}` }];
  offers.forEach((o, i) => { if (i !== pick) choices.push({ label: say('argue.label', { pick: say(`pick.${o.source}`) }), run() {
    const won = Math.random() < handCheck('wit', 0, 'word');
    return `${say(won ? 'argue.win' : 'argue.lose', { captain: cap.first, pick: say(`pick.${o.source}`), hers: say(`pick.${offers[pick].source}`) })} ${fit(won ? i : pick, won)}`;
  } }); });
  return { title: say('title', { part: name.replace(/\b\w/g, ch => ch.toUpperCase()) }), parts: sys, personal: true,
    text: say('text', { crew, name: name.toLowerCase(), pct: Math.round(st.condition[sys]), offers: offers.map(offerLine).join(' '), fund: fmt(h.fund), captain: cap.first, pick: say(`pick.${offers[pick].source}`) }), choices };
}
