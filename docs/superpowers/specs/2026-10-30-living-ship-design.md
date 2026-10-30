# The living ship: a camera on a lived-in cutaway

Status: approved in conversation by the owner (2026-10-30), for the owner's review as written. It is sub-project 1 of the burn view
redesign; sub-project 2, the whole screen's layout (route plate, comms, HUD), comes after it and is not in this spec.

## Why

The burn view's cutaway (`drawCutaway` in `js/shiplife.js`) shows all seven rooms at once in a small strip: people are 9 to 15 px
stick figures, the rooms are empty boxes, and the phases of a burn look alike apart from where people stand. At the flip the hull
squeezes edge-on and the interior is hidden at the one moment something happens. The owner asked for more detail, character and polish,
and for the flip to be a moment.

## The owner's choices (2026-10-30)

- **Ship first, layout second**: this spec is the living ship; the screen layout is its own spec later.
- **Style A** for people (jointed line figures, face pictures as heads), as a placeholder: the people **will be sprites eventually**
  (approach 3). So the work builds the layer sprites plug into (postures) and keeps the code-drawn figures simple.
- **Phases read differently.** A hard burn, the cruise and the flip each have their own light, posture and props.
- **Professionals at the flip**: the crew strap in; they do not tumble. Only loose things float, and one crewmate on a tether.
- **The g reading is live**, not three fixed values.
- **Lived-in rooms**, with **low decks** (space is at a premium: a hand's width over a standing head).
- **A camera, close in** (option A): about two rooms across, both decks, rather than the whole ship small.
- **The camera is automatic**: it follows the hand and goes where a scene is. No panning by hand.
- **The ship outline** in a corner of the view shows where the camera looks; a tap on a room in it opens that room's sheet.
- **Build approach 1** (extend `js/shiplife.js`, new small files), with the people's drawing behind one seam for the sprites.
- **The interior stays upright at the flip** (option A): the turn is shown outside it.

Mockups (private artifacts): crew styles https://claude.ai/artifact/UhEUmBkhN4BMQmbKuzaQAu, phases and props
https://claude.ai/artifact/YAyj779PTaRnKe7GWrH6TU, the camera on the whole ship https://claude.ai/artifact/Nz2ckxjDEpJCKspa235LiF. The
third is the reference for this spec; its names (Ines, Tomas, Oduya) and furniture placement are placeholders.

## 1. Structure

| File | Holds |
|---|---|
| `js/shiplife.js` (existing) | The ship's people and `lifeTick`, as now. New: `posture(p, ph, room)`, pure, returns `{ name, x, deck, face, frame }`. |
| `js/figures.js` (new) | The sprite seam. `POSTURES`: each posture name with its frame count. `drawPerson(ctx, posture, x, y, scale, look)` draws the placeholder figure (`look` is colours and the face picture). |
| `js/camera.js` (new, pure) | `camTarget(people)`, `camStep(cam, target, dt)`, the span of the hull in view, and the outline: drawing it and a tap to a room id. |
| `js/rooms.js` (new) | One function per room drawing its props in room-relative units, the helper for things that hang and float, and the phase lighting. |
| `js/transit.js` (existing) | `drawTransit` hands the cutaway the screen box it has now; the zoom fits about two rooms across it (one on a phone). New: `gReading(progress)`, pure. |
| `js/game.js` (existing) | Declares the camera's state on `G`, with a comment. |

The postures are: `couch`, `stand`, `walk`, `climb` (the ladder), `sit` (a stool or console), `bunk` (lying), `strap` (strapped in at
a station), `tether` (floating on a line); and the cat's `cat-walk`, `cat-sit`, `cat-sleep`, `cat-float`. This list is what the
sprite sheets will be drawn to; swapping in sprites replaces only `drawPerson`.

New logic takes the state it reads as parameters and returns a value, so `posture`, the camera and `gReading` run through
`tests/nodecontext.js`. The new scripts are linked in `index.html`, with unique top-level names (`tests/globals.test.js`).

## 2. Behaviour

**Phases.** By the run's progress `pr`, as `phase()` does now, plus one step:

| Phase | When | What people do | Light |
|---|---|---|---|
| Hard burn | `pr < 0.06` or `pr > 0.94` | To their crash couch (berths and bridge, `couchX` as now): `couch` | Red |
| Cruise | otherwise | Haunts and movement as now; `walk`, `stand`, `sit`, `climb` or `bunk` by where they stop | Warm |
| Secure (new) | `0.44 <= pr < 0.47` and `0.53 < pr <= 0.56` | Strap in at a station in the room they are in, not back to the couches: `strap` | Amber beacon |
| Flip | `abs(pr - 0.5) <= 0.03` | Stay strapped; the engineer, if aboard, floats on a tether near the reactor: `tether` | Pulsing amber |

At the flip loose things float: hair, the cat (`cat-float`), a pen, droplets, and every hanging item. The light is layered over the
day and night dimming that exists now. The second secure step is the crew unstrapping after the turn; they start moving again in
cruise.

**The g reading.** `gReading(pr)`: about 2.8 g in the hard burn, about 0.4 g in cruise, 0.00 at the flip, with smooth ramps across each
change and no jumps. A sign over the galley's forward hatch shows it (`THRUST 2.80 G`, `CRUISE 0.40 G`, `FLIP SECURE` alternating
with `FLIP 0.00 G`).

**The camera.** It follows the hand, easing as the hand moves, and never leaves the hull. There is no manual control. Scenes carry no
room today; the downtime activities (meal, drills, repair, visit) already send the hand to the room they happen in, so the camera
goes there with it. Giving dialog scenes a room of their own is not in this work.

**The outline.** The hull in miniature in a corner of the view, with the rooms, a dot per person and a frame where the camera looks. A
tap on a room in it opens that room's sheet (`roomSheet`), without moving the camera. People and rooms in view are tapped as now.

**The turn.** The interior stays upright for the whole flip; there is no squeeze, no edge-on frame and no mirroring. The turn shows
outside it: the background stars and the porthole and bridge window views wheel round, the thrusters puff at nose and stern, and the
ship in the outline turns over.

## 3. Rooms

- **All seven rooms** get the detail the third mockup shows: low ceilings, cable runs and lockers overhead, panel seams. The ladder,
  hatches and couches stay where `ROOMS`, `LADDER` and `couchX` put them.
- **Props that answer the phase**, through the hang-and-float helper: pans, a coat, the IV bag and a sock sway in cruise and drift at
  the flip; cables sag under thrust; cargo nets bulge at the flip; the plant droops in the burn; mugs are in holders at the flip; the
  reactor glows hotter in the burn; a bobblehead on the bridge bobs.
- **Outside the hull** stays as `js/hulldetail.js` draws it (seams, scorches, mast, turrets). The plume gains a second bell.
- **Faces** stay as the placeholder figures' heads.
- **Text in the rooms** (stencils, labels, the poster) is drawn only when it is 12 px or more on screen; below that it is a plain
  panel (`tests/burnview.test.js`, canvas text 12 px or more).

## 4. Testing

- **Pure units** (through `tests/nodecontext.js`): every phase gives every person a posture in `POSTURES`; the secure and flip steps
  strap people in the room they are in; only the engineer is tethered; `camTarget` follows the hand, including to an activity's room;
  `camStep` eases and stays in the hull; the outline's tap gives the right room; `gReading` is near 2.8 at the ends, near 0.4 in cruise,
  0 at the flip, and has no step larger than a small bound between neighbouring progress values.
- **`tests/burnview.test.js`**: the room box tests become "the rooms in view have boxes, and every room is reachable through the
  outline"; the mid-turn tests (nothing drawn edge-on) become "the crew are drawn, strapped, through the turn". The rest stay: every
  ship draws without an error, taps on people and rooms, faces, no overlap, text size.
- **Pins**: the secure step changes when people move, so it may shift the random draws behind life lines. A pin that moves is
  rewritten with `PIN_WRITE=1` and named in the pull request.
- Before pushing: `npm test` and `npm run test:editor`. Pay, pacing and fights do not change, so no soak.

## Not in this work

- Sprites. This work only fixes the posture list they are drawn to.
- The screen's layout (sub-project 2).
- Manual camera control, and rooms for dialog scenes.
- Caching still room art offscreen (approach 2); only if a phone measures slow.
- Changes to who is aboard, haunts, life lines or scenes.
