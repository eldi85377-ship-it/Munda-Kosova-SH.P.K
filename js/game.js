/* =====================================================================
   MUNDA — game systems for the FUTURE LAB experience:
   scoring engine (deterministic, choice-driven), Jury Mode (live 3-min
   jury control), the cinematic light show, and the finale.

   The main build flow (DESIGN → LIGHT → CONNECT → TEST → SHOWCASE)
   lives in futurelab.js. This module serves the LIVE PRESENTATION
   (Jury Mode) and the shared cinematic moments.
   ===================================================================== */
(function () {
  'use strict';

  /* ============ SCORING ENGINE ============
     Same weights as the build flow in futurelab.js:
       total = lighting*.24 + precision*.20 + efficiency*.18
             + durability*.18 + design*.20
     Pure function of the interior state — no randomness. */
  var Score = (function () {
    function clamp(n) { return Math.max(0, Math.min(100, n)); }
    var COLOR_HARMONY = { red: 78, blue: 85, cyan: 92, purple: 88, green: 80, gold: 90, white: 68, gradient: 96 };
    var PATTERN_SCORE = { linear: 70, wave: 82, flow: 86, pulse: 74, dots: 80, dynamic: 93, custom: 90 };
    var MAT_DUR = { carbon: 88, knit: 72, mesh: 82, silk: 64 };
    var MODE_EFF = { city: 82, sport: 52, night: 88, eco: 96 };

    function compute(state, extra) {
      extra = extra || {};
      state = state || {};
      var zones = state.zones || {};
      var zoneCount = 0, z;
      for (z in zones) if (zones[z]) zoneCount++;
      var b = state.brightness != null ? state.brightness : 70;
      var mat = state.material || 'carbon';
      var mode = state.mode || 'city';
      var color = state.color || 'blue';
      var pattern = state.pattern || 'linear';
      var anim = state.animation || 'static';

      var lighting = clamp(
        22 + b * 0.34 + zoneCount * 4.6 +
        (COLOR_HARMONY[color] || 80) * 0.12 +
        (PATTERN_SCORE[pattern] || 70) * 0.1);

      var precision = clamp(
        (extra.mistakes != null ? 96 - extra.mistakes * 14 + (extra.mistakes === 0 ? 4 : 0) : 90) +
        (anim === 'dynamic' ? -3 : 0), 0, 100);

      var efficiency = clamp(
        (MODE_EFF[mode] || 82) - b * 0.14 +
        (mat === 'mesh' ? 5 : 0) + (mode === 'eco' ? 4 : 0) +
        (extra.testsPassed === 5 ? 3 : 0), 0, 100);

      var durability = clamp(
        MAT_DUR[mat] - (extra.mistakes ? extra.mistakes * 2 : 0) +
        (extra.testsPassed === 5 ? 5 : extra.testsPassed >= 3 ? 2 : 0) +
        (mat === 'carbon' ? 3 : 0), 0, 100);

      var design = clamp(
        (COLOR_HARMONY[color] || 80) * 0.22 +
        (PATTERN_SCORE[pattern] || 70) * 0.2 +
        (anim === 'dynamic' ? 9 : anim !== 'static' ? 5 : 0) +
        zoneCount * 3.2 + (mat !== 'carbon' ? 4 : 0) + (zoneCount >= 4 ? 3 : 0), 0, 100);

      var total = Math.round(
        lighting * 0.24 + precision * 0.20 + efficiency * 0.18 +
        durability * 0.18 + design * 0.20);

      return {
        total: clamp(total, 0, 100),
        sub: {
          lighting: Math.round(lighting), precision: Math.round(precision),
          efficiency: Math.round(efficiency), durability: Math.round(durability), design: Math.round(design)
        }
      };
    }
    return { compute: compute };
  })();

  /* ============ module state ============ */
  var timerInterval = null;
  var current = null;         // { kind }
  var juryResult = null;
  var lightShowRunning = false;
  var lightShowInterval = null;
  var lightShowSaved = null;

  var LS_SCRIPT = [
    { color: 'blue', pattern: 'flow', animation: 'flow', speed: 'medium', brightness: 82 },
    { color: 'gold', pattern: 'wave', animation: 'wave', speed: 'slow', brightness: 70 },
    { color: 'purple', pattern: 'dots', animation: 'breathing', speed: 'medium', brightness: 64 },
    { color: 'red', pattern: 'dynamic', animation: 'dynamic', speed: 'fast', brightness: 90 },
    { color: 'green', pattern: 'pulse', animation: 'pulse', speed: 'medium', brightness: 55 },
    { color: 'white', pattern: 'linear', animation: 'static', speed: 'medium', brightness: 62 },
    { color: 'gradient', pattern: 'custom', animation: 'dynamic', speed: 'fast', brightness: 86 }
  ];

  /* ============ timer ============ */
  function startTimer(elId, seconds, onTick, onEnd) {
    var el = document.getElementById(elId);
    if (!el) return;
    if (timerInterval) clearInterval(timerInterval);
    var end = Date.now() + seconds * 1000;
    function render(remaining) {
      var m = Math.floor(remaining / 60), s = remaining % 60;
      el.textContent = (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
      el.classList.toggle('warn', remaining <= 30);
    }
    timerInterval = setInterval(function () {
      var remaining = Math.max(0, Math.ceil((end - Date.now()) / 1000));
      render(remaining);
      if (onTick) onTick(seconds - remaining, seconds);
      if (remaining <= 0) {
        clearInterval(timerInterval); timerInterval = null;
        if (onEnd) onEnd();
      }
    }, 250);
    render(seconds);
  }
  function stopTimer() {
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
  }

  /* ============ jury mode ============ */
  function startJury() {
    if (window.Interior) Interior.reset({
      zones: { dashboard: true, doors: false, console: false, footwell: false, seats: false, roof: false },
      color: 'cyan', pattern: 'wave', brightness: 60, animation: 'flow',
      speed: 'medium', material: 'carbon', mode: 'city'
    });
    if (window.FutureLab) FutureLab.setEnv('showroom', false);
    current = { kind: 'jury' };
    startTimer('jury-timer', 180, null, function () {
      reveal(function () { finishJury(); });
    });
  }

  function finishJury() {
    stopTimer();
    var state = window.Interior ? Interior.getState() : {};
    var score = Score.compute(state, { completedReview: true });
    juryResult = { playerScore: score, playerState: state };
    if (window.FutureLab && FutureLab.showResult) {
      if (window.App) App.go('result');
      FutureLab.showResult({ total: score.total, sub: score.sub, tests: [], testsPassed: 0, mistakes: 0 }, { silent: true });
    } else if (window.App) {
      App.go('hub');
    }
  }

  /* ============ light show ============ */
  function runLightShow() {
    if (lightShowRunning) return;
    if (window.Sound) try { Sound.sfx('whoosh'); } catch (e) {}
    lightShowSaved = window.Interior ? Interior.getState() : null;
    lightShowRunning = true;
    document.body.classList.add('lightshow');
    var ov = document.getElementById('lightshow');
    if (ov) { ov.hidden = false; ov.classList.add('show'); }
    if (window.Interior) Interior.setZones({ dashboard: true, doors: true, console: true, footwell: true, seats: true, roof: true });
    var i = 0;
    lightShowInterval = setInterval(function () {
      var p = LS_SCRIPT[i % LS_SCRIPT.length];
      if (window.Interior) {
        Interior.setState('color', p.color);
        Interior.setState('pattern', p.pattern);
        Interior.setState('animation', p.animation);
        Interior.setState('speed', p.speed);
        Interior.setState('brightness', p.brightness);
      }
      i++;
    }, 1800);
  }

  function stopLightShow() {
    if (!lightShowRunning) return;
    clearInterval(lightShowInterval); lightShowInterval = null;
    lightShowRunning = false;
    document.body.classList.remove('lightshow');
    var ov = document.getElementById('lightshow');
    if (ov) {
      ov.classList.remove('show');
      setTimeout(function () { ov.hidden = true; }, 600);
    }
    if (lightShowSaved && window.Interior) Interior.setStateFull(lightShowSaved);
  }

  /* ============ cinematic reveal (jury) ============ */
  function flashInterior() {
    if (!window.Interior) return null;
    var saved = Interior.getState();
    var flash = JSON.parse(JSON.stringify(saved));
    flash.zones = { dashboard: true, doors: true, console: true, footwell: true, seats: true, roof: true };
    flash.brightness = 100; flash.animation = 'dynamic'; flash.speed = 'fast';
    Interior.setStateFull(flash);
    return saved;
  }

  function reveal(onDone) {
    var ov = document.getElementById('reveal');
    var count = document.getElementById('reveal-count');
    var caption = document.getElementById('reveal-caption');
    if (!ov) { if (onDone) onDone(); return; }
    ov.hidden = false; ov.classList.add('show');
    caption.textContent = '';
    count.style.display = '';
    var n = 3;
    var saved;
    function step() {
      if (n > 0) {
        count.textContent = n;
        count.style.animation = 'none'; void count.offsetWidth; count.style.animation = '';
        if (window.Sound) try { Sound.sfx('countdown'); } catch (e) {}
        n--;
        setTimeout(step, 900);
      } else {
        saved = flashInterior();
        count.style.display = 'none';
        caption.textContent = 'YOU JUST DESIGNED THE FUTURE';
        caption.style.animation = 'none'; void caption.offsetWidth; caption.style.animation = 'fadeUp 1s cubic-bezier(0.22,1,0.36,1) both';
        if (window.Sound) try { Sound.sfx('reveal'); } catch (e) {}
        setTimeout(function () {
          ov.classList.remove('show');
          setTimeout(function () {
            ov.hidden = true; count.style.display = ''; caption.textContent = '';
            if (saved && window.Interior) Interior.setStateFull(saved);
            if (onDone) onDone();
          }, 700);
        }, 1900);
      }
    }
    step();
  }

  /* ============ finale ============ */
  function playFinale() {
    var ov = document.getElementById('finale');
    if (ov) { ov.hidden = false; ov.classList.add('show'); }
    if (window.Sound) try { Sound.music('cinematic'); } catch (e) {}
  }
  function closeFinale() {
    var ov = document.getElementById('finale');
    if (ov) {
      ov.classList.remove('show');
      setTimeout(function () { ov.hidden = true; }, 700);
    }
  }

  window.Score = Score;
  window.Game = {
    Score: Score,
    juryResult: function () { return juryResult; },
    computeScore: function (state, extra) {
      return Score.compute(state || (window.Interior ? Interior.getState() : {}), extra);
    },
    startJury: startJury,
    finishJury: finishJury,
    runLightShow: runLightShow,
    stopLightShow: stopLightShow,
    get lightShowRunning() { return lightShowRunning; },
    reveal: reveal,
    playFinale: playFinale,
    closeFinale: closeFinale
  };
})();
