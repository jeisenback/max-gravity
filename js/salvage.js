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
const sectionPart = (wreck, depth) => depth > 1 && hash(`${wreck.seed}|${wreck.name}|part|${depth}`) % (depth === 2 ? 3 : 2) === 0;
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
    const roll = hash(`${planet.name}|${day}|${kind}`) >>> 0, list = reach(siteKind);
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

Mods.register({
  id: 'salvage', name: 'Wrecks and salvage', builtin: true,
  init(M) {
    M.action('takeJob', i => { const text = takeJob(Number(i)); if (text) UI.notes.push(text); });
  },
});
