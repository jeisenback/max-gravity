'use strict';

// The deck fights over many seeded trials, both ways, repelling boarders and boarding her (js/boarders.js, js/fightui.js). The tuning tool for COMBAT.md's
// deck numbers (DECK in js/fight.js, CASUALTY_ODDS in js/losses.js, REPEL_HURT in js/boarders.js). Each trial answers the scenes from a stated policy, then
// the game state is put back. The ship fight is on the radar since #1348, and is played by tools/radarfights.js (--radar, below).
//   node tools/fights.js --seeds 1,2,3 --n 100 [--post gunner] [--ship raider] [--owner] [--groups party,grade]
// `--owner` plays them as an owner who kept the post (the same ship and crew, bought with a hand's savings), to put beside the hand's (#721).
//   node tools/fights.js --radar ...  plays the ship fight on the radar (tools/radarfights.js, #1347), in plain Node; --set KEY=value,... tries a number of RADAR's.
//   npm run fights
// Report: for each deck fight, how often you win and who is hurt, by crew, by the post's skill level, by the party that comes aboard (her type), by the hand's
// policy and by the foe's grade, and for the navy's party the standing a fight cost, the credits it cost (the citation or the search's fine) and how often it
// ended in a search. Not part of `npm test`.

const { open, closeBrowser } = require('../tests/helpers');
const { answerDeck } = require('./answer');

// One seed's trials. Returns raw tallies, so the seeds can be summed.
async function fights({ seed = 1, n = 100, post = 'gunner', ship = 'raider', owner = false, groups = null } = {}) {  // groups: only these groups of deck fights
  const { ev, errors, ctx } = await open({ scope: 'earth-hired', seed, debt: true, stall: 0 });
  const r = await ev(([trials, postKey, shipId, asOwner, groups, deckSrc, runSeed]) => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: postKey, captainKey: 'hester' }); while (G.dialog) finishEvent();
    const st0 = G.state; st0.story.next = 1e9; st0.day += 30; hired().raidTold = true;
    if (asOwner) { const crew0 = [...st0.crew], fit = { ...st0.outfits }, torps = st0.torpedoes; hired().debt = 0; st0.credits = buyInPrice(st0.shipId); buyIn(st0.shipId); while (G.dialog) finishEvent(); st0.crew = crew0; st0.outfits = fit; st0.torpedoes = torps; st0.armor = ship().armor; if (hired()) throw new Error('the buy did not make an owner'); }  // the same ship, fitting and crew: the buy took a friend and cleared the captain's outfits (buyIn), and the rest are put back
    uatBurn('Ceres Station', 'pallas'); G.transit.times = []; G.transit.event = null; G.dialog = null;
    const snap = JSON.stringify(G.state), crewAll = [...G.state.crew];
    const restore = (crewN, level) => {
      G.state = JSON.parse(snap); G.dialog = null; G.nextEvent = null; G.duel = null;
      const st = G.state, h = career();
      if (crewN !== null) st.crew = crewAll.slice(0, crewN);
      if (level !== null) h.skill[postKey] = SKILL_STEPS[level];
      return st;
    };
    const NAVY_GOV = 'Arcology Pact';
    const foeOf = (party = 'raider') => (party === 'navy' ? makeEnemy({ kind: 'patrol', gov: NAVY_GOV, shipId: 'cutter' })  // a patrol's cutter, with her government
      : Object.assign(makeEnemy({ kind: 'pirate' }), { shipId: { raider: shipId, corsair: 'corsair' }[party] }));  // the party comes from her type (fight.js DECK_PARTY)
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
      random: s => { const f = s.state, stand = rnd(near(f)); return { stand, act: rnd(['shoot', 'steady', ...(f.used.cover ? [] : ['cover']), 'holdfire', ...(stand !== f.hand || (f.assault ? BACK : FORWARD)[stand] === stand ? [] : ['pullback'])]), shootAt: rnd([stand, ...(f.level >= DECK.SIDEARM_REACH_LEVEL ? ADJ[stand].filter(i => f.sections[i]) : [])]), order: rnd([null, ...repelOrders(s, f.used.cover).map(o => o.id)]) }; },
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
    const out = { repel: {}, assault: {} };

    // The deck fights, started directly: kind 'repel' (they board you) or 'assault' (you board her), against the party from her type.
    const lock = (kind, party, crewN, level, policy, grade) => {
      const t = { n: 0, won: 0, rounds: 0, hurt: 0, dead: 0, marked: 0, hand: 0, anyHurt: 0, died: 0, capped: 0, standing: 0, searched: 0, fined: 0, quarter: 0 };
      for (let i = 0; i < trials; i++) {
        restore(crewN, level); const foe = foeOf(party), rep0 = repOf(NAVY_GOV), purse0 = purse(), quarter = heaveToFine();
        // A navy party is started as the game starts her boarding: from the patrol's ship fight's 'boarded' end (fightui.js fightBoarded), with that fight's style ('gun': a half run).
        const first = party === 'navy' && kind === 'repel' ? fightBoarded({ foe, grade, pack: false, style: RAID_STYLE[foe.shipId] || 'grapple' }) : null;
        const s = first ? first.fight : kind === 'repel' ? repelStart({ foe, foeHp: 0, init: 'foe', grade }, party === 'corsair' ? 'half' : 'full') : assaultStart(foe, { grade });  // as the game boards you (fightui.js fightBoarded): a raider grapples, a full run; a corsair fights with torpedoes, a half one
        window.__texts = '';
        openEvent(first || deckFightEvent(s));
        if (drive(policy)) t.capped++;  // a fight the tool gave up on: it never ended
        t.n++; if (s.won) t.won++; if (s.handDied) t.died++; t.rounds += s.state.turn; t.hurt += s.hurt.size; t.dead += s.dead.length; t.marked += s.marked.length; t.hand += s.youHurt ? 1 : 0;
        t.standing += rep0 - repOf(NAVY_GOV); if (s.searched) t.searched++;  // the standing a navy fight cost (boarders.js repelSettle), and the searches
        t.fined += purse0 - purse(); t.quarter += quarter;  // the credits it cost (the citation of a withdrawal, or the search's fine), and the heave-to's fine, a quarter of the purse, to set it against
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
      ['navy', ['random', 'shoot', 'cover', 'order', 'answer'].flatMap(p => [2, 5].map(c => ['navy', c, 2, p, 0])), 'repel'],  // a patrol's cutter: the navy comes only on our deck
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
    UI.showEvent = () => {};
    for (const kind of ['repel', 'assault']) {
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
  }, [n, post, ship, owner, groups, answerDeck.toString(), seed]);
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
  console.log(`Deck fights (${runs.length} seeds, ${runs[0].crewAboard} crew aboard, ${runs[0].owner ? 'an owner at' : 'a hand at'} the ${runs[0].post} post)`);
  for (const kind of ['repel', 'assault']) {
    console.log(`${kind === 'repel' ? 'Repel fight (they board you)' : 'Assault fight (you board her)'}`);
    for (const [name, t] of Object.entries(sum(runs, kind))) {
      console.log(`  ${name.split('|')[1].padEnd(42)} n ${String(t.n).padStart(4)}  won ${pct(t.won, t.n)}  rounds ${per(t.rounds, t.n)}  hurt ${per(t.hurt, t.n)}  dead ${per(t.dead, t.n)}  marked ${per(t.marked, t.n)}  you hurt ${pct(t.hand, t.n)}  you killed ${pct(t.died, t.n)}  anyone ${pct(t.anyHurt, t.n)}  capped ${t.capped}${/\|navy /.test(name) ? `  standing -${per(t.standing, t.n)}  searched ${pct(t.searched, t.n)}  fined ${per(t.fined, t.n)} cr of a quarter-purse ${per(t.quarter, t.n)}` : ''}`);
    }
  }
}

module.exports = { fights, report };

if (require.main === module && process.argv.includes('--radar')) {  // the fight on the radar, in plain Node (tools/radarfights.js)
  const { radarFights, radarReport } = require('./radarfights');
  const arg = n => { const i = process.argv.indexOf('--' + n); return i > 0 ? process.argv[i + 1] : null; };
  const seeds = (arg('seeds') || '1,2,3').split(',').map(Number), post = arg('post') || 'gunner';
  const fit = Object.fromEntries((arg('fit') || '').split(',').filter(Boolean).map(k => [k, true]));
  const o = { n: Number(arg('n') || 100), post, level: Number(arg('level') || 2), sensors: Number(arg('sensors') || 1), fit };
  for (const kv of (arg('set') || '').split(',').filter(Boolean)) { const [k, v] = kv.split('='); require('./radarfights').R.RADAR[k] = JSON.parse(v); }  // --set KEY=value,...: try a number of RADAR's for this run
  radarReport(seeds.map(seed => radarFights({ ...o, seed })), o);
} else if (require.main === module) {
  const arg = n => { const i = process.argv.indexOf('--' + n); return i > 0 ? process.argv[i + 1] : null; };
  const seeds = (arg('seeds') || '1,2,3').split(',').map(Number), n = Number(arg('n') || 100), post = arg('post') || 'gunner', ship = arg('ship') || 'raider', owner = process.argv.includes('--owner');
  (async () => {
    const runs = [];
    for (const seed of seeds) {
      const r = await fights({ seed, n, post, ship, owner, groups: arg('groups') ? arg('groups').split(',') : null });
      if (r.errors.length) console.log(`seed ${seed}: ${r.errors.length} page errors, first: ${r.errors[0]}`);
      runs.push(r);
    }
    report(runs);
    await closeBrowser();
  })();
}
