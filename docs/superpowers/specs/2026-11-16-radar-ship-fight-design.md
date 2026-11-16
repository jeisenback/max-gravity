# The ship fight on the radar

The hired hand's ship fight played on the sensor board: real positions, momentum and facing, a fire-control picture with honest error,
real time with pause, and an NPC captain whose order each post carries out. It replaces the turn-based ship fight (`js/fight.js`
`resolveShipTurn`, `js/fightui.js`, the board in `js/board.js`) for a hired hand. Boarding is a separate spec and is not changed here:
a fight that ends `boarded` still opens today's deck fight.

The design comes from the combat brainstorm of November 2026 and the radar prototype it produced (`prototypes/radar-spike.html`,
played and revised with the owner). The prototype is a reference for how the fight plays and reads. None of its code is to be reused.

## Why

- Today the board is a picture. Range is one of four bands, the contact's bearing comes from an `edge` number, and nothing done on the
  board changes the outcome. The owner wants the radar to be where the fight is played: firing solutions, burn trajectories, ship
  movement and PDC spread.
- Fixed 20-second turns flatten two time scales. Torpedoes are a slow threat (minutes of flight, where the choices are early:
  evade, spoof, set the PDC) and the PDC is a fast one (seconds, in its last kilometres). Real time with pause lets the approach pass
  quickly and the close fight play slowly.
- The game's own idea is protected: the player is one crew member at one post under an NPC captain, not the commander. None of the
  games studied (Aurora 4X, Cold Waters, Nebulous: Fleet Command, FTL) does that.

## The owner's choices (2026-11-16)

Taken during the brainstorm, each after playing the prototype:

1. **The board becomes the game** (option A over "a readable board with the same orders"), prototyped to check that a post without
   the guns still has a fight.
2. **Posts talk to each other.** The crew weigh a call against their own read.
3. **Fire control is stock, with error.** Every ship sees everything, with uncertainty drawn on the board. Upgrades narrow the error
   (accuracy) or keep it from growing when the sensors are worn (resilience). Paying to see the fight was rejected.
4. **The captain and the gunner drive the fight.** The captain sets the order; the gunner works the shot. Pilot, engineer and comms
   carry out the order with skill checks and make suggestions to the captain. Whether a suggestion is taken depends on trust, the
   suggester's skill, what the board shows and the captain's nerve.
5. **What the hand touches** (owner's "Agreed", 2026-11-16): at the pilot and gunner posts the hand works the radar (the pilot drags
   the burn inside the order's limits, the gunner places the shot); at engineer and comms the hand picks how to carry out the order
   and a check with the odds shown decides it. This is the prototype's mode A at pilot and gunner and mode B elsewhere. There is no
   mode switch in the game.
6. **The ship keeps its facing.** The hull turns at most 90 degrees an order cycle and the drive lights only with the nose within 30
   degrees of the burn. The cost of an order to the gun is shown before it is given ("the hull ends 51 degrees off her: no gun").
7. **Real time with pause, at 1x, 2x and 16x** ("more strategic RPG than flight sim"). It pauses itself only on new events, never on a
   standing condition.
8. **Long ranges.** She is met at 250 km; torpedoes are fast and long-legged and launch from about 165 km; the radar zooms.
9. **The gunner runs the gun or the PDC each cycle, never both.**
10. **The page:** a situation bar and an event timeline around the radar, event marks that fade on the radar, and a side panel that is
    a "Needs you" list over a console of tiles and readouts ("C on B").
11. **Option 1 for the build:** a new fight beside the old one, then the old one retired.

## Goals

- The hand plays the fight on the radar at every post, and what they do changes the outcome.
- The fight reads at a glance: what is happening now, what has happened, and what needs the hand this cycle.
- The fight's choices carry over from today's: each type of ship has a threat that needs its own answer, and reading her beats any
  fixed habit.
- The game stays playable at every step of the build.

## Non-goals

- Boarding (its own spec). `boarded` hands over to today's deck fight.
- The owner game (parked, `ROADMAP.md`). The fight is written for the hired hand. An owner who kept a post fights the old way until the
  old fight is retired, and then this way at their kept post; the owner is never the captain here.
- Fleet fights. One or two of her (a raider pair stays), one of us.
- A pilot that flies the ship by hand outside the fight. Departure, docking and the autopilot are unchanged (`COMBAT.md`, #53).
- Ship design or outfit shopping inside the fight.

## Anti-goals

These would make it a failure even if it works:

- **A flight sim.** If the fight is won by twitch timing at 1x, or the hand has to steer every cycle to stay alive, it has failed.
  Every choice can be made paused.
- **A commander game.** If the hand ends up deciding the captain's order, it has failed. The hand suggests; the captain decides.
- **Menus.** If a post's fight is clicking the same button each cycle with the radar ignored, it has failed for that post.
- **Nagging pauses.** If real time cannot stay at 16x for more than a few seconds through a whole fight, the pause rules are wrong.

## Constraints

- Hired hand only, written with no `hired()` fork inside its logic (CLAUDE.md). What the player may decide is asked of `role()`.
- The rules are a pure module: they take the fight's state and return the next, read no `G`, and run in Node through
  `tests/nodecontext.js`, as `js/fight.js` does today. Randomness comes in as a `rand` function.
- Classic scripts in one global scope, linked in `index.html`; new `G` fields declared in `js/game.js`.
- Desktop only, at least 1000 px wide (#937).
- Every new button is pressed by a test (#1327).
- The page is built on the view helpers (`js/views.js`).
- The words are in the game's voice (`docs/bible/voice.md`) and live in the scene text tables, as `scene:fight` does now.

## Approaches

1. **A new fight beside the old one, then retire the old (chosen).** A new pure module for the radar fight's rules and a new screen.
   While it is built, a setting chooses which fight a contact starts. When the new fight meets its targets (below), the old ship fight,
   its board and its tests are removed. Each step ships and is tested on its own; the old fight is there to compare against.
2. **Replace `fight.js` in one go.** Faster to write, but one very large change, and the old fight's pins and soak targets would all
   break at once with nothing to compare against.
3. **Real positions under today's range bands, with fixed turns.** Ruled out: it gives neither real time with pause nor the long
   ranges.

## The fight

All numbers are the prototype's starting values, to be tuned against the targets with the fight tool.

### Time

- The fight runs in **order cycles** of 20 seconds of fight time. Orders, power and the comms action are set per cycle; the pilot's
  burn and the PDC's arc can be changed at any moment and take effect at once.
- **Resolution is fixed-step whatever the speed:** 24 steps a cycle, each in a stated order: move, sensors, fire control, fire, point
  defence, damage. A fast object that would cross a whole step (a torpedo through the PDC's reach) is resolved at the exact moment it
  crosses, not sampled.
- **Speeds:** pause, 1x (a cycle takes 20 real seconds), 2x and 16x. The fight opens at 16x.
- **Every choice can be made while paused**, and pausing is free.
- **It pauses itself on new events only**, saying why on the radar and in the situation bar:
  - she arms a salvo; she launches;
  - a torpedo will reach the PDC's reach this cycle;
  - we are hit;
  - a call to the hand;
  - she comes into gun range (once);
  - the captain's plan moves into or out of evade or break-off.
  It does not pause on a standing condition (the gun locked with heat, a coast, an order that only refines the plan).

### Space

- Top-down, centred on our ship. Both ships and every torpedo have a position and a velocity, with real momentum.
- **She is met at 250 km**, closing at about 12 km a cycle, and only jinks once inside 60 km. **Escape** is opening past 400 km.
- The radar **zooms** to keep her and any torpedoes in view (50, 150 and 400 km), and can be set by hand.
- Where today's contact starts differently (a patrol at gun range, an ambush close in, `js/range.js`, `js/engagements.js`), the opening
  range keeps that relation: the builder sets each opening from where today's fight starts, scaled to the new ranges.

### Our ship

- **Facing is the ship's own.** The hull turns at most 90 degrees a cycle. The drive lights only with the nose within 30 degrees of the
  burn direction, so a flip and burn takes about two cycles.
- **The main gun is fixed to the bow** and bears within 30 degrees of the nose. The close-defence turret is the PDC.
- **Power:** six units across drive, guns and PDC, set by the captain's order and carried out by the engineer.
- **Heat:** each shot adds heat by the power behind it; a cap of 5; over it the gun locks; a vent clears it at a risk.
- Her ships and ours are drawn from the same ship data as today (`SHIPS`, `FOE_TYPES`, the pooled armour and parts of `js/fight.js`).

### The gun, the PDC and torpedoes

- **The gun.** The gunner places the shot. The aim point is where the fire control predicts her; the spread is a ring that grows with
  range, with our own burn, and with the board's error, and shrinks with the gunner's level. Damage falls off past 20 km (three
  quarters) and 30 km (half). A shot needs the gun to bear.
- **The PDC.** An arc the gunner sets, narrow or wide. Its chance to kill a torpedo grows with how far the torpedo travels through the
  arc, so a narrow arc kills well inside it and a wide one covers more and kills less. Its reach is 9 km.
- **Gun or PDC each cycle.** At the start of each cycle the fire control is committed to the gun or the PDC, never both. A stowed PDC is
  drawn dashed. The arc can still be swung mid-cycle; whether it fires is set at the start.
- **Torpedoes** steer toward their target's projected track. Hers launch from about 165 km and take about four cycles to arrive, so
  the comms call, the spoof, the evade and setting the PDC all come before they reach the PDC. Ours (the hauler's launcher and its two
  torpedoes) are fired by the gunner. Each torpedo is spent whether it hits or not.

### Fire control and what the board shows

- **Every ship has fire control.** The board projects four cycles ahead for both ships, with a dot at each cycle; her contact is drawn
  with a real sensor error, and both the hand's aim and the crew's suffer from it.
- **The error is drawn honestly:** projected tracks widen into bands as they run forward; closest approach is a range ("19 to 25 km in
  about 2.8 cycles"); a torpedo's impact time is a range with an error circle; the gun's solution is a range ("30 to 55%"). Her true
  position always falls inside her band.
- **What narrows it:** a comms lock on her (and it bends her projected track toward her habit); the accuracy upgrade (halves the error
  and tightens the gun); the resilience upgrade (keeps worn sensors from widening it). **What widens it:** sensor condition (the
  ship's wear on its sensors, which `js/board.js` already reads), and her spoof.
- **Accuracy and resilience are outfits**, bought by whoever pays for the ship (the captain for a hand, through the ship's fund;
  the co-op in chapter two). A hand cannot buy them but can argue for them. Starting values: stock error 0.5 km at full sensors,
  1.25 km at 40%; accuracy 0.25 km; resilience holds 40% sensors to about 0.7 km.

### The captain's order

- **The captain sets the order each cycle**, after comms has reported: close and engage (to about 12 km), hold at 20 km, open the
  range, break off, or evade. The captain's nerve (the captain card's, as today) shapes it: called-out torpedoes about to hit lead to
  evade; a badly hurt ship with a less hurt foe leads a cautious captain to break off; a hurt foe or a bold captain closes.
- **The order sets** the power split, the comms stance and the pilot's limits.
- **Its cost is shown before it is carried out:** where the hull will end, whether the gun will bear, and why ("the drive points
  away from her to do this").
- **The crew pilot coasts nose-on** while within 10 km of the range to hold (6 km when closing to engage) and not closing fast, and
  makes short burns otherwise, so that the ship does not run from its own fight by default.

### The posts

The hand works one post (`hired().post`); the crew work the other three at their own levels (today's `roleSkill`). The hand never sets
the captain's order.

- **Gunner** (works the radar): places the shot; sets the PDC's arc; commits the fire control to the gun or the PDC; fires or holds;
  fires our torpedoes. The hand's level tightens the spread.
- **Pilot** (works the radar): drags the burn inside the order's limits, shown as a wedge (90 degrees for a burn order; a coast order
  allows trims up to 30% throttle). Skill scatters where the burn really lands, drawn as two rings: at level 0 a burn can land 20
  degrees off, at level 5 where it was put. When coasting, the hand chooses to turn to her or to hold the facing.
- **Engineer** (picks and checks): the order sets the split. The hand chooses "by the book" (the power arrives on time, or the old
  split stays a cycle) or "push it" (the top system runs harder, or the breaker trips and it drops). Venting is a check too.
- **Comms** (picks and checks): watch always works and sees her salvo a cycle before launch and torpedoes at any range; lock and spoof
  are checks with the odds shown, and a failed one leaves the board blind past 12 km for the cycle. The crew act only on a torpedo
  they can see close in, or one comms has called out.

Every check uses the game's existing check (`handCheck`) at the post's level, with the odds on the button.

### Calls and suggestions

- **Calls between posts:** each post has a few short calls (gunner to pilot: "nose on her, two cycles"; comms to all: "two torps off
  her, impact in three"; engineer: "drive or PDC, not both"). The post called weighs it against its own read and the captain's order,
  and never goes against the order.
- **Suggestions to the captain:** pilot, engineer and comms (and the gunner) can suggest a change of order, once a cycle. Each shows
  its odds and whether the gun would bear. The odds combine the captain's trust in the hand (today's opinion), the hand's level,
  whether the board supports the call, and the captain's nerve. At the prototype's values a suggestion is taken about 35% of the time
  at level 0 and 70% at level 5.
- Calls to the hand come up in "Needs you" with their answers (do it, no, heard).

### Her

Each type keeps its signature from today's fight, now drawn on the radar:

- **A raider** closes fast to come alongside and board while her lock is whole. Answer: hit her lock as she closes, or keep the range.
- **A corsair** arms and fires salvos of torpedoes. Answer: the comms call, the evade, the PDC, the spoof.
- **A navy cutter** has thick armour. Answer: torpedoes and hard fire at her hull, or breaking off (and heaving to stays what it is now).
- **A raider pair**: two contacts, two locks to stop.
- **Veterans** (`GRADE_HULL`, `GRADE_PUNCH`) hit harder and last longer, as today.

### How it ends

The fight ends in today's named ends, so everything after it (`shipFightEnd` in `js/fightui.js`: the captain's regard, experience,
dead in space, boarding, the ship taken, shed cargo) works unchanged:

- `crippled`: her weapons and drive gone;
- `broke`: she breaks off;
- `away`: her guns gone, her hull whole, and she opens the range;
- `escaped`: we open past 400 km;
- `boarded`: she comes alongside with her lock whole (to today's deck fight);
- `lost`: our hull gone;
- `ran`: at the cycle cap (50 cycles from the long opening), the less whole side breaks off; if that is us, it is a lost fight.

There is no standoff.

## The page

Built on the view helpers, at 1000 px and up.

- **Top bar:** time controls (pause and play, the three speeds), zoom, and the play or pause button. Space pauses and resumes.
- **Situation bar** across the top of the radar, for what is happening now: the clock and whether it is running or paused (with the
  reason); her range and whether it is closing; whether she is arming; the threat (torpedoes inbound and the first impact, outlined
  red under two cycles); the captain's order; our hull, her hull and the gun's heat. It updates while the fight runs.
- **The radar:** both ships with their facing, the projected tracks and bands, closest approach, the torpedoes' paths, the PDC's arc,
  the gun's aim and spread, and at the pilot post the order's wedge and the scatter. Only the main labels are always drawn (her, the
  nearest torpedo, closest approach); the rest show on hover. A ghost of our ship at the end of the cycle shows where the nose will
  point, drawn only when it is clear of the ship.
- **Event marks** on the radar where things happened (a cross for a PDC kill, a burst for a hit, a ring for a launch), fading over
  three cycles.
- **Timeline** under the radar, for what has happened: a coloured tick for each launch, PDC kill, hit given, hit taken, miss and
  order change; the last six events in words with their times; the full log and the crew's talk folded underneath. Hovering an event
  rings its spot on the radar.
- **Side panel, the hand's post only:**
  - **Needs you** at the top: only what needs action this cycle, each with one-click fixes, outlined red when anything is there, and
    "Nothing. The crew have it." when not. Per post, as in the prototype: for the gunner, torpedoes reaching a stowed PDC, a PDC with
    nothing in reach, a gun that will not bear, no shot placed, a shot that will lock the gun; for the pilot, coasting against the
    order, torpedoes close and no evade order, a drive that will not light; for the engineer, heat about to lock, the order changing
    the split, the hull hurt; for comms, torpedoes the crew have not been told about, close torpedoes and no evade, a lock or spoof
    leaving the board blind to her next salvo.
  - **The console** under it: the post's choices as large tiles, clearly on or off, and large readouts (gunner: solution, heat,
    spread, damage; pilot: burn, facing, whether the gun bears, closest approach, scatter, course; engineer: the split and heat; comms:
    torpedoes inbound, first impact, board error, what the captain wants).
  - "How this post works" folded at the bottom, the hand's calls and the crew's one-line actions under the console.

## What carries over and what does not

- **Kept as they are:** the contact and its entry scenes (`js/engage.js`), the ambush and the distress call (`js/engagements.js`),
  heave to, the navy's standing cost, the fight ladder's order of authored fights (`js/fightladder.js`), the stakes, and everything
  `shipFightEnd` does after the fight.
- **Retired with the old fight:** range bands for the ship fight, the band-based board picture, aiming guns at a part by menu, and
  holding the turret back for a salvo (replaced by the gun-or-PDC commitment).

## Code and delivery

- **A new pure rules module** for the radar fight (name left to the builder), beside `js/fight.js`: the state, one step, one cycle, the
  projection, the captain's pick, the crew's picks, and the end. Node tests through `tests/nodecontext.js`.
- **A new screen module** for the page above, on the view helpers.
- **A setting** chooses which ship fight a contact starts, old or new, while the new one is built. It defaults to the old fight until
  the new one meets its targets, then to the new one, and is removed when the old fight is retired.
- **The fight tool** (`tools/fights.js`) and the soak targets (`tests/distribution/fights.test.js`) get the new fight beside the old,
  with the targets below. The real-time speed plays no part in the tool: it runs cycles.
- **Retirement:** when the targets pass, the old ship fight (`resolveShipTurn` and what only it uses), its board and its tests are
  removed, `COMBAT.md`'s hired-hand section is rewritten for the new fight, and its "Piloting and real-time combat are the least
  interesting part of the game" line is changed to say what the owner decided: real time with pause as a strategic layer, the
  captain still decides, and the crew still fly by order.
- **Delivered in steps that each leave the game playable:** (1) the rules module and its Node tests; (2) the page, behind the setting;
  (3) the posts, calls and suggestions; (4) tuning against the targets with the tool, and the soak targets; (5) the switch-over and the
  old fight's retirement. Each step is its own PR.

## How we know it worked

Measured with the fight tool over many seeds, as the old fight's are (the soak):

- **Reading her beats a habit:** a policy that answers her shown threat has better ends than any fixed policy against each type, and
  no fixed policy has more than 70% good ends (`crippled`, `broke`, `escaped`) against every type.
- **Every post matters:** at each of the four posts, the hand's choices move the good-end rate by at least 15 points between a
  reasonable policy and a random one. (The threat-and-answer prototype failed this: only the gun mattered.)
- **Random play loses:** a quarter of its fights or more over every type.
- **Pauses do not nag:** in a fight played through at 16x, the median gap between automatic pauses is at least a few cycles, and no
  standing condition pauses it.
- **Fights end:** every fight ends one of the named ways; under a third reach the cycle cap.
- **The upgrades show:** worn stock sensors lose clearly against full ones, and each upgrade wins back its part (the prototype's 12-fight
  table, at scale).

## Calls made in writing this (for the owner to check)

- **The accuracy and resilience outfits** are fight inputs in this work: the rules take them as two flags, and the fight tool measures
  them. Making them outfits the captain buys (data, the buying rule, the hand arguing for them) is a follow-up issue, not part of
  these five steps.
- **Regard moves only where it does today,** at the end of the fight (`shipFightEnd`). Calls and suggestions read the captain's
  opinion of the hand and the crew's (`opinion`) but do not change it, so the fight stays self-contained.
- **An owner who kept a post** gets the new fight once the old one is retired, with the captain's order picked by the same rule at a
  steady nerve, taken as a parameter (no `hired()` fork); suggestions go to that order the same way, at a fixed trust. While the owner
  game is parked this path is kept working by the full-scope tests, not tuned.
- **If a target cannot be met by tuning,** the switch-over (step 5) waits, and the gap is raised with the owner as a design question;
  the new fight does not ship as the default under its targets.

## Left to the builder

- Module and file names, and how the rules module's state is shaped.
- The exact numbers, tuned against the targets.
- How the radar is drawn (canvas, as `js/board.js` is, is the expectation) and the hover behaviour.
- How the long and short openings map from today's contacts, within the relation above.
- The exact list of calls per post, beyond the examples above.

## Not in this work

- Boarding on the deck plan (the second spec).
- A firing solution that improves the longer it is tracked (Cold Waters), one lock at a time for comms, and hardkill and softkill as
  layers (Nebulous): recommended by the research pass, not yet chosen by the owner.
- Hits landing on the cutaway's rooms and degrading a post (FTL): belongs with the boarding spec's shared cutaway.
