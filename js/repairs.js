'use strict';

// Repairs for a hired hand's ship. A scrape the captain patches on the way in; real damage (REPAIR_AT of the hull or more) puts
// the ship in the yard: it costs time (days grounded, more with no yard at the port), materials (refined metals, from the hold
// or the market, and with none to be had, a wait for a shipment) and money (parts and labor from the ship's fund, which then
// comes out of the next run's profit, so out of your share). How you spend the days is yours to choose. Loaded after hired.js.

const REPAIR_AT = 0.10, REPAIR_PLATE = 25;  // hull lost, as a share of armor, that means yard time; points of armor a ton of metal mends
const REPAIR_LABOR = { yard: 100, field: 150 }, REPAIR_WAIT = 4, STANDBY_PAY = 0.5;  // a day's labor; days waiting for a shipment; the wage share paid while grounded

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

// The days go by here, with the same new-day events as a burn.
function repairDays(n) { const st = G.state; for (let i = 0; i < n; i++) { st.day++; Mods.emit('newDay', st.day); } }

function repairScene(planet) {
  const st = G.state, h = hired(), plan = repairPlan(planet), cap = hiredCaptain();
  const where = plan.yard ? `The yard at ${planet.name} has a berth` : `${planet.name} has no yard, only a dock crew and a welding rig`;
  const source = plan.held ? `The captain will use ${plan.tons}t of the refined metals in the hold for plate, and take the loss on the cargo.`
    : plan.stocked ? `The plate is ${plan.tons}t of refined metals from the market here, at the yard's price: ${fmt(plan.parts)} cr.`
    : `Nobody here stocks refined metals, so the plate has to be shipped in: ${plan.wait} more days.`;
  const finish = (days, text) => () => {
    const total = plan.total;
    if (plan.held) { st.cargo.metal -= plan.tons; if (st.cargo.metal <= 0) { delete st.cargo.metal; delete st.paid.metal; } }
    else if (plan.stocked) recordTrade(planet, 'metal', plan.tons, 1);
    h.fund = Math.max(0, h.fund - total); h.bill = (h.bill || 0) + total;
    st.armor = ship().armor;
    repairDays(days);
    const pay = Math.round(h.wage * STANDBY_PAY * days); st.credits += pay;
    return `${text} ${days} day${days === 1 ? '' : 's'} in the yard, and the hull is whole. Parts and labor came to ${fmt(total)} cr from the ship's fund, and will come out of the next run before the share is cut. Captain ${cap.last} paid you ${fmt(pay)} cr standby.`;
  };
  const days = plan.days + plan.wait, choices = [];
  choices.push({ label: 'Stand by while the work is done', run: finish(days, 'You stand by, and the work gets done around you.') });
  choices.push({ label: 'Help with the repair', run() {
    const faster = Math.max(1, days - 1);
    if (h.post === 'engineer') gainSkill('engineer', 3); else like(cap, 1, 'You pitched in on the hull.');
    return finish(faster, h.post === 'engineer' ? 'You work the plate beside the yard crew, and learn from them. (Experience gained.)' : 'You carry plate and hold the light, and the work goes faster for it.')();
  } });
  choices.push({ label: 'Work the dock for pay', run() {
    const earn = 30 * days; st.credits += earn;
    return finish(days, `You hire out on the dock for the duration and earn ${fmt(earn)} cr.`)();
  } });
  if (handHurt() || Object.keys(st.injured || {}).length) choices.push({ label: 'Rest and let the hurt mend', run() {
    if (h.hurtUntil) delete h.hurtUntil;
    for (const id of Object.keys(st.injured || {})) delete st.injured[id];
    return finish(days, 'You and the others sleep, eat and sit in the sun lamp for a few days. The aches go.')();
  } });
  return { title: 'Hull Damage', personal: true, text: (`The ship has taken enough damage on the way in that she cannot sail as she is. ${where}, and ` +
      `the estimate is ${plan.days} days${plan.wait ? ` and ${plan.wait} waiting for a shipment` : ''}. ${source} Labor is ${fmt(plan.labor)} cr. The ` +
      `captain does not like the sum, and does not say so. Until she is whole, the ship stays on the pad.`), choices };
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
