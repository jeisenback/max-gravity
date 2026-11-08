'use strict';

// The map's buttons over the burn view and the system map, for the mouse (#937: the game is desktop only; the touch controls that lived
// with these are gone): System map over the burn view, and Close map and the zoom over the map. Loaded before game.js; only calls into it
// at runtime.

const MapButtons = {
  shown: '',

  build() {
    const button = (id, text) => Object.assign(document.createElement('button'), { id, className: 'tfloat', textContent: text, hidden: true });
    const map = button('tmap', 'System map'), close = button('tclose', 'Close map'), zin = button('tzoomin', '+'), zout = button('tzoomout', '-');
    document.body.append(map, close, zin, zout);
    zin.addEventListener('click', () => zoomMap(-1));
    zout.addEventListener('click', () => zoomMap(1));
    map.addEventListener('click', () => { if (G.mode === 'transit' && !G.transit.event) openMap(); });
    close.addEventListener('click', () => { if (G.mode === 'map') closeMap(); });
  },

  // Show the buttons that fit the current mode. Cheap to call every frame.
  sync() {
    const eventOpen = G.mode === 'transit' && G.transit.event, key = `${G.mode}|${!!eventOpen}|${G.hudW}`;
    if (key === this.shown) return;
    this.shown = key;
    document.getElementById('tmap').hidden = !(G.mode === 'transit' && !eventOpen);
    document.getElementById('tmap').style.right = `${16 + G.hudW}px`;  // clear the HUD sidebar
    for (const id of ['tclose', 'tzoomin', 'tzoomout']) document.getElementById(id).hidden = G.mode !== 'map';
  },
};
