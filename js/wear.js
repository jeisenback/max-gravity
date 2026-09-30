'use strict';

// Ship condition: drive, fire control, shields, life support, and sensors wear a little
// with use (burns, fights, hits taken), and a worn system costs performance. A system in
// bad shape can break down on a burn (a scene from the engineer), and every system can be
// serviced in flight (an engineer's order) or overhauled at port. The Wear setting in the
// menu turns it off, slow (the default), or normal. Loaded before game.js; only calls into
// it at runtime.

const SHIP_PARTS = {
  drive: { name: 'Drive', fault: 'The drive has started to cough: a stutter in the thrust, and a rattle in the plume pipes that was not there before.' },
  fire: { name: 'Fire control', fault: 'The fire control is drifting. The mounts keep slewing a hair off the solution, and the targeting cache has started serving stale tracks.' },
  shields: { name: 'Shields', fault: 'The shield emitters are flickering, and every few minutes one of the projectors drops out for a second and comes back.' },
  life: { name: 'Life support', fault: 'The air has gone stale. The scrubbers are running flat out, the recycler is groaning, and somebody has started a pool on which one gives up first.' },
  sensors: { name: 'Sensors', fault: 'The sensor mast is throwing ghosts: contacts that are not there, and, worse, a long scan that keeps missing the ones that are.' },
};
const WEAR_RATE = { off: 0, slow: 1, normal: 2.5 };
const BREAKDOWN_BELOW = 40;

const condition = () => {
  const st = G.state, c = st.condition = st.condition || {};
  for (const k of Object.keys(SHIP_PARTS)) if (c[k] === undefined) c[k] = 100;
  return c;
};
const wearRate = () => WEAR_RATE[Settings.wear] === undefined ? 1 : WEAR_RATE[Settings.wear];
function wear(part, amount) { const c = condition(); c[part] = Math.max(0, c[part] - amount * wearRate()); }
// Full marks down to 60%, then sliding to half at nothing.
const perf = part => { const c = condition()[part]; return c >= 60 ? 1 : 0.5 + c / 120; };
const worstPart = () => { const c = condition(); return Object.keys(SHIP_PARTS).sort((a, b) => c[a] - c[b])[0]; };
const overhaulCost = part => Math.round((100 - condition()[part]) * 8);

(ORDERS.engineer = ORDERS.engineer || []).push({
  id: 'service', name: 'Service the worst system', desc: 'Put the system in the worst shape right. Once a day.',
  can: () => condition()[worstPart()] < 95,
  run(ok, doer, skill) {
    const part = worstPart(), who = doer ? doer.first || doer.name : 'You';
    if (!ok) return `${who} open${doer ? 's' : ''} up the ${SHIP_PARTS[part].name.toLowerCase()} and spend${doer ? 's' : ''} a watch on it, and close${doer ? 's' : ''} it up no better.`;
    const gain = Math.min(100 - condition()[part], 10 + 5 * skill);
    condition()[part] += gain;
    return `${who} service${doer ? 's' : ''} the ${SHIP_PARTS[part].name.toLowerCase()}. Condition +${gain}.`;
  },
});

// The Engineering station's list of systems, and (docked) the yard's price to overhaul each.
function wearHtml() {
  const c = condition(), docked = G.mode === 'landed';
  return `<div class="power"><div class="eyebrow">Condition${wearRate() ? '' : ' &middot; wear is off'}</div>
    ${Object.entries(SHIP_PARTS).map(([k, p]) => `<div class="slider"><span>${p.name}</span><span class="pbar ${c[k] < 40 ? 'hot' : ''}"><i style="width:${Math.round(c[k])}%"></i></span><span class="mono">${Math.round(c[k])}%</span></div>
      ${docked && c[k] < 99 ? `<div class="row"><span class="hint">Yard overhaul</span><button data-action="overhaul" data-arg="${k}" ${G.state.credits >= overhaulCost(k) ? '' : 'disabled'}>${fmt(overhaulCost(k))} cr</button></div>` : ''}`).join('')}
  </div>`;
}

// A scene for a system that has gone bad, played through the happenings picker.
function breakdownEvent(part) {
  const name = SHIP_PARTS[part].name.toLowerCase(), c = condition;
  return {
    title: `${SHIP_PARTS[part].name} Trouble`,
    text: `${SHIP_PARTS[part].fault} It is at ${Math.round(c()[part])} percent and it will not get better by being ignored. The question is how much of the burn you are willing to spend on it.`,
    choices: [
      { label: '[{crew}] Fix it properly', role: 'engineer', run() {
        delay(10);
        c()[part] = Math.min(100, c()[part] + 30);
        return `{crew} pulls the ${name} apart, and puts it back together better, and takes most of a watch to do it. The burn runs ten seconds long, and the ${name} is at ${Math.round(c()[part])} percent.`;
      } },
      { label: 'Jury-rig it yourself', run() {
        if (Math.random() < 0.65) { c()[part] = Math.min(100, c()[part] + 12); return `It takes a borrowed tool kit and a great deal of swearing, but the ${name} comes back a little, to ${Math.round(c()[part])} percent. It will do.`; }
        c()[part] = Math.max(0, c()[part] - 8);
        return `You get the panel open and make it worse. The ${name} drops to ${Math.round(c()[part])} percent, and you close the panel quickly, as though nobody saw.`;
      } },
      { label: 'Nurse it along', run() {
        c()[part] = Math.max(0, c()[part] - 4);
        return `You decide to live with it. The ${name} slips a little further, to ${Math.round(c()[part])} percent, and everybody aboard learns to listen for it.`;
      } },
    ],
  };
}

function wearTick(dt) {
  const t = G.transit;
  if (!dt || G.mode !== 'transit' || !t || t.event || G.dialog) return;
  const p = power();
  wear('drive', dt * (0.03 * (1 + Math.max(0, p.drive - 40) / 40) + (heat() > 75 ? 0.05 : 0)));
  wear('life', dt * 0.01);
  wear('sensors', dt * 0.01);
}

Mods.register({
  id: 'wear', name: 'Wear', builtin: true,
  init(M) {
    M.on('frame', wearTick);
    M.on('fire', o => { if (o === G.player) wear('fire', 0.05); });
    M.on('damage', (o, shieldHit) => { if (o === G.player && shieldHit) wear('shields', 0.3); });
    M.action('overhaul', part => {
      const cost = overhaulCost(part);
      if (G.mode !== 'landed' || G.state.credits < cost) return;
      G.state.credits -= cost;
      condition()[part] = 100;
    });
  },
});
