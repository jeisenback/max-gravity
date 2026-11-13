'use strict';

// Sites: places that orbit as the systems do and have no port, the rocks and wrecks off the lanes (the ice rock first, #948). A site
// is { id, kind, name, au, angle, found, gov, services, color, site }, kept on the save as st.sites by id. They are seeded once per
// run from facts already on the save (the hired captain and the sign-on day) with no draw of the game's dice, so no other outcome
// moves, and found one by one: an unfound site is not on the map. placeOf (orbits.js) returns a site where it returns a system, so a
// burn, the map and the window math read one as they read a system; a site carries gov and services for the readers that ask, and no
// planets. Every function takes the state it reads. Loaded after orbits.js and before game.js; runs under tests/nodecontext.js.

const SITE_KINDS = { ice: { word: 'an ice rock', color: '#8a8478' }, wreck: { word: 'a wreck', color: '#7a8590' }, rock: { word: 'a rock', color: '#8c7a66' } };
const ICE_SITES = 3, ICE_AU = [3.0, 3.8];  // ice rocks a run has, and how far out: the outer Belt (nearer than the first 3.4 to 4.2, which made a run from the inner system too long for its pay: the soak, 2026-11-08)

const isSite = id => typeof id === 'string' && id.startsWith('site:');
// The seed: who the hand signed on with and when, which a run has from its first hour; a save with no hand seeds from the word alone.
const siteKey = st => hash(`sites|${(st.hired && st.hired.captain) || ''}|${(st.hired && st.hired.since) || 0}`);

// The sites of a run, from one key: this file's own dice (a linear congruential step), so the same save seeds the same rocks.
function seedSites(key) {
  let x = key >>> 0;
  const next = () => { x = (Math.imul(x, 1664525) + 1013904223) >>> 0; return x / 4294967296; };
  const letter = () => String.fromCharCode(65 + Math.floor(next() * 26));
  const out = {};
  for (let i = 1; i <= ICE_SITES; i++) {
    const id = `site:ice-${i}`, kind = SITE_KINDS.ice;
    const name = `${letter()}${letter()}-${10 + Math.floor(next() * 90)}`;
    const au = Math.round((ICE_AU[0] + next() * (ICE_AU[1] - ICE_AU[0])) * 100) / 100;
    const angle = Math.round(((i - 1) * 360 / ICE_SITES + next() * 60) % 360);  // spread round the circle
    out[id] = { id, kind: 'ice', name, au, angle, found: null, gov: 'Independent', services: [], color: kind.color, site: true };
  }
  return out;
}

// The co-op's salvage and survey sites (#965): six wrecks and three rocks in the middle Belt. Each is seeded on its own, from the key, its kind,
// its number and its generation (gen: how many times the slot has been replaced), so a slot can be re-seeded alone and no other site moves.
// A wreck's type and name come from salvage.js's tables, read when a site is seeded (after every script has loaded).
const WRECKS = 6, ROCKS = 3, WRECK_AU = [2.2, 3.6];
function seedSite(key, kind, i, gen) {
  let x = hash(`${key}|${kind}|${i}|${gen}`) >>> 0;
  const next = () => { x = (Math.imul(x, 1664525) + 1013904223) >>> 0; return x / 4294967296; };
  const pick = list => list[Math.floor(next() * list.length)];
  const id = `site:${kind}-${i}`, au = Math.round((WRECK_AU[0] + next() * (WRECK_AU[1] - WRECK_AU[0])) * 100) / 100, angle = Math.floor(next() * 360);
  const out = { id, kind, name: '', au, angle, found: null, gen, gov: 'Independent', services: [], color: SITE_KINDS[kind].color, site: true };
  if (kind === 'rock') { out.name = `${String.fromCharCode(65 + Math.floor(next() * 26))}${String.fromCharCode(65 + Math.floor(next() * 26))}-${100 + Math.floor(next() * 900)}`; return out; }
  const type = pick(WRECK_TYPE_IDS), find = 1 + Math.floor(next() * 3);
  let lead = null, leadAt = null;
  if (next() < 1 / 3) { const n = 1 + Math.floor(next() * (WRECKS - 1)); lead = `site:wreck-${((i - 1 + n) % WRECKS) + 1}`; leadAt = 1 + Math.floor(next() * 3); }
  out.name = pick(WRECK_TYPES[type].names);
  out.wreck = { type, name: out.name, find, lead, leadAt, cut: 0, lost: [], seed: Math.floor(next() * 1e9) };  // seed: the wreck's own, for what its sections hold (salvage.js)
  return out;
}
const seedWrecks = key => {
  const out = {};
  for (let i = 1; i <= WRECKS; i++) out[`site:wreck-${i}`] = seedSite(key, 'wreck', i, 0);
  for (let i = 1; i <= ROCKS; i++) out[`site:rock-${i}`] = seedSite(key, 'rock', i, 0);
  return out;
};
// A wreck cut out or a rock surveyed takes a new one in its slot: re-seeded by the next generation, unfound.
function replaceSite(st, id) {
  const old = sites(st)[id], [kind, i] = id.slice(5).split('-');
  return (st.sites[id] = seedSite(siteKey(st), kind, Number(i), (old.gen || 0) + 1));
}

// A save made before the wrecks gets them the first time its sites are asked for, and its ice rocks stay where they were.
function sites(st) {
  if (!st.sites) st.sites = seedSites(siteKey(st));
  if (!st.sites['site:wreck-1']) Object.assign(st.sites, seedWrecks(siteKey(st)));
  return st.sites;
}
const siteOf = (st, id) => (isSite(id) ? sites(st)[id] || null : null);
const atSite = st => isSite(st.systemId);
function findSite(st, id, day) {
  const s = siteOf(st, id);
  if (s && s.found === null) s.found = day;
  return s;
}
const foundSites = st => Object.keys(sites(st)).filter(id => st.sites[id].found !== null);

// A site as a body for the painter (art.js drawBody): a grey rock with craters and no lights, at radius r.
const siteBody = (site, r) => ({ name: site.name, color: site.color, r, art: { type: 'asteroid', base: [site.color, '#1a1d22'], craters: 6 } });

// ---------- on station ----------
// The ship at a site: landed, with the shell's ship pages and the site's own page, and no port. It fires onStation and not landed, so no
// port hook (the bar, the dock's visitors, the room, the board, the hand's settlement) runs at a rock; that one event is the gate for all of them.
function landAtSite(site, notes = []) {
  const st = G.state;
  st.systemId = site.id; st.planet = site.name;
  if (G.player) st.armor = Math.max(1, Math.round(G.player.armor));
  G.transit = null; G.mode = 'landed'; G.shots = []; G.flash = 0;
  UI.openLanded(site, notes, 'site');
  Mods.emit('onStation', site);
  siteArrival(st);  // the ice run's stay and its approach scene (icerun.js)
  save();  // after the stay has begun and the approach is marked, so a reload keeps the shifts and plays no second approach (#979)
}

// The header's second line at a site: what it is and how far out.
const siteHeader = site => `${SITE_KINDS[site.kind].word} at ${site.au.toFixed(1)} AU`;

// The site's page (views.js helpers): the rock, the shifts and the ice aboard when the run is an ice run.
function sitePageHtml(st, site, run) {
  if (!site || !site.site) return String(h`<p class="hint">Not on station.</p>`);  // the page exists at a port too, for the shell's list of pages
  const kind = SITE_KINDS[site.kind], word = kind.word[0].toUpperCase() + kind.word.slice(1), stay = stayOf(st.hired), ice = run && run.ice;
  return String(h`<div class="eyebrow">${site.name}</div>
    <p class="desc">${word} at ${site.au.toFixed(1)} AU, turning slowly against the stars. No dock, no market, and nobody to talk to but the crew.</p>
    ${ice ? h`<p class="desc">Shifts on the rock: ${stay ? `${ICE_SHIFTS - stay.left} worked, ${stay.left} left` : `${ICE_SHIFTS} worked`}. Ice aboard: ${st.cargo.water || 0} tons. The haul so far: ${iceHaulWord(ice.edge)}.</p>` : ''}`);
}

// The vista at a site: the stars and the rock, lit from the sun's side, no lights (bridge.js drawViewscreen hands over here).
function drawSiteVista(g, w, h, site, sun) {
  for (const s of bridgeStars) { g.fillStyle = `rgba(215,229,233,${0.2 + s.z * 0.6})`; g.fillRect(s.x * w, s.y * h, Math.max(1, s.z * 1.6), Math.max(1, s.z * 1.6)); }
  const R = Math.min(w * 0.7, VISTA_R);
  g.save(); g.translate(w * 0.32, h + R * 0.6); g.scale(R / VISTA_R, R / VISTA_R); drawBody(siteBody(site, VISTA_R), 0, 0, { g, sun, lights: false }); g.restore();
}
