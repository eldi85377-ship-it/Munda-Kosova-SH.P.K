/* =====================================================================
   MUNDA — bilingual engine (EN / SQ)
   Load this BEFORE any module that registers a dictionary.

   Contract for other modules:
     I18N.register({ en:{ 'key':'English' }, sq:{ 'key':'Shqip' } });
     I18N.apply();                      // refresh the DOM
     I18N.t('key')                      // read a string in code
     I18N.set('sq') / I18N.toggle()
     document.addEventListener('munda:lang', fn)   // re-render on change

   Markup:
     <h1 data-i18n="hero.title">fallback text</h1>
     <h1 data-i18n="hero.title" data-i18n-html>allows <em>markup</em></h1>
     <input data-i18n-attr="placeholder:form.name,title:form.hint">
   ===================================================================== */
(function () {
  'use strict';

  var LS = 'munda_lang';
  var dicts = { en: {}, sq: {} };
  var lang = 'en';

  try {
    var stored = localStorage.getItem(LS);
    if (stored === 'en' || stored === 'sq') lang = stored;
  } catch (e) { /* private mode */ }

  function register(dict) {
    if (!dict) return;
    ['en', 'sq'].forEach(function (L) {
      var d = dict[L];
      if (!d) return;
      for (var k in d) {
        if (Object.prototype.hasOwnProperty.call(d, k)) dicts[L][k] = d[L === L ? k : k];
      }
    });
    return API;
  }

  function t(key, fallback) {
    if (key == null) return '';
    var v = dicts[lang] ? dicts[lang][key] : undefined;
    if (v == null && lang !== 'en') v = dicts.en[key];
    if (v == null) return fallback != null ? fallback : key;
    return v;
  }

  function applyAttrs(el) {
    var spec = el.getAttribute('data-i18n-attr');
    if (!spec) return;
    spec.split(',').forEach(function (pair) {
      var bits = pair.split(':');
      if (bits.length < 2) return;
      var attr = bits[0].trim(), key = bits[1].trim();
      var val = t(key, null);
      if (val != null) el.setAttribute(attr, val);
    });
  }

  function apply(root) {
    root = root || document;
    var nodes = root.querySelectorAll('[data-i18n]');
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      var val = t(el.getAttribute('data-i18n'), null);
      if (val == null) continue;
      if (el.hasAttribute('data-i18n-html')) el.innerHTML = val;
      else el.textContent = val;
    }
    var attrNodes = root.querySelectorAll('[data-i18n-attr]');
    for (var j = 0; j < attrNodes.length; j++) applyAttrs(attrNodes[j]);

    try { document.documentElement.setAttribute('lang', lang); } catch (e) {}
    if (document.body) document.body.setAttribute('data-lang', lang);

    // reflect state on any language switcher
    var sw = document.querySelectorAll('[data-lang-set]');
    for (var s = 0; s < sw.length; s++) {
      sw[s].classList.toggle('active', sw[s].getAttribute('data-lang-set') === lang);
      sw[s].setAttribute('aria-pressed', String(sw[s].getAttribute('data-lang-set') === lang));
    }
    return API;
  }

  function set(next) {
    if (next !== 'en' && next !== 'sq') return API;
    if (next === lang) { apply(); return API; }
    lang = next;
    try { localStorage.setItem(LS, lang); } catch (e) {}
    apply();
    document.dispatchEvent(new CustomEvent('munda:lang', { detail: { lang: lang } }));
    return API;
  }

  function toggle() { return set(lang === 'en' ? 'sq' : 'en'); }

  /* delegated language switcher — works on both surfaces */
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-lang-set]');
    if (btn) { e.preventDefault(); set(btn.getAttribute('data-lang-set')); return; }
    var tog = e.target.closest('[data-lang-toggle]');
    if (tog) { e.preventDefault(); toggle(); }
  });

  var API = {
    register: register,
    apply: apply,
    set: set,
    toggle: toggle,
    t: t,
    get lang() { return lang; },
    dicts: dicts
  };

  window.I18N = API;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { apply(); });
  }
})();
