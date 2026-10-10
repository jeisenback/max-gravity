'use strict';

// Transit between locations: a long burn with a flip at the midpoint, plus choice
// events, market rumors, and comms chatter. Loaded before game.js; only calls into
// it at runtime.

const TRANSIT_MIN = 60, TRANSIT_MAX = 120;  // real seconds per burn, scaled by travel days

const CHATTER = [
  'Nav: trajectory nominal, drift within tolerance.',
  'Ice hauler "Mule\'s Promise" to all ships: anyone got a spare coolant pump?',
  'Compact Navy picket: routine sweep, no contacts.',
  'Somebody is broadcasting polka on the emergency band again.',
  'Crash couch: anti-g drip reservoir at 80 percent.',
  '"...and that is why you never play cards with a Pallas refinery crew." [laughter]',
  'Automated beacon: Ceres Station reports all docking bays open. Water ration unchanged.',
  'Courier "Swift Dispatch": running a hard burn, clear the approach please.',
  'Life support: CO2 scrubbers cycling.',
  'Unknown ship: "Anyone else see that drive plume? No transponder? Just me?"',
  'Dome Concord Navy: all vessels, maintain transponders in Martian space.',
  'Belt pirate radio: static, then a laugh, then static again.',
  'Reactor: output steady. Drive plume stable.',
  'Freighter "Second Wind" to nobody in particular: "Forty days out and I have run out of things to say to the cat."',
  'An old recorded voice, on an old beacon: "This lane is maintained by the Ceres Water Authority. Please burn responsibly."',
  'Hauler "Long Odds": "Anybody running to Titan? I have got a spare berth and a very bad sense of direction."',
  'Compact traffic control: reminder that lane fees are due on the first, and that "I forgot" is not a payment method.',
  'A child, on an open band: "This is Captain Pip of the good ship Blanket Fort. Do you copy?"',
  'Ceres Water Authority relay: "Reminder to all vessels, water is not a right, but it is a courtesy. Thank you for your understanding."',
  'Belt trader on the band: "Fresh onions! Real onions! Meet me at the flip, and bring your own bags!"',
  'Tug "Old Bess": "Anybody know a good doctor on Ganymede? Asking for a friend. The friend is my knee."',
  'Static, then faintly someone singing an old work song, and the tail of a chorus.',
  'Mars traffic: "All ships in the Phobos approach corridor, welcome, and please note that, yes, the coffee really is that good."',
  'Someone on the emergency band, in a small voice: "Testing. Testing. Is this thing on? Mom, it is on."',
  'Drive plume harmonics: a low, steady, contented hum. All quiet.',
  'A distant hauler broadcasts a recipe for fried dough. In the middle it apologizes and carries on.',
  'Luna control: "Please remember that the Copernicus Lounge is not, in fact, an official navigation aid."',
  'Ring-ball commentary, faint and crackling, from a ship somewhere in the dark: "...and he SHOOTS, and he SCORES..."',
  'Nav: micrometeoroid flux low. Hull integrity nominal. Optimism, unofficially, high.',
  'A salvager on the band, cheerfully: "Anybody lose a left boot? Somebody lost a left boot. I have a hundred of them."',
  'Enceladus relay: "All ships, geyser activity is up today. Please enjoy responsibly, and do not fly through the plume."',
  'A young voice, on an open channel, awed: "I can see the whole ring from here. Is it always like this?"',
  'The ship\'s hull creaks, once, softly, as it cools in the long shadow. Nothing follows.',
  'A hauler crew, in unison, on the open band, singing "Happy Birthday" to a captain who is, from the sound of it, deeply embarrassed.',
  'Eros beacon: "Welcome to the Old Town. Half of us are still here, and the other half will be, shortly."',
  'Crew mess: somebody is arguing that soup counts as a beverage. The argument has been going for ninety minutes.',
  'Static, followed by a woman\'s voice, low and warm, reading the names of every ship that has ever left Ceres, one by one.',
];

const RUMORS = {
  up: [
    'Dockworkers on {p} have gone on strike. {c} is suddenly scarce there.',
    'A disease scare on {p} has everyone hoarding {c}.',
    'Customs on {p} seized a shipment of {c}. Buyers there are desperate.',
    'A corporate buying spree on {p} has cleared the shelves of {c}.',
    'A fire in a warehouse on {p} took most of the local stock of {c}, and nobody is saying how it started.',
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
    'A rumor that {c} on {p} is contaminated has, for the moment, cratered the price, though everyone knows it is nonsense.',
    'A company on {p} has folded, and its whole stock of {c} is being sold off at auction.',
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
  noteInbox('station', `${text} (${SYSTEMS[sid].name})`, null, 'market');
  return text;
}

// ---------- events ----------

const TRANSIT_EVENTS = [
  {
    title: 'Distress Call',
    via: 'ship',
    text: ('A signal cuts through the static: "...reactor scram... life support failing... anyone..." The voice is thin and cracked. A private yacht ' +
        'is drifting ballistic just off your trajectory, small and dark, with a single tumbling running light. There is no other traffic within a ' +
        'day\'s burn. Whoever is aboard has not much air left.'),
    choices: [
      { label: 'Kill your burn and help (costs time)', run() {
        delay(15);
        if (Math.random() < 0.65) {
          chainTo('dc-owner');
          return ('You match velocity, and cross in suits, and find three people in the yacht\'s galley, gray-faced, wrapped in blankets, breathing ' +
              'in shallow sips. You patch their air recyclers with a borrowed part, and share some rations, and stay until the color returns to their ' +
              'cheeks. The owner, a rich man in a torn silk shirt, grips your hand so hard it hurts. "I will not forget this," he says.');
        }
        chainTo('dc-raiders');
        return (`It was bait. Two raiders light their drives the moment you match velocity, dark shapes swinging out from behind the yacht\'s hull, ` +
            `guns already hot. The "life support failure" was a recording, looping on a dead panel. You break away, hard, with ${hurt(0.3)} points of ` +
            `armor damage and a long, ringing anger, at yourself, at them, at a universe in which this works.`);
      } },
      { label: 'Stay on course', run: () => (applyEffects({ later: { 'dc-silence': 9 } }), ('You tune out the signal, and tell yourself it is ' +
          'probably a trap, and it probably is. It fades behind you, thinner and thinner, until it is just a whisper in the static, and then it stops. ' +
          'You do not sleep well, that night, and you do not know whether it is because of the voice or because of the silence that followed.')) },
    ],
  },
  {
    title: 'Pirates Matching Course',
    via: 'ship',
    text: ('A dark ship with no transponder slides in off your quarter and matches your burn, close enough that you can see the scars on her hull, ' +
        'and paints you with targeting lidar, a cold red pulse across your instruments. A voice on the open band, amused and very young: "Cargo or ' +
        'credits, hoser. Your choice." Behind it, in the noise, someone is laughing, and someone else is quietly counting.'),
    choices: [
      { label: 'Pay them off (10% of your credits)', run() {
        const c = Math.min(G.state.credits, Math.max(500, Math.round(G.state.credits * 0.1)));
        G.state.credits -= c;
        applyEffects({ later: { 'pi-subscription': 20 } });
        return `You transfer ${fmt(c)} cr. They peel off with a flash of their running lights, three long, one short, and on the open band a last, cheerful "Safe burn, hoser." You sit in the quiet with your hand still on the transfer key.`;
      } },
      { label: 'Dump half your biggest cargo', ...gated(needGoods), run: () => (`${loseCargo(0.5)} The crates tumble away into the dark, spinning and ` +
          `glinting. The pirates chase them down, whooping on the channel, while you burn on. You watch their running lights dwindle, and try not to ` +
          `do the arithmetic.`) },
      { label: 'Fight', run: () => '' },  // a duel: engage.js sets what it does
      { label: '[{crew}] Spoof a pirate transponder', role: 'slicer', run() {
        if (Math.random() < slicerOdds()) return applyEffects({ later: { 'pi-brother': 12 } }) && ('{crew}\'s fake transponder reads as one of their ' +
            'own, with a scrawled skull for good measure. They wave you through with a rude gesture, and one of them calls you "brother" over the ' +
            'channel. You do not answer. Your hands on the controls are not steady.');
        return `They see through it in seconds and open fire. ${hurt(0.2)} points of armor damage before you get clear, and {crew} sits still afterward, mouthing a numbered list of what went wrong.`;
      } },
      { label: 'Hard burn to outrun them (50 reaction mass)', ...gated(needMass(50)), run: () => '' },  // a duel too (engage.js)
    ],
  },
  {
    title: 'Drifting Cargo Container',
    via: 'ship',
    text: ('Sensors flag an unmarked cargo container tumbling along your trajectory, a battered gray box the size of a small house, spinning, ' +
        'catching the sunlight at each turn. No beacon, no transponder, no markings but a faded serial number and a long white scar down one side. It ' +
        'could have fallen off a freighter last week, or last decade. Everyone in the cockpit is looking at it, and nobody says what they are ' +
        'thinking.'),
    choices: [
      { label: 'Grab it', ...gated(needRoom), run() {
        if (Math.random() < 0.2) return `Booby-trapped. The container detonates against your hull, a flat white flash and a slam that throws everything in the cockpit to the deck, for ${hurt(0.2)} points of armor damage. When the ringing stops, someone says, "Well. That is why they call it free."`;
        const c = pick(COMMODITIES), tons = Math.min(cargoFree(), randInt(2, 8));
        G.state.cargo[c.id] = (G.state.cargo[c.id] || 0) + tons;
        chainTo('co-contents');
        return (`You nudge alongside and cut the seal with a torch. For a moment nothing happens. Then the door swings open, and inside, strapped ` +
            `down, shining in the work lights: ${tons}t of ${c.name}, free. Finders keepers. You haul it aboard in a slow line, and that night at ` +
            `dinner somebody raises a glass to whoever lost it.`);
      } },
      { label: 'Leave it', run: () => ('Nothing out here is ever really free. You let it tumble past, turning and turning, a small gray moon on its ' +
          'way to nowhere, and watch it until it is a dot, and then not even that. Somebody, quietly, in the galley, says they would have liked to ' +
          'know what was inside. Nobody answers.') },
    ],
  },
  {
    title: 'Stowaway',
    via: 'crew', owner: 'captain',
    text: ('A skinny station kid unfolds from behind the cargo netting, blinking, cramped and stiff, with a smudge of grease along one cheek and a ' +
        'tattered rucksack clutched to their chest. They have been in there for two days, living on packets of ration paste. They look at you, braced. ' +
        '"I just need to get off that rock," they say. "I can pay a little. Or I know things. I know a lot of things."'),
    choices: [
      { label: 'Charge them passage', run() {
        const c = randInt(3, 8) * 100;
        G.state.credits += c;
        chainTo('st-where');
        return (`They hand over ${fmt(c)} cr in crumpled scrip, counted out on the galley table in small sticky bills. When the last one is down they ` +
            `let out a long breath. They curl up on the bench, still in their jacket, and are asleep in minutes, one hand closed around the rucksack. ` +
            `Someone puts a blanket over them.`);
      } },
      { label: '"What do you know?"', run: () => (applyEffects({ later: { 'st-tip': 10 } }), chainTo('st-where'), (
          `The kid grins, a quick lopsided grin, and drops their voice. "I sweep floors at the port office," they say. "You would be amazed what ` +
          `people say around a broom." Then, with great importance: "${addRumor()}" You give the kid a bunk and a meal. In the morning you find they ` +
          `have cleaned the entire galley.`)) },
    ],
  },
  {
    title: 'Derelict Ship',
    via: 'ship',
    text: ('Your sensors pick up a derelict drifting dark, an old ore hauler with her hull breached, her running lights out, and a long black scorch ' +
        'mark down one side. No transponder, no life signs, no heat signature. She has been dead a long time. Salvage rights go to whoever gets there ' +
        'first, and the cockpit has gone quiet.'),
    choices: [
      { label: 'Match velocity and strip it', run() {
        delay(10);
        if (Math.random() < 0.6) {
          const c = randInt(10, 30) * 100;
          G.state.credits += c;
          chainTo('de-drawing');
          return (`You go aboard in suits, through a tangle of cold, dark passages, past frozen coffee bulbs and a child\'s drawing pinned to a ` +
              `bulkhead, and cut out the nav core and a crate of spare parts, worth ${fmt(c)} cr to the right buyer. On the way out, you do not look ` +
              `at the drawing. You almost make it.`);
        }
        return `Something in the reactor section was still live. A blue-white flash, a slam like a hammer, and the blast, as you scramble for the airlock, costs you ${hurt(0.15)} points of armor, and leaves your ears ringing for an hour. You do not go back for the parts. Nobody suggests it.`;
      } },
      { label: 'Log it and keep burning', run: () => (applyEffects({ later: { 'de-claim': 8 } }), ('Whatever happened to them, it is not your ' +
          'business. You log the position, the ship\'s name and the time, and move on. Behind you the dead ship dwindles. Someone in the galley keeps ' +
          'watching the screen, and nobody says why.')) },
    ],
  },
  {
    title: 'Coolant Leak',
    via: 'crew', owner: 'engineer',
    text: ('Alarms. A shrill wail goes through the whole ship, and on the reactor panel a line of lights goes from green to amber to red, one after ' +
        'another. The coolant loop has sprung a leak somewhere in the tangle of pipes behind the drive housing, and the drive is running hotter every ' +
        'minute, with a metallic ticking. The corridor smells of burnt glycol. Everyone is looking at you.'),
    choices: [
      { label: '[{crew}] Handle it', role: 'engineer', run: () => ('{crew} is in the coolant loop before the alarm finishes, sleeves rolled, one hand ' +
          'already on the valve. For twenty minutes there is only the sound of tools, and the hiss of venting steam, and low muttering. Then the ' +
          'lights go back to green, one by one. "Go back to sleep, captain," {crew} says, wiping their hands, black to the elbows.') },
      { label: 'Suit up and patch it', run() {
        chainTo('cl-aftermath');
        if (Math.random() < 0.5) return ('An hour in a vac suit with a sealant gun and some swearing, wedged into a space the size of a coffin, with ' +
            'a flashlight in your teeth and a hot jet hissing at your elbow. Near the end of the hour the hiss stops. Good as new. You crawl out, ' +
            'drenched, and someone hands you a cup of tea without a word.');
        const lost = Math.min(G.state.fuel, 50);
        G.state.fuel -= lost;
        return (`The patch fails, in a spray of hot white vapor, and you vent ${lost} units of reaction mass before you get it sealed, on the second ` +
            `try, with a great deal of swearing and a scorched sleeve. When it holds, at last, you slide down the wall and sit on the deck, laughing, ` +
            `because it is that or something else.`);
      } },
      { label: 'Throttle back and burn extra mass to cool it', run() {
        const lost = Math.min(G.state.fuel, 25);
        G.state.fuel -= lost;
        chainTo('cl-aftermath');
        return (`You throttle back, watching the needles, and burn ${lost} units of reaction mass through the leak in a long controlled sigh, and the ` +
            `temperature settles, degree by degree. It is not elegant and it is not cheap. The drive is quiet again, and in the corridor the smell of ` +
            `glycol begins to fade.`);
      } },
    ],
  },
  {
    title: 'Merchant Hail',
    via: 'ship',
    text: ('A freighter on a parallel trajectory hails you, close enough that you can see her crew in the cockpit windows, and a cheerful, weathered ' +
        'face, and a cup raised in greeting. "Market tip, friend?" the captain says, in a voice like a well-worn saddle. "I have been up and down ' +
        'these lanes forty years, and I hear things. Five hundred credits and it is yours. I promise you will not regret it. Usually."'),
    choices: [
      { label: 'Buy the tip (500 cr)', ...gated(needCr(500)), run() {
        G.state.credits -= 500;
        applyEffects({ later: { [Math.random() < 0.6 ? 'me-good' : 'me-bad']: 10 } });
        return `The captain clears their throat and says, solemnly: "${addRumor()}" There is a pause. "That is the good stuff," they add. "I would not sell it to just anyone." They sign off with a wink and a two-fingered salute, and in a few minutes their lights are a distant spark.`;
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
  return Math.max(TRANSIT_MIN, Math.min(TRANSIT_MAX, TRANSIT_MIN + days * 2));
}

function enterTransit() {
  const st = G.state, to = st.dest;
  const iceRun = !!(hired() && hired().run && hired().run.ice);  // the long run out to the ice and back (icerun.js)
  const days = iceRun ? iceDays(travelDays(st.systemId, to)) : travelDays(st.systemId, to), total = transitSeconds(days), fuelCost = burnFuel(st.systemId, to);
  st.fuel -= fuelCost;
  st.dest = null;
  const count = Math.max(iceRun ? 5 : 0, 1 + Math.floor(total / 40)) + (walkPending() ? 1 : 0);  // 2 to 4 happenings per burn, one more for the first officer's walk-through (captains.js)
  G.transit = {
    to, days, total, fuelCost, left: total, event: null, comms: [], seen: [], flipped: false, angle: -Math.PI / 2,
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

  t.left -= dt * burnSpeed();  // the drive's power sets how fast the burn goes (engineering.js)
  t.elapsed = (t.elapsed || 0) + dt;
  if (!t.flipped && progress >= 0.5) {
    t.flipped = true;
    comm('Midpoint. Flip and burn: cutting the drive, rotating, and decelerating.');
  }
  if ((t.chatter -= dt) <= 0) {
    t.chatter = rand(12, 20);
    const fill = (line, c) => line.replace('{first}', c.first).replace('{home}', c.home);
    const aboard = [
      ...crewMembers().flatMap(c => c.chatter || c.traits.map(t => fill(pick(traitChatter(t)), c))),
      ...paxAboard().filter(m => m.pid).map(m => G.state.people[m.pid]).flatMap(p => p.traits.map(t => `(passenger) ${fill(pick(traitChatter(t)), p)}`)),
    ];
    const line = pick(Mods.filter('chatter', aboard.length && Math.random() < 0.6 ? aboard : CHATTER));
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
  const hand = typeof hired === 'function' ? hired() : null, level = hand ? skillLevel(hand.post) : 0;
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
function drawRoute(cx, y, barW, progress) {
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
  // Our ship: a chevron pointing the way the drive faces.
  const sx = bx + barW * progress, dir = t.flipped ? -1 : 1;
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.moveTo(sx + 6 * dir, y); ctx.lineTo(sx - 4 * dir, y - 5); ctx.lineTo(sx - 4 * dir, y + 5); ctx.closePath(); ctx.fill();
}

// How many lines the Comms box may take: 16 on a wide screen; on a phone as many as fit between the clock and the ship, at most 8.
const transitCommsLines = (narrow, top, shipY, L) => Math.max(narrow ? 2 : 4, Math.min(narrow ? 8 : 16, Math.floor((shipY - L * 0.13 - (top + (narrow ? 132 : 116)) - 38) / 16)));

// Where the event dialog sits, in canvas pixels, while one is open (the panel, style.css), so the Comms box can keep clear of it (#262).
function transitDialogBox(W) {
  const el = G.transit && G.transit.event && document.querySelector('#panel.event');
  if (!el) return null;
  const r = el.getBoundingClientRect(), c = canvas.getBoundingClientRect(), k = W / c.width;
  return { x: (r.left - c.left) * k, y: (r.top - c.top) * k, w: r.width * k, h: r.height * k };
}

function drawTransit(W, H) {
  const viewW = W - G.hudW, cx = viewW / 2, cy = H / 2, t = G.transit, st = G.state;
  const narrow = !G.hudW, top = narrow ? 84 : 0;  // clear the phone HUD strip
  const progress = Math.min(1, 1 - t.left / t.total);
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
  // The destination ahead, in the glow, growing with progress: one 40px sprite drawn scaled, lit from the sun behind us.
  // Not on a phone, where the Comms card spans the width.
  let destBox = null;
  if (!narrow) {
    const dest = SYSTEMS[t.to].planets[0], dx = viewW * 0.92, dy = 284, k = (8 + 32 * progress) / 40;
    ctx.save(); ctx.translate(dx, dy); ctx.scale(k, k);
    drawBody({ name: dest.name, color: dest.color, r: 40 }, 0, 0, { sun: { angle: Math.PI, strength: 1 } });
    ctx.restore();
    destBox = { x: dx - 40, y: dy - 40, w: 80, h: 80 };
  }

  // Stars streak with our speed: longest at the midpoint, with a fading tail, and a few long lines when we are really moving.
  const speed = 0.05 + Math.sin(Math.PI * progress) * 0.6, still = Settings.reduceMotion;
  for (const s of G.transitStars) {
    const x = s.x * viewW, y = s.y * H, len = Math.max(s.z * 2, speed * s.z * s.z * (still ? 8 : 110)), w = s.z > 0.7 ? 2 : 1, hot = Math.min(1, speed * 1.4);
    for (let i = 0; i < 3; i++) {  // head, body and a fainter tail
      ctx.fillStyle = `rgba(${200 + 40 * hot * (1 - i / 3)},${215 + 30 * hot * (1 - i / 3)},255,${s.z * (0.85 - i * 0.28)})`;
      ctx.fillRect(x + (len * i) / 3, y, len / 3 + 1, w);
    }
  }
  if (!still && speed > 0.2) {
    for (let i = 0; i < 26; i++) {
      const lane = (i * 0.618033) % 1, rate = 0.5 + (i % 5) * 0.22, phase = (i * 0.37 + G.time * speed * 0.35 * rate) % 1, len = speed * (120 + (i % 4) * 70);
      ctx.fillStyle = `rgba(150,195,255,${Math.min(0.3, (speed - 0.2) * 0.5)})`;
      ctx.fillRect(viewW * (1 - phase), 120 + lane * (H - 240), len, 1);  // clear of the title and the bar of keys
    }
  }

  // Our ship in cutaway, with everyone aboard (shiplife.js). It turns at the midpoint.
  const L = Math.min(viewW - 60, 640), shipY = cy + (narrow ? 56 : 70);
  // On a wide screen the cutaway is drawn larger (up to half again), scaled so it still clears the panels.
  const k = narrow ? 1 : Math.max(1, Math.min(1.35, (viewW - 120) / L, (H / 2 - 282) / (L * CUTAWAY_H / 2)));
  const shake = !Settings.reduceMotion && !t.event && speed > 0.2 ? speed * 0.9 : 0;
  ctx.save();
  ctx.translate(cx + (narrow ? 0 : 40) + Math.sin(G.time * 53) * 0.5 * shake, shipY + Math.sin(G.time * 71 + 1) * 0.8 * shake);  // a shiver, not a random draw: the game's random is seeded in the tests
  ctx.scale(k, k);
  G.cutHits = []; G.cutRooms = [];  // (a mid-turn frame draws no one)
  drawCutaway(0, 0, L);
  G.burnBoxes = { ship: { x: cx + (narrow ? 0 : 40) - L * k / 2, y: shipY - L * k * CUTAWAY_H / 2, w: L * k, h: L * k * CUTAWAY_H } };  // where each block was drawn, for the test (#262)
  if (destBox) G.burnBoxes.dest = destBox;
  ctx.restore();
  const ox = cx + (narrow ? 0 : 40);  // where the cutaway's origin was drawn
  for (const r of G.cutRooms) { r.x = ox + r.x * k; r.y = shipY + r.y * k; r.w *= k; r.h *= k; }
  for (const h of G.cutHits || []) { h.x = ox + h.x * k; h.y = shipY + h.y * k; }  // drawn at the origin, scaled: back to the screen for a click
  G.lifeY = shipY + L * k * CUTAWAY_H / 2 + 14 + 40 * k;  // downtime buttons sit below it

  // Route, on a plate so the star streaks do not run through the title and the clock (#262)
  const plateW = Math.min(viewW - 24, 640);
  G.burnBoxes.plate = { x: cx - plateW / 2, y: top + 6, w: plateW, h: narrow ? 116 : 100 };
  glassPanel(cx - plateW / 2, top + 6, plateW, narrow ? 116 : 100);
  const barW = Math.min(420, viewW - 60);
  ctx.textAlign = 'center';
  ctx.font = `600 12px ${LABEL_FONT}`;
  ctx.fillStyle = '#7fb4ff';
  ctx.fillText(`${shipTitle().toUpperCase()} IN TRANSIT`, cx, top + 22);
  ctx.fillStyle = '#e6f0ff';
  ctx.font = `600 20px ${LABEL_FONT}`;
  ctx.fillText(`${system().name}  >  ${SYSTEMS[t.to].name}`, cx, top + 44);
  drawRoute(cx, top + 62, barW, progress);
  const secs = Math.max(0, Math.ceil(t.left));
  ctx.textAlign = 'center';
  ctx.font = '12px "IBM Plex Mono", monospace';
  ctx.fillStyle = '#9ab';
  const clock = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')} remaining${t.event ? '  (paused)' : ''}${narrow ? `  ${fmtKms(burnState().v)}` : ''}`, dates = `${dateOf(transitNow(t))}, arriving ${dateOf(transitEta(t))}`;
  if (narrow) { ctx.fillText(dates, cx, top + 98); ctx.fillText(clock, cx, top + 114); }  // two lines: one is wider than a phone
  else ctx.fillText(`${dates}  -  ${clock}`, cx, top + 98);

  // The burn instruments: a panel at the right on a wide screen, the figure on the clock line on a phone.
  if (!narrow) { drawBurnPanel(viewW - 316, 116, 300); G.burnBoxes.burn = { x: viewW - 316, y: 116, w: 300, h: 112 }; }

  // Comms log, top-left
  let colW = narrow ? viewW - 56 : Math.min(360, viewW / 2 - 76), maxLines = transitCommsLines(narrow, top, shipY, L * k);
  const commsY = top + (narrow ? 132 : 116), dlg = transitDialogBox(W);
  if (dlg && narrow) maxLines = Math.min(maxLines, Math.floor((dlg.y - 8 - commsY - 30) / 16));  // ends above the dialog
  else if (dlg) colW = Math.max(120, Math.min(colW, dlg.x - 56));  // its right edge (colW + 40) stays 16 left of the dialog
  const room = maxLines >= 1;
  ctx.font = '12px "IBM Plex Mono", monospace';
  // Show whole messages, newest last, as many as fit.
  let lines = [];
  for (let i = t.comms.length - 1; i >= 0; i--) {
    const c = t.comms[i], wrapped = wrapText(c, colW);
    if (lines.length + wrapped.length > maxLines) break;
    lines = wrapped.map(l => ({ l, recent: i === t.comms.length - 1, market: c.startsWith('[Market]') })).concat(lines);
  }
  if (!lines.length && t.comms.length) lines = wrapText(t.comms[t.comms.length - 1], colW).slice(-maxLines).map(l => ({ l, recent: true, market: false }));  // the newest message alone is longer than the box: its end
  let y = commsY;
  G.commsBox = room ? { x: 16, y, w: colW + 24, h: 30 + lines.length * 16 } : null;  // where it was drawn, for the test
  if (G.commsBox) G.burnBoxes.comms = G.commsBox;
  if (room) {
    transitPanel(16, y, colW + 24, 30 + lines.length * 16, 'COMMS');
    y += 18;
    for (const { l, recent, market } of lines) {
      ctx.fillStyle = market ? '#ffcf7f' : recent ? '#cfe3ff' : '#7d93aa';
      ctx.fillText(l, 28, y += 16);
    }
  }

  // Ship's log, bottom-left
  const log = [];
  for (const m of st.missions) log.push(`${m.title} (due ${dateOf(m.deadline)})`);
  if (!st.missions.length && !hired()) log.push('No active missions.');
  if (st.crew.length && !hired()) log.push(`Crew: ${crewMembers().map(c => `${fullName(c)} (${ROLE_NAMES[c.role]})`).join(', ')}`);
  const held = COMMODITIES.filter(c => st.cargo[c.id] > 0).map(c => `${st.cargo[c.id]}t ${c.name}`);
  log.push(`Cargo: ${held.length ? held.join(', ') : 'empty'}`);
  const logW = narrow ? viewW - 170 : Math.min(460, viewW - 56);  // clear the Map button on phones
  const logLines = log.flatMap(l => wrapText(l, logW));
  y = H - BRIDGE_KEYS_H - 30 - logLines.length * 16;  // above the bridge key bar
  G.burnBoxes.log = { x: 16, y: y - 18, w: logW + 24, h: 30 + logLines.length * 16 };
  transitPanel(16, y - 18, logW + 24, 30 + logLines.length * 16, "SHIP'S LOG");
  ctx.fillStyle = '#cfe3ff';
  for (const l of logLines) ctx.fillText(l, 28, y += 16);
}
