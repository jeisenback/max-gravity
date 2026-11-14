'use strict';

// Going down to Lagos (#1162, docs/bible/ports.md Going down to Lagos): at the Ring, while the captain waits for a shipper (stay.js), the hand can
// take the spaceplane down to the Lagos platform and back for a day, alone, for a seat bought from their own savings. A day down is a short menu,
// as the day ashore is (dayashore.js): the arcology's tiers, the mainland market across the lagoon, or the platform's departure hall, each a line
// taken in turn by the day. The words are the lines of scene:day-down (hiredscenes.js). Once a day; the night then passes as it does in a stay.
// Loaded after dayashore.js; calls into stay.js only at runtime.

const DOWN_FARE = 900, DOWN_PORT = 'Earth', CRAYFISH = 60;  // ...; dried crayfish for Ngozi from Surulere's market (#1164)  // the seat down and back (the owner, 2026-11-14); the port the spaceplane goes down from
const DOWN_LANES = ['tiers', 'market', 'hall'];
const lagosSay = (key, vars) => sceneSay('scene:day-down', key, vars);
// Whether a day down is on offer here now, and if it is, why it is shut (or '' when it is open). `st` the save, `h` the hand, `planet` the port.
function downOffer(st, h, planet) {
  if (!h || !planet || planet.name !== DOWN_PORT || atSite(st) || !stayOf(h)) return null;
  return { why: h.downDay === st.day ? lagosSay('shut') : st.credits < DOWN_FARE ? needCr(DOWN_FARE)[1]() : '' };
}
// Something to bring up (#1164, part 1): once the hand has eaten at Ngozi's (portview.js st.portAte), the day can go on a bag of dried crayfish for her
// from Surulere's market, carried up (st.forNgozi) until her next word takes it.
const crayfishLane = st => (st.portAte === undefined || st.forNgozi ? [] : [{ label: lagosSay('crayfish.label', { cost: fmt(CRAYFISH) }), ...gated(needCr(CRAYFISH)), run() {
  st.credits -= CRAYFISH; st.forNgozi = true;
  return lagosSay('crayfish.result');
} }]);
// Back up from Tomas's parents' table, the stew Chioma sends him (#1164, part 1): his memory of it; the regard was the visit's.
function tomasStewEvent(t) {
  return { title: lagosSay('stew.title'), text: lagosSay('stew.text'), personal: true, people: [t.id], place: 'well', choices: [
    { label: lagosSay('stew.leave'), keep: true, run() { like(t, 0, lagosSay('stew.memory')); return null; } },
  ] };
}
// Work below (part 3): the day's one of the jobs kept for Lagos (jobs.js, `down`), in turn by the day; it takes the day down, and the pay is the hand's.
const downJob = day => { const list = JOBS.filter(j => j.down); return list[day % list.length]; };
function dayDownEvent() {
  const st = G.state;
  return {
    title: lagosSay('title'), text: lagosSay('text'), personal: true, place: 'well',  // it starts at the spoke lift, on the Ring's view
    choices: [...DOWN_LANES.map(k => ({ label: lagosSay(`${k}.label`), run: () => lagosSay(`${k}.${st.day % 3}`) })),
      { label: lagosSay('work.label'), run() { G.nextEvent = jobStage(downJob(st.day), 0); return null; } },  // the day's job below, played as a station job is (jobs.js)
      ...crayfishLane(st)],
  };
}
// Tomas's parcel (#1162, part 2; docs/bible/people/tomas.md): when Tomas is aboard and trusts the hand as a visit home asks (OPINION.TRUSTED,
// family.js), going down starts with him at the lift with a bag for his parents, Emeka and Chioma, in Surulere. Taken, the day is at their table, and
// what the hand tells them is worth his regard and a memory; not taken, the day down goes on as it would. Not again inside VISIT_GAP days of the last.
const parcelDue = (st, t) => !!t && t.opinion >= OPINION.TRUSTED && st.day - (t.parentsAt === undefined ? -VISIT_GAP : t.parentsAt) >= VISIT_GAP;
function tomasParcelEvent(t) {
  const st = G.state;
  return { title: lagosSay('parcel.title'), text: lagosSay('parcel.text'), personal: true, people: [t.id], place: 'well', choices: [
    { label: lagosSay('parcel.take'), run() { t.parentsAt = st.day; G.nextEvent = tomasParentsEvent(t); return null; } },
    { label: lagosSay('parcel.not'), run() { G.nextEvent = dayDownEvent(); return null; } },  // the day down as it would have been
  ] };
}
function tomasParentsEvent(t) {
  const told = (key, by) => ({ label: lagosSay(`parents.${key}.label`), run() { like(t, by, lagosSay(`parents.${key}.memory`)); G.nextEvent = tomasStewEvent(t); return lagosSay(`parents.${key}.result`); } });  // and back up with the stew
  return { title: lagosSay('parents.title'), text: lagosSay('parents.text'), personal: true, choices: [told('kind', 1), told('true', 2)] };
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
      const t = tomasAboard();
      openEvent(parcelDue(st, t) ? tomasParcelEvent(t) : dayDownEvent());  // Tomas at the lift first, when he has something for his parents
    });
  },
});
