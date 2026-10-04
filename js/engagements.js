'use strict';

// Authored engagements for a hired hand, in place of the card duel (duel.js) when pirates or a hostile patrol make contact: a raid, in beats (and, when it goes all your way, boarding her).
// The closing, two passes, and the close. At each beat you choose how to meet her, or do the job of your own post. Every
// choice is a chance of going your way (+1 or +2) or hers (-1 or -2) on one running count, the position, and a lost one can
// cost hull or hurt someone. How the position stands at the close decides it: she breaks off, she stands off and throws a
// last round, or she is alongside and the fight goes to the lock (boarders.js). A corsair fights with torpedoes and a raider
// with grapples, and the beats read differently for each. Loaded after boarders.js; only called into at runtime.

const RAID_STYLE = { raider: 'grapple', corsair: 'torpedo', cutter: 'gun', destroyer: 'gun' };  // a patrol fights with guns

const RAID_OPEN = {
  gun: ['The cutter is at thirty kilometers and her transponder says patrol. She has hailed twice, and the second time the voice said there would not be a third. She is on an intercept course with the guns warm. Battle stations. Nobody aboard talks about the fine.',
    'A patrol destroyer, or a cutter that thinks it is one, matching your course from astern. She has the legal right to stop you and the guns to do it. The captain has called battle stations and is looking at the helm and not at you.'],
  grapple: ['She is at forty kilometers and closing, no transponder, her drive running hot. A raider, small and fast, built to come alongside. The captain has said battle stations. The deck is quiet except for the air handler and somebody\'s boots.',
    'The plume is a raider\'s: short, white, hot. She is matching your course and closing on the quarter, the way they do when they mean to board. Battle stations. The crew are at their posts.'],
  torpedo: ['She is a corsair, heavier than the plume looked. Her tubes are open, and the sensors show the warm bloom of loaded torpedoes. She has forty kilometers to cover and does not hurry.',
    'A corsair, closing slowly from astern with her nose on you. The torpedo bay doors are open. Nobody aboard says anything about it.'],
};
const RAID_PASS = {
  gun: ['She crosses your bow at two kilometers and her turret tracks you the whole way, and then she comes about and does it again with the guns hot.', 'She comes round for a second pass, and this time she does not bother with the transponder challenge. Her turret is already laid.'],
  grapple: ['She comes in for a gun run across the bow, close enough to count the weld seams on her hull, with her grapple arms out.', 'She makes a second pass, closer than the first, and the grapple arms are open.'],
  torpedo: ['A torpedo leaves her bay, a bright dot on the board that grows.', 'She has a second one in the tube. On the sensors the loader arm is moving.'],
};

// Each choice: the odds it goes your way (a post's choice improves with your level), and what a win and a loss do to the position and the hull.
// A line is [position, hull as a share of armor, text].
const RAID_CLOSING = [
  { id: 'hold', label: 'Hold course and arm the point defense', odds: () => 1, win: [0, 0, 'You hold course and let her come. The point defense track her in to fifteen kilometers, and the crew watch the board.'] },
  { id: 'warn', label: 'Put a warning round across her bow', odds: () => 0.5,
    win: [1, 0, 'The round crosses her bow with a kilometer to spare. She sheers off her line and loses a minute getting back on it.'],
    lose: [-1, 0, 'The round goes wide, and she answers it with one burst, close enough that the hull rings. She has your range now.'] },
  { id: 'turn', label: 'Turn into her', odds: () => 0.45,
    win: [2, 0, 'You turn into her and close the range at twice her speed. Her first burst goes behind you, and you have the angle.'],
    lose: [-2, 0.1, 'You turn into her and she is ready. The first burst takes the dorsal plating, and the deck shudders under your feet.'] },
];
const RAID_EXCHANGE = [
  { id: 'screen', label: 'Fire the point defense', odds: st => (st === 'torpedo' ? 0.75 : 0.6),
    win: { grapple: [1, 0, 'The point defense put a curtain of rounds across her approach. She breaks off the run with her grapple arms still folded.'], torpedo: [1, 0, 'The point defense take the torpedo at three kilometers, and the flash is white on the screens.'], gun: [1, 0, 'The point defense throw a curtain across her line, and her turret has to track through it. The burst goes wide.'] },
    lose: { grapple: [-1, 0.12, 'Her burst goes through the screen and the hull rings in three places.'], torpedo: [-1, 0.12, 'The torpedo comes through the screen and bursts close. The deck bucks and every light flickers.'], gun: [-1, 0.12, 'Her burst goes through the screen. It is a patrol gun, and it is accurate. The hull rings in three places.'] } },
  { id: 'burn', label: 'Burn evasive', odds: st => (st === 'torpedo' ? 0.5 : 0.7),
    win: { grapple: [1, 0, 'You throw the ship sideways. Her burst goes through the place you were.'], torpedo: [1, 0, 'The torpedo chases the plume and bursts well astern.'], gun: [1, 0, 'You throw the ship sideways and her burst goes through the place you were. She does not adjust fast enough.'] },
    lose: { grapple: [-1, 0.1, 'She is faster than the turn. The burst rakes your port side.'], torpedo: [-1, 0.1, 'The torpedo turns with you and bursts on the quarter.'], gun: [-1, 0.1, 'She leads the turn and her burst takes you in it. Patrol gunners practise that exact one.'] } },
  { id: 'fire', label: 'Return fire', odds: () => 0.5,
    win: [2, 0, 'You put a burst into her as she crosses. Something on her hull goes out in a spray of sparks, and she flinches.'],
    lose: [-1, 0, 'You fire and miss. The recoil costs you your own angle.'] },
];
// The job of your own post, each beat. Odds 0.5 plus a tenth for every level.
const RAID_POST = {
  closing: {
    gunner: { label: 'Get a lock on her drive', win: [2, 0, 'You put the fire control on her drive bloom and hold it. The lock tone sounds and does not drop. Whatever she does next, you have her.'], lose: [-1, 0, 'The lock will not hold. She jinks, and your reticle goes to the stars.'] },
    pilot: { label: 'Put the sun behind us', win: [2, 0, 'You swing the ship so the sun sits behind you and she has to fly into it. Her sensors wash out. She comes on blind for a minute.'], lose: [-1, 0, 'You bring the sun around, and she is already on the other side of it.'] },
    engineer: { label: 'Run the drive hot and open the range', win: [2, 0, 'You push the drive past the line you would normally keep. The range opens, a kilometer a minute. She is a long way behind when the coolant temperature comes back down.'], lose: [-1, 0, 'The drive coughs at the top of the climb and the range closes again. You lose a minute to the coolant.'] },
    comms: { label: 'Hail her on her own band', win: [2, 0, 'You hail her on the band the pirates use and say the navy is a day behind, with a patrol number. She goes quiet and hangs back for a minute.'], lose: [-2, 0, 'You hail her and she laughs on the open band. The next thing you hear is her fire control painting you.'] },
  },
  exchange: {
    gunner: { label: 'Walk a burst along her line', win: [2, 0, 'You walk the burst along her line, a hand at a time. The last round hits her gun housing, and she stops firing.'], lose: [-1, 0, 'You walk it wrong. The burst goes ahead of her.'] },
    pilot: { label: 'Flip and burn across her path', win: [2, 0, 'You flip and burn across her path. She has to break to avoid you, and her run goes wide.'], lose: [-1, 0.1, 'You flip, and she has led you. The burst takes the aft section.'] },
    engineer: { label: 'Put the power into the screens', win: [2, 0, 'You move the power from the drive into the screens, and the next hit goes into them and stops. The shield board goes amber and holds.'], lose: [-1, 0.1, 'The transfer takes a second too long. The hit arrives in the gap.'] },
    comms: { label: 'Jam her fire control', win: [2, 0, 'You put noise across her fire control band. Her round goes wide, and the next one.'], lose: [-1, 0, 'You find the wrong band. The jammer works on nothing.'] },
  },
};
const RAID_CLOSE = {
  off: { gun: 'She breaks off. Her turret goes cold and her plume swings away, and on the open band a voice says your registry has been logged and the next stop will not be a conversation.', grapple: 'She breaks off. Her grapple arms fold, her plume swings away and goes up the scale, and the range opens. On the board she is a dot, then she is not.', torpedo: 'She does not fire the third torpedo. The bay doors close and she turns away, and the range opens.' },
  crippled: { gun: 'Your last burst takes her drive, and the cutter yaws and goes quiet. She will have a tow in a day. A beacon on her hull is already calling for it.', grapple: 'Your last burst takes her drive, and the plume goes out. She turns over and drifts, with the grapple arms hanging.', torpedo: 'Your last burst reaches her torpedo bay and not the torpedoes, which is lucky for everyone. Her plume goes out.' },
  standoff: 'She breaks off at long range, out of ammunition or out of patience, and throws one last burst as she goes. It clips the hull aft.',
  boarded: { gun: 'She is alongside, and not with grapples: a boarding party in navy gray comes across with the lock cutter. They are coming aboard, by the book.', grapple: 'She is alongside. The grapples bang on the hull in four places and the lock alarm goes. They are coming aboard.', torpedo: 'A torpedo takes your drive housing and she closes while you are slow. The grapples bang on the hull, and the lock alarm goes.' },
};

// A crippled raider drifts beside you. Boarding her is the repel fight run the other way (boarders.js).
function deadInSpaceScene(s) {
  const h = hired(), cap = person(h.captain);
  return {
    title: 'Dead in Space', personal: true, via: 'crew', owner: 'you',
    text: `${theShip(s.foe)} is still. Her drive is out and she is turning slowly on her axis, with her running lights flickering and her lock open to vacuum. Captain ${cap.last} holds the ship forty meters off and asks the crew what they want to do. Her crew are armed. A boarding would be ${repelStanding(assaultStart(s.foe)) - 1} of yours against ${assaultStart(s.foe).boarders} of hers.`,
    choices: [
      { label: 'Board her', run() { G.nextEvent = repelScene(assaultStart(s.foe)); return `The cutter goes out of the lock. It is a short crossing.`; } },
      { label: 'Let her drift', run() { like(cap, 1, 'You stood us up to a raid and she broke off.'); changeRep('Pirate', -3); gainSkill(h.post, 3); return `You leave her turning in the dark. Captain ${cap.last} writes it in the log and nothing else. (+3 experience at the ${POSTS[h.post].name.toLowerCase()} post.)`; } },
    ],
  };
}

// What a choice risks for the hand: a lost bold call can hurt you yourself, and the captain remembers a call that failed or won it.
const HAND_RISK = { hold: 0, screen: 0, warn: 0.15, burn: 0.15, turn: 0.35, fire: 0.35, post: 0.35 };
const raidPosition = s => (s.edge >= 1 ? 'ahead' : s.edge <= -1 ? 'behind' : 'even');

// The start. Returns what to show now and queues the first beat. A hard burn can get you clear before there is a fight.
function startRaid(spec, flee, o = {}) {
  const st = G.state, foe = makeEnemy(spec), style = RAID_STYLE[foe.shipId] || 'grapple';
  const s = { spec, foe, style, edge: o.edge || 0, open: o.open, beat: 0, hurt: new Set(), dead: [], marked: [], youHurt: false, round: 0 };
  if (spec.kind === 'patrol' && !flee) changeRep(spec.gov, -8);  // firing on a navy ship is not forgotten
  let text = o.text || `Battle stations. ${theShip(foe)} made the intercept.`;
  if (flee) {
    if (Math.random() < 0.4 + 0.12 * roleSkill('pilot')) return `${helmName()} winds the drive past the redline and opens the range. Their plume fades.`;
    st.armor = Math.max(1, st.armor - Math.round(ship().armor * 0.08));
    s.edge = -1;
    text = `${helmName()} runs, but ${theShip(foe).replace(/^The/, 'the')} gets a burst in first. Battle stations.`;
  }
  rateFoe(s);
  const flavor = foeFlavor(s); if (flavor) text += ` ${flavor}`;
  G.nextEvent = raidScene(s);
  return text;
}

function raidScene(s) {
  const st = G.state, h = hired(), post = h.post, level = skillLevel(post);
  const closing = s.beat === 0, kind = closing ? 'closing' : 'exchange';
  const general = closing ? RAID_CLOSING : RAID_EXCHANGE, spec = RAID_POST[kind][post];
  const text = closing ? s.open || RAID_OPEN[s.style][s.round % 2] : RAID_PASS[s.style][s.beat - 1];
  const choices = general.map(c => ({ label: c.label, run: () => raidStep(s, c, null) }));
  choices.push({ label: `[${POSTS[post].name}] ${spec.label}`, run: () => raidStep(s, { id: 'post', odds: () => Math.min(0.85, 0.5 + 0.1 * level), win: spec.win, lose: spec.lose }, post) });
  return {
    title: closing ? 'The Closing' : s.beat === 1 ? 'First Pass' : 'Second Pass', personal: true, via: 'crew', owner: 'you',  // yours to decide, not the captain's (hired.js hiredCall)
    text: `${text}</p><p>${raidRead(s)} Position: ${raidPosition(s)}. Armor ${st.armor}/${ship().armor}.`,
    choices,
  };
}

// One choice. Rolls it, applies the position and the hull, may hurt someone, and queues the next beat or the close.
function raidStep(s, c, post) {
  const st = G.state, odds = shipOdds(s, c.id, post, c.odds(s.style)), won = odds >= 1 || Math.random() < odds;
  const line = won ? c.win : (c.lose || c.win);
  const [edge, hull, text] = Array.isArray(line) ? line : (line[s.style] || line.grapple);
  s.edge += edge;
  let out = text;
  const risk = HAND_RISK[c.id] || 0, cap = person(hired().captain);
  if (!won && risk && Math.random() < risk) out += ` ${hurtHand(s)}`;  // your own call, and it went wrong on you
  if (risk >= 0.35) {
    if (!won) like(cap, -1, 'You made a call in a raid and it went wrong.');
    else if (edge >= 2) like(cap, 1, 'You made the call that turned a raid.');
  }
  if (hull) { const pts = Math.round(ship().armor * hull * foePunch(s)); st.armor = Math.max(1, st.armor - pts); out += ` Armor -${pts}.`; if (!won && Math.random() < CASUALTY_ODDS * (1 + 0.15 * s.grade + (s.pack ? 0.25 : 0))) out += ` ${repelCasualty(s)}`; }
  s.beat++;
  if (s.beat >= 3 || s.edge >= 3 || s.edge <= -3) return `${out} ${raidClose(s)}`;
  G.nextEvent = raidScene(s);
  return out;
}

// The close: broke off, stood off, or alongside.
function raidClose(s) {
  const st = G.state, h = hired(), cap = person(h.captain), weak = st.armor <= ship().armor * 0.25;
  if (s.edge >= 4 && !weak && s.spec.kind !== 'patrol') {  // a clear win: her drive is gone and she drifts, and you can board her
    G.nextEvent = deadInSpaceScene(s);
    return RAID_CLOSE.crippled[s.style];
  }
  if (s.edge >= 2 && !weak) {
    like(cap, 1, 'You stood us up to a raid and she broke off.');
    if (s.spec.kind !== 'patrol') changeRep('Pirate', -3);
    gainSkill(h.post, 3);
    return `${RAID_CLOSE.off[s.style]} Captain ${cap.last} writes it in the log and nothing else. (+3 experience at the ${POSTS[h.post].name.toLowerCase()} post.)`;
  }
  if (s.edge > -2 && !weak) {
    const pts = Math.round(ship().armor * 0.05);
    st.armor = Math.max(1, st.armor - pts);
    return `${RAID_CLOSE.standoff} Armor -${pts}.`;
  }
  const d = { foe: s.foe, foeHp: 0, init: 'foe' };
  G.nextEvent = repelScene(repelStart(d, s.style === 'grapple' ? 'full' : 'half'));
  return RAID_CLOSE.boarded[s.style];
}

// The ambush: a distress call, and the pirates waiting behind it (or, now and then, a real freighter). Each post has its own
// way of reading the call, and a good read tells you which it is before you commit. A trap that springs on you starts the
// raid two behind, and one you saw coming starts it one ahead. Offered for a burn through unsettled space (hired hand only).
const AMBUSH_GAP = 60, AMBUSH_DANGER = 0.25, AMBUSH_TRAP = 0.7;
const AMBUSH_READ = {
  gunner: { label: 'Scan her hull for weapons', trap: 'You hold the fire control on her and watch the hull. There is a gun housing under the freighter plating, and the plating has been cut to let it traverse. She is not a freighter.', real: 'You hold the fire control on her and look for a gun housing, a torpedo bay, anything. There is a cargo door hanging open and nothing else. She is a freighter.' },
  engineer: { label: 'Read her drive signature', trap: 'You put the drive plume on the analyzer. It is a freighter\'s hull with a corsair\'s drive, and a freighter that is dying does not burn like that. She is bait.', real: 'You put the drive plume on the analyzer. It is a freighter\'s drive and it is failing in the way that they fail, a coolant fault on the second bank. She is real.' },
  pilot: { label: 'Match her tumble', trap: 'You match her tumble in your head and it is wrong. A hull with its drive out spins slower than that, and she is spinning on a clock. She is not dead in space, she is playing it.', real: 'You match her tumble and it fits: a hull with its drive out, spinning slow, the way an uncontrolled one does. She is real.' },
  comms: { label: 'Check her call against the registry', trap: 'You check the transponder against the registry. The hull number belongs to a freighter that was scrapped two years ago. The call is a lie.', real: 'You check the transponder against the registry. The hull number is current, and her last port was two days ago. The call is genuine.' },
};

const ambushDue = () => {
  const st = G.state, t = G.transit;
  return !!(hired() && t && !(st.ambushAt > st.day - AMBUSH_GAP) && Math.max(danger(st.systemId), danger(t.to)) >= AMBUSH_DANGER);
};

function ambushScene() {
  const st = G.state, h = hired(), post = h.post, cap = person(h.captain), trap = Math.random() < AMBUSH_TRAP, spec = AMBUSH_READ[post];
  st.ambushAt = st.day;
  return ambushChoice({ trap, read: false, tried: false }, cap, h, post, spec);
}

// The call, before and after a read. `known` is set once a read has told you which it is.
function ambushChoice(a, cap, h, post, spec) {
  const springs = (edge, text, open) => startRaid({ kind: 'pirate' }, false, { edge, text, open });
  const sprung = () => springs(-2, `You alter course for her. At four kilometers the freighter lights a drive that is not a freighter's, and two more come off the rock behind her, and the call stops.`, `They were waiting on the far side of the freighter, with their drives cold. By the time the sensors show them they are inside the range, and your position is already bad.`);
  const real = () => { h.fund += 500; like(cap, 1, 'You stopped for a real distress call.'); return `She is real. Her second coolant bank has failed and her crew are tired and grateful, and you stand by while they restart. The owner sends 500 cr to the ship's fund, which is more than you asked.`; };
  const choices = [];
  if (a.known) {
    if (a.trap) {
      choices.push({ label: 'Hit them before they are ready', run: () => springs(1, `You come in hot with the drive cold, and light it at three kilometers. They are not ready. Battle stations.`, `They are in position behind the freighter, with their drives cold, and they have not lit them. You have the range, and the first move.`) });
      choices.push({ label: 'Turn away and leave it', run() { like(cap, 1, 'You saw a trap before it closed.'); gainSkill(post, 2); return `You turn away and burn for the lane. At four kilometers the freighter's drive lights, the real one, and she comes after you for twenty minutes before she gives it up. (+2 experience at the ${POSTS[post].name.toLowerCase()} post.)`; } });
    } else {
      choices.push({ label: 'Go to her', run: real });
      choices.push({ label: 'Leave her', run() { like(cap, -1, 'You left a real distress call.'); return `You leave her to call for someone else. Captain ${cap.last} says nothing, and does not look up from the plot.`; } });
    }
  } else {
    choices.push({ label: 'Go to her', run: () => (a.trap ? sprung() : real()) });
    choices.push({ label: 'Leave it', run: () => (a.trap ? `You let the call play out and burn on. Two days on, a feed item says a freighter was taken at that spot.` : `You let the call play out and burn on. It might have been real.`) });
    if (!a.tried) choices.push({ label: `[${POSTS[post].name}] ${spec.label}`, run() {
      a.tried = true;
      if (Math.random() < Math.min(0.85, 0.5 + 0.1 * skillLevel(post))) { a.known = true; G.nextEvent = ambushChoice(a, cap, h, post, spec); return a.trap ? spec.trap : spec.real; }
      G.nextEvent = ambushChoice(a, cap, h, post, spec);
      return `You try, and the readings will not settle. The call keeps repeating, and you are no wiser.`;
    } });
  }
  const scene = { title: 'A Freighter in Trouble', personal: true, via: 'ship', owner: 'you', text: a.known ? (a.trap ? `You know what is out there. They have not lit their drives, and they do not know you know.` : `The readings are clean. She is real, and she is asking again.`) : `A distress call on the common band, short and weary: a freighter with a failed drive, in the lane ahead, asking anyone. She is forty minutes off your course. Captain ${cap.last} looks at the plot, then at the crew.`, choices };
  return scene;
}

Mods.register({
  id: 'ambush', name: 'Distress call ambush', builtin: true,
  init(M) {
    M.filter('happenings', (list, where) => (where === 'transit' && ambushDue() ? list.concat({ tier: 2, weight: 1, via: 'ship', make: ambushScene }) : list));
  },
});
