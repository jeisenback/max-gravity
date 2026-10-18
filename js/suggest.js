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

Mods.register({
  id: 'suggest', name: 'Suggest a run', builtin: true,
  init(M) {
    M.action('suggestRun', i => { if (!hired()) return; const text = suggestRun(+i); if (text) M.note(text); });
  },
});
