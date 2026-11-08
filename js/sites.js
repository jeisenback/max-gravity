'use strict';

// Sites: places that orbit as the systems do and have no port, the rocks and wrecks off the lanes (the ice rock first, #948). A site
// is { id, kind, name, au, angle, found, gov, services, color, site }, kept on the save as st.sites by id. They are seeded once per
// run from facts already on the save (the hired captain and the sign-on day) with no draw of the game's dice, so no other outcome
// moves, and found one by one: an unfound site is not on the map. placeOf (orbits.js) returns a site where it returns a system, so a
// burn, the map and the window math read one as they read a system; a site carries gov and services for the readers that ask, and no
// planets. Every function takes the state it reads. Loaded after orbits.js and before game.js; runs under tests/nodecontext.js.

const SITE_KINDS = { ice: { word: 'an ice rock', color: '#8a8478' } };
const ICE_SITES = 3, ICE_AU = [3.4, 4.2];  // ice rocks a run has, and how far out: past the Belt, as the ice run says

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

const sites = st => (st.sites = st.sites || seedSites(siteKey(st)));
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
  save();
  UI.openLanded(site, notes, 'site');
  Mods.emit('onStation', site);
  if (hired() && hired().run && hired().run.ice) openEvent(iceStageScene(0));  // the approach (icerun.js)
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
