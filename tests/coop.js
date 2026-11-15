'use strict';

// A co-op game for the browser tests (chapter two, #891): `helpers` signs the share and goes on to the bridge, and `started` adds coopAt,
// a co-op landed at Ceres ready to play, with a contract maker and a landing that runs the port's hooks. Each runs in the page: await ev(helpers).

// A hand at Ceres with the share's offer open, signed through the page, the chain played to the end of chapter one.
const helpers = () => {
  window.toShare = (o = {}) => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester' }); while (G.dialog) finishEvent();
    const st = G.state, h = hired(); st.story.next = 1e9; st.tutorial = o.keepTutorial ? 0 : null;  // 0: the hand's first-run steps, left on
    Object.assign(h, { beats: 2, beatRun: -2, flags: { sawHull: true }, debt: 0 });
    h.deal = { price: BUY_IN.mid, day: st.day, broker: false }; st.credits = 60000;
    if (o.alone) for (const id of [...st.crew]) { const p = person(id); if (p && p.cast) p.opinion = -3; }
    if (o.alone) { const cato = castPerson('cato'); G.state.people[cato.id].dead = true; st.crew = st.crew.filter(id => id !== cato.id); }
    st.systemId = 'ceres'; st.planet = 'Ceres Station'; G.mode = 'landed';
    window.tutorialAtSigning = st.tutorial != null; hired().confirm = USED_ID; Mods.act('buyInGo', USED_ID);
    const titles = []; let guard = 20;
    while (G.dialog && G.dialog.event.title !== 'The End of Chapter One' && guard--) { titles.push(G.dialog.event.title); chooseEvent(0); finishEvent(); }
    return titles;
  };
  window.goOnToBridge = () => {
    UI.act('choose', '0');  // Go on
    const start = G.dialog && G.dialog.event, names = start ? start.choices.map(c => c.label) : [], text = start && start.text;
    const result = start ? chooseEvent(0) : null; finishEvent();
    return { title: start && start.title, names, text, result };
  };
  window.chapterTwoView = () => {
    const st = G.state, h = st.hired, cap = hiredCaptain();
    return { chapter: chapterOf(st), role: role().id, captain: role().captain, cap: !!cap, bridge: !!(h && h.bridge), papers: h && h.papers, masters: h && h.masters, ship: st.shipId, planet: st.planet, mode: G.mode,
      crew: st.crew.map(person).map(p => ({ cast: p.cast, role: p.role })), gunner: postHolder('gunner') === null || (postHolder('gunner') && postHolder('gunner').role === 'you'),
      dialog: !!G.dialog, condition: st.condition, armor: st.armor === ship().armor };
  };
};

const started = () => {
  window.coopAt = (i = 0) => { toShare(); goOnToBridge(); const st = G.state; st.story.next = 1e9; G.dialog = null; G.nextEvent = null; UI.notes.length = 0; return st; };
  window.contract = (o = {}) => ({ shipper: 'the Arcology Pact Freight Office', good: 'water', tons: 20, from: 'Ceres Station', sid: 'mars', planet: 'Mars', yard: false, days: 5, pay: 12000, due: G.state.day + 9, hazard: false, rumor: false, ...o });
  window.landAtPort = (sid, planet) => { const st = G.state; G.transit = null; st.systemId = sid; st.planet = planet; G.mode = 'landed'; G.dialog = null; G.nextEvent = null; st.customs = { ...(st.customs || {}), last: st.day };
    const titles = []; Mods.emit('landed', currentPlanet()); let guard = 10; while (G.dialog && guard--) { titles.push(G.dialog.event.title); chooseEvent(0); finishEvent(); } return titles; };
};

module.exports = { helpers, started };
