'use strict';

// Jobs on the station: work a hired hand does for their own savings, at the port the ship is docked at. The Missions tab lists two
// each landing (one is worked a visit); taking one plays it in stages: you choose how to go about it, a choice with a `check` is
// rolled against your post and level (and a crew member's help), and a lost one is where the danger is: you can be hurt (hurtHand),
// lose money, standing or the captain's regard. A job takes a day. All text is the job's own; the pay is yours, not the ship's.
// A job: { id, title, blurb, where?(planet), gov?, stages: [{ text, choices: [{ label, when?, check?: { post, bonus? }, win, lose }] }] }.
// An outcome: { text, pay?, rep?, xp?, hurt?, cost?, opinion?, next? (a stage to go to) }. Loaded after repairs.js.

const JOB_DAYS = 1, JOB_BOARD = 2;
const jobOdds = ck => { const h = hired(), own = h.post === ck.post; return Math.min(0.9, 0.35 + (own ? 0.12 : 0.03) * skillLevel(h.post) + (roleSkill(POSTS[ck.post].role) ? 0.1 : 0) + (ck.bonus || 0)); };
const jobOddsWord = p => (p >= 0.7 ? 'good odds' : p >= 0.5 ? 'even odds' : 'long odds');

const JOBS = [
  { id: 'lock', title: 'A Jammed Freight Lock', blurb: 'A cargo lock has stuck half open with a loader crew behind it. The dockmaster will pay for hands that know a lock.',
    stages: [
      { text: 'A crowd has gathered at Lock Six, and a woman in a dockmaster\'s vest is shouting into a handset. The outer door has jammed half open, the inner door will not cycle, and somewhere in the gap four loaders are sealed in with an hour of air in their suits. "Anyone," the dockmaster says, to the crowd and to you. "Anyone who knows a lock."',
        choices: [
          { label: 'Cut the manual release', check: { post: 'engineer' },
            win: { text: 'You find the release behind a panel nobody has opened in years, and cut the seized pin with a torch while the dockmaster counts the minutes aloud. The door goes with a bang. Four loaders come out into the light, and one of them sits down on the deck and laughs.', pay: 250, xp: 'engineer', next: 1 },
            lose: { text: 'The pin is harder than it looked. You are still cutting when the inner door cycles on its own, and the edge of it catches you across the shoulder. The loaders get out by the other lock. You get a medic and a bandage.', hurt: true, pay: 40 } },
          { label: 'Talk the controller into an override', check: { post: 'comms' },
            win: { text: 'The lock controller is a tired man in a booth who has been told no by every system on the board. You give him the override sequence he did not know he had, and a reason to try it. The lock shudders and cycles, and the loaders come out coughing.', pay: 250, xp: 'comms', next: 1 },
            lose: { text: 'The controller will not hear you, or cannot, and by the time somebody senior arrives the loaders are out and the dockmaster has already written down who was in the way. It was you.', opinion: -1 } },
          { label: 'Put your shoulder to the wheel', check: { post: 'gunner', bonus: -0.05 },
            win: { text: 'Six of you on the wheel, and the seized door gives a hand at a time. It is not clever and it is not quick, but it opens, and the dockmaster remembers the hand at the end of the bar.', pay: 150, xp: 'gunner', next: 1 },
            lose: { text: 'The wheel kicks back when the pin lets go and takes you across the ribs. Somebody else gets the door open. You get a bruise the shape of a handle, and nothing else.', hurt: true } },
          { label: 'Fetch the dockmaster the crew chief and stay out of it', win: { text: 'You run for the crew chief and bring her back, and the dockmaster takes it from there. It is the right call for someone who does not know locks, and nobody thanks you for it, which is also right.', pay: 30 } },
        ] },
      { text: 'The foreman of the loader crew finds you afterwards, still shaking, with his helmet under his arm. "I owe you," he says. "I do not have much. I have this, or I have a word with the dockmaster, and that is worth more than you think on this pad."',
        choices: [
          { label: 'Take the credits (200 cr)', win: { text: 'He counts it out of a pocket on his suit, in coins and chits, and does not look at the number. "It is not enough," he says. It is more than enough, and you both know it.', pay: 200 } },
          { label: 'Take the word with the dockmaster', win: { text: 'The dockmaster writes your ship\'s name in a book behind the counter. "Berth discount," she says, "and a second look when you want to lift in a hurry." It is not cash, and it will be worth something.', rep: 4 } },
        ] },
    ] },
  { id: 'message', title: 'A Message That Has to Go Quietly', blurb: 'A clerk needs a sealed message out over the long bands without traffic control reading it first.',
    stages: [
      { text: 'The clerk finds you at the back of the comms office, twisting a ring on a finger. "It is not illegal," she says. "It is just that if it goes through the port\'s relay, it will be read by somebody who has a reason not to like it." She slides a chip across the counter. "I need it on the long bands to a ship that is six days out, and I need nobody to know I asked."',
        choices: [
          { label: 'Put it on a ship\'s relay under a cargo header', check: { post: 'comms' },
            win: { text: 'You put it in a manifest packet, in the part of the header that nobody reads, and send it with the evening cargo burst. A relay six days out opens it and sends back a receipt. The clerk reads the receipt twice and puts it in her mouth.', pay: 220, xp: 'comms' },
            lose: { text: 'The packet is flagged at the relay for a malformed header. A customs clerk reads it before you can pull it back, and there is a visit to your ship the next morning, polite and thorough. Nothing is found, and nothing is forgotten.', rep: -4, cost: 60 } },
          { label: 'Carry it to a ship that is about to sail', check: { post: 'pilot', bonus: 0.05 },
            win: { text: 'You know a hauler in the next berth that is lifting within the hour, with a captain who owes nobody anything. She takes the chip and the fee without a question. The clerk gets a name in return, and no more.', pay: 180, xp: 'pilot' },
            lose: { text: 'The hauler lifts early, and you are left holding the chip on an empty berth, with the clerk watching from the gallery. She does not say anything. She does not pay either.', opinion: 0, cost: 20 } },
          { label: 'Refuse, politely', win: { text: 'You hand the chip back. "I understand," the clerk says, and she does, and goes to find somebody less careful. You do not find out who.' } },
        ] },
    ] },
  { id: 'escort', title: 'Escort on the Lower Decks', blurb: 'A debt courier is carrying a case through the lower decks tonight and wants somebody who can use a gun and a straight face.',
    stages: [
      { text: 'The courier is a thin man in a good coat who keeps both hands on a case. "It is not far," he says. "Three decks down, a lock, and a door with a lamp over it. There are people who would like what is in this case, and I would like them not to have it." He looks at your boots. "I pay for people who walk quietly."',
        choices: [
          { label: 'Walk the lower decks ahead of him', check: { post: 'gunner' },
            win: { text: 'You see the two at the second junction before they see you, and they decide to see something else. At the door with the lamp the courier hands you the pay without a word and goes in. The door shuts. You walk back up alone, and nothing follows.', pay: 300, xp: 'gunner', next: 1 },
            lose: { text: 'They are three, not two, and the third has a length of pipe. It is short and ugly in a narrow passage. The courier gets through to the lamp; you get through to a medic, with a split lip and a broken finger, and a handful of what he left you.', hurt: true, pay: 120 } },
          { label: 'Take him down a service route', check: { post: 'pilot' },
            win: { text: 'You know the service crawls better than the people who watch the main passages, and you take him through the ducts with a flashlight in your teeth. He is covered in dust at the other end and says nothing, and pays well for it.', pay: 260, xp: 'pilot', next: 1 },
            lose: { text: 'The service route is blocked by a pallet somebody has left across it, and the detour puts you in the open on the wrong deck. You get him out, but not unseen, and the pay is smaller for it.', pay: 90, rep: -2 } },
          { label: 'Tell him you will not go down there tonight', win: { text: '"I understand," the courier says, and goes down alone. You hear on the dock the next day that he made it. You hear on the dock a few days later that he did not make the way back.' } },
        ] },
      { text: 'At the door with the lamp the courier turns. "There is a second case," he says. "It is not mine, and I do not know what is in it, and I would be grateful if somebody took it off the deck before tonight is over."',
        choices: [
          { label: 'Take it (and a half day more of your time)', win: { text: 'You carry it up through the passages and leave it with a woman at the top who does not ask who you are. The courier\'s thanks arrives that night in the form of a chit. You never learn what was in it.', pay: 180 } },
          { label: 'Leave it, and say you did not see it', win: { text: 'You say you did not see it, and the courier says that is what he thought. You go back up with the pay he owes, and the second case stays in the dark with the lamp.' } },
        ] },
    ] },
  { id: 'ration', title: 'Trouble in the Ration Line', blurb: 'A ration line is about to turn into a fight, and the warden wants someone who is not on either side.',
    stages: [
      { text: 'The line for the day\'s water runs around the corner and back, and at the head of it two families are shouting at the clerk, and at each other, over a ration chit that was issued twice. The warden catches your sleeve. "You are not from here," she says, "which is what I need. Somebody they both will not mind listening to."',
        choices: [
          { label: 'Talk them down', check: { post: 'comms' },
            win: { text: 'You find out whose chit it is by asking whose child is whose, and the thing falls apart into a conversation about names. By the end both families are sharing a bench and the clerk is stamping new chits as fast as she can.', pay: 160, xp: 'comms', rep: 3 },
            lose: { text: 'You make it worse. Somebody says you are taking a side, and somebody else says which, and the shouting turns to shoving. You get out before the first real blow, with a cuff in the ear and the warden\'s eyes on your back.', hurt: true, opinion: 0, cost: 0 } },
          { label: 'Step between them', check: { post: 'gunner', bonus: -0.05 },
            win: { text: 'You put yourself in the gap with your hands open and do not move. For a while nobody does. Then the louder of the two men looks at you, and at the child on his hip, and steps back, and the line breathes out.', pay: 140, xp: 'gunner', rep: 2 },
            lose: { text: 'Somebody does not step back. It is a short, shapeless scuffle, and you come out of it with a cut over the eye and a ration chit nobody will own.', hurt: true } },
          { label: 'Get the warden and let her handle it', win: { text: 'You bring the warden her own people, and she finds a way. You keep out of the line itself, and she gives you a half ration of thanks, which is the right size.', pay: 40 } },
        ] },
    ] },
];

// ---------- the board ----------
// Two jobs a landing, the same two for a given port and day (so the tab does not change under you), and one worked a visit.
const jobBoard = () => {
  const h = hired(), st = G.state, key = `${st.planet}@${st.day}`;
  if (!h.board || h.board.key !== key) {
    const list = JOBS.filter(j => !j.where || j.where(currentPlanet())), start = Math.abs(hash(key)) % list.length;
    h.board = { key, ids: Array.from({ length: Math.min(JOB_BOARD, list.length) }, (_, i) => list[(start + i) % list.length].id), done: false };
  }
  return h.board;
};

// ---------- playing one ----------
function applyJob(o) {
  const st = G.state, h = hired(), cap = hiredCaptain();
  const bits = [];
  if (o.pay) { st.credits += o.pay; bits.push(`+${fmt(o.pay)} cr`); }
  if (o.cost) { st.credits = Math.max(0, st.credits - o.cost); bits.push(`-${fmt(o.cost)} cr`); }
  if (o.xp) gainSkill(o.xp, 2);
  if (o.rep) changeRep(localGov(), o.rep);
  if (o.opinion) like(cap, o.opinion, o.opinion > 0 ? 'You did good work ashore.' : 'You made a mess ashore.');
  const hurt = o.hurt ? hurtHand({}) : '';
  return `${o.text}${bits.length ? ` (${bits.join(', ')})` : ''}${hurt ? ` ${hurt}` : ''}`;
}
function jobStage(job, i) {
  const h = hired(), stage = job.stages[i];
  return { title: job.title, text: stage.text, personal: true, via: 'station', owner: 'you',
    choices: stage.choices.filter(c => !c.when || h.post === c.when.post).map(c => {
      const odds = c.check ? jobOdds(c.check) : 1, tag = c.check ? ` [${POSTS[c.check.post].name}, ${jobOddsWord(odds)}]` : '';
      return { label: `${c.label}${tag}`, run() {
        const won = !c.check || Math.random() < odds, o = won ? c.win : (c.lose || c.win);
        const text = applyJob(o);
        if (won && o.next !== undefined && job.stages[o.next]) G.nextEvent = jobStage(job, o.next);
        else { repairDays(JOB_DAYS); }
        return text;
      } };
    }) };
}

function jobsHtml() {
  const h = hired(), board = jobBoard();
  return `<div class="post"><div class="eyebrow">Jobs on the station &middot; for your own savings</div>
    ${board.ids.map(id => { const j = JOBS.find(x => x.id === id); return `<div class="row"><span><b>${esc(j.title)}</b> <span class="hint">${esc(j.blurb)}</span></span>
      <button data-action="takeJob" data-arg="${id}" ${board.done ? 'disabled' : ''}>Take it</button></div>`; }).join('')}
    <p class="hint">${board.done ? 'You have worked a job here already this visit.' : 'One job a visit. It takes the day, and the pay is yours.'}</p></div>`;
}

const jobsMissionsView = UI.views.missions;
UI.views.missions = function () { return (hired() ? jobsHtml() : '') + jobsMissionsView.call(this); };

Mods.register({
  id: 'jobs', name: 'Jobs on the station', builtin: true,
  init(M) {
    M.action('takeJob', id => {
      const h = hired();
      if (!h || G.mode !== 'landed' || G.dialog) return;
      const board = jobBoard(), job = JOBS.find(j => j.id === id);
      if (!job || board.done || !board.ids.includes(id)) return;
      board.done = true;
      openEvent(jobStage(job, 0));
    });
  },
});
