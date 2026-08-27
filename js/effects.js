/* =====================================================================
   MUNDA — premium micro-interactions (index.html)
   ---------------------------------------------------------------------
   Adds four subtle, premium effects on top of the existing site:
     ✨ Cursor glow     — a soft green/blue halo trailing the pointer
     ⚡ Magnetic buttons — buttons lean toward the cursor on hover
     🔄 3D tilt         — cards/images tilt under the pointer
     🟢 Neon scan line  — a thin light line sweeping down the page

   Everything is defensive (no-ops if elements are missing), respects
   prefers-reduced-motion, and skips touch-only devices where a cursor
   doesn't exist. The existing scroll-reveal + glassmorphism already live
   in site.js / dark.css.
   ===================================================================== */
(function () {
  'use strict';

  function qsa(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }

  var reduced = false;
  try { reduced = matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
  var coarse = false;
  try { coarse = matchMedia('(pointer: coarse)').matches; } catch (e) {}

  /* ------------------------------------------------------------------
     ✨ CURSOR GLOW — a lerp-smoothed halo that follows the pointer and
     expands when it nears interactive elements.
     ------------------------------------------------------------------ */
  function cursorGlow() {
    if (reduced || coarse) return;
    var g = document.createElement('div');
    g.className = 'cursor-glow';
    document.body.appendChild(g);

    var mx = window.innerWidth / 2, my = window.innerHeight / 2;
    var tx = mx, ty = my, raf = null;

    function onMove(e) {
      tx = e.clientX; ty = e.clientY;
      if (!raf) {
        raf = requestAnimationFrame(function () {
          mx += (tx - mx) * 0.16;
          my += (ty - my) * 0.16;
          g.style.transform = 'translate3d(' + mx + 'px,' + my + 'px,0)';
          raf = null;
        });
      }
    }

    var NEAR = 'a, button, .mc-card, .tech-card, .team-card, .g-tile, .cc-swatch, input, select';
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', function () { g.classList.add('on'); }, { passive: true });
    window.addEventListener('pointerover', function (e) {
      if (e.target && e.target.closest && e.target.closest(NEAR)) g.classList.add('near');
    }, { passive: true });
    window.addEventListener('pointerout', function (e) {
      if (e.target && e.target.closest && e.target.closest(NEAR)) g.classList.remove('near');
    }, { passive: true });

    g.classList.add('on');
  }

  /* ------------------------------------------------------------------
     ⚡ MAGNETIC BUTTONS — buttons translate slightly toward the pointer.
     ------------------------------------------------------------------ */
  function magnetic() {
    if (reduced || coarse) return;
    qsa('.btn, .btn-primary, .btn-ghost, .btn-huge, .btn-xl, .btn-lg, .btn-sm').forEach(function (el) {
      var strength = 0.2;
      el.addEventListener('pointermove', function (e) {
        var b = el.getBoundingClientRect();
        var dx = (e.clientX - (b.left + b.width / 2)) * strength;
        var dy = (e.clientY - (b.top + b.height / 2)) * strength;
        dx = Math.max(-12, Math.min(12, dx));
        dy = Math.max(-8, Math.min(8, dy));
        el.style.transition = 'transform .12s ease-out';
        el.style.transform = 'translate(' + dx.toFixed(2) + 'px,' + dy.toFixed(2) + 'px)';
      });
      el.addEventListener('pointerleave', function () {
        el.style.transition = '';
        el.style.transform = '';
      });
    });
  }

  /* ------------------------------------------------------------------
     🔄 3D TILT — cards & images rotate subtly under the pointer.
     The hero visual tilts less (big element), small cards tilt more.
     ------------------------------------------------------------------ */
  function tilt() {
    if (reduced || coarse) return;
    var targets = [
      { sel: '.tech-card, .g-tile, .team-card, .mc-card, .about-photo-main, .about-photo-detail, .conf-stage', max: 7 },
      { sel: '.hero-svg', max: 3.5 }
    ];
    targets.forEach(function (group) {
      qsa(group.sel).forEach(function (el) {
        // don't double-bind; skip elements that hold magnetic buttons
        if (el.dataset.tilt) return;
        el.dataset.tilt = '1';
        el.classList.add('tilt');
        el.addEventListener('pointermove', function (e) {
          var b = el.getBoundingClientRect();
          var px = (e.clientX - b.left) / b.width - 0.5;
          var py = (e.clientY - b.top) / b.height - 0.5;
          el.style.transform =
            'perspective(900px) rotateX(' + (-py * group.max).toFixed(2) +
            'deg) rotateY(' + (px * group.max).toFixed(2) + 'deg)';
        });
        el.addEventListener('pointerleave', function () {
          el.style.transform = '';
        });
      });
    });
  }

  /* ------------------------------------------------------------------
     🟢 NEON SCAN LINE — a thin light line sweeping down the page.
     ------------------------------------------------------------------ */
  function scanline() {
    if (reduced) return;
    var s = document.createElement('div');
    s.className = 'scanline';
    s.setAttribute('aria-hidden', 'true');
    document.body.appendChild(s);
  }

  function init() {
    cursorGlow();
    magnetic();
    tilt();
    scanline();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
