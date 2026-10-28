'use strict';

// Contacts during burns. Pirates, hostile patrols, bounty targets, and hired guns
// intercept you mid-burn, and a contact is settled with the card duel on the console
// (duel.js). Loaded before game.js; only calls into it at runtime.

const ENEMY_TORPS = { raider: 1, corsair: 3, cutter: 2, destroyer: 5 };

// "The Pirate ...", but not "The The Weeping Saint".
const theShip = n => (/^the /i.test(n.name) ? n.name : `The ${n.name}`);
// Whether the story's set pieces (story.js) are settled on the console. Every fight is,
// crewed gunner or not (#52); the local-space versions go in #56.
const consoleFights = () => true;

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
  else if (hired()) spec = handIntercept(hired(), st, to, Math.max(danger(from), danger(to)));
  else if (Math.random() < Math.min(0.55, 0.05 + 0.6 * Math.max(danger(from), danger(to))) * SCAN_MAX) spec = { kind: 'pirate' };  // they get a second look when the drive runs cool (below)
  if (spec) t.intercept = { spec, at: t.total * rand(0.25, 0.7) };
}

// A hired hand's contact on a burn nothing else claimed (fightladder.js): the ladder's step when one is due, else a random pirate at LADDER_RANDOM of
// the rate, of a type already met, and none before one is.
function handIntercept(h, st, to, danger) {
  const step = ladderNext(h, st, to);
  if (step) return step.spec;
  const met = ladderPirate(h, 0) !== null;  // any pirate type met yet
  if (!met || Math.random() >= Math.min(0.55, HAND_RAID.base + HAND_RAID.per * danger) * LADDER_RANDOM * SCAN_MAX) return null;
  return { kind: 'pirate', shipId: ladderPirate(h, Math.random()), pack: ladderPack(h) };
}
// A pirate for a scene that is not a burn's contact: a hand's is of a type met (a raider before any), an owner's is drawn as it always was.
const scenePirate = () => (hired() ? { kind: 'pirate', shipId: ladderPirate(hired(), Math.random()) || 'raider', pack: ladderPack(hired()) } : { kind: 'pirate' });

function makeEnemy(spec) {
  const sid = G.state.systemId, persona = makePerson(cultureOf(sid));
  const shipId = spec.shipId || (spec.kind === 'patrol' ? (Math.random() < 0.3 ? 'destroyer' : 'cutter')
    : spec.kind === 'pirate' ? (Math.random() < Math.min(0.6, danger(sid) + 0.2) ? 'corsair' : 'raider') : 'corsair');
  const n = makeShip(shipId, 0, 0, 0);
  Object.assign(n, { kind: spec.kind === 'patrol' ? 'patrol' : 'pirate', hostile: true, persona, captain: `${persona.first} ${persona.last}`, torps: ENEMY_TORPS[shipId] || 0, torpCd: rand(2, 4) });
  if (spec.kind === 'patrol') Object.assign(n, { gov: spec.gov, name: `${PATROL_NAMES[spec.gov]} "${shipName(false)}"` });
  else if (spec.kind === 'bounty') Object.assign(n, { name: spec.mission.targetName, bountyId: spec.mission.id });
  else if (spec.kind === 'hunter') Object.assign(n, { name: 'Hired gun', payer: `${spec.person.first} ${spec.person.last}` });
  else n.name = `Pirate "${shipName(true)}"`;
  if (spec.kind === 'bounty' || spec.kind === 'hunter') n.armor = n.maxArmor = SHIPS.corsair.armor * 1.4;
  // A story fight (story.js) names its ship and can make it tougher.
  if (spec.name) n.name = spec.name;
  if (spec.armorMult) n.armor = n.maxArmor = n.maxArmor * spec.armorMult;
  if (spec.story) n.story = true;
  return n;
}

// A hired hand's own move at a pirate contact (#386), one for each post that is not Comms (the spoof, below). Rolled on the hand's skill like the
// spoof. A win gives you the first volley of the fight and a loss gives it to her (fightui.js); a loss also costs a share of the hull where `hull`
// is set, as a failed run does (startShipFight). `range`: km the move opens (or closes, below nothing) the range the fight starts at, on a win and on a
// loss (#710, range.js). The words are the `move.<post>` lines of 'scene:contact' (hiredscenes.js).
const HAND_CONTACT = {
  pilot: { hull: true, range: [10, -10] },
  gunner: { range: [10, -10] },
  engineer: { hull: true, range: [20, -10] },
};
const contactSay = (key, vars) => sceneSay('scene:contact', key, vars);

// The line a ladder contact opens with in place of the sensor's (#810): the step's reason for coming, from the lines of 'scene:fight-entry'. `cap` is the
// hand's captain and `deal` the used Ore Runner on offer (h.deal), for the set piece's price.
const entryLine = (spec, cap, deal) => sceneSay('scene:fight-entry', `${spec.ladder}.text`,
  { cap: cap ? `Captain ${cap.last}` : 'The captain', patrol: spec.gov ? PATROL_NAMES[spec.gov] : '', price: deal ? fmt(deal.price) : '' });
// Running from a contact (outrunning it, spoofing it, paying it off) costs RUN_DAYS on the burn: they are added to the burn's length (transitDays and transitEta, engineering.js)
// so the arrival day moves by them, and said in the contact's own scene. Fighting costs none, and heaving to for a patrol is not running.
const RUN_DAYS = 2;
function loseBurnDays(t, n) { t.lost = (t.lost || 0) + n; return n; }
const runCost = () => (G.transit ? ` ${sceneSay('scene:fight', 'run.days', { days: dayWord(loseBurnDays(G.transit, RUN_DAYS)) })}` : '');
function contactEvent(spec) {
  const st = G.state, d = fmt(Math.round(rand(3200, 3800) / 10) * 10);
  const who = spec.ladder ? entryLine(spec, hiredCaptain(), hired() && hired().deal) : contactSay(`who.${spec.kind}`, { gov: spec.gov, target: spec.mission && spec.mission.targetName,
    payer: spec.person && `${spec.person.first} ${spec.person.last}` });
  // A crewed gunner fights it; with none, you take the guns yourself.
  const choices = [
    { label: contactSay('fight.label', { gunner: gunnerLabel() }), fight: true, run: () => startDuel(spec, false) },
    { label: contactSay('run.label'), run: () => startDuel(spec, true) },
  ];
  if (spec.kind === 'pirate') {
    choices.push({ label: contactSay('pay.label'), cost: true, ...gated(needCr(5000)), run() {
      const c = Math.max(5000, Math.round(st.credits * 0.1));
      st.credits -= c;
      return `${contactSay('pay.result', { cr: fmt(c) })}${runCost()}`;
    } });
    choices.push({ label: contactSay('spoof.label'), role: 'slicer', run() {
      if (Math.random() < slicerOdds()) return `${contactSay('spoof.win')}${runCost()}`;
      return `${contactSay('spoof.lose')} ${startDuel(spec, false)}`;
    } });
  }
  // A hired hand whose post fits one of the options makes the call (hiredCall, hired.js): the option is theirs, rolled on their skill.
  const post = lockPost(), hand = HAND_CONTACT[post];
  if (spec.kind === 'pirate' && hand) choices.push({ label: `[{crew}] ${contactSay(`move.${post}.label`)}${costNote({ hull: hand.hull, range: 'opens the range' }, postOdds(post))}`, role: POSTS[post].role, run() {
    const won = Math.random() < postOdds(post);
    if (won) return startShipFight(spec, false, { edge: 2, shift: hand.range[0], text: contactSay(`move.${post}.win`) });
    const pts = hand.hull ? Math.round(ship().armor * 0.08) : 0;
    st.armor = Math.max(1, st.armor - pts);
    return startShipFight(spec, false, { edge: -1, shift: hand.range[1], text: `${contactSay(`move.${post}.lose`)}${pts ? ` Armor -${pts}.` : ''}` });
  } });
  const mine = post && choices.find(c => c.role === POSTS[post].role);
  if (mine) {
    mine.label = mine.label.replace('{crew}', POSTS[post].name); mine.own = true;  // shown with no crew member in the role (transit.js)
    if (!hand) mine.run = () => Math.random() < postOdds(post)  // Comms: the spoof
      ? `${contactSay('spoof.own')}${runCost()}`
      : `${contactSay('spoof.lose')} ${startDuel(spec, false)}`;
  }
  if (spec.kind === 'patrol' && hired()) choices.push({ label: contactSay('heave.label'), cost: true, run() {  // a hired hand has no 40,000 cr: the ship pays a quarter of its fund
    const fine = heaveToFine();  // the navy's fine, the one a search charges (boarders.js)
    if (spec.ladder) ladderDone(hired(), spec.ladder);  // the ladder's cutter is a papers check: complying answers it, so the fine is paid once (fightladder.js)
    moveMoney(-fine);
    st.rep[spec.gov] = Math.max(repOf(spec.gov), -10);
    like(person(hired().captain), -1, sceneSay('scene:memories', 'patrol-fine.memory'));
    return contactSay('heave.result', { fine: fmt(fine) });
  } });
  else if (spec.kind === 'patrol') choices.push({ label: 'Cut your drive and pay the fine (40,000 cr)', cost: true, ...gated(needCr(40000)), run() {  // the owner's: the money is theirs
    st.credits -= 40000;
    st.rep[spec.gov] = Math.max(repOf(spec.gov), -10);
    return 'They take your money and log your ship as settled. For now.';
  } });
  return { title: contactSay('title'), via: 'ship', ...(mine ? { owner: post } : {}), text: contactSay('text', { km: d, who }), choices };
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
    const ev = TRANSIT_EVENTS.find(x => x.id === 'pirates');  // by id and key, since the editor can change its words (transit.js)
    if (ev) {
      for (const [key, flee] of [['fight', false], ['burn', true]]) {
        ev.choices.find(x => x.key === key).run = () => startDuel(scenePirate(), flee);
      }
    }
  },
});
