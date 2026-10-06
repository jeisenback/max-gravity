'use strict';

// The character screen: anyone in the game, as a panel in the station console style. It is opened by clicking a
// name (the crew list, the posts on Interior, the people you know), and shows what we know of them: a portrait
// drawn from their data, their skill at each post, what they think of you, and where they are. People who have
// a captain's stats, an age or an ambition (the main characters) show those too. 'you' is the character you play.
// Loaded after bridge.js; only calls into the game at runtime.

const PORTRAIT_SKIN = ['#f1c9a5', '#d9a77a', '#b98156', '#8d5a3b', '#5e3b27'];
const PORTRAIT_HAIR = ['#1a1210', '#2a1d18', '#5a3b22', '#8a6a3a', '#9aa3ab'];
const ROLE_COLLAR = { pilot: '#1d3a5c', gunner: '#5c2a1d', engineer: '#5c4a1d', slicer: '#3a1d5c', quartermaster: '#1d5c3a', medic: '#1d5c5c', captain: '#34506e' };

// A bust in the person's colors: skin, hair and its cut come from their id, the collar from their role.
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

// How the crew see you: the captain and everyone aboard, by what they think of you.
function crewOpinionsCard() {
  const rows = [], h = hired(), cap = h && person(h.captain);
  if (cap && cap.memories) rows.push(conRead(personLink(cap), opinionWord(cap.opinion)));
  for (const id of G.state.crew) { const c = person(id); if (c && c.memories) rows.push(conRead(personLink(c), opinionWord(c.opinion))); }
  return rows.length ? conCard('How they see you', rows.join('')) : '';
}

// A hired hand's place on the ship: whose, which post, how long, what it pays.
function onTheShipCard() {
  const h = hired(), cap = person(h.captain), days = G.state.day - h.since;
  return conCard('On the ship', `${conRead('Captain', cap ? personLink(cap) : 'none')}${conRead('Post', POSTS[h.post].name)}${conRead('Aboard', `${days} day${days === 1 ? '' : 's'}`)}${handHurt() ? conRead('Condition', `hurt, ${h.hurtUntil - G.state.day} days`) : ''}${conRead('Pay', `${fmt(h.wage)} cr/day, ${Math.round(h.share * 100)}% of profit`)}${conRead('Savings', `${fmt(G.state.credits)} cr`)}`);
}

const skillsOf = c => c.skills || (c.role && c.skill !== undefined ? { [c.role]: c.skill } : {});
const pips = n => `<span class="pips">${[1, 2, 3].map(i => `<u class="${i <= n ? 'on' : ''}"></u>`).join('')}</span>`;

function whereIs(c) {
  const st = G.state, ship = (st.fleet || []).find(s => s.captain.pid === c.id);
  if (ship) return `captain of the ${ship.name}, ${ship.dest ? `en route to ${ship.dest}` : `docked at ${ship.at}`}`;
  if (hired() && c.id === hired().captain) return `captain of ${esc(shipTitle())}, ${G.transit ? `en route to ${SYSTEMS[G.transit.to].name}` : `docked at ${st.planet}`}`;
  if (c.you) return `aboard ${esc(shipTitle())}${hired() ? `, ${POSTS[hired().post].name}` : ', in command'}`;
  if (st.crew.includes(c.id)) return `aboard ${esc(shipTitle())}${c.role && ROLE_NAMES[c.role] ? `, ${ROLE_NAMES[c.role]}` : ''}`;
  return c.ship ? `captain of the ${c.ship.name}, around ${SYSTEMS[c.haunt] ? SYSTEMS[c.haunt].name : 'the system'}` : c.location ? `last seen at ${c.location}` : 'whereabouts unknown';
}

// The last few runs with the captain: where, when, what was carried, and what it paid you (wage plus share).
function captainRunsHtml() {
  const ledger = (hired() && hired().ledger) || [];
  if (!ledger.length) return conCard('Recent runs', '<p class="hint">No runs together yet. You are paid on arrival.</p>');
  const rows = ledger.slice(0, 5).map(l => {
    const good = (COMMODITIES.find(c => c.id === l.good) || {}).name || l.good || 'cargo';
    return `<div class="con-read"><span>${esc(l.from)} to ${esc(l.to)}</span><b>+${fmt(l.wage + l.share)} cr</b></div><div class="hint">${dateOf(l.day)}, ${l.tons}t ${esc(good)}, profit ${fmt(l.profit)} cr</div>`;
  }).join('');
  return conCard('Recent runs', rows);
}

// What they have told you, a beat at a time, from the talks in family.js. Nothing is shown that has not been said.
function toldCard(c) {
  const s = c.story;
  if (c.you || !s) return '';
  const lines = [];
  if (s.beat >= 1) lines.push(`Left ${c.home} because of ${s.left}.`);
  if (s.beat >= 2) lines.push(`Misses their ${s.rel}, ${s.name}.`);
  if (s.beat >= 3) lines.push(`Wants ${s.hope}.`);
  if (s.beat === 3 && s.favor) lines.push('Has a favor to ask.');
  if (s.beat >= 4) lines.push(s.favor === 'visit' ? 'You promised to take them home.' : 'You paid what they owed.');
  if (c.loyal) lines.push('Loyal: they will follow the ship anywhere.');
  return conCard('Told you', lines.length ? lines.map(l => `<div class="hint">${esc(l)}</div>`).join('') : '<div class="hint">Nothing yet. Sit with them during a burn.</div>');
}

// Why two people get on or do not: clashing habits, and tastes they share.
function tieReason(a, b) {
  const ta = tastes(a), tb = tastes(b), why = [];
  const c = CLASHES.find(([x, y]) => (has(a, x) && has(b, y)) || (has(a, y) && has(b, x)));
  if (c) why.push(`${TRAITS[c[0]].adj} and ${TRAITS[c[1]].adj}`);
  const fr = factionReason(a.p, b.p); if (fr) why.push(fr);
  if (ta.genre === tb.genre) why.push(`both like ${GENRES[ta.genre]}`);
  if (ta.team === tb.team) why.push(`both follow the ${ta.team}`);
  return why.join('; ');
}

// Whom they belong to, their status there, and what they think of each faction (ties.js). For you, what each faction thinks of you.
function factionCard(c) {
  if (c.you) {
    const t = youTies();
    return conCard('Your ties', `${conRead('Affiliation', `${t.aff} (${t.status[t.aff]})`)}${FACTIONS.map(f => conRead(f === 'Pirate' ? 'Pirates' : f, `regards you as ${t.standing[f].toLowerCase()}`)).join('')}`);
  }
  if (!c.id) return '';
  const t = tiesOf(c), held = Object.entries(t.status).filter(([f]) => f !== t.aff).map(([f, s]) => `${s} in ${shortFaction(f).replace('the ', '')}`);
  return conCard('Ties', `${conRead('Affiliation', t.aff ? `${t.aff} (${t.status[t.aff]})` : 'none')}${held.length ? `<div class="hint">${esc(held.join('; '))}.</div>` : ''}${FACTIONS.map(f => conRead(f === 'Pirate' ? 'Pirates' : f.replace(/ .*/, ''), regardWord(t.regard[f]))).join('')}`);
}

// The strongest bonds with the others aboard (social.js keeps them).
function tiesCard(c) {
  const list = folk(), me = list.find(f => f.id === c.id);
  if (c.you || !me) return '';
  const rows = list.filter(f => f !== me).map(f => ({ f, n: bond(me, f) })).filter(t => bondWord(t.n)).sort((x, y) => Math.abs(y.n) - Math.abs(x.n)).slice(0, 4);
  if (!rows.length) return '';
  return conCard('Aboard', rows.map(({ f, n }) => { const why = tieReason(me, f); return `${conRead(personLink(f.p), bondWord(n))}${why ? `<div class="hint">${esc(why)}</div>` : ''}`; }).join(''));
}

function characterPanel() {
  if (candidateOf(G.viewPerson)) return interviewPanel();
  const st = G.state, id = G.viewPerson, c = id === 'you' ? youPerson() : person(id);
  if (!c) return `<p class="hint">Nobody by that name is known to you.</p><div class="row"><button data-action="personBack">Back</button></div>`;
  const skills = skillsOf(c), crewed = st.crew.includes(c.id);
  const rows = HIRED_POSTS.map(p => {
    const role = POSTS[p].role, n = skills[role] || 0, posted = c.you ? !!hired() && hired().post === p : crewed && postHolder(p) === c;
    const xp = c.xp && c.xp[role] !== undefined ? c.xp[role] : null, next = xp === null ? null : SKILL_STEPS.find(s => s > xp);
    return `<div class="con-part char-skill"><span>${POSTS[p].name}${posted ? ' <i class="char-tag">posted</i>' : ''}</span>${pips(n)}<b>${n}</b><span class="hint char-xp">${xp === null ? '' : next ? `${xp} / ${next}` : xp}</span></div>`;
  }).join('');
  const chips = [...(c.traits || []).map(t => `<span class="char-chip">${TRAITS[t].adj}</span>`), moodLow(c) ? '<span class="char-chip warn">having a hard time</span>' : moodHigh(c) ? '<span class="char-chip good">in high spirits</span>' : ''].join('');
  const isCaptain = c.role === 'captain', hand = hired();
  const sub = [isCaptain ? 'Captain' : c.role && ROLE_NAMES[c.role] ? ROLE_NAMES[c.role] : c.job, c.age ? `${c.age}` : '', c.home ? `from ${c.home}` : ''].filter(Boolean).join(', ');
  const grade = c.captain && c.cast ? captainGrade(c) : null;
  const cap = (c.you && hired() ? onTheShipCard() + crewOpinionsCard() : '') + (c.captain ? conCard('Captain', ['trade', 'nerve', 'thrift'].map(k => `<div class="con-part char-cap"><span>${k[0].toUpperCase() + k.slice(1)}</span>${conBar(c.captain[k] / 5 * 100, '#6fb0ff')}<b>${c.captain[k]} / 5</b></div>`).join('') + (grade ? conRead('Ready to captain', grade.ready ? 'yes' : `skill ${grade.skill} of ${CAPTAIN_SKILL}, ${grade.days} of ${CAPTAIN_DAYS} days`) : '')) : '');
  const standing = c.memories ? conCard('Standing with you', `${conRead('Opinion', opinionWord(c.opinion))}${conBar(Math.max(0, Math.min(10, c.opinion + 5)) * 10, c.opinion >= 0 ? '#5fd35f' : '#ff6a4a')}
    ${c.memories.length ? `<div class="eyebrow" style="margin-top:8px">Remembers</div>${c.memories.slice(-3).reverse().map(m => `<div class="hint">${m}</div>`).join('')}` : ''}`) : '';
  // A captain holds no post: what they pay you and what you earn with them (a hired hand), or what you command (an owner).
  const command = !isCaptain ? '' : c.you
    ? conCard('Command', `${conRead('Ship', `${esc(shipTitle())}, ${ship().name}`)}${conRead('Crew', `${st.crew.length}, ${berthsUsed()}/${ship().berths} berths`)}${(st.fleet || []).length ? conRead('Company', `${st.fleet.length} ship${st.fleet.length > 1 ? 's' : ''}`) : ''}`) + crewOpinionsCard()
    : hand && c.id === hand.captain ? conCard('Command', `${conRead('Your wage', `${fmt(hand.wage)} cr/day`)}${conRead('Your share', `${Math.round(hand.share * 100)}% of each run's profit`)}${conRead('Runs together', runTotals(hand).runs)}${conRead('You earned', `${fmt(runTotals(hand).earned)} cr`)}${conRead('The ship\'s funds', `${fmt(hand.fund)} cr`)}`) + captainRunsHtml() : '';
  const marked = marksOf(c).length ? conCard('Marks', marksOf(c).map(m => `<div class="hint">${esc(dateOf(m.day))}: ${esc(m.text)}</div>`).join('')) : '';
  const news = (moodLow(c) || moodHigh(c)) && c.mood.text ? `<div class="hint">News from home: ${esc(c.mood.text)}.</div>` : '';
  const blurb = c.ambition ? `<div class="char-amb">${c.ambition}</div>` : c.bio ? `<div class="char-amb">${c.bio}</div>` : '';
  return consoleHtml({
    title: fullName(c), status: c.you ? 'Playing as' : whereIs(c),
    screen: `<div class="char-id">${portraitSvg(c)}<div><div class="char-name">${esc(fullName(c))}</div><div class="hint">${esc(sub)}</div><div class="char-chips">${chips}</div>${news}${blurb}</div></div>`,
    side: isCaptain ? command + factionCard(c) + standing : conCard('Post skills', rows) + cap + marked + toldCard(c) + tiesCard(c) + factionCard(c)
      + (c.you ? '' : conCard('Where', `${conRead('Aboard', crewed ? esc(shipTitle()) : 'no')}${crewed && wage(c.id) ? conRead('Wage', `${fmt(wage(c.id))} cr/day`) : ''}${!crewed ? `<div class="hint">${whereIs(c)}</div>` : ''}`)) + standing,
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

// Who a scene is about: the people it names, from those aboard, the captain, and the bar. An event can also list them in `people`
// (ids). Three at most, in the order the text names them.
function scenePeople(ev) {
  if (!ev) return [];
  if (ev.people) return ev.people.map(id => person(id)).filter(Boolean);
  const st = G.state, text = `${ev.title} ${ev.text}`, h = hired();
  const pool = [...st.crew.map(person), ...paxAboard().map(m => m.pid && st.people[m.pid]), ...(G.bar || []), ...(G.patrons || []).map(x => x.p), h && person(h.captain)].filter(c => c && c.first && c.first.length > 2);
  const at = c => { const m = text.match(new RegExp(`\\b${c.first.replace(/[^\w]/g, '')}\\b`)); return m ? m.index : -1; };
  const seen = new Set();
  return pool.filter(c => !seen.has(c.first) && seen.add(c.first) && at(c) >= 0).sort((a, b) => at(a) - at(b)).slice(0, 3);
}

function sceneFacesHtml(ev) {
  const people = scenePeople(ev);
  return people.length ? `<div class="scene-faces">${people.map(c => {
    const ring = moodLow(c) ? 'warn' : moodHigh(c) ? 'good' : '';
    return `<div class="scene-face"><div class="face ${ring}">${portraitSvg(c)}</div><span>${esc(c.first)}</span></div>`;
  }).join('')}</div>` : '';
}

// Where the captain or the first officer now stands, when a result carried them across a cutoff (OPINION, people.js): the word for the
// highest cutoff crossed going up, or the lowest going down. Anyone else, or a change inside a band, gets none.
const CROSS_UP = [[OPINION.TRUSTED, 'trusts you now'], [OPINION.FRIEND, 'friendly now'], [OPINION.CLOSE, 'easy with you now']];
const CROSS_DOWN = [[OPINION.GRUDGE, 'holds it against you now'], [OPINION.ENEMY, 'wary of you now']];
function crossWord(p, n) {
  const h = typeof hired === 'function' ? hired() : null, xo = h && hiredXo();
  if (!h || !(p.id === h.captain || (xo && p.id === xo.id))) return '';
  const before = p.opinion - n, hit = (n > 0 ? CROSS_UP : CROSS_DOWN).find(([c]) => (n > 0 ? before < c && p.opinion >= c : before > c && p.opinion <= c));
  return hit ? hit[1] : '';
}

// What a choice did to how people feel, as lines under the result: the changes like() (people.js) and addBond() (social.js) logged.
function shiftLines(log) {
  const who = new Map(), byPair = new Map();
  for (const s of log) {
    if (s.p) who.set(s.p, (who.get(s.p) || 0) + s.n);
    else { const k = [s.a.id, s.b.id].sort().join('|'), e = byPair.get(k) || { a: s.a, b: s.b, n: 0 }; e.n += s.n; byPair.set(k, e); }
  }
  const lines = [
    ...[...who].filter(([, n]) => n).map(([p, n]) => ({ n, text: `${p.first} thinks ${Math.abs(n) >= 3 ? 'much ' : ''}${n > 0 ? 'better' : 'less'} of you${crossWord(p, n) ? `: ${crossWord(p, n)}` : ''}` })),
    ...[...byPair.values()].filter(e => e.n).map(e => ({ n: e.n, text: `${e.a.first} and ${e.b.first} are ${e.n > 0 ? 'closer' : 'further apart'}` })),
  ].sort((a, b) => Math.abs(b.n) - Math.abs(a.n));
  if (!lines.length) return '';
  const shown = lines.slice(0, 4).map(l => `<div class="${l.n > 0 ? 'up' : 'down'}">${esc(l.text)}.</div>`);
  if (lines.length > 4) shown.push(`<div>${lines.length - 4} more feel it too.</div>`);
  return `<div class="shifts">${shown.join('')}</div>`;
}
