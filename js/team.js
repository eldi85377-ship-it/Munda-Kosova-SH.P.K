/* =====================================================================
   MUNDA — Leadership & Ownership section (index.html #team)
   ---------------------------------------------------------------------
   Renders two grids: MANAGEMENT and OWNERS & PARTNERS.
   Data is real and sourced from the official company website
   (munda.tech impressum / unternehmen / karriere), the AUNDE website
   (aunde.com impressum) and the ARBK business registry.
   If no photo is provided the card falls back to a clean initials
   monogram, so the section never looks broken.
   ===================================================================== */
(function () {
  'use strict';

  /* ---- MANAGEMENT (menaxhmenti) ---- */
  var MANAGEMENT = [
    {
      name: 'Kai Muxel',
      role: 'Managing Director',
      org: 'MUNDA Textile Lichtsysteme GmbH',
      bio: 'Geschäftsführer of the MUNDA joint venture — leads the company from its headquarters in Erkrath, Germany.'
    },
    {
      name: 'Kushtrim Grainca',
      role: 'Authorized Representative',
      org: 'MUNDA Kosova SH.P.K.',
      bio: 'Represents MUNDA Kosova SH.P.K. and the Obiliq plant — delivering for the Volkswagen Group supply chain.'
    }
  ];

  /* ---- OWNERS & PARTNERS (pronarët & partnerët) ---- */
  var OWNERS = [
    {
      name: 'Wido Weyer',
      role: 'Managing Partner',
      org: 'MENTOR',
      bio: 'Geschäftsführender Gesellschafter of MENTOR — the lighting specialists since 1920 and a 50% joint-venture partner.'
    },
    {
      name: 'Dennis Weyer',
      role: 'Partner',
      org: 'MENTOR',
      bio: 'Joint-venture partner representing MENTOR, bringing decades of product-integrated LED light technology.'
    },
    {
      name: 'Peter Bolten',
      role: 'Managing Director',
      org: 'AUNDE Achter & Ebels GmbH',
      bio: 'Represents AUNDE — one of the world\u2019s leading automotive suppliers and a 50% joint-venture partner.'
    },
    {
      name: 'Rolf Königs',
      role: 'CEO',
      org: 'AUNDE Group',
      bio: 'Chief Executive Officer of the AUNDE Group, the technical-textiles leader behind MUNDA.'
    }
  ];

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function initials(name) {
    var src = (name || 'MUNDA').trim();
    var parts = src.split(/\s+/);
    var a = (parts[0] || 'M').charAt(0);
    var b = parts.length > 1 ? parts[parts.length - 1].charAt(0) : '';
    return (a + b).toUpperCase();
  }

  function renderGroup(list, gridId) {
    var grid = $(gridId);
    if (!grid) return;
    grid.innerHTML = '';
    list.forEach(function (member, i) {
      var name = (member.name || '').trim();
      var card = document.createElement('article');
      card.className = 'team-card glass reveal in';
      card.style.setProperty('--i', i);

      var photoHtml =
        '<span class="tc-photo noimg"><i class="tc-initials">' + esc(initials(name)) + '</i></span>';

      card.innerHTML =
        photoHtml +
        '<h3>' + esc(name) + '</h3>' +
        '<span class="tc-role">' + esc(member.role) + '</span>' +
        '<span class="tc-org">' + esc(member.org) + '</span>' +
        '<p>' + esc(member.bio || '') + '</p>';
      grid.appendChild(card);
    });
  }

  function render() {
    renderGroup(MANAGEMENT, 'team-grid-mgmt');
    renderGroup(OWNERS, 'team-grid-owners');
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
