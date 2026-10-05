# The ship is the interface

Status: draft for review. Branch `ccr-0c6cdc5f-a04bf5`.

## Context

The build is narrowing to one path: a gunner, an Earth start, the two fixed main characters, and one captain with their first officer (#289). The roadmap puts speed of development first, and no overbuilding.

Today the interface is DOM panels built from template strings (`js/ui.js`, `js/bridge.js`), with tabs under six stations, a burn view drawn on a canvas with DOM overlays (`js/transit.js`), and one real breakpoint at 700px. Nine open issues describe the symptoms: #262 (transit overlaps), #263 (header and run label), #264 (disabled tabs give no reason), #265 (text too small), #267 (accessibility), #268 (clipped content, misaligned rows) and #269 (dock grouping, tablet layout, Continue on the title).

This design replaces the navigation with the ship itself. It folds in those issues and does not replace the no-build, vanilla JS stack.

## Decisions

1. **The deck plan is the navigation.** In port it is a side rail of rooms. In a burn it is the full two-deck cutaway with people moving in it, and a page opens as a sheet over it. The old tabs and station keys go away at cutover.
2. **The rail has two groups.** The ship group has the bridge, gunnery, galley and berths, medbay, hold and engine, taken from `ROOMS` in `js/shiplife.js`. An "Ashore" group has Port, Bar and Missions, and shows only while docked.
3. **Rollout is behind a flag, room by room.** The new shell lives beside the old screens under one switch in `js/build.js`. Pages are ported one at a time. The old screens are deleted at cutover.
4. **Existing pages are wrapped first, not rewritten.** Porting a page means registering its current render function under a room id.
5. **Escaping moves into view helpers.** Pages that move onto them get template escaping (#251) without a separate pass.
6. **Dormant, not deleted.** Owner-era pages (Exchange, Company) stay reachable through the same rail table in the full build, in the Ashore group.
7. **Layout is B for port and C for the burn view,** with A (a ship strip above the page) as the fallback if B proves too far from today's layout. Mockups: https://claude.ai/artifact/P6EidhH96QcofRreEZT8Lp.
8. **The Journal is an entry of its own on the rail,** not a room. It sits with the ship group, below the rooms, since it is the ship's record (the Crew page already keeps the ship's history).
9. **The gunnery room and the Weapons page are one page.** The room is the page; there is no separate Weapons station in the new shell.
10. **The flag is on by default in the narrow build from step 2,** once every page is registered. Before that it is off, and the full build keeps the old screens until cutover.

## The pieces

- **The shell** (`js/shell.js`) owns the frame: the status bar, the rail, the page area and the dock. With the flag on it replaces the stations bar and tabs that `js/ui.js` and `js/bridge.js` draw.
- **The rail table** is one data list and the single source of truth. Each entry has an id, a label, a group (ship or ashore) and an `available()` rule (docked, scope, post). It replaces the `STATIONS` and `tabs` mapping in `js/bridge.js`. A disabled entry carries a reason that is shown (#264).
- **The page registry** maps a room id to a render function. In the first pass each existing page (`port`, `bar`, `crew`, `journal`, `weapons`, `shipyard`) is wrapped as it is.
- **The view helpers** (`js/views.js`) are a panel, a list, a person card and a choice block, with escaping inside them.
- **The flag** is one switch in `js/build.js`, in the style of `scopeOff()`. It is off until step 2 is done, then on by default in the narrow build (decision 10) and off in the full build until cutover. Tests can set it either way.
- **The burn view** is the same flag in a later phase. The cutaway drawn in `js/transit.js` becomes the screen, and pages open as sheets from the same registry.

**Data flow:** game state, then the page registry's render, then the shell. An unknown page id falls back to Port. With the flag off the old path runs unchanged.

## Build order

Each step ships on its own behind the flag and leaves `main` working.

0. **Before starting:** #289 (the narrowing), then the injection-gap items (#251, #310), because the shell touches the same templates.
1. **Walking skeleton:** the shell, rail table, page registry and flag, with only Port, Bar and Crew registered. That is enough to play a hired hand's loop in port with the new frame.
2. **Register the remaining pages** (Journal, Missions, gunnery, engine, bridge and comms) and fix #262, #263, #264, #265 and #268 once, in the shell's layout rules, with one type scale and one set of spacing tokens. At the end of this step the flag turns on by default in the narrow build.
3. **Move pages onto the view helpers,** starting with those that print names (Crew, Bar, scenes). #309's removal of the three inline handlers happens here.
4. **Phone and tablet:** the rail becomes a bottom strip, a tablet breakpoint is added (#269), and focus and screen-reader handling is done in the shell (#267).
5. **The burn view:** the cutaway becomes the screen, with pages as sheets. The cutaway is drawn on a canvas in `js/transit.js`, so tapping a room needs hit-testing on the canvas.
6. **Cutover:** delete the old stations and tabs code and the flag.

## Testing

- A new `tests/shell.test.js` covers the rail: which entries show docked and in a burn, the availability rules and the disabled reasons.
- Each ported page's existing test also runs with the flag on, through one option on `open()` in `tests/helpers.js`, so only pages already ported run twice.
- A width check at 1280x800, 768x1024 and 390x844 on the shell: no clipped or overlapping text (#262's "done when"). The tablet width comes into play at step 4.
- The suite runs both ways until cutover. The flag-off run proves `main` is not broken.
- `tests/globals.test.js` already guards the new scripts: every file is linked in `index.html`, and no top-level name clashes.

## Risks

- **Two code paths for a while.** Keep the period short by finishing step 2 before starting step 3.
- **Test selectors change at cutover.** Pages ported behind the flag should keep stable `data-action` names so the tests do not move twice.
- **The burn view's canvas hit-testing** (step 5) is the least certain step. If it proves too costly, the burn view keeps its station key bar and the rest of the design stands.

## Out of scope

- A framework, a bundler or a build step.
- New game systems. This changes how existing pages are reached and drawn, not what they do.
- The pilot post's flight screen and the owner-era local-space code, which are held for later.
- Restyling the art, the portraits or the cutaway drawing itself.

## Open questions

None. The three raised in the first draft are settled as decisions 8, 9 and 10.

## Done when

- The new shell is the only navigation, the old stations and tabs code is deleted, and the flag is gone.
- A gunner can play the full hired chapter, in port and in a burn, with no disabled entry that lacks a reason, no clipped or overlapping text at 1280x800, 768x1024 and 390x844, and focus handled on every room change.
- The full build behind `?scope=full` still reaches every page it reaches today.
- Issues #262 to #265, #267 to #269 are closed, and #251 and #309 are closed for the ported pages.
- The full suite passes: `CHROMIUM_PATH=/opt/pw-browsers/chromium npm test`. No emojis.
