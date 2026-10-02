'use strict';

// Two regulars at each bar, and match night. A regular is a person in the registry who
// is always at their bar, so you come to know them; what they have been doing changes
// each time you are back after a few days (p.gossip, not p.news, which is a crew member's letter from home in family.js), and they remember how you treated
// them like anyone you know. Match night is a live league's match in the last day, shown
// on the screens with the room's reaction. Loaded after bar.js; only calls into it at runtime.

const REGULARS = 2, NEWS_AFTER = 4;
const NEWS = [
  'has a new job, and is tired in a way that looks like pride.', 'lost a month\'s pay at cards, and is being brave about it.',
  'has a sister visiting, and will tell you about nothing else.', 'is off the drink, and is making a point of it.',
  'got engaged since you were last here, and the bar knows.', 'was in a fight, and has the eye to prove it.',
  'is learning an instrument, and the bar is learning to be kind.', 'has been passed over for a promotion, and is not over it.',
  'is saving for a passage out, and counting every coin aloud.', 'is minding a stray cat that has moved in under the bench.',
  'is on a long streak of bad luck, and has started to find it funny.', 'has a cough that has been going round the whole port.',
];

// The regulars of this planet's bar, made on the first visit and given a new line of news
// when you are back after a few days. A regular the registry has forgotten is replaced.
function barRegulars(planet) {
  const st = G.state, sid = st.systemId;
  st.bars = st.bars || {};
  const rec = st.bars[planet.name] = st.bars[planet.name] || { ids: [], seen: null };
  rec.ids = rec.ids.filter(id => st.people[id]);
  while (rec.ids.length < REGULARS) {
    const p = registerPerson(makePerson(cultureOf(sid)));
    p.regular = planet.name; p.location = planet.name;
    rec.ids.push(p.id);
  }
  const fresh = rec.seen !== null && st.day - rec.seen >= NEWS_AFTER;  // the first visit has no "since" to tell
  rec.seen = rec.seen === null || fresh ? st.day : rec.seen;
  return rec.ids.map(id => {
    const p = st.people[id];
    if (fresh) p.gossip = pick(NEWS.filter(n => n !== p.gossip));
    return { p, known: true, regular: true };
  });
}

// A live league's match played today or yesterday, if there is one, with how the room takes it.
function matchNight() {
  const day = cultureToday();
  for (const l of LEAGUES) {
    const ph = leaguePhase(l, day);
    if (!['regular', 'playoffs', 'final'].includes(ph)) continue;
    const m = season(l).last;
    if (!m || day - m.day > 1) continue;
    const mine = l.culture === cultureOf(G.state.systemId), close = Math.abs(m.sa - m.sb) <= 1;
    const room = mine
      ? (close ? `The room is on its feet for every minute. The ${m.winner} fans are buying, and the ${m.loser} fans are not speaking.` : `It was never close, and the ${m.loser} fans are leaving early, quietly, while the ${m.winner} fans sing.`)
      : (close ? 'Nobody here has a team in it, but money is on the table anyway, and it was close enough to be worth it.' : 'Nobody here has a team in it, and the screens go back to the weather after the second goal.');
    return { league: l, match: m, text: `Match night. ${l.name}, ${l.sport}: ${m.a} ${m.sa}, ${m.b} ${m.sb}${ph === 'final' ? ', in the final' : ''}. ${room}` };
  }
  return null;
}
