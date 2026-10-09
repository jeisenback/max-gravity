'use strict';

// What you can talk about at a table. Each person offers a few topics from a larger pool, chosen by who they are (their traits,
// goal, job and secret) and rotated so the same person does not offer the same things twice running. How a topic lands depends on
// them too: `barReact` reads their traits against what the topic loves and hates, and the result is how much they warm to you,
// a line in their own voice, and sometimes more (a rumor passed on, a skill learned, a secret told). A topic can open a second
// scene where you choose how to help (goals and secrets). Loaded after bar.js; talkEvent (bar.js) calls barMenu.

const BAR_MENU = 3, BAR_REPEAT = 45;  // topics offered at a table; days before a topic with the same person is likelier again

// What they feel about it: a line for each trait that loves it, or hates it.
const BAR_REACT = {
  talkative: ['{n} is off again, and tells it to the next table too, and you in it, favorably.', '{n} talks over the answer, and it is clear you were not listened to.'],
  nervous: ['{n} lets out a breath, and for the first time sits back.', '{n} flinches, and does not quite trust you after that.'],
  generous: ['{n} is moved, and says they will remember it, and means a bottle at the next port.', '{n} waves it away, and looks at the wall.'],
  greedy: ['{n} counts it, pockets it, and decides you are worth knowing.', '{n} sniffs. There was nothing in it for them.'],
  pious: ['{n} says a short word over you, and means it.', '{n} turns the cord at their wrist and says nothing.'],
  rude: ['{n} grunts. From {n}, it is a warm welcome.', '{n} says what they think of that, at length and with volume.'],
  curious: ['{n} wants to know more, and asks, and the evening gets longer in a good way.', '{n} shrugs it off. It was not interesting.'],
  drunk: ['{n} hugs you. It is a long hug, and not entirely stable.', '{n} does not seem to take it in, and orders another.'],
  secretive: ['{n} looks at you a moment longer, and something is let in.', '{n} closes up, and the rest of the glass is polite.'],
  kind: ['{n} takes your hand for a moment and does not say anything.', '{n} says it is all right, in the voice of someone it is not.'],
  brave: ['{n} claps you on the shoulder, hard. You will have a bruise.', '{n} looks at you the way people look at a locked door.'],
  homesick: ['{n} goes quiet, and then smiles, the first of the night.', '{n} looks at the photograph, not at you.'],
};
const barHas = (p, ...ts) => ts.some(t => p.traits.includes(t));
function barReact(p, loves = [], hates = []) {
  const hate = hates.find(t => p.traits.includes(t)), love = loves.find(t => p.traits.includes(t));
  if (hate) return { n: -1, line: BAR_REACT[hate][1].replace(/\{n\}/g, p.first) };
  return { n: love ? 2 : 1, line: love ? BAR_REACT[love][0].replace(/\{n\}/g, p.first) : '' };
}
// A few lines that look the same to everyone get a reaction, and the person's memory of it.
const barWarm = (p, taste, memory) => { const r = barReact(p, taste.loves, taste.hates); like(p, r.n, r.n > 0 ? memory : null); return r; };

// ---------- helping with a goal (a second scene) ----------
// Three ways to help, whatever the goal: the same act lands differently on different people.
const HELP_TASTE = {
  gift: { cost: 60, loves: ['greedy', 'homesick', 'nervous'], hates: ['rude', 'pious'] },
  advice: { loves: ['curious', 'nervous', 'brave'], hates: ['rude', 'secretive'] },
  listen: { loves: ['homesick', 'kind', 'talkative', 'nervous'], hates: ['greedy', 'rude', 'drunk'] },
};
const GOAL_HELP = {
  home: { ask: 'Ask about the way home', text: ('{n} has not been home in years, and has the route on a card in a pocket, worn to cloth. "Three more ' +
      'ports," they say. "Maybe four, if the money holds."'), gift: 'Pay part of the fare (60 cr)', advice: 'Tell them which lanes are quick right now', listen: 'Ask them what they will do first, when they get there' },
  family: { ask: 'Ask about the family', text: '{n} is going to see family, and has been trying all evening to think what to bring.', gift: 'Press a few credits into their hand for a present (60 cr)', advice: 'Suggest something from the market here', listen: 'Ask who they are going to see' },
  job: { ask: 'Ask about the interview', text: '{n} has an interview at the other end, and says the questions over under their breath.', gift: 'Stand them the clothes for it (60 cr)', advice: 'Play the interviewer for a few questions', listen: 'Let them talk it through' },
  fresh: { ask: 'Ask about starting again', text: ('{n} says only that it is a fresh start, and that they would rather not say from what. They are ' +
      'watching to see how you take it.'), gift: 'Put something toward the first month (60 cr)', advice: 'Tell them what to do first in a new port', listen: 'Say it is all right not to say' },
  research: { ask: 'Ask about the posting', text: ('{n} has a research posting, and the instruments for it in a case under the table that they have ' +
      'not let go of since you sat down.'), gift: 'Pay the case\'s berth fee (60 cr)', advice: 'Tell them what to watch for on the lane', listen: 'Ask what they are going to measure' },
  pilgrim: { ask: 'Ask about the pilgrimage', text: '{n} is bound for somewhere holy, a long way off, and says it more quietly than anything else tonight.', gift: 'Pay a leg of the trip (60 cr)', advice: 'Tell them how to find a berth on the long haul', listen: 'Ask what the place means to them' },
  medical: { ask: 'Ask what is wrong', text: '{n} presses a hand to their side, and says it is the reason for the trip: a specialist, a long way out.', gift: 'Pay toward the specialist (60 cr)', advice: 'Tell them where the medics are on the way', listen: 'Ask them to tell you about it' },
};
function helpScene(p, pat, ctx) {
  const g = GOAL_HELP[p.goal];
  const act = (kind, label, line) => ({ label, ...(kind === 'gift' ? gated(needCr(HELP_TASTE.gift.cost)) : {}), run() {
    const t = HELP_TASTE[kind], r = barWarm(p, t, kind === 'gift' ? `The captain helped me on my way (${GOALS[p.goal]}).` : kind === 'advice' ? 'The captain gave me good advice.' : 'The captain let me talk it through.');
    if (t.cost) ctx.st.credits -= t.cost;
    let extra = '';
    if (kind === 'gift' && r.n >= 2) extra = ` As thanks ${p.first} leans in. "Here's something you can use," they say: "${addRumor()}"`;
    if (kind === 'listen' && r.n >= 2 && p.secret) extra = ` In the quiet after, ${p.first} ${pick(SECRET_TALK[p.secret])}`;
    return `${line.replace(/\{n\}/g, p.first)} ${r.line}${extra}`.replace(/\s+/g, ' ').trim();
  } });
  return { title: `${ctx.bar}: ${p.first} ${p.last}`, text: barSays(g.text, p), choices: [
    act('gift', g.gift, 'You put it on the table and push it across.'),
    act('advice', g.advice, 'You tell them what you know, plainly.'),
    act('listen', g.listen, 'You sit back, and ask, and for an hour that is all there is.'),
    { label: 'Say you hope it goes well', run: () => `${p.first} thanks you, and that is the end of it.` },
  ] };
}

// ---------- a secret, once they trust you ----------
const SECRET_HELP = {
  debt: { text: ('{n} turns the glass in a ring on the bar. "It is not even a lot," they say. "It is just more than I have, and the people it is owed ' +
      'to do not do arithmetic."'), opts: [['Cover part of it (200 cr)', 200, 3, (
      'You count out the credits. {n} turns them over, and then takes them, and does not say anything for a long ' +
      'time.')], ['Say you will keep an ear out for who is asking', 0, 1, '"That would help," {n} says. It is not nothing. It is not much.']] },
  ill: { text: ('{n} stops pretending. "Six months and the recyclers on that last ship," they say. "The clinic wants more than I have. I tell people ' +
      'it is the dust."'), opts: [
        [
        'Pay for the clinic (100 cr)',
        100,
        3,
        '{n} does not argue, which tells you how bad it is. The next time you see them, they say, they will be breathing better.'
      ],
        [
        'Tell them where the nearest medic is',
        0,
        1,
        'You give the name and the street. {n} writes it on a napkin and puts it carefully in a pocket.'
      ]
      ] },
  wanted: { text: ('{n} says it quietly: there is a warrant, and it is not for what they are accused of, and they would rather not be at a table by ' +
      'the door.'), opts: [
        [
        'Say you have seen nothing',
        0,
        2,
        '"Good," {n} says. "Thank you." They leave by the back a few minutes later, without hurry.'
      ],
        [
        'Tell them to give themselves up',
        0,
        -1,
        '{n} looks at you and does not answer. They finish their drink and leave, and do not look back.'
      ]
      ] },
  contraband: { text: ('{n} makes a gesture at the room, and lowers their voice to nothing. "I move things," they say, "the kind that do not go ' +
      'on a manifest. I do not tell everyone."'), opts: [
        [
        'Ask who they know',
        0,
        1,
        '{n} names a name, and a port, and a time of day, and then says you never heard it. It is a door, and you now know where.'
      ],
        [
        'Say you do not want to know',
        0,
        1,
        '{n} relaxes. "Good," they say. "Then we have never talked."'
      ]
      ] },
  spy: {
    text: '{n} stops asking questions, and for a moment looks tired. "I am paid to ask them," they say. "I am not paid to like it."',
    opts: [
    [
    'Tell them what you know of the lanes',
    0,
    0,
    '{n} writes nothing down, and does not need to.'
  ],
    [
    'Say you will not be asked again',
    0,
    0,
    '"Fair," {n} says, and smiles, and orders you another, and means the thing they said.'
  ]
  ]
  },
};
function secretScene(p, pat, ctx) {
  const d = SECRET_HELP[p.secret];
  return { title: `${ctx.bar}: ${p.first} ${p.last}`, text: barSays(d.text, p), choices: [
    ...d.opts.map(([label, cost, n, line]) => ({ label, ...gated(needCr(cost)), run() { ctx.st.credits -= cost; like(p, n, n > 0 ? `The captain stood by me when I told them my trouble (${p.secret}).` : null); return barSays(line, p); } })),
    { label: 'Let it be', run: () => `You let it be. ${p.first} is grateful, or relieved, and the talk goes somewhere easier.` },
  ] };
}

// ---------- the pool ----------
// w: how likely the person is to offer it (0 is never); must: always offered when it applies; make: the option itself.
const topicSkill = p => { const h = hired(), g = workGroup(p.job); return h && ({ tech: 'engineer', service: ['gunner', 'pilot'] }[g] || []).includes(h.post) ? h.post : null; };
const BAR_TOPICS = [
  { id: 'drink', w: () => 3, make: (p, pat, c) => ({ label: `Buy ${p.first} a drink (${DRINK} cr)`, ...gated(needCr(DRINK), notYet(() => pat.drank, 'You have bought them a drink already.')), run() {
    pat.drank = true; c.st.credits -= DRINK; met(pat);
    const r = barWarm(p, { loves: ['generous', 'drunk', 'greedy', 'kind'], hates: ['pious'] }, `The captain bought me a drink at ${c.bar}.`);
    if (barHas(p, 'generous')) { c.st.credits += DRINK; return `${p.first} will not hear of it, and slides the credits back across the bar, and buys the next one too. ${r.line}`; }
    if (p.secret && (barHas(p, 'talkative', 'drunk') || Math.random() < 0.3)) return `${p.first} ${pick(SECRET_TALK[p.secret])}`;
    if (Math.random() < 0.5) return `${p.first} looks around and leans in. "Here's something you can use," they say, low and fast: "${addRumor()}" Then they sit back and finish their drink. ${r.line}`;
    return `${barSays(barTrait('drink', p, BAR_DRINK_TALK), p)} ${r.line}`.trim();
  } }) },
  { id: 'heard', w: p => (barHas(p, 'secretive') ? 1 : 3), make: (p, pat, c) => ({ label: 'Ask what they have heard', ...gated(notYet(() => pat.asked, 'You have done that already tonight.')), run() {
    pat.asked = true; met(pat);
    if (barHas(p, 'secretive') && p.opinion < OPINION.FRIEND) return `"Nothing worth repeating," ${p.first} says, and smiles, and goes back to their drink. They do not look up again while you are there.`;
    const aside = barSays(BAR_GOAL[p.goal] || '', p), more = barHas(p, 'talkative', 'drunk', 'curious');
    const heard = `${p.first} thinks about it, then says: "${addRumor()}"${more ? ` And then, because ${p.first} cannot leave a thing alone: "${addRumor()}"` : ''}`;
    return aside ? `${aside} ${heard}` : heard;
  } }) },
  { id: 'passage', w: (p, pat) => (!hired() && (!pat.known || p.opinion >= 0) && p.goal !== 'fresh' ? 2 : 0), make: (p, pat) => ({ label: `Offer ${p.first} passage`, ...gated(notYet(() => pat.offered, 'You have offered already.'), needBerth), run() {
    pat.offered = true; met(pat);
    const o = travelOffer(p);
    if (!o) return `${p.first} counts on their fingers, then shakes their head. "Nowhere you can reach from here," they say. "Ask me again when you have a longer tank."`;
    G.offers.unshift(o);
    return `"${o.destPlanet}?" ${p.first} says. "That's where I need to be." They name a fair fare and shake on it with both hands. The job is on the mission board.`;
  } }) },
  { id: 'cards', w: p => (barHas(p, 'greedy', 'brave') ? 4 : barHas(p, 'pious') ? 1 : 2), make: (p, pat, c) => ({ label: `Play ${p.first} at cards (${CARDS} cr)`, ...gated(needCr(CARDS), notYet(() => pat.played, 'You have played already tonight.')), run() {
    pat.played = true; met(pat);
    if (Math.random() < 0.5) {
      c.st.credits += CARDS;
      like(p, barHas(p, 'greedy', 'rude') ? -1 : barHas(p, 'brave') ? 1 : 0, 'The captain took my money at cards.');
      return `${barSays(barTrait('win', p, BAR_CARD_WIN), p, { cr: fmt(CARDS) })} ${barHas(p, 'rude') ? (`${p.first} stands up and says you cheated, ` +
          `loudly, and the whole bar turns to look. You leave them to it.`) : pick([`${p.first} buys you a drink with your own money.`, `${p.first} shakes your hand and means it.`, `${p.first} tells the story of it to the next table, with you as the villain.`])}`;
    }
    c.st.credits -= CARDS; like(p, 1, null);
    return `${barSays(barTrait('lose', p, BAR_CARD_LOSE), p, { cr: fmt(CARDS) })} By the end of the glass you are laughing.${barTone(pat, p)}`;
  } }) },
  { id: 'work', w: () => 3, make: (p, pat) => ({ label: `Ask ${p.first} about their work`, ...gated(notYet(() => pat.work, 'You have done that already tonight.')), run() {
    pat.work = true; met(pat);
    const text = barSays(pick(BAR_WORK[workGroup(p.job)]), p), post = topicSkill(p);
    if (post) { gainSkill(post, 3); return `${text} You come away knowing something new about the ${POSTS[post].name.toLowerCase()}. (Experience gained.)`; }
    if (workGroup(p.job) === 'hands') return `${text} Then ${p.first} tells you what they are hearing on the docks: "${addRumor()}"`;
    const r = barWarm(p, { loves: ['curious', 'talkative'], hates: [] }, 'The captain asked about my work and listened.');
    return `${text} ${r.line}`.trim();
  } }) },
  {
    id: 'place',
    w: () => 1.5,
    make: (p, pat) => ({
    label: `Ask ${p.first} about this place`,
    ...gated(notYet(() => pat.place, 'You have done that already tonight.')),
    run() { pat.place = true; met(pat); const r = barWarm(p, {
    loves: [
    'talkative',
    'homesick',
    'curious'
  ],
    hates: []
  }, 'The captain asked about the place and listened.'); return `${barSays(pick(BAR_PLACE), p)} ${r.line}`.trim(); }
  })
  },
  { id: 'quiet', w: p => (barHas(p, 'nervous', 'secretive', 'homesick', 'kind') ? 4 : 1.5), make: (p, pat) => ({ label: `Sit with ${p.first} and say nothing`, ...gated(notYet(() => pat.quiet, 'You have done that already tonight.')), run() {
    pat.quiet = true; met(pat);
    const r = barWarm(p, { loves: ['nervous', 'secretive', 'homesick', 'kind'], hates: ['talkative', 'drunk'] }, 'The captain sat with me and did not make me talk.');
    return `${barSays(barTrait('quiet', p, BAR_SILENCE), p)} ${r.line}`.trim();
  } }) },
  { id: 'goal', w: p => (GOAL_HELP[p.goal] ? 3 : 0), make: (p, pat, c) => ({ label: GOAL_HELP[p.goal].ask, ...gated(notYet(() => pat.goal,
    'You have done that already tonight.')), run() { pat.goal = true; met(pat); G.nextEvent = helpScene(p, pat, c);
    return `You ask, and ${p.first} puts down the glass.`; } }) },
  {
    id: 'secret',
    w: (p, pat) => (p.secret && SECRET_HELP[p.secret] && (pat.drank || p.opinion >= OPINION.CLOSE) ? 4 : 0),
    make: (p, pat, c) => ({
    label: `Ask ${p.first} what is weighing on them`,
    ...gated(notYet(() => pat.troubled, 'You have done that already tonight.')),
    run() { pat.troubled = true; met(pat); G.nextEvent = secretScene(p, pat, c); return `${p.first} looks at you, and takes their time deciding.`; }
  })
  },
  { id: 'home', w: p => (barHas(p, 'homesick') ? 4 : 0), make: (p, pat) => ({ label: `Ask about ${p.home}`, ...gated(notYet(() => pat.home,
    'You have done that already tonight.')), run() { pat.home = true; met(pat); like(p, 2, `The captain let me talk about ${p.home}.`);
    return barSays(pick(BAR_HOME_TALK), p); } }) },
  {
    id: 'bless',
    w: p => (barHas(p, 'pious') ? 4 : 0),
    make: (p, pat) => ({
    label: hired() ? 'Ask for a blessing on the ship' : 'Ask for a blessing on your ship',
    ...gated(notYet(() => pat.blessed, 'You have done that already tonight.')),
    run() { pat.blessed = true; met(pat); like(p, 1, 'I blessed the captain\'s ship.'); return barSays(pick(BAR_BLESS), p); }
  })
  },
  { id: 'fight', w: (p, pat) => (barHas(p, 'rude') && !pat.known ? 3 : 0), make: (p, pat, c) => ({ label: 'Tell them what you think of their manners', ...gated(notYet(() => pat.fought, 'You have done that already tonight.')), run() {
    pat.fought = true; met(pat); like(p, -2, 'The captain started a fight with me.');
    if (roleSkill('gunner') || Math.random() < 0.4) return `It is short and loud. ${roleSkill('gunner') ? `${roleName('gunner')} steps in and ` : ''}${p.first} ends up on the floor, and the whole bar cheers. Someone starts a chant. The bartender charges you for the stool anyway.`;
    c.st.credits = Math.max(0, c.st.credits - 150);
    return 'It is short, and it does not go your way. There is a light, and a loud noise, and then nothing. You wake up in the back with a black eye and a 150 cr bill for the mirror. The bartender is standing over you with a wet cloth. "You were doing so well," the bartender says.';
  } }) },
  { id: 'peace', must: true, w: (p, pat) => (pat.known && p.opinion <= OPINION.GRUDGE ? 1 : 0), make: (p, pat, c) => ({ label: 'Make peace (buy them a bottle, 300 cr)', ...gated(needCr(300), notYet(() => pat.peace, 'You have made peace already tonight.')), run() {
    pat.peace = true; c.st.credits -= 300; like(p, 3, 'The captain bought me a bottle and apologized.');
    return `${p.first} looks at the bottle a long time before taking it, turning it in the light to read the label. Then they set it between you on the table and pour two glasses. "It's a start," they say.`;
  } }) },
];

// Three topics for this person, tonight: by their weights, less likely if you went over it with them lately or it was offered last
// time. Each is remembered by day on the person, so a topic comes round again, but not at once.
function barMenu(pat, p, ctx) {
  const done = p.barDone || {}, last = pat.shown || [];
  const pool = BAR_TOPICS.map(t => ({ t, w: t.w(p, pat) })).filter(x => x.w > 0)
    .map(x => ({ ...x, w: x.w * (done[x.t.id] && ctx.st.day - done[x.t.id] < BAR_REPEAT ? 0.15 : 1) * (last.includes(x.t.id) ? 0.4 : 1) }));
  const chosen = pool.filter(x => x.t.must);
  let rest = pool.filter(x => !x.t.must);
  while (chosen.length < BAR_MENU && rest.length) {
    let r = Math.random() * rest.reduce((a, x) => a + x.w, 0), i = 0;
    while (i < rest.length - 1 && (r -= rest[i].w) >= 0) i++;
    chosen.push(rest[i]); rest = rest.filter((_, j) => j !== i);
  }
  pat.shown = chosen.map(x => x.t.id);
  return chosen.map(({ t }) => {
    const o = t.make(p, pat, ctx), run = o.run;
    return { ...o, run() { p.barDone = { ...(p.barDone || {}), [t.id]: ctx.st.day }; return run(); } };
  });
}
