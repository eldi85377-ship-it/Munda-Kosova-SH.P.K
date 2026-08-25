/* =====================================================================
   MUNDA FUTURE LAB — audio engine (100% synthesized, zero external files)
   ---------------------------------------------------------------------
   Everything you hear is generated live with the Web Audio API:
   oscillators, filtered noise, envelopes and a shared feedback-delay
   reverb. Safe for a student competition — no copyrighted samples.

   PUBLIC API (window.Sound):
     Sound.init() / Sound.unlock() / Sound.ready
     Sound.sfx(name, opts)            one-shot effects
     Sound.music(track, opts)         crossfading procedural music beds
     Sound.stopMusic(fadeMs) / Sound.duck(amount, ms)
     Sound.setMaster(v) / Sound.setMusicVol(v) / Sound.setSfxVol(v)
     Sound.toggleMusic(on) / Sound.toggleSfx(on) / Sound.state()
     Sound.crowd(on, vol)             looping stadium-ambience layer

   Every public method is a safe no-op when audio is unavailable —
   the rest of the app calls Sound.sfx() constantly and must never crash.
   ===================================================================== */
(function () {
  'use strict';

  var LS_KEY = 'munda_audio';

  /* ---------------- settings (persisted) ---------------- */
  var settings = { master: 0.8, music: 0.55, sfx: 0.8, musicOn: true, sfxOn: true };
  try {
    var saved = localStorage.getItem(LS_KEY);
    if (saved) {
      var s = JSON.parse(saved);
      for (var k in s) { if (k in settings && typeof s[k] === typeof settings[k]) settings[k] = s[k]; }
    }
  } catch (e) { /* private mode */ }

  function persist() {
    try { localStorage.setItem(LS_KEY, JSON.stringify(settings)); } catch (e) {}
  }

  /* ---------------- context & graph ---------------- */
  var ctx = null;
  var masterGain = null, musicBus = null, sfxBus = null, comp = null;
  var reverbIn = null, reverbOut = null, delayNode = null, feedback = null;
  var noiseBuf = null;

  function ensureCtx() {
    if (ctx) return ctx;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try {
      ctx = new AC();

      masterGain = ctx.createGain();
      masterGain.gain.value = settings.master;

      comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -14;
      comp.knee.value = 22;
      comp.ratio.value = 5;
      comp.attack.value = 0.004;
      comp.release.value = 0.24;

      musicBus = ctx.createGain();
      musicBus.gain.value = settings.musicOn ? settings.music : 0;
      sfxBus = ctx.createGain();
      sfxBus.gain.value = settings.sfxOn ? settings.sfx : 0;

      musicBus.connect(masterGain);
      sfxBus.connect(masterGain);
      masterGain.connect(comp);
      comp.connect(ctx.destination);

      // shared feedback-delay reverb send (a few SFX use it)
      delayNode = ctx.createDelay(1.0);
      delayNode.delayTime.value = 0.24;
      feedback = ctx.createGain();
      feedback.gain.value = 0.38;
      var wet = ctx.createGain();
      wet.gain.value = 0.5;
      reverbIn = ctx.createGain();
      reverbIn.gain.value = 1;
      reverbIn.connect(delayNode);
      delayNode.connect(feedback);
      feedback.connect(delayNode);
      delayNode.connect(wet);
      wet.connect(masterGain);
      reverbOut = wet;

      // 2s white-noise buffer, reused by every noise-based sound
      var len = ctx.sampleRate * 2;
      noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
      var data = noiseBuf.getChannelData(0);
      for (var i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;

      return ctx;
    } catch (e) { ctx = null; return null; }
  }

  /* ---------------- envelopes & primitives ---------------- */
  function now() { return ctx ? ctx.currentTime : 0; }

  function env(g, t, a, peak, decay, dur) {
    // attack -> peak, exponential decay to ~0.0001 (never exactly 0)
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(Math.max(0.0001, peak), t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + dur);
    g.gain.setValueAtTime(0.0001, t + a + dur + 0.02);
  }

  function tone(t, freq, dur, vol, type, opts) {
    if (!ctx) return;
    opts = opts || {};
    var o = ctx.createOscillator();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t);
    if (opts.slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, opts.slide), t + (opts.slideT || dur));
    if (opts.detune) o.detune.value = opts.detune;
    var g = ctx.createGain();
    env(g, t, opts.attack != null ? opts.attack : 0.008, vol, opts.decay != null ? opts.decay : dur * 0.9, dur);
    var dest = opts.dest || sfxBus;
    if (opts.filter) {
      var f = ctx.createBiquadFilter();
      f.type = opts.filter.type || 'lowpass';
      f.frequency.setValueAtTime(opts.filter.freq || 1200, t);
      if (opts.filter.sweep) f.frequency.exponentialRampToValueAtTime(opts.filter.sweep, t + dur);
      f.Q.value = opts.filter.q || 0.8;
      o.connect(f); f.connect(g); g.connect(dest);
    } else {
      o.connect(g); g.connect(dest);
    }
    if (opts.reverb && reverbIn) g.connect(reverbIn);
    if (opts.pan && ctx.createStereoPanner) {
      var p = ctx.createStereoPanner();
      p.pan.value = opts.pan;
      g.disconnect(dest);
      g.connect(p); p.connect(dest);
      if (opts.reverb && reverbIn) g.connect(reverbIn);
    }
    o.start(t);
    o.stop(t + dur + 0.15);
    return o;
  }

  function noise(t, dur, vol, filterType, freq, opts) {
    if (!ctx || !noiseBuf) return;
    opts = opts || {};
    var src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    src.loop = true;
    var f = ctx.createBiquadFilter();
    f.type = filterType || 'bandpass';
    f.frequency.setValueAtTime(freq || 900, t);
    f.Q.value = opts.q || 0.9;
    if (opts.sweep) f.frequency.exponentialRampToValueAtTime(opts.sweep, t + dur);
    var g = ctx.createGain();
    env(g, t, opts.attack != null ? opts.attack : 0.01, vol, opts.decay != null ? opts.decay : dur * 0.9, dur);
    src.connect(f); f.connect(g);
    g.connect(opts.dest || sfxBus);
    if (opts.reverb && reverbIn) g.connect(reverbIn);
    src.start(t);
    src.stop(t + dur + 0.15);
  }

  function kick(t, vol) {
    if (!ctx) return;
    var o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(130, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.22);
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.26);
    o.connect(g); g.connect(musicBus);
    o.start(t); o.stop(t + 0.3);
  }

  function pad(t, freqs, dur, vol) {
    // detuned triangle stack through a soft lowpass — warm ambience
    if (!ctx) return;
    for (var i = 0; i < freqs.length; i++) {
      var f = freqs[i];
      var g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(vol, t + (dur > 2 ? 1.4 : 0.5));
      g.gain.setValueAtTime(vol, t + dur - 0.6);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      var lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 1400;
      for (var d = -1; d <= 1; d++) {
        var o = ctx.createOscillator();
        o.type = 'triangle';
        o.frequency.value = f;
        o.detune.value = d * 5;
        o.connect(lp);
        o.start(t); o.stop(t + dur + 0.1);
      }
      lp.connect(g); g.connect(musicBus);
    }
  }

  /* ================= SFX ================= */
  function mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); }

  var SFX = {
    click: function (t, v) { tone(t, 950, 0.05, v, 'square', { decay: 0.04, filter: { type: 'lowpass', freq: 2400 } }); },
    hover: function (t, v) { tone(t, 1250, 0.035, v * 0.45, 'sine', { decay: 0.03 }); },
    select: function (t, v) {
      tone(t, 620, 0.09, v, 'sine', { decay: 0.08 });
      tone(t + 0.07, 930, 0.12, v, 'sine', { decay: 0.1 });
    },
    back: function (t, v) {
      tone(t, 500, 0.08, v, 'sine', { decay: 0.07, slide: 340, slideT: 0.07 });
    },
    collect: function (t, v) {
      [660, 880, 1320].forEach(function (f, i) { tone(t + i * 0.055, f, 0.16, v, 'sine', { decay: 0.14, reverb: true }); });
    },
    coin: function (t, v) {
      tone(t, 1180, 0.1, v, 'square', { decay: 0.08, filter: { type: 'highpass', freq: 2600 } });
      tone(t + 0.09, 1760, 0.2, v, 'square', { decay: 0.16, filter: { type: 'highpass', freq: 2600 }, reverb: true });
    },
    connect: function (t, v) {
      noise(t, 0.07, v * 0.5, 'highpass', 2500);
      tone(t + 0.02, 240, 0.1, v, 'sawtooth', { decay: 0.08, filter: { type: 'lowpass', freq: 1200, sweep: 300 } });
      tone(t + 0.03, 1320, 0.12, v * 0.8, 'sine', { decay: 0.1, reverb: true });
    },
    connectFail: function (t, v) {
      tone(t, 130, 0.22, v, 'sawtooth', { decay: 0.2, filter: { type: 'lowpass', freq: 500 } });
      noise(t, 0.12, v * 0.4, 'lowpass', 700);
    },
    led: function (t, v) {
      tone(t, 220, 0.35, v, 'sine', { attack: 0.05, decay: 0.3, filter: { type: 'lowpass', freq: 800, sweep: 2200 } });
      tone(t + 0.05, 440, 0.3, v * 0.5, 'sine', { attack: 0.08, decay: 0.25, filter: { type: 'lowpass', freq: 1500, sweep: 3000 } });
    },
    textile: function (t, v) {
      noise(t, 0.34, v * 0.55, 'bandpass', 800, { sweep: 2600, q: 1.1 });
    },
    test: function (t, v) {
      tone(t, 1560, 0.09, v, 'sine', { decay: 0.07 });
      tone(t + 0.11, 1240, 0.09, v, 'sine', { decay: 0.07 });
    },
    testPass: function (t, v) {
      [523, 659, 784].forEach(function (f, i) { tone(t + i * 0.08, f, 0.2, v, 'triangle', { decay: 0.16, reverb: true }); });
    },
    testFail: function (t, v) {
      tone(t, 392, 0.2, v, 'sawtooth', { decay: 0.18, filter: { type: 'lowpass', freq: 900 } });
      tone(t + 0.16, 311, 0.28, v, 'sawtooth', { decay: 0.24, filter: { type: 'lowpass', freq: 800 } });
    },
    mission: function (t, v) {
      [659, 880, 1174].forEach(function (f, i) { tone(t + i * 0.06, f, 0.3, v, 'triangle', { decay: 0.26, reverb: true }); });
      tone(t + 0.18, 1568, 0.4, v * 0.6, 'sine', { decay: 0.36, reverb: true });
    },
    levelup: function (t, v) {
      [523, 659, 784, 1046].forEach(function (f, i) { tone(t + i * 0.07, f, 0.24, v, 'triangle', { decay: 0.2, reverb: true }); });
      noise(t + 0.28, 0.3, v * 0.25, 'highpass', 4200);
    },
    achievement: function (t, v) {
      [1046, 1318, 1568, 2093].forEach(function (f, i) { tone(t + i * 0.05, f, 0.5, v * 0.8, 'sine', { decay: 0.44, reverb: true }); });
    },
    rank: function (t, v) {
      kick(t, v * 0.9);
      tone(t, 65, 0.8, v * 0.7, 'sine', { decay: 0.7 });
      [220, 277, 330, 440].forEach(function (f, i) { tone(t + 0.25 + i * 0.09, f, 0.7, v * 0.3, 'triangle', { attack: 0.4, decay: 0.5, reverb: true }); });
    },
    error: function (t, v) {
      tone(t, 165, 0.16, v, 'square', { decay: 0.14, filter: { type: 'lowpass', freq: 620 } });
    },
    whoosh: function (t, v) {
      noise(t, 0.42, v * 0.5, 'bandpass', 400, { sweep: 3200, q: 0.8 });
      noise(t + 0.1, 0.3, v * 0.3, 'bandpass', 3000, { sweep: 500, q: 0.8 });
    },
    impact: function (t, v) {
      kick(t, v * 1.1);
      noise(t, 0.35, v * 0.5, 'lowpass', 900, { sweep: 180 });
      tone(t, 52, 0.6, v * 0.8, 'sine', { decay: 0.55 });
    },
    countdown: function (t, v) {
      tone(t, 880, 0.14, v, 'sine', { decay: 0.12 });
      tone(t + 0.03, 1760, 0.1, v * 0.5, 'sine', { decay: 0.08 });
    },
    scoreTick: function (t, v) {
      tone(t, 1400 + Math.random() * 500, 0.03, v * 0.4, 'square', { decay: 0.02, filter: { type: 'highpass', freq: 3000 } });
    },
    reveal: function (t, v) {
      // slow riser into a bloom
      var dur = 1.7;
      var o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(160, t);
      o.frequency.exponentialRampToValueAtTime(980, t + dur);
      var g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(v * 0.5, t + dur * 0.9);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.7);
      var f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.setValueAtTime(300, t);
      f.frequency.exponentialRampToValueAtTime(6000, t + dur);
      o.connect(f); f.connect(g); g.connect(sfxBus);
      o.start(t); o.stop(t + dur + 0.8);
      if (reverbIn) g.connect(reverbIn);
      tone(t + dur, 1046, 1.2, v * 0.7, 'sine', { decay: 1.1, reverb: true });
      tone(t + dur + 0.05, 1568, 1.2, v * 0.45, 'sine', { decay: 1.1, reverb: true });
    }
  };

  function sfx(name, opts) {
    if (!ctx || !settings.sfxOn) return;
    opts = opts || {};
    var vol = settings.sfx * (opts.vol != null ? opts.vol : 0.85);
    var fn = SFX[name];
    if (!fn) return;
    try {
      var t = ctx.currentTime + 0.001;
      if (opts.rate) { /* rate variation handled per-effect via slide */ }
      fn(t, vol);
    } catch (e) { /* never throw */ }
  }

  /* ================= MUSIC ================= */
  var MIDI = {
    A0: 21, C1: 24, D1: 26, E1: 28, F1: 29, G1: 31, A1: 33, B1: 35,
    C2: 36, D2: 38, E2: 40, F2: 41, G2: 43, A2: 45, B2: 47,
    C3: 48, D3: 50, E3: 52, F3: 53, G3: 55, A3: 57, B3: 59,
    C4: 60, D4: 62, E4: 64, F4: 65, G4: 67, A4: 69, B4: 71,
    C5: 72, D5: 74, E5: 76, F5: 77, G5: 79, A5: 81, B5: 83,
    C6: 84, D6: 86, E6: 88
  };

  // Each track: bpm, 4 bars of 16 sixteenths (bars * 16 steps).
  // chord: array of 4 midi notes (pad plays them at each bar start)
  // bass: [root, root+7, root-3...] pattern per bar
  // arp: array of 16 midi-offsets (0 = rest) per bar, played at 8ths
  // pluck/pulse styles differ per track
  var TRACKS = {
    menu: {
      bpm: 62, bars: 4, vol: 0.9,
      chords: [[MIDI.A3, MIDI.C4, MIDI.E4, MIDI.G4], [MIDI.F3, MIDI.A3, MIDI.C4, MIDI.E4], [MIDI.C4, MIDI.E4, MIDI.G4, MIDI.B4], [MIDI.G3, MIDI.B3, MIDI.D4, MIDI.F4]],
      bass: [MIDI.A2, 0, MIDI.A2, 0, MIDI.F2, 0, MIDI.F2, 0, MIDI.C3, 0, MIDI.C3, 0, MIDI.G2, 0, MIDI.G2, 0],
      arp: [0, MIDI.E4, 0, MIDI.G4, 0, MIDI.C5, 0, MIDI.E4, 0, MIDI.G4, 0, MIDI.B4, 0, MIDI.D5, 0, MIDI.E4],
      style: 'ambient'
    },
    lab: {
      bpm: 100, bars: 4, vol: 0.85,
      chords: [[MIDI.E3, MIDI.G3, MIDI.B3, MIDI.D4], [MIDI.C3, MIDI.E3, MIDI.G3, MIDI.B3], [MIDI.G3, MIDI.B3, MIDI.D4, MIDI.F4], [MIDI.D3, MIDI.F3, MIDI.A3, MIDI.C4]],
      bass: [MIDI.E2, MIDI.E2, MIDI.G2, MIDI.E2, MIDI.C2, MIDI.C2, MIDI.E2, MIDI.C2, MIDI.G2, MIDI.G2, MIDI.B2, MIDI.G2, MIDI.D2, MIDI.D2, MIDI.F2, MIDI.D2],
      arp: [MIDI.B3, 0, MIDI.E4, 0, MIDI.G4, 0, MIDI.B4, 0, MIDI.C4, 0, MIDI.E4, 0, MIDI.G4, 0, MIDI.C5, 0],
      kickPattern: [1, 0, 0, 0, 0.8, 0, 0, 0, 1, 0, 0, 0, 0.8, 0, 0, 0],
      style: 'pulse'
    },
    tension: {
      bpm: 74, bars: 4, vol: 0.8,
      chords: [[MIDI.D3, MIDI.F3, MIDI.A3, MIDI.C4], [MIDI.D3, MIDI.F3, MIDI.A3, MIDI.B3], [MIDI.C3, MIDI.E3, MIDI.G3, MIDI.B3], [MIDI.D3, MIDI.F3, MIDI.A3, MIDI.C4]],
      bass: [MIDI.D2, 0, 0, 0, MIDI.D2, 0, MIDI.C3, 0, MIDI.C2, 0, 0, 0, MIDI.D2, 0, MIDI.D3, 0],
      arp: [0, MIDI.A3, 0, 0, MIDI.C4, 0, 0, MIDI.A3, 0, MIDI.B3, 0, 0, MIDI.D4, 0, 0, MIDI.C4],
      kickPattern: [1, 0, 0, 0, 0, 0, 0.7, 0, 1, 0, 0, 0, 0, 0, 0.7, 0],
      style: 'dark'
    },
    cinematic: {
      bpm: 54, bars: 8, vol: 1.0,
      chords: [[MIDI.A3, MIDI.C4, MIDI.E4, MIDI.G4], [MIDI.A3, MIDI.C4, MIDI.E4, MIDI.G4], [MIDI.F3, MIDI.A3, MIDI.C4, MIDI.E4], [MIDI.F3, MIDI.A3, MIDI.C4, MIDI.E4],
               [MIDI.C4, MIDI.E4, MIDI.G4, MIDI.B4], [MIDI.C4, MIDI.E4, MIDI.G4, MIDI.B4], [MIDI.E3, MIDI.G3, MIDI.B3, MIDI.D4], [MIDI.E3, MIDI.G3, MIDI.B3, MIDI.D4]],
      bass: [MIDI.A2, 0, 0, 0, 0, 0, MIDI.E3, 0, MIDI.F2, 0, 0, 0, 0, 0, MIDI.C3, 0,
             MIDI.C3, 0, 0, 0, 0, 0, MIDI.G3, 0, MIDI.E2, 0, 0, 0, MIDI.B2, 0, MIDI.E3, 0],
      arp: [0, MIDI.E4, 0, 0, MIDI.C5, 0, 0, MIDI.E4, 0, MIDI.A4, 0, 0, MIDI.G4, 0, MIDI.E4, 0],
      style: 'cinematic'
    },
    victory: {
      bpm: 112, bars: 4, vol: 0.9,
      chords: [[MIDI.C4, MIDI.E4, MIDI.G4, MIDI.C5], [MIDI.F3, MIDI.A3, MIDI.C4, MIDI.F4], [MIDI.G3, MIDI.B3, MIDI.D4, MIDI.G4], [MIDI.C4, MIDI.E4, MIDI.G4, MIDI.C5]],
      bass: [MIDI.C2, MIDI.C2, MIDI.G2, MIDI.C2, MIDI.F2, MIDI.F2, MIDI.C3, MIDI.F2, MIDI.G2, MIDI.G2, MIDI.D3, MIDI.G2, MIDI.C3, MIDI.C3, MIDI.G2, MIDI.C3],
      arp: [MIDI.E4, MIDI.G4, MIDI.C5, MIDI.G4, MIDI.E4, MIDI.G4, MIDI.C5, MIDI.G4, MIDI.F4, MIDI.A4, MIDI.C5, MIDI.A4, MIDI.F4, MIDI.A4, MIDI.C5, MIDI.A4],
      kickPattern: [1, 0, 0, 0, 0.7, 0, 0, 0, 1, 0, 0, 0, 0.7, 0, 0, 0],
      style: 'fanfare'
    }
  };

  var currentTrack = null;
  var currentName = null;
  var schedTimer = null;
  var nextStepTime = 0;
  var stepIndex = 0;
  var duckTimer = null;
  var hidden = false;

  function stepDur(track) { return 60 / track.bpm / 4; } // one 16th

  function scheduleStep(track, step, t) {
    var bars = track.bars;
    var bar = Math.floor(step / 16) % bars;
    var s = step % 16;
    var vol = track.vol * settings.music;

    // pad: sustained chord at the start of every bar
    if (s === 0) {
      var chord = track.chords[bar];
      var padDur = bars * 4 * stepDur(track) - 0.1;
      var padVol = vol * (track.style === 'cinematic' ? 0.5 : 0.28);
      pad(t, chord.map(mtof), padDur, padVol);
    }

    // bass line
    var bn = track.bass[s];
    if (bn) {
      var bv = vol * 0.5;
      if (track.style === 'pulse') {
        tone(t, mtof(bn), 0.16, bv, 'square', { filter: { type: 'lowpass', freq: 420 }, decay: 0.14 });
      } else if (track.style === 'dark') {
        tone(t, mtof(bn), 0.5, bv * 0.8, 'sine', { decay: 0.45 });
      } else {
        tone(t, mtof(bn), 0.42, bv * 0.85, 'triangle', { decay: 0.38 });
      }
    }

    // arp / pluck
    var an = track.arp[s];
    if (an) {
      var av = vol * 0.3;
      if (track.style === 'ambient') {
        tone(t, mtof(an), 0.6, av, 'sine', { attack: 0.05, decay: 0.55, reverb: true, pan: Math.sin(step) * 0.4 });
      } else if (track.style === 'pulse') {
        tone(t, mtof(an), 0.18, av * 1.2, 'triangle', { decay: 0.15, filter: { type: 'lowpass', freq: 2600 } });
      } else if (track.style === 'dark') {
        if (s % 4 === 2) tone(t, mtof(an), 0.5, av * 1.2, 'sine', { attack: 0.1, decay: 0.42, reverb: true });
      } else if (track.style === 'fanfare') {
        tone(t, mtof(an), 0.14, av * 1.3, 'square', { decay: 0.12, filter: { type: 'lowpass', freq: 3000 } });
      } else if (track.style === 'cinematic') {
        if (s % 4 === 0) tone(t, mtof(an), 1.0, av * 1.1, 'sine', { attack: 0.2, decay: 0.85, reverb: true });
      }
    }

    // kick pattern (pulse/dark/fanfare)
    var kp = track.kickPattern && track.kickPattern[s];
    if (kp) kick(t, vol * 0.6 * kp);
  }

  function scheduler() {
    if (!ctx || hidden) return;
    if (!currentTrack) return;
    var spb = currentTrack.bars * 16;
    while (nextStepTime < ctx.currentTime + 0.14) {
      scheduleStep(currentTrack, stepIndex, nextStepTime);
      nextStepTime += stepDur(currentTrack);
      stepIndex = (stepIndex + 1) % spb;
    }
  }

  function stopScheduler() {
    if (schedTimer) { clearInterval(schedTimer); schedTimer = null; }
  }

  function music(name, opts) {
    if (!ensureCtx()) return;
    opts = opts || {};
    var track = TRACKS[name];
    if (!track) return;
    var fade = opts.fade != null ? opts.fade : 900;

    // duck state that is permanently lowered is only for musicOn=false
    musicBus.gain.cancelScheduledValues(ctx.currentTime);
    musicBus.gain.setTargetAtTime(settings.musicOn ? settings.music : 0, ctx.currentTime, fade / 1000 / 3);

    if (currentName === name) return;
    currentName = name;
    currentTrack = track;
    stepIndex = 0;
    nextStepTime = ctx.currentTime + 0.06;
    stopScheduler();
    schedTimer = setInterval(scheduler, 30);
    if (name === 'ambient') startAmbientTone();
  }

  function stopMusic(fade) {
    if (!ctx) return;
    stopScheduler();
    currentName = null;
    currentTrack = null;
    var f = fade != null ? fade : 700;
    var t = ctx.currentTime;
    musicBus.gain.cancelScheduledValues(t);
    musicBus.gain.setTargetAtTime(0, t, f / 1000 / 3);
  }

  /* soft room-tone for 'ambient' (the lab is never silent) */
  var ambientSrc = null;
  function startAmbientTone() {
    if (!ctx || !noiseBuf || ambientSrc) return;
    try {
      ambientSrc = ctx.createBufferSource();
      ambientSrc.buffer = noiseBuf;
      ambientSrc.loop = true;
      var f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 240;
      var g = ctx.createGain();
      g.gain.value = 0.012;
      ambientSrc.connect(f); f.connect(g); g.connect(musicBus);
      ambientSrc.start();
    } catch (e) { ambientSrc = null; }
  }

  /* ================= CROWD (arena ambience) ================= */
  var crowdGain = null;
  function crowd(on, vol) {
    if (!ensureCtx()) return;
    try {
      if (on && !crowdGain) {
        var src = ctx.createBufferSource();
        src.buffer = noiseBuf;
        src.loop = true;
        var f = ctx.createBiquadFilter();
        f.type = 'bandpass';
        f.frequency.value = 900;
        f.Q.value = 0.4;
        crowdGain = ctx.createGain();
        crowdGain.gain.value = 0;
        src.connect(f); f.connect(crowdGain); crowdGain.connect(musicBus);
        src.start();
        crowdGain.gain.setTargetAtTime((vol != null ? vol : 0.5) * 0.35, ctx.currentTime, 0.8);
      } else if (!on && crowdGain) {
        crowdGain.gain.setTargetAtTime(0, ctx.currentTime, 0.5);
        var old = crowdGain;
        setTimeout(function () {
          try { old.disconnect(); } catch (e) {}
          if (crowdGain === old) crowdGain = null;
        }, 2000);
      }
    } catch (e) { /* safe */ }
  }

  /* ================= DUCK (cinematic focus) ================= */
  function duck(amount, ms) {
    if (!ctx) return;
    if (duckTimer) { clearTimeout(duckTimer); duckTimer = null; }
    var t = ctx.currentTime;
    var dur = (ms != null ? ms : 1200) / 1000;
    var target = settings.musicOn ? settings.music * amount : 0;
    musicBus.gain.cancelScheduledValues(t);
    musicBus.gain.setTargetAtTime(target, t, dur / 3);
    duckTimer = setTimeout(function () {
      if (ctx) {
        var t2 = ctx.currentTime;
        musicBus.gain.cancelScheduledValues(t2);
        musicBus.gain.setTargetAtTime(settings.musicOn ? settings.music : 0, t2, dur / 2);
      }
      duckTimer = null;
    }, dur * 1000 + 150);
  }

  /* ================= volume + toggles ================= */
  function setMaster(v) {
    settings.master = Math.max(0, Math.min(1, v));
    if (masterGain) masterGain.gain.value = settings.master;
    persist();
  }
  function setMusicVol(v) {
    settings.music = Math.max(0, Math.min(1, v));
    if (musicBus && ctx) musicBus.gain.setTargetAtTime(settings.musicOn ? settings.music : 0, ctx.currentTime, 0.1);
    persist();
  }
  function setSfxVol(v) {
    settings.sfx = Math.max(0, Math.min(1, v));
    persist();
  }
  function toggleMusic(on) {
    settings.musicOn = on;
    if (musicBus && ctx) musicBus.gain.setTargetAtTime(on ? settings.music : 0, ctx.currentTime, 0.2);
    persist();
  }
  function toggleSfx(on) {
    settings.sfxOn = on;
    persist();
  }
  function state() {
    return {
      master: settings.master, music: settings.music, sfx: settings.sfx,
      musicOn: settings.musicOn, sfxOn: settings.sfxOn, track: currentName
    };
  }

  /* ================= lifecycle ================= */
  function unlock() {
    if (!ctx) ensureCtx();
    if (ctx && ctx.state === 'suspended') { try { ctx.resume(); } catch (e) {} }
  }

  function init() {
    ensureCtx();
  }

  document.addEventListener('visibilitychange', function () {
    hidden = document.hidden;
    if (hidden) {
      stopScheduler();
      if (ctx && ctx.state === 'running') { try { ctx.suspend(); } catch (e) {} }
    } else {
      if (ctx && ctx.state === 'suspended') { try { ctx.resume(); } catch (e) {} }
      if (currentTrack && !hidden) {
        nextStepTime = ctx.currentTime + 0.08;
        stopScheduler();
        schedTimer = setInterval(scheduler, 30);
      }
    }
  });

  // unlock on the first user gesture
  ['pointerdown', 'keydown', 'touchstart'].forEach(function (ev) {
    document.addEventListener(ev, function once() {
      unlock();
      document.removeEventListener(ev, once);
    }, { once: true, passive: true });
  });

  window.Sound = {
    init: init,
    unlock: unlock,
    get ready() { return !!(ctx && ctx.state === 'running'); },
    sfx: sfx,
    music: music,
    stopMusic: stopMusic,
    duck: duck,
    setMaster: setMaster,
    setMusicVol: setMusicVol,
    setSfxVol: setSfxVol,
    toggleMusic: toggleMusic,
    toggleSfx: toggleSfx,
    state: state,
    crowd: crowd
  };
})();
