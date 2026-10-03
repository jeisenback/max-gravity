'use strict';

// In-game help: a Help page in the menu (title screen and pause) with a topic for each
// system, and one-time tips the first time a player meets a new one. Tips seen are
// remembered in this browser. A topic can be hidden in the narrow build (`off`: the SCOPE_OFF feature it describes), can have its
// own text for a hired hand (`hand`, shown whenever the build is narrow, since everyone is one), and can be for a hired hand
// only (`handOnly`). Loaded before game.js; only calls into it at runtime.

const HELP = [
  { id: 'hand', title: 'Your post, your pay and a ship of your own', handOnly: true, text: () => [
    `You sign on to a captain's ship and work one post: the pilot's helm, the guns, the engineer's plant, or the comms. The post is yours to work by hand; the rest of the crew hold the others. The captain picks every run and buys the cargo from the ship's funds. You press Sail, and on arrival you are paid a wage for each day and a share of the run's profit. Your savings are your own.`,
    `A first officer runs the watch: they decide who moves to which post, and the crew-side calls on the road. The captain keeps money and ship matters. You have an opinion with each of them, and the two can differ.`,
    `Save toward a ship of your own. When your savings reach ${fmt(USED_OFFER_AT)} cr at a port with a yard, Tomas, if he is aboard, shows you a used Ore Runner he rebuilt three times: ${fmt(USED_PRICE.good)} cr if he thinks well of you, ${fmt(USED_PRICE.mid)} in the middle, ${fmt(USED_PRICE.bad)} if he does not. The offer lasts ${DEAL_DAYS / 7} weeks. With no Tomas, a broker offers her at ${fmt(USED_PRICE.bad)}. The yard's own ships stay on the list, and the Rock Hopper is the cheapest.`,
    'Buying a ship ends your time as a hand. The crew who like you come with you, and the captain says goodbye at the foot of the ramp.' ] },
  { id: 'trading', title: 'Trading and markets', hand: [
    'The captain trades. Each run is the best cargo and port within reach, bought from the ship\'s funds; the Port tab shows the plan, the funds and your savings. When you press Sail, the captain buys the cargo and the ship leaves. On arrival it is sold, and your wage and share are paid.',
    'Markets have real stock. A big hold moves a price when it is bought or sold, and stations use up what they import and pile up what they export. A raided port runs short, which is a chance for a bold captain.' ], text: [
    'Buy where a good is cheap and sell where it is dear. The Exchange tab shows each good\'s price here and the best market within one tank of reaction mass.',
    'Markets have real stock. Buying pushes a price up and selling pushes it down, so a big hold has to spread its trade around. Stations use up what they import and pile up what they export; NPC haulers carry goods between them.',
    'The Port tab\'s conditions show shortages and gluts, and how much is on its way. Pirate raids keep haulers away, so raided stations run short: a chance for a bold trader.' ] },
  { id: 'travel', title: 'Travel and burns', hand: [
    'The captain picks each run. Press Sail, and the ship burns to the midpoint, flips, and decelerates. If you hold the pilot\'s post, you fly her. Everything orbits at its real period, so travel times change over the months.',
    'Things happen along the way: distress calls, rumors, crew moments, the captain\'s and the first officer\'s own scenes. Time stops while you decide.' ], text: [
    'Open the system map (M), pick a destination, and start the burn (J) once you are clear of the port. Everything orbits at its real period, so travel times change over the months; the map shows the best upcoming window.',
    'A burn accelerates to the midpoint, flips, and decelerates. Things happen along the way: distress calls, rumors, crew moments, passengers\' stories. Time stops while you decide.' ] },
  { id: 'combat', title: 'Fights during burns', text: [
    'Pirates, navy patrols that want you, bounty targets, and hired guns can intercept you mid-burn, more often on dangerous lanes. You can fight, burn hard to run, or pay them off.',
    'The fight is a card duel on the console. The ship with the initiative plays a threat, the other an answer. PDCs stop torpedoes, evasive burns stop gun runs, and crew at the locks stop boarders. A stopped threat passes the initiative.',
    'Your cards come from your ship: torpedoes, point-defense cannons, guns, pilot, power, and crew. A beaten pirate drifts, disabled, and can be boarded.' ] },
  { id: 'crew', title: 'Crew and relationships', hand: [
    'You work one post, and the rest of the crew hold the others. A first officer runs the watch and decides post swaps. Each role has a perk: engineers save reaction mass, pilots shorten burns, gunners add a gun, quartermasters hear rumors, slicers spoof transponders, medics heal.',
    'People aboard have feelings about you and about each other. Shared tastes bring them together; clashing habits pull them apart. Downtime activities build bonds, and a day of work at your post is experience.',
    'Sit with someone during downtime to learn their story over several talks. Letters from home arrive at ports, and a crew member having a hard time works one skill lower until someone helps. A hurt or dead crew member is marked on the crew screen, and the dead are remembered there. When you buy a ship, the crew who like you come with you.' ], text: [
    'Hire crew in the Bar or the Crew tab. Each role has a perk: engineers save reaction mass, pilots shorten burns, gunners add a gun, quartermasters hear rumors, slicers spoof transponders, medics heal.',
    'People aboard have feelings about you and about each other. Shared tastes (a favorite kind of vid or book, a ring-ball team) bring them together; clashing habits pull them apart. Downtime activities build bonds.',
    'Sit with someone during downtime to learn their story over several talks. A crew member may ask a favor; keeping it makes them loyal for good. Letters from home arrive at ports, and a crew member having a hard time works one skill lower until someone helps.' ] },
  { id: 'company', title: 'Your company', off: 'owner', text: [
    'Buy extra ships at a shipyard for your company. Each comes with a captain and runs a trade route while you fly, or flies with you as an escort.',
    'Buy stakes in a port\'s business from the Port tab. They pay a daily share that rises with booms and falls with raids and war.' ] },
  { id: 'outpost', title: 'Your outpost', off: 'owner', text: [
    'Claim Callisto at Ganymede, or Nereid at Triton Outpost, and build a habitat ring. Keep the settlers supplied with food, water, medical supplies, and electronics from your hold.',
    'Supplied, the outpost grows and pays you every day; short of anything, settlers leave. Buildings make it self-sufficient, add housing, and open services.' ] },
  { id: 'world', title: 'Factions, raids, and war', hand: [
    'The Earth Coalition, Mars Republic, and Belt Collective each have an economy that booms and slumps. Tension between them can boil over into war.',
    'Your standing with each faction opens (or closes) their shipyards and outfitters, which matters when you come to buy a ship. Pirates remember you too.' ], text: [
    'The Earth Coalition, Mars Republic, and Belt Collective each have an economy that booms and slumps. Tension between them can boil over into war, and the side you help remembers it.',
    'Your standing with each faction opens (or closes) their shipyards, outfitters, and missions. Pirates remember you too.' ] },
  { id: 'story', title: 'Story and campaigns', off: 'storylines', text: [
    'Cold Water, the main story, begins with a derelict on one of your early burns. Three rival careers (a Mars Navy commission, a pirate lord\'s rise, and a corporate climb) exclude each other, and a Belt haulers\' strike can draw you in.',
    'The Port tab shows your current objective and your journal.' ] },
  { id: 'legacy', title: 'Death and legacy', off: 'owner', text: [
    'If your ship is destroyed, you can go on as your heir, who inherits the company, its ships, stakes, and outpost, and half of everything else. You can also retire from the Company tab.' ] },
  { id: 'saves', title: 'Saving', text: [
    'The game saves itself every time you dock, to the slot you chose. The Menu (Esc, or the Menu button) has Save, Load, and Settings. Export a save as a file or code to keep a backup or move it to another device.' ] },
];

// What a player sees: the topics this build has, and a topic's text for who they are.
const helpTopics = () => HELP.filter(h => !(h.off && scopeOff(h.off)) && !(h.handOnly && !scopeNarrow() && !hired()));
const helpText = h => { const t = h.hand && (scopeNarrow() || hired()) ? h.hand : h.text; return typeof t === 'function' ? t() : t; };

// One-time tips: a key, a condition checked each frame, and how to show it.
const TIPS = [
  { id: 'burn', when: () => G.mode === 'transit', show: () => comm(`[Tip] During a burn, press Spend some downtime to ${hired() ? 'practice your post, share a meal, learn from a shipmate' : 'cook, drill'}, watch the hit vid, or sit with someone. Esc pauses. (Help is in the menu.)`) },
  { id: 'claim', when: () => !scopeOff('owner') && G.mode === 'landed' && ['Ganymede', 'Triton Outpost'].includes(G.state.planet) && !G.state.outpost, show: () => UI.notes.push('Tip: you can found your own outpost from here. See the claim at the top of this page, and the Help in the menu.') },
  { id: 'bar', when: () => G.mode === 'landed' && G.state.day >= 3, show: () => UI.notes.push(hired() ? 'Tip: every port has a Bar. Talk to people there for rumors and news.' : 'Tip: every port has a Bar. Talk to people there for rumors, passengers, and crew.') },
];

const Help = {
  seen: store.get('maxGravity.tips', {}),
  tipTick() {
    if (!G.state || G.paused || G.dialog) return;
    for (const t of TIPS) {
      if (this.seen[t.id] || !t.when()) continue;
      this.seen[t.id] = true;
      store.set('maxGravity.tips', this.seen);
      t.show();
      if (G.mode === 'landed') UI.render();
      return;
    }
  },
};

Mods.register({
  id: 'help', name: 'Help', builtin: true,
  init(M) {
    M.on('frame', () => Help.tipTick());
  },
});
