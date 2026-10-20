'use strict';

// The fights, over many seeded trials: the ship fight (js/fight.js, js/fightui.js), and the deck fight both ways, repelling boarders and boarding her (js/boarders.js).
// The tuning tool for COMBAT.md's numbers (FIGHT and DECK in js/fight.js, CASUALTY_ODDS in js/losses.js, REPEL_HURT in js/boarders.js).
// Each trial answers the scenes from a stated policy, then the game state is put back.
//   node tools/fights.js --seeds 1,2,3 --n 100 [--post gunner] [--ship raider] [--owner]
// `--owner` plays them as an owner who kept the post (the same ship and crew, bought with a hand's savings), to put beside the hand's (#721).
//   npm run fights
// Report: for the ship fight, the spread of its ends, its rounds, the hull lost, the hurt and the dead; for each deck fight, how often you win and who is hurt, by crew, by the
// post's skill level, by the hand's policy and by the foe's grade. Not part of `npm test`.

const { open, closeBrowser } = require('../tests/helpers');

// One seed's trials. Returns raw tallies, so the seeds can be summed.
async function fights({ seed = 1, n = 100, post = 'gunner', ship = 'raider', owner = false, lock = true } = {}) {  // lock: false leaves out the deck fights started directly, for a test of the ship fight alone
  const { ev, errors, ctx } = await open({ scope: 'earth-hired', seed, debt: true, stall: 0 });
  const r = await ev(([trials, postKey, shipId, asOwner, lockFights]) => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: postKey, captainKey: 'hester' }); while (G.dialog) finishEvent();
    const st0 = G.state; st0.story.next = 1e9; st0.day += 30; hired().raidTold = true;  // the first raid is explained once; these are the raids after it
    if (asOwner) { const crew0 = [...st0.crew]; st0.credits = 100000; hired().debt = 0; buyIn(st0.shipId); while (G.dialog) finishEvent(); st0.crew = crew0; st0.armor = ship().armor; if (hired()) throw new Error('the buy did not make an owner'); }  // the same ship and crew: the buy took a friend, and the rest stay
    uatBurn('Ceres Station', 'pallas'); G.transit.times = []; G.transit.event = null; G.dialog = null;
    const snap = JSON.stringify(G.state), crewAll = [...G.state.crew], maxArmor = ship().armor;
    const restore = (crewN, level) => {
      G.state = JSON.parse(snap); G.dialog = null; G.nextEvent = null; G.duel = null;
      const st = G.state, h = career();
      if (crewN !== null) st.crew = crewAll.slice(0, crewN);
      if (level !== null) h.skill[postKey] = SKILL_STEPS[level];
      return st;
    };
    const foeOf = () => Object.assign(makeEnemy({ kind: 'pirate' }), { shipId });
    // The deck fight's policies: the hand's plan each turn ({ stand, act, order }, fightui.js deckFightEvent). 'random' draws each part of it from what the panel offers;
    // the others go where the fight is (the section where both sides will stand after their shown move, the fullest of them, else where they are going, else the
    // nearest of them), a section a turn, and there 'shoot' fires the sidearm, 'cover' makes the cover while it can and then shoots, and 'order' shoots and sends the first crewmate on offer every turn.
    const rnd = list => list[Math.floor(Math.random() * list.length)];
    const near = f => [f.hand, ...ADJ[f.hand].filter(i => f.sections[i])];
    const goal = s => {
      const f = s.state, S = f.sections.map(x => ({ ...x })), m = s.shown;
      if (m.kind !== 'hold') { S[m.from].theirs -= m.n; S[m.to].theirs += m.n; }
      const both = S.map((_, i) => i).filter(i => S[i].theirs && S[i].mine).sort((a, b) => S[b].theirs - S[a].theirs);
      const theirs = S.map((_, i) => i).filter(i => S[i].theirs).sort((a, b) => Math.abs(REACH[a] - REACH[f.hand]) - Math.abs(REACH[b] - REACH[f.hand]));
      const t = both.length ? both[0] : m.kind !== 'hold' ? m.to : theirs.length ? theirs[0] : f.hand;  // with nobody trading, to the nearest of them, to shoot
      return near(f).sort((a, b) => Math.abs(REACH[a] - REACH[t]) - Math.abs(REACH[b] - REACH[t]) || (b === t) - (a === t))[0];
    };
    const orderOf = s => { const o = repelOrders(s, s.state.used.cover); return o.length ? o[0].id : null; };
    const POLICY = {
      random: s => ({ stand: rnd(near(s.state)), act: rnd(['shoot', 'steady', ...(s.state.used.cover ? [] : ['cover'])]), order: rnd([null, ...repelOrders(s, s.state.used.cover).map(o => o.id)]) }),
      shoot: s => ({ stand: goal(s), act: 'shoot', order: null }),
      cover: s => ({ stand: goal(s), act: s.state.used.cover ? 'shoot' : 'cover', order: null }),
      order: s => ({ stand: goal(s), act: 'shoot', order: orderOf(s) }),
    };
    // Plays what is open to its end: a deck panel by the policy, a crippled raider always boarded, and anything else (a close's Stand down) by its first choice.
    // Every text shown is kept in window.__texts, for the ends that are read from the words.
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
    };
    const lost = st => ({ hurt: Object.keys(st.injured || {}).length, dead: (st.fallen || []).length, marked: (st.castMarked || []).length, hand: career().hurtUntil > st.day ? 1 : 0 });
    const out = { raid: {}, repel: {}, assault: {} };

    // The ship fight, from the contact to its end and the deck fight that may follow it. The guns' policy picks each gun's target every turn: 'random' any
    // part, 'focus' always her weapons, 'drive' her drive until it is gone and then her weapons, 'lock' her lock and then her weapons. A deck fight after it is played by the 'shoot' policy.
    const PARTS = ['weapons', 'drive', 'lock', 'hull'];
    const AIM = {
      random: () => PARTS[Math.floor(Math.random() * PARTS.length)],
      focus: () => 'weapons',
      drive: f => (f.foes.some(x => x.parts.drive.hp > 0) ? 'drive' : 'weapons'),
      lock: f => (f.foes.some(x => x.parts.lock.hp > 0) ? 'lock' : 'weapons'),
    };
    for (const policy of Object.keys(AIM)) {
      const t = out.raid[policy] = { n: 0, crippled: 0, broke: 0, standoff: 0, boarded: 0, lost: 0, escaped: 0, died: 0, boardedWon: 0, assaultWon: 0, rounds: 0, hull: 0, hurt: 0, dead: 0, hand: 0, anyHurt: 0 };
      for (let i = 0; i < trials; i++) {
        const st = restore(null, null), armor0 = st.armor;
        startDuel({ kind: 'pirate' }, false);
        let ev = G.nextEvent, end = null; const s = ev && ev.fight; G.nextEvent = null;
        if (!s) G.nextEvent = ev;  // the free volley hurt the hand past saving: the ending is the next scene
        while (s && ev && !s.handDied) {
          const f = s.state, orders = { guns: Array.from({ length: f.me.guns }, () => ({ foe: 0, part: AIM[policy](f) })), torp: f.me.launcher && f.me.torps > 0 ? { foe: 0, part: 'hull' } : null, pdc: 'fire' };
          ev = fireTurn(s, orders);
          end = shipEnd(s.state);
        }
        const next = G.nextEvent; G.nextEvent = null; window.__texts = '';
        if (next) { openEvent(next); drive('shoot'); }  // the close, dead in space, or the deck fight
        const c = lost(G.state);
        t.n++; if (end) t[end]++; else t.died++;  // no end: the hand was killed in it
        t.rounds += s ? s.state.turn : 0;
        if (end === 'crippled' && /strongbox/.test(window.__texts)) t.assaultWon++;
        if (end === 'boarded' && /last of them go back/.test(window.__texts)) t.boardedWon++;
        t.hull += (armor0 - G.state.armor) / maxArmor; t.hurt += c.hurt; t.dead += c.dead; t.hand += c.hand; if (c.hurt || c.dead || c.hand) t.anyHurt++;
      }
    }

    // The deck fights, started directly: kind 'repel' (they board you) or 'assault' (you board her).
    const lock = (kind, crewN, level, policy, grade) => {
      const t = { n: 0, won: 0, rounds: 0, hurt: 0, dead: 0, marked: 0, hand: 0, anyHurt: 0 };
      for (let i = 0; i < trials; i++) {
        restore(crewN, level); const foe = foeOf();
        const s = kind === 'repel' ? repelStart({ foe, foeHp: 0, init: 'foe', grade }, 'full') : assaultStart(foe, { grade });
        window.__texts = '';
        openEvent(deckFightEvent(s));
        drive(policy);
        t.n++; if (s.won) t.won++; t.rounds += s.state.turn; t.hurt += s.hurt.size; t.dead += s.dead.length; t.marked += s.marked.length; t.hand += s.youHurt ? 1 : 0;
        if (s.hurt.size || s.dead.length || s.marked.length || s.youHurt) t.anyHurt++;
      }
      return t;
    };
    const cells = [
      ['crew', [1, 3, 5].map(c => [c, 2, 'random', 0])],
      ['level', [1, 2, 3].map(l => [5, l, 'shoot', 0])],
      ['policy', ['random', 'shoot', 'cover', 'order'].map(p => [5, 2, p, 0])],
      ['small crew', ['random', 'shoot', 'cover', 'order'].map(p => [2, 2, p, 0])],
      ['grade', [0, 1, 2].map(g => [5, 2, 'random', g])],
    ];
    if (lockFights) for (const kind of ['repel', 'assault']) {
      for (const [group, list] of cells) {
        for (const [crewN, level, policy, grade] of list) out[kind][`${group}|crew ${crewN} level ${level} ${policy} grade ${grade}`] = lock(kind, crewN, level, policy, grade);
      }
    }
    out.crewAboard = crewAll.length;
    return out;
  }, [n, post, ship, owner, lock]);
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
    console.log(`  ${policy.padEnd(7)} n ${String(t.n).padStart(4)}  crippled ${pct(t.crippled, t.n)} (boarded her ${pct(t.assaultWon, t.crippled)})  broke off ${pct(t.broke, t.n)}  standoff ${pct(t.standoff, t.n)}  boarded ${pct(t.boarded, t.n)} (held ${pct(t.boardedWon, t.boarded)})  hull gone ${pct(t.lost, t.n)}  escaped ${pct(t.escaped, t.n)}  you killed ${pct(t.died, t.n)}  rounds ${per(t.rounds, t.n)}  hull -${Math.round((100 * t.hull) / t.n)}%  someone hurt ${pct(t.anyHurt, t.n)}  dead ${per(t.dead, t.n)}  you hurt ${pct(t.hand, t.n)}`);
  }
  for (const kind of ['repel', 'assault']) {
    console.log(`${kind === 'repel' ? 'Repel fight (they board you)' : 'Assault fight (you board her)'}`);
    for (const [name, t] of Object.entries(sum(runs, kind))) {
      console.log(`  ${name.split('|')[1].padEnd(34)} n ${String(t.n).padStart(4)}  won ${pct(t.won, t.n)}  rounds ${per(t.rounds, t.n)}  hurt ${per(t.hurt, t.n)}  dead ${per(t.dead, t.n)}  marked ${per(t.marked, t.n)}  you hurt ${pct(t.hand, t.n)}  anyone ${pct(t.anyHurt, t.n)}`);
    }
  }
}

module.exports = { fights, report };

if (require.main === module) {
  const arg = n => { const i = process.argv.indexOf('--' + n); return i > 0 ? process.argv[i + 1] : null; };
  const seeds = (arg('seeds') || '1,2,3').split(',').map(Number), n = Number(arg('n') || 100), post = arg('post') || 'gunner', ship = arg('ship') || 'raider', owner = process.argv.includes('--owner');
  (async () => {
    const runs = [];
    for (const seed of seeds) {
      const r = await fights({ seed, n, post, ship, owner });
      if (r.errors.length) console.log(`seed ${seed}: ${r.errors.length} page errors, first: ${r.errors[0]}`);
      runs.push(r);
    }
    report(runs);
    await closeBrowser();
  })();
}
