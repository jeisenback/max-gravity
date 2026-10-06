---
name: player-facing-change
description: Use when a Max Gravity change alters a scene, screen, dialog, message or any text the player reads, especially for a hired hand. Covers viewports, old saves, escaping, prose style and follow-up issues.
---

# Player-facing change

1. **Heartbeat.** Follow the `session-heartbeat` skill.
2. **Test first**, in the file for that area (`tests/handscreens.test.js` for hired-hand screens). Watch it fail.
3. **Viewports.** A screen change is tested at both 1280 by 800 and 390 by 844 (`open({ viewport, mobile: true })` in `tests/helpers.js`). Check that the thing is in view, not only in the DOM. Look at a screenshot at both widths when layout changed.
4. **Old saves.** A new field on the state or a hand's record must load from `tests/fixtures/*.json` and from a save without it, and behave as before.
5. **Escape.** Any player-typed name that reaches scene text, news or a template goes through the existing escape (#251). Read the shown text through the DOM in tests, not a tag-stripping regex.
6. **Shut, not hidden.** Where something is unavailable to a hand, either it is not drawn at all, or it is drawn shut with its reason as visible text. Not greyed with no reason.
7. **Prose.** New text follows `docs/prose-style.md`. Count the tics in the diff (a little, nods, as if, for a while, somehow, and then). Text for scenes and captains is the owner's: say in the PR whether it is drafted or approved.
8. **Scope.** Build what the issue asks. Gaps you find go in a new issue and a "Not covered" line in the PR, not in this change.
9. **Globals.** A new top-level name must be unique across scripts (`tests/globals.test.js`).
10. Run the full suite, then use the `pr-body` skill if a PR is wanted.
