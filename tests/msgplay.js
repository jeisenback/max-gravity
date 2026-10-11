'use strict';

// Plays the one-line messages the game prints in flight and at the dock (js/game.js: msg) for the pin (msgpin.test.js, #508): a kill, a nav target, a landing refused, a delivery
// made, a mission lapsed, a burn begun or refused, an arrival. Each case calls the game's own function and records what the message log gained. Not a test file.
const playMessages = () => {
  const out = [];
  const real = Math.random;
  const seq = list => { const l = [...list]; Math.random = () => (l.length ? l.shift() : real()); };
  const start = (seed, hired = false) => {
    __seed(seed);
    startGame(hired ? { slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester', credits: 5000 } : { slot: 1, background: 'earth', captain: 'Sam Rowe', credits: 5000 });
    while (G.dialog) finishEvent();
    const st = G.state; st.tutorial = null; st.story.next = 1e9;
    G.dialog = null; G.nextEvent = null;
    takeOff();
    return st;
  };
  const says = (key, seed, setup, act, hired = false) => {
    if (window.__only && !new RegExp(window.__only).test(key)) return;
    const rec = { key };
    try {
      const st = start(seed, hired); const ctx = setup ? setup(st) : null; const c0 = st.credits;
      G.messages.length = 0; __seed(seed);
      act(st, ctx);
      rec.text = G.messages.map(m => m.text);
      rec.credits = st.credits - c0;
    } catch (err) { rec.error = String(err && err.message || err); }
    out.push(rec);
  };
  const here = st => system().planets.find(p => p.name === st.planet) || system().planets[0];
  const mission = (st, over) => { const pl = here(st); const m = { id: st.nextId++, destSystem: st.systemId, destPlanet: pl.name, deadline: st.day + 10, title: 'Job', pay: 400, ...over }; st.missions.push(m); return m; };

  // ---------- kills ----------
  says('kill:ally', 1, null, () => settleKill({ name: 'Rook', kind: 'pirate' }, false));
  says('kill:ally-enemy', 1, null, () => settleKill({ name: 'Rook', kind: 'trader', enemy: true }, false));
  says('kill:story', 1, null, () => settleKill({ name: 'Voight', kind: 'story', story: true }, true));
  says('kill:bounty', 1, st => { const m = mission(st, { type: 'bounty', pay: 1200, issuer: localGov(), targetName: 'Harlan Voss' }); return m; }, (st, m) => settleKill({ name: 'Harlan Voss', kind: 'pirate', bountyId: m.id }, true));
  for (const [i, r] of [0, 0.5, 0.99].entries()) says(`kill:pirate:${i}`, 1, null, () => { seq([r]); settleKill({ name: 'Rook', kind: 'pirate' }, true); });
  says('kill:patrol', 1, null, () => settleKill({ name: 'Patrol 4', kind: 'patrol', gov: 'Compact' }, true));
  says('kill:trader', 1, null, () => settleKill({ name: 'Wren', kind: 'trader' }, true));

  // ---------- landing ----------
  says('land:nav', 1, () => { G.player.x = 1e5; G.player.y = 1e5; }, () => tryLand());
  says('land:fast', 1, () => { const pl = here(G.state); G.player.x = pl.x; G.player.y = pl.y; G.player.vx = 1e4; G.player.vy = 0; }, () => tryLand());
  says('land:denied', 1, () => { const pl = here(G.state); G.player.x = pl.x; G.player.y = pl.y; G.player.vx = 0; G.player.vy = 0; changeRep(localGov(), -500); }, () => tryLand());

  // ---------- deliveries ----------
  const dock = (key, setup, extra = {}) => says(key, 1, st => { setup(st); return null; }, st => land(here(st)));
  dock('dock:errand', st => mission(st, { type: 'errand', title: 'Errand: carry a sealed case to Ceres Station', pay: 300 }));
  dock('dock:delivery', st => mission(st, { type: 'delivery', tons: 12, good: 'water ice', pay: 900 }));
  dock('dock:pax1', st => mission(st, { type: 'passenger', who: 'a pilgrim', pax: 1, bonus: 0, pay: 500 }));
  dock('dock:pax2', st => mission(st, { type: 'passenger', who: 'a survey crew', pax: 3, bonus: 0, pay: 800 }));
  dock('dock:pax-bonus', st => mission(st, { type: 'passenger', who: 'a pilgrim', pax: 1, bonus: 150, pay: 500 }));
  dock('dock:pax-penalty', st => mission(st, { type: 'passenger', who: 'a pilgrim', pax: 1, bonus: -150, pay: 500 }));
  dock('dock:pax-nofare', st => mission(st, { type: 'passenger', who: 'a pilgrim', pax: 1, bonus: -500, pay: 500 }));
  says('dock:lapsed', 1, st => { mission(st, { type: 'delivery', tons: 5, good: 'ore', pay: 100, destSystem: 'nowhere', title: 'Ore run', deadline: st.day - 1 }); }, st => expireMissions());

  says('dock:walk-off', 1, st => { const c = crewMembers().find(c => c.id && !c.cast); c.opinion = OPINION.BITTER - 1; c.loyal = false; }, st => land(here(st)), true);

  says('map:hired', 1, () => { G.mode = 'map'; G.mapPos = () => [100, 100]; }, () => canvas.dispatchEvent(new MouseEvent('click', { clientX: 100, clientY: 100 })), true);

  // ---------- the burn ----------
  says('burn:nodest', 1, st => { st.dest = null; }, () => tryBurn());
  says('burn:fuel', 1, st => { st.dest = Object.keys(SYSTEMS).find(id => id !== st.systemId); st.fuel = 0; }, () => tryBurn());
  says('burn:near', 1, st => { st.dest = Object.keys(SYSTEMS).find(id => id !== st.systemId); st.fuel = 1e6; G.player.x = 0; G.player.y = 0; }, () => tryBurn());
  says('burn:ok', 1, st => { st.dest = Object.keys(SYSTEMS).find(id => id !== st.systemId); st.fuel = 1e6; G.player.x = 1e6; G.player.y = 0; }, () => tryBurn());
  says('arrive', 1, st => { const to = Object.keys(SYSTEMS).find(id => id !== st.systemId); G.burnAngle = 0; G.transit = { to, days: 3, total: 10, left: 0, times: [], seen: [], comms: [] }; }, () => arrive());
  // ---------- hails and the story at sea ----------
  const pirate = over => ({ name: 'Rook', kind: 'pirate', hailed: false, persona: { traits: ['kind'], home: 'Mars', id: '', opinion: 0, ...(over.persona || {}) }, ...over, persona: { traits: ['kind'], home: 'Mars', id: '', opinion: 0, ...(over.persona || {}) } });
  says('hail:demand:paid', 1, null, () => pirateDemand(pirate({ payer: 'Mara Quill' })));
  says('hail:demand:grudge', 1, null, () => pirateDemand(pirate({ persona: { id: 'p1', opinion: OPINION.GRUDGE } })));
  says('hail:demand:tribute', 1, null, () => pirateDemand(pirate({ persona: { tributes: 2 } })));
  for (const t of ['kind', 'brave', 'greedy', 'cold']) for (const [i, r] of [0, 0.5, 0.99].entries()) says(`hail:demand:${t}:${i}`, 1, null, () => { seq([r]); pirateDemand(pirate({ persona: { traits: [t] } })); });
  says('hail:demand:again', 1, null, () => pirateDemand(pirate({ hailed: true })));
  says('hail:none', 1, () => { G.target = null; G.npcs = []; }, () => tryHail());
  says('hail:escort', 1, () => { G.target = { kind: 'escort', name: 'Wing', x: 0, y: 0 }; }, () => tryHail());
  says('hail:far', 1, () => { G.target = { kind: 'trader', name: 'Wren', x: 1e7, y: 0 }; }, () => tryHail());
  for (const ambush of [false, true]) for (const r of ['won', 'escaped']) says(`story:fight:${ambush ? 'ambush' : 'recovery'}:${r}`, 1, () => { story().stage = ambush ? 'belt2' : 2; }, () => { agentConsoleEvent(ambush).choices.find(c => /^Battle stations/.test(c.label)).run(); G.storyFight.onEnd(r); });
  const blockade = side => { const s = story(); s.stage = 'act3'; s.side = side; };
  for (const side of ['belt', 'aquilon']) {
    says(`story:blockade:${side}:holds`, 1, () => blockade(side), () => { blockadeScene().choices[0].run(); G.storyFight.onEnd('escaped'); });
    says(`story:blockade:${side}:won`, 1, () => blockade(side), () => { blockadeScene().choices[0].run(); G.storyFight.onEnd('won'); G.storyFight.onEnd('won'); });
    says(`story:blockade:${side}:cold`, 1, () => blockade(side), () => { const sc = blockadeScene(); seq([0]); sc.choices[1].run(); });
  }
  return out;
};

module.exports = { playMessages };
