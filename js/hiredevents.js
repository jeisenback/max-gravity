'use strict';

// Burn events written for a hired hand. A hand draws from a pool of its own, in five groups:
// work at your post (you handle it, and learn), the captain, the crew (the main characters
// where they are aboard), money, and the road (what you see from your post). Their effects
// are your post experience, your savings, and the captain's and crew's opinion of you; none
// reaches into the run itself. Events that are an owner's business (the stowaway, the
// merchant's tip, the drifting container) are hidden from a hand. All the weights are here,
// so they can be tuned in one place. Loaded after hired.js; happenings.js reads it at runtime.

const HIRED_GROUPS = ['work', 'captain', 'crew', 'money', 'road'];
const HIRED_WEIGHTS = { work: 3, captain: 1, crew: 1, money: 1, road: 1, ship: 1 };  // against the rest of the burn's tier-2 weights
const OWNER_ONLY_EVENTS = ['Stowaway', 'Merchant Hail', 'Drifting Cargo Container'];
const WORK_SEEN_DAYS = 30;  // a problem does not come round again for this long

// Each: a problem at a post, a careful way (sure, and teaches more) and a quick one (a gamble
// on your odds at the post, which improve as you learn it).
const WORK_EVENTS = [
  { id: 'pilot-drift', post: 'pilot', title: 'Drift on the Helm',
    text: 'The nav plot and the stars disagree by a hair, and the hair is growing. Somewhere in the gyro stack a reading has gone stale, and the ship is sliding a little further off her line every hour.',
    careful: ['Re-fix the plot against three stars', 'You shoot three stars, and then three more, and work the sums twice on paper before you trust them. The drift is a stale gyro, and you zero it. It takes most of a watch.'],
    quick: ['Nudge the trim until it looks right', 'You trim by eye, and the line settles back almost where it should be.', 'You trim by eye and overshoot, and spend the next watch chasing your own correction back and forth.'] },
  { id: 'pilot-lane', post: 'pilot', title: 'Crowded Lane',
    text: 'A string of haulers has bunched up on the lane ahead, all at the same speed with the same idea. The nearest transponder is closing, and nobody on the band is giving way.',
    careful: ['Shave your burn and let them clear', 'You trim the burn and fall back through the gap, and a long, tidy minute later the lane has sorted itself out around you. Slower, and nobody swears at you.'],
    quick: ['Cut through the gap between two of them', 'You thread it, between two hulls with a few hundred meters each side, and come out the far end with a pulse still going and a small, private grin.', 'The gap closes faster than you judged, and you break off hard, with a lot of flashing lights and not a little language from the band.'] },
  { id: 'pilot-sim', post: 'pilot', title: 'The Docking Sim',
    text: 'The captain has left the approach for the next port on the sim, and said nothing about it. It is a hard one: a tight berth, a crosswind of station spin, and a score at the bottom of the screen with someone else\'s initials.',
    careful: ['Fly it slowly, until it is clean', 'You fly it five times, slowly, with the numbers up on the second screen, until the approach is clean in your hands. The initials at the bottom do not move, but you know why now.'],
    quick: ['Fly it at speed and see what happens', 'You fly it hot, and it works, which surprises you more than anyone. The score is not the best, but it is close.', 'You fly it hot and hit the berth wall, and the sim sounds a very rude tone. You reset it and do not look at the score.'] },
  { id: 'gunner-jam', post: 'gunner', title: 'A Jammed Feed',
    text: 'The ready rack has jammed, a round half in and half out, and the fire-control board is showing a fault in a color you have not seen. It will have to be cleared before anyone needs to shoot.',
    careful: ['Strip the feed and clear it by the book', 'You safe the rack, strip the feed, and find a bent follower worn thin. You straighten it, oil the rest, and cycle the rack twenty times until it runs like a clock.'],
    quick: ['Clear it with the manual override', 'You hit the override and the round slams home with a clang. It runs, and keeps running.', 'The override seats the round crooked, and you have to take the whole feed apart anyway, now with a bruise.'] },
  { id: 'gunner-drift', post: 'gunner', title: 'Sights Out of True',
    text: 'The turret has been slewing a hair to the left for a week, and tonight you proved it on the range sim. Every shot lands wide by the same small amount, as if the gun had an opinion.',
    careful: ['Boresight it against a fixed star', 'You boresight it against a fixed star, slowly, one click at a time, until the cross and the star sit together and stay there. You log the offset for next time.'],
    quick: ['Apply a correction in the fire control', 'You dial in a correction by eye, and the next ten shots on the sim cluster neatly. It is not perfect, but it is close.', 'You dial in the correction the wrong way and it doubles the error. It takes an hour to find and undo.'] },
  { id: 'gunner-range', post: 'gunner', title: 'Practice on the Range',
    text: 'The captain wants the guns run through their paces before the next port, and has left the range sim set to something unkind: fast targets, a lot of them, and a clock.',
    careful: ['Work the targets one at a time', 'You take them one at a time, in order, ignoring the clock, and by the third pass the order has become instinct. The clock is still ahead of you, but you have stopped fighting it.'],
    quick: ['Race the clock and take them as they come', 'You race the clock and, for once, the targets just line up. You finish with seconds in hand and a ringing in your ears.', 'You lose the rhythm halfway through and the targets get ahead of you. You finish a long way behind the clock.'] },
  { id: 'engineer-vibe', post: 'engineer', title: 'A Shudder in the Drive',
    text: 'There is a new sound in the drive room, a low, regular shudder at the edge of hearing that you feel in your back teeth. It comes and goes with the burn. Something is out of balance, and you are the one with the tools.',
    careful: ['Trace it through the mounts, one by one', 'You work down the mounts with a torque wrench and a hand on each, until you find the one that has crept loose. You reseat it, and the shudder stops, and the quiet is the best sound you have heard all week.'],
    quick: ['Tighten what looks loose and listen', 'You tighten the mount that looks loosest, and the shudder drops to a whisper and then goes. You write it down with a question mark.', 'You tighten the wrong one, and the shudder, offended, gets worse. You spend the rest of the watch finding the right one.'] },
  { id: 'engineer-recycler', post: 'engineer', title: 'The Recycler Sulks',
    text: 'The air recycler has started to smell of hot dust, and its read-out has been stuck on one number for an hour. Nobody has said anything, but you have seen a few people breathing through their sleeves.',
    careful: ['Pull the cartridges and clean the whole stack', 'You pull the cartridges, one at a time, and clean the stack down to bare metal. It takes the afternoon, and the air afterward is, noticeably, just air.'],
    quick: ['Swap in the spare cartridge', 'You swap in the spare, and the smell clears at once. The old one goes in the bin with a tag that says "check later".', 'The spare is the wrong size and takes a gasket to seat it. By the time it runs, you have lost the afternoon and a good deal of temper.'] },
  { id: 'engineer-coolant', post: 'engineer', title: 'Warm Coolant',
    text: 'The coolant loop is running a few degrees warm. It is nowhere near a limit, but the trend is wrong, and you know a trend like that is a leak, or a pump, or a thing you have not thought of yet.',
    careful: ['Chase it from the pump to the radiator', 'You walk the loop from the pump to the radiator with a meter, and find a partly closed valve that someone, some time, nudged. You open it, and the loop settles.'],
    quick: ['Bleed the loop and hope', 'You bleed the loop and top it up, and the temperature drops back. It does not feel like an answer, but it is a good enough one for now.', 'The bleed hisses and takes more than you wanted. The temperature drops, and so does the coolant level, and you spend an hour topping it up.'] },
  { id: 'comms-noise', post: 'comms', title: 'Noise on the Band',
    text: 'There is a hiss on the band that was not there at the last port, rising and falling as the ship turns. It is stealing your range, and, if it is the antenna, it will only get worse.',
    careful: ['Walk the antenna run and check every join', 'You walk the whole run with a meter, join by join, and find a connector with a green crust on it. You clean it and re-seat it, and the band comes up clear and wide.'],
    quick: ['Re-tune the filters and see', 'You re-tune the filters, and the hiss drops out of the speech band like a stone out of a bucket. Good enough, you think, for now.', 'You re-tune the filters and notch out half of someone\'s voice with the noise. You have to start again.'] },
  { id: 'comms-hail', post: 'comms', title: 'A Garbled Hail',
    text: 'A hail comes in, at the very edge of range, stuttering and thick with static. A name, a transponder number and what could be a warning, or could be a tender asking for a berth. The captain would like to know which.',
    careful: ['Clean it up and read it properly', 'You run the hail through every filter you have, a pass at a time, until a word comes out, and then a sentence. It is a tender asking for a berth. You log it and send the captain a note.'],
    quick: ['Guess at the gaps and answer', 'You guess at the gaps and answer, and the voice on the other end relaxes at once. You guessed right, and feel, for a moment, very clever.', 'You guess wrong, and the voice on the other end goes cold and starts again, slower, as if to a child. It is a small, red-faced moment.'] },
  { id: 'comms-log', post: 'comms', title: 'The Day\'s Traffic',
    text: 'The log has built up: forty unread messages, six unanswered hails, and a list of stations that have, since the last port, changed their transponder codes without telling anyone.',
    careful: ['Go through it all, in order', 'You work through it in order, and answer what needs answering, and file the rest. By the end you know the traffic in this part of the lane better than you did, and the log is clean.'],
    quick: ['Answer the urgent ones and skim the rest', 'You answer the urgent ones and skim the rest, and nothing in the skim bites. A shortcut, and it holds.', 'You skim past a notice that turns out to matter, and spend an hour working out what it said. The rest of the log sulks.'] },
];

function workEvent(d) {
  const post = d.post, note = n => ` (+${n} experience at the ${POSTS[post].name.toLowerCase()} post.)`;
  return {
    title: d.title, text: d.text, via: 'crew', owner: post, workId: d.id, personal: true,
    choices: [
      { label: d.careful[0], run() { gainSkill(post, 3); return d.careful[1] + note(3); } },
      { label: d.quick[0], run() {
        if (Math.random() < soloOdds(post)) { gainSkill(post, 4); return d.quick[1] + note(4); }
        gainSkill(post, 1); return d.quick[2] + note(1);
      } },
    ],
  };
}

// ---------- the captain, the crew, money and the road ----------
// Each is { id, group, mate, when(c), make(c) }; c is who is about: the captain, a shipmate (anyone aboard).
// `mate` marks an event that needs a shipmate.
const capLike = (c, n, memory) => like(c.cap, n, memory);
const learn = n => { gainSkill(hired().post, n); return ` (+${n} experience at the ${POSTS[hired().post].name.toLowerCase()} post.)`; };
const castKeys = () => castAboard().map(m => m.cast);
const handEvent = (title, text, choices) => ({ title, text, choices, via: 'crew', personal: true });

const HAND_EVENTS = [
  ...WORK_EVENTS.map(d => ({ id: d.id, group: 'work', post: d.post, make: () => workEvent(d) })),

  { id: 'cap-order', group: 'captain', make: c => handEvent('An Order You Do Not Like',
    `Captain ${c.cap.last} wants the drive run hotter than you would, to make a berth window at the next port, and has said so in the tone of someone who has already decided. You have a view, and so, you suspect, does everyone else aboard.`, [
      { label: 'Do as ordered', run() { capLike(c, 1, 'You did as you were told on the hot burn.'); return `You run it the way you were told, and the window is made, with a minute to spare. The captain says nothing, which is, from them, a kind of thanks.${learn(1)}`; } },
      { label: 'Say what you think', run() {
        if (c.cap.opinion >= 1) { capLike(c, 2, 'You told me plainly what you thought, and you were right to.'); return `You say it plainly and without heat, and the captain listens, and, after a long pause, gives ground a little. "Noted," they say. "Run it at ninety." It is the first time anyone has been asked.${learn(2)}`; }
        capLike(c, -1, 'You argued the burn with me when I had decided.');
        return 'You say it, and it lands badly. "I did not ask," the captain says, quite pleasantly, and the conversation is over. You run it hot, and it works, which is somehow worse.';
      } },
    ]) },

  { id: 'cap-praise', group: 'captain', make: c => handEvent('A Word of Praise',
    `Captain ${c.cap.last} catches you at the end of a watch and says, with the air of a person reading out a line item, that the ${POSTS[hired().post].name.toLowerCase()} has not given them a worry in a week. It is, from this captain, practically a speech.`, [
      { label: 'Take it modestly', run() { capLike(c, 1, 'You took my thanks without making a thing of it.'); return `"The crew make it easy," you say, and the captain gives a short, satisfied nod, and goes aft. You stand a little straighter for the rest of the watch.${learn(1)}`; } },
      { label: 'Ask if it is worth a bonus', run() {
        if (c.cap.opinion >= 2) { G.state.credits += 60; capLike(c, 0, 'You asked for a bonus and had earned it.'); return 'The captain raises an eyebrow, and then, to your surprise, laughs. "Fair," they say. "Sixty." It lands in your account before the end of the watch.'; }
        capLike(c, -1, 'You asked for a bonus before you had earned one.');
        return 'The captain looks at you for a moment. "When it is a speech, it is free," they say. "When it is a bonus, it is earned." You have the feeling of having spent something you did not have.';
      } },
    ]) },

  { id: 'cap-dressing', group: 'captain', make: c => handEvent('A Dressing-Down',
    `The log has a gap in it, a watch with no entry, and the captain has found it. Captain ${c.cap.last} does not shout. They put the log on the galley table, turn it round so it faces you, and wait, and the waiting is the worst of it.`, [
      { label: 'Own it', run() { capLike(c, 1, 'You owned a mistake in the log without being made to.'); return `"That was mine," you say. "I will fix it tonight." The captain looks at you a moment longer, and nods, and takes the log back. It is not forgiveness, quite, but it is the beginning of the end of the matter.${learn(2)}`; } },
      { label: 'Blame the old terminal', run() { capLike(c, -2, 'You blamed the terminal for a gap in the log.'); return 'You mention the terminal, which does, in fairness, lose entries. "It does," the captain agrees. "It has never once lost one of mine." The log is closed, gently, and you are left holding an excuse nobody wanted.'; } },
    ]) },

  { id: 'cap-favour', group: 'captain', make: c => handEvent('A Favour',
    `Captain ${c.cap.last} asks, in the careful way of someone who does not ask, whether you would stand an extra watch so a crew member can sleep, and say nothing about it. It is not in the articles. It is the kind of thing that is remembered.`, [
      { label: 'Stand the watch', run() { capLike(c, 2, 'You stood a watch for me without being paid for it.'); return `You take it, and the long dark hours go slowly, with a flask of the galley's worst coffee, and nobody ever mentions it. The captain mentions it once, at the next port, in a single sentence, and it is enough.${learn(2)}`; } },
      { label: 'Stand it for forty credits', run() { G.state.credits += 40; capLike(c, 0, 'You stood a watch for me for a fee.'); return 'The captain pays it without comment, out of their own pocket, and files it, you can tell, under a heading of its own. The watch passes like any other.'; } },
      { label: 'Beg off', run() { capLike(c, -1, 'You would not stand an extra watch.'); return '"Of course," says the captain, evenly, and goes to find somebody else. It is the answer you were entitled to give, and you feel it on the back of your neck for the rest of the burn.'; } },
    ]) },

  { id: 'crew-cover', mate: true, group: 'crew', make: c => handEvent('Cover for a Shipmate',
    `${c.mate.first} finds you before the watch change, looking at the deck. They have a thing to do, a message to send, a call home that cannot wait, and could you take the first hour of their watch, and not say anything about it?`, [
      { label: 'Cover for them', run() { like(c.mate, 2, 'You covered an hour of my watch and said nothing.'); return `You cover it, and it is a quiet hour, and, when they come back, ${c.mate.first} is a different shape, lighter, and looks at you across the galley with a plain gratitude that does not need to be mentioned.${learn(1)}`; } },
      { label: 'Not tonight', run() { like(c.mate, -1, 'You would not cover an hour of my watch.'); return `${c.mate.first} nods, and says it is fine, and it is, and it is also, for a day or two, a little colder at the galley table.`; } },
    ]) },

  { id: 'crew-needle', mate: true, group: 'crew', make: c => handEvent('Words in the Galley',
    `${c.mate.first} has been needling you for a week about the ${POSTS[hired().post].name.toLowerCase()}, in the easy way of someone who thinks it is a soft job. Tonight, over the mess table, they say it where everyone can hear.`, [
      { label: 'Show them the work', run() {
        if (Math.random() < soloOdds(hired().post)) { like(c.mate, 1, 'You showed me what the post is really like.'); return `You take them through a watch at your post, slowly and without a word of argument, and by the end they are a good deal quieter. "All right," ${c.mate.first} says. "Fair." It is, you realize, respect.${learn(2)}`; }
        like(c.mate, -1, 'You tried to prove a point about your post and it went badly.');
        return `You try to show them, and it goes wrong at the worst moment, in front of an audience, and ${c.mate.first} is kind enough not to say anything, and that is the cruelest part.${learn(1)}`;
      } },
      { label: 'Let it go', run() { like(c.mate, 0, 'You let a needling go.'); return `You let it go, and finish your tea, and the table moves on. ${c.mate.first} looks, for a moment, almost disappointed.`; } },
    ]) },

  { id: 'crew-cards', mate: true, group: 'crew', make: c => handEvent('Card Night',
    `There is a game in the galley, a long-running, ill-tempered one with a deck gone soft at the corners, and ${c.mate.first} has kept you a seat. The stake is fifty credits a hand, which on a hired hand's pay is a great deal of money to lose.`, [
      { label: 'Sit in (50 cr)', can: () => G.state.credits >= 50, run() {
        if (Math.random() < 0.45) { G.state.credits += 100; like(c.mate, 1, 'You took the pot off me fair and square.'); return `The cards fall your way for once, and you take the pot, fifty credits of other people's money, and ${c.mate.first} slaps the table and demands a rematch. You win ${fmt(50)} cr net.`; }
        G.state.credits -= 50; like(c.mate, 1, 'You sat in at cards and lost like a good sport.');
        return `You lose the hand, and lose it cheerfully, and ${c.mate.first} pushes your last coin back across the felt with a grin. "Come again," they say. You are fifty credits poorer, and, oddly, not unhappy about it.`;
      } },
      { label: 'Watch from the side', run() { like(c.mate, 0, 'You watched the card game and kept your credits.'); return 'You watch from the end of the bench, with your tea, and enjoy the argument more than the cards.'; } },
    ]) },

  { id: 'crew-ines', group: 'crew', when: () => castKeys().includes('ines'), make: c => handEvent('Ines Calls the Numbers',
    'Ines is flying a hard approach by hand, a tight, ugly one, and asks you over her shoulder, without looking round, whether you would read her the numbers. "Slowly," she says. "And do not be clever."', [
      { label: 'Read her the numbers', run() { castLike('ines', 1, 'You read me the numbers on a hard approach and did not try to be clever.'); return `You read her the numbers one by one, plainly, and she flies them, and the ship settles onto the line as if she had always meant it to. "Good," says Ines, which from her is a great deal. You have learned more in ten minutes than in the last week.${learn(3)}`; } },
      { label: 'Say you would rather watch', run() { castLike('ines', 0, 'You watched from the back and let me fly.'); return 'You stand behind her and watch her hands, and she does not say a word, and the approach is flawless. You do not learn much, but you do not break anything.'; } },
    ]) },

  { id: 'crew-tomas', group: 'crew', when: () => castKeys().includes('tomas'), make: c => handEvent('Tomas in the Engine Room',
    'Tomas has a flask, two tin cups and the whole of a quiet watch, and he pours you one without asking. "Sit," he says. "She is running well, and I would like to tell somebody why."', [
      { label: 'Sit and listen', run() { castLike('tomas', 1, 'You sat with me in the engine room and listened.'); return `He tells you about the loop, and the mounts, and the three hulls he has rebuilt, with a quiet, unhurried pride, and you listen, and the flask goes round twice. By the end you understand something about machines you had not before.${learn(2)}`; } },
      { label: 'Say you have work to do', run() { castLike('tomas', 0, 'You had work to do and did not stay.'); return '"Of course," he says, and caps the flask, and turns back to the loop. He is not offended. He is just a little more alone with it than he was a minute ago.'; } },
    ]) },

  { id: 'money-side', group: 'money', make: c => handEvent('Work on the Side',
    'A broker at the last port left word that there is a day of work going, nothing to do with the ship: loading, mostly, for a trading house that pays cash and asks nobody anything. It would be your own time. It would be, as they say, a few credits.', [
      { label: 'Take the work', run() { const n = randInt(8, 16) * 10; G.state.credits += n; return `You spend your time ashore hauling crates for a trading house, and sleep badly for it, and are ${fmt(n)} cr richer by the time the ship sails.`; } },
      { label: 'Pass', run: () => 'You pass, and spend the time ashore as you like, which is its own kind of wealth. The broker nods and finds somebody else.' },
    ]) },

  { id: 'money-loan', mate: true, group: 'money', make: c => handEvent('A Loan',
    `${c.mate.first} asks to borrow a hundred credits, quietly, at the end of a watch, with the look of a person who has been practicing the sentence. There is a family matter, something about a debt at home, and it will, they say, be paid back.`, [
      { label: 'Lend a hundred', can: () => G.state.credits >= 100, run() { G.state.credits -= 100; like(c.mate, 3, 'You lent me a hundred credits when I needed it.'); return `You lend it, no questions, and ${c.mate.first} takes it with both hands and cannot find the words. It is a hundred credits you may or may not see again, and a good deal more than that in other ways.`; } },
      { label: 'Lend fifty', can: () => G.state.credits >= 50, run() { G.state.credits -= 50; like(c.mate, 1, 'You lent me fifty credits, which was what you could spare.'); return `"It is what I can spare," you say, and ${c.mate.first} says that is fine, that it is more than anyone else offered, and means it, mostly.`; } },
      { label: 'Say no', run() { like(c.mate, -1, 'You would not lend me anything.'); return `You say you cannot, and it is true, or true enough. ${c.mate.first} nods and does not ask again, and the not asking is its own sort of silence.`; } },
    ]) },

  { id: 'money-short', group: 'money', make: c => handEvent('Short on the Pay',
    `The statement for the last run is a day short. You have counted it twice, and once more, in case. It is a small amount, ${fmt(hired().wage)} cr, and it is yours, and it would be easy to say nothing.`, [
      { label: 'Raise it quietly with the captain', run() { G.state.credits += hired().wage; capLike(c, 0, 'You raised a short statement politely.'); return `You raise it at the end of a watch, with the statement in your hand, and the captain checks it, and winces. "My error," they say. "Fixed." It is fixed by morning, and you are ${fmt(hired().wage)} cr up.`; } },
      { label: 'Make a scene', run() { G.state.credits += hired().wage; capLike(c, -2, 'You made a scene about a short statement.'); return `You raise it, loudly, in the galley, and the captain pays it, with ice in the voice. You are ${fmt(hired().wage)} cr up, and, for a good while, a good deal colder.`; } },
      { label: 'Say nothing', run: () => 'You say nothing, and let it go, and the day passes. It was only a day, you tell yourself, and it was.' },
    ]) },

  { id: 'road-scope', group: 'road', make: c => {
    const post = hired().post, where = { pilot: 'From the helm', gunner: 'On the fire-control scope', engineer: 'In the drive room, off a stray sensor return,', comms: 'On the band' }[post];
    return handEvent('Something Off the Lane',
      `${where} you pick up something that does not sit right: a transponder that does not match its hull, loitering just off the lane. It is not a threat, yet. It is the sort of thing a captain would want to know, and, equally, the sort of thing a hand is not asked about.`, [
        { label: 'Tell the captain at once', run() { capLike(c, 1, 'You brought me something off the lane when you saw it.'); return `You report it, and Captain ${c.cap.last} nods, asks two questions, and changes the burn by a few degrees without another word. An hour later the loiterer is a long way astern. "Good eyes," the captain says, later, to nobody in particular.${learn(2)}`; } },
        { label: 'Log it and keep watching', run() { capLike(c, 0, 'You logged something off the lane.'); return `You log it and keep watching, and it turns out to be nothing, or at least nothing that comes to anything. The log has a new line in it, and you have a better feel for what a quiet lane looks like.${learn(1)}`; } },
        { label: 'Say nothing', run: () => 'You say nothing, and it goes away, and you will never know whether it mattered. It is not your job to know, you tell yourself.' },
      ]);
  } },
];

// Who is about on this burn: the captain, and a shipmate (the main characters are shipmates when aboard).
function handContext() {
  const mates = procedural().map(f => f.p);
  return { cap: person(hired().captain), mate: mates.length ? pick(mates) : null };
}

// An event of the group the hand has not had lately, and that has what it needs (a shipmate, the
// main character it is about being aboard).
function hiredEvent(group) {
  const h = hired(), st = G.state, seen = st.eventSeen = st.eventSeen || {}, c = handContext();
  const fresh = HAND_EVENTS.filter(d => d.group === group && (!d.post || d.post === h.post) && !(seen[d.id] > st.day - WORK_SEEN_DAYS)
    && (!d.when || d.when(c)) && (!d.mate || c.mate));
  if (!fresh.length) return null;
  const d = pick(fresh);
  seen[d.id] = st.day;
  return d.make(c);
}
