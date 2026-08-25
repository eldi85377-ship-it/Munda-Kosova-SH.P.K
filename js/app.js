/* =====================================================================
   MUNDA — app orchestration for the FUTURE LAB experience:
   navigation, global control wiring, gallery, presentation mode.
   The build flow itself lives in futurelab.js; this module is the glue.
   ===================================================================== */
(function () {
  'use strict';

  var KEY = 'munda_designs';
  var currentSort = 'top';

  /* ---------- helpers ---------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function zoneCount(state) {
    var n = 0, z;
    for (z in state.zones) if (state.zones[z]) n++;
    return n;
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
    t._timer = setTimeout(function () { t.classList.remove('show'); }, 2400);
  }
  function sfx(n) { if (window.Sound) { try { Sound.sfx(n); } catch (e) {} } }

  /* ---------- gallery ---------- */
  function getDesigns() {
    try { return JSON.parse(localStorage.getItem(KEY) || '[]'); }
    catch (e) { return []; }
  }
  function setDesigns(list) { try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) {} }

  function genName(state) {
    var c = (window.Interior && Interior.COLOR_LABELS[state.color]) || 'Light';
    var p = (window.Interior && Interior.PATTERN_LABELS[state.pattern]) || '';
    var base = ((c || '') + ' ' + (p || '')).trim().toUpperCase() || 'MUNDA DESIGN';
    var existing = getDesigns().map(function (d) { return d.name; });
    var name = base, n = 1;
    while (existing.indexOf(name) !== -1) { n++; name = base + ' ' + n; }
    return name;
  }

  function renderGallery() {
    var grid = document.getElementById('gallery-grid');
    var empty = document.getElementById('gallery-empty');
    if (!grid) return;
    var designs = getDesigns();
    var sorted = designs.slice().sort(function (a, b) {
      if (currentSort === 'top') return b.score - a.score;
      if (currentSort === 'innov') return (b.sub.innovation || b.sub.design || 0) - (a.sub.innovation || a.sub.design || 0);
      return b.date - a.date;
    });
    if (empty) empty.hidden = sorted.length > 0;
    grid.innerHTML = '';
    sorted.forEach(function (d) {
      var card = document.createElement('div');
      card.className = 'gcard';
      var col = (window.Interior && Interior.SOLID[d.state.color]) || '#4df3ff';
      card.style.setProperty('--gc', col);
      var sub = d.sub || {};
      card.innerHTML =
        '<div class="gcard-top"><span class="gcard-name">' + esc(d.name) + '</span>' +
        '<span class="gcard-score">' + d.score + '%</span></div>' +
        '<div class="gcard-mini">' + miniInterior(d.state) + '</div>' +
        '<div class="gcard-tags">' +
        '<span class="tag">Color <b>' + esc((window.Interior && Interior.COLOR_LABELS[d.state.color]) || d.state.color) + '</b></span>' +
        '<span class="tag">Pattern <b>' + esc((window.Interior && Interior.PATTERN_LABELS[d.state.pattern]) || d.state.pattern) + '</b></span>' +
        '<span class="tag">Material <b>' + esc((window.Interior && Interior.MATERIAL_LABELS[d.state.material]) || d.state.material) + '</b></span>' +
        '</div>' +
        '<span class="gcard-swatch"></span>';
      card.addEventListener('click', function () { loadDesign(d); });
      grid.appendChild(card);
    });
  }

  function miniInterior(state) {
    var c = (window.Interior && Interior.SOLID[state.color]) || '#2d6bff';
    var z = state.zones || {};
    function s(cond) { return cond ? c : '#1d1f26'; }
    return '<svg viewBox="0 0 120 56" aria-hidden="true">' +
      '<rect width="120" height="56" rx="8" fill="#0a0b10"/>' +
      '<path d="M14 10 Q60 6 106 10" fill="none" stroke="' + s(z.roof) + '" stroke-width="4" stroke-linecap="round" opacity=".9"/>' +
      '<path d="M14 30 Q60 27 106 30" fill="none" stroke="' + s(z.dashboard) + '" stroke-width="4" stroke-linecap="round" opacity=".9"/>' +
      '<path d="M8 16 V46 M112 16 V46" fill="none" stroke="' + s(z.doors) + '" stroke-width="3" opacity=".9"/>' +
      '<path d="M58 24 V46" fill="none" stroke="' + s(z.console) + '" stroke-width="3" opacity=".9"/>' +
      '<rect x="28" y="12" width="12" height="9" rx="3" fill="' + s(z.seats) + '" opacity=".8"/>' +
      '<rect x="80" y="12" width="12" height="9" rx="3" fill="' + s(z.seats) + '" opacity=".8"/>' +
      '<ellipse cx="60" cy="52" rx="48" ry="3.5" fill="' + s(z.footwell) + '" opacity=".6"/>' +
      '</svg>';
  }

  function loadDesign(d) {
    if (window.Interior) Interior.setStateFull(d.state);
    if (window.FutureLab) {
      FutureLab.showResult({ total: d.score, sub: d.sub || {}, tests: [], testsPassed: 0, mistakes: 0 }, { silent: true });
    }
    go('result');
    toast('DESIGN LOADED — ' + d.name);
  }

  function saveDesign() {
    if (!window.Interior) return null;
    var state = Interior.getState();
    var score = (window.Game ? Game.computeScore(state, {}) : null) ||
      (window.FutureLab ? FutureLab.computeScore() : null);
    if (!score) score = { total: 70, sub: { design: 70 } };
    var name = genName(state);
    var designs = getDesigns();
    designs.push({ id: Date.now(), name: name, state: state, score: score.total, sub: score.sub, date: Date.now() });
    setDesigns(designs);
    sfx('collect');
    if (window.Progress) { try { Progress.trackEvent('design', {}); } catch (e) {} }
    toast('DESIGN SAVED — ' + name);
    return { name: name, score: score };
  }

  /* ---------- zone buttons (jury) ---------- */
  function buildZoneButtons() {
    ['jury-zones'].forEach(function (id) {
      var c = document.getElementById(id);
      if (!c || c.children.length || !window.Interior) return;
      Interior.ZONES.forEach(function (z) {
        var b = document.createElement('button');
        b.className = 'zone-btn';
        b.setAttribute('data-zone', z);
        b.innerHTML = '<i></i>' + esc(Interior.zoneLabel(z) || z);
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

    if (id === 'story' && window.Lab) Lab.enterTextile();
    if (id === 'kosova' && window.Lab) Lab.animateKosova();
    if (id === 'hub' && window.FutureLab) FutureLab.renderHub();
    if (id === 'jury' && window.Game) Game.startJury();
    if (id === 'gallery') renderGallery();
    if (window.FX) { try { FX.clear(); } catch (e) {} }
  }
  function stopAnyOverlay() {
    if (window.Game) { try { Game.stopLightShow(); } catch (e) {} }
    if (window.FutureLab) { try { FutureLab.skipCinematic(); } catch (e) {} }
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

    var lsClose = document.getElementById('lightshow-close');
    if (lsClose) lsClose.addEventListener('click', function () { if (window.Game) Game.stopLightShow(); });

    var juryLight = document.getElementById('jury-lightshow');
    if (juryLight) juryLight.addEventListener('click', function () { if (window.Game) Game.runLightShow(); });
    var juryFinish = document.getElementById('jury-finish');
    if (juryFinish) juryFinish.addEventListener('click', function () {
      if (window.Game) Game.reveal(function () { Game.finishJury(); });
    });

    var saveBtn = document.getElementById('result-save');
    if (saveBtn) saveBtn.addEventListener('click', function () { saveDesign(); });

    document.querySelectorAll('.sort').forEach(function (s) {
      s.addEventListener('click', function () {
        currentSort = s.getAttribute('data-sort');
        document.querySelectorAll('.sort').forEach(function (x) { x.classList.toggle('active', x === s); });
        renderGallery();
        sfx('click');
      });
    });

    var restart = document.getElementById('finale-restart');
    if (restart) restart.addEventListener('click', function () {
      if (window.Game) Game.closeFinale();
      if (window.Interior) Interior.reset();
      if (window.Progress) { try { Progress.load(); } catch (e) {} }
      go('hub');
    });
  }

  /* ---------- delegated control + nav listeners ---------- */
  document.addEventListener('click', function (e) {
    var ctl = e.target.closest('[data-ctl]');
    if (ctl && ctl.getAttribute('data-ctl') !== 'brightness' && window.Interior) {
      Interior.setState(ctl.getAttribute('data-ctl'), ctl.getAttribute('data-value'));
      return;
    }
    var zone = e.target.closest('[data-zone]');
    if (zone && window.Interior) { Interior.toggleZone(zone.getAttribute('data-zone')); return; }
    var mode = e.target.closest('[data-mode]');
    if (mode && window.Interior) { Interior.applyMode(mode.getAttribute('data-mode')); return; }
  });
  document.addEventListener('click', function (e) {
    var nav = e.target.closest('[data-nav]');
    if (nav) go(nav.getAttribute('data-nav'));
  });
  document.addEventListener('input', function (e) {
    if (e.target.matches('[data-ctl="brightness"]') && window.Interior) {
      Interior.setState('brightness', parseInt(e.target.value, 10) || 0);
    }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (window.Game && Game.lightShowRunning) Game.stopLightShow();
      else if (window.Game) { try { Game.closeFinale(); } catch (err) {} }
    }
  });

  /* ---------- design-change hook (live preview refresh) ---------- */
  window.onDesignChange = function () {
    if (window.FutureLab) {
      try {
        FutureLab.refreshHUD();
        FutureLab.renderPreview();
      } catch (e) {}
    }
  };

  /* ---------- init ---------- */
  function init() {
    if (window.Progress) { try { Progress.load(); } catch (e) {} }
    buildZoneButtons();
    if (window.Interior) Interior.init();
    if (window.Lab) Lab.init();
    if (window.FutureLab) FutureLab.init();
    if (window.Particles) { try { Particles.start(); } catch (e) {} }
    wireButtons();
    document.body.dataset.screen = 'boot';
  }

  window.App = {
    init: init,
    go: go,
    saveDesign: saveDesign,
    renderGallery: renderGallery,
    resetAll: function () { if (window.Interior) Interior.reset(); }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
