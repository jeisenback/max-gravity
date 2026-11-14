# The Hand's Papers: A Character Creation Screen

Status: draft for the owner's review, 2026-11-14 (#1251). Agreed in conversation from three options. Builds on the new-game form (`js/menu.js`), the sheet (`js/sheet.js` `newSheet`, the one check rule), the sign-on scene (`js/signon.js`, `scene:sign-on` in `js/hiredscenes.js`), the record and the traits (`js/traits.js`, #964), the shippers' standing (`js/contracts.js`), the people's opinions (`js/people.js`), and the Record card (`js/character.js`).

## Why

The game opens on a form: a name, four posts, Start. A run follows one hand (`docs/bible/shape.md`), and the sheet, the record and the traits now carry who that hand is, but nothing at the start lets the player say who they were before the ship. The screen becomes the hand's papers as the hall files them, and two questions about the life before the ship give the hand a shape on the sheet and a first fact on the record, which the sign-on reads back and the traits and the goodbye read later.

## Approaches considered

- **The papers alone**: name, home, post, the sheet shown as four words. Small, but a form is the least RPG-like opening the game could have.
- **The papers and two questions** (chosen): the papers, then two permanent choices about the years before, each writing the sheet or the record and read back by the sign-on.
- **No screen**: a name and Start, with the post, the home and the reason chosen inside the sign-on scene. The most in the fiction, but a player cannot see the posts or the sheet before committing, and trying another post means replaying the scene.

## The screen (`js/menu.js`, the `new` view)

For a hired hand (the shipped build's one mode), in this order, on the one page the form is now:

1. **The name on your papers**: the text field as now.
2. **Where you are from**: three choices, Earth's arcologies, Mars's domes, the Ceres Warren (`BACKGROUNDS`), each with a sentence for a hand in the voice of `docs/bible/voice.md`, replacing the owner's credits-and-a-ship sentences. The shipped build shows the three (the `starts` scope no longer hides them for a hand); the ship still starts at Earth with the captain whatever the home: you came to Earth to sign on. A hand's start at Mars or Ceres is #1252.
3. **Rated**: the four posts as now.
4. **The sheet**, read-only, as four words with the points marked: `Hands 3  Eye 4  Nerve 3  Wit 4`, computed by `newSheet(background, post)` plus the trade below, and redrawn as the choices change.
5. **What you were before the ship**: four choices, one of them "Nothing worth a line". Each of the other three trades a point on the sheet, a point up and a point down:
   - Dock labour: hands up, wit down.
   - A clerk at a shipper's office: wit up, nerve down.
   - A rating on a short-haul ferry: nerve up, hands down.
   No stat goes below 2 or above 5 (`STAT_MAX`): a trade that would is applied as far as the floor and the cap allow, and the sheet line shows the result.
6. **Who knows your name**: four choices, one of them "Nobody worth a line":
   - A shipper at your home port: the home government's freight office (`SHIPPERS.gov[CULTURE_FACTION[background]]`) starts at standing 1 (`h.standing[shipper] = 1`), so its board draws as for a shipper that knows the ship.
   - A patrol: one fine already on the record (`h.record.fines = 1`, halfway to Marked), and the first heave-to says so (one line, below).
   - A shipmate: one of the crew aboard at the sign-on, drawn from the generated crew (never the cast), starts at opinion 1 with a memory of the earlier ship.
7. **Save slot** and **Start** as now.

The form keeps `before` and `known` beside `background` and `post`; `startGame` passes them on to the sign-on (`st.hired.papers = { before, known }`). The owner's form is unchanged except that it no longer shows the hand's two questions.

## What the answers do (`js/hired.js`, the sign-on)

- The sheet: `newSheet(background, post)` as now, then the trade of `before` applied with the floor and the cap, in a pure `papersSheet(sheet, before)` in `js/sheet.js` so the form and the game compute the same sheet.
- `known`: applied once where the hand is made (`js/hired.js:137`): the standing, the record's fine (through `recordAdd`, so a later `recordHand('fines')` reads one already there), or the shipmate's opinion and memory (`like(c, 1, memory)` on a generated crew member, chosen by the seeded draw).
- The sign-on scene gains a paragraph that reads the two answers back, one line each (`before.<id>` and `known.<id>` lines in `scene:sign-on`), between the post's paragraph and the week's.
- The first heave-to (`js/engage.js`, the heave-to choice's result) adds one line when `h.papers.known === 'patrol'` and no fine has been paid since the sign-on (`h.record.fines === 1`): the officer has the name from before.

## The Record card (`js/character.js`)

A first line, **Before the ship**, under the card's eyebrow and above the traits: the two answers in words ("Dock labour on Earth. A patrol has your name."), from `before.<id>.word` and `known.<id>.word` lines in `scene:traits`; nothing when both were declined. The card's golden is rewritten.

## Words

All new lines are first drafts in the voice of `docs/bible/voice.md`, in the text layer so the editor and the scene-lines check see them: the three home sentences (`js/menu.js` `BACKGROUNDS[*].text`, read through `scene:sign-on` as `home.<id>`), the question labels and the eight answers (`scene:sign-on`, `before.<id>.label`, `known.<id>.label`), the sign-on's read-back lines, the heave-to's line (`scene:contact`), and the Record card's words (`scene:traits`).

## Testing

- `tests/sheet.test.js` (node): `papersSheet` on each trade, the floor at 2 and the cap at 5.
- `tests/menu.test.js` or the file that drives the new-game form: the two questions render for a hand and not for an owner; the sheet line changes with the post, the home and the trade; `startGame` gets `before` and `known`.
- `tests/hired.test.js` (browser): a game started with each `known` answer has the standing, the fine on the record, or the shipmate's opinion and memory; the sign-on's text carries the read-back lines; the heave-to's line shows once for the patrol answer.
- `tests/ladder.test.js`: the Record card's "Before the ship" line, and its golden.
- The scene lines played by the harness (`tests/sceneplay.js`); the pins that move read with the diff (the sign-on's words).

## Not in this piece

- A hand's start at Mars or Ceres (#1252).
- Picks at creation (the bible takes them at the port), traits chosen (earned, #964), a portrait or a face.
- The owner's start and its tutorial checkbox, unchanged.

## Assumptions to confirm

- The screen stays one page: the papers and the two questions together, not a wizard.
- The three home choices show in the shipped build, with the ship starting at Earth whatever the home.
- Each question's answers are permanent; the sheet trade is a shape, not a purchase; the floor is 2.
