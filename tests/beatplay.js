'use strict';

// Plays the words of the ship fight, the ambush and the boarding beats (#478), for the pin (beatpin.test.js) and the text layer's tests (beatlines.test.js). Not a test file.
// playBeats runs in the page: it plays every scene the beats can show and every choice with the dice set to win and then to lose, in a fresh hired game each time,
// and returns what was said, in a fixed order, so two runs of the same game give the same record. The ship fight (fightui.js) is played to its end with every gun
// at her weapons (the 'focus' policy of tools/fights.js), a turn at a time.
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
    window.makeEnemy = () => Object.assign(spare, { shipId, armor: SHIPS[shipId].armor, maxArmor: SHIPS[shipId].armor });
    return st;
  };
  const labelsOf = ev => ev.choices.map(c => c.label);
  const sceneText = ev => (ev.read ? `${ev.text}</p><p>${ev.read}` : ev.text);  // a fight panel's read is drawn above its board (#734); the record keeps it after the text
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
  for (const shipId of ['raider', 'corsair', 'cutter']) {
    for (const post of POSTS_ALL) {
      const st = fresh(post, shipId), b0 = stand();
      startDuel({ kind: 'pirate' }, false); const ev = G.nextEvent; G.nextEvent = null;
      const rec = { id: `raid:${shipId}:${post}`, title: ev.title, text: sceneText(ev), labels: labelsOf(ev), turns: [] };
      openEvent(ev);
      while (G.dialog && G.dialog.choices.some(c => /^Fire/.test(c.label)) && rec.turns.length < 12) {
        const t = chooseEvent(G.dialog.choices.findIndex(c => /^Fire/.test(c.label)));
        if (t) openEvent(t); else finishEvent();
        const s = G.dialog && G.dialog.event.fight;
        rec.turns.push({ text: s ? s.state.log[s.state.log.length - 1] : '', armor: st.armor, band: s ? s.state.band : null });
      }
      rec.end = G.dialog ? { title: G.dialog.event.title, text: sceneText(G.dialog.event), labels: labelsOf(G.dialog.event) } : null;
      Object.assign(rec, left(b0));
      G.dialog = null; G.nextEvent = null;
      out.push(rec);
    }
  }
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
      rec.plays.push({ i, roll, text: String(text), next: G.nextEvent ? [G.nextEvent.title, String(sceneText(G.nextEvent))] : null, mem: (cap2.memories || []).slice(m0), ...left(b0) });
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
      rec.plays.push({ i, text: String(text), next: G.nextEvent ? [G.nextEvent.title, String(sceneText(G.nextEvent))] : null, ...left(b0) });
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
      for (const [name, pos, boarders, began] of [['last', 1, 1, 4], ['broke', 0, 2, 6]]) {  // the pick-off that ends the fight: the last of them, or so few left, pushed back to the lock, that the rest break
        const s = start(); s.pos = pos; s.round = 0; s.boarders = boarders; s.began = began;
        seq([0.01]); const b0 = stand();
        const text = repelStep(s, 'steady');
        rec.steps.push({ kind: `end:${name}`, roll: 0.01, delta: 0, text: String(text), ...left(b0) });
        G.nextEvent = null;
      }
      out.push(rec);
    }
  }
  Math.random = Math.random;
  return out;
};

module.exports = { playBeats };
