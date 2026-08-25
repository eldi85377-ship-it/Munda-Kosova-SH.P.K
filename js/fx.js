/* =====================================================================
   MUNDA FUTURE LAB — visual effects engine
   ---------------------------------------------------------------------
   One full-screen canvas + a few DOM flourishes. Makes every important
   action feel satisfying: bursts, beams, confetti, screen shake,
   floating text, cinematic letterbox and slow-motion for the WOW moment.

   PUBLIC API (window.FX):
     FX.init() / FX.burst(x,y,opts) / FX.burstAt(el,opts) / FX.confetti(opts)
     FX.sparkle(el,opts) / FX.trail(x,y,color) / FX.beam(x1,y1,x2,y2,opts)
     FX.shake(i,ms) / FX.floatText(x,y,text,opts) / FX.floatTextAt(el,text,opts)
     FX.flash(color,ms) / FX.vignette(color,ms) / FX.ripple(el,event)
     FX.glow(el,ms) / FX.countUp(el,from,to,ms,suffix) / FX.slowmo(on)
     FX.letterbox(on) / FX.clear() / FX.setQuality(q)

   Every method is a safe no-op when the canvas is unavailable — the app
   calls FX constantly and must never crash.
   ===================================================================== */
(function () {
  'use strict';

  var canvas = null, ctx = null;
  var W = 0, H = 0, DPR = 1;
  var particles = [];
  var raf = null;
  var running = false;
  var idle = true;
  var slowmo = false;
  var TIME = 1;
  var MAX_PARTICLES = 900;
  var reduced = false;

  try { reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
  if (reduced) MAX_PARTICLES = 120;

  /* ---------- injected CSS ---------- */
  function injectCSS() {
    if (document.getElementById('fx-style')) return;
    var st = document.createElement('style');
    st.id = 'fx-style';
    st.textContent =
      '#fx-canvas{position:fixed;inset:0;z-index:9000;pointer-events:none}' +
      '.fx-float{position:fixed;z-index:9100;pointer-events:none;font-family:var(--font-display,"Space Grotesk"),sans-serif;font-weight:700;' +
      'text-shadow:0 2px 14px rgba(0,0,0,.65);white-space:nowrap;animation:fxFloat 1.1s cubic-bezier(0.22,1,0.36,1) forwards}' +
      '@keyframes fxFloat{from{opacity:0;transform:translateY(10px) scale(.85)}20%{opacity:1}to{opacity:0;transform:translateY(-46px) scale(1.05)}}' +
      '.fx-flash{position:fixed;inset:0;z-index:9050;pointer-events:none;opacity:0;transition:opacity .45s ease}' +
      '.fx-letterbox{position:fixed;left:0;right:0;height:9vh;z-index:9200;pointer-events:none;background:#000;transition:transform .8s cubic-bezier(0.65,0,0.35,1)}' +
      '.fx-letterbox.top{top:0;transform:translateY(-100%)}.fx-letterbox.bottom{bottom:0;transform:translateY(100%)}' +
      '.fx-letterbox.show{transform:translateY(0)}' +
      'html.fx-slowmo *{animation-duration:1.9s !important;transition-duration:1.2s !important}' +
      '.fx-ripple{position:absolute;border-radius:50%;pointer-events:none;background:radial-gradient(circle,rgba(255,255,255,.5),rgba(255,255,255,0) 70%);' +
      'transform:scale(0);animation:fxRipple .55s ease-out forwards}' +
      '@keyframes fxRipple{to{transform:scale(1);opacity:0}}' +
      '.fx-vign{position:fixed;inset:0;z-index:9040;pointer-events:none;box-shadow:inset 0 0 160px 60px var(--vign-c,rgba(45,107,255,.35));opacity:0;transition:opacity .6s ease}';
    document.head.appendChild(st);
  }

  /* ---------- canvas setup ---------- */
  function resize() {
    if (!canvas) return;
    DPR = Math.min(2, window.devicePixelRatio || 1);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx = canvas.getContext('2d');
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }

  function init() {
    if (canvas) return;
    canvas = document.createElement('canvas');
    canvas.id = 'fx-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    document.body.appendChild(canvas);
    injectCSS();
    resize();
    window.addEventListener('resize', resize);
    loop();
  }

  /* ---------- colour helpers ---------- */
  function cssVar(name, fallback) {
    try {
      var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
      return v || fallback;
    } catch (e) { return fallback; }
  }
  var ACCENT = null;
  function accent() {
    if (!ACCENT) ACCENT = cssVar('--accent', '#2d6bff');
    return ACCENT;
  }
  function hexToRgb(hex) {
    var m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '');
    if (!m) return { r: 45, g: 107, b: 255 };
    return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) };
  }
  function rgba(c, a) {
    var o = hexToRgb(c);
    return 'rgba(' + o.r + ',' + o.g + ',' + o.b + ',' + a + ')';
  }

  /* ---------- particles ---------- */
  function spawn(p) {
    if (particles.length >= MAX_PARTICLES) particles.shift();
    particles.push(p);
    if (idle) { idle = false; }
  }

  function makeBurst(x, y, opts) {
    opts = opts || {};
    var colors = opts.colors || [opts.color || accent()];
    var count = opts.count != null ? opts.count : 18;
    if (reduced) count = Math.ceil(count / 4);
    var spread = opts.spread != null ? opts.spread : 1;
    var speed = opts.speed != null ? opts.speed : 3;
    var base = opts.size != null ? opts.size : 2.4;
    var shape = opts.shape || 'circle';
    var gravity = opts.gravity != null ? opts.gravity : 0.16;
    var life = opts.life != null ? opts.life : 900;
    for (var i = 0; i < count; i++) {
      var a = Math.random() * Math.PI * 2;
      var sp = (Math.random() * 0.8 + 0.3) * speed * (60 / 16);
      var c = colors[Math.floor(Math.random() * colors.length)];
      spawn({
        x: x, y: y,
        vx: Math.cos(a) * sp * (0.5 + Math.random() * 0.5) * spread,
        vy: Math.sin(a) * sp * (0.5 + Math.random() * 0.5) * spread - (shape === 'ring' ? 0 : speed * 0.3),
        size: base * (0.6 + Math.random() * 0.8),
        life: life * (0.7 + Math.random() * 0.6),
        age: 0,
        color: c,
        gravity: gravity,
        shape: shape,
        rot: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 0.3,
        glow: opts.glow !== false
      });
    }
  }

  function makeConfetti(opts) {
    opts = opts || {};
    var count = opts.count != null ? opts.count : 120;
    if (reduced) count = Math.ceil(count / 3);
    var colors = opts.colors || ['#2d6bff', '#4df3ff', '#ffc861', '#ffffff', '#ff4d8d'];
    for (var i = 0; i < count; i++) {
      spawn({
        x: Math.random() * W,
        y: -20 - Math.random() * H * 0.4,
        vx: (Math.random() - 0.5) * 1.6,
        vy: 2.2 + Math.random() * 2.6,
        size: 4 + Math.random() * 6,
        life: 4200 + Math.random() * 2600,
        age: 0,
        color: colors[Math.floor(Math.random() * colors.length)],
        gravity: 0.045,
        shape: Math.random() < 0.5 ? 'rect' : 'circle',
        rot: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 0.4,
        flut: Math.random() * Math.PI * 2,
        confetti: true,
        glow: false
      });
    }
  }

  function tick(dt) {
    var alive = 0;
    for (var i = particles.length - 1; i >= 0; i--) {
      var p = particles[i];
      p.age += dt;
      if (p.age >= p.life) { particles.splice(i, 1); continue; }
      p.vy += p.gravity * dt;
      if (p.confetti) {
        p.vx += Math.sin(p.age / 300 + p.flut) * 0.012;
        p.x += p.vx * dt * 0.06;
        p.y += p.vy * dt * 0.06;
        p.rot += p.vr * dt * 0.06;
      } else {
        p.x += p.vx * dt * 0.06;
        p.y += p.vy * dt * 0.06;
        p.rot += p.vr * dt * 0.06;
      }
      alive++;
    }
    return alive;
  }

  function draw() {
    if (!ctx) return;
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      var lifeT = 1 - p.age / p.life;
      var a = Math.min(1, lifeT * 1.4);
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      if (p.glow) { ctx.shadowBlur = 12; ctx.shadowColor = p.color; } else { ctx.shadowBlur = 0; }
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      switch (p.shape) {
        case 'spark':
          ctx.strokeStyle = p.color;
          ctx.lineWidth = Math.max(1, p.size * 0.35);
          ctx.beginPath();
          ctx.moveTo(-p.size, 0); ctx.lineTo(p.size, 0);
          ctx.stroke();
          break;
        case 'square':
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
          break;
        case 'rect':
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
          break;
        case 'ring':
          ctx.strokeStyle = p.color;
          ctx.lineWidth = Math.max(1.2, p.size * 0.3);
          ctx.beginPath();
          ctx.arc(0, 0, p.size * (1 - lifeT * 0.5) + 2, 0, Math.PI * 2);
          ctx.stroke();
          break;
        default:
          ctx.beginPath();
          ctx.arc(0, 0, p.size * (0.4 + lifeT * 0.6), 0, Math.PI * 2);
          ctx.fill();
      }
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.shadowBlur = 0;
  }

  function loop() {
    raf = requestAnimationFrame(loop);
    var nowMs = Date.now();
    var dt = Math.min(48, nowMs - (loop._last || nowMs));
    loop._last = nowMs;
    if (slowmo) dt *= 0.35;
    if (particles.length) {
      tick(dt);
      draw();
      idle = false;
    } else if (!idle) {
      draw();
      idle = true;
    }
  }

  /* ---------- public API ---------- */
  function burst(x, y, opts) {
    init();
    if (isNaN(x) || isNaN(y)) return;
    makeBurst(x, y, opts);
  }

  function burstAt(el, opts) {
    if (!el) return;
    var r = el.getBoundingClientRect();
    burst(r.left + r.width / 2, r.top + r.height / 2, opts);
  }

  function confetti(opts) {
    init();
    makeConfetti(opts);
  }

  function sparkle(el, opts) {
    if (!el) return;
    opts = opts || {};
    var r = el.getBoundingClientRect();
    var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    var n = (opts.count != null ? opts.count : 3) * (reduced ? 1 : 2);
    for (var i = 0; i < n; i++) {
      (function (i) {
        setTimeout(function () {
          var a = Math.random() * Math.PI * 2;
          var d = Math.max(r.width, r.height) * (0.5 + Math.random() * 0.5);
          burst(cx + Math.cos(a) * d, cy + Math.sin(a) * d, {
            count: 5, color: opts.color || '#ffc861', size: 1.6, speed: 1.6, shape: 'spark', life: 700
          });
        }, i * (opts.interval || 160));
      })(i);
    }
  }

  function trail(x, y, color) {
    init();
    spawn({
      x: x, y: y, vx: 0, vy: 0, size: 2, life: 380, age: 0,
      color: color || '#4df3ff', gravity: 0, shape: 'circle', glow: true
    });
  }

  function beam(x1, y1, x2, y2, opts) {
    init();
    opts = opts || {};
    var color = opts.color || '#35e07f';
    var dur = opts.life != null ? opts.life : 600;
    var segs = 14;
    for (var i = 0; i < segs; i++) {
      (function (i) {
        setTimeout(function () {
          var t = i / segs;
          var bx = x1 + (x2 - x1) * t;
          var by = y1 + (y2 - y1) * t;
          burst(bx, by, { count: 3, color: color, size: 2.2, speed: 0.8, life: 300, shape: 'spark', gravity: 0 });
        }, i * (dur / segs));
      })(i);
    }
    burst((x1 + x2) / 2, (y1 + y2) / 2, { count: 10, color: color, size: 2.6, speed: 1.2, life: 500 });
  }

  function shake(intensity, ms) {
    if (reduced) return;
    var host = document.body;
    if (!host || !host.style) return;
    var i = intensity != null ? intensity : 8;
    var dur = ms != null ? ms : 350;
    var start = Date.now();
    var iv = setInterval(function () {
      var el = Date.now() - start;
      if (el >= dur) {
        clearInterval(iv);
        host.style.transform = '';
        host.style.transition = '';
        return;
      }
      var k = i * (1 - el / dur);
      host.style.transition = 'none';
      host.style.transform = 'translate(' + (Math.random() * 2 - 1) * k + 'px,' + (Math.random() * 2 - 1) * k + 'px)';
    }, 16);
  }

  function floatText(x, y, text, opts) {
    opts = opts || {};
    var el = document.createElement('div');
    el.className = 'fx-float';
    el.textContent = text;
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    el.style.color = opts.color || '#ffffff';
    el.style.fontSize = (opts.size || 16) + 'px';
    el.style.zIndex = '9100';
    if (opts.duration) el.style.animationDuration = opts.duration + 'ms';
    document.body.appendChild(el);
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, (opts.duration || 1100) + 80);
  }

  function floatTextAt(el, text, opts) {
    if (!el) return;
    var r = el.getBoundingClientRect();
    floatText(r.left + r.width / 2, r.top - 8, text, opts);
  }

  function flash(color, ms) {
    var el = document.createElement('div');
    el.className = 'fx-flash';
    el.style.background = color || 'rgba(255,255,255,0.3)';
    document.body.appendChild(el);
    requestAnimationFrame(function () {
      el.style.opacity = '1';
      setTimeout(function () {
        el.style.opacity = '0';
        setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 500);
      }, ms != null ? ms : 350);
    });
  }

  function vignette(color, ms) {
    var el = document.createElement('div');
    el.className = 'fx-vign';
    el.style.setProperty('--vign-c', color || 'rgba(45,107,255,0.35)');
    document.body.appendChild(el);
    requestAnimationFrame(function () {
      el.style.opacity = '1';
      setTimeout(function () {
        el.style.opacity = '0';
        setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 650);
      }, ms != null ? ms : 900);
    });
  }

  function ripple(el, event) {
    if (!el || reduced) return;
    var rect = el.getBoundingClientRect();
    var x = event ? event.clientX - rect.left : rect.width / 2;
    var y = event ? event.clientY - rect.top : rect.height / 2;
    var size = Math.max(rect.width, rect.height) * 1.6;
    var r = document.createElement('span');
    r.className = 'fx-ripple';
    r.style.width = size + 'px';
    r.style.height = size + 'px';
    r.style.left = (x - size / 2) + 'px';
    r.style.top = (y - size / 2) + 'px';
    el.style.position = el.style.position || 'relative';
    el.style.overflow = el.style.overflow || 'hidden';
    el.appendChild(r);
    setTimeout(function () { if (r.parentNode) r.parentNode.removeChild(r); }, 600);
  }

  function glow(el, ms) {
    if (!el) return;
    var old = el.style.boxShadow;
    el.style.boxShadow = '0 0 34px -2px ' + accent();
    el.style.transition = 'box-shadow .6s ease';
    setTimeout(function () {
      el.style.boxShadow = old;
    }, ms != null ? ms : 700);
  }

  function countUp(el, from, to, ms, suffix, cb) {
    if (!el) return;
    from = from || 0;
    ms = ms || 1600;
    suffix = suffix || '';
    var start = Date.now();
    var iv = setInterval(function () {
      var p = Math.min(1, (Date.now() - start) / ms);
      var eased = 1 - Math.pow(1 - p, 3);
      var v = Math.round(from + (to - from) * eased);
      el.textContent = v + suffix;
      if (cb) cb(v);
      if (p >= 1) { clearInterval(iv); }
    }, 30);
  }

  function slowmo(on) {
    slowmo = !!on;
    try {
      document.documentElement.classList.toggle('fx-slowmo', on);
    } catch (e) {}
  }

  function letterbox(on) {
    injectCSS();
    var top = document.querySelector('.fx-letterbox.top');
    var bottom = document.querySelector('.fx-letterbox.bottom');
    if (on) {
      if (!top) {
        top = document.createElement('div');
        top.className = 'fx-letterbox top';
        bottom = document.createElement('div');
        bottom.className = 'fx-letterbox bottom';
        document.body.appendChild(top);
        document.body.appendChild(bottom);
      }
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          top.classList.add('show');
          bottom.classList.add('show');
        });
      });
    } else if (top && bottom) {
      top.classList.remove('show');
      bottom.classList.remove('show');
      setTimeout(function () {
        if (top.parentNode) top.parentNode.removeChild(top);
        if (bottom.parentNode) bottom.parentNode.removeChild(bottom);
      }, 900);
    }
  }

  function clear() { particles = []; }

  function setQuality(q) {
    MAX_PARTICLES = q === 'low' ? 300 : 900;
  }

  window.FX = {
    init: init,
    burst: burst,
    burstAt: burstAt,
    confetti: confetti,
    sparkle: sparkle,
    trail: trail,
    beam: beam,
    shake: shake,
    floatText: floatText,
    floatTextAt: floatTextAt,
    flash: flash,
    vignette: vignette,
    ripple: ripple,
    glow: glow,
    countUp: countUp,
    slowmo: slowmo,
    letterbox: letterbox,
    clear: clear,
    setQuality: setQuality
  };
})();
