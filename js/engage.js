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
  else if (Math.random() < Math.min(0.55, (hired() ? HAND_RAID.base : 0.05) + (hired() ? HAND_RAID.per : 0.6) * Math.max(danger(from), danger(to))) * SCAN_MAX) spec = { kind: 'pirate' };  // they get a second look when the drive runs cool (below)
  if (spec) t.intercept = { spec, at: t.total * rand(0.25, 0.7) };
}

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
// spoof. A win starts the raid with you two ahead and a loss one behind, as the post's own move in a raid does (RAID_POST, engagements.js); a
// loss also costs a share of the hull where `hull` is set, as a failed run does (startRaid).
const HAND_CONTACT = {
  pilot: { label: 'Take the helm and break her intercept', hull: true,
    win: 'You put the ship across her line before she has finished the turn and hold the burn at the edge of what the frame will take. She comes out of it two kilometers astern of where she meant to be, with her drive still swinging. Battle stations.',
    lose: 'You put the ship across her line a second late. She is already inside the turn, and her first burst takes the aft plating before the range opens enough to matter. Battle stations.' },
  gunner: { label: 'Put a burst across her bow',
    win: 'The burst crosses her bow at a kilometer. She comes off her line, and on the open band a voice asks whether you are always this friendly. Her guns are still warm. Battle stations.',
    lose: 'The burst goes wide. She has your range by then, and her answer comes back across the hull in three places. Battle stations.' },
  engineer: { label: 'Cut the drive and go dark', hull: true,
    win: 'You pull the drive down to a cold idle and the plume goes out. The ship coasts with the lights on emergency, and she overshoots your heading by eight kilometers before her sensors pick you up again. Battle stations.',
    lose: 'You cut the drive, and the relight from cold takes forty seconds the coolant loop does not have. She sees the plume come back up and closes while the board is still red. Battle stations.' },
};

function contactEvent(spec) {
  const st = G.state, d = fmt(Math.round(rand(3200, 3800) / 10) * 10);
  const who = { pirate: 'No transponder. The plume signature says pirate.', patrol: `Transponder: ${spec.gov} navy. You are wanted in their space.`,
    bounty: `Transponder spoofed, but the plume matches: ${spec.mission && spec.mission.targetName}, the ship you are hunting.`,
    hunter: `A hired gun. The captain says ${spec.person && `${spec.person.first} ${spec.person.last}`} sends regards.` }[spec.kind];
  // A crewed gunner fights it; with none, you take the guns yourself.
  const choices = [
    { label: `Battle stations (${gunnerLabel()})`, run: () => startDuel(spec, false) },
    { label: 'Burn hard to outrun them', run: () => startDuel(spec, true) },
  ];
  if (spec.kind === 'pirate') {
    choices.push({ label: 'Pay them off (10% of your credits, at least 500)', ...gated(needCr(500)), run() {
      const c = Math.max(500, Math.round(st.credits * 0.1));
      st.credits -= c;
      return `You transfer ${fmt(c)} cr. Their plume swings away.`;
    } });
    choices.push({ label: '[{crew}] Spoof a pirate transponder', role: 'slicer', run() {
      if (Math.random() < slicerOdds()) return '{crew}\'s fake transponder reads as one of their own. The plume swings away.';
      return `They see through it. ${startDuel(spec, false)}`;
    } });
  }
  // A hired hand whose post fits one of the options makes the call (hiredCall, hired.js): the option is theirs, rolled on their skill.
  const post = hired() && hired().post, hand = HAND_CONTACT[post];
  if (spec.kind === 'pirate' && hand) choices.push({ label: `[{crew}] ${hand.label}${costNote({ hull: hand.hull })}`, role: POSTS[post].role, run() {
    const won = Math.random() < Math.min(0.85, 0.5 + 0.1 * skillLevel(post));
    if (won) return startRaid(spec, false, { edge: 2, text: hand.win });
    const pts = hand.hull ? Math.round(ship().armor * 0.08) : 0;
    st.armor = Math.max(1, st.armor - pts);
    return startRaid(spec, false, { edge: -1, text: `${hand.lose}${pts ? ` Armor -${pts}.` : ''}` });
  } });
  const mine = post && choices.find(c => c.role === POSTS[post].role);
  if (mine) {
    mine.label = mine.label.replace('{crew}', POSTS[post].name); mine.own = true;  // shown with no crew member in the role (transit.js)
    if (!hand) mine.run = () => Math.random() < Math.min(0.85, 0.5 + 0.1 * skillLevel(post))  // Comms: the spoof
      ? 'Your fake transponder reads as one of their own. The plume swings away.'
      : `They see through it. ${startDuel(spec, false)}`;
  }
  if (spec.kind === 'patrol' && hired()) choices.push({ label: `Heave to and take the fine from the ship's fund`, run() {  // a hired hand has no 4,000 cr: the ship pays a quarter of its fund
    const fine = Math.round(st.credits * 0.25);  // st.credits is the ship's fund inside a hired hand's contact (hiredFunds)
    st.credits -= fine;
    st.rep[spec.gov] = Math.max(repOf(spec.gov), -10);
    like(person(hired().captain), -1, 'We were stopped by a patrol and it cost the fund.');
    return `You cut the drive and the cutter closes. The boarding officer reads the citation, and ${fmt(fine)} cr goes out of the ship's fund. The ship is logged as settled. For now.`;
  } });
  else if (spec.kind === 'patrol') choices.push({ label: 'Cut your drive and pay the fine (4,000 cr)', ...gated(needCr(4000)), run() {
    st.credits -= 4000;
    st.rep[spec.gov] = Math.max(repOf(spec.gov), -10);
    return 'They take your money and log your ship as settled. For now.';
  } });
  return { title: 'Contact', via: 'ship', ...(mine ? { owner: post } : {}), text: `Sensors: a drive plume at ${d} km, on an intercept course. ${who}`, choices };
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
