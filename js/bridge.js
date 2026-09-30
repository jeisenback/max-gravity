'use strict';

// The bridge: the ship's stations. At port they are the keys across the landed screen
// (Operations holds the port's own tabs); during a burn a key bar along the bottom opens
// a status sheet for each station. Every station only shows what the ship already has;
// the crew orders and manual/crewed modes come later (issue #27).
// Loaded before game.js; only calls into it at runtime.

const STATIONS = [
  { id: 'nav', name: 'Navigation', short: 'Nav', tabs: ['nav'] },
  { id: 'weapons', name: 'Weapons', short: 'Guns', tabs: ['weapons'] },
  { id: 'eng', name: 'Engineering', short: 'Eng', tabs: ['shipyard'] },
  { id: 'interior', name: 'Interior', short: 'Deck', tabs: ['crew'] },
  { id: 'comms', name: 'Comms', short: 'Comms', tabs: ['comms'] },
  { id: 'ops', name: 'Operations', short: 'Ops', tabs: ['port', 'trade', 'missions', 'bar', 'company'] },
];
const TAB_NAMES = { port: 'Port', trade: 'Exchange', missions: 'Missions', bar: 'Bar', company: 'Company' };
const BRIDGE_KEYS_H = 52;  // the key bar's height in a burn; the transit view leaves room for it

const stationOf = tab => STATIONS.find(s => s.tabs.includes(tab)) || STATIONS.find(s => s.id === 'ops');
const tabReady = (p, id) => (hired() && OWNER_TABS.includes(id)) ? false : id === 'trade' ? p.services.includes('trade')
  : id === 'missions' ? p.services.includes('missions')
  : id === 'shipyard' ? p.services.includes('shipyard') || p.services.includes('outfitter')
  : true;

// The station keys, and under them the tabs of a station that has several.
function bridgeKeys(p, tab) {
  const here = stationOf(tab);
  const keys = STATIONS.map(s => `<button data-action="station" data-arg="${s.id}" class="${s.id === here.id ? 'active' : ''}" ${s.id === here.id ? 'aria-current="true"' : ''} ${s.tabs.some(id => tabReady(p, id)) ? '' : 'disabled'} aria-label="${s.name}"><span class="full">${s.name}</span><span class="short" aria-hidden="true">${s.short}</span></button>`).join('');
  const sub = here.tabs.length > 1 ? `<div class="tabs sub">${here.tabs.map(id => `<button data-action="tab" data-arg="${id}" class="${tab === id ? 'active' : ''}" ${tab === id ? 'aria-current="page"' : ''} ${tabReady(p, id) ? '' : 'disabled'}>${TAB_NAMES[id]}</button>`).join('')}</div>` : '';
  return `<div class="tabs stations" role="navigation" aria-label="Stations">${keys}</div>${sub}`;
}

function bridgeStation(id, planet) {
  const s = STATIONS.find(x => x.id === id);
  return (s.tabs.find(t => tabReady(planet, t))) || s.tabs[0];
}

// ---------- station views at port ----------

UI.views.nav = function () {
  const st = G.state, d = st.dest && st.dest !== st.systemId && SYSTEMS[st.dest];
  return `
    <p class="desc">${d ? `Course set for ${d.name}: ${travelDays(st.systemId, st.dest)} days, ${burnFuel(st.systemId, st.dest)} reaction mass (you have ${st.fuel}).` : 'No course set. Open the system map and pick a destination.'}</p>
    <div class="row"><button data-action="map">System map</button></div>
    <p class="hint">Take off from the bar below, fly clear of the planet, and start the burn.</p>${routeHtml()}${postHtml('pilot')}`;
};

const armament = () => {
  const st = G.state, s = ship();
  const fitted = Object.entries(st.outfits).filter(([id, n]) => n > 0 && OUTFITS[id]).map(([id, n]) => `${OUTFITS[id].name}${n > 1 ? ` x${n}` : ''}`);
  return `<p class="desc">${s.guns} gun${s.guns > 1 ? 's' : ''}. Armor ${st.armor}/${s.armor}, shields ${s.shields}.</p>
    <p class="hint">${fitted.length ? `Fitted: ${fitted.join(', ')}.` : 'No outfits fitted.'}</p>
    <p class="hint">Fights happen ${burnCombat() ? 'during burns, in momentum flight' : 'in local space, the classic way'}.</p>`;
};

UI.views.weapons = function () {
  return `<h3>Armament</h3>${armament()}<div class="row"><button data-action="combatMode">Change combat mode</button></div>${projectsHtml('gunner')}${postHtml('gunner')}`;
};

// The shipyard is Engineering's page at port; the engineer's post leads it.
const shipyardView = UI.views.shipyard;
UI.views.shipyard = function () { return engineerPanel() + (hired() ? '<p class="hint">The yard deals with the captain, not with you.</p>' : shipyardView.call(this)); };

// ---------- the viewscreen at port ----------

const bridgeStars = Array.from({ length: 90 }, (_, i) => ({ x: (i * 0.6180339) % 1, y: (i * 0.4142135 + 0.13) % 1, z: 0.3 + (i * 0.7071) % 0.7 }));

function drawViewscreen(time) {
  const c = document.getElementById('vs');
  if (!c || G.mode !== 'landed') return;
  const d = Math.min(window.devicePixelRatio || 1, 2), w = Math.round(c.clientWidth * d), h = Math.round(c.clientHeight * d);
  if (!w || !h) return;
  if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
  const g = c.getContext('2d'), color = GOV_COLORS[system().gov] || '#6fb0ff';
  g.fillStyle = '#03070a'; g.fillRect(0, 0, w, h);
  for (const s of bridgeStars) { g.fillStyle = `rgba(215,229,233,${0.2 + s.z * 0.6})`; g.fillRect(s.x * w, s.y * h, Math.max(1, s.z * 1.6 * d), Math.max(1, s.z * 1.6 * d)); }
  // The planet below, its rim in the local faction's colour, and the station ring turning ahead of it.
  g.fillStyle = '#0f2233'; g.beginPath(); g.arc(w * 0.25, h * 2.1, h * 1.75, 0, 7); g.fill();
  g.strokeStyle = color; g.globalAlpha = 0.6; g.lineWidth = 2 * d; g.beginPath(); g.arc(w * 0.25, h * 2.1, h * 1.75, 3.9, 5.5); g.stroke(); g.globalAlpha = 1;
  const ox = w * 0.74, oy = h * 0.46, rx = Math.min(w * 0.14, h * 0.9), ry = rx * 0.32, tilt = -0.25, a = Settings.reduceMotion ? 0 : time / 6000;
  g.strokeStyle = '#7f97a1'; g.lineWidth = 3 * d; g.beginPath(); g.ellipse(ox, oy, rx, ry, tilt, 0, 7); g.stroke();
  g.fillStyle = '#d7e5e9';
  for (let i = 0; i < 12; i++) {
    const t = a + i * Math.PI / 6, ex = Math.cos(t) * rx, ey = Math.sin(t) * ry;
    g.fillRect(ox + ex * Math.cos(tilt) - ey * Math.sin(tilt) - 2 * d, oy + ex * Math.sin(tilt) + ey * Math.cos(tilt) - 2 * d, 4 * d, 4 * d);
  }
}

// ---------- the key bar and status sheets during a burn ----------

function transitSheet(id) {
  const st = G.state, t = G.transit, s = ship(), progress = Math.min(1, 1 - t.left / t.total);
  const list = items => items.map(x => `<div class="hint">${x}</div>`).join('');
  switch (id) {
    case 'nav': return `<h3>Navigation</h3><p class="desc">${system().name} to ${SYSTEMS[t.to].name}, ${Math.round(progress * 100)}% of the way. ${t.flipped ? 'Braking' : 'Accelerating'}. Arriving ${dateOf(transitEta(t))}.</p>${routeHtml()}${postHtml('pilot')}`;
    case 'weapons': return `<h3>Weapons</h3>${armament()}${projectsHtml('gunner')}${postHtml('gunner')}`;
    case 'eng': return `<h3>Engineering</h3><p class="desc">Reaction mass ${st.fuel}/${s.fuel}. Armor ${st.armor}/${s.armor}. Shields ${s.shields}.</p><p class="hint">Full repairs and outfits are done at a shipyard.</p>${engineerPanel()}`;
    case 'interior': {
      const crew = crewMembers(), free = phase() === 'move' && !(t.lifeUsed || {})[lifeHalf()];
      return `<h3>Interior</h3>${crew.length ? list(crew.map(c => `${fullName(c)}, ${ROLE_NAMES[c.role]}`)) : '<p class="hint">You are flying alone.</p>'}
        <div class="row"><button data-bdown ${free ? '' : 'disabled'}>Spend some downtime</button></div>`;
    }
    case 'comms': return `<h3>Comms</h3>${(G.state.inbox || []).slice(0, 5).map(m => `<div class="hint">${dateOf(m.day)}: ${m.text}</div>`).join('') || '<p class="hint">Nothing in the inbox yet.</p>'}${postHtml('comms')}${programsHtml()}`;
    default: {
      const held = COMMODITIES.filter(c => st.cargo[c.id] > 0).map(c => `${st.cargo[c.id]}t ${c.name}`);
      return `<h3>Operations</h3><p class="desc">Trade, contracts, and the bar open when you dock.</p>${list([`Cargo: ${held.length ? held.join(', ') : 'empty'}`, ...st.missions.map(m => `${m.title} (due ${dateOf(m.deadline)})`)])}`;
    }
  }
}

function buildBridgeKeys() {
  const keys = Object.assign(document.createElement('div'), { id: 'bkeys', className: 'scroll', hidden: true });
  keys.innerHTML = STATIONS.map(s => `<button data-bst="${s.id}">${s.name}</button>`).join('');
  const sheet = Object.assign(document.createElement('div'), { id: 'bsheet', hidden: true });
  document.body.append(sheet, keys);
  const click = e => {
    const k = e.target.closest('[data-bst]'), down = e.target.closest('[data-bdown]'), act = e.target.closest('[data-action]'), t = G.transit;
    if (act && !act.disabled) { Sfx.click(); Mods.act(act.dataset.action, act.dataset.arg); syncBridge(true); }
    else if (k) { G.bridgeOpen = G.bridgeOpen === k.dataset.bst ? null : k.dataset.bst; Sfx.click(); syncBridge(true); }
    else if (down && !down.disabled && t && !t.event) { Sfx.click(); G.bridgeOpen = null; openEvent(downtimeEvent()); }
  };
  keys.addEventListener('click', click);
  sheet.addEventListener('click', click);
  sheet.addEventListener('input', powerInput);
}

function syncBridge(force) {
  const keys = document.getElementById('bkeys'), sheet = document.getElementById('bsheet');
  if (!keys) return;
  const show = G.mode === 'transit' && G.transit && !G.transit.event && !G.dialog && !G.paused;
  if (!show) G.bridgeOpen = null;
  keys.hidden = !show;
  sheet.hidden = !show || !G.bridgeOpen;
  if (!show) return;
  keys.style.right = `${G.hudW}px`;
  sheet.style.right = `${G.hudW}px`;
  keys.querySelectorAll('[data-bst]').forEach(b => b.classList.toggle('active', b.dataset.bst === G.bridgeOpen));
  if (G.bridgeOpen) {
    const html = transitSheet(G.bridgeOpen);
    if (force || sheet.dataset.html !== html) { sheet.dataset.html = html; sheet.innerHTML = html; }
  }
}

Mods.register({
  id: 'bridge', name: 'Bridge', builtin: true,
  init(M) {
    buildBridgeKeys();
    M.on('frame', () => { syncBridge(); drawViewscreen(performance.now()); });
    M.on('landed', () => syncBridge());
  },
});
