'use strict';

// The game around the game: a title screen (Continue, New Game, Load, Settings,
// Credits), new-game setup (captain, ship name, and a starting background), five save
// slots with autosave on docking, delete, export, and import, a pause menu (Esc, or the
// Menu button), and settings (volume, text size, reduced motion) kept in this browser.
// Automated test runs (navigator.webdriver) skip the title screen and start straight
// into the last game. Loaded before game.js; only calls into it at runtime.

const SLOTS = 5, SAVE_VERSION = 3;

// ---------- settings ----------
const Settings = Object.assign({ volume: 1, music: 0.6, textScale: 1, reduceMotion: false, wear: 'slow' }, store.get('maxGravity.settings', {}));
// Until the player ticks or unticks Reduce motion themselves, it follows the system setting (a stored false is only the default).
if (!Settings.motionChosen) Settings.reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
Settings.quiet = Object.assign({ market: false, chatter: false }, Settings.quiet);  // what the Comms screen has muted
function applySettings() {
  store.set('maxGravity.settings', { volume: Settings.volume, music: Settings.music, textScale: Settings.textScale, reduceMotion: Settings.reduceMotion, motionChosen: !!Settings.motionChosen, wear: Settings.wear, quiet: Settings.quiet });
  UI.el.style.zoom = Settings.textScale;
  if (Sfx.out) Sfx.out.gain.value = Sfx.on ? 0.5 * Settings.volume : 0;
}

// ---------- save slots ----------
// Slot 1 uses the original save key, so older saves simply become slot 1.
const Saves = {
  current: store.get('maxGravity.slot', 1),
  key: n => (n === 1 ? SAVE_KEY : `${SAVE_KEY}.slot${n}`),
  metas() {
    const m = store.get('maxGravity.slotMeta', {});
    if (!m[1] && store.raw(SAVE_KEY)) { const st = this.read(1); if (st) m[1] = this.describe(st); }  // a save from before slots
    return m;
  },
  describe(st) {
    return { captain: st.captain ? st.captain.name : 'Unnamed', ship: st.home ? st.home.name : 'Second Chance', shipType: (SHIPS[st.shipId] || SHIPS.shuttle).name,
      date: dateOfState(st), planet: st.planet, credits: st.credits, played: st.played || 0, savedAt: Date.now(), version: BUILD.version };
  },
  read(n) { try { const s = store.raw(this.key(n)); return s ? JSON.parse(s) : null; } catch (e) { return null; } },
  write(st) {
    let ok = true;
    try { localStorage.setItem(this.key(this.current), JSON.stringify(st)); } catch (e) { ok = false; }
    if (ok) { const m = this.metas(); m[this.current] = this.describe(st); store.set('maxGravity.slotMeta', m); }
  },
  use(n) { this.current = n; store.set('maxGravity.slot', n); },
  remove(n) { store.del(this.key(n)); const m = this.metas(); delete m[n]; store.set('maxGravity.slotMeta', m); },
  latest() { const m = this.metas(), ns = Object.keys(m).map(Number); return ns.length ? ns.sort((a, b) => m[b].savedAt - m[a].savedAt)[0] : null; },
  firstEmpty() { const m = this.metas(); for (let n = 1; n <= SLOTS; n++) if (!m[n]) return n; return null; },
  // Import a save (JSON text or an exported code) into slot n. Returns an error or null.
  import(text, n) {
    let st = null;
    const t = String(text || '').trim();
    try { st = JSON.parse(t.startsWith('{') ? t : decodeURIComponent(escape(atob(t.replace(/-/g, '+').replace(/_/g, '/'))))); } catch (e) { return 'That is not a save this game can read.'; }
    if (!st || typeof st !== 'object' || typeof st.credits !== 'number' || typeof st.systemId !== 'string') return 'That is not a save this game can read.';
    st = migrate(stripTags(st));  // a save code can come from anyone
    const prev = this.current;
    this.use(n); this.write(st); this.use(prev);
    return null;
  },
  exportCode(n) { const s = store.raw(this.key(n)) || ''; return btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); },
};
const dateOfState = st => { const d = new Date(START_DATE + ((st.day || 1) - 1) * 864e5); return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };
const played = s => `${Math.floor(s / 3600)}h ${String(Math.floor(s / 60) % 60).padStart(2, '0')}m`;

// Older saves get the fields later versions expect: every top-level field of stateDefaults() (game.js) that a save lacks. Add a
// field there, not here; add a step here only when an old value has to be rewritten, not just filled in.
function migrate(st) {
  const defaults = stateDefaults(st.shipId);
  for (const key of Object.keys(defaults)) if (st[key] == null) st[key] = defaults[key];
  for (const p of Object.values(st.people)) if (p && typeof p === 'object') { p.first = cleanName(p.first); p.last = cleanName(p.last); }  // an event title is built from a name, and a title ends up in an attribute
  if (st.captain) st.captain.name = cleanName(st.captain.name);
  for (const c of st.captains || []) { c.name = cleanName(c.name); c.fate = stripTags(c.fate); }
  for (const m of st.memorial || []) m.cause = stripTags(m.cause);
  if (st.home) st.home.name = cleanName(st.home.name) || 'Second Chance';
  if (st.outpost) st.outpost.name = cleanName(st.outpost.name);
  st.v = SAVE_VERSION;
  return st;
}

// ---------- starting out ----------
const BACKGROUNDS = {
  earth: { name: 'Earth', text: 'Start on Earth with 12,000 credits and a patched-up Rock Hopper. The tutorial walks you through your first trade run.', at: ['earth', 'Earth'], credits: 12000 },
  mars: { name: 'Mars', text: 'Grew up under the Tharsis domes. Start on Mars with 10,000 credits and friends in the Mars Republic.', at: ['mars', 'Mars'], credits: 10000, rep: { 'Mars Republic': 10 },
    intro: () => ['You grew up under the domes of Tharsis, where everyone argues about the future. Now you have a Rock Hopper, 10,000 credits, and a way off the planet.', 'Mars pays well for Electronics from Earth, and sells Refined Metals cheap.'] },
  belt: { name: 'The Belt', text: 'Ceres-born, with long limbs and short patience. Start on Ceres Station with 9,000 credits and friends in the Belt Collective.', at: ['ceres', 'Ceres Station'], credits: 9000, rep: { 'Belt Collective': 10 },
    intro: () => ['You were born in Ceres spin, and you know what water is worth. Now you have a Rock Hopper, 9,000 credits, and the whole Belt to work.', 'Ceres is always short of water and food. Europa and Ganymede, at Jupiter, sell both cheap.'] },
};

function startGame(o) {
  if (scopeOff('starts')) o = { ...o, mode: 'hired', background: 'earth', tutorial: false };  // the one start this build has
  Saves.use(o.slot);
  G.paused = false;
  G.dialog = null; G.transit = null;
  G.state = newState();
  const st = G.state, b = BACKGROUNDS[o.background] || BACKGROUNDS.earth;
  st.systemId = b.at[0]; st.planet = b.at[1]; st.credits = b.credits;
  Object.assign(st.rep, b.rep || {});
  st.tutorial = o.background === 'earth' && o.tutorial ? 0 : null;
  st.v = SAVE_VERSION;
  st.background = BACKGROUNDS[o.background] ? o.background : 'earth';  // who the main characters are (cast.js)
  Mods.emit('stateReady');
  if (cleanName(o.captain)) captain().name = cleanName(o.captain);
  if (cleanName(o.ship)) home().name = cleanName(o.ship).replace(/^the /i, '');
  resetWorld();
  if (o.mode === 'hired') {
    landAt(currentPlanet(), setupHired(o));
    const opening = signOnEvent();  // signon.js: why you signed on
    if (G.dialog) G.nextEvent = opening; else openEvent(opening);
    return;
  }
  landAt(currentPlanet(), o.background === 'earth' ? INTRO : b.intro());
}

function loadSlot(n) {
  Saves.use(n);
  G.paused = false; G.dialog = null; G.transit = null;
  loadGame();
}

// ---------- screens ----------
const Menu = {
  view: 'main', pausedFrom: null, note: '', confirm: null, form: { background: 'earth', tutorial: true },

  showTitle() {
    G.mode = 'title';
    for (const id of ['menuBtn', 'tlife']) { const el = document.getElementById(id); if (el) el.hidden = true; }
    G.paused = false;
    this.pausedFrom = null;
    this.view = 'main';
    this.render();
  },

  pause() {
    if (G.paused || !['flight', 'transit', 'landed'].includes(G.mode) || G.dialog) return;
    G.paused = true;
    G.keys = {};
    this.pausedFrom = G.mode;
    this.view = 'pause';
    this.render();
  },

  resume() {
    G.paused = false;
    const was = this.pausedFrom;
    this.pausedFrom = null;
    if (was === 'landed') UI.show(); else UI.hide();
  },

  render() {
    const V = this.views[this.view].call(this);
    UI.el.innerHTML = `<div class="menu">${V}${this.note ? `<p class="hint">${this.note}</p>` : ''}</div>`;
    UI.el.classList.remove('hidden', 'event');
    this.note = '';
  },

  slotRows(action) {
    const m = Saves.metas();
    return Array.from({ length: SLOTS }, (_, i) => i + 1).map(n => {
      const s = m[n];
      // The game in play saves itself again at once, so its slot can only be deleted from the title screen.
      const del = n === Saves.current && this.pausedFrom ? '' : this.confirm === `del${n}`
        ? `<button data-action="menuSlotDelete" data-arg="${n}:yes">Really delete</button><button data-action="menuSlotDelete" data-arg="${n}:no">Keep it</button>`
        : `<button data-action="menuSlotDelete" data-arg="${n}">Delete</button>`;
      return `<div class="mission"><div><b>Slot ${n}${n === Saves.current ? ' (current)' : ''}</b>
        <div class="hint">${s ? `Captain ${esc(s.captain)}, the ${esc(s.ship)} (${esc(s.shipType)}). ${esc(s.date)} at ${esc(s.planet)}, ${fmt(s.credits)} cr, played ${played(s.played)}.` : 'Empty'}</div></div>
        <div class="row" style="margin:0">${s ? `${action === 'load' ? `<button data-action="menuSlotLoad" data-arg="${n}">Load</button>` : ''}<button data-action="menuSlotExport" data-arg="${n}">Export</button>${del}` : ''}</div></div>`;
    }).join('');
  },

  views: {
    main() {
      const last = Saves.latest(), m = Saves.metas()[last];
      return `<div class="menu-title">MAX GRAVITY</div>
        <div class="hint menu-sub">${scopeNarrow() ? 'Hire on at Earth, work an ice hauler, and save for a ship of your own.' : 'A trader\'s life in a solar system on the edge of war.'}<br>Version ${BUILD.version}.</div>
        <div class="menu-buttons">
          ${last ? `<button class="primary" data-action="menuContinue">Continue<span class="hint">Captain ${esc(m.captain)}, ${esc(m.date)}</span></button>` : ''}
          <button ${last ? '' : 'class="primary"'} data-action="menuView" data-arg="new">New game</button>
          <button data-action="menuView" data-arg="load">Load game</button>
          <button data-action="menuView" data-arg="settings">Settings</button>
          <button data-action="menuView" data-arg="help">Help</button>
          <button data-action="menuView" data-arg="controls">Controls</button>
          <button data-action="menuView" data-arg="credits">Credits</button>
        </div>`;
    },
    new() {
      const f = this.form, empty = Saves.firstEmpty(), m = Saves.metas(), narrow = scopeOff('starts');
      if (narrow) { f.mode = 'hired'; f.background = 'earth'; }  // the one start this build has
      if (!f.slot) f.slot = empty || Saves.current;
      return `<h2>New game</h2>
        <div class="menu-form">
          <label>Your name <input type="text" id="ngCaptain" maxlength="30" placeholder="Captain's name" value="${esc(f.captain || '')}"></label>
          <h3>${narrow ? 'Your post' : 'How you start'}</h3>
          ${narrow ? '' : `<div class="row">${[['owner', 'Owner'], ['hired', 'Hired hand']].map(([id, l]) => `<button class="${(f.mode || 'owner') === id ? 'on' : ''}" data-action="menuMode" data-arg="${id}">${l}</button>`).join('')}</div>`}
          ${f.mode === 'hired' ? `<p class="hint">You sign on to a captain's ship and work ${scopeOff('posts') ? 'the guns' : 'one post'}. The captain picks where she goes; you save toward a ship of your own.</p>
          ${scopeOff('posts') ? '' : `<div class="row">${HIRED_POSTS.map(p => `<button class="${(f.post || 'pilot') === p ? 'on' : ''}" data-action="menuPost" data-arg="${p}">${POSTS[p].name}</button>`).join('')}</div>`}`
            : `<label>Your ship <input type="text" id="ngShip" maxlength="30" placeholder="Second Chance" value="${esc(f.ship || '')}"></label>`}
          ${narrow ? '' : `<h3>Where you start</h3>
          ${Object.entries(BACKGROUNDS).map(([id, b]) => `<button class="choice ${f.background === id ? 'on' : ''}" data-action="menuBackground" data-arg="${id}"><b>${b.name}</b><span class="hint">${b.text}</span></button>`).join('')}
          ${f.background === 'earth' && f.mode !== 'hired' ? `<label class="check"><input type="checkbox" id="ngTutorial" ${f.tutorial ? 'checked' : ''}> Play the tutorial</label>` : ''}`}
          <h3>Save slot</h3>
          <div class="row">${Array.from({ length: SLOTS }, (_, i) => i + 1).map(n => `<button class="${f.slot === n ? 'on' : ''}" data-action="menuSlotPick" data-arg="${n}">${n}: ${m[n] ? esc(m[n].captain) : 'empty'}</button>`).join('')}</div>
          ${m[f.slot] ? `<p class="hint">Slot ${f.slot} holds Captain ${esc(m[f.slot].captain)}'s game. Starting here replaces it.</p>` : ''}
        </div>
        <div class="menu-buttons row sticky"><button class="primary" data-action="menuStart">Start</button><button data-action="menuBack">Back</button></div>`;
    },
    load() {
      return `<h2>Saved games</h2><p class="hint">The game saves itself every time you dock.</p>
        ${this.slotRows('load')}
        ${this.exported ? `<p class="hint">Save code for slot ${this.exported.n} (copy it somewhere safe; paste it back with Import):</p><textarea readonly rows="3" onclick="this.select()">${this.exported.code}</textarea>` : ''}
        <h3>Import a save</h3>
        <div class="row"><input type="file" id="importFile" accept=".json,application/json"></div>
        <div class="row"><input type="text" id="importCode" placeholder="Or paste a save code"><button data-action="menuImport">Import</button></div>
        <div class="menu-buttons row"><button data-action="menuBack">Back</button></div>`;
    },
    settings() {
      return `<h2>Settings</h2>
        <div class="menu-form">
          <label>Music volume <input type="range" id="setMusic" min="0" max="1" step="0.1" value="${Settings.music}"></label>
          <label>Sound effects volume <input type="range" id="setVolume" min="0" max="1" step="0.1" value="${Settings.volume}"></label>
          <label class="check"><input type="checkbox" id="setSound" ${Sfx.on ? 'checked' : ''}> Sound on</label>
          <h3>Text size</h3>
          <div class="row">${[[0.9, 'Small'], [1, 'Normal'], [1.15, 'Large'], [1.3, 'Largest']].map(([v, l]) => `<button class="${Settings.textScale === v ? 'on' : ''}" data-action="menuText" data-arg="${v}">${l}</button>`).join('')}</div>
          <h3>Wear and tear</h3>
          <div class="row">${[['off', 'Off'], ['slow', 'Slow'], ['normal', 'Normal']].map(([v, l]) => `<button class="${Settings.wear === v ? 'on' : ''}" data-action="menuWear" data-arg="${v}">${l}</button>`).join('')}</div>
          <div class="hint">How fast the ship's systems wear with use. Off means they never do.</div>
          <label class="check"><input type="checkbox" id="setMotion" ${Settings.reduceMotion ? 'checked' : ''}> Reduce motion (no screen shake, calmer stars)</label>
        </div>
        <div class="menu-buttons row"><button data-action="menuBack">Back</button></div>`;
    },
    help() {
      const topic = helpTopics().find(h => h.id === this.topic);
      if (topic) return `<h2>${topic.title}</h2>${helpText(topic).map(p => `<p class="desc">${p}</p>`).join('')}
        <div class="menu-buttons row"><button data-action="menuTopic" data-arg="">All topics</button><button data-action="menuBack">Back</button></div>`;
      return `<h2>Help</h2><div class="menu-buttons">${helpTopics().map(h => `<button data-action="menuTopic" data-arg="${h.id}">${h.title}</button>`).join('')}</div>
        <div class="menu-buttons row"><button data-action="menuBack">Back</button></div>`;
    },
    controls() {
      const row = (k, d) => `<div class="hint"><b>${k}</b>: ${d}</div>`;
      return `<h2>Controls</h2>
        <h3>Flying</h3>${row('W / Up', 'thrust')}${row('A D / Left Right', 'turn')}${row('S / Down', 'turn to brake')}${row('Space', 'fire')}${row('F', 'launch a torpedo')}${row('Tab', 'next target')}${row('H', 'hail your target')}${row('L', 'land at the nearest port')}${row('M', 'system map')}${row('J', 'start a burn')}${row('N', 'sound on or off')}${row('Esc', 'pause menu')}
        <h3>Fights during burns</h3>${row('W', 'burn at your set thrust')}${row('Q / E', 'less or more thrust')}${row('S', 'point retrograde against the enemy')}${row('Space', 'guns')}${row('F', 'torpedo')}${row('H', 'hail, or board a disabled ship')}
        <h3>Touch</h3><div class="hint">The stick steers and burns (push further for more thrust), Fire and Brake are held, and the buttons above them tap.</div>
        <div class="menu-buttons row"><button data-action="menuBack">Back</button></div>`;
    },
    credits() {
      return `<h2>Credits</h2>
        <p class="desc">Max Gravity is a homage to Escape Velocity and to the lived-in solar systems of The Expanse and the Wayfarers books.</p>
        <div class="hint">Fonts: Chakra Petch and IBM Plex Mono, under the SIL Open Font License.</div>
        <div class="hint">Sound effects are synthesized in the browser; there are no audio files.</div>
        <div class="hint">Built with Claude Code.</div>
        <div class="menu-buttons row"><button data-action="menuBack">Back</button></div>`;
    },
    pause() {
      const docked = this.pausedFrom === 'landed';
      return `<div class="menu-title small">Paused</div>
        <div class="menu-buttons">
          <button class="primary" data-action="menuResume">Resume</button>
          <button data-action="menuSave" ${docked ? '' : 'disabled'}>Save now${docked ? '' : '<span class="hint">You can save when docked. The game saves itself every time you dock.</span>'}</button>
          <button data-action="menuView" data-arg="load">Load game</button>
          <button data-action="menuView" data-arg="settings">Settings</button>
          <button data-action="menuView" data-arg="help">Help</button>
          <button data-action="menuView" data-arg="controls">Controls</button>
          <button data-action="menuQuit">Quit to title${docked ? '' : '<span class="hint">Progress since you last docked is lost.</span>'}</button>
        </div>`;
    },
  },
};

// The title screen's backdrop: stars drifting past a distant sun.
function drawTitle(W, H) {
  ctx.fillStyle = '#02040a';
  ctx.fillRect(0, 0, W, H);
  const g = ctx.createRadialGradient(W * 0.2, H * 0.75, 0, W * 0.2, H * 0.75, H * 0.8);
  g.addColorStop(0, 'rgba(255,200,120,0.22)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  if (!G.transitStars) G.transitStars = Array.from({ length: 150 }, () => ({ x: Math.random(), y: Math.random(), z: rand(0.2, 1) }));
  for (const s of G.transitStars) {
    s.x -= (Settings.reduceMotion ? 0.002 : 0.01) * s.z / 60;
    if (s.x < 0) s.x += 1;
    ctx.fillStyle = `rgba(200,215,255,${s.z})`;
    ctx.fillRect(s.x * W, s.y * H, s.z * 2, s.z * 2);
  }
}

// A Menu button over flight, transit, and fights (the port has its own).
function menuButton() {
  let b = document.getElementById('menuBtn');
  if (!b) {
    b = Object.assign(document.createElement('button'), { id: 'menuBtn', textContent: 'Menu', hidden: true });
    b.addEventListener('click', () => Menu.pause());
    document.body.appendChild(b);
  }
  const show = ['flight', 'transit'].includes(G.mode) && !G.paused && !G.dialog;
  if (b.hidden === show) b.hidden = !show;
}

Mods.register({
  id: 'menu', name: 'Menus and saves', builtin: true,
  init(M) {
    // Installable and playable offline where the game is hosted on its own (not inside claude.ai's frame).
    if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol) && window.top === window) navigator.serviceWorker.register('sw.js').catch(() => {});
    M.on('frame', dt => {
      menuButton();
      if (G.state && !G.paused && G.mode !== 'title') G.state.played = (G.state.played || 0) + dt;
    });
    M.filter('dockButtons', html => `<button data-action="menuPause">Menu</button>${html}`);
    window.addEventListener('keydown', e => {
      if (e.code !== 'Escape' || e.repeat || ['map', 'hail', 'title'].includes(G.mode)) return;
      if (G.paused) Menu.resume(); else if (G.mode !== 'landed') Menu.pause();
    });
    document.addEventListener('change', e => {
      const t = e.target;
      if (t.id === 'setVolume') { Settings.volume = Number(t.value); applySettings(); }
      else if (t.id === 'setMusic') { Settings.music = Number(t.value); applySettings(); }
      else if (t.id === 'setSound') { if (Sfx.on !== t.checked) Sfx.toggle(); applySettings(); }
      else if (t.id === 'setMotion') { Settings.reduceMotion = t.checked; Settings.motionChosen = true; applySettings(); }
      else if (t.id === 'ngTutorial') Menu.form.tutorial = t.checked;
      else if (t.id === 'importFile' && t.files && t.files[0]) {
        const r = new FileReader();
        r.onload = () => { const n = Saves.firstEmpty(); Menu.note = n ? (Saves.import(r.result, n) || `Imported into slot ${n}.`) : 'Every slot is full: delete one first.'; Menu.render(); };
        r.readAsText(t.files[0]);
      }
    });
    const keepForm = () => {
      const c = document.getElementById('ngCaptain'), s = document.getElementById('ngShip');
      if (c) Menu.form.captain = cleanName(c.value);
      if (s) Menu.form.ship = cleanName(s.value);
    };
    const back = () => { Menu.exported = null; Menu.confirm = null; Menu.view = Menu.pausedFrom ? 'pause' : 'main'; };
    const act = (name, fn) => M.action(name, arg => { fn(arg); if (G.mode === 'title' || G.paused) Menu.render(); });
    act('menuView', v => { keepForm(); Menu.view = v; });
    act('menuBack', () => { Menu.topic = null; back(); });
    act('menuTopic', id => { Menu.topic = id || null; });
    act('menuContinue', () => loadSlot(Saves.latest()));
    act('menuBackground', id => { keepForm(); Menu.form.background = id; });
    act('menuMode', id => { keepForm(); Menu.form.mode = id; });
    act('menuPost', id => { keepForm(); Menu.form.post = id; });
    act('menuSlotPick', n => { keepForm(); Menu.form.slot = Number(n); });
    act('menuStart', () => { keepForm(); const f = Menu.form; startGame({ ...f, tutorial: f.tutorial }); Menu.form = { background: 'earth', tutorial: true }; });
    act('menuSlotLoad', n => loadSlot(Number(n)));
    act('menuSlotDelete', arg => {
      const [n, yes] = String(arg).split(':');
      if (!yes) Menu.confirm = `del${n}`;
      else { if (yes === 'yes') Saves.remove(Number(n)); Menu.confirm = null; }
    });
    act('menuSlotExport', n => {
      n = Number(n);
      const text = store.raw(Saves.key(n)) || '';
      try {  // a file download, where the browser allows it...
        const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([text], { type: 'application/json' })), download: `max-gravity-slot${n}.json` });
        document.body.appendChild(a); a.click(); a.remove();
      } catch (e) { /* ...and a code to copy, always */ }
      Menu.exported = { n, code: Saves.exportCode(n) };
    });
    act('menuImport', () => {
      const n = Saves.firstEmpty(), code = (document.getElementById('importCode') || {}).value;
      Menu.note = n ? (Saves.import(code, n) || `Imported into slot ${n}.`) : 'Every slot is full: delete one first.';
    });
    act('menuText', v => { Settings.textScale = Number(v); applySettings(); });
    act('menuWear', v => { Settings.wear = v; applySettings(); });
    act('menuPause', () => Menu.pause());
    act('menuResume', () => Menu.resume());
    act('menuSave', () => { if (Menu.pausedFrom === 'landed') { Saves.write(G.state); Menu.note = `Saved to slot ${Saves.current}.`; } });
    act('menuQuit', () => { if (Menu.pausedFrom === 'landed') Saves.write(G.state); G.transit = null; resetWorld(); Menu.showTitle(); });
  },
});
