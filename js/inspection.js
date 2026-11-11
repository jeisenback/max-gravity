'use strict';

// Port inspections (#993, docs/superpowers/specs/2026-11-10-port-inspection-design.md). Open space is policed by nobody (docs/bible/jurisdictions.md):
// a port inspects a ship on arrival under its owner's rules. The Arcology Pact, the Dome Pact and the Federation inspect; independent and pirate ports do not.
// Two causes: the ship's standing with the port's owner at -15 or worse, and a good that owner licenses for import, landed without its licence (a
// licence cannot be had yet, so a ship never holds one). These take what they read and return a value.

// The good each inspecting owner licenses for import.
const LICENSED = { 'Arcology Pact': 'medical', 'Dome Pact': 'water', 'Guild Federation': 'industrial' };
const INSPECTING = Object.keys(LICENSED);
const to100 = n => Math.round(n / 100) * 100;

// The fine for bad standing: none above -15; 6,000 at -15, and 2,000 more for each full five points below, up to 14,000.
const standingFine = rep => (rep > -15 ? 0 : Math.min(14000, 6000 + 2000 * Math.floor((-15 - rep) / 5)));
// The duty on a licensed good landed without its licence: 15% of its value at the good's base price.
const licenceDuty = (good, tons) => to100(0.15 * tons * COMMODITIES.find(c => c.id === good).base);

// What the inspector at a port of `gov` finds on a ship with `cargo` ({ good: tons }) and `rep` standing there: null at a port that does not inspect,
// or on a clean ship; else the causes and one sum, a fifth more when the hand is Marked (traits.js).
function inspectionCause(cargo, gov, rep, marked) {
  if (!INSPECTING.includes(gov)) return null;
  const good = LICENSED[gov], tons = (cargo && cargo[good]) || 0, duty = tons > 0 ? licenceDuty(good, tons) : 0, fine = standingFine(rep);
  if (!duty && !fine) return null;
  const sum = marked ? to100((duty + fine) * 1.2) : duty + fine;
  return { gov, standing: fine ? rep : null, good: duty ? good : null, tons: duty ? tons : 0, duty, fine, sum };
}

// The inspector's scene for `cause` at `planet`: the cause named, the sum, and the hand's one move by post (Comms takes the papers, any other post speaks up),
// or keeping out of it. The sum leaves the ship's purse (never the hand's savings); a failed move pays it all and costs a point of the captain's regard.
// With no post to work (the parked owner game) the only choice is to pay.
function inspectionScene(cause, planet) {
  const cap = hiredCaptain(), post = cap && career() && career().post;  // the move is argued past the captain: an owner, even one who kept a post, only pays
  const say = (key, vars) => sceneSay('scene:inspection', key, { planet: planet.name, gov: cause.gov, cap: cap ? cap.last : '', sum: fmt(cause.sum), ...vars });
  const causes = [cause.good ? say('cause.good', { good: goodName(cause.good).toLowerCase(), tons: cause.tons, duty: fmt(cause.duty) }) : '', cause.fine ? say('cause.standing', { fine: fmt(cause.fine) }) : ''].filter(Boolean).join(' ');
  const pay = n => { const paid = Math.min(purse(), n); moveMoney(-paid); if (paid) recordHand('fines'); return fmt(paid); };  // an empty purse pays nothing, and nothing goes on the record
  const choices = [];
  if (post) {
    const papers = post === 'comms', odds = papers ? soloOdds('comms') : handCheck(POST_STAT[post], skillLevel(post), 'word');
    choices.push({ label: `${say(papers ? 'papers.label' : 'speak.label')} [${oddsWord(odds)}; ${say('move.stakes')}]`, run() {
      if (Math.random() < odds) return say('win', { paid: pay(to100(cause.sum / 2)) });
      like(cap, -1, say('lose.memory'));  // a hand always has a captain (the master, in chapter two)
      return say('lose', { paid: pay(cause.sum) });
    } });
  }
  choices.push({ label: say(post ? 'keep.label' : 'pay.label'), run: () => say(post ? 'keep.result' : 'pay.result', { paid: pay(cause.sum) }) });
  return { title: say('title'), via: 'crew', owner: 'you',  // the inspector comes aboard, as customs does (ties.js)
    text: [say('text', { causes }), cap ? say('captain') : ''].filter(Boolean).join(' '), choices };
}

// The landed hook's body (`note` is the hook's M.note; a test reads UI.notes; `cargo` is the hold as the ship came in, read on 'landing'): at an inspecting
// port, the inspector's scene opens first, ahead of a scene already open and of one queued behind it, or a clean ship gets one note line.
function inspectAtLanding(planet, note = text => UI.notes.push(text), cargo = G.state.cargo) {
  const st = G.state, gov = system().gov;
  if (atSite(st) || !INSPECTING.includes(gov)) return;
  const c = career(), cause = inspectionCause(cargo, gov, repOf(gov), !!c && hasTrait(c, 'marked'));
  if (!cause) { note(sceneSay('scene:inspection', 'clean')); return; }
  const scene = inspectionScene(cause, planet), prev = G.dialog && G.dialog.event;
  if (prev) scene.choices = scene.choices.map(ch => ({ ...ch, run() { const r = ch.run(), q = G.nextEvent; G.nextEvent = q && q !== prev ? chainEvents([prev, q]) : prev; return r; } }));  // what was open, then what was queued behind it
  openEvent(scene);
}

// A landing straight after a new game or a load is no arrival: nothing is inspected, and no note.
Mods.register({
  id: 'inspection', name: 'Port inspections', builtin: true,
  init(M) {
    let fresh = true, hold = null;
    M.on('stateReady', () => { fresh = true; });
    M.on('landing', () => { hold = fresh ? null : { ...(G.state.cargo || {}) }; fresh = false; });
    M.on('landed', planet => { if (hold) inspectAtLanding(planet, M.note, hold); hold = null; });
  },
});
