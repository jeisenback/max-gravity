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
    text: 'The captain has left the approach for the next port on the sim, and said nothing about it. It\'s a hard one: a tight berth, a crosswind of station spin, and a score at the bottom of the screen with someone else\'s initials.',
    careful: [
      'Fly it slowly, until it\'s clean',
      'You fly it five times, slowly, with the numbers up on the second screen, until the approach is clean in your hands. The fifth run is four-tenths of a second off the initials at the bottom.'
    ],
    quick: [
      'Fly it at speed and see what happens',
      'You fly it hot, and it works. The score isn\'t the best, but it\'s close.',
      'You fly it hot and hit the berth wall, and the sim sounds a rude tone. You reset it and don\'t look at the score.'
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
      'You track it for an hour, logging bearing and range every five minutes. It\'s a rock, tumbling, and it passes well clear. You write down the figures anyway.'
    ],
    quick: [
      'Call it a rock and let the plot go',
      'You call it a rock and let it go, and it\'s a rock. You don\'t look at it again until it\'s behind you.',
      'You call it a rock and stop watching. Forty minutes later it changes course. It\'s a small hauler running dark, and it passes close enough to read the paint. The captain finds out from the log.'
    ]
  },
  {
    id: 'gunner-jam',
    post: 'gunner',
    title: 'The Feed',
    text: 'The gun\'s feed has stopped with a round half into the breech. The fire-control board shows a feed fault and won\'t arm the mount until it\'s cleared.',
    careful: [
      'Safe the mount and strip the feed',
      'You safe the mount, lock out the feed and strip it on the workshop bench. The follower spring is worn flat on one side. You fit the spare from the drawer and write it on the captain\'s parts sheet, then cycle twenty dummy rounds through before you put the mount back on the board.'
    ],
    quick: [
      'Clear it with the manual override',
      'You run the override and the round seats with a bang. The board clears, and the next twenty cycles run.',
      'The override seats the round crooked and the feed jams harder. You strip it anyway, and the spring you\'d have swapped is bent now as well. The captain\'s parts sheet gets two lines.'
    ]
  },
  {
    id: 'gunner-drift',
    post: 'gunner',
    title: 'The Sight',
    text: 'On the range sim every shot lands a little to the left, by the same amount each time. It started after the last hard burn. Either the sight has shifted on its bracket, or the fire control\'s offset has.',
    careful: [
      'Boresight it against a star',
      'You lock the mount, put the sight\'s cross on a bright star and bring the gun camera onto the same star, one click of the adjuster at a time. The bracket bolt is a quarter turn loose. You torque it and write the new offset in the gunnery log.'
    ],
    quick: [
      'Dial a correction into the fire control',
      'You dial in a correction from the sim\'s figures. The next ten shots land inside the ring.',
      'You dial the correction in with the wrong sign, and the sim shows the error doubled. Finding it takes an hour of the watch.'
    ]
  },
  {
    id: 'gunner-range',
    post: 'gunner',
    title: 'Range Time',
    text: 'The captain has booked the gunner an hour on the range sim before the next port, set to fast targets on a clock. The score goes in the gunnery log.',
    careful: [
      'Take the targets in order and let the clock go',
      'You take them one at a time, in the order the sim puts them up, and let the clock run over. On the third pass you\'re inside it by four seconds. The log shows three runs.'
    ],
    quick: [
      'Race the clock',
      'You take them as they come and finish with six seconds left. The log shows one run.',
      'You lose the order halfway through and the targets stack up. The run ends forty seconds over, and that\'s the one in the log.'
    ]
  },
  {
    id: 'gunner-count',
    post: 'gunner',
    title: 'The Count',
    text: 'The magazine count on the board says four hundred rounds. Your count by hand says three hundred and ninety. The captain signs for the board\'s number when the ship takes on rounds.',
    careful: [
      'Count the rack by hand, twice',
      'You count the rack round by round, and then again: three hundred and ninety. Behind the rack a sensor lead has worked out of its clip. You reseat it, and the board drops to three hundred and ninety and stays there.'
    ],
    quick: [
      'Set the board to your count',
      'You set the board to three hundred and ninety and write the reason in the log. At the next port the yard\'s count agrees.',
      'You set the board to your count. The loose lead shorts when the rack shifts, and the board goes blank. You count the rack again by hand, with the captain reading the figures back.'
    ]
  },
  {
    id: 'gunner-drone',
    post: 'gunner',
    title: 'The Target Drone',
    text: 'The captain has put the target drone out on its line, an orange canister with patched dents. It\'s the ship\'s only one, and a new one is three hundred at the Ceres yard. There are twenty minutes of range time before it comes in.',
    careful: [
      'Three aimed shots, scored one at a time',
      'You take three shots a minute apart and score each against the drone\'s telemetry. Two hit the plate. You log the third\'s miss distance and the lead you used.'
    ],
    quick: [
      'Burst it',
      'You fire a burst, and the plate rings on the telemetry four times. The drone comes back in on its line with a new dent.',
      'You fire a burst and every round goes wide. The range time runs out with the drone untouched.'
    ]
  },
  {
    id: 'engineer-vibe',
    post: 'engineer',
    title: 'A Shudder in the Drive',
    text: 'There\'s a new sound in the drive room, a low, regular shudder at the edge of hearing that you feel in your back teeth. It comes and goes with the burn. Something\'s out of balance, and you\'re the one with the tools.',
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
    text: 'The air recycler has started to smell of hot dust, and its read-out has been stuck on one number for an hour. Nobody has said anything, but you\'ve seen a few people breathing through their sleeves.',
    careful: [
      'Pull the cartridges and clean the whole stack',
      'You pull the cartridges, one at a time, and clean the stack down to bare metal. It takes the afternoon, and the air afterward is, noticeably, just air.'
    ],
    quick: [
      'Swap in the spare cartridge',
      'You swap in the spare, and the smell clears at once. The old one goes in the bin with a tag that says "check later".',
      'The spare is the wrong size and takes a gasket to seat it. By the time it runs, you\'ve lost the afternoon.'
    ]
  },
  {
    id: 'engineer-coolant',
    post: 'engineer',
    title: 'Warm Coolant',
    text: 'The coolant loop is running a few degrees warm. It\'s nowhere near a limit, but the trend is wrong, and a trend like that\'s a leak, or a pump, or a thing nobody has thought of yet.',
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
    text: 'There\'s a dark bead at the foot of the number two hatch seal, and a damp ring on the deck under it. It\'s coolant, or water, or something worse, and it wasn\'t there at the last port.',
    careful: [
      'Pull the seal and check the gasket',
      'You pull the seal and find the gasket flattened on one side, with a hair of grit under it. You clean the groove and fit a new gasket, and the deck stays dry.'
    ],
    quick: [
      'Wipe it and watch it',
      'You wipe it and watch it for a watch. It doesn\'t come back. You log the time and the place.',
      'You wipe it and watch it. It comes back at the change of watch, and the bead is a trickle. You pull the seal after all, with the deck wet.'
    ]
  },
  {
    id: 'engineer-breaker',
    post: 'engineer',
    title: 'The Tripping Breaker',
    text: 'The breaker on the galley circuit has tripped three times since the flip. Each time it resets, and each time someone says it must be the kettle. It\'s not the kettle.',
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
    text: 'There\'s a hiss on the band that wasn\'t there at the last port, rising and falling as the ship turns. It\'s stealing your range, and, if it\'s the antenna, it\'ll only get worse.',
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
      'You run the hail through every filter you have, a pass at a time, until a word comes out, and then a sentence. It\'s a tender asking for a berth. You log it and send the captain a note.'
    ],
    quick: [
      'Guess at the gaps and answer',
      'You guess at the gaps and answer, and the voice on the other end relaxes at once. You guessed right.',
      'You guess wrong, and the voice on the other end goes cold, and starts again, slower.'
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
    text: 'The station you\'re calling stamps its messages with a time that disagrees with the ship\'s clock by eleven minutes. One of them is wrong, and the log is full of messages stamped with whichever it is.',
    careful: [
      'Sync to three beacons and see which is wrong',
      'You sync to three lane beacons. The ship\'s clock is the one that has drifted, by eleven minutes. You reset it and annotate every message since the last port.'
    ],
    quick: [
      'Trust the station and adjust the offset',
      'You apply the station\'s offset, and the log lines up. You note that you didn\'t check.',
      'You apply the station\'s offset. The station was wrong. A message to the captain\'s broker goes out stamped eleven minutes in the future, and an answer comes back asking if it was a joke.'
    ]
  },
  {
    id: 'comms-relay',
    post: 'comms',
    title: 'A Relay Wants the Ship\'s Name',
    text: 'A relay buoy wants your transponder, your registry and your captain\'s name before it\'ll pass your traffic. It\'s the right procedure. It\'s also more than the last three buoys asked.',
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
