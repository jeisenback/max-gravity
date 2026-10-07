'use strict';

// Programs: standing rules for crewed stations. A slicer (the comms post) writes one over
// the days of a burn: pick a condition and an order, and while the ship is crewed at that
// post the rule fires by itself each time the condition comes true ("when the reactor runs
// hot, balance the load"). Writing takes time and skill but no cargo space; there are a few
// slots, and a slicer can write one more rule table entry's worth of room, up to three.
// A fixed list of conditions and orders: no scripting. Loaded before game.js; only calls
// into it at runtime.

const PROGRAM_SECS = 60, SLOT_SECS = 90, SLOTS_MAX = 3;
// When a rule fires. `test` is checked each second of a burn; 'contact' fires when a contact opens.
const PROGRAM_CONDITIONS = {
  heat: { name: 'the reactor runs hot', test: () => heat() >= 75 },
  armor: { name: 'the hull is below half', test: () => G.state.armor < ship().armor * 0.5 },
  fuel: { name: 'reaction mass is low', test: () => G.state.fuel < ship().fuel * 0.25 },
  wear: { name: 'a system is failing', test: () => condition()[worstPart()] < 50 },
  contact: { name: 'a contact appears', test: null },
};
// Orders a program may use: those of the engineer and the comms post that can run unattended.
const PROGRAM_POSTS = ['engineer', 'comms'];

const programs = () => {
  const st = G.state, p = st.programs = st.programs || { slots: 1, rules: [], writing: null };
  return p;
};
const programOrders = () => PROGRAM_POSTS.flatMap(post => postOrders(post).map(o => ({ post, ...o })));
const programOrder = (post, id) => programOrders().find(o => o.post === post && o.id === id);
const programDoer = () => postMode('comms') === 'crewed' ? postHolder('comms') : null;
const programOdds = () => Math.min(0.95, programDoer() ? 0.6 + 0.12 * roleSkill('slicer') : soloOdds('comms'));
const programDraft = { cond: null, order: null };  // the rule being picked on the station (not saved)

function writeProgram(cond, post, order) {
  const p = programs();
  if (hired() || p.writing || !PROGRAM_CONDITIONS[cond] || !programOrder(post, order) || p.rules.length >= p.slots) return false;
  const secs = PROGRAM_SECS * (programDoer() ? 1 : 1.5);
  p.writing = { kind: 'rule', cond, post, order, left: secs, total: secs };
  return true;
}

function extendPrograms() {
  const p = programs();
  if (hired() || p.writing || p.slots >= SLOTS_MAX) return false;
  const secs = SLOT_SECS * (programDoer() ? 1 : 1.5);
  p.writing = { kind: 'slot', left: secs, total: secs };
  return true;
}

function removeProgram(i) { programs().rules.splice(i, 1); }

function finishWriting() {
  const p = programs(), w = p.writing, doer = programDoer(), who = doer ? doer.first || doer.name : 'You', ok = Math.random() < programOdds();
  p.writing = null;
  if (!doer) gainSkill('comms', 1);
  let text;
  if (w.kind === 'slot') {
    if (ok) { p.slots++; text = `${who} cleaned up the rule table and made room for another program (${p.slots} in all).`; }
    else text = `${who} spent the watches on the rule table and came out with nothing that would run.`;
  } else if (ok && p.rules.length < p.slots) {
    p.rules.push({ cond: w.cond, post: w.post, order: w.order, on: false });
    text = `${who} finished a program: when ${PROGRAM_CONDITIONS[w.cond].name}, ${programOrder(w.post, w.order).name.toLowerCase()}.`;
  } else text = `${who} could not get the program to run, and scrapped it.`;
  comm(`[Comms] ${text}`);
  noteInbox('crew', text);
}

function fireProgram(r) {
  if (postMode(r.post) !== 'crewed') return;  // a rule only runs a crewed post
  const note = giveOrder(r.post, r.order);
  if (note) { comm(`[Program] ${note}`); noteInbox('crew', `Program: ${note}`); }
}

function programsTick(dt) {
  const t = G.transit;
  if (!dt || G.mode !== 'transit' || !t || t.event || G.dialog) return;
  const p = programs();
  if (p.writing && (p.writing.left -= dt) <= 0) finishWriting();
  for (const r of p.rules) {
    const c = PROGRAM_CONDITIONS[r.cond];
    if (!c.test) continue;
    const now = c.test();
    if (now && !r.on) fireProgram(r);  // on the rising edge only
    r.on = now;
  }
}

function programsHtml() {
  if (hired()) return '';  // standing rules for a crew are the captain's business
  const p = programs(), w = p.writing, conds = Object.entries(PROGRAM_CONDITIONS), orders = programOrders();
  const pick = (kind, id, label, on) => `<button data-action="programPick" data-arg="${kind}:${id}" class="${on ? 'primary' : ''}">${label}</button>`;
  return (`<div class="post"><div class="eyebrow">Programs &middot; ${p.rules.length} of ${p.slots} slot${p.slots > 1 ? 's' : ''}</div>
   ` +
      ` ${p.rules.map((r, i) => (`<div ` +
        `class="row"><span>When ${PROGRAM_CONDITIONS[r.cond].name}: ${programOrder(r.post, r.order) ? programOrder(r.post, r.order).name.toLowerCase() :
          r.order}${postMode(r.post) === 'crewed' ? '' : ' <span class="hint">(needs a crewed ' + POSTS[r.post].name.toLowerCase() + ')</span>'}</span><button ` +
        `data-action="programRemove" data-arg="${i}">Remove</button></div>`)).join('') || '<p class="hint">No programs yet. A program runs a crewed post by itself when its condition comes true.</p>'}
   ` +
      ` ${w ? `<div class="slider"><span>${w.kind === 'slot' ? 'Rule table' : 'Writing'}</span><span class="pbar" data-program-bar><i></i></span><span class="mono" data-program></span></div>
      <p class="hint">Writing goes on while you burn. Nothing moves in port.</p>`
    : p.rules.length < p.slots ? `<div class="hint">Write a rule. When:</div><div class="row">${conds.map(([id, c]) => pick('cond', id, c.name, programDraft.cond === id)).join('')}</div>
      <div class="hint">Then:</div><div class="row">${orders.map(o => pick('order', `${o.post}.${o.id}`, o.name, programDraft.order === `${o.post}.${o.id}`)).join('')}</div>
      <div class="row"><span class="hint">${Math.round(PROGRAM_SECS * (programDoer() ? 1 : 1.5))}s of burn, odds ${Math.round(programOdds() * 100)}%</span><button data-action="programWrite" ${programDraft.cond && programDraft.order ? '' : 'disabled'}>Write it</button></div>`
    : '<p class="hint">Every slot is in use. Remove a program, or make room.</p>'}
   ` +
      ` ${!w && p.slots < SLOTS_MAX ? `<div class="row"><span class="hint">Make room for another program (${Math.round(SLOT_SECS * (programDoer() ? 1 : 1.5))}s of burn)</span><button data-action="programSlot">Make room</button></div>` : ''}
  </div>`);
}

function programReadouts() {
  const w = programs().writing;
  if (!w) return;
  const pct = Math.round((1 - Math.max(0, w.left) / w.total) * 100);
  for (const el of document.querySelectorAll('[data-program]')) el.textContent = `${pct}%`;
  for (const el of document.querySelectorAll('[data-program-bar]')) el.firstElementChild.style.width = `${pct}%`;
}

Mods.register({
  id: 'programs', name: 'Programs', builtin: true,
  init(M) {
    M.on('frame', dt => { programsTick(dt); programReadouts(); });
    M.on('eventOpened', ev => {
      if (ev.title !== 'Contact' || !G.state) return;
      for (const r of programs().rules) if (r.cond === 'contact') fireProgram(r);
    });
    M.action('programPick', arg => {
      const [kind, id] = arg.split(':');
      programDraft[kind] = programDraft[kind] === id ? null : id;
    });
    M.action('programWrite', () => {
      const [post, order] = (programDraft.order || '').split('.');
      if (writeProgram(programDraft.cond, post, order)) { programDraft.cond = programDraft.order = null; }
    });
    M.action('programSlot', () => extendPrograms());
    M.action('programRemove', i => removeProgram(Number(i)));
  },
});
