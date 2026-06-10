async function init() {
  await translate();
  shareLink();
  hideSpinner();
  loadChurches();
}

init();

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('../sw.js').catch(function (err) {
    console.error('Error registering service worker:', err);
  });
}

function loadChurches() {
  'use strict';

  var API_URL = 'https://admin.upsidedown21.org/api/v1/churches?limit=200';

  var allChurches = [];
  var showImages = true;
  var currentSort = 'az';

  var searchEl  = document.getElementById('churchSearch');
  var countryEl = document.getElementById('churchCountry');
  var listEl    = document.getElementById('churchList');
  var countEl   = document.getElementById('resultCount');

  /* ── Helpers ──────────────────────────────────────────── */
  function esc(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function sortList(arr, mode) {
    var s = arr.slice();
    if (mode === 'az') {
      s.sort(function (a, b) { return a.church_name.localeCompare(b.church_name); });
    } else if (mode === 'za') {
      s.sort(function (a, b) { return b.church_name.localeCompare(a.church_name); });
    } else if (mode === 'country') {
      s.sort(function (a, b) {
        var cc = (a.mailing_country || '').localeCompare(b.mailing_country || '');
        return cc !== 0 ? cc : a.church_name.localeCompare(b.church_name);
      });
    }
    return s;
  }

  /* ── Render ───────────────────────────────────────────── */
  function renderCard(c) {
    var photoHtml = '';
    if (showImages && c.image) {
      photoHtml = '<img class="church-photo" src="' + esc(c.image) + '" alt="' + esc(c.church_name) + '" loading="lazy">';
    }

    var place = [c.identifying_place, c.mailing_country]
      .filter(function (v) { return v && v.trim(); })
      .join(', ');

    var details = '';
    if (c.contact_name && c.contact_name.trim()) {
      details += '<p class="church-detail"><strong>Leaders:</strong> ' + esc(c.contact_name.trim()) + '</p>';
    }
    if (c.contact_number && c.contact_number.trim()) {
      details += '<p class="church-detail"><strong>Phone:</strong> ' + esc(c.contact_number.trim()) + '</p>';
    }
    if (c.world_sector && c.world_sector.name) {
      details += '<p class="church-detail"><strong>World Sector:</strong> ' + esc(c.world_sector.name) + '</p>';
    }
    if (c.geographic_sector && c.geographic_sector.name) {
      details += '<p class="church-detail"><strong>Geographic Sector:</strong> ' + esc(c.geographic_sector.name) + '</p>';
    }

    var website = '';
    if (c.church_URL && c.church_URL.trim()) {
      website = '<a href="' + esc(c.church_URL.trim()) + '" class="church-website" target="_blank" rel="noopener noreferrer">Website ↗</a>';
    }

    return '<div class="church-card">'
      + photoHtml
      + '<div class="church-body">'
      + '<h2 class="church-name">' + esc(c.church_name) + '</h2>'
      + (place ? '<p class="church-place">' + esc(place) + '</p>' : '')
      + details
      + website
      + '</div></div>';
  }

  function render(churches) {
    var n = churches.length;
    countEl.textContent = n + ' church' + (n !== 1 ? 'es' : '') + ' found';
    if (n === 0) {
      listEl.innerHTML = '<p class="list-message">No churches match your search.</p>';
      return;
    }
    listEl.innerHTML = churches.map(renderCard).join('');
  }

  /* ── Filter + sort ────────────────────────────────────── */
  function applyFilter() {
    var query   = searchEl.value.trim().toLowerCase();
    var country = countryEl.value;

    var filtered = allChurches.filter(function (c) {
      if (country && c.mailing_country !== country) return false;
      if (!query) return true;
      var haystack = [
        c.church_name, c.identifying_place, c.mailing_city,
        c.mailing_state, c.mailing_country, c.contact_name
      ].join(' ').toLowerCase();
      return haystack.indexOf(query) !== -1;
    });

    render(sortList(filtered, currentSort));
  }

  /* ── Populate country dropdown ────────────────────────── */
  function populateCountries(churches) {
    var seen = {};
    churches.forEach(function (c) { if (c.mailing_country) seen[c.mailing_country] = true; });
    Object.keys(seen).sort().forEach(function (name) {
      var opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name;
      countryEl.appendChild(opt);
    });
  }

  /* ── Event listeners ──────────────────────────────────── */
  searchEl.addEventListener('input', applyFilter);
  countryEl.addEventListener('change', applyFilter);

  document.querySelectorAll('.ctrl-btn[data-sort]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.ctrl-btn[data-sort]').forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      currentSort = btn.dataset.sort;
      applyFilter();
    });
  });

  document.querySelectorAll('.ctrl-btn[data-view]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.ctrl-btn[data-view]').forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      showImages = btn.dataset.view === 'images';
      applyFilter();
    });
  });

  /* ── Fetch data ───────────────────────────────────────── */
  listEl.innerHTML = '<p class="list-message">Loading churches\u2026</p>';

  fetch(API_URL)
    .then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    })
    .then(function (data) {
      allChurches = (data.data || []).slice();
      populateCountries(allChurches);
      countEl.textContent = allChurches.length + ' churches worldwide';
      render(sortList(allChurches, currentSort));
    })
    .catch(function () {
      listEl.innerHTML = '<p class="list-message">Could not load the church directory.<br>Please check your internet connection and try again.</p>';
      countEl.textContent = '';
    });
}
