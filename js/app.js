/* MUNDA — app orchestration: navigation, wiring, gallery, presentation mode */
(function () {
  'use strict';

  var KEY = 'munda_designs';
  var currentSort = 'top';
  var showcaseScore = null; // { total, sub } override for a loaded gallery design

  /* ---------- helpers ---------- */
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function zoneCount(state) {
    var n = 0, z;
    for (z in state.zones) if (state.zones[z]) n++;
    return n;
  }
  function genName(state) {
    var c = Interior.COLOR_LABELS[state.color] || 'Light';
    var p = Interior.PATTERN_LABELS[state.pattern] || '';
    var base = (c + ' ' + p).trim().toUpperCase();
    var existing = getDesigns().map(function (d) { return d.name; });
    var name = base, n = 1;
    while (existing.indexOf(name) !== -1) { n++; name = base + ' ' + n; }
    return name;
  }
  function toast(msg) {
    var t = document.getElementById('toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'toast'; t.className = 'toast';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._timer);
    t._timer = setTimeout(function () { t.classList.remove('show'); }, 2200);
  }

  /* ---------- gallery ---------- */
  function getDesigns() {
    try { return JSON.parse(localStorage.getItem(KEY) || '[]'); }
    catch (e) { return []; }
  }
  function setDesigns(list) { localStorage.setItem(KEY, JSON.stringify(list)); }

  function renderGallery() {
    var grid = document.getElementById('gallery-grid');
    var empty = document.getElementById('gallery-empty');
    var designs = getDesigns();
    var sorted = designs.slice().sort(function (a, b) {
      if (currentSort === 'top') return b.score - a.score;
      if (currentSort === 'innov') return (b.sub.innovation || 0) - (a.sub.innovation || 0);
      return b.date - a.date;
    });
    empty.hidden = sorted.length > 0;
    grid.innerHTML = '';
    sorted.forEach(function (d) {
      var card = document.createElement('div');
      card.className = 'gcard';
      card.style.setProperty('--gc', Interior.SOLID[d.state.color] || '#4df3ff');
      card.innerHTML =
        '<div class="gcard-top"><span class="gcard-name">' + esc(d.name) + '</span>' +
        '<span class="gcard-score">' + d.score + '%</span></div>' +
        '<div class="gcard-tags">' +
          '<span class="tag">Color <b>' + esc(Interior.COLOR_LABELS[d.state.color] || d.state.color) + '</b></span>' +
          '<span class="tag">Pattern <b>' + esc(Interior.PATTERN_LABELS[d.state.pattern] || d.state.pattern) + '</b></span>' +
          '<span class="tag">Material <b>' + esc(Interior.MATERIAL_LABELS[d.state.material] || d.state.material) + '</b></span>' +
        '</div>' +
        '<span class="gcard-swatch"></span>';
      card.addEventListener('click', function () { loadDesign(d); });
      grid.appendChild(card);
    });
  }

  function loadDesign(d) {
    Interior.setStateFull(d.state);
    showcaseScore = { total: d.score, sub: d.sub || {} };
    var nameEl = document.getElementById('design-name');
    if (nameEl) { nameEl.textContent = d.name; nameEl.dataset.custom = '1'; }
    go('showcase');
  }

  function saveDesign() {
    var state = Interior.getState();
    var extra = (Game.current() && Game.current().extra) || {};
    var score = Game.computeScore(state, extra);
    var name = genName(state);
    var designs = getDesigns();
    designs.push({ id: Date.now(), name: name, state: state, score: score.total, sub: score.sub, date: Date.now() });
    setDesigns(designs);
    if (Game.current()) Game.current().extra.savedDesign = true;
    var nameEl = document.getElementById('design-name');
    if (nameEl) { nameEl.textContent = name; nameEl.dataset.custom = '1'; }
    toast('DESIGN SAVED — ' + name);
    return { name: name, score: score };
  }

  /* ---------- showcase sync ---------- */
  function syncShowcase() {
    var state = Interior.getState();
    var score;
    if (showcaseScore) score = showcaseScore;
    else {
      var res = Game.lastResult();
      score = res ? res.playerScore : Game.computeScore(state, (Game.current() && Game.current().extra) || {});
    }
    var nameEl = document.getElementById('design-name');
    if (nameEl && !nameEl.dataset.custom) nameEl.textContent = genName(state);

    var tags = document.getElementById('design-tags');
    if (tags) {
      tags.innerHTML = '';
      addTag('Color', Interior.COLOR_LABELS[state.color]);
      addTag('Pattern', Interior.PATTERN_LABELS[state.pattern]);
      addTag('Material', Interior.MATERIAL_LABELS[state.material]);
      addTag('Zones', zoneCount(state) + '/6');
    }

    var num = document.getElementById('score-num');
    var ring = document.getElementById('score-ring');
    if (num) num.textContent = score.total + '%';
    if (ring) ring.style.setProperty('--score', score.total);

    var stats = document.getElementById('design-stats');
    var labels = { design: 'Design', innovation: 'Innovation', efficiency: 'Efficiency', integration: 'Integration', ux: 'UX' };
    if (stats) {
      stats.innerHTML = '';
      Object.keys(labels).forEach(function (k) {
        var row = document.createElement('div');
        row.className = 'stat';
        row.innerHTML = '<span>' + labels[k] + '</span><b>' + (score.sub[k] != null ? score.sub[k] : 0) + '%</b>';
        stats.appendChild(row);
      });
    }
  }
  function addTag(label, value) {
    var tags = document.getElementById('design-tags');
    var t = document.createElement('span');
    t.className = 'tag';
    t.innerHTML = label + ' <b>' + esc(value || '—') + '</b>';
    tags.appendChild(t);
  }

  /* ---------- zone buttons for challenge/jury ---------- */
  function buildZoneButtons() {
    ['challenge-zones', 'jury-zones'].forEach(function (id) {
      var c = document.getElementById(id);
      if (!c || c.children.length) return;
      Interior.ZONES.forEach(function (z) {
        var b = document.createElement('button');
        b.className = 'zone-btn';
        b.setAttribute('data-zone', z);
        b.innerHTML = '<i></i>' + Interior.ZONE_LABELS[z];
        c.appendChild(b);
      });
    });
  }

  /* ---------- navigation ---------- */
  function go(id) {
    stopAnyOverlay();
    document.querySelectorAll('.screen').forEach(function (s) {
      s.classList.toggle('active', s.getAttribute('data-screen') === id);
    });
    document.body.dataset.screen = id;
    document.querySelectorAll('#nav a').forEach(function (a) {
      a.classList.toggle('current', a.getAttribute('data-nav') === id);
    });

    if (id === 'textile') Lab.enterTextile();
    if (id === 'kosova') Lab.animateKosova();
    if (id === 'challenge' || id === 'jury') {
      showcaseScore = null;
      var ne = document.getElementById('design-name');
      if (ne) delete ne.dataset.custom;
    }
    if (id === 'challenge') Game.startChallenge();
    if (id === 'jury') Game.startJury();
    if (id === 'showcase') syncShowcase();
    if (id === 'gallery') renderGallery();
  }
  function stopAnyOverlay() {
    if (Game) Game.stopLightShow();
  }

  /* ---------- wiring ---------- */
  function wireButtons() {
    var present = document.getElementById('btn-present');
    if (present) present.addEventListener('click', function () {
      document.body.classList.toggle('present');
      present.classList.toggle('on', document.body.classList.contains('present'));
      if (document.body.classList.contains('present') && document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(function () {});
      }
    });

    var labLight = document.getElementById('lab-lightshow');
    if (labLight) labLight.addEventListener('click', Game.runLightShow);
    var lsClose = document.getElementById('lightshow-close');
    if (lsClose) lsClose.addEventListener('click', Game.stopLightShow);

    var challengeFinish = document.getElementById('challenge-finish');
    if (challengeFinish) challengeFinish.addEventListener('click', function () { Game.finishChallenge(); });

    var juryLight = document.getElementById('jury-lightshow');
    if (juryLight) juryLight.addEventListener('click', Game.runLightShow);
    var juryFinish = document.getElementById('jury-finish');
    if (juryFinish) juryFinish.addEventListener('click', function () { Game.reveal(function () { Game.finishJury(); }); });

    var beatSave = document.getElementById('beat-save');
    if (beatSave) beatSave.addEventListener('click', function () { saveDesign(); go('gallery'); });

    var saveBtn = document.getElementById('save-design');
    if (saveBtn) saveBtn.addEventListener('click', function () { saveDesign(); });

    var replay = document.getElementById('replay-show');
    if (replay) replay.addEventListener('click', Game.runLightShow);

    var finishExp = document.getElementById('finish-experience');
    if (finishExp) finishExp.addEventListener('click', function () { Game.playFinale(); });

    var galleryFinish = document.getElementById('gallery-finish');
    if (galleryFinish) galleryFinish.addEventListener('click', function () { Game.playFinale(); });

    var restart = document.getElementById('finale-restart');
    if (restart) restart.addEventListener('click', function () {
      Game.closeFinale();
      resetAll();
      go('landing');
    });

    document.querySelectorAll('.sort').forEach(function (s) {
      s.addEventListener('click', function () {
        currentSort = s.getAttribute('data-sort');
        document.querySelectorAll('.sort').forEach(function (x) { x.classList.toggle('active', x === s); });
        renderGallery();
      });
    });
  }

  function resetAll() {
    showcaseScore = null;
    Interior.reset();
    var ne = document.getElementById('design-name');
    if (ne) { delete ne.dataset.custom; ne.textContent = 'UNTITLED DESIGN'; }
  }

  /* ---------- delegated control + nav listeners ---------- */
  document.addEventListener('click', function (e) {
    var ctl = e.target.closest('[data-ctl]');
    if (ctl && ctl.getAttribute('data-ctl') !== 'brightness') {
      Interior.setState(ctl.getAttribute('data-ctl'), ctl.getAttribute('data-value'));
      return;
    }
    var zone = e.target.closest('[data-zone]');
    if (zone) { Interior.toggleZone(zone.getAttribute('data-zone')); return; }
    var mode = e.target.closest('[data-mode]');
    if (mode) { Interior.applyMode(mode.getAttribute('data-mode')); return; }
  });
  document.addEventListener('click', function (e) {
    var nav = e.target.closest('[data-nav]');
    if (nav) { go(nav.getAttribute('data-nav')); }
  });
  document.addEventListener('input', function (e) {
    if (e.target.matches('[data-ctl="brightness"]')) {
      Interior.setState('brightness', parseInt(e.target.value, 10) || 0);
    }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (Game && Game.lightShowRunning) Game.stopLightShow();
      else if (!document.getElementById('finale').hidden) Game.closeFinale();
    }
  });

  /* ---------- init ---------- */
  function init() {
    buildZoneButtons();
    Interior.init();
    Lab.init();
    window.onDesignChange = syncShowcase;
    document.body.dataset.screen = 'landing';
    wireButtons();
    syncShowcase();
  }

  window.App = {
    init: init,
    go: go,
    saveDesign: saveDesign,
    renderGallery: renderGallery,
    syncShowcase: syncShowcase,
    resetAll: resetAll
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
