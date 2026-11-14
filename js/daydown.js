'use strict';

// Going down to Lagos (#1162, docs/bible/ports.md Going down to Lagos): at the Ring, while the captain waits for a shipper (stay.js), the hand can
// take the spaceplane down to the Lagos platform and back for a day, alone, for a seat bought from their own savings. A day down is a short menu,
// as the day ashore is (dayashore.js): the arcology's tiers, the mainland market across the lagoon, or the platform's departure hall, each a line
// taken in turn by the day. The words are the lines of scene:day-down (hiredscenes.js). Once a day; the night then passes as it does in a stay.
// Loaded after dayashore.js; calls into stay.js only at runtime.

const DOWN_FARE = 900, DOWN_PORT = 'Earth';  // the seat down and back (the owner, 2026-11-14); the port the spaceplane goes down from
const DOWN_LANES = ['tiers', 'market', 'hall'];
const lagosSay = (key, vars) => sceneSay('scene:day-down', key, vars);
// Whether a day down is on offer here now, and if it is, why it is shut (or '' when it is open). `st` the save, `h` the hand, `planet` the port.
function downOffer(st, h, planet) {
  if (!h || !planet || planet.name !== DOWN_PORT || atSite(st) || !stayOf(h)) return null;
  return { why: h.downDay === st.day ? lagosSay('shut') : st.credits < DOWN_FARE ? needCr(DOWN_FARE)[1]() : '' };
}
function dayDownEvent() {
  const st = G.state;
  return {
    title: lagosSay('title'), text: lagosSay('text'), personal: true, place: 'well',  // it starts at the spoke lift, on the Ring's view
    choices: DOWN_LANES.map(k => ({ label: lagosSay(`${k}.label`), run: () => lagosSay(`${k}.${st.day % 3}`) })),
  };
}
// The Port page's button, under the day ashore's: at the Ring in a stay only.
function dayDownHtml() {
  const o = G.mode === 'landed' && downOffer(G.state, hired(), currentPlanet());
  if (!o) return '';
  return String(h`<div class="row"><button data-action="goDown" ${o.why ? 'disabled' : ''}>${lagosSay('button', { fare: fmt(DOWN_FARE) })}</button>${o.why ? h` <span class="hint">${o.why}</span>` : ''}</div>`);
}

Mods.register({
  id: 'daydown', name: 'Going down to Lagos', builtin: true,
  init(M) {
    M.action('goDown', () => {
      const st = G.state, h = hired(), o = !G.dialog && G.mode === 'landed' && downOffer(st, h, currentPlanet());
      if (!o || o.why) return;
      st.credits -= DOWN_FARE; h.downDay = st.day;
      openEvent(dayDownEvent());
    });
  },
});
