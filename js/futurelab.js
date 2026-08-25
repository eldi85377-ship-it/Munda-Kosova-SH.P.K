/* =====================================================================
   MUNDA FUTURE LAB — the game core
   The player is a MUNDA design engineer. They build a premium vehicle
   interior through 5 phases:

     DESIGN  -> pick the illuminated textile
     LIGHT   -> choose zones, colour, pattern, brightness, animation,
                drive mode and environment (live on the SVG interior)
     CONNECT -> wire each LED module to its matching controller port
                (mini-game: beams on success, shake on mistakes)
     TEST    -> run 5 automotive tests (light, vibration, temperature,
                durability, energy efficiency) — each pass/fail animated
     SHOWCASE-> THE WOW MOMENT: lights die, the world becomes an arena,
                the cabin illuminates section by section, the MUNDA
                light-logo draws itself, then the MUNDA SCORE is revealed.

   Dependencies are used DEFENSIVELY (may be missing during development):
     Interior (interior.js), Lab (lab.js), Game (game.js),
     Progress (progress.js), Sound (audio.js), FX (fx.js), I18N (i18n.js)
   ===================================================================== */
(function () {
  'use strict';

  /* ---------- tiny helpers ---------- */
  function $(id) { return document.getElementById(id); }
  function qs(sel, root) { return (root || document).querySelector(sel); }
  function qsa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function t(key, fb) { return window.I18N ? I18N.t(key, fb) : (fb != null ? fb : key); }
  function safe(fn) { try { fn(); } catch (e) { if (window.console) console.warn('futurelab:', e); } }
  function sfx(n) { if (window.Sound) safe(function () { Sound.sfx(n); }); }
  function music(n) { if (window.Sound) safe(function () { Sound.music(n); }); }
  function stopMusic(f) { if (window.Sound) safe(function () { Sound.stopMusic(f); }); }
  function duck(a, ms) { if (window.Sound) safe(function () { Sound.duck(a, ms); }); }
  function burstAt(el, o) { if (window.FX) safe(function () { FX.burstAt(el, o); }); }
  function floatAt(el, txt, o) { if (window.FX) safe(function () { FX.floatTextAt(el, txt, o); }); }
  function isUnlocked(id) {
    if (!id) return true;
    if (window.Progress) return !!Progress.isUnlocked(id);
    return false;
  }

  /* ---------- i18n for dynamic game text ---------- */
  if (window.I18N) {
    I18N.register({
      en: {
        't.light': 'LIGHT OUTPUT', 't.vibration': 'VIBRATION', 't.temperature': 'TEMPERATURE',
        't.durability': 'DURABILITY', 't.energy': 'ENERGY EFFICIENCY',
        'test.pass': 'PASS', 'test.fail': 'FAIL', 'test.running': 'RUNNING TEST…',
        'wire.port': 'PORT', 'wire.linked': 'LINKED', 'wire.mistakes': 'MISTAKES',
        'cin.tag': 'LIGHTING THE FUTURE OF MOBILITY',
        'time.up': "TIME'S UP — SHOWCASING YOUR DESIGN",
        'score.youBuilt': 'YOU BUILT THE FUTURE', 'score.nearly': 'A SOLID PROTOTYPE',
        'score.failed': 'THE SYSTEM NEEDS WORK',
        'rew.xp': 'XP EARNED', 'rew.coins': 'CREDITS', 'rew.rank': 'NEW RANK',
        'lb.empty': 'No builds yet — be the first engineer on the board.'
      },
      sq: {
        't.light': 'DALJE DRITE', 't.vibration': 'DRIDHJE', 't.temperature': 'TEMPERATURE',
        't.durability': 'QENDRUESHMERI', 't.energy': 'EFICENCE ENERGJIE',
        'test.pass': 'KALUAR', 'test.fail': 'DESHTUAR', 'test.running': 'TESTIM…',
        'wire.port': 'PORT', 'wire.linked': 'LIDHUR', 'wire.mistakes': 'GABIME',
        'cin.tag': 'NDRICOJMË TË ARDHMEN E LËVIZJES',
        'time.up': 'KOHA MBI — PREZANTOHET DIZAJNI YT',
        'score.youBuilt': 'TI E NDËRTOVE TË ARDHMEN', 'score.nearly': 'NJË PROTOTIP I FORTË',
        'score.failed': 'SISTEMI KA NEVOJË PËR PUNË',
        'rew.xp': 'XP E FITUAR', 'rew.coins': 'KREDITET', 'rew.rank': 'RANK I RI',
        'lb.empty': 'Ende asnjë ndërtim — bëhu inxhinieri i parë në tabelë.'
      }
    });
  }

  /* ---------- run state ---------- */
  var run = null;      // active build
  var phase = 'design';
  var phaseIndex = 0;
  var PHASES = ['design', 'light', 'connect', 'test', 'showcase'];
  var timerInterval = null;
  var timerStart = 0;
  var wire = { selected: null, done: 0, mistakes: 0, total: 6, pairs: [], ports: [] };
  var tests = [];      // results of the 5 tests
  var lastScore = null;
  var cineRunning = false;
  var testRunning = false;
  var testIdx = 0;
  var TEST_DEFS = [
    { id: 'light',      name: 't.light' },
    { id: 'vibration',  name: 't.vibration' },
    { id: 'temperature', name: 't.temperature' },
    { id: 'durability', name: 't.durability' },
    { id: 'energy',     name: 't.energy' }
  ];
  var RANKS_FALLBACK = [
    { id: 'rookie', name: 'ROOKIE', min: 0, max: 39, color: '#8b93a7', blurb: 'Every legend starts here.' },
    { id: 'engineer', name: 'ENGINEER', min: 40, max: 59, color: '#4df3ff', blurb: 'You understand the craft.' },
    { id: 'designer', name: 'DESIGNER', min: 60, max: 74, color: '#2d6bff', blurb: 'Light becomes a language.' },
    { id: 'senior', name: 'SENIOR ENGINEER', min: 75, max: 89, color: '#9a4dff', blurb: 'Precision is your signature.' },
    { id: 'master', name: 'MUNDA MASTER', min: 90, max: 99, color: '#ffc861', blurb: 'The industry would hire you.' },
    { id: 'architect', name: 'FUTURE ARCHITECT', min: 100, max: 100, color: '#ff4d8d', blurb: 'You built the future itself.' }
  ];
  var MAT_DUR = { carbon: 88, knit: 72, mesh: 82, silk: 64 };
  var MAT_EFF = { carbon: 74, knit: 80, mesh: 88, silk: 70 };
  var MODE_EFF = { city: 82, sport: 52, night: 88, eco: 96 };
  var COLOR_HARMONY = { red: 78, blue: 85, cyan: 92, purple: 88, green: 80, gold: 90, white: 68, gradient: 96 };
  var PATTERN_SCORE = { linear: 70, wave: 82, flow: 86, pulse: 74, dots: 80, dynamic: 93, custom: 90 };
  var ENVS = ['city', 'tunnel', 'showroom', 'night-city', 'arena'];

  /* =====================================================================
     BOOT — one screen, one button: PLAY
     Open the game → short intro → PLAY → straight into Challenge 1.
     ===================================================================== */
  function bootInit() {
    var start = $('boot-start'), name = $('boot-name');
    if (!start || !name) return;
    // pre-fill from saved player; default ENGINEER so the button always works
    if (window.Progress) {
      var d = Progress.data;
      if (d && d.player) name.value = d.player;
    }
    if (!name.value) name.value = 'ENGINEER';
    name.addEventListener('keydown', function (e) { if (e.key === 'Enter') start.click(); });
    start.addEventListener('click', function () {
      sfx('select');
      var val = name.value.trim() || 'ENGINEER';
      if (window.Progress) safe(function () { Progress.setPlayer(val.slice(0, 14)); });
      if (window.Sound) safe(function () { Sound.unlock(); });
      startBuild();          // straight into Challenge 1 (DESIGN phase, 1:30 clock)
      maybeTutorial();       // 3-step quick start, first time only
    });
  }

  /* Quick 3-step tutorial overlay (first build only) */
  function maybeTutorial() {
    var seen = false;
    try { seen = localStorage.getItem('munda_tutorial') === '1'; } catch (e) {}
    if (seen) return;
    var tut = $('tutorial');
    if (!tut) return;
    stopTimer(); // the 1:30 clock waits for the player to read
    tut.hidden = false;
    sfx('reveal');
    if (window.FX) safe(function () {
      FX.burst(window.innerWidth / 2, window.innerHeight * 0.3,
        { count: 28, colors: ['#2d6bff', '#4df3ff', '#ffc861'], speed: 3.2 });
    });
    var go = $('tut-go');
    if (go) go.addEventListener('click', function () {
      sfx('achievement');
      tut.hidden = true;
      try { localStorage.setItem('munda_tutorial', '1'); } catch (e) {}
      startTimer(); // clock starts — the challenge begins now
      if (window.FX) safe(function () {
        FX.confetti({ count: 70, colors: ['#2d6bff', '#4df3ff', '#ffc861'] });
      });
    });
  }

  /* =====================================================================
     HUD + HUB (career) rendering — reads Progress defensively
     ===================================================================== */
  function refreshHUD() {
    var s = null;
    if (window.Progress) safe(function () { s = Progress.summary(); });
    if (!s) return;
    var name = s.player || 'ENGINEER';
    var setText = function (id, v) { var el = $(id); if (el) el.textContent = v; };
    setText('hud-name', name.toUpperCase());
    setText('hud-avatar', (name.charAt(0) || 'E').toUpperCase());
    setText('hud-level', s.level);
    setText('hud-xp-text', s.into + ' / ' + s.need + ' XP');
    var fill = $('hud-xp-fill'); if (fill) fill.style.width = (s.pct || 0) + '%';
    setText('hud-coins', s.coins);
    var rank = s.rank || { name: 'ROOKIE', id: 'rookie' };
    var hudRank = $('hud-rank');
    if (hudRank) { hudRank.textContent = rank.name; hudRank.setAttribute('data-rank', rank.id || 'rookie'); }
    // hub card
    setText('hub-player', name.toUpperCase());
    setText('hub-avatar', (name.charAt(0) || 'E').toUpperCase());
    setText('hub-level', s.level);
    var hf = $('hub-xpfill'); if (hf) hf.style.width = (s.pct || 0) + '%';
    setText('hub-xptext', s.into + ' / ' + s.need + ' XP');
    var hubRank = $('hub-rank');
    if (hubRank) { hubRank.textContent = rank.name; hubRank.setAttribute('data-rank', rank.id || 'rookie'); }
    setText('hub-best', s.bestScore != null && s.bestScore > 0 ? s.bestScore + '%' : '—');
    setText('hub-builds', s.totalRuns || 0);
    setText('hub-credits', s.coins || 0);
    setText('hub-badges', s.achievementCount || 0);
  }

  function rankLadder() {
    if (window.Progress) return Progress.RANKS || RANKS_FALLBACK;
    return RANKS_FALLBACK;
  }

  function renderLadder() {
    var el = $('ladder');
    if (!el) return;
    var ladder = rankLadder();
    var lvl = 1, career = null;
    if (window.Progress) safe(function () {
      lvl = Progress.level || 1;
      career = Progress.rankForLevel(lvl);
    });
    el.innerHTML = '';
    ladder.forEach(function (r) {
      var active = career && career.id === r.id;
      var item = document.createElement('div');
      item.className = 'ladder-item' + (active ? '' : ' locked');
      item.setAttribute('data-rank', r.id || 'rookie');
      item.innerHTML =
        '<span class="li-dot"></span>' +
        '<span class="li-name">' + esc(r.name) + '</span>' +
        '<span class="li-range">' + r.min + '–' + r.max + '</span>' +
        '<span class="li-state">' + (active ? '✓' : '🔒') + '</span>';
      el.appendChild(item);
    });
  }

  function renderMissions() {
    var el = $('hub-missions');
    if (!el) return;
    if (!window.Progress) { el.innerHTML = '<p class="muted">Progress system loading…</p>'; return; }
    var list = Progress.MISSIONS || [];
    el.innerHTML = '';
    list.forEach(function (m) {
      var rec = null;
      safe(function () { rec = Progress.missionProgress(m.id); });
      var cur = rec ? rec.value : 0;
      var pct = rec ? rec.pct : 0;
      var done = !!(rec && rec.value >= m.goal);
      var row = document.createElement('div');
      row.className = 'mission' + (done ? ' done' : '');
      row.innerHTML =
        '<span class="mi-ico">' + (done ? '✓' : '▶') + '</span>' +
        '<span class="mi-body"><b>' + esc(m.name) + '</b><span class="mi-bar"><i style="width:' + pct + '%"></i></span>' +
        '<span class="mi-meta">' + cur + '/' + m.goal + ' · +' + m.xp + ' XP</span></span>';
      el.appendChild(row);
    });
  }

  function renderLeaderboard() {
    var el = $('hub-leaderboard');
    if (!el) return;
    if (!window.Progress) { el.innerHTML = '<p class="muted">Leaderboard loading…</p>'; return; }
    var rows = Progress.leaderboard(8) || [];
    el.innerHTML = '';
    if (!rows.length) {
      el.innerHTML = '<p class="muted">' + esc(t('lb.empty')) + '</p>';
      return;
    }
    rows.forEach(function (r) {
      var rank = r.rank || {};
      var row = document.createElement('div');
      row.className = 'lb-row';
      row.innerHTML =
        '<span class="lb-pos">' + (r.place || '') + '</span>' +
        '<span class="lb-name">' + esc(r.player || 'ENGINEER') + '</span>' +
        '<span class="lb-rank" data-rank="' + esc(rank.id || 'rookie') + '">' + esc(rank.name || '') + '</span>' +
        '<span class="lb-score">' + (r.score || 0) + '%</span>';
      el.appendChild(row);
    });
  }

  function renderAchievements() {
    var el = $('hub-achievements');
    if (!el) return;
    if (!window.Progress) { el.innerHTML = '<p class="muted">Achievements loading…</p>'; return; }
    var cats = Progress.ACHIEVEMENTS || [];
    var have = Progress.data ? Progress.data.achievements || {} : {};
    el.innerHTML = '';
    cats.forEach(function (a) {
      var done = !!have[a.id];
      var card = document.createElement('div');
      card.className = 'ach-card' + (done ? ' done' : '');
      card.innerHTML =
        '<span class="ac-ico">' + (done ? (a.icon || '★') : '?') + '</span>' +
        '<span class="ac-body"><b>' + esc(a.name) + '</b><i>' + esc(a.desc) + '</i></span>' +
        '<span class="ac-xp">+' + (a.xp || 0) + '</span>';
      el.appendChild(card);
    });
  }

  function renderUnlocks() {
    var el = $('hub-unlocks');
    if (!el) return;
    if (!window.Progress) { el.innerHTML = '<p class="muted">Unlockables loading…</p>'; return; }
    var cats = Progress.UNLOCKS || [];
    var open = Progress.data ? Progress.data.unlocks || {} : {};
    el.innerHTML = '';
    cats.forEach(function (u) {
      var unlocked = !!open[u.id];
      var card = document.createElement('div');
      card.className = 'unlock-card' + (unlocked ? ' done' : '');
      card.innerHTML =
        '<span class="uc-type">' + esc(u.type) + '</span>' +
        '<b>' + esc(u.name) + '</b>' +
        '<i>' + esc(u.desc) + '</i>' +
        '<span class="uc-req">' + (unlocked ? '✓' : 'LV ' + (u.level || 1)) + '</span>';
      el.appendChild(card);
    });
  }

  function renderHub() {
    refreshHUD();
    renderLadder();
    renderMissions();
    renderLeaderboard();
    renderAchievements();
    renderUnlocks();
    refreshLockUI();
  }

  /* =====================================================================
     LOCKED CONTENT (unlocks) — block clicks, show lock state
     ===================================================================== */
  function refreshLockUI() {
    qsa('[data-unlock]').forEach(function (el) {
      var id = el.getAttribute('data-unlock');
      var open = isUnlocked(id);
      el.classList.toggle('is-locked', !open);
      el.classList.toggle('is-open', open);
    });
  }

  function lockInterceptor(e) {
    var el = e.target.closest('[data-unlock]');
    if (!el) return;
    if (isUnlocked(el.getAttribute('data-unlock'))) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    sfx('error');
    if (window.FX) safe(function () { FX.shake(6, 300); });
    var msg = t('lock.msg', 'Unlock this by reaching the required level.');
    if (window.FX) safe(function () { FX.floatTextAt(el, '🔒 ' + msg, { color: '#ff2d55', size: 13 }); });
  }

  /* =====================================================================
     SCREEN NAVIGATION (defers to App when present)
     ===================================================================== */
  function goScreen(id) {
    if (window.App) { App.go(id); return; }
    qsa('.screen').forEach(function (s) {
      s.classList.toggle('active', s.getAttribute('data-screen') === id);
    });
    document.body.dataset.screen = id;
  }

  /* =====================================================================
     THE BUILD — phase machine
     ===================================================================== */
  function startBuild() {
    if (window.Interior) safe(function () {
      Interior.reset({
        zones: { dashboard: true, roof: true, doors: false, console: false, footwell: false, seats: false },
        color: 'blue', pattern: 'linear', brightness: 70, animation: 'static',
        speed: 'medium', material: 'carbon', mode: 'city'
      });
    });
    run = { phaseTimes: {}, start: Date.now(), env: 'city' };
    phase = 'design';
    phaseIndex = 0;
    tests = [];
    lastScore = null;
    wireReset();
    setEnv('city');
    hideOverlays();
    stopMusic(300);
    music('lab');
    startTimer();
    setPhase(0);
    goScreen('build');
    sfx('whoosh');
  }

  function setPhase(idx) {
    idx = clamp(idx, 0, PHASES.length - 1);
    phaseIndex = idx;
    phase = PHASES[idx];
    if (run) run.phaseTimes[phase] = Date.now();

    qsa('.phase-pane').forEach(function (p) {
      p.classList.toggle('active', p.getAttribute('data-pane') === phase);
    });
    qsa('.pstep').forEach(function (s) {
      var i = PHASES.indexOf(s.getAttribute('data-phase'));
      s.classList.toggle('active', i === idx);
      s.classList.toggle('done', i < idx);
    });
    document.body.classList.toggle('phase-showcase', phase === 'showcase');
    document.body.classList.toggle('phase-test', phase === 'test');

    var back = $('btn-phase-back'), next = $('btn-phase-next');
    if (back) back.disabled = idx === 0;
    if (next) {
      next.hidden = idx === PHASES.length - 1;
      next.disabled = idx === 3; // TEST advances itself
    }
    var chip = $('brief-chip');
    if (chip) chip.textContent = (idx + 1) + ' / ' + PHASES.length + ' · ' + t('phase.' + phase, phase.toUpperCase());

    if (phase === 'design') buildZoneButtons();
    if (phase === 'connect') wireBuild();
    if (phase === 'test') renderTestList();
    if (phase === 'showcase') renderShowcasePreview();
  }

  function nextPhase() {
    if (phaseIndex < PHASES.length - 1) { setPhase(phaseIndex + 1); sfx('select'); }
  }
  function prevPhase() {
    if (phaseIndex > 0) { setPhase(phaseIndex - 1); sfx('back'); }
  }

  /* ---------- build timer: 1:30 challenge ---------- */
  var BUILD_TIME = 90; // the whole build lasts 1 minute 30 seconds

  function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    var end = Date.now() + BUILD_TIME * 1000;
    timerInterval = setInterval(function () {
      var el = $('build-timer');
      var remaining = Math.max(0, Math.ceil((end - Date.now()) / 1000));
      if (el) {
        el.textContent = (remaining < 10 ? '0' : '') + Math.floor(remaining / 60) + ':' +
          (remaining % 60 < 10 ? '0' : '') + (remaining % 60);
        el.classList.toggle('warn', remaining <= 15);
      }
      if (remaining <= 0) {
        clearInterval(timerInterval); timerInterval = null;
        buildTimeUp();
      }
    }, 250);
    var el = $('build-timer');
    if (el) { el.textContent = '01:30'; el.classList.remove('warn'); }
  }
  function stopTimer() { if (timerInterval) { clearInterval(timerInterval); timerInterval = null; } }
  function runSeconds() { return Math.round((Date.now() - (run ? run.start : Date.now())) / 1000); }

  /* time is up — present whatever the engineer managed to build */
  function buildTimeUp() {
    if (cineRunning || testRunning) return;
    sfx('impact');
    if (window.FX) safe(function () {
      FX.floatText(window.innerWidth / 2, window.innerHeight * 0.4,
        t('time.up', "TIME'S UP — SHOWCASING YOUR DESIGN"), { color: '#ffc861', size: 26, duration: 2000 });
      FX.flash('rgba(255,200,97,0.12)', 500);
    });
    if (window.Progress) safe(function () { Progress.trackEvent('time', { seconds: BUILD_TIME }); });
    if (phaseIndex < 4) setPhase(4);
    setTimeout(function () { beginShowcase(); }, 1800);
  }

  /* per-phase durations (seconds) from the recorded phase-entry stamps */
  function phaseDurations() {
    var out = {};
    if (!run || !run.phaseTimes) return out;
    var names = PHASES;
    var nowMs = Date.now();
    for (var i = 0; i < names.length; i++) {
      var a = run.phaseTimes[names[i]];
      var b = run.phaseTimes[names[i + 1]] || nowMs;
      if (a) out[names[i]] = Math.max(0, Math.round((b - a) / 1000));
    }
    return out;
  }

  /* ---------- zone buttons ---------- */
  function buildZoneButtons() {
    var c = $('build-zones');
    if (!c || !window.Interior) return;
    c.innerHTML = '';
    Interior.ZONES.forEach(function (z) {
      var b = document.createElement('button');
      b.className = 'zone-btn';
      b.setAttribute('data-zone', z);
      b.innerHTML = '<i></i>' + esc(Interior.zoneLabel(z) || z);
      c.appendChild(b);
    });
    if (window.Interior) Interior.syncControls();
  }

  function zoneCounter() {
    var el = $('zone-counter');
    if (!el || !window.Interior) return;
    var st = Interior.state || {};
    var z = st.zones || {};
    var n = 0, k;
    for (k in z) if (z[k]) n++;
    el.textContent = n + '/6';
  }

  /* =====================================================================
     ENVIRONMENT
     ===================================================================== */
  function setEnv(name, animate) {
    if (!name) name = 'city';
    var env = qs('#environment');
    if (!env) return;
    env.setAttribute('data-env', name);
    var sky = $('env-sky');
    var map = { city: 'url(#env-city)', tunnel: 'url(#env-tunnel)', showroom: 'url(#env-showroom)', 'night-city': 'url(#env-city)', arena: 'url(#env-arena)' };
    if (sky && map[name]) sky.setAttribute('fill', map[name]);
    qsa('.env-set').forEach(function (g) {
      g.style.display = g.id === 'env-' + name + '-g' ? '' : 'none';
    });
    if (name === 'arena') {
      // darker world + purple sweep for the finals
      qsa('.env-set').forEach(function () {});
    }
    if (animate && window.FX) safe(function () { FX.flash('rgba(45,107,255,0.14)', 600); });
    qsa('#env-chips .chip').forEach(function (c) {
      c.classList.toggle('active', c.getAttribute('data-env') === name);
    });
  }

  /* =====================================================================
     WIRING MINI-GAME
     ===================================================================== */
  var WIRE_MODULES = [
    { id: 'DASH-01', port: 'A', label: 'DASHBOARD' },
    { id: 'DOOR-L', port: 'B', label: 'DOOR LEFT' },
    { id: 'DOOR-R', port: 'C', label: 'DOOR RIGHT' },
    { id: 'CONSOLE', port: 'D', label: 'CONSOLE' },
    { id: 'ROOF-01', port: 'E', label: 'ROOF' },
    { id: 'SEAT-01', port: 'F', label: 'SEATS' }
  ];

  function wireReset() {
    wire.selected = null;
    wire.done = 0;
    wire.mistakes = 0;
    wire.total = WIRE_MODULES.length;
    wire.pairs = WIRE_MODULES.map(function (m) { return { module: m.id, port: m.port }; });
    // shuffle ports
    wire.ports = WIRE_MODULES.map(function (m) { return m.port; }).sort(function () { return Math.random() - 0.5; });
    var d = $('wire-done'); if (d) d.textContent = '0';
    var tm = $('wire-total'); if (tm) tm.textContent = wire.total;
    var ms = $('wire-miss'); if (ms) ms.textContent = '0';
    var hint = $('wire-hint'); if (hint) hint.textContent = t('connect.hint', 'Connect each module to its port.');
    var links = $('wire-links'); if (links) links.innerHTML = '';
  }

  function wireBuild() {
    wireReset();
    var svg = $('wire-svg');
    var nodes = $('wire-nodes');
    if (!svg || !nodes) return;
    nodes.innerHTML = '';
    var W = 420, H = 340;
    var leftY = [60, 116, 172, 228, 284, 340].slice(0, wire.total);
    var rightY = [60, 116, 172, 228, 284, 340].slice(0, wire.total);

    var pairMap = {};
    wire.pairs.forEach(function (p) { pairMap[p.port] = p.module; });

    wire.ports.forEach(function (port, i) {
      var g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('class', 'wire-node port');
      g.setAttribute('data-kind', 'port');
      g.setAttribute('data-port', port);
      g.setAttribute('data-linked', 'false');
      g.setAttribute('tabindex', '0');
      g.setAttribute('role', 'button');
      g.setAttribute('aria-label', 'PORT ' + port);
      var cy = rightY[i];
      g.innerHTML =
        '<rect x="300" y="' + (cy - 16) + '" width="92" height="32" rx="9" class="wn-box"/>' +
        '<text x="346" y="' + (cy + 5) + '" text-anchor="middle" class="wn-label">' +
        esc(t('wire.port')) + ' ' + port + '</text>';
      g.style.cursor = 'pointer';
      g.addEventListener('click', wireClick);
      g.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); wireClick({ currentTarget: this }); }
      });
      nodes.appendChild(g);
    });

    wire.pairs.forEach(function (p, i) {
      var g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('class', 'wire-node module');
      g.setAttribute('data-kind', 'module');
      g.setAttribute('data-module', p.module);
      g.setAttribute('data-port', p.port);
      g.setAttribute('data-linked', 'false');
      g.setAttribute('tabindex', '0');
      g.setAttribute('role', 'button');
      g.setAttribute('aria-label', p.module);
      var cy = leftY[i];
      g.innerHTML =
        '<rect x="28" y="' + (cy - 16) + '" width="92" height="32" rx="9" class="wn-box"/>' +
        '<circle cx="44" cy="' + cy + '" r="5" class="wn-led"/>' +
        '<text x="86" y="' + (cy + 5) + '" text-anchor="middle" class="wn-label">' + esc(p.module) + '</text>';
      g.style.cursor = 'pointer';
      g.addEventListener('click', wireClick);
      g.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); wireClick({ currentTarget: this }); }
      });
      nodes.appendChild(g);
    });
  }

  function wireClick(e) {
    var g = e.currentTarget;
    if (g.getAttribute('data-linked') === 'true') return;
    if (g.getAttribute('data-kind') === 'module') {
      if (wire.selected === g) { wire.selected = null; g.classList.remove('selected'); return; }
      if (wire.selected) wire.selected.classList.remove('selected');
      wire.selected = g;
      g.classList.add('selected');
      sfx('hover');
      return;
    }
    // port clicked
    if (!wire.selected) { sfx('error'); return; }
    var moduleNode = wire.selected;
    var modulePort = moduleNode.getAttribute('data-port');
    var port = g.getAttribute('data-port');
    if (modulePort === port) {
      // correct
      moduleNode.setAttribute('data-linked', 'true');
      g.setAttribute('data-linked', 'true');
      moduleNode.classList.add('linked');
      g.classList.add('linked');
      moduleNode.classList.remove('selected');
      wire.selected = null;
      wire.done++;
      var d = $('wire-done'); if (d) d.textContent = wire.done;
      sfx('connect');
      if (window.FX) {
        var mbox = moduleNode.getBBox(), pbox = g.getBBox();
        var x1 = mbox.x + mbox.width, y1 = mbox.y + mbox.height / 2;
        var x2 = pbox.x, y2 = pbox.y + pbox.height / 2;
        var svg = $('wire-svg');
        if (svg) {
          var links = $('wire-links');
          var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          path.setAttribute('d', 'M' + x1 + ' ' + y1 + ' C ' + ((x1 + x2) / 2) + ' ' + y1 + ', ' + ((x1 + x2) / 2) + ' ' + y2 + ', ' + x2 + ' ' + y2);
          path.setAttribute('class', 'wire-beam');
          links.appendChild(path);
        }
        var r = svg.getBoundingClientRect();
        var sx = r.left + r.width * (x1 / 420), sy = r.top + r.height * (y1 / 340);
        var tx = r.left + r.width * (x2 / 420), ty = r.top + r.height * (y2 / 340);
        FX.beam(sx, sy, tx, ty, { color: '#35e07f', life: 700 });
        FX.burst((sx + tx) / 2, (sy + ty) / 2, { count: 14, color: '#35e07f', size: 2.6 });
      }
      floatAt(g, '+' + 1 + ' LINK', { color: '#35e07f', size: 12 });
      if (wire.done >= wire.total) {
        if (window.Progress) safe(function () {
          Progress.trackEvent('wiring', { mistakes: wire.mistakes });
        });
        setTimeout(function () {
          sfx('mission');
          if (window.FX) safe(function () { FX.confetti({ count: 60, colors: ['#35e07f', '#4df3ff', '#2d6bff'] }); });
          nextPhase();
        }, 500);
      }
    } else {
      // wrong
      wire.mistakes++;
      var ms = $('wire-miss'); if (ms) ms.textContent = wire.mistakes;
      sfx('connectFail');
      if (window.FX) safe(function () {
        FX.shake(7, 320);
        FX.flash('rgba(255,45,85,0.16)', 320);
      });
      g.classList.add('shake');
      setTimeout(function () { g.classList.remove('shake'); }, 350);
      floatAt(g, '✕', { color: '#ff2d55', size: 16 });
    }
  }

  /* =====================================================================
     TEST BENCH
     ===================================================================== */
  function testValue(testId) {
    var st = window.Interior ? Interior.state : {};
    var zones = st.zones || {};
    var zc = 0, k;
    for (k in zones) if (zones[k]) zc++;
    var b = st.brightness != null ? st.brightness : 70;
    var mat = st.material || 'carbon';
    var mode = st.mode || 'city';
    switch (testId) {
      case 'light': return clamp(20 + b * 0.5 + zc * 8.3 + (st.pattern && PATTERN_SCORE[st.pattern] ? PATTERN_SCORE[st.pattern] * 0.08 : 0), 0, 100);
      case 'vibration': return clamp(MAT_DUR[mat] - wire.mistakes * 4 + (st.animation === 'dynamic' ? -4 : 0), 0, 100);
      case 'temperature': return clamp(100 - (b * 0.34 + zc * 4.5), 0, 100);
      case 'durability': return clamp(MAT_DUR[mat] + (zc >= 4 ? -6 : 0) + (wire.mistakes ? -wire.mistakes * 3 : 4), 0, 100);
      case 'energy': return clamp(MODE_EFF[mode] - b * 0.16 + (mat === 'mesh' ? 4 : 0), 0, 100);
    }
    return 50;
  }
  function testPassThreshold(id) {
    return { light: 55, vibration: 60, temperature: 58, durability: 62, energy: 55 }[id] || 55;
  }

  function renderTestList() {
    var el = $('test-list');
    if (!el) return;
    el.innerHTML = '';
    TEST_DEFS.forEach(function (td) {
      var v = Math.round(testValue(td.id));
      var th = testPassThreshold(td.id);
      var row = document.createElement('div');
      row.className = 'test-row';
      row.setAttribute('data-test', td.id);
      row.innerHTML =
        '<span class="tr-name">' + esc(t(td.name)) + '</span>' +
        '<span class="tr-track"><i style="width:' + v + '%"></i></span>' +
        '<b class="tr-val">' + v + '</b>' +
        '<span class="tr-stamp"></span>';
      el.appendChild(row);
    });
    var note = $('test-note');
    if (note) note.hidden = false;
    var btn = $('btn-run-tests');
    if (btn) btn.disabled = false;
  }

  function runTests() {
    var btn = $('btn-run-tests');
    if (!btn || btn.disabled || testRunning) return;
    testRunning = true;
    testIdx = 0;
    btn.disabled = true;
    sfx('whoosh');
    music('tension');
    runTestStep();
  }

  function runTestStep() {
    var rows = qsa('.test-row');
    if (testIdx >= TEST_DEFS.length) {
      testRunning = false;
      setTimeout(function () { finishTests(); }, 400);
      return;
    }
    var td = TEST_DEFS[testIdx];
    var row = qsa('.test-row[data-test="' + td.id + '"]')[0];
    if (!row) { testIdx++; runTestStep(); return; }
    row.classList.add('running');
    var stamp = qs('.tr-stamp', row);
    var valEl = qs('.tr-val', row);
    var fill = qs('.tr-track i', row);
    var target = Math.round(testValue(td.id));
    var th = testPassThreshold(td.id);
    var start = 0;
    var t0 = Date.now();
    sfx('test');
    var iv = setInterval(function () {
      var p = Math.min(1, (Date.now() - t0) / 1500);
      var v = Math.round(start + (target - start) * (1 - Math.pow(1 - p, 3)));
      if (valEl) valEl.textContent = v;
      if (fill) fill.style.width = v + '%';
      if (p >= 1) {
        clearInterval(iv);
        var pass = target >= th;
        tests.push({ id: td.id, value: target, threshold: th, pass: pass });
        row.classList.remove('running');
        row.classList.add(pass ? 'pass' : 'fail');
        if (stamp) stamp.textContent = t(pass ? 'test.pass' : 'test.fail');
        sfx(pass ? 'testPass' : 'testFail');
        if (pass && window.FX) safe(function () { FX.burstAt(row, { count: 16, color: '#35e07f', size: 2.4 }); });
        if (!pass && window.FX) safe(function () { FX.shake(4, 250); });
        testIdx++;
        setTimeout(runTestStep, pass ? 480 : 700);
      }
    }, 30);
  }

  function finishTests() {
    sfx('select');
    var passed = tests.filter(function (x) { return x.pass; }).length;
    var note = $('test-note');
    if (note) {
      note.textContent = passed + ' / 5 tests passed.';
    }
    // track stats for achievements
    if (window.Progress) safe(function () {
      Progress.trackEvent('tests', { passed: passed, total: TEST_DEFS.length });
    });
    setTimeout(function () { setPhase(4); sfx('whoosh'); }, 800);
  }

  /* =====================================================================
     MUNDA SCORE ENGINE
     ===================================================================== */
  function computeScore() {
    var st = window.Interior ? Interior.state : {};
    var zones = st.zones || {};
    var zc = 0, k;
    for (k in zones) if (zones[k]) zc++;
    var b = st.brightness != null ? st.brightness : 70;
    var mat = st.material || 'carbon';
    var mode = st.mode || 'city';
    var color = st.color || 'blue';
    var pattern = st.pattern || 'linear';
    var anim = st.animation || 'static';

    var testsPassed = tests.filter(function (x) { return x.pass; }).length;

    var lighting = clamp(
      22 + b * 0.34 + zc * 4.6 +
      (COLOR_HARMONY[color] || 80) * 0.12 +
      (PATTERN_SCORE[pattern] || 70) * 0.1,
      0, 100);

    var precision = clamp(
      96 - wire.mistakes * 14 +
      (wire.mistakes === 0 ? 4 : 0) +
      (anim === 'dynamic' ? -3 : 0),
      0, 100);

    var efficiency = clamp(
      (MODE_EFF[mode] || 82) - b * 0.14 +
      (mat === 'mesh' ? 5 : 0) + (mode === 'eco' ? 4 : 0) +
      (testsPassed >= 5 ? 3 : 0),
      0, 100);

    var durability = clamp(
      MAT_DUR[mat] - wire.mistakes * 2 +
      (testsPassed >= 5 ? 5 : testsPassed >= 3 ? 2 : 0) +
      (mat === 'carbon' ? 3 : 0),
      0, 100);

    var design = clamp(
      (COLOR_HARMONY[color] || 80) * 0.22 +
      (PATTERN_SCORE[pattern] || 70) * 0.2 +
      (anim === 'dynamic' ? 9 : anim !== 'static' ? 5 : 0) +
      zc * 3.2 +
      (mat !== 'carbon' ? 4 : 0) +
      (zc >= 4 ? 3 : 0),
      0, 100);

    var total = Math.round(lighting * 0.24 + precision * 0.20 + efficiency * 0.18 + durability * 0.18 + design * 0.20);
    total = clamp(total, 0, 100);

    return {
      total: total,
      sub: { lighting: Math.round(lighting), precision: Math.round(precision), efficiency: Math.round(efficiency), durability: Math.round(durability), design: Math.round(design) },
      tests: tests, testsPassed: testsPassed, mistakes: wire.mistakes
    };
  }

  function rankForScore(score) {
    if (window.Progress) { var r = Progress.rankForScore(score); if (r) return r; }
    var l = RANKS_FALLBACK.filter(function (x) { return score >= x.min && score <= x.max; });
    return l[0] || RANKS_FALLBACK[0];
  }

  /* =====================================================================
     SHOWCASE PREVIEW (phase 5)
     ===================================================================== */
  function renderShowcasePreview() {
    var el = $('sc-preview');
    if (!el) return;
    var st = window.Interior ? Interior.state : {};
    var color = '#2d6bff';
    if (window.Interior) color = Interior.SOLID[st.color] || '#2d6bff';
    var zc = 0, k;
    var zones = st.zones || {};
    for (k in zones) if (zones[k]) zc++;
    el.innerHTML =
      '<svg viewBox="0 0 200 90" class="sc-mini" aria-hidden="true">' +
      '<rect x="6" y="8" width="188" height="74" rx="12" fill="#0a0b10" stroke="rgba(255,255,255,0.08)"/>' +
      '<path d="M24 16 Q100 8 176 16" fill="none" stroke="' + (zones.roof ? color : '#22242c') + '" stroke-width="6" stroke-linecap="round" opacity="' + (zones.roof ? 0.9 : 0.35) + '"/>' +
      '<path d="M24 46 Q100 42 176 46" fill="none" stroke="' + (zones.dashboard ? color : '#22242c') + '" stroke-width="5" stroke-linecap="round" opacity="' + (zones.dashboard ? 0.9 : 0.35) + '"/>' +
      '<path d="M16 26 V74 M184 26 V74" fill="none" stroke="' + (zones.doors ? color : '#22242c') + '" stroke-width="4" opacity="' + (zones.doors ? 0.9 : 0.35) + '"/>' +
      '<path d="M94 40 V76" fill="none" stroke="' + (zones.console ? color : '#22242c') + '" stroke-width="4" opacity="' + (zones.console ? 0.9 : 0.35) + '"/>' +
      '<rect x="46" y="18" width="22" height="16" rx="6" fill="' + (zones.seats ? color : '#1a1c22') + '" opacity="0.7"/>' +
      '<rect x="132" y="18" width="22" height="16" rx="6" fill="' + (zones.seats ? color : '#1a1c22') + '" opacity="0.7"/>' +
      '<ellipse cx="100" cy="84" rx="80" ry="6" fill="' + (zones.footwell ? color : '#14161c') + '" opacity="0.5"/>' +
      '</svg>' +
      '<span class="sc-count">' + zc + ' / 6 ' + t('phase.light', 'ZONES') + '</span>';
  }

  /* =====================================================================
     THE WOW MOMENT — FINAL SHOWCASE CINEMATIC
     ===================================================================== */
  function beginShowcase() {
    if (cineRunning) return;
    cineRunning = true;
    document.body.classList.add('cine-on');
    stopTimer();

    var cine = $('cine');
    var caption = $('cine-caption');
    var brand = $('cine-brand');
    var veil = $('cine-veil');
    if (cine) cine.hidden = false;
    if (brand) brand.style.opacity = '0';
    if (caption) caption.textContent = '';

    // audio: darken the world
    if (window.Sound) safe(function () { Sound.duck(0.15, 1200); });
    stopMusic(600);

    // visual slow-mo + letterbox
    if (window.FX) safe(function () { FX.letterbox(true); FX.slowmo(true); });

    // 1) fade everything out
    if (window.Interior) safe(function () {
      Interior.setZones({ dashboard: false, doors: false, console: false, footwell: false, seats: false, roof: false });
      Interior.setState('brightness', 0);
    });
    setEnv('arena');

    // zones light up one by one during the reveal
    var target = { dashboard: false, doors: false, console: false, footwell: false, seats: false, roof: false };

    var step = 0;
    var SEQ = [
      { at: 0, fn: function () { sfx('whoosh'); if (veil) veil.style.opacity = '1'; } },
      { at: 900, fn: function () { sfx('impact'); } },
      { at: 1500, fn: function () { if (caption) caption.textContent = '3'; sfx('countdown'); } },
      { at: 2300, fn: function () { if (caption) caption.textContent = '2'; sfx('countdown'); } },
      { at: 3100, fn: function () { if (caption) caption.textContent = '1'; sfx('countdown'); } },
      { at: 3900, fn: function () {
        if (caption) caption.textContent = '';
        if (veil) veil.style.opacity = '0';
        music('cinematic');
        if (window.Sound) safe(function () { Sound.crowd(true, 0.5); });
        sfx('reveal');
        illuminateZones(0);
      } }
    ];
    var maxT = 3900 + 6 * 900 + 2200;

    function illuminateZones(i) {
      var order = ['dashboard', 'doors', 'console', 'footwell', 'seats', 'roof'];
      if (i >= order.length) {
        drawLogo();
        return;
      }
      var z = order[i];
      if (window.Interior) safe(function () {
        target[z] = true;
        Interior.setZones(target);
        Interior.setState('brightness', Math.min(100, 25 + i * 15));
      });
      sfx('led');
      if (window.FX) safe(function () {
        var el = qs('#lights [data-zone="' + z + '"]');
        if (el) FX.burstAt(el, { count: 22, color: '#4df3ff', size: 2.6, spread: 1.4, speed: 2 });
      });
      setTimeout(function () { illuminateZones(i + 1); }, 820);
    }

    function drawLogo() {
      var logo = $('sc-logo');
      var path = $('sc-logo-path');
      if (logo) logo.style.opacity = '1';
      if (path) {
        path.style.strokeDasharray = '560';
        path.style.strokeDashoffset = '560';
        path.style.transition = 'stroke-dashoffset 1.6s cubic-bezier(0.22,1,0.36,1)';
        requestAnimationFrame(function () {
          requestAnimationFrame(function () { path.style.strokeDashoffset = '0'; });
        });
      }
      sfx('rank');
      if (window.FX) safe(function () { FX.burst(innerWidth / 2, innerHeight / 2, { count: 90, colors: ['#ffffff', '#4df3ff', '#ffc861'], size: 3, speed: 4 }); });
      setTimeout(function () {
        if (brand) brand.style.opacity = '1';
        setTimeout(function () {
          if (brand) brand.style.opacity = '0';
          if (logo) logo.style.opacity = '0';
          finishShowcase();
        }, 3200);
      }, 900);
    }

    // run the sequence
    SEQ.forEach(function (s) { setTimeout(s.fn, s.at); });
    setTimeout(function () { /* safety */ }, maxT + 200);
  }

  function skipCinematic() {
    if (!cineRunning) return;
    finishShowcase();
  }

  function finishShowcase() {
    if (!cineRunning) return; // guard double
    cineRunning = false;
    document.body.classList.remove('cine-on');
    var cine = $('cine');
    if (cine) { cine.hidden = true; }
    var brand = $('cine-brand'); if (brand) brand.style.opacity = '0';
    var logo = $('sc-logo'); if (logo) logo.style.opacity = '0';
    if (window.FX) safe(function () { FX.letterbox(false); FX.slowmo(false); FX.clear(); });
    if (window.Sound) safe(function () { Sound.crowd(false); });

    // compute + show result
    lastScore = computeScore();
    if (window.Progress) safe(function () {
      Progress.trackEvent('showcase', { watched: true });
    });
    goScreen('result');
    showResult(lastScore);
  }

  /* =====================================================================
     RESULT SCREEN + REWARDS
     ===================================================================== */
  function showResult(sc, opts) {
    opts = opts || {};
    var silent = !!opts.silent;
    var num = $('result-score');
    var arc = $('result-arc');
    var rankEl = $('result-rank');
    var title = $('result-title');

    var rank = rankForScore(sc.total);
    var col = rank.color || '#2d6bff';
    if (title) title.innerHTML = sc.total >= 60
      ? t('score.youBuilt', 'YOU BUILT THE FUTURE')
      : t('score.nearly', 'A SOLID PROTOTYPE');

    if (arc) arc.style.stroke = col;
    if (rankEl) {
      rankEl.setAttribute('data-rank', rank.id || 'rookie');
      var n = qs('.rr-name', rankEl); if (n) n.textContent = rank.name;
      var b = qs('.rr-blurb', rankEl); if (b) b.textContent = rank.blurb || '';
    }

    // count-up animation
    if (num && arc) {
      silentMode = silent;
      num.textContent = '0';
      var C = 540; // 2*pi*86
      arc.style.strokeDasharray = C;
      arc.style.strokeDashoffset = C;
      var t0 = Date.now(), dur = 2200;
      var iv = setInterval(function () {
        var p = Math.min(1, (Date.now() - t0) / dur);
        var v = Math.round(sc.total * (1 - Math.pow(1 - p, 3)));
        num.textContent = v;
        arc.style.strokeDashoffset = C - (C * v / 100);
        if (v > 0 && v % 7 === 0) sfx('scoreTick');
        if (p >= 1) {
          clearInterval(iv);
          onScoreRevealed(sc, rank);
        }
      }, 32);
    } else {
      onScoreRevealed(sc, rank);
    }

    // categories
    var cats = $('result-cats');
    if (cats) {
      var labels = { lighting: 'LIGHTING', precision: 'PRECISION', efficiency: 'EFFICIENCY', durability: 'DURABILITY', design: 'DESIGN' };
      cats.innerHTML = '';
      Object.keys(labels).forEach(function (k) {
        var row = document.createElement('div');
        row.className = 'cat-row';
        row.innerHTML =
          '<span>' + labels[k] + '</span>' +
          '<span class="cat-track"><i style="width:' + sc.sub[k] + '%"></i></span>' +
          '<b>' + sc.sub[k] + '</b>';
        cats.appendChild(row);
      });
    }

    // tests summary
    var tlist = $('result-tests');
    if (tlist) {
      tlist.innerHTML = '';
      tests.forEach(function (x) {
        var chip = document.createElement('span');
        chip.className = 'res-test ' + (x.pass ? 'ok' : 'no');
        chip.textContent = t(x.id === 'light' ? 't.light' : x.id === 'vibration' ? 't.vibration' : x.id === 'temperature' ? 't.temperature' : x.id === 'durability' ? 't.durability' : 't.energy');
        tlist.appendChild(chip);
      });
    }
  }

  var silentMode = false;
  function onScoreRevealed(sc, rank) {
    sfx('reveal');
    music('victory');
    if (window.FX) safe(function () {
      FX.confetti({ count: sc.total >= 90 ? 180 : 90, colors: ['#2d6bff', '#4df3ff', '#ffc861', '#ffffff'] });
      FX.burst(innerWidth / 2, innerHeight * 0.35, { count: 60, colors: ['#ffc861', '#ffffff'], size: 3.4, speed: 3.4 });
    });

    if (silentMode) { renderHub(); return; }

    // Rewards — the progression system pays out the run itself
    // (recordRun awards XP + credits, updates stats, fires munda:levelup /
    //  munda:achievement / munda:mission events automatically).
    var rewardsEl = $('result-rewards');
    var xpG = 0, cG = 0;
    if (window.Progress) safe(function () {
      var xp0 = Progress.data.xp, c0 = Progress.data.coins;
      var st = window.Interior ? Interior.state : {};
      var zones = st.zones || {};
      var zoneList = [], zc = 0, k;
      for (k in zones) if (zones[k]) { zc++; zoneList.push(k); }
      Progress.recordRun({
        score: sc.total, sub: sc.sub,
        phaseTimes: phaseDurations(), duration: runSeconds(),
        testsPassed: sc.testsPassed, zonesUsed: zc,
        material: st.material || 'carbon',
        night: st.mode === 'night',
        player: Progress.data.player || 'ENGINEER',
        ts: Date.now()
      });
      Progress.trackEvent('zones', { list: zoneList, zonesUsed: zc });
      if (st.mode === 'night') Progress.trackEvent('night', {});
      xpG = Progress.data.xp - xp0;
      cG = Progress.data.coins - c0;
    });
    if (rewardsEl) {
      rewardsEl.innerHTML =
        '<span class="rew-item">⚡ +' + xpG + ' XP</span>' +
        '<span class="rew-item">◈ +' + cG + ' CREDITS</span>' +
        '<span class="rew-item">🏆 ' + esc(rank.name) + '</span>';
    }
    if (window.FX && xpG > 0) safe(function () { FX.floatTextAt($('result-score') || document.body, '+' + xpG + ' XP', { color: '#ffc861', size: 22 }); });
    renderHub();
  }

  /* =====================================================================
     PROGRESS UI EVENTS (level-up card, reward pop, HUD refresh)
     ===================================================================== */
  function showLevelUp(res) {
    var card = $('levelup');
    if (!card) return;
    $('lu-level').textContent = res.level;
    var rankEl = $('lu-rank');
    rankEl.textContent = (res.rank && res.rank.name) || 'ENGINEER';
    rankEl.setAttribute('data-rank', (res.rank && res.rank.id) || 'engineer');
    var unlocksEl = $('lu-unlocks');
    if (unlocksEl) {
      unlocksEl.innerHTML = '';
      (res.unlocks || []).forEach(function (u) {
        var s = document.createElement('span');
        s.className = 'lu-unlock';
        s.textContent = '✦ ' + u.name;
        unlocksEl.appendChild(s);
      });
    }
    card.hidden = false;
    sfx('levelup');
    if (window.FX) safe(function () { FX.confetti({ count: 120, colors: ['#ffc861', '#4df3ff', '#2d6bff'] }); });
  }

  function showRewardPop(icon, title, desc, xp) {
    var pop = $('reward-pop');
    if (!pop) return;
    $('rp-icon').textContent = icon;
    $('rp-title').textContent = title;
    $('rp-desc').textContent = desc;
    var x = $('rp-xp');
    if (x) x.textContent = xp ? '+' + xp + ' XP' : '';
    pop.hidden = false;
    pop.classList.remove('show');
    void pop.offsetWidth;
    pop.classList.add('show');
    clearTimeout(pop._t);
    pop._t = setTimeout(function () { pop.classList.remove('show'); }, 2600);
  }

  /* =====================================================================
     AUDIO SETTINGS PANEL
     ===================================================================== */
  function initAudioPanel() {
    var btn = $('btn-audio'), panel = $('audio-panel'), close = $('audio-close');
    if (!btn || !panel) return;
    btn.addEventListener('click', function () {
      sfx('click');
      panel.hidden = !panel.hidden;
    });
    if (close) close.addEventListener('click', function () { panel.hidden = true; sfx('back'); });

    var st = window.Sound ? Sound.state() : null;
    if (st) {
      $('vol-master').value = Math.round(st.master * 100);
      $('vol-music').value = Math.round(st.music * 100);
      $('vol-sfx').value = Math.round(st.sfx * 100);
      syncVolLabels();
      $('tg-music').classList.toggle('on', !!st.musicOn);
      $('tg-sfx').classList.toggle('on', !!st.sfxOn);
    }
    $('vol-master').addEventListener('input', function () {
      $('vol-master-val').textContent = this.value;
      if (window.Sound) safe(function () { Sound.setMaster(this.value / 100); });
    });
    $('vol-music').addEventListener('input', function () {
      $('vol-music-val').textContent = this.value;
      if (window.Sound) safe(function () { Sound.setMusicVol(this.value / 100); });
    });
    $('vol-sfx').addEventListener('input', function () {
      $('vol-sfx-val').textContent = this.value;
      if (window.Sound) safe(function () { Sound.setSfxVol(this.value / 100); });
    });
    $('tg-music').addEventListener('click', function () {
      var on = !this.classList.contains('on');
      this.classList.toggle('on', on);
      if (window.Sound) safe(function () { Sound.toggleMusic(on); });
      sfx('click');
    });
    $('tg-sfx').addEventListener('click', function () {
      var on = !this.classList.contains('on');
      this.classList.toggle('on', on);
      if (window.Sound) safe(function () { Sound.toggleSfx(on); });
      sfx('click');
    });
  }
  function syncVolLabels() {
    $('vol-master-val').textContent = $('vol-master').value;
    $('vol-music-val').textContent = $('vol-music').value;
    $('vol-sfx-val').textContent = $('vol-sfx').value;
  }

  /* =====================================================================
     GLOBAL WIRING (delegated events)
     ===================================================================== */
  function wireGlobal() {
    // phase nav
    var next = $('btn-phase-next');
    if (next) next.addEventListener('click', function () {
      // DESIGN, LIGHT and CONNECT advance manually; TEST advances itself
      // after the bench finishes, SHOWCASE is the last step.
      if (phase === 'design' || phase === 'light' || phase === 'connect') nextPhase();
      else if (phase === 'test' && !testRunning) nextPhase();
    });
    var back = $('btn-phase-back');
    if (back) back.addEventListener('click', function () {
      if (phase === 'test' && testRunning) return;
      prevPhase();
    });
    qsa('.pstep').forEach(function (s) {
      s.addEventListener('click', function () {
        var i = PHASES.indexOf(s.getAttribute('data-phase'));
        if (i < 0 || i > phaseIndex + 1) { sfx('error'); return; }
        setPhase(i);
      });
    });

    // start build
    var nb = $('btn-new-build');
    if (nb) nb.addEventListener('click', startBuild);
    var storyNext = $('story-next');
    if (storyNext) storyNext.addEventListener('click', startBuild);
    // after the textile story's DISCOVER, go to lab → hub
    var disc = $('btn-discover');
    if (disc) disc.addEventListener('click', function () { setTimeout(function () { goScreen('hub'); }, 1200); });

    // reset progress
    var rp = $('btn-reset-progress');
    if (rp) rp.addEventListener('click', function () {
      if (window.confirm('Reset all progress? This cannot be undone.')) {
        if (window.Progress) safe(function () { Progress.reset(); });
        renderHub();
        sfx('error');
      }
    });

    // tests + showcase
    var runBtn = $('btn-run-tests');
    if (runBtn) runBtn.addEventListener('click', runTests);
    var sh = $('btn-showcase');
    if (sh) sh.addEventListener('click', beginShowcase);
    var skip = $('cine-skip');
    if (skip) skip.addEventListener('click', skipCinematic);

    // result actions
    var rs = $('result-save');
    if (rs) rs.addEventListener('click', function () { if (window.App) App.saveDesign(); sfx('collect'); });
    var rr = $('result-replay');
    if (rr) rr.addEventListener('click', function () { goScreen('build'); setPhase(4); });
    var ra = $('result-again');
    if (ra) ra.addEventListener('click', startBuild);

    // level-up close
    var lu = $('lu-close');
    if (lu) lu.addEventListener('click', function () { $('levelup').hidden = true; sfx('select'); });

    // environment chips
    qsa('#env-chips .chip').forEach(function (c) {
      c.addEventListener('click', function () {
        var env = c.getAttribute('data-env');
        if (!isUnlocked(c.getAttribute('data-unlock'))) { lockInterceptor({ target: c, preventDefault: function () {}, stopImmediatePropagation: function () {} }); return; }
        setEnv(env, true);
        sfx('whoosh');
        if (run) run.env = env;
      });
    });

    // lock interceptor for unlocks
    document.addEventListener('click', lockInterceptor, true);

    // global sound on any button press + progress stat tracking
    document.addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (b && !b.closest('.wire-board')) sfx('click');
      if (!window.Progress) return;
      var mat = e.target.closest('[data-ctl="material"]');
      if (mat && !mat.classList.contains('is-locked')) {
        safe(function () { Progress.trackEvent('material', { material: mat.getAttribute('data-value') }); });
        return;
      }
      var zone = e.target.closest('[data-zone]');
      if (zone) {
        safe(function () { Progress.trackEvent('zone', { zone: zone.getAttribute('data-zone') }); });
        return;
      }
      var mode = e.target.closest('[data-mode]');
      if (mode && mode.getAttribute('data-mode') === 'night') {
        safe(function () { Progress.trackEvent('night', {}); });
      }
    });
    document.addEventListener('mouseover', function (e) {
      var b = e.target.closest('button, .swatch, .chip, .mat-card, .gcard, .lb-row');
      if (b) sfx('hover');
    });

    // keyboard: Esc closes overlays
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        if (cineRunning) skipCinematic();
        var pop = $('reward-pop'); if (pop && pop.classList.contains('show')) pop.classList.remove('show');
        var lu = $('levelup'); if (lu && !lu.hidden) lu.hidden = true;
        var ap = $('audio-panel'); if (ap && !ap.hidden) ap.hidden = true;
      }
    });
  }

  /* =====================================================================
     PROGRESS EVENT LISTENERS — sound + particles + popups
     ===================================================================== */
  function bindProgressEvents() {
    document.addEventListener('munda:xp', function (e) {
      var d = e.detail || {};
      if (d.gained > 0) { sfx('collect'); }
    });
    document.addEventListener('munda:coins', function () { sfx('coin'); });
    document.addEventListener('munda:levelup', function (e) {
      var d = e.detail || {};
      if (window.FX) safe(function () { FX.confetti({ count: 140, colors: ['#ffc861', '#4df3ff', '#2d6bff'] }); });
      sfx('levelup');
      showLevelUp(d);
    });
    document.addEventListener('munda:achievement', function (e) {
      var a = (e.detail || {}).achievement;
      if (a) {
        sfx('achievement');
        showRewardPop(a.icon || '★', a.name, a.desc, a.xp);
      }
    });
    document.addEventListener('munda:mission', function (e) {
      var m = (e.detail || {}).mission;
      if (m) {
        sfx('mission');
        showRewardPop('✓', m.name, 'Mission complete', m.xp);
      }
    });
    document.addEventListener('munda:unlock', function (e) {
      var u = (e.detail || {}).unlock;
      if (u) { sfx('rank'); refreshLockUI(); }
    });
    document.addEventListener('munda:progress', function () {
      renderHub();
    });
    document.addEventListener('munda:lang', function () {
      // re-render dynamic bits on language switch
      if (document.body.dataset.screen === 'hub') renderHub();
      if (document.body.dataset.screen === 'build') { buildZoneButtons(); if (window.Interior) Interior.syncControls(); }
      if (phase === 'connect') wireBuild();
      if (phase === 'test') renderTestList();
      if (phase === 'showcase') renderShowcasePreview();
    });
  }

  /* =====================================================================
     INIT
     ===================================================================== */
  function hideOverlays() {
    qsa('.overlay, .cine, .reward-pop, #levelup').forEach(function (o) {
      o.hidden = true;
      o.classList.remove('show');
    });
  }

  var started = false;
  function init() {
    if (started) return;
    started = true;
    bootInit();
    initAudioPanel();
    wireGlobal();
    bindProgressEvents();
    renderHub();
    refreshLockUI();
    // keep zone counter fresh
    setInterval(zoneCounter, 400);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.FutureLab = {
    init: init,
    startBuild: startBuild,
    gotoPhase: setPhase,
    setEnv: setEnv,
    beginShowcase: beginShowcase,
    skipCinematic: skipCinematic,
    computeScore: computeScore,
    rankForScore: rankForScore,
    showResult: showResult,
    renderPreview: renderShowcasePreview,
    renderHub: renderHub,
    refreshHUD: refreshHUD
  };
})();
