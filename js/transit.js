'use strict';

// Transit between locations: a long burn with a flip at the midpoint, plus choice
// events, market rumors, and comms chatter. Loaded before game.js; only calls into
// it at runtime.

const TRANSIT_MIN = 60, TRANSIT_MAX = 120;  // real seconds per burn, scaled by travel days

const CHATTER = [
  'Nav: trajectory nominal, drift within tolerance.',
  'Ice hauler "Mule\'s Promise" to all ships: anyone got a spare coolant pump?',
  'Coalition Navy picket: routine sweep, no contacts.',
  'Somebody is broadcasting polka on the emergency band again.',
  'Crash couch: juice reservoir at 80 percent.',
  '"...and that is why you never play cards with a Pallas refinery crew." [laughter]',
  'Automated beacon: Ceres Station reports all docking bays open. Water ration unchanged.',
  'Courier "Swift Dispatch": running a hard burn, clear the approach please.',
  'Life support: CO2 scrubbers cycling.',
  'Unknown ship: "Anyone else see that drive plume? No transponder? Just me?"',
  'Mars Republic Navy: all vessels, maintain transponders in Martian space.',
  'Belt pirate radio: static, then a laugh, then static again.',
  'Reactor: output steady. Drive plume stable.',
];

const RUMORS = {
  up: [
    'Dockworkers on {p} have gone on strike. {c} is suddenly scarce there.',
    'A disease scare on {p} has everyone hoarding {c}.',
    'Customs on {p} seized a shipment of {c}. Buyers there are desperate.',
    'A corporate buying spree on {p} has cleared the shelves of {c}.',
  ],
  down: [
    'Three haulers just unloaded {c} on {p}. Prices there are collapsing.',
    'Warehouses on {p} are overflowing with {c}. Sellers are dumping it cheap.',
    'A bumper output of {c} on {p} has the markets swamped.',
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
  seconds = Math.max(seconds, 1 - G.transit.left);  // shortening can never skip past arrival
  G.transit.left += seconds;
  G.transit.total += seconds;
}

function addRumor() {
  const st = G.state, days = randInt(12, 30);
  let sid, p, cid, up, text;
  const plot = storyRumor();  // once the story starts, some shortages are sabotage
  if (plot) {
    ({ sid, cid, up, text } = plot);
    p = SYSTEMS[sid].planets.find(b => b.name === plot.planet);
  } else {
    const markets = Object.entries(SYSTEMS).flatMap(([id, s]) => s.planets.filter(b => b.services.includes('trade')).map(b => ({ sid: id, p: b })));
    ({ sid, p } = pick(markets));
    cid = pick(Object.keys(p.prices));
    up = Math.random() < 0.6;
    text = pick(RUMORS[up ? 'up' : 'down'])
      .replace('{p}', p.name)
      .replace('{c}', COMMODITIES.find(c => c.id === cid).name);
  }
  st.rumors = st.rumors.filter(r => !(r.planet === p.name && r.cid === cid));
  st.rumors.push({ planet: p.name, cid, mult: up ? rand(1.35, 1.6) : rand(0.55, 0.7), until: st.day + days, text: `${text} (${SYSTEMS[sid].name})` });
  comm(`[Market] ${text} (${SYSTEMS[sid].name}, for about ${days} days)`);
  return text;
}

// ---------- events ----------

const TRANSIT_EVENTS = [
  {
    title: 'Distress Call',
    text: 'A faint signal cuts through the static: "...reactor scram... life support failing... anyone..." A private yacht is drifting ballistic just off your trajectory.',
    choices: [
      { label: 'Kill your burn and help (costs time)', run() {
        delay(15);
        if (Math.random() < 0.65) {
          const c = randInt(15, 40) * 100;
          G.state.credits += c;
          return `You patch their air recyclers and share some rations. The grateful owner transfers ${fmt(c)} cr.`;
        }
        return `It was bait. Two raiders light their drives the moment you match velocity. You break away with ${hurt(0.3)} points of armor damage.`;
      } },
      { label: 'Stay on course', run: () => 'You tune out the signal. It fades behind you, then stops.' },
    ],
  },
  {
    title: 'Pirates Matching Course',
    text: 'A dark ship with no transponder matches your burn and paints you with targeting lidar. A voice crackles: "Cargo or credits, hoser. Your choice."',
    choices: [
      { label: 'Pay them off (10% of your credits)', run() {
        const c = Math.min(G.state.credits, Math.max(500, Math.round(G.state.credits * 0.1)));
        G.state.credits -= c;
        return `You transfer ${fmt(c)} cr. They peel off with a mocking flash of their running lights.`;
      } },
      { label: 'Dump half your biggest cargo', can: hasTradeCargo, run: () => `${loseCargo(0.5)} The pirates chase it down while you burn on.` },
      { label: 'Fight', run() {
        if (Math.random() < fightOdds()) {
          const b = randInt(10, 25) * 100;
          G.state.credits += b;
          return `You hole their reactor shielding and they go dark. Salvage nets ${fmt(b)} cr, and you take ${hurt(0.2)} points of armor damage.`;
        }
        return `They outgun you. You limp away with ${hurt(0.5)} points of armor damage.`;
      } },
      { label: '[{crew}] Spoof a pirate transponder', role: 'slicer', run() {
        if (Math.random() < slicerOdds()) return '{crew}\'s fake transponder reads as one of their own. They wave you through with a rude gesture.';
        return `They see through it and open fire. ${hurt(0.2)} points of armor damage before you get clear.`;
      } },
      { label: 'Hard burn to outrun them (50 reaction mass)', can: () => G.state.fuel >= 50, run() {
        G.state.fuel -= 50;
        if (Math.random() < 0.7) return 'Eight g. The juice keeps you conscious, barely. When you can see again, they are gone.';
        return `You pull away, but not before they rake your hull for ${hurt(0.25)} points of armor damage.`;
      } },
    ],
  },
  {
    title: 'Drifting Cargo Container',
    text: 'Sensors flag an unmarked cargo container tumbling along your trajectory. No owner beacon.',
    choices: [
      { label: 'Grab it', can: () => cargoFree() > 0, run() {
        if (Math.random() < 0.2) return `Booby-trapped. The container detonates against your hull for ${hurt(0.2)} points of armor damage.`;
        const c = pick(COMMODITIES), tons = Math.min(cargoFree(), randInt(2, 8));
        G.state.cargo[c.id] = (G.state.cargo[c.id] || 0) + tons;
        return `Finders keepers: ${tons}t of ${c.name}, free.`;
      } },
      { label: 'Leave it', run: () => 'Nothing out here is ever really free. You let it tumble past.' },
    ],
  },
  {
    title: 'Stowaway',
    text: 'A skinny Belter kid unfolds from behind the cargo netting, blinking. "I just need to get off that rock. I can pay a little. Or I know things."',
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
    title: 'Derelict Ship',
    text: 'Your sensors pick up a derelict drifting dark, hull breached, no life signs. Salvage rights go to whoever gets there first.',
    choices: [
      { label: 'Match velocity and strip it', run() {
        delay(10);
        if (Math.random() < 0.6) {
          const c = randInt(10, 30) * 100;
          G.state.credits += c;
          return `You cut out the nav core and a crate of spare parts, worth ${fmt(c)} cr to the right buyer.`;
        }
        return `Something in the reactor section was still live. The blast costs you ${hurt(0.15)} points of armor.`;
      } },
      { label: 'Log it and keep burning', run: () => 'Whatever happened to them, it is not your business. You log the position and move on.' },
    ],
  },
  {
    title: 'Coolant Leak',
    text: 'Alarms. The reactor coolant loop has sprung a leak and the drive is running hot.',
    choices: [
      { label: '[{crew}] Handle it', role: 'engineer', run: () => '{crew} is in the coolant loop before the alarm finishes. "Go back to sleep, captain."' },
      { label: 'Suit up and patch it', run() {
        if (Math.random() < 0.5) return 'An hour in a vac suit with a sealant gun and some creative swearing. Good as new.';
        const lost = Math.min(G.state.fuel, 50);
        G.state.fuel -= lost;
        return `The patch fails and you vent ${lost} units of reaction mass before you get it sealed.`;
      } },
      { label: 'Throttle back and burn extra mass to cool it', run() {
        const lost = Math.min(G.state.fuel, 25);
        G.state.fuel -= lost;
        return `You spend ${lost} units of reaction mass and the temperature settles.`;
      } },
    ],
  },
  {
    title: 'Merchant Hail',
    text: 'A freighter on a parallel trajectory hails you. "Market tip, friend? Five hundred credits and it is yours."',
    choices: [
      { label: 'Buy the tip (500 cr)', can: () => G.state.credits >= 500, run() {
        G.state.credits -= 500;
        return `"${addRumor()}" The captain signs off with a wink.`;
      } },
      { label: 'No thanks', run: () => '"Your loss," they laugh, and drop off the channel.' },
    ],
  },
];

// ---------- transit ----------

function comm(text) {
  if (!G.transit) return;  // rumors can also arrive while docked
  G.transit.comms.push(text);
  if (G.transit.comms.length > 10) G.transit.comms.shift();
}

function transitSeconds(days) {
  return Math.max(TRANSIT_MIN, Math.min(TRANSIT_MAX, TRANSIT_MIN + days * 2));
}

function enterTransit() {
  const st = G.state, to = st.dest;
  const days = travelDays(st.systemId, to), total = transitSeconds(days);
  st.fuel -= burnFuel(st.systemId, to);
  st.dest = null;
  const count = 1 + Math.floor(total / 40);  // 2 to 4 happenings per burn
  G.transit = {
    to, days, total, left: total, event: null, comms: [], seen: [], flipped: false, angle: -Math.PI / 2,
    times: Array.from({ length: count }, (_, i) => total * (i + rand(0.3, 0.8)) / count),
    chatter: rand(5, 10),
  };
  G.mode = 'transit';
  G.npcs = []; G.shots = []; G.target = null;
  if (!G.transitStars) G.transitStars = Array.from({ length: 150 }, () => ({ x: Math.random(), y: Math.random(), z: rand(0.2, 1) }));
  comm(`Burn plotted for ${SYSTEMS[to].name}: ${days} days. Crash couches ready.`);
  const qm = roleHolder('quartermaster');
  if (qm) {
    comm(`${qm.first}: "Heard something at the last port."`);
    addRumor();
  }
}

function updateTransit(dt) {
  const t = G.transit;
  const progress = 1 - t.left / t.total;

  // Stars stream past faster toward the midpoint, then slow as we decelerate.
  const speed = 0.05 + Math.sin(Math.PI * Math.min(1, progress)) * 0.6;
  for (const s of G.transitStars) {
    s.x -= speed * s.z * dt;  // streaming past the cutaway, bow to the right
    if (s.x < 0) { s.x += 1; s.y = Math.random(); }
  }
  const want = t.flipped ? Math.PI / 2 : -Math.PI / 2;
  t.angle += Math.sign(want - t.angle) * Math.min(Math.abs(want - t.angle), 1.5 * dt);

  if (t.event) return;  // timer waits for the player's decision

  t.left -= dt;
  if (!t.flipped && progress >= 0.5) {
    t.flipped = true;
    comm('Midpoint. Flip and burn: cutting the drive, rotating, and decelerating.');
  }
  if ((t.chatter -= dt) <= 0) {
    t.chatter = rand(12, 20);
    const fill = (line, c) => line.replace('{first}', c.first).replace('{home}', c.home);
    const aboard = [
      ...crewMembers().flatMap(c => c.chatter || c.traits.map(t => fill(TRAITS[t].chatter, c))),
      ...paxAboard().filter(m => m.pid).map(m => G.state.people[m.pid]).flatMap(p => p.traits.map(t => `(passenger) ${fill(TRAITS[t].chatter, p)}`)),
    ];
    comm(pick(aboard.length && Math.random() < 0.6 ? aboard : CHATTER));
  }
  if (t.times.length && t.total - t.left >= t.times[0]) {
    t.times.shift();
    startHappening();
  }
  if (t.left <= 0) arrive();
}

// Passengers and crew storylines get first claim on a happening, then general
// events, then market rumors.
function startHappening() {
  const t = G.transit, flags = G.state.flags;
  const beat = storyTransitBeat();
  if (beat) return openEvent(beat);
  // (A handcrafted group renamed since the save was made has no event.)
  const pax = paxAboard().find(m => !m.eventDone && (m.story || m.pid || PASSENGERS[m.passenger]));
  if (pax && (pax.story || Math.random() < 0.5)) {
    pax.eventDone = true;
    return openEvent(pax.story ? storyPaxEvent(pax) : pax.pid ? passengerEvent(pax) : PASSENGERS[pax.passenger].event(pax));
  }
  const modEvent = Mods.filter('transitEvent', null);  // storylets, and mods
  if (modEvent) return openEvent(modEvent);
  const arcs = G.state.crew.filter(id => CREW[id] && CREW[id].events[flags[`${id}Arc`] || 0]);
  if (arcs.length && Math.random() < 0.4) {
    const id = pick(arcs), step = flags[`${id}Arc`] || 0;
    flags[`${id}Arc`] = step + 1;
    return openEvent(CREW[id].events[step]);
  }
  const crewEvent = Math.random() < 0.3 && crewTraitEvent();
  if (crewEvent) return openEvent(crewEvent);
  const fresh = TRANSIT_EVENTS.filter(e => !t.seen.includes(e));
  if (Math.random() < 0.55 && fresh.length) {
    const ev = pick(fresh);
    t.seen.push(ev);
    return openEvent(ev);
  }
  addRumor();
}

// The choice dialog, shared by transit events and hails (hail.js).
// Choices tagged with a crew role only appear when someone aboard fills it, and
// {crew} in their text becomes that crew member's name.
function openEvent(ev) {
  const choices = ev.choices.filter(c => !c.role || roleSkill(c.role))
    .map(c => (c.role ? { ...c, label: c.label.replace(/\{crew\}/g, roleName(c.role)) } : c));
  G.dialog = { event: ev, choices };
  Mods.emit('eventOpened', ev);
  if (G.transit) G.transit.event = ev;  // pauses the transit timer
  UI.showEvent(ev, choices);
}

function chooseEvent(i) {
  const c = G.dialog.choices[i], result = c.run();
  return c.role ? result.replace(/\{crew\}/g, roleName(c.role)) : result;
}

function finishEvent() {
  G.dialog = null;
  if (G.nextEvent) {  // a scene that leads straight into another
    const ev = G.nextEvent;
    G.nextEvent = null;
    return openEvent(ev);
  }
  if (G.mode === 'landed') return storyNextScene() || UI.show();  // back to the spaceport after a story scene
  if (G.mode === 'hail') G.mode = 'flight';
  else if (G.transit) G.transit.event = null;
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

function drawTransit(W, H) {
  const viewW = W - G.hudW, cx = viewW / 2, cy = H / 2, t = G.transit, st = G.state;
  const narrow = !G.hudW, top = narrow ? 84 : 0;  // clear the phone HUD strip
  ctx.fillStyle = '#02040a';
  ctx.fillRect(0, 0, viewW, H);

  for (const s of G.transitStars) {
    ctx.fillStyle = `rgba(200,215,255,${s.z})`;
    ctx.fillRect(s.x * viewW, s.y * H, s.z * 2, s.z * 2);
  }

  // Our ship in cutaway, with everyone aboard (shiplife.js). It turns at the midpoint.
  const L = Math.min(viewW - 60, 640), shipY = cy + 70;
  drawCutaway(cx, shipY, L);
  G.lifeY = shipY + L * 0.085 + 34;  // downtime buttons sit below it

  // Progress
  const barW = Math.min(420, viewW - 40), bx = cx - barW / 2;
  const progress = Math.min(1, 1 - t.left / t.total);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#cfe3ff';
  ctx.font = `600 18px ${LABEL_FONT}`;
  ctx.fillText(`IN TRANSIT  ${system().name} > ${SYSTEMS[t.to].name}`, cx, top + 34);
  ctx.fillStyle = '#1a2533';
  ctx.fillRect(bx, top + 46, barW, 8);
  ctx.fillStyle = '#7fb4ff';
  ctx.fillRect(bx, top + 46, barW * progress, 8);
  ctx.fillStyle = '#56687a';
  ctx.fillRect(cx - 1, top + 42, 2, 16);  // flip point
  const secs = Math.max(0, Math.ceil(t.left));
  ctx.font = '12px "IBM Plex Mono", monospace';
  ctx.fillStyle = '#9ab';
  ctx.fillText(`Day ${Math.floor(progress * t.days)} of ${t.days}  -  ${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')} remaining${t.event ? '  (paused)' : ''}`, cx, top + 72);

  // Comms log, top-left
  ctx.textAlign = 'left';
  const colW = narrow ? viewW - 40 : Math.min(360, viewW / 2 - 60), maxLines = narrow ? 9 : 16;
  let y = top + 110;
  ctx.fillStyle = '#9ab';
  ctx.fillText('COMMS', 20, y);
  // Show whole messages, newest last, as many as fit in 16 lines.
  let lines = [];
  for (let i = t.comms.length - 1; i >= 0; i--) {
    const c = t.comms[i], wrapped = wrapText(c, colW);
    if (lines.length + wrapped.length > maxLines) break;
    lines = wrapped.map(l => ({ l, recent: i === t.comms.length - 1, market: c.startsWith('[Market]') })).concat(lines);
  }
  for (const { l, recent, market } of lines) {
    ctx.fillStyle = market ? '#ffcf7f' : recent ? '#cfe3ff' : '#7d93aa';
    ctx.fillText(l, 20, y += 16);
  }

  // Ship's log, bottom-left
  const log = [];
  for (const m of st.missions) log.push(`${m.title} (due day ${m.deadline})`);
  if (!st.missions.length) log.push('No active missions.');
  if (st.crew.length) log.push(`Crew: ${crewMembers().map(c => `${fullName(c)} (${ROLE_NAMES[c.role]})`).join(', ')}`);
  const held = COMMODITIES.filter(c => st.cargo[c.id] > 0).map(c => `${st.cargo[c.id]}t ${c.name}`);
  log.push(`Cargo: ${held.length ? held.join(', ') : 'empty'}`);
  const logLines = log.flatMap(l => wrapText(l, viewW - (narrow ? 150 : 40)));  // clear the Map button on phones
  y = H - 20 - logLines.length * 16;
  ctx.fillStyle = '#9ab';
  ctx.fillText("SHIP'S LOG", 20, y);
  ctx.fillStyle = '#cfe3ff';
  for (const l of logLines) ctx.fillText(l, 20, y += 16);
}
