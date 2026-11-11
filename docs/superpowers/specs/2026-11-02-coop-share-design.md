# The chapter's goal: a member's share in a Belt co-op ship (#882, scope A)

Status: built (#882).

## Goal

Replace the hired chapter's goal, buying the used Ore Runner, with the bible's: a member's share in a Belt co-op ship (conflict 5 in `docs/bible/README.md`). This removes the #879 stopgap. Chapter two on a co-op ship is a later issue.

## Decisions (the owner's, 2026-11-02)

1. **Scope A.** This issue covers the bible's co-op, and chapter one's goal and close. Chapter two on a co-op ship is its own issue, after this one. Play stops at a clear end of chapter one until then.
2. **The co-op is at Ceres.** It works out of Ceres Station, as Cato's scene already says. The station belongs to the Charter League in the code. The bible says "the station's owner", so conflict 9 (the factions) can rename the League without touching the co-op.
3. **The same Ore Runner.** The co-op is buying the hull Tomas rebuilt three times: the one on the apron with her name painted over, and the question mark in Cato's notebook. The spine stays.
4. **A buy-in, with the rest owed.** The chapter's goal is the buy-in. The rest of the share is owed to the co-op's lender, and is paid from a member's earnings in chapter two.
5. **The members vote, and Tomas speaks for you.** There are three buy-ins, set by how Tomas thinks of you, as the three prices are set now. Without Tomas, the co-op's office quotes the high one.
6. **Cato signs on with you** if he is aboard and alive, whatever he thinks of you. How he thinks of you changes how the close reads. The main characters who like you sign on too, or, failing them, the crew member you are closest to.
7. **The chapter ends.** After the close and the look-back, an end-of-chapter screen offers a new game or a saved one. A finished save reopens on it. Nothing of the owner game follows in the shipped build.
8. **The share is signed at Ceres only.** Once the hand holds the buy-in, the captain's planner heads for Ceres. Other yards show the co-op's notice.
9. **The factions are not planned here.** They are conflict 9, a project of their own.

## The co-op (the bible)

A new page, `docs/bible/ceres-coop.md`, reviewed by the owner before any code is written:

- **What it is.** A crew co-op working out of Ceres Station. Its members crew its hulls, share in what the hulls earn after the loan and running costs, and vote on who joins. Most members are ratings who saved for years. The page proposes the co-op's name for approval.
- **Who it owes.** A finance house lent it the money for its hulls. In a bad year the lender sets the terms (`jurisdictions.md`).
- **Where it stands.** It rents its office and a berth in the yard from the station's owner, like everyone else who works there.
- **The Ore Runner.** The co-op is buying her for 190,000, most of it borrowed. She has five berths, so she takes five members.
- **A member's share.**
  - The full share is 150,000: a fifth of the hull, of her refit, and of the loan's cost.
  - The buy-in is 51,000, 57,000 or 63,000, by the vote (decision 5).
  - The rest is owed, about 93,000 at the middle figure.
- **Cato** has watched this co-op's ships for years, and his notebook has the price of a share written each year since.
- **Assumptions to confirm**, as on every bible page.

Also:
- `jurisdictions.md` points to the new page from its co-ops line.
- `docs/bible/README.md` marks conflict 5 resolved.
- `docs/bible/people/cato.md`'s "What he wants" names the Ceres co-op and the Ore Runner.

## The figures (`js/hired.js`)

- `STOPGAP_FACTOR` goes, and the figures are written as they are:
  - `SHARE_PRICE = 150000`;
  - `BUY_IN = { good: 51000, mid: 57000, bad: 63000 }`, in place of `USED_PRICE`;
  - `HIRED_TARGET = BUY_IN.mid`;
  - the offer comes at 55% of `BUY_IN.mid`, as now.
- `HIRED_DEBT` stays 9,000: the hall's bond, a rating's recruitment debt. Its comment no longer calls it a stopgap.
- The figures are unchanged, so the chapter's length moves only by the Ceres-only signing, which the soak checks.

## Chapter one

### The spine

- Tomas walks past the hull on the apron from the second run, as now (`hullNote`).
- **The offer** (`dealScene`):
  - It comes as now: at a port with a yard, when the savings reach 55% of the middle buy-in, after the captain's two scenes.
  - Tomas tells you the Ceres co-op has bought her and is taking members, and that he will speak for you.
  - Without Tomas, the co-op's call is posted at the yard office.
  - The buy-in is quoted, with the full share and the days the offer stays open. The 84 days stand unless the soak shows careful hands missing it.
- **The lapse** (`lapseScene`): the berths have been filled. Tomas or the yard office says so.

### The office at Ceres (`buyInHtml`, the planner)

- At Ceres the yard page is the co-op's membership office. Its one row shows:
  - the buy-in;
  - the full share;
  - what will still be owed;
  - who signs on with you.
- The button reads "Sign on". The confirm reads "Yes, sign and leave".
- The hall's bond still blocks signing while anything is owed.
- At any other yard, the page shows the co-op's notice and "signed at Ceres", with no button.
- The yard's own ships leave the hand's page, and so does the help's line naming the Dust Skiff.
- The yard office scene (`yardoffice.js`: haggle, inspect) does not open for the share, since the vote sets the buy-in. It stays for the full build's ships.
- **The planner** (`wantsYard` and the light run to a yard) heads for Ceres, not the nearest yard, once the hand holds the buy-in or the offer is open.

### Signing (`buyIn` becomes `signOn`)

- The savings drop by the buy-in.
- The hand leaves Hester's ship for the co-op's Ore Runner, with those who sign on (decision 6).
- Hester keeps her ship, her fund and the rest of her crew. She stays a contact, as now.
- The career record (`st.career`) keeps:
  - the share (`{ coop, buyIn, owed }`);
  - who came;
  - the day;
  - the sheet, kit and shippers' regard, as now.
- `st.hired` is cleared, as now. The hand is not an owner: no ship of their own, and no fund.

### The close (`chapterEnd`, `chapterRecap`)

- "Your Own Ship" becomes "A Member's Share", at the foot of the Ore Runner's ramp at Ceres.
- It names who signed on, Cato first, with a line that reads by how he thinks of you. It also says what is still owed.
- The look-back plays as now. Its money line says the share, not the ship.
- **The end-of-chapter screen** follows: chapter two is to come, with a new game or a saved one.
  - The save is marked finished on `st.career` (`finished: true`), so the mark is in the save.
  - A finished save reopens on the screen.
- `js/chaptertwo.js` is left as it is, for the full build and the next issue.

### Text that follows

These say a member's share where they say a ship now:
- Cato's notebook scene and his farewell fact (`js/captains/cato.js`);
- the help's "a ship of your own" topic (`js/help.js`);
- the goal line;
- the look-back's money line;
- `peopletext.js`'s co-op terms line.

The words go in their line tables (`sceneSay`), following `docs/bible/voice.md`.

## Tests

- **New:**
  - The buy-in follows Tomas's regard, and the office quotes the high one without him.
  - Signing at Ceres only: other yards show the notice and have no button.
  - Who signs on: Cato, aboard and alive, whatever he thinks of you; the main characters who like you; else the closest crew member.
  - The close names Cato first and says what is owed.
  - The end screen follows, and a finished save reopens on it.
- **Changed:** `usedship`, `chapter`, `yardoffice` and `captains` tests move to the share and to Ceres. The full build's owner tests stay behind their gate.
- **Pins and goldens** are written again, and every diff is read.
- **The soak:** `node tools/soak.js --seeds 1,2,3,4,5,6 --legs 40 --captain hester` against 17.7 runs and 144 days, then `npm run soak`. If the length moves, the first things to tune are the 84 days and the planner heading for Ceres.
- `npm test`, `npm run test:editor`, `npm run coverage -- --check`.

## Out of scope

- Chapter two on a co-op ship (its own issue).
- The factions (conflict 9).
- The ice runs (conflict 4).
- The full build's other captains and the owner game.
