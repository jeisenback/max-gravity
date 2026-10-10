'use strict';

// The hired hand's opening scene, "Signing On": how you came to be crew on this ship, who you work beside, what the first
// week looks like, and one choice about why you signed on. There is a different story for each start background (the same
// three premises as the owner starts' intros), a closing paragraph for the post you chose, and the captain and the two main
// characters (cast.js) by name. The choice is small and permanent. Loaded after cast.js; only calls into the game at runtime.

// The words are in SCENE_LINES (hiredscenes.js), by the name each has: an opening for each start background, what each reason says, and a line for each post.

const SIGN_BACKGROUNDS = ['earth', 'mars', 'belt'];
const SIGN_LEARN_XP = 8, SIGN_SHARE_UP = 0.02;  // signing on for the money asks for two points more of the share

function signOnEvent() {
  const st = G.state, h = hired(), cap = st.people[h.captain], bg = SIGN_BACKGROUNDS.includes(st.background) ? st.background : 'earth', say = (key, vars) => sceneSay('scene:sign-on', key, vars);
  const ctx = { ship: shipTitle().replace(/^./, ch => ch.toUpperCase()),  // it starts a sentence
    cap: `Captain ${cap.first} ${cap.last}`, adj: TRAITS[cap.traits[0]].adj, sys: system().name };
  // Who the captain is: their own introduction, or, for a generated captain, a clause on how the crew describe them.
  const d = captainEntry();
  ctx.who = d && d.intro ? ` ${d.intro(h.wage, Math.round(h.share * 100))}` : ` ${say('who.generated', ctx)}`;
  const pair = st.crew.map(person).filter(c => c && c.cast);
  const postKey = c => Object.keys(POSTS).find(k => POSTS[k].role === c.role);
  // A first officer holds no post.
  const who = c => (postKey(c) ? `${fullName(c)}, ${c.job} from ${c.home}, on the ${POSTS[postKey(c)].name.toLowerCase()} post` : `${fullName(c)}, the ${ROLE_NAMES[c.role].toLowerCase()}, from ${c.home}`);
  // A first officer who walks you round the ship on the first burn (cato.js) does the introducing there.
  const beside = pair.length && !(d && CAST[d.xo] && CAST[d.xo].round) ? ` ${say('beside', { crew: pair.map(who).join(', and ') })}` : '';
  // A captain with their own words has said what the pay is.
  const week = [say('week.run', ctx), ...(scopeOff('errands') ? [] : [say('week.errands')]), ...(d && d.intro ? [] : [say('week.pay', { wage: h.wage, share: Math.round(h.share * 100) })])].join(' ');
  const event = {
    title: say('title'),
    text: [say(`text.${bg}`, ctx), ...(st.carried ? [st.carried] : []), `${say(`post.${h.post}`, ctx)}${beside}`, `${week} ${say('why')}`].join('</p><p>'),
    choices: [
      { label: say('c0.label'), run() { h.share = +(h.share + SIGN_SHARE_UP).toFixed(3); h.reason = 'money'; return say(`money.${bg}`); } },
      { label: say('c1.label'), run() { gainSkill(h.post, SIGN_LEARN_XP); h.reason = 'learn'; return say(`learn.${bg}`); } },
      { label: say('c2.label'), run() { like(cap, 1, 'You came aboard easy to get along with.'); for (const c of pair) like(c, 1, 'You came aboard easy to get along with.'); h.reason = 'away'; return say(`away.${bg}`); } },
    ],
  };
  // The game was saved at the first landing, before this choice: save again, so quitting before the next dock keeps what it did.
  event.choices = event.choices.map(c => ({ ...c, run() { const text = c.run(); st.carried = null; save(); return text; } }));
  return event;
}
