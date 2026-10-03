'use strict';

// Authored engagements for a hired hand, in place of the card duel (duel.js) when pirates make contact: a raid, in beats.
// The closing, two passes, and the close. At each beat you choose how to meet her, or do the job of your own post. Every
// choice is a chance of going your way (+1 or +2) or hers (-1 or -2) on one running count, the position, and a lost one can
// cost hull or hurt someone. How the position stands at the close decides it: she breaks off, she stands off and throws a
// last round, or she is alongside and the fight goes to the lock (boarders.js). A corsair fights with torpedoes and a raider
// with grapples, and the beats read differently for each. Loaded after boarders.js; only called into at runtime.

const RAID_STYLE = { raider: 'grapple', corsair: 'torpedo' };

const RAID_OPEN = {
  grapple: ['She is at forty kilometers and closing, no transponder, her drive running hot. A raider, small and fast, built to come alongside. The captain has said battle stations. The deck is quiet except for the air handler and somebody\'s boots.',
    'The plume is a raider\'s: short, white, hot. She is matching your course and closing on the quarter, the way they do when they mean to board. Battle stations. The crew are at their posts.'],
  torpedo: ['She is a corsair, heavier than the plume looked. Her tubes are open, and the sensors show the warm bloom of loaded torpedoes. She has forty kilometers to cover and does not hurry.',
    'A corsair, closing slowly from astern with her nose on you. The torpedo bay doors are open. Nobody aboard says anything about it.'],
};
const RAID_PASS = {
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
    win: { grapple: [1, 0, 'The point defense put a curtain of rounds across her approach. She breaks off the run with her grapple arms still folded.'], torpedo: [1, 0, 'The point defense take the torpedo at three kilometers, and the flash is white on the screens.'] },
    lose: { grapple: [-1, 0.12, 'Her burst goes through the screen and the hull rings in three places.'], torpedo: [-1, 0.12, 'The torpedo comes through the screen and bursts close. The deck bucks and every light flickers.'] } },
  { id: 'burn', label: 'Burn evasive', odds: st => (st === 'torpedo' ? 0.5 : 0.7),
    win: { grapple: [1, 0, 'You throw the ship sideways. Her burst goes through the place you were.'], torpedo: [1, 0, 'The torpedo chases the plume and bursts well astern.'] },
    lose: { grapple: [-1, 0.1, 'She is faster than the turn. The burst rakes your port side.'], torpedo: [-1, 0.1, 'The torpedo turns with you and bursts on the quarter.'] } },
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
  off: { grapple: 'She breaks off. Her grapple arms fold, her plume swings away and goes up the scale, and the range opens. On the board she is a dot, then she is not.', torpedo: 'She does not fire the third torpedo. The bay doors close and she turns away, and the range opens.' },
  standoff: 'She breaks off at long range, out of ammunition or out of patience, and throws one last burst as she goes. It clips the hull aft.',
  boarded: { grapple: 'She is alongside. The grapples bang on the hull in four places and the lock alarm goes. They are coming aboard.', torpedo: 'A torpedo takes your drive housing and she closes while you are slow. The grapples bang on the hull, and the lock alarm goes.' },
};

const raidPosition = s => (s.edge >= 1 ? 'ahead' : s.edge <= -1 ? 'behind' : 'even');

// The start. Returns what to show now and queues the first beat. A hard burn can get you clear before there is a fight.
function startRaid(spec, flee) {
  const st = G.state, foe = makeEnemy(spec), style = RAID_STYLE[foe.shipId] || 'grapple';
  const s = { spec, foe, style, edge: 0, beat: 0, hurt: new Set(), dead: [], marked: [], youHurt: false, round: 0 };
  let text = `Battle stations. ${theShip(foe)} made the intercept.`;
  if (flee) {
    if (Math.random() < 0.4 + 0.12 * roleSkill('pilot')) return `${helmName()} winds the drive past the redline and opens the range. Their plume fades.`;
    st.armor = Math.max(1, st.armor - Math.round(ship().armor * 0.08));
    s.edge = -1;
    text = `${helmName()} runs, but ${theShip(foe).replace(/^The/, 'the')} gets a burst in first. Battle stations.`;
  }
  G.nextEvent = raidScene(s);
  return text;
}

function raidScene(s) {
  const st = G.state, h = hired(), post = h.post, level = skillLevel(post);
  const closing = s.beat === 0, kind = closing ? 'closing' : 'exchange';
  const general = closing ? RAID_CLOSING : RAID_EXCHANGE, spec = RAID_POST[kind][post];
  const text = closing ? RAID_OPEN[s.style][s.round % 2] : RAID_PASS[s.style][s.beat - 1];
  const choices = general.map(c => ({ label: c.label, run: () => raidStep(s, c, null) }));
  choices.push({ label: `[${POSTS[post].name}] ${spec.label}`, run: () => raidStep(s, { odds: () => Math.min(0.85, 0.5 + 0.1 * level), win: spec.win, lose: spec.lose }, post) });
  return {
    title: closing ? 'The Closing' : s.beat === 1 ? 'First Pass' : 'Second Pass', personal: true, via: 'crew', owner: 'you',  // yours to decide, not the captain's (hired.js hiredCall)
    text: `${text}</p><p>Position: ${raidPosition(s)}. Armor ${st.armor}/${ship().armor}.`,
    choices,
  };
}

// One choice. Rolls it, applies the position and the hull, may hurt someone, and queues the next beat or the close.
function raidStep(s, c, post) {
  const st = G.state, odds = c.odds(s.style), won = odds >= 1 || Math.random() < odds;
  const line = won ? c.win : (c.lose || c.win);
  const [edge, hull, text] = Array.isArray(line) ? line : (line[s.style] || line.grapple);
  s.edge += edge;
  let out = text;
  if (hull) { const pts = Math.round(ship().armor * hull); st.armor = Math.max(1, st.armor - pts); out += ` Armor -${pts}.`; if (!won && Math.random() < 0.25) out += ` ${repelCasualty(s)}`; }
  s.beat++;
  if (s.beat >= 3 || s.edge >= 3 || s.edge <= -3) return `${out} ${raidClose(s)}`;
  G.nextEvent = raidScene(s);
  return out;
}

// The close: broke off, stood off, or alongside.
function raidClose(s) {
  const st = G.state, h = hired(), cap = person(h.captain), weak = st.armor <= ship().armor * 0.25;
  if (s.edge >= 2 && !weak) {
    like(cap, 1, 'You stood us up to a raid and she broke off.');
    changeRep('Pirate', -3);
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
