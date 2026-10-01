'use strict';

// The character screen: anyone in the game, as a panel in the station console style. It is opened by clicking a
// name (the crew list, the posts on Interior, the people you know), and shows what we know of them: a portrait
// drawn from their data, their skill at each post, what they think of you, and where they are. People who have
// a captain's stats, an age or an ambition (the main characters) show those too. 'you' is the character you play.
// Loaded after bridge.js; only calls into the game at runtime.

const PORTRAIT_SKIN = ['#f1c9a5', '#d9a77a', '#b98156', '#8d5a3b', '#5e3b27'];
const PORTRAIT_HAIR = ['#1a1210', '#2a1d18', '#5a3b22', '#8a6a3a', '#9aa3ab'];
const ROLE_COLLAR = { pilot: '#1d3a5c', gunner: '#5c2a1d', engineer: '#5c4a1d', slicer: '#3a1d5c', quartermaster: '#1d5c3a', medic: '#1d5c5c', captain: '#34506e' };

// A bust in the person's colours: skin, hair and its cut come from their id, the collar from their role.
function portraitSvg(c) {
  const h = Math.abs(hash(String(c.id || c.name || 'x'))), skin = PORTRAIT_SKIN[h % 5], hair = PORTRAIT_HAIR[(h >> 3) % 5], cut = (h >> 6) % 3, collar = ROLE_COLLAR[c.role] || '#34506e';
  const cap = cut === 0 ? 'M58 88 Q60 40 100 38 Q142 40 142 88 Q130 62 100 62 Q70 62 58 88Z'
    : cut === 1 ? 'M54 120 Q48 40 100 36 Q152 40 146 120 Q138 70 100 64 Q62 70 54 120Z'
    : 'M62 80 Q66 48 100 46 Q134 48 138 80 Q126 66 100 66 Q74 66 62 80Z';
  return `<svg class="char-portrait" viewBox="0 0 200 200" role="img" aria-label="Portrait of ${esc(fullName(c))}"><rect width="200" height="200" fill="#07101a"/>
    <circle cx="100" cy="200" r="86" fill="${collar}"/><rect x="86" y="120" width="28" height="30" rx="8" fill="${skin}" opacity=".9"/>
    <ellipse cx="100" cy="92" rx="38" ry="44" fill="${skin}"/><path d="${cap}" fill="${hair}"/>
    <circle cx="86" cy="94" r="3.5" fill="#1a1210"/><circle cx="114" cy="94" r="3.5" fill="#1a1210"/>
    <path d="M88 116 Q100 124 112 116" stroke="#1a1210" stroke-opacity=".55" stroke-width="3" fill="none" stroke-linecap="round"/></svg>`;
}

const personLink = c => `<button class="link" data-action="person" data-arg="${esc(c.id || 'you')}">${esc(fullName(c))}</button>`;
const youLink = () => `<button class="link" data-action="person" data-arg="you">You</button>`;

// The player as a person: their post and what they have learned at each post, if they are a hired hand.
function youPerson() {
  const h = hired();
  return { id: 'you', name: captain().name, role: h ? POSTS[h.post].role : 'captain', you: true, home: system().name,
    skills: h ? Object.fromEntries(HIRED_POSTS.map(p => [POSTS[p].role, skillLevel(p)])) : {}, xp: h ? Object.fromEntries(HIRED_POSTS.map(p => [POSTS[p].role, skillXp(p)])) : {} };
}

const skillsOf = c => c.skills || (c.role && c.skill !== undefined ? { [c.role]: c.skill } : {});
const pips = n => `<span class="pips">${[1, 2, 3].map(i => `<u class="${i <= n ? 'on' : ''}"></u>`).join('')}</span>`;

function whereIs(c) {
  const st = G.state;
  if (c.you) return `aboard ${shipTitle()}${hired() ? `, ${POSTS[hired().post].name}` : ', in command'}`;
  if (st.crew.includes(c.id)) return `aboard ${shipTitle()}${c.role && ROLE_NAMES[c.role] ? `, ${ROLE_NAMES[c.role]}` : ''}`;
  return c.ship ? `captain of the ${c.ship.name}, around ${SYSTEMS[c.haunt] ? SYSTEMS[c.haunt].name : 'the system'}` : c.location ? `last seen at ${c.location}` : 'whereabouts unknown';
}

function characterPanel() {
  const st = G.state, id = G.viewPerson, c = id === 'you' ? youPerson() : person(id);
  if (!c) return `<p class="hint">Nobody by that name is known to you.</p><div class="row"><button data-action="personBack">Back</button></div>`;
  const skills = skillsOf(c), crewed = st.crew.includes(c.id);
  const rows = HIRED_POSTS.map(p => {
    const role = POSTS[p].role, n = skills[role] || 0, posted = c.you ? !!hired() && hired().post === p : crewed && postHolder(p) === c;
    return `<div class="con-part char-skill"><span>${POSTS[p].name}${posted ? ' <i class="char-tag">posted</i>' : ''}</span>${pips(n)}<b>${n}</b></div>`;
  }).join('');
  const xp = c.xp && c.role && c.xp[c.role] !== undefined ? c.xp[c.role] : null, next = xp === null ? null : SKILL_STEPS.find(s => s > xp);
  const chips = [...(c.traits || []).map(t => `<span class="char-chip">${TRAITS[t].adj}</span>`), moodLow(c) ? '<span class="char-chip warn">having a hard time</span>' : moodHigh(c) ? '<span class="char-chip good">in high spirits</span>' : ''].join('');
  const sub = [c.role && ROLE_NAMES[c.role] ? ROLE_NAMES[c.role] : c.you ? 'Captain' : c.job, c.age ? `${c.age}` : '', c.home ? `from ${c.home}` : ''].filter(Boolean).join(', ');
  const cap = c.captain ? conCard('Captain', ['trade', 'nerve', 'thrift'].map(k => `<div class="con-part char-cap"><span>${k[0].toUpperCase() + k.slice(1)}</span>${conBar(c.captain[k] / 5 * 100, '#6fb0ff')}<b>${c.captain[k]} / 5</b></div>`).join('')) : '';
  const standing = c.memories ? conCard('Standing with you', `${conRead('Opinion', opinionWord(c.opinion))}${conBar(Math.max(0, Math.min(10, c.opinion + 5)) * 10, c.opinion >= 0 ? '#5fd35f' : '#ff6a4a')}
    ${c.memories.length ? `<div class="eyebrow" style="margin-top:8px">Remembers</div>${c.memories.slice(-3).reverse().map(m => `<div class="hint">${m}</div>`).join('')}` : ''}`) : '';
  const blurb = c.ambition ? `<div class="char-amb">${c.ambition}</div>` : c.bio ? `<div class="char-amb">${c.bio}</div>` : '';
  return consoleHtml({
    title: fullName(c), status: c.you ? 'Playing as' : whereIs(c),
    screen: `<div class="char-id">${portraitSvg(c)}<div><div class="char-name">${esc(fullName(c))}</div><div class="hint">${esc(sub)}</div><div class="char-chips">${chips}</div>${blurb}</div></div>`,
    side: conCard('Post skills', `${rows}${xp !== null ? conRead('Experience', next ? `${xp} / ${next}` : `${xp} (most)`) : ''}`) + cap
      + (c.you ? '' : conCard('Where', `${conRead('Aboard', crewed ? shipTitle() : 'no')}${crewed && wage(c.id) ? conRead('Wage', `${fmt(wage(c.id))} cr/day`) : ''}${!crewed ? `<div class="hint">${whereIs(c)}</div>` : ''}`)) + standing,
    controls: '<div class="row"><button data-action="personBack">Back</button></div>',
  });
}

UI.views.person = characterPanel;

Mods.register({
  id: 'character', name: 'Character screen', builtin: true,
  init(M) {
    M.action('person', id => { G.viewPerson = id; if (G.transit) G.bridgeOpen = 'person'; else if (UI.tab !== 'person') { UI.tabBack = UI.tab; UI.tab = 'person'; } });
    M.action('personBack', () => { if (G.transit) G.bridgeOpen = 'interior'; else UI.tab = UI.tabBack && UI.tabBack !== 'person' ? UI.tabBack : 'crew'; });
  },
});
