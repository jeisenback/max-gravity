'use strict';

// The interview screen for owners: a bar candidate's skills and asking wage up front, and
// three questions whose answers come from their real goal, traits and secret. Hire from
// the screen. Uses the character screen's tab (character.js hands over for ids "bar:N").
// Loaded after character.js; only calls into it at runtime.

const GOAL_SAY = {
  home: 'I am trying to get home. It has been too long.', family: 'My family is out there, and I would like to see them while I can.',
  job: 'I have an interview waiting, and a berth would beat waiting for one.', fresh: 'I want to start over somewhere nobody knows me.',
  research: 'There is a posting waiting for me, and I need to be on a ship to take it.', pilgrim: 'I am on a pilgrimage, and a ship is part of the road.',
  medical: 'There is a treatment I need, and it is a long way off.', vague: 'It is complicated. I would rather not say.',
};
const TRAIT_SAY = {
  talkative: 'I will tell you about myself, and then about my cousins, and then about the weather on {home}.', nervous: 'I check things twice. Three times, if the first two were close.',
  generous: 'If there is a pot on, there is enough for everyone. I will see to it.', greedy: 'I know what I am worth, and I will notice if the pay slips.',
  pious: 'I keep my own observances. They never get in the way of a shift.', rude: 'People say I am blunt. I say I am right, and early.',
  curious: 'I want to know how everything on the ship works. Everything.', drunk: 'I like a drink at the end of a day. Sometimes the day ends early.',
  secretive: 'There is not much to tell. I like it that way.', kind: 'I notice when someone is having a bad day, and I try to help.',
  brave: 'When something goes wrong, I would rather be the one standing nearest it.', homesick: 'I miss {home} more than I let on.',
};
const SECRET_SAY = {
  contraband: 'Cargo is cargo, as far as I am concerned. I do not look in the boxes.', wanted: 'I would sooner you did not dock anywhere too official.',
  ill: 'I tire easily. I do the work, though. (a cough, quickly covered)', spy: 'I ask a lot of questions. It is a habit from an old job.',
  debt: 'I could use steady pay. There are people I owe.',
};
const INTERVIEW = [
  { label: 'Why are you looking for a ship?', say: c => GOAL_SAY[c.goal] },
  { label: 'Tell me about yourself.', say: c => c.traits.map(t => TRAIT_SAY[t].replace('{home}', c.home)).join(' ') },
  { label: 'Is there anything I should know?', say: c => SECRET_SAY[c.secret] || 'Nothing. I turn up and do the work.' },
];

const candidateOf = id => /^bar:\d+$/.test(String(id)) ? G.bar[Number(String(id).slice(4))] : null;

function interviewPanel() {
  const st = G.state, c = candidateOf(G.viewPerson);
  if (!c) return `<p class="hint">They have left the bar.</p><div class="row"><button data-action="personBack">Back</button></div>`;
  const asked = c.asked = c.asked || [], skills = skillsOf(c);
  const rows = HIRED_POSTS.map(p => { const n = skills[POSTS[p].role] || 0; return `<div class="con-part char-skill"><span>${POSTS[p].name}</span>${pips(n)}<b>${n}</b></div>`; }).join('');
  const chips = asked[1] ? c.traits.map(t => `<span class="char-chip">${TRAITS[t].adj}</span>`).join('') : '<span class="char-chip">ask them</span>';
  const talk = INTERVIEW.map((q, i) => asked[i]
    ? `<div class="hint"><b>${q.label}</b><br>"${q.say(c)}"</div>`
    : `<div class="row"><button data-action="interviewAsk" data-arg="${i}">${q.label}</button></div>`).join('');
  const ok = berthsFree() > 0 && st.credits >= c.fee;
  return consoleHtml({
    title: fullName(c), status: 'In the bar, looking for a ship',
    screen: `<div class="char-id">${portraitSvg({ ...c, id: `bar:${c.first}${c.last}` })}<div><div class="char-name">${esc(fullName(c))}</div><div class="hint">${esc(`${ROLE_NAMES[c.role]}, from ${c.home}`)}</div><div class="char-chips">${chips}</div></div></div>`,
    side: conCard('Skills', rows) + conCard('Asking', `${conRead('Wage', `${fmt(c.wage)} cr/day`)}${conRead('Signing fee', `${fmt(c.fee)} cr`)}<div class="hint">${ROLE_PERKS[c.role](c.skill)}</div>`) + conCard('Interview', talk),
    controls: `<div class="row"><button data-action="interviewHire" ${ok ? '' : 'disabled'}>Hire (${fmt(c.fee)} cr)</button><button data-action="personBack">Back</button></div>`,
  });
}

const interviewButton = i => hired() ? '' : `<button data-action="interview" data-arg="${i}">Interview</button>`;

Mods.register({
  id: 'interview', name: 'Interviews', builtin: true,
  init(M) {
    M.action('interview', i => { G.viewPerson = `bar:${i}`; if (UI.tab !== 'person') { UI.tabBack = UI.tab; UI.tab = 'person'; } });
    M.action('interviewAsk', i => { const c = candidateOf(G.viewPerson); if (c && !hired()) (c.asked = c.asked || [])[Number(i)] = true; });
    M.action('interviewHire', () => {
      const st = G.state, c = candidateOf(G.viewPerson);
      if (!c || hired() || berthsFree() <= 0 || st.credits < c.fee) return;
      G.bar.splice(Number(G.viewPerson.slice(4)), 1);
      registerPerson(c);
      st.credits -= c.fee;
      st.crew.push(c.id);
      G.viewPerson = null;
      UI.tab = UI.tabBack && UI.tabBack !== 'person' ? UI.tabBack : 'crew';
    });
  },
});
