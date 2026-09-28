'use strict';

// Sound effects synthesized with Web Audio: no audio files. Browsers only allow audio
// after a user gesture, so the context starts on the first key or tap. N (or the
// Sound button in port) toggles it. Loaded before game.js; only calls into it at runtime.

const Sfx = {
  ctx: null, out: null, hum: null, noiseBuf: null,
  on: (() => { try { return localStorage.getItem('maxGravity.sound') !== 'off'; } catch { return true; } })(),

  unlock() {
    if (this.ctx) { if (this.ctx.state === 'suspended' && !document.hidden) this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const c = this.ctx = new AC();
    this.out = c.createGain();
    this.out.gain.value = this.on ? 0.5 : 0;
    this.out.connect(c.destination);
    this.noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    // Engine rumble: looping noise through a low filter, faded in and out by engine().
    const f = c.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = 160;
    this.hum = c.createGain();
    this.hum.gain.value = 0;
    this.noise().connect(f).connect(this.hum).connect(this.out);
  },

  toggle() {
    this.on = !this.on;
    try { localStorage.setItem('maxGravity.sound', this.on ? 'on' : 'off'); } catch {}
    if (this.out) this.out.gain.value = this.on ? 0.5 : 0;
  },

  noise() {
    const s = this.ctx.createBufferSource();
    s.buffer = this.noiseBuf; s.loop = true; s.start();
    return s;
  },

  // Volume falls off with distance from the player.
  near(o) {
    return !G.player || o === G.player ? 1 : Math.max(0, 1 - dist(o, G.player) / 1400);
  },

  // A gain envelope: quick attack, exponential decay. Returns null when silent.
  env(vol, dur, at, attack) {
    if (!this.ctx || !this.on || vol < 0.01) return null;
    const t = this.ctx.currentTime + at, g = this.ctx.createGain();
    g.gain.setValueAtTime(0.001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    g.connect(this.out);
    return { g, t };
  },

  tone(type, f0, f1, dur, vol, at = 0, attack = 0.005) {
    const e = this.env(vol, dur, at, attack);
    if (!e) return;
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, e.t);
    o.frequency.exponentialRampToValueAtTime(f1, e.t + dur);
    o.connect(e.g); o.start(e.t); o.stop(e.t + dur + 0.05);
  },

  // Filtered noise with the cutoff sweeping from f0 to f1.
  hiss(f0, f1, dur, vol, at = 0, attack = 0.005) {
    const e = this.env(vol, dur, at, attack);
    if (!e) return;
    const f = this.ctx.createBiquadFilter(), s = this.ctx.createBufferSource();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(f0, e.t);
    f.frequency.exponentialRampToValueAtTime(f1, e.t + dur);
    s.buffer = this.noiseBuf; s.loop = true;
    s.connect(f).connect(e.g); s.start(e.t); s.stop(e.t + dur + 0.05);
  },

  laser(o) { this.tone('square', 1400, 160, 0.12, this.near(o) * (o === G.player ? 0.12 : 0.07)); },
  hit(o, shield) {
    const v = this.near(o) * 0.3;
    if (shield) this.tone('sine', 900, 450, 0.15, v);
    else this.hiss(2500, 300, 0.18, v);
  },
  boom(o) {
    const v = this.near(o);
    this.hiss(2000, 50, 1.4, v * 0.8);
    this.tone('sine', 110, 30, 0.9, v * 0.6);
  },
  comms() { this.tone('sine', 880, 880, 0.07, 0.12); this.tone('sine', 1320, 1320, 0.1, 0.12, 0.09); },
  click() { this.tone('triangle', 700, 450, 0.04, 0.06); },
  dock() {
    this.tone('sine', 150, 50, 0.35, 0.4);
    this.hiss(900, 80, 0.5, 0.25);
    this.tone('sine', 660, 660, 0.3, 0.08, 0.4);
    this.tone('sine', 990, 990, 0.5, 0.08, 0.55);
  },
  launch() { this.hiss(150, 1400, 1.2, 0.3, 0, 0.5); },
  burn() { this.hiss(80, 2500, 1.4, 0.45, 0, 0.9); this.tone('sawtooth', 45, 140, 1.4, 0.12, 0, 0.9); },
  arrive() { this.hiss(2500, 80, 1.2, 0.35); },

  // Called every frame: rumble while thrusting, a quiet drone during a long burn.
  engine() {
    if (!this.hum) return;
    const p = G.player, burning = G.mode === 'departing' || (G.mode === 'flight' && p && p.thrusting);
    const level = G.mode === 'transit' ? 0.12 : burning ? (G.mode === 'departing' ? 0.7 : 0.35) : 0;
    this.hum.gain.setTargetAtTime(level, this.ctx.currentTime, 0.08);
  },
};

for (const ev of ['pointerdown', 'keydown']) window.addEventListener(ev, () => Sfx.unlock(), { capture: true });
document.addEventListener('visibilitychange', () => {
  if (!Sfx.ctx) return;
  if (document.hidden) Sfx.ctx.suspend(); else Sfx.ctx.resume();
});

Mods.register({
  id: 'sound', name: 'Sound', builtin: true,
  init(M) {
    M.on('fire', o => Sfx.laser(o));
    M.on('damage', (o, shield) => Sfx.hit(o, shield));
    M.on('destroyed', o => Sfx.boom(o));
    M.on('landed', () => Sfx.dock());
    M.on('takeoff', () => Sfx.launch());
    M.on('burnStart', () => Sfx.burn());
    M.on('arrive', () => Sfx.arrive());
    M.on('eventOpened', () => Sfx.comms());
    M.on('uiClick', () => Sfx.click());
    M.on('frame', () => Sfx.engine());
    M.on('key', code => {
      if (code !== 'KeyN') return;
      Sfx.toggle();
      if (G.mode === 'landed' && !G.dialog) UI.render();
    });
    M.filter('dockButtons', html => `${html}<button data-action="sound">Sound: ${Sfx.on ? 'on' : 'off'}</button>`);
    M.action('sound', () => Sfx.toggle());
  },
});
