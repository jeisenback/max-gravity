'use strict';

// The ship fight's start and its ends (#786; fought on the radar since #1348: radarui.js draws and runs it, radar.js holds its rules). A pirate contact or a
// navy stop builds both sides here and opens the radar fight; what a step costs the ship (fightTook) and where each end goes (shipFightEnd) are here, and
// being boarded or boarding her goes on to the deck fight (deckplanui.js). The fight is kept with its scene, so nothing of it is in the save. The words are the lines
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
  if (handPerk('pd-watch')) mine.pdcReach = RADAR.PDC_WATCH;  // the gunner's point defence watch (picks.js): the point defence reaches further
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
  const lead = (ev, line) => ({ ...ev, text: ev.text ? `${line}</p><p>${ev.text}` : line });  // the deck fight's scene has no text of its own unless some of the crew keep out
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

// ---------- the deck fight: boarding, on the deck plan (deckplanui.js) ----------
// A deck fight begins: the first of a new game is explained once, before its scene (captains.js deckExplanation, #850).
const deckOpen = s => { const told = deckExplanation(), first = planFightEvent(s); return told ? chainEvents([told, first]) : first; };

// A head of ours downed is a casualty `share` of the time (deckplan.js planCasualty, R42): a named crewmate (repelCasualty), the one downed while they are up,
// else one of those standing. The rest get up when it is over, and are not named.
function deckLoss(s, sent, share) {
  const up = (s.fight || []).filter(id => !s.hurt.has(id) && !s.dead.some(c => c.id === id) && !s.marked.some(c => c.id === id));
  return up.length && Math.random() < share ? repelCasualty(s, up.includes(sent) ? sent : pick(up)) : '';
}
