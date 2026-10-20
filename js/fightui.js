'use strict';

// The ship fight's panel (turn-based combat, docs/superpowers/specs/2026-10-20-turn-combat-design.md, #786), in place of the raid's beats: a pirate
// contact or a navy stop is fought on the sensor board, turn by turn. Her move and the captain's are shown first, the hand gives an order to each gun,
// and Fire resolves the turn (fight.js). Every order redraws the same dialog in place (a `keep` choice, ui.js); an end goes on into the scene it
// leads to. The fight's state is kept with the scene, as the raid's was, so nothing of it is in the save. The words are the lines of 'scene:fight'
// (hiredscenes.js). Loaded after engagements.js; only called into at runtime.

const FIGHT_AIM = ['weapons', 'drive', 'lock', 'hull', null];  // a gun's targets in the order a click takes them; null holds its fire
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
  const me = ship(), entry = captainEntry(), side = () => shipSide({ dmgMult: 1, ...SHIPS[foe.shipId], armor: foe.maxArmor }, { grade: s.grade });
  const mine = shipSide(me, { skill: roleSkill('gunner') + (boresighted() ? 1 : 0), torps: me.launcher ? Math.min(TORP_MAX, st.torpedoes || 0) : 0 });
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
const fightHits = events => (events.length ? events.map(e => fightSay(!e.dmg ? 'log.spent' : e.who === 'foe' ? 'log.hers' : e.torp ? 'log.torp' : 'log.mine', { part: fightSay(`part.${e.part}`), dmg: e.dmg })).join(', ') : fightSay('log.none'));  // a hit on a part already gone does nothing

// What the turn cost: the ship keeps its armor and its torpedoes, and a heavy hit (she dealt more than FIGHT.HEAVY_HIT of your maximum armor, to any part)
// can cost a casualty (CASUALTY_ODDS, more against a veteran crew or a pair, as the raid's lost beats did) and hurt the hand (FIGHT.HAND_HURT), said on the log's last line.
function fightTook(s, events) {
  const st = G.state, me = s.state.me, dealt = events.filter(e => e.who === 'foe').reduce((n, e) => n + e.dmg, 0), out = [];
  st.armor = Math.max(1, me.armor);
  if (me.launcher) st.torpedoes = me.torps;
  if (dealt > FIGHT.HEAVY_HIT * me.maxArmor) {
    if (Math.random() < CASUALTY_ODDS * (1 + 0.15 * s.grade + (s.pack ? 0.25 : 0))) out.push(repelCasualty(s));
    if (!s.handDied && Math.random() < FIGHT.HAND_HURT) out.push(hurtHand(s));
  }
  if (out.length) s.state.log[s.state.log.length - 1] += ` ${out.join(' ')}`;
}

// The bars of both sides as a picture under the board: shields, armor and each part, and your heat.
function fightBars(st) {
  const row = 13, W = 160;
  const bars = (side, name, x, y0) => {
    const list = [['shields', side.shields, side.maxShields, '#4aa3ff'], ['armor', side.armor, side.maxArmor, '#cfe3ff'],
      ...['weapons', 'drive', 'lock'].map(k => [k, side.parts[k].hp, side.parts[k].max, '#ff6a4a']), ...(side === st.me ? [['heat', st.heat, FIGHT.HEAT_CAP, '#ffcf7f']] : [])];
    const svg = list.map(([k, v, max, color], i) => {
      const y = y0 + 14 + i * row, w = Math.round((W - 70) * Math.max(0, Math.min(1, v / Math.max(1, max))));
      return `<text x="${x}" y="${y + 8}" fill="#7fb4ff" font-size="9" font-family="IBM Plex Mono, monospace">${k.toUpperCase()}</text>` +
        `<rect x="${x + 56}" y="${y}" width="${W - 70}" height="8" fill="#14243a"/><rect x="${x + 56}" y="${y}" width="${w}" height="8" fill="${color}"/>`;
    }).join('');
    return { svg: `<text x="${x}" y="${y0 + 9}" fill="#cfe3ff" font-size="10" font-family="IBM Plex Mono, monospace">${esc(name)}</text>${svg}`, label: `${name}: ${list.map(([k, v, max]) => `${k} ${v} of ${max}`).join(', ')}.` };
  };
  const mine = bars(st.me, 'You', 10, 4), foes = st.foes.map((f, i) => bars(f, i ? 'Her consort' : 'Her', 190, 4 + i * (5 * row + 18)));
  const h = Math.max(6 * row, st.foes.length * (5 * row + 18)) + 22;
  return `<svg class="bars" viewBox="0 0 360 ${h}" role="img" aria-label="${esc([mine.label, ...foes.map(f => f.label)].join(' '))}"><rect x="0" y="0" width="360" height="${h}" fill="#050a11"/>${mine.svg}${foes.map(f => f.svg).join('')}</svg>`;
}

// The panel for this turn, with the orders as they stand: her move and the captain's above the board, the bars, the last lines of the log, an order for each
// ready gun, the torpedo and the turret where they are fitted, and Fire.
function shipFightEvent(s, orders, over = false) {  // over: the close, with no move to show
  const st = G.state, f = s.state, cap = raidCap(), ready = gunsReady(f);
  const say = (m, i) => fightSay(`foe.${m.kind}`, { ship: fightFoeName(s, i), ...(m.target ? { part: fightSay(`part.${m.target}`), lo: m.dmg[0], hi: m.dmg[1] } : {}) });
  const read = over ? '' : [...f.foes.map((foe, i) => (fightUp(foe) ? say(s.shown.foe[i], i) : '')).filter(Boolean), fightSay(`cap.${s.shown.captain.kind}`, { cap: cap ? `Captain ${cap.last}` : helmName() })].join(' ');
  const aim = o => (o ? fightSay('aim.at', { part: fightSay(`part.${o.part}`) }) : fightSay('aim.hold'));
  const turn = o => { const part = FIGHT_AIM[(FIGHT_AIM.indexOf(o ? o.part : null) + 1) % FIGHT_AIM.length]; return part ? { foe: 0, part } : null; };  // the next target round
  const redo = change => () => shipFightEvent(s, { ...orders, ...change });
  const choices = orders.guns.slice(0, ready).map((g, i) => ({ label: fightSay('gun.label', { n: i + 1, aim: aim(g) }), keep: true, run: redo({ guns: orders.guns.map((x, j) => (j === i ? turn(x) : x)) }) }));
  if (f.me.launcher && f.me.torps > 0) choices.push({ label: fightSay('torp.label', { left: f.me.torps, aim: aim(orders.torp) }), keep: true, run: redo({ torp: turn(orders.torp) }) });
  if (f.me.pdc) choices.push({ label: fightSay(orders.pdc === 'hold' ? 'pdc.hold' : 'pdc.fire'), keep: true, run: redo({ pdc: orders.pdc === 'hold' ? 'fire' : 'hold' }) });
  const shots = Math.min(orders.guns.slice(0, ready).filter(Boolean).length, Math.max(0, ready - (f.me.pdc && orders.pdc === 'hold' ? 1 : 0))), heat = f.heat + shots;  // as the engine counts them
  choices.push({ label: fightSay(heat > FIGHT.HEAT_CAP ? 'fire.hot' : 'fire.label', { heat, cap: FIGHT.HEAT_CAP }), keep: true, run: () => fireTurn(s, orders) });
  const board = raidBoard({ beat: f.turn, edge: 0, style: s.style, me: SHIPS[st.shipId], foe: SHIPS[s.foe.shipId], range: FIGHT_KM[RANGE_BANDS[f.band]] });
  const prev = s.board || null; s.board = board;  // last turn's picture, for sensors that show her late (board.js)
  return {
    title: fightSay('title'), personal: true, via: 'crew', owner: 'you', fight: s,  // yours to decide, not the captain's (hired.js hiredCall)
    read,  // drawn above the board (ui.js)
    board: boardSvg(board, { style: s.style, beat: f.turn, sensors: condition().sensors, sunAngle: sunLight().angle, prev, pack: s.pack, word: RANGE_BANDS[f.band] }) + fightBars(f),
    text: f.log.slice(-3).join('</p><p>'),
    choices,
  };
}

// Fire: the turn is resolved with the moves that were shown, what it cost is counted, and the panel is drawn again; at an end the panel gives way
// to the scene the end leads to (G.nextEvent), and this returns nothing.
function fireTurn(s, orders) {
  const at = o => { if (!o) return null; const i = s.state.foes.findIndex(f => f.armor > 0 && (o.part === 'hull' || f.parts[o.part].hp > 0)); return { foe: Math.max(0, i), part: o.part }; };  // the first of them whose part is still there
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

// Being boarded: the lock fight (boarders.js), a raider's whole run or a short one.
const fightBoarded = s => repelScene(repelStart({ foe: s.foe, foeHp: 0, init: 'foe', grade: s.grade, pack: s.pack }, s.style === 'grapple' ? 'full' : 'half'));

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
    if (cap) like(cap, 1, fightSay('memory.stood'));
    if (s.spec.kind !== 'patrol') changeRep('Pirate', -3);
    gainSkill(post, 3);
    close(`${fightSay(`end.broke.${s.style}`)} ${cap ? `Captain ${cap.last} writes` : 'You write'} it in the log and nothing else. (+3 experience at the ${POSTS[post].name.toLowerCase()} post.)`);
    return;
  }
  if (end === 'standoff') {
    const pts = Math.round(ship().armor * 0.05);
    st.armor = Math.max(1, st.armor - pts);
    close(`${fightSay(s.state.band <= RANGE_BANDS.indexOf('close') ? 'end.standoffNear' : 'end.standoff')} Armor -${pts}.`);
    return;
  }
  close(fightSay(`end.escaped.${s.style}`));
}
