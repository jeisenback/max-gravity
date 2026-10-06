'use strict';

// The fights, over many seeded trials: the raid in beats (js/engagements.js), the repel fight and the assault fight (js/boarders.js).
// The tuning tool for COMBAT.md's numbers (CASUALTY_ODDS in js/losses.js, REPEL_HURT and REPEL_LEAN in js/boarders.js, the odds in
// js/engagements.js). Each trial answers the scenes from a stated policy, then the game state is put back.
//   node tools/fights.js --seeds 1,2,3 --n 100 [--post gunner] [--ship raider]
//   npm run fights
// Report: for the raid, how it closes and what it costs; for each lock fight, how often you win and who is hurt, by crew, by the
// post's skill level, by tactic and by the foe's grade. Not part of `npm test`.

const { open, closeBrowser } = require('../tests/helpers');

// One seed's trials. Returns raw tallies, so the seeds can be summed.
async function fights({ seed = 1, n = 100, post = 'gunner', ship = 'raider' } = {}) {
  const { ev, errors, ctx } = await open({ scope: 'earth-hired', seed, debt: true });
  const r = await ev(([trials, postKey, shipId]) => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: postKey, captainKey: 'hester' }); while (G.dialog) finishEvent();
    const st0 = G.state; st0.story.next = 1e9; st0.day += 30; hired().raidTold = true;  // the first raid is explained once; these are the raids after it
    uatBurn('Ceres Station', 'pallas'); G.transit.times = []; G.transit.event = null; G.dialog = null;
    const snap = JSON.stringify(G.state), crewAll = [...G.state.crew], maxArmor = ship().armor;
    const restore = (crewN, level) => {
      G.state = JSON.parse(snap); G.dialog = null; G.nextEvent = null; G.duel = null;
      const st = G.state, h = hired();
      if (crewN !== null) st.crew = crewAll.slice(0, crewN);
      if (level !== null) h.skill[postKey] = SKILL_STEPS[level];
      return st;
    };
    const foeOf = () => Object.assign(makeEnemy({ kind: 'pirate' }), { shipId });
    // The policies: which choice to make in a scene. The last choice is always the post's own move.
    const POLICY = {
      random: d => Math.floor(Math.random() * d.choices.length),
      post: d => d.choices.length - 1,
      first: () => 0,
      hold: () => 0, rush: () => 1, flank: () => 2,
    };
    const drive = (policy, titles) => {
      let last = '', k = 0;
      while (G.dialog && k++ < 40) {
        titles.push(G.dialog.event.title);
        const i = /Dead in Space/.test(G.dialog.event.title) ? 0 : POLICY[policy](G.dialog);  // a crippled raider is always boarded
        last = chooseEvent(i);
        finishEvent();
      }
      return last;
    };
    const lost = st => ({ hurt: Object.keys(st.injured || {}).length, dead: (st.fallen || []).length, marked: (st.castMarked || []).length, hand: hired().hurtUntil > st.day ? 1 : 0 });
    const out = { raid: {}, repel: {}, assault: {} };

    // The raid, from the first beat to the close and the lock fights that follow it.
    for (const policy of ['random', 'post', 'first']) {
      const t = out.raid[policy] = { n: 0, off: 0, standoff: 0, crippled: 0, boarded: 0, boardedWon: 0, assaultWon: 0, hull: 0, hurt: 0, dead: 0, hand: 0, anyHurt: 0 };
      for (let i = 0; i < trials; i++) {
        const st = restore(null, null), armor0 = st.armor, titles = [];
        startDuel({ kind: 'pirate' }, false);
        const e = G.nextEvent; G.nextEvent = null; openEvent(e);
        const last = drive(policy, titles), c = lost(G.state), assault = titles.includes('Her Corridor') || titles.includes('Her Bridge') || titles.includes('Her Lock');
        t.n++;
        if (titles.includes('Dead in Space')) { t.crippled++; if (/strongbox/.test(last)) t.assaultWon++; }
        else if (titles.some(x => /^The (Lock|Corridor|Bridge)$/.test(x))) { t.boarded++; if (/last of them go back/.test(last)) t.boardedWon++; }
        else if (last.includes(RAID_CLOSE.standoff)) t.standoff++;
        else t.off++;
        t.hull += (armor0 - G.state.armor) / maxArmor; t.hurt += c.hurt; t.dead += c.dead; t.hand += c.hand; if (c.hurt || c.dead || c.hand) t.anyHurt++;
        void assault;
      }
    }

    // The lock fights, started directly: kind 'repel' (they board you) or 'assault' (you board her).
    const lock = (kind, crewN, level, policy, grade) => {
      const t = { n: 0, won: 0, rounds: 0, hurt: 0, dead: 0, marked: 0, hand: 0, anyHurt: 0 };
      for (let i = 0; i < trials; i++) {
        const st = restore(crewN, level), foe = foeOf();
        const s = kind === 'repel' ? repelStart({ foe, foeHp: 0, init: 'foe', grade }, 'full') : assaultStart(foe, { grade });
        openEvent(repelScene(s));
        drive(policy, []);
        const c = lost(st);
        t.n++; if (s.pos < 0) t.won++; t.rounds += s.round; t.hurt += s.hurt.size; t.dead += s.dead.length; t.marked += s.marked.length; t.hand += s.youHurt ? 1 : 0;
        if (s.hurt.size || s.dead.length || s.marked.length || s.youHurt) t.anyHurt++;
        void c;
      }
      return t;
    };
    const cells = [
      ['crew', [1, 3, 5].map(c => [c, 2, 'random', 0])],
      ['level', [1, 2, 3].map(l => [5, l, 'post', 0])],
      ['tactic', ['random', 'hold', 'rush', 'flank', 'post'].map(p => [5, 2, p, 0])],
      ['grade', [0, 1, 2].map(g => [5, 2, 'random', g])],
    ];
    for (const kind of ['repel', 'assault']) {
      for (const [group, list] of cells) {
        for (const [crewN, level, policy, grade] of list) out[kind][`${group}|crew ${crewN} level ${level} ${policy} grade ${grade}`] = lock(kind, crewN, level, policy, grade);
      }
    }
    out.crewAboard = crewAll.length;
    return out;
  }, [n, post, ship]);
  await ctx.close();
  return { seed, ...r, errors };
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
  console.log(`Raids (${runs.length} seeds, ${runs[0].crewAboard} crew aboard, a gunner)`);
  for (const [policy, t] of Object.entries(sum(runs, 'raid'))) {
    console.log(`  ${policy.padEnd(7)} n ${String(t.n).padStart(4)}  off ${pct(t.off, t.n)}  standoff ${pct(t.standoff, t.n)}  crippled ${pct(t.crippled, t.n)} (boarded ${pct(t.assaultWon, t.crippled)})  to the lock ${pct(t.boarded, t.n)} (held ${pct(t.boardedWon, t.boarded)})  hull -${Math.round((100 * t.hull) / t.n)}%  someone hurt ${pct(t.anyHurt, t.n)}  dead ${per(t.dead, t.n)}  you hurt ${pct(t.hand, t.n)}`);
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
  const seeds = (arg('seeds') || '1,2,3').split(',').map(Number), n = Number(arg('n') || 100), post = arg('post') || 'gunner', ship = arg('ship') || 'raider';
  (async () => {
    const runs = [];
    for (const seed of seeds) {
      const r = await fights({ seed, n, post, ship });
      if (r.errors.length) console.log(`seed ${seed}: ${r.errors.length} page errors, first: ${r.errors[0]}`);
      runs.push(r);
    }
    report(runs);
    await closeBrowser();
  })();
}
