'use strict';

// What the bar offers beyond a drink, by who you are. A hired hand: side work for their own
// savings (one job a visit, plus a card game), and leads from the regulars on ships that are
// hiring (st.leads: a real captain and ship in the registry, to be taken up when swapping
// ships arrives). An owner: a regular's contract on the board, a tip on a bounty, and word of
// trouble on the lanes from the world's real state. Regulars are regulars.js's. Loaded after
// regulars.js; only calls into it at runtime.

const CARD_STAKE = 100, LEAD_EVERY = 12, MAX_LEADS = 4;
const TREAT = {
  kind: 'Looks after a hand, and notices when one is tired.', generous: 'Pays on time and a little over, by all accounts.',
  greedy: 'Counts every credit, and a hand\'s share is no exception.', rude: 'Shouts at a hand and means very little by it.',
  secretive: 'Keeps a hand out of the cargo and the plans.', talkative: 'Talks to a hand all watch, and teaches them a good deal by accident.',
  nervous: 'Careful to a fault, and a hand learns to check things twice.', brave: 'Takes risks, and expects a hand to keep up.',
  pious: 'Keeps a quiet ship and a day of rest.', curious: 'Lets a hand try things, and asks what they learned.',
  drunk: 'Fair when sober, and a good deal of the time they are.', homesick: 'Heads for home whenever the route allows.',
};

// ---------- a hired hand ----------
const sideWorkDone = () => !!(G.barState && G.barState.worked);

const SIDE_WORK = {
  odd: { label: 'Odd jobs for the bartender (about 50 cr)', can: () => !sideWorkDone(),
    run() { G.barState.worked = true; const n = randInt(4, 6) * 10; G.state.credits += n; return `You haul crates, change a keg and mop the back, and the bartender counts ${fmt(n)} cr into your hand without looking up.`; } },
  dock: { label: () => `A dock gig at your post (${60 + 40 * skillLevel(hired().post)} cr, and you learn a little)`, can: () => !sideWorkDone(),
    run() { const h = hired(), n = 60 + 40 * skillLevel(h.post); G.barState.worked = true; G.state.credits += n; gainSkill(h.post, 2); return `A dock boss who needs a ${POSTS[h.post].name.toLowerCase()} for a shift finds you at the bar. It is dull and well paid: ${fmt(n)} cr, and two more points of experience at the ${POSTS[h.post].name.toLowerCase()} post.`; } },
  cards: { label: `Sit in on a card game (${CARD_STAKE} cr stake)`, can: () => G.state.credits >= CARD_STAKE && !G.barState.played,
    run() {
      const st = G.state; G.barState.played = true;
      if (Math.random() < 0.5) { st.credits += CARD_STAKE; return `The cards fall your way, three hands out of five, and you leave the table ${fmt(CARD_STAKE)} cr up and not entirely sure how.`; }
      st.credits -= CARD_STAKE; return `The cards do not fall your way. You lose ${fmt(CARD_STAKE)} cr in four hands, and an older player tells you, kindly, that it is a cheap lesson.`;
    } },
};
const sideLabel = k => typeof SIDE_WORK[k].label === 'function' ? SIDE_WORK[k].label() : SIDE_WORK[k].label;

// ---------- leads for a hand ----------
function makeLead(regular) {
  const st = G.state, reachable = Object.keys(SYSTEMS).filter(id => inRange(st.systemId, id) || id === st.systemId);
  const cap = registerPerson(makePerson());
  cap.captain = { trade: randInt(1, 5), nerve: randInt(1, 5), thrift: randInt(1, 5) };
  cap.ship = { name: shipName(false), shipId: 'lightfreighter', kind: 'trader' };
  cap.haunt = pick(reachable);
  const role = POSTS[hired().post].role, wage = Math.round(ROLE_WAGE[role] * (0.8 + Math.random() * 0.4));
  return { pid: cap.id, from: regular.id, day: st.day, wage, share: pick([0.08, 0.1, 0.12, 0.15]), treat: TREAT[cap.traits[0]] };
}

function leadsHtml() {
  const st = G.state, rows = (st.leads || []).filter(l => st.people[l.pid]).map(l => {
    const c = st.people[l.pid], from = st.people[l.from];
    return `<div class="hint"><b>The ${c.ship.name}</b>, Captain ${fullName(c)} (${TRAITS[c.traits[0]].adj}), around ${SYSTEMS[c.haunt].name}. Pays ${fmt(l.wage)} cr/day and ${Math.round(l.share * 100)}% of a run. ${l.treat}${from ? ` Heard from ${from.first} ${from.last}.` : ''}</div>`;
  }).join('');
  return rows ? `<h3>Ships that are hiring</h3>${rows}` : '';
}

// ---------- leads for an owner ----------
// Word of trouble on the lanes, from the world's real conditions in the systems you can reach.
function troubleAhead() {
  const here = G.state.systemId;
  return Object.keys(SYSTEMS).filter(id => id !== here && inRange(here, id))
    .flatMap(id => conditions(id).filter(c => c.bad && /pirate/i.test(c.text)).map(c => c.text));
}

function ownerLeads(regular) {
  const st = G.state, reachable = Object.keys(SYSTEMS).filter(id => id !== st.systemId && inRange(st.systemId, id)), out = [];
  if (!reachable.length) return out;
  const sid = pick(reachable), dest = pick(SYSTEMS[sid].planets), days = baseDays(st.systemId, sid), tons = randInt(3, 12);
  G.offers.unshift({
    type: 'delivery', good: `goods for ${regular.first}'s people`, tons, destSystem: sid, destPlanet: dest.name, regular: true, contact: regular.id,
    title: `${regular.first} ${regular.last} has a delivery: ${tons}t to ${dest.name}`, pay: 1500 + days * 400 + tons * 100, deadline: st.day + days * 2 + 5,
  });
  out.push(`${regular.first} has a job for someone they trust. It is on the mission board.`);
  const pirates = reachable.filter(id => SYSTEMS[id].pirates > 0), names = PIRATE_NAMES.filter(n => ![...G.offers, ...st.missions].some(m => m.targetName === n));
  if (pirates.length && names.length && Math.random() < 0.4) {
    const tsid = pick(pirates), name = pick(names);
    G.offers.unshift({ type: 'bounty', targetSystem: tsid, targetName: name, issuer: localGov(), contact: regular.id,
      title: `Bounty tip from ${regular.first}: destroy ${name} near ${SYSTEMS[tsid].name}`, pay: randInt(8, 16) * 1000, deadline: st.day + baseDays(st.systemId, tsid) * 2 + 10 });
    out.push(`${regular.first} says ${name} has been seen near ${SYSTEMS[tsid].name}, and that someone is paying for it. That is on the board too.`);
  }
  return out;
}

// Once a visit (and at most once in a while per regular), one regular has something for you.
function barLeads(planet) {
  const st = G.state, lines = [];
  if (hired() && scopeOff('barwork')) { G.barState.leadLines = lines; return; }
  for (const { p } of G.patrons.filter(x => x.regular)) {
    if ((p.leadAt || -1e9) + LEAD_EVERY > st.day || Math.random() > 0.5) continue;
    p.leadAt = st.day;
    if (hired()) {
      st.leads = (st.leads || []).filter(l => st.people[l.pid]);
      if (st.leads.length >= MAX_LEADS) st.leads.shift();
      const l = makeLead(p); st.leads.push(l);
      lines.push(`${p.first} knows of a ship that is hiring: the ${st.people[l.pid].ship.name}.`);
    } else if (planet.services.includes('missions')) lines.push(...ownerLeads(p));
    break;
  }
  G.barState.leadLines = lines;
}

function barWorkHtml() {
  const lines = (G.barState.leadLines || []).map(l => `<div class="hint">${l}</div>`).join('');
  if (hired() && scopeOff('barwork')) return '';
  if (hired()) return `${lines}<h3>Work for yourself</h3>${Object.keys(SIDE_WORK).map(k => `<div class="row"><button data-action="sideWork" data-arg="${k}" ${SIDE_WORK[k].can() ? '' : 'disabled'}>${sideLabel(k)}</button></div>`).join('')}${leadsHtml()}`;
  const trouble = troubleAhead().slice(0, 2).map(t => `<div class="hint">Word on the lanes: ${t}.</div>`).join('');
  return lines + trouble;
}

Mods.register({
  id: 'barwork', name: 'Bar work and leads', builtin: true,
  init(M) {
    M.action('sideWork', k => {
      const w = SIDE_WORK[k];
      if (!hired() || scopeOff('barwork') || !w || !w.can()) return;
      G.barState.note = w.run();
    });
  },
});
