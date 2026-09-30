'use strict';

// Life between people, and the culture they share. Everyone aboard (crew, and passengers
// you know by name) has a bond with everyone else in st.bonds: it drifts with shared
// tastes and clashing traits over a burn, and moves with what happens aboard. Each
// person has tastes (a favorite kind of vid or book, and a ring-ball team from home).
//
// The culture: every season brings a hit vid series, a bestseller, a song everyone is
// humming, a couple of stars for the gossip feeds, and a ring-ball league with matches
// every few days (st.culture). It reaches you as feed chatter in transit, crew
// reactions, and headlines at port. Downtime activities (watching together, passing
// a book around, streaming a match, card night) and relationship scenes in transit
// build or break bonds. Passengers who liked the trip may be waiting at a later port
// to book again. Loaded before game.js; only calls into it at runtime.

const SEASON_DAYS = 40, MATCH_EVERY = 4;
const GENRES = {
  noir: 'Belter noir', war: 'war drama', soap: 'station soap', romance: 'romance',
  comedy: 'comedy', horror: 'horror', doc: 'documentary', action: 'action serial',
};
const TEAMS = {
  'Ceres Breakers': 'belt', 'Pallas Smelters': 'belt', 'Hygiea Ghosts': 'belt',
  'Tharsis Red Tide': 'mars', 'Hellas Diggers': 'mars',
  'Luna Grays': 'earth', 'Lagos Orbitals': 'earth', 'Titan Frost': 'earth',
};
const BANDS = ['The Pallas Smelt', 'Nine Sector', 'Dust Choir', 'Red Tide Brass', 'Luna Static', 'Hollow Moons', 'Vesna and the Welders', 'Low Orbit', 'The Ration Cards', 'Kez Ghosh Trio'];
const TITLE_A = ['Cold', 'Silent', 'Last', 'Red', 'Hollow', 'Burning', 'Long', 'Bright', 'Broken', 'Iron', 'Quiet', 'Drifting', 'Borrowed', 'Salt'];
const TITLE_N = ['Orbit', 'Harbor', 'Tide', 'Signal', 'Dust', 'Ice', 'Garden', 'Line', 'Horizon', 'Station', 'Promise', 'Crown', 'Rations', 'Water'];
const PLACES = ['Ceres', 'Luna', 'the Belt', 'Tharsis', 'Europa', 'Titan', 'Pallas', 'Hellas', 'Ganymede', 'Hygiea'];
const HOME_CULTURE = { 'Ceres Station': 'belt', 'The Rook': 'belt', Mars: 'mars', Luna: 'earth', Ganymede: 'earth' };

const title = () => pick([
  () => `The ${pick(TITLE_A)} ${pick(TITLE_N)}`, () => `${pick(TITLE_N)} of ${pick(PLACES)}`,
  () => `${pick(TITLE_A)} ${pick(TITLE_N)}`, () => `Beyond ${pick(PLACES)}`, () => `${pick(TITLE_N)} Over ${pick(PLACES)}`,
])();
const who = () => { const p = makePerson(); return `${p.first} ${p.last}`; };

// ---------- the season ----------
function culture() {
  const st = G.state;
  if (!st.culture || st.day >= st.culture.start + SEASON_DAYS) newSeason();
  return st.culture;
}

function newSeason() {
  const st = G.state, old = st.culture;
  if (old) {
    const champ = Object.entries(old.table).sort((a, b) => b[1] - a[1])[0][0];
    worldNews(`The ${champ} win the ring-ball championship. Their fans will be unbearable for months.`);
  }
  st.culture = {
    season: old ? old.season + 1 : 1, start: st.day, episode: 1,
    vid: { title: title(), genre: pick(Object.keys(GENRES)) },
    book: { title: title(), genre: pick(Object.keys(GENRES)), author: who() },
    song: { title: title(), band: pick(BANDS) },
    stars: [who(), who()],
    table: Object.fromEntries(Object.keys(TEAMS).map(t => [t, 0])),
    last: null, nextMatch: st.day + 1,
  };
}

// A ring-ball match between two teams (random ones if not given). Returns the result.
function playMatch(a, b) {
  const c = culture();
  if (!a) [a, b] = [pick(Object.keys(TEAMS)), null];
  while (!b || b === a) b = pick(Object.keys(TEAMS));
  let sa = randInt(0, 5), sb = randInt(0, 5);
  if (sa === sb) (Math.random() < 0.5 ? sa++ : sb++);  // ring-ball has no draws
  c.table[sa > sb ? a : b]++;
  return (c.last = { a, b, sa, sb, winner: sa > sb ? a : b, loser: sa > sb ? b : a, day: G.state.day });
}

function cultureDay() {
  const c = culture();
  if (G.state.day >= c.nextMatch) {
    playMatch();
    c.nextMatch = G.state.day + MATCH_EVERY;
    c.episode++;
  }
}

// ---------- people aboard, tastes, and bonds ----------
function folk() {
  const st = G.state, out = st.crew.map(id => ({ id, p: person(id), crew: true }));
  for (const m of paxAboard()) if (m.pid && st.people[m.pid]) out.push({ id: m.pid, p: st.people[m.pid], crew: false });
  return out;
}

function tastes(f) {
  const h = s => Math.abs(hash(f.id + s)), culture = f.p.culture || HOME_CULTURE[f.p.home] || 'earth';
  const teams = Object.keys(TEAMS).filter(t => TEAMS[t] === culture);
  return { genre: Object.keys(GENRES)[h('g') % 8], team: teams[h('t') % teams.length] };
}

const bondKey = (a, b) => [a.id, b.id].sort().join('|');
const bonds = () => (G.state.bonds = G.state.bonds || {});
const bond = (a, b) => bonds()[bondKey(a, b)] || 0;
function addBond(a, b, n) {
  const k = bondKey(a, b);
  bonds()[k] = Math.max(-10, Math.min(10, (bonds()[k] || 0) + n));
}
function bondWord(n) {
  return n >= 6 ? 'close' : n >= 3 ? 'friends' : n >= 1 ? 'friendly' : n > -1 ? null : n > -3 ? 'prickly' : n > -6 ? 'rivals' : 'can\'t stand each other';
}
const pairs = list => list.flatMap((a, i) => list.slice(i + 1).map(b => [a, b]));
const has = (f, t) => (f.p.traits || []).includes(t);
const CLASHES = [['rude', 'nervous'], ['drunk', 'pious'], ['greedy', 'generous'], ['talkative', 'secretive'], ['rude', 'kind']];
const clash = (a, b) => CLASHES.some(([x, y]) => (has(a, x) && has(b, y)) || (has(a, y) && has(b, x)));

// A day together aboard: shared tastes pull people together, clashing habits apart.
function bondDay() {
  if (!G.transit) return;
  for (const [a, b] of pairs(folk())) {
    const ta = tastes(a), tb = tastes(b);
    let d = (ta.genre === tb.genre ? 0.15 : 0) + (ta.team === tb.team ? 0.1 : 0) + (clash(a, b) ? -0.2 : 0.03);
    if (bond(a, b) >= 6 && clash(a, b)) d += 0.2;  // love conquers some things
    addBond(a, b, d);
  }
}

// ---------- the feeds ----------
function feedLine() {
  const c = culture(), st = G.state, g = GENRES[c.vid.genre], [s1, s2] = c.stars;
  const lines = [
    `"${c.vid.title}" is the most-watched ${g} on the Mars feeds this week.`,
    `Critics on Luna call "${c.vid.title}" ${pick(['"a triumph"', '"two hours I want back"', '"overlong but gorgeous"', '"a crime against drama"', '"the best thing since the Belt Wars series"'])}.`,
    `Episode ${c.episode} of "${c.vid.title}" ends on a cliffhanger. Half the Belt is furious.`,
    `"${c.book.title}" by ${c.book.author} tops the reading lists again.`,
    `${c.book.author} denies that "${c.book.title}" is about a real Coalition admiral.`,
    `"${c.song.title}" by ${c.song.band} is on every station playlist from Mercury to Titan.`,
    `${c.song.band} cancel their Ceres concert, citing "water ration reasons".`,
    `${s1}, star of "${c.vid.title}", was spotted on ${pick(PLACES)} with ${s2}. Nobody is confirming anything.`,
    `${s1} walked off the set of "${c.vid.title}" after a fight about the lighting.`,
    `${s2} and ${s1} are feuding on the feeds again. It is the best thing on.`,
    `A leaked script says ${s1}'s character dies in the "${c.vid.title}" finale.`,
  ];
  if (c.last) lines.push(`Ring-ball: ${c.last.a} ${c.last.sa}, ${c.last.b} ${c.last.sb}.`);
  const top = Object.entries(c.table).sort((a, b) => b[1] - a[1])[0];
  if (top[1] > 0) lines.push(`The ${top[0]} lead the ring-ball league with ${top[1]} wins.`);
  const w = factionState().war;
  if (w) lines.push(`War dramas are all anyone in ${w.a} space watches now, and the ${w.b} feeds are no better.`);
  // Dock gossip about people you know.
  const known = Object.values(st.people).filter(p => p.location && p.memories.length && Math.abs(p.opinion) >= 2);
  if (known.length) {
    const p = pick(known), mem = p.memories[p.memories.length - 1].replace(/^(Day \d+|\d+ \w+ \d+): /, '');
    lines.push(`Dock gossip from ${p.location}: ${p.first} ${p.last} is still telling anyone who listens, "${mem}"`);
  }
  return `[Feed] ${pick(lines)}`;
}

// What people aboard say about the culture and each other.
function socialLines() {
  const c = culture(), list = folk(), out = [];
  for (const f of list) {
    const t = tastes(f), n = f.p.first;
    if (c.last && c.last.day >= G.state.day - 3 && (t.team === c.last.winner || t.team === c.last.loser)) {
      const rival = list.find(o => o !== f && tastes(o).team === (t.team === c.last.winner ? c.last.loser : c.last.winner));
      out.push(t.team === c.last.winner
        ? `${n}: "${t.team}, ${Math.max(c.last.sa, c.last.sb)} to ${Math.min(c.last.sa, c.last.sb)}!${rival ? ` Pay up, ${rival.p.first}.` : ''}"`
        : `${n} does not want to talk about the ${t.team} game.`);
    }
    if (t.genre === c.vid.genre) out.push(`${n} is rewatching "${c.vid.title}" in their bunk. Again.`);
    if (t.genre === c.book.genre) out.push(`${n} is halfway through "${c.book.title}" and keeps reading bits aloud.`);
  }
  out.push(`Someone has had "${c.song.title}" stuck in their head since the last port, and now so does everyone.`);
  for (const [a, b] of pairs(list)) {
    const n = bond(a, b), A = a.p.first, B = b.p.first;
    if (n >= 6) out.push(`${A} and ${B} have pushed their bunks together. Nobody says anything.`, `${A} saved ${B} the last of the good coffee.`);
    else if (n >= 3) out.push(`${A} and ${B} are laughing at something on ${A}'s terminal.`, `${A} is teaching ${B} a card game from ${a.p.home}.`);
    else if (n <= -3) out.push(`${A} and ${B} are not speaking. It is a small ship.`, `${A} ate ${B}'s labeled rations. On purpose, according to ${B}.`);
  }
  return out;
}

// ---------- downtime together ----------
const everyone = () => { for (const p of shipPeople()) goTo(p, 'galley'); };
const names = list => (list.length > 1 ? `${list.slice(0, -1).map(f => f.p.first).join(', ')} and ${list[list.length - 1].p.first}` : list[0].p.first);

function shareActivity(genre, fanBonus) {
  const list = folk(), fans = list.filter(f => tastes(f).genre === genre);
  for (const [a, b] of pairs(list)) addBond(a, b, 0.5 + (fans.includes(a) && fans.includes(b) ? fanBonus : 0));
  for (const f of fans) like(f.p, 1, null);
  return { list, fans, bored: list.filter(f => !fans.includes(f)) };
}

const SOCIAL_ACTIVITIES = {
  vids: {
    label: () => `Watch "${culture().vid.title}" together`, can: () => folk().length > 0,
    run() {
      const c = culture(), { fans, bored, list } = shareActivity(c.vid.genre, 1.5);
      everyone();
      const feud = pairs(list).find(([a, b]) => bond(a, b) <= -3);
      return [`You crowd into the galley for episode ${c.episode} of "${c.vid.title}", a ${GENRES[c.vid.genre]}.`,
        fans.length ? `${names(fans)} ${fans.length > 1 ? 'know' : 'knows'} every line.` : 'Nobody is a fan, which somehow makes it funnier.',
        bored.length ? `${pick(bored).p.first} falls asleep before the first act break.` : '',
        feud ? `${feud[0].p.first} and ${feud[1].p.first} argue about the ending for an hour, which is almost friendly.` : ''].filter(Boolean).join(' ');
    },
  },
  book: {
    label: () => `Pass around "${culture().book.title}"`, can: () => folk().length > 0,
    run() {
      const c = culture(), { fans, bored } = shareActivity(c.book.genre, 2);
      return [`The ship's one printed copy of "${c.book.title}" by ${c.book.author} does the rounds.`,
        fans.length ? `${names(fans)} ${fans.length > 1 ? 'fight over who reads it next' : 'reads it twice'}.` : '',
        bored.length ? `${pick(bored).p.first} leaves pointed notes in the margins.` : '',
        fans.length > 1 ? 'By the end of the burn there is a book club, and it has opinions.' : ''].filter(Boolean).join(' ');
    },
  },
  match: {
    label: () => 'Stream the ring-ball match', can: () => folk().length > 0,
    run() {
      const list = folk(), teams = [...new Set(list.map(f => tastes(f).team))];
      const m = playMatch(teams[0], teams[1]);
      const won = list.filter(f => tastes(f).team === m.winner), lost = list.filter(f => tastes(f).team === m.loser);
      for (const [a, b] of pairs(list)) {
        const ta = tastes(a).team, tb = tastes(b).team;
        addBond(a, b, ta === tb ? 1.5 : (won.includes(a) && lost.includes(b)) || (won.includes(b) && lost.includes(a)) ? (has(a, 'rude') || has(b, 'rude') ? -1 : 0.5) : 0.5);
      }
      for (const f of won) like(f.p, 1, null);
      everyone();
      return [`The lagged stream from ${pick(PLACES)} comes in: ${m.a} against ${m.b}. Final score ${m.sa} to ${m.sb}.`,
        won.length ? `${names(won)} ${won.length > 1 ? 'are' : 'is'} unbearable for the rest of the day.` : '',
        lost.length ? `${names(lost)} ${lost.length > 1 ? 'take' : 'takes'} it ${lost.some(f => has(f, 'rude')) ? 'badly' : 'with some grace'}.` : '',
        !won.length && !lost.length ? 'Nobody aboard cares who wins, so everyone picks a side for the fun of it.' : ''].filter(Boolean).join(' ');
    },
  },
  cards: {
    label: () => 'Card night', can: () => folk().length > 0,
    run() {
      const list = folk(), st = G.state;
      for (const [a, b] of pairs(list)) addBond(a, b, 0.7);
      everyone();
      if (Math.random() < 0.35) {
        const won = randInt(2, 6) * 100;
        st.credits += won;
        return `You clean everyone out for ${fmt(won)} cr. ${pick(list).p.first} swears the deck is marked. It isn't. Probably.`;
      }
      const w = pick(list), lost = Math.min(st.credits, randInt(1, 4) * 100), gossip = socialLines().filter(l => / and /.test(l));
      st.credits -= lost;
      return `${w.p.first} takes the pot, and ${fmt(lost)} cr of yours with it. Over the last hand you hear the ship's gossip${gossip.length ? `: ${pick(gossip)}` : ', which is mostly about you.'}`;
    },
  },
};

// ---------- relationship scenes in transit ----------
const CAUSES = ['the last of the coffee', 'music in the berths at all hours', 'a ring-ball bet', 'whose turn it is to scrub the recycler', 'a borrowed jacket that came back torn', 'the thermostat'];
// A repeatable scene waits its turn per pair, so the same two people do not have the
// same talk every burn: isCooled asks, cool starts the wait.
const isCooled = (a, b, what, days) => { const d = (G.state.qualities || {})[`social:cool:${what}:${bondKey(a, b)}`]; return d !== undefined && G.state.day - d < days; };
const cool = (a, b, what) => { (G.state.qualities = G.state.qualities || {})[`social:cool:${what}:${bondKey(a, b)}`] = G.state.day; };
const stamped = (a, b, what) => {
  const st = G.state.qualities = G.state.qualities || {}, k = `social:${what}:${bondKey(a, b)}`;
  if (st[k]) return true;
  st[k] = 1;
  return false;
};

function relationshipScene() {
  const list = folk(), st = G.state;
  if (list.length < 2) return null;
  const all = pairs(list), scenes = [];
  for (const [a, b] of all) {
    const n = bond(a, b), A = a.p.first, B = b.p.first;
    if (n >= 6 && a.crew && b.crew) scenes.push(() => !stamped(a, b, 'together') && {
      title: 'Ship\'s Rules', text: `${A} and ${B} find you on the bridge, standing a little closer than they need to. "Captain. Does the ship have rules about crew who are, um. Together?"`,
      choices: [
        { label: '"No rules. Be happy."', run() { like(a.p, 2, `You gave ${B} and me your blessing.`); like(b.p, 2, `You gave ${A} and me your blessing.`); return 'They leave hand in hand. By dinner the whole ship knows, and somehow the galley smells better.'; } },
        { label: '"Keep it off the bridge."', run() { like(a.p, 1, null); like(b.p, 1, null); return '"Deal." They both grin.'; } },
        { label: '"It stays professional."', run() { addBond(a, b, -2); like(a.p, -2, `You told ${B} and me to keep it professional.`); like(b.p, -2, `You told ${A} and me to keep it professional.`); return 'They nod stiffly. The ship gets a lot quieter.'; } },
      ] });
    else if (n >= 3 && !isCooled(a, b, 'close', 40)) scenes.push(() => cool(a, b, 'close') || ({
      title: 'Close Quarters', text: `${A} and ${B} keep finding reasons to share the same watch.`,
      choices: [
        { label: 'Put them on the same rotation', run() { addBond(a, b, 2); like(a.p, 1, null); like(b.p, 1, null); return `${A} pretends not to be pleased. ${B} doesn't bother pretending.`; } },
        { label: 'Leave the rotation alone', run: () => 'Some things find their own way.' },
      ] }));
    if ((n <= -2 || clash(a, b)) && !isCooled(a, b, 'feud', 20)) scenes.push(() => {
      cool(a, b, 'feud');
      const cause = pick(CAUSES);
      return {
        title: 'A Small Ship', text: `${A} and ${B} are shouting at each other in the galley about ${cause}. It is not really about ${cause}.`,
        choices: [
          { label: `Side with ${A}`, run() { like(a.p, 1, null); like(b.p, -2, `You sided with ${A} against me.`); addBond(a, b, -1); return `${B} storms off to their bunk. ${A} looks smug, which helps nobody.`; } },
          { label: `Side with ${B}`, run() { like(b.p, 1, null); like(a.p, -2, `You sided with ${B} against me.`); addBond(a, b, -1); return `${A} storms off to their bunk. ${B} looks smug, which helps nobody.`; } },
          { label: 'Lock them in the galley until they sort it out', run() {
            if (Math.random() < 0.55) { addBond(a, b, 3); return `Two hours later they come out laughing about something else entirely. Grudging respect, at the very least.`; }
            addBond(a, b, -1);
            return `Two hours later they come out not speaking, and the galley needs a new cupboard door (${hurt(0.01)} points of hull, somehow).`;
          } },
          { label: 'Settle it over cards', run() { addBond(a, b, 1.5); return `${pick([A, B])} wins, the loser does the chores, and honor is satisfied.`; } },
        ],
      };
    });
    if ((a.p.home === b.p.home || (a.p.culture && a.p.culture === b.p.culture)) && n < 3) scenes.push(() => !stamped(a, b, 'roots') && {
      title: 'Small System', text: a.p.home === b.p.home
        ? `${A} and ${B} discover they grew up a few decks apart on ${a.p.home}. They know the same bars, the same teachers, and the same terrible ${tastes(a).team} seasons.`
        : `${A} and ${B} have worked out they share half a childhood's worth of songs and slang. The rest of the ship understands one word in three.`,
      choices: [
        { label: `Break out something to toast ${a.p.home} (200 cr)`, can: () => st.credits >= 200, run() { st.credits -= 200; addBond(a, b, 3); like(a.p, 1, null); like(b.p, 1, null); return 'The toasts get longer and the stories get less true. It is a good night.'; } },
        { label: 'Leave them to it', run() { addBond(a, b, 1.5); return 'You can hear them laughing from the bridge.'; } },
      ] });
    if (a.crew !== b.crew) {
      const [c, p] = a.crew ? [a, b] : [b, a];
      scenes.push(() => !stamped(a, b, 'tour') && {
        title: 'The Grand Tour', text: `${c.p.first} has been showing ${p.p.first} how the ship works. ${has(p, 'nervous') ? `${p.p.first} jumps at every clank, but is listening hard.` : `${p.p.first} has a hundred questions.`}`,
        choices: [
          { label: 'Let them', run() { addBond(c, p, 2.5); like(p.p, 1, `${c.p.first} showed me around the ship.`); return `By the end of the burn ${p.p.first} can name every valve on the ship, and ${c.p.first} has a new friend.`; } },
          { label: 'Passengers stay out of the engine room', run() { addBond(c, p, -0.5); return 'Rules are rules.'; } },
        ] });
    }
  }
  const crew = list.filter(f => f.crew);
  if (crew.length >= 2) {
    const [a, b] = pick(pairs(crew)), n = bond(a, b);
    if (Math.abs(n) >= 1 && !isCooled(a, b, 'word', 30)) scenes.push(() => cool(a, b, 'word') || ({
      title: 'A Word, Captain', text: `${a.p.first} catches you alone. "Can I ask you something about ${b.p.first}?" ${n > 0 ? 'They are trying hard to sound casual.' : 'They are trying hard to sound calm.'}`,
      choices: [
        { label: `"Talk to ${b.p.first}, not me."`, run() { addBond(a, b, n > 0 ? 2 : 1.5); return n > 0 ? 'Later you see the two of them in the galley, talking quietly. Good.' : 'They do. It is loud for a while, and then it is better.'; } },
        { label: '"Keep your head down and do your job."', run() { like(a.p, -1, null); return 'They nod, disappointed.'; } },
        { label: `"What's ${b.p.first} really like?"`, run() { like(a.p, 1, null); return `"${b.p.first}? ${(b.p.traits || []).length ? `${TRAITS[b.p.traits[0]].adj[0].toUpperCase()}${TRAITS[b.p.traits[0]].adj.slice(1)}, mostly. ` : ''}Watches too much ${GENRES[tastes(b).genre]}. Would go down with the ship for you, though." ${a.p.first} seems surprised to have said it.`; } },
      ] }));
  }
  // Two fans of different teams, and a match coming up.
  const fans = all.find(([a, b]) => tastes(a).team !== tastes(b).team && !isCooled(a, b, 'match', 25));
  if (fans) scenes.push(() => {
    const [a, b] = fans, ta = tastes(a).team, tb = tastes(b).team;
    cool(a, b, 'match');
    return {
      title: 'Galley Duty', text: `${a.p.first} (${ta}) and ${b.p.first} (${tb}) have bet a week of galley duty on tonight's match.`,
      choices: [
        { label: 'Stream it for everyone', run() {
          const m = playMatch(ta, tb), [w, l] = m.winner === ta ? [a, b] : [b, a];
          addBond(a, b, has(l, 'rude') ? -1 : 1);
          like(w.p, 1, null);
          return `${m.a} ${m.sa}, ${m.b} ${m.sb}. ${l.p.first} does a week of galley duty ${has(l, 'rude') ? 'and makes sure everyone suffers for it' : 'in a borrowed apron, with dignity'}.`;
        } },
        { label: `Put 300 cr on the ${ta} yourself`, can: () => st.credits >= 300, run() {
          const m = playMatch(ta, tb), won = m.winner === ta;
          st.credits += won ? 300 : -300;
          like(a.p, won ? 1 : 0, null); like(b.p, won ? -1 : 1, null);
          return `${m.a} ${m.sa}, ${m.b} ${m.sb}. ${won ? `You collect 300 cr, and ${a.p.first} hugs you.` : `You lose 300 cr, and ${b.p.first} will be mentioning it for weeks.`}`;
        } },
        { label: 'Stay out of it', run: () => 'You hear the result from the cheering, and the groaning.' },
      ],
    };
  });
  const options = scenes.map(f => f).sort(() => Math.random() - 0.5);
  for (const make of options) { const ev = make(); if (ev) return ev; }
  return null;
}

// A regular back aboard: the crew remember them.
function welcomeBack() {
  const m = paxAboard().find(x => x.regular && !x.welcomed);
  if (!m) return null;
  m.welcomed = true;
  const p = G.state.people[m.pid], me = { id: m.pid, p };
  const friends = folk().filter(f => f.crew && bond(f, me) >= 2);
  const mem = p.memories.length ? p.memories[p.memories.length - 1].replace(/^(Day \d+|\d+ \w+ \d+): /, '') : null;
  return {
    title: 'Welcome Back', text: `${p.first} ${p.last} settles into the same berth as last time.${mem ? ` "Last time, ${mem.charAt(0).toLowerCase()}${mem.slice(1)}"` : ''}${friends.length ? ` ${names(friends)} ${friends.length > 1 ? 'have' : 'has'} saved them the good mug.` : ''}`,
    choices: [
      { label: '"Good to have you aboard again."', run() { like(p, 1, 'The captain welcomed me back.'); for (const f of friends) addBond(f, me, 1); return `${p.first} beams. Regulars are what keep a ship like this flying.`; } },
    ],
  };
}

// ---------- regulars ----------
// A passenger who liked the trip may be at a later port, asking for your ship by name.
function regularsAt(planet) {
  const st = G.state, aboard = new Set(paxAboard().map(m => m.pid));
  for (const p of Object.values(st.people)) {
    if (!p.trips || p.location !== planet.name || p.opinion < 2 || st.crew.includes(p.id) || aboard.has(p.id) || (p.nextAsk || 0) > st.day || p.ship) continue;
    p.nextAsk = st.day + 20;
    if (Math.random() > 0.6) continue;
    const reachable = Object.keys(SYSTEMS).filter(id => id !== st.systemId && inRange(st.systemId, id));
    if (!reachable.length) return;
    const sid = pick(reachable), dest = pick(SYSTEMS[sid].planets), days = baseDays(st.systemId, sid);
    const o = makePassengerOffer(st.systemId, sid, dest, days, st.day + days * 2 + 5);
    Object.assign(o, {
      person: p, who: `${p.first} ${p.last}`, pax: 1, regular: true, pay: Math.round(o.pay * 1.25),
      title: `Regular: ${p.first} ${p.last} wants passage to ${dest.name}`,
      blurb: `Asked for your ship by name. ${describe(p)}`,
    });
    G.offers.unshift(o);
    return `${p.first} ${p.last} is at ${planet.name} and asked for your ship by name. The job is on the mission board.`;
  }
  return null;
}

// ---------- port pages ----------
function feedHeadlines() {
  const c = culture();
  const top = Object.entries(c.table).sort((a, b) => b[1] - a[1])[0];
  return [
    `Watching: "${c.vid.title}", a ${GENRES[c.vid.genre]}, episode ${c.episode}.`,
    `Reading: "${c.book.title}" by ${c.book.author}.`,
    `Listening: "${c.song.title}" by ${c.song.band}.`,
    `Ring-ball: ${c.last ? `${c.last.a} ${c.last.sa}, ${c.last.b} ${c.last.sb}. ` : ''}${top[1] ? `The ${top[0]} lead with ${top[1]} wins.` : 'The season has just started.'}`,
  ];
}

function bondsHtml() {
  const list = folk(), lines = [];
  for (const [a, b] of pairs(list)) {
    const w = bondWord(bond(a, b));
    if (w) lines.push(`<div class="hint">${a.p.first} and ${b.p.first}: ${w}</div>`);
  }
  const taste = list.map(f => { const t = tastes(f); return `${f.p.first} (${GENRES[t.genre]}, ${t.team})`; });
  return `<h3>Aboard</h3>${lines.join('') || '<p class="hint">Nobody aboard has strong feelings about anyone else yet.</p>'}${taste.length ? `<p class="hint">Likes: ${taste.join('; ')}.</p>` : ''}`;
}

Mods.register({
  id: 'social', name: 'Crew life and culture', builtin: true,
  init(M) {
    Object.assign(ACTIVITIES, SOCIAL_ACTIVITIES);
    M.on('newDay', () => { cultureDay(); bondDay(); });
    M.filter('chatter', pool => {
      const r = Math.random();
      if (r < 0.3) return [feedLine()];
      if (r < 0.55) { const s = socialLines(); if (s.length) return s; }
      return pool;
    });
    M.filter('transitEvent', ev => ev || welcomeBack() || (Math.random() < 0.45 ? relationshipScene() : null));
    M.on('missionDone', m => { if (m.pid && G.state.people[m.pid]) G.state.people[m.pid].trips = (G.state.people[m.pid].trips || 0) + 1; });
    M.on('landed', planet => { const note = regularsAt(planet); if (note) M.note(note); });
  },
});
