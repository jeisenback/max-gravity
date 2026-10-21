'use strict';

// Plays a whole hired-hand chapter 1 in the real game, with the burns played in the game's own transit update and drawn, and records it: a video of the page,
// a screenshot of each new scene, landing and fight turn, and a transcript day by day. The chapter is the soak's (tools/soak.js chapter): this file gives it a
// player (policy, below), a recorder and the frames to draw in, as hooks. Not part of `npm test` (tests/playthrough.test.js plays a short one).
//   npm run playthrough -- [--seed 1] [--captain hester] [--speed 10] [--out playthroughs/1-hester] [--max-days 600] [--no-video]
// --speed is the wall seconds a burn takes on the video; --no-video writes the transcript and the shots only, and plays the burns at once.
// The run is seeded: the game's dice are the seed's, and what the page draws (stars, music) has dice of its own, so the time a frame or a screenshot takes
// changes nothing that is played. The same seed writes the same transcript.

const fs = require('node:fs');
const path = require('node:path');
const { open, closeBrowser } = require('../tests/helpers');
const { chapter } = require('./soak');

// The player: given the dialog and the indexes of its open choices (a shut one is never among them), the index to take. Runs in the page.
// - Ship fight: every gun at her weapons (at her drive once no weapons are left to hit), a torpedo at a veteran crew (grade above 0) while any are left, then Fire, each turn.
// - Deck fight: stand where most of your crew are, shoot (steady when they outnumber you there), give the crew order when one is offered, then Fight.
// - Scenes: the best score: no stated risk or cost first, paying work and jobs taken, a cost to standing or the captain's trust avoided, and a crewmate kept
//   rather than let go. Ties are the seed's.
//   At the yard's desk, buying in, the player does not walk away (memo.avoid, set by the port hook).
function policy(d, ok, memo) {
  const s = d.event.fight, label = i => d.choices[i].label, last = ok[ok.length - 1];
  if (s) {
    const f = s.state, turn = `${f.turn}:${f.log.length}`;
    if (memo.turn !== turn) { memo.turn = turn; memo.clicks = 0; }
    if (ok.length === 1 || ++memo.clicks > 8) return last;  // the close (Stand down), or an order that would not take: fight as it stands
    if (f.kind === 'deck') {
      const post = lockPost(), near = [f.hand, ...ADJ[f.hand].filter(i => f.sections[i])];
      const to = near.reduce((b, i) => (f.sections[i].mine > f.sections[b].mine ? i : b), f.hand), there = f.sections[to];
      const stand = to === f.hand ? fightSay('deck.stand', { at: deckTitle(s, to) }) : fightSay('deck.move', { at: deckTitle(s, to) });
      const act = there.theirs > there.mine ? fightSay('deck.steady', { what: deckWords(`ability.${post}.steady.label`, FIGHT_ABILITY[post].steady.label) })
        : fightSay('deck.shoot', { lo: DECK.SIDEARM[0], hi: DECK.SIDEARM[1] });
      if (label(0) !== stand) return 0;
      if (label(1) !== act) return 1;
      const order = ok.find(i => d.choices[i].order);
      if (order !== undefined && label(order) === fightSay('deck.order.none')) return order;
      return last;  // Fight
    }
    const part = f.foes.some(x => x.parts.weapons.hp > 0) ? 'weapons' : 'drive';  // her guns gone, her drive: then she is crippled
    const at = fightSay('aim.at', { part: fightSay(`part.${part}`) }), ready = gunsReady(f);
    for (let i = 0; i < ready; i++) if (label(i) !== fightSay('gun.label', { n: i + 1, aim: at })) return i;
    if (s.grade > 0 && f.me.launcher && f.me.torps > 0 && label(ready) !== fightSay('torp.label', { left: f.me.torps, aim: at })) return ready;
    return last;  // Fire
  }
  if (memo.avoid && ok.some(i => label(i) !== memo.avoid)) ok = ok.filter(i => label(i) !== memo.avoid);  // buying in: the walk away from the yard's desk is not taken
  const score = c => {
    const note = (/\[([^[\]]*)\]\s*$/.exec(c.label) || [])[1] || '';
    let v = 0;
    if (/standing|regard|marks it|trust/i.test(note) || /\bcost(s|ing)?\b.*\b(standing|trust)\b/i.test(c.label)) v -= 3;
    else if (/%|if it fails/.test(note)) v -= 2;
    if (c.cost || /\(\s*[\d,]+ cr\)/.test(c.label)) v -= 1;
    if (/^Let .+ go$/.test(c.label)) v -= 3;  // Not on the Same Ship (stakes.js): keep both
    if (/\b(jobs?|work|paying|pays|paid|earn|hire[sd]?|contract)\b/i.test(c.label.replace(/\[[^\]]*\]\s*$/, ''))) v += 2;
    return v;
  };
  const best = Math.max(...ok.map(i => score(d.choices[i])));
  return pick(ok.filter(i => score(d.choices[i]) === best));
}

// The hooks, put on the page as window.__pt before the chapter starts (soak.js chapter names what each is for). `o`: { video, speed, maxDays, sceneMs, resultMs }.
function setup([policySrc, o]) {
  const choose = (0, eval)(`(${policySrc})`), memo = {};
  // The page's own dice, for what it draws and plays while the chapter waits on a frame, a timer or a screenshot: the game's dice are untouched by them.
  let a = 0x2545f491;
  const viewRand = () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const yieldTo = async p => { const game = Math.random; Math.random = viewRand; try { return await p; } finally { Math.random = game; } };
  const nextFrame = () => yieldTo(new Promise(r => requestAnimationFrame(() => r())));
  const hold = ms => (o.video && ms ? yieldTo(new Promise(r => setTimeout(r, ms))) : null);
  // The frame loop only draws: the chapter steps the game itself, so nothing is played by the wall clock (game.js frame).
  window.frame = () => { try { render(); Touch.sync(); syncBridge(); drawViewscreen(performance.now()); } catch (e) { /* a frame drawn mid-step */ } requestAnimationFrame(frame); };
  const box = document.createElement('div');
  const plain = html => { box.innerHTML = String(html == null ? '' : html).replace(/<\/p>\s*<p[^>]*>/g, '\n\n').replace(/<br\s*\/?>/g, '\n'); return box.textContent.replace(/[ \t]+/g, ' ').trim(); };
  const slug = t => String(t).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'scene';
  const since = () => (hired() ? hired().since : P.since || 0);
  const day = () => G.state.day - since();
  const where = () => (G.mode === 'transit' && G.transit ? `in transit to ${SYSTEMS[G.transit.to].name}` : G.state.planet === SYSTEMS[G.state.systemId].name ? G.state.planet : `${G.state.planet}, ${SYSTEMS[G.state.systemId].name}`);
  const nameOf = id => { const p = person(id); return p ? `${p.first} ${p.last}` : id; };
  const snap = () => {
    const st = G.state, h = hired();
    return { credits: st.credits, fund: h ? h.fund : null, armor: st.armor, rep: { ...(st.rep || {}) }, standing: { ...((h && h.standing) || {}) }, hurt: handHurt(),
      op: Object.fromEntries([...st.crew, h && h.captain].filter(Boolean).map(id => [id, (person(id) || {}).opinion || 0])), injured: Object.keys(st.injured || {}), crew: [...st.crew], memorial: (st.memorial || []).map(memorialName) };
  };
  const diff = (x, y) => {
    const out = [], n = v => `${v > 0 ? '+' : ''}${fmt(v)}`;
    if (y.credits !== x.credits) out.push(`your credits ${n(y.credits - x.credits)} (now ${fmt(y.credits)})`);
    if (y.fund !== null && x.fund !== null && y.fund !== x.fund) out.push(`ship's fund ${n(y.fund - x.fund)} (now ${fmt(y.fund)})`);
    if (y.armor !== x.armor) out.push(`armor ${n(y.armor - x.armor)} (now ${fmt(y.armor)})`);
    for (const k of new Set([...Object.keys(x.rep), ...Object.keys(y.rep)])) if ((y.rep[k] || 0) !== (x.rep[k] || 0)) out.push(`standing with ${k} ${n((y.rep[k] || 0) - (x.rep[k] || 0))}`);
    for (const k of new Set([...Object.keys(x.standing), ...Object.keys(y.standing)])) if ((y.standing[k] || 0) !== (x.standing[k] || 0)) out.push(`${k}'s regard ${n((y.standing[k] || 0) - (x.standing[k] || 0))}`);
    for (const id of Object.keys(y.op)) if (id in x.op && y.op[id] !== x.op[id]) out.push(`${nameOf(id)}'s opinion of you ${n(y.op[id] - x.op[id])} (now ${y.op[id]})`);
    if (y.hurt && !x.hurt) out.push('you are hurt');
    for (const id of y.injured.filter(i => !x.injured.includes(i))) out.push(`${nameOf(id)} is injured`);
    for (const m of y.memorial.filter(i => !x.memorial.includes(i))) out.push(`${m} died`);
    for (const id of x.crew.filter(i => !y.crew.includes(i) && !y.memorial.includes(nameOf(i)))) out.push(`${nameOf(id)} is gone from the crew`);
    return out;
  };
  const P = window.__pt = { live: true, records: [], shots: 0, stopped: null, pay: 0, fights: new Map(), burnRec: null, before: null, last: null, since: 0 };
  const push = r => { P.records.push(r); return r; };
  const shot = name => (o.shots === false ? null : yieldTo(window.__ptShot(`${String(++P.shots).padStart(3, '0')}-${slug(name)}`)));
  const begin = () => {
    if (P.began || !hired()) return;
    P.began = true; P.since = hired().since;
    const cap = person(hired().captain);
    push({ k: 'start', day: day(), date: dateOf(G.state.day), place: where(), captain: cap ? `${cap.first} ${cap.last}` : '', ship: home().name, post: POSTS[hired().post].name,
      crew: G.state.crew.map(nameOf), credits: G.state.credits, fund: hired().fund, debt: hired().debt || 0 });
  };
  // the pay of the chapter: what the wage and the share put in the hand's savings at each arrival (game.js payCrew, hired.js settleRun)
  for (const name of ['payCrew', 'settleRun']) { const real = window[name]; window[name] = function () { const c0 = G.state.credits, out = real.apply(this, arguments); P.pay += Math.max(0, G.state.credits - c0); return out; }; }
  // how each fight ended (fightui.js): the ship fight's end, and the deck fight's
  { const se = window.shipFightEnd; window.shipFightEnd = function (s, end) { const r = P.fights.get(s); if (r) r.end = end; return se.apply(this, arguments); }; }
  { const dc = window.deckClose; window.deckClose = function (s, end) { const r = P.fights.get(s); if (r) r.end = end; return dc.apply(this, arguments); }; }
  // the landing, as she docks (the autopilot or the chapter lands her: game.js land), before the scenes it opens are answered
  { const real = window.land; window.land = function () { const out = real.apply(this, arguments), st = G.state; if (!hired()) return out;
    P.burnRec = null; P.landShot = true;
    push({ k: 'land', day: day(), date: dateOf(st.day), planet: st.planet, system: SYSTEMS[st.systemId].name, credits: st.credits, fund: hired().fund, armor: st.armor, notes: (UI.notes || []).map(plain) });
    return out; }; }
  const bars = s => {
    const f = s.state;
    if (f.kind === 'deck') return [`You stand in ${deckTitle(s, f.hand)}. Ours against theirs: ${f.sections.map((x, i) => (x ? `${deckTitle(s, i)} ${x.mine} to ${x.theirs}` : '')).filter(Boolean).join(', ')}.`];
    const side = (x, name) => `${name}: shields ${x.shields}/${x.maxShields}, armor ${x.armor}/${x.maxArmor}, ${['weapons', 'drive', 'lock'].map(k => `${k} ${x.parts[k].hp}/${x.parts[k].max}`).join(', ')}`;
    return [`${side(f.me, 'You')}, heat ${f.heat}/${FIGHT.HEAT_CAP}${f.me.launcher ? `, torpedoes ${f.me.torps}` : ''}`, ...f.foes.map((x, i) => side(x, i ? 'Her consort' : 'Her'))];
  };
  Object.assign(P, {
    done() { if (hired() && day() >= o.maxDays) P.limit = `stopped at the day limit (${o.maxDays} days)`; return !!(P.stopped || P.limit); },
    pick: (d, ok) => choose(d, ok, memo),
    stuck(d, why) {
      push({ k: 'stuck', day: day(), place: where(), title: d.event.title, text: plain(d.event.text), why, choices: d.choices.map(c => ({ label: plain(c.label), shut: !!(c.can && !c.can()), why: c.why ? plain(typeof c.why === 'function' ? c.why() : c.why) : '' })) });
      P.stopped = `the player could not answer "${d.event.title}" (${why})`;
      throw new Error(`playthrough stopped: ${P.stopped}`);
    },
    async scene(d, i, kept) {
      begin();
      const ev = d.event, s = ev.fight;
      P.before = snap();
      if (s) {  // a fight's panel: a turn of the log, once each time the log has grown
        let r = P.fights.get(s);
        if (!r) { r = push({ k: 'fight', kind: s.state.kind === 'deck' ? 'deck' : 'ship', day: day(), place: where(), title: ev.title, turns: [], seen: 0, end: null }); P.fights.set(s, r); if (P.burnRec) P.burnRec.events.push(`${r.kind} fight: ${ev.title}`); }
        if (s.state.log.length > r.seen || !r.turns.length) {
          r.turns.push({ n: s.state.turn, read: plain(ev.read || ''), lines: s.state.log.slice(r.seen).map(plain), bars: bars(s), order: plain(d.choices[i].label) });
          r.seen = s.state.log.length;
          await shot(`${r.kind}-fight-turn-${s.state.turn}`);
        }
        return o.video ? nextFrame() : null;
      }
      G.shifts = [];
      P.last = push({ k: 'scene', day: day(), place: where(), title: ev.title, text: plain([ev.read, ev.text].filter(Boolean).join('</p><p>')),
        choices: d.choices.map(c => ({ label: plain(c.label), shut: !!(c.can && !c.can()), why: c.can && !c.can() && c.why ? plain(typeof c.why === 'function' ? c.why() : c.why) : '' })),
        taken: i >= 0 ? plain(d.choices[i].label) : null, kept });
      if (P.burnRec) P.burnRec.events.push(ev.title);
      await shot(ev.title);
      await hold(o.sceneMs);
    },
    async result(d, c, res) {
      if (d.event.fight) return;
      const r = P.last;
      r.result = res && typeof res === 'object' ? `(on to: ${res.title})` : plain(res || '');
      r.changes = diff(P.before, snap());
      if (o.video && typeof res === 'string' && res && G.dialog) { UI.showEventResult(d.event.title, res, G.shifts || []); await hold(o.resultMs); }
      G.shifts = null;
    },
    async burn(t, planet) {
      begin();
      P.burnRec = push({ k: 'burn', day: day(), from: SYSTEMS[G.state.systemId].name, to: SYSTEMS[t.to].name, planet, days: t.days, events: [] });
      P.ticker = { t: null, n: 1, k: 0 };
    },
    async tick(kind, t) {
      if (!o.video) return;
      const k = P.ticker;
      if (kind === 'burn' && k.t !== t) { k.t = t; k.k = 0; k.n = Math.max(1, Math.round(t.left / burnSpeed() / 0.25 / (o.speed * 60))); }  // a burn in about o.speed seconds at 60 frames a second
      if (kind === 'flight' && k.t !== 'flight') { k.t = 'flight'; k.k = 0; k.n = 3; }
      if (!G.dialog && !UI.el.classList.contains('hidden') && G.mode === 'transit') UI.hide();
      if (++k.k % k.n === 0) await nextFrame();
    },
    async landed() {  // the landing was written down as she docked (land, above); its shot is taken once the dialogs she docked into are answered
      if (!P.landShot) return;
      P.landShot = false;
      if (G.dialog) return;
      await shot(`land-${G.state.planet}`);
      await hold(o.resultMs);
    },
    // The port: the day ashore when it is open, then the buy-in: the ship the yard offered while the deal is open, when it is affordable here. If the deal lapsed,
    // the cheapest ship for sale once the savings reach the chapter's price (HIRED_TARGET), as the soak reads the chapter's end.
    async port(answer) {
      const st = G.state, h = hired();
      if (ashoreOpen(st) && !G.dialog) { Mods.act('dayAshore'); await answer(); }
      const here = currentPlanet(), stock = Object.keys(SHIPS).filter(k => SHIPS[k].forSale).sort((x, y) => SHIPS[x].price - SHIPS[y].price);
      const id = dealOpen() ? (canBuyIn(USED_ID, here) ? USED_ID : null) : h.deal && st.credits >= HIRED_TARGET ? stock.find(k => canBuyIn(k, here)) : null;
      if (!id || G.dialog) return;
      push({ k: 'buy', day: day(), place: where(), ship: buyShip(id).name, price: buyInPrice(id), credits: st.credits });
      memo.avoid = sceneSay('scene:yard-office', 'away.label', { price: fmt(buyShip(id).price) });
      Mods.act('buyInAsk', id); await answer();
      memo.avoid = null;
      if (hired() && hired().confirm === id) { Mods.act('buyInGo', id); await answer(); }
    },
  });
}

// The transcript, from the records the hooks kept and the chapter's result.
function transcript(recs, r, meta) {
  const out = [], start = recs.find(x => x.k === 'start') || {};
  const days = Math.max(0, ...recs.map(x => x.day || 0));
  out.push(`# Max Gravity play-through: seed ${meta.seed}, Captain ${start.captain || meta.captain}`, '');
  out.push(`The hired hand's chapter 1, played by tools/playthrough.js (the narrow build, Earth). You sign on as ${start.post || 'gunner'} aboard the ${start.ship || 'ship'}` +
    `${start.date ? `, ${start.date}` : ''}. Crew: ${(start.crew || []).join(', ') || 'none'}. Your savings ${fmt(start.credits)} cr, the ship's fund ${fmt(start.fund)} cr${start.debt ? `, owing the hiring hall ${fmt(start.debt)} cr` : ''}.`, '');
  let at = null;
  const head = rec => { if (rec.day !== at) { at = rec.day; out.push(`## Day ${rec.day}`, ''); } };
  for (const x of recs) {
    if (x.k === 'start') continue;
    head(x);
    if (x.k === 'scene') {
      out.push(`### ${x.title}`, '', `*${x.place}*`, '');
      if (x.text) out.push(x.text, '');
      out.push(...x.choices.map(c => `- ${c.label}${c.shut ? ` (shut${c.why ? `: ${c.why}` : ''})` : ''}${c.label === x.taken ? ' **(taken)**' : ''}`), '');
      if (x.taken === null) out.push('(the chapter ends here)', '');
      if (x.result) out.push(`> ${x.result.replace(/\n+/g, '\n> ')}`, '');
      if (x.changes && x.changes.length) out.push(`Changed: ${x.changes.join('; ')}.`, '');
    } else if (x.k === 'fight') {
      out.push(`### Fight: ${x.title} (${x.kind === 'deck' ? 'deck' : 'ship'})`, '', `*${x.place}*`, '');
      for (const t of x.turns) {
        out.push(`- Turn ${t.n}.${t.read ? ` ${t.read}` : ''}`);
        for (const l of t.lines) out.push(`  - ${l}`);
        for (const b of t.bars) out.push(`  - ${b}`);
        out.push(`  - Order: ${t.order}`);
      }
      out.push('', `Ended: ${x.end || 'not settled on the panel'}.`, '');
    } else if (x.k === 'burn') {
      out.push(`### Burn: ${x.from} to ${x.to} (${x.planet}), ${x.days} days`, '', x.events.length ? `Events on the burn: ${x.events.join('; ')}.` : 'A quiet burn.', '');
    } else if (x.k === 'land') {
      out.push(`### Landed at ${x.planet}, ${x.system} (${x.date})`, '', `Your savings ${fmt(x.credits)} cr${x.fund !== null ? `, the ship's fund ${fmt(x.fund)} cr` : ''}, armor ${fmt(x.armor)}.`, '');
      if (x.notes.length) out.push(...x.notes.map(n => `- ${n}`), '');
    } else if (x.k === 'buy') {
      out.push(`### Buying in: the ${x.ship} for ${fmt(x.price)} cr`, '', `*${x.place}*, savings ${fmt(x.credits)} cr.`, '');
    } else if (x.k === 'stuck') {
      out.push(`### Stopped: ${x.title}`, '', `The player could not answer this dialog (${x.why}).`, '', x.text, '', ...x.choices.map(c => `- ${c.label}${c.shut ? ` (shut${c.why ? `: ${c.why}` : ''})` : ''}`), '');
    }
  }
  const fights = recs.filter(x => x.k === 'fight'), won = f => /^(crippled|broke|won|escaped)$/.test(f.end || ''), lost = f => f.end === 'lost' || (f.kind === 'deck' && f.end && f.end !== 'won');  // boarded: the deck fight that follows says
  const ending = r.ending ? `${r.ending.title}${r.ending.how ? ` (${r.ending.how})` : ''}, day ${r.ending.day}` : meta.stopped || `none: ${r.stuck >= 5 ? 'the captain found no run five times' : 'the leg limit'}`;
  out.push('## Summary', '',
    `- Days: ${days}`,
    `- Legs sailed: ${r.runs}`,
    `- Pay earned (wage and share, into your savings): ${fmt(meta.pay)} cr; savings at the end ${fmt(r.credits)} cr`,
    `- Ending: ${ending}`,
    `- Lost or left: ${r.losses.length ? r.losses.map(l => `${l.who} ${l.what} day ${l.day} (${l.why})`).join('; ') : 'nobody'}`,
    `- Fights: ${fights.length} (ship ${fights.filter(f => f.kind === 'ship').length}, deck ${fights.filter(f => f.kind === 'deck').length}); won ${fights.filter(won).length}, lost ${fights.filter(lost).length}, other ${fights.filter(f => !won(f) && !lost(f)).length}: ${fights.map(f => `${f.kind} ${f.end || 'unsettled'}`).join(', ') || 'none'}`,
    `- Scenes: ${recs.filter(x => x.k === 'scene').length}; landings: ${recs.filter(x => x.k === 'land').length}`,
    `- Page errors: ${meta.errors.length ? meta.errors.join('; ') : 'none'}`,
    ...(r.bad.length ? [`- Trouble: ${r.bad.join('; ')}`] : []), '');
  return { text: out.join('\n'), days, ending, fights };
}
const fmt = n => (typeof n === 'number' ? Math.round(n).toLocaleString('en-US') : String(n));

async function playthrough({ seed = 1, captain = 'hester', speed = 10, out = null, maxDays = 600, video = true, legs = 1000, shots = true } = {}) {
  const dir = path.resolve(out || path.join(__dirname, '..', 'playthroughs', `${seed}-${captain}`));
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(path.join(dir, 'shots'), { recursive: true });
  const t0 = Date.now(), videoDir = video ? path.join(dir, '.video') : null;
  const { page, ctx, ev, errors } = await open({ seed, debt: true, stall: 0, video: videoDir });
  await page.exposeFunction('__ptShot', async name => { await page.screenshot({ path: path.join(dir, 'shots', `${name}.png`) }); });  // nothing goes back: the picture as a value is a long trip to the page
  await ev(setup, [policy.toString(), { video, speed, maxDays, sceneMs: 1200, resultMs: 700, shots }]);
  let r, threw = null;
  try { r = await ev(chapter, [legs, captain, false, 'gunner', true, null, true, '__pt']); } catch (e) { threw = e; }
  const P = await page.evaluate(() => ({ records: __pt.records.map(x => { const { seen, ...rest } = x; return rest; }), pay: __pt.pay, stopped: __pt.stopped, limit: __pt.limit }));
  r = r || { runs: 0, credits: 0, losses: [], bad: [`threw: ${threw && threw.message}`], ending: null, stuck: 0 };
  const v = page.video();
  await ctx.close();
  if (v) { await v.saveAs(path.join(dir, 'run.webm')); await v.delete(); fs.rmSync(videoDir, { recursive: true, force: true }); }
  const tr = transcript(P.records, r, { seed, captain, pay: P.pay, stopped: P.stopped || P.limit, errors });
  fs.writeFileSync(path.join(dir, 'transcript.md'), tr.text);
  const secs = Math.round((Date.now() - t0) / 1000);
  return { dir, secs, days: tr.days, legs: r.runs, ending: tr.ending, errors, bad: r.bad, records: P.records, stopped: P.stopped, video: v ? fs.statSync(path.join(dir, 'run.webm')).size : 0 };
}

module.exports = { playthrough, policy };

if (require.main === module) {
  const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i > 0 ? process.argv[i + 1] : d; };
  (async () => {
    const r = await playthrough({ seed: Number(arg('seed', 1)), captain: arg('captain', 'hester'), speed: Number(arg('speed', 10)), out: arg('out', null), maxDays: Number(arg('max-days', 600)), video: !process.argv.includes('--no-video') });
    await closeBrowser();
    console.log(`playthrough: ${r.days} days, ${r.legs} legs, ending ${r.ending}, ${r.errors.length} page errors, ${r.secs} s${r.video ? `, video ${(r.video / 1048576).toFixed(1)} MB` : ''}: ${path.relative(process.cwd(), r.dir) || '.'}`);
    if (r.stopped || r.errors.length || r.bad.length) process.exitCode = 1;
  })();
}
