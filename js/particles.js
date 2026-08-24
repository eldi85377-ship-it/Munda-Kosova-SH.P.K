/* MUNDA — ambient light-mote particle field */
(function () {
  var canvas = document.getElementById('particles');
  var ctx = canvas.getContext('2d');
  var w = 0, h = 0, motes = [];
  var COUNT = 70;
  var raf = null;
  var running = false;

  function resize() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
  }

  function seed() {
    motes = [];
    for (var i = 0; i < COUNT; i++) {
      motes.push({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 1.9 + 0.4,
        spd: Math.random() * 0.22 + 0.05,
        drift: Math.random() * Math.PI * 2,
        alpha: Math.random() * 0.5 + 0.15,
        hue: Math.random() * 60 + 180
      });
    }
  }

  function tick() {
    ctx.clearRect(0, 0, w, h);
    for (var i = 0; i < motes.length; i++) {
      var m = motes[i];
      m.y -= m.spd;
      m.x += Math.sin(m.drift) * 0.2;
      m.drift += 0.012;
      if (m.y < -12) { m.y = h + 12; m.x = Math.random() * w; }
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
      ctx.fillStyle = 'hsla(' + m.hue + ',90%,72%,' + m.alpha + ')';
      ctx.shadowBlur = 9;
      ctx.shadowColor = 'hsla(' + m.hue + ',90%,70%,0.65)';
      ctx.fill();
    }
    raf = requestAnimationFrame(tick);
  }

  function start() {
    if (running) return;
    running = true;
    resize();
    seed();
    tick();
  }

  window.addEventListener('resize', resize);
  start();

  window.Particles = { start: start };
})();
