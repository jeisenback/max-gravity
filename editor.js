'use strict';

// The scene index (#335) and the text form (#336): a list of every scene in the game, for the designer, and for a data scene a form for its
// title, text, choice labels and results beside the shipped words. Open editor.html. It is not linked from the game and never writes to the
// repo or a save: the changes it shows are what js/overrides.js would hold. It loads the game's own scripts (not game.js) in two hidden frames of itself, one in the
// full scope and one in the narrow build's, reads the scene registries, and the page shows the rows. A scene the narrow build leaves
// out is marked off. Everything is in one function so its names cannot clash with the game's, which share one global scope.
(function () {
  // index.html's scripts, in its order, without game.js; tests/editor.test.js checks the two lists agree.
  const SCRIPTS = [
  'js/build.js', 'js/data.js', 'js/util.js', 'js/gates.js', 'js/orbits.js', 'js/market.js', 'js/mods.js', 'js/ui.js',
  'js/views.js', 'js/factions.js', 'js/transit.js', 'js/burnpanel.js', 'js/crew.js', 'js/peopletext.js', 'js/people.js',
  'js/hail.js', 'js/story.js', 'js/touch.js', 'js/art.js', 'js/audio.js', 'js/music.js', 'js/tutorial.js', 'js/world.js',
  'js/company.js', 'js/shiplife.js', 'js/hulldetail.js', 'js/familytext.js', 'js/family.js', 'js/calendar.js', 'js/social.js',
  'js/bar.js', 'js/bartopics.js', 'js/outpost.js', 'js/legacy.js', 'js/torpedoes.js', 'js/boarding.js', 'js/engage.js',
  'js/duel.js', 'js/console.js', 'js/stations.js', 'js/autopilot.js', 'js/engineering.js', 'js/comms.js', 'js/journal.js',
  'js/web.js', 'js/wear.js', 'js/projects.js', 'js/programs.js', 'js/hired.js', 'js/suggest.js', 'js/repairs.js', 'js/jobs.js',
  'js/awayjobs.js', 'js/losses.js', 'js/hiredeventstext.js', 'js/hiredevents.js', 'js/bridge.js', 'js/shell.js',
  'js/character.js', 'js/interview.js', 'js/cast.js', 'js/captains.js', 'js/stakes.js', 'js/boarders.js', 'js/engagements.js',
  'js/shipcombat.js', 'js/yardoffice.js', 'js/icerun.js', 'js/ties.js', 'js/captains/hester.js', 'js/captains/cato.js',
  'js/captains/dov.js', 'js/captains/ilsa.js', 'js/captains/imre.js', 'js/captains/pilar.js', 'js/captains/zoya.js',
  'js/captains/ansel.js', 'js/fate.js', 'js/signon.js', 'js/castbar.js', 'js/regulars.js', 'js/barwork.js', 'js/overrides.js', 'js/storylets.js',
  'js/happenings.js', 'js/stories/ice-strike.js', 'js/stories/mars-navy.js', 'js/stories/rook-crown.js',
  'js/stories/tethys.js', 'js/stories/cold-water.js', 'js/stories/landings.js', 'js/stories/ports.js',
  'js/stories/on-the-road.js', 'js/stories/aftermath.js', 'js/stories/hired-aftermath.js', 'js/community.js', 'js/uat.js',
  'js/help.js', 'js/menu.js', 'js/a11y.js',
  ];

  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  // Text in a scene is a string or a list of parts, each a string or { when, text, else }. As plain text, a part with a condition says so.
  function plain(text) {
    if (!Array.isArray(text)) return text === undefined || text === null ? '' : String(text);
    return text.map(p => (typeof p === 'string' ? p
      : `[if ${JSON.stringify(p.when || {})}] ${p.text || ''}${p.else ? ` [otherwise] ${p.else}` : ''}`)).filter(Boolean).join(' ');
  }

  // ---------- reading the game (inside a frame that has loaded its scripts) ----------
  const CODE_RESULTS = 'The choices run code. Their result lines are written inside functions and are not shown here.';
  const CODE_TEXT = 'The text of this scene is built from the game state when it plays (the hull, the drive, who is aboard). It is written in code and is not shown here. The choices run code too, and their result lines are not shown.';
  const CODE_ALL = 'This scene is built in code. Its title and text are written inside a function and are not shown here.';
  const stem = file => file.replace(/^.*\//, '').replace(/\.js$/, '');
  const labelOf = c => (typeof c.label === 'string' ? c.label : '(built in code)');
  const codeChoices = list => (list || []).map(c => ({ label: labelOf(c), result: '' }));
  // The text and note of a scene whose choices run code. A text that reads the game state cannot be read without a game.
  function codeScene(s) {
    try { return { text: plain(s.text), choices: codeChoices(s.choices), codeNote: CODE_RESULTS }; } catch (e) { return { text: '', choices: codeChoices(s.choices), codeNote: CODE_TEXT }; }
  }
  const outcome = (win, lose) => `If it goes well: ${win}\nIf it does not: ${lose}`;

  // fileOf: where each registry entry was first seen, by the script that added it (see loadGame).
  function collect(fileOf) {
    // What the narrow build keeps (build.js SCOPE_OFF): the one captain (captains.js), the Earth start's main characters (menu.js) and
    // that captain's first officer, and the one post (hired.js).
    const captainOn = key => !scopeOff('captains') || key === 'hester';
    const castOn = key => (CAST[key].xo ? !scopeOff('captains') || CAPTAINS.hester.xo === key : !scopeOff('starts') || CAST_PAIRS.earth.includes(key));
    const postOn = post => !post || !scopeOff('posts') || post === 'gunner';
    const rows = [];
    const add = r => rows.push({ on: true, kind: 'code', where: 'transit', codeNote: '', ...r });

    for (const s of STORYLETS) {
      const file = fileOf['storylet:' + s.id];
      add({
        id: s.id, title: s.title, where: s.where, file, belongs: stem(file), kind: 'data', text: plain(s.text), when: s.when || {},
        choices: s.choices.map(c => ({ label: plain(c.label), result: plain(c.result) })),
        // A text of conditional parts cannot be edited as one string, so the form leaves those fields to the code (conditions are story 4).
        edit: { text: typeof s.text === 'string', choices: s.choices.map(c => ({ label: typeof c.label === 'string', result: c.result === undefined || typeof c.result === 'string' })) },
      });
    }

    for (const [key, c] of Object.entries(CAST)) {
      const file = fileOf['cast:' + key], on = castOn(key);
      for (const [name, sc] of Object.entries(c.scenes)) {
        for (const [part, s] of [['', sc], [':closed', sc.closed]]) {
          if (s) add({ id: `cast:${key}:${name}${part}`, title: s.title, where: name === 'meet' ? 'port' : 'transit', file, belongs: `${key} (${c.xo ? 'first officer' : 'main character'})`, on, ...codeScene(s) });
        }
      }
    }

    for (const [key, c] of Object.entries(CAPTAINS)) {
      const file = fileOf['captain:' + key], on = captainOn(key), belongs = `${key} (captain)`;
      const scene = (id, s, where = 'transit') => add({ id: `captain:${key}:${id}`, title: s.title, where, file, belongs, on, ...codeScene(s) });
      if (c.scenes.trouble) scene('trouble', c.scenes.trouble);
      if (c.scenes.secret) { scene('secret:confide', c.scenes.secret.confide); scene('secret:found', c.scenes.secret.found); }
      const g = c.goodbye;
      if (g) {
        const parts = ['cold', 'neutral', 'warm', 'crew', 'secret', 'xo', 'xoDead', 'repaid', 'parting'].filter(k => g[k]).map(k => `[${k}] ${g[k]}`);
        scene('goodbye', { title: g.title, text: parts.join('\n'), choices: g.choices }, 'port');
      }
    }

    for (const d of WORK_EVENTS) {
      add({
        id: 'hired:' + d.id, title: d.title, file: fileOf.work, belongs: `${d.post} (post)`, on: postOn(d.post), text: d.text,
        choices: [{ label: d.careful[0], result: d.careful[1] }, { label: d.quick[0], result: outcome(d.quick[1], d.quick[2]) }],
      });
    }
    for (const d of HAND_EVENTS.filter(x => x.group !== 'work')) {
      add({ id: 'hired:' + d.id, title: d.id, file: fileOf.hand, belongs: `${d.group} (hired event)`, on: postOn(d.post), text: '', choices: [], codeNote: CODE_ALL });
    }

    ICE_STAGES.forEach((st, i) => {
      const choice = (label, c) => ({ label, result: outcome(c.win[2], c.lose[2]) });
      add({
        id: `ice:${i + 1}`, title: st.title, file: fileOf.ice, belongs: 'ice run', text: st.open.map((t, n) => `Version ${n + 1}: ${t}`).join('\n'),
        choices: [...st.general.map(c => choice(c.label, c)), ...Object.entries(st.post).map(([post, c]) => choice(`[${post}] ${c.label}`, c))],
      });
    });
    return rows;
  }

  const loadScript = src => new Promise((resolve, reject) => {
    const el = document.createElement('script');
    el.src = src; el.async = false;
    el.onload = resolve; el.onerror = () => reject(new Error(`could not load ${src}`));
    document.head.append(el);
  });

  // What the preview's state form offers: the game's own lists.
  const previewOptions = () => ({
    posts: HIRED_POSTS, factions: FACTIONS,
    pairs: Object.entries(CAST_PAIRS).map(([key, pair]) => ({ key, names: pair.map(c => CAST[c].first).join(' and ') })),
    captains: Object.entries(CAPTAINS).map(([key, c]) => ({ key, name: `${c.first} ${c.last}`, xo: c.xo })),
    places: Object.entries(SYSTEMS).flatMap(([sid, s]) => s.planets.map(p => ({ name: p.name, sid }))),
  });

  // Loads the game's scripts one at a time and notes which script added each scene, by what appeared after it ran.
  async function loadGame() {
    const fileOf = {}, cast = new Set(), captains = new Set();
    let storylets = 0;
    for (const src of SCRIPTS) {
      await loadScript(src);
      if (typeof STORYLETS !== 'undefined') for (; storylets < STORYLETS.length; storylets++) fileOf['storylet:' + STORYLETS[storylets].id] = src;
      if (typeof CAST !== 'undefined') for (const k of Object.keys(CAST)) if (!cast.has(k)) { cast.add(k); fileOf['cast:' + k] = src; }
      if (typeof CAPTAINS !== 'undefined') for (const k of Object.keys(CAPTAINS)) if (!captains.has(k)) { captains.add(k); fileOf['captain:' + k] = src; }
      if (typeof WORK_EVENTS !== 'undefined' && !fileOf.work) fileOf.work = src;
      if (typeof HAND_EVENTS !== 'undefined' && !fileOf.hand) fileOf.hand = src;
      if (typeof ICE_STAGES !== 'undefined' && !fileOf.ice) fileOf.ice = src;
    }
    return { rows: collect(fileOf), overrides: useOverrides(SCENE_OVERRIDES), placeholder: { source: PLACEHOLDER.source, roles: Object.keys(ROLE_NAMES) }, options: previewOptions() };
  }

  // ---------- the preview, inside editor-preview.html: the game itself ----------
  // The page loads the whole game, game.js too, so a scene opens in the game's own dialog, built by storyletEvent. What the game writes
  // stays in this frame: its storage is a memory that goes with the frame, so a preview never touches a real save.
  function memoryStorage() {
    const kept = new Map();
    return {
      getItem: k => (kept.has(String(k)) ? kept.get(String(k)) : null), setItem: (k, v) => { kept.set(String(k), String(v)); }, removeItem: k => { kept.delete(String(k)); },
      clear: () => kept.clear(), key: i => [...kept.keys()][i] ?? null, get length() { return kept.size; },
    };
  }

  // What a choice can change that the designer cares about, as one flat list of names and values.
  function watched() {
    const st = G.state, out = { credits: st.credits, day: st.day };
    const take = (prefix, obj) => { for (const [k, v] of Object.entries(obj || {})) if (['number', 'boolean', 'string'].includes(typeof v) && !/^(seen|last):/.test(k)) out[`${prefix} ${k}`] = v; };
    take('standing with', st.rep); take('quality', st.qualities); take('story', st.story); take('hired flag', st.hired && st.hired.flags);
    for (const p of Object.values(st.people || {})) if (typeof p.opinion === 'number') out[`${p.first} ${p.last}'s opinion of you`] = p.opinion;
    return out;
  }
  function changesBetween(before, after) {
    const lines = [];
    for (const k of Object.keys({ ...before, ...after })) {
      const a = before[k], b = after[k];
      if (a === b) continue;
      lines.push(typeof b === 'number' && (typeof a === 'number' || a === undefined) ? `${k}: ${a === undefined ? 0 : a} to ${b} (${b - (a || 0) > 0 ? '+' : ''}${b - (a || 0)})` : `${k}: ${a === undefined ? 'unset' : a} to ${b === undefined ? 'unset' : b}`);
    }
    return lines;
  }

  // Which of a scene's conditions do not hold now, as the game checks them. `chance` is a roll when the scene is picked, so it is not one.
  const failing = when => Object.entries(when || {}).filter(([k]) => k !== 'chance').filter(([k, v]) => { try { return !CONDITIONS[k](v); } catch (e) { return true; } }).map(([k, v]) => `${k}: ${JSON.stringify(v)}`);

  // Starts a fresh test game in the state asked for, and opens the scene in the dialog. m: { id, overrides, setup }.
  function play(m) {
    const s = STORYLETS.find(x => x.id === m.id);
    if (!s) return { error: `The game has no scene "${m.id}".` };
    useOverrides(m.overrides);  // the unsaved edits, through the same layer the game reads (storylets.js)
    const o = m.setup || {}, num = (v, d) => (Number.isFinite(Number(v)) && String(v).trim() !== '' ? Number(v) : d);
    const place = planetNamed(o.place) ? o.place : 'Earth', at = planetNamed(place);
    G.dialog = null; G.nextEvent = null; G.transit = null;
    if (o.as === 'owner') uatFresh({ credits: num(o.credits, 50000) });
    else {
      // The game draws its two main characters from a pool; a preview takes the pair asked for.
      const pair = CAST_PAIRS[o.start] || CAST_PAIRS.earth, drawn = drawCastPair;
      window.drawCastPair = () => [...pair];
      try { startGame({ mode: 'hired', background: 'earth', post: o.post, captainKey: o.captain, credits: num(o.credits, undefined) }); } finally { window.drawCastPair = drawn; }
      G.dialog = null; G.nextEvent = null; G.state.uat = true;
    }
    // A scene in a burn is played on the way to the place (its `at` is the destination); one at a port, landed there.
    if (s.where === 'transit') uatBurn(at.sid === 'earth' ? 'Mars' : 'Earth', at.sid); else uatLand(place);
    const st = G.state;
    if (o.credits !== undefined && String(o.credits).trim() !== '') st.credits = num(o.credits, st.credits);
    if (String(o.day || '').trim() !== '') st.day = Math.max(1, num(o.day, st.day));
    for (const f of FACTIONS) if (o.rep && String(o.rep[f] || '').trim() !== '' && Number.isFinite(Number(o.rep[f]))) st.rep[f] = Number(o.rep[f]);
    for (const line of String(o.qualities || '').split('\n')) {
      const [name, value] = line.split('=').map(x => x.trim());
      if (name) (st.qualities = st.qualities || {})[name] = value === undefined || value === '' ? 1 : Number.isFinite(Number(value)) ? Number(value) : 1;
    }
    const report = { type: 'played', failing: failing(s.when), chained: !!s.chained, chance: (s.when || {}).chance, shut: s.choices.map((c, i) => ({ n: i + 1, why: failing(c.when) })).filter(x => x.why.length) };
    openEvent(storyletEvent(s));
    return report;
  }

  async function startPreview() {
    Object.defineProperty(window, 'localStorage', { value: memoryStorage(), configurable: true });
    for (const src of [...SCRIPTS, 'js/game.js']) await loadScript(src);
    // The game starts at its title screen; wait for it, then answer the editor.
    while (G.mode !== 'title' && !G.state) await new Promise(r => setTimeout(r, 20));
    const real = chooseEvent;  // reports what a choice changed, from the game's own function
    window.chooseEvent = i => {
      const label = G.dialog && G.dialog.choices[i] ? G.dialog.choices[i].label : '', before = watched();
      const text = real(i);
      parent.postMessage({ mode: 'preview', type: 'chose', label, lines: changesBetween(before, watched()) }, '*');
      return text;
    };
    window.addEventListener('message', ev => {
      if (ev.source !== parent || !ev.data || ev.data.cmd !== 'play') return;
      let out;
      try { out = play(ev.data); } catch (e) { out = { error: String(e && e.message || e) }; }
      parent.postMessage({ mode: 'preview', ...out }, '*');
    });
    parent.postMessage({ mode: 'preview', type: 'ready' }, '*');
  }

  // ---------- the page ----------
  const haystack = r => [r.id, r.title, r.text, ...r.choices.flatMap(c => [c.label, c.result])].join('\n').toLowerCase();
  // Every word typed must appear in the id, the title, the text, or a choice or its result.
  function filterRows(rows, { q = '', where = '', file = '', kind = '' } = {}) {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    return rows.filter(r => (!where || r.where === where) && (!file || r.file === file) && (!kind || r.kind === kind) && words.every(w => haystack(r).includes(w)));
  }

  // Ids and paths come from the page's messages and the form, so the maps keyed by them have no prototype to change.
  const dict = () => Object.create(null);

  // The fields of a data scene's form, named by a path: 'title', 'text', and 'c0.label' and 'c0.result' for the first choice.
  const pathsOf = r => ['title', 'text', ...r.choices.flatMap((c, i) => [`c${i}.label`, `c${i}.result`])];
  const CHOICE_PATH = /^c(\d+)\.(label|result)$/;
  const shippedOf = (r, path) => { const m = CHOICE_PATH.exec(path); return m ? r.choices[m[1]][m[2]] : r[path]; };
  const editableOf = (r, path) => { const m = CHOICE_PATH.exec(path); return !r.edit ? false : m ? r.edit.choices[m[1]][m[2]] : path === 'title' || r.edit[path]; };

  // What js/overrides.js would hold for the values typed: only what differs from the shipped words, an empty field counting as not changed.
  // values: { sceneId: { path: text } }.
  function overridesFrom(rows, values) {
    const out = dict();
    for (const r of rows.filter(x => values[x.id])) {
      for (const path of pathsOf(r)) {
        const v = values[r.id][path];
        if (typeof v !== 'string' || !v.trim() || v === shippedOf(r, path) || !editableOf(r, path)) continue;
        const o = out[r.id] = out[r.id] || dict(), m = CHOICE_PATH.exec(path);
        if (m) { o.choices = o.choices || dict(); (o.choices[m[1]] = o.choices[m[1]] || dict())[m[2]] = v; } else o[path] = v;
      }
    }
    return out;
  }
  // The other way: the values to start from, for the changes the file already holds.
  function valuesFrom(overrides) {
    const values = dict();
    for (const [id, o] of Object.entries(overrides || {})) {
      const v = values[id] = dict();
      if (o.title) v.title = o.title;
      if (o.text) v.text = o.text;
      for (const [i, c] of Object.entries(o.choices || {})) for (const f of ['label', 'result']) if (c[f]) v[`c${i}.${f}`] = c[f];
    }
    return values;
  }
  const fileText = overrides => `const SCENE_OVERRIDES = ${JSON.stringify(overrides, null, 2)};`;

  // The {words} of a text that the game would not replace, by the rule the game sent (storylets.js PLACEHOLDER): the same check, run here.
  let rule = null, onPreview = () => {};
  function badPlaceholders(text) {
    if (!rule) return [];
    const known = new RegExp(rule.source);
    return (String(text).match(/\{[^{}]*\}/g) || []).filter(t => { const m = known.exec(t); return !m || !!(m[1] && !rule.roles.includes(m[1])); });
  }
  const flagOf = v => (!v.trim() ? 'Empty: the shipped words are used.' : badPlaceholders(v).length ? `Not a placeholder the game replaces: ${badPlaceholders(v).join(' ')}` : '');

  const paragraphs = text => text.split('\n').filter(Boolean).map(p => `<p>${esc(p)}</p>`).join('');
  const tableHtml = (rows, selected = '', edited = new Set()) => (rows.length ? `<table>
    <thead><tr><th>Id</th><th>Title</th><th>Where</th><th>Source</th><th>Belongs to</th><th>Kind</th></tr></thead>
    <tbody>${rows.map(r => `<tr class="${r.id === selected ? 'on' : ''}"><td><button data-id="${esc(r.id)}">${esc(r.id)}</button></td>
      <td>${esc(r.title)}${r.off ? ' <span class="off">off in the narrow build</span>' : ''}${edited.has(r.id) ? ' <span class="edited">edited</span>' : ''}</td><td>${esc(r.where)}</td><td>${esc(r.file)}</td><td>${esc(r.belongs)}</td><td>${esc(r.kind)}</td></tr>`).join('')}</tbody>
  </table>` : '<p class="hint">No scene matches.</p>');

  // One field of the form: the shipped words, and below them the box for yours. A field the form cannot edit shows only the shipped words.
  function fieldHtml(r, path, label, value) {
    const shipped = shippedOf(r, path), editable = editableOf(r, path);
    return `<div class="field">
      <label for="f-${esc(path)}">${esc(label)}</label>
      <div class="shipped"><span class="hint">Shipped</span>${shipped ? paragraphs(shipped) : '<p class="hint">(none)</p>'}</div>
      ${editable ? `<textarea id="f-${esc(path)}" data-path="${esc(path)}" rows="${Math.max(2, Math.ceil((value || shipped || '').length / 60))}">${esc(value === undefined ? shipped : value)}</textarea>
        <div class="warn" data-warn="${esc(path)}" role="status">${esc(value === undefined ? '' : flagOf(value))}</div>`
        : '<p class="hint">This one has parts that depend on conditions. It is edited in code until the conditions can be edited (story 4).</p>'}
    </div>`;
  }

  function formHtml(r, values = {}) {
    const mine = values[r.id] || {};
    return `<h3>Your words</h3><div class="form" data-form="${esc(r.id)}">
      ${fieldHtml(r, 'title', 'Title', mine.title)}${fieldHtml(r, 'text', 'Text', mine.text)}
      ${r.choices.map((c, i) => `<h4>Choice ${i + 1}</h4>${fieldHtml(r, `c${i}.label`, 'Label', mine[`c${i}.label`])}${fieldHtml(r, `c${i}.result`, 'Result', mine[`c${i}.result`])}`).join('')}
    </div>`;
  }

  const changesHtml = (rows, values) => `<h3>Changes so far</h3>
    <p class="hint">Only what differs from the shipped words. Saving, export and revert come with story 6; until then this is the whole of js/overrides.js to paste in.</p>
    <pre id="changes">${esc(fileText(overridesFrom(rows, values)))}</pre>`;

  function detailHtml(r, values = {}, rows = []) {
    if (!r) return '<p class="hint">Choose a scene to read it.</p>';
    if (r.kind === 'data') {
      return `<h2>${esc(r.title)}</h2>
        <p class="hint">${esc(r.id)} | ${esc(r.where)} | ${esc(r.file)} | ${esc(r.belongs)} | ${esc(r.kind)}${r.off ? ' | off in the narrow build' : ''}</p>
        <p class="hint">Placeholders such as {captain}, {planet} and {crew:pilot} are kept as typed.</p>
        ${formHtml(r, values)}${changesHtml(rows, values)}`;
    }
    return `
    <h2>${esc(r.title)}</h2>
    <p class="hint">${esc(r.id)} | ${esc(r.where)} | ${esc(r.file)} | ${esc(r.belongs)} | ${esc(r.kind)}${r.off ? ' | off in the narrow build' : ''}</p>
    ${r.codeNote ? `<p class="note">${esc(r.codeNote)}</p>` : ''}
    ${paragraphs(r.text)}
    ${r.choices.length ? `<h3>Choices</h3><ol>${r.choices.map(c => `<li><strong>${esc(c.label)}</strong>${c.result ? paragraphs(c.result) : ''}</li>`).join('')}</ol>` : ''}
    <p class="hint">A code-written scene cannot be edited here until its text has an id (story 8).</p>`;
  }


  // The preview pane: the state to start from, a button, the game's frame, and what the game reported. It outlives the choice of scene, so the
  // frame is not rebuilt as you move between scenes.
  const PREVIEW_DEFAULTS = { as: 'hired', post: 'gunner', captain: 'hester', start: 'earth', day: '', credits: '', place: '', qualities: '', rep: {} };
  function previewPaneHtml(opt) {
    const sel = (key, list) => `<select data-pv="${key}">${list.map(([v, text]) => `<option value="${esc(v)}"${PREVIEW_DEFAULTS[key] === v ? ' selected' : ''}>${esc(text)}</option>`).join('')}</select>`;
    return `<h2>Preview</h2>
      <p id="pv-scene" class="hint">Choose a data scene to play it in the game's own dialog, from the state below. It starts a fresh test game that is never saved.</p>
      <div class="pv-state">
        <label>Start as ${sel('as', [['hired', 'a hired hand'], ['owner', 'a ship owner']])}</label>
        <label>Post ${sel('post', opt.posts.map(p => [p, p]))}</label>
        <label>Captain (first officer) ${sel('captain', opt.captains.map(c => [c.key, `${c.name} (${c.xo})`]))}</label>
        <label>Main characters aboard ${sel('start', opt.pairs.map(p => [p.key, p.names]))}</label>
        <label>Day <input type="number" min="1" data-pv="day" placeholder="1"></label>
        <label>Credits <input type="number" data-pv="credits" placeholder="the start's"></label>
        <label>Place ${sel('place', [['', 'from the scene'], ...opt.places.map(p => [p.name, p.name])])}</label>
        <fieldset><legend>Standing</legend>${opt.factions.map(f => `<label>${esc(f)} <input type="number" data-pv-rep="${esc(f)}" placeholder="0"></label>`).join('')}</fieldset>
        <label>Story qualities, one a line (name=number)<textarea data-pv="qualities" rows="3" placeholder="strike-day=1"></textarea></label>
        <button data-action="play" disabled>Play this scene</button>
      </div>
      <div id="pv-report" role="status"></div>
      <div id="pv-effects" role="status"></div>
      <div id="pv-frame"></div>`;
  }
  // What the game reported is built as nodes with text, never as markup: it arrives in a message.
  const el = (tag, text, cls) => { const e = document.createElement(tag); if (text !== undefined) e.textContent = text; if (cls) e.className = cls; return e; };
  const listEl = items => { const ul = el('ul'); for (const x of items) ul.append(el('li', x)); return ul; };
  function reportNode(m) {
    const box = el('div');
    if (m.error) { box.append(el('p', m.error, 'note')); return box; }
    if (m.failing.length) box.append(el('p', 'This scene\'s conditions do not hold in this state:', 'warn'), listEl(m.failing), el('p', 'It is played anyway.', 'hint'));
    else box.append(el('p', 'Every condition of the scene holds in this state.', 'ok'));
    if (m.chance !== undefined) box.append(el('p', `It also has a chance of ${m.chance}, rolled when the game picks a scene.`, 'hint'));
    if (m.chained) box.append(el('p', 'It only plays after another scene leads into it.', 'hint'));
    for (const c of m.shut) box.append(el('p', `Choice ${c.n} is shut:`, 'warn'), listEl(c.why));
    return box;
  }
  function effectsNode(m) {
    const box = el('div');
    box.append(el('h3', `You chose: ${m.label}`), m.lines.length ? listEl(m.lines) : el('p', 'Nothing it tracks changed.', 'hint'));
    return box;
  }

  function mount(app, rows, overrides, opt) {
    const files = [...new Set(rows.map(r => r.file))].sort();
    const options = (list, any) => `<option value="">${any}</option>${list.map(([v, t]) => `<option value="${esc(v)}">${esc(t)}</option>`).join('')}`;
    app.innerHTML = `<h1>Scenes</h1>
      <div class="controls">
        <input type="search" id="q" placeholder="Search id, title, text" aria-label="Search by id, title or text">
        <select id="where" aria-label="Where it plays">${options([['port', 'port'], ['transit', 'transit']], 'Anywhere')}</select>
        <select id="file" aria-label="Source file">${options(files.map(f => [f, f]), 'Any source')}</select>
        <select id="kind" aria-label="Data or code">${options([['data', 'data (storylet)'], ['code', 'code']], 'Data or code')}</select>
        <span id="count" class="hint" role="status"></span>
      </div>
      <div class="split"><div id="list"></div><div id="detail"></div><div id="preview">${previewPaneHtml(opt)}</div></div>`;
    const state = { q: '', where: '', file: '', kind: '', id: '' };
    const values = SceneIndex.values = valuesFrom(overrides);
    const setup = SceneIndex.setup = { ...PREVIEW_DEFAULTS, rep: {} };
    const update = () => {
      const shown = filterRows(rows, state);
      app.querySelector('#count').textContent = `${shown.length} of ${rows.length} scenes`;
      app.querySelector('#list').innerHTML = tableHtml(shown, state.id, new Set(Object.keys(overridesFrom(rows, values))));
      const row = rows.find(r => r.id === state.id), playable = !!row && row.kind === 'data';
      app.querySelector('#detail').innerHTML = detailHtml(row, values, rows);
      app.querySelector('[data-action="play"]').disabled = !playable;
      app.querySelector('#pv-scene').textContent = playable ? `Scene: ${row.title} (${row.id})` : 'Choose a data scene to play it in the game\'s own dialog, from the state below. It starts a fresh test game that is never saved.';
    };
    // The place a scene needs, from its own conditions, unless one is chosen: a planet it names, a system it is bound for, or Earth.
    const placeFor = row => {
      if (setup.place) return setup.place;
      const w = row.when || {}, planet = [].concat(w.planet || [])[0], at = [].concat(w.at || [])[0];
      return planet || (at && (opt.places.find(p => p.sid === at) || {}).name) || 'Earth';
    };
    const send = msg => { const f = frameEl(); if (previewReady) f.contentWindow.postMessage(msg, '*'); else pending = msg; };
    let previewReady = false, pending = null;
    const frameEl = () => {
      let f = app.querySelector('#pv-frame-el');
      if (!f) { f = document.createElement('iframe'); f.id = 'pv-frame-el'; f.title = 'The scene in the game'; f.src = 'editor-preview.html?scope=full'; app.querySelector('#pv-frame').append(f); }
      return f;
    };
    onPreview = (m, source) => {
      const f = app.querySelector('#pv-frame-el');
      if (!f || source !== f.contentWindow) return;
      if (m.type === 'ready') { previewReady = true; if (pending) { f.contentWindow.postMessage(pending, '*'); pending = null; } }
      else if (m.type === 'chose') app.querySelector('#pv-effects').replaceChildren(effectsNode(m));
      else app.querySelector('#pv-report').replaceChildren(reportNode(m));
    };
    app.addEventListener('input', e => {
      const t = e.target;
      if (t.dataset && t.dataset.pv) setup[t.dataset.pv] = t.value;
      else if (t.dataset && t.dataset.pvRep) setup.rep[t.dataset.pvRep] = t.value;
      else if (t.dataset && t.dataset.path) {  // a field of the form: keep the focus, so only its flag and the changes are redrawn
        (values[state.id] = values[state.id] || dict())[t.dataset.path] = t.value;
        app.querySelector(`[data-warn="${t.dataset.path}"]`).textContent = flagOf(t.value);
        app.querySelector('#changes').textContent = fileText(overridesFrom(rows, values));
      } else if (t.id in state) { state[t.id] = t.value; update(); }
    });
    app.addEventListener('click', e => {
      const b = e.target.closest('button[data-id]');
      if (b) { state.id = b.dataset.id; update(); return; }
      const row = rows.find(r => r.id === state.id);
      if (e.target.closest('[data-action="play"]') && row && row.kind === 'data') {
        app.querySelector('#pv-effects').replaceChildren(); app.querySelector('#pv-report').replaceChildren();
        send({ cmd: 'play', id: row.id, overrides: overridesFrom(rows, values), setup: { ...setup, place: placeFor(row) } });
      }
    });
    update();
  }

  // The page opens two frames of itself to read the game, and shows what they send back; a frame reads the game and sends it up.
  function start() {
    if (document.body.dataset.role === 'preview') { startPreview().catch(e => parent.postMessage({ mode: 'preview', error: String(e && e.stack || e) }, '*')); return; }
    const mode = new URLSearchParams(location.search).get('read');
    if (mode) {
      // The game's scripts expect these in the page (ui.js, a11y.js).
      document.body.insertAdjacentHTML('beforeend', '<div id="panel"></div><div id="live"></div>');
      loadGame().then(read => parent.postMessage({ mode, ...read }, '*'), e => parent.postMessage({ mode, error: String(e && e.stack || e) }, '*'));
      return;
    }
    const app = document.getElementById('app'), got = {};
    const frames = { full: 'editor.html?read=full&scope=full', narrow: 'editor.html?read=narrow' };
    window.addEventListener('message', ev => {
      const m = ev.data;
      if (m && m.mode === 'preview') { onPreview(m, ev.source); return; }
      if (!m || !frames[m.mode] || ev.source !== document.getElementById('frame-' + m.mode).contentWindow) return;
      if (m.error) { app.replaceChildren(el('p', `Could not read the game: ${m.error}`, 'note')); return; }
      got[m.mode] = m;
      if (!got.full || !got.narrow) return;
      const kept = new Set(got.narrow.rows.filter(r => r.on).map(r => r.id));
      rule = got.full.placeholder;
      SceneIndex.rows = got.full.rows.map(r => ({ ...r, off: !kept.has(r.id) }));
      document.querySelectorAll('iframe').forEach(f => f.remove());
      mount(app, SceneIndex.rows, got.full.overrides, got.full.options);
    });
    for (const [mode, src] of Object.entries(frames)) {
      const f = document.createElement('iframe');
      f.id = 'frame-' + mode; f.src = src; f.hidden = true;
      document.body.append(f);
    }
  }

  const SceneIndex = window.SceneIndex = { SCRIPTS, esc, plain, filterRows, tableHtml, detailHtml, overridesFrom, valuesFrom, fileText, badPlaceholders, reportNode, effectsNode, rows: null, values: null, setup: null };
  start();
})();
