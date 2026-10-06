---
name: pr-body
description: Use when asked to open or write a pull request for Max Gravity. Gives the section layout, when to say Closes versus part of, and the facts that must be real.
---

# PR body

Open a PR only when the user asks. Check for a PR template first (`.github/pull_request_template.md`); if one exists, use its headings. Otherwise use this layout.

```
Closes #N.        or:   Part of #N, and what remains.

## What changes
- One bullet per behaviour, with the file or function it lives in.
- Decisions the issue left open, and which option was taken and why.
- Not covered: what a reader might assume is included and is not. File a follow-up issue for any real gap.

## Tests
Full suite passes (N of N). New test in tests/<file>.test.js: what it checks.
```

Rules:

- **Closes only when the issue is whole.** If any listed item is left, write "Part of" and name it.
- **Counts are real.** Quote the total from the last full run on this commit. If a step was skipped (soak, a screenshot, the suite), say so. Docs-only changes say "Not run: docs only".
- **Pacing or pay changes** carry the soak table from the `balance-change` skill.
- **Text the owner must approve** says so, and says whether it is drafted or approved.
- End with the attribution lines the session gives. No emojis.
