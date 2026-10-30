'use strict';

// What happens on a burn or at a landing, and in what order. One rule for both:
//   tier 0  the story (storylets with a priority): always first
//   tier 1  things that are due now: news from home, a holiday, a settler moment
//   tier 2  everything else, chosen by weight; a "quiet" entry lets the burn pass
// A candidate is { tier, weight, via, make() }; `via` says how it reaches the ship (station, ship,
// message or crew) and is shown on the scene and kept in the comms inbox. make() returns an event, or null when it
// turns out to have nothing to say, and then the next candidate is tried.
// Mods add candidates with the 'happenings' filter: (list, where, planet) -> list.

const CAT_PORTS = ['Ring Nine', 'Boneyard', 'The Hollows', 'Juno Commons', 'Ceres Station', 'Eros Old Town'];
const isStory = s => s.priority > 0;
const SHIP_INCIDENT_WAIT = 90;  // days before the ship's own incident (transit.js) comes round again: there are only a few, and 45 let each play two or three times in a chapter (a 100-chapter sim)

function pickHappening(where, planet) {
  let pool = Mods.filter('happenings', [], where, planet);
  while (pool.length) {
    const tier = Math.min(...pool.map(c => c.tier));
    const level = pool.filter(c => c.tier === tier);
    let r = Math.random() * level.reduce((n, c) => n + c.weight, 0), c = level[0];
    for (const x of level) { if ((r -= x.weight) < 0) { c = x; break; } }
    if (c.quiet) return null;
    const ev = c.make();
    if (ev && ev.auto && where === 'transit' && postMode('comms') === 'crewed') {  // a routine hail the comms officer takes
      const text = ev.auto();
      comm(`[Comms] ${text}`);
      noteInbox(c.via || 'ship', text);
      G.handled = true;
      return null;
    }
    if (ev) { ev.via = ev.via || c.via; if (ev.via) noteInbox(ev.via, ev.title); return ev; }
    pool = pool.filter(x => x !== c);
  }
  return null;
}

// A storylet as a candidate; `story` picks the main-story ones, otherwise the color ones.
function storyletCandidate(where, story) {
  const keep = s => isStory(s) === story;
  const s = pickStorylet(where, keep);  // the one roll of its chance: the scene offered is the scene played
  if (!s) return [];
  return [{ tier: story ? 0 : 2, weight: story ? BURN_WEIGHTS.story : BURN_WEIGHTS.color, via: where === 'port' ? 'station' : 'ship', make: () => storyletEvent(s) }];
}

Mods.register({
  id: 'happenings', name: 'Happenings', builtin: true,
  init(M) {
    M.filter('happenings', (list, where, planet) => {
      const st = G.state, flags = st.flags, out = [];
      out.push(...storyletCandidate(where, true));
      if (where === 'transit') {
        const t = G.transit, progress = 1 - t.left / t.total;
        const told = procedural().find(f => f.p.news);
        if (told) out.push({ tier: 1, weight: BURN_WEIGHTS.news, via: 'message', make: () => newsEvent(told.p) });
        const o = (t.occasions || []).find(x => !x.done && x.at <= progress && !occasionPlayed(x));
        if (o) out.push({ tier: 1, weight: o.kind === 'ice' ? BURN_WEIGHTS.iceOccasion : BURN_WEIGHTS.occasion, via: 'crew', make() { o.done = true; markOccasion(o); return occasionEvent(o); } });
        out.push({ tier: 1, weight: BURN_WEIGHTS.welcomeBack, via: 'crew', make: welcomeBack });
        const weak = worstPart();
        if (condition()[weak] < BREAKDOWN_BELOW) out.push({ tier: 1, weight: BURN_WEIGHTS.breakdown, via: 'crew', make: () => Math.random() < 0.5 ? breakdownEvent(weak) : null });
        if ((Mods.hooks.transitEvent || []).length) out.push({ tier: 1, weight: BURN_WEIGHTS.transitHook, via: 'ship', make: () => Mods.filter('transitEvent', null) });
        const pax = paxAboard().find(m => !m.story && !m.eventDone && (m.pid || PASSENGERS[m.passenger]));
        if (pax) out.push({ tier: 2, weight: BURN_WEIGHTS.passenger, via: 'crew', make() { pax.eventDone = true; return pax.pid ? passengerEvent(pax) : PASSENGERS[pax.passenger].event(pax); } });
        const arcs = st.crew.filter(id => CREW[id] && CREW[id].events[flags[`${id}Arc`] || 0]);
        if (arcs.length) out.push({ tier: 2, weight: BURN_WEIGHTS.crewArc, via: 'crew', make() { const id = pick(arcs), step = flags[`${id}Arc`] || 0; flags[`${id}Arc`] = step + 1; return CREW[id].events[step]; } });
        out.push({ tier: 2, weight: BURN_WEIGHTS.trait, via: 'crew', make: crewTraitEvent });
        out.push({ tier: 2, weight: BURN_WEIGHTS.relationship, via: 'crew', make: relationshipScene });
        if (home().burns >= 2) out.push({ tier: 2, weight: BURN_WEIGHTS.tradition, via: 'crew', make: traditionEvent });
        out.push(...storyletCandidate(where, false));
        // Not one seen in the last SHIP_INCIDENT_WAIT days, on this burn or an earlier one.
        const met = st.eventSeen = st.eventSeen || {}, seenAs = e => (e.id ? SCENE_LINES[`scene:${e.id}`].title : e.title);  // kept by its shipped title, which the editor's words do not change (transit.js)
        const hand = hired(), fresh = TRANSIT_EVENTS.filter(e => !t.seen.includes(e) && !(met[seenAs(e)] > st.day - SHIP_INCIDENT_WAIT) && !(hand && OWNER_ONLY_EVENTS.includes(e.title)) && !(e.id === 'pirates' && quality('due:pi-safe') > st.day));
        if (hand) for (const g of HIRED_GROUPS) out.push({ tier: 2, weight: captainWeight(g), via: 'crew', make: () => hiredEvent(g) });
        if (fresh.length) out.push({ tier: 2, weight: hand ? HIRED_WEIGHTS.ship * (1 + HAND_LANE_WEIGHT * Math.max(danger(t.to), danger(st.systemId))) : BURN_WEIGHTS.ship, via: 'ship', make() { const ev = pick(fresh); t.seen.push(ev); met[seenAs(ev)] = st.day; return ev; } });
        out.push({ tier: 2, weight: BURN_WEIGHTS.quiet, quiet: true });
      } else {
        if (G.joinOffer) out.push({ tier: 1, weight: BURN_WEIGHTS.join, via: 'crew', make() { const p = G.joinOffer; G.joinOffer = null; return joinEvent(p); } });
        const o = outpost();
        const m = o && planet.name === o.site && MOMENTS.find((x, i) => o.pop >= x.at && !o.moments.includes(i));
        if (m) out.push({ tier: 1, weight: BURN_WEIGHTS.moment, via: 'message', make() { o.moments.push(MOMENTS.indexOf(m)); return m.make(o); } });
        out.push(...storyletCandidate(where, false));
        if (!home().cat && st.day >= 5 && CAT_PORTS.includes(planet.name)) out.push({ tier: 2, weight: BURN_WEIGHTS.cat, via: 'crew', make: () => Math.random() < 0.1 ? catEvent() : null });
      }
      return list.concat(out);
    });
    M.on('landed', planet => {
      if (G.dialog && G.nextEvent) return;  // nowhere to put a scene, and none is used up
      const ev = pickHappening('port', planet);
      if (!ev) return;
      if (G.dialog) G.nextEvent = ev; else openEvent(ev);
    });
  },
});
