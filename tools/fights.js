'use strict';

// The fights, over many seeded trials: the ship fight (js/fight.js, js/fightui.js), and the deck fight both ways, repelling boarders and boarding her (js/boarders.js).
// The tuning tool for COMBAT.md's numbers (FIGHT and DECK in js/fight.js, CASUALTY_ODDS in js/losses.js, REPEL_HURT in js/boarders.js).
// Each trial answers the scenes from a stated policy, then the game state is put back.
//   node tools/fights.js --seeds 1,2,3 --n 100 [--post gunner] [--ship raider] [--owner] [--ship-only | --deck-only] [--groups party,grade] [--moves [vent,lead,split]]
// `--owner` plays them as an owner who kept the post (the same ship and crew, bought with a hand's savings), to put beside the hand's (#721).
// `--moves` gives the hand all three gunner moves (vent, lead, split) for the ship fights, or the ones listed after it; without it she knows none, and the numbers are the ones before the moves.
// `--deck-only` leaves the ship fights out, so the deck fights are played on the same draws as the deck test (tests/fights.test.js).
// With them come two more gun policies that use the moves without reading her move for it (randmove, eager: below).
//   npm run fights
// Report: for the ship fight, the spread of its ends, its rounds, the hull lost, the hurt and the dead, by gun policy and by the type she is; for each deck fight, how often you win and who is hurt, by crew, by the
// post's skill level, by the party that comes aboard (her type), by the hand's policy and by the foe's grade. Not part of `npm test`.

const { open, closeBrowser } = require('../tests/helpers');
const { answerOrders, answerDeck } = require('./answer');
const { load } = require('../tests/nodecontext');

// One seed's trials. Returns raw tallies, so the seeds can be summed.
async function fights({ seed = 1, n = 100, post = 'gunner', ship = 'raider', owner = false, raid = true, lock = true, cutter = true, groups = null, moves = false } = {}) {  // raid: false leaves out the ship fights; lock: false the deck fights started directly; cutter: false the navy stop's trials; groups: only these groups of deck fights
  const { ev, errors, ctx } = await open({ scope: 'earth-hired', seed, debt: true, stall: 0 });
  const r = await ev(([trials, postKey, shipId, asOwner, raidFights, lockFights, cutter, groups, answerSrc, withMoves, deckSrc, runSeed]) => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: postKey, captainKey: 'hester' }); while (G.dialog) finishEvent();
    const st0 = G.state; st0.story.next = 1e9; st0.day += 30; hired().raidTold = true;  // the first raid is explained once; these are the raids after it
    if (asOwner) { const crew0 = [...st0.crew], fit = { ...st0.outfits }, torps = st0.torpedoes; hired().debt = 0; st0.credits = buyInPrice(st0.shipId); buyIn(st0.shipId); while (G.dialog) finishEvent(); st0.crew = crew0; st0.outfits = fit; st0.torpedoes = torps; st0.armor = ship().armor; if (hired()) throw new Error('the buy did not make an owner'); }  // the same ship, fitting and crew: the buy took a friend and cleared the captain's outfits (buyIn), and the rest are put back
    uatBurn('Ceres Station', 'pallas'); G.transit.times = []; G.transit.event = null; G.dialog = null;
    const snap = JSON.stringify(G.state), crewAll = [...G.state.crew], maxArmor = ship().armor;
    const restore = (crewN, level) => {
      G.state = JSON.parse(snap); G.dialog = null; G.nextEvent = null; G.duel = null;
      const st = G.state, h = career();
      if (withMoves) h.moves = withMoves === true ? ['vent', 'lead', 'split'] : [...withMoves];
      if (crewN !== null) st.crew = crewAll.slice(0, crewN);
      if (level !== null) h.skill[postKey] = SKILL_STEPS[level];
      return st;
    };
    const foeOf = (party = 'raider') => Object.assign(makeEnemy({ kind: 'pirate' }), { shipId: { raider: shipId, corsair: 'corsair', navy: 'cutter' }[party] });  // the party comes from her type (fight.js DECK_PARTY)
    // The deck fight's policies: the hand's plan each turn ({ stand, act, order, at }, fightui.js deckFightEvent). 'random' draws each part of it from what the panel offers;
    // the others go where the fight is (tools/answer.js answerDeck, not reading the rush or the charge), a section a turn, and there 'shoot' fires the sidearm where it stands, 'cover' makes
    // the cover while it can and then shoots, and 'order' shoots and sends the first crewmate on offer every turn. 'answer' reads their shown move: it meets a
    // rush, or hatches it when the hand is too far, pulls back from a charge or picks off its setter, aims the shot at the most of theirs wounded in reach, and boarding her
    // makes the cover first (answerDeck). 'answerNoCharge' is the answer without its charge rule.
    const rnd = list => list[Math.floor(Math.random() * list.length)];
    const near = f => [f.hand, ...ADJ[f.hand].filter(i => f.sections[i])];
    const deckAnswer = (0, eval)(`(${deckSrc})`);  // tools/answer.js
    const goal = s => deckAnswer(s, false).stand;
    const POLICY = {
      random: s => { const f = s.state, stand = rnd(near(f)); return { stand, act: rnd(['shoot', 'steady', ...(f.used.cover ? [] : ['cover']), ...(stand !== f.hand || (f.assault ? BACK : FORWARD)[stand] === stand ? [] : ['pullback'])]), shootAt: rnd([stand, ...(f.level >= DECK.SIDEARM_REACH_LEVEL ? ADJ[stand].filter(i => f.sections[i]) : [])]), order: rnd([null, ...repelOrders(s, f.used.cover).map(o => o.id)]) }; },
      shoot: s => ({ stand: goal(s), act: 'shoot', shootAt: goal(s), order: null }),
      cover: s => ({ stand: goal(s), act: s.state.used.cover ? 'shoot' : 'cover', shootAt: goal(s), order: null }),
      order: s => deckAnswer(s, false),
      answer: s => deckAnswer(s),
      answerNoCharge: s => deckAnswer(s, true, false),
    };
    // Plays what is open to its end: a deck panel by the policy, a crippled raider always boarded, and anything else (a close's Stand down) by its first choice.
    // Every text shown is kept in window.__texts, for the ends that are read from the words. Returns true when it stopped at its own step cap with a fight still open.
    const drive = policy => {
      let k = 0;
      while (G.dialog && k++ < 60) {
        const ev = G.dialog.event; window.__texts += ` ${ev.text}`;
        if (/^(Without a Captain|The Last Run)$/.test(ev.title)) break;  // the endings start a new game: the trial is over
        const s = ev.fight, deck = s && s.state.kind === 'deck' && ev.choices.some(c => c.label === fightSay('deck.fight'));
        const keep = deck || G.dialog.choices[0].keep;
        const next = deck ? (e => e.choices[e.choices.length - 1].run())(deckFightEvent(s, POLICY[policy](s))) : chooseEvent(0);
        window.__texts += ` ${next && typeof next === 'string' ? next : ''}`;
        if (keep && next) openEvent(next); else finishEvent();  // a kept choice (the panels) redraws in place
      }
      return k > 60 && !!G.dialog;
    };
    const dead0 = (JSON.parse(snap).memorial || []).length;  // the dead are the memorial's new names: the crew from the dock (st.fallen) and the main characters alike (losses.js loseCrew)
    const lost = st => ({ hurt: Object.keys(st.injured || {}).length, dead: (st.memorial || []).length - dead0, marked: (st.castMarked || []).length, hand: career().hurtUntil > st.day ? 1 : 0 });
    const out = { raid: {}, match: {}, repel: {}, assault: {} };

    // The ship fight, from the contact to its end and the deck fight that may follow it. The guns' policy gives the turn's orders: 'random' aims each gun at any
    // part, 'focus' always at her weapons, 'drive' at her drive until it is gone and then her weapons, 'lock' at her lock and then her weapons, 'hull' every gun at
    // her hull, and 'hullhold' the same with the turret held back on a turn she fires a salvo; these six fire the turret (hullhold but on her salvo) and send a
    // torpedo at her hull while there are any. 'answer' reads her shown move (s.shown): it holds the turret back when she fires a salvo, aims at her lock while she
    // pins or closes with it whole, and against a ship whose shields come back (regen) sends the torpedoes at her hull and overcharges every gun the heat allows;
    // else it aims at her hull (tools/answer.js). A deck fight after it is played by the 'shoot' policy. Every fixed aim is at the first ship (foe 0); fireTurn
    // sends an order on to the next ship that still has the part.
    const PARTS = ['weapons', 'drive', 'lock', 'hull'];
    const salvo = s => s.state.foes.some((f, i) => fightUp(f) && s.shown && s.shown.foe[i] && s.shown.foe[i].kind === 'salvo');
    const fixed = (aim, hold = false) => s => ({ guns: Array.from({ length: s.state.me.guns }, () => ({ foe: 0, part: aim(s.state) })), torp: s.state.me.launcher && s.state.me.torps > 0 ? { foe: 0, part: 'hull' } : null, pdc: hold && salvo(s) ? 'hold' : 'fire' });
    const answer = (0, eval)(`(${answerSrc})`);  // tools/answer.js, shared with the play-through's player
    const POLICY_SHIP = {
      random: fixed(() => PARTS[Math.floor(Math.random() * PARTS.length)]),
      focus: fixed(() => 'weapons'),
      drive: fixed(f => (f.foes.some(x => x.parts.drive.hp > 0) ? 'drive' : 'weapons')),
      lock: fixed(f => (f.foes.some(x => x.parts.lock.hp > 0) ? 'lock' : 'weapons')),
      hull: fixed(() => 'hull'),
      hullhold: fixed(() => 'hull', true),
      answer,
    };
    // With the moves (--moves), two policies that use them without reading her move for it, to show a move is a choice and not a free win: 'randmove' is
    // 'random' with a random usable move each turn (lead on a random gun it applies to), and 'eager' aims at her lock and then her weapons (shots lead can
    // help), holds the turret on her salvo (hullhold's rule, for split), and orders the first usable move, vent, lead or split, at its first chance.
    const usable = (s, o) => ['vent', 'lead', 'split'].flatMap(id => (id === 'lead' ? o.guns.map((_, gun) => ({ move: id, gun })) : [{ move: id }]).filter(m => canUse(s.state, { ...o, ...m }, id, s.known || [])));
    const withMove = (base, take) => s => { const o = base(s), ms = usable(s, o); return ms.length ? { ...o, ...take(ms) } : o; };
    if (withMoves) Object.assign(POLICY_SHIP, {
      randmove: withMove(POLICY_SHIP.random, ms => ms[Math.floor(Math.random() * ms.length)]),
      eager: withMove(s => ({ ...fixed(f => (f.foes.some(x => x.parts.lock.hp > 0) ? 'lock' : 'weapons'))(s), pdc: salvo(s) ? 'hold' : 'fire' }), ms => ms[0]),
    });
    // One ship fight against `spec`, to its end and whatever scene follows it. Returns its end (null: the hand was killed in it), the fight, what it cost, and whether
    // the scene after it was left open at the step cap (capped).
    const shipTrial = (policy, spec) => {
      const st = restore(null, null), armor0 = st.armor;
      startDuel(spec, false);
      let ev = G.nextEvent, end = null; const s = ev && ev.fight; G.nextEvent = null;
      if (!s) G.nextEvent = ev;  // the free volley hurt the hand past saving: the ending is the next scene
      while (s && ev && !s.handDied) {
        ev = fireTurn(s, POLICY_SHIP[policy](s));
        end = shipEnd(s.state);
      }
      const next = G.nextEvent; G.nextEvent = null; window.__texts = '';
      const capped = next ? (openEvent(next), drive('shoot')) : false;  // the close, dead in space, or the deck fight
      return { end, s, hull: (armor0 - G.state.armor) / maxArmor, c: lost(G.state), capped };
    };
    // By matchup: a lone ship by its hull, or a pair of raiders. The cutter is a navy stop's (a pirate never flies one), played as its own trials. Each end is counted
    // by its name (a lost fight is 'ran' or 'lost'), with the hull lost, the turns and whether it reached the turn cap.
    const tally = (policy, who, { end, s, hull }) => {
      const m = out.match[`${policy}|${who}`] = out.match[`${policy}|${who}`] || { n: 0, good: 0, lostFight: 0, died: 0, hull: 0, rounds: 0, atCap: 0 };
      m.n++; m.hull += hull; m.rounds += s ? s.state.turn : 0; if (s && s.state.turn >= FIGHT.TURNS && shipEnd({ ...s.state, turn: 0 }) === null) m.atCap++;  // atCap: the end came from the turn cap (shipEnd would not end it earlier), not a cripple or break on turn 8
      if (/^(crippled|broke|escaped)$/.test(end)) m.good++; if (/^(ran|lost)$/.test(end)) m.lostFight++; if (end) m[end] = (m[end] || 0) + 1; else m.died++;
    };
    if (raidFights) for (const policy of Object.keys(POLICY_SHIP)) {
      const t = out.raid[policy] = { n: 0, crippled: 0, broke: 0, ran: 0, away: 0, boarded: 0, lost: 0, escaped: 0, died: 0, boardedWon: 0, assaultWon: 0, rounds: 0, hull: 0, hurt: 0, dead: 0, hand: 0, anyHurt: 0, capped: 0 };
      for (let i = 0; i < trials; i++) {
        const trial = shipTrial(policy, { kind: 'pirate' }), { end, s, hull, c, capped } = trial;
        if (capped) t.capped++;  // the deck fight after it never ended
        t.n++; if (end) t[end]++; else t.died++;  // no end: the hand was killed in it
        t.rounds += s ? s.state.turn : 0;
        if (end === 'crippled' && /strongbox/.test(window.__texts)) t.assaultWon++;
        if (end === 'boarded' && /last of them go back/.test(window.__texts)) t.boardedWon++;
        t.hull += hull; t.hurt += c.hurt; t.dead += c.dead; t.hand += c.hand; if (c.hurt || c.dead || c.hand) t.anyHurt++;
        tally(policy, s ? (s.pack ? 'raider pair' : s.foe.shipId) : 'none', trial);
      }
      if (cutter) for (let i = 0; i < trials / 2; i++) tally(policy, 'cutter', shipTrial(policy, { kind: 'patrol', gov: 'Arcology Compact', shipId: 'cutter' }));
    }

    // The deck fights, started directly: kind 'repel' (they board you) or 'assault' (you board her), against the party from her type.
    const lock = (kind, party, crewN, level, policy, grade) => {
      const t = { n: 0, won: 0, rounds: 0, hurt: 0, dead: 0, marked: 0, hand: 0, anyHurt: 0, died: 0, capped: 0 };
      for (let i = 0; i < trials; i++) {
        restore(crewN, level); const foe = foeOf(party);
        const s = kind === 'repel' ? repelStart({ foe, foeHp: 0, init: 'foe', grade }, party === 'corsair' ? 'half' : 'full') : assaultStart(foe, { grade });  // as the game boards you (fightui.js fightBoarded): a raider grapples, a full run; a corsair fights with torpedoes, a half one
        window.__texts = '';
        openEvent(deckFightEvent(s));
        if (drive(policy)) t.capped++;  // a fight the tool gave up on: it never ended
        t.n++; if (s.won) t.won++; if (s.handDied) t.died++; t.rounds += s.state.turn; t.hurt += s.hurt.size; t.dead += s.dead.length; t.marked += s.marked.length; t.hand += s.youHurt ? 1 : 0;
        if (s.hurt.size || s.dead.length || s.marked.length || s.youHurt) t.anyHurt++;
      }
      return t;
    };
    const cells = [
      ['crew', [1, 3, 5].map(c => ['raider', c, 2, 'random', 0])],
      ['party', ['raider', 'corsair'].flatMap(party => ['random', 'shoot', 'cover', 'order', 'answer'].flatMap(p => [2, 5].map(c => [party, c, 2, p, 0])))],
      ['level', [0, 1, 2, 3].map(l => ['raider', 2, l, 'answer', 0])],
      ['grade', [0, 1, 2].map(g => ['raider', 5, 2, 'random', g])],
      ['charge', [['corsair', 2, 2, 'answerNoCharge', 0]], 'assault'],  // boarding her only
      ['setpiece', ['answer', 'random'].flatMap(p => [2, 5].map(c => ['corsair', c, 2, p, 2]))],  // a grade 2 corsair, the chapter's setpiece (fightladder.js): reported, not checked
    ];
    // Each cell draws on its own stream, seeded from the run's seed and the cell's name (FNV-1a), so a change to one cell cannot move another's numbers;
    // the page's own generator (tests/helpers.js __seed) is put back after it.
    const ownStream = (name, play) => {
      let h = 0x811c9dc5 ^ runSeed;
      for (const c of name) h = Math.imul(h ^ c.charCodeAt(0), 0x01000193);
      const was = Math.random; __seed(h >>> 0);
      try { return play(); } finally { Math.random = was; }
    };
    // They are played without drawing the panel (UI.showEvent): the drawing rolls nothing, so the tallies are the same, and the tens of thousands of panels in one
    // evaluate grew the page about 0.7 MB a fight until it crashed.
    const show = UI.showEvent;
    if (lockFights) UI.showEvent = () => {};
    if (lockFights) for (const kind of ['repel', 'assault']) {
      for (const [group, list] of cells.filter(([g, , only]) => (!groups || groups.includes(g)) && (!only || only === kind))) {
        for (const [party, crewN, level, policy, grade] of list) {
          const name = `${group}|${party} crew ${crewN} level ${level} ${policy} grade ${grade}`;
          out[kind][name] = ownStream(`${kind}|${name}`, () => lock(kind, party, crewN, level, policy, grade));
        }
      }
    }
    UI.showEvent = show;
    out.crewAboard = crewAll.length;
    return out;
  }, [n, post, ship, owner, raid, lock, cutter, groups, answerOrders.toString(), moves, answerDeck.toString(), seed]);
  await ctx.close();
  return { seed, owner, post, ...r, errors };
}

// Sums the tallies of several seeds.
function sum(runs, key) {
  const acc = {};
  for (const r of runs) for (const [name, t] of Object.entries(r[key])) { acc[name] = acc[name] || {}; for (const [k, v] of Object.entries(t)) acc[name][k] = (acc[name][k] || 0) + v; }
  return acc;
}
const pct = (a, b) => `${String(Math.round((100 * a) / Math.max(1, b))).padStart(3)}%`;
const per = (a, b) => (a / Math.max(1, b)).toFixed(2);

function report(runs) {
  console.log(`Ship fights (${runs.length} seeds, ${runs[0].crewAboard} crew aboard, ${runs[0].owner ? 'an owner at' : 'a hand at'} the ${runs[0].post} post), by where the guns aim`);
  for (const [policy, t] of Object.entries(sum(runs, 'raid'))) {
    console.log(`  ${policy.padEnd(8)} n ${String(t.n).padStart(4)}  crippled ${pct(t.crippled, t.n)} (boarded her ${pct(t.assaultWon, t.crippled)})  broke off ${pct(t.broke, t.n)}  got away ${pct(t.away, t.n)}  captain ran ${pct(t.ran, t.n)}  boarded ${pct(t.boarded, t.n)} (held ${pct(t.boardedWon, t.boarded)})  hull gone ${pct(t.lost, t.n)}  escaped ${pct(t.escaped, t.n)}  you killed ${pct(t.died, t.n)}  rounds ${per(t.rounds, t.n)}  hull -${Math.round((100 * t.hull) / t.n)}%  someone hurt ${pct(t.anyHurt, t.n)}  dead ${per(t.dead, t.n)}  you hurt ${pct(t.hand, t.n)}  capped ${t.capped}`);
  }
  // By the type she is: each policy's good ends, lost fights, hull lost and turns, and the spread of the ends; then each policy over every type.
  const match = sum(runs, 'match'), TYPES = ['raider', 'corsair', 'cutter', 'raider pair'], ENDS = ['crippled', 'broke', 'escaped', 'away', 'boarded', 'ran', 'lost'];
  const row = (label, t) => `    ${label.padEnd(8)} n ${String(t.n).padStart(4)}  good ${pct(t.good, t.n)}  lost ${pct(t.lostFight, t.n)}  hull -${((100 * t.hull) / Math.max(1, t.n)).toFixed(1).padStart(4)}%  turns ${per(t.rounds, t.n)}  at cap ${pct(t.atCap || 0, t.n)}  ${ENDS.map(e => `${e} ${pct(t[e] || 0, t.n)}`).join(' ')}  you killed ${pct(t.died, t.n)}`;
  const policies = [...new Set(Object.keys(match).map(k => k.split('|')[0]))];
  for (const type of TYPES.filter(x => policies.some(p => match[`${p}|${x}`]))) {
    console.log(`  against ${type === 'raider pair' ? 'a raider pair' : `a ${type}`}`);
    for (const p of policies) if (match[`${p}|${type}`]) console.log(row(p, match[`${p}|${type}`]));
  }
  console.log('  over every type');
  for (const p of policies) {
    const all = {}; for (const [k, t] of Object.entries(match)) if (k.split('|')[0] === p) for (const [f, v] of Object.entries(t)) all[f] = (all[f] || 0) + v;
    console.log(row(p, all));
  }
  for (const kind of ['repel', 'assault']) {
    console.log(`${kind === 'repel' ? 'Repel fight (they board you)' : 'Assault fight (you board her)'}`);
    for (const [name, t] of Object.entries(sum(runs, kind))) {
      console.log(`  ${name.split('|')[1].padEnd(42)} n ${String(t.n).padStart(4)}  won ${pct(t.won, t.n)}  rounds ${per(t.rounds, t.n)}  hurt ${per(t.hurt, t.n)}  dead ${per(t.dead, t.n)}  marked ${per(t.marked, t.n)}  you hurt ${pct(t.hand, t.n)}  you killed ${pct(t.died, t.n)}  anyone ${pct(t.anyHurt, t.n)}  capped ${t.capped}`);
    }
  }
}

module.exports = { fights, report };

if (require.main === module) {
  const arg = n => { const i = process.argv.indexOf('--' + n); return i > 0 ? process.argv[i + 1] : null; };
  const seeds = (arg('seeds') || '1,2,3').split(',').map(Number), n = Number(arg('n') || 100), post = arg('post') || 'gunner', ship = arg('ship') || 'raider', owner = process.argv.includes('--owner');
  const asked = arg('moves');
  if (process.argv.includes('--moves') && /^[a-z,]+$/.test(asked || '')) {
    const { FIGHT_MOVES } = load(['js/data.js', 'js/range.js', 'js/sheet.js', 'js/handtohand.js', 'js/boarders.js', 'js/shipcombat.js', 'js/fight.js'], { Mods: { register() {} } }, ['FIGHT_MOVES']), bad = asked.split(',').filter(id => !FIGHT_MOVES[id]);
    if (bad.length) { console.error(`--moves: unknown move ${bad.join(', ')} (known: ${Object.keys(FIGHT_MOVES).join(', ')})`); process.exit(1); }
  }
  (async () => {
    const runs = [];
    for (const seed of seeds) {
      const r = await fights({ seed, n, post, ship, owner, lock: !process.argv.includes('--ship-only'), raid: !process.argv.includes('--deck-only'), groups: arg('groups') ? arg('groups').split(',') : null, moves: !process.argv.includes('--moves') ? false : /^[a-z,]+$/.test(arg('moves') || '') ? arg('moves').split(',') : true });
      if (r.errors.length) console.log(`seed ${seed}: ${r.errors.length} page errors, first: ${r.errors[0]}`);
      runs.push(r);
    }
    report(runs);
    await closeBrowser();
  })();
}
