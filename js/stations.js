'use strict';

// Posts: the jobs a ship's stations stand for (pilot, gunner, engineer, comms). Each post
// runs in one of two modes. Crewed: someone aboard with the role has it, and you give
// them orders. Manual: nobody has it, or you took the controls, and you do it yourself.
// A solo captain is manual everywhere; hiring a role makes that post crewed. Taking the
// controls is instant, but crew who are overruled often lose a little heart.
// Orders are data (ORDERS); the 'orders' mod filter lets a mod add its own.
// Loaded before game.js; only calls into it at runtime.

const POSTS = {
  pilot: { role: 'pilot', name: 'Pilot' },
  gunner: { role: 'gunner', name: 'Gunner' },
  engineer: { role: 'engineer', name: 'Engineer' },
  comms: { role: 'slicer', name: 'Comms' },
};

// An order: { id, name, desc, can() (optional), sure (optional: a command that cannot fail and
// does not use up the day), run(ok, doer, skill) -> text }.
// `ok` is the roll against orderOdds; `doer` is the crew member, or null when you do it yourself.
const ORDERS = {
  engineer: [{
    id: 'patch', name: 'Patch the hull', desc: 'Field repairs, up to three quarters of full armor. Once a day.',
    can: () => G.state.armor < Math.floor(ship().armor * 0.75),
    run(ok, doer, skill) {
      const st = G.state, cap = Math.floor(ship().armor * 0.75), who = doer ? doer.first || doer.name : 'You';
      if (!ok) return `${who} spend${doer ? 's' : ''} a watch on the plating and get${doer ? 's' : ''} nowhere. The seams will need a yard.`;
      const gain = Math.min(cap - st.armor, 4 + 4 * skill);
      st.armor += gain;
      return `${who} weld${doer ? 's' : ''} plating over the worst of the damage. Armor +${gain}.`;
    },
  }],
};

const postState = id => {
  const st = G.state;
  st.posts = st.posts || {};
  return st.posts[id] = st.posts[id] || { manual: false, strain: 0, busy: false, note: null };
};
const postHolder = id => roleHolder(POSTS[id].role);
const postMode = id => (postHolder(id) && !postState(id).manual ? 'crewed' : 'manual');
const postOrders = id => Mods.filter('orders', ORDERS[id] || [], id);

// Someone with the post does better than you doing it without the skill.
const orderOdds = id => postMode(id) === 'crewed' ? 0.55 + 0.15 * roleSkill(POSTS[id].role) : 0.45;

function takeControl(id) {
  const h = postHolder(id), ps = postState(id);
  if (!h || ps.manual) return;
  ps.manual = true;
  ps.strain += 1;
  if (ps.strain >= 3) {  // overruled once too often
    ps.strain = 1;
    like(h, -1, 'The captain keeps taking my controls.');
  }
}

function handBack(id) { postState(id).manual = false; }

function giveOrder(id, orderId) {
  const o = postOrders(id).find(x => x.id === orderId), ps = postState(id);
  if (!o || (ps.busy && !o.sure) || (o.can && !o.can())) return null;
  const doer = postMode(id) === 'crewed' ? postHolder(id) : null;
  if (!o.sure) ps.busy = true;  // a sure order (a command, not a task) does not use up the day
  ps.note = o.run(o.sure || Math.random() < orderOdds(id), doer, doer ? roleSkill(POSTS[id].role) : 0);
  return ps.note;
}

// The post's block on a station view: who has it, the take/hand-back button, and its orders.
function postHtml(id) {
  const P = POSTS[id], h = postHolder(id), ps = postState(id), mode = postMode(id);
  const name = h ? fullName(h) : '';
  const line = mode === 'crewed' ? `${name} has the ${P.name.toLowerCase()} post.`
    : h ? `You have taken the ${P.name.toLowerCase()} controls from ${name}.`
    : `Nobody is assigned as ${P.name.toLowerCase()}. You do it yourself.`;
  const btn = mode === 'crewed' ? `<button data-action="takeControl" data-arg="${id}">Take controls</button>`
    : h ? `<button data-action="handBack" data-arg="${id}">Hand back</button>` : '';
  const orders = postOrders(id).map(o => `<button data-action="postOrder" data-arg="${id}:${o.id}" title="${esc(o.desc)}" ${ps.busy || (o.can && !o.can()) ? 'disabled' : ''}>${o.name}</button>`).join('');
  return `<div class="post">
    <div class="eyebrow">${P.name} post &middot; ${mode}</div>
    <p class="desc">${line}</p>
    ${ps.note ? `<div class="note">${ps.note}</div>` : ''}
    ${btn || orders ? `<div class="row">${orders}${btn}</div>` : ''}
  </div>`;
}

Mods.register({
  id: 'posts', name: 'Posts', builtin: true,
  init(M) {
    M.action('takeControl', id => takeControl(id));
    M.action('handBack', id => handBack(id));
    M.action('postOrder', arg => { const [id, o] = arg.split(':'); giveOrder(id, o); });
    // A new day, or a new burn, frees the crew for another order and eases the strain.
    const fresh = () => { for (const p of Object.values(G.state.posts || {})) { p.busy = false; p.note = null; } };
    M.on('newDay', () => { for (const p of Object.values(G.state.posts || {})) p.strain = Math.max(0, p.strain - 0.1); fresh(); });
    M.on('burnStart', fresh);
  },
});
