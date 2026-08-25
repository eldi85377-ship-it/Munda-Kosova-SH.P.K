/* =====================================================================
   MUNDA — storytelling interactions: textile story, technology explorer,
   kosova map. Updated for the FUTURE LAB experience (bilingual).
   ===================================================================== */
(function () {
  'use strict';

  /* ---------- i18n for dynamic story text ---------- */
  if (window.I18N) {
    I18N.register({
      en: {
        'story.s0': 'It starts as a simple textile — soft, woven, flexible.',
        'story.s1': 'MUNDA weaves micro-circuitry directly into the fibres.',
        'story.s2': 'Flexible LED emitters turn the fabric into light.',
        'story.s3': 'The glowing textile becomes part of a vehicle interior.',
        'story.s4': 'A living fabric. Light, woven into matter.',
        'tech.led': 'Micro-LEDs thinner than a hair, embedded directly into the fabric.',
        'tech.textile': 'A specialised weave that conducts light — not just threads.',
        'tech.flex': 'Soft circuits that bend, fold and wrap any surface of the cabin.',
        'tech.design': 'Infinite colours, patterns and moods — generated on demand.',
        'tech.auto': 'Integrated into dashboards, doors and seats as one seamless light.'
      },
      sq: {
        'story.s0': 'Fillon si një tekstil i thjeshtë — i butë, i endur, fleksibël.',
        'story.s1': 'MUNDA end mikro-qarqet drejtpërdrejt në fije.',
        'story.s2': 'Emitterët fleksibël LED e kthejnë pëlhurën në dritë.',
        'story.s3': 'Tekstili i ndriçuar bëhet pjesë e interiorit të automjetit.',
        'story.s4': 'Një pëlhurë e gjallë. Dritë, e endur në materie.',
        'tech.led': 'Mikro-LED më të hollë se një fije floku, të ngulitura direkt në pëlhurë.',
        'tech.textile': 'Një endje e specializuar që përcjell dritën — jo vetëm fije.',
        'tech.flex': 'Qarqe të buta që përkulen, palosen dhe mbështjellin çdo sipërfaqe të kabinës.',
        'tech.design': 'Ngjyra, modele dhe gjendje të pafundme — të krijuara sipas kërkesës.',
        'tech.auto': 'Të integruara në pult, dyer dhe vende si një dritë e vetme e pandërprerë.'
      }
    });
  }

  function t(key, fb) { return window.I18N ? I18N.t(key, fb) : (fb != null ? fb : key); }
  function sfx(n) { if (window.Sound) { try { Sound.sfx(n); } catch (e) {} } }

  /* ============ TEXTILE STORY ============ */
  var stage = 0;
  var STAGE_DESC = ['story.s0', 'story.s1', 'story.s2', 'story.s3', 'story.s4'];
  var STAGE_LABEL = ['TEXTILE', 'TECHNOLOGY', 'LIGHT', 'AUTOMOTIVE', 'FUTURE'];

  function setStage(n) {
    stage = Math.max(0, Math.min(4, n));
    var fabric = document.getElementById('fabric-sheet');
    var glow = document.getElementById('fabric-glow');
    var label = document.getElementById('fabric-label');
    var desc = document.getElementById('stage-desc');
    var wow = document.getElementById('wow-panel');
    var next = document.getElementById('story-next');

    if (label) label.textContent = STAGE_LABEL[stage];
    if (desc) desc.textContent = t(STAGE_DESC[stage]);

    document.querySelectorAll('#screen-story .pipe-step').forEach(function (el) {
      var i = parseInt(el.getAttribute('data-stage'), 10);
      el.classList.toggle('active', i === stage);
      el.classList.toggle('done', i < stage);
    });

    if (fabric && glow) {
      fabric.className = 'fabric-sheet st' + stage;
      switch (stage) {
        case 0:
          glow.style.opacity = '0';
          fabric.style.background = 'linear-gradient(135deg,rgba(255,255,255,0.05),rgba(255,255,255,0.01)),repeating-linear-gradient(45deg,rgba(255,255,255,0.045) 0 2px,transparent 2px 6px)';
          fabric.style.boxShadow = 'inset 0 0 60px rgba(0,0,0,0.55),0 30px 60px rgba(0,0,0,0.5)';
          break;
        case 1:
          glow.style.opacity = '0.18';
          fabric.style.background = 'linear-gradient(135deg,rgba(77,243,255,0.04),rgba(255,255,255,0.01)),repeating-linear-gradient(0deg,rgba(77,243,255,0.06) 0 2px,transparent 2px 8px),repeating-linear-gradient(90deg,rgba(77,243,255,0.06) 0 2px,transparent 2px 8px)';
          break;
        case 2:
          glow.style.opacity = '0.55';
          fabric.style.background = 'linear-gradient(135deg,rgba(77,243,255,0.08),rgba(255,255,255,0.01)),repeating-linear-gradient(45deg,rgba(77,243,255,0.05) 0 2px,transparent 2px 7px)';
          fabric.style.boxShadow = 'inset 0 0 60px rgba(0,0,0,0.35),0 0 60px -6px var(--accent)';
          break;
        case 3:
          glow.style.opacity = '0.7';
          fabric.style.background = 'linear-gradient(135deg,rgba(77,243,255,0.1),rgba(9,9,13,0.4)),radial-gradient(60% 80% at 50% 20%,rgba(77,243,255,0.15),transparent)';
          fabric.style.boxShadow = 'inset 0 0 40px rgba(0,0,0,0.25),0 0 80px -4px var(--accent)';
          break;
        case 4:
          glow.style.opacity = '0.95';
          fabric.style.background = 'radial-gradient(60% 60% at 50% 50%,rgba(77,243,255,0.2),transparent)';
          fabric.style.boxShadow = '0 0 120px 0 var(--accent)';
          break;
      }
    }

    if (wow) wow.hidden = stage !== 4;
    if (next) next.hidden = stage < 3;
    if (stage > 0) sfx('textile');
  }

  function bindTextile() {
    var fabric = document.getElementById('fabric-sheet');
    var dragging = false, lastX = 0, accum = 0;

    fabric.addEventListener('pointerdown', function (e) {
      dragging = true; lastX = e.clientX; accum = 0;
      if (fabric.setPointerCapture) fabric.setPointerCapture(e.pointerId);
    });
    fabric.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var dx = e.clientX - lastX; lastX = e.clientX;
      accum += Math.abs(dx);
      if (accum > 130) { accum = 0; setStage(stage + 1); }
    });
    var stop = function () { dragging = false; };
    fabric.addEventListener('pointerup', stop);
    fabric.addEventListener('pointercancel', stop);
    fabric.addEventListener('dragstart', function (e) { e.preventDefault(); });

    document.querySelectorAll('#screen-story .pipe-step').forEach(function (el) {
      el.addEventListener('click', function () {
        setStage(parseInt(el.getAttribute('data-stage'), 10));
      });
    });

    var discover = document.getElementById('btn-discover');
    if (discover) {
      discover.addEventListener('click', function () {
        sfx('reveal');
        var glow = document.getElementById('fabric-glow');
        if (glow) {
          glow.style.transition = 'transform 1.3s cubic-bezier(0.22,1,0.36,1), opacity 1.3s';
          glow.style.transform = 'scale(2.6)';
          glow.style.opacity = '0';
        }
        fabric.style.transition = 'transform 1.3s cubic-bezier(0.22,1,0.36,1), box-shadow 1.3s';
        fabric.style.transform = 'scale(1.06)';
        fabric.style.boxShadow = '0 0 160px 20px var(--accent)';
        setTimeout(function () {
          if (window.App) App.go('hub'); else if (window.FutureLab) FutureLab.startBuild();
        }, 1500);
      });
    }
  }

  function enterTextile() {
    setStage(0);
    var glow = document.getElementById('fabric-glow');
    if (glow) { glow.style.transition = ''; glow.style.transform = ''; glow.style.opacity = ''; }
    var fabric = document.getElementById('fabric-sheet');
    if (fabric) { fabric.style.transition = ''; fabric.style.transform = ''; }
  }

  /* ============ TECHNOLOGY EXPLORER ============ */
  var TECH = {
    led: { name: 'LED', desc: 'tech.led' },
    textile: { name: 'TEXTILE', desc: 'tech.textile' },
    flex: { name: 'FLEXIBILITY', desc: 'tech.flex' },
    design: { name: 'DESIGN', desc: 'tech.design' },
    auto: { name: 'AUTOMOTIVE', desc: 'tech.auto' }
  };

  function bindTech() {
    var coreLabel = document.getElementById('tech-core-label');
    var coreDesc = document.getElementById('tech-core-desc');
    var core = document.getElementById('tech-core');
    document.querySelectorAll('.tech-node').forEach(function (node) {
      node.addEventListener('click', function () {
        var key = node.getAttribute('data-tech');
        var tech = TECH[key];
        if (!tech) return;
        document.querySelectorAll('.tech-node').forEach(function (n) { n.classList.remove('active'); });
        node.classList.add('active');
        if (coreLabel) coreLabel.textContent = tech.name;
        if (coreDesc) coreDesc.textContent = t(tech.desc);
        core.style.animation = 'none';
        void core.offsetWidth;
        core.style.animation = '';
        sfx('select');
      });
    });
  }

  /* ============ KOSOVA ============ */
  function animateKosova() {
    var reach = document.getElementById('reach');
    if (!reach) return;
    var lines = reach.querySelectorAll('.reach-line');
    var dots = reach.querySelectorAll('.reach-dots circle');
    lines.forEach(function (l) { l.style.animation = 'none'; l.style.strokeDashoffset = '300'; });
    dots.forEach(function (d) { d.style.animation = 'none'; d.style.opacity = '0'; });
    void reach.offsetWidth;
    lines.forEach(function (l) { l.style.animation = ''; l.style.strokeDashoffset = ''; });
    dots.forEach(function (d) { d.style.animation = ''; d.style.opacity = ''; });
  }

  function init() {
    bindTextile();
    bindTech();
  }

  window.Lab = {
    init: init,
    enterTextile: enterTextile,
    setStage: setStage,
    animateKosova: animateKosova
  };
})();
