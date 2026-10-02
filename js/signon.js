'use strict';

// The hired hand's opening scene, "Signing On": how you came to be crew on this ship, who you work beside, what the first
// week looks like, and one choice about why you signed on. There is a different story for each start background (the same
// three premises as the owner starts' intros), a closing paragraph for the post you chose, and the captain and the two main
// characters (cast.js) by name. The choice is small and permanent. Loaded after cast.js; only calls into the game at runtime.

// The background's opening paragraph and what each reason says. ctx: { ship, cap, adj, sys }.
const SIGN_ON = {
  earth: {
    text: c => `Earth is crowded: thirty billion people, ten thousand applicants for every berth that flies, and the berths go to people with a cousin. You have no cousin. You have a trade, and a card you found pinned to the notice board at the arcology docks: HAND WANTED, LIGHT FREIGHTER, DEPARTS WHEN FULL. ${c.ship}, a light freighter out of ${c.sys}, took you for what you could do. ${c.cap}, whom the crew describe as ${c.adj}, signed the papers without looking up.`,
    money: 'You tell yourself it is the wage, and it mostly is. Ten thousand applicants, one berth, and a share of every run: that is better arithmetic than the arcology ever offered you.',
    learn: 'You tell yourself you are here for the work, and you are. A berth on a working ship teaches more in a month than an arcology course does in a year, and nobody asks you to pay for it.',
    away: 'You tell yourself you are only passing through, and the arcology shrinks behind you into one more bright speck among the habitat lights. You do not look back for long.',
  },
  mars: {
    text: c => `You grew up under the domes of Tharsis, where everyone argues about the future, and the Republic's navy did not want you. You spent a winter learning how many ways a no can be worded. Then a freighter at Phobos Yards put out a call for a hand, and nobody asked about your politics, only whether you could stand a watch. ${c.ship}, a light freighter out of ${c.sys}, is yours to work, under ${c.cap}, whom the crew describe as ${c.adj}.`,
    money: 'The Republic would not pay you what a dome-trained hand is worth, so the freighter will: a wage, and a share. The domes taught you to count, at least.',
    learn: 'The navy would not teach you, so you will teach yourself, aboard something that actually leaves the ground. You came for a trade, and you mean to get one.',
    away: 'The domes will argue about the future without you for a while. You find, to your surprise, that you can bear it, and a freighter, which does not care whose side you are on, is a relief.',
  },
  belt: {
    text: c => `You were born in the Ceres spin, and you know what water is worth. A hand's share in a freighter that crosses to the inner system and back is not much, but it is a berth, and a berth is the one thing in the Belt that is truly yours. The Collective's dock office stamped the papers and wished you luck, in the tone of people who have wished a great many people luck. ${c.ship}, a light freighter out of ${c.sys}, sails under ${c.cap}, whom the crew describe as ${c.adj}.`,
    money: 'A hand\'s share, a wage, and a Collective stamp on the papers: for a Belter that is real money, and you mean to keep every credit of it.',
    learn: 'Ceres taught you water and rock. The inner system is a different trade, and you mean to learn it from people who have crossed it a hundred times.',
    away: 'Ceres spins on behind you with its ice and its arguments. You wave to it, a little, like a person on a dock, and mean it.',
  },
};

// What the post you chose means for you.
const SIGN_POSTS = {
  pilot: cap => `You have the helm: ${cap} plots the run, and you fly it, by hand.`,
  gunner: () => 'You have the guns: when a contact closes, the cards are yours, threats and answers, played as you judge.',
  engineer: () => 'You have the plant: the reactor\'s output, the heat and the wear are yours to watch, and yours to break.',
  comms: () => 'You have the bands: tips, hails and the inbox are yours. You are the ship\'s ear.',
};

const SIGN_LEARN_XP = 8, SIGN_SHARE = 0.12;

function signOnEvent() {
  const st = G.state, h = hired(), cap = st.people[h.captain], b = SIGN_ON[st.background] || SIGN_ON.earth;
  const ctx = { ship: shipTitle().replace(/^./, ch => ch.toUpperCase()),  // it starts a sentence
    cap: `Captain ${cap.first} ${cap.last}`, adj: TRAITS[cap.traits[0]].adj, sys: system().name };
  const pair = st.crew.map(person).filter(c => c && c.cast);
  const postName = c => POSTS[Object.keys(POSTS).find(k => POSTS[k].role === c.role)].name.toLowerCase();
  const beside = pair.length ? ` Working beside you: ${pair.map(c => `${fullName(c)}, ${c.job} from ${c.home}, on the ${postName(c)} post`).join(', and ')}.` : '';
  const week = `${ctx.cap} picks each run and buys the cargo from the ship's funds; when you are ready, press Sail. ${scopeOff('errands') ? '' : 'Errands for wherever she is going turn up on the Missions board, and the captain keeps a fifth. '}You are paid a wage and a share of the profit on arrival, and you have ${HIRED_SAVINGS} credits to your name. Save toward a ship of your own.`;
  return {
    title: 'Signing On',
    text: [b.text(ctx), `${SIGN_POSTS[h.post](ctx.cap)}${beside}`, `${week} Why did you sign on?`].join('</p><p>'),
    choices: [
      { label: 'For the money', run() { h.share = SIGN_SHARE; h.reason = 'money'; return b.money; } },
      { label: 'To learn the work', run() { gainSkill(h.post, SIGN_LEARN_XP); h.reason = 'learn'; return b.learn; } },
      { label: 'To be somewhere else', run() { like(cap, 1, 'You came aboard easy to get along with.'); for (const c of pair) like(c, 1, 'You came aboard easy to get along with.'); h.reason = 'away'; return b.away; } },
    ],
  };
}
