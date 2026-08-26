/* MUNDA — ambient light field (cinematic dust + bokeh + sparkles)
   Three layers: soft depth-of-field orbs, drifting light motes and
   tiny bright sparkles. Pure canvas, zero assets. */
(function () {
  var canvas = document.getElementById('particles');
  var ctx = canvas.getContext('2d');
  var w = 0, h = 0, items = [];
  var raf = null;
  var running = false;
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function resize() {
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function seed() {
    items = [];
    var i;
    // layer 1 — soft bokeh orbs (depth)
    for (i = 0; i < 14; i++) {
      items.push({
        kind: 'orb',
        x: Math.random() * w,
        y: Math.random() * h,
        r: 16 + Math.random() * 30,
        spd: 0.03 + Math.random() * 0.05,
        sway: Math.random() * Math.PI * 2,
        phase: Math.random() * Math.PI * 2,
        alpha: 0.028 + Math.random() * 0.05,
        hue: 210 + Math.random() * 40,
        blur: 26 + Math.random() * 26
      });
    }
    // layer 2 — sharp drifting dust motes (foreground light)
    for (i = 0; i < 64; i++) {
      items.push({
        kind: 'mote',
        x: Math.random() * w,
        y: Math.random() * h,
        r: 0.6 + Math.random() * 1.7,
        spd: 0.06 + Math.random() * 0.22,
        sway: Math.random() * Math.PI * 2,
        swaySpd: 0.004 + Math.random() * 0.014,
        alpha: 0.12 + Math.random() * 0.4,
        hue: 185 + Math.random() * 55
      });
    }
    // layer 3 — tiny twinkling sparkles
    for (i = 0; i < 18; i++) {
      items.push({
        kind: 'spark',
        x: Math.random() * w,
        y: Math.random() * h,
        r: 0.5 + Math.random() * 0.9,
        spd: 0.02 + Math.random() * 0.06,
        phase: Math.random() * Math.PI * 2,
        tw: 1.2 + Math.random() * 2.6,
        alpha: 0.25,
        hue: Math.random() < 0.4 ? 48 : (Math.random() < 0.5 ? 190 : 255)
      });
    }
  }

  function tick(t) {
    ctx.clearRect(0, 0, w, h);
    var i, m;
    for (i = 0; i < items.length; i++) {
      m = items[i];
      if (m.kind === 'orb') {
        m.y -= m.spd;
        m.x += Math.sin(m.sway) * 0.08;
        m.sway += 0.002;
        if (m.y < -m.r * 2) { m.y = h + m.r * 2; m.x = Math.random() * w; }
        var g = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.r);
        g.addColorStop(0, 'hsla(' + m.hue + ',80%,70%,' + m.alpha + ')');
        g.addColorStop(1, 'hsla(' + m.hue + ',80%,70%,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
        ctx.fill();
      } else if (m.kind === 'mote') {
        m.y -= m.spd;
        m.x += Math.sin(m.sway) * 0.18;
        m.sway += m.swaySpd;
        if (m.y < -12) { m.y = h + 12; m.x = Math.random() * w; }
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
        ctx.fillStyle = 'hsla(' + m.hue + ',95%,74%,' + m.alpha + ')';
        ctx.shadowBlur = 8;
        ctx.shadowColor = 'hsla(' + m.hue + ',95%,70%,0.7)';
        ctx.fill();
        ctx.shadowBlur = 0;
      } else {
        // spark — slow twinkle
        var a = m.alpha * (0.35 + 0.65 * Math.abs(Math.sin(t * 0.001 * m.tw + m.phase)));
        if (a > 0.04) {
          ctx.beginPath();
          ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
          ctx.fillStyle = 'hsla(' + m.hue + ',95%,82%,' + a + ')';
          ctx.shadowBlur = 7;
          ctx.shadowColor = 'hsla(' + m.hue + ',95%,75%,' + a + ')';
          ctx.fill();
          ctx.shadowBlur = 0;
        }
        m.y -= m.spd;
        if (m.y < -6) { m.y = h + 6; m.x = Math.random() * w; }
      }
    }
    raf = requestAnimationFrame(tick);
  }

  function start() {
    if (running) return;
    running = true;
    resize();
    seed();
    if (reduced) {
      tick(0);                  // draw one static frame only
      cancelAnimationFrame(raf);
      raf = null;
      return;
    }
    requestAnimationFrame(tick);
  }

  window.addEventListener('resize', resize);
  start();

  window.Particles = { start: start };
})();
