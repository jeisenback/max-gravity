---
name: roadmap-sync
description: Use when a Max Gravity change closes, opens or reorders an issue that ROADMAP.md names, or when asked to update the roadmap. Keeps the roadmap in step with the work in the same PR instead of in a catch-up commit.
---

# Roadmap sync

`ROADMAP.md` has a "Current focus" list and milestone lines. It has been brought in line with the issues in many separate catch-up commits. Make the update part of the PR that changes the facts.

1. **Heartbeat.** Follow the `session-heartbeat` skill.
2. **Before opening a PR,** search ROADMAP.md for the issue numbers the PR closes or touches (`grep -n "#NNN" ROADMAP.md`).
3. **If a closed issue is named:** change its line to done, with the PR number once it is known, and say what is still open under the same item.
4. **If a new issue belongs to a focus item:** add its number to that item. A new item needs the owner's approval; propose it instead of adding it.
5. **A plan or spec added under `docs/superpowers/`** is linked from the item it serves, by path.
6. **Never reorder** the focus list without the owner. Say in the PR what moved and why, and let them decide.
7. **Keep the line short.** State what is done and what is open, with issue numbers. No new design text; that belongs in the spec.
8. Commit it with the code in the same PR. If the PR does not change the roadmap's facts, leave the file alone.
