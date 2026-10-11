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
  const says = (key, seed, setup, act, hired = false, extra = null) => {
    if (window.__only && !new RegExp(window.__only).test(key)) return;
    const rec = { key };
    try {
      const st = start(seed, hired); const ctx = setup ? setup(st) : null; const c0 = st.credits;
      G.messages.length = 0; __seed(seed);
      act(st, ctx);
      rec.text = G.messages.map(m => m.text);
      rec.credits = st.credits - c0;
      if (extra) rec.x = extra(st);
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
  // ---------- the crew and the boarding ----------
  const crewman = (st, role = 'pilot') => { const c = makeCrewCandidate('earth'); c.role = role; c.first = 'Mara'; c.last = 'Quill'; registerPerson(c); st.crew = [c.id]; return c; };
  says('crew:wages', 1, st => { crewman(st); }, () => payCrew(10));
  says('crew:quits', 1, st => { crewman(st); st.credits = 1; }, () => payCrew(10));
  const drifter = () => ({ name: 'Wren', kind: 'trader', armor: 1, maxArmor: 100, disabled: false });
  for (const touch of [false, true]) says(`boarding:disabled:${touch ? 'touch' : 'keys'}`, 1, () => { Touch.on = touch; }, () => { onDamage(drifter(), false, true, 5); Touch.on = false; });
  says('boarding:hurt:crew', 1, st => { crewman(st, 'gunner'); }, () => hurtCrew());
  says('boarding:hurt:cast', 1, st => { st.crew = [castPerson('tomas').id]; }, () => hurtCrew());
  says('boarding:marked', 1, st => { st.crew = [castPerson('tomas').id]; castFate('tomas', 'mark', 'Hurt.', 'Marked once.'); }, () => hurtCrew(), true, () => (G.state.cast.tomas.fate || {}));
  says('boarding:dead:crew', 1, st => { crewman(st); }, () => { seq([0, 0]); hurtCrew(true); }, true, st => st.memorial);
  // ---------- the systems, the autopilot, the escorts and the war ----------
  const armed = (st, n) => { st.outfits.launcher = 1; st.torpedoes = n; };
  const foeNear = (hostile = true) => { const n = spawnNpc('pirate', false, true); Object.assign(n, { hostile, dead: false, disabled: false, x: G.player.x + 500, y: G.player.y }); G.npcs = [n]; return n; };
  says('torp:none', 1, null, () => fireTorpedo());
  says('torp:empty', 1, st => armed(st, 0), () => fireTorpedo());
  says('torp:notarget', 1, st => { armed(st, 2); G.target = null; }, () => fireTorpedo());
  says('torp:away', 1, st => { armed(st, 2); G.target = foeNear(); G.player.torpCd = 0; }, () => fireTorpedo());
  says('torp:incoming', 1, () => { const n = foeNear(); Object.assign(n, { torps: 1, torpCd: 0, shipId: 'corsair' }); }, () => npcLaunches(0.016));
  for (const [gov, by] of [['Arcology Compact', -60], ['Arcology Compact', 90], ['Pirate', -60]]) says(`standing:${gov}:${by}`, 1, null, () => changeRep(gov, by));
  says('hail:blockade', 1, null, () => blockadeWarning({ name: 'Picket', hailed: false }));
  says('hail:wanted', 1, null, () => patrolWarning({ name: 'Cutter', gov: 'Arcology Compact', hailed: false }));
  const pilot = st => { crewman(st, 'pilot'); G.auto = { kind: 'dock', t: 0, care: 1 }; };
  says('auto:control', 1, st => { pilot(st); G.keys.left = true; }, () => { updateAutopilot(0.016); G.keys.left = false; });
  says('auto:contact', 1, st => { pilot(st); foeNear(); }, () => updateAutopilot(0.016));
  says('auto:stuck', 1, st => { pilot(st); G.auto.t = 1e3; }, () => updateAutopilot(0.016));
  says('auto:dock', 1, st => { crewman(st, 'pilot'); st.route = { go: true }; }, st => Mods.emit('arrive', st.systemId));
  const escort = (st, credits) => { buyCompanyShip('courier'); fleet()[0].escort = true; st.credits = credits; };
  const farthest = () => Object.keys(SYSTEMS).filter(id => id !== G.state.systemId).sort((a, b) => burnFuel(G.state.systemId, b) - burnFuel(G.state.systemId, a))[0];
  says('escort:fuel', 1, st => escort(st, 0), st => escortBurn(farthest()));
  says('escort:range', 1, st => escort(st, 1e9), st => { const real = SHIPS.courier.fuel; SHIPS.courier.fuel = 0; try { escortBurn(farthest()); } finally { SHIPS.courier.fuel = real; } });
  says('escort:lost', 1, st => escort(st, 1e9), () => escortLost({ fleetId: fleet()[0].id, name: 'Wren' }));
  says('escort:lost-unknown', 1, st => { escort(st, 1e9); delete st.people[fleet()[0].captain.pid]; }, () => escortLost({ fleetId: fleet()[0].id, name: 'Wren' }));
  says('reactor:scram', 1, null, () => overload());
  says('war', 1, st => { factionState().war = { a: 'Arcology Compact', b: 'Charter League', until: st.day + 10, score: {} }; }, () => warSkirmish());
  return out;
};

module.exports = { playMessages };
