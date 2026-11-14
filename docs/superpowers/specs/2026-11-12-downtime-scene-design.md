# Downtime as a scene, and comms over the ship

Approved in conversation on 2026-11-12, in a brainstorm about the burn view. The new activities this makes room for are filed as #1073 to #1082 and are not part of this spec.

## What it is for

On a burn, the comms ticker and the "Spend some downtime" button take the bottom of the window. That is about 230px of an 800px window, and the cutaway loses Gunnery and the Workshop below the fold. Downtime is a menu with no connection to the ship the player is watching, and a menu fits badly with a burn that runs at 4x or 16x.

After this change:
- the burn runs on uninterrupted until downtime comes to the player as a scene, once a slot, at a natural moment;
- the cutaway shows where each thing on offer is happening;
- comms lines fade over the ship instead of keeping a box.

Out of scope:
- the new activities (#1073 to #1082);
- a drawn galley screen (#1035);
- any change to what an activity gives, apart from the two that are cut.

## 1. The downtime scene

**What stays.**
- **The slots:** two to five a burn (`lifeSlotCount`, `lifeSlotOf`, `lifeFree`, `spendLife`, `js/shiplife.js`).
- **The rotation:** each slot's five activities are picked by today's rotation (`downtimeFive`, `menuFive`), so the balance of XP and liking is unchanged.
- **The owner role's rules** (`role().mayDowntime`, `js/role.js`).
- **The Comms page's Chat button** (`js/comms.js`). It spends the same slot as today.

**When it opens.** The scene opens once a slot, at the first change of the ship's day after the slot opens. A change of the ship's day is the start of breakfast, a shift, the meal or supper (`SHIP_TIMETABLE`). These conditions must all hold:
- the slot is free (`lifeFree`) and hasn't been offered yet;
- the lights are up (not `isDark()`), so it never opens in the handover, the night or the wake;
- the crew are not strapped in (`phase()` is `'move'`);
- no other scene is open (no `t.event`, no `G.dialog`).

Those changes come every 10 to 20 burn seconds, so the shortest slot still gets its scene. The burn pauses while the scene is up, as for any scene, so it plays the same at every speed.

**Once the crew are settled** (the owner, 2026-11-14, #1168). At a moment above the scene does not open at once: it waits until everyone it tags is where they are going (arrived and off the ladder) for 2 burn seconds (`downtimeSettled`, `DOWNTIME_CALM`), so what it says someone is doing is what the cutaway shows. It opens anyway, settled or not, when 3 burn seconds or less are left in which it could open: the last light before the slot ends or the crew strap in, a night inside the slot waited out (`downtimeLeft`, `DOWNTIME_LAST`). The wait is kept on the burn (`t.lifeWait`). On an 8-day burn at 1x the first scene comes about 93 burn seconds in, at the second day's shift, where it came at 20 as the crew left the couches.

**The rule.** `downtimeDue(t, block, prevBlock)` is a pure function in `js/shiplife.js`. It is true when:
- `block` differs from `prevBlock`;
- `block` is one of `breakfast`, `shift`, `meal` or `supper`;
- the slot the burn is in is free;
- that slot is not in `t.lifeOffered`.

The caller, the frame's life tick, checks the lights, the couches and any open scene, and keeps the previous block on the burn (`t.lifeBlock`). On opening, the slot's key is added to `t.lifeOffered`. Both are fields on the burn record, not on `G`.

**What it says.**
- **The text** is one line for each of the slot's five, in the order picked. Each activity gains a "what's on" line, read through `on()` beside its `label`. For example:
  - "Tomas has the cards out."
  - "Ines is putting the vid on."
  - "The range is clear if you want to practise."
  - "The captain is on the bridge."
- **The lines** are in `scene:downtime` and `lines:life` (and in the social and show lines for what's on now), written to `docs/bible/voice.md`: flat, specific, and never explaining.
- **The title** is the time of day ("After supper", "On shift") from the block it opened in.
- **The choices** are the five activities' labels as today, then Pass.

**Choosing.**
- A choice runs the activity's `run`, with the same words and effects as the menu today. It also:
  - spends the slot (`spendLife`);
  - sets `hired().did.downtime`;
  - writes the same one-line `[Ship]` log to comms;
  - sends the hand to the activity's place (`toActivity`).
- Pass spends nothing. The scene doesn't come back this slot, because its key is in `t.lifeOffered`.

`downtimeScene()` builds the scene and replaces `downtimeEvent`. `downtimeEvent(all)` stays only as long as a test needs every option listed; otherwise it goes.

## 2. Where each thing is: the tags

While the scene is open, each choice's place is tagged in the cutaway, in a stand-in amber:
- **A place activity:** a tag on the room, in its top corner opposite the room's name, naming the activity.
- **A person activity:** a tag over the person who offers it, following them.

| Activity | Tag on | Notes |
|---|---|---|
| Share a meal | the galley | |
| Swap stories | the galley | |
| Cards | the galley | |
| Watch a show, a broadcast or a match | the galley | |
| Read a book | the berths | |
| Practise your post | the hand's post room | |
| Work the figures | the hand's post room | |
| Repair the hull | the engine room | |
| Drills | the bridge | |
| Ask the captain's advice | the captain | |
| Shadow a mate | that mate | |
| Teach a mate | that mate | |
| A taught move | its teacher | |
| A cast member's own scene | that cast member | |
| Sit with someone | that person | one person a slot; see below |
| Visit the passengers | a passenger | |

**Sit with someone** is offered for one named person, not as the picker (`sitPicker`, `js/family.js`):
- **The label:** "Sit with Ines", with a "what's on" line such as "Ines is at the table on her own."
- **Who:** of those the picker would list (`procedural()` and the passengers aboard), someone having a hard time (`moodLow`) or hurt comes first. Otherwise the choice turns through them by the game's day.
- **Choosing it** opens `sitBeat(person, crew)` at once, with the same sitting as today, and spends the slot.
- **The tag** goes on that person.
- `sitPicker` stays only if something else still opens it.

`onDeck(five, people)` is a pure function in `js/shiplife.js`. It returns `[{ label, room }]` or `[{ label, id }]` from each activity's `where` (a room id, or a function of the people aboard returning a person's id). An activity with no `where` gets no tag. The cutaway draws the tags while the downtime scene is the open event, and only then.

## 3. The burn view's layout

**Removed.**
- The Downtime label and the "Spend some downtime" button: `#tlife`, `syncLifeButtons` and `buildLifeButtons` in `js/shiplife.js`, and `G.lifeY` with its layout row in `js/transit.js`.
- The comms ticker box and its "COMMS · tap to open" header.

**Comms over the ship.**
- The newest comms lines, at most three, are drawn over the bottom left of the cutaway, with a dark shadow so they read over any room.
- Each line shows for about six real seconds and then fades. Older lines are dimmer.
- The times are in real seconds (`dt` before the burn's rate), so a line reads the same at 16x.
- Nothing is drawn, and no space is kept, when there is nothing new.
- The Comms tab keeps the full history, as now.

**The tutorial's prompt** goes in the same place. It stays up until its step is done instead of fading. Its text for the downtime step drops the button: "Work your post: open the Gunnery page and give an order, or take up something in downtime when it comes round, once before the flip and once after." Its condition (`didOnBurn('downtime')`) is unchanged.

**The cutaway** takes the freed space, down to the row with the Menu and System map buttons. At 1280x800 all four decks show.

## 4. What is cut

- Mend a mate's kit (`mend`) and Spare hands for the captain (`spare`) leave `HAND_DOWNTIME` (`js/hiredevents.js`), and their lines leave `scene:downtime`.
- That takes away the 300 to 600 cr and the 400 cr they paid, so the pay soak (`npm run soak`) is run, and its targets are read against the change.

## Testing

**Node:**
- `downtimeDue`:
  - true only at a change to breakfast, a shift, the meal or supper, with the slot free and not yet offered;
  - false for a slot spent or offered;
  - over the shortest slot, at least one change is due.
- `onDeck`: room activities give rooms; person activities give the person's id; an activity with no `where` gives nothing.
- The person for Sit with someone: one having a hard time or hurt comes first; otherwise it turns by the day.

**Browser, Sit with someone:** the person offered is the one tagged and the one the sitting is with.

**Browser:**
- On a burn, the scene opens once a slot, at 1x and at 16x, never at night or on the couches, and not over another scene.
- Choosing runs the activity, spends the slot, writes the log line and sends the hand there.
- Pass spends nothing, and the scene doesn't come back that slot.
- The tags are drawn while the scene is open, on the room or the person, and not after.
- A comms line is drawn over the cutaway and is gone after its time.
- The tutorial's prompt stays until its step is done.
- The "Spend some downtime" button no longer exists.

**Pins, the editor and coverage:**
- The scene pin (`tests/fixtures/scene-lines-pin.json`) changes only where downtime's lines do. `tests/sceneplay.js` plays the downtime scene in place of the menu.
- `tests/editorhired.test.js` counts move with the registry.
- `npm run coverage -- --check` holds for `js/shiplife.js`.

## Done when

On a burn, the player never opens downtime. Once a slot, at a natural moment, a scene says what's going on in the ship, and the cutaway shows where. The player picks one or passes, and the burn runs on. The comms lines fade over the ship, and the cutaway shows all four decks at 1280x800.
