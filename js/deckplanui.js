'use strict';

// The deck fight on the deck plan, as a scene (docs/superpowers/specs/2026-11-16-boarding-deck-plan-design.md, "The page"; #1353), behind
// Settings.planFight until it is the only deck fight (#1355). deckStart (boarders.js) builds who stands and the party as for the strip, and
// planStartState puts them on the decks; deckOpen (fightui.js) opens planFightEvent. The page is the cutaway (the decks in section, the well
// and its hatches, every spot with its cover, every figure on its spot) with their move in red, our crew's in blue and the hand's choices in
// yellow, and beside it "This turn", the hand's act, the order, the captain's order and a suggestion, the counts and the last turn. Fight
// (planFightGo) resolves the turn through planTurn (deckplan.js); a casualty is today's deckLoss, the hand's hurt today's roll, and the
// ends today's settles (repelSettle). The fight is kept with the scene, so nothing of it is in the save. The words are the 'scene:fight'
// lines under 'plan.' (hiredscenes.js). Loaded after fightui.js and deckplan.js.

const planSay = (key, vars) => sceneSay('scene:fight', `plan.${key}`, vars);
const planPct = x => Math.round(100 * x);
const PLAN_UI = { DECK_PX: 58, FIG: 7, FIG_Y: 0.62, ROW: 10 };  // a deck's height on the cutaway, a figure's radius, the figures' line down a deck, and the step between the two rows of names

// The fight's opening on the decks: ours who stand (repelCrew's), the hand at their post's odds, the captain on our bridge when repelling.
function planStartState({ d, fight, boarders, grade, assault, party, kit }) {
  const h = hired(), post = lockPost(), cap = h && person(h.captain);
  const crew = fight.filter(id => !cap || id !== cap.id).slice(0, 5).map(person).filter(Boolean).map(c => {
    const sheet = crewSheet({ role: c.role, skill: c.skill, traits: c.traits, low: moodLow(c) });
    return { id: c.id, name: c.first, level: Math.min(5, c.skill || 0), post: sheet ? sheet.post : c.role, odds: sheet ? { steady: crewOrderOdds(sheet, 'steady'), cover: crewOrderOdds(sheet, 'cover') } : null };
  });
  const hand = { level: skillLevel(post), post, odds: { steady: abilityOdds(post, 'steady'), cover: abilityOdds(post, 'cover') } };
  const lay = assault ? boardLayout(d.foe.shipId) : LAYOUTS.freighter;
  return planFight({ lay, crew, hand, captain: !assault && cap ? { name: cap.first } : null, party, boarders, grade, assault, kitCover: Math.max(...[0, 1, 2].map(pos => kitCover(kit, pos))) });
}

// The captain's nerve, 0 to 1, from her entry (captains.js), steady without one.
const planNerve = () => { const d = captainEntry(); return d && d.captain ? (d.captain.nerve - 1) / 4 : 0.5; };
// A turn's start: their move drawn, the captain's order, and the hand's plan back to standing and shooting at the best target.
function planBegin(s) {
  const st = s.state;
  s.theirs = planTheirMove(st, Math.random);
  s.intent = planCaptain(st, planNerve());
  s.suggested = null;
  const best = (planChoices(st).acts[0].targets || []).sort((a, b) => b.odds - a.odds)[0];
  s.pick = { move: null, act: best ? { kind: 'shoot', at: best.at } : { kind: 'holdfire' }, order: null };
}
const planShown = s => ({ theirs: s.theirs, ours: planCrewMoves(s.state, s.intent, s.pick.order) });
const planName = (s, id) => { const f = s.state.figures.find(x => x.id === id); return !f ? '' : f.hand ? planSay('you') : f.name; };  // one of ours: the hand, or a crewmate
const planWhere = (s, id) => (deckSpot(s.state.lay, id) || {}).name || id;
const planHatch = (s, hid) => { const d = Number(hid.slice(1)), lay = s.state.lay; return planSay('hatch', { up: lay.decks[d].name.toLowerCase(), down: lay.decks[d + 1].name.toLowerCase() }); };

// The scene for this turn, drawn from the fight as it stands. Every choice redraws it in place.
function planFightEvent(s) {
  if (!s.theirs) planBegin(s);
  return { title: planSay(s.assault ? 'title.assault' : 'title'), personal: true, via: 'crew', fight: s, board: String(planPageHtml(s)), text: '', choices: [] };
}
const planRedraw = s => UI.redraw(planFightEvent(s));
const planShowing = () => { const s = G.dialog && G.dialog.event.fight; return s && s.state && s.state.kind === 'plan' ? s : null; };

// ---------- the page ----------

function planPageHtml(s) {
  const st = s.state, n = st.lay.decks.length, c = planChoices(st, s.pick.move), hand = st.figures.find(f => f.hand);
  const on = b => (b ? raw('class="on" aria-pressed="true"') : raw('aria-pressed="false"'));
  const spot = id => { const p = deckSpot(st.lay, id); return `left:${(100 * p.x).toFixed(1)}%;top:${(100 * (p.deck + PLAN_UI.FIG_Y) / n).toFixed(1)}%`; };  // on the figures' line (planDraw)
  const moves = [hand.spot, ...c.moves].map(id => h`<button class="plan-spot ${id === (s.pick.move || hand.spot) ? 'on' : ''}" style="${spot(id)}" data-action="planMove" data-arg="${id}" aria-label="${planSay(id === hand.spot ? 'stand' : 'move', { at: planWhere(s, id) })}"></button>`);
  return h`<div class="plan-fight">
    <div class="plan-cut" style="height:${n * PLAN_UI.DECK_PX}px"><canvas class="plan-cut" role="img" aria-label="${planSay('cutaway')}"></canvas>${moves}</div>
    <div class="plan-side">
      <div class="plan-now"><div class="group">${planSay('now')}</div>${planNowHtml(s)}</div>
      ${planActsHtml(s, c, on)}${planOrdersHtml(s, c, on)}${planCaptainHtml(s, on)}
      <p class="plan-count">${planCountText(s)}</p>
      ${planLastHtml(s)}
      <button data-action="planFightGo" class="primary">${planSay('fight')}</button>
    </div>
  </div>`;
}

// "This turn": their move, our crew's and the hand's, in words, and how to stop a charge that is coming.
function planNowHtml(s) {
  const st = s.state, t = s.theirs, ours = planShown(s).ours, p = s.pick, hand = st.figures.find(f => f.hand);
  const theirs = [
    ...(t.moves.length ? [planSay(t.moves.some(m => m.rush) ? 'their.rush' : 'their.move', { n: t.moves.length })] : []),
    ...(t.shots.length ? [planSay('their.shoot', { n: t.shots.length })] : []),
    ...(t.cut ? [planSay('their.cut', { hatch: planHatch(s, t.cut) })] : []), ...(t.seal ? [planSay('their.seal', { hatch: planHatch(s, t.seal) })] : []),
    ...(st.wave && st.turn + 1 === DECK.WAVE_TURN ? [planSay('their.wave', { n: st.wave })] : []),
  ];
  const charge = [t.charge ? planSay('their.charge', { at: planWhere(s, t.charge.on), from: planWhere(s, t.charge.from) }) : '',
    t.storm ? planSay('their.storm', { n: t.storm.ids.length, at: planWhere(s, t.storm.on) }) : ''].filter(Boolean).join(' ');  // the charge and the storm: what is coming, and how to stop it
  const crew = ours.moves.length ? planSay('ours.move', { n: ours.moves.length, order: planSay(`order.${s.intent}`) }) : planSay('ours.hold', { order: planSay(`order.${s.intent}`) });
  const act = p.act.kind === 'shoot' ? planSay('you.shoot', { at: planWhere(s, p.act.at), pct: planPct(planOdds(st, hand, p.move || hand.spot, p.act.at, !!p.move)) })
    : p.act.kind === 'steady' || p.act.kind === 'cover' ? planSay('you.ability', { what: planAbility(p.act.kind) }) : planSay(`you.${p.act.kind}`);
  const you = `${p.move ? planSay('you.move', { at: planWhere(s, p.move) }) : planSay('you.stand', { at: planWhere(s, hand.spot) })} ${act}${p.order ? ` ${planOrderText(s, p.order)}` : ''}`;
  return h`<p class="plan-theirs">${theirs.length ? theirs.join(' ') : planSay('their.hold')}${t.feint ? ` ${planSay('feint')}` : ''}</p>
    ${charge ? h`<p class="plan-charge warn">${charge}</p>` : ''}
    <p class="plan-ours">${crew}</p><p class="plan-you">${you}</p>`;
}
// An order in words: a steady or cover order is the crewmate's own ability for their post (handtohand.js CREW_ABILITY, the strip's words).
const planOrderText = (s, o) => {
  const who = planName(s, o.id), f = s.state.figures.find(x => x.id === o.id);
  if (o.kind === 'steady' || o.kind === 'cover') return planSay('do.ability', { who, does: deckWords(`crew.${f.post}.${o.kind}.label`, CREW_ABILITY[f.post][o.kind].label) });
  return planSay(`do.${o.kind}`, { who, ...(o.hatch ? { hatch: planHatch(s, o.hatch) } : {}), ...(o.to ? { at: planWhere(s, o.to) } : {}) });
};
const planAbility = k => deckWords(`ability.${lockPost()}.${k}.label`, FIGHT_ABILITY[lockPost()][k].label);  // the hand's post's ability

// The hand's act: a shot at each spot of theirs in reach with its odds, the post's two abilities, pull back (when the hand stays), hold fire.
function planActsHtml(s, c, on) {
  const p = s.pick, ability = planAbility;
  const buttons = c.acts.flatMap(a => (a.kind === 'shoot'
    ? a.targets.map(t => h`<button data-action="planAct" data-arg="shoot:${t.at}" ${on(p.act.kind === 'shoot' && p.act.at === t.at)}>${planSay('act.shoot', { at: planWhere(s, t.at), pct: planPct(t.odds) })}</button>`)
    : [h`<button data-action="planAct" data-arg="${a.kind}" ${on(p.act.kind === a.kind)}>${a.kind === 'steady' || a.kind === 'cover' ? planSay(`act.${a.kind}`, { what: ability(a.kind), pct: planPct(a.odds) }) : planSay(`act.${a.kind}`)}</button>`]));
  return h`<div class="choice-row" role="group" aria-label="${planSay('act')}"><span class="row-label">${planSay('act')}</span><span class="row-picks">${buttons}</span></div>`;
}

// The order: one a turn to a named crewmate. A hatch order names the hatch: the one over the highest of theirs to seal, any sealed one to open.
function planOrdersHtml(s, c, on) {
  const st = s.state, p = s.pick, links = spotLinks(st.lay), top = Math.min(...planUp(st, 'them').map(f => deckSpot(st.lay, f.spot).deck));
  const arg = o => [o.id, o.kind, o.hatch || o.to || ''].join('|'),  // a crewmate's id has a colon in it ('c:ines')
    same = o => p.order && arg(p.order) === arg(o);
  const list = c.orders.flatMap(o => {
    if (o.kind === 'seal') return Number.isFinite(top) && top > 0 && !st.sealed[`h${top - 1}`] ? [{ ...o, hatch: `h${top - 1}` }] : [];
    if (o.kind === 'open') return Object.keys(st.sealed).map(hatch => ({ ...o, hatch }));
    if (o.kind === 'move') { const f = st.figures.find(x => x.id === o.id); return links[f.spot].filter(to => !st.sealed[spotHatch(st.lay, f.spot, to)] && planHeld(st, to) !== 'them' && planAt(st, to, 'us').length < PLAN.CAP).map(to => ({ ...o, to })); }  // a full spot of ours is no step
    return [o];
  });
  if (!list.length) return '';
  const buttons = [h`<button data-action="planOrder" data-arg="none" ${on(!p.order)}>${planSay('order.none')}</button>`,
    ...list.map(o => h`<button data-action="planOrder" data-arg="${arg(o)}" ${on(same(o))}>${planOrderText(s, o)}${o.odds < 1 ? ` ${planSay('odds', { pct: planPct(o.odds) })}` : ''}</button>`)];
  return h`<div class="choice-row" role="group" aria-label="${planSay('orders')}"><span class="row-label">${planSay('orders')}</span><span class="row-picks">${buttons}</span></div>`;
}

// The captain's standing order, and a suggestion of another, once a turn, with the odds she takes it.
function planCaptainHtml(s, on) {
  const cap = raidCap(), name = radarCapName(), level = skillLevel(lockPost()), opinion = cap ? Math.max(-1, Math.min(1, cap.opinion / OPINION.TRUSTED)) : 0;
  const said = s.suggested ? h`<p class="hint">${s.suggested}</p>` : '';
  const others = ['hold', 'push', 'fall'].filter(k => k !== s.intent);
  const buttons = s.suggested ? '' : others.map(k => h`<button data-action="planSuggest" data-arg="${k}" ${on(false)}>${planSay('suggest', { order: planSay(`order.${k}`), pct: planPct(planSuggestOdds(s.state, level, opinion, k, planNerve())) })}</button>`);
  return h`<div class="choice-row" role="group" aria-label="${planSay('captain')}"><span class="row-label">${planSay('captain.order', { name, order: planSay(`order.${s.intent}`) })}</span><span class="row-picks">${buttons}</span></div>${said}`;
}

// Each side's count, the wave still to land, and the line they break at.
function planCountText(s) {
  const st = s.state, rule = st.assault ? DECK.ASSAULT : DECK;
  return planSay('count', { ours: planUp(st, 'us').length, theirs: planUp(st, 'them').length, wave: st.wave, at: Math.floor(st.began * rule.BREAK), turn: st.turn + 1, max: st.party === 'navy' && !st.assault ? PLAN.NAVY_TURNS : PLAN.TURNS });
}
// The last turn's lines, and the whole log folded under them.
const planLastHtml = s => { const log = s.state.log; return log.length ? h`<p class="plan-last">${log[log.length - 1]}</p>${log.length > 1 ? h`<details class="plan-log"><summary>${planSay('log')}</summary><ol>${log.map(l => h`<li>${l}</li>`)}</ol></details>` : ''}` : ''; };

// ---------- the hand's choices ----------

function planSetMove(s, id) {
  const hand = s.state.figures.find(f => f.hand);
  s.pick.move = id === hand.spot ? null : id;
  if (s.pick.move && s.pick.act.kind === 'pullback') s.pick.act = { kind: 'holdfire' };  // a pull back only where the hand stays
  if (s.pick.act.kind === 'shoot') {  // the shot is from where the hand will stand: kept if still in line from there, else the best from there, else none
    const targets = planChoices(s.state, s.pick.move).acts[0].targets.sort((a, b) => b.odds - a.odds);
    if (!targets.some(t => t.at === s.pick.act.at)) s.pick.act = targets[0] ? { kind: 'shoot', at: targets[0].at } : { kind: 'holdfire' };
  }
  planRedraw(s);
}
function planSetAct(s, arg) {
  const [kind, at] = String(arg).split(':');
  s.pick.act = kind === 'shoot' ? { kind, at } : { kind };
  planRedraw(s);
}
function planSetOrder(s, arg) {
  if (arg === 'none') s.pick.order = null;
  else { const [id, kind, x] = String(arg).split('|'); s.pick.order = { id, kind, ...(kind === 'seal' || kind === 'open' ? { hatch: x } : kind === 'move' ? { to: x } : {}) }; }
  planRedraw(s);
}
// A suggestion to the captain: taken at its odds, for this turn; either way the hand has made it.
function planSuggest(s, intent) {
  if (s.suggested) return;
  const cap = raidCap(), opinion = cap ? Math.max(-1, Math.min(1, cap.opinion / OPINION.TRUSTED)) : 0;
  const took = Math.random() < planSuggestOdds(s.state, skillLevel(lockPost()), opinion, intent, planNerve());
  if (took) s.intent = intent;
  s.suggested = planSay(took ? 'suggest.yes' : 'suggest.no', { order: planSay(`order.${intent}`) });
}

// ---------- the turn ----------

// Fight: the turn resolved with what was shown, its lines in the log, the casualties and the hand's hurt as on the strip; at an end, the close (planClose).
// Returns whether the scene goes on: false when the hand is dead (the ending is queued, boarders.js) or the fight is over.
function planResolve(s) {
  const st = s.state, pick = s.pick, r = planTurn(st, pick, planShown(s), Math.random);
  s.state = r.state;
  s.marks = r.events.filter(e => ['wound', 'down', 'charge', 'cut', 'sealed', 'pullback'].includes(e.kind));  // what happened, kept on the ship for the next turn
  const said = [], after = [];
  for (const e of r.events) {
    if (e.kind === 'wound' || e.kind === 'down') said.push(planSay(`log.${e.kind}.${e.id === 'hand' ? 'you' : e.side}`, { who: planName(s, e.id), at: planWhere(s, e.spot) }));
    if (e.kind === 'charge') said.push(planSay(e.stopped ? 'log.chargeStopped' : 'log.charge', { at: planWhere(s, e.on) }));
    if (e.kind === 'storm') said.push(planSay(e.stopped ? 'log.stormStopped' : e.took ? 'log.stormTook' : 'log.storm', { at: planWhere(s, e.on) }));
    if (e.kind === 'cut') said.push(planSay(e.side === 'us' ? 'log.cutOurs' : 'log.cut', { hatch: planHatch(s, e.hatch) }));
    if (e.kind === 'sealed') said.push(planSay('log.sealedHers', { hatch: planHatch(s, e.hatch) }));
    if (e.kind === 'wave') said.push(planSay('log.wave', { n: e.n }));
    if (e.kind === 'pullback') said.push(planSay('log.pullback', { at: planWhere(s, e.to) }));
    if (e.kind === 'ability') said.push(planSay(e.worked ? 'log.worked' : 'log.missed', { who: planName(s, e.id) }));
  }
  // a head of ours downed is a casualty at the strip's odds (deckLoss, the one downed); the captain is downed and never killed in the fight
  for (const e of r.events.filter(x => x.kind === 'down' && x.side === 'us' && !x.captain && x.id !== 'hand')) { const line = deckLoss(s, e.id); if (line) after.push(line); }
  if (r.events.some(e => e.kind === 'down' && e.id === 'hand')) after.push(repelCasualty(s, 'you'));  // the hand downed is today's hurt, which a friend may take (once a fight); the crew fight on
  s.state.log.push(`${planSay('log.turn', { n: s.state.turn, what: said.length ? said.join(' ') : planSay('log.none') })}${after.length ? ` ${after.join(' ')}` : ''}`);
  s.theirs = null;
  if (s.handDied) return false;
  if (r.end) { planClose(s, r.end); return false; }
  return true;
}
const planGo = s => (planResolve(s) ? planRedraw(s) : finishEvent());

// The end: how it was won or that they withdrew at the cap, then the settle (boarders.js), on the scene; Stand down goes on to what the settle queued.
function planClose(s, end) {
  const st = s.state, left = planUp(st, 'them').length, capped = planWithdrew(st), rule = st.assault ? DECK.ASSAULT : DECK;
  const how = end !== 'won' || capped ? null : left === 0 ? 'last' : left <= st.began * rule.BREAK ? 'broke' : null;
  s.won = end === 'won'; s.searched = end === 'searched';
  const line = capped ? fightSay(`deck.withdraw.${s.assault ? 'assault' : 'repel'}`) : how ? repelWords(s, `end.${how}`, FIGHT_END[s.assault ? 'assault' : 'repel'][how]) : '';
  const said = `${line ? `${line} ` : ''}${repelSettle(s)}`, next = G.nextEvent;
  G.nextEvent = { title: planSay(s.assault ? 'title.assault' : 'title'), personal: true, via: 'crew', fight: s, text: `${st.log.slice(-2).join('</p><p>')}</p><p>${said}`,
    choices: [{ label: fightSay('down.label'), keep: true, run: () => { G.nextEvent = next; return null; } }] };
}

// ---------- the cutaway ----------

const PLAN_INK = { bg: '#050a11', deck: '#23405f', room: '#16283c', label: '#56687a', cover: '#7f9bb8', us: '#4aa3ff', them: '#ff6a4a', you: '#ffcf7f', sealed: '#ff6a4a', mark: '#cfe3ff' };
function planDraw(c, s) {
  const st = s.state, lay = st.lay, n = lay.decks.length, dpr = window.devicePixelRatio || 1, w = Math.max(300, c.clientWidth || 600), dh = PLAN_UI.DECK_PX, hgt = n * dh;
  if (c.width !== Math.round(w * dpr) || c.height !== Math.round(hgt * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(hgt * dpr); }
  const g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const X = x => 12 + x * (w - 24), Y = d => d * dh, at = id => { const p = deckSpot(lay, id); return [X(p.x), Y(p.deck) + dh * PLAN_UI.FIG_Y]; };
  const font = px => `${px}px "IBM Plex Mono", monospace`, said = [];
  const text = (str, x, y, color, px = 10) => { said.push(str); g.fillStyle = color; g.font = font(px); g.fillText(str, x, y); };
  g.fillStyle = PLAN_INK.bg; g.fillRect(0, 0, w, hgt);
  // the decks, their rooms and the well with its hatches
  lay.decks.forEach((d, i) => {
    g.strokeStyle = PLAN_INK.deck; g.strokeRect(X(0), Y(i) + 2, X(1) - X(0), dh - 4);
    for (const r of d.rooms) { g.fillStyle = PLAN_INK.room; g.fillRect(X(r.x0), Y(i) + 3, X(r.x1) - X(r.x0), dh - 6); text(r.name.toUpperCase(), X(r.x0) + 4, Y(i) + 13, PLAN_INK.label); }
    if (i < n - 1) { const hid = `h${i}`, x = X(lay.well.x); g.strokeStyle = st.sealed[hid] ? PLAN_INK.sealed : PLAN_INK.deck; g.lineWidth = st.sealed[hid] ? 3 : 1; g.beginPath(); g.moveTo(x - 10, Y(i + 1)); g.lineTo(x + 10, Y(i + 1)); g.stroke(); g.lineWidth = 1;
      if (s.theirs && s.theirs.cut === hid) text(planSay('mark.cutting'), x + 14, Y(i + 1) + 4, PLAN_INK.them); }
  });
  // every spot's cover, as bars under it
  for (const p of deckSpots(lay)) { const [x, y] = at(p.id), cover = planCover(st, p.id); g.fillStyle = PLAN_INK.cover; for (let k = 0; k < cover; k++) g.fillRect(x - 9 + k * 7, y + 12, 5, 3); }
  // their move (red), our crew's (blue) and the hand's (yellow): arrows for moves, lines for shots with the odds
  const arrow = (a, b, color, dash) => { const [x1, y1] = at(a), [x2, y2] = at(b); g.strokeStyle = color; g.setLineDash(dash ? [4, 3] : []); g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); g.setLineDash([]); };
  const shown = planShown(s), fig = id => st.figures.find(f => f.id === id), hand = fig('hand');
  if (s.theirs) {
    for (const m of s.theirs.moves) arrow(fig(m.id).spot, m.to, PLAN_INK.them, true);
    for (const t of s.theirs.shots) { arrow(fig(t.id).spot, t.at, PLAN_INK.them, false); }
    if (s.theirs.storm) { const [x, y] = at(s.theirs.storm.on); g.strokeStyle = PLAN_INK.them; g.setLineDash([2, 2]); g.strokeRect(x - 22, y - 22, 44, 40); g.setLineDash([]); text(planSay('mark.storm'), x - 22, y + 30, PLAN_INK.them); }
    if (s.theirs.charge) { const [x, y] = at(s.theirs.charge.on), [sx, sy] = at(s.theirs.charge.from); g.strokeStyle = PLAN_INK.them; g.strokeRect(x - 20, y - 20, 40, 36); g.beginPath(); g.arc(sx, sy, 12, 0, Math.PI * 2); g.stroke();
      text(planSay('mark.charge'), x - 20, y - 23, PLAN_INK.them); text(planSay('mark.setter'), sx - 18, sy - 15, PLAN_INK.them); }
  }
  for (const m of shown.ours.moves) arrow(fig(m.id).spot, m.to, PLAN_INK.us, true);
  if (s.pick.move) arrow(hand.spot, s.pick.move, PLAN_INK.you, true);
  if (s.pick.act.kind === 'shoot') arrow(s.pick.move || hand.spot, s.pick.act.at, PLAN_INK.you, false);
  if (st.wave) { const [x, y] = at('outer'); text(planSay(st.turn + 1 === DECK.WAVE_TURN ? 'mark.land' : 'mark.wave', { n: st.wave }), x - 8, y - 16, PLAN_INK.them); }
  // what happened last turn, marked where it did
  for (const e of s.marks || []) { const id = e.spot || e.on || e.to; if (!id || !deckSpot(lay, id)) continue; const [x, y] = at(id); g.strokeStyle = PLAN_INK.mark; g.beginPath(); g.moveTo(x - 5, y - 5); g.lineTo(x + 5, y + 5); g.moveTo(x + 5, y - 5); g.lineTo(x - 5, y + 5); g.stroke(); }
  // the figures on their spots, side by side; a wounded one hollow; ours named, centred over each, on two rows in turn so that the names of three
  // on a spot do not run into each other (#1387)
  for (const p of deckSpots(lay)) {
    const here = planUp(st).filter(f => f.spot === p.id), [x, y] = at(p.id);
    here.forEach((f, k) => { const fx = x + (k - (here.length - 1) / 2) * (PLAN_UI.FIG * 2 + 3), color = f.hand ? PLAN_INK.you : f.side === 'us' ? PLAN_INK.us : PLAN_INK.them;
      g.beginPath(); g.arc(fx, y, PLAN_UI.FIG, 0, Math.PI * 2); if (f.hp === 2) { g.fillStyle = color; g.fill(); } else { g.strokeStyle = color; g.lineWidth = 2; g.stroke(); g.lineWidth = 1; }
      if (f.side === 'us') { const name = f.hand ? planSay('you') : f.name.slice(0, 5); g.font = font(9); text(name, fx - g.measureText(name).width / 2, y - 12 - (k % 2) * PLAN_UI.ROW, PLAN_INK.mark, 9); } });
  }
  c.dataset.drawn = String(s.state.log.length) + JSON.stringify(s.pick) + (s.intent || '');
  return said;  // the words drawn, for the scene lines' test (tests/sceneplay.js)
}
// Draws the cutaway once a page is shown and again after each choice (the frame hook; nothing changes between choices).
function planTick() {
  const s = planShowing(), c = s && UI.el.querySelector('canvas.plan-cut');
  if (c && c.dataset.drawn !== String(s.state.log.length) + JSON.stringify(s.pick) + (s.intent || '')) planDraw(c, s);
}

Mods.register({
  id: 'deck-plan-fight', name: 'The deck fight on the deck plan', builtin: true,
  init(M) {
    M.on('frame', () => planTick());
    M.action('planMove', id => { const s = planShowing(); if (s) planSetMove(s, id); });
    M.action('planAct', arg => { const s = planShowing(); if (s) planSetAct(s, arg); });
    M.action('planOrder', arg => { const s = planShowing(); if (s) planSetOrder(s, arg); });
    M.action('planSuggest', k => { const s = planShowing(); if (s) { planSuggest(s, k); planRedraw(s); } });
    M.action('planFightGo', () => { const s = planShowing(); if (s) planGo(s); });
  },
});
