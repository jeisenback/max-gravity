# The look

Status: written on 2026-11-11 from the owner's calls on the screenshots of the burn view's rooms (#933, #958, #978), which are the examples below. It is to the drawing what `voice.md` is to the writing. The world it draws is the rest of this bible, above all `technology.md` and `ship.md`.

The ship is drawn the way the writing is written: what is there, at its real size, used and mended. Nothing is drawn to impress. A prop is there because someone aboard uses it, and it looks like it has been used.

## Scale

Everything is sized against a person.

- A standing person is 89 units from the deck to the top of the head (`FIG_TALL`, `js/figures.js`). The ceiling is 100.
- A seat is at the seated hip, about 23. A counter, a console or a desk is at the waist, about 40. A screen or a monitor someone reads is at eye height, about 77. A locker or a door is near head height, about 90.
- A bunk or a cot is a person long with a little to spare: a lying person is about 89, the cot is 108.
- A thing a person carries is the size it would be in their hands: a guitar is about 50, the length of a person's arm and shoulders.

Hold each prop against a person in a screenshot before it is done. The owner has sent back a guitar as tall as a person, and a monitor and a bed a size too big.

## Light and tone

- The walls are darkest, the props in the middle, the people brightest. A prop never outshines the people.
- No white blocks and no saturated colour on a prop: no colour channel above `0xb0`, and no more than `0x60` between its brightest and darkest channel. Paint on a prop (a serial, a stencil) is quieter still.
- Two tones: the top and the front catch the ceiling light, the side is in shade, as the figures' suits are lit.
- A lamp's glow, a lit screen and a warning light may be brighter, and are small.

## Shapes and detail

- Shapes, not boxes: every prop larger than a hand is a drawn path (rounded corners, bevels, legs, lips, handles) with the figures' thin dark outline (`FIG_LINE`). `roomPart` and `roomRound` in `js/rooms.js` draw them.
- Details at the size of a zip or a pocket: screws, latches, hinges, straps and buckles, tie-down rings, handholds for zero g.
- Everything that could float is held down: straps, clips, lips on shelves, lashings to rings in the deck. The ship flips and burns hard, and the crew know it.

## Old and patched

The ship is about fifty years old, refitted under several owners, and run on what is cheap (`technology.md`, `ship.md`). Each room shows it, quietly: old and cared for, not a wreck.

- Kit of different ages: a newer unit bolted onto an older mount, in another finish, with fresher bolts.
- Wear at fixed places: chipped paint on edges, scuffs where hands and boots go, a replacement panel or door in another shade.
- A printed part, in printed plastic, with its temporary tag.
- Repairs: tape, cable ties, a mended stretch of net in another cord.

The medbay (#1020) was the first room drawn this way; the galley, the bridge and the berths are brought to it after.

## Words on things

- Nothing is drawn as text under 12 pixels on screen. A word that cannot be 12 or more is not drawn.
- Most writing on things is drawn as marks, not words: serial numbers, notes on a pinboard, a log's lines, numbers chalked on a rack. They read as "something is written here" and do not compete with the people.
- Labels are what the real thing would carry. A crate carries a stencilled serial, not a word saying what is in it (the owner's call on the hold, #1021).
- A room's name sits on clear wall, with no prop under it.

## Where the props come from

- The ship life lines (`LIFE_LINES`, `js/shiplife.js`) and the scenes say what is in a room: the hot water ration in the head, the safety pin on the torpedo rack, the range tables taped above the gun console. The drawing agrees with them and adds nothing they contradict.
- What the game knows, the room shows: who is asleep, who is hurt, the cargo, the torpedoes she carries, the phase, night, damage.
- A station is a place someone works: a seat, a console in front of it, what they reach for. The comms rack became a station the slicer sits at (#1017).
- A room has the personal things of the people who live in it: the berths' corner has books, a photo, a plant, a mug and a guitar (#1019), and each bunk leaves a place for its owner's one thing (#934).
- Where a later issue will put something (the cargo's name, the destination in the bridge window, an owner's thing), the drawing names that place in code and keeps it clear.

## Constraints

- Pure drawing: `js/rooms.js` reads no state and draws no randomness. A path given to `roomPart` is fixed per layout; a moving part is placed with a translate.
- Reduced motion keeps everything still (`Settings.reduceMotion`).
- Desktop only (#937): judged at 1600 and 1000 pixels wide.
