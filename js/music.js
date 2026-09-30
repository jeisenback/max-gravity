'use strict';

// Generative music, synthesized like the sound effects (no audio files): slow pad
// chords, sparse bell notes over them, and a low pulse in a fight. The mood follows
// where you are: the title screen, a port, a burn or open space, or a fight. Its
// volume is its own setting (Settings.music, 0 turns it off). Loaded before game.js;
// only calls into it at runtime.

const midi = n => 440 * Math.pow(2, (n - 69) / 12);
const MOODS = {
  title: { chords: [[48, 55, 62, 67], [45, 52, 59, 64], [41, 48, 55, 60], [43, 50, 57, 62]], bar: 7, bells: 0.3, pulse: 0, cutoff: 900 },
  port: { chords: [[48, 52, 55, 59], [41, 45, 48, 52], [45, 48, 52, 55], [43, 47, 50, 55]], bar: 6, bells: 0.45, pulse: 0, cutoff: 1100 },
  burn: { chords: [[38, 45, 52, 57], [36, 43, 50, 55], [38, 45, 50, 57], [33, 40, 47, 52]], bar: 9, bells: 0.22, pulse: 0, cutoff: 700 },
  tense: { chords: [[40, 47, 52, 55], [41, 48, 53, 56], [40, 47, 52, 55], [38, 45, 50, 53]], bar: 3.5, bells: 0.12, pulse: 1, cutoff: 600 },
};

const Music = {
  gain: null, mood: null, i: 0, nextChord: 0, nextBell: 0, nextPulse: 0, chord: null,

  pickMood() {
    if (G.mode === 'title') return 'title';
    if (G.duel || (G.mode === 'flight' && G.npcs.some(n => n.hostile && !n.dead && G.player && dist(n, G.player) < 1500))) return 'tense';
    if (G.mode === 'landed') return 'port';
    if (['transit', 'flight', 'departing', 'map'].includes(G.mode)) return 'burn';
    return null;
  },

  tick() {
    const c = Sfx.ctx;
    if (!c || c.state !== 'running') return;
    if (!this.gain) { this.gain = c.createGain(); this.gain.connect(c.destination); }
    const vol = Settings.music * 0.3;
    this.gain.gain.setTargetAtTime(vol, c.currentTime, 0.5);
    const mood = vol > 0 ? this.pickMood() : null;
    if (mood !== this.mood) { this.mood = mood; this.i = 0; this.nextChord = Math.max(this.nextChord, c.currentTime + 0.1); }
    if (!mood) return;
    const M = MOODS[mood], ahead = c.currentTime + 0.6;
    while (this.nextChord < ahead) {
      this.chord = M.chords[this.i++ % M.chords.length];
      this.pad(this.chord, this.nextChord, M.bar, M.cutoff);
      this.nextChord += M.bar;
    }
    while (this.nextBell < ahead) {
      if (Math.random() < M.bells && this.chord) this.bell(midi(pick(this.chord) + 24), this.nextBell);
      this.nextBell += pick([0.75, 1, 1.5]);
    }
    if (M.pulse) {
      while (this.nextPulse < ahead) { this.thump(this.nextPulse); this.nextPulse += 0.55; }
    } else this.nextPulse = ahead;
  },

  // A soft chord: two detuned saws per note through a low filter, swelling in and out.
  pad(notes, t, dur, cutoff) {
    const c = Sfx.ctx, f = c.createBiquadFilter(), g = c.createGain();
    f.type = 'lowpass'; f.frequency.value = cutoff;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.18, t + dur * 0.35);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur * 1.25);
    f.connect(g).connect(this.gain);
    for (const n of notes) for (const d of [-6, 6]) {
      const o = c.createOscillator();
      o.type = 'sawtooth'; o.frequency.value = midi(n); o.detune.value = d;
      o.connect(f); o.start(t); o.stop(t + dur * 1.3);
    }
  },

  bell(freq, t) {
    const c = Sfx.ctx, g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.12, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 2.4);
    g.connect(this.gain);
    for (const [m, type] of [[1, 'sine'], [2.01, 'triangle']]) {
      const o = c.createOscillator();
      o.type = type; o.frequency.value = freq * m;
      o.connect(g); o.start(t); o.stop(t + 2.5);
    }
  },

  thump(t) {
    const c = Sfx.ctx, g = c.createGain(), o = c.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(90, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.25);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.35, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    o.connect(g).connect(this.gain); o.start(t); o.stop(t + 0.35);
  },
};

// A scheduler independent of the game loop, so the title screen has music too.
setInterval(() => { try { Music.tick(); } catch (e) { /* never let music break the game */ } }, 250);
