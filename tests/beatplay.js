'use strict';

// Plays the words of the ship fight, the ambush and the boarding beats (#478; the deck fight, #786, on the deck plan since #1355), for the pin (beatpin.test.js) and the text layer's tests (beatlines.test.js). Not a test file.
// playBeats runs in the page: it plays every scene the beats can show and every choice with the dice set to win and then to lose, in a fresh hired game each time,
// and returns what was said, in a fixed order, so two runs of the same game give the same record. The ship fight is played on the radar (radarui.js) to its end
// with the hand's post on its opening orders, a cycle at a time.
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
    window.makeEnemy = () => Object.assign(spare, { shipId, armor: SHIPS[shipId].armor, maxArmor: SHIPS[shipId].armor, ...(shipId === 'cutter' ? { gov: 'Arcology Pact' } : {}) });  // a cutter is a navy's, with her government (the navy party's standing)
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
      const r = G.radar;  // the fight on the radar, run to its end with the post on its opening orders, a cycle at a time through its pauses (radarui.js)
      for (let n = 0; radarShowing() && n < 8 * RADAR.TURNS; n++) { G.radar.running = true; radarRun(G.radar, RADAR.TURN_S); }
      rec.turns = r ? r.feed.map(e => e.text) : [];  // its timeline, in words
      rec.armor = st.armor;
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
  // A deck fight on the deck plan (deckplanui.js) set by hand for one turn: one of theirs left, out of every line of ours (our scrubbers, or her helm), of four,
  // so that nothing is traded and the fight goes on; their move and ours a hold, and the hand holding fire unless the step says what it does.
  const quiet = s => {
    const st = s.state, them = st.figures.filter(f => f.side === 'them');
    them.forEach((f, i) => { f.hp = i ? 0 : 2; if (!i) f.spot = st.assault ? 'helm' : 'scrub'; });
    st.began = 4; st.wave = 0;
    s.theirs = { moves: [], shots: [], charge: null, cut: null, seal: null, feint: false, storm: null }; s.intent = 'hold'; s.pick = { move: null, act: { kind: 'holdfire' }, order: null };
    return s;
  };
  const rolls = first => seq([first, ...Array(16).fill(0.4)]);
  const pageButtons = s => [...new DOMParser().parseFromString(planFightEvent(s).board, 'text/html').querySelectorAll('button')].map(b => ({ arg: b.dataset.arg, text: b.textContent.replace(/\s+/g, ' ').trim() }));
  const pageLabels = s => pageButtons(s).map(b => b.text);
  const lastLine = s => String(s.state.log[s.state.log.length - 1]);
  // the orders to named crew (#711): each post's two abilities as the crew member does it, worked and missed, in their own words (the owner, #1355)
  for (const assault of [false, true]) for (const role of ['gunner', 'pilot', 'engineer', 'slicer']) for (const kind of ['cover', 'steady']) for (const worked of [true, false]) {
    fresh('gunner', 'raider');
    const p = makePerson('earth'); Object.assign(p, { first: 'Dana', role, skill: 2, traits: [], opinion: 30 }); registerPerson(p); G.state.crew = [p.id];
    const foe = makeEnemy({ kind: 'pirate' }), s = quiet(assault ? assaultStart(foe) : repelStart({ foe, foeHp: 0 }, 'full'));
    const label = pageButtons(s).filter(b => b.arg === `${p.id}|${kind}|`).map(b => b.text);  // the order's button (deckplanui.js planOrdersHtml)
    s.pick.order = { id: p.id, kind }; rolls(worked ? 0.01 : 0.99); const b0 = stand();
    planResolve(s);
    out.push({ id: `order:${assault ? 'assault' : 'repel'}:${role}:${kind}:${worked ? 'worked' : 'missed'}`, label, text: lastLine(s), ...left(b0) });
    G.nextEvent = null; G.duel = null;
  }
  // each fight for each post: its page; the hand's two abilities, each worked and missed; and the two ends that have lines
  for (const assault of [false, true]) {
    for (const post of POSTS_ALL) {
      fresh(post, 'raider');
      const foe = makeEnemy({ kind: 'pirate' }), rec = { id: `${assault ? 'assault' : 'repel'}:${post}`, scenes: [], steps: [] };
      const start = () => (assault ? assaultStart(foe) : repelStart({ foe, foeHp: 0 }, 'full'));
      { const s = start(), ev = planFightEvent(s); rec.scenes.push({ title: ev.title, text: ev.text, labels: pageLabels(s) }); }
      for (const act of ['steady', 'cover']) for (const roll of [0.01, 0.99]) {
        const s = quiet(start()); s.pick.act = { kind: act };
        rolls(roll); const b0 = stand();
        planResolve(s);
        rec.steps.push({ act, roll, text: lastLine(s), ...left(b0) });
        G.nextEvent = null;
      }
      for (const [name, theirs] of [['last', 0], ['broke', 1]]) {  // none of them left, or one of seven (under the break line both ways: DECK.BREAK, DECK.ASSAULT.BREAK)
        const s = quiet(start()); if (!theirs) s.state.figures.forEach(f => { if (f.side === 'them') f.hp = 0; }); else s.state.began = 7;
        seq([]); const b0 = stand();
        planResolve(s);
        rec.steps.push({ act: `end:${name}`, text: String(G.nextEvent && G.nextEvent.text), ...left(b0) });
        G.nextEvent = null; G.duel = null;
      }
      out.push(rec);
    }
  }
  // the bridge taken by a navy party, and by pirates with the captain lost at the console (#796)
  for (const [name, shipId, roll] of [['navy', 'cutter', 0.99], ['captain', 'raider', 0]]) {
    fresh('gunner', shipId);
    const foe = makeEnemy({ kind: 'pirate' }); if (shipId === 'cutter') foe.kind = 'patrol';
    const s = repelStart({ foe, foeHp: 0 }, 'full'); s.hurt = new Set(); seq([roll, roll, roll]); const b0 = stand();
    const text = shipTaken(s);
    out.push({ id: `settle:taken:${name}`, text: String(text), next: G.nextEvent ? G.nextEvent.title : null, ...left(b0) });
    G.nextEvent = null; G.duel = null;
  }
  Math.random = Math.random;
  return out;
};

module.exports = { playBeats };
