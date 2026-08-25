/* =====================================================================
   MUNDA FUTURE LAB — Team / Staff section (index.html)
   ---------------------------------------------------------------------
   Renders the team grid. To add REAL people: drop a photo in
   assets/photos/ (e.g. assets/photos/ardi.jpg) and add an entry below:

     { name: 'Ardi Krasniqi', role: 'General Manager',
       bio: 'Leads MUNDA Kosova SH.P.K from the factory in Obiliq.',
       photo: 'assets/photos/ardi.jpg' }

   If no photo is found (or no name is given) the card falls back to a
   clean initials avatar, so the section never looks broken.
   ===================================================================== */
(function () {
  'use strict';

  /* ---- EDIT ME: the real team of MUNDA Kosova SH.P.K ---- */
  var TEAM = [
    { name: '', role: 'General Manager', bio: 'Leads MUNDA Kosova SH.P.K and its automotive partnerships from Obiliq.', photo: 'assets/photos/manager.jpg' },
    { name: '', role: 'Operations', bio: 'Keeps the production line and illuminated textile processes running.', photo: 'assets/photos/operations.jpg' },
    { name: '', role: 'Quality & Testing', bio: 'Runs the automotive tests behind every certified MUNDA product.', photo: 'assets/photos/quality.jpg' },
    { name: '', role: 'Engineering', bio: 'Designs the flexible LED systems woven into every interior.', photo: 'assets/photos/engineering.jpg' }
  ];

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function t(key, fb) { return window.I18N ? I18N.t(key, fb) : (fb != null ? fb : key); }
  function initials(name, role) {
    var src = (name || role || 'MUNDA').trim();
    var parts = src.split(/\s+/);
    var a = (parts[0] || 'M').charAt(0);
    var b = parts.length > 1 ? parts[parts.length - 1].charAt(0) : '';
    return (a + b).toUpperCase();
  }

  function render() {
    var grid = $('team-grid');
    if (!grid) return;
    grid.innerHTML = '';
    TEAM.forEach(function (member, i) {
      var name = (member.name || '').trim();
      var role = member.role || 'MUNDA TEAM';
      var card = document.createElement('article');
      card.className = 'team-card glass';
      card.style.setProperty('--i', i);

      var photoHtml;
      if (member.photo && name) {
        photoHtml = '<span class="tc-photo"><img src="' + esc(member.photo) +
          '" alt="' + esc(name) + '" loading="lazy" onerror="this.parentNode.classList.add(\'noimg\');this.remove()">' +
          '<i class="tc-initials">' + esc(initials(name, role)) + '</i></span>';
      } else {
        photoHtml = '<span class="tc-photo noimg"><i class="tc-initials">' + esc(initials(name, role)) + '</i></span>';
      }

      card.innerHTML =
        photoHtml +
        '<h3>' + esc(name || role) + '</h3>' +
        '<span class="tc-role">' + esc(name ? role : t('team.role', 'MUNDA Kosova SH.P.K')) + '</span>' +
        '<p>' + esc(member.bio || '') + '</p>';
      grid.appendChild(card);
    });
  }

  function init() {
    render();
    document.addEventListener('munda:lang', render);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
