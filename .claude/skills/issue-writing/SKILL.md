---
name: issue-writing
description: Use when asked to write or split a GitHub issue for Max Gravity. Gives the shape of a child issue and of a parent, and how to link them.
---

# Issue writing

Search first (`search_issues`) so you do not duplicate one. Keep an issue to one behaviour a single PR can finish. If the work is bigger, write a parent and children.

## Child issue

```
## What
One paragraph: the change, and the file or plan it comes from.

## Scope
- Bullets in the code's terms: file, function, table, text shown.
- Tests: what each new test checks.

## Out of scope
What a reader might assume is included, and where it is tracked.

## Depends on
Issues or steps that must land first, or "nothing".

## Done when
- The named tests pass, `tests/globals.test.js` passes, and the full suite passes. No emojis.

Parent: #N. Related: #A, #B.
```

## Parent issue

```
## Goal
What the player or designer can do when all children are closed.

## What exists, and what does not
Facts read from the code, with paths.

## The stories (or steps)
Numbered, one line each, matching the children.

## Settled so far
Decisions already made, marked as the owner's to change.

## Open questions
Each with the option you would take. Do not build past one.

## Done when
All children closed, and the observable result.
```

Rules:

- **Link children to the parent** as sub-issues (`sub_issue_write`), not only by a number in the text. Title children "<Parent name> story N: ..." or "step N, task M: ...".
- **A follow-up says what it follows:** "(follow-up to #NNN)" in the title, and the gap that was left in the "Not covered" line of that PR.
- **Spike before plan, plan before build** when the approach is unknown. Say which this is in the title.
- **Text for the player** is marked drafted or approved, and the owner approves it.
- No labels are used in this repo. Do not add them.
- No emojis.
