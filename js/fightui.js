'use strict';

// The ship fight's panel (turn-based combat, docs/superpowers/specs/2026-10-20-turn-combat-design.md, #786), in place of the raid's beats: a pirate
// contact or a navy stop is fought on the sensor board, turn by turn. Her move and the captain's are shown first, the hand gives an order to each gun,
// and Fire resolves the turn (fight.js). Every order redraws the same dialog in place (a `keep` choice, ui.js); an end goes on into the scene it
// leads to. The fight's state is kept with the scene, as the raid's was, so nothing of it is in the save. The words are the lines of 'scene:fight'
// (hiredscenes.js). Loaded after engagements.js; only called into at runtime.

const FIGHT_AIM = ['weapons', 'drive', 'lock', 'launcher', 'hull', null];  // a gun's targets in the order a click takes them; null holds its fire; the launcher is offered only when some foe has one
const FIGHT_KM = { knife: 1.5, close: 6, mid: 25, long: 50 };  // where the board draws her in each band (board.js)
const fightSay = (key, vars) => sceneSay('scene:fight', key, vars);

// The start: the contact's own logic (a patrol's standing, the flee roll, the first fight explained once), then the fight. Returns what to show now
// and queues the panel. `o.edge` (the contact's move, an ambush) is a free first volley, ours ahead and hers behind; `o.shift` is km that move opened
// or closed the range by (range.js); `o.text` and `o.open` replace the opening line and the first line of the log.
function startShipFight(spec, flee, o = {}) {
  const st = G.state, foe = makeEnemy(spec), style = RAID_STYLE[foe.shipId] || 'grapple';
  const s = { spec, foe, style, edge: o.edge || 0, d: { foe, foeHp: 0 }, hurt: new Set(), dead: [], marked: [], youHurt: false };
  if (spec.kind === 'patrol' && !flee) changeRep(spec.gov, -8);  // firing on a navy ship is not forgotten
  let text = o.text || `Battle stations. ${theShip(foe)} made the intercept.`;
  if (flee) {
    if (Math.random() < 0.4 + 0.12 * roleSkill('pilot')) return `${helmName()} winds the drive past the redline and opens the range. Their plume fades.`;
    st.armor = Math.max(1, st.armor - Math.round(ship().armor * 0.08));
    s.edge = -1;
    text = `${helmName()} runs, but ${theShip(foe).replace(/^The/, 'the')} gets a burst in first. Battle stations.`;
  }
  captainFlag('raided');  // fought, not outrun: kept for the goodbye (captains.js)
  rateFoe(s);
  const flavor = foeFlavor(s); if (flavor) text += ` ${flavor}`;
  const me = ship(), entry = captainEntry(), side = () => shipSide({ dmgMult: 1, ...SHIPS[foe.shipId], armor: foe.maxArmor }, { grade: s.grade, ...FOE_TYPES[foe.shipId], torps: (FOE_TYPES[foe.shipId] || {}).torps || 0 });
  const mine = shipSide(me, { skill: (postMode('gunner') === 'crewed' ? roleSkill('gunner') : skillLevel('gunner')) + (boresighted() ? 1 : 0), launcher: me.launcher, torps: me.launcher ? Math.min(TORP_MAX, st.torpedoes || 0) : 0 });
  mine.armor = Math.min(mine.maxArmor, st.armor);
  s.state = shipFight({ me: mine, foes: s.pack ? [side(), side()] : [side()], nerve: entry ? entry.captain.nerve : 3, band: bandIndex(Math.max(0, rangeAtContact(style) + (o.shift || 0))) });
  s.state.log = [o.open || fightSay(`open.${style}.${st.day % 2}`)];
  if (s.edge) {
    const r = headStart(s.state, s.edge, Math.random);
    s.state = r.state;
    s.state.log.push(fightSay(s.edge > 0 ? 'first.ours' : 'first.hers', { hits: fightHits(r.events) }));
    fightTook(s, r.events);
    if (s.handDied) return text;  // the hand is dead: the ending is queued (boarders.js)
  }
  s.shown = fightMoves(s.state);
  const orders = { guns: Array.from({ length: mine.guns }, () => ({ foe: 0, part: 'weapons' })), torp: null, pdc: 'fire' };
  const told = raidExplanation();  // the first fight of a new game is explained once, before the panel (captains.js)
  G.nextEvent = told ? chainEvents([told, shipFightEvent(s, orders)]) : shipFightEvent(s, orders);
  return text;
}

// The head start: a volley before turn 1, from our ready guns at her weapons (edge above 0) or from each of hers at our hull (below 0). Pure, as
// the engine is: it returns the next state and what each shot did, and the turn count is left alone.
function headStart(state, edge, rand) {
  const st = copyOf(state), events = [];
  if (edge > 0) {
    const lo = FIGHT.GUN_DMG[0] + FIGHT.SKILL_DMG * st.me.skill;
    for (let n = 0; n < gunsReady(st); n++) events.push({ who: 'me', foe: 0, part: 'weapons', dmg: dealDamage(st.foes[0], 'weapons', rollIn([lo, FIGHT.GUN_DMG[1]], st.me.dmgMult * bandMultOf(st.band), rand)) });
  } else if (edge < 0) st.foes.forEach((foe, i) => events.push({ who: 'foe', foe: i, part: 'hull', dmg: dealDamage(st.me, 'hull', rollIn(foeVolley(st, i), 1, rand)) }));
  return { state: st, events };
}

const fightMoves = st => ({ foe: st.foes.map((_, i) => foeMove(st, i)), captain: captainMove(st) });
const fightUp = foe => foe.armor > 0 && (foe.parts.weapons.hp > 0 || foe.parts.drive.hp > 0);
const fightFoeName = (s, i) => (i ? fightSay('consort') : theShip(s.foe));
const fightHits = events => (events.length ? events.map(e => fightSay(!e.dmg ? 'log.spent' : e.who === 'foe' ? 'log.hers' : `${e.torp ? 'log.torp' : 'log.mine'}${e.foe ? '.consort' : ''}`, { part: fightSay(`part.${e.part}`), dmg: e.dmg })).join(', ') : fightSay('log.none'));  // a hit on a part already gone does nothing; a hit on her consort names it

// What the turn cost: the ship keeps its armor and its torpedoes, and a heavy hit (the hull lost more than FIGHT.HEAVY_HIT of your maximum armor, shields and armor, R23)
// can cost a casualty (CASUALTY_ODDS, more against a veteran crew or a pair, as the raid's lost beats did) and hurt the hand (FIGHT.HAND_HURT), said on the log's last line.
function fightTook(s, events) {
  const st = G.state, me = s.state.me, dealt = events.filter(e => e.who === 'foe' && e.part === 'hull').reduce((n, e) => n + e.dmg, 0), out = [];
  st.armor = Math.max(1, me.armor);
  if (me.launcher) st.torpedoes = me.torps;
  if (dealt > FIGHT.HEAVY_HIT * me.maxArmor) {
    const hits = s.hits || 0;  // the hand's hurts so far (hurtHand): a casualty that fell on the hand is the turn's hurt, and the hand's own roll is not made
    if (Math.random() < CASUALTY_ODDS * (1 + 0.15 * s.grade + (s.pack ? 0.25 : 0))) out.push(repelCasualty(s));
    if (!s.handDied && (s.hits || 0) === hits && Math.random() < FIGHT.HAND_HURT) out.push(hurtHand(s));
  }
  if (out.length) s.state.log[s.state.log.length - 1] += ` ${out.join(' ')}`;
}

// The bars of both sides as a picture under the board: shields, armor and each part, and your heat.
function fightBars(st) {
  const row = 13, W = 160;
  const bars = (side, name, x, y0) => {
    const list = [['shields', side.shields, side.maxShields, '#4aa3ff'], ['armor', side.armor, side.maxArmor, '#cfe3ff'],
      ...['weapons', 'drive', 'lock', ...(side !== st.me && side.parts.launcher ? ['launcher'] : [])].map(k => [k, side.parts[k].hp, side.parts[k].max, '#ff6a4a']), ...(side === st.me ? [['heat', st.heat, FIGHT.HEAT_CAP, '#ffcf7f']] : [])];
    const svg = list.map(([k, v, max, color], i) => {
      const y = y0 + 14 + i * row, w = Math.round((W - 70) * Math.max(0, Math.min(1, v / Math.max(1, max))));
      return `<text x="${x}" y="${y + 8}" fill="#7fb4ff" font-size="9" font-family="IBM Plex Mono, monospace">${k.toUpperCase()}</text>` +
        `<rect x="${x + 56}" y="${y}" width="${W - 70}" height="8" fill="#14243a"/><rect x="${x + 56}" y="${y}" width="${w}" height="8" fill="${color}"/>`;
    }).join('');
    return { svg: `<text x="${x}" y="${y0 + 9}" fill="#cfe3ff" font-size="10" font-family="IBM Plex Mono, monospace">${esc(name)}</text>${svg}`, label: `${name}: ${list.map(([k, v, max]) => `${k} ${v} of ${max}`).join(', ')}.` };
  };
  const mine = bars(st.me, 'You', 10, 4), rows = 5 + (st.foes.some(f => f.parts.launcher) ? 1 : 0), foes = st.foes.map((f, i) => bars(f, i ? 'Her consort' : 'Her', 190, 4 + i * (rows * row + 18)));
  const h = Math.max(6 * row, st.foes.length * (rows * row + 18)) + 22;
  return `<svg class="bars" viewBox="0 0 360 ${h}" role="img" aria-label="${esc([mine.label, ...foes.map(f => f.label)].join(' '))}"><rect x="0" y="0" width="360" height="${h}" fill="#050a11"/>${mine.svg}${foes.map(f => f.svg).join('')}</svg>`;
}

// The panel for this turn, with the orders as they stand: her move and the captain's above the board, the bars, the last lines of the log, an order for each
// ready gun, the torpedo and the turret where they are fitted, and Fire.
function shipFightEvent(s, orders, over = false) {  // over: the close, with no move to show
  const st = G.state, f = s.state, cap = raidCap(), ready = gunsReady(f);
  const say = (m, i) => fightSay(`foe.${m.kind}`, { ship: fightFoeName(s, i), ...(m.n ? { n: m.n } : {}), ...(m.target ? { part: fightSay(`part.${m.target}`), lo: m.dmg[0], hi: m.dmg[1] } : {}) });
  const read = over ? '' : [...f.foes.map((foe, i) => (fightUp(foe) ? say(s.shown.foe[i], i) : '')).filter(Boolean), fightSay(`cap.${s.shown.captain.kind}`, { cap: cap ? `Captain ${cap.last}` : helmName() })].join(' ');
  const aim = o => (o ? fightSay('aim.at', { part: fightSay(`part.${o.part}`) }) : fightSay('aim.hold'));
  const range = o => { const [lo, hi] = shotRange(f, o); return fightSay('aim.range', { aim: aim(o), lo, hi }); };  // what a gun's order would roll
  const aims = FIGHT_AIM.filter(p => p !== 'launcher' || f.foes.some(foe => foe.launcher));
  const turn = o => { const part = aims[(aims.indexOf(o ? o.part : null) + 1) % aims.length]; return part ? { foe: 0, part, ...(o && o.over ? { over: true } : {}) } : null; };  // the next target round, the charge kept
  const redo = change => () => shipFightEvent(s, { ...orders, ...change });
  const setGun = (i, g) => redo({ guns: orders.guns.map((x, j) => (j === i ? g : x)) });
  const choices = [];
  orders.guns.slice(0, ready).forEach((g, i) => {
    choices.push({ label: fightSay('gun.label', { n: i + 1, aim: g ? range(g) : aim(g) }), keep: true, run: setGun(i, turn(g)) });
    if (g) choices.push({ label: fightSay(g.over ? 'gun.over.on' : 'gun.over.off', { n: i + 1, heat: FIGHT.OVER_HEAT }), keep: true, run: setGun(i, { ...g, over: !g.over }) });  // overcharge: harder, and more heat
  });
  if (f.me.launcher && f.me.torps > 0) choices.push({ label: fightSay('torp.label', { left: f.me.torps, aim: aim(orders.torp) }), keep: true, run: redo({ torp: turn(orders.torp) }) });
  if (f.me.pdc) choices.push({ label: fightSay(orders.pdc === 'hold' ? 'pdc.hold' : 'pdc.fire'), keep: true, run: redo({ pdc: orders.pdc === 'hold' ? 'fire' : 'hold' }) });
  const heat = f.heat + orders.guns.slice(0, ready).filter(Boolean).slice(0, Math.max(0, ready - (f.me.pdc && orders.pdc === 'hold' ? 1 : 0))).reduce((h, o) => h + (o.over ? FIGHT.OVER_HEAT : 1), 0);  // as the engine counts them
  choices.push({ label: fightSay(heat > FIGHT.HEAT_CAP ? 'fire.hot' : 'fire.label', { heat, cap: FIGHT.HEAT_CAP }), keep: true, run: () => fireTurn(s, orders) });
  const breaking = f.foes.map((foe, i) => fightUp(foe) && ((s.shown || {}).foe || [])[i] && s.shown.foe[i].kind === 'break');  // her move as shown: off, while the ships still in it all go
  const away = breaking.some(Boolean) && f.foes.every((foe, i) => breaking[i] || !fightUp(foe));
  const board = raidBoard({ beat: f.turn, edge: 0, style: s.style, me: SHIPS[st.shipId], foe: SHIPS[s.foe.shipId], range: FIGHT_KM[RANGE_BANDS[f.band]], away });
  const prev = s.board || null; s.board = board;  // last turn's picture, for sensors that show her late (board.js)
  return {
    title: fightSay('title'), personal: true, via: 'crew', owner: 'you', fight: s,  // yours to decide, not the captain's (hired.js hiredCall)
    read,  // drawn above the board (ui.js)
    board: boardSvg(board, { style: s.style, beat: f.turn, sensors: condition().sensors, sunAngle: sunLight().angle, prev, pack: s.pack && fightUp(f.foes[1]), word: RANGE_BANDS[f.band] }) + fightBars(f),
    text: f.log.slice(-3).join('</p><p>'),
    choices,
  };
}

// Fire: the turn is resolved with the moves that were shown, what it cost is counted, and the panel is drawn again; at an end the panel gives way
// to the scene the end leads to (G.nextEvent), and this returns nothing.
function fireTurn(s, orders) {
  const foes = s.state.foes, first = test => foes.findIndex(f => fightUp(f) && test(f));
  const at = o => {  // the first ship still in the fight whose part is still there (a crippled one is out, shipEnd); a part no ship has (her launcher, on a ship with none) goes to the hull of the ship chosen
    if (!o) return null;
    const has = (f, part) => part === 'hull' || (f.parts[part] && f.parts[part].hp > 0), i = first(f => has(f, o.part)), j = i >= 0 ? i : first(() => true), foe = foes[Math.max(0, j)];
    return { ...o, foe: Math.max(0, j), part: foe.parts[o.part] ? o.part : 'hull' };
  };
  const aimed = { ...orders, guns: orders.guns.map(at), torp: at(orders.torp) };
  const r = resolveShipTurn(s.state, aimed, s.shown, Math.random);
  s.state = r.state;
  s.state.log.push(fightSay('log.turn', { n: s.state.turn, hits: fightHits(r.events) }));
  fightTook(s, r.events);
  if (s.handDied) return null;  // the hand is dead: the ending is queued (boarders.js)
  const end = shipEnd(s.state);
  if (end) { shipFightEnd(s, end); return null; }
  s.shown = fightMoves(s.state);
  return shipFightEvent(s, orders);
}

// Being boarded: the deck fight (below), a raider's whole run or a short one.
const fightBoarded = s => deckFightEvent(repelStart({ foe: s.foe, foeHp: 0, init: 'foe', grade: s.grade, pack: s.pack }, s.style === 'grapple' ? 'full' : 'half'));

// Where each end goes. Crippled and boarded open their scenes with the line that says how it came to them; the rest close on the panel with their line,
// and Stand down goes on to whatever the close queued (the captain lost on the bridge, the hand's ending).
function shipFightEnd(s, end) {
  const st = G.state, post = lockPost(), cap = raidCap();
  const lead = (ev, line) => ({ ...ev, text: `${line}</p><p>${ev.text}` });
  const close = (text, next = null) => {
    G.nextEvent = { ...shipFightEvent(s, { guns: [], torp: null, pdc: 'fire' }, true), text: `${s.state.log.slice(-2).join('</p><p>')}</p><p>${text}`,
      choices: [{ label: fightSay('down.label'), keep: true, run: () => { G.nextEvent = next; return null; } }] };
  };
  if (end === 'crippled' && s.spec.kind !== 'patrol') { G.nextEvent = lead(deadInSpaceScene(s), fightSay(`end.crippled.${s.style}`)); return; }  // a navy ship is not boarded: she breaks off
  if (end === 'boarded') { G.nextEvent = lead(fightBoarded(s), fightSay(`end.boarded.${s.style}`)); return; }
  if (end === 'lost') { const text = shipTaken(s); close(text, G.nextEvent); return; }
  if (end === 'broke' || end === 'crippled') {
    if (cap) like(cap, 1, fightSay(s.spec.kind === 'patrol' ? 'memory.navy' : 'memory.stood'));
    if (s.spec.kind !== 'patrol') changeRep('Pirate', -3);
    gainSkill(post, 3);
    close(`${fightSay(end === 'crippled' ? 'end.crippled.patrol' : `end.broke.${s.style}`)} ${cap ? `Captain ${cap.last} writes` : 'You write'} it in the log and nothing else. (+3 experience at the ${POSTS[post].name.toLowerCase()} post.)`);
    return;
  }
  const name = cap ? `Captain ${cap.last}` : helmName();
  if (end === 'ran') {  // the worse hurt at the turn cap: the captain runs, a lost fight, and nothing is learned
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
// (shoot, or the post's two abilities at the post's own odds, abilityOdds), and gives one order to a named crewmate (crewOrders, at crewOrderOdds); Fight
// resolves the turn (fight.js resolveDeckTurn). A head lost on our side is downed, and some of the time a named casualty (deckLoss), and the ends settle as the lock fight's did
// (repelSettle, assaultSettle). `s` is the fight from repelStart or assaultStart (boarders.js); its words are each fight's beat (the section names, openings and
// ends), the 'beats:deck' lines both fights share (the abilities and the orders) and the 'scene:fight' deck lines.

const DECK_ACTS = ['shoot', 'steady', 'cover'];
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
const deckBoard = (s, move) => fightStrip({ titles: s.state.sections.map((_, i) => deckTitle(s, i)), sections: s.state.sections, hand: s.state.hand, move, feint: s.state.grade > 0,
  began: s.state.began, breakAt: Math.floor(s.state.began * DECK.BREAK) });  // her count, with the line she breaks at (deckEnd)

// The panel for this turn, with the hand's plan as it stands ({ stand, act, order }: a section, an act, a crewmate's id). Every choice redraws it in place.
function deckFightEvent(s, plan = {}) {
  const f = s.state, post = lockPost();
  if (!s.shown) s.shown = boardMove(f, Math.random);
  const p = { stand: f.hand, act: 'shoot', order: null, ...plan }, m = s.shown;
  const near = [f.hand, ...ADJ[f.hand].filter(i => f.sections[i])], acts = DECK_ACTS.filter(k => k !== 'cover' || !f.used.cover);
  const orders = repelOrders(s, f.used.cover || p.act === 'cover'), order = orders.find(o => o.id === p.order) || null;
  const next = (list, x) => list[(list.indexOf(x) + 1) % list.length], redo = change => () => deckFightEvent(s, { ...p, ...change });
  const ability = k => deckWords(`ability.${post}.${k}.label`, FIGHT_ABILITY[post][k].label);
  const choices = [
    { label: fightSay(p.stand === f.hand ? 'deck.stand' : 'deck.move', { at: deckTitle(s, p.stand) }), keep: true, run: redo({ stand: next(near, p.stand) }) },
    { label: p.act === 'shoot' ? fightSay('deck.shoot', { lo: DECK.SIDEARM[0], hi: DECK.SIDEARM[1] }) : fightSay(`deck.${p.act}`, { what: ability(p.act) }), keep: true, run: redo({ act: next(acts, p.act) }) },
  ];
  if (orders.length) {
    const does = o => deckWords(`crew.${o.sheet.post}.${o.kind}.label`, CREW_ABILITY[o.sheet.post][o.kind].label);
    choices.push({ order: true, group: fightSay('deck.orders'), label: order ? fightSay('deck.order', { first: order.first, does: does(order) }) : fightSay('deck.order.none'), keep: true, run: redo({ order: next([null, ...orders.map(o => o.id)], order && order.id) }) });
  }
  choices.push({ label: fightSay('deck.fight'), keep: true, run: () => deckTurn(s, { ...p, order: order && order.id }) });
  const who = fightSay(`deck.who.${s.assault ? 'assault' : 'repel'}`), feint = f.grade > 0 ? ` ${fightSay('deck.feint')}` : '';
  return {
    title: deckTitle(s, f.hand), personal: true, via: 'crew', fight: s,
    read: `${fightSay('deck.turn', { n: f.turn + 1, max: DECK.TURNS })} ${fightSay(`deck.${m.kind}`, { who, n: m.n, to: deckAt(s, m.to) })}${feint}`,  // the turn and their move, drawn above the deck (ui.js)
    board: deckBoard(s, m.kind === 'hold' ? null : m),
    text: [deckOpening(s), ...(s.held.length ? [s.held.join(' ')] : []), ...f.log.slice(-3)].join('</p><p>'),
    choices,
  };
}

// A head lost on our side is downed, and DECK.CASUALTY of the time a casualty (R42): a named crewmate (repelCasualty), the one sent on an order that missed while they are up,
// else one of those standing. The rest get up when it is over, and are not named.
function deckLoss(s, sent) {
  const up = (s.fight || []).filter(id => !s.hurt.has(id) && !s.dead.some(c => c.id === id) && !s.marked.some(c => c.id === id));
  return up.length && Math.random() < DECK.CASUALTY ? repelCasualty(s, up.includes(sent) ? sent : pick(up)) : '';
}

// Fight: the turn resolved with the move that was shown, a line for it in the log, and the panel again; at an end, the close (deckClose), and this returns nothing.
function deckTurn(s, p) {
  const f = s.state, post = lockPost(), o = repelOrders(s, f.used.cover || p.act === 'cover').find(x => x.id === p.order);
  const act = p.act === 'shoot' ? 'shoot' : { kind: p.act, odds: abilityOdds(post, p.act) };
  const r = resolveDeckTurn(f, { stand: p.stand, act, order: o ? { kind: o.kind, odds: crewOrderOdds(o.sheet, o.kind, s.hurt.has(o.id)) } : null }, s.shown, Math.random);
  s.state = r.state;
  const at = i => deckAt(s, i), said = [], after = [], ab = r.events.filter(e => e.kind === 'steady' || e.kind === 'cover');
  const side = e => (e.worked ? 'win' : 'lose');
  let sent = null;
  if (act !== 'shoot' && !(act.kind === 'cover' && f.used.cover) && ab.length) { const e = ab.shift(); after.push(e.nobody ? fightSay('deck.nobody.you') : deckWords(`ability.${post}.${e.kind}.${side(e)}`, FIGHT_ABILITY[post][e.kind][side(e)])); }
  if (o && ab.length) { const e = ab.shift(); after.push(e.nobody ? fightSay('deck.nobody.crew', { first: o.first }) : `${o.first} ${deckWords(`crew.${o.sheet.post}.${e.kind}.${side(e)}`, CREW_ABILITY[o.sheet.post][e.kind][side(e)])}`); if (!e.worked && !e.nobody) sent = o.id; }
  for (const e of r.events) {
    if (e.kind === 'move') said.push(fightSay(e.who === 'mine' ? 'deck.log.ours' : 'deck.log.theirs', { n: e.n, to: at(e.to) }));
    if (e.kind === 'exchange') said.push(fightSay('deck.log.fight', { at: at(e.section), theirs: e.theirs, mine: e.mine }));
    if (e.kind === 'hand') said.push(fightSay('deck.log.back', { to: at(e.to) }));
  }
  for (const e of r.events.filter(x => x.kind === 'exchange')) for (let n = 0; n < e.mine; n++) { const line = deckLoss(s, sent); sent = null; if (line) after.push(line); }
  if (r.events.some(e => e.kind === 'shoot' && e.nobody)) after.push(fightSay('deck.nobody.you'));  // a shot with none of them there, as a steady one says
  if (r.events.some(e => e.kind === 'hurt' && e.hurt)) after.push(repelCasualty(s, 'you'));  // the hand's hurt, which a friend may take (once a fight)
  s.state.log.push(`${fightSay('deck.log.turn', { n: s.state.turn, what: said.length ? said.join(', ') : fightSay('deck.log.none') })}${after.length ? ` ${after.join(' ')}` : ''}`);
  if (s.handDied) return null;  // the hand is dead: the ending is queued (boarders.js)
  const end = deckEnd(s.state);
  if (end) { deckClose(s, end); return null; }
  s.shown = boardMove(s.state, Math.random);
  return deckFightEvent(s, { act: p.act === 'cover' ? 'shoot' : p.act, order: p.order });
}

// The end: the line for how it was won (the last of them down, or the rest broken) or for the attackers withdrawing at the turn cap, then the settle (boarders.js),
// shown on the panel; Stand down goes on to whatever the settle queued (the duel, the captain lost on the bridge, the hand's ending).
function deckClose(s, end) {
  const f = s.state, left = sum(f, 'theirs'), capped = deckCapped(f) && deckEnd({ ...f, turn: 0 }) === null;
  const how = end !== 'won' || capped ? null : left === 0 ? 'last' : left <= f.began * DECK.BREAK ? 'broke' : null;
  s.won = end === 'won';
  const line = capped ? fightSay(`deck.withdraw.${s.assault ? 'assault' : 'repel'}`) : how ? repelWords(s, `end.${how}`, FIGHT_END[s.assault ? 'assault' : 'repel'][how]) : '';
  const said = `${line ? `${line} ` : ''}${repelSettle(s)}`, next = G.nextEvent;
  G.nextEvent = { title: deckTitle(s, f.hand), personal: true, via: 'crew', fight: s, board: deckBoard(s, null), text: `${f.log.slice(-2).join('</p><p>')}</p><p>${said}`,
    choices: [{ label: fightSay('down.label'), keep: true, run: () => { G.nextEvent = next; return null; } }] };
}
