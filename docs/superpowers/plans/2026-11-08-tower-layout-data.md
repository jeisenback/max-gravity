# Tower Layout Data Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Each hull's interior described as data in `js/layouts.js`, with the Ice Hauler as a tower of decks, and the pure functions that place rooms, floors, seats and a walk between two points from a layout, tested in Node. Nothing is drawn from them yet (step 1 of the spec).

**Architecture:** One new classic script, `js/layouts.js`, holding the `LAYOUTS` data and small pure functions that take a layout as their first parameter and return plain values. It is loaded before `js/camera.js` and read by nobody yet; step 2 of the spec rewires the burn view onto it. Tests run it through `tests/nodecontext.js`.

**Tech Stack:** Vanilla JS classic scripts, `node:test`.

**Spec:** `docs/superpowers/specs/2026-11-08-tower-ship-design.md`

## Global Constraints

- Classic scripts sharing one global scope: every new top-level name is unique (`tests/globals.test.js`), and `js/layouts.js` is linked in `index.html` and listed in `editor.js`'s `SCRIPTS`, both before `js/camera.js`.
- New logic takes the state it reads as parameters and returns a value (CLAUDE.md); no `G`, no randomness, no drawing in `js/layouts.js`.
- No emojis anywhere (code, text, docs, commits).
- Room ids kept: `bridge`, `galley`, `berths`, `gunnery`, `medbay`, `hold`, `engine`; new: `head`, `workshop`, `airlock`, `lifesupport`.
- World units as today (`js/camera.js` `HULL`): a deck is 100 from floor to ceiling, a floor plate 12.
- Commits end with the session's attribution lines.

## Review Focus

1. A hull with no layout of its own (an enemy's, `corsair`) must get the Ice Hauler's, never `undefined`.
2. A room id the layout does not have (a scene naming `kitchen`, or an old save) must give `undefined` from `layoutRoom`, not throw.
3. A seat or a walk's end must never fall inside the ladder well on a deck split in two, or a person would stand in the shaft.
4. A walk between two points on the same deck must not detour through the well; a walk to the drive deck must pass the tank in one climb.
5. Decks must come out in order nose to drive with the tank between the plant deck and the drive deck, so a floor below is always lower on screen.

---

### Task 1: The layout data and room geometry

**Files:**
- Create: `js/layouts.js`
- Modify: `index.html` (one `<script src="js/layouts.js"></script>` line just before `js/camera.js`, line 52), `editor.js` (`'js/layouts.js'` before `'js/camera.js'` in `SCRIPTS`, line 14)
- Test: `tests/layouts.test.js` (new)

**Interfaces:**
- Produces:
  - `LAYOUTS`: `{ freighter: Layout }` where `Layout = { width: number, well: { x: number, w: number }, tankAfter: number, tankH: number, decks: Deck[], seats: { [roomId]: number[] } }`; `Deck = { id: string, name: string, rooms: { id, name, x0, x1 }[] }` with `x0`, `x1` shares of the deck's width (0 to 1).
  - `layoutOf(shipId: string) -> Layout`: `LAYOUTS[shipId]`, else `LAYOUTS.freighter`.
  - `layoutRooms(lay) -> { id, name, deck: number, x0, x1 }[]` (shares), nose first.
  - `layoutRoom(lay, id) -> { id, name, deck, x0, x1 } | undefined`.
  - `deckFloor(lay, deck: number) -> number`: world y of that deck's floor, measured down from the top of the flight deck's ceiling.
  - `layoutBox(lay, id) -> { x0, x1, top, floor } | undefined` in world units (the shape `js/rooms.js` draws into: `top = floor - 100`).
  - `towerHeight(lay) -> number`: from the flight deck's ceiling to the drive deck's floor.

The Ice Hauler (`freighter`), from the spec's table, decks nose first:

| index | id | rooms (`id` `x0`-`x1`) |
|---|---|---|
| 0 | `flight` | `bridge` 0-1 |
| 1 | `mess` | `galley` 0-0.48, `head` 0.52-1 |
| 2 | `crew` | `berths` 0-1 |
| 3 | `gun` | `gunnery` 0-0.48, `workshop` 0.52-1 |
| 4 | `lock` | `airlock` 0-0.48, `medbay` 0.52-1 |
| 5 | `plant` | `lifesupport` 0-1 |
| 6 | `drive` | `engine` 0-0.48, `hold` 0.52-1 |

`width: 880`, `well: { x: 0.5, w: 0.04 }` (shares), `tankAfter: 5`, `tankH: 260`. Seats (shares of their room): `galley: [0.28, 0.35, 0.42, 0.49, 0.56, 0.63, 0.7]`, `bridge: [0.12, 0.3, 0.7, 0.88]`, `gunnery: [0.25, 0.55]`, `medbay: [0.66]`. Room names as the spec's table: Bridge, Galley, Head and shower, Berths, Gunnery, Workshop, Airlock, Medbay, Life support, Engine, Hold.

Floors: deck `i`'s floor is `100 + i * 112`, plus `tankH` for every deck below `tankAfter`.

- [ ] **Step 1: Write the failing tests in `tests/layouts.test.js`**

Load with `load(['js/camera.js', 'js/layouts.js'], {}, [...names])` from `./nodecontext`.

```js
test('every hull has a layout, its own or the Ice Hauler\'s', () => {
  assert.equal(layoutOf('freighter'), LAYOUTS.freighter);
  assert.equal(layoutOf('corsair'), LAYOUTS.freighter, 'no layout of its own');
  assert.equal(layoutOf(undefined), LAYOUTS.freighter);
});
test('the Ice Hauler has every room once, the old ids kept and the four new ones', () => {
  const ids = layoutRooms(LAYOUTS.freighter).map(r => r.id);
  assert.deepEqual([...ids].sort(), ['airlock', 'berths', 'bridge', 'engine', 'galley', 'gunnery', 'head', 'hold', 'lifesupport', 'medbay', 'workshop']);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(layoutRoom(LAYOUTS.freighter, 'kitchen'), undefined, 'an unknown room');
  assert.deepEqual(['bridge', 'galley', 'berths', 'gunnery', 'airlock', 'lifesupport', 'engine'].map(id => layoutRoom(LAYOUTS.freighter, id).deck), [0, 1, 2, 3, 4, 5, 6]);
});
test('rooms on a deck stay inside it, do not overlap, and leave the well clear when the deck is split', () => {
  const lay = LAYOUTS.freighter, w0 = lay.well.x - lay.well.w / 2, w1 = lay.well.x + lay.well.w / 2;
  for (const d of lay.decks) {
    const rs = [...d.rooms].sort((a, b) => a.x0 - b.x0);
    rs.forEach((r, i) => { assert.ok(r.x0 >= 0 && r.x1 <= 1 && r.x0 < r.x1, `${r.id} inside`); if (i) assert.ok(rs[i - 1].x1 <= r.x0, `${r.id} clear of ${rs[i - 1].id}`); });
    if (rs.length > 1) assert.ok(rs.every(r => r.x1 <= w0 || r.x0 >= w1), `${d.id}: the well clear`);
  }
});
test('the decks run nose to drive, a deck 100 high on a 12 plate, the tank between the plant and the drive deck', () => {
  const lay = LAYOUTS.freighter;
  assert.equal(deckFloor(lay, 0), 100); assert.equal(deckFloor(lay, 1), 212); assert.equal(deckFloor(lay, 5), 660);
  assert.equal(deckFloor(lay, 6), 660 + 112 + 260, 'the tank under the plant deck');
  const b = layoutBox(lay, 'galley');
  assert.equal(b.x0, 0); assert.ok(Math.abs(b.x1 - 0.48 * 880) < 1e-9); assert.equal(b.top, 112); assert.equal(b.floor, 212);
  assert.equal(layoutBox(lay, 'kitchen'), undefined);
  assert.equal(towerHeight(lay), deckFloor(lay, 6));
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `node --test tests/layouts.test.js`
Expected: FAIL (the file `js/layouts.js` does not exist).

- [ ] **Step 3: Create `js/layouts.js`** with a header comment (what it is, that it is pure data and placing, read by the burn view from step 2 of the spec, loaded before `camera.js`), `LAYOUTS` with the data above, and `layoutOf`, `layoutRooms`, `layoutRoom`, `deckFloor`, `layoutBox`, `towerHeight`. Read the deck height and plate from `HULL` (`js/camera.js`) at call time, not at load; link the script in `index.html` and `editor.js` as above.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test tests/layouts.test.js tests/globals.test.js`
Expected: PASS, both files.

- [ ] **Step 5: Commit**

```bash
git add js/layouts.js tests/layouts.test.js index.html editor.js
git commit -m "Layouts: each hull's interior as data, the Ice Hauler as a tower of decks (#931)"
```

### Task 2: Seats, the room at a point, and a walk between two places

**Files:**
- Modify: `js/layouts.js`
- Test: `tests/layouts.test.js`

**Interfaces:**
- Consumes: `LAYOUTS`, `layoutRoom`, `layoutBox` (Task 1).
- Produces:
  - `seatX(lay, roomId, k: number) -> number | undefined`: world x of the room's k-th seat (`layoutBox` x0 + share of its width), `undefined` if the room or seat does not exist.
  - `layoutRoomAt(lay, deck: number, x: number) -> string | null`: the id of the room on that deck holding world x, `null` in the well on a split deck or outside the decks.
  - `walkPath(lay, from: { deck, x }, to: { deck, x }) -> { deck, x }[]`: the waypoints after `from`, in world units: `[to]` on the same deck; else `[{ deck: from.deck, x: wellX }, { deck: to.deck, x: wellX }, to]`, where `wellX = lay.well.x * lay.width`.

- [ ] **Step 1: Write the failing tests**

```js
test('seats sit in their room and never in the well', () => {
  const lay = LAYOUTS.freighter, w = lay.width, w0 = (lay.well.x - lay.well.w / 2) * w, w1 = (lay.well.x + lay.well.w / 2) * w;
  for (const [id, shares] of Object.entries(lay.seats)) shares.forEach((_, k) => {
    const x = seatX(lay, id, k), b = layoutBox(lay, id);
    assert.ok(x > b.x0 && x < b.x1, `${id} seat ${k} in the room`); assert.ok(x < w0 || x > w1, `${id} seat ${k} clear of the well`);
  });
  assert.ok(Math.abs(seatX(lay, 'galley', 0) - 0.28 * 0.48 * 880) < 1e-9);
  assert.equal(seatX(lay, 'galley', 9), undefined); assert.equal(seatX(lay, 'kitchen', 0), undefined);
});
test('the room at a point: the room on that deck, none in the well of a split deck', () => {
  const lay = LAYOUTS.freighter;
  assert.equal(layoutRoomAt(lay, 1, 100), 'galley'); assert.equal(layoutRoomAt(lay, 1, 800), 'head');
  assert.equal(layoutRoomAt(lay, 1, 440), null, 'the well'); assert.equal(layoutRoomAt(lay, 2, 440), 'berths', 'a full-width deck');
  assert.equal(layoutRoomAt(lay, 9, 100), null); assert.equal(layoutRoomAt(lay, 1, -5), null);
});
test('a walk stays on its deck, or goes by the well and climbs once, the tank included', () => {
  const lay = LAYOUTS.freighter;
  assert.deepEqual(walkPath(lay, { deck: 1, x: 100 }, { deck: 1, x: 800 }), [{ deck: 1, x: 800 }], 'no detour on one deck');
  assert.deepEqual(walkPath(lay, { deck: 1, x: 100 }, { deck: 6, x: 700 }), [{ deck: 1, x: 440 }, { deck: 6, x: 440 }, { deck: 6, x: 700 }], 'down the well and the tube to the drive deck');
  assert.deepEqual(walkPath(lay, { deck: 3, x: 440 }, { deck: 3, x: 440 }), [{ deck: 3, x: 440 }]);
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `node --test tests/layouts.test.js`
Expected: FAIL (`seatX`, `layoutRoomAt`, `walkPath` not defined).

- [ ] **Step 3: Add `seatX`, `layoutRoomAt`, `walkPath` to `js/layouts.js`** with the signatures above, each with a one-line comment.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test tests/layouts.test.js tests/globals.test.js`
Expected: PASS.

- [ ] **Step 5: Run the full suite**

Run: `CHROMIUM_PATH=/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell npm test` and `npm run test:editor` (the editor's script list changed).
Expected: all pass (the new script is linked but read by nobody, so nothing else moves).

- [ ] **Step 6: Commit and push**

```bash
git add js/layouts.js tests/layouts.test.js
git commit -m "Layouts: seats, the room at a point, and a walk between two places (#931)"
git push -u origin claude/vibrant-brown-juf739
```
