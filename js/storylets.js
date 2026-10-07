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
  fleet: v => (G.state.fleet || []).length >= v,  // company ships owned (company.js)
  stake: v => all(v, (pl, share) => ((G.state.stakes || {})[pl] || { share: 0 }).share >= share - 1e-9),
  cargo: v => all(v, (c, n) => (G.state.cargo[c] || 0) >= n),
  crew: v => (ROLE_NAMES[v] ? roleSkill(v) > 0 : G.state.crew.includes(v)),
  q: v => all(v, (k, n) => quality(k) >= n),
  qBelow: v => all(v, (k, n) => quality(k) < n),
  war: v => (v === true ? !!factionState().war : !!atWar(v)),
  peace: v => (v === true ? !factionState().war : !atWar(v)),
  boom: v => economy(v) === 'boom',
  bust: v => economy(v) === 'bust',
  raid: v => excessUnrest(v === true ? sidNow() : v) > 0.05,
  berths: v => berthsFree() >= v,
  // Cold Water's state (story.js): `stage` and `side` match a value or list; any other
  // key is a story flag that must be set (true) or unset (false).
  story: v => all(v, (k, want) => (k === 'stage' || k === 'side' ? [].concat(want).includes(story()[k]) : !!story()[k] === !!want)),
  // Days since a day the story recorded: { next: 0 } holds once the day reaches story().next.
  storyDay: v => all(v, (k, n) => G.state.day >= (story()[k] || 0) + n),
  // A story passenger aboard, by role in the story (older saves' Mira has none).
  aboard: v => paxAboard().some(m => m.story && (m.storyWho || 'mira-europa') === v),
  chance: v => Math.random() < v,
  post: v => !!hired() && [].concat(v).includes(hired().post),  // a hired hand's own post
  skill: v => !!hired() && skillLevel(hired().post) >= v,  // and the level they have there
  hired: v => !!hired() === !!v,  // follow-ups of a hired hand's choices stop when they buy a ship of their own
  // A follow-up that an earlier choice set going with `later`: holds once its days have passed.
  due: v => [].concat(v).every(n => quality(`due:${n}`) > 0 && G.state.day >= quality(`due:${n}`)),
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
  // Cold Water's state and log (story.js).
  story: v => { Object.assign(story(), v); },
  storyLog: text => storyLog(fill(text)),
  storyAdd: v => { for (const [k, n] of Object.entries(v)) story()[k] = (story()[k] || 0) + n; },
  // Days from today into a story field: { next: 10 } sets story().next to day + 10.
  storyDays: v => { for (const [k, n] of Object.entries(v)) story()[k] = G.state.day + n; },
  // Seconds added to the current burn (transit only).
  delay: s => { if (G.transit) delay(s); },
  // Change the story passenger aboard with this role: { who, bonus, set: { fields } }.
  passenger: v => {
    const m = paxAboard().find(x => x.story && (x.storyWho || 'mira-europa') === v.who);
    if (!m) return;
    m.bonus += v.bonus || 0;
    Object.assign(m, v.set || {});
  },
  // Run a named action a storyline registered in code (M.addAction). An action can
  // return text, which is added to the choice's result.
  do: spec => {
    const [name, ...args] = [].concat(spec);
    return Mods.storyActions[name](...args);
  },
  rep: v => { for (const [g, n] of Object.entries(v)) changeRep(g, n); },
  cargo: v => {
    for (const [c, n] of Object.entries(v)) {
      const held = G.state.cargo[c] || 0, q = n > 0 ? Math.min(n, cargoFree()) : Math.max(n, -held);
      if (q < 0) G.state.paid[c] = (G.state.paid[c] || 0) * (held + q) / held;
      G.state.cargo[c] = held + q;
    }
  },
  q: v => { const qs = G.state.qualities = G.state.qualities || {}; for (const [k, n] of Object.entries(v)) qs[k] = (qs[k] || 0) + n; },
  // Start a follow-up: { name: days } makes the `due: name` condition hold that many days from now.
  // A hired hand's standing: { captain: n, crew: n, 'thread:key': n } changes opinion of the captain, everyone aboard,
  // or the person a scene remembered under that key (see remember).
  like: v => {
    for (const [who, n] of Object.entries(v)) {
      const list = who === 'captain' ? [hired() && person(hired().captain)] : who === 'crew' ? procedural().map(f => f.p) : [threadPerson(who.replace(/^thread:/, ''))];
      for (const p of list.filter(Boolean)) like(p, n, null);
    }
  },
  // Experience at a hired hand's own post.
  learn: n => { if (hired()) gainSkill(hired().post, n); },
  later: v => { const qs = G.state.qualities = G.state.qualities || {}; for (const [k, n] of Object.entries(v)) qs[`due:${k}`] = G.state.day + Math.max(1, n); },
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
  // A bounty: hunt a named ship that appears when you reach `at`. onDone / onFail as for missions.
  bounty: b => {
    const st = G.state;
    st.missions.push({
      id: st.nextId++, type: 'bounty', targetSystem: b.at, targetName: fill(b.name), issuer: b.issuer || localGov(),
      title: fill(b.title || `Bounty: destroy ${b.name} near ${SYSTEMS[b.at].name}`), pay: b.pay || 0, deadline: st.day + (b.days || 40),
      onDone: b.onDone, onFail: b.onFail,
    });
  },
  // A company ship with a captain, docked where you are (company.js).
  companyShip: shipId => {
    const credits = G.state.credits;
    buyCompanyShip(shipId);
    G.state.credits = credits;  // a gift, not a purchase
    G.state.companyLog[0].text = G.state.companyLog[0].text.replace(/^Bought/, 'Received');
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

// Applies effects; returns any text they produced (from `do` actions).
function applyEffects(effects = {}) {
  const said = [];
  for (const [k, v] of Object.entries(effects)) {
    const r = EFFECTS[k](v);
    if (typeof r === 'string' && r) said.push(r);
  }
  return said;
}

// A scene can remember a person under a key, for a follow-up to name: {thread:key} in its text.
const threads = () => (G.state.threads = G.state.threads || {});
const remember = (key, p) => { threads()[key] = p.id; };
const threadPerson = key => (threads()[key] ? G.state.people[threads()[key]] : null);

// {planet}, {system}, {crew:role} (the crew member in that role), {captain} and {thread:key} in any text.
// Text can also be a list of parts, each a string or { when, text, else }: parts
// whose conditions fail show their `else` (or nothing). Parts are joined by spaces.
function fill(text = '') {
  if (Array.isArray(text)) {
    text = text.map(p => (typeof p === 'string' ? p : meets(p.when) ? p.text : p.else || '')).filter(Boolean).join(' ');
  }
  return text.replace(/\{planet\}/g, G.state.planet).replace(/\{system\}/g, SYSTEMS[sidNow()].name)
    .replace(/\{crew:(\w+)\}/g, (_, role) => roleName(role))
    .replace(/\{captain\}/g, () => { const c = hired() && person(hired().captain); return c ? `Captain ${c.last}` : 'the captain'; })
    .replace(/\{thread:(\w+)\}/g, (_, key) => { const p = threadPerson(key); return p ? p.first : 'a shipmate'; });
}

// ---------- the engine ----------
function addStorylet(def, source = 'core') {
  const bad = [];
  if (!def || !def.id || !def.title || !def.text || !Array.isArray(def.choices) || !def.choices.length) bad.push('needs id, title, text, and choices');
  if (def && !['port', 'transit'].includes(def.where)) bad.push('where must be "port" or "transit"');
  if (def && def.via && !VIA_LABELS[def.via]) bad.push('via must be "station", "ship", "message" or "crew"');
  const check = (obj, table, what) => Object.keys(obj || {}).forEach(k => { if (!table[k]) bad.push(`unknown ${what} "${k}"`); });
  if (def) {
    check(def.when, CONDITIONS, 'condition');
    for (const c of def.choices || []) {
      check(c.when, CONDITIONS, 'condition'); check(c.effects, EFFECTS, 'effect');
      for (const v of Object.values(c.effects || {})) if (v && v.onDone) check(v.onDone, EFFECTS, 'effect');  // a mission's effects on delivery
    }
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
  if (s.every) qs[`last:${s.id}`] = G.state.day;
  if (s.consumes) qs[`due:${s.consumes}`] = 0;  // a follow-up plays once for each time it was set going
  // A choice that needs a particular crew member (not just a role) is hidden without them.
  const present = c => !(c.when && c.when.crew && !ROLE_NAMES[c.when.crew] && !G.state.crew.includes(c.when.crew)) && !(c.when && c.when.post && !CONDITIONS.post(c.when.post));  // and a choice for another post is not shown at all
  return {
    title: fill(s.title), text: fill(s.text), via: s.via, personal: s.personal,
    choices: s.choices.filter(present).map(c => ({
      label: fill(c.label),
      role: c.when && ROLE_NAMES[c.when.crew] ? c.when.crew : undefined,
      can: c.when ? () => meets(c.when) : undefined,
      run() {
        const said = applyEffects(c.effects);
        const next = c.next && STORYLETS.find(x => x.id === c.next);
        if (next) G.nextEvent = storyletEvent(next);
        return [fill(c.result || ''), ...said].filter(Boolean).join(' ');
      },
    })),
  };
}

// Lead straight into a scene that only exists as a second beat (`chained: true`), from code.
function chainTo(id) {
  const next = STORYLETS.find(x => x.id === id);
  if (next) G.nextEvent = storyletEvent(next);
}

// The storylet to play here and now: eligible ones of the highest priority, one at random.
function pickStorylet(where, keep = () => true) {
  const waiting = s => s.every && quality(`last:${s.id}`) && G.state.day - quality(`last:${s.id}`) < s.every;  // `every: days` lets a scene come round again
  const ok = STORYLETS.filter(s => s.where === where && !s.chained && keep(s) && !(s.once && quality(`seen:${s.id}`)) && !waiting(s) && meets(s.when));
  if (!ok.length) return null;
  const top = Math.max(...ok.map(s => s.priority));
  return pick(ok.filter(s => s.priority === top));
}

function journalHtml(limit = 6) {
  const j = G.state.journal || [];
  return j.length ? `<h3>Journal</h3>${j.slice(0, limit).map(e => `<div class="hint">${dateOf(e.day)}: ${esc(e.text)}</div>`).join('')}` : '<h3>Journal</h3><p class="hint">Nothing yet. What you do and what comes of it is kept here.</p>';
}

Mods.register({
  id: 'storylets', name: 'Storylets', builtin: true,
  init(M) {
    M.on('missionDone', m => applyEffects(m.onDone));
    M.on('missionFailed', m => applyEffects(m.onFail));
  },
});
