/* =====================================================================
   MUNDA FUTURE LAB — website interactions (index.html)
   Interactive car, MUNDA SCORE demo, gallery lightbox, scroll reveals,
   nav, hero particles, parallax. Bilingual via js/i18n.js.
   Uses Sound/FX defensively — the site must work even without them.
   ===================================================================== */
(function () {
  'use strict';

  function $(id) { return document.getElementById(id); }
  function qsa(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function sfx(n) { if (window.Sound) { try { Sound.sfx(n); } catch (e) {} } }
  function on(e, fn) { document.addEventListener(e, fn); }

  /* =====================================================================
     BILINGUAL DICTIONARY (EN / SQ) — every key used in index.html
     ===================================================================== */
  if (window.I18N) {
    I18N.register({
      en: {
        'nav.tech': 'Technology', 'nav.how': 'How it works', 'nav.game': 'The Game',
        'nav.score': 'MUNDA Score', 'nav.gallery': 'Gallery', 'nav.about': 'About',
        'nav.team': 'Team',
        'nav.play': 'PLAY', 'nav.playGame': 'PLAY THE GAME',
        'hero.kicker': 'MUNDA KOSOVA SH.P.K · AUTOMOTIVE TEXTILE LIGHTING',
        'hero.title': 'MUNDA<br><span class="grad">FUTURE LAB</span>',
        'hero.sub': 'Designing the lighting experience of tomorrow\'s mobility.',
        'hero.play': 'PLAY THE EXPERIENCE', 'hero.explore': 'EXPLORE MUNDA',
        'hero.foot': 'A Digital School project · Made in Kosovo',
        'interior.kicker': 'EXPERIENCE THE TECHNOLOGY',
        'interior.title': 'Touch the <em>cabin.</em>',
        'interior.sub': 'Hover or click the glowing zones to discover how MUNDA technology lives inside a premium vehicle. Then play with the light yourself.',
        'interior.color': 'COLOUR', 'interior.brightness': 'BRIGHTNESS',
        'interior.cta': 'BUILD YOUR OWN →',
        'z.roof': 'Roof / Ambient', 'z.dashboard': 'Dashboard', 'z.doors': 'Door Panels',
        'z.console': 'Center Console', 'z.seats': 'Seats', 'z.footwell': 'Footwell',
        'zd.roof': 'The headliner glows with a soft illuminated textile — ambient light that breathes with the drive mode.',
        'zd.dashboard': 'A continuous light line across the dashboard, woven into the textile surface. Colour and pattern react live.',
        'zd.doors': 'Flexible LED strips inside the door panels — a warm guide light that wraps the cabin.',
        'zd.console': 'The center console carries MUNDA\u2019s signature light signature, connecting driver and passenger zones.',
        'zd.seats': 'Illuminated stitching and seat lighting turn the textile itself into a light source.',
        'zd.footwell': 'A soft ground light completes the experience — subtle, premium, energy-efficient.',
        'how.kicker': 'THE METHOD', 'how.title': 'How the <em>Future Lab</em> works.',
        'how.sub': 'Four steps turn a piece of textile into a living light experience.',
        'how.s1t': 'DESIGN', 'how.s1d': 'Choose the illuminated textile — every weave diffuses light differently.',
        'how.s2t': 'ILLUMINATE', 'how.s2d': 'Place LED zones across the cabin — colour, pattern and intensity are live.',
        'how.s3t': 'TEST', 'how.s3d': 'Five automotive tests — light, vibration, temperature, durability, efficiency.',
        'how.s4t': 'INNOVATE', 'how.s4d': 'Get your MUNDA SCORE, climb the ranks and unlock the future.',
        'tech.kicker': 'THE TECHNOLOGY', 'tech.title': 'Textile. Light. <em>Matter.</em>',
        'tech.sub': 'What MUNDA actually does — flexible LED systems woven into textile for the automotive industry.',
        'tech.c1t': 'ILLUMINATED TEXTILES', 'tech.c1d': 'Micro-LEDs are woven directly into soft fabric — a material that conducts light, not just threads.',
        'tech.c2t': 'LED INTEGRATION', 'tech.c2d': 'Flexible emitters that bend, fold and wrap every surface of the cabin — one seamless light.',
        'tech.c3t': 'AUTOMOTIVE INTERIOR TECHNOLOGY', 'tech.c3d': 'Integrated into dashboards, doors, seats and roofs of premium vehicles from the MUNDA factory in Obiliq.',
        'tech.c4t': 'INNOVATION', 'tech.c4d': 'Infinite colours, patterns and moods — generated on demand by a single connected textile.',
        'game.kicker': 'THE EXPERIENCE', 'game.title': 'Become a MUNDA <em>design engineer.</em>',
        'game.sub': 'A five-phase journey: DESIGN → LIGHT → CONNECT → TEST → SHOWCASE. Then a MUNDA SCORE reveals how close you came to building the future.',
        'game.shot1': 'Choose the textile — the base of every design.',
        'game.shot2': 'Connect every LED module to its controller port.',
        'game.shot3': 'Five automotive tests decide your fate.',
        'game.shot4': 'The showcase — your interior comes alive.',
        'game.f1': '⚡ Live lighting engine', 'game.f2': '🧵 4 textile materials',
        'game.f3': '🎨 8 colours · 7 patterns', 'game.f4': '🔌 Wiring mini-game',
        'game.f5': '🧪 5 automotive tests', 'game.f6': '🏆 XP · levels · badges',
        'game.cta': 'PLAY MUNDA FUTURE LAB',
        'score.kicker': 'TRY IT NOW', 'score.title': 'What would your <em>MUNDA SCORE</em> be?',
        'score.sub': 'Move the sliders — the same score the game computes, live in your browser.',
        'score.of': '/ 100', 'score.bright': 'BRIGHTNESS', 'score.eff': 'EFFICIENCY',
        'score.prec': 'PRECISION', 'score.dur': 'DURABILITY',
        'score.note': 'This is a concept demonstration — in the game, every value comes from your real choices.',
        'gallery.kicker': 'VISUAL STORY', 'gallery.title': 'A look inside the <em>Future Lab.</em>',
        'gallery.t1': 'The cabin', 'gallery.t2': 'Textile macro', 'gallery.t3': 'The lab',
        'gallery.t4': 'LED core', 'gallery.t5': 'Gameplay', 'gallery.t6': 'Showcase',
        'gallery.t7': 'MUNDA', 'gallery.t8': 'Made in Kosovo',
        'gallery.wsub': 'LIGHTING THE FUTURE OF MOBILITY',
        'gallery.c1': 'The illuminated cabin — six zones, one seamless light experience.',
        'gallery.c2': 'Flexible LED emitters woven into the textile itself.',
        'gallery.c3': 'Inside the Future Lab, where every design begins.',
        'gallery.c4': 'The LED core — thin, flexible, embedded.',
        'gallery.c5': 'A completed build scoring 94 on the MUNDA SCORE.',
        'gallery.c6': 'The final showcase — the interior comes alive section by section.',
        'gallery.c7': 'MUNDA — lighting the future of mobility from Kosovo.',
        'gallery.c8': 'Innovation made in Kosovo, moving the world.',
        'team.kicker': 'THE PEOPLE',
        'team.title': 'The team behind <em>MUNDA Kosova SH.P.K.</em>',
        'team.sub': 'The specialists who weave light into textile and bring the Future Lab to life — from the factory in Obiliq to the world.',
        'team.note': 'Photos and names are updated from the assets/photos folder — real team photos coming soon.',
        'team.role': 'MUNDA Kosova SH.P.K',
        'about.kicker': 'ABOUT THE COMPANY',
        'about.title': 'MUNDA Kosova <em>SH.P.K.</em><br>Light from the heart of the Balkans.',
        'about.p1': 'MUNDA Kosova SH.P.K produces illuminated textile systems for the automotive industry — flexible LED technology woven directly into fabric, manufactured at the company\u2019s factory in Obiliq, Kosovo.',
        'about.p2': 'This experience is a Digital School competition project. It lets you step into the role of a MUNDA design engineer and build the interior lighting of tomorrow\u2019s premium vehicle — exactly the way the real product works: design, illuminate, connect, test, showcase.',
        'about.s1': 'interior zones', 'about.s2': 'automotive tests', 'about.s3': 'MUNDA SCORE', 'about.s4': 'future',
        'about.note': 'The vehicle interior is a design concept created for this experience. No brand partnership is implied.',
        'cta.kicker': 'THE CHALLENGE', 'cta.title': 'Ready to design<br>the <em>future?</em>',
        'cta.sub': 'Enter the MUNDA Future Lab and create your own automotive lighting experience.',
        'cta.btn': 'START DESIGNING',
        'foot.note': 'Made in Kosovo. Designed for the future. · Digital School Competition · Design concept — no brand partnership implied.'
      },
      sq: {
        'nav.tech': 'Teknologjia', 'nav.how': 'Si funksionon', 'nav.game': 'Loja',
        'nav.score': 'MUNDA Score', 'nav.gallery': 'Galeria', 'nav.about': 'Rreth',
        'nav.team': 'Stafi',
        'nav.play': 'LUAJ', 'nav.playGame': 'LUAJ LOJËN',
        'hero.kicker': 'MUNDA KOSOVA SH.P.K · NDRIÇIM TEKSTIL AUTOMOTIV',
        'hero.title': 'MUNDA<br><span class="grad">FUTURE LAB</span>',
        'hero.sub': 'Dizajnojmë përvojën e ndriçimit të lëvizjes së së ardhmes.',
        'hero.play': 'LUAJ PËRVOJËN', 'hero.explore': 'EKSPLORO MUNDA-N',
        'hero.foot': 'Një projekt i Digital School · Bërë në Kosovë',
        'interior.kicker': 'PËRJETO TEKNOLOGJINË',
        'interior.title': 'Prek <em>kabinën.</em>',
        'interior.sub': 'Kalo ose kliko mbi zonat e ndriçuara për të zbuluar se si jeton teknologjia MUNDA brenda një automjeti premium. Pastaj luaj vetë me dritën.',
        'interior.color': 'NGJYRA', 'interior.brightness': 'NDRITSHMËRIA',
        'interior.cta': 'NDËRTO TË TËNDËN →',
        'z.roof': 'Çatia / Ambient', 'z.dashboard': 'Pulti', 'z.doors': 'Panelet e dyerve',
        'z.console': 'Konsola qendrore', 'z.seats': 'Vendet', 'z.footwell': 'Hapësira e këmbëve',
        'zd.roof': 'Tavanina ndriçon me një tekstil të butë të ndriçuar — dritë ambientale që merr frymë me mënyrën e ngrenies.',
        'zd.dashboard': 'Një vijë drite e vazhdueshme përgjatë pultit, e endur në sipërfaqen e tekstilit. Ngjyra dhe modeli reagojnë live.',
        'zd.doors': 'Shirita LED fleksibël brenda paneleve të dyerve — një dritë udhërrëfyese e ngrohtë që mbështjell kabinën.',
        'zd.console': 'Konsola qendrore mbart nënshkrimin e dritës së MUNDA-s, duke lidhur zonat e shoferit dhe pasagjerit.',
        'zd.seats': 'Qepja e ndriçuar dhe drita e vendeve e kthejnë vetë tekstilin në një burim drite.',
        'zd.footwell': 'Një dritë e butë dyshemeje e plotëson përvojën — delikate, premium, energjikisht efikase.',
        'how.kicker': 'METODA', 'how.title': 'Si funksionon <em>Future Lab.</em>',
        'how.sub': 'Katër hapa e kthejnë një copë tekstili në një përvojë drite të gjallë.',
        'how.s1t': 'DIZAJN', 'how.s1d': 'Zgjidh tekstilin e ndriçuar — çdo endje e shpërndan dritën ndryshe.',
        'how.s2t': 'NDRIÇO', 'how.s2d': 'Vendos zonat LED në kabinë — ngjyra, modeli dhe intensiteti janë live.',
        'how.s3t': 'TESTO', 'how.s3d': 'Pesë teste automobilistike — drita, dridhja, temperatura, qëndrueshmëria, efikasiteti.',
        'how.s4t': 'INOVO', 'how.s4d': 'Merr MUNDA SCORE-n tënde, ngjitu në renditje dhe zhblloko të ardhmen.',
        'tech.kicker': 'TEKNOLOGJIA', 'tech.title': 'Tekstil. Dritë. <em>Materie.</em>',
        'tech.sub': 'Çfarë bën realisht MUNDA — sisteme LED fleksibël të endura në tekstil për industrinë automobilistike.',
        'tech.c1t': 'TEKSTILE TË NDRIÇUARA', 'tech.c1d': 'Mikro-LED të endura direkt në pëlhurë të butë — një material që përcjell dritën, jo vetëm fije.',
        'tech.c2t': 'INTEGRIMI LED', 'tech.c2d': 'Emitterë fleksibël që përkulen, palosen dhe mbështjellin çdo sipërfaqe të kabinës — një dritë e vetme e pandërprerë.',
        'tech.c3t': 'TEKNOLOGJI INTERIORI AUTOMOTIV', 'tech.c3d': 'E integruar në pult, dyer, vende dhe çati të automjeteve premium nga fabrika MUNDA në Obiliq.',
        'tech.c4t': 'INOVACIONI', 'tech.c4d': 'Ngjyra, modele dhe gjendje të pafundme — të krijuara sipas kërkesës nga një tekstil i vetëm i lidhur.',
        'game.kicker': 'PËRVOJA', 'game.title': 'Bëhu një <em>inxhinier dizajni</em> i MUNDA-s.',
        'game.sub': 'Një udhëtim me pesë faza: DIZAJN → DRIÇIM → LIDHJE → TEST → PREZANTIM. Pastaj një MUNDA SCORE zbulon sa afër erdhe me ndërtimin e së ardhmes.',
        'game.shot1': 'Zgjidh tekstilin — baza e çdo dizajni.',
        'game.shot2': 'Lidh çdo modul LED me portën e tij te kontrolluesi.',
        'game.shot3': 'Pesë teste automobilistike vendosin fatin tënd.',
        'game.shot4': 'Prezantimi — interiori yt vjen në jetë.',
        'game.f1': '⚡ Motor ndriçimi live', 'game.f2': '🧵 4 materiale tekstili',
        'game.f3': '🎨 8 ngjyra · 7 modele', 'game.f4': '🔌 Mini-loja e kabllove',
        'game.f5': '🧪 5 teste automobilistike', 'game.f6': '🏆 XP · nivele · distinksione',
        'game.cta': 'LUAJ MUNDA FUTURE LAB',
        'score.kicker': 'PROVOJE TASH', 'score.title': 'Cila do të ishte <em>MUNDA SCORE</em>-ja jote?',
        'score.sub': 'Lëviz rrëshqitësit — e njëjta pikëzim që llogarit loja, live në shfletues.',
        'score.of': '/ 100', 'score.bright': 'NDRITSHMËRIA', 'score.eff': 'EFICENCA',
        'score.prec': 'SAKTËSIA', 'score.dur': 'QËNDRUESHMËRIA',
        'score.note': 'Ky është një demonstrim koncepti — në lojë, çdo vlerë vjen nga zgjedhjet e tua reale.',
        'gallery.kicker': 'HISTORIA VIZUALE', 'gallery.title': 'Një vështrim brenda <em>Future Lab.</em>',
        'gallery.t1': 'Kabina', 'gallery.t2': 'Tekstili në makro', 'gallery.t3': 'Lab-i',
        'gallery.t4': 'Bërthama LED', 'gallery.t5': 'Momenti i lojës', 'gallery.t6': 'Prezantimi',
        'gallery.t7': 'MUNDA', 'gallery.t8': 'Bërë në Kosovë',
        'gallery.wsub': 'DUKE NDRIÇUAR TË ARDHMEN E LËVIZJES',
        'gallery.c1': 'Kabina e ndriçuar — gjashtë zona, një përvojë drite e pandërprerë.',
        'gallery.c2': 'Emitterë LED fleksibël të endur në vetë tekstilin.',
        'gallery.c3': 'Brenda Future Lab-it, ku fillon çdo dizajn.',
        'gallery.c4': 'Bërthama LED — e hollë, fleksibël, e integruar.',
        'gallery.c5': 'Një ndërtim i përfunduar me 94 pikë në MUNDA SCORE.',
        'gallery.c6': 'Prezantimi final — interiori ndizet seksion pas seksioni.',
        'gallery.c7': 'MUNDA — duke ndriçuar të ardhmen e lëvizjes nga Kosova.',
        'gallery.c8': 'Inovacioni i bërë në Kosovë, duke lëvizur botën.',
        'team.kicker': 'NJERËZIT',
        'team.title': 'Ekipi pas <em>MUNDA Kosova SH.P.K.</em>',
        'team.sub': 'Specialistët që endin dritën në tekstil dhe sjellin Future Lab-in në jetë — nga fabrika në Obiliq për në botë.',
        'team.note': 'Fotot dhe emrat përditësohen nga dosja assets/photos — së shpejti foto reale të ekipit.',
        'team.role': 'MUNDA Kosova SH.P.K',
        'about.kicker': 'RRETH KOMPANISË',
        'about.title': 'MUNDA Kosova <em>SH.P.K.</em><br>Dritë nga zemra e Ballkanit.',
        'about.p1': 'MUNDA Kosova SH.P.K prodhon sisteme tekstili të ndriçuar për industrinë automobilistike — teknologji LED fleksibël e endur direkt në pëlhurë, e prodhuar në fabrikën e kompanisë në Obiliq, Kosovë.',
        'about.p2': 'Kjo përvojë është një projekt i garës Digital School. Të lejon të hysh në rolin e një inxhinieri dizajni të MUNDA-s dhe të ndërtosh ndriçimin e interiorit të automjetit premium të së ardhmes — pikërisht si funksionon produkti i vërtetë: dizajno, ndriço, lidh, testo, prezanto.',
        'about.s1': 'zona interioresh', 'about.s2': 'teste automobilistike', 'about.s3': 'MUNDA SCORE', 'about.s4': 'e ardhmja',
        'about.note': 'Interiori i automjetit është një koncept dizajni i krijuar për këtë përvojë. Nuk nënkuptohet asnjë partneritet markash.',
        'cta.kicker': 'SJELLJA', 'cta.title': 'Gati për ta dizajnuar<br>të <em>ardhmen?</em>',
        'cta.sub': 'Hyr në MUNDA Future Lab dhe krijo përvojën tënde të ndriçimit automotiv.',
        'cta.btn': 'FILLO DIZAJNIMIN',
        'foot.note': 'Bërë në Kosovë. Dizajnuar për të ardhmen. · Gara Digital School · Koncept dizajni — pa partneritet markash.'
      }
    });
  }

  /* =====================================================================
     HERO PARTICLES + PARALLAX
     ===================================================================== */
  function heroParticles() {
    var canvas = $('hero-canvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var W = 0, H = 0, pts = [];
    function resize() {
      W = canvas.width = canvas.offsetWidth;
      H = canvas.height = canvas.offsetHeight;
      pts = [];
      var n = Math.min(60, Math.floor(W / 26));
      for (var i = 0; i < n; i++) {
        pts.push({
          x: Math.random() * W, y: Math.random() * H,
          r: Math.random() * 1.8 + 0.4,
          v: Math.random() * 0.25 + 0.06,
          h: Math.random() * 60 + 195,
          a: Math.random() * 0.5 + 0.12,
          drift: Math.random() * Math.PI * 2
        });
      }
    }
    resize();
    window.addEventListener('resize', resize);
    var reduced = false;
    try { reduced = matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
    if (reduced) return;
    (function tick() {
      requestAnimationFrame(tick);
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < pts.length; i++) {
        var p = pts[i];
        p.y -= p.v;
        p.x += Math.sin(p.drift) * 0.18;
        p.drift += 0.008;
        if (p.y < -10) { p.y = H + 10; p.x = Math.random() * W; }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = 'hsla(' + p.h + ',90%,72%,' + p.a + ')';
        ctx.shadowBlur = 8;
        ctx.shadowColor = 'hsla(' + p.h + ',90%,70%,0.7)';
        ctx.fill();
      }
      ctx.shadowBlur = 0;
    })();
  }

  function heroParallax() {
    var svg = $('hero-svg');
    if (!svg) return;
    var reduced = false;
    try { reduced = matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
    if (reduced) return;
    document.addEventListener('mousemove', function (e) {
      var x = (e.clientX / window.innerWidth - 0.5);
      var y = (e.clientY / window.innerHeight - 0.5);
      svg.style.transform = 'scale(1.02) translate(' + (x * -14) + 'px,' + (y * -10) + 'px)';
    });
  }

  /* =====================================================================
     INTERACTIVE CAR
     ===================================================================== */
  var carColor = '#2d6bff';
  var carBright = 80;
  var ZONE_INFO = {
    roof: ['z.roof', 'zd.roof'], dashboard: ['z.dashboard', 'zd.dashboard'],
    doors: ['z.doors', 'zd.doors'], console: ['z.console', 'zd.console'],
    seats: ['z.seats', 'zd.seats'], footwell: ['z.footwell', 'zd.footwell']
  };

  function applyCarLight() {
    var svg = $('interior-svg');
    if (!svg) return;
    svg.style.setProperty('--zc', carColor);
    var glow = 0.18 + (carBright / 100) * 0.45;
    var core = 0.45 + (carBright / 100) * 0.55;
    qsa('.ic-zone', svg).forEach(function (z) {
      z.querySelectorAll('path,ellipse').forEach(function (p, i) {
        var isHalo = i % 2 === 0;
        p.style.opacity = String(isHalo ? glow : core);
      });
    });
  }

  function initCar() {
    var svg = $('interior-svg');
    var info = $('zone-info');
    if (!svg) return;
    applyCarLight();

    var current = null;
    var dim = function (z) { if (current) current.classList.remove('hot'); qsa('.ic-zone', svg).forEach(function (g) { g.classList.add('dim'); }); };
    var undim = function () { qsa('.ic-zone', svg).forEach(function (g) { g.classList.remove('dim'); }); if (current) current.classList.add('hot'); };

    qsa('[data-hot]', svg).forEach(function (hot) {
      var zone = hot.getAttribute('data-hot');
      var zoneGroup = svg.querySelector('.ic-zone[data-zone="' + zone + '"]');

      hot.addEventListener('mouseenter', function () {
        sfx('hover');
        current = zoneGroup;
        undim();
        var t = ZONE_INFO[zone];
        if (info && t) {
          info.hidden = false;
          info.querySelector('b').textContent = (window.I18N ? I18N.t(t[0]) : t[0]);
          info.querySelector('p').textContent = (window.I18N ? I18N.t(t[1]) : t[1]);
        }
      });
      hot.addEventListener('mouseleave', function () {
        if (current === zoneGroup) { current = null; undim(); }
        if (info && !info.dataset.pinned) info.hidden = true;
      });
      hot.addEventListener('click', function () {
        sfx('select');
        if (info) {
          var wasPinned = info.dataset.pinned;
          if (wasPinned && wasPinned === zone) { delete info.dataset.pinned; info.hidden = true; }
          else { info.dataset.pinned = zone; info.hidden = false; }
        }
      });
      hot.addEventListener('focus', function () { current = zoneGroup; undim(); });
    });
    if (info) {
      info.querySelector('b').addEventListener('click', function () { delete info.dataset.pinned; info.hidden = true; });
    }

    // colour swatches
    qsa('#car-colors .cc-swatch').forEach(function (sw) {
      sw.addEventListener('click', function () {
        sfx('select');
        carColor = sw.getAttribute('data-car-color');
        qsa('#car-colors .cc-swatch').forEach(function (s) { s.classList.toggle('active', s === sw); });
        applyCarLight();
      });
    });

    // brightness
    var bright = $('car-bright');
    if (bright) {
      bright.addEventListener('input', function () {
        carBright = parseInt(bright.value, 10) || 80;
        applyCarLight();
      });
    }
  }

  /* =====================================================================
     MUNDA SCORE DEMO
     ===================================================================== */
  var RANKS = [
    { id: 'rookie', name: 'ROOKIE', min: 0, max: 39, color: '#8b93a7' },
    { id: 'engineer', name: 'ENGINEER', min: 40, max: 59, color: '#4df3ff' },
    { id: 'designer', name: 'DESIGNER', min: 60, max: 74, color: '#2d6bff' },
    { id: 'senior', name: 'SENIOR ENGINEER', min: 75, max: 89, color: '#9a4dff' },
    { id: 'master', name: 'MUNDA MASTER', min: 90, max: 99, color: '#ffc861' },
    { id: 'architect', name: 'FUTURE ARCHITECT', min: 100, max: 100, color: '#ff4d8d' }
  ];
  function rankFor(score) {
    for (var i = 0; i < RANKS.length; i++) {
      if (score >= RANKS[i].min && score <= RANKS[i].max) return RANKS[i];
    }
    return RANKS[0];
  }
  function updateScore() {
    var vals = {};
    qsa('[data-score-var]').forEach(function (r) {
      var v = parseInt(r.value, 10) || 0;
      vals[r.getAttribute('data-score-var')] = v;
      r.parentNode.querySelector('b').textContent = v;
      r.style.setProperty('--fill', v + '%');
    });
    var score = Math.round(
      vals.brightness * 0.30 + vals.efficiency * 0.25 +
      vals.precision * 0.25 + vals.durability * 0.20);
    score = Math.max(0, Math.min(100, score));
    var rank = rankFor(score);
    var num = $('score-num'), arc = $('score-arc'), rankEl = $('score-rank');
    if (num) num.textContent = score;
    if (arc) {
      var C = 540;
      arc.style.strokeDashoffset = C - (C * score / 100);
      arc.style.stroke = rank.color;
    }
    if (rankEl) {
      rankEl.textContent = rank.name;
      rankEl.style.color = rank.color;
    }
  }
  function initScore() {
    qsa('[data-score-var]').forEach(function (r) {
      r.addEventListener('input', function () { updateScore(); sfx('scoreTick'); });
    });
    updateScore();
  }

  /* =====================================================================
     GALLERY LIGHTBOX
     ===================================================================== */
  function initGallery() {
    var grid = $('gallery-grid');
    var lb = $('lightbox');
    if (!grid || !lb) return;
    function open(btn) {
      var captionKey = btn.getAttribute('data-caption');
      var caption = window.I18N ? I18N.t(captionKey) : captionKey;
      var stage = $('lb-stage');
      var clone = btn.querySelector('.gt-inner').cloneNode(true);
      clone.classList.remove('gt-inner');
      stage.innerHTML = '';
      stage.appendChild(clone);
      $('lb-caption').textContent = caption;
      lb.hidden = false;
      sfx('whoosh');
    }
    grid.addEventListener('click', function (e) {
      var tile = e.target.closest('.g-tile');
      if (tile) open(tile);
    });
    $('lb-close').addEventListener('click', function () { lb.hidden = true; sfx('back'); });
    lb.addEventListener('click', function (e) { if (e.target === lb) lb.hidden = true; });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') lb.hidden = true;
    });
  }

  /* =====================================================================
     NAV + SCROLL
     ===================================================================== */
  function initNav() {
    var nav = $('site-nav');
    var links = $('site-links');
    var burger = $('hamburger');
    if (burger) burger.addEventListener('click', function () {
      var open = links.classList.toggle('open');
      burger.classList.toggle('open', open);
      burger.setAttribute('aria-expanded', String(open));
      sfx('click');
    });
    qsa('[data-scroll]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var href = a.getAttribute('href');
        if (href && href.charAt(0) === '#') {
          e.preventDefault();
          var target = document.querySelector(href);
          if (target) target.scrollIntoView({ behavior: 'smooth' });
          links.classList.remove('open');
          burger.classList.remove('open');
          sfx('click');
        }
      });
    });
    // sticky + active section
    var sections = qsa('section[id]');
    window.addEventListener('scroll', function () {
      nav.classList.toggle('scrolled', window.scrollY > 30);
      var y = window.scrollY + 140;
      var currentId = null;
      for (var i = 0; i < sections.length; i++) {
        if (sections[i].offsetTop <= y) currentId = sections[i].id;
      }
      qsa('#site-links a').forEach(function (a) {
        var href = a.getAttribute('href');
        a.classList.toggle('active', href === '#' + currentId);
      });
    }, { passive: true });
  }

  /* =====================================================================
     SCROLL REVEAL
     ===================================================================== */
  function initReveal() {
    var els = qsa('.sec, .hero');
    els.forEach(function (el) {
      el.classList.add('reveal');
      Array.prototype.slice.call(el.children).forEach(function (c, i) {
        if (i < 4 && !c.classList.contains('reveal')) {
          c.classList.add('reveal');
          c.setAttribute('data-delay', String(i));
        }
      });
    });
    if (!('IntersectionObserver' in window)) {
      qsa('.reveal').forEach(function (el) { el.classList.add('in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add('in');
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    qsa('.reveal').forEach(function (el) { io.observe(el); });
  }

  /* =====================================================================
     AUDIO / FX WIRING (defensive)
     ===================================================================== */
  function initFx() {
    // unlock audio on first interaction + start soft menu music
    var started = false;
    function start() {
      if (started) return;
      started = true;
      if (window.Sound) {
        try { Sound.unlock(); Sound.music('menu'); } catch (e) {}
      }
      document.removeEventListener('pointerdown', start);
      document.removeEventListener('keydown', start);
    }
    document.addEventListener('pointerdown', start);
    document.addEventListener('keydown', start);

    // hover + click sounds on interactive elements
    document.addEventListener('mouseover', function (e) {
      if (e.target.closest('a, button, .cc-swatch, .g-tile, input')) sfx('hover');
    });
    document.addEventListener('click', function (e) {
      var b = e.target.closest('a, button');
      if (b) {
        sfx('click');
        if (window.FX) { try { FX.ripple(b, e); } catch (err) {} }
        if (b.id === 'cta-play' && window.FX) {
          try { FX.burst(window.innerWidth / 2, window.innerHeight / 2, { count: 70, colors: ['#2d6bff', '#4df3ff', '#ffc861'], size: 3, speed: 3.5 }); } catch (err) {}
        }
      }
    });
  }

  /* =====================================================================
     INIT
     ===================================================================== */
  function init() {
    if (window.I18N) { try { I18N.apply(); } catch (e) {} }
    heroParticles();
    heroParallax();
    initCar();
    initScore();
    initGallery();
    initNav();
    initReveal();
    initFx();
    // language switch re-render of dynamic text
    document.addEventListener('munda:lang', function () {
      if (window.I18N) I18N.apply();
      // refresh pinned zone info
      var info = $('zone-info');
      if (info && info.dataset.pinned) {
        var t = ZONE_INFO[info.dataset.pinned];
        if (t) {
          info.querySelector('b').textContent = I18N.t(t[0]);
          info.querySelector('p').textContent = I18N.t(t[1]);
        }
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
