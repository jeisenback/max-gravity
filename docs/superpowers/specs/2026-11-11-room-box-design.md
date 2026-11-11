# Every room as a box in perspective (#1024)

Status: draft, with the owner; three choices open (full-width rooms as two bays, where people stand, look.md rule 3's wording). Part of #931. From `docs/bible/look.md` rules 2 to 6, approved by the owner on 2026-11-11, and its reference frame `look-target.png`. Spec first: the owner approves it before any code. A throwaway mockup of the mess deck in the box (the galley and the head and shower, the crew at breakfast, 1280x800) went with it.

## Why

The rooms are drawn flat: a back wall the size of the room, the props pressed against it, the deck plate under them (`roomWalls` and the `ROOM_DRAW` rooms in `js/rooms.js`). The look asks for depth built into the rooms, not laid over them: a box for each room, and solid furniture. The hull is a cylinder (#988), and the box is how the cutaway shows it.

## 1. The room box (rule 2)

**The box.** The front of the box is the cut: the room's box `r = { x0, x1, top, floor }` as it is today. The back wall is the same box scaled toward a vanishing point by `k`. Between them are a strip of floor, a sliver of ceiling and two side walls, each angled in to the point.

- **The vanishing point** is at the centre of the bay (below), at eye height: 80 over the floor, the eye of a standing person (85).
- **The depth** is `ROOM_DEPTH = 16`: the floor strip is 16 units deep from the cut to the foot of the back wall. So `k = 1 - 16 / 80 = 0.8`. These numbers follow:
  - the ceiling sliver is `(100 - 80) * 0.2 = 4` units;
  - the back wall is 80 tall, from 96 to 16 over the floor;
  - each side wall is a fifth of the half-bay at the back, about 35 units in a 345-wide bay.

  At 1280x800 (zoom about 1.17) the strip is about 19 px. In the mockup this reads like the target; the target's own strip is deeper, but it was laid over the rooms and is not consistent with one vanishing point.
- **The shell** (`roomShell`, in place of `roomWalls`'s body):
  - The back wall is shaded as the far side of the cylinder (#988): lightest in the middle and darker toward the sides. Its seams are at equal turns of the hull (`x = vx + half * sin(a)`), so they close up toward the sides.
  - The side walls are the curve turning toward you, darkest at the front, with their seams running to the point.
  - The floor strip's plates have joints that run to the point, and two cross joints.
  - The ceiling sliver is plain.
  - The box's edges are a faint line.
  - The overhead cable run of today moves to the top of the back wall, unchanged in what it is.
  - The box stays rectangular. The curve is in the shading and the seams, not in a bent floor line.
- **The cut** is the deck plate under the room (`HULL.plate`): the nearest thing and the darkest. It is a near-black fill hatched as a section, its top edge the frame's blue line.

**Bays, and the well.** A room on a split deck (galley and head, gunnery and workshop, airlock and medbay, engine and hold) is one bay with its own vanishing point. A full-width room (bridge, berths, life support) is drawn as two bays, one either side of the well. Each bay has its own point, and both bays share the room's one name, its lamps and its tap box.

The ladder well is a shaft on every deck, as `look-target.png` shows it: flat (29 units is too narrow for a box), a darker back wall, a bulkhead each side with a hatch at the floor (`cutBulkhead`), and the ladder. People cross a full-width deck through the hatches, as they do on a split deck today.

`roomBays(r, well)` returns the bays, and `roomEye(bay)` returns `{ vx, vy, k }`. Both are pure functions of the box, tested in Node.

*The owner's choice:* bays (recommended: as the target draws the berths; the side walls are half as deep; no vanishing point sits on the ladder). The alternative is one box per room, its point on the well, with side walls about 70 deep on a full-width deck.

## 2. Where people stand

People stand on the front edge of the floor strip: their feet on the cut line, at the room's floor as today. Everything that stands on the floor stands there too, and the strip shows behind and between them. This is what the target does.

What follows from it:
- Feet, seats (the bench, the stools, the pilot's seats), bunks and sleepers (`berthBunk`, `berthSleeper`), the cot (`MED_COT`), the crash couches and the jump seats keep their world positions.
- `G.cutHits` (body, head and foot), `G.cutRooms` (the layout box, so a tap on the shaft of a full-width deck still opens that room) and `G.cutRack` (the rack sits on its console, at the front) do not move. Clicks on people and rooms work as now.
- The figure's own deck shadow (`drawPerson`, `js/figures.js`) moves up onto the strip, a half-ellipse behind the feet instead of across the plate. That is one line.

*The owner's choice:* the front edge (recommended: nothing measured moves). The alternative is a stand line 4 units in, with the feet visibly on the floor; then every person, seat, couch and hit moves 4 up and those tests are re-taken.

## 3. Solid furniture (rule 3)

**Two places, no depths between.** A thing is either on the back wall or standing on the floor at the front. Nothing is set back part way, and nothing is drawn smaller for distance: one scale for every prop (#960). Each standing thing has its own depth, its real one as a share of the strip:

| Thing | Depth (share of the strip) |
|---|---|
| Counter, stove, cabinet, locker | 0.45 |
| Their tops | 0.5 |
| Mess table | 0.4 |
| Bench | 0.25 |
| Bunk column | 0.6 |
| Cot | 0.5 |
| Crate | 0.5 |
| Shower, cubicle | 0.6 |
| Console | 0.45 |

**The helper.** `roomPart` (and so `roomBench`, `roomBunk` and every room built on it) takes `o.solid = d`. Behind the part's front it draws, from its bounds (cached as `roomBounds` is today):
- its top, if the top is under the eye, a step lighter;
- the side toward the vanishing point, a step darker. A part that straddles the point shows no side.
- a contact shadow, if its foot is on the floor: its footprint widened 5 units each side, dark on the strip.

The eye comes from the bay being drawn: `drawRoom` sets it for the room's call and clears it after (`roomMessTable` sets its own). Only the outer body of a prop is solid. Its doors, latches and stencils stay flat on its front, so no prop draws its depth twice.

*The side shown.* One-point perspective shows the side facing the vanishing point: a locker right of centre shows its left side, as the target's locker does. The bible says "the side away from the centre". The spec draws the side toward the centre, and asks the owner to confirm and correct that word in `look.md`.

**Things on the wall.** These are cupboards, the porthole, screens, shelves, the pinboard, the knife strip, the hood, rails, the certificate, the mirror and the towels. They get no depth faces (their thickness is the bevel `roomPart` gives today) and are one step darker (`WALL_TONE = 0.85`, applied by the helper). They are drawn through `roomOnWall(ctx, ax, ay, fn)`:
- the group is moved, rigidly and at full size, so its anchor lands on the back wall (the anchor scaled toward the point by `k`);
- what hangs over a counter stays over the counter's back edge;
- nothing on the wall falls into a side wall.

`roomAtDepth(ctx, ax, ay, d, fn)` places a small thing on a top in the same way: the plant on the worktop, the kettle on the hob, the bottles on the cabinet.

**Small things on tops** (mugs, plates, the kettle, bottles) stay flat with their bevels.

**Order.** Wall things are drawn first. Then the things standing on the floor, from each side wall in toward the point, so a thing nearer the centre covers its neighbour's side face. Within a room that is a rule for how the room's code is ordered. It is not a second pass.

## 4. Rules 4 to 6

- **Turned things (rule 4).** A desk at an angle, a leaning folding chair or a screen turned on its arm is drawn as its own two faces (two paths, one lit and one in shade), not as a solid. People on chairs are side-on as now (#978, #985).
- **Mounting (rule 5).** A screen flush to a bulkhead is a wall thing with its bezel. An arm runs from a plate on the back wall (`roomOnWall`) forward through the depth to the thing it holds at the front, with its joints. The medbay's scanner arm becomes one of these. A shelf has brackets, a curtain has a rail, laundry has pegs; that is #933's content.
- **Real objects (rule 6).** This is #933's and #934's content. The box changes how an object stands, not what it is.

## 5. Which pass draws what

- **#1024 (this):**
  - the shell (the box, the curve's shading, the floor strip, the cut, the cable run moved);
  - the bays and the shaft on every deck;
  - the figure's shadow onto the strip;
  - the helper (`solid`, contact shadows, `roomOnWall`, `roomAtDepth`, the wall tone);
  - the five drawn rooms converted to it.
- **#932 (lighting):** everything that is light, as overlays that never repaint a surface:
  - the lamp fittings on the ceiling sliver;
  - the warm pools on the floor strip, the back wall and the people;
  - the cold hull and the dark corners (rule 10);
  - the screens' cool light;
  - night, and the burn's red;
  - soft shadows tuned to the lamps (the contact shadows' strength and the figure's shadow).

  It replaces `drawPhaseLight`.
- **#933 (contents):**
  - the rooms not yet drawn (gunnery, engine, head, workshop, airlock, life support), drawn in the box from the start;
  - point 6 for the galley, the bridge and the berths;
  - rule 1's overhead runs (pipes, trays, ducts), drawn once as part of the shell for every room;
  - the stowage on every wall, and rules 4, 5, 7 and 9.
- **#934:** the occupants' things, in the places the bunks keep (`berthKeep`).

**The five rooms drawn so far.** Their props' shapes, colours, x positions, seats and sleepers carry over unchanged. What changes in each:
- **Galley.** The counter, the stove and their tops are solid; the bench and the table's top are solid. The wall groups go through `roomOnWall`, and the plant and the kettle through `roomAtDepth`. The burners are redrawn as rings on the hob's top: the one real redraw.
- **Bridge.** The consoles and the seats' pads are solid. The window, the overhead panel and the certificate are on the wall. The grab bars beside the ladder's opening move onto the shaft's bulkheads.
- **Berths.** The bunk columns are solid, with their back posts and the mattresses' tops, and the curtain rail at the front. The crew's corner (wall unit, pinboard, towel, guitar) is on the wall beside the shaft.
- **Medbay.** The cot and the cabinet are solid. The IV pole stands with a contact shadow and no faces. The first-aid box, the monitor and the grab rail are on the wall. The scanner arm is remounted per rule 5.
- **Hold.** The crates and the pallets are solid, the stacks drawn from the walls in. The net and the straps stay at the front, and the jack stands on the floor.

## 6. Build order

One PR each, with screenshots before and after at 1280x800, set next to `look-target.png`, and `npm test` passing.

1. **The box.**
   - Touches: `roomBays` and `roomEye` (Node-tested), `roomShell` in place of `roomWalls`'s body, and the shaft on every deck with its cache in `drawCutaway` (`js/shiplife.js`). The figure's shadow (`js/figures.js`) moves onto the strip.
   - Tests:
     - New Node tests for the geometry: the back wall, the sliver and the strip from `k`; a bay's point; full-width rooms giving two bays.
     - `livingship`'s wall test still finds no outlines on the walls.
2. **The helper and the galley.**
   - Touches: `solid`, the contact shadow, `roomOnWall`, `roomAtDepth` and the wall tone in `roomPart`; the galley, the bench and the table converted.
   - Tests:
     - New: a solid part draws its top only under the eye, its side toward the point and none when straddling it, and a shadow only on the floor.
     - The galley's colour checks are re-taken at the wall tone (`figShade(col, WALL_TONE)` for the wall things).
     - The galley's name-and-sign check runs unchanged. A prop it catches under the name is moved, not the check.
3. **The bridge and the berths.**
4. **The medbay and the hold.**

The burn view's measured positions (seats on the deck's floor, sleepers in their bunks, hits, the outline, names on clear wall) do not move, by section 2. Where a check reads a prop's drawn place, it is re-derived from the box (`roomEye`), never widened. No pin changes: the pins record scenes, not drawing.

## 7. Constraints

- **Nothing under 12 px.** The box adds no text. The 4-unit sliver is about 5 px at 1280 and 3 px at 1000: a line, not a label.
- **Reduced motion.** The box is still: it has no clock. What moves today (the cable's sag, `hangEnd`) moves as now under `Settings.reduceMotion`.
- **Desktop only (#937).** Judged at 1280x800 against `look-target.png`. Windows at least 1000 wide draw the same box at a smaller zoom.
- **Performance.** The burn view redraws every frame. Each bay's shell (gradients, seams, floor joints, side walls, the cut) is drawn once into an offscreen canvas per bay and zoom, at the device's pixel ratio, and drawn as one image after that. It is redrawn when the zoom or the layout changes. The cache lives in `js/shiplife.js`; `js/rooms.js` stays pure drawing, and its Node tests draw the shell directly. The cable, the lamps and the props draw live. A solid part costs three more fills from cached bounds. The frame time of `drawTransit` at 1280x800 is measured before and after the first two PRs and reported in them.

## Not in scope

The lighting (#932), the rooms' new contents (#933), the occupants' things (#934), the bridge window's view (#936), and a curved floor line.
