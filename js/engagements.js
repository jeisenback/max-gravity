'use strict';

// Authored engagements for a hired hand, and for an owner who kept a post (#721), in place of the card duel (duel.js) when pirates or a hostile patrol make contact: a raid, in beats (and, when it goes all your way, boarding her).
// The closing, two passes, and the close. At each beat you choose how to meet her, or do the job of your own post. Every
// choice is a chance of going your way (+1 or +2) or hers (-1 or -2) on one running count, the position, and a lost one can
// cost hull or hurt someone. How the position stands at the close decides it: she breaks off, she stands off and throws a
// last round, or she is alongside and the fight goes to the lock (boarders.js). A corsair fights with torpedoes and a raider
// with grapples, and the beats read differently for each. An owner has no captain: what goes to the captain's regard (and the lines that name her) is the hand's, and the owner's is the log and their own post.
// Loaded after boarders.js; only called into at runtime.

// The captain whose regard a call moves: the hand's. An owner has none.
const raidCap = () => { const h = hired(); return h ? person(h.captain) : null; };

const RAID_STYLE = { raider: 'grapple', corsair: 'torpedo', cutter: 'gun', destroyer: 'gun' };  // a patrol fights with guns

const RAID_OPEN = {
  gun: ['The cutter is at thirty kilometers and her transponder says patrol. She has hailed twice, and the second time the voice said there wouldn\'t be a third. She\'s on an intercept course with the guns warm. Battle stations. Nobody aboard talks about the fine.',
    'A patrol destroyer, or a cutter that thinks it\'s one, matching your course from astern. She has the legal right to stop you and the guns to do it. The captain has called battle stations and is looking at the helm and not at you.'],
  grapple: ['She\'s at forty kilometers and closing, no transponder, her drive running hot. A raider, small and fast, built to come alongside. The captain has said battle stations. The deck is quiet except for the air handler and somebody\'s boots.',
    'The plume is a raider\'s: short, white, hot. She\'s matching your course and closing on the quarter, the way they do when they mean to board. Battle stations. The crew are at their posts.'],
  torpedo: ['She\'s a corsair, heavier than the plume looked. Her tubes are open, and the sensors show the warm bloom of loaded torpedoes. She has forty kilometers to cover and doesn\'t hurry.',
    'A corsair, closing slowly from astern with her nose on you. The torpedo bay doors are open. Nobody aboard says anything about it.'],
};
// After the opening, when the move that began the raid has moved the range from the one the opening line gives (engage.js): the number is the code's.
const RAID_OPEN_MOVED = { far: 'The move bought you room.', near: 'The move cost you room.' };
const RAID_PASS = {
  gun: ['She crosses your bow at two kilometers and her turret tracks you the whole way, and then she comes about and does it again with the guns hot.', 'She comes round for a second pass, and this time she doesn\'t bother with the transponder challenge. Her turret is already laid.'],
  grapple: ['She comes in for a gun run across the bow, close enough to count the weld seams on her hull, with her grapple arms out.', 'She makes a second pass, closer than the first, and the grapple arms are open.'],
  torpedo: ['A torpedo leaves her bay, a bright dot on the board that grows.', 'She has a second one in the tube. On the sensors the loader arm is moving.'],
};

// The passes when she is still coming (the range was opened past RANGE_NEAR, range.js): the same beat, from farther off. A corsair's passes are already at a standoff.
const RAID_PASS_FAR = {
  gun: ['She is still coming, twelve kilometers out and holding her fire, her turret tracking you across the gap. Whatever you did, it cost her the run.', 'She comes round again from far out, the guns hot and the range still too wide for a good burst.'],
  grapple: ['She is still half a lane off, her grapple arms folded, hauling in at the best her drive will give. You bought the minute.', 'She makes a second approach from well out, the grapple arms stowed until she is close enough to use them.'],
};

// A line of the raid, read through the editor's words (lineWords, storylets.js); the name is where the line sits in the tables below (hiredscenes.js lists them).
const raidWords = (key, shipped) => lineWords('beats:raid', key, shipped);

// Each choice: the odds it goes your way (a post's choice improves with your level), and what a win and a loss do to the position and the hull.
// A line is [position, hull as a share of armor, text].
const RAID_CLOSING = [
  { id: 'hold', label: 'Hold course and arm the point defense', odds: () => 1, win: [0, 0, 'You hold course and let her come. The point defense track her in to fifteen kilometers, and the crew watch the board.'] },
  { id: 'warn', label: 'Put a warning round across her bow', odds: () => 0.5,
    win: [1, 0, 'The round crosses her bow with a kilometer to spare. She sheers off her line and loses a minute getting back on it.'],
    lose: [-1, 0, 'The round goes wide, and she answers it with one burst, close enough that the hull rings. She has your range now.'] },
  { id: 'turn', label: 'Turn into her', bold: true, odds: () => 0.5,
    win: [2, 0, 'You turn into her and close the range at twice her speed. Her first burst goes behind you, and you have the angle.'],
    lose: [-2, 0.1, 'You turn into her and she\'s ready. The first burst takes the dorsal plating, and the deck shudders under your feet.'] },
];
const RAID_EXCHANGE = [
  { id: 'screen', label: 'Fire the point defense', odds: st => (st === 'torpedo' ? 0.7 : 0.6),
    win: { grapple: [1, 0, ('The point defense put a curtain of rounds across her approach. She breaks off the run with her grapple arms still ' +
        'folded.')], torpedo: [1, 0, 'The point defense take the torpedo at three kilometers, and the flash is white on the screens.'], gun: [1, 0, 'The point defense throw a curtain across her line, and her turret has to track through it. The burst goes wide.'] },
    lose: {
      grapple: [
      -1,
      0.12,
      'Her burst goes through the screen and the hull rings in three places.'
    ],
      torpedo: [
      -1,
      0.12,
      'The torpedo comes through the screen and bursts close. The deck bucks and every light flickers.'
    ],
      gun: [
      -1,
      0.12,
      'Her burst goes through the screen. It\'s a patrol gun, and it\'s accurate. The hull rings in three places.'
    ]
    } },
  { id: 'burn', label: 'Burn evasive', odds: st => (st === 'torpedo' ? 0.5 : 0.7),
    win: {
      grapple: [
      1,
      0,
      'You throw the ship sideways. Her burst goes through the place you were.'
    ],
      torpedo: [
      1,
      0,
      'The torpedo chases the plume and bursts well astern.'
    ],
      gun: [
      1,
      0,
      'You throw the ship sideways and her burst goes through the place you were. She doesn\'t adjust fast enough.'
    ]
    },
    lose: { grapple: [-1, 0.1, 'She\'s faster than the turn. The burst rakes your port side.'], torpedo: [-1, 0.1, 'The torpedo turns with you and bursts on the quarter.'], gun: [-1, 0.1, 'She leads the turn and her burst takes you in it. Patrol gunners practise that exact one.'] } },
  { id: 'fire', label: 'Return fire', bold: true, odds: () => 0.45,
    win: [2, 0, 'You put a burst into her as she crosses. Something on her hull goes out in a spray of sparks, and she flinches.'],
    lose: [-1, 0, 'You fire and miss. The recoil costs you your own angle.'] },
];
// The job of your own post, each beat. Odds 0.5 plus a tenth for every level.
const RAID_POST = {
  closing: {
    gunner: { label: 'Get a lock on her drive', win: [2, 0, 'You put the fire control on her drive bloom and hold it. The lock tone sounds and doesn\'t drop. Whatever she does next, you have her.'], lose: [-1, 0, 'The lock won\'t hold. She jinks, and your reticle goes to the stars.'] },
    pilot: { label: 'Put the sun behind us', win: [2, 0, 'You swing the ship so the sun sits behind you and she has to fly into it. Her sensors wash out. She comes on blind for a minute.'], lose: [-1, 0, 'You bring the sun around, and she\'s already on the other side of it.'] },
    engineer: { label: 'Run the drive hot and open the range', win: [2, 0, ('You push the drive past the line you\'d normally keep. The range ' +
        'opens, a kilometer a minute. She\'s a long way behind when the coolant temperature comes back down.')], lose: [-1, 0, 'The drive coughs at the top of the climb and the range closes again. You lose a minute to the coolant.'] },
    comms: { label: 'Hail her on her own band', win: [2, 0, ('You hail her on the band the pirates use and say the navy is a day behind, with a ' +
        'patrol number. She goes quiet and hangs back for a minute.')], lose: [-2, 0, 'You hail her and she laughs on the open band. The next thing you hear is her fire control painting you.'] },
  },
  exchange: {
    gunner: { label: 'Walk a burst along her line', win: [2, 0, 'You walk the burst along her line, a hand at a time. The last round hits her gun housing, and she stops firing.'], lose: [-1, 0, 'You walk it wrong. The burst goes ahead of her.'] },
    pilot: { label: 'Flip and burn across her path', win: [2, 0, 'You flip and burn across her path. She has to break to avoid you, and her run goes wide.'], lose: [-1, 0.1, 'You flip, and she has led you. The burst takes the aft section.'] },
    engineer: { label: 'Put the power into the screens', win: [2, 0, 'You move the power from the drive into the screens, and the next hit goes into them and stops. The shield board goes amber and holds.'], lose: [-1, 0.1, 'The transfer takes a second too long. The hit arrives in the gap.'] },
    comms: { label: 'Jam her fire control', win: [2, 0, 'You put noise across her fire control band. Her round goes wide, and the next one.'], lose: [-1, 0, 'You find the wrong band. The jammer works on nothing.'] },
  },
};
// What the captain remembers of a raid (the character view shows it), read as lines of the beat: `memory.<name>` (hiredscenes.js raidLines).
const RAID_MEMORY = { wrong: 'You made a call in a raid and it went wrong.', turned: 'You made the call that turned a raid.', stood: 'You stood us up to a raid and she broke off.' };
const RAID_CLOSE = {
  off: { gun: ('She breaks off. Her turret goes cold and her plume swings away, and on the open band a voice says, "Your registry has been logged. ' +
      'The next stop won\'t be a conversation."'), grapple: (
      'She breaks off. Her grapple arms fold, her plume swings away and goes up the scale, and the range opens. On the board she\'s a dot, then she ' +
      'isn\'t.'), torpedo: 'She doesn\'t fire the third torpedo. The bay doors close and she turns away, and the range opens.' },
  crippled: { gun: ('Your last burst takes her drive, and the cutter yaws and goes quiet. She\'ll have a tow in a day. A beacon on her hull is ' +
      'already calling for it.'), grapple: 'Your last burst takes her drive, and the plume goes out. She turns over and drifts, with the grapple arms hanging.', torpedo: 'Your last burst reaches her torpedo bay and not the torpedoes. Her plume goes out.' },
  standoff: 'She breaks off at long range and throws one last burst as she goes. It clips the hull aft.',
  standoffNear: 'She breaks off and throws one last burst as she goes, close enough to hear it hit. It clips the hull aft.',  // the same close, when the board has her inside the guns' reach (#733)
  lost: { gun: 'She loses you. The cutter\'s plume dwindles on the board and her hail goes unanswered, and then the board has nothing to show for her at all.', grapple: 'She loses you. The raider hauls on for a range she will never close, and drops off the board a long way astern.', torpedo: 'She loses you. Her last torpedo burns out well short, and the corsair turns away with nothing to aim at.' },
  boarded: { gun: ('She\'s alongside, and not with grapples: a boarding party in navy gray comes across with the lock cutter. They\'re coming aboard, ' +
      'by the book.'), grapple: 'She\'s alongside. The grapples bang on the hull in four places and the lock alarm goes. They\'re coming aboard.', torpedo: 'A torpedo takes your drive housing and she closes while you\'re slow. The grapples bang on the hull, and the lock alarm goes.' },
};

// The words of the scene below, as lines of the beat `beats:dead-in-space` (hiredscenes.js deadLines), with {ship}, {cap} (the captain's name), {ours} and {theirs} (the boarding
// count) and {post} (the hand's post) filled in.
const DEAD_TEXT = {
  title: 'Dead in Space',
  text: '{ship} is still. Her drive is out and she\'s turning slowly on her axis, with her running lights flickering and her lock open to vacuum. Captain {cap} holds the ship forty meters off and asks the crew what they want to do. Her crew are armed. A boarding would be {ours} of yours against {theirs} of hers.',
  'board.label': 'Board her',
  'board.result': 'The cutter goes out of the lock. It\'s a short crossing.',
  'drift.label': 'Let her drift',
  'drift.result': 'You leave her turning in the dark. Captain {cap} writes it in the log and nothing else. (+3 experience at the {post} post.)',
};
const deadWords = (key, vars = {}) => lineWords('beats:dead-in-space', key, DEAD_TEXT[key]).replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));

// A crippled raider drifts beside you. Boarding her is the repel fight run the other way (boarders.js).
function deadInSpaceScene(s) {
  const post = lockPost(), cap = raidCap(), assault = assaultStart(s.foe), ours = repelStanding(assault) - 1;
  const say = key => deadWords(key, { ship: theShip(s.foe), cap: cap ? cap.last : '', ours, theirs: assault.boarders, post: POSTS[post].name.toLowerCase() });
  return {
    title: say('title'), personal: true, via: 'crew', owner: 'you',
    text: cap ? say('text') : `${theShip(s.foe)} is still. Her drive is out and she's turning slowly on her axis, with her running lights flickering and her lock open to vacuum. You hold the ship forty meters off and ask the crew what they want to do. Her crew are armed. A boarding would be ${ours} of yours against ${assault.boarders} of hers.`,
    choices: [
      { label: say('board.label'), run() { G.nextEvent = repelScene(assaultStart(s.foe, s)); return say('board.result'); } },
      { label: say('drift.label'), run() { if (cap) like(cap, 1, raidWords('memory.stood', RAID_MEMORY.stood)); changeRep('Pirate', -3); gainSkill(post, 3); return cap ? say('drift.result') : `You leave her turning in the dark and write it in the log, and nothing else. (+3 experience at the ${POSTS[post].name.toLowerCase()} post.)`; } },
    ],
  };
}

// The hand's own move in a raid: the post's stat and its level (check, sheet.js), and a tenth more once the guns are boresighted (the
// Gunner's order below), until the next port.
const BORESIGHT = 0.1;
const boresighted = () => !!postState('gunner').sighted;
const raidPostOdds = level => handCheck(POST_STAT[lockPost()], level, 'post', boresighted() ? BORESIGHT : 0);

// The Gunner's orders, for a hired Gunner (the other posts have theirs in stations.js, comms.js): a drill that teaches, and a
// stance that pays in the next raid. Each uses up the day, like the others (giveOrder, stations.js).
const GUNNER_ORDERS = [
  { id: 'drill', name: 'Run the range sim', desc: 'Tracking drills on the sim. Once a day.',
    run: ok => (ok ? 'You spend the watch on the range sim, leading a drone that dodges on a timer. By the end the lead lands inside the ring three times in four.'
      : 'You spend the watch on the range sim. The drone dodges on a timer you can\'t read, and you log fourteen misses.') },
  { id: 'boresight', name: 'Boresight the guns', desc: 'Walk the guns onto a target plate. Your own move at the guns is ten points better in the next raid, until the next port. Once a day.',
    run(ok) {
      if (!ok) return 'You hang the plate and the mounts won\'t agree. Two settle. The third drifts a finger\'s width and stays there.';
      postState('gunner').sighted = true;
      return 'You hang a target plate at four hundred meters and walk the guns onto it, one mount at a time, until the plate has one hole in it.';
    } },
];

// What a choice risks for the hand: a lost bold call can hurt you yourself, and the captain remembers a call that failed or won it.
const HAND_RISK = { hold: 0, screen: 0, warn: 0.15, burn: 0.15, turn: 0.35, fire: 0.35, post: 0.35 };
const raidPosition = s => (s.edge >= 1 ? 'ahead' : s.edge <= -1 ? 'behind' : 'even');

// The start. Returns what to show now and queues the first beat. A hard burn can get you clear before there is a fight.
function startRaid(spec, flee, o = {}) {
  const st = G.state, foe = makeEnemy(spec), style = RAID_STYLE[foe.shipId] || 'grapple';
  const s = { spec, foe, style, edge: o.edge || 0, open: o.open, beat: 0, hurt: new Set(), dead: [], marked: [], youHurt: false, round: 0 };
  s.base = o.range !== undefined ? o.range : rangeAtContact(style);  // km: what the range would be if no choice had moved it (range.js); an ambush starts nearer
  s.range = s.base + (o.shift || 0);  // and what it is: the contact's move (engage.js) has opened it or closed it already
  if (spec.kind === 'patrol' && !flee) changeRep(spec.gov, -8);  // firing on a navy ship is not forgotten
  let text = o.text || `Battle stations. ${theShip(foe)} made the intercept.`;
  if (flee) {
    if (Math.random() < 0.4 + 0.12 * roleSkill('pilot')) return `${helmName()} winds the drive past the redline and opens the range. Their plume fades.`;
    st.armor = Math.max(1, st.armor - Math.round(ship().armor * 0.08));
    s.edge = -1;
    text = `${helmName()} runs, but ${theShip(foe).replace(/^The/, 'the')} gets a burst in first. Battle stations.`;
  }
  captainFlag('raided');  // fought, not outrun: kept for the goodbye (captains.js)
  rateFoe(s);
  const flavor = foeFlavor(s); if (flavor) text += ` ${flavor}`;
  const told = raidExplanation();  // the first raid of a new game is explained once, before the first scene (captains.js)
  G.nextEvent = told ? chainEvents([told, raidScene(s)]) : raidScene(s);
  return text;
}

// What a choice can cost, said before it is picked (#293, #364): its odds, and its worst outcome in a few words, built from what the choice declares.
// `odds` is the chance it goes your way, the same number the roll uses (a post's choice improves with your level), shown as a percentage; a sure
// choice (1 or more) shows none. `hull`: a lost roll costs hull, and with it a crew casualty; `casualty`: a lost exchange can cost one without hull;
// `hand`: you may be hurt; `cost`: a lost roll costs this many credits of your own; `rep`: your standing here; `xp`: you learn less; `marks`: the captain
// marks the call (a bold or risky one); `who`: the post the roll is on, named before the odds where a choice is not simply yours (a job ashore); `range`: a word for what it does to a raid's range ("opens the range"). A sure
// choice with nothing at stake carries no note. The raids, the boarding scenes, the ice run, the work events, the jobs ashore and the bar say it through this.
// Plain text: a label is escaped where the button is drawn (views.js).
const oddsWord = odds => `${Math.round(odds * 100)}%`;
function costNote(c, odds) {
  const costs = [...(c.hull || c.casualty ? [...(c.hull ? ['hull damage'] : []), 'a crew casualty'] : []), ...(c.hand ? ['you may be hurt'] : []), ...(c.cost ? [`${fmt(c.cost)} cr of your own`] : []),
    ...(c.rep ? ['your standing here'] : []), ...(c.standing ? ["the shipper's regard"] : []), ...(c.xp ? ['you learn less'] : [])];
  const text = c.marks ? [...(costs.length ? [`${costs.join(', ')}, and`] : []), 'the captain marks it'].join(' ') : costs.join(', ');
  const parts = [...(odds !== undefined && odds < 1 ? [`${c.who ? `${c.who}, ` : ''}${oddsWord(odds)}`] : []), ...(c.range ? [c.range] : []), ...(text ? [`if it fails: ${text}`] : [])];
  return parts.length ? ` [${parts.join('; ')}]` : '';
}
// A raid choice's note carries the odds the beat will roll (shipOdds: the ships, her crew's grade, and for a post's move your level).
function raidCostNote(c, s, post) {
  const odds = shipOdds(s, c.id, post, c.odds(s.style));
  if (odds >= 1) return '';
  const lose = c.lose || c.win, line = Array.isArray(lose) ? lose : (lose[s.style] || lose.grapple), risk = HAND_RISK[c.id] || 0;
  const shift = rangeShiftOf(post ? `post.${s.beat === 0 ? 'closing' : 'exchange'}.${post}` : c.id, true);
  return costNote({ hull: line[1] > 0, hand: risk > 0, marks: risk >= 0.35, range: shift > 0 ? 'opens the range' : shift < 0 ? 'closes the range' : '' }, odds);
}

function raidScene(s) {
  const st = G.state, post = lockPost(), level = skillLevel(post);
  const prev = s.board || null;  // last beat's picture, for sensors that show her late (board.js)
  s.board = raidBoard({ beat: s.beat, edge: s.edge, style: s.style, me: SHIPS[st.shipId], foe: SHIPS[s.foe.shipId], range: s.range });
  const closing = s.beat === 0, kind = closing ? 'closing' : 'exchange';
  const general = closing ? RAID_CLOSING : RAID_EXCHANGE, spec = RAID_POST[kind][post];
  const text = closing ? s.open || raidWords(`open.${s.style}.${s.round % 2}`, RAID_OPEN[s.style][s.round % 2]) : (RAID_PASS_FAR[s.style] && s.range > RANGE_NEAR ? raidWords(`passfar.${s.style}.${s.beat - 1}`, RAID_PASS_FAR[s.style][s.beat - 1]) : raidWords(`pass.${s.style}.${s.beat - 1}`, RAID_PASS[s.style][s.beat - 1]));  // she is still coming if you opened the range
  const moved = closing && !s.open && s.range !== s.base ? ` ${raidWords(`open.moved.${s.range > s.base ? 'far' : 'near'}`, RAID_OPEN_MOVED[s.range > s.base ? 'far' : 'near'])} She is at ${s.range} kilometers.` : '';
  const choices = general.map(c => ({ label: `${raidWords(`${kind}.${c.id}.label`, c.label)}${raidCostNote(c, s, null)}`, run: () => raidStep(s, c, null) }));
  const own = { id: 'post', odds: () => raidPostOdds(level), win: spec.win, lose: spec.lose };
  choices.push({ label: `[${POSTS[post].name}] ${raidWords(`post.${kind}.${post}.label`, spec.label)}${raidCostNote(own, s, post)}`, run: () => raidStep(s, own, post) });
  return {
    title: closing ? 'The Closing' : s.beat === 1 ? 'First Pass' : 'Second Pass', personal: true, via: 'crew', owner: 'you',  // yours to decide, not the captain's (hired.js hiredCall)
    text: `${text}${moved}</p><p>${raidRead(s)} Armor ${st.armor}/${ship().armor}.`,
    board: boardSvg(s.board, { style: s.style, beat: s.beat, sensors: condition().sensors, sunAngle: sunLight().angle, prev, pack: s.pack, word: raidPosition(s) }),  // the sensor board (board.js), drawn above the text (ui.js)
    choices,
  };
}

// One choice. Rolls it, applies the position and the hull, may hurt someone, and queues the next beat or the close.
function raidStep(s, c, post) {
  const st = G.state, odds = shipOdds(s, c.id, post, c.odds(s.style)), won = odds >= 1 || Math.random() < odds;
  const side = won || !c.lose ? 'win' : 'lose', line = c[side], base = post ? `post.${s.beat === 0 ? 'closing' : 'exchange'}.${post}` : `${s.beat === 0 ? 'closing' : 'exchange'}.${c.id}`;
  const [edge, hull, shipped] = Array.isArray(line) ? line : (line[s.style] || line.grapple);
  const text = raidWords(Array.isArray(line) ? `${base}.${side}` : `${base}.${side}.${line[s.style] ? s.style : 'grapple'}`, shipped);
  s.edge += edge;
  let out = text;
  const risk = HAND_RISK[c.id] || 0, cap = raidCap();
  if (!won && risk && Math.random() < risk) out += ` ${hurtHand(s)}`;  // your own call, and it went wrong on you
  if (c.bold) boldWithCaptain(won);  // the captain's nerve (captains.js)
  if (risk >= 0.35 && cap) {
    if (!won) like(cap, -1, raidWords('memory.wrong', RAID_MEMORY.wrong));
    else if (edge >= 2) like(cap, 1, raidWords('memory.turned', RAID_MEMORY.turned));
  }
  if (hull) { const pts = Math.round(ship().armor * hull * foePunch(s)); st.armor = Math.max(1, st.armor - pts); out += ` Armor -${pts}.`; if (!won && Math.random() < CASUALTY_ODDS * (1 + 0.15 * s.grade + (s.pack ? 0.25 : 0))) out += ` ${repelCasualty(s)}`; }
  if (s.handDied) return out;  // the hand is dead: the ending is queued, and the raid does not go on
  const closing = s.board ? s.board.closing : 1, shift = rangeShiftOf(post ? `post.${s.beat === 0 ? 'closing' : 'exchange'}.${post}` : c.id, won), ends = s.beat + 1 >= 3 || s.edge >= 3 || s.edge <= -3;
  s.range = ends ? rangeLeft(s.range, shift) : rangeAfter(s.range, { style: s.style, closing, shift });  // your choice moves it; if the raid goes on she closes before the next beat, and if it ends here she has not had the time (range.js)
  s.base = rangeAfter(s.base, { style: s.style, closing, shift: 0 });
  s.beat++;
  if (contactLost(s.range)) return `${out} ${raidLost(s)}`;
  if (s.beat >= 3 || s.edge >= 3 || s.edge <= -3) return `${out} ${raidClose(s)}`;
  G.nextEvent = raidScene(s);
  return out;
}

// She is left too far behind to follow: the contact is lost, and the hand who opened the range learns a little from it.
function raidLost(s) {
  const post = lockPost();
  gainSkill(post, 2);
  return `${raidWords(`close.lost.${s.style}`, RAID_CLOSE.lost[s.style])} (+2 experience at the ${POSTS[post].name.toLowerCase()} post.)`;
}

// The standoff's line, by where the board has her: at long range if she is past the close pass's range, else close in (the line must agree with the picture, #733).
const raidStandoff = s => (s.range > RANGE_NEAR ? raidWords('close.standoff', RAID_CLOSE.standoff) : raidWords('close.standoffNear', RAID_CLOSE.standoffNear));

// The close: broke off, stood off, or alongside.
function raidClose(s) {
  const st = G.state, post = lockPost(), cap = raidCap(), weak = st.armor <= ship().armor * 0.25;
  if (s.edge >= 4 && !weak && s.spec.kind !== 'patrol') {  // a clear win: her drive is gone and she drifts, and you can board her
    G.nextEvent = deadInSpaceScene(s);
    return raidWords(`close.crippled.${s.style}`, RAID_CLOSE.crippled[s.style]);
  }
  if (s.edge >= 2 && !weak) {
    if (cap) like(cap, 1, raidWords('memory.stood', RAID_MEMORY.stood));
    if (s.spec.kind !== 'patrol') changeRep('Pirate', -3);
    gainSkill(post, 3);
    return `${raidWords(`close.off.${s.style}`, RAID_CLOSE.off[s.style])} ${cap ? `Captain ${cap.last} writes` : 'You write'} it in the log and nothing else. (+3 experience at the ${POSTS[post].name.toLowerCase()} post.)`;
  }
  if (s.edge > -2 && !weak) {
    const pts = Math.round(ship().armor * 0.05);
    st.armor = Math.max(1, st.armor - pts);
    return `${raidStandoff(s)} Armor -${pts}.`;
  }
  if (!canBoard(s.range, s.style)) {  // you kept the range open: she cannot come alongside, and stands off
    const pts = Math.round(ship().armor * 0.05);
    st.armor = Math.max(1, st.armor - pts);
    return `${raidStandoff(s)} Armor -${pts}.`;
  }
  const d = { foe: s.foe, foeHp: 0, init: 'foe', grade: s.grade, pack: s.pack };
  G.nextEvent = repelScene(repelStart(d, s.style === 'grapple' ? 'full' : 'half'));
  return raidWords(`close.boarded.${s.style}`, RAID_CLOSE.boarded[s.style]);
}

// The ambush: a distress call, and the pirates waiting behind it (or, now and then, a real freighter). Each post has its own
// way of reading the call, and a good read tells you which it is before you commit. A trap that springs on you starts the
// raid two behind, and one you saw coming starts it one ahead. Offered for a burn through unsettled space (hired hand only).
const AMBUSH_GAP = 60, AMBUSH_DANGER = 0.25, AMBUSH_TRAP = 0.7;
// What the captain remembers of an ambush, as lines of the beat: `memory.<name>` (hiredscenes.js ambushLines).
const AMBUSH_MEMORY = { real: 'You stopped for a real distress call.', trap: 'You saw a trap before it closed.', left: 'You left a real distress call.' };
// The rest of the scene's words, as lines of the beat (`<key>` in hiredscenes.js ambushLines), with {cap} (the captain's name) and {post} (the post's name) filled in.
const AMBUSH_TEXT = {
  title: 'A Freighter in Trouble',
  'text.call': 'A distress call on the common band, short and weary: a freighter with a failed drive, in the lane ahead, asking anyone. She\'s forty minutes off your course. Captain {cap} looks at the plot, then at the crew.',
  'text.trap': 'You know what\'s out there. They haven\'t lit their drives, and they don\'t know you know.',
  'text.real': 'The readings are clean. She\'s real, and she\'s asking again.',
  'go.label': 'Go to her',
  'sprung.result': 'You alter course for her. At four kilometers the freighter lights a drive that\'s not a freighter\'s, and two more come off the rock behind her, and the call stops.',
  'sprung.open': 'They were waiting on the far side of the freighter, with their drives cold. By the time the sensors show them they\'re inside the range, and your position is already bad.',
  'real.result': 'She\'s real. Her second coolant bank has failed and her crew are tired and grateful, and you stand by while they restart. The owner sends 500 cr to the ship\'s fund.',
  'real.leave.label': 'Leave her',
  'real.leave.result': 'You leave her to call for someone else. Captain {cap} says nothing, and doesn\'t look up from the plot.',
  'trap.hit.label': 'Hit them before they\'re ready',
  'trap.hit.result': 'You come in hot with the drive cold, and light it at three kilometers. They\'re not ready. Battle stations.',
  'trap.hit.open': 'They\'re in position behind the freighter, with their drives cold, and they haven\'t lit them. You have the range, and the first move.',
  'trap.leave.label': 'Turn away and leave it',
  'trap.leave.result': 'You turn away and burn for the lane. At four kilometers the freighter\'s drive lights, the real one, and she comes after you for twenty minutes before she gives it up. (+2 experience at the {post} post.)',
  'blind.leave.label': 'Leave it',
  'blind.leave.trap': 'You let the call play out and burn on. Two days on, a feed item says a freighter was taken at that spot.',
  'blind.leave.real': 'You let the call play out and burn on. It might have been real.',
  'read.fail': 'You try, and the readings won\'t settle. The call keeps repeating, and you\'re no wiser.',
};
const ambushSay = (key, vars = {}) => lineWords('beats:ambush', key, AMBUSH_TEXT[key]).replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
const AMBUSH_READ = {
  gunner: { label: 'Scan her hull for weapons', trap: ('You hold the fire control on her and watch the hull. There\'s a gun housing under the ' +
      'freighter plating, and the plating has been cut to let it traverse. She\'s not a freighter.'), real: (
      'You hold the fire control on her and look for a gun housing, a torpedo bay, anything. There\'s a cargo door hanging open and nothing else. She\'s ' +
      'a freighter.') },
  engineer: { label: 'Read her drive signature', trap: ('You put the drive plume on the analyzer. It\'s a freighter\'s hull with a corsair\'s drive, ' +
      'and a freighter that\'s dying doesn\'t burn like that. She\'s bait.'), real: (
      'You put the drive plume on the analyzer. It\'s a freighter\'s drive and it\'s failing in the way that they fail, a coolant fault on the second ' +
      'bank. She\'s real.') },
  pilot: { label: 'Match her tumble', trap: ('You match her tumble in your head and it\'s wrong. A hull with its drive out spins slower than that, ' +
      'and she\'s spinning on a clock. She\'s not dead in space, she\'s playing it.'), real: 'You match her tumble and it fits: a hull with its drive out, spinning slow, the way an uncontrolled one does. She\'s real.' },
  comms: { label: 'Check her call against the registry', trap: ('You check the transponder against the registry. The hull number belongs to a ' +
      'freighter that was scrapped two years ago. The call is a lie.'), real: 'You check the transponder against the registry. The hull number is current, and her last port was two days ago. The call is genuine.' },
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
  const springs = (edge, text, open) => startRaid({ kind: 'pirate' }, false, { edge, text, open }), say = key => ambushSay(key, { cap: cap.last, post: POSTS[post].name.toLowerCase() });
  const sprung = () => springs(-2, say('sprung.result'), say('sprung.open'));
  const real = () => { h.fund += 500; like(cap, 1, lineWords('beats:ambush', 'memory.real', AMBUSH_MEMORY.real)); return say('real.result'); };
  const choices = [];
  if (a.known) {
    if (a.trap) {
      choices.push({ label: say('trap.hit.label'), run: () => springs(1, say('trap.hit.result'), say('trap.hit.open')) });
      choices.push({ label: say('trap.leave.label'), run() { like(cap, 1, lineWords('beats:ambush', 'memory.trap', AMBUSH_MEMORY.trap)); gainSkill(post, 2); return say('trap.leave.result'); } });
    } else {
      choices.push({ label: say('go.label'), run: real });
      choices.push({ label: say('real.leave.label'), run() { like(cap, -1, lineWords('beats:ambush', 'memory.left', AMBUSH_MEMORY.left)); return say('real.leave.result'); } });
    }
  } else {
    choices.push({ label: say('go.label'), run: () => (a.trap ? sprung() : real()) });
    choices.push({ label: say('blind.leave.label'), run: () => say(a.trap ? 'blind.leave.trap' : 'blind.leave.real') });
    if (!a.tried) choices.push({ label: `[${POSTS[post].name}] ${lineWords('beats:ambush', `read.${post}.label`, spec.label)}`, run() {
      a.tried = true;
      if (Math.random() < Math.min(0.85, 0.5 + 0.1 * skillLevel(post))) { a.known = true; G.nextEvent = ambushChoice(a, cap, h, post, spec); return a.trap ? lineWords('beats:ambush', `read.${post}.trap`, spec.trap) : lineWords('beats:ambush', `read.${post}.real`, spec.real); }
      G.nextEvent = ambushChoice(a, cap, h, post, spec);
      return say('read.fail');
    } });
  }
  return { title: say('title'), personal: true, via: 'ship', owner: 'you', text: say(a.known ? (a.trap ? 'text.trap' : 'text.real') : 'text.call'), choices };
}

Mods.register({
  id: 'gunner-orders', name: 'The Gunner\'s orders', builtin: true,
  init(M) {
    M.filter('orders', (list, id) => (id === 'gunner' && hired() ? list.concat(GUNNER_ORDERS) : list));
    M.on('landed', () => { if (hired()) postState('gunner').sighted = false; });  // the guns are boresighted until the next port
  },
});

Mods.register({
  id: 'ambush', name: 'Distress call ambush', builtin: true,
  init(M) {
    M.filter('happenings', (list, where) => (where === 'transit' && ambushDue() ? list.concat({ tier: 2, weight: 1, via: 'ship', make: ambushScene }) : list));
  },
});
