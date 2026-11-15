# Prototypes (temporary)

**Temporary.** These are throwaway spikes from the combat redesign brainstorm (November 2026). They are not part of the game:
nothing in `index.html` or `js/` loads them, no test covers them, and none of their code is meant to be reused. Delete this
folder once the combat specs they inform are written.

Each is one self-contained page. Open it in a desktop browser.

- `radar-spike.html`: the ship fight played on the radar. Real motion with a facing that turns 90 degrees a turn, projected
  tracks with closest approach and torpedo paths, fire control with honest error bands (accuracy and resilience upgrades,
  sensor condition), the PDC arc, and posts: the captain sets the intent, the gunner works the geometry, and pilot, engineer
  and comms carry it out with skill checks and make suggestions. Mode A plots on the radar; mode B gives the post's orders.
- `boarding-spike.html`: a corsair's marines boarding the Ice Hauler, fought spot by spot through her real decks (the
  layout in `js/layouts.js`). Two waves, breaching charges with their setters, hatches in the well, Hester's standing intent,
  one order a turn to a named crewmate, and every side's intent drawn before the turn is committed.
- `answer-spike.html`: the ship fight as threat and answer. Each turn she shows what she will do (arm, a salvo, a
  broadside at a named room, closing, a grapple, breaking off; a veteran may feint), each post answers with one action
  from its own list at the odds shown, the captain sets the stance, and hits land on the cutaway's rooms. Built to set
  beside `radar-spike.html`.

What each was asked to answer is on the page itself, under "What to judge".
