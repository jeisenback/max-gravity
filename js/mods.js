'use strict';

// The mod API. A mod is a script loaded after the built-in systems and before
// game.js (see index.html) that calls Mods.register({ id, name, init(M) { ... } }).
// Inside init it can:
//   M.on(event, fn)         run fn when the game announces an event (EVENTS below)
//   M.filter(name, fn)      change a value the game is about to use (FILTERS below)
//   M.action(name, fn)      handle a port-screen button with data-action="name"
//   M.addSystem / addShip / addOutfit / addCommodity / addEvent   add content
//   M.state()               an object saved with the game, private to this mod
//   M.note(text)            tell the player: a port-screen note when docked, else the flight log
// A mod that throws is switched off with a console error; the game keeps running.
// The README has the full guide. Built-in systems (sound, tutorial, story) use the same API.

const MOD_EVENTS = [
  'frame',        // (dt) every frame, in every mode
  'drawOverlay',  // (viewW) after the world, HUD, or map is drawn; draw with ctx
  'key',          // (code) a key was pressed (not repeats)
  'uiClick',      // (action, arg) a port-screen button was clicked
  'fire',         // (ship) a ship fired its guns; ship === G.player for the player
  'damage',       // (ship, shieldHit)
  'destroyed',    // (ship, byPlayer)
  'enterSystem',  // (systemId) the local space was populated, after takeoff or arrival
  'landed',       // (planet)
  'takeoff',      // (planet)
  'burnStart',    // (destSystemId)
  'arrive',       // (systemId)
  'eventOpened',  // (event) a choice dialog opened (transit event, hail, story scene)
];
const MOD_FILTERS = [
  'price',        // (credits, planet, commodityId) buy/sell price per ton
  'canDock',      // (allowed, planet) false when your standing is Hostile
  'portBanner',   // (html) shown under the port tabs
  'dockButtons',  // (html) buttons left of System map / Take off
];

const Mods = {
  list: [],
  hooks: {},     // event or filter name -> [{ mod, fn }]
  actions: {},

  register(def) {
    if (!def || !def.id || typeof def.init !== 'function') return console.error('Mods.register needs { id, init(M) }', def);
    if (this.list.some(m => m.id === def.id)) return console.error(`Mod "${def.id}" is already registered`);
    const mod = { id: def.id, name: def.name || def.id, version: def.version || '', builtin: !!def.builtin, failed: false };
    this.list.push(mod);
    this.guard(mod, 'init', () => def.init(this.api(mod)));
  },

  api(mod) {
    const add = (name, fn) => {
      if (!this.hooks[name]) this.hooks[name] = [];
      this.hooks[name].push({ mod, fn });
    };
    return {
      on: (event, fn) => MOD_EVENTS.includes(event) ? add(event, fn) : console.error(`Mod "${mod.id}": unknown event "${event}"`),
      filter: (name, fn) => MOD_FILTERS.includes(name) ? add(name, fn) : console.error(`Mod "${mod.id}": unknown filter "${name}"`),
      action: (name, fn) => { this.actions[name] = { mod, fn }; },
      // A line on the port screen when docked, or in the flight log otherwise.
      note: text => {
        if (G.mode !== 'landed') return msg(text);
        UI.notes.push(text);
        if (!G.dialog) UI.render();
      },
      state: () => {
        const st = G.state;
        st.mods = st.mods || {};
        return (st.mods[mod.id] = st.mods[mod.id] || {});
      },
      addSystem: (id, def) => this.add(mod, 'system', SYSTEMS, id, def),
      addShip: (id, def) => this.add(mod, 'ship', SHIPS, id, def),
      addOutfit: (id, def) => this.add(mod, 'outfit', OUTFITS, id, def),
      addCommodity: def => this.add(mod, 'commodity', null, def && def.id, def),
      addEvent: def => this.add(mod, 'event', null, def && def.title, def),
    };
  },

  // Content is checked for the fields the game relies on, so a typo fails loudly
  // at load time instead of mid-flight.
  add(mod, kind, table, id, def) {
    const need = {
      system: ['name', 'au', 'angle', 'gov', 'planets'],
      ship: ['name', 'price', 'cargo', 'fuel', 'shields', 'armor', 'accel', 'maxSpeed', 'turn', 'guns', 'size'],
      outfit: ['name', 'price', 'space', 'max', 'desc', 'mod'],
      commodity: ['id', 'name', 'base'],
      event: ['title', 'text', 'choices'],
    }[kind];
    const missing = need.filter(k => !def || def[k] === undefined);
    if (kind === 'system' && def && Array.isArray(def.planets)) {
      def.planets.forEach((p, i) => ['name', 'x', 'y', 'r', 'color', 'services'].forEach(k => {
        if (p[k] === undefined) missing.push(`planets[${i}].${k}`);
      }));
    }
    if (!id || missing.length) return console.error(`Mod "${mod.id}": ${kind} "${id}" is missing ${missing.join(', ') || 'an id'}`);
    if (table && table[id]) return console.error(`Mod "${mod.id}": ${kind} "${id}" already exists`);
    if (kind === 'system') {
      def.pirates = def.pirates || 0;
      def.planets.forEach(p => { p.prices = p.prices || {}; p.desc = p.desc || ''; });
      if (!GOV_COLORS[def.gov]) GOV_COLORS[def.gov] = def.govColor || '#9aa7b5';
    }
    if (kind === 'ship') Object.assign(def, { berths: def.berths || 0, forSale: def.forSale !== false });
    if (kind === 'commodity') COMMODITIES.push(def);
    else if (kind === 'event') TRANSIT_EVENTS.push(def);
    else table[id] = def;
  },

  emit(event, ...args) {
    for (const h of this.hooks[event] || []) if (!h.mod.failed) this.guard(h.mod, event, () => h.fn(...args));
  },

  filter(name, value, ...args) {
    for (const h of this.hooks[name] || []) {
      if (h.mod.failed) continue;
      this.guard(h.mod, name, () => { value = h.fn(value, ...args); });
    }
    return value;
  },

  // Returns true when a mod handled the button.
  act(action, arg) {
    const a = this.actions[action];
    if (!a || a.mod.failed) return false;
    this.guard(a.mod, `action ${action}`, () => a.fn(arg));
    return true;
  },

  guard(mod, where, fn) {
    try { fn(); } catch (e) {
      mod.failed = true;
      console.error(`Mod "${mod.id}" failed in ${where} and was switched off:`, e);
      if (typeof msg === 'function' && G.state) msg(`Mod "${mod.name}" hit an error and was switched off.`);
    }
  },
};
