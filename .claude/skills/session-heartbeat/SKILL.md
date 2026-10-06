---
name: session-heartbeat
description: Use at the start of any Max Gravity task that will edit files, and at each later step. Reads, writes and closes .claude/heartbeat.json so two sessions never edit the same branch at once.
---

# Session heartbeat

The file is `.claude/heartbeat.json`. It is git-ignored. Never commit it.

1. **Read it before any edit.** If it is missing, go on. If `status` is `active`, `branch` is this branch and `updated` is within the last few minutes (UTC), stop and tell the user another session is live. Do not edit.
2. **Write it** when starting, with `date -u +%FT%TZ` for `updated`:
   `{"branch": "...", "issue": N, "task": "...", "step": "before edits", "files": [...], "status": "active", "updated": "..."}`
3. **Update `step` and `updated`** before edits, after tests pass, and after commit and push.
4. **Mark `status` as `done`** at the end, or `blocked` with the reason in `step` if you stop early.
5. **After a merged PR**, a branch must not be reused as it stands. Restart the same branch name from the latest default branch (`git fetch origin main && git checkout -B <branch> origin/main`), keeping any unmerged commits by rebasing them on top. Then write a fresh heartbeat.
