'use strict';

// Wrecks and salvage (#965): the co-op's jobs at a site. A salvage job sends the ship to a wreck (sites.js) to cut up to three sections
// deeper, one a shift, with the risk read before each cut; a survey job sends it to a rock for one scene. The tables and the cutting's
// numbers are here, as pure functions of what they read; the scenes and the board's rows follow. Loaded after icerun.js; the tables run
// under tests/nodecontext.js.

// The wrecks, by type: the ship names a site takes, the goods its sections yield (data.js good ids), the find a client wants off it, and
// who the client is for that find.
const WRECK_TYPES = {
  orehauler: {
    word: 'an ore hauler', goods: ['metal', 'industrial'],
    names: ['Dorran Sky', 'Hollin Reach', 'Patience Marr', 'Second Shift', 'Tamsin Ore', 'Brekker Line', 'Low Wager', 'Ostrava Kell', 'Old Hundred'],
    find: 'recorder', findWord: 'the flight recorder', clients: ['Hask Mutual', 'Belt Hull Assurance', 'the Ostrava claims office'],
  },
  courier: {
    word: 'a courier', goods: ['equipment', 'industrial'],
    names: ['Quick Annie', 'Lantern Post', 'Mercy Vell', 'Seven Hours', 'Kestrel Run', 'Tidy Margin', 'Ilse Brand', 'Small Hours'],
    find: 'cargo', findWord: 'the mail cases', clients: ['Ceres Post', 'Varga and Daughters', 'the Pallas courier office'],
  },
  raider: {
    word: 'a raider', goods: ['metal', 'equipment'],
    names: ['No Account', 'Black Tuesday', 'Mother Kin', 'Bad Debt', 'Gallows Rate', 'Hard Cash', 'Tollkeeper', 'Short Notice'],
    find: 'proof', findWord: 'the transponder', clients: ['the Pact bounty desk', 'a lawyer for the Kell family', 'Hask Mutual'],
  },
  yacht: {
    word: 'a yacht', goods: ['equipment', 'industrial'],
    names: ['Silver Leasehold', 'Amaranth', 'Lady Orsolya', 'Fair Return', 'Gilt Edge', 'Windfall', 'Corinna Hale', 'The Long Weekend'],
    find: 'proof', findWord: 'the owner\'s log', clients: ['a widow on Vesta', 'the Hale estate', 'Belt Hull Assurance'],
  },
};
const WRECK_TYPE_IDS = Object.keys(WRECK_TYPES);
// A number from a string for this file's draws: the game's hash, mixed. The hash alone multiplies by 31, an odd number, so its low bits follow the
// characters' sum (strings one character apart alternate odd and even), and a draw by its remainder would not be a draw.
const salvageRoll = str => { let x = hash(str); x = Math.imul(x ^ (x >>> 16), 0x45d9f3b); x = Math.imul(x ^ (x >>> 16), 0x45d9f3b); return (x ^ (x >>> 16)) >>> 0; };

// ---------- the cutting's numbers ----------
// The odds a section goes wrong, by depth (1 to 3), and what cutting carefully does to them and to the take (the soak tunes them).
const SECTION_RISK = [0.1, 0.25, 0.4], CAREFUL = 0.5, SECTION_TONS = [3, 5, 8];
const sectionRisk = (depth, careful) => SECTION_RISK[depth - 1] * (careful ? CAREFUL : 1);
// A section's goods for the hold: a few tons of one of the type's goods, halved carefully, no more than the hold has room for.
const sectionTake = (type, depth, careful, room) => {
  const goods = WRECK_TYPES[type].goods, tons = Math.floor(SECTION_TONS[depth - 1] * (careful ? CAREFUL : 1));
  return { good: goods[(depth - 1) % goods.length], tons: Math.max(0, Math.min(tons, room)) };
};
// An intact part, worth taking off whole: on section 2 of a third of wrecks and section 3 of half, fixed by the wreck's own seed.
const sectionPart = (wreck, depth) => depth > 1 && salvageRoll(`${depth}|part|${wreck.seed}|${wreck.name}`) % (depth === 2 ? 3 : 2) === 0;
// What goes wrong when a cut fails, by the roll's third: someone on the cutting team hurt, one of the ship's systems hit, or the section lost.
const riskOutcome = roll => (roll < 1 / 3 ? 'hurt' : roll < 2 / 3 ? 'system' : 'lost');
// The read of a section's risk. A reader with the skill (3 and up) reads the true band; anyone less reads coarser bands, so a middling risk
// can read clean or bad, but never two bands off.
const readWord = (risk, skill) => (skill >= 3 ? (risk < 0.15 ? 'clean' : risk < 0.33 ? 'some' : 'bad') : (risk < 0.2 ? 'clean' : risk < 0.35 ? 'some' : 'bad'));

// ---------- the jobs on the co-op's board ----------
// At most one salvage job and one survey job a day on a port's board, by the port and the day (hash: no dice of the game's), for an unfound wreck
// or rock the tank reaches and comes back from. The client is paid on delivery at this port. The co-op's only (role.js): the parked owner game,
// which has a board too, gets none.
const SURVEY_CLIENTS = ['Brannock Minerals', 'the Ceres claims office', 'a buyer for the Juno growers', 'Tessaly Assay'];
const JOB_SLACK = 10;  // days past the trip there, the work and the trip back that a client gives
function jobsAt(st, planet, day) {
  if (role().id !== 'coop') return [];
  const sid = st.systemId, all = sites(st), out = [];
  const reach = kind => Object.keys(all).filter(id => all[id].kind === kind && all[id].found === null && burnFuel(sid, id) + burnFuel(id, sid) <= st.fuel);
  for (const [kind, siteKind, every] of [['salvage', 'wreck', 2], ['survey', 'rock', 3]]) {
    const roll = salvageRoll(`${planet.name}|${day}|${kind}`), list = reach(siteKind);
    if (roll % every || !list.length) continue;
    const site = all[list[(roll >>> 4) % list.length]], out1 = travelDays(sid, site.id, day), work = kind === 'salvage' ? 3 : 1;
    const deadline = day + out1 + work + travelDays(site.id, sid, day + out1 + work) + JOB_SLACK;
    if (kind === 'salvage') {
      const t = WRECK_TYPES[site.wreck.type];
      out.push({ kind, site: site.id, client: t.clients[(roll >>> 8) % t.clients.length], find: t.find, sid, planet: planet.name, deadline, pay: 6000 + 500 * ((roll >>> 12) % 17) });
    } else {
      out.push({ kind, site: site.id, client: SURVEY_CLIENTS[(roll >>> 8) % SURVEY_CLIENTS.length], find: 'survey', sid, planet: planet.name, deadline, pay: 3000 + 250 * ((roll >>> 12) % 13) });
    }
  }
  return out;
}

// A job's row on the board, and the job under way.
const jobWords = (st, j) => {
  const s = sites(st)[j.site];
  if (j.kind === 'survey') return `${j.client}: a survey of ${s.name}, a rock at ${s.au.toFixed(1)} AU. Deliver to ${j.planet} by day ${j.deadline}. Pays up to ${fmt(Math.round(j.pay * SURVEY_PAY.good))} cr by the report.`;
  const t = WRECK_TYPES[s.wreck.type];
  return `${j.client}: ${t.findWord} off the ${s.name}, ${t.word}, ${s.au.toFixed(1)} AU. Deliver to ${j.planet} by day ${j.deadline}. Pays ${fmt(j.pay)} cr on delivery.`;
};
const SURVEY_PAY = { poor: 0.5, fair: 1, good: 1.4 };  // a survey's pay by the report's quality

function salvageJobsHtml(st) {
  const job = career().job;
  if (job) return String(h`<h3>Salvage and survey</h3><p class="desc">Under way: ${jobWords(st, job)}${job.got ? ' Aboard.' : ''}</p>`);
  const list = jobsAt(st, currentPlanet(), st.day);
  if (!list.length) return '';
  return String(h`<h3>Salvage and survey</h3>${listHtml(list, (j, i) => h`<div class="row"><span>${jobWords(st, j)}</span>
      <button data-action="takeJob" data-arg="${i}" ${career().run ? raw('disabled title="A contract is under way"') : ''}>Take it</button></div>`)}`);
}

// Takes the i-th job: one at a time, never alongside a contract run. The site goes on the map and the course is set for it.
function takeJob(i) {
  const st = G.state, c = career();
  if (role().id !== 'coop' || !c || c.run || c.job || G.mode !== 'landed' || G.dialog) return '';
  const j = jobsAt(st, currentPlanet(), st.day)[i];
  if (!j) return '';
  c.job = { ...j, taken: st.day, got: false, quality: null };
  const s = findSite(st, j.site, st.day);
  st.dest = s.id; st.route = null;
  return `${j.client}'s job is taken. ${s.name} is on the map now, ${s.au.toFixed(1)} AU out, and the course is set. Take off when you are ready.`;
}

// ---------- on station at a wreck ----------
// The crew cuts, never the player: Bexa leads the team when she is aboard (twenty years pulling wrecks), else the engineer, else the bosun.
// The words are the lines of 'scene:salvage' (hiredscenes.js).
const salvageSay = (key, vars) => sceneSay('scene:salvage', key, vars);
const castOnHand = (st, key) => st.crew.map(person).find(p => p && p.cast === key && !p.dead && !(st.injured || {})[p.id]);
const wreckReader = st => castOnHand(st, 'bexa') || roleHolder('engineer') || roleHolder('bosun') || null;
const wreckDone = w => w.cut >= 3 || !!w.left;
// The history of a wreck, in four pieces by its type (0 is what it was, 1 to 3 the sections), each in one of two versions fixed by the wreck.
const wreckStory = (w, n) => salvageSay(`story.${w.type}.${n}.${salvageRoll(`${n}|story|${w.seed}`) % 2}`, { name: w.name });

// Arrival at a wreck (sites.js landAtSite): the approach plays once a wreck, whoever found it.
function salvageArrival(st, site) {
  const w = site.wreck;
  if (!w || w.seen || wreckDone(w)) return;
  w.seen = true;
  openEvent(approachScene(st, site));
}
function approachScene(st, site) {
  const w = site.wreck, reader = wreckReader(st);
  return { title: salvageSay('approach.title', { name: w.name }), personal: true, owner: 'you',
    text: `${salvageSay(`intro.${w.type}`, { name: w.name })} ${wreckStory(w, 0)}`,
    choices: [{ label: salvageSay('approach.label'), run: () => salvageSay('approach.result', { reader: reader ? reader.first : salvageSay('nobody') }) }] };
}

// The shift (the dock's button): the next section's scene. The day turns when the crew cuts, not when the scene opens.
function cutScene(st, site) {
  const w = site.wreck, depth = w.cut + 1, reader = wreckReader(st), bexa = reader && reader.cast === 'bexa';
  const risk = sectionRisk(depth, false), read = readWord(risk, bexa ? Math.max(3, reader.skill) : roleSkill('engineer'));
  const pax = read !== 'clean' && castOnHand(st, 'pax');
  const readLine = reader ? salvageSay(`read.${bexa ? 'bexa' : 'other'}.${read}`, { reader: reader.first }) : '';
  const choices = [{ label: salvageSay('cut.label'), run: () => cutSection(st, site, false, { read, pax }) }];
  if (depth > 1) choices.push({ label: salvageSay('careful.label'), run: () => cutSection(st, site, true, { read, pax }) });
  choices.push({ label: salvageSay('home.label'), run: () => haulHome(st, site, read) });
  return { title: salvageSay('cut.title', { name: w.name, n: depth }), personal: true, owner: 'you',
    text: [salvageSay(`section.${depth}`), readLine, pax ? salvageSay('pax') : '', salvageSay('room', { room: cargoFree() })].filter(Boolean).join(' '), choices };
}

// Bexa's bad read heeded (hauled home or cut carefully) pleases her, a little.
const heeded = (st, read) => { const b = castOnHand(st, 'bexa'); if (b && read === 'bad') like(b, 1, salvageSay('memory.bexa')); };

function haulHome(st, site, read) {
  site.wreck.left = true;
  heeded(st, read);
  const reader = wreckReader(st);
  return salvageSay('home.result', { reader: reader ? reader.first : salvageSay('nobody') });
}

// One section cut: a day passes, the take goes aboard as far as the hold has room, an intact part goes to the spares, the risk is rolled once
// (under the odds, the trouble is by where under: someone hurt, a system hit or the section lost), the client's find and a lead come off
// their sections, and the cut is counted.
function cutSection(st, site, careful, { read, pax }) {
  const w = site.wreck, depth = w.cut + 1, job = career().job, t = WRECK_TYPES[w.type], risk = sectionRisk(depth, careful);
  const roll = Math.random(), trouble = roll < risk ? riskOutcome(roll / risk) : null, out = [wreckStory(w, depth)];  // rolled before the day turns, whose events draw dice too
  st.day++; Mods.emit('newDay', st.day);
  if (careful) heeded(st, read);
  if (depth === 1) recordHand('wrecksCut');
  w.cut = depth;
  if (trouble === 'lost') {
    w.lost.push(depth);
    out.push(salvageSay('lost'));
    if (depth === w.find && job && job.site === site.id) out.push(salvageSay('lost.find', { find: t.findWord }));
  } else {
    const take = sectionTake(w.type, depth, careful, cargoFree());
    if (take.tons) { st.cargo[take.good] = (st.cargo[take.good] || 0) + take.tons; st.paid[take.good] = st.paid[take.good] || 0; }
    out.push(salvageSay(careful ? 'careful.result' : 'cut.result', { take: take.tons ? `${take.tons}t of ${goodName(take.good).toLowerCase()}` : salvageSay('take.none') }));
    if (sectionPart(w, depth)) {
      const q = PART_QUIRKS[salvageRoll(`${depth}|quirk|${w.seed}`) % PART_QUIRKS.length], from = `off the wreck of the ${w.name}`;
      st.spares = st.spares || [];
      st.spares.push({ system: q.system, quirk: { ...q, from }, from });
      out.push(salvageSay('part', { part: SHIP_PARTS[q.system].name.toLowerCase() }));
    }
    if (depth === w.find && job && job.site === site.id) { job.got = true; out.push(salvageSay('find', { find: t.findWord[0].toUpperCase() + t.findWord.slice(1) })); }
    if (depth === w.leadAt && w.lead) { const o = findSite(st, w.lead, st.day); if (o) out.push(salvageSay('lead', { other: o.name, au: o.au.toFixed(1) })); }
  }
  if (trouble === 'hurt') {
    const team = [wreckReader(st), ...st.crew.map(person).filter(p => p && !p.dead && !(st.injured || {})[p.id])].filter(Boolean);
    const who = team[salvageRoll(`${depth}|hurt|${w.seed}`) % Math.min(2, team.length)];  // the team's lead, or the one beside them
    if (who) {
      injured()[who.id] = true; recordHand('matesHurt');
      out.push(salvageSay('hurt', { name: who.first }));
      const p = pax && castOnHand(st, 'pax');
      if (p && !careful) like(p, -1, salvageSay('memory.pax', { name: who.first }));
    }
  }
  if (trouble === 'system') {
    const sys = Object.keys(SHIP_PARTS)[salvageRoll(`${depth}|sys|${w.seed}`) % Object.keys(SHIP_PARTS).length];
    const c = condition(); c[sys] = Math.max(0, c[sys] - 15);
    out.push(salvageSay('system', { system: SHIP_PARTS[sys].name.toLowerCase() }));
  }
  if (depth === 3) out.push(salvageSay('done'));
  return out.join(' ');
}

// The dock's button at a wreck: the next section's shift, until she is cut out or the player hauls home.
function cutWreck() {
  const st = G.state, site = siteOf(st, st.systemId);
  if (!site || !site.wreck || wreckDone(site.wreck) || G.mode !== 'landed' || G.dialog) return false;
  openEvent(cutScene(st, site));
  return true;
}
const salvageDockHtml = st => {
  const site = siteOf(st, st.systemId), w = site && site.wreck;
  return w && !wreckDone(w) ? `<button data-action="cutWreck" class="primary">Cut into the wreck (section ${w.cut + 1}) (T)</button>` : '';
};

// ---------- the survey at a rock ----------
// One scene: the pilot works the scopes (the crew's best pilot, or the player if the player flies), and the report's quality is the margin
// of a check on it: well under it good, over it poor. The words are the lines of 'scene:survey' (hiredscenes.js).
const SURVEY_GOOD = 0.25;  // the margin under the check that makes a good report
const surveyQuality = (skill, roll) => { const p = check(STAT_BASE, skill, 0); return roll >= p ? 'poor' : p - roll >= SURVEY_GOOD ? 'good' : 'fair'; };
const surveySay = (key, vars) => sceneSay('scene:survey', key, vars);
function surveyArrival(st, site) {
  const job = career() && career().job;
  if (site.seen || !job || job.kind !== 'survey' || job.site !== site.id) return;
  site.seen = true;
  openEvent(surveyScene(st, site));
}
function surveyScene(st, site) {
  const pilot = roleHolder('pilot'), who = pilot ? pilot.first : surveySay('you');
  return { title: surveySay('title', { name: site.name }), personal: true, owner: 'you', text: surveySay('text', { name: site.name, pilot: who }),
    choices: [{ label: surveySay('label'), run: () => {
      const job = career().job, q = surveyQuality(roleSkill('pilot'), Math.random());
      if (job && job.site === site.id) { job.quality = q; job.got = true; }
      recordHand('rocksSurveyed');
      return surveySay(`result.${q}`, { pilot: who, client: job ? job.client : '' });
    } }] };
}

Mods.register({
  id: 'salvage', name: 'Wrecks and salvage', builtin: true,
  init(M) {
    M.action('takeJob', i => { const text = takeJob(Number(i)); if (text) UI.notes.push(text); });
    M.action('cutWreck', () => cutWreck());
  },
});
