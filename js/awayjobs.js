'use strict';

// Jobs somewhere else: a contact at a port offers work at another one, and the hand has to get the captain to fly them there. The
// captain picks the run, so you put it to them (once a stop per job) with an argument: the pay, what they owe you, that it is right,
// or a dare. How it lands is the captain's own character (barReact on their traits against what each argument loves and hates), then
// how far they trust you and what you know, and a roll. If they agree the run is set to that port (a light run if nothing there pays);
// if not, the job waits. At the far end the job plays like a station job (jobs.js): checks, danger, and your own pay. Loaded after jobs.js.

const AWAY_MAX = 2, AWAY_CHANCE = 0.5, PITCH_BASE = 0.35, AWAY_NEAR_DAYS = 6;  // work is offered at ports a few days out, when there are any

const AWAY = [
  { id: 'package', title: 'A Package for {dest}', blurb: '{who} has a sealed package for a contact on {dest}, and does not trust the post.',
    stages: [
      { text: 'The contact is waiting at the dock gate on {dest}, a man in a long coat who looks at your ship before he looks at you. He is not the one {who} described. He is too easy, too well dressed, and he knows your name. "I will take that off your hands," he says, and holds out both of them.',
        choices: [
          { label: 'Ask him what {who} said to say', check: { post: 'comms' },
            win: { text: ('You ask the question {who} made you carry, the one with no right answer for a stranger. He does not have it. He smiles, ' +
                'and does not try, and is gone into the crowd before you have finished putting the package away. You find the real contact an hour ' +
                'later, a woman in a grocery stall, and the pay with her.'), pay: 660, xp: 'comms', next: 1 },
            lose: { text: 'You ask, and he answers well enough, and you hand it over. It is not until the evening, when the real contact asks where it is, that you know the answer was a good guess. You are paid a fee for the trip, and nothing for the package.', pay: 130, rep: -2 } },
          { label: 'Walk him to a crowded place before you hand it over', check: { post: 'gunner' },
            win: { text: ('You steer him to the market square, one hand on the package and the other on the rail. In the open he changes his mind ' +
                'about what he wanted, and walks away with his hands in his coat. The real contact finds you at the next stall, laughing, and paying.'), pay: 620, xp: 'gunner', next: 1 },
            lose: { text: 'The market square is not as crowded as you thought. He steps close and the case leaves your hands in a movement you do not quite see, and the elbow that comes with it leaves you with a cracked rib. The fee is the fee, at least.', hurt: true, pay: 180 } },
          { label: 'Hand it over and take the fee', win: { text: 'You hand it over, and he thanks you in a voice you will not remember, and the fee is exactly what {who} promised. It is not until you are back on the ship that you think about his hands.', pay: 260 } },
        ] },
      { text: 'The woman at the grocery stall wraps the package in a cloth. "{who} said you would be careful," she says. "I would like to say thank you in a way that costs something."',
        choices: [
          { label: 'Take the extra credits ', win: { text: 'She counts it out into your palm from a tin of coins. You take it. It is a small, honest pleasure.', pay: 220 } },
          { label: 'Take a name for the next time', win: { text: 'She writes it on a scrap, and a street, and a time of day. "Tell them I sent you," she says. It is not cash, but you will not forget where it leads.', rep: 3 } },
        ] },
    ] },
  { id: 'stranded', title: 'A Hauler Down on {dest}', blurb: '{who}\'s brother is stuck on {dest} with a failed drive and no money for the yard. {who} cannot go. You could.',
    stages: [
      { text: ('The hauler sits at the far end of the apron on {dest}, listing a degree to port, with her drive housing open to the sky and a man ' +
          'underneath it who has not slept in a day. He climbs out when you hail. "{who} sent you," he says. "I have been telling the yard it is the ' +
          'injector, and the yard has been telling me it is three thousand credits."'),
        choices: [
          { label: 'Rebuild the injector', check: { post: 'engineer' },
            win: { text: ('It is the injector, and a cracked housing behind it that the yard did not mention. You spend a long afternoon in the ' +
                'housing with a torch in your teeth, and at dusk the drive lights on the first try. He does not say anything for a long time, and then ' +
                'he gives you what he has.'), pay: 750, xp: 'engineer', next: 1 },
            lose: { text: 'You get it half rebuilt before a feed line lets go and sprays you with hot coolant. He gets you out and wraps your arm in a wet cloth. The drive is no better, and you are in worse shape than it is. He gives you what he can for the effort.', hurt: true, pay: 180 } },
          { label: 'Tow her to the yard and argue the price down', check: { post: 'pilot' },
            win: { text: 'You take her in tow with a line you do not entirely trust, and drag her the length of the apron at a crawl. At the yard you argue, in her captain\'s name, for a price he can pay, and win. He pays you from what is left.', pay: 570, xp: 'pilot', next: 1 },
            lose: { text: 'The line parts a hundred meters from the yard, and the hauler\'s bow swings into a post. It is nobody\'s fault, and everybody says so. He pays for the post. You get a bill for the line.', cost: 60, opinion: 0 } },
          { label: 'Give him what you can spare and wish him luck (50 cr)', win: { text: 'You count fifty credits onto the hatch cover and wish him luck. He takes it the way a man takes a handhold, and does not say what he is thinking.', cost: 50 } },
        ] },
      { text: 'When the drive is running he walks you to the ramp. "I cannot pay you what it was worth," he says. "I can give you a berth on her any time you want one, if she is still flying. Or I can give you this."',
        choices: [
          { label: 'Take the credits ', win: { text: 'He puts it into your hand and closes your fingers over it. "It is what I have," he says. It is enough.', pay: 330 } },
          { label: 'Take the offer of a berth', win: { text: 'He shakes your hand on it. You cannot spend it, and you do not need to. A hauler\'s captain with a standing offer is worth more on the lanes than the credits would have been.', rep: 4 } },
        ] },
    ] },
  { id: 'witness', title: 'A Witness on {dest}', blurb: '{who} knows a dockworker on {dest} who saw something and needs an escort to give a statement. Nobody there will do it.',
    stages: [
      { text: ('The dockworker is waiting in the back room of a noodle stall on {dest}, a small woman with her coat buttoned to the neck and her ' +
          'hands flat on the table. "{who} said you would come," she says. "The office is four streets away. I have been told, twice, that I would not ' +
          'make it there." She looks at you. "I would like to make it there."'),
        choices: [
          { label: 'Walk her through the streets', check: { post: 'gunner' },
            win: { text: ('You take the middle of the street and keep her on the inside. A man steps out of a doorway ahead of you, and sees your ' +
                'face, and steps back into it. At the office she gives her statement for an hour, and when she comes out she takes your hand in both ' +
                'of hers.'), pay: 700, xp: 'gunner', next: 1 },
            lose: { text: 'They are waiting at the third corner, two of them, and it is short and ugly. You get her into a doorway and keep her there, and you get a broken tooth and a cut on the scalp for it. The office gets her statement after dark.', hurt: true, pay: 260 } },
          { label: 'Arrange a quiet meeting by relay instead', check: { post: 'comms' },
            win: { text: ('You make a call you should not be able to make, in a voice that sounds like an authorized one, and an officer from the ' +
                'office comes to the noodle stall in plain clothes and takes the statement over the counter. Nobody who was watching the street sees ' +
                'anything.'), pay: 620, xp: 'comms', next: 1 },
            lose: { text: ('The call goes through somebody else\'s relay. By the time the officer arrives, there is a man across the street with a ' +
                'good view of the stall, and the dockworker has gone out the back and has not come back. You get a fee for the trouble, and a lasting ' +
                'dislike of relays.'), rep: -3, pay: 130 } },
          { label: 'Tell her you cannot do this', win: { text: '"I understand," she says. She does not look surprised, and that is somehow the worst of it. You leave her at the table with her tea.' } },
        ] },
      { text: 'Before you go, the dockworker presses something into your hand: a key on a loop of string. "It is the locker at the back of the stall," she says. "{who} knows. It is for whoever comes."',
        choices: [
          { label: 'Open the locker (150 cr in a tin)', win: { text: 'The locker has a tin of credits and a folded note that says thank you in three languages. You take the credits and leave the note.', pay: 330 } },
          { label: 'Leave the locker for the next one', win: { text: 'You give her back the key and say it should stay for whoever comes. She puts it in her pocket with the look of someone who was going to say the same.', rep: 3 } },
        ] },
    ] },
];

const WHO = ['Mrs. Adeyemi', 'Old Tomas Reyes', 'Janek at the noodle counter', 'The woman at the pump', 'A man named Osei', 'Dr. Halloran'];

// ---------- offers ----------
function awayOffer() {
  const h = hired(), st = G.state, reach = Object.keys(SYSTEMS).filter(id => id !== st.systemId && inRange(st.systemId, id));
  if (!reach.length) return null;
  const near = reach.filter(id => travelDays(st.systemId, id) <= AWAY_NEAR_DAYS), sid = pick(near.length ? near : reach), dest = pick(SYSTEMS[sid].planets.filter(p => p.services.includes('trade') || p.services.includes('missions')) || SYSTEMS[sid].planets);
  const tpl = pick(AWAY.filter(t => !(h.away || []).some(a => a.tpl === t.id)) || AWAY);
  if (!tpl || !dest) return null;
  const days = Math.max(1, travelDays(st.systemId, sid));
  return { tpl: tpl.id, ctx: { dest: dest.name, from: st.planet, who: pick(WHO), system: SYSTEMS[sid].name, scale: Math.max(0.8, Math.min(1.6, days / 4)) }, sid, planet: dest.name, days, until: st.day + days * 2 + 14, pitched: null, booked: false };
}
const awayJob = a => AWAY.find(t => t.id === a.tpl);

// ---------- putting it to the captain ----------
const PITCH = [
  { id: 'pay', label: a => `Put the fee in front of them (it pays about 900 cr, all told)`, loves: ['greedy', 'secretive'], hates: ['pious', 'generous'],
    yes: 'looks at the figure, and at the route, and does the sum.', no: 'does not look at the figure.' },
  { id: 'owed', label: () => 'Call in what the captain owes you', opinion: { who: 'captain', min: OPINION.FRIEND }, loves: ['generous', 'kind', 'brave'], hates: ['greedy', 'rude'],
    yes: 'goes quiet, because it is true.', no: 'does not like being reminded of what they owe.' },
  { id: 'right', label: () => 'Say it is the right thing to do', loves: ['kind', 'pious', 'brave', 'homesick'], hates: ['greedy', 'rude'],
    yes: 'hears it out, and does not look away.', no: 'says the ship is not a charity.' },
  { id: 'dare', label: () => 'Dare them to take it', loves: ['brave', 'drunk', 'talkative'], hates: ['nervous', 'pious'],
    yes: 'laughs, short and sharp, and lets it stand.', no: 'does not take the bait.' },
];
function pitchOdds(arg, a) {
  const h = hired(), cap = hiredCaptain(), r = barReact(cap, arg.loves, arg.hates), plan = currentPlan();
  const fit = plan && plan.sid === a.sid ? 0.1 : 0, trust = 0.06 * Math.max(-3, Math.min(4, cap.opinion)), know = 0.04 * skillLevel(h.post);
  return Math.max(0.05, Math.min(0.9, PITCH_BASE + 0.2 * (r.n - 1) + trust + know + fit));
}
// The run to the job's port: the one already planned, one of the runners-up, or a light run if nothing there pays.
function bookRun(a) {
  const h = hired(), plan = currentPlan();
  const same = o => o && o.sid === a.sid && o.planet === a.planet;
  if (same(plan)) return plan;
  const alt = (h.plan.alts || []).find(same);
  const dest = SYSTEMS[a.sid].planets.find(p => p.name === a.planet);
  h.plan.run = alt ? { ...alt, ballast: false } : { sid: a.sid, planet: a.planet, yard: dest.services.includes('shipyard'), days: a.days, good: null, tons: 0, cost: 0, profit: 0, ballast: true };
  return h.plan.run;
}
function pitchScene(a) {
  const h = hired(), st = G.state, cap = hiredCaptain(), job = awayJob(a);
  const choices = PITCH.map(p => {
    const odds = pitchOdds(p, a);
    return { label: `${p.label(a)} [${jobOddsWord(odds)}]`, opinion: p.opinion, run() {
      a.pitched = `${st.day}@${st.planet}`;
      const r = barReact(cap, p.loves, p.hates), ok = Math.random() < odds;
      if (ok) {
        bookRun(a); a.booked = true;
        return `You put it to Captain ${cap.last}, and ${cap.first} ${r.n === 2 ? p.yes : 'listens, and weighs it'} ${r.line} "All right," ${cap.first} says. "${SYSTEMS[a.sid].name}, then. Do not make me regret it." The run is set for ${a.planet}.`.replace(/\s+/g, ' ');
      }
      like(cap, r.n < 0 ? -1 : 0, 'You pushed me to fly somewhere I did not want to go.');
      return `You put it to Captain ${cap.last}, and ${cap.first} ${r.n < 0 ? p.no : 'listens, and shakes their head'} ${r.line} "Not this run," ${cap.first} says. "Ask me again at the next stop, if it is still worth asking."`.replace(/\s+/g, ' ');
    } };
  });
  choices.push({ label: 'Never mind', run: () => 'You let it lie. The job will keep, for a while.' });
  return { title: 'Putting It to the Captain', personal: true, text: `${fill2(job.blurb, a.ctx)} It is ${a.ctx.dest}, ${a.ctx.system}: ${a.days} days out, and the captain has other runs in mind. How do you put it?`, choices };
}
const fill2 = (t, ctx) => t.replace(/\{(\w+)\}/g, (m, k) => (ctx[k] !== undefined ? ctx[k] : m));
const pitchedNow = a => a.pitched === `${G.state.day}@${G.state.planet}`;

// ---------- the board and the far end ----------
function awayHtml() {
  const h = hired(), list = h.away || [];
  if (!list.length) return '';
  return `<div class="post"><div class="eyebrow">Work elsewhere &middot; you would need the captain to fly you there</div>
    ${list.map((a, i) => `<div class="row"><span><b>${esc(fill2(awayJob(a).title, a.ctx))}</b> <span class="hint">${esc(fill2(awayJob(a).blurb, a.ctx))} ${esc(a.ctx.dest)}, ${esc(a.ctx.system)}, ${a.days} days. Until day ${a.until}.</span></span>
      ${a.booked ? '<span class="tag good">the captain is flying you there</span>' : `<button data-action="pitchJob" data-arg="${i}" ${pitchedNow(a) ? 'disabled' : ''}>Put it to the captain</button>`}</div>`).join('')}
    <p class="hint">Once a stop for each. The captain decides, by who they are and how they feel about you.</p></div>`;
}
const awayView = UI.views.missions;
UI.views.missions = function () { return (hired() ? awayHtml() : '') + awayView.call(this); };

Mods.register({
  id: 'awayjobs', name: 'Work elsewhere', builtin: true,
  init(M) {
    M.action('pitchJob', i => {
      const h = hired(), a = h && (h.away || [])[Number(i)];
      if (!a || G.mode !== 'landed' || G.dialog || a.booked || pitchedNow(a)) return;
      openEvent(pitchScene(a));
    });
    M.on('landed', planet => {
      const h = hired(), st = G.state;
      if (!h) return;
      h.away = (h.away || []).filter(a => { if (a.until >= st.day) return true; UI.notes.push(`The offer of work on ${a.planet} has lapsed.`); return false; });
      // the far end: a job for this port, wherever it was agreed
      const here = h.away.findIndex(a => a.planet === planet.name && a.sid === st.systemId);
      if (here >= 0) {
        if (G.dialog && G.nextEvent) return;  // nowhere to put it yet: it waits, and the offer keeps until its day
        const a = h.away.splice(here, 1)[0], ev = jobStage(awayJob(a), 0, a.ctx);
        if (G.dialog) G.nextEvent = ev; else openEvent(ev);
        return;
      }
      // a contact offers something, now and then, at a port with a board
      if (planet.services.includes('missions') && h.away.length < AWAY_MAX && Math.random() < AWAY_CHANCE) { const o = awayOffer(); if (o) { h.away.push(o); UI.notes.push(`${o.ctx.who} has work for someone who is going to ${o.planet}. It is on the Missions page.`); } }
    });
  },
});
