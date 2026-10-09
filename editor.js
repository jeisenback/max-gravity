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
  'js/captains/ansel.js', 'js/hiredscenes.js', 'js/fate.js', 'js/signon.js', 'js/castbar.js', 'js/regulars.js', 'js/barwork.js', 'js/overrides.js', 'js/storylets.js',
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

  // How a scene is drawn (#341), as the happenings filters draw it (js/happenings.js, cast.js, captains.js): its tier, its weight and cooldown where it has them,
  // what triggers it, and whether the editor can change its weight (only a color storylet's). A tier 0 or 1 scene is due by state, so it is read only.
  const pacingOf = {
    storylet: s => (s.priority > 0
      ? { tier: 0, weight: null, cooldown: s.once ? 'plays once' : s.every ? `${s.every} days` : 'none', trigger: `The story: played first, by priority ${s.priority}, whenever its conditions hold.`, editable: false }
      : { tier: 2, weight: s.weight === undefined ? 1 : s.weight, every: s.every || 0, once: !!s.once, cooldown: s.once ? 'plays once' : s.every ? `${s.every} days` : 'none', editable: true,
        trigger: `A color scene: one of the scenes ${s.where === 'port' ? 'at a landing' : 'in a burn'} whose conditions hold, drawn by weight among them, as one candidate of weight 2${s.where === 'port' ? '' : ` against the burn's other events and a quiet burn of ${3}`}.` }),
    cast: (name, sc, closed) => (name === 'meet' ? { tier: 1, weight: 1, cooldown: 'plays once', trigger: 'Due when a main character is offered at a port bar.', editable: false }
      : { tier: name === 'intro' ? 1 : 2, weight: `${name === 'intro' ? BEAT_WEIGHT : 2}, and ${BEAT_RAMP} more for each draw it was due and not drawn`, cooldown: 'plays once', trigger: `Due ${sc.days || 0} days after they join, after their earlier scenes${closed ? '; this reading plays in its place when their opinion of you is below friendly' : ''}.`, editable: false }),
    captain: name => ({ tier: 1, weight: `${BEAT_WEIGHT}, and ${BEAT_RAMP} more for each draw it was due and not drawn`, cooldown: 'plays once', editable: false,
      trigger: name === 'trouble' ? `Due ${CAPTAIN_BEAT_DAYS.trouble} days after you sign on.` : `Due ${CAPTAIN_BEAT_DAYS.secret} days after you sign on, once the trouble has played.` }),
    work: d => ({ tier: 2, weight: `${HIRED_WEIGHTS.work} for the work group`, cooldown: `${WORK_SEEN_DAYS} days`, trigger: `One event of the group is drawn on a burn, a problem at the ${d.post} post.`, editable: false }),
    hand: d => ({ tier: 2, weight: `${HIRED_WEIGHTS[d.group]} for the ${d.group} group`, cooldown: `${WORK_SEEN_DAYS} days`, trigger: `One event of the ${d.group} group is drawn on a burn.`, editable: false }),
    ice: () => ({ tier: 1, weight: '8, as an occasion of an ice run', cooldown: 'plays once on each run', trigger: 'Due part of the way through an ice run.', editable: false }),
  };

  // A cast or captain scene as the editor's row: the words it can be given (js/hiredscenes.js lists the ids), and for each choice whether it is data (its
  // effects are edited) or code (only its label and result line are: a result written replaces the line the code returns). A text built from the game
  // state cannot be read, nor replaced here.
  function registryRow(s) {
    const getter = !!(Object.getOwnPropertyDescriptor(s, 'text') || {}).get, data = s.choices.every(c => !c.run);
    return {
      kind: data ? 'data' : 'code', registry: true, title: s.title, text: getter ? '' : plain(s.text), when: {},
      codeNote: getter ? CODE_TEXT : data ? '' : 'Some of its choices run code. Their effects stay in code; a result written for one replaces the line it returns.',
      choices: s.choices.map(c => ({ label: plain(c.label), result: c.run ? '' : plain(c.result), when: c.run ? {} : c.when || {}, effects: c.effects || {}, next: '' })),
      edit: { text: !getter && typeof s.text === 'string', choices: s.choices.map(c => ({ label: typeof c.label === 'string', result: true, effects: !c.run })) },
    };
  }

  // A captain's goodbye (#476): its words are the parts the game picks from (an opening by how they feel about you, a line for crew, the secret and so on), its choices are data.
  function goodbyeRow(s) {
    const row = registryRow({ title: s.title, text: '', choices: s.choices });
    return { ...row, text: Object.entries(s.parts).map(([k, t]) => `[${k}] ${t}`).join('\n'), parts: s.parts, edit: { ...row.edit, text: false, parts: Object.fromEntries(Object.keys(s.parts).map(k => [k, true])) } };
  }

  // A scene whose words live in a table one template plays (a work event, an ice run scene; #462) as the editor's row: its words are edited, and what it does is in code. A choice
  // has a label and either a result or the lines for a win and a lose; the odds and what each does are the table's.
  function tableRow(s) {
    return {
      kind: 'data', registry: true, table: true, title: s.title, text: s.text, ...(s.text2 !== undefined ? { text2: s.text2 } : {}), when: {}, codeNote: '',
      choices: s.choices.map(c => ({ label: c.label, ...(c.result !== undefined ? { result: c.result } : {}), ...(c.win !== undefined ? { win: c.win } : {}), ...(c.lose !== undefined ? { lose: c.lose } : {}), ...(c.post ? { post: c.post } : {}), when: {}, effects: {}, next: '' })),
      edit: { text: true, ...(s.text2 !== undefined ? { text2: true } : {}), choices: s.choices.map(c => ({ label: true, ...(c.result !== undefined ? { result: true } : {}), ...(c.win !== undefined ? { win: true } : {}), ...(c.lose !== undefined ? { lose: true } : {}), effects: false })) },
    };
  }

  // fileOf: where each registry entry was first seen, by the script that added it (see loadGame).
  function collect(fileOf) {
    // What the narrow build keeps (build.js SCOPE_OFF): the one captain (captains.js), the Earth start's main characters (menu.js) and
    // that captain's first officer, and the one post (hired.js).
    const captainOn = key => !scopeOff('captains') || key === 'hester';
    const castOn = key => (CAST[key].xo ? !scopeOff('captains') || CAPTAINS.hester.xo === key : !scopeOff('starts') || CAST_PAIRS.earth.includes(key));
    const postOn = post => !post || !scopeOff('posts') || post === 'gunner';
    const rows = [];
    const add = r => rows.push({ on: true, kind: 'code', where: 'transit', codeNote: '', conditionsNote: '', ...r });

    for (const s of STORYLETS.filter(x => !newSceneIds.includes(x.id))) {
      const file = fileOf['storylet:' + s.id];
      add({
        id: s.id, title: s.title, where: s.where, file, belongs: stem(file), kind: 'data', text: plain(s.text), when: s.when || {}, chained: !!s.chained, pacing: pacingOf.storylet(s),
        choices: s.choices.map(c => ({ label: plain(c.label), result: plain(c.result), when: c.when || {}, effects: c.effects || {}, next: c.next || '' })),
        // A text of conditional parts cannot be edited as one string, so the form leaves those fields to the code (conditions are story 4).
        edit: { text: typeof s.text === 'string', choices: s.choices.map(c => ({ label: typeof c.label === 'string', result: c.result === undefined || typeof c.result === 'string' })) },
      });
    }

    // The hired chapter's scenes, as the game's own registry lists them (js/hiredscenes.js): each has its id there.
    for (const e of hiredSceneRegistry()) {
      if (e.kind === 'cast') {
        const c = CAST[e.key], sc = c.scenes[e.name];
        add({ id: e.id, where: e.name === 'meet' ? 'port' : 'transit', file: fileOf['cast:' + e.key], belongs: `${e.key} (${c.xo ? 'first officer' : 'main character'})`, on: castOn(e.key),
          conditionsNote: e.name === 'meet' ? 'Offered at a port bar when a main character is due.' : `Plays ${sc.days || 0} days after they join, after their earlier scenes${e.closed ? '; this reading plays in its place when their opinion of you is below friendly' : ''}.`, pacing: pacingOf.cast(e.name, sc, e.closed), ...registryRow(e.scene) });
      } else if (e.kind === 'captain' && e.name !== 'goodbye') {
        const note = e.name === 'trouble' ? `${CAPTAIN_BEAT_DAYS.trouble} days after you sign on, on a burn.` : e.name === 'secret:confide' ? `${CAPTAIN_BEAT_DAYS.secret} days after you sign on, when their opinion of you is ${SECRET_TRUST} or more.` : `${CAPTAIN_BEAT_DAYS.secret} days after you sign on, when their opinion of you is below ${SECRET_TRUST}.`;
        add({ id: e.id, where: 'transit', file: fileOf['captain:' + e.key], belongs: `${e.key} (captain)`, on: captainOn(e.key), conditionsNote: note, pacing: pacingOf.captain(e.name.split(':')[0]), ...registryRow(e.scene) });
      } else if (e.kind === 'captain') {
        const note = 'When you leave the ship to buy your own: the opening for how they feel about you, then a line for each thing that is true.';
        add({ id: e.id, where: 'port', file: fileOf['captain:' + e.key], belongs: `${e.key} (captain)`, on: captainOn(e.key), conditionsNote: note, pacing: { tier: null, weight: null, cooldown: 'plays once', trigger: note, editable: false }, ...goodbyeRow(e.scene) });
      } else if (e.kind === 'work') {
        const d = e.def;
        add({ id: e.id, file: fileOf.work, belongs: `${d.post} (post)`, on: postOn(d.post), post: d.post, pacing: pacingOf.work(d), conditionsNote: `A problem at the ${d.post} post, for a hand who works it; not repeated within ${WORK_SEEN_DAYS} days.`, ...tableRow(tableScene(e.id)) });
      } else if (e.kind === 'hand') {
        const d = e.def, note = `A ${d.group} event for a hired hand${d.post ? ` at the ${d.post} post` : ''}; its own conditions are written in code.`;
        if (e.scene) add({ id: e.id, file: fileOf.hand, belongs: `${d.group} (hired event)`, on: postOn(d.post), pacing: pacingOf.hand(d), conditionsNote: note, ...registryRow(e.scene) });  // written as data (#473)
        else add({ id: e.id, title: d.id, file: fileOf.hand, belongs: `${d.group} (hired event)`, on: postOn(d.post), text: '', choices: [], codeNote: CODE_ALL, pacing: pacingOf.hand(d), conditionsNote: note });
      } else if (e.kind === 'ice') {
        add({ id: e.id, file: fileOf.ice, belongs: 'ice run', pacing: pacingOf.ice(), conditionsNote: `Scene ${Number(e.id.slice(4))} of 3 on an ice run, once the captain takes one.`, ...tableRow(tableScene(e.id)) });
      } else {  // built by a function: no text to read, only what it is and when it plays
        add({ id: e.id, title: e.title, where: e.where, file: e.file, belongs: e.id.startsWith('beats:') ? 'beats' : 'hired chapter', text: '', choices: [], codeNote: CODE_ALL, conditionsNote: e.when, pacing: { tier: null, weight: null, cooldown: 'by its own rule', trigger: e.when, editable: false } });
      }
    }
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
    pairs: Object.entries(CAST_PAIRS).map(([key, pair]) => ({ key, members: pair, names: pair.map(c => CAST[c].first).join(' and ') })),
    captains: Object.entries(CAPTAINS).map(([key, c]) => ({ key, name: `${c.first} ${c.last}`, xo: c.xo })),
    places: Object.entries(SYSTEMS).flatMap(([sid, s]) => s.planets.map(p => ({ name: p.name, sid }))),
    // The tables the forms are built from, read as they are now, so a condition or effect the game gains has a form with no change here.
    conditions: Object.keys(CONDITIONS), effects: Object.keys(EFFECTS), systems: Object.keys(SYSTEMS), govs: [...new Set([...FACTIONS, ...Object.values(SYSTEMS).map(s => s.gov)])],
    goods: COMMODITIES.map(c => c.id), ships: Object.keys(SHIPS), actions: Object.keys(Mods.storyActions), cast: Object.keys(CAST),
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
    useNewScenes(NEW_SCENES);  // the file's new scenes are the editor's own drafts, not rows of the shipped game
    return { rows: collect(fileOf), newScenes: NEW_SCENES, overrides: useOverrides(SCENE_OVERRIDES), placeholder: { source: PLACEHOLDER.source, roles: Object.keys(ROLE_NAMES) }, options: previewOptions() };
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
  // A fresh test game in the state the page asked for, not yet placed anywhere; and the numbers it can set once it is (day, credits, standing, qualities).
  const num = (v, d) => (Number.isFinite(Number(v)) && String(v).trim() !== '' ? Number(v) : d);
  function beginGame(o, hiredOnly) {
    G.dialog = null; G.nextEvent = null; G.transit = null;
    if (o.as === 'owner' && !hiredOnly) uatFresh({ credits: num(o.credits, 50000) });  // a hired scene needs a hired hand
    else {
      // The game draws its two main characters from a pool; a preview takes the pair asked for.
      const pair = CAST_PAIRS[o.start] || CAST_PAIRS.earth, drawn = drawCastPair;
      window.drawCastPair = () => [...pair];
      try { startGame({ mode: 'hired', background: 'earth', post: o.post, captainKey: o.captain, credits: num(o.credits, undefined) }); } finally { window.drawCastPair = drawn; }
      G.dialog = null; G.nextEvent = null; G.state.uat = true;
      if (G.state.story) G.state.story.next = 1e9;  // keep the Cold Water derelict out of the way, as the tester tools do (js/uat.js)
    }
  }
  function tweakState(o) {
    const st = G.state;
    if (o.credits !== undefined && String(o.credits).trim() !== '') st.credits = num(o.credits, st.credits);
    if (String(o.day || '').trim() !== '') st.day = Math.max(1, num(o.day, st.day));
    for (const f of FACTIONS) if (o.rep && String(o.rep[f] || '').trim() !== '' && Number.isFinite(Number(o.rep[f]))) st.rep[f] = Number(o.rep[f]);
    for (const line of String(o.qualities || '').split('\n')) {
      const [name, value] = line.split('=').map(x => x.trim());
      if (name) (st.qualities = st.qualities || {})[name] = value === undefined || value === '' ? 1 : Number.isFinite(Number(value)) ? Number(value) : 1;
    }
  }

  // The frequency simulator (#341): plays the real pickHappening on fresh test games from the state asked for, for a number of burns (or landings, for a scene at a
  // port), and counts what comes up. The numbers are a sample, with its size. The scene's own plays are counted where the game builds it (storyletEvent).
  const mulberry = seed => { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  async function simulate(m) {
    useNewScenes(m.newScenes);
    const s = STORYLETS.find(x => x.id === m.id);
    if (!s) return { error: `The game has no scene "${m.id}" that is drawn by weight.` };
    useOverrides(m.overrides);
    const o = m.setup || {}, seeds = Math.min(200, Math.max(1, Math.floor(num(m.seeds, 30)))), burns = Math.min(40, Math.max(1, Math.floor(num(m.burns, 10))));
    const place = planetNamed(o.place) ? o.place : 'Earth', at = planetNamed(place), port = s.where === 'port';
    const real = { random: Math.random, storyletEvent: window.storyletEvent, pickHappening: window.pickHappening };
    const tally = { draws: 0, quiet: 0, events: 0, plays: 0, burnsWith: 0, titles: {} };
    let counting = false, here = 0;
    window.storyletEvent = sc => { if (counting && sc.id === m.id) here++; return real.storyletEvent(sc); };
    // Setting a burn or a landing up draws happenings of its own (the landing handler); those are not part of the count, and take nothing from the scenes.
    window.pickHappening = (w, p) => { if (!counting) return null; const ev = real.pickHappening(w, p); tally.draws++; if (ev) { tally.events++; tally.titles[ev.title] = (tally.titles[ev.title] || 0) + 1; } else tally.quiet++; return ev; };
    try {
      for (let seed = 1; seed <= seeds; seed++) {
        Math.random = mulberry(seed * 7919 + 13);
        counting = false;
        beginGame(o, false); tweakState(o);
        const st = G.state;
        for (let b = 0; b < burns; b++) {
          counting = false; here = 0;
          if (port) { uatLand(place); counting = true; window.pickHappening('port', currentPlanet()); }
          else {
            uatLand(at.sid === 'earth' ? 'Mars' : 'Earth'); takeOff(); st.dest = at.sid; G.player.x = 6000; G.player.y = 0; tryBurn(); enterTransit();
            const draws = G.transit.times.length; G.transit.times = []; G.transit.interceptPlanned = true;
            counting = true;
            for (let i = 0; i < draws; i++) window.pickHappening('transit');
            counting = false; st.day += G.transit.days; G.transit = null; G.mode = 'landed';
          }
          counting = false;
          tally.plays += here; if (here) tally.burnsWith++;
          G.dialog = null; G.nextEvent = null;
          if (port) st.day += 3;
        }
        await new Promise(r => setTimeout(r, 0));
      }
    } finally { Math.random = real.random; window.storyletEvent = real.storyletEvent; window.pickHappening = real.pickHappening; counting = false; }
    const n = seeds * burns, p = tally.burnsWith / n;
    return {
      type: 'simulated', where: port ? 'landing' : 'burn', sample: { seeds, burns, total: n, draws: tally.draws }, quietShare: tally.draws ? tally.quiet / tally.draws : 0, eventsPerBurn: tally.events / n,
      scene: { id: m.id, plays: tally.plays, perBurn: tally.plays / n, burnsWith: p, range: [Math.max(0, p - 1.96 * Math.sqrt(p * (1 - p) / n)), Math.min(1, p + 1.96 * Math.sqrt(p * (1 - p) / n))] },
      top: Object.entries(tally.titles).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([title, c]) => ({ title, perBurn: c / n })),
    };
  }

  function play(m) {
    useNewScenes(m.newScenes);  // the scenes written in the editor, not saved yet
    const s = STORYLETS.find(x => x.id === m.id), reg = s ? null : hiredSceneRegistry().find(x => x.id === m.id && ((x.kind === 'cast' || x.kind === 'captain') || x.kind === 'hand' && x.scene || x.kind === 'work' || x.kind === 'ice'));
    if (!s && !reg) return { error: `The game has no scene "${m.id}".` };
    useOverrides(m.overrides);  // the unsaved edits, through the same layer the game reads (storylets.js)
    const o = m.setup || {};
    const place = planetNamed(o.place) ? o.place : 'Earth', at = planetNamed(place);
    const meeting = !!reg && reg.kind === 'cast' && reg.name === 'meet';  // an owner meets a main character at a port bar; a hired hand never does
    beginGame(meeting ? { ...o, as: 'owner' } : o, !!reg && !meeting);
    // A scene in a burn is played on the way to the place (its `at` is the destination); one at a port, landed there.
    const where = s ? s.where : reg.name === 'meet' ? 'port' : 'transit';
    if (where === 'transit') uatBurn(at.sid === 'earth' ? 'Mars' : 'Earth', at.sid); else uatLand(place);
    tweakState(o);
    if (reg) {  // a hired scene is played by its days and its place in the story: the preview opens it, with the regard that picks its reading
      if (reg.kind === 'work') openEvent(workEvent(reg.def));  // a problem at the hand's post, played by the shared template from its table
      else if (reg.kind === 'ice') { hired().run = { tons: 40, ice: { edge: 0, round: 0 } }; openEvent(iceStageScene(Number(reg.id.slice(4)) - 1)); }  // the first opening of an ice run's scene
      else if (reg.kind === 'hand') {  // a hired event is about a shipmate, so one is aboard
        const mate = makeCrewCandidate(G.state.systemId); registerPerson(mate); G.state.crew.push(mate.id);
        openEvent(reg.def.make(handContext()));
      } else if (reg.kind === 'cast') {
        const sc = CAST[reg.key].scenes[reg.name];
        if (sc.closed) castPerson(reg.key).opinion = reg.closed ? OPINION.FRIEND - 1 : OPINION.FRIEND;
        openEvent(castScene(reg.key, sc));
      } else if (reg.name === 'goodbye') {
        captainFlag('secretKnown');  // so the choice that waits on it is there to try
        openEvent(captainGoodbye());
      } else {
        const name = reg.name.split(':')[0];
        if (name === 'secret') hiredCaptain().opinion = reg.name === 'secret:confide' ? SECRET_TRUST : SECRET_TRUST - 1;
        openEvent(captainScene(name));
      }
      return { type: 'played', failing: [], chained: false, shut: [], note: 'A scene of the hired chapter plays by its days and its place in the story, so no condition is checked here.' };
    }
    const view = sceneView(s);  // with the editor's conditions, if it changed any
    const report = { type: 'played', failing: failing(view.when), chained: !!s.chained, chance: (view.when || {}).chance, shut: view.choices.map((c, i) => ({ n: i + 1, why: failing(c.when) })).filter(x => x.why.length) };
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
      if (ev.source !== parent || !ev.data || (ev.data.cmd !== 'play' && ev.data.cmd !== 'simulate')) return;
      if (ev.data.cmd === 'simulate') { simulate(ev.data).then(out => parent.postMessage({ mode: 'preview', type: 'simulated', ...out }, '*'), e => parent.postMessage({ mode: 'preview', type: 'simulated', error: String(e && e.message || e) }, '*')); return; }
      let out;
      try { out = play(ev.data); } catch (e) { out = { error: String(e && e.message || e) }; }
      parent.postMessage({ mode: 'preview', ...out }, '*');
    });
    parent.postMessage({ mode: 'preview', type: 'ready' }, '*');
  }

  // ---------- the page ----------
  const haystack = r => [r.id, r.sceneId || '', r.title, r.text, r.text2 || '', ...r.choices.flatMap(c => [c.label, c.result, c.win, c.lose])].filter(x => x !== undefined).join('\n').toLowerCase();
  // Every word typed must appear in the id, the title, the text, or a choice or its result.
  function filterRows(rows, { q = '', where = '', file = '', kind = '' } = {}) {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    return rows.filter(r => (!where || r.where === where) && (!file || r.file === file) && (!kind || r.kind === kind) && words.every(w => haystack(r).includes(w)));
  }

  // Ids and paths come from the page's messages and the form, so the maps keyed by them have no prototype to change.
  const dict = () => Object.create(null);

  // A row the form can edit: a data scene, or a scene of the hired chapter's registry (its words, and the effects of its data choices) (#342).
  const editable = r => r.kind === 'data' || !!r.registry;
  const isStorylet = r => r.kind === 'data' && !r.registry;

  // The fields of a data scene's form, named by a path: 'title', 'text', and 'c0.label' and 'c0.result' for the first choice.
  const CHOICE_FIELDS = ['label', 'result', 'win', 'lose'];  // a table scene's choice has a win and a lose line in place of a result (#462)
  const pathsOf = r => ['title', 'text', ...(r.text2 !== undefined ? ['text2'] : []), ...Object.keys(r.parts || {}).map(k => `p.${k}`), ...r.choices.flatMap((c, i) => CHOICE_FIELDS.filter(f => c[f] !== undefined).map(f => `c${i}.${f}`))];
  const CHOICE_PATH = /^c(\d+)\.(label|result|win|lose)$/;
  const PART_PATH = /^p\.(\w+)$/;  // a goodbye's part (#476)
  const shippedOf = (r, path) => { const m = CHOICE_PATH.exec(path), p = PART_PATH.exec(path); return m ? r.choices[m[1]][m[2]] : p ? r.parts[p[1]] : r[path]; };
  const editableOf = (r, path) => { const m = CHOICE_PATH.exec(path), p = PART_PATH.exec(path); return !r.edit ? false : m ? r.edit.choices[m[1]][m[2]] : p ? !!(r.edit.parts || {})[p[1]] : path === 'title' || r.edit[path]; };

  // What js/overrides.js would hold for the values typed: only what differs from the shipped words, an empty field counting as not changed.
  // values: { sceneId: { path: text } }.
  function overridesFrom(rows, values, struct = dict()) {
    const out = dict();
    for (const r of rows.filter(x => values[x.id])) {
      for (const path of pathsOf(r)) {
        const v = values[r.id][path];
        if (typeof v !== 'string' || !v.trim() || v === shippedOf(r, path) || !editableOf(r, path)) continue;
        const o = out[r.id] = out[r.id] || dict(), m = CHOICE_PATH.exec(path), p = PART_PATH.exec(path);
        if (p) { o.parts = o.parts || dict(); o.parts[p[1]] = v; } else if (m) { o.choices = o.choices || dict(); (o.choices[m[1]] = o.choices[m[1]] || dict())[m[2]] = v; } else o[path] = v;
      }
    }
    for (const r of rows.filter(x => struct[x.id])) {  // the conditions, effects and links
      for (const [path, value] of structChanges(r, struct).out) {
        const o = out[r.id] = out[r.id] || dict(), m = STRUCT_PATH.exec(path), rate = RATE_PATH.exec(path);
        if (rate) o[rate[1]] = value;
        else if (m) { o.choices = o.choices || dict(); (o.choices[m[1]] = o.choices[m[1]] || dict())[m[2]] = value; } else o.when = value;
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
      if (o.text2) v.text2 = o.text2;
      for (const [name, x] of Object.entries(o.parts || {})) v[`p.${name}`] = x;
      for (const [i, c] of Object.entries(o.choices || {})) for (const f of CHOICE_FIELDS) if (c[f]) v[`c${i}.${f}`] = c[f];
    }
    return values;
  }
  const fileText = (overrides, newScenes = []) => `const SCENE_OVERRIDES = ${JSON.stringify(overrides, null, 2)};\nconst NEW_SCENES = ${JSON.stringify(newScenes, null, 2)};`;


  // ---------- conditions, effects and links (#338) ----------
  // The keys of the forms are the game's own tables (CONDITIONS and EFFECTS, sent by the reader as they are now). What kind of input a key takes is
  // said here; a key with no entry gets a box for JSON, so a condition or effect the game gains has a form at once.
  const CONDITION_SPEC = {
    day: 'number', before: 'number', at: 'list:systems', planet: 'list:planets', gov: 'list:govs', standing: 'map:govs', standingBelow: 'map:govs',
    credits: 'number', space: 'number', fleet: 'number', stake: 'map:planets', cargo: 'map:goods', crew: 'text', q: 'map', qBelow: 'map', war: 'flagOr:govs',
    peace: 'flagOr:govs', boom: 'one:govs', bust: 'one:govs', raid: 'flagOr:systems', berths: 'number', story: 'json', storyDay: 'map', aboard: 'text',
    chance: 'chance', post: 'list:posts', skill: 'number', hired: 'flag', due: 'list', opinion: 'shape:opinion', hiredFlag: 'text',
  };
  const EFFECT_SPEC = {
    credits: 'number', story: 'json', storyLog: 'text', storyAdd: 'map', storyDays: 'map', delay: 'number', passenger: 'json', do: 'action', rep: 'map:govs',
    cargo: 'map:goods', q: 'map', like: 'map:like', learn: 'number', later: 'map', set: 'map', news: 'text', log: 'text', unrest: 'map:systems', cancelMission: 'text',
    bounty: 'json', companyShip: 'one:ships', mission: 'json',
    castLike: 'shape:castLike', castFlag: 'shape:castFlag', castXp: 'shape:castXp', captainLike: 'shape:captainLike', captainFlag: 'shape:captainFlag',
    mateLike: 'shape:mateLike', remember: 'shape:remember', gainSkill: 'shape:gainSkill', castJoin: 'shape:castJoin', castLater: 'shape:castLater',
  };
  let lists = {};  // the names the games' lists hold: systems, planets, factions, govs, goods, ships, posts, actions, conditions, effects, scenes
  const ok = value => ({ value }), no = error => ({ error });
  const LIKE_KEY = /^(captain|crew|thread:\w+)$/;

  const NAMES = { systems: 'a system', planets: 'a planet', factions: 'a faction', govs: 'a government or faction', goods: 'a good', ships: 'a ship', posts: 'a post', actions: 'an action' };

  // The shapes of the hired chapter's effects, as the game checks them (EFFECT_SHAPES in js/storylets.js; tests/editorforms.test.js checks the two agree).
  const textOf = v => typeof v === 'string' && v.trim() !== '';
  const SHAPES = {
    castLike: v => (!isObj(v) ? 'needs { who, n, memory }' : !(lists.cast || []).includes(v.who) ? `${v.who} is not a main character or first officer` : !Number.isFinite(v.n) ? 'n must be a number' : !textOf(v.memory) ? 'memory must be some text' : ''),
    castFlag: v => (!isObj(v) ? 'needs { who, flag }' : !(lists.cast || []).includes(v.who) ? `${v.who} is not a main character or first officer` : !textOf(v.flag) ? 'flag must be a name' : ''),
    castXp: v => (!isObj(v) ? 'needs { who, role, n }' : !(lists.cast || []).includes(v.who) ? `${v.who} is not a main character or first officer` : !textOf(v.role) ? 'role must be a post' : !Number.isFinite(v.n) ? 'n must be a number' : ''),
    captainLike: v => (!isObj(v) ? 'needs { n, memory }' : !Number.isFinite(v.n) ? 'n must be a number' : !textOf(v.memory) ? 'memory must be some text' : ''),
    captainFlag: v => ([].concat(v).every(textOf) ? '' : 'needs a name, or a list of names'),
    mateLike: v => (!isObj(v) ? 'needs { n, memory }' : !Number.isFinite(v.n) ? 'n must be a number' : !textOf(v.memory) ? 'memory must be some text' : ''),
    remember: v => (textOf(v) ? '' : 'needs a name'),
    castJoin: v => (typeof v !== 'string' || !(lists.cast || []).includes(v) ? 'needs the key of a main character' : ''),
    castLater: v => (typeof v !== 'string' || !(lists.cast || []).includes(v) ? 'needs the key of a main character' : ''),
    gainSkill: v => (!isObj(v) ? 'needs { post, n }' : !(lists.posts || []).includes(v.post) ? `${v.post} is not a post` : !Number.isFinite(v.n) ? 'n must be a number' : ''),
    opinion: v => (!isObj(v) ? 'needs { who, min }' : !['captain', 'xo', ...(lists.cast || [])].includes(v.who) ? `${v.who} is not the captain, the first officer or a main character` : !Number.isFinite(v.min) ? 'min must be a number' : ''),
  };

  // A kind: parse(text) gives { value } or { error }, format(value) gives the text, and `def` is what a new entry starts with.
  function kindOf(spec) {
    const [base, what] = (spec || 'json').split(':'), names = what ? lists[what] : null;
    const known = v => (!names || names.includes(v) ? null : `${v} is not ${NAMES[what] || what}`);
    const split = d => d.split(',').map(x => x.trim()).filter(Boolean);
    switch (base) {
      case 'number': return { parse: d => (d.trim() !== '' && Number.isFinite(Number(d)) ? ok(Number(d)) : no('needs a number')), format: String, def: '0', input: 'number' };
      case 'chance': return { parse: d => (d.trim() !== '' && Number(d) >= 0 && Number(d) <= 1 ? ok(Number(d)) : no('needs a number from 0 to 1')), format: String, def: '0.5', input: 'number' };
      case 'flag': return { parse: d => (d === 'true' ? ok(true) : d === 'false' ? ok(false) : no('needs true or false')), format: String, def: 'true', select: ['true', 'false'] };
      case 'text': return { parse: d => (d.trim() ? ok(d.trim()) : no('needs some text')), format: String, def: '' };
      case 'one': return { parse: d => (!d.trim() ? no('needs a name') : known(d.trim()) ? no(known(d.trim())) : ok(d.trim())), format: String, def: '', list: what };
      case 'list': return {
        parse: d => { const items = split(d); const bad = items.find(i => known(i)); return !items.length ? no('needs at least one name') : bad ? no(known(bad)) : ok(items.length === 1 ? items[0] : items); },
        format: v => [].concat(v).join(', '), def: '', list: what, hint: 'names, separated by commas',
      };
      case 'flagOr': return { parse: d => (d.trim() === 'true' ? ok(true) : !d.trim() ? no('needs true or a name') : known(d.trim()) ? no(known(d.trim())) : ok(d.trim())), format: String, def: 'true', list: what, hint: 'true, or a name' };
      case 'map': return {
        parse: d => {
          const out = dict(), pairs = split(d);
          if (!pairs.length) return no('needs at least one name=number');
          for (const pair of pairs) {
            const [k, n] = pair.split('=').map(x => x.trim());
            if (!k || n === undefined || n === '' || !Number.isFinite(Number(n))) return no(`"${pair}" needs the form name=number`);
            if (what === 'like' ? !LIKE_KEY.test(k) : known(k)) return no(what === 'like' ? `${k} is not captain, crew or thread:name` : known(k));
            out[k] = Number(n);
          }
          return ok(out);
        },
        format: v => Object.entries(v).map(([k, n]) => `${k}=${n}`).join(', '), def: '', list: what === 'like' ? '' : what, hint: 'name=number, separated by commas',
      };
      case 'shape': return {
        parse: d => { let v; try { v = JSON.parse(d); } catch (e) { return no('needs valid JSON'); } const e = SHAPES[what](v); return e ? no(e) : ok(v); },
        format: v => JSON.stringify(v), def: { castLike: '{"who":"","n":1,"memory":""}', castFlag: '{"who":"","flag":""}', castXp: '{"who":"","role":"","n":1}', captainLike: '{"n":1,"memory":""}', captainFlag: '""', mateLike: '{"n":1,"memory":""}', remember: '""', gainSkill: '{"post":"","n":1}', castJoin: '""', castLater: '""', opinion: '{"who":"captain","min":0}' }[what], hint: 'JSON',
      };
      case 'action': return {
        parse: d => {
          const s = d.trim();
          if (!s) return no('needs an action name');
          let v = s;
          if (s.startsWith('[')) { try { v = JSON.parse(s); } catch (e) { return no('needs a name, or a list as JSON'); } }
          const name = [].concat(v)[0];
          return !Array.isArray(v) && typeof v !== 'string' ? no('needs a name, or a list as JSON') : lists.actions && !lists.actions.includes(name) ? no(`${name} is not an action the game has`) : ok(v);
        },
        format: v => (typeof v === 'string' ? v : JSON.stringify(v)), def: '', list: 'actions', hint: 'an action name, or ["name", args...]',
      };
      default: return {
        parse: d => {
          let v;
          try { v = JSON.parse(d); } catch (e) { return no('needs valid JSON'); }
          for (const f of ['onDone', 'onFail']) if (v && typeof v === 'object' && v[f] && typeof v[f] === 'object') { const k = Object.keys(v[f]).find(x => lists.effects && !lists.effects.includes(x)); if (k) return no(`unknown effect "${k}" in ${f}`); }
          return ok(v);
        },
        format: v => JSON.stringify(v), def: '{}', hint: 'JSON', fallback: !spec,
      };
    }
  }
  const effectsEditable = (r, i) => !r.edit || !r.edit.choices[i] || r.edit.choices[i].effects !== false;  // a code choice of a hired scene keeps its effects in code
  const specTable = path => (/effects$/.test(path) ? EFFECT_SPEC : CONDITION_SPEC);
  const STRUCT_PATH = /^c(\d+)\.(when|effects|next)$/;
  const RATE_PATH = /^rate\.(weight|every|off)$/;  // how often a color scene comes up (#341): scalars, kept as the text typed
  const structOf = (r, path) => { const rate = RATE_PATH.exec(path); if (rate) return rate[1] === 'off' ? false : r.pacing[rate[1]]; const m = STRUCT_PATH.exec(path); return m ? r.choices[m[1]][m[2]] : r.when; };
  // What is wrong with a rate typed in: '' if it is fine.
  function rateError(r, field, text) {
    const s = String(text).trim(), n = Number(s);
    if (field === 'weight') return s !== '' && Number.isFinite(n) && n >= 0 && n <= 100 ? '' : 'needs a number from 0 to 100';
    if (field === 'every') return s === '' || !Number.isInteger(n) || n < 0 || n > 365 ? 'needs a whole number of days from 0 to 365' : r.pacing.once ? 'it plays once, so it has no cooldown' : '';
    return s === 'true' || s === 'false' ? '' : 'needs true or false';
  }
  const toDrafts = (obj, table) => Object.entries(obj || {}).map(([k, v]) => [k, kindOf(table[k]).format(v)]);
  // A form's entries, read: { value, errors }, an error for each entry that does not parse.
  function readRules(drafts, table) {
    const value = dict(), errors = dict();
    const known = table === EFFECT_SPEC ? lists.effects : lists.conditions;
    for (const [k, d] of drafts) {
      const r = kindOf(table[k]).parse(d);
      if (known && !known.includes(k)) errors[k] = 'is not something the game has';  // the forms never offer one; a file can name one
      else if (r.error) errors[k] = r.error; else value[k] = r.value;
    }
    return { value, errors };
  }
  let sceneIds = () => [];  // every scene a link can lead to: the game's data scenes and the new ones (set by mount)
  const nextError = d => (d.trim() && !sceneIds().includes(d.trim()) ? `${d.trim()} is not a scene` : '');
  const canon = v => JSON.stringify(v, (k, x) => (x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.entries(x).sort(([a], [b]) => (a < b ? -1 : 1))) : x));
  // The entries a field shows: what has been typed, or the shipped ones until it is touched.
  const draftsFor = (r, path, struct) => (struct[r.id] && struct[r.id][path]) || toDrafts(structOf(r, path), specTable(path));
  const nextFor = (r, path, struct) => (struct[r.id] && struct[r.id][path] !== undefined ? struct[r.id][path] : structOf(r, path)) || '';
  // Start editing a field: copy the shipped entries into the drafts.
  function touch(r, path, struct) {
    const mine = struct[r.id] = struct[r.id] || dict();
    if (mine[path] === undefined) mine[path] = /next$/.test(path) ? structOf(r, path) : toDrafts(structOf(r, path), specTable(path));
    return mine;
  }
  // The changes held in the drafts: one value for each field that parses and differs from the shipped one. A field with a problem is left out.
  function structChanges(r, struct) {
    const out = [], problems = [];
    for (const [path, drafts] of Object.entries(struct[r.id] || {})) {
      const rate = RATE_PATH.exec(path);
      if (rate) {
        const err = r.pacing && r.pacing.editable ? rateError(r, rate[1], drafts) : 'this scene is not drawn by weight';
        if (err) problems.push(`${rate[1]}: ${err}`);
        else {
          const v = rate[1] === 'off' ? drafts === 'true' : Number(drafts);
          if (v !== structOf(r, path)) out.push([path, v]);
        }
        continue;
      }
      if (/next$/.test(path)) {
        const err = nextError(drafts);
        if (err) problems.push(`${path}: ${err}`);
        else if (drafts.trim() !== structOf(r, path)) out.push([path, drafts.trim() || null]);
        continue;
      }
      const { value, errors } = readRules(drafts, specTable(path));
      if (Object.keys(errors).length) problems.push(`${path}: ${Object.entries(errors).map(([k, e]) => `${k} ${e}`).join('; ')}`);
      else if (canon(value) !== canon(structOf(r, path))) out.push([path, value]);
    }
    return { out, problems };
  }
  // Every condition, effect and link of the scenes, read into the forms' drafts and back: the ones that do not come back the same.
  function roundTrips(rows) {
    const bad = [];
    for (const r of rows.filter(x => isStorylet(x) || (x.registry && x.kind === 'data'))) {
      const paths = [...(r.registry ? [] : ['when']), ...r.choices.flatMap((c, i) => (r.registry ? [`c${i}.when`, `c${i}.effects`] : [`c${i}.when`, `c${i}.effects`]))];
      for (const path of paths) {
        const { value, errors } = readRules(toDrafts(structOf(r, path), specTable(path)), specTable(path));
        if (Object.keys(errors).length || canon(value) !== canon(structOf(r, path))) bad.push(`${r.id} ${path}: ${JSON.stringify(errors)}`);
      }
    }
    return bad;
  }
  function structFrom(overrides) {
    const struct = dict();
    for (const [id, o] of Object.entries(overrides || {})) {
      const mine = struct[id] = dict();
      for (const f of ['weight', 'every', 'off']) if (o[f] !== undefined) mine[`rate.${f}`] = String(o[f]);
      if (o.when) mine.when = toDrafts(o.when, CONDITION_SPEC);
      for (const [i, c] of Object.entries(o.choices || {})) {
        if (c.when) mine[`c${i}.when`] = toDrafts(c.when, CONDITION_SPEC);
        if (c.effects) mine[`c${i}.effects`] = toDrafts(c.effects, EFFECT_SPEC);
        if (c.next !== undefined) mine[`c${i}.next`] = c.next || '';
      }
    }
    return struct;
  }

  // The {words} of a text that the game would not replace, by the rule the game sent (storylets.js PLACEHOLDER): the same check, run here.
  let rule = null, onPreview = () => {}, newDefs = () => [], pendingNotice = '';
  function badPlaceholders(text) {
    if (!rule) return [];
    const known = new RegExp(rule.source);
    return (String(text).match(/\{[^{}]*\}/g) || []).filter(t => { const m = known.exec(t); return !m || !!(m[1] && !rule.roles.includes(m[1])); });
  }
  const flagOf = v => (!v.trim() ? 'Empty: the shipped words are used.' : badPlaceholders(v).length ? `Not a placeholder the game replaces: ${badPlaceholders(v).join(' ')}` : '');

  const paragraphs = text => text.split('\n').filter(Boolean).map(p => `<p>${esc(p)}</p>`).join('');
  const tableHtml = (rows, selected = '', edited = new Set()) => (rows.length ? `<table>
    <thead><tr><th>Id</th><th>Title</th><th>Where</th><th>Source</th><th>Belongs to</th><th>Kind</th></tr></thead>
    <tbody>${rows.map(r => `<tr class="${r.id === selected ? 'on' : ''}"><td><button data-id="${esc(r.id)}">${esc(r.isNew ? r.sceneId || '(no id yet)' : r.id)}</button></td>
      <td>${esc(r.title || '(untitled)')}${r.isNew ? ' <span class="edited">new</span>' : ''}${r.off ? ' <span class="off">off in the narrow build</span>' : ''}${edited.has(r.id) ? ' <span class="edited">edited</span>' : ''}</td><td>${esc(r.where)}</td><td>${esc(r.file)}</td><td>${esc(r.belongs)}</td><td>${esc(r.kind)}</td></tr>`).join('')}</tbody>
  </table>` : '<p class="hint">No scene matches.</p>');

  // One field of the form: the shipped words, and below them the box for yours. A field the form cannot edit shows only the shipped words.
  function fieldHtml(r, path, label, value) {
    const shipped = shippedOf(r, path), editable = editableOf(r, path);
    return `<div class="field">
      <label for="f-${esc(path)}">${esc(label)}</label>
      <div class="shipped"><span class="hint">Shipped</span>${shipped ? paragraphs(shipped) : '<p class="hint">(none)</p>'}</div>
      ${editable ? `<textarea id="f-${esc(path)}" data-path="${esc(path)}" rows="${Math.max(2, Math.ceil((value || shipped || '').length / 60))}">${esc(value === undefined ? shipped : value)}</textarea>
        <div class="warn" data-warn="${esc(path)}" role="status">${esc(value === undefined ? '' : flagOf(value))}</div>`
        : r.registry ? '<p class="hint">Its text is built from the game state when it plays, so it is edited in code.</p>' : '<p class="hint">This one has parts that depend on conditions. It is edited in code until the conditions can be edited (story 4).</p>'}
      ${editable && r.registry && !r.table && /\.result$/.test(path) && !effectsEditable(r, Number(/^c(\d+)/.exec(path)[1])) ? '<p class="hint">This choice runs code. A result written here replaces the line it returns.</p>' : ''}
    </div>`;
  }


  const ruleInputHtml = (path, key, draft, kind) => {
    const attrs = `data-rpath="${esc(path)}" data-rkey="${esc(key)}" aria-label="${esc(key)}"`;
    if (kind.select) return `<select ${attrs}>${kind.select.map(o => `<option${o === draft ? ' selected' : ''}>${esc(o)}</option>`).join('')}</select>`;
    return `<input type="${kind.input === 'number' ? 'number' : 'text'}" step="any" ${attrs} value="${esc(draft)}"${kind.list ? ` list="dl-${esc(kind.list)}"` : ''}${kind.hint ? ` placeholder="${esc(kind.hint)}"` : ''}>`;
  };
  function rulesHtml(r, path, title, struct) {
    const table = specTable(path), effects = /effects$/.test(path), drafts = draftsFor(r, path, struct), { errors } = readRules(drafts, table);
    const all = (effects ? lists.effects : lists.conditions) || Object.keys(table), used = new Set(drafts.map(d => d[0]));
    return `<div class="rules"><h4>${esc(title)}</h4>
      ${drafts.length ? drafts.map(([k, d]) => { const kind = kindOf(table[k]); return `<div class="rule"><span class="key">${esc(k)}</span>${ruleInputHtml(path, k, d, kind)}
        <button data-drop="${esc(path)}" data-dkey="${esc(k)}">Remove</button>${kind.fallback ? ' <span class="hint">no form for this yet: JSON</span>' : ''}
        <div class="warn" data-rerr="${esc(path)}|${esc(k)}">${esc(errors[k] || '')}</div></div>`; }).join('') : '<p class="hint">None.</p>'}
      <select data-add="${esc(path)}" aria-label="${esc(title)}: add"><option value="">Add ${effects ? 'an effect' : 'a condition'}</option>${all.filter(k => !used.has(k)).map(k => `<option value="${esc(k)}">${esc(k)}</option>`).join('')}</select></div>`;
  }
  const nextHtml = (r, path, struct) => { const d = nextFor(r, path, struct); return `<div class="rules"><h4>Leads on to</h4><div class="rule"><input type="text" data-rnext="${esc(path)}" value="${esc(d)}" list="dl-scenes" placeholder="no link" aria-label="Leads on to"><div class="warn" data-rerr="${esc(path)}">${esc(nextError(d))}</div></div></div>`; };
  const problemsOf = (r, struct) => structChanges(r, struct).problems;
  const problemsHtml = (r, struct) => { const p = problemsOf(r, struct); return p.length ? `<p class="warn">Left out of the changes until fixed: ${esc(p.join(' | '))}</p>` : ''; };
  const structHtml = (r, struct) => (r.table
    ? '<h3>What its choices do</h3><p class="note">This scene is played by one template from a table: its odds, what a win or a loss gains and costs, and the roll are in code. Only its words are edited here.</p>'
    : r.registry
    ? `<h3>What its choices do</h3>
    <p class="note">A scene of the hired chapter plays by its days and its place in the story, not by conditions, so only what a data choice needs and does is edited here. Changing a condition or an effect changes how the scene plays, not only its words. Try it with Play this scene, at the right.</p>
    <div id="problems">${problemsHtml(r, struct)}</div>
    ${r.choices.map((c, i) => `<h4>Choice ${i + 1}: ${esc(c.label)}</h4>${effectsEditable(r, i) ? rulesHtml(r, `c${i}.when`, 'It can be taken when', struct) + rulesHtml(r, `c${i}.effects`, 'It does', struct) : '<p class="hint">This choice runs code. Its conditions and effects are written there, and only its words are edited here: a result written here replaces the line it returns.</p>'}`).join('')}`
    : `<h3>When it appears, and what it does</h3>
    <p class="note">Changing a condition or an effect changes how the scene plays, not only its words. Try it with Play this scene, at the right.</p>
    <div id="problems">${problemsHtml(r, struct)}</div>
    ${rulesHtml(r, 'when', 'The scene appears when', struct)}
    ${r.choices.map((c, i) => `<h4>Choice ${i + 1}: ${esc(c.label)}</h4>${rulesHtml(r, `c${i}.when`, 'It can be taken when', struct)}${rulesHtml(r, `c${i}.effects`, 'It does', struct)}${nextHtml(r, `c${i}.next`, struct)}`).join('')}`);

  const PART_NAMES = { cold: 'Opening, if they think poorly of you', neutral: 'Opening, if they are neutral', warm: 'Opening, if they trust you', crew: 'If crew go with you ({names})', secret: 'If you learned their secret', xo: 'If the first officer is alive', xoDead: 'If the first officer is dead', repaid: 'If they repaid a loan', parting: 'Parting line' };
  function formHtml(r, values = {}) {
    const mine = values[r.id] || {};
    return `<h3>Your words</h3><div class="form" data-form="${esc(r.id)}">
      ${fieldHtml(r, 'title', 'Title', mine.title)}${r.parts ? Object.keys(r.parts).map(k => fieldHtml(r, `p.${k}`, PART_NAMES[k] || k, mine[`p.${k}`])).join('') : fieldHtml(r, 'text', r.text2 !== undefined ? 'Opening 1' : 'Text', mine.text)}${r.text2 !== undefined ? fieldHtml(r, 'text2', 'Opening 2', mine.text2) : ''}
      ${r.choices.map((c, i) => `<h4>Choice ${i + 1}${c.post ? ` (${esc(c.post)}'s own)` : ''}</h4>${fieldHtml(r, `c${i}.label`, 'Label', mine[`c${i}.label`])}${[['result', 'Result'], ['win', 'If it works'], ['lose', 'If it fails']].filter(([f]) => c[f] !== undefined).map(([f, name]) => fieldHtml(r, `c${i}.${f}`, name, mine[`c${i}.${f}`])).join('')}`).join('')}
    </div>`;
  }

  const changesHtml = (rows, values, struct) => `<h3>Changes so far</h3>
    <p class="hint">Only what differs from the shipped words. Saving, export and revert come with story 6; until then this is the whole of js/overrides.js to paste in.</p>
    <pre id="changes">${esc(fileText(overridesFrom(rows, values, struct), newDefs()))}</pre>`;

  function detailHtml(r, values = {}, rows = [], struct = dict()) {
    if (!r) return '<p class="hint">Choose a scene to read it.</p>';
    if (editable(r)) {
      return `<h2>${esc(r.title)}</h2>
        <p class="hint">${esc(r.id)} | ${esc(r.where)} | ${esc(r.file)} | ${esc(r.belongs)} | ${esc(r.kind)}${r.off ? ' | off in the narrow build' : ''}</p>
        ${r.registry && r.conditionsNote ? `<p>${esc(r.conditionsNote)}</p>` : ''}${r.registry && r.codeNote ? `<p class="note">${esc(r.codeNote)}</p>` : ''}
        <p class="hint">Placeholders such as {captain}, {planet} and {crew:pilot} are kept as typed.</p>
        <button data-action="revert-scene">Revert this scene to the shipped version</button>
        ${formHtml(r, values)}${structHtml(r, struct)}${pacingHtml(r, struct)}${changesHtml(rows, values, struct)}`;
    }
    return `
    <h2>${esc(r.title)}</h2>
    <p class="hint">${esc(r.id)} | ${esc(r.where)} | ${esc(r.file)} | ${esc(r.belongs)} | ${esc(r.kind)}${r.off ? ' | off in the narrow build' : ''}</p>
    ${r.codeNote ? `<p class="note">${esc(r.codeNote)}</p>` : ''}
    ${r.conditionsNote ? `<h3>When it plays</h3><p>${esc(r.conditionsNote)}</p><p class="hint">Its conditions and effects are written in code, and are read only until story 8.</p>` : ''}
    ${paragraphs(r.text)}${r.text2 ? paragraphs(r.text2) : ''}
    ${r.choices.length ? `<h3>Choices</h3><ol>${r.choices.map(c => `<li><strong>${esc(c.label)}</strong>${c.result ? paragraphs(c.result) : ''}${c.win ? `<p><em>If it works:</em></p>${paragraphs(c.win)}` : ''}${c.lose ? `<p><em>If it fails:</em></p>${paragraphs(c.lose)}` : ''}</li>`).join('')}</ol>` : ''}
    ${pacingHtml(r)}
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
        <fieldset><legend>How often it comes up</legend>
          <label>Games <input type="number" min="1" max="200" data-sim="seeds" value="30"></label>
          <label>Burns each <input type="number" min="1" max="40" data-sim="burns" value="10"></label>
          <button data-action="simulate" disabled>Simulate</button>
          <div id="pv-sim" role="status"></div>
        </fieldset>
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
    else if (!m.note) box.append(el('p', 'Every condition of the scene holds in this state.', 'ok'));
    if (m.chance !== undefined) box.append(el('p', `It also has a chance of ${m.chance}, rolled when the game picks a scene.`, 'hint'));
    if (m.chained) box.append(el('p', 'It only plays after another scene leads into it.', 'hint'));
    if (m.note) box.append(el('p', m.note, 'hint'));
    for (const c of m.shut) box.append(el('p', `Choice ${c.n} is shut:`, 'warn'), listEl(c.why));
    return box;
  }
  const pct = x => `${(x * 100).toFixed(1)} percent`;
  function simNode(m) {
    const box = el('div');
    if (m.error) { box.append(el('p', m.error, 'note')); return box; }
    const unit = m.where, s = m.scene;
    box.append(el('p', `Sample: ${m.sample.seeds} games of ${m.sample.burns} ${unit}s, ${m.sample.total} ${unit}s and ${m.sample.draws} draws in all.`, 'hint'));
    box.append(el('p', s.plays ? `This scene played ${s.plays} times: ${s.perBurn.toFixed(3)} a ${unit}. It came up in ${pct(s.burnsWith)} of ${unit}s (a range of ${pct(s.range[0])} to ${pct(s.range[1])}).` : `This scene did not play once in ${m.sample.total} ${unit}s.`, s.plays ? 'ok' : 'warn'));
    box.append(el('p', `A draw was quiet ${pct(m.quietShare)} of the time. Events a ${unit}: ${m.eventsPerBurn.toFixed(2)}.`));
    if (m.top.length) { box.append(el('p', `What came up most, a ${unit}:`, 'hint'), listEl(m.top.map(x => `${x.title}: ${x.perBurn.toFixed(3)}`))); }
    box.append(el('p', 'A sample from this state, not a rule of the game. It is not part of the tests.', 'hint'));
    return box;
  }
  function effectsNode(m) {
    const box = el('div');
    box.append(el('h3', `You chose: ${m.label}`), m.lines.length ? listEl(m.lines) : el('p', 'Nothing it tracks changed.', 'hint'));
    return box;
  }



  // ---------- keeping, exporting, importing and reverting (#340) ----------
  // js/overrides.js as a whole: its two comments are copied here, and tests/editorsave.test.js checks that an export with no changes is the file as it
  // is, so a change to the comments there is a change here. The editor never writes the file; it hands over this text to download.
  const FILE_HEAD = "'use strict';\n\n// The scene editor's changes to the shipped scenes (#336, #338), and nothing else. Keyed by a storylet's id, then by what changes: title, text,\n// `when` (the scene's conditions, replaced whole), and choices, which is keyed by the choice's place in the scene's list (0 is the first), each\n// with a label and/or a result line, and `when`, `effects` (each replaced whole) and `next` (a scene's id, or null for no link). A color scene\n// (one the game draws by weight) also takes `weight` (0 to 100), `every` (days before it can come round again) and `off: true`:\n//   { 'port-mars-front': { title: '...', when: { day: 5 }, choices: { 0: { label: '...', result: '...', effects: { credits: 100 }, next: 'port-mars-sky' } } } }\n// storyletEvent (js/storylets.js) puts these in front of the shipped scene when it builds it. Empty means the shipped game. An id that is not a\n// scene, or a word that is not text, is left out with one console warning. Conditions, effects and links are held to the check addStorylet\n// makes: a scene's changes to them that it would refuse are all left out.\n";
  const FILE_MID = "\n// Scenes the editor wrote from scratch (#339): a list of storylets, each as addStorylet takes it ({ id, where, title, text, when, choices: [...] }).\n// They are added to the game's scenes when the first game starts, through addStorylet, so one it would refuse (an unknown condition, a repeated id)\n// is logged and left out.\n";
  const exportText = (overrides, newScenes) => `${FILE_HEAD}const SCENE_OVERRIDES = ${JSON.stringify(overrides, null, 2)};\n${FILE_MID}const NEW_SCENES = ${JSON.stringify(newScenes, null, 2)};\n`;

  // What an exported (or hand-written) file holds, read without running it: the two literals are cut out of the text and parsed as JSON. A file that
  // is anything else, JS that would do something included, is not read.
  function parseImport(text) {
    const s = String(text).replace(/^﻿/, '');
    const m = /(?:^|\n)\s*const\s+SCENE_OVERRIDES\s*=\s*([\s\S]*?);[ \t]*\r?\n(?:\s*\/\/[^\n]*\n)*\s*const\s+NEW_SCENES\s*=\s*([\s\S]*?);\s*$/.exec(s);
    const asJson = () => { try { const j = JSON.parse(s); return j && typeof j === 'object' ? { overrides: j.overrides, newScenes: j.newScenes } : null; } catch (e) { return null; } };
    if (!m) { const j = asJson(); return j || { error: 'This is not a file the editor wrote: it has no SCENE_OVERRIDES and NEW_SCENES. Nothing in it was run.' }; }
    try { return { overrides: JSON.parse(m[1]), newScenes: JSON.parse(m[2]) }; } catch (e) { return { error: `The changes in this file are not plain data the editor can read (${String(e.message).slice(0, 80)}). Nothing in it was run.` }; }
  }

  const LIMIT = { text: 4000, entries: 100, scenes: 300 };
  const isObj = v => !!v && typeof v === 'object' && !Array.isArray(v);
  // A scene's conditions or effects from a file, checked by the forms' own kinds: '' if they are all fine, else what is wrong with the first.
  function rulesError(value, table, known) {
    if (!isObj(value)) return 'is not a list of names and values';
    const keys = Object.keys(value);
    if (keys.length > LIMIT.entries) return `has more than ${LIMIT.entries} entries`;
    for (const k of keys) {
      if (!(known || []).includes(k)) return `has ${k}, which the game does not have`;
      const kind = kindOf(table[k]), r = kind.parse(kind.format(value[k]));
      if (r.error) return `${k} ${r.error}`;
    }
    return '';
  }
  // What importing a file would do, item by item: the changes it can make, and what is refused and why. Nothing is applied here.
  function planImport(parsed, rows) {
    const items = [], accepted = { overrides: dict(), scenes: [] }, byId = new Map(rows.filter(editable).map(r => [r.id, r])), storylets = new Set(rows.filter(isStorylet).map(r => r.id));
    const ok = text => items.push({ ok: true, text }), refuse = text => items.push({ ok: false, text });
    const words = v => typeof v === 'string' && v.trim() !== '' && v.length <= LIMIT.text;
    const sceneIds = () => [...byId.keys(), ...accepted.scenes.map(d => d.id)];
    const ov = parsed.overrides === undefined ? {} : parsed.overrides;
    if (!isObj(ov)) refuse('SCENE_OVERRIDES is not an object, so none of it is read');
    else {
      const entries = Object.entries(ov);
      if (entries.length > LIMIT.scenes) refuse(`SCENE_OVERRIDES has more than ${LIMIT.scenes} scenes; the rest are not read`);
      for (const [id, s] of entries.slice(0, LIMIT.scenes)) {
        const r = byId.get(id);
        if (!r) { refuse(`${id}: not a scene in the game`); continue; }
        if (!isObj(s)) { refuse(`${id}: is not an object`); continue; }
        const keep = dict(), what = [];
        for (const [k, v] of Object.entries(s)) {
          if (k === 'text2') {
            if (!r.edit.text2) refuse(`${id} text2: this scene has no second opening`);
            else if (!words(v)) refuse(`${id} text2: needs some text of up to ${LIMIT.text} characters`);
            else { keep.text2 = v; what.push('text2'); }
          } else if (k === 'parts') {
            if (!r.parts) refuse(`${id} parts: this scene has no parts`);
            else if (!isObj(v)) refuse(`${id} parts: is not an object`);
            else for (const [name, x] of Object.entries(v)) {
              if (!(r.edit.parts || {})[name]) refuse(`${id} part ${name}: this scene has no such part`);
              else if (!words(x)) refuse(`${id} part ${name}: needs some text of up to ${LIMIT.text} characters`);
              else { (keep.parts = keep.parts || dict())[name] = x; what.push(`part ${name}`); }
            }
          } else if (k === 'title' || k === 'text') {
            if (k === 'text' && !r.edit.text) refuse(`${id} text: it has parts that depend on conditions, so it is edited in code`);
            else if (!words(v)) refuse(`${id} ${k}: needs some text of up to ${LIMIT.text} characters`);
            else { keep[k] = v; what.push(k); }
          } else if (k === 'weight' || k === 'every' || k === 'off') {
            const bad = r.registry || !r.pacing || !r.pacing.editable ? 'this scene is not drawn by weight' : rateError(r, k, String(v));
            if (bad || (k === 'off' && v !== true) || typeof v === 'string') refuse(`${id} ${k}: ${bad || 'needs a number (or true for off)'}`); else { keep[k] = v; what.push(k); }
          } else if (k === 'when') {
            const e = r.registry ? 'a hired scene plays by its days, not by conditions' : rulesError(v, CONDITION_SPEC, lists.conditions);
            if (e) refuse(`${id} when: ${e}`); else { keep.when = v; what.push('conditions'); }
          } else if (k === 'choices' && isObj(v)) {
            for (const [i, c] of Object.entries(v)) {
              const at = `${id} choice ${Number(i) + 1}`;
              if (!/^\d+$/.test(i) || Number(i) >= r.choices.length) { refuse(`${id}: no choice ${i}`); continue; }
              if (!isObj(c)) { refuse(`${at}: is not an object`); continue; }
              for (const [f, x] of Object.entries(c)) {
                let bad = '';
                if (f === 'label' || f === 'result' || f === 'win' || f === 'lose') bad = r.edit.choices[i][f] === undefined ? 'is not something this choice has' : !r.edit.choices[i][f] ? 'has parts that depend on conditions, so it is edited in code' : words(x) ? '' : `needs some text of up to ${LIMIT.text} characters`;
                else if (f === 'when') bad = r.registry && !effectsEditable(r, Number(i)) ? 'this choice runs code, so its conditions are not edited' : rulesError(x, CONDITION_SPEC, lists.conditions);
                else if (f === 'effects') bad = r.registry && !effectsEditable(r, Number(i)) ? 'this choice runs code, so its effects are not edited' : rulesError(x, EFFECT_SPEC, lists.effects);
                else if (f === 'next') bad = r.registry ? 'a hired scene plays by its days, not by conditions' : x === null || (typeof x === 'string' && storylets.has(x)) ? '' : 'leads to a scene that is not there';
                else bad = 'is not something the editor changes';
                if (bad) { refuse(`${at} ${f}: ${bad}`); continue; }
                keep.choices = keep.choices || dict(); (keep.choices[i] = keep.choices[i] || dict())[f] = x;
                what.push(`choice ${Number(i) + 1} ${f}`);
              }
            }
          } else refuse(`${id} ${k}: is not something the editor changes`);
        }
        if (Object.keys(keep).length) { accepted.overrides[id] = keep; ok(`${id}: ${[...new Set(what)].join(', ')}`); }
      }
    }
    const list = parsed.newScenes === undefined ? [] : parsed.newScenes;
    if (!Array.isArray(list)) refuse('NEW_SCENES is not a list, so none of it is read');
    else {
      if (list.length > LIMIT.scenes) refuse(`NEW_SCENES has more than ${LIMIT.scenes} scenes; the rest are not read`);
      for (const def of list.slice(0, LIMIT.scenes)) {
        if (!isObj(def)) { refuse('a new scene that is not an object'); continue; }
        const name = `new scene ${typeof def.id === 'string' && def.id ? def.id : '(no id)'}`;
        if (JSON.stringify(def).length > LIMIT.text * 10) { refuse(`${name}: too large`); continue; }
        const probe = dict(), draft = draftFromDef(def, probe), problems = newProblems(draft, probe, sceneIds());
        if (problems.length) refuse(`${name}: ${problems.join('; ')}`); else { accepted.scenes.push(newSceneDef(draft, probe)); ok(name); }
      }
    }
    return { items, accepted };
  }

  // The editor's state as it is kept in the browser, and read back (anything that is not the right shape is ignored).
  const STORE_KEY = 'maxGravity.editor.v1';
  const snapshotOf = (values, struct, newRows, base, key = newKey) => JSON.stringify({ v: 1, base, newKey: key, values, struct, newRows });
  function readSnapshot(text) {
    try {
      const s = JSON.parse(text);
      if (!isObj(s) || s.v !== 1 || !isObj(s.values) || !isObj(s.struct) || !Array.isArray(s.newRows)) return null;
      const values = dict(), struct = dict();
      for (const [id, v] of Object.entries(s.values)) if (isObj(v)) values[id] = Object.assign(dict(), Object.fromEntries(Object.entries(v).filter(([, x]) => typeof x === 'string')));
      for (const [id, v] of Object.entries(s.struct)) if (isObj(v)) struct[id] = Object.assign(dict(), Object.fromEntries(Object.entries(v).filter(([p, x]) => typeof x === 'string' ? /next$|^rate\.(weight|every|off)$/.test(p) : Array.isArray(x) && x.every(e => Array.isArray(e) && typeof e[0] === 'string' && typeof e[1] === 'string'))));
      const newRows = s.newRows.filter(r => isObj(r) && typeof r.id === 'string' && /^new:\d+$/.test(r.id) && r.isNew === true && Array.isArray(r.choices))
        .map(r => ({ ...newRow(), ...r, choices: r.choices.map(c => ({ ...newChoice(), ...(isObj(c) ? c : {}) })) }));
      return { values, struct, newRows, newKey: Number(s.newKey) || 1, base: typeof s.base === 'string' ? s.base : '' };
    } catch (e) { return null; }
  }

  // ---------- new scenes and chains (#339) ----------
  // A scene written from scratch is a draft row like the shipped ones (so the same forms edit it), with its own key and what is typed for its
  // id, title, text and choices on the row. What the forms hold for its conditions, effects and links are drafts in the same `struct`.
  let newKey = 1;
  const newChoice = () => ({ label: '', result: '', when: {}, effects: {}, next: '', extra: {} });
  const newRow = () => ({ id: `new:${newKey++}`, kind: 'data', isNew: true, file: 'js/overrides.js', belongs: 'new scene', off: false, where: 'port', via: '', chained: false, sceneId: '', title: '', text: '', when: {}, extra: {}, choices: [newChoice()] });
  const SCENE_ID = /^[\w:.-]+$/;
  const keysOf = o => Object.keys(o || {});
  // The scene as addStorylet takes it, from a draft: the fields the form has, in a readable order, and none that are empty.
  function newSceneDef(r, struct) {
    const val = path => readRules(draftsFor(r, path, struct), specTable(path)).value;
    const def = { id: r.sceneId.trim(), where: r.where, title: r.title.trim(), text: r.textRaw || r.text.trim() };
    if (r.via) def.via = r.via;
    if (r.chained) def.chained = true;
    Object.assign(def, r.extra);
    const when = val('when');
    if (keysOf(when).length) def.when = when;
    def.choices = r.choices.map((c, i) => {
      const o = { label: c.labelRaw || c.label.trim() }, w = val(`c${i}.when`), e = val(`c${i}.effects`), n = nextFor(r, `c${i}.next`, struct).trim();
      if (c.resultRaw || c.result.trim()) o.result = c.resultRaw || c.result.trim();
      Object.assign(o, c.extra);
      if (keysOf(w).length) o.when = w;
      if (keysOf(e).length) o.effects = e;
      if (n) o.next = n;
      return o;
    });
    return def;
  }
  // What stops a draft from being a scene the game takes: the id, the words, a choice, a field that does not fit, a link to nothing.
  function newProblems(r, struct, takenIds) {
    const p = [], id = r.sceneId.trim();
    if (!id) p.push('needs an id'); else if (!SCENE_ID.test(id)) p.push('the id may use letters, digits, - _ : and . only'); else if (takenIds.includes(id)) p.push(`the id ${id} is already a scene`);
    if (!r.title.trim()) p.push('needs a title');
    if (!r.textRaw && !r.text.trim()) p.push('needs text');
    if (!r.choices.length) p.push('needs a choice');
    r.choices.forEach((c, i) => { if (!c.labelRaw && !c.label.trim()) p.push(`choice ${i + 1} needs a label`); });
    for (const path of ['when', ...r.choices.flatMap((c, i) => [`c${i}.when`, `c${i}.effects`])]) {
      const errors = readRules(draftsFor(r, path, struct), specTable(path)).errors;
      for (const [k, e] of Object.entries(errors)) p.push(`${path === 'when' ? 'the scene' : `choice ${Number(/\d+/.exec(path)[0]) + 1}`} ${path.replace(/^c\d+\./, '')}: ${k} ${e}`);
    }
    r.choices.forEach((c, i) => { const e = nextError(nextFor(r, `c${i}.next`, struct)); if (e) p.push(`choice ${i + 1}: ${e}`); });
    return p;
  }
  // A draft from a scene the file already holds.
  function draftFromDef(def, struct) {
    const r = newRow(), own = (o, keys) => Object.fromEntries(Object.entries(o).filter(([k]) => !keys.includes(k)));
    Object.assign(r, { sceneId: String(def.id || ''), title: String(def.title || ''), text: plain(def.text), where: def.where === 'transit' ? 'transit' : 'port', via: def.via || '', chained: !!def.chained,
      extra: own(def, ['id', 'where', 'title', 'text', 'via', 'chained', 'when', 'choices']) });  // priority, once, every and the like: kept, not edited
    if (Array.isArray(def.text)) r.textRaw = def.text;  // a text of conditional parts: kept as it is
    r.choices = (Array.isArray(def.choices) ? def.choices : []).map(c => {
      const o = isObj(c) ? c : {};
      return { ...newChoice(), label: plain(o.label), result: plain(o.result), extra: own(o, ['label', 'result', 'when', 'effects', 'next']), ...(Array.isArray(o.label) ? { labelRaw: o.label } : {}), ...(Array.isArray(o.result) ? { resultRaw: o.result } : {}) };
    });
    const mine = struct[r.id] = dict();
    if (def.when) mine.when = toDrafts(def.when, CONDITION_SPEC);
    (Array.isArray(def.choices) ? def.choices : []).forEach((c, i) => {
      if (!isObj(c)) return;
      if (c.when) mine[`c${i}.when`] = toDrafts(c.when, CONDITION_SPEC);
      if (c.effects) mine[`c${i}.effects`] = toDrafts(c.effects, EFFECT_SPEC);
      if (c.next) mine[`c${i}.next`] = c.next;
    });
    return r;
  }
  // Takes a choice out of a draft, and moves the drafts of the choices after it up one place.
  function dropChoice(r, i, struct) {
    r.choices.splice(i, 1);
    const old = struct[r.id] || dict(), moved = dict();
    for (const [path, v] of Object.entries(old)) {
      const m = STRUCT_PATH.exec(path);
      if (!m) moved[path] = v;
      else if (Number(m[1]) < i) moved[path] = v;
      else if (Number(m[1]) > i) moved[`c${Number(m[1]) - 1}.${m[2]}`] = v;
    }
    struct[r.id] = moved;
  }

  // A scene as the chain view sees it: its place in a storyline, its conditions and, for each choice, the link and the follow-up it sets going,
  // with the changes in the forms put on top of the shipped scene.
  function modelOf(r, struct) {
    const m = { key: r.id, id: r.isNew ? r.sceneId.trim() : r.id, title: r.title || '(untitled)', group: r.belongs, chained: !!r.chained, when: r.when || {},
      choices: r.choices.map(c => ({ label: c.label, next: c.next || '', effects: c.effects || {} })) };
    // What is typed, even where it has a problem, so a link to a scene that is not there still shows in the chain.
    for (const [path, drafts] of Object.entries(struct[r.id] || {})) {
      if (RATE_PATH.test(path)) continue;
      const s = STRUCT_PATH.exec(path);
      if (s && s[2] === 'next') { m.choices[s[1]].next = drafts.trim(); continue; }
      const value = readRules(drafts, specTable(path)).value;
      if (!s) m.when = value; else if (s[2] === 'effects') m.choices[s[1]].effects = value; else m.choices[s[1]].when = value;
    }
    return m;
  }
  // The links among scenes, and what to look at in a storyline. A link is a choice's `next` (the next scene opens at once) or a follow-up: an effect
  // `later: { name: days }` that a scene waiting on `due: name` picks up. Scenes of the storyline are drawn in the order the links reach them.
  function chainOf(models, group) {
    const byId = new Map(models.filter(m => m.id).map(m => [m.id, m])), waiting = new Map(), links = [];
    for (const m of models) for (const k of [].concat((m.when || {}).due || [])) { if (!waiting.has(k)) waiting.set(k, []); waiting.get(k).push(m.id); }
    for (const m of models) {
      m.choices.forEach((c, i) => {
        const base = { from: m.id, choice: i, label: c.label };
        if (c.next) links.push({ ...base, kind: 'next', to: c.next, missing: !byId.has(c.next) });
        for (const [key, days] of Object.entries((c.effects || {}).later || {})) {
          const to = waiting.get(key) || [];
          if (!to.length) links.push({ ...base, kind: 'later', key, days, to: '', missing: true });
          for (const id of to) links.push({ ...base, kind: 'later', key, days, to: id, missing: false });
        }
      });
    }
    // A choice that sets the story's stage or a flag, or raises a quality, leads to a scene that waits for that.
    const needs = models.flatMap(m => [
      ...Object.entries((m.when || {}).story || {}).map(([k, want]) => ({ to: m.id, kind: 'story', key: k, want })),
      ...Object.entries((m.when || {}).q || {}).map(([k, want]) => ({ to: m.id, kind: 'quality', key: k, want })),
    ]);
    for (const m of models) {
      m.choices.forEach((c, i) => {
        const gives = [
          ...Object.entries((c.effects || {}).story || {}).map(([k, v]) => ({ kind: 'story', key: k, v })),
          ...Object.entries((c.effects || {}).q || {}).map(([k, v]) => ({ kind: 'quality', key: k, v })),
          ...Object.entries((c.effects || {}).set || {}).map(([k, v]) => ({ kind: 'quality', key: k, v })),
        ];
        for (const g of gives) {
          for (const n of needs.filter(x => x.kind === g.kind && x.key === g.key && x.to !== m.id)) {
            const met = g.kind === 'quality' ? Number(g.v) >= Number(n.want) : (g.key === 'stage' || g.key === 'side') ? [].concat(n.want).includes(g.v) : !!g.v === !!n.want;
            if (met && !links.some(l => l.from === m.id && l.choice === i && l.to === n.to && l.kind === g.kind && l.key === g.key)) links.push({ from: m.id, choice: i, label: c.label, kind: g.kind, key: g.key, value: g.v, to: n.to, missing: false });
          }
        }
      });
    }
    const inGroup = models.filter(m => m.group === group && m.id), incoming = new Map(inGroup.map(m => [m.id, []]));
    for (const l of links) if (incoming.has(l.to)) incoming.get(l.to).push(l);
    const depth = new Map(), queue = inGroup.filter(m => !incoming.get(m.id).length).map(m => m.id);
    queue.forEach(id => depth.set(id, 0));
    for (let i = 0; i < queue.length; i++) for (const l of links.filter(x => x.from === queue[i] && incoming.has(x.to) && !depth.has(x.to))) { depth.set(l.to, depth.get(queue[i]) + 1); queue.push(l.to); }
    const nodes = inGroup.map(m => ({
      id: m.id, key: m.key, title: m.title, chained: m.chained, depth: depth.has(m.id) ? depth.get(m.id) : 0, reached: depth.has(m.id),
      incoming: incoming.get(m.id), outgoing: links.filter(l => l.from === m.id),
    })).sort((a, b) => (a.reached === b.reached ? a.depth - b.depth : a.reached ? -1 : 1));
    const problems = [];
    for (const n of nodes) {
      if (n.chained && !n.incoming.some(l => l.kind === 'next' || l.kind === 'later')) problems.push(`${n.id} only plays after another scene leads to it, and no scene in the data does (code can, with chainTo)`);
      for (const l of n.outgoing.filter(x => x.missing)) problems.push(l.kind === 'next' ? `${n.id}: choice ${l.choice + 1} leads to ${l.to}, which is not a scene` : `${n.id}: choice ${l.choice + 1} sets follow-up ${l.key} going, and no scene in the data waits for it (code can)`);
    }
    return { nodes, problems, byId };
  }
  const groupsOf = models => [...new Set(models.map(m => m.group))].sort();
  function chainHtml(chain, models, group, selected) {
    const titleOf = id => (chain.byId.get(id) || {}).title, keyOf = id => (chain.byId.get(id) || {}).key;
    const link = l => {
      const target = l.missing ? `<span class="warn">${esc(l.kind === 'next' ? `${l.to} (not a scene)` : `follow-up ${l.key} (no scene in the data waits for it)`)}</span>`
        : `<button data-id="${esc(keyOf(l.to))}">${esc(titleOf(l.to))}</button> <span class="hint">${esc(l.to)}${chain.byId.get(l.to).group !== group ? `, in ${esc(chain.byId.get(l.to).group)}` : ''}</span>`;
      const how = l.kind === 'later' ? `after ${l.days} days` : l.kind === 'story' ? `by setting the story's ${l.key} to ${l.value}` : l.kind === 'quality' ? `by setting quality ${l.key} to ${l.value}` : '';
      return `<li>Choice ${l.choice + 1}${l.label ? ` (${esc(l.label)})` : ''} leads to ${target}${how ? ` <span class="hint">${esc(how)}</span>` : ''}</li>`;
    };
    return `<h2>Chain: ${esc(group)}</h2>
      <p class="hint">${chain.nodes.length} scenes. A scene is a box; a link is a line under it that leads to the next box: a link from a choice, a follow-up set going for some days, or a stage, flag or quality that another scene waits for. Code can lead to scenes too, and cannot be seen here.</p>
      ${chain.problems.length ? `<div class="warn"><p>To look at:</p>${listEl2(chain.problems)}</div>` : '<p class="ok">Every link in this storyline leads to a scene.</p>'}
      ${chain.nodes.map(n => `<div class="box depth-${Math.min(n.depth, 6)}${n.id === selected || n.key === selected ? ' on' : ''}">
        <button data-id="${esc(n.key)}">${esc(n.title)}</button> <span class="hint">${esc(n.id || '(no id yet)')}</span>
        ${!n.incoming.length ? (n.chained ? ' <span class="warn">nothing leads here</span>' : ' <span class="hint">starts a chain</span>') : ''}${!n.outgoing.length ? ' <span class="hint">ends here</span>' : ''}
        ${n.incoming.length ? `<div class="hint">Reached from ${n.incoming.map(l => `<button data-id="${esc((chain.byId.get(l.from) || {}).key)}">${esc(l.from)}</button>`).join(', ')}</div>` : ''}
        ${n.outgoing.length ? `<ul>${n.outgoing.map(link).join('')}</ul>` : ''}</div>`).join('')}`;
  }
  const listEl2 = items => `<ul>${items.map(x => `<li>${esc(x)}</li>`).join('')}</ul>`;



  // How often a scene comes up, as the page shows it (#341): the facts for every scene, and for a color storylet the boxes that change them.
  const TIER = { 0: '0, the story', 1: '1, due now', 2: '2, drawn by weight' };
  function pacingHtml(r, struct = dict()) {
    const p = r.pacing;
    if (!p) return '';
    const info = `<dl class="pacing"><dt>Tier</dt><dd>${esc(p.tier === null ? 'its own rule' : TIER[p.tier])}</dd><dt>Weight</dt><dd>${esc(p.weight === null ? 'none: it is picked by priority' : p.weight)}</dd><dt>Cooldown</dt><dd>${esc(p.cooldown)}</dd></dl><p class="hint">${esc(p.trigger)}</p>`;
    if (!p.editable) return `<h3>How often it comes up</h3>${info}<p class="hint">Read only: ${p.tier === 0 ? 'a story scene is picked by priority, not by weight' : 'this scene is due by the game\'s state, and is not drawn by weight'}.</p>`;
    const mine = struct[r.id] || {}, draft = f => (mine[`rate.${f}`] !== undefined ? mine[`rate.${f}`] : f === 'off' ? 'false' : String(structOf(r, `rate.${f}`)));
    const warn = f => (mine[`rate.${f}`] !== undefined ? rateError(r, f, mine[`rate.${f}`]) : '');
    return `<h3>How often it comes up</h3>${info}
      <div class="rule"><span class="key">Weight</span><input type="number" min="0" max="100" step="any" data-rate="weight" value="${esc(draft('weight'))}" aria-label="Weight"><span class="hint">1 is as likely as another scene; 0 never</span><div class="warn" data-rerr="rate.weight">${esc(warn('weight'))}</div></div>
      ${p.once ? '<p class="hint">It plays once, so it has no cooldown.</p>' : `<div class="rule"><span class="key">Cooldown</span><input type="number" min="0" max="365" step="1" data-rate="every" value="${esc(draft('every'))}" aria-label="Cooldown in days"><span class="hint">days before it can come round again</span><div class="warn" data-rerr="rate.every">${esc(warn('every'))}</div></div>`}
      <label><input type="checkbox" data-rate="off"${draft('off') === 'true' ? ' checked' : ''}> Never draw this scene</label>`;
  }

  const noticeHtml = (title, body, buttons) => `<div class="notice"><h3>${esc(title)}</h3>${body}<div>${buttons}</div></div>`;
  const shippedHtml = r => `<div class="shipped"><span class="hint">Shipped</span><p><strong>${esc(r.title)}</strong></p>${paragraphs(r.text)}${r.choices.length ? `<ol>${r.choices.map(c => `<li>${esc(c.label)}${c.result ? `: ${esc(c.result)}` : ''}</li>`).join('')}</ol>` : ''}</div>`;
  const revertSceneNotice = r => noticeHtml(`Revert ${r.id} to the shipped version?`, `<p>Your edits to this scene go, and it reads as it does in the game as shipped:</p>${shippedHtml(r)}`,
    '<button data-action="confirm-revert" data-scope="scene">Revert this scene</button> <button data-action="cancel-notice">Keep my edits</button>');
  const revertAllNotice = (edited, rows, newCount) => noticeHtml('Revert everything to the shipped version?',
    `<p>${edited.length} edited scene${edited.length === 1 ? '' : 's'} and ${newCount} new scene${newCount === 1 ? '' : 's'} go. The shipped scenes read as they do in the game as shipped, including these:</p>${edited.slice(0, 5).map(id => shippedHtml(rows.find(r => r.id === id))).join('')}${edited.length > 5 ? `<p class="hint">and ${edited.length - 5} more.</p>` : ''}`,
    '<button data-action="confirm-revert" data-scope="all">Revert everything</button> <button data-action="cancel-notice">Keep my edits</button>');
  const importNotice = plan => {
    const good = plan.items.filter(i => i.ok), bad = plan.items.filter(i => !i.ok);
    return noticeHtml('What importing this file would do', `${good.length ? `<p>It would change:</p>${listEl2(good.map(i => i.text))}` : '<p class="warn">Nothing in it can be imported.</p>'}${bad.length ? `<p class="warn">Refused, item by item:</p>${listEl2(bad.map(i => i.text))}` : ''}<p class="hint">Importing replaces your edits to the scenes it names. Nothing is changed until you apply it.</p>`,
      `<button data-action="import-apply"${good.length ? '' : ' disabled'}>Apply ${good.length} change${good.length === 1 ? '' : 's'}</button> <button data-action="cancel-notice">Cancel</button>`);
  };

  // The form of a draft scene.
  function newSceneHtml(r, struct, takenIds, changes = '') {
    const problems = newProblems(r, struct, takenIds), sel = (field, list) => `<select data-new="${field}">${list.map(([v, text]) => `<option value="${esc(v)}"${r[field] === v ? ' selected' : ''}>${esc(text)}</option>`).join('')}</select>`;
    return `<h2>${esc(r.title || 'New scene')}</h2>
      <p class="hint">A scene written here is a data scene, added to the game's through addStorylet. Until saving comes (story 6) it is in the changes below; the preview plays it.</p>
      <button data-action="discard-scene">Discard this scene</button>
      <div id="problems">${newProblemsHtml(problems)}</div>
      <div class="field"><label for="n-id">Id</label><input id="n-id" type="text" data-new="sceneId" value="${esc(r.sceneId)}" placeholder="a-unique-id"></div>
      <div class="field"><label for="n-title">Title</label><input id="n-title" type="text" data-new="title" value="${esc(r.title)}"></div>
      <div class="field"><label for="n-text">Text</label><textarea id="n-text" data-new="text" rows="6"${r.textRaw ? ' disabled' : ''}>${esc(r.text)}</textarea>${r.textRaw ? '<p class="hint">This text has parts that depend on conditions. It is kept as it is and edited in code.</p>' : ''}</div>
      ${Object.keys(r.extra || {}).length ? `<p class="hint">This scene also has ${esc(Object.keys(r.extra).join(', '))}, which the form does not edit. They are kept.</p>` : ''}
      <div class="field"><label>Where it plays ${sel('where', [['port', 'at a port'], ['transit', 'in a burn']])}</label>
        <label>Shown as ${sel('via', [['', 'a scene'], ['station', 'a call from a station'], ['ship', 'a call from a ship'], ['message', 'a message'], ['crew', 'something from the crew']])}</label>
        <label><input type="checkbox" data-new="chained"${r.chained ? ' checked' : ''}> It only plays when another scene leads to it</label></div>
      ${rulesHtml(r, 'when', 'The scene appears when', struct)}
      ${r.choices.map((c, i) => `<h4>Choice ${i + 1} <button data-action="drop-choice" data-i="${i}">Remove this choice</button></h4>
        <div class="field"><label for="n-l${i}">Label</label><input id="n-l${i}" type="text" data-newc="${i}.label" value="${esc(c.label)}"${c.labelRaw ? ' disabled' : ''}></div>
        <div class="field"><label for="n-r${i}">Result</label><textarea id="n-r${i}" data-newc="${i}.result" rows="3"${c.resultRaw ? ' disabled' : ''}>${esc(c.result)}</textarea></div>
        ${rulesHtml(r, `c${i}.when`, 'It can be taken when', struct)}${rulesHtml(r, `c${i}.effects`, 'It does', struct)}${nextHtml(r, `c${i}.next`, struct)}`).join('')}
      <button data-action="add-choice">Add a choice</button>${changes}`;
  }
  const newProblemsHtml = problems => (problems.length ? `<p class="warn">Left out of the changes until fixed:</p>${listEl2(problems)}` : '<p class="ok">This scene is ready: addStorylet would take it.</p>');

  function mount(app, rows, overrides, opt, fileScenes = []) {
    const files = [...new Set(rows.map(r => r.file))].sort();
    const options = (list, any) => `<option value="">${any}</option>${list.map(([v, t]) => `<option value="${esc(v)}">${esc(t)}</option>`).join('')}`;
    app.innerHTML = `<h1>Scenes</h1>
      <div class="controls">
        <input type="search" id="q" placeholder="Search id, title, text" aria-label="Search by id, title or text">
        <select id="where" aria-label="Where it plays">${options([['port', 'port'], ['transit', 'transit']], 'Anywhere')}</select>
        <select id="file" aria-label="Source file">${options(files.map(f => [f, f]), 'Any source')}</select>
        <select id="kind" aria-label="Data or code">${options([['data', 'data (storylet)'], ['code', 'code']], 'Data or code')}</select>
        <select id="view" aria-label="Show">${options([['chain', 'the chains of a storyline']], 'the list of scenes')}</select>
        <select id="group" aria-label="Storyline" hidden></select>
        <button data-action="new-scene">New scene</button>
        <span id="count" class="hint" role="status"></span>
      </div>
      <div class="controls" id="tools">
        <button data-action="export">Export changes</button>
        <label class="filebtn">Import a file <input type="file" id="import-file" accept=".js,.json,.txt"></label>
        <button data-action="revert-all">Revert everything</button>
        <span class="hint">Your edits are kept in this browser. Nothing here writes to the repo or to the game's saves: Export downloads js/overrides.js, to replace the file and commit.</span>
      </div>
      <div id="notice" role="status"></div>
      <div class="split"><div id="list"></div><div id="detail"></div><div id="preview">${previewPaneHtml(opt)}</div></div>`;
    const state = { q: '', where: '', file: '', kind: '', id: '', view: '', group: '' };
    lists = { ...opt, planets: opt.places.map(p => p.name) };
    const values = SceneIndex.values = valuesFrom(overrides), struct = SceneIndex.struct = structFrom(overrides);
    const newRows = SceneIndex.newRows = fileScenes.map(def => draftFromDef(def, struct));
    const base = canon({ overrides, newScenes: fileScenes });
    let ready = false;
    const saveNow = () => { if (ready) { try { localStorage.setItem(STORE_KEY, snapshotOf(values, struct, newRows, base)); } catch (e) { /* storage blocked: the edits live for this visit */ } } };
    const notice = html => { app.querySelector('#notice').innerHTML = html; };
    {
      let kept = null;
      try { kept = readSnapshot(localStorage.getItem(STORE_KEY) || ''); } catch (e) { /* storage blocked */ }
      const fresh = snapshotOf(values, struct, newRows, base, 0);
      if (kept) {
        for (const k of Object.keys(values)) delete values[k];
        for (const k of Object.keys(struct)) delete struct[k];
        Object.assign(values, kept.values); Object.assign(struct, kept.struct);
        newRows.length = 0; newRows.push(...kept.newRows); newKey = Math.max(kept.newKey, ...kept.newRows.map(r => Number(r.id.slice(4)) + 1), 1);
        if (snapshotOf(values, struct, newRows, base, 0) !== fresh) {
          const changed = kept.base !== base;
          pendingNotice = noticeHtml('Your edits from earlier are back', `<p>These are the edits this browser kept from your last visit${changed ? ', and js/overrides.js has changed since' : ''}.</p>`,
            `<button data-action="discard-saved">Discard them and start from js/overrides.js</button> <button data-action="cancel-notice">Keep working</button>`);
        }
      }
    }
    const everyRow = () => [...newRows, ...rows];
    sceneIds = () => [...rows.filter(isStorylet).map(r => r.id), ...newRows.map(r => r.sceneId.trim()).filter(Boolean)];
    const takenFor = r => [...rows.map(x => x.id), ...newRows.filter(x => x !== r).map(x => x.sceneId.trim()).filter(Boolean)];
    newDefs = () => newRows.filter(r => !newProblems(r, struct, takenFor(r)).length).map(r => newSceneDef(r, struct));
    const datalists = Object.entries(lists).filter(([, v]) => Array.isArray(v) && typeof v[0] === 'string').map(([k, v]) => `<datalist id="dl-${esc(k)}">${v.map(x => `<option value="${esc(x)}">`).join('')}</datalist>`).join('');
    app.insertAdjacentHTML('beforeend', datalists + '<datalist id="dl-scenes"></datalist>');
    const refreshScenes = () => { app.querySelector('#dl-scenes').innerHTML = sceneIds().map(x => `<option value="${esc(x)}">`).join(''); };
    refreshScenes();
    const setup = SceneIndex.setup = { ...PREVIEW_DEFAULTS, rep: {} }, simSetup = SceneIndex.simSetup = { seeds: '30', burns: '10' };
    const models = () => everyRow().filter(r => isStorylet(r) || r.isNew).map(r => modelOf(r, struct));
    const renderList = () => {
      const all = everyRow(), shown = filterRows(all, state), edited = new Set([...Object.keys(overridesFrom(rows, values, struct))]);
      app.querySelector('#count').textContent = `${shown.length} of ${all.length} scenes`;
      const groupBox = app.querySelector('#group'), chain = state.view === 'chain';
      groupBox.hidden = !chain;
      if (!chain) { app.querySelector('#list').innerHTML = tableHtml(shown, state.id, edited); return; }
      const ms = models(), groups = groupsOf(ms);
      if (!groups.includes(state.group)) state.group = groups.find(g => chainOf(ms, g).nodes.some(n => n.outgoing.length)) || groups[0] || '';
      groupBox.innerHTML = groups.map(g => `<option value="${esc(g)}"${g === state.group ? ' selected' : ''}>${esc(g)}</option>`).join('');
      app.querySelector('#list').innerHTML = chainHtml(chainOf(ms, state.group), ms, state.group, state.id);
    };
    // The Play button and the line above it: a shipped data scene can be played, and a new one when the game would take it.
    const syncPlay = () => {
      const row = everyRow().find(r => r.id === state.id), ready = !!row && editable(row) && (!row.isNew || !newProblems(row, struct, takenFor(row)).length);
      app.querySelector('[data-action="play"]').disabled = !ready;
      app.querySelector('[data-action="simulate"]').disabled = !(ready && row && (isStorylet(row) || row.isNew));
      app.querySelector('#pv-scene').textContent = ready ? `Scene: ${row.title} (${row.isNew ? row.sceneId.trim() : row.id})` : row && row.isNew ? 'This new scene has problems the game would refuse. Fix them to play it.' : 'Choose a data scene to play it in the game\'s own dialog, from the state below. It starts a fresh test game that is never saved.';
    };
    const update = () => {
      renderList();
      const row = everyRow().find(r => r.id === state.id);
      app.querySelector('#detail').innerHTML = !row ? detailHtml(null) : row.isNew ? newSceneHtml(row, struct, takenFor(row), changesHtml(rows, values, struct)) : detailHtml(row, values, rows, struct);
      syncPlay();
      saveNow();
    };
    // The place a scene needs, from its own conditions, unless one is chosen: a planet it names, a system it is bound for, or Earth.
    const placeFor = row => {
      if (setup.place) return setup.place;
      const w = modelOf(row, struct).when || {}, planet = [].concat(w.planet || [])[0], at = [].concat(w.at || [])[0];
      return planet || (at && (opt.places.find(p => p.sid === at) || {}).name) || 'Earth';
    };
    // A hired scene needs the people it is about aboard: its own captain (or the first officer's captain), and the pair of main characters it belongs to.
    const hiredFor = row => {
      const [kind, id] = row.id.split(':'), key = kind === 'hired' ? id.replace(/^crew-/, '') : id, xo = kind === 'cast' && lists.captains.find(c => c.xo === key);  // a hired event 'crew-ines' is about ines
      const pair = lists.pairs.find(p => p.members.includes(key));
      return { as: 'hired', captain: kind === 'captain' ? key : xo ? xo.key : setup.captain, start: pair ? pair.key : setup.start, ...(row.post ? { post: row.post } : {}) };  // a work event is played at its own post
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
      else if (m.type === 'simulated') app.querySelector('#pv-sim').replaceChildren(simNode(m));
      else app.querySelector('#pv-report').replaceChildren(reportNode(m));
    };
    const here = () => everyRow().find(r => r.id === state.id);
    const refresh = () => {  // the changes and the problems, redrawn without disturbing what is being typed in
      const pre = app.querySelector('#changes');
      if (pre) pre.textContent = fileText(overridesFrom(rows, values, struct), newDefs());
      const box = app.querySelector('#problems'), r = here();
      if (box && r) box.innerHTML = r.isNew ? newProblemsHtml(newProblems(r, struct, takenFor(r))) : problemsHtml(r, struct);
      syncPlay();
      saveNow();
    };
    const warnFor = key => [...app.querySelectorAll('[data-rerr]')].find(e => e.dataset.rerr === key);
    app.addEventListener('input', e => {
      const t = e.target, d = t.dataset || {};
      if (d.sim) simSetup[d.sim] = t.value;
      else if (d.pv) setup[d.pv] = t.value;
      else if (d.pvRep) setup.rep[d.pvRep] = t.value;
      else if (d.path) {  // a field of the form: keep the focus, so only its flag and the changes are redrawn
        (values[state.id] = values[state.id] || dict())[d.path] = t.value;
        app.querySelector(`[data-warn="${d.path}"]`).textContent = flagOf(t.value);
        refresh();
      } else if (d.rpath) {  // a condition or effect's value
        const entry = touch(here(), d.rpath, struct)[d.rpath].find(x => x[0] === d.rkey);
        entry[1] = t.value;
        const w = warnFor(`${d.rpath}|${d.rkey}`);
        if (w) w.textContent = readRules([entry], specTable(d.rpath)).errors[d.rkey] || '';
        refresh();
      } else if (d.rate) {  // how often a color scene comes up
        const key = `rate.${d.rate}`, text = t.type === 'checkbox' ? String(t.checked) : t.value;
        (struct[state.id] = struct[state.id] || dict())[key] = text;
        const w = warnFor(key);
        if (w) w.textContent = rateError(here(), d.rate, text);
        refresh();
      } else if (d.rnext) {
        touch(here(), d.rnext, struct)[d.rnext] = t.value;
        const w = warnFor(d.rnext);
        if (w) w.textContent = nextError(t.value);
        refresh();
      } else if (d.new) {  // a field of a new scene
        const r = here();
        r[d.new] = t.type === 'checkbox' ? t.checked : t.value;
        if (d.new === 'sceneId') refreshScenes();
        if (d.new === 'sceneId' || d.new === 'title') renderList();
        refresh();
      } else if (d.newc) {
        const [i, field] = d.newc.split('.');
        here().choices[Number(i)][field] = t.value;
        refresh();
      } else if (d.add) {
        if (!t.value) return;
        touch(here(), d.add, struct)[d.add].push([t.value, kindOf(specTable(d.add)[t.value]).def]);
        update();
      } else if (t.id in state) { state[t.id] = t.value; update(); }
    });
    let importPlan = null;
    const clearAll = () => { for (const k of Object.keys(values)) delete values[k]; for (const k of Object.keys(struct)) delete struct[k]; newRows.length = 0; };
    app.addEventListener('change', async e => {
      const t = e.target;
      if (t.id !== 'import-file' || !t.files || !t.files[0]) return;
      const file = t.files[0], close = '<button data-action="cancel-notice">Close</button>';
      let text = '';
      try { text = await file.text(); } catch (err) { notice(noticeHtml('This file could not be read', `<p class="warn">${esc(err.message || err)}</p>`, close)); return; }
      t.value = '';
      const parsed = text.length > 2000000 ? { error: 'This file is larger than the editor reads (2 MB).' } : parseImport(text);
      if (parsed.error) { notice(noticeHtml('This file cannot be imported', `<p class="warn">${esc(parsed.error)}</p>`, close)); return; }
      importPlan = planImport(parsed, rows);
      notice(importNotice(importPlan));
    });
    app.addEventListener('click', e => {
      const b = e.target.closest('button[data-id]');
      if (b) { state.id = b.dataset.id; update(); return; }
      const drop = e.target.closest('button[data-drop]');
      if (drop) {
        const list = touch(here(), drop.dataset.drop, struct), i = list[drop.dataset.drop].findIndex(x => x[0] === drop.dataset.dkey);
        list[drop.dataset.drop].splice(i, 1);
        update();
        return;
      }
      const action = (e.target.closest('[data-action]') || { dataset: {} }).dataset.action, row = here();
      if (action === 'new-scene') {
        const r = newRow();
        newRows.unshift(r); state.id = r.id; update(); refreshScenes();
        const id = app.querySelector('#n-id'); if (id) id.focus();
      } else if (action === 'discard-scene' && row && row.isNew) {
        newRows.splice(newRows.indexOf(row), 1); delete struct[row.id]; state.id = ''; update(); refreshScenes();
      } else if (action === 'export') {
        const edited = Object.keys(overridesFrom(rows, values, struct)).length, left = newRows.filter(r => newProblems(r, struct, takenFor(r)).length).length + rows.reduce((n, r) => n + problemsOf(r, struct).length, 0);
        const link = document.createElement('a');
        link.href = URL.createObjectURL(new Blob([exportText(overridesFrom(rows, values, struct), newDefs())], { type: 'text/javascript' }));
        link.download = 'overrides.js';
        document.body.append(link); link.click(); link.remove();
        setTimeout(() => URL.revokeObjectURL(link.href), 1000);
        notice(noticeHtml('Exported js/overrides.js', `<p>It holds ${edited} changed scene${edited === 1 ? '' : 's'} and ${newDefs().length} new scene${newDefs().length === 1 ? '' : 's'}. Replace js/overrides.js with it and commit it like any change.${left ? ` ${left} with a problem ${left === 1 ? 'was' : 'were'} left out.` : ''}</p>`, '<button data-action="cancel-notice">Close</button>'));
      } else if (action === 'revert-scene' && row && !row.isNew) notice(revertSceneNotice(row));
      else if (action === 'revert-all') {
        const edited = Object.keys(overridesFrom(rows, values, struct));
        notice(edited.length || newRows.length ? revertAllNotice(edited, rows, newRows.length) : noticeHtml('Nothing to revert', '<p>No scene differs from the shipped version.</p>', '<button data-action="cancel-notice">Close</button>'));
      } else if (action === 'confirm-revert') {
        if (e.target.closest('[data-scope]').dataset.scope === 'scene' && row && !row.isNew) { delete values[row.id]; delete struct[row.id]; } else clearAll();
        notice(''); update(); refreshScenes();
      } else if (action === 'cancel-notice') notice('');
      else if (action === 'discard-saved') {
        clearAll();
        Object.assign(values, valuesFrom(overrides)); Object.assign(struct, structFrom(overrides));
        newRows.push(...fileScenes.map(def => draftFromDef(def, struct)));
        try { localStorage.removeItem(STORE_KEY); } catch (err) { /* storage blocked */ }
        notice(''); update(); refreshScenes();
      } else if (action === 'import-apply' && importPlan) {
        const acc = importPlan.accepted;
        for (const id of Object.keys(acc.overrides)) { delete values[id]; delete struct[id]; }
        Object.assign(values, valuesFrom(acc.overrides)); Object.assign(struct, structFrom(acc.overrides));
        for (const def of acc.scenes) {
          for (const old of newRows.filter(r => r.sceneId.trim() === def.id)) { newRows.splice(newRows.indexOf(old), 1); delete struct[old.id]; }
          newRows.unshift(draftFromDef(def, struct));
        }
        const n = importPlan.items.filter(i => i.ok).length;
        importPlan = null;
        notice(noticeHtml('Imported', `<p>${n} change${n === 1 ? '' : 's'} applied. They are in the changes below each scene and can be exported or reverted.</p>`, '<button data-action="cancel-notice">Close</button>'));
        update(); refreshScenes();
      } else if (action === 'add-choice' && row && row.isNew) { row.choices.push(newChoice()); update(); }
      else if (action === 'drop-choice' && row && row.isNew) { dropChoice(row, Number(e.target.closest('[data-i]').dataset.i), struct); update(); }
      else if (action === 'simulate' && row && (isStorylet(row) || row.isNew)) {
        app.querySelector('#pv-sim').replaceChildren(el('p', 'Running...', 'hint'));
        send({ cmd: 'simulate', id: row.isNew ? row.sceneId.trim() : row.id, overrides: overridesFrom(rows, values, struct), newScenes: newDefs(), seeds: simSetup.seeds, burns: simSetup.burns, setup: { ...setup, place: placeFor(row) } });
      } else if (action === 'play' && row && editable(row)) {
        app.querySelector('#pv-effects').replaceChildren(); app.querySelector('#pv-report').replaceChildren();
        send({ cmd: 'play', id: row.isNew ? row.sceneId.trim() : row.id, overrides: overridesFrom(rows, values, struct), newScenes: newDefs(), setup: { ...setup, place: placeFor(row), ...(row.registry ? hiredFor(row) : {}) } });
      }
    });
    update();
    ready = true;
    if (pendingNotice) { notice(pendingNotice); pendingNotice = ''; }
    SceneIndex.exportText = () => exportText(overridesFrom(rows, values, struct), newDefs());
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
      mount(app, SceneIndex.rows, got.full.overrides, got.full.options, got.full.newScenes);
    });
    for (const [mode, src] of Object.entries(frames)) {
      const f = document.createElement('iframe');
      f.id = 'frame-' + mode; f.src = src; f.hidden = true;
      document.body.append(f);
    }
  }

  const SceneIndex = window.SceneIndex = { SCRIPTS, esc, plain, filterRows, tableHtml, detailHtml, overridesFrom, valuesFrom, fileText, badPlaceholders, reportNode, effectsNode, simNode, structFrom, kindOf, readRules, parseImport, planImport, exportText, readSnapshot, FILE_HEAD, CONDITION_SPEC, EFFECT_SPEC, roundTrips, chainOf, modelOf, newSceneDef, chainHtml, newSceneHtml, draftFromDef, newProblems, rows: null, values: null, struct: null, setup: null };
  start();
})();
