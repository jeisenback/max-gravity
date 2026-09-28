'use strict';

// Touch controls: a virtual joystick (point where you want to fly; push far to
// thrust), hold buttons for Fire and Brake, and tap buttons for the flight keys.
// Map and Close buttons over the transit screen and the system map work for
// mouse and touch alike. Loaded before game.js; only calls into it at runtime.

const Touch = {
  on: window.matchMedia('(pointer: coarse)').matches,
  stick: null,     // { a: heading in radians, m: 0..1 push } while the stick is held
  shown: '',

  build() {
    const root = document.createElement('div');
    root.id = 'touch';
    root.hidden = true;
    root.innerHTML = `
      <div class="tbtns">
        <button data-tap="target">Target</button>
        <button data-tap="hail">Hail</button>
        <button data-tap="land">Land</button>
        <button data-tap="map">Map</button>
        <button data-tap="burn">Burn</button>
      </div>
      <div id="stick"><div id="knob"></div></div>
      <button id="brake" class="thold" data-hold="reverse">BRAKE</button>
      <button id="fire" class="thold" data-hold="fire">FIRE</button>`;
    document.body.appendChild(root);
    const map = Object.assign(document.createElement('button'), { id: 'tmap', className: 'tfloat', textContent: 'System map', hidden: true });
    const close = Object.assign(document.createElement('button'), { id: 'tclose', className: 'tfloat', textContent: 'Close map', hidden: true });
    document.body.append(map, close);
    map.addEventListener('click', () => { if (G.mode === 'transit' && !G.transit.event) openMap(); });
    close.addEventListener('click', () => { if (G.mode === 'map') closeMap(); });

    const taps = { target: cycleTarget, hail: tryHail, land: tryLand, map: openMap, burn: tryBurn };
    root.querySelectorAll('[data-tap]').forEach(b => b.addEventListener('pointerdown', e => {
      e.preventDefault();
      if (G.mode === 'flight') taps[b.dataset.tap]();
    }));
    root.querySelectorAll('[data-hold]').forEach(b => {
      const set = v => e => { e.preventDefault(); G.keys[b.dataset.hold] = v; b.classList.toggle('on', v); };
      b.addEventListener('pointerdown', set(true));
      for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) b.addEventListener(ev, set(false));
    });

    const stick = root.querySelector('#stick'), knob = root.querySelector('#knob');
    const move = e => {
      const r = stick.getBoundingClientRect(), R = r.width / 2;
      let dx = e.clientX - (r.left + R), dy = e.clientY - (r.top + R);
      const d = Math.hypot(dx, dy);
      if (d > R) { dx *= R / d; dy *= R / d; }
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
      this.stick = { a: Math.atan2(dy, dx), m: Math.min(1, d / R) };
    };
    const release = () => { this.stick = null; knob.style.transform = ''; };
    stick.addEventListener('pointerdown', e => { e.preventDefault(); stick.setPointerCapture(e.pointerId); move(e); });
    stick.addEventListener('pointermove', e => { if (this.stick) move(e); });
    stick.addEventListener('pointerup', release);
    stick.addEventListener('pointercancel', release);

    // A touch anywhere switches to touch controls, even on devices that also have a mouse.
    window.addEventListener('touchstart', () => { this.on = true; }, { passive: true });
  },

  // Show the controls that fit the current mode. Cheap to call every frame.
  sync() {
    const eventOpen = G.mode === 'transit' && G.transit.event;
    const key = `${G.mode}|${this.on}|${!!eventOpen}`;
    if (key === this.shown) return;
    this.shown = key;
    document.getElementById('touch').hidden = !(this.on && G.mode === 'flight');
    document.getElementById('tmap').hidden = !(G.mode === 'transit' && !eventOpen);
    document.getElementById('tclose').hidden = G.mode !== 'map';
    if (G.mode !== 'flight') {
      this.stick = null;
      G.keys.fire = G.keys.reverse = false;
      document.querySelectorAll('.thold.on').forEach(b => b.classList.remove('on'));
    }
  },

  // Steer toward the stick's heading, thrusting when it is pushed well out.
  steer(p, dt) {
    const s = this.stick;
    if (!s || s.m < 0.15) return;
    const off = turnToward(p, s.a, dt);
    if (s.m > 0.55 && off < 0.9) p.thrusting = true;
  },
};
