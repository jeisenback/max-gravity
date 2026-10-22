'use strict';

// Authored engagements for a hired hand, and for an owner who kept a post (#721), in place of the card duel (duel.js) when pirates or a hostile patrol make contact.
// The contact is fought turn by turn on the sensor board (fightui.js); what is here is around it: the foe's style, the crippled ship that drifts beside you
// after it, the Gunner's orders, the cost note on a choice, and the distress-call ambush that springs a fight. A corsair fights with torpedoes and a raider
// with grapples, and the lines read differently for each. An owner has no captain: what goes to the captain's regard (and the lines that name her) is the
// hand's, and the owner's is the log and their own post. Loaded after boarders.js; only called into at runtime.

// The captain whose regard a call moves: the hand's. An owner has none.
const raidCap = () => { const h = hired(); return h ? person(h.captain) : null; };

const RAID_STYLE = { raider: 'grapple', corsair: 'torpedo', cutter: 'gun', destroyer: 'gun' };  // a patrol fights with guns

// The words of the scene below, as lines of the beat `beats:dead-in-space` (hiredscenes.js deadLines), with {ship}, {cap} (the captain's name), {ours} and {theirs} (the boarding
// count) and {post} (the hand's post) filled in.
const DEAD_TEXT = {
  title: 'Dead in Space',
  text: '{ship} is still. Her drive is out and she\'s turning slowly on her axis, with her running lights flickering and her lock open to vacuum. Captain {cap} holds the ship forty meters off and asks the crew what they want to do. Her crew are armed. A boarding would be {ours} of yours against {theirs} of hers.',
  'board.label': 'Board her',
  'board.none': 'Nobody aboard is fit to go across.',
  'board.result': 'The cutter goes out of the lock. It\'s a short crossing.',
  'drift.label': 'Let her drift',
  'drift.result': 'You leave her turning in the dark. Captain {cap} writes it in the log and nothing else. (+3 experience at the {post} post.)',
  'memory.drift': 'You crippled a raider, and we left her drifting.',  // what the captain remembers of it
};
const deadWords = (key, vars = {}) => lineWords('beats:dead-in-space', key, DEAD_TEXT[key]).replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));

// A crippled raider drifts beside you. Boarding her is the deck fight run the other way (boarders.js assaultStart, fightui.js deckFightEvent): the one built here,
// with her grade and her consort's crew (`s`), so that the count the scene gives is the fight Board her opens.
function deadInSpaceScene(s) {
  const post = lockPost(), cap = raidCap(), assault = assaultStart(s.foe, s), ours = sum(assault.state, 'mine'), theirs = assault.state.began;
  const say = key => deadWords(key, { ship: theShip(s.foe), cap: cap ? cap.last : '', ours, theirs, post: POSTS[post].name.toLowerCase() });
  return {
    title: say('title'), personal: true, via: 'crew', owner: 'you',
    text: (cap ? say('text') : `${theShip(s.foe)} is still. Her drive is out and she's turning slowly on her axis, with her running lights flickering and her lock open to vacuum. You hold the ship forty meters off and ask the crew what they want to do. Her crew are armed. A boarding would be ${ours} of yours against ${theirs} of hers.`) + (ours ? '' : ` ${say('board.none')}`),  // with nobody able to fight there is no boarding (R34)
    choices: [
      ...(ours ? [{ label: say('board.label'), run() { G.nextEvent = deckFightEvent(assault); return say('board.result'); } }] : []),
      { label: say('drift.label'), run() { if (cap) like(cap, 1, say('memory.drift')); changeRep('Pirate', -3); gainSkill(post, 3); return cap ? say('drift.result') : `You leave her turning in the dark and write it in the log, and nothing else. (+3 experience at the ${POSTS[post].name.toLowerCase()} post.)`; } },
    ],
  };
}

// The guns are boresighted (the Gunner's order below) until the next port: in a fight the hand shoots as a level better (fightui.js).
const boresighted = () => !!postState('gunner').sighted;

// The Gunner's orders, for a hired Gunner (the other posts have theirs in stations.js, comms.js): a drill that teaches, and a
// stance that pays in the next fight. Each uses up the day, like the others (giveOrder, stations.js).
const GUNNER_ORDERS = [
  { id: 'drill', name: 'Run the range sim', desc: 'Tracking drills on the sim. Once a day.',
    run: ok => (ok ? 'You spend the watch on the range sim, leading a drone that dodges on a timer. By the end the lead lands inside the ring three times in four.'
      : 'You spend the watch on the range sim. The drone dodges on a timer you can\'t read, and you log fourteen misses.') },
  { id: 'boresight', name: 'Boresight the guns', desc: 'Walk the guns onto a target plate. Your guns hit as if you were a level better in the next fight, until the next port. Once a day.',
    run(ok) {
      if (!ok) return 'You hang the plate and the mounts won\'t agree. Two settle. The third drifts a finger\'s width and stays there.';
      postState('gunner').sighted = true;
      return 'You hang a target plate at four hundred meters and walk the guns onto it, one mount at a time, until the plate has one hole in it.';
    } },
];

// What a choice can cost, said before it is picked (#293, #364): its odds, and its worst outcome in a few words, built from what the choice declares.
// `odds` is the chance it goes your way, the same number the roll uses (a post's choice improves with your level), shown as a percentage; a sure
// choice (1 or more) shows none. `hull`: a lost roll costs hull, and with it a crew casualty; `casualty`: a lost exchange can cost one without hull;
// `hand`: you may be hurt; `cost`: a lost roll costs this many credits of your own; `rep`: your standing here; `xp`: you learn less; `marks`: the captain
// marks the call (a bold or risky one); `who`: the post the roll is on, named before the odds where a choice is not simply yours (a job ashore); `range`: a word for what it does to the range ("opens the range"). A sure
// choice with nothing at stake carries no note. The contact's own moves, the boarding scenes, the ice run, the work events, the jobs ashore and the bar say it through this.
// Plain text: a label is escaped where the button is drawn (views.js).
const oddsWord = odds => `${Math.round(odds * 100)}%`;
function costNote(c, odds) {
  const costs = [...(c.hull || c.casualty ? [...(c.hull ? ['hull damage'] : []), 'a crew casualty'] : []), ...(c.sent ? [c.sent] : []), ...(c.hand ? ['you may be hurt'] : []), ...(c.cost ? [`${fmt(c.cost)} cr of your own`] : []),
    ...(c.rep ? ['your standing here'] : []), ...(c.standing ? ["the shipper's regard"] : []), ...(c.xp ? ['you learn less'] : [])];
  const text = c.marks ? [...(costs.length ? [`${costs.join(', ')}, and`] : []), 'the captain marks it'].join(' ') : costs.join(', ');
  const parts = [...(odds !== undefined && odds < 1 ? [`${c.who ? `${c.who}, ` : ''}${oddsWord(odds)}`] : []), ...(c.range ? [c.range] : []), ...(text ? [`if it fails: ${text}`] : [])];
  return parts.length ? ` [${parts.join('; ')}]` : '';
}

// The ambush: a distress call, and the pirates waiting behind it (or, now and then, a real freighter). Each post has its own
// way of reading the call, and a good read tells you which it is before you commit. A trap that springs on you gives her the
// first volley, and one you saw coming gives it to you. Offered for a burn through unsettled space (hired hand only).
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
  'sprung.result': 'You alter course for her. At forty kilometers the freighter lights a drive that\'s not a freighter\'s, and two more come off the rock behind her, and the call stops.',
  'sprung.open': 'They were waiting on the far side of the freighter, with their drives cold. By the time the sensors show them they\'re inside the range, and your position is already bad.',
  'real.result': 'She\'s real. Her second coolant bank has failed and her crew are tired and grateful, and you stand by while they restart. The owner sends 5,000 cr to the ship\'s fund.',
  'real.leave.label': 'Leave her',
  'real.leave.result': 'You leave her to call for someone else. Captain {cap} says nothing, and doesn\'t look up from the plot.',
  'trap.hit.label': 'Hit them before they\'re ready',
  'trap.hit.result': 'You come in hot with the drive cold, and light it at forty kilometers. They\'re not ready. Battle stations.',
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
  const springs = (edge, text, open) => startShipFight(scenePirate(), false, { edge, text, open }), say = key => ambushSay(key, { cap: cap.last, post: POSTS[post].name.toLowerCase() });
  const sprung = () => springs(-2, say('sprung.result'), say('sprung.open'));
  const real = () => { h.fund += 5000; like(cap, 1, lineWords('beats:ambush', 'memory.real', AMBUSH_MEMORY.real)); return say('real.result'); };
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
