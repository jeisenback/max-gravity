'use strict';

// Burn events written for a hired hand. A hand draws from a pool of its own: problems at
// the post they work (they handle them, and learn), plus the road events that are the
// captain's to answer. Events that are an owner's business (the stowaway, the merchant's
// tip, the drifting container) are hidden from a hand. All the weights are here, so they
// can be tuned in one place. Loaded after hired.js; happenings.js reads it at runtime.

const HIRED_WEIGHTS = { work: 3, ship: 1 };  // against the rest of the burn's tier-2 weights
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
    title: d.title, text: d.text, via: 'crew', owner: post, workId: d.id,
    choices: [
      { label: d.careful[0], run() { gainSkill(post, 3); return d.careful[1] + note(3); } },
      { label: d.quick[0], run() {
        if (Math.random() < soloOdds(post)) { gainSkill(post, 4); return d.quick[1] + note(4); }
        gainSkill(post, 1); return d.quick[2] + note(1);
      } },
    ],
  };
}

// A problem at the hand's own post, one they have not had lately.
function hiredWorkEvent() {
  const h = hired(), st = G.state, seen = st.eventSeen = st.eventSeen || {};
  const fresh = WORK_EVENTS.filter(d => d.post === h.post && !(seen[d.id] > st.day - WORK_SEEN_DAYS));
  if (!fresh.length) return null;
  const d = pick(fresh);
  seen[d.id] = st.day;
  return workEvent(d);
}
