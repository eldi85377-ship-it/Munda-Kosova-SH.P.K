/* =====================================================================
   MUNDA — LAUNCHER ENGINE (shared by index.html and experience.html)
   One START button → short cinematic → gameplay.

   index.html:      <button id="launch-start" data-target="experience.html?auto=1">
                    click → cinematic → navigate.
   experience.html: bootInit() (futurelab.js) calls MundaLauncher.play(cb)
                    when the START button is clicked.
   ===================================================================== */
(function () {
  'use strict';

  var cine = null, busy = false;
  var REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* tiny premium whoosh + low swell, generated live (index has no Sound engine) */
  var ctx = null;
  function sweep() {
    try {
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === 'suspended') ctx.resume();
      var t = ctx.currentTime;
      // whoosh: filtered noise, fast band sweep
      var dur = 0.9;
      var buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
      var d = buf.getChannelData(0);
      for (var i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
      var src = ctx.createBufferSource(); src.buffer = buf;
      var bp = ctx.createBiquadFilter(); bp.type = 'bandpass';
      bp.Q.value = 1.1; bp.frequency.setValueAtTime(240, t);
      bp.frequency.exponentialRampToValueAtTime(3200, t + dur * 0.55);
      bp.frequency.exponentialRampToValueAtTime(500, t + dur);
      var g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.5, t + 0.09);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(bp); bp.connect(g); g.connect(ctx.destination);
      src.start(t);
      // low swell under the logo moment
      var o = ctx.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(56, t + 0.55);
      o.frequency.linearRampToValueAtTime(120, t + 1.25);
      var og = ctx.createGain();
      og.gain.setValueAtTime(0.0001, t + 0.5);
      og.gain.exponentialRampToValueAtTime(0.16, t + 0.95);
      og.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
      o.connect(og); og.connect(ctx.destination);
      o.start(t + 0.5); o.stop(t + 1.7);
    } catch (e) { /* audio is a bonus */ }
  }

  /* ---------- the cinematic: veil → beam → logo zoom → warp → flash ---------- */
  function play(onDone) {
    if (busy) return;
    busy = true;
    if (!cine || REDUCED) { done(); return; }

    // game-side engine has richer SFX — use them when present
    try { if (window.Sound && Sound.sfx) Sound.sfx('whoosh'); else sweep(); } catch (e) { sweep(); }

    cine.classList.add('on');
    var timers = [];
    function at(ms, fn) { timers.push(setTimeout(fn, ms)); }

    at(60, function () { cine.classList.add('veil'); });
    at(120, function () { cine.classList.add('beam'); });
    at(760, function () { cine.classList.add('zoom'); });
    at(1500, function () { cine.classList.add('warp'); });
    at(1620, function () { cine.classList.add('flash'); });
    at(2050, function () {
      cine.classList.add('hold');          // black beat before handoff
      cine.classList.remove('beam', 'zoom', 'warp', 'flash');
      at(120, done);
    });

    function done() {
      timers.forEach(clearTimeout);
      cine.classList.remove('on', 'veil', 'beam', 'zoom', 'warp', 'flash', 'hold');
      busy = false;
      if (typeof onDone === 'function') onDone();
    }
  }

  function launch(btn) {
    if (!btn) return;
    var target = btn.getAttribute('data-target');
    btn.addEventListener('click', function () {
      if (busy) return;
      play(function () {
        if (target) window.location.href = target;
      });
    });
  }

  /* ---------- init ---------- */
  function init() {
    cine = document.getElementById('cine');
    var start = document.getElementById('launch-start');
    if (start) launch(start);
  }

  window.MundaLauncher = {
    init: init,
    play: play,
    launch: launch,
    get busy() { return busy; }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
