'use strict';

// Suggesting a run: the captain picks the run, but a hand they listen to can put the next best to them once a stop. Each captain
// answers by their own style, in their entry's `sway` (captains/*.js): `ok(option, current)` decides, and `yes` and `no` are
// their lines. Hester wants the money, Dov agrees to anything, Imre will not go to a worse lane, and Zoya will not shorten a run.

const swayAsked = () => { const h = hired(); return !!h.sway && h.sway.day === G.state.day && h.sway.at === G.state.planet; };

function suggestRun(i) {
  const h = hired(), d = captainEntry(), cap = hiredCaptain(), plan = currentPlan(), alt = plan && h.plan.alts[i];
  if (!d || !d.sway || !alt || swayAsked()) return null;
  if (cap.opinion < captainHears()) return `Captain ${cap.last} does not take suggestions from a hand they do not know yet.`;
  h.sway = { day: G.state.day, at: G.state.planet };
  if (!d.sway.ok(alt, plan)) return d.sway.no;
  h.plan.run = { ...alt, ballast: false };
  return d.sway.yes;
}

function swayHtml() {
  const h = hired(), d = captainEntry(), plan = currentPlan();
  if (!d || !d.sway || !plan || !h.plan.alts.length) return '';
  const name = id => COMMODITIES.find(c => c.id === id).name;
  const cap = hiredCaptain(), deaf = cap.opinion < captainHears();  // shut, with the reason beside it, until the captain listens
  return `<div class="eyebrow">Suggest another run</div>${deaf ? `<p class="hint">Captain ${cap.last} does not take suggestions from a hand they do not know yet.</p>` : ''}${swayAsked() ? '<p class="hint">You have put a run to the captain already at this stop.</p>' : h.plan.alts.map((o, i) =>
    `<div class="row"><span class="hint">${o.tons}t ${name(o.good)} to ${o.planet}, ${SYSTEMS[o.sid].name}: ${runTerms(o)}.</span> <button data-action="suggestRun" data-arg="${i}" ${deaf ? 'disabled' : ''}>Suggest</button></div>`).join('')}`;
}

Mods.register({
  id: 'suggest', name: 'Suggest a run', builtin: true,
  init(M) {
    M.action('suggestRun', i => { if (!hired()) return; const text = suggestRun(+i); if (text) M.note(text); });
  },
});
