'use strict';

// Sails the hired hand's captain for N runs with random answers and reports runs, days and pay: the tuning tool for the
// chapter's economy (HIRED_FUND, HIRED_WAGE, HIRED_SHARE, HIRED_TARGET in js/hired.js).
//   node tools/soak.js --seeds 1,2,3 --legs 40 [--captain hester] [--real-draw] [--post engineer] [--frames] [--engineer favor-drive] [--scenes] [--messages]
// --scenes adds a report of which scenes played over the seeds (#512): each scene of the editor's index that the narrow build keeps, with its plays and the seeds it
// played in; the ones that never played; and the titles with the largest share of all plays. A scene is matched to a play by its title, so scenes that share a title
// share a count. It reports and sets no threshold. It also counts the storylet plays by kind (landing, port, road, and the road scenes of the ship's night) and how many
// scenes each landing opened or queued. Each draw of a burn's events is made at the second of the burn it would fall on, so the ship's night is in the sample.
// The totals line also gives how often the hand was hurt, and hurt again while still hurt.
// --frames plays each burn's seconds (the drive's speed, the reactor's heat and the reaction mass, engineering.js) and the burn's contact, which the
// per-frame loop raises in play, and reports raids, scrams, hull lost and extra reaction mass; without it a burn is one jump, as before. It also plays 20 seconds of the
// live flight loop in each system on arrival (update(), as the frame does), with the autopilot docking her, so what that loop says is in the message report (#656).
// --engineer ORDER gives the Engineer post that order (a key of POWER_PRESETS) before every sail (#292); it needs --post engineer and --frames to show.
// --messages reports the ship messages (the flight log) and the port notes a chapter writes, the means across the seeds and the lines that come most often (the arrival
// is the game's own, arrive() in game.js; with --frames the live flight loop is played too, so the traffic's sensors, kills and hails are counted).
// With no captain named, the narrow build's captain (Hester, with Cato) sails every seed, as a gunner.
// Each chapter also reports who was lost or left, when (days since sign-on) and why, and how it ended if it ended early (#357):
// the hand's death (The Last Run) or the captain's loss (Without a Captain). The totals follow the last seed. Not part of `npm test`.

const { open, closeBrowser } = require('../tests/helpers');

// realDraw: the two main characters come from the pool as in the game; tests start from the pair they knew (tests/helpers.js).
async function soak({ seed = 1, legs = 40, scope = 'earth-hired', captainKey = null, realDraw = false, post = 'gunner', frames = false, engineer = null } = {}) {
  const { ev, errors, ctx } = await open({ scope, seed, debt: true });  // the chapter's economy includes the hiring hall's bond
  const r = await ev(([maxLegs, key, real, postKey, play, order]) => {
    if (real) window.drawCastPair = realDrawCastPair;
    const scenes = {}, bad = [], paid = [], losses = [], ending = { v: null };
    // Every ship message (the flight log, msg) and port note (UI.notes) the chapter writes, by its text with the numbers and the names taken out.
    const messages = { log: 0, note: 0, lines: {} };
    { const places = new RegExp(`\\b(${Object.values(SYSTEMS).flatMap(y => [y.name, ...y.planets.map(p => p.name)]).join('|')})\\b`, 'g');
      const tally = (kind, t) => { messages[kind]++; const k = `${kind}: ${String(t).replace(/[0-9][0-9,.]*/g, '#').replace(places, 'X').replace(/\([^)]*\)/g, '(g)').replace(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/g, 'M').replace(/\b[A-Z][a-z]+(?: [A-Z][a-z]+)+\b/g, 'N').slice(0, 80)}`; messages.lines[k] = (messages.lines[k] || 0) + 1; };
      const m0 = window.msg; window.msg = function (t) { tally('log', t); return m0.apply(this, arguments); };
      const np = UI.notes.push.bind(UI.notes); UI.notes.push = function (...x) { for (const t of x) tally('note', t); return np(...x); }; }
    const byId = {}, byTitle = {};  // the plays of a storylet by its id, and of every other scene by its title (the report of --scenes)
    { const real = window.storyletEvent; window.storyletEvent = s => { const e = real(s); e.soakId = s.id; return e; }; }
    const odd = t => /undefined|NaN|\[object|\{[a-z]+\}/.test(String(t));
    const hand = { hurt: 0, again: 0 }, landed = { on: false, opened: 0, mix: {} };  // the hand's hurts, and how many scenes each landing opened or queued
    { const rh = window.hurtHand; window.hurtHand = function (s) { hand.hurt++; if ((s && s.youHurt) || handHurt()) hand.again++; return rh.apply(this, arguments); };
      const oe = window.openEvent; window.openEvent = function (e) { if (landed.on) landed.opened++; return oe.apply(this, arguments); };
      const em = Mods.emit; Mods.emit = function (name) { if (name !== 'landed') return em.apply(this, arguments); const had = !!G.nextEvent; landed.on = true; landed.opened = 0; try { return em.apply(this, arguments); } finally { landed.on = false; const n = landed.opened + (G.nextEvent && !had ? 1 : 0); landed.mix[n] = (landed.mix[n] || 0) + 1; } }; }
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: postKey, captainKey: key });
    const st = G.state;
    const LIVE_SECONDS = 20, LIVE_STEP = 0.05;  // the live flight played in each system with --frames (#656): the frame step is the game's own cap
    const fr = { raids: 0, scrams: 0, hull: 0, fuel: 0, planned: 0, seen: 0, live: 0 };
    if (play) for (const name of ['startRaid', 'overload']) { const real = window[name]; window[name] = function (...a) { fr[name === 'startRaid' ? 'raids' : 'scrams']++; return real.apply(this, a); }; }
    const target = typeof HIRED_TARGET === 'undefined' ? 19000 : HIRED_TARGET;
    const answer = () => {
      for (let k = 0; k < 8 && G.dialog; k++) {
        const d = G.dialog;
        if (/^(The Last Run|Without a Captain)$/.test(d.event.title)) { ending.v = { day: G.state.day - hired().since, title: d.event.title, how: (hired().died || hired().captainLost || {}).how }; G.dialog = null; return; }  // the endings start a new game: the chapter is over
        scenes[d.event.title] = (scenes[d.event.title] || 0) + 1;
        if (d.event.soakId) byId[d.event.soakId] = (byId[d.event.soakId] || 0) + 1; else byTitle[d.event.title] = (byTitle[d.event.title] || 0) + 1;
        if (odd(d.event.title + d.event.text)) bad.push('text: ' + d.event.title);
        const ok = d.choices.map((c, i) => i).filter(i => !d.choices[i].can || d.choices[i].can());
        if (ok.length) { const res = chooseEvent(pick(ok)); if (odd(res)) bad.push('result: ' + String(res).slice(0, 80)); }
        finishEvent();
      }
      while (G.dialog) finishEvent();
    };
    answer();
    // Who is gone from the crew since the last look: dead (the memorial or the fallen) or walked off.
    let seen = [...st.crew], marksSeen = 0;
    const tally = () => {
      const day = st.day - hired().since;
      for (const id of seen.filter(id => !st.crew.includes(id))) {
        const c = person(id), name = fullName(c), m = (st.memorial || []).find(m => m.key === id || (c.cast && m.key === c.cast)), f = (st.fallen || []).find(f => f.name === name);
        losses.push({ day, who: name, what: m || f || (c.cast && castDead(c.cast)) ? 'died' : 'left', why: m ? m.cause : f ? 'killed repelling boarders' : (dep => dep ? `opinion, at ${dep.place}` : 'opinion')((st.departed || []).find(x => x.key === c.cast)) });
      }
      seen = [...st.crew];
      const marks = Object.values(st.cast || {}).reduce((t, c) => t + (c.marks || []).length, 0);
      if (marks > marksSeen) losses.push({ day, who: `${marks - marksSeen} named`, what: 'marked', why: 'a skill point lost' });
      marksSeen = marks;
    };
    let runs = 0, stuck = 0, reached = null, offerDay = null;
    const beatDays = [], xoDays = [], waits = [], burns = [], dueBurns = {}, introRun = {};  // introRun: the run in which each main character's first scene played  // waits: days from a captain scene becoming due to its playing; burns: burns sailed with it due, the playing one included  // the day each of the captain's scenes played, and when the used ship was offered
    while (runs < maxLegs && stuck < 5 && !reached && !ending.v) {
      try {
        UI.tab = 'bar'; UI.render();
        if (G.patrons && G.patrons.length) { openEvent(talkEvent(pick(G.patrons))); answer(); }
        if (order) Object.assign(power(), POWER_PRESETS[order].to);  // the order, before every sail
        const armor0 = st.armor;
        if (!sail()) { stuck++; st.day += 1; continue; }
        const to = hired().run.sid, runPlanet = hired().run.planet, creditsBefore = st.credits;
        answer();
        G.player.x = BURN_DIST + 40; G.player.y = 0;  // clear of local traffic, as the autopilot leaves her (autopilot.js)
        tryBurn(); enterTransit(); const drawAt = G.transit.times.slice(), draws = drawAt.length; G.transit.times = [];  // as many draws as the burn would make
        planOccasions();
        if (play) {  // the burn's own contact, planned and seen only if the drive is hot enough (engage.js), then answered at random
          G.transit.interceptPlanned = false; G.transit.event = null; planIntercept();
          if (G.transit.intercept) {
            fr.planned++; const sp = G.transit.intercept.spec; G.transit.intercept = null;
            if (!(sp.kind === 'pirate' && Math.random() > scanVisibility() / SCAN_MAX)) { fr.seen++; G.dialog = null; openEvent(contactEvent(sp)); answer(); }
          }
        }
        for (const o of G.transit.occasions) { openEvent(occasionEvent(o)); answer(); }
        const due = captainBeat(); if (due) dueBurns[due] = (dueBurns[due] || 0) + 1;  // a burn sailed with the scene due
        for (let h = 0; h < draws; h++) { G.transit.elapsed = drawAt[h] / burnSpeed(); startHappening(); answer(); }  // each draw at the second of the burn it would fall on, so the ship's night (shiplife.js) can come into it
        for (const c of castAboard()) if ((castRec(c.cast).arc || 0) >= 1 && !(c.cast in introRun)) introRun[c.cast] = runs + 1;
        while (beatDays.length < (hired().beats || 0)) {  // read on the day she left, before the burn's days pass
          const name = CAPTAIN_BEATS[beatDays.length];
          beatDays.push(st.day - hired().since); waits.push(st.day - hired().since - CAPTAIN_BEAT_DAYS[name]); burns.push(dueBurns[name]);
        }
        const acts = Object.values(ACTIVITIES).filter(a => a.can());
        if (acts.length) pick(acts).run();
        const rs = relationshipScene(); if (rs) { openEvent(rs); answer(); }
        let days = G.transit.days;
        if (play) {  // the burn's seconds: speed, heat and reaction mass tick as the frame loop would, until she arrives
          const t = G.transit, fuel0 = st.fuel, dt = 0.25;
          G.mode = 'transit'; G.dialog = null; t.event = null; t.elapsed = 0;
          for (let k = 0; t.left > 0 && k < 100000; k++) { engineeringTick(dt); t.left -= dt * burnSpeed(); t.elapsed += dt; }
          fr.fuel += fuel0 - st.fuel;
          days = transitDays(t);
        }
        fr.hull += Math.max(0, armor0 - st.armor);  // before the ship is made whole again for the next run
        arrive();  // the game's own arrival: the days, the crew's pay, the arrival line (game.js)
        if (play) {  // a few seconds of the live flight loop in the system: its traffic speaks, the autopilot docks her, a contact may open (#656)
          for (let t = 0; t < LIVE_SECONDS && G.mode === 'flight'; t += LIVE_STEP) { update(LIVE_STEP); fr.live += LIVE_STEP; if (G.dialog) answer(); }
        }
        if (G.mode !== 'landed') {  // the autopilot may have docked her already
          G.player = makeShip(st.shipId, 0, 0, 0); G.npcs = [];
          land(system().planets.find(p => p.name === runPlanet) || pick(system().planets));
        }
        answer();
        tally();
        runs++;
        paid.push(st.credits - creditsBefore);
        if (hired().deal && offerDay === null) offerDay = hired().deal.day - hired().since;
        const xoKey = CAPTAINS[hired().captainKey] && CAPTAINS[hired().captainKey].xo;
        while (xoKey && xoDays.length < (castRec(xoKey).arc || 0)) xoDays.push(st.day - hired().since);
        const d = hired().deal, price = d && dealOpen() ? d.price : target;  // she is bought when the deal's price is in hand, or the chapter's if it lapsed
        if (st.credits >= price) reached = { runs, day: st.day, days: st.day - hired().since, credits: st.credits, deal: d ? { price: d.price, offered: d.day, lapsed: !dealOpen() } : null };
        for (const n of UI.notes) if (odd(n)) bad.push('note: ' + n.slice(0, 80));
      } catch (e) { bad.push('threw: ' + String(e).slice(0, 120)); break; }
    }
    const avg = (a, n) => Math.round(a / Math.max(1, n));
    if (!ending.v) tally();
    return { messages, frames: fr, hand, landings: landed.mix, losses, ending: ending.v, runs, days: st.day, credits: st.credits, reached, stuck, scenes, byId, byTitle, bad, beatDays, xoDays, waits, burns, introRun, firstOfficers: Object.keys(CAST).filter(k => CAST[k].xo), offerDay,
      avgPayPerRun: avg(paid.reduce((a, b) => a + b, 0), paid.length), avgDaysPerRun: Math.round(10 * st.day / Math.max(1, runs)) / 10 };
  }, [legs, captainKey, realDraw, post, frames, engineer]);
  await ctx.close();
  return { seed, ...r, errors };
}

// The means across the seeds of the numbers the order is judged by (#292). A chapter that ended early (the hand's death or the captain's loss)
// is left out of the days and pay, which would read short; reached is how many got to the ship's price.
function framesReport(runs, label = '') {
  const whole = runs.filter(r => !r.ending), mean = (list, f) => (list.length ? list.reduce((t, r) => t + f(r), 0) / list.length : 0);
  const one = x => Math.round(x * 10) / 10, reached = whole.filter(r => r.reached);
  console.log(`${label}${runs.length} chapters, ${whole.length} whole, ${reached.length} reached the price: runs ${one(mean(whole, r => r.runs))}, days ${one(mean(whole, r => r.days))}, ` +
    `pay/run ${Math.round(mean(whole, r => r.avgPayPerRun))}, pay/day ${one(mean(whole, r => r.credits / r.days))}, days to the price ${one(mean(reached, r => r.reached.days))} ` +
    `| per chapter: raids ${one(mean(runs, r => r.frames.raids))}, scrams ${one(mean(runs, r => r.frames.scrams))}, hull lost ${one(mean(runs, r => r.frames.hull))}, ` +
    `extra reaction mass ${one(mean(runs, r => r.frames.fuel))}, contacts seen ${one(mean(runs, r => r.frames.seen))} of ${one(mean(runs, r => r.frames.planned))}`);
}

// The ship messages and port notes a chapter writes (the `messages` of each soak result): the means across the seeds, then the lines that come most often, as lines to print.
// `top` is how many lines are listed; a line is counted by its text with the numbers and the names taken out.
function messagesReport(runs, top = 12) {
  const n = runs.length, one = x => Math.round(x * 10) / 10, sum = f => runs.reduce((t, r) => t + f(r.messages), 0);
  const days = runs.reduce((t, r) => t + (r.days || 0), 0), lines = {};
  for (const r of runs) for (const [k, c] of Object.entries(r.messages.lines)) lines[k] = (lines[k] || 0) + c;
  const out = [`messages: ${one(sum(m => m.log) / n)} flight-log lines and ${one(sum(m => m.note) / n)} port notes a chapter over ${n} seeds${days ? `, ${one(100 * sum(m => m.log + m.note) / days)} every 100 days` : ''}`, `the most often, a chapter's mean:`];
  for (const [k, c] of Object.entries(lines).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, top)) out.push(`  ${one(c / n)}  ${k}`);
  return out;
}

// Who was lost, left or marked, per chapter, and the totals across the seeds.
function report(runs) {
  const total = {};
  for (const r of runs) {
    const items = r.losses.map(l => `${l.who} ${l.what} day ${l.day} (${l.why})`);
    if (r.ending) items.push(`ENDED day ${r.ending.day}: ${r.ending.title}${r.ending.how ? ' (' + r.ending.how + ')' : ''}`);
    console.log(`seed ${r.seed} lost or left: ${items.join('; ') || 'nobody'}`);
    const seen = new Set();
    for (const l of r.losses) { const k = `${l.what} ${/^(Ines|Tomas|Cato)/.test(l.who) ? l.who.split(' ')[0] : l.who.endsWith('named') ? 'a main character' : 'crew'}`; if (!seen.has(k)) { seen.add(k); total[k] = (total[k] || 0) + 1; } }
    if (r.ending) total[r.ending.title] = (total[r.ending.title] || 0) + 1;
  }
  const hurt = runs.reduce((n, r) => n + (r.hand ? r.hand.hurt : 0), 0), again = runs.reduce((n, r) => n + (r.hand ? r.hand.again : 0), 0), died = runs.filter(r => r.ending && r.ending.title === 'The Last Run').length;
  console.log(`${runs.length} chapters, chapters with: ${Object.entries(total).sort().map(([k, v]) => `${k} ${v}`).join(', ') || 'no losses'}${runs.some(r => r.hand) ? `; the hand was hurt ${hurt} times (${again} while still hurt) and died in ${died}` : ''}`);
}

// The scene index the editor shows (editor.html), as { id, title, off, storylet } for each scene with a title; off is a scene the narrow build leaves out, storylet one that is data outside the hired chapter's registry.
async function sceneRows() {
  const { ctx, url } = await open({ scope: 'full' });
  const page = await ctx.newPage();
  await page.goto(url.replace(/index\.html$/, 'editor.html'));
  await page.waitForFunction(() => window.SceneIndex && SceneIndex.rows, null, { timeout: 60000 });
  const rows = await page.evaluate(() => SceneIndex.rows.filter(r => r.title).map(r => ({ id: r.id, title: r.title, off: !!r.off, storylet: r.kind === 'data' && !r.registry, table: !!r.table })));
  await ctx.close();
  return rows;
}

// Which scenes played over the chapters, as lines to print (#512). `runs` are soak results (each holds `byId`, the plays of a storylet by its id, and `byTitle`, the plays of every other
// scene by its title) and `rows` the index (sceneRows). A storylet is found by its id; any other scene is matched by its title, so scenes that share a title share a count.
function scenesReport(runs, rows, legs, top = 10) {
  const played = new Map(), add = (key, label, n) => { const p = played.get(key) || { label, plays: 0, seeds: 0 }; p.plays += n; p.seeds++; played.set(key, p); };
  for (const r of runs) { for (const [id, n] of Object.entries(r.byId)) add(`id:${id}`, id, n); for (const [title, n] of Object.entries(r.byTitle)) add(`title:${title}`, title, n); }
  // A row the plays cannot be matched to is not judged: a table of words (scene:, lines:, beats:), a label of a family of scenes (social, family, bar) and a title with a {word} in it (the plays carry the filled one).
  const unmatched = r => !r.storylet && (r.table || /^(scene|lines|beats|social|family|bar):/.test(r.id) || /\{\w+\}/.test(r.title));
  const total = [...played.values()].reduce((t, p) => t + p.plays, 0), all = rows.filter(r => !r.off), kept = all.filter(r => !unmatched(r)), shared = new Map(), none = { plays: 0, seeds: 0 };
  const keyOf = r => (r.storylet ? `id:${r.id}` : `title:${r.title}`);
  for (const r of kept.filter(r => !r.storylet)) shared.set(r.title, (shared.get(r.title) || 0) + 1);
  const line = r => { const p = played.get(keyOf(r)) || none; return `  ${r.id}  ${r.title}${shared.get(r.title) > 1 && !r.storylet ? ' (title shared)' : ''}: ${p.plays} plays, ${p.seeds} of ${runs.length} seeds`; };
  const dead = kept.filter(r => !played.has(keyOf(r)));
  const out = [`scenes: ${total} plays over ${runs.length} seeds (${runs.map(r => r.seed).join(', ')}), up to ${legs} legs each; a storylet is found by its id, any other scene by its title`];
  out.push(`${kept.length} scenes in the narrow build (${rows.length - all.length} left out of it are not counted):`, ...kept.map(line));
  out.push(`not judged, since the plays cannot be matched to them (words tables, labels of scene families, titles with a {word}): ${all.length - kept.length}`);
  out.push(`never played in this sample: ${dead.length} of ${kept.length}`, ...dead.map(r => `  ${r.id}  ${r.title}`));
  const label = ([key, p]) => (key.startsWith('id:') ? `${(rows.find(r => r.id === p.label) || {}).title || p.label} (${p.label})` : p.label);
  out.push(`largest share of all plays:`, ...[...played].sort((a, b) => b[1].plays - a[1].plays || (a[0] < b[0] ? -1 : 1)).slice(0, top).map(e => `  ${label(e)}: ${e[1].plays} plays, ${Math.round(1000 * e[1].plays / Math.max(1, total)) / 10} percent, ${e[1].seeds} of ${runs.length} seeds`));
  const kinds = { landing: /^land-/, port: /^port-/, road: /^road-/ }, plays = re => [...played].filter(([k]) => k.startsWith('id:') && re.test(k.slice(3))).reduce((t, [, p]) => t + p.plays, 0);
  if (runs.some(r => r.landings)) {
    const mix = [0, 1, 2].map(n => runs.reduce((t, r) => t + Object.entries(r.landings || {}).filter(([k]) => (n === 2 ? Number(k) >= 2 : Number(k) === n)).reduce((s, [, c]) => s + c, 0), 0)), landings = mix[0] + mix[1] + mix[2];
    out.push(`storylet plays by kind: ${Object.entries(kinds).map(([k, re]) => `${k} ${plays(re)}`).join(', ')} (of which at night ${plays(/^road-night-/)})`,
      `landings: ${landings}, with no scene ${mix[0]}, one ${mix[1]}, two or more ${mix[2]}`);
  }
  const listed = new Set(rows.map(r => (r.storylet ? `id:${r.id}` : `title:${r.title}`))), unknown = [...played].filter(([key]) => !listed.has(key)).map(e => label(e));
  out.push(`played but not listed in the index: ${unknown.length}${unknown.length ? ` (${unknown.sort().slice(0, 8).join('; ')}${unknown.length > 8 ? '; ...' : ''})` : ''}`);
  return out;
}

module.exports = { soak, report, framesReport, messagesReport, sceneRows, scenesReport };

if (require.main === module) {
  const arg = n => { const i = process.argv.indexOf('--' + n); return i > 0 ? process.argv[i + 1] : null; };
  const seeds = (arg('seeds') || '1').split(',').map(Number), legs = Number(arg('legs') || 40), captainKey = arg('captain'), realDraw = process.argv.includes('--real-draw'), post = arg('post') || 'gunner', frames = process.argv.includes('--frames'), engineer = arg('engineer');
  (async () => {
    const all = [];
    for (const seed of seeds) {
      const r = await soak({ seed, legs, captainKey, realDraw, post, frames, engineer });
      all.push(r);
      console.log(`seed ${seed} runs ${r.runs} days ${r.days} credits ${r.credits} reached ${JSON.stringify(r.reached)} pay/run ${r.avgPayPerRun} days/run ${r.avgDaysPerRun} stuck ${r.stuck} trouble ${r.beatDays[0] ?? '-'} secret ${r.beatDays[1] ?? '-'} (due ${r.waits.join(',') || '-'} days, ${r.burns.join(',') || '-'} burns) offer ${r.offerDay ?? '-'} intros ${Object.entries(r.introRun).map(([k, v]) => `${k}:${v}`).join(',') || '-'} xo [${r.xoDays.join(',')}] (days since sign-on) bad ${r.bad.length} errors ${r.errors.length}`);
    }
    report(all);
    if (frames) framesReport(all, engineer ? `${post} with ${engineer}: ` : `${post}: `);
    if (process.argv.includes('--messages')) console.log(messagesReport(all).join('\n'));
    if (process.argv.includes('--scenes')) console.log(scenesReport(all, await sceneRows(), legs).join('\n'));
    await closeBrowser();
  })();
}
