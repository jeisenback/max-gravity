# The hand's papers: minors from the review (#1258)

Status: approved by the owner, 2026-11-15. Follows the papers (#1251, `2026-11-14-papers-design.md`).

## Intent

Five polish points the whole-branch review of #1251 found. None changes what the player chooses; each makes what they see read as the words say or behave as the spec says.

## Goals

1. The inspector's "we had your name" line comes before the junior has the manifest up, as its words say.
2. The line shows once per berth, whether or not the fine was paid and whatever fine came first.
3. The sign-on reaches the warm shipmate by id, not by searching memory text.
4. In the full build, a hand who switched from owner mode starts at Earth, not at the background last clicked for an owner.
5. In the narrow build, the form's headings read in order: no "Your post" heading over a hint alone.

## Non-goals

A hand's start at Mars or Ceres (#1252); showing the start row for a hand in the full build (the spec hides it); the voice notes (#1259); whether who-knows-the-name lands again for a hand put ashore (#1260, left as it is: it does).

## Approaches

- Once: a flag `h.origin.told`, set when the line shows and cleared by `applyPapers` at each sign-on, so a hand put ashore meets it once more where the fine lands again. Set aside: a counter on `h.record` (the record is counts, read by `recordWords`); keeping `fines === 1` (the two edge cases in the goal).
- Shipmate: `applyPapers` keeps the warmed mate's id as `h.origin.mate` (absent when nobody was warmed); `signOnEvent` reads the person by id, falling back to "Someone aboard" as now. Set aside: the memory-text search (works, but couples the scene to the words); returning the id from `applyPapers` (the sign-on runs at the first landing, so it must be kept somewhere, and the papers' own record is the place).
- Inspector's line: the `text` line takes a `{known}` slot between the official's arrival and the causes. Set aside: rewording the line to the moment after (the moment before is the better one).
- Full-build start: the `menuMode` action resets `background` to `earth` when the mode becomes hired. Set aside: showing the row (spec).
- Narrow heading: the narrow build drops the heading over the hint; the hint sits under the name field. Set aside: renaming it "How you start" (one start, nothing to head).

## Decided

`h.origin` holds the three answers and what came of them (`mate`, `told`); it is carried by `careerOf` and by a hand put ashore as before. The inspector pin is re-pinned and the diff read. Tests sit beside the existing ones in `tests/inspection.test.js`, `tests/signon.test.js`, `tests/hired.test.js` and `tests/menu.test.js`.

## Left to the builder

The exact test assertions; whether the `{known}` slot carries its own trailing space or the join does.
