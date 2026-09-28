'use strict';

// Hyperspace transit: long jumps with choice events, market rumors, and comms chatter.
// Loaded before game.js; only calls into it at runtime.

const HYPER_MIN = 60, HYPER_MAX = 120;  // real seconds per jump, scaled by map distance

const CHATTER = [
  'Nav computer: lane stable, drift within tolerance.',
  'Freighter "Mule\'s Promise" to all ships: anyone got a spare coolant pump?',
  'Federation Patrol 7: routine sweep, no contacts.',
  'Somebody is broadcasting polka on the emergency band again.',
  'Hull temperature nominal. Hyperdrive humming along.',
  '"...and that is why you never play cards with a Rigel miner." [laughter]',
  'Automated beacon: Deneb Outpost reports all docking bays open.',
  'Courier "Swift Dispatch": running late, clear the lane please.',
  'Life support: CO2 scrubbers cycling.',
  'Unknown ship: "Anyone else hear that noise in the lane? No? Just me?"',
  'Nav computer: minor gravitational ripple, compensating.',
  'Pirate band chatter, too faint to make out.',
];

const RUMORS = {
  up: [
    'Miners on {p} have gone on strike. {c} is suddenly scarce there.',
    'A disease scare on {p} has everyone hoarding {c}.',
    'Customs on {p} seized a shipment of {c}. Buyers there are desperate.',
    'A festival on {p} has doubled demand for {c}.',
  ],
  down: [
    'A convoy just flooded {p} with {c}. Prices there are collapsing.',
    'Warehouses on {p} are overflowing with {c}. Sellers are dumping it cheap.',
    'A bumper harvest of {c} on {p} has the markets swamped.',
  ],
};

// ---------- effect helpers used by events ----------

function hurt(frac) {
  const p = G.player, dmg = Math.round(p.maxArmor * frac);
  p.armor = Math.max(1, p.armor - dmg);
  return dmg;
}

const hasTradeCargo = () => Object.values(G.state.cargo).some(t => t > 0);

function loseCargo(frac) {
  const st = G.state;
  const cid = Object.keys(st.cargo).sort((a, b) => st.cargo[b] - st.cargo[a])[0];
  const held = st.cargo[cid], qty = Math.ceil(held * frac);
  st.paid[cid] -= st.paid[cid] * qty / held;
  st.cargo[cid] -= qty;
  return `You jettison ${qty}t of ${COMMODITIES.find(c => c.id === cid).name}.`;
}

function delay(seconds) {
  G.hyper.left += seconds;
  G.hyper.total += seconds;
}

function addRumor() {
  const st = G.state;
  const markets = Object.entries(SYSTEMS).flatMap(([sid, s]) => s.planets.filter(p => p.services.includes('trade')).map(p => ({ sid, p })));
  const { sid, p } = pick(markets);
  const cid = pick(Object.keys(p.prices));
  const up = Math.random() < 0.6;
  const days = randInt(4, 8);
  const text = pick(RUMORS[up ? 'up' : 'down'])
    .replace('{p}', p.name)
    .replace('{c}', COMMODITIES.find(c => c.id === cid).name);
  st.rumors = st.rumors.filter(r => !(r.planet === p.name && r.cid === cid));
  st.rumors.push({ planet: p.name, cid, mult: up ? rand(1.35, 1.6) : rand(0.55, 0.7), until: st.day + days, text: `${text} (${SYSTEMS[sid].name})` });
  comm(`[Market] ${text} (${SYSTEMS[sid].name}, for about ${days} days)`);
  return text;
}

// ---------- events ----------

const HYPER_EVENTS = [
  {
    title: 'Distress Call',
    text: 'A faint signal cuts through the static: "...life support failing... anyone..." A private yacht has dropped out of the lane just ahead.',
    choices: [
      { label: 'Drop out and help (costs time)', run() {
        delay(15);
        if (Math.random() < 0.65) {
          const c = randInt(15, 40) * 100;
          G.state.credits += c;
          return `You patch their air recyclers and share some rations. The grateful owner transfers ${fmt(c)} cr.`;
        }
        return `It was bait. Two raiders power up the moment you drop out. You break away with ${hurt(0.3)} points of armor damage.`;
      } },
      { label: 'Stay on course', run: () => 'You tune out the signal. It fades behind you, then stops.' },
    ],
  },
  {
    title: 'Interdiction',
    text: 'Your ship lurches as a pirate gravity snare drags you out of the lane. A voice crackles: "Cargo or credits, spacer. Your choice."',
    choices: [
      { label: 'Pay them off (10% of your credits)', run() {
        const c = Math.min(G.state.credits, Math.max(500, Math.round(G.state.credits * 0.1)));
        G.state.credits -= c;
        return `You transfer ${fmt(c)} cr. They let you go with a mocking salute.`;
      } },
      { label: 'Dump half your biggest cargo', can: hasTradeCargo, run: () => `${loseCargo(0.5)} The pirates scramble after it while you slip back into the lane.` },
      { label: 'Fight', run() {
        if (Math.random() < 0.3 + ship().guns * 0.15) {
          const b = randInt(10, 25) * 100;
          G.state.credits += b;
          return `You blow the snare ship apart and collect ${fmt(b)} cr of salvage, taking ${hurt(0.2)} points of armor damage.`;
        }
        return `They outgun you. You limp back into the lane with ${hurt(0.5)} points of armor damage.`;
      } },
      { label: 'Overload the drive (50 fuel)', can: () => G.state.fuel >= 50, run() {
        G.state.fuel -= 50;
        if (Math.random() < 0.7) return 'The drive screams and you tear free of the snare.';
        return `You break free, but the snare rakes your hull for ${hurt(0.25)} points of armor damage.`;
      } },
    ],
  },
  {
    title: 'Drifting Cargo Pod',
    text: 'Sensors flag an unmarked cargo pod tumbling through the lane. No owner beacon.',
    choices: [
      { label: 'Scoop it up', can: () => cargoFree() > 0, run() {
        if (Math.random() < 0.2) return `Booby-trapped. The pod detonates against your hull for ${hurt(0.2)} points of armor damage.`;
        const c = pick(COMMODITIES), tons = Math.min(cargoFree(), randInt(2, 8));
        G.state.cargo[c.id] = (G.state.cargo[c.id] || 0) + tons;
        return `Finders keepers: ${tons}t of ${c.name}, free.`;
      } },
      { label: 'Leave it', run: () => 'Nothing out here is ever really free. You let it tumble past.' },
    ],
  },
  {
    title: 'Stowaway',
    text: 'A skinny kid crawls out from behind the cargo netting, blinking. "I just need to get off that rock. I can pay a little. Or I know things."',
    choices: [
      { label: 'Charge them passage', run() {
        const c = randInt(3, 8) * 100;
        G.state.credits += c;
        return `They hand over ${fmt(c)} cr in crumpled scrip and curl up in the galley.`;
      } },
      { label: '"What do you know?"', run: () => `The kid grins. "${addRumor()}" You file that away.` },
    ],
  },
  {
    title: 'Hyperspace Anomaly',
    text: 'A shimmering rift opens alongside the lane, pouring out readings your sensors cannot classify. Research labs pay well for data like this.',
    choices: [
      { label: 'Move in and scan it', run() {
        if (Math.random() < 0.6) {
          const c = randInt(10, 30) * 100;
          G.state.credits += c;
          return `Your sensors drink it in. A research consortium buys the data remotely for ${fmt(c)} cr.`;
        }
        delay(10);
        return `The rift lashes out. You pull away with ${hurt(0.15)} points of armor damage and a scrambled nav computer.`;
      } },
      { label: 'Steer well clear (costs time)', run: () => { delay(5); return 'You give it a wide berth. Better late than inside-out.'; } },
    ],
  },
  {
    title: 'Coolant Leak',
    text: 'Alarms. The hyperdrive coolant loop has sprung a leak and the drive is running hot.',
    choices: [
      { label: 'Patch it yourself', run() {
        if (Math.random() < 0.5) return 'An hour with a sealant gun and some creative swearing. Good as new.';
        const lost = Math.min(G.state.fuel, 50);
        G.state.fuel -= lost;
        return `The patch fails and you vent ${lost} units of fuel before you get it sealed.`;
      } },
      { label: 'Burn extra fuel to cool the drive', run() {
        const lost = Math.min(G.state.fuel, 25);
        G.state.fuel -= lost;
        return `You burn ${lost} units of fuel and the temperature settles.`;
      } },
    ],
  },
  {
    title: 'Merchant Hail',
    text: 'A trader running the same lane hails you. "Market tip, friend? Five hundred credits and it is yours."',
    choices: [
      { label: 'Buy the tip (500 cr)', can: () => G.state.credits >= 500, run() {
        G.state.credits -= 500;
        return `"${addRumor()}" The trader signs off with a wink.`;
      } },
      { label: 'No thanks', run: () => '"Your loss," they laugh, and drop off the channel.' },
    ],
  },
];

// ---------- transit ----------

function comm(text) {
  G.hyper.comms.push(text);
  if (G.hyper.comms.length > 10) G.hyper.comms.shift();
}

function jumpSeconds(from, to) {
  const d = Math.hypot(SYSTEMS[to].x - SYSTEMS[from].x, SYSTEMS[to].y - SYSTEMS[from].y);
  return Math.max(HYPER_MIN, Math.min(HYPER_MAX, HYPER_MIN + (d - 100) * 0.4));
}

function enterHyperspace() {
  const st = G.state, to = st.route.shift();
  st.fuel -= JUMP_FUEL;
  const total = jumpSeconds(st.systemId, to);
  const count = 1 + Math.floor(total / 40);  // 2 to 4 happenings per jump
  G.hyper = {
    to, total, left: total, event: null, comms: [], seen: [],
    times: Array.from({ length: count }, (_, i) => total * (i + rand(0.3, 0.8)) / count),
    chatter: rand(5, 10),
  };
  G.mode = 'hyperspace';
  G.npcs = []; G.shots = []; G.target = null;
  if (!G.tunnel) G.tunnel = Array.from({ length: 180 }, () => ({ x: rand(-1, 1), y: rand(-1, 1), z: rand(0.05, 1) }));
  comm(`Hyperspace lane to ${SYSTEMS[to].name} established.`);
}

function updateHyperspace(dt) {
  const h = G.hyper;
  for (const s of G.tunnel) {
    s.z -= dt * 0.45;
    if (s.z <= 0.03) Object.assign(s, { x: rand(-1, 1), y: rand(-1, 1), z: 1 });
  }
  if (h.event) return;  // timer waits for the player's decision

  h.left -= dt;
  if ((h.chatter -= dt) <= 0) {
    h.chatter = rand(12, 20);
    comm(pick(CHATTER));
  }
  if (h.times.length && h.total - h.left >= h.times[0]) {
    h.times.shift();
    const fresh = HYPER_EVENTS.filter(e => !h.seen.includes(e));
    if (Math.random() < 0.55 && fresh.length) {
      h.event = pick(fresh);
      h.seen.push(h.event);
      UI.showEvent(h.event);
    } else {
      addRumor();
    }
  }
  if (h.left <= 0) arrive();
}

function chooseEvent(i) {
  return G.hyper.event.choices[i].run();
}

function finishEvent() {
  G.hyper.event = null;
  UI.hide();
}

// ---------- rendering ----------

function wrapText(text, maxW) {
  const lines = [];
  let line = '';
  for (const word of text.split(' ')) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = word; } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

function drawHyperspace(W, H) {
  const viewW = W - HUD_W, cx = viewW / 2, cy = H / 2, h = G.hyper, st = G.state;
  const g = ctx.createRadialGradient(cx, cy, 10, cx, cy, viewW * 0.7);
  g.addColorStop(0, '#1b2a55');
  g.addColorStop(1, '#02030a');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, viewW, H);

  const k = viewW * 0.25;
  for (const s of G.tunnel) {
    const x1 = cx + s.x / s.z * k, y1 = cy + s.y / s.z * k;
    const x2 = cx + s.x / (s.z + 0.06) * k, y2 = cy + s.y / (s.z + 0.06) * k;
    ctx.strokeStyle = `rgba(170,200,255,${Math.min(1, 1.2 - s.z)})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x1, y1); ctx.stroke();
  }

  // Progress
  const barW = Math.min(420, viewW - 40), bx = cx - barW / 2;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#cfe3ff';
  ctx.font = 'bold 16px monospace';
  ctx.fillText(`HYPERSPACE  ${system().name} > ${SYSTEMS[h.to].name}`, cx, 34);
  ctx.fillStyle = '#1a2533';
  ctx.fillRect(bx, 46, barW, 8);
  ctx.fillStyle = '#7fb4ff';
  ctx.fillRect(bx, 46, barW * Math.min(1, 1 - h.left / h.total), 8);
  const secs = Math.max(0, Math.ceil(h.left));
  ctx.font = '12px monospace';
  ctx.fillStyle = '#9ab';
  ctx.fillText(`${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')} remaining${h.event ? '  (paused)' : ''}`, cx, 72);

  // Comms log, top-left
  ctx.textAlign = 'left';
  const colW = Math.min(360, viewW / 2 - 30);
  let y = 110;
  ctx.fillStyle = '#9ab';
  ctx.fillText('COMMS', 20, y);
  ctx.font = '12px monospace';
  const lines = h.comms.flatMap((c, i) => wrapText(c, colW).map(l => ({ l, recent: i === h.comms.length - 1, market: c.startsWith('[Market]') })));
  for (const { l, recent, market } of lines.slice(-16)) {
    ctx.fillStyle = market ? '#ffcf7f' : recent ? '#cfe3ff' : '#7d93aa';
    ctx.fillText(l, 20, y += 16);
  }

  // Ship's log, bottom-left
  const log = [];
  for (const m of st.missions) log.push(`${m.title} (due day ${m.deadline})`);
  if (!st.missions.length) log.push('No active missions.');
  const held = COMMODITIES.filter(c => st.cargo[c.id] > 0).map(c => `${st.cargo[c.id]}t ${c.name}`);
  log.push(`Cargo: ${held.length ? held.join(', ') : 'empty'}`);
  const logLines = log.flatMap(l => wrapText(l, viewW - 40));
  y = H - 20 - logLines.length * 16;
  ctx.fillStyle = '#9ab';
  ctx.fillText("SHIP'S LOG", 20, y);
  ctx.fillStyle = '#cfe3ff';
  for (const l of logLines) ctx.fillText(l, 20, y += 16);
}
