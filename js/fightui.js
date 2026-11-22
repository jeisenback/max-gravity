'use strict';

// The ship fight's start and its ends (#786; fought on the radar since #1348: radarui.js draws and runs it, radar.js holds its rules). A pirate contact or a
// navy stop builds both sides here and opens the radar fight; what a step costs the ship (fightTook) and where each end goes (shipFightEnd) are here, and
// being boarded or boarding her goes on to the deck fight below. The fight is kept with its scene, so nothing of it is in the save. The words are the lines
// of 'scene:fight' (hiredscenes.js). Loaded after engagements.js; only called into at runtime.

const fightSay = (key, vars) => sceneSay('scene:fight', key, vars);
// The gunner moves a hand knows (docs/superpowers/specs/2026-10-23-gunner-moves-design.md): the career's list, empty for a save from before (the Bridge
// page shows them).
const knownMoves = c => (c && c.moves) || [];

// The start: the contact's own logic (a patrol's standing, the flee roll, the first fight explained once), then the fight. Returns what to show now
// and queues the panel. `o.edge` (the contact's move, an ambush) is a free first volley, ours ahead and hers behind; `o.shift` is km that move opened
// or closed the range by (range.js); `o.text` and `o.open` replace the opening line and the first line of the log.
const fleeOdds = () => 0.4 + 0.12 * roleSkill('pilot') + (handPerk('brace') ? 0.1 : 0);  // a run from a contact gets away, by the pilot's skill (and the brace pick, picks.js); a run that fails costs hull and fights (the label says so: engage.js)
function startShipFight(spec, flee, o = {}) {
  const st = G.state, foe = makeEnemy(spec), style = RAID_STYLE[foe.shipId] || 'grapple';
  const s = { spec, foe, style, edge: o.edge || 0, d: { foe, foeHp: 0 }, hurt: new Set(), dead: [], marked: [], youHurt: false, known: hired() ? knownMoves(career()) : [] };  // known: the moves this fight offers, the hand's own (each a pick on the hand's post's ladder, picks.js)
  if (spec.kind === 'patrol' && !flee) changeRep(spec.gov, -8);  // firing on a navy ship is not forgotten
  let text = o.text || fightSay('start.text', { ship: theShip(foe) });
  if (flee) {
    const away = Math.random() < fleeOdds() + (o.flee || 0);  // o.flee: Runner's door adds to the odds (engage.js)
    recordHand('fled'); if (spec.kind === 'patrol') recordHand('ranFromNavy');  // the record (traits.js): a run, got away or not, counted after the roll so a moment is said of what happened
    if (away) return `${fightSay('flee.away', { helm: helmName() })}${runCost()}`;
    st.armor = Math.max(1, st.armor - Math.round(hullPast(ship().armor) * 0.08));  // eight percent of the armor past the skin (#1208)
    s.edge = -1;
    text = fightSay('flee.caught', { helm: helmName(), ship: theShip(foe).replace(/^The/, 'the') });
  }
  if (spec.ladder) ladderDone(hired(), spec.ladder);  // a ladder step is met when its fight starts, also after a failed run, and not when it is run from (fightladder.js)
  captainFlag('raided');  // fought, not outrun: kept for the goodbye (captains.js)
  rateFoe(s);
  const flavor = foeFlavor(s); if (flavor) text += ` ${flavor}`;
  const me = ship(), entry = captainEntry(), side = () => shipSide({ dmgMult: 1, ...SHIPS[foe.shipId], armor: foe.maxArmor }, { grade: s.grade, ...FOE_TYPES[foe.shipId], torps: (FOE_TYPES[foe.shipId] || {}).torps || 0, breakAt: hasTrait(hired(), 'hard-case') ? FIGHT.BREAK + 0.1 : undefined });  // Hard Case (traits.js): she breaks off a tenth sooner
  const fit = partFight(st), own = stationFight(hired());  // the fitted parts' and the hand's station's fight numbers (parts.js, #1135)
  const guard = perf('pd') * fit.armor * own.armor;  // the point defence's condition and parts scale what the hull can take (#1208)
  const mine = shipSide({ ...me, dmgMult: me.dmgMult * perf('fire') * fit.dmgMult * own.dmgMult, armor: me.armor * guard }, { skill: (postMode('gunner') === 'crewed' ? roleSkill('gunner') : skillLevel('gunner')) + (boresighted() ? 1 : 0) + (handPerk('marksman') ? 1 : 0), launcher: me.launcher, torps: me.launcher ? Math.min(TORP_MAX, st.torpedoes || 0) : 0 });
  mine.armor = Math.min(mine.maxArmor, Math.max(1, Math.round(st.armor * FIGHT.POOL * guard)));  // at least 1: a ship at its last armor still fights
  s.armor0 = { real: st.armor, fight: mine.armor, scale: FIGHT.POOL * guard };  // what fightTook measures the real loss from, and at what scale
  const met = Math.max(0, rangeAtContact(style) + (o.shift || 0) + (handPerk('lane-sense') ? 10 : 0) - (spec.kind === 'pirate' && hasTrait(hired(), 'runner') ? 10 : 0));  // lane-sense: her plume read ten km sooner; Runner (traits.js): pirates close ten km faster, a patrol does not
  const foes = s.pack ? [side(), side()] : [side()], nerve = entry ? entry.captain.nerve : 3;  // an owner who kept a post has no captain: the order is picked at a steady nerve
  s.state = radarFight({ me: mine, foes, nerve, types: foes.map(() => foe.shipId), opening: bandIndex(met) < RANGE_BANDS.indexOf('long') ? 'short' : 'long', fit: radarFit(st), sensors: perf('sensors') });  // short: she is met inside mid range (a patrol, an ambush)
  s.state.log = [o.open || fightSay(`open.${style}.${st.day % 2}`)];
  if (s.edge) {
    const r = radarHeadStart(s.state, s.edge, bandIndex(met));
    s.state = r.state;
    s.state.log.push(fightSay(s.edge > 0 ? 'first.ours' : 'first.hers', { hits: fightHits(r.events) }));
    fightTook(s, r.events);
    if (s.handDied) return text;  // the hand is dead: the ending is queued (boarders.js)
  }
  const told = raidExplanation();  // the first fight of a new game is explained once, before the panel (captains.js)
  const panel = radarFightEvent(s);
  G.nextEvent = told ? chainEvents([told, panel]) : panel;
  return text;
}

// The head start: a volley before the fight, from our ready guns at her weapons (edge above 0) or from each of hers at our hull (below 0), at the range
// band she was met in. Pure: it returns the next state and what each shot did.
function headStart(state, edge, rand) {

  const st = copyOf(state), events = [];
  if (edge > 0) {
    const lo = FIGHT.GUN_DMG[0] + FIGHT.SKILL_DMG * st.me.skill;
    for (let n = 0; n < gunsReady(st); n++) events.push({ who: 'me', foe: 0, part: 'weapons', dmg: dealDamage(st.foes[0], 'weapons', rollIn([lo, FIGHT.GUN_DMG[1]], st.me.dmgMult * bandMultOf(st.band), rand)) });
  } else if (edge < 0) st.foes.forEach((foe, i) => events.push({ who: 'foe', foe: i, part: 'hull', dmg: dealDamage(st.me, 'hull', rollIn(foeVolley(st, i), 1, rand)) }));
  return { state: st, events };
}

// The head start's volley in words: ours at her weapons, or hers at our hull (headStart).
const fightHits = events => events.map(e => fightSay(e.who === 'foe' ? 'log.hers' : 'log.mine', { part: fightSay(`part.${e.part}`), dmg: e.dmg })).join(', ');

// What a step of the fight cost: the ship keeps its armor (the fight's armor lost since the start, divided by its scale (FIGHT.POOL, and the point defence's, s.armor0.scale), off the real armor it started with; never up, never under 1) and its torpedoes, and a heavy hit (the hull lost more than FIGHT.HEAVY_HIT of your real maximum armor, shields and armor, R23)
// can cost a casualty (CASUALTY_ODDS, more against a veteran crew or a pair, as the raid's lost beats did) and hurt the hand (FIGHT.HAND_HURT), said on the log's last line.
const FIGHT_WEAR = { salvo: 0.4, hit: 0.9 };  // what a salvo takes off fire control and a hit off the point defence, in the hand's fight
function fightTook(s, events) {
  const st = G.state, me = s.state.me, dealt = events.filter(e => e.who === 'foe' && e.part === 'hull').reduce((n, e) => n + e.dmg, 0), out = [];
  // Each salvo wears fire control and each hit the point defence, scaled so a fight costs about what one costs the owner (duel.js: 0.05 a shot over about
  // a hundred shots, 0.3 a hit over about fifteen), from a hand's fight of about six turns of two salvos and five hits (#1135).
  wear('fire', FIGHT_WEAR.salvo * events.filter(e => e.who === 'me').length);
  wear('pd', FIGHT_WEAR.hit * events.filter(e => e.who === 'foe' && e.part === 'hull').length);
  st.armor = Math.max(1, s.armor0.real - Math.max(0, Math.round((s.armor0.fight - me.armor - HULL_SKIN * me.maxArmor) / (s.armor0.scale || FIGHT.POOL))));  // what got past the skin stays on the ship (HULL_SKIN, #1208)
  if (me.launcher) st.torpedoes = me.torps;
  if (dealt > FIGHT.HEAVY_HIT * hullPast(me.maxArmor) / FIGHT.POOL) {  // judged at the real scale: the foe's damage is not pooled, so a heavy turn takes what it did before #814
    const hits = s.hits || 0;  // the hand's hurts so far (hurtHand): a casualty that fell on the hand is the turn's hurt, and the hand's own roll is not made
    if (Math.random() < CASUALTY_ODDS * (1 + 0.15 * s.grade + (s.pack ? 0.25 : 0))) out.push(repelCasualty(s));
    if (!s.handDied && (s.hits || 0) === hits && Math.random() < FIGHT.HAND_HURT) out.push(hurtHand(s));
  }
  if (out.length) s.state.log[s.state.log.length - 1] += ` ${out.join(' ')}`;
}

// Being boarded: the deck fight (below), a raider's whole run or a short one.
const fightBoarded = s => deckOpen(repelStart({ foe: s.foe, foeHp: 0, init: 'foe', grade: s.grade, pack: s.pack }, s.style === 'grapple' ? 'full' : 'half'));

// Where each end goes. Crippled and boarded open their scenes with the line that says how it came to them; the rest close on the panel with their line,
// and Stand down goes on to whatever the close queued (the captain lost on the bridge, the hand's ending).
function shipFightEnd(s, end) {
  const st = G.state, post = lockPost(), cap = raidCap();
  if (['crippled', 'broke', 'away'].includes(end)) recordHand('fightsWon'); else if (['ran', 'escaped'].includes(end)) recordHand('fightsRan');  // the record (traits.js)
  const lead = (ev, line) => ({ ...ev, text: `${line}</p><p>${ev.text}` });
  const close = (text, next = null) => {
    G.nextEvent = { title: fightSay('title'), personal: true, via: 'crew', owner: 'you', fight: s, text: `${s.state.log.slice(-2).join('</p><p>')}</p><p>${text}`,
      choices: [{ label: fightSay('down.label'), keep: true, run: () => { G.nextEvent = next; return null; } }] };
  };
  if (end === 'crippled' && s.spec.kind !== 'patrol') { G.nextEvent = lead(deadInSpaceScene(s), fightSay(`end.crippled.${s.style}`)); return; }  // a navy ship is not boarded: she breaks off
  if (end === 'boarded') { G.nextEvent = lead(fightBoarded(s), fightSay(`end.boarded.${s.style}`)); return; }
  if (end === 'lost') { const text = shipTaken(s); close(text, G.nextEvent); return; }
  if (end === 'broke' || end === 'crippled') {
    if (cap) like(cap, 1, fightSay(s.spec.kind === 'patrol' ? 'memory.navy' : 'memory.stood'));
    if (s.spec.kind !== 'patrol') changeRep('Pirate', -3);
    gainSkill(post, 3);
    const where = POSTS[post].name.toLowerCase();  // an owner has no captain, and writes it in the log themselves
    close(`${fightSay(end === 'crippled' ? 'end.crippled.patrol' : `end.broke.${s.style}`)} ${cap ? fightSay('end.logged', { cap: `Captain ${cap.last}`, post: where }) : `You write it in the log and nothing else. (+3 experience at the ${where} post.)`}`);
    return;
  }
  const name = cap ? `Captain ${cap.last}` : helmName();
  if (end === 'ran') {  // the worse hurt at the cycle cap: the captain runs, a lost fight, and nothing is learned
    if (cap) like(cap, -1, fightSay('memory.ran'));
    let gone = '';  // the captain has part of the hold dumped to run lighter
    if (hasTradeCargo()) { const { cid, qty } = shedCargo(FIGHT.LOST_CARGO); gone = ` ${fightSay('end.ran.cargo', { cap: name, qty, good: goodName(cid) })}`; }
    close(fightSay('end.ran', { cap: name }) + gone);
    return;
  }
  if (end === 'away') { close(fightSay('end.away')); return; }  // she got away with her guns gone and her hull whole: no experience, no word from the captain
  close(fightSay(`end.escaped.${s.style}`));
}

// ---------- the deck fight: boarding on the same panel (spec Section 3), in place of the lock fight ----------
// The deck is drawn as its sections (handtohand.js fightStrip) with their move shown above it. The hand stands or moves one section, does one thing there
// (shoot, the post's two abilities at the post's own odds, abilityOdds, pull back, or hold fire), and gives one order to a named crewmate (crewOrders, at crewOrderOdds); Fight
// resolves the turn (fight.js resolveDeckTurn). A head lost on our side is downed, and some of the time a named casualty (deckLoss), and the ends settle as the lock fight's did
// (repelSettle, assaultSettle). `s` is the fight from repelStart or assaultStart (boarders.js); its words are each fight's beat (the section names, openings and
// ends), the 'beats:deck' lines both fights share (the abilities and the orders) and the 'scene:fight' deck lines.

const DECK_ACTS = ['shoot', 'steady', 'cover', 'holdfire', 'pullback'];  // holdfire: the hand stands ready and fires at nobody, no shot and no ability rolled (the engine does nothing for it)
const isHatch = o => HATCH_ORDER[o.sheet.post] === o.kind;  // an order worked at a section of the crew's choosing (handtohand.js)
// A section's name: the beat's title (her deck is named from her bridge), and the cargo bay's from the deck lines.
const deckTitle = (s, i) => {
  if (i === CARGO) return fightSay(s.assault ? 'deck.cargoHers' : 'deck.cargo');
  const k = s.assault ? 2 - i : i;
  return repelWords(s, `title.${k}`, (s.assault ? ASSAULT_TITLES : REPEL_TITLES)[k]);
};
// The opening of the section the hand stands in, the other of its two each turn (the cargo bay reads as the corridor).
// A section's name inside a sentence (the deck lines).
const deckAt = (s, i) => fightSay(`deck.${s.assault ? 'hers' : 'ours'}.${i}`);
const deckOpening = s => { const k = s.assault ? 2 - REACH[s.state.hand] : REACH[s.state.hand]; return repelWords(s, `open.${k}.${s.state.turn % 2}`, (s.assault ? ASSAULT_OPENINGS : REPEL_OPENINGS)[k][s.state.turn % 2]); };
const mayFeint = (f, move) => !navyBoarding(f) && f.grade > 0 && !!move && (move.kind === 'push' || move.kind === 'round');  // a veteran's push or round may feint; a rush or a charge never does, nor a navy party on our deck
const fallTo = f => (f.assault ? BACK : FORWARD)[f.hand];  // where a pull back takes the hand: toward our bridge, or her lock; the same section from the back one
const deckBoard = (s, move) => fightStrip({ titles: s.state.sections.map((_, i) => deckTitle(s, i)), sections: s.state.sections, hand: s.state.hand, move, feint: mayFeint(s.state, move),
  began: s.state.began, breakAt: Math.floor(s.state.began * deckRule(s.state, 'BREAK')),  // her count, with the line she breaks at (deckEnd)
  pending: pendingWave(s.state), comeSay: (n, m) => fightSay('deck.aboard', { n, m }),  // and the heads of it still to land, apart from those down
  hurtSay: n => fightSay('deck.wounded', { n }), oursSay: n => fightSay('deck.woundedOurs', { n }),  // and the wounded among them
  wave: s.state.wave && s.state.turn + 1 === s.state.wave.turn ? fightSay('deck.wave', { n: s.state.wave.n }) : '' });  // and the rest of the party, on the turn at whose end it lands (DECK.WAVE_TURN)

// A deck fight begins: the first of a new game is explained once, before its panel (captains.js deckExplanation, #850).
const deckOpen = s => { const told = deckExplanation(); return told ? chainEvents([told, deckFightEvent(s)]) : deckFightEvent(s); };

// The panel for this turn, with the hand's plan as it stands ({ stand, act, order }: a section, an act, a crewmate's id). Every choice redraws it in place.
function deckFightEvent(s, plan = {}) {
  const f = s.state, post = lockPost();
  if (!s.shown) s.shown = boardMove(f, Math.random);
  const p = { stand: f.hand, act: 'shoot', order: null, ...plan }, m = s.shown, there = p.at === undefined ? p.stand : p.at;  // `there`: where a hatch is worked
  const near = [f.hand, ...ADJ[f.hand].filter(i => f.sections[i])], aims = [p.stand, ...(f.level >= DECK.SIDEARM_REACH_LEVEL ? ADJ[p.stand].filter(i => f.sections[i]) : [])], aim = aims.includes(p.shootAt) ? p.shootAt : p.stand,  // `aim`: where the shot goes
    back = fallTo(f), acts = DECK_ACTS.filter(k => (k !== 'cover' || !f.used.cover) && (k !== 'pullback' || (p.stand === f.hand && back !== f.hand)));  // a pull back only where the hand stays (a section a turn), and none from the back section
  if (!acts.includes(p.act)) p.act = 'shoot';  // a pull back planned before the hand moved
  const orders = repelOrders(s, f.used.cover || p.act === 'cover'), order = orders.find(o => o.id === p.order) || null;
  const next = (list, x) => list[(list.indexOf(x) + 1) % list.length], redo = change => () => deckFightEvent(s, { ...p, ...change });
  const ability = k => deckWords(`ability.${post}.${k}.label`, FIGHT_ABILITY[post][k].label);
  const choices = [
    { label: fightSay(p.stand === f.hand ? 'deck.stand' : 'deck.move', { at: deckTitle(s, p.stand) }), keep: true, run: redo({ stand: next(near, p.stand) }) },
    { label: p.act === 'shoot' ? fightSay('deck.shoot', { lo: sidearmOf(f)[0], hi: sidearmOf(f)[1] }) : p.act === 'pullback' ? fightSay('deck.pullback', { to: deckAt(s, back) }) : p.act === 'holdfire' ? fightSay('deck.holdfire') : fightSay(`deck.${p.act}`, { what: ability(p.act) }), keep: true, run: redo({ act: next(acts, p.act) }) },
  ];
  if (p.act === 'shoot' && aims.length > 1) choices.push({ label: fightSay('deck.shoot.at', { at: deckAt(s, aim) }), keep: true, run: redo({ shootAt: next(aims, aim) }) });
  if (orders.length) {
    const does = o => deckWords(`crew.${o.sheet.post}.${o.kind}.label`, CREW_ABILITY[o.sheet.post][o.kind].label);
    choices.push({ order: true, group: fightSay('deck.orders'), label: order ? fightSay('deck.order', { first: order.first, does: does(order) }) : fightSay('deck.order.none'), keep: true, run: redo({ order: next([null, ...orders.map(o => o.id)], order && order.id) }) });
    if (order && isHatch(order)) choices.push({ label: fightSay('deck.order.at', { at: deckAt(s, there) }), keep: true, run: redo({ at: next(f.sections.map((_, i) => i), there) }) });
  }
  choices.push({ label: fightSay('deck.fight'), keep: true, pin: true, primary: true, run: () => deckTurn(s, { ...p, order: order && order.id }) });  // pinned in view as Fire is; the plan flows with the scene (ui.js, #991)
  const who = fightSay(`deck.who.${s.assault ? 'assault' : f.party === 'navy' ? 'navy' : 'repel'}`), feint = mayFeint(f, m) ? ` ${fightSay('deck.feint')}` : '';
  const standing = navyBoarding(f) ? [fightSay('deck.navy.down', { gov: s.d.foe.gov, n: DECK.NAVY_STANDING * f.navyDown })] : [];  // what the heads of a navy party put down have cost so far (repelSettle)
  return {
    title: deckTitle(s, f.hand), personal: true, via: 'crew', fight: s,
    read: `${fightSay('deck.turn', { n: f.turn + 1, max: deckCap(f) })} ${fightSay(`deck.${m.kind}`, { who, n: m.n, ...(m.kind === 'charge' ? { at: deckAt(s, m.at), from: deckAt(s, m.from) } : { to: deckAt(s, m.to) }), ...(m.via === undefined ? {} : { via: deckAt(s, m.via) }) })}${feint}`,  // the turn and their move, drawn above the deck (ui.js)
    board: deckBoard(s, m.kind === 'hold' ? null : m),
    legend: fightSay('deck.legend'),  // what the board's marks are, under it (ui.js, #850)
    text: [deckOpening(s), ...standing, ...(s.held.length ? [s.held.join(' ')] : []), ...f.log.slice(-3)].join('</p><p>'),
    choices,
  };
}

// A head lost on our side is downed, and DECK.CASUALTY of the time (boarding her DECK.ASSAULT's) a casualty (R42): a named crewmate (repelCasualty), the one sent on an order that missed while they are up,
// else one of those standing. The rest get up when it is over, and are not named.
function deckLoss(s, sent) {
  const up = (s.fight || []).filter(id => !s.hurt.has(id) && !s.dead.some(c => c.id === id) && !s.marked.some(c => c.id === id));
  return up.length && Math.random() < deckRule(s.state, 'CASUALTY') ? repelCasualty(s, up.includes(sent) ? sent : pick(up)) : '';
}

// Fight: the turn resolved with the move that was shown, a line for it in the log, and the panel again; at an end, the close (deckClose), and this returns nothing.
function deckTurn(s, p) {
  const f = s.state, post = lockPost(), o = repelOrders(s, f.used.cover || p.act === 'cover').find(x => x.id === p.order);
  const act = p.act === 'shoot' ? { kind: 'shoot', ...(p.shootAt === undefined ? {} : { at: p.shootAt }) } : p.act === 'pullback' || p.act === 'holdfire' ? { kind: p.act } : { kind: p.act, odds: abilityOdds(post, p.act) };
  const r = resolveDeckTurn(f, { stand: p.stand, act, order: o ? { kind: o.kind, odds: crewOrderOdds(o.sheet, o.kind, s.hurt.has(o.id)), ...(isHatch(o) ? { at: p.at === undefined ? p.stand : p.at } : {}) } : null }, s.shown, Math.random);
  s.state = r.state;
  const at = i => deckAt(s, i), said = [], after = [], ab = r.events.filter(e => e.kind === 'steady' || e.kind === 'cover'), worked = r.events.find(e => e.kind === 'hatch');  // a hatch is the order's own, rolled before the rest
  const side = e => (e.worked ? 'win' : 'lose');
  let sent = null;
  if (act.kind === 'holdfire') after.push(fightSay('deck.holdfire.you'));
  if ((act.kind === 'steady' || act.kind === 'cover') && !(act.kind === 'cover' && f.used.cover) && ab.length) { const e = ab.shift(); after.push(e.nobody ? fightSay('deck.nobody.you') : deckWords(`ability.${post}.${e.kind}.${side(e)}`, FIGHT_ABILITY[post][e.kind][side(e)])); }
  const crew = !o ? null : isHatch(o) ? worked : ab.shift();
  if (crew) { const e = crew; after.push(e.nobody ? fightSay('deck.nobody.crew', { first: o.first }) : `${o.first} ${deckWords(`crew.${o.sheet.post}.${o.kind}.${side(e)}`, CREW_ABILITY[o.sheet.post][o.kind][side(e)])}`); if (!e.worked && !e.nobody) sent = o.id; }
  for (const e of r.events) {
    if (e.kind === 'move') said.push(fightSay(e.who === 'mine' ? 'deck.log.ours' : 'deck.log.theirs', { n: e.n, to: at(e.to) }));
    if (e.kind === 'exchange' && (e.theirs || e.mine)) said.push(fightSay('deck.log.fight', { at: at(e.section), theirs: e.theirs, mine: e.mine }));
    if (e.kind === 'exchange' && (e.theirsHurt || e.mineHurt)) said.push(fightSay('deck.log.wounds', { at: at(e.section), theirs: e.theirsHurt, mine: e.mineHurt }));
    if (e.kind === 'hand') said.push(fightSay('deck.log.back', { to: at(e.to) }));
    if (e.kind === 'rush') said.push(e.stopped ? fightSay('deck.log.rushStopped', { n: e.n, at: at(e.to) }) : fightSay('deck.log.rush', { n: e.n, to: at(e.to) }));
    if (e.kind === 'wave') said.push(fightSay('deck.log.wave', { n: e.n }));
    if (e.kind === 'pullback') said.push(fightSay('deck.log.pullback', { to: at(e.to) }));
    if (e.kind === 'charge') said.push(e.stopped ? fightSay('deck.log.chargeStopped', { at: at(e.at), from: at(e.from) }) : e.mine ? fightSay('deck.log.charge', { at: at(e.at), mine: e.mine }) : fightSay('deck.log.chargeEmpty', { at: at(e.at) }));
  }
  for (const e of r.events.filter(x => x.kind === 'exchange' || x.kind === 'charge')) for (let n = 0; n < e.mine; n++) { const line = deckLoss(s, sent); sent = null; if (line) after.push(line); }
  const missed = r.events.find(e => e.kind === 'shoot' && e.nobody);  // a shot with none of them there, as a steady one says: where the hand stands, or the section it was aimed at
  if (missed) { const line = missed.aimed ? fightSay('deck.nobody.aim', { at: at(missed.at) }) : fightSay('deck.nobody.you'); if (!after.includes(line)) after.push(line); }  // said once a turn, though an ability and the shot both find none (#854)
  if (r.events.some(e => e.kind === 'hurt' && e.hurt)) after.push(repelCasualty(s, 'you'));  // the hand's hurt, which a friend may take (once a fight)
  s.state.log.push(`${fightSay('deck.log.turn', { n: s.state.turn, what: said.length ? said.join(', ') : fightSay('deck.log.none') })}${after.length ? ` ${after.join(' ')}` : ''}`);
  if (s.handDied) return null;  // the hand is dead: the ending is queued (boarders.js)
  const end = deckEnd(s.state);
  if (end) { deckClose(s, end); return null; }
  s.shown = boardMove(s.state, Math.random);
  return deckFightEvent(s, { act: p.act === 'cover' || p.act === 'pullback' ? 'shoot' : p.act, order: p.order });
}

// The end: the line for how it was won (the last of them down, or the rest broken) or for the attackers withdrawing at the turn cap, then the settle (boarders.js: a search says its own),
// shown on the panel; Stand down goes on to whatever the settle queued (the duel, the captain lost on the bridge, the hand's ending).
function deckClose(s, end) {
  const f = s.state, left = sum(f, 'theirs'), capped = deckWithdrew(f);
  const how = end !== 'won' || capped ? null : left === 0 ? 'last' : left <= f.began * deckRule(f, 'BREAK') ? 'broke' : null;
  s.won = end === 'won'; s.searched = end === 'searched';
  const line = capped ? fightSay(`deck.withdraw.${s.assault ? 'assault' : 'repel'}`) : how ? repelWords(s, `end.${how}`, FIGHT_END[s.assault ? 'assault' : 'repel'][how]) : '';
  const said = `${line ? `${line} ` : ''}${repelSettle(s)}`, next = G.nextEvent;
  G.nextEvent = { title: deckTitle(s, f.hand), personal: true, via: 'crew', fight: s, board: deckBoard(s, null), text: `${f.log.slice(-2).join('</p><p>')}</p><p>${said}`,
    choices: [{ label: fightSay('down.label'), keep: true, run: () => { G.nextEvent = next; return null; } }] };
}
