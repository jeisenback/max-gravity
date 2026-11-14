# The burn

Status: draft for the owner's review, 2026-11-14. The owner chose the direction (offers on the ship, a free camera, urgent events stop the burn, no cost for an offer let go); the rest is proposed. It changes how the burn plays, not how it looks (`look.md`).

## What it is for

A burn is where the hand lives in chapter 1: days in a cramped ship with the same six people. The owner wants it long, optional and fast to get through: a player can stay and live in it, or run it at speed between ports. Today those pull against each other:

- **The burn decides when you act.** Every scene, the downtime offer and the random events included, opens as a dialog and stops the burn until it is answered. At 16x the stops come close together; at 1x the wait between them is long.
- **Speed costs nothing and gives nothing.** Running fast is only waiting less. There is no choice in it.
- **You see only the hand.** The camera follows the hand's deck, and swings to a scene's people while one is open. What the rest of the ship is doing is out of view, and the player cannot look.

After this change the burn is a place the player browses. What is going on aboard shows on the ship, the player takes what they want when they want it, and only what cannot wait stops the burn.

## Offers on the ship

An **offer** is something the hand could do or join: a shipmate who wants a word, a downtime activity, the captain with a few minutes, a chore, a card game. It is not opened as a dialog. It shows in the cutaway, where it is happening, as the downtime scene's tags do now (amber, a short label, on the room or over the person, `drawDowntimeTags`).

- **Taking one.** A click on the tag opens its scene, and the burn pauses while it is open, as now. The hand goes there (`toActivity`), and the people in it are staged as now (`stageScene`).
- **Letting one go.** An offer not taken lapses. It costs nothing: no regard lost, no thread closed for good. A shipmate's scene that lapses comes round again on a later burn, as a missed draw does now (`BEAT_RAMP`).
- **How long one lasts.** An offer stays up for a ship's day of burn time (`SHIP_DAY`, 80 burn seconds), and never less than 20 real seconds, so it can be read and reached at 16x. Running fast lets more go by; that is the choice speed now makes.
- **How many.** At most four offers at once, so the ship does not fill with tags. A new one waits for a place.
- **Only where it is true.** An offer about someone shows only while they are where its words put them (`downtimeThere`, #1175), and over them, so it moves with them.
- **The downtime slot stays.** A burn still has two to five slots (`lifeSlotCount`). Each slot's activities are offers; taking one spends the slot, and the rest of that slot's activities lapse. The downtime scene, the list of the five, goes: each of the five is its own tag.
- **What counts as an offer.** The people and the life of the ship: the main characters' scenes (their introductions, middles and lates, not their fate scenes), the captain's own scenes, the crew's events, the money events, the passengers, the ship's traditions and colour, the quiet scenes, and downtime. The comms page's news stays where it is.

## What stops the burn

Urgent events still stop the burn and open at once, as every scene does today. An event is urgent when the ship or someone aboard is in danger now, or when the hand's post is needed now:

- a contact: pirates matching course, a patrol, a distress call, the ship fight and the deck fight that follow (`js/engage.js`, `js/fight.js`);
- damage and breakdowns: a coolant leak, a part failing, the ship's own trouble;
- a problem at the hand's post (the work events: a jammed feed, drift on the helm);
- a fate scene: a main character's pivot, the hand's or the captain's loss;
- the strike's broadcast and the arcs' turns, which come once and set the chapter's course.

The camera goes to an urgent event's place when it opens.

## Running ahead

For a player who wants the burn over: a fourth speed, **Run ahead**, runs the burn as fast as the machine allows to the next urgent event or to arrival, whichever comes first. Offers lapse as it passes. The flip still plays in its slow motion, since it is short (#992). This also serves the owner's testing: a trip is over in seconds unless something urgent happens.

## The camera

- **It starts free.** At the start of a burn the camera shows the tower where it last was, and does not follow anyone.
- **The player moves it.** Drag the cutaway, or the mouse wheel, to pan up and down the tower; on the keyboard, the up and down arrows. Desktop only (#937).
- **Follow someone.** A click on a person follows them until the player pans away. A click on the hand, or the H key, follows the hand.
- **A scene takes it.** When a scene opens, taken from an offer or urgent, the camera goes to its place, as it does now, and returns to where it was when the scene closes.
- **Offers off screen.** An offer on a deck out of view shows as a small marker at the edge of the cutaway, on the side it is on. A click on the marker pans to it.

## In the later chapters

From chapter 2 the player is the co-op, and from chapter 4 the burn passes in a coarser step (`later-chapters.md`, How the later chapters play). Offers are the bridge to that:

- In chapter 2 the burn plays as in chapter 1, aboard the Ore Runner; the offers are the co-op's people and the members' business.
- With more than one hull, each hull's burn makes offers of its own. The player follows one hull live, or none, and the offers from the rest are gathered at the end of the step as the voyage's report: what happened, what was let go, what needs a decision now.
- The drop into a day, when a scene asks for it, is a drop into a live burn on that hull, with the camera free.

None of the later part is built with this; it is the reason offers are kept as data (who, where, how long, what scene) and not as dialogs.

## What the game changes to fit

In order, each its own piece of work:

1. **The camera.** Free at the start of a burn; drag, wheel and arrows to pan; a click to follow a person, the hand or H to follow the hand; a scene takes the camera and gives it back. `js/shiplife.js` (`camTarget`, `camStep`), `js/burnpanel.js`.
2. **Offers.** An offer queue on the burn (who, where, the scene, when it lapses), tags drawn from it (`drawDowntimeTags` grown to draw any offer), a click on a tag opening its scene, markers for offers off screen, and the cap of four.
3. **The burn's scenes split.** Each kind of scene in the burn's draw (`BURN_WEIGHTS`, `HIRED_GROUPS`, `js/happenings.js`) marked urgent or offer, as above; offers go to the queue, urgent ones open as now.
4. **Downtime as offers.** The downtime scene replaced by each of its activities as an offer, the slot spent by the one taken.
5. **Run ahead.** The fourth speed, to the next urgent event or arrival.
6. **The soak.** The chapter's length, pay and experience held to their bands when offers lapse (`npm run soak`): a player at speed takes fewer scenes, and the soak's player takes offers as a player at 1x would.

## Assumptions to confirm

- Urgent: contacts, damage and breakdowns, problems at the hand's post, fate scenes, the strike and the arcs' turns. Everything else is an offer.
- An offer lasts a ship's day of burn time and at least 20 real seconds; at most four at once; letting one go costs nothing, and a shipmate's scene comes round again.
- The downtime scene's list goes; its activities become offers, one taken a slot.
- Run ahead is a fourth speed that stops only for urgent events and arrival.
- The camera starts free; drag, wheel and arrows pan; a click follows someone; H or a click on the hand follows the hand; a scene takes the camera and gives it back; offers out of view show as edge markers.
- The later chapters gather each hull's offers into the voyage report; nothing of that is built now.
