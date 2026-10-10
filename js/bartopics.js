'use strict';

// What you can talk about at a table. Each person offers a few topics from a larger pool, chosen by who they are (their traits,
// goal, job and secret) and rotated so the same person does not offer the same things twice running. How a topic lands depends on
// them too: `barReact` reads their traits against what the topic loves and hates, and the result is how much they warm to you,
// a line in their own voice, and sometimes more (a rumor passed on, a skill learned, a secret told). A topic can open a second
// scene where you choose how to help (goals and secrets). Loaded after bar.js; talkEvent (bar.js) calls barMenu.

const BAR_MENU = 3, BAR_REPEAT = 45;  // topics offered at a table; days before a topic with the same person is likelier again

// What they feel about it: a line for each trait that loves it, or hates it.
const BAR_REACT = {
  talkative: ['{n} is off again, and tells it to the next table too, and you are in it.', '{n} talks over the answer and goes back to the story about the tug.'],
  nervous: ['{n} lets out a breath, and for the first time sits back.', '{n} flinches, and checks the seal on the nearest hatch.'],
  generous: ['{n} says to have the rest, and means a bottle at the next port.', '{n} waves it away, and asks whether you have eaten.'],
  greedy: ['{n} counts it, tells you the total, and decides you are worth knowing.', '{n} asks what it would fetch, and does not like the figure.'],
  pious: ['{n} says a short word over you, and means it.', '{n} turns the cord at their wrist and says nothing.'],
  rude: ['{n} says the coffee here is almost drinkable.', '{n} says what they think of that, in order, from the list, and does not raise their voice.'],
  curious: ['{n} asks the next question, and then the one after it.', '{n} says "Ah," and turns to see how the till opens.'],
  drunk: ['{n} hugs you. It is a long hug, and not entirely stable.', '{n} agrees at once, and orders another.'],
  secretive: ['{n} asks how long you have had the ship, and this time wants the answer.', '{n} asks how long you have had the ship, and the rest of the glass is polite.'],
  kind: ['{n} takes your hand for a moment and does not say anything.', '{n} says it is all right, and finds something to fix.'],
  brave: ['{n} claps you on the shoulder, hard. You will have a bruise.', '{n} looks at you, and then at the door, and finishes the drink.'],
  homesick: ['{n} goes quiet, and then smiles, the first of the night.', '{n} looks at the photograph, not at you.'],
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
  const g = barLines('goal-help')[p.goal], say = barSay('goal-help', p);
  const act = (kind, label, line) => ({ label, ...(kind === 'gift' ? gated(needCr(HELP_TASTE.gift.cost)) : {}), run() {
    const t = HELP_TASTE[kind], r = barWarm(p, t, kind === 'gift' ? `The captain helped me on my way (${GOALS[p.goal]}).` : kind === 'advice' ? 'The captain gave me good advice.' : 'The captain let me talk it through.');
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
    text: '{n} turns the glass in a ring on the bar. "Six hundred and twelve," they say. "It is not even a lot. It is just more than I have, and the people it is owed to do not do arithmetic."',
    opts: [
      { label: 'Cover part of it (200 cr)', cost: 200, n: 3, line: 'You count out the credits. {n} turns them over, and then takes them, and does not say anything for a long time.' },
      { label: 'Say you will keep an ear out for who is asking', cost: 0, n: 1, line: '"That would help," {n} says.' },
    ],
  },
  ill: {
    text: '{n} puts the glass down. "Six months and the recyclers on that last ship," they say. "The clinic wants more than I have. I tell people it is the dust."',
    opts: [
      { label: 'Pay for the clinic (100 cr)', cost: 100, n: 3, line: '{n} does not argue. The next time you see them, they say, they will be breathing better.' },
      { label: 'Tell them where the nearest medic is', cost: 0, n: 1, line: 'You give the name and the street. {n} writes it on a napkin and puts it carefully in a pocket.' },
    ],
  },
  wanted: {
    text: '{n} has taken the seat with its back to the wall. "There is a warrant," they say, "and it is not for what they say it is. I would rather not be at a table by the door."',
    opts: [
      { label: 'Say you have seen nothing', cost: 0, n: 2, line: '"Good," {n} says. "Thank you." They leave by the back a few minutes later, without hurry.' },
      { label: 'Tell them to give themselves up', cost: 0, n: -1, line: '{n} looks at you and does not answer. They finish their drink and leave, and do not look back.' },
    ],
  },
  contraband: {
    text: '{n} makes a gesture at the room, and lowers their voice to nothing. "I move things," they say, "the kind that do not go on a manifest. I do not tell everyone."',
    opts: [
      { label: 'Ask who they know', cost: 0, n: 1, line: '{n} names a name, and a port, and a time of day, and then says you never heard it. It is a door, and you now know where.' },
      { label: 'Say you do not want to know', cost: 0, n: 1, line: '{n} relaxes. "Good," they say. "Then we have never talked."' },
    ],
  },
  spy: {
    text: '{n} stops asking questions. "I am paid to ask them," they say. "I am not paid to like it."',
    opts: [
      { label: 'Tell them what you know of the lanes', cost: 0, n: 0, line: '{n} writes nothing down, and does not need to.' },
      { label: 'Say you will not be asked again', cost: 0, n: 0, line: '"Fair," {n} says, and orders you another.' },
    ],
  },
};
function secretScene(p, pat, ctx) {
  const d = barLines('secret-help')[p.secret], say = barSay('secret-help', p);
  return { title: `${ctx.bar}: ${p.first} ${p.last}`, text: barSays(d.text, p), choices: [
    ...d.opts.map(({ label, cost, n, line }) => ({ label, ...gated(needCr(cost)), run() { ctx.st.credits -= cost; like(p, n, n > 0 ? `The captain stood by me when I told them my trouble (${p.secret}).` : null); return barSays(line, p); } })),
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
    const r = barWarm(p, { loves: ['generous', 'drunk', 'greedy', 'kind'], hates: ['pious'] }, `The captain bought me a drink at ${c.bar}.`);
    if (barHas(p, 'generous')) { c.st.credits += DRINK; return say('generous', { react: r.line }); }
    if (p.secret && (barHas(p, 'talkative', 'drunk') || Math.random() < 0.3)) return `${p.first} ${pick(barLines('secret-talk')[p.secret])}`;
    if (Math.random() < 0.5) return say('rumor', { rumor: addRumor(), react: r.line });
    return `${barSays(barTrait('drink', p, barLines('drink-talk')), p)} ${r.line}`.trim();
  } }); } },
  { id: 'heard', sample: { traits: ['talkative', 'kind'], goal: 'home' }, w: p => (barHas(p, 'secretive') ? 1 : 3), make: (p, pat, c) => { const say = barSay('heard', p, c); return ({ label: say('label'), ...gated(notYet(() => pat.asked, say('gate'))), run() {
    pat.asked = true; met(pat);
    if (barHas(p, 'secretive') && p.opinion < OPINION.FRIEND) return say('secretive');
    const aside = barSays(barLines('goal')[p.goal] || '', p), more = barHas(p, 'talkative', 'drunk', 'curious');
    const heard = `${say('heard', { rumor: addRumor() })}${more ? ` ${say('more', { rumor: addRumor() })}` : ''}`;
    return aside ? `${aside} ${heard}` : heard;
  } }); } },
  { id: 'passage', sample: { traits: ['kind', 'brave'] }, w: (p, pat) => (!hired() && (!pat.known || p.opinion >= 0) && p.goal !== 'fresh' ? 2 : 0), make: (p, pat, c) => { const say = barSay('passage', p, c); return ({ label: say('label'), ...gated(notYet(() => pat.offered, say('gate')), needBerth), run() {
    pat.offered = true; met(pat);
    const o = travelOffer(p);
    if (!o) return say('none');
    G.offers.unshift(o);
    return say('set', { dest: o.destPlanet });
  } }); } },
  { id: 'cards', sample: { traits: ['greedy', 'brave'] }, w: p => (barHas(p, 'greedy', 'brave') ? 4 : barHas(p, 'pious') ? 1 : 2), make: (p, pat, c) => { const say = barSay('cards', p, c); return ({ label: say('label', { cr: CARDS }), ...gated(needCr(CARDS), notYet(() => pat.played, say('gate'))), run() {
    pat.played = true; met(pat);
    if (Math.random() < 0.5) {
      c.st.credits += CARDS;
      like(p, barHas(p, 'greedy', 'rude') ? -1 : barHas(p, 'brave') ? 1 : 0, 'The captain took my money at cards.');
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
    const r = barWarm(p, { loves: ['curious', 'talkative'], hates: [] }, 'The captain asked about my work and listened.');
    return `${text} ${r.line}`.trim();
  } }); } },
  { id: 'place', sample: { traits: ['talkative', 'kind'] }, w: () => 1.5, make: (p, pat, c) => { const say = barSay('place', p, c); return ({ label: say('label'), ...gated(notYet(() => pat.place, say('gate'))),
    run() { pat.place = true; met(pat); const r = barWarm(p, { loves: ['talkative', 'homesick', 'curious'], hates: [] }, 'The captain asked about the place and listened.'); return `${barSays(pick(barLines('place')), p)} ${r.line}`.trim(); }
  }); } },
  { id: 'quiet', sample: { traits: ['nervous', 'kind'] }, w: p => (barHas(p, 'nervous', 'secretive', 'homesick', 'kind') ? 4 : 1.5), make: (p, pat, c) => { const say = barSay('quiet', p, c); return ({ label: say('label'), ...gated(notYet(() => pat.quiet, say('gate'))), run() {
    pat.quiet = true; met(pat);
    const r = barWarm(p, { loves: ['nervous', 'secretive', 'homesick', 'kind'], hates: ['talkative', 'drunk'] }, 'The captain sat with me and did not make me talk.');
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
    pat.home = true; met(pat); like(p, 2, `The captain let me talk about ${p.home}.`);
    return barSays(pick(barLines('home-talk')), p);
  } }); } },
  { id: 'bless', sample: { traits: ['pious', 'kind'] }, w: p => (barHas(p, 'pious') ? 4 : 0), make: (p, pat, c) => { const say = barSay('bless', p, c); return ({
    label: say(hired() ? 'label.hired' : 'label'),
    ...gated(notYet(() => pat.blessed, say('gate'))),
    run() { pat.blessed = true; met(pat); like(p, 1, 'I blessed the captain\'s ship.'); return barSays(pick(barLines('bless')), p); }
  }); } },
  { id: 'fight', sample: { traits: ['rude', 'kind'] }, w: (p, pat) => (barHas(p, 'rude') && !pat.known ? 3 : 0), make: (p, pat, c) => { const say = barSay('fight', p, c); return ({ label: say('label'), ...gated(notYet(() => pat.fought, say('gate'))), run() {
    pat.fought = true; met(pat); like(p, -2, 'The captain started a fight with me.');
    if (roleSkill('gunner') || Math.random() < 0.4) return say('win', { step: roleSkill('gunner') ? `${say('win.step', { gunner: roleName('gunner') })} ` : '' });
    c.st.credits = Math.max(0, c.st.credits - 150);
    return say('lose');
  } }); } },
  { id: 'peace', sample: { traits: ['kind', 'brave'], opinion: -3 }, must: true, w: (p, pat) => (pat.known && p.opinion <= OPINION.GRUDGE ? 1 : 0), make: (p, pat, c) => { const say = barSay('peace', p, c); return ({ label: say('label'), ...gated(needCr(300), notYet(() => pat.peace, say('gate'))), run() {
    pat.peace = true; c.st.credits -= 300; like(p, 3, 'The captain bought me a bottle and apologized.');
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
