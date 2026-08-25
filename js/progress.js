/* =====================================================================
 * MUNDA FUTURE LAB — progress.js
 * ---------------------------------------------------------------------
 * The META LAYER of the game: it turns single runs into a career.
 *   XP  ->  levels  ->  career ranks  ->  unlocked content
 *   coins, missions, achievements and a local leaderboard.
 *
 * DESIGN RULES (important, do not break them):
 *   1. PURE LOGIC + localStorage. This file NEVER touches the DOM,
 *      never renders, never plays a sound, never starts a timer.
 *   2. It ANNOUNCES everything by dispatching CustomEvents on `document`.
 *      The UI layer (js/site.js, js/fx.js, js/audio.js) listens and
 *      reacts with sound + particles.
 *   3. Nothing in the public API may ever throw. If storage is blocked
 *      (private browsing) the game keeps working in memory only.
 *   4. Plain ES5 inside one IIFE. No modules, no dependencies.
 *      Load it with:  <script src="js/progress.js"></script>
 *
 * EVENTS DISPATCHED ON document
 *   munda:xp           {gained, xp, level, reason}
 *   munda:levelup      {level, rank, unlocks}
 *   munda:coins        {gained, coins, reason}
 *   munda:mission      {mission}
 *   munda:achievement  {achievement}
 *   munda:unlock       {unlock}
 *   munda:run          {run, isBest}
 *   munda:progress     {summary}     <- fired after ANY change
 * ===================================================================== */

(function (global) {
  'use strict';

  /* ===================================================================
   * 0. CONSTANTS
   * =================================================================== */

  var STORAGE_KEY = 'munda_progress_v1'; // current save slot
  var SCHEMA_VERSION = 1;                // bump when the shape changes
  var LEGACY_KEYS = ['munda_progress', 'mundaProgress']; // migrated once

  var MAX_LEVEL = 20;    // career stops here
  var XP_BASE = 120;     // xpForLevel(l) === 120 * l * l
  var MAX_RUNS = 60;     // how many runs we keep in the save file
  var KEEP_BEST = 20;    // ...of which the best 20 are never dropped

  /* ===================================================================
   * 1. MUNDA SCORE RANK LADDER  (canonical — do not invent new ones)
   * -------------------------------------------------------------------
   * A finished run produces a MUNDA SCORE from 0 to 100. That score maps
   * to exactly one of these six ranks. `color` is the neon accent the UI
   * uses for the badge, `blurb` is the one line shown under it.
   * =================================================================== */

  var RANKS = [
    { id: 'rookie',    name: 'ROOKIE',           min: 0,   max: 39,  color: '#8b93a7',
      blurb: 'The lights turn on. Now make them mean something.' },
    { id: 'engineer',  name: 'ENGINEER',         min: 40,  max: 59,  color: '#4df3ff',
      blurb: 'Solid wiring, honest work. The cabin is alive.' },
    { id: 'designer',  name: 'DESIGNER',         min: 60,  max: 74,  color: '#2d6bff',
      blurb: 'Function met taste. The interior finally has a voice.' },
    { id: 'senior',    name: 'SENIOR ENGINEER',  min: 75,  max: 89,  color: '#9a4dff',
      blurb: 'Precision everywhere. This build could ship tomorrow.' },
    { id: 'master',    name: 'MUNDA MASTER',     min: 90,  max: 99,  color: '#ffc861',
      blurb: 'Light, textile and energy in perfect balance.' },
    { id: 'architect', name: 'FUTURE ARCHITECT', min: 100, max: 100, color: '#ff4d8d',
      blurb: 'A flawless cabin. This is what MUNDA builds tomorrow.' }
  ];

  /* Career ranks reuse the same six names, spread over the 20 levels:
   * 1-3 ROOKIE | 4-7 ENGINEER | 8-11 DESIGNER | 12-15 SENIOR | 16-19 MASTER | 20 ARCHITECT */
  var CAREER_BANDS = [
    { rank: 'rookie',    from: 1,  to: 3 },
    { rank: 'engineer',  from: 4,  to: 7 },
    { rank: 'designer',  from: 8,  to: 11 },
    { rank: 'senior',    from: 12, to: 15 },
    { rank: 'master',    from: 16, to: 19 },
    { rank: 'architect', from: 20, to: 20 }
  ];

  /* ===================================================================
   * 2. ACHIEVEMENTS  (14 one-time trophies)
   * -------------------------------------------------------------------
   * Data only: {id, name, desc, icon, xp, secret?}. The CONDITION for
   * every achievement lives in ACH_RULES right below, so this catalog
   * stays readable. `secret: true` means the UI shows it as "???" until
   * it is earned. `xp` is the bonus XP paid out on unlock.
   * =================================================================== */

  var ACHIEVEMENTS = [
    { id: 'first_run',       name: 'First Light',        icon: '🏁', xp: 150,
      desc: 'Finish your very first MUNDA build, from textile to showcase.' },
    { id: 'all_tests',       name: 'Full Certification', icon: '🧪', xp: 250,
      desc: 'Pass all 5 lab tests in one run: light, vibration, temperature, durability, energy.' },
    { id: 'perfect_wiring',  name: 'Zero Shorts',        icon: '🔌', xp: 300,
      desc: 'Complete the CONNECT mini-game with zero wiring mistakes.' },
    { id: 'score_90',        name: 'Munda Master',       icon: '⭐', xp: 400,
      desc: 'Reach a MUNDA SCORE of 90 or higher.' },
    { id: 'score_100',       name: 'Future Architect',   icon: '💯', xp: 800, secret: true,
      desc: 'Reach the perfect MUNDA SCORE of exactly 100.' },
    { id: 'all_zones',       name: 'Full Cabin',         icon: '🚗', xp: 200,
      desc: 'Light up all 6 interior zones in a single build.' },
    { id: 'speed_run',       name: 'Fast Track',         icon: '⚡', xp: 250,
      desc: 'Finish a complete run in under 4 minutes (240 seconds).' },
    { id: 'designs_5',       name: 'Portfolio',          icon: '💾', xp: 180,
      desc: 'Save 5 different interior designs to your MUNDA portfolio.' },
    { id: 'all_materials',   name: 'Material Scientist', icon: '🧵', xp: 220,
      desc: 'Try every textile material in the DESIGN phase at least once.' },
    { id: 'level_5',         name: 'Junior Engineer',    icon: 'LV5', xp: 200,
      desc: 'Reach career level 5.' },
    { id: 'level_10',        name: 'Lead Designer',      icon: 'L10', xp: 500,
      desc: 'Reach career level 10.' },
    { id: 'efficiency_90',   name: 'Green Glow',         icon: '🔋', xp: 260,
      desc: 'Build an energy-efficient cabin: efficiency sub-score of 90 or more.' },
    { id: 'night_mode',      name: 'Night Shift',        icon: '🌙', xp: 160,
      desc: 'Complete a build in night mode, where the textile does the talking.' },
    { id: 'showcase_replay', name: 'Encore',             icon: '🎬', xp: 120, secret: true,
      desc: 'Replay the FINAL SHOWCASE cinematic to admire your own work again.' }
  ];

  /* How each achievement is earned, checked against the stats block.
   * Every rule is a small pure function: stats -> boolean. */
  var ACH_RULES = {
    first_run:       function (s) { return s.runsCompleted >= 1; },
    all_tests:       function (s) { return s.bestTestsInRun >= 5; },
    perfect_wiring:  function (s) { return s.perfectWiring >= 1; },
    score_90:        function (s) { return s.bestScore >= 90; },
    score_100:       function (s) { return s.bestScore >= 100; },
    all_zones:       function (s) { return s.zonesUsed >= 6; },
    speed_run:       function (s) { return s.fastestRun > 0 && s.fastestRun <= 240; },
    designs_5:       function (s) { return s.designsSaved >= 5; },
    all_materials:   function (s) { return s.materialsTried >= 5; },
    level_5:         function (s) { return s.level >= 5; },
    level_10:        function (s) { return s.level >= 10; },
    efficiency_90:   function (s) { return s.bestEfficiency >= 90; },
    night_mode:      function (s) { return s.nightBuilds >= 1; },
    showcase_replay: function (s) { return s.showcaseReplays >= 1; }
  };

  /* ===================================================================
   * 3. MISSIONS  (repeatable career goals, each completes once)
   * -------------------------------------------------------------------
   * A mission simply watches ONE stat key and completes when that stat
   * reaches `goal`. Reward = xp + coins. Ordered easiest -> hardest so a
   * student can read the list top to bottom as a career path.
   * =================================================================== */

  var MISSIONS = [
    { id: 'm_first_build',  name: 'First Build',          stat: 'runsCompleted',   goal: 1,   xp: 120, coins: 50,
      desc: 'Complete one full run through all five phases.' },
    { id: 'm_full_cabin',   name: 'Full Cabin Lighting',  stat: 'zonesUsed',       goal: 6,   xp: 180, coins: 70,
      desc: 'Use all 6 interior zones in one design.' },
    { id: 'm_three_builds', name: 'Production Line',      stat: 'runsCompleted',   goal: 3,   xp: 200, coins: 80,
      desc: 'Complete 3 builds — repetition is how engineers get fast.' },
    { id: 'm_archive',      name: 'Design Archive',       stat: 'designsSaved',    goal: 5,   xp: 160, coins: 60,
      desc: 'Save 5 designs so the studio can compare them.' },
    { id: 'm_material_lab', name: 'Material Lab',         stat: 'materialsTried',  goal: 5,   xp: 200, coins: 90,
      desc: 'Test every textile material MUNDA offers.' },
    { id: 'm_showcase_fan', name: 'Showreel',             stat: 'showcasesWatched', goal: 3,  xp: 140, coins: 60,
      desc: 'Watch the final showcase 3 times — presentation matters.' },
    { id: 'm_test_lab',     name: 'Test Lab Veteran',     stat: 'testsPassed',     goal: 15,  xp: 240, coins: 100,
      desc: 'Pass 15 lab tests in total across all your builds.' },
    { id: 'm_clean_wiring', name: 'Clean Wiring',         stat: 'perfectWiring',   goal: 3,   xp: 260, coins: 120,
      desc: 'Finish the CONNECT mini-game with zero mistakes, 3 times.' },
    { id: 'm_master_score', name: 'Master Score',         stat: 'bestScore',       goal: 90,  xp: 400, coins: 200,
      desc: 'Push a build to a MUNDA SCORE of 90 or higher.' }
  ];

  /* ===================================================================
   * 4. UNLOCKS  (content that appears as the career level rises)
   * -------------------------------------------------------------------
   * {id, name, type, level, desc}. `key` is the short id the game engine
   * uses internally (e.g. the environment name 'night-city'), so
   * isUnlocked() accepts either the unlock id or that key.
   * =================================================================== */

  var UNLOCKS = [
    { id: 'color_gradient',   key: 'gradient',    name: 'Gradient Color',   type: 'color',       level: 2,
      desc: 'Blend two LED colors across a zone instead of one flat tone.' },
    { id: 'mat_lumen_silk',   key: 'lumen-silk',  name: 'Lumen Silk',       type: 'material',    level: 3,
      desc: 'Ultra-fine woven textile: soft diffusion, premium glow.' },
    { id: 'pattern_custom',   key: 'custom',      name: 'Custom Pattern',   type: 'pattern',     level: 4,
      desc: 'Draw your own light pattern per zone instead of using presets.' },
    { id: 'mat_tech_mesh',    key: 'tech-mesh',   name: 'Tech Mesh',        type: 'material',    level: 5,
      desc: 'Open technical weave: maximum brightness, sport character.' },
    { id: 'env_tunnel',       key: 'tunnel',      name: 'Tunnel',           type: 'environment', level: 6,
      desc: 'Showcase environment: dark tunnel with racing light streaks.' },
    { id: 'pattern_dynamic',  key: 'dynamic',     name: 'Dynamic Pattern',  type: 'pattern',     level: 7,
      desc: 'Animated pattern that reacts to speed and driving mode.' },
    { id: 'env_showroom',     key: 'showroom',    name: 'Showroom',         type: 'environment', level: 8,
      desc: 'Showcase environment: clean white studio, every stitch visible.' },
    { id: 'env_night_city',   key: 'night-city',  name: 'Night City',       type: 'environment', level: 10,
      desc: 'Showcase environment: neon city at night, reflections everywhere.' },
    { id: 'hud_theme_neon',   key: 'neon',        name: 'Neon HUD Theme',   type: 'cosmetic',    level: 12,
      desc: 'Cosmetic: repaints the lab HUD in MUNDA neon magenta and cyan.' },
    { id: 'env_arena',        key: 'arena',       name: 'Arena',            type: 'environment', level: 13,
      desc: 'Showcase environment: presentation arena with a live audience.' }
  ];

  /* ===================================================================
   * 5. SMALL SAFE HELPERS
   * =================================================================== */

  function isNum(v) {
    return typeof v === 'number' && isFinite(v);
  }

  /* NaN-safe number read with a default. */
  function num(v, def) {
    var n;
    if (typeof v === 'number') { n = v; }
    else if (typeof v === 'string' && v !== '') { n = parseFloat(v); }
    else { n = NaN; }
    if (!isFinite(n)) { return def; }
    return n;
  }

  function int(v, def) {
    var n = num(v, def);
    return Math.floor(n);
  }

  function clamp(v, lo, hi) {
    if (v < lo) { return lo; }
    if (v > hi) { return hi; }
    return v;
  }

  function now() {
    return (new Date()).getTime();
  }

  function clone(o) {
    try { return JSON.parse(JSON.stringify(o)); }
    catch (e) { return null; }
  }

  function inArray(arr, v) {
    for (var i = 0; i < arr.length; i++) { if (arr[i] === v) { return true; } }
    return false;
  }

  function findById(list, id) {
    for (var i = 0; i < list.length; i++) { if (list[i].id === id) { return list[i]; } }
    return null;
  }

  function str(v, def) {
    if (typeof v === 'string') { return v; }
    if (typeof v === 'number' && isFinite(v)) { return String(v); }
    return def;
  }

  /* ===================================================================
   * 6. STATS BLOCK
   * -------------------------------------------------------------------
   * Every stat has a MERGE MODE, so trackEvent knows how to fold a new
   * value in:  add = running total, max = personal best, min = fastest.
   * =================================================================== */

  var STAT_MODES = {
    runsCompleted:   'add',
    testsPassed:     'add',
    perfectWiring:   'add',
    wiringMistakes:  'add',
    designsSaved:    'add',
    showcasesWatched:'add',
    showcaseReplays: 'add',
    nightBuilds:     'add',
    phasesCompleted: 'add',
    secondsPlayed:   'add',
    zonesUsed:       'max',
    materialsTried:  'max',
    bestScore:       'max',
    bestTestsInRun:  'max',
    bestEfficiency:  'max',
    level:           'max',
    fastestRun:      'min'
  };

  function defaultStats() {
    var s = {};
    for (var k in STAT_MODES) {
      if (STAT_MODES.hasOwnProperty(k)) { s[k] = 0; }
    }
    s.materialsList = []; // unique material ids seen (drives materialsTried)
    s.zonesList = [];     // unique zone ids ever lit
    return s;
  }

  function defaultData() {
    return {
      version: SCHEMA_VERSION,
      player: '',
      xp: 0,
      level: 1,
      coins: 0,
      totalRuns: 0,
      bestScore: 0,
      runs: [],          // array of recorded runs (see recordRun)
      missions: {},      // id -> {progress, completed, ts}
      achievements: {},  // id -> unlock timestamp
      unlocks: {},       // id -> unlock timestamp
      stats: defaultStats(),
      createdAt: now(),
      updatedAt: now()
    };
  }

  /* live state object — Progress.data points at exactly this object */
  var state = defaultData();

  /* ===================================================================
   * 7. EVENT DISPATCH (the only outside world this module talks to)
   * =================================================================== */

  function makeEvent(name, detail) {
    // Modern browsers
    try {
      if (typeof global.CustomEvent === 'function') {
        return new global.CustomEvent(name, { detail: detail, bubbles: false, cancelable: false });
      }
    } catch (e) { /* fall through */ }
    // Old IE / odd hosts
    try {
      var doc = global.document;
      if (doc && typeof doc.createEvent === 'function') {
        var ev = doc.createEvent('CustomEvent');
        ev.initCustomEvent(name, false, false, detail);
        return ev;
      }
    } catch (e2) { /* fall through */ }
    // Last resort: a plain object with the same shape
    return { type: name, detail: detail };
  }

  function emit(name, detail) {
    try {
      var doc = global.document;
      if (!doc || typeof doc.dispatchEvent !== 'function') { return; }
      doc.dispatchEvent(makeEvent(name, detail));
    } catch (e) { /* the meta layer must never break the game */ }
  }

  var quiet = 0; // >0 while replaying/bulk-loading: suppress noisy events

  function emitProgress() {
    if (quiet > 0) { return; }
    emit('munda:progress', { summary: summary() });
  }

  /* ===================================================================
   * 8. STORAGE (every access wrapped — private mode must not break us)
   * =================================================================== */

  function storage() {
    try {
      var ls = global.localStorage;
      if (!ls || typeof ls.getItem !== 'function') { return null; }
      return ls;
    } catch (e) { return null; }
  }

  function readRaw(key) {
    try {
      var ls = storage();
      if (!ls) { return null; }
      return ls.getItem(key);
    } catch (e) { return null; }
  }

  function writeRaw(key, value) {
    try {
      var ls = storage();
      if (!ls) { return false; }
      ls.setItem(key, value);
      return true;
    } catch (e) { return false; } // quota / private mode / disabled
  }

  function removeRaw(key) {
    try {
      var ls = storage();
      if (!ls) { return false; }
      ls.removeItem(key);
      return true;
    } catch (e) { return false; }
  }

  /* Copy a loaded/migrated snapshot INTO the live state object, so any
   * UI code holding a reference to Progress.data keeps working. */
  function adopt(src) {
    var fresh = defaultData();
    var k;
    for (k in state) {
      if (state.hasOwnProperty(k)) { delete state[k]; }
    }
    for (k in fresh) {
      if (fresh.hasOwnProperty(k)) { state[k] = fresh[k]; }
    }
    if (!src || typeof src !== 'object') { return; }

    state.player = str(src.player, '').slice(0, 24);
    state.xp = Math.max(0, num(src.xp, 0));
    state.coins = Math.max(0, int(src.coins, 0));
    state.totalRuns = Math.max(0, int(src.totalRuns, 0));
    state.bestScore = clamp(num(src.bestScore, 0), 0, 100);
    state.createdAt = num(src.createdAt, now());

    // stats: only keys we know about, coerced to numbers
    if (src.stats && typeof src.stats === 'object') {
      for (k in STAT_MODES) {
        if (STAT_MODES.hasOwnProperty(k)) {
          state.stats[k] = Math.max(0, num(src.stats[k], 0));
        }
      }
      state.stats.materialsList = sanitizeIdList(src.stats.materialsList);
      state.stats.zonesList = sanitizeIdList(src.stats.zonesList);
    }

    // missions
    if (src.missions && typeof src.missions === 'object') {
      for (var i = 0; i < MISSIONS.length; i++) {
        var m = MISSIONS[i];
        var rec = src.missions[m.id];
        if (rec && typeof rec === 'object' && rec.completed) {
          state.missions[m.id] = { progress: num(rec.progress, m.goal), completed: true, ts: num(rec.ts, now()) };
        }
      }
    }
    // achievements + unlocks (unknown ids are dropped on purpose)
    copyStamps(src.achievements, ACHIEVEMENTS, state.achievements);
    copyStamps(src.unlocks, UNLOCKS, state.unlocks);

    // runs
    state.runs = [];
    if (src.runs && src.runs.length) {
      for (var r = 0; r < src.runs.length; r++) {
        var run = sanitizeRun(src.runs[r]);
        if (run) { state.runs.push(run); }
      }
      trimRuns();
    }

    state.level = levelFromXp(state.xp);
    state.stats.level = Math.max(state.stats.level, state.level);
    state.stats.bestScore = Math.max(state.stats.bestScore, state.bestScore);
    state.bestScore = Math.max(state.bestScore, state.stats.bestScore);
    state.version = SCHEMA_VERSION;
    state.updatedAt = now();
  }

  function sanitizeIdList(list) {
    var out = [];
    if (!list || !list.length) { return out; }
    for (var i = 0; i < list.length && out.length < 64; i++) {
      var v = str(list[i], '');
      if (v && !inArray(out, v)) { out.push(v); }
    }
    return out;
  }

  function copyStamps(src, catalog, target) {
    if (!src || typeof src !== 'object') { return; }
    for (var i = 0; i < catalog.length; i++) {
      var id = catalog[i].id;
      if (src[id]) { target[id] = num(src[id], now()); }
    }
    // tolerate an array-style legacy save: ['first_run', ...]
    if (src.length) {
      for (var j = 0; j < src.length; j++) {
        var lid = str(src[j], '');
        if (lid && findById(catalog, lid)) { target[lid] = target[lid] || now(); }
      }
    }
  }

  /* Migration: v1 is the first schema. Anything without a version is
   * treated as a pre-release save and read best-effort; anything from a
   * FUTURE version we do not understand is ignored (fresh career). */
  function migrate(raw) {
    if (!raw || typeof raw !== 'object') { return null; }
    var v = int(raw.version, 0);
    if (v > SCHEMA_VERSION) { return null; } // newer save: ignore gracefully
    return raw;                              // v0 / v1 both readable
  }

  /* ===================================================================
   * 9. XP CURVE, LEVELS AND RANKS
   * -------------------------------------------------------------------
   *   xpForLevel(l)  = 120 * l * l        (the published curve)
   *   XP needed to REACH level l = xpForLevel(l - 1), so level 1 = 0 XP.
   *   Level 2 at 120 XP, level 3 at 480, ... level 20 at 43320.
   * =================================================================== */

  function xpForLevel(l) {
    var n = int(l, 1);
    if (n < 1) { n = 1; }
    return XP_BASE * n * n;
  }

  /* cumulative XP required to be AT this level */
  function xpToReach(l) {
    var n = int(l, 1);
    if (n <= 1) { return 0; }
    if (n > MAX_LEVEL) { n = MAX_LEVEL; }
    return xpForLevel(n - 1);
  }

  /* A loop, not a square root: deterministic and free of float surprises. */
  function levelFromXp(xp) {
    var x = Math.max(0, num(xp, 0));
    var lvl = 1;
    for (var l = 2; l <= MAX_LEVEL; l++) {
      if (x >= xpToReach(l)) { lvl = l; } else { break; }
    }
    return lvl;
  }

  function levelProgress() {
    try {
      var lvl = levelFromXp(state.xp);
      var base = xpToReach(lvl);
      var next = lvl >= MAX_LEVEL ? base : xpToReach(lvl + 1);
      var need = Math.max(0, next - base);
      var into = Math.max(0, state.xp - base);
      var pct;
      if (lvl >= MAX_LEVEL || need === 0) { pct = 100; into = need; }
      else { pct = Math.round(clamp((into / need) * 100, 0, 100)); }
      return { level: lvl, into: into, need: need, pct: pct };
    } catch (e) {
      return { level: 1, into: 0, need: xpForLevel(1), pct: 0 };
    }
  }

  function rankForScore(score) {
    var s = clamp(Math.round(num(score, 0)), 0, 100);
    for (var i = 0; i < RANKS.length; i++) {
      if (s >= RANKS[i].min && s <= RANKS[i].max) { return RANKS[i]; }
    }
    return RANKS[0];
  }

  function rankById(id) {
    for (var i = 0; i < RANKS.length; i++) { if (RANKS[i].id === id) { return RANKS[i]; } }
    return RANKS[0];
  }

  function rankForLevel(level) {
    var l = clamp(int(level, 1), 1, MAX_LEVEL);
    for (var i = 0; i < CAREER_BANDS.length; i++) {
      if (l >= CAREER_BANDS[i].from && l <= CAREER_BANDS[i].to) {
        return rankById(CAREER_BANDS[i].rank);
      }
    }
    return RANKS[0];
  }

  /* ===================================================================
   * 10. UNLOCKS
   * =================================================================== */

  function unlocksForLevel(l) {
    var lvl = int(l, 0);
    var out = [];
    for (var i = 0; i < UNLOCKS.length; i++) {
      if (UNLOCKS[i].level === lvl) { out.push(UNLOCKS[i]); }
    }
    return out;
  }

  function findUnlock(idOrKey) {
    var id = str(idOrKey, '');
    if (!id) { return null; }
    for (var i = 0; i < UNLOCKS.length; i++) {
      if (UNLOCKS[i].id === id || UNLOCKS[i].key === id) { return UNLOCKS[i]; }
    }
    return null;
  }

  function isUnlocked(idOrKey) {
    try {
      var u = findUnlock(idOrKey);
      if (!u) { return false; }
      if (state.unlocks[u.id]) { return true; }
      return levelFromXp(state.xp) >= u.level;
    } catch (e) { return false; }
  }

  /* Stamp every unlock the player is entitled to; announce new ones. */
  function grantUnlocksUpTo(level) {
    var granted = [];
    for (var i = 0; i < UNLOCKS.length; i++) {
      var u = UNLOCKS[i];
      if (u.level <= level && !state.unlocks[u.id]) {
        state.unlocks[u.id] = now();
        granted.push(u);
      }
    }
    return granted;
  }

  /* ===================================================================
   * 11. XP / COINS
   * =================================================================== */

  var awardDepth = 0; // guards achievement-XP -> level-up -> achievement loops

  function addXP(n, reason) {
    var result = { gained: 0, xp: state.xp, level: state.level, leveledUp: false,
                   levelsGained: 0, rank: rankForLevel(state.level), rankUp: false };
    try {
      var gain = Math.max(0, Math.round(num(n, 0))); // NaN-safe, no negative XP
      var why = str(reason, 'xp');
      var beforeLevel = levelFromXp(state.xp);
      var beforeRank = rankForLevel(beforeLevel);

      state.xp = Math.max(0, state.xp + gain);
      var afterLevel = levelFromXp(state.xp);
      state.level = afterLevel;
      state.stats.level = Math.max(state.stats.level, afterLevel);

      result.gained = gain;
      result.xp = state.xp;
      result.level = afterLevel;
      result.levelsGained = Math.max(0, afterLevel - beforeLevel);
      result.leveledUp = result.levelsGained > 0;
      result.rank = rankForLevel(afterLevel);
      result.rankUp = result.rank.id !== beforeRank.id;

      if (gain > 0 && quiet === 0) {
        emit('munda:xp', { gained: gain, xp: state.xp, level: afterLevel, reason: why });
      }

      if (result.leveledUp) {
        awardDepth++;
        for (var l = beforeLevel + 1; l <= afterLevel; l++) {
          var newUnlocks = grantUnlocksUpTo(l);
          if (quiet === 0) {
            emit('munda:levelup', { level: l, rank: rankForLevel(l), unlocks: newUnlocks });
            for (var u = 0; u < newUnlocks.length; u++) {
              emit('munda:unlock', { unlock: newUnlocks[u] });
            }
          }
          if (awardDepth < 4) { addCoins(25 * l, 'levelup'); } // level bonus
        }
        awardDepth--;
      }

      if (awardDepth < 4) { checkAll(); }
      touch();
    } catch (e) { /* never throw */ }
    return result;
  }

  function addCoins(n, reason) {
    try {
      var gain = Math.max(0, Math.round(num(n, 0)));
      state.coins = Math.max(0, state.coins + gain);
      if (gain > 0 && quiet === 0) {
        emit('munda:coins', { gained: gain, coins: state.coins, reason: str(reason, 'coins') });
      }
      touch();
    } catch (e) { /* never throw */ }
    return { coins: state.coins };
  }

  function spendCoins(n) {
    try {
      var cost = Math.max(0, Math.round(num(n, 0)));
      if (cost === 0) { return true; }
      if (state.coins < cost) { return false; }
      state.coins = state.coins - cost;
      emit('munda:coins', { gained: -cost, coins: state.coins, reason: 'spend' });
      touch();
      return true;
    } catch (e) { return false; }
  }

  /* ===================================================================
   * 12. MISSIONS
   * =================================================================== */

  function missionValue(m) {
    var v = state.stats[m.stat];
    if (!isNum(v)) { v = 0; }
    return v;
  }

  function missionProgress(id) {
    try {
      var m = findById(MISSIONS, str(id, ''));
      if (!m) { return null; }
      var rec = state.missions[m.id];
      var completed = !!(rec && rec.completed);
      var value = completed ? m.goal : Math.min(missionValue(m), m.goal);
      return {
        id: m.id,
        mission: m,
        value: value,
        goal: m.goal,
        pct: m.goal > 0 ? Math.round(clamp((value / m.goal) * 100, 0, 100)) : 100,
        completed: completed,
        ts: completed ? rec.ts : 0
      };
    } catch (e) { return null; }
  }

  function completeMission(id) {
    try {
      var m = findById(MISSIONS, str(id, ''));
      if (!m) { return false; }
      if (state.missions[m.id] && state.missions[m.id].completed) { return false; } // once only
      state.missions[m.id] = { progress: m.goal, completed: true, ts: now() };
      if (quiet === 0) { emit('munda:mission', { mission: m }); }
      if (m.coins) { addCoins(m.coins, 'mission:' + m.id); }
      if (m.xp) { addXP(m.xp, 'mission:' + m.id); }
      touch();
      return true;
    } catch (e) { return false; }
  }

  /* ===================================================================
   * 13. ACHIEVEMENTS
   * =================================================================== */

  function hasAchievement(id) {
    try { return !!state.achievements[str(id, '')]; }
    catch (e) { return false; }
  }

  function unlockAchievement(id) {
    try {
      var a = findById(ACHIEVEMENTS, str(id, ''));
      if (!a) { return false; }
      if (state.achievements[a.id]) { return false; } // idempotent: silent
      state.achievements[a.id] = now();
      if (quiet === 0) { emit('munda:achievement', { achievement: a }); }
      if (a.xp) { addXP(a.xp, 'achievement:' + a.id); }
      touch();
      return true;
    } catch (e) { return false; }
  }

  function achievementCount() {
    var c = 0;
    for (var k in state.achievements) {
      if (state.achievements.hasOwnProperty(k)) { c++; }
    }
    return c;
  }

  /* Re-evaluate every mission + achievement rule. Loops a few times
   * because a reward can itself satisfy the next goal (XP -> level 5). */
  function checkAll() {
    var changedMissions = [];
    var changedAchievements = [];
    try {
      awardDepth++;
      for (var pass = 0; pass < 5; pass++) {
        var changed = false;
        var i;
        for (i = 0; i < MISSIONS.length; i++) {
          var m = MISSIONS[i];
          var rec = state.missions[m.id];
          if (rec && rec.completed) { continue; }
          if (missionValue(m) >= m.goal) {
            if (completeMission(m.id)) { changedMissions.push(m); changed = true; }
          }
        }
        for (i = 0; i < ACHIEVEMENTS.length; i++) {
          var a = ACHIEVEMENTS[i];
          if (state.achievements[a.id]) { continue; }
          var rule = ACH_RULES[a.id];
          if (!rule) { continue; }
          var ok = false;
          try { ok = !!rule(state.stats); } catch (e2) { ok = false; }
          if (ok && unlockAchievement(a.id)) { changedAchievements.push(a); changed = true; }
        }
        if (!changed) { break; }
      }
      awardDepth--;
    } catch (e) { awardDepth = Math.max(0, awardDepth - 1); }
    return { missions: changedMissions, achievements: changedAchievements };
  }

  /* ===================================================================
   * 14. STAT FOLDING + trackEvent (the ONE funnel the game calls)
   * =================================================================== */

  function applyStat(key, value) {
    var mode = STAT_MODES[key];
    if (!mode) { return; }
    var v = num(value, 0);
    if (!isFinite(v)) { return; }
    if (mode === 'add') {
      state.stats[key] = Math.max(0, state.stats[key] + Math.max(0, v));
    } else if (mode === 'max') {
      state.stats[key] = Math.max(state.stats[key], Math.max(0, v));
    } else if (mode === 'min') {
      v = Math.max(0, v);
      if (v > 0 && (state.stats[key] === 0 || v < state.stats[key])) { state.stats[key] = v; }
    }
  }

  function addUnique(listKey, value, counterKey) {
    var id = str(value, '');
    if (!id) { return; }
    var list = state.stats[listKey];
    if (!list || !list.length) { list = state.stats[listKey] = []; }
    if (!inArray(list, id)) { list.push(id); }
    applyStat(counterKey, list.length);
  }

  /* type -> what it means. Unknown types still fold numeric payload keys
   * that happen to be stat names, so the game can be sloppy safely. */
  function trackEvent(type, payload) {
    var out = { type: str(type, ''), missions: [], achievements: [], stats: state.stats };
    try {
      var t = str(type, '').toLowerCase();
      var p = (payload && typeof payload === 'object') ? payload : {};
      var i;

      switch (t) {
        case 'run':
        case 'runcomplete':
        case 'runfinished':
          if (p.score !== undefined || p.sub !== undefined) {
            recordRun(p);            // full result object: record it properly
          } else {
            applyStat('runsCompleted', 1);
          }
          break;

        case 'test':
        case 'testpassed':
          applyStat('testsPassed', num(p.passed, 1));
          break;

        case 'tests':
        case 'testscomplete':
          var passed = num(p.passed, num(p.count, 0));
          applyStat('testsPassed', passed);
          applyStat('bestTestsInRun', passed);
          break;

        case 'wiring':
        case 'wiringcomplete':
        case 'connect':
          var mistakes = Math.max(0, num(p.mistakes, num(p.errors, 0)));
          applyStat('wiringMistakes', mistakes);
          if (mistakes === 0 && p.completed !== false) { applyStat('perfectWiring', 1); }
          break;

        case 'zone':
        case 'zoneadded':
          if (p.zone !== undefined) { addUnique('zonesList', p.zone, 'zonesUsed'); }
          applyStat('zonesUsed', num(p.zonesUsed, num(p.zones, num(p.count, 0))));
          break;

        case 'zones':
        case 'zonesused':
          applyStat('zonesUsed', num(p.zonesUsed, num(p.zones, num(p.count, num(p.value, 0)))));
          if (p.list && p.list.length) {
            for (i = 0; i < p.list.length; i++) { addUnique('zonesList', p.list[i], 'zonesUsed'); }
          }
          break;

        case 'material':
        case 'materialtried':
        case 'materialselected':
          addUnique('materialsList', p.material !== undefined ? p.material : p.id, 'materialsTried');
          applyStat('materialsTried', num(p.materialsTried, num(p.count, 0)));
          break;

        case 'design':
        case 'designsaved':
          applyStat('designsSaved', 1);
          break;

        case 'showcase':
        case 'showcasewatched':
          applyStat('showcasesWatched', 1);
          if (p.replay === true || p.isReplay === true) { applyStat('showcaseReplays', 1); }
          break;

        case 'showcasereplay':
          applyStat('showcasesWatched', 1);
          applyStat('showcaseReplays', 1);
          break;

        case 'phase':
        case 'phasecomplete':
          applyStat('phasesCompleted', 1);
          if (p.seconds !== undefined) { applyStat('secondsPlayed', num(p.seconds, 0)); }
          break;

        case 'time':
        case 'playtime':
        case 'seconds':
          applyStat('secondsPlayed', num(p.seconds, num(p.value, num(p.amount, 0))));
          break;

        case 'score':
          var sc = clamp(num(p.score, num(p.value, 0)), 0, 100);
          applyStat('bestScore', sc);
          state.bestScore = Math.max(state.bestScore, sc);
          break;

        case 'efficiency':
          applyStat('bestEfficiency', clamp(num(p.efficiency, num(p.value, 0)), 0, 100));
          break;

        case 'night':
        case 'nightmode':
          applyStat('nightBuilds', 1);
          break;

        case 'levelcheck':
          applyStat('level', levelFromXp(state.xp));
          break;

        default:
          // Generic path: {stat:'designsSaved', amount:1} or a raw stat key.
          if (p.stat !== undefined && STAT_MODES[p.stat]) {
            applyStat(p.stat, num(p.amount, num(p.value, 1)));
          } else if (STAT_MODES[t]) {
            applyStat(t, num(p.amount, num(p.value, 1)));
          }
          break;
      }

      // Anything may also carry these along for the ride.
      if (p.night === true) { applyStat('nightBuilds', 1); }
      if (p.seconds !== undefined && t !== 'time' && t !== 'seconds' && t !== 'playtime' && t !== 'phase' && t !== 'phasecomplete') {
        applyStat('secondsPlayed', num(p.seconds, 0));
      }
      applyStat('level', levelFromXp(state.xp));

      if (p.xp !== undefined) { addXP(num(p.xp, 0), 'event:' + t); }
      if (p.coins !== undefined) { addCoins(num(p.coins, 0), 'event:' + t); }

      var res = checkAll();
      out.missions = res.missions;
      out.achievements = res.achievements;
      out.stats = state.stats;
      touch();
    } catch (e) { /* never throw */ }
    return out;
  }

  /* ===================================================================
   * 15. RUNS + LEADERBOARD
   * =================================================================== */

  var SUB_KEYS = ['lighting', 'precision', 'efficiency', 'durability', 'design'];

  function sanitizeSub(sub) {
    var out = {};
    var src = (sub && typeof sub === 'object') ? sub : {};
    for (var i = 0; i < SUB_KEYS.length; i++) {
      out[SUB_KEYS[i]] = clamp(Math.round(num(src[SUB_KEYS[i]], 0)), 0, 100);
    }
    return out;
  }

  function sanitizePhaseTimes(pt) {
    if (!pt || typeof pt !== 'object') { return {}; }
    var out = {};
    if (pt.length !== undefined && typeof pt.length === 'number') { // array form
      out = [];
      for (var i = 0; i < pt.length && i < 12; i++) { out.push(Math.max(0, num(pt[i], 0))); }
      return out;
    }
    for (var k in pt) {
      if (pt.hasOwnProperty(k)) { out[String(k).slice(0, 24)] = Math.max(0, num(pt[k], 0)); }
    }
    return out;
  }

  function phaseTotal(pt) {
    var total = 0, k;
    if (!pt) { return 0; }
    if (pt.length !== undefined && typeof pt.length === 'number') {
      for (var i = 0; i < pt.length; i++) { total += Math.max(0, num(pt[i], 0)); }
      return total;
    }
    for (k in pt) { if (pt.hasOwnProperty(k)) { total += Math.max(0, num(pt[k], 0)); } }
    return total;
  }

  function sanitizeRun(result) {
    if (!result || typeof result !== 'object') { return null; }
    var score = clamp(Math.round(num(result.score, 0)), 0, 100);
    var pt = sanitizePhaseTimes(result.phaseTimes);
    var duration = Math.max(0, num(result.duration, phaseTotal(pt)));
    var rank = rankForScore(score);
    return {
      id: str(result.id, 'r' + now() + '_' + Math.round(score)),
      player: str(result.player, state.player) || 'GUEST',
      score: score,
      sub: sanitizeSub(result.sub),
      rank: rank.id,
      rankName: rank.name,
      phaseTimes: pt,
      duration: duration,
      testsPassed: clamp(int(result.testsPassed, 0), 0, 5),
      zonesUsed: clamp(int(result.zonesUsed, 0), 0, 6),
      material: str(result.material, ''),
      night: result.night === true,
      level: levelFromXp(state.xp),
      ts: num(result.ts, now())
    };
  }

  /* Keep the save file small: newest runs plus the all-time best ones. */
  function trimRuns() {
    if (state.runs.length <= MAX_RUNS) { return; }
    var byScore = state.runs.slice(0);
    byScore.sort(function (a, b) { return b.score - a.score || a.ts - b.ts; });
    var keepIds = [];
    var i;
    for (i = 0; i < byScore.length && i < KEEP_BEST; i++) { keepIds.push(byScore[i].id); }
    var newest = state.runs.slice(0);
    newest.sort(function (a, b) { return b.ts - a.ts; });
    for (i = 0; i < newest.length && keepIds.length < MAX_RUNS; i++) {
      if (!inArray(keepIds, newest[i].id)) { keepIds.push(newest[i].id); }
    }
    var kept = [];
    for (i = 0; i < state.runs.length; i++) {
      if (inArray(keepIds, state.runs[i].id)) { kept.push(state.runs[i]); }
    }
    state.runs = kept;
  }

  function recordRun(result) {
    var run = null;
    try {
      run = sanitizeRun(result);
      if (!run) { return null; }

      var isBest = run.score > state.bestScore;
      state.runs.push(run);
      state.totalRuns = state.totalRuns + 1;
      if (isBest) { state.bestScore = run.score; }

      // fold the run into the career stats
      applyStat('runsCompleted', 1);
      applyStat('bestScore', run.score);
      applyStat('bestTestsInRun', run.testsPassed);
      applyStat('testsPassed', run.testsPassed);
      applyStat('zonesUsed', run.zonesUsed);
      applyStat('bestEfficiency', run.sub.efficiency);
      if (run.duration > 0) { applyStat('fastestRun', run.duration); }
      if (run.duration > 0) { applyStat('secondsPlayed', run.duration); }
      if (run.night) { applyStat('nightBuilds', 1); }
      if (run.material) { addUnique('materialsList', run.material, 'materialsTried'); }
      trimRuns();

      if (quiet === 0) { emit('munda:run', { run: run, isBest: isBest }); }

      // Career payout: the score IS the reward curve.
      if (result && result.noAward === true) {
        // caller handles rewards itself
      } else {
        var xp = 40 + run.score * 4 + (isBest ? 100 : 0);
        var coins = 10 + Math.round(run.score / 2) + (isBest ? 25 : 0);
        addCoins(coins, 'run');
        addXP(xp, 'run');
      }

      checkAll();
      touch();
    } catch (e) { /* never throw */ }
    return run;
  }

  /* Sorted best-first, light dedupe: identical player+score entries are
   * collapsed and one player cannot flood the whole board. */
  function leaderboard(limit) {
    try {
      var max = int(limit, 10);
      if (max <= 0) { max = 10; }
      var list = state.runs.slice(0);
      list.sort(function (a, b) {
        if (b.score !== a.score) { return b.score - a.score; }
        if (a.duration !== b.duration) {
          if (a.duration === 0) { return 1; }
          if (b.duration === 0) { return -1; }
          return a.duration - b.duration;
        }
        return a.ts - b.ts;
      });

      var seen = {};      // player|score -> true
      var perPlayer = {}; // player -> count
      var out = [];
      for (var i = 0; i < list.length && out.length < max; i++) {
        var r = list[i];
        var pname = r.player || 'GUEST';
        var key = pname + '|' + r.score;
        if (seen[key]) { continue; }
        var count = perPlayer[pname] || 0;
        if (count >= 3) { continue; }
        seen[key] = true;
        perPlayer[pname] = count + 1;
        out.push({
          place: out.length + 1,
          id: r.id,
          player: pname,
          score: r.score,
          rank: rankById(r.rank),
          sub: r.sub,
          duration: r.duration,
          night: r.night,
          ts: r.ts
        });
      }
      return out;
    } catch (e) { return []; }
  }

  /* ===================================================================
   * 16. SUMMARY (everything a HUD needs in one small object)
   * =================================================================== */

  function summary() {
    try {
      var lp = levelProgress();
      return {
        player: state.player || '',
        level: lp.level,
        xp: state.xp,
        into: lp.into,
        need: lp.need,
        pct: lp.pct,
        coins: state.coins,
        rank: rankForLevel(lp.level),
        scoreRank: rankForScore(state.bestScore),
        bestScore: state.bestScore,
        totalRuns: state.totalRuns,
        achievementCount: achievementCount(),
        achievementTotal: ACHIEVEMENTS.length,
        missionCount: countCompletedMissions(),
        missionTotal: MISSIONS.length,
        maxLevel: MAX_LEVEL
      };
    } catch (e) {
      return { player: '', level: 1, xp: 0, into: 0, need: xpForLevel(1), pct: 0, coins: 0,
               rank: RANKS[0], scoreRank: RANKS[0], bestScore: 0, totalRuns: 0,
               achievementCount: 0, achievementTotal: ACHIEVEMENTS.length,
               missionCount: 0, missionTotal: MISSIONS.length, maxLevel: MAX_LEVEL };
    }
  }

  function countCompletedMissions() {
    var c = 0;
    for (var i = 0; i < MISSIONS.length; i++) {
      var rec = state.missions[MISSIONS[i].id];
      if (rec && rec.completed) { c++; }
    }
    return c;
  }

  /* Called after every mutation: persist + tell the HUD once. */
  function touch() {
    state.updatedAt = now();
    state.level = levelFromXp(state.xp);
    save();
    emitProgress();
  }

  /* ===================================================================
   * 17. PUBLIC API
   * =================================================================== */

  function save() {
    try {
      state.version = SCHEMA_VERSION;
      return writeRaw(STORAGE_KEY, JSON.stringify(state));
    } catch (e) { return false; }
  }

  function load() {
    try {
      quiet++;
      var raw = readRaw(STORAGE_KEY);
      var parsed = null;
      if (raw) {
        try { parsed = JSON.parse(raw); } catch (e) { parsed = null; }
      }
      if (!parsed) {
        // look for a pre-release save and migrate it once
        for (var i = 0; i < LEGACY_KEYS.length; i++) {
          var legacy = readRaw(LEGACY_KEYS[i]);
          if (legacy) {
            try { parsed = JSON.parse(legacy); } catch (e2) { parsed = null; }
            if (parsed) { break; }
          }
        }
      }
      adopt(migrate(parsed));
      grantUnlocksUpTo(state.level); // keep entitlements in sync with level
      quiet--;
      emitProgress();
      return state;
    } catch (e) {
      quiet = 0;
      try { adopt(null); } catch (e2) { /* ignore */ }
      return state;
    }
  }

  function reset() {
    try {
      quiet++;
      removeRaw(STORAGE_KEY);
      for (var i = 0; i < LEGACY_KEYS.length; i++) { removeRaw(LEGACY_KEYS[i]); }
      adopt(null);
      quiet--;
      save();
      emitProgress();
      return state;
    } catch (e) {
      quiet = 0;
      return state;
    }
  }

  function setPlayer(name) {
    try {
      var clean = str(name, '');
      clean = clean.replace(/[\r\n\t]+/g, ' ').replace(/^\s+|\s+$/g, '').slice(0, 24);
      if (!clean) { clean = 'GUEST'; }
      state.player = clean;
      touch();
      return state.player;
    } catch (e) { return state.player; }
  }

  var Progress = {
    /* --- meta --- */
    VERSION: SCHEMA_VERSION,
    STORAGE_KEY: STORAGE_KEY,
    MAX_LEVEL: MAX_LEVEL,

    /* --- catalogs --- */
    RANKS: RANKS,
    MISSIONS: MISSIONS,
    ACHIEVEMENTS: ACHIEVEMENTS,
    UNLOCKS: UNLOCKS,

    /* --- live save --- */
    data: state,

    /* --- persistence --- */
    load: load,
    save: save,
    reset: reset,

    /* --- identity --- */
    setPlayer: setPlayer,

    /* --- currency + xp --- */
    addXP: addXP,
    addCoins: addCoins,
    spendCoins: spendCoins,

    /* --- curve + ranks --- */
    xpForLevel: xpForLevel,
    xpToReach: xpToReach,
    levelProgress: levelProgress,
    levelFromXp: levelFromXp,
    getLevel: function () { return levelFromXp(state.xp); },
    rankForScore: rankForScore,
    rankForLevel: rankForLevel,

    /* --- content --- */
    isUnlocked: isUnlocked,
    unlocksForLevel: unlocksForLevel,

    /* --- goals --- */
    trackEvent: trackEvent,
    completeMission: completeMission,
    missionProgress: missionProgress,
    unlockAchievement: unlockAchievement,
    hasAchievement: hasAchievement,

    /* --- runs --- */
    recordRun: recordRun,
    leaderboard: leaderboard,
    summary: summary
  };

  /* Progress.level is DERIVED from xp. A getter keeps it always correct;
   * if the host has no defineProperty we fall back to a synced number. */
  try {
    Object.defineProperty(Progress, 'level', {
      get: function () { return levelFromXp(state.xp); },
      enumerable: true
    });
  } catch (e) {
    Progress.level = levelFromXp(state.xp);
  }

  global.Progress = Progress;

  /* Read the save immediately so the very first HUD paint has real data.
   * (No DOM access, no timers — just localStorage.) */
  try { load(); } catch (e) { /* ignore */ }

})(typeof window !== 'undefined' ? window : this);
