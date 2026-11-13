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
function wear(part, amount) {
  const c = condition(), before = c[part];
  c[part] = Math.max(0, before - amount * wearRate() * partWear(G.state, part));  // a printed part wears faster (parts.js)
  if (before >= BREAKDOWN_BELOW && c[part] < BREAKDOWN_BELOW && handPerk('hear-it-coming')) homeLog(`The ${SHIP_PARTS[part].name.toLowerCase()} is worn under the breakdown line.`);  // hear-it-coming (picks.js): named the day it crosses
}
// Full marks down to 60%, then sliding to half at nothing.
const perf = part => { const c = condition()[part]; return Math.min(PERF_CAP, (c >= 60 ? 1 : 0.5 + c / 120) * partEffect(G.state, part, 'perf')); };  // and its part's quirk (parts.js)
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
  const c = condition(), docked = G.mode === 'landed' && role().mayAct('overhaul');  // whoever pays for the ship pays for a yard overhaul: the owner, the co-op (#906)
  const offers = k => (docked && c[k] < 99 ? partsOffers(G.state, currentPlanet(), k, G.state.day) : []);  // a new part, a used one when the port has one, a printed one (parts.js, #1135)
  const button = (k, o) => `<div class="con-yard"><span class="hint">${o.source === 'yard' ? 'Yard overhaul' : o.source === 'used' ? `Used: ${o.quirk.from}` : 'Printed, temporary'}</span><button data-action="overhaul" data-arg="${o.source === 'yard' ? k : `${k}:${o.source}`}" ${G.state.credits >= o.price ? '' : 'disabled'}>${fmt(o.price)} cr</button></div>`;
  return `${wearRate() ? '' : '<p class="hint">Wear is off.</p>'}<div class="con-parts">
    ${Object.entries(SHIP_PARTS).map(([k, p]) => `<div class="con-part"><span>${p.name}</span>${conBar(c[k], condColor(c[k]))}<b>${Math.round(c[k])}</b></div>
      ${offers(k).map(o => button(k, o)).join('')}`).join('')}
  </div>`;
}

// A scene for a system that has gone bad, played through the happenings picker. Its words are the lines of 'scene:trouble' (hiredscenes.js): {part} is the system,
// {name} the same in lower case, {pct} its condition after the choice; {crew} is the engineer, filled when it is shown.
function breakdownEvent(part) {
  const argued = G.state.hired && G.state.hired.partsArgued; if (argued && argued.sys === part) argued.broke = true;  // the part the hand argued for did not hold (parts.js)
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
  dt = paceDt(dt);  // today's wear a trip, at any speed; none paused (burnspeed.js, #992)
  if (!dt) return;
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
    M.action('overhaul', arg => {  // `${system}:${source}` (parts.js); a bare system is a yard part, as before
      const [part, source = 'yard'] = String(arg).split(':'), o = G.mode === 'landed' && partsOffers(G.state, currentPlanet(), part, G.state.day).find(x => x.source === source);
      if (!o || !role().mayAct('overhaul') || G.state.credits < o.price) return;
      G.state.credits -= o.price;
      fitPart(G.state, part, o.source, o.quirk, G.state.day);
    });
  },
});
