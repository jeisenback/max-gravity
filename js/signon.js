'use strict';

// The hired hand's opening scene, "Signing On": how you came to be crew on this ship, who you work beside, what the first
// week looks like, and one choice about why you signed on. There is a different story for each start background (the same
// three premises as the owner starts' intros), a closing paragraph for the post you chose, and the captain and the two main
// characters (cast.js) by name. The choice is small and permanent. Loaded after cast.js; only calls into the game at runtime.

// The background's opening paragraph and what each reason says. ctx: { ship, cap, adj, sys }.
const SIGN_ON = {
  earth: {
    text: c => (`Earth is crowded: thirty billion people, ten thousand applicants for every berth that flies, and the berths go to people with a ` +
        `cousin. You have no cousin. You have a trade, and a card you found pinned to the notice board at the arcology docks: HAND WANTED, ICE HAULER, ` +
        `DEPARTS WHEN FULL. ${c.ship}, an ice hauler out of ${c.sys}, took you for what you could do.${c.who}`),
    money: 'You work it out on the ramp, on your fingers: a wage a day, a share of every run, and no cousin needed. Ten thousand applicants, one berth.',
    learn: 'At the first bulkhead you stop and ask what the placard says, and someone tells you. By the end of the hour you have asked eleven more questions. Nobody has charged you for any of them.',
    away: 'You stow your bag and do not go back down the ramp. When the hatch closes, the arcology is one more speck among the habitat lights.',
  },
  mars: {
    text: c => (`You grew up under the domes of Tharsis, where everyone argues about the future, and the Republic's navy did not want you. You spent ` +
        `a winter learning how many ways a no can be worded. Then a freighter at Phobos Yards put out a call for a hand, and nobody asked about your ` +
        `politics, only whether you could stand a watch. ${c.ship}, an ice hauler out of ${c.sys}, is yours to work.${c.who}`),
    money: 'The Republic offered you a dome stipend. The freighter offers a wage and a share, in writing, and you read the page to the bottom before you sign.',
    learn: 'The navy would not teach you. On the first day you ask to see the coupling, and the engineer shows you, and then has you do it.',
    away: 'The domes will argue about the future without you. Aboard, nobody asks whose side you are on. The first thing anyone asks is whether you have eaten.',
  },
  belt: {
    text: c => (`You were born in the Ceres Warren, and you know what water is worth. A hand's share in a freighter that crosses to the inner system ` +
        `and back is not much, but it is a berth, and a berth is the one thing in the Belt that is truly yours. The Collective's dock office stamped ` +
        `the papers and wished you luck, in the tone of people who have wished a great many people luck. ${c.ship}, an ice hauler out of ${c.sys}, ` +
        `sails.${c.who}`),
    money: 'You count the wage twice and the share once. The Collective stamp is on the papers. Every credit of it goes into the savings line.',
    learn: 'Ceres taught you water and rock. You ask the crew how they cross to the inner system, and four people answer at once, each differently.',
    away: 'Ceres spins on behind you with its ice and its arguments. You lift a hand to it from the viewport, like a person on a dock.',
  },
};

// What the post you chose means for you.
const SIGN_POSTS = {
  pilot: cap => `You have the helm: ${cap} plots the run, and you fly it, by hand.`,
  gunner: () => 'You have the guns. When a contact closes, you choose how to meet her, and the move at the guns is yours alone.',
  engineer: () => 'You have the plant: the reactor\'s output, the heat and the wear are yours to watch, and yours to break.',
  comms: () => 'You have the bands: tips, hails and the inbox are yours. You are the ship\'s ear.',
};

const SIGN_LEARN_XP = 8, SIGN_SHARE_UP = 0.02;  // signing on for the money asks for two points more of the share

function signOnEvent() {
  const st = G.state, h = hired(), cap = st.people[h.captain], b = SIGN_ON[st.background] || SIGN_ON.earth;
  const ctx = { ship: shipTitle().replace(/^./, ch => ch.toUpperCase()),  // it starts a sentence
    cap: `Captain ${cap.first} ${cap.last}`, adj: TRAITS[cap.traits[0]].adj, sys: system().name };
  // Who the captain is: their own introduction, or, for a generated captain, a clause on how the crew describe them.
  const d = captainEntry();
  ctx.who = d && d.intro ? ` ${d.intro(h.wage, Math.round(h.share * 100))}` : ` ${ctx.cap}, whom the crew describe as ${ctx.adj}, signed the papers.`;
  const pair = st.crew.map(person).filter(c => c && c.cast);
  const postKey = c => Object.keys(POSTS).find(k => POSTS[k].role === c.role);
  // A first officer holds no post.
  const who = c => (postKey(c) ? `${fullName(c)}, ${c.job} from ${c.home}, on the ${POSTS[postKey(c)].name.toLowerCase()} post` : `${fullName(c)}, the ${ROLE_NAMES[c.role].toLowerCase()}, from ${c.home}`);
  // A first officer who walks you round the ship on the first burn (cato.js) does the introducing there.
  const beside = pair.length && !(d && CAST[d.xo] && CAST[d.xo].round) ? ` Working beside you: ${pair.map(who).join(', and ')}.` : '';
  const pay = d && d.intro ? '' : `You are paid ${h.wage} a day and ${Math.round(h.share * 100)} percent of what she clears. `;  // a captain with their own words has said it
  const week = `${ctx.cap} picks each run and buys the cargo from the ship's funds. ${scopeOff('errands') ? '' : 'Errands for wherever she is going come through the port, and the captain keeps a fifth. '}${pay}`.trim();
  const event = {
    title: 'Signing On',
    text: [b.text(ctx), ...(st.carried ? [st.carried] : []), `${SIGN_POSTS[h.post](ctx.cap)}${beside}`, `${week} Why did you sign on?`].join('</p><p>'),
    choices: [
      { label: 'For the money', run() { h.share = +(h.share + SIGN_SHARE_UP).toFixed(3); h.reason = 'money'; return b.money; } },
      { label: 'To learn the work', run() { gainSkill(h.post, SIGN_LEARN_XP); h.reason = 'learn'; return b.learn; } },
      { label: 'To be somewhere else', run() { like(cap, 1, 'You came aboard easy to get along with.'); for (const c of pair) like(c, 1, 'You came aboard easy to get along with.'); h.reason = 'away'; return b.away; } },
    ],
  };
  // The game was saved at the first landing, before this choice: save again, so quitting before the next dock keeps what it did.
  event.choices = event.choices.map(c => ({ ...c, run() { const text = c.run(); st.carried = null; save(); return text; } }));
  return event;
}
