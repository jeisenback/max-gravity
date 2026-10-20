'use strict';

// Plays the words of the ship fight, the ambush and the boarding beats (#478; the deck fight, #786), for the pin (beatpin.test.js) and the text layer's tests (beatlines.test.js). Not a test file.
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
        const s = G.dialog && G.dialog.event.fight && G.dialog.event.fight.state.kind === 'ship' ? G.dialog.event.fight : null;  // a boarding opens the deck fight, which is recorded at the end
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
    fresh(post, shipId); G.state.crew = [];  // with nobody able to fight, no boarding is offered (#786)
    { const e3 = deadInSpaceScene({ foe: makeEnemy({ kind: 'pirate' }) }); rec.none = { text: e3.text, labels: labelsOf(e3) }; }
    out.push(rec);
  }
  // how a boarding ends: the boarders turned back or the bridge taken, you aboard her or driven back, with the crew hurt or not
  for (const assault of [false, true]) for (const post of ['gunner', 'engineer']) for (const won of [true, false]) for (const round of [1, 3]) {
    fresh(post, 'raider');
    const foe = makeEnemy({ kind: 'pirate' }), s = assault ? assaultStart(foe) : repelStart({ foe, foeHp: 0 }, 'full');
    s.state.turn = round; s.won = won; s.hurt = new Set(); seq([0.99, 0.99, 0.99]); const b0 = stand();
    const text = assault ? assaultSettle(s, won, '') : repelSettle(s);
    out.push({ id: `settle:${assault ? 'assault' : 'repel'}:${post}:${won ? 'won' : 'lost'}:${round}`, text: String(text), ...left(b0) });
    G.nextEvent = null; G.duel = null;
  }
  // A deck fight set by hand for one turn: one of ours with the hand at the lock against four of hers, their move a hold, and (rolls) no hit lands and the hand is not hurt.
  const quiet = s => { s.state.sections.forEach(x => { x.mine = 0; x.theirs = 0; }); s.state.sections[0].mine = 1; s.state.sections[0].theirs = 4; s.state.began = 4; s.state.hand = 0; s.shown = { kind: 'hold', from: 0, to: 0, n: 0, feint: false }; return s; };
  const rolls = first => seq([first, ...Array(16).fill(0.4)]);
  const fightOf = (s, plan) => { const ev = deckFightEvent(s, plan); return { labels: labelsOf(ev), run: () => ev.choices[ev.choices.length - 1].run() }; };
  // the orders to named crew (#711): each post's two abilities as the crew member does it, worked and missed
  for (const assault of [false, true]) for (const role of ['gunner', 'pilot', 'engineer', 'slicer']) for (const kind of ['cover', 'steady']) for (const worked of [true, false]) {
    fresh('gunner', 'raider');
    const p = makePerson('earth'); Object.assign(p, { first: 'Dana', role, skill: 2, traits: [], opinion: 30 }); registerPerson(p); G.state.crew.push(p.id);
    const foe = makeEnemy({ kind: 'pirate' }), s = quiet(assault ? assaultStart(foe) : repelStart({ foe, foeHp: 0 }, 'full'));
    s.fight = [p.id]; s.state.used.cover = kind === 'steady';  // the one crew member offered, with the cover made or not, so the order is of this kind
    const f = fightOf(s, { order: p.id }), label = f.labels.filter(l => /^Order/.test(l)); rolls(worked ? 0.01 : 0.99); const b0 = stand();
    f.run();
    out.push({ id: `order:${assault ? 'assault' : 'repel'}:${role}:${kind}:${worked ? 'worked' : 'missed'}`, label, text: String(s.state.log[s.state.log.length - 1]), ...left(b0) });
    G.nextEvent = null; G.duel = null;
  }
  // each fight for each post: the panel where the hand stands in each section, on two turns; the hand's three acts, each worked and missed; and the two ends that have lines
  for (const assault of [false, true]) {
    for (const post of POSTS_ALL) {
      fresh(post, 'raider');
      const foe = makeEnemy({ kind: 'pirate' }), rec = { id: `${assault ? 'assault' : 'repel'}:${post}`, scenes: [], steps: [] };
      const start = () => (assault ? assaultStart(foe) : repelStart({ foe, foeHp: 0 }, 'full'));
      for (const hand of [0, 1, 2]) for (const turn of [0, 1]) {
        const s = start(); s.state.hand = hand; s.state.turn = turn;
        const ev = deckFightEvent(s);
        rec.scenes.push({ hand, turn, title: ev.title, text: ev.text, read: ev.read, labels: labelsOf(ev) });
      }
      for (const act of ['shoot', 'steady', 'cover']) for (const roll of [0.01, 0.99]) {
        const s = quiet(start()), f = fightOf(s, { act });
        rolls(roll); const b0 = stand();
        f.run();
        rec.steps.push({ act, roll, labels: f.labels, text: String(s.state.log[s.state.log.length - 1]), ...left(b0) });
        G.nextEvent = null;
      }
      for (const [name, theirs] of [['last', 0], ['broke', 1]]) {  // none of them left, or one of four
        const s = quiet(start()); s.state.sections[0].theirs = 0; s.state.sections[1].theirs = theirs;  // nobody where ours stand, so nothing is traded
        seq([]); const b0 = stand();
        fightOf(s, {}).run();
        rec.steps.push({ act: `end:${name}`, text: String(G.nextEvent && G.nextEvent.text), ...left(b0) });
        G.nextEvent = null; G.duel = null;
      }
      out.push(rec);
    }
  }
  Math.random = Math.random;
  return out;
};

module.exports = { playBeats };
