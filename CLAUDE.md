# Max Gravity

An Escape Velocity homage in vanilla JS and canvas. Static site, no build step. Design notes are in `README.md`, `COMBAT.md` and `ROADMAP.md`.

## Before changing code

- Read `.claude/heartbeat.json` first. If it shows another session active on the same branch (updated in the last few minutes), stop and tell the user instead of editing.
- Write it when starting a task and update it at each step (before edits, after tests pass, after commit and push). Mark it `done` at the end. It is git-ignored; never commit it.
- Fields: `branch`, `issue`, `task`, `step`, `files`, `status`, `updated` (UTC).

## Code

- Classic scripts sharing one global scope. Load order is in `index.html`; `tests/globals.test.js` enforces unique top-level names and that every script is linked.
- Keep it small: build what the issue asks for, nothing extra.
- No emojis anywhere (code, text, docs, commits).

## Tests

`CHROMIUM_PATH=$(ls /opt/pw-browsers/chromium_headless_shell-*/chrome-linux/headless_shell | tail -1) npm test` (about two minutes; the headless shell opens a page about a third faster than `/opt/pw-browsers/chromium`, which also works). Run the full suite before pushing. `npm run soak` runs the distribution checks (many seeds, a stated sample and tolerance) that are not in `npm test`; run it when you change pacing or pay.

## Skills

- `session-heartbeat`: the heartbeat steps, and what to do after a merged PR.
- `pr-body`: writing a pull request description.
- `balance-change`: pacing, pay, odds and other declared numbers.
- `player-facing-change`: scenes, screens and text the player reads.
- `issue-writing`: parent and child issue shapes, and sub-issue links.
- `roadmap-sync`: keeping ROADMAP.md in step with closed and new issues.

## Git

- Work on the branch named in the task. Open a PR only when asked.
- Commits and PR bodies follow the attribution lines the session gives.
