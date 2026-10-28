'use strict';

// Repairs for a hired hand's ship. A scrape the captain patches on the way in; real damage (REPAIR_AT of the hull or more) puts
// the ship in the yard: it costs time (days grounded, more with no yard at the port), materials (refined metals, from the hold
// or the market, and with none to be had, a wait for a shipment) and money (parts and labor from the ship's fund, which then
// comes out of the next run's profit, so out of your share). How you spend the days is yours to choose. Loaded after hired.js.

const REPAIR_AT = 0.10, REPAIR_PLATE = 25;  // hull lost, as a share of armor, that means yard time; points of armor a ton of metal mends
const REPAIR_LABOR = { yard: 1000, field: 1500 }, REPAIR_WAIT = 4, STANDBY_PAY = 0.5;  // a day's labor; days waiting for a shipment; the wage share paid while grounded

function repairPlan(planet) {
  const st = G.state, max = ship().armor, lost = Math.max(0, max - st.armor), yard = planet.services.includes('shipyard');
  let days = Math.max(1, Math.min(6, Math.ceil(lost / (max * 0.06))));
  if (!yard) days = Math.min(9, Math.ceil(days * 1.5) + 1);  // no yard: field repairs, slower
  const tons = Math.max(1, Math.ceil(lost / REPAIR_PLATE)), held = (st.cargo.metal || 0) >= tons, stocked = price(planet, 'metal') !== null;
  const parts = held ? 0 : stocked ? Math.round(tradeTotal(planet, 'metal', tons, 1) * 1.3) : 0;  // the yard's markup
  const wait = held || stocked ? 0 : REPAIR_WAIT;
  const labor = (days + wait) * (yard ? REPAIR_LABOR.yard : REPAIR_LABOR.field);
  return { lost, yard, days, tons, held, stocked, parts, wait, labor, total: parts + labor };
}

// Days that pass in port at once, with the same new-day events as a burn (a job ashore, jobs.js). The yard's own days pass as nights (stay.js).
function repairDays(n) { const st = G.state; for (let i = 0; i < n; i++) { st.day++; Mods.emit('newDay', st.day); } }

// The words are the lines of 'scene:repair' (hiredscenes.js); the plan's figures and what each choice does are here.
function repairScene(planet) {
  const st = G.state, h = hired(), plan = repairPlan(planet), cap = hiredCaptain(), say = (key, vars) => sceneSay('scene:repair', key, vars);
  const where = say(plan.yard ? 'where.yard' : 'where.field', { planet: planet.name });
  const source = say(plan.held ? 'source.held' : plan.stocked ? 'source.stocked' : 'source.wait', { tons: plan.tons, parts: fmt(plan.parts), wait: plan.wait });
  const finish = (days, text) => () => {
    const total = plan.total;
    if (plan.held) { st.cargo.metal -= plan.tons; if (st.cargo.metal <= 0) { delete st.cargo.metal; delete st.paid.metal; } }
    else if (plan.stocked) recordTrade(planet, 'metal', plan.tons, 1);
    h.fund = Math.max(0, h.fund - total); h.bill = (h.bill || 0) + total;
    st.armor = ship().armor;
    beginStay(h, days, 'yard');  // the days pass as nights on the pad (stay.js)
    const pay = Math.round(h.wage * STANDBY_PAY * days); st.credits += pay;
    return say('done', { text, days: say(days === 1 ? 'days.one' : 'days.many', { n: days }), total: fmt(total), last: cap.last, pay: fmt(pay) });
  };
  const days = plan.days + plan.wait, choices = [];
  choices.push({ label: say('stand.label'), run: finish(days, say('stand.result')) });
  choices.push({ label: say('help.label'), run() {
    const faster = Math.max(1, days - 1);
    if (h.post === 'engineer') gainSkill('engineer', 3); else like(cap, 1, sceneSay('scene:memories', 'repair.memory'));
    return finish(faster, say(h.post === 'engineer' ? 'help.engineer' : 'help.other'))();
  } });
  choices.push({ label: say('dock.label'), run() {
    const earn = 300 * days; st.credits += earn;
    return finish(days, say('dock.result', { earn: fmt(earn) }))();
  } });
  if (handHurt() || Object.keys(st.injured || {}).length) choices.push({ label: say('rest.label'), run() {
    if (h.hurtUntil) delete h.hurtUntil;
    for (const id of Object.keys(st.injured || {})) delete st.injured[id];
    return finish(days, say('rest.result'))();
  } });
  return { title: say('title'), personal: true, text: say('text', { where, days: say(plan.days === 1 ? 'days.one' : 'days.many', { n: plan.days }), wait: plan.wait ? say('text.wait', { wait: plan.wait }) : '', source, labor: fmt(plan.labor) }), choices };
}

Mods.register({
  id: 'repairs', name: 'Repairs', builtin: true,
  init(M) {
    M.on('landed', planet => {
      const h = hired();
      if (!h || !planet.services.includes('refuel') || G.state.armor >= ship().armor * (1 - REPAIR_AT) || G.state.armor >= ship().armor) return;
      const ev = repairScene(planet);
      if (G.dialog) G.nextEvent = ev; else openEvent(ev);
    });
  },
});
