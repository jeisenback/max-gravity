'use strict';

// Suggesting a run, and a fitting (below): the captain picks the run, but a hand they listen to can put the next best to them once a stop. Each captain
// answers by their own style, in their entry's `sway` (captains/*.js): `ok(option, current)` decides, and `yes` and `no` are
// their lines. Hester wants the money, Dov agrees to anything, Imre will not go to a worse lane, and Zoya will not shorten a run.

const swayAsked = () => { const h = hired(); return !!h.sway && h.sway.day === G.state.day && h.sway.at === G.state.planet; };

function suggestRun(i) {
  const h = hired(), d = captainEntry(), cap = hiredCaptain(), plan = currentPlan(), alt = plan && h.plan.alts[i];
  if (!d || !d.sway || !alt || swayAsked()) return null;
  if (cap.opinion < captainHears()) return `Captain ${cap.last} does not take suggestions from a hand they do not know yet.`;
  h.sway = { day: G.state.day, at: G.state.planet };
  if (!d.sway.ok(alt, plan)) return d.sway.no;
  h.plan.run = { ...alt, ballast: !!alt.ballast };  // the room's port may be a light run
  return d.sway.yes;
}

// What a run on offer is, in a line: a contract, or the room's port (room.js), which may be a light run.
const altWord = (o, name) => (o.room ? `Back to your room at ${o.planet}, ${SYSTEMS[o.sid].name} (${o.good ? `${o.tons}t ${name(o.good)}` : 'no cargo'})` : `${o.tons}t ${name(o.good)} to ${o.planet}, ${SYSTEMS[o.sid].name}`);

function swayHtml() {
  const hd = hired(), d = captainEntry(), plan = currentPlan();
  if (!d || !d.sway || !plan || !hd.plan.alts.length) return '';
  const name = goodName;
  const cap = hiredCaptain(), deaf = cap.opinion < captainHears();  // shut, with the reason beside it, until the captain listens
  return String(h`<div class="eyebrow">Suggest another run</div>${deaf ? h`<p class="hint">Captain ${cap.last} does not take suggestions from a hand they do not know yet.</p>` : ''}${swayAsked() ? raw('<p class="hint">You have put a run to the captain already at this stop.</p>') : listHtml(hd.plan.alts, (o, i) =>
    h`<div class="row suggest-row"><span class="hint">${altWord(o, name)}: ${runTerms(o)}.</span> <button data-action="suggestRun" data-arg="${i}" ${deaf ? 'disabled' : ''}>Suggest</button></div>`)}`);
}

// Putting a fitting to the captain (#1349, the owner's choice, 2026-11-24): the fire-control upgrades (data.js OUTFITS), at a port with an outfitter, once a
// stop. A captain who listens to the hand (captainHears) and whose fund has the price buys it there and then, from the ship's fund; else says why not.
// Only a ship with a captain person has someone to put it to (role.js captain). The words are scene:screens' fit.* lines (hiredscenes.js).
const FIT_UPGRADES = ['fcAccuracy', 'fcResilience'];
const fitSay = (key, vars) => sceneSay('scene:screens', `fit.${key}`, vars);
const fitAsked = (hand, st) => !!hand.fitAsk && hand.fitAsk.day === st.day && hand.fitAsk.at === st.planet;
// The ask, and the captain's answer. `st` the save, `hand` the hand, `cap` the captain, `hears` the regard the captain listens from, `fund` what the
// ship's fund holds (boarders.js purse), `id` the upgrade. Returns { text, cost }: a fitting bought is on the ship, and `cost` is what the caller takes
// from the fund (moveMoney); 0 when nothing was bought.
function fitAsk(st, hand, cap, hears, fund, id) {
  const o = OUTFITS[id];
  if (!FIT_UPGRADES.includes(id) || (st.outfits || {})[id] || fitAsked(hand, st)) return { text: '', cost: 0 };
  if (cap.opinion < hears) return { text: fitSay('deaf', { cap: `Captain ${cap.last}` }), cost: 0 };
  hand.fitAsk = { day: st.day, at: st.planet };
  if (fund < o.price) return { text: fitSay('poor', { cap: `Captain ${cap.last}`, fund: fmt(fund) }), cost: 0 };
  st.outfits = { ...(st.outfits || {}), [id]: 1 };
  return { text: fitSay('yes', { cap: `Captain ${cap.last}`, name: o.name, cost: fmt(o.price) }), cost: o.price };
}
// The Weapons console's part of it: each upgrade not fitted, with its price, at a port with an outfitter; shut, with the reason, while the captain does not
// listen or once one has been put this stop.
function fitHtml() {
  const st = G.state, hd = hired(), cap = hiredCaptain();
  if (role().captain !== 'npc' || G.mode !== 'landed' || !currentPlanet().services.includes('outfitter') || !cap) return '';
  const left = FIT_UPGRADES.filter(id => !(st.outfits || {})[id]);
  if (!left.length) return '';
  const deaf = cap.opinion < captainHears(), asked = fitAsked(hd, st), why = deaf ? fitSay('deaf', { cap: `Captain ${cap.last}` }) : asked ? fitSay('asked') : '';
  return String(h`<div class="eyebrow">${fitSay('eyebrow')}</div>${why ? h`<p class="hint">${why}</p>` : ''}${listHtml(left, id =>
    h`<div class="row"><button data-action="fitAsk" data-arg="${id}" ${deaf || asked ? 'disabled' : ''}>${fitSay('label', { name: OUTFITS[id].name, cost: fmt(OUTFITS[id].price) })}</button></div>`)}`);
}

Mods.register({
  id: 'suggest', name: 'Suggest a run', builtin: true,
  init(M) {
    M.action('suggestRun', i => { if (!hired()) return; const text = suggestRun(+i); if (text) M.note(text); });
    M.action('fitAsk', id => {
      if (role().captain !== 'npc' || G.mode !== 'landed' || !currentPlanet().services.includes('outfitter')) return;
      const hd = hired(), r = fitAsk(G.state, hd, hiredCaptain(), captainHears(), purse(), id);
      if (r.cost) { moveMoney(-r.cost); hd.bill = (hd.bill || 0) + r.cost; }  // from the ship's fund, on the captain's bill (as the torpedoes are, hired.js restockTorps)
      if (r.text) M.note(r.text);
    });
  },
});
