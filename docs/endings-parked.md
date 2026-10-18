# Four endings, parked for the game's close (#132, #449)

These four were written for #132, the game's ending framework, and first shipped as the close of chapter one. They are game endings, not chapter closes: the game goes on after the buy-in (chapter two is the owner's career, chapter three building a company, chapter four outposts). Chapter one now always closes on "Your Own Ship" and the recap (`chapterEnd` and `chapterRecap`, `js/hired.js`), which tell the losses and who came in a line each. These wait, whole, for the end of the last chapter, where each should read the record of the whole game, not the first 90 days; the thresholds below were chosen for chapter one and need choosing again.

The rules, as they were (`CHAPTER_ENDINGS` in `js/hired.js`, the first whose condition held, in this priority: loss, then the crew, then the quiet one):

| Ending | Group | When |
|---|---|---|
| The Memorial Wall | Loss | two or more of the people the player knew are on the memorial |
| The Empty Berths | Loss | nobody comes with the player (it fired whether the cause was loss or never having been close to anyone) |
| Ten Years, One Ship | Crew | someone who came was promised a place aboard when there was a ship (the `promised` flag, any companion, not only Tomas) |
| The Quiet Fortune | Quiet | no mark, no loss and no one benched, and 10,000 cr left after the ship is paid for (`QUIET_FORTUNE`) |

The other endings of #132's table (The Admiral's Table, The Rook's Crown, The Partner's Chair, The Hand That Stayed, The Drift, The Long Contract) and its ten parked ones are in the issue; The Outpost Charter belongs with the outposts chapter.

The lines, as they were (`scene:chapter-end` in `js/hiredscenes.js`; `{dead}`, `{waiting}`, `{promised}`, `{left}`, `{berths}` and `{aboard}` were filled from the record, `{old}`, `{days}`, `{savings}` and `{memorial}` as in the plain scene, and a line for one and a line for more where a verb follows):

```js
    'memorial-wall.title': 'The Memorial Wall',
    'memorial-wall.text': 'Beside the hatch you put up a strip of tape and write the names on it in marker, one under another: {dead}. They died on the way, and the tape is what you have to remember them by. {waiting} You came aboard the {old} {days} days ago with {savings} cr and a post to learn.',
    'memorial-wall.wait.one': '{names} waits at the foot of the ramp until you\'ve finished. They\'re sorry too.', 'memorial-wall.wait.many': '{names} wait at the foot of the ramp until you\'ve finished. They\'re sorry too.',
    'memorial-wall.alone': 'Nobody\'s waiting at the foot of the ramp.',
    'empty-berths.title': 'The Empty Berths',
    'empty-berths.text': 'Nobody comes up the ramp behind you, and nobody\'s waiting at the foot of it. The ship has {berths} berths and no one to put in them. You walk the length of the passage once. You came aboard the {old} {days} days ago with {savings} cr and a post to learn.{memorial}',
    'ten-years.title': 'Ten Years, One Ship',
    'ten-years.go.one': '{names} goes up the ramp ahead of you with a bag.', 'ten-years.go.many': '{names} go up the ramp ahead of you with their bags.',
    'ten-years.wait.one': '{promised} stops at the hatch and waits for you. You promised a place aboard when you had a ship, and here it is. They\'re glad to see it.', 'ten-years.wait.many': '{promised} stop at the hatch and wait for you. You promised a place aboard when you had a ship, and here it is. They\'re glad to see it.',
    'ten-years.count': 'You count the berths. The first bag goes in the first, and the next in the second, and you leave the other hatches open.{memorial}',
    'quiet-fortune.title': 'The Quiet Fortune',
    'quiet-fortune.text': 'The yard clerk reads the balance twice: the ship paid for, and {left} cr still in the account. {aboard}No one aboard carries a mark, and no name is on a wall. You came aboard the {old} {days} days ago with {savings} cr and a post to learn, and you leave with nobody lost. You take the ramp at a walk.',
    'quiet-fortune.aboard.one': '{names} is already aboard, stowing a bag.', 'quiet-fortune.aboard.many': '{names} are already aboard, stowing a bag.',
```

The code and its tests are in the history at the commit before the one that parked them (`git log -S CHAPTER_ENDINGS -- js/hired.js`).
