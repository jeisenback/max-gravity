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
