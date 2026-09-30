'use strict';

// Projects: repairs, tuning, and refits that run across the days of a burn. Each needs
// machine parts from the hold and a crew role (an engineer, or a gunner for the guns);
// with nobody in the role you do it yourself, slower and with worse odds. Time only passes
// on a burn. Quick jobs wear off at the next port; a refit is permanent and can go wrong.
// Loaded before game.js; only calls into it at runtime.

const PARTS_ID = 'industrial';  // the Machine Parts commodity
const PROJECTS = {
  patch: { name: 'Patch a system', post: 'engineer', parts: 1, secs: 20, desc: 'Rebuild the system in the worst shape: +35 condition. A quick job.' },
  tune: { name: 'Tune the drive', post: 'engineer', parts: 1, secs: 25, desc: 'Burn 10% faster, until the next port. Can run the reactor hot if it goes wrong.' },
  refit: { name: 'Refit the fire control', post: 'gunner', parts: 3, secs: 60, desc: 'Permanently sharper guns and a fresh fire control. Can go wrong.' },
};

const partsHeld = () => G.state.cargo[PARTS_ID] || 0;
const projectsOf = () => { const st = G.state; return st.projects = st.projects || {}; };
const refits = () => { const st = G.state; return st.refits = st.refits || {}; };
const projectDoer = id => { const post = PROJECTS[id].post; return postMode(post) === 'crewed' ? postHolder(post) : null; };
// Crew do it in the time set; you take half as long again, and the odds are worse.
const projectOdds = id => { const d = projectDoer(id); return Math.min(0.95, d ? 0.6 + 0.12 * roleSkill(POSTS[PROJECTS[id].post].role) : 0.45); };

function canStart(id) { return !projectsOf()[id] && !Object.values(projectsOf()).some(p => PROJECTS[p.id].post === PROJECTS[id].post) && partsHeld() >= PROJECTS[id].parts; }

function startProject(id) {
  const P = PROJECTS[id], st = G.state;
  if (!P || !canStart(id)) return false;
  st.paid[PARTS_ID] = (st.paid[PARTS_ID] || 0) * (1 - P.parts / st.cargo[PARTS_ID]);
  st.cargo[PARTS_ID] -= P.parts;
  if (!st.cargo[PARTS_ID]) delete st.cargo[PARTS_ID];
  const secs = P.secs * (projectDoer(id) ? 1 : 1.5);
  projectsOf()[id] = { id, left: secs, total: secs };
  return true;
}

function finishProject(id) {
  const st = G.state, P = PROJECTS[id], doer = projectDoer(id), who = doer ? doer.first || doer.name : 'You', ok = Math.random() < projectOdds(id);
  delete projectsOf()[id];
  let text;
  if (id === 'patch') {
    const part = worstPart();
    if (ok) { const gain = Math.min(100 - condition()[part], 35); condition()[part] += gain; text = `${who} rebuilt the ${SHIP_PARTS[part].name.toLowerCase()}. Condition +${gain}.`; }
    else text = `${who} could not get the ${SHIP_PARTS[part].name.toLowerCase()} to take the repair, and the parts are gone.`;
  } else if (id === 'tune') {
    if (ok) { st.tuned = { drive: true }; text = `${who} tuned the drive. It will burn 10% faster until you next dock.`; }
    else { st.heat = Math.min(99, heat() + 30); text = `The tune goes wrong and the reactor runs hot for a while. ${who} shut it down before it scrammed.`; }
  } else {
    if (ok) { refits().fire = (refits().fire || 0) + 1; condition().fire = 100; text = `${who} refit the fire control. The guns hold their solutions better, for good.`; }
    else { condition().fire = Math.max(0, condition().fire - 25); text = `The refit goes badly: ${who} fried a card, and the fire control is worse than when ${doer ? 'they' : 'you'} started. The parts are gone.`; }
  }
  comm(`[Engineering] ${text}`);
  noteInbox('crew', `${P.name}: ${text}`);
  return text;
}

function projectsTick(dt) {
  const t = G.transit;
  if (!dt || G.mode !== 'transit' || !t || t.event || G.dialog) return;
  for (const p of Object.values(projectsOf())) if ((p.left -= dt) <= 0) finishProject(p.id);
}

// The projects a post can run: what is running, and what can be started.
function projectsHtml(post) {
  const running = Object.values(projectsOf()).find(p => PROJECTS[p.id].post === post);
  const list = Object.entries(PROJECTS).filter(([, P]) => P.post === post);
  return `<div class="post"><div class="eyebrow">Projects &middot; parts ${partsHeld()}t</div>
    ${running ? `<div class="slider"><span>${PROJECTS[running.id].name}</span><span class="pbar" data-project-bar="${running.id}"><i></i></span><span class="mono" data-project="${running.id}"></span></div>
      <p class="hint">${G.mode === 'transit' ? 'Work goes on while you burn.' : 'Work goes on while you burn. Nothing moves in port.'}</p>`
    : list.map(([id, P]) => `<div class="row"><div><b>${P.name}</b> <span class="hint">${P.parts}t parts, ${Math.round(P.secs * (projectDoer(id) ? 1 : 1.5))}s of burn, odds ${Math.round(projectOdds(id) * 100)}%</span><div class="hint">${P.desc}</div></div>
      <button data-action="project" data-arg="${id}" ${canStart(id) ? '' : 'disabled'} title="${partsHeld() < P.parts ? 'Not enough machine parts in the hold' : ''}">Start</button></div>`).join('')}
  </div>`;
}

function projectReadouts() {
  for (const p of Object.values(projectsOf())) {
    const pct = Math.round((1 - Math.max(0, p.left) / p.total) * 100);
    for (const el of document.querySelectorAll(`[data-project="${p.id}"]`)) el.textContent = `${pct}%`;
    for (const el of document.querySelectorAll(`[data-project-bar="${p.id}"]`)) el.firstElementChild.style.width = `${pct}%`;
  }
}

Mods.register({
  id: 'projects', name: 'Projects', builtin: true,
  init(M) {
    M.on('frame', dt => { projectsTick(dt); projectReadouts(); });
    M.on('landed', () => { G.state.tuned = null; });  // quick jobs wear off at the next port
    M.action('project', id => startProject(id));
  },
});
