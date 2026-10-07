'use strict';

// Ice runs: the long ones. When water is dear at a port in reach and the hold is empty, the captain takes the ship out past the
// Belt to a rock of ice, cuts a hold of it, and brings it home to sell. It is a run like any other (a planned run, a wage, a share,
// settled where she docks), but it takes a long time, pays double the wage for the hazard and the water at a contract price, and has three scenes on the way
// that are the hand's to play: the approach, the cutting, the haul home. Each is a choice of how to meet it, or the job of your
// own post, and each is a chance of going your way (+1 or +2 on a running count) or not (-1 or -2). The count decides how much ice
// comes aboard, and a bad one can cost hull or hurt someone. The scenes are occasions of the burn (family.js), so a hand's burn and
// the sims play them like the birthdays. Loaded after engagements.js; only called into at runtime.

const ICE_GAP = 60;          // days between ice runs
const ICE_WATER_PRICE = 96;  // water at a port this dear makes an ice run worth the trip (80 is the base price)
const ICE_HAZARD = 2;        // the wage, for the days it takes
const ICE_PREMIUM = 2.5;     // what the domes pay for water on a contract, against the board price
const ICE_AT = [0.3, 0.5, 0.78];  // how far into the burn each scene falls
const iceDays = days => Math.max(8, Math.ceil(1.5 * days) + 3);

// The run the planner takes when it is due: the port that pays most for water, the whole hold, no cost.
function iceOption(here, from, reach, free) {
  const h = hired(), st = G.state;
  if (!h || (h.iceAt !== undefined && st.day - h.iceAt < ICE_GAP) || st.day - h.since < 12 || free < 10) return null;
  let best = null;
  for (const [sid, sys] of reach) {
    for (const pl of sys.planets.filter(x => x.services.includes('trade'))) {
      const sell = price(pl, 'water');
      if (sell !== null && sell >= ICE_WATER_PRICE && (!best || sell > best.sell)) best = { sid, planet: pl.name, yard: pl.services.includes('shipyard'), sell, days: iceDays(Math.max(1, travelDays(from, sid))) };
    }
  }
  if (!best) return null;
  return { sid: best.sid, planet: best.planet, yard: best.yard, good: 'water', tons: free, cost: 0, profit: Math.round(best.sell * free * ICE_PREMIUM), days: best.days, ice: true, ballast: false };
}

// ---------- the three scenes ----------
// A choice is [position, hull as a share of armor, text]. A general choice has odds and a win and a lose; a post's choice has the same
// (odds are a half plus a tenth for each level).
const ICE_STAGES = [
  { title: 'The Rock',
    open: [('She is a dark lump on the board for three days, and then she is a mountain. A comet that lost its way, or a piece of one: black, pitted, ' +
        'with a white seam through it where the ice shows. There is no beacon, no berth, and nobody to ask. The captain brings the ship in to three ' +
        'kilometers and says what everyone is thinking, that you cannot dock with something that is tumbling.'),
      ('The rock is bigger than the charts said, and it is turning, a long slow roll that takes eleven minutes. The ice is on the shadow side, a pale ' +
          'band between slabs of dust and rock. The captain has the ship stationed and the crew are at their suits. "Somebody tell me how we get ' +
          'close," the captain says.')],
    general: [
      { label: 'Match the roll and go in slow', odds: 0.6, win: [1, 0, ('You match the roll over the course of an hour and come alongside at walking ' +
          'pace. The anchors bite on the first try.')], lose: [-1, 0.06, 'The roll catches you out by a few degrees and a spur of rock clips the hull. The anchors hold, in the end.'] },
      { label: 'Go in fast, and brake hard', bold: true, odds: 0.4, win: [3, 0, ('You go in faster than anyone likes and brake at the last moment. ' +
          'You are on the ice with an hour in hand.')], lose: [-1, 0.12, 'You come in too fast, and brake too late, and the hull takes a hit from the rock that rings every deck.'] },
      { label: 'Send a line across first', odds: 0.7, win: [1, 0, 'The line goes across and holds. You haul the ship in on it, a meter at a time, and no one has to be clever.'], lose: [0, 0, 'The line parts on the first haul. You spend two hours getting it across again.'] },
    ],
    post: {
      pilot: { label: 'Fly the approach by hand', win: [2, 0, ('You fly it by hand, with the drive cold, on the thrusters alone, in the shadow of the ' +
          'rock. The ship settles against the ice like something that belongs there.')], lose: [-1, 0.06, 'The thrusters are not enough, and the rock turns into the ship. The paint will not forgive you.'] },
      engineer: { label: 'Set the anchors yourself', win: [2, 0, ('You set the anchors in a pattern you worked out on the way: two forward, one aft, ' +
          'and a line for luck. The ship does not move.')], lose: [-1, 0.06, 'An anchor fouls on a vein of rock and has to be cut away. You lose it and a morning.'] },
      gunner: { label: 'Blast a ledge to land on', win: [2, 0, ('You put three shots into the dust at the rim, and the rock gives up a flat ledge ' +
          'with room for the ship. The captain says nothing, which is praise.')], lose: [-1, 0.06, 'The shots bring down a slab that grazes the hull and spins away. You get a ledge, and a long list of things to fix.'] },
      comms: { label: 'Scan for the stable face', win: [2, 0, ('You scan the rock for an hour and find the face that is not moving as much as the ' +
          'rest. The ship goes in there, and the anchors set at once.')], lose: [-1, 0.03, 'The scan reads a quiet face that is a loose one. The anchors take, and then let go, and you start again.'] },
    } },
  { title: 'Cutting Ice',
    open: [('The cutters are out, six of them, and the white seam runs forty meters along the rock. The work is slow and cold and loud in the helmet: ' +
        'a saw to cut a block, a lift to carry it, the hold doors to put it in. It is the kind of work that goes right for an hour and wrong for a ' +
        'second. The captain has the ship on the radio and everyone else on the ice.'),
      'You are on the ice at the second shift, and the ship hangs above like a big dull star. The blocks are the size of a bunk, blue-white and very clean, and each one is worth more than a month of your wage. Someone on the radio says to watch the seam. It cracks while they are saying it.'],
    general: [
      { label: 'Cut small, and carry every block', odds: 0.75, win: [1, 0, ('You cut the blocks small and carry each one, and the hold fills ' +
          'steadily, with nothing lost and nothing hurt.')], lose: [0, 0, 'You cut small and carry everything, and the work is so slow that the light changes twice. The hold is not as full as it should be.'] },
      { label: 'Cut big, and use the lift', bold: true, odds: 0.55, win: [2, 0, 'The big blocks come out clean and the lift takes them. The hold is full an hour early.'], lose: [-1, 0.08, 'A big block shifts on the lift and takes the edge off the hold door. Nobody is under it, which is luck.'] },
      { label: 'Work in pairs, and rotate every hour', odds: 0.65, win: [1, 0, ('You work in pairs and rotate every hour. It is slower on paper, and ' +
          'nobody makes a mistake from tiredness.')], lose: [0, 0, 'The rotation is a good idea and the radio is bad. The pairs lose each other twice, and both times it ends well.'] },
    ],
    post: {
      pilot: { label: 'Hold the ship steady over the seam', win: [2, 0, ('You hold the ship steady over the seam with the thrusters, in tiny pulses, ' +
          'so the lift can work from it. You do not blink for nine hours.')], lose: [-1, 0.05, 'The ship drifts at the wrong moment, and the lift line goes taut. You catch it, but the hold door takes the strain.'] },
      engineer: { label: 'Run the heaters off the drive', win: [2, 0, ('You run a heat line from the drive to the cutters, so the blades do not ' +
          'freeze and the seam does not stick. The cutters sing.')], lose: [-1, 0.06, 'The heat line takes more than you thought and the drive complains. You cut the power and lose an hour.'] },
      gunner: { label: 'Use the guns to split the big slabs', win: [2, 0, ('You split the big slabs with the guns, one shot at a time, along the ' +
          'seam. The blocks come away in clean pieces.')], lose: [-1, 0.06, 'A shot goes into the wrong plane and the whole face shatters. It is a lot of ice, and not much of it is useful.'] },
      comms: { label: 'Keep the shifts on a schedule', win: [2, 0, ('You keep every shift on the clock, call each handover, and track every block ' +
          'into the hold. The count at the end is exact, and the captain checks it twice.')], lose: [-1, 0.03, 'You lose a shift in the schedule and two people on the ice at once. It is sorted out, and it is not forgotten.'] },
    } },
  { title: 'Home With the Ice',
    open: [('The hold is full, and the ship is heavy, and she burns like it. Every maneuver is slower, and every vibration matters, because there is ' +
        'a hundred tons of ice in the hold that is the only cargo you are being paid for. The captain has set a course for the buyer and a limit on ' +
        'the thrust, and has asked everyone to keep it in mind.'),
      'The rock is a pale dot astern, and then it is not. Nobody says anything for a while. The hold is full of water that will keep a dome alive for a month. It is a long way home, and the ship has never felt so slow.'],
    general: [
      { label: 'Keep the burn gentle and the hold cold', odds: 0.8, win: [1, 0, ('You keep the burn gentle and the hold cold, and the ice comes home ' +
          'as it left, in blocks, not in pools.')], lose: [0, 0, 'A gentle burn is a long one. The ice softens a little at the edges, and you lose a ton to the drains.'] },
      { label: 'Burn hard, and trust the insulation', bold: true, odds: 0.58, win: [2, 0, ('You burn hard, and the insulation holds. You gain two ' +
          'days, and the buyer is not asking where the time went.')], lose: [-1, 0.06, 'The hard burn heats the hold wall, and a seam goes. You pump the water to the tanks, and lose some on the way.'] },
      { label: 'Stand watches on the hold', odds: 0.7, win: [1, 0, 'You stand a watch on the hold all the way. Nothing goes wrong, because someone is looking at it.'], lose: [0, 0, 'Nobody wants the hold watch, and everyone takes it. It is a long, cold trip, and a quiet one.'] },
    ],
    post: {
      pilot: {
        label: 'Fly the long way round, away from the lanes',
        win: [
        2,
        0,
        'You fly the long way, off the lanes, in the dark. Nobody finds you, and nobody is looking.'
      ],
        lose: [
        -1,
        0.04,
        'The long way is longer than the chart. You make the date by a day, and burn a lot of reaction mass doing it.'
      ]
      },
      engineer: { label: 'Recycle the melt into the tanks', win: [2, 0, 'You catch every drop of melt from the hold and put it in the tanks. The ship delivers more water than she took on.'], lose: [-1, 0.05, 'A valve sticks and a tank overfills. You mop up with everything you have.'] },
      gunner: { label: 'Keep the guns warm and watch the dark', win: [2, 0, ('You keep the guns warm and watch the dark for two days. Nothing comes, ' +
          'and everyone sleeps better because you did.')], lose: [-1, 0.05, 'A contact on the board is a rock, and then a rock, and then a ship, and then a rock. You wake the crew twice for nothing.'] },
      comms: { label: 'Sell the water ahead on the long link', win: [2, 0, ('You work the long link, port after port, and find a buyer who will pay ' +
          'for the water before it docks. The price is better than the board.')], lose: [-1, 0.02, 'The buyer you find backs out at the last moment. You are back to the board price, and the captain does not say anything.'] },
    } },
];

// One scene: the opening, the three general choices and the post's own.
function iceStageScene(n) {
  const h = hired(), st = G.state, stage = ICE_STAGES[n], post = h.post, run = h.run || {};
  const ice = run.ice = run.ice || { edge: 0 };
  const choices = stage.general.map(c => ({ label: `${c.label}${iceCostNote(c)}`, run: () => iceStep(n, c, null) }));
  const spec = stage.post[post], level = skillLevel(post);
  choices.push({ label: `[${POSTS[post].name}] ${spec.label}${iceCostNote(spec)}`, run: () => iceStep(n, { odds: Math.min(0.85, 0.5 + 0.1 * level), win: spec.win, lose: spec.lose }, post) });
  return { title: stage.title, personal: true, via: 'crew', owner: 'you', text: `${stage.open[ice.round % 2 || 0]}</p><p>The haul so far: ${iceHaulWord(ice.edge)}. Armor ${st.armor}/${ship().armor}.`, choices };
}
// What a choice can cost, from what it declares: a lost roll's hull cost (and the casualty that can come with it), and a bold call the captain marks.
const iceCostNote = c => costNote({ hull: (c.lose || c.win)[1] > 0, marks: !!c.bold });
const iceHaulWord = e => (e >= 3 ? 'a good one' : e >= 1 ? 'going well' : e <= -2 ? 'going badly' : 'even');

function iceStep(n, c, post) {
  const st = G.state, h = hired(), run = h.run, ice = run.ice;
  const won = Math.random() < c.odds, [edge, hull, text] = won ? c.win : (c.lose || c.win);
  ice.edge += edge; ice.round = (ice.round || 0) + 1;
  if (c.bold) boldWithCaptain(won);  // the captain's nerve (captains.js)
  let out = text;
  if (hull) { const pts = Math.round(ship().armor * hull); st.armor = Math.max(1, st.armor - pts); out += ` Armor -${pts}.`; if (!won &&
    Math.random() < CASUALTY_ODDS) { const c2 = typeof hurtCrew === 'function' ? hurtCrew(true) : null; if (c2) out += c2.dead ? ` ${c2.first} is dead.` :
    ` ${c2.first} is hurt.`; } }
  if (post) gainSkill(post, won ? 4 : 1); else gainSkill(h.post, 1);
  if (n === 1) out += iceLoad(false);       // the cutting fills the hold
  if (n === 2) out += iceHome(ice.edge);
  return out;
}

// The ice comes aboard: the whole hold on a good run, down to a third on a bad one.
function iceLoad(thin) {
  const st = G.state, run = hired().run, ice = run.ice;
  if (ice.loaded) return '';
  const tons = Math.max(8, Math.min(run.tons, Math.round(run.tons * (thin ? 0.4 : 0.55 + 0.1 * ice.edge))));
  st.cargo.water = (st.cargo.water || 0) + tons;
  st.paid.water = 0;
  ice.loaded = tons; run.tons = tons;
  return ` The hold takes ${tons} tons of ice.`;
}
// How it ends: a clean run is remembered, a bad one is paid for less.
function iceHome(edge) {
  const h = hired(), cap = person(h.captain);
  if (edge >= 3) { like(cap, 1, 'You brought the ice in.'); captainFlag('iceClean'); delete h.flags.iceBad; return ' The captain writes it in the log: a clean haul, and a good crew.'; }
  if (edge <= -2) { like(cap, -1, 'You made a mess of the ice.'); captainFlag('iceBad'); delete h.flags.iceClean; return ' The captain does not write anything in the log, and it is not a good silence.'; }
  return '';
}

// A burn that did not play the scenes (cut short, or no happening drew them): the hold fills thin, and she goes on.
function iceFinish() {
  const run = (hired() || {}).run;
  if (!run || !run.ice || run.ice.loaded) return;
  iceLoad(true);
}
