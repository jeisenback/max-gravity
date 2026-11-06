# The ship's state shown in the burn view

Status: approved in conversation by the owner on 2026-11-06, for review as written.

## What it is for

The third of the three layers agreed for a lived-in burn view (scenes staged, `2026-11-05-scenes-staged-design.md`; the working routine, `2026-11-05-working-routine-design.md`). The cutaway shows how the ship and its people are doing, without a page opened: a damaged ship has its hands at work on the damage, and the rooms show it; the hurt lie in the medbay with whoever gives first aid beside them; someone having a hard time eats alone. It reads the state the game already keeps and changes none of it.

## What it reads

- **Damage:** `G.state.armor` below `ship().armor`. The game keeps one figure for the hull.
- **The hurt:** `G.state.injured` (crew wounded in a boarding fight, until a port's clinic), and you when `handHurt()`.
- **Low mood:** `moodLow(p)` for a crew member.
- **First aid:** `roleHolder('medic')` (the medic, or the bosun with first aid when there is none).

## Who goes where

- **The hurt** (crew in `st.injured`) lie in a medbay bunk the whole burn, in the `bunk` pose: no meals, no shifts. A staged scene that names them still brings them to it (layer 1). When they are treated at a port they go back to the timetable.
- **The one who gives first aid**, while anyone aboard is hurt, spends the shifts in the medbay at the bunks, in the standing working pose.
- **You, when hurt,** go the rounds by day as now (the camera follows you), walk at two thirds of the pace, and sleep in the medbay at night, not the berths.
- **The repair hands** (the engineer and deckhands, roles `engineer` and `icehand`), in a shift while there is damage, work at the marked rooms instead of their posts: one each, the nearest marked room first, in the standing working pose. Hands beyond the number of marks keep their posts. The engineer keeps the drive at night on watch as before.
- **Someone having a hard time** (`moodLow`) works the shifts as usual; at meals they take their food to the berths and sit alone on a bunk, and at the dusk handover they sit there, awake, until night.

### What wins

From strongest to weakest: the burn's phase; a staged scene; a downtime activity; hurt (in the medbay); the ship's state (repairs, eating alone); the timetable.

## The room marks

- **How many:** damage is `1 - armor / max`. Above 0 and up to a third, one room is marked; above a third and up to two thirds, two; above two thirds, three. Above two thirds is **severe**.
- **Which:** picked from the rooms but the medbay, with ship life's own dice (`shipRand`), and kept on the burn, so they stay put through the burn, differ between burns, and draw none of the game's dice. When the count rises, a new room is added; when it falls (a repair downtime raises the armor), the last added is cleared first; full armor clears them all.
- **What is drawn:** on a marked room's wall, a panel hanging open with bare cable behind it, a scorch, and a few sparks now and then, brighter in the dark. When severe, the marked rooms' ceiling light flickers. The sparks and the flicker follow the drawing's clock, not dice, so a frame is the same each time it is drawn.
- **The medbay,** while anyone aboard is hurt: its monitor shows a faster trace in amber in place of the calm green, and a bunk is taken by the patient (the figure lying there).
- Repairs still come only from the downtime activity and the port: the crew at the marks is the picture, not a mechanic.

## Code

- `shipState(st, t, maxArmor, rnd)` (js/shiplife.js), pure: `{ marks, severe, hurt, low, you, aid }`, where `marks` are the marked room ids (in the order they were added, kept on `t.marks`), `hurt` and `low` crew ids, `you` whether you are hurt, and `aid` the first-aid giver's id. `lifeTick` computes it once a frame and passes it on.
- `routineSpot(p, block, state)` takes the state and gives the new places (the medbay bunk, by the bunks, a marked room, a bunk alone, the medbay at night for you hurt); the order under **What wins** stays in `lifeTick`.
- `posture()`: the hurt in the medbay `bunk`, the first-aid giver and the repair hands `work`, someone low alone `sit`.
- `drawRoom`'s state `s` gains `damage` (`{ marks: Set, severe }`) and `patient` (a boolean); js/rooms.js draws the panel, scorch and sparks, the flicker, and the medbay's amber trace.

## Tests

- **Node:** `shipState` gives 0, 1, 2 and 3 marks at full armor, a little damage, past a third and past two thirds; the marks keep their rooms through the burn and clear the last added first as armor rises; the medbay is never marked; no `Math.random` call. `routineSpot` for the hurt, the first-aid giver, a repair hand, someone low at a meal, and you hurt at night.
- **In the page:** a hurt crew member lies in the medbay through a whole day; the medic stands by them in a shift; with damage, the engineer works in a marked room in a shift and keeps the drive at night; someone low eats alone in the berths; you, hurt, sleep in the medbay and walk slower; a marked room is drawn with its panel and sparks; the medbay's monitor is amber with a patient; a whole burn still draws none of the game's dice.
- **Screenshots** of a damaged ship at work, the medbay with a patient, and someone eating alone, for the owner.
