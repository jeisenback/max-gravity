# Scenes staged in the burn view

Status: approved in conversation by the owner on 2026-11-05, for review as written.

## What it is for

The burn view's cutaway should show what is happening aboard. Today the crew wander between their favourite rooms at random while a scene plays in the dialog, so a sitting with Tomas or the captain's talk shows nobody doing anything. When a scene is open during a burn, the people in it gather in the room where it happens and act it out; when it closes, they go back to what they were doing.

This is the first of three layers the owner agreed, in this order:

1. **Scenes staged** (this spec).
2. A working routine: meals at set times, everyone at their post doing their job, the watch handed over.
3. The ship's state shown: damage being worked on, the hurt in the medbay, someone in a bad way alone.

## Who is staged

- The people the scene's dialog shows faces for (`scenePeople(ev)`, js/character.js: the scene's own `people`, else the names in its title and text), as far as they are aboard: crew, passengers and the captain.
- You, whenever anyone else is staged.
- If the scene names nobody who is aboard, nobody moves.

**The captain** is not drawn in the cutaway today. In the hired game the captain is added as a figure, role `captain`, spending most of the burn on the bridge (haunts: bridge 6, galley 2, berths 1; berths at night), with a colour of their own. In the owner game you are the captain, and nothing is added.

## Where

The first of:

1. the room the scene sets itself (`ev.room`, one of the cutaway's room ids);
2. the first room its title and text name, by these words:

   | Room | Words |
   |---|---|
   | Galley | galley, mess, the table |
   | Bridge | bridge, cockpit |
   | Engine | engine room, the drive |
   | Hold | hold, cargo bay |
   | Medbay | medbay, clinic bunk |
   | Berths | berth, bunk |
   | Gunnery | gunnery, the guns |

   matched as whole words, case-insensitive, the earliest in the text winning;
   (a word can mislead, as "a berth on the Ore Runner" naming a job and not the berths; a scene that misleads this way sets `ev.room`);
3. the captain in the scene: the bridge;
4. a passenger in the scene: the berths;
5. otherwise the galley.

## When

- Only during a burn, and only in the phase when people move about. At the couches, the straps and the flip nobody moves (as now). The burn's clock is paused while a scene is open, so the phase cannot change mid-scene.
- Not in port.
- Not in a fight: a boarding fight has its own deck board, and staging it would contradict the board.

## How the figures act it out

- **Getting there:** those staged walk there as they move now (by the ladder between decks), at one and a half times their wandering pace.
- **Where they stand:** close together near the room's middle, facing each other: two face to face; three as a small group. In the galley they sit at the table and in the berths on a bunk's edge. On the bridge, at the guns and in the medbay, the captain sits at the station and the rest stand.
- **Camera:** it follows you, as now; you are staged, so it goes there.
- **Everyone else** keeps their routine; anyone passing through the room passes through.
- **While it is open** those staged stay where they are.
- **When it closes** they wait a few seconds and go back to their routine. A scene that leads straight into another restages for the next one.
- **Someone asleep** who is in the scene gets up and comes; the rest sleep on.

## Code

- `sceneStage(ev, aboard)` (js/shiplife.js): a pure function. `ev` is the open scene; `aboard` is the people in the cutaway (`{ id, role }`, the captain's role `captain`). It returns `{ room, ids }` (the ids include `you`) or `null`. It reads no global state, so it runs in Node (`tests/nodecontext.js`).
- `scenePeople(ev)` gives who; `sceneStage` takes their ids so that it stays pure.
- `lifeTick` (js/shiplife.js) applies the stage: each frame while `G.dialog` is open in a burn, it sends those staged to their spots and holds them there; when the scene changes or closes, it releases them.
- The captain figure: `shipPeople` adds the hired captain; `HAUNTS.captain` and `ROLE_COLORS.captain` are added.

## Tests

- **Node, on `sceneStage`:** a room the scene sets; a room the text names (the first one mentioned); the captain to the bridge; a passenger to the berths; the galley otherwise; nobody aboard gives `null`; a fight gives `null`.
- **In the page:** during a burn, a scene that names a crew member brings them and you to the room, facing each other, seated in the galley; closing the scene releases them; the captain is drawn in a hired burn.
- **Screenshots** of a few scenes staged, for the owner.
