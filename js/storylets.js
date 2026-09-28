'use strict';

// Storylets: story written as data. A storylet is a scene that becomes available when
// its conditions hold (where you are, the day, standing, cargo, crew, the living
// world, and "qualities": numbers the story keeps, as in Sunless Sea). Choosing an
// option applies effects and can lead straight into another storylet. Storylines are
// just sets of storylets that read and write the same qualities; see
// js/stories/ice-strike.js and the README. Mods add their own with M.addStorylet.
// Loaded before game.js; only calls into it at runtime.

const STORYLETS = [];

// ---------- conditions ----------
// Every key in a `when` object must hold. In transit, `at` means your destination.
const sidNow = () => (G.transit ? G.transit.to : G.state.systemId);
const quality = name => (G.state.qualities || {})[name] || 0;
const all = (obj, test) => Object.entries(obj).every(([k, v]) => test(k, v));
const CONDITIONS = {
  day: v => G.state.day >= v,
  before: v => G.state.day < v,
  at: v => [].concat(v).includes(sidNow()),
  planet: v => G.mode === 'landed' && [].concat(v).includes(G.state.planet),
  gov: v => [].concat(v).includes(SYSTEMS[sidNow()].gov),
  standing: v => all(v, (g, n) => repOf(g) >= n),
  standingBelow: v => all(v, (g, n) => repOf(g) < n),
  credits: v => G.state.credits >= v,
  space: v => cargoFree() >= v,
  cargo: v => all(v, (c, n) => (G.state.cargo[c] || 0) >= n),
  crew: v => (ROLE_NAMES[v] ? roleSkill(v) > 0 : G.state.crew.includes(v)),
  q: v => all(v, (k, n) => quality(k) >= n),
  qBelow: v => all(v, (k, n) => quality(k) < n),
  war: v => (v === true ? !!factionState().war : !!atWar(v)),
  peace: v => (v === true ? !factionState().war : !atWar(v)),
  boom: v => economy(v) === 'boom',
  bust: v => economy(v) === 'bust',
  raid: v => excessUnrest(v === true ? sidNow() : v) > 0.05,
  chance: v => Math.random() < v,
};

function meets(when = {}) {
  // Chance last, so it only rolls when everything else holds.
  return Object.keys(when).sort((a, b) => (a === 'chance') - (b === 'chance')).every(k => CONDITIONS[k](when[k]));
}

// ---------- effects ----------
function journal(text) {
  const st = G.state;
  st.journal = st.journal || [];
  st.journal.unshift({ day: st.day, text });
  st.journal.length = Math.min(st.journal.length, 20);
}

const EFFECTS = {
  credits: n => { G.state.credits = Math.max(0, G.state.credits + n); },
  rep: v => { for (const [g, n] of Object.entries(v)) changeRep(g, n); },
  cargo: v => {
    for (const [c, n] of Object.entries(v)) {
      const held = G.state.cargo[c] || 0, q = n > 0 ? Math.min(n, cargoFree()) : Math.max(n, -held);
      if (q < 0) G.state.paid[c] = (G.state.paid[c] || 0) * (held + q) / held;
      G.state.cargo[c] = held + q;
    }
  },
  q: v => { const qs = G.state.qualities = G.state.qualities || {}; for (const [k, n] of Object.entries(v)) qs[k] = (qs[k] || 0) + n; },
  set: v => { const qs = G.state.qualities = G.state.qualities || {}; Object.assign(qs, v); },
  news: text => worldNews(fill(text)),
  log: text => journal(fill(text)),
  unrest: v => { for (const [sid, n] of Object.entries(v)) worldOf(sid).unrest = Math.max(0, Math.min(1, worldOf(sid).unrest + n)); },
  // Drop missions carrying this good (by its name), applying their onFail effects.
  cancelMission: good => {
    const st = G.state;
    for (const m of st.missions.filter(x => x.good === good)) applyEffects(m.onFail);
    st.missions = st.missions.filter(x => x.good !== good);
  },
  // A delivery mission; onDone / onFail are effects applied when it completes or expires.
  mission: m => {
    const st = G.state, dest = Object.entries(SYSTEMS).find(([, s]) => s.planets.some(p => p.name === m.to));
    st.missions.push({
      id: st.nextId++, type: 'delivery', good: m.good || 'cargo', tons: m.tons || 0, destSystem: dest[0], destPlanet: m.to,
      title: fill(m.title), pay: m.pay || 0, deadline: st.day + (m.days || 30), onDone: m.onDone, onFail: m.onFail,
    });
  },
};

function applyEffects(effects = {}) {
  for (const [k, v] of Object.entries(effects)) EFFECTS[k](v);
}

// {planet}, {system}, and {crew:role} (the crew member in that role) in any text.
function fill(text = '') {
  return text.replace(/\{planet\}/g, G.state.planet).replace(/\{system\}/g, SYSTEMS[sidNow()].name)
    .replace(/\{crew:(\w+)\}/g, (_, role) => roleName(role));
}

// ---------- the engine ----------
function addStorylet(def, source = 'core') {
  const bad = [];
  if (!def || !def.id || !def.title || !def.text || !Array.isArray(def.choices) || !def.choices.length) bad.push('needs id, title, text, and choices');
  if (def && !['port', 'transit'].includes(def.where)) bad.push('where must be "port" or "transit"');
  const check = (obj, table, what) => Object.keys(obj || {}).forEach(k => { if (!table[k]) bad.push(`unknown ${what} "${k}"`); });
  if (def) {
    check(def.when, CONDITIONS, 'condition');
    for (const c of def.choices || []) { check(c.when, CONDITIONS, 'condition'); check(c.effects, EFFECTS, 'effect'); }
  }
  if (STORYLETS.some(s => s.id === (def && def.id))) bad.push('duplicate id');
  if (bad.length) return console.error(`Storylet "${def && def.id}" (${source}): ${bad.join('; ')}`);
  STORYLETS.push({ once: true, priority: 0, ...def });
}

// The dialog for a storylet, in the shape openEvent expects. A choice that needs a
// crew role is hidden when nobody aboard fills it, and {crew} in its label names them.
function storyletEvent(s) {
  const qs = G.state.qualities = G.state.qualities || {};
  if (s.once) qs[`seen:${s.id}`] = 1;
  return {
    title: fill(s.title), text: fill(s.text),
    choices: s.choices.map(c => ({
      label: fill(c.label),
      role: c.when && ROLE_NAMES[c.when.crew] ? c.when.crew : undefined,
      can: c.when ? () => meets(c.when) : undefined,
      run() {
        applyEffects(c.effects);
        const next = c.next && STORYLETS.find(x => x.id === c.next);
        if (next) G.nextEvent = storyletEvent(next);
        return fill(c.result || '');
      },
    })),
  };
}

// The storylet to play here and now: eligible ones of the highest priority, one at random.
function pickStorylet(where) {
  const ok = STORYLETS.filter(s => s.where === where && !(s.once && quality(`seen:${s.id}`)) && meets(s.when));
  if (!ok.length) return null;
  const top = Math.max(...ok.map(s => s.priority));
  return pick(ok.filter(s => s.priority === top));
}

function journalHtml() {
  const j = G.state.journal || [];
  return j.length ? `<h3>Journal</h3>${j.slice(0, 6).map(e => `<div class="hint">Day ${e.day}: ${e.text}</div>`).join('')}` : '';
}

Mods.register({
  id: 'storylets', name: 'Storylets', builtin: true,
  init(M) {
    M.filter('transitEvent', ev => {
      if (ev) return ev;
      const s = pickStorylet('transit');
      return s && storyletEvent(s);
    });
    M.on('landed', () => {
      if (G.dialog) return;  // a story scene is already playing
      const s = pickStorylet('port');
      if (s) openEvent(storyletEvent(s));
    });
    M.on('missionDone', m => applyEffects(m.onDone));
    M.on('missionFailed', m => applyEffects(m.onFail));
  },
});
