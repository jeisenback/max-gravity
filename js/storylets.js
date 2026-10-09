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
  // The hired chapter's people (#342): what a main character, a first officer or the captain thinks of you, and what they know. Each value has a shape
  // that EFFECT_SHAPES checks, so a scene cannot be written with one that would throw.
  castLike: v => castLike(v.who, v.n, v.memory),
  castFlag: v => castFlag(v.who, v.flag),
  castXp: v => castXp(v.who, v.role, v.n),
  captainLike: v => captainLike(v.n, v.memory),
  captainFlag: v => { for (const f of [].concat(v)) captainFlag(f); },
  // The shipmate a hired event is about (#473), given to the effects as their context: their opinion of you, and a name to remember them by for a later
  // scene ({thread:key}). Both do nothing outside an event that has a shipmate.
  mateLike: (v, ctx) => { if (ctx && ctx.mate) like(ctx.mate, v.n, v.memory); },
  remember: (key, ctx) => { if (ctx && ctx.mate) remember(key, ctx.mate); },
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
function applyEffects(effects = {}, ctx) {
  const said = [];
  for (const [k, v] of Object.entries(effects)) {
    const r = EFFECTS[k](v, ctx);
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

// ---------- the scene editor's changes (js/overrides.js, #336) ----------
// {planet}, {system}, {captain}, {crew}, {crew:role} and {thread:key}: what fill() and the dialog replace. Any other {word} is left as typed.
const PLACEHOLDER = /^\{(?:planet|system|captain|crew|mate|crew:(\w+)|thread:\w+)\}$/;  // {mate} is filled by a hired event written as data (hiredevents.js), for the shipmate it is about
const unknownPlaceholders = text => (String(text).match(/\{[^{}]*\}/g) || []).filter(t => { const m = PLACEHOLDER.exec(t); return !m || !!(m[1] && !ROLE_NAMES[m[1]]); });

// The scene as the file changes it: its conditions, and each choice's conditions, effects and `next` link, where the file names them. The
// words are not part of this (storyletEvent puts those in), so a scene with no such changes is the scene itself.
function sceneView(s) {
  const o = sceneOverride(s.id), cs = o.choices || {};
  if (o.when === undefined && !Object.values(cs).some(c => c.when !== undefined || c.effects !== undefined || c.next !== undefined)) return s;
  return { ...s, when: o.when !== undefined ? o.when : s.when, choices: s.choices.map((c, i) => ({ ...c, ...pickDefined(cs[i], ['when', 'effects', 'next']) })) };
}
const pickDefined = (o, keys) => Object.fromEntries(keys.filter(k => o && o[k] !== undefined).map(k => [k, o[k]]));

// The file's changes with everything wrong left out: { id: { title, text, when, choices: { index: { label, result, when, effects, next } } } }.
// All the problems are said together in one warning. A word must be a non-empty string; an id must be a scene and an index one of its
// choices. Conditions and effects are held to the check addStorylet makes (storyletProblems), and a `next` must be a scene: a scene's changes
// to them that fail it are all left out, so the file can never make a scene addStorylet would refuse.
function cleanOverrides(raw) {
  const out = {}, bad = [];
  const isObj = v => !!v && typeof v === 'object' && !Array.isArray(v);
  const text = (where, v) => (typeof v === 'string' && v.trim() ? true : (bad.push(`${where} is not text`), false));
  const STRUCT = ['when', 'effects', 'next'];
  if (!isObj(raw)) { if (raw !== undefined) bad.push('the overrides are not an object'); raw = {}; }
  for (const [id, o] of Object.entries(raw)) {
    const s = STORYLETS.find(x => x.id === id), rs = s ? null : registryScene(id), scene = s || rs;  // a storylet, or a hired scene of the registry
    if (!scene) { bad.push(`unknown scene "${id}"`); continue; }
    if (!isObj(o)) { bad.push(`"${id}" is not an object`); continue; }
    const mine = {}, pre = `"${id}"`;
    for (const [k, v] of Object.entries(o)) {
      if ((k === 'title' || k === 'text') && text(`${pre}.${k}`, v)) mine[k] = v;
      else if (k === 'weight' || k === 'every' || k === 'off') {
        const why = rs ? 'a hired scene is drawn by its days and the story, not by weight' : s.priority > 0 ? 'a story scene is picked by priority, not by weight'
          : k === 'weight' ? (Number.isFinite(v) && v >= 0 && v <= 100 ? '' : 'needs a number from 0 to 100')
          : k === 'every' ? (!Number.isInteger(v) || v < 0 || v > 365 ? 'needs a whole number of days from 0 to 365' : s.once ? 'plays once, so it has no cooldown' : '')
          : v === true ? '' : 'needs true';
        if (why) bad.push(`${pre}.${k} ${why}`); else mine[k] = v;
      } else if (k === 'when') { if (rs) bad.push(`${pre} has no "when" (a hired scene plays by its days, not by conditions)`); else if (isObj(v)) mine.when = v; else bad.push(`${pre}.when is not an object`); }
      else if (k === 'choices' && isObj(v)) {
        for (const [i, c] of Object.entries(v)) {
          if (!/^\d+$/.test(i) || Number(i) >= scene.choices.length) { bad.push(`${pre} has no choice ${i}`); continue; }
          if (!isObj(c)) { bad.push(`${pre} choice ${i} is not an object`); continue; }
          for (const [f, x] of Object.entries(c)) {
            const slot = () => { mine.choices = mine.choices || {}; return (mine.choices[i] = mine.choices[i] || {}); };
            if (rs && (f === 'when' || f === 'next')) { bad.push(`${pre} choice ${i} has no "${f}" (a hired scene plays by its days, not by conditions)`); continue; }
            if (rs && f === 'effects' && rs.choices[i].run) { bad.push(`${pre} choice ${i} runs code, so its effects are not edited`); continue; }
            if ((f === 'label' || f === 'result') && text(`${pre} choice ${i} ${f}`, x)) slot()[f] = x;
            else if ((f === 'when' || f === 'effects') && isObj(x)) slot()[f] = x;
            else if (f === 'next' && (x === null || (typeof x === 'string' && STORYLETS.some(y => y.id === x)))) slot().next = x;
            else if (f !== 'label' && f !== 'result') bad.push(`${pre} choice ${i} ${f === 'next' ? 'leads to a scene that is not there' : STRUCT.includes(f) ? `.${f} is not an object` : `has no "${f}"`}`);
          }
        }
      } else if (k !== 'title' && k !== 'text' && k !== 'weight' && k !== 'every' && k !== 'off') bad.push(`${pre} has no "${k}"`);
    }
    // The conditions, effects and links together, as the scene would be: if the game would refuse it, none of them go in.
    const changes = (mine.when !== undefined ? 1 : 0) + Object.values(mine.choices || {}).filter(c => STRUCT.some(f => c[f] !== undefined)).length;
    if (changes && rs) {  // a hired scene: only the effects of its data choices, held to the same shapes
      const problems = Object.values(mine.choices || {}).flatMap(c => effectProblems(c.effects));
      if (problems.length) {
        bad.push(`${pre} effects left out: ${problems.join('; ')}`);
        for (const c of Object.values(mine.choices || {})) delete c.effects;
        for (const [i, c] of Object.entries(mine.choices || {})) if (!Object.keys(c).length) delete mine.choices[i];
        if (mine.choices && !Object.keys(mine.choices).length) delete mine.choices;
      }
    } else if (changes) {
      const view = { ...s, when: mine.when !== undefined ? mine.when : s.when, choices: s.choices.map((c, i) => ({ ...c, ...pickDefined((mine.choices || {})[i], STRUCT) })) };
      const problems = storyletProblems(view, { duplicate: false });
      if (problems.length) {
        bad.push(`${pre} conditions, effects and links left out: ${problems.join('; ')}`);
        delete mine.when;
        for (const c of Object.values(mine.choices || {})) for (const f of STRUCT) delete c[f];
        for (const [i, c] of Object.entries(mine.choices || {})) if (!Object.keys(c).length) delete mine.choices[i];
        if (mine.choices && !Object.keys(mine.choices).length) delete mine.choices;
      }
    }
    if (Object.keys(mine).length) out[id] = mine;
  }
  if (bad.length) console.warn(`Scene overrides (js/overrides.js): ${bad.join('; ')}`);
  return out;
}

// How often a storylet comes up (#341): its weight among the eligible scenes of its priority (1 unless it says), the days before it can come round
// again (`every`, for a scene that plays more than once), and whether the editor has switched it off. The file's `weight`, `every` and `off` replace the
// scene's own. A story scene (priority above 0) is picked by priority, not by weight, so only a color scene's can be changed.
function sceneRate(s) {
  const o = sceneOverride(s.id);
  return { weight: o.weight !== undefined ? o.weight : s.weight === undefined ? 1 : s.weight, every: o.every !== undefined ? o.every : s.every || 0, off: !!o.off };
}

// A scene of the hired chapter that is not a storylet (a main character's, a first officer's or a captain's, or a hired event written as data), by its id in js/hiredscenes.js.
const registryScene = id => { const e = /^(cast|captain|hired):/.test(id) && hiredSceneRegistry().find(x => x.id === id); return e && e.scene ? e.scene : null; };

// The file's words and effects put on a hired scene as the game builds it (#342). `scene` is { title, text, choices }, a choice either data ({ label, result,
// effects }) or code (a run() that returns its result line). The title and the labels are escaped by the dialog; the text and the results are not, so an override's
// are escaped here. A code choice's override result replaces the line it returns and its effects stay in code. A scene the file does not name comes back as it was.
function sceneWords(id, scene) {
  const o = id ? sceneOverride(id) : {}, cs = o.choices || {};
  if (!Object.keys(o).length) return scene;
  return {
    ...scene, title: o.title || scene.title, text: o.text ? esc(o.text) : scene.text,
    choices: scene.choices.map((c, i) => {
      const co = cs[i];
      if (!co) return c;
      const out = { ...c };
      if (co.label) out.label = co.label;
      if (co.effects && !c.run) out.effects = co.effects;
      if (co.result) { const line = esc(co.result), run = c.run; if (run) out.run = function () { run.call(this); return line; }; else out.result = line; }
      return out;
    }),
  };
}

// Cleaned once, on the first scene built or the first game started, so a mod's scenes are there to be named.
let sceneOverrides = null;
const useOverrides = raw => { sceneOverrides = cleanOverrides(raw); return sceneOverrides; };
const sceneOverride = id => (sceneOverrides || useOverrides(SCENE_OVERRIDES))[id] || {};

// ---------- the engine ----------
// The shape each of the hired chapter's effects takes: '' if the value is right, else what is wrong. Checked wherever effects are checked.
const isPlain = v => !!v && typeof v === 'object' && !Array.isArray(v);
const EFFECT_SHAPES = {
  castLike: v => (!isPlain(v) ? 'needs { who, n, memory }' : !CAST[v.who] ? `${v.who} is not a main character or first officer` : !Number.isFinite(v.n) ? 'n must be a number' : typeof v.memory !== 'string' || !v.memory.trim() ? 'memory must be some text' : ''),
  castFlag: v => (!isPlain(v) ? 'needs { who, flag }' : !CAST[v.who] ? `${v.who} is not a main character or first officer` : typeof v.flag !== 'string' || !v.flag.trim() ? 'flag must be a name' : ''),
  castXp: v => (!isPlain(v) ? 'needs { who, role, n }' : !CAST[v.who] ? `${v.who} is not a main character or first officer` : typeof v.role !== 'string' || !v.role ? 'role must be a post' : !Number.isFinite(v.n) ? 'n must be a number' : ''),
  captainLike: v => (!isPlain(v) ? 'needs { n, memory }' : !Number.isFinite(v.n) ? 'n must be a number' : typeof v.memory !== 'string' || !v.memory.trim() ? 'memory must be some text' : ''),
  captainFlag: v => ([].concat(v).every(f => typeof f === 'string' && f.trim()) ? '' : 'needs a name, or a list of names'),
  mateLike: v => (!isPlain(v) ? 'needs { n, memory }' : !Number.isFinite(v.n) ? 'n must be a number' : typeof v.memory !== 'string' || !v.memory.trim() ? 'memory must be some text' : ''),
  remember: v => (typeof v === 'string' && v.trim() ? '' : 'needs a name'),
};
const effectProblems = effects => Object.entries(effects || {}).flatMap(([k, v]) => (!EFFECTS[k] ? [`unknown effect "${k}"`] : EFFECT_SHAPES[k] && EFFECT_SHAPES[k](v) ? [`effect ${k} ${EFFECT_SHAPES[k](v)}`] : []));

// What is wrong with a storylet, as a list of lines (empty when addStorylet would take it). The scene editor's changes are held to the same check.
function storyletProblems(def, { duplicate = true } = {}) {
  const bad = [];
  if (!def || !def.id || !def.title || !def.text || !Array.isArray(def.choices) || !def.choices.length) bad.push('needs id, title, text, and choices');
  if (def && !['port', 'transit'].includes(def.where)) bad.push('where must be "port" or "transit"');
  if (def && def.weight !== undefined && !(Number.isFinite(def.weight) && def.weight >= 0)) bad.push('weight must be a number of 0 or more');
  if (def && def.every !== undefined && !(Number.isInteger(def.every) && def.every >= 0)) bad.push('every must be a whole number of days');
  if (def && def.via && !VIA_LABELS[def.via]) bad.push('via must be "station", "ship", "message" or "crew"');
  const check = (obj, table, what) => Object.keys(obj || {}).forEach(k => { if (!table[k]) bad.push(`unknown ${what} "${k}"`); });
  if (def) {
    check(def.when, CONDITIONS, 'condition');
    for (const c of def.choices || []) {
      check(c.when, CONDITIONS, 'condition'); check(c.effects, EFFECTS, 'effect');
      for (const [k, v] of Object.entries(c.effects || {})) if (EFFECT_SHAPES[k] && EFFECT_SHAPES[k](v)) bad.push(`effect ${k} ${EFFECT_SHAPES[k](v)}`);
      for (const v of Object.values(c.effects || {})) if (v && v.onDone) check(v.onDone, EFFECTS, 'effect');  // a mission's effects on delivery
    }
  }
  if (duplicate && STORYLETS.some(s => s.id === (def && def.id))) bad.push('duplicate id');
  return bad;
}

function addStorylet(def, source = 'core') {
  const bad = storyletProblems(def);
  if (bad.length) return console.error(`Storylet "${def && def.id}" (${source}): ${bad.join('; ')}`);
  STORYLETS.push({ once: true, priority: 0, ...def });
}

// The scenes the editor wrote (js/overrides.js NEW_SCENES): added to the game's through addStorylet, so the same check holds for them. Calling it
// again replaces the ones it added before, which is how the editor's preview plays a scene that is not saved yet.
let newSceneIds = [], newScenesLoaded = false;
function useNewScenes(list) {
  for (const id of newSceneIds) { const i = STORYLETS.findIndex(s => s.id === id); if (i >= 0) STORYLETS.splice(i, 1); }
  newSceneIds = [];
  newScenesLoaded = true;
  for (const def of Array.isArray(list) ? list : []) {
    const before = STORYLETS.length;
    addStorylet(def, 'js/overrides.js');
    if (STORYLETS.length > before) newSceneIds.push(def.id);
  }
}

// The dialog for a storylet, in the shape openEvent expects. A choice that needs a
// crew role is hidden when nobody aboard fills it, and {crew} in its label names them.
function storyletEvent(s) {
  const qs = G.state.qualities = G.state.qualities || {};
  if (s.once) qs[`seen:${s.id}`] = 1;
  if (s.every) qs[`last:${s.id}`] = G.state.day;
  if (s.consumes) qs[`due:${s.consumes}`] = 0;  // a follow-up plays once for each time it was set going
  // A choice that needs a particular crew member (not just a role) is hidden without them.
  const view = sceneView(s);  // the file's conditions, effects and links, if it changes any
  const present = c => !(c.when && c.when.crew && !ROLE_NAMES[c.when.crew] && !G.state.crew.includes(c.when.crew)) && !(c.when && c.when.post && !CONDITIONS.post(c.when.post));  // and a choice for another post is not shown at all
  // The editor's words, by the choice's place in the list. The title and the labels are escaped by the dialog's template; the text and the
  // results go in as markup (the shipped ones are ours), so an override's are escaped here: they come from a file anyone can edit.
  const o = sceneOverride(s.id), mine = (i, field) => ((o.choices || {})[i] || {})[field];
  return {
    title: fill(o.title || s.title), text: fill(o.text ? esc(o.text) : s.text), via: s.via, personal: s.personal,
    choices: view.choices.map((c, i) => [c, i]).filter(([c]) => present(c)).map(([c, i]) => ({
      label: fill(mine(i, 'label') || c.label),
      role: c.when && ROLE_NAMES[c.when.crew] ? c.when.crew : undefined,
      can: c.when ? () => meets(c.when) : undefined,
      run() {
        const said = applyEffects(c.effects);
        const next = c.next && STORYLETS.find(x => x.id === c.next);
        if (next) G.nextEvent = storyletEvent(next);
        return [fill(mine(i, 'result') ? esc(mine(i, 'result')) : c.result || ''), ...said].filter(Boolean).join(' ');
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
  const waiting = s => sceneRate(s).every && quality(`last:${s.id}`) && G.state.day - quality(`last:${s.id}`) < sceneRate(s).every;  // `every: days` lets a scene come round again
  const ok = STORYLETS.filter(s => s.where === where && !s.chained && keep(s) && !sceneRate(s).off && sceneRate(s).weight > 0 && !(s.once && quality(`seen:${s.id}`)) && !waiting(s) && meets(sceneView(s).when));
  if (!ok.length) return null;
  const top = Math.max(...ok.map(s => s.priority)), level = ok.filter(s => s.priority === top);
  // By weight: with every weight 1 this is the pick it always was (one draw, the same index).
  let r = Math.random() * level.reduce((n, s) => n + sceneRate(s).weight, 0);
  for (const s of level) { if ((r -= sceneRate(s).weight) < 0) return s; }
  return level[level.length - 1];
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
    M.on('stateReady', () => { if (!newScenesLoaded) useNewScenes(NEW_SCENES); if (!sceneOverrides) useOverrides(SCENE_OVERRIDES); });  // the warning about the file comes with the first game, not the first scene
  },
});
