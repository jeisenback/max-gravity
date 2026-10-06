'use strict';

// Milestone 5: your own outpost. Claim Callisto (from Ganymede) or Nereid (from
// Triton Outpost), build a habitat, and keep the settlers supplied: they use food,
// water, medical supplies, and electronics every day, which you deliver from your
// hold at a fair price. Supplied, the outpost grows up to its housing and pays you
// a share each day; short of anything, it shrinks. Buildings, paid for with credits
// and materials from your hold, make it self-sufficient, add housing, and open
// services. The outpost has no Exchange market, so it never breaks the rule against
// two bodies at one location trading a good at different levels. State is
// st.outpost; the planet is added to its system when the game starts or loads.
// Loaded before game.js; only calls into it at runtime.

const OUTPOST_SITES = {
  Callisto: { sid: 'jupiter', from: 'Ganymede', x: 520, y: 380, r: 58, color: '#6d6258', pay: 1,
    desc: 'A dark, cratered moon outside Jupiter\'s radiation belts, with Ganymede\'s farms a short hop away.' },
  Nereid: { sid: 'neptune', from: 'Triton Outpost', x: 520, y: -420, r: 34, color: '#8a8f9a', pay: 1.5,
    desc: 'A lonely rock on a long, lopsided orbit. The Triton crowd says it is bad luck. The ore says otherwise.' },
};
const NEEDS = { food: 1.5, water: 1.5, medical: 0.3, equipment: 0.2 };  // tons per 100 settlers per day
const BUILDINGS = {
  habitat: { name: 'Habitat ring', cr: 40000, mat: { industrial: 20 }, cap: 120, text: 'A pressurized ring, spun up and sealed. Forty settlers move in the day it holds air.' },
  hydroponics: { name: 'Hydroponics bay', cr: 5000, mat: { equipment: 15, industrial: 10 }, cap: 60, cuts: { food: 0.2 }, text: 'Grows most of the outpost\'s food.' },
  icemine: { name: 'Ice mine', cr: 5000, mat: { industrial: 20, metal: 10 }, cap: 40, cuts: { water: 0.2 }, text: 'Digs and melts the outpost\'s own water.' },
  clinic: { name: 'Clinic', cr: 8000, mat: { medical: 10, equipment: 10 }, cap: 40, cuts: { medical: 0.3 }, text: 'Cuts the need for medical supplies and helps the outpost grow faster.' },
  dock: { name: 'Dock and trading post', cr: 10000, mat: { metal: 30, industrial: 10 }, cap: 100, services: ['missions', 'outfitter'], text: 'Opens a mission board and an outfitter, and brings in more trade: a bigger share for you.' },
  ring2: { name: 'Second ring', cr: 20000, mat: { metal: 40, industrial: 20 }, cap: 200, after: 'dock', text: 'Room for two hundred more.' },
};
const cname = cid => COMMODITIES.find(c => c.id === cid).name;
const outpost = () => G.state.outpost;
const outpostName = o => cleanName((o || outpost()).name);  // safe as text or markup: the characters that make markup are gone
const hasBuilt = b => outpost().built.includes(b);
const opPlanet = () => outpost() && planetNamed(outpost().site) && planetNamed(outpost().site).pl;
const atOutpost = () => outpost() && G.state.planet === outpost().site;

// The outpost's planet exists only once it is founded, so unclaimed sites never
// turn up as mission destinations or hometowns.
function placeOutpost() {
  for (const [name, s] of Object.entries(OUTPOST_SITES)) {
    const planets = SYSTEMS[s.sid].planets, i = planets.findIndex(p => p.name === name);
    const want = outpost() && outpost().site === name;
    if (want && i < 0) planets.push({ name, x: s.x, y: s.y, r: s.r, color: s.color, services: [], prices: {}, desc: s.desc });
    if (!want && i >= 0) planets.splice(i, 1);
  }
  if (outpost()) opPlanet().services = ['refuel', ...Object.keys(BUILDINGS).filter(hasBuilt).flatMap(b => BUILDINGS[b].services || [])];
}

function useOf(cid) {
  const o = outpost(), cut = Object.keys(BUILDINGS).filter(hasBuilt).reduce((m, b) => m * ((BUILDINGS[b].cuts || {})[cid] || 1), 1);
  return (o.pop / 100) * NEEDS[cid] * cut;
}
const shortages = () => Object.keys(NEEDS).filter(cid => outpost().stock[cid] < useOf(cid));
const income = () => Math.round(outpost().pop * 1.0 * (hasBuilt('dock') ? 1.5 : 1) * OUTPOST_SITES[outpost().site].pay);
const capOf = () => Object.keys(BUILDINGS).filter(hasBuilt).reduce((t, b) => t + BUILDINGS[b].cap, 0);
const supplyPrice = cid => Math.round(COMMODITIES.find(c => c.id === cid).base * 1.2);
// The outpost stores at most 30 days of each supply, so hauling to it can't become a money pump.
const wants = cid => Math.max(0, Math.ceil(useOf(cid) * 30 - outpost().stock[cid]));
const deliverable = cid => Math.min(G.state.cargo[cid] || 0, wants(cid));

function outpostDay() {
  const o = outpost(), st = G.state;
  if (!o) return;
  const short = shortages();
  for (const cid of Object.keys(NEEDS)) o.stock[cid] = Math.max(0, o.stock[cid] - useOf(cid));
  if (!short.length) {
    o.pop = Math.min(capOf(), o.pop * (1 + 0.02 * (hasBuilt('clinic') ? 1.5 : 1)));
    const pay = income();
    st.credits += pay; o.earned += pay;
    st.companyWeek = (st.companyWeek || 0) + pay;
  } else {
    o.pop = Math.max(10, o.pop * (1 - 0.01 * short.length));
    if (!o.warned || o.warned < st.day - 10) { o.warned = st.day; worldNews(`${outpostName(o)} is running short of ${short.map(cname).join(' and ')}. Settlers are leaving.`); }
  }
}

function found(site, name) {
  const st = G.state, b = BUILDINGS.habitat;
  st.credits -= b.cr;
  for (const [cid, t] of Object.entries(b.mat)) st.cargo[cid] -= t;
  st.outpost = { site, name: name || `${site} Landing`, founded: st.day, pop: 40, built: ['habitat'], earned: 0, moments: [],
    stock: { food: 12, water: 12, medical: 3, equipment: 2 } };
  placeOutpost();
  if (typeof homeLog === 'function') homeLog(`Founded ${outpostName(st.outpost)} on ${site}.`);
  worldNews(`A new settlement, ${outpostName(st.outpost)}, has been founded on ${site}.`);
}

function canBuild(id) {
  const st = G.state, b = BUILDINGS[id];
  return !hasBuilt(id) && (!b.after || hasBuilt(b.after)) && st.credits >= b.cr && Object.entries(b.mat).every(([cid, t]) => (st.cargo[cid] || 0) >= t);
}

// ---------- settler moments ----------
const MOMENTS = [
  { at: 60, make: o => ({ title: 'First Born', text: `The first child born on ${outpostName(o)} arrived last night, small and loud and perfectly healthy. The parents want you to choose the name.`,
    choices: ['Hope', cleanName(captain().name).split(' ')[0], o.site, 'Nova'].map(n => ({ label: `"${n}"`, run() { o.log = o.log || []; outpostLog(`${n}, the first child born on ${outpostName(o)}.`); return `${n} it is. The whole outpost turns out to meet ${n}, who sleeps through it.`; } })) }) },
  { at: 100, make: o => ({ title: 'Shift Dispute', text: `The ice crews and the hydroponics crews are at each other's throats over who gets the day shift. Both sides want you to settle it.`,
    choices: [
      { label: 'Rotate everyone', run() { outpostLog('Settled the shift dispute with a rotation.'); return 'Nobody is happy, which means it is fair.'; } },
      { label: 'Let them vote', run() { outpostLog('The settlers voted on their shifts.'); return 'The vote is close, loud, and binding. They seem prouder of that than of the result.'; } },
    ] }) },
  { at: 150, make: o => ({ title: 'Founders\' Day', text: `A year's worth of settlers have planned a Founders' Day on ${outpostName(o)}, and you are the founder. There will be a speech. Yours.`,
    choices: [
      { label: 'Give the speech', run() { outpostLog('Gave the Founders\' Day speech.'); return 'You keep it short. They cheer anyway, and someone has painted your ship on the habitat wall.'; } },
      { label: 'Let the settlers speak instead', run() { outpostLog('The settlers spoke on Founders\' Day.'); return 'An old ice miner tells the story of the first week, and there is not a dry eye in the ring.'; } },
    ] }) },
  { at: 250, make: o => ({ title: 'A Council', text: `${outpostName(o)} has outgrown a founder making every call. The settlers want to elect a council. They are asking for your blessing, not your permission.`,
    choices: [
      { label: 'Give it gladly', run() { o.council = true; outpostLog('The settlers elected their first council.'); return `${outpostName(o)} holds its first election. You are invited to every meeting, and expected at none.`; } },
      { label: 'Keep a seat for yourself', run() { o.council = true; outpostLog('The first council kept a seat for the founder.'); return 'They agree, and put your chair at the end of the table.'; } },
    ] }) },
];
function outpostLog(text) {
  const o = outpost();
  o.log = o.log || [];
  o.log.unshift({ day: G.state.day, text });
  o.log.length = Math.min(o.log.length, 12);
}

// ---------- port pages ----------
function claimHtml() {
  const st = G.state, site = Object.keys(OUTPOST_SITES).find(k => OUTPOST_SITES[k].from === st.planet), b = BUILDINGS.habitat;
  if (!site || st.outpost) return '';
  const ok = st.credits >= b.cr && (st.cargo.industrial || 0) >= b.mat.industrial;
  return `<div class="mission"><div><b>Claim ${site}</b>
      <div class="hint">${OUTPOST_SITES[site].desc} Found an outpost there: ${fmt(b.cr)} cr and ${b.mat.industrial}t of Machine Parts in your hold for the habitat ring. Keep it supplied and it grows and pays you a share every day.</div>
      <div class="row"><input type="text" id="opName" maxlength="30" placeholder="Name it (${site} Landing)"><button data-action="opFound" data-arg="${esc(site)}" ${ok ? '' : 'disabled'}>Found it</button></div></div></div>`;
}

function outpostHtml() {
  const o = outpost(), st = G.state;
  const needs = Object.keys(NEEDS).map(cid => {
    const use = useOf(cid), days = use > 0 ? Math.floor(o.stock[cid] / use) : Infinity, q = deliverable(cid);
    return `<div class="mission"><div><b>${cname(cid)}</b> <span class="hint">${days === Infinity ? 'self-sufficient' : `${Math.round(o.stock[cid])}t, ${days} days`}${days < 5 ? ' (short soon)' : ''}</span></div>
      <button data-action="opSupply" data-arg="${cid}" ${q > 0 ? '' : 'disabled'}>${wants(cid) > 0 ? `Deliver ${q}t (${fmt(supplyPrice(cid))} cr/t)` : 'Stores full'}</button></div>`;
  }).join('');
  const builds = Object.entries(BUILDINGS).filter(([id, b]) => !hasBuilt(id) && (!b.after || hasBuilt(b.after))).map(([id, b]) => `<div class="mission">
      <div><b>${b.name}</b><div class="hint">${b.text} Needs ${fmt(b.cr)} cr and ${Object.entries(b.mat).map(([cid, t]) => `${t}t ${cname(cid)}`).join(', ')} in your hold. Housing +${b.cap}.</div></div>
      <button data-action="opBuild" data-arg="${id}" ${canBuild(id) ? '' : 'disabled'}>Build</button></div>`).join('');
  const short = shortages();
  return `<h3>${outpostName(o)}</h3>
    <p class="desc">${Math.round(o.pop)} settlers, housing for ${capOf()}. ${short.length ? `Short of ${short.map(cname).join(' and ')}: settlers are leaving and there is no share for you.` : `Supplied: growing, and paying you about ${fmt(income())} cr a day.`} Earned so far: ${fmt(o.earned)} cr.</p>
    ${needs}
    ${builds ? `<h3>Build</h3>${builds}` : ''}
    ${(o.log || []).slice(0, 5).map(l => `<div class="hint">${dateOf(l.day)}: ${l.text}</div>`).join('')}`;
}

function outpostCompanyHtml() {
  const o = outpost();
  if (!o) return '';
  return `<h3>Outpost</h3><p class="hint">${outpostName(o)} on ${o.site}: ${Math.round(o.pop)} settlers of ${capOf()}. ${shortages().length ? `Short of ${shortages().map(cname).join(' and ')}.` : `About ${fmt(income())} cr a day.`} Earned ${fmt(o.earned)} cr since ${dateOf(o.founded)}.</p>`;
}

Mods.register({
  id: 'outpost', name: 'Outpost', builtin: true,
  init(M) {
    M.on('stateReady', placeOutpost);
    M.on('newDay', outpostDay);
    // At the top of the Port tab: the outpost's page, or the claim offer next door.
    const port = UI.views.port;
    UI.views.port = function () { return (scopeOff('owner') ? '' : atOutpost() ? outpostHtml() : claimHtml()) + port.call(this); };
    M.action('opFound', site => {
      const el = document.getElementById('opName'), name = cleanName(el && el.value);
      found(site, name);
      UI.notes.push(`You file the claim. ${outpostName()} is on your map at ${OUTPOST_SITES[site].sid === 'jupiter' ? 'Jupiter' : 'Neptune'}: fly there to see it, and bring supplies.`);
    });
    M.action('opSupply', cid => {
      const st = G.state, t = deliverable(cid), held = st.cargo[cid] || 0;
      if (!t) return;
      const pay = t * supplyPrice(cid);
      st.paid[cid] = (st.paid[cid] || 0) * (held - t) / held;
      st.cargo[cid] = held - t;
      outpost().stock[cid] += t;
      st.credits += pay;
    });
    M.action('opBuild', id => {
      if (!canBuild(id)) return;
      const st = G.state, b = BUILDINGS[id];
      st.credits -= b.cr;
      for (const [cid, t] of Object.entries(b.mat)) { st.paid[cid] = (st.paid[cid] || 0) * (1 - t / st.cargo[cid]); st.cargo[cid] -= t; }
      outpost().built.push(id);
      placeOutpost();
      outpostLog(`Built the ${b.name.toLowerCase()}.`);
    });
  },
});
