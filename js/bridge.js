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
  { id: 'interior', name: 'Interior', short: 'Deck', tabs: ['crew', 'web', 'journal'] },
  { id: 'comms', name: 'Comms', short: 'Comms', tabs: ['comms'] },
  { id: 'ops', name: 'Operations', short: 'Ops', tabs: ['port', 'trade', 'missions', 'bar', 'company'] },
];
// The console each room of the cutaway opens in a burn (#323): the same sheets as the key bar's keys, so a tap on a room and a press of its key are one thing.
const ROOM_SHEETS = { bridge: 'nav', gunnery: 'weapons', engine: 'eng', berths: 'interior', medbay: 'interior', galley: 'interior', hold: 'ops' };
const roomSheet = id => ROOM_SHEETS[id];
const TAB_NAMES = { crew: 'Crew', web: 'Bonds', journal: 'Journal', port: 'Port', trade: 'Exchange', missions: 'Missions', bar: 'Bar', company: 'Company' };
const BRIDGE_KEYS_H = 52;  // the key bar's height in a burn; the transit view leaves room for it

const stationOf = tab => STATIONS.find(s => s.tabs.includes(tab) || (tab === 'person' && s.id === 'interior')) || STATIONS.find(s => s.id === 'ops');  // the character screen sits under Interior
const tabReady = (p, id) => ((hired() && OWNER_TABS.includes(id)) || (scopeOff('owner') && id === 'company')) ? false : id === 'trade' ? p.services.includes('trade')
  : id === 'missions' ? p.services.includes('missions')
  : id === 'shipyard' ? p.services.includes('shipyard') || p.services.includes('outfitter')
  : true;

// The station keys, and under them the tabs of a station that has several.
function bridgeKeys(p, tab) {
  const here = stationOf(tab);
  const keys = STATIONS.map(s => (`<button data-action="station" data-arg="${s.id}" ` +
      `class="${s.id === here.id ? 'active' : ''}" ${s.id === here.id ? 'aria-current="true"' : ''} ${s.tabs.some(id => tabReady(p, id)) ? '' : 'disabled'} ` +
      `aria-label="${s.name}"><span class="full">${s.name}</span><span class="short" aria-hidden="true">${s.short}</span></button>`)).join('');
  const shown = here.tabs.filter(id => !(hired() && OWNER_TABS.includes(id)));  // a hand has no Exchange or Company: not drawn, not greyed
  const sub = shown.length > 1 ? `<div class="tabs sub">${shown.map(id => `<button data-action="tab" data-arg="${id}" class="${tab === id ? 'active' : ''}" ${tab === id ? 'aria-current="page"' : ''} ${tabReady(p, id) ? '' : 'disabled'}>${TAB_NAMES[id]}</button>`).join('')}</div>` : '';
  return `<div class="tabs stations" role="navigation" aria-label="Stations">${keys}</div>${sub}`;
}

function bridgeStation(id, planet) {
  const s = STATIONS.find(x => x.id === id);
  return (s.tabs.find(t => tabReady(planet, t))) || s.tabs[0];
}

// ---------- station views at port ----------

// The route on a top-down plot of the system, zoomed to what the route spans (and a little more), radii on a square-root scale.
// The ship's mark moves along the line by the burn's progress, rounded so the sheet is not rebuilt every frame.
function routeSvg(from, to, progress, flipped) {
  const reach = Math.max(2, 1.3 * Math.max(SYSTEMS[from].au, to ? SYSTEMS[to].au : 0)), ids = Object.keys(SYSTEMS).filter(id => SYSTEMS[id].au <= reach), K = 135 / Math.sqrt(reach);
  const P = id => { const o = orbitPos(id), a = Math.atan2(o.y, o.x), r = Math.sqrt(SYSTEMS[id].au) * K; return [320 + Math.cos(a) * r, 150 + Math.sin(a) * r]; };
  const rings = [...new Set(ids.map(id => SYSTEMS[id].au))].map(au => `<circle cx="320" cy="150" r="${(Math.sqrt(au) * K).toFixed(1)}" fill="none" stroke="#14243a"/>`).join('');
  const dots = ids.map(id => { const [x, y] = P(id); return (`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3" ` +
      `fill="#7f95ab"/>${id === from || id === to ? '' : `<text class="lbl" x="${(x + 6).toFixed(1)}" y="${(y + 3).toFixed(1)}" fill="#4b617a" font-size="13">${SYSTEMS[id].name}</text>`}`); }).join('');
  let course = '';
  const [fx, fy] = P(from);
  course += `<circle cx="${fx.toFixed(1)}" cy="${fy.toFixed(1)}" r="6" fill="none" stroke="#5fd35f" stroke-width="2"/><text x="${(fx + 9).toFixed(1)}" y="${(fy - 8).toFixed(1)}" fill="#d4e4f5" font-size="16">${SYSTEMS[from].name}</text>`;
  if (to && to !== from) {
    const [tx, ty] = P(to), sx = fx + (tx - fx) * progress, sy = fy + (ty - fy) * progress, mx = (fx + tx) / 2, my = (fy + ty) / 2;
    course += `<line x1="${fx.toFixed(1)}" y1="${fy.toFixed(1)}" x2="${tx.toFixed(1)}" y2="${ty.toFixed(1)}" stroke="#6fb0ff" stroke-dasharray="5 5" opacity=".6"/>
      ${progress > 0 ? `<line x1="${fx.toFixed(1)}" y1="${fy.toFixed(1)}" x2="${sx.toFixed(1)}" y2="${sy.toFixed(1)}" stroke="#6fb0ff" stroke-width="2"/>` : ''}
      <circle cx="${mx.toFixed(1)}" cy="${my.toFixed(1)}" r="2.5" fill="${flipped ? '#ff9a3c' : '#4b617a'}"/>
      <circle cx="${tx.toFixed(1)}" cy="${ty.toFixed(1)}" r="8" fill="none" stroke="#6fb0ff" stroke-width="2"/><text x="${(tx + 11).toFixed(1)}" y="${(ty - 9).toFixed(1)}" fill="#d4e4f5" font-size="16">${SYSTEMS[to].name}</text>
      ${progress > 0 ? `<circle cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="4" fill="#d4e4f5"/>` : ''}`;
  }
  return `<rect width="640" height="300" fill="#050a11"/>${rings}<circle cx="320" cy="150" r="5" fill="#e8d17a"/>${dots}${course}
    <text x="14" y="24" fill="#7f95ab" font-size="11" letter-spacing="2">ROUTE</text>`;
}

// The Navigation station as a console: the route on the display, the course beside it, and the helm along the bottom.
function navigationPanel() {
  const st = G.state, t = G.transit, plan = hired() && !t ? currentPlan() : null;
  const to = t ? t.to : hired() ? (plan && plan.sid) : (st.dest && st.dest !== st.systemId ? st.dest : null);
  const progress = t ? Math.round(Math.min(1, 1 - t.left / t.total) * 100) / 100 : 0;
  const helm = notYours('pilot') ? `${roleHolder('pilot') ? roleName('pilot') : 'The helm'} has the helm`
    : postMode('pilot') === 'manual' ? 'You have the helm' : `${roleName('pilot')} has the helm`;
  const course = t
    ? conRead('Destination', SYSTEMS[t.to].name) + conRead('Burn', `${Math.round(progress * 100)}%, ${t.flipped ? 'braking' : 'accelerating'}`) + conRead('Arrival', dateOf(transitEta(t))) + conRead('Reaction mass', `${st.fuel}/${ship().fuel}`)
    : to ? conRead('Destination', SYSTEMS[to].name) + conRead('Distance', `${distAU(st.systemId, to).toFixed(2)} AU`) + conRead('Burn', `${travelDays(st.systemId, to)} days`)
        + (hired() ? '' : conRead('Reaction mass', `${burnFuel(st.systemId, to)} of ${st.fuel}`))
    : '<p class="hint">No course set.</p>';
  return consoleHtml({
    title: 'Navigation', status: helm,
    screen: `<svg class="con-plant" viewBox="0 0 640 300" role="img" aria-label="Route plot">${routeSvg(st.systemId, to, progress, t && t.flipped)}</svg>`,
    side: conCard('Course', course),
    controls: hired() ? `${runHtml()}${t ? '' : '<p class="hint">The captain picks where she goes, and sails when you are ready.</p>'}${postHtml('pilot')}`
      : `${t ? '' : `<div class="row"><button data-action="map">System map</button></div><p class="hint">${to ? '' : 'Open the system map and pick a destination. '}Take off from the bar below, fly clear of the planet, and start the burn.</p>`}${routeHtml()}${postHtml('pilot')}`,
  });
}

UI.views.nav = navigationPanel;

const armament = () => {
  const st = G.state, s = ship();
  const fitted = Object.entries(st.outfits).filter(([id, n]) => n > 0 && OUTFITS[id]).map(([id, n]) => `${OUTFITS[id].name}${n > 1 ? ` x${n}` : ''}`);
  return `<p class="desc">${s.guns} gun${s.guns > 1 ? 's' : ''}. Armor ${st.armor}/${s.armor}, shields ${s.shields}.</p>
    <p class="hint">${fitted.length ? `Fitted: ${fitted.join(', ')}.` : 'No outfits fitted.'}</p>`;
};

// What the ship carries to a fight, on the hull: the guns along the spine (colored by the fire control's condition),
// the point-defense turrets underneath, and the torpedo tubes in the bow, filled for each torpedo held.
function gunnerySvg() {
  const st = G.state, s = ship(), fire = condColor(condition().fire), pdc = Math.min(2, (st.outfits || {}).pdc || 0);
  const guns = Math.min(6, s.guns), spineY = x => 112 - (x - 110) * 12 / 360, keelY = x => 188 + (x - 110) * 12 / 360;
  const mounts = Array.from({ length: guns }, (_, i) => { const x = 180 + i * 48; return (`<rect x="${x}" y="${(spineY(x) - 16).toFixed(1)}" ` +
      `width="22" height="14" rx="3" fill="#0a1320" stroke="${fire}" stroke-width="2"/><line x1="${x + 22}" y1="${(spineY(x) - 9).toFixed(1)}" ` +
      `x2="${x + 44}" y2="${(spineY(x + 22) - 9).toFixed(1)}" stroke="${fire}" stroke-width="3"/>`); }).join('');
  const turrets = Array.from({ length: pdc }, (_, i) => { const x = 210 + i * 80; return (`<circle cx="${x}" cy="${(keelY(x) + 9).toFixed(1)}" r="8" ` +
      `fill="#0a1320" stroke="#5fd35f" stroke-width="2"/><line x1="${x - 5}" y1="${(keelY(x) + 9).toFixed(1)}" x2="${x + 5}" ` +
      `y2="${(keelY(x) + 9).toFixed(1)}" stroke="#5fd35f"/><line x1="${x}" y1="${(keelY(x) + 4).toFixed(1)}" x2="${x}" ` +
      `y2="${(keelY(x) + 14).toFixed(1)}" stroke="#5fd35f"/>`); }).join('');
  const held = Math.min(TORP_MAX, st.torpedoes || 0);
  const tubes = s.launcher ? `<rect x="494" y="139" width="${TORP_MAX * 11 + 8}" height="22" rx="3" fill="#0a1320" stroke="#34506e"/>${Array.from({ length: TORP_MAX }, (_, i) => `<circle cx="${503 + i * 11}" cy="150" r="4" fill="${i < held ? '#6fb0ff' : 'none'}" stroke="#6fb0ff"/>`).join('')}` : '';
  return `${hullSvg()}${mounts}${turrets}${tubes}
  <text x="14" y="24" fill="#7f95ab" font-size="11" letter-spacing="2">ARMAMENT</text>
  <g class="lbl" font-size="11" fill="#7f95ab" letter-spacing="1">
    <text x="180" y="${(spineY(180) - 26).toFixed(0)}">${guns} GUN${guns === 1 ? '' : 'S'}</text>
    ${pdc ? `<text x="180" y="${(keelY(180) + 34).toFixed(0)}">${pdc} POINT DEFENSE</text>` : ''}
    ${s.launcher ? `<text x="494" y="178">TORPEDOES ${held}/${TORP_MAX}</text>` : '<text x="494" y="150">NO LAUNCHER</text>'}
  </g>`;
}

// The Weapons station as a console: the armament on the display, the fire deck beside it, and the gunner's post along the bottom.
function weaponsPanel() {
  const st = G.state, c = condition(), deck = playerCounts();
  const status = notYours('gunner') ? `${roleHolder('gunner') ? roleName('gunner') : 'The gunner'} has the guns`
    : postMode('gunner') === 'manual' ? 'You have the guns' : `${roleName('gunner')} has the guns`;
  const cards = ts => ts.map(t => conRead(DUEL_CARDS[t].name, deck[t])).join('');
  return consoleHtml({
    title: 'Weapons', status,
    screen: `<svg class="con-plant" viewBox="0 0 640 300" role="img" aria-label="Armament diagram">${gunnerySvg()}</svg>`,
    side: conCard('Fire deck', `${hired() ? '<p class="hint">A raid plays as scenes, not cards. The deck is used only when someone comes looking for you.</p>' : ''}<div class="hint">Threats</div>${cards(DUEL_THREATS)}<div class="hint">Answers</div>${cards(DUEL_ANSWERS)}`)
      + conCard('Gun systems', `${conRead('Weapons power', `${power().weapons}%`)}${conRead('Fire control', `${Math.round(c.fire)}%`)}${armament()}`),
    controls: `<div class="row"><button data-action="combatMode">Change combat mode</button></div>${projectsHtml('gunner')}${postHtml('gunner')}`,
  });
}

UI.views.weapons = weaponsPanel;

// Who is at a post: the crew member who has it, or you when you do it yourself. A post nobody holds and you do not run is empty.
function postOccupant(id) {
  const h = postHolder(id);
  if (notYours(id)) return h ? { who: h } : null;
  return postMode(id) === 'crewed' ? { who: h } : { you: true };
}

// A deck plan of the cutaway's ship (shiplife.js): the same two decks and rooms, with each person in the room they spend
// their time in, and the posts nobody holds left empty. A ring shows how someone is doing: blue is well, amber is having a
// hard time or hurt (an injured hand holds no post).
function deckSvg() {
  const ring = c => moodLow(c) || (G.state.injured || {})[c.id] ? '#ff9a3c' : '#6fb0ff', X = f => 30 + f * 580, top = 40, mid = 130, bottom = 220;
  const homeRoom = role => HAUNTS[role] ? Object.entries(HAUNTS[role]).sort((a, b) => b[1] - a[1])[0][0] : 'berths';
  const placed = Object.keys(POSTS).map(id => ({ room: homeRoom(POSTS[id].role), o: postOccupant(id) }));
  placed.push({ room: 'bridge', o: hired() ? { who: hiredCaptain() } : { you: true } });  // the captain's place is the bridge
  const holders = new Set(Object.keys(POSTS).map(postHolder).filter(Boolean));
  for (const c of crewMembers()) if (!holders.has(c)) placed.push({ room: homeRoom(c.role), o: { who: c } });
  const rooms = ROOMS.map(r => {
    const y0 = r.deck === 0 ? top + 4 : r.tall ? top + 4 : mid + 4, y1 = r.deck === 0 ? mid - 4 : bottom - 4, floor = r.deck === 0 ? mid - 12 : bottom - 12, w = (r.x1 - r.x0) * 580;
    let out = `<rect x="${X(r.x0) + 1}" y="${y0}" width="${w - 2}" height="${y1 - y0}" rx="4" fill="#0a1320" stroke="#34506e"/><text class="lbl" x="${X(r.x0) + 6}" y="${y0 + 13}" fill="#7f95ab" font-size="9" letter-spacing="1">${r.name.toUpperCase()}</text>`;
    if (r.id === 'berths') {
      const n = Math.min(6, ship().berths), used = berthsUsed(), cols = Math.ceil(n / 2);
      out += Array.from({ length: n }, (_, i) => `<rect x="${(X(r.x0) + (X(r.x1) - X(r.x0)) * (Math.floor(i / 2) + 0.5) / cols - 12).toFixed(1)}" y="${y0 + 22 + (i % 2) * 20}" width="24" height="12" rx="2" fill="${i < used ? '#1d3a5c' : 'none'}" stroke="#34506e"/>`).join('');
    }
    const here = placed.filter(q => q.room === r.id), seen = new Set(), who = here.filter(q => { const k = q.o && q.o.you ? 'you' : null; return !k || !seen.has(k) && seen.add(k); });
    const perRow = Math.max(1, Math.floor((w - 8) / 24));  // a crowded room stacks its people in rows
    return out + who.map((q, i) => {
      const row = Math.floor(i / perRow), inRow = Math.min(perRow, who.length - row * perRow), cx = (X(r.mid) + ((i % perRow) - (inRow - 1) / 2) * 24).toFixed(1), cy = floor - row * 24;
      if (!q.o) return `<circle cx="${cx}" cy="${cy}" r="10" fill="none" stroke="#4b617a" stroke-dasharray="4 4"/>`;
      if (q.o.you) return `<circle class="person" cx="${cx}" cy="${cy}" r="10" fill="#12202f" stroke="#5fd35f" stroke-width="3"/><text x="${cx}" y="${cy + 3}" fill="#d4e4f5" font-size="8" text-anchor="middle">YOU</text>`;
      const c = q.o.who;
      const clip = `face-${String(c.id).replace(/\W/g, '')}-${i}`;  // the portrait, cut to the token's circle, inside the mood ring
      return (`<clipPath id="${clip}"><circle cx="${cx}" cy="${cy}" r="10"/></clipPath><g class="face" ` +
          `clip-path="url(#${clip})">${portraitSvg(c).replace('<svg class="char-portrait"', (
          `<svg class="char-portrait" x="${cx - 10}" y="${cy - 10}" width="20" height="20" ` +
          `style="width:20px;height:20px;max-width:none;border:0;border-radius:0"`))}</g><circle ` +
          `class="person" cx="${cx}" cy="${cy}" r="10" fill="none" stroke="${ring(c)}" stroke-width="3"/>`);
    }).join('');
  }).join('');
  const ladder = Array.from({ length: 8 }, (_, i) => `<line x1="${X(LADDER) - 5}" y1="${mid - 4 + i * 11}" x2="${X(LADDER) + 5}" y2="${mid - 4 + i * 11}" stroke="#4a6a8c"/>`).join('');
  return `<rect x="0" y="0" width="640" height="250" fill="#050a11"/>
    <path d="M${X(0)} ${top + 6} L${X(0.9)} ${top} Q${X(1.02)} ${mid} ${X(0.9)} ${bottom} L${X(0)} ${bottom - 6} Z" fill="#0e1826" stroke="#34506e" stroke-width="2"/>${rooms}${ladder}
    <text x="30" y="26" fill="#7f95ab" font-size="11" letter-spacing="2">DECK PLAN</text>`;
}

// The Interior station as a console: the deck plan, who has which post, and the downtime button along the bottom (in a burn).
function interiorPanel() {
  const st = G.state, t = G.transit, crew = crewMembers();
  const captainRow = conRead('Captain', hired() ? personLink(hiredCaptain()) : `${youLink()}, in command`);
  const posts = captainRow + Object.keys(POSTS).map(id => {
    const o = postOccupant(id), h = postHolder(id);
    const mood = h && ((st.injured || {})[h.id] ? ', injured' : moodLow(h) ? ', having a hard time' : '');
    return conRead(POSTS[id].name, o ? (o.you ? youLink() : `${personLink(o.who)}${mood}`) : 'Nobody');
  }).join('');
  // Crew who hold no post: the roles without one, a second hand, or someone too hurt to work.
  const holders = new Set(Object.keys(POSTS).map(postHolder).filter(Boolean));
  const off = crew.filter(c => !holders.has(c)).map(c => conRead(personLink(c), `${ROLE_NAMES[c.role]}${(st.injured || {})[c.id] ? ', injured' : moodLow(c) ? ', having a hard time' : ''}`)).join('');
  const free = t && phase() === 'move' && !(t.lifeUsed || {})[lifeHalf()];
  return consoleHtml({
    title: 'Interior', status: `${crew.length} crew, ${berthsUsed()}/${ship().berths} berths`,
    screen: `<svg class="con-plant" viewBox="20 14 620 222" role="img" aria-label="Deck plan">${deckSvg()}</svg>`,
    side: conCard('Posts', posts) + (off ? conCard('Off post', off) : ''),
    controls: t ? `<div class="row"><button data-bdown ${free ? '' : 'disabled'}>Spend some downtime</button></div>` : '',
  });
}

const crewViewBase = UI.views.crew;
UI.views.crew = function () { return interiorPanel() + crewViewBase.call(this); };

// The cargo bay: a cell for each ton the hold takes, filled in a color for each commodity aboard, in the order of the manifest.
const CARGO_COLORS = ['#6fb0ff', '#5fd35f', '#ff9a3c', '#b08fff', '#e8d17a', '#9fb4c2', '#ff6a8a'];
function bayGrid() {
  const st = G.state, cap = ship().cargo, cols = cap > 60 ? 20 : 10, rows = Math.ceil(cap / cols), cell = Math.min(34, Math.floor(580 / cols) - 3);  // the last column ends inside the 640-wide plan
  const fill = COMMODITIES.flatMap((c, i) => Array(Math.max(0, Math.round(st.cargo[c.id] || 0))).fill(i));
  const cells = Array.from({ length: cap }, (_, i) => {
    const x = 40 + (i % cols) * (cell + 3), y = 50 + Math.floor(i / cols) * (cell + 3), c = fill[i];
    return c === undefined ? `<rect x="${x}" y="${y}" width="${cell}" height="${cell}" rx="3" fill="none" stroke="#22384f"/>`
      : `<rect x="${x}" y="${y}" width="${cell}" height="${cell}" rx="3" fill="${CARGO_COLORS[c % CARGO_COLORS.length]}" opacity=".85" data-bay="${COMMODITIES[c].id}"/>`;
  }).join('');
  return { svg: `<svg class="con-plant" viewBox="0 0 640 ${Math.max(150, 62 + rows * (cell + 3))}" role="img" aria-label="Cargo bay"><text x="40" y="30" fill="#7f95ab" font-size="11" letter-spacing="2">CARGO BAY</text>${cells}</svg>`, fill };
}

// The Operations station as a console: the cargo bay on the display, the manifest and the contracts beside it.
function operationsPanel() {
  const st = G.state, s = ship(), bay = bayGrid();
  const manifest = COMMODITIES.map((c, i) => st.cargo[c.id] > 0 ? `<div class="con-read"><span><i class="con-swatch" style="background:${CARGO_COLORS[i % CARGO_COLORS.length]}"></i>${c.name}</span><b>${st.cargo[c.id]}t</b></div>` : '').join('');
  const jobs = st.missions.map(m => `<div class="hint">${m.title} (due ${dateOf(m.deadline)})</div>`).join('');
  return consoleHtml({
    title: 'Operations', status: hired() ? `The captain's hold: ${cargoUsed()}/${s.cargo}t, Capt. ${hiredCaptain().first} ${hiredCaptain().last}` : `Hold ${cargoUsed()}/${s.cargo}t`,
    screen: bay.svg,
    side: conCard('Manifest', manifest || '<p class="hint">The hold is empty.</p>') + (jobs || !hired() ? conCard('Contracts', jobs || '<p class="hint">No active contracts.</p>') : ''),  // a hand with no errand has no contracts to show
    controls: G.transit ? '<p class="hint">Trade, contracts, and the bar open when you dock.</p>' : '',
  });
}

const portView = UI.views.port;
UI.views.port = function () { return (hired() ? runHtml() : '') + operationsPanel() + portView.call(this); };  // a hand's first question is what the captain will do next, so the run leads

// The shipyard is Engineering's page at port; the engineer's post leads it.
const shipyardView = UI.views.shipyard;
UI.views.shipyard = function () { return engineerPanel() + (hired() ? buyInHtml() : shipyardView.call(this)); };

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
  // The planet below, its rim in the local faction's color, and the station ring turning ahead of it.
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
  switch (id) {
    case 'nav': return navigationPanel();
    case 'weapons': return weaponsPanel();
    case 'eng': return `${engineerPanel()}<p class="hint">Full repairs and outfits are done at a shipyard.</p>`;
    case 'interior': return interiorPanel();
    case 'comms': return commsPanel();
    case 'person': return characterPanel();
    default: return operationsPanel();
  }
}

function buildBridgeKeys() {
  const keys = Object.assign(document.createElement('div'), { id: 'bkeys', className: 'scroll', hidden: true });
  keys.innerHTML = STATIONS.map(s => `<button data-bst="${s.id}" aria-label="${s.name}"><span class="full">${s.name}</span><span class="short" aria-hidden="true">${s.short}</span></button>`).join('');
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
  const view = G.W - G.hudW;  // the part of the screen not taken by the HUD sidebar
  keys.style.right = `${G.hudW}px`;
  keys.classList.toggle('compact', view < 700);  // short names when the keys would not fit
  sheet.style.right = `${G.hudW}px`;
  sheet.style.left = `${view / 2}px`;
  sheet.style.width = `${Math.min(['nav', 'eng', 'weapons', 'comms', 'ops', 'person'].includes(G.bridgeOpen) ? 720 : 520, view - 24)}px`  // a console is wide enough for its two columns;
  keys.querySelectorAll('[data-bst]').forEach(b => b.classList.toggle('active', b.dataset.bst === G.bridgeOpen));
  if (G.bridgeOpen) {
    const html = transitSheet(G.bridgeOpen);
    if (force || !sheet.dataset.html || (G.bridgeOpen !== 'eng' && sheet.dataset.html !== html)) {  // the engineering console updates itself, so a slider is not rebuilt mid-drag
      sheet.dataset.html = html; sheet.innerHTML = html;
    }
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
