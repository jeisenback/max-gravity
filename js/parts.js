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
const partWear = (st, sys) => PART_SOURCES[fittedPart(st, sys).source].wear * partEffect(st, sys, 'wear') * (st.hired ? stationWear(st.hired, sys) : 1);  // and the hand's station parts (below)

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
const quirkFactor = (q, kind) => [q.plus, q.minus].reduce((k, e) => (typeof e[kind] === 'number' ? k * e[kind] : k), 1);
function partEffect(st, sys, kind) {
  const q = fittedPart(st, sys).quirk;
  return q ? quirkFactor(q, kind) : 1;
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
const STATION_PARTS = {
  gunner: [
    { id: 'gunsight', name: 'A gunsight off a patrol boat', desc: 'Your own move in a fight lands more often.', price: 4000, used: true, effect: { edge: { post: 0.05 } } },
    { id: 'feed', name: 'A rebuilt feed', desc: 'The guns hit harder; fire control wears faster.', price: 5000, used: true, effect: { fight: { dmgMult: 1.08 }, wear: { fire: 1.2 } } },
    { id: 'liner', name: 'A cooled barrel liner', desc: 'The guns hit a little harder, and fire control wears slower.', price: 6000, used: true, effect: { fight: { dmgMult: 1.05 }, wear: { fire: 0.9 } } },
    { id: 'harness', name: 'A harness and grips', desc: 'A bold call of your own lands more often.', price: 2000, effect: { edge: { solo: 0.05 } } },
  ],
};
const STATION_SLOTS = 2, STATION_REFUND = 1 / 3, STATION_USED = 0.5;  // the parts a station takes; what a replaced one sells back for; a used one's share of the price (fire-control parts only, `used`, their quirk a fire-control part's)
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
function partsRepairDue(st, h, planet, fund) {  // fund: what the ship's money holds (boarders.js purse)
  if (!h || (h.chapter || 1) > 1 || h.partsAt === st.day || !(planet.services || []).includes('outfitter')) return null;
  const c = st.condition || {}, worst = Object.keys(c).filter(k => c[k] < REPAIR_BELOW).sort((a, b) => c[a] - c[b])[0];
  return worst && fund >= partPrice(c[worst], 'printed') ? worst : null;
}
// What the yard has for a system: a yard part, the used one if the port has one that day (usedPartAt), and a printed one.
function partsOffers(st, planet, sys, day) {
  const cond = st.condition[sys], used = usedPartAt(planet, day, sys);
  return [{ source: 'yard', quirk: null }, ...(used ? [{ source: 'used', quirk: used }] : []), { source: 'printed', quirk: null }]
    .filter(o => o.source === 'yard' || PART_SOURCES[o.source].restore > cond)  // never one that would leave the system worse than it is
    .map(o => ({ ...o, price: partPrice(cond, o.source) }));
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
// A used part's catch in words, for an offer (the scene's eff lines): its plus, but its minus.
const usedWords = q => quirkWords((key, vars) => sceneSay('scene:parts', key, vars), q);
function partsEvent(planet, sys) {
  const st = G.state, h = hired(), cap = hiredCaptain(), say = (key, vars) => sceneSay('scene:parts', key, vars), name = SHIP_PARTS[sys].name;
  const offers = partsOffers(st, planet, sys, st.day), pick = captainPartPick(cap.captain, offers, purse()), crew = (roleHolder('engineer') || roleHolder('xo') || cap).first;
  const offerLine = o => say(`offer.${o.source}`, { price: fmt(o.price), from: o.quirk ? o.quirk.from : '', quirk: o.quirk ? quirkWords(say, o.quirk) : '' });
  const fit = (i, argued) => {
    const o = offers[i], before = h.partsArgued;
    if (before && before.sys === sys) { like(cap, before.broke ? -1 : 1, say(before.broke ? 'memory.broke' : 'memory.held', { part: name.toLowerCase() })); delete h.partsArgued; }
    if (argued) h.partsArgued = { sys, day: st.day };
    fitPart(st, sys, o.source, o.quirk, st.day);
    moveMoney(-Math.min(purse(), o.price)); h.bill = (h.bill || 0) + o.price;  // the ship's money (boarders.js, #905)
    let help = '';
    if (h.post === partPost(sys)) { const ok = Math.random() < handCheck('hands', skillLevel(h.post), 'post'); if (ok) st.condition[sys] = Math.min(100, st.condition[sys] + 2); help = ' ' + say(ok ? 'help.win' : 'help.lose', { crew }); }
    return say('fitted', { name: name.toLowerCase(), pct: Math.round(st.condition[sys]), price: fmt(o.price), pick: say(`pick.${o.source}`) }) + help;
  };
  const choices = [{ label: say('quiet.label'), run: () => `${say('quiet.result', { captain: cap.first, pick: say(`pick.${offers[pick].source}`) })} ${fit(pick, false)}` }];
  offers.forEach((o, i) => { if (i !== pick) choices.push({ label: say('argue.label', { pick: say(`pick.${o.source}`) }), run() {
    const won = Math.random() < handCheck('wit', 0, 'word');
    like(cap, 0, say(won ? 'memory.argued.won' : 'memory.argued.lost', { part: name.toLowerCase(), pick: say(`pick.${o.source}`) }));  // she remembers the say either way (the regard comes at the next repair)
    return `${say(won ? 'argue.win' : 'argue.lose', { captain: cap.first, pick: say(`pick.${o.source}`), hers: say(`pick.${offers[pick].source}`) })} ${fit(won ? i : pick, won)}`;
  } }); });
  return { title: say('title', { part: name.replace(/\b\w/g, ch => ch.toUpperCase()) }), parts: sys, personal: true,
    text: say('text', { crew, name: name.toLowerCase(), pct: Math.round(st.condition[sys]), offers: offers.map(offerLine).join(' '), fund: fmt(purse()), captain: cap.first, pick: say(`pick.${offers[pick].source}`) }), choices };
}

// What the hand's station adds to a check's edge, and to how fast a system wears (a station part's wear is by system).
const stationEdge = (h, kind) => stationEffects(h).reduce((n, e) => n + ((e.edge && e.edge[kind]) || 0), 0);
// A part's own wear is by system; a used part's quirk is a fire-control part's, so its wear and perf are fire control's (its plus and its minus).
const stationWear = (h, sys) => (h && h.station || []).reduce((k, f) => { const p = stationPart(h.post, f.id), w = p && p.effect.wear; return k * ((w && w[sys]) || 1) * (f.quirk && f.quirk.system === sys ? quirkFactor(f.quirk, 'wear') : 1); }, 1);
const stationPerf = (h, sys) => (h && h.station || []).reduce((k, f) => k * (f.quirk && f.quirk.system === sys ? quirkFactor(f.quirk, 'perf') : 1), 1);
const stationPrice = (part, source) => Math.round(part.price * (source === 'used' ? STATION_USED : 1));
// The captain's leave to fit a part to the hand's station: asked the first time; she gives it to a hand she thinks well of or if she is bold, and once given
// it stands (h.stationLeave). With no captain person (the hand's own bridge, chapter two) there is nobody to ask.
const stationLeave = (h, cap) => !cap || !!h.stationLeave || (cap.opinion || 0) >= 1 || (cap.captain || {}).nerve >= 3;
// A part to a slot: with both slots taken the first comes out and sells back for a third of what was paid. Returns the line.
function stationSlot(st, h, entry) {
  h.station = h.station || [];
  let back = 0;
  if (h.station.length >= STATION_SLOTS) { const out = h.station.shift(), p = stationPart(h.post, out.id); back = Math.round((out.paid || (p ? stationPrice(p, out.source) : 0)) * STATION_REFUND); st.credits += back; }
  h.station.push(entry);
  return back;
}
// Buying a part from the hand's own savings (st.credits, role.js purse), at a port with an outfitter: fitted with the captain's leave, else into the hand's bag. Null when it cannot be paid.
function buyStation(st, h, id, source, quirk, cap = hiredCaptain()) {
  const part = stationPart(h.post, id);
  if (!part) return null;
  const price = stationPrice(part, source);
  if (st.credits < price) return null;
  st.credits -= price;
  const entry = { id, source, quirk: quirk || null, paid: price };
  if (!stationLeave(h, cap)) { (h.stationBag = h.stationBag || []).push(entry); return `You buy ${part.name.toLowerCase()} for ${fmt(price)} cr. ${cap.first} will not have it on her guns yet; it waits in your bag.`; }
  if (cap) h.stationLeave = true;
  const back = stationSlot(st, h, entry);
  return `You buy ${part.name.toLowerCase()} for ${fmt(price)} cr and fit it to your station.${back ? ` The part it replaces sells back for ${fmt(back)} cr.` : ''}`;
}
// A part from the bag to the station, if the captain gives leave now.
function fitStation(h, i, cap = hiredCaptain()) {
  const bag = h.stationBag || [];
  if (!bag[i] || !stationLeave(h, cap)) return null;
  if (cap) h.stationLeave = true;
  const back = stationSlot(G.state, h, bag.splice(i, 1)[0]);
  return `You fit it to your station.${back ? ` The part it replaces sells back for ${fmt(back)} cr.` : ''}`;
}
// The counter on the Port page (views.js helpers): at a port with an outfitter, the parts for the hand's post, new and (when the port has one) used,
// what is fitted and what waits in the bag. Empty where there is no outfitter or the post has no parts.
function stationHtml(st, hand, planet) {
  const parts = STATION_PARTS[hand && hand.post] || [];
  if (!parts.length || !planet || !(planet.services || []).includes('outfitter')) return '';
  const used = usedPartAt(planet, st.day, 'fire'), name = id => (stationPart(hand.post, id) || { name: id }).name;
  const fitted = (hand.station || []).map(f => h`<li>${name(f.id)}${f.quirk ? h` (used: ${f.quirk.from})` : ''}</li>`), bag = hand.stationBag || [];
  return String(panelHtml({ eyebrow: 'Your station', title: 'Parts for the guns', body: h`
    <p class="hint">Bought from your own savings, fitted with the captain's leave. Two slots; a third part replaces the first.</p>
    <ul>${fitted.length ? fitted : h`<li>Nothing fitted yet.</li>`}</ul>
    ${bag.length ? h`<p class="hint">In your bag:</p><ul>${bag.map((f, i) => h`<li>${name(f.id)} <button data-action="stationFit" data-arg="${i}">Ask to fit it</button></li>`)}</ul>` : ''}
    ${listHtml(parts, p => h`<div class="mission"><b>${p.name}</b> <span class="hint">${p.desc}</span>
      <button data-action="stationBuy" data-arg="${p.id}:yard" ${st.credits >= p.price ? '' : 'disabled'}>New, ${fmt(p.price)} cr</button>
      ${used && p.used ? h`<button data-action="stationBuy" data-arg="${p.id}:used" ${st.credits >= stationPrice(p, 'used') ? '' : 'disabled'}>Used, ${fmt(stationPrice(p, 'used'))} cr</button><div class="hint">Used: ${used.from}. ${usedWords(used).replace(/^./, ch => ch.toUpperCase())}.</div>` : ''}</div>`)}` }));
}

// ---------- spares cut off wrecks (salvage.js, #965) ----------
// st.spares: the parts cut off wrecks, kept aboard, { system, quirk, from }. A spare is fitted by the crew at no cost, as a used part with its
// quirk (the system to the used mark if it is lower); or sold, at a port with an outfitter, for the used price.
const spareSellPrice = () => partPrice(0, 'used');
function spareFit(st, i) {
  const s = (st.spares || [])[i];
  if (!s) return '';
  fitPart(st, s.system, 'used', s.quirk, st.day);
  st.spares.splice(i, 1);
  return `The crew fits the ${SHIP_PARTS[s.system].name.toLowerCase()} part ${s.from}. ${SHIP_PARTS[s.system].name} is at ${Math.round(st.condition[s.system])}.`;
}
function spareSell(st, planet, i) {
  const s = (st.spares || [])[i];
  if (!s || !planet || !(planet.services || []).includes('outfitter')) return '';
  const price = spareSellPrice();
  st.credits += price;
  st.spares.splice(i, 1);
  return `The outfitter takes the ${SHIP_PARTS[s.system].name.toLowerCase()} part ${s.from} for ${fmt(price)} cr.`;
}
// The spares on the Engineering station (wear.js wearHtml), each with Fit, and Sell when docked at an outfitter.
function sparesHtml(st, planet, landed) {
  const list = st.spares || [];
  if (!list.length) return '';
  const sell = landed && planet && (planet.services || []).includes('outfitter');
  return String(h`<div class="con-spares"><div class="eyebrow">Spares</div>${list.map((s, i) => h`<div class="con-yard"><span class="hint">${SHIP_PARTS[s.system].name}, ${s.from} (${usedWords(s.quirk)})</span>
    <button data-action="spareFit" data-arg="${i}">Fit</button>${sell ? h`<button data-action="spareSell" data-arg="${i}">Sell, ${fmt(spareSellPrice())} cr</button>` : ''}</div>`)}</div>`);
}

Mods.register({
  id: 'parts', name: 'Parts', builtin: true,
  init(M) {
    const port = UI.views.port;
    UI.views.port = function () { return port.call(this) + (hired() && G.mode === 'landed' ? stationHtml(G.state, hired(), currentPlanet()) : ''); };  // the hand's own station, under the port's own page
    M.action('stationBuy', arg => {
      const [id, source] = String(arg).split(':'), planet = currentPlanet(), quirk = source === 'used' ? usedPartAt(planet, G.state.day, 'fire') : null;
      if (!hired() || G.mode !== 'landed' || (source === 'used' && (!quirk || !(stationPart(hired().post, id) || {}).used))) return;
      const line = buyStation(G.state, hired(), id, source, quirk); if (line) msg(line);
    });
    M.action('spareFit', i => { if (!role().mayAct('overhaul') || G.dialog) return; const line = spareFit(G.state, Number(i)); if (line) msg(line); });
    M.action('spareSell', i => { if (!role().mayAct('overhaul') || G.mode !== 'landed' || G.dialog) return; const line = spareSell(G.state, currentPlanet(), Number(i)); if (line) msg(line); });
    M.action('stationFit', i => { if (!hired()) return; const line = fitStation(hired(), Number(i)); msg(line || `${(hiredCaptain() || {}).first || 'The captain'} says not yet.`); });
  },
});
