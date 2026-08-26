/* =====================================================================
   MONDO — the MUNDA AI assistant
   ---------------------------------------------------------------------
   A friendly rule-based assistant with a rich knowledge base about
   MUNDA Kosova SH.P.K (real company data: ARBK registry, munda.tech,
   press coverage). Bilingual EN/SQ — follows the site language.
   Appears ONLY when the visitor clicks the "AI PËR TY" side button.
   ===================================================================== */
(function () {
  'use strict';

  function lang() { return (window.I18N && I18N.lang) || 'en'; }
  function t(key, fallback) { return window.I18N ? I18N.t(key, fallback) : (fallback != null ? fallback : key); }

  /* normalize: lowercase + strip diacritics so "çfarë"/"cfare" both match */
  function norm(s) {
    return String(s || '').toLowerCase()
      .replace(/[ëèéê]/g, 'e').replace(/[çč]/g, 'c').replace(/[š]/g, 's')
      .replace(/[àâ]/g, 'a').replace(/[ïî]/g, 'i').replace(/[òô]/g, 'o').replace(/[ùû]/g, 'u')
      .replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  var MAP_LINK = '<a href="https://www.openstreetmap.org/?mlat=42.70215&mlon=21.11169#map=15/42.7022/21.1117" target="_blank" rel="noopener">Rruga Koliqi, Nr. 5, Obiliq</a> · <a href="https://www.google.com/maps/dir/?api=1&destination=42.70215,21.11169" target="_blank" rel="noopener">directions</a>';

  /* ---- knowledge base: keys are matched (normalized) against the question ---- */
  var KB = [
    {
      id: 'what',
      keys: ['what is munda', 'what munda', 'cfare eshte munda', 'eshte munda', 'kompani', 'company', 'about munda', 'rreth munda', 'who are you', 'kush je'],
      en: '<b>MUNDA Kosova SH.P.K.</b> is a Kosovo-based company that produces <b>illuminated textile systems</b> for the automotive industry — flexible LED technology woven directly into fabric. It is the <b>first Volkswagen Group-approved supplier in Kosovo</b> and part of the supply chain of world-renowned brands such as <b>Audi</b>. The company was founded on <b>1 March 2023</b> in <b>Obiliq</b> with a registered capital of <b>€500,000</b> (NUI 812019132).',
      sq: '<b>MUNDA Kosova SH.P.K.</b> është një kompani me bazë në Kosovë që prodhon <b>sisteme tekstili të ndriçuar</b> për industrinë automobilistike — teknologji LED fleksibël e endur direkt në pëlhurë. Është <b>furnizuesi i parë i miratuar nga Grupi Volkswagen në Kosovë</b> dhe pjesë e zinxhirit të furnizimit të markave si <b>Audi</b>. Kompania u themelua më <b>1 mars 2023</b> në <b>Obiliq</b> me kapital të regjistruar <b>€500,000</b> (NUI 812019132).'
    },
    {
      id: 'history',
      keys: ['history', 'historia', 'aunde', 'mentor', 'joint venture', 'sipërmarrje', 'sipërmarrja', 'themelua', 'themeluar', 'found', '2019', 'jv'],
      en: 'The story starts in <b>2019</b>, when two German industrial giants — <b>AUNDE</b> (technical textiles, founded 1899, ~24,500 employees) and <b>MENTOR</b> (LED lighting since 1920) — founded the joint venture <b>MUNDA Textile Lichtsysteme GmbH</b> in Erkrath, Germany. The name <b>MUNDA</b> comes from <b>MEN</b>tor + <b>AUND</b>E. MUNDA Kosova SH.P.K. (Obiliq, since March 2023) is its Kosovo subsidiary.',
      sq: 'Historia fillon në <b>2019</b>, kur dy gjigantë gjermanë — <b>AUNDE</b> (tekstile teknike, themeluar 1899, ~24,500 punonjës) dhe <b>MENTOR</b> (ndriçim LED që nga 1920) — themeluan sipërmarrjen e përbashkët <b>MUNDA Textile Lichtsysteme GmbH</b> në Erkrath, Gjermani. Emri <b>MUNDA</b> vjen nga <b>MEN</b>tor + <b>AUND</b>E. MUNDA Kosova SH.P.K. (Obiliq, që nga marsi 2023) është filiali i saj në Kosovë.'
    },
    {
      id: 'audi',
      keys: ['audi', 'a3', 'facelift', 'makina e pare', 'makina e parë', 'first car', 'world premiere', 'premiera', 'premier'],
      en: 'The <b>Audi A3 Facelift 2024</b> is the <b>first series-production car in the world</b> to integrate MUNDA textile lighting: the illuminated textile system is built into the <b>door trims</b> of the vehicle, bringing large-area ambient light even into crash-sensitive zones. The world premiere took place in <b>summer 2024</b> — and MUNDA Kosova delivers components for this supply chain from Obiliq.',
      sq: '<b>Audi A3 Facelift 2024</b> është <b>makina e parë serike në botë</b> që integron ndriçimin tekstil MUNDA: sistemi i ndriçuar është i ndërtuar në <b>panelet e dyerve</b> të automjetit, duke sjellë dritë ambientale në sipërfaqe të mëdha edhe në zona të ndjeshme ndaj përplasjeve. Premiera botërore u zhvillua në <b>verën e 2024</b> — dhe MUNDA Kosova dërgon komponentë për këtë zinxhir furnizimi nga Obiliqi.'
    },
    {
      id: 'plant',
      keys: ['obiliq', 'plant', 'fabrika', 'fabrike', 'factory', 'ku eshte', 'ku është', 'where is', 'location', 'vendodhja', 'adresa', 'address', 'map', 'harta'],
      en: 'The MUNDA Kosova plant is in <b>Obiliq, Kosovo</b> — ' + MAP_LINK + '. The company was registered on <b>1 March 2023</b>, and the production plant was officially <b>inaugurated in April 2025</b> (announced by the Ministry of Industry, Entrepreneurship and Trade of Kosovo).',
      sq: 'Fabrika e MUNDA Kosova është në <b>Obiliq, Kosovë</b> — ' + MAP_LINK + '. Kompania u regjistrua më <b>1 mars 2023</b>, dhe fabrika u <b>inaugurua zyrtarisht në prill 2025</b> (njoftuar nga Ministria e Industrisë, Ndërmarrësisë dhe Tregtisë së Kosovës).'
    },
    {
      id: 'vw',
      keys: ['vw', 'volkswagen', 'grupi', 'approved', 'miratuar', 'furnizues', 'supplier', 'akredit'],
      en: '<b>MUNDA Kosova</b> is the <b>first supplier approved by the Volkswagen Group in Kosovo</b> — a strategic production investment in the country\'s automotive industry, supplying components for brands like <b>Audi</b>.',
      sq: '<b>MUNDA Kosova</b> është <b>furnizuesi i parë i miratuar nga Grupi Volkswagen në Kosovë</b> — një investim strategjik prodhues në industrinë automobilistike të vendit, që furnizon komponentë për marka si <b>Audi</b>.'
    },
    {
      id: 'tech',
      keys: ['technology', 'teknologji', 'product', 'produkt', 'textile', 'tekstil', 'led', 'si punon', 'how it works', 'light', 'drite', 'drita', 'fabric', 'pelhure', 'pëlhurë', 'ambient'],
      en: 'MUNDA\'s technology is <b>textile light</b>: micro-LEDs are woven directly into soft fabric, so the textile itself becomes a light source. It is flexible, drapable and can be integrated into <b>dashboards, doors, seats and roofs</b> of vehicles. Colours, patterns and animations are generated on demand — one connected textile, infinite moods. It also enables large-area ambient lighting in crash-sensitive zones (as in the Audi A3).',
      sq: 'Teknologjia e MUNDA-s është <b>drita tekstile</b>: mikro-LED të endur direkt në pëlhurë të butë, kështu që vetë tekstili bëhet burim drite. Është fleksibël, i formueshëm dhe mund të integrohet në <b>pult, dyer, vende dhe çati</b> të automjeteve. Ngjyrat, modelet dhe animacionet krijohen sipas kërkesës — një tekstil i vetëm i lidhur, gjendje të pafundme. Mundëson edhe ndriçim ambient në zona të ndjeshme ndaj përplasjeve (si në Audi A3).'
    },
    {
      id: 'team',
      keys: ['team', 'ekip', 'kai', 'muxel', 'grainca', 'drejtor', 'menaxher', 'manager', 'udheheq', 'udhëheq', 'people', 'njerez', 'njerëz', 'leadership'],
      en: 'The leadership of MUNDA: <b>Kai Muxel</b> — Managing Director of MUNDA Textile Lichtsysteme GmbH, and <b>Kushtrim Grainca</b> — authorized representative of MUNDA Kosova SH.P.K. The joint-venture partners are <b>Dennis Weyer & Wido Weyer</b> (MENTOR) and <b>Peter Bolten</b> (AUNDE). You can see them in the Team section of this website.',
      sq: 'Udhëheqja e MUNDA-s: <b>Kai Muxel</b> — drejtor menaxhues i MUNDA Textile Lichtsysteme GmbH, dhe <b>Kushtrim Grainca</b> — përfaqësues i autorizuar i MUNDA Kosova SH.P.K. Partnerët e sipërmarrjes janë <b>Dennis Weyer & Wido Weyer</b> (MENTOR) dhe <b>Peter Bolten</b> (AUNDE). Mund t\'i shihni në seksionin e Ekipit në këtë website.'
    },
    {
      id: 'contact',
      keys: ['contact', 'kontakt', 'email', 'phone', 'telefoni', 'telefon', 'tel', 'reach', 'kontakto', 'na kontakto', 'mail', 'linkedin', 'munda.tech'],
      en: 'Here is how to reach MUNDA:<br>📧 <a href="mailto:welcome@munda.tech">welcome@munda.tech</a><br>☎️ +49 211 695289 92<br>🌐 <a href="https://www.munda.tech" target="_blank" rel="noopener">www.munda.tech</a><br>💼 <a href="https://www.linkedin.com/company/munda-kosova" target="_blank" rel="noopener">LinkedIn — @munda-kosova</a><br>🏭 ' + MAP_LINK + '<br>There is also a full Contact page: <a href="contact.html">Contact →</a>',
      sq: 'Ja si ta kontaktoni MUNDA-n:<br>📧 <a href="mailto:welcome@munda.tech">welcome@munda.tech</a><br>☎️ +49 211 695289 92<br>🌐 <a href="https://www.munda.tech" target="_blank" rel="noopener">www.munda.tech</a><br>💼 <a href="https://www.linkedin.com/company/munda-kosova" target="_blank" rel="noopener">LinkedIn — @munda-kosova</a><br>🏭 ' + MAP_LINK + '<br>Ekziston edhe një faqe e plotë Kontaktesh: <a href="contact.html">Kontakt →</a>'
    },
    {
      id: 'careers',
      keys: ['career', 'karriere', 'karrierë', 'karriera', 'pune', 'punë', 'punesim', 'punësim', 'jobs', 'job', 'personio', 'aplikim', 'apply', 'work'],
      en: 'MUNDA is growing! Current job openings for the Kosovo plant are published on <a href="https://munda-tech.jobs.personio.com" target="_blank" rel="noopener">munda-tech.jobs.personio.com</a>. You can also send an open application to <a href="mailto:jobs@munda.tech">jobs@munda.tech</a> (contact: Kai Muxel, +49 211 9507373-32).',
      sq: 'MUNDA po rritet! Vendet e lira të punës për fabrikën në Kosovë publikohen në <a href="https://munda-tech.jobs.personio.com" target="_blank" rel="noopener">munda-tech.jobs.personio.com</a>. Mund të dërgoni edhe aplikim të hapur në <a href="mailto:jobs@munda.tech">jobs@munda.tech</a> (kontakt: Kai Muxel, +49 211 9507373-32).'
    },
    {
      id: 'game',
      keys: ['game', 'loje', 'lojë', 'loja', 'play', 'luaj', 'start', 'si ta luaj', 'experience', 'pervoje', 'përvojë', 'future lab', 'challenge', 'sfida', 'build'],
      en: '🎮 <b>MUNDA FUTURE LAB</b> is the interactive experience of this website: you become a MUNDA design engineer and build the illuminated interior of a premium vehicle in <b>five phases — DESIGN → LIGHT → CONNECT → TEST → SHOWCASE</b> — against a <b>1:30</b> clock. Every choice is scored and your <b>MUNDA SCORE</b> reveals your rank, from ROOKIE to FUTURE ARCHITECT. Ready? <a class="mondo-start" href="experience.html">▶ START THE GAME</a>',
      sq: '🎮 <b>MUNDA FUTURE LAB</b> është përvoja interaktive e këtij website-i: bëhesh inxhinier dizajni i MUNDA-s dhe ndërton interiorin e ndriçuar të një automjeti premium në <b>pesë faza — DIZAJN → DRIÇIM → LIDHJE → TEST → PREZANTIM</b> — kundër orës <b>1:30</b>. Çdo zgjedhje vlerësohet dhe <b>MUNDA SCORE</b> yt zbulon gradën, nga ROOKIE te FUTURE ARCHITECT. Gati? <a class="mondo-start" href="experience.html">▶ FILLO LOJËN</a>'
    },
    {
      id: 'score',
      keys: ['score', 'grada', 'rank', 'pike', 'pikë', 'result', 'rezultat', 'ranking', 'renditje', 'architect'],
      en: 'The <b>MUNDA SCORE</b> (0–100) is computed from your real choices in the game: materials, colours, patterns, brightness, wiring accuracy and the five automotive tests. It determines your rank — <b>ROOKIE → ENGINEER → DESIGNER → SENIOR ENGINEER → MUNDA MASTER → FUTURE ARCHITECT</b> — and earns you XP, levels, badges and unlockable content.',
      sq: '<b>MUNDA SCORE</b> (0–100) llogaritet nga zgjedhjet e tua reale në lojë: materialet, ngjyrat, modelet, ndriçimi, saktësia e lidhjeve dhe pesë testet automobilistike. Përcakton gradën tënde — <b>ROOKIE → ENGINEER → DESIGNER → SENIOR ENGINEER → MUNDA MASTER → FUTURE ARCHITECT</b> — dhe sjell XP, nivele, distinktione dhe përmbajtje të zhbllokueshme.'
    },
    {
      id: 'registration',
      keys: ['nui', 'regjistrim', 'registration', 'capital', 'kapital', '500', 'shpk', 'llc', 'legal', 'ligjor', 'biznes', 'business'],
      en: 'Business facts: <b>MUNDA Kosova SH.P.K.</b> — NUI <b>812019132</b>, founded <b>1 March 2023</b> in Obiliq, registered capital <b>€500,000</b>, 100% owned by MUNDA Textile Lichtsysteme GmbH. Registered activities include textile finishing (NACE 1330), manufacture of electric lighting equipment (2740), technical textiles (1396) and wholesale of motor-vehicle parts (4531).',
      sq: 'Të dhëna biznesi: <b>MUNDA Kosova SH.P.K.</b> — NUI <b>812019132</b>, themeluar <b>1 mars 2023</b> në Obiliq, kapital i regjistruar <b>€500,000</b>, 100% pronë e MUNDA Textile Lichtsysteme GmbH. Aktivitetet e regjistruara përfshijnë përpunimin final të tekstilit (NACE 1330), prodhimin e pajisjeve elektrike të ndriçimit (2740), tekstilet teknike (1396) dhe tregtinë me shumicë të pjesëve të automjeteve (4531).'
    },
    {
      id: 'hq',
      keys: ['hq', 'selia', 'seli', 'erkrath', 'gjermani', 'germany', 'gmbh', 'parent', 'prindi', 'headquarters'],
      en: 'The headquarters of the group is <b>MUNDA Textile Lichtsysteme GmbH, Heinrich-Hertz-Straße 7, Erkrath, Germany</b> — the joint venture of AUNDE and MENTOR. MUNDA Kosova SH.P.K. (Obiliq) is its production subsidiary.',
      sq: 'Selia e grupit është <b>MUNDA Textile Lichtsysteme GmbH, Heinrich-Hertz-Straße 7, Erkrath, Gjermani</b> — sipërmarrja e përbashkët e AUNDE dhe MENTOR. MUNDA Kosova SH.P.K. (Obiliq) është filiali i saj prodhues.'
    },
    {
      id: 'site',
      keys: ['website', 'site', 'faqja', 'web', 'projekt', 'project', 'school', 'shkolle', 'shkollë', 'digital school', 'jurie', 'juria', 'competition', 'gare', 'garë'],
      en: 'This website is a <b>Digital School competition project</b> made in Kosovo. It presents the real company MUNDA Kosova SH.P.K. and its technology, plus the interactive <b>MUNDA FUTURE LAB</b> game where you design your own illuminated interior. Website and game share the same premium design language — navy blue, green accent and black.',
      sq: 'Ky website është një <b>projekt i garës Digital School</b> i bërë në Kosovë. Prezanton kompaninë reale MUNDA Kosova SH.P.K. dhe teknologjinë e saj, plus lojën interaktive <b>MUNDA FUTURE LAB</b> ku dizajnon interiorin tënd të ndriçuar. Website-i dhe loja ndajnë të njëjtën gjuhë premium dizajni — blu navy, thekse jeshile dhe të zezë.'
    },
    {
      id: 'gallery',
      keys: ['gallery', 'galeri', 'galeria', 'foto', 'photo', 'photos', 'images', 'imazhe', 'audi a3 foto'],
      en: 'The Gallery section shows real photos: the <b>Audi A3 with MUNDA textile lighting</b>, MUNDA product and technology shots, the plant/team and gameplay captures — all from the official munda.tech website or the game itself.',
      sq: 'Seksioni i Galerisë tregon foto reale: <b>Audi A3 me ndriçim tekstil MUNDA</b>, produkte dhe teknologji MUNDA, fabrika/ekipi dhe pamje nga loja — të gjitha nga faqja zyrtare munda.tech ose nga vetë loja.'
    },
    {
      id: 'hello',
      keys: ['hello', 'hi', 'hey', 'pershendetje', 'përshëndetje', 'tung', 'ckemi', 'mirë se erdhe', 'mir se erdhe', 'perse', 'gjum'],
      en: 'Hello! 👋 I am <b>Mondo</b> — the little AI engineer from the MUNDA lab in Obiliq, powered by light ⚡. Ask me anything about MUNDA Kosova SH.P.K: the company, the Audi A3 technology, the plant, contacts or the game. How can I help?',
      sq: 'Përshëndetje! 👋 Unë jam <b>Mondo</b> — inxhinieri i vogël AI i laboratorit MUNDA në Obiliq, i fuqizuar nga drita ⚡. Më pyet çdo gjë për MUNDA Kosova SH.P.K: kompaninë, teknologjinë e Audi A3, fabrikën, kontaktet ose lojën. Si mund të të ndihmoj?'
    },
    {
      id: 'thanks',
      keys: ['thanks', 'thank you', 'faleminderit', 'falem', 'flm', 'mirupafshim', 'bye', 'lamtumire', 'lamtumirë'],
      en: 'You\'re welcome! 😊 If you need anything else — the company, the technology or the game — I\'m here. Or visit the <a href="contact.html">Contact page</a>.',
      sq: 'S\'ka përse! 😊 Nëse të duhet diçka tjetër — kompania, teknologjia apo loja — jam këtu. Ose vizito <a href="contact.html">faqen e Kontakteve</a>.'
    },
    {
      id: 'mondo',
      keys: ['mondo', 'ai', 'asistent', 'assistant', 'bot', 'robot', 'ti je'],
      en: 'I am <b>Mondo</b> — the AI assistant of MUNDA Kosova. I know the company inside out: the joint venture of AUNDE & MENTOR, the Audi A3 world premiere, the plant in Obiliq, the team, contacts, careers and the MUNDA FUTURE LAB game. Try asking: "Audi A3?" or "Ku është fabrika?" 😉',
      sq: 'Unë jam <b>Mondo</b> — asistenti AI i MUNDA Kosova. E njoh kompaninë në detaje: sipërmarrjen e AUNDE & MENTOR, premierën botërore të Audi A3, fabrikën në Obiliq, ekipin, kontaktet, karrierat dhe lojën MUNDA FUTURE LAB. Provo të pyesësh: "Audi A3?" ose "Ku është fabrika?" 😉'
    }
  ];

  var FALLBACK = {
    en: 'Hmm, I don\'t have that in my knowledge base yet 🤔 — but I can tell you about the <b>company</b>, the <b>Audi A3</b> technology, the <b>plant in Obiliq</b>, <b>contacts</b>, <b>careers</b> or the <b>game</b>. Or write to <a href="mailto:welcome@munda.tech">welcome@munda.tech</a>.',
    sq: 'Hmm, këtë nuk e kam në bazën time të njohurive ende 🤔 — por mund të të tregoj për <b>kompaninë</b>, teknologjinë e <b>Audi A3</b>, <b>fabrikën në Obiliq</b>, <b>kontaktet</b>, <b>karrierat</b> ose <b>lojën</b>. Ose shkruaj në <a href="mailto:welcome@munda.tech">welcome@munda.tech</a>.'
  };

  var WELCOME = {
    en: 'Hi! 👋 I\'m <b>Mondo</b> — the little AI engineer from the MUNDA lab in Obiliq, powered by light ⚡. I know everything about <b>MUNDA Kosova SH.P.K</b>: the joint venture of AUNDE & MENTOR, the <b>Audi A3</b> world premiere, the plant in <b>Obiliq</b>, contacts, careers and the <b>MUNDA FUTURE LAB</b> game. What would you like to know?',
    sq: 'Përshëndetje! 👋 Unë jam <b>Mondo</b> — inxhinieri i vogël AI i laboratorit MUNDA në Obiliq, i fuqizuar nga drita ⚡. Di gjithçka për <b>MUNDA Kosova SH.P.K</b>: sipërmarrjen e AUNDE & MENTOR, premierën botërore të <b>Audi A3</b>, fabrikën në <b>Obiliq</b>, kontaktet, karrierat dhe lojën <b>MUNDA FUTURE LAB</b>. Çfarë do të dish?'
  };

  var CHIPS = {
    en: ['What is MUNDA?', 'Audi A3 story', 'Where is the plant?', 'Contacts', 'Careers', 'How to play the game?'],
    sq: ['Çfarë është MUNDA?', 'Historia e Audi A3', 'Ku është fabrika?', 'Kontaktet', 'Karriera', 'Si ta luaj lojën?']
  };

  /* ---------- UI ---------- */
  var btn = document.getElementById('mondo-btn');
  var panel = document.getElementById('mondo-panel');
  var body = document.getElementById('mondo-body');
  var chipsEl = document.getElementById('mondo-chips');
  var input = document.getElementById('mondo-input');
  var send = document.getElementById('mondo-send');
  var close = document.getElementById('mondo-close');
  var opened = false, busy = false;

  function addMsg(html, who) {
    var div = document.createElement('div');
    div.className = 'mondo-msg ' + who;
    if (who === 'bot') div.innerHTML = html;      // trusted KB strings only
    else div.textContent = html;                  // user input — plain text
    body.appendChild(div);
    body.scrollTop = body.scrollHeight;
    return div;
  }

  function typing() {
    var div = document.createElement('div');
    div.className = 'mondo-msg bot';
    div.innerHTML = '<span class="mondo-typing"><i></i><i></i><i></i></span>';
    body.appendChild(div);
    body.scrollTop = body.scrollHeight;
    return div;
  }

  function renderChips() {
    chipsEl.innerHTML = '';
    (CHIPS[lang()] || CHIPS.en).forEach(function (c) {
      var b = document.createElement('button');
      b.className = 'mondo-chip';
      b.textContent = c;
      b.addEventListener('click', function () { ask(c); });
      chipsEl.appendChild(b);
    });
  }

  function answer(q) {
    var n = norm(q);
    var best = null, bestScore = 0;
    KB.forEach(function (item) {
      var score = 0;
      item.keys.forEach(function (k) {
        var nk = norm(k);
        if (nk.length > 1 && n.indexOf(nk) !== -1) score += nk.length > 4 ? 3 : 2;
      });
      if (score > bestScore) { bestScore = score; best = item; }
    });
    if (!best || bestScore === 0) return FALLBACK[lang()] || FALLBACK.en;
    return (lang() === 'sq' && best.sq) ? best.sq : best.en;
  }

  function ask(text) {
    if (busy) return;
    var q = String(text || '').trim();
    if (!q) return;
    addMsg(q, 'user');
    input.value = '';
    busy = true;
    send.disabled = true;
    var t = typing();
    var delay = 500 + Math.min(900, q.length * 12);
    setTimeout(function () {
      t.remove();
      addMsg(answer(q), 'bot');
      busy = false;
      send.disabled = false;
      input.focus();
    }, delay);
  }

  function open() {
    if (opened) return;
    opened = true;
    panel.classList.add('open');
    if (body.children.length === 0) {
      addMsg(WELCOME[lang()] || WELCOME.en, 'bot');
      renderChips();
    } else {
      renderChips();
    }
    input.focus();
  }
  function shut() {
    opened = false;
    panel.classList.remove('open');
  }

  if (btn) btn.addEventListener('click', open);
  if (close) close.addEventListener('click', shut);
  if (send) send.addEventListener('click', function () { ask(input.value); });
  if (input) {
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') ask(input.value); });
  }
  if (document.addEventListener) {
    document.addEventListener('munda:lang', renderChips);
  }
})();
