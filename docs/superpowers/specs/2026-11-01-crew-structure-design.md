# Crew structure to the bible (#879, scope A)

Status: draft for the owner's review, 2026-11-01.

## Goal

Bring the hired chapter's crew, and the hand's place in it, in line with `docs/bible/` (conflicts 1 to 3 in `docs/bible/README.md`), without touching the ice runs (conflict 4) or the chapter's goal (conflict 5). Those two become their own issues afterwards.

## Decisions (the owner's, 2026-11-01)

1. **Scope A.** Only the crew list, the bosun and the hand's pay. The ice runs and the Ore Runner goal stay.
2. **The crew** on Hester's ship is seven: Captain Vance; Ines (pilot) and Tomas (engineer), the officers; Cato, the bosun; the hand (guns); and two deckhands. The quartermaster, the medic and the cook go.
3. **First aid is Cato's.** The bosun holds the first-aid rating and stands in for the medic wherever the code asks for one, while he is aboard and not hurt. In his own pivot he is the one at risk, so his rating does not count there.
4. **A rating's pay.** The hand gets no share. The day rate rises, retuned with `npm run soak` so the chapter still takes about 20 runs to reach the goal. The pay note shows a kit deduction (the suit and kit Hester rents to the ratings). The hiring hall's cut stays.
5. **The bosun's slot.** The internal key stays `xo`, with the per-captain title Hester's ship already has ("Bosun"). The slot keeps what it does (crew swaps, the rota, teaching the `split` move, the tutorial walk). Its perk text on Hester's ship becomes the bosun's. The other captains' first officers (the full build, parked) keep their title and text.

## Changes

### The crew list (`js/hired.js`)

`CHAPTER_CREW` becomes `[{ role: 'xo', skill: 2 }, { role: 'icehand', skill: 1 }, { role: 'icehand', skill: 1 }]`. The main characters still take the pilot and engineer posts first, and the hand takes the guns (the narrow build). The comment above the constant follows.

### Deckhands (`js/people.js`)

The `icehand` key stays, so saves and the ice runs keep working. `ROLE_NAMES.icehand` becomes "Deckhand", and its perk "Handles the cargo, the lashings and the ice." Text that says "ice hand" (Cato's walk round the ship, his pivot) says "deckhand".

### First aid (`js/crew.js`, `js/captains/cato.js`)

- `roleHolder('medic')`, with no medic aboard, returns the unhurt crew member whose `CAST` entry has `firstAid: true`. `CAST.cato` gets `firstAid: true`.
- Every caller then counts Cato: the pivot points, the loss odds (`js/losses.js`), the hand's death odds and clinic bill (`js/boarders.js`), treating a hurt hand, boarding, and the scenes conditioned on `crew: 'medic'`.
- `catoHoldPoints` counts a medic other than Cato only.
- The pivot texts that say "{medic} has the med kit open at the hatch" read the same, naming Cato.
- One test pins the fallback: with no medic aboard, `roleHolder('medic')` is Cato; when Cato is hurt, it is nobody.

### The quartermaster and the cook

- The quartermaster's extra rumour (`js/transit.js`) stops, because nobody holds the post. No code change is needed beyond the crew list.
- `js/social.js`'s feud scene already falls back to "whoever is nearest" with no cook.
- Stories conditioned on `crew: 'cook'` or `crew: 'quartermaster'` don't fire on Hester's ship.

### The bosun's perk (`js/people.js`, `js/captains/hester.js`)

`ROLE_PERKS.xo` reads the captain's `xoPerk` when there is one. Hester's is "Runs the ratings and the rota, and holds the first-aid rating."

### Pay (`js/hired.js`, `js/captains/*.js`)

- `HIRED_SHARE` becomes 0. The hand's share no longer comes from the captain's `share` field. That field goes from the entries, and `tests/captains.test.js`'s required fields follow.
- The hand's day rate is the hired captain's own `wage` field (Hester's is 350; `HIRED_WAGE`, 400, is the fallback with no captain). Each captain's `wage` rises to the figure the soak gives for about 20 runs to the target with no share (a starting guess for Hester: about 650), and `HIRED_WAGE` with them. The comment says how it was tuned.
- `KIT_DEDUCTION`, a fixed sum a day (a starting guess: 30), comes out of the wage before the hall's cut. The pay note says so: "Your pay: X cr wage, less Y cr for your kit."
- The sign-on lines that quote a share follow:
  - Hester's intro: "${wage} a day and ${share} percent";
  - the hiring board;
  - the settling-up scene.

### Cato's walk round the ship (`scene:cato-round`) and the help (`js/help.js`)

- The walk names the posts the ship now has:
  - the galley on the rota;
  - Cato's first-aid kit;
  - the hold and the deckhands;
  - the engine;
  - the guns;
  - the rota.
- The help text says "The bosun runs the ratings and the rota" where it said "A first officer runs the watch".

## Tests

- Pins: effects will change on purpose: the crew aboard, and with them who holds what; the pay; and every run's numbers. Each pin is written again, and its diff read for anything the decisions don't explain. The commit messages say what changed and why.
- `npm run soak` before and after, for pacing and pay. The new wage is the one that gives about 20 runs, and the figure goes in the commit.
- New tests: the first-aid fallback; the pay note's kit line; the crew list (seven aboard, no quartermaster, medic or cook).
- `npm test`, `npm run test:editor`, `npm run coverage -- --check`.

## Out of scope

- The ice runs, the ice hazard pay and the ice hold (conflict 4).
- The chapter's goal (conflict 5).
- The other captains' first officers (the full build).
- Renaming the `xo` and `icehand` keys.
