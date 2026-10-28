'use strict';

// Ship condition: drive, fire control, shields, life support, and sensors wear a little
// with use (burns, fights, hits taken), and a worn system costs performance. A system in
// bad shape can break down on a burn (a scene from the engineer), and every system can be
// serviced in flight (an engineer's order) or overhauled at port. The Wear setting in the
// menu turns it off, slow (the default), or normal. Loaded before game.js; only calls into
// it at runtime.

// What each system's fault looks like is a line of 'scene:trouble' (hiredscenes.js), `fault.<part>`.
const SHIP_PARTS = {
  drive: { name: 'Drive' },
  fire: { name: 'Fire control' },
  shields: { name: 'Shields' },
  life: { name: 'Life support' },
  sensors: { name: 'Sensors' },
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
const overhaulCost = part => Math.round((100 - condition()[part]) * 80);

(ORDERS.engineer = ORDERS.engineer || []).push({
  id: 'service', name: 'Service the worst system', desc: 'Put the system in the worst shape right. Once a day.',
  can: () => condition()[worstPart()] < 95, idle: 'Every system is in good order.',
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
  const c = condition(), docked = G.mode === 'landed' && !hired();  // the captain pays for a yard overhaul
  return `${wearRate() ? '' : '<p class="hint">Wear is off.</p>'}<div class="con-parts">
    ${Object.entries(SHIP_PARTS).map(([k, p]) => `<div class="con-part"><span>${p.name}</span>${conBar(c[k], condColor(c[k]))}<b>${Math.round(c[k])}</b></div>
      ${docked && c[k] < 99 ? `<div class="con-yard"><span class="hint">Yard overhaul</span><button data-action="overhaul" data-arg="${k}" ${G.state.credits >= overhaulCost(k) ? '' : 'disabled'}>${fmt(overhaulCost(k))} cr</button></div>` : ''}`).join('')}
  </div>`;
}

// A scene for a system that has gone bad, played through the happenings picker. Its words are the lines of 'scene:trouble' (hiredscenes.js): {part} is the system,
// {name} the same in lower case, {pct} its condition after the choice; {crew} is the engineer, filled when it is shown.
function breakdownEvent(part) {
  const name = SHIP_PARTS[part].name.toLowerCase(), c = condition, say = (key, vars) => sceneSay('scene:trouble', key, { part: SHIP_PARTS[part].name, name, pct: Math.round(c()[part]), ...vars });
  return {
    title: say('title'),
    text: say('text', { fault: say(`fault.${part}`) }),
    choices: [
      { label: say('fix.label'), role: 'engineer', run() {
        delay(10);
        c()[part] = Math.min(100, c()[part] + 30);
        return say('fix.result');
      } },
      { label: say('rig.label'), run() {
        if (Math.random() < 0.65) { c()[part] = Math.min(100, c()[part] + 12); return say('rig.win'); }
        c()[part] = Math.max(0, c()[part] - 8);
        return say('rig.lose');
      } },
      { label: say('nurse.label'), run() {
        c()[part] = Math.max(0, c()[part] - 4);
        return say('nurse.result');
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
      if (G.mode !== 'landed' || hired() || G.state.credits < cost) return;
      G.state.credits -= cost;
      condition()[part] = 100;
    });
  },
});
