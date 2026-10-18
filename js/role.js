'use strict';

// The role (#685, #575): what the player may trade, decide and pay for. The game is played in one of two roles, the hired hand's (a hand on the captain's ship, st.hired) and the
// owner's (the captain of a ship of their own, which chapter two returns to), and the places where the two meet ask the role instead of asking whether there is a hand. Each role
// is an object with the same four answers: which tabs it may open (mayTab) and which actions it may take (mayAct), whether the call on a road event is the player's (decides),
// and whose money a road event spends (paysFrom). roleOf takes the hand's record (or null) and returns the role, so it runs in plain Node (tests/role.test.js); role() reads
// the save. A new check is written as a question here, and not as a new `hired()` in the middle of the code that asks it. Loaded after hired.js; only called into at runtime.

// What stays the captain's to do: the cargo, the ship itself, the company. (Contracts are the captain's too, but the board still has errands.)
const OWNER_TABS = ['trade', 'company'];
const OWNER_ACTIONS = ['takeoff', 'buy', 'buymax', 'sell', 'sellall', 'buyship', 'cbuy', 'refuel', 'repair', 'overhaul', 'buyout', 'sellout', 'torpbuy', 'hire', 'interviewHire', 'dismiss'];

const ROLES = {
  // A hand: the trade, the ship and the company are not theirs, a road event is theirs to decide only if it is their own affair or their post's, and the money it spends is the ship's fund.
  hand: {
    id: 'hand',
    canTrade: false,
    mayTab: id => !OWNER_TABS.includes(id),
    mayAct: action => !OWNER_ACTIONS.includes(action),
    // The call on an event is the player's if the event says so ('you'), or it is the call of the post they work. The rest are the captain's or the first officer's (hired.js hiredCall).
    decides: (ev, post) => { const owner = ev.owner || (ev.via === 'ship' ? 'captain' : 'you'); return owner === 'you' || owner === post; },
    paysFrom: () => 'fund',
    canDie: true,  // a fight can end the hand's story (stakes.js)
  },
  // An owner: everything is theirs, and the money is their own.
  owner: {
    id: 'owner',
    canTrade: true,
    mayTab: () => true,
    mayAct: () => true,
    decides: () => true,
    paysFrom: () => 'credits',
    canDie: false,  // the owner is hurt and laid up, and the game goes on
  },
};

const roleOf = hand => (hand ? ROLES.hand : ROLES.owner);
const role = () => roleOf(hired());
