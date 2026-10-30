'use strict';

// Transit between locations: a long burn with a flip at the midpoint, plus choice
// events, market rumors, and comms chatter. Loaded before game.js; only calls into
// it at runtime.

const TRANSIT_MIN = 60, LIFE_SECS = 30;  // real seconds per burn: at least the minimum, else a downtime slot's worth for each (shiplife.js lifeSlotCount, a pick every couple of days of the leg)
const CHATTER_PER_BURN = 3;  // lines of the crew's chatter in one burn, spread over it; the plotted and midpoint lines are not counted

const CHATTER = [
  'Nav: trajectory nominal, drift within tolerance.',
  'Ice hauler "Mule\'s Promise" to all ships: anyone got a spare coolant pump?',
  'Compact Navy picket: routine sweep, no contacts.',
  'Somebody\'s broadcasting polka on the emergency band again.',
  'Crash couch: anti-g drip reservoir at 80 percent.',
  '"...and that\'s why you never play cards with a Pallas refinery crew." [laughter]',
  'Automated beacon: Ceres Station reports all docking bays open. Water ration unchanged.',
  'Courier "Swift Dispatch": running a hard burn, clear the approach please.',
  'Life support: CO2 scrubbers cycling.',
  'Unknown ship: "Anyone else see that drive plume? No transponder? Just me?"',
  'Dome Concord Navy: all vessels, maintain transponders in Martian space.',
  'Belt pirate radio: static, then a laugh, then static again.',
  'Reactor: output steady. Drive plume stable.',
  'Freighter "Second Wind" to nobody in particular: "Forty days out and I\'ve run out of things to say to the cat."',
  'An old recorded voice, on an old beacon: "This lane is maintained by the Ceres Water Authority. Please burn responsibly."',
  'Hauler "Long Odds": "Anybody running to Titan? I\'ve got a spare berth and a very bad sense of direction."',
  'Compact traffic control: reminder that lane fees are due on the first, and that "I forgot" isn\'t a payment method.',
  'A child, on an open band: "This is Captain Pip of the good ship Blanket Fort. Do you copy?"',
  'Ceres Water Authority relay: "Reminder to all vessels, water isn\'t a right, but it\'s a courtesy. Thank you for your understanding."',
  'Belt trader on the band: "Fresh onions! Real onions! Meet me at the flip, and bring your own bags!"',
  'Tug "Old Bess": "Anybody know a good doctor on Ganymede? Asking for a friend. The friend is my knee."',
  'Static, then faintly someone singing an old work song, and the tail of a chorus.',
  'Mars traffic: "All ships in the Phobos approach corridor, welcome, and please note that, yes, the coffee really is that good."',
  'Someone on the emergency band, in a small voice: "Testing. Testing. Is this thing on? Mom, it\'s on."',
  'Drive plume harmonics: a low, steady, contented hum. All quiet.',
  'A distant hauler broadcasts a recipe for fried dough. In the middle it apologizes and carries on.',
  'Luna control: "Please remember that the Copernicus Lounge isn\'t, in fact, an official navigation aid."',
  'Ring-ball commentary, faint and crackling, from a ship somewhere in the dark: "...and he SHOOTS, and he SCORES..."',
  'Nav: micrometeoroid flux low. Hull integrity nominal. Optimism, unofficially, high.',
  'A salvager on the band, cheerfully: "Anybody lose a left boot? Somebody lost a left boot. I have a hundred of them."',
  'Enceladus relay: "All ships, geyser activity is up today. Please enjoy responsibly, and don\'t fly through the plume."',
  'A young voice, on an open channel, awed: "I can see the whole ring from here. Is it always like this?"',
  'The ship\'s hull creaks, once, softly, as it cools in the long shadow. Nothing follows.',
  'A hauler crew, in unison, on the open band, singing "Happy Birthday" to a captain who is, from the sound of it, deeply embarrassed.',
  'Eros beacon: "Welcome to the Old Town. Half of us are still here, and the other half will be, shortly."',
  'Crew mess: somebody\'s arguing that soup counts as a beverage. The argument has been going for ninety minutes.',
  'Static, followed by a woman\'s voice, low and warm, reading the names of every ship that has ever left Ceres, one by one.',
];

const RUMORS = {
  up: [
    'Dockworkers on {p} have gone on strike. {c} is suddenly scarce there.',
    'A disease scare on {p} has everyone hoarding {c}.',
    'Customs on {p} seized a shipment of {c}. Buyers there are desperate.',
    'A corporate buying spree on {p} has cleared the shelves of {c}.',
    'A fire in a warehouse on {p} took most of the local stock of {c}, and nobody\'s saying how it started.',
    'A ceremonial feast on {p} has drained every last ounce of {c}, and the cooks are frantic.',
    'A ship carrying {c} to {p} was hijacked two weeks ago, and the shelves are getting bare.',
    'A new tax on {c} at {p} has, for reasons no one can explain, made it more valuable, not less.',
    'A big contract on {p} has swallowed the whole local supply of {c}, and the bidding has gone wild.',
    'A shipping delay has stranded a convoy of {c} on the way to {p}, and buyers are getting anxious.',
    'A cold snap on {p} has made {c} the only thing anyone wants to talk about.',
    'Word is that the governor of {p} is stockpiling {c} for a party, and will pay well over the odds.',
  ],
  down: [
    'Three haulers just unloaded {c} on {p}. Prices there are collapsing.',
    'Warehouses on {p} are overflowing with {c}. Sellers are dumping it cheap.',
    'A bumper output of {c} on {p} has the markets swamped.',
    'A strike ended on {p}, and every dock in town is suddenly flooded with {c}.',
    'A trade fair on {p} has brought in a great many merchants, and {c} is going for a song.',
    'A warehouse on {p} has been cleared out in a hurry, and the {c} is going, quite literally, for whatever anyone will pay.',
    'A rumor that {c} on {p} is contaminated has, for the moment, cratered the price, though everyone knows it\'s nonsense.',
    'A company on {p} has folded, and its whole stock of {c} is being sold off at auction.',
  ],
  // What the quartermaster says before the rumor, as the burn begins.
  lead: [
    '{first}: "Heard something at the last port."',
    '{first}: "I had a word with the dock clerk before we cast off. Here\'s what he let slip."',
    '{first}: "Overheard on the apron. Take it for what it\'s worth."',
    '{first}: "A man at the counter was certain of this. I\'m less certain."',
    '{first}: "Not confirmed, but the person who told me runs a warehouse."',
    '{first}: "The loaders were swapping stories on the way out. One of them was worth hearing."',
    '{first}: "I paid for a coffee and got this for free."',
    '{first}: "Another captain mentioned this at the berth. She had no reason to lie."',
  ],
};

// ---------- effect helpers used by events ----------

function hurt(frac) {
  const p = G.player, dmg = Math.round(p.maxArmor * frac);
  p.armor = Math.max(1, p.armor - dmg);
  return dmg;
}

const hasTradeCargo = () => Object.values(G.state.cargo).some(t => t > 0);

// Takes a share of the fullest good out of the hold, at the price paid for it; returns what went.
function shedCargo(frac) {
  const st = G.state;
  const cid = Object.keys(st.cargo).sort((a, b) => st.cargo[b] - st.cargo[a])[0];
  const held = st.cargo[cid], qty = Math.ceil(held * frac);
  if (st.paid[cid] !== undefined) st.paid[cid] *= (held - qty) / held;  // a contract's load has no price paid
  st.cargo[cid] -= qty;
  return { cid, qty };
}

function loseCargo(frac) {
  const { cid, qty } = shedCargo(frac);
  return `You jettison ${qty}t of ${goodName(cid)}.`;
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
    text = pickFresh(linedText('lines:market-rumors', RUMORS)[up ? 'up' : 'down'])
      .replace('{p}', p.name)
      .replace('{c}', goodName(cid));
  }
  st.rumors = st.rumors.filter(r => !(r.planet === p.name && r.cid === cid));
  const system = SYSTEMS[sid].name, tipSay = (key, vars) => sceneSay('scene:market-news', key, { text, system, ...vars });  // the words around a rumor are in the text layer too
  st.rumors.push({ planet: p.name, cid, mult: up ? rand(1.35, 1.6) : rand(0.55, 0.7), until: st.day + days, text: tipSay('where') });
  if (role().mayTab('trade')) comm(tipSay('comm', { days }));  // a tip is for a player who trades; a hand's comms are not filled with them (#854), and the inbox keeps it
  noteInbox('station', tipSay('where'), null, 'market');
  return text;
}

// ---------- events ----------

// The four a hired hand meets (#796) have an id, and their words are the lines of 'scene:<id>' (hiredscenes.js), read as they are shown; the game finds
// them by id, so a title the editor changes does not lose them. What a choice does, and its odds, are here.
const roadSay = (id, key, vars) => sceneSay(`scene:${id}`, key, vars);
const TRANSIT_EVENTS = [
  {
    id: 'distress-call',
    get title() { return roadSay('distress-call', 'title'); },
    via: 'ship',
    get text() { return roadSay('distress-call', 'text'); },
    choices: [
      { get label() { return roadSay('distress-call', 'help.label'); }, run() {
        delay(15);
        if (Math.random() < 0.65) {
          chainTo('dc-owner');
          return roadSay('distress-call', 'help.owner');
        }
        chainTo('dc-raiders');
        return roadSay('distress-call', 'help.bait', { armor: hurt(0.3) });
      } },
      { get label() { return roadSay('distress-call', 'stay.label'); }, run: () => (applyEffects({ later: { 'dc-silence': 9 } }), roadSay('distress-call', 'stay.result')) },
    ],
  },
  {
    id: 'pirates',
    get title() { return roadSay('pirates', 'title'); },
    via: 'ship',
    get text() { return roadSay('pirates', 'text'); },
    choices: [
      { get label() { return roadSay('pirates', 'pay.label'); }, cost: true, run() {
        const c = Math.min(G.state.credits, Math.max(5000, Math.round(G.state.credits * 0.1)));
        G.state.credits -= c;
        applyEffects({ later: { 'pi-subscription': 20 } });
        return roadSay('pirates', 'pay.result', { paid: fmt(c) });
      } },
      { get label() { return roadSay('pirates', 'dump.label'); }, ...gated(needGoods), run: () => roadSay('pirates', 'dump.result', { lost: loseCargo(0.5) }) },
      { key: 'fight', get label() { return roadSay('pirates', 'fight.label'); }, run: () => '' },  // a duel: engage.js sets what it does
      { get label() { return roadSay('pirates', 'spoof.label'); }, role: 'slicer', run() {
        if (Math.random() < slicerOdds()) return applyEffects({ later: { 'pi-brother': 12 } }) && roadSay('pirates', 'spoof.win');
        return roadSay('pirates', 'spoof.lose', { armor: hurt(0.2) });
      } },
      { key: 'burn', get label() { return roadSay('pirates', 'burn.label'); }, ...gated(needMass(50)), run: () => '' },  // a duel too (engage.js)
    ],
  },
  {
    title: 'Drifting Cargo Container',
    via: 'ship',
    text: ('Sensors flag an unmarked cargo container tumbling along your trajectory, a battered gray box the size of a small house, spinning, ' +
        'catching the sunlight at each turn. No beacon, no transponder, no markings but a faded serial number and a long white scar down one side. It ' +
        'could have fallen off a freighter last week, or last decade. Everyone in the cockpit is looking at it, and nobody says what they\'re ' +
        'thinking.'),
    choices: [
      { label: 'Grab it', ...gated(needRoom), run() {
        if (Math.random() < 0.2) return `Booby-trapped. The container detonates against your hull, a flat white flash and a slam that throws everything in the cockpit to the deck, for ${hurt(0.2)} points of armor damage. When the ringing stops, someone says, "Well. That's why they call it free."`;
        const c = pick(COMMODITIES), tons = Math.min(cargoFree(), randInt(2, 8));
        G.state.cargo[c.id] = (G.state.cargo[c.id] || 0) + tons;
        chainTo('co-contents');
        return (`You nudge alongside and cut the seal with a torch. For a moment nothing happens. Then the door swings open, and inside, strapped ` +
            `down, shining in the work lights: ${tons}t of ${c.name}, free. Finders keepers. You haul it aboard in a slow line, and that night at ` +
            `dinner somebody raises a glass to whoever lost it.`);
      } },
      { label: 'Leave it', run: () => ('Nothing out here\'s ever really free. You let it tumble past, turning and turning, a small gray moon on its ' +
          'way to nowhere, and watch it until it\'s a dot, and then not even that. Somebody, quietly, in the galley, says they\'d have liked to ' +
          'know what was inside. Nobody answers.') },
    ],
  },
  {
    title: 'Stowaway',
    via: 'crew', owner: 'captain',
    text: ('A skinny station kid unfolds from behind the cargo netting, blinking, cramped and stiff, with a smudge of grease along one cheek and a ' +
        'tattered rucksack clutched to their chest. They\'ve been in there for two days, living on packets of ration paste. They look at you, braced. ' +
        '"I just need to get off that rock," they say. "I can pay a little. Or I know things. I know a lot of things."'),
    choices: [
      { label: 'Charge them passage', run() {
        const c = randInt(3, 8) * 1000;
        G.state.credits += c;
        chainTo('st-where');
        return (`They hand over ${fmt(c)} cr in crumpled scrip, counted out on the galley table in small sticky bills. When the last one is down they ` +
            `let out a long breath. They curl up on the bench, still in their jacket, and are asleep in minutes, one hand closed around the rucksack. ` +
            `Someone puts a blanket over them.`);
      } },
      { label: '"What do you know?"', run: () => (applyEffects({ later: { 'st-tip': 10 } }), chainTo('st-where'), (
          `The kid grins, a quick lopsided grin, and drops their voice. "I sweep floors at the port office," they say. "You'd be amazed what ` +
          `people say around a broom." Then, with great importance: "${addRumor()}" You give the kid a bunk and a meal. In the morning you find they ` +
          `have cleaned the entire galley.`)) },
    ],
  },
  {
    id: 'derelict',
    get title() { return roadSay('derelict', 'title'); },
    via: 'ship',
    get text() { return roadSay('derelict', 'text'); },
    choices: [
      { get label() { return roadSay('derelict', 'strip.label'); }, run() {
        delay(10);
        if (Math.random() < 0.6) {
          const c = randInt(10, 30) * 1000;
          G.state.credits += c;
          chainTo('de-drawing');
          return roadSay('derelict', 'strip.win', { cr: fmt(c) });
        }
        return roadSay('derelict', 'strip.lose', { armor: hurt(0.15) });
      } },
      { get label() { return roadSay('derelict', 'log.label'); }, run: () => (applyEffects({ later: { 'de-claim': 8 } }), roadSay('derelict', 'log.result')) },
    ],
  },
  {
    id: 'coolant-leak',
    get title() { return roadSay('coolant-leak', 'title'); },
    via: 'crew', owner: 'engineer',
    get text() { return roadSay('coolant-leak', 'text'); },
    choices: [
      { get label() { return roadSay('coolant-leak', 'crew.label'); }, role: 'engineer', run: () => roadSay('coolant-leak', 'crew.result') },
      { get label() { return roadSay('coolant-leak', 'patch.label'); }, run() {
        chainTo('cl-aftermath');
        if (Math.random() < 0.5) return roadSay('coolant-leak', 'patch.win');
        const lost = Math.min(G.state.fuel, 50);
        G.state.fuel -= lost;
        return roadSay('coolant-leak', 'patch.lose', { lost });
      } },
      { get label() { return roadSay('coolant-leak', 'throttle.label'); }, run() {
        const lost = Math.min(G.state.fuel, 25);
        G.state.fuel -= lost;
        chainTo('cl-aftermath');
        return roadSay('coolant-leak', 'throttle.result', { lost });
      } },
    ],
  },
  {
    title: 'Merchant Hail',
    via: 'ship',
    text: ('A freighter on a parallel trajectory hails you, close enough that you can see her crew in the cockpit windows, and a cheerful, weathered ' +
        'face, and a cup raised in greeting. "Market tip, friend?" the captain says, in a voice like a well-worn saddle. "I\'ve been up and down ' +
        'these lanes forty years, and I hear things. Five thousand credits and it\'s yours. I promise you won\'t regret it. Usually."'),
    choices: [
      { label: 'Buy the tip (5,000 cr)', cost: true, ...gated(needCr(5000)), run() {
        G.state.credits -= 5000;
        applyEffects({ later: { [Math.random() < 0.6 ? 'me-good' : 'me-bad']: 10 } });
        return `The captain clears their throat and says, solemnly: "${addRumor()}" There's a pause. "That's the good stuff," they add. "I wouldn't sell it to just anyone." They sign off with a wink and a two-fingered salute, and in a few minutes their lights are a distant spark.`;
      } },
      { label: 'No thanks', run: () => (applyEffects({ later: { 'me-regret': 12 } }), '"Your loss," they laugh, not unkindly, and drop off the channel with a click. A few minutes later their running lights wink twice, and dwindle away.') },
    ],
  },
];

// ---------- transit ----------

function comm(text) {
  if (!G.transit) return;  // rumors can also arrive while docked
  if (isQuiet(text)) return;  // muted on the Comms screen
  G.transit.comms.push(text);
  if (G.transit.comms.length > 10) G.transit.comms.shift();
  announce(text);
}

function transitSeconds(days) {
  return Math.max(TRANSIT_MIN, lifeSlotCount(days) * LIFE_SECS);
}

function enterTransit() {
  const st = G.state, to = st.dest;
  const iceRun = !!(hired() && hired().run && hired().run.ice);  // the long run out to the ice and back (icerun.js)
  const days = iceRun ? iceDays(travelDays(st.systemId, to)) : travelDays(st.systemId, to), total = transitSeconds(days), fuelCost = burnFuel(st.systemId, to);
  st.fuel -= fuelCost;
  st.dest = null;
  const count = Math.max(iceRun ? 5 : 0, 1 + Math.floor(total / 40)) + (walkPending() ? 1 : 0);  // 2 to 4 happenings per burn, one more for the first officer's walk-through (captains.js)
  G.transit = {
    to, days, total, fuelCost, slots: lifeSlotCount(days), left: total, event: null, comms: [], seen: [], flipped: false, angle: -Math.PI / 2,
    times: Array.from({ length: count }, (_, i) => total * (i + rand(0.3, 0.8)) / count),
    chatter: rand(5, 10), chattered: 0,
  };
  G.mode = 'transit';
  G.cam = null;  // each burn starts with the camera snapped to the hand
  G.npcs = []; G.shots = []; G.target = null;
  if (!G.transitStars) G.transitStars = Array.from({ length: 150 }, () => ({ x: Math.random(), y: Math.random(), z: rand(0.2, 1) }));
  comm(`Burn plotted for ${SYSTEMS[to].name}: ${days} days. Crash couches ready.`);
  const qm = roleHolder('quartermaster');
  if (qm) {
    const lead = linedText('lines:market-rumors', RUMORS).lead;
    comm(lead[G.state.day % lead.length].replace('{first}', qm.first));  // by the day, and not by a draw, so the dice of the burn are the ones they were
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

  t.left -= dt * burnSpeed();  // the drive's power sets how fast the burn goes (engineering.js)
  t.elapsed = (t.elapsed || 0) + dt;
  if (!t.flipped && progress >= 0.5) {
    t.flipped = true;
    comm('Midpoint. Flip and burn: cutting the drive, rotating, and decelerating.');
  }
  if (t.chattered < CHATTER_PER_BURN && (t.chatter -= dt) <= 0) {
    t.chattered++;
    t.chatter = rand(0.7, 1.3) * (t.left / burnSpeed()) / (CHATTER_PER_BURN - t.chattered + 2);  // the next one, a share of what is left of the burn
    const fill = (line, c) => line.replace('{first}', c.first).replace('{home}', c.home);
    const aboard = [
      ...crewMembers().flatMap(c => c.chatter || c.traits.map(t => fill(pick(traitChatter(t)), c))),
      ...paxAboard().filter(m => m.pid).map(m => G.state.people[m.pid]).flatMap(p => p.traits.map(t => `(passenger) ${fill(pick(traitChatter(t)), p)}`)),
    ];
    const line = pickFresh(Mods.filter('chatter', aboard.length && Math.random() < 0.6 ? aboard : linedText('lines:comms-chatter', CHATTER)));
    if (!Settings.quiet.chatter) comm(line);
  }
  if (t.times.length && t.total - t.left >= t.times[0]) {
    t.times.shift();
    startHappening();
  }
  if (t.left <= 0) arrive();
}

// What happens on this burn is decided by pickHappening (happenings.js); a quiet
// burn gets a line of market rumor on the comms.
function startHappening() {
  const ev = pickHappening('transit');
  if (ev) return openEvent(ev);
  if (G.handled) { G.handled = false; return; }  // the comms officer took it (happenings.js)
  addRumor();
}

// The choice dialog, shared by transit events and hails (hail.js).
// Choices tagged with a crew role only appear when someone aboard fills it, and
// {crew} in their text becomes that crew member's name.
function openEvent(ev) {
  ev = hiredCall(ev);  // on the captain's ship, the captain's calls are the captain's (hired.js)
  // A choice can need your own trade: `post` is the post you must work, `skill` the level you must have reached there (a hired
  // hand's: hired.js). One for a post you do not work is hidden; one you have not the level for is shown, and cannot be taken.
  const hand = hired(), level = hand ? skillLevel(hand.post) : 0;
  const choices = ev.choices.filter(c => (!c.role || c.own || roleSkill(c.role)) && (c.post === undefined || (hand && hand.post === c.post)) && (c.skill === undefined || hand))
    .map(c => (c.role ? { ...c, label: c.label.replace(/\{crew\}/g, roleName(c.role)) } : c))
    .map(c => (c.skill === undefined ? c : { ...c, can: () => level >= c.skill && (!c.can || c.can()), why: () => (level < c.skill ? `Needs skill ${c.skill} at your post; you have ${level}.` : c.why && (typeof c.why === 'function' ? c.why() : c.why)) }))
    .map(c => (c.opinion === undefined ? c : opinionGate(c))).filter(Boolean);  // a choice that needs someone's regard (captains.js)
  G.dialog = { event: ev, choices };
  Mods.emit('eventOpened', ev);
  if (G.transit) G.transit.event = ev;  // pauses the transit timer
  UI.showEvent(ev, choices);
}

function chooseEvent(i) {
  const c = G.dialog.choices[i], result = G.dialog.event.personal ? c.run() : hiredFunds(() => c.run());  // a hired hand's burn events spend the ship's money, not theirs; their own affairs, their own
  return c.role && !c.keep ? result.replace(/\{crew\}/g, roleName(c.role)) : result;
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

// A translucent panel with a clipped corner, like the port screen's buttons.
// The canvas twin of the panels' glass (style.css, --glass): a clipped-corner plate, the line, and the accent glow from
// the top edge.
function glassPanel(x, y, w, h) {
  const c = 10;
  ctx.beginPath();
  ctx.moveTo(x, y); ctx.lineTo(x + w - c, y); ctx.lineTo(x + w, y + c); ctx.lineTo(x + w, y + h); ctx.lineTo(x, y + h); ctx.closePath();
  ctx.fillStyle = 'rgba(11,17,27,0.86)';
  ctx.fill();
  const glow = ctx.createLinearGradient(0, y, 0, y + 28);
  glow.addColorStop(0, 'rgba(127,180,255,0.10)'); glow.addColorStop(1, 'rgba(127,180,255,0)');
  ctx.fillStyle = glow;
  ctx.fill();
  ctx.strokeStyle = '#22384f';
  ctx.lineWidth = 1;
  ctx.stroke();
}

function transitPanel(x, y, w, h, title) {
  glassPanel(x, y, w, h);
  ctx.fillStyle = '#7fb4ff';
  ctx.fillRect(x, y, 3, h);
  ctx.font = `600 12px ${LABEL_FONT}`;
  ctx.fillStyle = '#8fb0d0';
  ctx.textAlign = 'left';
  ctx.fillText(title, x + 12, y + 16);
  ctx.font = '12px "IBM Plex Mono", monospace';
}

// The route strip: origin, destination, the flip, and where we are.
function drawRoute(cx, y, barW, progress, arrive = null) {
  const t = G.transit, bx = cx - barW / 2;
  const dot = (x, sid) => {
    ctx.fillStyle = SYSTEMS[sid].planets[0].color;
    ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(207,227,255,0.5)'; ctx.stroke();
  };
  ctx.lineCap = 'round';
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#1a2533';
  ctx.beginPath(); ctx.moveTo(bx, y); ctx.lineTo(bx + barW, y); ctx.stroke();
  const g = ctx.createLinearGradient(bx, 0, bx + barW, 0);
  g.addColorStop(0, '#3d6fb8'); g.addColorStop(1, '#9fd0ff');
  ctx.strokeStyle = g;
  ctx.beginPath(); ctx.moveTo(bx, y); ctx.lineTo(bx + barW * progress, y); ctx.stroke();
  ctx.lineCap = 'butt';
  ctx.lineWidth = 1;
  // The flip point.
  ctx.fillStyle = '#56687a';
  ctx.fillRect(cx - 1, y - 8, 2, 16);
  ctx.font = `600 12px ${LABEL_FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText('FLIP', cx, y + 20);
  dot(bx, G.state.systemId);
  dot(bx + barW, t.to);
  // The contract's due date (#686): said under the far end, in the warn color once the arrival is past it, with a tick on the bar where it falls inside the trip.
  const run = hired() && heldContract(hired()), due = run ? run.due : null;
  if (due !== null) {
    const late = transitEta(t) > due, at = (due - (run.day !== undefined ? run.day : G.state.day)) / t.days;
    ctx.fillStyle = late ? '#ff9a3c' : '#9ab';
    if (at > 0 && at < 1) ctx.fillRect(bx + barW * at - 1, y - 8, 2, 16);
    ctx.textAlign = 'right';
    ctx.fillText(`due ${dateOf(due)}`, bx + barW, y + 20);
  } else if (arrive) {  // no contract: the arrival in its place (a phone's bar, which has no dates line)
    ctx.fillStyle = '#9ab'; ctx.textAlign = 'right'; ctx.fillText(arrive, bx + barW, y + 20);
  }
  // Our ship: a chevron pointing the way the drive faces.
  const sx = bx + barW * progress, dir = t.flipped ? -1 : 1;
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.moveTo(sx + 6 * dir, y); ctx.lineTo(sx - 4 * dir, y - 5); ctx.lineTo(sx - 4 * dir, y + 5); ctx.closePath(); ctx.fill();
}

// A line cut to maxW in the current font, with an ellipsis where it was cut.
function fitLine(text, maxW) {
  if (ctx.measureText(text).width <= maxW) return text;
  let lo = 0, hi = text.length;
  while (lo < hi) { const m = Math.ceil((lo + hi) / 2); if (ctx.measureText(`${text.slice(0, m).trimEnd()}...`).width <= maxW) lo = m; else hi = m - 1; }
  return `${text.slice(0, lo).trimEnd()}...`;
}

// The scene dialog in the burn view's dock (burnLayout's dock box, in viewport px), as tall as its content up to the dock's height, or out
// of it when dock is null. Written only when it changed, so a resize with the dialog open follows on the next frame.
function dockEventPanel(el, dock) {
  const want = dock ? { '--dock-x': dock.x, '--dock-y': dock.y, '--dock-w': dock.w, '--dock-h': dock.h } : {};
  let moved = el.classList.contains('docked') !== !!dock;
  for (const k of ['--dock-x', '--dock-y', '--dock-w', '--dock-h']) {
    const v = k in want ? `${Math.round(want[k])}px` : '';
    if (el.style.getPropertyValue(k) !== v) { moved = true; if (v) el.style.setProperty(k, v); else el.style.removeProperty(k); }
  }
  el.classList.toggle('docked', !!dock);
  return moved;
}

// The bar over the ship: the ship and the route at the left, the route strip with its flip and the dates in the middle, and the speed
// over the drive's pull at the right. A phone's bar is too narrow for three columns, so it stacks them over the strip.
function drawBurnBar(b, dates, progress) {
  const t = G.transit, st = G.state, s = burnState(), label = px => `600 ${px}px ${LABEL_FONT}`, mono = px => `${px}px "IBM Plex Mono", monospace`;
  const put = (str, x, y, font, color, align = 'left', maxW = Infinity) => { ctx.font = font; ctx.fillStyle = color; ctx.textAlign = align; ctx.fillText(fitLine(str, maxW), x, y); };
  const width = (str, font) => { ctx.font = font; return ctx.measureText(str).width; };
  glassPanel(b.x, b.y, b.w, b.h);
  const title = `${shipTitle().toUpperCase()} IN TRANSIT`;
  const local = t.to === st.systemId && st.route && st.route.dock;  // a run inside one system (Earth to Luna) names the ports, not the system twice (#854)
  const route = local ? `${st.planet}  >  ${st.route.dock}` : `${system().name}  >  ${SYSTEMS[t.to].name}`;
  const pull = s.phase === 'FLIP' ? 'FLIP: drive off, weightless' : `${s.phase}: ${s.g.toFixed(2)} g thrust`, hot = Math.min(1, s.v / s.peak || 0);
  const speedColor = `rgb(${Math.round(150 + 90 * hot)},${Math.round(200 + 40 * hot)},255)`;
  const secs = Math.max(0, Math.ceil(t.left)), mss = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
  const clock = `${mss} remaining${t.event ? ' (paused)' : ''}`, short = `${mss}${t.event ? ' paused' : ''}`;  // the short one beside the speed on a phone
  const L = b.x + 14, R = b.x + b.w - 14;
  if (b.w >= 560) {
    const leftW = Math.min(b.w * 0.28, Math.max(width(route, label(18)), width(title, label(12))));
    const cw = dates ? 0 : width('88:88 paused', mono(12)) + 10;  // without the dates line the clock goes beside the speed
    const rightW = Math.max(width('88,888 km/s', `600 20px "IBM Plex Mono", monospace`) + cw, width('FLIP: drive off, weightless', mono(12)));  // the widest each can read, so the strip does not jump
    put(title, L, b.y + (dates ? 22 : 18), label(12), '#7fb4ff', 'left', leftW);
    put(route, L, b.y + (dates ? 46 : 40), label(18), '#e6f0ff', 'left', leftW);
    put(fmtKms(s.v), R, b.y + (dates ? 28 : 24), `600 20px "IBM Plex Mono", monospace`, speedColor, 'right');
    if (!dates) put(short, R - width(fmtKms(s.v), `600 20px "IBM Plex Mono", monospace`) - 10, b.y + 24, mono(12), '#9ab', 'right');
    put(pull, R, b.y + (dates ? 46 : 41), mono(12), '#8fb0d0', 'right');
    const x0 = L + leftW + 32, x1 = R - rightW - 32;
    drawRoute((x0 + x1) / 2, b.y + (dates ? 20 : 18), x1 - x0, progress);
    // Out to the columns' edges; the clock first, so a cut takes the dates. A tablet (the HUD strip, which shows today's date) says the
    // arrival before today's, so a cut takes today's.
    const now = dateOf(transitNow(t)), eta = dateOf(transitEta(t)), line = G.hudW ? `${clock} - ${now}, arriving ${eta}` : `${clock} - arriving ${eta}, today ${now}`;
    if (dates) put(line, (x0 + x1) / 2, b.y + 58, mono(12), '#9ab', 'center', x1 - x0 + 56);
  } else if (dates) {  // a phone: the title and the clock and speed, the route and the pull, then the strip; no room for the dates (today's is on the HUD strip)
    const sw = width(fmtKms(s.v), `600 15px "IBM Plex Mono", monospace`), cw = width(short, mono(12)), gw = width(pull, mono(12));
    const arr = `arr. ${dateOf(transitEta(t))}`, aw = width(arr, mono(12)), beside = R - L - sw - cw - aw - 34 >= 100;  // beside the clock while the title keeps 100 px
    put(title, L, b.y + 16, label(12), '#7fb4ff', 'left', R - L - sw - cw - 24 - (beside ? aw + 10 : 0));
    put(short, R - sw - 10, b.y + 16, mono(12), '#9ab', 'right');
    if (beside) put(arr, R - sw - cw - 20, b.y + 16, mono(12), '#9ab', 'right');
    put(fmtKms(s.v), R, b.y + 16, `600 15px "IBM Plex Mono", monospace`, speedColor, 'right');
    put(route, L, b.y + 33, label(14), '#e6f0ff', 'left', R - L - gw - 12);
    put(pull, R, b.y + 33, mono(12), '#8fb0d0', 'right');
    drawRoute((L + R) / 2, b.y + 45, R - L - 12, progress, beside ? null : arr);  // else under the strip's far end, where there is no due date
  } else {  // a short phone: the route, the clock and the speed over the strip
    const sw = width(fmtKms(s.v), `600 15px "IBM Plex Mono", monospace`), cw = width(short, mono(12));
    put(route, L, b.y + 15, label(14), '#e6f0ff', 'left', R - L - sw - cw - 24);
    put(short, R - sw - 10, b.y + 15, mono(12), '#9ab', 'right');
    put(fmtKms(s.v), R, b.y + 15, `600 15px "IBM Plex Mono", monospace`, speedColor, 'right');
    drawRoute((L + R) / 2, b.y + 25, R - L - 12, progress);
  }
  ctx.textAlign = 'left';
}

// The Comms ticker under the ship: the last n messages, the newest brighter. On a wide screen one line each, cut to fit; on a narrow
// one they wrap to fill the box, the newest first to be kept whole.
function drawCommsTicker(b, comms, n, wrap) {
  transitPanel(b.x, b.y, b.w, b.h, 'COMMS');
  const w = b.w - 24, msgs = comms.slice(-n), color = (m, newest) => (m.startsWith('[Market]') ? '#ffcf7f' : newest ? '#cfe3ff' : '#7d93aa');
  let rows = [];
  if (wrap) {
    const max = Math.max(1, Math.floor((b.h - 30) / 16));
    for (let i = msgs.length - 1; i >= 0 && rows.length < max; i--) {
      let lines = wrapText(msgs[i], w);
      const room = max - rows.length;
      if (lines.length > room) { lines[room - 1] = fitLine(`${lines[room - 1]} ${lines[room]}`, w); lines = lines.slice(0, room); }  // cut, with an ellipsis
      rows = lines.map(l => ({ l, c: color(msgs[i], i === msgs.length - 1) })).concat(rows);
    }
  } else rows = msgs.map((m, i) => ({ l: fitLine(m, w), c: color(m, i === msgs.length - 1) }));
  const first = b.y + (b.h >= 60 ? 38 : 32), step = wrap ? 16 : 20;
  rows.forEach((r, i) => { ctx.fillStyle = r.c; ctx.fillText(r.l, b.x + 12, first + i * step); });
}

// The ship's log for a burn (it was the canvas box at the bottom left; now the HUD sidebar and the Comms sheet draw it): what the owner has on the books, then what is aboard. The
// carried contract (#686) is the captain's log line: the load, the shipper, the due date, and whether the ship is on time for it. Reads only what it is given.
function shipLogLines(st, t, carried, crewNames = []) {
  const log = [], owner = roleOf(st.hired).canTrade;
  for (const m of st.missions) log.push(`${m.title} (due ${dateOf(m.deadline)})`);
  if (owner) {  // the owner's books: the empty-missions line and the crew (named by the caller)
    if (!st.missions.length) log.push('No active missions.');
    if (crewNames.length) log.push(`Crew: ${crewNames.join(', ')}`);
  }
  const held = COMMODITIES.filter(c => st.cargo[c.id] > 0).map(c => `${st.cargo[c.id]}t ${c.name}`);
  if (carried) {
    const lateBy = transitEta(t) - carried.due;
    log.push(`${carried.tons}t ${goodName(carried.good)} for ${carried.shipper}, due ${dateOf(carried.due)}, ${lateBy > 0 ? `late by ${dayWord(lateBy)}` : 'on time'}`);
  } else log.push(`Cargo: ${held.length ? held.join(', ') : 'empty'}`);
  return log;
}

// The log for the burn in progress, or none: the one place the lines are read from the game (the HUD and the Comms sheet ask here).
const burnShipLog = () => (G.transit ? shipLogLines(G.state, G.transit, hired() && heldContract(hired()), crewMembers().map(c => `${fullName(c)} (${ROLE_NAMES[c.role]})`)) : []);

// The burn view, laid out by burnLayout (burnlayout.js): the bar of the route and the burn on top, the ship cutaway as the stage, and the
// Comms ticker under it, or the tutorial's prompt in its place. The downtime buttons (shiplife.js) and the bridge keys are DOM below.
function drawTransit(W, H) {
  const viewW = W - G.hudW, cy = H / 2, t = G.transit;
  const narrow = !G.hudW;  // the HUD strip on top
  const progress = Math.min(1, 1 - t.left / t.total);
  const panel = t.event && document.querySelector('#panel.event');
  const dialogSize = panel ? { h: panel.scrollHeight + panel.offsetHeight - panel.clientHeight } : null;  // the content and the panel's border, which max-height includes (border-box)
  const prompt = tutorialPrompt(viewW - 2 * BURN_GUTTER);  // the tutorial's prompt, at the ticker's width: the layout keeps room for it
  const L = burnLayout(W, H, G.hudW, narrow, dialogSize, prompt ? prompt.h : 0), shipBox = L.ship;
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#03060f'); bg.addColorStop(1, '#070b18');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, viewW, H);
  // Faint glow of the destination ahead of us, and the sun behind.
  const glow = (x, y, r, color) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  };
  glow(viewW * 0.92, cy - H * 0.2, H * 0.55, 'rgba(60,90,160,0.16)');
  glow(viewW * 0.05, cy + H * 0.3, H * 0.45, 'rgba(160,110,60,0.08)');

  // Stars streak with our speed: longest at the midpoint, with a fading tail, and a few long lines when we are really moving. They turn
  // with the ship about the cutaway's centre (0 before the flip, half a turn after), wrapped so they fill the view at any angle.
  const speed = 0.05 + Math.sin(Math.PI * progress) * 0.6, still = Settings.reduceMotion;
  const a = t.angle + Math.PI / 2, ca = Math.cos(a), sa = Math.sin(a), ox = shipBox.x + shipBox.w / 2, oy = shipBox.y + shipBox.h / 2, wrap = (v, m) => ((v % m) + m) % m;
  const streak = (x, y, draw) => { const dx = x - ox, dy = y - oy; ctx.save(); ctx.translate(wrap(ox + dx * ca - dy * sa, viewW), wrap(oy + dx * sa + dy * ca, H)); ctx.rotate(a); draw(); ctx.restore(); };
  for (const s of G.transitStars) {
    const len = Math.max(s.z * 2, speed * s.z * s.z * (still ? 8 : 110)), w = s.z > 0.7 ? 2 : 1, hot = Math.min(1, speed * 1.4);
    streak(s.x * viewW, s.y * H, () => {
      for (let i = 0; i < 3; i++) {  // head, body and a fainter tail
        ctx.fillStyle = `rgba(${200 + 40 * hot * (1 - i / 3)},${215 + 30 * hot * (1 - i / 3)},255,${s.z * (0.85 - i * 0.28)})`;
        ctx.fillRect((len * i) / 3, 0, len / 3 + 1, w);
      }
    });
  }
  if (!still && speed > 0.2) {
    for (let i = 0; i < 26; i++) {
      const lane = (i * 0.618033) % 1, rate = 0.5 + (i % 5) * 0.22, phase = (i * 0.37 + G.time * speed * 0.35 * rate) % 1, len = speed * (120 + (i % 4) * 70);
      ctx.fillStyle = `rgba(150,195,255,${Math.min(0.3, (speed - 0.2) * 0.5)})`;
      streak(viewW * (1 - phase), shipBox.y + lane * shipBox.h, () => ctx.fillRect(0, 0, len, 1));  // across the ship's band, clear of the bar and the keys
    }
  }

  // The destination ahead, growing with progress: one 40px sprite drawn scaled, lit from the sun behind us. In the ship box's top right,
  // behind the nose, drawn first so the hull covers it. Not on a narrow screen, where the ship takes the box's width.
  let destBox = null;
  if (!narrow) {
    const dest = SYSTEMS[t.to].planets[0], dx = shipBox.x + shipBox.w - 56, dy = shipBox.y + 44, k = (8 + 32 * progress) / 40;
    ctx.save(); ctx.translate(dx, dy); ctx.scale(k, k);
    drawBody({ name: dest.name, color: dest.color, r: 40 }, 0, 0, { sun: { angle: Math.PI, strength: 1 } });
    ctx.restore();
    destBox = { x: dx - 40, y: dy - 40, w: 80, h: 80 };
  }

  // Our ship in cutaway, with everyone aboard (shiplife.js), in the box the layout gives it; the camera keeps the hand in the part a
  // docked dialog leaves clear.
  drawCutaway(shipBox, L.clear);
  G.burnBoxes = { bar: L.bar, ship: shipBox };  // where each block was drawn, for the taps and the tests (#262)
  if (L.dock) Object.assign(G.burnBoxes, { dock: L.dock, clear: L.clear });  // a scene's dock (the frame puts the dialog in it) and the ship it leaves clear
  if (destBox) G.burnBoxes.dest = destBox;
  G.lifeY = L.life.y;  // the downtime buttons sit in the row of life under the ticker
  drawBurnBar(L.bar, L.datesLine, progress);

  // The ticker, clear of the dock: beside it on a wide screen, under it (so not drawn) on a narrow one. None on a landscape phone.
  const dock = L.dock;
  let tick = L.tickerLines ? { ...L.ticker } : null;
  if (tick && dock && !narrow) tick.w = Math.min(tick.w, dock.x - BURN_GUTTER - tick.x);
  if (tick && dock && narrow && tick.y + tick.h > dock.y - 4) tick = null;
  if (!tick || tick.w < 160) return;
  if (prompt && !dock) {  // drawn by the tutorial (tutorial.js) in the ticker's place (#735); hidden while a scene is open, which is what to read then
    G.burnBoxes.tutorial = tick;
    return;
  }
  G.burnBoxes.ticker = tick;
  drawCommsTicker(tick, t.comms, L.tickerLines, narrow);
}
