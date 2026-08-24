/* MUNDA — game systems: scoring, challenge, jury mode, beat-the-designer,
   light show, and the cinematic reveal. */
(function () {
  'use strict';

  /* ============ SCORING ENGINE (deterministic, choice-driven) ============ */
  var Score = (function () {
    function clamp(n) { return Math.max(0, Math.min(100, n)); }
    function colorHarmony(c) {
      return { red: 78, blue: 85, cyan: 92, purple: 88, green: 80, gold: 90, white: 68, gradient: 96 }[c] || 80;
    }
    function patternScore(p) {
      return { linear: 70, wave: 82, flow: 86, pulse: 74, dots: 80, dynamic: 93, custom: 90 }[p] || 70;
    }

    function compute(state, extra) {
      extra = extra || {};
      var zones = state.zones || {};
      var zoneCount = 0, z;
      for (z in zones) if (zones[z]) zoneCount++;

      var design = clamp(
        0.5 * colorHarmony(state.color) +
        0.3 * (55 + zoneCount * 6.5) +
        0.2 * patternScore(state.pattern)
      );

      var innov = 55;
      if (state.color === 'gradient') innov += 10;
      if (state.pattern === 'dynamic' || state.pattern === 'custom') innov += 12;
      if (state.material && state.material !== 'carbon') innov += 10;
      if (zoneCount >= 4) innov += 8; else if (zoneCount >= 2) innov += 4;
      if (state.animation === 'dynamic') innov += 6; else if (state.animation !== 'static') innov += 3;
      innov = clamp(innov);

      var modeEff = { city: 82, sport: 52, night: 88, eco: 96 }[state.mode] || 82;
      var eff = clamp(modeEff - state.brightness * 0.16 + (state.material === 'mesh' ? 4 : 0));

      var integ = clamp(20 + (zoneCount / 6) * 60 + (state.material !== 'carbon' ? 14 : 0) + (zoneCount >= 3 ? 8 : 0));

      var ux = 60;
      if (extra.completedReview) ux += 12;
      if (extra.savedDesign) ux += 10;
      if (extra.usedLightShow) ux += 6;
      if (extra.timeLeft != null) ux += clamp((extra.timeLeft / 180) * 14);
      ux = clamp(ux);

      var sub = {
        design: Math.round(design),
        innovation: Math.round(innov),
        efficiency: Math.round(eff),
        integration: Math.round(integ),
        ux: Math.round(ux)
      };
      var total = Math.round(
        0.30 * sub.design + 0.25 * sub.innovation + 0.20 * sub.efficiency +
        0.15 * sub.integration + 0.10 * sub.ux
      );
      return { total: total, sub: sub };
    }
    return { compute: compute };
  })();

  var CONCEPT = {
    zones: { dashboard: true, doors: true, console: true, footwell: true, seats: true, roof: true },
    color: 'gradient', pattern: 'dynamic', brightness: 40, animation: 'dynamic',
    speed: 'medium', material: 'silk', mode: 'eco'
  };
  var CONCEPT_EXTRA = { completedReview: true, savedDesign: true, usedLightShow: true, timeLeft: 120 };

  /* ============ module state ============ */
  var timerInterval = null;
  var current = null;        // { kind, extra, remaining }
  var lightShowRunning = false;
  var lightShowInterval = null;
  var lightShowSaved = null;
  var lastResult = null;     // { playerScore, conceptScore, playerState, extra, name }

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
      if (current) current.remaining = remaining;
      render(remaining);
      if (onTick) onTick(seconds - remaining, seconds);
      if (remaining <= 0) {
        clearInterval(timerInterval); timerInterval = null;
        onEnd();
      }
    }, 250);
    render(seconds);
  }
  function stopTimer() {
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
  }

  /* ============ challenge ============ */
  function updatePhases(phase) {
    document.querySelectorAll('#progress .phase').forEach(function (p) {
      var i = parseInt(p.getAttribute('data-phase'), 10);
      p.classList.toggle('active', i === phase);
      p.classList.toggle('done', i < phase);
    });
  }

  function startChallenge() {
    Interior.reset({
      zones: { dashboard: true, roof: true, doors: false, console: false, footwell: false, seats: false },
      color: 'cyan', pattern: 'linear', brightness: 70, animation: 'static',
      speed: 'medium', material: 'carbon', mode: 'city'
    });
    current = { kind: 'challenge', extra: { completedReview: true, savedDesign: false, usedLightShow: false }, remaining: 180 };
    updatePhases(0);
    startTimer('timer', 180, function (elapsed) {
      updatePhases(Math.min(3, Math.floor(elapsed / 45)));
    }, finishChallenge);
  }

  function finishChallenge() {
    stopTimer();
    computeAndShowBeat();
    if (window.App) App.go('beat');
  }

  /* ============ jury ============ */
  function startJury() {
    Interior.reset({
      zones: { dashboard: true, doors: false, console: false, footwell: false, seats: false, roof: false },
      color: 'cyan', pattern: 'wave', brightness: 60, animation: 'flow',
      speed: 'medium', material: 'carbon', mode: 'city'
    });
    current = { kind: 'jury', extra: { completedReview: true, savedDesign: false, usedLightShow: false }, remaining: 180 };
    startTimer('jury-timer', 180, null, function () {
      if (window.App) App.onJuryTimeUp();
    });
  }

  function finishJury() {
    stopTimer();
    computeAndShowBeat();
    if (window.App) App.go('beat');
  }

  function computeAndShowBeat() {
    var playerState = Interior.getState();
    var extra = (current && current.extra) || { completedReview: true };
    if (current && current.remaining != null) extra.timeLeft = current.remaining;
    var playerScore = Score.compute(playerState, extra);
    var conceptScore = Score.compute(CONCEPT, CONCEPT_EXTRA);
    lastResult = {
      playerScore: playerScore, conceptScore: conceptScore,
      playerState: playerState, extra: extra, name: null
    };
    renderBeat(lastResult);
  }

  /* ============ beat the designer ============ */
  var BAR_LABELS = { design: 'Design', innovation: 'Innovation', efficiency: 'Efficiency', integration: 'Integration', ux: 'UX' };

  function renderBars(containerId, sub) {
    var el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = '';
    Object.keys(BAR_LABELS).forEach(function (k) {
      var bar = document.createElement('div');
      bar.className = 'vs-bar';
      bar.innerHTML =
        '<span class="lb">' + BAR_LABELS[k] + '</span>' +
        '<span class="track"><span class="fill"></span></span>' +
        '<span class="val">' + sub[k] + '%</span>';
      el.appendChild(bar);
    });
  }

  function renderBeat(result) {
    result = result || lastResult;
    if (!result) return;
    var y = result.playerScore, c = result.conceptScore;
    document.getElementById('vs-your-score').textContent = y.total + '%';
    document.getElementById('vs-concept-score').textContent = c.total + '%';
    renderBars('vs-your-bars', y.sub);
    renderBars('vs-concept-bars', c.sub);
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        document.querySelectorAll('#vs-your-bars .fill').forEach(function (f, i) {
          f.style.width = Object.keys(BAR_LABELS)[i] ? (y.sub[Object.keys(BAR_LABELS)[i]] + '%') : '0%';
        });
        document.querySelectorAll('#vs-concept-bars .fill').forEach(function (f, i) {
          f.style.width = Object.keys(BAR_LABELS)[i] ? (c.sub[Object.keys(BAR_LABELS)[i]] + '%') : '0%';
        });
      });
    });
  }

  /* ============ light show ============ */
  function runLightShow() {
    if (lightShowRunning) return;
    lightShowSaved = Interior.getState();
    lightShowRunning = true;
    document.body.classList.add('lightshow');
    var ov = document.getElementById('lightshow');
    ov.hidden = false; ov.classList.add('show');
    Interior.setZones({ dashboard: true, doors: true, console: true, footwell: true, seats: true, roof: true });
    var i = 0;
    lightShowInterval = setInterval(function () {
      var p = LS_SCRIPT[i % LS_SCRIPT.length];
      Interior.setState('color', p.color);
      Interior.setState('pattern', p.pattern);
      Interior.setState('animation', p.animation);
      Interior.setState('speed', p.speed);
      Interior.setState('brightness', p.brightness);
      i++;
    }, 1800);
  }

  function stopLightShow() {
    if (!lightShowRunning) return;
    clearInterval(lightShowInterval); lightShowInterval = null;
    lightShowRunning = false;
    document.body.classList.remove('lightshow');
    var ov = document.getElementById('lightshow');
    ov.classList.remove('show');
    setTimeout(function () { ov.hidden = true; }, 600);
    if (lightShowSaved) Interior.setStateFull(lightShowSaved);
    if (current) current.extra.usedLightShow = true;
    if (window.App) App.syncShowcase();
  }

  /* ============ cinematic reveal (jury) ============ */
  function flashInterior() {
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
    ov.hidden = false; ov.classList.add('show');
    caption.textContent = '';
    count.style.display = '';
    var n = 3;
    var saved;
    function step() {
      if (n > 0) {
        count.textContent = n;
        count.style.animation = 'none'; void count.offsetWidth; count.style.animation = '';
        n--;
        setTimeout(step, 900);
      } else {
        saved = flashInterior();
        count.style.display = 'none';
        caption.textContent = 'YOU JUST DESIGNED THE FUTURE';
        caption.style.animation = 'none'; void caption.offsetWidth; caption.style.animation = 'fadeUp 1s cubic-bezier(0.22,1,0.36,1) both';
        setTimeout(function () {
          ov.classList.remove('show');
          setTimeout(function () {
            ov.hidden = true; count.style.display = ''; caption.textContent = '';
            Interior.setStateFull(saved);
            onDone();
          }, 700);
        }, 1700);
      }
    }
    step();
  }

  /* ============ finale ============ */
  function playFinale() {
    var ov = document.getElementById('finale');
    ov.hidden = false; ov.classList.add('show');
  }
  function closeFinale() {
    var ov = document.getElementById('finale');
    ov.classList.remove('show');
    setTimeout(function () { ov.hidden = true; }, 700);
  }

  window.Score = Score;
  window.Game = {
    CONCEPT: CONCEPT,
    Score: Score,
    current: function () { return current; },
    lastResult: function () { return lastResult; },
    computeScore: function (state, extra) { return Score.compute(state || Interior.getState(), extra); },
    startChallenge: startChallenge,
    finishChallenge: finishChallenge,
    startJury: startJury,
    finishJury: finishJury,
    renderBeat: renderBeat,
    onJuryTimeUp: function () { reveal(function () { finishJury(); }); },
    runLightShow: runLightShow,
    stopLightShow: stopLightShow,
    reveal: reveal,
    playFinale: playFinale,
    closeFinale: closeFinale
  };
})();
