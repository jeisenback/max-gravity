# Chatter and the Watch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On a burn, every comms line about a crew member or the captain describes something they could be doing where the cutaway shows them; on the night a scene hands out a watch, the cutaway shows who stands it and where the relieved one went.

**Architecture:** Chatter lists may be grouped by room (as `LIFE_LINES` are); a pure `chatterAt(lines, room)` picks the lines that fit, and `chatterRoom(id)` (shiplife.js) says where the cutaway has someone, or null when asleep or strapped in. The watch is a one-night record on the burn (`G.transit.watch`), written by a `standWatch` scene effect and read by `routineSpot` through the ship's state.

**Tech Stack:** Vanilla JS classic scripts, `node:test`, Playwright (`tests/helpers.js`), `tests/nodecontext.js`.

**Spec:** `docs/superpowers/specs/2026-11-11-chatter-and-watch-design.md`

## Global Constraints

- Chapter one only: Hester's crew and the main characters who can join it. Parked captains and storylines are untouched.
- A grouped chatter list is `{ any: [...], <roomId>: [...] }` with room ids from `ROOMS` (`js/rooms.js`, e.g. `bridge`, `galley`, `engine`, `berths`, `gunnery`, `workshop`, `hold`, `head`, `medbay`); a plain list means anywhere.
- The generic comms traffic (`CHATTER`, `lines:comms-chatter`) stays a plain list. The cat's lines (`js/family.js`) are out of scope.
- Three chatter lines a burn, the 60/40 split, `pickFresh`, `Mods.filter('chatter', ...)` and the quiet setting are unchanged.
- `G.transit.watch = { night, stands, post, relieved, relievedAt }` lives only on the burn: no `G` field, no save field.
- No emojis. Desktop only (#937). New logic takes its state as parameters; the caller reads `G`.

## Rulings made while planning (from the code, not in the spec)

- The main characters' own `chatter` in `js/cast.js` is never drawn today: a cast member is a person record without it, so it falls to trait chatter. Task 1 draws it, as the owner crew's own lines already are (`c.chatter || trait lines`, `js/transit.js`): a cast member's own lines replace their trait lines.
- The social mod's crew talk names rooms for a person (`fav`, `fav.finale`: "in their bunk", `js/peopletext.js` `social:crew-talk`). Task 2 says those only when that person is in `berths`. The unnamed galley lines (`table`, `debate`) are about the room, not a speaker, and stay.

## Review Focus

1. A watch scene that plays at the start of a burn (on the couches) or in the day: the record is for the coming night, not a night already past. Pinned in Task 3.
2. The one standing the watch, or the one relieved, is hurt: the medbay wins over the record. Pinned in Task 3.
3. The engineer relieved to their bunk is drawn asleep, not awake in bed: `isAsleep` treats the night watch roles as awake, so it must read the record. Pinned in Task 3.
4. Everyone who could speak is asleep or strapped in: the chatter falls to the generic traffic and never throws or comes up empty. Pinned in Task 1.
5. A burn resumed from a save (no `watch` on the burn, or an old one): nothing throws and the timetable applies. Pinned in Task 3.

---

### Task 1: Chatter picks by where the speaker is

**Files:**
- Modify: `js/shiplife.js` (`chatterAt`, `chatterRoom`), `js/transit.js` (the chatter pool in `updateTransit`, lines ~353-362), `js/hired.js` (`captainChatter`)
- Test: `tests/chatter.test.js` (new: Node and browser)

**Interfaces:**
- Produces:
  - `chatterAt(lines, room) -> string[]`: `lines` a plain array or a grouped object; `room` a room id or `null`. Plain and `room` not null: the whole list. Grouped: `[...(lines.any || []), ...(lines[room] || [])]`. `room` null: `[]`.
  - `chatterRoom(id) -> string|null`: the room the cutaway shows the person with this id in (`G.transit.aboard`, matched by `p.id`, the captain by `p.role === 'captain'` when `id === 'captain'`); `null` when there is no burn, no such person, `phase() !== 'move'`, or `isAsleep(p)`.
- Consumes: `shipPeople`/`G.transit.aboard`, `isAsleep`, `phase` (shiplife.js).

- [ ] **Step 1: Write the failing tests** in `tests/chatter.test.js`:
  - Node (load `js/shiplife.js` with the stubs it needs, or put `chatterAt` where it loads alone): `chatterAt(['a','b'], 'galley')` is `['a','b']`; `chatterAt(['a'], null)` is `[]`; `chatterAt({ any: ['a'], engine: ['e'], galley: ['g'] }, 'engine')` is `['a','e']`; same with `'hold'` is `['a']`; same with `null` is `[]`.
  - Browser (`open()`, a hired game on a burn via `uatBurn`, `G.transit.aboard` built by `shipPeople()`): set one crew member's record to `room: 'engine'` with the others asleep in the berths at night; force chatter 20 times (`t.chatter = 0; t.chattered = 0; updateTransit(0.01)` with `Math.random` at 0.01 so the crew pool is chosen) and assert every line drawn is one of that person's `chatterAt(..., 'engine')` lines or a generic line; and `chatterRoom` of a sleeper is `null`.
  - Browser, Review Focus 4: everyone asleep at night: 20 draws, no throw, each line is from `CHATTER` (generic traffic).
  - Browser: a cast member aboard (Tomas) draws his own `CAST.tomas.chatter` lines, not trait lines.
- [ ] **Step 2: Run** `CHROMIUM_PATH=/opt/pw-browsers/chromium node --test tests/chatter.test.js`. Expected: FAIL (`chatterAt` not defined).
- [ ] **Step 3: Implement** `chatterAt` and `chatterRoom` in `js/shiplife.js`. In `updateTransit`, build the crew pool per person: `const room = chatterRoom(c.id)`; their lines are `chatterAt(c.cast ? CAST[c.cast].chatter : c.chatter, room)` when they have their own, else `chatterAt` over each trait's `traitChatter(t)` (a trait list is plain or grouped) filled with `{first}` and `{home}`; a passenger's trait lines likewise with the passenger's room. `captainChatter()` filters Hester's own lines with `chatterAt(d.chatter, chatterRoom('captain'))` and returns `[]` when that is empty, so the `chatter` filter in `js/hired.js` keeps the pool. When the crew pool is empty, the generic traffic is used, as when the 40 percent falls.
- [ ] **Step 4: Run** the test again and `node --test tests/globals.test.js`. Expected: PASS.
- [ ] **Step 5: Commit** `Chatter is drawn from where the speaker is in the cutaway, and the main characters say their own lines (#987)`.

### Task 2: The writing pass, and the room-word test

**Files:**
- Modify: `js/cast.js` (`chatter` of every cast entry), `js/peopletext.js` (`TRAITS[...].chatter`), `js/captains/hester.js` (`chatter`), `js/social.js` (`socialLines`, the `fav` and `fav.finale` lines)
- Test: `tests/chatter.test.js` (the room-word test), `tests/linetables.test.js` and the pins as they move

**Interfaces:**
- Consumes: `chatterAt`, `chatterRoom` (Task 1).

- [ ] **Step 1: Write the failing room-word test.** For each list (every `CAST[k].chatter`, every `TRAITS[t].chatter`, `CAPTAINS.hester.chatter`): every line in a plain list or in `any` must not match `/\b(galley|engine room|bunk|berth|bridge|helm|cockpit|the hold|medbay|the guns|gun mount|workshop)\b/i`, except lines in an `ALLOWED` list in the test, each with a comment (Cato's blanket "on the berth of whoever has the cold watch" is one).
- [ ] **Step 2: Run** it. Expected: FAIL, naming the lines that need a room.
- [ ] **Step 3: Group the lines.** Move each failing line into the room it happens in (Tomas's seized valve to `engine`, Yelena arguing with the feed to `galley`, Hester eating at the galley counter to `galley`, Hester at the `{post}` station to `gunnery`, the room of the hand's post in chapter one), keeping every word. A line that only names a room in passing goes on `ALLOWED` instead.
- [ ] **Step 4: The social lines.** In `socialLines`, the `fav` and `fav.finale` lines for a person are only said when `chatterRoom(f.p.id) === 'berths'`. Add a browser test: with the person in the galley, neither line is in `socialLines()`; in the berths, one is.
- [ ] **Step 5: Run** `npm run test:changed`. Expected: the new tests pass. A pin or line-table test that moves because a line now sits in a group (`tests/msgpin.test.js`, `tests/linetables.test.js`, `tests/scenelines.test.js`) is rewritten with `PIN_WRITE=1` and the diff read: only chatter draws and group paths may change. `npm run test:editor` passes (the editor lists grouped lines by their key, as it does `LIFE_LINES`).
- [ ] **Step 6: Commit** `Chapter one's chatter says where it happens (#987)`.

### Task 3: The watch a scene hands out

**Files:**
- Modify: `js/shiplife.js` (`standWatch`, `shipState`, `routineSpot`, `isAsleep`, clearing at wake), `js/storylets.js` (`EFFECTS.standWatch`, `EFFECT_SHAPES.standWatch`), `js/cast.js` (`yelena.mid2` choices), `js/hiredevents.js` (`cap-favour`'s `c0` run)
- Test: `tests/watch.test.js` (new: Node and browser)

**Interfaces:**
- Produces:
  - `standWatch(t, day, stands, post, relieved, relievedAt) -> void`: writes `t.watch = { night, stands, post, relieved, relievedAt }`. `day` is `shipDay(t.elapsed).day`. A ship day runs `breakfast` to `wake`, and its night is its `handover` and `night` blocks, so `night` is `day` in any block from `breakfast` to `night`, and `day + 1` in `wake`, when that day's night is over.
  - The effect `standWatch: { stands, post, relieved, relievedAt }`: `stands` and `relieved` are `'you'`, a cast key, a role (`'engineer'`), or `null` for `relieved`; resolved to person ids (`'you'`, `castPerson(key).id`, `roleHolder(role).id`). With no burn (`!G.transit`) it does nothing.
  - `shipState(...)` gains `watch`: `t.watch` when `t.watch.night === shipDay(t.elapsed).day`, else `null`.
  - `routineSpot(p, block, state)`: in `handover` and `night`, after the hurt and before the timetable: `p.id === state.watch.stands` gives `{ room: state.watch.post, at: 'post' }`; `p.id === state.watch.relieved` gives `{ room: 'berths', at: 'bunk' }` for `'bunk'`, else `{ room: relievedAt, at: 'table' }` for the galley and `{ room: relievedAt, at: 'post' }` for another room.
  - `isAsleep(p)`: a night-watch role relieved by the record and in its bunk is asleep; the one standing it is not.
  - The record is deleted when the `wake` block of a day after its `night` begins.

- [ ] **Step 1: Write the failing tests** in `tests/watch.test.js`:
  - Node: `routineSpot({ id: 'you', role: 'you' }, 'night', state)` with `state.watch = { stands: 'you', post: 'gunnery', relieved: 'c:yelena', relievedAt: 'galley' }` (and the other `state` fields empty) is `{ room: 'gunnery', at: 'post' }`; Yelena's is `{ room: 'galley', at: 'table' }`; the engineer's is their post as on any night; with `state.watch = null` the hand's is `{ room: 'berths', at: 'bunk' }`.
  - Node, Review Focus 2: with Yelena in `state.hurt`, hers is `{ room: 'medbay', at: 'bed' }`.
  - Node, Review Focus 1: `standWatch` with the ship's block at `breakfast` of day 3 records `night: 3`; at `night` of day 3, `night: 3`; at `wake` of day 3, `night: 4`.
  - Browser: Yelena aboard on a burn; playing "Take her watch" leaves `G.transit.watch` as above; at night (`t.elapsed` set into the night block) the cutaway's records put the hand in `gunnery` and Yelena in the galley; after the next `wake`, `G.transit.watch` is gone. "It's your watch." puts Yelena in `gunnery` at night and the hand in a bunk.
  - Browser: the captain's favour, "stand": the hand is in `engine` at night, the engineer in a bunk, and `isAsleep` of the engineer is true (Review Focus 3).
  - Browser, Review Focus 5: a burn with `t.watch` deleted, and one with `t.watch.night` in the past: nothing throws, and the timetable applies.
  - Browser: either choice played at a port (no burn) records nothing.
- [ ] **Step 2: Run** `CHROMIUM_PATH=/opt/pw-browsers/chromium node --test tests/watch.test.js`. Expected: FAIL.
- [ ] **Step 3: Implement** the interfaces above. The effect's shape check in `EFFECT_SHAPES` names a bad `stands` or `relievedAt`. `yelena.mid2` "Take her watch" gets `standWatch: { stands: 'you', post: 'gunnery', relieved: 'yelena', relievedAt: 'galley' }`; "It's your watch." gets `standWatch: { stands: 'yelena', post: 'gunnery', relieved: null }`. `cap-favour`'s `c0` run calls the effect's runner with `{ stands: 'you', post: 'engine', relieved: 'engineer', relievedAt: 'bunk' }`.
- [ ] **Step 4: Run** `npm run test:changed`. Expected: PASS. The scene pin moves only if an effect adds a line; none should, so a pin change here is a finding.
- [ ] **Step 5: Commit** `The cutaway shows the watch a scene hands out (#951)`.

### Task 4: Whole-suite verification

- [ ] **Step 1:** `CHROMIUM_PATH=/opt/pw-browsers/chromium npm test`. Expected: all pass.
- [ ] **Step 2:** `npm run test:editor`. Expected: all pass.
- [ ] **Step 3:** A screenshot at 1280x800 of the night after "Take her watch" (the hand at the guns, Yelena in the galley), for the PR. Commit and push.
