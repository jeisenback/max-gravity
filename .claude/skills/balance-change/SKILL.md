---
name: balance-change
description: Use when a change touches pacing, pay, debt, odds, opinion points or any declared number in Max Gravity (js/hired.js, js/engagements.js, js/icerun.js, js/hiredevents.js, js/captains.js). Covers measuring before and after, the tolerance, and the test that pins the result.
---

# Balance change

1. **Heartbeat.** Follow the `session-heartbeat` skill.
2. **Measure before.** Run the tool that fits and keep its output:
   - Pacing, pay, debt: `node tools/soak.js --seeds 1,2,3,4,5,6,7,8,9,10 --legs 40 --captain <name>` for each captain.
   - Odds and risk of a declared choice: `node tools/audit-risk.js`.
3. **State the target.** Name the number the change aims at and the tolerance (the soak uses a mean of about 15 runs and pay per day within 15 percent across captains; risk uses a bold option within 15 percent of the best safe one). If the issue gives none, ask.
4. **Test first.** Write the test that pins the target (`tests/risk.test.js` is the model) and watch it fail on the old numbers.
5. **Change declared numbers only.** Odds, edges, shares, debts. Do not add a system to reach the target.
6. **Measure after.** Re-run step 2 with the same seeds. Run `npm run soak` for the distribution checks, which are not in `npm test`.
7. **Full suite.** `CHROMIUM_PATH=$(ls /opt/pw-browsers/chromium_headless_shell-*/chrome-linux/headless_shell | tail -1) npm test`.
8. **Report** in the PR: a before and after table (choice or captain, runs mean and range, days, pay per day), the sample (seeds, legs), the tolerance, and which single number the owner should change if they want a different result. Say what was deliberately left alone and why.
