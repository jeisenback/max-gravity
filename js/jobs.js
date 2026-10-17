'use strict';

// Jobs on the station: work a hired hand does for their own savings, at the port the ship is docked at. The Missions tab lists two
// each landing (one is worked a visit); taking one plays it in stages: you choose how to go about it, a choice with a `check` is
// rolled against your post and level (and a crew member's help), and a lost one is where the danger is: you can be hurt (hurtHand),
// lose money, standing or the captain's regard. A job takes a day. All text is the job's own; the pay is yours, not the ship's.
// A job: { id, title, blurb, where?(planet), gov?, stages: [{ text, choices: [{ label, when?, check?: { post, bonus? }, win, lose }] }] }.
// An outcome: { text, pay?, rep?, xp?, hurt?, cost?, opinion?, next? (a stage to go to) }. Loaded after repairs.js.

const JOB_DAYS = 1, JOB_BOARD = 2;
// The check's post gives the stat; the hand's level counts on their own post only; a crew member who works the post helps.
const jobOdds = ck => { const h = hired(); return handCheck(POST_STAT[ck.post], h.post === ck.post ? skillLevel(h.post) : 0, 'job', (roleSkill(POSTS[ck.post].role) ? 0.1 : 0) + (ck.bonus || 0)); };

const JOBS = [
  { id: 'lock', title: 'A Jammed Freight Lock', blurb: 'A cargo lock has stuck half open with a loader crew behind it. The dockmaster will pay for hands that know a lock.',
    stages: [
      { text: ('A crowd has gathered at Lock Six, and a woman in a dockmaster\'s vest is shouting into a handset. The outer door has jammed half ' +
          'open, the inner door won\'t cycle, and somewhere in the gap four loaders are sealed in with an hour of air in their suits. "Anyone," the ' +
          'dockmaster says, to the crowd and to you. "Anyone who knows a lock."'),
        choices: [
          { label: 'Cut the manual release', check: { post: 'engineer' },
            win: { text: ('You find the release behind a panel nobody has opened in years, and cut the seized pin with a torch while the dockmaster ' +
                'counts the minutes aloud. The door goes with a bang. Four loaders come out into the light, and one of them sits down on the deck and ' +
                'laughs.'), pay: 250, xp: 'engineer', next: 1 },
            lose: { text: 'The pin is harder than it looked. You\'re still cutting when the inner door cycles on its own, and the edge of it catches you across the shoulder. The loaders get out by the other lock. You get a medic and a bandage.', hurt: true, pay: 40 } },
          { label: 'Talk the controller into an override', check: { post: 'comms' },
            win: { text: ('The lock controller is a tired man in a booth who has been told no by every system on the board. You give him the override ' +
                'sequence he didn\'t know he had, and a reason to try it. The lock shudders and cycles, and the loaders come out coughing.'), pay: 250, xp: 'comms', next: 1 },
            lose: { text: 'The controller won\'t hear you, or can\'t, and by the time somebody senior arrives the loaders are out and the dockmaster has already written down who was in the way. It was you.', opinion: -1 } },
          { label: 'Put your shoulder to the wheel', check: { post: 'gunner', bonus: -0.05 },
            win: { text: 'Six of you on the wheel, and the seized door gives a hand at a time. It\'s not clever and it\'s not quick, but it opens, and the dockmaster remembers the hand at the end of the bar.', pay: 150, xp: 'gunner', next: 1 },
            lose: { text: 'The wheel kicks back when the pin lets go and takes you across the ribs. Somebody else gets the door open. You get a bruise the shape of a handle, and nothing else.', hurt: true } },
          { label: 'Fetch the dockmaster the crew chief and stay out of it', win: { text: ('You run for the crew chief and bring her back, and the ' +
              'dockmaster takes it from there. It\'s the right call for someone who doesn\'t know locks, and nobody thanks you for it, which is also ' +
              'right.'), pay: 30 } },
        ] },
      { text: 'The foreman of the loader crew finds you afterwards, still shaking, with his helmet under his arm. "I owe you," he says. "I don\'t have much. I have this, or I have a word with the dockmaster, and that\'s worth more than you think on this pad."',
        choices: [
          { label: 'Take the credits (200 cr)', win: { text: 'He counts it out of a pocket on his suit, in coins and chits, and doesn\'t look at the number. "It\'s not enough," he says. It\'s more than enough, and you both know it.', pay: 200 } },
          { label: 'Take the word with the dockmaster', win: { text: 'The dockmaster writes your ship\'s name in a book behind the counter. "Berth discount," she says, "and a second look when you want to lift in a hurry." It\'s not cash, and it\'ll be worth something.', rep: 4 } },
        ] },
    ] },
  { id: 'message', title: 'A Message That Has to Go Quietly', blurb: 'A clerk needs a sealed message out over the long bands without traffic control reading it first.',
    stages: [
      { text: ('The clerk finds you at the back of the comms office, twisting a ring on a finger. "It\'s not illegal," she says. "It\'s just that if ' +
          'it goes through the port\'s relay, it\'ll be read by somebody who has a reason not to like it." She slides a chip across the counter. "I ' +
          'need it on the long bands to a ship that\'s six days out, and I need nobody to know I asked."'),
        choices: [
          { label: 'Put it on a ship\'s relay under a cargo header', check: { post: 'comms' },
            win: { text: 'You put it in a manifest packet, in the part of the header that nobody reads, and send it with the evening cargo burst. A relay six days out opens it and sends back a receipt. The clerk reads the receipt twice and puts it in her mouth.', pay: 220, xp: 'comms' },
            lose: { text: 'The packet is flagged at the relay for a malformed header. A customs clerk reads it before you can pull it back, and there\'s a visit to your ship the next morning, polite and thorough. Nothing\'s found, and nothing\'s forgotten.', rep: -4, cost: 60 } },
          { label: 'Carry it to a ship that\'s about to sail', check: { post: 'pilot', bonus: 0.05 },
            win: { text: 'You know a hauler in the next berth that\'s lifting within the hour, with a captain who owes nobody anything. She takes the chip and the fee without a question. The clerk gets a name in return, and no more.', pay: 180, xp: 'pilot' },
            lose: { text: 'The hauler lifts early, and you\'re left holding the chip on an empty berth, with the clerk watching from the gallery. She doesn\'t say anything. She doesn\'t pay either.', opinion: 0, cost: 20 } },
          { label: 'Refuse, politely', win: { text: 'You hand the chip back. "I understand," the clerk says, and she does, and goes to find somebody less careful. You don\'t find out who.' } },
        ] },
    ] },
  { id: 'escort', title: 'Escort on the Lower Decks', blurb: 'A debt courier is carrying a case through the lower decks tonight and wants somebody who can use a gun and a straight face.',
    stages: [
      { text: ('The courier is a thin man in a good coat who keeps both hands on a case. "It\'s not far," he says. "Three decks down, a lock, and a ' +
          'door with a lamp over it. There are people who\'d like what\'s in this case, and I\'d like them not to have it." He looks at your ' +
          'boots. "I pay for people who walk quietly."'),
        choices: [
          { label: 'Walk the lower decks ahead of him', check: { post: 'gunner' },
            win: { text: ('You see the two at the second junction before they see you, and they decide to see something else. At the door with the ' +
                'lamp the courier hands you the pay without a word and goes in. The door shuts. You walk back up alone, and nothing follows.'), pay: 300, xp: 'gunner', next: 1 },
            lose: { text: 'They\'re three, not two, and the third has a length of pipe. It\'s short and ugly in a narrow passage. The courier gets through to the lamp; you get through to a medic, with a split lip and a broken finger, and a handful of what he left you.', hurt: true, pay: 120 } },
          { label: 'Take him down a service route', check: { post: 'pilot' },
            win: { text: 'You know the service crawls better than the people who watch the main passages, and you take him through the ducts with a flashlight in your teeth. He\'s covered in dust at the other end and says nothing, and pays well for it.', pay: 260, xp: 'pilot', next: 1 },
            lose: { text: 'The service route is blocked by a pallet somebody has left across it, and the detour puts you in the open on the wrong deck. You get him out, but not unseen, and the pay is smaller for it.', pay: 90, rep: -2 } },
          { label: 'Tell him you won\'t go down there tonight', win: { text: '"I understand," the courier says, and goes down alone. You hear on the dock the next day that he made it. You hear on the dock a few days later that he didn\'t make the way back.' } },
        ] },
      { text: 'At the door with the lamp the courier turns. "There\'s a second case," he says. "It\'s not mine, and I don\'t know what\'s in it, and I\'d be grateful if somebody took it off the deck before tonight is over."',
        choices: [
          { label: 'Take it (and a half day more of your time)', win: { text: 'You carry it up through the passages and leave it with a woman at the top who doesn\'t ask who you are. The courier\'s thanks arrives that night in the form of a chit. You never learn what was in it.', pay: 180 } },
          { label: 'Leave it, and say you didn\'t see it', win: { text: 'You say you didn\'t see it, and the courier says that\'s what he thought. You go back up with the pay he owes, and the second case stays in the dark with the lamp.' } },
        ] },
    ] },
  { id: 'ration', title: 'Trouble in the Ration Line', blurb: 'A ration line is about to turn into a fight, and the warden wants someone who\'s not on either side.',
    stages: [
      { text: ('The line for the day\'s water runs around the corner and back, and at the head of it two families are shouting at the clerk, and at ' +
          'each other, over a ration chit that was issued twice. The warden catches your sleeve. "You\'re not from here," she says, "which is what I ' +
          'need. Somebody they both won\'t mind listening to."'),
        choices: [
          { label: 'Talk them down', check: { post: 'comms' },
            win: { text: 'You find out whose chit it\'s by asking whose child is whose, and the thing falls apart into a conversation about names. By the end both families are sharing a bench and the clerk is stamping new chits as fast as she can.', pay: 160, xp: 'comms', rep: 3 },
            lose: { text: 'You make it worse. Somebody says you\'re taking a side, and somebody else says which, and the shouting turns to shoving. You get out before the first real blow, with a cuff in the ear and the warden\'s eyes on your back.', hurt: true, opinion: 0, cost: 0 } },
          { label: 'Step between them', check: { post: 'gunner', bonus: -0.05 },
            win: { text: 'You put yourself in the gap with your hands open and don\'t move. For a while nobody does. Then the louder of the two men looks at you, and at the child on his hip, and steps back, and the line breathes out.', pay: 140, xp: 'gunner', rep: 2 },
            lose: { text: 'Somebody doesn\'t step back. It\'s a short, shapeless scuffle, and you come out of it with a cut over the eye and a ration chit nobody will own.', hurt: true } },
          { label: 'Get the warden and let her handle it', win: { text: 'You bring the warden her own people, and she finds a way. You keep out of the line itself, and she gives you a half ration of thanks, which is the right size.', pay: 40 } },
        ] },
    ] },
];

// ---------- the board ----------
// Two jobs a day, the same two for the port and the day (so the tab does not change under you), and one worked a day: a night in port (stay.js) brings a new board,
// since the days ashore are the hand's (docs/superpowers/specs/2026-10-17-contracts-design.md).
const jobBoard = () => {
  const h = hired(), st = G.state, key = `${st.planet}@${st.day}`;
  if (!h.board || h.board.key !== key) {
    const list = JOBS.filter(j => !j.where || j.where(currentPlanet())), start = Math.abs(hash(key)) % list.length;
    h.board = { key, ids: Array.from({ length: Math.min(JOB_BOARD, list.length) }, (_, i) => list[(start + i) % list.length].id), done: false };
  }
  return h.board;
};

// ---------- playing one ----------
function applyJob(o, scale = 1) {
  const st = G.state, h = hired(), cap = hiredCaptain();
  const bits = [];
  if (o.pay) { const pay = Math.round(o.pay * scale / 10) * 10; st.credits += pay; bits.push(`+${fmt(pay)} cr`); }  // work further away pays more (ctx.scale)
  if (o.cost) { st.credits = Math.max(0, st.credits - o.cost); bits.push(`-${fmt(o.cost)} cr`); }
  if (o.xp) gainSkill(o.xp, 2);
  if (o.rep) changeRep(localGov(), o.rep);
  if (o.opinion) like(cap, o.opinion, o.opinion > 0 ? 'You did good work ashore.' : 'You made a mess ashore.');
  const hurt = o.hurt ? hurtHand({ ashore: true }) : '';  // the clinic and the days, never the death roll (boarders.js)
  return `${o.text}${bits.length ? ` (${bits.join(', ')})` : ''}${hurt ? ` ${hurt}` : ''}`;
}
// The editor's words for a job (#457): the job itself, `job:lock` or `away:package`, has its title and its blurb on the board (the override's `title` and `text`); each stage,
// `job:lock:0`, has its own title (else the job's), its text, and for each choice its label and the lines for a win and a lose. The odds, the pay and what a choice does are in code.
const jobId = job => `${typeof AWAY !== 'undefined' && AWAY.includes(job) ? 'away' : 'job'}:${job.id}`;
const jobTitle = job => sceneOverride(jobId(job)).title || job.title;  // plain, like any title: the page that shows it escapes it
const jobBlurb = (job, html) => { const t = sceneOverride(jobId(job)).text; return t === undefined ? job.blurb : html ? esc(t) : t; };  // plain on the board (which escapes it), escaped in a scene's text
function jobStage(job, i, ctx = {}) {
  const h = hired(), stage = job.stages[i], fill = t => t.replace(/\{(\w+)\}/g, (m, k) => (ctx[k] !== undefined ? ctx[k] : m));
  const so = sceneOverride(`${jobId(job)}:${i}`), co = k => (so.choices || {})[k] || {};
  return { title: fill(so.title || jobTitle(job)), text: fill(so.text ? esc(so.text) : stage.text), personal: true, via: 'station', owner: 'you',
    choices: stage.choices.map((c, k) => ({ c, k })).filter(({ c }) => !c.when || h.post === c.when.post).map(({ c, k }) => {
      const odds = c.check ? jobOdds(c.check) : 1, lose = c.lose || {};  // the post the check is on, its odds, and what a lost one costs (costNote, engagements.js)
      const tag = c.check ? costNote({ who: POSTS[c.check.post].name, hand: !!lose.hurt, cost: lose.cost || 0, rep: lose.rep < 0, marks: lose.opinion < 0 }, odds) : '';
      return { label: fill(`${co(k).label || c.label}${tag}`), run() {
        const won = !c.check || Math.random() < odds, base = won ? c.win : (c.lose || c.win), mine = won || !c.lose ? co(k).win : co(k).lose, o = mine ? { ...base, text: esc(mine) } : base;
        const text = fill(applyJob(o, ctx.scale || 1));
        if (won && o.next !== undefined && job.stages[o.next]) G.nextEvent = jobStage(job, o.next, ctx);
        else { repairDays(JOB_DAYS); }
        return text;
      } };
    }) };
}

// A job's terms for the board (#690), read from its stages: the posts its choices roll on, in the posts' order, and the most a run through it
// can pay (the best win at each stage, and the stage it leads to). The floor is nothing, since a lost roll pays nothing, so it is not said.
function jobTerms(job) {
  const posts = Object.keys(POSTS).filter(p => job.stages.some(s => s.choices.some(c => c.check && c.check.post === p))).map(p => POSTS[p].name);
  const best = i => Math.max(...job.stages[i].choices.map(c => (c.win.pay || 0) + (c.win.next !== undefined && c.win.next > i && job.stages[c.win.next] ? best(c.win.next) : 0)));
  return { posts, pay: best(0) };
}
const jobTermsLine = job => { const t = jobTerms(job), who = t.posts.length > 1 ? `${t.posts.slice(0, -1).join(', ')} or ${t.posts[t.posts.length - 1]}` : t.posts[0]; return `${who ? `${who} \u00b7 ` : ''}up to ${fmt(t.pay)} cr`; };

function jobsHtml() {
  const h = hired(), board = jobBoard();
  return `<div class="post"><div class="eyebrow">Jobs on the station &middot; for your own savings</div>
    ${board.ids.map(id => { const j = JOBS.find(x => x.id === id); return `<div class="row"><span><b>${esc(jobTitle(j))}</b> <span class="hint">${esc(jobBlurb(j))}</span><br><span class="hint terms">${esc(jobTermsLine(j))}</span></span>
      <button data-action="takeJob" data-arg="${id}" ${board.done ? 'disabled' : ''}>Take it</button></div>`; }).join('')}
    <p class="hint">${board.done ? 'You have worked a job here today.' : 'One job a day. It takes the day, and the pay is yours.'}</p></div>`;
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
