'use strict';

// Contacts during burns. Pirates, hostile patrols, bounty targets, and hired guns
// intercept you mid-burn, and a contact is settled with the card duel on the console
// (duel.js). Loaded before game.js; only calls into it at runtime.

const ENEMY_TORPS = { raider: 1, corsair: 3, cutter: 2, destroyer: 5 };

// "The Pirate ...", but not "The The Weeping Saint".
const theShip = n => (/^the /i.test(n.name) ? n.name : `The ${n.name}`);

// ---------- who intercepts you ----------
function planIntercept() {
  const t = G.transit, st = G.state, from = st.systemId, to = t.to;
  t.interceptPlanned = true;
  let spec = null;
  const bounty = st.missions.find(m => m.type === 'bounty' && [from, to].includes(m.targetSystem));
  const hostileGov = [SYSTEMS[to].gov, SYSTEMS[from].gov].find(g => PATROL_NAMES[g] && repOf(g) <= -15);
  if (bounty) spec = { kind: 'bounty', mission: bounty };
  else if (G.revenge) { spec = { kind: 'hunter', person: G.revenge }; G.revenge = null; }
  else if (hostileGov && Math.random() < 0.6) spec = { kind: 'patrol', gov: hostileGov };
  else if (Math.random() < Math.min(0.55, 0.05 + 0.6 * Math.max(danger(from), danger(to))) * SCAN_MAX) spec = { kind: 'pirate' };  // they get a second look when the drive runs cool (below)
  if (spec) t.intercept = { spec, at: t.total * rand(0.25, 0.7) };
}

function makeEnemy(spec) {
  const sid = G.state.systemId, persona = makePerson(cultureOf(sid));
  const shipId = spec.kind === 'patrol' ? (Math.random() < 0.3 ? 'destroyer' : 'cutter')
    : spec.kind === 'pirate' ? (Math.random() < Math.min(0.6, danger(sid) + 0.2) ? 'corsair' : 'raider') : 'corsair';
  const n = makeShip(shipId, 0, 0, 0);
  Object.assign(n, { kind: spec.kind === 'patrol' ? 'patrol' : 'pirate', hostile: true, persona, captain: `${persona.first} ${persona.last}`, torps: ENEMY_TORPS[shipId] || 0, torpCd: rand(2, 4) });
  if (spec.kind === 'patrol') Object.assign(n, { gov: spec.gov, name: `${PATROL_NAMES[spec.gov]} "${shipName(false)}"` });
  else if (spec.kind === 'bounty') Object.assign(n, { name: spec.mission.targetName, bountyId: spec.mission.id });
  else if (spec.kind === 'hunter') Object.assign(n, { name: 'Hired gun', payer: `${spec.person.first} ${spec.person.last}` });
  else n.name = `Pirate "${shipName(true)}"`;
  if (spec.kind === 'bounty' || spec.kind === 'hunter') n.armor = n.maxArmor = SHIPS.corsair.armor * 1.4;
  return n;
}

function contactEvent(spec) {
  const st = G.state, d = fmt(Math.round(rand(3200, 3800) / 10) * 10);
  const who = { pirate: 'No transponder. The plume signature says pirate.', patrol: `Transponder: ${spec.gov} navy. You are wanted in their space.`,
    bounty: `Transponder spoofed, but the plume matches: ${spec.mission && spec.mission.targetName}, the ship you are hunting.`,
    hunter: `A hired gun. The captain says ${spec.person && `${spec.person.first} ${spec.person.last}`} sends regards.` }[spec.kind];
  // A crewed gunner fights it; with none, you take the guns yourself.
  const choices = [
    { label: postMode('gunner') === 'crewed' ? `Battle stations (${roleName('gunner')} fights)` : 'Battle stations (you take the guns)', run: () => startDuel(spec, false) },
    { label: 'Burn hard to outrun them', run: () => startDuel(spec, true) },
  ];
  if (spec.kind === 'pirate') {
    choices.push({ label: 'Pay them off (10% of your credits, at least 500)', can: () => st.credits >= 500, run() {
      const c = Math.max(500, Math.round(st.credits * 0.1));
      st.credits -= c;
      return `You transfer ${fmt(c)} cr. Their plume swings away.`;
    } });
    choices.push({ label: '[{crew}] Spoof a pirate transponder', role: 'slicer', run() {
      if (Math.random() < slicerOdds()) return '{crew}\'s fake transponder reads as one of their own. The plume swings away.';
      return `They see through it. ${startDuel(spec, false)}`;
    } });
  }
  if (spec.kind === 'patrol') choices.push({ label: 'Cut your drive and pay the fine (4,000 cr)', can: () => st.credits >= 4000, run() {
    st.credits -= 4000;
    st.rep[spec.gov] = Math.max(repOf(spec.gov), -10);
    return 'They take your money and log your ship as settled. For now.';
  } });
  return { title: 'Contact', text: `Sensors: a drive plume at ${d} km, on an intercept course. ${who}`, choices };
}

Mods.register({
  id: 'burn-contacts', name: 'Contacts during burns', builtin: true,
  init(M) {
    M.on('frame', () => {
      const t = G.transit;
      if (G.mode !== 'transit' || !t) return;
      if (!t.interceptPlanned) planIntercept();
      if (t.intercept && !t.event && !G.dialog && t.total - t.left >= t.intercept.at) {
        const { spec } = t.intercept;
        t.intercept = null;
        // Pirates only find a ship they can see: a hot drive is easy to spot, a cool one is not.
        if (spec.kind === 'pirate' && Math.random() > scanVisibility() / SCAN_MAX) comm('[Scan] A drive plume sweeps past far off the bow, and does not turn.');
        else openEvent(contactEvent(spec));
      }
    });
    // The old text-only pirate ambush is a duel too.
    const ev = TRANSIT_EVENTS.find(x => x.title === 'Pirates Matching Course');
    if (ev) {
      for (const [label, flee] of [['Fight', false], ['Hard burn', true]]) {
        ev.choices.find(x => x.label.startsWith(label)).run = () => startDuel({ kind: 'pirate' }, flee);
      }
    }
  },
});
