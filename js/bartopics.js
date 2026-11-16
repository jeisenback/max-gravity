'use strict';

// What you can talk about at a table. Each person offers a few topics from a larger pool, chosen by who they are (their traits,
// goal, job and secret) and rotated so the same person does not offer the same things twice running. How a topic lands depends on
// them too: `barReact` reads their traits against what the topic loves and hates, and the result is how much they warm to you,
// a line in their own voice, and sometimes more (a rumor passed on, a skill learned, a secret told). A topic can open a second
// scene where you choose how to help (goals and secrets). Loaded after bar.js; talkEvent (bar.js) calls barMenu.

const BAR_MENU = 3, BAR_REPEAT = 45;  // topics offered at a table; days before a topic with the same person is likelier again

// What they feel about it: a line for each trait that loves it, or hates it.
const BAR_REACT = {
  talkative: [
    '{n} tells the next table about it, and you\'re in the story.',
    '{n} talks over the end of it.'
  ],
  nervous: [
    '{n} sits back on the stool for the first time.',
    '{n} looks at the departures board again.'
  ],
  generous: [
    '{n} orders you another.',
    '{n} says it\'s nothing, and changes the subject.'
  ],
  greedy: [
    '{n} asks if your ship\'s taking on hands.',
    '{n} asks what that cost you, and makes a face at the figure.'
  ],
  pious: [
    '{n} says a short word for you.',
    '{n} touches the cord at their wrist and doesn\'t say anything.'
  ],
  rude: [
    '"Huh," {n} says, and pushes the bowl your way.',
    '"Is that it?" {n} says.'
  ],
  curious: [
    '{n} asks a question about it, and then another.',
    '{n} looks past you at the room.'
  ],
  drunk: [
    '{n} hugs you with one arm, and keeps the other on the glass.',
    '{n} orders another and doesn\'t offer.'
  ],
  secretive: [
    '{n} tells you their ship\'s name.',
    '{n} goes back to their terminal.'
  ],
  kind: [
    '{n} puts a hand on your arm for a moment.',
    '{n} says it\'s all right, and looks at their drink.'
  ],
  brave: [
    '{n} claps you on the shoulder, hard.',
    '{n} finishes the drink.'
  ],
  homesick: [
    '{n} smiles, the first time tonight.',
    '{n} looks at the photo in their tin, not at you.'
  ]
};
const barHas = (p, ...ts) => ts.some(t => p.traits.includes(t));
function barReact(p, loves = [], hates = []) {
  const hate = hates.find(t => p.traits.includes(t)), love = loves.find(t => p.traits.includes(t)), react = barLines('react');
  if (hate) return { n: -1, line: react[hate][1].replace(/\{n\}/g, p.first) };
  return { n: love ? 2 : 1, line: love ? react[love][0].replace(/\{n\}/g, p.first) : '' };
}
// A few lines that look the same to everyone get a reaction, and the person's memory of it.
const barWarm = (p, taste, memory) => { const r = barReact(p, taste.loves, taste.hates); like(p, r.n, r.n > 0 ? memory : null); return r; };

// ---------- helping with a goal (a second scene) ----------
// Three ways to help, whatever the goal: the same act lands differently on different people.
const HELP_TASTE = {
  gift: { cost: 600, loves: ['greedy', 'homesick', 'nervous'], hates: ['rude', 'pious'] },
  advice: { loves: ['curious', 'nervous', 'brave'], hates: ['rude', 'secretive'] },
  listen: { loves: ['homesick', 'kind', 'talkative', 'nervous'], hates: ['greedy', 'rude', 'drunk'] },
};
const GOAL_HELP = {
  home: {
    ask: 'Ask about the way home',
    text: '{n} has the route on the back of the ticket, three ports crossed off. "Three more," they say. "Four if the fare goes up again."',
    gift: 'Pay part of the next fare (600 cr)',
    advice: 'Tell them which lanes are running quick',
    listen: 'Ask what they\'ll do first when they get there'
  },
  family: {
    ask: 'Ask about the family',
    text: '{n} is going to see their sister and her kid. The present\'s in a bag on the bar, and they keep taking it out to look at it.',
    gift: 'Put something toward the present (600 cr)',
    advice: 'Tell them what\'s good at the market here',
    listen: 'Ask who they\'re going to see'
  },
  job: {
    ask: 'Ask about the interview',
    text: '{n} has the interview the day after they land. The questions are on their terminal, and the answers, and they keep changing the answers.',
    gift: 'Pay for a decent jacket for it (600 cr)',
    advice: 'Ask them the questions yourself',
    listen: 'Let them talk it through'
  },
  fresh: {
    ask: 'Ask about starting again',
    text: '{n} says it\'s a fresh start, and doesn\'t say from what. They watch how you take that.',
    gift: 'Put something toward the first month\'s berth (600 cr)',
    advice: 'Tell them what to sort out first in a new port',
    listen: 'Say they don\'t have to tell you'
  },
  research: {
    ask: 'Ask about the posting',
    text: '{n} has a posting at the end of the trip, and the instruments for it in a case between their feet. The case pays a berth fee of its own.',
    gift: 'Pay the case\'s berth fee (600 cr)',
    advice: 'Tell them how the lane treats kit like that',
    listen: 'Ask what they\'re going to measure'
  },
  pilgrim: {
    ask: 'Ask about the pilgrimage',
    text: '{n} is going to a shrine a long way out, on the cheapest berth on every leg. They show you the list of legs.',
    gift: 'Pay for one leg (600 cr)',
    advice: 'Tell them how to get a berth on the long haul',
    listen: 'Ask what the place is'
  },
  medical: {
    ask: 'Ask what\'s wrong',
    text: '{n} is going to see a specialist a long way out. The clinic wants a deposit before it\'ll book them.',
    gift: 'Put something toward the deposit (600 cr)',
    advice: 'Tell them where the medics are along the way',
    listen: 'Ask them about it'
  }
};
function helpScene(p, pat, ctx) {
  const g = barLines('goal-help')[p.goal], say = barSay('goal-help', p);
  const act = (kind, label, line) => ({ label, ...(kind === 'gift' ? gated(needCr(HELP_TASTE.gift.cost)) : {}), run() {
    const t = HELP_TASTE[kind], r = barWarm(p, t, say(`${kind}.memory`));
    if (t.cost) ctx.st.credits -= t.cost;
    let extra = '';
    if (kind === 'gift' && r.n >= 2) extra = ` ${say('thanks', { rumor: addRumor() })}`;
    if (kind === 'listen' && r.n >= 2 && p.secret) extra = ` ${say('quiet', { slip: pick(barLines('secret-talk')[p.secret]) })}`;
    return `${line.replace(/\{n\}/g, p.first)} ${r.line}${extra}`.replace(/\s+/g, ' ').trim();
  } });
  return { title: `${ctx.bar}: ${p.first} ${p.last}`, text: barSays(g.text, p), choices: [
    act('gift', g.gift, say('gift.result')),
    act('advice', g.advice, say('advice.result')),
    act('listen', g.listen, say('listen.result')),
    { label: say('close.label'), run: () => say('close.result') },
  ] };
}

// ---------- a secret, once they trust you ----------
// Each secret's scene: what they say, and what you can do about it (a label, what it costs, how much they think of you for it, and the line you get). The words are lines
// of the text layer (lines:bar-secret-help, linetables.js).
const SECRET_HELP = {
  debt: {
    text: '{n} turns the glass on the bar. "Four thousand," they say. "It\'s not even a lot. It\'s just more than I\'ve got, and they add the interest every week."',
    opts: [
      {
        label: 'Cover part of it (2,000 cr)',
        cost: 2000,
        n: 3,
        line: 'You count out the credits. {n} looks at them for a while, and then puts them away.'
      },
      {
        label: 'Say you\'ll keep an ear out for who\'s asking',
        cost: 0,
        n: 1,
        line: '"That\'d help," {n} says.'
      }
    ]
  },
  ill: {
    text: '{n} puts the glass down. "Six months on a ship with bad recyclers," they say. "The clinic wants more than I\'ve got. I tell people it\'s the dust."',
    opts: [
      {
        label: 'Pay for the clinic (1,000 cr)',
        cost: 1000,
        n: 3,
        line: '{n} doesn\'t argue. They write the clinic\'s hours on a napkin.'
      },
      {
        label: 'Tell them where the nearest medic is',
        cost: 0,
        n: 1,
        line: 'You give them the name and the deck. {n} writes it on a napkin and puts it in a pocket.'
      }
    ]
  },
  wanted: {
    text: '{n} has the seat with its back to the wall. "There\'s a warrant," they say. "It\'s not for what it says. I\'d rather not sit near the door."',
    opts: [
      {
        label: 'Say you\'ve seen nothing',
        cost: 0,
        n: 2,
        line: '"Thanks," {n} says. They leave by the back a few minutes later.'
      },
      {
        label: 'Tell them to give themselves up',
        cost: 0,
        n: -1,
        line: '{n} doesn\'t answer. They finish the drink and go.'
      }
    ]
  },
  contraband: {
    text: '{n} keeps their voice down. "I move things," they say. "The kind that don\'t go on a manifest. I don\'t tell everyone."',
    opts: [
      {
        label: 'Ask who they know',
        cost: 0,
        n: 1,
        line: '{n} gives you a name, a dock and a time of day. "You didn\'t hear it from me."'
      },
      {
        label: 'Say you don\'t want to know',
        cost: 0,
        n: 1,
        line: '"Good," {n} says. "Then we didn\'t talk."'
      }
    ]
  },
  spy: {
    text: '{n} stops asking questions. "I\'m paid to ask them," they say. "I\'m not paid to like it."',
    opts: [
      {
        label: 'Tell them what you know of the lanes',
        cost: 0,
        n: 0,
        line: '{n} doesn\'t write anything down.'
      },
      {
        label: 'Say you won\'t be asked again',
        cost: 0,
        n: 0,
        line: '"Fair," {n} says, and gets you another.'
      }
    ]
  }
};
function secretScene(p, pat, ctx) {
  const d = barLines('secret-help')[p.secret], say = barSay('secret-help', p);
  return { title: `${ctx.bar}: ${p.first} ${p.last}`, text: barSays(d.text, p), choices: [
    ...d.opts.map(({ label, cost, n, line }) => ({ label, ...gated(needCr(cost)), run() { ctx.st.credits -= cost; like(p, n, n > 0 ? say('memory') : null); return barSays(line, p); } })),
    { label: say('close.label'), run: () => say('close.result') },
  ] };
}

// ---------- the pool ----------
// w: how likely the person is to offer it (0 is never); must: always offered when it applies; make: the option itself.
const topicSkill = p => { const h = hired(), g = workGroup(p.job); return h && ({ tech: 'engineer', service: ['gunner', 'pilot'] }[g] || []).includes(h.post) ? h.post : null; };
// The words of each topic are in PEOPLE_LINES (peopletext.js) under `bar:<id>`, read through barSay (linetables.js) so the scene editor can change them: the button, the reason it is
// shut, and the lines the topic ends on. A line the topic builds from the game (a tip, a line from the tables above, a name) is passed in as a word. What a topic does is here.
// `sample` is a person the topic is about, for the editor's preview.
const barSay = (topic, p, c) => (key, vars) => peopleSay(`bar:${topic}`, key, { first: p.first, last: p.last, home: p.home, ...vars });
const BAR_TOPICS = [
  { id: 'drink', sample: { traits: ['kind', 'brave'] }, w: () => 3, make: (p, pat, c) => { const say = barSay('drink', p, c); return ({ label: say('label', { cost: DRINK }), ...gated(needCr(DRINK), notYet(() => pat.drank, say('gate'))), run() {
    pat.drank = true; c.st.credits -= DRINK; met(pat);
    const r = barWarm(p, { loves: ['generous', 'drunk', 'greedy', 'kind'], hates: ['pious'] }, say('memory', { bar: c.bar }));
    if (barHas(p, 'generous')) { c.st.credits += DRINK; return say('generous', { react: r.line }); }
    if (p.secret && (barHas(p, 'talkative', 'drunk') || Math.random() < 0.3)) return `${p.first} ${pick(barLines('secret-talk')[p.secret])}`;
    if (Math.random() < 0.5) return say('rumor', { rumor: addRumor(), react: r.line });
    return `${barSays(barTrait('drink', p, barLines('drink-talk')), p)} ${r.line}`.trim();
  } }); } },
  { id: 'heard', sample: { traits: ['talkative', 'kind'], goal: 'home' }, w: p => (barHas(p, 'secretive') ? 1 : 3), make: (p, pat, c) => { const say = barSay('heard', p, c); return ({ label: say('label'), ...gated(notYet(() => pat.asked, say('gate'))), run() {
    pat.asked = true; met(pat);
    if (barHas(p, 'secretive') && p.opinion < OPINION.FRIEND) return say('secretive');
    const more = barHas(p, 'talkative', 'drunk', 'curious');  // what they are travelling for is in the intro (bar.js talkEvent, #1278)
    return `${say('heard', { rumor: addRumor() })}${more ? ` ${say('more', { rumor: addRumor() })}` : ''}`;
  } }); } },
  { id: 'passage', sample: { traits: ['kind', 'brave'] }, w: (p, pat) => (!hired() && (!pat.known || p.opinion >= 0) && p.goal !== 'fresh' ? 2 : 0), make: (p, pat, c) => { const say = barSay('passage', p, c); return ({ label: say('label'), ...gated(notYet(() => pat.offered, say('gate')), needBerth), run() {
    pat.offered = true; met(pat);
    const o = travelOffer(p);
    if (!o) return say('none');
    G.offers.unshift(o);
    return say('set', { dest: o.destPlanet });
  } }); } },
  { id: 'cards', sample: { traits: ['greedy', 'brave'] }, w: p => (barHas(p, 'greedy', 'brave') ? 4 : barHas(p, 'pious') ? 1 : 2), make: (p, pat, c) => { const say = barSay('cards', p, c); return ({ label: `${say('label', { cr: CARDS })}${costNote({}, 0.5)}`, ...gated(needCr(CARDS), notYet(() => pat.played, say('gate'))), run() {
    pat.played = true; met(pat);
    if (Math.random() < 0.5) {
      c.st.credits += CARDS;
      like(p, barHas(p, 'greedy', 'rude') ? -1 : barHas(p, 'brave') ? 1 : 0, say('memory'));
      return `${barSays(barTrait('win', p, barLines('card-win')), p, { cr: fmt(CARDS) })} ${barHas(p, 'rude') ? say('win.rude') : pick([say('win.end.0'), say('win.end.1'), say('win.end.2')])}`;
    }
    c.st.credits -= CARDS; like(p, 1, null);
    return `${barSays(barTrait('lose', p, barLines('card-lose')), p, { cr: fmt(CARDS) })} ${say('lose.end')}${barTone(pat, p)}`;
  } }); } },
  { id: 'work', sample: { traits: ['kind', 'brave'] }, w: () => 3, make: (p, pat, c) => { const say = barSay('work', p, c); return ({ label: say('label'), ...gated(notYet(() => pat.work, say('gate'))), run() {
    pat.work = true; met(pat);
    const text = barSays(pick(barLines('work')[workGroup(p.job)]), p), post = topicSkill(p);
    if (post) { gainSkill(post, 3); return `${text} ${say('post', { post: POSTS[post].name.toLowerCase() })}`; }
    if (workGroup(p.job) === 'hands') return `${text} ${say('hands', { rumor: addRumor() })}`;
    const r = barWarm(p, { loves: ['curious', 'talkative'], hates: [] }, say('memory'));
    return `${text} ${r.line}`.trim();
  } }); } },
  { id: 'place', sample: { traits: ['talkative', 'kind'] }, w: () => 1.5, make: (p, pat, c) => { const say = barSay('place', p, c); return ({ label: say('label'), ...gated(notYet(() => pat.place, say('gate'))),
    run() { pat.place = true; met(pat); const r = barWarm(p, { loves: ['talkative', 'homesick', 'curious'], hates: [] }, say('memory')); return `${barSays(pick(barLines('place')), p)} ${r.line}`.trim(); }
  }); } },
  { id: 'quiet', sample: { traits: ['nervous', 'kind'] }, w: p => (barHas(p, 'nervous', 'secretive', 'homesick', 'kind') ? 4 : 1.5), make: (p, pat, c) => { const say = barSay('quiet', p, c); return ({ label: say('label'), ...gated(notYet(() => pat.quiet, say('gate'))), run() {
    pat.quiet = true; met(pat);
    const r = barWarm(p, { loves: ['nervous', 'secretive', 'homesick', 'kind'], hates: ['talkative', 'drunk'] }, say('memory'));
    return `${barSays(barTrait('quiet', p, barLines('silence')), p)} ${r.line}`.trim();
  } }); } },
  { id: 'goal', sample: { traits: ['homesick', 'kind'], goal: 'home' }, w: p => (GOAL_HELP[p.goal] ? 3 : 0), make: (p, pat, c) => { const say = barSay('goal', p, c); return ({ label: barLines('goal-help')[p.goal].ask, ...gated(notYet(() => pat.goal, say('gate'))), run() {
    pat.goal = true; met(pat); G.nextEvent = helpScene(p, pat, c);
    return say('result');
  } }); } },
  { id: 'secret', sample: { traits: ['kind', 'brave'], secret: 'debt', opinion: OPINION.CLOSE }, w: (p, pat) => (p.secret && SECRET_HELP[p.secret] && (pat.drank || p.opinion >= OPINION.CLOSE) ? 4 : 0), make: (p, pat, c) => { const say = barSay('secret', p, c); return ({
    label: say('label'),
    ...gated(notYet(() => pat.troubled, say('gate'))),
    run() { pat.troubled = true; met(pat); G.nextEvent = secretScene(p, pat, c); return say('result'); }
  }); } },
  { id: 'home', sample: { traits: ['homesick', 'kind'] }, w: p => (barHas(p, 'homesick') ? 4 : 0), make: (p, pat, c) => { const say = barSay('home', p, c); return ({ label: say('label'), ...gated(notYet(() => pat.home, say('gate'))), run() {
    pat.home = true; met(pat); like(p, 2, say('memory'));
    return barSays(pick(barLines('home-talk')), p);
  } }); } },
  { id: 'bless', sample: { traits: ['pious', 'kind'] }, w: p => (barHas(p, 'pious') ? 4 : 0), make: (p, pat, c) => { const say = barSay('bless', p, c); return ({
    label: say(hired() ? 'label.hired' : 'label'),
    ...gated(notYet(() => pat.blessed, say('gate'))),
    run() { pat.blessed = true; met(pat); like(p, 1, say('memory')); return barSays(pick(barLines('bless')), p); }
  }); } },
  { id: 'fight', sample: { traits: ['rude', 'kind'] }, w: (p, pat) => (barHas(p, 'rude') && !pat.known ? 3 : 0), make: (p, pat, c) => { const say = barSay('fight', p, c), gunner = !!roleHolder('gunner') && roleSkill('gunner') > 0, scarred = hasTrait(hired(), 'scarred'), odds = gunner || scarred ? 1 : handCheck('hands', 0, 'brawl');  /* gunner: a crewmate at the guns steps in; scarred: the trait's door (traits.js), the patron backs down; a hand's own gunnery is a hand check like anyone's */ return ({ label: scarred ? `[Scarred] ${traitSay('door.scarred.label')}` : `${say('label')}${costNote({ cost: 1500 }, odds)}`, ...gated(notYet(() => pat.fought, say('gate'))), run() {
    pat.fought = true; met(pat); like(p, -2, say('memory'));
    if (scarred) return traitSay('door.scarred.text', { first: p.first });
    const won = odds >= 1 || Math.random() < odds; recordHand(won ? 'barWon' : 'barLost');  // the record (traits.js)
    if (won) return say('win', { step: gunner ? `${say('win.step', { gunner: roleName('gunner') })} ` : '' });
    c.st.credits = Math.max(0, c.st.credits - 1500);
    return say('lose');
  } }); } },
  { id: 'peace', sample: { traits: ['kind', 'brave'], opinion: -3 }, must: true, w: (p, pat) => (pat.known && p.opinion <= OPINION.GRUDGE ? 1 : 0), make: (p, pat, c) => { const say = barSay('peace', p, c); return ({ label: say('label'), ...gated(needCr(3000), notYet(() => pat.peace, say('gate'))), run() {
    pat.peace = true; c.st.credits -= 3000; like(p, 3, say('memory'));
    return say('result');
  } }); } },
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
