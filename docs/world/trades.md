# Trades

The posts aboard in the narrow build's chapter. What a post does in the game (perks, wages, the hired hand's share) is in `js/people.js` (`ROLE_NAMES`, `ROLE_PERKS`, `ROLE_WAGE`) and `js/hired.js` (`HIRED_WAGE`, `HIRED_SHARE`) and is not copied here, since those figures are tuned and change. The jargon below is new and original.

### trade.gunner

- Source: `ROLE_PERKS.gunner` in `js/people.js`; the gunner paragraph in `js/signon.js`.
- Post: Gunner. The hired hand's post in the narrow build.
- Work: The guns on the rail, the count of rounds, and the call on when to fire.
- Jargon: "the rail" (a gun mount), "the count" (rounds left), "a clean lane" (the range is clear), "walk it in" (bring fire onto a target by degrees).
- Wage: `ROLE_WAGE.gunner`; the hired hand's own wage and share are `HIRED_WAGE` and `HIRED_SHARE`.
- Use in scenes: A gunner says the count aloud before they say anything else about a fight.
- Status: from code (js/people.js, js/signon.js) for the post; the jargon is confirmed (owner, 2026-10-08)

### trade.pilot

- Source: `ROLE_PERKS.pilot` in `js/people.js`; Ines Ferreira in `js/cast.js`.
- Post: Pilot.
- Work: The burn plot, the flip, the landing.
- Jargon: "a boring one" (a good landing, from Ines's chatter in the code), "the stop" (the abort call), "dead-stick" (a landing without the drive), "the board" (the license board).
- Wage: `ROLE_WAGE.pilot`.
- Use in scenes: A pilot praises a landing by saying nothing happened.
- Status: from code (js/people.js, js/cast.js) for the post and "boring"; the rest of the jargon is confirmed (owner, 2026-10-08)

### trade.engineer

- Source: `ROLE_PERKS.engineer` in `js/people.js`; Tomas Achebe in `js/cast.js`.
- Post: Engineer.
- Work: The drive, the coolant loop, the seals, reaction mass.
- Jargon: "the loop" (the coolant circuit), "run cold" (run below temperature while a part beds in), "properly" (done to a standard that holds for ten years), "she" (any machine).
- Wage: `ROLE_WAGE.engineer`.
- Use in scenes: An engineer tells you which part a noise is, and does not tell you what it means for the schedule.
- Status: from code (js/people.js, js/cast.js) for the post and "she"; the rest of the jargon is confirmed (owner, 2026-10-08)

### trade.first-officer

- Source: `ROLE_PERKS.xo` in `js/people.js`; Cato Rahman in `js/captains/cato.js`.
- Post: First officer. Runs the watch bill and speaks for the captain.
- Work: The watch bill, the handover, the crew's families.
- Jargon: "the bill" (the watch bill), "I have it" (the end of a handover), "the cold watch" (the middle watch, with the lights at a third).
- Wage: `ROLE_WAGE.xo`.
- Use in scenes: A first officer writes a name on the back of the bill so that they remember to ask.
- Status: from code (js/people.js, js/captains/cato.js) for the post and the bill; the rest of the jargon is confirmed (owner, 2026-10-08)

### trade.ice-hand

- Source: `ROLE_PERKS.icehand` in `js/people.js`; the ice hold scene in `js/captains/cato.js`.
- Post: Ice hand. Handles the ice and the cargo. Not offered for hire; a chapter-crew post.
- Work: Lashing the pods, cutting ice, holding a strap.
- Jargon: "the pod" (a lashed block or load), "the strap" (a lashing, counted by number), "a clean cut" (ice cut along the grain).
- Wage: `ROLE_WAGE.icehand`.
- Use in scenes: An ice hand counts straps by number when something goes wrong, and by name when it is over.
- Status: from code (js/people.js, js/captains/cato.js) for the post and the strap; the rest of the jargon is confirmed (owner, 2026-10-08)
