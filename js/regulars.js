'use strict';

// Two regulars at each bar, and match night. A regular is a person in the registry who
// is always at their bar, so you come to know them; what they have been doing changes
// each time you are back after a few days (p.gossip, not p.news, which is a crew member's letter from home in family.js), and they remember how you treated
// them like anyone you know. Match night is a live league's match in the last day, shown
// on the screens with the room's reaction. Loaded after bar.js; only calls into it at runtime.

const REGULARS = 2, NEWS_AFTER = 4, ARC_AFTER = 7;
// A regular's life (#672): an arc of three beats that moves one beat a visit when you are back a week or more after the last, told as their
// news (after the name, as NEWS is), drawn when the regular is made (p.arc = { key, beat }). How it ends: 'gone' leaves the bar at the visit
// after the last beat (the stool goes to someone new, and the dock's return line can say so, revisit.js); 'stays' goes back to the news.
const ARCS = {
  berth: {
    end: 'gone',
    beats: [
      'is asking every ship in for a berth, and keeps a bag packed under the stool.',
      'has a place promised on a hauler that keeps not arriving, and reads the arrivals board between drinks.',
      'has the hauler\'s name on a slip of paper and a date under it. "Tuesday," they say. They buy the round.'
    ]
  },
  flat: {
    end: 'stays',
    beats: [
      'is behind on the rent, and says so to the glass.',
      'is sleeping in the back room here, and pays the owner for it in shifts behind the bar.',
      'has a room of their own again, a month paid up front, and shows you the key.'
    ]
  },
  sister: {
    end: 'gone',
    beats: [
      'has a sister visiting, who sits at the far end, doesn\'t drink, and watches the door.',
      'is arguing with the sister, low, the way people argue about something they\'ve argued about before.',
      'has paid the tab in full and is leaving with the sister on the morning shuttle.'
    ]
  },
  cough: {
    end: 'stays',
    beats: [
      'has the cough half the port has, and a bottle of something for it that doesn\'t work.',
      'has been to the clinic, paid the fee, and come back with a paper and the same cough.',
      'is over it, and thinner, and back on full shifts.'
    ]
  },
  fiddle: {
    end: 'stays',
    beats: [
      'is learning the fiddle, and has been asked twice to practise somewhere else.',
      'practises in the stairwell now, where the whole block can hear.',
      'plays on match nights. Nobody\'s asked them to stop.'
    ]
  },
  debt: {
    end: 'gone',
    beats: [
      'owes money to a man who comes in on Fridays, and leaves before he does.',
      'has stopped leaving on Fridays, and sits with their back to the wall.',
      'paid the man in front of everyone, counted out, and is reading the ships on the departures board.'
    ]
  }
};
const regularArc = key => linedText('lines:regular-arcs', ARCS[key].beats, key);

// Written regulars (#1242, docs/bible/regulars.md): a port's own pool of people at its bar, each with an arc of their own, three beats told as
// their news as ARCS are, ending 'gone' or 'stays'. Each run deals the pool in an order of its own (writtenOrder), seeded by the run and the port,
// so a port's faces differ between runs and stay the same within one; they take the bar's stools first, and generated regulars fill what is left.
// A regular written for somewhere other than the bar (a stall, a bench, a desk) waits for that place (the owner, 2026-11-15). `left`, for one who
// goes: what the dock's return line says of them (revisit.js), in place of "is gone from the bar". By the port's planet: Earth's is Lagos Ring.
const WRITTEN_REGULARS = {
  Earth: {
    biodun: { first: 'Biodun', last: 'Okafor-Lane', job: 'rigger', end: 'gone' },
    chidinma: { first: 'Chidinma', last: 'Eze-Walters', job: 'tug pilot', end: 'stays' },
    segun: { first: 'Segun', last: 'Adeyinka', job: 'welder', end: 'stays' },
    grace: { first: 'Grace', last: 'Obi-Hartmann', job: 'clinic nurse, retired', end: 'stays' },
  },
  'Ceres Station': {
    dunya: { first: 'Dunya', last: 'Achterberg', job: 'ice-house foreman, retired', end: 'stays' },
    kofi: { first: 'Kofi', last: 'Lenz', job: 'dock rigger', end: 'gone' },
    ilka: { first: 'Ilka', last: 'Ferrante', job: 'clinic orderly', end: 'stays' },
    pell: { first: 'Pell', last: 'Sorensen', job: 'gambler', end: 'gone' },
    nadia: { first: 'Nadia', last: 'Ruiz', job: 'Guild steward', end: 'stays' },
  },
  'Pallas Refinery': {
    teodor: { first: 'Teodor', last: 'Wills', job: 'shift supervisor', end: 'gone' },
    amara: { first: 'Amara', last: 'Quist', job: 'assayer', end: 'stays' },
    jem: { first: 'Jem', last: 'Hallgren', job: 'crane driver', end: 'gone' },
    vey: { first: 'Sister', last: 'Vey', job: 'keeper of the works\' shrine', end: 'stays' },
    cass: { first: 'Cass', last: 'Oduya', job: 'organiser', end: 'gone' },
  },
  'The Hollows': {
    lio: { first: 'Lio', last: 'Brandvold', job: 'smelter', end: 'gone' },
    ezra: { first: 'Ezra', last: 'Kahananui', job: 'assembly delegate', end: 'stays' },
    lunds: { first: 'Pim', last: 'Lund', job: 'smelter', end: 'gone' },  // with his twin Petra in his arc: a regular is one person, so the bar's lines read
    tamsin: { first: 'Tamsin', last: 'Achebe-Holt', job: 'water-ration clerk', end: 'stays' },
  },
  'Eros Old Town': {
    hesper: { first: 'Hesper', last: 'Moraes', job: 'the Old Town\'s memory', end: 'stays' },
    ottilie: { first: 'Ottilie', last: 'Szabo', job: 'fixer', end: 'gone' },
    ray: { first: 'Ray', last: 'Bastian', job: 'recycler mechanic', end: 'stays' },
    benedetta: { first: 'Benedetta', last: 'Iyer', job: 'archivist', end: 'stays' },
  },
  'Luna': {
    calla: { first: 'Calla', last: 'Mendez', job: 'nurse', end: 'stays' },
    viktor: { first: 'Viktor', last: 'Pruss', job: 'yard master, retired', end: 'gone' },
    sunny: { first: 'Sunny', last: 'Abara', job: 'sweeper', end: 'gone' },
    orla: { first: 'Orla', last: 'Byrne', job: 'riggers\' foreman', end: 'stays' },
  },
  'Mars': {
    anika: { first: 'Anika', last: 'Veld', job: 'dome engineer', end: 'stays' },
    grigor: { first: 'Grigor', last: 'Mattei', job: 'farmer', end: 'gone' },
    lena: { first: 'Lena', last: 'Ostrowski', job: 'air-bill clerk', end: 'gone' },
    teo: { first: 'Teo', last: 'Quint', job: 'council clerk', end: 'stays' },
    halima: { first: 'Halima', last: 'Rao', job: 'mural painter', end: 'stays' },
  },
};
const WRITTEN_LINES = {  // lines:written-regulars: each one's beats, and for one who goes, the return line's words for it
  Earth: {
    biodun: { beats: [
      'has read the hiring board twice since he sat down, and it hasn\'t changed. "They want them under forty," he says. "They don\'t put it on the board."',
      'has a contract: a refit at Luna, three months, rigging. He shows you the stamp on it as if you might doubt it.'],
      left: 'Biodun\'s stool is someone else\'s, and the keeper says he went up on the Thursday spaceplane' },
    chidinma: { beats: [
      'has the deposit for a tug lease saved, all of it, in a scrip account she checks between drinks.',
      'has a new letter from the holding company: the lease terms changed, and the deposit is now a third short.',
      'has a tug, an old one, with "EZE-WALTERS" painted on the hatch in letters a hand high. She\'ll show you the picture if you ask.'] },
    segun: { beats: [
      'has six days left on his first contract and doesn\'t want to talk about the seventh.',
      'has been on the board a week. He eats one meal a day at Ngozi\'s and makes it last.',
      'has another contract, eight months, and bought Ngozi\'s whole pot for his shift. The shift is still talking about it.'] },
    grace: { beats: [
      'has the clinic\'s tender papers spread on the end of the bar and is reading every clause.',
      'says the contract\'s gone to a firm on the mainland. "They\'ve never worked in half a g," she says. "They\'ll learn."',
      'has two of the new nurses at her end of the bar, and is showing them how to splint a wrist with a menu card.'] },
  },
  'Ceres Station': {
    dunya: { beats: [
      'has a letter from the station\'s owner turning down her pension again, and has stuck it to the bar with her glass.',
      'has a Guild lawyer who\'ll take the case for nothing. "Nothing," she says. "I asked twice."',
      'got the first payment this morning, and the round on the bar is hers.'] },
    kofi: { beats: [
      'was turned down at the co-op\'s meeting, eleven votes to nine. He knows who the eleven were.',
      'is working a cousin\'s claim rock between shifts, and has the dust in his cuffs to show for it.',
      'has the buy-in saved, and asks if you\'d speak for him at the meeting.'],
      left: 'Kofi is on a co-op hull now' },
    ilka: { beats: [
      'comes in straight off her shift. Her brother is on the ice crews, and she says that\'s the trouble.',
      'says her brother was hurt on the ice: a hand, not the worst. The clinic has a training course, and she\'s put his name down.',
      'says her brother is on a co-op hull now. It\'s her first night off in a year, and she doesn\'t know what to do with it.'] },
    pell: { beats: [
      'is ahead tonight and buying, and tells you the debt will be gone by the end of the week.',
      'is behind, and asks if you could lend him a hundred until Friday.'],
      left: 'Pell has gone on a hauler to Pallas, owing the bar, and the keeper has his name on the slate' },
    nadia: { beats: [
      'has a list of names from the ice house, and adds one while you\'re there.',
      'says the owner sacked two of the names. She has their pictures on the bar beside her drink.',
      'says the ice house is organised. She drinks to the two who were sacked, and doesn\'t say anything else.'] },
  },
  'Pallas Refinery': {
    teodor: { beats: [
      'says the quota\'s up eight percent from the first of the month. He\'s working out on a napkin who on his line can carry it.',
      'had a man burned on his line on Tuesday. He\'s been in every night since, and doesn\'t drink much.',
      'met the quota. He\'s put in for a transfer, and won\'t say where.'],
      left: 'Teodor got his transfer, and nobody at the Slag Heap knows where to' },
    amara: { beats: [
      'has the break fee for her contract written on the inside of her wrist, and adds to the savings every payday.',
      'says the company raised the break fee. She\'s crossed out the old number on her wrist and written the new one under it.',
      'signed again, for five years. She doesn\'t talk about it, and the number on her wrist is gone.'] },
    jem: { beats: [
      'wants to marry a woman in the Hollows, and has put in for a married berth.',
      'was refused the married berth. The company doesn\'t house anyone from the Hollows.'],
      left: 'Jem has moved to the Hollows to marry, and the company has docked his pay for the berth he left' },
    vey: { beats: [
      'asked the company to read the line\'s dead out at the shift change, and was told no.',
      'reads the names herself now, here, at the end of each shift. The bar goes quiet for it.',
      'says the company has allowed a minute at shift change. She reads faster, to get them all in.'] },
    cass: { beats: [
      'asks you what the pay is like on your ship, and writes down the answer.',
      'says there\'s a man from company security at the far table who\'s been there every night she has.'],
      left: 'Cass left on a hauler, and someone else at the Slag Heap has started asking the same questions' },
  },
  'The Hollows': {
    lio: { beats: [
      'has been offered an apprenticeship on a hauler, and hasn\'t told his mother.',
      'told his mother. She\'s against it, and he\'s still thinking.'],
      left: 'Lio went on the hauler, and his mother keeps his stool at the Chute' },
    ezra: { beats: [
      'lost the assembly\'s vote to take the air plant\'s lease off the company, by two votes.',
      'won the vote the second time. The air plant is the assembly\'s from next month.',
      'has the assembly\'s first air bill in his hand. It\'s higher than the company\'s was.'] },
    lunds: { beats: [
      'and his twin sister Petra are arguing over which of them gets off the line first. They\'ve been arguing about it for a year.',
      'says he was burned on the line, a forearm. Petra has stopped arguing.'],
      left: 'Petra has left the Hollows, and Pim is at the Chute on his own' },
    tamsin: { beats: [
      'says the refinery has cut the Hollows\' water again, and she has to make it go round.',
      'says the queue for water turned into a fight on Tuesday. She has a cut over one eye.',
      'has a rota that\'s held for three weeks, posted on the shrine door. She checks it on her way past.'] },
  },
  'Eros Old Town': {
    hesper: { beats: [
      'says the air fund is short this year, and tells you exactly how short.',
      'says a shipper\'s gift came in, enough to see the fund through the winter.',
      'tells you about the last winter the fund ran out. It takes most of an evening, and she doesn\'t leave anything out.'] },
    ottilie: { beats: [
      'owes money to people she won\'t name, and is doing them favours to pay it down.',
      'did one favour too many, she says, and sits facing the door.'],
      left: 'Ottilie is gone from Eros, and the people she owed have been in asking where' },
    ray: { beats: [
      'needs a part for the town\'s old air plant, and nobody sells it any more.',
      'had the part printed. It\'s not the real one, and he knows it.',
      'checks the printed part every hour, and comes back to his drink each time looking relieved.'] },
    benedetta: { beats: [
      'had an offer from the Dome Pact for the Old Town\'s founding papers, and said no.',
      'says someone broke into the archive on Thursday. Nothing was taken, which worries her more.',
      'has given a copy of the founding papers to every ship that will take one. One of them is yours.'] },
  },
  'Luna': {
    calla: { beats: [
      'has the yards\' promise of a lung clinic for the dust towns in writing, and keeps the paper folded in her pocket.',
      'says the yards have put the clinic off another year. The paper is still in her pocket.',
      'runs the clinic now, in a shipping container behind the hiring board. She\'s on her own there four nights a week.'] },
    viktor: { beats: [
      'tells you how the drydocks were run when he ran one. Nobody else at the table is listening.',
      'was asked for his advice by a young yard master in trouble with a refit. He\'s been working it out on a napkin all evening.'],
      left: 'Viktor has gone to the young master\'s yard to advise on the refit, and he took the napkin' },
    sunny: { beats: [
      'is saving for a seat down to Lagos to see her mother, and counts the savings twice a week.',
      'says the fare\'s gone up. She\'s back to counting from the start.'],
      left: 'Sunny went down the well on a cheap seat to see her mother' },
    orla: { beats: [
      'has a petition for her riggers\' overtime, which the yard calls voluntary. Half the dust towns have signed it.',
      'says the yard locked her riggers out for three days over it.',
      'got the riggers paid, half of it, and says the yard knows her name now.'] },
  },
  'Mars': {
    anika: { beats: [
      'surveyed the old lake pumps on her own time, and says three of them would run with new seals.',
      'says the council turned down the pumps. Too costly, they said, for a lake nobody\'s seen in forty years.',
      'has one of the pumps running, on a weekend shift she doesn\'t get paid for. She has water under her fingernails to prove it.'] },
    grigor: { beats: [
      'is in town for the council\'s water hearing, and has his dome\'s figures in a folder on the bar.',
      'says the council cut his dome\'s share of the water. He\'s angry, and quiet with it.'],
      left: 'Grigor went home to the outer domes, and a month later his dome\'s water share was the news' },
    lena: { beats: [
      'sends out the domes\' air bills, and doesn\'t like to say how many come back unpaid.',
      'had to send the bill to a family that can\'t pay it. She hasn\'t slept much since.'],
      left: 'Lena has taken a job in the outer domes, at less pay, and someone else sends the bills' },
    teo: { beats: [
      'writes to his sister every week. She works on Ballast\'s books, and he wants her off them.',
      'hasn\'t had an answer from his sister in a month, and checks his messages between drinks.',
      'had an answer from his sister: two lines. He reads it to you, and doesn\'t say what he thinks of it.'] },
    halima: { beats: [
      'says the council has voted to put the new share board up over the lake mural in the square. She\'s asked them to put it somewhere else, and they said there isn\'t anywhere else.',
      'is painting the lake again at night, on the wall beside the board. She has paint on her sleeves and a council notice in her pocket.',
      'finished it. The council fined her for it, and left it up.'] },
  },
};
const writtenLines = () => linedText('lines:written-regulars', WRITTEN_LINES);
// A written regular's arc key is `port|key`; its beats and how it ends, or null for one of ARCS.
const writtenArc = key => { const [port, k] = String(key).split('|'), w = (WRITTEN_REGULARS[port] || {})[k]; return w ? { end: w.end, beats: writtenLines()[port][k].beats } : null; };
// What the return line says of a regular who left (revisit.js), or null for the plain words.
const writtenLeft = p => { const [port, k] = String((p && p.arc && p.arc.key) || '').split('|'), l = ((writtenLines()[port] || {})[k] || {}).left; return l || null; };
// The run's order of a port's pool: by the run (the hand's name and the run's main characters) and the port, not the game's dice.
const writtenOrder = (port, run) => Object.keys(WRITTEN_REGULARS[port] || {}).sort((a, b) => hash(`${run} ${port} ${a}`) - hash(`${run} ${port} ${b}`));
// A beat of the arc a week on: the next line is their news, or, past the last, the arc is done and a 'gone' regular leaves. Returns true when they leave.
function arcStep(p) {
  const a = p.arc, def = ARCS[a.key] || writtenArc(a.key);
  if (!def) { p.arc = null; return false; }
  if (a.beat >= def.beats.length) { a.done = true; return def.end === 'gone'; }
  p.gossip = (ARCS[a.key] ? regularArc(a.key) : def.beats)[a.beat++];
  return false;
}
const NEWS = [
  'has a new job on the day shift, and comes in still in the work jacket.',
  'lost a week\'s pay at cards, and is telling everyone the hand.',
  'has had their contract renewed for another year, at the same rate.',
  'is off the drink, and orders a tea.',
  'got engaged, to someone off a hauler, and shows you the message.',
  'was in a fight with a shift supervisor, and has the written warning to show for it.',
  'was passed over for a lead\'s job, and says the name of the one who got it.',
  'is saving for a passage out, and has the fare written on the back of their hand.',
  'had their rent go up, and has the letter on the bar.',
  'has a kid starting school back home, and a message from the first day that they play for anyone.',
  'is on the night shift this month, and is here at the wrong end of the day.',
  'has the cough that\'s going round the port, and a bottle of something for it.'
];

// The regulars of this planet's bar, made on the first visit and given a new line of news
// when you are back after a few days. A regular the registry has forgotten is replaced.
function barRegulars(planet) {
  const st = G.state, sid = st.systemId;
  st.bars = st.bars || {};
  const rec = st.bars[planet.name] = st.bars[planet.name] || { ids: [], seen: null };
  rec.ids = rec.ids.filter(id => st.people[id]);
  const fresh = rec.seen !== null && st.day - rec.seen >= NEWS_AFTER;  // the first visit has no "since" to tell
  const week = rec.seen !== null && st.day - rec.seen >= ARC_AFTER;  // a beat of a regular's life
  for (const id of [...rec.ids]) {  // the lives move first: one whose arc ended in leaving is gone, and the stool below is filled
    const p = st.people[id];
    const news = fresh ? pick(NEWS.filter(n => n !== p.gossip)) : null;  // drawn as it always was, a beat or not, so the dice of a game stay where they were
    let left = false, told = false;
    if (week && p.arc && !p.arc.done) { const at = p.arc.beat; left = arcStep(p); told = p.arc.beat !== at; }  // told: a beat was their news this visit; an arc that only finished leaves room for the news
    if (left) { rec.ids = rec.ids.filter(x => x !== id); p.regular = null; p.location = null; }
    else if (fresh && !told) p.gossip = writtenArc((p.arc || {}).key) ? null : news;  // a written regular has only their own life to tell (#1292): no beat this visit, no news
  }
  rec.written = rec.written || [];  // the port's written regulars this run has seated, in or gone
  const run = `${captain().name} ${(st.castPair || []).join(' ')}`;
  while (rec.ids.length < REGULARS) {
    const p = registerPerson(makePerson(cultureOf(sid))), next = writtenOrder(planet.name, run).find(k => !rec.written.includes(k));
    p.regular = planet.name; p.location = planet.name; p.arc = { key: Object.keys(ARCS)[Math.abs(hash(p.id + 'arc')) % Object.keys(ARCS).length], beat: 0 };  // by the person, not the dice: the pins' draws stay as they were
    if (next) { const w = WRITTEN_REGULARS[planet.name][next]; Object.assign(p, { first: w.first, last: w.last, job: w.job }); p.arc = { key: `${planet.name}|${next}`, beat: 0 }; rec.written.push(next); }  // a written one first (#1242)
    rec.ids.push(p.id);
  }
  rec.seen = rec.seen === null || fresh ? st.day : rec.seen;
  return rec.ids.map(id => ({ p: st.people[id], known: true, regular: true }));
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
      ? (close ? `The room is on its feet for every minute. The ${m.winner} fans are buying, and the ${m.loser} fans are not speaking.` : `It was never close. The ${m.loser} fans are leaving early while the ${m.winner} fans sing.`)
      : (close ? 'Nobody here has a team in it, but there is money on the table anyway.' : 'Nobody here has a team in it. The screens go back to the weather after the second goal.');
    return { league: l, match: m, text: `Match night. ${l.name}, ${l.sport}: ${m.a} ${m.sa}, ${m.b} ${m.sb}${ph === 'final' ? ', in the final' : ''}. ${room}` };
  }
  return null;
}
