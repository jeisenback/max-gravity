'use strict';

// Milestone 6: the community platform.
// - A mod browser: load mods by link (remembered in this browser and loaded before the
//   game starts), from a small catalog or any URL. A mod runs code in the page, so only
//   load mods from people you trust.
// - Shareable scenarios: a starting setup plus optional storylets, as data only, shared
//   as a link (#scenario=...) or a pasted code. Text from a scenario is escaped.
// - Shared news: when the page runs as a claude.ai artifact with the `db` capability,
//   captains who opt in share their notable deeds (deeds/<their id>), and everyone's
//   game hears about other captains as news and chatter. Other players' text is
//   escaped and length-capped.
// Loaded before game.js; game.js waits for Community.loadMods() before starting.

// ---------- mods by link ----------
const MOD_CATALOG = [
  { name: 'Vesta Mining Concern', url: 'mods/example-vesta.js', desc: 'Adds Vesta, a Belt mining rock with its own trade good, an outfit, a transit event, and bounties. The example mod from the README.' },
];

const Community = {
  modLinks: store.get('max-gravity-mod-links', []),
  modStatus: {},          // url -> 'loaded' | 'failed'
  news: [],               // other captains' deeds
  db: null, uid: null, mine: [], writing: false, dirty: false,
  share: store.get('max-gravity-share-deeds', false),

  // Load the remembered mods, one at a time, before the game starts.
  async loadMods() {
    for (const url of this.modLinks) await this.loadScript(url);
  },
  loadScript(url) {
    return new Promise(resolve => {
      const s = document.createElement('script');
      const done = ok => { this.modStatus[url] = ok ? 'loaded' : 'failed'; resolve(); };
      const t = setTimeout(() => done(false), 8000);
      s.onload = () => { clearTimeout(t); done(true); };
      s.onerror = () => { clearTimeout(t); done(false); };
      s.src = url;
      document.head.appendChild(s);
    });
  },
  addMod(url) {
    url = (url || '').trim();
    if (!/^(https:\/\/|mods\/)[^\s"'<>]+\.js$/i.test(url)) return 'A mod link must start with https:// (or mods/) and end in .js.';
    if (this.modLinks.includes(url)) return 'That mod is already loaded.';
    this.modLinks.push(url);
    store.set('max-gravity-mod-links', this.modLinks);
    this.loadScript(url).then(() => { if (G.mode === 'landed' && !G.dialog) UI.render(); });
    return 'Loading. Mods that add places or ships are fully in place from the next start.';
  },
  removeMod(url) {
    this.modLinks = this.modLinks.filter(u => u !== url);
    store.set('max-gravity-mod-links', this.modLinks);
    return 'Removed. It stays active until the game restarts.';
  },

  // ---------- shared deeds ----------
  async connect() {
    if (!window.claude || typeof window.claude.use !== 'function') return;
    const [db, user] = await Promise.all([window.claude.use('db'), window.claude.use('user')]);
    if (!db || !user) return;
    this.uid = await user.id();
    if (!this.uid) return;
    this.db = db;
    try {
      const me = await db.doc(`deeds/${this.uid}`).get();
      const d = me.exists && me.data();
      if (d && Array.isArray(d.deeds)) this.mine = d.deeds.slice(0, 12);
    } catch (e) { /* no document yet */ }
    db.collection('deeds').orderBy('updated', 'desc').limit(40).onSnapshot(snap => {
      this.news = snap.docs.filter(doc => doc.id !== this.uid).flatMap(doc => cleanDeeds(doc.data())).slice(0, 30);
    }, () => { this.news = []; });
    // This can finish before game.js has even run, or while a mod loaded by link is still loading (no game yet).
    if (typeof G !== 'undefined' && G.state && G.mode === 'landed' && !G.dialog) UI.render();
  },
  deed(text) {
    if (!this.share || !this.db || typeof G === 'undefined' || !G.state) return;
    this.mine.unshift({ date: dateOf(), text: String(text).slice(0, 200) });
    this.mine.length = Math.min(this.mine.length, 12);
    this.flush();
  },
  async flush() {
    if (this.writing) { this.dirty = true; return; }
    this.writing = true;
    try {
      await this.db.doc(`deeds/${this.uid}`).set({ captain: captain().name.slice(0, 40), ship: home().name.slice(0, 40), deeds: this.mine, updated: Date.now() });
    } catch (e) {
      if (e && e.code === 'invalid_argument') this.db = null;  // this viewer can read but not write
    }
    this.writing = false;
    if (this.dirty) { this.dirty = false; this.flush(); }
  },
};

// Other players' documents are untrusted: keep only well-formed, short strings.
function cleanDeeds(d) {
  if (!d || typeof d.captain !== 'string' || !Array.isArray(d.deeds)) return [];
  const who = d.captain.slice(0, 40), ship = typeof d.ship === 'string' ? d.ship.slice(0, 40) : '';
  return d.deeds.slice(0, 5).filter(x => x && typeof x.text === 'string')
    .map(x => ({ captain: who, ship, date: typeof x.date === 'string' ? x.date.slice(0, 20) : '', text: x.text.slice(0, 200) }));
}

// ---------- scenarios ----------
const SCENARIOS = [
  { title: 'Broke on Ceres', text: 'You lost your last ship in a card game on Ceres Station. You have a Dust Skiff that smells of someone else\'s cigarettes, 800 credits, and a man named Pax who wants his money back.',
    start: { credits: 800, shipId: 'shuttle', systemId: 'ceres', planet: 'Ceres Station', day: 40 },
    storylets: [{ id: 'pax-debt', where: 'port', when: { planet: 'Ceres Station', day: 45 }, title: 'Pax', text: 'Pax is waiting at your airlock, smiling the way people smile when they have brought friends. "Two thousand, captain. Or the ship."',
      choices: [
        { label: 'Pay him (2,000 cr)', when: { credits: 2000 }, effects: { credits: -2000, log: 'Paid off Pax on Ceres.' }, result: 'Pax counts it twice and wishes you a long and profitable life.' },
        { label: 'Ask for more time', effects: { rep: { 'Charter League': -2 } }, result: '"Ten days," Pax says. "Then we talk about the ship."' },
      ] }] },
  { title: 'Ice Rush', text: 'Ceres is thirsty, and you own an Ice Hauler full of Europa water. Everyone between here and the Belt knows it.',
    start: { credits: 20000, shipId: 'freighter', systemId: 'jupiter', planet: 'Europa', cargo: { water: 80 }, day: 90 } },
  { title: 'Rook\'s Favorite', text: 'The pirates of Hygiea like you, which is more than anyone else can say. You start at the Rook with a Needle courier, a slicer\'s reputation, and very few friends in uniform.',
    start: { credits: 15000, shipId: 'courier', systemId: 'hygiea', planet: 'The Rook', rep: { Pirate: 30, 'Arcology Compact': -20, 'Dome Concord': -10 }, day: 60 } },
];

const encode = obj => btoa(unescape(encodeURIComponent(JSON.stringify(obj)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
function decode(code) {
  const m = String(code).trim().match(/#scenario=([A-Za-z0-9_-]+)/) || String(code).trim().match(/^([A-Za-z0-9_-]+)$/);
  if (!m) return null;
  try { return JSON.parse(decodeURIComponent(escape(atob(m[1].replace(/-/g, '+').replace(/_/g, '/'))))); } catch (e) { return null; }
}
const shareLink = sc => `${location.href.split('#')[0]}#scenario=${encode(sc)}`;

// Deep-escape every string in a scenario from outside, and check its start.
function cleanScenario(sc) {
  if (!sc || typeof sc !== 'object' || typeof sc.title !== 'string') return null;
  const deep = v => (typeof v === 'string' ? esc(v).slice(0, 2000) : Array.isArray(v) ? v.slice(0, 50).map(deep)
    : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).slice(0, 50).map(([k, x]) => [k, deep(x)])) : typeof v === 'number' || typeof v === 'boolean' ? v : null);
  const out = deep({ title: sc.title, text: sc.text || '', start: sc.start || {}, storylets: Array.isArray(sc.storylets) ? sc.storylets.slice(0, 20) : [] });
  const s = out.start;
  if (s.shipId && !SHIPS[s.shipId]) delete s.shipId;
  if (s.systemId && (!SYSTEMS[s.systemId] || !SYSTEMS[s.systemId].planets.some(p => p.name === s.planet))) { delete s.systemId; delete s.planet; }
  return out;
}

let scenarioIds = [];
function registerScenario(sc) {
  for (const id of scenarioIds) { const i = STORYLETS.findIndex(s => s.id === id); if (i >= 0) STORYLETS.splice(i, 1); }
  scenarioIds = [];
  for (const def of (sc && sc.storylets) || []) {
    const id = `scenario-${def.id}`;
    addStorylet({ ...def, id }, 'scenario');
    if (STORYLETS.some(s => s.id === id)) scenarioIds.push(id);
  }
}

// `sc` has been through cleanScenario once already, when it came in.
function playScenario(sc) {
  if (!sc) return false;
  newGame();
  const st = G.state, s = sc.start, num = (v, lo, hi, d) => (typeof v === 'number' && isFinite(v) ? Math.max(lo, Math.min(hi, Math.round(v))) : d);
  st.credits = num(s.credits, 0, 1e6, st.credits);
  st.day = num(s.day, 1, 5000, st.day);
  if (s.shipId) { st.shipId = s.shipId; st.fuel = SHIPS[s.shipId].fuel; st.armor = SHIPS[s.shipId].armor; }
  if (s.systemId) { st.systemId = s.systemId; st.planet = s.planet; }
  for (const [cid, t] of Object.entries(s.cargo || {})) if (COMMODITIES.some(c => c.id === cid)) st.cargo[cid] = num(t, 0, 500, 0);
  for (const [g, n] of Object.entries(s.rep || {})) if (isFaction(g)) st.rep[g] = num(n, -100, 100, 0);
  st.tutorial = null;
  st.scenario = sc;
  registerScenario(sc);
  save();
  resetWorld();
  landAt(currentPlanet(), [`Scenario: ${sc.title}. ${sc.text}`]);
  return true;
}

// ---------- port page ----------
function communityHtml() {
  const mods = Mods.list.filter(m => !m.builtin);
  const catalog = MOD_CATALOG.map(c => {
    const on = Community.modLinks.includes(c.url);
    return `<div class="mission"><div><b>${c.name}</b><div class="hint">${c.desc}</div></div>
      <button data-action="${on ? 'modRemove' : 'modAdd'}" data-arg="${c.url}">${on ? 'Remove' : 'Load'}</button></div>`;
  }).join('');
  const links = Community.modLinks.filter(u => !MOD_CATALOG.some(c => c.url === u)).map(u => `<div class="mission"><div class="hint">${esc(u)} (${Community.modStatus[u] || 'loading'})</div>
      <button data-action="modRemove" data-arg="${esc(u)}">Remove</button></div>`).join('');
  const pending = UI.pendingScenario;
  return `
    <h3>Mods</h3>
    ${mods.map(m => `<div class="hint">Running: ${esc(m.name)}${m.version ? ` ${esc(m.version)}` : ''}${m.failed ? ' (switched off after an error)' : ''}</div>`).join('')}
    ${catalog}${links}
    <div class="row"><input type="text" id="modUrl" placeholder="https://cdn.jsdelivr.net/gh/you/repo/mod.js"><button data-action="modAdd">Load a mod by link</button></div>
    <p class="hint">A mod runs code in this page: only load mods from people you trust. Mod links are remembered in this browser and load before the game starts. On claude.ai, GitHub files load through cdn.jsdelivr.net/gh/... links.${UI.modNote ? ` <b>${UI.modNote}</b>` : ''}</p>
    <h3>Scenarios</h3>
    ${pending ? `<p class="desc">Start "${pending.title}"? Your current game will be replaced. <button data-action="scenarioGo">Start it</button> <button data-action="scenarioCancel">Keep playing</button></p>` : ''}
    ${SCENARIOS.map((sc, i) => `<div class="mission"><div><b>${sc.title}</b><div class="hint">${sc.text}</div></div>
      <div class="row" style="margin:0"><button data-action="scenarioPlay" data-arg="${i}">Play</button><button data-action="scenarioShare" data-arg="${i}">Share link</button></div></div>`).join('')}
    ${UI.shareLink ? `<div class="row"><input type="text" readonly value="${esc(UI.shareLink)}" data-select></div><p class="hint">Copy this link to share the scenario.</p>` : ''}
    <div class="row"><input type="text" id="scenarioCode" placeholder="Paste a scenario link or code"><button data-action="scenarioPaste">Play it</button></div>
    ${UI.scenarioNote ? `<p class="hint">${UI.scenarioNote}</p>` : ''}`;
}

function othersNewsHtml() {
  if (!Community.news.length) return '';
  return `<h3>From other captains</h3>${Community.news.slice(0, 6).map(n => `<div class="hint">${esc(n.date)}: Captain ${esc(n.captain)}${n.ship ? ` of the ${esc(n.ship)}` : ''}: ${esc(n.text)}</div>`).join('')}`;
}

Mods.register({
  id: 'community', name: 'Community', builtin: true,
  init(M) {
    Community.connect();
    M.on('stateReady', () => registerScenario(G.state.scenario));
    // A scenario link in the address: offer it, never replace a game unasked.
    M.on('stateReady', () => {
      const sc = location.hash.startsWith('#scenario=') && cleanScenario(decode(location.hash));
      if (sc && !UI.offeredLink) { UI.offeredLink = true; UI.pendingScenario = sc; }
    });
    M.action('modAdd', url => { UI.modNote = Community.addMod(url || (document.getElementById('modUrl') || {}).value); });
    M.action('modRemove', url => { UI.modNote = Community.removeMod(url); });
    M.action('scenarioPlay', i => { UI.pendingScenario = cleanScenario(SCENARIOS[Number(i)]); UI.scenarioNote = null; });
    M.action('scenarioShare', i => { UI.shareLink = shareLink(SCENARIOS[Number(i)]); });
    M.action('scenarioPaste', () => {
      const sc = cleanScenario(decode((document.getElementById('scenarioCode') || {}).value || ''));
      UI.pendingScenario = sc || null;
      UI.scenarioNote = sc ? null : 'That is not a scenario link or code this game can read.';
    });
    M.action('scenarioGo', () => { const sc = UI.pendingScenario; UI.pendingScenario = null; UI.shareLink = null; playScenario(sc); });
    M.action('scenarioCancel', () => { UI.pendingScenario = null; });
    // Sharing your deeds is opt-in, remembered in this browser, and offered only where it can work.
    M.filter('dockButtons', html => (Community.db ? `${html}<button data-action="shareDeeds">Share deeds: ${Community.share ? 'on' : 'off'}</button>` : html));
    M.action('shareDeeds', () => { Community.share = !Community.share; store.set('max-gravity-share-deeds', Community.share); });
    // What counts as a deed: storyline milestones, the ship's history, and bounties.
    const log = EFFECTS.log;
    EFFECTS.log = text => { log(text); Community.deed(fill(text)); };
    const hl = homeLog;  // the ship's history (family.js): founding, traditions, new crew, succession
    homeLog = text => { hl(text); Community.deed(text); };
    M.on('missionDone', m => { if (m.type === 'bounty') Community.deed(`Collected the bounty on ${m.targetName}.`); });
    M.on('landed', () => {
      if (UI.pendingScenario && !UI.linkNoted) { UI.linkNoted = true; M.note(`You opened a scenario link: "${UI.pendingScenario.title}". Start it or keep playing from the Scenarios section at the bottom of this page.`); }
    });
    M.filter('chatter', pool => {
      if (!Community.news.length || Math.random() > 0.2) return pool;
      const n = pick(Community.news);
      return [`[Word] Captain ${n.captain}${n.ship ? ` of the ${n.ship}` : ''}: ${n.text}`];
    });
  },
});
