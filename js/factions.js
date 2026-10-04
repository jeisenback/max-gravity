'use strict';

// Faction standing (-100..100) with the Earth Coalition, Mars Republic, Belt Collective,
// and pirates, plus the faction patrols that enforce it. Loaded before game.js; only
// calls into it at runtime.

const isFaction = gov => FACTIONS.includes(gov);
const repOf = gov => G.state.rep[gov] || 0;

function standingWord(v) {
  return v >= 50 ? 'Honored' : v >= 15 ? 'Trusted' : v > -15 ? 'Neutral' : v > -50 ? 'Distrusted' : 'Hostile';
}

function changeRep(gov, amount) {
  if (!isFaction(gov) || !amount) return;
  const before = standingWord(repOf(gov));
  G.state.rep[gov] = Math.max(-100, Math.min(100, repOf(gov) + amount));
  const after = standingWord(repOf(gov));
  if (after !== before) msg(`Your standing with the ${gov === 'Pirate' ? 'pirates' : gov} is now ${after}.`);
  if (typeof crewReacts === 'function') crewReacts(gov, amount);  // what the crew make of it (ties.js)
  // Patrols turn on you once you are Distrusted.
  for (const n of G.npcs) if (n.kind === 'patrol' && n.gov === gov && repOf(gov) <= -15) n.hostile = true;
}

// Standing with whoever runs the local system (nothing in independent space).
const localGov = () => system().gov;

function fineFor(gov) {
  return 1000 * Math.ceil(-repOf(gov) / 10);
}

function blockadeWarning(n) {
  if (n.hailed) return;
  n.hailed = true;
  msg(`${n.name}: "Ceres is closed by order of the blockade. Turn back or be fired upon." (H to answer)`);
}

function patrolWarning(n) {
  if (n.hailed) return;
  n.hailed = true;
  msg(`${n.name}: "You are wanted in ${n.gov} space. Cut your drive and pay your fine." (H to answer)`);
}

function patrolHail(n) {
  const st = G.state, c = n.persona, captain = `Capt. ${c.first} ${c.last}`, gov = n.gov;
  const signOff = { label: 'Sign off', run: () => '"Fly safe."' };
  if (n.hostile) {
    const fine = fineFor(gov);
    return {
      title: n.name,
      text: `${captain}: "Your ship is flagged in ${gov} space. Pay ${fmt(fine)} cr in fines and we will clear your record, or we disable you and collect."`,
      choices: [
        { label: `Pay the fine (${fmt(fine)} cr)`, can: () => st.credits >= fine, run() {
          st.credits -= fine;
          st.rep[gov] = -10;
          for (const o of G.npcs) if (o.kind === 'patrol' && o.gov === gov) o.hostile = false;
          return `The fine clears. "Your record is clean, captain. Keep it that way."`;
        } },
        { label: 'Cut the channel', run: () => 'You cut the channel. They keep coming.' },
      ],
    };
  }
  const friendly = repOf(gov) >= 15;
  return {
    title: n.name,
    text: `${captain}: "${friendly ? 'Good to see you, captain. Clear skies out there.' : 'This is a patrol ship. Keep your transponder on and your guns cold.'}"`,
    choices: [
      { label: 'Any trouble out here?', can: () => !n.gossiped, run() {
        n.gossiped = true;
        const pirates = G.npcs.filter(o => o.kind === 'pirate' && o.hostile).length;
        return pirates ? `"We are tracking ${pirates} hostile contact${pirates > 1 ? 's' : ''} in local space. Stay close if you like."` : '"Quiet so far. Let us keep it that way."';
      } },
      signOff,
    ],
  };
}
