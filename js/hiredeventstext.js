'use strict';

// The text tables of hiredevents.js, moved out so the logic reads on its own (#254). Data only; loaded before hiredevents.js.

// Each: a problem at a post, a careful way (sure, and teaches more) and a quick one (a gamble
// on your odds at the post, which improve as you learn it).
const WORK_EVENTS = [
  {
    id: 'pilot-drift',
    post: 'pilot',
    title: 'Drift on the Helm',
    text: 'The nav plot and the stars disagree by a hair, and the hair is growing. Somewhere in the gyro stack a reading has gone stale, and the ship is sliding further off her line every hour.',
    careful: [
      'Re-fix the plot against three stars',
      'You shoot three stars, and then three more, and work the sums twice on paper before you trust them. The drift is a stale gyro, and you zero it. It takes most of a watch.'
    ],
    quick: [
      'Nudge the trim until it looks right',
      'You trim by eye, and the line settles back almost where it should be.',
      'You trim by eye and overshoot, and spend the next watch chasing your own correction back and forth.'
    ]
  },
  {
    id: 'pilot-lane',
    post: 'pilot',
    title: 'Crowded Lane',
    text: 'A string of haulers has bunched up on the lane ahead, all at the same speed with the same idea. The nearest transponder is closing, and nobody on the band is giving way.',
    careful: [
      'Shave your burn and let them clear',
      'You trim the burn and fall back through the gap, and a minute later the lane has sorted itself out around you. Slower, and nobody swears at you.'
    ],
    quick: [
      'Cut through the gap between two of them',
      'You thread it, between two hulls with a few hundred meters each side, and come out the far end with your pulse going.',
      'The gap closes faster than you judged, and you break off hard, with a lot of flashing lights and some language from the band.'
    ]
  },
  {
    id: 'pilot-sim',
    post: 'pilot',
    title: 'The Docking Sim',
    text: 'The captain has left the approach for the next port on the sim, and said nothing about it. It is a hard one: a tight berth, a crosswind of station spin, and a score at the bottom of the screen with someone else\'s initials.',
    careful: [
      'Fly it slowly, until it is clean',
      'You fly it five times, slowly, with the numbers up on the second screen, until the approach is clean in your hands. The fifth run is four-tenths of a second off the initials at the bottom.'
    ],
    quick: [
      'Fly it at speed and see what happens',
      'You fly it hot, and it works. The score is not the best, but it is close.',
      'You fly it hot and hit the berth wall, and the sim sounds a rude tone. You reset it and do not look at the score.'
    ]
  },
  {
    id: 'pilot-flip',
    post: 'pilot',
    title: 'The Flip Is Early',
    text: 'The captain\'s burn sheet puts the flip at the halfway mark. Your own numbers say the ship is carrying more speed than the sheet assumes, and the flip is ninety seconds early. Ninety seconds is a lot of reaction mass at the far end of a brake.',
    careful: [
      'Recompute the flip from the live numbers',
      'You pull the live velocity, rerun the brake curve, and move the flip back by ninety-four seconds. You leave the captain a note with both figures. The ship arrives on the line with fuel to spare.'
    ],
    quick: [
      'Flip where the sheet says and correct on the brake',
      'You flip at the sheet\'s mark and trim the brake by eye. The ship settles on the line with more fuel burned than you wanted.',
      'You flip at the sheet\'s mark and overshoot the brake. You spend a long watch correcting, and the captain asks for the numbers.'
    ]
  },
  {
    id: 'pilot-debris',
    post: 'pilot',
    title: 'A Return on the Plot',
    text: 'A faint return has been showing on the plot for an hour, small and slow, two degrees to port of the line. It could be a rock. It could be a ship running dark. Nobody else has mentioned it.',
    careful: [
      'Track it for another hour before you say anything',
      'You track it for an hour, logging bearing and range every five minutes. It is a rock, tumbling, and it passes well clear. You write down the figures anyway.'
    ],
    quick: [
      'Call it a rock and let the plot go',
      'You call it a rock and let it go, and it is a rock. You do not look at it again until it is behind you.',
      'You call it a rock and stop watching. Forty minutes later it changes course. It is a small hauler running dark, and it passes close enough to read the paint. The captain finds out from the log.'
    ]
  },
  {
    id: 'gunner-jam',
    post: 'gunner',
    title: 'A Jammed Feed',
    text: 'The ready rack has jammed, a round half in and half out, and the fire-control board is showing a fault in a color you have not seen. It will have to be cleared before anyone needs to shoot.',
    careful: [
      'Strip the feed and clear it by the book',
      'You safe the rack, strip the feed, and find a bent follower worn thin. You straighten it, oil the rest, and cycle the rack twenty times until it runs like a clock.'
    ],
    quick: [
      'Clear it with the manual override',
      'You hit the override and the round slams home with a clang. It runs, and keeps running.',
      'The override seats the round crooked, and you have to take the whole feed apart anyway, now with a bruise.'
    ]
  },
  {
    id: 'gunner-drift',
    post: 'gunner',
    title: 'Sights Out of True',
    text: 'The turret has been slewing a hair to the left for a week, and tonight you proved it on the range sim. Every shot lands wide by the same small amount.',
    careful: [
      'Boresight it against a fixed star',
      'You boresight it against a fixed star, slowly, one click at a time, until the cross and the star sit together and stay there. You log the offset for next time.'
    ],
    quick: [
      'Apply a correction in the fire control',
      'You dial in a correction by eye, and the next ten shots on the sim cluster neatly. It is not perfect, but it is close.',
      'You dial in the correction the wrong way and it doubles the error. It takes an hour to find and undo.'
    ]
  },
  {
    id: 'gunner-range',
    post: 'gunner',
    title: 'Practice on the Range',
    text: 'The captain wants the guns run through their paces before the next port, and has left the range sim set to something unkind: fast targets, a lot of them, and a clock.',
    careful: [
      'Work the targets one at a time',
      'You take them one at a time, in order, ignoring the clock, and by the third pass the order has become instinct. The clock is still ahead of you, but you have stopped fighting it.'
    ],
    quick: [
      'Race the clock and take them as they come',
      'You race the clock and, for once, the targets just line up. You finish with seconds in hand and a ringing in your ears.',
      'You lose the rhythm halfway through and the targets get ahead of you. You finish a long way behind the clock.'
    ]
  },
  {
    id: 'gunner-count',
    post: 'gunner',
    title: 'The Count Is Off',
    text: 'The magazine count on the board says four hundred rounds. The count you made by hand says three hundred and ninety. Someone has been in the rack, or the sensor has been lying, and either way the captain signs for the number on the board.',
    careful: [
      'Count the rack by hand, twice',
      'You count the rack round by round, and then again. It is three hundred and ninety. You find a loose sensor lead on the rack and reseat it. The board and the rack agree.'
    ],
    quick: [
      'Trust your count and correct the board',
      'You correct the board to your count and note why. The board agrees with the rack, and you log it.',
      'You correct the board, and the sensor lead shorts. The board goes blank. You spend the rest of the watch counting again, by hand, with the captain watching.'
    ]
  },
  {
    id: 'gunner-drone',
    post: 'gunner',
    title: 'Target Drone',
    text: 'The captain has launched a target drone, a battered orange canister, the only thing on the range worth shooting. It has been hit before. It is not meant to be hit twice in a burn. You have twenty minutes of range time.',
    careful: [
      'Take three shots and score each',
      'You take three shots with a full minute between them and score each against the telemetry. Two hit. You write down what the third missed by, and why.'
    ],
    quick: [
      'Burst it and see what is left',
      'You burst it, and the drone tumbles apart in a spray of orange. The captain gets the bill in the log.',
      'You burst it and miss with every round. The drone coasts on, unharmed, and the range clock runs out.'
    ]
  },
  {
    id: 'engineer-vibe',
    post: 'engineer',
    title: 'A Shudder in the Drive',
    text: 'There is a new sound in the drive room, a low, regular shudder at the edge of hearing that you feel in your back teeth. It comes and goes with the burn. Something is out of balance, and you are the one with the tools.',
    careful: [
      'Trace it through the mounts, one by one',
      'You work down the mounts with a torque wrench and a hand on each, until you find the one that has crept loose. You reseat it, and the shudder stops.'
    ],
    quick: [
      'Tighten what looks loose and listen',
      'You tighten the mount that looks loosest, and the shudder drops to a whisper and then goes. You write it down with a question mark.',
      'You tighten the wrong one, and the shudder gets worse. You spend the rest of the watch finding the right one.'
    ]
  },
  {
    id: 'engineer-recycler',
    post: 'engineer',
    title: 'The Recycler Sulks',
    text: 'The air recycler has started to smell of hot dust, and its read-out has been stuck on one number for an hour. Nobody has said anything, but you have seen a few people breathing through their sleeves.',
    careful: [
      'Pull the cartridges and clean the whole stack',
      'You pull the cartridges, one at a time, and clean the stack down to bare metal. It takes the afternoon, and the air afterward is, noticeably, just air.'
    ],
    quick: [
      'Swap in the spare cartridge',
      'You swap in the spare, and the smell clears at once. The old one goes in the bin with a tag that says "check later".',
      'The spare is the wrong size and takes a gasket to seat it. By the time it runs, you have lost the afternoon.'
    ]
  },
  {
    id: 'engineer-coolant',
    post: 'engineer',
    title: 'Warm Coolant',
    text: 'The coolant loop is running a few degrees warm. It is nowhere near a limit, but the trend is wrong, and a trend like that is a leak, or a pump, or a thing nobody has thought of yet.',
    careful: [
      'Chase it from the pump to the radiator',
      'You walk the loop from the pump to the radiator with a meter, and find a partly closed valve that someone, some time, nudged. You open it, and the loop settles.'
    ],
    quick: [
      'Bleed the loop and hope',
      'You bleed the loop and top it up, and the temperature drops back. You write "bled, topped up" in the log and nothing else.',
      'The bleed hisses and takes more than you wanted. The temperature drops, and so does the coolant level, and you spend an hour topping it up.'
    ]
  },
  {
    id: 'engineer-seal',
    post: 'engineer',
    title: 'A Weep at the Hatch',
    text: 'There is a dark bead at the foot of the number two hatch seal, and a damp ring on the deck under it. It is coolant, or water, or something worse, and it was not there at the last port.',
    careful: [
      'Pull the seal and check the gasket',
      'You pull the seal and find the gasket flattened on one side, with a hair of grit under it. You clean the groove and fit a new gasket, and the deck stays dry.'
    ],
    quick: [
      'Wipe it and watch it',
      'You wipe it and watch it for a watch. It does not come back. You log the time and the place.',
      'You wipe it and watch it. It comes back at the change of watch, and the bead is a trickle. You pull the seal after all, with the deck wet.'
    ]
  },
  {
    id: 'engineer-breaker',
    post: 'engineer',
    title: 'The Tripping Breaker',
    text: 'The breaker on the galley circuit has tripped three times since the flip. Each time it resets, and each time someone says it must be the kettle. It is not the kettle.',
    careful: [
      'Walk the circuit and test each load',
      'You walk the circuit with a meter and find a pinched cable behind the galley panel, shining where the insulation has rubbed through. You wrap it and reroute it, and the breaker holds.'
    ],
    quick: [
      'Swap the breaker and see',
      'You swap the breaker, and it holds all watch. You log it as probably the breaker.',
      'You swap the breaker, and it trips again within the hour. This time the panel is warm.'
    ]
  },
  {
    id: 'comms-noise',
    post: 'comms',
    title: 'Noise on the Band',
    text: 'There is a hiss on the band that was not there at the last port, rising and falling as the ship turns. It is stealing your range, and, if it is the antenna, it will only get worse.',
    careful: [
      'Walk the antenna run and check every join',
      'You walk the whole run with a meter, join by join, and find a connector with a green crust on it. You clean it and re-seat it, and the band comes up clear and wide.'
    ],
    quick: [
      'Re-tune the filters and see',
      'You re-tune the filters, and the hiss drops out of the speech band like a stone out of a bucket.',
      'You re-tune the filters and notch out half of someone\'s voice with the noise. You have to start again.'
    ]
  },
  {
    id: 'comms-hail',
    post: 'comms',
    title: 'A Garbled Hail',
    text: 'A hail comes in, at the very edge of range, stuttering and thick with static. A name, a transponder number and what could be a warning, or could be a tender asking for a berth. The captain would like to know which.',
    careful: [
      'Clean it up and read it properly',
      'You run the hail through every filter you have, a pass at a time, until a word comes out, and then a sentence. It is a tender asking for a berth. You log it and send the captain a note.'
    ],
    quick: [
      'Guess at the gaps and answer',
      'You guess at the gaps and answer, and the voice on the other end relaxes at once. You guessed right.',
      'You guess wrong, and the voice on the other end goes cold, and starts again, slower. Your face is hot.'
    ]
  },
  {
    id: 'comms-log',
    post: 'comms',
    title: 'The Day\'s Traffic',
    text: 'The log has built up: forty unread messages, six unanswered hails, and a list of stations that have, since the last port, changed their transponder codes without telling anyone.',
    careful: [
      'Go through it all, in order',
      'You work through it in order, and answer what needs answering, and file the rest. By the end the log is empty, and you have a list of the stations that changed their codes.'
    ],
    quick: [
      'Answer the urgent ones and skim the rest',
      'You answer the urgent ones and skim the rest, and nothing in the skim bites.',
      'You skim past a notice that turns out to matter, and spend an hour working out what it said.'
    ]
  },
  {
    id: 'comms-clock',
    post: 'comms',
    title: 'Two Clocks',
    text: 'The station you are calling stamps its messages with a time that disagrees with the ship\'s clock by eleven minutes. One of them is wrong, and the log is full of messages stamped with whichever it is.',
    careful: [
      'Sync to three beacons and see which is wrong',
      'You sync to three lane beacons. The ship\'s clock is the one that has drifted, by eleven minutes. You reset it and annotate every message since the last port.'
    ],
    quick: [
      'Trust the station and adjust the offset',
      'You apply the station\'s offset, and the log lines up. You note that you did not check.',
      'You apply the station\'s offset. The station was wrong. A message to the captain\'s broker goes out stamped eleven minutes in the future, and an answer comes back asking if it was a joke.'
    ]
  },
  {
    id: 'comms-relay',
    post: 'comms',
    title: 'A Relay Wants the Ship\'s Name',
    text: 'A relay buoy wants your transponder, your registry and your captain\'s name before it will pass your traffic. It is the right procedure. It is also more than the last three buoys asked.',
    careful: [
      'Ask the captain before you answer',
      'You take it to the captain, who reads the request twice and tells you what to send and what not to. The buoy passes your traffic. The captain adds a line to the book.'
    ],
    quick: [
      'Send what the last buoy got',
      'You send what the last buoy got. The buoy accepts it and passes your traffic, and nothing else happens.',
      'You send what the last buoy got. The buoy wants the rest, and your traffic sits in the queue for an hour while you ask the captain anyway.'
    ]
  }
];
