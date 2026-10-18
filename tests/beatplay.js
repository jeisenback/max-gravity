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
  const stand = () => ({ credits: G.state.credits, fund: hired().fund, opinion: Object.fromEntries(Object.values(G.state.people).map(p => [p.id, p.opinion])), mem: Object.fromEntries(Object.values(G.state.people).map(p => [p.id, (p.memories || []).length])) });
  // what a step left behind: the memories gained and what moved (the money, the ship's fund, each person's regard); nothing, if nothing did
  const left = (b) => {
    const a = stand(), fx = {}, mem = Object.values(G.state.people).flatMap(p => (p.memories || []).slice(b.mem[p.id] === undefined ? 0 : b.mem[p.id]));
    if (a.credits !== b.credits) fx.credits = a.credits - b.credits;
    if (a.fund !== b.fund) fx.fund = a.fund - b.fund;
    for (const [id, v] of Object.entries(a.opinion)) if (v !== (b.opinion[id] === undefined ? v : b.opinion[id])) fx[id] = v - b.opinion[id];
    return { ...(mem.length ? { mem } : {}), ...(Object.keys(fx).length ? { fx } : {}) };
  };
  fresh('gunner', 'raider');  // the first burn in a page makes the stars (a hundred and fifty draws), so it is played once before the dice are seeded for the record
  const origRaid = window.raidScene;
  let grabbed = null;
  window.raidScene = s => { grabbed = s; return origRaid(s); };
  try {
    for (const shipId of ['raider', 'corsair', 'cutter']) {
      for (const post of POSTS_ALL) {
        const st = fresh(post, shipId), full = ship().armor;
        startDuel({ kind: 'pirate' }, false); G.nextEvent = null;
        const s = grabbed, rec = { id: `raid:${shipId}:${post}`, scenes: [], plays: [], closes: [] };
        const at = beat => { s.range = s.base = beat === 0 ? rangeAtContact(s.style) : RANGE_WANT[s.style]; };  // where the table has her, so the record is the one the words always had (the range moves with each play)
        for (const [beat, round] of [[0, 0], [0, 1], [1, 0], [2, 0]]) {
          s.beat = beat; s.round = round; s.edge = 0; at(beat);
          const ev = raidScene(s);
          rec.scenes.push({ beat, round, text: ev.text, labels: labelsOf(ev) });
          for (let i = 0; i < ev.choices.length; i++) {
            for (const roll of [0, 0.999]) {
              s.beat = beat; s.round = round; s.edge = 0; at(beat); s.hurt = new Set(); s.dead = []; s.marked = []; s.youHurt = false; s.handDied = false; st.armor = full;
              seq([roll]); const b0 = stand();
              const text = ev.choices[i].run();
              rec.plays.push({ beat, round, i, roll, text: String(text), ...left(b0) });
              G.nextEvent = null;
            }
          }
        }
        for (const edge of [4, 2, 0, -2]) {
          s.beat = 3; s.edge = edge; s.range = s.base = RANGE_WANT[s.style]; s.hurt = new Set(); st.armor = full; seq([]); const b0 = stand();
          rec.closes.push({ edge, text: String(raidClose(s)), ...left(b0) });
          G.nextEvent = null;
        }
        rec.moved = [10, -10].map(d => { s.beat = 0; s.round = 0; s.edge = 0; s.base = rangeAtContact(s.style); s.range = s.base + d; return raidScene(s).text; });  // the contact's move has opened the range or closed it (engage.js)
        // the range opened (#710): the passes told from far, the close where she cannot board, and the contact lost
        rec.far = [1, 2].map(beat => { s.beat = beat; s.edge = 0; s.range = s.base = 25; return raidScene(s).text; });
        s.beat = 3; s.edge = -2; s.range = s.base = 25; s.hurt = new Set(); st.armor = full; seq([]); const b1 = stand();
        rec.closes.push({ edge: -2, far: true, text: String(raidClose(s)), ...left(b1) });
        G.nextEvent = null;
        s.beat = 2; s.edge = -3; s.range = s.base = 55; s.hurt = new Set(); st.armor = full; seq([0]); const b2 = stand();
        rec.lost = { text: String(raidStep(s, RAID_EXCHANGE.find(c => c.id === 'burn'), null)), ...left(b2) };
        G.nextEvent = null;
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
  // the ambush, every choice of it: blind or after a read, to a trap or to a real call
  for (const post of POSTS_ALL) for (const known of [false, true]) for (const trap of [false, true]) {
    fresh(post, 'raider');
    const h = hired(), cap = person(h.captain), ev = ambushChoice({ trap, read: known, tried: known, known }, cap, h, post, AMBUSH_READ[post]);
    const rec = { id: `ambush:${post}:${known ? 'known' : 'blind'}:${trap ? 'trap' : 'real'}`, text: ev.text, labels: labelsOf(ev), plays: [] };
    for (let i = 0; i < ev.choices.length; i++) for (const roll of [0, 0.999]) {
      fresh(post, 'raider');
      const h2 = hired(), cap2 = person(h2.captain), e2 = ambushChoice({ trap, read: known, tried: known, known }, cap2, h2, post, AMBUSH_READ[post]);
      seq([roll]); const b0 = stand(); const m0 = (cap2.memories || []).length; G.nextEvent = null;
      const text = e2.choices[i].run();
      rec.plays.push({ i, roll, text: String(text), next: G.nextEvent ? [G.nextEvent.title, String(G.nextEvent.text)] : null, mem: (cap2.memories || []).slice(m0), ...left(b0) });
      G.nextEvent = null; G.duel = null;
    }
    out.push(rec);
  }
  // the crippled raider that drifts beside you: its words, and both choices (boarding her opens the assault fight)
  for (const shipId of ['raider', 'corsair', 'cutter']) for (const post of POSTS_ALL) {
    fresh(post, shipId);
    const foe = makeEnemy({ kind: 'pirate' }), ev = deadInSpaceScene({ foe }), rec = { id: `dead:${shipId}:${post}`, title: ev.title, text: ev.text, labels: labelsOf(ev), plays: [] };
    for (let i = 0; i < ev.choices.length; i++) {
      fresh(post, shipId);
      const f2 = makeEnemy({ kind: 'pirate' }), e2 = deadInSpaceScene({ foe: f2 });
      seq([0]); const b0 = stand(); G.nextEvent = null;
      const text = e2.choices[i].run();
      rec.plays.push({ i, text: String(text), next: G.nextEvent ? [G.nextEvent.title, String(G.nextEvent.text)] : null, ...left(b0) });
      G.nextEvent = null; G.duel = null;
    }
    out.push(rec);
  }
  // how a boarding ends: the boarders turned back or the bridge taken, you aboard her or driven back, with the crew hurt or not
  for (const assault of [false, true]) for (const post of ['gunner', 'engineer']) for (const won of [true, false]) for (const round of [1, 3]) {
    fresh(post, 'raider');
    const foe = makeEnemy({ kind: 'pirate' }), s = assault ? assaultStart(foe) : repelStart({ foe, foeHp: 0 }, 'full');
    s.round = round; s.pos = won ? -1 : 3; s.hurt = new Set(); seq([0.99, 0.99, 0.99]); const b0 = stand();
    const text = assault ? assaultSettle(s, won, '') : repelSettle(s);
    out.push({ id: `settle:${assault ? 'assault' : 'repel'}:${post}:${won ? 'won' : 'lost'}:${round}`, text: String(text), ...left(b0) });
    G.nextEvent = null; G.duel = null;
  }
  // the orders to named crew (#711): each post's two abilities as the crew member does it, worked and missed (a miss lands on the one sent)
  for (const assault of [false, true]) for (const role of ['gunner', 'pilot', 'engineer', 'slicer']) for (const kind of ['cover', 'steady']) for (const worked of [true, false]) {
    fresh('gunner', 'raider');
    const p = makePerson('earth'); Object.assign(p, { first: 'Dana', role, skill: 2, traits: [], opinion: 30 }); registerPerson(p); G.state.crew.push(p.id);
    const foe = makeEnemy({ kind: 'pirate' }), s = assault ? assaultStart(foe) : repelStart({ foe, foeHp: 0 }, 'full');
    s.pos = 1; s.boarders = 4; s.fight = [p.id]; s.used.cover = kind === 'steady'; const label = repelScene(s).choices.filter(c => c.order).map(c => c.label); seq(worked ? [0.01] : [0.99, 0.01]); const b0 = stand();  // the one crew member offered, with the cover made or not, so the label of this kind is the one shown
    s.used.cover = false;
    const text = repelStep(s, kind, { id: p.id, first: p.first, sheet: crewSheet(p) });
    out.push({ id: `order:${assault ? 'assault' : 'repel'}:${role}:${kind}:${worked ? 'worked' : 'missed'}`, label, text: String(text), ...left(b0) });
    G.nextEvent = null; G.duel = null;
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
      for (const kind of ['hold', 'rush', 'flank', 'post', 'steady', 'cover']) {
        const single = !['hold', 'rush', 'flank'].includes(kind);  // the post's move and its abilities do not face their tactic
        for (const roll of single ? [0.01, 0.99] : [0.01, 0.5, 0.99]) {
          for (const delta of single ? [0] : [-1, 0, 1]) {
            const s = start(); s.pos = 1; s.round = 0; s.boarders = repelStanding(s) + delta;
            seq([roll]); const b0 = stand();
            const text = repelStep(s, kind);
            rec.steps.push({ kind, roll, delta, text: String(text), ...left(b0) });
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
