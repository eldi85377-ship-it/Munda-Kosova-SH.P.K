/* MUNDA — interior lighting engine
   Owns the design state, applies lighting to the SVG interior, and exposes
   a small API for the rest of the app. */
(function () {
  'use strict';

  var SVG_NS = 'http://www.w3.org/2000/svg';

  /* ---- palettes / catalogs ---- */
  var COLORS = {
    red: '#ff2d55', blue: '#2d6bff', cyan: '#4df3ff', purple: '#9a4dff',
    green: '#35e07f', gold: '#e8c87a', white: '#ffffff', gradient: 'url(#lg-grad)'
  };
  var SOLID = {
    red: '#ff2d55', blue: '#2d6bff', cyan: '#4df3ff', purple: '#9a4dff',
    green: '#35e07f', gold: '#e8c87a', white: '#ffffff', gradient: '#6ea8ff'
  };
  var COLOR_LABELS = { red: 'Red', blue: 'Blue', cyan: 'Cyan', purple: 'Purple', green: 'Green', gold: 'Gold', white: 'White', gradient: 'Custom Gradient' };
  var PATTERN_LABELS = { linear: 'Linear', wave: 'Wave', flow: 'Flow', pulse: 'Pulse', dots: 'Dots', dynamic: 'Dynamic', custom: 'Custom' };
  var MATERIAL_LABELS = { carbon: 'Carbon Weave', knit: 'Soft Knit', mesh: 'Tech Mesh', silk: 'Lumen Silk' };
  var MODE_LABELS = { city: 'City', sport: 'Sport', night: 'Night', eco: 'Eco' };
  var ZONE_LABELS = { dashboard: 'Dashboard', doors: 'Door Panels', console: 'Center Console', footwell: 'Footwell', seats: 'Seats', roof: 'Roof / Ambient' };
  var ZONES = ['dashboard', 'doors', 'console', 'footwell', 'seats', 'roof'];

  /* bilingual zone labels for the build UI */
  var ZONE_LABELS_SQ = { dashboard: 'Pulti', doors: 'Dyer', console: 'Konsola', footwell: 'Hapësira e këmbëve', seats: 'Vendet', roof: 'Çatia / Ambient' };

  var PATTERNS = {
    linear: { dash: 'none' },
    wave: { dash: '26 16' },
    flow: { dash: '52 460' },
    pulse: { dash: 'none' },
    dots: { dash: '0.1 26' },
    dynamic: { dash: '9 11' },
    custom: { dash: '3 2 14 6 42 15' }
  };
  var SPEEDS = { slow: '4s', medium: '2.2s', fast: '1s' };
  var MODES = {
    city:  { color: 'blue',    pattern: 'wave',    animation: 'flow',      brightness: 55, speed: 'medium' },
    sport: { color: 'red',     pattern: 'dynamic', animation: 'dynamic',   brightness: 90, speed: 'fast' },
    night: { color: 'purple',  pattern: 'linear',  animation: 'breathing', brightness: 30, speed: 'slow' },
    eco:   { color: 'green',   pattern: 'pulse',   animation: 'pulse',     brightness: 25, speed: 'slow' }
  };

  function defaultState() {
    return {
      zones: { dashboard: true, doors: false, console: false, footwell: false, seats: false, roof: true },
      color: 'green',
      pattern: 'linear',
      brightness: 70,
      animation: 'static',
      speed: 'medium',
      material: 'carbon',
      mode: 'city'
    };
  }

  var state = defaultState();

  function solidColor(color) { return SOLID[color] || '#2d6bff'; }
  function dashPeriod(dash) {
    if (!dash || dash === 'none') return 0;
    var nums = dash.split(/[\s,]+/).map(Number);
    var s = 0;
    for (var i = 0; i < nums.length; i++) s += nums[i];
    return s;
  }
  function dashFor(pattern, animation) {
    var p = PATTERNS[pattern];
    var dash = p ? p.dash : 'none';
    if (dash === 'none' && (animation === 'flow' || animation === 'wave' || animation === 'dynamic')) {
      dash = '60 420';
    }
    return dash;
  }

  function ensureGradient() {
    var defs = document.querySelector('#interior defs');
    if (!defs || document.getElementById('lg-grad')) return;
    var lg = document.createElementNS(SVG_NS, 'linearGradient');
    lg.id = 'lg-grad';
    lg.setAttribute('x1', '0');
    lg.setAttribute('x2', '1');
    var stops = [['0%', '#2d6bff'], ['55%', '#7ab3ff'], ['100%', '#ffffff']];
    for (var i = 0; i < stops.length; i++) {
      var s = document.createElementNS(SVG_NS, 'stop');
      s.setAttribute('offset', stops[i][0]);
      s.setAttribute('stop-color', stops[i][1]);
      lg.appendChild(s);
    }
    defs.appendChild(lg);
  }

  function applyAnim(el, anim, speed, dash) {
    el.classList.remove('lt-pulse', 'lt-flow', 'lt-wave', 'lt-breath', 'lt-dynamic');
    el.style.setProperty('--lt-speed', SPEEDS[speed] || '2.2s');
    var isFill = el.tagName.toLowerCase() === 'ellipse';
    switch (anim) {
      case 'pulse':
        el.classList.add('lt-pulse');
        el.style.setProperty('--lt-min', '0.3'); el.style.setProperty('--lt-max', '1');
        break;
      case 'breathing':
        el.classList.add('lt-breath');
        el.style.setProperty('--lt-min', '0.15'); el.style.setProperty('--lt-max', '0.9');
        break;
      case 'flow':
        if (!isFill) { el.classList.add('lt-flow'); setShift(el, dash); } else { el.classList.add('lt-pulse'); }
        break;
      case 'wave':
        if (!isFill) { el.classList.add('lt-wave'); setShift(el, dash); } else { el.classList.add('lt-pulse'); }
        break;
      case 'dynamic':
        if (!isFill) { el.classList.add('lt-dynamic'); setShift(el, dash); } else { el.classList.add('lt-breath'); }
        break;
      default:
        break; // static
    }
  }
  function setShift(el, dash) {
    var p = dashPeriod(dash) || 480;
    el.style.setProperty('--lt-shift', '-' + p + 'px');
  }

  function applyReflection() {
    var c = SOLID[state.color] || '#2d6bff';
    var b = state.brightness / 100;
    var anyOn = false;
    var refs = document.querySelectorAll('#reflect .reflect');
    for (var i = 0; i < refs.length; i++) {
      var el = refs[i];
      var zone = el.getAttribute('data-zone');
      var on = !!state.zones[zone];
      if (on) anyOn = true;
      // per-surface bounce strength (glossiness)
      var base = 0.08;
      if (zone === 'footwell') base = 0.15;
      else if (zone === 'dashboard') base = 0.12;
      else if (zone === 'roof') base = 0.09;
      var op = on ? (base + 0.18 * b) : 0;
      el.style.fill = c;
      el.style.fillOpacity = op.toFixed(3);
    }
    // ambient cabin wash: whole cabin softly picks up the light colour
    var wash = document.getElementById('cabin-wash');
    if (wash) {
      wash.style.fill = c;
      wash.style.fillOpacity = anyOn ? (0.05 + 0.11 * b).toFixed(3) : '0';
    }
  }

  function applyLighting() {
    var c = COLORS[state.color] || COLORS.cyan;
    var groups = document.querySelectorAll('#lights .zone');
    for (var g = 0; g < groups.length; g++) {
      var group = groups[g];
      var zone = group.getAttribute('data-zone');
      var active = !!state.zones[zone];
      group.classList.toggle('on', active);
      if (!active) continue;
      var strips = group.querySelectorAll('.strip-core, .strip-bloom');
      for (var s = 0; s < strips.length; s++) {
        var el = strips[s];
        var isCore = el.classList.contains('strip-core');
        var isFill = el.tagName.toLowerCase() === 'ellipse';
        if (isFill) { el.setAttribute('fill', c); el.removeAttribute('stroke'); }
        else { el.setAttribute('stroke', c); el.removeAttribute('fill'); }
        var b = state.brightness;
        var op = isCore ? (0.25 + 0.75 * (b / 100)) : (0.10 + 0.55 * (b / 100));
        el.style.opacity = op.toFixed(3);
        var dash = dashFor(state.pattern, state.animation);
        if (!isFill) {
          if (dash === 'none') { el.style.strokeDasharray = 'none'; el.style.strokeDashoffset = '0'; }
          else { el.style.strokeDasharray = dash; el.style.strokeDashoffset = '0'; }
        }
        applyAnim(el, state.animation, state.speed, dash);
      }
    }
    // selection highlights
    var hls = document.querySelectorAll('#highlights [data-hl]');
    for (var h = 0; h < hls.length; h++) {
      hls[h].classList.toggle('selected', !!state.zones[hls[h].getAttribute('data-hl')]);
    }
    // material overlay
    applyMaterial(state.material);
    // dynamic light bounce + ambient wash
    applyReflection();
    // tint the whole UI accent to match the light
    document.documentElement.style.setProperty('--accent', solidColor(state.color));
  }

  function applyMaterial(material) {
    var layer = document.getElementById('material-layer');
    if (!layer) return;
    var fill = 'url(#p-' + (material || 'carbon') + ')';
    var paths = layer.children;
    for (var i = 0; i < paths.length; i++) {
      paths[i].setAttribute('fill', fill);
    }
  }

  function syncControls() {
    var ctls = document.querySelectorAll('[data-ctl]');
    for (var i = 0; i < ctls.length; i++) {
      var el = ctls[i];
      var key = el.getAttribute('data-ctl');
      var val = el.getAttribute('data-value');
      if (key === 'brightness') {
        el.value = state.brightness;
        el.style.setProperty('--fill', state.brightness + '%');
      } else {
        var locked = el.hasAttribute('data-unlock') &&
          window.Progress && !Progress.isUnlocked(el.getAttribute('data-unlock'));
        el.classList.toggle('active', !locked && state[key] === val);
      }
    }
    var modes = document.querySelectorAll('[data-mode]');
    for (var m = 0; m < modes.length; m++) {
      modes[m].classList.toggle('active', state.mode === modes[m].getAttribute('data-mode'));
    }
    var zones = document.querySelectorAll('[data-zone]');
    for (var z = 0; z < zones.length; z++) {
      var zb = zones[z];
      if (zb.closest('#lights')) continue;
      zb.classList.toggle('active', !!state.zones[zb.getAttribute('data-zone')]);
    }
    var pct = state.brightness + '%';
    ['#bright-val', '#challenge-bright-val', '#jury-bright-val'].forEach(function (id) {
      var n = document.getElementById(id);
      if (n) n.textContent = pct;
    });
  }

  function setState(key, value) {
    if (!(key in state)) return;
    state[key] = value;
    applyLighting();
    syncControls();
    if (key === 'brightness') {
      var hint = document.getElementById('bright-hint');
      if (hint) {
        hint.style.color = value > 78 ? 'var(--warn)' : '';
        hint.textContent = value > 78
          ? (window.I18N ? I18N.t('light.brightWarn', 'High brightness looks great — but costs energy and heat.') : 'High brightness looks great — but costs energy and heat.')
          : (window.I18N ? I18N.t('light.brightHint', 'High brightness looks great — but costs energy and heat.') : 'High brightness looks great — but costs energy and heat.');
      }
    }
    if (window.onDesignChange) window.onDesignChange();
  }

  function toggleZone(name) {
    if (!(name in state.zones)) return;
    state.zones[name] = !state.zones[name];
    applyLighting();
    syncControls();
    if (window.onDesignChange) window.onDesignChange();
  }

  function setZones(obj) {
    state.zones = obj;
    applyLighting();
    syncControls();
    if (window.onDesignChange) window.onDesignChange();
  }

  function applyMode(name) {
    var preset = MODES[name];
    if (!preset) return;
    state.mode = name;
    state.color = preset.color;
    state.pattern = preset.pattern;
    state.animation = preset.animation;
    state.brightness = preset.brightness;
    state.speed = preset.speed;
    applyLighting();
    syncControls();
    if (window.onDesignChange) window.onDesignChange();
  }

  function reset(preset) {
    state = defaultState();
    if (preset) {
      for (var k in preset) {
        if (k === 'zones') { state.zones = preset.zones; }
        else if (k in state) { state[k] = preset[k]; }
      }
    }
    applyLighting();
    syncControls();
    if (window.onDesignChange) window.onDesignChange();
  }

  function getState() { return JSON.parse(JSON.stringify(state)); }
  function setStateFull(next) {
    state = next;
    applyLighting();
    syncControls();
    if (window.onDesignChange) window.onDesignChange();
  }

  /* ---- zone tooltip ---- */
  function initTooltip() {
    var tip = document.getElementById('zone-tip');
    if (!tip) return;
    var hits = document.querySelectorAll('#zone-hits [data-zone]');
    for (var i = 0; i < hits.length; i++) {
      var hit = hits[i];
      hit.addEventListener('mouseenter', function (e) {
        tip.textContent = ZONE_LABELS[e.target.getAttribute('data-zone')] || '';
        tip.classList.add('show');
      });
      hit.addEventListener('mousemove', function (e) {
        tip.style.left = e.clientX + 'px';
        tip.style.top = e.clientY + 'px';
      });
      hit.addEventListener('mouseleave', function () { tip.classList.remove('show'); });
    }
  }

  /* ---- build invisible hit areas over each zone ---- */
  function buildHits() {
    var svg = document.getElementById('interior');
    if (!svg || document.getElementById('zone-hits')) return;
    var hitsGroup = document.createElementNS(SVG_NS, 'g');
    hitsGroup.id = 'zone-hits';
    svg.appendChild(hitsGroup);
    var refs = document.querySelectorAll('#highlights [data-hl]');
    for (var i = 0; i < refs.length; i++) {
      var el = refs[i];
      var zone = el.getAttribute('data-hl');
      var hit;
      if (el.tagName.toLowerCase() === 'ellipse') {
        hit = document.createElementNS(SVG_NS, 'rect');
        var cx = parseFloat(el.getAttribute('cx')), cy = parseFloat(el.getAttribute('cy'));
        var rx = parseFloat(el.getAttribute('rx')), ry = parseFloat(el.getAttribute('ry'));
        hit.setAttribute('x', cx - rx); hit.setAttribute('y', cy - ry);
        hit.setAttribute('width', rx * 2); hit.setAttribute('height', ry * 2);
        hit.style.pointerEvents = 'all'; hit.style.fill = 'transparent';
      } else {
        hit = document.createElementNS(SVG_NS, 'path');
        hit.setAttribute('d', el.getAttribute('d'));
        hit.style.pointerEvents = 'stroke'; hit.style.stroke = 'transparent';
        hit.style.strokeWidth = '46'; hit.style.fill = 'none';
      }
      hit.setAttribute('data-zone', zone);
      hit.style.cursor = 'pointer';
      hitsGroup.appendChild(hit);
    }
    initTooltip();
  }

  function init() {
    ensureGradient();
    buildHits();
    applyLighting();
    syncControls();
  }

  window.Interior = {
    state: state,
    init: init,
    applyLighting: applyLighting,
    setState: setState,
    toggleZone: toggleZone,
    setZones: setZones,
    applyMode: applyMode,
    reset: reset,
    getState: getState,
    setStateFull: setStateFull,
    syncControls: syncControls,
    COLORS: COLORS,
    SOLID: SOLID,
    COLOR_LABELS: COLOR_LABELS,
    PATTERN_LABELS: PATTERN_LABELS,
    MATERIAL_LABELS: MATERIAL_LABELS,
    MODE_LABELS: MODE_LABELS,
    ZONE_LABELS: ZONE_LABELS,
    ZONES: ZONES,
    MODES: MODES,
    defaultState: defaultState,
    zoneLabel: function (z) {
      var sq = ZONE_LABELS_SQ[z];
      if (sq && window.I18N && I18N.lang === 'sq') return sq;
      return ZONE_LABELS[z] || z;
    }
  };
})();
