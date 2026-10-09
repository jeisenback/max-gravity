'use strict';

// Plays the words of the raid, ambush and boarding beats (#478), for the pin (beatpin.test.js) and the text layer's tests (beatlines.test.js). Not a test file.
// playBeats runs in the page: it plays every scene the beats can show and every choice with the dice set to win and then to lose, in a fresh hired game each time,
// and returns what was said, in a fixed order, so two runs of the same game give the same record.
const playBeats = () => {
  const out = [];
  const seq = list => { const l = [...list]; Math.random = () => (l.length ? l.shift() : 0.99); };  // 0 wins a chance and picks the first of a list; 0.99 fails it
  const POSTS_ALL = ['gunner', 'pilot', 'engineer', 'comms'];
  const fresh = (post, shipId) => {
    __seed(1);
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post, captainKey: 'hester' }); while (G.dialog) finishEvent();
    const st = G.state; st.story.next = 1e9; st.day += 30; hired().raidTold = true;
    uatBurn('Ceres Station', 'pallas'); G.transit.times = []; G.transit.event = null; G.dialog = null;
    if (!window.realMakeEnemy) window.realMakeEnemy = makeEnemy;
    const spare = window.realMakeEnemy({ kind: 'pirate' });
    window.makeEnemy = () => Object.assign(spare, { shipId });
    return st;
  };
  const labelsOf = ev => ev.choices.map(c => c.label);
  const origRaid = window.raidScene;
  let grabbed = null;
  window.raidScene = s => { grabbed = s; return origRaid(s); };
  try {
    for (const shipId of ['raider', 'corsair', 'cutter']) {
      for (const post of POSTS_ALL) {
        const st = fresh(post, shipId), full = ship().armor;
        startDuel({ kind: 'pirate' }, false); G.nextEvent = null;
        const s = grabbed, rec = { id: `raid:${shipId}:${post}`, scenes: [], plays: [], closes: [] };
        for (const [beat, round] of [[0, 0], [0, 1], [1, 0], [2, 0]]) {
          s.beat = beat; s.round = round; s.edge = 0;
          const ev = raidScene(s);
          rec.scenes.push({ beat, round, text: ev.text, labels: labelsOf(ev) });
          for (let i = 0; i < ev.choices.length; i++) {
            for (const roll of [0, 0.999]) {
              s.beat = beat; s.round = round; s.edge = 0; s.hurt = new Set(); s.dead = []; s.marked = []; s.youHurt = false; s.handDied = false; st.armor = full;
              seq([roll]);
              const text = ev.choices[i].run();
              rec.plays.push({ beat, round, i, roll, text: String(text) });
              G.nextEvent = null;
            }
          }
        }
        for (const edge of [4, 2, 0, -2]) {
          s.beat = 3; s.edge = edge; s.hurt = new Set(); st.armor = full; seq([]);
          rec.closes.push({ edge, text: String(raidClose(s)) });
          G.nextEvent = null;
        }
        out.push(rec);
      }
    }
  } finally { window.raidScene = origRaid; }
  for (const post of POSTS_ALL) {
    const rec = { id: `ambush:${post}`, labels: [], real: '', trap: '' };
    for (const trap of [false, true]) {
      fresh(post, 'raider');
      seq([trap ? 0 : 0.99]);
      const ev = ambushScene();
      rec.labels = labelsOf(ev);
      seq([0]);
      rec[trap ? 'trap' : 'real'] = String(ev.choices[2].run());
      G.nextEvent = null;
    }
    out.push(rec);
  }
  for (const assault of [false, true]) {
    for (const post of POSTS_ALL) {
      fresh(post, 'raider');
      const foe = makeEnemy({ kind: 'pirate' }), rec = { id: `${assault ? 'assault' : 'repel'}:${post}`, scenes: [], steps: [] };
      const start = () => (assault ? assaultStart(foe) : repelStart({ foe, foeHp: 0 }, 'full'));
      for (const pos of [0, 1, 2]) for (const round of [0, 1]) {
        const s = start(); s.pos = pos; s.round = round;
        const ev = repelScene(s);
        rec.scenes.push({ pos, round, title: ev.title, text: ev.text, labels: labelsOf(ev) });
      }
      for (const kind of ['hold', 'rush', 'flank', 'post']) {
        for (const roll of kind === 'post' ? [0.01, 0.99] : [0.01, 0.5, 0.99]) {
          for (const delta of kind === 'post' ? [0] : [-1, 0, 1]) {
            const s = start(); s.pos = 1; s.round = 0; s.boarders = repelStanding(s) + delta;
            seq([roll]);
            const text = repelStep(s, kind);
            rec.steps.push({ kind, roll, delta, text: String(text) });
            G.nextEvent = null;
          }
        }
      }
      out.push(rec);
    }
  }
  Math.random = Math.random;
  return out;
};

module.exports = { playBeats };
