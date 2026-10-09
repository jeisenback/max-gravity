'use strict';

// The scene index (#335): a read-only list of every scene in the game, for the designer. Open editor.html. It is not linked from the
// game, and nothing on it changes a scene. It loads the game's own scripts (not game.js) in two hidden frames of itself, one in the
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
  'js/captains/ansel.js', 'js/fate.js', 'js/signon.js', 'js/castbar.js', 'js/regulars.js', 'js/barwork.js', 'js/storylets.js',
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
        id: s.id, title: s.title, where: s.where, file, belongs: stem(file), kind: 'data', text: plain(s.text),
        choices: s.choices.map(c => ({ label: plain(c.label), result: plain(c.result) })),
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

  // Loads the game's scripts one at a time and notes which script added each scene, by what appeared after it ran.
  async function loadGame() {
    const fileOf = {}, cast = new Set(), captains = new Set();
    let storylets = 0;
    for (const src of SCRIPTS) {
      await new Promise((resolve, reject) => {
        const el = document.createElement('script');
        el.src = src; el.async = false;
        el.onload = resolve; el.onerror = () => reject(new Error(`could not load ${src}`));
        document.head.append(el);
      });
      if (typeof STORYLETS !== 'undefined') for (; storylets < STORYLETS.length; storylets++) fileOf['storylet:' + STORYLETS[storylets].id] = src;
      if (typeof CAST !== 'undefined') for (const k of Object.keys(CAST)) if (!cast.has(k)) { cast.add(k); fileOf['cast:' + k] = src; }
      if (typeof CAPTAINS !== 'undefined') for (const k of Object.keys(CAPTAINS)) if (!captains.has(k)) { captains.add(k); fileOf['captain:' + k] = src; }
      if (typeof WORK_EVENTS !== 'undefined' && !fileOf.work) fileOf.work = src;
      if (typeof HAND_EVENTS !== 'undefined' && !fileOf.hand) fileOf.hand = src;
      if (typeof ICE_STAGES !== 'undefined' && !fileOf.ice) fileOf.ice = src;
    }
    return collect(fileOf);
  }

  // ---------- the page ----------
  const haystack = r => [r.id, r.title, r.text, ...r.choices.flatMap(c => [c.label, c.result])].join('\n').toLowerCase();
  // Every word typed must appear in the id, the title, the text, or a choice or its result.
  function filterRows(rows, { q = '', where = '', file = '', kind = '' } = {}) {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    return rows.filter(r => (!where || r.where === where) && (!file || r.file === file) && (!kind || r.kind === kind) && words.every(w => haystack(r).includes(w)));
  }

  const paragraphs = text => text.split('\n').filter(Boolean).map(p => `<p>${esc(p)}</p>`).join('');
  const tableHtml = (rows, selected = '') => (rows.length ? `<table>
    <thead><tr><th>Id</th><th>Title</th><th>Where</th><th>Source</th><th>Belongs to</th><th>Kind</th></tr></thead>
    <tbody>${rows.map(r => `<tr class="${r.id === selected ? 'on' : ''}"><td><button data-id="${esc(r.id)}">${esc(r.id)}</button></td>
      <td>${esc(r.title)}${r.off ? ' <span class="off">off in the narrow build</span>' : ''}</td><td>${esc(r.where)}</td><td>${esc(r.file)}</td><td>${esc(r.belongs)}</td><td>${esc(r.kind)}</td></tr>`).join('')}</tbody>
  </table>` : '<p class="hint">No scene matches.</p>');

  const detailHtml = r => (!r ? '<p class="hint">Choose a scene to read it.</p>' : `
    <h2>${esc(r.title)}</h2>
    <p class="hint">${esc(r.id)} | ${esc(r.where)} | ${esc(r.file)} | ${esc(r.belongs)} | ${esc(r.kind)}${r.off ? ' | off in the narrow build' : ''}</p>
    ${r.codeNote ? `<p class="note">${esc(r.codeNote)}</p>` : ''}
    ${paragraphs(r.text)}
    ${r.choices.length ? `<h3>Choices</h3><ol>${r.choices.map(c => `<li><strong>${esc(c.label)}</strong>${c.result ? paragraphs(c.result) : ''}</li>`).join('')}</ol>` : ''}`);

  function mount(app, rows) {
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
      <div class="split"><div id="list"></div><div id="detail"></div></div>`;
    const state = { q: '', where: '', file: '', kind: '', id: '' };
    const update = () => {
      const shown = filterRows(rows, state);
      app.querySelector('#count').textContent = `${shown.length} of ${rows.length} scenes`;
      app.querySelector('#list').innerHTML = tableHtml(shown, state.id);
      app.querySelector('#detail').innerHTML = detailHtml(rows.find(r => r.id === state.id));
    };
    app.addEventListener('input', e => { if (e.target.id in state) { state[e.target.id] = e.target.value; update(); } });
    app.addEventListener('click', e => { const b = e.target.closest('button[data-id]'); if (b) { state.id = b.dataset.id; update(); } });
    update();
  }

  // The page opens two frames of itself to read the game, and shows what they send back; a frame reads the game and sends it up.
  function start() {
    const mode = new URLSearchParams(location.search).get('read');
    if (mode) {
      // The game's scripts expect these in the page (ui.js, a11y.js).
      document.body.insertAdjacentHTML('beforeend', '<div id="panel"></div><div id="live"></div>');
      loadGame().then(rows => parent.postMessage({ mode, rows }, '*'), e => parent.postMessage({ mode, error: String(e && e.stack || e) }, '*'));
      return;
    }
    const app = document.getElementById('app'), got = {};
    const frames = { full: 'editor.html?read=full&scope=full', narrow: 'editor.html?read=narrow' };
    window.addEventListener('message', ev => {
      const m = ev.data;
      if (!m || !frames[m.mode] || ev.source !== document.getElementById('frame-' + m.mode).contentWindow) return;
      if (m.error) { app.innerHTML = `<p class="note">Could not read the game: ${esc(m.error)}</p>`; return; }
      got[m.mode] = m.rows;
      if (!got.full || !got.narrow) return;
      const kept = new Set(got.narrow.filter(r => r.on).map(r => r.id));
      SceneIndex.rows = got.full.map(r => ({ ...r, off: !kept.has(r.id) }));
      document.querySelectorAll('iframe').forEach(f => f.remove());
      mount(app, SceneIndex.rows);
    });
    for (const [mode, src] of Object.entries(frames)) {
      const f = document.createElement('iframe');
      f.id = 'frame-' + mode; f.src = src; f.hidden = true;
      document.body.append(f);
    }
  }

  const SceneIndex = window.SceneIndex = { SCRIPTS, esc, plain, filterRows, tableHtml, detailHtml, rows: null };
  start();
})();
