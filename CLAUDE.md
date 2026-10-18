# Max Gravity

An Escape Velocity homage in vanilla JS and canvas. Static site, no build step. Design notes are in `README.md`, `COMBAT.md` and `ROADMAP.md`.

## Before changing code

- Read `.claude/heartbeat.json` first. If it shows another session active on the same branch (updated in the last few minutes), stop and tell the user instead of editing.
- Write it when starting a task and update it at each step (before edits, after tests pass, after commit and push). Mark it `done` at the end. It is git-ignored; never commit it.
- Fields: `branch`, `issue`, `task`, `step`, `files`, `status`, `updated` (UTC).

## Code

- Classic scripts sharing one global scope. Load order is in `index.html`; `tests/globals.test.js` enforces unique top-level names and that every script is linked.
- Keep it small: build what the issue asks for, nothing extra.
- Every field a script keeps on `G` is declared, with a comment, in the literal in `js/game.js` (`tests/gfields.test.js` fails on one that is not). New logic takes the state it reads (`st`, and what else) as parameters and returns a value; the caller reads `G`. Such a module runs through `tests/nodecontext.js` without a browser. When a module is touched for another reason, move it that way if the change is small; do not open a module only for this.
- The owner game is parked (`ROADMAP.md`), so new code is written for the hired hand with no `hired()` fork in the middle of its logic. Something only an owner does is a gate at its edge (`if (!hired()) return ...`), not a second branch inside the hand's code. Do not add a fork to make the owner path work; if the owner game comes back, the answer is a small role object (what the player may trade, decide and pay for), not more forks (#575). That object is `js/role.js` (#685): a check that is about what the player may trade, decide or pay for is a question put to `role()`, and a fork on `hired()` for it is moved onto the role when the code is opened.
- No emojis anywhere (code, text, docs, commits).

## Tests

`CHROMIUM_PATH=$(ls /opt/pw-browsers/chromium_headless_shell-*/chrome-linux/headless_shell | tail -1) npm test` (about four minutes on four cores; the headless shell opens a page about a third faster than `/opt/pw-browsers/chromium`, which also works). Run it before pushing. It leaves out the scene editor's tests (`tests/editor*.test.js`, about two minutes more, #752): run `npm run test:editor` as well when you change the editor or the scenes it shows. CI runs both on every pull request. While working, `npm run test:changed` runs only the test files the changed files can affect (`--list` shows the choice without running it). `npm run coverage` reports line coverage and the functions never called; `npm run coverage -- --check` is the floor for the narrow build's files (`tools/coverage-floor.json`), run by CI as its own job on main and on a pull request that changes a file the floor names or the coverage tools (`touchesFloor` in `tools/floor.js`, #754). If a file falls under it, test what it names; when a file's coverage rises, raise its number. Pins (seeded records of what scenes play, `tests/*pin.test.js`) are described in `docs/pins.md`; `npm run pin:from -- tests/xxxpin.test.js` writes one again from the code at a commit. A page that does not answer one `ev` in 120 s (`TEST_STALL_MS`; `open({ stall })`, 0 for none, as the tools do) fails its test naming where it was called from and whether the renderer was busy or asleep (#729). `open()` in `tests/helpers.js` loads the shipped (narrow) build; a test of what that build switches off (the owner game, other starts, captains, storylines) says `scope: 'full'`, and `npm run scopes` prints the split. `npm run soak` runs the distribution checks (many seeds, a stated sample and tolerance) that are not in `npm test`; run it when you change pacing or pay. CI runs them nightly on main, one runner per file (`.github/workflows/soak.yml`), and by hand from the Actions page.

## Git

- Work on the branch named in the task. Open a PR only when asked.
- Commits and PR bodies follow the attribution lines the session gives.
